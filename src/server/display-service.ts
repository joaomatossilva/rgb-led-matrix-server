import type { MatrixHardware } from "./hardware.js";
import { decodeGif, renderClockCalendar, renderMode } from "./renderers.js";
import type { ActiveMode, DisplayMode } from "./types.js";
import { MAX_TEXT_LENGTH, MAX_UPLOAD_BYTES } from "./types.js";

export class DisplayService {
  private activeMode: ActiveMode = null;
  private animationTimer?: NodeJS.Timeout;
  private clockTimer?: NodeJS.Timeout;
  private generation = 0;

  constructor(private readonly hardware: MatrixHardware) {}

  get mode(): ActiveMode {
    return this.activeMode;
  }

  showText(text: string): void {
    const normalized = text.trim();
    if (!normalized) throw new Error("Text is required");
    if (normalized.length > MAX_TEXT_LENGTH) throw new Error(`Text must be ${MAX_TEXT_LENGTH} characters or fewer`);
    this.replace({ type: "static-text", text: normalized });
  }

  showImage(filename: string, mimeType: "image/png" | "image/jpeg", data: Buffer): void {
    if (mimeType !== "image/png" && mimeType !== "image/jpeg") throw new Error("Static image must be PNG or JPEG");
    this.assertUpload(filename, mimeType, data);
    this.replace({ type: "static-image", filename, mimeType, data });
  }

  showGif(filename: string, data: Buffer): void {
    this.assertUpload(filename, "image/gif", data);
    this.replace({ type: "animated-image", filename, mimeType: "image/gif", data });
  }

  showClock(): void {
    this.replace({ type: "clock-calendar" });
  }

  clear(): void {
    this.stopTimers();
    this.activeMode = null;
    this.hardware.clear();
  }

  stop(): void {
    this.stopTimers();
  }

  private replace(mode: DisplayMode): void {
    this.stopTimers();
    const generation = ++this.generation;
    const rendered = renderMode(mode);
    this.activeMode = {
      type: mode.type,
      label: mode.type === "static-text" ? mode.text : mode.type === "clock-calendar" ? "Clock / calendar" : mode.filename
    };
    if (Array.isArray(rendered)) {
      this.playAnimation(rendered, generation, 0);
    } else if (mode.type === "clock-calendar") {
      this.hardware.renderFrame(renderClockCalendar());
      this.playClock(mode, generation);
    } else {
      this.hardware.renderFrame(rendered);
    }
  }

  private playClock(mode: DisplayMode, generation: number): void {
    this.clockTimer = setTimeout(() => {
      if (generation !== this.generation || mode.type !== "clock-calendar") return;
      this.hardware.renderFrame(renderClockCalendar());
      this.playClock(mode, generation);
    }, 1000);
  }

  private playAnimation(frames: ReturnType<typeof decodeGif>, generation: number, index: number): void {
    if (generation !== this.generation || frames.length === 0) return;
    const current = frames[index];
    this.hardware.renderFrame(current.frame);
    this.animationTimer = setTimeout(() => this.playAnimation(frames, generation, (index + 1) % frames.length), current.delayMs);
  }

  private stopTimers(): void {
    this.generation += 1;
    if (this.animationTimer) clearTimeout(this.animationTimer);
    if (this.clockTimer) clearTimeout(this.clockTimer);
    this.animationTimer = undefined;
    this.clockTimer = undefined;
  }

  private assertUpload(filename: string, mimeType: string, data: Buffer): void {
    if (data.length > MAX_UPLOAD_BYTES) throw new Error(`Upload must be ${MAX_UPLOAD_BYTES / 1024 / 1024}MB or smaller`);
    if (!filename.trim()) throw new Error("Filename is required");
    if (!["image/png", "image/jpeg", "image/gif"].includes(mimeType)) throw new Error("Unsupported image type");
  }
}
