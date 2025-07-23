import GameChange from "./GameChange.ts";
import GameState from "./GameState.ts";
import Card, {Suit} from "./Card.ts";
import CardMove from "./CardMove.ts";

class GameStateHelpers{
    
    public static CreateScoopableState(currentState:GameState): GameChange{
        //assume
        const playerTurn = 0;
        
        const gameChange = new GameChange(playerTurn,currentState.GetPlayerTurn(),playerTurn);
        const settaBella = currentState.deck.TakeCard(new Card(Suit.COIN, 7))!;
        const sevenClubs = currentState.deck.TakeCard(new Card(Suit.CLUB, 7))!;
        gameChange.AddMove(currentState.table.PushTop(settaBella));
        gameChange.AddMove(currentState.playerHands.get(0)!.PushTop(sevenClubs));
        gameChange.Append(currentState.DealCards())
        gameChange.AddFlip(settaBella.flipFaceUp());
        gameChange.AddFlip(sevenClubs.flipFaceUp());
        return gameChange;
    }
    
}

export default GameStateHelpers;