import config from '../../app.json';

/**
 * The handful of decisions that live in `app.json` rather than in code.
 *
 * They are one word each, nothing reads them at runtime, and no test would
 * otherwise notice one being changed — which is exactly the shape of a setting
 * that drifts. These are the ones with a reason written down somewhere, pinned
 * against the place the reason lives.
 */
describe('app.json', () => {
  /**
   * Deduction is an iPhone app, and `docs/ipad.md` is the argument for it: every
   * measurement in the type scale is a fixed number of points, so a tablet gets
   * the phone layout with more room around it rather than a layout for the room
   * it has. Letterboxed is not flattering and is not a lie.
   *
   * Turning it on is one word. What that word costs is a width-aware type scale,
   * lists in columns rather than stretched, and a re-think of what `MAX_CELL` is
   * capping — plus a second layout to keep working, on a walk CI does not run.
   */
  it('is offered to iPhones and not to iPads', () => {
    expect(config.expo.ios.supportsTablet).toBe(false);
  });

  /**
   * Portrait only. The board is a staircase that grows down and to the right and
   * is already the tallest thing the app draws; landscape would give it width it
   * cannot use and take the height it needs.
   */
  it('is portrait, which is the shape a logic grid wants', () => {
    expect(config.expo.orientation).toBe('portrait');
  });
});
