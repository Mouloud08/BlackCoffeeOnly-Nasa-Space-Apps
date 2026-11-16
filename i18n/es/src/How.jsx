// Version 5 "How it works": a stepper, one step per screen (Problem · Bridge · Proof · Records), deep-linkable
// (step=), Next/Previous, arrow keys, step dots. Charts draw when their step becomes active (instantly with anim=0
// or reduced motion).
import { useEffect, useState, memo } from 'react';
import { Segmented, SENSOR_CHAIN } from '../ds/components/src/components.jsx';
import { RatioStrip, RecordMini } from './Strips.jsx';
import { FIRST, LAST, SW, cellSummary, versus } from './metrics.js';
import { X, F2, NUM, story, boxText, bootRange, corrFactor, xr, recordSentence, chanceRange, ratioWords, plainSentence } from './copy.js';
import { tm, PS } from './l10n.js';
import { RiseBars } from './Verdict.jsx';
import { RawBars } from './Story.jsx';
import { ChanceChart, ProvenanceLine } from './Evidence.jsx'; // Spanish labels (the ds/ one is English only)
import { cx, reduced, Icon, IC } from './util.jsx';

const STEPS = ['El problema', 'El empalme', 'La prueba', 'Récords'];
const R90 = 'rango del 90' + PS;
const CNAME = { canada: 'Canadá', argentina: 'Argentina' };

// The design-system SensorFrieze knows only English and French: the same markup and geometry, Spanish words.
function SensorFrieze({ from = 2000, to = 2034, now = 2026.87, covered = [2001, 2025], compact = false }) {
  const X = (t) => ((t - from) / (to - from)) * 100 + '%';
  const marks = [
    { t: 2012, k: compact ? '2012' : 'MODIS → VIIRS', s: 'empalme corregido aquí', a: 'mid', row: 0 },
    { t: 2026.84, k: compact ? 'fin de S-NPP' : 'Fin de S-NPP', s: '2 nov. 2026 · próximo empalme', a: 'end', row: compact ? 1 : 0 },
    { t: 2029, k: 'WildFireSat', s: 'lanzamiento previsto (CSA)', a: compact ? 'end' : 'start', row: 0 },
  ];
  const ticks = compact ? [2000, 2010, 2020, 2030] : [2000, 2005, 2010, 2015, 2020, 2025, 2030];
  return (
    <figure className={cx('at-frieze', compact && 'is-compact')} aria-label="Cadena de sensores de fuego, de 2000 a 2030">
      <div className="at-fz-row at-fz-marks" aria-hidden="true">
        <div className="at-fz-label" />
        <div className="at-fz-track">
          <span className="at-fz-covered" style={{ left: X(covered[0]), width: 'calc(' + X(covered[1] + 1) + ' - ' + X(covered[0]) + ')' }}>{'FireBridge: ' + covered[0] + '–' + covered[1]}</span>
          {marks.map((m) => <span key={m.t} className={cx('at-fz-mark', 'is-' + m.a, 'row-' + m.row)} style={{ left: X(m.t) }}><b>{m.k}</b>{!compact && <em>{m.s}</em>}</span>)}
        </div>
      </div>
      {SENSOR_CHAIN.map((s) => {
        const open = !s.end && s.fam !== 'planned';
        const end = s.end || (s.fam === 'planned' ? to : now + 1.6);
        return (
          <div key={s.id} className="at-fz-row">
            <div className="at-fz-label">{s.label}{s.res && !compact ? <span className="at-mono">{s.res}</span> : null}</div>
            <div className="at-fz-track">
              {marks.map((m) => <i key={m.t} className="at-fz-rule" style={{ left: X(m.t) }} aria-hidden="true" />)}
              <i className={cx('at-fz-bar', 'is-' + s.fam, s.end && 'has-end', open && 'is-open')} style={{ left: X(s.start), width: 'calc(' + X(end) + ' - ' + X(s.start) + ')' }} />
              <span className="at-sr">{s.label + ': ' + (s.fam === 'planned' ? 'lanzamiento previsto en ' + s.start : 'desde ' + Math.floor(s.start) + (s.end ? ', terminó el 2 de noviembre de 2026' : ''))}</span>
            </div>
          </div>
        );
      })}
      <div className="at-fz-row at-fz-axis" aria-hidden="true">
        <div className="at-fz-label" />
        <div className="at-fz-track">{ticks.map((t) => <span key={t} style={{ left: X(t) }}>{t}</span>)}<span className="is-now" style={{ left: X(now) }}>hoy</span></div>
      </div>
      <figcaption className="at-fz-key">
        <span><i className="at-fz-bar is-modis" />MODIS, 1 km</span>
        <span><i className="at-fz-bar is-viirs" />VIIRS, 375 m</span>
        <span><i className="at-fz-bar is-planned" />misión prevista</span>
      </figcaption>
    </figure>
  );
}
const SPAN = [FIRST, 2027];

export const How = memo(function How({ Z, cells, ex, setEx, showThis, zoneName, official, step, setStep, reference, phone, onEvidence }) {
  const [seen, setSeen] = useState(reduced());
  useEffect(() => { if (reduced()) { setSeen(true); return undefined; } setSeen(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setSeen(true))); return () => cancelAnimationFrame(t); }, [step, ex]);
  useEffect(() => {
    const on = (e) => {
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.closest && t.closest('[role=radiogroup],[role=tablist],[popover]'))) return;
      if (e.key === 'ArrowRight' && step < 4) { e.preventDefault(); setStep(step + 1); }
      if (e.key === 'ArrowLeft' && step > 1) { e.preventDefault(); setStep(step - 1); }
    };
    document.addEventListener('keydown', on); return () => document.removeEventListener('keydown', on);
  }, [step]);
  // v6.2: the first example is the selected country (Canada or Argentina), never Canada by default.
  const opts = [{ value: ex === 'argentina' ? 'argentina' : 'canada', label: ex === 'argentina' ? tm('All of Argentina') : tm('All of Canada') }, { value: 'larioja', label: 'La Rioja' }];
  if (showThis) opts.push({ value: 'zone', label: 'Esta zona' });
  if (!Z) return <div className="fb-howtab is-skel" aria-hidden="true" />;
  const s = story(Z, ex === 'canada' ? 'Canadá' : ex === 'argentina' ? 'Argentina' : ex === 'larioja' ? 'La Rioja' : null);
  const borrowed = Z.gradeWhy === 'borrowed';
  const left = Z.harmOK ? Z.src.overlap.filter((o) => o.modis < 50).map((o) => o.year) : [];
  const zoneTag = <span>{zoneName} · <span className="at-mono">{boxText(Z.box)}</span></span>;
  const cty = ex === 'larioja' || ex === 'argentina' ? 'argentina' : ex === 'canada' ? 'canada' : (Z.box.s < 0 ? 'argentina' : 'canada');
  const S = cells ? cells[cty] : null;
  const sb = S && ex !== 'canada' && ex !== 'argentina' ? cellSummary(S.cells, S, Z.box) : null;
  const recS = sb && sb.n >= 30 ? sb : S ? S.summary : null;
  const rs = recS ? recordSentence(recS, versus) : null;
  let title, answer, body, chart, prov;
  if (step === 1) {
    title = s.q; answer = s.a;
    body = <p className="fb-step-b">Desde 2012, el registro se basa en un sensor satelital más nítido (VIIRS), que ve {ratioWords(Z.ratio || 2)} fuegos que el anterior (MODIS); MODIS sigue volando. Si se unen sin corrección, el registro salta en 2012 incluso donde los fuegos no aumentaron. VIIRS observa cuadrados de 375 m y MODIS de 1 km, así que VIIRS capta fuegos más pequeños que MODIS no ve.</p>;
    chart = <><p className="fb-figcap">Detecciones de fuego por año, datos crudos, escala logarítmica · medias 2003–2011 ({NUM(Z.levels.raw.before)}) y 2012–{LAST} ({NUM(Z.levels.raw.after)}): crudo {X(Z.riseRaw)}</p><RawBars Z={Z} seen={seen} /><div className="st-frieze"><SensorFrieze from={SPAN[0]} to={SPAN[1]} covered={[FIRST, LAST]} compact={phone} /></div></>;
    prov = <ProvenanceLine status="real" source="NASA FIRMS" period={'2001–' + LAST}>{zoneTag}</ProvenanceLine>;
  } else if (step === 2) {
    title = '¿Cuánto más ve el satélite nuevo?';
    answer = Z.harmOK ? (borrowed ? 'En los alrededores de esta área, ' + F2(Z.ratio) + ' veces lo que ve el anterior.' : 'Aquí, ' + F2(Z.ratio) + ' veces lo que ve el anterior.') : 'Aquí hay muy pocos fuegos para medirlo de forma confiable.';
    body = Z.harmOK ? <p className="fb-step-b">Ambos satélites vuelan juntos desde {SW}; aquí se comparan de {SW} a {LAST}. Multiplicamos los años del satélite anterior por ese factor y dejamos el nuevo sin tocar.{left.length ? ' ' + left.join(', ') + (left.length === 1 ? ' tiene' : ' tienen') + ' muy pocos fuegos y ' + (left.length === 1 ? 'queda' : 'quedan') + ' fuera de la prueba.' : ''}{borrowed ? ' Esta área es pequeña, así que el factor viene del área que la rodea.' : ''}</p> : null;
    chart = Z.harmOK && Z.usable.length ? <><p className="fb-figcap">{borrowed ? 'Área más amplia ' + boxText(Z.borrowed.box) + ' · ' : ''}Ambos satélites, año por año · <b>factor {F2(Z.ratio)}</b> ({F2(Z.rMin)}–{F2(Z.rMax)} al dejar fuera cada año por turno)</p><RatioStrip Z={Z} /></> : <p className="fb-step-empty">{Z.own.usable.length} años vistos bien por ambos satélites aquí: muy pocos para compararlos.</p>;
    prov = <ProvenanceLine status="real" source="NASA FIRMS" period={'2012–' + LAST}>{borrowed ? <span>área más amplia · <span className="at-mono">{boxText(Z.borrowed.box)}</span></span> : zoneTag}</ProvenanceLine>;
  } else if (step === 3) {
    title = 'Una vez corregida, ¿cambió la actividad de fuego?'; answer = s.p;
    body = Z.harmOK ? <p className="fb-step-b">{Z.guard ? plainSentence(Z) : Z.trend && Z.trend.status === 'robust' ? 'La respuesta se mantiene sin el año de más fuego (' + Z.trend.bigYear + ': ' + xr(Z.trend.without) + ') y al remuestrear los años (' + R90 + ' ' + bootRange(Z.trend) + ').' : Z.trend ? 'La tendencia es incierta: ' + xr(Z.trend.without) + ' sin ' + Z.trend.bigYear + ', ' + R90 + ' ' + bootRange(Z.trend) + ' al remuestrear los años. El factor de corrección en sí es robusto.' : ''}{Z.riseAqua != null && isFinite(Z.riseAqua) ? ' Un solo satélite anterior (Aqua) apunta ' + ((Z.riseAqua - 1) * (Z.riseH - 1) >= 0 ? 'en la misma dirección' : 'en la dirección opuesta') + ' (' + X(Z.riseAqua) + ').' : ''} Más verificaciones en Evidencia.</p> : <p className="fb-step-b">{plainSentence(Z)} Solo se muestra el cambio con los dos registros simplemente unidos, y mezcla dos satélites.</p>;
    chart = <RiseBars Z={Z} big={!phone} seen={seen} official={official} />;
    prov = <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–2011 vs. 2012–' + LAST}>{reference ? <span>Zona de referencia de Quebec</span> : null}</ProvenanceLine>;
  } else {
    title = '¿El cambio de satélite creó años récord falsos?';
    answer = rs ? rs.verdict : null;
    body = rs && <p className="fb-step-b">{rs.head} {rs.base} Un récord es un año, no una tendencia.</p>;
    const P1 = (x) => Math.round(x * 100) + PS;
    chart = S ? (
      <>
        <div className="fb-recpair" role="img" aria-label={'Años récord, crudo y armonizado: celdas cuyo año récord es 2012 o posterior, crudo ' + P1(S.summary.sinceRaw) + ', armonizado ' + P1(S.summary.sinceHarm) + '.'}>
          <RecordMini S={S} country={cty} harm={false} label="Crudo" count={P1(S.summary.sinceRaw) + ' de las celdas'} />
          <RecordMini S={S} country={cty} harm label="Armonizado" count={P1(S.summary.sinceHarm) + ' de las celdas'} />
        </div>
        <p className="fb-figcap"><i className="fb-sw is-before" aria-hidden="true" /> año récord antes de 2012 · <i className="fb-sw is-since" aria-hidden="true" /> 2012 o posterior · gris: no armonizada. El azar por sí solo da {chanceRange(S.summary.chanceHarm)} para el registro armonizado y {chanceRange(S.summary.chanceRaw)} para el crudo.</p>
      </>
    ) : <ChanceChart s={recS} label={CNAME[cty]} />;
    prov = <ProvenanceLine status="computed" source="NASA FIRMS" period={'2003–' + LAST}><span>{recS === sb ? zoneName : cty === 'canada' ? 'Canadá' : 'Argentina'} · celdas de 0,5°</span></ProvenanceLine>;
  }
  return (
    <div className="fb-howtab">
      <div className="fb-how-top">
        <ol className="fb-dots" aria-label="Pasos">{STEPS.map((n, i) => <li key={n}><button type="button" className={cx('fb-dot2', step === i + 1 && 'is-on')} aria-current={step === i + 1 ? 'step' : undefined} onClick={() => setStep(i + 1)}><b>{i + 1}</b>{n}</button></li>)}</ol>
        <span className="fb-exlab"><span className="fb-eyebrow">Ejemplo</span><Segmented size="sm" ariaLabel="Zona de ejemplo" value={ex} onChange={setEx} options={opts} /></span>
      </div>
      <article key={step} className={cx('fb-step2', seen && 'is-seen')} aria-labelledby="fb-step-h" tabIndex={phone ? 0 : undefined}>
        <div className="fb-step-text">
          <p className="fb-step-k">{zoneName}</p>
          <h2 className="fb-step-h" id="fb-step-h">{title}</h2>
          {answer && <p className="fb-step-a">{answer}</p>}
          {body}
        </div>
        <figure className="fb-step-fig">{chart}{prov}</figure>
      </article>
      <div className="fb-how-nav">
        <button type="button" className="at-btn" onClick={() => setStep(step - 1)} disabled={step === 1}><Icon d="M19 12H5M11 6l-6 6 6 6" />Anterior</button>
        <span className="fb-muted">Paso {step} de 4 · teclas ← →</span>
        {step < 4 ? <button type="button" className="at-btn at-btn-primary" onClick={() => setStep(step + 1)}>Siguiente<Icon d={IC.arrow} /></button>
          : <button type="button" className="at-btn at-btn-primary" onClick={onEvidence}>Abrir la evidencia<Icon d={IC.arrow} /></button>}
      </div>
    </div>
  );
});
