import * as Phaser from "phaser";
import { GAME } from "../GameConfig";

/**
 * BackgroundManager
 * ==================
 * Gestisce il background scrollabile infinito composto da 3 immagini
 * (day_1, day_2, day_3) che si ripetono in loop durante la salita del giocatore.
 *
 * Le immagini vengono posizionate in sequenza verticale e si muovono
 * verso il basso quando la camera scorre verso l'alto. Quando un'immagine
 * esce completamente dal fondo dello schermo, viene riposizionata in alto
 * per creare un loop infinito seamless.
 */
export class BackgroundManager {
  private scene: Phaser.Scene;
  private backgrounds: Phaser.GameObjects.Image[] = [];
  private imageHeight: number = 0;

  /**
   * Preload statico delle immagini di background.
   * Da chiamare nel preload della GameScene.
   */
  public static preloadAssets(scene: Phaser.Scene): void {
    scene.load.image("day_1", "/assets/background/day_one/day_1.png");
    scene.load.image("day_2", "/assets/background/day_one/day_2.png");
    scene.load.image("day_3", "/assets/background/day_one/day_3.png");
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Crea il sistema di background scrollabile.
   * Le 3 immagini vengono disposte in sequenza verticale.
   * NON usano scrollFactor(0) ma seguono normalmente la camera.
   *
   * COPERTURA ROTAZIONE: le immagini sono renderizzate il 30% più larghe e alte
   * del viewport. Questo margine copre gli angoli esposti durante la rotazione
   * della camera (effetto ubriachezza). A rotazione max (0.15 rad ≈ 8.6°),
   * i corner del viewport escono per ~25% dei bordi normali → 30% dà un margine
   * di sicurezza sufficiente. Quando la rotazione è 0, i bordi extra sono
   * semplicemente fuori dal viewport visibile → nessun impatto visivo.
   *
   * Il tiling verticale resta perfetto perché tutte le immagini hanno la stessa
   * dimensione e imageHeight è calcolata sulla dimensione display effettiva.
   */
  public create(): void {
    // Ottieni le dimensioni della prima immagine per calcolare l'altezza
    const texture = this.scene.textures.get("day_1");
    const frame = texture.get();

    // Margine extra per coprire gli angoli durante la rotazione della camera.
    // Formula: cos(θ) + sin(θ) × (H/W) ≈ 1.25 per θ=0.15, arrotondato a 1.3.
    const ROTATION_COVER = 1.3;

    // Calcola l'altezza scalata mantenendo l'aspect ratio dell'immagine
    const aspectRatio = frame.width / frame.height;
    const displayWidth = Math.round(GAME.WIDTH * ROTATION_COVER);
    // Arrotonda sempre ai pixel interi per evitare sub-pixel rendering
    const displayHeight = Math.round(displayWidth / aspectRatio);
    this.imageHeight = displayHeight;

    // Crea le 3 immagini in sequenza: day_1, day_2, day_3
    // Partendo dalla posizione iniziale del giocatore e salendo verso l'alto
    const keys = ["day_1", "day_2", "day_3"];
    const startY = Math.round(GAME.HEIGHT - displayHeight / 2); // Parte dal basso

    // Overlap di 2 pixel per evitare gap visibili tra le immagini
    const overlap = 2;

    for (let i = 0; i < keys.length; i++) {
      const bg = this.scene.add
        .image(
          GAME.WIDTH / 2,
          Math.round(startY - i * (displayHeight - overlap)), // Sale verso l'alto con overlap
          keys[i],
        )
        .setOrigin(0.5, 0.5)
        .setDisplaySize(displayWidth, displayHeight)
        .setDepth(-10) // Sotto tutto il resto del mondo di gioco
        .setScrollFactor(1, 1); // Segue normalmente la camera

      this.backgrounds.push(bg);
    }
  }

  /**
   * Aggiorna la posizione del background per creare il loop infinito
   * e applica la tinta progressiva per il ciclo giorno→tramonto→notte.
   *
   * Il giocatore sale verso l'alto (Y negativa), quindi le nuove immagini
   * devono apparire sopra (Y più piccola/negativa).
   *
   * @param cameraScrollY - posizione Y corrente della camera (bordo superiore)
   * @param cameraHeight - altezza del viewport della camera
   * @param clockMinutes - minuti trascorsi dall'inizio partita (per il tint)
   */
  public update(
    cameraScrollY: number,
    cameraHeight: number,
    clockMinutes: number,
  ): void {
    // Overlap di 2 pixel per evitare gap visibili
    const overlap = 2;

    // Trova l'immagine più in alto (Y più piccola/negativa)
    let highestY = Infinity;

    for (const bg of this.backgrounds) {
      if (bg.y < highestY) {
        highestY = bg.y;
      }
    }

    // Per ogni background, controlla se è uscito dalla parte inferiore dello schermo
    for (const bg of this.backgrounds) {
      // Se l'immagine è completamente sotto il bordo inferiore della camera
      const cameraBottom = cameraScrollY + cameraHeight;
      if (bg.y - this.imageHeight / 2 > cameraBottom) {
        // Riposizionala sopra l'immagine più in alto con overlap
        bg.y = Math.round(highestY - (this.imageHeight - overlap));
        // Aggiorna highestY per la prossima iterazione
        if (bg.y < highestY) {
          highestY = bg.y;
        }
      }
    }

    // --- Tint progressivo per ciclo giorno/tramonto/notte ---
    this.updateDayNightTint(clockMinutes);
  }

  /**
   * Applica una tinta di colore progressiva ai background per simulare
   * il passaggio del tempo: giorno → tramonto → notte.
   *
   * Usa setTint() di Phaser che moltiplica i colori dei pixel dell'immagine.
   * 0xFFFFFF = nessun filtro (colore originale = giorno)
   * 0xFFAA55 = arancione caldo (tramonto)
   * 0x1a1a4e = blu scuro (notte profonda)
   *
   * La transizione è lineare e continua, non a scatto:
   * - 0-180 min (16:00→19:00): giorno pieno, nessun tint
   * - 180-420 min (19:00→23:00): transizione giorno→tramonto→notte
   * - 420+ min (23:00+): notte piena
   *
   * La transizione tramonto→notte usa due fasi:
   * 1. 180-300 min: giorno → tramonto (arancione intenso)
   * 2. 300-420 min: tramonto → notte (blu scuro)
   */
  private updateDayNightTint(clockMinutes: number): void {
    // ⚠️ DEBUG: impostare a true per comprimere la transizione in ~2 min
    // Dopo il test, rimettere a false per i tempi normali della giornata.
    const DEBUG_FAST = true;

    // Colori di riferimento per ogni fase
    const DAY_TINT = 0xffffff; // Nessun filtro (colore originale)
    const SUNSET_TINT = 0xdd3300; // Arancione rossastro intenso
    const NIGHT_TINT = 0x1a1a4e; // Blu scuro profondo

    // Soglie temporali (minuti trascorsi dall'inizio)
    // Normali: 180 (19:00), 300 (21:00), 420 (23:00)
    // Debug: 20s, 60s, 120s — transizione completa in ~2 min
    const SUNSET_START = DEBUG_FAST ? 15 : 180;
    const SUNSET_PEAK = DEBUG_FAST ? 30 : 300;
    const NIGHT_FULL = DEBUG_FAST ? 45 : 420;

    let tint: number;

    if (clockMinutes <= SUNSET_START) {
      // --- Giorno pieno: nessun filtro ---
      tint = DAY_TINT;
    } else if (clockMinutes <= SUNSET_PEAK) {
      // --- Fase 1: Giorno → Tramonto (bianco → arancione) ---
      const t = (clockMinutes - SUNSET_START) / (SUNSET_PEAK - SUNSET_START);
      tint = this.lerpColor(DAY_TINT, SUNSET_TINT, t);
    } else if (clockMinutes <= NIGHT_FULL) {
      // --- Fase 2: Tramonto → Notte (arancione → blu scuro) ---
      const t = (clockMinutes - SUNSET_PEAK) / (NIGHT_FULL - SUNSET_PEAK);
      tint = this.lerpColor(SUNSET_TINT, NIGHT_TINT, t);
    } else {
      // --- Notte piena ---
      tint = NIGHT_TINT;
    }

    // Applica a tutte le immagini di background
    for (const bg of this.backgrounds) {
      bg.setTint(tint);
    }
  }

  /**
   * Interpola linearmente tra due colori esadecimali (0xRRGGBB).
   * Separa i canali R, G, B, li interpola individualmente e li ricompone.
   *
   * @param colorA - colore di partenza (hex)
   * @param colorB - colore di arrivo (hex)
   * @param t - fattore di interpolazione (0 = colorA, 1 = colorB)
   * @returns colore interpolato (hex)
   */
  private lerpColor(colorA: number, colorB: number, t: number): number {
    const clamp = Math.max(0, Math.min(1, t));
    const rA = (colorA >> 16) & 0xff;
    const gA = (colorA >> 8) & 0xff;
    const bA = colorA & 0xff;
    const rB = (colorB >> 16) & 0xff;
    const gB = (colorB >> 8) & 0xff;
    const bB = colorB & 0xff;
    const r = Math.round(rA + (rB - rA) * clamp);
    const g = Math.round(gA + (gB - gA) * clamp);
    const b = Math.round(bA + (bB - bA) * clamp);
    return (r << 16) | (g << 8) | b;
  }
}
