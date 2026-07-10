import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { createMatrixHardware } from "./hardware.js";
import type { RgbColor } from "./types.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const colorSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255)
});

const brightnessSchema = z.object({
  brightness: z.number().int().min(0).max(100)
});

const hardware = createMatrixHardware();
const app = Fastify({ logger: true });
const clientRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../client");

app.get("/api/status", async () => ({
  width: 64,
  height: 64,
  mode: hardware.mode,
  brightness: hardware.getBrightness()
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

app.post("/api/matrix/clear", async () => {
  hardware.clear();
  return { cleared: true };
});

await app.register(fastifyStatic, {
  root: clientRoot,
  wildcard: false
});

app.setNotFoundHandler((request, reply) => {
  if (request.method === "GET" && !request.url.startsWith("/api/")) {
    return reply.sendFile("index.html");
  }
  return reply.code(404).send({ error: "Not found" });
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
