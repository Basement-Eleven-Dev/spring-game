import * as Phaser from "phaser";
import { GAME, PHYSICS, BOUNCER, JUMP_MULTIPLIERS, LEVEL } from "./GameConfig";
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

  constructor() {
    super("GameScene");
  }

  /**
   * Preload: caricamento di tutti gli asset grafici.
   * I file risiedono nella cartella public/assets/.
   */
  preload(): void {
    this.load.image("playerTexture", "/assets/player.png");
    this.load.image("standardTexture", "/assets/pedana_standard.png");
    this.load.image("fragileTexture", "/assets/pedana_rotta.png");
    this.load.image("subwooferTexture", "/assets/trampolino.png");
    this.load.image("drinkTexture", "/assets/drink.png");
    this.load.image("movingTexture", "/assets/pedana_scorrevole.png");
    this.load.image("bouncerTexture", "/assets/buttafuori.png");
  }

  /**
   * Create: inizializzazione del mondo di gioco.
   * Crea manager, piattaforme, giocatore e registra i collider.
   */
  create(): void {
    // --- Pulizia di eventuali listener da run precedenti ---
    this.events.off("wasted-ready");

    // --- Fisica e sfondo ---
    this.physics.world.gravity.y = PHYSICS.BASE_GRAVITY;
    this.cameras.main.setBackgroundColor("#87CEEB");

    // --- Creazione Manager ---
    this.cameraManager = new CameraManager(this);
    this.levelManager = new LevelManager(this);
    this.scoreManager = new ScoreManager(this, 600);
    this.spawnManager = new SpawnManager(this);
    this.partyManager = new PartyManager(this, this.cameraManager);

    // --- Piattaforme iniziali ---
    this.spawnManager.spawnInitialPlatforms(this.levelManager.level);

    // --- Giocatore ---
    this.player = new Player(this, GAME.WIDTH / 2, 600, "playerTexture");

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

          // Le piattaforme fragili si distruggono al contatto
          if (plat.platformType === "fragile") {
            plat.destroy();
            this.spawnManager.spawnPlatform(
              this.spawnManager.highestPlatformY -
                Phaser.Math.Between(50, 130),
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
  update(): void {
    const level = this.levelManager.level;
    const partyLevel = this.partyManager.partyLevel;
    const isWasted = this.partyManager.isWasted;

    // 1. Input e movimento del giocatore
    this.player.updateMovement(partyLevel, isWasted);

    // 2. Camera: segue il giocatore + effetti ubriachezza
    this.cameraManager.update(this.player.y, partyLevel, isWasted);

    // 3. Punteggio e distanza
    this.scoreManager.update(this.player.y, level, partyLevel, isWasted);

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
    if (this.player.y > this.cameraManager.scrollY + this.cameraManager.height) {
      this.scene.start("GameOverScene", {
        score: this.scoreManager.score,
        distance: this.scoreManager.distance,
        level: this.levelManager.level,
      });
    }
  }
}
