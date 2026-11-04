# Locales

Every word the app says, one folder per language. There is one today,
`en-GB/`. Change the wording in any file and run `npm run locale`: that merges
the folder into `src/i18n/strings.generated.ts`, which is what the app
imports, and a test fails if the two are ever out of step.

```
en-GB/
  ui.yaml               the screens, the default clue sentences, and the
                        briefing for a theme that has none
  lessons.yaml          the seven boards behind How to play
  achievements.yaml     every card's name and what it took
  themes/<theme>.yaml   one per theme: its cast, its clue voice, its briefings
```

Each file holds part of one tree, written out from the top: a theme file says
`themes: <theme>:` and `briefings: themes: <theme>:` in full, so any line can be
found by its key and moved between files without being renamed. The build
merges the files and stops if two of them write the same line, rather than
letting one quietly win.

The conventions every file follows — `{braced}` placeholders, `.one` / `.other`
counts — are at the top of `ui.yaml`.

## Writing a theme

A theme file is everything the theme says. Which sets it plays with, and which
items are in them, are read from it **in the order they are written**: that
order is what puzzles are drawn from, so moving an item changes what a seed —
and a daily — deals. A second language has to list them in the same order.
`src/data/themes.ts` holds the list of themes and the numbers the ordered sets
compare by; everything readable is here, keyed by the item's id.

An id (`nova`, `seed-vault`) is not language: it names the item's drawing in
`assets/icons`, and a test checks the two agree. Change a `label` freely; leave
the key alone.

`pattern` and `describes` are the fragments a clue is built from — `{}` is
where the item's own name goes. A trait's `pattern` uses `{noun}` for what one
member of the set is called and `{}` for the value, so "astronaut with red
hair" is one template and one word. `clues` gives a theme its own sentences;
anything it leaves out falls back to `clue.templates` in `ui.yaml`.

`voices` is for a theme whose sets are different sorts of thing. One sentence a
kind only works while they are interchangeable — "{a} is paired with {b}" reads
the same whichever two it falls between. They rarely are. In the workshop a
maker *invented* an invention, an invention *was made of* a material, and a tool
*shaped* both.

So a theme writes the words that go between two of its sets, keyed by set id:
`voices.maker.invention` is the wording for a pairing with the maker on the
first side and the invention on the second. Each is a verb phrase and its
denial — `did: 'invented'`, `didNot: 'did not invent'` — and all four pairing
kinds are built from the pair, so the statement, the denial, the group ruled out
and the choice of two cannot drift apart. Both directions are written, because
English does not reverse a sentence by swapping its ends.

Two things to write for: either side may arrive as a description rather than a
name — "the material that is cheap" as well as "the Brass Ingot" — so the phrase
has to read with both; and a label may be plural, so a past-tense verb ("shaped",
"went into") is safer than one that agrees with its subject ("is kept in" breaks
on "the Cotton Gloves"). A pairing the theme says nothing about falls back to
`clues`, and comparisons take no voice: they read from the ordered set's own
words.

How a briefing is written — and the one rule a test holds them to, that a
briefing names no set but the anchor — is beside the fallback briefing in
`ui.yaml`.

## Adding a language

A folder beside `en-GB/` with the same files and the same keys, and a change to
`LOCALE` in `scripts/locale.mjs`. Nothing that calls `t` has to change.
