// Version 5 Evidence tab: four panels, each headed by a one-line takeaway generated from the numbers.
import { memo, useState } from 'react';
import { Info } from './ui.jsx';
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { LAST, SW, STATS_FROM, cellSummary, versus } from './metrics.js';
import { X, F2, PCT, xr, bootRange, proofHeading, looHeading, recordsHeading, chanceShort, baseRate } from './copy.js';
import { RiseBars } from './Verdict.jsx';
import { IndexChart } from './Method.jsx';
import { ErrorStrip } from './Strips.jsx';
import { MonthRow } from './MonthRow.jsx';
import { cx } from './util.jsx';
import { num, PS, monthShort } from './l10n.js';
import { guardFr } from './guard.js';

const P1 = (x) => (x == null ? '—' : Math.round(x * 100) + PS);
const VS = { inside: 'dans la plage', above: 'au-dessus', below: 'en dessous' }; // versus() ids → words (display only)

// Shares of places with a record since 2012 against their chance ranges (one row per series).
export function ChanceChart({ s, label }) {
  if (!s || !s.n) return <p className="fb-note">Trop peu de cases pour lire des records ici.</p>;
  const rows = [['Brut', s.sinceRaw, s.chanceRaw], ['Harmonisé', s.sinceHarm, s.chanceHarm], ['MODIS seul', s.sinceModis, s.chanceModis]];
  return (
    <div className="fb-chance"><div className="fb-chance-plot" role="img" aria-label={label + ' : part des cases dont l’année record est 2012 ou après, comparée à la plage que donne le hasard seul. ' + rows.map(([k, v, c]) => k + ' ' + P1(v) + ', hasard ' + P1(c.lo) + ' à ' + P1(c.hi) + ' (' + (VS[versus(v, c)] || versus(v, c)) + ')').join(' ; ') + '.'}>
      <div className="fb-chance-axis" aria-hidden="true"><span /><span className="fb-chance-ticks">{[0, 25, 50, 75, 100].map((t) => <i key={t} style={{ left: t + '%' }}>{t}{PS}</i>)}</span><span /></div>
      {rows.map(([k, v, c]) => {
        const w = versus(v, c);
        return (
          <div key={k} className="fb-chance-row">
            <span className="fb-chance-k">{k}</span>
            <span className="fb-chance-track">
              <i className="fb-chance-rng" style={{ left: c.lo * 100 + '%', width: (c.hi - c.lo) * 100 + '%' }} />
              <i className={cx('fb-chance-pt', k === 'Brut' && 'is-raw')} style={{ left: v * 100 + '%' }} />
            </span>
            <span className="fb-chance-v"><b>{P1(v)}</b> {chanceShort(v, c)}</span>
          </div>
        );
      })}
      </div>
      <p className="fb-note">Bande : le hasard (5e–95e centile, {num(2000)} permutations des années, les mêmes pour chaque case). {baseRate(s)} {num(s.n)} cases ; {s.excludedHigh} non harmonisées (facteur local > 4×). Un record, c’est une année, pas une tendance.</p>
    </div>
  );
}

export const Evidence = memo(function Evidence({ Z, S, official, country, zoneName, reference, sel, onSelect, from, to, fellBack, phone, whole, box }) {
  const [p4r, setP4] = useState('chance');
  if (!Z || Z.empty) return <div className="fb-emptystate is-tab"><p>Aucune preuve à montrer pour cette zone : elle ne contient aucune détection.</p></div>;
  const borrowed = Z.gradeWhy === 'borrowed';
  const s = S ? (whole ? S.summary : cellSummary(S.cells, S, box)) : null;
  const sCountry = S ? S.summary : null;
  const useBox = !whole && s && s.n >= 30;
  const recS = useBox ? s : sCountry;
  // Fourth panel (v6, judge C5): Records, Official (Canada) and By month (both countries, when harmonized).
  const opts4 = [['chance', 'Records']].concat(official ? [['official', 'Officiel']] : [], Z.harmOK && Z.byMonth ? [['month', 'Par mois']] : []);
  const alt4 = opts4.length > 1;
  const p4 = opts4.some((o) => o[0] === p4r) ? p4r : 'chance';
  return (
    <div className="fb-evgrid">
      <section className="fb-panel fb-evpanel" aria-labelledby="ev1">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev1">{proofHeading(Z, official)}</h2>
          <Info id="fb-ev1-i" label="À propos de ces barres">
            <p>Détections de feux après 2012 ÷ avant (année moyenne 2012–{LAST} ÷ 2003–2011), sur une échelle log autour de 1×{official ? ' ; la série officielle est indépendante des deux capteurs' : ''}.</p>
            {Z.harmOK && Z.guard && <p>Aucune hausse n’est donnée pour cette zone : {guardFr(Z.guard)}.</p>}
            {Z.harmOK && Z.trend && !Z.guard && <p>{Z.trend.status === 'robust' ? 'Le changement tient quand les années sont rééchantillonnées (plage à 90 % ' + bootRange(Z.trend) + ') et sans ' + Z.trend.bigYear + ' (' + xr(Z.trend.without) + ').' : 'La tendance est incertaine : ' + xr(Z.trend.without) + ' sans ' + Z.trend.bigYear + ', plage à 90 % ' + bootRange(Z.trend) + '. Le facteur de correction (' + F2(Z.ratio) + ') est, lui, robuste.'}</p>}
            <p>Aqua seul ne change pas de capteur en 2012 : c’est une vérification de cohérence, ce n’est pas une validation.</p>
          </Info></div>
        <div className="fb-evfill"><RiseBars Z={Z} official={official} big={!phone} /></div>
        {Z.harmOK && Z.guard && <p className="fb-evnote">Aucune hausse n’est donnée pour cette zone : {guardFr(Z.guard)}.</p>}
        {Z.harmOK && Z.trend && !Z.guard && <p className="fb-evnote">{Z.trend.status === 'robust' ? 'Sans ' + Z.trend.bigYear + ', son année record : ' + xr(Z.trend.without) + '.' : 'Tendance incertaine : ' + xr(Z.trend.without) + ' sans ' + Z.trend.bigYear + ', plage à 90 % ' + bootRange(Z.trend) + ' ; le facteur de correction, lui, est robuste.'}</p>}
        <ProvenanceLine locale="fr" status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–' + LAST}>
          {!reference && <span>comptages non revérifiés ici avec les points FIRMS d’origine (fait pour les trois zones de référence du Québec)</span>}
        </ProvenanceLine>
      </section>
      <section className="fb-panel fb-evpanel" aria-labelledby="ev2">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev2">{looHeading(Z)}</h2>
          <Info id="fb-ev2-i" label="À propos de ce test"><p>Chaque année de chevauchement utilisable est retirée, puis prédite à partir des autres : MODIS de cette année × le facteur de correction des autres années, comparé à ce que VIIRS a mesuré{borrowed ? ' (zone élargie : le facteur est emprunté)' : ''}. Cellules-jours par an, échelle log ; l’étiquette donne l’erreur de la prédiction.</p></Info></div>
        <div className="fb-evfill"><ErrorStrip Z={Z} /></div>
        {Z.loo && Z.loo.length > 0 && <p className="fb-evnote">Erreur médiane {PCT(Z.medErr)}{Z.holdout ? ' · facteur de 2012–2018 testé sur 2019–' + LAST + ' : ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · mois par mois (' + Z.monthly.n + ' mois, chacun avec au moins 30 détections de feux dans les deux séries) : ' + PCT(Z.monthly.medErr) : ''}.</p>}
        <ProvenanceLine locale="fr" status="computed" source="NASA FIRMS" period={SW + '–' + LAST} />
      </section>
      <MonthRow cls="fb-panel fb-evpanel fb-evmonth" phone={phone} fellBack={fellBack} Z={Z} sel={sel} onSelect={onSelect} from={from} to={to} />
      <section className="fb-panel fb-evpanel" aria-labelledby="ev4">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev4">{p4 === 'chance' ? recordsHeading(recS, versus) : p4 === 'official' ? 'Année par année, face à la superficie brûlée officielle' : 'Le facteur de correction par mois'}</h2>
          {alt4 && <div className="fb-seg2 is-sm" role="radiogroup" aria-label="Quatrième panneau">{opts4.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={p4 === v} className={cx('fb-seg2-i', p4 === v && 'is-on')} onClick={() => setP4(v)}>{l}</button>)}</div>}
        </div>
        {p4 === 'chance' ? (
          <>
            <p className="fb-evsub">Cases dont l’année record est 2012 ou après, {useBox ? 'dans cette zone (' + recS.n + ' cases)' : (country === 'canada' ? 'Canada' : 'Argentine') + (whole || !s ? '' : ' (cette zone ne compte que ' + (s ? s.n : 0) + ' cases : trop peu)')}, {STATS_FROM}–{LAST}.</p>
            <div className="fb-evfill"><ChanceChart s={recS} label={useBox ? zoneName : (country === 'canada' ? 'Canada' : 'Argentine')} /></div>
          </>
        ) : p4 === 'official' ? (
          <div className="fb-evfill"><IndexChart off={official} /></div>
        ) : (
          <div className="fb-evfill">
            <p className="fb-evsub">VIIRS ÷ MODIS pour chaque mois de l’année, face au facteur unique {F2(Z.ratio)} utilisé pour tous les mois.</p>
            <div className="fb-bmstrip" role="img" aria-label={'VIIRS ÷ MODIS par mois de l’année : ' + Z.byMonth.map((x) => monthShort(x.m) + ' ' + (x.ratio == null ? 'aucune donnée' : F2(x.ratio))).join(' ; ')}>
              {Z.byMonth.map((x) => <span key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}><b>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][x.m]}</b>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}
            </div>
            <p className="fb-note">Exact sur les totaux annuels, par construction ; les mois contournés s’écartent du facteur unique de plus de 1,3×. Gris : trop peu de détections.</p>
          </div>
        )}
      </section>
    </div>
  );
});
