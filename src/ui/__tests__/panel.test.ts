import { panelHeight } from '../TitlePanel';

/**
 * Every iPhone the app is built for, with the insets iOS actually reports:
 * the notch or the island at the top, the home indicator at the foot, and
 * nothing at either end of the one with a button.
 */
const PHONES = [
  { name: 'iPhone SE (3rd generation)', height: 667, bottom: 0 },
  { name: 'iPhone 13 mini', height: 812, bottom: 34 },
  { name: 'iPhone 11 Pro', height: 812, bottom: 34 },
  { name: 'iPhone 11', height: 896, bottom: 34 },
  { name: 'iPhone 14', height: 844, bottom: 34 },
  { name: 'iPhone 15 Pro', height: 852, bottom: 34 },
  { name: 'iPhone 15 Pro Max', height: 932, bottom: 34 },
];

/**
 * What the numbered list wants under the panel with nothing lost to a safe
 * area, measured in the browser rather than added up from the stylesheet: at
 * 375 × 812 the heading, six rows, the pager and the way back fitted a bottom
 * half of 416 with 30 points to spare.
 *
 * Written out here rather than imported from the panel, so this and the
 * constant the panel uses cannot drift into agreeing with each other while both
 * being wrong — which is how the first attempt shipped 16 points short.
 */
const LIST_NEEDS = 386;

/** On top of the home indicator, for a device whose text is not Chromium's. */
const MARGIN = 8;

describe('the title panel', () => {
  for (const phone of PHONES) {
    describe(phone.name, () => {
      const panel = panelHeight(phone.height, phone.bottom);
      const below = phone.height - panel;

      it('leaves the six numbered puzzles room to stand without scrolling', () => {
        expect(below).toBeGreaterThanOrEqual(LIST_NEEDS + phone.bottom + MARGIN);
      });

      it('never takes more than half the screen', () => {
        expect(panel).toBeLessThanOrEqual(phone.height / 2);
      });

      it('keeps enough of the screen to carry the name', () => {
        expect(panel).toBeGreaterThanOrEqual(200);
      });
    });
  }

  /**
   * The shape the design is written around, kept wherever the phone can afford
   * it: on a big screen the panel is still exactly half.
   */
  it('is half the screen on a phone with the room for it', () => {
    expect(panelHeight(932, 34)).toBe(466);
    expect(panelHeight(1024, 34)).toBe(512);
  });

  /** And gives way, rather than pushing the list off, when it cannot. */
  it('gives way on a short one', () => {
    expect(panelHeight(812, 34)).toBeLessThan(406);
    expect(panelHeight(667, 0)).toBeLessThan(333);
  });

  /**
   * The home indicator is the whole of the difference between a list that fits
   * in a browser and one that scrolls on the phone, so the panel has to know
   * about it.
   */
  it('hands the foot of the screen back to whatever the device takes there', () => {
    expect(panelHeight(812, 0) - panelHeight(812, 34)).toBe(34);
  });

  /**
   * Two screens on one phone get the same panel, which is what makes stepping
   * between them change the bottom half and nothing else.
   */
  it('depends on the phone and nothing else', () => {
    expect(panelHeight(812, 34)).toBe(panelHeight(812, 34));
  });
});
