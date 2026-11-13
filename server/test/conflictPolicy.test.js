import test from "node:test";
import assert from "node:assert/strict";
import { compareChanges } from "../src/services/conflictPolicy.js";

test("later timestamp wins", () => {
  const incoming = {
    clientTimestamp: "2026-11-13T08:00:00.000Z",
    deviceId: "device-a"
  };
  const current = {
    updatedAt: "2026-11-13T07:59:00.000Z",
    deviceId: "device-z"
  };

  assert.equal(compareChanges(incoming, current), 1);
});

test("device ID provides deterministic tie-break", () => {
  const incoming = {
    clientTimestamp: "2026-11-13T08:00:00.000Z",
    deviceId: "device-z"
  };
  const current = {
    updatedAt: "2026-11-13T08:00:00.000Z",
    deviceId: "device-a"
  };

  assert.equal(compareChanges(incoming, current), 1);
});

test("same timestamp and device is equal", () => {
  const change = {
    clientTimestamp: "2026-11-13T08:00:00.000Z",
    deviceId: "device-a"
  };

  assert.equal(compareChanges(change, {
    updatedAt: change.clientTimestamp,
    deviceId: change.deviceId
  }), 0);
});
