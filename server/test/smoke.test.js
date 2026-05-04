"use strict";

const { test } = require("node:test");
const assert = require("node:assert");

test("dependencies resolve", () => {
  assert.ok(require("bcryptjs"));
  assert.ok(require("better-sqlite3"));
  assert.ok(require("express-rate-limit"));
  assert.ok(typeof require("../routes/apiV1").use === "function");
});

test("notify in-app helpers", () => {
  const n = require("../lib/notify");
  assert.ok(typeof n.notifyInApp === "function");
  assert.ok(typeof n.notifyStaffInApp === "function");
});
