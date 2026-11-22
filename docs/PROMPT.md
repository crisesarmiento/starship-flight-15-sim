# OpenCode starter prompt (a single run with /deepwork)

Open OpenCode in the repository directory, check that `/preset` shows `test-astra-sol-2026-11-19`, and paste this as your first message:

---

/deepwork Build the entire interactive three.js simulation of SpaceX Starship Flight 15 described in `docs/SPEC.md` in a single run.

Before starting, read all of `docs/SPEC.md`, `docs/research.md`, and `data/flight15.json`. The spec is the source of truth. Its stages (0 through 8, including 7.5) are your internal checklist, and its checks are the acceptance criteria.

How to work:
- Go through your deepwork passes (sketch, structure, detail) without stopping for permission between stages. Cristian wants the complete result in one run.
- As orchestrator, delegate implementation and fixes to the fixer in narrowly scoped tasks: state the goal, files, checks, and what not to touch. Assign the visual work on the scene and UI to the designer.
- Have Oracle review each pass. Do not skip the review for physics, flight outcomes, orbit, or validation (stages 4, 5, 6, 7, and 7.5).
- Verify every check in the spec yourself with tests or concrete evidence. Do not quietly loosen tolerances or skip tests.
- Make small commits on the local main branch, one per stage when possible. Do not push.

Rules without exception:
- This is an approximation based on public data, not an official SpaceX product. Put the disclaimer in the README and the UI.
- Do not invent numbers. Record each quantity in `data/flight15.json` with its source and confidence level. If there is no source, set the value to null or clearly label it as an estimate.
- Model the flight as it actually happened. The booster was not caught: it diverted, hovered over the Gulf, and was destroyed by the FTS. The Ship was caught at Pad 2 after deploying the 26 Starlink V3 satellites.
- Always calculate orbital elements (perigee, apogee, inclination, period) from the state vector.
- No secrets, paid services, or third-party data at runtime. Do not use sudo. Do not touch auth, keys, or tokens.
- Write the code in English. Write the UI and README in clear Rioplatense Spanish.
- Record the evaluation in `NOTES-EVAL.md` as specified in section 10: role, work done, time, duration, visible quota, and quality.

When you finish, reply with a short report covering:
1. What works: how to run it and which checks passed.
2. What is approximate or guided by the timeline, with residuals.
3. What is missing or failed.
4. What each role did.
