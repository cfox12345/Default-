/*
 * Ski Season Fitness — workout plan definitions.
 *
 * Edit this file to revise the plan. Your logged sessions are stored
 * separately (in the browser), keyed by the stable `id` values below, so
 * changing names, cues or targets will not erase history.
 *
 * Rules for editing:
 *  - Keep `id` values stable. Reusing an exercise id in another workout
 *    (e.g. "sit-to-stand") lets the app show your previous numbers for it.
 *  - Workout ids must be unique across all weeks.
 *  - Add a new week by appending another object to `weeks`.
 *
 * Exercise fields:
 *  id            stable identifier
 *  name          display name
 *  targetSets    number of set rows to show (maximum when a range is given)
 *  minSets       optional lower bound, e.g. 1 for "1–2 sets"
 *  targetReps    number (prefills reps when a set is checked) or text like "8–10"
 *  repsUnit      "" (reps), "/ side", "sec / side", "sec each", "min"
 *  loadType      "weight" | "bodyweight" | "band" | "none" (no load column)
 *  loadUnit      unit for suggestedLoad ("lb" by default)
 *  suggestedLoad optional starting suggestion text — never an assumed old weight
 *  cue           short form cue
 *  substitutions regression / swap options
 *  safetyNotes   when to skip or scale
 *  optional      true if it should not count toward completion
 */
window.SKI_FITNESS_PLAN = {
  id: 'ski-season-2026',
  title: 'Ski Season Fitness',
  defaultUnit: 'lb',
  intensityNote:
    'Easy to moderate: about RPE 4–6/10, leaving 3–4 reps in reserve. No max testing and no sets to failure. Suggested loads are starting estimates only — log what you actually use.',
  safetyReminder: [
    'Stop the exercise for sharp or increasing pain, returning radiating arm symptoms, new numbness, or unusual weakness.',
    'Arthritis flare or worse-than-usual next-morning symptoms: reduce volume and intensity, or rest.',
    'No loaded neck work or aggressive neck stretching. Follow your clinician / physical therapist restrictions.',
    'This tracker is not medical treatment or advice.'
  ],
  weeks: [
    {
      id: 'wk1-baseline',
      label: 'Week 1 · Baseline',
      // Monday of this week (YYYY-MM-DD). Used to show dates and the "Today" marker.
      startsOn: '2026-10-19',
      note: 'An introductory week before the NYC trip. This is a baseline, not a return to old numbers.',
      workouts: [
        {
          id: 'w1-tue',
          dayLabel: 'Tuesday',
          dayOfWeek: 2,
          title: 'Full-body baseline A',
          focus: 'Strength foundation: legs, hinge, push, pull, core',
          durationMinutes: [25, 35],
          warmup: [
            'Easy walk or gentle marching — 3–5 min',
            'Comfortable shoulder rolls and gentle, pain-free thoracic movement — 5–8 reps each',
            'Sit-to-stand from bench — 6–8 easy reps'
          ],
          exercises: [
            {
              id: 'sit-to-stand',
              name: 'Bench sit-to-stand / box squat',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: 'Bodyweight',
              cue: 'Feet about hip-width. Sit back to lightly touch the bench, then stand tall. Smooth, no bouncing.',
              substitutions: ['Raise the seat (add a firm cushion) if knees or hips complain.'],
              safetyNotes: []
            },
            {
              id: 'db-rdl',
              name: 'Dumbbell Romanian deadlift',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: 'Light dumbbells, e.g. 5–12 lb each',
              cue: 'Soft knees, push hips back, flat back, dumbbells close to the thighs. Stop around mid-shin or where the hamstrings feel a stretch.',
              substitutions: ['Unloaded hip hinge (hands on hips) if neck or back is not comfortable.'],
              safetyNotes: [
                'Only add dumbbells if the neck and back remain comfortable.',
                'Keep the gaze slightly down — do not crane the neck up.'
              ]
            },
            {
              id: 'incline-db-press',
              name: 'Incline dumbbell press',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: 'Light dumbbells, e.g. 5–12 lb each',
              cue: 'Bench at a comfortable incline (or flat). Lower under control, press smoothly, head resting on the bench.',
              substitutions: ['Flat bench or a lighter pair if the shoulder or neck feels tight.'],
              safetyNotes: ['Stop if it brings on arm tingling, shock-like pain, or numbness.']
            },
            {
              id: 'chest-supported-row',
              name: 'Chest-supported incline dumbbell row',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: 'Very light dumbbells, e.g. 5–8 lb each',
              cue: 'Chest on the incline bench, arms hanging. Row elbows toward the hips, pause, lower slowly.',
              substitutions: ['Light band row, standing, if lying on the bench is uncomfortable.'],
              safetyNotes: ['Keep the neck neutral and avoid shrugging — let the head hang in line, do not look up.']
            },
            {
              id: 'glute-bridge',
              name: 'Glute bridge',
              targetSets: 2,
              targetReps: 10,
              repsUnit: '',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: 'Bodyweight',
              cue: 'Feet flat, press through the heels, lift hips until knees–hips–shoulders line up. Pause one second.',
              substitutions: ['Smaller range if the hamstrings cramp.'],
              safetyNotes: ['Press through feet and upper back — do not push through the head or neck.']
            },
            {
              id: 'dead-bug',
              name: 'Dead bug heel taps',
              targetSets: 2,
              targetReps: 5,
              repsUnit: '/ side',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: null,
              cue: 'On your back, knees bent 90°. Slowly lower one heel to tap the floor while the low back stays gently down. Breathe.',
              substitutions: ['Shorter range: tap only partway down.'],
              safetyNotes: ['Keep the head relaxed on the floor; do not lift or strain the neck. Slow and pain-free.']
            }
          ],
          cooldown: ['Easy walking and comfortable breathing — 2–4 min']
        },
        {
          id: 'w1-wed',
          dayLabel: 'Wednesday',
          dayOfWeek: 3,
          title: 'Recovery, balance & easy conditioning',
          focus: 'Easy walk, supported balance, gentle mobility',
          durationMinutes: [15, 25],
          note: 'This is a recovery day, not a conditioning test. If symptoms are elevated, do only a short comfortable walk or rest.',
          warmup: [],
          exercises: [
            {
              id: 'easy-walk',
              name: 'Easy walk',
              targetSets: 1,
              targetReps: '10–15',
              repsUnit: 'min',
              loadType: 'none',
              suggestedLoad: null,
              cue: 'Conversational pace on a comfortable surface, in supportive shoes.',
              substitutions: [],
              safetyNotes: []
            },
            {
              id: 'single-leg-balance',
              name: 'Supported single-leg balance',
              targetSets: 2,
              targetReps: '15–20',
              repsUnit: 'sec / side',
              loadType: 'none',
              suggestedLoad: null,
              cue: 'Fingertips near a wall or sturdy support. Stand tall, soft knee, eyes forward.',
              substitutions: ['Narrow two-foot stance if single-leg is uncomfortable.'],
              safetyNotes: ['Skip if foot or joint symptoms make it uncomfortable.']
            },
            {
              id: 'calf-raise',
              name: 'Standing calf raise (holding support)',
              targetSets: 2,
              minSets: 1,
              targetReps: '8–10',
              repsUnit: '',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: 'Bodyweight',
              cue: 'Hold support. Rise slowly, lower slowly, only through a comfortable range.',
              substitutions: ['Seated calf raise if standing bothers the feet.'],
              safetyNotes: ['Stop short of any sharp heel or arch pain.']
            },
            {
              id: 'band-pull-apart',
              name: 'Band pull-apart or band row',
              targetSets: 2,
              minSets: 1,
              targetReps: 10,
              repsUnit: '',
              loadType: 'band',
              loadUnit: 'lb',
              suggestedLoad: 'Lightest band',
              cue: 'Gently squeeze the shoulder blades to spread the band. Shoulders relaxed and down, neck neutral.',
              substitutions: ['Band row (anchored band) if pull-aparts feel strained.'],
              safetyNotes: ['Stop if it brings on neck, trap, or arm symptoms.']
            },
            {
              id: 'hip-calf-mobility',
              name: 'Hip-flexor and calf mobility',
              targetSets: 1,
              targetReps: '20–30',
              repsUnit: 'sec each',
              loadType: 'none',
              suggestedLoad: null,
              cue: 'Gentle, comfortable stretch. No forcing, no bouncing.',
              substitutions: [],
              safetyNotes: []
            }
          ],
          cooldown: []
        },
        {
          id: 'w1-thu',
          dayLabel: 'Thursday',
          dayOfWeek: 4,
          title: 'Full-body baseline B',
          focus: 'Lighter full-body day: step-up, press, row, hinge, hips',
          durationMinutes: [25, 35],
          note: 'Lighter than a hard training day.',
          warmup: [
            'Easy walk or gentle marching — 3–5 min',
            'Bench sit-to-stand — 6 reps',
            'Unloaded hip hinge — 6 reps'
          ],
          exercises: [
            {
              id: 'bench-step-up',
              name: 'Low, controlled bench step-up',
              targetSets: 2,
              minSets: 1,
              targetReps: 6,
              repsUnit: '/ side',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: 'Bodyweight',
              cue: 'Whole foot on the flat bench. Step up under control, step down slowly. A hand on the wall is fine.',
              substitutions: ['If the bench is too high or uncomfortable: bench sit-to-stand 2 × 8 instead (log it here and add a note).'],
              safetyNotes: [
                'Only if the bench height is safe and stable and foot/knee symptoms stay comfortable.'
              ]
            },
            {
              id: 'db-floor-press',
              name: 'Dumbbell floor press or flat-bench press',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: 'Light dumbbells, e.g. 5–12 lb each',
              cue: 'Elbows about 45° from the body. Lower under control, press smoothly, head relaxed.',
              substitutions: ['Floor press limits range if the shoulder is touchy.'],
              safetyNotes: ['Stop if it brings on arm tingling, shock-like pain, or numbness.']
            },
            {
              id: 'one-arm-db-row',
              name: 'Supported one-arm dumbbell row',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '/ side',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: 'Light dumbbell, e.g. 5–12 lb',
              cue: 'Free hand on the bench, flat back. Pull the elbow toward the hip, lower slowly.',
              substitutions: ['Lighter dumbbell or a band row.'],
              safetyNotes: ['Avoid twisting or shrugging; keep the neck in line with the spine.']
            },
            {
              id: 'kb-deadlift',
              name: 'Kettlebell deadlift (elevated start)',
              targetSets: 2,
              targetReps: 8,
              repsUnit: '',
              loadType: 'weight',
              loadUnit: 'lb',
              suggestedLoad: '30 lb kettlebell — only if clearly easy and symptom-free',
              cue: 'Kettlebell raised on a sturdy, stable surface so you are not reaching far down. Hips back, flat back, stand tall.',
              substitutions: [
                'Unloaded hip hinge.',
                'Light dumbbell RDL (e.g. 5–12 lb each).'
              ],
              safetyNotes: ['If the 30 lb bell is not clearly easy, use a substitution instead.']
            },
            {
              id: 'band-hip-abduction',
              name: 'Standing band hip abduction',
              targetSets: 2,
              minSets: 1,
              targetReps: 8,
              repsUnit: '/ side',
              loadType: 'band',
              loadUnit: 'lb',
              suggestedLoad: 'Light loop band',
              cue: 'Hold a support, stand tall, move the leg out to the side slowly without leaning.',
              substitutions: ['No band — bodyweight only.'],
              safetyNotes: []
            },
            {
              id: 'bird-dog',
              name: 'Bird dog, short range',
              targetSets: 2,
              minSets: 1,
              targetReps: 5,
              repsUnit: '/ side',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: null,
              cue: 'Hands under shoulders, knees under hips. Reach one arm and the opposite leg out a short way, return slowly.',
              substitutions: ['Dead bug heel taps (2 × 5 / side) if the neck will not stay neutral.'],
              safetyNotes: ['Only if the neck stays neutral and the movement is comfortable.']
            }
          ],
          cooldown: ['Easy walking and relaxed breathing — 2–4 min']
        },
        {
          id: 'w1-fri',
          dayLabel: 'Friday',
          dayOfWeek: 5,
          title: 'Travel-day reset',
          focus: 'Brief mobility before leaving for NYC',
          durationMinutes: [5, 10],
          note: 'No hard workout is required on travel day. Missing Friday is not a failure.',
          warmup: [],
          exercises: [
            {
              id: 'home-walk',
              name: 'Gentle walk around the home',
              targetSets: 1,
              targetReps: '2–3',
              repsUnit: 'min',
              loadType: 'none',
              suggestedLoad: null,
              cue: 'Easy, relaxed pace.',
              substitutions: [],
              safetyNotes: []
            },
            {
              id: 'scap-squeeze',
              name: 'Shoulder blade squeezes',
              targetSets: 1,
              targetReps: 8,
              repsUnit: '',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: null,
              cue: 'Gently draw the shoulder blades back and down. No shrugging.',
              substitutions: [],
              safetyNotes: []
            },
            {
              id: 'sit-to-stand',
              name: 'Sit-to-stand',
              targetSets: 1,
              targetReps: 6,
              repsUnit: '',
              loadType: 'bodyweight',
              loadUnit: 'lb',
              suggestedLoad: 'Bodyweight',
              cue: 'Easy reps, stand tall at the top.',
              substitutions: [],
              safetyNotes: []
            },
            {
              id: 'ankle-hip-mobility',
              name: 'Calf/ankle pumps and comfortable hip movement',
              targetSets: 1,
              targetReps: '1–2',
              repsUnit: 'min',
              loadType: 'none',
              suggestedLoad: null,
              cue: 'Gentle ankle pumps and easy hip circles. Comfortable range only.',
              substitutions: [],
              safetyNotes: []
            },
            {
              id: 'easy-walk',
              name: 'Optional short walk',
              targetSets: 1,
              targetReps: null, // no fixed target — log minutes if you do it
              repsUnit: 'min',
              loadType: 'none',
              suggestedLoad: null,
              optional: true,
              cue: 'Only if time and symptoms allow.',
              substitutions: [],
              safetyNotes: []
            }
          ],
          cooldown: []
        }
      ]
    }
  ]
};
