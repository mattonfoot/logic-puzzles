/**
 * Writes the app's sounds to assets/sounds.
 *
 *   npm run sounds
 *
 * They are synthesised rather than sampled: three short, quiet, related tones
 * built from the same handful of numbers, so they sit together as one voice and
 * the repository carries no audio it did not make. Run this after changing any
 * of them; the WAVs are committed, so a normal build never needs it.
 *
 * Replacing one with a real recording is a matter of dropping a 16-bit mono WAV
 * of the same name into assets/sounds — nothing reads these numbers at runtime.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)), 'assets', 'sounds');
const RATE = 44100;

/** A note, shaped by a short attack and an exponential fall. */
function tone({ freq, seconds, gain = 0.5, attack = 0.004, curve = 24, harmonic = 0 }) {
  const samples = Math.round(RATE * seconds);
  const out = new Float64Array(samples);
  for (let index = 0; index < samples; index++) {
    const t = index / RATE;
    const rise = Math.min(1, t / attack);
    const fall = Math.exp(-curve * t);
    const body = Math.sin(2 * Math.PI * freq * t) + harmonic * Math.sin(2 * Math.PI * freq * 2 * t);
    out[index] = gain * rise * fall * body;
  }
  return out;
}

/** Lays one buffer over another, starting `at` seconds in. */
function layer(base, part, at = 0) {
  const start = Math.round(at * RATE);
  const out = new Float64Array(Math.max(base.length, start + part.length));
  out.set(base);
  for (let index = 0; index < part.length; index++) out[start + index] += part[index];
  return out;
}

/** 16-bit mono PCM, which every platform plays without thinking about it. */
function wav(samples) {
  const body = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index++) {
    const clipped = Math.max(-1, Math.min(1, samples[index]));
    body.writeInt16LE(Math.round(clipped * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + body.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(body.length, 40);
  return Buffer.concat([header, body]);
}

// One scale, so the three belong together: E5, A5, and the A major triad.
const E5 = 659.25;
const A5 = 880;
const CS6 = 1108.73;
const E6 = 1318.51;

const SOUNDS = {
  // Navigation: a soft, low click. The quietest of the three — it fires most.
  tap: tone({ freq: E5, seconds: 0.07, gain: 0.22, curve: 60, harmonic: 0.15 }),

  // A mark on the board: brighter and shorter, so a run of them reads as ticking.
  mark: tone({ freq: A5, seconds: 0.055, gain: 0.28, curve: 80, harmonic: 0.25 }),

  // The finish: a rising arpeggio, the only sound that lasts long enough to
  // notice as music rather than as a click.
  success: [
    { freq: A5, at: 0 },
    { freq: CS6, at: 0.09 },
    { freq: E6, at: 0.18 },
  ].reduce(
    (built, note) =>
      layer(
        built,
        tone({ freq: note.freq, seconds: 0.5, gain: 0.24, curve: 9, harmonic: 0.3 }),
        note.at,
      ),
    new Float64Array(0),
  ),
};

await mkdir(OUT_DIR, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  const file = join(OUT_DIR, `${name}.wav`);
  await writeFile(file, wav(samples));
  console.log(`  ✓ ${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
console.log(`\n${Object.keys(SOUNDS).length} sounds in assets/sounds.`);
