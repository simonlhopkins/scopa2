import {SceneKeys} from "../SceneKeys.ts";
import EndOfGameView from "./EndOfGameView.ts";
import GameState from "../../Game/GameState.ts";
class UIScene extends Phaser.Scene {

    
    endOfGameView: EndOfGameView;
    constructor ()
    {
        super(SceneKeys.UI);
        
        
    }

    preload ()
    {
        
    }

    create ()
    {
        this.endOfGameView = new EndOfGameView(this);
        this.add.existing(this.endOfGameView);
        this.endOfGameView.Hide();
    }
    
    public ShowEndOfGameView(gamestate:GameState){
        this.endOfGameView.Show(gamestate);
    }
    
    
}

export default UIScene;