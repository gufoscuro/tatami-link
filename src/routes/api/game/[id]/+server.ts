import { json } from '@sveltejs/kit';
import { getGame, createGame } from '$lib/server/game-store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { id } = params;
	let game = getGame(id);

	if (!game) {
		const durationParam = url.searchParams.get('duration');
		const duration = durationParam ? parseInt(durationParam, 10) : 180;
		game = createGame(id, duration);
	}

	return json(game);
};
