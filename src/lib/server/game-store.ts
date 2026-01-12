import type { GameState, GameAction } from '$lib/types';

// In-memory store for game states - SINGLETON condiviso
const games = new Map<string, GameState>();

export function createGame(id: string, timerDuration: number = 180): GameState {
	const game: GameState = {
		id,
		remoteConnected: false,
		blueScore: 0,
		redScore: 0,
		bluePenalties: 0,
		redPenalties: 0,
		timerMinutes: Math.floor(timerDuration / 60),
		timerSeconds: timerDuration % 60,
		timerRunning: false,
		timerDuration
	};
	console.log(`[GAME STORE] Created game ${id}`);
	games.set(id, game);
	return game;
}

export function getGame(id: string): GameState | undefined {
	return games.get(id);
}

export function updateGame(id: string, action: GameAction): GameState | undefined {
	const game = games.get(id);

	console.log(`[GAME STORE] Updating game ${id} with action`, action);
	console.log(games);
	if (!game) return undefined;

	const newGame = { ...game };

	switch (action.type) {
		case 'CONNECT_REMOTE':
			newGame.remoteConnected = action.state;
			break;
		case 'SCORE_BLUE':
			newGame.blueScore = Math.max(0, newGame.blueScore + action.amount);
			break;
		case 'SCORE_RED':
			newGame.redScore = Math.max(0, newGame.redScore + action.amount);
			break;
		case 'PENALTY_BLUE':
			if (action.add && newGame.bluePenalties < 4) {
				newGame.bluePenalties++;
			} else if (!action.add && newGame.bluePenalties > 0) {
				newGame.bluePenalties--;
			}
			break;
		case 'PENALTY_RED':
			if (action.add && newGame.redPenalties < 4) {
				newGame.redPenalties++;
			} else if (!action.add && newGame.redPenalties > 0) {
				newGame.redPenalties--;
			}
			break;
		case 'TIMER_START':
			newGame.timerRunning = true;
			break;
		case 'TIMER_STOP':
			newGame.timerRunning = false;
			break;
		case 'TIMER_RESET':
			newGame.timerMinutes = Math.floor(newGame.timerDuration / 60);
			newGame.timerSeconds = newGame.timerDuration % 60;
			newGame.timerRunning = false;
			break;
		case 'TIMER_SET_DURATION':
			newGame.timerDuration = action.seconds;
			newGame.timerMinutes = Math.floor(action.seconds / 60);
			newGame.timerSeconds = action.seconds % 60;
			break;
		case 'RESET_GAME':
			newGame.blueScore = 0;
			newGame.redScore = 0;
			newGame.bluePenalties = 0;
			newGame.redPenalties = 0;
			newGame.timerMinutes = Math.floor(newGame.timerDuration / 60);
			newGame.timerSeconds = newGame.timerDuration % 60;
			newGame.timerRunning = false;
			break;
	}

	games.set(id, newGame);
	return newGame;
}

export function deleteGame(id: string): void {
	games.delete(id);
}

export function tickTimer(id: string): GameState | undefined {
	const game = games.get(id);
	if (!game || !game.timerRunning) return game;

	let totalSeconds = game.timerMinutes * 60 + game.timerSeconds;
	totalSeconds = Math.max(0, totalSeconds - 1);

	const newGame = {
		...game,
		timerMinutes: Math.floor(totalSeconds / 60),
		timerSeconds: totalSeconds % 60,
		timerRunning: totalSeconds > 0 ? game.timerRunning : false
	};

	games.set(id, newGame);
	return newGame;
}
