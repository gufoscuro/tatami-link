import type { Handle } from '@sveltejs/kit';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { getGame, updateGame, tickTimer } from '$lib/server/game-store';
import type { GameAction } from '$lib/types';

let wss: WebSocketServer | null = null;

// Mappa dei client connessi per game ID
const clients = new Map<string, Set<WebSocket>>();

// Timer interval per ogni game
const gameTimers = new Map<string, NodeJS.Timeout>();

export const handle: Handle = async ({ event, resolve }) => {
	// Inizializza WebSocket server se non esiste
	if (!wss && event.platform) {
		const server = event.platform.server as Server;
		if (server) {
			wss = new WebSocketServer({ noServer: true });

			server.on('upgrade', (request, socket, head) => {
				const url = new URL(request.url || '', `http://${request.headers.host}`);

				if (url.pathname.startsWith('/ws')) {
					wss?.handleUpgrade(request, socket, head, (ws) => {
						wss?.emit('connection', ws, request);
					});
				} else {
					socket.destroy();
				}
			});

			wss.on('connection', (ws, request) => {
				const url = new URL(request.url || '', `http://${request.headers.host}`);
				const gameId = url.searchParams.get('gameId');

				if (!gameId) {
					ws.close();
					return;
				}

				// Aggiungi client alla mappa
				if (!clients.has(gameId)) {
					clients.set(gameId, new Set());
				}
				clients.get(gameId)?.add(ws);

				console.log(`[WS] Client connected to game ${gameId}`);

				// Invia stato corrente
				const game = getGame(gameId);
				if (game) {
					ws.send(JSON.stringify({ type: 'STATE', data: game }));
				}

				// Gestisci messaggi
				ws.on('message', (message) => {
					try {
						const data = JSON.parse(message.toString());

						if (data.type === 'INIT') {
							console.log('[WS] INIT message received');
							// Potresti gestire l'inizializzazione qui se necessario
							return;
						}

						if (data.type === 'ACTION') {
							const action: GameAction = data.action;
							const updatedGame = updateGame(gameId, action);

							if (updatedGame) {
								// Gestisci timer
								if (action.type === 'TIMER_START') {
									startGameTimer(gameId);
								} else if (action.type === 'TIMER_STOP' || action.type === 'TIMER_RESET') {
									stopGameTimer(gameId);
								}

								// Broadcast a tutti i client connessi a questo game
								broadcast(gameId, { type: 'STATE', data: updatedGame });
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
		}
	}

	return resolve(event);
};

function broadcast(gameId: string, message: unknown) {
	const gameClients = clients.get(gameId);
	if (!gameClients) return;

	const data = JSON.stringify(message);
	gameClients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
}

function startGameTimer(gameId: string) {
	// Stop existing timer if any
	stopGameTimer(gameId);

	// Start new timer
	const interval = setInterval(() => {
		const game = tickTimer(gameId);
		if (game) {
			broadcast(gameId, { type: 'STATE', data: game });

			// Stop timer if it reached 0
			if (!game.timerRunning) {
				stopGameTimer(gameId);
			}
		}
	}, 1000);

	gameTimers.set(gameId, interval);
}

function stopGameTimer(gameId: string) {
	const interval = gameTimers.get(gameId);
	if (interval) {
		clearInterval(interval);
		gameTimers.delete(gameId);
	}
}
