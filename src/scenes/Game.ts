import { Scene } from "phaser";
import { CardZoneID, ZonePosition } from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import { CardId } from "../Game/Card";
import TableView from "../Views/TableView";
import HandView from "../Views/HandView";
import CardView from "../Views/CardView";
import DeckView from "../Views/DeckView";
import PileView from "../Views/PileView";
import ICardZoneView from "../Views/ICardZoneView";
import AnimationController from "../Animation/AnimationController";
import AnimationContext from "../Animation/AnimationContext.ts";

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
  gameLayer: Phaser.GameObjects.Layer;

  animationController: AnimationController;
  history: GameChange[] = [];

  //I should move these out into something else maybe
  newGameDealTimeline: null | Phaser.Time.Timeline = null;

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
    const bg = this.add.tileSprite(0, 0, 2500, 2500, "tileBG");
    this.add.tween({
      targets: bg,
      x: "64",
      y: "64",
      loop: -1,
      duration: 5000,
    });
    //maybe I should pass a reference to the gamestate into here, or at least it's zone
    //should make a map of zone position to zone views
    this.dragLayer = this.add.layer().setDepth(1);
    this.gameLayer = this.add.layer().setDepth(0);

    this.tableView = this.add.existing(new TableView(this));
    this.gameLayer.add(this.tableView);
    this.deckView = this.add.existing(
      new DeckView(this, new ZonePosition(CardZoneID.DECK, 0))
    );
    this.deckView.setPosition(80, 80);
    let handIndex = 0;
    for (const [playerID, cardZone] of this.gameState.playerHands) {
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
        this.gameLayer.add(newCardView);
        this.input.setDraggable(newCardView);
        this.cardViewMap.set(id, newCardView);
        this.deckView.AddCardView(newCardView);
        newCardView.setPosition(
          newCardView.GetTargetPos().x,
          newCardView.GetTargetPos().y
        );
      }
    }
    // this.ApplyChange(this.gameState.MoveAllCardsToDeck());
    const maybeSaveData = localStorage.getItem("saveData");
    if (maybeSaveData) {
      console.log("found save game");
      console.log(JSON.parse(maybeSaveData));
      const gameChange = this.gameState.loadFromJson(JSON.parse(maybeSaveData));
      const context = new AnimationContext();
      context.instant = true;
      this.ApplyChange(gameChange, context);
      if (this.gameState.IsGameOver()) {
        this.DealNewGame();
      }
    } else {
      this.ApplyChange(this.gameState.DealCards());
      this.ApplyChange(this.gameState.InitialTableCards());
    }
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
  ApplyChange(gameChange: GameChange | null, animationContext: AnimationContext|null = null) {
    if (gameChange == null) {
      console.log("game change is null, nothing to apply");
      return;
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
      this.gameLayer.bringToTop(this.cardViewMap.get(cardMove.card.id())!);
    }
    this.animationController.AnimateGameChange(gameChange, this.gameState, animationContext);

    console.log(`current player turn: ${this.gameState.GetPlayerTurn()}`);
    localStorage.setItem("saveData", JSON.stringify(this.gameState.toJson()));
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

  DealNewGame() {
    //I need to break this out into a gamestate function so I can also modify the player turn in it!!!, right now I just modify it inside of dealchange since so far that is true
    if (this.newGameDealTimeline) {
      this.newGameDealTimeline.stop();
    }
    const playerAtEndOfLastGame = this.gameState.GetPlayerTurn();
    const moveToDeckChange = this.gameState.MoveAllCardsToDeck();
    const dealChange = this.gameState.DealCards();
    const initialDeal = this.gameState.InitialTableCards();
    // this.AddToHistory(moveToDeckChange);
    // this.AddToHistory(dealChange.Copy().Append(initialDeal));
    // this.AddToHistory(initialDeal);
    //I would Like to do this...
    const gameChange = new GameChange(0, playerAtEndOfLastGame, 0);
    gameChange.Append(
      moveToDeckChange.Copy().Append(dealChange).Append(initialDeal)
    );
    this.AddToHistory(gameChange);

    this.newGameDealTimeline = this.add.timeline([
      {
        at: 0,
        run: () => {
          this.ApplyChange(moveToDeckChange);
        },
      },
      {
        at: 500,
        run: () => {
          this.ApplyChange(dealChange);
        },
      },
      {
        at: 1000,
        run: () => {
          this.ApplyChange(initialDeal);
        },
      },
    ]);
    this.newGameDealTimeline.play();
  }
  AttemptMoveCardToTable(cardId: CardId): GameChange | null {
    this.gameLayer.add(this.cardViewMap.get(cardId)!);
    const gameChange = this.gameState.MoveCard(
      cardId,
      new ZonePosition(CardZoneID.TABLE, 0)
    );
    if (gameChange) {
      console.log("successful board move!!!");
      if (this.gameState.table.GetCards().length == 0) {
      }
      this.AddToHistory(gameChange);
      this.ApplyChange(gameChange);
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
                this.ApplyChange(endGameMove);
              },
            })
            .play();
        }
      }
    }
    return gameChange;
  }
  IgnoreInput() {
    return this.animationController.CardsMoving();
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
      const currentPlayerTurn = this.gameState.GetPlayerTurn();
      const bestMove =
        this.gameState.GetBestCardToPlayForPlayer(currentPlayerTurn);
      if (bestMove) {
        this.AttemptMoveCardToTable(bestMove);
      } else {
        console.log("no best move found");
      }
    });
    this.input.keyboard!.on("keydown-N", () => {
      //newgame

      this.DealNewGame();
    });

    this.input.on(
      Phaser.Input.Events.POINTER_OVER,
      (
        pointer: Phaser.Input.Pointer,
        justOver: Phaser.GameObjects.GameObject[]
      ) => {
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
          } else if (cardOver.currentZone.id == CardZoneID.PILE) {
            console.log(
              this.gameState
                .GetCardZoneFromPosition(cardOver.currentZone)
                ?.toString()
            );
          }
        }
      }
    );
    this.input.on(
      Phaser.Input.Events.POINTER_OUT,
      (
        pointer: Phaser.Input.Pointer,
        justOut: Phaser.GameObjects.GameObject[]
      ) => {
        //was it a card?
        const cardOver = this.GetCardFromGameObject(justOut[0]);
        if (cardOver) {
          const cardView = this.cardViewMap.get(cardOver.id())!;
          if (cardOver.currentZone.id == CardZoneID.HAND) {
            this.animationController.ResetTableCardAngles(this.gameState);
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
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        dragStartTime = this.time.now;
        this.animationController.ResetTableCardAngles(this.gameState);
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
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
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
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        target: Phaser.GameObjects.GameObject
      ) => {
        if (target == this.tableView.dropZone) {
          console.log("drag leave table");
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
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
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
        this.gameLayer.add(this.cardViewMap.get(this.heldCardId)!);
        console.log("applying game change of just dropping the cad");
        this.ApplyChange(gameChange);
        this.heldCardId = null;
      }
    };
    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (this.heldCardId) {
          if (dragStartTime) {
            const dragTime = this.time.now - dragStartTime;
            console.log("drag time: " + dragTime);
            //maybe check the distance traveled here
            if (dragTime < 300) {
              //register as a click
              if (!this.AttemptMoveCardToTable(this.heldCardId)) {
                returnHeldCard();
              }
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
    this.input.on(
      "dragenter",
      function (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropzone: Phaser.GameObjects.GameObject
      ) {}
    );

    this.input.on(
      Phaser.Input.Events.DROP,
      async (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropzone: Phaser.GameObjects.GameObject
      ) => {
        if (this.heldCardId) {
          if (dropzone == this.tableView.dropZone) {
            const gameChange = this.AttemptMoveCardToTable(this.heldCardId);
            if (gameChange) {
              this.heldCardId = null;
            } else {
              console.log(
                "cannot do a move with that drop, not setting held card to null"
              );
            }
          }
        }
      }
    );
  }

  onMouseDown() {}
  onMouseDrag() {}
  onMouseUp() {}

  //am I able to get the target rect of any card just by looking at the gamestate???
  //this doesn't work if I want to update the gamestate multiple times, get those game changes, and then animate the game changes separately (like animate to deck, the redeal. I want to move cards to deck then move to hands in the state immediately, but I don't want to animate all that simultaneously (since it would only animate the cards to their final positions.))
  //idea is that you ask the cardzone the card currently belongs to, based on it's state, where it should put the card we're talking about
  // private GetCardTargetPosition(cardID: CardId): Phaser.Math.Vector2 | null {
  //   const card = this.gameState.GetCardFromId(cardID) ?? null;
  //   if (card == null) {
  //     console.warn(`couldn't find a card with the id ${cardID}`);
  //     return null;
  //   }
  //   const toCardZone = this.gameState.GetCardZoneFromPosition(card.currentZone);
  //   if (toCardZone == null) return null;
  //   switch (card.currentZone.id) {
  //     case CardZoneID.DECK:
  //       return new Phaser.Math.Vector2(80, 80);
  //     case CardZoneID.HAND:
  //       const offset = toCardZone
  //         .GetCards()
  //         .findIndex((card) => card.id() == cardID);
  //       const view = this.handViews.get(card.currentZone.index);
  //       if (offset >= 0) {
  //         return view!
  //           .GetPosition()
  //           .add(new Phaser.Math.Vector2(offset * 40, 0));
  //       } else {
  //         console.error(
  //           "card not found in the cardzone found with position " +
  //             card.currentZone.toString()
  //         );
  //         return null;
  //       }
  //     case CardZoneID.PILE:
  //       return this.GetPilePosition(card.currentZone.index);
  //     case CardZoneID.TABLE:
  //       let slotNum = 0;
  //       for (let [key, value] of this.slopMap) {
  //         if (value === cardID) {
  //           slotNum = key;
  //         }
  //       }
  //       const offsetX = (slotNum % 2) * 150;
  //       const offsetY = Math.floor(slotNum / 2) * 60;
  //       return new Phaser.Math.Vector2(512 + offsetX - 60, 384 + offsetY);
  //   }
  // }
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
