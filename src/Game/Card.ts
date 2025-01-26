import { ZonePosition } from "./CardZone";

export enum Suit {
  SWORD,
  CUP,
  COIN,
  CLUB,
}
export type CardId = string & { __brand: "CARD_ID" };

class Card {
  suit: Suit;
  rank: number;
  currentZone: ZonePosition;
  constructor(_suit: Suit, _rank: number) {
    this.suit = _suit;
    this.rank = _rank;
  }
  public static GetTextureName(card: Card) {
    let suitName = "";
    switch (card.suit) {
      case Suit.CLUB:
        suitName = "Clubs";
        break;
      case Suit.COIN:
        suitName = "Diamonds";
        break;
      case Suit.CUP:
        suitName = "Spades";
        break;
      case Suit.SWORD:
        suitName = "Hearts";
        break;
    }

    let rankName = "";
    if (card.rank == 1) {
      rankName = "ACE";
    } else if (card.rank <= 7) {
      rankName = card.rank.toString();
    } else if (card.rank <= 10) {
      rankName = ["J", "Q", "K"][card.rank - 8];
    } else {
      console.error("invalid rank entered: " + card.rank);
    }
    return `${suitName}_${rankName}`;
  }
  toString(): string {
    return `[${this.rank}${this.getSuitSymbol()}]`;
  }
  Equals(card: Card) {
    return this.id() == card.id();
  }
  id(): CardId {
    return `${this.suit}:${this.rank}` as CardId;
  }

  private getSuitSymbol() {
    switch (this.suit) {
      case Suit.CLUB:
        return "𓍛";
      case Suit.SWORD:
        return "⚔";
      case Suit.COIN:
        return "¢";
      case Suit.CUP:
        return "𓎺";
    }
  }
}

export default Card;
