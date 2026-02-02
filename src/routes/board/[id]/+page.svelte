<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import type { GameState } from '$lib/types';

	const gameId = page.params.id;

	let game = $state<GameState | null>(null);
	let error = $state<string | null>(null);
	let bellPlayed = $state(false);

	// Non usare $state per queste variabili altrimenti triggherano re-render infiniti
	let ws: WebSocket | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let shouldReconnect = true;

	async function initGame() {
		try {
			console.log('[Board] Initializing game', gameId);
			const duration = new URLSearchParams(window.location.search).get('duration');
			const url = duration ? `/api/game/${gameId}?duration=${duration}` : `/api/game/${gameId}`;
			console.log('[Board] Fetching from:', url);
			const response = await fetch(url);
			console.log('[Board] Response status:', response.status);
			if (!response.ok) throw new Error('Failed to fetch game');
			game = await response.json();
			console.log('[Board] Game loaded:', game);
			setTimeout(() => {
				ws?.send(JSON.stringify({ type: 'INIT', duration }));
			}, 1000);
		} catch (err) {
			console.error('[Board] Error:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		}
	}

	function connectWebSocket() {
		if (!browser || !shouldReconnect) return;

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws?gameId=${gameId}`;

		console.log('[WS] Connecting to:', wsUrl);
		ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log('[WS] Connected to game', gameId);
		};

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				if (message.type === 'STATE') {
					game = message.data;
				}

				if (message.type === 'INIT') {
					console.log('[WS] INIT message received:', message);
					bellPlayed = false;
				}

				console.log('[WS] Message received:', message);
			} catch (err) {
				console.error('[WS] Error parsing message:', err);
			}
		};

		ws.onerror = (err) => {
			console.error('[WS] Error:', err);
		};

		ws.onclose = () => {
			console.log('[WS] Disconnected');
			if (shouldReconnect) {
				console.log('[WS] Reconnecting in 2s...');
				reconnectTimeout = setTimeout(connectWebSocket, 2000);
			}
		};
	}

	$effect(() => {
		if (browser) {
			console.log('[Board] Effect running');
			shouldReconnect = true;
			initGame();
			connectWebSocket();

			return () => {
				console.log('[Board] Cleanup');
				shouldReconnect = false;
				if (reconnectTimeout) {
					clearTimeout(reconnectTimeout);
				}
				if (ws) {
					ws.close();
				}
			};
		}
	});

	$effect(() => {
		console.log('game changed:', game);
		if (game && game.timerSeconds === 0 && game.timerMinutes === 0 && !bellPlayed) {
			console.log('[Board] Timer reached zero, playing sound');
			new Audio('/bell.mp3').play().catch((err) => {
				console.error('[Board] Error playing audio:', err);
			});
			bellPlayed = true;
		}
	});

	function formatTime(minutes: number, seconds: number): string {
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<div class="flex min-h-screen flex-col bg-slate-900">
	{#if error}
		<div class="flex flex-1 items-center justify-center">
			<div class="rounded-lg bg-red-500 p-6 text-white">
				<p class="text-xl font-bold">Errore: {error}</p>
			</div>
		</div>
	{:else if game}
		<!-- Header con ID -->
		<div
			class="grid grid-cols-3 items-center gap-4 border-b-4 border-slate-700 bg-slate-800 p-4 text-center"
		>
			<div class="">
				<div
					class="size-6 shrink-0 rounded-full border-4 border-solid border-slate-600 transition-colors"
					class:bg-slate-300={game.remoteConnected}
				></div>
			</div>
			<h1 class="mb-2 text-2xl font-semibold text-white">Tatami Link</h1>
			<div class="text-right font-mono text-2xl text-slate-300">
				<span class="text-2xl font-bold tracking-[0.35rem] text-blue-400">{gameId}</span>
			</div>
		</div>

		<!-- Timer Centrale -->
		<div
			class="flex h-[50vh] items-center justify-center border-b-4 border-slate-700 bg-slate-800 py-8"
		>
			<div class="text-center">
				<div class="digital-font font-mono text-[10rem] leading-[10rem] tracking-wider text-white">
					{formatTime(game.timerMinutes, game.timerSeconds)}
				</div>
				<div class="mt-4">
					{#if game.timerRunning}
						<span
							class="inline-block rounded-full bg-green-500 px-6 py-2 text-xl font-semibold text-white"
						>
							IN CORSO
						</span>
					{:else}
						<span
							class="inline-block rounded-full bg-slate-600 px-6 py-2 text-xl font-semibold text-white"
						>
							IN PAUSA
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Punteggi e Penalità -->
		<div class="grid flex-1 grid-cols-2">
			<!-- Zona BLU -->
			<div class="flex flex-col items-center justify-center bg-blue-600 p-6">
				<div class="mb-4 text-6xl font-bold text-white">
					{game.blueScore}
				</div>
				<div class="mb-4 text-3xl font-semibold text-white/80">AO</div>

				<!-- Penalità BLU -->
				<div class="flex gap-4">
					{#each Array(3) as _, i}
						<div
							class="size-8 shrink-0 rounded-full border-4 transition-all"
							class:bg-white={i < game.bluePenalties}
							class:border-white={i < game.bluePenalties}
							class:bg-blue-700={i >= game.bluePenalties}
							class:border-blue-500={i >= game.bluePenalties}
						></div>
					{/each}
				</div>
			</div>

			<!-- Zona ROSSA -->
			<div class="flex flex-col items-center justify-center bg-red-600 p-6">
				<div class="mb-4 text-6xl font-bold text-white">
					{game.redScore}
				</div>
				<div class="mb-4 text-3xl font-semibold text-white/80">AKA</div>

				<!-- Penalità ROSSE -->
				<div class="flex gap-4">
					{#each Array(3) as _, i}
						<div
							class="size-8 shrink-0 rounded-full border-4 transition-all"
							class:bg-white={i < game.redPenalties}
							class:border-white={i < game.redPenalties}
							class:bg-red-700={i >= game.redPenalties}
							class:border-red-500={i >= game.redPenalties}
						></div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-2xl text-white">Caricamento...</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
</style>
