/* Ski Season Fitness — local-first workout tracker. No build step, no dependencies. */
(function () {
  'use strict';

  const PLAN = window.SKI_FITNESS_PLAN;
  const STORAGE_KEY = 'skiSeasonFitness.v1';
  const SCHEMA_VERSION = 1;

  const NOTE_FIELDS = [
    { key: 'neck', label: 'Neck / traps / scalenes' },
    { key: 'arms', label: 'Arms — tingling, shock-like pain, numbness, weakness' },
    { key: 'feet', label: 'Feet' },
    { key: 'joints', label: 'Joints / arthritis' },
    { key: 'energy', label: 'Energy & sleep' },
    { key: 'adjust', label: 'Anything to adjust next time' }
  ];
  const NEXT_MORNING = [
    { value: 'better', label: 'Better' },
    { value: 'same', label: 'About the same' },
    { value: 'worse', label: 'Worse' }
  ];
  const UNIT_LABEL = { lb: 'lb', kg: 'kg', bw: 'Bodyweight', band: 'Band' };

  // ---------- Plan lookups ----------
  const workoutsById = {};
  const weekByWorkoutId = {};
  const exerciseNames = {};
  PLAN.weeks.forEach((week) => {
    week.workouts.forEach((w) => {
      workoutsById[w.id] = w;
      weekByWorkoutId[w.id] = week;
      w.exercises.forEach((ex) => {
        if (!exerciseNames[ex.id]) exerciseNames[ex.id] = ex.name;
      });
    });
  });

  // ---------- Small DOM helper ----------
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden']);
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v; // only used for static icons
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (PROPS.has(k)) node[k] = v;
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    children.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }

  const ICONS = {
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 19h4L19 9l-4-4L5 15z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 10v4m0 3v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M17 17H5l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function icon(name, cls) {
    return h('span', { class: 'icon' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: ICONS[name] });
  }

  // ---------- Dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function todayISO() { return toISO(new Date()); }
  function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtDate(iso, opts) {
    return parseISO(iso).toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function plannedDate(workout) {
    const week = weekByWorkoutId[workout.id];
    if (!week || !week.startsOn) return null;
    const start = parseISO(week.startsOn);
    start.setDate(start.getDate() + ((workout.dayOfWeek - start.getDay() + 7) % 7));
    return toISO(start);
  }
  function isToday(workout) {
    const pd = plannedDate(workout);
    return pd ? pd === todayISO() : new Date().getDay() === workout.dayOfWeek;
  }

  // ---------- State & persistence ----------
  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, settings: { weightUnit: PLAN.defaultUnit || 'lb' }, sessions: {}, bodyWeightLogs: [] };
  }
  function normalizeState(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== 'object') return s;
    if (raw.settings && (raw.settings.weightUnit === 'lb' || raw.settings.weightUnit === 'kg')) s.settings.weightUnit = raw.settings.weightUnit;
    const list = Array.isArray(raw.sessions) ? raw.sessions : Object.values(raw.sessions || {});
    list.forEach((sess) => {
      if (sess && sess.id && sess.workoutId) s.sessions[sess.id] = normalizeSession(sess);
    });
    if (Array.isArray(raw.bodyWeightLogs)) {
      s.bodyWeightLogs = raw.bodyWeightLogs.filter((b) => b && b.date && b.weight !== undefined).map((b) => ({
        id: b.id || uid(), date: b.date, weight: b.weight, unit: b.unit || 'lb', note: b.note || ''
      }));
    }
    return s;
  }
  function normalizeSession(sess) {
    const notes = Object.assign({}, ...NOTE_FIELDS.map((f) => ({ [f.key]: '' })), sess.notes || {});
    return Object.assign({
      warmupDone: [], cooldownDone: [], exercises: {}, overallEffort: null, painDuring: null,
      nextMorningStatus: null, completedAt: null, date: todayISO(), createdAt: Date.now(), updatedAt: Date.now()
    }, sess, { notes });
  }

  let storageAvailable = true;
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : emptyState();
    } catch (e) {
      storageAvailable = false;
      return emptyState();
    }
  }

  let state = loadState();
  let saveTimer = null;
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
      flashSaved();
    } catch (e) {
      storageAvailable = false;
      showToast('Could not save — storage is full or blocked. Export a backup.');
    }
    document.getElementById('storage-warning').hidden = storageAvailable;
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }
  function flushSave() { if (saveTimer) saveNow(); }
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

  let savedTimer = null;
  function flashSaved() {
    const el = document.getElementById('save-status');
    el.textContent = 'Saved';
    el.classList.add('is-visible');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('is-visible'), 1400);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Sessions ----------
  function newSession(workout) {
    return normalizeSession({
      id: uid(),
      workoutId: workout.id,
      workoutTitle: workout.title,
      dayLabel: workout.dayLabel,
      date: todayISO(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  function sessionsFor(workoutId) {
    return Object.values(state.sessions)
      .filter((s) => s.workoutId === workoutId)
      .sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
  }
  function allSessionsSorted() {
    return Object.values(state.sessions).sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
  }
  function defaultWeightUnit(ex) {
    if (ex.loadType === 'bodyweight') return 'bw';
    if (ex.loadType === 'band') return 'band';
    if (ex.loadType === 'none') return null;
    return state.settings.weightUnit;
  }
  /** Returns the log for an exercise in a session, creating empty set rows as needed. */
  function exerciseLog(session, ex) {
    let log = session.exercises[ex.id];
    if (!log) log = session.exercises[ex.id] = { exerciseId: ex.id, name: ex.name, skipped: false, skipReason: '', sets: [] };
    while (log.sets.length < ex.targetSets) {
      log.sets.push({
        setNumber: log.sets.length + 1, completed: false, actualWeight: '',
        weightUnit: defaultWeightUnit(ex), actualReps: '', note: ''
      });
    }
    return log;
  }
  function setHasData(s) {
    return s.completed || String(s.actualWeight).trim() !== '' || String(s.actualReps).trim() !== '' || (s.note || '').trim() !== '';
  }
  function logHasData(log) {
    return !!log && (log.skipped || log.sets.some(setHasData));
  }
  function workoutProgress(workout, session) {
    let done = 0, total = 0, skipped = 0, logged = 0;
    workout.exercises.forEach((ex) => {
      const log = session && session.exercises[ex.id];
      const completed = log ? log.sets.filter((s) => s.completed).length : 0;
      logged += log && !log.skipped ? completed : 0;
      if (ex.optional) return;
      if (log && log.skipped) { skipped++; return; }
      const required = ex.minSets || ex.targetSets;
      total += required;
      done += Math.min(completed, required);
    });
    const pct = total ? done / total : (skipped ? 1 : 0);
    return { done, total, pct, logged };
  }

  // Draft = a session shown on screen but not stored until the first edit,
  // so simply opening a workout never creates empty history entries.
  let draft = null;
  function getDraft(workout) {
    if (!draft || draft.workoutId !== workout.id || state.sessions[draft.id]) draft = newSession(workout);
    return draft;
  }
  function commit(session) {
    session.updatedAt = Date.now();
    if (!state.sessions[session.id]) {
      state.sessions[session.id] = session;
      history.replaceState(null, '', `#/w/${session.workoutId}/${session.id}`);
      const reset = document.querySelector('[data-role="reset-workout"]');
      if (reset) reset.hidden = false;
    }
    scheduleSave();
  }

  // ---------- Formatting ----------
  function setsLabel(ex) { return ex.minSets ? `${ex.minSets}–${ex.targetSets}` : String(ex.targetSets); }
  function targetLabel(ex) {
    if (ex.targetReps == null) return ex.optional ? 'Optional' : `${setsLabel(ex)} set${ex.targetSets > 1 ? 's' : ''}`;
    return `${setsLabel(ex)} × ${ex.targetReps}${ex.repsUnit ? ' ' + ex.repsUnit : ''}`;
  }
  function repsHeader(ex) {
    const u = ex.repsUnit || '';
    if (u.includes('min')) return 'Min';
    if (u.includes('sec')) return 'Sec';
    return u.includes('side') ? 'Reps/side' : 'Reps';
  }
  function formatSet(s) {
    const parts = [];
    const w = String(s.actualWeight).trim();
    if (s.weightUnit === 'bw') parts.push('BW');
    else if (s.weightUnit === 'band') parts.push(w ? `band (${w})` : 'band');
    else if (w) parts.push(`${w} ${s.weightUnit}`);
    const r = String(s.actualReps).trim();
    if (r) parts.push(parts.length ? `× ${r}` : r);
    let out = parts.join(' ');
    if (!out) out = s.completed ? 'done' : '';
    if (out && !s.completed) out += ' (unchecked)';
    return out;
  }
  function formatLog(log) {
    if (log.skipped) return 'Skipped' + (log.skipReason ? ` — ${log.skipReason}` : '');
    return log.sets.filter(setHasData).map(formatSet).filter(Boolean).join(' · ');
  }
  function previousLog(exId, session) {
    for (const s of allSessionsSorted()) {
      if (s.id === session.id) continue;
      if (s.date > session.date || (s.date === session.date && s.createdAt > session.createdAt)) continue;
      const log = s.exercises[exId];
      if (logHasData(log)) return { session: s, log };
    }
    return null;
  }
  function workoutTitleFor(session) {
    const w = workoutsById[session.workoutId];
    return w ? `${w.dayLabel} · ${w.title}` : `${session.dayLabel || ''} · ${session.workoutTitle || session.workoutId}`;
  }

  // ---------- Toast & confirm ----------
  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2600);
  }
  function confirmAction({ title, body, confirmLabel }) {
    const dlg = document.getElementById('confirm-dialog');
    if (typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    document.getElementById('confirm-ok').textContent = confirmLabel || 'Confirm';
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    });
  }

  // ---------- Shared UI pieces ----------
  function progressBar(pct, extraClass) {
    const bar = h('div', { class: 'progress' + (extraClass ? ' ' + extraClass : ''), role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct * 100)) },
      h('div', { class: 'progress-fill', style: `width:${Math.round(pct * 100)}%` }));
    return bar;
  }
  function setProgress(bar, pct) {
    bar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
    bar.firstChild.style.width = `${Math.round(pct * 100)}%`;
  }
  function safetyBox(compact) {
    return h('aside', { class: 'safety' + (compact ? ' safety-compact' : '') },
      h('div', { class: 'safety-title' }, icon('alert'), 'Safety'),
      h('ul', null, (compact ? PLAN.safetyReminder.slice(0, 2) : PLAN.safetyReminder).map((t) => h('li', null, t))));
  }
  function scaleButtons({ min, max, value, onPick, highlight, label }) {
    const group = h('div', { class: 'scale', role: 'group', 'aria-label': label, style: `--cols:${Math.ceil((max - min + 1) / 2)}` });
    for (let i = min; i <= max; i++) {
      const btn = h('button', {
        type: 'button',
        class: 'scale-btn' + (highlight && highlight.includes(i) ? ' is-target' : ''),
        'aria-pressed': String(value === i)
      }, String(i));
      btn.addEventListener('click', () => {
        const next = value === i ? null : i;
        value = next;
        group.querySelectorAll('.scale-btn').forEach((b, idx) => b.setAttribute('aria-pressed', String(min + idx === next)));
        onPick(next);
      });
      group.appendChild(btn);
    }
    return group;
  }
  function segmented({ options, value, onPick, label }) {
    const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
    options.forEach((opt) => {
      const btn = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(value === opt.value) }, opt.label);
      btn.addEventListener('click', () => {
        value = value === opt.value ? null : opt.value;
        group.querySelectorAll('.seg-btn').forEach((b, idx) => b.setAttribute('aria-pressed', String(options[idx].value === value)));
        onPick(value);
      });
      group.appendChild(btn);
    });
    return group;
  }
  function autoGrow(ta) {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
    ta.addEventListener('input', fit);
    requestAnimationFrame(fit);
    return ta;
  }

  // ---------- Views ----------
  const view = document.getElementById('view');

  function render() {
    flushSave();
    const route = parseRoute();
    document.querySelectorAll('.tabbar a').forEach((a) => {
      const active = a.dataset.tab === (route.name === 'workout' ? 'home' : route.name);
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    view.replaceChildren();
    if (route.name === 'workout') renderWorkout(route);
    else if (route.name === 'history') renderHistory();
    else if (route.name === 'data') renderData();
    else renderHome();
    window.scrollTo(0, 0);
  }

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'w' && parts[1]) return { name: 'workout', workoutId: parts[1], sessionId: parts[2] || null };
    if (parts[0] === 'history') return { name: 'history' };
    if (parts[0] === 'data') return { name: 'data' };
    return { name: 'home' };
  }

  // ----- Home -----
  function renderHome() {
    const pending = pendingMorningCheck();
    if (pending) view.appendChild(pending);

    [...PLAN.weeks].reverse().forEach((week) => {
      view.appendChild(h('section', { class: 'week' },
        h('div', { class: 'section-head' },
          h('h1', { class: 'week-title' }, week.label),
          week.note && h('p', { class: 'muted' }, week.note)),
        h('div', { class: 'day-list' }, week.workouts.map(dayCard))));
    });

    view.appendChild(h('section', { class: 'card intensity' },
      h('h2', { class: 'card-title' }, 'How hard?'),
      h('p', null, PLAN.intensityNote)));
    view.appendChild(safetyBox(true));
    view.appendChild(h('p', { class: 'fine-print' },
      'Saved only in this browser on this device. ', h('a', { href: '#/data' }, 'Backup & storage info')));
  }

  function dayCard(w) {
    const latest = sessionsFor(w.id)[0];
    const pd = plannedDate(w);
    const today = isToday(w);
    let status;
    if (latest && latest.completedAt) {
      status = h('span', { class: 'status status-done' }, icon('check'), `Done ${fmtDate(latest.date, { month: 'short', day: 'numeric' })}`);
    } else if (latest) {
      const p = workoutProgress(w, latest);
      status = h('span', { class: 'status' }, progressBar(p.pct, 'progress-mini'), `${Math.round(p.pct * 100)}%`);
    } else {
      status = h('span', { class: 'status status-idle' }, 'Not started');
    }
    const [lo, hi] = w.durationMinutes;
    return h('a', { class: 'day-card' + (today ? ' is-today' : '') + (latest && latest.completedAt ? ' is-done' : ''), href: `#/w/${w.id}` },
      h('div', { class: 'day-badge' },
        h('span', { class: 'day-dow' }, w.dayLabel.slice(0, 3)),
        pd && h('span', { class: 'day-num' }, String(parseISO(pd).getDate()))),
      h('div', { class: 'day-body' },
        h('div', { class: 'day-top' },
          h('span', { class: 'day-title' }, w.title),
          today && h('span', { class: 'pill pill-accent' }, 'Today')),
        h('div', { class: 'day-focus' }, w.focus),
        h('div', { class: 'day-meta' }, h('span', null, `${lo}–${hi} min`), status)),
      icon('chevron', 'day-chevron'));
  }

  function pendingMorningCheck() {
    const today = todayISO();
    const s = allSessionsSorted().find((x) => x.completedAt && !x.nextMorningStatus && x.date < today && daysBetween(x.date, today) <= 2);
    if (!s) return null;
    const card = h('section', { class: 'card morning' },
      h('h2', { class: 'card-title' }, 'Next-morning check'),
      h('p', { class: 'muted' }, `How do you feel compared with usual after ${fmtDate(s.date)} — ${workoutTitleFor(s)}?`),
      segmented({
        options: NEXT_MORNING, value: null, label: 'Next morning compared with usual',
        onPick: (v) => {
          s.nextMorningStatus = v;
          commit(s);
          saveNow();
          showToast(v === 'worse' ? 'Noted. Consider reducing volume or resting today.' : 'Noted — thanks.');
          setTimeout(render, 600);
        }
      }));
    return card;
  }

  // ----- Workout -----
  function renderWorkout(route) {
    const workout = workoutsById[route.workoutId];
    if (!workout) return renderOrphanSession(route);

    let session;
    if (route.sessionId && route.sessionId !== 'new') session = state.sessions[route.sessionId];
    if (!session && route.sessionId !== 'new') session = sessionsFor(workout.id)[0];
    if (!session || session.workoutId !== workout.id) session = getDraft(workout);
    const persisted = () => !!state.sessions[session.id];

    // Sticky header with live progress
    const progressEl = progressBar(0);
    const progressText = h('span', { class: 'wk-progress-text' });
    const updateProgress = () => {
      const p = workoutProgress(workout, session);
      setProgress(progressEl, p.pct);
      progressText.replaceChildren(h('strong', null, `${Math.round(p.pct * 100)}%`), h('span', null, `${p.logged} set${p.logged === 1 ? '' : 's'} done`));
    };
    view.appendChild(h('div', { class: 'wk-header' },
      h('div', { class: 'wk-header-row' },
        h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Back to plan' }, icon('back')),
        h('div', { class: 'wk-titles' },
          h('div', { class: 'wk-day' }, workout.dayLabel),
          h('h1', { class: 'wk-title' }, workout.title)),
        progressText),
      progressEl));

    // Session meta
    const dateInput = h('input', { type: 'date', class: 'date-input', value: session.date, 'aria-label': 'Session date', max: todayISO() });
    dateInput.addEventListener('change', () => {
      session.date = dateInput.value || todayISO();
      commit(session);
    });
    const [lo, hi] = workout.durationMinutes;
    const meta = h('section', { class: 'session-meta' },
      h('div', { class: 'meta-line' },
        h('span', { class: 'muted' }, `${workout.focus} · ${lo}–${hi} min`)),
      h('label', { class: 'meta-date' }, h('span', null, 'Session date'), dateInput));
    view.appendChild(meta);

    if (session.completedAt) {
      view.appendChild(h('div', { class: 'banner' },
        h('span', null, icon('check'), ` Completed ${fmtDate(session.date)}. You can still edit it.`),
        h('a', { class: 'btn btn-secondary btn-small', href: `#/w/${workout.id}/new` }, 'Log again')));
    }
    if (workout.note) view.appendChild(h('p', { class: 'workout-note' }, workout.note));
    view.appendChild(h('p', { class: 'intensity-line' }, 'Easy–moderate · RPE 4–6 · 3–4 reps in reserve. Stop for sharp/increasing pain, radiating arm symptoms, new numbness or weakness.'));

    if (workout.warmup.length) view.appendChild(checklistCard('Warm-up', workout.warmup, session, 'warmupDone'));

    const list = h('div', { class: 'ex-list' });
    workout.exercises.forEach((ex, i) => list.appendChild(exerciseCard(workout, ex, i, session, updateProgress)));
    view.appendChild(list);

    if (workout.cooldown.length) view.appendChild(checklistCard('Cool-down', workout.cooldown, session, 'cooldownDone'));

    view.appendChild(summaryCard(workout, session));

    const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost-danger', 'data-role': 'reset-workout', hidden: !persisted() }, 'Reset this workout');
    resetBtn.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: 'Reset this workout?',
        body: `This clears every set, note and rating logged for ${workout.dayLabel} on ${fmtDate(session.date)}. Other sessions are not affected. This cannot be undone.`,
        confirmLabel: 'Reset'
      });
      if (!ok) return;
      delete state.sessions[session.id];
      saveNow();
      draft = null;
      showToast('Workout reset');
      if (location.hash === `#/w/${workout.id}/new`) render(); else location.hash = `#/w/${workout.id}/new`;
    });
    view.appendChild(h('div', { class: 'page-actions' }, resetBtn));

    updateProgress();
  }

  function checklistCard(title, items, session, key) {
    return h('section', { class: 'card checklist' },
      h('h2', { class: 'card-title' }, title),
      items.map((text, i) => {
        const btn = h('button', { type: 'button', class: 'check-item', 'aria-pressed': String(session[key].includes(i)) },
          h('span', { class: 'check-box' }, icon('check')), h('span', null, text));
        btn.addEventListener('click', () => {
          const idx = session[key].indexOf(i);
          if (idx >= 0) session[key].splice(idx, 1); else session[key].push(i);
          btn.setAttribute('aria-pressed', String(idx < 0));
          commit(session);
        });
        return btn;
      }));
  }

  function exerciseCard(workout, ex, index, session, onProgress) {
    const log = exerciseLog(session, ex);
    const card = h('article', { class: 'card ex-card' + (log.skipped ? ' is-skipped' : ''), id: `ex-${ex.id}` });
    const count = h('span', { class: 'ex-count' });
    const updateCount = () => {
      const done = log.sets.filter((s) => s.completed).length;
      const required = ex.minSets || ex.targetSets;
      count.textContent = log.skipped ? 'Skipped' : `${done}/${setsLabel(ex)}`;
      card.classList.toggle('is-complete', !log.skipped && done >= required);
    };
    const rebuild = () => {
      card.replaceWith(exerciseCard(workout, ex, index, session, onProgress));
      onProgress();
    };

    card.appendChild(h('header', { class: 'ex-head' },
      h('span', { class: 'ex-num' }, String(index + 1)),
      h('div', { class: 'ex-titles' },
        h('h3', { class: 'ex-name' }, ex.name, ex.optional && h('span', { class: 'pill' }, 'Optional')),
        h('div', { class: 'ex-target' }, targetLabel(ex))),
      count));

    if (ex.cue) card.appendChild(h('p', { class: 'ex-cue' }, ex.cue));
    if (ex.suggestedLoad) {
      card.appendChild(h('p', { class: 'ex-line ex-suggest' },
        h('span', { class: 'tag' }, 'Suggested start'),
        h('span', null, ex.suggestedLoad + (ex.loadType === 'weight' ? ' — pick what feels controlled; editable.' : ''))));
    }
    (ex.safetyNotes || []).forEach((n) => card.appendChild(h('p', { class: 'ex-line ex-safety' }, icon('alert'), h('span', null, n))));
    (ex.substitutions || []).forEach((n) => card.appendChild(h('p', { class: 'ex-line ex-sub' }, icon('swap'), h('span', null, n))));

    const prev = previousLog(ex.id, session);
    if (prev) {
      card.appendChild(h('p', { class: 'ex-line ex-last' },
        h('span', { class: 'tag' }, `Last · ${fmtDate(prev.session.date, { month: 'short', day: 'numeric' })}`),
        h('span', null, formatLog(prev.log) || '—')));
    }

    if (log.skipped) {
      const reason = h('input', { type: 'text', class: 'text-input', value: log.skipReason, placeholder: 'Reason (optional) — e.g. neck tight', 'aria-label': `Reason for skipping ${ex.name}`, maxlength: '200' });
      reason.addEventListener('input', () => { log.skipReason = reason.value; commit(session); });
      const undo = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, 'Undo skip');
      undo.addEventListener('click', () => { log.skipped = false; commit(session); rebuild(); });
      card.appendChild(h('div', { class: 'skip-box' }, reason, undo));
    } else {
      const hasLoad = ex.loadType !== 'none';
      const sets = h('div', { class: 'sets' + (hasLoad ? '' : ' sets-noload') },
        h('div', { class: 'set-row set-head', 'aria-hidden': 'true' },
          h('span', null, '#'), hasLoad && h('span', null, 'Load'), h('span', null, repsHeader(ex)), h('span'), h('span', null, 'Done')),
        log.sets.map((set, i) => setRow(ex, log, set, i, session, () => { updateCount(); onProgress(); })));
      card.appendChild(sets);
      const skip = h('button', { type: 'button', class: 'link-btn' }, 'Skip exercise');
      skip.addEventListener('click', () => { log.skipped = true; commit(session); rebuild(); });
      card.appendChild(h('div', { class: 'ex-foot' }, skip));
    }
    updateCount();
    return card;
  }

  function weightPlaceholder(unit) {
    if (unit === 'bw') return 'BW';
    if (unit === 'band') return 'level';
    return '—';
  }
  function unitOptions(current) {
    const opts = [state.settings.weightUnit, 'bw', 'band'];
    if (current && !opts.includes(current)) opts.unshift(current);
    return opts;
  }

  function setRow(ex, log, set, idx, session, onChange) {
    const n = set.setNumber;
    const wrap = h('div', { class: 'set' + (set.completed ? ' is-done' : '') });
    const cells = [h('span', { class: 'set-num' }, String(n))];

    let weightInput = null;
    if (ex.loadType !== 'none') {
      weightInput = h('input', {
        type: 'text', class: 'set-input', inputmode: set.weightUnit === 'band' ? 'text' : 'decimal',
        value: set.weightUnit === 'bw' ? '' : set.actualWeight, placeholder: weightPlaceholder(set.weightUnit),
        disabled: set.weightUnit === 'bw', autocomplete: 'off', maxlength: '16', 'aria-label': `Set ${n} load`
      });
      weightInput.addEventListener('input', () => { set.actualWeight = weightInput.value.trim(); commit(session); });
      const unitSelect = h('select', { class: 'unit-select', 'aria-label': `Set ${n} load unit` },
        unitOptions(set.weightUnit).map((u) => h('option', { value: u, selected: u === set.weightUnit }, UNIT_LABEL[u])));
      unitSelect.addEventListener('change', () => {
        set.weightUnit = unitSelect.value;
        if (set.weightUnit === 'bw') set.actualWeight = '';
        weightInput.disabled = set.weightUnit === 'bw';
        weightInput.value = set.actualWeight;
        weightInput.placeholder = weightPlaceholder(set.weightUnit);
        weightInput.inputMode = set.weightUnit === 'band' ? 'text' : 'decimal';
        commit(session);
      });
      const weightCell = h('div', { class: 'weight-cell' + (set.weightUnit === 'bw' ? ' is-bw' : '') }, weightInput, unitSelect);
      unitSelect.addEventListener('change', () => weightCell.classList.toggle('is-bw', set.weightUnit === 'bw'));
      cells.push(weightCell);
    }

    const repsInput = h('input', {
      type: 'text', class: 'set-input reps-input', inputmode: 'decimal', value: set.actualReps,
      placeholder: ex.targetReps == null ? '' : String(ex.targetReps), autocomplete: 'off', maxlength: '10',
      'aria-label': `Set ${n} ${repsHeader(ex).toLowerCase()}`
    });
    repsInput.addEventListener('input', () => { set.actualReps = repsInput.value.trim(); commit(session); });
    cells.push(repsInput);

    const noteInput = h('input', { type: 'text', class: 'text-input', value: set.note, placeholder: 'Set note — e.g. left side felt tight', maxlength: '200', 'aria-label': `Set ${n} note` });
    const noteRow = h('div', { class: 'set-note', hidden: !set.note });
    noteRow.appendChild(noteInput);
    const noteBtn = h('button', { type: 'button', class: 'icon-btn note-btn' + (set.note ? ' has-note' : ''), 'aria-label': `Note for set ${n}`, 'aria-expanded': String(!!set.note) }, icon('note'));
    noteBtn.addEventListener('click', () => {
      noteRow.hidden = !noteRow.hidden;
      noteBtn.setAttribute('aria-expanded', String(!noteRow.hidden));
      if (!noteRow.hidden) noteInput.focus();
    });
    noteInput.addEventListener('input', () => {
      set.note = noteInput.value;
      noteBtn.classList.toggle('has-note', !!set.note.trim());
      commit(session);
    });
    cells.push(noteBtn);

    const check = h('button', { type: 'button', class: 'set-check', 'aria-pressed': String(set.completed), 'aria-label': `Set ${n} done` }, icon('check'));
    check.addEventListener('click', () => {
      set.completed = !set.completed;
      if (set.completed) {
        // Convenience only: fill the target reps and carry the previous set's load
        // from THIS session if left blank. Never fills from older sessions.
        if (set.actualReps === '' && typeof ex.targetReps === 'number') {
          set.actualReps = String(ex.targetReps);
          repsInput.value = set.actualReps;
        }
        if (weightInput && set.actualWeight === '' && set.weightUnit !== 'bw') {
          const prevSet = log.sets.slice(0, idx).reverse().find((s) => s.actualWeight !== '' && s.weightUnit === set.weightUnit);
          if (prevSet) { set.actualWeight = prevSet.actualWeight; weightInput.value = set.actualWeight; }
        }
      }
      wrap.classList.toggle('is-done', set.completed);
      check.setAttribute('aria-pressed', String(set.completed));
      commit(session);
      onChange();
    });
    cells.push(check);

    wrap.appendChild(h('div', { class: 'set-row' }, cells));
    wrap.appendChild(noteRow);
    return wrap;
  }

  function summaryCard(workout, session) {
    const card = h('section', { class: 'card summary', id: 'session-summary' });
    card.appendChild(h('h2', { class: 'card-title' }, 'Session check-in'));

    card.appendChild(h('div', { class: 'field' },
      h('div', { class: 'field-label' }, 'Overall effort', h('span', { class: 'muted' }, '1 very easy · 10 max — aim for 4–6')),
      scaleButtons({ min: 1, max: 10, value: session.overallEffort, highlight: [4, 5, 6], label: 'Overall effort 1 to 10',
        onPick: (v) => { session.overallEffort = v; commit(session); } })));

    card.appendChild(h('div', { class: 'field' },
      h('div', { class: 'field-label' }, 'Pain during workout', h('span', { class: 'muted' }, '0 none · 10 worst')),
      scaleButtons({ min: 0, max: 10, value: session.painDuring, label: 'Pain during workout 0 to 10',
        onPick: (v) => { session.painDuring = v; commit(session); } })));

    card.appendChild(h('div', { class: 'field' },
      h('div', { class: 'field-label' }, 'Next morning vs usual', h('span', { class: 'muted' }, 'Fill in tomorrow')),
      segmented({ options: NEXT_MORNING, value: session.nextMorningStatus, label: 'Next morning compared with usual',
        onPick: (v) => { session.nextMorningStatus = v; commit(session); } })));

    const notes = h('div', { class: 'notes-grid' });
    NOTE_FIELDS.forEach((f) => {
      const id = `note-${f.key}`;
      const ta = autoGrow(h('textarea', { id, class: 'text-input', rows: '1', value: session.notes[f.key] || '', maxlength: '2000' }));
      ta.addEventListener('input', () => { session.notes[f.key] = ta.value; commit(session); });
      notes.appendChild(h('div', { class: 'note-field' }, h('label', { for: id }, f.label), ta));
    });
    card.appendChild(h('div', { class: 'field' }, h('div', { class: 'field-label' }, 'Notes'), notes));

    card.appendChild(safetyBox(false));

    const finish = h('button', { type: 'button', class: 'btn ' + (session.completedAt ? 'btn-secondary' : 'btn-primary') + ' btn-block' },
      session.completedAt ? 'Mark as not finished' : 'Finish session');
    finish.addEventListener('click', () => {
      session.completedAt = session.completedAt ? null : Date.now();
      commit(session);
      saveNow();
      showToast(session.completedAt ? 'Session saved. Add next-morning status tomorrow.' : 'Marked as in progress');
      render();
    });
    card.appendChild(h('p', { class: 'muted small' }, 'Everything saves automatically as you type.'));
    card.appendChild(finish);
    return card;
  }

  function renderOrphanSession(route) {
    const s = route.sessionId && state.sessions[route.sessionId];
    view.appendChild(h('div', { class: 'wk-header' },
      h('div', { class: 'wk-header-row' },
        h('a', { class: 'icon-btn', href: '#/history', 'aria-label': 'Back to history' }, icon('back')),
        h('div', { class: 'wk-titles' }, h('h1', { class: 'wk-title' }, s ? workoutTitleFor(s) : 'Workout not found')))));
    if (!s) {
      view.appendChild(h('p', { class: 'card' }, 'This workout is not in the current plan. ', h('a', { href: '#/' }, 'Back to the plan')));
      return;
    }
    view.appendChild(h('section', { class: 'card' },
      h('p', { class: 'muted' }, `${fmtDate(s.date)} — this workout has since been removed from the plan, so it is shown read-only.`),
      h('ul', { class: 'plain-list' }, Object.values(s.exercises).filter(logHasData).map((log) =>
        h('li', null, h('strong', null, log.name || exerciseNames[log.exerciseId] || log.exerciseId), ': ', formatLog(log))))));
  }

  // ----- History -----
  function renderHistory() {
    const sessions = allSessionsSorted().filter((s) => Object.values(s.exercises).some(logHasData) || s.completedAt || s.overallEffort != null || s.painDuring != null);
    view.appendChild(h('div', { class: 'section-head' }, h('h1', { class: 'week-title' }, 'History')));

    if (!sessions.length) {
      view.appendChild(h('section', { class: 'card empty' },
        h('p', null, 'No sessions logged yet. Open a day from the plan and check off your first set — it will appear here.'),
        h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to plan')));
      view.appendChild(bodyWeightCard());
      return;
    }

    view.appendChild(consistencyCard(sessions));

    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Sessions'),
      h('ul', { class: 'session-list' }, sessions.map((s) => {
        const w = workoutsById[s.workoutId];
        const p = w ? workoutProgress(w, s) : null;
        return h('li', null, h('a', { class: 'session-row', href: `#/w/${s.workoutId}/${s.id}` },
          h('div', { class: 'session-main' },
            h('div', { class: 'session-date' }, fmtDate(s.date), s.completedAt ? h('span', { class: 'pill pill-accent' }, 'Done') : h('span', { class: 'pill' }, 'In progress')),
            h('div', { class: 'session-title' }, workoutTitleFor(s)),
            h('div', { class: 'chips' },
              p && h('span', { class: 'chip' }, `${p.logged} sets`),
              s.overallEffort != null && h('span', { class: 'chip' }, `Effort ${s.overallEffort}`),
              s.painDuring != null && h('span', { class: 'chip' + (s.painDuring >= 4 ? ' chip-warn' : '') }, `Pain ${s.painDuring}`),
              s.nextMorningStatus && h('span', { class: 'chip' + (s.nextMorningStatus === 'worse' ? ' chip-warn' : '') }, `Next AM: ${NEXT_MORNING.find((x) => x.value === s.nextMorningStatus).label.toLowerCase()}`))),
          icon('chevron', 'day-chevron')));
      }))));

    view.appendChild(exerciseHistoryCard(sessions));
    view.appendChild(bodyWeightCard());
  }

  function consistencyCard(sessions) {
    const today = todayISO();
    const byDate = new Set(sessions.map((s) => s.date));
    const days = [];
    const start = new Date();
    start.setDate(start.getDate() - 27);
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISO(d);
      days.push(h('span', { class: 'cal-day' + (byDate.has(iso) ? ' is-on' : '') + (iso === today ? ' is-today' : ''), title: fmtDate(iso) }));
    }
    const last28 = sessions.filter((s) => daysBetween(s.date, today) < 28 && daysBetween(s.date, today) >= 0);
    const pains = sessions.filter((s) => s.painDuring != null).map((s) => s.painDuring);
    const efforts = sessions.filter((s) => s.overallEffort != null).map((s) => s.overallEffort);
    const morning = sessions.filter((s) => s.nextMorningStatus);
    const worse = morning.filter((s) => s.nextMorningStatus === 'worse').length;
    const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

    const stats = [
      ['Sessions, last 4 weeks', String(last28.length)],
      ['Finished', String(sessions.filter((s) => s.completedAt).length)],
      ['Avg effort', efforts.length ? avg(efforts) : '—'],
      ['Avg pain during', pains.length ? avg(pains) : '—'],
      ['Next AM worse', morning.length ? `${worse} of ${morning.length}` : '—']
    ];
    const recent = sessions.slice(0, 8).reverse();
    return h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Consistency & recovery'),
      h('div', { class: 'cal', 'aria-label': 'Training days in the last 4 weeks' }, days),
      h('div', { class: 'cal-legend muted small' }, 'Last 28 days — filled = a session logged'),
      h('dl', { class: 'stats' }, stats.map(([k, v]) => h('div', { class: 'stat' }, h('dt', null, k), h('dd', null, v)))),
      recent.some((s) => s.painDuring != null) && h('div', { class: 'pain-strip' },
        h('div', { class: 'muted small' }, 'Pain during, recent sessions (0–10)'),
        h('div', { class: 'pain-bars' }, recent.map((s) => h('div', { class: 'pain-col', title: `${fmtDate(s.date)}: ${s.painDuring ?? 'not recorded'}` },
          h('div', { class: 'pain-bar' + (s.painDuring >= 4 ? ' is-high' : ''), style: `height:${s.painDuring == null ? 0 : Math.max(4, s.painDuring * 10)}%` }),
          h('span', { class: 'pain-val' }, s.painDuring == null ? '–' : String(s.painDuring)))))),
      worse > 0 && h('p', { class: 'muted small' }, 'When the next morning is worse than usual, scale back volume or intensity — or rest — before the next session.'));
  }

  function exerciseHistoryCard(sessions) {
    const byEx = new Map();
    sessions.forEach((s) => {
      Object.values(s.exercises).forEach((log) => {
        if (!logHasData(log)) return;
        if (!byEx.has(log.exerciseId)) byEx.set(log.exerciseId, []);
        byEx.get(log.exerciseId).push({ s, log });
      });
    });
    const items = [...byEx.entries()].sort((a, b) => (exerciseNames[a[0]] || a[1][0].log.name).localeCompare(exerciseNames[b[0]] || b[1][0].log.name));
    return h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Exercise history'),
      h('p', { class: 'muted small' }, 'Compare what you actually did. No automatic progression — decide changes with how you felt.'),
      items.map(([id, entries]) => h('details', { class: 'ex-history' },
        h('summary', null, h('span', null, exerciseNames[id] || entries[0].log.name), h('span', { class: 'muted small' }, `${entries.length}×`)),
        h('ul', { class: 'plain-list' }, entries.map(({ s, log }) =>
          h('li', null, h('span', { class: 'muted' }, fmtDate(s.date, { month: 'short', day: 'numeric' }) + ' '), formatLog(log) || '—'))))));
  }

  function bodyWeightCard() {
    const logs = [...state.bodyWeightLogs].sort((a, b) => b.date.localeCompare(a.date));
    const last = logs[0];
    const dateIn = h('input', { type: 'date', class: 'text-input', value: todayISO(), max: todayISO(), 'aria-label': 'Weigh-in date' });
    const weightIn = h('input', { type: 'text', inputmode: 'decimal', class: 'text-input', placeholder: state.settings.weightUnit, 'aria-label': `Body weight in ${state.settings.weightUnit}`, maxlength: '6' });
    const noteIn = h('input', { type: 'text', class: 'text-input', placeholder: 'Note (optional)', maxlength: '120', 'aria-label': 'Weigh-in note' });
    const add = h('button', { type: 'submit', class: 'btn btn-secondary' }, 'Add');
    const form = h('form', { class: 'bw-form' }, dateIn, weightIn, add, noteIn);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const w = parseFloat(weightIn.value.replace(',', '.'));
      if (!(w > 50 && w < 700)) { showToast('Enter a weight, e.g. 178.4'); weightIn.focus(); return; }
      state.bodyWeightLogs.push({ id: uid(), date: dateIn.value || todayISO(), weight: w, unit: state.settings.weightUnit, note: noteIn.value.trim() });
      saveNow();
      showToast('Weekly weigh-in saved');
      render();
      requestAnimationFrame(() => {
        const d = document.querySelector('.bw-card');
        if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
      });
    });

    const sinceLast = last ? daysBetween(last.date, todayISO()) : null;
    const first = logs[logs.length - 1];
    return h('details', { class: 'card bw-card' },
      h('summary', null, h('span', { class: 'card-title' }, 'Body weight'), h('span', { class: 'muted small' }, 'optional · weekly')),
      h('p', { class: 'muted small' }, 'Once a week is plenty — same day, same time. The goal is a gradual trend while keeping strength, not daily numbers.'),
      sinceLast != null && sinceLast < 7 && h('p', { class: 'small note-callout' }, `Last weigh-in was ${sinceLast === 0 ? 'today' : sinceLast + ' day' + (sinceLast === 1 ? '' : 's') + ' ago'}. Next one around ${fmtDate(toISO(new Date(parseISO(last.date).getTime() + 7 * 86400000)))}.`),
      form,
      logs.length > 1 && first.unit === last.unit && h('p', { class: 'small' }, `Change since ${fmtDate(first.date, { month: 'short', day: 'numeric' })}: ${(last.weight - first.weight > 0 ? '+' : '') + (last.weight - first.weight).toFixed(1)} ${last.unit}`),
      logs.length > 0 && h('ul', { class: 'bw-list' }, logs.map((b) => {
        const del = h('button', { type: 'button', class: 'link-btn', 'aria-label': `Delete weigh-in from ${fmtDate(b.date)}` }, 'Delete');
        del.addEventListener('click', async () => {
          if (!(await confirmAction({ title: 'Delete weigh-in?', body: `${fmtDate(b.date)}: ${b.weight} ${b.unit}`, confirmLabel: 'Delete' }))) return;
          state.bodyWeightLogs = state.bodyWeightLogs.filter((x) => x.id !== b.id);
          saveNow();
          render();
        });
        return h('li', null, h('span', null, fmtDate(b.date)), h('strong', null, `${b.weight} ${b.unit}`), b.note && h('span', { class: 'muted small' }, b.note), del);
      })));
  }

  // ----- Data -----
  function renderData() {
    view.appendChild(h('div', { class: 'section-head' }, h('h1', { class: 'week-title' }, 'Data & backup')));

    const sessionCount = Object.keys(state.sessions).length;
    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Where your log lives'),
      h('p', null, 'Everything is saved only in this browser on this device. There is no account and no cloud sync, so entries will not appear on other devices or in other browsers.'),
      h('ul', { class: 'plain-list small' },
        h('li', null, 'On iPhone, the Home Screen app keeps its own storage, separate from Safari tabs. Pick one and use it consistently, or move data with Export / Restore.'),
        h('li', null, 'Clearing website data, or deleting the Home Screen app, erases the log.'),
        h('li', null, 'Export a backup now and then — especially before changing phones.')),
      h('p', { class: 'muted small' }, `${sessionCount} session${sessionCount === 1 ? '' : 's'} and ${state.bodyWeightLogs.length} weigh-in${state.bodyWeightLogs.length === 1 ? '' : 's'} stored.`)));

    const stamp = todayISO();
    const jsonName = `ski-fitness-backup-${stamp}.json`;
    const csvName = `ski-fitness-sets-${stamp}.csv`;
    const exportCard = h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Export my log'),
      h('p', { class: 'muted small' }, 'JSON is a complete backup that can be restored here. CSV lists every set for spreadsheets.'));
    const btns = h('div', { class: 'btn-stack' });
    const jsonBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Download backup (JSON)');
    jsonBtn.addEventListener('click', () => downloadFile(jsonName, exportJSON(), 'application/json'));
    const csvBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Download sets (CSV)');
    csvBtn.addEventListener('click', () => downloadFile(csvName, exportCSV(), 'text/csv'));
    btns.append(jsonBtn, csvBtn);
    if (canShareFiles()) {
      const shareBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Share backup…');
      shareBtn.addEventListener('click', () => shareFile(jsonName, exportJSON(), 'application/json'));
      btns.appendChild(shareBtn);
    }
    exportCard.appendChild(btns);
    view.appendChild(exportCard);

    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'restore-file' });
    fileIn.addEventListener('change', async () => {
      const file = fileIn.files && fileIn.files[0];
      fileIn.value = '';
      if (!file) return;
      let parsed;
      try { parsed = JSON.parse(await file.text()); } catch (e) { showToast('That file is not a valid backup.'); return; }
      if (!parsed || (!parsed.sessions && !parsed.bodyWeightLogs)) { showToast('That file is not a Ski Season Fitness backup.'); return; }
      const incoming = normalizeState(parsed);
      const ok = await confirmAction({
        title: 'Restore from backup?',
        body: `This replaces everything currently stored here with the backup (${Object.keys(incoming.sessions).length} sessions, ${incoming.bodyWeightLogs.length} weigh-ins).`,
        confirmLabel: 'Replace & restore'
      });
      if (!ok) return;
      state = incoming;
      draft = null;
      saveNow();
      showToast('Backup restored');
      render();
    });
    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Restore from backup'),
      h('p', { class: 'muted small' }, 'Load a JSON backup exported from this app. You will be asked to confirm before anything is replaced.'),
      fileIn,
      h('label', { for: 'restore-file', class: 'btn btn-secondary', role: 'button', tabindex: '0',
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } } }, 'Choose backup file…')));

    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Units'),
      h('p', { class: 'muted small' }, 'Default unit for new weight entries and weigh-ins. Existing entries keep the unit they were logged in.'),
      segmented({ options: [{ value: 'lb', label: 'Pounds (lb)' }, { value: 'kg', label: 'Kilograms (kg)' }], value: state.settings.weightUnit, label: 'Weight unit',
        onPick: (v) => { state.settings.weightUnit = v || state.settings.weightUnit; saveNow(); render(); } })));

    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Add to iPhone Home Screen'),
      h('ol', { class: 'plain-list small numbered' },
        h('li', null, 'Open this page in Safari.'),
        h('li', null, 'Tap the Share button, then “Add to Home Screen”.'),
        h('li', null, 'Open it from the new icon. After the first load it works offline.'))));

    const clearBtn = h('button', { type: 'button', class: 'btn btn-danger' }, 'Delete all local data');
    clearBtn.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: 'Delete all local data?',
        body: 'This permanently erases every session, set, note, rating and weigh-in stored in this browser. Export a backup first if you might want it. This cannot be undone.',
        confirmLabel: 'Delete everything'
      });
      if (!ok) return;
      state = emptyState();
      draft = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      showToast('All local data deleted');
      render();
    });
    view.appendChild(h('section', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Danger zone'),
      h('p', { class: 'muted small' }, 'Workout definitions live in data/workouts.js and are not affected.'),
      clearBtn));

    view.appendChild(h('p', { class: 'fine-print' }, 'This tracker is a logging tool, not medical treatment or advice. Follow your clinician and physical therapist.'));
  }

  // ---------- Export ----------
  function exportJSON() {
    return JSON.stringify({
      app: 'ski-season-fitness',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      planId: PLAN.id,
      settings: state.settings,
      sessions: allSessionsSorted(),
      bodyWeightLogs: state.bodyWeightLogs,
      plan: PLAN
    }, null, 2);
  }
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCSV() {
    const header = ['session_date', 'workout_id', 'workout', 'exercise_id', 'exercise', 'skipped', 'skip_reason', 'set_number', 'completed',
      'actual_weight', 'weight_unit', 'actual_reps', 'set_note', 'overall_effort', 'pain_during', 'next_morning', 'session_finished',
      ...NOTE_FIELDS.map((f) => 'notes_' + f.key), 'session_id'];
    const rows = [header];
    allSessionsSorted().slice().reverse().forEach((s) => {
      const common = (row) => row.concat([s.overallEffort, s.painDuring, s.nextMorningStatus || '', s.completedAt ? 'yes' : 'no', ...NOTE_FIELDS.map((f) => s.notes[f.key] || ''), s.id]);
      const w = workoutsById[s.workoutId];
      const order = w ? w.exercises.map((e) => e.id) : [];
      const logs = Object.values(s.exercises).filter(logHasData).sort((a, b) => order.indexOf(a.exerciseId) - order.indexOf(b.exerciseId));
      const base = [s.date, s.workoutId, s.workoutTitle || (w && w.title)];
      if (!logs.length) rows.push(common(base.concat(['', '', '', '', '', '', '', '', '', ''])));
      logs.forEach((log) => {
        const name = exerciseNames[log.exerciseId] || log.name;
        if (log.skipped) { rows.push(common(base.concat([log.exerciseId, name, 'yes', log.skipReason, '', '', '', '', '', '']))); return; }
        log.sets.filter(setHasData).forEach((set) => rows.push(common(base.concat([log.exerciseId, name, 'no', '', set.setNumber, set.completed ? 'yes' : 'no',
          set.weightUnit === 'bw' ? '' : set.actualWeight, set.weightUnit === 'bw' ? 'bodyweight' : set.weightUnit, set.actualReps, set.note]))));
      });
    });
    if (state.bodyWeightLogs.length) {
      rows.push([]);
      rows.push(['body_weight_date', 'weight', 'unit', 'note']);
      [...state.bodyWeightLogs].sort((a, b) => a.date.localeCompare(b.date)).forEach((b) => rows.push([b.date, b.weight, b.unit, b.note]));
    }
    return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  function downloadFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = h('a', { href: url, download: name, hidden: true });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    showToast(`Exported ${name}`);
  }
  function canShareFiles() {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] }));
    } catch (e) { return false; }
  }
  async function shareFile(name, text, type) {
    try {
      await navigator.share({ files: [new File([text], name, { type })], title: 'Ski Season Fitness backup' });
    } catch (e) {
      if (e && e.name !== 'AbortError') showToast('Sharing failed — use Download instead.');
    }
  }

  // ---------- Boot ----------
  document.getElementById('storage-warning').hidden = storageAvailable;
  window.addEventListener('hashchange', render);
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
