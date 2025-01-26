import { ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";

class DeckView extends Phaser.GameObjects.Container implements ICardZoneView {
  zonePosition: ZonePosition;

  constructor(scene: Phaser.Scene, zonePosition: ZonePosition) {
    super(scene);
    this.zonePosition = zonePosition;
  }
  AddCardView(cardView: CardView): void {
    //maybe I can do a set target position here?? and then I can animate it independently
    cardView.SetTargetPosition(this.x, this.y);
  }
  RemoveCardView(cardView: CardView): void {}
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
}

export default DeckView;
