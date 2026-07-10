import type { RgbColor } from "./types.js";
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
  clear(): void;
  setBrightness(value: number): void;
  getBrightness(): number;
}

class MatrixController implements MatrixHardware {
  readonly mode: "hardware" | "mock";
  private brightness = 50;
  private readonly driver?: MatrixDriver;

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
