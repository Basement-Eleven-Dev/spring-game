import * as Phaser from "phaser";
import { GAME } from "./GameConfig";

/**
 * Schermata di Game Over
 * =======================
 * Mostra le statistiche finali (distanza, punteggio, livello)
 * e un pulsante per ricominciare.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: { score: number; distance: number; level: number }) {
    const { score, distance, level } = data;
    const centerX = GAME.WIDTH / 2;

    // Sfondo scuro
    this.cameras.main.setBackgroundColor("#111118");

    // --- Titolo "GAME OVER" con animazione d'entrata ---
    const titleText = this.add
      .text(centerX, 120, "GAME OVER", {
        fontSize: "48px",
        color: "#ff4444",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      y: 150,
      duration: 800,
      ease: "Back.easeOut",
    });

    // --- Statistiche finali ---
    const statsStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    };

    const stats = [
      { y: 280, text: `${Math.floor(distance)} metri` },
      { y: 320, text: `${Math.floor(score)} punti` },
      { y: 360, text: `Livello ${level}` },
    ];

    // Animazione sfalsata per ogni riga di statistiche
    stats.forEach((stat, index) => {
      const txt = this.add
        .text(centerX, stat.y, stat.text, statsStyle)
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: txt,
        alpha: 1,
        x: centerX,
        duration: 500,
        delay: 400 + index * 200,
        ease: "Power2",
      });
    });

    // --- Pulsante "RIPROVA" ---
    const retryButton = this.add
      .text(centerX, 500, "RIPROVA", {
        fontSize: "32px",
        color: "#00ff88",
        fontStyle: "bold",
        backgroundColor: "#333333",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Effetti hover
    retryButton.on("pointerover", () => {
      retryButton.setStyle({ color: "#ffffff", backgroundColor: "#555555" });
    });
    retryButton.on("pointerout", () => {
      retryButton.setStyle({ color: "#00ff88", backgroundColor: "#333333" });
    });

    // Click/Tap → riavvia il gioco
    retryButton.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    // Animazione pulsante pulsante (pulsing)
    this.tweens.add({
      targets: retryButton,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
