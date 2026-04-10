import * as Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed: number = 250;
  private jumpForce: number = 600; // Leggermente aumentato per saltare i gradini in modo più fluido

  // Diciamo a TypeScript in modo rigoroso che questo è un body dinamico
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      throw new Error("Tastiera non rilevata dal motore.");
    }
  }

  public jump(multiplier: number = 1): void {
    this.setVelocityY(-this.jumpForce * multiplier);
  }

  public update(): void {
    if (this.cursors.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(this.moveSpeed);
    } else {
      this.setVelocityX(0);
    }

    // Wrap MANUALE e controllato solo sull'asse X
    const halfWidth = this.width / 2;
    if (this.x < -halfWidth) {
      this.x = 400 + halfWidth;
    } else if (this.x > 400 + halfWidth) {
      this.x = -halfWidth;
    }
  }
}
