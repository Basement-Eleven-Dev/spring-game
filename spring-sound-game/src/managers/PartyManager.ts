import * as Phaser from "phaser";
import { PARTY, DRINK, LEVEL } from "../GameConfig";
import type { CameraManager } from "./CameraManager";

/**
 * PartyManager
 * =============
 * Gestisce il "party level" — la meccanica centrale del gioco:
 *
 * 1. Ogni drink raccolto alza il party level
 * 2. Al 100% si attiva lo stato "wasted" (sfocatura, inerzia)
 * 3. Dopo un ritardo appare il DJ Stage (checkpoint di livello)
 * 4. Atterrando sul DJ Stage il livello aumenta e il party resetta
 *
 * La party bar in alto a destra cambia colore:
 *   Verde (0-33) → Giallo (34-66) → Arancio (67-99) → Rosso (100 = wasted)
 */
export class PartyManager {
  private scene: Phaser.Scene;
  private cameraManager: CameraManager;
  private barGraphics!: Phaser.GameObjects.Graphics;

  private _partyLevel: number = 0;
  private _isWasted: boolean = false;

  constructor(scene: Phaser.Scene, cameraManager: CameraManager) {
    this.scene = scene;
    this.cameraManager = cameraManager;

    // Crea il container grafico della party bar
    this.barGraphics = scene.add.graphics();
    this.barGraphics.setScrollFactor(0).setDepth(10);
    this.drawBar();
  }

  /** Disegna la barra del party level con colore dinamico basato sulla soglia */
  public drawBar(): void {
    this.barGraphics.clear();

    // Sfondo grigio
    this.barGraphics.fillStyle(0xdddddd, 1);
    this.barGraphics.fillRect(
      PARTY.BAR_X,
      PARTY.BAR_Y,
      PARTY.BAR_WIDTH,
      PARTY.BAR_HEIGHT,
    );

    // Colore della barra basato sul party level
    let color = 0x00ff00; // Verde
    if (this._partyLevel >= PARTY.THRESHOLD_YELLOW) color = 0xffff00;
    if (this._partyLevel >= PARTY.THRESHOLD_ORANGE) color = 0xff8800;
    if (this._partyLevel >= PARTY.THRESHOLD_RED) color = 0xff0000;

    // Riempimento proporzionale
    const barWidth = (this._partyLevel / PARTY.MAX_LEVEL) * PARTY.BAR_WIDTH;
    this.barGraphics.fillStyle(color, 1);
    this.barGraphics.fillRect(PARTY.BAR_X, PARTY.BAR_Y, barWidth, PARTY.BAR_HEIGHT);

    // Bordo nero
    this.barGraphics.lineStyle(2, 0x000000, 1);
    this.barGraphics.strokeRect(
      PARTY.BAR_X,
      PARTY.BAR_Y,
      PARTY.BAR_WIDTH,
      PARTY.BAR_HEIGHT,
    );
  }

  /** Chiamato quando il giocatore raccoglie un drink */
  public collectDrink(): void {
    if (this._isWasted) return;

    this._partyLevel += DRINK.PARTY_GAIN;

    if (this._partyLevel >= PARTY.MAX_LEVEL) {
      this._partyLevel = PARTY.MAX_LEVEL;
      this.triggerWasted();
    }

    this.drawBar();
  }

  /**
   * Attiva lo stato "wasted":
   * - Effetto blur sulla camera
   * - Dopo WASTED_DELAY ms, emette l'evento 'wasted-ready'
   *   che GameScene usa per generare il DJ Stage
   */
  private triggerWasted(): void {
    this._isWasted = true;
    this.cameraManager.applyBlur();

    this.scene.time.delayedCall(LEVEL.WASTED_DELAY, () => {
      this.scene.events.emit("wasted-ready");
    });
  }

  /**
   * Resetta il party system dopo aver completato un livello (DJ Stage).
   * Riporta party level a 0, rimuove lo stato wasted e gli effetti visivi.
   */
  public resetForNewLevel(): void {
    this._partyLevel = 0;
    this._isWasted = false;
    this.cameraManager.clearEffects();
    this.drawBar();
  }

  public get partyLevel(): number {
    return this._partyLevel;
  }

  public get isWasted(): boolean {
    return this._isWasted;
  }
}
