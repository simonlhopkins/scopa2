import Card from "./Card.ts";
import {ZonePosition} from "./CardZone.ts";
 class CardMove {
    card: Card;
    fromPosition: ZonePosition;
    toPosition: ZonePosition;
    private isFaceDown: boolean = false;
    isScopa: boolean = false;
    constructor(
        _card: Card,
        _fromPosition: ZonePosition,
        _toPosition: ZonePosition
    ) {
        this.card = _card;
        this.toPosition = _toPosition;
        this.fromPosition = _fromPosition;
    }
    setScopa(isScopa: boolean) {
        this.isScopa = isScopa;
    }
    flipFaceDown():CardMove {
        const cardMove = new CardMove(this.card, this.fromPosition, this.toPosition);
        cardMove.isFaceDown = true;
        return cardMove;
    }
    flipFaceUp():CardMove {
        console.log("flipping card face up", this.card.id());
        const cardMove = new CardMove(this.card, this.fromPosition, this.toPosition);
        cardMove.isFaceDown = false;
        return cardMove;
    }
    getIsFaceDown(): boolean {
        return this.isFaceDown;
    }
}

export default CardMove;