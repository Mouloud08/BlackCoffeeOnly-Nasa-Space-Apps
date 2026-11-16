# FireBridge glossary — English · Français · Español

The ONE reference for every translator. The French and Spanish copies are translated in parallel, file by file, by
different people: consistency depends on this table. If a term is here, use exactly this form. If a recurring term is
missing, add it here first (one row), then use it.

Conventions in this file:
- `Y` = a year placeholder (e.g. "Still up without Y" → "Still up without 2023"). `N`, `x`, `r` = numbers.
- "short" in the note = a shorter alternate for a fixed-width place (strip, pill, tab, chip, legend, menu title).
- Capitalise only the first word of a label (sentence case) in French and Spanish, never Title Case.

## 1. Core terms

| English | Français | Español | note |
|---|---|---|---|
| fire detections | détections de feux | detecciones de fuego | the main unit of the app |
| fire detection (cell-day) | détection de feu (cellule-jour) | detección de fuego (celda-día) | glossary entry title |
| cell-day(s) | cellule-jour(s) | celda-día(s) | one 1 km square with fire on one day; plural FR "cellules-jours", ES "celdas-día" |
| hotspot(s) (FIRMS points) | point(s) chaud(s) | foco(s) de calor | only for the raw FIRMS points |
| Real FIRMS hotspots | Points chauds FIRMS réels | Focos de calor FIRMS reales | menu group title |
| fire activity | activité des feux | actividad de fuego | |
| area burned | superficie brûlée | área quemada | |
| official area burned | superficie brûlée officielle | área quemada oficial | Canada NFD |
| raw (the two records simply joined) | brut (les deux séries simplement mises bout à bout) | crudo (los dos registros simplemente unidos) | adjective: brut/brute, crudo/cruda |
| harmonized (on one scale) | harmonisé (sur une même échelle) | armonizado (en una misma escala) | adjective agrees: harmonisée, armonizada |
| harmonizing / harmonization | harmoniser / harmonisation | armonizar / armonización | |
| Not harmonized | Non harmonisé | No armonizado | pill; agrees with noun |
| record (a data series) | série | registro | "the raw record" → la série brute / el registro crudo |
| record (the highest year) / record year | record / année record | récord / año récord | do NOT confuse with record = series |
| correction factor | facteur de correction | factor de corrección | |
| the 2012 satellite change | le changement de satellite de 2012 | el cambio de satélite de 2012 | |
| sensor | capteur | sensor | |
| satellite | satellite | satélite | |
| the older satellite / the newer satellite | l'ancien satellite / le nouveau satellite | el satélite anterior / el satélite nuevo | |
| bridge (the) / bridged | le raccord / raccordé | el empalme / empalmado | metaphor of the brand; never "pont" / "puente" for the method |
| typical month (median) | mois typique (médiane) | mes típico (mediana) | the median is always named |
| a typical June | un mois de juin typique | un junio típico | pattern for any month |
| provisional | provisoire | provisional | NRT months |
| Provisional (near-real-time). | Provisoire (quasi temps réel). | Provisional (casi en tiempo real). | |
| computed | calculé | calculado | provenance |
| Real / Computed | Réel / Calculé | Real / Calculado | provenance labels on screen; NOT in CSV files |
| estimated | estimé | estimado | "Before 2012: estimated" |
| trend | tendance | tendencia | |
| trend uncertain / Trend uncertain | tendance incertaine / Tendance incertaine | tendencia incierta / Tendencia incierta | never strengthened |
| uncertain | incertain(e) | incierto/a | |
| robust | robuste | robusta | "What is robust" → Ce qui est robuste / Lo que es robusto |
| reliable | fiable | confiable | |
| fair | correcte | aceptable | grade B |
| borrowed | empruntée | prestada | ratio borrowed from a wider area (feminine: la correction / la corrección) |
| local ratio | ratio local | razón local | VIIRS ÷ MODIS in a place |
| ratio (VIIRS ÷ MODIS) | ratio | razón | ES: "razón", not "ratio" or "cociente" |
| rise | hausse | aumento | |
| decline | baisse | descenso | |
| chance / chance range | hasard / plage du hasard | azar / rango del azar | 5th–95th percentile of reshuffles |
| reshuffle(s) of the year labels | permutation(s) des étiquettes d'années | permutación(es) de las etiquetas de año | |
| 90% range | plage à 90 % | rango del 90 % | |
| median error | erreur médiane | error mediano | |
| leave-one-out | en retirant une année | dejando un año fuera | |
| by construction | par construction | por construcción | keep explicit (MODIS alone = harmonized) |
| not a validation | ce n'est pas une validation | no es una validación | keep explicit |
| independent check | vérification indépendante | verificación independiente | |
| month-by-month check | vérification mois par mois | verificación mes a mes | guard G6 |
| MODIS alone | MODIS seul | solo MODIS | |
| Aqua alone / Aqua satellite alone (a check) | Aqua seul / Satellite Aqua seul (une vérification) | solo Aqua / Satélite Aqua solo (una verificación) | |
| detection floor | seuil de détection | umbral de detección | Method |
| seam (MODIS × r \| VIIRS) | jointure (MODIS × r \| VIIRS) | empalme (MODIS × r \| VIIRS) | "The next seam" → La prochaine jointure / El próximo empalme |
| small-box guard | garde-fou des petites zones | resguardo de zonas pequeñas | Method |
| baseline | référence | línea de base | |

## 2. Tabs and navigation

| English | Français | Español | note |
|---|---|---|---|
| Overview | Aperçu | Resumen | tab 1 |
| Calendar | Calendrier | Calendario | tab 2 (key `dash`) and phone panel |
| Evidence | Preuves | Evidencia | tab 3 |
| How it works | Fonctionnement | Cómo funciona | tab 4 |
| Method | Méthode | Método | tab 5 |
| Map | Carte | Mapa | phone/tablet panel |
| Burning calendar | Calendrier des feux | Calendario de quemas | panel title |
| Views | Vues | Vistas | aria-label |
| Panel | Panneau | Panel | aria-label |
| Skip to content | Aller au contenu | Ir al contenido | |
| Previous / Next | Précédent / Suivant | Anterior / Siguiente | How it works stepper |
| Example | Exemple | Ejemplo | |
| Open the calendar and map | Ouvrir le calendrier et la carte | Abrir el calendario y el mapa | |
| Open the evidence | Ouvrir les preuves | Abrir la evidencia | |
| See the evidence | Voir les preuves | Ver la evidencia | button |
| Pick a place on the map | Choisissez un endroit sur la carte | Elija un lugar en el mapa | guide step |
| Read the answer at the top | Lisez la réponse en haut | Lea la respuesta arriba | guide step |
| See each month in the calendar | Voyez chaque mois dans le calendrier | Vea cada mes en el calendario | guide step |
| How to use this page | Comment utiliser cette page | Cómo usar esta página | aria-label |
| Hide these tips | Masquer ces conseils | Ocultar estos consejos | aria-label |
| Close | Fermer | Cerrar | |
| Done | OK | Listo | |

## 3. Top bar and menus

| English | Français | Español | note |
|---|---|---|---|
| Fire detections from MODIS and VIIRS on one scale | Les détections de feux MODIS et VIIRS sur une même échelle | Detecciones de fuego de MODIS y VIIRS en una misma escala | tagline |
| Glossary | Glossaire | Glosario | |
| Glossary: words used on this page | Glossaire : mots employés sur cette page | Glosario: palabras usadas en esta página | aria-label |
| Download | Télécharger | Descargar | |
| This zone | Cette zone | Esta zona | menu group |
| Series (CSV) | Série (CSV) | Serie (CSV) | menu item title; the file itself stays English |
| Monthly series with provenance | Série mensuelle avec provenance | Serie mensual con procedencia | |
| Calendar image (SVG / PNG) | Image du calendrier (SVG / PNG) | Imagen del calendario (SVG / PNG) | |
| The calendar as shown | Le calendrier tel qu'affiché | El calendario tal como se ve | |
| The same drawing, 2× pixels | Le même dessin, 2× pixels | El mismo dibujo, 2× píxeles | |
| Map layer (CSV) | Couche de la carte (CSV) | Capa del mapa (CSV) | |
| One row per 0.5° place, with provenance | Une ligne par case de 0,5°, avec provenance | Una fila por celda de 0,5°, con procedencia | |
| Another area or period… | Autre zone ou période… | Otra zona u otro período… | |
| How to request the points from FIRMS | Comment demander les points à FIRMS | Cómo pedir los puntos a FIRMS | |
| Copy link | Copier le lien | Copiar enlace | |
| Link copied | Lien copié | Enlace copiado | |
| Copy failed: use the address bar | Échec de la copie : utilisez la barre d'adresse | No se pudo copiar: use la barra de direcciones | |
| This view, as a URL | Cette vue, sous forme d'URL | Esta vista, como URL | |
| Dark theme | Thème sombre | Tema oscuro | |
| Light theme | Thème clair | Tema claro | |
| Language | Langue | Idioma | |
| About and credits | À propos et crédits | Acerca de y créditos | |
| Challenge, data, AI use | Défi, données, usage de l'IA | Desafío, datos, uso de IA | |
| More | Plus | Más | ⋯ button aria-label |
| Country | Pays | País | |
| Presets | Zones prédéfinies | Zonas predefinidas | short: Prédéf. / Predef. not allowed → use "Zones" / "Zonas" if needed |
| Enter coordinates… | Saisir des coordonnées… | Ingresar coordenadas… | |
| Raw \| Harmonized (switch) | Brut \| Harmonisé | Crudo \| Armonizado | the ONE switch |
| Harm. | Harm. | Arm. | allowed ONLY where the English already abbreviates (narrow switch) |
| Raw only | Brut seulement | Solo crudo | |
| Record shown everywhere: raw or harmonized | Série affichée partout : brute ou harmonisée | Registro mostrado en todas partes: crudo o armonizado | aria-label |
| Hold this button, or hold R, to peek at it | Maintenez ce bouton, ou la touche R, pour la voir un instant | Mantenga este botón, o la tecla R, para verlo un momento | keys R/H stay R/H |

## 4. Verdict strip and pills

| English | Français | Español | note |
|---|---|---|---|
| Zone | Zone | Zona | eyebrow |
| Answer | Réponse | Respuesta | eyebrow |
| Checks | Vérifications | Verificaciones | eyebrow |
| Checks · on the harmonized record | Vérifications · sur la série harmonisée | Verificaciones · en el registro armonizado | |
| Is the rise real — or the satellite? | La hausse est-elle réelle — ou due au satellite ? | ¿El aumento es real o es el satélite? | kicker / shell |
| After 2012 vs before · one scale | Après 2012 vs avant · même échelle | Después de 2012 vs antes · misma escala | |
| Correction A · reliable | Correction A · fiable | Corrección A · confiable | pill |
| Correction B · fair | Correction B · correcte | Corrección B · aceptable | pill |
| Correction B · borrowed | Correction B · empruntée | Corrección B · prestada | pill |
| Not harmonized · ratio above 4× | Non harmonisé · ratio au-dessus de 4× | No armonizado · razón mayor que 4× | pill |
| Still up without Y | Toujours en hausse sans Y | Sigue en alza sin Y | pill |
| Still down without Y | Toujours en baisse sans Y | Sigue en baja sin Y | pill |
| Reverses without Y | S'inverse sans Y | Se invierte sin Y | pill |
| Without Y | Sans Y | Sin Y | pill |
| Holds without Y / Flips without Y | Tient sans Y / S'inverse sans Y | Se mantiene sin Y / Se invierte sin Y | older wording, same meaning |
| The change recomputed without Y | Le changement recalculé sans Y | El cambio recalculado sin Y | pill tooltip |
| Matches official area burned | Concorde avec la superficie brûlée officielle | Coincide con el área quemada oficial | short: Concorde avec l'officiel / Coincide con lo oficial |
| Trend uncertain | Tendance incertaine | Tendencia incierta | warning pill |
| Too little data for a trend | Trop peu de données pour une tendance | Muy pocos datos para una tendencia | |
| No data to check / Nothing to check | Aucune donnée à vérifier / Rien à vérifier | Sin datos para verificar / Nada que verificar | |
| Raw only: nothing to check | Brut seulement : rien à vérifier | Solo crudo: nada que verificar | |
| Raw x (hollow pill) | Brut x | Crudo x | |
| Harmonized y (filled pill) | Harmonisé y | Armonizado y | |
| raw view | vue brute | vista cruda | hero label |
| Raw reads … too high | Le brut lit … trop haut | El crudo marca … demasiado alto | |
| ÷ factor | ÷ facteur | ÷ factor | |
| Nearest data | Données les plus proches | Datos más cercanos | button; short: Plus proches / Más cercanos |
| Try a larger box | Essayer une zone plus grande | Probar una zona más grande | box (selection) = zone / zona |
| Part of this box lies outside … | Une partie de cette zone est hors de … | Parte de esta zona queda fuera de … | |
| Custom zone · | Zone personnalisée · | Zona personalizada · | |
| quality / harmonization quality | qualité / qualité de l'harmonisation | calidad / calidad de la armonización | Method heading |

## 5. Map

| English | Français | Español | note |
|---|---|---|---|
| Detections | Détections | Detecciones | layer; short same |
| Record years | Années record | Años récord | layer; short "Records" → Records / Récords |
| Sensor effect | Effet du capteur | Efecto del sensor | layer; short "Sensor" → Capteur / Sensor |
| One month | Un mois | Un mes | layer; short "Month" → Mois / Mes |
| Draw area | Tracer une zone | Dibujar área | |
| Drag to draw an area · Esc to cancel | Glissez pour tracer une zone · Échap pour annuler | Arrastre para dibujar un área · Esc para cancelar | key names: FR "Échap", ES "Esc" |
| Arrows move · Shift+arrows resize · + − zoom | Flèches : déplacer · Maj+flèches : redimensionner · + − : zoom | Flechas: mover · Mayús+flechas: cambiar tamaño · + −: zoom | |
| place (a 0.5° square) | case (0,5°) | celda (0,5°) | "1,947 places" → 1 947 cases / 1947 celdas |
| zone | zone | zona | |
| box (a selection) | zone | zona | never "boîte" / "caja" |
| This box | Cette zone | Esta zona | |
| Zoom to it | Zoomer dessus | Acercar | chip |
| Fit | Ajuster | Ajustar | |
| Back to … | Revenir à … | Volver a … | undo, 8 s |
| Show it on the map | Le montrer sur la carte | Mostrarlo en el mapa | |
| Map of … | Carte de … | Mapa de … | aria |
| Pick a month in the calendar. | Choisissez un mois dans le calendrier. | Elija un mes en el calendario. | |
| before 2012 / since 2012 | avant 2012 / depuis 2012 | antes de 2012 / desde 2012 | record-years legend |
| × more seen | × plus vu | × más visto | Sensor-effect legend end ("2× more seen" → 2× plus vu) |
| Lighter / Darker | Plus clair / Plus foncé | Más claro / Más oscuro | legend ends |
| Outlined | Contourné | Contorneado | legend: places that change |
| Grey | Gris | Gris | legend |
| Faded | Estompé | Atenuado | legend |
| Ratio above 4×: not harmonized | Ratio au-dessus de 4× : non harmonisé | Razón mayor que 4×: no armonizado | |
| record / top 3 / active / no detection | record / 3 premiers / active / aucune détection | récord / 3 primeros / activa / sin detección | One-month layer classes |
| Mean fire detections per year | Détections de feux moyennes par an | Detecciones de fuego medias por año | |
| a year | par an | por año | "N+ a year" |
| Chance | Hasard | Azar | |

## 6. Calendar

| English | Français | Español | note |
|---|---|---|---|
| Counts | Comptages | Conteos | segment |
| Anomaly | Anomalie | Anomalía | segment |
| Anomaly uses the harmonized record | L'anomalie utilise la série harmonisée | La anomalía usa el registro armonizado | |
| As recorded | Tel qu'enregistré | Tal como se registró | |
| Before 2012: estimated | Avant 2012 : estimé | Antes de 2012: estimado | |
| Colours | Couleurs | Colores | |
| From / To | De / À | Desde / Hasta | range popover |
| All (2001–Y) | Tout (2001–Y) | Todo (2001–Y) | |
| Since 2012 (VIIRS era) | Depuis 2012 (ère VIIRS) | Desde 2012 (era VIIRS) | |
| Since 2003 (statistics) | Depuis 2003 (statistiques) | Desde 2003 (estadísticas) | |
| Last 10 years / Last 5 years | 10 dernières années / 5 dernières années | Últimos 10 años / Últimos 5 años | |
| Reset | Réinitialiser | Restablecer | |
| date range | période | período | |
| record month | mois record | mes récord | |
| Blank cells after … | Cases vides après … | Celdas vacías después de … | |
| partial year, to <month> | année partielle, jusqu’en <mois> | año parcial, hasta <mes> | from metrics.js (`partialLabel`), wrap at display layer |
| N times a typical <month> | N fois un <mois> typique | N veces un <mes> típico | |
| above / below typical | au-dessus / en dessous du typique | por encima / por debajo de lo típico | |

## 7. Overview, Evidence, How it works, Method

| English | Français | Español | note |
|---|---|---|---|
| NASA fire satellites · the 2012 change | Satellites de feux de la NASA · le changement de 2012 | Satélites de fuego de la NASA · el cambio de 2012 | |
| Show the raw record / Back to harmonized | Voir la série brute / Revenir à l'harmonisé | Ver el registro crudo / Volver al armonizado | |
| Tap to see the raw record | Touchez pour voir la série brute | Toque para ver el registro crudo | |
| Independent check: official area burned | Vérification indépendante : superficie brûlée officielle | Verificación independiente: área quemada oficial | |
| Québec reference zone | Zone de référence du Québec | Zona de referencia de Quebec | ES writes "Quebec" without accent |
| How it is computed | Comment c'est calculé | Cómo se calcula | |
| What is robust | Ce qui est robuste | Lo que es robusto | |
| Robust: the correction factor. | Robuste : le facteur de correction. | Robusto: el factor de corrección. | |
| No rise for this zone. | Aucune hausse pour cette zone. | Ningún aumento para esta zona. | |
| No harmonized trend for this zone. | Aucune tendance harmonisée pour cette zone. | Ninguna tendencia armonizada para esta zona. | |
| Limits | Limites | Límites | |
| What the map shows | Ce que montre la carte | Lo que muestra el mapa | |
| A record is one year, not a trend. | Un record, c'est une année, pas une tendance. | Un récord es un año, no una tendencia. | keep |
| Chance range, not a benchmark. | Plage du hasard, pas une référence. | Rango del azar, no un punto de referencia. | |
| Sensitivity | Sensibilité | Sensibilidad | |
| What a ratio cannot recover. | Ce qu'un ratio ne peut pas retrouver. | Lo que una razón no puede recuperar. | |
| Questions an expert will ask | Questions qu'un expert posera | Preguntas que hará un experto | |
| Counts or burned area? | Comptages ou superficie brûlée ? | ¿Conteos o área quemada? | |
| Fire size and biome? | Taille des feux et biome ? | ¿Tamaño del fuego y bioma? | |
| MODIS orbit drift? | Dérive de l'orbite de MODIS ? | ¿Deriva de la órbita de MODIS? | |
| Overpass time? | Heure de passage ? | ¿Hora de paso? | |
| Scan angle and cloud? | Angle de balayage et nuages ? | ¿Ángulo de barrido y nubes? | |
| Data / References | Données / Références | Datos / Referencias | |
| Resid. × | Résid. × | Resid. × | allowed abbreviation (table header) |
| Too few places to read records here. | Trop peu de cases pour lire des records ici. | Muy pocas celdas para leer récords aquí. | |
| Too few detections here: no claim | Trop peu de détections ici : aucune conclusion | Muy pocas detecciones aquí: ninguna conclusión | |
| no detections before 2012 to compare with | aucune détection avant 2012 pour comparer | ninguna detección antes de 2012 para comparar | guard G3 |
| only N fire detections a year before 2012, too few for a baseline (M needed) | seulement N détections de feux par an avant 2012, trop peu pour une référence (M nécessaires) | solo N detecciones de fuego por año antes de 2012, muy pocas para una línea de base (se necesitan M) | guard G1 |
| Aqua alone reads x× and the harmonized record y×: they point opposite ways | Aqua seul donne x× et la série harmonisée y× : ils vont en sens opposés | Solo Aqua da x× y el registro armonizado y×: van en sentidos opuestos | guard G5 |
| the 90% range (a–b) spans more than ×10 | la plage à 90 % (a–b) dépasse ×10 | el rango del 90 % (a–b) supera ×10 | guard G2 |
| ratio r is above the 4× limit for harmonizing | le ratio r dépasse la limite de 4× pour l'harmonisation | la razón r supera el límite de 4× para armonizar | guard G4 |
| no month-by-month check / the month-by-month check has N months, median error E | pas de vérification mois par mois / la vérification mois par mois compte N mois, erreur médiane E | sin verificación mes a mes / la verificación mes a mes tiene N meses, error mediano E | guard G6 |

## 8. Headline verbs (changeVerb) and fractions

| English | Français | Español | note |
|---|---|---|---|
| roughly doubled | ont à peu près doublé | aproximadamente se duplicaron (never "casi": the figure can be slightly above double) | subject: les détections de feux / las detecciones de fuego |
| tripled | ont triplé | se triplicaron | |
| quadrupled | ont quadruplé | se cuadruplicaron | |
| fell | ont baissé | bajaron | |
| rose | ont augmenté | subieron | |
| barely changed | ont à peine changé | apenas cambiaron | |
| really rose, N times | ont vraiment augmenté, N fois | realmente subieron, N veces | |
| Simply joining the two satellite records shows … | Mettre simplement bout à bout les deux séries satellitaires donne … | Unir simplemente los dos registros satelitales muestra … | |
| about twice as many | environ deux fois plus | alrededor del doble | |
| N-fold | N fois | N veces | |
| almost all / half / a third / a quarter / two thirds / three quarters | presque tout / la moitié / un tiers / un quart / deux tiers / trois quarts | casi todo / la mitad / un tercio / un cuarto / dos tercios / tres cuartos | shareWords |
| whether it really rose is uncertain | on ne sait pas si elle a vraiment augmenté | no es seguro que realmente haya subido | keep uncertain |

## 9. Units and small words

| English | Français | Español | note |
|---|---|---|---|
| place / places | case / cases | celda / celdas | 0.5° square |
| month / months | mois / mois | mes / meses | |
| year / years | année(s) / an(s) | año / años | "per year" → par an / por año |
| a year (rate) | par an | por año | |
| times (×) | fois | veces | |
| N° × M° · K places | N° × M° · K cases | N° × M° · K celdas | boxSize |
| N / S / E / W | N / S / E / O | N / S / E / O | W → O in both |
| vs | vs | vs. | |
| and / or | et / ou | y / o | |
| median | médiane | mediana | |
| percentile | centile | percentil | "5th–95th percentile" → 5e–95e centile / percentil 5–95 |
| Light / Dark | Clair / Sombre | Claro / Oscuro | |

## 10. Never translated

FireBridge, NASA, FIRMS, MODIS, VIIRS, S-NPP, NOAA-20, Terra, Aqua, CONAE, MCD14ML, VNP14IMGT, VJ114IMGT, NFD; file
names (`firebridge_hotspots_<name>.csv` …); CSV column names and the contents of every exported file (exports stay in
English so the files are identical in every language; only the menu labels are translated); URL hash parameters (`z`,
`c`, `b`, `v`, `m`, `l`, `f`, `t`, `tab`, `step`, `panel`, `cv`, `anim`, `guide`…) and their values (`canada`,
`raw`, `harmonized`, `det`, `rec`, `ratio`, `month`, `overview`, `dash`…); CSS class names, ids, `data-*`
attributes, keys used in logic (`'uncertain'`, `'robust'`, `'borrowed'`, layer `value`s, rule ids, `gradeWhy`);
keyboard keys (R, H, A, 1–5, Shift, +, −, 0). Place names keep their local spelling (Québec in FR, Quebec in ES;
Córdoba, La Rioja, Chilecito, Buenos Aires, Sherbrooke, Yellowknife…); country names translate: Canada / Canadá,
Argentina / Argentine (FR) / Argentina (ES).

## 11. Formatting rules

### Numbers
- Never format by hand: use the functions of `src/l10n.js` in your language copy (written by `node scripts/lang.mjs fork`; recipe in i18n/README.md): `num`, `dec`, `X`, `pct`, `spct`, `PS`, `ord`, `monthLong`, `monthShort`, `monthYear`, `monthYearShort`, `endLabelL`, `partialLabelL`, `tm`, `trMonthsIn`, `cap`. They implement every rule below.
- Negative numbers use the minus sign U+2212 ("−0,3") in FR and ES.
- The VALUES never change: only their display. Never round differently from the English.
- Decimal comma in both languages: "2,0×", "4,2×", "0,7×", "1,30–2,92".
- "×" follows the number directly, no space, in FR and ES (same as EN): "2,0×", not "2,0 ×".
- Thousands: FR narrow no-break space U+202F ("81 333", "1 947"); ES point ("81.333") but NO separator for
  4-digit numbers ("1947", RAE). Years are never grouped in any language ("2012", never "2 012" / "2.012").
- Percent: FR "55 %" with U+202F before "%"; ES "55 %" with U+00A0 before "%" (RAE). "<1 %" accordingly.
- Ranges: en dash without spaces between plain numbers or years ("2001–2025", "1,30–2,92"); with spaces when an
  item contains a space ("janv. 2001 – déc. 2025", "ene. 2001 – dic. 2025").
- Ordinals: FR 1er, 2e, 3e (1re for a feminine noun); ES 1.º, 2.º — or rephrase to avoid them.
- Coordinates: "47,5°–52,5° N · 80°–68° O" in both FR and ES (W → O); N, S, E unchanged.

### Months
| # | EN long | FR long | FR short | ES long | ES short |
|---|---|---|---|---|---|
| 1 | January | janvier | janv. | enero | ene. |
| 2 | February | février | févr. | febrero | feb. |
| 3 | March | mars | mars | marzo | mar. |
| 4 | April | avril | avr. | abril | abr. |
| 5 | May | mai | mai | mayo | may. |
| 6 | June | juin | juin | junio | jun. |
| 7 | July | juillet | juil. | julio | jul. |
| 8 | August | août | août | agosto | ago. |
| 9 | September | septembre | sept. | septiembre | sept. |
| 10 | October | octobre | oct. | octubre | oct. |
| 11 | November | novembre | nov. | noviembre | nov. |
| 12 | December | décembre | déc. | diciembre | dic. |

- One short form per language: the table above, used everywhere a short month appears (calendar axis, range
  selects, chips, readout). Month names are lowercase; capitalise only at the start of a sentence or a label
  ("Sept. 2019" as a chip that starts a label → "Sept. 2019"; inside a sentence → "sept. 2019").
- Dates: FR "octobre 2026", ES "octubre de 2026"; short forms in chips: FR "oct. 2026", ES "oct. 2026" (no "de").

### Typography
- Sentence case for every title and label (no Title Case).
- Quotes: FR « … » with U+202F inside the guillemets; ES “…”.
- FR: U+202F narrow no-break space before ; : ! ? and inside « » (Québec usage tolerates none before ; ! ?, but be
  consistent: use U+202F before all four).
- Keep the middle dot " · " separators and the em dash in the kicker as in the English.

### Register and honesty
- Plain, short sentences for a non-specialist reader.
- Spanish: neutral Latin American, comfortable for readers in Argentina (the challenge author is CONAE). No vosotros.
  Buttons and menu items use the infinitive ("Descargar", "Ver la evidencia"); instructions in running text use
  "usted" forms ("Elija un mes").
- French: neutral international, comfortable for readers in Québec (no France-only idioms). Buttons and menu items use
  the infinitive ("Télécharger", "Voir les preuves"); instructions in running text use "vous" ("Choisissez un mois").
- Honesty rules carry over: an uncertain trend is called uncertain; no claim is strengthened by translation
  ("roughly doubled" keeps its "roughly"); "by construction" (par construction / por construcción) and "not a
  validation" (ce n'est pas une validation / no es una validación) stay explicit; no cause is guessed for high ratios.

### Length
- Fixed-size places — verdict strip, pills, tab bar, chips, legends, menu titles, calendar header, map layer buttons
  — must stay within ~+15 % of the English length. Check with `node scripts/lang.mjs check <lang>`.
- Prefer a shorter synonym over an abbreviation. Allowed abbreviations: the short months above; FR "env." (environ),
  "nb" (nombre); ES "aprox.", "n.º"; "Resid." / "Résid." in table headers; "Harm." / "Arm." only where the English
  already writes "Harm.". Not allowed: any other truncated word ("harm." in running text, "sem.", "corr.", "déc." for
  "décennie"…).
- Known long-risk labels and their short alternates: How it works → Fonctionnement / Cómo funciona; Matches official
  area burned → Concorde avec l'officiel / Coincide con lo oficial; Nearest data → Plus proches / Más cercanos;
  Presets → Zones / Zonas; Record years (short) → Records / Récords; Try a larger box → Zone plus grande / Zona más
  grande.
