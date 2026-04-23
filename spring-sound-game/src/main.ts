import * as Phaser from "phaser";
import { GameScene } from "./GameScene";
import { GameOverScene } from "./GameOverScene";
import { StartScene } from "./StartScene";
import { TutorialScene } from "./TutorialScene";
import { GAME, PHYSICS } from "./GameConfig";
import { LeaderboardManager } from "./managers/LeaderboardManager";
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
  fps: {
    target: 60,
    forceSetTimeOut: false, // Usa setTimeout invece di requestAnimationFrame per un frame rate più stabile su dispositivi lenti
  },
  scene: [StartScene, TutorialScene, GameScene, GameOverScene],
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
 * Avvio del gioco — aspetta il caricamento dei font prima di inizializzare Phaser.
 *
 * Il font personalizzato "ChillPixels" viene caricato dal CSS in modo asincrono.
 * Senza aspettare il caricamento, Phaser creerebbe la StartScene con il font
 * di fallback, causando testo mal renderizzato fino al prossimo refresh.
 *
 * Usiamo document.fonts.load() per forzare il caricamento immediato del font
 * e aspettiamo che sia completamente disponibile prima di avviare Phaser.
 */
async function initGame() {
  try {
    // Inizializza l'autenticazione Firebase in background (non blocca il font)
    LeaderboardManager.init();

    // Forza il caricamento del font ChillPixels
    await document.fonts.load('16px "ChillPixels"');
    // Aspetta anche che tutti gli altri font siano pronti
    await document.fonts.ready;
    console.log("✓ Font ChillPixels caricato correttamente");
  } catch (error) {
    console.warn("⚠ Errore nel caricamento del font:", error);
    // Avvia comunque il gioco dopo un breve delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  new Phaser.Game(config);
}

initGame();
