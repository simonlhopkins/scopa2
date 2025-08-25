import { CardId, Suit } from "../Game/Card";
import CardZone, { CardZoneID, ZonePosition } from "../Game/CardZone";
import GameChange from "../Game/GameChange";
import GameState from "../Game/GameState";
import CardView from "../Views/CardView";
import HandView from "../Views/HandView";
import ICardZoneView from "../Views/ICardZoneView";
import CardMove from "../Game/CardMove.ts";
import CardFlip from "../Game/CardFlip.ts";
import AnimationHelpers from "./AnimationHelpers.ts";
import TweenChain = Phaser.Tweens.TweenChain;
import Tween = Phaser.Tweens.Tween;
import Vector2 = Phaser.Math.Vector2;

class AnimationController {
  private scene: Phaser.Scene;
  private handViews: Map<number, HandView>;
  private pileViews: Map<number, ICardZoneView>;
  private cardViewMap: Map<CardId, CardView>;
  tweensCanceled = 0;
  onMoveTweensCompleteCallbacks: (() => void)[] = [];
  private tweensForLatestGameChange: (
    | Phaser.Tweens.Tween
    | Phaser.Tweens.TweenChain
  )[] = [];

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
    this.tweensForLatestGameChange.push(tween);
    // this.cardViewMap.get(cardId)!.ToggleDown();
    tween.once("complete", () => {
      this.moveTweens.delete(cardId);
      if (this.moveTweens.size == 0) {
        this.flushMoveTweenCompleteCallbacks();
      }
    });

    return tween;
  }

  CancelTweensOnGameObject(gameObject: Phaser.GameObjects.GameObject) {
    this.scene.tweens.killTweensOf(gameObject);
  }
  private static ForceFinishTween(tween: Phaser.Tweens.Tween) {
    tween.seek(tween.duration + 100);
  }

  ForceCompleteMoveTweensOnCard(cardId: CardId) {
    const tween = this.moveTweens.get(cardId);
    if (tween) {
      this.tweensCanceled++;
      AnimationHelpers.ForceFinishTween(tween);
    }
  }

  IsTweening(gameObject: Phaser.GameObjects.GameObject) {
    return this.scene.tweens.getTweensOf(gameObject).length > 0;
  }
  DoDeckToTableAnimation(deckToTableMoves: CardMove[]) {
    deckToTableMoves.forEach((move, i) => {
      const cardView = this.cardViewMap.get(move.card.id())!;
      cardView.ToggleDown();
      const toPos = cardView.GetTargetPos();
      this.cardLayer.bringToTop(cardView);
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
    const MOVE_DURATION = 300;
    const DELAY_BETWEEN_CARDS = 100;
    for (let i = 0; i < dealtMoves.length; i++) {
      const cardView = this.cardViewMap.get(dealtMoves[i].card.id())!;
      this.cardLayer.bringToTop(cardView);
      const toPos = cardView.GetTargetPos();
      this.AddMoveTween(
        dealtMoves[i].card.id(),
        this.scene.add.tween({
          targets: cardView,
          x: toPos.x,
          y: toPos.y,
          duration: MOVE_DURATION,
          delay: i * DELAY_BETWEEN_CARDS,
          ease: Phaser.Math.Easing.Sine.Out,
          onComplete: () => {
            cardView.AnimateToTargetScale();
          },
        })
      );
    }
  }
  DoScoopMoveAnimation(captureMoves: CardMove[]) {
    const fromHandCardView = this.cardViewMap.get(
      captureMoves
        .find((move) => move.fromPosition.id == CardZoneID.HAND)!
        .card.id()
    )!;
    const tableCardViews = captureMoves
      .filter((move) => move.fromPosition.id == CardZoneID.TABLE)
      .map((move) => this.cardViewMap.get(move.card.id())!);

    const isScopa = captureMoves.every(
      (item) => item.animationContext.scopaAnimation
    );
    console.log(isScopa);
    const MOVE_TIME = 400;

    const handCardTweens: Phaser.Types.Tweens.TweenBuilderConfig[] =
      tableCardViews.map((cardView) => {
        return {
          targets: fromHandCardView,
          x: cardView.x,
          y: cardView.y,
          duration: MOVE_TIME,
          ease: Phaser.Math.Easing.Back.Out,
        };
      });
    handCardTweens.push({
      targets: fromHandCardView,
      x: fromHandCardView.GetTargetPos().x,
      y: fromHandCardView.GetTargetPos().y,
      duration: MOVE_TIME,
      ease: Phaser.Math.Easing.Back.Out,
    });
    if (isScopa) {
      handCardTweens.push({
        targets: fromHandCardView,
        angle: 360,
        duration: 500,
        ease: Phaser.Math.Easing.Back.Out,
      });
    }
    this.AddMoveTween(
      fromHandCardView.id(),
      this.scene.tweens.chain({
        tweens: handCardTweens,
      })
    );

    for (let i = 0; i < tableCardViews.length; i++) {
      const targetScoopedCard = tableCardViews[i];
      this.cardLayer.bringToTop(targetScoopedCard);
      const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = tableCardViews
        .slice(i + 1)
        .map((cardView) => {
          return {
            targets: targetScoopedCard,
            x: cardView.x,
            y: cardView.y,
            duration: MOVE_TIME,
            ease: Phaser.Math.Easing.Back.Out,
          };
        });
      tweens.push({
        targets: targetScoopedCard,
        x: targetScoopedCard.GetTargetPos().x,
        y: targetScoopedCard.GetTargetPos().y,
        duration: MOVE_TIME,
        ease: Phaser.Math.Easing.Back.Out,
        angle: 0,
      });
      if (isScopa) {
        tweens.push({
          targets: targetScoopedCard,
          angle: 360,
          duration: 500,
          ease: Phaser.Math.Easing.Back.Out,
        });
      }
      tweens[0].delay = (i + 1) * MOVE_TIME;
      this.AddMoveTween(
        targetScoopedCard.id(),
        this.scene.tweens.chain({
          tweens,
        })
      );
    }
    this.cardLayer.bringToTop(fromHandCardView);
  }
  private MoveAllCardsToTargetPos(gameChange: GameChange) {
    gameChange
      .GetMoves()
      .map((move) => this.cardViewMap.get(move.card.id())!)
      .forEach((cardView) => {
        cardView.setPosition(
          cardView.GetTargetPos().x,
          cardView.GetTargetPos().y
        );
        cardView.setScale(
          cardView.GetTargetScale().x,
          cardView.GetTargetScale().y
        );
      });
  }

  private DoEndGameAnimation(moves: CardMove[]) {
    const cardViewsToAnimate = moves.map(
      (move) => this.cardViewMap.get(move.card.id())!
    );

    cardViewsToAnimate.sort((a, b) => {
      return a.GetTargetPos().y - b.GetTargetPos().y;
    });

    const DURATION = 1000;
    const DELAY = 30;
    cardViewsToAnimate.forEach((cardView, i) => {
      const currentPosition = cardView.GetCurrentPos();
      const endPoint = cardView.GetTargetPos();
      let t = { value: 0 };
      const spline = AnimationHelpers.CreateLoopDeLoopSpline(
        currentPosition,
        endPoint,
        100
      );
      this.cardLayer.bringToTop(cardView);
      //move the card to the end position with a spline
      this.AddMoveTween(
        cardView.id(),
        this.scene.add.tween({
          targets: t,
          delay: i * DELAY,
          value: 1,
          duration: DURATION,
          ease: Phaser.Math.Easing.Sine.InOut,
          onUpdate: () => {
            const point = spline.getPoint(t.value);
            cardView.setPosition(point.x, point.y);
          },
        })
      );
    });
  }
  private GetZonesEffectedByGameChange(
    gameChange: GameChange,
    zoneId: CardZoneID
  ): Set<ZonePosition> {
    return new Set(
      gameChange
        .GetMoves()
        .filter(
          (move) =>
            move.toPosition.id == zoneId || move.fromPosition.id == zoneId
        )
        .map((item) => item.toPosition)
    );
  }
  AnimateGameChange(
    gameChange: GameChange,
    gameState: GameState
  ): (Tween | TweenChain)[] {
    this.tweensCanceled = 0;
    this.tweensForLatestGameChange = [];
    this.ResetTableCards(gameState);
    //force complete tweens on cards involved in moving

    const cardIDsMoved = new Set(
      gameChange.GetMoves().map((move) => move.card.id())
    );
    //force stop any tweens on cards that are moving that are involved in this board change
    cardIDsMoved.forEach((id) => {
      this.ForceCompleteMoveTweensOnCard(id);
    });
    const cardIdsMovingNotInvolvedInGameChange = new Set(
      this.moveTweens.entries()
    );

    console.log(
      `size of move tween map after cancelations:  ${
        Array.from(this.moveTweens.entries()).length
      }`
    );

    //scale down cards that are leaving hands
    gameChange
      .GetMoves()
      .filter((item) => item.fromPosition.id == CardZoneID.HAND)
      .forEach((cardMove) => {
        const cardView = this.cardViewMap.get(cardMove.card.id())!;
        cardView.ToggleDown();
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
      //make sure these cards are included in one of the scoop results, it could be a non scoop move where cards just happen to move to the pile
      if (
        gameChange.scoopResults.some((scoop) =>
          scoop.tableCards.some(
            (card) => card.Equals(move.card) || scoop.handCard.Equals(move.card)
          )
        )
      ) {
        const playerNum = move.toPosition.index;

        if (!scoopMap.get(playerNum)) {
          scoopMap.set(playerNum, []);
        }
        scoopMap.get(move.toPosition.index)!.push(move);
      }
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
        handView.ScaleUp();
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

    const endGameMoves = gameChange
      .GetMoves()
      .filter((move) => move.toPosition.id == CardZoneID.END_GAME);
    this.DoEndGameAnimation(endGameMoves);

    const dealtMoves = gameChange
      .GetMoves()
      .filter(
        (move) =>
          move.toPosition.id == CardZoneID.HAND &&
          move.fromPosition.id == CardZoneID.DECK
      );

    this.DoDealAnimation(dealtMoves);

    //animate other hand cards back to their target position that were NOT involved in the board move
    const handsEffected = this.GetZonesEffectedByGameChange(
      gameChange,
      CardZoneID.HAND
    );

    for (const hand of handsEffected) {
      gameState
        .GetCardZoneFromPosition(hand)!
        .GetCards()
        .filter((card) => !cardIDsMoved.has(card.id()))
        .map((card) => this.cardViewMap.get(card.id())!)
        .forEach((cardView) => {
          this.ForceCompleteMoveTweensOnCard(cardView.id());
          this.AddMoveTween(cardView.id(), cardView.AnimateToTargetPos());
        });
    }

    const endGameZonesEffected = this.GetZonesEffectedByGameChange(
      gameChange,
      CardZoneID.END_GAME
    );
    for (const endGameZone of endGameZonesEffected) {
      gameState
        .GetCardZoneFromPosition(endGameZone)!
        .GetCards()
        .filter((card) => !cardIDsMoved.has(card.id()))
        .map((card) => this.cardViewMap.get(card.id())!)
        .forEach((cardView) => {
          this.ForceCompleteMoveTweensOnCard(cardView.id());
          this.AddMoveTween(cardView.id(), cardView.AnimateToTargetPos());
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
      if (!dealtMoves.some((cardMove) => cardMove.card.id() == id)) {
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
      if (move.animationContext.instant) {
        this.ForceCompleteMoveTweensOnCard(move.card.id());
      }
    });

    // newMoveTweens
    return this.tweensForLatestGameChange;
  }

  private AnimateCardFlips(cardFlips: CardFlip[]) {
    // const flipMap = new Map<CardId, CardFlip[]>();
    // for(const flip of cardFlips) {
    //   if(!flipMap.has(flip.card.id())) {
    //     flipMap.set(flip.card.id(), []);
    //   }
    //   flipMap.get(flip.card.id())!.push(flip);
    // }
    //
    // Array.from(flipMap).map(entry=>{
    //   const flipArr = entry[1];
    //   //flip should be first entry from pos to last to pos
    //   return new CardFlip()
    // })

    cardFlips.forEach((flip) => {
      const cardView = this.cardViewMap.get(flip.card.id())!;
      if (flip.fromOrientation != flip.toOrientation) {
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
    });
  }
  public ResetTableCards(gameState: GameState) {
    const sortedTableCards = gameState.table.GetCards().sort((a, b) => {
      return (
        this.cardViewMap.get(a.id())!.GetTargetPos().y -
        this.cardViewMap.get(b.id())!.GetTargetPos().y
      );
    });
    for (const card of sortedTableCards) {
      this.cardLayer.bringToTop(this.cardViewMap.get(card.id())!);
      this.scene.add.tween({
        targets: this.cardViewMap.get(card.id())!,
        angle: 0,
        duration: 400,
        ease: Phaser.Math.Easing.Back.Out,
      });
    }
  }

  AddOnMoveTweensCompleteCallback(callback: () => void) {
    this.onMoveTweensCompleteCallbacks.push(callback);
    if (this.moveTweens.size == 0) {
      this.flushMoveTweenCompleteCallbacks();
    }
  }

  private flushMoveTweenCompleteCallbacks() {
    this.onMoveTweensCompleteCallbacks.forEach((callback) => callback());
    this.onMoveTweensCompleteCallbacks = [];
  }

  AnimateHoverOnEndGame(endGameZone: CardZone) {
    endGameZone.GetCards().forEach((card) => {
      if (card.suit == Suit.COIN) {
        this.cardViewMap.get(card.id())!.ToggleUp();
      }
    });
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
