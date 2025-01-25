import { ZonePosition } from "../Game/CardZone";
import ICardZoneView from "./ICardZoneView";

const Vector2 = Phaser.Math.Vector2;
class HandView extends Phaser.GameObjects.Container implements ICardZoneView {
  numCards = 0;
  cardTweenMap: Map<string, Phaser.Tweens.Tween> = new Map();
  zonePosition: ZonePosition;
  constructor(scene: Phaser.Scene, zonePosition: ZonePosition) {
    super(scene);
    this.zonePosition = zonePosition;
  }

  OnCardAdded(cardID: string) {
    this.numCards++;
  }
  GetCardPosition(cardID: string) {
    //I need to query the index of the added card
    return new Phaser.Math.Vector2(this.x + this.numCards * 20, this.y);
  }
  GetPosition() {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
  OnCardRemoved(cardId: string): void {
    console.log("card removed: " + cardId);

    this.numCards--;
  }
}

export default HandView;
