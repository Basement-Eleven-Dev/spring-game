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

## � Sistema di Risoluzione Dinamica

Il gioco utilizza un **sistema di risoluzione nativa** che garantisce la massima nitidezza su ogni dispositivo, eliminando completamente lo scaling del browser.

### Problema Risolto

Nelle versioni precedenti, il canvas aveva dimensioni fisse (`GAME_WIDTH = 350`), causando:

- **Upscaling del browser**: su iPhone (390px CSS, dpr=3 → 1170px fisici), il buffer di 1050px veniva upscalato dell'11% → **sfocatura generale**
- **Perdita di dettagli**: texture downscalate 51:1 (drink 1536×1536 → 30×30 display) perdevano bordi e dettagli per aliasing estremo
- **Contrasto con UI HTML**: l'overlay "GIOCA" era nitido (risoluzione nativa), il canvas era sgranato

### Soluzione Implementata

**1. Risoluzione Dinamica** (`GameConfig.ts`)

```typescript
const REFERENCE_WIDTH = 350; // Risoluzione di riferimento per il bilanciamento
const GAME_WIDTH = Math.min(window.innerWidth, 800); // Adatta al viewport (max 800)
const S = GAME_WIDTH / REFERENCE_WIDTH; // Fattore di scala
const r = (v: number) => Math.round(v * S); // Helper di scaling
```

- **iPhone 390px**: `S ≈ 1.114` → tutti i valori scalati del +11%
- **Desktop 800px**: `S ≈ 2.286` → tutto scalato del +129%
- Buffer canvas = `GAME_WIDTH × dpr` = pixel fisici esatti

**2. Scaling Automatico di Tutti i Valori**

Ogni costante spaziale usa la funzione `r()`:

```typescript
// Prima (fisso)
PLAYER.SIZE: 40,
DRINK.WIDTH: 30,

// Dopo (dinamico)
PLAYER.SIZE: r(40),
DRINK.WIDTH: r(30),
```

**3. PNG Ridimensionati per Rapporti Sensati**

| Asset                         | Sorgente Originale  | Ridotto a             | Rapporto Display |
| ----------------------------- | ------------------- | --------------------- | ---------------- |
| drink/beer                    | 1536×1536           | **512×512**           | 51:1 → **17:1**  |
| piattaforme                   | 3200×1600           | **800×400**           | 47:1 → **9:1**   |
| spritesheet fragile/subwoofer | 1600×400 / 3200×400 | **400×100 / 800×100** | idem             |

**4. Mipmapping + RoundPixels** (`main.ts`)

```typescript
render: {
  mipmapFilter: "LINEAR_MIPMAP_NEAREST", // Pre-riduce texture via mipmap chain
  roundPixels: true, // Elimina sub-pixel positioning blur
}
```

### Risultato

✅ **Nitidezza perfetta** su smartphone, tablet, desktop  
✅ **Zero upscaling** — il buffer coincide con i pixel fisici  
✅ **Performance ottimale** — nessun carico GPU aggiuntivo  
✅ **Gameplay identico** — le proporzioni restano invariate grazie al fattore `S`

---

## �🏗️ Architettura

Il progetto segue un'architettura **Manager Pattern**: la scena principale (`GameScene`) è un orchestratore snello che delega la logica a manager specializzati.

```
src/
├── main.ts                ← Entry point + overlay start/permesso sensore
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
│   ├── CameraManager.ts   ← Scrolling fluido + effetti visivi
│   ├── ScoreManager.ts    ← Punteggio + HUD
│   ├── PartyManager.ts    ← Party system + stato wasted
│   ├── LevelManager.ts    ← Progressione livelli + gravità
│   └── SpawnManager.ts    ← Spawning/riciclo/pulizia entità
```

### Diagramma delle dipendenze

```
main.ts
  ├── Overlay HTML (start screen + permesso iOS) → startGame()
  └── GameScene (orchestratore)
        ├── CameraManager ← scrolling + rotazione + vista doppia
        ├── ScoreManager ← punteggio + HUD
        ├── PartyManager ← party bar + wasted → emette evento "wasted-ready"
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

## 📁 Dettaglio File

### `main.ts` — Entry Point

- Configurazione Phaser (dimensioni dinamiche, fisica, scene, scaling)
- **Risoluzione nativa**: `width: GAME.WIDTH` (= `window.innerWidth`, max 800), `autoDensity: true` → buffer canvas = pixel fisici esatti
- **Rendering ottimizzato**:
  - `mipmapFilter: "LINEAR_MIPMAP_NEAREST"` — genera mipmaps per texture grandi, evita aliasing
  - `roundPixels: true` — arrotonda posizioni sprite a pixel interi, elimina blur da sub-pixel
- Importa `GameConfig` per le costanti di dimensione e gravità
- Registra `GameScene` e `GameOverScene`
- **Overlay start screen**: un `<div>` HTML fullscreen con bottone **GIOCA** viene mostrato prima che Phaser venga inizializzato. Il gioco non parte fino al tap dell'utente.
- **Permesso iOS**: se il browser espone `DeviceOrientationEvent.requestPermission` (iOS 13+), il click sul bottone chiama il metodo sincronicamente — unico modo affidabile per soddisfare il requisito "user gesture trusted" di Safari. Su Android/desktop il bottone avvia direttamente `startGame()` senza logica di permessi.
- `startGame()` — funzione che istanzia `new Phaser.Game(config)` solo dopo l'interazione dell'utente.

### `GameConfig.ts` — Configurazione Centralizzata

**Sistema di Risoluzione Dinamica + Costanti di Bilanciamento**

Questo file centralizza:

**Risoluzione Nativa:**

- `REFERENCE_WIDTH` (350) — risoluzione di riferimento su cui sono calibrati tutti i valori
- `GAME_WIDTH` — `Math.min(window.innerWidth, 800)` — si adatta al viewport reale
- `GAME.SCALE` — fattore di scala `S = GAME_WIDTH / 350` esportato per uso nei manager
- `r(v)` — helper interno che scala e arrotonda: `Math.round(v * S)`

**Costanti di Bilanciamento** (tutte scalate via `r()`):

- `GAME` — dimensioni canvas dinamiche + `SCALE` factor
- `INITIAL` — posizioni iniziali (base platform, player start) scalate
- `PHYSICS` — gravità base (`r(750)`) e scaling logaritmico per livello
- `TIME` — orologio narrativo: `START_MINUTES` (960 = 16:00), `DURATION_MINUTES` (720), `NIGHT_TRIGGER_MINUTES` (300 = 21:00)
- `SKY` — colori di sfondo giorno (`0x138EFD`) e notte (`0x0a0a2e`)
- `minutesToClockString()` — helper esportato: converte minuti trascorsi in stringa "HH:MM"
- `CAMERA` — lerp scrolling, ghosting offset (`r(14)`), parametri oscillazione
- `PLAYER` — velocità (`r(280)`), forza salto (`r(580)`), dimensioni (`r(40)`), soglie gyro (angolari, non scalate)
- `PLATFORM` — dimensioni per categoria (wide `r(90)×r(34)`, compact `r(70)×r(32)`, subwoofer `r(60)×r(32)`), spacing, probabilità di spawn, frame dimensions per spritesheet
- `PLATFORM_TEXTURE_CATEGORY` — mappa texture → categoria dimensionale
- `PLATFORM_STANDARD_TEXTURES` — lista texture per varianti standard/mobili
- `MUD` — dimensioni (`r(40)×r(10)`), probabilità, offset (`r(20)`)
- `DRINK` — dimensioni (`r(30)×r(30)`), intervallo spawn (`r(300)`), velocità caduta (`r(110)`), guadagno party
- `BOUNCER` — dimensioni (`r(42)×r(54)`), forze (`r(300)`, `r(650)`), durata pinball, perturbazione Y (`r(120)`)
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

- Sfondo scuro con particelle animate e titolo animato "GAME OVER" (o "04:00" se timeout)
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

| Tipo        | Asset                                             | Dimensione gioco           | Comportamento                                              |
| ----------- | ------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `standard`  | 4 varianti PNG (erba, ubriaco, cassa, cassa_erba) | wide 90×34 / compact 70×32 | Ferma. Può avere fango sopra (dal livello 3)               |
| `moving`    | stesse 4 varianti                                 | wide 90×34 / compact 70×32 | Si muove orizzontalmente, rimbalza ai bordi                |
| `fragile`   | `platform_cassa_rotta_sheet.png` (2 frame)        | compact 70×32              | Animazione di rottura al contatto, poi distruzione         |
| `subwoofer` | `subwoofer_sheet.png` (4 frame)                   | 60×32                      | Loop animazione "cassa che pompa", salto potenziato (×1.7) |

### `Bouncer.ts` — Buttafuori

- Posizionato su un **bordo** (sx o dx, casuale) delle piattaforme standard e fragili
- Appare dal livello 1, con probabilità crescente: `15% + 4%/livello` (max 40%)
- **Nemico difensivo ma eludibile**:
  1.  **Super Mario Stomp**: se il giocatore cade sopra la sua testa, annulla la presa avversaria, schiaccia fisicamente il PNG e lo distrugge, ottenendo punti bonus (+300) ed uno slancio verticale salvifico.
  2.  **Flusso Grab-Throw**:
      - **Presa**: Se intercettato di lato/fondo ostacola il player congelandolo in aria.
      - **Animazione Lancio**: Esegue stringa animazione `bouncerThrow` per ~500ms.
      - **Lancio "Intelligente"**: Scaglia il giocatore impostando la fase di vulnerabilità **pinball**:
        - Se il giocatore è nella parte alta della telecamera, lo lancia verso il basso.
        - Se il giocatore è nella parte bassa (a serio rischio morte), lo sbalza verso l'**alto** ad altissima velocità scongiurando loop involontari.
      - **Scomparsa**: Dopo il lancio, il Buttafuori innesca un fadeout autonomo disabilitando eventuali ulteriori blocchi al player.

---

## ⚙️ Manager

### `CameraManager` — Camera + Effetti Visivi

- **Smooth scroll**: segue il giocatore verso l'alto con lerp 0.1 (non scende mai)
- **Background giorno/notte**: rettangolo fixed che varia da azzurro a blu notte interpolandosi nei trigger dell'orologio interno (es: start 16:00, animazione di cambio passate le 21:00).
- **Effetti ubriachezza progressivi**: gestiti ad ogni frame basandosi su funzioni logaritmiche di lerping che disorientano lo schermo col _Dual Camera Ghosting_ nello stadio "Wasted".

### `ScoreManager` — Punteggio + HUD

- Calcola il **Punteggio** convertito dalla tolleranza `y` percorsa incrementata dal multiplier dei Drink presi
- Costruisce visivamente HUD, statistiche e clock game-time in sovrimpressione
- **Usa scaling dinamico**: tutte le posizioni e font sizes sono scalate via `r()` per adattarsi alla risoluzione del device

### `PartyManager` — Party System + Wasted

- **Raccolta drink**: +10 party level per drink raccolto
- **Stato Wasted** (party = 100): Attiva i trigger dell'evento di checkpoint (DJ Stage). Questo causerà nel GameManager il reset dell'ubriachezza ad avvenuto level up
- **UI scalata**: party bar, padding, font — tutto scalato dinamicamente

### `LevelManager` — Progressione Livelli

- **Gravità logaritmica**: `BASE × (1 + 0.22 × ln(livello))`. Gestisce la complessa scalatura matematica dell'engine limitando l'ingovernabilità del balzo via via all'ascesa limitando pesi estremi
- **Visual "LEVEL X!"**: animazione scalata dinamicamente per ogni risoluzione

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

### Aggiungere nuovi contenuti

La factory passiva su `SpawnManager.ts` per le generazioni in real time ti permetterà di inserire asset grafici integrando checks su metodi specifici (e.g., `spawnPlatform`).

---

## 📄 Licenza

_Da definire_
