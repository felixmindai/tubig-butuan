/* Tubig Butuan — app logic. Bisaya first, English second.
   Everything reads from data/*.json so volunteers can update the site
   without touching code. See EDITING.md. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

  /* ---------------- strings ---------------- */
  const STR = {
    ceb: {
      offline: 'Offline ka karon. Gipakita ang kataposang na-save nga datos.',
      kicker: 'Kahimtang sa suplay sa tubig',
      titleCalamity: 'Butuan City ubos sa State of Calamity tungod sa kakulang sa tubig',
      titleNormal: 'Kahimtang sa tubig sa Butuan City',
      since: 'sukad',
      supplyLabel: 'Suplay karon sa BCWD',
      damLabel: 'Lebel sa dam sa Taguibo',
      markNormal: 'normal', markCritical: 'kritikal',
      supplySub: '{pct}% sa normal nga {normal} MLD · sukad {date}',
      damSub: 'Kritikal kung ubos sa {crit} m · sukad {date}',
      factBgy: 'ka barangay apektado', factRes: 'ka residente apektado', factCal: 'State of Calamity sukad', factSrc: 'Tinubdan',
      tabMap: 'Mapa', tabSchedule: 'Iskedyul', tabStations: 'Estasyon', tabHotlines: 'Hotline', tabGuide: 'Giya', tabReport: 'Isumbong',
      mapTitle: 'Mapa sa Butuan', loading: 'Nagkarga sa mapa…',
      mapHint: 'I-tap ang barangay aron makita ang iskedyul niini. Pinch o scroll aron mo-zoom.',
      legStops: 'Naay tanker karon', legStopsLast: 'Tanker sa kataposang iskedyul', legAff: 'Apektado (BCWD)', legSel: 'Napili', legSt: 'Sag-ob station', legTk: 'Tanker stop',
      staleSched: 'Wala pay iskedyul nga na-post para karong adlawa. Gipakita ang kataposang na-post: {date}.',
      noSchedBgyLast: 'Walay tanker stop para sa Brgy. {bgy} sa kataposang iskedyul ({date}).',
      stopsInBgyLast: '{n} ka tanker stop sa iskedyul sa {date}',
      shareSchedLast: 'Kataposang iskedyul sa tanker ({date}), Brgy. {bgy}:',
      directions: 'Direksyon', showOnMap: 'Ipakita sa mapa', viewSched: 'Tan-awa ang iskedyul',
      stopsInBgy: '{n} ka tanker stop karong adlawa', noStopsInBgy: 'Walay tanker stop nga na-post karong adlawa',
      schedTitle: 'Iskedyul sa tanker', pickBgy: 'Pilia ang imong barangay', pickPlaceholder: '— Pilia ang barangay —',
      pickFirst: 'Pilia una ang imong barangay aron makita ang iskedyul sa tanker.',
      noSchedBgy: 'Walay gi-post nga iskedyul sa tanker para sa Brgy. {bgy} karong adlawa.',
      noSchedAll: 'Wala pay iskedyul sa tanker nga na-post para karong adlawa.',
      checkPio: 'Susiha ang Butuan City PIO →',
      stopNow: 'KARON', stopPast: 'nahuman na', stopApprox: 'gibanabana ang lokasyon',
      share: 'Ipaambit', copy: 'Kopyaha', copied: 'Nakopya na!', preview: 'Tan-awa ang mensahe nga ipaambit',
      schedSource: 'Tinubdan: {src} · gi-update {date}',
      shareSched: 'Iskedyul sa tanker, Brgy. {bgy}:', shareNoSched: 'walay iskedyul nga na-post karong adlawa',
      shareSupply: 'Suplay sa BCWD: {mld} MLD (normal {normal} MLD)', shareStations: 'Sag-ob stations (dad-a ang resibo ug sudlanan):',
      stationsTitle: 'Sag-ob stations',
      stationsIntro: 'Oplan Sag-Ob sa BCWD: pwede ka mokuha og tubig dinhi kung walay suplay sa inyong lugar.',
      open: 'Abli karon', closed: 'Sirado karon', bulk: 'Bulk', hours: 'Oras', byArrangement: 'sumala sa kasabotan sa BCWD',
      bringItems: ['Resibo o Statement of Account sa BCWD', 'Limpyo nga sudlanan (galon o timba nga naay taklob)', 'Limit: 1 cubic meter (1,000 L) matag account matag adlaw', 'Pabukala ang tubig una imnon'],
      approxNote: 'Gibanabana ang lokasyon sa mapa (sentro sa barangay). Kumpirmaha sa BCWD.',
      stationsSource: 'Tinubdan: {src} · gi-update {date}',
      hotTitle: 'Mga hotline', call: 'Tawag', sms: 'Text',
      hallTitle: 'Barangay hall nimo', hallHint: 'Isulod ang numero sa inyong barangay hall aron ma-save dinhi sa imong telepono.',
      hallPlaceholder: 'pananglitan 0917 123 4567', save: 'I-save', saved: 'Na-save na.',
      guideTitle: 'Giya sa luwas nga tubig', boilTitle: 'Pabukala ang tubig', conserveTitle: 'Daginota ang tubig',
      boilSteps: [
        { b: 'Sala-a una kung lubog', s: 'Ipaagi sa limpyo nga panapton aron matangtang ang lapok ug hugaw.' },
        { b: 'Pabukala og maayo', s: 'Kung mobukal na og kusog, ipadayon og 2 ka minuto. Kini ang giya sa DOH.' },
        { b: 'Ipabugnaw nga natakpan', s: 'Ayaw butangi og yelo nga gikan sa tubig nga wala pabukala.' },
        { b: 'Tipigi sa limpyo nga sudlanan nga naay taklob', s: 'Gamita og kabo nga naay kuptanan. Ayaw isawom ang kamot. Gamita sulod sa 24 ka oras.' },
        { b: 'Walay gas o kahoy? Gamit og chlorine', s: '2 ka tulo sa ordinaryo nga household bleach (5%) sa matag 1 litro, kutawa, ug hulata og 30 minuto. Ayaw gamita ang bleach nga naay pahumot.' },
        { b: 'Bantayi ang kalibanga', s: 'Labi na sa mga bata ug tigulang. Hatagi og ORS (o tubig nga naay asin ug asukar) ug adto dayon sa barangay health station.' }
      ],
      conserveSteps: [
        { b: 'Unaha ang inom, luto, ug hugas sa kamot', s: 'Kini ang dili pwede kuhaan. Dinhi una gamita ang limpyo nga tubig.' },
        { b: 'Timba, dili shower', s: 'Ang usa ka timba (10 L) igo na sa usa ka ligo. Ang shower mokonsumo og 60 L o kapin.' },
        { b: 'Gamita pag-usab ang tubig sa hugas', s: 'Tubig gikan sa hugas sa bugas, panapton, ug plato pwede sa kasilyas ug sa tanom.' },
        { b: 'Ayoha ang mga tulo', s: 'Ang usa ka gripo nga nagtulo mawad-an og mga 20 L sa usa ka adlaw. Isumbong sa BCWD ang leak sa dalan.' },
        { b: 'Pun-a ang sudlanan kung naay presyon, apan ayaw pasobra', s: 'Ang sobra nga pag-imbak makapahinay sa tubig sa mga silingan nga mas layo sa linya.' },
        { b: 'Tabangi ang dili makapila', s: 'Tigulang, dialysis patients, ug pamilya nga naay gagmay nga bata. Isulti sa barangay kung kinahanglan nila og tanker stop.' }
      ],
      reportTitle: 'Isumbong ang leak o walay tubig',
      reportIntro: 'Ang matag leak nga naayo, suplay nga nabawi. Ang mensahe ipadala gikan sa imong telepono ngadto sa BCWD.',
      reportTypeLabel: 'Unsa ang isumbong?', reportWhereLabel: 'Asa? (purok, landmark, dalan)',
      reportTypes: { leak: 'Leak / buslot nga tubo', nowater: 'Walay tubig', lowpressure: 'Hinay kaayo ang tubig', other: 'Uban pa' },
      reportPrefix: 'REPORT', reportNoBgy: '(pilia ang barangay sa taas)', reportWherePlaceholder: 'pananglitan: Purok 5, atbang sa chapel',
      sendSms: 'Ipadala sa SMS', callBcwd: 'Tawagan ang BCWD',
      disc: 'Dili opisyal nga site sa BCWD o sa City Government. Gimugna sa mga taga-Butuan para sa mga taga-Butuan.',
      sources: 'Tinubdan sa datos: BCWD, Butuan City PIO, City Government of Butuan, PSA/NAMRIA (mapa).',
      dataUpdated: 'Datos gi-update', editLink: 'Unsaon pag-update sa datos',
      geoFail: 'Wala makuha ang imong lokasyon. Ablihi ang GPS ug sulayi pag-usab.',
      geoOutside: 'Wala ka sa sulod sa Butuan City.', youAreIn: 'Naa ka sa Brgy. {bgy}', geoUnsupported: 'Dili suportado ang GPS sa browser nimo.',
      detailedFail: 'Dili ma-load ang detalyadong mapa. Kinahanglan og internet.',
      expandMap: 'Padak-a ang mapa', collapseMap: 'Isira ang dako nga mapa',
      phTime: 'oras sa Butuan',
      archive: 'kopya sa archive',
      seeSource: 'Tan-awa ang eksaktong teksto sa advisory',
      sourceHint: 'Kung morag blangko ang page sa BCWD, i-highlight ang teksto (Ctrl+A o long-press) aron mabasa: puti ang kolor sa ilang teksto.'
    },
    en: {
      offline: 'You are offline. Showing the last saved data.',
      kicker: 'Water supply status',
      titleCalamity: 'Butuan City is under a State of Calamity due to water shortage',
      titleNormal: 'Butuan City water status',
      since: 'since',
      supplyLabel: 'Current BCWD supply',
      damLabel: 'Taguibo dam level',
      markNormal: 'normal', markCritical: 'critical',
      supplySub: '{pct}% of the normal {normal} MLD · as of {date}',
      damSub: 'Critical below {crit} m · as of {date}',
      factBgy: 'barangays affected', factRes: 'residents affected', factCal: 'State of Calamity since', factSrc: 'Source',
      tabMap: 'Map', tabSchedule: 'Schedule', tabStations: 'Stations', tabHotlines: 'Hotlines', tabGuide: 'Guide', tabReport: 'Report',
      mapTitle: 'Butuan map', loading: 'Loading map…',
      mapHint: 'Tap a barangay to see its schedule. Pinch or scroll to zoom.',
      legStops: 'Tanker today', legStopsLast: 'Tanker in the last schedule', legAff: 'Affected (BCWD)', legSel: 'Selected', legSt: 'Fetching station', legTk: 'Tanker stop',
      staleSched: 'No schedule has been posted for today yet. Showing the last one posted: {date}.',
      noSchedBgyLast: 'No tanker stop for Brgy. {bgy} in the last schedule ({date}).',
      stopsInBgyLast: '{n} tanker stop(s) in the {date} schedule',
      shareSchedLast: 'Last tanker schedule ({date}), Brgy. {bgy}:',
      directions: 'Directions', showOnMap: 'Show on map', viewSched: 'View schedule',
      stopsInBgy: '{n} tanker stop(s) today', noStopsInBgy: 'No tanker stop posted for today',
      schedTitle: 'Tanker schedule', pickBgy: 'Choose your barangay', pickPlaceholder: '— Choose a barangay —',
      pickFirst: 'Choose your barangay first to see the tanker schedule.',
      noSchedBgy: 'No tanker schedule has been posted for Brgy. {bgy} today.',
      noSchedAll: 'No tanker schedule has been posted for today yet.',
      checkPio: 'Check Butuan City PIO →',
      stopNow: 'NOW', stopPast: 'done', stopApprox: 'approximate location',
      share: 'Share', copy: 'Copy', copied: 'Copied!', preview: 'Preview the message to share',
      schedSource: 'Source: {src} · updated {date}',
      shareSched: 'Tanker schedule, Brgy. {bgy}:', shareNoSched: 'no schedule posted for today',
      shareSupply: 'BCWD supply: {mld} MLD (normal {normal} MLD)', shareStations: 'Fetching stations (bring your bill and containers):',
      stationsTitle: 'Fetching stations',
      stationsIntro: "BCWD's Oplan Sag-Ob: fetch water here when your area has no supply.",
      open: 'Open now', closed: 'Closed now', bulk: 'Bulk', hours: 'Hours', byArrangement: 'by arrangement with BCWD',
      bringItems: ['BCWD water bill or Statement of Account', 'Clean containers (jugs or covered pails)', 'Limit: 1 cubic meter (1,000 L) per account per day', 'Boil before drinking'],
      approxNote: 'Map position is approximate (barangay centre). Confirm with BCWD.',
      stationsSource: 'Source: {src} · updated {date}',
      hotTitle: 'Hotlines', call: 'Call', sms: 'Text',
      hallTitle: 'Your barangay hall', hallHint: "Enter your barangay hall's number to keep it here on your phone.",
      hallPlaceholder: 'e.g. 0917 123 4567', save: 'Save', saved: 'Saved.',
      guideTitle: 'Safe water guide', boilTitle: 'Boil your water', conserveTitle: 'Save water',
      boilSteps: [
        { b: 'Filter first if cloudy', s: 'Pass it through a clean cloth to remove mud and grit.' },
        { b: 'Bring to a rolling boil', s: 'Once it boils hard, keep it boiling for 2 minutes. This is the DOH guidance.' },
        { b: 'Cool it covered', s: 'Do not add ice made from unboiled water.' },
        { b: 'Store in a clean, covered container', s: 'Use a ladle with a handle. Never dip hands in. Use within 24 hours.' },
        { b: 'No fuel? Use chlorine', s: '2 drops of plain household bleach (5%) per litre, stir, and wait 30 minutes. Never use scented bleach.' },
        { b: 'Watch for diarrhea', s: 'Especially in children and the elderly. Give ORS (or water with salt and sugar) and go to the barangay health station right away.' }
      ],
      conserveSteps: [
        { b: 'Drinking, cooking and handwashing come first', s: 'These are the uses you never cut. Use clean water here before anything else.' },
        { b: 'Bucket, not shower', s: 'One bucket (10 L) is enough for a bath. A shower uses 60 L or more.' },
        { b: 'Reuse rinse water', s: 'Water from rinsing rice, laundry and dishes can flush toilets and water plants.' },
        { b: 'Fix the drips', s: 'One dripping tap wastes about 20 L a day. Report street leaks to BCWD.' },
        { b: 'Fill containers when there is pressure, but do not hoard', s: 'Over-storing drains pressure for neighbours further down the line.' },
        { b: 'Help those who cannot queue', s: 'The elderly, dialysis patients and families with infants. Tell the barangay if they need a tanker stop.' }
      ],
      reportTitle: 'Report a leak or no water',
      reportIntro: 'Every leak repaired is supply recovered. The message is sent from your own phone to BCWD.',
      reportTypeLabel: 'What are you reporting?', reportWhereLabel: 'Where? (purok, landmark, street)',
      reportTypes: { leak: 'Leak / broken pipe', nowater: 'No water', lowpressure: 'Very low pressure', other: 'Other' },
      reportPrefix: 'REPORT', reportNoBgy: '(choose your barangay above)', reportWherePlaceholder: 'e.g. Purok 5, across the chapel',
      sendSms: 'Send via SMS', callBcwd: 'Call BCWD',
      disc: 'Not an official site of BCWD or the City Government. Made by Butuanons for Butuanons.',
      sources: 'Data sources: BCWD, Butuan City PIO, City Government of Butuan, PSA/NAMRIA (map).',
      dataUpdated: 'Data updated', editLink: 'How to update the data',
      geoFail: 'Could not get your location. Turn on GPS and try again.',
      geoOutside: 'You are outside Butuan City.', youAreIn: 'You are in Brgy. {bgy}', geoUnsupported: 'Your browser does not support GPS.',
      detailedFail: 'Could not load the detailed map. It needs internet.',
      expandMap: 'Expand map', collapseMap: 'Close the large map',
      phTime: 'Butuan time',
      archive: 'archived copy',
      seeSource: "See the advisory's exact wording",
      sourceHint: 'If the BCWD page looks blank, highlight the text (Ctrl+A or long-press) to read it: their site prints it in white.'
    }
  };
  const MONTHS = { ceb: ['Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo', 'Hulyo', 'Agosto', 'Septyembre', 'Oktubre', 'Nobyembre', 'Disyembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  const DAYS = { ceb: ['Dominggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  let lang = LS.get('tb.lang', 'ceb'); if (!STR[lang]) lang = 'ceb';
  const t = (k, vars) => {
    let s = STR[lang][k]; if (s === undefined) s = STR.en[k]; if (s === undefined) return k;
    if (typeof s !== 'string') return s;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang] || v.en || v.ceb || '') : (v == null ? '' : String(v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- state ---------------- */
  const state = { bgys: null, status: null, stations: null, schedule: null, hotlines: null, selected: LS.get('tb.bgy', ''), hall: LS.get('tb.hall', '') };
  const normIndex = new Map();
  const norm = (s) => String(s || '').toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]/g, '');
  const ALIASES = { villakanangga: 'villakananga', stonino: 'santonino', stonio: 'santonino', portpoyohon: 'portpoyohonnewasia', newasia: 'portpoyohonnewasia', baankm3: 'baankm3', baan: 'baankm3', agusanpeq: 'agusanpequeno' };
  function buildIndex() {
    for (const f of state.bgys.features) { normIndex.set(norm(f.name), f.id); normIndex.set(norm(f.id), f.id); if (f.pob) normIndex.set('bgy' + f.pob, f.id); }
  }
  function resolveBgy(name) {
    if (!name) return null; let n = norm(name); n = ALIASES[n] || n;
    if (normIndex.has(n)) return normIndex.get(n);
    const n2 = n.replace(/^(brgy|barangay)/, ''); if (normIndex.has(n2)) return normIndex.get(n2);
    return null;
  }
  const bgyName = (id) => { const f = state.bgys.features.find((x) => x.id === id); return f ? f.name : id; };

  /* ---------------- dates ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  // Butuan runs on Philippine Standard Time (UTC+8, no daylight saving). Every "now",
  // "today" and open/closed check uses that clock, not the device's, so the site reads
  // the same for someone checking from abroad or with a wrong phone timezone.
  const PH_OFFSET_MIN = 8 * 60;
  const nowPH = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + PH_OFFSET_MIN) * 60000); };
  const todayKey = () => { const d = nowPH(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const nowMin = () => { const d = nowPH(); return d.getHours() * 60 + d.getMinutes(); };
  const nowClock = () => { const d = nowPH(); return fmtTime(pad(d.getHours()) + ':' + pad(d.getMinutes())); };
  const toMin = (hhmm) => { const p = String(hhmm || '0:0').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
  function fmtDate(iso, withDay) {
    if (!iso) return '—';
    const p = String(iso).split('-').map(Number); if (p.length < 3 || isNaN(p[0])) return iso;
    const dt = new Date(p[0], p[1] - 1, p[2]);
    return (withDay ? DAYS[lang][dt.getDay()] + ', ' : '') + MONTHS[lang][p[1] - 1] + ' ' + p[2] + ', ' + p[0];
  }
  function fmtTime(hhmm) { const p = String(hhmm).split(':').map(Number); const h = p[0], m = p[1] || 0; return (((h + 11) % 12) + 1) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  const fmtRange = (a, b) => b ? fmtTime(a) + '–' + fmtTime(b) : fmtTime(a);
  const fmtNum = (n) => Number(n).toLocaleString('en-PH');
  function fmtTel(tel) {
    const d = String(tel).replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('09')) return d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7);
    if (d.length === 10 && d.startsWith('085')) return '(085) ' + d.slice(3, 6) + '-' + d.slice(6);
    return tel;
  }

  /* ---------------- data ---------------- */
  async function loadJSON(path, fallback) {
    if (window.TB_DATA && window.TB_DATA[path]) return window.TB_DATA[path]; // single-file build
    try { const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    catch (e) { return fallback; }
  }
  function stopsForDate(key) {
    const dow = DOW[nowPH().getDay()];
    return ((state.schedule && state.schedule.stops) || [])
      .map((st) => Object.assign({}, st, { _bgy: resolveBgy(st.barangay) }))
      .filter((st) => st._bgy && st.start && (st.date === key || (key === todayKey() && (st.repeat === 'daily' || (Array.isArray(st.days) && st.days.map((x) => String(x).toLowerCase().slice(0, 3)).includes(dow))))))
      .sort((a, b) => toMin(a.start) - toMin(b.start));
  }
  // What the schedule section shows: today's stops if any were posted, otherwise the most
  // recent published day, clearly labelled as such. Before the day's post is keyed in,
  // yesterday's routes are still the best guide people have.
  function displaySchedule() {
    const key = todayKey();
    const today = stopsForDate(key);
    if (today.length) return { key, stops: today, isToday: true };
    const dates = ((state.schedule && state.schedule.stops) || []).map((s) => s.date).filter((d) => d && d <= key).sort();
    if (!dates.length) return { key, stops: [], isToday: true };
    const last = dates[dates.length - 1];
    return { key: last, stops: stopsForDate(last), isToday: false };
  }
  const todaysStops = () => displaySchedule().stops;
  const stopStatus = (st) => { if (!displaySchedule().isToday) return ''; const now = nowMin(), a = toMin(st.start), b = st.end ? toMin(st.end) : a + 30; return now > b ? 'past' : (now >= a ? 'now' : ''); };
  function isOpen(x) {
    const now = nowMin();
    return (x.hours || []).some(([a, b]) => { const A = toMin(a), B = toMin(b); return B >= A ? (now >= A && now < B) : (now >= A || now < B); });
  }
  const hoursText = (x) => (x.hours && x.hours.length) ? x.hours.map(([a, b]) => fmtRange(a, b)).join(', ') : t('byArrangement');
  function gmapsUrl(o) {
    // With coordinates: turn-by-turn directions to that point. Without: fall back to the
    // barangay centre if the map knows it, and only then to a place-name search.
    let lat = o.lat, lng = o.lng;
    if ((lat == null || lng == null) && mapReady) { const id = resolveBgy(o.barangay); const c = id && window.TubigMap.centroidLL(id); if (c) { lat = c.lat; lng = c.lng; } }
    if (lat != null && lng != null) return 'https://www.google.com/maps/dir/?api=1&destination=' + lat.toFixed(5) + ',' + lng.toFixed(5) + '&travelmode=driving';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Barangay ' + (o.barangay || '') + ', Butuan City');
  }
  const bcwdGroup = () => ((state.hotlines && state.hotlines.groups) || []).find((g) => g.id === 'bcwd');
  const archiveLink = (url) => (url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener" title="Wayback Machine">' + esc(t('archive')) + ' ↗</a>' : '');
  const pioUrl = () => (state.hotlines && state.hotlines.pioUrl) || (state.schedule && state.schedule.sourceUrl) || 'https://www.facebook.com/';

  /* ---------------- render ---------------- */
  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    $('#langBtn').textContent = lang === 'ceb' ? 'EN' : 'BIS';
    document.documentElement.lang = lang === 'ceb' ? 'ceb' : 'en';
    const eb = $('#expandMap'); if (eb) { eb.setAttribute('aria-label', t($('#mapWrap').classList.contains('expanded') ? 'collapseMap' : 'expandMap')); eb.title = eb.getAttribute('aria-label'); }
    $('#supplyMark').dataset.label = t('markNormal');
    $('#damMark').dataset.label = t('markCritical');
    $('#pioLink').href = pioUrl();
  }
  function renderStatus() {
    const s = state.status; if (!s) return;
    $('#statusTitle').textContent = s.calamity ? t('titleCalamity') : t('titleNormal');
    const stamp = $('#stamp'); stamp.classList.toggle('hidden', !s.calamity);
    $('#stampSince').textContent = s.calamity && s.calamitySince ? t('since') + ' ' + fmtDate(s.calamitySince) : '';
    const pct = s.normalMld ? Math.round((s.supplyMld / s.normalMld) * 100) : 0;
    $('#supplyNum').textContent = s.supplyMld != null ? Number(s.supplyMld).toFixed(2).replace(/\.?0+$/, '') : '—';
    const sb = $('#supplyBar'); sb.className = pct < 70 ? 'bad' : (pct < 85 ? 'warn' : '');
    requestAnimationFrame(() => { sb.style.width = Math.min(100, pct) + '%'; });
    $('#supplySub').innerHTML = t('supplySub', { pct: '<b>' + pct + '</b>', normal: s.normalMld, date: fmtDate(s.asOf) });
    if (s.damLevelM != null) {
      const crit = s.damCriticalM || 4, scale = crit * 1.5, dp = Math.min(100, (s.damLevelM / scale) * 100);
      $('#damNum').textContent = s.damLevelM;
      const db = $('#damBar'); db.className = s.damLevelM < crit ? 'bad' : '';
      requestAnimationFrame(() => { db.style.width = dp + '%'; });
      $('#damMark').style.left = 'calc(' + ((crit / scale) * 100) + '% - 1px)';
      $('#damSub').textContent = t('damSub', { crit, date: fmtDate(s.damAsOf || s.asOf) });
    }
    const facts = [];
    if (s.affectedBarangays) facts.push('<div><b>' + s.affectedBarangays + '</b>' + t('factBgy') + '</div>');
    if (s.affectedResidents) facts.push('<div><b>' + fmtNum(s.affectedResidents) + '</b>' + t('factRes') + '</div>');
    if (s.calamity && s.calamitySince) facts.push('<div><b>' + fmtDate(s.calamitySince) + '</b>' + t('factCal') + (s.resolution ? ' · ' + esc(s.resolution) : '') + '</div>');
    if (Array.isArray(s.sources) && s.sources.length) facts.push('<div class="src">' + t('factSrc') + ': ' + s.sources.map((x) => (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.label) + ' ↗</a>' + archiveLink(x.archiveUrl) : esc(x.label))).join('<br>') + '</div>');
    else if (s.source) facts.push('<div class="src">' + t('factSrc') + ': ' + (s.sourceUrl ? '<a href="' + esc(s.sourceUrl) + '" target="_blank" rel="noopener">' + esc(s.source) + ' ↗</a>' + archiveLink(s.archiveUrl) : esc(s.source)) + '</div>');
    $('#facts').innerHTML = facts.join('');
  }
  function renderBgySelect() {
    const sel = $('#bgySelect');
    sel.innerHTML = '<option value="">' + esc(t('pickPlaceholder')) + '</option>' +
      state.bgys.features.map((f) => '<option value="' + f.id + '">' + esc(f.name) + (f.pob ? ' · Bgy. ' + f.pob : '') + '</option>').join('');
    sel.value = state.selected || '';
  }
  function renderSchedule() {
    const body = $('#schedBody'), sel = state.selected, ds = displaySchedule(), stops = ds.stops;
    $('#todayLabel').textContent = fmtDate(todayKey(), true) + ' · ' + nowClock() + ' ' + t('phTime');
    const stale = ds.isToday ? '' : '<div class="stale">' + esc(t('staleSched', { date: fmtDate(ds.key, true) })) + ' <a href="' + esc(pioUrl()) + '" target="_blank" rel="noopener">' + esc(t('checkPio')) + '</a></div>';
    if (!sel) {
      body.innerHTML = stale + '<div class="empty">' + esc(t('pickFirst')) + '</div>';
    } else {
      const mine = stops.filter((st) => st._bgy === sel);
      if (!mine.length) {
        body.innerHTML = stale + '<div class="empty">' + esc(t(stops.length ? (ds.isToday ? 'noSchedBgy' : 'noSchedBgyLast') : 'noSchedAll', { bgy: bgyName(sel), date: fmtDate(ds.key) })) +
          '<br><a href="' + esc(pioUrl()) + '" target="_blank" rel="noopener">' + esc(t('checkPio')) + '</a></div>';
      } else {
        body.innerHTML = stale + '<ul class="stops">' + mine.map((st) => {
          const cls = stopStatus(st);
          const meta = [st.tanker, cls === 'now' ? t('stopNow') : (cls === 'past' ? t('stopPast') : ''), (st.lat == null || st.lng == null) ? t('stopApprox') : ''].filter(Boolean).join(' · ');
          return '<li class="stop ' + cls + '"><time>' + fmtRange(st.start, st.end) + '</time><span class="where">' + esc(st.where || '') + '</span><span class="meta">' + esc(meta) + '</span></li>';
        }).join('') + '</ul>';
      }
    }
    const sc = state.schedule || {};
    $('#schedSource').innerHTML = (sc.source ? t('schedSource', { src: sc.sourceUrl ? '<a href="' + esc(sc.sourceUrl) + '" target="_blank" rel="noopener">' + esc(sc.source) + ' ↗</a>' : esc(sc.source), date: fmtDate(sc.updated) }) : '') + (sc.note ? ' · ' + esc(pick(sc.note)) : '');
    $('#shareBox').textContent = buildShareText();
  }
  function buildShareText() {
    const lines = ['💧 TUBIG BUTUAN · ' + fmtDate(todayKey(), true)];
    const sel = state.selected, ds = displaySchedule(), stops = ds.stops, s = state.status;
    if (sel) {
      const mine = stops.filter((st) => st._bgy === sel);
      lines.push(t(ds.isToday ? 'shareSched' : 'shareSchedLast', { bgy: bgyName(sel), date: fmtDate(ds.key, true) }));
      if (mine.length) mine.forEach((st) => lines.push('• ' + fmtRange(st.start, st.end) + ' ' + (st.where || '') + (st.tanker ? ' (' + st.tanker + ')' : '')));
      else lines.push('• ' + t('shareNoSched'));
    }
    if (s && s.supplyMld != null) lines.push('', t('shareSupply', { mld: s.supplyMld, normal: s.normalMld }));
    const fetchSt = ((state.stations && state.stations.stations) || []).filter((x) => x.type === 'fetch');
    if (fetchSt.length) { lines.push('', t('shareStations')); fetchSt.forEach((x) => lines.push('• ' + x.name + ', Brgy. ' + x.barangay + ' — ' + hoursText(x))); }
    const b = bcwdGroup(); if (b) lines.push('', 'BCWD: ' + b.numbers.filter((n) => n.sms).map((n) => fmtTel(n.tel)).join(' / '));
    lines.push(APP_URL);
    return lines.join('\n');
  }
  function renderStations() {
    const sc = state.stations || {};
    const list = sc.stations || [];
    const rules = sc.rules ? pick(sc.rules) : t('bringItems');
    $('#stationsList').innerHTML = list.map((x) => {
      const srcUrl = x.sourceUrl || sc.sourceUrl;
      const open = x.type === 'fetch' ? isOpen(x) : null;
      const badge = x.type === 'bulk' ? '<span class="badge bulk">' + esc(t('bulk')) + '</span>' : '<span class="badge ' + (open ? 'open' : 'closed') + '">' + esc(t(open ? 'open' : 'closed')) + '</span>';
      const bgyId = resolveBgy(x.barangay);
      return '<div class="card station">' +
        '<div><h3>' + esc(x.name) + '</h3><div class="note">' + (x.address ? esc(x.address) + ', ' : '') + 'Brgy. ' + esc(x.barangay) + (x.note ? ' · ' + esc(pick(x.note)) : '') + '</div></div>' + badge +
        '<div class="hours">' + esc(t('hours')) + ': ' + esc(hoursText(x)) + '</div>' +
        (x.type === 'fetch' ? '<ul>' + rules.map((li) => '<li>' + esc(li) + '</li>').join('') + '</ul>' : '') +
        ((x.approx || x.lat == null || x.lng == null) ? '<div class="note" style="grid-column:1/-1">' + esc(x.locNote ? pick(x.locNote) : t('approxNote')) + '</div>' : '') +
        (srcUrl ? '<div class="note" style="grid-column:1/-1;font-size:.78rem"><span class="mono" style="font-size:.72rem">' + esc(t('factSrc')) + ': <a href="' + esc(srcUrl) + '" target="_blank" rel="noopener">' + esc(x.source || sc.source || srcUrl) + ' ↗</a>' + archiveLink(x.archiveUrl || (x.sourceUrl ? null : sc.archiveUrl)) + '</span>' +
          ((x.sourceQuote || (x.type === 'fetch' && sc.rulesQuote)) ? '<details class="quote"><summary>' + esc(t('seeSource')) + '</summary><blockquote>' + esc(x.sourceQuote || '') + (x.type === 'fetch' && sc.rulesQuote ? '<br><br>' + esc(sc.rulesQuote) : '') + '</blockquote><p class="note">' + esc(t('sourceHint')) + '</p></details>' : '') + '</div>' : '') +
        '<div class="row"><a class="btn sm ghost" href="' + esc(gmapsUrl(x)) + '" target="_blank" rel="noopener">' + esc(t('directions')) + '</a>' +
        (bgyId ? '<button type="button" class="btn sm ghost" data-zoom="' + bgyId + '">' + esc(t('showOnMap')) + '</button>' : '') + '</div>' +
        '</div>';
    }).join('');
    $('#stationsClock').textContent = nowClock() + ' ' + t('phTime');
    $('#stationsSource').innerHTML = sc.source ? t('stationsSource', { src: sc.sourceUrl ? '<a href="' + esc(sc.sourceUrl) + '" target="_blank" rel="noopener">' + esc(sc.source) + ' ↗</a>' + archiveLink(sc.archiveUrl) : esc(sc.source), date: fmtDate(sc.updated) }) : '';
    $$('#stationsList [data-zoom]').forEach((b) => b.addEventListener('click', () => { selectBgy(b.dataset.zoom, true); $('#map').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  }
  function renderHotlines() {
    const groups = (state.hotlines && state.hotlines.groups) || [];
    const html = groups.map((g) => '<div class="card' + (g.urgent ? ' urgent' : '') + '"><h3>' + esc(g.name) + '</h3>' +
      (g.note ? '<p class="note">' + esc(pick(g.note)) + '</p>' : '') +
      (g.numbers || []).map((n) => '<div class="num"><span><a class="tel" href="tel:' + esc(n.tel) + '">' + esc(fmtTel(n.tel)) + '</a><br><small>' + esc(pick(n.label)) + '</small></span><span class="row">' +
        (n.sms ? '<a class="btn sm ghost" href="sms:' + esc(n.tel) + '">' + esc(t('sms')) + '</a>' : '') + '<a class="btn sm" href="tel:' + esc(n.tel) + '">' + esc(t('call')) + '</a></span></div>').join('') +
      ((g.links || []).length ? '<div class="row" style="margin-top:8px">' + g.links.map((l) => '<a class="btn sm ghost" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>').join('') + '</div>' : '') +
      (g.source ? '<p class="note mono" style="font-size:.68rem;margin-top:8px">' + esc(g.source) + '</p>' : '') + '</div>').join('');
    const hall = '<div class="card"><h3>' + esc(t('hallTitle')) + '</h3><p class="note">' + esc(t('hallHint')) + '</p>' +
      (state.hall ? '<div class="num"><span><a class="tel" href="tel:' + esc(state.hall) + '">' + esc(fmtTel(state.hall)) + '</a><br><small>' + esc(state.selected ? bgyName(state.selected) : '') + '</small></span><span class="row"><a class="btn sm" href="tel:' + esc(state.hall) + '">' + esc(t('call')) + '</a></span></div>' : '') +
      '<div class="row" style="margin-top:8px"><input type="text" id="hallInput" inputmode="tel" placeholder="' + esc(t('hallPlaceholder')) + '" value="' + esc(state.hall) + '" style="flex:1;min-width:160px"><button type="button" class="btn sm" id="hallSave">' + esc(t('save')) + '</button></div></div>';
    $('#hotlinesList').innerHTML = html + hall;
    $('#hallSave').addEventListener('click', () => { state.hall = $('#hallInput').value.replace(/[^\d+]/g, ''); LS.set('tb.hall', state.hall); renderHotlines(); toast(t('saved')); });
  }
  function renderGuide() {
    const card = (title, steps) => '<div class="card"><h3>' + esc(title) + '</h3><ol class="steps">' + steps.map((s) => '<li><div><b>' + esc(s.b) + '</b><span>' + esc(s.s) + '</span></div></li>').join('') + '</ol></div>';
    $('#guideBody').innerHTML = card(t('boilTitle'), t('boilSteps')) + card(t('conserveTitle'), t('conserveSteps'));
  }
  function renderReport() {
    const types = t('reportTypes'), sel = $('#reportType'), cur = sel.value;
    sel.innerHTML = Object.keys(types).map((k) => '<option value="' + k + '">' + esc(types[k]) + '</option>').join('');
    if (cur) sel.value = cur;
    $('#reportWhere').placeholder = t('reportWherePlaceholder');
    updateReport();
  }
  function updateReport() {
    const types = t('reportTypes'), type = types[$('#reportType').value] || '';
    const where = $('#reportWhere').value.trim();
    const bgy = state.selected ? 'Brgy. ' + bgyName(state.selected) : t('reportNoBgy');
    const msg = t('reportPrefix') + ': ' + type + ' — ' + bgy + (where ? ', ' + where : '') + '. (via Tubig Butuan)';
    $('#reportPreview').textContent = msg;
    const b = bcwdGroup(); const smsNum = b ? (b.numbers.find((n) => n.sms) || b.numbers[0]) : null;
    $('#reportSms').href = smsNum ? 'sms:' + smsNum.tel + '?&body=' + encodeURIComponent(msg) : '#';
    $('#reportCall').href = smsNum ? 'tel:' + smsNum.tel : '#';
  }
  function renderLegend() {
    $('#legend').innerHTML = '<span><i class="stops"></i>' + esc(t(displaySchedule().isToday ? 'legStops' : 'legStopsLast')) + '</span><span><i class="aff"></i>' + esc(t('legAff')) + '</span><span><i class="sel"></i>' + esc(t('legSel')) + '</span><span><i class="st"></i>' + esc(t('legSt')) + '</span><span><i class="tk"></i>' + esc(t('legTk')) + '</span>';
  }
  function renderFooter() {
    const dates = [state.status && state.status.updated, state.schedule && state.schedule.updated, state.stations && state.stations.updated, state.hotlines && state.hotlines.updated].filter(Boolean).sort();
    $('#footUpdated').textContent = dates.length ? fmtDate(dates[dates.length - 1]) : '—';
  }
  function renderMapInfo(pin) {
    const box = $('#mapInfo');
    if (pin) {
      box.innerHTML = '<b>' + esc(pin.title) + '</b>' + esc(pin.sub || '') + (pin.approx ? '<br><span class="note">' + esc(t('stopApprox')) + '</span>' : '') +
        '<br><a class="btn sm ghost" href="' + esc(gmapsUrl(pin)) + '" target="_blank" rel="noopener">' + esc(t('directions')) + '</a>';
      return;
    }
    if (!state.selected) { box.innerHTML = '<span>' + esc(t('mapHint')) + '</span>'; return; }
    const ds = displaySchedule(), n = ds.stops.filter((st) => st._bgy === state.selected).length;
    box.innerHTML = '<b>' + esc(bgyName(state.selected)) + '</b>' + esc(n ? t(ds.isToday ? 'stopsInBgy' : 'stopsInBgyLast', { n, date: fmtDate(ds.key) }) : t('noStopsInBgy')) +
      '<br><button type="button" class="btn sm water" id="goSched">' + esc(t('viewSched')) + '</button>';
    $('#goSched').addEventListener('click', () => $('#schedule').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function renderAll() {
    applyI18n(); renderStatus(); renderBgySelect(); renderSchedule(); renderStations(); renderHotlines(); renderGuide(); renderReport(); renderLegend(); renderFooter();
    if (window.TubigMap && mapReady) { updateMapLayers(); renderMapInfo(); }
  }

  /* ---------------- map glue ---------------- */
  let mapReady = false;
  function buildPins() {
    const pins = [];
    for (const x of ((state.stations && state.stations.stations) || [])) {
      let lat = x.lat, lng = x.lng, approx = !!x.approx;
      if (lat == null || lng == null) { const id = resolveBgy(x.barangay); const c = id && window.TubigMap.centroidLL(id); if (!c) continue; lat = c.lat; lng = c.lng; approx = true; }
      pins.push({ type: 'station', lat, lng, approx, title: x.name, sub: 'Brgy. ' + x.barangay + ' · ' + hoursText(x), name: x.name, barangay: x.barangay });
    }
    for (const st of todaysStops()) {
      let lat = st.lat, lng = st.lng, approx = false;
      if (lat == null || lng == null) { const c = window.TubigMap.centroidLL(st._bgy); if (!c) continue; lat = c.lat; lng = c.lng; approx = true; }
      pins.push({ type: 'stop', lat, lng, approx, past: stopStatus(st) === 'past', title: fmtRange(st.start, st.end) + ' · ' + (st.where || ''), sub: 'Brgy. ' + bgyName(st._bgy) + (st.tanker ? ' · ' + st.tanker : ''), where: st.where, barangay: bgyName(st._bgy) });
    }
    return pins;
  }
  function updateMapLayers() {
    const stops = new Set(todaysStops().map((s) => s._bgy));
    const affected = new Set((((state.status || {}).affectedList) || []).map(resolveBgy).filter(Boolean));
    window.TubigMap.setClasses({ stops, affected });
    window.TubigMap.setPins(buildPins());
  }
  function initMap() {
    if (!window.TubigMap || !state.bgys) return;
    window.TubigMap.init({ wrap: $('#mapWrap'), data: state.bgys, onSelect: (id) => selectBgy(id, false), onPin: (pin) => renderMapInfo(pin) });
    const ld = $('#mapLoading'); if (ld) ld.remove();
    mapReady = true;
    updateMapLayers();
    renderStations(); // direction links can now use barangay centres
    if (state.selected) { window.TubigMap.setSelected(state.selected); window.TubigMap.zoomTo(state.selected); }
    renderMapInfo();
    $('#expandMap').addEventListener('click', () => setExpanded(!$('#mapWrap').classList.contains('expanded')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#mapWrap').classList.contains('expanded')) setExpanded(false); });
    window.addEventListener('resize', () => { if (mapReady) window.TubigMap.resize(); });
    $('#zoomIn').addEventListener('click', () => window.TubigMap.zoomIn());
    $('#zoomOut').addEventListener('click', () => window.TubigMap.zoomOut());
    $('#zoomReset').addEventListener('click', () => window.TubigMap.fitAll());
    $('#locateMe').addEventListener('click', locateMe);
    if (window.TB_NO_TILES) $('#toggleDetail').hidden = true; // hosts that block map tiles (e.g. artifact preview)
    $('#toggleDetail').addEventListener('click', () => { const b = $('#toggleDetail'); b.disabled = true; window.TubigMap.toggleDetailed((ok) => { b.disabled = false; if (!ok) toast(t('detailedFail')); }); });
  }
  function setExpanded(on) {
    const wrap = $('#mapWrap'), btn = $('#expandMap');
    wrap.classList.toggle('expanded', on);
    document.body.classList.toggle('map-expanded', on);
    $('.ic-expand', btn).toggleAttribute('hidden', on); $('.ic-close', btn).toggleAttribute('hidden', !on); // SVG has no .hidden property
    btn.setAttribute('aria-label', t(on ? 'collapseMap' : 'expandMap')); btn.title = btn.getAttribute('aria-label');
    window.TubigMap.resize();
    if (!on) $('#map').scrollIntoView({ block: 'start' });
  }
  function selectBgy(id, zoom) {
    if (!id || !state.bgys.features.some((f) => f.id === id)) id = '';
    state.selected = id; LS.set('tb.bgy', id);
    $('#bgySelect').value = id;
    renderSchedule(); updateReport(); renderHotlines();
    if (mapReady) { window.TubigMap.setSelected(id); if (zoom && id) window.TubigMap.zoomTo(id); renderMapInfo(); }
  }
  function locateMe() {
    if (!navigator.geolocation) { toast(t('geoUnsupported')); return; }
    const b = $('#locateMe'); b.disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      b.disabled = false;
      const { latitude: lat, longitude: lng } = pos.coords;
      window.TubigMap.setMe(lat, lng);
      const id = window.TubigMap.locate(lat, lng);
      if (id) { selectBgy(id, true); toast(t('youAreIn', { bgy: bgyName(id) })); } else toast(t('geoOutside'));
    }, () => { b.disabled = false; toast(t('geoFail')); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  /* ---------------- misc ---------------- */
  let toastTimer = null;
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => toast(t('copied'))).catch(() => fallbackCopy(text));
    return fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('copied')); } catch (e) { /* ignore */ } ta.remove();
  }
  function setOnline() { $('#offline').classList.toggle('show', navigator.onLine === false); }
  function watchTabs() {
    const links = $$('#tabs a'); if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id)); });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    links.forEach((a) => { const sec = $(a.getAttribute('href')); if (sec) io.observe(sec); });
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    const [bgys, status, stations, schedule, hotlines] = await Promise.all([
      loadJSON('data/barangays.json', null), loadJSON('data/status.json', null), loadJSON('data/stations.json', { stations: [] }),
      loadJSON('data/schedule.json', { stops: [] }), loadJSON('data/hotlines.json', { groups: [] })
    ]);
    if (!bgys) { const ld = $('#mapLoading'); if (ld) ld.textContent = 'Map data unavailable'; return; }
    Object.assign(state, { bgys, status, stations, schedule, hotlines });
    buildIndex();
    if (state.selected && !resolveBgy(state.selected)) state.selected = '';
    renderAll();
    initMap();
    $('#langBtn').addEventListener('click', () => { lang = lang === 'ceb' ? 'en' : 'ceb'; LS.set('tb.lang', lang); renderAll(); });
    $('#bgySelect').addEventListener('change', (e) => { selectBgy(e.target.value, true); });
    $('#shareBtn').addEventListener('click', () => { const text = buildShareText(); if (navigator.share) navigator.share({ title: 'Tubig Butuan', text }).catch(() => { }); else copyText(text); });
    $('#copyBtn').addEventListener('click', () => copyText(buildShareText()));
    $('#reportType').addEventListener('change', updateReport);
    $('#reportWhere').addEventListener('input', updateReport);
    window.addEventListener('online', setOnline); window.addEventListener('offline', setOnline); setOnline();
    watchTabs();
    const tick = () => { renderSchedule(); renderStations(); renderLegend(); if (mapReady) { updateMapLayers(); renderMapInfo(); } };
    setInterval(tick, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.TB_DATA) navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
