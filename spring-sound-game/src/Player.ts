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

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      throw new Error("Tastiera non rilevata dal motore.");
    }
  }

  public jump(multiplier: number = 1): void {
    this.setVelocityY(-this.jumpForce * multiplier);
  }

  // Abbiamo rinominato il metodo e gli passiamo il partyLevel per calcolare l'inerzia
  public updateMovement(partyLevel: number): void {
    let targetSpeed = 0;

    // Determiniamo la velocità bersaglio in base al tasto premuto
    if (this.cursors.left.isDown) {
      targetSpeed = -this.moveSpeed;
    } else if (this.cursors.right.isDown) {
      targetSpeed = this.moveSpeed;
    }

    // LA MATEMATICA DELL'INERZIA:
    // Se sei a 0% sbronza, il fattore è 1 (movimento istantaneo, super reattivo).
    // Se sei a 100% sbronza, il fattore è 0.05 (scivoli come se fossi sul ghiaccio).
    const lerpFactor = Phaser.Math.Linear(1, 0.05, partyLevel / 100);

    // Applichiamo l'interpolazione lineare tra la velocità attuale e quella bersaglio
    const currentSpeed = this.body.velocity.x;
    this.setVelocityX(
      Phaser.Math.Linear(currentSpeed, targetSpeed, lerpFactor),
    );

    // Wrap orizzontale
    const halfWidth = this.width / 2;
    if (this.x < -halfWidth) {
      this.x = 400 + halfWidth;
    } else if (this.x > 400 + halfWidth) {
      this.x = -halfWidth;
    }
  }
}
