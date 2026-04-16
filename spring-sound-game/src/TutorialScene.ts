import * as Phaser from "phaser";
import { GAME } from "./GameConfig";

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: "TutorialScene" });
  }

  create(): void {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 1);

    this.add.text(cx, cy, "TUTORIAL SCENE\n(Coming Soon)\nClick to Play", {
      fontFamily: "ChillPixels",
      fontSize: "24px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameScene");
      });
    });
  }
}
