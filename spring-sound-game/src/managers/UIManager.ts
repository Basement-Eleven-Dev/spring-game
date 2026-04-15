import * as Phaser from "phaser";
import { GAME, UI, PARTY, minutesToClockString } from "../GameConfig";

/**
 * UIManager
 * ==========
 * Gestisce l'interfaccia utente del gioco con elementi grafici SVG.
 *
 * Top bar con 3 elementi evenly spaced:
 * - Sinistra:  Icona orario (day/sunset/night) + tempo HH:MM
 * - Centro:    Points bar + punteggio
 * - Destra:    Controllo pause/play
 *
 * PROTEZIONE DAGLI EFFETTI: Gli elementi UI vengono renderizzati da una camera
 * dedicata (uiCamera) che non subisce rotazioni, blur o shake. La camera principale
 * ignora completamente questi elementi, garantendo che rimangano sempre fissi e nitidi.
 *
 * RESPONSIVE: Tutte le dimensioni sono scalate con GAME.SCALE.
 */
export class UIManager {
  private scene: Phaser.Scene;

  // --- Camera dedicata per la UI (nessun effetto, sempre fissa e nitida) ---
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  // --- Shorthand per scalare valori ---
  private r: (v: number) => number;

  // --- Elementi UI top bar ---
  private timeIcon!: Phaser.GameObjects.Image;
  private timeText!: Phaser.GameObjects.Text;
  private pointsBar!: Phaser.GameObjects.Image;
  private pointsText!: Phaser.GameObjects.Text;
  private controlButton!: Phaser.GameObjects.Image;
  private partyBarIcon!: Phaser.GameObjects.Image;

  // --- Stato corrente ---
  private currentTimePhase: "day" | "sunset" | "night" = "day";
  private currentPartyPhase: "empty" | "green" | "yellow" | "orange" | "red" =
    "empty";
  private isPaused: boolean = false;

  // --- Callback per la pausa ---
  private onPauseToggle?: (paused: boolean) => void;

  // --- Posizioni calcolate ---
  private timeIconX!: number;
  private timeIconY!: number;
  private pointsBarX!: number;
  private pointsBarY!: number;
  private controlButtonX!: number;
  private controlButtonY!: number;
  private partyBarX!: number;
  private partyBarY!: number;

  /**
   * Crea il manager UI.
   * Il caricamento degli asset SVG deve essere fatto nel preload della scene.
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);

    // Crea camera UI dedicata: nessun effetto, sempre fissa e nitida
    this.uiCamera = scene.cameras.add(0, 0, GAME.WIDTH, GAME.HEIGHT);
    // Trasparente: non mostra il background, solo gli elementi UI
    this.uiCamera.setBackgroundColor("rgba(0,0,0,0)");

    this.calculatePositions();
    this.createUI();

    // NON configuriamo ancora l'esclusività, lo faremo dopo che tutti gli oggetti
    // di gioco sono stati creati (chiamato da GameScene)
  }

  /**
   * Configura l'exclusivity delle camere DOPO che tutti gli oggetti iniziali
   * sono stati creati. Deve essere chiamato da GameScene dopo create().
   */
  public finalizeSetup(onPauseToggle: (paused: boolean) => void): void {
    this.onPauseToggle = onPauseToggle;
    this.configureUICameraExclusivity();
  }

  /**
   * Riconfigura le camere per includere nuovi elementi UI (es. menu di pausa).
   * Da chiamare quando vengono aggiunti elementi UI dopo il finalizeSetup.
   */
  public reconfigureCameras(): void {
    this.configureUICameraExclusivity();
  }

  /**
   * Calcola le posizioni degli elementi allineati perfettamente.
   * Layout: [timeIcon] --- [pointsBar] --- [controlButton]
   *
   * POSIZIONAMENTI:
   * - timeIcon:      Y = 8px (più in alto)
   * - pointsBar:     Y = 18px (allineata al play button), altezza = 40px
   * - controlButton: Y = 16px (altezza corretta), X = 12px dal bordo destro
   */
  private calculatePositions(): void {
    const r = this.r;
    const padding = r(UI.TOP_BAR_PADDING);

    // Dividiamo lo schermo in 3 zone per distribuzione orizzontale
    const zoneWidth = GAME.WIDTH / 3;

    // Time icon: più in alto rispetto agli altri
    this.timeIconX = zoneWidth / 2;
    this.timeIconY = r(8); // Più su

    // Points bar: spostata a destra per evitare collisione con time icon
    this.pointsBarX = GAME.WIDTH / 2 + r(30);
    this.pointsBarY = r(27); // Tirata su

    // Control button: vicino al bordo destro
    this.controlButtonX = GAME.WIDTH - padding - r(UI.CONTROL_BUTTON_SIZE) / 2;
    this.controlButtonY = r(27); // Altezza giusta

    // Party bar: sotto il time icon, allineata a sinistra
    this.partyBarX = r(UI.PARTY_BAR_X);
    this.partyBarY = r(UI.PARTY_BAR_Y);
  }

  /**
   * Crea tutti gli elementi UI con depth alto per stare sopra il game world.
   */
  private createUI(): void {
    const r = this.r;

    // --- Icona orario (inizialmente day) ---
    this.timeIcon = this.scene.add
      .image(this.timeIconX, this.timeIconY, "dayIcon")
      .setOrigin(0.5, 0)
      .setDisplaySize(r(UI.TIME_ICON_WIDTH), r(UI.TIME_ICON_HEIGHT))
      .setScrollFactor(0)
      .setDepth(100);

    // Testo orario posizionato più in basso dentro l'icona (75% dell'altezza)
    this.timeText = this.scene.add
      .text(
        this.timeIconX,
        this.timeIconY + r(UI.TIME_ICON_HEIGHT) * 0.7,
        "16:00",
        {
          fontFamily: "ChillPixels",
          fontSize: `${r(13)}px`,
          color: "#000000",
        },
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    // --- Points bar (centro) - altezza pari al play button ---
    this.pointsBar = this.scene.add
      .image(this.pointsBarX, this.pointsBarY, "pointsBarIcon")
      .setOrigin(0.5, 0)
      .setDisplaySize(r(UI.POINTS_BAR_WIDTH), r(UI.CONTROL_BUTTON_SIZE))
      .setScrollFactor(0)
      .setDepth(100);

    // Testo punteggio centrato sulla bar
    this.pointsText = this.scene.add
      .text(
        this.pointsBarX,
        this.pointsBarY + r(UI.CONTROL_BUTTON_SIZE) / 2,
        "0",
        {
          fontFamily: "ChillPixels",
          fontSize: `${r(15)}px`,
          color: "#000000",
        },
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    // --- Controllo pause/play (altezza giusta, vicino al bordo) ---
    // INIZIA CON ICONA PAUSE perché il gioco parte già in esecuzione
    this.controlButton = this.scene.add
      .image(this.controlButtonX, this.controlButtonY, "pauseIcon")
      .setOrigin(0.5, 0)
      .setDisplaySize(r(UI.CONTROL_BUTTON_SIZE), r(UI.CONTROL_BUTTON_SIZE))
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    // Click handler per pause/play
    this.controlButton.on("pointerdown", () => this.togglePause());

    // --- Party bar (sotto il time icon, inizialmente empty) ---
    this.partyBarIcon = this.scene.add
      .image(this.partyBarX, this.partyBarY, "partyBarEmpty")
      .setOrigin(0, 0)
      .setDisplaySize(r(UI.PARTY_BAR_WIDTH), r(UI.PARTY_BAR_HEIGHT))
      .setScrollFactor(0)
      .setDepth(100);
  }

  /**
   * Configura l'esclusività delle camere:
   * - Camera principale: ignora SOLO gli elementi UI (depth >= 100)
   * - Camera UI: ignora SOLO il mondo di gioco (depth 0-99) e il background (depth < 0)
   *
   * Lo sfondo è gestito dal backgroundColor delle camere, non come oggetto.
   * Main camera ha backgroundColor colorato, UI camera ha backgroundColor trasparente.
   */
  private configureUICameraExclusivity(): void {
    const allObjects = this.scene.children.list;

    // Filtra per depth: UI (>= 100) vs mondo di gioco (< 100)
    // Questo cattura automaticamente TUTTI gli elementi UI, incluso il menu di pausa (depth 200-201)
    const uiObjects = allObjects.filter(
      (obj: any) => obj.depth !== undefined && obj.depth >= 100,
    );
    const worldObjects = allObjects.filter(
      (obj: any) => obj.depth !== undefined && obj.depth < 100,
    );

    // Camera principale: ignora TUTTI gli elementi UI (depth >= 100)
    // Il mondo (depth 0-99) e il background (depth < 0) vengono renderizzati con rotazione/blur
    if (uiObjects.length > 0) {
      this.scene.cameras.main.ignore(uiObjects);
    }

    // Camera UI: ignora SOLO gli oggetti del mondo di gioco (depth < 100)
    // Gli elementi UI (depth >= 100) vengono renderizzati senza effetti
    if (worldObjects.length > 0) {
      this.uiCamera.ignore(worldObjects);
    }
  }

  /**
   * Ignora un oggetto dalla UI camera se è un oggetto del mondo di gioco o del background.
   * Da chiamare quando vengono creati nuovi oggetti durante il gioco (drinks, piattaforme riciclate, ecc).
   */
  public ignoreWorldObject(obj: Phaser.GameObjects.GameObject): void {
    const gameObj = obj as any;
    if (gameObj.depth !== undefined && gameObj.depth < 100) {
      this.uiCamera.ignore(obj);
    }
  }

  /**
   * Aggiorna l'UI ogni frame.
   * @param clockMinutes Minuti narrativi trascorsi (da GameScene)
   * @param score        Punteggio corrente
   * @param partyLevel   Party level corrente (0-100)
   */
  public update(clockMinutes: number, score: number, partyLevel: number): void {
    // Aggiorna l'orario
    this.timeText.setText(minutesToClockString(clockMinutes));

    // Aggiorna il punteggio
    this.pointsText.setText(Math.floor(score).toString());

    // Switch dell'icona orario in base ai minuti trascorsi
    this.updateTimeIcon(clockMinutes);

    // Switch della party bar in base al party level
    this.updatePartyBar(partyLevel);
  }

  /**
   * Aggiorna l'icona orario in base alla fascia oraria.
   * - Day:    16:00 - 19:00 (0 - 180 min)
   * - Sunset: 19:00 - 23:00 (180 - 420 min)
   * - Night:  23:00 - 04:00 (420+ min)
   */
  private updateTimeIcon(clockMinutes: number): void {
    let newPhase: "day" | "sunset" | "night";

    if (clockMinutes >= UI.NIGHT_START_MINUTES) {
      newPhase = "night";
    } else if (clockMinutes >= UI.SUNSET_START_MINUTES) {
      newPhase = "sunset";
    } else {
      newPhase = "day";
    }

    // Cambio texture solo se la fase è cambiata
    if (newPhase !== this.currentTimePhase) {
      this.currentTimePhase = newPhase;

      let iconKey: string;
      switch (newPhase) {
        case "day":
          iconKey = "dayIcon";
          break;
        case "sunset":
          iconKey = "sunsetIcon";
          break;
        case "night":
          iconKey = "nightIcon";
          break;
      }

      this.timeIcon.setTexture(iconKey);

      // Piccolo effetto di fade per rendere fluida la transizione
      this.timeIcon.setAlpha(0);
      this.scene.tweens.add({
        targets: this.timeIcon,
        alpha: 1,
        duration: 600,
        ease: "Sine.easeInOut",
      });
    }
  }

  /**
   * Aggiorna l'icona della party bar in base al party level.
   * - Empty:  0 (nessun drink raccolto)
   * - Green:  1-29
   * - Yellow: 30-59 (THRESHOLD_YELLOW)
   * - Orange: 60-99 (THRESHOLD_ORANGE)
   * - Red:    100 (THRESHOLD_RED, stato wasted)
   */
  private updatePartyBar(partyLevel: number): void {
    let newPhase: "empty" | "green" | "yellow" | "orange" | "red";

    if (partyLevel === 0) {
      newPhase = "empty";
    } else if (partyLevel >= PARTY.THRESHOLD_RED) {
      newPhase = "red";
    } else if (partyLevel >= PARTY.THRESHOLD_ORANGE) {
      newPhase = "orange";
    } else if (partyLevel >= PARTY.THRESHOLD_YELLOW) {
      newPhase = "yellow";
    } else {
      newPhase = "green";
    }

    // Cambio texture solo se la fase è cambiata
    if (newPhase !== this.currentPartyPhase) {
      this.currentPartyPhase = newPhase;

      let iconKey: string;
      switch (newPhase) {
        case "empty":
          iconKey = "partyBarEmpty";
          break;
        case "green":
          iconKey = "partyBarGreen";
          break;
        case "yellow":
          iconKey = "partyBarYellow";
          break;
        case "orange":
          iconKey = "partyBarOrange";
          break;
        case "red":
          iconKey = "partyBarRed";
          break;
      }

      this.partyBarIcon.setTexture(iconKey);

      // Piccolo effetto di scala quando cambia stato
      this.scene.tweens.add({
        targets: this.partyBarIcon,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  /**.
   * Inverte l'icona e chiama il callback fornito da GameScene.
   */
  private togglePause(): void {
    this.isPaused = !this.isPaused;

    const newTexture = this.isPaused ? "playIcon" : "pauseIcon";
    this.controlButton.setTexture(newTexture);

    // Piccolo effetto di scale al click
    this.scene.tweens.add({
      targets: this.controlButton,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: "Quad.easeInOut",
    });

    // Chiama il callback della GameScene per gestire la pausa effettiva
    if (this.onPauseToggle) {
      this.onPauseToggle(this.isPaused);
    }
    console.log(`Game ${this.isPaused ? "PAUSED" : "PLAYING"}`);
  }

  /**
   * Aggiungi punti bonus (chiamato da eventi speciali come level up).
   */
  public addBonusPoints(_points: number): void {
    // Flash visivo sulla points bar
    this.scene.tweens.add({
      targets: this.pointsBar,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 150,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // Particelle +points sopra la bar (opzionale, da implementare)
  }

  /**
   * Getter per lo stato di pausa (da usare nella GameScene).
   */
  public get paused(): boolean {
    return this.isPaused;
  }

  /**
   * Metodo statico per caricare gli asset SVG nel preload della scene.
   *
   * Le dimensioni usano r() che già include il DPR (via GAME.SCALE).
   * Il canvas opera a risoluzione fisica nativa, quindi r(size) produce
   * il numero esatto di pixel necessari → nessun upscale → perfettamente nitido.
   */
  public static preloadAssets(scene: Phaser.Scene): void {
    const r = (v: number) => Math.round(v * GAME.SCALE);

    // Icone orario (day, sunset, night)
    scene.load.svg("dayIcon", "/assets/ui/day.svg", {
      width: r(UI.TIME_ICON_WIDTH),
      height: r(UI.TIME_ICON_HEIGHT),
    });
    scene.load.svg("sunsetIcon", "/assets/ui/sunset.svg", {
      width: r(UI.TIME_ICON_WIDTH),
      height: r(UI.TIME_ICON_HEIGHT),
    });
    scene.load.svg("nightIcon", "/assets/ui/night.svg", {
      width: r(UI.TIME_ICON_WIDTH),
      height: r(UI.TIME_ICON_HEIGHT),
    });

    // Points bar
    scene.load.svg("pointsBarIcon", "/assets/ui/points_bar.svg", {
      width: r(UI.POINTS_BAR_WIDTH),
      height: r(UI.POINTS_BAR_HEIGHT),
    });

    // Controlli pause/play
    scene.load.svg("pauseIcon", "/assets/ui/pause.svg", {
      width: r(UI.CONTROL_BUTTON_SIZE),
      height: r(UI.CONTROL_BUTTON_SIZE),
    });
    scene.load.svg("playIcon", "/assets/ui/play.svg", {
      width: r(UI.CONTROL_BUTTON_SIZE),
      height: r(UI.CONTROL_BUTTON_SIZE),
    });

    // Party bar (5 stati: empty, green, yellow, orange, red)
    scene.load.svg("partyBarEmpty", "/assets/ui/party_bar_empty.svg", {
      width: r(UI.PARTY_BAR_WIDTH),
      height: r(UI.PARTY_BAR_HEIGHT),
    });
    scene.load.svg("partyBarGreen", "/assets/ui/party_bar_green.svg", {
      width: r(UI.PARTY_BAR_WIDTH),
      height: r(UI.PARTY_BAR_HEIGHT),
    });
    scene.load.svg("partyBarYellow", "/assets/ui/party_bar_yellow.svg", {
      width: r(UI.PARTY_BAR_WIDTH),
      height: r(UI.PARTY_BAR_HEIGHT),
    });
    scene.load.svg("partyBarOrange", "/assets/ui/party_bar_orange.svg", {
      width: r(UI.PARTY_BAR_WIDTH),
      height: r(UI.PARTY_BAR_HEIGHT),
    });
    scene.load.svg("partyBarRed", "/assets/ui/party_bar_red.svg", {
      width: r(UI.PARTY_BAR_WIDTH),
      height: r(UI.PARTY_BAR_HEIGHT),
    });
  }
}
