import * as Phaser from "phaser";

export type PlatformType = "standard" | "moving" | "fragile" | "subwoofer";

export class Platform extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  public isBasePlatform: boolean = false;
  public platformType: PlatformType = "standard";

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  // Aggiunto il parametro difficultyMultiplier (di default a 1)
  public initPlatform(
    type: PlatformType,
    texture: string,
    difficultyMultiplier: number = 1,
  ) {
    this.platformType = type;
    this.setTexture(texture);
    this.setDisplaySize(80, 15);

    if (this.body) {
      this.body.setSize(80, 15);
      this.body.setOffset(0, 0);

      this.body.allowGravity = false;
      this.body.immovable = true;
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      this.body.checkCollision.up = true;

      this.setVelocityX(0);

      if (type === "moving") {
        // Le piattaforme diventano più veloci man mano che scali!
        const baseSpeed = Phaser.Math.Between(60, 120) * difficultyMultiplier;
        const speed = baseSpeed * (Math.random() < 0.5 ? 1 : -1);
        this.setVelocityX(speed);
      }
    }
  }

  public update() {
    if (this.platformType === "moving" && this.body) {
      const halfWidth = this.width / 2;
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
