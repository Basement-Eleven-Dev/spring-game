import * as Phaser from "phaser";
import { Player } from "./Player";
import { Platform } from "./Platform";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup; // Trasformato in gruppo Statico puro

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

    // Creazione del gruppo fisico STATICO
    this.platforms = this.physics.add.staticGroup({
      classType: Platform,
    });

    // Generazione base sicura
    const basePlatform = this.platforms.get(
      200,
      680,
      "platformTexture",
    ) as Platform;
    basePlatform.setDisplaySize(400, 15);
    basePlatform.body.updateFromGameObject(); // FONDAMENTALE: aggiorna la hitbox statica dopo un ridimensionamento visivo

    // Generazione procedurale delle 5 piattaforme
    for (let i = 1; i <= 5; i++) {
      const randomX = Phaser.Math.Between(40, 360);
      const y = 680 - 120 * i;

      const plat = this.platforms.get(
        randomX,
        y,
        "platformTexture",
      ) as Platform;
      plat.setOneWayCollision();
    }

    this.player = new Player(this, 200, 600, "playerTexture");

    // Collisione sicura, tipizzata e gestita a monte
    this.physics.add.collider(this.player, this.platforms, (playerObj) => {
      const p = playerObj as Player;
      // Esegue il salto solo se il body esiste e se sta effettivamente toccando la piattaforma dal basso
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
  }
}
