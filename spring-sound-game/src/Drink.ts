import * as Phaser from "phaser";
import { DRINK } from "./GameConfig";

/**
 * Drink
 * =====
 * Collezionabile che alza il party level del giocatore.
 * Può essere:
 * - "static":  fermo su una piattaforma (gravità disattivata)
 * - "falling": cade dall'alto dello schermo con velocità costante
 */
export class Drink extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(DRINK.WIDTH, DRINK.HEIGHT);
  }

  /**
   * Inizializza il drink come statico o cadente.
   * Chiamato dopo group.get() per configurare l'istanza.
   */
  public initDrink(type: "static" | "falling"): void {
    if (this.body) {
      this.body.allowGravity = false;
      if (type === "falling") {
        this.setVelocityY(DRINK.FALLING_SPEED);
      } else {
        this.setVelocityY(0);
      }
    }
  }
}
