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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createGroups();
  }

  /** Crea i gruppi fisici e le texture procedurali (fango, DJ stage) */
  private createGroups(): void {
    // Texture procedurale per il fango (rettangolo marrone)
    const mudGfx = this.scene.add.graphics();
    mudGfx.fillStyle(0x654321, 1);
    mudGfx.fillRect(0, 0, MUD.WIDTH, MUD.HEIGHT);
    mudGfx.generateTexture("mudTexture", MUD.WIDTH, MUD.HEIGHT);
    mudGfx.destroy();

    // Texture procedurale per il DJ Stage (rettangolo magenta)
    const djGfx = this.scene.add.graphics();
    djGfx.fillStyle(0xff00ff, 1);
    djGfx.fillRect(0, 0, GAME.WIDTH, 20);
    djGfx.generateTexture("djStageTexture", GAME.WIDTH, 20);
    djGfx.destroy();

    // Gruppo piattaforme — usa Platform come classType, con update automatico
    this.platforms = this.scene.physics.add.group({
      classType: Platform,
      runChildUpdate: true,
    });

    // Gruppo drink
    this.drinks = this.scene.physics.add.group({ classType: Drink });

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

    // Genera le piattaforme verso l'alto
    let currentY = INITIAL.BASE_PLATFORM_Y;
    for (let i = 1; i <= PLATFORM.INITIAL_COUNT; i++) {
      currentY -= Phaser.Math.Between(
        PLATFORM.SPACING_MIN,
        PLATFORM.SPACING_MAX,
      );
      this.spawnPlatform(currentY, level);
    }

    this._highestPlatformY = currentY;
    this.lastPlatformX = GAME.WIDTH / 2;
    this.lastDrinkSpawnY = INITIAL.PLAYER_START_Y;
  }

  /**
   * Genera una piattaforma alla coordinata Y specificata.
   * Il tipo viene scelto casualmente con probabilità basate sul livello:
   * - Moving:    5% + 4%/lvl (max 30%) — nessun bouncer
   * - Fragile:   0% + 6%/lvl (max 25%) — può avere bouncer
   * - Subwoofer: 8% fisso — nessun bouncer
   * - Standard:  il resto — può avere fango e/o bouncer
   *
   * Le piattaforme standard e mobili scelgono una variante grafica casuale
   * tra le 4 disponibili (erba, ubriaco, cassa, cassa_erba).
   *
   * I bouncer vengono piazzati su un bordo (sx o dx) della piattaforma,
   * così da lasciare spazio al giocatore sul lato opposto.
   */
  public spawnPlatform(y: number, level: number): void {
    // Posizione X raggiungibile dalla piattaforma precedente
    const minX = Math.max(40, this.lastPlatformX - PLATFORM.REACH_X);
    const maxX = Math.min(
      GAME.WIDTH - 40,
      this.lastPlatformX + PLATFORM.REACH_X,
    );
    const randomX = Phaser.Math.Between(minX, maxX);
    this.lastPlatformX = randomX;

    const plat = this.platforms.get(randomX, y) as Platform;

    // Calcolo probabilità
    const movingProb = Math.min(
      PLATFORM.MOVING_BASE_PROB + level * PLATFORM.MOVING_PROB_PER_LEVEL,
      PLATFORM.MOVING_MAX_PROB,
    );
    const fragileProb = Math.min(
      PLATFORM.FRAGILE_BASE_PROB + level * PLATFORM.FRAGILE_PROB_PER_LEVEL,
      PLATFORM.FRAGILE_MAX_PROB,
    );

    // Selezione del tipo di piattaforma
    const rand = Math.random();
    let canHaveBouncer = false;

    /** Larghezza effettiva della piattaforma — usata per il posizionamento del bouncer */
    let platWidth: number;

    if (rand < movingProb) {
      // Variante grafica casuale per la piattaforma mobile
      const texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
      plat.initPlatform("moving", texture, level);
      const cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
      platWidth =
        cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
      // Le piattaforme mobili non hanno bouncer (complessità fisica da evitare)
    } else if (rand < movingProb + fragileProb) {
      plat.initPlatform("fragile", "fragileSheet", level);
      platWidth = PLATFORM.COMPACT_WIDTH;
      canHaveBouncer = true;
    } else if (rand < movingProb + fragileProb + PLATFORM.SUBWOOFER_PROB) {
      plat.initPlatform("subwoofer", "subwooferSheet", level);
      platWidth = PLATFORM.SUBWOOFER_WIDTH;
      // Il subwoofer è un bonus: senza bouncer per non penalizzare chi lo usa
    } else {
      // Variante grafica casuale per la piattaforma standard
      const texture = Phaser.Utils.Array.GetRandom(PLATFORM_STANDARD_TEXTURES);
      plat.initPlatform("standard", texture, level);
      const cat = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
      platWidth =
        cat === "compact" ? PLATFORM.COMPACT_WIDTH : PLATFORM.WIDE_WIDTH;
      canHaveBouncer = true;

      // Fango sulle piattaforme standard (dal livello 3)
      if (
        level >= MUD.MIN_LEVEL &&
        Math.random() <
          Math.min(MUD.BASE_PROB + level * MUD.PROB_PER_LEVEL, MUD.MAX_PROB)
      ) {
        const offset = Math.random() < 0.5 ? -MUD.OFFSET : MUD.OFFSET;
        this.muds.get(randomX + offset, y - 7, "mudTexture");
      }
    }

    // Bouncer su un bordo della piattaforma (standard e fragile, dal livello 2)
    if (
      canHaveBouncer &&
      level >= BOUNCER.MIN_LEVEL &&
      Math.random() <
        Math.min(
          BOUNCER.BASE_PROB + level * BOUNCER.PROB_PER_LEVEL,
          BOUNCER.MAX_PROB,
        )
    ) {
      // Offset calcolato dalla larghezza effettiva della piattaforma
      const bouncerOffset = platWidth / 2 - BOUNCER.WIDTH / 2 - 4;
      const side = Math.random() < 0.5 ? -1 : 1;
      const bouncerX = randomX + side * bouncerOffset;
      const platHeight =
        platWidth === PLATFORM.COMPACT_WIDTH
          ? PLATFORM.COMPACT_HEIGHT
          : PLATFORM.WIDE_HEIGHT;
      // Il bouncer appoggia i piedi sul bordo superiore della piattaforma:
      // centro bouncer = bordo superiore piattaforma - metà altezza bouncer
      const bouncerY = y - platHeight / 2 - BOUNCER.HEIGHT / 2;
      const bouncer = this.bouncers.get(
        bouncerX,
        bouncerY,
        "bouncerSheet",
      ) as Bouncer;
      if (bouncer) bouncer.initBouncer();
    }

    // Possibilità di drink sulla piattaforma
    if (Math.random() < DRINK.SPAWN_PROB_ON_PLATFORM) {
      const drink = this.drinks.get(randomX, y - 25, "drinkTexture") as Drink;
      if (drink) drink.initDrink("static");
    }

    // Aggiorna la Y più alta dove esiste una piattaforma
    this._highestPlatformY = Math.min(this._highestPlatformY, y);
  }

  /** Genera un drink che cade dall'alto dello schermo */
  public spawnFallingDrink(camScrollY: number): void {
    const randomX = Phaser.Math.Between(20, GAME.WIDTH - 20);
    const drink = this.drinks.get(
      randomX,
      camScrollY - 20,
      "drinkTexture",
    ) as Drink;
    if (drink) drink.initDrink("falling");
  }

  /**
   * Genera il DJ Stage (piattaforma checkpoint) e nuove piattaforme sopra di esso.
   * Chiamato quando l'evento 'wasted-ready' viene emesso da PartyManager.
   */
  public spawnDJStage(camScrollY: number, level: number): void {
    const nextY = camScrollY - LEVEL.DJ_STAGE_OFFSET;

    // Pulisci tutte le entità sopra il DJ Stage
    this.clearAbove(nextY + 50);

    // Crea il palco DJ
    const djStage = this.platforms.get(
      GAME.WIDTH / 2,
      nextY,
      "djStageTexture",
    ) as Platform;
    djStage.initPlatform("standard", "djStageTexture", level);
    djStage.setDisplaySize(GAME.WIDTH, 20);
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
        if (sprite.y > camScrollY + camHeight + 50) sprite.destroy();
      });
    };

    cleanupGroup(this.drinks);
    cleanupGroup(this.muds);
    cleanupGroup(this.bouncers);
  }

  /**
   * Controlla se è il momento di spawnare drink cadenti
   * in base alla distanza percorsa dal giocatore.
   */
  public checkSpawns(
    highestYReached: number,
    _level: number,
    camScrollY: number,
  ): void {
    // Drink cadenti: ogni SPAWN_INTERVAL pixel di salita
    if (highestYReached < this.lastDrinkSpawnY - DRINK.SPAWN_INTERVAL) {
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
