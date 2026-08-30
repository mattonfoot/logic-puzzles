import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { Attribute, Puzzle } from '../puzzle/types';
import { feedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { Pager } from '../ui/Pager';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Which item to show, or null when the card is closed. */
  showing: Attribute | null;
  /** Moves the card to another item, which is how Previous and Next work. */
  onShow: (attribute: Attribute) => void;
  onClose: () => void;
}

/**
 * Who or what one label on the grid actually is.
 *
 * Clues describe things as often as they name them — "the astronaut with red
 * hair", "no payload made of glass" — so the traits behind those descriptions
 * have to be somewhere the player can read them. This is that somewhere: tap a
 * picture on the board and the item introduces itself.
 *
 * **Previous** and **Next** walk the rest of its set. A clue about red hair is
 * a question about everyone in the set, not about the one whose picture was
 * tapped, and closing the card four times to read four of them is four times
 * the work of reading them. The pair is the app's, the same one the numbered
 * puzzles page with, and it stops at each end rather than wrapping: a set is a
 * short list with a first and a last, and a card that comes back round to where
 * it started is a card you cannot tell you have read all of.
 */
export function ItemCard({ puzzle, showing, onShow, onClose }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  if (!showing) return null;

  const category = puzzle.categories[showing.category];
  const item = category.items[showing.item];
  const first = showing.item === 0;
  const last = showing.item === category.items.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.backdrop}
        onPress={() => {
          feedback.tap();
          onClose();
        }}
      >
        {/* Taps inside the card stay inside it. */}
        <Pressable style={[styles.card, shadow.raised]} onPress={() => undefined}>
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: tint(palette.accent, 0.12) }]}>
              <Icon name={item.icon} size={38} color={palette.accent} />
            </View>
            <View style={styles.headText}>
              <Text style={[styles.category, { color: palette.accent }]}>{category.name}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          </View>

          <Text style={styles.blurb}>{item.blurb}</Text>

          {category.traits.length > 0 ? (
            <View style={styles.traits}>
              {category.traits.map((trait) => (
                <View key={trait.id} style={styles.trait}>
                  <Text style={styles.traitLabel}>{trait.label}</Text>
                  <Text style={styles.traitValue}>{item.traits[trait.id] ?? '—'}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.pager}>
            <Pager
              previousDisabled={first}
              nextDisabled={last}
              middle={`${showing.item + 1} of ${category.items.length}`}
              onPrevious={() => onShow({ category: showing.category, item: showing.item - 1 })}
              onNext={() => onShow({ category: showing.category, item: showing.item + 1 })}
            />
          </View>

          <Text style={styles.dismiss}>Tap outside to close</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(24, 22, 18, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: space(6),
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      padding: space(5),
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(4),
    },
    icon: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: {
      flex: 1,
    },
    category: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    label: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.ink,
      marginTop: space(0.5),
    },
    blurb: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.inkSoft,
      marginTop: space(4),
    },
    traits: {
      marginTop: space(4),
      borderTopWidth: border,
      borderTopColor: palette.line,
    },
    trait: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: space(3),
      paddingVertical: space(2),
      borderBottomWidth: border,
      borderBottomColor: palette.line,
    },
    traitLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.inkFaint,
    },
    traitValue: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: palette.ink,
      textAlign: 'right',
    },
    pager: {
      marginTop: space(2),
    },
    dismiss: {
      fontSize: 11,
      color: palette.inkFaint,
      textAlign: 'center',
      marginTop: space(2),
    },
  });
