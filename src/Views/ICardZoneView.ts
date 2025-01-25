import { ZonePosition } from "../Game/CardZone";

export default interface ICardZoneView {
  zonePosition: ZonePosition;

  OnCardAdded(cardID: string): void;
  OnCardRemoved(cardId: string): void;
  GetCardPosition(cardID: string): Phaser.Math.Vector2;
  GetPosition(): Phaser.Math.Vector2;
}
