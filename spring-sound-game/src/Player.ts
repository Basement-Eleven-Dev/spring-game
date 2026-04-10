import * as Phaser from "phaser";
import { GAME, PLAYER } from "./GameConfig";

/**
 * Player
 * ======
 * Sprite del giocatore con due sistemi di input:
 * 1. Tastiera (frecce) — per giocare su PC
 * 2. Touch (tap sx/dx dello schermo) — per smartphone
 *
 * Il movimento orizzontale è soggetto a inerzia crescente
 * con il party level (effetto "ubriachezza").
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER.SIZE, PLAYER.SIZE);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      throw new Error("Tastiera non rilevata.");
    }
  }

  /**
   * Fa saltare il giocatore verso l'alto.
   * La forza del salto è proporzionale al livello e al moltiplicatore
   * (es. 1.6 per subwoofer, 0.8 per fango, 1.3 per DJ Stage).
   */
  public jump(multiplier: number = 1, currentLevel: number = 1): void {
    const levelSpeedMultiplier = 1 + (currentLevel - 1) * 0.15;
    this.setVelocityY(-PLAYER.JUMP_FORCE * levelSpeedMultiplier * multiplier);
  }

  /**
   * Aggiorna il movimento orizzontale del giocatore ogni frame.
   *
   * Priorità degli input:
   * 1. Tastiera (frecce sx/dx)
   * 2. Touch (tap nella metà sx/dx dello schermo)
   *
   * L'inerzia aumenta col party level: più sei ubriaco, più il personaggio
   * è lento a cambiare direzione (lerp factor scende da 1 a 0.15).
   */
  public updateMovement(partyLevel: number, isWasted: boolean): void {
    let targetSpeed = 0;

    // 1. INPUT TASTIERA (PC)
    if (this.cursors.left.isDown) targetSpeed = -PLAYER.MOVE_SPEED;
    else if (this.cursors.right.isDown) targetSpeed = PLAYER.MOVE_SPEED;

    // 2. INPUT TOUCH (tap lato sinistro/destro dello schermo)
    const pointer = this.scene.input.activePointer;
    if (pointer.isDown) {
      if (pointer.x < this.scene.cameras.main.width / 2) {
        targetSpeed = -PLAYER.MOVE_SPEED;
      } else {
        targetSpeed = PLAYER.MOVE_SPEED;
      }
    }

    // --- EFFETTO INERZIA DA UBRIACHEZZA ---
    // drunkFactor va da 0 (sobrio) a 1 (wasted)
    // expoFactor è cubico per rendere l'effetto graduale ai livelli bassi
    // lerpFactor controlla quanto rapidamente la velocità raggiunge il target
    const drunkFactor = isWasted ? 1 : partyLevel / 100;
    const expoFactor = Math.pow(drunkFactor, 3);
    const lerpFactor = Phaser.Math.Linear(1, 0.15, expoFactor);

    const currentSpeed = this.body.velocity.x;
    this.setVelocityX(
      Phaser.Math.Linear(currentSpeed, targetSpeed, lerpFactor),
    );

    // --- EFFETTO PAC-MAN AI BORDI ---
    // Se il giocatore esce da un lato, rientra dall'altro
    const halfWidth = this.displayWidth / 2;
    if (this.x < -halfWidth) this.x = GAME.WIDTH + halfWidth;
    else if (this.x > GAME.WIDTH + halfWidth) this.x = -halfWidth;
  }
}
