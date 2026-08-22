import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClueList } from '../components/ClueList';
import { GridBoard } from '../components/GridBoard';
import { SolutionTable } from '../components/SolutionTable';
import { WinOverlay } from '../components/WinOverlay';
import {
  findHint,
  findMistakes,
  getMark,
  isSolved,
  nextMark,
  progress,
  setMark,
  solvedMarks,
  type Cell,
  type Marks,
} from '../game/board';
import { SAVE_VERSION, type SavedGame } from '../game/persistence';
import type { CompletionInput } from '../game/usePersistence';
import { formatDuration, useTimer } from '../game/useTimer';
import { clueAttributes } from '../puzzle/describe';
import type { Attribute, Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { palette, radius, shadow, space, tint } from '../ui/theme';

/** The smallest cell worth tapping, and the steps the zoom buttons take. */
const MIN_CELL = 18;
const MAX_CELL = 46;
const ZOOM_STEP = 8;
/** Width the set strip and row labels take on the left of the board. */
const BOARD_LABELS = 90;

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
  const { width } = useWindowDimensions();
  const resumed = restore?.puzzle.seed === puzzle.seed ? restore : null;

  // Bumped by "Restart": the puzzle stays exactly as it is — same seed, same
  // theme, sets and items — while the board and the clock start over.
  const [attempt, setAttempt] = useState(0);
  const [marks, setMarks] = useState<Marks>(() => resumed?.marks ?? {});
  const [focusedClue, setFocusedClue] = useState<number | null>(null);
  const [crossedOut, setCrossedOut] = useState<Set<number>>(
    () => new Set(resumed?.crossedOut ?? []),
  );
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [autoEliminate, setAutoEliminate] = useState(true);
  const [hintsUsed, setHintsUsed] = useState(() => resumed?.hintsUsed ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved = useMemo(() => isSolved(marks, puzzle), [marks, puzzle]);
  const filled = useMemo(() => progress(marks, puzzle), [marks, puzzle]);
  const seconds = useTimer(
    !solved,
    `${puzzle.seed}:${attempt}`,
    attempt === 0 ? (resumed?.seconds ?? 0) : 0,
  );

  // The whole staircase is drawn at once, so the cell size decides whether it
  // fits the screen. Start at the size that shows all of it, and let the player
  // zoom in from there; anything wider than the screen scrolls sideways.
  const fitCell = useMemo(() => {
    const columns = puzzle.size.items * (puzzle.categories.length - 1);
    const available = width - space(8) - space(6) - BOARD_LABELS;
    // Each block carries a small gap to its neighbour.
    const gaps = (puzzle.categories.length - 2) * space(1);
    return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((available - gaps) / columns)));
  }, [puzzle, width]);
  const [cellSize, setCellSize] = useState(fitCell);

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
    if (solved) haptics.success();
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

  useEffect(() => () => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
  }, []);

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 2600);
  }, []);

  const toggleCell = useCallback(
    (cell: Cell) => {
      haptics.tap();
      setMistakes(new Set());
      setMarks((current) =>
        setMark(current, cell, nextMark(getMark(current, cell)), {
          autoEliminate,
          size: puzzle.size.items,
        }),
      );
    },
    [autoEliminate, puzzle.size.items],
  );

  const check = useCallback(() => {
    const found = findMistakes(marks, puzzle);
    setMistakes(new Set(found));
    if (found.length === 0) {
      haptics.tap();
      flash('Everything you have marked so far is right.');
    } else {
      haptics.warn();
      flash(`${found.length} mark${found.length === 1 ? '' : 's'} contradict the clues.`);
    }
  }, [flash, marks, puzzle]);

  const hint = useCallback(() => {
    const cell = findHint(marks, puzzle, (max) => Math.floor(Math.random() * max));
    if (!cell) {
      flash('Nothing left to reveal.');
      return;
    }
    haptics.select();
    setHintsUsed((count) => count + 1);
    setMarks((current) => setMark(current, cell, 'yes', { autoEliminate: true, size: puzzle.size.items }));
    flash(
      `Hint: ${puzzle.categories[cell.c1].items[cell.i1].label} goes with ${puzzle.categories[cell.c2].items[cell.i2].label}.`,
    );
  }, [flash, marks, puzzle]);

  const restart = useCallback(() => {
    haptics.select();
    setAttempt((count) => count + 1);
    setMarks({});
    setMistakes(new Set());
    setCrossedOut(new Set());
    setFocusedClue(null);
    setHintsUsed(0);
    setRevealed(false);
    flash('Restarted — same puzzle, fresh board and clock.');
  }, [flash]);

  const reveal = useCallback(() => {
    haptics.warn();
    setRevealed(true);
    setMistakes(new Set());
    setMarks(solvedMarks(puzzle));
  }, [puzzle]);

  const toggleClue = useCallback((index: number) => {
    setCrossedOut((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const focusClue = useCallback((index: number) => {
    haptics.select();
    setFocusedClue((current) => (current === index ? null : index));
  }, []);

  const gridsShown = (puzzle.categories.length * (puzzle.categories.length - 1)) / 2;
  const leadCategory = puzzle.categories[0].name.toLowerCase();

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
          <Text style={styles.headerSubtitle}>
            {puzzle.size.label} · {puzzle.clues.length} clues
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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(10) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadow.card]}>
          <View style={styles.boardHeader}>
            <Text style={styles.cardTitle}>
              {puzzle.categories.length} sets · {gridsShown} grids
            </Text>
            <View style={styles.zoomRow}>
              <ZoomButton
                label="−"
                accent={puzzle.accent}
                disabled={cellSize <= fitCell}
                onPress={() => setCellSize((size) => Math.max(fitCell, size - ZOOM_STEP))}
              />
              <ZoomButton
                label="+"
                accent={puzzle.accent}
                disabled={cellSize >= MAX_CELL}
                onPress={() => setCellSize((size) => Math.min(MAX_CELL, size + ZOOM_STEP))}
              />
            </View>
          </View>

          <GridBoard
            puzzle={puzzle}
            marks={marks}
            mistakes={mistakes}
            highlight={highlight}
            cellSize={cellSize}
            onToggle={toggleCell}
          />
          <Text style={styles.cardHint}>
            Tap a square to cycle blank → ✓ → ✕ · swipe the board sideways for the rest
          </Text>
        </View>

        <View style={styles.toolbar}>
          <ToolButton label="Check" icon="✓" accent={puzzle.accent} onPress={check} />
          <ToolButton label="Hint" icon="💡" accent={puzzle.accent} onPress={hint} />
          <ToolButton
            label={autoEliminate ? 'Auto ✕ on' : 'Auto ✕ off'}
            icon="⚡"
            accent={autoEliminate ? puzzle.accent : palette.inkFaint}
            onPress={() => {
              haptics.select();
              setAutoEliminate((value) => !value);
            }}
          />
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <View style={[styles.card, shadow.card]}>
          <Text style={styles.cardTitle}>Clues</Text>
          <Text style={styles.cardSubtitle}>
            Tap to cross one off · hold to light it up on the board
          </Text>
          <ClueList
            puzzle={puzzle}
            crossedOut={crossedOut}
            onToggle={toggleClue}
            onFocus={focusClue}
          />
        </View>

        {solved ? (
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>The answer</Text>
            <Text style={styles.cardSubtitle}>One row per {leadCategory}</Text>
            <SolutionTable puzzle={puzzle} />
          </View>
        ) : null}

        <View style={styles.footerLinks}>
          <Pressable accessibilityRole="button" onPress={restart} hitSlop={8}>
            <Text style={styles.link}>Restart</Text>
          </Pressable>
          <Text style={styles.linkDivider}>·</Text>
          <Pressable accessibilityRole="button" onPress={onNewPuzzle} hitSlop={8}>
            <Text style={styles.link}>New puzzle</Text>
          </Pressable>
          <Text style={styles.linkDivider}>·</Text>
          <Pressable accessibilityRole="button" onPress={reveal} hitSlop={8}>
            <Text style={[styles.link, styles.linkMuted]}>Reveal solution</Text>
          </Pressable>
        </View>

        <Text style={styles.seed}>Puzzle seed #{puzzle.seed}</Text>
      </ScrollView>

      <WinOverlay
        visible={solved}
        title={revealed ? 'Revealed' : 'Solved!'}
        puzzle={puzzle}
        seconds={seconds}
        hintsUsed={hintsUsed}
        improvement={improvement}
        onPlayAgain={onNewPuzzle}
        onChangeSetup={onExit}
        onOpenStats={onOpenStats}
      />
    </View>
  );
}

function ZoomButton({
  label,
  accent,
  disabled,
  onPress,
}: {
  label: string;
  accent: string;
  disabled: boolean;
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
  onPress,
}: {
  label: string;
  icon: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        { borderColor: tint(accent, 0.4), opacity: pressed ? 0.75 : 1 },
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
  content: {
    paddingHorizontal: space(4),
    paddingTop: space(4),
    gap: space(4),
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(3),
  },
  zoomRow: {
    flexDirection: 'row',
    gap: space(2),
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
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    padding: space(3),
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
    marginTop: space(3),
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    gap: space(2),
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
  seed: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.inkFaint,
  },
});
