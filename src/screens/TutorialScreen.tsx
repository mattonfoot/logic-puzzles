import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BriefingPopup } from '../components/BriefingPopup';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fitCellSize, GridBoard } from '../components/GridBoard';
import { ItemCard } from '../components/ItemCard';
import { LessonPopup } from '../components/LessonPopup';
import { getMark, nextMark, setMark, type Cell, type Marks } from '../game/board';
import {
  checkFinished,
  checkStep,
  lessonById,
  stepDone,
  stepHighlight,
  type LessonId,
} from '../game/lessons';
import { t } from '../i18n';
import { describeClue } from '../puzzle/describe';
import type { Attribute } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';
import { ToolButton } from '../ui/ToolButton';
import { ZoomPair } from '../ui/ZoomPair';

interface Props {
  lesson: LessonId;
  onBack: () => void;
}

const ZOOM_STEP = 8;

/**
 * One lesson, on the screen a puzzle is played on.
 *
 * It is the game screen, not a screen that resembles it: the same header, the
 * same board over the same zoom pair, the same four words along the bottom, the
 * same windows opening over the top of them. That is the whole design of it —
 * the thing being taught is how to play, and a player taught on a layout the
 * app does not otherwise have has been taught a screen they are about to stop
 * having. What used to be here was a band of instructions above the board and
 * nothing to press; the words are in the clue window now and the board has the
 * room they were taking.
 *
 * **The Clue button drives it, and nothing else does.** It opens on the
 * briefing — what this lesson is about, in the window a puzzle's own story
 * opens in — ending with the one thing to do: hit Clue. Clue then hands over
 * the step's clue and what to do with it, and says to hit Clue again when it is
 * done. That second press is the player saying "I am finished", and it is where
 * the board is read: right, and it moves straight on to the next thing; wrong,
 * and the window comes back saying what is wrong and which taps put it right.
 *
 * Checking on the press rather than on every mark is the point. A board that
 * corrected the player as they went would be marking the board for them, and
 * would also be answering a question nobody asked — the same reason a real
 * puzzle says nothing about a wrong mark until a clue cannot help. Here the
 * player asks, so here it answers.
 *
 * Every walk stops with the board unfinished. By then there is no clue left to
 * read and nothing left to be told, so the only thing that can fill the last
 * square is the player working it out, and the lesson finishes when the *board*
 * is out rather than when the list of steps runs off the end.
 *
 * Nothing here is recorded, and that is deliberate rather than unfinished: no
 * clock, no save, nothing in the statistics, and no note anywhere that any of
 * them has been done. They are not games, a first attempt at the app should not
 * arrive in the numbers as one, and a lesson that remembers being finished is a
 * lesson that cannot be taken twice. So each opens on an empty board every time
 * — the screen holds nothing outside itself, which is what makes that true
 * rather than merely intended.
 *
 * The one thing it does ask is whether somebody part-way through meant to
 * leave, since walking out at the third mark and coming back to the first is a
 * surprise worth heading off.
 */
export function TutorialScreen({ lesson: lessonId, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => lessonById(lessonId), [lessonId]);
  const puzzle = lesson.puzzle;

  const [marks, setMarks] = useState<Marks>({});
  const [history, setHistory] = useState<Marks[]>([]);
  const [at, setAt] = useState(0);
  /** Whether the step's instructions have been handed over yet. */
  const [told, setTold] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** Squares the last check shaded, until the player touches the board again. */
  const [flagged, setFlagged] = useState<string[]>([]);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [saying, setSaying] = useState(false);
  const [lit, setLit] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [inspecting, setInspecting] = useState<Attribute | null>(null);
  const [boardArea, setBoardArea] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(0);

  const step = lesson.steps[at];
  const done = useMemo(() => checkFinished(marks, puzzle).ok, [marks, puzzle]);
  /** The shaded squares as the board wants them, rebuilt only when they move. */
  const shaded = useMemo(() => new Set(flagged), [flagged]);

  // Every lesson opens on its own briefing with an empty board, including one
  // opened straight after another: all of this belongs to the lesson, not to
  // the screen.
  useEffect(() => {
    setMarks({});
    setHistory([]);
    setAt(0);
    setTold(false);
    setProblem(null);
    setFlagged([]);
    setBriefingOpen(true);
    setSaying(false);
    setLit(false);
    setInspecting(null);
    setZoom(0);
  }, [lessonId]);

  /** Records a move so it can be taken back, then makes it. */
  const move = useCallback((change: (current: Marks) => Marks) => {
    setFlagged([]);
    setMarks((current) => {
      const next = change(current);
      if (next === current) return current;
      setHistory((past) => [...past, current]);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (cell: Cell) => {
      feedback.mark();
      move((current) =>
        setMark(current, cell, nextMark(getMark(current, cell)), {
          size: puzzle.size.items,
          autoEliminate: true,
        }),
      );
    },
    [move, puzzle.size.items],
  );

  /** The board's other way of ticking a square, which a lesson has to take too. */
  const settle = useCallback(
    (cell: Cell) => {
      if (getMark(marks, cell) === 'yes') return;
      feedback.settle();
      move((current) =>
        setMark(current, cell, 'yes', { size: puzzle.size.items, autoEliminate: true }),
      );
    },
    [marks, move, puzzle.size.items],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    feedback.tap();
    setFlagged([]);
    setMarks(history[history.length - 1]);
    setHistory((past) => past.slice(0, -1));
  }, [history]);

  /**
   * The button the whole lesson runs on.
   *
   * The first press of a step hands over the clue and the instruction. The
   * second reads the board and says what it found. A player who presses it
   * early gets the same window back with a line saying what is still missing,
   * which is exactly what somebody who pressed it to re-read the clue wanted
   * anyway.
   */
  const askClue = useCallback(() => {
    feedback.tap();
    if (!told) {
      setTold(true);
      setProblem(null);
      setSaying(true);
      return;
    }
    const found = step ? checkStep(marks, puzzle, step) : checkFinished(marks, puzzle);
    if (!found.ok) {
      feedback.warn();
      setProblem(found.problem ?? null);
      setFlagged(found.flagged ?? []);
      setSaying(true);
      return;
    }
    setProblem(null);
    setFlagged([]);
    if (step) setAt((index) => index + 1);
    setSaying(true);
  }, [marks, puzzle, step, told]);

  // Finishing takes the screen the way it does on a real board: the last square
  // goes in and the lesson says so, without being asked.
  const finished = useRef(false);
  useEffect(() => {
    if (finished.current === done) return;
    finished.current = done;
    if (!done) return;
    feedback.success();
    setProblem(null);
    setFlagged([]);
    setSaying(true);
  }, [done]);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardArea((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  const fitCell = useMemo(
    () => fitCellSize(puzzle, boardArea.width, boardArea.height, TEACHING_CELL),
    [puzzle, boardArea],
  );
  const cellSize = Math.min(TEACHING_CELL, fitCell + zoom);

  // What the window says, which depends only on where the walk has got to.
  const instruction = done ? t('lessons.solved') : (step?.line ?? lesson.finish);
  const clue =
    !done && step?.clue !== undefined ? describeClue(puzzle.clues[step.clue], puzzle) : null;
  const pointing = told && !done && step !== undefined;
  // The ring's job is "put your mark here", so it comes off the moment the mark
  // is there rather than waiting for the press of Clue that reads the board: a
  // ring still sitting on a square the player has just filled in looks like an
  // app that has not noticed.
  const waitingOn = pointing && !stepDone(marks, step) ? step.cell : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space(4) }]}>
        <RuledTitle>{lesson.title}</RuledTitle>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t('lessons.step', {
            at: Math.min(at + 1, lesson.steps.length + 1),
            total: lesson.steps.length + 1,
          })}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.zoomRow}>
          <View style={styles.spacer} />
          <ZoomPair
            accent={palette.accent}
            outDisabled={zoom <= 0}
            inDisabled={cellSize >= TEACHING_CELL}
            onOut={() => setZoom((by) => Math.max(0, by - ZOOM_STEP))}
            onIn={() => setZoom((by) => by + ZOOM_STEP)}
          />
        </View>

        <View style={[styles.fill, styles.boardArea]} onLayout={measure}>
          {boardArea.width > 0 ? (
            <GridBoard
              puzzle={puzzle}
              marks={marks}
              mistakes={shaded}
              // Two ways of pointing, saying two different things. The
              // crosshair is the game's own — the row and the column of the
              // pair a clue talks about — and it is behind Highlight here for
              // the same reason it is there. The ring says *that* square, and
              // stays until the mark asked for is on it, which is the one
              // thing a lesson can say that a puzzle cannot.
              highlight={lit && pointing ? stepHighlight(step) : []}
              awaiting={waitingOn}
              cellSize={cellSize}
              onToggle={toggle}
              onSettle={settle}
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

      <View style={styles.footer}>
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
              disabled={done}
              onPress={askClue}
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
              disabled={!pointing}
              onPress={() => {
                feedback.tap();
                setLit((on) => !on);
              }}
            />
          </View>
        </View>
      </View>

      {/* What the lesson is about, in the window a puzzle's story opens in,
          ending with the only thing there is to do about it. */}
      <BriefingPopup
        visible={briefingOpen}
        puzzle={puzzle}
        title={lesson.title}
        body={`${lesson.opening}\n\n${t('lessons.begin')}`}
        onClose={() => setBriefingOpen(false)}
      />

      <LessonPopup
        visible={saying}
        clue={clue}
        instruction={instruction}
        problem={problem}
        waiting={!done}
        onClose={() => setSaying(false)}
      />

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
    header: {
      paddingHorizontal: space(4),
      paddingBottom: space(3),
    },
    subtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(1.5),
    },
    body: {
      flex: 1,
      paddingHorizontal: space(4),
      paddingTop: space(3),
    },
    fill: {
      flex: 1,
    },
    boardArea: {
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
    spacer: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: space(4),
      paddingTop: space(2),
    },
    play: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(2),
    },
    tools: {
      flexDirection: 'row',
      gap: space(2),
    },
  });
