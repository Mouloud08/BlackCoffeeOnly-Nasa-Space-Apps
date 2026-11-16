// Version 5 "How it works": a stepper, one step per screen (Problem · Bridge · Proof · Records), deep-linkable
// (step=), Next/Previous, arrow keys, step dots. Charts draw when their step becomes active (instantly with anim=0
// or reduced motion).
import { useEffect, useState, memo } from 'react';
import { Segmented, ProvenanceLine, SensorFrieze } from '../ds/components/src/components.jsx';
import { RatioStrip, RecordMini } from './Strips.jsx';
import { FIRST, LAST, SW, cellSummary, versus } from './metrics.js';
import { X, F2, NUM, story, boxText, bootRange, corrFactor, xr, recordSentence, chanceRange, ratioWords, plainSentence } from './copy.js';
import { RiseBars } from './Verdict.jsx';
import { RawBars } from './Story.jsx';
import { ChanceChart } from './Evidence.jsx';
import { cx, reduced, Icon, IC } from './util.jsx';

const STEPS = ['The problem', 'The bridge', 'The proof', 'Records'];
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
  const opts = [{ value: ex === 'argentina' ? 'argentina' : 'canada', label: ex === 'argentina' ? 'All of Argentina' : 'All of Canada' }, { value: 'larioja', label: 'La Rioja' }];
  if (showThis) opts.push({ value: 'zone', label: 'This zone' });
  if (!Z) return <div className="fb-howtab is-skel" aria-hidden="true" />;
  const s = story(Z, ex === 'canada' ? 'Canada' : ex === 'argentina' ? 'Argentina' : ex === 'larioja' ? 'La Rioja' : null);
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
    body = <p className="fb-step-b">In 2012 the record switched from the older satellite sensor (MODIS) to a sharper one (VIIRS), which sees {ratioWords(Z.ratio || 2)} fires. Simply joined without correction, the record jumps in 2012 even where fires did not. VIIRS looks at 375 m squares, MODIS at 1 km, so VIIRS catches smaller fires that MODIS misses.</p>;
    chart = <><p className="fb-figcap">Fire detections per year, raw, log scale · means 2003–2011 ({NUM(Z.levels.raw.before)}) and 2012–{LAST} ({NUM(Z.levels.raw.after)}): raw {X(Z.riseRaw)}</p><RawBars Z={Z} seen={seen} /><div className="st-frieze"><SensorFrieze locale="en" from={SPAN[0]} to={SPAN[1]} covered={[FIRST, LAST]} compact={phone} /></div></>;
    prov = <ProvenanceLine status="real" source="NASA FIRMS" period={'2001–' + LAST}>{zoneTag}</ProvenanceLine>;
  } else if (step === 2) {
    title = 'How much more does the newer satellite see?';
    answer = Z.harmOK ? (borrowed ? 'Around this area, ' + F2(Z.ratio) + ' times what the older one sees.' : 'Here, ' + F2(Z.ratio) + ' times what the older one sees.') : 'Too few fires here to measure it reliably.';
    body = Z.harmOK ? <p className="fb-step-b">Both satellites flew together from {SW} to {LAST}. In this experimental preview we multiply each month of the older satellite's years by its calendar month's factor (shrunk toward the yearly one) and leave the newer one untouched.{left.length ? ' ' + left.join(', ') + (left.length === 1 ? ' has' : ' have') + ' too few fires and ' + (left.length === 1 ? 'is' : 'are') + ' left out of the test.' : ''}{borrowed ? ' This area is small, so the factor comes from the area around it.' : ''}</p> : null;
    chart = Z.harmOK && Z.usable.length ? <><p className="fb-figcap">{borrowed ? 'Wider area ' + boxText(Z.borrowed.box) + ' · ' : ''}Both satellites, year by year · <b>factor {F2(Z.ratio)}</b> ({F2(Z.rMin)}–{F2(Z.rMax)} when each year is left out in turn)</p><RatioStrip Z={Z} /></> : <p className="fb-step-empty">{Z.own.usable.length} years seen well by both satellites here: too few to compare them.</p>;
    prov = <ProvenanceLine status="real" source="NASA FIRMS" period={'2012–' + LAST}>{borrowed ? <span>wider area · <span className="at-mono">{boxText(Z.borrowed.box)}</span></span> : zoneTag}</ProvenanceLine>;
  } else if (step === 3) {
    title = 'Once corrected, did fire activity change?'; answer = s.p;
    body = Z.harmOK ? <p className="fb-step-b">{Z.guard ? plainSentence(Z) : Z.trend && Z.trend.status === 'robust' ? 'The answer holds without the biggest fire year (' + Z.trend.bigYear + ': ' + xr(Z.trend.without) + ') and when the years are resampled (90% range ' + bootRange(Z.trend) + ').' : Z.trend ? 'The trend is uncertain: ' + xr(Z.trend.without) + ' without ' + Z.trend.bigYear + ', 90% range ' + bootRange(Z.trend) + ' when the years are resampled. The correction factor itself is robust.' : ''}{Z.riseAqua != null && isFinite(Z.riseAqua) ? ' One older satellite alone (Aqua) points ' + ((Z.riseAqua - 1) * (Z.riseH - 1) >= 0 ? 'the same way' : 'the other way') + ' (' + X(Z.riseAqua) + ').' : ''} More checks in Evidence.</p> : <p className="fb-step-b">{plainSentence(Z)} Only the change with the two records simply joined is shown, and it mixes two satellites.</p>;
    chart = <RiseBars Z={Z} big={!phone} seen={seen} official={official} />;
    prov = <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–2011 vs 2012–' + LAST}>{reference ? <span>Québec reference zone</span> : null}</ProvenanceLine>;
  } else {
    title = 'Did the satellite change create false record years?';
    answer = rs ? rs.verdict : null;
    body = rs && <p className="fb-step-b">{rs.head} {rs.base} A record is one year, not a trend.</p>;
    const P1 = (x) => Math.round(x * 100) + '%';
    chart = S ? (
      <>
        <div className="fb-recpair" role="img" aria-label={'Record years, raw and harmonized: places whose record year is 2012 or later, raw ' + P1(S.summary.sinceRaw) + ', harmonized ' + P1(S.summary.sinceHarm) + '.'}>
          <RecordMini S={S} country={cty} harm={false} label="Raw" count={P1(S.summary.sinceRaw) + ' of places'} />
          <RecordMini S={S} country={cty} harm label="Harmonized" count={P1(S.summary.sinceHarm) + ' of places'} />
        </div>
        <p className="fb-figcap"><i className="fb-sw is-before" aria-hidden="true" /> record year before 2012 · <i className="fb-sw is-since" aria-hidden="true" /> 2012 or later · grey: not harmonized. Chance alone gives {chanceRange(S.summary.chanceHarm)} for the harmonized record, {chanceRange(S.summary.chanceRaw)} for the raw one.</p>
      </>
    ) : <ChanceChart s={recS} label={cty} />;
    prov = <ProvenanceLine status="computed" source="NASA FIRMS" period={'2003–' + LAST}><span>{recS === sb ? zoneName : cty === 'canada' ? 'Canada' : 'Argentina'} · 0.5° places</span></ProvenanceLine>;
  }
  return (
    <div className="fb-howtab">
      <div className="fb-how-top">
        <ol className="fb-dots" aria-label="Steps">{STEPS.map((n, i) => <li key={n}><button type="button" className={cx('fb-dot2', step === i + 1 && 'is-on')} aria-current={step === i + 1 ? 'step' : undefined} onClick={() => setStep(i + 1)}><b>{i + 1}</b>{n}</button></li>)}</ol>
        <span className="fb-exlab"><span className="fb-eyebrow">Example</span><Segmented size="sm" ariaLabel="Example zone" value={ex} onChange={setEx} options={opts} /></span>
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
        <button type="button" className="at-btn" onClick={() => setStep(step - 1)} disabled={step === 1}><Icon d="M19 12H5M11 6l-6 6 6 6" />Previous</button>
        <span className="fb-muted">Step {step} of 4 · ← → keys</span>
        {step < 4 ? <button type="button" className="at-btn at-btn-primary" onClick={() => setStep(step + 1)}>Next<Icon d={IC.arrow} /></button>
          : <button type="button" className="at-btn at-btn-primary" onClick={onEvidence}>Open the evidence<Icon d={IC.arrow} /></button>}
      </div>
    </div>
  );
});
