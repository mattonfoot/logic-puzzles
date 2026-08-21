import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { formatDuration, useTimer } from '../game/useTimer';
import { cluePrimaryPair } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { haptics } from '../ui/haptics';
import { palette, radius, shadow, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  onExit: () => void;
  onNewPuzzle: () => void;
}

export function GameScreen({ puzzle, onExit, onNewPuzzle }: Props) {
  const insets = useSafeAreaInsets();
  const pairs = useMemo(() => categoryPairs(puzzle.categories.length), [puzzle]);

  const [marks, setMarks] = useState<Marks>({});
  const [activePair, setActivePair] = useState(0);
  const [crossedOut, setCrossedOut] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [autoEliminate, setAutoEliminate] = useState(true);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved = useMemo(() => isSolved(marks, puzzle), [marks, puzzle]);
  const filled = useMemo(() => progress(marks, puzzle), [marks, puzzle]);
  const seconds = useTimer(!solved, puzzle.seed);

  // Reset the board whenever a different puzzle arrives.
  useEffect(() => {
    setMarks({});
    setActivePair(0);
    setCrossedOut(new Set());
    setMistakes(new Set());
    setStatus(null);
    setHintsUsed(0);
    setRevealed(false);
  }, [puzzle.seed]);

  useEffect(() => {
    if (solved) haptics.success();
  }, [solved]);

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
        onPlayAgain={onNewPuzzle}
        onChangeSetup={onExit}
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
