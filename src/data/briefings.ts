/**
 * Why anybody is asking.
 *
 * A logic grid is a table of facts about people who do not exist, and on its own
 * that is what it feels like. A briefing puts a room around it: something went
 * wrong, nobody wrote it down, and the only way back to the truth is the handful
 * of things people half-remember — which is exactly what the clues are.
 *
 * Three per theme, drawn by the seed like everything else, so a puzzle keeps its
 * story and two players comparing game 7 are talking about the same disaster.
 *
 * They name nobody and no set. Which sets a puzzle plays with is sampled from
 * the theme, so a briefing that promised a cargo manifest would sometimes be
 * describing a puzzle with no cargo in it; `{noun}` — the theme's own word for
 * one of its cast, the same slot the clue openers use — is the only thing filled
 * in. That also means a briefing gives nothing away: it says what happened, and
 * never what the answer is.
 */
import { createRng } from '../puzzle/rng';
import type { Puzzle } from '../puzzle/types';

export interface Briefing {
  /** What the mess is called. */
  title: string;
  /** Two or three sentences: the scene, the mishap, and why it matters. */
  body: string;
}

export const BRIEFINGS: Record<string, Briefing[]> = {
  cosmic: [
    {
      title: 'The manifest took a walk',
      body: 'The only printed copy of the flight paperwork was being read on the observation deck when somebody demonstrated the airlock. It is now in a slow orbit of its own, along with the pen. Nothing leaves the pad until every line of it has been put back, and the window closes on Thursday.',
    },
    {
      title: 'Filed by committee',
      body: 'Three departments each kept their own records so that nothing could possibly go missing, and each department has since misplaced a different half of theirs. Between them they are certain of everything except which {noun} is on which flight. The rockets are fuelled and the crews are being polite about it.',
    },
    {
      title: 'The computer was very confident',
      body: 'The scheduling system reconciled the roster overnight, congratulated itself, and assigned every {noun} to the same berth on the same flight. It cannot be persuaded to explain how. The engineers are working from the crew room whiteboard and whatever anyone can swear to.',
    },
  ],
  cafe: [
    {
      title: 'The order pad met the mop bucket',
      body: 'The morning rush was survived, the pad was set down on the wrong end of the counter, and the wrong end of the counter was where the bucket went over. The ink is a memory. The till has to balance by close, and until it does nobody knows who owes what.',
    },
    {
      title: 'The new machine ate everything',
      body: 'The card reader was upgraded on Tuesday and has since forgotten Monday, Wednesday and the concept of a receipt. Every regular came in, every regular was served, and the record of it is a shrug. The owner is being extremely calm about this in a way that is worrying everybody.',
    },
    {
      title: 'A very helpful customer',
      body: 'Somebody tidied the counter as a kindness, and in doing so squared up every scrap of paper on it into one beautiful pile in no order whatsoever. Everyone remembers their own morning perfectly and nobody remembers anyone else’s. The lunch shift starts in an hour.',
    },
  ],
  quest: [
    {
      title: 'The bard has been embellishing',
      body: 'The only account of the campaign is a ballad, and the ballad rhymes rather than reports. Every verse is true in some order, but the order is whichever one scanned. The guild will not pay out on a song, so somebody has to work out who actually did what.',
    },
    {
      title: 'The ledger was eaten',
      body: 'The quest ledger was kept in a locked chest, guarded by something that was later persuaded the chest was food. What survives is the memory of a tavern full of witnesses, none of whom were sober and all of whom were there. Nothing gets paid out until the claims agree with each other.',
    },
    {
      title: 'Everyone tells it differently',
      body: 'Everyone came back at once, everyone had done something worth telling, and every account begins with the word "obviously". They cannot all be right and none of them will go first. The guildmaster wants it settled before the drinks do it for him.',
    },
  ],
  reef: [
    {
      title: 'The dive log went for a dive',
      body: 'The log was on the transom, and then the swell was on the transom, and now the log is somewhere between the boat and the sea floor. Everyone surfaced happy and nobody wrote anything down. The permit needs the day’s numbers filed by Friday or the whole trip goes unrecorded.',
    },
    {
      title: 'Everything came off one line',
      body: 'Somebody rinsed everything at once, hung it on one line, and left it to the wind to decide whose was whose. Every {noun} is certain what they saw and vague about what they wore. The insurance form asks for both.',
    },
    {
      title: 'The tender was rewriting history',
      body: 'The boat tender kept the day’s notes on their hand, which then met a wave, sun cream and a towel in that order. What is left is four smudges and one word that might be "eel". The dive centre would like a version to pin on the board.',
    },
  ],
  garden: [
    {
      title: 'The entry cards blew away',
      body: 'The show marquee was open at both ends when the wind found it, and the entry cards left in a hurry. The entries are still on their benches, magnificent and entirely anonymous. Judging starts at two and the rosettes have to go to the right benches.',
    },
    {
      title: 'A very thorough watering',
      body: 'The sprinkler was set on a timer by somebody who does not trust timers, and so was also set off by hand. The paperwork was under the sprinkler. Every {noun} knows exactly what they grew and has firm opinions about everyone else’s.',
    },
    {
      title: 'The judge is new',
      body: 'This year’s judge reorganised the benches for a better light, which was thoughtful, and did it before the cards were checked, which was not. Nobody doubts the measurements; nobody can say whose they are. The blue ribbon is not going anywhere until this is straightened out.',
    },
  ],
};

/** A plain scene for a theme with nothing written for it. */
const FALLBACK: Briefing = {
  title: 'Nobody wrote it down',
  body: 'Everything about this was recorded carefully, and then it was not. What is left is what people remember, said one piece at a time — and between them, if you are careful, it comes to exactly one answer.',
};

/**
 * The briefing for a puzzle, which is the same one every time it is opened.
 *
 * Drawn from the seed, so it belongs to the puzzle rather than to the moment it
 * was asked for: closing the window and opening it again brings back the same
 * story, and a game picked up tomorrow is the game you left.
 */
export function briefingFor(puzzle: Puzzle): Briefing {
  const forTheme = BRIEFINGS[puzzle.themeId];
  if (!forTheme || forTheme.length === 0) return FALLBACK;
  // A different draw from the seed than the clue openers take, so a puzzle's
  // story and its first opener are not chosen in lockstep.
  const chosen = createRng(puzzle.seed + 104729).pick(forTheme);
  return { title: chosen.title, body: chosen.body.replace('{noun}', puzzle.categories[0].noun) };
}
