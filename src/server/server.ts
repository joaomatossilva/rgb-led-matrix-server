import Fastify, { type FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createMatrixHardware, type MatrixHardware } from "./hardware.js";
import { DisplayService } from "./display-service.js";
import type { RgbColor } from "./types.js";
import { MAX_UPLOAD_BYTES } from "./types.js";

const colorSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255)
});
const brightnessSchema = z.object({ brightness: z.number().int().min(0).max(100) });

export async function buildApp(hardware: MatrixHardware = createMatrixHardware()): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const display = new DisplayService(hardware);
  const clientRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../client");

  await app.register(fastifyMultipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2 }
  });

  app.get("/api/status", async () => ({
    width: 64,
    height: 64,
    matrixMode: hardware.mode,
    brightness: hardware.getBrightness(),
    displayMode: display.mode
  }));

  app.post<{ Body: RgbColor }>("/api/matrix/color", async (request, reply) => {
    const result = colorSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Invalid RGB color" });
    hardware.setColor(result.data);
    return { color: result.data };
  });

  app.post<{ Body: { brightness: number } }>("/api/matrix/brightness", async (request, reply) => {
    const result = brightnessSchema.safeParse(request.body);
    if (!result.success) return reply.code(400).send({ error: "Brightness must be between 0 and 100" });
    hardware.setBrightness(result.data.brightness);
    return { brightness: result.data.brightness };
  });

  app.post<{ Body: { text: string } }>("/api/matrix/modes/text", async (request, reply) => {
    try {
      display.showText(request.body?.text ?? "");
      return { mode: display.mode };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/api/matrix/modes/image", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "Image file is required" });
      const data = await file.toBuffer();
      display.showImage(file.filename, file.mimetype as "image/png" | "image/jpeg", data);
      return { mode: display.mode };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/api/matrix/modes/animation", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "GIF file is required" });
      const data = await file.toBuffer();
      display.showGif(file.filename, data);
      return { mode: display.mode };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/api/matrix/clear", async () => {
    display.clear();
    return { cleared: true };
  });

  await app.register(fastifyStatic, { root: clientRoot, wildcard: false });
  app.setNotFoundHandler((request, reply) => {
    if (request.method === "GET" && !request.url.startsWith("/api/")) return reply.sendFile("index.html");
    return reply.code(404).send({ error: "Not found" });
  });
  app.addHook("onClose", async () => display.stop());
  return app;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid request";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  const app = await buildApp();
  await app.listen({ port, host });
}
