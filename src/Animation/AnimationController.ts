import { CardId } from "../Game/Card";
import { CardZoneID, ZonePosition } from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import CardView from "../Views/CardView";
import HandView from "../Views/HandView";
import ICardZoneView from "../Views/ICardZoneView";
import AnimationContext from "./AnimationContext.ts";
import CardMove from "../Game/CardMove.ts";

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
  animationLayer: Phaser.GameObjects.Layer;
  baseLayer: Phaser.GameObjects.Layer;
  topLayer: Phaser.GameObjects.Layer;
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
  Create() {
    this.animationLayer = this.scene.add.layer();
    this.baseLayer = this.scene.add.layer().setDepth(0);
    this.topLayer = this.scene.add.layer().setDepth(1);
    this.animationLayer.add(this.baseLayer);
    this.animationLayer.add(this.topLayer);
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
  ForceCompleteTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    const tweens = this.scene.tweens.getTweensOf(gameObject);
    tweens.forEach((tween) => {
      tween.seek(tween.duration);
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
  async DoScoopAnimation(captureMoves: CardMove[]) {
    const sortedCaptureMoves = captureMoves.sort((moveA, moveB) => {
      return moveA.fromPosition.id === CardZoneID.HAND
        ? -1
        : moveB.fromPosition.id === CardZoneID.HAND
        ? 1
        : 0;
    });
    if (
      sortedCaptureMoves.length > 0 &&
      sortedCaptureMoves[0].fromPosition.id == CardZoneID.HAND
    ) {
      const droppedCardView = this.cardViewMap.get(
        sortedCaptureMoves[0].card.id()
      )!;
      sortedCaptureMoves.forEach((move, i) =>
        this.cardViewMap
          .get(move.card.id())!
          .setDepth(100 + sortedCaptureMoves.length - i)
      );
      //lerp all cards under dropped card, then to pile

      sortedCaptureMoves.forEach((move, i) => {
        const cardView = this.cardViewMap.get(move.card.id())!;
        console.log(cardView);
        const targetPos = cardView.GetTargetPos();

        const chain = this.scene.tweens.chain({
          targets: cardView,
          tweens: [
            {
              x: droppedCardView.x + (i + 1) * 40,
              y: droppedCardView.y,
              angle: 0,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            },
            {
              x: droppedCardView.x,
              y: droppedCardView.y,
              angle: 0,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            },
            {
              x: targetPos.x,
              y: targetPos.y,
              angle: 0,
              duration: 400,
              onStart: () => {
                // cardView.Flip(true);
              },
              ease: Phaser.Math.Easing.Back.Out,
            },
          ],
        });
        this.AddMoveTween(move.card.id(), chain);
      });
    } else {
      console.log("no scoop card!!!");
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
    gameChange
      .GetMoves()
      .map((move) => this.cardViewMap.get(move.card.id())!)
      .forEach((cardView) => {
        this.ForceCompleteTweensOnGameObject(cardView);
      });
    console.log(
      `turn going from ${gameChange.fromPlayer} to ${gameChange.toPlayer}`
    );
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
    //scale up the hands if it is your turn.
    console.log(handsEffected);

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
        console.log("SCALING UP PLAYER " + id);
      } else {
        handView.ScaleDown();
      }
    }
    const dealtMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.HAND &&
          move.fromPosition.id == CardZoneID.DECK
      );

    this.DoDealAnimation(dealtMoves);

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

    //animate other hand cards back to their target position that were NOT involved in the board move
    for (const handID of handsEffected) {
      gameState
        .GetCardZoneFromPosition(new ZonePosition(CardZoneID.HAND, handID))!
        .GetCards()
        .filter((card) => !cardIDsMoved.has(card.id()))
        .map((card) => this.cardViewMap.get(card.id())!)
        .forEach((cardView) => {
          console.log("Scaling cards in hand " + handID);
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
            console.log(this.handViews.get(id)!.GetCardViews().length);
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

    this.ResetTableCardAngles(gameState);
    gameChange.GetMoves().forEach((move => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      if(move.getIsFaceDown()){
        console.log(`Flipping card ${move.card.id()} face down`);
        cardView.FlipFaceDown();
      }else {
        console.log(`Flipping card ${move.card.id()} face up`);
        cardView.FlipFaceUp();
      }
    }));

    if(context && context.instant) {
      //if we are in instant mode, just skip all the animations
      gameChange.GetCardIds().forEach(id=>{
        this.ForceCompleteTweensOnCard(id);
      })
    }
  }
  ResetTableCardAngles(gameState: GameState) {
    console.log("Resetting table card angles");
    for (const card of gameState.table.GetCards()) {
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
