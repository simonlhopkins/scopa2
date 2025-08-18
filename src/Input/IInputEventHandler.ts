import GameObject = Phaser.GameObjects.GameObject;
import Card, {CardId} from "../Game/Card.ts";
import CardZone from "../Game/CardZone.ts";
import CardView from "../Views/CardView.ts";

interface IInputEventHandler {
    Undo(): void;
    PlayBestMoveForCurrentPlayer(): void;
    OnCardHovered(card: Card):void;
    GetPlayerHand():CardZone;
    OnPointerOverGameObject (gameobject: GameObject):void
    OnPointerExitGameObject(gameobject: GameObject):void
    OnDragStart(gameobject: GameObject):void
    OnDragEnter(target: GameObject):void
    OnDragLeave(target: GameObject):void
    OnDrag(dragX: number, dragY: number):void
    OnDragEnd(isClick:boolean):void
    OnDrop(dropzone: Phaser.GameObjects.GameObject):void
    GetCardViewFromId(cardId: CardId): CardView;
    OnDebugCommand(command:string): void
}

export default IInputEventHandler;