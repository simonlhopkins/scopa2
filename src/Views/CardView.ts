import Card, { CardId } from "../Game/Card";

class CardView extends Phaser.GameObjects.Container {
  private cardSprite: Phaser.GameObjects.Sprite;
  private cardbackSprite: Phaser.GameObjects.Sprite;
  private cardParent: Phaser.GameObjects.Container;

  card: Card;
  flipTween: Phaser.Tweens.TweenChain | null = null;
  private isFlipped = false;
  private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private targetScale: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 1);
  private sizeScaler = 1;
  constructor(scene: Phaser.Scene, card: Card) {
    super(scene);
    this.card = card;
    this.cardParent = this.scene.add.container();
    this.add(this.cardParent);
    this.cardSprite = this.scene.add
      .sprite(0, 0, Card.GetTextureName(card))
      .setOrigin(0.5, 0.5)
      .setScale(3);

    this.cardbackSprite = this.scene.add
      .sprite(0, 0, "marioCardback")
      .setScale(0.04);
    this.cardParent.add([this.cardSprite, this.cardbackSprite]);
    this.cardbackSprite.alpha = 0;
    this.setInteractive(
      this.cardSprite.getBounds(),
      Phaser.Geom.Rectangle.Contains
    );
  }
  SetTargetScale(x: number, y: number) {
    this.targetScale.set(x, y);
  }
  GetTargetScale() {
    return this.targetScale;
  }
  SetTargetPosition(x: number, y: number) {
    this.targetPosition.set(x, y);
  }
  GetTargetPos() {
    return this.targetPosition;
  }
  Flip(forceFlip?: boolean) {
    if (this.isFlipped == forceFlip) {
      console.log("anim skipped");
      return;
    }
    this.isFlipped = forceFlip || !this.isFlipped;
    if (this.flipTween) {
      this.flipTween.stop();
    }

    this.flipTween = this.scene.tweens.chain({
      targets: this.cardParent,
      tweens: [
        {
          scaleX: 0,
          duration: 3000,
          ease: Phaser.Math.Easing.Linear,
          onComplete: () => {
            this.cardSprite.setTexture(
              this.isFlipped ? "cardBack" : Card.GetTextureName(this.card)
            );
            // this.cardbackSprite.alpha = this.isFlipped ? 1 : 0;
            // this.cardSprite.alpha = this.isFlipped ? 0 : 1;
          },
        },
        {
          scaleX: 1,
          duration: 3000,

          ease: Phaser.Math.Easing.Linear,
        },
      ],
    });
  }
  AnimateToTargetScale() {
    this.scene.add.tween({
      targets: this,
      scaleX: this.targetScale.x,
      scaleY: this.targetScale.y,
      duration: 400,
      ease: Phaser.Math.Easing.Back.Out,
    });
    // this.setPosition(this.targetPosition.x, this.targetPosition.y);
  }
  AnimateToTargetPos() {
    return this.scene.add.tween({
      targets: this,
      x: this.targetPosition.x,
      y: this.targetPosition.y,
      angle: 0,
      duration: 400,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }
  id() {
    return this.card.id();
  }
}

export default CardView;
