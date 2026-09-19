/* Edite esta lista para cadastrar seus próprios candidatos. */
const CANDIDATOS_JSON = [
    { nome: "Benjamim", numero: "4", cargo: "Imperador" },
	{ nome: "Lucas", numero: "1", cargo: "Vice-Imperador" },
	{ nome: "Miguel Fialho", numero: "2", cargo: "Vice-Imperador" },
	{ nome: "Pablo", numero: "3", cargo: "Ministro" },
    { nome: "Luiz", numero: "5", cargo: "Guardião-Grau 1" },
    { nome: "João", numero: "6", cargo: "Guardião-Grau 2" },
    { nome: "Guilherme", numero: "7", cargo: "Guardião-Grau 2" },
    { nome: "Nicolas", numero: "8", cargo: "Ministro" },
];

const STORAGE_KEY = "urna-simulada-votos";
const SESSION_CARGOS_KEY = "urna-simulada-cargos-da-sessao";
const SESSION_CHOICES_KEY = "urna-simulada-escolhas-da-sessao";
const WEBHOOK_SENT_KEY = "urna-simulada-webhook-enviado";
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1550704611319488586/LL5WkssWclWEtfHmA9DW3TBIoFLdLusm54BYBaW6JKsjaJYdL-QzXXhOkzNlTN87QXOe";
const CARGOS = [...new Set(CANDIDATOS_JSON.map((candidate) => candidate.cargo))];
const state = {
	cargo: "",
	numero: "",
	candidate: null,
	votes: loadVotes(),
	votedCargos: loadSessionCargos(),
	sessionChoices: loadSessionChoices()
};

const elements = {
	cargoSelect: document.querySelector("#cargo-select"),
	numberDisplay: document.querySelector("#number-display"),
	candidatePreview: document.querySelector("#candidate-preview"),
	ballotMessage: document.querySelector("#ballot-message"),
	confirmButton: document.querySelector("#confirm-button"),
	resultsList: document.querySelector("#results-list"),
	totalVotes: document.querySelector("#total-votes"),
	blankCount: document.querySelector("#blank-count"),
	nullCount: document.querySelector("#null-count"),
	toast: document.querySelector("#toast"),
	stepNumber: document.querySelector("#step-number"),
	voterName: document.querySelector("#voter-name")
};

function loadVotes() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
	} catch {
		return {};
	}
}

function loadSessionCargos() {
	try {
		return JSON.parse(sessionStorage.getItem(SESSION_CARGOS_KEY)) || [];
	} catch {
		return [];
	}
}

function loadSessionChoices() {
	try {
		return JSON.parse(sessionStorage.getItem(SESSION_CHOICES_KEY)) || {};
	} catch {
		return {};
	}
}

function candidatesForCargo() {
	return CANDIDATOS_JSON.filter((candidate) => candidate.cargo === state.cargo);
}

function setup() {
	state.cargo = CARGOS[0] || "";
	elements.cargoSelect.innerHTML = CARGOS.map((cargo) => `<option value="${cargo}">${cargo}</option>`).join("");
	elements.cargoSelect.value = state.cargo;
	bindEvents();
	renderResults();
}

function bindEvents() {
	document.querySelectorAll(".key").forEach((button) => {
		button.addEventListener("click", () => addNumber(button.dataset.number));
	});
	elements.cargoSelect.addEventListener("change", () => {
		state.cargo = elements.cargoSelect.value;
		clearVote();
		renderResults();
	});
	document.querySelector("#clear-button").addEventListener("click", clearVote);
	document.querySelector("#blank-button").addEventListener("click", () => registerVote("branco"));
	elements.confirmButton.addEventListener("click", () => registerVote(state.candidate ? state.candidate.numero : "nulo"));
	document.querySelector("#reset-button").addEventListener("click", resetVotes);
	document.addEventListener("keydown", handleKeyboard);
}

function handleKeyboard(event) {
	if (/^\d$/.test(event.key)) addNumber(event.key);
	if (event.key === "Backspace") clearVote();
	if (event.key === "Enter" && !elements.confirmButton.disabled) registerVote(state.candidate.numero);
}

function addNumber(number) {
	if (state.numero.length >= 2) return;
	state.numero += number;
	state.candidate = candidatesForCargo().find((candidate) => candidate.numero === state.numero) || null;
	renderBallot();
}

function clearVote() {
	state.numero = "";
	state.candidate = null;
	renderBallot();
}

function renderBallot() {
	elements.numberDisplay.textContent = state.numero || "\u00a0";
	elements.confirmButton.disabled = !state.candidate;
	elements.candidatePreview.className = "candidate-preview";

	if (state.candidate) {
		elements.candidatePreview.innerHTML = `<span class="preview-icon">✓</span><div><strong>${state.candidate.nome}</strong><p>${state.candidate.cargo} · número ${state.candidate.numero}</p></div>`;
		elements.candidatePreview.classList.add("found");
		elements.ballotMessage.textContent = "Confira os dados e confirme seu voto.";
	} else if (state.numero.length === 2) {
		elements.candidatePreview.innerHTML = `<span class="preview-icon">!</span><div><strong>Número não encontrado</strong><p>Corrija o número ou vote nulo.</p></div>`;
		elements.candidatePreview.classList.add("invalid");
		elements.ballotMessage.textContent = "Nenhum candidato corresponde a este número.";
		elements.confirmButton.disabled = false;
	} else {
		elements.candidatePreview.innerHTML = `<span class="preview-icon">?</span><div><strong>Digite o número</strong><p>Use o teclado para localizar um candidato</p></div>`;
		elements.ballotMessage.textContent = "O número aparece aqui conforme você digita.";
	}
}

async function registerVote(type) {
	const voterName = elements.voterName.value.trim();
	if (!voterName) {
		elements.voterName.focus();
		showToast("Digite seu nome antes de votar");
		return;
	}

	const key = `${state.cargo}:${type}`;
	const candidate = type === "branco"
		? null
		: type === "nulo"
			? null
			: candidatesForCargo().find((item) => item.numero === type);
	state.sessionChoices[state.cargo] = {
		cargo: state.cargo,
		tipo: type === "branco" ? "branco" : type === "nulo" ? "nulo" : "candidato",
		nome: candidate ? candidate.nome : null,
		numero: candidate ? candidate.numero : null
	};
	sessionStorage.setItem(SESSION_CHOICES_KEY, JSON.stringify(state.sessionChoices));
	state.votes[key] = (state.votes[key] || 0) + 1;
	if (!state.votedCargos.includes(state.cargo)) {
		state.votedCargos.push(state.cargo);
		sessionStorage.setItem(SESSION_CARGOS_KEY, JSON.stringify(state.votedCargos));
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state.votes));
	showToast(type === "branco" ? "Voto em branco registrado" : type === "nulo" ? "Voto nulo registrado" : "Voto confirmado");
	clearVote();
	renderResults();
	if (Object.keys(state.sessionChoices).length === CARGOS.length && !sessionStorage.getItem(WEBHOOK_SENT_KEY)) {
		await notifyDiscord();
	}
}

async function notifyDiscord() {
	if (!DISCORD_WEBHOOK_URL.startsWith("https://discord.com/api/webhooks/")) {
		showToast("Configure a URL do webhook no script.js");
		return;
	}

	try {
		const choices = CARGOS.map((cargo) => state.sessionChoices[cargo]).map((choice) => {
			if (choice.tipo === "branco") return `- ${choice.cargo}: voto em branco`;
			if (choice.tipo === "nulo") return `- ${choice.cargo}: voto nulo`;
			return `- ${choice.cargo}: ${choice.nome} (número ${choice.numero})`;
		}).join("\n");
		const response = await fetch(DISCORD_WEBHOOK_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content: `**Votação concluída**\nEleitor: ${elements.voterName.value.trim()}\n\n**Escolhas:**\n${choices}`,
				allowed_mentions: { parse: [] }
			})
		});
		if (!response.ok) throw new Error(`Webhook retornou ${response.status}`);
		sessionStorage.setItem(WEBHOOK_SENT_KEY, "true");
		showToast("Votação concluída e aviso enviado");
	} catch (error) {
		console.error("Não foi possível enviar o webhook:", error);
		showToast("Votação concluída, mas o aviso falhou");
	}
}

function renderResults() {
	const candidates = candidatesForCargo();
	const values = candidates.map((candidate) => ({ candidate, count: state.votes[`${state.cargo}:${candidate.numero}`] || 0 }));
	const total = Object.entries(state.votes).filter(([key]) => key.startsWith(`${state.cargo}:`)).reduce((sum, [, count]) => sum + count, 0);
	elements.totalVotes.textContent = `${total} ${total === 1 ? "voto" : "votos"}`;
	elements.blankCount.textContent = state.votes[`${state.cargo}:branco`] || 0;
	elements.nullCount.textContent = state.votes[`${state.cargo}:nulo`] || 0;
	elements.resultsList.innerHTML = values.map(({ candidate, count }) => {
		const percent = total ? Math.round((count / total) * 100) : 0;
		return `<div class="result-item"><div class="result-meta"><span><b>${candidate.numero}</b> ${candidate.nome}</span><strong>${count}</strong></div><div class="progress"><i style="width: ${percent}%"></i></div></div>`;
	}).join("") || `<p class="empty-results">Nenhum candidato neste cargo.</p>`;
}

function resetVotes() {
	if (!confirm("Deseja zerar todos os votos deste navegador?")) return;
	state.votes = {};
	state.votedCargos = [];
	state.sessionChoices = {};
	localStorage.removeItem(STORAGE_KEY);
	sessionStorage.removeItem(SESSION_CARGOS_KEY);
	sessionStorage.removeItem(SESSION_CHOICES_KEY);
	sessionStorage.removeItem(WEBHOOK_SENT_KEY);
	renderResults();
	showToast("Apuração zerada");
}

function showToast(message) {
	elements.toast.textContent = message;
	elements.toast.classList.add("visible");
	setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

setup();
