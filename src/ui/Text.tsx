import React from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

/**
 * The app's typeface, as a drop-in replacement for React Native's `Text`.
 *
 * A custom family has one file per weight, and `fontWeight` cannot pick between
 * them — asking for 700 in a family that has no bold face gets a synthetic one
 * instead, which smears the letterforms. So the weight in a style is read here
 * and turned into the face that actually carries it, and the weight itself is
 * dropped so nothing is emboldened twice.
 *
 * Everything else about `Text` is untouched: same props, same styles.
 */

/** Each weight the app draws with, and the face that carries it. */
const FACES: Record<string, string> = {
  '400': 'Outfit_400Regular',
  '500': 'Outfit_500Medium',
  '600': 'Outfit_600SemiBold',
  '700': 'Outfit_700Bold',
  '800': 'Outfit_800ExtraBold',
  '900': 'Outfit_800ExtraBold',
  normal: 'Outfit_400Regular',
  bold: 'Outfit_700Bold',
};

export function faceFor(weight: TextStyle['fontWeight']): string {
  return FACES[String(weight ?? '400')] ?? FACES['400'];
}

export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten<TextStyle>(style);
  return (
    <RNText
      {...rest}
      style={[style, { fontFamily: faceFor(flat?.fontWeight), fontWeight: undefined }]}
    />
  );
}
