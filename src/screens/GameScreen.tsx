import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BriefingPopup } from '../components/BriefingPopup';
import { CluePopup } from '../components/CluePopup';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  reconcile,
  setMark,
  type Cell,
  type Marks,
} from '../game/board';
import { cluesDone, inventClue, nextClue } from '../game/clues';
import { SAVE_VERSION, SAVED_UNDO, type SavedGame } from '../game/persistence';
import type { Completion, CompletionInput } from '../game/usePersistence';
import { plural, t } from '../i18n';
import { useTimer } from '../game/useTimer';
import { clueAttributes } from '../puzzle/describe';
import type { Attribute, Clue, Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { inkOn, joinLeft, radius, space, tint, type Palette } from '../ui/theme';

/** The two zoom glyphs: signs rather than words, so they are not translated. */
const ZOOM_OUT = '−';
const ZOOM_IN = '+';

/** How much each press of the zoom buttons adds or takes away. */
const ZOOM_STEP = 8;
/** How many moves back the undo button can reach. */
const UNDO_LIMIT = 200;

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
  /** Resolves false when the board could not be written. */
  onSaveProgress: (game: SavedGame) => Promise<boolean>;
  onCompleted: (input: CompletionInput) => Promise<Completion>;
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
  // Whether the clue window is open. It opens on the Clue button and on a new
  // clue arriving, so a clue is always read rather than glanced at.
  const [clueOpen, setClueOpen] = useState(false);
  // The story behind the puzzle, which introduces itself when a game starts and
  // waits behind Info afterwards. A game picked back up does not re-introduce
  // itself: the player was in the middle of it a moment ago.
  const [briefingOpen, setBriefingOpen] = useState(!resumed);
  // The item whose card is open, from a tap on its label in the grid.
  const [inspecting, setInspecting] = useState<Attribute | null>(null);
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  // Every board the player has moved on from, newest last, so a move can be
  // taken back. The last twenty are saved with the game, so a board picked
  // back up can still be stepped back from — and Rewind, which walks this same
  // stack, has somewhere to walk to.
  const [history, setHistory] = useState<Marks[]>(() => resumed?.history ?? []);
  // Set when the clue button finds the board past saving, which opens the
  // window saying so; cleared by either of the two ways out of it.
  const [flagged, setFlagged] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  // Whether the finish made it into the history; null until it has been tried.
  const [recorded, setRecorded] = useState<boolean | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set once the player has been told a save failed, so the line is said once
  // rather than after every move; cleared by a save that lands, so a later
  // failure is news again.
  const warnedNotSaving = useRef(false);

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
  // fits. It is measured against the space the board is actually left, and
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

  // The clues read, oldest first — a Set keeps what went in in the order it went
  // in, which is the order they were handed over.
  const seen = useMemo(() => [...cluesSeen], [cluesSeen]);
  const at = clueIndex === null ? -1 : seen.indexOf(clueIndex);

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
    history: history.slice(-SAVED_UNDO),
    seconds,
    updatedAt: Date.now(),
  });
  const finished = useRef(false);
  finished.current = solved;

  useEffect(() => {
    if (!solved) return;
    feedback.success();
  }, [solved]);

  // Record the finish once, and ask how it compares with earlier games.
  useEffect(() => {
    if (!solved) return;
    let active = true;
    // Nothing reveals a board any more, so a finished one was always solved.
    void onCompleted({ seconds, cluesUsed: cluesSeen.size, revealed: false }).then((result) => {
      if (!active) return;
      setImprovement(result.improvement);
      setRecorded(result.recorded);
    });
    return () => {
      active = false;
    };
    // `seconds` is read at the moment of the win; it must not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  /** Puts a line in the board's status slot for a moment. */
  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 2600);
  }, []);

  // Save the board shortly after every change, so closing the app mid-puzzle
  // loses nothing worth keeping.
  useEffect(() => {
    if (solved) return;
    const timer = setTimeout(() => {
      void onSaveProgress(snapshot.current()).then((landed) => {
        if (landed) {
          warnedNotSaving.current = false;
        } else if (!warnedNotSaving.current) {
          // Said once, in the line the board already keeps for what it has
          // to say, rather than in a window the player has to get past. The
          // game plays on exactly as before; only the promise of picking it
          // back up later has gone.
          warnedNotSaving.current = true;
          flash(t('game.status.notSaving'));
        }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [marks, cluesSeen, clueIndex, extraClues, solved, onSaveProgress, flash]);

  // Backgrounding the app and leaving the screen both save immediately.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !finished.current) void onSaveProgress(snapshot.current());
    });
    return () => {
      subscription.remove();
      if (!finished.current) void onSaveProgress(snapshot.current());
    };
  }, [onSaveProgress]);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

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
        flash(t('game.status.finished'));
        return;
      }
      // Nothing can be worked out from a board nobody has said anything about,
      // so a mark before the first clue would only ever be a guess. The refusal
      // is a buzz and nothing else: the clue panel is already sitting there
      // saying to tap Clue for the first one, and a line repeating it is a
      // second answer to a question the player can already see answered.
      if (!started) {
        feedback.warn();
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
      flash(t('game.status.nothingToUndo'));
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
      flash(plural('game.status.rewound', steps, { steps }));
      return;
    }
    // Nothing recorded is clean — a resumed board carries only its last twenty
    // moves, and a mistake can be older than that. Take the bad marks off.
    setMarks((current) => clearMistakes(current, puzzle, boardOptions));
    flash(t('game.status.clearedMistakes'));
  }, [boardOptions, flash, history, puzzle]);

  /**
   * Puts the next clue on the table.
   *
   * The board is checked first: a clue read on top of a mark that contradicts
   * the answer is a clue spent on a puzzle the player can no longer solve. That
   * stops the game rather than passing through it, so it opens a window saying
   * what is wrong and offering to wind it back, instead of handing a clue over.
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
      // The window that says so is the only thing worth looking at, and the
      // marks it is about are on the board behind it.
      setClueOpen(false);
      return;
    }
    setFlagged(false);

    const index = nextClue(clueIndex, spent, inPlay.clues.length);
    if (index === null || index === clueIndex) {
      // Nothing else left to hand over: every clue is used up, or the only one
      // still worth reading is the one already on the table. A puzzle carries
      // the smallest set of clues that cracks it, so that is not the end of
      // what can be said about it — write another and carry on. The player is
      // not told any of this: a clue written on the spot is a clue like the
      // others, and where it came from is bookkeeping.
      const invented = inventClue(inPlay, marks, extraClues.length);
      if (!invented) {
        // Nothing left that has not already been said. The refusal is a buzz,
        // not a line: a board with everything on it is a board the player can
        // see, and being told so is being told to look harder.
        feedback.warn();
        return;
      }
      feedback.tap();
      const next = inPlay.clues.length;
      setExtraClues((extras) => [...extras, invented]);
      setClueIndex(next);
      setCluesSeen((read) => new Set(read).add(next));
      setClueOpen(true);
      return;
    }
    feedback.tap();
    setClueIndex(index);
    setCluesSeen((read) => (read.has(index) ? read : new Set(read).add(index)));
    setClueOpen(true);
  }, [clueIndex, extraClues.length, flash, inPlay, marks, spent, wrong]);

  /**
   * Back through the clues already read. Free, because being reminded what you
   * were told is not being told anything.
   */
  const previousClue = useCallback(() => {
    if (at <= 0) return;
    feedback.tap();
    setClueIndex(seen[at - 1]);
  }, [at, seen]);

  /**
   * On through them, and past the end of them for a new one — which is the same
   * press the Clue button makes, and costs the same.
   */
  const forwardClue = useCallback(() => {
    if (at >= 0 && at < seen.length - 1) {
      feedback.tap();
      setClueIndex(seen[at + 1]);
      return;
    }
    showNextClue();
  }, [at, seen, showNextClue]);

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
    setClueOpen(false);
    flash(t('game.status.restarted'));
  }, [flash]);

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
          accessibilityLabel={t('game.menu')}
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
            {t('game.seed', { seed: puzzle.seed })}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {solved ? (
          <SolvedPanel
            title={t('solved.title')}
            puzzle={puzzle}
            seconds={seconds}
            cluesUsed={cluesSeen.size}
            improvement={improvement}
            notice={recorded === false ? t('solved.notRecorded') : null}
          />
        ) : (
          <View style={styles.fill}>
            {/* Above the board, on the right: the zoom pair, with whatever the
                app has to say in the room it leaves beside it. A message that
                shows for two seconds should not hold a band of screen open for
                the rest of the game, and a board that resized every time one
                arrived would be worse than either. */}
            <View style={styles.zoomRow}>
              <Text style={styles.status} numberOfLines={2}>
                {status ?? ''}
              </Text>
              <View style={styles.zoomPair}>
                <ZoomButton
                  label={ZOOM_OUT}
                  accent={palette.accent}
                  disabled={zoom <= 0}
                  onPress={() => setZoom((step) => Math.max(0, step - ZOOM_STEP))}
                />
                <ZoomButton
                  label={ZOOM_IN}
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
          </View>
        )}
      </View>

      <ItemCard
        puzzle={inPlay}
        showing={inspecting}
        onShow={setInspecting}
        onClose={() => setInspecting(null)}
      />

      <View style={styles.footer}>
        {/* What the board is worked with: taking a mark back and reading a clue
            on the left, and on the right the one that lights the clue up on the
            grids it talks about. Nothing on a finished board is left to undo,
            hint at, light up or be told the reason for, so the row goes with
            it. */}
        {solved ? null : (
          <View style={styles.play}>
            <View style={styles.tools}>
              <ToolButton
                label={t('game.undo')}
                accent={palette.accent}
                disabled={history.length === 0}
                onPress={undo}
              />
              <ToolButton
                label={t('game.clue')}
                accent={palette.accent}
                onPress={() => {
                  // A clue already read opens where it was left; the first press
                  // of the game has nothing to open, so it asks for one.
                  feedback.tap();
                  if (clueIndex === null) showNextClue();
                  else setClueOpen(true);
                }}
              />
            </View>
            <View style={styles.tools}>
              <ToolButton
                label={t('game.info')}
                accent={palette.accent}
                onPress={() => {
                  feedback.tap();
                  setBriefingOpen(true);
                }}
              />
              <ToolButton
                label={t('game.highlight')}
                accent={palette.accent}
                active={lit}
                disabled={clueIndex === null}
                onPress={() => {
                  feedback.tap();
                  setLit((on) => !on);
                }}
              />
            </View>
          </View>
        )}
      </View>

      <BriefingPopup
        visible={briefingOpen && !solved}
        puzzle={puzzle}
        onClose={() => setBriefingOpen(false)}
      />

      <CluePopup
        visible={clueOpen && !solved}
        puzzle={inPlay}
        index={clueIndex}
        position={at + 1}
        total={seen.length}
        previousDisabled={at <= 0}
        onPrevious={previousClue}
        onNext={forwardClue}
        onClose={() => setClueOpen(false)}
      />

      <BackLink label={t('game.back')} onPress={onExit} />

      {/* What the clue button found, in a window rather than a line: a board
          the answer cannot be reached from is the one thing worth stopping the
          game for, and the two ways on from it are the window's two buttons. */}
      <ConfirmDialog
        visible={stuck}
        title={t('game.stuck.title')}
        message={plural('game.stuck.body', wrong.length)}
        confirmLabel={t('game.stuck.rewind')}
        cancelLabel={t('game.stuck.leaveIt')}
        onConfirm={() => {
          setFlagged(false);
          rewind();
        }}
        onCancel={() => setFlagged(false)}
      />
    </View>
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
      accessibilityLabel={label === ZOOM_IN ? t('game.zoomIn') : t('game.zoomOut')}
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
/**
 * One of the words the board is worked with.
 *
 * `active` is for the one that is a switch rather than an action: it fills with
 * the colour instead of outlining it, so a glance says whether the highlight is
 * on without having to look at the board to find out.
 */
function ToolButton({
  label,
  accent,
  disabled = false,
  active = false,
  onPress,
}: {
  label: string;
  accent: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        {
          borderColor: active ? accent : tint(accent, 0.4),
          backgroundColor: active ? accent : palette.surface,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.toolLabel,
          { color: active ? inkOn(accent, '#FFFFFF', palette.ink) : accent },
        ]}
      >
        {label}
      </Text>
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
      // A glyph rather than a boxed button: the burger is a way out of the
      // board, the same as the `◀ Back` at the foot of every other screen, and
      // that one wears no chrome either. It keeps a button's worth of height so
      // it is still comfortable to hit, and sits flush with the left margin the
      // title and the seed line up on.
      height: 34,
      alignItems: 'flex-start',
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
    body: {
      flex: 1,
      paddingHorizontal: space(4),
      paddingTop: space(3),
    },
    boardScroll: {
      // Centred, so a board that fits sits in the middle of the space rather
      // than hanging from the top of it.
      flexGrow: 1,
      justifyContent: 'center',
    },
    zoomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // Under the board: whatever the app is saying on the left, the zoom pair
      // on the right-hand end.
      gap: space(3),
      marginTop: space(2),
    },
    zoomPair: {
      // The two share an edge, so they are a pair rather than two buttons that
      // happen to be near each other. Their own row, since the line they sit on
      // spaces what it holds.
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
    footer: {
      paddingHorizontal: space(4),
      paddingTop: space(2),
      // The clue and its two buttons run straight into the `◀ Back` under
      // them; what used to sit between was an empty status line, and the space
      // it held open is board now.
    },
    play: {
      flexDirection: 'row',
      alignItems: 'center',
      // The two that work the clue at one end, the one that lights it at the
      // other, and the board's own width between them.
      justifyContent: 'space-between',
      gap: space(2),
    },
    tools: {
      flexDirection: 'row',
      gap: space(2),
    },
    tool: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(2.5),
      paddingHorizontal: space(4),
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    toolLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
    status: {
      flex: 1,
      fontSize: 13,
      color: palette.inkSoft,
    },
  });
