import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { DisplayMode, PixelFrame } from "./types.js";
import { MATRIX_HEIGHT, MATRIX_WIDTH } from "./types.js";

type SourceImage = { width: number; height: number; pixels: Uint8Array };
export type AnimationFrame = { frame: PixelFrame; delayMs: number };

const FONT: Record<string, string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"]
};

export function createBlankFrame(): PixelFrame {
  return { width: MATRIX_WIDTH, height: MATRIX_HEIGHT, pixels: new Uint8Array(MATRIX_WIDTH * MATRIX_HEIGHT * 3) };
}

export function renderText(text: string): PixelFrame {
  const frame = createBlankFrame();
  drawText(frame, text, 1, Math.floor((MATRIX_HEIGHT - 7) / 2));
  return frame;
}

export function renderClockCalendar(now = new Date()): PixelFrame {
  const frame = createBlankFrame();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = `${String(now.getDate()).padStart(2, "0")} ${now.toLocaleString("en-US", { month: "short" }).toUpperCase()}`;
  const weekday = now.toLocaleString("en-US", { weekday: "long" }).toUpperCase();

  drawText(frame, time, 2, 2);
  drawText(frame, date, 1, 25);
  drawText(frame, weekday, 1, 37);
  return frame;
}

export function fitImage(source: SourceImage): PixelFrame {
  const frame = createBlankFrame();
  const scale = Math.min(MATRIX_WIDTH / source.width, MATRIX_HEIGHT / source.height);
  const targetWidth = Math.max(1, Math.round(source.width * scale));
  const targetHeight = Math.max(1, Math.round(source.height * scale));
  const offsetX = Math.floor((MATRIX_WIDTH - targetWidth) / 2);
  const offsetY = Math.floor((MATRIX_HEIGHT - targetHeight) / 2);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / targetWidth) * source.width));
      const sourceY = Math.min(source.height - 1, Math.floor((y / targetHeight) * source.height));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      setPixel(frame, offsetX + x, offsetY + y, source.pixels[sourceOffset], source.pixels[sourceOffset + 1], source.pixels[sourceOffset + 2]);
    }
  }
  return frame;
}

export function decodeImage(data: Buffer, mimeType: "image/png" | "image/jpeg"): SourceImage {
  if (mimeType === "image/png") {
    const image = PNG.sync.read(data);
    return { width: image.width, height: image.height, pixels: image.data };
  }
  const image = jpeg.decode(data, { useTArray: true });
  return { width: image.width, height: image.height, pixels: image.data };
}

export function decodeGif(data: Buffer): AnimationFrame[] {
  const gif = parseGIF(new Uint8Array(data).slice().buffer);
  const frames = decompressFrames(gif, true);
  const composed = new Uint8Array(gif.lsd.width * gif.lsd.height * 4);
  let previous: Uint8Array | undefined;
  let previousFrame: ParsedFrame | undefined;
  return frames.map((gifFrame) => {
    applyDisposal(composed, previous, previousFrame, gif.lsd.width);
    previous = gifFrame.disposalType === 3 ? new Uint8Array(composed) : undefined;
    previousFrame = gifFrame;
    drawGifPatch(composed, gifFrame, gif.lsd.width);
    return {
      frame: fitImage({ width: gif.lsd.width, height: gif.lsd.height, pixels: new Uint8Array(composed) }),
      delayMs: Math.max(20, gifFrame.delay * 10)
    };
  });
}

function drawGifPatch(target: Uint8Array, gifFrame: ParsedFrame, width: number): void {
  for (let y = 0; y < gifFrame.dims.height; y += 1) {
    for (let x = 0; x < gifFrame.dims.width; x += 1) {
      const patchOffset = (y * gifFrame.dims.width + x) * 4;
      const destinationOffset = ((gifFrame.dims.top + y) * width + gifFrame.dims.left + x) * 4;
      if (gifFrame.patch[patchOffset + 3] > 0) {
        target[destinationOffset] = gifFrame.patch[patchOffset];
        target[destinationOffset + 1] = gifFrame.patch[patchOffset + 1];
        target[destinationOffset + 2] = gifFrame.patch[patchOffset + 2];
        target[destinationOffset + 3] = gifFrame.patch[patchOffset + 3];
      }
    }
  }
}

function applyDisposal(target: Uint8Array, previous: Uint8Array | undefined, previousFrame: ParsedFrame | undefined, width: number): void {
  if (!previousFrame) return;
  if (previousFrame.disposalType === 2) {
    for (let y = 0; y < previousFrame.dims.height; y += 1) {
      for (let x = 0; x < previousFrame.dims.width; x += 1) {
        const offset = ((previousFrame.dims.top + y) * width + previousFrame.dims.left + x) * 4;
        target.fill(0, offset, offset + 4);
      }
    }
  } else if (previousFrame.disposalType === 3 && previous) {
    target.set(previous);
  }
}

function setPixel(frame: PixelFrame, x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || x >= frame.width || y < 0 || y >= frame.height) return;
  const offset = (y * frame.width + x) * 3;
  frame.pixels[offset] = r;
  frame.pixels[offset + 1] = g;
  frame.pixels[offset + 2] = b;
}

export function renderMode(mode: DisplayMode, now = new Date()): PixelFrame | AnimationFrame[] {
  if (mode.type === "static-text") return renderText(mode.text);
  if (mode.type === "static-image") return fitImage(decodeImage(mode.data, mode.mimeType));
  if (mode.type === "clock-calendar") return renderClockCalendar(now);
  return decodeGif(mode.data);
}

function drawText(frame: PixelFrame, text: string, scale: number, y: number): void {
  const characters = [...text.toUpperCase()];
  const width = characters.reduce((total, char) => total + (FONT[char] ?? FONT[" "]!).length * scale + scale, -scale);
  let x = Math.floor((MATRIX_WIDTH - width) / 2);
  for (const char of characters) {
    const glyph = FONT[char] ?? FONT[" "]!;
    glyph.forEach((row, glyphY) => [...row].forEach((pixel, glyphX) => {
      if (pixel !== "1") return;
      for (let offsetY = 0; offsetY < scale; offsetY += 1) {
        for (let offsetX = 0; offsetX < scale; offsetX += 1) {
          setPixel(frame, x + glyphX * scale + offsetX, y + glyphY * scale + offsetY, 255, 255, 255);
        }
      }
    }));
    x += (glyph.length + 1) * scale;
  }
}
