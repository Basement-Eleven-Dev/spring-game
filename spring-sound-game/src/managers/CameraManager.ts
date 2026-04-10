import * as Phaser from "phaser";
import { CAMERA, PARTY } from "../GameConfig";

/**
 * CameraManager
 * ==============
 * Gestisce lo scrolling verticale fluido e gli effetti visivi
 * della camera (rotazione da ubriachezza, blur post-processing).
 */
export class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private blurFx: Phaser.FX.Blur | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /**
   * Aggiorna la camera ogni frame:
   * - Scrolling fluido verso l'alto (segue il giocatore)
   * - Rotazione oscillante se il giocatore è ubriaco
   */
  public update(
    playerY: number,
    partyLevel: number,
    isWasted: boolean,
  ): void {
    // La camera segue il giocatore solo verso l'alto (non scende mai)
    const targetY = playerY - this.camera.height / 2;
    if (targetY < this.camera.scrollY) {
      this.camera.scrollY = Phaser.Math.Linear(
        this.camera.scrollY,
        targetY,
        CAMERA.LERP,
      );
    }

    // Oscillazione da ubriachezza
    this.applyDrunkRotation(partyLevel, isWasted);
  }

  /**
   * Applica una rotazione sinusoidale alla camera.
   * L'ampiezza cresce esponenzialmente col party level.
   */
  private applyDrunkRotation(
    partyLevel: number,
    isWasted: boolean,
  ): void {
    if (partyLevel >= PARTY.THRESHOLD_YELLOW || isWasted) {
      const drunkIntensity = isWasted
        ? 1.0
        : Phaser.Math.Percent(partyLevel, PARTY.THRESHOLD_YELLOW, PARTY.MAX_LEVEL);
      const amplitude =
        Math.pow(drunkIntensity, 2) * CAMERA.DRUNK_MAX_AMPLITUDE;
      this.camera.setRotation(
        Math.sin(this.scene.time.now / CAMERA.DRUNK_ROTATION_SPEED) * amplitude,
      );
    } else {
      this.camera.setRotation(0);
    }
  }

  /** Attiva l'effetto sfocatura (blur) post-processing sulla camera */
  public applyBlur(): void {
    this.blurFx = this.camera.postFX.addBlur(2, 0, 0, 1, 0xffffff, 4);
  }

  /** Rimuove blur e rotazione, riportando la camera alla normalità */
  public clearEffects(): void {
    if (this.blurFx) {
      this.camera.postFX.remove(this.blurFx);
      this.blurFx = null;
    }
    this.camera.setRotation(0);
  }

  /** Posizione Y corrente della camera (bordo superiore visibile) */
  public get scrollY(): number {
    return this.camera.scrollY;
  }

  /** Altezza della viewport della camera */
  public get height(): number {
    return this.camera.height;
  }
}
