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
   * IMPORTANTE: Poiché il giocatore sale verso l'alto (Y negativa),
   * partiamo con day_1 alla posizione iniziale del giocatore,
   * day_2 sopra, e day_3 ancora più sopra.
   */
  public create(): void {
    // Ottieni le dimensioni della prima immagine per calcolare l'altezza
    const texture = this.scene.textures.get("day_1");
    const frame = texture.get();

    // Calcola l'altezza scalata per matchare la larghezza del gioco
    const aspectRatio = frame.width / frame.height;
    // Arrotonda sempre ai pixel interi per evitare sub-pixel rendering
    const scaledHeight = Math.round(GAME.WIDTH / aspectRatio);
    this.imageHeight = scaledHeight;

    // Crea le 3 immagini in sequenza: day_1, day_2, day_3
    // Partendo dalla posizione iniziale del giocatore e salendo verso l'alto
    const keys = ["day_1", "day_2", "day_3"];
    const startY = Math.round(GAME.HEIGHT - scaledHeight / 2); // Parte dal basso
    
    // Overlap di 2 pixel per evitare gap visibili tra le immagini
    const overlap = 2;

    for (let i = 0; i < keys.length; i++) {
      const bg = this.scene.add
        .image(
          GAME.WIDTH / 2,
          Math.round(startY - i * (scaledHeight - overlap)), // Sale verso l'alto con overlap
          keys[i],
        )
        .setOrigin(0.5, 0.5)
        .setDisplaySize(GAME.WIDTH, scaledHeight)
        .setDepth(-10) // Sotto tutto il resto del mondo di gioco
        .setScrollFactor(1, 1); // Segue normalmente la camera

      this.backgrounds.push(bg);
    }
  }

  /**
   * Aggiorna la posizione del background per creare il loop infinito.
   * Quando un'immagine esce dalla parte inferiore dello schermo (già superata),
   * viene riposizionata sopra l'immagine più in alto.
   *
   * Il giocatore sale verso l'alto (Y negativa), quindi le nuove immagini
   * devono apparire sopra (Y più piccola/negativa).
   */
  public update(cameraScrollY: number, cameraHeight: number): void {
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
  }

  /**
   * Cambia il set di immagini per il background notturno.
   * (Da implementare quando avrai le texture notturne)
   */
  public switchToNight(): void {
    // TODO: implementare quando ci saranno le texture night_1, night_2, night_3
    console.log("Night background not implemented yet");
  }
}
