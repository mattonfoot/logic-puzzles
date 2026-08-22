import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClueList } from '../components/ClueList';
import { PairGrid } from '../components/PairGrid';
import { WinOverlay } from '../components/WinOverlay';
import {
  categoryPairs,
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
import { cluePrimaryPair } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { palette, radius, shadow, space, tint } from '../ui/theme';

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
  const pairs = useMemo(() => categoryPairs(puzzle.categories.length), [puzzle]);
  const resumed = restore?.puzzle.seed === puzzle.seed ? restore : null;

  const [marks, setMarks] = useState<Marks>(() => resumed?.marks ?? {});
  const [activePair, setActivePair] = useState(() => resumed?.activePair ?? 0);
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
  const seconds = useTimer(!solved, puzzle.seed, resumed?.seconds ?? 0);

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
    activePair,
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
  }, [marks, crossedOut, hintsUsed, activePair, solved, onSaveProgress]);

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
    const index = pairs.findIndex(([c1, c2]) => c1 === cell.c1 && c2 === cell.c2);
    if (index >= 0) setActivePair(index);
    flash('Hint placed on the grid.');
  }, [flash, marks, pairs, puzzle]);

  const restart = useCallback(() => {
    haptics.select();
    setMarks({});
    setMistakes(new Set());
    setCrossedOut(new Set());
    setHintsUsed(0);
    setRevealed(false);
    flash('Board cleared.');
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

  const focusClue = useCallback(
    (index: number) => {
      const pair = cluePrimaryPair(puzzle.clues[index]);
      if (!pair) return;
      const target = pairs.findIndex(([c1, c2]) => c1 === pair[0] && c2 === pair[1]);
      if (target >= 0) {
        haptics.select();
        setActivePair(target);
      }
    },
    [pairs, puzzle.clues],
  );

  const [rowCategory, columnCategory] = pairs[activePair] ?? pairs[0];

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
            {puzzle.size.description} · {puzzle.size.grids} grids · {puzzle.clues.length} clues
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {pairs.map(([c1, c2], index) => {
            const selected = index === activePair;
            return (
              <Pressable
                key={`${c1}-${c2}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  setActivePair(index);
                }}
                style={[
                  styles.tab,
                  {
                    backgroundColor: selected ? tint(puzzle.accent, 0.14) : palette.surface,
                    borderColor: selected ? puzzle.accent : palette.line,
                  },
                ]}
              >
                <Text style={[styles.tabText, selected && { color: puzzle.accent }]}>
                  {puzzle.categories[c1].name} × {puzzle.categories[c2].name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.card, shadow.card]}>
          <PairGrid
            puzzle={puzzle}
            pair={[rowCategory, columnCategory]}
            marks={marks}
            mistakes={mistakes}
            onToggle={toggleCell}
          />
          <Text style={styles.cardHint}>Tap a square to cycle blank → ✓ → ✕.</Text>
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
            Tap to cross one off · hold to jump to its grid
          </Text>
          <ClueList
            puzzle={puzzle}
            crossedOut={crossedOut}
            onToggle={toggleClue}
            onFocus={focusClue}
          />
        </View>

        <View style={styles.footerLinks}>
          <Pressable accessibilityRole="button" onPress={restart} hitSlop={8}>
            <Text style={styles.link}>Clear board</Text>
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

        <Text style={styles.seed}>Seed #{puzzle.seed}</Text>
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
  tabs: {
    gap: space(2),
    paddingRight: space(4),
  },
  tab: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.inkSoft,
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
