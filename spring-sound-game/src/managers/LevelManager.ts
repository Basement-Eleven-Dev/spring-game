import * as Phaser from "phaser";
import { GAME, PHYSICS, LEVEL } from "../GameConfig";

/**
 * LevelManager
 * =============
 * Gestisce la progressione tra livelli:
 * - Incremento del livello
 * - Aumento LOGARITMICO della gravità per ogni livello
 * - Calcolo dei bonus punti
 * - Animazione visiva "LEVEL X!" con effetto premium
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
   * - Aggiorna la gravità del mondo fisico (curva logaritmica)
   * - Mostra l'animazione di level up
   */
  public levelUp(): void {
    this._level++;
    this.scene.physics.world.gravity.y = this.getGravity();
    this.showLevelUpVisual();
  }

  /**
   * Calcola la gravità per il livello corrente.
   * Usa una curva LOGARITMICA: cresce veloce ai primi livelli,
   * poi si stabilizza. Meno punitiva del lineare ai livelli alti.
   *
   * Formula: BASE × (1 + SCALE × ln(level))
   * Lvl 1: 750 | 2: 866 | 3: 931 | 5: 1016 | 10: 1130
   */
  public getGravity(): number {
    return (
      PHYSICS.BASE_GRAVITY *
      (1 + PHYSICS.GRAVITY_SCALE_PER_LEVEL * Math.log(this._level))
    );
  }

  /** Ritorna i punti bonus per aver completato il livello */
  public getLevelUpBonus(): number {
    return LEVEL.LEVEL_UP_BONUS * this._level;
  }

  /**
   * Mostra "LEVEL X!" al centro dello schermo con animazione premium:
   * - Scale in con bounce
   * - Glow tramite stroke
   * - Fade out verso l'alto
   */
  private showLevelUpVisual(): void {
    const centerX = GAME.WIDTH / 2;
    const centerY = GAME.HEIGHT / 2;
    const r = (v: number) => Math.round(v * GAME.SCALE);

    // Testo principale
    const lvlText = this.scene.add
      .text(centerX, centerY, `LEVEL ${this._level}!`, {
        fontFamily: "ChillPixels",
        fontSize: `${r(42)}px`,
        color: "#ffd700",
        fontStyle: "bold",
        stroke: "#b8860b",
        strokeThickness: r(5),
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#ffd700",
          blur: r(20),
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25)
      .setScale(0);

    // Animazione: scala in con bounce → pausa → fade out verso l'alto
    this.scene.tweens.add({
      targets: lvlText,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: lvlText,
          y: centerY - r(80),
          alpha: 0,
          duration: 1000,
          delay: 600,
          ease: "Cubic.easeIn",
          onComplete: () => lvlText.destroy(),
        });
      },
    });
  }

  public get level(): number {
    return this._level;
  }
}
