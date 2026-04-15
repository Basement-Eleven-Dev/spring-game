import * as Phaser from "phaser";
import { PARTY } from "../GameConfig";

/**
 * ScoreManager
 * =============
 * Gestisce il calcolo del punteggio basato sulla distanza verticale percorsa.
 *
 * Il punteggio è influenzato da:
 * - Distanza verticale (10px = 1 unità)
 * - Livello corrente (moltiplicatore)
 * - Party level (moltiplicatore basato su soglie)
 * - Stato wasted (moltiplicatore ridotto)
 *
 * NOTA: La visualizzazione del punteggio è gestita da UIManager.
 * Questo manager si occupa SOLO della logica di calcolo.
 */
export class ScoreManager {
  private scene: Phaser.Scene;

  private _score: number = 0;
  /** Distanza verticale percorsa in unità (10px = 1 unità). Usata per il calcolo del punteggio. */
  private _distance: number = 0;
  private _highestYReached: number = 0;

  constructor(scene: Phaser.Scene, startY: number) {
    this.scene = scene;
    this._highestYReached = startY;
  }

  /**
   * Aggiorna il punteggio in base alla posizione del giocatore.
   * @param playerY     Posizione verticale del giocatore
   * @param level       Livello corrente
   * @param partyLevel  Party level corrente
   * @param isWasted    Stato wasted
   * @param clockMinutes Minuti narrativi trascorsi (non usato per il calcolo, solo per riferimento)
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
      // Calcola il moltiplicatore basato sul party level
      let multiplier: number = PARTY.MULTIPLIER_NORMAL;

      if (isWasted) {
        multiplier = PARTY.MULTIPLIER_WASTED;
      } else if (partyLevel >= PARTY.THRESHOLD_ORANGE) {
        multiplier = PARTY.MULTIPLIER_ORANGE;
      } else if (partyLevel >= PARTY.THRESHOLD_YELLOW) {
        multiplier = PARTY.MULTIPLIER_YELLOW;
      }

      const distanceGained = heightGained / 10;
      this._distance += distanceGained;
      this._score += distanceGained * level * multiplier;

      this._highestYReached = playerY;
    }
  }

  /** Aggiungi punti bonus diretti (es. dal DJ Stage / level up) */
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
