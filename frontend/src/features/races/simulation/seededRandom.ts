/** Hash FNV-1a de 32 bits: convierte un texto en una semilla numérica estable. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type RandomFn = () => number;

/**
 * Generador pseudoaleatorio mulberry32. Con la misma semilla produce siempre la misma
 * secuencia, lo que hace que el "día simulado" no cambie al recargar la página.
 */
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: RandomFn, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function pickOne<T>(random: RandomFn, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('No se puede elegir de una lista vacía.');
  return item;
}

/** Elige un elemento con probabilidad proporcional a su peso. */
export function pickWeighted<T>(
  random: RandomFn,
  items: readonly T[],
  weight: (item: T) => number,
): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let threshold = random() * total;
  for (const item of items) {
    threshold -= weight(item);
    if (threshold < 0) return item;
  }
  return pickOne(random, items);
}
