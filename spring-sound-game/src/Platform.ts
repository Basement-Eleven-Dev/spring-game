import * as Phaser from "phaser";

export class Platform extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.StaticBody;

  // NUOVA PROPRIETÀ: Ci serve per riconoscere se è il pavimento iniziale
  public isBasePlatform: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  public setOneWayCollision() {
    if (this.body) {
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      this.body.checkCollision.up = true;
    }
  }
}
