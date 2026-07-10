import type { PixelFrame, RgbColor } from "./types.js";
import { createRequire } from "node:module";

type MatrixDriver = {
  clear(): void;
  brightness(value: number): void;
  setPixel(x: number, y: number, r: number, g: number, b: number): void;
  sync(): void;
};

export interface MatrixHardware {
  readonly mode: "hardware" | "mock";
  setColor(color: RgbColor): void;
  renderFrame(frame: PixelFrame): void;
  clear(): void;
  setBrightness(value: number): void;
  getBrightness(): number;
}

class MatrixController implements MatrixHardware {
  readonly mode: "hardware" | "mock";
  private brightness = 50;
  private readonly driver?: MatrixDriver;
  private lastFrame?: PixelFrame;

  constructor() {
    const mock = process.env.MATRIX_MOCK === "true";
    if (mock) {
      this.mode = "mock";
      return;
    }

    try {
      const moduleName = "rpi-led-matrix";
      const matrixModule = requireOptional(moduleName) as {
        LedMatrix: new (options: Record<string, unknown>) => MatrixDriver;
        GpioMapping: { AdafruitHat: string };
      };
      this.driver = new matrixModule.LedMatrix({
        rows: 64,
        cols: 64,
        chainLength: 1,
        parallel: 1,
        hardwareMapping: matrixModule.GpioMapping.AdafruitHat
      });
      this.mode = "hardware";
      this.driver.brightness(this.brightness);
    } catch (error) {
      if (process.env.MATRIX_MOCK !== "false") {
        console.warn("RGB matrix driver unavailable; using mock mode.");
        this.mode = "mock";
      } else {
        throw error;
      }
    }
  }

  setColor(color: RgbColor): void {
    if (!this.driver) return;
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        this.driver.setPixel(x, y, color.r, color.g, color.b);
      }
    }
    this.driver.sync();
  }

  renderFrame(frame: PixelFrame): void {
    this.lastFrame = frame;
    if (!this.driver) return;
    for (let y = 0; y < frame.height; y += 1) {
      for (let x = 0; x < frame.width; x += 1) {
        const offset = (y * frame.width + x) * 3;
        this.driver.setPixel(x, y, frame.pixels[offset], frame.pixels[offset + 1], frame.pixels[offset + 2]);
      }
    }
    this.driver.sync();
  }

  clear(): void {
    this.driver?.clear();
    this.driver?.sync();
  }

  setBrightness(value: number): void {
    this.brightness = value;
    this.driver?.brightness(value);
  }

  getBrightness(): number {
    return this.brightness;
  }
}

function requireOptional(moduleName: string): unknown {
  return createRequire(import.meta.url)(moduleName);
}

export function createMatrixHardware(): MatrixHardware {
  return new MatrixController();
}

export class MockMatrixHardware implements MatrixHardware {
  readonly mode = "mock" as const;
  private brightness = 50;
  lastFrame?: PixelFrame;

  setColor(color: RgbColor): void {
    const pixels = new Uint8Array(64 * 64 * 3);
    for (let index = 0; index < pixels.length; index += 3) {
      pixels[index] = color.r;
      pixels[index + 1] = color.g;
      pixels[index + 2] = color.b;
    }
    this.renderFrame({ width: 64, height: 64, pixels });
  }

  renderFrame(frame: PixelFrame): void {
    this.lastFrame = { ...frame, pixels: new Uint8Array(frame.pixels) };
  }

  clear(): void {
    this.lastFrame = undefined;
  }

  setBrightness(value: number): void {
    this.brightness = value;
  }

  getBrightness(): number {
    return this.brightness;
  }
}
