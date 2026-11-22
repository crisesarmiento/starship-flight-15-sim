# Raw research notes — Starship Flight 15

Research date: 19 November 2026, Córdoba time (UTC−3).<br>
Rule: Do not invent numbers. If a figure does not appear in a source, record it as a gap.

Flight 15 **already flew** (13–14 November 2026). There is no need to base the sim on a preflight plan or an earlier flight. What follows is the flight as described by public sources.

## 1. Primary and press sources, in order

1. SpaceX, mission page: https://www.spacex.com/launches/starship-flight-15/ <br>
   Accessed 19-11-2026. Postflight account, countdown, and “FLIGHT TIMELINE / All Times Approximate”.
2. SpaceX, vehicle page: https://www.spacex.com/vehicles/starship <br>
   Also: https://www.spacex.com/vehicles/starship/technical-specifications (same content when accessed).
3. SpaceX Updates, “Introducing Starship V3”, 12 May 2026: https://www.spacex.com/updates <br>
   The text appears on that updates page (12 May 2026 entry). It includes Raptor 3 thrust figures, engine mass, and Super Heavy V3's three grid fins.
4. Space.com, Josh Dinner, 13 Nov 2026: https://www.space.com/space-exploration/launches-spacecraft/spacex-starship-flight-15-chopsticks-double-catch-super-heavy-ship <br>
   Liftoff, ~275 km orbit, insertion, and payload.
5. Space.com, photos and separation: https://www.space.com/space-exploration/launches-spacecraft/relive-starships-historic-flight-15-with-our-best-photos-from-launch-and-mechazilla-tower-catch <br>
   “Starship soared approximately 40 miles (65 km) overhead” at separation.
6. Space.com, Tariq Malik, updated 14 Nov 2026: https://www.space.com/space-exploration/launches-spacecraft/spacex-says-starship-flight-15-booster-aborted-chopsticks-landing-catch-after-launch-due-to-guidance-issue-video <br>
   Fuel alarm, Huot's clarification about the GNC, 13 engines, hover, and FTS.
7. Spaceflight Now, coverage: https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/ <br>
   Local times, B22 / S42, catch at ~15:20 CST, and reentry.
8. Wikipedia, Starship flight 15: https://en.wikipedia.org/wiki/Starship_flight_test_15 <br>
   Useful as an index of citations. Do not use a wiki figure if the footnote does not support it.
9. Launch Library 2, pad 235: https://ll.thespacedevs.com/2.2.0/pad/235/ <br>
   Pad 2 coordinates (third-party source).
10. WGS 84: https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84
11. U.S. Standard Atmosphere 1976 (NASA NTRS): https://ntrs.nasa.gov/citations/19770009539
12. FAA, Starship/Starbase context: https://www.faa.gov/space/stakeholder_engagement/spacex_starship <br>
    License cited in the press: VOL 23-129 Rev. 10, 13 Nov 2026, authorizing a single Flight 15 launch and reentry. The Rev. 10 PDF was not downloaded for this research.
13. FAA PEA, 2022 (older design, not V3): https://www.faa.gov/sites/faa.gov/files/2022-06/PEA_for_SpaceX_Starship_Super_Heavy_at_Boca_Chica_FINAL.pdf

Other press reports agree on the main points and were used to cross-check, not as sources of new numbers:

- CNBC (Ship catch, booster diversion to the Gulf): https://www.cnbc.com/2026/11/14/spacex-plans-to-try-first-ever-catch-of-starship-rocket-from-orbit.html
- CNBC (liftoff): https://www.cnbc.com/2026/11/13/spacex-launches-starship-in-key-test-flight-of-massive-rocket.html
- The Register: https://www.theregister.com/science/2026/11/16/spacex-catches-starship-on-the-first-try/5310059
- The Space Road (recap): https://thespaceroad.com/articles/starship-flight-15-recap/
- Seeking Alpha (FAA license Rev. 10): https://seekingalpha.com/news/4672602-faa-revises-spacex-starship-license-authorizes-single-flight-15-launch

Amateur telemetry (e.g., https://telemetry.starshipspaceprogram.com/), unofficial wikis, and Reddit were not used as authoritative sources for v1 figures.

## 2. The flight, with citations

### Date, site, and vehicles

SpaceX: “On Friday, November 13, Starship lifted off from Starbase, Texas on its 15th flight. And on Saturday, November 14, Starship returned to Starbase, Texas… Flight 15 started with the Super Heavy booster ascending away from Pad 2 at Starbase under the power of 33 Raptor engines.”

Spaceflight Now and Space.com identify Booster 22 and Ship 42. Spaceflight Now gives liftoff “at 4:47 p.m. CST (5:47 p.m. EST / 2247 UTC) on Friday, Nov. 13”. A caption in the same article says “4:48 p.m. CST”. Space.com (Dinner, reporting from Starbase): “5:47 p.m. ET (2247 GMT; 4:47 p.m. local Texas time)”.

SpaceX does not give the exact second on the mission page.

Wikipedia gives “November 13, 2026, 22:47:36 UTC (4:47:36 pm CST)” with footnotes [1] and [2]. Footnote [2] points to the SpaceX page, which does not give that second. Footnote [1] points to a CADENA planning document dated 8 October 2026, before the flight. **Do not treat 22:47:36 UTC as official.** Working time: around 22:47 UTC (16:47 CST; 19:47 Córdoba time).

Ship catch: Spaceflight Now says “at 3:20 p.m. CST (2120 UTC)”. SpaceX says it returned to the site it had left “22.5 hours prior”, and its official table places the catch at T+22:32:34 (approximate times). Wikipedia gives 22 h 32 min 32 s and 21:20:08 UTC. That arithmetic assumes a liftoff time of 22:47:36 UTC, so do not copy it as official.

Launch window: Press reports and recaps agree it opened at 16:45 CST. The sim does not need this detail.

Generation: Fourth V3 / Block 3 flight. V3 debuted on Flight 12 (22 May 2026, Pad 2), according to https://www.spacex.com/launches/starship-flight-12/.

Payload name: Wikipedia and launch databases call it “Starlink Group 31-2”. SpaceX refers to “26 Starlink V3 satellites” without giving that group name in the text consulted.

### Booster as flown

SpaceX, postflight account (nearly verbatim):

> The booster performed its directional flip maneuver and relit 32 of the planned 33 Raptor engines for the boostback burn. The boostback burn ended early due to low fuel mass, with the root cause under investigation. The booster’s guidance, navigation and control triggered an automated abort during coast and diverted itself successfully to an offshore landing location. It successfully executed a landing burn with the engines cutting off while hovering over the Gulf. Upon landing burn shutdown, the Super Heavy’s flight termination system was triggered.

Dan Huot clarified (Space.com and Spaceflight Now), ~16,5 h into the mission, that it was not “a GNC failure”. The GNC detected that the booster was out of position for the catch, aborted, and diverted it to the contingency site in the Gulf. Kate Tice, 14 Nov webcast: “Early indications are that the booster ended its boostback [burn] early due to a low fuel mass alarm.”

Space.com (Malik): “activating 13 of its Raptor engines as planned”, hover, shutdown, FTS, “exploded a few feet above the waves… about 6.5 minutes after liftoff.”

Neither the official sources nor the cited press reports give a splashdown distance in km or its lat/lon. This remains a gap.

The SpaceX table still says “Super Heavy landing burn shutdown and catch” at T+00:06:35. That label does not describe the actual flight. The burn start and shutdown times (00:06:10 / 00:06:35) may come from the approximate plan. Use them as a public reference, with a note on the actual outcome.

<a name="ship-como-voló"></a>

### Ship as flown

SpaceX: nominal ascent burn, brief coast, then “reigniting a single Raptor engine for an orbital insertion burn”. Next came deployment of 26 Starlink V3 satellites: “contact was made soon after with every satellite”. A long coast followed, with “more than 20 hours in space”. Deorbit: “successfully relit a single Raptor sea-level engine”. Return: “navigated its way back to the east coast of Texas, flew a final swoosh maneuver out over the Gulf… 22.5 hours prior. After breaking through the clouds, three Raptor engines ignited for a landing flip and slow descent into Mechazilla’s waiting arms, which closed to catch Starship for the very first time.”

Space.com (Dinner), citing Huot: “nominal orbit insertion… around 170 miles (275 kilometers) at T+26 minutes and 10 seconds.” The insertion was “lasting about 20 seconds”. Deployment was “over a 42-minute span starting 35 minutes after launch.” Three of the V3 satellites carried cameras for observing the heat shield. Contingency checks for an early return to the Pacific: ~10 min after deployment, T+7 h 15 min, and T+20 h 41 min (consistent with the SpaceX table: Hawaii / Chile / Hawaii). The planned deorbit burn was “10-second… at approximately T+21 hours and 36 minutes”. The Ship also had a contingency zone in the Gulf if the catch could not proceed.

Spaceflight Now describes reentry “over the Pacific Ocean and made a supersonic flight across Mexico and the South West United States before turning out over the ocean” toward Pad 2. “14 orbits.”

Jonathan McDowell (@planet4589), 14 Nov 2026, cited in Wikipedia footnote [3]: “Ship reached initial orbit at T+8:10, single-engine 18s insertion burn at T+26:06 of about 92 m/s raised perigee to near-circular orbit at 276 km.” The original tweet was not consulted for this research; it is recorded via Wikipedia's citation. The SpaceX table puts insertion at 00:26:10–00:26:30 (20 s). The start times differ by a few seconds and the durations are 18 vs 20 s; both accounts give approximate figures. Use the SpaceX table as the public clock and record McDowell's 92 m/s / 276 km as reported figures.

Wikipedia lists a periapsis of 276 km, an apoapsis of 278 km, and an inclination of 30,5°. Only the periapsis has footnote [3]. **Do not treat 278 km or 30,5° as well sourced.** The safest description is “a nearly circular low orbit at about 275–276 km”.

<a name="3-línea-de-tiempo-oficial-copia-de-trabajo"></a>

## 3. Official timeline (working copy)

Source: https://www.spacex.com/launches/starship-flight-15/ — “All Times Approximate”.

Countdown (for context; no need to animate it in v1): T−50:00 GO for prop load; T−35:33 / 35:30 booster LOX and CH4; T−35:12 / 35:11 Ship LOX and CH4; T−21:40 engine chill; T−02:50 / 02:10 loading complete; T−00:30 GO for launch; T−00:17 flame diverter; T−00:03 startup; T−00:00 “Excitement guaranteed”.

Flight:

| T+ | Event, SpaceX wording |
| --- | --- |
| 00:00:00 | Liftoff |
| 00:00:58 | Max Q (moment of peak aerodynamic stress on the rocket) |
| 00:02:19 | Super Heavy MECO (most engines cut off) |
| 00:02:21 | Hot-staging (Starship Raptor ignition and stage separation) |
| 00:02:26 | Super Heavy boostback burn start |
| 00:03:02 | Super Heavy boostback burn shutdown |
| 00:06:10 | Super Heavy landing burn start |
| 00:06:35 | Super Heavy landing burn shutdown and catch  ← label does not match the actual flight |
| 00:08:09 | Starship engine cutoff |
| 00:26:10 | Starship orbital insertion burn start |
| 00:26:30 | Starship orbital insertion burn shutdown |
| 00:35:01 | Payload deploy start |
| 01:17:40 | Payload deploy complete |
| 01:27:46 | Early Hawaii Return Check |
| 07:15:35 | Mid Chile Return Check |
| 20:41:55 | Final Hawaii Return Check |
| 21:35:57 | Deorbit burn start |
| 21:36:07 | Deorbit burn shutdown |
| 22:10:46 | Starship entry |
| 22:29:34 | Starship is transonic |
| 22:30:13 | Starship is subsonic |
| 22:32:16 | Landing burn start |
| 22:32:18 | Landing flip |
| 22:32:26 | Landing burn 3 to 2 engines |
| 22:32:33 | Landing burn 2 to 1 engine |
| 22:32:34 | Starship landing burn shutdown and catch |

Approximate burn durations calculated from the table: boostback 36 s (02:26–03:02); booster landing burn 25 s (06:10–06:35); insertion 20 s; deorbit 10 s; Ship landing burn 18 s (22:32:16–22:32:34).

## 4. Vehicle parameters

### Official figures from the SpaceX vehicle page (accessed 19-11-2026)

https://www.spacex.com/vehicles/starship

- Stack: 124 m / 407 ft tall; 9 m / 29,5 ft in diameter; payload “100+ t”.
- Starship (upper stage): 52 m / 171 ft; 9 m; propellant 1.600 t / 3,5 Mlb; thrust 1.614 tf / 3,5 Mlbf; payload 100+ t.
- Super Heavy: 72 m / 236 ft; 9 m; propellant 3.650 t / 8 Mlb; thrust 8.240 tf / 18,1 Mlbf; 33 Raptor engines; subcooled methane and liquid oxygen; “13 maneuverable engines in the center and the remaining 20 around the perimeter”.
- Ship: “six engines, three Raptor engines, and three Raptor Vacuum (RVac) engines”.
- Raptor (vehicle page, with one set of figures): diameter 1,3 m / 4,2 ft; height 2,9 m / 9,5 ft; thrust 250 tf / 551 klbf.
- The vehicle page **does not publish** dry mass, liftoff mass, Isp, reference area, or Cd.

Internal check; do not “correct” these discrepancies: 33 × 250 tf = 8.250 tf, but the booster specs say 8.240 tf. 3 × 250 + 3 × 275 = 1.575 tf, but the Ship specs say 1.614 tf. Keep both figures in each case, with their sources.

### Official figures from the V3 update (12 May 2026)

https://www.spacex.com/updates — “Introducing Starship V3”

- “Raptor 3 engines deliver increased thrust, with sea-level variants now producing 250 tf (551,000 lbf) up from 230 tf (507,000 lbf), while vacuum engines produce 275 tf (606,000 lbf) up from 258 tf (568,000 lbf).”
- “Mass of the Raptor sea-level engines has been reduced to 1,525 kg from 1,630 kg. Overall vehicle-level mass savings reach approximately 1 ton per engine…”
- Super Heavy V3: **three** grid fins (previously four), 50 % larger, clocked for the catch, and mounted lower because of hot-staging heat; integrated hot stage (no longer a disposable interstage); 33 engines; protection for the 13 center engines (TVC); two quick disconnects.
- Starship V3: larger tanks, improved PEZ dispenser, systems for long flights, four docking drogues on the leeward side, etc.
- Flight 12 = first flight from Pad 2.

This matters for the 3D model: three fins, not four.

### Isp

The current SpaceX vehicle page does not give Isp. A 3 August 2024 tweet from @SpaceX (widely cited; not revisited for this research) introduced the Raptor 3 “sea level variant” with “Specific impulse: 350s” and “Engine mass: 1525kg”, and a thrust of 280 tf at the time (the 2024 figure, later updated to 250 tf in May 2026). Several accounts, including articles citing Dan Huot, say those 350 s were the sea-level engine's vacuum Isp, not its sea-level Isp. Wikipedia (Super Heavy Block 3) lists SL 330 s / vac 350 s; no solid primary source was verified for the 330 s. **Treat any Isp figure as an adjustable estimate.** Older figures from 2018–2019 (327 s SL / 350–380 s vac) are for another generation; do not use them as 2026 Raptor 3 figures.

### Dry masses and liftoff mass

SpaceX does not publish dry mass for Super Heavy V3 or Ship V3 on the current vehicle page.

Wikipedia lists a dry mass of 275 t for Super Heavy under Block 1/2, not Block 3. Do not use it as the mass of B22.

The FAA's June 2022 PEA describes an earlier design (it mentions up to ~3.700 t of propellant and a maximum liftoff mass of ~5.000 t, and still lists 37 engines). **Do not use these figures for Flight 15 / V3.** They only document an older design envelope.

This research found third-party estimates (post-Flight 12 analyses, blogs) with dry masses of roughly ~250 t for the booster and ~170 t for the Ship. They were not adopted: they are unofficial, the original work with a reproducible method was not consulted, and for v1 it is more honest to leave the values `unknown` and tune the model.

Mass of the 26 Starlink V3 satellites: not on the Flight 15 page. Figures of ~2.000–2.500 kg per satellite circulate in connection with “Gen3” FCC filings, but the primary PDF was not verified, nor was whether “Gen3” is exactly the V3 flown here. **Gap.** If an FCC filing is cited later, the mass can be entered as `reported`.

Propellant 3.650 t / 1.600 t: design capacity, not necessarily the load on 13-11. The LOX/CH4 split (Wikipedia, based on a mixture ratio) was not treated as official.

### Site

Pad 2, Starbase, Texas. Launch Library 2, GET https://ll.thespacedevs.com/2.2.0/pad/235/ : `"latitude": "25.99677", "longitude": "-97.15799"`, name “Orbital Launch Pad 2”, mount “Orbital Launch Mount B”, time zone America/Chicago. This is a third-party database. It is sufficient to locate the scene, but is not an official site plan.

Tower / Mechazilla height: SpaceX does not give an exact height on the vehicle page (“two of the tallest launch towers in the world”). Figures such as 144,5 m appear in unofficial wikis. **Do not specify an official height.** For v1, use a recognizable tower at a reasonable scale without claiming an exact height.

### Atmosphere and gravity (public models, not flight data)

- WGS 84, μ = 3,986004418 × 10¹⁴ m³/s². https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84
- U.S. Standard Atmosphere 1976. https://ntrs.nasa.gov/citations/19770009539
- Conventional g0 for Isp: 9,80665 m/s² (standard value, not a SpaceX figure).

<a name="5-qué-no-apareció-huecos-que-importan-al-sim"></a>

## 5. What we did not find (gaps that matter to the sim)

1. Dry masses (and actual liftoff mass) for B22 and S42.
2. Current official Isp for Raptor 3 SL and RVac, at sea level and in vacuum.
3. Cd, reference area, and any aerodynamic coefficients.
4. Altitude and speed at Max Q (only the time is available, T+58 s).
5. Separation speed. The only altitude figure is Space.com's estimate (~65 km).
6. Coordinates or distance for the booster splashdown / FTS.
7. Actual propellant load for this flight, as distinct from capacity.
8. Mass of each Starlink V3 satellite and thus of the payload.
9. The exact second of liftoff as published by SpaceX.
10. A reliable citation for the apoapsis of 278 km and inclination of 30,5°.
11. Official tower height and catch height.
12. Official altitude/speed telemetry versus time (the webcast may have shown overlays; no official numerical profile was transcribed for this research).
13. Full text of FAA license VOL 23-129 Rev. 10 (only its existence was confirmed through press reports and the FAA index).

These gaps are why the sim uses hybrid physics: integrate with the available data, compare against the public timeline, and guide the trajectory if needed without concealing the residual.

## 6. Implications for the sim (brief)

- The booster outcome is abort + FTS, not a catch.
- The Ship is caught at Pad 2 after ~22,5 h; compress the coast.
- V3 model: three grid fins, 33 + 6 engines, booster landing burn on 13, Ship 3–2–1.
- Every number in the JSON has a source and confidence level.
- Do not promote a 2024 tweet or a Wikipedia recap to “official for 2026”.
