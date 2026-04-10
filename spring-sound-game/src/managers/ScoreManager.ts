import * as Phaser from "phaser";
import { PARTY } from "../GameConfig";

/**
 * ScoreManager
 * =============
 * Gestisce il calcolo del punteggio, della distanza percorsa
 * e l'aggiornamento dell'HUD (testo in alto a sinistra).
 *
 * Il punteggio ha un moltiplicatore basato sul party level:
 * - Normale (0-33):  x1
 * - Giallo (34-66):  x1.5
 * - Arancio (67-99): x2
 * - Wasted (100):    x3
 */
export class ScoreManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;

  private _score: number = 0;
  private _distance: number = 0;
  private _highestYReached: number = 0;

  constructor(scene: Phaser.Scene, startY: number) {
    this.scene = scene;
    this._highestYReached = startY;
    this.createHUD();
  }

  /** Crea il testo dell'HUD fisso in alto a sinistra */
  private createHUD(): void {
    this.scoreText = this.scene.add
      .text(10, 10, "0m | 0 pts | Lvl 1", {
        fontSize: "18px",
        color: "#000",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(10);
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
      // Decidi il moltiplicatore in base al party level
      let multiplier: number = PARTY.MULTIPLIER_NORMAL;
      if (isWasted) {
        multiplier = PARTY.MULTIPLIER_WASTED;
      } else if (partyLevel >= PARTY.THRESHOLD_ORANGE) {
        multiplier = PARTY.MULTIPLIER_ORANGE;
      } else if (partyLevel >= PARTY.THRESHOLD_YELLOW) {
        multiplier = PARTY.MULTIPLIER_YELLOW;
      }

      // Converti pixel in "metri" (10 pixel = 1 metro)
      const metersGained = heightGained / 10;
      this._distance += metersGained;
      this._score += metersGained * level * multiplier;

      this._highestYReached = playerY;
    }

    // Aggiorna il testo dell'HUD
    this.scoreText.setText(
      `${Math.floor(this._distance)}m | ${Math.floor(this._score)} pts | Lvl ${level}`,
    );
  }

  /** Aggiunge punti bonus diretti (es. dal DJ Stage / level up) */
  public addBonus(points: number): void {
    this._score += points;
  }

  /** La Y più alta raggiunta dal giocatore (usata per calcolare la distanza) */
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
