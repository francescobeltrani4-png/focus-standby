/* global STUDY_CONFIG, google */
const $ = (selector) => document.querySelector(selector);
const config = window.STUDY_CONFIG || { spotify: {}, googleTasks: {} };
let shownMonth = new Date();

function updateClock() {
  const now = new Date();
  $("#time").textContent = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  $("#time").dateTime = now.toISOString();
  $("#date-label").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(now);
}

function renderCalendar() {
  const year = shownMonth.getFullYear(); const month = shownMonth.getMonth();
  $("#month-label").textContent = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(shownMonth);
  const first = new Date(year, month, 1); const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate(); const today = new Date();
  const grid = $("#calendar-grid"); grid.innerHTML = "";
  for (let i = 0; i < start; i += 1) grid.append(Object.assign(document.createElement("span"), { className: "day blank" }));
  for (let day = 1; day <= days; day += 1) { const el = document.createElement("button"); el.type = "button"; el.className = "day"; el.textContent = day; el.setAttribute("aria-label", `${day}`); if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) el.classList.add("today"); el.addEventListener("click", () => { grid.querySelectorAll(".selected").forEach(x => x.classList.remove("selected")); el.classList.add("selected"); }); grid.append(el); }
}

function dialog(title, text) { $("#dialog-title").textContent = title; $("#dialog-text").textContent = text; $("#setup-dialog").showModal(); }
function bytesToBase64Url(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function sha256(value) { return bytesToBase64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }

async function connectSpotify() {
  const { clientId, redirectUri } = config.spotify || {};
  if (!clientId || !redirectUri) return dialog("Spotify non configurato", "Inserisci client ID e redirect URI in config.js. Devi ospitare questa pagina con HTTPS o localhost: file:// non può ricevere il ritorno OAuth.");
  const verifier = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(64)));
  sessionStorage.setItem("spotify_verifier", verifier);
  const params = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri, code_challenge_method: "S256", code_challenge: await sha256(verifier), scope: "user-read-currently-playing user-read-playback-state" });
  location.assign(`https://accounts.spotify.com/authorize?${params}`);
}
async function finishSpotifyAuth() {
  const code = new URLSearchParams(location.search).get("code"); const { clientId, redirectUri } = config.spotify || {};
  if (!code || !clientId || !redirectUri) return;
  const verifier = sessionStorage.getItem("spotify_verifier");
  if (!verifier) return dialog("Sessione Spotify scaduta", "Tocca Collega Spotify e riprova.");
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier }) });
  if (!response.ok) return dialog("Spotify non collegato", "Spotify ha rifiutato il collegamento. Controlla client ID e redirect URI.");
  const token = await response.json(); sessionStorage.setItem("spotify_token", token.access_token); history.replaceState({}, "", location.pathname); loadSpotify();
}
async function loadSpotify() {
  const token = sessionStorage.getItem("spotify_token"); if (!token) return;
  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${token}` } });
  $("#spotify-status").textContent = "collegato";
  if (response.status === 204) { $("#spotify-content").querySelector(".media-title").textContent = "Niente in riproduzione"; $("#spotify-content").querySelector(".media-subtitle").textContent = "avvia una canzone su Spotify"; return; }
  if (!response.ok) { $("#spotify-status").textContent = "ricollega"; return; }
  const playback = await response.json(); const item = playback.item; if (!item) return;
  const art = item.album?.images?.at(-1)?.url; const content = $("#spotify-content"); content.replaceChildren();
  const artwork = document.createElement("div"); artwork.className = "album-art";
  if (art) { const image = document.createElement("img"); image.src = art; image.alt = ""; artwork.append(image); } else artwork.textContent = "♫";
  const copy = document.createElement("div"); copy.className = "media-copy"; const title = document.createElement("p"); title.className = "media-title"; const subtitle = document.createElement("p"); subtitle.className = "media-subtitle"; copy.append(title, subtitle); content.append(artwork, copy);
  $("#spotify-content .media-title").textContent = item.name; $("#spotify-content .media-subtitle").textContent = item.artists?.map(a => a.name).join(", ") || item.show?.name || "Spotify";
}

function connectGoogleTasks() {
  const { clientId } = config.googleTasks || {};
  if (!clientId) return dialog("Google Tasks non configurato", "Inserisci un OAuth client ID in config.js e abilita Google Tasks API, poi ricarica la pagina.");
  const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.onload = () => google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: "https://www.googleapis.com/auth/tasks.readonly", callback: async ({ access_token }) => { sessionStorage.setItem("google_tasks_token", access_token); await loadGoogleTasks(); } }).requestAccessToken(); script.onerror = () => dialog("Google non raggiungibile", "Non riesco a caricare la schermata di accesso Google."); document.head.append(script);
}
async function loadGoogleTasks() {
  const token = sessionStorage.getItem("google_tasks_token"); if (!token) return;
  const lists = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1", { headers: { Authorization: `Bearer ${token}` } });
  if (!lists.ok) { $("#tasks-status").textContent = "ricollega"; return; } const list = (await lists.json()).items?.[0];
  $("#tasks-status").textContent = "collegato"; const container = $("#task-list"); container.innerHTML = "";
  if (!list) { container.innerHTML = '<li class="empty-state">Nessuna lista trovata.</li>'; return; }
  const tasks = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=false&maxResults=5`, { headers: { Authorization: `Bearer ${token}` } });
  const items = tasks.ok ? (await tasks.json()).items || [] : [];
  container.innerHTML = items.length ? "" : '<li class="empty-state">Tutto fatto. Che flex.</li>';
  items.forEach(task => { const li = document.createElement("li"); li.textContent = task.title; container.append(li); });
}

$("#previous-month").onclick = () => { shownMonth.setMonth(shownMonth.getMonth() - 1); renderCalendar(); };
$("#next-month").onclick = () => { shownMonth.setMonth(shownMonth.getMonth() + 1); renderCalendar(); };
$("#today-button").onclick = () => { shownMonth = new Date(); renderCalendar(); };
$("#spotify-connect").onclick = connectSpotify; $("#tasks-connect").onclick = connectGoogleTasks; $("#dialog-close").onclick = () => $("#setup-dialog").close();
updateClock(); renderCalendar(); finishSpotifyAuth(); loadSpotify(); loadGoogleTasks(); setInterval(updateClock, 1000); setInterval(loadSpotify, 30000);
