import { CardZoneID, ZonePosition } from "../Game/CardZone";
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
  OnCardAdded(cardID: string) {}
  GetCardPosition(cardID: string) {
    //use slotmap
    let spotNum = 0;
    while (this.slopMap.has(spotNum)) {
      spotNum++;
    }
    this.slopMap.set(spotNum, cardID);
    const targetX = this.x + (spotNum % 2) * 100;
    const targetY = this.y + Math.floor(spotNum / 2) * 60;
    return new Phaser.Math.Vector2(targetX, targetY);
  }
  GetPosition() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  OnCardRemoved(cardId: string): void {
    for (let [key, value] of this.slopMap) {
      if (value === cardId) {
        this.slopMap.delete(key);
      }
    }
  }
}

export default TableView;
