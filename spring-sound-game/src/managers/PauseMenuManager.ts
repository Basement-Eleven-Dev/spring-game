import * as Phaser from "phaser";
import { GAME, SETTINGS } from "../GameConfig";

/**
 * PauseMenuManager — Design Premium
 * ==================================
 * Menu di pausa ridisegnato con:
 * - Logo in alto
 * - Bottoni Riprendi e Nuova Partita
 * - Sezione Comandi con switch tap/movimento
 * - Decorazione in basso (grass + personaggio)
 */
export class PauseMenuManager {
  private scene: Phaser.Scene;
  private r: (v: number) => number;

  // --- Elementi UI ---
  private overlay!: Phaser.GameObjects.Rectangle;
  private menuContainer!: Phaser.GameObjects.Container;

  // Comandi
  private controlModeText!: Phaser.GameObjects.Text;
  private currentMode: "tap" | "gyro" = "tap";

  // Audio
  private audioIcon!: Phaser.GameObjects.Image;

  // --- Callbacks ---
  private onResume?: () => void;
  private onRestart?: () => void;
  private onToggleGyro?: () => void;
  private onToggleAudio?: () => void;

  // --- Stato ---
  private isVisible: boolean = false;
  private isMobile: boolean = false;
  private iosPermissionGranted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
    this.isMobile = navigator.maxTouchPoints > 0;
  }

  /**
   * Crea tutti gli elementi del menu di pausa.
   */
  public create(
    onResume: () => void,
    onRestart: () => void,
    onToggleGyro: () => void,
    onToggleAudio: () => void,
  ): void {
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onToggleGyro = onToggleGyro;
    this.onToggleAudio = onToggleAudio;

    const r = this.r;
    const centerX = GAME.WIDTH / 2;
    const centerY = GAME.HEIGHT / 2;

    // --- Overlay semi-trasparente ---
    this.overlay = this.scene.add
      .rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);

    // --- Container principale ---
    this.menuContainer = this.scene.add
      .container(centerX, centerY)
      .setDepth(201)
      .setScrollFactor(0)
      .setVisible(false);

    // --- LOGO ---
    // Cerchio beige di sfondo
    const logoCircle = this.scene.add
      .circle(0, r(-220), r(70), 0xf8f0cd)
      .setStrokeStyle(r(3), 0x000000);
    this.menuContainer.add(logoCircle);

    // Logo sopra il cerchio
    const logo = this.scene.add
      .image(0, r(-220), "pauseLogo")
      .setDisplaySize(r(110), r(110));
    this.menuContainer.add(logo);

    // --- Bottone RIPRENDI ---
    const resumeBtn = this.createButtonWithIcon(
      0,
      r(-150),
      "RIPRENDI",
      0xff4b1e,
      "pausePlayIcon",
      () => this.onResume?.(),
    );
    this.menuContainer.add(resumeBtn);

    // --- Bottone NUOVA PARTITA ---
    const restartBtn = this.createSimpleButton(
      0,
      r(-70),
      "NUOVA PARTITA",
      0xf8f0cd,
      () => this.onRestart?.(),
    );
    this.menuContainer.add(restartBtn);

    // --- Blocco COMANDI (solo su mobile) ---
    if (this.isMobile) {
      // Blocco cliccabile TAP DITO / MOVIMENTO
      const controlBtn = this.createControlButton(
        0,
        r(10),
        SETTINGS.gyroEnabled ? "MOVIMENTO" : "TAP DITO",
        0x118dfc,
        () => this.switchControlMode(),
      );
      this.menuContainer.add(controlBtn);

      // Salva il testo per aggiornamenti futuri
      this.controlModeText = controlBtn.getAt(1) as Phaser.GameObjects.Text;

      // --- Icona AUDIO sotto i comandi ---
      this.audioIcon = this.scene.add
        .image(
          0,
          r(90),
          SETTINGS.audioEnabled ? "pauseMusicOn" : "pauseMusicOff",
        )
        .setDisplaySize(r(50), r(50))
        .setInteractive({ useHandCursor: true });
      this.menuContainer.add(this.audioIcon);

      this.audioIcon.on("pointerover", () =>
        this.audioIcon.setDisplaySize(r(55), r(55)),
      );
      this.audioIcon.on("pointerout", () =>
        this.audioIcon.setDisplaySize(r(50), r(50)),
      );
      this.audioIcon.on("pointerdown", () => this.onToggleAudio?.());
    } else {
      // Desktop: icona audio centrata (nessuna sezione comandi)
      this.audioIcon = this.scene.add
        .image(
          0,
          r(10),
          SETTINGS.audioEnabled ? "pauseMusicOn" : "pauseMusicOff",
        )
        .setDisplaySize(r(50), r(50))
        .setInteractive({ useHandCursor: true });
      this.menuContainer.add(this.audioIcon);

      this.audioIcon.on("pointerover", () =>
        this.audioIcon.setDisplaySize(r(55), r(55)),
      );
      this.audioIcon.on("pointerout", () =>
        this.audioIcon.setDisplaySize(r(50), r(50)),
      );
      this.audioIcon.on("pointerdown", () => this.onToggleAudio?.());
    }

    // --- Decorazione in basso: GRASS + SPRING ---
    // Il container è centrato, quindi GAME.HEIGHT/2 è la distanza dal centro al fondo
    const grassHeight = GAME.HEIGHT / 2; // Distanza dal centro del container al fondo schermo

    // Grass: copre tutta la larghezza e mantiene proporzioni naturali (1265x1360 ~ 1:1.075)
    const grassWidth = GAME.WIDTH;
    const grassNaturalHeight = Math.round(grassWidth * 1.075); // Mantiene proporzioni

    // Personaggio spring PRIMA dell'erba (così è dietro), posizionato sull'erba in basso
    // L'erba ha origin (0.5, 1) quindi grassHeight è il suo bottom
    // Posiziono il personaggio leggermente sopra il fondo, così sta sull'erba
    const spring = this.scene.add
      .image(0, grassHeight - r(105), "pauseSpring")
      .setDisplaySize(r(100), r(100));
    this.menuContainer.add(spring);

    // Grass sopra il personaggio
    const grass = this.scene.add
      .image(0, grassHeight, "pauseGrass")
      .setDisplaySize(grassWidth, grassNaturalHeight)
      .setOrigin(0.5, 1); // Ancora in basso, così tocca il fondo
    this.menuContainer.add(grass);

    // Piccola animazione bounce del personaggio
    this.scene.tweens.add({
      targets: spring,
      y: grassHeight - r(120),
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * Switch tra modalità tap e gyro
   */
  private switchControlMode(): void {
    if (this.currentMode === "tap") {
      // Passa a gyro
      this.currentMode = "gyro";
      this.controlModeText.setText("MOVIMENTO");

      // Richiedi permesso se necessario
      if (!SETTINGS.gyroEnabled) {
        this.handleGyroToggle();
      }
    } else {
      // Torna a tap
      this.currentMode = "tap";
      this.controlModeText.setText("TAP DITO");

      // Disabilita gyro se attivo
      if (SETTINGS.gyroEnabled) {
        this.onToggleGyro?.();
      }
    }
  }

  /**
   * Gestisce il permesso accelerometro su iOS
   */
  private handleGyroToggle(): void {
    if (this.iosPermissionGranted) {
      this.onToggleGyro?.();
      return;
    }

    const needsIOSPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }
      ).requestPermission === "function";

    if (needsIOSPermission) {
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      )
        .requestPermission()
        .then((result: string) => {
          if (result === "granted") {
            this.iosPermissionGranted = true;
            this.onToggleGyro?.();
          } else {
            // Permesso negato, torna a tap
            this.currentMode = "tap";
            this.controlModeText.setText("TAP DITO");
          }
        })
        .catch(() => {
          // Errore, torna a tap
          this.currentMode = "tap";
          this.controlModeText.setText("TAP DITO");
        });
    } else {
      // Android o browser senza requisito di permesso
      this.onToggleGyro?.();
    }
  }

  /**
   * Crea bottone con icona (RIPRENDI)
   */
  private createButtonWithIcon(
    x: number,
    y: number,
    label: string,
    color: number,
    iconKey: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = this.r;
    const container = this.scene.add.container(x, y);

    // Background con bordi neri e angoli leggermente arrotondati
    const graphics = this.scene.add.graphics();
    const width = r(240);
    const height = r(60);
    const radius = r(8); // Angoli leggermente arrotondati

    // Disegna il rettangolo arrotondato
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    // Bordi neri: sottile sui lati e sopra, più spesso sotto
    graphics.lineStyle(r(2), 0x000000, 1);
    graphics.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height - r(2),
      radius,
    );
    graphics.lineStyle(r(4), 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(-width / 2 + radius, height / 2);
    graphics.lineTo(width / 2 - radius, height / 2);
    graphics.strokePath();

    container.add(graphics);

    // Icona play
    const icon = this.scene.add
      .image(r(-50), 0, iconKey)
      .setDisplaySize(r(20), r(20))
      .setTint(0xffffff);
    container.add(icon);

    // Testo
    const text = this.scene.add
      .text(r(-20), 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${r(20)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    container.add(text);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    // Hover effects
    container.on("pointerover", () => {
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      container.setScale(1);
    });

    container.on("pointerdown", () => {
      container.setScale(0.97);
    });

    container.on("pointerup", () => {
      container.setScale(1);
      onClick();
    });

    return container;
  }

  /**
   * Crea bottone semplice (NUOVA PARTITA)
   */
  private createSimpleButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = this.r;
    const container = this.scene.add.container(x, y);

    const graphics = this.scene.add.graphics();
    const width = r(240);
    const height = r(60);
    const radius = r(8);

    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    graphics.lineStyle(r(2), 0x000000, 1);
    graphics.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height - r(2),
      radius,
    );
    graphics.lineStyle(r(4), 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(-width / 2 + radius, height / 2);
    graphics.lineTo(width / 2 - radius, height / 2);
    graphics.strokePath();

    container.add(graphics);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${r(20)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(text);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      container.setScale(1);
    });

    container.on("pointerdown", () => {
      container.setScale(0.97);
    });

    container.on("pointerup", () => {
      container.setScale(1);
      onClick();
    });

    return container;
  }

  /**
   * Crea blocco controlli (TAP DITO / MOVIMENTO)
   */
  private createControlButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = this.r;
    const container = this.scene.add.container(x, y);

    const graphics = this.scene.add.graphics();
    const width = r(240);
    const height = r(60);
    const radius = r(8);

    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    graphics.lineStyle(r(2), 0x000000, 1);
    graphics.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height - r(2),
      radius,
    );
    graphics.lineStyle(r(4), 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(-width / 2 + radius, height / 2);
    graphics.lineTo(width / 2 - radius, height / 2);
    graphics.strokePath();

    container.add(graphics);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${r(20)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(text);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      container.setScale(1);
    });

    container.on("pointerdown", () => {
      container.setScale(0.97);
    });

    container.on("pointerup", () => {
      container.setScale(1);
      onClick();
    });

    return container;
  }

  /**
   * Mostra il menu di pausa
   */
  public show(): void {
    this.overlay.setVisible(true);
    this.menuContainer.setVisible(true);
    this.isVisible = true;

    // Imposta direttamente alpha 1 (i tweens sono in pausa quando il gioco è in pausa)
    this.menuContainer.setAlpha(1);
    this.menuContainer.setScale(1);

    // Aggiorna testo modalità in base allo stato gyro
    if (this.isMobile && this.controlModeText) {
      if (SETTINGS.gyroEnabled) {
        this.currentMode = "gyro";
        this.controlModeText.setText("MOVIMENTO");
      } else {
        this.currentMode = "tap";
        this.controlModeText.setText("TAP DITO");
      }
    }

    // Aggiorna icona audio
    if (this.audioIcon) {
      this.audioIcon.setTexture(
        SETTINGS.audioEnabled ? "pauseMusicOn" : "pauseMusicOff",
      );
      this.audioIcon.setDisplaySize(this.r(50), this.r(50)); // Mantiene dimensioni corrette
    }
  }

  /**
   * Nasconde il menu di pausa
   */
  public hide(): void {
    this.overlay.setVisible(false);
    this.menuContainer.setVisible(false);
    this.isVisible = false;
  }

  /**
   * Aggiorna lo stato del gyro (usato quando viene cambiato esternamente)
   */
  public updateGyroState(enabled: boolean): void {
    if (!this.isMobile || !this.controlModeText) return;

    if (enabled) {
      this.currentMode = "gyro";
      this.controlModeText.setText("MOVIMENTO");
    } else {
      this.currentMode = "tap";
      this.controlModeText.setText("TAP DITO");
    }
  }

  /**
   * Aggiorna lo stato dell'audio
   */
  public updateAudioState(enabled: boolean): void {
    if (!this.audioIcon) return;
    const r = this.r;
    this.audioIcon.setTexture(enabled ? "pauseMusicOn" : "pauseMusicOff");
    this.audioIcon.setDisplaySize(r(50), r(50)); // Mantiene le dimensioni corrette
  }

  /**
   * Getter per stato visibilità
   */
  public get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Restituisce gli elementi di gioco del menu di pausa
   */
  public getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.overlay, this.menuContainer];
  }
}
