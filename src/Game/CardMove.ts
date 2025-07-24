import Card from "./Card.ts";
import {ZonePosition} from "./CardZone.ts";
import AnimationContext from "../Animation/AnimationContext.ts";
 class CardMove {
    card: Card;
    fromPosition: ZonePosition;
    toPosition: ZonePosition;
    isScopa: boolean = false;
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
    reverse():CardMove{
        const cardmove = new CardMove(
            this.card,
            this.toPosition,
            this.fromPosition
        );
        cardmove.setScopa(this.isScopa);
        return cardmove;
    }
    setScopa(isScopa: boolean) {
        this.isScopa = isScopa;
    }
}

class CardMoveAnimationContext{
    instant: boolean = false;
} 
export {CardMoveAnimationContext};
export default CardMove;