import { CardId } from "../Game/Card";
import { ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";

const Vector2 = Phaser.Math.Vector2;
class HandView extends Phaser.GameObjects.Container implements ICardZoneView {
  numCards = 0;
  zonePosition: ZonePosition;
  private cardViews: CardView[] = [];
  constructor(scene: Phaser.Scene, zonePosition: ZonePosition) {
    super(scene);
    this.zonePosition = zonePosition;
  }
  AddCardView(cardView: CardView): void {
    this.cardViews.push(cardView);
    this.setCardTargetPositions();
  }
  RemoveCardView(cardView: CardView): void {
    this.cardViews = this.cardViews.filter(
      (item) => item.id() != cardView.id()
    );
    this.setCardTargetPositions();
  }
  private setCardTargetPositions() {
    for (let i = 0; i < this.cardViews.length; i++) {
      this.cardViews[i].SetTargetPosition(this.x + i * 50, this.y);
      this.cardViews[i].setDepth(i);
    }
  }
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}

export default HandView;
