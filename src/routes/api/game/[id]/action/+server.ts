import { json } from '@sveltejs/kit';
import { updateGame, getGame } from '$lib/server/game-store';
import type { RequestHandler } from './$types';
import type { GameAction } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	const { id } = params;
	const action: GameAction = await request.json();

	const game = updateGame(id, action);

	if (!game) {
		return json({ error: 'Game not found' }, { status: 404 });
	}

	return json(game);
};

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;
	const game = getGame(id);

	if (!game) {
		return json({ error: 'Game not found' }, { status: 404 });
	}

	return json(game);
};
