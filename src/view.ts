import './style.css'
import { createScene, type SceneApi, type ViewMode } from './scene'
import { duration, flight, frameAt, type Frame } from './visual/core'
import { cordobaClock, fmtT } from './visual/format'
import { BADGE_LABELS, OUTCOME_KIND, VEHICLE_LABELS, eventLabel, type BadgeKind } from './visual/labels'
import { telemetryRows } from './visual/telemetry'
import { buildTimeScale } from './visual/timeScale'

const SPEEDS = [1, 10, 100, 1000] as const
const STEP_S = 10
const STEP_BIG_S = 60

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const badge = (kind: BadgeKind) => `<span class="badge b-${kind}">${BADGE_LABELS[kind]}</span>`

export function mount(root: HTMLElement): () => void {
  const timeline = flight.timeline
  const times = timeline.map((e) => e.t_sec)
  const scale = buildTimeScale(times, duration)
  const liftoffUtc = flight.mission.liftoff_utc.value
  const ftsT = timeline.find((e) => e.id === 'booster_fts')?.t_sec ?? Infinity
  const catchT = timeline.find((e) => e.id === 'ship_catch')?.t_sec ?? Infinity

  root.innerHTML = `
  <div class="app" data-view="pad">
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
        <p>Simulación educativa con datos públicos</p>
      </div>
    </header>

    <nav class="switch rise" style="--d:1" aria-label="Vista">
      <button data-view-btn="pad" class="on">Pad a escala <kbd>V</kbd></button>
      <button data-view-btn="map">Recorrido <kbd>V</kbd></button>
      <button data-role="reset" title="Volver a la cámara inicial">Reencuadrar <kbd>R</kbd></button>
    </nav>

    <section class="panel clock rise" style="--d:2" aria-label="Reloj de misión">
      <div class="tplus" data-role="tplus">T+00:00:00</div>
      <div class="local" data-role="local"></div>
      <div class="phase"><span class="tag">Evento</span><strong data-role="phase">—</strong></div>
      <div class="outcome">
        <div class="chip" data-role="chip-booster"><b>Booster 22</b><span>en vuelo</span></div>
        <div class="chip" data-role="chip-ship"><b>Ship 42</b><span>en vuelo</span></div>
      </div>
    </section>

    <section class="panel hud rise" style="--d:3" aria-label="Telemetría">
      <h2>Telemetría <span class="ph">trayectoria placeholder</span></h2>
      <dl data-role="hud"></dl>
    </section>

    <aside class="panel log rise" style="--d:4" aria-label="Registro de eventos">
      <h2>Registro de eventos <span class="count" data-role="count"></span></h2>
      <ol data-role="log"></ol>
    </aside>

    <div class="notice" data-role="notice" hidden></div>
    <div class="schematic-flag" data-role="flag" hidden>Recorrido esquemático · no es trayectoria ni escala real</div>

    <footer class="transport rise" style="--d:5">
      <div class="controls">
        <button data-role="prev" title="Evento anterior (,)" aria-label="Evento anterior">&#9198;</button>
        <button data-role="play" class="play" title="Reproducir / pausar (Espacio)" aria-label="Reproducir">&#9654;</button>
        <button data-role="next" title="Próximo evento (.)" aria-label="Próximo evento">&#9197;</button>
        <div class="speeds" role="group" aria-label="Velocidad">
          ${SPEEDS.map((s, i) => `<button data-speed="${s}" class="${i === 0 ? 'on' : ''}" title="Tecla ${i + 1}">${s}×</button>`).join('')}
        </div>
        <button data-role="help" class="ghost" title="Atajos de teclado (H)">Atajos <kbd>H</kbd></button>
      </div>
      <div class="scrub">
        <div class="ticks" data-role="ticks"></div>
        <input type="range" min="0" max="10000" step="1" value="0" data-role="scrub" aria-label="Momento de la misión" />
        <div class="ends"><span>T+00:00:00</span><span class="mid">escala comprimida: los tramos cortos se ven más anchos</span><span>${fmtT(duration)}</span></div>
      </div>
    </footer>

    <div class="disclaimer">
      <b>Aviso:</b> aproximación educativa y visual armada con datos públicos. No es un producto oficial de SpaceX, no usa telemetría interna y no sirve para operación ni análisis del vuelo.
    </div>

    <div class="help" data-role="helpbox" hidden>
      <div class="help-card">
        <h2>Atajos</h2>
        <ul>
          <li><kbd>Espacio</kbd> reproducir / pausar</li>
          <li><kbd>←</kbd> <kbd>→</kbd> ${STEP_S} s atrás / adelante (con <kbd>Shift</kbd>, ${STEP_BIG_S} s)</li>
          <li><kbd>,</kbd> <kbd>.</kbd> evento anterior / próximo</li>
          <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> velocidad 1× · 10× · 100× · 1000×</li>
          <li><kbd>−</kbd> <kbd>+</kbd> velocidad más lenta / más rápida</li>
          <li><kbd>Inicio</kbd> <kbd>Fin</kbd> ir al despegue / a la catch</li>
          <li><kbd>V</kbd> cambiar de vista · <kbd>R</kbd> reencuadrar</li>
          <li>Mouse: arrastrar orbita, rueda hace zoom, botón derecho desplaza</li>
        </ul>
        <button data-role="help-close">Cerrar</button>
      </div>
    </div>
  </div>`

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T
  const stage = $('[data-role=stage]')
  const labelsEl = $('[data-role=labels]')
  const tplus = $('[data-role=tplus]')
  const local = $('[data-role=local]')
  const phase = $('[data-role=phase]')
  const chipB = $('[data-role=chip-booster]')
  const chipS = $('[data-role=chip-ship]')
  const hud = $('[data-role=hud]')
  const logEl = $('[data-role=log]')
  const countEl = $('[data-role=count]')
  const scrub = $<HTMLInputElement>('[data-role=scrub]')
  const ticks = $('[data-role=ticks]')
  const playBtn = $<HTMLButtonElement>('[data-role=play]')
  const notice = $('[data-role=notice]')
  const flag = $('[data-role=flag]')
  const helpBox = $('[data-role=helpbox]')
  const app = $('.app')

  let scene: SceneApi
  try {
    scene = createScene(stage)
  } catch (err) {
    stage.innerHTML = `<div class="nogl"><h2>No se pudo iniciar WebGL</h2><p>Probá con otro navegador o activá la aceleración por hardware.</p></div>`
    console.error(err)
    throw err
  }

  // ---- event log
  const rows: HTMLLIElement[] = timeline.map((e, i) => {
    const li = document.createElement('li')
    const kind = OUTCOME_KIND[e.id]
    li.className = `ev ${kind ? 'out-' + kind : ''}`
    li.dataset.id = e.id
    li.dataset.i = String(i)
    const veh = e.vehicle ? VEHICLE_LABELS[e.vehicle] ?? e.vehicle : ''
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

  // ---- scrubber ticks (event markers, FTS and catch coloured)
  for (const e of timeline) {
    const tick = document.createElement('i')
    tick.style.left = `${scale.toPos(e.t_sec) * 100}%`
    const k = OUTCOME_KIND[e.id]
    if (k) tick.className = `tick-${k}`
    ticks.appendChild(tick)
  }

  // ---- state
  let t = 0
  let playing = false
  let speed = 1
  let focusId: string | null = null
  let dragging = false
  let last = performance.now()
  let cachedHud = ''
  let cachedIdx = -2
  let cachedPhase = ''
  const labelEls = new Map<string, HTMLElement>()
  let labelView: ViewMode | null = null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const clampT = (v: number) => Math.min(Math.max(v, 0), duration)
  function seek(v: number, focus: string | null = null) {
    t = clampT(v)
    focusId = focus
  }
  function currentIndex(frame: Frame): number {
    if (focusId) {
      const i = timeline.findIndex((e) => e.id === focusId)
      if (i >= 0 && Math.abs(timeline[i].t_sec - frame.time) < 1e-6) return i
    }
    if (frame.event) {
      const i = timeline.findIndex((e) => e.id === frame.event!.id)
      if (i >= 0) return i
    }
    return -1
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
    playBtn.setAttribute('aria-label', p ? 'Pausar' : 'Reproducir')
    playBtn.classList.toggle('on', p)
  }
  function setSpeed(s: number) {
    speed = s
    root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === s))
  }
  function setView(v: ViewMode) {
    scene.setView(v)
    app.dataset.view = v
    root.querySelectorAll<HTMLButtonElement>('[data-view-btn]').forEach((b) => b.classList.toggle('on', b.dataset.viewBtn === v))
    flag.hidden = v !== 'map'
  }

  // ---- events
  root.querySelectorAll<HTMLButtonElement>('[data-view-btn]').forEach((b) =>
    b.addEventListener('click', () => {
      setView(b.dataset.viewBtn as ViewMode)
      b.blur()
    }),
  )
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
  const toggleHelp = (show?: boolean) => {
    helpBox.hidden = show === undefined ? !helpBox.hidden : !show
  }
  $('[data-role=help]').addEventListener('click', () => toggleHelp(true))
  $('[data-role=help-close]').addEventListener('click', () => toggleHelp(false))
  helpBox.addEventListener('click', (e) => {
    if (e.target === helpBox) toggleHelp(false)
  })
  logEl.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li.ev') as HTMLLIElement | null
    if (!li) return
    const ev = timeline[Number(li.dataset.i)]
    seek(ev.t_sec, ev.id)
  })
  scrub.addEventListener('pointerdown', () => (dragging = true))
  window.addEventListener('pointerup', () => (dragging = false))
  scrub.addEventListener('input', () => seek(scale.toTime(Number(scrub.value) / 10000)))

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key
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
      setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed as never) + 1)])
    } else if (k === '-' || k === '_') {
      handled()
      setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(speed as never) - 1)])
    } else if (k === 'Home') {
      handled()
      seek(0)
    } else if (k === 'End') {
      handled()
      seek(duration)
    } else if (k === 'v' || k === 'V') {
      handled()
      setView(scene.view === 'pad' ? 'map' : 'pad')
    } else if (k === 'r' || k === 'R') {
      handled()
      scene.resetCamera()
    } else if (k === 'h' || k === 'H' || k === '?') {
      handled()
      toggleHelp()
    } else if (k === 'Escape') {
      toggleHelp(false)
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') e.preventDefault()
  }
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('keyup', onKeyUp, true)

  // ---- per frame UI
  function paintLabels(frame: Frame) {
    const view = scene.view
    if (labelView !== view) {
      labelsEl.innerHTML = ''
      labelEls.clear()
      labelView = view
    }
    for (const l of scene.labels(frame)) {
      let el = labelEls.get(l.id)
      if (!el) {
        el = document.createElement('div')
        el.className = `lbl k-${l.kind}`
        el.textContent = l.text
        labelsEl.appendChild(el)
        labelEls.set(l.id, el)
      }
      el.style.display = l.visible ? '' : 'none'
      if (l.visible) el.style.transform = `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px) ${l.align === 'right' ? 'translate(8px, -50%)' : 'translate(-50%, -120%)'}`
      el.classList.toggle('dim', l.dim)
    }
  }

  function paintHud(frame: Frame) {
    const r = telemetryRows(frame)
    const html = r
      .map((x) => `<div class="row" title="${esc(x.hint ?? '')}"><dt>${x.label}</dt><dd><span class="v">${esc(x.value)}</span>${badge(x.badge)}</dd></div>`)
      .join('')
    if (html !== cachedHud) {
      hud.innerHTML = html
      cachedHud = html
    }
  }

  function paintClock(frame: Frame, idx: number) {
    tplus.textContent = fmtT(frame.time)
    const c = cordobaClock(liftoffUtc, frame.time)
    const ctext = c ? `Córdoba · ${c.date} · ${c.time}` : ''
    if (local.dataset.v !== ctext) {
      local.dataset.v = ctext
      local.innerHTML = c ? `<span>Córdoba · ${esc(c.date)} · <b>${c.time}</b></span><i title="El despegue fue reportado por la prensa alrededor de las 22:47 UTC; SpaceX no publicó el segundo exacto">aprox.</i>` : ''
    }
    const ev = idx >= 0 ? timeline[idx] : null
    const text = ev ? eventLabel(ev.id, ev.label) : 'Antes del despegue'
    if (text !== cachedPhase) {
      phase.textContent = text
      cachedPhase = text
    }
    const bDone = frame.time >= ftsT
    chipB.className = `chip ${bDone ? 'fts' : ''}`
    chipB.lastElementChild!.textContent = bDone ? 'FTS sobre el Golfo · sin catch' : 'en vuelo'
    const sDone = frame.time >= catchT
    chipS.className = `chip ${sDone ? 'catch' : ''}`
    chipS.lastElementChild!.textContent = sDone ? 'atrapada en Pad 2' : 'en vuelo'
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

  function paintNotice() {
    let msg = ''
    if (scene.view === 'pad' && scene.padState === 'away') {
      msg = 'Los vehículos salieron del cuadro del pad. Mirá el recorrido esquemático (tecla V).'
    }
    if (notice.textContent !== msg) {
      notice.textContent = msg
      notice.hidden = !msg
    }
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
    const frame = frameAt(t)
    scene.render(frame, dt)
    const idx = currentIndex(frame)
    paintClock(frame, idx)
    paintHud(frame)
    paintLog(idx)
    paintLabels(frame)
    paintNotice()
    if (!dragging) scrub.value = String(Math.round(scale.toPos(frame.time) * 10000))
    scrub.setAttribute('aria-valuetext', `${fmtT(frame.time)}`)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('keyup', onKeyUp, true)
    scene.dispose()
    root.innerHTML = ''
  }
}
