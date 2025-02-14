import { Scene } from "phaser";
import { CardZoneID, ZonePosition } from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import Card, { CardId } from "../Game/Card";
import TableView from "../Views/TableView";
import HandView from "../Views/HandView";
import CardView from "../Views/CardView";
import DeckView from "../Views/DeckView";
import PileView from "../Views/PileView";
import ICardZoneView from "../Views/ICardZoneView";
import AnimationController, { AnimationResult } from "../AnimationController";
import Util from "../Util";

const fragmentShader = `
//@machine_shaman
precision mediump float;

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;
uniform sampler2D iChannel0;

void main() {

    vec2 uv = (2. * gl_FragCoord.xy - resolution) / resolution.y;

    // Scale the checkerboard pattern
    float scale = 10.0; // Adjust for larger/smaller squares
    uv *= scale;

    // Scroll speed
    float speed = 0.5;
    uv.x += time * speed;
    uv.y += time * speed;

    vec3 pastelPink = vec3(1.0, 0.8, 0.9);
    vec3 pastelGreen = vec3(0.7, 1.0, 0.8);

    // Create a checkerboard pattern
    float checker = mod(floor(uv.x) + floor(uv.y), 2.0);
    vec3 color = mix(pastelPink, pastelGreen, checker);
    // Set colors


    gl_FragColor = texture2D(iChannel0, uv);
}`;
enum TurnState {
  Idle,
  Player,
  NPC,
}
const playerNumber = 2;
export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  gameState: GameState = new GameState();

  cardViewMap: Map<CardId, CardView> = new Map();
  tableView: TableView;
  deckView: DeckView;
  handViews: Map<number, HandView> = new Map();
  pileViews: Map<number, PileView> = new Map();
  heldCardId: CardId | null;
  dragLayer: Phaser.GameObjects.Layer;

  animationController: AnimationController;
  history: GameChange[] = [];

  //I should move these out into something else maybe
  newGameDealTimeline: null | Phaser.Time.Timeline = null;
  turnState: TurnState = TurnState.Player;
  currentAnimationResult: AnimationResult | null = null;
  // cardZoneViews: Map<ZonePosition, >
  constructor() {
    super("Game");
    this.animationController = new AnimationController(
      this,
      this.handViews,
      this.pileViews,
      this.cardViewMap
    );
  }

  create() {
    const base = new Phaser.Display.BaseShader("rect", fragmentShader);

    this.animationController.Create();
    this.animationController.animationLayer.setDepth(1);
    const bg = this.add.tileSprite(0, 0, 2500, 2500, "tileBG");
    this.add.tween({
      targets: bg,
      x: "64",
      y: "64",
      loop: -1,
      duration: 5000,
    });
    const shader = this.add.shader(base, 0, 0, 500, 500).setOrigin(0.0);
    shader.setChannel0("tileBG");
    //maybe I should pass a reference to the gamestate into here, or at least it's zone
    //should make a map of zone position to zone views
    this.dragLayer = this.add.layer().setDepth(2);
    this.tableView = this.add.existing(new TableView(this));
    this.deckView = this.add.existing(
      new DeckView(this, new ZonePosition(CardZoneID.DECK, 0))
    );
    this.deckView.setPosition(80, 80);
    let handIndex = 0;
    for (const [_playerID, cardZone] of this.gameState.playerHands) {
      //TODO: also add any cards that might be in the cardzone here? should initialize with no cards though since the gamestate starts with everything in the deck
      const newHandView = this.add.existing(
        new HandView(this, cardZone.zonePosition)
      );
      this.handViews.set(cardZone.zonePosition.index, newHandView);
      const newPileView = this.add.existing(new PileView(this));
      this.handViews.set(cardZone.zonePosition.index, newHandView);
      this.pileViews.set(cardZone.zonePosition.index, newPileView);
      const radian = (handIndex / this.gameState.numPlayers) * Math.PI * 2;
      const xOff = Math.cos(radian) * 350;
      const yOff = Math.sin(radian) * 270;
      newHandView.setPosition(512 + xOff, 384 + yOff);
      const pilePos = this.GetPilePosition(handIndex, this.gameState);
      newPileView.setPosition(pilePos.x, pilePos.y);
      handIndex++;
    }
    this.tableView.setPosition(512, 384);

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x00ff00);

    this.initializeInput();
    //initialize zones
    //initialize cards
    for (const id of this.gameState.GetCardIds()) {
      const card = this.gameState.GetCardFromId(id);
      if (card) {
        const newCardView = this.add.existing(new CardView(this, card));
        this.animationController.animationLayer.add(newCardView);
        this.input.setDraggable(newCardView);
        this.cardViewMap.set(id, newCardView);
        this.deckView.AddCardView(newCardView);
        newCardView.Flip(true);
        newCardView.setPosition(
          newCardView.GetTargetPos().x,
          newCardView.GetTargetPos().y
        );
      }
    }

    this.ChangeState(TurnState.Idle);
    const maybeSaveData = localStorage.getItem("saveData");
    if (maybeSaveData) {
      console.log("found save game");

      if (this.gameState.IsGameOver()) {
        this.DealNewGame().then((gameChange) => {
          console.log("new game is dealt because game was over");
          this.ChangeState(TurnState.Player);
        });
      } else {
        const gameChange = this.gameState.loadFromJson(
          JSON.parse(maybeSaveData)
        );
        const initialState =
          this.gameState.GetPlayerTurn() == playerNumber
            ? TurnState.Player
            : TurnState.NPC;
        Util.WaitUntilTweensFinish(
          this.ApplyChange(gameChange)!.GetTweens()
        ).then(() => {
          this.ChangeState(initialState);
        });
      }
    } else {
      this.DealNewGame().then(() => {
        this.ChangeState(TurnState.Player);
        console.log("new game is dealt because game no save was found");
      });
    }
    //game is loaded
  }

  ChangeState(newState: TurnState) {
    console.log("changing state to : " + newState);
    switch (newState) {
      case TurnState.Player:
        break;
      case TurnState.NPC:
        const playerTurn = this.gameState.GetPlayerTurn();
        console.assert(
          playerTurn != playerNumber,
          `NPC state should not be entered when player turn is ${playerTurn}!`
        );
        setTimeout(() => {
          const bestMoveAction = this.PlayMoveForPlayer(playerTurn);
          if (bestMoveAction) {
            bestMoveAction.then((gameChange) => {
              if (gameChange.toPlayer == playerNumber) {
                this.ChangeState(TurnState.Player);
              } else {
                this.ChangeState(TurnState.NPC);
              }
            });
          }
        }, 500);

        break;
    }

    this.turnState = newState;
  }
  GetLastPersonToScoopCards() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const gameChange = this.history[i];
      const hadTableCardsGoToAPile = gameChange
        .GetMoves()
        .some(
          (move) =>
            move.fromPosition.id == CardZoneID.TABLE &&
            move.toPosition.id == CardZoneID.PILE
        );
      //todo, I don't think I need to check if this also had a hand card go to pile, I don't think there is any other way that a card can go from the table to a pile.
      if (hadTableCardsGoToAPile) {
        return gameChange.playerTurn;
      }
    }
    return null;
  }

  //problem, this only will update the position of the cards that are involved in the GameChange, so, for example, if you remove a card from the middle of a card[], and move it somewhere, you might expect that it would shift all the cards above it over, but it currently does not.
  // I could keep track of all of the views effected by the gameChange, and then do a manual recalculation of all of the card positions or something
  ApplyChange(gameChange: GameChange | null) {
    if (gameChange == null) {
      console.log("game change is null, nothing to apply");
      return null;
    }
    for (const cardMove of gameChange.GetMoves()) {
      const cardView = this.cardViewMap.get(cardMove.card.id());
      if (cardView == undefined) {
        console.error(
          "trying to move a card that doesn't exist in the card map"
        );
        continue;
      }
      const toZone = this.GetCardZoneViewFromZonePosition(cardMove.toPosition);
      const fromZone = this.GetCardZoneViewFromZonePosition(
        cardMove.fromPosition
      );
      //zone view update states
      //also updates the target rects of the cards since
      fromZone.RemoveCardView(cardView);
      toZone.AddCardView(cardView);
    }

    localStorage.setItem("saveData", JSON.stringify(this.gameState.toJson()));
    const animationResult =
      this.animationController.AnimateGameChange(gameChange);
    this.animationController.ResetCardAngles(this.gameState);
    return animationResult;
  }

  Undo() {
    const lastGameChange = this.PopFromHistory();
    // return undoGameChange;
    if (lastGameChange) {
      console.log(lastGameChange.toString());

      const reversed = lastGameChange.Reverse();
      //it would be nice if undo was in gamestate so I didn't have to remember to do this but game state just generates gamemoves, so it is unclear where one move finishes and another begins, and single turns can consist of multiple of those gamemove functions, for example, moving to table AND dealing out more cards
      this.gameState.ApplyChange(reversed);
      return reversed;
    }
    return null;
  }
  GetCardFromGameObject(gameObject: Phaser.GameObjects.GameObject) {
    for (const [id, cardView] of this.cardViewMap) {
      if (cardView == gameObject) {
        return this.gameState.GetCardFromId(id);
      }
    }
    return null;
  }
  AddToHistory(gameChange: GameChange) {
    this.history.push(gameChange);
    localStorage.setItem("history", JSON.stringify(this.history));
  }
  PopFromHistory() {
    const poppedMove = this.history.pop();
    localStorage.setItem("history", JSON.stringify(this.history));
    return poppedMove;
  }

  async DealNewGame(): Promise<GameChange> {
    if (this.newGameDealTimeline) {
      this.newGameDealTimeline.stop();
    }
    const playerAtEndOfLastGame = this.gameState.GetPlayerTurn();
    const moveToDeckChange = this.gameState.MoveAllCardsToDeck();
    const dealChange = this.gameState.DealCards();
    const initialDeal = this.gameState.InitialTableCards();

    const gameChange = new GameChange(0, playerAtEndOfLastGame, 0);
    gameChange.Append(
      moveToDeckChange.Copy().Append(dealChange).Append(initialDeal)
    );
    this.AddToHistory(gameChange);

    return new Promise((resolve) => {
      this.newGameDealTimeline = this.add
        .timeline([
          {
            at: 0,
            run: () => {
              this.ApplyChange(moveToDeckChange);
            },
          },
          {
            at: 500,
            run: () => {
              this.ApplyChange(initialDeal);
            },
          },
          {
            at: 1000,
            run: () => {
              const finalDeal = this.ApplyChange(dealChange);
              Util.WaitUntilTweensFinish(finalDeal!.GetTweens()).then(() => {
                resolve(gameChange);
              });
            },
          },
        ])
        .play();
    });
  }

  AttemptMoveCardToTable(cardId: CardId): Promise<GameChange> {
    const gameChange = this.gameState.MoveCard(
      cardId,
      new ZonePosition(CardZoneID.TABLE, 0)
    );
    if (gameChange) {
      return new Promise((resolve) => {
        console.log("successful board move!!!");
        if (this.gameState.table.GetCards().length == 0) {
        }
        this.AddToHistory(gameChange);
        const cardMoveAnimResult = this.ApplyChange(gameChange);
        //end game anim
        if (this.gameState.IsGameOver()) {
          console.log("GAME OVER!!!");
          const lastPlayerToScoop = this.GetLastPersonToScoopCards();
          const endGameMove = this.gameState.MoveTableCardsToPlayerPile(
            lastPlayerToScoop || 0
          );
          console.assert(
            lastPlayerToScoop != null,
            "last player to scoop should not be null moving end game cards to player 0"
          );
          console.log("endgame move: " + endGameMove.toString());
          //this might suck, revisionist history smh
          const lastPlay = this.history.pop()!;
          lastPlay.Append(endGameMove);
          this.AddToHistory(lastPlay);
          // this should be like a special call in Animation controller I think
          if (endGameMove.GetMoves().length > 0) {
            this.add
              .timeline({
                at: 1000,
                run: () => {
                  console.log("apply change final board move");
                  Util.WaitUntilTweensFinish(
                    this.ApplyChange(endGameMove)!.GetTweens()
                  ).then(() => resolve(lastPlay));
                },
              })
              .play();
          }
        } else {
          //return the card to where it started from
          Util.WaitUntilTweensFinish(cardMoveAnimResult!.GetTweens()).then(
            () => {
              resolve(gameChange);
            }
          );
        }
      });
    } else {
      const card = this.gameState.GetCardFromId(cardId)!;
      const gameChange = this.gameState.ReturnCardToStartingLocation(card);
      return Util.WaitUntilTweensFinish(
        this.ApplyChange(gameChange)!.GetTweens()
      ).then(() => {
        return gameChange;
      });
    }
  }
  IgnoreInput() {
    return this.animationController.CardsMoving();
  }
  PlayMoveForPlayer(playerNum: number) {
    const bestMove = this.gameState.GetBestCardToPlayForPlayer(playerNum);
    if (bestMove) {
      return this.AttemptMoveCardToTable(bestMove);
    }
    console.log("no best move found...");

    return null;
  }
  initializeInput() {
    let dragStartTime: null | number = null;
    this.input.keyboard!.on("keydown-U", () => {
      if (this.IgnoreInput()) {
        console.log("don't undo while cards are moving it can break things...");
        return;
      }
      const undoMove = this.Undo();
      if (undoMove) {
        this.ApplyChange(undoMove);
      }
    });
    this.input.keyboard!.on("keydown-C", () => {
      const result = this.gameState.CalculateScores();
      //amount of scopas
      console.log(result.toString());
    });
    this.input.keyboard!.on("keydown-P", () => {
      const maybeMove = this.PlayMoveForPlayer(this.gameState.GetPlayerTurn());
      if (maybeMove) {
        maybeMove.then((gameChange) => {
          this.ChangeState(
            gameChange.toPlayer == playerNumber
              ? TurnState.Player
              : TurnState.NPC
          );
        });
      }
    });
    this.input.keyboard!.on("keydown-N", () => {
      this.DealNewGame().then((gameChange) => {
        this.ChangeState(
          gameChange.toPlayer == playerNumber ? TurnState.Player : TurnState.NPC
        );
      });
    });

    this.input.on(
      Phaser.Input.Events.POINTER_OVER,
      (_: Phaser.Input.Pointer, justOver: Phaser.GameObjects.GameObject[]) => {
        //was it a card?
        const cardOver = this.GetCardFromGameObject(justOver[0]);
        if (cardOver) {
          //and not moving
          const cardView = this.cardViewMap.get(cardOver.id())!;
          this.animationController.AnimateTableScoopsForCard(
            cardOver.id(),
            this.gameState
          );
          if (cardOver.currentZone.id == CardZoneID.HAND) {
            this.add.tween({
              targets: justOver[0],
              y: cardView.GetTargetPos().y - 20,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            });
          }
        }
      }
    );
    this.input.on(
      Phaser.Input.Events.POINTER_OUT,
      (
        _pointer: Phaser.Input.Pointer,
        justOut: Phaser.GameObjects.GameObject[]
      ) => {
        //was it a card?
        const cardOver = this.GetCardFromGameObject(justOut[0]);
        if (cardOver) {
          const cardView = this.cardViewMap.get(cardOver.id())!;
          this.animationController.ResetCardAngles(this.gameState);
          if (cardOver.currentZone.id == CardZoneID.HAND) {
            this.add.tween({
              targets: justOut[0],
              y: cardView.GetTargetPos().y,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            });
          }
        }
      }
    );
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        if (this.turnState != TurnState.Player) {
          console.log("IT IS NOT YOUR TURN!!!!!!!");
          return;
        }
        dragStartTime = this.time.now;
        this.animationController.ResetCardAngles(this.gameState);
        for (const [id, cardView] of this.cardViewMap) {
          if (cardView == gameObject) {
            this.heldCardId = id;
            this.dragLayer.add(cardView);

            console.log("clicked on" + id);
            break;
          }
        }
      }
    );
    this.input.on(
      Phaser.Input.Events.DRAG_ENTER,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        target: Phaser.GameObjects.GameObject
      ) => {
        if (target == this.tableView.dropZone) {
          if (this.heldCardId) {
            this.animationController.AnimateTableScoopsForCard(
              this.heldCardId,
              this.gameState
            );
          }
        }
      }
    );
    this.input.on(
      Phaser.Input.Events.DRAG_LEAVE,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        target: Phaser.GameObjects.GameObject
      ) => {
        if (target == this.tableView.dropZone) {
          console.log("card over table!!!");
          for (const card of this.gameState.table.GetCards()) {
            this.add.tween({
              targets: this.cardViewMap.get(card.id())!,
              angle: 0,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            });
          }
        }
      }
    );
    this.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (this.heldCardId) {
          const cardView = this.cardViewMap.get(this.heldCardId) ?? null;
          if (cardView) {
            cardView.setPosition(dragX, dragY);
          }
        }
      }
    );
    const returnHeldCard = () => {
      if (this.heldCardId) {
        const card = this.gameState.GetCardFromId(this.heldCardId)!;
        const gameChange = this.gameState.ReturnCardToStartingLocation(card);
        console.log("applying game change of just dropping the cad");
        this.animationController.animationLayer.add(
          this.cardViewMap.get(card.id())
        );

        this.heldCardId = null;
        return Util.WaitUntilTweensFinish(
          this.ApplyChange(gameChange)!.GetTweens()
        );
      }
      return null;
    };
    //this will happen after drop, so the held card may be null
    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        _dragX: number,
        _dragY: number
      ) => {
        if (this.heldCardId) {
          if (dragStartTime) {
            const dragTime = this.time.now - dragStartTime;
            console.log("drag time: " + dragTime);
            //maybe check the distance traveled here
            if (dragTime < 300) {
              //register as a click
              this.AttemptMoveCardToTable(this.heldCardId).then((gameChange) =>
                this.ChangeState(
                  gameChange.toPlayer == playerNumber
                    ? TurnState.Player
                    : TurnState.NPC
                )
              );
            } else {
              returnHeldCard();
            }
          } else {
            console.error(
              "drag start time is null in drag end, this should be impossible"
            );
          }
        }
      }
    );
    // this.input.on(
    //   "dragenter",
    //   function (
    //     _pointer: Phaser.Input.Pointer,
    //     _gameObject: Phaser.GameObjects.GameObject,
    //     _dropzone: Phaser.GameObjects.GameObject
    //   ) {
    //     console.log("drag enter");
    //   }
    // );

    this.input.on(
      Phaser.Input.Events.DROP,
      async (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject,
        dropzone: Phaser.GameObjects.GameObject
      ) => {
        if (this.heldCardId) {
          if (dropzone == this.tableView.dropZone) {
            this.animationController.animationLayer.add(
              this.cardViewMap.get(this.heldCardId)!
            );
            this.AttemptMoveCardToTable(this.heldCardId).then((gameChange) => {
              this.ChangeState(
                gameChange.toPlayer == playerNumber
                  ? TurnState.Player
                  : TurnState.NPC
              );
            });
            this.heldCardId = null;
          }
        }
      }
    );
  }

  //todo make some actual views
  GetCardZoneViewFromZonePosition(zonePosition: ZonePosition): ICardZoneView {
    switch (zonePosition.id) {
      case CardZoneID.DECK:
        return this.deckView;
      case CardZoneID.TABLE:
        return this.tableView;
      case CardZoneID.HAND:
        return this.handViews.get(zonePosition.index)!;
      case CardZoneID.PILE:
        return this.pileViews.get(zonePosition.index)!;
    }
  }
  GetPilePosition(index: number, gameState: GameState) {
    const assocHand = this.handViews.get(index);
    if (gameState.numPlayers == 4 && (index == 1 || index == 3)) {
      return assocHand!.GetPosition().add(new Phaser.Math.Vector2(-150, 0));
    }
    return assocHand!.GetPosition().add(new Phaser.Math.Vector2(0, 170));
  }
}
