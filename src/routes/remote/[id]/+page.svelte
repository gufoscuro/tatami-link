<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import type { GameState, GameAction } from '$lib/types';

	const gameId = page.params.id;
	let game = $state<GameState | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let customDuration = $state(120);
	let invertedZones = $state(false);

	// Non usare $state per queste variabili altrimenti triggherano re-render infiniti
	let ws: WebSocket | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let shouldReconnect = true;

	async function initGame() {
		try {
			const response = await fetch(`/api/game/${gameId}`);
			if (!response.ok) throw new Error('Game non trovato');
			game = await response.json();
			if (game) {
				customDuration = Math.floor(game.timerDuration);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Errore sconosciuto';
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
			ws?.send(JSON.stringify({ type: 'INIT' }));
		};

		ws.onmessage = (event) => {
			try {
				console.log('[Remote] Message received:', event.data);
				const message = JSON.parse(event.data);
				console.log('[Remote] Parsed message:', message);
				if (message.type === 'STATE') {
					game = message.data;
					loading = false;

					if (game && game.remoteConnected === false) {
						ws?.send(
							JSON.stringify({ type: 'ACTION', action: { type: 'CONNECT_REMOTE', state: true } })
						);
					}
					console.log('[Remote] State updated, loading reset');
				}
			} catch (err) {
				console.error('[Remote] Error parsing message:', err);
			}
		};

		ws.onerror = (err) => {
			console.error('[WS] Error:', err);
			loading = false;
		};

		ws.onclose = () => {
			console.log('[WS] Disconnected');
			if (shouldReconnect) {
				console.log('[WS] Reconnecting in 2s...');
				reconnectTimeout = setTimeout(connectWebSocket, 2000);
			}
		};
	}

	function sendAction(action: GameAction) {
		console.log('[Remote] sendAction called:', action);
		console.log('[Remote] WS state:', ws?.readyState, 'Loading:', loading);

		if (loading) {
			console.log('[Remote] Already loading, skipping');
			return;
		}

		if (!ws) {
			console.error('[Remote] WebSocket not initialized');
			return;
		}

		if (ws.readyState !== WebSocket.OPEN) {
			console.error('[Remote] WebSocket not open, state:', ws.readyState);
			return;
		}

		loading = true;
		console.log('[Remote] Sending action via WebSocket');
		ws.send(JSON.stringify({ type: 'ACTION', action }));

		// Timeout di sicurezza per sbloccare loading
		setTimeout(() => {
			if (loading) {
				console.warn('[Remote] Action timeout, resetting loading state');
				loading = false;
			}
		}, 3000);
	}

	$effect(() => {
		if (browser) {
			console.log('[Remote] Effect running');
			shouldReconnect = true;
			// initGame();
			connectWebSocket();

			return () => {
				console.log('[Remote] Cleanup');
				shouldReconnect = false;
				if (reconnectTimeout) {
					clearTimeout(reconnectTimeout);
				}
				if (ws) {
					ws?.send(
						JSON.stringify({ type: 'ACTION', action: { type: 'CONNECT_REMOTE', state: false } })
					);
					ws.close();
				}
			};
		}
	});

	function formatTime(minutes: number, seconds: number): string {
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<div class="min-h-screen touch-manipulation bg-slate-900 p-4 select-none">
	{#if error}
		<div class="mb-4 rounded-lg bg-red-500 p-6 text-white">
			<p class="text-xl font-bold">Errore: {error}</p>
		</div>
	{/if}

	{#if game}
		<div class="mx-auto max-w-2xl space-y-4">
			<!-- Header -->
			<div class="rounded-xl bg-slate-800 p-6 text-center">
				<h1 class="mb-2 text-2xl font-bold text-white">Telecomando</h1>
				<p class="font-mono text-xl text-slate-300">
					ID: <span class="font-bold text-blue-400">{gameId}</span>
				</p>
			</div>

			<!-- Timer Display & Controls -->
			<div class="rounded-xl bg-slate-800 p-8">
				<div class="mb-6 text-center">
					<div class="mb-4 font-mono text-6xl font-bold text-white">
						{formatTime(game.timerMinutes, game.timerSeconds)}
					</div>
					<div class="mb-6 flex justify-center gap-3">
						{#if !game.timerRunning}
							<button
								onclick={() => sendAction({ type: 'TIMER_START' })}
								disabled={loading}
								class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-50"
							>
								▶ Start
							</button>
						{:else}
							<button
								onclick={() => sendAction({ type: 'TIMER_STOP' })}
								disabled={loading}
								class="rounded-lg bg-yellow-600 px-6 py-3 font-semibold text-white transition-all hover:bg-yellow-700 disabled:opacity-50"
							>
								⏸ Pausa
							</button>
						{/if}
						<button
							onclick={() => sendAction({ type: 'TIMER_RESET' })}
							disabled={loading}
							class="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white transition-all hover:bg-slate-700 disabled:opacity-50"
						>
							↻ Reset
						</button>
					</div>

					<!-- Set Timer Duration -->
					<div class="flex items-center justify-center gap-3">
						<label for="duration" class="font-medium text-white">Imposta durata (sec):</label>
						<input
							id="duration"
							type="number"
							min="1"
							max="3600"
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={customDuration}
							class="w-20 rounded-lg border-2 border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
						/>
						<button
							onclick={() => sendAction({ type: 'TIMER_SET_DURATION', seconds: customDuration })}
							disabled={loading}
							class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
						>
							Imposta
						</button>
					</div>
				</div>
			</div>

			<!-- Score Controls -->
			<div class="flex gap-4" class:flex-row-reverse={invertedZones}>
				<!-- Red Team -->
				<div class="w-1/2 rounded-xl bg-red-600 p-6">
					<h2 class="mb-4 text-center text-2xl font-bold text-white">AKA</h2>
					<div class="mb-6 text-center text-5xl font-bold text-white">
						{game.redScore}
					</div>
					<div class="grid grid-cols-2 gap-3">
						<button
							onclick={() => sendAction({ type: 'SCORE_RED', amount: 1 })}
							disabled={loading}
							class="rounded-lg bg-red-700 py-4 text-xl font-bold text-white transition-all hover:bg-red-800 disabled:opacity-50"
						>
							+1
						</button>
						<button
							onclick={() => sendAction({ type: 'SCORE_RED', amount: -1 })}
							disabled={loading}
							class="rounded-lg bg-red-800 py-4 text-xl font-bold text-white transition-all hover:bg-red-900 disabled:opacity-50"
						>
							-1
						</button>
					</div>

					<!-- Red Penalties -->
					<div class="mt-6">
						<p class="mb-2 text-center text-sm font-medium text-white">
							Penalità ({game.redPenalties}/3)
						</p>
						<div class="mb-3 flex justify-center gap-2">
							{#each Array(3) as _, i}
								<div
									class="size-6 shrink-0 rounded-full border-2"
									class:bg-white={i < game.redPenalties}
									class:border-white={i < game.redPenalties}
									class:bg-red-800={i >= game.redPenalties}
									class:border-red-500={i >= game.redPenalties}
								></div>
							{/each}
						</div>
						<div class="grid grid-cols-2 gap-2">
							<button
								onclick={() => sendAction({ type: 'PENALTY_RED', add: true })}
								disabled={loading || game.redPenalties >= 3}
								class="rounded bg-yellow-500 py-2 font-semibold text-slate-900 transition-all hover:bg-yellow-600 disabled:opacity-50"
							>
								+
							</button>
							<button
								onclick={() => sendAction({ type: 'PENALTY_RED', add: false })}
								disabled={loading || game.redPenalties <= 0}
								class="rounded bg-red-800 py-2 font-semibold text-white transition-all hover:bg-red-900 disabled:opacity-50"
							>
								-
							</button>
						</div>
					</div>
				</div>

				<!-- Blue Team -->
				<div class="w-1/2 rounded-xl bg-blue-600 p-6">
					<h2 class="mb-4 text-center text-2xl font-bold text-white">AO</h2>
					<div class="mb-6 text-center text-5xl font-bold text-white">
						{game.blueScore}
					</div>
					<div class="grid grid-cols-2 gap-3">
						<button
							onclick={() => sendAction({ type: 'SCORE_BLUE', amount: 1 })}
							disabled={loading}
							class="rounded-lg bg-blue-700 py-4 text-xl font-bold text-white transition-all hover:bg-blue-800 disabled:opacity-50"
						>
							+1
						</button>
						<button
							onclick={() => sendAction({ type: 'SCORE_BLUE', amount: -1 })}
							disabled={loading}
							class="rounded-lg bg-blue-800 py-4 text-xl font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-50"
						>
							-1
						</button>
					</div>

					<!-- Blue Penalties -->
					<div class="mt-6">
						<p class="mb-2 text-center text-sm font-medium text-white">
							Penalità ({game.bluePenalties}/3)
						</p>
						<div class="mb-3 flex justify-center gap-2">
							{#each Array(3) as _, i}
								<div
									class="size-6 shrink-0 rounded-full border-2"
									class:bg-white={i < game.bluePenalties}
									class:border-white={i < game.bluePenalties}
									class:bg-blue-800={i >= game.bluePenalties}
									class:border-blue-500={i >= game.bluePenalties}
								></div>
							{/each}
						</div>
						<div class="grid grid-cols-2 gap-2">
							<button
								onclick={() => sendAction({ type: 'PENALTY_BLUE', add: true })}
								disabled={loading || game.bluePenalties >= 3}
								class="rounded bg-yellow-500 py-2 font-semibold text-slate-900 transition-all hover:bg-yellow-600 disabled:opacity-50"
							>
								+
							</button>
							<button
								onclick={() => sendAction({ type: 'PENALTY_BLUE', add: false })}
								disabled={loading || game.bluePenalties <= 0}
								class="rounded bg-blue-800 py-2 font-semibold text-white transition-all hover:bg-blue-900 disabled:opacity-50"
							>
								-
							</button>
						</div>
					</div>
				</div>
			</div>

			<button
				class="w-full rounded-lg bg-slate-700 py-4 text-lg font-bold text-white"
				onclick={() => (invertedZones = !invertedZones)}
			>
				Inverti zone
			</button>

			<!-- Reset Game -->
			<button
				onclick={() => sendAction({ type: 'RESET_GAME' })}
				disabled={loading}
				class="w-full rounded-lg bg-red-700 py-4 text-lg font-bold text-white transition-all hover:bg-red-800 disabled:opacity-50"
			>
				🔄 Reset Partita
			</button>
		</div>
	{:else}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-2xl text-white">Caricamento...</div>
		</div>
	{/if}
</div>
