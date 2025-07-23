import Card from "./Card.ts";

class CardFlipAnimationContext{
    flipAtEnd: boolean = false;
}
class CardFlip{
    card:Card;
    fromOrientation:Orientation;
    toOrientation:Orientation;
    animationContext:CardFlipAnimationContext = new CardFlipAnimationContext();
    constructor(
        _card:Card,
        _fromOrientation: Orientation,
        _toOrientation: Orientation,
    ) {
        this.card = _card;
        this.fromOrientation = _fromOrientation;
        this.toOrientation = _toOrientation;
    }
    toString(): string {
        return `CardFlip(${this.card.id()}, ${this.fromOrientation}, ${this.toOrientation})`;
    }
    
}
enum Orientation{
    Up = "UP",
    Down = "DOWN"
}
export {CardFlipAnimationContext, Orientation};
export default CardFlip;