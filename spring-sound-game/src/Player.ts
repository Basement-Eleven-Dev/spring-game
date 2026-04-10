import * as Phaser from "phaser";
import { GAME, PLAYER } from "./GameConfig";

/**
 * Player
 * ======
 * Sprite del giocatore con tre sistemi di input:
 * 1. Tastiera (frecce) — per giocare su PC
 * 2. Touch (tap sx/dx dello schermo) — per smartphone
 * 3. Giroscopio (inclinazione del telefono) — per smartphone con sensore
 *
 * Il movimento orizzontale è soggetto a inerzia crescente
 * con il party level (effetto "ubriachezza").
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  /** Inclinazione corrente del telefono (gradi, da deviceorientation) */
  private tiltX: number = 0;
  /** Riferimento al handler del giroscopio per poterlo rimuovere al destroy */
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

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

    // Inizializza il giroscopio (con gestione permessi iOS)
    this.setupGyroscope();
  }

  /**
   * Configura il listener per il giroscopio.
   * Su iOS 13+ è necessario richiedere il permesso tramite un gesto utente
   * (tap/click). Il permesso viene richiesto automaticamente al primo tocco.
   */
  private setupGyroscope(): void {
    this.orientationHandler = (event: DeviceOrientationEvent) => {
      // event.gamma = inclinazione destra/sinistra (da -90 a +90 gradi)
      if (event.gamma !== null) {
        this.tiltX = event.gamma;
      }
    };

    // Controlla se serve richiedere il permesso (iOS 13+)
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === "function") {
      // Su iOS, il permesso va richiesto in risposta a un gesto utente
      const requestOnTap = () => {
        DOE.requestPermission()
          .then((response: string) => {
            if (response === "granted") {
              window.addEventListener(
                "deviceorientation",
                this.orientationHandler!,
                true,
              );
            }
          })
          .catch(console.error);
      };
      // Registra il listener una sola volta (si auto-rimuove dopo il primo tap)
      document.addEventListener("click", requestOnTap, { once: true });
      document.addEventListener("touchend", requestOnTap, { once: true });
    } else {
      // Android e browser desktop — il giroscopio funziona direttamente
      window.addEventListener("deviceorientation", this.orientationHandler, true);
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
   * 3. Giroscopio (inclinazione fisica del telefono) — sovrascrive gli altri
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

    // 3. INPUT GIROSCOPIO (inclinazione fisica del telefono)
    // Ha la priorità: sovrascrive tastiera e touch se il tilt supera la deadzone
    if (Math.abs(this.tiltX) > PLAYER.TILT_DEADZONE) {
      const tiltFactor = Phaser.Math.Clamp(
        this.tiltX / PLAYER.TILT_MAX_ANGLE,
        -1,
        1,
      );
      targetSpeed = PLAYER.MOVE_SPEED * tiltFactor;
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
   * Pulizia: rimuove il listener del giroscopio quando il giocatore viene distrutto.
   * Importante per evitare memory leak quando la scena viene riavviata.
   */
  public destroy(fromScene?: boolean): void {
    if (this.orientationHandler) {
      window.removeEventListener("deviceorientation", this.orientationHandler, true);
      this.orientationHandler = null;
    }
    super.destroy(fromScene);
  }
}
