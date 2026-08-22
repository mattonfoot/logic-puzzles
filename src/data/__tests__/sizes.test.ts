import { THEMES } from '../themes';
import {
  gridCount,
  ITEM_COUNTS,
  makeSize,
  MAX_ITEMS,
  MAX_SETS,
  normaliseSizeId,
  SET_COUNTS,
  sizeById,
  sizeFor,
  sizeFromId,
  SIZES,
} from '../sizes';

describe('sizes', () => {
  it('offers every combination of the two dials', () => {
    expect(SIZES).toHaveLength(SET_COUNTS.length * ITEM_COUNTS.length);
    expect(SIZES.map((size) => size.id)).toContain('5x6');
    expect(new Set(SIZES.map((size) => size.id)).size).toBe(SIZES.length);
  });

  it('describes a shape as sets by items', () => {
    const size = makeSize(4, 5);
    expect(size).toMatchObject({
      id: '4x5',
      sets: 4,
      items: 5,
      label: '4 × 5',
      description: '4 sets of 5',
      grids: 6,
    });
  });

  it('counts one grid per pair of sets', () => {
    expect(gridCount(3)).toBe(3);
    expect(gridCount(4)).toBe(6);
    expect(gridCount(5)).toBe(10);
  });

  it('gets harder as the shape grows', () => {
    expect(makeSize(3, 3).blurb).toBe('Warm-up');
    expect(makeSize(5, 6).blurb).toBe('Expert');
  });

  it('snaps out-of-range numbers to what the themes can supply', () => {
    expect(sizeFor(2, 9)).toMatchObject({ sets: 3, items: MAX_ITEMS });
    expect(sizeFor(99, 1)).toMatchObject({ sets: MAX_SETS, items: 3 });
  });

  it('reads ids back, including the four presets of the first build', () => {
    expect(sizeFromId('4x6')).toMatchObject({ sets: 4, items: 6 });
    expect(normaliseSizeId('sm')).toBe('4x4');
    expect(sizeById('md')).toMatchObject({ sets: 4, items: 5, label: '4 × 5' });
    expect(sizeById('xs')).toMatchObject({ sets: 3, items: 3 });
    expect(sizeById('lg')).toMatchObject({ sets: 4, items: 6 });
    expect(sizeFromId('nonsense')).toBeNull();
    expect(() => sizeById('nonsense')).toThrow();
  });

  it('never offers a shape the themes cannot fill', () => {
    for (const theme of THEMES) {
      expect(theme.categories.length).toBeGreaterThanOrEqual(MAX_SETS);
      for (const category of theme.categories) {
        expect(category.items.length).toBeGreaterThanOrEqual(MAX_ITEMS);
      }
    }
  });
});
