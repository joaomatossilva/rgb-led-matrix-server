import assert from "node:assert/strict";
import test from "node:test";
import { DisplayService } from "./display-service.js";
import { MockMatrixHardware } from "./hardware.js";

test("replaces the active mode and renders text", () => {
  const hardware = new MockMatrixHardware();
  const service = new DisplayService(hardware);
  service.showText("Hello");
  assert.deepEqual(service.mode, { type: "static-text", label: "Hello" });
  assert.ok(hardware.lastFrame);
  service.clear();
  assert.equal(service.mode, null);
  assert.equal(hardware.lastFrame, undefined);
});

test("rejects empty and oversized text", () => {
  const service = new DisplayService(new MockMatrixHardware());
  assert.throws(() => service.showText(" "));
  assert.throws(() => service.showText("x".repeat(65)));
});
