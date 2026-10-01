const SUPABASE_URL = "https://xndcxsrqymokkaitdyua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ClrJdadSt9Ifn6w-LFGv0g__T67MoHJ";
const LEADERBOARD_VIEW = "skifall_public_leaderboard";
const LEVEL_KEYS = ["w1l1", "w1l2", "w1l3", "w1l4", "w1l5", "w1l6", "w1l7", "w1l8"];

const body = document.querySelector("#leaderboard-body");
const status = document.querySelector("#status");
const searchInput = document.querySelector("#search-input");
const refreshButton = document.querySelector("#refresh-button");
const updatedLabel = document.querySelector("#updated-label");
const profileCount = document.querySelector("#profile-count");
const fullRunCount = document.querySelector("#full-run-count");
const fastestFullRun = document.querySelector("#fastest-full-run");
const sortButtons = [...document.querySelectorAll(".sort-button")];

let rows = [];
let sortKey = "all_levels_total";
let sortDirection = "asc";

function formatTime(centiseconds) {
	if (centiseconds === null || centiseconds === undefined) return "—";
	const total = Number(centiseconds);
	if (!Number.isFinite(total) || total <= 0) return "—";

	const cs = total % 100;
	const totalSeconds = Math.floor(total / 100);
	const seconds = totalSeconds % 60;
	const totalMinutes = Math.floor(totalSeconds / 60);
	const minutes = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);

	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
	return `${totalMinutes}:${String(seconds).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function compareValues(a, b, key) {
	const av = a[key];
	const bv = b[key];
	const aMissing = av === null || av === undefined;
	const bMissing = bv === null || bv === undefined;
	if (aMissing && bMissing) return 0;
	if (aMissing) return 1;
	if (bMissing) return -1;

	const direction = sortDirection === "asc" ? 1 : -1;
	if (key === "name") return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * direction;
	return (Number(av) - Number(bv)) * direction;
}

function getBestTimes(sourceRows) {
	const bests = {};
	for (const key of [...LEVEL_KEYS, "all_levels_total"]) {
		const values = sourceRows
			.map(row => row[key])
			.filter(value => value !== null && value !== undefined && Number(value) > 0)
			.map(Number);
		bests[key] = values.length ? Math.min(...values) : null;
	}
	return bests;
}

function updateSortButtons() {
	for (const button of sortButtons) {
		const active = button.dataset.key === sortKey;
		button.classList.toggle("active", active);
		if (active) button.dataset.direction = sortDirection;
		else delete button.dataset.direction;
	}
}

function render() {
	const query = searchInput.value.trim().toLowerCase();
	const filtered = rows.filter(row => String(row.name ?? "").toLowerCase().includes(query));
	filtered.sort((a, b) => compareValues(a, b, sortKey));
	const bests = getBestTimes(rows);

	body.innerHTML = "";
	filtered.forEach((row) => {
		const tr = document.createElement("tr");

		const cells = [
			{ value: row.name || "Unnamed" },
			...LEVEL_KEYS.map(key => ({
				value: formatTime(row[key])
			})),
			{ value: formatTime(row.current_total) },
			{
				value: formatTime(row.all_levels_total),
				best: bests.all_levels_total !== null && Number(row.all_levels_total) === bests.all_levels_total,
				full: row.all_levels_total !== null && row.all_levels_total !== undefined
			}
		];

		for (const cell of cells) {
			const td = document.createElement("td");
			td.textContent = cell.value;
			if (cell.value === "—") td.classList.add("empty");
			if (cell.best) td.classList.add("best-time");
			if (cell.full) td.classList.add("full-run");
			tr.appendChild(td);
		}
		body.appendChild(tr);
	});

	if (!filtered.length) {
		const tr = document.createElement("tr");
		const td = document.createElement("td");
		td.colSpan = 11;
		td.textContent = rows.length ? "NO RUNNERS FOUND" : "NO RUNS YET";
		td.className = "empty";
		td.style.textAlign = "center";
		tr.appendChild(td);
		body.appendChild(tr);
	}
}

function updateSummary() {
	const fullRuns = rows.filter(row => row.all_levels_total !== null && row.all_levels_total !== undefined);
	profileCount.textContent = String(rows.length);
	fullRunCount.textContent = String(fullRuns.length);
	fastestFullRun.textContent = fullRuns.length ? formatTime(Math.min(...fullRuns.map(row => Number(row.all_levels_total)))) : "—";
}

async function loadLeaderboard() {
	status.classList.remove("visible");
	refreshButton.disabled = true;
	refreshButton.textContent = "LOADING...";

	try {
		const response = await fetch(`${SUPABASE_URL}/rest/v1/${LEADERBOARD_VIEW}?select=*`, {
			headers: {
				apikey: SUPABASE_PUBLISHABLE_KEY
			}
		});

		if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
		rows = await response.json();
		updateSummary();
		render();
		updatedLabel.textContent = `UPDATED ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
	} catch (error) {
		console.error(error);
		status.textContent = "COULD NOT LOAD RECORDS.";
		status.classList.add("visible");
		updatedLabel.textContent = "OFFLINE";
	} finally {
		refreshButton.disabled = false;
		refreshButton.textContent = "REFRESH";
	}
}

searchInput.addEventListener("input", render);
refreshButton.addEventListener("click", loadLeaderboard);

for (const button of sortButtons) {
	button.addEventListener("click", () => {
		const key = button.dataset.key;
		if (sortKey === key) sortDirection = sortDirection === "asc" ? "desc" : "asc";
		else {
			sortKey = key;
			sortDirection = "asc";
		}
		updateSortButtons();
		render();
	});
}

updateSortButtons();
loadLeaderboard();
