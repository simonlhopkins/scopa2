import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";

import { Preloader } from "./scenes/Preloader";
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import { Game, Types } from "phaser";
import UIScene from "./scenes/UI/UIScene.ts";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: "game-container",
  backgroundColor: "#028af8",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  plugins: {
    scene: [{
      key: 'rexUI',
      plugin: RexUIPlugin,
      mapping: 'rexUI'
    }]
  },
  scene: [Boot, Preloader, MainGame, UIScene],
};

export default new Game(config);
