import { CardId } from "./Game/Card";
import { CardZoneID, ZonePosition } from "./Game/CardZone";
import GameChange, { CardMove } from "./Game/GameChange";
import GameState from "./Game/GameState";
import Util from "./Util";
import CardView from "./Views/CardView";
import HandView from "./Views/HandView";
import ICardZoneView from "./Views/ICardZoneView";

export class AnimationResult {
  animationMap: Map<CardId, Phaser.Tweens.BaseTween>;
  onComplete: () => void = () => {
    console.log("anim result complete");
  };
  constructor(initial?: Map<CardId, Phaser.Tweens.BaseTween>) {
    this.animationMap = initial ?? new Map();
  }
  AddAnimation(cardID: CardId, tween: Phaser.Tweens.BaseTween) {
    tween.pause();
    if (this.animationMap.get(cardID)) {
      console.warn(
        "YOU ARE TRYING TO ADD AN ANIMATION TO AN ANIMATION RESULT THAT ALREADY EXISTS!!"
      );
    }
    this.animationMap.set(cardID, tween);
  }
  Union(other: Map<CardId, Phaser.Tweens.BaseTween>) {
    const ret = new AnimationResult(this.animationMap);
    for (const [key, val] of other) {
      ret.AddAnimation(key, val);
    }

    return ret;
  }
  Append(other: AnimationResult) {
    this.animationMap = this.Union(other.GetAnimationMap()).GetAnimationMap();
  }
  GetTweens() {
    return Array.from(this.animationMap.values());
  }
  GetAnimationMap() {
    return this.animationMap;
  }
  Run() {
    for (const [cardId, tween] of this.animationMap) {
      if (tween == null) {
        console.error("tween is null for card " + cardId);
      } else {
        tween.resume();
      }
    }
    Util.WaitUntilTweensFinish(this.GetTweens()).then(() => {
      this.onComplete();
    });
  }
}

class AnimationController {
  private scene: Phaser.Scene;
  private handViews: Map<number, HandView>;
  private pileViews: Map<number, ICardZoneView>;
  private cardViewMap: Map<CardId, CardView>;
  private currentMoveAnimations: Map<number, AnimationResult> = new Map();
  private animResultID: number = 0;

  //   views:

  //animation state
  animationLayer: Phaser.GameObjects.Layer;
  private isDealing: boolean = false;
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
  }
  CardsMoving() {
    return this.currentMoveAnimations.size > 0;
  }
  CancelTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    this.scene.tweens.killTweensOf(gameObject);
  }
  ForceCompleteTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    const tweens = this.scene.tweens.getTweensOf(gameObject);
    tweens.forEach((tween) => tween.complete());
  }

  IsTweening(gameObject: Phaser.GameObjects.GameObject) {
    return this.scene.tweens.getTweensOf(gameObject).length > 0;
  }
  private DoDeckToTableAnimation(
    deckToTableMoves: CardMove[]
  ): AnimationResult {
    const ret = new AnimationResult();
    deckToTableMoves.forEach((move, i) => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      const toPos = cardView.GetTargetPos();
      this.animationLayer.bringToTop(cardView);
      const tween = this.scene.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        delay: i * 200,
        ease: Phaser.Math.Easing.Sine.Out,
        onComplete: () => {
          cardView.Flip(false);
        },
      });
      ret.AddAnimation(move.card.id(), tween);
    });
    return ret;
  }
  private DoDealAnimation(dealtMoves: CardMove[]): AnimationResult {
    const ret = new AnimationResult();
    this.isDealing = true;
    dealtMoves.forEach((move, i) => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      //dealtMoves[i].toPosition.AddCardView
      const toPos = cardView.GetTargetPos();
      this.animationLayer.bringToTop(cardView);
      const tween = this.scene.add.tween({
        targets: cardView,
        x: toPos.x,
        y: toPos.y,
        duration: 500,
        delay: i * 200,
        ease: Phaser.Math.Easing.Sine.Out,
        onComplete: () => {
          if (move.toPosition.index == 2) {
            cardView.Flip(false);
          }
          cardView.AnimateToTargetScale();
        },
      });
      ret.AddAnimation(move.card.id(), tween);
      return ret;
    });
    Util.WaitUntilTweensFinish(ret.GetTweens()).then(() => {
      this.isDealing = false;
    });
    return ret;
  }
  private DoScoopAnimation(captureMoves: CardMove[]): AnimationResult {
    const ret = new AnimationResult();
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
      const pickupCardView = this.cardViewMap.get(
        sortedCaptureMoves[1].card.id()
      )!;
      sortedCaptureMoves.forEach((move, i) =>
        this.cardViewMap
          .get(move.card.id())!
          .setDepth(100 + sortedCaptureMoves.length - i)
      );
      //lerp all cards under dropped card, then to pile
      const isScopa = captureMoves.some((move) => move.isScopa);
      sortedCaptureMoves.forEach((move, i) => {
        const cardView = this.cardViewMap.get(move.card.id())!;
        this.animationLayer.bringToTop(cardView);
        console.log(cardView);
        const targetPos = cardView.GetTargetPos();

        const chain = this.scene.tweens.chain({
          targets: cardView,
          tweens: [
            {
              x: pickupCardView.x + (i + 1) * 40,
              y: pickupCardView.y,
              angle: 0,
              duration: 400,
              ease: Phaser.Math.Easing.Back.Out,
            },
            {
              x: pickupCardView.x,
              y: pickupCardView.y,
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
                cardView.Flip(true);
              },
              ease: Phaser.Math.Easing.Back.Out,
            },
          ],
        });
        if (isScopa) {
          chain.add([
            {
              targets: cardView,
              angle: 360,
              duration: 1000,
              ease: Phaser.Math.Easing.Sine.InOut,
            },
          ]);
        }
        ret.AddAnimation(move.card.id(), chain);
      });
    } else {
      console.log("no scoop card!!!");
    }
    return ret;
  }

  private AnimateCardsScooped(gameChange: GameChange): AnimationResult {
    const ret = new AnimationResult();

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
      this.cardViewMap.get(move.card.id())?.Flip(false);
    }

    for (const [key, moves] of scoopMap) {
      if (!moves.some((move) => move.fromPosition.id == CardZoneID.HAND)) {
        scoopMap.delete(key);
      }
    }

    for (const [player, scoopMoves] of scoopMap) {
      //move each of the cards to the index based on their capture arr, then move into the pile.
      ret.Append(this.DoScoopAnimation(scoopMoves));
    }
    return ret;
  }
  private AnimateCardsInEffectedHands(gameChange: GameChange): AnimationResult {
    const ret = new AnimationResult();
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
    for (const handID of handsEffected) {
      this.handViews
        .get(handID)!
        // .GetCardZoneFromPosition(new ZonePosition(CardZoneID.HAND, handID))!
        .GetCardViews()
        .filter(
          (cardView) =>
            !gameChange
              .GetMoves()
              .some((move) => move.card.id() == cardView.id())
        )
        .forEach((cardView) => {
          console.log(
            "animating not in card move: " + cardView.card.toString()
          );
          ret.AddAnimation(cardView.id(), cardView.AnimateToTargetPos());
        });
    }
    return ret;
  }

  public AnimateGameChange(gameChange: GameChange) {
    //WARNING! You should be careful about checking gamestate in here because the gamestate might have been updated all at once, and we're in the middle of sequencing some game changes. The gamechanges are ultimately what we want to use. The view members are the current UI state which might be helpful for some things, since we're updating the UI
    console.log(
      `turn going from ${gameChange.fromPlayer} to ${gameChange.toPlayer}`
    );
    // this.CompleteAllTweensForCards(gameChange);

    const cardsMoved = new AnimationResult();
    const dealtMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.HAND &&
          move.fromPosition.id == CardZoneID.DECK
      );

    cardsMoved.Append(this.DoDealAnimation(dealtMoves));
    cardsMoved.Append(this.AnimateCardsScooped(gameChange));
    const deckToTableMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.TABLE &&
          move.fromPosition.id == CardZoneID.DECK
      );
    cardsMoved.Append(this.DoDeckToTableAnimation(deckToTableMoves));
    cardsMoved.Append(this.AnimateCardsInEffectedHands(gameChange));

    //all the cards that should be moved by this game change that were not moved by any other move thus far

    for (const move of gameChange.GetMoves()) {
      const cardId = move.card.id();
      if (!cardsMoved.GetAnimationMap().has(cardId)) {
        const cardView = this.cardViewMap.get(cardId)!;
        if (
          move.toPosition.id == CardZoneID.DECK ||
          move.toPosition.id == CardZoneID.PILE
        ) {
          cardView.Flip(true);
        } else {
          cardView.Flip(false);
        }
        this.animationLayer.bringToTop(cardView);
        const moveTween = cardView.AnimateToTargetPos();
        cardsMoved.AddAnimation(cardId, moveTween);
      }
    }
    gameChange.GetMoves().forEach((move) => {
      if (move.toPosition.id == CardZoneID.HAND && move.toPosition.index != 2) {
        this.cardViewMap.get(move.card.id())!.Flip(true);
      }
    });

    //ALL SCALING CAN BE DONE HERE
    //idk if this is even correct
    gameChange.GetMoves().forEach((move) => {
      this.cardViewMap.get(move.card.id())!.SetTargetScale(1, 1);
    });
    //scale up the current player, scale down the previous player
    this.handViews.get(gameChange.fromPlayer)!.ScaleDown();
    this.handViews.get(gameChange.toPlayer)!.ScaleUp();
    //get all cardIds that are in the to player and from player's hands and the cards in the board move but not the cards being dealt out
    const cardsInCurrentPlayerAndPreviousPlayersHands = [
      gameChange.fromPlayer,
      gameChange.toPlayer,
    ].flatMap((id) =>
      this.handViews
        .get(id)!
        .GetCardViews()
        .map((cardView) => cardView.id())
    );
    const cardsToAnimateScale = new Set(
      cardsInCurrentPlayerAndPreviousPlayersHands
    )
      .union(cardsMoved.GetAnimationMap())
      .difference(new Set(dealtMoves.map((move) => move.card.id())));

    //we want to animate all cards in the hands of the last 2 players (could be the same player) AND we want to animate all the cards that were involved in this board move UNLESS they are being dealt out
    cardsToAnimateScale.forEach((cardID) => {
      this.cardViewMap.get(cardID)!.AnimateToTargetScale();
    });

    //should probably also do this for scale and flip animations
    //this basically takes the INTERSECTION of the current tweens happening and the new animation result we made and cancels the animations fall in that intersection, since they will be replaced by the animations for this new game change.
    const id = this.animResultID++;
    for (const [_id, anim] of this.currentMoveAnimations) {
      for (const [cardID, tween] of anim.GetAnimationMap()) {
        if (cardsMoved.GetAnimationMap().has(cardID)) {
          //if the current animation we want to execute has any overlap with the anims currently happening
          tween.stop();
        }
      }
    }
    Util.WaitUntilTweensFinish(cardsMoved.GetTweens()).then(() => {
      this.currentMoveAnimations.delete(id);
    });
    this.currentMoveAnimations.set(id, cardsMoved);
    cardsMoved.Run();
    return cardsMoved;
  }
  ResetCardAngles(gameState: GameState) {
    for (const cardId of gameState.GetCardIds()) {
      this.scene.add.tween({
        targets: this.cardViewMap.get(cardId)!,
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
