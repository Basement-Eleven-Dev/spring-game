# 🎶 Spring Sound Game

Un **vertical climbing game** a tema festa/discoteca, costruito con **Phaser 3** + **TypeScript** + **Vite**.

Il giocatore salta tra piattaforme salendo sempre più in alto, raccoglie drink che alzano il "party level", e affronta ostacoli come bouncer e fango. Quando il party level raggiunge il massimo, si entra nello stato "wasted" e appare il DJ Stage — un checkpoint che porta al livello successivo.

> **Target primario**: browser mobile (smartphone). Il gioco è progettato per essere avviato rapidamente da un link, senza installazione.

---

## 🛠️ Tech Stack

| Tecnologia                     | Versione | Ruolo                                  |
| ------------------------------ | -------- | -------------------------------------- |
| [Phaser 3](https://phaser.io/) | ^3.90.0  | Game engine (rendering, fisica, input) |
| TypeScript                     | ~6.0.2   | Type safety                            |
| Vite                           | ^8.0.4   | Dev server + bundler                   |
| @vitejs/plugin-basic-ssl       | —        | Certificato HTTPS self-signed in LAN   |

---

## 🚀 Quick Start

```bash
# Installa le dipendenze
cd spring-sound-game
npm install

# Avvia il dev server (solo PC)
npm run dev
# → https://localhost:5173/

# Avvia con accesso da smartphone in LAN
npm run dev -- --host
# → https://<IP-del-Mac>:5173/
# Al primo accesso da iPhone: Safari → "Mostra dettagli" → "Apri il sito web"
# (certificato self-signed, avviso monouso per sessione)

# Build per produzione
npm run build
```

---

## 🔬 Sistema di Risoluzione Nativa (DPR-Aware)

Il gioco utilizza un **sistema di risoluzione nativa DPR-aware** che garantisce la massima nitidezza su ogni dispositivo, operando alla risoluzione fisica esatta dello schermo.

### Problema Risolto

`autoDensity: true` di Phaser 3.90 **non funziona**: il canvas buffer resta a 1× risoluzione indipendentemente dalla configurazione. Su iPhone (DPR=3), un canvas di 375×640 viene upscalato dal browser a 1125×1920 pixel fisici → **sfocatura totale** su testo, sprite e SVG.

### Soluzione: DPR nelle Dimensioni di Gioco

Incorporiamo il `devicePixelRatio` direttamente in `GAME_WIDTH`/`GAME_HEIGHT` in `GameConfig.ts`:

```typescript
const DPR = window.devicePixelRatio || 1;
const CSS_WIDTH = Math.min(window.innerWidth, 800); // Cap a 800 CSS px
const GAME_WIDTH = Math.round(CSS_WIDTH * DPR); // Risoluzione fisica
const S = GAME_WIDTH / REFERENCE_WIDTH; // Fattore di scala (include DPR)
const r = (v: number) => Math.round(v * S); // Helper di scaling
```

Il canvas opera a **risoluzione fisica nativa**. `Scale.FIT` riduce il CSS display alla dimensione viewport, dove 1 CSS pixel = DPR pixel fisici → mapping **1:1** con il buffer.

| Dispositivo   | CSS      | DPR | Buffer Canvas | Fisici    | Rapporto   |
| ------------- | -------- | --- | ------------- | --------- | ---------- |
| iPhone 11 Pro | 375×670  | 3   | **1125×2010** | 1125×2010 | **1:1** ✅ |
| Desktop       | 800×1200 | 1   | **800×1200**  | 800×1200  | **1:1** ✅ |
| Retina Mac    | 800×1200 | 2   | **1600×2400** | 1600×2400 | **1:1** ✅ |

### Dettagli Tecnici

**1. Scaling Automatico via `r()`**

Siccome `S = GAME_WIDTH / 350` include il DPR, ogni valore scalato con `r()` produce automaticamente la dimensione fisica corretta:

```typescript
// iPhone 375px DPR=3: S = 1125/350 ≈ 3.21
PLAYER.SIZE: r(40)  → 129 px in un canvas 1125px → 11.5% dello schermo

// Desktop 800px DPR=1: S = 800/350 ≈ 2.29
PLAYER.SIZE: r(40)  → 91 px in un canvas 800px → 11.4% dello schermo
// → Proporzioni identiche ✅
```

**2. PNG con Rapporti Ottimizzati**

| Asset              | Sorgente | Display iPhone (r×) | Rapporto |
| ------------------ | -------- | ------------------- | -------- |
| drink/beer         | 512×512  | ~97×97              | 5.3:1    |
| piattaforme        | 800×400  | ~289×109            | 2.8:1    |
| player spritesheet | 256×256  | ~129×129            | 2.0:1    |

**3. Mipmapping + RoundPixels** (`main.ts`)

```typescript
render: {
  mipmapFilter: "LINEAR_MIPMAP_NEAREST", // Pre-riduce texture via mipmap chain
  roundPixels: true, // Elimina sub-pixel positioning blur
}
```

### Risultato

✅ **Nitidezza perfetta** su smartphone, tablet, desktop (verificato iPhone 11 Pro + PC)  
✅ **Zero upscaling** — il buffer coincide con i pixel fisici  
✅ **autoDensity bypassato** — DPR gestito direttamente in GameConfig  
✅ **Performance ottimale** — nessun overhead, il canvas è alla risoluzione nativa  
✅ **Gameplay identico** — le proporzioni restano invariate grazie al fattore `S`

---

## �🏗️ Architettura

Il progetto segue un'architettura **Manager Pattern**: la scena principale (`GameScene`) è un orchestratore snello che delega la logica a manager specializzati.

```
src/
├── main.ts                ← Entry point (avvio diretto, nessun overlay)
├── GameConfig.ts          ← Costanti centralizzate (bilanciamento)
├── GameScene.ts           ← Scena principale (orchestratore)
├── GameOverScene.ts       ← Schermata di Game Over
│
├── Player.ts              ← Giocatore (input: tastiera/touch/device orientation)
├── Platform.ts            ← Piattaforme (4 tipi)
├── Drink.ts               ← Drink collezionabili
├── Bouncer.ts             ← Buttafuori nemici
│
├── managers/
│   ├── BackgroundManager.ts  ← Background scrollabile infinito
│   ├── CameraManager.ts      ← Sistema 3 camere + effetti visivi (rotazione, ghosting)
│   ├── UIManager.ts          ← Interfaccia SVG + camera UI dedicata
│   ├── PauseMenuManager.ts   ← Menu di pausa con opzioni + permesso accelerometro iOS
│   ├── ScoreManager.ts       ← Calcolo punteggio (logica)
│   ├── PartyManager.ts       ← Party level + stato wasted (logica)
│   ├── LevelManager.ts       ← Progressione livelli + gravità
│   └── SpawnManager.ts       ← Spawning/riciclo/pulizia entità

public/assets/
├── background/
│   └── day_one/
│       ├── day_1.png         ← Background loop parte 1
│       ├── day_2.png         ← Background loop parte 2
│       └── day_3.png         ← Background loop parte 3
├── fonts/
│   └── ChillPixels-Mono.otf  ← Font personalizzato per UI
├── ui/
│   ├── day.svg               ← Icona orario 14:00-19:00
│   ├── sunset.svg            ← Icona orario 19:00-23:00
│   ├── night.svg             ← Icona orario 23:00-02:00
│   ├── points_bar.svg        ← Barra punteggio
│   ├── play.svg              ← Bottone play
│   ├── pause.svg             ← Bottone pausa
│   ├── party_bar_empty.svg   ← Party bar 0%
│   ├── party_bar_green.svg   ← Party bar 1-29%
│   ├── party_bar_yellow.svg  ← Party bar 30-59%
│   ├── party_bar_orange.svg  ← Party bar 60-99%
│   └── party_bar_red.svg     ← Party bar 100% (wasted)
├── drinks/
│   ├── drink.png             ← Drink generico (512×512)
│   └── beer.png              ← Birra (512×512)
├── players/
│   ├── player_sheet_dx_jump.png  ← Spritesheet salto destro (4 frame)
│   ├── player_sheet_sx_jump.png  ← Spritesheet salto sinistro (4 frame)
│   └── buttafuori.png            ← Spritesheet bouncer (3 frame)
└── platforms/
    ├── platform erba.png             ← Variante erba (800×400)
    ├── platform_ubriaco.png          ← Variante ubriaco (800×400)
    ├── platform_cassa.png            ← Variante cassa (800×400)
    ├── platform_cassa_erba.png       ← Variante cassa+erba (800×400)
    ├── platform_cassa_rotta_sheet.png ← Fragile spritesheet (400×100, 2 frame)
    ├── subwoofer_sheet.png           ← Subwoofer spritesheet (800×100, 4 frame)
    └── fango.png                     ← Pozza di fango (sprite PNG, copre metà piattaforma wide)
```

### Diagramma delle dipendenze

```
main.ts
  ├── Avvio diretto Phaser (nessun overlay)
  └── GameScene (orchestratore)
        ├── BackgroundManager ← background scrollabile infinito (depth -10)
        ├── CameraManager ← scrolling + rotazione + vista doppia (3 camere)
        ├── ScoreManager ← calcolo punteggio
        ├── UIManager ← interfaccia SVG + rendering dedicato
        ├── PauseMenuManager ← menu pausa con opzioni
        ├── PartyManager ← party level + wasted
        ├── LevelManager ← livello + gravità + visual
        ├── SpawnManager ← possiede tutti i gruppi Phaser:
        │     ├── platforms (Platform)
        │     ├── drinks (Drink)
        │     ├── muds (generico)
        │     └── bouncers (Bouncer)
        └── Player ← input (tastiera/touch/device orientation)
  └── GameOverScene ← statistiche finali + pulsante "Riprova"
```

---

## 🎨 Sistema UI con SVG

Il gioco utilizza un **sistema UI completamente basato su SVG** per garantire massima nitidezza e scalabilità su tutti i dispositivi.

### Struttura UI

```
public/assets/ui/
├── day.svg           ← Icona orario 14:00-19:00
├── sunset.svg        ← Icona orario 19:00-23:00
├── night.svg         ← Icona orario 23:00-02:00
├── points_bar.svg    ← Sfondo barra punteggio
├── play.svg          ← Bottone play/pausa
├── pause.svg         ← Bottone pausa
├── party_bar_empty.svg  ← Party bar vuota (0%)
├── party_bar_green.svg  ← Party bar verde (1-29%)
├── party_bar_yellow.svg ← Party bar gialla (30-59%)
├── party_bar_orange.svg ← Party bar arancione (60-99%)
└── party_bar_red.svg    ← Party bar rossa (100% - wasted)
```

### Elementi UI

**Top Bar** (3 elementi evenly spaced):

- **Sinistra**: Icona orario + tempo HH:MM (font ChillPixels)
- **Centro**: Points bar + punteggio (font ChillPixels)
- **Destra**: Bottone play/pause (interattivo)

**Party Bar**: Sotto l'icona orario, allineata a sinistra, si aggiorna automaticamente in base al party level con 5 stati visivi.

**Menu di Pausa**: Premendo il bottone pause, appare un overlay con:

- Livello corrente
- Bottone RIPRENDI (verde)
- Toggle ACCELEROMETRO (on/off, **solo su smartphone**) — gestisce anche il permesso iOS
- Toggle AUDIO (on/off, controlla audio di gioco)

Durante la pausa, fisica/animazioni/tween/orologio sono sospesi completamente.

**Permesso Accelerometro iOS**: Il toggle ACCELEROMETRO nel menu di pausa sostituisce l'overlay iniziale. L'accelerometro parte **OFF** di default. Quando l'utente lo attiva su iOS, viene richiesto il permesso `DeviceOrientationEvent.requestPermission()` direttamente dal handler del tap (user gesture trusted, come richiesto da Safari). Su Android si attiva senza popup. Su desktop il toggle non è visibile.

### Come Modificare gli SVG

1. **Dimensioni di riferimento** in `GameConfig.ts`:

   ```typescript
   export const UI = {
     TIME_ICON_WIDTH: 80,
     TIME_ICON_HEIGHT: 50,
     POINTS_BAR_WIDTH: 180,
     POINTS_BAR_HEIGHT: 30,
     CONTROL_BUTTON_SIZE: 30,
     PARTY_BAR_WIDTH: 175,
     PARTY_BAR_HEIGHT: 30,
     // ...
   };
   ```

2. **Caricamento automatico scalato** in `UIManager.preloadAssets()`:

   ```typescript
   scene.load.svg("dayIcon", "/assets/ui/day.svg", {
     width: r(UI.TIME_ICON_WIDTH), // Scalato in base al device
     height: r(UI.TIME_ICON_HEIGHT),
   });
   ```

3. **Switch automatici**:
   - Orario: day → sunset → night (in base ai minuti trascorsi)
   - Party bar: empty → green → yellow → orange → red (in base al party level 0-100)

### Font Personalizzato: ChillPixels

Il gioco usa **ChillPixels-Mono.otf** per tutti i testi di gioco (orario, punteggio, livelli, menu di pausa, game over).

**Installazione**:

```
public/assets/fonts/ChillPixels-Mono.otf
```

**Caricamento CSS** (`style.css`):

```css
@font-face {
  font-family: "ChillPixels";
  src: url("/assets/fonts/ChillPixels-Mono.otf") format("opentype");
  font-display: swap;
}
```

**Uso nei text di Phaser**:

```typescript
this.scene.add.text(x, y, "14:00", {
  fontFamily: "ChillPixels",
  fontSize: `${r(13)}px`,
  color: "#000000",
});
```

---

## 🌅 Background Scrollabile + Ciclo Giorno/Notte

### Architettura Background

3 immagini PNG (`day_1`, `day_2`, `day_3`) disposte in sequenza verticale creano un loop infinito verso l'alto. Gestite da `BackgroundManager`:

- **Tiling infinito**: quando un'immagine esce dal fondo dello schermo, viene riposizionata sopra l'immagine più alta
- **Overlap 2px**: previene gap visibili alle giunture tra immagini
- **Depth -10**: sotto tutto il mondo di gioco

### Copertura Rotazione (ROTATION_COVER)

Quando la camera ruota (effetto ubriachezza), gli angoli del viewport escono dai bordi del background, mostrando il nero sottostante. Le immagini sono renderizzate **30% più larghe e alte** del viewport per coprire questi angoli:

```typescript
const ROTATION_COVER = 1.3; // 30% extra
bg.setDisplaySize(GAME.WIDTH * ROTATION_COVER, displayHeight);
```

Formula: `cos(θ) + sin(θ) × (H/W) ≈ 1.25` per rotazione max di 0.15 rad. Il 30% dà margine di sicurezza. A rotazione 0, i bordi extra sono fuori dal viewport → nessun impatto visivo.

### Tint Progressivo (Ciclo Giorno/Notte)

Invece di caricare set separati di immagini (sunset_1/2/3, night_1/2/3), il sistema usa `setTint()` di Phaser per colorare progressivamente i background:

| Fase            | Orario Narrativo | Min     | Tint                  | Effetto                      |
| --------------- | ---------------- | ------- | --------------------- | ---------------------------- |
| Giorno          | 14:00→19:00      | 0-300   | `0xFFFFFF`            | Colori originali             |
| Giorno→Tramonto | 19:00→21:00      | 300-420 | `0xFFFFFF`→`0xDD3300` | Graduale arancione rossastro |
| Tramonto→Notte  | 21:00→23:00      | 420-540 | `0xDD3300`→`0x1A1A4E` | Arancione→blu scuro          |
| Notte piena     | 23:00+           | 540+    | `0x1A1A4E`            | Blu scuro fisso              |

**Interpolazione colore**: i canali R, G, B vengono interpolati linearmente in `lerpColor()`. La transizione è continua (ogni frame) e non a scatto.

**Come calibrare**:

1. **Colori**: modificare `DAY_TINT`, `SUNSET_TINT`, `NIGHT_TINT` in `BackgroundManager.updateDayNightTint()`
2. **Tempistiche**: modificare `SUNSET_START`, `SUNSET_PEAK`, `NIGHT_FULL` (minuti dall'inizio)
3. **Debug accelerato**: impostare `DEBUG_FAST = true` per comprimere la transizione in ~2 min

**Vantaggi rispetto ad asset separati**:

- ✅ Zero asset extra (stesse 3 immagini day)
- ✅ Transizione continua e animata (non a scatto al level up)
- ✅ Facile da calibrare (solo hex + soglie)
- ✅ ROTATION_COVER funziona automaticamente
- ✅ In futuro: se servono background radicalmente diversi, si possono aggiungere set aggiuntivi nello stesso sistema

---

## 🐛 Phaser 3.90: Bug autoDensity e Workaround DPR

### Il problema

`autoDensity: true` nella configurazione Scale di Phaser 3.90 **non funziona**. Il canvas buffer resta a 1× risoluzione indipendentemente dalla configurazione:

```
// DEBUG su iPhone 11 Pro (DPR=3):
Buffer: 375×640       ← SBAGLIATO (dovrebbe essere 1125×1920)
CSS:    375px×640px
DPR:    3
Game:   375×640
Expected: 1125×1920   ← 3× più grande
```

Il browser CSS-scala il canvas 375px a 1125 pixel fisici → upscale 3× → **sfocatura totale** su testo, sprite e SVG.

### La soluzione

Incorporare il DPR direttamente nelle dimensioni del gioco in `GameConfig.ts`:

```typescript
const DPR = window.devicePixelRatio || 1;
const CSS_WIDTH = Math.min(window.innerWidth, 800);
const GAME_WIDTH = Math.round(CSS_WIDTH * DPR); // ← risoluzione fisica
```

Il canvas opera a risoluzione fisica nativa. `Scale.FIT` riduce il CSS display, dove `CSS × DPR = buffer` → mapping 1:1.

### Come verificare

Se in futuro si sospetta un problema di risoluzione, aggiungere temporaneamente in `GameScene.create()`:

```typescript
const c = this.game.canvas;
const dbg = document.createElement("pre");
dbg.textContent = `Buffer: ${c.width}×${c.height}\nCSS: ${c.style.width}×${c.style.height}\nDPR: ${window.devicePixelRatio}`;
dbg.style.cssText =
  "position:fixed;top:8px;left:8px;z-index:99999;background:rgba(0,0,0,.85);color:#0f0;font:12px monospace;padding:8px;border-radius:6px;pointer-events:none";
document.body.appendChild(dbg);
setTimeout(() => dbg.remove(), 8000);
```

Il Buffer deve essere uguale a `Game × DPR`. Se non lo è, il canvas è a risoluzione sbagliata.

---

## 📹 Sistema a 3 Camere

Per garantire che la **UI rimanga sempre stabile e nitida** anche durante gli effetti wasted (rotazione, ghosting), il gioco utilizza un'architettura a **3 camere separate**.

### Architettura Camere

```
┌─────────────────────────────────────────────────┐
│ UI CAMERA (depth 100+)                          │
│ - Background: trasparente                       │
│ - Renderizza: SOLO elementi UI                  │
│ - Effetti: NESSUNO (sempre fissa e nitida)      │
│                                                  │
├─────────────────────────────────────────────────┤
│ GHOST CAMERA (depth 0-99, effetto wasted)      │
│ - Background: trasparente                       │
│ - Renderizza: mondo di gioco ghostato           │
│ - Effetti: rotazione + offset + alpha oscillante│
│ - Attiva solo durante wasted                    │
│                                                  │
├─────────────────────────────────────────────────┤
│ MAIN CAMERA (depth 0-99)                        │
│ - Background: colorato (azzurro → blu notte)    │
│ - Renderizza: mondo di gioco principale         │
│ - Effetti: rotazione progressiva                │
└─────────────────────────────────────────────────┘
```

### Gestione Depth

| Range Depth | Contenuto      | Main Camera  | Ghost Camera | UI Camera |
| ----------- | -------------- | ------------ | ------------ | --------- |
| < 0         | _Non usato_    | ❌           | ❌           | ❌        |
| 0-99        | Mondo di gioco | ✅ + effetti | ✅ ghosting  | ❌        |
| 100+        | Elementi UI    | ❌           | ❌           | ✅ fissi  |

### Effetto Wasted (Vista Doppia)

Quando il party level raggiunge 100:

1. **Ghost Camera** viene creata dinamicamente
2. Renderizza il mondo con:
   - Offset orizzontale (+14px scalati)
   - Alpha oscillante (0 ↔ 0.3, periodo ~4.4s)
   - Stessa rotazione della main camera
3. Risultato: **sdoppiatura leggera** del mondo sopra lo sfondo fisso
4. **UI non viene mai ghostata** (ignorata dalla ghost camera)

### Configurazione in `UIManager`

```typescript
// Camera UI dedicata
this.uiCamera = scene.cameras.add(0, 0, GAME.WIDTH, GAME.HEIGHT);
this.uiCamera.setBackgroundColor("rgba(0,0,0,0)"); // Trasparente

// Main camera ignora la UI
this.scene.cameras.main.ignore(uiElements);

// UI camera ignora il mondo
this.uiCamera.ignore(worldObjects);
```

### Vantaggi

✅ **UI perfettamente stabile** durante tutti gli effetti  
✅ **NO barcollamento** della party bar o dei punteggi  
✅ **NO ghosting** degli elementi UI  
✅ **Sfondo fisso** (backgroundColor non ruota mai)  
✅ **Performance ottimale** (rendering separato e mirato)

---

## 📁 Dettaglio File

### `main.ts` — Entry Point

- Configurazione Phaser (dimensioni DPR-aware, fisica, scene, scaling)
- **Risoluzione nativa**: `width: GAME.WIDTH` (= `CSS_WIDTH × DPR`), `Scale.FIT` per adattare il CSS display al viewport
- **Niente autoDensity**: Phaser 3.90 non supporta `autoDensity` correttamente. Il DPR è gestito in `GameConfig.ts`
- **Rendering ottimizzato**:
  - `mipmapFilter: "LINEAR_MIPMAP_NEAREST"` — genera mipmaps per texture grandi, evita aliasing
  - `roundPixels: true` — arrotonda posizioni sprite a pixel interi, elimina blur da sub-pixel
- Importa `GameConfig` per le costanti di dimensione e gravità
- Registra `GameScene` e `GameOverScene`
- **Avvio diretto**: `new Phaser.Game(config)` istanziato immediatamente su tutti i dispositivi. Non c'è più overlay HTML né richiesta di permesso sensore (il permesso accelerometro iOS è gestito dal toggle nel menu di pausa).

### `GameConfig.ts` — Configurazione Centralizzata

**Sistema di Risoluzione Nativa DPR-Aware + Costanti di Bilanciamento**

Questo file centralizza:

**Risoluzione Nativa (DPR-Aware):**

- `REFERENCE_WIDTH` (350) — risoluzione di riferimento su cui sono calibrati tutti i valori
- `DPR` — `window.devicePixelRatio || 1` — rapporto pixel fisici/CSS
- `CSS_WIDTH` — `Math.min(window.innerWidth, 800)` — larghezza CSS cappata
- `GAME_WIDTH` — `Math.round(CSS_WIDTH * DPR)` — larghezza in **pixel fisici**
- `GAME.SCALE` — fattore di scala `S = GAME_WIDTH / 350` (include DPR automaticamente)
- `r(v)` — helper che scala e arrotonda: `Math.round(v * S)`

**Costanti di Bilanciamento** (tutte scalate via `r()`):

- `GAME` — dimensioni canvas dinamiche + `SCALE` factor
- `INITIAL` — posizioni iniziali (base platform, player start) scalate
- `PHYSICS` — gravità base (`r(750)`) e scaling logaritmico per livello
- `TIME` — orologio narrativo: `START_MINUTES` (840 = 14:00), `DURATION_MINUTES` (720), `NIGHT_TRIGGER_MINUTES` (420 = 21:00)
- `SKY` — colori di sfondo giorno (`0x138EFD`) e notte (`0x0a0a2e`)
- `minutesToClockString()` — helper esportato: converte minuti trascorsi in stringa "HH:MM"
- `CAMERA` — lerp scrolling, ghosting offset (`r(14)`), parametri oscillazione
- `PLAYER` — velocità (`r(280)`), forza salto (`r(580)`), dimensioni (`r(40)`), soglie gyro (angolari, non scalate)
- `PLATFORM` — dimensioni per categoria (wide `r(90)×r(34)`, compact `r(70)×r(32)`, subwoofer `r(60)×r(32)`), spacing, probabilità di spawn, frame dimensions per spritesheet
- `PLATFORM_TEXTURE_CATEGORY` — mappa texture → categoria dimensionale
- `PLATFORM_STANDARD_TEXTURES` — lista texture per varianti standard/mobili
- `MUD` — larghezza (`r(45)`, metà piattaforma wide), probabilità progressiva dal livello 3 (5% base + 5%/livello, max 40%), offset specifici per texture (ubriaco: destra, erba: randomizzato)
- `DRINK` — dimensioni (`r(30)×r(30)`), probabilità per livello (20% lvl1 → 9% lvl7+), drink cadenti dal livello 2, intervallo spawn (`r(300)`), velocità caduta (`r(110)`), guadagno party
- `BOUNCER` — dimensioni (`r(42)×r(54)`), probabilità progressiva dal livello 4 (5% base + 5%/livello, max 35%), forze (`r(300)`, `r(650)`), durata pinball, perturbazione Y (`r(120)`)
- `PARTY` — dimensioni barra (`r(140)×r(14)`), soglie colore, moltiplicatori punteggio
- `LEVEL` — offset DJ stage (`r(180)`), spacing, bonus
- `JUMP_MULTIPLIERS` — normale (×1), subwoofer (×1.7), fango (×0.75)

> **Nota**: Tutti i valori spaziali (px, velocità, forze) sono scalati dinamicamente. I rapporti (moltiplicatori, probabilità, angoli gyro) restano invariati.

### `GameScene.ts` — Scena Principale

Orchestratore che:

1. **`preload()`** — carica tutti gli asset da `public/assets/`, inclusi i 4 spritesheet (`playerJumpRight`, `playerJumpLeft`, `bouncerSheet`, `fragileBreak`, `subwooferPump`)
2. **`createAnimations()`** — definisce le animazioni Phaser:
   - `playerJumpUpRight` / `playerJumpUpLeft` — frame 0-2 loop durante la salita
   - `bouncerThrow` — frame 0→1→2 one-shot al contatto col player
   - `fragileBreak` — 2 frame one-shot al contatto con la piattaforma fragile
   - `subwooferPump` — 4 frame loop continuo a 8 fps
3. **`create()`** — inizializza manager, piattaforme, player, collider
4. **`setupColliders()`** — registra le interazioni fisiche:
   - Player ↔ Platform → salto (con modificatori per tipo)
   - Player ↔ Drink → raccolta (incrementa party)
   - Player ↔ Bouncer → sequenza grab-throw e schiacciamento stile Super Mario
5. **`update()`** — delega ai manager nell'ordine:
   - Input giocatore → Camera → Punteggio → Spawn → Riciclo → Cleanup → Game Over

### `GameOverScene.ts` — Schermata Game Over

- Sfondo scuro con particelle animate e titolo animato "GAME OVER" (o "02:00" se timeout)
- Statistiche: orario finale, punteggio (pts), livello raggiunto — layout centrato con animazioni sfalsate
- Pulsante "RIPROVA" con effetto hover + pulsing
- Click/Tap → riavvia `GameScene`
- **Design responsive**: tutte le dimensioni (font, posizioni, particelle, bottone) scalate dinamicamente via `GAME.SCALE`

---

## 🎮 Entità di Gioco

### `Player.ts` — Giocatore

- **3 sistemi di input** (in ordine di priorità):
  1. **Tastiera** (frecce sx/dx) — per PC
  2. **Touch** (tap nella metà sx/dx dello schermo) — per smartphone
  3. **Device orientation** (`deviceorientation` → valore `gamma`) — sovrascrive gli altri se il tilt supera la deadzone
- **Mappatura gamma → velocità**: `clamp((|gamma| - DEADZONE) / (MAX_TILT - DEADZONE), 0, 1) × MOVE_SPEED × sign(gamma)`. Tra 0° e 8° (deadzone) non si muove nulla; a 28° si raggiunge la velocità piena.
- **Effetto inerzia**: il party level rende il movimento più "scivoloso" — il player è lento a cambiare direzione (lerp factor quadratico, percettibile già al 50% del party level)
- **Wrap ai bordi**: effetto Pac-Man (esce da un lato, rientra dall'altro)
- **Stun / Pinball**: quando stordito dal Bouncer, entra in modalità "pinball", rimbalzando violentemente tra i lati (o sul fondo) dello schermo e ruotando su sé stesso senza possibilità di input per l'intervallo `PINBALL_DURATION_MS`.
- **Cleanup**: rimuove il listener `deviceorientation` su `destroy()` per evitare memory leak tra un game over e l'altro

### `Platform.ts` — Piattaforme

| Tipo        | Asset                                             | Dimensione gioco           | Comportamento                                                                     |
| ----------- | ------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `standard`  | 4 varianti PNG (erba, ubriaco, cassa, cassa_erba) | wide 90×34 / compact 70×32 | Ferma. Le varianti wide (erba, ubriaco) possono avere fango sopra (dal livello 3) |
| `moving`    | stesse 4 varianti                                 | wide 90×34 / compact 70×32 | Si muove orizzontalmente, rimbalza ai bordi                                       |
| `fragile`   | `platform_cassa_rotta_sheet.png` (2 frame)        | compact 70×32              | Animazione di rottura al contatto, poi distruzione                                |
| `subwoofer` | `subwoofer_sheet.png` (4 frame)                   | 60×32                      | Loop animazione "cassa che pompa", salto potenziato (×1.7)                        |

### `Bouncer.ts` — Buttafuori

- Posizionato su un **bordo** (sx o dx, casuale) delle piattaforme standard e fragili
- Appare dal **livello 4**, inizialmente rarissimo poi cresce: `5% base + 5%/livello` (max 35%)
- **Nemico difensivo ma eludibile**:
  1.  **Super Mario Stomp**: se il giocatore cade sopra la sua testa, annulla la presa avversaria, schiaccia fisicamente il PNG e lo distrugge, ottenendo punti bonus (+300) ed uno slancio verticale salvifico.
  2.  **Flusso Grab-Throw**: - **Presa**: Se intercettato di lato/fondo ostacola il player congelandolo in aria. - **Animazione Lancio**: Esegue stringa animazione `bouncerThrow` per ~500ms. - **Lancio "Intelligente"**: Scaglia il giocatore impostando la fase di vulnerabilità **pinball**: - Se il giocatore è nella parte alta della telecamera, lo lancia verso il basso. - Se il giocatore è nella parte bassa (a serio rischio morte), lo sbalza verso l'**alto** ad altissima velocità scongiurando loop involontari. - **Scomparsa**: Dopo il lancio, il Buttafuori innesca un fadeout autonomo disabilitando eventuali ulteriori blocchi al player.
      BackgroundManager` — Background Scrollabile Infinito

Gestisce il background dinamico composto da 3 immagini che si ripetono in loop:

**Implementazione**:

- **3 immagini**: `day_1.png`, `day_2.png`, `day_3.png` posizionate in sequenza verticale
- **Depth -10**: renderizzate sotto tutto il mondo di gioco (depth 0-99)
- **Loop infinito**: quando un'immagine esce dalla parte inferiore dello schermo (player sale), viene riposizionata sopra l'immagine più in alto
- **Overlap 2px**: le immagini si sovrappongono leggermente per evitare gap dovuti ad arrotondamenti sub-pixel
- **Dimensioni dinamiche**: scalate per matchare `GAME.WIDTH` mantenendo l'aspect ratio
- **ScrollFactor (1,1)**: seguono normalmente la camera (non sono fixate)

**TODO**:

- ⚠️ Durante la rotazione estrema (effetto wasted), i bordi del background possono essere visibili ai lati. Possibili soluzioni:
  - Scala del 1.2-1.3x (richiede test per non rompere la concatenazione)
  - Riduzione dell'ampiezza massima di rotazione da 0.15 a 0.12 radianti
  - Implementazione di un sistema di tiling più sofisticato

**Transizione notte** (placeholder):

- Il metodo `switchToNight()` è preparato per caricare `night_1.png`, `night_2.png`, `night_3.png`
- Da implementare quando disponibili le texture notturne

### `

---

## ⚙️ Manager

### `CameraManager` — Sistema a 3 Camere + Effetti Visivi

Gestisce il sistema multi-camera e gli effetti wasted:

**Main Camera**:

- **Smooth scroll**: segue il giocatore verso l'alto con lerp 0.1 (non scende mai)
- **Background giorno/notte**: `backgroundColor` varia da azzurro (`0x138EFD`) a blu notte (`0x0a0a2e`) via tween al primo level up dopo le 21:00
- **Rotazione progressiva**: oscilla sinusoidalmente in base al party level (da 30% in su), con ampiezza interpolata via lerp per transizioni fluide
- **Ignora**: solo elementi UI (depth >= 100)

**Ghost Camera** (effetto wasted):

- **Creazione lazy**: appare solo quando `ghostCurrentAlpha > 0.005` (party level = 100)
- **Background trasparente**: renderizza solo il mondo ghostato, non lo sfondo
- **Ghosting parametri**:
  - Offset orizzontale: +14px scalati (`CAMERA.DRUNK_GHOST_OFFSET`)
  - Alpha oscillante: `max(0, sin(time / 4400)) × 0.3` con lerp smooth
  - Rotazione: identica alla main camera
- **Auto-cleanup**: si distrugge quando l'alpha scende sotto la soglia (fine wasted)
- **Ignora**: solo elementi UI (depth >= 100)

**UI Camera** (gestita da UIManager):

- Background trasparente, renderizza solo UI
- Nessun effetto applicato

### `UIManager` — Interfaccia SVG Responsiva

Gestisce tutta l'interfaccia utente con elementi SVG scalabili:

**Top Bar** (3 elementi):

- **Time Icon** (sx): day/sunset/night.svg + testo orario HH:MM
  - Switch automatici: `day` (0-300min) → `sunset` (300-540min) → `night` (540+min)
  - Transizione fade da 600ms tra le fasi
- **Points Bar** (centro): points_bar.svg + punteggio numerico
  - Effetto scale su bonus points
- **Control Button** (dx): play/pause.svg interattivo
  - Click handler per pausa (TODO: implementare logica pausa completa)

**Party Bar** (sotto time icon):
PauseMenuManager` — Menu di Pausa Interattivo

Gestisce il menu di pausa con overlay e opzioni di gioco:

**Elementi UI**:

- **Overlay semi-trasparente**: rettangolo blu scuro (85% opacità) che copre tutto lo schermo
- **Container menu**: centrato sullo schermo, visibilità immediata (no tween per evitare conflitti con `tweens.pauseAll()`)
- **Titolo "PAUSA"**: font ChillPixels, colore oro, stroke nero
- **Livello corrente**: mostra il livello attuale del giocatore
- **Bottone RIPRENDI**: verde, riprende il gioco dalla pausa
- **Toggle ACCELEROMETRO**: abilita/disabilita controllo giroscopio (ON/OFF) — **solo su smartphone** (`navigator.maxTouchPoints > 0`). Su desktop non viene mostrato.
- **Toggle AUDIO**: abilita/disabilita audio di gioco (ON/OFF)

**Permesso Accelerometro iOS**:

- L'accelerometro parte **OFF** di default (`SETTINGS.gyroEnabled = false`)
- Al primo toggle ON su iOS, viene richiesto `DeviceOrientationEvent.requestPermission()`
- La chiamata avviene sincronicamente dal handler del tap (user gesture trusted per Safari)
- Se il permesso viene negato, il toggle resta OFF
- Su Android si attiva direttamente senza popup
- Il permesso iOS viene cachato (`iosPermissionGranted`) per non ripetere la richiesta

**Comportamento**:

- **Depth 200-201**: renderizzato sopra la UI normale (100+)
- **ScrollFactor(0)**: fisso sullo schermo, non scorre con la camera
- **Visibilità diretta**: `setVisible(true/false)` + `setAlpha(1)` immediato (non tramite tween, per evitare conflitti con `tweens.pauseAll()`)
- **Effetti hover**: i bottoni si ingrandiscono leggermente al passaggio del mouse
- **Integrazione GameScene**: quando in pausa, fisica/animazioni/tween sono sospesi

**Sistema di Pausa**:

- Il bottone pause/play nella UI principale ora inverte correttamente (parte con icona pause)
- Premendo pause: `physics.pause()`, `anims.pauseAll()`, `tweens.pauseAll()`, mostra menu
- Premendo riprendi: nasconde menu, `physics.resume()`, `anims.resumeAll()`, `tweens.resumeAll()`
- L'orologio narrativo si blocca durante la pausa

**Configurazione Camere**:

- UIManager filtra per depth (≥100) anziché lista hardcoded per includere automaticamente tutti gli elementi UI
- Il menu viene creato dopo l'inizializzazione delle camere
- `reconfigureCameras()` in UIManager assicura che il menu sia visibile
- Main camera ignora il menu di pausa per evitare effetti di rotazione

### `

- 5 stati SVG: empty → green → yellow → orange → red
- Switch automatici basati su party level:
  - `0`: empty
  - `1-29`: green
  - `30-59`: yellow (THRESHOLD_YELLOW)
  - `60-99`: orange (THRESHOLD_ORANGE)
  - `100`: red (THRESHOLD_RED, wasted)
- Effetto scale al cambio stato

**Camera UI Dedicata**:

- Crea una camera separata con backgroundColor trasparente
- Configura l'esclusività: main camera ignora UI, UI camera ignora mondo
- Metodo `finalizeSetup()` chiamato dopo `create()` per configurare i filtri
- Metodo `ignoreWorldObject()` per oggetti creati dinamicamente (opzionale)

**Rendering**:

- Tutti gli elementi a depth 100+ (sopra il mondo di gioco)
- ScrollFactor(0) per posizione fissa sullo schermo
- Dimensioni scalate dinamicamente via `r(UI.*)` costanti

### `ScoreManager` — Calcolo Punteggio

**Responsabilità ridotte** (visualizzazione delegata a UIManager):

- Calcola il **punteggio** basato su:
  - Distanza verticale percorsa (10px = 1 unità)
  - Livello corrente (moltiplicatore)
  - Party level (moltiplicatori: ×1 normale, ×1.5 giallo, ×2.5 arancio, ×4 wasted)
- Traccia `highestYReached` per lo spawn management
- Bonus diretti (+1500 al level up, +300 allo schiacciamento bouncer)
- **NO rendering**: tutta la parte visuale è stata migrata a UIManager

### `PartyManager` — Logica Party System

**Responsabilità ridotte** (visualizzazione delegata a UIManager):

- **Raccolta drink**: +10 party level per drink raccolto
- **Stato Wasted** (party = 100):
  - Attiva `triggerWasted()` che emette evento `'wasted-ready'` dopo 4s
  - Gli effetti visivi (blur, rotazione, ghosting) sono gestiti da CameraManager
- **Reset**: `resetForNewLevel()` riporta party a 0 e chiama `cameraManager.clearEffects()`
- **NO rendering**: tutta la parte grafica (party bar) è stata migrata a UIManager

### `LevelManager` — Progressione Livelli

- **Gravità logaritmica**: `BASE × (1 + 0.22 × ln(livello))`. Gestisce la complessa scalatura matematica dell'engine limitando l'ingovernabilità del balzo via via all'ascesa limitando pesi estremi
- **Visual "LEVEL X!"**: animazione scalata dinamicamente per ogni risoluzione
- **Curva di difficoltà progressiva**: ogni livello introduce nuovi elementi in modo didattico (vedi sezione Progressione Gameplay sotto)

---

## 🎯 Progressione Gameplay per Livello

Il gioco introduce gradualmente meccaniche e ostacoli per una curva di apprendimento bilanciata:

### **Livello 1: Fondamenta**

_"Impara a saltare e raccogliere drink"_

- **Piattaforme**: Solo wide standard (erba/ubriaco) - 100%
- **Spacing**: Generoso (70-130px invece di 55-115px)
- **Drink**: Abbondanti su piattaforme (20%) - NO drink cadenti
- **Gravità**: Base (750)
- **Obiettivo**: Timing del salto, raccolta drink, party level

### **Livello 2: Varietà**

_"Piattaforme diverse e primi drink dall'alto"_

- **Piattaforme**: Wide 60%, Compact 30%, Moving 10%
- **Spacing**: Intermedio (65-125px)
- **Drink**: 18% su piattaforme + **drink cadenti** (ogni 350px)
- **Gravità**: +15%
- **Obiettivo**: Adattamento a piattaforme mobili e più piccole

### **Livello 3: Subwoofer + Fango**

_"Il trampolino ti aiuta, il fango rallenta"_

- **Piattaforme**: Wide 45%, Compact 25%, Moving 15%, **Subwoofer 15%**
- **Spacing**: Normale (55-115px)
- **Drink**: 14% piattaforme, cadenti ogni 300px
- **Fango**: Primo ostacolo! 5% (rarissimo all'inizio)
- **Gravità**: +25%
- **Obiettivo**: Sfruttare i subwoofer, iniziare a evitare il fango

### **Livello 4: Fragili + Bouncer**

_"Piattaforme che si rompono e primi buttafuori"_

- **Piattaforme**: Wide 40%, Compact 20%, Moving 15%, Subwoofer 10%, **Fragile 15%**
- **Drink**: 12% piattaforme, cadenti ogni 280px
- **Fango**: ~10% (più frequente)
- **Bouncer**: Primi nemici! 5% (rarissimi all'inizio)
- **Gravità**: +35%
- **Obiettivo**: Precisione nel salto, evitare bouncer o schiacciarli

### **Livello 5: Intensificazione**

_"Ostacoli più frequenti"_

- **Piattaforme**: Wide 39%, Compact 20%, Moving 15%, Subwoofer 8%, Fragile 18%
- **Drink**: 11% piattaforme, cadenti ogni 260px
- **Fango**: ~15% (moderato)
- **Bouncer**: ~10% (occasionali)
- **Gravità**: +45%
- **Obiettivo**: Gestione di più ostacoli contemporaneamente

### **Livello 6: Sfida Completa**

_"Tutti gli elementi attivi"_

- **Piattaforme**: Wide 38%, Compact 20%, Moving 15%, Subwoofer 7%, Fragile 20%
- **Drink**: 10% piattaforme, cadenti ogni 250px
- **Fango**: ~20% (frequente)
- **Bouncer**: ~15% (frequenti)
- **Gravità**: +55%

### **Livello 7+: Inferno Progressivo**

_"Densità crescente fino al limite"_

- **Drink**: 9% piattaforme, cadenti ogni 240px
- **Fango**: Cresce progressivamente fino a 40% max
- **Bouncer**: Cresce progressivamente fino a 35% max
- **Fragile**: Cresce fino a 25% max
- **Gravità**: Continua a salire logaritmicamente

**Note tecniche**:

- Gli spacing tornano normali dal livello 3 (55-115px)
- I drink cadenti hanno intervalli decrescenti per aumentare il ritmo
- La probabilità dei drink su piattaforme decresce per bilanciare i cadenti
- Max 1 bouncer attivo a schermo, con distanza minima tra spawn consecutivi

### `SpawnManager` — Spawning/Riciclo/Pulizia

- Cuore operativo del setup instanziato via `Factory method`. Crea entità per fasce basandosi su array a probabilità e cap procedurali, calcolando i posizionamenti per impedire l'overcrowding offscreen o blocchi statici (generazione costante on fly)
- **Margini e offset scalati**: tutti i valori di spawning (margini schermo, offset bouncer/drink, DJ stage height) usano il fattore `GAME.SCALE`

---

## 🌊 Flusso di Gioco

```
START
  │
  ▼
┌─────────────────┐
│  GameScene       │
│  create()        │
│  - 14 piattaforme│
│  - player Y-Start│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  GAME LOOP (update ogni frame)              │
│  1. Player input (tastiera/touch/gyro)      │
│  2. Camera segue il player verso l'alto     │
│  3. Calcola punteggio e distanza            │
│  4. Spawna drink cadenti e bouncer          │
│  5. Ricicla piattaforme fuori schermo       │
│  6. Pulisci entità fuori schermo            │
│  7. Controlla game over per drop screen     │
└─────────────────────────────────────────────┘
```

---

## 📝 Note per gli Sviluppatori

### Come modificare il bilanciamento

Tutti i numeri che influenzano il gameplay sono interamente centralizzati ed esportabili in **`src/GameConfig.ts`**. Modifica i valori lì e il cambiamento si propagherà ovunque.

**IMPORTANTE**: Usa sempre i valori di **riferimento** (come se il gioco fosse largo 350px). La funzione `r()` applicherà automaticamente lo scaling:

```typescript
// ✅ CORRETTO — valore di riferimento
PLAYER.SIZE: r(40),

// ❌ SBAGLIATO — usa il valore già scalato
PLAYER.SIZE: r(40 * GAME.SCALE), // doppio scaling!
```

Per valori hardcoded nei manager/scene, usa `GAME.SCALE`:

```typescript
const r = (v: number) => Math.round(v * GAME.SCALE);
const fontSize = `${r(16)}px`; // Font 16px di riferimento, scalato dinamicamente
```

### Aggiungere nuovi asset grafici

Quando aggiungi nuovi PNG, segui questi rapporti per evitare aliasing:

| Display finale | Dimensione PNG consigliata | Rapporto |
| -------------- | -------------------------- | -------- |
| 30×30 px       | 256×256 o 512×512          | ~8-17:1  |
| 40×40 px       | 256×256 o 320×320          | ~6-8:1   |
| 90×34 px       | 800×400                    | ~9:1     |

**Evita** texture enormi (>2048px) che vengono poi scalate <100px — il GPU campionerà male anche con i mipmap.

### Aggiungere/Modificare elementi UI SVG

Il sistema UI è completamente modulare. Per aggiungere un nuovo elemento:

**1. Aggiungi l'SVG in `public/assets/ui/`**

**2. Definisci le dimensioni in `GameConfig.ts`:**

```typescript
export const UI = {
  // ... elementi esistenti
  NEW_ELEMENT_WIDTH: 100,
  NEW_ELEMENT_HEIGHT: 50,
};
```

**3. Carica l'SVG in `UIManager.preloadAssets()`:**

```typescript
scene.load.svg("newElementIcon", "/assets/ui/new_element.svg", {
  width: r(UI.NEW_ELEMENT_WIDTH),
  height: r(UI.NEW_ELEMENT_HEIGHT),
});
```

**4. Aggiungi l'elemento in `UIManager.createUI()`:**

```typescript
this.newElement = this.scene.add
  .image(x, y, "newElementIcon")
  .setOrigin(0.5, 0)
  .setDisplaySize(r(UI.NEW_ELEMENT_WIDTH), r(UI.NEW_ELEMENT_HEIGHT))
  .setScrollFactor(0)
  .setDepth(100); // Importante: depth >= 100 per essere sulla UI camera
```

**5. Aggiungilo alla lista in `configureUICameraExclusivity()`:**

```typescript
const uiElements = [
  // ... elementi esistenti
  this.newElement,
];
```

**Regole importanti**:

- ✅ **Depth >= 100**: tutti gli elementi UI devono avere depth alto per essere ignorati dalla main camera
- ✅ **ScrollFactor(0)**: mantiene l'elemento fisso sullo schermo
- ✅ **Dimensioni scalate**: usa sempre `r(UI.*)` per responsive design
- ✅ **Colori SVG**: puoi usare colori embedded nell'SVG o modificarli via `setTint()` in Phaser
- ✅ **Interattività**: usa `.setInteractive({ useHandCursor: true })` e `.on("pointerdown", callback)` per bottoni

**Per sostituire un SVG esistente**:

1. Sostituisci il file in `public/assets/ui/` mantenendo lo stesso nome
2. Modifica le dimensioni in `GameConfig.ts` se necessario
3. Il gioco caricherà automaticamente il nuovo SVG

### Aggiungere nuovi contenuti

La factory passiva su `SpawnManager.ts` per le generazioni in real time ti permetterà di inserire asset grafici integrando checks su metodi specifici (e.g., `spawnPlatform`).

---

## 📄 Licenza

_Da definire_
