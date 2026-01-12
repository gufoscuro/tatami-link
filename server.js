import { handler } from './handler.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { getGame, updateGame, tickTimer, createGame } from './game-store.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Mappa dei client connessi per game ID
const clients = new Map();
const gameTimers = new Map();

// Create HTTP server with SvelteKit handler
const server = createServer(handler);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
	const url = new URL(request.url, `http://${request.headers.host}`);

	if (url.pathname === '/ws') {
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	} else {
		socket.destroy();
	}
});

// WebSocket connection
wss.on('connection', (ws, request) => {
	const url = new URL(request.url, `http://${request.headers.host}`);
	const gameId = url.searchParams.get('gameId');

	if (!gameId) {
		ws.close();
		return;
	}

	// Aggiungi client alla mappa
	if (!clients.has(gameId)) {
		clients.set(gameId, new Set());
	}
	clients.get(gameId).add(ws);

	console.log(`[WS] Client connected to game ${gameId}`);

	// Invia stato corrente
	const game = getGame(gameId);
	if (game) {
		ws.send(JSON.stringify({ type: 'STATE', data: game }));
	}

	// Gestisci messaggi
	ws.on('message', (message) => {
		try {
			console.log(`[WS] Message received from game ${gameId}:`, message.toString());
			const data = JSON.parse(message.toString());
			console.log(`[WS] Parsed data:`, data);

			if (data.type === 'INIT') {
				console.log('[WS] INIT message received', game);
				if (game === undefined) createGame(gameId, data.duration || 60)
				return;
			}

			if (data.type === 'ACTION') {
				const action = data.action;
				console.log(`[WS] Processing action:`, action);
				const updatedGame = updateGame(gameId, action);
				console.log(`[WS] Updated game:`, updatedGame);

				if (updatedGame) {
					// Gestisci timer
					if (action.type === 'TIMER_START') {
						console.log(`[WS] Starting timer for game ${gameId}`);
						startGameTimer(gameId);
					} else if (action.type === 'TIMER_STOP' || action.type === 'TIMER_RESET') {
						console.log(`[WS] Stopping timer for game ${gameId}`);
						stopGameTimer(gameId);
					}

					// Broadcast a tutti i client connessi a questo game
					console.log(`[WS] Broadcasting to ${clients.get(gameId)?.size || 0} clients`);
					broadcast(gameId, { type: 'STATE', data: updatedGame });
				} else {
					console.error(`[WS] updateGame returned null for game ${gameId}`);
				}
			}
		} catch (error) {
			console.error('[WS] Error handling message:', error);
		}
	});

	ws.on('close', () => {
		clients.get(gameId)?.delete(ws);
		if (clients.get(gameId)?.size === 0) {
			clients.delete(gameId);
			stopGameTimer(gameId);
		}
		console.log(`[WS] Client disconnected from game ${gameId}`);
	});
});

function broadcast(gameId, message) {
	const gameClients = clients.get(gameId);
	if (!gameClients) return;

	const data = JSON.stringify(message);
	gameClients.forEach((client) => {
		if (client.readyState === 1) {
			// WebSocket.OPEN = 1
			client.send(data);
		}
	});
}

function startGameTimer(gameId) {
	stopGameTimer(gameId);

	const interval = setInterval(() => {
		const game = tickTimer(gameId);
		if (game) {
			broadcast(gameId, { type: 'STATE', data: game });

			if (!game.timerRunning) {
				stopGameTimer(gameId);
			}
		}
	}, 1000);

	gameTimers.set(gameId, interval);
}

function stopGameTimer(gameId) {
	const interval = gameTimers.get(gameId);
	if (interval) {
		clearInterval(interval);
		gameTimers.delete(gameId);
	}
}

server.listen(PORT, HOST, () => {
	console.log(`Server running on http://${HOST}:${PORT}`);
});
