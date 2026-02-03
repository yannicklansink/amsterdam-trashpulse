## PRD — **TrashPulse Amsterdam**

Een “live stadsradar” die laat zien waar **Afval-frictie** nú oploopt: kaart + ticker + scorebord. Minimalistisch, addictief, één idee per scherm.

### 1) Doel

* Maak Amsterdam *voelbaar* via openbare data: meldingen (menselijk gedrag) + containers (fysieke infra).
* Output: **hotspots**, **trends**, **backlog**, en een **Trash Pressure Score** per buurt/cluster.

### 2) Doelgroep

* Nieuwsgierige Amsterdammers (scroll-waardig)
* Journalisten / stadsgeeks / beleidsnerds
* Jij: als “Riley-style” portfolio-piece met echte urban data

---

## 3) Data (waar te lezen + wat we gebruiken)

### A) Meldingen openbare ruimte (MORA / SIA)

* Docs + velden + bulk downloads + REST/WFS/MVT staan hier. ([api.data.amsterdam.nl][1])
* Bevat subset van meldingen vanaf **medio 2018** en o.a. hoofdcategorie **Afval**. ([api.data.amsterdam.nl][1])
* Belangrijke velden (voor MVP):

  * `hoofdcategorie`, `subcategorie`, `datumMelding`, `tijdstipMelding`
  * `externeStatus` (open/afgesloten), `kpiAfhandeltijd`, `doorlooptijdDagen`
  * geo + gebied (buurt/wijk/stadsdeel) ([api.data.amsterdam.nl][1])

### B) Huishoudelijk afval: containers + weeggegevens

* Locaties containers worden **dagelijks bijgewerkt**; bevat fracties (Rest/Papier/Glas/Textiel, etc.) en **weeggegevens**. ([api.data.amsterdam.nl][2])
* Belangrijke velden:

  * `cluster`, `status`, `fractieCode/Omschrijving`, `geometrie` ([api.data.amsterdam.nl][2])

### C) API key (praktisch)

* Je kunt (nu/straks) een API key nodig hebben; requests moeten `X-Api-Key` header (of `x-api-key` query param) ondersteunen. ([keys.api.data.amsterdam.nl][3])

### D) Catalogus (vindbaarheid / uitbreiden later)

* Alle dataproducten overzicht. ([data.amsterdam.nl][4])

**Endpoints (voor de AI agent om direct te gebruiken):**

```text
# Meldingen (REST + exports)
https://api.data.amsterdam.nl/v1/meldingen/meldingen
https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=geojson
https://api.data.amsterdam.nl/v1/meldingen/meldingen?_format=csv

# Meldingen (MVT tiles — supersnel voor kaart)
https://api.data.amsterdam.nl/v1/mvt/meldingen/tilejson.json
https://api.data.amsterdam.nl/v1/mvt/meldingen/meldingen/{z}/{x}/{y}.pbf

# Huishoudelijk afval (containers)
https://api.data.amsterdam.nl/v1/huishoudelijkafval/container
https://api.data.amsterdam.nl/v1/huishoudelijkafval/container?_format=geojson
https://api.data.amsterdam.nl/v1/wfs/huishoudelijkafval/?expand=bag_hoofdadres_verblijfsobject
```

([api.data.amsterdam.nl][1])

---

## 4) Product: schermen + UX

### Scherm 1 — **Live Map**

* Basemap + 2 lagen:

  1. Meldingen (default: laatste 24 uur, filter `hoofdcategorie=Afval`)
  2. Containers (punten; kleur/icoon per fractie)
* Interacties:

  * Hover: snelle tooltip (subcategorie, tijd, status)
  * Click: detail drawer + “nearby” (meldingen in radius)

### Scherm 2 — **Ticker (Live feed)**

* Rechts: laatste 50 meldingen (auto-refresh iedere 30–60s)
* Elke regel: `subcategorie · buurt · tijd · open/afgesloten`
* Klik = zoom naar punt op kaart.

### Scherm 3 — **Pressure**

* Ranglijst: “Top 20 hotspots” op basis van **Trash Pressure Score**
* Toggle: per **buurt**, per **container cluster**, of per **100m hex grid**

### Scherm 4 — **Ops (Backlog)**

* Scorebord per stadsdeel:

  * open count
  * % “over tijd” (via `kpiAfhandeltijd`)
  * mediane `doorlooptijdDagen`
* Mini-trend: laatste 7 dagen.

---

## 5) Kernlogica

### Filters

* `timeRange`: 1h / 24h / 7d / 30d
* `hoofdcategorie` default Afval (uitbreidbaar)
* `subcategorie` multi-select
* `status` open / afgesloten

### Trash Pressure Score (MVP-formule)

Kies één consistent model; simpel, explainable:

* **Hex/cluster score**
  `score = count(meldingen binnen area, laatste 7d, hoofdcategorie=Afval, status=open) + 0.25 * count(afgesloten laatste 7d)`
* **Container-cluster score (v1.1)** (als je weeg/lediging netjes kunt modelleren):
  `score = meldingen binnen 150m (7d) / (1 + #weegmomenten(7d))`

---

## 6) Functionele requirements

**Must-have (MVP)**

* Kaart met MVT meldingen (performance)
* Containers overlay (geojson)
* Ticker + detail drawer
* Hotspots top-20 (hex/cluster aggregatie)
* Shareable URL state (`?range=7d&sub=...&view=pressure`)

**Should-have**

* “Today’s Weird”: top stijgende subcategorieën (uur-op-uur)
* Kleine daily snapshot (static image / permalink)

**Won’t (nu)**

* User accounts, comments, alerts/push
* Predictive modeling (kan later)

---

## 7) Niet-functionele requirements

* **Perf:** kaart moet soepel blijven bij veel punten → MVT voor meldingen. ([api.data.amsterdam.nl][5])
* **Kosten:** serverless-friendly; zoveel mogelijk client-side + lichte API.
* **Reliability:** degrade gracefully als API key ontbreekt/expired.
* **Privacy/praktisch:** toon alleen wat dataset al publiceert; geen “reverse geocoding naar exact adres”.

---

## 8) Tech ontwerp (aanbevolen)

**Frontend**

* Next.js (App Router)
* MapLibre GL (of Mapbox GL) met TileJSON + vector tiles
* UI: minimal (1–2 fonts, donkere modus optioneel)

**Backend (minimaal)**

* Eén Next.js route `/api/feed`:

  * haalt laatste N meldingen op uit REST endpoint (met filters)
  * cache 30s (edge cache)
* Eén route `/api/aggregate`:

  * simpele aggregaties (hex grid) op basis van bounding box + time range
  * kan ook client-side als dataset klein genoeg is voor gekozen range

**Storage (optioneel, v1.1)**

* Postgres + PostGIS als je:

  * backfill (2018–nu) wil
  * snellere aggregaties wil
  * weekly digests wil precomputen

---

## 9) “Wat heeft een AI Agent nodig om dit te bouwen?”

### Inputs / Config

* `AMSTERDAM_API_KEY` (optioneel maar voorbereiden) + header `X-Api-Key`. ([keys.api.data.amsterdam.nl][3])
* TileJSON URL voor meldingen. ([api.data.amsterdam.nl][5])

### Takenlijst voor de agent (ordered)

1. **Repo scaffold**

   * Next.js app + env handling + lint
2. **Map implementeren**

   * MapLibre setup
   * MVT source: tilejson → layer styling per status (open/closed)
3. **Containers overlay**

   * Fetch geojson containers, render as circles, filter op fractie
4. **Ticker**

   * `/api/feed?range=24h&cat=Afval`
   * Polling + optimistic UI
5. **Detail drawer**

   * On click: fetch melding detail (of gebruik properties uit vector tile als genoeg)
6. **Hotspot aggregatie**

   * Client-side: turf.js hex grid + point-in-polygon counts
   * Of server-side: simple aggregation endpoint
7. **Shareable state**

   * URL params ↔ UI state
8. **Deploy**

   * Vercel config + edge caching
   * Basic monitoring logs

### Definition of done (agent)

* Live map + ticker werkt end-to-end
* Pressure view toont top hotspots en update bij time range
* Geen console errors, snelle load, mobile ok

---

## 10) Milestones

* **M0 (1 dag):** map + MVT meldingen laag
* **M1 (2–3 dagen):** ticker + filters + shareable links
* **M2 (1 week):** pressure view + backlog scorebord
* **M3 (week 2):** weekly digest + “Today’s Weird”

---

[1]: https://api.data.amsterdam.nl/v1/docs/datasets/meldingen.html "Meldingen over de Openbare Ruimte in Amsterdam — Amsterdam Datapunt API Documentatie"
[2]: https://api.data.amsterdam.nl/v1/docs/datasets/huishoudelijkafval.html "Afvalcontainers, putten en weeggegevens — Amsterdam Datapunt API Documentatie"
[3]: https://keys.api.data.amsterdam.nl/clients/v1/docs/ "API Key usage"
[4]: https://data.amsterdam.nl/catalogus?utm_source=chatgpt.com "Catalogus - Data en informatie - Data Amsterdam"
[5]: https://api.data.amsterdam.nl/v1/mvt/meldingen/?utm_source=chatgpt.com "Meldingen over de Openbare Ruimte in Amsterdam MVT - API's"
