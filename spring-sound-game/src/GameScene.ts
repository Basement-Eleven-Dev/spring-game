import * as Phaser from "phaser";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { Drink } from "./Drink";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.Group;
  private drinks!: Phaser.Physics.Arcade.Group;

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
  private currentBlurFx: Phaser.FX.Blur | null = null;

  private lastDrinkSpawnY: number = 600;
  private lastBouncerSpawnY: number = 600;

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

  preload() {
    // Il primo parametro è la chiave (la stessa che usavamo nei rettangoli),
    // il secondo è il percorso del file partendo dalla cartella public/
    this.load.image("playerTexture", "/assets/player.png");
    this.load.image("standardTexture", "/assets/pedana_standard.png");
    this.load.image("fragileTexture", "/assets/pedana_rotta.png");
    this.load.image("subwooferTexture", "/assets/trampolino.png");
    this.load.image("drinkTexture", "/assets/drink.png");
    this.load.image("movingTexture", "/assets/pedana_scorrevole.png");
    this.load.image("bouncerTexture", "/assets/buttafuori.png");
  }

  create() {
    this.currentLevel = 1;
    this.distance = 0;
    this.score = 0;
    this.partyLevel = 0;
    this.isWasted = false;
    this.currentBlurFx = null;

    this.physics.world.gravity.y = 800;
    this.cameras.main.setBackgroundColor("#87CEEB");

    this.createTexture("mudTexture", 0x654321, 40, 10);
    this.createTexture("djStageTexture", 0xff00ff, 400, 20);

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
    if (basePlatform.body)
      basePlatform.body.setSize(basePlatform.width, basePlatform.height);

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

    this.physics.add.collider(
      this.player,
      this.platforms,
      (playerObj, platformObj) => {
        const p = playerObj as Player;
        const plat = platformObj as Platform;

        if (p.body && p.body.touching.down && plat.body.touching.up) {
          if ((plat as any).isDJStage) {
            (plat as any).isDJStage = false;

            this.currentLevel++;
            this.score += 1000 * this.currentLevel;

            const newGravity = 800 * (1 + (this.currentLevel - 1) * 0.15);
            this.physics.world.gravity.y = newGravity;

            this.partyLevel = 0;
            this.isWasted = false;

            if (this.currentBlurFx) {
              this.cameras.main.postFX.remove(this.currentBlurFx);
              this.currentBlurFx = null;
            }

            this.cameras.main.setRotation(0);
            this.drawPartyBar();

            this.showLevelUpVisual();
            p.jump(1.3, this.currentLevel);
            return;
          }

          const isTouchingMud = this.physics.overlap(p, this.muds);

          if (plat.platformType === "subwoofer") {
            p.jump(1.6, this.currentLevel);
          } else if (isTouchingMud) {
            p.jump(0.5, this.currentLevel);
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

    // FIX TS: Aggiunto underscore per indicare a TS che playerObj è intenzionalmente inutilizzato
    this.physics.add.overlap(
      this.player,
      this.drinks,
      (_playerObj, drinkObj) => {
        (drinkObj as Phaser.Physics.Arcade.Sprite).destroy();
        this.collectDrink();
      },
    );

    // FIX TS: Aggiunto underscore per bouncerObj
    this.physics.add.collider(
      this.player,
      this.bouncers,
      (playerObj, _bouncerObj) => {
        const p = playerObj as Player;
        if (p.body) {
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

    this.partyLevel += 8;
    if (this.partyLevel >= 100) {
      this.partyLevel = 100;
      this.triggerWasted();
    }
    this.drawPartyBar();
  }

  private triggerWasted() {
    this.isWasted = true;

    this.currentBlurFx = this.cameras.main.postFX.addBlur(
      2,
      0,
      0,
      1,
      0xffffff,
      4,
    );

    this.time.delayedCall(4500, () => {
      const cam = this.cameras.main;
      const nextY = cam.scrollY - 150;

      const clearAbove = (group: Phaser.Physics.Arcade.Group) => {
        const children = [...group.getChildren()];
        children.forEach((child) => {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (sprite.y < nextY + 50) {
            sprite.destroy();
          }
        });
      };

      clearAbove(this.platforms);
      clearAbove(this.drinks);
      clearAbove(this.muds);
      clearAbove(this.bouncers);

      const djStage = this.platforms.get(
        200,
        nextY,
        "djStageTexture",
      ) as Platform;
      djStage.initPlatform("standard", "djStageTexture", this.currentLevel);
      djStage.setDisplaySize(400, 20);
      djStage.isBasePlatform = true;

      if (djStage.body) {
        djStage.body.setSize(djStage.width, djStage.height);
        (djStage as any).isDJStage = true;
      }

      this.highestPlatformY = nextY;
      for (let i = 0; i < 8; i++) {
        this.highestPlatformY -= Phaser.Math.Between(120, 220);
        this.spawnPlatform(this.highestPlatformY);
      }
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

      if (
        this.currentLevel >= 2 &&
        Math.random() < Math.min(0.2 + this.currentLevel * 0.05, 0.5)
      ) {
        const offset = Math.random() < 0.5 ? -20 : 20;
        this.muds.get(randomX + offset, y - 7, "mudTexture");
      }
    }

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

  private spawnBouncerTelegraph() {
    const randomX = Phaser.Math.Between(40, 360);

    const warningText = this.add
      .text(randomX, 80, "!", {
        fontSize: "60px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.tweens.add({
      targets: warningText,
      alpha: 0,
      duration: 150,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        warningText.destroy();
        this.spawnBouncer(randomX, this.cameras.main.scrollY - 30);
      },
    });
  }

  private spawnBouncer(x: number, y: number) {
    const bouncer = this.bouncers.get(
      x,
      y,
      "bouncerTexture",
    ) as Phaser.Physics.Arcade.Sprite;

    if (bouncer && bouncer.body) {
      // 1. FORZIAMO LA GRANDEZZA VISIVA (es. 60x60 pixel)
      bouncer.setDisplaySize(80, 80);

      // 2. FORZIAMO LA HITBOX FISICA (basata sull'originale, così scala bene)
      bouncer.body.setSize(80, 80);

      // La velocità di caduta che avevamo già impostato
      bouncer.setVelocityY(250 + this.currentLevel * 20);
    }
  }
  update() {
    this.player.updateMovement(this.partyLevel, this.isWasted);

    const cam = this.cameras.main;

    const targetY = this.player.y - cam.height / 2;
    // Se il giocatore sta salendo oltre la metà dello schermo...
    if (targetY < cam.scrollY) {
      // Invece dello scatto secco, usiamo l'ammortizzatore!
      // Il valore 0.15 è la fluidità (1 = scatto rigido, 0.05 = lentissimo)
      cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.15);
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

    if (this.highestYReached < this.lastDrinkSpawnY - 250) {
      this.spawnFallingDrink();
      this.lastDrinkSpawnY = this.highestYReached;
    }

    if (this.currentLevel >= 1) {
      const bouncerInterval = Math.max(700 - this.currentLevel * 50, 350);
      if (this.highestYReached < this.lastBouncerSpawnY - bouncerInterval) {
        this.spawnBouncerTelegraph();
        this.lastBouncerSpawnY = this.highestYReached;
      }
    }

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
