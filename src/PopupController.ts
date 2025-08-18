import GameObject = Phaser.GameObjects.GameObject;
import {ScoopResult} from "./Game/GameState.ts";
import Container = Phaser.GameObjects.Container;

class PopupController{
    
    currentPopup: Container|null;
    scene: Phaser.Scene;
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }
    
    public ShowScoopChoicePopup(scoopResults:ScoopResult[], onSelect: (chosenScoop:ScoopResult)=>void, onCancel: ()=>void): void {
        
        const container = this.scene.add.container(this.scene.scale.width/2, this.scene.scale.height/2);
        const background = this.scene.add.nineslice(0,0, "tanBackground", 0, 400, 400, 10, 10, 10, 10)
        background.setOrigin(0.5, 0.5);
        container.add(background);
        container.add(this.scene.add.text(0, -150, "Choose a scoop"));
        for(let i = 0; i < scoopResults.length; i++) {
            const text = this.scene.add.text(0, i * 30, scoopResults[i].tableCards.join(", ") + "\n");
            text.setInteractive();
            text.on("pointerover", () => {
                text.setStyle({ color: "#ff0000" }); // Change text color on hover
            });
            text.on("pointerout", () => {
                text.setStyle({ color: "#ffffff" }); // Revert text color when not hovering
            });
            text.on("pointerdown", () => {
                onSelect(scoopResults[i]);
                this.currentPopup = null
                container.destroy();
            });
            container.add(text);
            this.currentPopup = container;

        }
        
    }
    
    public IsShowing(){
        return this.currentPopup != null;
    }
    
}

export default PopupController;