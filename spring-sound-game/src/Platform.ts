import * as Phaser from "phaser";
import { GAME, PLATFORM, PLATFORM_TEXTURE_CATEGORY } from "./GameConfig";

/**
 * Tipi di piattaforma disponibili nel gioco:
 * - standard:  piattaforma normale, ferma
 * - moving:    si muove orizzontalmente, rimbalza ai bordi
 * - fragile:   si rompe al primo tocco (il giocatore salta e la piattaforma scompare)
 * - subwoofer: trampolino, dà un salto potenziato (x1.6)
 */
export type PlatformType = "standard" | "moving" | "fragile" | "subwoofer";

/**
 * Platform
 * ========
 * Sprite fisico che rappresenta una piattaforma.
 * Viene usato come classType nel gruppo Phaser, quindi
 * NON si auto-aggiunge alla scena (lo fa il gruppo).
 */
export class Platform extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  /** Se true, è una piattaforma speciale (pavimento iniziale o DJ Stage) che non viene riciclata */
  public isBasePlatform: boolean = false;
  /** Il tipo di piattaforma corrente */
  public platformType: PlatformType = "standard";
  /** Se true, questa piattaforma è il checkpoint del DJ Stage (livello successivo) */
  public isDJStage: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    // Depth basso: le piattaforme stanno sotto il player (depth 5)
    this.setDepth(1);
  }

  /**
   * Inizializza la piattaforma con tipo, texture e parametri basati sul livello.
   * Chiamato dopo group.get() per configurare l'istanza.
   *
   * Le dimensioni vengono scelte in base al tipo:
   * - subwoofer: SUBWOOFER_WIDTH × SUBWOOFER_HEIGHT (spritesheet animato)
   * - fragile:   COMPACT_WIDTH × COMPACT_HEIGHT (spritesheet animato)
   * - standard/moving: dipende dalla variante grafica (wide o compact),
   *   determinata dalla mappa PLATFORM_TEXTURE_CATEGORY
   */
  public initPlatform(
    type: PlatformType,
    texture: string,
    level: number = 1,
  ): void {
    this.platformType = type;
    this.isDJStage = false;
    this.setTexture(texture);

    // --- Dimensioni in base al tipo e alla variante grafica ---
    if (type === "subwoofer") {
      this.setDisplaySize(PLATFORM.SUBWOOFER_WIDTH, PLATFORM.SUBWOOFER_HEIGHT);
      this.play("subwooferPump");
    } else if (type === "fragile") {
      this.setDisplaySize(PLATFORM.COMPACT_WIDTH, PLATFORM.COMPACT_HEIGHT);
      // Imposta il frame iniziale (intera, non rotta)
      this.setFrame(0);
    } else {
      // Standard e moving: dimensione basata sulla categoria della texture
      const category = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
      if (category === "compact") {
        this.setDisplaySize(PLATFORM.COMPACT_WIDTH, PLATFORM.COMPACT_HEIGHT);
      } else {
        this.setDisplaySize(PLATFORM.WIDE_WIDTH, PLATFORM.WIDE_HEIGHT);
      }
    }

    if (this.body) {
      // Ridimensioniamo e spostiamo l'hitbox se la piattaforma è "wide" (erba, ubriaco)
      // perché la loro texture originale ha uno spazio vuoto (padding) nella parte alta.
      // Questo evita che il giocatore o i drink appaiano fluttuanti di qualche millimetro.
      const category = PLATFORM_TEXTURE_CATEGORY[texture] ?? "wide";
      if (category === "wide" && type !== "subwoofer" && type !== "fragile") {
        // Abbassiamo l'hitbox proporzionalmente allo spazio vuoto in alto nella texture.
        // La piattaforma erba ha leggermente più spazio vuoto rispetto alla piattaforma ubriaco.
        let offsetPercent = 0.20; // Default (20%) per 'platformUbriacoTexture'
        if (texture === "platformErbaTexture") {
          offsetPercent = 0.28; // ~28% di spazio in alto per la piattaforma erba
        }
        
        const offsetY = this.height * offsetPercent;
        this.body.setSize(this.width, this.height - offsetY);
        this.body.setOffset(0, offsetY);
      } else {
        this.body.setSize(this.width, this.height);
        this.body.setOffset(0, 0);
      }

      // Fisica: la piattaforma non cade e non si muove quando colpita
      this.body.allowGravity = false;
      this.body.immovable = true;

      // Solo collisioni dall'alto: il giocatore può saltare attraverso dal basso
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
      this.body.checkCollision.up = true;

      // Reset velocità (importante per il riciclo)
      this.setVelocityX(0);

      if (type === "moving") {
        // Velocità orizzontale crescente col livello (+20% per livello)
        const speedMultiplier =
          1 + (level - 1) * PLATFORM.MOVING_SPEED_SCALE_PER_LEVEL;
        const baseSpeed =
          Phaser.Math.Between(
            PLATFORM.MOVING_SPEED_MIN,
            PLATFORM.MOVING_SPEED_MAX,
          ) * speedMultiplier;
        this.setVelocityX(baseSpeed * (Math.random() < 0.5 ? 1 : -1));
      }
    }
  }

  /**
   * Update chiamato automaticamente dal gruppo ogni frame.
   * Le piattaforme mobili rimbalzano ai bordi dello schermo.
   */
  public update(): void {
    if (this.platformType === "moving" && this.body) {
      const halfWidth = this.displayWidth / 2;

      if (this.x < halfWidth) {
        this.x = halfWidth;
        this.setVelocityX(Math.abs(this.body.velocity.x));
      } else if (this.x > GAME.WIDTH - halfWidth) {
        this.x = GAME.WIDTH - halfWidth;
        this.setVelocityX(-Math.abs(this.body.velocity.x));
      }
    }
  }
}
