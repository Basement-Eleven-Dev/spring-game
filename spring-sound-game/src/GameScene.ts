import * as Phaser from "phaser";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { Drink } from "./Drink";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.Group;
  private drinks!: Phaser.Physics.Arcade.Group;

  private highestPlatformY!: number;
  private highestYReached!: number;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private partyLevel: number = 0;
  private partyBarGraphics!: Phaser.GameObjects.Graphics;
  private isWasted: boolean = false;

  private lastFallingDrinkTime: number = 0;

  constructor() {
    super("GameScene");
  }

  private createTexture(
    key: string,
    color: number,
    width: number,
    height: number,
  ) {
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, width, height);
    gfx.generateTexture(key, width, height);
    gfx.destroy();
  }

  create() {
    this.score = 0;
    this.partyLevel = 0;
    this.isWasted = false;
    this.lastFallingDrinkTime = 0;
    this.cameras.main.setBackgroundColor("#87CEEB");

    this.createTexture("playerTexture", 0xff0000, 40, 40);
    this.createTexture("standardTexture", 0x00ff00, 80, 15);
    this.createTexture("movingTexture", 0x0000ff, 80, 15);
    this.createTexture("fragileTexture", 0x8b4513, 80, 15);
    this.createTexture("subwooferTexture", 0xffff00, 80, 15);
    this.createTexture("drinkTexture", 0xffa500, 20, 20);

    this.scoreText = this.add.text(10, 10, "0 m", {
      fontSize: "28px",
      color: "#000",
      fontStyle: "bold",
    });
    this.scoreText.setScrollFactor(0).setDepth(10);

    this.partyBarGraphics = this.add.graphics();
    this.partyBarGraphics.setScrollFactor(0).setDepth(10);
    this.drawPartyBar();

    this.platforms = this.physics.add.group({
      classType: Platform,
      runChildUpdate: true,
    });
    this.drinks = this.physics.add.group({ classType: Drink });

    const basePlatform = this.platforms.get(
      200,
      680,
      "standardTexture",
    ) as Platform;
    basePlatform.isBasePlatform = true;
    basePlatform.initPlatform("standard", "standardTexture");
    basePlatform.setDisplaySize(400, 15);
    if (basePlatform.body) basePlatform.body.setSize(400, 15);

    let currentY = 680;
    for (let i = 1; i <= 12; i++) {
      currentY -= Phaser.Math.Between(80, 220);
      // Inizialmente la difficoltà è 1
      this.spawnPlatform(currentY, 1);
    }

    this.highestPlatformY = currentY;
    this.highestYReached = 600;

    this.player = new Player(this, 200, 600, "playerTexture");

    this.physics.add.collider(
      this.player,
      this.platforms,
      (playerObj, platformObj) => {
        const p = playerObj as Player;
        const plat = platformObj as Platform;
        if (p.body && p.body.touching.down && plat.body.touching.up) {
          if (plat.platformType === "subwoofer") p.jump(1.6);
          else p.jump(1);

          if (plat.platformType === "fragile") {
            plat.destroy();
            // Ricrea la piattaforma usando l'attuale moltiplicatore di difficoltà
            const diffMult = Math.min(1 + this.score / 2000, 2.5);
            this.spawnPlatform(
              this.highestPlatformY - Phaser.Math.Between(80, 220),
              diffMult,
            );
          }
        }
      },
    );

    this.physics.add.overlap(
      this.player,
      this.drinks,
      (playerObj, drinkObj) => {
        (drinkObj as Drink).destroy();
        this.collectDrink();
      },
    );
  }

  private drawPartyBar() {
    this.partyBarGraphics.clear();
    this.partyBarGraphics.fillStyle(0xdddddd, 1);
    this.partyBarGraphics.fillRect(240, 15, 140, 20);

    let color = 0x00ff00;
    if (this.partyLevel >= 34) color = 0xffff00;
    if (this.partyLevel >= 67) color = 0xff8800;
    if (this.partyLevel >= 100) color = 0xff0000;

    const barWidth = (this.partyLevel / 100) * 140;
    this.partyBarGraphics.fillStyle(color, 1);
    this.partyBarGraphics.fillRect(240, 15, barWidth, 20);
    this.partyBarGraphics.lineStyle(2, 0x000000, 1);
    this.partyBarGraphics.strokeRect(240, 15, 140, 20);
  }

  private collectDrink() {
    if (this.isWasted) return;

    // BILANCIAMENTO: Solo 5% a Drink. Ne servono 20 per sbronzarsi del tutto!
    this.partyLevel += 5;
    if (this.partyLevel >= 100) {
      this.partyLevel = 100;
      this.triggerWasted();
    }
    this.drawPartyBar();
  }

  private triggerWasted() {
    this.isWasted = true;
    const blurFx = this.cameras.main.postFX.addBlur(2, 0, 0, 1, 0xffffff, 4);
    this.cameras.main.setRotation(0);

    this.time.delayedCall(5000, () => {
      this.partyLevel = 0;
      this.isWasted = false;
      this.cameras.main.postFX.remove(blurFx);
      this.drawPartyBar();
    });
  }

  // Aggiunto parametro difficultyMultiplier
  private spawnPlatform(y: number, difficultyMultiplier: number) {
    const randomX = Phaser.Math.Between(40, 360);
    const plat = this.platforms.get(randomX, y) as Platform;

    const rand = Math.random();
    if (rand < 0.1)
      plat.initPlatform("moving", "movingTexture", difficultyMultiplier);
    else if (rand < 0.2) plat.initPlatform("fragile", "fragileTexture");
    else if (rand < 0.3) plat.initPlatform("subwoofer", "subwooferTexture");
    else plat.initPlatform("standard", "standardTexture");

    // Probabilità statica scesa al 5%
    if (Math.random() < 0.05) {
      const drink = this.drinks.get(randomX, y - 25, "drinkTexture") as Drink;
      if (drink) drink.initDrink("static");
    }

    this.highestPlatformY = Math.min(this.highestPlatformY, y);
  }

  private spawnFallingDrink() {
    const cam = this.cameras.main;
    const randomX = Phaser.Math.Between(20, 380);
    const drink = this.drinks.get(
      randomX,
      cam.scrollY - 20,
      "drinkTexture",
    ) as Drink;
    if (drink) drink.initDrink("falling");
  }

  update(time: number) {
    // Passiamo il partyLevel al Player per calcolare l'inerzia in tempo reale
    this.player.updateMovement(this.partyLevel);

    const cam = this.cameras.main;

    if (this.player.y < cam.scrollY + cam.height / 2) {
      cam.scrollY = this.player.y - cam.height / 2;
    }

    const heightGained = this.highestYReached - this.player.y;
    if (heightGained > 0) {
      let multiplier = 1;
      if (this.partyLevel >= 34 && this.partyLevel < 67) multiplier = 1.5;
      if (this.partyLevel >= 67 && this.partyLevel < 100) multiplier = 2;

      this.score += (heightGained / 10) * multiplier;
      this.highestYReached = this.player.y;
      this.scoreText.setText(`${Math.floor(this.score)} m`);
    }

    // GESTIONE PROGRESSIVA DELLA SBRONZA (Wobble anticipato)
    // Inizia in modo invisibile al 34% (Brillo) e cresce matematicamente fino al 100%
    if (this.partyLevel >= 34 && !this.isWasted) {
      const drunkIntensity = Phaser.Math.Percent(this.partyLevel, 34, 100);
      const amplitude = drunkIntensity * 0.08;
      cam.setRotation(Math.sin(this.time.now / 250) * amplitude);
    } else if (!this.isWasted) {
      cam.setRotation(0);
    }

    // Caduta Drink: 1 ogni 8 secondi (dilatato)
    if (time > this.lastFallingDrinkTime + 8000) {
      this.spawnFallingDrink();
      this.lastFallingDrinkTime = time;
    }

    // RICICLO E DIFFICOLTÀ:
    // Il moltiplicatore cresce con il punteggio (es: a 2000m la difficoltà è raddoppiata) fino a un cap di 2.5x
    const currentDifficulty = Math.min(1 + this.score / 2000, 2.5);

    this.platforms.getChildren().forEach((child) => {
      const platform = child as Platform;
      if (platform.y > cam.scrollY + cam.height) {
        if (platform.isBasePlatform) {
          platform.destroy();
          return;
        }
        const randomDistance = Phaser.Math.Between(80, 220);
        const newY = this.highestPlatformY - randomDistance;
        platform.destroy();

        // Passiamo la difficoltà calcolata
        this.spawnPlatform(newY, currentDifficulty);
      }
    });

    this.drinks.getChildren().forEach((child) => {
      const drink = child as Drink;
      if (drink.y > cam.scrollY + cam.height + 50) {
        drink.destroy();
      }
    });

    if (this.player.y > cam.scrollY + cam.height) {
      this.scene.restart();
    }
  }
}
