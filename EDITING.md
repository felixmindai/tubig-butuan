# Unsaon pag-update sa datos · How to update the data

Ang tanang datos naa sa folder nga `data/`. Wala kay kinahanglan nga programmer aron mo-update.
All data lives in the `data/` folder. You do not need to be a programmer to update it.

**Bisaya:** Ablihi ang file sa GitHub, i-click ang lapis (✏️) nga icon, usba ang sulod, dayon i-click ang **Commit changes**. Sulod sa usa ka minuto, ma-update na ang site.

**English:** Open the file on GitHub, click the pencil (✏️) icon, edit, then click **Commit changes**. The site updates within about a minute.

Importante / Important:
- Gamita ang straight quotes `"` dili ang curly `“ ”`. Use straight quotes only.
- Ang matag entry gibulag og comma `,` gawas sa kataposan. Every entry is separated by a comma, except the last one.
- Kung dili sigurado, i-paste ang file sa https://jsonlint.com aron masusi. If unsure, paste the file into https://jsonlint.com to check it.

---

## 1. `data/schedule.json` — iskedyul sa tanker / tanker schedule

Kini ang pinakasagad nga i-update, matag adlaw human mo-post ang PIO. This is the file updated most often, every day after the PIO posts.

```json
{
  "updated": "2026-09-08",
  "source": "Butuan City PIO, Sept 8, 2026",
  "sourceUrl": "https://www.facebook.com/ButuanCityPIO",
  "stops": [
    { "date": "2026-09-08", "barangay": "Lumbocan", "where": "Purok 1, atbang sa chapel", "start": "09:00", "end": "09:40", "tanker": "Equiparco Tanker 2", "lat": null, "lng": null },
    { "date": "2026-09-08", "barangay": "Masao", "where": "Barangay hall", "start": "13:50", "end": "14:25", "tanker": "Equiparco Tanker 2", "lat": null, "lng": null },
    { "repeat": "daily", "barangay": "Maon", "where": "Barangay hall", "start": "08:30", "end": "10:00", "tanker": "CDRRMD Tanker 1", "lat": null, "lng": null }
  ]
}
```

| Field | Bisaya | English |
|---|---|---|
| `date` | Petsa, `YYYY-MM-DD`. Ipakita lang sa maong adlaw. | Date, `YYYY-MM-DD`. Shown only on that day. |
| `repeat` | `"daily"` kung matag adlaw. Gamita imbis `date`. | `"daily"` for every day. Use instead of `date`. |
| `days` | Optional: `["mon","wed","fri"]` | Optional: which weekdays |
| `barangay` | Ngalan sa barangay, sama sa PIO post (pananglitan `"Villa Kananga"`, `"Bit-os"`, `"Baan KM 3"`). | Barangay name as the PIO writes it. |
| `where` | Purok, landmark, o dalan. | Purok, landmark, or street. |
| `start`, `end` | Oras sa 24-hour format, `"HH:MM"`. | 24-hour time, `"HH:MM"`. |
| `tanker` | Ngalan sa tanker (optional). | Tanker name (optional). |
| `lat`, `lng` | Coordinates kung nahibal-an; kung `null`, ibutang sa sentro sa barangay. | Coordinates if known; if `null`, pinned at the barangay centre. |

Tan-awa ang `data/schedule.example.json` para sa mas daghang pananglitan. See `data/schedule.example.json` for more examples.

Pag-kuha og coordinates / Getting coordinates: sa Google Maps, i-long-press ang lugar; makita ang numero sama sa `8.9557, 125.5470`. Ang una `lat`, ang ikaduha `lng`.

---

## 2. `data/status.json` — kahimtang sa suplay / supply status

```json
{
  "updated": "2026-09-07",
  "asOf": "2026-09-04",
  "supplyMld": 37.36,
  "normalMld": 55,
  "damLevelM": 3.58,
  "damAsOf": "2026-08-24",
  "damCriticalM": 4,
  "calamity": true,
  "calamitySince": "2026-09-05",
  "resolution": "SP Resolution No. 17-444-2026",
  "affectedBarangays": 58,
  "affectedResidents": 91425,
  "affectedList": ["Masao", "San Vicente", "Libertad"],
  "source": "BCWD report, Sept 4, 2026",
  "sourceUrl": "https://..."
}
```

- `supplyMld` — suplay karon sa MLD (million liters per day) gikan sa BCWD. Current BCWD supply.
- `damLevelM` — lebel sa dam sa Taguibo sa metros. Taguibo dam level in metres.
- `affectedList` — listahan sa mga barangay nga apektado; makulayan sa mapa. List of affected barangays; they get colored on the map. Pwede biyaan nga `[]`. Can be left as `[]`.
- `calamity` — `true` o `false`.

---

## 3. `data/stations.json` — sag-ob stations

```json
{ "id": "ps1", "name": "Pump Station No. 1 – Alviola Village", "barangay": "Baan KM 3", "type": "fetch", "hours": [["06:00", "18:00"]], "lat": null, "lng": null, "note": { "ceb": "Para sa residential", "en": "Residential" } }
```

- `type` — `"fetch"` para sa sag-ob, `"bulk"` para sa bulk sales.
- `hours` — listahan sa mga oras nga abli, pananglitan `[["06:00","12:00"],["14:00","18:00"]]`. Wala nga hours = "sumala sa kasabotan".
- Kung naa kay tukma nga `lat`/`lng`, ibutang aron sakto ang pin sa mapa. Add exact coordinates when known so the pin is accurate.

---

## 4. `data/hotlines.json` — mga numero / phone numbers

```json
{ "label": "Globe", "tel": "09171888726", "sms": true }
```

- `tel` — numero lang, walay dash o space. Digits only, no dashes or spaces.
- `sms: true` — ipakita ang Text button. Shows the Text button.
- `urgent: true` sa grupo — pula nga border. Red border on the group card.
- `pioUrl` — link sa Facebook page sa Butuan City PIO. Usba kung sayop. Fix if wrong.

---

## Mga ngalan sa barangay nga masabtan sa site / Barangay names the site understands

Ang site mo-ila sa ngalan bisan lahi ang capitalization o naay `Brgy.` sa una. Kining mga alias masabtan sab: `Villakanangga`, `Sto. Niño`, `Port Poyohon`, `New Asia`, `Baan`.

The 86 barangays as spelled in the map data:

Agao, Agusan Pequeño, Ambago, Amparo, Ampayon, Anticala, Antongalon, Aupagan, Baan KM 3, Baan Riverside, Babag, Bading, Bancasi, Banza, Baobaoan, Basag, Bayanihan, Bilay, Bit-os, Bitan-agan, Bobon, Bonbon, Bugabus, Bugsukan, Buhangin, Cabcabon, Camayahan, Dagohoy, Dankias, De Oro, Diego Silang, Don Francisco, Doongan, Dulag, Dumalagan, Florida, Golden Ribbon, Holy Redeemer, Humabon, Imadejas, Jose Rizal, Kinamlutan, Lapu-lapu, Lemon, Leon Kilat, Libertad, Limaha, Los Angeles, Lumbocan, Maguinda, Mahay, Mahogany, Maibu, Mandamo, Manila de Bugabus, Maon, Masao, Maug, New Society Village, Nong-nong, Obrero, Ong Yiu, Pagatpatan, Pangabugan, Pianing, Pigdaulan, Pinamanculan, Port Poyohon (New Asia), Rajah Soliman, Salvacion, San Ignacio, San Mateo, San Vicente, Santo Niño, Sikatuna, Silongan, Sumile, Sumilihon, Tagabaca, Taguibo, Taligaman, Tandang Sora, Tiniwisan, Tungao, Urduja, Villa Kananga.

Kung ang ngalan dili mailhan, dili makita ang stop sa site. If a name is not recognized, that stop will not appear on the site.
