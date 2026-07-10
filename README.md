# RGB LED Matrix Server

A small Node.js web server and Tailwind UI for controlling a 64x64 RGB LED matrix connected to a Raspberry Pi 3 through an Adafruit RGB Matrix HAT.

## Development

```bash
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173. Development uses mock mode by default.

## Raspberry Pi deployment

Install Node.js 20+ on the Pi, clone the repository, and run:

```bash
npm ci
cp .env.example .env
# Set MATRIX_MOCK=false in .env
npm run build
npm start
```

The optional `rpi-led-matrix` dependency uses the Adafruit HAT GPIO mapping. Run the process with the permissions required by the matrix driver.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `MATRIX_MOCK` | hardware attempt | Use mock mode without matrix hardware |
