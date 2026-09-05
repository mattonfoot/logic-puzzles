import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackLink } from '../ui/BackLink';
import { Choice } from '../ui/Choice';
import { RuledTitle } from '../ui/RuledTitle';
import { TitlePanel } from '../ui/TitlePanel';
import { useStyles } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

export interface Entry {
  /** Stable across renders; the label is words and can be translated. */
  key: string;
  label: string;
  hint: string;
  onPress: () => void;
}

interface Props {
  title: string;
  entries: Entry[];
  backLabel: string;
  onBack: () => void;
}

/**
 * A menu of lessons: the same page the difficulties are chosen on, with a
 * different list under it.
 *
 * "How to play" used to open a board. One board can only teach one thing, and
 * the game has six kinds of clue and two kinds of deduction, so it taught the
 * first and left the rest for the player to meet mid-puzzle. A list of lessons
 * is the honest shape for that, and a list of lessons is a menu — so it is the
 * app's menu, unchanged: the same panel over the same half, the same choices at
 * the same size, the same `◀ Back` under them. Stepping from Play to a
 * difficulty and stepping from How to play to a lesson are the same move, and
 * look it.
 *
 * The screen is deliberately dumb: it is given a title and a list, so the two
 * menus behind How to play are one screen used twice rather than two screens
 * that have to be kept looking alike. What each entry opens — another menu or a
 * board — is the caller's business, which is why an entry is a label and a
 * function rather than a lesson.
 *
 * Neither list is long enough to scroll on any phone the app is built for; it
 * scrolls anyway, for the reader who has turned the system text size up.
 */
export function LessonsScreen({ title, entries, backLabel, onBack }: Props) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <RuledTitle>{title}</RuledTitle>

          {entries.map((entry) => (
            <Choice
              key={entry.key}
              label={entry.label}
              hint={entry.hint}
              // "Compare the gap clues" is a phrase, not a word: at the size the
              // difficulties are set in it wraps onto two lines on a 375-point
              // phone, and a menu with a two-line row in it is a menu with a
              // mistake in it.
              size="long"
              onPress={entry.onPress}
            />
          ))}
        </ScrollView>

        <BackLink label={backLabel} onPress={onBack} />
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    // The panel is the top half; this is the other one.
    bottom: {
      flex: 1,
    },
    content: {
      paddingHorizontal: space(5),
      paddingTop: space(5),
      paddingBottom: space(5),
    },
  });
