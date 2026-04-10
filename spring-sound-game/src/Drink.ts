import * as Phaser from "phaser";

export class Drink extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  public initDrink(type: "static" | "falling") {
    if (this.body) {
      this.body.allowGravity = false;
      if (type === "falling") {
        // VELOCITÀ AUMENTATA: da 50 a 120 per una caduta più decisa
        this.setVelocityY(120);
      } else {
        this.setVelocityY(0);
      }
    }
  }
}
