import * as Phaser from "phaser";
import { GAME } from "./GameConfig";

interface TutorialCard {
  img: number;
  title: string;
  footer: string;
}

const CARDS_DATA: TutorialCard[] = [
  { img: 1, title: "TOCCA I LATI\nPER MUOVERTI", footer: "" },
  { img: 2, title: "PUOI MUOVERE\nANCHE IL TELEFONO", footer: "" },
  { img: 3, title: "RACCOGLI E\nBEVI DRINK", footer: "" },
  { img: 4, title: "SCHIACCIA\nI BUTTAFUORI", footer: "" },
  { img: 5, title: "UTILIZZA I\nSUBWOOFER\nPER MEGA SALTI", footer: "" },
  { img: 6, title: "ATTENZIONE!\nPIU BEVI. PIU AUMENTA\nIL TUO LIVELLO PARTY", footer: "" },
  { img: 7, title: "ARRIVA\nFINO AL TERMINE\nDEL FESTIVAL.", footer: "\nORA GODITI LO\nSPRING SOUND." }
];

export class TutorialScene extends Phaser.Scene {
  private currentCardIndex: number = 0;
  private cardImage!: Phaser.GameObjects.Image;
  private cardTitleText!: Phaser.GameObjects.Text;
  private cardFooterText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "TutorialScene" });
  }

  preload(): void {
    this.load.image("firstBg", "/assets/background/first_bg.png");
    
    this.load.svg("startLogo", "/assets/ui/gamestart-over-pause/logo pixel.svg", { width: 120, height: 120 });
    this.load.svg("whiteMegaBlock", "/assets/ui/carousel-tutorial/white_mega_block.svg", { width: 300, height: 380 });
    this.load.svg("tutLeft", "/assets/ui/gamestart-over-pause/left.svg", { width: 40, height: 40 });
    this.load.svg("tutRight", "/assets/ui/gamestart-over-pause/right.svg", { width: 40, height: 40 });

    for (let i = 1; i <= CARDS_DATA.length; i++) {
      this.load.image(`tutorial_${i}`, `/assets/ui/carousel-tutorial/${i}.png`);
    }
  }

  create(): void {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const { SCALE } = GAME;
    const r = (v: number) => Math.round(v * SCALE);

    // Sfondo e Overlay
    const bg = this.add.image(cx, GAME.HEIGHT, "firstBg").setOrigin(0.5, 1);
    const bgScale = Math.max(GAME.WIDTH / bg.width, GAME.HEIGHT / bg.height);
    bg.setScale(bgScale).setDepth(0);
    this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.7).setDepth(1);

    const container = this.add.container(0, 0).setDepth(2);

    // Logo + Titolo (Più compatti)
    const logoY = GAME.HEIGHT * 0.12;
    const circle = this.add.circle(cx, logoY, r(40), 0xf8f0cd).setStrokeStyle(r(3), 0x000000);
    const logo = this.add.image(cx, logoY, "startLogo").setDisplaySize(r(60), r(60));
    const titleText = this.add.text(cx, logoY + r(60), "COME GIOCARE", {
      fontFamily: "ChillPixels", fontSize: `${r(20)}px`, color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);
    container.add([circle, logo, titleText]);

    // Blocco Card (Ridimensionato per starci in desktop/mobile comodamente)
    const cardY = logoY + r(250);
    const mBlockW = r(280);
    const mBlockH = r(340);
    const cardBlock = this.add.image(cx, cardY, "whiteMegaBlock").setDisplaySize(mBlockW, mBlockH);
    container.add(cardBlock);

    // Testo Titolo interno alla card (Alto)
    this.cardTitleText = this.add.text(cx, cardY - r(120), "", {
      fontFamily: "ChillPixels", fontSize: `${r(16)}px`, color: "#000000", align: "center", fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Immagine centrale della card
    this.cardImage = this.add.image(cx, cardY + r(10), `tutorial_1`);
    // Scale reduced slightly more
    this.cardImage.setScale(SCALE * 0.32); 

    // Testo Footer interno alla card (Basso prima delle frecce)
    this.cardFooterText = this.add.text(cx, cardY + r(100), "", {
      fontFamily: "ChillPixels", fontSize: `${r(12)}px`, color: "#000000", align: "center", fontStyle: "bold"
    }).setOrigin(0.5);

    container.add([this.cardTitleText, this.cardImage, this.cardFooterText]);

    this.populateCardData();

    // Arrows (Nel footer in fondo al blocco bianco)
    const footerY = cardY + r(140); 
    const arrowOffsetX = r(110);
    
    const leftArrow = this.add.image(cx - arrowOffsetX, footerY, "tutLeft").setDisplaySize(r(18), r(24)).setInteractive({ useHandCursor: true });
    leftArrow.on("pointerdown", () => this.prevCard());
    
    const rightArrow = this.add.image(cx + arrowOffsetX, footerY, "tutRight").setDisplaySize(r(18), r(24)).setInteractive({ useHandCursor: true });
    rightArrow.on("pointerdown", () => this.nextCard());
    
    const avantiText = this.add.text(cx + arrowOffsetX - r(45), footerY, "AVANTI", {
      fontFamily: "ChillPixels", fontSize: `${r(14)}px`, color: "#000000", fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    avantiText.on("pointerdown", () => this.nextCard());

    container.add([leftArrow, rightArrow, avantiText]);

    // Skip Tutorial (Spinto un po' in su così da starci sempre)
    const skipY = cardY + r(200);
    const skipText = this.add.text(cx, skipY, "SALTA GUIDA E GIOCA", {
      fontFamily: "ChillPixels", fontSize: `${r(14)}px`, color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipText.on("pointerdown", () => this.startGame());
    container.add(skipText);

    // Animazione entrata
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 600, ease: "Power2" });
  }

  private populateCardData() {
    const data = CARDS_DATA[this.currentCardIndex];
    this.cardTitleText.setText(data.title);
    this.cardFooterText.setText(data.footer);
    this.cardImage.setTexture(`tutorial_${data.img}`);
  }

  private nextCard() {
    if (this.currentCardIndex < CARDS_DATA.length - 1) {
      this.currentCardIndex++;
      this.animateCardChange();
    } else {
      this.startGame(); // Se sei all'ultima card ed è ancora "AVANTI" (o GIOCA)
    }
  }

  private prevCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.animateCardChange();
    }
  }

  private animateCardChange() {
    this.tweens.add({
      targets: [this.cardImage, this.cardTitleText, this.cardFooterText],
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.populateCardData();
        this.tweens.add({
          targets: [this.cardImage, this.cardTitleText, this.cardFooterText],
          alpha: 1,
          duration: 150
        });
      }
    });
  }

  private startGame() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
    });
  }
}
