# Ski Season Fitness

A small, mobile-first workout tracker for a conservative return to training before ski season. It's a static web app with no build step and no dependencies, and it works offline after the first load.

- **Plan**: day cards for Tue / Wed / Thu / Fri, each showing focus, duration, completion status and a **Today** marker.
- **Workout**: exercise cards with target, form cue, a suggested starting load (clearly labelled), safety notes and substitutions. Each set row has a done button, the actual load (lb / kg / bodyweight / band), actual reps or time, and an optional note. You can skip an exercise with a reason. Progress updates as you check off sets.
- **Session check-in**: effort 1–10, pain 0–10, next morning compared with usual, and notes on neck, arms, feet, joints, energy and anything to adjust. Edits save automatically.
- **History**: sessions by date, consistency over the last 28 days, effort, pain and next-morning patterns, per-exercise history, and an optional weekly body-weight log.
- **Data**: JSON backup and CSV export (plus Share on devices that support it), restore from backup, unit setting, and delete-all with confirmation.

This tracker is a logging tool, not medical treatment or advice.

## Run locally

Any static file server works. From the repo root:

```bash
python3 -m http.server 8080
# or
npm start            # uses npx http-server
```

Open <http://localhost:8080>. To try it on your phone, use your computer's LAN IP (e.g. `http://192.168.1.20:8080`) on the same Wi-Fi. Offline mode needs HTTPS or `localhost`, so over a LAN IP the app works but won't cache for offline use.

Opening `index.html` directly from disk (`file://`) also works for logging, but without offline caching.

## Deploy (free) and add to the iPhone Home Screen

**GitHub Pages:** push this repo to GitHub, then go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, pick your branch and `/ (root)`, and save. The app will be served at `https://<user>.github.io/<repo>/`.
Netlify, Cloudflare Pages or Vercel also work: drop in the folder, with no build command and the repo root as the output directory.

**On the iPhone:**
1. Open the deployed URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the icon. After the first load it works offline.

## Where data is stored

- Logs are saved in `localStorage` in the browser you're using, on that device. **There is no account and no cloud sync.**
- On iPhone, the Home Screen app keeps **separate storage from Safari tabs**. Pick one and stick with it, or move data with Export → Restore.
- Clearing website data, or deleting the Home Screen app, erases the log. Use **Data → Download backup (JSON)** now and then.

## Editing the plan

All workout content lives in **`data/workouts.js`**, separate from the app code and from your logs.

- Change names, cues, targets, suggested loads, safety notes or substitutions freely.
- Keep `id` values stable. Logs are keyed by workout and exercise ids, so history survives edits. Reusing an exercise id in another workout (e.g. `sit-to-stand`) shows your previous numbers for it there.
- To add week 2, append another object to `weeks` with new unique workout ids (e.g. `w2-tue`). Set `startsOn` to that week's Monday so the dates and the **Today** marker line up.
- After deploying changes, bump `CACHE` in `sw.js` (e.g. `ski-fitness-v2`). Installed copies then pick up the new files on their next launch or two.

The app never raises weights automatically. Suggested loads are text hints only, and load fields start empty.

## Data model

- Plan (`data/workouts.js`): `weeks[] → workouts[] { id, dayLabel, dayOfWeek, title, focus, durationMinutes, warmup[], exercises[], cooldown[] }`
- Exercise: `{ id, name, targetSets, minSets?, targetReps, repsUnit, loadType, loadUnit, suggestedLoad, cue, substitutions[], safetyNotes[], optional? }`
- Logs (`localStorage["skiSeasonFitness.v1"]`):
  - `sessions{id → { id, workoutId, workoutTitle, date, completedAt, overallEffort, painDuring, nextMorningStatus, notes{neck,arms,feet,joints,energy,adjust}, warmupDone[], cooldownDone[], exercises{exerciseId → { name, skipped, skipReason, sets[] }} }}`
  - Set log: `{ setNumber, completed, actualWeight, weightUnit: "lb"|"kg"|"bw"|"band", actualReps, note }`
  - `bodyWeightLogs[] { id, date, weight, unit, note }` and `settings.weightUnit`

## Tests

An end-to-end script drives the real UI in Chromium at iPhone size and at 320 px wide. It covers set logging, live progress, persistence across reloads, the check-in, history, export, reset and delete confirmations, restore, horizontal overflow, and offline loading.

```bash
npm install          # installs playwright (first time only)
npx playwright install chromium   # if you don't already have a Playwright browser
npm start &          # serve on :8080
npm test
```
