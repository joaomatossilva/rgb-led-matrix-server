# RGB LED Matrix Server

A small Node.js web server and Tailwind UI for controlling a 64x64 RGB LED matrix connected to a Raspberry Pi 3 through an Adafruit RGB Matrix HAT.

## Display modes

The UI supports four mutually exclusive modes:

- **Static text**: centered white bitmap text, limited to 64 characters.
- **Static image**: PNG or JPEG, aspect-fit into the matrix with black letterboxing.
- **Animated image**: GIF playback using the embedded frame timing and the same aspect-fit behavior.
- **Clock / calendar**: current local time in larger text, followed by the date and day of the week.

Selecting a new mode replaces the current display. Uploads are held in memory for the active display and are not persisted. The upload limit is 5 MB.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Development uses mock mode by default.

Run the automated checks with:

```bash
npm run typecheck
npm test
npm run build
```

## Raspberry Pi deployment

Install Node.js 20+ on the Pi, clone the repository, and run:

```bash
npm ci
cp .env.example .env
# Set MATRIX_MOCK=false in .env on the Raspberry Pi
npm run build
npm start
```

The optional `rpi-led-matrix` dependency uses the Adafruit HAT GPIO mapping. Image decoding is implemented with JavaScript libraries to avoid requiring native image packages on Raspberry Pi OS. Run the process with the permissions required by the matrix driver.

The server loads `.env` automatically. `MATRIX_MOCK=false` requires the `rpi-led-matrix` package and a working Raspberry Pi/Adafruit HAT; if the driver cannot initialize, startup fails instead of silently falling back to mock mode.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `MATRIX_MOCK` | hardware attempt | Use mock mode without matrix hardware |
