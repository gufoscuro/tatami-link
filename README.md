# Tatami Link

An electronic scoreboard application with remote control, ideal for sports competitions like judo.

## Features

- **Electronic Scoreboard**: Full-screen display for smart TVs with:
  - Customizable countdown timer (minutes:seconds)
  - Separate scores for blue and red zones
  - Penalty system (max 4 per side) with visual indicators
  - Unique ID for pairing

- **Remote Control**: Smartphone control panel with:
  - Timer management (Start/Stop/Reset)
  - Custom duration setup
  - Score control (+1/-1 per team)
  - Penalty management
  - Complete game reset

- **Real-time Synchronization**: WebSocket connection for instant updates between board and remote (with automatic reconnection)

## Development

**Important**: This project requires Node.js v20.19+ or v22.12+.

Switch to the correct Node.js version (if using nvm):

```sh
nvm use 20.19
```

Install dependencies:

```sh
npm install
```

Start development server:

```sh
npm run dev
```

Open browser at `http://localhost:5173`

## Usage

### 1. Create the Scoreboard

1. Go to homepage
2. Select "📺 Tabellone"
3. Set timer duration (default 3 minutes)
4. Click "Crea Tabellone"
5. Note the ID shown at the top (e.g., `ABC123`)

### 2. Connect the Remote

1. On another device (smartphone), go to homepage
2. Select "📱 Telecomando"
3. Enter the scoreboard ID
4. Click "Connetti al Tabellone"

### 3. Control the Match

From the remote you can:
- **Timer**: Start/Pause/Reset
- **Scores**: Increment or decrement for blue or red team
- **Penalties**: Add or remove penalties (max 4 per team)
- **Reset**: Reset the entire game

## Production

Build the application:

```sh
npm run build
```

Start the production server with WebSocket support:

```sh
npm start
```

The app will be available at `http://localhost:3000` (or configure with `PORT` environment variable).

## Technologies

- **SvelteKit 2**: Full-stack framework
- **Svelte 5**: Reactivity with runes ($state, $effect, $derived)
- **Tailwind CSS 4**: Utility-first styling
- **TypeScript**: Type safety
- **Adapter Node**: Deploy on Node.js server

## Architecture

- **Frontend**: Svelte 5 with reactive state management
- **Backend**: SvelteKit API routes + in-memory store + WebSocket server
- **Synchronization**: WebSocket with automatic reconnection
- **State Management**: Server-side shared game store
- **Timer**: Server-side countdown broadcast via WebSocket

## Notes

- The app uses WebSocket for real-time communication
- Game state is kept in memory (lost on server restart)
- For production, consider using a persistent database (Redis, PostgreSQL, etc.)
- Requires Node.js v20.19+ or v22.12+
- Custom production server (`server.js`) handles WebSocket upgrade
- Timer countdown is managed server-side and broadcast to all clients

## License

MIT
