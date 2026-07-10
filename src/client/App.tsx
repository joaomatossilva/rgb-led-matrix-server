import { useEffect, useState } from "react";

type Color = { r: number; g: number; b: number };
type Status = { width: number; height: number; mode: "hardware" | "mock"; brightness: number };

const initialColor: Color = { r: 16, g: 185, b: 129 };

export function App() {
  const [color, setColor] = useState(initialColor);
  const [status, setStatus] = useState<Status>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/status").then((response) => response.json()).then(setStatus);
  }, []);

  const sendColor = async (nextColor: Color) => {
    setColor(nextColor);
    setBusy(true);
    await fetch("/api/matrix/color", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nextColor)
    });
    setBusy(false);
  };

  const setBrightness = async (brightness: number) => {
    setStatus((current) => current && { ...current, brightness });
    await fetch("/api/matrix/brightness", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brightness })
    });
  };

  const clearMatrix = async () => {
    setBusy(true);
    await fetch("/api/matrix/clear", { method: "POST" });
    setBusy(false);
  };

  const hex = `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Raspberry Pi</p>
            <h1 className="text-4xl font-bold tracking-tight">RGB Matrix Server</h1>
            <p className="mt-2 text-zinc-400">Control your 64x64 Adafruit HAT matrix.</p>
          </div>
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${status?.mode === "hardware" ? "bg-emerald-400" : "bg-amber-400"}`} />
            {status?.mode === "hardware" ? "Hardware connected" : "Mock mode"}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-semibold">Color</h2>
            <div className="mb-6 flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl border border-white/10 shadow-inner" style={{ backgroundColor: hex }} />
              <div>
                <p className="font-mono text-2xl font-semibold">{hex.toUpperCase()}</p>
                <p className="text-sm text-zinc-500">RGB {color.r}, {color.g}, {color.b}</p>
              </div>
            </div>
            <input
              aria-label="Matrix color"
              className="h-14 w-full cursor-pointer rounded-lg bg-zinc-800"
              type="color"
              value={hex}
              onChange={(event) => {
                const value = event.target.value;
                void sendColor({
                  r: parseInt(value.slice(1, 3), 16),
                  g: parseInt(value.slice(3, 5), 16),
                  b: parseInt(value.slice(5, 7), 16)
                });
              }}
            />
            <button className="mt-6 w-full rounded-lg bg-zinc-800 px-4 py-3 font-medium transition hover:bg-zinc-700 disabled:opacity-50" disabled={busy} onClick={clearMatrix}>
              Clear matrix
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-semibold">Preview</h2>
            <div className="mx-auto grid aspect-square max-w-[360px] grid-cols-8 gap-1 rounded-lg bg-black p-3 shadow-inner">
              {Array.from({ length: 64 }, (_, index) => (
                <span key={index} className="rounded-sm opacity-90" style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }} />
              ))}
            </div>
            <label className="mt-6 block text-sm text-zinc-400">
              Brightness <span className="float-right font-medium text-zinc-200">{status?.brightness ?? 50}%</span>
              <input
                className="mt-3 w-full accent-emerald-400"
                type="range"
                min="0"
                max="100"
                value={status?.brightness ?? 50}
                onChange={(event) => void setBrightness(Number(event.target.value))}
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
