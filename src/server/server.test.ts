import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "./server.js";
import { MockMatrixHardware } from "./hardware.js";

test("exposes status and static text mode endpoints", async () => {
  const app = await buildApp(new MockMatrixHardware());
  const status = await app.inject({ method: "GET", url: "/api/status" });
  assert.equal(status.statusCode, 200);
  assert.equal(status.json().displayMode, null);

  const response = await app.inject({
    method: "POST",
    url: "/api/matrix/modes/text",
    payload: { text: "Test" }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().mode.type, "static-text");
  await app.close();
});

test("rejects an empty text mode", async () => {
  const app = await buildApp(new MockMatrixHardware());
  const response = await app.inject({
    method: "POST",
    url: "/api/matrix/modes/text",
    payload: { text: "" }
  });
  assert.equal(response.statusCode, 400);
  await app.close();
});

test("activates the clock and calendar mode", async () => {
  const app = await buildApp(new MockMatrixHardware());
  const response = await app.inject({ method: "POST", url: "/api/matrix/modes/clock-calendar" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().mode, { type: "clock-calendar", label: "Clock / calendar" });
  await app.close();
});
