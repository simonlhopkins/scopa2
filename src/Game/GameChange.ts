import Card from "./Card";
import { ZonePosition } from "./CardZone";

// should be used for UI transitions as well
class GameChange {
  private cardMoves: CardMove[] = [];
  playerTurn: number;
  constructor(_playerTurn: number) {
    this.playerTurn = _playerTurn;
  }

  public AddMove(move: CardMove) {
    this.cardMoves.push(move);
  }
  public AddMoves(moves: CardMove[]) {
    this.cardMoves = this.cardMoves.concat(moves);
  }
  public GetMoves() {
    return this.cardMoves;
  }
  public Append(gameChange: GameChange) {
    this.cardMoves = this.cardMoves.concat(gameChange.GetMoves());
  }
  Reverse() {
    const reversedGameChange = new GameChange(this.playerTurn);
    const reversedMoves = [...this.GetMoves()].reverse();
    for (const move of reversedMoves) {
      const reversedMove = new CardMove(
        move.card,
        move.toPosition,
        move.fromPosition
      );

      reversedGameChange.AddMove(reversedMove);
    }
    return reversedGameChange;
  }
  toString(): string {
    let str = "GAME CHANGE:\n";
    str += `Player turn ${this.playerTurn}\n`;
    str += this.cardMoves
      .map(
        (cardMove, i) =>
          `\t${i}. ${cardMove.card.toString()} moved from ${cardMove.fromPosition!.toString()} to ${cardMove.toPosition!.toString()}\n`
      )
      .join("");
    return str;
  }
}
export class CardMove {
  card: Card;
  fromPosition: ZonePosition;
  toPosition: ZonePosition;
  constructor(
    _card: Card,
    _fromPosition: ZonePosition,
    _toPosition: ZonePosition
  ) {
    this.card = _card;
    this.toPosition = _toPosition;
    this.fromPosition = _fromPosition;
  }
}

export default GameChange;
