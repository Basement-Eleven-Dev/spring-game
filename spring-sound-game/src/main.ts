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

/**
 * Avvia Phaser. Viene chiamata subito su Android/desktop,
 * oppure dopo il tap su "GIOCA" su iOS (dopo requestPermission).
 */
function startGame(): void {
  new Phaser.Game(config);
}

/**
 * Overlay pre-gioco con bottone "GIOCA".
 *
 * Su iOS 13+ serve anche per richiedere il permesso DeviceOrientation:
 * requestPermission() deve essere chiamato sincronicamente da un handler
 * nativo del DOM (click su <button>), non attraverso Phaser.
 *
 * Su Android/desktop l'overlay viene comunque mostrato ma senza la logica
 * di permessi, così il gioco non parte mai prima che l'utente lo avvii.
 */
const needsIOSPermission =
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof (
    DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    }
  ).requestPermission === "function";

const overlay = document.createElement("div");
overlay.style.cssText = [
  "position:fixed",
  "inset:0",
  "background:rgba(0,0,0,0.92)",
  "display:flex",
  "flex-direction:column",
  "align-items:center",
  "justify-content:center",
  "z-index:9999",
  "font-family:'Outfit',sans-serif",
  "color:#fff",
  "text-align:center",
  "padding:32px",
  "gap:16px",
].join(";");

overlay.innerHTML = `
  <div style="font-size:3rem">🎶</div>
  <div style="font-size:1.8rem;font-weight:700">Spring Sound Game</div>
  <div style="font-size:0.95rem;opacity:0.7;max-width:280px;line-height:1.5">
    Salta tra le piattaforme, raccogli drink e raggiungi il DJ Stage.
    Inclina il telefono per muoverti.
  </div>
  <button id="start-btn" style="
    margin-top:16px;
    background:#7c3aed;
    color:#fff;
    border:none;
    border-radius:14px;
    padding:18px 56px;
    font-size:1.2rem;
    font-weight:700;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    letter-spacing:0.05em;
  ">GIOCA</button>
`;

document.body.appendChild(overlay);

document.getElementById("start-btn")!.addEventListener(
  "click",
  () => {
    if (needsIOSPermission) {
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      )
        .requestPermission()
        .then(() => {
          overlay.remove();
          startGame();
        })
        .catch(() => {
          overlay.remove();
          startGame();
        });
    } else {
      overlay.remove();
      startGame();
    }
  },
  { once: true },
);
