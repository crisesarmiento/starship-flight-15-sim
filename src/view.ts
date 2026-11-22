import './style.css'
import { CAMERA_MODES, createScene, type CameraMode, type SceneApi } from './scene'
import { calloutsAt } from './visual/callouts'
import { duration, entryHandoff, flight, frameAt, type Sample } from './visual/core'
import { cordobaClock, fmtDuration, fmtT } from './visual/format'
import { BADGE_LABELS, MODE_LABELS, OUTCOME_KIND, VEHICLE_LABELS, eventLabel, type BadgeKind } from './visual/labels'
import { activeManeuver, buildManeuvers, dvBadge, dvSourceText, dvValueText } from './visual/maneuvers'
import { methodLine, orbitWarning, telemetryRows, type HudVehicle } from './visual/telemetry'
import { buildTimeScale } from './visual/timeScale'

const SPEEDS = [1, 10, 100, 1000] as const
const STEP_S = 10
const STEP_BIG_S = 60

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
const badge = (kind: BadgeKind) => `<span class="badge b-${kind}">${BADGE_LABELS[kind]}</span>`

/** Every distinct source URL cited in the data file, with the first note that mentions it. */
function collectSources(): { url: string; host: string }[] {
  const seen = new Map<string, string>()
  const walk = (n: unknown) => {
    if (Array.isArray(n)) n.forEach(walk)
    else if (n && typeof n === 'object') {
      for (const [k, v] of Object.entries(n)) {
        if (k === 'source' && typeof v === 'string' && /^https?:/.test(v)) seen.set(v, new URL(v).hostname.replace(/^www\./, ''))
        else walk(v)
      }
    }
  }
  walk(flight)
  return [...seen].map(([url, host]) => ({ url, host })).sort((a, b) => a.host.localeCompare(b.host))
}

export function mount(root: HTMLElement): () => void {
  const timeline = flight.timeline
  const times = timeline.map((e) => e.t_sec)
  const scale = buildTimeScale(times, duration)
  const liftoffUtc = flight.mission.liftoff_utc.value
  const ftsT = timeline.find((e) => e.id === 'booster_fts')?.t_sec ?? Infinity
  const catchT = timeline.find((e) => e.id === 'ship_catch')?.t_sec ?? Infinity
  const maneuvers = buildManeuvers()
  const payloadCount = flight.mission.payload.count.value
  const splash = flight.mission.outcomes.booster.splashdown_coordinates

  root.innerHTML = `
  <div class="app" data-mode="pad">
    <div class="stage" data-role="stage"></div>
    <div class="labels" data-role="labels" aria-hidden="true"></div>
    <div class="vignette"></div><div class="grain"></div>

    <header class="brand rise" style="--d:0">
      <svg class="mark" viewBox="0 0 40 64" aria-hidden="true">
        <path d="M20 2 C26 14 28 24 28 36 V56 H12 V36 C12 24 14 14 20 2Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M12 44 L4 58 H12 M28 44 L36 58 H28" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M14 60 H26" stroke="var(--ember)" stroke-width="2"/>
      </svg>
      <div>
        <h1>Starship <em>Flight&nbsp;15</em></h1>
        <p>Educational simulation with public data</p>
      </div>
    </header>

    <nav class="switch rise" style="--d:1" aria-label="Camera">
      ${CAMERA_MODES.map((m) => `<button data-mode-btn="${m}" title="${MODE_LABELS[m].hint} (${MODE_LABELS[m].key})"${m === 'pad' ? ' class="on"' : ''}>${MODE_LABELS[m].name}</button>`).join('')}
      <button data-role="reset" title="Recenter: go back to the mode's initial view">Recenter <kbd>R</kbd></button>
    </nav>
    <div class="toggles rise" style="--d:2" aria-label="Layers">
      <button data-opt="orbit" class="on" title="Live osculating orbit (L)">Orbit <kbd>L</kbd></button>
      <button data-opt="track" title="Ground track (G)">Ground track <kbd>G</kbd></button>
      <button data-opt="trails" class="on" title="Vehicle trails (K)">Trails <kbd>K</kbd></button>
      <button data-opt="visualScale" class="on" title="Enlarges the vehicles as the camera moves away (E)">Visual scale <kbd>E</kbd></button>
      <button data-opt="labels" class="on" title="Labels (N)">Labels <kbd>N</kbd></button>
    </div>
    <div class="strip" data-role="strip"></div>

    <section class="panel clock rise" style="--d:2" aria-label="Mission clock">
      <div class="tplus" data-role="tplus">T+00:00:00</div>
      <div class="local" data-role="local"></div>
      <div class="phase"><span class="tag">Event</span><strong data-role="phase">—</strong></div>
    </section>

    <section class="panel hud rise" style="--d:3" aria-label="Telemetry">
      <h2>Telemetry
        <span class="tabs" role="tablist">
          <button data-hud="ship" class="on" role="tab" title="Ship telemetry (V)">Ship</button>
          <button data-hud="booster" role="tab" title="Booster telemetry (V)">Booster</button>
        </span>
      </h2>
      <dl data-role="hud"></dl>
      <p class="method" data-role="method"></p>
    </section>

    <aside class="panel log rise" style="--d:4" aria-label="Event log">
      <h2>Event log <span class="count" data-role="count"></span></h2>
      <ol data-role="log"></ol>
    </aside>

    <aside class="panel mnv rise" style="--d:5" aria-label="Maneuvers">
      <h2>Maneuvers · Δv</h2>
      <ul data-role="mnv"></ul>
    </aside>

    <div class="callouts" data-role="callouts"></div>

    <footer class="transport rise" style="--d:5">
      <div class="controls">
        <button data-role="prev" title="Previous event (,)" aria-label="Previous event">&#9198;</button>
        <button data-role="play" class="play" title="Play / pause (Space)" aria-label="Play">&#9654;</button>
        <button data-role="next" title="Next event (.)" aria-label="Next event">&#9197;</button>
        <div class="speeds" role="group" aria-label="Speed">
          ${SPEEDS.map((s, i) => `<button data-speed="${s}" class="${i === 0 ? 'on' : ''}" title="Key ${i + 1}">${s}×</button>`).join('')}
        </div>
        <button data-role="help" class="ghost" title="Keyboard shortcuts (H)">Shortcuts <kbd>H</kbd></button>
        <button data-role="src" class="ghost" title="Data sources (I)">Sources <kbd>I</kbd></button>
      </div>
      <div class="scrub">
        <div class="ticks" data-role="ticks"></div>
        <input type="range" min="0" max="10000" step="1" value="0" data-role="scrub" aria-label="Mission time" />
        <div class="ends"><span>T+00:00:00</span><span class="mid">compressed scale: short segments look wider</span><span>${fmtT(duration)}</span></div>
      </div>
    </footer>

    <div class="disclaimer">
      <b>Notice:</b> This unofficial fan simulation is not affiliated with SpaceX. It uses public data, not internal telemetry, and is not suitable for operations or flight analysis.
      Simplified coastlines; attitude, plumes, satellites and tower are schematic.
    </div>

    <div class="help" data-role="helpbox" hidden>
      <div class="help-card">
        <h2>Shortcuts</h2>
        <ul>
          <li><kbd>Space</kbd> play / pause</li>
          <li><kbd>←</kbd> <kbd>→</kbd> ${STEP_S} s back / forward (with <kbd>Shift</kbd>, ${STEP_BIG_S} s)</li>
          <li><kbd>,</kbd> <kbd>.</kbd> previous / next event</li>
          <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> speed 1× · 10× · 100× · 1000× (<kbd>−</kbd> <kbd>+</kbd> to go down or up)</li>
          <li><kbd>Home</kbd> <kbd>End</kbd> jump to liftoff / to the catch</li>
          <li>Camera: <kbd>T</kbd> Earth · <kbd>O</kbd> orbit · <kbd>S</kbd> Ship · <kbd>B</kbd> booster · <kbd>P</kbd> tower · <kbd>F</kbd> free · <kbd>R</kbd> recenter</li>
          <li>Layers: <kbd>L</kbd> orbit · <kbd>G</kbd> ground track · <kbd>K</kbd> trails · <kbd>E</kbd> visual scale · <kbd>N</kbd> labels</li>
          <li><kbd>V</kbd> Ship or booster telemetry · <kbd>I</kbd> sources</li>
          <li>Mouse: drag to orbit, wheel to zoom, right button to pan</li>
        </ul>
        <button data-role="help-close">Close</button>
      </div>
    </div>

    <div class="help" data-role="srcbox" hidden>
      <div class="help-card wide">
        <h2>Sources</h2>
        <p class="small">Every number in the data file carries its source and confidence level. This is what is cited:</p>
        <ul class="srclist">
          ${collectSources().map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.host)}</a> <span>${esc(s.url)}</span></li>`).join('')}
        </ul>
        <p class="small">The core calculates position, velocity and orbit; if a value is driven by the timeline or interpolated, the HUD says so. The exact FTS point was not published${splash.value === null ? ', nor were the splashdown coordinates' : ''}.</p>
        <button data-role="src-close">Close</button>
      </div>
    </div>
  </div>`

  const $ = <T extends HTMLElement>(sel: string) => {
    const el = root.querySelector<T>(sel)
    if (!el) throw new Error(`Missing element ${sel}`)
    return el
  }
  const stage = $('[data-role=stage]')
  const labelsEl = $('[data-role=labels]')
  const tplus = $('[data-role=tplus]')
  const local = $('[data-role=local]')
  const phase = $('[data-role=phase]')
  const hud = $('[data-role=hud]')
  const methodEl = $('[data-role=method]')
  const strip = $('[data-role=strip]')
  const logEl = $('[data-role=log]')
  const mnvEl = $('[data-role=mnv]')
  const callEl = $('[data-role=callouts]')
  const countEl = $('[data-role=count]')
  const scrub = $<HTMLInputElement>('[data-role=scrub]')
  const ticks = $('[data-role=ticks]')
  const playBtn = $<HTMLButtonElement>('[data-role=play]')
  const helpBox = $('[data-role=helpbox]')
  const srcBox = $('[data-role=srcbox]')
  const app = $('.app')

  let scene: SceneApi
  try {
    scene = createScene(stage)
  } catch (err) {
    stage.innerHTML = `<div class="nogl"><h2>Could not start WebGL</h2><p>Try another browser or enable hardware acceleration.</p></div>`
    console.error(err)
    throw err
  }

  // ---- event log
  const rows: HTMLLIElement[] = timeline.map((e, i) => {
    const li = document.createElement('li')
    const kind = OUTCOME_KIND[e.id]
    li.className = `ev ${kind ? 'out-' + kind : ''}`
    li.dataset.i = String(i)
    const veh = VEHICLE_LABELS[e.vehicle] ?? e.vehicle
    li.innerHTML = `
      <button type="button">
        <span class="t">${fmtT(e.t_sec)}</span>
        <span class="name">${esc(eventLabel(e.id, e.label))}</span>
        <span class="meta">${esc(veh)} ${badge(e.confidence)}</span>
      </button>`
    if (e.as_flown_note) li.title = e.as_flown_note
    logEl.appendChild(li)
    return li
  })
  countEl.textContent = `${timeline.length}`

  for (const e of timeline) {
    const tick = document.createElement('i')
    tick.style.left = `${scale.toPos(e.t_sec) * 100}%`
    const k = OUTCOME_KIND[e.id]
    if (k) tick.className = `tick-${k}`
    ticks.appendChild(tick)
  }

  // ---- maneuvers
  mnvEl.innerHTML = maneuvers
    .map((m) => {
      const known = m.dv.kind !== 'unknown'
      const link = m.dv.kind === 'reported' ? ` <a href="${esc(m.dv.source)}" target="_blank" rel="noopener noreferrer" title="${esc(m.dv.source)}">source</a>` : ''
      return `<li data-id="${m.id}" class="${known ? 'known' : 'unk'}">
        <button type="button" data-t="${m.t0}" title="${esc(dvSourceText(m))}">
          <span class="n">${esc(m.label)}</span>
          <span class="d"><b>${dvValueText(m)}</b> ${badge(dvBadge(m))}</span>
          <span class="s">${fmtT(m.t0)} · ${fmtDuration(m.t1 - m.t0)}</span>
        </button>${known ? `<div class="rep"><span>${esc(dvSourceText(m))}</span>${link}</div>` : ''}
      </li>`
    })
    .join('')

  // ---- state
  let t = 0
  let playing = false
  let speed = 1
  let focusId: string | null = null
  let dragging = false
  let last = performance.now()
  let hudWho: HudVehicle = 'ship'
  let cachedHud = ''
  let cachedStrip = ''
  let cachedCalls = ''
  let cachedIdx = -2
  let cachedPhase = ''
  let cachedMnv = ''
  const labelEls = new Map<string, HTMLElement>()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const clampT = (v: number) => Math.min(Math.max(v, 0), duration)
  function seek(v: number, focus: string | null = null) {
    t = clampT(v)
    focusId = focus
  }
  function currentIndex(s: Sample): number {
    if (focusId) {
      const i = timeline.findIndex((e) => e.id === focusId)
      if (i >= 0 && Math.abs(timeline[i].t_sec - s.time) < 1e-6) return i
    }
    return timeline.findIndex((e) => e.id === s.event.id)
  }
  function nextEvent() {
    const i = currentIndex(frameAt(t))
    const n = timeline[i + 1]
    if (n) seek(n.t_sec, n.id)
    else seek(duration)
  }
  function prevEvent() {
    const i = currentIndex(frameAt(t))
    if (i >= 0 && t > timeline[i].t_sec + 0.5) seek(timeline[i].t_sec, timeline[i].id)
    else if (i > 0) seek(timeline[i - 1].t_sec, timeline[i - 1].id)
    else seek(0)
  }
  function setPlaying(p: boolean) {
    if (p && t >= duration) seek(0)
    playing = p
    playBtn.innerHTML = p ? '&#10074;&#10074;' : '&#9654;'
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play')
    playBtn.classList.toggle('on', p)
  }
  function setSpeed(s: number) {
    speed = s
    root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s))
  }
  function setHud(w: HudVehicle) {
    hudWho = w
    cachedHud = ''
    root.querySelectorAll<HTMLButtonElement>('[data-hud]').forEach((b) => b.classList.toggle('on', b.dataset.hud === w))
  }
  function setMode(m: CameraMode) {
    scene.setMode(m)
    app.dataset.mode = m
    root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]').forEach((b) => b.classList.toggle('on', b.dataset.modeBtn === m))
    if (m === 'ship') setHud('ship')
    if (m === 'booster') setHud('booster')
  }
  type Opt = 'orbit' | 'track' | 'trails' | 'visualScale' | 'labels'
  function toggleOpt(k: Opt) {
    const on = !scene.options[k]
    scene.setOptions({ [k]: on })
    root.querySelector(`[data-opt=${k}]`)?.classList.toggle('on', on)
  }

  // ---- events
  root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]').forEach((b) =>
    b.addEventListener('click', () => {
      setMode(b.dataset.modeBtn as CameraMode)
      b.blur()
    }),
  )
  root.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) =>
    b.addEventListener('click', () => {
      toggleOpt(b.dataset.opt as Opt)
      b.blur()
    }),
  )
  root.querySelectorAll<HTMLButtonElement>('[data-hud]').forEach((b) => b.addEventListener('click', () => setHud(b.dataset.hud as HudVehicle)))
  $('[data-role=reset]').addEventListener('click', (e) => {
    scene.resetCamera()
    ;(e.currentTarget as HTMLElement).blur()
  })
  playBtn.addEventListener('click', () => {
    setPlaying(!playing)
    playBtn.blur()
  })
  $('[data-role=prev]').addEventListener('click', (e) => {
    prevEvent()
    ;(e.currentTarget as HTMLElement).blur()
  })
  $('[data-role=next]').addEventListener('click', (e) => {
    nextEvent()
    ;(e.currentTarget as HTMLElement).blur()
  })
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => {
      setSpeed(Number(b.dataset.speed))
      b.blur()
    }),
  )
  const toggleBox = (box: HTMLElement, show?: boolean) => {
    box.hidden = show === undefined ? !box.hidden : !show
  }
  $('[data-role=help]').addEventListener('click', () => toggleBox(helpBox, true))
  $('[data-role=help-close]').addEventListener('click', () => toggleBox(helpBox, false))
  $('[data-role=src]').addEventListener('click', () => toggleBox(srcBox, true))
  $('[data-role=src-close]').addEventListener('click', () => toggleBox(srcBox, false))
  for (const box of [helpBox, srcBox])
    box.addEventListener('click', (e) => {
      if (e.target === box) toggleBox(box, false)
    })
  logEl.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li.ev')
    if (!(li instanceof HTMLLIElement)) return
    const ev = timeline[Number(li.dataset.i)]
    seek(ev.t_sec, ev.id)
  })
  mnvEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-t]')
    if (b instanceof HTMLButtonElement) seek(Number(b.dataset.t) + 0.01)
  })
  scrub.addEventListener('pointerdown', () => (dragging = true))
  const onPointerUp = () => (dragging = false)
  window.addEventListener('pointerup', onPointerUp)
  scrub.addEventListener('input', () => seek(scale.toTime(Number(scrub.value) / 10000)))

  const KEY_MODES: Record<string, CameraMode> = { t: 'earth', o: 'orbit', s: 'ship', b: 'booster', p: 'pad', f: 'free' }
  const KEY_OPTS: Record<string, Opt> = { l: 'orbit', g: 'track', k: 'trails', e: 'visualScale', n: 'labels' }
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key
    const lower = k.length === 1 ? k.toLowerCase() : k
    const handled = () => {
      e.preventDefault()
      e.stopPropagation()
    }
    if (k === ' ') {
      handled()
      if (!e.repeat) setPlaying(!playing)
    } else if (k === 'ArrowRight') {
      handled()
      seek(t + (e.shiftKey ? STEP_BIG_S : STEP_S))
    } else if (k === 'ArrowLeft') {
      handled()
      seek(t - (e.shiftKey ? STEP_BIG_S : STEP_S))
    } else if (k === '.' || k === ']') {
      handled()
      nextEvent()
    } else if (k === ',' || k === '[') {
      handled()
      prevEvent()
    } else if (k >= '1' && k <= '4') {
      handled()
      setSpeed(SPEEDS[Number(k) - 1])
    } else if (k === '+' || k === '=') {
      handled()
      setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.findIndex((s) => s === speed) + 1)])
    } else if (k === '-' || k === '_') {
      handled()
      setSpeed(SPEEDS[Math.max(0, SPEEDS.findIndex((s) => s === speed) - 1)])
    } else if (k === 'Home') {
      handled()
      seek(0)
    } else if (k === 'End') {
      handled()
      seek(duration)
    } else if (k === 'Escape') {
      toggleBox(helpBox, false)
      toggleBox(srcBox, false)
    } else if (lower === 'r') {
      handled()
      scene.resetCamera()
    } else if (lower === 'h' || k === '?') {
      handled()
      toggleBox(helpBox)
    } else if (lower === 'v') {
      handled()
      setHud(hudWho === 'ship' ? 'booster' : 'ship')
    } else if (lower === 'i') {
      handled()
      toggleBox(srcBox)
    } else if (lower in KEY_MODES) {
      handled()
      setMode(KEY_MODES[lower])
    } else if (lower in KEY_OPTS) {
      handled()
      toggleOpt(KEY_OPTS[lower])
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') e.preventDefault()
  }
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('keyup', onKeyUp, true)

  // ---- per frame UI
  function paintLabels(s: Sample) {
    const seen = new Set<string>()
    for (const l of scene.labels(s)) {
      seen.add(l.id)
      let el = labelEls.get(l.id)
      if (!el) {
        el = document.createElement('div')
        labelsEl.appendChild(el)
        labelEls.set(l.id, el)
      }
      if (el.dataset.text !== l.text) {
        el.dataset.text = l.text
        el.textContent = l.text
      }
      el.className = `lbl k-${l.kind}${l.dim ? ' dim' : ''}`
      el.style.display = l.visible ? '' : 'none'
      if (l.visible) el.style.transform = `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px) ${l.align === 'right' ? 'translate(10px, -50%)' : 'translate(-50%, -125%)'}`
    }
    for (const [id, el] of labelEls)
      if (!seen.has(id)) {
        el.remove()
        labelEls.delete(id)
      }
  }

  function paintHud(s: Sample) {
    const html = telemetryRows(s, hudWho)
      .map((x) => `<div class="cell is-${x.badge}" title="${esc(x.hint ?? '')}"><dt>${x.label}</dt><dd><span class="v">${esc(x.value)}</span>${badge(x.badge)}</dd></div>`)
      .join('')
    if (html !== cachedHud) {
      hud.innerHTML = html
      cachedHud = html
    }
    const mt = methodLine(s, hudWho)
    if (methodEl.textContent !== mt) methodEl.textContent = mt
  }

  function paintClock(s: Sample, idx: number) {
    tplus.textContent = fmtT(s.time)
    const c = cordobaClock(liftoffUtc, s.time)
    const ctext = c ? `Córdoba · ${c.date} · ${c.time}` : ''
    if (local.dataset.v !== ctext) {
      local.dataset.v = ctext
      local.innerHTML = c ? `<span>Córdoba · ${esc(c.date)} · <b>${c.time}</b></span><i title="Liftoff was reported by the press at around 22:47 UTC; SpaceX did not publish the exact second">approx.</i>` : ''
    }
    const text = idx >= 0 ? eventLabel(timeline[idx].id, timeline[idx].label) : 'Before liftoff'
    if (text !== cachedPhase) {
      phase.textContent = text
      cachedPhase = text
    }
  }

  function paintStrip(s: Sample) {
    const st = scene.status()
    const bDone = s.time >= ftsT
    const sDone = s.time >= catchT
    const warn = orbitWarning(s)
    const chips = [
      `<div class="chip ${bDone ? 'fts' : ''}"><b>Booster 22</b><span>${bDone ? 'FTS over the Gulf · no catch · position not published' : 'in flight'}</span></div>`,
      `<div class="chip ${sDone ? 'catch' : ''}"><b>Ship 42</b><span>${sDone ? 'caught at Pad 2' : 'in flight'}</span></div>`,
      `<div class="chip"><b>Starlink V3</b><span>${s.satellites.length} of ${payloadCount} in orbit</span></div>`,
      st.scale > 1.05 ? `<div class="chip warn"><b>Visual scale</b><span>vehicles ×${st.scale < 10 ? st.scale.toFixed(1) : Math.round(st.scale)}</span></div>` : '',
      s.time >= entryHandoff.time
        ? `<div class="chip warn wide"><b>Entry · explicit model cut</b><span>From ${fmtT(entryHandoff.time)} the Ship follows a local cinematic curve: the core cuts position and velocity (jump of ${Math.round(entryHandoff.distanceM / 1000).toLocaleString('en-US')} km and ${Math.round(entryHandoff.velocityGapMs).toLocaleString('en-US')} m/s). Values are interpolated, not telemetry, and the trails do not cross the cut.</span></div>`
        : '',
      warn && s.ship.status !== 'caught' ? `<div class="chip warn"><b>Orbit</b><span>${esc(warn)}</span></div>` : '',
    ].join('')
    if (chips !== cachedStrip) {
      strip.innerHTML = chips
      cachedStrip = chips
    }
  }

  function paintCallouts(s: Sample) {
    const html = calloutsAt(s.time)
      .map((c) => `<div class="co ${c.kind}">${esc(c.text)}</div>`)
      .join('')
    if (html !== cachedCalls) {
      callEl.innerHTML = html
      cachedCalls = html
    }
  }

  function paintMnv(s: Sample) {
    const a = activeManeuver(maneuvers, s.time)
    const key = `${a?.id ?? ''}|${maneuvers.map((m) => (s.time >= m.t1 ? 1 : 0)).join('')}`
    if (key === cachedMnv) return
    cachedMnv = key
    mnvEl.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('now', li.dataset.id === a?.id)
      li.classList.toggle('done', s.time >= maneuvers[i].t1)
    })
  }

  function paintLog(idx: number) {
    if (idx === cachedIdx) return
    cachedIdx = idx
    rows.forEach((li, i) => {
      li.classList.toggle('done', i < idx)
      li.classList.toggle('now', i === idx)
    })
    if (idx >= 0) rows[idx].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }

  let raf = 0
  function loop(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (playing) {
      t = clampT(t + dt * speed)
      if (dt > 0) focusId = null
      if (t >= duration) setPlaying(false)
    }
    const s = frameAt(t)
    scene.render(s, dt, now)
    const idx = currentIndex(s)
    paintClock(s, idx)
    paintHud(s)
    paintLog(idx)
    paintStrip(s)
    paintCallouts(s)
    paintMnv(s)
    paintLabels(s)
    if (!dragging) scrub.value = String(Math.round(scale.toPos(s.time) * 10000))
    scrub.setAttribute('aria-valuetext', fmtT(s.time))
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('pointerup', onPointerUp)
    scene.dispose()
    root.innerHTML = ''
  }
}
