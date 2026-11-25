# Store listings

Everything the two stores ask for in words, written once and kept here so the
App Store and Play say the same thing. The screenshots they ask for in pictures
are in `docs/screenshots`, and `docs/privacy.html` is the policy page both
require a link to.

The name is the one thing here that may not survive contact with the stores:
**Deduction** is a common word and may already be taken on either. Check both
before the first build, because the bundle identifier is what identifies the app
afterwards and changing it makes a different app. `Deduction — Logic Puzzles` is
the fallback, and is also what to use if the plain name is free but crowded in
search.

---

## Apple App Store

**Name** (30 characters)

```
Deduction
```

**Subtitle** (30 characters)

```
Logic puzzles, never guessed
```

**Promotional text** (170 characters, changeable without a review)

```
Twelve worlds of small mysteries: a museum that has lost its register, a café
that has muddled its tickets, a reef whose dive log went over the side.
```

**Description** (4000 characters)

```
A logic puzzle that can always be reasoned out. Never a guess, never a
coin-flip, never a puzzle that needs you to try something and see.

Somebody has lost the paperwork. A curator left the register under a teapot, a
harbourmaster's log went over the side, a workshop's job cards have been found
under a bench with a bootprint on them. What is left is what people remember,
said one piece at a time — and between them, if you are careful, those pieces
come to exactly one answer.

TWELVE WORLDS
A museum, a café, a reef dive, a garden show, a clockwork workshop, a harbour
watch, a lantern festival, the last train, a wizarding academy, a theatre
backstage, a quest, and a voyage out past Saturn. Each has its own cast, its own
language and its own ways of going wrong.

ALWAYS SOLVABLE BY DEDUCTION
Every puzzle is generated with a single answer and checked to be reachable by
reasoning alone before you ever see it. If you are stuck, there is always a next
step to find — and a hint that shows you the one you missed rather than filling
a square in for you.

FIVE SIZES
From a three-by-three that takes a minute to a six-by-four that does not. Choose
the size you want, or take the daily challenge at each of the five.

TWO WAYS TO PLAY
Pure Deduction keeps the board honest: it crosses off what follows and tells you
when a mark contradicts a clue. Classic logic switches all of that off and hands
you the grid and nothing else.

NO ACCOUNT, NO ADVERTS, NO INTERNET
It does not phone home, because there is nowhere for it to phone. Your games and
your statistics stay on your phone.

LEARN IT IN TEN MINUTES
Eight lessons, each one board long, covering every kind of clue the game uses —
including the awkward ones.
```

**Keywords** (100 characters, comma-separated, no spaces)

```
logic,puzzle,deduction,grid,brain,reasoning,solitaire,daily,offline,nonogram,sudoku,crossword
```

**Category** Games → Puzzle (secondary: Games → Board)

**Age rating** 4+. Nothing in the questionnaire applies: no violence, no
language, no gambling, no user-generated content, no web access.

**Support URL** `https://github.com/mattonfoot/logic-puzzles/issues`

**Privacy policy URL** wherever `docs/privacy.html` ends up hosted.

**App privacy answers** — *Data Not Collected*, every category. Nothing is
gathered, so no nutrition label beyond that is needed.

**Export compliance** already answered in `app.json`
(`ITSAppUsesNonExemptEncryption: false`), so each submission skips the question.

**Screenshots** — 6.9" iPhone is the only required size; Apple scales it down for
the others. `docs/screenshots` holds 25 shots at 786 × 1704, which is a 3× export
of a 393-point phone and **not** an accepted size: the store wants 1290 × 2796 or
1320 × 2868. Re-run the walk against a 430 × 932 viewport to get them, or crop.
Six to ten shots is plenty. The ones worth using, in order: the board mid-game,
a clue, the item card, the solved board, the briefing, the catalogue of themes.

Since `ios.supportsTablet` is false, no iPad screenshots are required and the
set in `docs/screenshots/ipad` is for the repository rather than the store.

---

## Google Play

**App name** (30 characters)

```
Deduction
```

**Short description** (80 characters)

```
Logic puzzles with one answer, always reachable by reasoning. Never a guess.
```

**Full description** (4000 characters) — the App Store description above works
unchanged. Play renders no formatting, so the headings read as plain lines.

**Category** Games → Puzzle

**Tags** Brain games, Logic, Offline

**Content rating** — the IARC questionnaire. Every answer is no: no violence, no
sexuality, no language, no controlled substances, no gambling, no user
interaction, no data sharing, no adverts. The result is PEGI 3 / ESRB Everyone.

**Data safety** — *No data collected, no data shared.* Tick "Data is encrypted in
transit" as not applicable, since nothing is transmitted. The saved games and
statistics are local-only, which Play does not count as collection.

**Target audience** 13+ is simplest; the app is suitable for all ages but
declaring under-13 pulls in the Families policy and a second review.

**Adverts** None. Declare it, or the listing carries a "contains ads" label by
default.

**Privacy policy URL** required even though nothing is collected — point it at
the hosted `docs/privacy.html`.

**Graphics**

| Asset           | Size                     | Where it comes from                 |
| --------------- | ------------------------ | ----------------------------------- |
| App icon        | 512 × 512 PNG            | `npm run app-icon` output, resized  |
| Feature graphic | 1024 × 500 PNG           | still to make — a banner, not a shot |
| Phone shots     | 1080 × 2400 or similar   | re-run the walk at a Pixel viewport  |

At least two phone screenshots, up to eight. 16:9 or 9:16, between 320 px and
3840 px on the long edge.

---

## The two-week wall

A **personal** Play developer account opened after November 2023 cannot publish
to production until it has run a closed test with **12 testers who stay opted in
for 14 continuous days**. There is no way to shorten it and no way around it
except an organisation account, which is verified differently and skips the
requirement.

So the order that wastes the least time is: open the Play account first, get a
build into closed testing, start the clock, and do the App Store submission while
it runs.
