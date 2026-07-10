import type { PixelFrame, RgbColor } from "./types.js";
import { createRequire } from "node:module";

type MatrixDriver = {
  clear(): void;
  brightness(value: number): void;
  fill(): void;
  fgColor(color: RgbColor): MatrixDriver;
  drawBuffer(buffer: Buffer, width?: number, height?: number): MatrixDriver;
  setPixel(x: number, y: number): MatrixDriver;
  sync(): void;
};

type MatrixModule = {
  LedMatrix: {
    new (matrixOptions: Record<string, unknown>, runtimeOptions: Record<string, unknown>): MatrixDriver;
    defaultMatrixOptions(): Record<string, unknown>;
    defaultRuntimeOptions(): Record<string, unknown>;
  };
  GpioMapping: {
    AdafruitHat: string;
  };
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
      const matrixModule = requireOptional(moduleName) as MatrixModule;
      const matrixOptions = {
        ...matrixModule.LedMatrix.defaultMatrixOptions(),
        rows: 64,
        cols: 64,
        chainLength: 1,
        parallel: 1,
        hardwareMapping: matrixModule.GpioMapping.AdafruitHat
      };
      const runtimeOptions = matrixModule.LedMatrix.defaultRuntimeOptions();
      this.driver = new matrixModule.LedMatrix(matrixOptions, runtimeOptions);
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
    this.driver.fgColor(color).fill();
    this.driver.sync();
  }

  renderFrame(frame: PixelFrame): void {
    this.lastFrame = frame;
    if (!this.driver) return;
    this.driver.drawBuffer(Buffer.from(frame.pixels), frame.width, frame.height);
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
