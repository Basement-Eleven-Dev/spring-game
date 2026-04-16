import * as Phaser from "phaser";
import { DRINK } from "./GameConfig";

/**
 * Drink
 * =====
 * Collezionabile che alza il party level del giocatore.
 * Può essere:
 * - "static":  fermo su una piattaforma (gravità disattivata)
 * - "falling": cade dall'alto dello schermo con velocità costante
 */
export class Drink extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  /** Piattaforma a cui il drink statico è ancorato */
  private attachedPlatform?: Phaser.Physics.Arcade.Sprite;
  /** Offset X rispetto alla piattaforma */
  private offsetX: number = 0;
  /** Offset Y rispetto alla piattaforma */
  private offsetY: number = 0;

  public get isFalling(): boolean {
    return this.attachedPlatform === undefined;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(DRINK.WIDTH, DRINK.HEIGHT);
    this.setDepth(15); // Davanti a piattaforme e Bouncer
  }

  /**
   * Inizializza il drink come statico o cadente.
   * Chiamato dopo group.get() per configurare l'istanza.
   * @param type Tipo di drink ("static" o "falling")
   * @param texture La texture da usare (drink o beer)
   * @param platform Eventuale piattaforma a cui ancorare il drink statico
   */
  public initDrink(type: "static" | "falling", texture: string, platform?: Phaser.Physics.Arcade.Sprite): void {
    this.setTexture(texture);
    this.setDisplaySize(DRINK.WIDTH, DRINK.HEIGHT); // Mantiene le dimensioni corrette

    if (this.body) {
      this.body.allowGravity = false;
      if (type === "falling") {
        this.setVelocityY(DRINK.FALLING_SPEED);
        this.attachedPlatform = undefined;
      } else {
        this.setVelocityY(0);
        this.attachedPlatform = platform;
        if (platform) {
          // Calcola l'offset iniziale rispetto alla piattaforma
          this.offsetX = this.x - platform.x;
          this.offsetY = this.y - platform.y;
        }
      }
    }
  }

  /**
   * Update lifecycle del Phaser Sprite.
   * Usato per aggiornare la posizione se ancorato a una piattaforma mobile.
   */
  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.attachedPlatform && this.attachedPlatform.active) {
      this.setPosition(this.attachedPlatform.x + this.offsetX, this.attachedPlatform.y + this.offsetY);
      // Sincronizza anche il body se presente
      if (this.body) {
        this.body.updateFromGameObject();
      }
    } else if (this.attachedPlatform && !this.attachedPlatform.active) {
      // Se la piattaforma è stata distrutta o riciclata, distruggi anche il drink (o fallo cadere)
      this.attachedPlatform = undefined;
      this.destroy();
    }
  }
}
