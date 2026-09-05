import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { fitCellSize, GridBoard } from '../components/GridBoard';
import { ItemCard } from '../components/ItemCard';
import {
  findMistakes,
  getMark,
  isSolved,
  nextMark,
  setMark,
  type Cell,
  type Marks,
} from '../game/board';
import { lessonById, stepAt, stepHighlight, type LessonId } from '../game/lessons';
import { plural, t } from '../i18n';
import { describeClue } from '../puzzle/describe';
import type { Attribute } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, space, tint, type Palette } from '../ui/theme';

interface Props {
  lesson: LessonId;
  onBack: () => void;
}

/**
 * One lesson, on a board the player is marking themselves.
 *
 * It walks the marks the lesson lists and explains each of them, and then it
 * stops talking with the board unfinished. What is left over is never one of
 * the steps: by then there is no clue left to read and nothing left to be told,
 * so the only thing that can fill the last square is the player working it out.
 * A lesson that talked all the way to the end would never let that happen,
 * which is why finishing is read off the board — `isSolved` — rather than off
 * the end of the list.
 *
 * Nothing is scripted about the board itself. It is the same `GridBoard` the
 * game draws, marked the same way, with the same automatic crosses appearing
 * off a tick, and the clues are the same sentences the generator writes; only
 * the words above it are the lesson's. Every tap is accepted, including the
 * wrong ones — a lesson that slaps the player's hand is a lesson they leave —
 * and the step it is waiting for is read off the board rather than counted, so
 * taking a mark back walks the words back with it.
 *
 * Nothing here is recorded, and that is deliberate rather than unfinished: no
 * clock, no save, nothing in the statistics, and no note anywhere that any of
 * them has been done. They are not games, a first attempt at the app should not
 * arrive in the numbers as one, and a lesson that remembers being finished is a
 * lesson that cannot be taken twice. So each opens on an empty board every time
 * — the screen is unmounted on the way out and holds nothing outside itself,
 * which is what makes that true rather than merely intended.
 *
 * The one thing it does ask is whether somebody part-way through meant to
 * leave, since walking out at the third mark and coming back to the first is a
 * surprise worth heading off. It asks in the app's own window, the same way
 * restarting a puzzle and clearing the statistics do, and the question says
 * what the answer costs.
 */
export function TutorialScreen({ lesson: lessonId, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => lessonById(lessonId), [lessonId]);
  const puzzle = lesson.puzzle;
  const [marks, setMarks] = useState<Marks>({});
  const [boardArea, setBoardArea] = useState({ width: 0, height: 0 });
  const [leaving, setLeaving] = useState(false);
  const [inspecting, setInspecting] = useState<Attribute | null>(null);

  // Every lesson opens on an empty board, including one opened straight after
  // another: the marks belong to the lesson, not to the screen.
  useEffect(() => {
    setMarks({});
    setInspecting(null);
  }, [lessonId]);

  const at = stepAt(marks, lesson.steps);
  const step = lesson.steps[at];
  const done = useMemo(() => isSolved(marks, puzzle), [marks, puzzle]);

  /**
   * Marks that contradict the answer, which a lesson says something about at
   * once.
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

  // What just happened, then what to do about it. Once the steps run out there
  // is still a board: the lesson says so and stops pointing.
  const settled = at === 0 ? lesson.opening : lesson.steps[at - 1].after;
  const asking = done ? t('lessons.solved') : (step?.line ?? lesson.finish);

  return (
    <View style={styles.screen}>
      <View style={[styles.body, { paddingTop: insets.top + space(5) }]}>
        <RuledTitle>{lesson.title}</RuledTitle>

        {/* The two lines are one paragraph rather than a banner and a caption:
            it is somebody talking the player through a board, and that is how
            talking reads. */}
        <View style={styles.said}>
          <Text style={styles.settled}>{settled}</Text>
          <Text style={styles.asking}>{asking}</Text>
          {mistakes.size > 0 ? (
            <Text style={styles.wrong}>{plural('lessons.wrong', mistakes.size)}</Text>
          ) : null}
        </View>

        {step?.clue === undefined ? null : (
          <View style={[styles.clue, { borderColor: tint(palette.accent, 0.4) }]}>
            <Text style={styles.clueLabel}>{t('lessons.clue')}</Text>
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
              highlight={step ? stepHighlight(step) : []}
              awaiting={step ? step.cell : null}
              cellSize={cellSize}
              onToggle={toggle}
              onInspect={
                lesson.cards
                  ? (attribute) => {
                      feedback.tap();
                      setInspecting(attribute);
                    }
                  : () => undefined
              }
            />
          ) : null}
        </View>
      </View>

      {lesson.cards ? (
        <ItemCard
          puzzle={puzzle}
          showing={inspecting}
          onShow={setInspecting}
          onClose={() => setInspecting(null)}
        />
      ) : null}

      {/* Finished, and there is nothing to lose by going; part-way through,
          and the walk starts over next time, which is worth saying before it
          happens rather than after. */}
      <BackLink label={t('lessons.back')} onPress={() => (done ? onBack() : setLeaving(true))} />

      <ConfirmDialog
        visible={leaving}
        title={t('lessons.confirm.title')}
        message={t('lessons.confirm.body')}
        confirmLabel={t('lessons.confirm.confirmLabel')}
        cancelLabel={t('lessons.confirm.cancelLabel')}
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
 * like the thing the words are about. `fitCellSize` takes it back down on the
 * three-set lesson, which has three grids to fit rather than one.
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
