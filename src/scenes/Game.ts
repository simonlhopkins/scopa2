import {Scene} from "phaser";
import CardZone, {CardZoneID, ZonePosition} from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState, {ScoopResult} from "../Game/GameState";
import Card, {CardId, Suit} from "../Game/Card";
import TableView from "../Views/TableView";
import HandView from "../Views/HandView";
import CardView from "../Views/CardView";
import DeckView from "../Views/DeckView";
import PileView from "../Views/PileView";
import ICardZoneView from "../Views/ICardZoneView";
import AnimationController from "../Animation/AnimationController";
import IInputEventHandler from "../Input/IInputEventHandler.ts";
import InputController from "../Input/InputController.ts";
import GameStateHelpers from "../Game/GameStateHelpers.ts";
import {SceneKeys} from "./SceneKeys.ts";
import AnimationHelpers from "../Animation/AnimationHelpers.ts";
import EndGameCardZoneView from "../Views/EndGameCardZoneView.ts";
import PopupController from "../PopupController.ts";
import GameObject = Phaser.GameObjects.GameObject;
import Util from "../Util.ts";

export class Game extends Scene implements IInputEventHandler {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  gameState: GameState = new GameState();

  cardViewMap: Map<CardId, CardView> = new Map();
  tableView: TableView;
  deckView: DeckView;
  handViews: Map<number, HandView> = new Map();
  pileViews: Map<number, PileView> = new Map();
  endGameView: EndGameCardZoneView;
  heldCardId: CardId | null;
  dragLayer: Phaser.GameObjects.Layer;
  gameLayer: Phaser.GameObjects.Layer;

  animationController: AnimationController;
  inputController: InputController;
  popupController: PopupController;
  history: GameChange[] = [];
  
  //I should move these out into something else maybe
  newGameDealTimeline: null | Phaser.Time.Timeline = null;
  // cardZoneViews: Map<ZonePosition, >
  constructor() {
    super(SceneKeys.Game);
    this.animationController = new AnimationController(
      this,
      this.handViews,
      this.pileViews,
      this.cardViewMap
    );
    
    this.inputController = new InputController(
        this,
        this,
        this.animationController
    );
    this.popupController = new PopupController(this);
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

    this.animationController.Create(this.gameLayer);
    this.inputController.initialize();

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
    this.endGameView = this.add.existing(new EndGameCardZoneView(this));
    this.endGameView.setPosition(this.scale.width/2, this.scale.height/2);
    this.tableView.setPosition(512, 384);

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x00ff00);

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
    this.endGameView.Reset();

    const maybeSaveData = localStorage.getItem("saveData");
    if (maybeSaveData) {
      console.log("found save game");
      const gameChange = this.gameState.loadFromJson(JSON.parse(maybeSaveData));
      
      this.ApplyChange(gameChange);
      if (this.gameState.IsGameOver()) {
        console.log(this.gameState)
        // this.ApplyChange(gameChange);
        this.scene.launch(SceneKeys.EndOfGame, this.gameState)

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
  
  public PlayBestMoveForCurrentPlayer(){
    const bestCardToPlay = this.gameState.GetBestCardToPlayForPlayer(this.gameState.GetPlayerTurn());
    if(bestCardToPlay){
      this.AttemptMoveCardToTable(bestCardToPlay)
    }
  }
  
  
  GetPlayerHand():CardZone{
    return this.gameState.playerHands.get(0)!;
  }
  
  
  ApplyChange(gameChange: GameChange | null) {
    if (gameChange == null) {
      console.log("game change is null, nothing to apply");
      return null;
    }
    for (const cardMove of gameChange.GetMoves()) {
      const cardView = this.cardViewMap.get(cardMove.card.id());
      if (cardView) {
        this.GetCardZoneViewFromZonePosition(cardMove.fromPosition).RemoveCardView(cardView);
        this.GetCardZoneViewFromZonePosition(cardMove.toPosition).AddCardView(cardView);
      }else{
        console.error(`couldn't find card view for card ${cardMove.card.id()}`);
      }
    }
    //animate the move
    const resultingTweens = this.animationController.AnimateGameChange(gameChange, this.gameState);
    localStorage.setItem("saveData", JSON.stringify(this.gameState.toJson()));
    //at the end, determine if it is time to change the player turn
    if(gameChange.fromPlayer != gameChange.toPlayer && gameChange.toPlayer != 0){
        // this.OnPlayerTurnChange();
      const delayAfter = gameChange.fromPlayer == 0 ? 500: 700;
      AnimationHelpers.WaitForTweensToComplete(resultingTweens, delayAfter).then(()=>{
        console.log("play")
        //only progress if the move that was played is the same as the last move in history
        if(gameChange.Equals(this.history[this.history.length-1])){
          this.PlayBestMoveForCurrentPlayer();
        }else {
          console.log("NOT EQUAL ANYMORE!!")
        }
      })
    }
    return resultingTweens;
  }

  Undo():void {
    if(this.history.length < 1){
      console.log("cannot undo, make at least 2 moves")
      return;
    }
    const lastGameChange = this.PopFromHistory();
    // return undoGameChange;
    if (lastGameChange) {
      const reversed = lastGameChange.Reverse();
      //it would be nice if undo was in gamestate so I didn't have to remember to do this but game state just generates gamemoves, so it is unclear where one move finishes and another begins, and single turns can consist of multiple of those gamemove functions, for example, moving to table AND dealing out more cards
      this.gameState.ApplyChange(reversed);
      this.ApplyChange(reversed);
    }
  }
  GetCardFromGameObject(gameObject: Phaser.GameObjects.GameObject) : Card | null {
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
  ClearHistory() {
    this.history = [];
    localStorage.setItem("history", JSON.stringify(this.history));
  }

  DealNewGame() {
    this.ClearHistory();
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
  AttemptMoveCardToTable(cardId: CardId, maybePreferredScoopResult: ScoopResult|null = null): GameChange | null {
    const scoopResults = this.gameState.GetPossibleScoops([this.gameState.GetCardFromId(cardId)!]);
    //🤮🤮🤮
    if(scoopResults.length>1 && !maybePreferredScoopResult && this.gameState.GetPlayerTurn() == 0){
      this.popupController.ShowScoopChoicePopup(scoopResults, (chosenScoop)=>{
        this.AttemptMoveCardToTable(cardId, chosenScoop);
      }, ()=>{});
      return null;
    }
    this.gameLayer.add(this.cardViewMap.get(cardId)!);
    //TODO: I can also choose to wait for this to resolve and then deal out more cards
    const gameChange = this.gameState.MoveCard(
      cardId,
      new ZonePosition(CardZoneID.TABLE, 0),
      maybePreferredScoopResult
    );
    
    if (gameChange) {
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
                this.animationController.AddOnMoveTweensCompleteCallback(()=>{
                  // this.OnGameOver();
                  Util.wait(500).then(()=>{
                    this.scene.launch(SceneKeys.EndOfGame, this.gameState);
                  });
                  // this.ApplyChange(this.gameState.MoveCardsToEndGameState());
                })
              },
            })
            .play();
        }
      }
    }
    return gameChange;
  }
  // private GetEndOfGameData(){
  //   const endGameData = new EndGameData();
  //   const scopaMoves = this.history.filter(move=>move.isScopa);
  //   const scopaMap = new Map<number, number>();
  //   for(const move of scopaMoves){
  //       const playerId = move.playerTurn;
  //       if(scopaMap.has(playerId)){
  //           scopaMap.set(playerId, scopaMap.get(playerId)! + 1);
  //       }else{
  //           scopaMap.set(playerId, 1);
  //       }
  //   }
  //   endGameData.scoreResult = this.gameState.CalculateScores();
  //   endGameData.scopaMap = scopaMap;
  //   endGameData.handler = this;
  //   // this.scene.pause(SceneKeys.Game);
  //   return endGameData;
  // }
  IgnoreInput() {
    return this.popupController.IsShowing();
  }
  
  OnCardHovered(card: Card) {
  if(this.IgnoreInput()){
    return
  }
  this.ResetHandCards();
  const cardView = this.cardViewMap.get(card.id())!;
  switch (card.currentZone.id) {
    case CardZoneID.HAND:
      cardView.ToggleUp();
      if (this.GetPlayerHand().HasCard(card)) {
        this.animationController.AnimateTableScoopsForCard(
          card.id(),
          this.gameState
        );
      }
      break;
    case CardZoneID.PILE:
      console.log(
        this.gameState
          .GetCardZoneFromPosition(card.currentZone)
          ?.toString()
      );
      break;
    case CardZoneID.TABLE:
      console.log(
        this.gameState
          .GetCardZoneFromPosition(card.currentZone)
          ?.toString()
      );
      break;
    case CardZoneID.END_GAME:
      console.log("end game");
      break;
  }
}
  public OnPointerOverGameObject(gameobject: GameObject){
    const cardOver = this.GetCardFromGameObject(gameobject);
    if (cardOver) {
      this.OnCardHovered(cardOver);
    }
  }
  GetCardViewFromId(cardId: CardId){
    return  this.cardViewMap.get(cardId)!;
  }
  OnDebugCommand(command:string){
    switch (command){
        case "dealNewGame":
            this.DealNewGame();
            break;
        case "undo":
            this.Undo();
            break;
        case "scoopableState":
            this.ApplyChange(GameStateHelpers.CreateScoopableState(this.gameState));
            break;
        case "preEndGame":
            this.ApplyChange(GameStateHelpers.PreEndGameState(this.gameState));
            break;
        default:
            console.warn(`unknown debug command ${command}`);
            break;
    }
  }
  public ResetHandCards(){
    this.animationController.ResetTableCards(this.gameState);
    for(const [num, cardzone] of this.gameState.playerHands){
      for(const cards of cardzone.GetCards()){
        const cardView = this.cardViewMap.get(cards.id());
        if(cardView){
          cardView.ToggleDown();
        }else{
          console.error(`couldn't find card view for card ${cards.id()}`);
        }
      }
    }
  }
  public OnPointerExitGameObject(gameobject: GameObject){
    //was it a card?
    const cardOver = this.GetCardFromGameObject(gameobject);
    if(cardOver){
      // const flipGameChange = new GameChange(this.gameState.GetPlayerTurn(), this.gameState.GetPlayerTurn(), this.gameState.GetPlayerTurn());
      // flipGameChange.AddFlip(new CardFlip(cardOver, cardOver.orientation, Orientation.Down));
      // this.gameState.ApplyChange(flipGameChange);
      // this.ApplyChange(flipGameChange);
      // this.ApplyChange(this.gameState.FlipCardFaceDown(cardOver.id()))

    }

    this.ResetHandCards();
    
  }
  
  public OnDragStart(gameobject: GameObject){
    
    const cardClicked = this.GetCardFromGameObject(gameobject)
    if(cardClicked){
      // if(!this.gameState.playerHands.get(0)!.GetCards().some(card=>card.id()==cardClicked.id())){
      //   return;
      // }
      console.log("hand cards: " + this.gameState.playerHands.get(0)!.GetCards().map(card=>card.toString()).join(", "))
      // dragStartTime = this.time.now;
      this.GetCardViewFromId(cardClicked.id()).ToggleDown();
      this.animationController.ResetTableCards(this.gameState);
      this.heldCardId = cardClicked.id();
      this.dragLayer.add(gameobject);
    }
  }
  
  public OnDragEnter(target: GameObject) {
    if (target == this.tableView.dropZone) {
      if (this.heldCardId) {
        this.animationController.AnimateTableScoopsForCard(
            this.heldCardId,
            this.gameState
        );
      }
    }
  }
  
  public OnDragLeave(target: GameObject) {
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
  
  public OnDrag(dragX: number, dragY: number) {
    if (this.heldCardId) {
      const cardView = this.cardViewMap.get(this.heldCardId) ?? null;
      if (cardView) {
        cardView.setPosition(dragX, dragY);
      }
    }
  }
  public OnDragEnd(isClick: boolean) {
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
    console.log("drag end")
    if (this.heldCardId) {
      //maybe check the distance traveled here
      if (isClick) {
        //register as a click
        const gameChange = this.AttemptMoveCardToTable(this.heldCardId);
        if (!gameChange) {
          returnHeldCard();
        }
      } else {
        returnHeldCard();
      }
      this.heldCardId = null;
    }
  }
  public OnDrop(dropzone:GameObject){
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
      case CardZoneID.END_GAME:
        return this.endGameView;
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
