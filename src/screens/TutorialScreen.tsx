import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { fitCellSize, GridBoard } from '../components/GridBoard';
import { findMistakes, getMark, nextMark, setMark, type Cell, type Marks } from '../game/board';
import { STEPS, stepAt, stepHighlight, tutorialPuzzle } from '../game/tutorial';
import { plural, t } from '../i18n';
import { describeClue } from '../puzzle/describe';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, space, tint, type Palette } from '../ui/theme';

interface Props {
  onBack: () => void;
}

/**
 * Thirty seconds of being shown, on a board the player is marking themselves.
 *
 * It walks four marks and explains three of them: a cross, a tick, and the
 * square that follows from the two. The fourth it names and leaves alone, so
 * the last thing that happens here is the player finishing a grid without being
 * told anything — which is the feeling the whole game is selling, and the only
 * way to end a lesson about deduction.
 *
 * Nothing is scripted about the board itself. It is the same `GridBoard` the
 * game draws, marked the same way, with the same automatic crosses appearing
 * off a tick; only the words above it are the tutorial's. Every tap is
 * accepted, including the wrong ones — a lesson that slaps the player's hand is
 * a lesson they leave — and the step it is waiting for is read off the board
 * rather than counted, so taking a mark back walks the words back with it.
 *
 * Nothing here is recorded, and that is deliberate rather than unfinished: no
 * clock, no save, nothing in the statistics, and no note anywhere that it has
 * been done. It is not a game, a first attempt at the app should not arrive in
 * the numbers as one, and a lesson that remembers being finished is a lesson
 * that cannot be taken twice. So it opens on an empty board every time — the
 * screen is unmounted on the way out and holds nothing outside itself, which
 * is what makes that true rather than merely intended.
 *
 * The one thing it does ask is whether somebody part-way through meant to
 * leave, since walking out at the third mark and coming back to the first is a
 * surprise worth heading off. It asks in the app's own window, the same way
 * restarting a puzzle and clearing the statistics do, and the question says
 * what the answer costs.
 */
export function TutorialScreen({ onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const puzzle = useMemo(() => tutorialPuzzle(), []);
  const [marks, setMarks] = useState<Marks>({});
  const [boardArea, setBoardArea] = useState({ width: 0, height: 0 });
  const [leaving, setLeaving] = useState(false);

  const at = stepAt(marks);
  const step = STEPS[at];
  const done = step === undefined;

  /**
   * Marks that contradict the answer, which the tutorial says something about
   * at once.
   *
   * A real board keeps this to itself until the player asks for a clue and it
   * has to admit the answer is out of reach — being told mid-thought that you
   * are wrong is the game solving the puzzle for you. A lesson is the opposite:
   * there is nothing to spoil, the player has been asked to do one specific
   * thing, and a wrong mark left standing is the one way this screen can leave
   * somebody more confused than it found them.
   */
  const mistakes = useMemo(() => new Set(findMistakes(marks, puzzle)), [marks, puzzle]);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardArea((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  const toggle = useCallback(
    (cell: Cell) => {
      feedback.mark();
      setMarks((current) =>
        setMark(current, cell, nextMark(getMark(current, cell)), {
          size: puzzle.size.items,
          autoEliminate: true,
        }),
      );
    },
    [puzzle.size.items],
  );

  useEffect(() => {
    if (done) feedback.success();
  }, [done]);

  const cellSize = useMemo(
    () => fitCellSize(puzzle, boardArea.width, boardArea.height, TEACHING_CELL),
    [puzzle, boardArea],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.body, { paddingTop: insets.top + space(5) }]}>
        <RuledTitle>{t('tutorial.title')}</RuledTitle>

        {/* What just happened, then what to do about it. The two are one
            paragraph rather than a banner and a caption: it is somebody
            talking the player through a board, and that is how talking
            reads. */}
        <View style={styles.said}>
          <Text style={styles.settled}>
            {at === 0 ? t('tutorial.opening') : STEPS[at - 1].after}
          </Text>
          {done ? null : <Text style={styles.asking}>{step.line}</Text>}
          {mistakes.size > 0 ? (
            <Text style={styles.wrong}>{plural('tutorial.wrong', mistakes.size)}</Text>
          ) : null}
        </View>

        {step?.clue === undefined ? null : (
          <View style={[styles.clue, { borderColor: tint(palette.accent, 0.4) }]}>
            <Text style={styles.clueLabel}>{t('tutorial.clue')}</Text>
            <Text style={[styles.clueText, { color: palette.accent }]}>
              {describeClue(puzzle.clues[step.clue], puzzle)}
            </Text>
          </View>
        )}

        <View style={styles.fill} onLayout={measure}>
          {boardArea.width > 0 ? (
            <GridBoard
              puzzle={puzzle}
              marks={marks}
              mistakes={mistakes}
              // Two ways of pointing, saying two different things. The
              // crosshair is the game's own — the row and the column of the
              // pair a clue talks about — and it names the two things the
              // square is about, which is the thing a first-timer has to
              // learn to read. The ring says *that* square, and stays until
              // the mark it is waiting for is on it.
              highlight={done ? [] : stepHighlight(step)}
              awaiting={done ? null : step.cell}
              cellSize={cellSize}
              onToggle={toggle}
              onInspect={() => undefined}
            />
          ) : null}
        </View>
      </View>

      {/* Finished, and there is nothing to lose by going; part-way through,
          and the walk starts over next time, which is worth saying before it
          happens rather than after. */}
      <BackLink label={t('tutorial.back')} onPress={() => (done ? onBack() : setLeaving(true))} />

      <ConfirmDialog
        visible={leaving}
        title={t('tutorial.confirm.title')}
        message={t('tutorial.confirm.body')}
        confirmLabel={t('tutorial.confirm.confirmLabel')}
        cancelLabel={t('tutorial.confirm.cancelLabel')}
        onConfirm={() => {
          setLeaving(false);
          onBack();
        }}
        onCancel={() => setLeaving(false)}
      />
    </View>
  );
}

/**
 * How large a square is allowed to get here, against 46 on a real board.
 *
 * Nine squares have the screen to themselves, and a grid drawn at the size a
 * six-set staircase needs would sit in the middle of it like a stamp. This is
 * a board being pointed at rather than one being worked, and it should look
 * like the thing the words are about.
 */
const TEACHING_CELL = 76;

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    body: {
      flex: 1,
      paddingHorizontal: space(5),
    },
    fill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(4),
    },
    said: {
      paddingTop: space(4),
      gap: space(2),
    },
    settled: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.inkSoft,
    },
    asking: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600',
      color: palette.ink,
    },
    wrong: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      color: palette.danger,
    },
    clue: {
      borderWidth: border,
      paddingVertical: space(3),
      paddingHorizontal: space(4),
      marginTop: space(4),
    },
    clueLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      marginBottom: space(1),
    },
    clueText: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
    },
  });
