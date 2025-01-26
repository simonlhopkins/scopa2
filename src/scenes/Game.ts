import { Scene } from "phaser";
import { CardZoneID, ZonePosition } from "../Game/CardZone";
import GameChange, { CardMove } from "../Game/GameChange";
import GameState from "../Game/GameState";
import Card, { CardId } from "../Game/Card";
import TableView from "../Views/TableView";
import HandView from "../Views/HandView";
import Util from "../Util";
import CardView from "../Views/CardView";
import DeckView from "../Views/DeckView";
import PileView from "../Views/PileView";
import ICardZoneView from "../Views/ICardZoneView";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  gameState: GameState = new GameState();

  cardViewMap: Map<CardId, CardView> = new Map();
  tableView: TableView;
  deckView: DeckView;
  handViews: Map<number, HandView> = new Map();
  pileVies: Map<number, PileView> = new Map();
  heldCardId: CardId | null;
  dragLayer: Phaser.GameObjects.Layer;
  gameLayer: Phaser.GameObjects.Layer;
  private slopMap = new Map<number, CardId>();
  history: GameChange[] = [];
  // cardZoneViews: Map<ZonePosition, >
  constructor() {
    super("Game");
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
      this.pileVies.set(cardZone.zonePosition.index, newPileView);
      const radian = (handIndex / this.gameState.numPlayers) * Math.PI * 2;
      const xOff = Math.cos(radian) * 300;
      const yOff = Math.sin(radian) * 300;
      newHandView.setPosition(512 + xOff, 384 + yOff);
      newPileView.setPosition(512 + xOff - 80, 384 + yOff);
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
        const pos = this.GetCardTargetPosition(id)!;
        newCardView.setPosition(pos.x, pos.y);
      }
    }

    const maybeSaveData = localStorage.getItem("saveData");
    if (maybeSaveData) {
      console.log("found save game");
      console.log(JSON.parse(maybeSaveData));
      const gameChange = this.gameState.loadFromJson(JSON.parse(maybeSaveData));
      this.ApplyChange(gameChange);
    } else {
      this.ApplyChange(this.gameState.DealCards());
      this.ApplyChange(this.gameState.InitialTableCards());
    }
  }

  AnimateGameChange(gameChange: GameChange) {
    //separate out the moves that go to piles!
    const toPileMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.PILE &&
          (move.fromPosition.id == CardZoneID.TABLE ||
            move.fromPosition.id == CardZoneID.HAND)
      );

    //this should be broken out into a new script or something
    //separate out into whichever player it is for
    const pileMoveMap = new Map<number, CardMove[]>();
    for (const move of toPileMoves) {
      const playerNum = move.toPosition.index;
      if (!pileMoveMap.get(playerNum)) {
        pileMoveMap.set(playerNum, []);
      }
      pileMoveMap.get(move.toPosition.index)!.push(move);
    }

    for (const [player, pileCap] of pileMoveMap) {
      const pilePos = this.GetPilePosition(player);
      //move each of the cards to the index based on their capture arr, then move into the pile.
      for (let i = 0; i < pileCap.length; i++) {
        const offsetPos = pilePos
          .clone()
          .add(new Phaser.Math.Vector2(i * 80, 0));
        this.tweens.chain({
          targets: this.cardViewMap.get(pileCap[i].card.id())!,
          tweens: [
            {
              x: offsetPos.x,
              y: offsetPos.y,
              angle: 0,
              ease: Phaser.Math.Easing.Sine.InOut,
              duration: 300,
            },
            {
              delay: 500,
              x: pilePos.x,
              y: pilePos.y,
              ease: Phaser.Math.Easing.Back.InOut,
              duration: 300,
            },
          ],
        });
      }
    }

    const dealtMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.HAND &&
          move.fromPosition.id == CardZoneID.DECK
      );
    for (let i = 0; i < dealtMoves.length; i++) {
      const cardView = this.cardViewMap.get(dealtMoves[i].card.id())!;
      //dealtMoves[i].toPosition.AddCardView
      const toPos = cardView.GetTargetPos();
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        delay: i * 200,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    }

    //deck to center
    const deckToTableMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.TABLE &&
          move.fromPosition.id == CardZoneID.DECK
      );

    //I just don't know if I always want card moves to do this!!!! maybe I do
    deckToTableMoves.forEach((move, i) => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      const toPos = cardView.GetTargetPos();
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        delay: i * 200,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    });

    const remainingMoves = gameChange
      .GetMoves()
      .filter((item) => !toPileMoves.includes(item))
      .filter((item) => !dealtMoves.includes(item))
      .filter((item) => !deckToTableMoves.includes(item));
    for (const move of remainingMoves) {
      this.AnimateCardMove(move);
    }
  }

  AnimateCardMove(cardMove: CardMove) {
    const cardId = cardMove.card.id();
    const cardView = this.cardViewMap.get(cardId)!;
    const toPos = cardView.GetTargetPos();
    this.CancelTweensOnGameObject(cardView);
    if (cardMove.fromPosition.Equals(cardMove.toPosition)) {
      //returning to starting pos
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        ease: Phaser.Math.Easing.Sine.Out,
      });
      return;
    } else if (cardMove.toPosition.id == CardZoneID.TABLE) {
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 200,
        ease: Phaser.Math.Easing.Back.Out,
      });
    } else if (cardMove.toPosition.id == CardZoneID.PILE) {
      //special animation??
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 600,
        ease: Phaser.Math.Easing.Back.Out,
      });
    } else {
      this.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        ease: Phaser.Math.Easing.Sine.Out,
      });
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
  ApplyChange(gameChange: GameChange | null) {
    if (gameChange == null) {
      console.log("game change is null, nothing to apply");
      return;
    }
    console.log(gameChange.toString());
    const effectedZones = new Set<ZonePosition>();
    for (const cardMove of gameChange.GetMoves()) {
      const cardView = this.cardViewMap.get(cardMove.card.id());
      if (cardView == undefined) {
        console.error(
          "trying to move a card that doesn't exist in the card map"
        );
        continue;
      }
      //I can change this to only use to zone if I only want it to update when we move a card into it.
      effectedZones.add(cardMove.toPosition);
      // // effectedZones.add(cardMove.fromPosition);
      // //we can get info about where a card needs to go from the card move
      // //we have all of the changes we want to make, so we need to tween the cards to the positions of the hands,
      // //specific logic for other state that needs to update based on the to and from position
      // if (cardMove.fromPosition.id == CardZoneID.TABLE) {
      //   for (let [key, value] of this.slopMap) {
      //     if (value === cardMove.card.id()) {
      //       this.slopMap.delete(key);
      //     }
      //   }
      // }

      // //specific state updates depending on where the card move is going to

      // if (cardMove.toPosition.id == CardZoneID.TABLE) {
      //   let spotNum = 0;
      //   while (this.slopMap.has(spotNum)) {
      //     spotNum++;
      //   }
      //   this.slopMap.set(spotNum, cardMove.card.id());
      //   for (const [key, value] of this.slopMap) {
      //     const cardView = this.cardViewMap.get(value);
      //     cardView!.setDepth(key);
      //   }
      // } else {
      //   const cardStackContaining = this.gameState.GetCardStackOfCard(
      //     cardMove.card.id()
      //   )!;
      //   for (let i = 0; i < cardStackContaining.length; i++) {
      //     this.cardViewMap.get(cardStackContaining[i].id())!.setDepth(i);
      //   }
      // }

      const toZone = this.GetCardZoneViewFromZonePosition(cardMove.toPosition);
      const fromZone = this.GetCardZoneViewFromZonePosition(
        cardMove.fromPosition
      );

      fromZone.RemoveCardView(cardView);
      toZone.AddCardView(cardView);
      // cardView.UpdatePos();
    }

    this.AnimateGameChange(gameChange);
    //I think that we only need this for the hands, this resets the hand card positions
    Array.from(effectedZones)
      .filter((zone) => zone.id == CardZoneID.HAND)
      .forEach((zone) => {
        for (const card of this.gameState
          .GetCardZoneFromPosition(zone)!
          .GetCards()) {
          const cardView = this.cardViewMap.get(card.id())!;
          if (!this.IsTweening(cardView)) {
            cardView.UpdatePos();
          }
        }
      });
    console.log("player turn is now: " + this.gameState.playerTurn);
    localStorage.setItem("saveData", JSON.stringify(this.gameState.toJson()));
  }

  ResetHandCards(id: number) {}

  Undo() {
    const lastGameChange = this.PopFromHistory();
    if (lastGameChange) {
      const reversed = lastGameChange.Reverse();
      //it would be nice if undo was in gamestate so I didn't have to remember to do this but game state just generates gamemoves, so it is unclear where one move finishes and another begins, and single turns can consist of multiple of those gamemove functions, for example, moving to table AND dealing out more cards
      this.gameState.ApplyChange(reversed);
      return reversed;
    }
    return null;
  }

  IsTweening(gameObject: Phaser.GameObjects.GameObject) {
    return this.tweens.getTweensOf(gameObject).length > 0;
  }

  GetCardFromGameObject(gameObject: Phaser.GameObjects.GameObject) {
    for (const [id, cardView] of this.cardViewMap) {
      if (cardView == gameObject) {
        return this.gameState.GetCardFromId(id);
      }
    }
    return null;
  }
  CancelTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    this.tweens.killTweensOf(gameObject);
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
  initializeInput() {
    this.input.keyboard!.on("keydown-U", () => {
      const undoMove = this.Undo();
      if (undoMove) {
        this.ApplyChange(undoMove);
      }
    });
    this.input.keyboard!.on("keydown-C", () => {
      const result = this.gameState.CalculateScores();
      console.log(result.toString());
    });
    this.input.keyboard!.on("keydown-P", () => {
      const playTurn = this.gameState.PlayTurn();
      if (playTurn) {
        this.AddToHistory(playTurn);
        this.ApplyChange(playTurn);
      }
    });
    let timeline: null | Phaser.Time.Timeline = null;
    this.input.keyboard!.on("keydown-N", () => {
      // newGameDealTimeline.stop();
      // newGameDealTimeline.reset();
      if (timeline) {
        timeline.stop();
      }

      const moveAllCardsChange = this.gameState.MoveAllCardsToDeck();
      const dealChange = this.gameState.DealCards();
      const initialDeal = this.gameState.InitialTableCards();
      this.AddToHistory(
        moveAllCardsChange.Copy().Append(dealChange).Append(initialDeal)
      );
      this.gameState.playerTurn = 0;
      // this.AddToHistory(dealChange);
      // this.AddToHistory(initialDeal);
      // this.gameState.playerTurn = 0;
      timeline = this.add.timeline([
        {
          at: 0,
          run: () => {
            this.ApplyChange(moveAllCardsChange);
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
      timeline.play();
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
          if (cardOver.currentZone.id == CardZoneID.HAND) {
            this.add.tween({
              targets: justOver[0],
              y: this.GetCardTargetPosition(cardOver.id())!.y - 20,
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
          if (cardOver.currentZone.id == CardZoneID.HAND) {
            this.add.tween({
              targets: justOut[0],
              y: this.GetCardTargetPosition(cardOver.id())!.y,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            });
          }
        }
      }
    );
    this.input.on(
      "dragstart",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        for (const [id, cardView] of this.cardViewMap) {
          if (cardView == gameObject) {
            this.heldCardId = id;
            this.dragLayer.add(cardView);
            this.CancelTweensOnGameObject(cardView);
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
          const heldCard = this.heldCardId
            ? this.gameState.GetCardFromId(this.heldCardId)
            : null;
          if (heldCard && heldCard.currentZone.id == CardZoneID.HAND) {
            const possibleScopes = this.gameState.GetPossibleScoops([heldCard]);
            console.log(possibleScopes);
            for (const scoop of possibleScopes) {
              const tableCards = scoop.tableCards;
              for (const card of tableCards) {
                this.add.tween({
                  targets: this.cardViewMap.get(card.id())!,
                  angle: "+= 10",
                  duration: 400,
                  ease: Phaser.Math.Easing.Back.Out,
                });
              }
            }
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
          console.log("card over table!!!");
          for (const card of this.gameState.table.GetCards()) {
            this.add.tween({
              targets: this.cardViewMap.get(card.id())!,
              angle: 0,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            });
          }
          // if (this.heldCardId) {
          //   const heldCard = this.gameState.GetCardFromId(this.heldCardId)!;
          //   const possibleScopes = this.gameState.GetPossibleScoops([heldCard]);
          //   console.log(possibleScopes);
          //   for (const scoop of possibleScopes) {
          //     const tableCards = scoop.tableCards;
          //     for (const card of tableCards) {
          //       this.add.tween({
          //         targets: this.cardViewMap.get(card.id())!,
          //         angle: "+= 30",
          //         duration: 400,
          //         ease: Phaser.Math.Easing.Back.Out,
          //       });
          //     }
          //   }
          // }
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
    this.input.on(
      "dragend",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (this.heldCardId) {
          const card = this.gameState.GetCardFromId(this.heldCardId)!;
          const gameChange = new GameChange(this.gameState.playerTurn);
          const cardMove = new CardMove(
            card,
            card.currentZone,
            card.currentZone
          );
          this.gameLayer.add(this.cardViewMap.get(this.heldCardId)!);
          gameChange.AddMove(cardMove);
          this.ApplyChange(gameChange);
        } else {
          console.log("no card to move on drag end");
        }
        this.heldCardId = null;

        //reset all of the rotations
        for (const card of this.gameState.table.GetCards()) {
          this.add.tween({
            targets: this.cardViewMap.get(card.id())!,
            angle: 0,
            duration: 400,
            ease: Phaser.Math.Easing.Back.Out,
          });
        }
        console.log("drag end");
      }
    );
    this.input.on(
      "dragenter",
      function (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropzone: Phaser.GameObjects.GameObject
      ) {
        console.log("drag enter");
      }
    );

    this.input.on(
      "drop",
      async (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropzone: Phaser.GameObjects.GameObject
      ) => {
        console.log("drop");
        if (this.heldCardId) {
          if (dropzone == this.tableView.dropZone) {
            const gameChange = this.gameState.MoveCard(
              this.heldCardId,
              new ZonePosition(CardZoneID.TABLE, 0)
            );
            if (gameChange) {
              console.log("successful board move!!!");
              //board move will take care of the animations
              if (gameChange.GetMoves().some((move) => move.isScopa)) {
                console.log("SCOPA!!!! for player " + gameChange.playerTurn);
              }
              this.AddToHistory(gameChange);
              this.ApplyChange(gameChange);
              this.gameLayer.add(this.cardViewMap.get(this.heldCardId)!);
              this.heldCardId = null;
            } else {
              console.log("cannot do a move with that drop");
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
  private GetCardTargetPosition(cardID: CardId): Phaser.Math.Vector2 | null {
    const card = this.gameState.GetCardFromId(cardID) ?? null;
    if (card == null) {
      console.warn(`couldn't find a card with the id ${cardID}`);
      return null;
    }
    const toCardZone = this.gameState.GetCardZoneFromPosition(card.currentZone);
    if (toCardZone == null) return null;
    switch (card.currentZone.id) {
      case CardZoneID.DECK:
        return new Phaser.Math.Vector2(80, 80);
      case CardZoneID.HAND:
        const offset = toCardZone
          .GetCards()
          .findIndex((card) => card.id() == cardID);
        const view = this.handViews.get(card.currentZone.index);
        if (offset >= 0) {
          return view!
            .GetPosition()
            .add(new Phaser.Math.Vector2(offset * 40, 0));
        } else {
          console.error(
            "card not found in the cardzone found with position " +
              card.currentZone.toString()
          );
          return null;
        }
      case CardZoneID.PILE:
        return this.GetPilePosition(card.currentZone.index);
      case CardZoneID.TABLE:
        let slotNum = 0;
        for (let [key, value] of this.slopMap) {
          if (value === cardID) {
            slotNum = key;
          }
        }
        const offsetX = (slotNum % 2) * 150;
        const offsetY = Math.floor(slotNum / 2) * 60;
        return new Phaser.Math.Vector2(512 + offsetX - 60, 384 + offsetY);
    }
  }
  //todo make some actual views
  GetPilePosition(index: number) {
    const assocHand = this.handViews.get(index);
    if (this.gameState.numPlayers == 4 && (index == 1 || index == 3)) {
      return assocHand!.GetPosition().add(new Phaser.Math.Vector2(-150, 0));
    }
    return assocHand!.GetPosition().add(new Phaser.Math.Vector2(0, 170));
  }

  GetCardZoneViewFromZonePosition(zonePosition: ZonePosition): ICardZoneView {
    switch (zonePosition.id) {
      case CardZoneID.DECK:
        return this.deckView;
      case CardZoneID.TABLE:
        return this.tableView;
      case CardZoneID.HAND:
        return this.handViews.get(zonePosition.index)!;
      case CardZoneID.PILE:
        return this.pileVies.get(zonePosition.index)!;
    }
  }
}
