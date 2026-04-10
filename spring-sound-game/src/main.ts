import * as Phaser from "phaser";
import { GameScene } from "./GameScene";
import { GameOverScene } from "./GameOverScene";
import { GAME, PHYSICS } from "./GameConfig";
import "./style.css";

/**
 * Configurazione principale di Phaser.
 * Le dimensioni e la gravità base vengono da GameConfig.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: PHYSICS.BASE_GRAVITY },
      debug: false,
    },
  },
  scene: [GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
