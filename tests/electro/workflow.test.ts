import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionTask,
  taskCompletionRequiresReview,
  canTransitionIssue,
  issueResolutionRequiresSolution,
  dailyLogIsEditable,
} from "../../src/lib/electro/workflow.ts";

test("task: completion only via review (brief §21)", () => {
  assert.equal(canTransitionTask("IN_PROGRESS", "WAITING_FOR_REVIEW"), true);
  assert.equal(canTransitionTask("WAITING_FOR_REVIEW", "COMPLETED"), true);
  // An electrician can't jump IN_PROGRESS straight to COMPLETED.
  assert.equal(canTransitionTask("IN_PROGRESS", "COMPLETED"), false);
  assert.equal(taskCompletionRequiresReview("IN_PROGRESS"), true);
  assert.equal(taskCompletionRequiresReview("WAITING_FOR_REVIEW"), false);
  // COMPLETED is terminal.
  assert.equal(canTransitionTask("COMPLETED", "OPEN"), false);
});

test("issue: no OPEN→CLOSED shortcut; resolution needs a solution (brief §36)", () => {
  assert.equal(canTransitionIssue("OPEN", "CLOSED"), false);
  assert.equal(canTransitionIssue("OPEN", "IN_PROGRESS"), true);
  assert.equal(canTransitionIssue("IN_PROGRESS", "RESOLVED"), true);
  assert.equal(canTransitionIssue("RESOLVED", "VERIFIED"), true);
  assert.equal(canTransitionIssue("VERIFIED", "CLOSED"), true);
  assert.equal(issueResolutionRequiresSolution("RESOLVED"), true);
  assert.equal(issueResolutionRequiresSolution("VERIFIED"), false);
});

test("daily log: locked logs are not editable (brief §33)", () => {
  assert.equal(dailyLogIsEditable("DRAFT"), true);
  assert.equal(dailyLogIsEditable("SUBMITTED"), true);
  assert.equal(dailyLogIsEditable("APPROVED"), false);
  assert.equal(dailyLogIsEditable("LOCKED"), false);
});
