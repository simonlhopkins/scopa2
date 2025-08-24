import GameState from "../../Game/GameState.ts";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import Card from "../../Game/Card.ts";
import CardView from "../../Views/CardView.ts";
import {SceneKeys} from "../SceneKeys.ts";
import {Game} from "../Game.ts";

const COLOR_PRIMARY = 0x4e342e;
const COLOR_LIGHT = 0x7b5e57;
const COLOR_DARK = 0x260e04;
class EndOfGameView extends Phaser.GameObjects.GameObject{

  mainSizer: Sizer
  constructor(scene:Phaser.Scene) {
    super(scene, "EndOfGameView");
    this.mainSizer = this.scene.rexUI.add.sizer({
      x: this.scene.scale.width/2, y: this.scene.scale.height/2,
      // width: 500, height: 700,
      orientation: 'x',
      space: { item: 10 }
    });
    
  }
  public Hide(){
    this.mainSizer.setVisible(false);
  }
  public Show(gamestate: GameState) {
    console.log("showing end of game");
    this.mainSizer.setVisible(true);
    this.mainSizer.removeAll(true);
    this.mainSizer.add(this.CreateResultsTabs(gamestate))
    this.mainSizer.add(this.CreateShop());
    this.mainSizer.layout();
  }
  private CreateResultsTabs(gameState: GameState){
    const tabPages = this.scene.rexUI.add.tabPages({
      width: 500, height: 700,
      background: this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 0, COLOR_DARK),

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
        tab: this.CreateLabel(`Player ${playerNum}`),
        page: this.CreatePlayerPage(cardZone.GetCards())
      });
    }
    tabPages.layout();
    tabPages.swapFirstPage();
    return tabPages;
  }
  
  private CreateLabel(text:string) {
    return this.scene.rexUI.add.label({
      width: 40, height: 40,

      background: this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 0, COLOR_PRIMARY),
      text: this.scene.add.text(0, 0, text, { fontSize: 24 }),

      space: { left: 10, right: 10, top: 10, bottom: 10 }
    })
  }
  private CreatePlayerPage(cards: Card[]){
    const cardGrid = this.scene.rexUI.add.gridSizer({
      column: 5, row: 1,
      columnProportions: 1, rowProportions: 1,
      space: {
        // top: 20, bottom: 20, left: 10, right: 10,
        column: 4, row: 4
      },
    })
    const sortedCards = cards.sort((a, b) => {
      return b.suit- a.suit || a.rank - b.rank;
    });
    for(const card of sortedCards){
      const container = this.scene.rexUI.add.sizer()
      const cardView = new CardView(this.scene, card);
      cardView.disableInteractive();
      container.add(this.scene.add.existing(cardView));
      cardGrid.add(container)
    }
    cardGrid.layout();
    const scrollable = this.scene.rexUI.add.scrollablePanel({
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
    const shopSizer = this.scene.rexUI.add.sizer({
      orientation: 'y',
      space: { item: 10 }
    });

    const shopLabel = this.CreateLabel("Shop");
    const button = this.scene.rexUI.add.label({
      width: 100,
      height: 40,
      background: this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 20, COLOR_PRIMARY),
      text: this.scene.add.text(0, 0, "new game", { fontSize: 24 }),
      space: { left: 10, right: 10, top: 10, bottom: 10 }
    })
    button.setInteractive();
    button.on('pointerup', () => {
      console.log("hello")
      this.scene.scene.stop(SceneKeys.EndOfGame);
      (this.scene.scene.get(SceneKeys.Game) as Game).DealNewGame();
    });
    shopSizer.add(shopLabel);
    shopSizer.add(button)
    return shopSizer;
  }
  private Reset(){
    
  }
}

export default EndOfGameView