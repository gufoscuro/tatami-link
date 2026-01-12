<script lang="ts">
	import { goto } from '$app/navigation';

	let clientType = $state<'board' | 'remote' | null>(null);
	let gameId = $state('');
	let timerSeconds = $state(120);

	function generateId(): string {
		return Math.floor(10000 + Math.random() * 90000).toString();
	}

	function register() {
		if (!clientType) return;

		const id = gameId || generateId();

		if (clientType === 'board') {
			goto(`/board/${id}?duration=${timerSeconds}`);
		} else {
			goto(`/remote/${id}`);
		}
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4"
>
	<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
		<h1 class="mb-8 text-center text-3xl font-bold text-slate-800">Tatami Link</h1>

		<div class="space-y-6">
			<!-- Client Type Selection -->
			<div>
				<p class="mb-3 block text-sm font-medium text-slate-700">Tipo di dispositivo</p>
				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class:bg-blue-600={clientType === 'board'}
						class:text-white={clientType === 'board'}
						class:bg-slate-100={clientType !== 'board'}
						class:text-slate-700={clientType !== 'board'}
						class="rounded-lg border-2 p-4 font-medium transition-all"
						class:border-blue-600={clientType === 'board'}
						class:border-slate-300={clientType !== 'board'}
						onclick={() => (clientType = 'board')}
					>
						📺 Tabellone
					</button>
					<button
						type="button"
						class:bg-blue-600={clientType === 'remote'}
						class:text-white={clientType === 'remote'}
						class:bg-slate-100={clientType !== 'remote'}
						class:text-slate-700={clientType !== 'remote'}
						class="rounded-lg border-2 p-4 font-medium transition-all"
						class:border-blue-600={clientType === 'remote'}
						class:border-slate-300={clientType !== 'remote'}
						onclick={() => (clientType = 'remote')}
					>
						📱 Telecomando
					</button>
				</div>
			</div>

			{#if clientType === 'board'}
				<!-- Timer Duration for Board -->
				<div>
					<label for="timer" class="mb-2 block text-sm font-medium text-slate-700">
						Durata timer (secondi)
					</label>
					<input
						id="timer"
						type="number"
						inputmode="numeric"
						pattern="[0-9]*"
						min="1"
						max="3600"
						bind:value={timerSeconds}
						class="w-full rounded-lg border-2 border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
					/>
				</div>
			{/if}

			{#if clientType === 'remote'}
				<!-- Game ID for Remote -->
				<div>
					<label for="gameId" class="mb-2 block text-sm font-medium text-slate-700">
						ID Tabellone
					</label>
					<input
						id="gameId"
						type="number"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={gameId}
						oninput={(e) => (gameId = e?.target?.value?.toUpperCase())}
						placeholder="Inserisci ID tabellone"
						class="w-full rounded-lg border-2 border-slate-300 px-4 py-3 uppercase focus:border-blue-600 focus:outline-none"
						maxlength={5}
					/>
				</div>
			{/if}

			<!-- Register Button -->
			<button
				type="button"
				disabled={!clientType || (clientType === 'remote' && (!gameId || gameId.length !== 5))}
				onclick={register}
				class="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{clientType === 'board' ? 'Crea Tabellone' : 'Connetti al Tabellone'}
			</button>
		</div>

		<p class="mt-6 text-center text-sm text-slate-600">
			{#if clientType === 'board'}
				Verrà generato un ID univoco per questo tabellone
			{:else if clientType === 'remote'}
				Inserisci l'ID mostrato sul tabellone
			{:else}
				Seleziona il tipo di dispositivo per iniziare
			{/if}
		</p>
	</div>
</div>
