# Every screen

Captured from the real build at iPhone proportions — a 15 Pro, 393 × 852, which
is the middle of the range the app is built for. **Regenerate these whenever the
UI changes** — `npm run screenshots` — so what is here always matches what the
app looks like; a change that alters a screen should land with fresh images in
the same commit. The same walk runs in CI, so a screen the script can no longer
get to fails the build rather than quietly dropping out of this page.

For what the same screens look like on a tablet, see **[On an iPad](ipad.md)**.

| | | |
|---|---|---|
| <img src="screenshots/01-start.png" width="230" alt="Start page"><br>**1. Start** — the name on a panel of the link colour, **Daily** and **Play** under it with a rule between, and the two side doors at the foot. | <img src="screenshots/02-setup.png" width="230" alt="The difficulties"><br>**2. Difficulty** — the same panel, the same half; only what is under it changes. | <img src="screenshots/03-numbers.png" width="230" alt="The numbered puzzles"><br>**3. Numbered puzzles** — every puzzle at that difficulty, counting from one, five to a page, each with a box that ticks when you finish it and your time beside it; the glass between **Previous** and **Next** zooms the list out. |
| <img src="screenshots/04-daily.png" width="230" alt="Daily challenges"><br>**4. Daily** — today's four, one per difficulty. A finished one shows its time and opens the result instead of a board. | <img src="screenshots/05-settings.png" width="230" alt="Settings screen"><br>**5. Settings** — seven names with a box or a slider against each, and nothing to read. | <img src="screenshots/06-briefing.png" width="230" alt="The briefing a puzzle opens with"><br>**6. Briefing** — what went wrong and why anybody wants it sorted out. It opens with the puzzle and waits behind **Info** afterwards. |
| <img src="screenshots/07-board.png" width="230" alt="The board"><br>**7. Grid** — a 4 × 4 puzzle as a 3 × 3 staircase of six grids, sized to fit the screen. | <img src="screenshots/08-menu.png" width="230" alt="Game menu"><br>**8. Puzzle settings** — behind the burger: the board pair and the colour, set the way the settings screen sets them, then starting this one over. | <img src="screenshots/09-clue.png" width="230" alt="The clue window"><br>**9. Clue** — one clue at a time, in a window with the room to read it, under a line saying who is supposed to have said it. |
| <img src="screenshots/10-highlight.png" width="230" alt="A clue lit up on the grids"><br>**10. Highlight** — the button at the bottom right lights every row and column the clue talks about. | <img src="screenshots/11-marked.png" width="230" alt="A part-marked board"><br>**11. Marked up** — a mark the player made is drawn heavily, one the board worked out for itself lightly. Same shape, same colour: the difference survives being colour-blind. | <img src="screenshots/12-stuck.png" width="230" alt="A board that can no longer be solved"><br>**12. Out of reach** — asking for a new clue checks the board first, and stops with a window offering to rewind when the answer has been marked away. |
| <img src="screenshots/13-item-card.png" width="230" alt="The card behind an item's picture"><br>**13. Item card** — tap any picture on the board to meet it, and page through the rest of its set. | <img src="screenshots/14-solved.png" width="230" alt="A finished game"><br>**14. Solved** — the finish takes the screen: time, clues read, how it compares, **Play again** and **Share**, the answer table. | <img src="screenshots/15-statistics.png" width="230" alt="Statistics screen"><br>**15. Statistics** — totals, bests by difficulty and the trend of recent solve times. |
| <img src="screenshots/16-night.png" width="230" alt="Setup screen in night colours"><br>**16. Night** — the difficulties in night colours, with a game waiting behind **Continue**. | <img src="screenshots/17-catalogue.png" width="230" alt="The numbered list zoomed out to groups of twenty-five"><br>**17. Zoomed out** — the numbered list two presses of the glass out: five rows of twenty-five puzzles, paged the same way, each opening to the pages inside it. | <img src="screenshots/18-lessons.png" width="230" alt="The How to play menu"><br>**18. How to play** — the third of the front door's words, and a menu rather than a board: two lessons in deduction and a door to the clues. |

| | | |
| --- | --- | --- |
| <img src="screenshots/19-clue-lessons.png" width="230" alt="The Understanding clues menu"><br>**19. Understanding clues** — one lesson per kind of clue the generator writes. | <img src="screenshots/20-lesson-briefing.png" width="230" alt="The briefing a lesson opens on"><br>**20. A lesson opens** — what it is about, in the window a puzzle tells its story in, ending with the one thing to do. | <img src="screenshots/21-lesson-clue.png" width="230" alt="A lesson's clue window"><br>**21. Clue** — the clue, what to do with it, and the press that has it read. |

| | | |
| --- | --- | --- |
| <img src="screenshots/22-lesson-board.png" width="230" alt="The lesson board part way through"><br>**22. The board** — the game screen exactly: the same header, zoom pair, and four words along the bottom. | <img src="screenshots/23-lesson-next.png" width="230" alt="The next step of the lesson"><br>**23. On to the next** — Clue read the board, found it right, and moved straight on. | |

The theme differs from run to run because it is drawn at random, and the
statistics screen is captured with a sample history baked into the script — the
rest is the app behaving normally.
