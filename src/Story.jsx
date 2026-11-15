// How it works (SPEC §8): three steps, live for the example zone, each a standalone 16:9 frame.
import { Segmented, OverlapChart, ProvenanceLine, SensorFrieze } from '../ds/components/src/components.jsx';
import { formatShort } from '../ds/components/src/scale.js';
import { FIRST, LAST, CAL_LAST, SW, YEARS, cellSummary, versus } from './metrics.js';
import { recordSentence, X, F2, PCT, NUM, story, quietYears, boxText, bootRange, corrFactor } from './copy.js';
import { RiseBars } from './Verdict.jsx';
import { cx, useSeen } from './util.jsx';

const SPAN = [FIRST, 2027]; // shared x domain of the bars and the sensor frieze
const xPct = (t) => ((t - SPAN[0]) / (SPAN[1] - SPAN[0])) * 100;

export function RawBars({ Z, seen }) {
  const ann = YEARS.map((y) => ({ year: y, raw: Z.annRaw(y) }));
  const top = Math.max(10, ...ann.map((a) => a.raw));
  const lo = 10, hi = Math.pow(10, Math.ceil(Math.log10(top * 1.4) * 4) / 4);
  const f = (v) => (v <= 0 ? 0 : Math.max(0, Math.min(1, (Math.log10(Math.max(v, lo)) - 1) / (Math.log10(hi) - 1))));
  const ticks = [100, 1000, 10000, 100000].filter((t) => t < hi);
  const lv = Z.levels.raw;
  return (
    <div className="st-bars" role="img" aria-label={'Detections per year, raw, 2001–' + LAST + ', log scale. Mean 2003–2011: ' + NUM(lv.before) + ' cell-days (MODIS). Mean 2012–' + LAST + ': ' + NUM(lv.after) + ' cell-days (VIIRS), ' + X(Z.riseRaw) + '.'}>
      <div className="st-bars-row">
        <div className="st-gutter st-yticks">{ticks.map((t) => <span key={t} style={{ bottom: f(t) * 100 + '%' }}>{formatShort(t, 'en')}</span>)}</div>
        <div className="st-track">
          {ticks.map((t) => <i key={t} className="st-ygrid" style={{ bottom: f(t) * 100 + '%' }} />)}
          {ann.map((a, i) => (
            <div key={a.year} className="st-col" style={{ left: xPct(a.year) + '%', width: xPct(SPAN[0] + 1) + '%' }}>
              <div className={cx('st-bar', a.year < SW ? 'is-modis' : 'is-viirs')} style={{ transform: 'scaleY(' + (seen ? f(a.raw) : 0).toFixed(4) + ')', transitionDelay: (seen ? i * 30 : 0) + 'ms' }} />
            </div>
          ))}
          <i className={cx('st-level', seen && 'is-on')} style={{ left: xPct(2003) + '%', width: xPct(SW) - xPct(2003) + '%', bottom: f(lv.before) * 100 + '%' }} />
          <i className={cx('st-level', 'is-after', seen && 'is-on')} style={{ left: xPct(SW) + '%', width: xPct(LAST + 1) - xPct(SW) + '%', bottom: f(lv.after) * 100 + '%' }} />
          <i className="st-seam" style={{ left: xPct(SW) + '%' }}><b>2012</b><em>MODIS → VIIRS</em></i>
        </div>
      </div>
      <div className="st-bars-row st-axis" aria-hidden="true">
        <div className="st-gutter" />
        <div className="st-track">{[2001, 2005, 2010, 2015, 2020, 2025].map((y) => <span key={y} style={{ left: xPct(y + 0.5) + '%' }}>{y}</span>)}</div>
      </div>
    </div>
  );
}

function Step({ n, name, zoneName, title, answer, children, chart, prov, id, phone, slim }) {
  const [ref, seen] = useSeen(0.3);
  return (
    <article className={cx('fb-step', !seen && 'is-pre', slim && 'is-slim')} ref={ref} id={id} aria-labelledby={id + '-h'}>
      <div className="fb-step-text">
        <p className="fb-step-k"><span className="fb-step-n">{n}</span>{name} · {zoneName}</p>
        <h3 className="fb-step-h" id={id + '-h'}>{title}</h3>
        {answer && <p className="fb-step-a">{answer}</p>}
        {children}
      </div>
      <figure className="fb-step-fig">
        <div className="fb-step-scroll" tabIndex={phone ? 0 : undefined} role={phone ? 'region' : undefined} aria-label={phone ? 'Step ' + n + ' chart, scrolls sideways' : undefined}><div className="fb-step-min">{chart(seen)}</div></div>
        {prov}
      </figure>
    </article>
  );
}

export function Story({ cells, Z, ex, setEx, showThis, zoneName, cdValidation, reference, phone, official }) {
  const opts = [{ value: 'canada', label: 'All of Canada' }, { value: 'larioja', label: 'La Rioja' }];
  if (showThis) opts.push({ value: 'zone', label: 'This zone' });
  const s = Z ? story(Z, ex === 'canada' ? 'Canada' : ex === 'larioja' ? 'La Rioja' : null) : null;
  const borrowed = Z && Z.gradeWhy === 'borrowed';
  const src = Z ? Z.src : null;
  const left = Z && Z.harmOK ? src.overlap.filter((o) => o.modis < 50).map((o) => o.year) : [];
  const q = Z ? quietYears(Z) : null;
  const zoneTag = Z ? <span>{zoneName} · <span className="at-mono">{boxText(Z.box)}</span></span> : null;
  return (
    <section className="fb-section fb-story" id="how" aria-labelledby="fb-how-t">
      <div className="fb-section-head">
        <h2 className="fb-section-title" id="fb-how-t">How it works</h2>
        <Segmented size="sm" ariaLabel="Example zone" value={ex} onChange={setEx} options={opts} />
      </div>
      {!Z ? <div className="fb-step-skel" aria-hidden="true" /> : (
        <>
          <Step phone={phone} id="step-problem" n="1" name="The problem" zoneName={zoneName} title={s.q} answer={s.a}
            chart={(seen) => (
              <>
                <p className="fb-figcap">Detections per year, raw · cell-days, log scale · <i className="fb-dash" aria-hidden="true" /> means 2003–2011 ({NUM(Z.levels.raw.before)}) and 2012–{LAST} ({NUM(Z.levels.raw.after)}): raw {X(Z.riseRaw)}</p>
                <RawBars Z={Z} seen={seen} />
                <div className="st-frieze"><SensorFrieze locale="en" from={SPAN[0]} to={SPAN[1]} covered={[FIRST, LAST]} compact={phone} /></div>
              </>
            )}
            prov={<ProvenanceLine status="real" source="NASA FIRMS" period={'2001–' + LAST}>{zoneTag}</ProvenanceLine>}>
            <p className="fb-step-b">In 2012 the record switched from MODIS (1 km pixels) to VIIRS (375 m), which records about twice as many 1 km cell-days as Terra and Aqua MODIS together. Stitched together raw, the series jumps at the seam.</p>
          </Step>
          <Step phone={phone} slim={!Z.harmOK} id="step-bridge" n="2" name="The bridge" zoneName={zoneName} title={(LAST - SW + 1) + ' years where both sensors fly.'}
            answer={Z.harmOK ? (borrowed ? 'In the wider area, VIIRS records ' + F2(Z.ratio) + '× what MODIS records.' : 'Here VIIRS records ' + F2(Z.ratio) + '× what MODIS records.') : 'Too few detections here to measure it reliably.'}
            chart={() => (Z.harmOK && Z.usable.length ? (
              <>
                <p className="fb-figcap">{borrowed ? 'Wider area ' + boxText(Z.borrowed.box) + ' · ' : ''}Both sensors, year by year · <b>pooled ratio {F2(Z.ratio)}</b> ({F2(Z.rMin)}–{F2(Z.rMax)} leaving one year out)</p>
                <OverlapChart data={{ validation: Object.assign({}, cdValidation, { ratio: Z.ratio, years: [SW, LAST], overlap: Z.usable.map((r) => ({ year: r.year, modis: r.modis, viirs: r.viirs })) }) }} locale="en" />
              </>
            ) : <p className="fb-step-empty"><i className="at-cell at-cell-low" aria-hidden="true" />{Z.own.usable.length} usable overlap {Z.own.usable.length === 1 ? 'year' : 'years'} here (MODIS ≥ 50 cell-days): too few to compare the two sensors.</p>)}
            prov={<ProvenanceLine status="real" source="NASA FIRMS" period={'2012–' + LAST}>{borrowed ? <span>wider area · <span className="at-mono">{boxText(Z.borrowed.box)}</span></span> : zoneTag}</ProvenanceLine>}>
            {Z.harmOK && <p className="fb-step-b">We multiply the MODIS years by that ratio; VIIRS years are left untouched. The ratio pools all {LAST - SW + 1} overlap years{left.length ? '; ' + left.join(', ') + (left.length === 1 ? ' has' : ' have') + ' under 50 MODIS cell-days and ' + (left.length === 1 ? 'is' : 'are') + ' left out of the test' : ''}.</p>}
            {borrowed && <p className="fb-step-b">This box alone has {Z.own.usable.length} usable overlap {Z.own.usable.length === 1 ? 'year' : 'years'}, so the ratio comes from the area around it.</p>}
          </Step>
          <Step phone={phone} id="step-proof" n="3" name="The proof" zoneName={zoneName} title={s.p} answer={null}
            chart={(seen) => <RiseBars Z={Z} big seen={seen} official={official} />}
            prov={<ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–2011 vs 2012–' + LAST}>{reference ? <span>Québec reference zone</span> : null}</ProvenanceLine>}>
            {Z.harmOK ? (
              <ul className="fb-checks">
                <li>Leaving one year out and predicting it{borrowed ? ' (wider area)' : ''}: median error {PCT(Z.medErr)}.</li>
                {official && <li><b>Official area burned {official.after[0]}–{official.after[1]}, independent of both sensors: {X(official.rise)}</b> (ours on the same years: {X(official.harm)}).</li>}
                {cells && (() => {
                  const P = (x) => Math.round(x * 100) + '%', cty = ex === 'larioja' ? 'argentina' : ex === 'canada' ? 'canada' : (Z.box.s < 0 ? 'argentina' : 'canada'), S = cells[cty], s0 = S.summary;
                  const sb = ex === 'canada' ? null : cellSummary(S.cells, S, Z.box);
                  const rs = recordSentence(s0, versus);
                  return <li><b>Record years{cty === 'canada' ? ', Canada' : ', Argentina'}:</b> {rs.head} {rs.chance}. {rs.verdict}{sb && sb.n ? ' In ' + zoneName + ' (' + sb.n + ' places): raw ' + P(sb.sinceRaw) + ', harmonized ' + P(sb.sinceHarm) + '.' : ''} A record is one year, not a trend.</li>;
                })()}
                {Z.trend && <li>{Z.trend.status === 'robust' ? 'The change holds when years are resampled (90% range ' + bootRange(Z.trend) + ') and without ' + Z.trend.bigYear + ' (' + X(Z.trend.without) + ').' : 'The trend is uncertain: ' + X(Z.trend.without) + ' without ' + Z.trend.bigYear + ', 90% range ' + bootRange(Z.trend) + '. The correction factor (' + corrFactor(Z) + ') is not.'}</li>}
                <li className="fb-limit">MODIS alone across the seam gives the same figure by construction; Aqua alone agrees ({X(Z.riseAqua)}). This shows Terra and Aqua agree, not that the bridge is right.</li>
                <li className="fb-limit">The ratio is pulled by big fire years; {q || 'quiet years cannot be tested here'}.</li>
              </ul>
            ) : <p className="fb-step-b">Too few detections here to bridge the two sensors reliably, so only the raw change is shown, and it mixes two sensors.</p>}
          </Step>
        </>
      )}
    </section>
  );
}
