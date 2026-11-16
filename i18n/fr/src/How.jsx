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
import { PS, tm } from './l10n.js';

const STEPS = ['Le problème', 'Le raccord', 'La preuve', 'Records'];
const CNAME = { canada: 'Canada', argentina: 'Argentine' };
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
  const opts = [{ value: ex === 'argentina' ? 'argentina' : 'canada', label: tm(ex === 'argentina' ? 'All of Argentina' : 'All of Canada') }, { value: 'larioja', label: 'La Rioja' }];
  if (showThis) opts.push({ value: 'zone', label: 'Cette zone' });
  if (!Z) return <div className="fb-howtab is-skel" aria-hidden="true" />;
  const s = story(Z, ex === 'canada' ? 'Canada' : ex === 'argentina' ? 'Argentine' : ex === 'larioja' ? 'La Rioja' : null);
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
    body = <p className="fb-step-b">Depuis 2012, un capteur plus fin (VIIRS) observe les feux aux côtés de l’ancien (MODIS), et la série utilise VIIRS à partir de cette date. VIIRS voit {ratioWords(Z.ratio || 2)} de détections de feux que MODIS. Mises simplement bout à bout sans correction, les deux séries font un saut en 2012, même là où les feux n’ont pas augmenté. VIIRS observe des carrés de 375 m, MODIS de 1 km : VIIRS repère donc de petits feux que MODIS manque.</p>;
    chart = <><p className="fb-figcap">Détections de feux par an, brutes, échelle log · moyennes 2003–2011 ({NUM(Z.levels.raw.before)}) et 2012–{LAST} ({NUM(Z.levels.raw.after)}) : brut {X(Z.riseRaw)}</p><RawBars Z={Z} seen={seen} /><div className="st-frieze"><SensorFrieze locale="fr" from={SPAN[0]} to={SPAN[1]} covered={[FIRST, LAST]} compact={phone} /></div></>;
    prov = <ProvenanceLine locale="fr" status="real" source="NASA FIRMS" period={'2001–' + LAST}>{zoneTag}</ProvenanceLine>;
  } else if (step === 2) {
    title = 'Combien de plus le nouveau satellite voit-il ?';
    answer = Z.harmOK ? (borrowed ? 'Autour de cette zone, ' + F2(Z.ratio) + ' fois ce que voit l’ancien.' : 'Ici, ' + F2(Z.ratio) + ' fois ce que voit l’ancien.') : 'Trop peu de feux ici pour le mesurer de façon fiable.';
    body = Z.harmOK ? <p className="fb-step-b">Les deux satellites volent ensemble de {SW} à {LAST}. On multiplie les années de l’ancien satellite par ce facteur, sans toucher au nouveau.{left.length ? (left.length === 1 ? ' L’année ' : ' Les années ') + left.join(', ') + (left.length === 1 ? ' a' : ' ont') + ' trop peu de feux et ' + (left.length === 1 ? 'est exclue' : 'sont exclues') + ' du test.' : ''}{borrowed ? ' Cette zone est petite : le facteur vient donc de la zone qui l’entoure.' : ''}</p> : null;
    chart = Z.harmOK && Z.usable.length ? <><p className="fb-figcap">{borrowed ? 'Zone élargie ' + boxText(Z.borrowed.box) + ' · ' : ''}Les deux satellites, année par année · <b>facteur {F2(Z.ratio)}</b> ({F2(Z.rMin)}–{F2(Z.rMax)} en retirant chaque année à tour de rôle)</p><RatioStrip Z={Z} /></> : <p className="fb-step-empty">{Z.own.usable.length} années bien vues par les deux satellites ici : trop peu pour les comparer.</p>;
    prov = <ProvenanceLine locale="fr" status="real" source="NASA FIRMS" period={'2012–' + LAST}>{borrowed ? <span>zone élargie · <span className="at-mono">{boxText(Z.borrowed.box)}</span></span> : zoneTag}</ProvenanceLine>;
  } else if (step === 3) {
    title = 'Une fois corrigée, l’activité des feux a-t-elle changé ?'; answer = s.p;
    body = Z.harmOK ? <p className="fb-step-b">{Z.guard ? plainSentence(Z) : Z.trend && Z.trend.status === 'robust' ? 'La réponse tient sans l’année record (' + Z.trend.bigYear + ' : ' + xr(Z.trend.without) + ') et quand les années sont rééchantillonnées (plage à 90 % ' + bootRange(Z.trend) + ').' : Z.trend ? 'La tendance est incertaine : ' + xr(Z.trend.without) + ' sans ' + Z.trend.bigYear + ', plage à 90 % ' + bootRange(Z.trend) + ' quand les années sont rééchantillonnées. Le facteur de correction, lui, est robuste.' : ''}{Z.riseAqua != null && isFinite(Z.riseAqua) ? ' Un ancien satellite seul (Aqua) va ' + ((Z.riseAqua - 1) * (Z.riseH - 1) >= 0 ? 'dans le même sens' : 'dans l’autre sens') + ' (' + X(Z.riseAqua) + ').' : ''} D’autres vérifications dans Preuves.</p> : <p className="fb-step-b">{plainSentence(Z)} Seul le changement avec les deux séries simplement mises bout à bout est affiché, et il mélange deux satellites.</p>;
    chart = <RiseBars Z={Z} big={!phone} seen={seen} official={official} />;
    prov = <ProvenanceLine locale="fr" status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–2011 vs 2012–' + LAST}>{reference ? <span>Zone de référence du Québec</span> : null}</ProvenanceLine>;
  } else {
    title = 'Le changement de satellite a-t-il créé de fausses années record ?';
    answer = rs ? rs.verdict : null;
    body = rs && <p className="fb-step-b">{rs.head} {rs.base} Un record, c’est une année, pas une tendance.</p>;
    const P1 = (x) => Math.round(x * 100) + PS;
    chart = S ? (
      <>
        <div className="fb-recpair" role="img" aria-label={'Années record, brutes et harmonisées : cases dont l’année record est 2012 ou après, brut ' + P1(S.summary.sinceRaw) + ', harmonisé ' + P1(S.summary.sinceHarm) + '.'}>
          <RecordMini S={S} country={cty} harm={false} label="Brut" count={P1(S.summary.sinceRaw) + ' des cases'} />
          <RecordMini S={S} country={cty} harm label="Harmonisé" count={P1(S.summary.sinceHarm) + ' des cases'} />
        </div>
        <p className="fb-figcap"><i className="fb-sw is-before" aria-hidden="true" /> année record avant 2012 · <i className="fb-sw is-since" aria-hidden="true" /> 2012 ou après · gris : non harmonisé. Le hasard seul donne {chanceRange(S.summary.chanceHarm)} pour la série harmonisée, {chanceRange(S.summary.chanceRaw)} pour la série brute.</p>
      </>
    ) : <ChanceChart s={recS} label={CNAME[cty]} />;
    prov = <ProvenanceLine locale="fr" status="computed" source="NASA FIRMS" period={'2003–' + LAST}><span>{recS === sb ? zoneName : cty === 'canada' ? 'Canada' : 'Argentine'} · cases de 0,5°</span></ProvenanceLine>;
  }
  return (
    <div className="fb-howtab">
      <div className="fb-how-top">
        <ol className="fb-dots" aria-label="Étapes">{STEPS.map((n, i) => <li key={n}><button type="button" className={cx('fb-dot2', step === i + 1 && 'is-on')} aria-current={step === i + 1 ? 'step' : undefined} onClick={() => setStep(i + 1)}><b>{i + 1}</b>{n}</button></li>)}</ol>
        <span className="fb-exlab"><span className="fb-eyebrow">Exemple</span><Segmented size="sm" ariaLabel="Zone d’exemple" value={ex} onChange={setEx} options={opts} /></span>
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
        <button type="button" className="at-btn" onClick={() => setStep(step - 1)} disabled={step === 1}><Icon d="M19 12H5M11 6l-6 6 6 6" />Précédent</button>
        <span className="fb-muted">Étape {step} sur 4 · touches ← →</span>
        {step < 4 ? <button type="button" className="at-btn at-btn-primary" onClick={() => setStep(step + 1)}>Suivant<Icon d={IC.arrow} /></button>
          : <button type="button" className="at-btn at-btn-primary" onClick={onEvidence}>Ouvrir les preuves<Icon d={IC.arrow} /></button>}
      </div>
    </div>
  );
});
