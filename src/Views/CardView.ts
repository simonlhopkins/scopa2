import Card, { CardId } from "../Game/Card";

class CardView extends Phaser.GameObjects.Container {
  private cardSprite: Phaser.GameObjects.Sprite;
  card: Card;
  private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  constructor(scene: Phaser.Scene, card: Card) {
    super(scene);
    this.card = card;
    const textureName = Card.GetTextureName(card);
    this.cardSprite = this.scene.add
      .sprite(0, 0, textureName)
      .setOrigin(0.5, 0.5)
      .setScale(3);
    this.add(this.cardSprite);

    this.setInteractive(
      this.cardSprite.getBounds(),
      Phaser.Geom.Rectangle.Contains
    );
  }
  SetTargetPosition(x: number, y: number) {
    this.targetPosition.set(x, y);
  }
  GetTargetPos() {
    return this.targetPosition;
  }
  UpdatePos() {
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
