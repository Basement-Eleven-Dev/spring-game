import * as Phaser from "phaser";
import { GAME, minutesToClockString } from "./GameConfig";

/**
 * Schermata di Game Over — Design Premium
 * =========================================
 * Layout centrato con animazioni sfalsate e pulsante interattivo.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: {
    score: number;
    clockMinutes: number;
    level: number;
    isTimeout: boolean;
  }) {
    const { score, clockMinutes, level, isTimeout } = data;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const S = GAME.SCALE;
    /** Shorthand: scala e arrotonda */
    const r = (v: number) => Math.round(v * S);

    // Sfondo gradiente scuro
    this.cameras.main.setBackgroundColor("#0a0a18");

    // --- Particelle decorative (sfondo) ---
    for (let i = 0; i < 20; i++) {
      const particle = this.add
        .circle(
          Phaser.Math.Between(r(20), GAME.WIDTH - r(20)),
          Phaser.Math.Between(r(20), GAME.HEIGHT - r(20)),
          Phaser.Math.Between(1, r(3)),
          0x6633ff,
          Phaser.Math.FloatBetween(0.1, 0.4),
        )
        .setDepth(0);

      this.tweens.add({
        targets: particle,
        y: particle.y - Phaser.Math.Between(r(20), r(60)),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // --- Titolo ---
    const titleText = this.add
      .text(cx, cy - r(180), isTimeout ? "04:00" : "GAME OVER", {
        fontFamily: "Outfit, sans-serif",
        fontSize: isTimeout ? `${r(52)}px` : `${r(44)}px`,
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

    // Sottotitolo contestuale
    this.add
      .text(
        cx,
        cy - r(130),
        isTimeout
          ? "Hai retto fino all'alba! 🌅"
          : "Sei tornato a casa troppo presto",
        {
          fontFamily: "Outfit, sans-serif",
          fontSize: `${r(13)}px`,
          color: isTimeout ? "#ffdd88" : "#aa8888",
        },
      )
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1)
      .setData("_anim", true);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        // Anima anche il sottotitolo
        this.children.getAll().forEach((child) => {
          if ((child as Phaser.GameObjects.GameObject).getData("_anim")) {
            this.tweens.add({ targets: child, alpha: 1, duration: 400 });
          }
        });
      },
    });

    // --- Statistiche finali ---
    const statsConfig = [
      {
        y: cy - r(60),
        label: "ORARIO",
        value: minutesToClockString(clockMinutes),
        color: "#88ccff",
      },
      {
        y: cy - r(15),
        label: "PUNTEGGIO",
        value: `${Math.floor(score)} pts`,
        color: "#ffd700",
      },
      {
        y: cy + r(30),
        label: "LIVELLO",
        value: `${level}`,
        color: "#66ffaa",
      },
    ];

    statsConfig.forEach((stat, index) => {
      // Label piccola
      const label = this.add
        .text(cx - r(60), stat.y, stat.label, {
          fontFamily: "Outfit, sans-serif",
          fontSize: `${r(11)}px`,
          color: "#666688",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);

      // Valore grande
      const value = this.add
        .text(cx + r(60), stat.y, stat.value, {
          fontFamily: "Outfit, sans-serif",
          fontSize: `${r(20)}px`,
          color: stat.color,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);

      // Linea separatrice sotto ogni stat
      const line = this.add
        .rectangle(cx, stat.y + r(18), r(160), 1, 0x333355, 0.4)
        .setAlpha(0);

      const delay = 400 + index * 200;
      this.tweens.add({
        targets: label,
        alpha: 1,
        x: cx - r(70),
        duration: 400,
        delay,
        ease: "Power2",
      });
      this.tweens.add({
        targets: value,
        alpha: 1,
        x: cx + r(70),
        duration: 400,
        delay,
        ease: "Power2",
      });
      this.tweens.add({
        targets: line,
        alpha: 1,
        duration: 300,
        delay: delay + 100,
      });
    });

    // --- Pulsante "RIPROVA" ---
    const btnBg = this.add
      .rectangle(cx, cy + r(140), r(180), r(50), 0x6633ff, 1)
      .setStrokeStyle(r(2), 0x9966ff)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const btnText = this.add
      .text(cx, cy + r(140), "RIPROVA", {
        fontFamily: "Outfit, sans-serif",
        fontSize: `${r(22)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Animazione entrata pulsante
    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 1,
      duration: 500,
      delay: 1200,
    });

    // Effetto hover
    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0x8855ff);
      btnBg.setScale(1.05);
      btnText.setScale(1.05);
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0x6633ff);
      btnBg.setScale(1);
      btnText.setScale(1);
    });

    // Click → riavvia il gioco
    btnBg.on("pointerdown", () => {
      this.scene.start("GameScene");
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
  }
}
