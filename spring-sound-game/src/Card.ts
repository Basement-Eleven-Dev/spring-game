import * as Phaser from "phaser";
import { CARD } from "./GameConfig";

/**
 * Card
 * =====
 * Achievement che cade dal cielo come bonus.
 */
export class Card extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  public isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(CARD.WIDTH, CARD.HEIGHT);
    this.setDepth(15); // Davanti a piattaforme e Bouncer
  }

  /**
   * Inizializza la card e la fa cadere.
   */
  public initCard(texture: string): void {
    this.setTexture(texture);
    this.setDisplaySize(CARD.WIDTH, CARD.HEIGHT);

    if (this.body) {
      this.body.allowGravity = false;
      this.setVelocityY(CARD.FALLING_SPEED);
    }
  }

  /**
   * Facciamo ruotare la carta mentre cade
   */
  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rotation += 0.05;
  }
}
