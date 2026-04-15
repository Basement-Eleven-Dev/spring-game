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
  TIME,
} from "./GameConfig";
import { Player } from "./Player";
import { Platform } from "./Platform";
import { Bouncer } from "./Bouncer";
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
    this.load.image("drinkTexture", "/assets/drink.png");

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

    // --- Giocatore (usa il primo frame dello sheet destro come texture iniziale) ---
    this.player = new Player(
      this,
      GAME.WIDTH / 2,
      INITIAL.PLAYER_START_Y,
      "playerJumpRight",
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

    // --- Overlap Giocatore ↔ Bouncer (presa + lancio laterale) ---
    // Flusso: il bouncer afferra il player (lo blocca in posizione),
    // gioca l'animazione di presa, e al completamento lo scaglia via.
    this.physics.add.overlap(
      this.player,
      this.spawnManager.bouncers,
      (playerObj, bouncerObj) => {
        const p = playerObj as Player;
        const b = bouncerObj as Bouncer;
        if (!p.body) return;

        const now = this.time.now;
        if (!b.canThrow(now)) return; // Cooldown attivo — ignora

        // --- FASE 1: PRESA — blocca il player accanto al bouncer ---
        p.stun(BOUNCER.STUN_DURATION_MS);
        p.setVelocity(0, 0);
        p.body.allowGravity = false; // Congela in aria durante la presa

        // --- FASE 2: ANIMAZIONE di presa (frame 0→1→2) ---
        const lateralDir = p.x < b.x ? -1 : 1;
        b.performThrow(now);
        b.once("animationcomplete", () => {
          // --- FASE 3: LANCIO — scaglia il player GIÙ e di lato (punitivo) ---
          if (p.body) {
            p.body.allowGravity = true;
            p.setVelocityX(lateralDir * BOUNCER.LATERAL_FORCE);
            p.setVelocityY(BOUNCER.KNOCKBACK_FORCE); // positivo = verso il basso
          }
          b.stop();
          b.setFrame(0);
        });
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
