import * as Phaser from "phaser";
import { Player } from "./Player";
import { Platform } from "./Platform";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private highestPlatformY!: number;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#87CEEB");

    const platformGraphics = this.add.graphics();
    platformGraphics.fillStyle(0x00ff00, 1);
    platformGraphics.fillRect(0, 0, 80, 15);
    platformGraphics.generateTexture("platformTexture", 80, 15);
    platformGraphics.destroy();

    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0xff0000, 1);
    playerGraphics.fillRect(0, 0, 40, 40);
    playerGraphics.generateTexture("playerTexture", 40, 40);
    playerGraphics.destroy();

    this.platforms = this.physics.add.staticGroup({
      classType: Platform,
    });

    const basePlatform = this.platforms.get(
      200,
      680,
      "platformTexture",
    ) as Platform;
    basePlatform.setDisplaySize(400, 15);
    basePlatform.isBasePlatform = true;
    basePlatform.body.updateFromGameObject();

    // MODIFICA 1: Aumentiamo a 12 piattaforme e calcoliamo la distanza in modo dinamico fin da subito
    let currentY = 680;
    for (let i = 1; i <= 12; i++) {
      const randomX = Phaser.Math.Between(40, 360);
      // MODIFICA 2: Distanza aumentata tra 150 e 200 pixel
      currentY -= Phaser.Math.Between(150, 200);

      const plat = this.platforms.get(
        randomX,
        currentY,
        "platformTexture",
      ) as Platform;
      plat.setOneWayCollision();
    }

    this.highestPlatformY = currentY;

    this.player = new Player(this, 200, 600, "playerTexture");

    this.physics.add.collider(this.player, this.platforms, (playerObj) => {
      const p = playerObj as Player;
      if (p.body && p.body.touching.down) {
        p.jump();
      }
    });
  }

  update() {
    this.player.update();

    const cam = this.cameras.main;

    if (this.player.y < cam.scrollY + cam.height / 2) {
      cam.scrollY = this.player.y - cam.height / 2;
    }

    this.platforms.getChildren().forEach((child) => {
      const platform = child as Platform;

      if (platform.y > cam.scrollY + cam.height) {
        if (platform.isBasePlatform) {
          platform.destroy();
          return;
        }

        // MODIFICA 3: Manteniamo la nuova distanza aumentata anche durante il riciclo
        const randomDistance = Phaser.Math.Between(150, 200);
        platform.y = this.highestPlatformY - randomDistance;
        platform.x = Phaser.Math.Between(40, 360);

        platform.body.updateFromGameObject();
        this.highestPlatformY = platform.y;
      }
    });

    if (this.player.y > cam.scrollY + cam.height) {
      this.scene.restart();
    }
  }
}
