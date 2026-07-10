import { useEffect, useState } from "react";

type DisplayType = "static-text" | "static-image" | "animated-image";
type Status = {
  width: number;
  height: number;
  matrixMode: "hardware" | "mock";
  brightness: number;
  displayMode: { type: DisplayType; label: string } | null;
};

const modes: { type: DisplayType; label: string; description: string }[] = [
  { type: "static-text", label: "Static text", description: "Show centered bitmap text" },
  { type: "static-image", label: "Static image", description: "Display a PNG or JPEG" },
  { type: "animated-image", label: "Animated image", description: "Play a GIF animation" }
];

export function App() {
  const [selectedMode, setSelectedMode] = useState<DisplayType>("static-text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshStatus = () => fetch("/api/status").then((response) => response.json() as Promise<Status>).then(setStatus);
  useEffect(() => { void refreshStatus(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const options: RequestInit = selectedMode === "static-text"
        ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }
        : { method: "POST", body: createFormData(file) };
      const response = await fetch(`/api/matrix/modes/${selectedMode === "static-text" ? "text" : selectedMode === "static-image" ? "image" : "animation"}`, options);
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update the matrix");
      await refreshStatus();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to update the matrix");
    } finally {
      setBusy(false);
    }
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
    await fetch("/api/matrix/clear", { method: "POST" });
    await refreshStatus();
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Raspberry Pi</p>
            <h1 className="text-4xl font-bold tracking-tight">RGB Matrix Server</h1>
            <p className="mt-2 text-zinc-400">Control your 64x64 Adafruit HAT matrix.</p>
          </div>
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${status?.matrixMode === "hardware" ? "bg-emerald-400" : "bg-amber-400"}`} />
            {status?.matrixMode === "hardware" ? "Hardware connected" : "Mock mode"}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-semibold">Display mode</h2>
            <div className="mb-6 grid gap-2">
              {modes.map((mode) => (
                <button key={mode.type} className={`rounded-lg border p-3 text-left transition ${selectedMode === mode.type ? "border-emerald-400 bg-emerald-400/10" : "border-zinc-800 hover:border-zinc-600"}`} onClick={() => { setSelectedMode(mode.type); setError(""); }}>
                  <span className="block font-medium">{mode.label}</span>
                  <span className="text-sm text-zinc-500">{mode.description}</span>
                </button>
              ))}
            </div>
            <form onSubmit={submit}>
              {selectedMode === "static-text" ? (
                <label className="block text-sm text-zinc-400">Text
                  <textarea className="mt-2 min-h-28 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 outline-none focus:border-emerald-400" maxLength={64} value={text} onChange={(event) => setText(event.target.value)} placeholder="Hello, matrix!" />
                </label>
              ) : (
                <label className="block text-sm text-zinc-400">Upload {selectedMode === "static-image" ? "PNG or JPEG" : "GIF"}
                  <input className="mt-2 block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:font-medium file:text-zinc-950" accept={selectedMode === "static-image" ? "image/png,image/jpeg" : "image/gif"} type="file" onChange={(event) => setFile(event.target.files?.[0])} />
                </label>
              )}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <button className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50" disabled={busy} type="submit">
                {busy ? "Updating..." : "Display on matrix"}
              </button>
            </form>
            <button className="mt-3 w-full rounded-lg bg-zinc-800 px-4 py-3 font-medium transition hover:bg-zinc-700" onClick={clearMatrix}>Clear matrix</button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Preview</h2>
              <span className="text-sm text-zinc-500">{status?.displayMode?.type ?? "empty"}</span>
            </div>
            <div className="mx-auto flex aspect-square max-w-[360px] items-center justify-center rounded-lg bg-black p-6 text-center shadow-inner">
              {status?.displayMode?.type === "static-text" ? <span className="break-words text-2xl font-bold text-white">{status.displayMode.label}</span> : status?.displayMode ? <span className="text-zinc-500">{status.displayMode.label}</span> : <span className="text-zinc-700">Matrix is clear</span>}
            </div>
            <label className="mt-6 block text-sm text-zinc-400">
              Brightness <span className="float-right font-medium text-zinc-200">{status?.brightness ?? 50}%</span>
              <input className="mt-3 w-full accent-emerald-400" type="range" min="0" max="100" value={status?.brightness ?? 50} onChange={(event) => void setBrightness(Number(event.target.value))} />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}

function createFormData(file?: File): FormData {
  const data = new FormData();
  if (file) data.append("file", file);
  return data;
}
