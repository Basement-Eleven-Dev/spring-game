import * as Phaser from "phaser";
import { GAME, PLAYER, BOUNCER, CAMERA, SETTINGS } from "./GameConfig";

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
 *
 * Stato "stordito" (stunned):
 * Quando il buttafuori afferra il player, questo entra in stordimento:
 * tutti gli input vengono ignorati e il salto è bloccato.
 * Il player viene scagliato via con la velocità impostata dal bouncer
 * e può solo subire la traiettoria fino allo scadere del timer.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  declare public body: Phaser.Physics.Arcade.Body;

  /** Ultimo valore di gamma ricevuto dall'evento deviceorientation */
  private gyroGamma: number = 0;
  /** Handler registrato su window, tenuto in memoria per poterlo rimuovere */
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null =
    null;

  /** Direzione corrente del giocatore: usata per scegliere l'animazione di salto */
  private facingRight: boolean = true;
  /** Se true, il player sta mostrando il frame di discesa */
  private showingFallFrame: boolean = false;

  /**
   * Timestamp di fine stordimento.
   * Quando scene.time.now < stunUntil, il player è bloccato:
   * nessun input, nessun salto, nessun override della velocità.
   */
  private stunUntil: number = 0;

  /**
   * Timestamp di fine della fase pinball.
   * Quando scene.time.now < pinballUntil il player rimbalza sui bordi
   * dello schermo come una palla da flipper, girando su se stesso.
   */
  private pinballUntil: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER.SIZE, PLAYER.SIZE);
    // Depth alto: il player appare sempre sopra le piattaforme (depth 1)
    this.setDepth(5);

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
   * Su iOS il permesso viene richiesto dal toggle ACCELEROMETRO nel menu di pausa.
   * Il listener è silenzioso finché il permesso non viene concesso;
   * su Android funziona subito senza permessi.
   * L'uso effettivo dei dati è gated da SETTINGS.gyroEnabled in updateMovement().
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
   *
   * Se il player è stordito (dopo un lancio del bouncer), il salto
   * viene ignorato per non sovrascrivere la traiettoria del lancio.
   *
   * Animazione: frame 0→2 (salita). Il frame 3 (discesa, braccia alzate)
   * viene applicato in updateMovement() quando velocityY diventa positiva.
   */
  public jump(multiplier: number = 1, currentLevel: number = 1): void {
    // Blocca il salto durante lo stordimento
    if (this.scene.time.now < this.stunUntil) return;

    const levelSpeedMultiplier = 1 + (currentLevel - 1) * 0.15;
    this.setVelocityY(-PLAYER.JUMP_FORCE * levelSpeedMultiplier * multiplier);

    // Animazione salita nella direzione corrente (frame 0→2)
    const animKey = this.facingRight ? "playerJumpUpRight" : "playerJumpUpLeft";
    this.play(animKey, true);
    this.showingFallFrame = false;
  }

  /**
   * Attiva lo stato stordito per la durata specificata.
   * Chiamato dal bouncer al contatto: il player perde il controllo
   * e viene scagliato via con la velocità già impostata.
   */
  public stun(durationMs: number): void {
    this.stunUntil = this.scene.time.now + durationMs;
  }

  /** Restituisce true se il player è attualmente stordito */
  public get isStunned(): boolean {
    return this.scene.time.now < this.stunUntil;
  }

  /**
   * Attiva la fase pinball: il player rimbalza violentemente sui bordi
   * dello schermo come una palla da flipper, girando su se stesso.
   * Nessun input è possibile. Dura `durationMs` millisecondi.
   *
   * Chiamato dal bouncer dopo l'animazione di lancio.
   */
  public startPinball(durationMs: number): void {
    this.pinballUntil = this.scene.time.now + durationMs;
  }

  /** Restituisce true se il player è in fase pinball */
  public get isPinball(): boolean {
    return this.scene.time.now < this.pinballUntil;
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
    // --- FASE PINBALL: il player rimbalza sui bordi come un flipper ---
    // Nessun input, il player è in balia della fisica.
    // Rimbalza sui bordi laterali (no pac-man wrap), gira su se stesso,
    // e riceve perturbazioni Y random ad ogni rimbalzo.
    if (this.scene.time.now < this.pinballUntil) {
      const halfW = this.displayWidth / 2;

      // Rimbalzo sul bordo sinistro
      if (this.x <= halfW) {
        this.x = halfW + 1;
        this.setVelocityX(
          Math.abs(this.body.velocity.x) * BOUNCER.PINBALL_BOUNCE_DAMPING,
        );
        // Perturbazione Y random ad ogni rimbalzo: aggiunge caos
        this.setVelocityY(
          this.body.velocity.y +
            Phaser.Math.Between(
              -BOUNCER.PINBALL_Y_PERTURBATION,
              BOUNCER.PINBALL_Y_PERTURBATION,
            ),
        );
      }
      // Rimbalzo sul bordo destro
      else if (this.x >= GAME.WIDTH - halfW) {
        this.x = GAME.WIDTH - halfW - 1;
        this.setVelocityX(
          -Math.abs(this.body.velocity.x) * BOUNCER.PINBALL_BOUNCE_DAMPING,
        );
        this.setVelocityY(
          this.body.velocity.y +
            Phaser.Math.Between(
              -BOUNCER.PINBALL_Y_PERTURBATION,
              BOUNCER.PINBALL_Y_PERTURBATION,
            ),
        );
      }

      // Rimbalzo sul bordo inferiore (per evitare morte istantanea)
      const bottomY =
        this.scene.cameras.main.scrollY +
        this.scene.cameras.main.height -
        this.displayHeight / 2;
      if (this.y >= bottomY) {
        this.y = bottomY - 1;
        this.setVelocityY(
          -Math.abs(this.body.velocity.y) * BOUNCER.PINBALL_BOUNCE_DAMPING,
        );
        // Perturbazione laterale
        this.setVelocityX(
          this.body.velocity.x +
            Phaser.Math.Between(
              -BOUNCER.PINBALL_Y_PERTURBATION,
              BOUNCER.PINBALL_Y_PERTURBATION,
            ),
        );
      }

      // Rotazione: il player gira su se stesso nella direzione del movimento
      const spinDir = this.body.velocity.x >= 0 ? 1 : -1;
      this.angle += spinDir * BOUNCER.PINBALL_SPIN_SPEED;

      return; // Nessun input possibile durante il pinball
    }

    // --- Reset rotazione quando si esce dalla fase pinball ---
    if (this.angle !== 0) {
      this.setAngle(0);
    }

    // --- STORDIMENTO: input bloccato, il player subisce la traiettoria del lancio ---
    if (this.scene.time.now < this.stunUntil) {
      // Aggiorna solo la direzione (per l'animazione) e impedisci il wrap
      if (this.body.velocity.x > 10) this.facingRight = true;
      else if (this.body.velocity.x < -10) this.facingRight = false;

      // Durante lo stun pre-pinball il player è nella mano del bouncer:
      // nessun wrap, nessun movimento autonomo
      const halfWidth = this.displayWidth / 2;
      if (this.x < halfWidth) this.x = halfWidth;
      else if (this.x > GAME.WIDTH - halfWidth) this.x = GAME.WIDTH - halfWidth;
      return;
    }

    // --- RILEVAMENTO INPUT RAW + FLIP ISTANTANEO ---
    let targetSpeed = 0;
    const oldFacing = this.facingRight;

    const pointer = this.scene.input.activePointer;
    const isTouching = pointer.isDown;

    // 1. INPUT TOUCH — priorità massima: sovrascrive tastiera e gyro
    if (isTouching) {
      const isLeftSide = pointer.x < this.scene.cameras.main.width / 2;
      this.facingRight = !isLeftSide; // Flip ISTANTANEO
      targetSpeed = isLeftSide ? -PLAYER.MOVE_SPEED : PLAYER.MOVE_SPEED;
    }
    // 2. INPUT DEVICE ORIENTATION (gamma = inclinazione sx/dx)
    // Si attiva solo se non si sta toccando lo schermo, così touch e gyro
    // non si ostacolano. La velocità è proporzionale all'angolo tra
    // DEADZONE e MAX_TILT.
    // Controlla anche se l'accelerometro è abilitato dalle impostazioni
    else if (
      SETTINGS.gyroEnabled &&
      Math.abs(this.gyroGamma) > PLAYER.GYRO_DEADZONE
    ) {
      this.facingRight = this.gyroGamma > 0; // Flip ISTANTANEO
      const range = PLAYER.GYRO_MAX_TILT - PLAYER.GYRO_DEADZONE;
      const tilt = Math.abs(this.gyroGamma) - PLAYER.GYRO_DEADZONE;
      const ratio = Math.min(tilt / range, 1);
      targetSpeed = Math.sign(this.gyroGamma) * ratio * PLAYER.MOVE_SPEED;
    }
    // 3. INPUT TASTIERA (PC)
    else if (this.cursors.left.isDown) {
      this.facingRight = false; // Flip ISTANTANEO
      targetSpeed = -PLAYER.MOVE_SPEED;
    } else if (this.cursors.right.isDown) {
      this.facingRight = true; // Flip ISTANTANEO
      targetSpeed = PLAYER.MOVE_SPEED;
    }

    // --- AGGIORNA TEXTURE SE LA DIREZIONE È CAMBIATA ---
    if (oldFacing !== this.facingRight) {
      // Controlla lo stato REALE del player (salita/discesa) basandosi su velocityY
      if (this.body.velocity.y > 0) {
        // STA CADENDO: mostra il frame statico 3 (braccia alzate)
        this.showingFallFrame = true;
        this.stop();
        const fallSheet = this.facingRight
          ? "playerJumpRight"
          : "playerJumpLeft";
        this.setTexture(fallSheet, 3);
      } else {
        // STA SALENDO: play animazione di salto (frame 0→2)
        this.showingFallFrame = false;
        const animKey = this.facingRight
          ? "playerJumpUpRight"
          : "playerJumpUpLeft";
        this.play(animKey, true);
      }
    }

    // --- EFFETTO INERZIA DA UBRIACHEZZA ---
    // drunkFactor va da 0 (sobrio) a 1 (wasted).
    // expoFactor quadratico: si sente già al 50% invece di sparire fino all'80%+
    // con la curva cubica. lerpFactor: quanto rapidamente la velocità raggiunge il target.
    const drunkFactor = isWasted ? 1 : partyLevel / 100;
    const expoFactor = Math.pow(drunkFactor, 2);
    const lerpFactor = Phaser.Math.Linear(1, 0.15, expoFactor);

    const currentSpeed = this.body.velocity.x;
    this.setVelocityX(
      Phaser.Math.Linear(currentSpeed, targetSpeed, lerpFactor),
    );

    // --- FRAME DI DISCESA (braccia alzate) ---
    // Quando il player sta cadendo (velocityY > 0), mostra il frame 3 dello sheet
    // corretto in base alla direzione. Lo switch avviene una volta sola per evitare
    // di interrompere continuamente il frame.
    if (this.body.velocity.y > 0 && !this.showingFallFrame) {
      this.showingFallFrame = true;
      this.stop();
      const fallSheet = this.facingRight ? "playerJumpRight" : "playerJumpLeft";
      this.setTexture(fallSheet, 3);
    }

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
