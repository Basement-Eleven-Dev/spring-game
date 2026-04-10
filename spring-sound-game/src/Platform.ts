import * as Phaser from "phaser";
import { GAME, PLATFORM } from "./GameConfig";

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
  }

  /**
   * Inizializza la piattaforma con tipo, texture e parametri basati sul livello.
   * Chiamato dopo group.get() per configurare l'istanza.
   */
  public initPlatform(type: PlatformType, texture: string, level: number = 1): void {
    this.platformType = type;
    this.isDJStage = false;
    this.setTexture(texture);

    // Dimensioni: il subwoofer è quadrato, le altre sono rettangolari
    if (type === "subwoofer") {
      this.setDisplaySize(PLATFORM.SUBWOOFER_SIZE, PLATFORM.SUBWOOFER_SIZE);
    } else {
      this.setDisplaySize(PLATFORM.WIDTH, PLATFORM.HEIGHT);
    }

    if (this.body) {
      this.body.setSize(this.width, this.height);
      this.body.setOffset(0, 0);

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
        const speedMultiplier = 1 + (level - 1) * PLATFORM.MOVING_SPEED_SCALE_PER_LEVEL;
        const baseSpeed =
          Phaser.Math.Between(PLATFORM.MOVING_SPEED_MIN, PLATFORM.MOVING_SPEED_MAX) *
          speedMultiplier;
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
