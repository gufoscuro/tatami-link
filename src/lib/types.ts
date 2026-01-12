export type ClientType = 'board' | 'remote';

export interface GameState {
	id: string;
	remoteConnected: boolean;
	blueScore: number;
	redScore: number;
	bluePenalties: number; // 0-4
	redPenalties: number; // 0-4
	timerMinutes: number;
	timerSeconds: number;
	timerRunning: boolean;
	timerDuration: number; // in seconds, configurable
}

export interface Client {
	id: string;
	type: ClientType;
	gameId: string;
	connectedAt: Date;
}

export type GameAction =
	| { type: 'CONNECT_REMOTE'; state: boolean }
	| { type: 'SCORE_BLUE'; amount: number }
	| { type: 'SCORE_RED'; amount: number }
	| { type: 'PENALTY_BLUE'; add: boolean }
	| { type: 'PENALTY_RED'; add: boolean }
	| { type: 'TIMER_START' }
	| { type: 'TIMER_STOP' }
	| { type: 'TIMER_RESET' }
	| { type: 'TIMER_SET_DURATION'; seconds: number }
	| { type: 'RESET_GAME' };
