import * as Phaser from "phaser";
import { GAME, PARTY, DRINK, LEVEL } from "../GameConfig";
import type { CameraManager } from "./CameraManager";

/**
 * PartyManager
 * =============
 * Gestisce il "party level" — la meccanica centrale del gioco.
 *
 * La party bar è centrata sotto l'HUD con design a gradiente.
 * Colori: Verde (0-29) → Giallo (30-59) → Arancio (60-99) → Rosso (100 = wasted)
 */
export class PartyManager {
  private scene: Phaser.Scene;
  private cameraManager: CameraManager;
  private barGraphics!: Phaser.GameObjects.Graphics;
  private barLabel!: Phaser.GameObjects.Text;

  private _partyLevel: number = 0;
  private _isWasted: boolean = false;

  /** Posizione della barra: centrata orizzontalmente, sotto l'HUD */
  private readonly barX: number;
  private readonly barY: number;
  private readonly r: (v: number) => number;

  constructor(scene: Phaser.Scene, cameraManager: CameraManager) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.r = (v: number) => Math.round(v * GAME.SCALE);

    this.barY = this.r(52);

    // Centra la barra orizzontalmente
    this.barX = (GAME.WIDTH - PARTY.BAR_WIDTH) / 2;

    // Crea il container grafico della party bar
    this.barGraphics = scene.add.graphics();
    this.barGraphics.setScrollFactor(0).setDepth(10);

    // Etichetta "PARTY" sopra la barra
    this.barLabel = scene.add
      .text(GAME.WIDTH / 2, this.barY - this.r(2), "PARTY", {
        fontFamily: "Outfit, sans-serif",
        fontSize: `${this.r(9)}px`,
        color: "#999999",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(10);

    this.drawBar();
  }

  /** Disegna la party bar con gradiente visivo e angoli arrotondati */
  public drawBar(): void {
    this.barGraphics.clear();
    const r = this.r;

    // Sfondo della barra (grigio scuro)
    this.barGraphics.fillStyle(0x1a1a2e, 0.8);
    this.barGraphics.fillRoundedRect(
      this.barX - r(2),
      this.barY - r(2),
      PARTY.BAR_WIDTH + r(4),
      PARTY.BAR_HEIGHT + r(4),
      r(4),
    );

    // Colore della barra basato sul party level
    let fillColor = 0x00dd44; // Verde brillante
    if (this._partyLevel >= PARTY.THRESHOLD_RED) fillColor = 0xff2222;
    else if (this._partyLevel >= PARTY.THRESHOLD_ORANGE) fillColor = 0xff7700;
    else if (this._partyLevel >= PARTY.THRESHOLD_YELLOW) fillColor = 0xeedd00;

    // Riempimento proporzionale con angoli arrotondati
    const barWidth = (this._partyLevel / PARTY.MAX_LEVEL) * PARTY.BAR_WIDTH;
    if (barWidth > 0) {
      this.barGraphics.fillStyle(fillColor, 1);
      this.barGraphics.fillRoundedRect(
        this.barX,
        this.barY,
        Math.max(barWidth, r(6)), // Minimo per mostrare il bordo arrotondato
        PARTY.BAR_HEIGHT,
        r(3),
      );
    }

    // Bordo sottile
    this.barGraphics.lineStyle(1, 0x444466, 0.6);
    this.barGraphics.strokeRoundedRect(
      this.barX - r(2),
      this.barY - r(2),
      PARTY.BAR_WIDTH + r(4),
      PARTY.BAR_HEIGHT + r(4),
      r(4),
    );

    // Aggiorna label con percentuale
    this.barLabel.setText(
      this._isWasted ? "🍺 WASTED" : `PARTY ${this._partyLevel}%`,
    );
    this.barLabel.setColor(this._isWasted ? "#ff4444" : "#999999");
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

    // Flash visivo al raccoglimento
    this.flashBar();
  }

  /** Effetto flash bianco sulla barra quando si raccoglie un drink */
  private flashBar(): void {
    const r = this.r;
    const flash = this.scene.add
      .rectangle(
        this.barX + PARTY.BAR_WIDTH / 2,
        this.barY + PARTY.BAR_HEIGHT / 2,
        PARTY.BAR_WIDTH + r(8),
        PARTY.BAR_HEIGHT + r(8),
        0xffffff,
        0.4,
      )
      .setScrollFactor(0)
      .setDepth(11);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
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
