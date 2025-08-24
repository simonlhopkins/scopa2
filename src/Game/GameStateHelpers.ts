import GameChange from "./GameChange.ts";
import GameState from "./GameState.ts";
import Card, {Suit} from "./Card.ts";
import CardMove from "./CardMove.ts";
import gameState from "./GameState.ts";
import Timeline = Phaser.Time.Timeline;

class GameStateHelpers{
    
    public static CreateScoopableState(currentState:GameState): GameChange{
        //assume
        const playerTurn = 0;
        
        const gameChange = new GameChange(playerTurn,currentState.GetPlayerTurn(),playerTurn);
        const settaBella = currentState.GetCardFromId(new Card(Suit.COIN, 7).id())!;
        const sevenClubs = currentState.GetCardFromId(new Card(Suit.CLUB, 7).id())!;
        const setteBellaMove = currentState.SwapCards(settaBella, currentState.table.PeekTop()!);
        const sevenClubsMove = currentState.SwapCards(sevenClubs, currentState.playerHands.get(0)!.PeekTop()!);
        gameChange.Append(setteBellaMove);
        gameChange.Append(sevenClubsMove);
        for(let card of currentState.table.GetCards()){
            if(card.id() != settaBella.id()){
                gameChange.AddMove(currentState.playerPiles.get(0)!.PushTop(currentState.table.TakeCard(card)!));
            }
        }
        
        
        gameChange.AddFlip(settaBella.flipFaceUp());
        gameChange.AddFlip(sevenClubs.flipFaceUp());
        return gameChange;
    }

    public static PreEndGameState(currentState: GameState): GameChange {
        const playerTurn = 0;
        const gameChange = new GameChange(playerTurn, currentState.GetPlayerTurn(), playerTurn);
        // gameChange.Append(currentState.InitialTableCards());
        // gameChange.Append(currentState.DealCards());
        const deckToPileCards:CardMove[] = [];
        const playerPile = currentState.playerPiles.get(0)!;
        while(currentState.deck.GetCards().length>0){
            deckToPileCards.push(playerPile.PushTop(currentState.deck.TakeTop()!));
        }
        gameChange.AddMoves(deckToPileCards);
        gameChange.AddFlips(deckToPileCards.map(move=>move.card.flipFaceDown()))
        
        //thin out the hands
        const handToPileCards:CardMove[] = [];
        for(const playerHand of currentState.playerHands.values()){
            while(playerHand.GetCards().length > 1){
                handToPileCards.push(playerPile.PushTop(playerHand.TakeTop()!));
            }
        }
        gameChange.AddMoves(handToPileCards);
        gameChange.AddFlips(handToPileCards.map(move=>move.card.flipFaceDown()))


        return gameChange;
    }
    
    public static CreateMultipleOptionsState(currentState:GameState){
        const playerTurn = 0;
        const gameChange = new GameChange(playerTurn,currentState.GetPlayerTurn(),playerTurn);
        gameChange.Append(currentState.MoveAllCardsToDeck());
        const kingClubs = currentState.GetCardFromId(new Card(Suit.CLUB, 10).id())!;
        const kingCoins = currentState.GetCardFromId(new Card(Suit.COIN, 10).id())!;
        const playerHand = currentState.playerHands.get(0)!;
        gameChange.AddMove(playerHand.PushTop(currentState.deck.TakeCard(kingClubs)!));
        gameChange.AddMove(playerHand.PushTop(currentState.deck.TakeCard(kingCoins)!));
        gameChange.AddFlip(kingClubs.flipFaceUp());
        gameChange.AddFlip(kingCoins.flipFaceUp());

        const cardsToMoveToTable = [
            currentState.GetCardFromId(new Card(Suit.CLUB, 9).id())!,
            currentState.GetCardFromId(new Card(Suit.COIN, 1).id())!,
            currentState.GetCardFromId(new Card(Suit.CUP, 9).id())!,
            currentState.GetCardFromId(new Card(Suit.SWORD, 1).id())!
        ]

        gameChange.AddMoves(cardsToMoveToTable.map(card=> currentState.table.PushTop(currentState.deck.TakeCard(card)!)));
        gameChange.AddFlips(cardsToMoveToTable.map(card=>card.flipFaceUp()));
        gameChange.Append(currentState.DealCards());
        return gameChange;
    }
}

export default GameStateHelpers;