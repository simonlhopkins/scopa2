import Card, { CardId } from "./Card";
import { CardMove } from "./GameChange";

export enum CardZoneID {
  DECK,
  HAND,
  PILE,
  TABLE,
}

export class ZonePosition {
  id: CardZoneID;
  index: number;
  constructor(_id: CardZoneID, _index: number) {
    this.id = _id;
    this.index = _index;
  }
  toString(): string {
    return `${ZonePosition.getCardZoneIDAsString(this.id)} #${this.index}`;
  }
  Equals(other: ZonePosition) {
    return this.id == other.id && this.index == other.index;
  }
  static getCardZoneIDAsString(id: CardZoneID) {
    switch (id) {
      case CardZoneID.DECK:
        return "deck";
      case CardZoneID.HAND:
        return "hand";
      case CardZoneID.PILE:
        return "pile";
      case CardZoneID.TABLE:
        return "table";
    }
  }
}

class CardZone {
  zonePosition: ZonePosition;
  private cards: Card[];

  constructor(_position: ZonePosition, _cards: Card[]) {
    this.zonePosition = _position;
    this.cards = _cards;
  }

  public GetCards() {
    return this.cards;
  }
  public GetIndexOfCard(cardId: string) {
    const index = this.cards.findIndex((card) => card.id() == cardId);
    return index < 0 ? null : index;
  }
  TakeTop(): Card | null {
    const cardPopped = this.cards.pop();
    if (cardPopped == undefined) {
      return null;
    }
    return cardPopped;
  }
  TakeCard(card: Card): Card | null {
    const foundCard = this.cards.find(
      (item) => item.rank == card.rank && item.suit == card.suit
    );
    if (foundCard == undefined) {
      return null;
    }
    this.cards = this.cards.filter((item) => item != foundCard);
    return foundCard;
  }
  PushTop(card: Card): CardMove {
    const cardMove = new CardMove(card, card.currentZone, this.zonePosition);
    card.currentZone = this.zonePosition;
    this.cards.push(card);
    return cardMove;
  }
  BringToTop(cardId: CardId): void {
    const index = this.cards.findIndex((card) => card.id() == cardId);
    if (index > -1) {
      const cardRemoved = this.cards.splice(index, 1); // Remove the item from its current position
      this.cards.unshift(cardRemoved[0]); // Add it to the beginning of the array
    } else {
      console.warn(
        `cannot bring to top ${cardId} because it was not in the cardZone ${this.zonePosition.toString()}`
      );
    }
  }
  Shuffle() {
    Phaser.Utils.Array.Shuffle(this.cards);
  }
}

export default CardZone;
