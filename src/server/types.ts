export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const MATRIX_WIDTH = 64;
export const MATRIX_HEIGHT = 64;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 64;

export type PixelFrame = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

export type StaticTextMode = {
  type: "static-text";
  text: string;
};

export type StaticImageMode = {
  type: "static-image";
  filename: string;
  mimeType: "image/png" | "image/jpeg";
  data: Buffer;
};

export type AnimatedImageMode = {
  type: "animated-image";
  filename: string;
  mimeType: "image/gif";
  data: Buffer;
};

export type DisplayMode = StaticTextMode | StaticImageMode | AnimatedImageMode;
export type ActiveMode = { type: DisplayMode["type"]; label: string } | null;
