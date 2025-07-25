import {CardId} from "../Game/Card";
import {CardZoneID, ZonePosition} from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import CardView from "../Views/CardView";
import HandView from "../Views/HandView";
import ICardZoneView from "../Views/ICardZoneView";
import CardMove from "../Game/CardMove.ts";
import CardFlip, {Orientation} from "../Game/CardFlip.ts";
import TweenChain = Phaser.Tweens.TweenChain;
import AnimationHelpers from "./AnimationHelpers.ts";

async function WaitUntilTweensFinish(tweens: Phaser.Tweens.Tween[]) {
  const tweenPromises = tweens.map(
    (tween) => new Promise<void>((resolve) => tween.once("complete", resolve))
  );
  // Wait for all tweens to complete
  await Promise.all(tweenPromises);
}

class AnimationController {
  private scene: Phaser.Scene;
  private handViews: Map<number, HandView>;
  private pileViews: Map<number, ICardZoneView>;
  private cardViewMap: Map<CardId, CardView>;
  tweensCanceled = 0;
  //   views:

  //animation state
  private moveTweens: Map<
    CardId,
    Phaser.Tweens.Tween | Phaser.Tweens.TweenChain
  > = new Map();
  
  cardLayer: Phaser.GameObjects.Layer;
  constructor(
    scene: Phaser.Scene,
    handViews: Map<number, HandView>,
    pileViews: Map<number, ICardZoneView>,
    cardViewMap: Map<CardId, CardView>
  ) {
    this.scene = scene;
    this.handViews = handViews;
    this.pileViews = pileViews;
    this.cardViewMap = cardViewMap;
  }
  Create(cardLayer: Phaser.GameObjects.Layer) {
    this.cardLayer = cardLayer;
  }
  CardsMoving() {
    return this.moveTweens.size > 0;
  }
  AddMoveTween(
    cardId: CardId,
    tween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain
  ) {
    if (this.moveTweens.has(cardId)) {
      console.error("Card already has a move tween: ", cardId);
    }
    this.moveTweens.set(cardId, tween);
    tween.on("complete", () => {
      this.moveTweens.delete(cardId);
    });

    return tween;
  }
  
  
  CancelTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    this.scene.tweens.killTweensOf(gameObject);
  }
  private static ForceFinishTween(tween:Phaser.Tweens.Tween){
    tween.seek(tween.duration+100);
  }
  
  ForceCompleteMoveTweensOnCard(cardId:CardId) {
    const tween = this.moveTweens.get(cardId);
    if(tween) {
      this.tweensCanceled++
      AnimationHelpers.ForceFinishTween(tween);
    }
  }

  IsTweening(gameObject: Phaser.GameObjects.GameObject) {
    return this.scene.tweens.getTweensOf(gameObject).length > 0;
  }
  DoDeckToTableAnimation(deckToTableMoves: CardMove[]) {
    deckToTableMoves.forEach((move, i) => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      const toPos = cardView.GetTargetPos();
      this.cardLayer.bringToTop(cardView)
      this.AddMoveTween(
        move.card.id(),
        this.scene.add.tween({
          targets: cardView,
          x: toPos.x,
          y: toPos.y,
          duration: 500,
          delay: i * 200,
          ease: Phaser.Math.Easing.Sine.Out,
        })
      );
    });
  }
  DoDealAnimation(dealtMoves: CardMove[]) {
    for (let i = 0; i < dealtMoves.length; i++) {
      const cardView = this.cardViewMap.get(dealtMoves[i].card.id())!;
      this.cardLayer.bringToTop(cardView)
      //dealtMoves[i].toPosition.AddCardView
      const toPos = cardView.GetTargetPos();
      this.AddMoveTween(
        dealtMoves[i].card.id(),
        this.scene.add.tween({
          targets: cardView,
          x: toPos.x,
          y: toPos.y,
          duration: 500,
          delay: i * 200,
          ease: Phaser.Math.Easing.Sine.Out,
          onComplete: () => {
            cardView.AnimateToTargetScale();
          },
        })
      );
    }
  }
  DoScoopMoveAnimation(captureMoves: CardMove[]) {
    
    const fromHandCardView = this.cardViewMap.get(captureMoves.find(move => move.fromPosition.id == CardZoneID.HAND)!.card.id())!;
    const tableCardViews = captureMoves
        .filter(move => move.fromPosition.id == CardZoneID.TABLE)
        .map(move => this.cardViewMap.get(move.card.id())!);
    
    const isScopa = captureMoves.every(item=>item.animationContext.scopaAnimation);
    console.log(isScopa)
    const MOVE_TIME = 400;
    
    const handCardTweens:Phaser.Types.Tweens.TweenBuilderConfig[] = tableCardViews.map(cardView=>{
      return {
        targets: fromHandCardView,
        x: cardView.x,
        y: cardView.y,
        duration: MOVE_TIME,
        ease: Phaser.Math.Easing.Back.Out,
      }
    })
    handCardTweens.push({
        targets: fromHandCardView,
        x: fromHandCardView.GetTargetPos().x,
        y: fromHandCardView.GetTargetPos().y,
        duration: MOVE_TIME,
        ease: Phaser.Math.Easing.Back.Out,
    })
    if(isScopa){
      handCardTweens.push({
        targets: fromHandCardView,
        angle: 360,
        duration: 500,
        ease: Phaser.Math.Easing.Back.Out,
      })
    }
    this.AddMoveTween(fromHandCardView.id(), this.scene.tweens.chain({
      tweens: handCardTweens
    }));
    this.cardLayer.bringToTop(fromHandCardView);
    
    for(let i=0; i< tableCardViews.length; i++){
      
      const tweens:Phaser.Types.Tweens.TweenBuilderConfig[] = tableCardViews.slice(i+1).map(cardView=>{
        return {
          targets: tableCardViews[i],
          x: cardView.x,
          y: cardView.y,
          duration: MOVE_TIME,
          ease: Phaser.Math.Easing.Back.Out,
        }
      })
      tweens.push(
          {
            targets: tableCardViews[i],
            x: tableCardViews[i].GetTargetPos().x,
            y: tableCardViews[i].GetTargetPos().y,
            duration: MOVE_TIME,
            ease: Phaser.Math.Easing.Back.Out,
            angle: 0
          }
      );
      if(isScopa){
        tweens.push({
          targets: tableCardViews[i],
          angle: 360,
          duration: 500,
          ease: Phaser.Math.Easing.Back.Out,
        })
      }
      tweens[0].delay = (i + 1) * MOVE_TIME;
      this.AddMoveTween(tableCardViews[i].id(), this.scene.tweens.chain({
        tweens
      }));
    }
    
    
  }
  private MoveAllCardsToTargetPos(gameChange: GameChange){
    gameChange
      .GetMoves()
      .map((move) => this.cardViewMap.get(move.card.id())!)
      .forEach((cardView) => {
        cardView.setPosition(cardView.GetTargetPos().x, cardView.GetTargetPos().y);
        cardView.setScale(cardView.GetTargetScale().x, cardView.GetTargetScale().y);
      });
  }
  
  AnimateGameChange(gameChange: GameChange, gameState: GameState) {
    this.tweensCanceled = 0;
    this.ResetTableCards(gameState);
    //force complete tweens on cards involved in moving
    
    const cardIDsMoved = new Set(
      gameChange.GetMoves().map((move) => move.card.id())
    );
    cardIDsMoved.forEach((id) => {
      this.ForceCompleteMoveTweensOnCard(id);
    });
    const handsEffected = new Set(
      gameChange
        .GetMoves()
        .filter(
          (move) =>
            move.toPosition.id == CardZoneID.HAND ||
            move.fromPosition.id == CardZoneID.HAND
        )

        .map((item) => item.toPosition.index)
    );

    //scale down cards that are leaving hands
    gameChange
      .GetMoves()
      .filter((item) => item.fromPosition.id == CardZoneID.HAND)
      .forEach((cardMove) => {
        const cardView = this.cardViewMap.get(cardMove.card.id())!;
        cardView.SetTargetScale(1, 1);
      });
    //we know that there was a scoop on this gamechange?
    const toPileMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.PILE &&
          (move.fromPosition.id == CardZoneID.TABLE ||
            move.fromPosition.id == CardZoneID.HAND)
      );

    //separate out into whichever player it is for
    const scoopMap = new Map<number, CardMove[]>();
    for (const move of toPileMoves) {
      const playerNum = move.toPosition.index;
      if (!scoopMap.get(playerNum)) {
        scoopMap.set(playerNum, []);
      }
      scoopMap.get(move.toPosition.index)!.push(move);
    }

    for (const [key, moves] of scoopMap) {
      if (!moves.some((move) => move.fromPosition.id == CardZoneID.HAND)) {
        scoopMap.delete(key);
      }
    }

    for (const [player, scoopMoves] of scoopMap) {
      //move each of the cards to the index based on their capture arr, then move into the pile.
      this.DoScoopMoveAnimation(scoopMoves);
    }

    //moves that go from the deck to the hands (dealing them out)
    for (const [id, handView] of this.handViews) {
      //dealtMoves
      if (id == gameChange.toPlayer) {
        handView.ScaleUp(0);
      } else {
        handView.ScaleDown();
      }
    }

    //moves that go from the deck to the table (initial table cards)
    const deckToTableMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.TABLE &&
          move.fromPosition.id == CardZoneID.DECK
      );
    this.DoDeckToTableAnimation(deckToTableMoves);
    //animate cards in hands to the correct positions

    const dealtMoves = gameChange
        .GetMoves()
        .filter(
            (move) =>
                move.toPosition.id == CardZoneID.HAND &&
                move.fromPosition.id == CardZoneID.DECK
        );

    this.DoDealAnimation(dealtMoves);

    //animate other hand cards back to their target position that were NOT involved in the board move
    for (const handID of handsEffected) {
      gameState
        .GetCardZoneFromPosition(new ZonePosition(CardZoneID.HAND, handID))!
        .GetCards()
        .filter((card) => !cardIDsMoved.has(card.id()))
        .map((card) => this.cardViewMap.get(card.id())!)
        .forEach((cardView) => {
          cardView.AnimateToTargetPos();
        });
    }
    //animate all of the cards of the handviews that were not effected by this board change
    //this is happening too early because it when the animation of the to deck happens, the game state is already updated to be dealt
    if (gameChange.fromPlayer != gameChange.toPlayer) {
      for (const id of [gameChange.fromPlayer, gameChange.toPlayer]) {
        this.handViews
          .get(id)!
          .GetCardViews()
          .filter((card) => !cardIDsMoved.has(card.id()))
          .map((card) => this.cardViewMap.get(card.id())!)
          .forEach((cardView) => {
            if (
              !dealtMoves.some(
                (cardMove) => cardMove.card.id() == cardView.id()
              )
            ) {
              cardView.AnimateToTargetScale();
            }
          });
      }
    }
    
    for (const id of cardIDsMoved) {
      //default move to behavior
      const cardView = this.cardViewMap.get(id)!;
      const toPos = cardView.GetTargetPos();
      if (
        !dealtMoves.some((cardMove) => cardMove.card.id() == id)
      ) {
        cardView.AnimateToTargetScale();
      }
      if (!this.moveTweens.has(id)) {
        this.AddMoveTween(
            id,
          this.scene.add.tween({
            targets: cardView,
            x: toPos.x,
            y: toPos.y,
            duration: 300,
            ease: Phaser.Math.Easing.Sine.Out,
          })
        );
      }
    }
    //flips
    this.AnimateCardFlips(gameChange.GetFlips());
    
    //instantly finish everything if it is instant
    gameChange.GetMoves().forEach((move) => {
      if(move.animationContext.instant){
        this.ForceCompleteMoveTweensOnCard(move.card.id());
      }
    });
    console.log("num animations canceled: ", this.tweensCanceled);
  }
  
  private AnimateCardFlips(cardFlips: CardFlip[]){
    cardFlips.forEach((flip => {
      const cardView = this.cardViewMap.get(flip.card.id())!;
      if(flip.fromOrientation != flip.toOrientation) {
        if (flip.animationContext.flipAtEnd) {
          const currentMoveTween = this.moveTweens.get(flip.card.id());
          if (currentMoveTween) {
            currentMoveTween.on("complete", () => {
              cardView.DoFlipAnimation(flip.toOrientation);
            });
          } else {
            cardView.DoFlipAnimation(flip.toOrientation);
          }
        } else {
          cardView.DoFlipAnimation(flip.toOrientation);
        }
      }
    }));
  }
  public ResetTableCards(gameState: GameState) {
    for (const card of gameState.table.GetCards()) {
      this.cardLayer.bringToTop(this.cardViewMap.get(card.id())!);
      this.scene.add.tween({
        targets: this.cardViewMap.get(card.id())!,
        angle: 0,
        duration: 400,
        ease: Phaser.Math.Easing.Back.Out,
      });
    }
  }
  AnimateTableScoopsForCard(cardId: CardId, gameState: GameState) {
    const card = gameState.GetCardFromId(cardId);
    if (card && card.currentZone.id == CardZoneID.HAND) {
      const possibleScopes = gameState.GetPossibleScoops([card]);
      for (const scoop of possibleScopes) {
        const tableCards = scoop.tableCards;
        for (const card of tableCards) {
          this.scene.add.tween({
            targets: this.cardViewMap.get(card.id())!,
            angle: 10,
            duration: 400,
            ease: Phaser.Math.Easing.Back.Out,
          });
        }
      }
    }
  }
}

export default AnimationController;
