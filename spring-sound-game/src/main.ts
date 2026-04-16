import * as Phaser from "phaser";
import { GameScene } from "./GameScene";
import { GameOverScene } from "./GameOverScene";
import { StartScene } from "./StartScene";
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
  scene: [StartScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // autoDensity NON funziona in Phaser 3.90: il canvas resta a 1×.
    // Il DPR è gestito direttamente in GameConfig.ts (GAME_WIDTH = CSS_WIDTH × DPR).
  } as Phaser.Types.Core.ScaleConfig,
  render: {
    antialias: true,
    antialiasGL: true,
    // Genera mipmaps: indispensabile con texture grandi scalate a display piccolo.
    // LINEAR_MIPMAP_NEAREST = bilinear within mipmap level, snap alla level più
    // vicina (evita il blending inter-level di trilinear che causa sfocatura).
    mipmapFilter: "LINEAR_MIPMAP_NEAREST",
    // Arrotonda le coordinate degli sprite al pixel intero più vicino.
    // Senza questo, Phaser posiziona sprite a coordinate sub-pixel (es. x=100.3)
    // costringendo il GPU a spalmare il pixel su 2 colonne → blur visibile.
    roundPixels: true,
  },
};

/**
 * Avvio del gioco — diretto su tutti i dispositivi.
 *
 * Il permesso per il sensore di orientamento (iOS) viene ora gestito
 * dal menu di pausa tramite il toggle ACCELEROMETRO, eliminando
 * la necessità di un overlay di avvio separato.
 */
new Phaser.Game(config);
