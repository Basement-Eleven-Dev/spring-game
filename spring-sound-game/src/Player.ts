import * as Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed: number = 250;
  private jumpForce: number = 600;

  // Variabile per salvare l'inclinazione del telefono
  private tiltX: number = 0;

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

    // GESTIONE ACCELEROMETRO (Sensore di movimento mobile)
    // Ascoltiamo l'evento nativo del browser per l'orientamento del dispositivo
    window.addEventListener(
      "deviceorientation",
      (event) => {
        // event.gamma rappresenta l'inclinazione destra/sinistra (da -90 a +90)
        if (event.gamma !== null) {
          this.tiltX = event.gamma;
        }
      },
      true,
    );
  }

  public jump(multiplier: number = 1, currentLevel: number = 1): void {
    const levelSpeedMultiplier = 1 + (currentLevel - 1) * 0.15;
    this.setVelocityY(-this.jumpForce * levelSpeedMultiplier * multiplier);
  }

  public updateMovement(partyLevel: number, isWasted: boolean): void {
    let targetSpeed = 0;

    // 1. INPUT TASTIERA (Mantiene la compatibilità su PC)
    if (this.cursors.left.isDown) targetSpeed = -this.moveSpeed;
    else if (this.cursors.right.isDown) targetSpeed = this.moveSpeed;

    // 2. INPUT TOUCH (Tap lato sinistro o destro dello schermo)
    const pointer = this.scene.input.activePointer;
    if (pointer.isDown) {
      if (pointer.x < this.scene.cameras.main.width / 2) {
        targetSpeed = -this.moveSpeed; // Tap a sinistra
      } else {
        targetSpeed = this.moveSpeed; // Tap a destra
      }
    }

    // 3. INPUT TILT (Sovrascrive tutto se si inclina il telefono fisicamente)
    // Usiamo Math.abs > 3 per creare una "deadzone", così se hai le mani che tremano poco il pg non impazzisce
    if (Math.abs(this.tiltX) > 3) {
      // Mappiamo l'inclinazione (fino a 30 gradi circa) per dare velocità proporzionale
      const tiltFactor = Phaser.Math.Clamp(this.tiltX / 30, -1, 1);
      targetSpeed = this.moveSpeed * tiltFactor;
    }

    // --- APPLICAZIONE SBRONZA E INERZIA ---
    let drunkFactor = isWasted ? 1 : partyLevel / 100;
    let expoFactor = Math.pow(drunkFactor, 3);

    const lerpFactor = Phaser.Math.Linear(1, 0.15, expoFactor);

    const currentSpeed = this.body.velocity.x;
    this.setVelocityX(
      Phaser.Math.Linear(currentSpeed, targetSpeed, lerpFactor),
    );

    // --- EFFETTO PAC-MAN AI BORDI ---
    const halfWidth = this.displayWidth / 2;
    if (this.x < -halfWidth) this.x = 400 + halfWidth;
    else if (this.x > 400 + halfWidth) this.x = -halfWidth;
  }
}
