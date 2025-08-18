import { ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";

class PileView extends Phaser.GameObjects.Container implements ICardZoneView {
  zonePosition: ZonePosition;
  AddCardView(cardView: CardView): void {
    cardView.SetTargetPosition(this.x, this.y);
  }
  RemoveCardView(cardView: CardView): void {}
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
  
}

export default PileView;
