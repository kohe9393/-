import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../src/splitter.js";

const eq = (input, expected, options) =>
  assert.deepEqual(splitSentences(input, options), expected);

test("plain sentences", () => {
  eq("I woke up early. I went for a run. It was cold.", [
    "I woke up early.",
    "I went for a run.",
    "It was cold.",
  ]);
});

test("titles are never sentence ends", () => {
  eq("I saw Mr. Smith today. He looked well.", [
    "I saw Mr. Smith today.",
    "He looked well.",
  ]);
  eq("Dr. Chen and Prof. Adams met St. Paul at Mt. Fuji.", [
    "Dr. Chen and Prof. Adams met St. Paul at Mt. Fuji.",
  ]);
});

test("latin abbreviations stay inline", () => {
  eq("Bring fruit, e.g. apples and pears. Then go home.", [
    "Bring fruit, e.g. apples and pears.",
    "Then go home.",
  ]);
  eq("It is cheap, i.e. free. Buy it now.", [
    "It is cheap, i.e. free.",
    "Buy it now.",
  ]);
});

test("etc. can end a sentence", () => {
  eq("We bought apples, pears, etc. Then we left.", [
    "We bought apples, pears, etc.",
    "Then we left.",
  ]);
  eq("We bought apples, etc. and then left.", [
    "We bought apples, etc. and then left.",
  ]);
});

test("dotted acronyms use the sentence-opener test", () => {
  eq("The U.S. Army is large.", ["The U.S. Army is large."]);
  eq("He moved to the U.S. Then he stayed.", [
    "He moved to the U.S.",
    "Then he stayed.",
  ]);
  eq("She studied in the U.K. She liked it.", [
    "She studied in the U.K.",
    "She liked it.",
  ]);
});

test("a.m. / p.m. split before a capital", () => {
  eq("We met at 5 p.m. Then we left.", ["We met at 5 p.m.", "Then we left."]);
  eq("The train leaves at 6 a.m. sharp.", ["The train leaves at 6 a.m. sharp."]);
});

test("initials are not boundaries", () => {
  eq("J. R. R. Tolkien wrote it. I read it twice.", [
    "J. R. R. Tolkien wrote it.",
    "I read it twice.",
  ]);
});

test("decimals, urls and emails survive", () => {
  eq("Pi is about 3.14. That is enough.", [
    "Pi is about 3.14.",
    "That is enough.",
  ]);
  eq("Visit www.example.com for details. It is free.", [
    "Visit www.example.com for details.",
    "It is free.",
  ]);
  eq("Mail me at foo.bar@example.co.uk today.", [
    "Mail me at foo.bar@example.co.uk today.",
  ]);
});

test("periods inside quotes close with the quote", () => {
  eq('He said, "Go home." Then he left.', [
    'He said, "Go home."',
    "Then he left.",
  ]);
  eq("He said, “Go home.” Then he left.", [
    "He said, “Go home.”",
    "Then he left.",
  ]);
});

test("an exclamation inside quotes does not split off the speech tag", () => {
  eq('"Stop!" she shouted. He froze.', ['"Stop!" she shouted.', "He froze."]);
});

test("periods inside brackets do not split", () => {
  eq("He left (he was tired. really) and came back.", [
    "He left (he was tired. really) and came back.",
  ]);
  eq("Read the guide (see Fig. 2). Then start.", [
    "Read the guide (see Fig. 2).",
    "Then start.",
  ]);
});

test("ellipses only break before a capital", () => {
  eq("I was not sure... maybe it was fine.", [
    "I was not sure... maybe it was fine.",
  ]);
  eq("I waited... Then it arrived.", ["I waited...", "Then it arrived."]);
});

test("question and exclamation marks", () => {
  eq("Are you ready? Yes! Let us go.", ["Are you ready?", "Yes!", "Let us go."]);
  eq("What?! I cannot believe it.", ["What?!", "I cannot believe it."]);
});

test("list markers stay with their item", () => {
  eq("1. Boil water.\n2. Add pasta.", ["1. Boil water.", "2. Add pasta."], {
    splitOnNewline: true,
  });
});

test("paragraph breaks are hard boundaries", () => {
  eq("First para\n\nSecond para", ["First para", "Second para"]);
});

test("single newlines only split when asked", () => {
  eq("line one\nline two", ["line one line two"]);
});

test("newline mode splits every line", () => {
  eq("line one\nline two", ["line one", "line two"], { splitOnNewline: true });
});

test("user-supplied abbreviations are honoured", () => {
  eq("Contact Acme Ltd. Smith is away.", [
    "Contact Acme Ltd.",
    "Smith is away.",
  ]);
  eq("See Approx. 40 units shipped.", ["See Approx. 40 units shipped."]);
  eq("Ask Blah. Then go.", ["Ask Blah. Then go."], { never: ["Blah"] });
});

test("over-long sentences are clause-split for the TTS token limit", () => {
  const long =
    "The committee met in the morning to review the annual budget, " +
    "and after a long discussion about staffing levels they agreed to " +
    "postpone the final vote until the following quarter because several " +
    "members were travelling abroad on business at the time.";
  const out = splitSentences(long, { maxChars: 120 });
  assert.ok(out.length >= 2, "expected the long sentence to be broken up");
  for (const s of out) assert.ok(s.length <= 160, `too long: ${s.length}`);
  assert.equal(out.join(" ").replace(/\s+/g, " "), long.replace(/\s+/g, " "));
});

test("empty and whitespace input", () => {
  eq("", []);
  eq("   \n\n  ", []);
  eq(null, []);
});

test("no text is ever lost", () => {
  const src =
    'Dr. Ada met Mr. Lee at 9 a.m. They talked about the U.S. economy. ' +
    '"It is fine," she said. Really?! Yes... it is.';
  const parts = splitSentences(src);
  assert.equal(parts.join(" ").replace(/\s+/g, " "), src.replace(/\s+/g, " "));
});
