import { ZonePosition } from "../Game/CardZone";
import CardView from "./CardView";

export default interface ICardZoneView {
  zonePosition: ZonePosition;

  AddCardView(cardView: CardView): void;
  RemoveCardView(cardView: CardView): void;
  GetPosition(): Phaser.Math.Vector2;
}
