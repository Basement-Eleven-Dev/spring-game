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
    // autoDensity moltiplica il canvas buffer per devicePixelRatio
    // → buffer = GAME_WIDTH × dpr = pixel fisici esatti (niente upscale)
    autoDensity: true,
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
 * Avvio del gioco — due percorsi separati:
 *
 * DESKTOP (no touchscreen): Phaser si avvia subito, al top level,
 * esattamente come prima dell'introduzione del sensore. Nessun overlay,
 * nessuna funzione wrapper, nessun ritardo.
 *
 * MOBILE (touchscreen): overlay HTML con bottone "GIOCA" che:
 * - Su iOS 13+ chiama DeviceOrientationEvent.requestPermission()
 *   sincronicamente dall'handler nativo del click (unico modo affidabile
 *   per soddisfare il requisito "user gesture trusted" di Safari)
 * - Su Android avvia direttamente
 * - In entrambi i casi Phaser parte SOLO dopo il tap dell'utente
 */
const isTouchDevice = navigator.maxTouchPoints > 0;

if (!isTouchDevice) {
  // --- DESKTOP: avvio immediato (identico al comportamento originale) ---
  new Phaser.Game(config);
} else {
  // --- MOBILE: overlay + permesso sensore ---
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
      const launch = () => {
        overlay.remove();
        new Phaser.Game(config);
      };

      if (needsIOSPermission) {
        (
          DeviceOrientationEvent as unknown as {
            requestPermission: () => Promise<string>;
          }
        )
          .requestPermission()
          .then(() => launch())
          .catch(() => launch());
      } else {
        launch();
      }
    },
    { once: true },
  );
}
