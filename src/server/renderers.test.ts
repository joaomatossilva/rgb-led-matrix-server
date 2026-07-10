import assert from "node:assert/strict";
import test from "node:test";
import { fitImage, renderClockCalendar, renderText } from "./renderers.js";

test("renders centered white text on a 64x64 frame", () => {
  const frame = renderText("A");
  const lit = [];
  for (let index = 0; index < frame.pixels.length; index += 3) {
    if (frame.pixels[index] > 0) lit.push(index / 3);
  }
  assert.ok(lit.length > 0);
  assert.equal(frame.width, 64);
  assert.equal(frame.height, 64);
  assert.equal(frame.pixels[lit[0]! * 3], 255);
});

test("fits an image without stretching and keeps black letterboxing", () => {
  const pixels = new Uint8Array(100 * 50 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255;
    pixels[index + 3] = 255;
  }
  const frame = fitImage({ width: 100, height: 50, pixels });
  const center = (32 * 64 + 32) * 3;
  assert.equal(frame.pixels[center], 255);
  const corner = 0;
  assert.equal(frame.pixels[corner], 0);
});

test("renders the clock, date, and weekday", () => {
  const frame = renderClockCalendar(new Date(2026, 6, 10, 9, 5));
  const lit = frame.pixels.filter((value) => value > 0);
  assert.ok(lit.length > 0);
});
