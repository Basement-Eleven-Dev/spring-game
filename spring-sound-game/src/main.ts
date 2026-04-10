import * as Phaser from "phaser";
import { GameScene } from "./GameScene";
// Importiamo il CSS direttamente qui, è una best practice con Vite (il bundler lo gestirà in build)
import "./style.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 400,
  height: 700,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: true,
    },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
