import Card from "../Game/Card";
import {Orientation} from "../Game/CardFlip.ts";
import AnimationHelpers from "../Animation/AnimationHelpers.ts";

class CardView extends Phaser.GameObjects.Container {
  private cardSprite: Phaser.GameObjects.Sprite;
  card: Card;
  flipTween: Phaser.Tweens.TweenChain | null = null;
  private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private targetScale: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 1);
  private sizeScaler = 1;
  constructor(scene: Phaser.Scene, card: Card) {
    super(scene);
    this.card = card;
    this.cardSprite = this.scene.add
      .sprite(0, 0, Card.GetTextureName(card))
      .setOrigin(0.5, 0.5)
      .setScale(3);
    this.add(this.cardSprite);

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
  
  public DoFlipAnimation(toOrientation: Orientation) {
    if (this.flipTween) {
      console.log(this.flipTween)
      AnimationHelpers.ForceFinishTween(this.flipTween);
      this.flipTween = null;
    }
    this.flipTween = this.scene.tweens.chain({
      targets: this.cardSprite,
      onComplete: () => {
        this.flipTween = null
      },
      tweens: [
        {
          scaleX: 0,
          duration: 100,
          ease: Phaser.Math.Easing.Linear,
          onComplete: () => {
            this.cardSprite.setTexture(
                toOrientation==Orientation.Down ? "cardBack" : Card.GetTextureName(this.card)
            );
          },
        },
        {
          scaleX: 3,
          duration: 100,
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
    this.scene.add.tween({
      targets: this,
      x: this.targetPosition.x,
      y: this.targetPosition.y,
      angle: 0,
      duration: 400,
      ease: Phaser.Math.Easing.Back.Out,
    });
    // this.setPosition(this.targetPosition.x, this.targetPosition.y);
  }
  id() {
    return this.card.id();
  }
}

export default CardView;
