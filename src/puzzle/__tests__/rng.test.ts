import { createRng, randomSeed } from '../rng';

describe('createRng', () => {
  it('replays exactly from the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const draw = (rng: ReturnType<typeof createRng>) =>
      Array.from({ length: 20 }, () => rng.next());
    expect(draw(a)).toEqual(draw(b));
  });

  it('diverges from a different seed', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('stays inside its bounds', () => {
    const rng = createRng(7);
    for (let index = 0; index < 500; index++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);

      const int = rng.int(6);
      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(0);
      expect(int).toBeLessThan(6);
    }
  });

  it('shuffles without losing or duplicating anything', () => {
    const items = Array.from({ length: 14 }, (_, index) => index);
    const rng = createRng(99);
    for (let round = 0; round < 20; round++) {
      const shuffled = rng.shuffle(items);
      expect(shuffled).not.toBe(items);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    }
    // Leaves the original alone.
    expect(items).toEqual(Array.from({ length: 14 }, (_, index) => index));
  });

  it('picks from the list it is given', () => {
    const rng = createRng(3);
    const options = ['a', 'b', 'c'];
    const picks = new Set(Array.from({ length: 40 }, () => rng.pick(options)));
    expect([...picks].every((pick) => options.includes(pick))).toBe(true);
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('randomSeed', () => {
  it('hands out varied 32-bit seeds', () => {
    const seeds = Array.from({ length: 200 }, () => randomSeed());
    for (const seed of seeds) {
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
    // Collisions in 200 draws from 2^32 would mean something is badly wrong.
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
