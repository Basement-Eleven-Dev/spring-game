import * as Phaser from "phaser";

export type PlatformType = "standard" | "moving" | "fragile" | "subwoofer";

export class Platform extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  public isBasePlatform: boolean = false;
  public platformType: PlatformType = "standard";

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  // Riceviamo il Livello Corrente come parametro
  public initPlatform(type: PlatformType, texture: string, level: number = 1) {
    this.platformType = type;
    this.setTexture(texture);
    if (type === "subwoofer") {
      this.setDisplaySize(60, 60); // Puoi cambiare 60 con la grandezza che preferisci
    } else {
      this.setDisplaySize(80, 20);
    }

    if (this.body) {
      this.body.setSize(this.width, this.height);
      this.body.setOffset(0, 0);

      this.body.allowGravity = false;
      this.body.immovable = true;
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      this.body.checkCollision.up = true;

      this.setVelocityX(0);

      if (type === "moving") {
        // Aumenta la velocità delle piattaforme del 20% per ogni livello superato
        const speedMultiplier = 1 + (level - 1) * 0.2;
        const baseSpeed = Phaser.Math.Between(60, 120) * speedMultiplier;
        this.setVelocityX(baseSpeed * (Math.random() < 0.5 ? 1 : -1));
      }
    }
  }

  public update() {
    if (this.platformType === "moving" && this.body) {
      // FIX: Usiamo displayWidth e non width!
      const halfWidth = this.displayWidth / 2;

      if (this.x < halfWidth) {
        this.x = halfWidth;
        this.setVelocityX(Math.abs(this.body.velocity.x));
      } else if (this.x > 400 - halfWidth) {
        this.x = 400 - halfWidth;
        this.setVelocityX(-Math.abs(this.body.velocity.x));
      }
    }
  }
}
