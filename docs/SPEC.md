# Starship Flight 15 Simulation

**Disclaimer:** This is an educational, visual approximation based on public data. It is not an official SpaceX product, does not use internal telemetry, and is not suitable for operations, safety, or forensic flight analysis. If a number has no source, do not make one up: label it as an estimate or leave it blank.

Research was completed on 19 November 2026 (Córdoba time, UTC−3). The flight already happened, so there is no need to rely on a published plan or an earlier flight.

## 1. Goal

Create a new GitHub project in three.js that realistically depicts the launch and return of Starship Flight 15: Super Heavy ascent, hot-staging, the booster return (including its actual diversion, not a catch that never happened), the Ship's orbital coast, reentry, and catch at the Pad 2 tower.

The project also evaluates the OpenCode preset Cristian will use: an orchestrator (with Oracle-style reviews) and an implementer/fixer. The orchestrator plans, delegates, and reviews. The implementer writes the code in stages. At the end, record how each role performed without changing the model stack.

Cristian uses OpenCode for implementation. This document is the spec, not the code.

## 2. What happened on the actual flight

Flight 15 lifted off on Friday, 13 November 2026, from Pad 2 at Starbase, Texas. Press reports place liftoff around 16:47 CST (22:47 UTC; 19:47 Córdoba time). SpaceX did not publish the exact second on the mission page. Some accounts, including Wikipedia, give 22:47:36 UTC, but the footnote does not adequately support that level of precision, so the working time is “around 22:47 UTC”.

Vehicles: Super Heavy Booster 22 and Ship 42, both of the V3 (Block 3) generation. This was the fourth flight of that generation. Payload: 26 Starlink V3 satellites (the mission is also listed as Starlink Group 31-2).

**Booster.** It ascended on 33 Raptor engines. After hot-staging, it flipped and relit 32 of the 33 engines planned for boostback. The burn ended early due to a low fuel mass alarm; the root cause was still under investigation as of 14 November. The GNC aborted the catch during coast and diverted the booster to a point in the Gulf. It performed the landing burn, cut its engines while hovering over the water, and triggered the flight termination system (FTS) at shutdown. There was no booster catch. SpaceX did not publish splashdown coordinates or an exact distance.

**Ship.** It completed a nominal ascent burn, shut down its engines, and later lit a single Raptor for orbital insertion. SpaceX and the webcast described an orbit of about 275 km. Jonathan McDowell reported an insertion burn of about 92 m/s that produced a nearly circular orbit at 276 km. The Ship deployed all 26 Starlink V3 satellites, and contact was established with all of them. After more than 20 hours in space (about 14 orbits, about 22,5 hours after liftoff), it performed a deorbit burn with one sea-level Raptor, reentered, flew a final “swoosh” over the Gulf, and was caught by Mechazilla's arms at the same Pad 2. It was the first catch of a Starship upper stage. Spaceflight Now places the catch at 15:20 CST on 14 November (21:20 UTC; 18:20 Córdoba time).

SpaceX's public timeline says “All Times Approximate”. The table still lists T+00:06:35 as “Super Heavy landing burn shutdown and catch”, but the booster was not caught on the actual flight. Use those times as a public reference while showing the actual outcome (hover, shutdown, FTS).

### Public timeline (SpaceX, approximate times)

| T+ (h:min:s) | Event | What to use in the sim |
| --- | --- | --- |
| 00:00:00 | Liftoff | Liftoff from Pad 2 |
| 00:00:58 | Max Q | Timing only; no official altitude |
| 00:02:19 | Super Heavy MECO | Most booster engines shut down |
| 00:02:21 | Hot-staging | Ship ignition and separation. Space.com estimates an altitude of about 65 km |
| 00:02:26 | Boostback start | 32 of 33 planned engines |
| 00:03:02 | Boostback shutdown | Early shutdown due to low fuel mass |
| 00:06:10 | Booster landing burn start | 13 engines, according to webcast coverage |
| 00:06:35 | Landing burn shutdown | Actual outcome: hover over the Gulf, shutdown, and FTS. No catch |
| 00:08:09 | Ship engine cutoff (SECO / end of ascent) | Brief coast |
| 00:26:10 – 00:26:30 | Orbital insertion burn | A single Raptor, ~20 s (McDowell: ~18 s and ~92 m/s) |
| 00:35:01 – 01:17:40 | Payload deployment | 26 Starlink V3, ~42 min |
| 01:27:46 / 07:15:35 / 20:41:55 | Return checks (Hawaii, Chile, Hawaii) | Coast milestones; the mission continued |
| 21:35:57 – 21:36:07 | Deorbit burn | One sea-level Raptor, ~10 s |
| 22:10:46 | Reentry | Start of atmospheric entry |
| 22:29:34 | Transonic | |
| 22:30:13 | Subsonic | |
| 22:32:16 | Landing burn start | Three Raptor engines |
| 22:32:18 | Landing flip | |
| 22:32:26 | From 3 to 2 engines | |
| 22:32:33 | From 2 to 1 engine | |
| 22:32:34 | Ship shutdown and catch | First upper-stage catch, Pad 2 |

Sources for this section: [official Flight 15 page](https://www.spacex.com/launches/starship-flight-15/), [Space.com (liftoff and 275 km)](https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship), [Space.com (65 km at separation and booster abort)](https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch), [Space.com (fuel alarm, 13 engines, FTS)](https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video), [Spaceflight Now](https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/), [SpaceX V3 update, 12 May 2026](https://www.spacex.com/updates). McDowell's tweet is cited in [Wikipedia: Starship flight 15](https://en.wikipedia.org/wiki/Starship_flight_test_15).

## 3. Scope

### v1 (in scope)

- Local web app using Vite, TypeScript, and three.js. No paid APIs, keys, or backend.
- A `data/flight15.json` file with parameters, events, and a source for each number.
- A scene to scale: Earth, the Starbase area, Pad 2, an approximate tower, and the booster and Ship at their official dimensions (9 m diameter; heights of 72 m / 52 m / 124 m for the full stack).
- Super Heavy V3 has **three** grid fins, not four (as SpaceX said in its V3 update).
- Mission clock, scrubber, event log, and HUD: altitude, speed, downrange distance, mass if modeled, current event, and whether each value is official, estimated, or interpolated.
- Cameras: booster tracking, Ship tracking, tower/pad, free camera, and orbital/map view.
- Hybrid physics (see section 5): integrate the trajectory, check it against the public timeline, and use that timeline to guide it if needed.
- The booster diverts to the Gulf, hovers, and is terminated by the FTS. The Ship is caught. Do not show a double catch that did not happen.
- Compress the ~22 h coast (1×, 10×, and 100× speed controls, plus “skip to next event”).
- A visible disclaimer in the UI.
- Automated data-loading and timeline tolerance tests.
- A short sources panel.

### Deferred (not in v1)

- High-fidelity aerodynamics, full 6 DoF attitude modeling, plasma/ablation, webcast audio, photorealistic 3D models, exact FTS coordinates if they are ever published, amateur telemetry overlays presented as official, multiplayer, and a native app.

## 4. Technical stack

- Vite + TypeScript + three.js.
- Tests with Vitest (or the runner already included with Vite).
- Data only in local files (`data/flight15.json`). No OpenAI, paid maps, or tokens.
- Simple 3D models (primitives or lightweight glTF made in the repo). Any third-party model must have a free license and be credited.
- Earth: a sphere textured with a public-domain map or a simple representation. No commercial globe is needed.
- A clear README in Spanish with the disclaimer, instructions for running the project, and data sources.

<a name="5-cómo-simular-recomendación-híbrido"></a>

## 5. Simulation approach (hybrid recommended)

There are three approaches. C is recommended for v1.

**A. Replay only.** Interpolate a trajectory through the public events. This is tidy and predictable, but it does not test the physics or the model.

**B. Pure physics.** Point mass, gravity, drag, and thrust. The basic problem is that SpaceX does not publish dry masses, Cd, or altitude and speed for almost any event. A “pure” physics simulation based on invented numbers would be misleading.

**C. Hybrid (recommended).** Integrate the trajectory in 3D (start in the launch plane if needed, then move to a simple ECEF or ECI frame):

- Use inverse-square gravity and the WGS 84 Earth gravitational parameter (μ = 3,986004418 × 10¹⁴ m³/s²). Source: [NIMA TR8350.2 / WGS 84](https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84).
- Atmosphere: [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539) for density versus altitude. Start with a constant, adjustable Cd and label it as an estimate.
- Thrust and mass flow: `ṁ = F / (Isp × g0)`, using official thrust and labeling Isp as an estimate if no current official figure exists.
- Timeline events (ignition, shutdown, separation, diversion, FTS, catch) trigger phase changes at public T+ times.
- If the physics drifts, as it will given the missing mass and aerodynamic data, a guidance layer targets the next public event (its time and, if available, its altitude). Record the residual. The HUD must not pass off a guided or interpolated value as real telemetry.
- The booster abort is not optional: boostback shuts down at T+00:03:02, the vehicle diverts offshore (east/southeast over the Gulf, without inventing a distance), and ends in hover + FTS.

Integrator: Runge–Kutta 4 or a stable semi-implicit method, with a step of 0,05–0,1 s during burns and a larger step during orbital coast. Deterministic: same seed, same run.

## 6. Data format: `data/flight15.json`

Every numerical quantity has `value`, `unit`, `confidence` (`official`, `reported`, `estimate`, `unknown`), and `source` (a URL or “not published”). If `confidence` is `unknown`, set `value` to `null`. Do not replace a null with a number that “looks reasonable” without labeling it as an estimate and documenting it in the README.

Minimal structure:

```json
{
  "meta": {
    "disclaimer": "Approximation based on public data. This is not official flight information.",
    "researched_at": "2026-11-19",
    "timezone_note": "T+ is mission time. The local time zone at liftoff was America/Chicago (CST, UTC−6)."
  },
  "mission": { },
  "site": { },
  "vehicle": {
    "stack": { },
    "booster": { },
    "ship": { },
    "raptor": { }
  },
  "timeline": [
    {
      "id": "liftoff",
      "t_sec": 0,
      "label": "Liftoff",
      "confidence": "official",
      "source": "https://www.spacex.com/launches/starship-flight-15/",
      "as_flown_note": null
    }
  ],
  "physics_estimates": {
    "comment": "Only unpublished parameters. They can be adjusted. Never present them as official."
  }
}
```

Starting values (official unless otherwise noted):

| Quantity | Value | Confidence | Source |
| --- | ---: | --- | --- |
| Stack height | 124 m | official | [SpaceX Starship](https://www.spacex.com/vehicles/starship) |
| Diameter | 9 m | official | Same source |
| Ship: height, propellant, thrust | 52 m; 1.600 t; 1.614 tf | official | Same source |
| Super Heavy: height, propellant, thrust | 72 m; 3.650 t; 8.240 tf | official | Same source |
| Engines | Booster: 33 Raptor (13 steerable center engines, 20 around the perimeter); Ship: 3 Raptor + 3 RVac | official | Same source |
| Raptor (vehicle page): diameter, height, thrust | 1,3 m; 2,9 m; 250 tf | official | Same source |
| Raptor 3 SL thrust / vacuum thrust / SL engine mass | 250 tf; 275 tf; 1.525 kg | official | [V3 update, 12 May 2026](https://www.spacex.com/updates) |
| Pad | Orbital Launch Pad 2, Starbase, Texas | official | [Flight 15](https://www.spacex.com/launches/starship-flight-15/) |
| Pad coordinates | 25,99677° N, 97,15799° W | reported | [Launch Library 2, pad 235](https://ll.thespacedevs.com/2.2.0/pad/235/) — third-party database, sufficient for v1 |
| Orbit | ~275 km | reported | SpaceX / webcast; McDowell: nearly circular at 276 km |
| Separation altitude | ~65 km | reported | Space.com, approximate figure |
| Booster and Ship dry mass | not published | unknown | SpaceX does not give it on the current vehicle page |
| Isp | not on the current vehicle page | estimate / unknown | A SpaceX tweet from 3 August 2024 cited 350 s for the sea-level variant. Treat this as dated and disputed (vacuum Isp for the SL engine?). Adjustable |
| Cd, reference area, mass of each Starlink V3, FTS coordinates, Max Q altitude, separation speed | not published | unknown | Leave null or label as estimates |

Do not “fix” this discrepancy: 3 × 250 tf + 3 × 275 tf = 1.575 tf, but the vehicle page gives 1.614 tf for the Ship. Keep both figures in the JSON, each with its own source. Do not silently average them.

Propellant capacity is a design limit, not the actual Flight 15 load, which was not published. The sim can start from those limits and reduce the mass when tuning the model, as long as the adjustment is documented.

`data/flight15.json` is the starting file. You may fill it in, but do not promote estimates to official figures.

## 7. Visualization

- Earth and the Texas Gulf Coast, with Pad 2 and a catch tower. The exact tower height is not on SpaceX's vehicle page: use a recognizable tower at a reasonable scale, without claiming an exact height.
- Vehicles to scale, with 33 engines on the booster and 6 on the Ship. Three grid fins on V3. Simple exhaust plumes based on the active engine count (33, 32, 13, 6, 3, 2, 1).
- Show the booster FTS as a loss of the vehicle over water, not a soft landing or a catch.
- On the Ship's return: approach from east Texas, swoosh over the Gulf, flip, 3–2–1 engine burn, and arm closure.
- Keep the HUD and scrubber visible at all times. When paused, allow jumps between events.
- Give each value a badge: Official / Reported / Estimated / Interpolated.

### 7.1 Interaction and orbit (Cristian's request)

- **Camera controls**: Free orbit, zoom, and pan with the mouse, plus tracking and view modes (booster, Ship, tower/pad, whole Earth, and orbital view). Transition smoothly between modes.
- **Time controls**: Play, pause, 1×, 10×, 100×, and 1000× speeds, a scrubber that can reach any moment, and buttons to skip to the previous or next event.
- **Full mission from start to finish**: Liftoff, ascent, hot-staging, the booster return as it happened, Ship orbital insertion, deployment of all 26 Starlink V3 satellites (each separates, follows its own orbit, and has its own number), in-orbit checks, deorbit burn, reentry, and catch.
- **Live orbit**: Draw the Ship's current osculating orbit (the ellipse around Earth) from the state vector (r, v) on each frame. Mark the perigee and apogee and show their values. The ellipse and values must update live during a burn. For suborbital trajectories, draw the arc and indicate that perigee is below the surface. Offer an optional ground track.
- **Maneuvers**: Show each ignition (insertion, deorbit, etc.) on the timeline with its estimated Δv and source, and in the scene through the plume and orbital change.
- **Always-visible telemetry panel**: T+, current phase or event, altitude, surface-relative and inertial speeds, downrange distance, acceleration in g, estimated mass or propellant, active engines, perigee, apogee, inclination, orbital period, eccentricity, latitude, and longitude. Give each value a badge (Official / Reported / Estimated / Calculated).
- **Realism**: Use a rotating Earth (WGS 84), real coordinates for Pad 2 at Starbase, and real scale, with a visual scaling option for vehicles when viewing the whole Earth. Compute orbital elements from the state rather than drawing them by hand.
- Check: During the insertion burn, perigee rises from a negative or suborbital value to about 275 km ± 15 km. During deorbit, perigee drops into the atmosphere. All 26 Starlink satellites separate within the deployment window. The entire mission can be navigated with the mouse and keyboard without opening the console.

## 8. Validation criteria

SpaceX's timeline is approximate, so the tolerances measure consistency with public information, not flight accuracy.

| Phase | What to compare | v1 tolerance |
| --- | --- | --- |
| T+0 to SECO (0–8 min) | Time of each official event | ± 2 s |
| Insertion and deployment | Start/end times | ± 5 s |
| Coast checks and deorbit | Timing | ± 15 s |
| Reentry through catch | Time of each official event | ± 5 s |
| Separation altitude | If using the reported value of ~65 km | ± 10 km |
| Post-insertion altitude | ~275 km | ± 15 km |
| Outcome | Booster: diversion + hover + FTS, no catch. Ship: catch at Pad 2 | Qualitative, mandatory |
| Data integrity | No `unknown` value appears as official in the HUD | Test or checklist |

If guidance is needed to keep the trajectory within tolerance, disclose it in the validation report and show the residual.

## 9. Stages (small and verifiable)

The orchestrator assigns each stage to the implementer. Do not move on until the current stage passes its checks and, for the physics and outcome stages, an Oracle review.

### Stage 0 — Scaffolding

A Vite + TS + three.js app that opens a canvas, a README with the disclaimer, and a working `npm test` command. Check: `npm run dev` shows the empty scene and the disclaimer.

### Stage 1 — Data

Typed `data/flight15.json`, loader, and tests: each number has a source, `unknown` values are null, and the timeline includes the events in section 2 with a “no catch” note at T+00:06:35. Check: data tests pass.

### Stage 2 — Static scene to scale

Earth, pad, tower, and stack at T=0. Official dimensions. Three grid fins. Check: a screenshot or a dimension test (9 m diameter, heights of 72/52/124 m).

### Stage 3 — Clock, scrubber, and HUD

Mission clock, scrubber, event log, and HUD over a placeholder trajectory, even if it is just a simple curve. Check: moving the scrubber changes T+ and the current event, and the placeholder is labeled as such.

### Stage 4 — Ascent physics

Integrator + gravity + atmosphere + thrust through MECO and hot-staging. Check: Max Q (if its timing is modeled), MECO, and staging are within ± 2 s; staging altitude, if validated against the reported 65 km, is within ± 10 km; and the report lists the estimates used.

### Stage 5 — Booster as flown

Flip, boostback on 32 engines, early shutdown, diversion to the Gulf, burn on 13 engines, hover, FTS. Check: there is no booster catch; boostback and landing burn T+ times are within ± 2 s; and the vehicle does not return to the tower.

### Stage 6 — Ship as flown

Ascent to SECO, insertion, compressed coast with all three checks, deorbit, reentry, transonic/subsonic milestones, flip, 3–2–1 engine burn, and catch at Pad 2. Check: times are within tolerance, post-insertion altitude is ~275 km ± 15 km, and the catch is at the tower, not in the water.

### Stage 7 — Validation report

A generated page or Markdown file comparing the sim against the timeline, with residuals and a list of estimates. Check: every event in the table has a row.

### Stage 7.5 — Orbit, Starlink, and telemetry

Everything in section 7.1: a live osculating ellipse with perigee and apogee, maneuvers, deployment of all 26 Starlink satellites, the full panel, and time controls. Use the checks in section 7.1.

### Stage 8 — Polish

Cameras from section 7, speed controls, sources panel, a recognizable swoosh, and a UI usable on a laptop. Check: the entire flight can be navigated without opening the console.

## 10. Preset evaluation (what to record)

This project is also a test run of the oh-my-opencode-slim preset: GPT-6.2 Astra as orchestrator and at the Oracle review gates, and GPT-6.2 Sol as implementer/fixer. Those names are for the evaluation note. Do not hardcode model IDs in the code, the plan pasted into OpenCode, or commits. Refer to roles there.

At the end of each stage and at the end of the project, Cristian or the orchestrator leaves a note (in the README or in `NOTES-EVAL.md`) with:

- **Role:** orchestrator, Oracle reviewers, or implementer/fixer.
- **Model or alias used in that run** (as shown by OpenCode; do not hardcode it in the repo).
- **Work done:** planning, implementation, fixes, review.
- **Stage** (0 through 8).
- **Time:** start and finish in Córdoba time, and approximate duration.
- **Visible quota or cost:** if OpenCode or the provider shows token counts, a quota percentage, or a limit notice, record it. If nothing is shown, write “not visible”.
- **Specific quality checks:**
  - Did the agent read the spec before coding?
  - Did it invent any numbers? Which ones?
  - Did the stage's tests pass on the first try?
  - Did the Oracle review find a substantive issue or only minor details?
  - Did the implementer stay within the v1 scope?
  - Give a score of 1–5 and one sentence explaining it.

That note provides evidence for evaluating the model stack. This document does not change any preset.

## 11. Risks

- Without dry mass or Cd, pure physics is not viable. That is why the spec calls for the hybrid approach and clear confidence labels.
- The official table still says “catch” for the booster. Implementing that literally would misrepresent the flight.
- A 22,5 h flight cannot run at 1× in real time throughout; compress the coast.
- The orchestrator may try to write code or skip stages. The prompt asks it to delegate and go stage by stage.
- A long run can consume quota. Stop at stage boundaries and save the report even if the run is incomplete.
- Launch Library 2 coordinates come from a third party. They are sufficient for v1, but are not an official SpaceX survey.

## 12. Sources

| Source | What it covers |
| --- | --- |
| [SpaceX: Starship Flight 15](https://www.spacex.com/launches/starship-flight-15/) | Official account, outcome, countdown, and timeline (approximate times) |
| [SpaceX: Starship vehicle](https://www.spacex.com/vehicles/starship) | Heights, diameter, propellant, thrust, engine count, Raptor 250 tf |
| [SpaceX Updates (V3, 12 May 2026)](https://www.spacex.com/updates) | Raptor 3: 250 / 275 tf, mass 1.525 kg; Super Heavy V3 with 3 grid fins; Pad 2 |
| [Space.com: liftoff and orbit](https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship) | ~16:47 CST, ~275 km, ~20 s insertion, 26 Starlink, ~14 orbits |
| [Space.com: photos and ~65 km](https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch) | Approximate separation altitude |
| [Space.com: booster abort](https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video) | Fuel alarm, GNC clarification, 13 engines, hover, and FTS |
| [Spaceflight Now, live coverage](https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/) | 16:47 CST, catch ~15:20 CST, B22 / S42, reentry over the Pacific and the Southwest |
| [Wikipedia: Starship flight 15](https://en.wikipedia.org/wiki/Starship_flight_test_15) | Summary with citations; always use the original source, not the wiki alone |
| [Launch Library 2, pad 235](https://ll.thespacedevs.com/2.2.0/pad/235/) | Approximate coordinates for Pad 2 |
| [WGS 84](https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84) | Earth's μ |
| [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539) | Density versus altitude |
| [FAA: license VOL 23-129](https://www.faa.gov/space/stakeholder_engagement/spacex_starship) | Regulatory context; Rev. 10 authorized Flight 15. The 2022 PEA describes an older design (do not use those masses as V3 values) |

See `research.md` for the raw details, citations, and gaps.
