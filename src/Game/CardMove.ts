import Card from "./Card.ts";
import {ZonePosition} from "./CardZone.ts";
import AnimationContext from "../Animation/AnimationContext.ts";
 class CardMove {
    card: Card;
    fromPosition: ZonePosition;
    toPosition: ZonePosition;
    animationContext: CardMoveAnimationContext = new CardMoveAnimationContext();
    constructor(
        _card: Card,
        _fromPosition: ZonePosition,
        _toPosition: ZonePosition
    ) {
        this.card = _card;
        this.toPosition = _toPosition;
        this.fromPosition = _fromPosition;
    }
    public Equals(other: CardMove): boolean {
        return this.card.Equals(other.card) &&
            this.fromPosition.Equals(other.fromPosition) &&
            this.toPosition.Equals(other.toPosition);
    }
    reverse():CardMove{
        const cardmove = new CardMove(
            this.card,
            this.toPosition,
            this.fromPosition
        );
        return cardmove;
    }
}

class CardMoveAnimationContext{
    instant: boolean = false;
    scopaAnimation: boolean = false;
} 
export {CardMoveAnimationContext};
export default CardMove;