import * as Phaser from "phaser";
import {
  GAME,
  INITIAL,
  PLATFORM,
  PLATFORM_STANDARD_TEXTURES,
  PLATFORM_TEXTURE_CATEGORY,
  MUD,
  DRINK,
  BOUNCER,
  LEVEL,
} from "../GameConfig";
import { Platform } from "../Platform";
import { Drink } from "../Drink";
import { Bouncer } from "../Bouncer";

/**
 * SpawnManager
 * =============
 * Centralizza la creazione, il riciclo e la pulizia di tutte le entità di gioco:
 * - Piattaforme (standard, mobili, fragili, subwoofer)
 * - Drink (statici su piattaforma o cadenti dall'alto)
 * - Fango (rallenta il salto)
 * - Bouncer (buttafuori fermi su un bordo della piattaforma)
 * - DJ Stage (checkpoint di livello)
 *
 * Possiede tutti i gruppi fisici Phaser e li espone per i collider.
 */
export class SpawnManager {
  private scene: Phaser.Scene;

  // --- Gruppi fisici (pubblici per permettere i collider in GameScene) ---
  public platforms!: Phaser.Physics.Arcade.Group;
  public drinks!: Phaser.Physics.Arcade.Group;
  public muds!: Phaser.Physics.Arcade.Group;
  public bouncers!: Phaser.Physics.Arcade.Group;

  // --- Tracking per lo spawning ---
  private _highestPlatformY: number = 0;
  private lastPlatformX: number = GAME.WIDTH / 2;
  private lastDrinkSpawnY: number = INITIAL.PLAYER_START_Y;
  /** Y dell'ultimo bouncer spawnato — per garantire distanza minima */
  private lastBouncerSpawnY: number = -Infinity;
  /** Y dell'ultimo subwoofer spawnato — per evitare clustering */
  private lastSubwooferSpawnY: number = -Infinity;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
    this.createGroups();
  }

  /** Shorthand per scalare valori di riferimento */
  private r: (v: number) => number;

  /** Crea i gruppi fisici e le texture procedurali (DJ stage) */
  private createGroups(): void {
    // Texture procedurale per il DJ Stage (rettangolo magenta)
    const djGfx = this.scene.add.graphics();
    djGfx.fillStyle(0xff00ff, 1);
    djGfx.fillRect(0, 0, GAME.WIDTH, this.r(20));
    djGfx.generateTexture("djStageTexture", GAME.WIDTH, this.r(20));
    djGfx.destroy();

    // Gruppo piattaforme — usa Platform come classType, con update automatico
    this.platforms = this.scene.physics.add.group({
      classType: Platform,
      runChildUpdate: true,
    });

    // Gruppo drink
    this.drinks = this.scene.physics.add.group({
      classType: Drink,
      runChildUpdate: true,
    });

    // Gruppo fango — statico, immobile
    this.muds = this.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    // Gruppo bouncer — usa Bouncer come classType
    this.bouncers = this.scene.physics.add.group({
      classType: Bouncer,
      allowGravity: false,
      immovable: true,
    });
  }

  /**
   * Genera la piattaforma base (pavimento) e le piattaforme iniziali.
   * Chiamato una volta sola in GameScene.create().
   */
  public spawnInitialPlatforms(level: number): void {
    // Piattaforma base larga quanto lo schermo (usa la prima variante standard)
    const baseTexture = PLATFORM_STANDARD_TEXTURES[0];
    const basePlatform = this.platforms.get(
      GAME.WIDTH / 2,
      INITIAL.BASE_PLATFORM_Y,
      baseTexture,
    ) as Platform;
    basePlatform.isBasePlatform = true;
    basePlatform.initPlatform("standard", baseTexture, level);
    basePlatform.setDisplaySize(PLATFORM.BASE_WIDTH, PLATFORM.BASE_HEIGHT);
    if (basePlatform.body) {
      basePlatform.body.setSize(basePlatform.width, basePlatform.height);
    }

    // Spacing variabile per livello (come in spawnPlatform)
    let spacingMin: number, spacingMax: number;
    if (level === 1) {
      spacingMin = PLATFORM.SPACING_MIN_LVL1;
      spacingMax = PLATFORM.SPACING_MAX_LVL1;
    } else if (level === 2) {
      spacingMin = PLATFORM.SPACING_MIN_LVL2;
      spacingMax = PLATFORM.SPACING_MAX_LVL2;
    } else {
      spacingMin = PLATFORM.SPACING_MIN;
      spacingMax = PLATFORM.SPACING_MAX;
    }

    // Genera le piattaforme verso l'alto
    let currentY = INITIAL.BASE_PLATFORM_Y;
    for (let i = 1; i <= PLATFORM.INITIAL_COUNT; i++) {
      currentY -= Phaser.Math.Between(spacingMin, spacingMax);
      this.spawnPlatform(currentY, level);
    }

    this._highestPlatformY = currentY;
    this.lastPlatformX = GAME.WIDTH / 2;
    this.lastDrinkSpawnY = INITIAL.PLAYER_START_Y;
  }

  /**
   * Genera una piattaforma alla coordinata Y specificata.
   * Il mix di piattaforme è definito PER LIVELLO per progressione didattica.
   */
  public spawnPlatform(y: number, level: number): void {
    // Spacing variabile per livello
    let spacingMin: number, spacingMax: number;
    if (level === 1) {
      spacingMin = PLATFORM.SPACING_MIN_LVL1;
      spacingMax = PLATFORM.SPACING_MAX_LVL1;
    } else if (level === 2) {
      spacingMin = PLATFORM.SPACING_MIN_LVL2;
      spacingMax = PLATFORM.SPACING_MAX_LVL2;
    } else {
      spacingMin = PLATFORM.SPACING_MIN;
      spacingMax = PLATFORM.SPACING_MAX;
    }

    // Posizione X raggiungibile dalla piattaforma precedente
    const minX = Math.max(this.r(40), this.lastPlatformX - PLATFORM.REACH_X);
    const maxX = Math.min(
      GAME.WIDTH - this.r(40),
      this.lastPlatformX + PLATFORM.REACH_X,
    );
    const randomX = Phaser.Math.Between(minX, maxX);
    this.lastPlatformX = randomX;

    const plat = this.platforms.get(randomX, y) as Platform;

    // --- PROGRESSIONE PER LIVELLO ---
    const rand = Math.random();
    let canHaveBouncer = false;
    let platWidth: number;
    let texture: string = "";
    let cat: "wide" | "compact";

    if (level === 1) {
      // LIVELLO 1: 80% erba, 15% ubriaco, 5% moving (erba)
      if (rand < 0.8) {
        texture = "platformErbaTexture";
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
      } else if (rand < 0.95) {
        texture = "platformUbriacoTexture";
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
      } else {
        texture = "platformErbaTexture";
        plat.initPlatform("moving", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
      }
      canHaveBouncer = false;
    } else if (level === 2) {
      // LIVELLO 2: 60% wide, 30% compact, 10% moving (wide)
      if (rand < 0.6) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.9) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformCassaTexture",
          "platformCassaErbaTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "compact";
        platWidth = PLATFORM.COMPACT_WIDTH;
        canHaveBouncer = false;
      } else {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("moving", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      }
    } else if (level === 3) {
      // LIVELLO 3: 45% wide, 25% compact, 15% moving, 15% subwoofer
      if (rand < 0.45) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.7) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformCassaTexture",
          "platformCassaErbaTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "compact";
        platWidth = PLATFORM.COMPACT_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.85) {
        texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
        plat.initPlatform("moving", texture, level);
        cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
        platWidth =
          cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else {
        // Evita configurazioni impossibili di subwoofer raggruppati
        if (Math.abs(y - this.lastSubwooferSpawnY) > this.r(300)) {
          plat.initPlatform("subwoofer", "subwooferSheet", level);
          platWidth = PLATFORM.SUBWOOFER_WIDTH;
          cat = "compact";
          canHaveBouncer = false;
          this.lastSubwooferSpawnY = y;
        } else {
          texture = "platformErbaTexture";
          plat.initPlatform("standard", texture, level);
          platWidth = PLATFORM.WIDE_WIDTH;
          cat = "wide";
          canHaveBouncer = false;
        }
      }
    } else if (level === 4) {
      // LIVELLO 4: 40% wide, 20% compact, 15% moving, 10% subwoofer, 15% fragile
      if (rand < 0.4) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.6) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformCassaTexture",
          "platformCassaErbaTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "compact";
        platWidth = PLATFORM.COMPACT_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.75) {
        texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
        plat.initPlatform("moving", texture, level);
        cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
        platWidth =
          cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.85) {
        // Evita configurazioni impossibili di subwoofer raggruppati
        if (Math.abs(y - this.lastSubwooferSpawnY) > this.r(300)) {
          plat.initPlatform("subwoofer", "subwooferSheet", level);
          platWidth = PLATFORM.SUBWOOFER_WIDTH;
          cat = "compact";
          canHaveBouncer = false;
          this.lastSubwooferSpawnY = y;
        } else {
          texture = "platformErbaTexture";
          plat.initPlatform("standard", texture, level);
          platWidth = PLATFORM.WIDE_WIDTH;
          cat = "wide";
          canHaveBouncer = true;
        }
      } else {
        plat.initPlatform("fragile", "fragileSheet", level);
        platWidth = PLATFORM.COMPACT_WIDTH;
        cat = "compact";
        canHaveBouncer = true;
      }
    } else if (level === 5) {
      // LIVELLO 5: Come 4 ma fragile 18%, inizia il fango
      if (rand < 0.39) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.6) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformCassaTexture",
          "platformCassaErbaTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "compact";
        platWidth = PLATFORM.COMPACT_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.75) {
        texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
        plat.initPlatform("moving", texture, level);
        cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
        platWidth =
          cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.82) {
        if (Math.abs(y - this.lastSubwooferSpawnY) > this.r(300)) {
          plat.initPlatform("subwoofer", "subwooferSheet", level);
          platWidth = PLATFORM.SUBWOOFER_WIDTH;
          cat = "compact";
          canHaveBouncer = false;
          this.lastSubwooferSpawnY = y;
        } else {
          texture = "platformErbaTexture";
          plat.initPlatform("standard", texture, level);
          platWidth = PLATFORM.WIDE_WIDTH;
          cat = "wide";
          canHaveBouncer = true;
        }
      } else {
        plat.initPlatform("fragile", "fragileSheet", level);
        platWidth = PLATFORM.COMPACT_WIDTH;
        cat = "compact";
        canHaveBouncer = true;
      }
    } else {
      // LIVELLO 6+: 38% wide, 20% compact, 15% moving, 7% subwoofer, 20% fragile
      if (rand < 0.38) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformErbaTexture",
          "platformUbriacoTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "wide";
        platWidth = PLATFORM.WIDE_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.58) {
        texture = Phaser.Utils.Array.GetRandom([
          "platformCassaTexture",
          "platformCassaErbaTexture",
        ]);
        plat.initPlatform("standard", texture, level);
        cat = "compact";
        platWidth = PLATFORM.COMPACT_WIDTH;
        canHaveBouncer = true;
      } else if (rand < 0.73) {
        texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
        plat.initPlatform("moving", texture, level);
        cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
        platWidth =
          cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
        canHaveBouncer = false;
      } else if (rand < 0.8) {
        if (Math.abs(y - this.lastSubwooferSpawnY) > this.r(300)) {
          plat.initPlatform("subwoofer", "subwooferSheet", level);
          platWidth = PLATFORM.SUBWOOFER_WIDTH;
          cat = "compact";
          canHaveBouncer = false;
          this.lastSubwooferSpawnY = y;
        } else {
          texture = "platformErbaTexture";
          plat.initPlatform("standard", texture, level);
          platWidth = PLATFORM.WIDE_WIDTH;
          cat = "wide";
          canHaveBouncer = true;
        }
      } else {
        plat.initPlatform("fragile", "fragileSheet", level);
        platWidth = PLATFORM.COMPACT_WIDTH;
        cat = "compact";
        canHaveBouncer = true;
      }
    }

    // --- FANGO sulle piattaforme standard wide (dal livello 5) ---
    if (
      plat.platformType === "standard" &&
      cat === "wide" &&
      level >= MUD.MIN_LEVEL &&
      Math.random() <
        Math.min(
          MUD.BASE_PROB + (level - MUD.MIN_LEVEL) * MUD.PROB_PER_LEVEL,
          MUD.MAX_PROB,
        )
    ) {
      let offsetX = 0;
      if (texture === "platformUbriacoTexture") {
        offsetX = MUD.UBRIACO_OFFSET_X;
      } else if (texture === "platformErbaTexture") {
        offsetX = Phaser.Math.Between(-MUD.ERBA_RANDOMIZE, MUD.ERBA_RANDOMIZE);
      }

      const mud = this.muds.get(
        randomX + offsetX,
        y - this.r(7),
        "fangoTexture",
      ) as Phaser.Physics.Arcade.Sprite;

      if (mud) {
        mud.setDisplaySize(MUD.WIDTH, 0);
        const aspectRatio = mud.height / mud.width;
        mud.setDisplaySize(MUD.WIDTH, MUD.WIDTH * aspectRatio);
        if (mud.body) {
          (mud.body as Phaser.Physics.Arcade.Body).setSize(
            mud.displayWidth,
            mud.displayHeight,
          );
        }
      }
    }

    // --- BOUNCER (dal livello 6) ---
    const activeBouncerCount = this.bouncers
      .getChildren()
      .filter((c) => c.active).length;
    if (
      canHaveBouncer &&
      level >= BOUNCER.MIN_LEVEL &&
      activeBouncerCount < 1 &&
      Math.abs(y - this.lastBouncerSpawnY) >= BOUNCER.MIN_SPAWN_SPACING &&
      Math.abs(y - this.lastSubwooferSpawnY) > this.r(150) && // Evita bouncer immediatamente sopra subwoofer
      Math.random() <
        Math.min(
          BOUNCER.BASE_PROB +
            (level - BOUNCER.MIN_LEVEL) * BOUNCER.PROB_PER_LEVEL,
          BOUNCER.MAX_PROB,
        )
    ) {
      const bouncerOffset = platWidth / 2 - BOUNCER.WIDTH / 2 - this.r(4);
      const side = Math.random() < 0.5 ? -1 : 1;
      const bouncerX = randomX + side * bouncerOffset;
      const platHeight =
        platWidth === PLATFORM.COMPACT_WIDTH
          ? PLATFORM.COMPACT_HEIGHT
          : PLATFORM.WIDE_HEIGHT;
      const bouncerY = y - platHeight / 2 + this.r(20);
      const bouncer = this.bouncers.get(
        bouncerX,
        bouncerY,
        "bouncerSheet",
      ) as Bouncer;
      if (bouncer) {
        bouncer.initBouncer();
        this.lastBouncerSpawnY = y;
      }
    }

    // --- DRINK su piattaforma (probabilità variabile per livello) ---
    let drinkProb: number;
    if (level === 1) {
      drinkProb = 0.2; // 20% - più drink per accelerare il party level
    } else if (level === 2) {
      drinkProb = 0.18; // 18% - ancora abbondanti
    } else if (level === 3) {
      drinkProb = 0.14; // 14% - inizia a ridursi
    } else if (level === 4) {
      drinkProb = 0.12;
    } else if (level === 5) {
      drinkProb = 0.11;
    } else if (level === 6) {
      drinkProb = 0.1;
    } else {
      drinkProb = 0.09;
    }

    if (Math.random() < drinkProb) {
      const drink = this.drinks.get(
        randomX,
        y - this.r(25),
        "beerTexture",
      ) as Drink;
      if (drink) drink.initDrink("static", "beerTexture", plat);
    }

    // Aggiorna la Y più alta dove esiste una piattaforma
    this._highestPlatformY = Math.min(this._highestPlatformY, y);
  }

  /** Genera un drink che cade dall'alto dello schermo */
  public spawnFallingDrink(camScrollY: number): void {
    const randomX = Phaser.Math.Between(this.r(20), GAME.WIDTH - this.r(20));
    const drink = this.drinks.get(
      randomX,
      camScrollY - this.r(20),
      "drinkTexture",
    ) as Drink;
    if (drink) drink.initDrink("falling", "drinkTexture");
  }

  /**
   * Genera il DJ Stage (piattaforma checkpoint) e nuove piattaforme sopra di esso.
   * Chiamato quando l'evento 'wasted-ready' viene emesso da PartyManager.
   */
  public spawnDJStage(camScrollY: number, level: number): void {
    const nextY = camScrollY - LEVEL.DJ_STAGE_OFFSET;

    // Pulisci tutte le entità sopra il DJ Stage
    this.clearAbove(nextY + this.r(50));

    // Crea il palco DJ
    const djStage = this.platforms.get(
      GAME.WIDTH / 2,
      nextY,
      "djStageTexture",
    ) as Platform;
    djStage.initPlatform("standard", "djStageTexture", level);
    djStage.setDisplaySize(GAME.WIDTH, this.r(20));
    djStage.isBasePlatform = true;
    djStage.isDJStage = true;

    if (djStage.body) {
      djStage.body.setSize(djStage.width, djStage.height);

      // FIX BUG #2: il DJ Stage ha collisione da TUTTE le direzioni.
      // Senza questo, il giocatore lo attraversa dal basso e salta il livello.
      // Dopo il level-up, la collisione viene resettata a "solo dall'alto"
      // in GameScene.setupColliders() per permettere il salto successivo.
      djStage.body.checkCollision.down = true;
      djStage.body.checkCollision.left = true;
      djStage.body.checkCollision.right = true;
    }

    // Genera nuove piattaforme sopra il DJ Stage
    this._highestPlatformY = nextY;
    for (let i = 0; i < LEVEL.DJ_STAGE_PLATFORMS; i++) {
      this._highestPlatformY -= Phaser.Math.Between(
        LEVEL.DJ_STAGE_SPACING_MIN,
        LEVEL.DJ_STAGE_SPACING_MAX,
      );
      this.spawnPlatform(this._highestPlatformY, level);
    }
  }

  /** Rimuove tutte le entità (di tutti i gruppi) che si trovano sopra la coordinata Y */
  public clearAbove(y: number): void {
    const clearGroup = (group: Phaser.Physics.Arcade.Group) => {
      const children = [...group.getChildren()];
      children.forEach((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.y < y) sprite.destroy();
      });
    };

    clearGroup(this.platforms);
    clearGroup(this.drinks);
    clearGroup(this.muds);
    clearGroup(this.bouncers);
  }

  /**
   * Ricicla le piattaforme uscite dal fondo dello schermo:
   * le distrugge e ne genera di nuove in alto.
   */
  public recyclePlatforms(
    camScrollY: number,
    camHeight: number,
    level: number,
  ): void {
    const children = [...this.platforms.getChildren()];
    children.forEach((child) => {
      const platform = child as Platform;
      if (platform.y > camScrollY + camHeight) {
        if (platform.isBasePlatform) {
          platform.destroy();
          return;
        }
        const newY =
          this._highestPlatformY -
          Phaser.Math.Between(PLATFORM.SPACING_MIN, PLATFORM.SPACING_MAX);
        platform.destroy();
        this.spawnPlatform(newY, level);
      }
    });
  }

  /** Rimuove drink, fango e bouncer usciti dal fondo dello schermo */
  public cleanupOffscreen(camScrollY: number, camHeight: number): void {
    const cleanupGroup = (group: Phaser.Physics.Arcade.Group) => {
      group.getChildren().forEach((child) => {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (sprite.y > camScrollY + camHeight + this.r(50)) sprite.destroy();
      });
    };

    cleanupGroup(this.drinks);
    cleanupGroup(this.muds);
    cleanupGroup(this.bouncers);
  }

  /**
   * Controlla se è il momento di spawnare drink cadenti
   * in base alla distanza percorsa dal giocatore.
   * I drink cadenti iniziano dal livello 2.
   */
  public checkSpawns(
    highestYReached: number,
    level: number,
    camScrollY: number,
  ): void {
    // Drink cadenti: dal livello 1, con intervallo variabile
    if (level < DRINK.FALLING_MIN_LEVEL) return;

    let interval: number;
    if (level === 1) {
      interval = this.r(400); // Raro nel livello 1
    } else if (level === 2) {
      interval = this.r(350);
    } else if (level === 3) {
      interval = this.r(300);
    } else if (level === 4) {
      interval = this.r(280);
    } else if (level === 5) {
      interval = this.r(260);
    } else if (level === 6) {
      interval = this.r(250);
    } else {
      interval = this.r(240);
    }

    if (highestYReached < this.lastDrinkSpawnY - interval) {
      this.spawnFallingDrink(camScrollY);
      this.lastDrinkSpawnY = highestYReached;
    }
  }

  /** La Y della piattaforma più alta attualmente nel mondo */
  public get highestPlatformY(): number {
    return this._highestPlatformY;
  }

  public set highestPlatformY(value: number) {
    this._highestPlatformY = value;
  }
}
