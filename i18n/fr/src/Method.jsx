import { useRef, useState, useEffect } from 'react';
// Method, checks and limits (SPEC §9.2) and the data sources.
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { RatioStrip } from './Strips.jsx';
import { GRADE_RULES, BORROW, MIN_MODIS, CELL, STATS_FROM, ratioPercentiles, flipCounts, versus, SW, LAST, CAL_LAST, END_KEY, PARTIAL, partialLabel, endLabel } from './metrics.js';
import { F2, PCT, SPCT, NUM, X, gradeRule, boxText, quietYears, bootRange, corrFactor, chanceRange } from './copy.js';
import { num, dec, PS, MONTHS_SHORT_L, cap, endLabelL, partialLabelL, tm } from './l10n.js';
import { cx, Icon, IC } from './util.jsx';

const NB = ' ';
// Decimal comma for a number already printed the English way (toFixed / String): same digits, same rounding.
const dc = (s) => String(s).replace('.', ',').replace(/^-/, '−');
// Log-axis ticks (English: formatShort(t, 'en') → '1k', '10k').
const tick = (t) => (t >= 1000 ? num(t / 1000) + NB + 'k' : num(t));
// guard.js reason texts stay English in the zone object (code compares them); translated here, where they are shown.
function trGuard(s) {
  if (!s || typeof s !== 'string') return s;
  if (s === 'no detections before 2012 to compare with') return 'aucune détection avant 2012 pour comparer';
  let m = s.match(/^only (\d+) fire detections a year before 2012, too few for a baseline \((\d+) needed\)$/);
  if (m) return 'seulement ' + m[1] + ' détections de feux par an avant 2012, trop peu pour une référence (' + m[2] + ' nécessaires)';
  m = s.match(/^Aqua alone reads ([-\d.]+)× and the harmonized record ([-\d.]+)×: they point opposite ways$/);
  if (m) return 'Aqua seul donne ' + dc(m[1]) + '× et la série harmonisée ' + dc(m[2]) + '× : ils vont en sens opposés';
  m = s.match(/^the 90% range \(([-\d.]+)–([-\d.]+)\) spans more than ×(\d+)$/);
  if (m) return 'la plage à 90 % (' + dc(m[1]) + '–' + dc(m[2]) + ') dépasse ×' + m[3];
  return s;
}

export function LooChart({ Z }) {
  const rows = Z.loo;
  const W = 640, H = 260, x0 = 52, x1 = W - 14, y0 = 30, y1 = H - 30;
  const vals = rows.flatMap((r) => [r.viirs, r.predicted]).filter((x) => x > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.min(...vals))))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...vals) * 1.02)));
  const sy = (x) => y1 - ((Math.log10(Math.max(lo, x)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (y1 - y0);
  const sx = (i) => x0 + ((i + 0.5) * (x1 - x0)) / rows.length;
  const ticks = []; for (let t = lo; t <= hi; t *= 10) ticks.push(t);
  const sgn = (e) => SPCT(e);
  return (
    <figure className="fb-loo">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Chaque année de chevauchement utilisable, prédite à partir des autres années (cercle creux), face à la valeur VIIRS mesurée (cercle plein), échelle logarithmique. Erreur médiane : ' + PCT(Z.medErr) + '.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{tick(t)}</text></g>)}
        {rows.map((r, i) => (
          <g key={r.year}>
            <line x1={sx(i)} x2={sx(i)} y1={sy(r.viirs)} y2={sy(r.predicted)} className="fb-loo-gap" />
            <circle cx={sx(i)} cy={sy(r.predicted)} r="6" className="fb-loo-pred"><title>{r.year + ' : prédit ' + NUM(r.predicted) + ' (MODIS ' + NUM(r.modis) + ' × ' + F2(r.ratio) + ')'}</title></circle>
            <circle cx={sx(i)} cy={sy(r.viirs)} r="3.5" className="fb-loo-meas"><title>{r.year + ' : VIIRS mesuré ' + NUM(r.viirs)}</title></circle>
            <text x={sx(i)} y={Math.min(sy(r.viirs), sy(r.predicted)) - 11} textAnchor="middle" className="at-rc-tick fb-loo-err">{sgn(r.signed)}</text>
            {(rows.length <= 10 || i % 2 === 0 || i === rows.length - 1) && <text x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{rows.length > 10 ? '’' + String(r.year).slice(2) : r.year}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-dot is-pred" />prédit : MODIS × le ratio des autres années</span>
        <span><i className="fb-dot is-meas" />VIIRS mesuré</span>
        <span>cellules-jours par an, échelle logarithmique ; étiquette : erreur de la prédiction</span>
      </figcaption>
    </figure>
  );
}

// Official area burned and our cell-days, each indexed to its own 2003–2011 mean (dimensionless, one log axis).
export function IndexChart({ off }) {
  const W = 640, H = 250, x0 = 46, x1 = W - 14, y0 = 16, y1 = H - 30;
  const ys = off.years, n = ys.length;
  const mb = (k) => ys.filter((r) => r.year <= 2011).reduce((s, r) => s + r[k], 0) / 9;
  const S = { area: mb('area'), raw: mb('raw'), harm: mb('harm') };
  const v = (r, k) => r[k] / S[k];
  const all = ys.flatMap((r) => [v(r, 'area'), v(r, 'raw'), v(r, 'harm')]).filter((x) => x > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...all)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all))));
  const sy = (x) => y1 - ((Math.log10(Math.max(lo, x)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (y1 - y0);
  const sx = (i) => x0 + ((i + 0.5) * (x1 - x0)) / n;
  const line = (k) => ys.map((r, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v(r, k)).toFixed(1)).join('');
  const ticks = []; for (let t = lo; t <= hi * 1.001; t *= 10) ticks.push(t);
  const seam = sx(ys.findIndex((r) => r.year === 2012)) - (x1 - x0) / n / 2;
  return (
    <figure className="fb-loo">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Canada, 2003–' + off.after[1] + ' : superficie brûlée officielle et nos cellules-jours, chacune divisée par sa moyenne 2003–2011, échelle logarithmique. Après 2012, la série harmonisée suit la série officielle ; la série brute se situe environ deux fois plus haut.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{t >= 1 ? dec(t, 0) : dec(t, 1)}×</text></g>)}
        <line x1={seam} x2={seam} y1={y0} y2={y1} className="fb-ix-seam" />
        <path d={line('raw')} className="fb-ix-raw" />
        <path d={line('harm')} className="fb-ix-harm" />
        <path d={line('area')} className="fb-ix-area" />
        {ys.map((r, i) => <circle key={r.year} cx={sx(i)} cy={sy(v(r, 'area'))} r="3.5" className="fb-ix-dot"><title>{r.year + ' : ' + NUM(r.area) + ' km² brûlés'}</title></circle>)}
        {ys.map((r, i) => ((i % 3 === 0 || i === n - 1) ? <text key={r.year} x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{r.year}</text> : null))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-ix-k is-area" />superficie brûlée officielle (NFD)</span>
        <span><i className="fb-ix-k is-harm" />cellules-jours harmonisées</span>
        <span><i className="fb-ix-k is-raw" />cellules-jours brutes</span>
        <span>chacune ÷ sa propre moyenne 2003–2011, échelle logarithmique</span>
        {off.rho && <span className="fb-ix-rho" title={'Corrélation de rang de Spearman avec la superficie brûlée officielle, ' + off.rho.from + '–' + off.rho.to + ', n = ' + off.rho.n}>Les années se classent-elles dans le même ordre que la superficie brûlée officielle ? Série harmonisée {dc(off.rho.harm.toFixed(2))}, série brute {dc(off.rho.raw.toFixed(2))}, sur une échelle où 1 est parfait ({off.rho.from}–{off.rho.to}, {off.rho.n} ans). Ce test porte sur l’ordre des années, pas sur leur niveau.</span>}
      </figcaption>
    </figure>
  );
}

const TOC = [['m-how', 'Comment c’est calculé'], ['m-robust', 'Ce qui est robuste'], ['m-limits', 'Limites'], ['m-bymonth', 'Le ratio par mois'], ['m-map', 'Ce que montre la carte'], ['m-faq', 'Questions qu’un expert posera'], ['m-data', 'Données'], ['m-refs', 'Références'], ['m-about', 'À propos et crédits']];
export function Method({ cells, floors, country, phone, Z, zoneName, reference, showOverlap, cdValidation, official, wholeZ, countryName, ratioRange, onEvidence }) {
  const G = GRADE_RULES;
  const docRef = useRef(null);
  const [cur, setCur] = useState(TOC[0][0]);
  useEffect(() => {
    const doc = docRef.current; if (!doc) return undefined;
    const sc = doc.closest('.fb-tabarea') || window;
    const on = () => {
      const top = (sc === window ? 0 : sc.getBoundingClientRect().top) + 80;
      let id = TOC[0][0];
      for (const [k] of TOC) { const el = document.getElementById(k); if (el && el.getBoundingClientRect().top <= top) id = k; }
      setCur(id);
    };
    sc.addEventListener('scroll', on, { passive: true }); on();
    return () => sc.removeEventListener('scroll', on);
  }, []);
  const borrowed = Z && Z.gradeWhy === 'borrowed';
  const q = Z ? quietYears(Z) : null;
  const T = Z && Z.trend;
  // French country names and prepositions (the country key is 'canada' or 'argentina').
  const isAr = country === 'argentina';
  const cn = isAr ? 'Argentine' : 'Canada', inC = isAr ? 'en Argentine' : 'au Canada', forC = isAr ? 'pour l’Argentine' : 'pour le Canada';
  const grades = [
    { g: 'A', rule: 'ratio propre à la zone ; au moins ' + G.A.years + ' années de chevauchement utilisables ; erreur médiane ≤ ' + PCT(G.A.err) + ' ; plage du ratio en retirant une année ≤ ' + PCT(G.A.spread) + ' du ratio.' },
    { g: 'B', rule: 'ratio propre à la zone avec au moins ' + G.B.years + ' années utilisables, erreur ≤ ' + PCT(G.B.err) + ', plage ≤ ' + PCT(G.B.spread) + ' ; ou ratio emprunté à une zone plus large qui satisfait A ou B.' },
    { g: 'C', rule: 'sinon. Aucun chiffre harmonisé n’est affiché ; brut seulement.' },
  ];
  const r1220 = wholeZ ? (() => { let v = 0, m = 0; wholeZ.own.overlap.filter((o) => o.year <= 2020).forEach((o) => { v += o.viirs; m += o.modis; }); return m > 0 ? v / m : null; })() : null;
  const gaps = wholeZ ? wholeZ.gaps : [];
  // Scroll-spy: the section list highlights the section at the top of the reading area.
  return (
    <article className="fb-doc" aria-labelledby="fb-method-t" ref={docRef}>
      <nav className="fb-doc-toc" aria-label="Sections de la méthode">
        <h1 className="fb-doc-title" id="fb-method-t">Méthode</h1>
        <ol>{TOC.map(([id, t]) => <li key={id}><a href={'#' + id} className={cx(cur === id && 'is-cur')} aria-current={cur === id ? 'location' : undefined} onClick={(e) => { e.preventDefault(); const el = document.getElementById(id); el && el.scrollIntoView({ block: 'start' }); }}>{t}</a></li>)}</ol>
      </nav>
      <div className="fb-doc-body">
        <section className="fb-doc-sec" id="m-how" aria-labelledby="m-how-h">
          <h2 className="fb-doc-h" id="m-how-h">Comment c’est calculé</h2>

          <ol className="fb-steps-list">
            <li>Nous comptons des <b>cellules-jours</b> : une cellule d’environ 1 km avec au moins une détection de feu de végétation un jour donné, sommées par mois sur les tuiles de 0,5° situées dans la zone.</li>
            <li>Sur les {LAST - SW + 1} années de chevauchement ({SW}–{LAST}), nous calculons un ratio global sur les totaux cumulés : <span className="at-mono">ratio = ΣVIIRS ÷ ΣMODIS</span>.</li>
            <li>Nous multiplions chaque mois MODIS antérieur à 2012 par ce ratio ; les mois VIIRS restent tels que mesurés. Le changement compare l’année moyenne 2012–{LAST} à celle de 2003–2011{PARTIAL ? ' (' + partialLabelL() + ' ; affichée, mais exclue des statistiques annuelles)' : ''}.</li>
            <li>Nous testons la correction : chaque année utilisable est retirée puis prédite à partir des autres ; un ratio établi sur 2012–2018 prédit 2019–{LAST} ; et les mois sont comparés un à un.</li>
          </ol>

          {Z && Z.harmOK && (
            <div className="fb-method-ov">
              <h3 className="fb-h3">Les deux capteurs sur le chevauchement · ratio global {F2(Z.ratio)}</h3>
              <RatioStrip Z={Z} />
            </div>
          )}
        </section>
        <section className="fb-doc-sec" id="m-robust" aria-labelledby="m-robust-h">
          <h2 className="fb-doc-h" id="m-robust-h">Ce qui est robuste</h2>

          {Z && Z.harmOK && T ? (
            <ul className="fb-limits fb-robust">
              <li><b>Robuste : le facteur de correction.</b> Les données brutes exagèrent toute comparaison avant/après 2012 d’un facteur égal au ratio lui-même, soit {corrFactor(Z)} ici ({F2(Z.rMin)}–{F2(Z.rMax)} en retirant une année){borrowed ? ', d’après la zone plus large' : ''}.</li>
              {Z.guard ? <li><b>Aucune hausse pour cette zone.</b> {cap(trGuard(Z.guard))}.</li> :
              <li><b>{T.status === 'robust' ? 'Ici, la tendance tient.' : 'Ici, la tendance est incertaine.'}</b> {zoneName} : {X(T.rise)} sur la série harmonisée, {X(T.without)} sans {T.bigYear} (son année la plus forte), plage à 90 % de {bootRange(T)} quand les années sont rééchantillonnées ({Math.round(T.pUp * 100)}{PS} des tirages au-dessus de 1×). Les deux périodes sont courtes (9 ans avant 2012, {LAST - 2011} après), donc chaque moyenne dépend beaucoup de son année la plus forte : {(() => { let b = 2003; for (let y = 2003; y <= 2011; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} avant 2012 et {(() => { let b = 2012; for (let y = 2012; y <= LAST; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} après.</li>}
            </ul>
          ) : <p className="fb-note">Aucune tendance harmonisée pour cette zone.</p>}

          <h3 className="fb-h3">Chaque année utilisable, prédite sans elle-même{borrowed ? ' (zone plus large)' : ''}</h3>
          {Z && Z.loo.length ? (
            <>
              <p className="fb-note">Le graphique des erreurs année par année se trouve dans l’onglet Preuves, panneau 2. {onEvidence && <button type="button" className="at-link" onClick={onEvidence}>L’ouvrir <Icon d={IC.arrow} /></button>}</p>
              <p className="fb-note">En retirant une année : erreur médiane {PCT(Z.medErr)}{Z.holdout ? ' · ratio établi sur 2012–2018, prédiction de 2019–' + LAST + ' : ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · mois par mois (les deux capteurs ≥ 30 cellules-jours, ' + Z.monthly.n + ' mois) : ' + PCT(Z.monthly.medErr) : ''}.</p>
              <ProvenanceLine status="computed" locale="fr" source="NASA FIRMS" products={['MCD14ML', 'VNP14IMGT']} period={SW + '–' + LAST}>
                <span>{borrowed ? <>zone plus large <span className="at-mono">{boxText(Z.borrowed.box)}</span></> : zoneName}</span>
              </ProvenanceLine>
            </>
          ) : <p className="fb-step-empty"><i className="at-cell at-cell-low" aria-hidden="true" />{Z ? 'Trop peu d’années de chevauchement utilisables ici pour faire le test.' : ''}</p>}

          <div className="fb-method-block" id="independent">
            <h3 className="fb-h3">Vérification indépendante : superficie brûlée officielle</h3>
            {official ? (
              <>
                <p className="fb-note">Canada, National Forestry Database (Base nationale de données sur les forêts), une source indépendante des deux capteurs. Année moyenne 2012–{official.after[1]} ÷ 2003–2011 : <b>superficie brûlée officielle {X(official.rise)}</b> ; nos cellules-jours sur les mêmes années : brutes {X(official.raw)}, harmonisées {X(official.harm)}. Cellules-jours par km² brûlé : avant 2012, {dec(official.perKm2.rawBefore, 1)} en brut et {dec(official.perKm2.harmBefore, 1)} en harmonisé ; après 2012, {dec(official.perKm2.after, 1)}.</p>
                <IndexChart off={official} />
                <ProvenanceLine status="real" locale="fr" source="Conseil canadien des ministres des forêts, National Forestry Database, via ECCC" period={'2003–' + official.after[1]}><span>consulté le {official.retrieved}</span><span>km² ; Nunavut non inclus</span></ProvenanceLine>
              </>
            ) : <p className="fb-note">Disponible seulement pour « {tm('All of Canada')} » (totaux officiels nationaux). {isAr ? 'Aucune série indépendante de superficie brûlée n’a encore été vérifiée pour l’Argentine.' : 'Les séries provinciales n’ont pas été vérifiées dans cette version.'}</p>}
          </div>

          <div className="fb-method-rel">
            <h3 className="fb-h3">Qualité de l’harmonisation</h3>
            <ul className="fb-grades">
              {grades.map((x) => (
                <li key={x.g} className={cx(Z && Z.grade === x.g && !Z.empty && 'is-on')}>
                  <span className={cx('fb-grade', 'is-' + x.g)}>{x.g}</span>
                  <span>{x.rule}{Z && Z.grade === x.g && !Z.empty && <b className="fb-grade-here"> Cette zone : {gradeRule(Z).replace(/^[ABC]\s?:\s/, '')}</b>}</span>
                </li>
              ))}
            </ul>
            <p className="fb-note">Cette note évalue la correction, pas la tendance. Une année de chevauchement est utilisable pour le test quand MODIS y compte au moins {MIN_MODIS} cellules-jours.{reference ? ' Cette zone est l’une des trois zones de référence du Québec dont les comptages par tuiles ont été revérifiés par rapport à des comptages faits directement à partir des points chauds FIRMS.' : ' Seules les trois zones de référence du Québec ont eu leurs comptages par tuiles revérifiés par rapport à des comptages faits directement à partir des points chauds FIRMS.'}</p>
          </div>
        </section>
        <section className="fb-doc-sec" id="m-limits" aria-labelledby="m-limits-h">
          <h2 className="fb-doc-h" id="m-limits-h">Limites</h2>

          <ul className="fb-limits">
            <li>Le ratio est tiré par les grandes années de feux ; {q ? q + ' (' + zoneName + (borrowed ? ', zone plus large' : '') + ')' : 'les années calmes peuvent être surestimées ou sous-estimées'}.</li>
            <li><b>Seuil de détection.</b> En dessous d’environ 10 cellules-jours dans un mois typique, VIIRS voit des feux que MODIS ne pouvait pas voir ; aucun ratio ne les retrouve, et ces mois ne sont donc pas comparés.</li>
            <li>Avant 2003, la couverture est partielle (Terra seul jusqu’en juillet 2002) : les années 2001–2002 sont affichées estompées et ne servent pas aux statistiques.</li>
            <li>Les mois de panne de S-NPP sont remplacés par NOAA-20{gaps.length ? ' (' + cn + ' : ' + gaps.map((g) => g.key).join(', ') + ')' : ''} : ratio NOAA-20/S-NPP à l’échelle du pays supérieur à 1,25, avec au moins 200 cellules-jours chacun. La NASA signale une panne de VIIRS sur S-NPP le 24 juillet 2024 (de 5 h 28 à 18 h 22 UTC) ; à elle seule, elle n’explique pas tout le déficit mensuel.</li>
            <li><b>Garde-fou des petites zones.</b> Aucune hausse avant/après n’est affichée (verdict, fiches, échelle des mesures, Preuves, Fonctionnement) quand la moyenne harmonisée avant 2012 est inférieure à 50 cellules-jours par an, ou quand la plage à 90 % obtenue en rééchantillonnant les années couvre plus d’un facteur 10. Seul le facteur de correction est affiché, avec la raison. Depuis la v6.2, en plus : une zone dont le ratio (propre ou emprunté) dépasse 4× n’est pas harmonisée du tout, comme sur la carte ; quand Aqua seul et la série harmonisée tombent de part et d’autre de 1×, aucune hausse n’est affichée (Aqua seul va dans l’autre sens) ; quand la vérification mois par mois manque, porte sur moins de 6 mois ou a une erreur médiane supérieure à 50 %, la tendance est affichée comme incertaine (pas de pastille de réussite). Ces seuils relèvent de notre choix ; ils ne sont pas calibrés.</li>
            <li>Les seuils des notes de qualité sont des heuristiques, calibrées sur le Québec ; ils évaluent l’harmonisation, pas la tendance.</li>
            <li>Les petites zones (moins de {BORROW.below} années utilisables) empruntent le ratio d’une zone plus large, agrandie par anneaux de 0,5° jusqu’à compter {BORROW.need} années utilisables.</li>
            <li>Les comptages sont des détections (cellules-jours), pas des feux ni une superficie brûlée. Les fichiers par pays s’arrêtent aux frontières.</li>
          </ul>

          <div className="fb-method-block" id="next-seam">
            <h3 className="fb-h3">La prochaine jointure</h3>
            <p className="fb-note">La production des données VIIRS de S-NPP a pris fin le 2 novembre 2026 ; la série se poursuit avec NOAA-20. Mesuré sur chaque mois couvert par les deux satellites depuis avril 2018 (mois de panne exclus), {forC}, NOAA-20 ÷ S-NPP = {wholeZ && wholeZ.n20 ? F2(wholeZ.n20.factor) + ' (' + F2(wholeZ.n20.lo) + '–' + F2(wholeZ.n20.hi) + ' selon les années)' : '—'}{Z && Z.n20 && Z !== wholeZ ? ' ; cette zone : ' + F2(Z.n20.factor) : ''}{Z && Z.cont && Z.cont.length ? '. À partir de ' + Z.cont[0].key + ' (' + Z.cont.length + ' mois ' + inC + '), les mois sans S-NPP utilisent NOAA-20 ÷ ' + F2(Z.contFactor) + (Z.contFactorFrom === 'box' ? ' (cette zone)' : ' (ensemble du pays)') + ', affichés comme calculés.' : CAL_LAST > 2025 ? '. Aucun mois sans S-NPP pour l’instant dans cette version (données jusqu’en ' + endLabelL() + ').' : '. 2026 ne figure pas dans cette version : les données s’arrêtent en ' + endLabelL() + '.'}{Z && Z.provSet && Z.provSet.size ? ' ' + Z.provSet.size + (Z.provSet.size === 1 ? ' mois provient' : ' mois proviennent') + ' de fichiers en quasi temps réel : données provisoires, non filtrées des sources de chaleur autres que les feux.' : ''}</p>
          </div>

        </section>
        <section className="fb-doc-sec" id="m-bymonth" aria-labelledby="m-bymonth-h">
          <h2 className="fb-doc-h" id="m-bymonth-h">Le ratio par mois{Z && Z.harmOK ? ' · ' + zoneName : ''}</h2>

          {Z && Z.harmOK ? (
            <>
              <p className="fb-note">Un seul ratio est calculé sur des années entières. Par construction du ratio global, les valeurs harmonisées sont exactes en totaux annuels ; certains mois, hors de la saison des feux, peuvent être erronés d’un facteur égal à celui affiché. Σ VIIRS ÷ Σ MODIS de chaque mois du calendrier, février 2012 – {LAST}{Z.gradeWhy === 'borrowed' ? ' (cette zone ; le ratio utilisé est emprunté à la zone plus large)' : ''} ; résidu = ce rapport ÷ le ratio global {F2(Z.ratio)}. En gris : trop peu de détections ce mois-là pour conclure.</p>
              <div className="fb-bymonth" role="table" tabIndex={0} aria-label="Ratio et résidu par mois du calendrier">
                <div role="row" className="fb-bm-row is-head"><span role="columnheader">Mois</span>{Z.byMonth.map((x) => <span role="columnheader" key={x.m}>{cap(MONTHS_SHORT_L[x.m])}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Ratio</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet')}>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Résid. ×</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}>{x.resid == null ? '—' : F2(x.resid)}</span>)}</div>
              </div>
              <p className="fb-note">La méthode n’est pas modifiée dans ce prototype : un ratio saisonnier demanderait plus d’années par mois que n’en ont les petites zones.</p>
            </>
          ) : <p className="fb-note">Aucun ratio pour cette zone.</p>}

        </section>
        <section className="fb-doc-sec" id="m-map" aria-labelledby="m-map-h">
          <h2 className="fb-doc-h" id="m-map-h">Ce que montre la carte</h2>

          {cells ? (() => {
            const P = (x) => Math.round(x * 100) + PS, rg = chanceRange, ca = cells.canada, ar = cells.argentina, sc = ca.summary, sa = ar.summary, pa = ratioPercentiles(ca), pr = ratioPercentiles(ar);
            const hi = (S) => S.cells.filter((c) => c.high).length;
            return (
              <ul className="fb-limits">
                <li><b>Cases.</b> Les tuiles de 0,5°. Pour chacune, un <b>ratio local</b> : VIIRS ÷ MODIS cumulé sur {SW}–{LAST} dans la case et ses huit voisines ; sur 5 × 5 cases quand l’un ou l’autre capteur y compte moins de {CELL.need} cellules-jours ; sinon, le ratio du pays. Canada : {P(sc.cases.own3)} en 3 × 3, {P(sc.cases.own5)} en 5 × 5, {P(sc.cases.country)} avec le ratio du pays ; Argentine : {P(sa.cases.own3)}, {P(sa.cases.own5)}, {P(sa.cases.country)}. Les 90 % centraux des ratios locaux : {F2(pa.p5)}–{F2(pa.p95)} (Canada), {F2(pr.p5)}–{F2(pr.p95)} (Argentine).</li>
                <li><b>Année record.</b> Totaux annuels par case, {STATS_FROM}–{LAST} : brut (MODIS jusqu’en janvier 2012, VIIRS ensuite), harmonisé (MODIS × le ratio local jusqu’en janvier 2012) et MODIS seul (sans correction, toutes les années). Le record est l’année au total le plus élevé. Les cases sont comptées quand elles ont au moins {CELL.eligible} cellules-jours harmonisées et un ratio local de 4× ou moins : {num(sc.n)} au Canada, {num(sa.n)} en Argentine.</li>
                <li><b>Plage du hasard, pas une référence.</b> Une grosse saison des feux établit des records dans beaucoup de cases voisines à la fois : les cases ne sont donc pas indépendantes, et « {ca.since} années sur {ca.period} » n’est pas le bon étalon. Nous permutons les étiquettes d’années {num(ca.perms.length)} fois (avec une graine fixe), de la même façon pour chaque case, et prenons le 5e–95e centile de la part des records depuis 2012. Canada : brut {P(sc.sinceRaw)} (hasard {rg(sc.chanceRaw)}), harmonisé {P(sc.sinceHarm)} ({rg(sc.chanceHarm)}), MODIS seul {P(sc.sinceModis)} ({rg(sc.chanceModis)}). Argentine : brut {P(sa.sinceRaw)} ({rg(sa.chanceRaw)}), harmonisé {P(sa.sinceHarm)} ({rg(sa.chanceHarm)}), MODIS seul {P(sa.sinceModis)} ({rg(sa.chanceModis)}). {(() => { const out = []; [['au Canada', sc], ['en Argentine', sa]].forEach(([nm, x]) => [['brute', x.sinceRaw, x.chanceRaw], ['harmonisée', x.sinceHarm, x.chanceHarm], ['de MODIS seul', x.sinceModis, x.chanceModis]].forEach(([k, v, c]) => { const w = versus(v, c); if (w !== 'inside') out.push('la part ' + k + ' ' + nm + ' est ' + (w === 'above' ? 'au-dessus de' : w === 'below' ? 'en dessous de' : w) + ' sa plage du hasard'); })); return out.length ? cap(out.join(' ; ')) + ' ; toutes les autres parts sont à l’intérieur de leur plage. ' : 'Toutes les parts sont à l’intérieur de leur plage du hasard. '; })()}{sc.topHarm[0].year} réunit {P(sc.topHarm[0].share)} des records harmonisés du Canada, et {sa.topHarm[0].year} {P(sa.topHarm[0].share)} de ceux de l’Argentine.</li>
                <li><b>Sur la carte.</b> « Record avant 2012 » et « record depuis 2012 » prennent les deux extrémités de la palette cividis, adaptée au daltonisme, réglée pour chaque thème (la légende montre les deux), et volontairement pas le dégradé violet–orange du calendrier (couleurs vérifiées pour le daltonisme et en niveaux de gris avec tools/cvd.mjs). Quand une case de 0,5° ferait moins d’environ 5 px, les cases sont regroupées en blocs de 1° qui montrent l’époque majoritaire ; une égalité exacte est partagée moitié-moitié. Les compteurs utilisent toujours les cases de 0,5°. L’harmonisation fait passer {flipCounts(ca).toBefore} cases au Canada et {flipCounts(ar).toBefore} en Argentine de « depuis 2012 » à « avant 2012 » ; {flipCounts(ca).toSince + flipCounts(ar).toSince} passent dans l’autre sens.</li>
                <li><b>Sensibilité.</b> Le record est recalculé avec le ratio local × 0,85 et × 1,15 ; une case dont l’époque change est dessinée estompée (« dépend du ratio ») : {P(sc.depends)} au Canada, {P(sa.depends)} en Argentine.</li>
                <li><b>Un record, c’est une année, pas une tendance.</b> La carte ne dit pas si l’activité des feux a augmenté dans une case ; c’est le rôle du verdict et de son test de robustesse, pour une zone.</li>
                <li><b>Ce qu’un ratio ne peut pas retrouver.</b> {floors ? dc(Math.round(floors.canada * 1000) / 10) + PS + ' (Canada) et ' + dc(Math.round(floors.argentina * 1000) / 10) + PS + ' (Argentine)' : 'Quelques pour cent'} des cellules-jours VIIRS de {SW}–{LAST} tombent dans des cases et des mois où MODIS n’a rien enregistré. Un ratio n’y remet rien : dans les cases où dominent les petits feux, les années harmonisées avant 2012 sont donc, s’il y a un biais, trop basses, ce qui favorise un record après 2012. Nous n’avons pas mesuré l’effet net sur les parts.</li>
                <li><b>Ratio au-dessus de 4× : non harmonisé.</b> {hi(ca)} cases au Canada et {hi(ar)} en Argentine ont un ratio local VIIRS ÷ MODIS supérieur à 4×, inhabituel pour des feux de végétation ; peut-être des sources de chaleur autres que des feux (non vérifié). Elles sont dessinées en gris, ni harmonisées ni comptées (en les incluant : Canada brut {P(ca.summaryAll.sinceRaw)}, harmonisé {P(ca.summaryAll.sinceHarm)} ; Argentine {P(ar.summaryAll.sinceRaw)}, {P(ar.summaryAll.sinceHarm)}). Elles figurent dans le CSV de la carte.</li>
              </ul>
            );
          })() : <p className="fb-note">Lecture des tuiles.</p>}

        </section>
        <section className="fb-doc-sec" id="m-faq" aria-labelledby="m-faq-h">
          <h2 className="fb-doc-h" id="m-faq-h">Questions qu’un expert posera</h2>

          <ul className="fb-limits fb-faq">
            <li><b>Taille des feux et biome ?</b> Le ratio est estimé à l’intérieur de chaque zone ; sur l’ensemble des zones prédéfinies, il couvre {ratioRange ? F2(ratioRange[0]) + '–' + F2(ratioRange[1]) : '—'}. Une zone personnalisée peut aller beaucoup plus loin : les ratios locaux des cases de 0,5° vont {cells && cells.canada ? 'de ' + F2(ratioPercentiles(cells.canada).p5) + ' à ' + F2(ratioPercentiles(cells.canada).p95) : '—'} (5e–95e centile, Canada) et {cells && cells.argentina ? 'de ' + F2(ratioPercentiles(cells.argentina).p5) + ' à ' + F2(ratioPercentiles(cells.argentina).p95) : '—'} (Argentine), certains dépassant 4× ; une case ou une zone au-dessus de 4× n’est pas harmonisée.</li>
            <li><b>Heure de passage ?</b> Le ratio absorbe la différence moyenne d’échantillonnage entre les capteurs, pas la différence d’un jour donné.</li>
            <li><b>Angle de balayage et nuages ?</b> Ce sont des sommes mensuelles sur de nombreux passages ; les scènes individuelles ne sont pas comparées.</li>
            <li><b>Dérive de l’orbite de MODIS ?</b> {cn} : ratio {r1220 ? F2(r1220) : '—'} sur 2012–2020, contre {wholeZ && wholeZ.ratio ? F2(wholeZ.ratio) : '—'} sur toutes les années de chevauchement.</li>
            <li><b>Comptages ou superficie brûlée ?</b> Des comptages. Voir la vérification indépendante avec la superficie brûlée officielle.</li>
          </ul>
        </section>
        <section className="fb-doc-sec" id="m-data" aria-labelledby="m-data-h"><h2 className="fb-doc-h" id="m-data-h">Données</h2>

        <p>Produits de feux actifs de NASA FIRMS : MODIS Collection 6.1 (<span className="at-mono">MCD14ML</span>), VIIRS S-NPP 375 m (<span className="at-mono">VNP14IMGT</span>), VIIRS NOAA-20 375 m (<span className="at-mono">VJ114IMGT</span>, utilisé pour les mois de panne de S-NPP et pour le facteur de la prochaine jointure). Fichiers annuels par pays, 2000–2025 : 96 fichiers, 19,2 millions de points chauds FIRMS lus, agrégés en tuiles mensuelles de 0,5°.{CAL_LAST > 2025 ? ' 2026, jusqu’en ' + endLabelL() + ' : API par zone de FIRMS (fichiers standard quand ils existent, quasi temps réel sinon), même règle des cellules-jours, détections situées dans les pays voisins retirées (Natural Earth 1:50m).' : ''} Seules les détections de type 0 (feu de végétation présumé) sont conservées. Sommer les tuiles d’une zone donne un écart de −0,2 à −0,5 % par rapport au comptage direct des points (vérifié sur les trois zones du Québec). Superficie brûlée officielle : Conseil canadien des ministres des forêts, National Forestry Database, par l’intermédiaire d’Environnement et Changement climatique Canada.</p>
        </section><section className="fb-doc-sec" id="m-refs" aria-labelledby="m-refs-h"><h2 className="fb-doc-h" id="m-refs-h">Références</h2>
        <ul className="fb-refs">
          <li>NASA Earthdata, “Transitioning from Suomi NPP VIIRS &amp; OMPS: What FIRMS Users Need to Know” — earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know</li>
          <li>NASA Earthdata, “Suomi NPP VIIRS Data Product Anomaly - July 2024” — earthdata.nasa.gov/data/alerts-outages/suomi-npp-viirs-data-product-anomaly-july-2024</li>
          <li>Chen, Y. et al. (2026), “Tracking recent extremes and interannual variability of global fire emissions using a near-real-time extension to the Global Fire Emissions Database”, Earth System Science Data 18, 7535–7555 — essd.copernicus.org/articles/18/7535/2026/</li>
          <li>Environment and Climate Change Canada, “Forest management and disturbances” indicator; data: CCFM National Forestry Database, “Area burned by forest fires by region, Canada, 1990 to 2024” — canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html</li>
        </ul>
</section>
        <section className="fb-doc-sec" id="m-about" aria-labelledby="m-about-h">
          <h2 className="fb-doc-h" id="m-about-h">À propos et crédits</h2>
          <p>FireBridge — NASA Space Apps Challenge 2026, défi « Harmonization of MODIS and VIIRS Hot Spots » (harmonisation des points chauds MODIS et VIIRS).</p>
          <p>Équipe BlackCoffeeOnly : Yasmine Lounaci et Mouloud Serir.</p>
          <p>Données : NASA FIRMS. Contours : Natural Earth. FireBridge n’est pas affilié à la NASA, n’est pas un produit de la NASA et n’est pas approuvé par la NASA.</p>
          <p>Le code, le traitement des données et l’analyse ont été produits avec une aide importante de l’intelligence artificielle (IA), sous la direction de l’équipe, qui les a revus.</p>
          <p className="fb-muted">Prototype — chaque chiffre est calculé dans votre navigateur à partir des tuiles mensuelles de 0,5°.</p>
        </section>
      </div>
    </article>
  );
}
