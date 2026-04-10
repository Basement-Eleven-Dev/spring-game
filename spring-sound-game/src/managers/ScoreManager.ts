import * as Phaser from "phaser";
import { GAME, PARTY } from "../GameConfig";

/**
 * ScoreManager
 * =============
 * Gestisce il calcolo del punteggio, della distanza percorsa
 * e l'aggiornamento dell'HUD con design premium.
 *
 * L'HUD mostra:
 * - Distanza (m) e punteggio in alto a sinistra
 * - Livello corrente in alto a destra
 * - Moltiplicatore attivo (con colore dinamico)
 */
export class ScoreManager {
  private scene: Phaser.Scene;

  // --- Elementi HUD ---
  private distanceText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private hudBg!: Phaser.GameObjects.Graphics;

  private _score: number = 0;
  private _distance: number = 0;
  private _highestYReached: number = 0;

  constructor(scene: Phaser.Scene, startY: number) {
    this.scene = scene;
    this._highestYReached = startY;
    this.createHUD();
  }

  /** Crea l'HUD con sfondo semitrasparente e testo stilizzato */
  private createHUD(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Outfit, sans-serif",
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold",
    };

    // Sfondo semitrasparente dell'HUD
    this.hudBg = this.scene.add.graphics();
    this.hudBg.setScrollFactor(0).setDepth(9);
    this.drawHudBackground();

    // Distanza — in alto a sinistra
    this.distanceText = this.scene.add
      .text(12, 8, "0 m", { ...textStyle, fontSize: "16px" })
      .setScrollFactor(0)
      .setDepth(10);

    // Punteggio — sotto la distanza
    this.scoreText = this.scene.add
      .text(12, 28, "0 pts", { ...textStyle, fontSize: "13px", color: "#bbbbbb" })
      .setScrollFactor(0)
      .setDepth(10);

    // Livello — in alto a destra
    this.levelText = this.scene.add
      .text(GAME.WIDTH - 12, 8, "LV 1", {
        ...textStyle,
        fontSize: "16px",
        color: "#ffd700",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // Moltiplicatore — sotto il livello
    this.multiplierText = this.scene.add
      .text(GAME.WIDTH - 12, 28, "×1", {
        ...textStyle,
        fontSize: "13px",
        color: "#66ff66",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  /** Disegna lo sfondo scuro dell'HUD (barra in alto) */
  private drawHudBackground(): void {
    this.hudBg.clear();
    this.hudBg.fillStyle(0x000000, 0.45);
    // Barra orizzontale piena in alto — leggermente arrotondata in basso
    this.hudBg.fillRoundedRect(0, 0, GAME.WIDTH, 46, { tl: 0, tr: 0, bl: 8, br: 8 });
  }

  /**
   * Aggiorna punteggio e distanza ogni frame.
   * I punti guadagnati per metro dipendono dal livello e dal moltiplicatore party.
   */
  public update(
    playerY: number,
    level: number,
    partyLevel: number,
    isWasted: boolean,
  ): void {
    const heightGained = this._highestYReached - playerY;

    if (heightGained > 0) {
      // Moltiplicatore basato sul party level
      let multiplier: number = PARTY.MULTIPLIER_NORMAL;
      let multiplierColor = "#66ff66"; // Verde
      let multiplierLabel = "×1";

      if (isWasted) {
        multiplier = PARTY.MULTIPLIER_WASTED;
        multiplierColor = "#ff4444";
        multiplierLabel = `×${PARTY.MULTIPLIER_WASTED}`;
      } else if (partyLevel >= PARTY.THRESHOLD_ORANGE) {
        multiplier = PARTY.MULTIPLIER_ORANGE;
        multiplierColor = "#ff8800";
        multiplierLabel = `×${PARTY.MULTIPLIER_ORANGE}`;
      } else if (partyLevel >= PARTY.THRESHOLD_YELLOW) {
        multiplier = PARTY.MULTIPLIER_YELLOW;
        multiplierColor = "#ffdd00";
        multiplierLabel = `×${PARTY.MULTIPLIER_YELLOW}`;
      }

      const metersGained = heightGained / 10;
      this._distance += metersGained;
      this._score += metersGained * level * multiplier;

      this._highestYReached = playerY;

      // Aggiorna il colore e testo del moltiplicatore
      this.multiplierText.setText(multiplierLabel);
      this.multiplierText.setColor(multiplierColor);
    }

    // Aggiorna i testi dell'HUD
    this.distanceText.setText(`${Math.floor(this._distance)} m`);
    this.scoreText.setText(`${Math.floor(this._score)} pts`);
    this.levelText.setText(`LV ${level}`);
  }

  /** Aggiunge punti bonus diretti (es. dal DJ Stage / level up) */
  public addBonus(points: number): void {
    this._score += points;
  }

  public get highestYReached(): number {
    return this._highestYReached;
  }

  public set highestYReached(value: number) {
    this._highestYReached = value;
  }

  public get score(): number {
    return this._score;
  }

  public get distance(): number {
    return this._distance;
  }
}
