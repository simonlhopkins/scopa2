import Card from "./Card";
import { ZonePosition } from "./CardZone";
import { ScoopResult } from "./GameState";
import CardMove from "./CardMove.ts";
import CardFlip from "./CardFlip.ts";

// should be used for UI transitions as well
class GameChange {
  private cardMoves: CardMove[] = [];
  private cardFlips: CardFlip[] = [];
  playerTurn: number;
  fromPlayer: number;
  toPlayer: number;
  scoopResults: ScoopResult[] = [];
  constructor(_playerTurn: number, _fromPlayer: number, _toPlayer: number) {
    this.playerTurn = _playerTurn;
    this.fromPlayer = _fromPlayer;
    this.toPlayer = _toPlayer;
  }
  public AddScoopResult(scoopResult: ScoopResult) {
    this.scoopResults.push(scoopResult);
  }
  public AddMove(move: CardMove) {
    this.cardMoves.push(move);
  }
  public AddFlip(flip: CardFlip) {
    this.cardFlips.push(flip);
  }
  public AddFlips(flip: CardFlip[]) {
    this.cardFlips = this.cardFlips.concat(flip);
  }
  public AddMoves(moves: CardMove[]) {
    this.cardMoves = this.cardMoves.concat(moves);
  }
  public GetMoves() {
    return this.cardMoves;
  }
  public GetFlips() {
    return this.cardFlips;
  }
  public GetCardViews(){
    return this.cardMoves.map((move) => move.card);
  }
  public GetCardIds(){
    return this.cardMoves.map((move) => move.card.id());
  }
  public Append(gameChange: GameChange) {
    this.cardMoves = this.cardMoves.concat(gameChange.GetMoves());
    this.cardFlips = this.cardFlips.concat(gameChange.GetFlips());
    return this;
  }
  public Copy() {
    const ret = new GameChange(this.playerTurn, this.fromPlayer, this.toPlayer);
    ret.AddMoves(this.GetMoves());
    ret.AddFlips(this.GetFlips());
    return ret;
  }
  Reverse() {
    const reversedGameChange = new GameChange(
      this.fromPlayer,
      this.toPlayer,
      this.fromPlayer
    );
    const reversedMoves = [...this.GetMoves()].reverse();
    const reversedFlips = [...this.GetFlips()].reverse();
    for (const move of reversedMoves) {
      reversedGameChange.AddMove(move.reverse());
    }
    for (const flip of reversedFlips) {
      const reversedFlip = new CardFlip(
        flip.card,
        flip.toOrientation,
        flip.fromOrientation
      );
      reversedGameChange.AddFlip(reversedFlip);
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
    str += this.cardFlips
        .map(
            (cardFlip, i) =>
            `\t${i + 1}. ${cardFlip.card.toString()} flipped from ${cardFlip.fromOrientation} to ${cardFlip.toOrientation}\n`
        )
        .join("");
    return str;
  }
}


export default GameChange;
