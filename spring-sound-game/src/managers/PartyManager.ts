import * as Phaser from "phaser";
import { PARTY, DRINK, LEVEL } from "../GameConfig";
import type { CameraManager } from "./CameraManager";

/**
 * PartyManager
 * =============
 * Gestisce la logica del "party level" — la meccanica centrale del gioco.
 *
 * Calcola il party level (0-100) in base ai drink raccolti e gestisce
 * lo stato "wasted" quando si raggiunge il 100%.
 *
 * NOTA: La visualizzazione della party bar è gestita da UIManager.
 * Questo manager si occupa SOLO della logica di business.
 */
export class PartyManager {
  private scene: Phaser.Scene;
  private cameraManager: CameraManager;

  private _partyLevel: number = 0;
  private _isWasted: boolean = false;
  private _drinkCount: number = 0;

  constructor(scene: Phaser.Scene, cameraManager: CameraManager) {
    this.scene = scene;
    this.cameraManager = cameraManager;
  }

  /** Chiamato quando il giocatore raccoglie un drink */
  public collectDrink(): void {
    if (this._isWasted) return;

    this._drinkCount++;
    this._partyLevel += DRINK.PARTY_GAIN;

    if (this._partyLevel >= PARTY.MAX_LEVEL) {
      this._partyLevel = PARTY.MAX_LEVEL;
      this.triggerWasted();
    }
  }

  /**
   * Attiva lo stato "wasted":
   * - Il blur e gli altri effetti wasted vengono gestiti automaticamente
   *   da CameraManager.updateDrunkEffects() nel loop di update
   * - Dopo WASTED_DELAY ms, emette l'evento 'wasted-ready'
   */
  private triggerWasted(): void {
    this._isWasted = true;

    this.scene.time.delayedCall(LEVEL.WASTED_DELAY, () => {
      this.scene.events.emit("wasted-ready");
    });
  }

  /**
   * Resetta il party system dopo aver completato un livello.
   */
  public resetForNewLevel(): void {
    this._partyLevel = 0;
    this._isWasted = false;
    this._drinkCount = 0;
    this.cameraManager.clearEffects();
  }

  public get partyLevel(): number {
    return this._partyLevel;
  }

  public get isWasted(): boolean {
    return this._isWasted;
  }

  public get drinkCount(): number {
    return this._drinkCount;
  }
}
