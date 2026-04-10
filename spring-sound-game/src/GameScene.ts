import * as Phaser from "phaser";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { Drink } from "./Drink";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.Group;
  private drinks!: Phaser.Physics.Arcade.Group;

  // NUOVI GRUPPI PER GLI OSTACOLI
  private muds!: Phaser.Physics.Arcade.Group;
  private bouncers!: Phaser.Physics.Arcade.Group;

  private highestPlatformY!: number;
  private highestYReached!: number;

  private currentLevel: number = 1;
  private distance: number = 0;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private partyLevel: number = 0;
  private partyBarGraphics!: Phaser.GameObjects.Graphics;
  private isWasted: boolean = false;

  private lastDrinkSpawnY: number = 600;
  private lastBouncerSpawnY: number = 600; // Traccia quando spawnare il Buttafuori

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
    this.currentLevel = 1;
    this.distance = 0;
    this.score = 0;
    this.partyLevel = 0;
    this.isWasted = false;

    // Reset della gravità al livello base
    this.physics.world.gravity.y = 800;

    this.cameras.main.setBackgroundColor("#87CEEB");

    this.createTexture("playerTexture", 0xff0000, 40, 40);
    this.createTexture("standardTexture", 0x00ff00, 80, 15);
    this.createTexture("movingTexture", 0x0000ff, 80, 15);
    this.createTexture("fragileTexture", 0x8b4513, 80, 15);
    this.createTexture("subwooferTexture", 0xffff00, 80, 15);
    this.createTexture("drinkTexture", 0xffa500, 20, 20);

    // TEXTURE OSTACOLI
    this.createTexture("mudTexture", 0x654321, 40, 10); // Fango (Marrone scuro, largo mezza piattaforma)
    this.createTexture("bouncerTexture", 0x000000, 60, 60); // Buttafuori (Nero, grosso)

    this.scoreText = this.add
      .text(10, 10, "0m | 0 pts | Lvl 1", {
        fontSize: "18px",
        color: "#000",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.partyBarGraphics = this.add.graphics();
    this.partyBarGraphics.setScrollFactor(0).setDepth(10);
    this.drawPartyBar();

    this.platforms = this.physics.add.group({
      classType: Platform,
      runChildUpdate: true,
    });
    this.drinks = this.physics.add.group({ classType: Drink });

    // Inizializziamo i gruppi degli ostacoli (entrambi senza gravità)
    this.muds = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.bouncers = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    const basePlatform = this.platforms.get(
      200,
      680,
      "standardTexture",
    ) as Platform;
    basePlatform.isBasePlatform = true;
    basePlatform.initPlatform("standard", "standardTexture", this.currentLevel);
    basePlatform.setDisplaySize(400, 15);
    if (basePlatform.body) basePlatform.body.setSize(400, 15);

    let currentY = 680;
    for (let i = 1; i <= 12; i++) {
      currentY -= Phaser.Math.Between(80, 220);
      this.spawnPlatform(currentY);
    }

    this.highestPlatformY = currentY;
    this.highestYReached = 600;
    this.lastDrinkSpawnY = 600;
    this.lastBouncerSpawnY = 600;

    this.player = new Player(this, 200, 600, "playerTexture");

    // GESTIONE DEL SALTO (con logica Fango integrata)
    this.physics.add.collider(
      this.player,
      this.platforms,
      (playerObj, platformObj) => {
        const p = playerObj as Player;
        const plat = platformObj as Platform;

        if (p.body && p.body.touching.down && plat.body.touching.up) {
          // Verifichiamo se il giocatore sta toccando una pozza di fango proprio mentre salta
          const isTouchingMud = this.physics.overlap(p, this.muds);

          if (plat.platformType === "subwoofer") {
            p.jump(1.6, this.currentLevel);
          } else if (isTouchingMud) {
            p.jump(0.5, this.currentLevel); // SALTO DIMEZZATO DAL FANGO!
          } else {
            p.jump(1, this.currentLevel);
          }

          if (plat.platformType === "fragile") {
            plat.destroy();
            this.spawnPlatform(
              this.highestPlatformY - Phaser.Math.Between(80, 220),
            );
          }
        }
      },
    );

    this.physics.add.overlap(
      this.player,
      this.drinks,
      (playerObj, drinkObj) => {
        (drinkObj as Phaser.Physics.Arcade.Sprite).destroy();
        this.collectDrink();
      },
    );

    // COLLISIONE COL BUTTAFUORI: La schiacciata (RISOLTA!)
    this.physics.add.collider(
      this.player,
      this.bouncers,
      (playerObj, bouncerObj) => {
        const p = playerObj as Player;
        if (p.body) {
          // Ti martella giù a velocità massima, a prescindere da come o quando lo colpisci!
          p.setVelocityY(800);
        }
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

    // BILANCIAMENTO AUMENTATO: 8% a drink. Livelli molto più veloci da scalare!
    this.partyLevel += 8;
    if (this.partyLevel >= 100) {
      this.partyLevel = 100;
      this.triggerWasted();
    }
    this.drawPartyBar();
  }

  private triggerWasted() {
    this.isWasted = true;
    const blurFx = this.cameras.main.postFX.addBlur(2, 0, 0, 1, 0xffffff, 4);

    this.time.delayedCall(4500, () => {
      this.partyLevel = 0;
      this.isWasted = false;
      this.currentLevel++;

      // AUMENTO DIFFICOLTÀ: Aumentiamo la gravità base (si cade più veloci!)
      const newGravity = 800 * (1 + (this.currentLevel - 1) * 0.15);
      this.physics.world.gravity.y = newGravity;

      this.cameras.main.postFX.remove(blurFx);
      this.drawPartyBar();
      this.showLevelUpVisual();
    });
  }

  private showLevelUpVisual() {
    const lvlText = this.add
      .text(200, 350, `LEVEL ${this.currentLevel}!`, {
        fontSize: "48px",
        color: "#ff00ff",
        fontStyle: "bold",
        stroke: "#fff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.tweens.add({
      targets: lvlText,
      y: 300,
      alpha: 0,
      duration: 1500,
      ease: "Cubic.easeOut",
      onComplete: () => lvlText.destroy(),
    });
  }

  private spawnPlatform(y: number) {
    const randomX = Phaser.Math.Between(40, 360);
    const plat = this.platforms.get(randomX, y) as Platform;

    let movingProb = Math.min(0.1 + this.currentLevel * 0.05, 0.35);
    let fragileProb = Math.min(0.1 + this.currentLevel * 0.05, 0.3);

    const rand = Math.random();
    if (rand < movingProb) {
      plat.initPlatform("moving", "movingTexture", this.currentLevel);
    } else if (rand < movingProb + fragileProb) {
      plat.initPlatform("fragile", "fragileTexture", this.currentLevel);
    } else if (rand < movingProb + fragileProb + 0.1) {
      plat.initPlatform("subwoofer", "subwooferTexture", this.currentLevel);
    } else {
      plat.initPlatform("standard", "standardTexture", this.currentLevel);

      // GESTIONE FANGO (Solo sulle piattaforme standard)
      // 20% di probabilità di avere del fango, ma aumenta con i livelli
      if (Math.random() < Math.min(0.2 + this.currentLevel * 0.05, 0.5)) {
        // Decidiamo se metterlo a destra o sinistra della piattaforma (offset di 20 pixel)
        const offset = Math.random() < 0.5 ? -20 : 20;
        this.muds.get(randomX + offset, y - 7, "mudTexture");
      }
    }

    // BILANCIAMENTO AUMENTATO: 10% di avere un drink statico
    if (Math.random() < 0.1) {
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

  private spawnBouncer() {
    const cam = this.cameras.main;
    const randomX = Phaser.Math.Between(40, 360);
    // Il buttafuori è un po' più grosso e cade decisamente più in fretta (velocità 250)
    const bouncer = this.bouncers.get(
      randomX,
      cam.scrollY - 30,
      "bouncerTexture",
    ) as Phaser.Physics.Arcade.Sprite;
    if (bouncer && bouncer.body) {
      bouncer.setVelocityY(250 + this.currentLevel * 20); // Diventa più veloce ai livelli alti
    }
  }

  update() {
    this.player.updateMovement(this.partyLevel, this.isWasted);

    const cam = this.cameras.main;

    if (this.player.y < cam.scrollY + cam.height / 2) {
      cam.scrollY = this.player.y - cam.height / 2;
    }

    const heightGained = this.highestYReached - this.player.y;
    if (heightGained > 0) {
      let multiplier = 1;
      if (this.partyLevel >= 34 && this.partyLevel < 67) multiplier = 1.5;
      if (this.partyLevel >= 67 && this.partyLevel < 100) multiplier = 2;
      if (this.isWasted) multiplier = 3;

      const metersGained = heightGained / 10;
      this.distance += metersGained;
      this.score += metersGained * this.currentLevel * multiplier;

      this.highestYReached = this.player.y;
      this.scoreText.setText(
        `${Math.floor(this.distance)}m | ${Math.floor(this.score)} pts | Lvl ${this.currentLevel}`,
      );
    }

    if (this.partyLevel >= 34 || this.isWasted) {
      let drunkIntensity = this.isWasted
        ? 1.0
        : Phaser.Math.Percent(this.partyLevel, 34, 100);
      const amplitude = Math.pow(drunkIntensity, 2) * 0.06;
      cam.setRotation(Math.sin(this.time.now / 200) * amplitude);
    } else {
      cam.setRotation(0);
    }

    // BILANCIAMENTO AUMENTATO: Cade un drink ogni 250 metri (anziché 400)
    if (this.highestYReached < this.lastDrinkSpawnY - 250) {
      this.spawnFallingDrink();
      this.lastDrinkSpawnY = this.highestYReached;
    }

    // SPAWN BUTTAFUORI: Ne cade uno ogni 700 metri circa (più frequente salendo di livello)
    const bouncerInterval = Math.max(700 - this.currentLevel * 50, 350);
    if (this.highestYReached < this.lastBouncerSpawnY - bouncerInterval) {
      this.spawnBouncer();
      this.lastBouncerSpawnY = this.highestYReached;
    }

    // PULIZIA OSTACOLI e PIATTAFORME FUORI SCHERMO
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
        this.spawnPlatform(newY);
      }
    });

    // Helper per pulire oggetti che cadono o restano indietro
    const cleanupGroup = (group: Phaser.Physics.Arcade.Group) => {
      group.getChildren().forEach((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.y > cam.scrollY + cam.height + 50) sprite.destroy();
      });
    };

    cleanupGroup(this.drinks);
    cleanupGroup(this.muds);
    cleanupGroup(this.bouncers);

    if (this.player.y > cam.scrollY + cam.height) {
      this.scene.restart();
    }
  }
}
