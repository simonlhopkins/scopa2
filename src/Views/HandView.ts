import { CardId } from "../Game/Card";
import { ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";

class HandView extends Phaser.GameObjects.Container implements ICardZoneView {
  numCards = 0;
  zonePosition: ZonePosition;
  private isScaledUp = false;
  private cardViews: CardView[] = [];
  constructor(scene: Phaser.Scene, zonePosition: ZonePosition) {
    super(scene);
    this.zonePosition = zonePosition;
  }
  GetNumCards() {
    return this.cardViews.length;
  }
  AddCardView(cardView: CardView): void {
    this.cardViews.push(cardView);
    this.setCardTargetPositions();
    //animate other cards to make room
  }
  RemoveCardView(cardView: CardView): void {
    this.cardViews = this.cardViews.filter(
      (item) => item.id() != cardView.id()
    );
    this.setCardTargetPositions();
  }
  private setCardTargetPositions() {
    for (let i = 0; i < this.cardViews.length; i++) {
      this.cardViews[i].SetTargetPosition(this.x + i * 40, this.y);
    }
  }
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
  GetCardViews() {
    return this.cardViews;
  }

  ScaleUp(delay: number) {
    this.cardViews.forEach((cardView) => {
      cardView.SetTargetScale(1.5, 1.5);
    });
  }
  ScaleDown() {
    this.cardViews.forEach((cardView) => {
      cardView.SetTargetScale(1, 1);
    });
  }
}

export default HandView;
