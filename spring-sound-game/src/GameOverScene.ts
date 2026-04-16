import * as Phaser from "phaser";
import { GAME, minutesToClockString } from "./GameConfig";

/**
 * Schermata di Game Over — Design Premium
 * =========================================
 * Layout centrato con background, animazioni e statistiche complete.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  preload(): void {
    // Carica il background se non è già stato caricato
    if (!this.textures.exists("menuBg")) {
      this.load.image("menuBg", "/assets/background/background menu.png");
    }
  }

  create(data: {
    score: number;
    clockMinutes: number;
    level: number;
    drinkCount: number;
    isTimeout: boolean;
  }) {
    const { score, clockMinutes, level, drinkCount, isTimeout } = data;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const S = GAME.SCALE;
    /** Shorthand: scala e arrotonda */
    const r = (v: number) => Math.round(v * S);

    // Background menu
    const bg = this.add.image(cx, cy, "menuBg");
    const scaleX = GAME.WIDTH / bg.width;
    const scaleY = GAME.HEIGHT / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setDepth(0);

    // Overlay scuro per leggibilità
    this.add
      .rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.6)
      .setDepth(1);

    // Container principale
    const container = this.add.container(0, 0).setDepth(2);

    // --- Titolo ---
    const titleText = this.add
      .text(cx, cy - r(200), isTimeout ? "🌅 COMPLIMENTI!" : "💔 GAME OVER", {
        fontFamily: "ChillPixels",
        fontSize: isTimeout ? `${r(48)}px` : `${r(42)}px`,
        color: isTimeout ? "#ffd700" : "#ff4455",
        fontStyle: "bold",
        stroke: isTimeout ? "#332200" : "#220011",
        strokeThickness: r(6),
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: isTimeout ? "#ffd700" : "#ff4455",
          blur: r(25),
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5);
    container.add(titleText);

    // Sottotitolo contestuale
    const subtitle = this.add
      .text(
        cx,
        cy - r(150),
        isTimeout ? "Hai retto fino all'alba!" : "La festa è finita presto...",
        {
          fontFamily: "ChillPixels",
          fontSize: `${r(16)}px`,
          color: isTimeout ? "#ffdd88" : "#aa8888",
        },
      )
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(subtitle);

    // Animazione titolo
    this.tweens.add({
      targets: titleText,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({ targets: subtitle, alpha: 1, duration: 400 });
      },
    });

    // --- PANNELLO STATISTICHE ---
    const statsPanel = this.add
      .rectangle(cx, cy - r(20), r(320), r(280), 0x000000, 0.7)
      .setStrokeStyle(r(3), isTimeout ? 0xffd700 : 0xff4455, 0.8);
    container.add(statsPanel);

    // Statistiche finali
    const statsConfig = [
      {
        y: cy - r(100),
        icon: "🕐",
        label: "ORARIO",
        value: minutesToClockString(clockMinutes),
        color: "#88ccff",
      },
      {
        y: cy - r(50),
        icon: "⭐",
        label: "PUNTEGGIO",
        value: `${Math.floor(score)} pts`,
        color: "#ffd700",
      },
      {
        y: cy,
        icon: "🍺",
        label: "DRINK BEVUTI",
        value: `${drinkCount}`,
        color: "#ff8844",
      },
      {
        y: cy + r(50),
        icon: "📊",
        label: "LIVELLO",
        value: `${level}`,
        color: "#66ffaa",
      },
    ];

    statsConfig.forEach((stat, index) => {
      // Icona
      const icon = this.add
        .text(cx - r(130), stat.y, stat.icon, {
          fontSize: `${r(24)}px`,
        })
        .setOrigin(0.5)
        .setAlpha(0);
      container.add(icon);

      // Label
      const label = this.add
        .text(cx - r(95), stat.y, stat.label, {
          fontFamily: "ChillPixels",
          fontSize: `${r(12)}px`,
          color: "#999999",
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      container.add(label);

      // Valore
      const value = this.add
        .text(cx + r(120), stat.y, stat.value, {
          fontFamily: "ChillPixels",
          fontSize: `${r(22)}px`,
          color: stat.color,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);
      container.add(value);

      // Animazione entrata sfalsata
      const delay = 400 + index * 150;
      this.tweens.add({
        targets: [icon, label, value],
        alpha: 1,
        duration: 400,
        delay,
        ease: "Power2",
      });
    });

    // --- Pulsante "RIPROVA" ---
    const btnY = cy + r(150);
    const btnBg = this.add
      .rectangle(cx, btnY, r(200), r(60), 0xff44aa, 1)
      .setStrokeStyle(r(3), 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    container.add(btnBg);

    const btnText = this.add
      .text(cx, btnY, "🔄 RIPROVA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(24)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(btnText);

    // Animazione entrata pulsante
    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 1,
      duration: 500,
      delay: 1100,
    });

    // Effetto hover
    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0xff66cc);
      btnBg.setScale(1.05);
      btnText.setScale(1.05);
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0xff44aa);
      btnBg.setScale(1);
      btnText.setScale(1);
    });

    // Click → riavvia il gioco
    btnBg.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameScene");
      });
    });

    // Pulsing leggero
    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 1500,
    });

    // --- Pulsante "TORNA AL MENU" ---
    const menuBtnY = btnY + r(65);
    const menuBtnText = this.add
      .text(cx, menuBtnY, "🏠 MENU", {
        fontFamily: "ChillPixels",
        fontSize: `${r(16)}px`,
        color: "#aaaaff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    container.add(menuBtnText);

    this.tweens.add({
      targets: menuBtnText,
      alpha: 1,
      duration: 500,
      delay: 1300,
    });

    menuBtnText.on("pointerover", () => {
      menuBtnText.setColor("#ffffff");
      menuBtnText.setScale(1.1);
    });
    menuBtnText.on("pointerout", () => {
      menuBtnText.setColor("#aaaaff");
      menuBtnText.setScale(1);
    });
    menuBtnText.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("StartScene");
      });
    });

    // Animazione entrata container
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 400,
    });
  }
}
