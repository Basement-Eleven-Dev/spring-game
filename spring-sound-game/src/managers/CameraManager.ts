import * as Phaser from "phaser";
import { CAMERA, GAME, PARTY, SKY } from "../GameConfig";

/**
 * CameraManager
 * ==============
 * Gestisce lo scrolling verticale fluido e gli effetti visivi
 * della camera (rotazione da ubriachezza, blur post-processing,
 * transizione giorno/notte del background).
 */
export class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private blurFx: Phaser.FX.Blur | null = null;
  /** Rettangolo di sfondo cielo — fixed in screen space, dietro a tutto. */
  private skyBg!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Sfondo giorno: rettangolo fisso nello spazio dello schermo (depth -1).
    // Il colore cambia solo al momento del level up dopo le 21:00.
    this.skyBg = scene.add
      .rectangle(
        GAME.WIDTH / 2,
        GAME.HEIGHT / 2,
        GAME.WIDTH,
        GAME.HEIGHT,
        SKY.DAY,
      )
      .setScrollFactor(0)
      .setDepth(-1);

    scene.cameras.main.setBackgroundColor(SKY.DAY);
  }

  /**
   * Aggiorna la camera ogni frame:
   * - Scrolling fluido verso l'alto (segue il giocatore, non scende mai)
   * - Rotazione oscillante se il giocatore è ubriaco
   */
  public update(playerY: number, partyLevel: number, isWasted: boolean): void {
    const targetY = playerY - this.camera.height / 2;
    if (targetY < this.camera.scrollY) {
      this.camera.scrollY = Phaser.Math.Linear(
        this.camera.scrollY,
        targetY,
        CAMERA.LERP,
      );
    }

    this.applyDrunkRotation(partyLevel, isWasted);
  }

  /**
   * Transizione al background notturno con un tween sul colore del rettangolo.
   * Chiamato da GameScene al primo level up dopo le 21:00.
   */
  public switchToNight(): void {
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2000,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const from = Phaser.Display.Color.IntegerToRGB(SKY.DAY);
        const to = Phaser.Display.Color.IntegerToRGB(SKY.NIGHT);
        const r = Math.round(from.r + (to.r - from.r) * t);
        const g = Math.round(from.g + (to.g - from.g) * t);
        const b = Math.round(from.b + (to.b - from.b) * t);
        const color = Phaser.Display.Color.GetColor(r, g, b);
        this.skyBg.setFillStyle(color);
        this.camera.setBackgroundColor(color);
      },
    });
  }

  /**
   * Applica una rotazione sinusoidale alla camera.
   * L'ampiezza cresce esponenzialmente col party level.
   */
  private applyDrunkRotation(partyLevel: number, isWasted: boolean): void {
    if (partyLevel >= PARTY.THRESHOLD_YELLOW || isWasted) {
      const drunkIntensity = isWasted
        ? 1.0
        : Phaser.Math.Percent(
            partyLevel,
            PARTY.THRESHOLD_YELLOW,
            PARTY.MAX_LEVEL,
          );
      const amplitude =
        Math.pow(drunkIntensity, 2) * CAMERA.DRUNK_MAX_AMPLITUDE;
      this.camera.setRotation(
        Math.sin(this.scene.time.now / CAMERA.DRUNK_ROTATION_SPEED) * amplitude,
      );
    } else {
      this.camera.setRotation(0);
    }
  }

  /** Attiva l'effetto sfocatura (blur) post-processing sulla camera. */
  public applyBlur(): void {
    this.blurFx = this.camera.postFX.addBlur(2, 0, 0, 1, 0xffffff, 4);
  }

  /** Rimuove blur e rotazione, riportando la camera alla normalità. */
  public clearEffects(): void {
    if (this.blurFx) {
      this.camera.postFX.remove(this.blurFx);
      this.blurFx = null;
    }
    this.camera.setRotation(0);
  }

  /** Posizione Y corrente della camera (bordo superiore visibile). */
  public get scrollY(): number {
    return this.camera.scrollY;
  }

  /** Altezza della viewport della camera. */
  public get height(): number {
    return this.camera.height;
  }
}
