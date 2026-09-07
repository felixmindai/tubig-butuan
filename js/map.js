/* Tubig Butuan — vector barangay map.
   Renders data/barangays.json as inline SVG (no tiles, works offline),
   with pan/zoom, tap-to-select, pins, point-in-polygon locate, and an
   optional Leaflet + OpenStreetMap "detailed" layer loaded on demand. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1000;
  let H = 1000;
  let wrap, svg, gBgy, gPins, gLabels, data, proj, view;
  let onSelect = null, onPin = null;
  const F = {};            // id -> { ...feature, path, centroid:[x,y], bounds:[x0,y0,x1,y1] }
  let selectedId = null, labelEl = null, mePin = null, pinList = [];
  let detailed = false, lmap = null, lgeo = null, lpins = null, lme = null;

  const el = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function makeProjection(bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    const kx = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
    const S = W / ((maxX - minX) * kx);
    H = (maxY - minY) * S;
    return {
      toXY: (lng, lat) => [(lng - minX) * kx * S, (maxY - lat) * S],
      toLL: (x, y) => [x / (kx * S) + minX, maxY - y / S]
    };
  }
  function ringArea(r) { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return a / 2; }
  function ringCentroid(r) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f; }
    if (Math.abs(a) < 1e-9) return r[0]; a /= 2; return [cx / (6 * a), cy / (6 * a)];
  }
  function pointInRing(x, y, r) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pointInFeature(lng, lat, f) {
    for (const poly of f.polys) {
      if (!pointInRing(lng, lat, poly[0])) continue;
      let inHole = false; for (let i = 1; i < poly.length; i++) if (pointInRing(lng, lat, poly[i])) { inHole = true; break; }
      if (!inHole) return true;
    }
    return false;
  }

  function build() {
    proj = makeProjection(data.bbox);
    svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Butuan City barangay map' });
    gBgy = el('g', { class: 'bgys' }); gPins = el('g', { class: 'pins' }); gLabels = el('g', { class: 'labels' });
    for (const f of data.features) {
      let d = '', best = null, bestA = -1, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const poly of f.polys) {
        const pr = poly.map((ring) => ring.map(([lng, lat]) => proj.toXY(lng, lat)));
        for (const ring of pr) {
          d += 'M' + ring.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
          for (const [x, y] of ring) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
        }
        const a = Math.abs(ringArea(pr[0])); if (a > bestA) { bestA = a; best = pr[0]; }
      }
      const path = el('path', { d, class: 'bgy', 'data-id': f.id });
      const title = el('title', {}); title.textContent = f.name; path.appendChild(title);
      gBgy.appendChild(path);
      F[f.id] = Object.assign({}, f, { path, centroid: ringCentroid(best), bounds: [x0, y0, x1, y1] });
    }
    svg.append(gBgy, gPins, gLabels);
    wrap.appendChild(svg);
    fitAll();
    bindEvents();
  }

  /* ---------- view ---------- */
  function apply() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    layoutOverlays();
  }
  function unitsPerPx() { const m = svg.getScreenCTM(); return m ? 1 / m.a : 1; }
  function toSvgPoint(cx, cy) { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : pt; }
  function fitAll() { const pad = 16; view = { x: -pad, y: -pad, w: W + pad * 2, h: (W + pad * 2) * (H / W) }; apply(); }
  function zoomAt(factor, cx, cy) {
    const nw = clamp(view.w / factor, W / 80, W * 2.5);
    const f = nw / view.w;
    view.x = cx - (cx - view.x) * f; view.y = cy - (cy - view.y) * f; view.w = nw; view.h = view.h * f;
    apply();
  }
  function zoomCenter(factor) { zoomAt(factor, view.x + view.w / 2, view.y + view.h / 2); }
  function zoomTo(id) {
    const f = F[id]; if (!f) return;
    const [x0, y0, x1, y1] = f.bounds;
    const bw = x1 - x0, bh = y1 - y0;
    let w = Math.max(bw * 1.6, (bh * 1.6) * (W / H), W / 30);
    w = clamp(w, W / 80, W * 2.5);
    const h = w * (H / W);
    view = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
    apply();
  }

  /* ---------- overlays (pins + label keep constant screen size) ---------- */
  function layoutOverlays() {
    const k = unitsPerPx();
    // pins that share a spot (stops pinned at the same barangay centre) fan out in a ring
    const groups = new Map();
    for (const p of pinList) { const key = p.x.toFixed(1) + ',' + p.y.toFixed(1); const g = groups.get(key) || []; g.push(p); groups.set(key, g); }
    for (const g of groups.values()) {
      g.forEach((p, i) => {
        let dx = 0, dy = 0;
        if (g.length > 1) { const r = 14 + 6 * Math.floor(i / 8), a = (i % 8) / 8 * Math.PI * 2 - Math.PI / 2; dx = Math.cos(a) * r; dy = Math.sin(a) * r; }
        p.el.setAttribute('transform', `translate(${p.x + dx * k} ${p.y + dy * k}) scale(${k})`);
      });
    }
    if (mePin) mePin.el.setAttribute('transform', `translate(${mePin.x} ${mePin.y}) scale(${k})`);
    if (labelEl && selectedId && F[selectedId]) {
      const [cx, cy] = F[selectedId].centroid;
      labelEl.setAttribute('transform', `translate(${cx} ${cy - 14 * k}) scale(${k})`);
    }
  }
  const GLYPH = {
    station: 'M0-7C-3.8-1.8-5.6 1-5.6 3.6a5.6 5.6 0 0 0 11.2 0C5.6 1 3.8-1.8 0-7Z',
    stop: 'M-8-4h9v7h-9zM1-2h4.2l2.8 3v4H1zM-5.5 6.2a1.8 1.8 0 1 0 .01 0M4.5 6.2a1.8 1.8 0 1 0 .01 0',
    me: 'M0-4a4 4 0 1 0 .01 0'
  };
  function makePin(p, cls) {
    const g = el('g', { class: 'pin ' + cls });
    g.appendChild(el('circle', { class: 'halo', r: 11 }));
    g.appendChild(el('path', { class: 'glyph', d: GLYPH[p.type] || GLYPH.stop }));
    const t = el('title', {}); t.textContent = p.title || ''; g.appendChild(t);
    return g;
  }
  function setPins(list) {
    gPins.innerHTML = '';
    pinList = [];
    for (const p of list) {
      if (p.lat == null || p.lng == null) continue;
      const [x, y] = proj.toXY(p.lng, p.lat);
      const cls = [p.type, p.approx ? 'approx' : '', p.past ? 'past' : '', p.cancelled ? 'cancelled' : ''].filter(Boolean).join(' ');
      const g = makePin(p, cls);
      gPins.appendChild(g);
      pinList.push({ el: g, x, y, data: p });
    }
    layoutOverlays();
    if (lmap) syncLeaflet();
  }
  function setMe(lat, lng) {
    if (mePin) mePin.el.remove();
    const [x, y] = proj.toXY(lng, lat);
    const g = makePin({ type: 'me', title: 'You' }, 'me');
    gPins.appendChild(g);
    mePin = { el: g, x, y, lat, lng };
    layoutOverlays();
    if (lmap) syncLeaflet();
  }
  function setSelected(id) {
    if (selectedId && F[selectedId]) F[selectedId].path.classList.remove('is-selected');
    selectedId = F[id] ? id : null;
    if (labelEl) { labelEl.remove(); labelEl = null; }
    if (selectedId) {
      const f = F[selectedId];
      f.path.classList.add('is-selected');
      gBgy.appendChild(f.path); // draw on top
      labelEl = el('text', { class: 'bgy-label' }); labelEl.textContent = f.name; gLabels.appendChild(labelEl);
    }
    layoutOverlays();
    if (lmap) syncLeaflet();
  }
  function setClasses({ stops, affected }) {
    for (const id in F) {
      F[id].path.classList.toggle('has-stops', !!(stops && stops.has(id)));
      F[id].path.classList.toggle('affected', !!(affected && affected.has(id)));
    }
    if (lmap) syncLeaflet();
  }
  function locate(lat, lng) { for (const id in F) if (pointInFeature(lng, lat, F[id])) return id; return null; }
  function centroidLL(id) { const f = F[id]; if (!f) return null; const [lng, lat] = proj.toLL(f.centroid[0], f.centroid[1]); return { lat, lng }; }

  /* ---------- pointer events: drag, wheel, pinch, tap ---------- */
  function bindEvents() {
    const ptrs = new Map();
    let drag = null, moved = false, pinch = null, hit = null;
    const info = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; };
    svg.addEventListener('pointerdown', (e) => {
      // remember what was under the finger now: once the pointer is captured,
      // later events are retargeted to the <svg> itself.
      hit = (e.target.closest && (e.target.closest('.pin') || e.target.closest('.bgy'))) || null;
      svg.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; svg.classList.add('dragging'); }
      else if (ptrs.size === 2) { pinch = info(); drag = null; moved = true; }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1 && drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 4) moved = true;
        const s = unitsPerPx(); view.x = drag.vx - dx * s; view.y = drag.vy - dy * s; apply();
      } else if (ptrs.size === 2 && pinch) {
        const now = info(); const p = toSvgPoint(now.mid.x, now.mid.y);
        if (pinch.d > 0) zoomAt(now.d / pinch.d, p.x, p.y);
        const s = unitsPerPx(); view.x -= (now.mid.x - pinch.mid.x) * s; view.y -= (now.mid.y - pinch.mid.y) * s; apply();
        pinch = now;
      }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0) {
        svg.classList.remove('dragging');
        if (!moved && e.type === 'pointerup' && hit) {
          if (hit.classList.contains('pin')) { const p = pinList.find((x) => x.el === hit); if (p && onPin) onPin(p.data); }
          else if (onSelect) onSelect(hit.dataset.id);
        }
        drag = null; pinch = null; hit = null;
      } else if (ptrs.size === 1) {
        const [r] = [...ptrs.values()]; drag = { x: r.x, y: r.y, vx: view.x, vy: view.y }; pinch = null;
      }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const p = toSvgPoint(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y); }, { passive: false });
    svg.addEventListener('dblclick', (e) => { const p = toSvgPoint(e.clientX, e.clientY); zoomAt(1.6, p.x, p.y); });
    window.addEventListener('resize', layoutOverlays);
  }

  /* ---------- optional Leaflet detailed layer ---------- */
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const css = document.createElement('link'); css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = () => resolve(); s.onerror = () => reject(new Error('leaflet failed')); document.head.appendChild(s);
      setTimeout(() => reject(new Error('timeout')), 15000);
    });
  }
  function toGeoJSON() {
    return { type: 'FeatureCollection', features: data.features.map((f) => ({ type: 'Feature', properties: { id: f.id, name: f.name }, geometry: { type: 'MultiPolygon', coordinates: f.polys } })) };
  }
  function fillFor(id) {
    const c = F[id].path.classList;
    if (id === selectedId) return '#0B5FA5';
    if (c.contains('has-stops')) return '#4EA3E8';
    if (c.contains('affected')) return '#E0A100';
    return '#888';
  }
  function initLeaflet() {
    const host = document.getElementById('leafletHost');
    lmap = window.L.map(host, { zoomControl: true, attributionControl: true });
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(lmap);
    lgeo = window.L.geoJSON(toGeoJSON(), {
      style: (f) => ({ color: '#141B23', weight: 1, fillColor: fillFor(f.properties.id), fillOpacity: f.properties.id === selectedId ? 0.35 : 0.15 }),
      onEachFeature: (f, layer) => { layer.bindTooltip(f.properties.name, { sticky: true }); layer.on('click', () => onSelect && onSelect(f.properties.id)); }
    }).addTo(lmap);
    lpins = window.L.layerGroup().addTo(lmap);
    const [x0, y0, x1, y1] = data.bbox; lmap.fitBounds([[y0, x0], [y1, x1]]);
  }
  function syncLeaflet() {
    if (!lmap) return;
    lgeo.eachLayer((layer) => { const id = layer.feature.properties.id; layer.setStyle({ fillColor: fillFor(id), fillOpacity: id === selectedId ? 0.35 : 0.15 }); });
    lpins.clearLayers();
    for (const p of pinList) {
      const d = p.data;
      const m = window.L.circleMarker([d.lat, d.lng], { radius: 9, color: '#F5F0E6', weight: 2, fillColor: d.type === 'station' ? '#0B5FA5' : (d.past ? '#6B7480' : '#141B23'), fillOpacity: 1, dashArray: d.approx ? '3 3' : null });
      m.bindPopup(`<b>${escapeHtml(d.title || '')}</b><br>${escapeHtml(d.sub || '')}${d.approx ? '<br><i>~</i>' : ''}`);
      m.on('click', () => onPin && onPin(d));
      lpins.addLayer(m);
    }
    if (mePin) lpins.addLayer(window.L.circleMarker([mePin.lat, mePin.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#2E7D4F', fillOpacity: 1 }));
  }
  function toggleDetailed(cb) {
    if (detailed) { wrap.classList.remove('detailed'); detailed = false; cb && cb(true); return; }
    loadLeaflet().then(() => {
      wrap.classList.add('detailed'); detailed = true;   // show the host first so Leaflet measures a real size
      if (!lmap) initLeaflet();
      setTimeout(() => {
        lmap.invalidateSize(); syncLeaflet();
        if (selectedId && F[selectedId]) { const c = centroidLL(selectedId); lmap.setView([c.lat, c.lng], 14); }
      }, 60);
      cb && cb(true);
    }).catch(() => { wrap.classList.remove('detailed'); detailed = false; cb && cb(false); });
  }
  function leafletZoom(dir) { if (lmap) lmap.setZoom(lmap.getZoom() + dir); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.TubigMap = {
    init(opts) { wrap = opts.wrap; data = opts.data; onSelect = opts.onSelect || null; onPin = opts.onPin || null; build(); },
    setSelected, setClasses, setPins, setMe, locate, centroidLL,
    zoomTo(id) { if (detailed && lmap) { const c = centroidLL(id); if (c) lmap.setView([c.lat, c.lng], 14); } else zoomTo(id); },
    zoomIn() { detailed ? leafletZoom(1) : zoomCenter(1.5); },
    zoomOut() { detailed ? leafletZoom(-1) : zoomCenter(1 / 1.5); },
    fitAll() { if (detailed && lmap) { const [x0, y0, x1, y1] = data.bbox; lmap.fitBounds([[y0, x0], [y1, x1]]); } else fitAll(); },
    toggleDetailed, isDetailed: () => detailed,
    resize() { layoutOverlays(); if (lmap) setTimeout(() => { lmap.invalidateSize(); layoutOverlays(); }, 60); },
    feature(id) { return F[id] || null; },
    ids() { return Object.keys(F); }
  };
})();
