import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClueCard } from '../components/ClueCard';
import { fitCellSize, GridBoard, MAX_CELL } from '../components/GridBoard';
import { ItemCard } from '../components/ItemCard';
import { SolvedPanel } from '../components/SolvedPanel';
import { GameMenuScreen } from './GameMenuScreen';
import {
  clearMistakes,
  findMistakes,
  getMark,
  isSolvable,
  isSolved,
  nextMark,
  progress,
  reconcile,
  setMark,
  type Cell,
  type Marks,
} from '../game/board';
import { cluesDone, inventClue, nextClue } from '../game/clues';
import { SAVE_VERSION, type SavedGame } from '../game/persistence';
import type { CompletionInput } from '../game/usePersistence';
import { useTimer } from '../game/useTimer';
import { clueAttributes } from '../puzzle/describe';
import type { Attribute, Clue, Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, joinLeft, radius, space, tint, type Palette } from '../ui/theme';

/** How much each press of the zoom buttons adds or takes away. */
const ZOOM_STEP = 8;
/** How many moves back the undo button can reach. */
const UNDO_LIMIT = 200;

type Tab = 'grid' | 'result';

interface Props {
  puzzle: Puzzle;
  /** The player's board settings, which live outside any one game. */
  autoEliminate: boolean;
  autoFacts: boolean;
  /** The colour the app is drawn in — the player's, reachable from the menu. */
  accent: string;
  onToggleAutoEliminate: () => void;
  onToggleAutoFacts: () => void;
  onChangeAccent: (accent: string) => void;
  /** Board to start from when the player is picking a game back up. */
  restore?: SavedGame | null;
  onExit: () => void;
  onSaveProgress: (game: SavedGame) => void;
  onCompleted: (input: CompletionInput) => Promise<Improvement>;
}

/**
 * The board itself. App mounts one per puzzle (keyed by seed), so the initial
 * state can come straight from a resumed game.
 *
 * Nothing on the screen scrolls: the board opens at the size that fits the
 * space it is given, and the clue being worked on sits under it. Clues arrive
 * one at a time from the button rather than as a list to read down, which is
 * what makes reading one a decision worth counting.
 */
export function GameScreen({
  puzzle,
  autoEliminate,
  autoFacts,
  accent,
  onToggleAutoEliminate,
  onToggleAutoFacts,
  onChangeAccent,
  restore,
  onExit,
  onSaveProgress,
  onCompleted,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const resumed = restore?.puzzle.seed === puzzle.seed ? restore : null;

  // Bumped by "Restart": the puzzle stays exactly as it is — same seed, same
  // theme, sets and items — while the board and the clock start over.
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('grid');
  const [menuOpen, setMenuOpen] = useState(false);
  const [marks, setMarks] = useState<Marks>(() => resumed?.marks ?? {});
  // The clue on the table, and every clue the player has asked to see. Reading
  // one is the cost of a hint here, so the set is what the statistics count.
  const [clueIndex, setClueIndex] = useState<number | null>(() => resumed?.clueIndex ?? null);
  const [cluesSeen, setCluesSeen] = useState<Set<number>>(() => new Set(resumed?.cluesSeen ?? []));
  // Clues written for this game after the puzzle's own ran out. They are saved
  // with the board, so a resumed game keeps the ones it was given.
  const [extraClues, setExtraClues] = useState<Clue[]>([]);
  const [lit, setLit] = useState(false);
  // The item whose card is open, from a tap on its label in the grid.
  const [inspecting, setInspecting] = useState<Attribute | null>(null);
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  // Every board the player has moved on from, newest last, so a move can be
  // taken back. It lives for the session only — a resumed game starts fresh.
  const [history, setHistory] = useState<Marks[]>([]);
  // Set when a hint finds the board past saving; cleared as soon as it is not.
  const [flagged, setFlagged] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** What the board works out for itself, as the settings currently stand. */
  const boardOptions = useMemo(
    () => ({ size: puzzle.size.items, autoEliminate, autoFacts }),
    [autoEliminate, autoFacts, puzzle.size.items],
  );

  /** The puzzle plus whatever clues have been written for this game. */
  const inPlay = useMemo(
    () =>
      extraClues.length === 0 ? puzzle : { ...puzzle, clues: [...puzzle.clues, ...extraClues] },
    [extraClues, puzzle],
  );

  const solved = useMemo(() => isSolved(marks, puzzle), [marks, puzzle]);
  // Which clues the board has caught up with. A clue is spent when every mark
  // it calls for is down, whoever worked it out.
  const spent = useMemo(() => cluesDone(marks, inPlay), [marks, inPlay]);
  const wrong = useMemo(() => findMistakes(marks, puzzle), [marks, puzzle]);
  const stuck = flagged && wrong.length > 0;
  const filled = useMemo(() => progress(marks, puzzle), [marks, puzzle]);
  // The clock starts when the player asks for their first clue, not when the
  // board appears: with nothing to go on there is nothing to solve, so time
  // spent reading the sets or picking the game back up is not part of it. It is
  // not shown while playing — a clock counting up is a thing to watch rather
  // than a thing to use — but it is kept, saved, and read out at the finish.
  const started = cluesSeen.size > 0;
  const seconds = useTimer(
    started && !solved,
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

  // The settings can change from the menu or from the settings screen, so the
  // board is brought back in line with them whenever they move rather than at
  // the moment of the tap.
  const applied = useRef(boardOptions);
  useEffect(() => {
    if (applied.current === boardOptions) return;
    applied.current = boardOptions;
    setMarks((current) => reconcile(current, boardOptions));
  }, [boardOptions]);

  const highlight = useMemo<Attribute[]>(
    () => (lit && clueIndex !== null ? clueAttributes(inPlay.clues[clueIndex]) : []),
    [clueIndex, inPlay.clues, lit],
  );

  // A snapshot of the board that the autosave paths can read without having to
  // re-subscribe every time the clock ticks.
  const snapshot = useRef<() => SavedGame>(() => ({}) as SavedGame);
  snapshot.current = () => ({
    version: SAVE_VERSION,
    // Written clues ride along inside the puzzle, so picking the game back up
    // brings them with it.
    puzzle: inPlay,
    marks,
    cluesSeen: [...cluesSeen],
    clueIndex,
    seconds,
    updatedAt: Date.now(),
  });
  const finished = useRef(false);
  finished.current = solved;

  useEffect(() => {
    if (!solved) return;
    feedback.success();
    // The finish is the news, so show it — the grid stays a tab away.
    setTab('result');
  }, [solved]);

  // Record the finish once, and ask how it compares with earlier games.
  useEffect(() => {
    if (!solved) return;
    let active = true;
    // Nothing reveals a board any more, so a finished one was always solved.
    void onCompleted({ seconds, cluesUsed: cluesSeen.size, revealed: false }).then((result) => {
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
  }, [marks, cluesSeen, clueIndex, extraClues, solved, onSaveProgress]);

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
      // Nothing can be worked out from a board nobody has said anything about,
      // so a mark before the first clue would only ever be a guess.
      if (!started) {
        feedback.warn();
        flash('Read a clue first — there is nothing to go on yet.');
        return;
      }
      feedback.mark();
      // The cycle follows what the square shows, so an automatic cross behaves
      // like any other: blank → ✕ → ✓ → blank. Whatever it lands on is the
      // player's own mark from then on.
      move((current) => setMark(current, cell, nextMark(getMark(current, cell)), boardOptions));
    },
    [boardOptions, flash, move, started],
  );

  const undo = useCallback(() => {
    if (history.length === 0) {
      flash('Nothing to undo.');
      return;
    }
    feedback.tap();
    setMistakes(new Set());
    setHistory((past) => past.slice(0, -1));
    // Reconciled on the way back in, so a board recorded while Auto ✕ was on
    // comes back the way the setting stands now.
    setMarks(reconcile(history[history.length - 1], boardOptions));
  }, [boardOptions, flash, history]);

  /** Takes moves back until the answer is within reach again. */
  const rewind = useCallback(() => {
    feedback.tap();
    let past = history;
    let board: Marks | null = null;
    let steps = 0;

    while (past.length > 0) {
      const candidate = reconcile(past[past.length - 1], boardOptions);
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
    setMarks((current) => clearMistakes(current, puzzle, boardOptions));
    flash('Took off the marks that cannot be right.');
  }, [boardOptions, flash, history, puzzle]);

  /**
   * Puts the next clue on the table.
   *
   * The board is checked first: a clue read on top of a mark that contradicts
   * the answer is a clue spent on a puzzle the player can no longer solve, so
   * say so and offer to wind it back instead of handing one over.
   *
   * The clue that comes up is the next one with something left to say, wrapping
   * round to the start — so a clue passed over early comes back later, once the
   * board has enough on it for the clue to bite.
   */
  const showNextClue = useCallback(() => {
    if (wrong.length > 0) {
      feedback.warn();
      setMistakes(new Set(wrong));
      setFlagged(true);
      // The marks are on the board, so that is where the answer is.
      setTab('grid');
      flash('A clue cannot help from here — the answer is out of reach.');
      return;
    }
    setFlagged(false);

    const index = nextClue(clueIndex, spent, inPlay.clues.length);
    if (index === null || index === clueIndex) {
      // Nothing else left to hand over: every clue is used up, or the only one
      // still worth reading is the one already on the table. A puzzle carries
      // the smallest set of clues that cracks it, so that is not the end of
      // what can be said about it — write another and carry on.
      const invented = inventClue(inPlay, marks, extraClues.length);
      if (!invented) {
        flash('Nothing left to say — it is all on the board.');
        return;
      }
      feedback.tap();
      const at = inPlay.clues.length;
      setExtraClues((extras) => [...extras, invented]);
      setClueIndex(at);
      setCluesSeen((seen) => new Set(seen).add(at));
      setTab('grid');
      flash('The clues ran out, so here is a new one.');
      return;
    }
    feedback.tap();
    setTab('grid');
    setClueIndex(index);
    setCluesSeen((seen) => (seen.has(index) ? seen : new Set(seen).add(index)));
  }, [clueIndex, extraClues.length, flash, inPlay, marks, spent, wrong]);

  const restart = useCallback(() => {
    feedback.tap();
    setAttempt((count) => count + 1);
    setMarks({});
    setHistory([]);
    setMistakes(new Set());
    setFlagged(false);
    setClueIndex(null);
    setCluesSeen(new Set());
    setExtraClues([]);
    setLit(false);
    setTab('grid');
    flash('Restarted — same puzzle, fresh board and clock.');
  }, [flash]);

  const gridsShown = (puzzle.categories.length * (puzzle.categories.length - 1)) / 2;

  if (menuOpen) {
    return (
      <GameMenuScreen
        puzzle={puzzle}
        autoEliminate={autoEliminate}
        autoFacts={autoFacts}
        accent={accent}
        onChangeAccent={onChangeAccent}
        onToggleAutoEliminate={onToggleAutoEliminate}
        onToggleAutoFacts={onToggleAutoFacts}
        onRestart={() => {
          restart();
          setMenuOpen(false);
        }}
        onClose={() => setMenuOpen(false)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space(4) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menu"
          onPress={() => {
            feedback.tap();
            setMenuOpen(true);
          }}
          style={styles.headerButton}
          hitSlop={12}
        >
          <Text style={styles.headerButtonText}>☰</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <RuledTitle>{puzzle.themeName}</RuledTitle>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            #{puzzle.seed}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(filled * 100)}%`, backgroundColor: palette.accent },
          ]}
        />
      </View>

      {solved ? (
        <View style={styles.tabs}>
          <TabButton
            label="Grid"
            accent={palette.accent}
            selected={tab === 'grid'}
            onPress={() => setTab('grid')}
          />
          <TabButton
            label="Solved"
            accent={palette.accent}
            selected={tab === 'result'}
            onPress={() => setTab('result')}
          />
        </View>
      ) : null}

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
                  accent={palette.accent}
                  disabled={zoom <= 0}
                  onPress={() => setZoom((step) => Math.max(0, step - ZOOM_STEP))}
                />
                <ZoomButton
                  label="+"
                  joined
                  accent={palette.accent}
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
                    onInspect={(attr) => {
                      feedback.tap();
                      setInspecting(attr);
                    }}
                  />
                ) : null}
              </ScrollView>
            </View>

            <Text style={styles.cardHint}>
              {solved
                ? 'The finished board · Restart to play this puzzle again'
                : started
                  ? 'Tap a square to cycle blank → ✕ → ✓'
                  : 'Read a clue to start marking the board'}
            </Text>
          </View>
        ) : (
          <SolvedPanel
            title="Solved!"
            puzzle={puzzle}
            seconds={seconds}
            cluesUsed={cluesSeen.size}
            improvement={improvement}
          />
        )}
      </View>

      <ItemCard puzzle={inPlay} showing={inspecting} onClose={() => setInspecting(null)} />

      <View style={styles.footer}>
        {/* The clue in play, with the two buttons that work it stacked beside
            it: read it, mark what it says, take the next one. Nothing on a
            finished board is left to undo or hint at, so the row goes with it. */}
        {solved ? null : (
          <View style={styles.play}>
            <View style={styles.tools}>
              <ToolButton
                label="Undo"
                accent={palette.accent}
                disabled={history.length === 0}
                onPress={undo}
              />
              <ToolButton label="Clue" accent={palette.accent} onPress={showNextClue} />
            </View>
            <ClueCard
              puzzle={inPlay}
              index={clueIndex}
              done={clueIndex !== null && spent.has(clueIndex)}
              lit={lit}
              onPress={() => {
                feedback.tap();
                setLit((on) => !on);
                setTab('grid');
              }}
            />
          </View>
        )}

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
      </View>

      <BackLink label="Back to setup" onPress={onExit} />
    </View>
  );
}

function TabButton({
  label,
  accent,
  selected,
  onPress,
}: {
  label: string;
  accent: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && { borderBottomColor: accent },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.tabLabel, { color: selected ? accent : palette.inkSoft }]}>{label}</Text>
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
  const styles = useStyles(makeStyles);
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

/** One of the two words beside the clue. */
function ToolButton({
  label,
  accent,
  disabled = false,
  onPress,
}: {
  label: string;
  accent: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        {
          borderColor: tint(accent, 0.4),
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.toolLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    fill: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      // The burger sits with the title rather than with the line under it.
      alignItems: 'flex-start',
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
    headerSubtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(1.5),
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
    cardHint: {
      fontSize: 11,
      color: palette.inkFaint,
      marginTop: space(2),
      textAlign: 'center',
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
    play: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space(2),
    },
    tools: {
      // Two words, one above the other, as tall between them as the clue they
      // work on is beside them.
      width: 88,
      gap: space(2),
    },
    tool: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    toolLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
    status: {
      minHeight: 32,
      fontSize: 13,
      color: palette.inkSoft,
      textAlign: 'center',
    },
  });
