import serializeJavascript from "serialize-javascript";
import Card, { CardId, Suit } from "./Card";
import CardZone, { CardZoneID, ZonePosition } from "./CardZone";
import GameChange from "./GameChange";
import Util from "../Util";
import CardMove from "./CardMove.ts";
import CardFlip, {CardFlipAnimationContext} from "./CardFlip.ts";
import AnimationContext from "../Animation/AnimationContext.ts";

export interface ScoopResult {
  handCard: Card;
  tableCards: Card[];
}

class GameState {
  deck: CardZone = new CardZone(new ZonePosition(CardZoneID.DECK, 0), []);
  table: CardZone = new CardZone(new ZonePosition(CardZoneID.TABLE, 0), []);
  playerHands: Map<number, CardZone> = new Map();
  playerPiles: Map<number, CardZone> = new Map();
  private playerTurn: number = 0;
  numPlayers = 4;
  constructor() {
    for (let i = 1; i <= 10; i++) {
      this.deck.PushTop(new Card(Suit.CLUB, i));
      this.deck.PushTop(new Card(Suit.COIN, i));
      this.deck.PushTop(new Card(Suit.SWORD, i));
      this.deck.PushTop(new Card(Suit.CUP, i));
    }
    this.deck.Shuffle();
    //TODO: obviously we're not doing this... unless
    for (let i = 0; i < this.numPlayers; i++) {
      this.playerHands.set(
        i,
        new CardZone(new ZonePosition(CardZoneID.HAND, i), [])
      );
      this.playerPiles.set(
        i,
        new CardZone(new ZonePosition(CardZoneID.PILE, i), [])
      );
    }
  }
  ResetPlayerTurn() {
    this.playerTurn = 0;
  }
  GetPlayerTurn(): number {
    return this.playerTurn;
  }

  ReturnCardToStartingLocation(card: Card): GameChange {
    const gameChange = new GameChange(
      this.playerTurn,
      this.playerTurn,
      this.playerTurn
    );
    const cardMove = new CardMove(card, card.currentZone, card.currentZone);
    gameChange.AddMove(cardMove);
    return gameChange;
  }
  IsGameOver() {
    return (
      this.deck.GetCards().length == 0 &&
      [...this.playerHands].every(
        ([id, cardZone]) => cardZone.GetCards().length == 0
      )
    );
  }
  //todo: do some validation, and if it fails then set a new game
  loadFromJson(gameStateJson: GameStateJson): GameChange {
    this.playerTurn = gameStateJson.playerTurn;
    const initChange = new GameChange(
      gameStateJson.playerTurn,
      gameStateJson.playerTurn,
      gameStateJson.playerTurn
    );
    initChange.Append(this.MoveAllCardsToDeck());
    //everything should be in the deck at this point
    for (const { id, cards } of gameStateJson.hands) {
      const cardMoves = cards.map((card) =>
        this.GetCardZoneFromPosition(
          new ZonePosition(CardZoneID.HAND, id)
        )!.PushTop(this.deck.TakeCard(this.GetCardFromId(card)!)!)
      );
      const flips = cardMoves.map((move) => id == 0?move.card.flipFaceUp():move.card.flipFaceDown());
      initChange.AddMoves(cardMoves);
      initChange.AddFlips(flips);
    }
    for (const { id, cards } of gameStateJson.piles) {
      const cardMoves = cards.map((card) =>
        this.GetCardZoneFromPosition(
          new ZonePosition(CardZoneID.PILE, id)
        )!.PushTop(this.deck.TakeCard(this.GetCardFromId(card)!)!)
      );
      const flips = cardMoves.map((move) => move.card.flipFaceDown());
      initChange.AddFlips(flips);
      initChange.AddMoves(cardMoves);
    }

    const deckToTableMoves = gameStateJson.table.map((card) =>
      this.GetCardZoneFromPosition(
        new ZonePosition(CardZoneID.TABLE, 0)
      )!.PushTop(this.deck.TakeCard(this.GetCardFromId(card)!)!)
    );
    
    for (const cardId of [...gameStateJson.deck].reverse()) {
      this.deck.BringToTop(cardId);
    }
    initChange.AddMoves(deckToTableMoves);
    initChange.AddFlips(deckToTableMoves.map(move=>move.card.flipFaceUp()))
    initChange.GetMoves().forEach(item=>{
      item.animationContext.instant = true;
    });
    return initChange;
  }
  MoveTableCardsToPlayerPile(playerNum: number) : GameChange {
    const gameChange = new GameChange(
      this.playerTurn,
      this.playerTurn,
      this.playerTurn
    );
    const playerPile = this.GetCardZoneFromPosition(
      new ZonePosition(CardZoneID.PILE, playerNum)
    )!;

    for (const card of this.table.GetCards()) {
      const move = playerPile.PushTop(this.table.TakeCard(card)!);
      gameChange.AddMove(move);
    }
    return gameChange;
  }
  MoveAllCardsToDeck(): GameChange {
    const gameChange = new GameChange(
      this.playerTurn,
      this.playerTurn,
      this.playerTurn
    );
    
    const backToDeck = this.GetCardIds().map((cardID) =>
      this.deck.PushTop(
        this.GetCardZoneFromPosition(
          this.GetCardFromId(cardID)!.currentZone
        )!.TakeCard(this.GetCardFromId(cardID)!)!
      )
    )
    gameChange.AddFlips(backToDeck.map(move=>move.card.flipFaceDown()));
    gameChange.AddMoves(backToDeck);
    return gameChange;
  }

  toJson(): GameStateJson {
    const hands = [...this.playerHands].map(([id, cardZone]) => ({
      id,
      cards: cardZone.GetCards().map((card) => card.id()),
    }));
    const piles = [...this.playerPiles].map(([id, cardZone]) => ({
      id,
      cards: cardZone.GetCards().map((card) => card.id()),
    }));

    const table = this.table.GetCards().map((card) => card.id());
    const deck = this.deck.GetCards().map((card) => card.id());
    return {
      hands,
      piles,
      table,
      deck,
      playerTurn: this.playerTurn,
    };
  }
  public GetCardZones(): CardZone[] {
    return [this.deck, this.table]
      .concat(Array.from(this.playerHands.values()))
      .concat(Array.from(this.playerPiles.values()));
  }
  private GetCardFromSuitRank(suit: Suit, rank: number) {
    return this.GetCardFromId(new Card(suit, rank).id());
  }
  public GetCardFromId(id: CardId): Card | null {
    for (const zone of this.GetCardZones()) {
      for (const card of zone.GetCards()) {
        if (id == card.id()) {
          return card;
        }
      }
    }
    console.error(`${id} not found!! something went wrong`);
    return null;
  }
  public GetCardIds(): CardId[] {
    return this.GetCardZones().flatMap((item) =>
      item.GetCards().map((item) => item.id())
    );
  }

  public GetCardStackOfCard(cardId: CardId): Card[] | null {
    const cardStack = this.GetCardZones()
      .map((zone) => zone.GetCards())
      .find((cards) => cards.some((card) => card.id() == cardId));
    return cardStack || null;
  }

  public InitialTableCards(): GameChange {
    const gameChange = new GameChange(
      this.playerTurn,
      this.playerTurn,
      this.playerTurn
    );

    for (let i = 0; i < 4; i++) {
      const card = this.deck.TakeTop();
      if (card) {
        gameChange.AddFlip(card.flipFaceUp())
        gameChange.AddMove(this.table.PushTop(card));
      }
    }
    return gameChange;
  }
  public DealCards(): GameChange {
    const gameChange = new GameChange(this.playerTurn, this.playerTurn, 0);
    this.playerTurn = 0;
    for (let i = 0; i < 3; i++) {
      //TODO maybe a helper method to check if this is even possible
      for (let [playerNum, hand] of this.playerHands) {
        const card = this.deck.TakeTop();
        if (card && hand.GetCards().length<3) {
          const move = hand.PushTop(card);
          if(playerNum ==0){
            gameChange.AddFlip(card.flipFaceUp());
          }else{
            gameChange.AddFlip(card.flipFaceDown());
          }
          gameChange.AddMove(move);
        }
      }
    }
    return gameChange;
  }

  public GetPossibleScoops(hand: Card[]): ScoopResult[] {
    let ret: ScoopResult[] = [];
    const allPossibilities = Util.getAllUniqueCombinations(
      this.table.GetCards()
    );
    for (const handCard of hand) {
      let possibleScoopsWithCard: ScoopResult[] = allPossibilities
        .filter(
          (cards) =>
            cards.reduce(
              (accumulator, currentValue) => accumulator + currentValue.rank,
              0
            ) == handCard.rank
        )
        .map((cards) => ({
          handCard,
          tableCards: cards,
        }));
      // if there is a single card w the same rank, you must scoop that one
      if (possibleScoopsWithCard.some((item) => item.tableCards.length == 1)) {
        possibleScoopsWithCard = possibleScoopsWithCard.filter(
          (scoopResult) => scoopResult.tableCards.length == 1
        );
      }

      ret = ret.concat(possibleScoopsWithCard);
    }
    return ret;
  }

  public GetCardZoneFromPosition(zonePosition: ZonePosition): CardZone | null {
    return (
      this.GetCardZones().find((zone) =>
        zone.zonePosition.Equals(zonePosition)
      ) || null
    );
  }

  //updates the state given some card moves.
  ApplyChange(gameChange: GameChange) {
    for (const move of gameChange.GetMoves()) {
      const fromZone = this.GetCardZoneFromPosition(move.fromPosition)!;
      const toZone = this.GetCardZoneFromPosition(move.toPosition)!;
      toZone.PushTop(fromZone.TakeCard(move.card)!);
    }
    for(const flips of gameChange.GetFlips()){
        const card = this.GetCardFromId(flips.card.id())!;
        card.orientation = flips.toOrientation;
    }
    
    this.playerTurn = gameChange.toPlayer;
  }
  //nice!!
  //this is more like a resolve card move, where it goes through ALL of the possible rules of scopa and lets us know if it would result in a game change or not.
  MoveCard(cardId: CardId, zonePosition: ZonePosition): GameChange | null {
    const card = this.GetCardFromId(cardId);
    if (card) {
      const fromZone = this.GetCardZoneFromPosition(card.currentZone);
      const toZone = this.GetCardZoneFromPosition(zonePosition);
      //todo, prob can move this logic to the cardzone class
      //move from hand to table, really the most important logic
      if (
        fromZone &&
        fromZone.zonePosition.id == CardZoneID.HAND &&
        toZone &&
        toZone.zonePosition.id == CardZoneID.TABLE &&
        this.playerTurn == fromZone.zonePosition.index
      ) {
        const possibleScoops = this.GetPossibleScoops([card]);
        //just need to check if the card can scoop the table
        const startPlayer = this.playerTurn;
        this.playerTurn++;
        this.playerTurn %= this.numPlayers;
        const gameChange = new GameChange(
          startPlayer,
          startPlayer,
          this.playerTurn
        );
        if (possibleScoops.length > 0) {
          //todo, establish what player is playing the card sooner so we don't have to do this
          const playerPile = this.playerPiles.get(fromZone.zonePosition.index);
          possibleScoops.sort(
            (a: ScoopResult, b: ScoopResult) =>
              b.tableCards.length - a.tableCards.length
          );
          //todo: give player option of which scoop to do if there are multiple options
          const scoopResultToPlay = possibleScoops[0];
          //table to pile cards
          for (const tableCard of scoopResultToPlay.tableCards) {
            const cardMove = playerPile!.PushTop(
              this.table.TakeCard(tableCard)!
            );
            const cardFlip = tableCard.flipFaceDown();
            cardFlip.animationContext =  new CardFlipAnimationContext();
            cardFlip.animationContext.flipAtEnd = true;
            gameChange.AddFlip(cardFlip);
            gameChange.AddMove(cardMove);
          }
          //create a card move for the card in the hand
          const handToPileCardMove = playerPile!.PushTop(
            fromZone.TakeCard(scoopResultToPlay.handCard)!
          );
          //ehh idk if I like this
          handToPileCardMove.setScopa(this.table.GetCards().length == 0);
          gameChange.AddScoopResult(scoopResultToPlay);
          gameChange.AddMove(handToPileCardMove);
          gameChange.AddFlip(card.flipFaceUp());
          const cardFlip = card.flipFaceDown();
          cardFlip.animationContext =  new CardFlipAnimationContext();
          cardFlip.animationContext.flipAtEnd = true;
          gameChange.AddFlip(cardFlip);
          
        } else {
          const cardMove = this.table.PushTop(fromZone.TakeCard(card)!);
          gameChange.AddFlip(card.flipFaceUp());
          gameChange.AddMove(cardMove);
        }
        if (
          Array.from(this.playerHands.values()).every(
            (item) => item.GetCards().length == 0
          )
        ) {
          if (this.deck.GetCards().length > 0) {
            gameChange.Append(this.DealCards());
          }
        }
        //is it true that if a card is moved from a hand to a table then the turn will always increase?
        // this.playerTurn++;
        //         this.playerTurn %= this.numPlayers;
        // this.playerTurn++;
        // this.playerTurn %= this.numPlayers;
        return gameChange;
      }
      //other to and from moves
    }
    return null;
  }

  GetBestCardToPlayForPlayer(player: number): CardId | null {
    const playerHand = this.playerHands.get(player);
    if (!playerHand || !this.playerPiles) {
      console.log(`error: no player [${player}] found`);
      return null;
    }
    const possibleScoops = this.GetPossibleScoops(playerHand.GetCards());

    if (possibleScoops.length > 0) {
      console.log("scooping...");
      const scoopResultToPlay = Phaser.Utils.Array.GetRandom(possibleScoops);
      //create a card move for each of the cards on the table
      return scoopResultToPlay.handCard.id();
    } else {
      if (playerHand.GetCards().length == 0) {
        return null;
      }
      const minRankCard = playerHand
        .GetCards()
        .reduce((minCard, currentCard) => {
          return currentCard.rank < minCard.rank ? currentCard : minCard;
        });
      return minRankCard.id();
    }
  }
  PrintCurrentState() {
    let str = "";
    str += "scopa score!\n";
    str += `Current Player turn: ${this.playerTurn}\n`;
    str += `Player Hands:\n`;
    for (const [key, value] of this.playerHands) {
      str += `\t${
        key == this.playerTurn ? `(${key})` : key
      }: ${Util.CardArrToString(value.GetCards())}\n`;
    }

    str += `table: ${Util.CardArrToString(this.table.GetCards())}\n`;
    str += `num cards on table: ${this.table.GetCards().length}\n`;
    str += `num cards in deck: ${this.deck.GetCards().length}\n`;
    console.log(str);
  }
  
  
  CalculateScores() {
    //most cards
    const playerPileArr = [...this.playerPiles].map((item) => ({
      id: item[0],
      cards: item[1].GetCards(),
    }));
    const result = new ScoreResult();
    //most cards
    const mostCards = [...playerPileArr].sort(
      (a, b) => b.cards.length - a.cards.length
    );
    if (mostCards[0].cards.length > mostCards[1].cards.length) {
      result.MostCards = mostCards[0].id;
    }
    //most coins
    const mostCoins = playerPileArr
      .map((item) => ({
        ...item,
        cards: item.cards.filter((card) => card.suit == Suit.COIN),
      }))
      .sort((a, b) => b.cards.length - a.cards.length);
    if (mostCoins[0].cards.length > mostCoins[1].cards.length) {
      result.MostCoins = mostCoins[0].id;
    }
    //primera
    const primera = playerPileArr
      .map((item) => ({
        ...item,
        cards: item.cards.filter((card) => card.rank == 7),
      }))
      .sort((a, b) => b.cards.length - a.cards.length);
    if (primera[0].cards.length > primera[1].cards.length) {
      result.Primera = primera[0].id;
    }

    const playerWithSetteBello = playerPileArr.find((item) =>
      item.cards.some((card) => card.Equals(new Card(Suit.COIN, 7)))
    );

    if (playerWithSetteBello) {
      result.Settebello = playerWithSetteBello.id;
    }
    console.log(result);
    return result;
  }
}

export class ScoreResult {
  MostCards: number | null = null;
  MostCoins: number | null = null;
  Primera: number | null = null;
  Settebello: number | null = null;

  toString() {
    let str = "";
    const getDescription = (player: number | null, desc: string) => {
      return player != null
        ? `Player ${player} had the ${desc}\n`
        : `no one had the ${desc}\n`;
    };
    str += getDescription(this.MostCards, "most cards");
    str += getDescription(this.MostCoins, "most coins");
    str += getDescription(this.Primera, "primera");
    str += getDescription(this.Settebello, "sette bello");
    return str;
  }
}

interface GameStateJson {
  hands: {
    id: number;
    cards: CardId[];
  }[];
  piles: {
    id: number;
    cards: CardId[];
  }[];
  table: CardId[];
  deck: CardId[];
  playerTurn: number;
}

export default GameState;
