import * as Phaser from "phaser";
import { GAME, PARTY, minutesToClockString } from "../GameConfig";

/**
 * ScoreManager
 * =============
 * Gestisce il calcolo del punteggio e l'aggiornamento dell'HUD.
 *
 * Il punteggio è basato sulla distanza verticale percorsa dal giocatore.
 * L'orario narrativo (HH:MM) è indipendente dal gameplay e viene
 * passato da GameScene per essere visualizzato nell'HUD.
 *
 * L'HUD mostra:
 * - Orario narrativo (HH:MM) in alto a sinistra
 * - Punteggio corrente sotto l'orario
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
  /** Distanza verticale percorsa in unità (10px = 1 unità). Usata per il calcolo del punteggio. */
  private _distance: number = 0;
  private _highestYReached: number = 0;

  /** Shorthand per scalare i valori di riferimento */
  private r: (v: number) => number;

  constructor(scene: Phaser.Scene, startY: number) {
    this.scene = scene;
    this._highestYReached = startY;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
    this.createHUD();
  }

  /** Crea l'HUD con sfondo semitrasparente e testo stilizzato */
  private createHUD(): void {
    const r = this.r;
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Outfit, sans-serif",
      fontSize: `${r(15)}px`,
      color: "#ffffff",
      fontStyle: "bold",
    };

    // Sfondo semitrasparente dell'HUD
    this.hudBg = this.scene.add.graphics();
    this.hudBg.setScrollFactor(0).setDepth(9);
    this.drawHudBackground();

    // Orario narrativo — in alto a sinistra
    this.distanceText = this.scene.add
      .text(r(12), r(8), "16:00", { ...textStyle, fontSize: `${r(16)}px` })
      .setScrollFactor(0)
      .setDepth(10);

    // Punteggio — sotto la distanza
    this.scoreText = this.scene.add
      .text(r(12), r(28), "0 pts", {
        ...textStyle,
        fontSize: `${r(13)}px`,
        color: "#bbbbbb",
      })
      .setScrollFactor(0)
      .setDepth(10);

    // Livello — in alto a destra
    this.levelText = this.scene.add
      .text(GAME.WIDTH - r(12), r(8), "LV 1", {
        ...textStyle,
        fontSize: `${r(16)}px`,
        color: "#ffd700",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // Moltiplicatore — sotto il livello
    this.multiplierText = this.scene.add
      .text(GAME.WIDTH - r(12), r(28), "×1", {
        ...textStyle,
        fontSize: `${r(13)}px`,
        color: "#66ff66",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  /** Disegna lo sfondo scuro dell'HUD (barra in alto) */
  private drawHudBackground(): void {
    const r = this.r;
    this.hudBg.clear();
    this.hudBg.fillStyle(0x000000, 0.45);
    // Barra orizzontale piena in alto — leggermente arrotondata in basso
    this.hudBg.fillRoundedRect(0, 0, GAME.WIDTH, r(46), {
      tl: 0,
      tr: 0,
      bl: r(8),
      br: r(8),
    });
  }

  /**
   * Aggiorna punteggio e HUD ogni frame.
   * @param playerY     Posizione verticale del giocatore
   * @param level       Livello corrente
   * @param partyLevel  Party level corrente
   * @param isWasted    Stato wasted
   * @param clockMinutes Minuti narrativi trascorsi dall'inizio (da GameScene)
   */
  public update(
    playerY: number,
    level: number,
    partyLevel: number,
    isWasted: boolean,
    clockMinutes: number,
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

      const distanceGained = heightGained / 10;
      this._distance += distanceGained;
      this._score += distanceGained * level * multiplier;

      this._highestYReached = playerY;

      // Aggiorna il colore e testo del moltiplicatore
      this.multiplierText.setText(multiplierLabel);
      this.multiplierText.setColor(multiplierColor);
    }

    // Aggiorna i testi dell'HUD
    this.distanceText.setText(minutesToClockString(clockMinutes));
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

  /** Distanza verticale percorsa (usata per lo spawn basato su altezza). */
  public get distance(): number {
    return this._distance;
  }
}
