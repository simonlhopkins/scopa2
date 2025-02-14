import Card from "./Card";
import { ZonePosition } from "./CardZone";
import { ScoopResult } from "./GameState";

// should be used for UI transitions as well
class GameChange {
  private cardMoves: CardMove[] = [];
  playerTurn: number;
  fromPlayer: number;
  toPlayer: number;
  isNewGame: boolean;
  scoopResults: ScoopResult[] = [];
  constructor(
    _playerTurn: number,
    _fromPlayer: number,
    _toPlayer: number,
    isNewGame?: boolean
  ) {
    this.playerTurn = _playerTurn;
    this.fromPlayer = _fromPlayer;
    this.toPlayer = _toPlayer;
    this.isNewGame = isNewGame ?? false;
  }
  public AddScoopResult(scoopResult: ScoopResult) {
    this.scoopResults.push(scoopResult);
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
    return this;
  }
  public Copy() {
    const ret = new GameChange(this.playerTurn, this.fromPlayer, this.toPlayer);
    ret.AddMoves(this.GetMoves());
    return ret;
  }
  Reverse() {
    const reversedGameChange = new GameChange(
      this.fromPlayer,
      this.toPlayer,
      this.fromPlayer
    );
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
    str += `from player ${this.fromPlayer}\n`;
    str += `to player ${this.toPlayer}\n`;
    str += this.cardMoves
      .map(
        (cardMove, i) =>
          `\t${
            i + 1
          }. ${cardMove.card.toString()} moved from ${cardMove.fromPosition!.toString()} to ${cardMove.toPosition!.toString()}\n`
      )
      .join("");
    return str;
  }
}
export class CardMove {
  card: Card;
  fromPosition: ZonePosition;
  toPosition: ZonePosition;
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
}

export default GameChange;
