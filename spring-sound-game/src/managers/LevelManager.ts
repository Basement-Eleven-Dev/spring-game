import * as Phaser from "phaser";
import { PHYSICS, LEVEL } from "../GameConfig";

/**
 * LevelManager
 * =============
 * Gestisce la progressione tra livelli:
 * - Incremento del livello
 * - Aumento della gravità per ogni livello
 * - Calcolo dei bonus punti
 * - Animazione visiva "LEVEL X!"
 */
export class LevelManager {
  private scene: Phaser.Scene;
  private _level: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Avanza al livello successivo:
   * - Incrementa il contatore
   * - Aggiorna la gravità del mondo fisico
   * - Mostra l'animazione di level up
   */
  public levelUp(): void {
    this._level++;
    this.scene.physics.world.gravity.y = this.getGravity();
    this.showLevelUpVisual();
  }

  /** Calcola la gravità per il livello corrente (cresce del 15% per livello) */
  public getGravity(): number {
    return (
      PHYSICS.BASE_GRAVITY *
      (1 + (this._level - 1) * PHYSICS.GRAVITY_SCALE_PER_LEVEL)
    );
  }

  /** Ritorna i punti bonus per aver completato il livello (1000 × livello) */
  public getLevelUpBonus(): number {
    return LEVEL.LEVEL_UP_BONUS * this._level;
  }

  /**
   * Mostra un testo "LEVEL X!" al centro dello schermo
   * con animazione verso l'alto + fade out.
   */
  private showLevelUpVisual(): void {
    const lvlText = this.scene.add
      .text(200, 350, `LEVEL ${this._level}!`, {
        fontSize: "48px",
        color: "#ff00ff",
        fontStyle: "bold",
        stroke: "#fff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.scene.tweens.add({
      targets: lvlText,
      y: 300,
      alpha: 0,
      duration: 1500,
      ease: "Cubic.easeOut",
      onComplete: () => lvlText.destroy(),
    });
  }

  public get level(): number {
    return this._level;
  }
}
