import * as Phaser from "phaser";
import { GAME, PLAYER } from "./GameConfig";

/**
 * Player
 * ======
 * Sprite del giocatore con tre sistemi di input:
 * 1. Tastiera (frecce) — per giocare su PC
 * 2. Touch (tap sx/dx dello schermo) — per smartphone
 * 3. Device orientation (gamma) — inclinazione smartphone
 *
 * Il movimento orizzontale è soggetto a inerzia crescente
 * con il party level (effetto "ubriachezza").
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  declare public body: Phaser.Physics.Arcade.Body;

  /** Ultimo valore di gamma ricevuto dall'evento deviceorientation */
  private gyroGamma: number = 0;
  /** Handler registrato su window, tenuto in memoria per poterlo rimuovere */
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null =
    null;

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

    this.setupOrientationListener();
  }

  /**
   * Registra il listener deviceorientation.
   *
   * Il listener viene aggiunto SOLO su dispositivi touch (smartphone/tablet).
   * Su desktop (MacBook incluso) Chrome e Safari possono esporre
   * DeviceOrientationEvent con dati dal sensore della macchina: qualsiasi
   * inclinazione > deadzone sovrascriveva la tastiera causando stuttering.
   * navigator.maxTouchPoints > 0 esclude tutti i desktop non-touch.
   *
   * Su iOS il permesso viene richiesto da main.ts tramite bottone HTML puro.
   * Qui il listener è silenzioso finché il permesso non viene concesso;
   * su Android funziona subito senza permessi.
   */
  private setupOrientationListener(): void {
    if (typeof DeviceOrientationEvent === "undefined") return;
    // Non registrare su desktop: evita interferenza con tastiera
    if (!(navigator.maxTouchPoints > 0)) return;

    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) this.gyroGamma = e.gamma;
    };
    this.orientationHandler = handler;
    window.addEventListener("deviceorientation", handler);
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
   * 1. Touch attivo (tap nella metà sx/dx dello schermo) — priorità assoluta
   * 2. Device orientation (gamma, solo su mobile) — solo quando non si tocca
   * 3. Tastiera (frecce sx/dx) — per PC (mai gyro su desktop)
   *
   * Touch ha priorità sul gyro: se stai toccando lo schermo il sensore
   * è ignorato, così i due controlli non si ostacolano.
   *
   * L'inerzia aumenta col party level: più sei ubriaco, più il personaggio
   * è lento a cambiare direzione (lerp factor scende da 1 a 0.15).
   */
  public updateMovement(partyLevel: number, isWasted: boolean): void {
    let targetSpeed = 0;

    const pointer = this.scene.input.activePointer;
    const isTouching = pointer.isDown;

    // 1. INPUT TOUCH — priorità massima: sovrascrive tastiera e gyro
    if (isTouching) {
      targetSpeed =
        pointer.x < this.scene.cameras.main.width / 2
          ? -PLAYER.MOVE_SPEED
          : PLAYER.MOVE_SPEED;
    }
    // 2. INPUT DEVICE ORIENTATION (gamma = inclinazione sx/dx)
    // Si attiva solo se non si sta toccando lo schermo, così touch e gyro
    // non si ostacolano. La velocità è proporzionale all'angolo tra
    // DEADZONE e MAX_TILT.
    else if (Math.abs(this.gyroGamma) > PLAYER.GYRO_DEADZONE) {
      const range = PLAYER.GYRO_MAX_TILT - PLAYER.GYRO_DEADZONE;
      const tilt = Math.abs(this.gyroGamma) - PLAYER.GYRO_DEADZONE;
      const ratio = Math.min(tilt / range, 1);
      targetSpeed = Math.sign(this.gyroGamma) * ratio * PLAYER.MOVE_SPEED;
    }
    // 3. INPUT TASTIERA (PC)
    else if (this.cursors.left.isDown) {
      targetSpeed = -PLAYER.MOVE_SPEED;
    } else if (this.cursors.right.isDown) {
      targetSpeed = PLAYER.MOVE_SPEED;
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

  /**
   * Rimuove il listener deviceorientation prima di distruggere lo sprite
   * per evitare memory leak tra un tentativo e l'altro.
   */
  public destroy(fromScene?: boolean): void {
    if (this.orientationHandler) {
      window.removeEventListener("deviceorientation", this.orientationHandler);
      this.orientationHandler = null;
    }
    super.destroy(fromScene);
  }
}
