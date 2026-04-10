import * as Phaser from "phaser";

export class Platform extends Phaser.Physics.Arcade.Sprite {
  // Tipizzazione rigorosa per i corpi statici
  declare public body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  // Metodo per impostare le collisioni One-Way richiamabile dall'esterno
  public setOneWayCollision() {
    if (this.body) {
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      this.body.checkCollision.up = true;
    }
  }
}
