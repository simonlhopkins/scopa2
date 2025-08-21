// types/phaser-rexui.d.ts
import 'phaser';
import type RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

declare global {
  namespace Phaser {
    interface Scene {
      rexUI: RexUIPlugin;
    }
  }
}

export {}; 