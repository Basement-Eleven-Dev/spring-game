import * as Phaser from "phaser";
import {
  GAME,
  INITIAL,
  PHYSICS,
  BOUNCER,
  JUMP_MULTIPLIERS,
  LEVEL,
  PLATFORM,
  PLAYER,
  PARTY,
  TIME,
  SETTINGS,
  SCORING,
} from "./GameConfig";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { Bouncer } from "./Bouncer";
import { CameraManager } from "./managers/CameraManager";
import { ScoreManager } from "./managers/ScoreManager";
import { PartyManager } from "./managers/PartyManager";
import { SpawnManager } from "./managers/SpawnManager";
import { LevelManager } from "./managers/LevelManager";
import { UIManager } from "./managers/UIManager";
import { PauseMenuManager } from "./managers/PauseMenuManager";
import { BackgroundManager } from "./managers/BackgroundManager";

/**
 * GameScene — Scena Principale
 * ==============================
 * Orchestratore snello che delega la logica ai manager:
 * - CameraManager:  scrolling fluido + effetti visivi
 * - ScoreManager:   punteggio + HUD
 * - PartyManager:   party level + stato wasted
 * - SpawnManager:   spawning/riciclo/pulizia entità
 * - LevelManager:   progressione livelli + gravità
 *
 * GameScene si occupa solo di:
 * 1. Caricare gli asset (preload)
 * 2. Inizializzare tutto (create)
 * 3. Registrare i collider
 * 4. Orchestrare gli update dei manager
 * 5. Gestire il game over
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;

  // Manager
  private backgroundManager!: BackgroundManager;
  private cameraManager!: CameraManager;
  private scoreManager!: ScoreManager;
  private partyManager!: PartyManager;
  private spawnManager!: SpawnManager;
  private levelManager!: LevelManager;
  private uiManager!: UIManager;
  private pauseMenuManager!: PauseMenuManager;

  // --- Audio ---
  private backgroundMusic?: Phaser.Sound.BaseSound;

  // --- Stato pausa ---
  private isPaused: boolean = false;

  // --- Orologio narrativo ---
  /** Minuti narrativi trascorsi dall'inizio (1 secondo reale = 2.5 minuti narrativi). */
  private clockMinutes: number = 0;
  /**
   * Flag: il tempo ha superato le 21:00 ma il background notte
   * non è ancora scattato. Lo switch avviene al prossimo level up.
   */
  private nightPending: boolean = false;

  constructor() {
    super("GameScene");
  }

  /**
   * Preload: caricamento di tutti gli asset grafici.
   *
   * Le piattaforme standard/mobili usano 4 varianti PNG singole, scelte
   * casualmente allo spawn. I tipi animati (fragile e subwoofer) usano
   * spritesheet orizzontali tagliati in frame di dimensione fissa.
   *
   * I file risiedono nella cartella public/assets/.
   */
  preload(): void {
    // --- Background Assets ---
    BackgroundManager.preloadAssets(this);

    // --- UI Assets (SVG) ---
    UIManager.preloadAssets(this);

    this.load.image("drinkTexture", "/assets/drinks/drink.png");
    this.load.image("beerTexture", "/assets/drinks/beer.png");

    // --- Player: 2 spritesheet per direzione (4 frame salto ciascuno) ---
    this.load.spritesheet(
      "playerJumpRight",
      "/assets/players/player_sheet_dx_jump.png",
      {
        frameWidth: PLAYER.FRAME_WIDTH,
        frameHeight: PLAYER.FRAME_HEIGHT,
      },
    );
    this.load.spritesheet(
      "playerJumpLeft",
      "/assets/players/player_sheet_sx_jump.png",
      {
        frameWidth: PLAYER.FRAME_WIDTH,
        frameHeight: PLAYER.FRAME_HEIGHT,
      },
    );

    // --- Bouncer: spritesheet 3 frame (idle + lancio) ---
    this.load.spritesheet("bouncerSheet", "/assets/players/buttafuori.png", {
      frameWidth: BOUNCER.FRAME_WIDTH,
      frameHeight: BOUNCER.FRAME_HEIGHT,
    });

    // --- Varianti piattaforma standard/mobile (4 PNG singole) ---
    this.load.image(
      "platformErbaTexture",
      "/assets/platforms/platform erba.png",
    );
    this.load.image(
      "platformUbriacoTexture",
      "/assets/platforms/platform_ubriaco.png",
    );
    this.load.image(
      "platformCassaTexture",
      "/assets/platforms/platform_cassa.png",
    );
    this.load.image(
      "platformCassaErbaTexture",
      "/assets/platforms/platform_cassa_erba.png",
    );

    // --- Fango: sprite PNG ---
    this.load.image("fangoTexture", "/assets/platforms/fango.png");

    // --- Piattaforma fragile: spritesheet 2 frame (intera → rotta) ---
    this.load.spritesheet(
      "fragileSheet",
      "/assets/platforms/platform_cassa_rotta_sheet.png",
      {
        frameWidth: PLATFORM.FRAGILE_FRAME_WIDTH,
        frameHeight: PLATFORM.FRAGILE_FRAME_HEIGHT,
      },
    );

    // --- Subwoofer: spritesheet 4 frame (cassa che pompa) ---
    this.load.spritesheet(
      "subwooferSheet",
      "/assets/platforms/subwoofer_sheet.png",
      {
        frameWidth: PLATFORM.SUBWOOFER_FRAME_WIDTH,
        frameHeight: PLATFORM.SUBWOOFER_FRAME_HEIGHT,
      },
    );

    // --- Pause Menu Assets ---
    this.load.svg(
      "pauseLogo",
      "/assets/ui/gamestart-over-pause/logo pixel.svg",
      {
        width: 80,
        height: 80,
      },
    );
    this.load.svg("pausePlayIcon", "/assets/ui/play.svg", {
      width: 24,
      height: 24,
    });
    this.load.svg(
      "pauseBlockRed",
      "/assets/ui/gamestart-over-pause/block_red.svg",
      { width: 240, height: 60 },
    );
    this.load.svg(
      "pauseBlockWhite",
      "/assets/ui/gamestart-over-pause/block_white.svg",
      { width: 240, height: 60 },
    );
    this.load.svg(
      "pauseBlockBlue",
      "/assets/ui/gamestart-over-pause/block_blue.svg",
      { width: 240, height: 60 },
    );
    this.load.image("pauseGrass", "/assets/ui/gamestart-over-pause/grass.png");
    this.load.svg("pauseSpring", "/assets/ui/gamestart-over-pause/spring.svg", {
      width: 150,
      height: 150,
    });
    this.load.svg(
      "pauseLeftArrow",
      "/assets/ui/gamestart-over-pause/left.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "pauseRightArrow",
      "/assets/ui/gamestart-over-pause/right.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "pauseMusicOn",
      "/assets/ui/gamestart-over-pause/music on.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "pauseMusicOff",
      "/assets/ui/gamestart-over-pause/music off.svg",
      { width: 40, height: 40 },
    );

    // --- Background Music ---
    this.load.audio("backgroundMusic", "/assets/music/willyMix.mp3");
  }

  /**
   * Create: inizializzazione del mondo di gioco.
   * Crea manager, piattaforme, giocatore e registra i collider.
   */
  create(): void {
    // --- Pulizia di eventuali listener da run precedenti ---
    this.events.off("wasted-ready");

    // --- Reset orologio e flag notte ---
    this.clockMinutes = 0;
    this.nightPending = false;

    // --- Animazioni spritesheet ---
    this.createAnimations();

    // --- Fisica ---
    this.physics.world.gravity.y = PHYSICS.BASE_GRAVITY;

    // --- Creazione Manager ---
    // Background prima di tutto (depth -1)
    this.backgroundManager = new BackgroundManager(this);
    this.backgroundManager.create();

    this.cameraManager = new CameraManager(this);
    this.levelManager = new LevelManager(this);
    this.scoreManager = new ScoreManager(this, INITIAL.PLAYER_START_Y);
    this.spawnManager = new SpawnManager(this);
    this.partyManager = new PartyManager(this, this.cameraManager);
    this.uiManager = new UIManager(this);

    // --- Piattaforme iniziali ---
    this.spawnManager.spawnInitialPlatforms(this.levelManager.level);

    // --- Giocatore (usa il primo frame dello sheet destro come texture iniziale) ---
    this.player = new Player(
      this,
      GAME.WIDTH / 2,
      INITIAL.PLAYER_START_Y,
      "playerJumpRight",
    );

    // --- Collisioni ---
    this.setupColliders();

    // --- Menu di pausa ---
    this.pauseMenuManager = new PauseMenuManager(this);
    this.pauseMenuManager.create(
      () => this.resumeGame(),
      () => this.restartGame(),
      () => this.toggleGyro(),
      () => this.toggleAudio(),
    );

    // Aggiorna gli stati iniziali
    this.pauseMenuManager.updateGyroState(SETTINGS.gyroEnabled);
    this.pauseMenuManager.updateAudioState(SETTINGS.audioEnabled);

    // --- Finalizza setup UI: configura le camere ora che tutti gli oggetti sono creati ---
    this.uiManager.finalizeSetup((paused: boolean) =>
      this.handlePauseToggle(paused),
    );

    // --- Riconfigura le camere per includere il menu di pausa ---
    this.uiManager.reconfigureCameras();

    // --- Evento: il DJ Stage deve apparire (emesso da PartyManager dopo il wasted delay) ---
    this.events.on("wasted-ready", () => {
      this.spawnManager.spawnDJStage(
        this.cameraManager.scrollY,
        this.levelManager.level,
      );
    });

    // --- Background Music ---
    this.backgroundMusic = this.sound.add("backgroundMusic", {
      loop: true,
      volume: 0.5,
    });
    if (SETTINGS.audioEnabled) {
      this.backgroundMusic.play();
    }
  }

  /**
   * Definisce le animazioni spritesheet.
   * Chiamato una volta in create() — Phaser condivide le animazioni tra tutti gli sprite.
   *
   * Player:
   * - playerJumpUpRight/Left: frame 0→2 (salita: gambe che spingono)
   * - Frame 3 (discesa, braccia alzate) viene impostato direttamente via setTexture/setFrame
   *
   * Bouncer:
   * - bouncerThrow: frame 0→1→2 one-shot (fermo → afferra → lancia)
   * - Frame 0 idle viene impostato direttamente via setFrame(0)
   *
   * Piattaforme:
   * - fragileBreak:   2 frame one-shot (intera → rotta)
   * - subwooferPump:  4 frame loop (cassa che pompa)
   */
  private createAnimations(): void {
    // Evita duplicati se la scena viene riavviata

    // --- Player ---
    // Salita: frame 0→2 (gambe che spingono)
    if (!this.anims.exists("playerJumpUpRight")) {
      this.anims.create({
        key: "playerJumpUpRight",
        frames: this.anims.generateFrameNumbers("playerJumpRight", {
          start: 0,
          end: 2,
        }),
        frameRate: PLAYER.JUMP_ANIM_FPS,
        repeat: 0,
      });
    }
    if (!this.anims.exists("playerJumpUpLeft")) {
      this.anims.create({
        key: "playerJumpUpLeft",
        frames: this.anims.generateFrameNumbers("playerJumpLeft", {
          start: 0,
          end: 2,
        }),
        frameRate: PLAYER.JUMP_ANIM_FPS,
        repeat: 0,
      });
    }
    // Discesa: frame 3 statico (braccia alzate)
    // Non servono animazioni — il Player imposta setFrame(3) direttamente.

    // --- Bouncer ---
    // Lancio: frame 0→1→2 (posizione → afferra → lancia)
    if (!this.anims.exists("bouncerThrow")) {
      this.anims.create({
        key: "bouncerThrow",
        frames: this.anims.generateFrameNumbers("bouncerSheet", {
          start: 0,
          end: 2,
        }),
        frameRate: BOUNCER.THROW_ANIM_FPS,
        repeat: 0,
      });
    }

    // --- Piattaforme ---
    if (!this.anims.exists("fragileBreak")) {
      this.anims.create({
        key: "fragileBreak",
        frames: this.anims.generateFrameNumbers("fragileSheet", {
          start: 0,
          end: 1,
        }),
        frameRate: 1000 / PLATFORM.FRAGILE_BREAK_DURATION_MS,
        repeat: 0,
      });
    }

    if (!this.anims.exists("subwooferPump")) {
      this.anims.create({
        key: "subwooferPump",
        frames: this.anims.generateFrameNumbers("subwooferSheet", {
          start: 0,
          end: 3,
        }),
        frameRate: PLATFORM.SUBWOOFER_ANIM_FPS,
        repeat: -1, // loop infinito
      });
    }
  }

  /**
   * Registra tutti i collider e gli overlap tra giocatore e entità.
   * È il punto dove le meccaniche di gioco si connettono.
   */
  private setupColliders(): void {
    // --- Collisione Giocatore ↔ Piattaforme ---
    this.physics.add.collider(
      this.player,
      this.spawnManager.platforms,
      (playerObj, platformObj) => {
        const p = playerObj as Player;
        const plat = platformObj as Platform;

        // --- FIX BUG #2: DJ Stage si attiva a QUALSIASI contatto ---
        // Il DJ Stage ha collisione da tutte le direzioni, quindi il giocatore
        // non può attraversarlo. Al tocco (da qualsiasi angolo) scatta il level up.
        if (plat.isDJStage && p.body) {
          plat.isDJStage = false;

          // Ripristina collisione solo dall'alto, così il giocatore
          // può saltare attraverso la piattaforma dopo il level up
          if (plat.body) {
            plat.body.checkCollision.down = false;
            plat.body.checkCollision.left = false;
            plat.body.checkCollision.right = false;
            plat.body.checkCollision.up = true;
          }

          // Level up!
          this.levelManager.levelUp();
          this.scoreManager.addBonus(this.levelManager.getLevelUpBonus());
          this.partyManager.resetForNewLevel();

          // Il background giorno/tramonto/notte è ora gestito automaticamente
          // da BackgroundManager.update() tramite tint progressivo basato su clockMinutes.

          p.jump(LEVEL.JUMP_BOOST_ON_STAGE, this.levelManager.level);
          return;
        }

        // --- Piattaforme normali: il salto si attiva solo atterrando dall'alto ---
        if (p.body && p.body.touching.down && plat.body.touching.up) {
          // Determina il tipo di salto
          // Controllo sovrapposizione con fango: verifica se il player sta atterrando
          // su una pozza di fango che si trova sulla stessa piattaforma
          let isTouchingMud = false;
          this.spawnManager.muds.getChildren().forEach((mudObj) => {
            const mud = mudObj as Phaser.Physics.Arcade.Sprite;
            if (!mud.active) return;

            // Bounds del player e del fango
            const playerLeft = p.x - p.displayWidth / 2;
            const playerRight = p.x + p.displayWidth / 2;
            const mudLeft = mud.x - mud.displayWidth / 2;
            const mudRight = mud.x + mud.displayWidth / 2;

            // Verifica che il fango sia sulla stessa piattaforma:
            // la Y del fango deve essere vicina alla Y della piattaforma
            const mudY = mud.y;
            const platformY = plat.y;
            const verticalDistance = Math.abs(mudY - platformY);

            // Overlap check: c'è sovrapposizione se i bounds si intersecano
            const horizontalOverlap =
              playerRight > mudLeft && playerLeft < mudRight;
            const onSamePlatform =
              verticalDistance < Math.round(20 * GAME.SCALE);

            if (horizontalOverlap && onSamePlatform) {
              isTouchingMud = true;
            }
          });

          if (plat.platformType === "subwoofer") {
            // Trampolino: salto potenziato x1.6
            p.jump(JUMP_MULTIPLIERS.SUBWOOFER, this.levelManager.level);
          } else if (isTouchingMud) {
            // Fango: salto indebolito x0.75
            p.jump(JUMP_MULTIPLIERS.MUD, this.levelManager.level);
          } else {
            // Salto normale
            p.jump(JUMP_MULTIPLIERS.NORMAL, this.levelManager.level);
          }

          // Le piattaforme fragili: animazione di rottura, poi distruzione
          if (plat.platformType === "fragile") {
            // Disabilita collisione subito — il giocatore non ci atterra più
            if (plat.body) {
              plat.body.enable = false;
            }
            // Mostra immediatamente il frame "rotta" e falla cadere giù
            plat.setFrame(1);
            plat.body!.enable = true;
            plat.body!.allowGravity = true;
            plat.body!.immovable = false;
            plat.body!.checkCollision.up = false;
            plat.body!.checkCollision.down = false;
            plat.body!.checkCollision.left = false;
            plat.body!.checkCollision.right = false;
            plat.setVelocityY(Math.round(300 * GAME.SCALE));
            // Genera una nuova piattaforma in alto per mantenere la densità
            this.spawnManager.spawnPlatform(
              this.spawnManager.highestPlatformY -
                Phaser.Math.Between(
                  Math.round(50 * GAME.SCALE),
                  Math.round(130 * GAME.SCALE),
                ),
              this.levelManager.level,
            );
          }
        }
      },
    );

    // --- Overlap Giocatore ↔ Drink (raccolta) ---
    this.physics.add.overlap(
      this.player,
      this.spawnManager.drinks,
      (_playerObj, drinkObj) => {
        const drink = drinkObj as import("./Drink").Drink;
        const points = drink.isFalling
          ? SCORING.DRINK_FALLING
          : SCORING.DRINK_STATIC;
        this.scoreManager.addDrinkBonus(drink.isFalling);
        this.showFloatingScore(drink.x, drink.y, points, "#FFD700");
        drink.destroy();
        this.partyManager.collectDrink();
      },
    );

    // --- Overlap Giocatore ↔ Bouncer (presa + lancio pinball) ---
    // Flusso in 3 fasi:
    // 1. PRESA — il player viene bloccato nella mano del bouncer
    // 2. ANIMAZIONE — il bouncer esegue l'animazione di lancio (frame 0→1→2)
    // 3. PINBALL — il player viene scaraventato e rimbalza sui bordi come un flipper
    this.physics.add.overlap(
      this.player,
      this.spawnManager.bouncers,
      (playerObj, bouncerObj) => {
        const p = playerObj as Player;
        const b = bouncerObj as Bouncer;
        if (!p.body) return;

        const now = this.time.now;
        if (!b.canThrow(now)) return; // Cooldown attivo — ignora

        // --- CONTROLLO SUPA-MARIO STOMP ---
        // Se il giocatore sta cadendo e lo colpisce dall'alto
        // Il Bouncer ha origine (0.5, 1) quindi b.y è ai suoi piedi
        const playerBottom = p.y + p.displayHeight / 2;
        const bouncerHead = b.y - BOUNCER.HEIGHT;

        // Se sta cadendo e si trova all'incirca sopra la testa (tolleranza 25px)
        if (
          p.body.velocity.y > 0 &&
          playerBottom < bouncerHead + Math.round(25 * GAME.SCALE)
        ) {
          // Disabilita subito il corpo fisico per evitare multipli overlap
          b.body!.enable = false;

          // Fai saltare il giocatore (rimbalzo sulla testa)
          p.jump(JUMP_MULTIPLIERS.NORMAL, this.levelManager.level);

          // Effetto visivo di schiacciamento (essendo l'origin Y a 1, si rimpicciolisce verso il basso)
          this.tweens.add({
            targets: b,
            scaleY: 0.1,
            duration: 150,
            onComplete: () => b.destroy(),
          });

          // Punteggio o effetto bonus opzionale
          this.scoreManager.addBonus(SCORING.BOUNCER_STOMP);
          this.showFloatingScore(
            b.x,
            b.y - BOUNCER.HEIGHT / 2,
            SCORING.BOUNCER_STOMP,
            "#FF6B35",
          );

          return; // Interrompe il flusso normale del lancio
        }

        // --- FASE 1: PRESA — blocca il player nella mano del bouncer ---
        p.stun(BOUNCER.STUN_DURATION_MS);
        p.setVelocity(0, 0);
        p.body.allowGravity = false; // Congela durante la presa

        // Calcola posizione della "mano" del bouncer
        const lateralDir = p.x < b.x ? -1 : 1;
        const handOffsetX =
          lateralDir * (BOUNCER.WIDTH / 2 + Math.round(5 * GAME.SCALE));
        const handY = b.y - BOUNCER.HEIGHT * 0.15;

        // Sposta il player nella mano immediatamente
        p.setPosition(b.x + handOffsetX, handY);

        // Tracking: mantieni il player nella mano durante l'animazione
        const trackingFn = () => {
          if (p.active && b.active) {
            p.setPosition(b.x + handOffsetX, handY);
          }
        };
        this.events.on("update", trackingFn);

        // --- FASE 2: ANIMAZIONE di presa (frame 0→1→2) ---
        b.performThrow(now);
        b.once("animationcomplete", () => {
          // Rimuovi il tracking dalla mano
          this.events.off("update", trackingFn);

          // --- FASE 3: PINBALL — scaraventa il player e attiva il rimbalzo ---
          if (p.body) {
            p.body.allowGravity = true;

            // Direzione Y: scagliamo sempre il giocatore in alto come in un VERO pinball.
            p.setVelocityX(lateralDir * BOUNCER.PINBALL_LAUNCH_X);
            // Forza verso l'alto (così da dare suspance al giocatore invece che una condanna)
            p.setVelocityY(-BOUNCER.KNOCKBACK_FORCE);

            // Attiva la fase pinball: rimbalzi + rotazione per PINBALL_DURATION_MS
            p.startPinball(BOUNCER.PINBALL_DURATION_MS);
          }
          b.stop();

          // --- SCOMPARSA DEL BOUNCER POST-LANCIO ---
          // Il bouncer fa un fade out e scompare per evitare loop o ricatture accidentali
          b.body!.enable = false;
          this.tweens.add({
            targets: b,
            alpha: 0,
            duration: 400,
            onComplete: () => b.destroy(),
          });
        });
      },
    );
  }

  /**
   * Update: ciclo di gioco principale.
   * Delega tutto ai manager nell'ordine corretto.
   */
  update(_time: number, delta: number): void {
    // Se il gioco è in pausa, non aggiornare nulla
    if (this.isPaused) {
      return;
    }

    // --- Orologio narrativo: 1 millisecondo reale = 2.5/1000 minuti narrativi ---
    // => 1 secondo reale = 2.5 minuti narrativi
    this.clockMinutes += delta / 400;

    // Sblocca il cambio notte quando il tempo supera le 21:00
    if (!this.nightPending && this.clockMinutes >= TIME.NIGHT_TRIGGER_MINUTES) {
      this.nightPending = true;
    }

    // Timeout alle 04:00: fine gioco con punteggio
    if (this.clockMinutes >= TIME.DURATION_MINUTES) {
      this.scoreManager.addSurvivalBonus();

      // Ferma la musica
      if (this.backgroundMusic) {
        this.backgroundMusic.stop();
      }

      this.scene.start("GameOverScene", {
        score: this.scoreManager.score,
        clockMinutes: this.clockMinutes,
        level: this.levelManager.level,
        drinkCount: this.partyManager.drinkCount,
        isTimeout: true,
      });
      return;
    }

    const level = this.levelManager.level;
    const partyLevel = this.partyManager.partyLevel;
    const isWasted = this.partyManager.isWasted;

    // 1. Input e movimento del giocatore
    this.player.updateMovement(partyLevel, isWasted);

    // 2. Punteggio (va prima della camera: serve highestYReached aggiornato)
    this.scoreManager.update(
      this.player.y,
      level,
      partyLevel,
      isWasted,
      this.clockMinutes,
    );

    // 3. Camera: scrolling + effetti ubriachezza
    this.cameraManager.update(this.player.y, partyLevel, isWasted);

    // 3b. Background: aggiorna scroll infinito + tint giorno/tramonto/notte
    this.backgroundManager.update(
      this.cameraManager.scrollY,
      this.cameraManager.height,
      this.clockMinutes,
    );

    // 4. UI: aggiorna orario, punteggio e party bar
    this.uiManager.update(
      this.clockMinutes,
      this.scoreManager.score,
      partyLevel,
    );

    // 5. Spawn di drink cadenti e bouncer (basato sulla distanza percorsa)
    this.spawnManager.checkSpawns(
      this.scoreManager.highestYReached,
      level,
      this.cameraManager.scrollY,
    );

    // 6. Riciclo piattaforme uscite dal fondo dello schermo
    this.spawnManager.recyclePlatforms(
      this.cameraManager.scrollY,
      this.cameraManager.height,
      level,
    );

    // 7. Pulizia entità fuori schermo (drink, fango, bouncer)
    this.spawnManager.cleanupOffscreen(
      this.cameraManager.scrollY,
      this.cameraManager.height,
    );

    // 8. Game Over: il giocatore è caduto sotto lo schermo
    if (
      this.player.y >
      this.cameraManager.scrollY + this.cameraManager.height
    ) {
      // Ferma la musica
      if (this.backgroundMusic) {
        this.backgroundMusic.stop();
      }

      this.scene.start("GameOverScene", {
        score: this.scoreManager.score,
        clockMinutes: this.clockMinutes,
        level: this.levelManager.level,
        drinkCount: this.partyManager.drinkCount,
        isTimeout: false,
      });
    }
  }

  /**
   * Mostra un punteggio floating che sale e scompare.
   * @param x Posizione X del punteggio
   * @param y Posizione Y del punteggio
   * @param points Punti da visualizzare
   * @param color Colore del testo (es. "#FFD700" per oro, "#FF6B35" per arancione)
   */
  private showFloatingScore(
    x: number,
    y: number,
    points: number,
    color: string,
  ): void {
    const scoreText = this.add.text(x, y, `+${points}`, {
      fontFamily: "ChillPixels",
      fontSize: `${Math.round(14 * GAME.SCALE)}px`,
      color: color,
      stroke: "#000000",
      strokeThickness: Math.round(2 * GAME.SCALE),
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(100); // Sopra tutto
    scoreText.setScrollFactor(1); // Segue la camera

    // Animazione: sale verso l'alto e scompare con fade out
    this.tweens.add({
      targets: scoreText,
      y: y - Math.round(60 * GAME.SCALE),
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => {
        scoreText.destroy();
      },
    });
  }

  /**
   * Gestisce il toggle della pausa da UIManager.
   */
  private handlePauseToggle(paused: boolean): void {
    this.isPaused = paused;

    if (paused) {
      // Pausa il gioco
      this.physics.pause();
      this.anims.pauseAll();
      this.tweens.pauseAll();

      // Pausa la musica (solo se l'audio è abilitato)
      if (this.backgroundMusic && SETTINGS.audioEnabled) {
        this.backgroundMusic.pause();
      }

      // Mostra il menu di pausa
      this.pauseMenuManager.show();
    } else {
      this.resumeGame();
    }
  }

  /**
   * Riprende il gioco dalla pausa.
   */
  private resumeGame(): void {
    this.isPaused = false;

    // Riprendi la fisica e le animazioni
    this.physics.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();

    // Riprendi la musica (solo se l'audio è abilitato)
    if (this.backgroundMusic && SETTINGS.audioEnabled) {
      this.backgroundMusic.resume();
    }

    // Nascondi il menu di pausa
    this.pauseMenuManager.hide();
  }

  /**
   * Riavvia il gioco dall'inizio.
   */
  private restartGame(): void {
    // Riprendi la scena (necessario se era in pausa)
    this.physics.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();

    // Nascondi il menu
    this.pauseMenuManager.hide();

    // Ferma la musica prima di riavviare (verrà ricreata nel create())
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }

    // Riavvia la scena
    this.scene.restart();
  }

  /**
   * Toggle dell'accelerometro.
   */
  private toggleGyro(): void {
    SETTINGS.gyroEnabled = !SETTINGS.gyroEnabled;
    this.pauseMenuManager.updateGyroState(SETTINGS.gyroEnabled);
  }

  /**
   * Toggle dell'audio.
   */
  private toggleAudio(): void {
    SETTINGS.audioEnabled = !SETTINGS.audioEnabled;
    this.pauseMenuManager.updateAudioState(SETTINGS.audioEnabled);

    // Gestisci la musica di sottofondo
    if (this.backgroundMusic) {
      if (SETTINGS.audioEnabled) {
        if (!this.backgroundMusic.isPlaying) {
          this.backgroundMusic.play();
        }
      } else {
        this.backgroundMusic.pause();
      }
    }
  }
}
