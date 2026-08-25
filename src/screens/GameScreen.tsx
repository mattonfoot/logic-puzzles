import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClueList } from '../components/ClueList';
import { fitCellSize, GridBoard, MAX_CELL } from '../components/GridBoard';
import { SolvedPanel } from '../components/SolvedPanel';
import {
  clearMistakes,
  findHint,
  findMistakes,
  getMark,
  isSolvable,
  isSolved,
  nextMark,
  progress,
  reconcile,
  setMark,
  solvedMarks,
  type Cell,
  type Marks,
} from '../game/board';
import { SAVE_VERSION, type SavedGame } from '../game/persistence';
import type { CompletionInput } from '../game/usePersistence';
import { formatDuration, useTimer } from '../game/useTimer';
import { clueAttributes, describeClue } from '../puzzle/describe';
import type { Attribute, Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { border, joinLeft, palette, radius, space, tint } from '../ui/theme';

/** How much each press of the zoom buttons adds or takes away. */
const ZOOM_STEP = 8;
/** How many moves back the undo button can reach. */
const UNDO_LIMIT = 200;

type Tab = 'grid' | 'clues' | 'result';

interface Props {
  puzzle: Puzzle;
  /** Board to start from when the player is picking a game back up. */
  restore?: SavedGame | null;
  onExit: () => void;
  onNewPuzzle: () => void;
  onSaveProgress: (game: SavedGame) => void;
  onCompleted: (input: CompletionInput) => Promise<Improvement>;
  onOpenStats: () => void;
}

/**
 * The board itself. App mounts one per puzzle (keyed by seed), so the initial
 * state can come straight from a resumed game.
 *
 * The grid and the clues are two tabs of one fixed-height screen rather than
 * one long scroll: the board opens at the size that fits the space it is given,
 * and reading a clue is a tap away instead of a scroll away.
 */
export function GameScreen({
  puzzle,
  restore,
  onExit,
  onNewPuzzle,
  onSaveProgress,
  onCompleted,
  onOpenStats,
}: Props) {
  const insets = useSafeAreaInsets();
  const resumed = restore?.puzzle.seed === puzzle.seed ? restore : null;

  // Bumped by "Restart": the puzzle stays exactly as it is — same seed, same
  // theme, sets and items — while the board and the clock start over.
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('grid');
  const [marks, setMarks] = useState<Marks>(() => resumed?.marks ?? {});
  const [focusedClue, setFocusedClue] = useState<number | null>(null);
  const [crossedOut, setCrossedOut] = useState<Set<number>>(
    () => new Set(resumed?.crossedOut ?? []),
  );
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  // Every board the player has moved on from, newest last, so a move can be
  // taken back. It lives for the session only — a resumed game starts fresh.
  const [history, setHistory] = useState<Marks[]>([]);
  // Set when a hint finds the board past saving; cleared as soon as it is not.
  const [flagged, setFlagged] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [autoEliminate, setAutoEliminate] = useState(true);
  const [hintsUsed, setHintsUsed] = useState(() => resumed?.hintsUsed ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved = useMemo(() => isSolved(marks, puzzle), [marks, puzzle]);
  const wrong = useMemo(() => findMistakes(marks, puzzle), [marks, puzzle]);
  const stuck = flagged && wrong.length > 0;
  const filled = useMemo(() => progress(marks, puzzle), [marks, puzzle]);
  const seconds = useTimer(
    !solved,
    `${puzzle.seed}:${attempt}`,
    attempt === 0 ? (resumed?.seconds ?? 0) : 0,
  );

  // The whole staircase is drawn at once, so the cell size decides whether it
  // fits. It is measured against the space the tab actually leaves for it, and
  // the player can zoom in from there; a zoomed-in board scrolls both ways.
  const [boardArea, setBoardArea] = useState({ width: 0, height: 0 });
  const fitCell = useMemo(
    () => fitCellSize(puzzle, boardArea.width, boardArea.height),
    [puzzle, boardArea],
  );
  const [zoom, setZoom] = useState(0);
  const cellSize = Math.min(MAX_CELL, fitCell + zoom);

  const measureBoard = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardArea((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  const highlight = useMemo<Attribute[]>(
    () => (focusedClue === null ? [] : clueAttributes(puzzle.clues[focusedClue])),
    [focusedClue, puzzle.clues],
  );

  // A snapshot of the board that the autosave paths can read without having to
  // re-subscribe every time the clock ticks.
  const snapshot = useRef<() => SavedGame>(() => ({}) as SavedGame);
  snapshot.current = () => ({
    version: SAVE_VERSION,
    puzzle,
    marks,
    crossedOut: [...crossedOut],
    seconds,
    hintsUsed,
    updatedAt: Date.now(),
  });
  const finished = useRef(false);
  finished.current = solved;

  useEffect(() => {
    if (!solved) return;
    haptics.success();
    // The finish is the news, so show it — the grid stays a tab away.
    setTab('result');
  }, [solved]);

  // Record the finish once, and ask how it compares with earlier games.
  useEffect(() => {
    if (!solved) return;
    let active = true;
    void onCompleted({ seconds, hintsUsed, revealed }).then((result) => {
      if (active) setImprovement(result);
    });
    return () => {
      active = false;
    };
    // `seconds` is read at the moment of the win; it must not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  // Save the board shortly after every change, so closing the app mid-puzzle
  // loses nothing worth keeping.
  useEffect(() => {
    if (solved) return;
    const timer = setTimeout(() => onSaveProgress(snapshot.current()), 600);
    return () => clearTimeout(timer);
  }, [marks, crossedOut, hintsUsed, solved, onSaveProgress]);

  // Backgrounding the app and leaving the screen both save immediately.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !finished.current) onSaveProgress(snapshot.current());
    });
    return () => {
      subscription.remove();
      if (!finished.current) onSaveProgress(snapshot.current());
    };
  }, [onSaveProgress]);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 2600);
  }, []);

  /** Records a move so it can be taken back, then makes it. */
  const move = useCallback((change: (current: Marks) => Marks) => {
    setMistakes(new Set());
    setMarks((current) => {
      const next = change(current);
      if (next === current) return current;
      setHistory((past) => [...past.slice(-(UNDO_LIMIT - 1)), current]);
      return next;
    });
  }, []);

  const toggleCell = useCallback(
    (cell: Cell) => {
      // A finished board is read-only: a stray tap would undo the win, restart
      // the clock and have the game counted twice.
      if (finished.current) {
        flash('This puzzle is finished — Restart to play it again.');
        return;
      }
      haptics.tap();
      // The cycle follows what the square shows, so an automatic cross behaves
      // like any other: blank → ✕ → ✓ → blank. Whatever it lands on is the
      // player's own mark from then on.
      move((current) =>
        setMark(current, cell, nextMark(getMark(current, cell)), {
          size: puzzle.size.items,
          autoEliminate,
        }),
      );
    },
    [autoEliminate, flash, move, puzzle.size.items],
  );

  const undo = useCallback(() => {
    if (history.length === 0) {
      flash('Nothing to undo.');
      return;
    }
    haptics.select();
    setMistakes(new Set());
    setHistory((past) => past.slice(0, -1));
    // Reconciled on the way back in, so a board recorded while Auto ✕ was on
    // comes back the way the setting stands now.
    setMarks(reconcile(history[history.length - 1], { size: puzzle.size.items, autoEliminate }));
  }, [autoEliminate, flash, history, puzzle.size.items]);

  /** Takes moves back until the answer is within reach again. */
  const rewind = useCallback(() => {
    haptics.select();
    const options = { size: puzzle.size.items, autoEliminate };
    let past = history;
    let board: Marks | null = null;
    let steps = 0;

    while (past.length > 0) {
      const candidate = reconcile(past[past.length - 1], options);
      past = past.slice(0, -1);
      steps++;
      if (isSolvable(candidate, puzzle)) {
        board = candidate;
        break;
      }
    }

    setHistory(past);
    setMistakes(new Set());
    if (board) {
      setMarks(board);
      flash(`Rewound ${steps} move${steps === 1 ? '' : 's'} to a board that can still be solved.`);
      return;
    }
    // Nothing recorded is clean — a resumed board can start out wrong, and its
    // history begins where the player picked it up. Take the bad marks off.
    setMarks((current) => clearMistakes(current, puzzle, options));
    flash('Took off the marks that cannot be right.');
  }, [autoEliminate, flash, history, puzzle]);

  /**
   * Checks the board before it helps: a hint on top of a mark that contradicts
   * the answer would be advice towards a solution the player can no longer
   * reach, so say so instead and offer to wind it back.
   */
  const hint = useCallback(() => {
    if (wrong.length > 0) {
      haptics.warn();
      setMistakes(new Set(wrong));
      setFlagged(true);
      // The marks are on the board, so that is where the answer is.
      setTab('grid');
      flash('A hint cannot help from here — the answer is out of reach.');
      return;
    }
    setFlagged(false);

    const cell = findHint(marks, puzzle, (max) => Math.floor(Math.random() * max));
    if (!cell) {
      flash('Nothing left to reveal.');
      return;
    }
    haptics.select();
    setHintsUsed((count) => count + 1);
    setTab('grid');
    move((current) => setMark(current, cell, 'yes', { size: puzzle.size.items, autoEliminate }));
    flash(
      `Hint: ${puzzle.categories[cell.c1].items[cell.i1].label} goes with ${puzzle.categories[cell.c2].items[cell.i2].label}.`,
    );
  }, [autoEliminate, flash, marks, move, puzzle, wrong]);

  const restart = useCallback(() => {
    haptics.select();
    setAttempt((count) => count + 1);
    setMarks({});
    setHistory([]);
    setMistakes(new Set());
    setFlagged(false);
    setCrossedOut(new Set());
    setFocusedClue(null);
    setHintsUsed(0);
    setRevealed(false);
    setTab('grid');
    flash('Restarted — same puzzle, fresh board and clock.');
  }, [flash]);

  const reveal = useCallback(() => {
    haptics.warn();
    setRevealed(true);
    setFlagged(false);
    move(() => solvedMarks(puzzle));
  }, [move, puzzle]);

  const toggleClue = useCallback((index: number) => {
    setCrossedOut((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Holding a clue lights up its rows and columns, which are on the other tab —
  // so the hold takes the player there, and the clue rides along in the strip
  // under the board.
  const focusClue = useCallback((index: number) => {
    haptics.select();
    setFocusedClue((current) => (current === index ? null : index));
    setTab('grid');
  }, []);

  const gridsShown = (puzzle.categories.length * (puzzle.categories.length - 1)) / 2;
  const cluesLeft = puzzle.clues.length - crossedOut.size;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space(2) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to setup"
          onPress={onExit}
          style={styles.headerButton}
          hitSlop={12}
        >
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {puzzle.themeEmoji} {puzzle.themeName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {puzzle.size.label} · {puzzle.clues.length} clues · #{puzzle.seed}
          </Text>
        </View>
        <Text style={[styles.timer, { color: puzzle.accent }]}>{formatDuration(seconds)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(filled * 100)}%`, backgroundColor: puzzle.accent },
          ]}
        />
      </View>

      <View style={styles.tabs}>
        <TabButton
          label="Grid"
          accent={puzzle.accent}
          selected={tab === 'grid'}
          onPress={() => setTab('grid')}
        />
        <TabButton
          label="Clues"
          count={cluesLeft}
          accent={puzzle.accent}
          selected={tab === 'clues'}
          onPress={() => setTab('clues')}
        />
        {solved ? (
          <TabButton
            label={revealed ? 'Revealed' : 'Solved'}
            accent={puzzle.accent}
            selected={tab === 'result'}
            onPress={() => setTab('result')}
          />
        ) : null}
      </View>

      <View style={styles.tabBody}>
        {tab === 'grid' ? (
          <View style={styles.fill}>
            <View style={styles.boardHeader}>
              <Text style={styles.cardTitle}>
                {puzzle.categories.length} sets · {gridsShown} grids
              </Text>
              <View style={styles.zoomRow}>
                <ZoomButton
                  label="−"
                  accent={puzzle.accent}
                  disabled={zoom <= 0}
                  onPress={() => setZoom((step) => Math.max(0, step - ZOOM_STEP))}
                />
                <ZoomButton
                  label="+"
                  joined
                  accent={puzzle.accent}
                  disabled={cellSize >= MAX_CELL}
                  onPress={() => setZoom((step) => step + ZOOM_STEP)}
                />
              </View>
            </View>

            <View style={styles.fill} onLayout={measureBoard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.boardScroll}
              >
                {boardArea.width > 0 ? (
                  <GridBoard
                    puzzle={puzzle}
                    marks={marks}
                    mistakes={mistakes}
                    highlight={highlight}
                    cellSize={cellSize}
                    onToggle={toggleCell}
                  />
                ) : null}
              </ScrollView>
            </View>

            {focusedClue === null ? (
              <Text style={styles.cardHint}>
                {solved
                  ? 'The finished board · Restart to play this puzzle again'
                  : 'Tap a square to cycle blank → ✕ → ✓'}
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop lighting up this clue"
                onPress={() => setFocusedClue(null)}
                style={[styles.focusStrip, { borderColor: tint(puzzle.accent, 0.35) }]}
              >
                <Text style={styles.focusText} numberOfLines={2}>
                  {describeClue(puzzle.clues[focusedClue], puzzle)}
                </Text>
                <Text style={[styles.focusClear, { color: puzzle.accent }]}>✕</Text>
              </Pressable>
            )}
          </View>
        ) : tab === 'clues' ? (
          <View style={styles.fill}>
            <Text style={styles.cardTitle}>Clues</Text>
            <Text style={styles.cardSubtitle}>
              Tap to cross one off · hold to light it up on the grid
            </Text>
            <ScrollView
              style={styles.fill}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.clueScroll}
            >
              <ClueList
                puzzle={puzzle}
                crossedOut={crossedOut}
                onToggle={toggleClue}
                onFocus={focusClue}
              />
            </ScrollView>
          </View>
        ) : (
          <SolvedPanel
            title={revealed ? 'Revealed' : 'Solved!'}
            puzzle={puzzle}
            seconds={seconds}
            hintsUsed={hintsUsed}
            improvement={improvement}
            onPlayAgain={onNewPuzzle}
            onChangeSetup={onExit}
            onOpenStats={onOpenStats}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <Text style={styles.status} numberOfLines={2}>
          {status ?? ''}
        </Text>

        {stuck ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rewind to a board that can still be solved"
            onPress={rewind}
            style={({ pressed }) => [styles.rewind, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.rewindText}>
              {wrong.length} mark{wrong.length === 1 ? '' : 's'} cannot be right
            </Text>
            <Text style={styles.rewindAction}>↶ Rewind</Text>
          </Pressable>
        ) : null}

        {/* Nothing on a finished board is left to undo, hint at or eliminate. */}
        {solved ? null : (
          <View style={styles.toolbar}>
            <ToolButton
              label="Undo"
              icon="↶"
              accent={puzzle.accent}
              disabled={history.length === 0}
              onPress={undo}
            />
            <ToolButton label="Hint" icon="💡" joined accent={puzzle.accent} onPress={hint} />
            <ToolButton
              label={autoEliminate ? 'Auto ✕ on' : 'Auto ✕ off'}
              icon="⚡"
              joined
              accent={autoEliminate ? puzzle.accent : palette.inkFaint}
              onPress={() => {
                haptics.select();
                setAutoEliminate((value) => {
                  const next = !value;
                  setMarks((current) =>
                    reconcile(current, { size: puzzle.size.items, autoEliminate: next }),
                  );
                  return next;
                });
              }}
            />
          </View>
        )}

        <View style={styles.footerLinks}>
          <Pressable accessibilityRole="button" onPress={restart} hitSlop={8}>
            <Text style={styles.link}>Restart</Text>
          </Pressable>
          <Text style={styles.linkDivider}>·</Text>
          <Pressable accessibilityRole="button" onPress={onNewPuzzle} hitSlop={8}>
            <Text style={styles.link}>New puzzle</Text>
          </Pressable>
          {solved ? null : (
            <>
              <Text style={styles.linkDivider}>·</Text>
              <Pressable accessibilityRole="button" onPress={reveal} hitSlop={8}>
                <Text style={[styles.link, styles.linkMuted]}>Reveal solution</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function TabButton({
  label,
  count,
  accent,
  selected,
  onPress,
}: {
  label: string;
  /** Shown as a pill beside the label — the clues still to be used. */
  count?: number;
  accent: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={count === undefined ? label : `${label}, ${count} left`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && { borderBottomColor: accent },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.tabLabel, { color: selected ? accent : palette.inkSoft }]}>{label}</Text>
      {count === undefined ? null : (
        <View
          style={[
            styles.tabCount,
            {
              backgroundColor: selected ? tint(accent, 0.12) : palette.surfaceAlt,
              borderColor: selected ? tint(accent, 0.35) : palette.line,
            },
          ]}
        >
          <Text style={[styles.tabCountText, { color: selected ? accent : palette.inkFaint }]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ZoomButton({
  label,
  accent,
  disabled,
  joined,
  onPress,
}: {
  label: string;
  accent: string;
  disabled: boolean;
  /** Share the left-hand edge with the button before it. */
  joined?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Zoom in' : 'Zoom out'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.zoomButton,
        joined && joinLeft,
        { borderColor: tint(accent, 0.4), opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.zoomButtonText, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

function ToolButton({
  label,
  icon,
  accent,
  joined,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: string;
  accent: string;
  /** Share the left-hand edge with the button before it. */
  joined?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        joined && joinLeft,
        {
          borderColor: tint(accent, 0.4),
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      <Text style={[styles.toolLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingBottom: space(3),
    gap: space(3),
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 22,
    lineHeight: 24,
    color: palette.ink,
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.inkFaint,
    marginTop: 1,
  },
  timer: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 3,
    backgroundColor: palette.line,
  },
  progressFill: {
    height: 3,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingVertical: space(3),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabCount: {
    minWidth: 22,
    paddingHorizontal: space(1.5),
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBody: {
    flex: 1,
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(3),
  },
  clueScroll: {
    paddingBottom: space(1),
  },
  boardScroll: {
    // Centred, so a board that fits sits in the middle of the space rather
    // than hanging from the top of it.
    flexGrow: 1,
    justifyContent: 'center',
  },
  zoomRow: {
    flexDirection: 'row',
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  zoomButtonText: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: -2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    color: palette.inkFaint,
    marginTop: space(0.5),
    marginBottom: space(2),
  },
  cardHint: {
    fontSize: 11,
    color: palette.inkFaint,
    marginTop: space(2),
    textAlign: 'center',
  },
  focusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(2),
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceAlt,
  },
  focusText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSoft,
  },
  focusClear: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: space(4),
    paddingTop: space(2),
    gap: space(2),
  },
  rewind: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    paddingVertical: space(2.5),
    paddingHorizontal: space(3),
    borderWidth: border,
    borderColor: palette.danger,
    backgroundColor: tint(palette.danger, 0.08),
  },
  rewindText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: palette.danger,
  },
  rewindAction: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.danger,
  },
  toolbar: {
    flexDirection: 'row',
  },
  tool: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(1.5),
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: space(3),
  },
  toolIcon: {
    fontSize: 13,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  status: {
    minHeight: 32,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space(2),
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.inkSoft,
  },
  linkMuted: {
    color: palette.inkFaint,
  },
  linkDivider: {
    color: palette.inkFaint,
  },
});
