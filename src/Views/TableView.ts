import { CardZoneID, ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";

class TableView extends Phaser.GameObjects.Container implements ICardZoneView {
  private slopMap = new Map<number, string>();
  public dropZone: Phaser.GameObjects.Zone;
  zonePosition: ZonePosition;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.zonePosition = new ZonePosition(CardZoneID.TABLE, 0);
    this.dropZone = this.scene.add
      .zone(0, 0, 400, 400)
      .setInteractive({ dropZone: true });
    // .setRectangleDropZone(100, 100);

    this.add(this.dropZone);
    const debugRect = this.scene.add
      .rectangle(0, 0, this.dropZone.width, this.dropZone.height)
      .setStrokeStyle(5, 0xff0000);
    this.add(debugRect);
  }
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
  AddCardView(cardView: CardView): void {
    let spotNum = 0;
    while (this.slopMap.has(spotNum)) {
      spotNum++;
    }
    this.slopMap.set(spotNum, cardView.card.id());

    const offsetX = (spotNum % 2) * 150;
    const offsetY = Math.floor(spotNum / 2) * 60;
    cardView.SetTargetPosition(this.x + offsetX - 70, this.y + offsetY - 80);
    // cardView.setDepth(spotNum);
  }
  RemoveCardView(cardView: CardView): void {
    for (let [key, value] of this.slopMap) {
      if (value === cardView.card.id()) {
        this.slopMap.delete(key);
      }
    }
  }
}

export default TableView;
