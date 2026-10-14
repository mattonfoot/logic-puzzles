import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import type { Cell, Marks } from '../game/board';
import type { Attribute, Puzzle } from '../puzzle/types';
import { useStyles } from '../ui/ThemeProvider';
import { space } from '../ui/theme';
import { ZoomPair } from '../ui/ZoomPair';
import { fitCellSize, GridBoard, MAX_CELL } from './GridBoard';

/** How much each press of the zoom buttons adds or takes away. */
const ZOOM_STEP = 8;

interface Props {
  puzzle: Puzzle;
  marks: Marks;
  mistakes: Set<string>;
  highlight: Attribute[];
  awaiting?: Cell | null;
  onToggle: (cell: Cell) => void;
  onSettle?: (cell: Cell) => void;
  onInspect: (attr: Attribute) => void;
  /** How large a square is allowed to get; see `fitCellSize`. */
  max?: number;
  /**
   * What sits beside the zoom pair, in the room it leaves to its left. It is
   * given that room whether it fills it or not, so the pair stays at the
   * right-hand end.
   */
  aside?: ReactNode;
}

/**
 * The board as it is played, on the game screen and in a lesson alike: the
 * zoom pair over it, and the board itself at the size that fits the space it
 * is left, zoomed in from there.
 *
 * The whole staircase is drawn at once, so the cell size decides whether it
 * fits. It is measured against the space the board is actually given, and a
 * zoomed-in board scrolls both ways.
 */
export function PlayBoard({ puzzle, max = MAX_CELL, aside, ...board }: Props) {
  const styles = useStyles(makeStyles);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0);
  const fit = useMemo(() => fitCellSize(puzzle, area.width, area.height, max), [puzzle, area, max]);
  const cellSize = Math.min(max, fit + zoom);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  return (
    <View style={styles.fill}>
      <View style={styles.zoomRow}>
        {aside ?? <View style={styles.fill} />}
        <ZoomPair
          outDisabled={zoom <= 0}
          inDisabled={cellSize >= max}
          onOut={() => setZoom((step) => Math.max(0, step - ZOOM_STEP))}
          onIn={() => setZoom((step) => step + ZOOM_STEP)}
        />
      </View>

      {/* The board scrolls itself, in both directions, so its headings can
          stay put while the grids slide under them. */}
      <View style={[styles.fill, styles.area]} onLayout={measure}>
        {area.width > 0 ? <GridBoard puzzle={puzzle} cellSize={cellSize} {...board} /> : null}
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    area: {
      // Centred, so a board that fits sits in the middle of the space rather
      // than hanging from the top of it.
      justifyContent: 'center',
    },
    zoomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      marginTop: space(2),
    },
  });
