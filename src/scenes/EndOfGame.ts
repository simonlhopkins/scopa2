import GameState, {ScoreResult} from "../Game/GameState.ts";
import {SceneKeys} from "./SceneKeys.ts";
import {Scene} from "phaser";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin";
import Label = UIPlugin.Label;
import Card from "../Game/Card.ts";
import CardView from "../Views/CardView.ts";
import F = Phaser.Input.Keyboard.KeyCodes.F;
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import {Game} from "./Game.ts";

const COLOR_PRIMARY = 0x4e342e;
const COLOR_LIGHT = 0x7b5e57;
const COLOR_DARK = 0x260e04;

class EndOfGame extends Phaser.Scene {

    gameState: GameState | null = null;
    constructor ()
    {
        super(SceneKeys.EndOfGame);
    }
    
    init(gameState: GameState){
        this.gameState = gameState;
    }

    preload ()
    {
        
    }

    create ()
    {
        const mainSizer = this.rexUI.add.sizer({
            x: this.scale.width/2, y: this.scale.height/2,
            // width: 500, height: 700,
            orientation: 'x',
            space: { item: 10 }
        });
        if(!this.gameState){
            return
        }
        mainSizer.add(this.CreateResultsTabs(this.gameState))
        mainSizer.add(this.CreateShop());
        mainSizer.layout();
        
    }
    
    private CreateResultsTabs(gameState: GameState){
        const tabPages = this.rexUI.add.tabPages({
            width: 500, height: 700,
            background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 0, COLOR_DARK),

            tabs: {
                space: { item: 3 }
            },
            pages: {
                fadeIn: 300
            },
            align: {
                tabs: 'left'
            },
            space: { left: 5, right: 5, top: 5, bottom: 5, item: 10 }

        })
            .on('tab.focus', function (tab:any, key:any) {
                tab.getElement('background').setStrokeStyle(2, COLOR_LIGHT);
            })
            .on('tab.blur', function (tab:any, key:any) {
                tab.getElement('background').setStrokeStyle();
            })
        
        for(const [playerNum, cardZone] of gameState.playerPiles){

            tabPages.addPage({
                key: `player${playerNum}`,
                tab: CreateLabel(this, `Player ${playerNum}`),
                page: this.CreatePlayerPage(cardZone.GetCards())
            });
        }
        tabPages.layout();
        tabPages.swapFirstPage();
        return tabPages;
    }
    private CreatePlayerPage(cards: Card[]){
        const cardGrid = this.rexUI.add.gridSizer({
            column: 5, row: 1,
            columnProportions: 1, rowProportions: 1,
            space: {
                // top: 20, bottom: 20, left: 10, right: 10,
                column: 4, row: 4
            },
        })
        
        for(const card of cards){
            const container = this.rexUI.add.sizer()
            const cardView = new CardView(this, card);
            cardView.disableInteractive();
            container.add(this.add.existing(cardView));
            cardGrid.add(container)
        }
        cardGrid.layout();
        const scrollable = this.rexUI.add.scrollablePanel({
            panel: {
                child: cardGrid,
            },
        }).layout();

        scrollable.setChildrenInteractive({
        }).on('child.click', function (child:Sizer) {
            const cardView = child.getChildren().find(gameObject=>gameObject instanceof CardView);
            console.log(child.getChildren().find(gameObject=>gameObject instanceof CardView))
        })
        return scrollable;
    }
    
    private CreateShop(){
        const shopSizer = this.rexUI.add.sizer({
            orientation: 'y',
            space: { item: 10 }
        });

        const shopLabel = CreateLabel(this, "Shop");
        const button = this.rexUI.add.label({
            width: 100,
            height: 40,
            background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 20, COLOR_PRIMARY),
            text: this.add.text(0, 0, "new game", { fontSize: 24 }),
            space: { left: 10, right: 10, top: 10, bottom: 10 }
        })
        button.setInteractive();
        button.on('pointerup', () => {
            console.log("hello")
            this.scene.stop(SceneKeys.EndOfGame);
            (this.scene.get(SceneKeys.Game) as Game).DealNewGame();
        });
        shopSizer.add(shopLabel);
        shopSizer.add(button)
        return shopSizer;
    }
}

var CreateLabel = function (scene:Scene, text:string) {
    return scene.rexUI.add.label({
        width: 40, height: 40,

        background: scene.rexUI.add.roundRectangle(0, 0, 0, 0, 0, COLOR_PRIMARY),
        text: scene.add.text(0, 0, text, { fontSize: 24 }),

        space: { left: 10, right: 10, top: 10, bottom: 10 }
    })
}

const content = `Phaser is a fast, free, and fun open source HTML5 game framework that offers WebGL and Canvas rendering across desktop and mobile web browsers. Games can be compiled to iOS, Android and native apps by using 3rd party tools. You can use JavaScript or TypeScript for development.`;


export default EndOfGame;