
import IInputEventHandler from "./IInputEventHandler.ts";
import AnimationController from "../Animation/AnimationController.ts";
import Card from "../Game/Card.ts";
import CardView from "../Views/CardView.ts";

class InputController{
    
    private scene: Phaser.Scene;
    private handler: IInputEventHandler;
    private animationController: AnimationController
    private dragStartTime: null | number = null;
    private currentlySelectedCardIndex : number | null = null;
    constructor(scene: Phaser.Scene, handler:IInputEventHandler, animationController: AnimationController) {
        this.scene= scene;
        this.handler = handler;
        this.animationController = animationController;
    }
    IgnoreInput() {
        return this.animationController.CardsMoving();
    }
    
    private GetPlayerHandCardViewByIndex(index: number): CardView | null {
        const cards = this.handler.GetPlayerHand().GetCards();
        if(cards.length==0 || index < 0 || index >= cards.length) {
            return null;
        }
        const card = cards[index];
        return this.handler.GetCardViewFromId(card.id());
        
    }
    
    initialize(){
        this.scene.input.keyboard!.on("keydown-U", () => {
            if (this.IgnoreInput()) {
                console.log("don't undo while cards are moving it can break things...");
                return;
            }
            this.handler.Undo();
        });

        this.scene.input.keyboard!.on("keydown-RIGHT", () => {
            const cards = this.handler.GetPlayerHand().GetCards();
            this.currentlySelectedCardIndex = this.currentlySelectedCardIndex === null ? 0 : ((this.currentlySelectedCardIndex + 1) % cards.length);
            this.handler.OnPointerOverGameObject(this.GetPlayerHandCardViewByIndex(this.currentlySelectedCardIndex)!);
        });
        this.scene.input.keyboard!.on("keydown-LEFT", () => {
            const cards = this.handler.GetPlayerHand().GetCards();
            this.currentlySelectedCardIndex = this.currentlySelectedCardIndex === null
                ? 0
                : (this.currentlySelectedCardIndex - 1 + cards.length) % cards.length;
            this.handler.OnPointerOverGameObject(this.GetPlayerHandCardViewByIndex(this.currentlySelectedCardIndex)!);
        });
        this.scene.input.keyboard!.on("keydown-ENTER", () => {
            if(this.currentlySelectedCardIndex!=null){
                this.handler.OnDragStart(this.GetPlayerHandCardViewByIndex(this.currentlySelectedCardIndex)!);
            }
            this.handler.OnDragEnd(true);
        });
        this.scene.input.keyboard!.on("keydown-P", () => {
            this.handler.PlayBestMoveForCurrentPlayer();
        });
        this.scene.input.keyboard!.on("keydown-N", () => {
            this.handler.OnDebugCommand("dealNewGame");
        });
        this.scene.input.keyboard!.on("keydown-ONE", () => {
            this.handler.OnDebugCommand("preEndGame");
        });
        this.scene.input.keyboard!.on("keydown-TWO", () => {
            this.handler.OnDebugCommand("scoopableState");
        });
        this.scene.input.on(
            Phaser.Input.Events.POINTER_OVER,
            (
                pointer: Phaser.Input.Pointer,
                justOver: Phaser.GameObjects.GameObject[]
            ) => {
                this.currentlySelectedCardIndex = null;
                this.handler.OnPointerOverGameObject(justOver[0]);
            }
        );
        this.scene.input.on(
            Phaser.Input.Events.POINTER_OUT,
            (
                pointer: Phaser.Input.Pointer,
                justOut: Phaser.GameObjects.GameObject[]
            ) => {
                this.handler.OnPointerExitGameObject(justOut[0]);
            }
        );
        this.scene.input.on(
            Phaser.Input.Events.DRAG_START,
            (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject
            ) => {
                this.dragStartTime = this.scene.time.now;
                this.handler.OnDragStart(gameObject);
            }
        );
        this.scene.input.on(
            Phaser.Input.Events.DRAG_ENTER,
            (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject,
                target: Phaser.GameObjects.GameObject
            ) => {
                this.handler.OnDragEnter(target);
            }
        );
        this.scene.input.on(
            Phaser.Input.Events.DRAG_LEAVE,
            (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject,
                target: Phaser.GameObjects.GameObject
            ) => {
               this.handler.OnDragLeave(target);
            }
        );
        this.scene.input.on(
            Phaser.Input.Events.DRAG,
            (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject,
                dragX: number,
                dragY: number
            ) => {
                this.handler.OnDrag(dragX, dragY);
            }
        );
        
        this.scene.input.on(
            Phaser.Input.Events.DRAG_END,
            (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject,
                dragX: number,
                dragY: number
            ) => {
                console.log("drag end", this.dragStartTime)
                if (this.dragStartTime) {
                    const dragTime = this.scene.time.now - this.dragStartTime;
                    const isClick = dragTime < 300; // 200ms threshold for click
                    this.handler.OnDragEnd(isClick);
                }
            }
        );

        this.scene.input.on(
            Phaser.Input.Events.DROP,
            async (
                pointer: Phaser.Input.Pointer,
                gameObject: Phaser.GameObjects.GameObject,
                dropzone: Phaser.GameObjects.GameObject
            ) => {
                this.handler.OnDrop(dropzone);
            }
        );
    }
}

export default InputController;