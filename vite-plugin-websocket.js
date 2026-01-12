import { WebSocketServer } from 'ws';
import { g as getGame, u as updateGame, t as tickTimer } from './.svelte-kit/output/server/chunks/game-store.js';

const clients = new Map();
const gameTimers = new Map();

export function websocketPlugin() {
	return {
		name: 'websocket-plugin',
		configureServer(server) {
			if (!server.httpServer) return;

			const wss = new WebSocketServer({ noServer: true });

			server.httpServer.on('upgrade', (request, socket, head) => {
				const url = new URL(request.url, `http://${request.headers.host}`);

				if (url.pathname === '/ws') {
					wss.handleUpgrade(request, socket, head, (ws) => {
						wss.emit('connection', ws, request);
					});
				}
			});

			wss.on('connection', (ws, request) => {
				const url = new URL(request.url, `http://${request.headers.host}`);
				const gameId = url.searchParams.get('gameId');

				if (!gameId) {
					ws.close();
					return;
				}

				if (!clients.has(gameId)) {
					clients.set(gameId, new Set());
				}
				clients.get(gameId).add(ws);

				console.log(`[WS Dev] Client connected to game ${gameId}`);

				const game = getGame(gameId);
				if (game) {
					ws.send(JSON.stringify({ type: 'STATE', data: game }));
				}

				ws.on('message', (message) => {
					try {
						const data = JSON.parse(message.toString());

						if (data.type === 'ACTION') {
							const action = data.action;
							const updatedGame = updateGame(gameId, action);

							if (updatedGame) {
								if (action.type === 'TIMER_START') {
									startGameTimer(gameId);
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
