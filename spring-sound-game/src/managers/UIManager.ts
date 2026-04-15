import * as Phaser from "phaser";
import { GAME, UI, minutesToClockString } from "../GameConfig";

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
 * Gli elementi UI hanno depth 100+ per restare sopra tutti gli effetti
 * del gioco (blur, shake, etc.) e scrollFactor(0) per restare fissi.
 *
 * RESPONSIVE: Tutte le dimensioni sono scalate con GAME.SCALE.
 */
export class UIManager {
  private scene: Phaser.Scene;

  // --- Shorthand per scalare valori ---
  private r: (v: number) => number;

  // --- Elementi UI top bar ---
  private timeIcon!: Phaser.GameObjects.Image;
  private timeText!: Phaser.GameObjects.Text;
  private pointsBar!: Phaser.GameObjects.Image;
  private pointsText!: Phaser.GameObjects.Text;
  private controlButton!: Phaser.GameObjects.Image;

  // --- Stato corrente ---
  private currentTimePhase: "day" | "sunset" | "night" = "day";
  private isPaused: boolean = false;

  // --- Posizioni calcolate ---
  private timeIconX!: number;
  private timeIconY!: number;
  private pointsBarX!: number;
  private pointsBarY!: number;
  private controlButtonX!: number;
  private controlButtonY!: number;

  /**
   * Crea il manager UI.
   * Il caricamento degli asset SVG deve essere fatto nel preload della scene.
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
    this.calculatePositions();
    this.createUI();
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
          fontFamily: "ChillPixels, monospace",
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
          fontFamily: "ChillPixels, monospace",
          fontSize: `${r(15)}px`,
          color: "#000000",
        },
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    // --- Controllo pause/play (altezza giusta, vicino al bordo) ---
    this.controlButton = this.scene.add
      .image(this.controlButtonX, this.controlButtonY, "playIcon")
      .setOrigin(0.5, 0)
      .setDisplaySize(r(UI.CONTROL_BUTTON_SIZE), r(UI.CONTROL_BUTTON_SIZE))
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    // Click handler per pause/play
    this.controlButton.on("pointerdown", () => this.togglePause());
  }

  /**
   * Aggiorna l'UI ogni frame.
   * @param clockMinutes Minuti narrativi trascorsi (da GameScene)
   * @param score        Punteggio corrente
   */
  public update(clockMinutes: number, score: number): void {
    // Aggiorna l'orario
    this.timeText.setText(minutesToClockString(clockMinutes));

    // Aggiorna il punteggio
    this.pointsText.setText(Math.floor(score).toString());

    // Switch dell'icona orario in base ai minuti trascorsi
    this.updateTimeIcon(clockMinutes);
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
   * Toggle pause/play (per ora solo visivo, la logica verrà integrata dopo).
   */
  private togglePause(): void {
    this.isPaused = !this.isPaused;

    const newTexture = this.isPaused ? "pauseIcon" : "playIcon";
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

    // TODO: Implementare la logica di pausa del gioco
    console.log(`Game ${this.isPaused ? "PAUSED" : "PLAYING"}`);
  }

  /**
   * Aggiungi punti bonus (chiamato da eventi speciali come level up).
   */
  public addBonusPoints(points: number): void {
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
   * Carica con dimensioni scalate per evitare sgranature.
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
  }
}
