import * as Phaser from "phaser";
import { BOUNCER } from "./GameConfig";

/**
 * Bouncer (Buttafuori)
 * ====================
 * Nemico posizionato su un bordo della piattaforma.
 * È immobile e respinge il giocatore verso il basso al contatto.
 * Viene usato come classType nel gruppo Phaser, quindi NON si auto-aggiunge alla scena.
 */
export class Bouncer extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  /** Inizializza dimensioni e hitbox. Chiamato dopo group.get() per configurare l'istanza. */
  public initBouncer(): void {
    this.setDisplaySize(BOUNCER.SIZE, BOUNCER.SIZE);

    if (this.body) {
      this.body.setSize(BOUNCER.SIZE, BOUNCER.SIZE);
      this.body.allowGravity = false;
      this.body.immovable = true;
    }
  }
}
