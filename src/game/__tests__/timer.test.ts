import { act, renderHook } from '@testing-library/react-native';

import { useTimer } from '../useTimer';

beforeEach(() => jest.useFakeTimers({ now: 1_000_000 }));
afterEach(() => jest.useRealTimers());

function clock(running: boolean, key = 'a', startAt = 0) {
  let renders = 0;
  const hook = renderHook(
    (props: { running: boolean; key: string; startAt: number }) => {
      renders++;
      return useTimer(props.running, props.key, props.startAt);
    },
    { initialProps: { running, key, startAt } },
  );
  return { ...hook, renders: () => renders };
}

describe('useTimer', () => {
  it('counts without redrawing while it runs', () => {
    const { result, renders } = clock(true);
    const before = renders();
    act(() => jest.advanceTimersByTime(5_500));
    expect(result.current.elapsed()).toBe(5);
    expect(renders()).toBe(before);
  });

  it('shows the count once it stops, and picks up from there', () => {
    const { result, rerender } = clock(true);
    act(() => jest.advanceTimersByTime(7_200));
    rerender({ running: false, key: 'a', startAt: 0 });
    expect(result.current.seconds).toBe(7);
    expect(result.current.elapsed()).toBe(7);

    // Time spent stopped is not counted.
    act(() => jest.advanceTimersByTime(60_000));
    expect(result.current.elapsed()).toBe(7);
    rerender({ running: true, key: 'a', startAt: 0 });
    act(() => jest.advanceTimersByTime(3_000));
    expect(result.current.elapsed()).toBe(10);
  });

  it('starts a resumed game from what it had on the clock', () => {
    const { result } = clock(true, 'a', 90);
    act(() => jest.advanceTimersByTime(2_000));
    expect(result.current.elapsed()).toBe(92);
  });

  it('starts over for a new game', () => {
    const { result, rerender } = clock(true);
    act(() => jest.advanceTimersByTime(40_000));
    rerender({ running: true, key: 'b', startAt: 0 });
    expect(result.current.seconds).toBe(0);
    act(() => jest.advanceTimersByTime(4_000));
    expect(result.current.elapsed()).toBe(4);
  });

  it('keeps the same reader across renders', () => {
    const { result, rerender } = clock(true);
    const first = result.current.elapsed;
    rerender({ running: false, key: 'a', startAt: 0 });
    expect(result.current.elapsed).toBe(first);
  });
});
