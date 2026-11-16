// Version 6 landing tab: the problem, the answer and the real data in one screen; one primary action (Open the dashboard).
// Every figure comes from the metrics of the whole selected country (the same Z the Dashboard uses for that preset).
import { memo, useEffect, useRef, useState } from 'react';
import { LAST, FIRST, SW, STATS_FROM, endLabel } from './metrics.js';
import { X, F2, NUM, xr, bootRange, overviewHeadline, ratioWords } from './copy.js';
import { formatShort } from '../ds/components/src/scale.js';
import { cx, Icon, IC, reduced } from './util.jsx';
import { endLabelL, tm } from './l10n.js';

const NAME = { canada: 'Canada', argentina: 'Argentine' };
const LE = { canada: 'le Canada', argentina: 'l’Argentine' }; // with its article ("pour le Canada", "pour l’Argentine")

// Annual bars 2001..LAST on a linear scale (the gap between the raw and harmonized 2003–2011 levels is a factor of
// ~2: a log scale would compress it). Harmonized solid; raw as a hollow outline where it differs (MODIS years, before
// 2012); from 2012 both records are the same VIIRS measurement. Raw view: raw solid, harmonized outline.
function OverviewChart({ Z, raw, country, animate, phone }) {
  const years = []; for (let y = FIRST; y <= LAST; y++) years.push(y);
  const vH = years.map((y) => Z.annHarm(y)), vR = years.map((y) => Z.annRaw(y));
  const top = Math.max(...vH, ...vR) * 1.08;
  const step = Math.pow(10, Math.floor(Math.log10(top / 4))), nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => top / s <= 5) || step * 10;
  const ticks = []; for (let t = 0; t <= top; t += nice) ticks.push(t);
  const P = (v) => (v / top) * 100;
  const n = years.length, col = (i) => (i / n) * 100, cw = 100 / n;
  const L = Z.levels, solid = raw ? 'raw' : 'harmonized';
  const seamX = col(SW - FIRST);
  const label = NAME[country] + ', activité des feux par an ' + STATS_FROM + '–' + LAST + ' (cellules-jours avec point chaud détecté). Moyenne par an 2003–2011 : ' + NUM(L.harmonized.before) + ' harmonisée, ' + NUM(L.raw.before) + ' brute ; 2012–' + LAST + ' : ' + NUM(L.harmonized.after) + '. Changement : harmonisé ' + X(Z.riseH) + ', brut ' + X(Z.riseRaw) + ' ; le ratio entre capteurs est de ' + F2(Z.ratio) + '.';
  return (
    <figure className={cx('fb-ov-chart', animate && 'is-anim', raw && 'is-raw')} role="img" aria-label={label}>
      <div className="fb-ov-plot">
        <div className="fb-ov-y" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ bottom: P(t) + '%' }}>{t ? (t >= 1000 ? String(t / 1000).replace('.', ',') + ' k' : String(t)) : '0'}</span>)}</div>
        <div className="fb-ov-area" aria-hidden="true">
          {ticks.map((t) => <i key={t} className="fb-ov-grid" style={{ bottom: P(t) + '%' }} />)}
          {years.map((y, i) => {
            const s = raw ? vR[i] : vH[i], o = raw ? vH[i] : vR[i];
            const differs = y < SW || (y === SW);
            return (
              <span key={y} className={cx('fb-ov-col', y < STATS_FROM && 'is-era', y >= SW && 'is-viirs')} style={{ left: col(i) + '%', width: cw + '%' }}>
                <i className="fb-ov-bar" style={{ height: P(s) + '%', animationDelay: (i * 8) + 'ms' }} />
                {differs && Math.abs(o - s) / Math.max(1, s) > 0.02 && <i className="fb-ov-ghost" style={{ height: P(o) + '%' }} />}
              </span>
            );
          })}
          <i className="fb-ov-seam" style={{ left: seamX + '%' }}><em>changement de satellite</em></i>
          <i className="fb-ov-level is-before" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[solid].before) + '%' }}><em>{NUM(L[solid].before)}</em></i>
          <i className="fb-ov-level is-ghost" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[raw ? 'harmonized' : 'raw'].before) + '%' }}><em>{raw ? 'harmonisée ' : 'brute '}{NUM(L[raw ? 'harmonized' : 'raw'].before)}</em></i>
          <i className="fb-ov-level is-after" style={{ left: seamX + '%', width: (100 - seamX) + '%', bottom: P(L[solid].after) + '%' }}><em>{NUM(L[solid].after)}</em></i>
        </div>
      </div>
      <div className="fb-ov-x" aria-hidden="true"><span />{(phone ? [FIRST, SW, LAST] : [FIRST, 2005, SW, 2018, LAST]).map((y) => <span key={y} style={{ left: (col(y - FIRST) + cw / 2) + '%' }}>{y}</span>)}</div>
    </figure>
  );
}

// Two labels in one grid cell (only the one for the current state visible): the key keeps its width when the view
// changes, so a click on the raw button never re-wraps the row under the chart.
const Two = ({ on, a, b }) => <span className="fb-ov-holdlab is-l"><span className={cx(!on && 'is-on')}>{a}</span><span className={cx(on && 'is-on')}>{b}</span></span>;

// The raw-record button behaves like the top-bar Raw/Harmonized switch: a short press (click, tap, Enter or Space)
// switches the record shown everywhere; a press held 260 ms or more from the harmonized record only peeks at the raw
// one while held (mouse, pen, keyboard; touch toggles). Both labels sit in one grid cell, so the width never changes.
function RawButton({ raw, peek, phone, onPeek, onToggleView }) {
  const viewRaw = raw && !peek; // the raw record chosen (not a peek)
  const down = useRef(false), t0 = useRef(0); // t0: start of a press that peeks (0: a press that does not peek)
  const start = (canPeek) => { down.current = true; t0.current = 0; if (canPeek && !viewRaw) { t0.current = performance.now(); onPeek(true); } };
  const finish = (cancel) => {
    if (!down.current) return;
    down.current = false;
    const t = t0.current; t0.current = 0;
    if (t) { if (!cancel && performance.now() - t < 260) onToggleView(); onPeek(false); } // same order as the top-bar switch
    else if (!cancel) onToggleView();
  };
  useEffect(() => { const b = () => finish(true); window.addEventListener('blur', b); return () => window.removeEventListener('blur', b); });
  // Short desktop labels: a longer button pushed the chart key onto a second row in one state only (a layout shift).
  const labels = phone ? ['Touchez pour voir la série brute', 'Touchez pour la série harmonisée'] : ['Voir la série brute', 'Revenir à l’harmonisé'];
  return (
    <button type="button" className="fb-ov-holdbtn" aria-pressed={raw} title={phone ? undefined : viewRaw ? 'Cliquez pour revenir à la série harmonisée (ou appuyez sur H)' : 'Cliquez pour passer à la série brute ; maintenez pour la voir un instant (ou maintenez R)'}
      onPointerDown={(e) => { if (e.button !== 0) return; if (e.pointerType !== 'touch') e.currentTarget.setPointerCapture(e.pointerId); start(e.pointerType !== 'touch'); }}
      onPointerUp={() => finish(false)} onPointerCancel={() => finish(true)} onLostPointerCapture={() => finish(true)}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(true); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); finish(false); } }}>
      <Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <span className="fb-ov-holdlab">{labels.map((l, i) => <span key={i} className={cx((i === 1) === viewRaw && 'is-on')}>{l}</span>)}</span>
    </button>
  );
}

export const Overview = memo(function Overview({ Z, country, official, raw, peek, onCountry, onPeek, onToggleView, onOpen, onHow, onMethod, phone }) {
  // Load animation: once per mount, never under reduced motion or anim=0.
  const [anim, setAnim] = useState(() => !reduced());
  useEffect(() => { const t = setTimeout(() => setAnim(false), 900); return () => clearTimeout(t); }, []);
  const name = NAME[country];
  if (!Z) return <div className="fb-ov is-skel" aria-hidden="true"><div className="fb-ov-chart" /></div>;
  const head = overviewHeadline(name, Z.riseH, Z.riseRaw);
  const T = Z.trend;
  return (
    <div className="fb-ov">
      <div className="fb-ov-top">
        <p className="fb-ov-eyebrow">Satellites de feux de la NASA · le changement de 2012</p>
        <div className="fb-seg2 fb-ov-country" role="radiogroup" aria-label="Pays">
          {['canada', 'argentina'].map((c) => <button key={c} type="button" role="radio" aria-checked={country === c} className={cx('fb-seg2-i', country === c && 'is-on')} onClick={() => onCountry(c)}>{tm(c === 'canada' ? 'All of Canada' : 'All of Argentina')}</button>)}
        </div>
      </div>
      {/* v6.1: on the phone the figures and the primary button come before the chart (visible without scrolling at
          390×844 and 360×740); the lede and the honest line follow the chart. Desktop order unchanged. */}
      {phone ? <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Année moyenne 2012–{LAST} vs 2003–2011, en comptant les carrés de 1 km avec du feu, jour par jour.</p>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>harmonisé <span className="fb-ov-gl">(les deux sur une même échelle)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s" title={T && T.lo != null ? 'Plage à 90 % : où tombe le résultat quand les années sont rééchantillonnées au hasard ; plus elle est large, moins c’est sûr.' : undefined}>{T && T.lo != null ? 'Plage à 90 % ' + bootRange(T) + ' · ' + xr(T.without) + ' sans ' + T.bigYear + (phone ? '' : ', son année record') : ''}</dd></div>
          <div><dt>brut</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">les deux séries simplement mises bout à bout</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Vérification indépendante</b> · superficie brûlée officielle {official.after[0]}–{official.after[1]} : <b>{X(official.rise)}</b> (notre résultat sur les mêmes années : {X(official.harm)}) · une autre grandeur</>
          : <>Aucune série officielle indépendante pour {LE[country]} : ce résultat repose sur la seule série MODIS.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Ouvrir le calendrier et la carte<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>Fonctionnement</button>
        <button type="button" className="at-link" onClick={onMethod}>Méthode</button>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <RawButton raw={raw} peek={peek} phone={phone} onPeek={onPeek} onToggleView={onToggleView} />
        {phone ? <span className="fb-muted" /> : <span className="fb-muted fb-ov-holdlab"><span className={cx(!(raw && !peek) && 'is-on')}>ou maintenez R</span><span className={cx(raw && !peek && 'is-on')}>ou appuyez sur H</span></span>}
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" /><Two on={raw} a="série harmonisée" b="série brute (affichée)" /></span>
      <span><i className="fb-ov-k is-ghost" /><Two on={raw} a="brute, avant 2012" b="harmonisée, avant 2012" /></span>
      <span title="Janvier 2012 est un mois VIIRS partiel : la série harmonisée le calcule à partir de MODIS, d’où une moyenne après 2012 légèrement différente de celle de la série brute."><i className="fb-ov-k is-level" />moyenne par an</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" /><Two on={raw} a="moyenne brute, avant 2012" b="moyenne harmonisée, avant 2012" /></span>}
      <span className="fb-muted">détections de feux par an</span>
        </div>
      </div>
      <div className="fb-ov-head is-lede">
        <div>
          <p className="fb-ov-lede">Depuis 2012, la NASA observe les feux avec un second capteur plus fin, VIIRS, qui voit {ratioWords(Z.ratio)} de détections de feux que MODIS. Les deux volent ensemble depuis : FireBridge mesure donc l’écart et le corrige.</p>
          <p className="fb-ov-honest">La correction compte mois par mois (calendrier, rangs) et après la fin de MODIS. Pour ce seul chiffre avant/après, MODIS seul donne la même réponse, par construction.</p>
        </div>
      </div>
      <div className="fb-ov-act is-foot">
        <p className="fb-ov-foot fb-def">Activité des feux = cellules-jours avec point chaud détecté (cellules de 1 km avec du feu, par jour), pas la superficie brûlée · NASA FIRMS MODIS C6.1 et VIIRS 375 m, de 2001 à {endLabelL()} · Fonctionne hors ligne : aucune donnée ne quitte cette page · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </> : <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Année moyenne 2012–{LAST} vs 2003–2011, en comptant les carrés de 1 km avec du feu, jour par jour.</p>
        </div>
        <div>
          <p className="fb-ov-lede">Depuis 2012, la NASA observe les feux avec un second capteur plus fin, VIIRS, qui voit {ratioWords(Z.ratio)} de détections de feux que MODIS. Les deux volent ensemble depuis : FireBridge mesure donc l’écart et le corrige.</p>
          <p className="fb-ov-honest">La correction compte mois par mois (calendrier, rangs) et après la fin de MODIS. Pour ce seul chiffre avant/après, MODIS seul donne la même réponse, par construction.</p>
        </div>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <RawButton raw={raw} peek={peek} phone={phone} onPeek={onPeek} onToggleView={onToggleView} />
        {phone ? <span className="fb-muted" /> : <span className="fb-muted fb-ov-holdlab"><span className={cx(!(raw && !peek) && 'is-on')}>ou maintenez R</span><span className={cx(raw && !peek && 'is-on')}>ou appuyez sur H</span></span>}
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" /><Two on={raw} a="série harmonisée" b="série brute (affichée)" /></span>
      <span><i className="fb-ov-k is-ghost" /><Two on={raw} a="brute, avant 2012" b="harmonisée, avant 2012" /></span>
      <span title="Janvier 2012 est un mois VIIRS partiel : la série harmonisée le calcule à partir de MODIS, d’où une moyenne après 2012 légèrement différente de celle de la série brute."><i className="fb-ov-k is-level" />moyenne par an</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" /><Two on={raw} a="moyenne brute, avant 2012" b="moyenne harmonisée, avant 2012" /></span>}
      <span className="fb-muted">détections de feux par an</span>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>harmonisé <span className="fb-ov-gl">(les deux sur une même échelle)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s" title={T && T.lo != null ? 'Plage à 90 % : où tombe le résultat quand les années sont rééchantillonnées au hasard ; plus elle est large, moins c’est sûr.' : undefined}>{T && T.lo != null ? 'Plage à 90 % ' + bootRange(T) + ' · ' + xr(T.without) + ' sans ' + T.bigYear + (phone ? '' : ', son année record') : ''}</dd></div>
          <div><dt>brut</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">les deux séries simplement mises bout à bout</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Vérification indépendante</b> · superficie brûlée officielle {official.after[0]}–{official.after[1]} : <b>{X(official.rise)}</b> (notre résultat sur les mêmes années : {X(official.harm)}) · une autre grandeur</>
          : <>Aucune série officielle indépendante pour {LE[country]} : ce résultat repose sur la seule série MODIS.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Ouvrir le calendrier et la carte<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>Fonctionnement</button>
        <button type="button" className="at-link" onClick={onMethod}>Méthode</button>
        <p className="fb-ov-foot fb-def">Activité des feux = cellules-jours avec point chaud détecté (cellules de 1 km avec du feu, par jour), pas la superficie brûlée · NASA FIRMS MODIS C6.1 et VIIRS 375 m, de 2001 à {endLabelL()} · Fonctionne hors ligne : aucune donnée ne quitte cette page · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </>}
    </div>
  );
});
