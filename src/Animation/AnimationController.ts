import card, {CardId} from "../Game/Card";
import {CardZoneID, ZonePosition} from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import CardView from "../Views/CardView";
import HandView from "../Views/HandView";
import ICardZoneView from "../Views/ICardZoneView";
import AnimationContext from "./AnimationContext.ts";
import CardMove from "../Game/CardMove.ts";
import {Orientation} from "../Game/CardFlip.ts";
import TweenChain = Phaser.Tweens.TweenChain;

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
    console.log("card moving size = " + this.moveTweens.size);
    return this.moveTweens.size > 0;
  }
  AddMoveTween(
    cardId: CardId,
    tween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain
  ) {
    if (this.moveTweens.has(cardId)) {
      this.moveTweens.get(cardId)!.complete();
      this.moveTweens.delete(cardId);
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
  private ForceFinishTween(tween:Phaser.Tweens.Tween){
    tween.seek(tween.duration+100);
  }
  ForceCompleteTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    const tweens = this.scene.tweens.getTweensOf(gameObject);
    tweens.forEach((tween) => {
      if(tween instanceof Phaser.Tweens.TweenChain){
        const chain:TweenChain = tween;
        this.ForceFinishTween(chain.currentTween);
        while (!chain.nextTween()){
          if(chain.currentTween){
            this.ForceFinishTween(chain.currentTween);
          }
        }
      }else{
        this.ForceFinishTween(tween)
      }
      tween.complete();

    });
  }
  ForceCompleteTweensOnCard(cardId: CardId) {
    const cardView = this.cardViewMap.get(cardId);
    if (cardView) {
      this.ForceCompleteTweensOnGameObject(cardView);
    } else {
      console.warn(`Card with ID ${cardId} not found in cardViewMap.`);
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
  DoScoopAnimation(captureMoves: CardMove[]) {
    
    const fromHandCardView = this.cardViewMap.get(captureMoves.find(move => move.fromPosition.id == CardZoneID.HAND)!.card.id())!;
    const tableCardViews = captureMoves
        .filter(move => move.fromPosition.id == CardZoneID.TABLE)
        .map(move => this.cardViewMap.get(move.card.id())!);
    
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
        onStart: () => {
            fromHandCardView.FlipFaceDown();
        },
    })
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
            angle: 0,
            onStart: () => {
              tableCardViews[i].FlipFaceDown();
            },
          }
      );
      const delay = (i+1) * MOVE_TIME;
      tweens[0].delay = delay;
      console.log(`tween length: ${tweens.length} delay: ${delay}`);
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
  
  AnimateGameChange(gameChange: GameChange, gameState: GameState, context:AnimationContext| null = null) {
    //separate out the moves that go to piles!
    this.ResetTableCards(gameState);
    gameChange
      .GetMoves()
      .map((move) => this.cardViewMap.get(move.card.id())!)
      .forEach((cardView) => {
        this.ForceCompleteTweensOnGameObject(cardView);
      });
    const cardIDsMoved = new Set(
      gameChange.GetMoves().map((move) => move.card.id())
    );
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
        // this.scene.add.tween({
        //   targets: cardView,
        //   scaleX: 1,
        //   scaleY: 1,
        //   duration: 300,
        //   ease: Phaser.Math.Easing.Back.Out,
        // });
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
      this.DoScoopAnimation(scoopMoves);
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

    //flips
    // for (const cardMove of gameChange.GetMoves()) {
    //   const cardView = cardViewMap.get(cardMove.card.id())!;
    //   if (
    //     cardMove.toPosition.id == CardZoneID.PILE ||
    //     cardMove.toPosition.id == CardZoneID.DECK
    //   ) {
    //     cardView.Flip(true);
    //   } else {
    //     cardView.Flip(false);
    //   }
    // }
    for (const move of gameChange.GetMoves()) {
      //default move to behavior
      const cardView = this.cardViewMap.get(move.card.id())!;
      const toPos = cardView.GetTargetPos();
      if (
        !dealtMoves.some((cardMove) => cardMove.card.id() == move.card.id())
      ) {
        cardView.AnimateToTargetScale();
      }
      if (!this.moveTweens.has(move.card.id())) {
        this.AddMoveTween(
          move.card.id(),
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
    //reorder table cards
    //flip
    gameChange.GetFlips().forEach((flip => {
      const cardView = this.cardViewMap.get(flip.card.id())!;
      if(flip.fromOrientation!= flip.toOrientation || true){
        if (flip.toOrientation == Orientation.Down) {
          if(flip.animationContext.flipAtEnd){
            this.moveTweens.get(flip.card.id())?.on("complete", () => {
              cardView.FlipFaceDown();
            });
          }else{
            cardView.FlipFaceDown();
          }
        } else {
          console.log("flipping face up"+ flip.card.toString());
            if(flip.animationContext.flipAtEnd){
                this.moveTweens.get(flip.card.id())?.on("complete", () => {
                cardView.FlipFaceUp();
                });
            }else{
                cardView.FlipFaceUp();
            }
        }
      }
        
    }));

    if(context && context.instant) {
      //if we are in instant mode, just skip all the animations
      gameChange.GetCardIds().forEach(id=>{
        this.ForceCompleteTweensOnCard(id);
      })
    }
  }
  ResetTableCards(gameState: GameState) {
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
