/**
 * English sentence splitter tuned for read-aloud / shadowing practice.
 *
 * Splitting on "." alone breaks on Mr. / Dr. / U.S. / e.g. / i.e. and friends,
 * so every candidate boundary is vetoed against three tiers of abbreviations
 * plus structural rules (quotes, brackets, decimals, initials, ellipses).
 *
 * Pure module: no DOM, no globals. Also used by tests/splitter.test.mjs.
 */

/**
 * Tier 1 - never a sentence end. These are always glued to whatever follows
 * (a name, a number, a noun), so a following capital letter proves nothing.
 */
export const ABBR_NEVER = [
  // Titles
  "Mr", "Mrs", "Ms", "Mx", "Dr", "Prof", "Rev", "Fr", "Msgr",
  "Gen", "Col", "Capt", "Lt", "Sgt", "Cpl", "Maj", "Adm", "Cmdr", "Pvt",
  "Gov", "Sen", "Rep", "Pres", "Supt", "Insp", "Ofc", "Hon", "Amb",
  // Places
  "St", "Mt", "Ft", "Rd", "Ave", "Blvd", "Ln", "Ste", "Apt", "Bldg",
  // Reference / measurement
  "Fig", "figs", "No", "Nos", "Vol", "Ch", "Sec", "Art", "Ed", "Eds",
  "p", "pp", "para", "vs", "v", "cf", "ca", "approx", "est", "min", "max",
  "Dept", "Univ", "Inst", "Assn", "Bros", "Mfg",
  // Latin connectives that always introduce something
  "e.g", "i.e", "viz", "cx", "resp",
  // Months (always followed by a day/year)
  "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sept", "Sep", "Oct", "Nov", "Dec",
  // Weekdays
  "Mon", "Tue", "Tues", "Wed", "Weds", "Thu", "Thur", "Thurs", "Fri", "Sat", "Sun",
];

/**
 * Tier 2 - can legitimately end a sentence. Split when the next word is
 * capitalised, because these are rarely followed by a capitalised word
 * inside the same clause.
 */
export const ABBR_SOFT = [
  "etc", "al", "ibid", "Inc", "Ltd", "Co", "Corp", "LLC", "PLC", "Jr", "Sr",
  "a.m", "p.m", "A.M", "P.M", "Ph.D", "PhD", "M.D", "B.A", "M.A", "B.S", "M.S",
  "LL.B", "LL.M", "D.D.S", "R.N",
];

/**
 * Tier 3 - dotted acronyms. "U.S. Army" and "U.S. Then he left." look
 * identical to a capital-letter test, so these additionally require the next
 * word to be a plausible sentence opener. Any token matching
 * /^(?:[A-Za-z]\.){2,}$/ is treated as tier 3 even if unlisted.
 */
export const ABBR_ACRONYM = [
  "U.S", "U.S.A", "U.K", "U.N", "E.U", "D.C", "A.D", "B.C", "B.C.E", "C.E",
  "U.A.E", "N.Y", "L.A",
];

/** Words that plausibly open a new sentence (used only for tier 3). */
const SENTENCE_STARTERS = new Set([
  "the", "a", "an", "he", "she", "it", "they", "we", "i", "you", "this", "that",
  "these", "those", "there", "here", "his", "her", "its", "their", "our", "my",
  "your", "but", "and", "or", "so", "yet", "for", "nor", "however", "then",
  "therefore", "thus", "moreover", "meanwhile", "furthermore", "nevertheless",
  "nonetheless", "although", "though", "because", "since", "while", "when",
  "whenever", "where", "wherever", "if", "unless", "until", "after", "before",
  "as", "at", "in", "on", "by", "to", "from", "with", "without", "during",
  "many", "most", "some", "few", "several", "both", "each", "every", "all",
  "no", "not", "now", "later", "today", "yesterday", "tomorrow", "finally",
  "first", "second", "third", "next", "last", "one", "two", "three", "still",
  "also", "even", "just", "only", "once", "again", "instead", "rather",
  "perhaps", "maybe", "indeed", "of", "about", "over", "under", "between",
  "what", "who", "whose", "which", "why", "how", "let", "do", "does", "did",
  "is", "are", "was", "were", "be", "been", "have", "has", "had", "will",
  "would", "can", "could", "should", "may", "might", "must", "sometimes",
  "often", "usually", "always", "never", "yes", "well", "okay", "ok",
]);

const TERMINATORS = new Set([".", "!", "?", "…"]);
const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);
/** Characters allowed to trail a terminator before the boundary is taken. */
const TRAILING = new Set([")", "]", "}", '"', "'", "”", "’", "»", "›"]);
/** Characters that may sit between a boundary and the next sentence's first letter. */
const LEADING = new Set(["(", "[", "{", '"', "'", "“", "‘", "«", "‹", "-", "—", "–"]);

const WORD_CHAR = /[A-Za-z0-9.'\u2019\u2010-\u2015-]/;

/** Strip a trailing period and lowercase-insensitively normalise for lookup. */
function normaliseAbbr(token) {
  return token.replace(/\.$/, "");
}

function buildAbbrIndex(list) {
  const set = new Set();
  for (const raw of list) {
    const item = String(raw).trim();
    if (!item) continue;
    set.add(normaliseAbbr(item).toLowerCase());
  }
  return set;
}

/**
 * The maximal word-ish token ending at index `end` (inclusive).
 * "...saw Mr." -> "Mr."   "...the U.S." -> "U.S."   "...is 3.14" -> "3.14"
 */
function tokenEndingAt(text, end) {
  let start = end;
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
  return { token: text.slice(start, end + 1), start };
}

/** True when nothing but whitespace precedes `index` on its line. */
function atLineStart(text, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (text[i] === "\n") return true;
    if (!/[ \t]/.test(text[i])) return false;
  }
  return true;
}

/** First word after index `from`, skipping spaces and opening punctuation. */
function nextWordAfter(text, from) {
  let i = from;
  while (i < text.length && (/\s/.test(text[i]) || LEADING.has(text[i]))) i++;
  let j = i;
  while (j < text.length && /[A-Za-z'’-]/.test(text[j])) j++;
  return { word: text.slice(i, j), index: i };
}

const DOTTED_ACRONYM = /^(?:[A-Za-z]\.){2,}$/;
const SINGLE_INITIAL = /^[A-Z]\.$/;
const LIST_MARKER = /^\d{1,3}\.$/;

/**
 * Decide whether the terminator run ending at `termEnd` closes a sentence.
 */
function isBoundary(text, termStart, termEnd, boundaryEnd, abbr) {
  const run = text.slice(termStart, termEnd + 1);
  const after = nextWordAfter(text, boundaryEnd);

  // Nothing meaningful left: this terminator closes the final sentence.
  if (after.index >= text.length) return true;

  const nextIsLower = /^[a-z]/.test(after.word);
  const nextIsCapital = /^[A-Z]/.test(after.word);
  const periodFamily = /^[.\u2026]+$/.test(run);

  // "!", "?" and ellipses break unless the next word continues the clause,
  // as in: "Stop!" she shouted.
  if (!periodFamily || run.length > 1 || run === "\u2026") return !nextIsLower;

  const { token, start } = tokenEndingAt(text, termEnd);

  // "1." opening a line is a list marker, not a sentence of its own.
  if (LIST_MARKER.test(token) && atLineStart(text, start)) return false;
  // "J. R. R. Tolkien"
  if (SINGLE_INITIAL.test(token)) return false;

  const key = normaliseAbbr(token).toLowerCase();
  if (abbr.never.has(key)) return false;
  if (abbr.soft.has(key)) return nextIsCapital;
  if (abbr.acronym.has(key) || DOTTED_ACRONYM.test(token)) {
    return nextIsCapital && SENTENCE_STARTERS.has(after.word.toLowerCase());
  }

  // A period followed by a lowercase word is not a break.
  return !nextIsLower;
}

const CLAUSE_BREAK = /[,;:—]\s|\s(?:and|but|or|so|because|which|who|that|while|although|though|when|after|before|if|unless|since)\s/gi;

/**
 * Kokoro truncates beyond ~510 phoneme tokens, and a 60-word sentence is
 * unusable for shadowing anyway. Break over-long sentences at the clause
 * boundary nearest the middle, recursively.
 */
function softSplitLong(sentence, maxChars) {
  if (sentence.length <= maxChars) return [sentence];

  const candidates = [];
  CLAUSE_BREAK.lastIndex = 0;
  let m;
  while ((m = CLAUSE_BREAK.exec(sentence)) !== null) {
    // Cut after a punctuation mark, before a conjunction.
    const cut = /^[,;:—]/.test(m[0]) ? m.index + 1 : m.index;
    if (cut > 20 && cut < sentence.length - 20) candidates.push(cut);
    CLAUSE_BREAK.lastIndex = m.index + 1;
  }
  if (candidates.length === 0) {
    // No clause boundary: fall back to the last space before the limit.
    const hard = sentence.lastIndexOf(" ", maxChars);
    if (hard <= 0) return [sentence];
    return [
      sentence.slice(0, hard).trim(),
      ...softSplitLong(sentence.slice(hard).trim(), maxChars),
    ];

  }

  const mid = sentence.length / 2;
  let best = candidates[0];
  for (const c of candidates) {
    if (Math.abs(c - mid) < Math.abs(best - mid)) best = c;
  }
  return [
    ...softSplitLong(sentence.slice(0, best).trim(), maxChars),
    ...softSplitLong(sentence.slice(best).trim(), maxChars),
  ];
}

/**
 * Split English text into sentences.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {string[]} [options.never]        extra tier-1 abbreviations
 * @param {string[]} [options.soft]         extra tier-2 abbreviations
 * @param {string[]} [options.acronym]      extra tier-3 abbreviations
 * @param {boolean}  [options.splitOnNewline=false] treat every line break as a boundary
 * @param {number}   [options.maxChars=280] soft limit before clause-splitting
 * @returns {string[]}
 */
export function splitSentences(text, options = {}) {
  const {
    never = [],
    soft = [],
    acronym = [],
    splitOnNewline = false,
    maxChars = 280,
  } = options;

  const abbr = {
    never: buildAbbrIndex([...ABBR_NEVER, ...never]),
    soft: buildAbbrIndex([...ABBR_SOFT, ...soft]),
    acronym: buildAbbrIndex([...ABBR_ACRONYM, ...acronym]),
  };

  const source = String(text ?? "").replace(/\r\n?/g, "\n");
  // Paragraph breaks are always hard boundaries; optionally single newlines too.
  const blockPattern = splitOnNewline ? /\n+/ : /\n[ \t]*\n+/;
  const blocks = source.split(blockPattern);

  const result = [];
  for (const block of blocks) {
    if (!block.trim()) continue;
    for (const sentence of splitBlock(block, abbr)) {
      for (const piece of softSplitLong(sentence, maxChars)) {
        const clean = piece.replace(/\s+/g, " ").trim();
        if (clean) result.push(clean);
      }
    }
  }
  return mergeStrays(result);
}

function splitBlock(block, abbr) {
  const out = [];
  let start = 0;
  let depth = 0;
  let inStraightQuote = false;
  let inCurlyQuote = false;
  let suppressUntil = -1;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];

    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) depth = Math.max(0, depth - 1);
    else if (ch === '"') inStraightQuote = !inStraightQuote;
    else if (ch === "“") inCurlyQuote = true;
    else if (ch === "”") inCurlyQuote = false;

    if (i < suppressUntil) continue;
    if (!TERMINATORS.has(ch)) continue;

    // Absorb a run of terminators: "...", "?!", "!!"
    let termEnd = i;
    while (termEnd + 1 < block.length && TERMINATORS.has(block[termEnd + 1])) termEnd++;

    // Absorb closing quotes/brackets that belong to this sentence.
    let end = termEnd + 1;
    while (end < block.length && TRAILING.has(block[end])) end++;

    // A boundary must be followed by whitespace or end of block.
    // This alone kills decimals (3.14) and URLs (www.example.com).
    if (end < block.length && !/\s/.test(block[end])) continue;

    // Still inside a bracket or an open quote: not a sentence break.
    const stillOpen =
      depth > 0 ||
      inStraightQuote ||
      inCurlyQuote;
    const closedHere = block.slice(termEnd + 1, end);
    if (stillOpen && !/[)\]}"”]/.test(closedHere)) continue;

    if (!isBoundary(block, i, termEnd, end, abbr)) continue;

    const sentence = block.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
    suppressUntil = end;
  }

  const tail = block.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Glue fragments that are too short to practise onto the previous sentence. */
function mergeStrays(sentences) {
  const out = [];
  for (const s of sentences) {
    const bare = s.replace(/[^A-Za-z0-9]/g, "");
    if (out.length > 0 && bare.length <= 1) {
      out[out.length - 1] += " " + s;
    } else {
      out.push(s);
    }
  }
  return out;
}
