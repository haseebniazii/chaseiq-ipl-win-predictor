'use strict';

/** CHASEIQ client — vanilla JavaScript; no frameworks or chart libraries. */
(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $('prediction-form'), batting: $('batting-team'), bowling: $('bowling-team'),
    city: $('city'), target: $('target'), score: $('score'), overs: $('overs'),
    wickets: $('wickets'), error: $('form-error'), predict: $('predict-button'),
    buttonIdle: document.querySelector('.btn-idle'), buttonLoading: document.querySelector('.btn-loading'),
    modal: $('settings-modal'), apiInput: $('api-base-url'), apiMessage: $('settings-message'),
  };
  const FALLBACK_TEAMS = [
    'Chennai Super Kings', 'Delhi Capitals', 'Kings XI Punjab', 'Kolkata Knight Riders',
    'Mumbai Indians', 'Rajasthan Royals', 'Royal Challengers Bangalore', 'Sunrisers Hyderabad'
  ];
  const FALLBACK_CITIES = [
    'Bangalore', 'Chandigarh', 'Chennai', 'Delhi', 'Hyderabad', 'Jaipur', 'Kolkata', 'Mumbai'
  ];
  const palette = {
    'Chennai Super Kings': ['CSK', '#f3c535', '#17251d'],
    'Mumbai Indians': ['MI', '#2675c4', '#f4fbff'],
    'Kolkata Knight Riders': ['KKR', '#794abd', '#f5f0ff'],
    'Royal Challengers Bangalore': ['RCB', '#b94140', '#fff4e7'],
    'Royal Challengers Bengaluru': ['RCB', '#b94140', '#fff4e7'],
    'Rajasthan Royals': ['RR', '#cb5ba9', '#fff'],
    'Sunrisers Hyderabad': ['SRH', '#e4793f', '#fff'],
    'Kings XI Punjab': ['KXIP', '#cb4847', '#fff'],
    'Punjab Kings': ['PBKS', '#cb4847', '#fff'],
    'Delhi Daredevils': ['DD', '#2774ad', '#fff'],
    'Delhi Capitals': ['DC', '#307dc3', '#fff'],
    'Gujarat Titans': ['GT', '#2d4c76', '#fff'],
    'Lucknow Super Giants': ['LSG', '#168fb4', '#fff'],
    'Deccan Chargers': ['DC', '#506884', '#fff'],
    'Pune Warriors': ['PWI', '#6870a5', '#fff'],
    'Rising Pune Supergiant': ['RPS', '#805aa5', '#fff'],
    'Gujarat Lions': ['GL', '#c47728', '#fff'],
    'Kochi Tuskers Kerala': ['KTK', '#ac623e', '#fff']
  };
  const state = {busy: false, history: [], signature: '', online: false, lastResult: null};
  let toastTimeout;

  const normalize = (value) => String(value || '').trim().replace(/\/+$/, '');
  function automaticURL() {
    const host = window.location.hostname;
    const local = window.location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(host);
    if (local && window.location.port !== '8000') return 'http://127.0.0.1:8000';
    return window.location.origin === 'null' ? 'http://127.0.0.1:8000' : window.location.origin;
  }
  function getBaseURL() {
    let override = null;
    try { override = localStorage.getItem('chaseiq.api-base-url'); } catch (_) { /* Storage is optional. */ }
    return normalize(override || window.IPL_CONFIG?.API_BASE_URL || automaticURL());
  }
  function setStoredURL(url) {
    try {
      if (url) localStorage.setItem('chaseiq.api-base-url', url);
      else localStorage.removeItem('chaseiq.api-base-url');
    } catch (_) { window.IPL_CONFIG = {...(window.IPL_CONFIG || {}), API_BASE_URL: url}; }
  }
  function apiURL(path) { return getBaseURL() + path; }
  function toast(message) {
    const box = $('toast');
    box.textContent = message;
    box.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => box.classList.remove('is-visible'), 4000);
  }
  function setConnection(online, label) {
    state.online = online;
    $('status-button').classList.toggle('is-online', online);
    $('status-button').classList.toggle('is-offline', !online);
    $('connection-text').textContent = label || (online ? 'API CONNECTED' : 'API OFFLINE');
  }
  function errorMessage(payload, code) {
    const detail = payload?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => {
      const field = Array.isArray(item.loc) ? item.loc.filter(x => x !== 'body').join('.') : '';
      return `${field ? field + ': ' : ''}${item.msg || 'Invalid value'}`;
    }).join(' · ');
    if (detail && typeof detail === 'object') return detail.message || 'Some match details are unsupported by the trained model.';
    return payload?.message || `API request failed (HTTP ${code}).`;
  }
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = Number(window.IPL_CONFIG?.REQUEST_TIMEOUT_MS) || 15000;
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(apiURL(path), {
        ...options,
        signal: controller.signal,
        headers: {'Accept': 'application/json', ...(options.body ? {'Content-Type': 'application/json'} : {})},
        cache: 'no-store'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(data, response.status));
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The API request timed out. Check your backend deployment.');
      if (error instanceof TypeError) throw new Error('Cannot connect to the API. Check the URL, internet connection, and FastAPI CORS settings.');
      throw error;
    } finally {clearTimeout(timer);}
  }

  function fillSelect(select, items, preferred) {
    const current = preferred || select.value;
    select.replaceChildren();
    const choices = [...new Set(items)].filter(x => typeof x === 'string' && x.trim());
    for (const value of choices) {
      const option = document.createElement('option');
      option.value = value; option.textContent = value;
      select.append(option);
    }
    if (choices.includes(current)) select.value = current;
    else if (choices.length) select.value = choices[0];
  }
  function teamStyle(name) {
    if (palette[name]) return palette[name];
    const parts = String(name).trim().split(/\s+/);
    return [(parts.length >= 2 ? parts.slice(0, 3).map(p => p[0]).join('') : parts[0]?.slice(0, 3) || '?').toUpperCase(), '#3e7181', '#fff'];
  }
  function syncTeamVisuals() {
    for (const [select, avatar] of [[els.batting, $('batting-avatar')], [els.bowling, $('bowling-avatar')]]) {
      const [abbr, bg, fg] = teamStyle(select.value);
      avatar.textContent = abbr;
      avatar.style.background = bg;
      avatar.style.color = fg;
    }
    $('chasing-team-label').textContent = els.batting.value;
    $('defending-team-label').textContent = els.bowling.value;
    if (!state.lastResult) $('gauge-team').textContent = teamStyle(els.batting.value)[0] + ' · CHASING';
  }
  function setFallbacks() {
    fillSelect(els.batting, FALLBACK_TEAMS, 'Mumbai Indians');
    fillSelect(els.bowling, FALLBACK_TEAMS, 'Chennai Super Kings');
    fillSelect(els.city, FALLBACK_CITIES, 'Mumbai');
    syncTeamVisuals();
  }
  async function loadOptions(autoPredict = true) {
    $('connection-text').textContent = 'CONNECTING...';
    try {
      const options = await request('/api/options');
      if (!Array.isArray(options.teams) || !Array.isArray(options.cities) || !options.teams.length || !options.cities.length) {
        throw new Error('API options response is invalid. Expected teams and cities arrays.');
      }
      fillSelect(els.batting, options.teams, els.batting.value);
      fillSelect(els.bowling, options.teams, els.bowling.value);
      fillSelect(els.city, options.cities, els.city.value);
      if (els.batting.value === els.bowling.value) {
        els.bowling.value = options.teams.find(t => t !== els.batting.value) || els.bowling.value;
      }
      syncTeamVisuals();
      setConnection(true, 'MODEL ONLINE');
      if (autoPredict) await predict(false);
      return true;
    } catch (error) {
      setConnection(false, 'API OFFLINE');
      $('result-message').textContent = 'API offline. Run main.py or set your Vercel backend URL in API settings.';
      if (autoPredict) showError('API not connected. Open API settings to set your backend URL.');
      return false;
    }
  }
  function showError(message) {
    els.error.textContent = message;
    els.error.hidden = false;
  }
  function clearError() {els.error.hidden = true; els.error.textContent = '';}
  function validOver(raw) {
    const match = /^(0|[1-9]\d*)(?:\.([0-5]))?$/.exec(raw);
    if (!match) return null;
    const balls = Number(match[1]) * 6 + Number(match[2] || 0);
    return balls <= 120 ? balls : null;
  }
  function getPayload() {
    const overs = els.overs.value.trim();
    const balls = validOver(overs);
    const target = Number(els.target.value);
    const score = Number(els.score.value);
    const wickets = Number(els.wickets.value);
    if (els.batting.value === els.bowling.value) throw new Error('Choose two different teams.');
    if (!els.batting.value || !els.bowling.value || !els.city.value) throw new Error('Choose teams and a city.');
    if (els.target.value === '' || !Number.isInteger(target) || target < 1 || target > 600) throw new Error('Target must be a whole number between 1 and 600.');
    if (els.score.value === '' || !Number.isInteger(score) || score < 0 || score > 600) throw new Error('Score must be a whole number between 0 and 600.');
    if (els.wickets.value === '' || !Number.isInteger(wickets) || wickets < 0 || wickets > 10) throw new Error('Wickets lost must be between 0 and 10.');
    if (balls === null) throw new Error('Use cricket overs such as 12.3 (balls after the dot must be 0–5, maximum 20.0).');
    if (balls === 0) throw new Error('At least one ball must have been bowled. Start at 0.1 overs.');
    return {
      batting_team: els.batting.value,
      bowling_team: els.bowling.value,
      city: els.city.value,
      target,
      current_score: score,
      overs,
      wickets_lost: wickets
    };
  }
  function setBusy(busy) {
    state.busy = busy;
    els.predict.disabled = busy;
    els.buttonIdle.hidden = busy;
    els.buttonLoading.hidden = !busy;
  }
  async function predict(scrollResult = false) {
    if (state.busy) return;
    clearError();
    let payload;
    try {payload = getPayload();} catch (error) {showError(error.message); return;}
    setBusy(true);
    try {
      const result = await request('/api/predict', {method: 'POST', body: JSON.stringify(payload)});
      if (result.win_probability !== null && result.win_probability !== undefined && !Number.isFinite(Number(result.win_probability))) throw new Error('Model returned invalid probability.');
      renderResult(result);
      recordResult(result);
      setConnection(true, 'MODEL ONLINE');
      if (scrollResult && window.innerWidth < 901) document.querySelector('.result-panel').scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) {
      showError(error.message);
      toast('Prediction failed — check the match details or backend.');
      if (/connect|timed out/i.test(error.message)) setConnection(false, 'API OFFLINE');
    } finally {setBusy(false);}
  }
  const fmt = (value) => Number(value).toLocaleString('en-US', {maximumFractionDigits: 2});
  function renderResult(result) {
    state.lastResult = result;
    const win = result.win_probability;
    const lose = result.lose_probability;
    const isTie = result.match_status === 'tied' || win === null || win === undefined;
    const winValue = isTie ? null : Math.max(0, Math.min(100, Number(win)));
    const loseValue = isTie ? null : Math.max(0, Math.min(100, Number(lose)));
    $('win-percent').innerHTML = isTie ? 'TIE' : `${fmt(winValue)}<small>%</small>`;
    $('probability-ring').style.setProperty('--win', `${winValue ?? 0}%`);
    $('probability-ring').setAttribute('aria-label', isTie ? 'Scores tied' : `${result.batting_team} win probability ${fmt(winValue)} percent`);
    $('gauge-team').textContent = isTie ? 'SUPER OVER NOT MODELLED' : `${teamStyle(result.batting_team)[0]} · CHASING`;
    $('win-list-value').textContent = isTie ? '—' : `${fmt(winValue)}%`;
    $('lose-list-value').textContent = isTie ? '—' : `${fmt(loseValue)}%`;
    $('win-bar').style.width = `${winValue ?? 0}%`;
    $('lose-bar').style.width = `${loseValue ?? 0}%`;
    $('chasing-team-label').textContent = result.batting_team;
    $('defending-team-label').textContent = result.bowling_team;
    $('winner-label').textContent = isTie ? 'Match tied' : result.predicted_winner || 'No prediction';
    $('result-message').textContent = result.message || 'Model-generated win probability.';
    $('runs-left').textContent = fmt(result.runs_left);
    $('balls-left').textContent = fmt(result.balls_left);
    $('crr').textContent = fmt(result.current_run_rate);
    $('rrr').textContent = result.required_run_rate == null ? '—' : fmt(result.required_run_rate);
    const statusLabels = {in_progress:'MODEL PREDICTION READY', won:'CHASE COMPLETED · WON', lost:'INNINGS ENDED · LOST', tied:'MATCH TIED'};
    $('result-status').className = 'result-status result-status--ready';
    $('result-status').innerHTML = `<span class="status-flash"></span>${statusLabels[result.match_status] || 'RESULT READY'}`;
  }

  function recordResult(result) {
    const signature = `${result.batting_team}|${result.bowling_team}|${result.city}|${result.target}`;
    if (state.signature !== signature) {state.history = []; state.signature = signature;}
    if (result.win_probability !== null && result.win_probability !== undefined) {
      const entry = {balls: result.balls_bowled, win: Number(result.win_probability), score: result.current_score, wickets: result.wickets_lost};
      const existing = state.history.findIndex(x => x.balls === entry.balls);
      if (existing >= 0) state.history[existing] = entry;
      else state.history.push(entry);
      state.history.sort((a,b)=>a.balls - b.balls);
    }
    drawChart();
  }
  function svgElement(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,value] of Object.entries(attributes)) el.setAttribute(key,String(value));
    return el;
  }
  function drawChart() {
    const history = state.history;
    $('chart-placeholder').hidden = history.length > 0;
    $('chart-placeholder').style.display = history.length ? 'none' : 'flex';
    $('history-count').textContent = `${history.length} prediction${history.length===1?'':'s'} recorded`;
    const pointsGroup = $('chart-points');
    pointsGroup.replaceChildren();
    const points = history.map(entry => ({x: (entry.balls / 120) * 720, y: 232 - (entry.win / 100) * 224, ...entry}));
    const path = points.map((p, i) => `${i ? 'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    $('chart-line-path').setAttribute('d', path);
    $('chart-area-path').setAttribute('d', points.length >= 5 ? `${path} L${points.at(-1).x.toFixed(1)},232 L${points[0].x.toFixed(1)},232 Z` : '');
    for (const point of points) {
      const circle = svgElement('circle',{cx:point.x,cy:point.y,r:5,fill:'#c8fd4a',stroke:'#0c1c22','stroke-width':2});
      const title = svgElement('title');
      title.textContent = `${Math.floor(point.balls/6)}.${point.balls%6} overs: ${fmt(point.win)}% win chance (${point.score}/${point.wickets})`;
      circle.append(title);pointsGroup.append(circle);
    }
  }
  function ballToOver(balls) {return `${Math.floor(balls / 6)}.${balls % 6}`;}
  async function quickScenario(runChange, wicketChange) {
    clearError();
    let payload;
    try {payload = getPayload();} catch (error) {showError(error.message);document.getElementById('predictor').scrollIntoView({behavior:'smooth'});return;}
    const balls = validOver(payload.overs);
    if (balls >= 120 || payload.wickets_lost >= 10 || payload.current_score >= payload.target) {
      toast('The innings has ended. Try an earlier match situation.'); return;
    }
    els.overs.value = ballToOver(balls + 1);
    els.score.value = String(payload.current_score + runChange);
    els.wickets.value = String(payload.wickets_lost + wicketChange);
    await predict(false);
    if (state.online) toast(`Scenario tested: ${runChange ? '+' + runChange + ' runs' : 'wicket lost'} on the next ball.`);
  }
  function openModal() {
    els.apiInput.value = getBaseURL();
    els.apiMessage.textContent = '';
    els.modal.classList.add('is-open');
    els.modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    els.apiInput.focus();
  }
  function closeModal() {
    els.modal.classList.remove('is-open');
    els.modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  function validBaseURL(url) {
    try {
      const parsed = new URL(url);
      return ['http:','https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && (parsed.pathname==='/' || parsed.pathname==='');
    } catch (_) {return false;}
  }

  function setupEvents() {
    els.form.addEventListener('submit', (event) => {event.preventDefault();predict(true);});
    [els.batting, els.bowling].forEach(el => el.addEventListener('change', () => {syncTeamVisuals(); clearError();}));
    $('swap-teams').addEventListener('click', () => {
      const tmp = els.batting.value;
      els.batting.value = els.bowling.value;
      els.bowling.value = tmp;
      syncTeamVisuals();clearError();
    });
    $('reset-button').addEventListener('click', () => {
      if ([...els.batting.options].some(x => x.value === 'Mumbai Indians')) els.batting.value = 'Mumbai Indians';
      if ([...els.bowling.options].some(x => x.value === 'Chennai Super Kings')) els.bowling.value = 'Chennai Super Kings';
      if ([...els.city.options].some(x => x.value === 'Mumbai')) els.city.value = 'Mumbai';
      els.target.value='181';els.score.value='120';els.overs.value='13.0';els.wickets.value='4';
      syncTeamVisuals();clearError();toast('Example scenario restored.');
    });
    $('scenario-four').addEventListener('click', () => quickScenario(4,0));
    $('scenario-wicket').addEventListener('click', () => quickScenario(0,1));
    $('clear-history').addEventListener('click',()=>{state.history=[];drawChart();toast('Momentum chart cleared.');});
    ['settings-button','status-button','footer-settings'].forEach(id => $(id).addEventListener('click',openModal));
    document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click',closeModal));
    document.addEventListener('keydown', event => {if(event.key==='Escape' && els.modal.classList.contains('is-open'))closeModal();});
    els.form.addEventListener('input', () => {if (!els.error.hidden) clearError();});
    $('reset-api-url').addEventListener('click', async () => {
      setStoredURL('');els.apiInput.value = automaticURL();els.apiMessage.textContent='Automatic URL restored.';
      const ok = await loadOptions(true);if(ok){closeModal();toast('Connected using automatic API URL.');}
    });
    $('settings-form').addEventListener('submit', async event => {
      event.preventDefault();
      const url = normalize(els.apiInput.value);
      if (url && !validBaseURL(url)) {els.apiMessage.textContent='Use a complete root URL, e.g. https://your-backend.vercel.app (no /api path).'; return;}
      setStoredURL(url);els.apiMessage.textContent='Testing API connection...';
      const success = await loadOptions(true);
      if(success) {closeModal();toast('Backend connected successfully.');}
      else {els.apiMessage.textContent='Could not connect. Verify URL, backend deployment, and CORS.';}
    });
    $('year').textContent = String(new Date().getFullYear());
    const navItems=document.querySelectorAll('.nav-links a');
    navItems.forEach(item => item.addEventListener('click',()=>{navItems.forEach(n=>n.classList.remove('active'));item.classList.add('active');}));
  }
  function init() {setFallbacks();setupEvents();drawChart();loadOptions(true);}
  init();
})();
