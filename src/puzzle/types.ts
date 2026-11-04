/**
 * Core data model for the logic-grid puzzles.
 *
 * A puzzle has `size` entities (rows) and `categories.length` categories.
 * Every entity owns exactly one item from every category, and no two entities
 * share an item. Category 0 is the "anchor" category (usually the people):
 * entity `e` always owns item `e` of category 0, which removes the symmetry of
 * relabelling entities and keeps solution counting honest.
 */

/** One value inside a category, e.g. "Mars" or "2031". */
export interface ItemDef {
  /**
   * Stable name for this item, which is what its drawing is called. Not
   * language: an item can be renamed or translated and keep its picture.
   */
  id: string;
  label: string;
  /** Ordered categories only: the numeric value used by comparison clues. */
  value?: number;
  /** The silhouette that stands for it: a name in `src/ui/icons.generated`. */
  icon: string;
  /** A line about it, for the player who taps its label. */
  blurb: string;
  /** Trait id → this item's value for it, e.g. `{ hair: 'red' }`. */
  traits: Record<string, string>;
}

/**
 * Something the items of a category can be described by rather than named:
 * hair colour, what a thing is made of, how big it is.
 *
 * `pattern` is the description without an article, with `{noun}` for what one
 * member is called and `{}` for the value — "astronaut with {} hair" reads as
 * "the astronaut with red hair", "no astronaut with red hair", or "an astronaut
 * with red hair", depending on what the clue is doing with it.
 */
export interface TraitDef {
  id: string;
  /** Heading on the item's card, e.g. "Hair". */
  label: string;
  pattern: string;
}

/** Extra metadata that turns a category into an ordered (comparable) one. */
export interface OrderedMeta {
  /** How the category is spoken about in a clue, e.g. "launch year". */
  noun: string;
  /** Plural unit for exact-gap clues, e.g. "years". */
  unit: string;
  /** Comparative for a bigger value, e.g. "later". */
  greater: string;
  /** Comparative for a smaller value, e.g. "earlier". */
  lesser: string;
}

export interface CategoryDef {
  id: string;
  /** Short label used as a grid header, e.g. "Spacecraft". */
  name: string;
  /** Sentence fragment for clue text; `{}` is replaced by the item label. */
  pattern: string;
  /**
   * The same fragment for an item that is being described rather than named;
   * `{}` is replaced by the description. A clue about a weapon is really about
   * the hero holding it, so "the {} wielder" has "the wielder of the {}" beside
   * it, and "the wielder of the weapon made of bone" reads as it should.
   *
   * Write the articles in: the group and either-or wordings turn "the" into
   * "no" and "a" where the sentence needs them.
   */
  describes: string;
  /** What one member is called in a description, e.g. "ship". */
  noun: string;
  /** What its items can be described by instead of named. */
  traits: TraitDef[];
  items: ItemDef[];
  ordered?: OrderedMeta;
}

/**
 * The sentences a theme's clues are written in.
 *
 * Each is a template filled with `{name}` slots:
 *
 * | Slot | Meaning |
 * |---|---|
 * | `{a}` `{b}` `{c}` | the things a link, group or either-or clue names |
 * | `{greater}` `{lesser}` | the two sides of a comparison |
 * | `{noun}` | what the ordered set is called, e.g. "launch year" |
 * | `{comparative}` | which way the comparison runs, e.g. "later" |
 * | `{gap}` `{unit}` | the exact difference, e.g. "3" and "years" |
 *
 * Themes override what they want; anything left out falls back to the neutral
 * wording in `DEFAULT_CLUE_TEMPLATES`.
 */
export interface ClueTemplates {
  /** Two attributes belong to the same entity. Needs `{a}` and `{b}`. */
  link: string;
  /** They do not. Needs `{a}` and `{b}`. */
  notLink: string;
  /** None of a described group does. Needs `{a}` (the bare description) and `{b}`. */
  groupNot: string;
  /** One of two options. Needs `{a}`, `{b}` and `{c}`. */
  either: string;
  /** A comparison. Needs `{greater}` and `{lesser}`. */
  compare: string;
  /** A comparison with an exact difference. Needs `{greater}`, `{lesser}`, `{gap}`. */
  compareGap: string;
}

/**
 * The kinds of clue a puzzle can be built from, named the way their wording is
 * — so a size saying which kinds it allows and a theme saying how each one is
 * worded are talking about the same six things.
 */
export type ClueKind = keyof ClueTemplates;

/**
 * The kinds that pair two attributes, and so can be worded differently
 * depending on which set is on which side. Comparisons are left out: they take
 * their words from the ordered set itself.
 */
export type PairingKind = 'link' | 'notLink' | 'groupNot' | 'either';

/**
 * How one set relates to another, as the words between them.
 *
 * A pairing clue is one sentence with two sides, and what belongs between them
 * is a verb phrase: a maker *invented* an invention, an invention *was made of*
 * a material, a customer *ordered* a drink. Give the phrase and its negative
 * and all four pairing kinds follow from them — the statement, its denial, the
 * group ruled out, and the choice of two — which keeps a theme from having to
 * write the same relationship four times and get one of them subtly wrong.
 */
export interface PairVoice {
  /** "invented", "was made of" — the sentence reads "{a} <did> {b}." */
  did: string;
  /** Its denial: "did not invent", "was not made of". */
  didNot: string;
}

/**
 * How a theme's sets relate to each other, by set id: `voices[a][b]` is the
 * wording for a pairing with `a` on the first side and `b` on the second.
 *
 * One sentence a kind only works while a theme's sets are interchangeable —
 * "{a} is paired with {b}" reads the same whichever two it falls between. They
 * rarely are. In the workshop a maker invented an invention, was invented by
 * runs the other way, and a tool was used on both; in the café a table is not
 * ordered at all. Both directions are written out, because English does not
 * reverse a sentence by swapping its ends.
 *
 * A pairing between two sets with nothing written here falls back to `clues`,
 * and comparisons take no voice: they read from the ordered set's own words.
 */
export type ClueVoices = Record<string, Record<string, PairVoice>>;

export interface ThemeDef {
  id: string;
  name: string;
  /** The theme's own silhouette, by name. */
  icon: string;
  blurb: string;
  /** The first category is always the anchor category. */
  categories: CategoryDef[];
  /** Wording for this theme's clues; anything omitted uses the default. */
  clues?: Partial<ClueTemplates>;
  /** Wording for the pairing clues the cast is in; see `ClueVoices`. */
  voices?: ClueVoices;
}

/** A category after it has been sampled down to the puzzle's size. */
export interface PuzzleCategory {
  id: string;
  name: string;
  pattern: string;
  describes: string;
  noun: string;
  traits: TraitDef[];
  items: ItemDef[];
  ordered?: OrderedMeta;
}

/** Points at one item of one category, e.g. category 2 / item 0. */
export interface Attribute {
  category: number;
  item: number;
}

/**
 * A description that picks out every item of one category sharing a trait
 * value — "astronaut with red hair" — with the members it resolved to on this
 * puzzle's cast kept alongside, so the logic never has to look them up again.
 */
export interface TraitGroup {
  category: number;
  trait: string;
  value: string;
  /** Item indices in that category, at least one. */
  items: number[];
}

export type Clue =
  /** The two attributes belong to the same entity (positive) or not (negative). */
  | { kind: 'link'; positive: boolean; a: Attribute; b: Attribute }
  /**
   * Nothing the description covers shares an entity with `b` — one statement
   * ruling out a whole group at once, which is what makes a description worth
   * having: "no astronaut with red hair is on the Kestrel".
   */
  | { kind: 'groupNot'; group: TraitGroup; b: Attribute }
  /** The entity holding `a` also holds one of `options` (same category, two items). */
  | { kind: 'either'; a: Attribute; options: [Attribute, Attribute] }
  /**
   * In ordered category `order`, the entity holding `greater` has a strictly
   * larger value than the entity holding `lesser`. When `gap` is set the
   * difference is exactly that many units.
   */
  | { kind: 'compare'; order: number; greater: Attribute; lesser: Attribute; gap?: number };

export interface SizeOption {
  id: string;
  /** Items per category (also the number of entities). */
  items: number;
  /** How many categories take part. */
  categories: number;
  /** The shape, as the grid reads: "4 × 4". */
  label: string;
  /** What that shape asks of the player: "Beginner", "Pro". */
  difficulty: string;
  /**
   * Which kinds of clue this board is allowed to be built from.
   *
   * Left out, it takes all six. A smaller board is a gentler one, so the lowest
   * rungs can be kept to the kinds a first-time player can act on without being
   * taught anything: a comparison asks you to hold an order in your head, and a
   * negative asks you to act on what a sentence does not say.
   *
   * `link` cannot be excluded. The generator falls back to plain matches when a
   * puzzle will not come out any other way, so a board that banned them would
   * get them anyway — better to say so than to let the config quietly lie.
   */
  clues?: readonly ClueKind[];
}

export interface Puzzle {
  /** Seed the puzzle was generated from — regenerating with it is deterministic. */
  seed: number;
  /** The theme's wording, resolved at generation so saved games read the same. */
  clueTemplates: ClueTemplates;
  /** Its wording for the pairing clues the cast is in, if it has any. */
  clueVoices?: ClueVoices;
  themeId: string;
  themeName: string;
  themeIcon: string;
  size: SizeOption;
  categories: PuzzleCategory[];
  /** solution[category][entity] = item index. */
  solution: number[][];
  clues: Clue[];
}
