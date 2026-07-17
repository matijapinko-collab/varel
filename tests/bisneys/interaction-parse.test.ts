import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInteraction, extractContactName } from "../../src/lib/bisneyscrm/interactions/parse.ts";

test("parseInteraction: classic 'OUTBOUND CALL to <name>' → OUTBOUND_CALL + contact", () => {
  const r = parseInteraction("CC OUTBOUND CALL to Tihomir Stricevic", "TRELLO_COMMENT");
  assert.equal(r.type, "OUTBOUND_CALL");
  assert.equal(r.contactName, "Tihomir Stricevic");
  assert.ok(r.confidence >= 0.8);
  assert.equal(r.needsReview, false);
});

test("parseInteraction: inbound call recognised", () => {
  const r = parseInteraction("Inbound call — javio se sam", "TRELLO_COMMENT");
  assert.equal(r.type, "INBOUND_CALL");
});

test("parseInteraction: email / meeting / follow-up keywords", () => {
  assert.equal(parseInteraction("Poslao email s ponudom").type, "EMAIL");
  assert.equal(parseInteraction("Sastanak u uredu klijenta").type, "MEETING_NOTE");
  assert.equal(parseInteraction("Follow-up za idući tjedan").type, "FOLLOW_UP");
});

test("parseInteraction: unknown text keeps the fallback type, never mislabels", () => {
  const asTrello = parseInteraction("Uvijek žele bolje, no prodaja im je lošija", "TRELLO_COMMENT");
  assert.equal(asTrello.type, "TRELLO_COMMENT");
  const asNote = parseInteraction("Nekakva random bilješka", "GENERAL_NOTE");
  assert.equal(asNote.type, "GENERAL_NOTE");
});

test("parseInteraction: empty text is safe", () => {
  const r = parseInteraction("", "TRELLO_COMMENT");
  assert.equal(r.type, "TRELLO_COMMENT");
  assert.equal(r.confidence, 0);
});

test("parseInteraction: a bare generic 'call' is low-confidence → needsReview keeps fallback", () => {
  const r = parseInteraction("call", "TRELLO_COMMENT");
  assert.equal(r.needsReview, true);
  assert.equal(r.type, "TRELLO_COMMENT"); // not upgraded to OUTBOUND_CALL when unsure
});

test("extractContactName: pulls capitalised name after linking word, ignores lowercase noise", () => {
  assert.equal(extractContactName("razgovarao s Ivanom Horvatom danas"), "Ivanom Horvatom");
  assert.equal(extractContactName("meeting with Ana Marić"), "Ana Marić");
  assert.equal(extractContactName("nema imena ovdje"), null);
});
