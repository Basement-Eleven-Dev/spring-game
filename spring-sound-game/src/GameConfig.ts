/**
 * CONFIGURAZIONE CENTRALIZZATA DEL GIOCO
 * ========================================
 * Tutte le costanti di bilanciamento, dimensioni e probabilità
 * risiedono qui. Modifica questi valori per calibrare il gameplay.
 */

// --- Dimensioni del gioco (responsive) ---

/**
 * Calcola l'altezza del canvas in base all'aspect ratio del dispositivo.
 * Su smartphone moderni (19.5:9) il gioco riempie lo schermo verticalmente.
 * Su tablet/desktop viene clampato a un ratio ragionevole.
 *
 * Esempi:
 * - iPhone 14 (390×844): ratio 2.16 → 400×864
 * - iPhone SE (375×667): ratio 1.78 → 400×711
 * - Pixel 7 (412×915):  ratio 2.22 → 400×888
 * - iPad (768×1024):    ratio 1.33 → 400×600 (clamped)
 * - Desktop:            ratio variabile → 400×600-700
 */
function calculateGameHeight(width: number): number {
  if (typeof window === "undefined") return 700; // Fallback per SSR/build
  const ratio = window.innerHeight / window.innerWidth;
  // Clamp tra 1.5 (tablet landscape) e 2.3 (telefono ultra-tall)
  const clampedRatio = Math.max(1.5, Math.min(ratio, 2.3));
  return Math.round(width * clampedRatio);
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = calculateGameHeight(GAME_WIDTH);

export const GAME = {
  WIDTH: GAME_WIDTH,
  HEIGHT: GAME_HEIGHT,
};

/**
 * Posizioni iniziali calcolate in base all'altezza reale del canvas.
 * Queste assicurano che il giocatore e le piattaforme partano sempre
 * dalla stessa distanza relativa dal fondo, su qualsiasi dispositivo.
 */
export const INITIAL = {
  /** Y della piattaforma base (pavimento) — 20px dal fondo */
  BASE_PLATFORM_Y: GAME_HEIGHT - 20,
  /** Y iniziale del giocatore — 100px dal fondo */
  PLAYER_START_Y: GAME_HEIGHT - 100,
};

// --- Fisica ---
export const PHYSICS = {
  BASE_GRAVITY: 800,
  /** Incremento percentuale della gravità per ogni livello (es. 0.15 = +15%) */
  GRAVITY_SCALE_PER_LEVEL: 0.15,
} as const;

// --- Camera ---
export const CAMERA = {
  /** Fluidità dello scrolling verticale (0.05 = lentissimo, 1 = scatto rigido) */
  LERP: 0.12,
  /** Velocità dell'oscillazione da ubriachezza (ms del ciclo sinusoidale) */
  DRUNK_ROTATION_SPEED: 200,
  /** Ampiezza massima della rotazione da ubriachezza (radianti) */
  DRUNK_MAX_AMPLITUDE: 0.06,
} as const;

// --- Giocatore ---
export const PLAYER = {
  SIZE: 40,
  MOVE_SPEED: 250,
  JUMP_FORCE: 600,
} as const;

// --- Piattaforme ---
export const PLATFORM = {
  WIDTH: 80,
  HEIGHT: 20,
  SUBWOOFER_SIZE: 60,
  /** Distanza verticale minima tra due piattaforme consecutive */
  SPACING_MIN: 50,
  /** Distanza verticale massima tra due piattaforme consecutive */
  SPACING_MAX: 130,
  /** Distanza orizzontale massima raggiungibile dalla piattaforma precedente */
  REACH_X: 140,
  /** Numero di piattaforme generate all'inizio del gioco */
  INITIAL_COUNT: 12,
  /** Dimensioni della piattaforma base (pavimento iniziale) */
  BASE_WIDTH: 400,
  BASE_HEIGHT: 15,

  // --- Probabilità di spawn (crescono col livello) ---
  MOVING_BASE_PROB: 0.1,
  MOVING_PROB_PER_LEVEL: 0.05,
  MOVING_MAX_PROB: 0.35,
  FRAGILE_BASE_PROB: 0.1,
  FRAGILE_PROB_PER_LEVEL: 0.05,
  FRAGILE_MAX_PROB: 0.3,
  SUBWOOFER_PROB: 0.1,

  // --- Velocità piattaforme mobili ---
  MOVING_SPEED_MIN: 60,
  MOVING_SPEED_MAX: 120,
  /** Incremento percentuale velocità piattaforme mobili per livello */
  MOVING_SPEED_SCALE_PER_LEVEL: 0.2,
} as const;

// --- Fango (rallenta il salto) ---
export const MUD = {
  WIDTH: 40,
  HEIGHT: 10,
  /** Probabilità base di fango su piattaforme standard */
  BASE_PROB: 0.2,
  PROB_PER_LEVEL: 0.05,
  MAX_PROB: 0.5,
  /** Il fango appare solo dal livello 2 in poi */
  MIN_LEVEL: 2,
  /** Offset orizzontale del fango rispetto al centro della piattaforma */
  OFFSET: 20,
} as const;

// --- Drink ---
export const DRINK = {
  WIDTH: 20,
  HEIGHT: 30,
  /** Probabilità di spawn di un drink su una piattaforma */
  SPAWN_PROB_ON_PLATFORM: 0.1,
  /** Distanza Y tra uno spawn di drink cadente e il successivo */
  SPAWN_INTERVAL: 250,
  /** Velocità di caduta dei drink dall'alto */
  FALLING_SPEED: 120,
  /** Quanto ogni drink incrementa il party level (su 100) */
  PARTY_GAIN: 8,
} as const;

// --- Bouncer (buttafuori) ---
export const BOUNCER = {
  SIZE: 80,
  /** Velocità base di caduta del bouncer */
  BASE_SPEED: 250,
  /** Incremento velocità per ogni livello */
  SPEED_PER_LEVEL: 20,
  /** Intervallo minimo (Y) tra due bouncer */
  MIN_INTERVAL: 350,
  /** Intervallo base (Y) tra due bouncer */
  BASE_INTERVAL: 700,
  /** Riduzione dell'intervallo per ogni livello */
  INTERVAL_REDUCTION_PER_LEVEL: 50,
  /** Durata del lampeggio di warning "!" (ms) */
  TELEGRAPH_DURATION: 150,
  /** Numero di lampeggi prima dello spawn */
  TELEGRAPH_REPEATS: 3,
  /** Livello minimo per far apparire i bouncer */
  MIN_LEVEL: 1,
  /** Forza con cui il bouncer respinge il giocatore verso il basso */
  KNOCKBACK_FORCE: 800,
} as const;

// --- Party System ---
export const PARTY = {
  BAR_X: 240,
  BAR_Y: 15,
  BAR_WIDTH: 140,
  BAR_HEIGHT: 20,
  MAX_LEVEL: 100,

  // Soglie di colore della party bar
  THRESHOLD_YELLOW: 34,
  THRESHOLD_ORANGE: 67,
  THRESHOLD_RED: 100,

  // Moltiplicatori di punteggio per soglia di party
  MULTIPLIER_NORMAL: 1,
  MULTIPLIER_YELLOW: 1.5,
  MULTIPLIER_ORANGE: 2,
  MULTIPLIER_WASTED: 3,
} as const;

// --- Progressione livelli ---
export const LEVEL = {
  /** Distanza sopra la camera a cui appare il DJ Stage */
  DJ_STAGE_OFFSET: 150,
  /** Piattaforme generate dopo il DJ Stage */
  DJ_STAGE_PLATFORMS: 8,
  DJ_STAGE_SPACING_MIN: 120,
  DJ_STAGE_SPACING_MAX: 220,
  /** Delay (ms) tra lo stato wasted e l'apparizione del DJ Stage */
  WASTED_DELAY: 4500,
  /** Punti bonus per level up (moltiplicato per il livello corrente) */
  LEVEL_UP_BONUS: 1000,
  /** Moltiplicatore del salto quando si atterra sul DJ Stage */
  JUMP_BOOST_ON_STAGE: 1.3,
} as const;

// --- Moltiplicatori di salto ---
export const JUMP_MULTIPLIERS = {
  NORMAL: 1,
  /** Salto potenziato dal subwoofer (trampolino) */
  SUBWOOFER: 1.6,
  /** Salto rallentato dal fango */
  MUD: 0.8,
} as const;
