// The verdict card (SPEC §4): zone, one number, its clause and sentence, three bars around 1×, the proof line.
import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { formatDecimal } from '../ds/components/src/scale.js';
import { X, F2, PCT, xr, clause, sentence, gradeRule, whyC, boxText, bootRange, corrFactor, uncertainSentence, withoutLine, shortSentence, factorClause, plainSentence } from './copy.js';
import { Pop } from './ui.jsx';
import { cx, Icon, IC, useSize } from './util.jsx';
import { LAST, CAL_LAST } from './metrics.js';
import { dec } from './l10n.js';
import { guardFr } from './guard.js';
// "hors du Canada" / "hors de l’Argentine" (the country name comes from App.jsx, English or French).
const deC = (c) => (c === 'Canada' ? 'du Canada' : c === 'Argentine' || c === 'Argentina' ? 'de l’Argentine' : 'de ' + c);

/* ───────── three rises on one log scale around 1× ───────── */
export function RiseBars({ Z, intro = false, big = false, seen = true, official = null, under = false, noAqua = false }) {
  // under: secondary text (range, our figure) goes on its own line under the label, so the value column never wraps (rail).
  const axisRef = useRef(null);
  const trackW = useSize(axisRef, { w: 260, h: 20 }).w;
  const C = !Z.harmOK;
  const borrowed = Z.gradeWhy === 'borrowed';
  const rows = [{ k: 'raw', label: 'Brut', sub: C ? 'les deux séries simplement mises bout à bout, non comparables de part et d’autre de 2012' : 'les deux séries simplement mises bout à bout', v: Z.riseRaw, val: X(Z.riseRaw) }];
  if (!C && Z.guard) rows.push({ k: 'harm', label: 'Harmonisé', sub: 'non donné : ' + guardFr(Z.guard), v: null, val: '—', note: 'non donné pour cette zone' });
  else if (!C) {
    rows.push({ k: 'harm', label: 'Harmonisé', sub: 'sur une même échelle (ancien satellite × ' + F2(Z.ratio) + (borrowed ? ', zone élargie)' : ')'), v: Z.riseH, val: X(Z.riseH), range: Z.trend ? '(plage à 90 % ' + bootRange(Z.trend) + ')' : null, rangeLabel: 'plage à 90 % par rééchantillonnage des années' });
    if (!noAqua) rows.push({ k: 'aqua', label: 'Aqua seul', sub: 'un seul ancien satellite : une vérification de cohérence', v: Z.riseAqua, val: X(Z.riseAqua) });
    if (official) rows.push({ k: 'off', label: 'Superficie brûlée officielle', sub: 'Base nationale de données sur les forêts, ' + official.after[0] + '–' + official.after[1] + ' · indépendante des deux capteurs', v: official.rise, val: X(official.rise), range: 'le nôtre, mêmes années : ' + X(official.harm), rangeLabel: 'notre changement harmonisé sur les mêmes années' });
  }
  // One common log scale; the longest bar on each side of 1× reaches ~80% of that side; 1× is placed by the data.
  // Clamp: any value beyond 50× either way is drawn at the edge (its number is printed), so nothing leaves the card.
  const Ls = rows.map((r) => r.v).filter((x) => x != null && x > 0 && isFinite(x)).map((x) => Math.max(Math.log(1 / 50), Math.min(Math.log(50), Math.log(x))));
  const up = Math.max(0, ...Ls), down = Math.min(0, ...Ls);
  let hiL = up > 0 ? up / 0.8 : 0, loL = down < 0 ? down / 0.8 : 0;
  const total = Math.max(hiL - loL, Math.log(1.5));
  if (loL === 0) loL = -0.06 * total; // all rises: 1× near the left, a little room for the line
  if (hiL === 0) hiL = 0.06 * total; // all declines: 1× near the right
  const P = (v) => Math.max(0, Math.min(100, ((Math.log(Math.max(v, 1e-6)) - loL) / (hiL - loL)) * 100));
  const lo = Math.exp(loL), hi = Math.exp(hiL);
  const x1 = P(1);
  // One reference label at the top of the 1× line, written towards the side with room; other tick labels only where they cannot collide.
  // Room taken by the "1× no change" label, measured on the track (the 4× tick used to touch it, SPEC_V3 §6b).
  const span = Math.min(80, ((big ? 104 : 92) / Math.max(120, trackW)) * 100), toRight = x1 <= 55;
  const ticks = [0.25, 0.5, 2, 4, 8, 16].filter((t) => t > lo * 1.08 && t < hi / 1.08);
  const shownTicks = C ? [] : ticks.filter((t) => { const x = P(t); return toRight ? (x < x1 - 8 || x > x1 + span + 4) : (x > x1 + 8 || x < x1 - span - 4); });
  const shown = (r) => (r.k === 'harm' && (intro || !seen) ? Z.riseRaw : r.v);
  return (
    <div className={cx('fb-bars', big && 'is-big', C && 'is-c', rows.length > 3 && 'has-4')} role="list" aria-label="Activité des feux après 2012 comparée à avant, de trois façons, sur une échelle log autour de 1× (aucun changement)">
      <div className="fb-bars-axis" aria-hidden="true">
        <span />
        <span className="fb-track" ref={axisRef}>
          {shownTicks.map((t) => <span key={t} className="fb-tick" style={{ left: P(t) + '%' }}>{dec(t, t < 1 ? (t === 0.25 ? 2 : 1) : 0) + '×'}</span>)}
          <span className={cx('fb-tick is-one', toRight ? 'to-right' : 'to-left')} style={{ left: x1 + '%' }}>1× inchangé</span>
        </span>
        <span />
      </div>
      {rows.map((r) => {
        if (r.v == null || !isFinite(r.v)) return (
          <div key={r.k} className={cx('fb-bar-row', 'is-' + r.k)} role="listitem" aria-label={r.label + ' : ' + (r.note || 'aucune détection avant 2012, pas de ratio')}>
            <span className="fb-bar-label"><b>{r.label}</b><span>{r.sub}</span></span>
            <span className="fb-track fb-track-note">{r.note || 'aucune détection avant 2012'}</span>
            <span className="fb-bar-val">—</span>
          </div>
        );
        const xv = P(shown(r)), left = Math.min(xv, x1), w = Math.abs(xv - x1);
        const hidden = r.k === 'aqua' && (intro || !seen);
        return (
          <div key={r.k} className={cx('fb-bar-row', 'is-' + r.k, hidden && 'is-hidden')} role="listitem" aria-label={r.label + ' (' + r.sub + ') : ' + r.val + (r.range ? ' ' + r.range : '')}>
            <span className="fb-bar-label"><b>{r.label}</b><span>{r.sub}</span>{under && r.range && <span className="fb-rng-under">{r.range.replace(/^\((.*)\)$/, '$1')}</span>}</span>
            <span className="fb-track" aria-hidden="true">
              {ticks.map((t) => <i key={t} className="fb-grid" style={{ left: P(t) + '%' }} />)}
              <i className="fb-grid is-one" style={{ left: x1 + '%' }} />
              {r.k === 'off' ? <><i className="fb-stem" style={{ left: left + '%', width: Math.max(w, 0.8) + '%' }} /><i className="fb-offmark" style={{ left: xv + '%' }} /></> : <i className="fb-bar" style={{ left: left + '%', width: Math.max(w, 0.8) + '%' }} />}
            </span>
            <span className="fb-bar-val" aria-hidden="true">{r.val}{r.range && !under && <span className="fb-rng">{r.range}</span>}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── mini-map: the country silhouette with the zone ───────── */
// Status pill: tint + icon + words, so colour is never the only carrier (success / warning / neutral tokens in v5.css).
const ST_ICON = { success: 'M5 12.5l4.5 4.5L19 7.5', warning: 'M12 4l9 16H3zM12 10v4.5M12 17.4v.1', neutral: 'M6 12h12' };
export function Pill({ tone = 'neutral', children, title }) {
  return <span className={cx('fb-pill', 'is-' + tone)} title={title}><Icon d={ST_ICON[tone]} />{children}</span>;
}
const gradeTone = (Z) => (Z.notHarm ? 'neutral' : Z.grade === 'A' ? 'success' : Z.grade === 'B' ? 'warning' : 'neutral');
const r1 = (x) => Math.round(x * 10) / 10; // the one-decimal rounding of copy.js (verdict cases: rise ≥ 1.15, decline ≤ 0.9)
const gradeWords = (Z) => (Z.notHarm ? 'Non harmonisé · ratio au-dessus de 4×' : Z.grade === 'A' ? 'Correction A · fiable' : Z.grade === 'B' ? 'Correction B · ' + (Z.gradeWhy === 'borrowed' ? 'empruntée' : 'correcte') : 'Non harmonisé');

// The quality pill; its popover gives the rule in plain language.
export function GradeMark({ Z, onMethod }) {
  if (!Z || Z.empty) return null;
  const borrowed = Z.gradeWhy === 'borrowed', words = gradeWords(Z), tone = gradeTone(Z);
  return (
    <Pop id="fb-grade-pop" ariaLabel={words + '. Ce que cela signifie'} title={Z.notHarm ? 'Pas mis sur une même échelle : les deux satellites diffèrent trop ici.' : Z.grade === 'A' ? 'Fiable : les deux satellites concordent bien, année après année, dans cette zone.' : Z.grade === 'B' ? 'Correcte : la correction fonctionne ici, mais elle est moins précise' + (borrowed ? ' (empruntée à une zone plus large).' : '.') : 'Trop peu d’années vues par les deux satellites pour les mettre ici sur une même échelle.'} btnClass={cx('fb-pill', 'is-' + tone, 'is-btn', 'fb-grade-pill')} panelClass="fb-pop-note" align="start"
      label={<><Icon d={ST_ICON[tone]} />{words}</>}>
      {(close) => (
        <>
          <p><b>{words}.</b> Dans quelle mesure MODIS et VIIRS peuvent être raccordés dans cette zone. Cette note porte sur l’harmonisation, pas sur la tendance.</p>
          <p>{gradeRule(Z)}</p>
          {borrowed && <p>La zone est trop petite pour avoir son propre ratio : {F2(Z.ratio)} vient de <span className="at-mono">{boxText(Z.borrowed.box)}</span>.</p>}
          <button type="button" className="at-link" onClick={() => { close(); onMethod(); }}>Méthode <Icon d={IC.arrow} /></button>
        </>
      )}
    </Pop>
  );
}
// Rail ladder: one compact chart, label left, value right, one shared log axis around a labelled 1× line; 28–32 px rows,
// no secondary text (ranges and definitions are in each row's tooltip and in Evidence).
function Ladder({ Z, official }) {
  const rows = [['Brut', Z.riseRaw, 'is-raw', 'MODIS, puis VIIRS, brut'], ['Harmonisé', Z.riseH, 'is-harm', 'MODIS × ' + F2(Z.ratio) + ' avant 2012' + (Z.trend ? ' ; années rééchantillonnées, plage à 90 % ' + bootRange(Z.trend) : '')], ['Aqua seul', Z.riseAqua, 'is-aqua', 'Un satellite MODIS qui ne change pas de capteur en 2012 (même famille de capteurs que MODIS : une vérification de cohérence, pas une preuve que le raccord est juste)']];
  if (official) rows.push(['Aire brûlée ' + official.after[0] + '–' + String(official.after[1]).slice(2), official.rise, 'is-off', 'Superficie brûlée officielle, Base nationale de données sur les forêts ' + official.after[0] + '–' + official.after[1] + ' ; notre calcul sur les mêmes années : ' + X(official.harm)]);
  const vs = rows.map((r) => r[1]).filter((v) => v > 0 && isFinite(v));
  const lo = Math.min(1, ...vs) / 1.15, hi = Math.max(1, ...vs) * 1.15;
  const P = (v) => ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 100;
  return (
    <div className="fb-ladder" role="list" aria-label="Activité des feux après 2012 vs avant, sur une échelle log autour de 1× (aucun changement)">
      <div className="fb-ladder-axis" aria-hidden="true"><span /><span className="fb-ladder-tr"><i style={{ left: P(1) + '%' }}>1× inchangé</i></span><span /></div>
      {rows.filter((r) => r[1] > 0 && isFinite(r[1])).map(([k, v, c, tip]) => (
        <div key={k} className={cx('fb-ladder-row', c)} role="listitem" title={k + ' : ' + X(v) + '. ' + tip} aria-label={k + ' : ' + X(v)}>
          <span className="fb-ladder-k">{k}</span>
          <span className="fb-ladder-tr" aria-hidden="true"><i className="fb-ladder-one" style={{ left: P(1) + '%' }} />{c === 'is-off' ? <i className="fb-ladder-dia" style={{ left: P(v) + '%' }} /> : <i className="fb-ladder-bar" style={{ left: Math.min(P(v), P(1)) + '%', width: Math.max(0.8, Math.abs(P(v) - P(1))) + '%' }} />}</span>
          <span className="fb-ladder-v">{X(v)}</span>
        </div>
      ))}
    </div>
  );
}

// One line under the answer (the long uncertain sentence moves to Evidence).
const answerLine = (Z) => plainSentence(Z); // v6.2 (P2): plain words; the exact figures stay in the hero, the tooltips and Evidence

/* ───────── the verdict: three zones (Zone · Answer · Checks); strip (1280–1679), rail (≥ 1680) or card (< 1280) ───────── */
// The rail never scrolls and nothing is covered: lowest-priority blocks drop out (not shrink) until it fits — (1) the range
// note, (2) the ladder, (3) the coordinates, (4) the sentence under the hero. Measured after layout and on resize.
function useFit(ref, on, deps) {
  const [drop, setDrop] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !on) return undefined;
    const fit = () => {
      // Fits when nothing overflows the rail and the last block ends ≥ 12 px above the pinned button.
      const bad = () => {
        if (el.scrollHeight > el.clientHeight + 1) return true;
        const act = el.querySelector('.fb-vact'), vb = el.querySelector('.fb-vbars');
        if (!act || !vb || vb.offsetParent === null) return false;
        const kids = [...vb.children].filter((c) => c.offsetParent !== null);
        const last = kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom : vb.getBoundingClientRect().top;
        const first = kids.length ? kids[0].getBoundingClientRect().top : 0;
        return last > act.getBoundingClientRect().top - 12 || first < vb.getBoundingClientRect().top - 1;
      };
      let d = 0; el.dataset.drop = '0';
      while (d < 4 && bad()) { d++; el.dataset.drop = String(d); }
      setDrop(d);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, deps);
  return drop;
}

export function Verdict({ variant = 'strip', wide = false, Z, box, zoneName, official, cover, country, rawView, onEvidence, onMethod, onLarger, onPicker, onNearest }) {
  const question = 'Hausse réelle ou effet du satellite ?';
  const root = useRef(null);
  useFit(root, variant === 'rail', [variant, Z, box && box.s, box && box.e, official, rawView]);
  const outside = cover && cover.inside === 0;
  const card = variant === 'card';
  const zone = (
    <div className="fb-vz fb-vz-zone">
      {!card && <p className="fb-eyebrow">Zone</p>}
      <h2 className="fb-zone-name" title={zoneName}><Icon d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /><span>{zoneName}</span></h2>
      {!card && <span className="at-mono fb-zone-box" title="La zone : limites de latitude et de longitude">{boxText(box)}</span>}
      <div className="fb-vz-status">{Z && !Z.empty && !outside ? <GradeMark Z={Z} onMethod={onMethod} /> : <span className="fb-pill is-ghost" aria-hidden="true">&nbsp;</span>}</div>
      {cover && cover.foreign > 0 && !outside && <span className="fb-border-warn" title={'Une partie de cette zone est hors ' + deC(country) + ' : seule la partie à l’intérieur est comptée.'}>En partie hors {deC(country)}</span>}
    </div>
  );
  const evBtn = <button type="button" className="fb-evbtn" onClick={onEvidence}>{card ? 'Preuves' : 'Voir les preuves'}<Icon d={IC.arrow} /></button>;
  if (!Z || Z.empty || outside) {
    return (
      <section ref={root} className={cx('fb-verdict2', 'is-' + variant, wide && 'is-wide', 'is-empty')} aria-label="Verdict">
        {zone}
        <div className="fb-vz fb-vz-answer">
          <p className="fb-eyebrow">{question}</p>
          {!Z ? <div className="fb-answer is-skel" aria-hidden="true"><i className="fb-skel-num" /></div> : (
            <>
              <p className="fb-empty-t">{outside ? 'Aucune donnée ici : cette zone est hors ' + deC(country) + '.' : 'Aucune détection dans cette zone, 2001–' + CAL_LAST + '.'}</p>
              <p className="fb-vsent">{outside ? 'Les séries ne couvrent que le Canada et l’Argentine.' : 'Aucune de ses ' + (cover ? cover.inside : Math.round((box.n - box.s) * 2) * Math.round((box.e - box.w) * 2)) + ' cases (carrés de 0,5°) n’a eu de feu vu par l’un ou l’autre satellite.'}</p>
            </>
          )}
        </div>
        {wide && variant === 'strip' && <div className="fb-vz fb-vz-ladder" aria-hidden="true" />}
        <div className="fb-vz fb-vz-checks">
          {!card && <p className="fb-eyebrow">Tests</p>}
          <div className="fb-vrow-checks"><Pill tone="neutral">{outside ? 'Aucune donnée à vérifier' : 'Rien à vérifier'}</Pill></div>
          <div className="fb-vact">{Z && (outside ? <button type="button" className="fb-evbtn" onClick={onNearest}>Plus proches<Icon d={IC.arrow} /></button> : <button type="button" className="fb-evbtn" onClick={onLarger}>Zone plus grande<Icon d={IC.arrow} /></button>)}</div>
        </div>
      </section>
    );
  }
  const harm = Z.harmOK, T = Z.trend, uncertain = harm && T && T.status === 'uncertain';
  // Checks: at most two chips on one line, generated; everything else lives in Evidence.
  const checks = [];
  if (harm && official) {
    const close = Math.abs(official.harm / official.rise - 1) <= 0.1;
    checks.push(close
      ? <Pill key="off" tone="success" title={'Base nationale de données sur les forêts, ' + official.after[0] + '–' + official.after[1] + ', indépendante des deux capteurs : ' + X(official.rise) + ' ; notre calcul sur les mêmes années : ' + X(official.harm) + ' (mêmes années : ' + X(official.harm) + ').'}>{card ? 'Officiel : ' + X(official.rise) : 'Concorde avec l’officiel ' + official.after[0] + '–' + official.after[1] + ' (' + X(official.rise) + ')'}</Pill>
      : <Pill key="off" tone="warning" title={'Superficie brûlée officielle, Base nationale de données sur les forêts, ' + official.after[0] + '–' + official.after[1] + ', indépendante des deux capteurs.'}>Superficie officielle {X(official.rise)} · la nôtre {X(official.harm)}</Pill>);
  }
  if (harm && Z.guard) checks.push(<Pill key="g" tone="neutral" title={'Aucune hausse affichée : ' + guardFr(Z.guard) + '.'}>{Z.guardCheck || 'Trop peu de données pour une tendance'}</Pill>);
  else if (harm && T) {
    const flips = (Z.riseH - 1) * (T.without - 1) < 0 && Math.abs(Math.log(T.without)) > Math.log(1.02);
    const tone = flips ? 'warning' : T.status === 'robust' ? 'success' : 'neutral';
    checks.push(<Pill key="wo" tone={tone} title={'Le changement recalculé sans ' + T.bigYear + ', l’année record' + (flips ? ' : le sens change.' : ' : le sens tient.') + ' Années rééchantillonnées : plage à 90 % ' + bootRange(T) + '.'}>{flips ? 'S’inverse sans' : T.status === 'robust' && r1(Z.riseH) >= 1.15 && T.without > 1 ? 'Toujours en hausse sans' : T.status === 'robust' && r1(Z.riseH) <= 0.9 && T.without < 1 ? 'Toujours en baisse sans' : 'Sans'} {T.bigYear} : {xr(T.without)}</Pill>);
  }
  let answer, label;
  if (uncertain) {
    label = 'facteur de correction';
    answer = (
      <div className="fb-vrow-hero">
        <span className="fb-num is-factor" title={'÷ ' + dec(Z.ratio, 1) + ' : mettre simplement les deux séries bout à bout donne ici ' + dec(Z.ratio, 1) + '× trop haut. La tendance elle-même est trop incertaine pour afficher une hausse.'}><span className="fb-div" aria-hidden="true">÷</span>{dec(Z.ratio, 1)}</span>{/* no visible "correction" label: with the guard pill it wrapped the hero onto two rows (strip overflow at 1366–1440); the eyebrow says "correction factor" */}
        <span className="fb-ba"><span className="fb-pill is-hollow">Brut {corrFactor(Z)} trop haut</span><Pill tone="warning" title={uncertainSentence(Z)}>{Z.guard ? (Z.guardPill || 'Pas de tendance : peu de feux') : 'Tendance incertaine'}</Pill></span>
      </div>
    );
  } else if (harm && !rawView) {
    label = 'activité des feux après 2012 vs avant';
    answer = (
      <div className="fb-vrow-hero">
        <span className="fb-pill is-hollow" title="Brut : les deux séries simplement mises bout à bout, sans correction">Brut {X(Z.riseRaw)}</span>
        <Icon d={IC.arrow} />
        <span className="fb-num">{X(Z.riseH)}</span><span className="fb-numlab">harmonisé</span>
      </div>
    );
  } else if (harm) {
    label = 'activité des feux après 2012 vs avant';
    answer = (
      <div className="fb-vrow-hero is-raw">
        <span className="fb-num">{X(Z.riseRaw)}</span><span className="fb-numlab">vue brute</span>
        <Icon d={IC.arrow} />
        <span className="fb-pill is-filled" title={'Harmonisé : les deux satellites sur une même échelle (l’ancien × ' + F2(Z.ratio) + ' avant 2012)'}>Harmonisé {X(Z.riseH)}</span>
      </div>
    );
  } else {
    answer = <p className="fb-answer is-c">{Z.notHarm ? 'Non harmonisé ici : ratio entre capteurs au-dessus de 4×.' : 'Trop peu de détections ici pour harmoniser les deux capteurs.'}</p>;
  }
  const live = uncertain ? 'Facteur de correction : les données brutes lisent ' + corrFactor(Z) + ' trop haut ; tendance incertaine.' : harm ? 'Harmonisé : ' + X(Z.riseH) + ' ; brut ' + X(Z.riseRaw) + '.' : 'Non harmonisé.';
  return (
    <section ref={root} className={cx('fb-verdict2', 'is-' + variant, wide && 'is-wide', uncertain && 'is-uncertain', !harm && 'is-c', rawView && 'is-rawview')} aria-labelledby="fb-vq">
      {zone}
      <div className="fb-vz fb-vz-answer">
        <p className="fb-eyebrow" id="fb-vq">{question}{label && <span className="fb-eyebrow-sub"> · {label}</span>}</p>
        <div className="fb-vnum" key={Z.ratio + '|' + Z.riseH + '|' + (box ? [box.s, box.n, box.w, box.e].join() : '')}>
          <span className="sr-only" aria-live="polite">{live}</span>
          <div aria-hidden="true">{answer}</div>
          <p className="fb-vsent" title={answerLine(Z)}>{answerLine(Z)}</p>
        </div>
      </div>
      {wide && variant === 'strip' && (
        <div className="fb-vz fb-vz-ladder">
          <p className="fb-eyebrow">Après 2012 vs avant · même échelle</p>
          {harm && !uncertain ? <Ladder Z={Z} official={official} /> : null}
          {harm && T && !(official && !uncertain) && <p className="fb-ladder-note" title={Z.guard || uncertain ? undefined : 'Harmonisé, années rééchantillonnées : plage à 90 % ' + bootRange(T)}>{Z.guard ? 'Aucune hausse affichée : ' + guardFr(Z.guard) + '.' : uncertain ? 'Harmonisé ' + X(T.rise) + ' ; les années rééchantillonnées donnent ' + bootRange(T) + ' : la tendance est incertaine.' : 'Harmonisé : plage à 90 % ' + bootRange(T)}</p>}
          {!harm && <p className="fb-ladder-note">Non harmonisé ici : le seul changement est le brut, qui mélange deux capteurs.</p>}
        </div>
      )}
      <div className="fb-vz fb-vz-checks">
        {!card && <p className="fb-eyebrow">{rawView && harm ? 'Tests · sur la série harmonisée' : 'Tests'}</p>}
        <div className="fb-vrow-checks" role="group" aria-label="Tests" tabIndex={card ? 0 : undefined}>
          {checks.length ? checks : <Pill tone="neutral" title={whyC(Z)}>Brut seulement : rien à vérifier</Pill>}
        </div>
        <div className="fb-vact">{!harm && <button type="button" className="fb-evbtn is-quiet" onClick={onLarger}>Zone plus grande</button>}{evBtn}</div>
        {variant === 'rail' && harm && !uncertain && <div className="fb-vbars"><Ladder Z={Z} official={official} />{T && <p className="fb-ladder-note">Harmonisé, années rééchantillonnées : plage à 90 % {bootRange(T)}.{official ? ' Superficie brûlée officielle ' + official.after[0] + '–' + official.after[1] + ' : ' + X(official.rise) + ', notre calcul sur ces années : ' + X(official.harm) + '.' : ''}</p>}</div>}
      </div>
    </section>
  );
}
