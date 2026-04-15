/**
 * CONFIGURAZIONE CENTRALIZZATA DEL GIOCO
 * ========================================
 * Tutte le costanti di bilanciamento, dimensioni e probabilità
 * risiedono qui. Modifica questi valori per calibrare il gameplay.
 *
 * RISOLUZIONE NATIVA (DPR-AWARE)
 * --------------------------------
 * GAME_WIDTH = CSS_WIDTH × devicePixelRatio
 *
 * Phaser 3.90 non supporta correttamente autoDensity: il canvas buffer
 * resta a 1× risoluzione anche con autoDensity: true. Su iPhone (DPR=3)
 * questo causa un upscale 3× da parte del browser → sfocatura totale.
 *
 * Soluzione: incorporiamo il DPR direttamente nelle dimensioni del gioco.
 * Il canvas opera a risoluzione fisica nativa (1125×1920 su iPhone 375px DPR=3).
 * Scale.FIT riduce il CSS display a 375×640 CSS = 1125×1920 fisici → 1:1 → nitido.
 *
 * Siccome tutti i valori spaziali usano r(v) = v × S, e S = GAME_WIDTH / 350,
 * moltiplicare GAME_WIDTH per DPR scala automaticamente tutto in modo proporzionale.
 * Le proporzioni di gioco (salto, gravità, dimensioni) restano identiche.
 */

// --- Dimensioni del gioco (responsive + DPR) ---

/** Larghezza di riferimento su cui sono stati calibrati tutti i valori originali. */
const REFERENCE_WIDTH = 350;

/**
 * Device Pixel Ratio: quanti pixel fisici per pixel CSS.
 * iPhone: 3, Android: 2-3, Desktop: 1 (retina Mac: 2).
 */
const DPR =
  typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

/**
 * Larghezza CSS del viewport, cappata a 800 CSS px per evitare
 * buffer enormi su desktop ultra-wide.
 */
const CSS_WIDTH =
  typeof window !== "undefined"
    ? Math.min(window.innerWidth, 800)
    : REFERENCE_WIDTH;

/**
 * Larghezza del mondo di gioco in PIXEL FISICI.
 * Su iPhone 375px DPR=3: 375 × 3 = 1125 pixel.
 * Su desktop 800px DPR=1: 800 × 1 = 800 pixel.
 * Il canvas opera a questa risoluzione → nessun upscale del browser → nitido.
 */
const GAME_WIDTH = Math.round(CSS_WIDTH * DPR);

/**
 * Fattore di scala: converte i valori calibrati a 350 nella risoluzione corrente.
 * Include automaticamente il DPR: la stessa formula r(v) scala tutto
 * proporzionalmente sia per il viewport (CSS) sia per la densità (DPR).
 *
 * Es. su iPhone 375px DPR=3 → S = 1125/350 ≈ 3.21
 * Es. su desktop 800px DPR=1 → S = 800/350 ≈ 2.29
 */
const S = GAME_WIDTH / REFERENCE_WIDTH;

/** Shorthand: scala e arrotonda un valore di riferimento. */
const r = (v: number) => Math.round(v * S);

/**
 * Calcola l'altezza del canvas in pixel fisici, basata sull'aspect ratio
 * CSS del dispositivo (innerHeight / innerWidth) applicata a GAME_WIDTH.
 * Su smartphone moderni (19.5:9) il gioco riempie lo schermo verticalmente.
 * Su tablet/desktop viene clampato a un ratio ragionevole.
 */
function calculateGameHeight(width: number): number {
  if (typeof window === "undefined") return r(700);
  const ratio = window.innerHeight / window.innerWidth;
  const clampedRatio = Math.max(1.5, Math.min(ratio, 2.3));
  return Math.round(width * clampedRatio);
}

const GAME_HEIGHT = calculateGameHeight(GAME_WIDTH);

export const GAME = {
  WIDTH: GAME_WIDTH,
  HEIGHT: GAME_HEIGHT,
  /** Fattore di scala rispetto alla risoluzione di riferimento (350px). */
  SCALE: S,
};

/**
 * Posizioni iniziali calcolate in base all'altezza reale del canvas.
 */
export const INITIAL = {
  BASE_PLATFORM_Y: GAME_HEIGHT - r(20),
  PLAYER_START_Y: GAME_HEIGHT - r(100),
};

// --- Orologio narrativo (16:00 → 04:00) ---

/**
 * Parametri dell'orologio narrativo.
 * Il tempo scorre in modo indipendente dal gameplay:
 * 1 secondo reale = 1 minuto narrativo.
 * La serata dura 720 minuti (12 ore) → 720 secondi reali (~12 min).
 */
export const TIME = {
  /** Ora di inizio in minuti dalla mezzanotte: 16:00 = 16×60 */
  START_MINUTES: 960,
  /** Durata totale della serata in minuti: 16:00 → 04:00 = 12 ore = 720 min */
  DURATION_MINUTES: 720,
  /**
   * Soglia per il cambio di background notte (minuti trascorsi dall'inizio).
   * 21:00 = 5 ore dopo le 16:00 = 300 min.
   * Lo switch effettivo avviene al successivo level up dopo questa soglia.
   */
  NIGHT_TRIGGER_MINUTES: 300,
} as const;

/** Colori di sfondo: giorno (azzurro) e notte (blu scuro). */
export const SKY = {
  DAY: 0x138efd,
  NIGHT: 0x0a0a2e,
} as const;

/**
 * Configurazione UI — Switch degli sfondi orario.
 * Gli SVG day/sunset/night cambiano in base ai minuti trascorsi.
 */
export const UI = {
  /** Soglia per passare da day a sunset: 19:00 = 3 ore dopo le 16:00 = 180 min */
  SUNSET_START_MINUTES: 180,
  /** Soglia per passare da sunset a night: 23:00 = 7 ore dopo le 16:00 = 420 min */
  NIGHT_START_MINUTES: 420,
  /** Dimensioni base degli elementi UI (scalati con GAME.SCALE) */
  TIME_ICON_WIDTH: 80,
  TIME_ICON_HEIGHT: 50,
  POINTS_BAR_WIDTH: 180,
  POINTS_BAR_HEIGHT: 30,
  CONTROL_BUTTON_SIZE: 30,
  /** Padding tra gli elementi della top bar */
  TOP_BAR_PADDING: 12,
  /** Distanza dal bordo superiore */
  TOP_BAR_Y: 16,
  /** Party bar: posizionata sotto il time icon, larga metà schermo */
  PARTY_BAR_WIDTH: 175, // Metà schermo (350/2), scalato responsivamente
  PARTY_BAR_HEIGHT: 30,
  PARTY_BAR_Y: 62, // Sotto il time icon
  PARTY_BAR_X: 12, // Allineata a sinistra con padding
} as const;

/**
 * Converte i minuti trascorsi dall'inizio partita in stringa orario "HH:MM".
 * Gestisce correttamente il passaggio di mezzanotte (es. 01:30).
 */
export function minutesToClockString(minutesElapsed: number): string {
  const total = (TIME.START_MINUTES + Math.floor(minutesElapsed)) % 1440;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// --- Fisica ---
export const PHYSICS = {
  BASE_GRAVITY: r(750),
  /**
   * Incremento gravità per livello — curva LOGARITMICA:
   * Livello 1: 750 | 2: 855 | 3: 923 | 5: 1010 | 10: 1111
   * Formula: BASE × (1 + SCALE × ln(level))
   * Rispetto al lineare (+15%/lvl), cresce meno ai livelli alti → meno punitiva
   */
  GRAVITY_SCALE_PER_LEVEL: 0.22,
} as const;

// --- Camera ---

/**
 * Costanti per lo scrolling e gli effetti di ubriachezza progressiva.
 *
 * Gli effetti si attivano a partire dalla soglia gialla del party level (30%)
 * e crescono fino al massimo a wasted (100%):
 *
 *   Rotazione     — oscillazione sinusoidale con ampiezza interpolata (lerp).
 *                   Non passa mai di scatto a 0: l'ampiezza si riduce gradualmente
 *                   anche al reset del livello.
 *
 *   Vista doppia  — a wasted viene aggiunta una seconda camera (ghost) che clona
 *                   la scena con offset orizzontale e alpha ridotta.
 *                   Crea il classico ghosting/sdoppiamento da ubriachezza
 *                   senza sfocatura né pixelazione.
 */
export const CAMERA = {
  /** Fluidità dello scrolling verticale (0 = lento, 1 = scatto immediato) */
  LERP: 0.1,

  /** Frequenza di oscillazione in ms — valore più basso = movimento più rapido */
  DRUNK_ROTATION_SPEED: 180,
  /** Ampiezza massima rotazione a wasted in radianti (~8.6°) */
  DRUNK_MAX_AMPLITUDE: 0.15,

  /**
   * Offset orizzontale in px della ghost camera rispetto alla camera principale.
   * Valori 10-18: ghosting percettibile ma non disorientante.
   */
  DRUNK_GHOST_OFFSET: r(14),

  /**
   * Opacità di picco della ghost camera durante l'oscillazione.
   * Il valore effettivo oscilla tra 0 e questo massimo con cadenza naturale.
   * 0.30-0.35 è il range consigliato: ghosting leggibile senza sovrastare la scena.
   */
  DRUNK_GHOST_ALPHA: 0.32,

  /**
   * Divisore temporale dell'oscillazione dell'alpha della ghost camera.
   * La funzione usata è max(0, sin(time/period)):
   * - ciclo completo ~4.4s (2π × 700ms)
   * - visibile ~2.2s, invisibile ~2.2s, cadenza naturale non tribale
   */
  DRUNK_GHOST_PERIOD: 700,

  /**
   * Fattore lerp per frame dell'alpha della ghost camera.
   * 0.035 è ~45 frame per raggiungere il target a 60fps (≈01.5s),
   * abbastanza morbido da non sentire click tra visibile e invisibile.
   */
  DRUNK_GHOST_LERP: 0.035,
} as const;

// --- Giocatore ---
export const PLAYER = {
  SIZE: r(40),
  MOVE_SPEED: r(280),
  JUMP_FORCE: r(580),
  /** Soglia di gamma (gradi) sotto cui il tilt viene ignorato — elimina il rumore del sensore */
  GYRO_DEADZONE: 8,
  /** Angolo di gamma (gradi) a cui si raggiunge la velocità orizzontale massima */
  GYRO_MAX_TILT: 28,

  // --- Spritesheet animazione salto ---

  /** Dimensione frame nello spritesheet (4 frame orizzontali, 1024×256 → 256×256) */
  FRAME_WIDTH: 256,
  FRAME_HEIGHT: 256,
  /** Frame rate animazione salto */
  JUMP_ANIM_FPS: 12,
} as const;

// --- Piattaforme ---

/**
 * Categorie visive delle piattaforme.
 *
 * Le piattaforme standard e mobili usano 4 varianti grafiche raggruppate
 * in due categorie di dimensioni diverse (ricavate dal bounding-box reale
 * degli asset senza trasparenza):
 *
 *   WIDE    → "erba" e "ubriaco"      — aspetto largo e piatto  (~2.65:1)
 *   COMPACT → "cassa" e "cassa_erba"  — aspetto più stretto     (~2.18:1)
 *
 * Le dimensioni displaySize nel gioco vengono scelte in base alla categoria
 * così che ogni variante abbia proporzioni corrette.
 */
export type PlatformSizeCategory = "wide" | "compact";

/**
 * Mappa texture → categoria dimensionale.
 * Usata da Platform.initPlatform() per scegliere la displaySize corretta.
 */
export const PLATFORM_TEXTURE_CATEGORY: Record<string, PlatformSizeCategory> = {
  platformErbaTexture: "wide",
  platformUbriacoTexture: "wide",
  platformCassaTexture: "compact",
  platformCassaErbaTexture: "compact",
};

/**
 * Lista delle texture disponibili per piattaforme standard e mobili.
 * Lo SpawnManager ne sceglie una a caso ad ogni spawn.
 */
export const PLATFORM_STANDARD_TEXTURES: string[] = [
  "platformErbaTexture",
  "platformUbriacoTexture",
  "platformCassaTexture",
  "platformCassaErbaTexture",
];

export const PLATFORM = {
  // --- Dimensioni per categoria (larghezza × altezza in px di gioco) ---

  /** Piattaforme "wide": erba, ubriaco — più larghe e piatte */
  WIDE_WIDTH: r(90),
  WIDE_HEIGHT: r(34),

  /** Piattaforme "compact": cassa, cassa_erba — più strette e alte */
  COMPACT_WIDTH: r(70),
  COMPACT_HEIGHT: r(32),

  /** Subwoofer (trampolino): dimensione del singolo frame */
  SUBWOOFER_WIDTH: r(60),
  SUBWOOFER_HEIGHT: r(32),

  SPACING_MIN: r(55),
  SPACING_MAX: r(115),
  /** Max spostamento orizzontale tra piattaforme consecutive */
  REACH_X: r(130),
  /** Piattaforme iniziali generate al create */
  INITIAL_COUNT: 14,

  BASE_WIDTH: r(400),
  BASE_HEIGHT: r(15),

  // --- Probabilità di spawn (crescono col livello) ---
  /** Le piattaforme mobili appaiono dal livello 1 ma sono rare all'inizio */
  MOVING_BASE_PROB: 0.05,
  MOVING_PROB_PER_LEVEL: 0.04,
  MOVING_MAX_PROB: 0.3,

  /** Le piattaforme fragili appaiono dal livello 2 */
  FRAGILE_BASE_PROB: 0.0,
  FRAGILE_PROB_PER_LEVEL: 0.06,
  FRAGILE_MAX_PROB: 0.25,

  /** Subwoofer: raro ma costante */
  SUBWOOFER_PROB: 0.08,

  // --- Velocità piattaforme mobili ---
  MOVING_SPEED_MIN: r(50),
  MOVING_SPEED_MAX: r(100),
  MOVING_SPEED_SCALE_PER_LEVEL: 0.15,

  // --- Animazioni ---

  /** Spritesheet cassa rotta: 2 frame orizzontali, 200×100 per frame (sheet 400×100) */
  FRAGILE_FRAME_WIDTH: 200,
  FRAGILE_FRAME_HEIGHT: 100,

  /** Spritesheet subwoofer: 4 frame orizzontali, 200×100 per frame (sheet 800×100) */
  SUBWOOFER_FRAME_WIDTH: 200,
  SUBWOOFER_FRAME_HEIGHT: 100,

  /** Frame rate dell'animazione subwoofer (loop) */
  SUBWOOFER_ANIM_FPS: 8,
  /** Durata dell'animazione di rottura della piattaforma fragile (ms) */
  FRAGILE_BREAK_DURATION_MS: 300,
} as const;

// --- Fango (rallenta il salto) ---
export const MUD = {
  WIDTH: r(40),
  HEIGHT: r(10),
  BASE_PROB: 0.15,
  PROB_PER_LEVEL: 0.04,
  MAX_PROB: 0.4,
  /** Il fango appare solo dal livello 3 */
  MIN_LEVEL: 3,
  OFFSET: r(20),
} as const;

// --- Drink ---
export const DRINK = {
  WIDTH: r(30),
  HEIGHT: r(30),
  /** Probabilità drink su piattaforma — più alto = party più veloce */
  SPAWN_PROB_ON_PLATFORM: 0.12,
  /** Distanza tra drink cadenti (px di salita) */
  SPAWN_INTERVAL: r(300),
  FALLING_SPEED: r(110),
  /** Party gain per drink: 10 drink per raggiungere il wasted */
  PARTY_GAIN: 10,
} as const;

// --- Bouncer (buttafuori) ---
export const BOUNCER = {
  /**
   * Dimensione di display del bouncer.
   * Deve essere visivamente imponente rispetto al giocatore (SIZE 40×40).
   * L'asset ha content ratio ~0.77:1 (più alto che largo).
   */
  WIDTH: r(42),
  HEIGHT: r(54),

  // --- Spritesheet animazione ---

  /** Dimensione frame nello spritesheet (3 frame orizzontali, 384×158 → 128×158) */
  FRAME_WIDTH: 128,
  FRAME_HEIGHT: 158,
  /**
   * Frame rate animazione lancio (frame 0→1→2, one-shot al contatto).
   * A 6 fps i 3 frame durano ~500ms: abbastanza per percepire l'azione
   * senza rallentare il ritmo di gioco.
   */
  THROW_ANIM_FPS: 6,

  /** Probabilità base che una piattaforma idonea abbia un bouncer */
  BASE_PROB: 0.15,
  PROB_PER_LEVEL: 0.04,
  MAX_PROB: 0.4,
  /** I bouncer appaiono solo dal livello 2 */
  MIN_LEVEL: 1,
  /**
   * Forza del lancio iniziale verso il BASSO (positiva in Phaser).
   * Il bouncer ti scaraventa giù — combinata con la velocità laterale
   * dà una traiettoria diagonale che inizia la fase pinball.
   */
  KNOCKBACK_FORCE: r(300),
  /**
   * Velocità laterale iniziale della fase pinball.
   * Valore alto = il player schizza via come una palla da flipper.
   */
  PINBALL_LAUNCH_X: r(650),
  /**
   * Cooldown in ms tra un lancio e l'altro (per evitare trigger multipli).
   * 600ms ≈ durata dell'animazione di lancio a 6fps.
   */
  COOLDOWN_MS: 600,

  // --- Fase Pinball ---
  // Dopo l'animazione di lancio, il player entra in modalità "pinball":
  // rimbalza violentemente sui bordi dello schermo, gira su se stesso,
  // e non può controllare il personaggio. Effetto spaesante e punitivo.

  /**
   * Durata della fase pinball in ms.
   * 1 secondo di caos totale prima di riprendere il controllo.
   */
  PINBALL_DURATION_MS: 1000,
  /**
   * Durata totale dello stordimento (ms) = animazione (~500ms) + pinball.
   * Durante tutto questo tempo il player non può muoversi né saltare.
   */
  STUN_DURATION_MS: 1500,
  /**
   * Fattore di conservazione della velocità ad ogni rimbalzo sul bordo.
   * 0.92 = perde solo l'8% → rimbalzi violenti e sostenuti.
   */
  PINBALL_BOUNCE_DAMPING: 0.92,
  /**
   * Velocità di rotazione del player durante il pinball (gradi/frame).
   * 15°/frame a 60fps = ~2.5 giri/secondo — effetto "sballottamento".
   */
  PINBALL_SPIN_SPEED: 15,
  /**
   * Perturbazione Y random ad ogni rimbalzo laterale.
   * Aggiunge caos verticale: il player non segue una traiettoria prevedibile.
   */
  PINBALL_Y_PERTURBATION: r(120),
  /**
   * Distanza minima verticale (px) tra bouncer consecutivi.
   * Evita che due bouncer appaiano troppo vicini nella salita.
   */
  MIN_SPAWN_SPACING: r(400),
} as const;

// --- Party System ---
export const PARTY = {
  /** Posizione dinamica della barra: centrata orizzontalmente, in alto */
  BAR_WIDTH: r(140),
  BAR_HEIGHT: r(14),
  MAX_LEVEL: 100,

  // Soglie di colore
  THRESHOLD_YELLOW: 30,
  THRESHOLD_ORANGE: 60,
  THRESHOLD_RED: 100,

  // Moltiplicatori punteggio
  MULTIPLIER_NORMAL: 1,
  MULTIPLIER_YELLOW: 1.5,
  MULTIPLIER_ORANGE: 2.5,
  MULTIPLIER_WASTED: 4,
} as const;

// --- Progressione livelli ---
export const LEVEL = {
  DJ_STAGE_OFFSET: r(180),
  DJ_STAGE_PLATFORMS: 10,
  DJ_STAGE_SPACING_MIN: r(100),
  DJ_STAGE_SPACING_MAX: r(180),
  WASTED_DELAY: 4000,
  LEVEL_UP_BONUS: 1500,
  JUMP_BOOST_ON_STAGE: 1.4,
} as const;

// --- Moltiplicatori di salto ---
export const JUMP_MULTIPLIERS = {
  NORMAL: 1,
  SUBWOOFER: 1.7,
  MUD: 0.75,
} as const;

// --- Impostazioni di gioco (modificabili dal menu di pausa) ---
export const SETTINGS = {
  /** Abilita/disabilita il controllo tramite accelerometro (OFF di default, attivabile dal menu di pausa) */
  gyroEnabled: false,
  /** Abilita/disabilita l'audio di gioco */
  audioEnabled: true,
};
