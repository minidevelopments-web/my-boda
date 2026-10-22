import test from "node:test";
import assert from "node:assert/strict";
import { countdownParts } from "./demo.mjs";

test("splits a millisecond difference into days, hours, minutes and seconds", () => {
  const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
  assert.deepEqual(countdownParts(ms), { days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
});

test("clamps at zero once the date has passed", () => {
  assert.deepEqual(countdownParts(-1), { days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
});

test("floors partial seconds and marks the exact moment as done", () => {
  assert.deepEqual(countdownParts(1999), { days: 0, hours: 0, minutes: 0, seconds: 1, done: false });
  assert.equal(countdownParts(0).done, true);
});
