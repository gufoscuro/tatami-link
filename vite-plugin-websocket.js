import { WebSocketServer } from 'ws';

const clients = new Map();
const gameTimers = new Map();

export function websocketPlugin() {
	let gameStore = null;

	return {
		name: 'websocket-plugin',
		configureServer(server) {
			if (!server.httpServer) return;

			const wss = new WebSocketServer({ noServer: true });

			// Load game store through Vite's module system so we share
			// the same singleton instance used by SvelteKit API routes
			async function loadGameStore() {
				if (!gameStore) {
					gameStore = await server.ssrLoadModule('$lib/server/game-store');
				}
				return gameStore;
			}

			server.httpServer.on('upgrade', (request, socket, head) => {
				const url = new URL(request.url, `http://${request.headers.host}`);

				if (url.pathname === '/ws') {
					wss.handleUpgrade(request, socket, head, (ws) => {
						wss.emit('connection', ws, request);
					});
				}
			});

			wss.on('connection', async (ws, request) => {
				const url = new URL(request.url, `http://${request.headers.host}`);
				const gameId = url.searchParams.get('gameId');

				if (!gameId) {
					ws.close();
					return;
				}

				const store = await loadGameStore();

				if (!clients.has(gameId)) {
					clients.set(gameId, new Set());
				}
				clients.get(gameId).add(ws);

				console.log(`[WS Dev] Client connected to game ${gameId}`);

				const game = store.getGame(gameId);
				if (game) {
					ws.send(JSON.stringify({ type: 'STATE', data: game }));
				}

				ws.on('message', async (message) => {
					try {
						const data = JSON.parse(message.toString());

						if (data.type === 'ACTION') {
							const action = data.action;
							const s = await loadGameStore();
							const updatedGame = s.updateGame(gameId, action);

							if (updatedGame) {
								if (action.type === 'TIMER_START') {
									startGameTimer(gameId, s);
								} else if (action.type === 'TIMER_STOP' || action.type === 'TIMER_RESET') {
									stopGameTimer(gameId);
								}

								broadcast(gameId, { type: 'STATE', data: updatedGame });
							}
						}
					} catch (error) {
						console.error('[WS Dev] Error handling message:', error);
					}
				});

				ws.on('close', () => {
					clients.get(gameId)?.delete(ws);
					if (clients.get(gameId)?.size === 0) {
						clients.delete(gameId);
						stopGameTimer(gameId);
					}
					console.log(`[WS Dev] Client disconnected from game ${gameId}`);
				});
			});
		}
	};
}

function broadcast(gameId, message) {
	const gameClients = clients.get(gameId);
	if (!gameClients) return;

	const data = JSON.stringify(message);
	gameClients.forEach((client) => {
		if (client.readyState === 1) {
			client.send(data);
		}
	});
}

function startGameTimer(gameId, store) {
	stopGameTimer(gameId);

	const interval = setInterval(() => {
		const game = store.tickTimer(gameId);
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
