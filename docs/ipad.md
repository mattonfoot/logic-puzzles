# On an iPad

`npm run screenshots:ipad` walks the same twenty-three screens as
[the phone gallery](screenshots.md), at 834 × 1194 — an 11-inch iPad Pro in
portrait, which is the only orientation it has, since `app.json` sets
`orientation: portrait`.

CI runs the phone walk, not this one, so these can go stale in a way the phone
gallery cannot: `scripts/__tests__/gallery.test.ts` holds the two sets to the
same *screens*, which catches one being added or renamed without the other, but
nothing checks that the pictures here are as new as the code. Run the iPad walk
again whenever a layout changes and you want this page to still be evidence.

**Nothing about the app is different here, and that is the point of taking
these.** `app.json` sets `ios.supportsTablet: true`, so the App Store will offer
Deduction to iPad owners and iPadOS will run it at native resolution rather than
in the letterboxed phone frame. What those owners get is the phone layout with
more room around it: every measurement in `src/ui/theme.ts` is a fixed number of
points, so nothing grows to meet the screen. These captures are the evidence for
that, kept so the decision — build a tablet layout, or set `supportsTablet` to
false and stop offering it — is made against what the app does rather than
against a guess.

## What the pictures show

**The type does not scale.** Every step of the scale in `src/ui/theme.ts` is a
fixed number of points: a difficulty is 33 whether it is on a 393-point phone or
an 834-point tablet, and the front door's 48 — chosen to be the largest decision
on a phone page — is proportionally the size a note is here. The panel still
takes exactly half the height, which on this device is 597 points of flat colour
carrying one line of text.

**Everything hangs off a 20-point left margin.** That is right on a phone, where
the eye drops down one edge. On a tablet it leaves the right-hand two thirds of
every list screen empty, and the eye has nowhere to go.

**The board stops growing at `MAX_CELL`.** A square is capped at 46 points so it
does not become a dinner plate on a big phone, and the cap holds on a tablet
too: a 6 × 4 staircase sits in the top-left of the canvas with the toolbar
pinned to corners several hundred points away from it. The zoom pair is at its
limit before the player touches it.

**The windows are capped too.** The briefing, the clue and a lesson's
instructions are all `maxWidth: 360`, so they float in the middle of a large
dimmed screen at exactly the size they are on a phone. This one is arguably
correct — a line of text wants a comfortable measure whatever it is sitting on —
and it is the only thing on this page that does not obviously want changing.

**Stretching to the width is not the same as using it.** The settings rows do
fill the page, and the result is *Colour* at the left margin with *Blue* eight
hundred points away at the right, and a volume slider a foot long. A row built
to put a name and its value within a glance of each other on a phone puts them
at opposite ends of a tablet.

**The statistics screen holds up best**, because its cards are a grid rather
than a row: three across, each filling its share, with the tables and the trend
chart under them. It looks deliberate rather than stranded, and it is the only
screen here that suggests what a tablet layout would actually be — content in
columns, not content stretched.

## The screens

| | | |
| --- | --- | --- |
| <img src="screenshots/ipad/01-start.png" width="230" alt="The front door on an iPad"><br>**1. Start** — the doors at phone size on half a page of nothing, and a panel of flat colour above them. | <img src="screenshots/ipad/02-setup.png" width="230" alt="The difficulties on an iPad"><br>**2. Difficulty** — four words down the left edge, and the rest of the screen unused. | <img src="screenshots/ipad/03-numbers.png" width="230" alt="The numbered puzzles on an iPad"><br>**3. Numbered puzzles** — five to a page, which is what a 375-point phone holds; the tablet has room for far more and is not asked for it. |
| <img src="screenshots/ipad/04-daily.png" width="230" alt="The daily challenges on an iPad"><br>**4. Daily** — the same four names, the same left margin. | <img src="screenshots/ipad/05-settings.png" width="230" alt="Settings on an iPad"><br>**5. Settings** — the rows do stretch, and it does not help: *Colour* and *Blue* end up at opposite edges, and the volume slider runs the width of the page. | <img src="screenshots/ipad/06-briefing.png" width="230" alt="A briefing on an iPad"><br>**6. Briefing** — capped at 360 points and floating, which is the one cap that is arguably right. |
| <img src="screenshots/ipad/07-board.png" width="230" alt="The board on an iPad"><br>**7. Grid** — the staircase capped at 46-point squares, in the top-left corner of the canvas, with the toolbar hundreds of points away. | <img src="screenshots/ipad/08-menu.png" width="230" alt="The puzzle settings on an iPad"><br>**8. Puzzle settings** — three settings and a way to start over, in the top fifth of the page. | <img src="screenshots/ipad/09-clue.png" width="230" alt="The clue window on an iPad"><br>**9. Clue** — phone-sized in the middle of the screen. |
| <img src="screenshots/ipad/10-highlight.png" width="230" alt="A lit clue on an iPad"><br>**10. Highlight** — the crosshair still works; there is simply more page around it. | <img src="screenshots/ipad/11-marked.png" width="230" alt="A part-marked board on an iPad"><br>**11. Marked up** — the marks are drawn at the cell size, so they stay small with it. | <img src="screenshots/ipad/12-stuck.png" width="230" alt="The rewind window on an iPad"><br>**12. Out of reach** — the window is unchanged. |
| <img src="screenshots/ipad/13-item-card.png" width="230" alt="An item card on an iPad"><br>**13. Item card** — a card built for a phone, on a tablet. | <img src="screenshots/ipad/14-solved.png" width="230" alt="A finished game on an iPad"><br>**14. Solved** — the one screen the width improves: all four sets fit, so the answer table stops asking to be swiped. | <img src="screenshots/ipad/15-statistics.png" width="230" alt="Statistics on an iPad"><br>**15. Statistics** — the screen that survives this best: cards and rows that fill what they are given. |
| <img src="screenshots/ipad/16-night.png" width="230" alt="Night colours on an iPad"><br>**16. Night** — the colours are the colours; the layout is the layout. | <img src="screenshots/ipad/17-catalogue.png" width="230" alt="The zoomed-out catalogue on an iPad"><br>**17. Zoomed out** — five groups where a tablet could show twenty-five. | <img src="screenshots/ipad/18-lessons.png" width="230" alt="The How to play menu on an iPad"><br>**18. How to play** — three lessons, dropped to 28 points to fit a phone that is not this one. |
| <img src="screenshots/ipad/19-clue-lessons.png" width="230" alt="The Understanding clues menu on an iPad"><br>**19. Understanding clues** — five short lines in the top-left quarter. | <img src="screenshots/ipad/20-lesson-briefing.png" width="230" alt="A lesson briefing on an iPad"><br>**20. A lesson opens** — the same window as a puzzle's, which is still true here. | <img src="screenshots/ipad/21-lesson-clue.png" width="230" alt="A lesson's clue window on an iPad"><br>**21. Clue** — the words a lesson runs on, at phone width. |
| <img src="screenshots/ipad/22-lesson-board.png" width="230" alt="A lesson board on an iPad"><br>**22. The board** — a 3 × 3 grid capped at the teaching size, adrift in the middle. | <img src="screenshots/ipad/23-lesson-next.png" width="230" alt="The next lesson step on an iPad"><br>**23. On to the next** — the flow works; the proportions do not. | |

## What fixing it would mean

Not a rewrite, but not a stylesheet tweak either. The three things the captures
point at:

- **A width-aware type scale.** `type` in `src/ui/theme.ts` is five fixed steps.
  A tablet wants a second set, chosen from `useWindowDimensions` the way
  `TitlePanel` already chooses its height.
- **Columns, not stretching.** The settings screen shows that filling the width
  with a two-item row makes it worse, not better. Either cap the lists at a
  readable measure and centre them, or use the width properly — the difficulties
  beside the numbered games, say, so a tablet shows in one screen what a phone
  shows in two. The second is more work and much more worth having, and the
  statistics screen is the one place the app already does it.
- **A larger `MAX_CELL`, and a re-think of what the cap is for.** The number
  exists so a square is not absurd on a big phone. On a tablet the same number
  makes the board absurd in the other direction.

Until one of those happens, `supportsTablet: false` is the honest setting: it
takes the app off iPad in the App Store, and an iPad owner who wants it still
gets the phone build, letterboxed, which is what these captures show without
the pretence that it was designed for the screen.
