import * as Phaser from "phaser";
import {
  GAME,
  INITIAL,
  PHYSICS,
  BOUNCER,
  JUMP_MULTIPLIERS,
  LEVEL,
  PLATFORM,
  TIME,
} from "./GameConfig";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { CameraManager } from "./managers/CameraManager";
import { ScoreManager } from "./managers/ScoreManager";
import { PartyManager } from "./managers/PartyManager";
import { SpawnManager } from "./managers/SpawnManager";
import { LevelManager } from "./managers/LevelManager";

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
  private cameraManager!: CameraManager;
  private scoreManager!: ScoreManager;
  private partyManager!: PartyManager;
  private spawnManager!: SpawnManager;
  private levelManager!: LevelManager;

  // --- Orologio narrativo ---
  /** Minuti narrativi trascorsi dall'inizio (1 secondo reale = 1 minuto narrativo). */
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
    this.load.image("playerTexture", "/assets/player.png");
    this.load.image("drinkTexture", "/assets/drink.png");
    this.load.image("bouncerTexture", "/assets/buttafuori.png");

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
    this.cameraManager = new CameraManager(this);
    this.levelManager = new LevelManager(this);
    this.scoreManager = new ScoreManager(this, INITIAL.PLAYER_START_Y);
    this.spawnManager = new SpawnManager(this);
    this.partyManager = new PartyManager(this, this.cameraManager);

    // --- Piattaforme iniziali ---
    this.spawnManager.spawnInitialPlatforms(this.levelManager.level);

    // --- Giocatore ---
    this.player = new Player(
      this,
      GAME.WIDTH / 2,
      INITIAL.PLAYER_START_Y,
      "playerTexture",
    );

    // --- Collisioni ---
    this.setupColliders();

    // --- Evento: il DJ Stage deve apparire (emesso da PartyManager dopo il wasted delay) ---
    this.events.on("wasted-ready", () => {
      this.spawnManager.spawnDJStage(
        this.cameraManager.scrollY,
        this.levelManager.level,
      );
    });
  }

  /**
   * Definisce le animazioni spritesheet.
   * Chiamato una volta in create() — Phaser condivide le animazioni tra tutti gli sprite.
   *
   * - fragileBreak: 2 frame (intera → rotta), play singolo al contatto
   * - subwooferPump: 4 frame (cassa che pompa), loop continuo
   */
  private createAnimations(): void {
    // Evita duplicati se la scena viene riavviata
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

          // Cambio background notte se il tempo ha superato le 21:00
          if (this.nightPending) {
            this.cameraManager.switchToNight();
            this.nightPending = false;
          }

          p.jump(LEVEL.JUMP_BOOST_ON_STAGE, this.levelManager.level);
          return;
        }

        // --- Piattaforme normali: il salto si attiva solo atterrando dall'alto ---
        if (p.body && p.body.touching.down && plat.body.touching.up) {
          // Determina il tipo di salto
          const isTouchingMud = this.physics.overlap(p, this.spawnManager.muds);

          if (plat.platformType === "subwoofer") {
            // Trampolino: salto potenziato x1.6
            p.jump(JUMP_MULTIPLIERS.SUBWOOFER, this.levelManager.level);
          } else if (isTouchingMud) {
            // Fango: salto indebolito x0.8
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
            plat.setVelocityY(300);
            // Genera una nuova piattaforma in alto per mantenere la densità
            this.spawnManager.spawnPlatform(
              this.spawnManager.highestPlatformY - Phaser.Math.Between(50, 130),
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
        (drinkObj as Phaser.Physics.Arcade.Sprite).destroy();
        this.partyManager.collectDrink();
      },
    );

    // --- Collisione Giocatore ↔ Bouncer (respinta verso il basso) ---
    this.physics.add.collider(
      this.player,
      this.spawnManager.bouncers,
      (playerObj, _bouncerObj) => {
        const p = playerObj as Player;
        if (p.body) {
          p.setVelocityY(BOUNCER.KNOCKBACK_FORCE);
        }
      },
    );
  }

  /**
   * Update: ciclo di gioco principale.
   * Delega tutto ai manager nell'ordine corretto.
   */
  update(_time: number, delta: number): void {
    // --- Orologio narrativo: 1 millisecondo reale = 1/1000 minuto narrativo ---
    // => 1 secondo reale = 1 minuto narrativo
    this.clockMinutes += delta / 1000;

    // Sblocca il cambio notte quando il tempo supera le 21:00
    if (!this.nightPending && this.clockMinutes >= TIME.NIGHT_TRIGGER_MINUTES) {
      this.nightPending = true;
    }

    // Timeout alle 04:00: fine gioco con punteggio
    if (this.clockMinutes >= TIME.DURATION_MINUTES) {
      this.scene.start("GameOverScene", {
        score: this.scoreManager.score,
        clockMinutes: this.clockMinutes,
        level: this.levelManager.level,
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

    // 4. Spawn di drink cadenti e bouncer (basato sulla distanza percorsa)
    this.spawnManager.checkSpawns(
      this.scoreManager.highestYReached,
      level,
      this.cameraManager.scrollY,
    );

    // 5. Riciclo piattaforme uscite dal fondo dello schermo
    this.spawnManager.recyclePlatforms(
      this.cameraManager.scrollY,
      this.cameraManager.height,
      level,
    );

    // 6. Pulizia entità fuori schermo (drink, fango, bouncer)
    this.spawnManager.cleanupOffscreen(
      this.cameraManager.scrollY,
      this.cameraManager.height,
    );

    // 7. Game Over: il giocatore è caduto sotto lo schermo
    if (
      this.player.y >
      this.cameraManager.scrollY + this.cameraManager.height
    ) {
      this.scene.start("GameOverScene", {
        score: this.scoreManager.score,
        clockMinutes: this.clockMinutes,
        level: this.levelManager.level,
        isTimeout: false,
      });
    }
  }
}
