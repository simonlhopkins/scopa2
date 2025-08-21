import {CardZoneID, ZonePosition} from "../Game/CardZone";
import CardView from "./CardView";
import ICardZoneView from "./ICardZoneView";
import {Suit} from "../Game/Card.ts";
import P = Phaser.Input.Keyboard.KeyCodes.P;

class EndGameCardZoneView extends Phaser.GameObjects.Container implements ICardZoneView {
  zonePosition: ZonePosition;
  cardViewMap: Map<number, CardView[]> = new Map();
  constructor(scene: Phaser.Scene) {
    super(scene);
    this.zonePosition = new ZonePosition(CardZoneID.END_GAME, 0);
    
  }
  Reset() {
    // this.cardViewMap.clear();
    // this.removeAll(true);
  }
  GetPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }
  AddCardView(cardView: CardView): void {
    const zoneId = cardView.card.currentZone.index;
    if(!this.cardViewMap.has(zoneId)) {
      this.cardViewMap.set(zoneId, []);
    }
    this.cardViewMap.get(zoneId)!.push(cardView);
    for(let i = 0; i < this.cardViewMap.get(zoneId)!.length; i++){
      this.cardViewMap.get(zoneId)![i].SetTargetPosition(this.x - 200 + i * 35, this.y - 200 + zoneId * 150);
    }
  }
  RemoveCardView(cardView: CardView): void {
    // const zoneId = cardView.card.currentZone.index;
    
    for(const [index, cardViews] of this.cardViewMap){
      if(cardViews.some((card) => card.card.Equals(cardView.card))) {
        this.cardViewMap.set(
            index,
            this.cardViewMap.get(index)!.filter((card) => !card.card.Equals(cardView.card))
        );
        break;
      }
    }
  }
  
}

export default EndGameCardZoneView;
