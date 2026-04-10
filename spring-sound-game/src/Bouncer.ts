import * as Phaser from "phaser";
import { BOUNCER } from "./GameConfig";

/**
 * Bouncer (Buttafuori)
 * ====================
 * Nemico che cade dall'alto e respinge il giocatore verso il basso.
 * Viene usato come classType nel gruppo Phaser, quindi NON si auto-aggiunge alla scena.
 */
export class Bouncer extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  /**
   * Inizializza il bouncer con dimensioni e velocità basate sul livello.
   * Chiamato dopo group.get() per configurare l'istanza.
   */
  public initBouncer(level: number): void {
    // Dimensione visiva e hitbox
    this.setDisplaySize(BOUNCER.SIZE, BOUNCER.SIZE);

    if (this.body) {
      this.body.setSize(BOUNCER.SIZE, BOUNCER.SIZE);
      this.body.allowGravity = false;
      this.body.immovable = true;

      // Velocità di caduta crescente col livello
      this.setVelocityY(BOUNCER.BASE_SPEED + level * BOUNCER.SPEED_PER_LEVEL);
    }
  }
}
