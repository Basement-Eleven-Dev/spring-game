import * as Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed: number = 250;
  private jumpForce: number = 600;

  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(40, 40);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      throw new Error("Tastiera non rilevata.");
    }
  }

  // ECCO IL FIX: Reintegrato currentLevel per bilanciare l'aumento di gravità
  public jump(multiplier: number = 1, currentLevel: number = 1): void {
    const levelSpeedMultiplier = 1 + (currentLevel - 1) * 0.15;
    this.setVelocityY(-this.jumpForce * levelSpeedMultiplier * multiplier);
  }

  public updateMovement(partyLevel: number, isWasted: boolean): void {
    let targetSpeed = 0;
    if (this.cursors.left.isDown) targetSpeed = -this.moveSpeed;
    else if (this.cursors.right.isDown) targetSpeed = this.moveSpeed;

    let drunkFactor = isWasted ? 1 : partyLevel / 100;
    let expoFactor = Math.pow(drunkFactor, 3);

    const lerpFactor = Phaser.Math.Linear(1, 0.15, expoFactor);

    const currentSpeed = this.body.velocity.x;
    this.setVelocityX(
      Phaser.Math.Linear(currentSpeed, targetSpeed, lerpFactor),
    );

    const halfWidth = this.displayWidth / 2;
    if (this.x < -halfWidth) this.x = 400 + halfWidth;
    else if (this.x > 400 + halfWidth) this.x = -halfWidth;
  }
}
