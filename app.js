/* 売上管理 Webアプリ（完全クライアントサイド） */
(() => {
  'use strict';

  // ====== DOM ======
  const dropzone = document.getElementById('dropzone');
  const filePicker = document.getElementById('filePicker');
  const loadStatus = document.getElementById('loadStatus');

  const pills = [...document.querySelectorAll('.pill[data-range]')];
  const periodStart = document.getElementById('periodStart');
  const periodEnd = document.getElementById('periodEnd');
  const periodEndGroup = document.getElementById('periodEndGroup');
  const periodHint = document.getElementById('periodHint');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  const toggleZoom = document.getElementById('toggleZoom'); // removed from UI; may be null
  const togglePan = document.getElementById('togglePan'); // removed from UI; may be null
  const toggleHourlyPromo = document.getElementById('toggleHourlyPromo');
  const btnChartZoomIn = document.getElementById('btnChartZoomIn');
  const btnChartZoomOut = document.getElementById('btnChartZoomOut');
  const btnChartLeft = document.getElementById('btnChartLeft');
  const btnChartRight = document.getElementById('btnChartRight');
  const btnChartReset = document.getElementById('btnChartReset');
  const btnResetZoom = document.getElementById('btnResetZoom'); // removed from UI; may be null

  const toggleRound10 = document.getElementById('toggleRound10');
  const togglePromo = document.getElementById('togglePromo');
  const toggleOmitIdle = document.getElementById('toggleOmitIdle');
  const toggleFailed = document.getElementById('toggleFailed');

  const statBase = document.getElementById('statBase');
  const statPromo = document.getElementById('statPromo');
  const statTotal = document.getElementById('statTotal');
  const statTrips = document.getElementById('statTrips');
  const statActiveHours = document.getElementById('statActiveHours');
  const statHourly = document.getElementById('statHourly');
  const statTripsPerHour = document.getElementById('statTripsPerHour');
  const statHourlyWithPromo = document.getElementById('statHourlyWithPromo');
  const statUnit = document.getElementById('statUnit');
  const statUnitWithPromo = document.getElementById('statUnitWithPromo');

  const pickupSearchBox = document.getElementById('pickupSearchBox');

  // Raw modal elements (lazy lookup)
  const getRawModalEls = () => {
    const rawModal = document.getElementById('rawModal');
    return {
      rawModal,
      rawModalTitle: document.getElementById('rawModalTitle'),
      rawModalShown: document.getElementById('rawModalShown'),
      rawModalRaw: document.getElementById('rawModalRaw'),
      rawModalClose: document.getElementById('rawModalClose'),
      btnCopyShown: document.getElementById('btnCopyShown'),
      btnCopyRaw: document.getElementById('btnCopyRaw'),
    };
  };
  const openRawModal = ({ title, shown, raw }) => {
    const { rawModal, rawModalTitle, rawModalShown, rawModalRaw } = getRawModalEls();
    if (!rawModal) return;
    if (rawModalTitle) rawModalTitle.textContent = title || '生データ';
    if (rawModalShown) rawModalShown.textContent = (shown ?? '').toString();
    if (rawModalRaw) rawModalRaw.textContent = (raw ?? '').toString();
    rawModal.classList.remove('hidden');
  };
  const closeRawModal = () => {
    const { rawModal } = getRawModalEls();
    if (!rawModal) return;
    rawModal.classList.add('hidden');
  };

  const copyText = async (txt) => {
    try {
      await navigator.clipboard.writeText((txt ?? '').toString());
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = (txt ?? '').toString();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  };

  const wireRawModal = () => {
    const { rawModal, rawModalClose, btnCopyShown, btnCopyRaw, rawModalShown, rawModalRaw } = getRawModalEls();
    if (rawModalClose) rawModalClose.addEventListener('click', closeRawModal);  };
  wireRawModal();
  if (rawModal) rawModal.addEventListener('click', (e) => { if (e.target === rawModal) closeRawModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRawModal(); });
  if (btnCopyShown) btnCopyShown.addEventListener('click', () => copyText(rawModalShown.textContent));
  if (btnCopyRaw) btnCopyRaw.addEventListener('click', () => copyText(rawModalRaw.textContent));
  const dropoffSearchBox = document.getElementById('dropoffSearchBox');
  const fAmtMin = document.getElementById('fAmtMin');
  const fAmtMax = document.getElementById('fAmtMax');
  const fWageMin = document.getElementById('fWageMin');
  const fWageMax = document.getElementById('fWageMax');
  const fDurMin = document.getElementById('fDurMin');
  const fDurMax = document.getElementById('fDurMax');
  const btnClearDetailFilters = document.getElementById('btnClearDetailFilters');
  const toggleHideDropoff = document.getElementById('toggleHideDropoff');
  const dayViewSelect = document.getElementById('dayViewSelect');
  const detailTbody = document.getElementById('detailTbody');

  // ===== Ranking refs =====
  const rankTbody = document.getElementById('rankTbody');
  const rankNote = document.getElementById('rankNote');
  const zipDictBox = document.getElementById('zipDictBox');
  const zipDictLoadBtn = document.getElementById('zipDictLoadBtn');
  const zipDictLoader = document.getElementById('zipDictLoader');
  const zipDictStatus = document.getElementById('zipDictStatus');
  const zipDictHint = document.getElementById('zipDictHint');
  const rankDurationModeGroup = document.getElementById('rankDurationModeGroup');
  const rankLabelTh = document.getElementById('rankLabelTh');

  const rankTargetStore = document.getElementById('rankTargetStore');
  const rankTargetDropoff = document.getElementById('rankTargetDropoff');
  const rankMetricCount = document.getElementById('rankMetricCount');
  const rankMetricWage = document.getElementById('rankMetricWage');
  const rankMetricDuration = document.getElementById('rankMetricDuration');
  const rankDurAvg = document.getElementById('rankDurAvg');
  const rankDurTotal = document.getElementById('rankDurTotal');

  const formatHMRank = (mins) => {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}h${r}m`;
  };

  const buildRankings = (detailRows) => {
    const storeMap = new Map();
    const dropMap = new Map();

    const pickMostFrequentLabel = (freqMap) => {
      if (!freqMap) return '';
      let best = '';
      let bestN = 0;
      for (const [k, n] of freqMap.entries()) {
        if (n > bestN) { bestN = n; best = k; }
      }
      return best;
    };

    const upsert = (map, key, label, row) => {
      if (!key) return;
      const cur = map.get(key) || { key, label, count: 0, amountSum: 0, minutesSum: 0, labelFreq: new Map() };
      cur.count += 1;
      cur.amountSum += (row.amount || 0);
      cur.minutesSum += (row.deliveryMinutes || 0);
      if (label) {
        const prev = cur.labelFreq.get(label) || 0;
        cur.labelFreq.set(label, prev + 1);
      }
      map.set(key, cur);
    };

    for (const r of detailRows) {
      // store key
      const sKey = (r.pickupDisplay || r.rawPickup || '').toString().trim();
      upsert(storeMap, sKey, sKey, r);

            // dropoff key (zip preferred)
      const zipRaw = (r.dropoffZip || '').toString().trim();
      const zip7 = normalizeZip7(zipRaw);
      const shortAddrFromText = (r.dropoffDisplay || '').toString().trim();
      const raw = (r.rawDropoff || r.dropoffRaw || '').toString().trim();

      if (zip7) {
        const formattedZip = formatZip7(zip7) || zipRaw;
        const addr = (state.zipDictReady ? (kanjiShortFromZip(zip7) || '') : '') || shortAddrFromText;
        const label = addr ? (formattedZip + ' ' + addr) : formattedZip;
        upsert(dropMap, zip7, label, r);
      } else {
        const dKey = shortAddrFromText || raw;
        const dLabel = dKey;
        upsert(dropMap, dKey, dLabel, r);
      }
    }

    const finalize = (m) => Array.from(m.values()).map(x => {
      const avgMinutes = x.count > 0 ? (x.minutesSum / x.count) : 0;
      const hourly = x.minutesSum > 0 ? (x.amountSum * 60 / x.minutesSum) : null;
      const avgAmount = x.count > 0 ? (x.amountSum / x.count) : 0;
      const label = pickMostFrequentLabel(x.labelFreq) || x.label;
      return { ...x, label, avgMinutes, hourly, avgAmount };
    });

    return { stores: finalize(storeMap), dropoffs: finalize(dropMap) };
  };

  const renderRankings = (eventsInRange) => {
    try {
      // zip dict lazy load (non-blocking)
      if (state.rankTarget === 'dropoff' && !state.zipDictReady) {
        ensureZipDict().then(() => { if (state.events && state.events.length) refreshAll(); }).catch(() => {});
      }
          if (!rankTbody) return;

          // base-only detail rows for the period
          const detailRows = buildDetailRows(eventsInRange);

          const { stores, dropoffs } = buildRankings(detailRows);
          const rows = (state.rankTarget === 'dropoff') ? dropoffs : stores;

          // duration mode visibility
          if (rankDurationModeGroup) {
            rankDurationModeGroup.style.display = (state.rankMetric === 'duration') ? '' : 'none';
          }
          if (rankLabelTh) {
            rankLabelTh.textContent = (state.rankTarget === 'dropoff') ? '降車場所キー' : '店舗';
          }

          // default sort key based on metric unless user changed via header clicks
          const metricKey = (state.rankMetric === 'count') ? 'count'
            : (state.rankMetric === 'wage') ? 'wage'
            : (state.rankDurationMode === 'total') ? 'durTotal' : 'durAvg';

          if (!state.rankSortKey || state.rankSortKey === 'auto') {
            state.rankSortKey = metricKey;
            state.rankSortDir = -1;
          }

          const cmpStr = (a, b) => (a || '').toString().localeCompare((b || '').toString(), 'ja', { sensitivity:'base' });
          const cmpNum = (a, b) => (Number(a) - Number(b));

          const sorted = [...rows].sort((a, b) => {
            const dir = (state.rankSortDir === 1) ? 1 : -1;
            const k = state.rankSortKey || metricKey;

            const av = (() => {
              if (k === 'label') return a.label;
              if (k === 'count') return a.count;
              if (k === 'wage') return (a.hourly ?? -1);
              if (k === 'durAvg') return a.avgMinutes;
              if (k === 'durTotal') return a.minutesSum;
              if (k === 'amount') return a.amountSum;
              if (k === 'avgAmount') return a.avgAmount;
              return a.count;
            })();
            const bv = (() => {
              if (k === 'label') return b.label;
              if (k === 'count') return b.count;
              if (k === 'wage') return (b.hourly ?? -1);
              if (k === 'durAvg') return b.avgMinutes;
              if (k === 'durTotal') return b.minutesSum;
              if (k === 'amount') return b.amountSum;
              if (k === 'avgAmount') return b.avgAmount;
              return b.count;
            })();

            if (k === 'label') return dir * cmpStr(av, bv);
            return dir * cmpNum(av, bv);
          });

          // render table
          rankTbody.innerHTML = '';
          const frag = document.createDocumentFragment();

          sorted.forEach((r, i) => {
            const tr = document.createElement('tr');

            const tdRank = document.createElement('td');
            tdRank.className = 'num';
            tdRank.textContent = String(i + 1);
            tr.appendChild(tdRank);

            const tdLabel = document.createElement('td');
            tdLabel.textContent = r.label || '';
            tr.appendChild(tdLabel);

            const tdCount = document.createElement('td');
            tdCount.className = 'num';
            tdCount.textContent = String(r.count || 0);
            tr.appendChild(tdCount);

            const tdWage = document.createElement('td');
            tdWage.className = 'num';
            tdWage.textContent = (r.hourly != null) ? (Math.round(r.hourly).toLocaleString('ja-JP') + '円/時') : '';
            tr.appendChild(tdWage);

            const tdDur = document.createElement('td');
            tdDur.className = 'num';
            if (state.rankDurationMode === 'total') {
              tdDur.textContent = formatHMRank(r.minutesSum);
            } else {
              tdDur.textContent = (Math.round(r.avgMinutes || 0)).toLocaleString('ja-JP') + '分';
            }
            tr.appendChild(tdDur);

            const tdAmt = document.createElement('td');
            tdAmt.className = 'num';
            tdAmt.textContent = Math.round(r.amountSum || 0).toLocaleString('ja-JP') + '円';
            tr.appendChild(tdAmt);

            const tdAvg = document.createElement('td');
            tdAvg.className = 'num';
            tdAvg.textContent = Math.round(r.avgAmount || 0).toLocaleString('ja-JP') + '円';
            tr.appendChild(tdAvg);

            frag.appendChild(tr);
          });

          rankTbody.appendChild(frag);
      if (rankNote) {
        const detailRows = buildDetailRows(eventsInRange);
        const onlyBase = detailRows.length;
        rankNote.textContent = `ランキング: ${state.rankTarget==='dropoff'?'降車場所':'店舗'} / ${state.rankMetric==='count'?'件数':(state.rankMetric==='wage'?'時給':'配達時間')}（${onlyBase}件の配達を集計）`;
      }
    } catch (err) {
      if (rankTbody) {
        rankTbody.innerHTML = '<tr><td colspan="7" class="muted">ランキング表示エラー: ' + String(err && err.message ? err.message : err) + '</td></tr>';
      }
      if (rankNote) rankNote.textContent = '';
      console.error(err);
    }
  };

  const updateRankUI = () => {
    if (rankTargetStore) rankTargetStore.classList.toggle('is-active', state.rankTarget === 'store');
    if (rankTargetDropoff) rankTargetDropoff.classList.toggle('is-active', state.rankTarget === 'dropoff');

    if (rankMetricCount) rankMetricCount.classList.toggle('is-active', state.rankMetric === 'count');
    if (rankMetricWage) rankMetricWage.classList.toggle('is-active', state.rankMetric === 'wage');
    if (rankMetricDuration) rankMetricDuration.classList.toggle('is-active', state.rankMetric === 'duration');

    if (rankDurAvg) rankDurAvg.classList.toggle('is-active', state.rankDurationMode === 'avg');
    if (rankDurTotal) rankDurTotal.classList.toggle('is-active', state.rankDurationMode === 'total');

    if (rankDurationModeGroup) {
      rankDurationModeGroup.style.display = (state.rankMetric === 'duration') ? '' : 'none';
    }
  };


  if (detailTbody) {
    detailTbody.addEventListener('click', (e) => {
      const td = e.target.closest('td[data-raw-key]');
      if (!td) return;
      const tr = td.closest('tr');
      if (!tr) return;
      const rowId = tr.dataset.rowid;
      const r = state.detailRowMap.get(rowId);
      if (!r) return;

      const key = td.dataset.rawKey;
      if (key === 'pickup') {
        openRawModal({
          title: '乗車場所（店舗名）',
          shown: r.pickupDisplay || '',
          raw: r.rawPickup || ''
        });
      } else if (key === 'dropoff') {
        openRawModal({
          title: '降車場所',
          shown: r.dropoffDisplay || '',
          raw: r.rawDropoff || r.dropoffRaw || ''
        });
      } else if (key === 'zip') {
        const src = r.rawDropoff || r.dropoffRaw || '';
        openRawModal({
          title: '降車場所郵便番号',
          shown: r.dropoffZip || '',
          raw: '抽出元: ' + src + '\n\n抽出結果: ' + (r.dropoffZip || '')
        });
      }
    });
  }
  const detailNote = document.getElementById('detailNote');

  const btnClear = document.getElementById('btnClear');
  const btnExport = document.getElementById('btnExport');

  // ====== State ======
  const state = {
    paymentsByTxnId: new Map(), // txnId -> payment
    tripsByRideId: new Map(),   // rideId -> trip
    lastRange: 'week',
    periodStartBD: null,        // 'YYYY-MM-DD'
    periodEndBD: null,          // 'YYYY-MM-DD' for custom
    chart: null,
    chartXMode: 'time',
    chartMode: 'cumulative',
    round10: false,
    dayView: 'combined',
    dayHourlyIncludePromo: false,
    hideDropoff: false,
    detailSortKey: 'drop',
    detailSortDir: -1,
    detailRowMap: new Map(),
    zipDict: null,
    zipDictPromise: null,
    zipDictReady: false,
    rankTarget: 'store',
    rankMetric: 'count',
    rankDurationMode: 'avg',
    rankSortKey: 'count',
    rankSortDir: -1,
    theme: 'light',
    activeBizDates: new Set(),
    fpStart: null,
    fpEnd: null,
    chartViewMin: null,
    chartViewMax: null,
    chartViewEnabled: false,
  };

  // ====== Helpers ======

  
const buildPickupTarget = (r) => {
  return [r.storeName || r.pickupDisplay || r.rawPickup || '', r.kind || ''].join(' ');
};
const buildDropoffTarget = (r) => {
  return [r.dropoffDisplay || r.dropoffAddr || r.rawDropoff || '', r.kind || ''].join(' ');
};


const extractZipFromText = (s) => {
  const t = (s ?? '').toString();
  const m = t.match(/(?:〒\s*)?(\d{3})-?(\d{4})/);
  if (!m) return '';
  return `${m[1]}-${m[2]}`;
};

// ====== Search query (AND/OR/NOT) ======
  const normalizeText = (s) => (s ?? '')
    .toString()
    .normalize('NFKC')
    .toLowerCase();

  const tokenizeQuery = (q) => {
    const s = (q ?? '').toString().trim();
    const tokens = [];
    let i = 0;
    const push = (t) => { if (t !== '') tokens.push(t); };

    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(' || c === ')') { tokens.push(c); i++; continue; }

      // "..." phrase
      if (c === '"') {
        let j = i + 1;
        let buf = '';
        while (j < s.length && s[j] !== '"') { buf += s[j]; j++; }
        if (j >= s.length) { push(buf); break; }
        push(buf);
        i = j + 1;
        continue;
      }

      // word / operator
      let j = i;
      let buf = '';
      while (j < s.length && !/\s/.test(s[j]) && s[j] !== '(' && s[j] !== ')') {
        buf += s[j];
        j++;
      }
      push(buf);
      i = j;
    }
    return tokens;
  };

  const isOp = (t) => {
    const u = (t ?? '').toString().toUpperCase();
    return u === 'AND' || u === 'OR' || u === 'NOT';
  };

  const opInfo = (op) => {
    const u = op.toUpperCase();
    if (u === 'NOT') return { prec: 3, assoc: 'right' };
    if (u === 'AND') return { prec: 2, assoc: 'left' };
    return { prec: 1, assoc: 'left' }; // OR
  };

  const addImplicitAnd = (tokens) => {
    const out = [];
    const isTerm = (t) => !(t === '(' || t === ')' || isOp(t));
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      const prev = out.length ? out[out.length - 1] : null;
      if (prev != null) {
        const prevIsTermOrClose = (isTerm(prev) || prev === ')');
        const nextIsTermOrOpenOrNot = (isTerm(t) || t === '(' || (t ?? '').toString().toUpperCase() === 'NOT');
        if (prevIsTermOrClose && nextIsTermOrOpenOrNot) out.push('AND');
      }
      out.push(t);
    }
    return out;
  };

  const toRpn = (tokens) => {
    const out = [];
    const st = [];
    const isTerm = (t) => !(t === '(' || t === ')' || isOp(t));

    for (const raw of tokens) {
      const t = raw;
      if (isTerm(t)) { out.push(t); continue; }
      if (t === '(') { st.push(t); continue; }
      if (t === ')') {
        while (st.length && st[st.length - 1] !== '(') out.push(st.pop());
        if (st.length && st[st.length - 1] === '(') st.pop();
        continue;
      }
      if (isOp(t)) {
        const op = t.toUpperCase();
        const info = opInfo(op);
        while (st.length && isOp(st[st.length - 1])) {
          const top = st[st.length - 1].toUpperCase();
          const topInfo = opInfo(top);
          const cond = (info.assoc === 'left') ? (info.prec <= topInfo.prec) : (info.prec < topInfo.prec);
          if (!cond) break;
          out.push(st.pop());
        }
        st.push(op);
      }
    }
    while (st.length) {
      const x = st.pop();
      if (x !== '(' && x !== ')') out.push(x);
    }
    return out;
  };

  const evalRpn = (rpn, haystack) => {
    const st = [];
    for (const t of rpn) {
      if (!isOp(t)) {
        const term = normalizeText(t);
        st.push(term === '' ? true : haystack.includes(term));
        continue;
      }
      const op = t.toUpperCase();
      if (op === 'NOT') {
        const a = st.pop();
        st.push(!a);
      } else if (op === 'AND') {
        const b = st.pop();
        const a = st.pop();
        st.push(!!a && !!b);
      } else {
        const b = st.pop();
        const a = st.pop();
        st.push(!!a || !!b);
      }
    }
    return st.length ? !!st[st.length - 1] : true;
  };

  const matchesQuery = (text, query) => {
    const q = (query ?? '').toString().trim();
    if (q === '') return true;

    try {
      const tokens = addImplicitAnd(tokenizeQuery(q));
      const rpn = toRpn(tokens);
      return evalRpn(rpn, normalizeText(text));
    } catch (e) {
      const parts = q.split(/\s+/).filter(Boolean).map(normalizeText);
      const hay = normalizeText(text);
      return parts.every(p => hay.includes(p));
    }
  };

  const setText = (el, v) => { if (el) el.textContent = v; };
  const fmtYen = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
  };

  const toNumber = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();
    if (!s) return 0;
    const cleaned = s.replace(/,/g, '').replace(/[^\d.\-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const parseDateTime = (v) => {
    if (v === null || v === undefined) return null;
    let s = String(v).trim();
    if (!s) return null;
    s = s.replace(/\s+JST\b/i, '').trim();

    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:\s*([+-]\d{4}))?/);
    if (m) {
      let iso = `${m[1]}T${m[2]}`;
      if (m[3]) {
        const off = m[3];
        iso += `${off.slice(0,3)}:${off.slice(3)}`;
      }
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const yyyyMmDd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const businessDateStr = (d) => {
    const adj = new Date(d.getTime() - 4 * 60 * 60 * 1000);
    return yyyyMmDd(adj);
  };


  const rebuildActiveBizDates = () => {
    const s = new Set();
    for (const t of state.tripsByRideId.values()) {
      const dt = t.dropoffTime;
      if (!dt) continue;
      s.add(businessDateStr(dt));
    }
    state.activeBizDates = s;
    // redraw datepickers if present
    try { if (state.fpStart) state.fpStart.redraw(); } catch {}
    try { if (state.fpEnd) state.fpEnd.redraw(); } catch {}
  };

  const normalizeBizDateStr = (s) => (s ?? '').toString().trim().replaceAll('/', '-');

  const dateFromBusinessStr = (s) => {
    const norm = normalizeBizDateStr(s);
    const d = new Date(`${norm}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getBusinessDayRealBounds = (businessDateStrVal) => {
    // Business day is 04:00 -> next day 03:59:59
    const d0 = dateFromBusinessStr(businessDateStrVal);
    if (!d0) return null;
    const start = new Date(d0);
    start.setHours(4,0,0,0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  };


  const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  const startOfWeekMonday = (businessDate) => {
    const day = (businessDate.getDay() + 6) % 7; // Monday=0
    const start = new Date(businessDate);
    start.setDate(businessDate.getDate() - day);
    start.setHours(0,0,0,0);
    return start;
  };

  const addMonths = (d, months) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
  };

  const extractWardTown = (addr) => {
    if (!addr) return '';
    const s = String(addr).trim();
    const m = s.match(/([一-龠々ぁ-んァ-ンー]+区)([^0-9０-９,，、]{1,20})/);
    if (m) return (m[1] + m[2]).trim();
    const m2 = s.match(/([一-龠々ぁ-んァ-ンー]+市)([^0-9０-９,，、]{1,20})/);
    if (m2) return (m2[1] + m2[2]).trim();
    return '';
  };


  const shortenAddress = (addr) => {
    if (!addr) return '';
    let s = String(addr).trim();
    if (!s) return '';

    // strip leading country / postal
    s = s.replace(/^日本\s*/,'').trim();
    s = s.replace(/^〒?\s*\d{3}-?\d{4}\s*/,'').trim();

    // Japanese preferred: 市区町村+町域（番地等を除く）
    if (/[一-龠々ぁ-んァ-ン]/.test(s)) {
      const wt = extractWardTown(s);
      if (wt) return wt;
      // fallback: remove digits blocks
      const cut = s.split(/\d|[0-9０-９]/)[0].trim();
      return cut || s;
    }

    // English heuristic: prefer "<X> Ward, <City>" or "<City>, <Prefecture>"
    const ward = s.match(/([A-Za-z\-\s']+\sWard)(?:,\s*([A-Za-z\-\s']+))?/);
    if (ward) {
      const w = (ward[1] || '').trim();
      const c = (ward[2] || '').trim();
      return c ? `${w}, ${c}` : w;
    }
    const city = s.match(/([A-Za-z\-\s']+\sCity)(?:,\s*([A-Za-z\-\s']+))?/);
    if (city) {
      const c1 = (city[1] || '').trim();
      const c2 = (city[2] || '').trim();
      return c2 ? `${c1}, ${c2}` : c1;
    }

    // fallback: first two comma-separated parts without house numbers
    const parts = s.split(/,|，/).map(x=>x.trim()).filter(Boolean);
    const head = parts.slice(0,2).join(', ');
    return head || s;
  };

  const storeNameFromAddress = (addr) => {
    if (!addr) return '';
    const s = String(addr).trim();
    if (!s) return '';
    const parts = s.split(/,|，/);
    const head = (parts[0] || '').trim();
    if (head.startsWith('日本') || head.startsWith('〒')) return '';
    return head;
  };

  const downsample = (arr, maxPoints) => {
    if (!arr || arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
    const out = [];
    for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
    if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
    return out;
  };

  // ====== CSV type detection & normalization ======
  const detectCsvType = (fileName, headers) => {
    const lower = (fileName || '').toLowerCase();
    const h = (headers || []).join('|');

    if (lower.includes('trip_activity')) return 'trip';
    if (lower.includes('payments_order')) return 'payment';

    if (h.includes('乗車の降車時間') || h.includes('乗車の uuid') || h.includes('乗車の UUID')) return 'trip';
    if (h.includes('取引ID') || h.includes('支払い額') || h.includes('決済時間')) return 'payment';

    return 'unknown';
  };

  const findCol = (headers, candidates) => {
    const set = new Set(headers);
    for (const c of candidates) if (set.has(c)) return c;
    for (const h of headers) {
      for (const c of candidates) {
        if (h.includes(c)) return h;
      }
    }
    return null;
  };

  const normalizePaymentRow = (row, headers) => {
    const txnCol = findCol(headers, ['取引ID', 'transaction id', 'Transaction ID']);
    const rideCol = findCol(headers, ['乗車ID', '乗車の UUID', 'ride id', 'Trip UUID']);
    const amtCol  = findCol(headers, ['支払い額']);
    const timeCol = findCol(headers, ['決済時間', 'payment time', '支払い時間']);
    const noteCol = findCol(headers, ['備考', 'note', 'remarks']);

    const txnId = txnCol ? String(row[txnCol] ?? '').trim() : '';
    if (!txnId) return null;

    const rideIdRaw = rideCol ? String(row[rideCol] ?? '').trim() : '';
    const note = noteCol ? String(row[noteCol] ?? '').trim() : '';

    // so.payout は報酬支払（振込）として売上から除外
    const hay = `${txnId} ${rideIdRaw} ${note}`.toLowerCase();
    if (hay.includes('so.payout')) return null;

    let amount = amtCol ? toNumber(row[amtCol]) : 0;
    if (state.round10) amount = Math.round(amount / 100) * 100;
    const paymentTime = timeCol ? parseDateTime(row[timeCol]) : null;

    return {
      txnId,
      rideId: rideIdRaw || null,
      amount,
      paymentTime,
      note,
    };
  };

  const normalizeTripRow = (row, headers) => {
    const rideCol = findCol(headers, ['乗車の UUID', '乗車ID', 'Trip UUID', 'ride id']);
    const requestCol = findCol(headers, ['乗車のリクエスト時間', '依頼時間', 'request']);
    const dropoffCol = findCol(headers, ['乗車の降車時間', '降車時間', 'dropoff']);
    const pickupCol = findCol(headers, ['乗車場所の住所', 'pickup']);
    const dropoffAddrCol = findCol(headers, ['降車場所の住所', 'dropoff address']);
    const statusCol = findCol(headers, ['乗車ステータス', 'status']);

    const rideId = rideCol ? String(row[rideCol] ?? '').trim() : '';
    if (!rideId) return null;

    const requestTime = requestCol ? parseDateTime(row[requestCol]) : null;
    const dropoffTime = dropoffCol ? parseDateTime(row[dropoffCol]) : null;

    const pickupAddr = pickupCol ? String(row[pickupCol] ?? '').trim() : '';
    const dropoffAddr = dropoffAddrCol ? String(row[dropoffAddrCol] ?? '').trim() : '';

    return {
      rideId,
      requestTime,
      dropoffTime,
      pickupAddr,
      dropoffAddr,
      pickupName: storeNameFromAddress(pickupAddr),
      status: statusCol ? String(row[statusCol] ?? '').trim() : '',
    };
  };

  // ====== CSV reading ======
  const parseCsvFile = (file) => new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (res) => resolve(res),
      error: (err) => { if (zipDictStatus) zipDictStatus.textContent = '読込失敗'; reject(err); },
    });
  });


  // ====== Japan Post ZIP dictionary (KEN_ALL) ======
  // assets/utf_ken_all.csv : C列(郵便番号7桁) -> H列(市区町村) / I列(町域)

  const buildZipDictFromRows = (dataRows) => {
    const map = new Map();

    const isGenericTown = (t) =>
      !t ||
      t.includes('以下に掲載がない場合') ||
      t.includes('の次に番地がくる場合');

    for (const row of (dataRows || [])) {
      const zip = (row[2] ?? '').toString().trim();   // C
      const city = (row[7] ?? '').toString().trim();  // H
      const town = (row[8] ?? '').toString().trim();  // I
      if (!zip) continue;

      const cur = map.get(zip) || { city: '', town: '' };
      if (!cur.city) cur.city = city;

      if (!cur.town) {
        cur.town = town;
      } else if (isGenericTown(cur.town) && !isGenericTown(town)) {
        cur.town = town;
      }

      map.set(zip, cur);
    }
    return map;
  };

  const ensureZipDict = async () => {
    if (state.zipDict) return state.zipDict;
    if (state.zipDictPromise) return state.zipDictPromise;

    state.zipDictPromise = new Promise((resolve, reject) => {
      const url = new URL('assets/utf_ken_all.csv', location.href).href;
      Papa.parse(url, {
        download: true,
        header: false,
        skipEmptyLines: true,
        worker: false,
        complete: (res) => {
          try {
            const map = buildZipDictFromRows(res.data || []);
            state.zipDict = map;
            state.zipDictReady = true;
            if (zipDictStatus) zipDictStatus.textContent = '読み込み済み';
            resolve(map);
          } catch (e) {
            reject(e);
          }
        },
        error: (err) => { if (zipDictStatus) zipDictStatus.textContent = '読込失敗'; reject(err); },
      });
    });

    return state.zipDictPromise;
  };

  const normalizeZip7 = (z) => {
    const d = (z ?? '').toString().replace(/\D/g, '');
    if (d.length < 7) return '';
    return d.slice(0, 7);
  };

  const formatZip7 = (z7) => {
    const d = normalizeZip7(z7);
    if (d.length !== 7) return '';
    return d.slice(0,3) + '-' + d.slice(3);
  };

  const getZipKanji = (zip7) => {
    if (!state.zipDict) return null;
    const k = normalizeZip7(zip7);
    if (!k) return null;
    return state.zipDict.get(k) || null;
  };

  const kanjiShortFromZip = (zip7) => {
    const kz = getZipKanji(zip7);
    if (!kz) return '';
    const city = (kz.city || '').trim();
    const town = (kz.town || '').trim();
    const isGenericTown = (t) =>
      !t ||
      t.includes('以下に掲載がない場合') ||
      t.includes('の次に番地がくる場合');
    const tt = isGenericTown(town) ? '' : town;
    return (city + tt).trim();
  };

  const readFiles = async (files) => {
    const list = [...files];
    if (!list.length) return;

    let addedPayments = 0;
    let addedTrips = 0;
    let ignored = 0;
    loadStatus.textContent = `読み込み中...（${list.length}ファイル）`;

    for (const file of list) {
      try {
        const parsed = await parseCsvFile(file);
        const rows = parsed.data || [];
        const headers = (parsed.meta && parsed.meta.fields) ? parsed.meta.fields : Object.keys(rows[0] || {});
        const type = detectCsvType(file.name, headers);

        if (type === 'payment') {
          for (const r of rows) {
            const n = normalizePaymentRow(r, headers);
            if (!n) { ignored++; continue; }
            if (state.paymentsByTxnId.has(n.txnId)) { ignored++; continue; }
            state.paymentsByTxnId.set(n.txnId, n);
            addedPayments++;
          }
        } else if (type === 'trip') {
          for (const r of rows) {
            const n = normalizeTripRow(r, headers);
            if (!n) { ignored++; continue; }
            if (state.tripsByRideId.has(n.rideId)) { ignored++; continue; }
            state.tripsByRideId.set(n.rideId, n);
            addedTrips++;
          }
        } else {
          ignored += rows.length;
        }
      } catch (e) {
        console.error(e);
        ignored++;
      }
    }

    loadStatus.textContent =
      `読み込み完了：payments_order +${addedPayments.toLocaleString()}件 / trip_activity +${addedTrips.toLocaleString()}件（重複・不明・除外 ${ignored.toLocaleString()}件）` +
      `  |  合計：payments ${state.paymentsByTxnId.size.toLocaleString()}件 / trips ${state.tripsByRideId.size.toLocaleString()}件`;

    rebuildActiveBizDates();
    refreshAll();

    // zip dict warmup: load in background and re-render once ready
    if (!state.zipDictReady) {
      ensureZipDict().then(() => {
        if (state.events && state.events.length) refreshAll();
      }).catch(() => { if (zipDictStatus && !state.zipDictReady) zipDictStatus.textContent = '未読み込み'; });
    }
  };

  // ====== Build events ======
  const buildEvents = () => {
    const paymentsByRide = new Map();
    const promoPayments = [];

    for (const p of state.paymentsByTxnId.values()) {
      if (p.rideId) {
        const prev = paymentsByRide.get(p.rideId) || { amount: 0, txnIds: [], lastPaymentTime: null, notes: [] };
        prev.amount += p.amount;
        prev.txnIds.push(p.txnId);
        if (!prev.lastPaymentTime || (p.paymentTime && p.paymentTime > prev.lastPaymentTime)) prev.lastPaymentTime = p.paymentTime;
        if (p.note) prev.notes.push(p.note);
        paymentsByRide.set(p.rideId, prev);
      } else {
        promoPayments.push(p);
      }
    }

    const includeFailed = !!toggleFailed.checked;
    const events = [];

    for (const [rideId, t] of state.tripsByRideId.entries()) {
      if (!includeFailed) {
        const st = (t.status || '').toLowerCase();
        if (st && st !== 'completed') continue;
      }

      const pay = paymentsByRide.get(rideId);
      const amount = pay ? pay.amount : 0;

      const eventTime = t.dropoffTime || (pay ? pay.lastPaymentTime : null);
      if (!eventTime) continue;

      events.push({
        kind: 'base',
        time: eventTime,
        requestTime: t.requestTime || null,
        deliveryMinutes: (t.requestTime && t.dropoffTime) ? Math.max(0, Math.round((t.dropoffTime.getTime() - t.requestTime.getTime())/60000)) : null,
        businessDate: businessDateStr(eventTime),
        amount,
        rideId,
        txnIds: pay ? pay.txnIds : [],
        pickupName: t.pickupName || '',
        pickupAddr: t.pickupAddr || '',
        dropoffAddr: t.dropoffAddr || '',
        note: pay ? pay.notes.join(' / ') : '',
      });

      if (pay) paymentsByRide.delete(rideId);
    }

    // Leftovers: payments with rideId but no trip
    for (const [rideId, pay] of paymentsByRide.entries()) {
      const eventTime = pay.lastPaymentTime;
      if (!eventTime) continue;
      events.push({
        kind: 'base',
        time: eventTime,
        requestTime: null,
        deliveryMinutes: null,
        businessDate: businessDateStr(eventTime),
        amount: pay.amount,
        rideId,
        txnIds: pay.txnIds,
        pickupName: '',
        pickupAddr: '',
        dropoffAddr: '',
        note: pay.notes.join(' / '),
      });
    }

    // Promo: use paymentTime
    for (const p of promoPayments) {
      const eventTime = p.paymentTime;
      if (!eventTime) continue;
      events.push({
        kind: 'promo',
        time: eventTime,
        requestTime: null,
        deliveryMinutes: null,
        businessDate: businessDateStr(eventTime),
        amount: p.amount,
        rideId: null,
        txnIds: [p.txnId],
        pickupName: '',
        pickupAddr: '',
        dropoffAddr: '',
        note: p.note || '',
      });
    }

    events.sort((a, b) => {
      const ta = a.time.getTime();
      const tb = b.time.getTime();
      if (ta !== tb) return ta - tb;
      if (a.kind === b.kind) return 0;
      return a.kind === 'base' ? -1 : 1;
    });

    return events;
  };

  // ====== Range filter ======
  const clampWeekStartMondayStr = (bdStr) => {
    const d = dateFromBusinessStr(bdStr);
    if (!d) return bdStr;
    const start = startOfWeekMonday(d);
    return yyyyMmDd(start);
  };

  const clampMonthStartStr = (bdStr) => {
    const d = dateFromBusinessStr(bdStr);
    if (!d) return bdStr;
    d.setDate(1);
    d.setHours(0,0,0,0);
    return yyyyMmDd(d);
  };

  const getMaxBusinessDate = (events) => {
    if (!events.length) return null;
    let maxBD = events[0].businessDate;
    for (const e of events) if (e.businessDate > maxBD) maxBD = e.businessDate;
    return maxBD;
  };

  const ensureDefaultPeriodDates = (events) => {
    const maxBD = getMaxBusinessDate(events);
    if (!maxBD) return;

    if (!state.periodStartBD) {
      if (state.lastRange === 'day') state.periodStartBD = maxBD;
      else if (state.lastRange === 'week') state.periodStartBD = clampWeekStartMondayStr(maxBD);
      else if (state.lastRange === 'month') state.periodStartBD = clampMonthStartStr(maxBD);
      else if (state.lastRange === 'custom') {
        const maxD = dateFromBusinessStr(maxBD);
        const startD = addDays(maxD, -6);
        state.periodStartBD = yyyyMmDd(startD);
        state.periodEndBD = maxBD;
      } else state.periodStartBD = maxBD;
    }

    if (state.lastRange === 'custom' && !state.periodEndBD) state.periodEndBD = maxBD;

    periodStart.value = normalizeBizDateStr(state.periodStartBD) || '';
    if (state.lastRange === 'custom') periodEnd.value = normalizeBizDateStr(state.periodEndBD) || '';
  };

  const updatePeriodUI = (eventsAll) => {
    ensureDefaultPeriodDates(eventsAll);
    const isCustom = state.lastRange === 'custom';
    periodEndGroup.style.display = isCustom ? '' : 'none';

    let hint = '';
    if (state.lastRange === 'day') hint = '日次: 指定した開始日のみ表示（業務日付: 4:00切替）';
    if (state.lastRange === 'week') hint = '週次: 月曜始まりの1週間を表示（開始日は自動で月曜に補正）';
    if (state.lastRange === 'month') hint = '月次: 1日始まりの1か月を表示（開始日は自動で1日に補正）';
    if (state.lastRange === 'custom') hint = '期間指定: 開始日〜終了日（両端含む）を表示';
    if (state.lastRange === 'all') hint = '全期間を表示';
    periodHint.textContent = hint;

    const disabled = (state.lastRange === 'all');
    btnPrev.disabled = disabled;
    btnNext.disabled = disabled;
  };

  const getRangeBounds = (events, rangeKey) => {
    if (!events.length) return null;
    const maxBD = getMaxBusinessDate(events);
    const maxDate = dateFromBusinessStr(maxBD);
    if (!maxDate) return null;

    if (rangeKey === 'all') return { start: null, end: null };

    let start = null;
    let end = null;

    if (rangeKey === 'custom') {
      const sBD = state.periodStartBD || maxBD;
      const eBD = state.periodEndBD || maxBD;
      const sD = dateFromBusinessStr(sBD);
      const eD = dateFromBusinessStr(eBD);
      if (!sD || !eD) return null;
      start = sD;
      end = addDays(eD, 1);
      return { start, end };
    }

    const startBD = state.periodStartBD || maxBD;
    const startDate = dateFromBusinessStr(startBD);
    if (!startDate) return null;

    if (rangeKey === 'day') {
      start = startDate;
      end = addDays(start, 1);
    } else if (rangeKey === 'week') {
      const mondayBD = clampWeekStartMondayStr(startBD);
      state.periodStartBD = mondayBD;
      periodStart.value = mondayBD;
      start = dateFromBusinessStr(mondayBD);
      end = addDays(start, 7);
    } else if (rangeKey === 'month') {
      const firstBD = clampMonthStartStr(startBD);
      state.periodStartBD = firstBD;
      periodStart.value = firstBD;
      start = dateFromBusinessStr(firstBD);
      end = addMonths(start, 1);
    }

    return { start, end };
  };

  const filterEventsByRange = (events, rangeKey) => {
    const b = getRangeBounds(events, rangeKey);
    if (!b) return [];
    const { start, end } = b;
    if (!start && !end) return events;
    return events.filter(e => {
      const d = dateFromBusinessStr(e.businessDate);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d >= end) return false;
      return true;
    });
  };

  const stepPeriod = (dir) => {
    const key = state.lastRange;
    if (key === 'all') return;

    const s = state.periodStartBD;
    if (!s) return;
    const d = dateFromBusinessStr(s);
    if (!d) return;

    if (key === 'day') {
      state.periodStartBD = yyyyMmDd(addDays(d, dir));
    } else if (key === 'week') {
      const monday = startOfWeekMonday(d);
      state.periodStartBD = yyyyMmDd(addDays(monday, dir * 7));
    } else if (key === 'month') {
      d.setDate(1);
      state.periodStartBD = yyyyMmDd(addMonths(d, dir));
    } else if (key === 'custom') {
      const e = state.periodEndBD;
      if (!e) return;
      const ed = dateFromBusinessStr(e);
      if (!ed) return;
      const len = Math.round((ed.getTime() - d.getTime()) / (24*60*60*1000));
      const ns = addDays(d, dir * (len + 1));
      const ne = addDays(ns, len);
      state.periodStartBD = yyyyMmDd(ns);
      state.periodEndBD = yyyyMmDd(ne);
      periodEnd.value = state.periodEndBD;
    }

    periodStart.value = state.periodStartBD;
    refreshAll();
  };

  // ====== Working hours ======
  const hourStartMs = (d) => {
    const x = new Date(d);
    x.setMinutes(0,0,0);
    return x.getTime();
  };

  const computeActiveHours = (baseEvents) => {
    // Active minutes are counted in 1-minute buckets derived from requestTime (fallback: event time).
    // Rule: gaps < 6h between activity buckets are treated as active as well.
    const minutes = [];
    const minuteSet = new Set();

    const minuteStartMs = (d) => {
      const x = new Date(d);
      x.setSeconds(0,0);
      return x.getTime();
    };

    for (const e of baseEvents) {
      const t = e.requestTime || e.time;
      if (!t) continue;
      const ms = minuteStartMs(t);
      if (!minuteSet.has(ms)) { minuteSet.add(ms); minutes.push(ms); }
    }

    minutes.sort((a,b)=>a-b);

    // Fill gaps < 6h (i.e., deltaMinutes < 360)
    for (let i=0; i<minutes.length-1; i++) {
      const a = minutes[i], b = minutes[i+1];
      const delta = Math.round((b - a) / (60*1000));
      if (delta >= 2 && delta < 360) {
        for (let k=1; k<delta; k++) minuteSet.add(a + k*60*1000);
      }
    }

    const sortedMinutes = [...minuteSet].sort((a,b)=>a-b);

    // hour index map for omit-idle compression
    const activeHours = new Set();
    for (const ms of sortedMinutes) {
      const d = new Date(ms);
      d.setMinutes(0,0,0);
      activeHours.add(d.getTime());
    }
    const sortedHours = [...activeHours].sort((a,b)=>a-b);
    const indexByHour = new Map();
    for (let i=0;i<sortedHours.length;i++) indexByHour.set(sortedHours[i], i);

    return {
      activeMinutes: sortedMinutes.length,
      minuteSet,
      activeSet: activeHours,
      sortedHours,
      indexByHour
    };
  };
  // For chart compression: keep any hour that has an event (base/promo).
  // Also fill gaps < 6h between kept hours (same "稼働扱い" rule).
  const computeKeptHours = (events) => {
    const kept = new Set();
    const hours = [];

    for (const e of events) {
      const t = e.time; // chart uses event time (dropoff/payment)
      if (!t) continue;
      const ms = hourStartMs(t);
      if (!kept.has(ms)) { kept.add(ms); hours.push(ms); }
    }

    hours.sort((a,b)=>a-b);

    for (let i=0; i<hours.length-1; i++) {
      const a = hours[i], b = hours[i+1];
      const delta = Math.round((b - a) / (60*60*1000));
      if (delta >= 2 && delta < 6) {
        for (let k=1; k<delta; k++) kept.add(a + k*60*60*1000);
      }
    }

    const sorted = [...kept].sort((a,b)=>a-b);
    const indexByHour = new Map();
    for (let i=0;i<sorted.length;i++) indexByHour.set(sorted[i], i);
    return { keptSet: kept, sortedHours: sorted, indexByHour };
  };



  const computeVirtualX = (dateObj, indexByHour) => {
    if (!dateObj) return 0;
    const ms0 = hourStartMs(dateObj);
    let idx = indexByHour.get(ms0);
    if (idx === undefined) {
      // map to previous known hour (up to 48h back)
      let tmp = ms0;
      for (let i=0;i<48;i++){
        tmp -= 60*60*1000;
        const v = indexByHour.get(tmp);
        if (v !== undefined) { idx = v; break; }
      }
      if (idx === undefined) idx = 0;
    }
    const frac = (dateObj.getMinutes() + dateObj.getSeconds()/60 + dateObj.getMilliseconds()/60000) / 60;
    return idx + frac;
  };

  // ====== Chart ======
  const ensureChart = (xMode) => ensureChartForMode(state.chartMode || 'cumulative', xMode || state.chartXMode || 'time');

  const buildMaxDelivery = (events) => {
    let best = null;
    for (const e of events) {
      if (e.kind !== 'base') continue;
      if (!e.rideId) continue;
      if (!best || e.amount > best.amount) best = e;
    }
    return best;
  };

  const formatDuration = (mins) => {
    if (mins === null || mins === undefined) return '';
    const m = Math.max(0, Math.round(mins));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h${String(mm).padStart(2,'0')}m` : `${mm}m`;
  };

  
const applyDatasetColors = (chart, desired) => {
  if (!chart || !chart.data || !chart.data.datasets) return;

  // Base palette (close to Chart.js default colors)
  const BLUE = 'rgb(54, 162, 235)';
  const BLUE_A = 'rgba(54, 162, 235, 0.25)';
  const BLUE_LINE_A = 'rgba(54, 162, 235, 0.12)';
  const PINK = 'rgb(255, 99, 132)';
  const PINK_A = 'rgba(255, 99, 132, 0.25)';
  const PINK_LINE_A = 'rgba(255, 99, 132, 0.12)';
  const TEAL = 'rgb(75, 192, 192)';
  const ORANGE = 'rgb(255, 159, 64)';
  const YELLOW = 'rgb(255, 205, 86)';

  const AVG_BLUE = '#2563eb'; // requested
  const AVG_RED = '#dc2626';  // requested

  for (const ds of chart.data.datasets) {
    const label = ds.label || '';

    if (label.includes('配達報酬（累積）')) {
      ds.borderColor = BLUE;
      ds.backgroundColor = BLUE_LINE_A;
      ds.order = 1;
    } else if (label.includes('プロモーション（累積）')) {
      ds.borderColor = PINK;
      ds.backgroundColor = PINK_LINE_A;
      ds.order = 1;
    } else if (label === '時間別報酬') {
      ds.backgroundColor = BLUE_A;
      ds.borderColor = BLUE;
      ds.order = 2;
    } else if (label === '時間別件数') {
      ds.backgroundColor = PINK_A;
      ds.borderColor = PINK;
      ds.order = 2;
    } else if (label === '平均時給') {
      ds.borderColor = AVG_BLUE;
      ds.backgroundColor = AVG_BLUE;
      ds.fill = false;
      ds.order = 3;
    } else if (label === '平均 配達/時') {
      ds.borderColor = AVG_RED;
      ds.backgroundColor = AVG_RED;
      ds.fill = false;
      ds.order = 3;
    } else if (label === '最高報酬の配達') {
      ds.borderColor = TEAL;
      ds.backgroundColor = TEAL;
      ds.order = 4;
    } else if (label === '配達報酬') { // non-day modes
      ds.borderColor = BLUE;
      ds.backgroundColor = BLUE_LINE_A;
      ds.order = 1;
    } else if (label === 'プロモーション') {
      ds.borderColor = PINK;
      ds.backgroundColor = PINK_LINE_A;
      ds.order = 1;
    } else if (label === '総売上') {
      ds.borderColor = ORANGE;
      ds.backgroundColor = 'rgba(255, 159, 64, 0.20)';
    } else if (label === '配達（ポイント）') {
      ds.borderColor = BLUE;
      ds.backgroundColor = BLUE_LINE_A;
      ds.order = 1;
    }
  }
};


  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

  const getRangeBoundsMs = () => {
    const minD = dateFromBusinessStr(state.periodStartBD) || (state.minBD ? dateFromBusinessStr(state.minBD) : null);
    const maxD = dateFromBusinessStr(state.periodEndBD) || (state.maxBD ? dateFromBusinessStr(state.maxBD) : null);
    if (!minD || !maxD) return null;
    const minMs = minD.getTime();
    const maxMs = maxD.getTime() + 24*3600*1000;
    return { minMs, maxMs };
  };

  const applyChartViewport = (chart) => {
    if (!chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    if (!state.chartViewEnabled || state.chartViewMin == null || state.chartViewMax == null) {
      chart.options.scales.x.min = b.minMs;
      chart.options.scales.x.max = b.maxMs;
      return;
    }

    const span = Math.max(60*1000, state.chartViewMax - state.chartViewMin);
    const min = clamp(state.chartViewMin, b.minMs, b.maxMs - span);
    const max = min + span;

    state.chartViewMin = min;
    state.chartViewMax = max;

    chart.options.scales.x.min = min;
    chart.options.scales.x.max = max;
  };

  const resetChartViewport = (chart) => {
    const b = getRangeBoundsMs();
    if (!b) return;
    state.chartViewEnabled = false;
    state.chartViewMin = b.minMs;
    state.chartViewMax = b.maxMs;
    if (chart) {
      chart.options.scales.x.min = b.minMs;
      chart.options.scales.x.max = b.maxMs;
      try { chart.update('none'); } catch {}
    }
  };

  const ensureChartViewportDefaults = () => {
    const b = getRangeBoundsMs();
    if (!b) return;
    state.chartViewMin = b.minMs;
    state.chartViewMax = b.maxMs;
  };

const ensureChartForMode = (mode, xMode) => {
    const desired = mode || 'cumulative';
    const desiredX = xMode || 'time';
    if (state.chart && (state.chartMode !== desired || state.chartXMode !== desiredX)) {
      state.chart.destroy();
      state.chart = null;
    }
    state.chartMode = desired;
    state.chartXMode = desiredX;

    if (!state.chart) {
      const pickPlugin = (p) => {
        if (!p) return null;
        // UMD may export plugin as default
        if (p.default) return p.default;
        return p;
      };
      const zoomPlugin = pickPlugin(window.ChartZoom) || pickPlugin(window.chartjsPluginZoom) || pickPlugin(window['chartjs-plugin-zoom']) || pickPlugin(window.Zoom) || pickPlugin(window.ChartZoomPlugin);
      if (zoomPlugin) Chart.register(zoomPlugin);


      const ctx = document.getElementById('chart');

      const tc = getThemeChartColors();
      const currencyTicks = { color: tc.muted, callback: (v) => `${Math.round(Number(v)).toLocaleString()}円` };
      const grid = { color: tc.grid };

      let data = { datasets: [] };
      let scales = {};

      const timeX = { type:'time', time:{ tooltipFormat:'yyyy-MM-dd HH:mm' }, ticks:{ color: tc.muted }, grid };

      if (desired === 'dayCombined') {
        data = { datasets: [
          { label:'配達報酬（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'yCum', stack:'sales' },
          { label:'プロモーション（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'yCum', stack:'sales' },
          { label:'時間別報酬', type:'bar', data: [], yAxisID:'yHr' },
          { label:'時間別件数', type:'bar', data: [], yAxisID:'yCnt' },
          { label:'平均時給', type:'line', data: [], yAxisID:'yHr', pointRadius:0, borderWidth:2 },
          { label:'平均 配達/時', type:'line', data: [], yAxisID:'yCnt', pointRadius:0, borderWidth:2 },
          { label:'最高報酬の配達', type:'scatter', data: [], yAxisID:'yCum', pointRadius:7, pointHoverRadius:9, showLine:false }
        ]};
        scales = {
          x: timeX,
          yCum: { position:'left', stacked:true, ticks: currencyTicks, grid },
          yHr: { position:'right', offset:true, beginAtZero:true, suggestedMin:0, ticks: currencyTicks, grid: { drawOnChartArea:false } },
          yCnt: { position:'right', offset:true, beginAtZero:true, suggestedMin:0, ticks: { color: tc.muted }, grid: { drawOnChartArea:false } },
        };
      } else if (desired === 'dayStep') {
        data = { datasets: [
          { label:'配達報酬（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'プロモーション（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'最高報酬の配達', type:'scatter', data: [], yAxisID:'y', pointRadius:7, pointHoverRadius:9, showLine:false }
        ]};
        scales = {
          x: timeX,
          y: { position:'left', stacked:true, ticks: currencyTicks, grid },
        };
      } else if (desired === 'dayHourly') {
        data = { datasets: [
          { label:'時間別報酬', type:'bar', data: [], yAxisID:'yHr' },
          { label:'時間別件数', type:'bar', data: [], yAxisID:'yCnt' },
          { label:'平均時給', type:'line', data: [], yAxisID:'yHr', pointRadius:0, borderWidth:2 },
          { label:'平均 配達/時', type:'line', data: [], yAxisID:'yCnt', pointRadius:0, borderWidth:2 },
          { label:'最高報酬の配達', type:'scatter', data: [], yAxisID:'yHr', pointRadius:7, pointHoverRadius:9, showLine:false }
        ]};
        scales = {
          x: timeX,
          yHr: { position:'left', beginAtZero:true, suggestedMin:0, ticks: currencyTicks, grid },
          yCnt: { position:'right', beginAtZero:true, suggestedMin:0, ticks: { color: tc.muted }, grid: { drawOnChartArea:false } },
        };
      } else if (desired === 'cumulative') {
        data = { datasets: [
          { label:'配達報酬（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'プロモーション（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'配達（ポイント）', type:'scatter', data: [], yAxisID:'y', pointRadius:3, pointHoverRadius:5, showLine:false },
          { label:'最高報酬の配達', type:'scatter', data: [], yAxisID:'y', pointRadius:7, pointHoverRadius:9, showLine:false }
        ]};
        scales = {
          x: { type: (desiredX === 'linear') ? 'linear' : 'time', time:{ tooltipFormat:'yyyy-MM-dd HH:mm' }, ticks:{ color: tc.muted }, grid },
          y: { position:'left', stacked:true, ticks: currencyTicks, grid },
        };
      }

      state.chart = new Chart(ctx, {
        type: 'bar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode:'nearest', intersect:false },
          plugins: {
            decimation: { enabled: true, algorithm: 'min-max' },
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
              pan: { enabled: true, mode: 'x' }
            },
            legend: { display:true, labels:{ color: tc.text } },
            tooltip: { callbacks: {} }
          },
          scales
        }
      });
      applyDatasetColors(state.chart, desired);
      applyChartViewport(state.chart);
    }

    applyChartViewport(state.chart);

    return state.chart;
  };

  // Wheel / trackpad "scroll" to pan horizontally (PC向け)
  // - パン有効ON時:
  //   - ズーム無効の場合: ホイール/トラックパッドで横パン
  //   - ズーム有効の場合: Shift押下 または 横スクロール(deltaX優勢) のとき横パン

  const applyZoomPanOptions = (chart) => {
    if (!chart) return;
    const zoomOn = !!(toggleZoom && toggleZoom.checked);
    const panOn = !!(togglePan && togglePan.checked);

    // chartjs-plugin-zoom v2
    try {
      if (chart.options && chart.options.plugins && chart.options.plugins.zoom) {
        chart.options.plugins.zoom.zoom.wheel.enabled = zoomOn;
        chart.options.plugins.zoom.zoom.pinch.enabled = zoomOn;
        chart.options.plugins.zoom.pan.enabled = panOn;
      }
    } catch (e) {
      console.warn('applyZoomPanOptions failed', e);
    }

    // keep wheel-pan listener attached (uses toggle state live)
    // zoom/pan is button-based

    try { chart.update('none'); } catch {}
  };

  const attachWheelPan = (chart) => {
    if (!chart || !chart.canvas) return;
    if (chart._wheelPanAttached) return;
    chart._wheelPanAttached = true;

    chart.canvas.addEventListener('wheel', (ev) => {
      const panEnabled = false;
      if (!panEnabled) return;

      const zoomEnabled = false;
      const dx = ev.deltaX || 0;
      const dy = ev.deltaY || 0;

      const wantsPan = (!zoomEnabled) || ev.shiftKey || (Math.abs(dx) > Math.abs(dy));
      if (!wantsPan) return;

      // prevent page scroll / chart zoom
      ev.preventDefault();

      // determine horizontal amount (prefer deltaX, fallback to deltaY for wheel)
      const amt = (Math.abs(dx) > 0) ? dx : dy;
      // scale down for usability
      const px = -amt * 0.8;

      if (typeof chart.pan === 'function') {
        chart.pan({ x: px, y: 0 }, undefined, 'default');
      }
    }, { passive: false });
  };


  const updateChart = (events, activeHoursInfo) => {
    const omitIdle = !!toggleOmitIdle.checked;
    const xMode = omitIdle ? 'linear' : 'time';

    let chartMode = 'cumulative';
    if (state.lastRange === 'day' && !omitIdle) {
      const v = state.dayView || 'combined';
      chartMode = (v === 'step') ? 'dayStep' : (v === 'hourly') ? 'dayHourly' : 'dayCombined';
    }

    const chart = ensureChartForMode(chartMode, xMode);

    // zoom/pan is button-based

    const setInteractionForMode = (modeKey) => {
      // Bars: require intersect to avoid showing tooltips for distant bars.
      if (modeKey === 'dayHourly' || modeKey === 'dayCombined') {
        chart.options.interaction = { mode: 'x', intersect: true };
        chart.options.hover = { mode: 'x', intersect: true };
        chart.options.plugins.tooltip.position = 'nearest';
      } else {
        chart.options.interaction = { mode: 'nearest', intersect: false };
        chart.options.hover = { mode: 'nearest', intersect: false };
        chart.options.plugins.tooltip.position = 'nearest';
      }
    };
    setInteractionForMode(chartMode);

    if (!events.length) {
      chart.data.datasets.forEach(ds => ds.data = []);
      chart.update();
      return;
    }

    const maxDelivery = buildMaxDelivery(events);

    // Day modes use business-day real bounds (04:00 -> next 04:00)
    if (chartMode === 'dayCombined' || chartMode === 'dayStep' || chartMode === 'dayHourly') {
      const bd = state.periodStartBD;
      const bounds = bd ? getBusinessDayRealBounds(bd) : null;
      const start = bounds ? bounds.start : null;
      const end = bounds ? bounds.end : null;

      const hrAmount = new Array(24).fill(0);
      const hrCount = new Array(24).fill(0);
      const hrAmountData = [];
      const hrCountData = [];

      let baseCum = 0, promoCum = 0;
      const baseLine = [];
      const promoLine = [];

      let cumAtMax = null;
      const maxKey = maxDelivery ? `${maxDelivery.rideId}|${maxDelivery.time.getTime()}|${maxDelivery.amount}` : null;

      let promoInPeriod = 0;

      for (const e of events) {
        if (start && end) {
          if (e.time < start || e.time >= end) continue;
        }

        if (e.kind === 'base') baseCum += e.amount;
        else if (e.kind === 'promo') { promoCum += e.amount; promoInPeriod += e.amount; }

        if (chartMode === 'dayCombined' || chartMode === 'dayStep') {
          baseLine.push({ x: e.time, y: baseCum });
          promoLine.push({ x: e.time, y: promoCum });
        }

        if (e.kind === 'base') {
          const idx = start ? Math.floor((e.time.getTime() - start.getTime()) / (60*60*1000)) : e.time.getHours();
          if (idx >= 0 && idx < 24) {
            hrAmount[idx] += e.amount;
            if (e.rideId) hrCount[idx] += 1;
          }
        }

        if (maxKey && e.kind === 'base') {
          const k = `${e.rideId}|${e.time.getTime()}|${e.amount}`;
          if (k === maxKey) cumAtMax = baseCum + promoCum;
        }
      }

      if (state.dayHourlyIncludePromo && promoInPeriod !== 0) {
        const perHour = promoInPeriod / 24;
        for (let i=0;i<24;i++) hrAmount[i] += perHour;
      }

      if (start) {
        for (let i=0;i<24;i++){
          const mid = new Date(start.getTime() + i*60*60*1000 + 30*60*1000);
          hrAmountData.push({ x: mid, y: hrAmount[i] });
          hrCountData.push({ x: mid, y: hrCount[i] });
        }
      }

      if (!state.chartViewEnabled) {
        if (start && end) {
          chart.options.scales.x.min = start;
          chart.options.scales.x.max = end;
        } else {
          delete chart.options.scales.x.min;
          delete chart.options.scales.x.max;
        }
      }

      const activeMinutes = (activeHoursInfo && activeHoursInfo.activeMinutes) ? activeHoursInfo.activeMinutes : 0;
      const activeHours = activeMinutes ? (activeMinutes / 60) : 0;
      const totalTrips = hrCount.reduce((a,b)=>a+b,0);
      const totalHourlyAmount = hrAmount.reduce((a,b)=>a+b,0);
      const avgWage = activeHours > 0 ? (totalHourlyAmount / activeHours) : null;
      const avgTPH = activeHours > 0 ? (totalTrips / activeHours) : null;

      const avgWageData = [];
      const avgTPHData = [];
      if (start && avgWage !== null) {
        for (let i=0;i<24;i++){
          const mid = new Date(start.getTime() + i*60*60*1000 + 30*60*1000);
          avgWageData.push({ x: mid, y: avgWage });
        }
      }
      if (start && avgTPH !== null) {
        for (let i=0;i<24;i++){
          const mid = new Date(start.getTime() + i*60*60*1000 + 30*60*1000);
          avgTPHData.push({ x: mid, y: avgTPH });
        }
      }

      if (chartMode === 'dayCombined') {
        chart.data.datasets[0].data = downsample(baseLine, 6000);
        chart.data.datasets[1].data = downsample(promoLine, 6000);
        chart.data.datasets[1].hidden = !togglePromo.checked;
        chart.data.datasets[2].data = hrAmountData;
        chart.data.datasets[3].data = hrCountData;
        chart.data.datasets[4].data = avgWageData;
        chart.data.datasets[5].data = avgTPHData;
        chart.data.datasets[6].data = [];
        if (maxDelivery && start && maxDelivery.time >= start && maxDelivery.time < end) {
          chart.data.datasets[6].data = [{ x: maxDelivery.time, y: cumAtMax ?? (baseCum + promoCum), meta: maxDelivery, t: maxDelivery.time.toISOString() }];
        }
      } else if (chartMode === 'dayStep') {
        chart.data.datasets[0].data = downsample(baseLine, 6000);
        chart.data.datasets[1].data = downsample(promoLine, 6000);
        chart.data.datasets[1].hidden = !togglePromo.checked;
        chart.data.datasets[2].data = [];
        if (maxDelivery && start && maxDelivery.time >= start && maxDelivery.time < end) {
          chart.data.datasets[2].data = [{ x: maxDelivery.time, y: cumAtMax ?? (baseCum + promoCum), meta: maxDelivery, t: maxDelivery.time.toISOString() }];
        }
      } else if (chartMode === 'dayHourly') {
        chart.data.datasets[0].data = hrAmountData;
        chart.data.datasets[1].data = hrCountData;
        chart.data.datasets[2].data = avgWageData;
        chart.data.datasets[3].data = avgTPHData;
        chart.data.datasets[4].data = [];
        if (maxDelivery && start && maxDelivery.time >= start && maxDelivery.time < end) {
          chart.data.datasets[4].data = [{ x: maxDelivery.time, y: maxDelivery.amount, meta: maxDelivery, t: maxDelivery.time.toISOString() }];
        }
      }

      chart.options.plugins.tooltip.callbacks = {
        title: (items) => {
          if (!items || !items.length) return '';
          const p = items[0].parsed;
          if (p && p.x) return new Date(p.x).toLocaleString('ja-JP');
          return '';
        },
        label: (ctx) => {
          if (chartMode === 'dayCombined') {
            if (ctx.datasetIndex === 0) return `配達報酬（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 1) return `プロモーション（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 2) return `時間別報酬: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 3) return `時間別件数: ${ctx.parsed.y}件`;
            if (ctx.datasetIndex === 4) return `平均時給: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 5) return `平均 配達/時: ${ctx.parsed.y.toFixed(2)}件`;
            if (ctx.datasetIndex === 6) return `最高報酬の配達`;
          } else if (chartMode === 'dayStep') {
            if (ctx.datasetIndex === 0) return `配達報酬（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 1) return `プロモーション（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 2) return `最高報酬の配達`;
          } else if (chartMode === 'dayHourly') {
            if (ctx.datasetIndex === 0) return `時間別報酬: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 1) return `時間別件数: ${ctx.parsed.y}件`;
            if (ctx.datasetIndex === 2) return `平均時給: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 3) return `平均 配達/時: ${ctx.parsed.y.toFixed(2)}件`;
            if (ctx.datasetIndex === 4) return `最高報酬の配達`;
          }
          return '';
        },
        afterBody: (items) => {
          const it = items && items.length ? items[0] : null;
          if (!it) return '';
          const raw = it.raw;
          const meta = raw && raw.meta ? raw.meta : null;
          if (!meta) return '';
          const lines = [];
          if (meta.pickupName) lines.push(`店舗: ${meta.pickupName}`);
          if (!state.hideDropoff) {
            const dropShort = extractWardTown(meta.dropoffAddr) || meta.dropoffAddr || '';
            if (dropShort) lines.push(`降車: ${dropShort}`);
          }
          const dur = formatDuration(meta.deliveryMinutes);
          if (dur) lines.push(`配達時間: ${dur}`);
          lines.push(`報酬: ${fmtYen(meta.amount)}`);
          return lines;
        }
      };

      applyChartViewport(chart);
    chart.update();
      return;
    }

    // cumulative (existing behavior, with optional omit-idle compression)
    const keptInfo = omitIdle ? computeKeptHours(events) : null;
    const indexByHour = omitIdle ? keptInfo.indexByHour : (activeHoursInfo ? activeHoursInfo.indexByHour : new Map());

    let baseCum = 0;
    let promoCum = 0;
    const baseData = [];
    const promoData = [];
    const pointData = [];
    let cumAtMax = null;
    const maxKey = maxDelivery ? `${maxDelivery.rideId}|${maxDelivery.time.getTime()}|${maxDelivery.amount}` : null;

    for (const e of events) {
      if (e.kind === 'base') baseCum += e.amount;
      else if (e.kind === 'promo') promoCum += e.amount;

      const x = omitIdle ? computeVirtualX(e.time, indexByHour) : e.time;
      baseData.push({ x, y: baseCum });
      promoData.push({ x, y: promoCum });

      if (e.kind === 'base' && e.rideId) {
        pointData.push({ x, y: baseCum + promoCum, meta: e, t: e.time.toISOString() });
      }

      if (maxKey && e.kind === 'base') {
        const k = `${e.rideId}|${e.time.getTime()}|${e.amount}`;
        if (k === maxKey) cumAtMax = baseCum + promoCum;
      }
    }

    chart.data.datasets[0].data = downsample(baseData, 6000);
    chart.data.datasets[1].data = downsample(promoData, 6000);
    chart.data.datasets[1].hidden = !togglePromo.checked;
    chart.data.datasets[2].data = downsample(pointData, 4000);
    chart.data.datasets[3].data = [];

    if (maxDelivery) {
      const x = omitIdle ? computeVirtualX(maxDelivery.time, indexByHour) : maxDelivery.time;
      chart.data.datasets[3].data = [{ x, y: cumAtMax ?? (baseCum + promoCum), meta: maxDelivery, t: maxDelivery.time.toISOString() }];
    }

    if (omitIdle) {
      chart.options.scales.x.type = 'linear';
      chart.options.scales.x.title = { display: true, text: '稼働時間（省略表示）' };
      if (!chart.options.scales.x.ticks) chart.options.scales.x.ticks = {};
      chart.options.scales.x.ticks.callback = (v) => `${Math.round(Number(v))}h`;
    } else {
      chart.options.scales.x.type = 'time';
      chart.options.scales.x.title = { display: false };
      if (chart.options.scales.x.ticks) delete chart.options.scales.x.ticks.callback;
    }

    chart.options.plugins.tooltip.callbacks = {
      title: (items) => {
        if (!items || !items.length) return '';
        const raw = items[0].raw;
        if (raw && raw.t) return new Date(raw.t).toLocaleString('ja-JP');
        const p = items[0].parsed;
        if (p && p.x && typeof p.x === 'object') return new Date(p.x).toLocaleString('ja-JP');
        return '';
      },
      label: (ctx) => {
        if (ctx.datasetIndex === 0) return `配達報酬（累積）: ${fmtYen(ctx.parsed.y)}`;
        if (ctx.datasetIndex === 1) return `プロモーション（累積）: ${fmtYen(ctx.parsed.y)}`;
        if (ctx.datasetIndex === 2) return `配達（詳細）`;
        if (ctx.datasetIndex === 3) return `最高報酬の配達`;
        return '';
      },
      afterBody: (items) => {
        if (!items || !items.length) return '';
        const scatter = items.find(it => it.datasetIndex === 2 || it.datasetIndex === 3);
        if (!scatter) return '';
        const raw = scatter.raw;
        const meta = raw && raw.meta ? raw.meta : null;
        if (!meta) return '';
        const lines = [];
        if (meta.pickupName) lines.push(`店舗: ${meta.pickupName}`);
        if (!state.hideDropoff) {
        const dropShort = extractWardTown(meta.dropoffAddr) || meta.dropoffAddr || '';
        if (dropShort) lines.push(`降車: ${dropShort}`);
      }
        const dur = formatDuration(meta.deliveryMinutes);
        if (dur) lines.push(`配達時間: ${dur}`);
        lines.push(`報酬: ${fmtYen(meta.amount)}`);
        return lines;
      }
    };

    chart.update();
  };

  // ====== Stats & details ======
const formatHM = (minutes) => {
    const m = Math.max(0, Math.round(minutes));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h${String(mm).padStart(2,'0')}m`;
  };

  const updateStats = (events) => {
    let base = 0, promo = 0, trips = 0;
    const baseEvents = [];

    for (const e of events) {
      if (e.kind === 'base') {
        base += e.amount;
        if (e.rideId) trips += 1;
        baseEvents.push(e);
      } else if (e.kind === 'promo') {
        promo += e.amount;
      }
    }

    const activeInfo = computeActiveHours(baseEvents);
    const activeMinutes = activeInfo.activeMinutes || 0;

    statBase.textContent = fmtYen(base);
    statPromo.textContent = fmtYen(promo);
    statTotal.textContent = fmtYen(base + promo);
    statTrips.textContent = trips.toLocaleString();
    statActiveHours.textContent = activeMinutes ? formatHM(activeMinutes) : '-';

    if (activeMinutes > 0) {
      const hours = activeMinutes / 60;
      const hourlyNoPromo = base / hours;
      const hourlyWithPromo = (base + promo) / hours;
      setText(statHourly, fmtYen(hourlyNoPromo));
      setText(statHourlyWithPromo, `promo込 ${fmtYen(hourlyWithPromo)}`);
      const tph = trips / hours;
      setText(statTripsPerHour, tph.toFixed(2));

      if (trips > 0) {
        const unitNoPromo = base / trips;
        const unitWithPromo = (base + promo) / trips;
        setText(statUnit, fmtYen(unitNoPromo));
        setText(statUnitWithPromo, `promo込 ${fmtYen(unitWithPromo)}`);
      } else {
        setText(statUnit, '-');
        setText(statUnitWithPromo, '-');
      }
    } else {
      setText(statHourly, '-');
      setText(statHourlyWithPromo, '-');
      setText(statTripsPerHour, '-');
      setText(statUnit, '-');
      setText(statUnitWithPromo, '-');
    }

    return activeInfo;
  };

  const buildDetailRows = (events) => {
    return events
      .filter(e => e.kind === 'base') // 詳細は配達のみ
      .map(e => ({
        reqMs: e.requestTime ? e.requestTime.getTime() : null,
        dropMs: e.time.getTime(),
        kindLabel: '配達報酬',
        amount: e.amount,
        pickupDisplay: e.pickupName || storeNameFromAddress(e.pickupAddr || ''),
        dropoffRaw: (e.dropoffAddr || ''),
        dropoffZip: (() => {
          const src = (e.dropoffAddr || e.rawDropoff || e.dropoffRaw || '');
          return extractZipFromText(src);
        })(),
        dropoffDisplay: (() => {
          const src = (e.dropoffAddr || e.rawDropoff || e.dropoffRaw || '');
          const z = (extractZipFromText(src) || '').toString().trim();
          if (z && state.zipDictReady) {
            const s = kanjiShortFromZip(z);
            if (s) return s;
          }
          // fallback: shorten for both JP/EN addresses
          return shortenAddress(src);
        })(),
        deliveryMinutes: e.deliveryMinutes,
        hourlyWage: (e.deliveryMinutes && e.deliveryMinutes > 0) ? (e.amount * 60 / e.deliveryMinutes) : null,
        searchable: [
          (e.pickupName || ''),
          (e.pickupAddr || ''),
          (e.dropoffAddr || '')
        ].join(' ').toLowerCase(),
      }));
  };

  const applyDetailSort = (rows) => {
    const k = state.detailSortKey || 'drop';
    const dir = (state.detailSortDir === 1) ? 1 : -1;

    const cmpStr = (a, b) => (a || '').toString().localeCompare((b || '').toString(), 'ja', { sensitivity:'base' });
    const cmpNum = (a, b) => (Number(a) - Number(b));

    rows.sort((ra, rb) => {
      switch (k) {
        case 'kind': return dir * cmpStr(ra.kindLabel, rb.kindLabel);
        case 'req':  return dir * cmpNum(ra.reqMs || 0, rb.reqMs || 0);
        case 'drop': return dir * cmpNum(ra.dropMs || 0, rb.dropMs || 0);
        case 'dur':  return dir * cmpNum(ra.deliveryMinutes ?? 0, rb.deliveryMinutes ?? 0);
        case 'amount': return dir * cmpNum(ra.amount ?? 0, rb.amount ?? 0);
        case 'wage': {
          const av = ra.hourlyWage ?? (dir > 0 ? 1e18 : -1);
          const bv = rb.hourlyWage ?? (dir > 0 ? 1e18 : -1);
          return dir * cmpNum(av, bv);
        }
        case 'pickup': return dir * cmpStr(ra.pickupDisplay, rb.pickupDisplay);
        case 'dropoff': return dir * cmpStr(ra.dropoffRaw || ra.dropoffDisplay, rb.dropoffRaw || rb.dropoffDisplay);
        case 'zip': return dir * cmpStr(ra.dropoffZip, rb.dropoffZip);
        default: return dir * cmpNum(ra.dropMs || 0, rb.dropMs || 0);
      }
    });
  };

  const renderDetails = (events) => {
    const qPickup = (pickupSearchBox && pickupSearchBox.value ? pickupSearchBox.value : '').toString().trim();
    const qDropoff = (dropoffSearchBox && dropoffSearchBox.value ? dropoffSearchBox.value : '').toString().trim();
    let rows = buildDetailRows(events);

    const num = (el) => {
      const v = (el && el.value !== undefined) ? String(el.value).trim() : '';
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const amtMin = num(fAmtMin), amtMax = num(fAmtMax);
    const wageMin = num(fWageMin), wageMax = num(fWageMax);
    const durMin = num(fDurMin), durMax = num(fDurMax);

    rows = rows.filter(r => {
      if (qPickup && !matchesQuery(buildPickupTarget(r), qPickup)) return false;
      if (qDropoff && !matchesQuery(buildDropoffTarget(r), qDropoff)) return false;
      if (amtMin !== null && r.amount < amtMin) return false;
      if (amtMax !== null && r.amount > amtMax) return false;

      const w = r.hourlyWage ?? null;
      if (wageMin !== null && (w === null || w < wageMin)) return false;
      if (wageMax !== null && (w === null || w > wageMax)) return false;

      const d = r.deliveryMinutes ?? null;
      if (durMin !== null && (d === null || d < durMin)) return false;
      if (durMax !== null && (d === null || d > durMax)) return false;
      return true;
    });

    applyDetailSort(rows);

    const MAX = 1200;
    const shown = rows.slice(0, MAX);

    detailTbody.textContent = '';
    state.detailRowMap.clear();
    const frag = document.createDocumentFragment();

    for (const r of shown) {
      const tr = document.createElement('tr');

      const rowId = `${r.rideId || ''}__${r.dropMs || ''}__${Math.round(r.amount || 0)}`;
      tr.dataset.rowid = rowId;
      state.detailRowMap.set(rowId, r);

      const tdKind = document.createElement('td');
      tdKind.textContent = r.kindLabel || '';
      tr.appendChild(tdKind);

      const tdReq = document.createElement('td');
      tdReq.textContent = r.reqMs ? new Date(r.reqMs).toLocaleString('ja-JP') : '';
      tr.appendChild(tdReq);

      const tdDrop = document.createElement('td');
      tdDrop.textContent = new Date(r.dropMs).toLocaleString('ja-JP');
      tr.appendChild(tdDrop);

      const tdDur = document.createElement('td');
      tdDur.className = 'num';
      tdDur.textContent = formatDuration(r.deliveryMinutes) || '';
      tr.appendChild(tdDur);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'num';
      tdAmt.textContent = Math.round(r.amount).toLocaleString('ja-JP') + '円';
      tr.appendChild(tdAmt);

      const tdWage = document.createElement('td');
      tdWage.className = 'num';
      tdWage.textContent = (r.hourlyWage !== null && r.hourlyWage !== undefined)
        ? (Math.round(r.hourlyWage).toLocaleString('ja-JP') + '円/時')
        : '';
      tr.appendChild(tdWage);

      const tdPickup = document.createElement('td');
      tdPickup.textContent = r.pickupDisplay || '';
      tdPickup.classList.add('clickableCell');
      tdPickup.dataset.rawKey = 'pickup';
      tr.appendChild(tdPickup);

      const tdDropAddr = document.createElement('td');
      tdDropAddr.className = 'dropoff-col';
      tdDropAddr.textContent = state.hideDropoff ? '' : (r.dropoffDisplay || '');
      if (!state.hideDropoff) {
        tdDropAddr.classList.add('clickableCell');
        tdDropAddr.dataset.rawKey = 'dropoff';
      }
      tr.appendChild(tdDropAddr);

      const tdZip = document.createElement('td');
      tdZip.className = 'num';
      tdZip.textContent = (r.dropoffZip || '');
      tdZip.classList.add('clickableCell');
      tdZip.dataset.rawKey = 'zip';
      tr.appendChild(tdZip);

      frag.appendChild(tr);
    }

    detailTbody.appendChild(frag);

    const note = [];
    note.push(`対象 ${rows.length.toLocaleString()}件`);
    if (rows.length > MAX) note.push(`表示 ${MAX.toLocaleString()}件（以降は省略）`);
    const qSummary = [qPickup && ('乗車:' + qPickup), qDropoff && ('降車:' + qDropoff)].filter(Boolean).join(' / ');
    if (qSummary) note.push(`検索: "${qSummary}"`);
    if (state.hideDropoff) note.push('降車場所: 非表示');
    detailNote.textContent = note.join(' / ');
  };

  // ====== Main refresh ======
  const refreshAll = () => {
    ensureChartViewportDefaults();
    const eventsAll = buildEvents();
    const rangeKey = state.lastRange || 'week';
    updatePeriodUI(eventsAll);

    const events = filterEventsByRange(eventsAll, rangeKey);
    const activeInfo = updateStats(events);
    updateChart(events, activeInfo);
    renderDetails(events);
    updateRankUI();
    renderRankings(events);
  };

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const getThemeChartColors = () => ({
    text: cssVar('--text', '#e8eef7'),
    muted: cssVar('--muted', '#9db0c9'),
    grid: cssVar('--grid', 'rgba(29,42,60,.6)'),
  });

const updateDayViewVisibility = () => {
    if (!dayViewGroup) return;
    const show = state.lastRange === 'day';
    dayViewGroup.style.display = show ? '' : 'none';
  };

const setActiveRange = (rangeKey) => {
    state.lastRange = rangeKey;
    resetChartViewport(state.chart);
    updateDayViewVisibility();
    for (const b of pills) b.classList.toggle('is-active', b.dataset.range === rangeKey);
    if (rangeKey === 'week' && state.periodStartBD) state.periodStartBD = clampWeekStartMondayStr(state.periodStartBD);
    if (rangeKey === 'month' && state.periodStartBD) state.periodStartBD = clampMonthStartStr(state.periodStartBD);
    refreshAll();
  };

  // ====== Drag & drop ======
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  dropzone.addEventListener('dragenter', (e) => { stop(e); dropzone.classList.add('is-dragover'); });
  dropzone.addEventListener('dragover', (e) => { stop(e); dropzone.classList.add('is-dragover'); });
  dropzone.addEventListener('dragleave', (e) => { stop(e); dropzone.classList.remove('is-dragover'); });
  dropzone.addEventListener('drop', async (e) => {
    stop(e);
    dropzone.classList.remove('is-dragover');
    const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
    await readFiles(files);
  });

  filePicker.addEventListener('change', async (e) => {
    const files = e.target.files || [];
    await readFiles(files);
    filePicker.value = '';
  });

  // ====== UI bindings ======
  pills.forEach(b => b.addEventListener('click', () => setActiveRange(b.dataset.range)));

  periodStart.addEventListener('change', () => {
    const v = normalizeBizDateStr(periodStart.value);
    if (!v) return;
    state.periodStartBD = v;
    if (state.lastRange === 'week') state.periodStartBD = clampWeekStartMondayStr(v);
    if (state.lastRange === 'month') state.periodStartBD = clampMonthStartStr(v);
    periodStart.value = state.periodStartBD || v;
    refreshAll();
  });

  periodEnd.addEventListener('change', () => {
    const v = normalizeBizDateStr(periodEnd.value);
    if (!v) return;
    state.periodEndBD = v;
    refreshAll();
  });

  btnPrev.addEventListener('click', () => stepPeriod(-1));
  btnNext.addEventListener('click', () => stepPeriod(1));

  toggleRound10.addEventListener('change', () => {
  state.round10 = !!toggleRound10.checked;
  state.dayView = dayViewSelect.value || 'combined';
    loadStatus.textContent = (state.paymentsByTxnId.size || state.tripsByRideId.size)
      ? '四捨五入設定（100円単位）を変更しました。反映にはデータをクリアして再読み込みしてください。'
      : loadStatus.textContent;
  });

  togglePromo.addEventListener('change', () => refreshAll());
  toggleOmitIdle.addEventListener('change', () => refreshAll());
  toggleFailed.addEventListener('change', () => refreshAll());
  pickupSearchBox.addEventListener('input', () => refreshAll());
  if (dropoffSearchBox) dropoffSearchBox.addEventListener('input', () => refreshAll());

  toggleHourlyPromo.addEventListener('change', () => {
    // hourly chart aggregation (promo include/exclude)
    state.dayHourlyIncludePromo = !!toggleHourlyPromo.checked;
    refreshAll();
  });

  // initial
  state.dayHourlyIncludePromo = !!toggleHourlyPromo.checked;

  // ===== Chart viewport buttons (no plugin dependency) =====
  const zoomChart = (factor) => {
    if (!state.chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    let curMin = state.chart.options.scales.x.min ?? b.minMs;
    let curMax = state.chart.options.scales.x.max ?? b.maxMs;
    curMin = typeof curMin === 'number' ? curMin : new Date(curMin).getTime();
    curMax = typeof curMax === 'number' ? curMax : new Date(curMax).getTime();

    const center = (curMin + curMax) / 2;
    const span = Math.max(60*1000, (curMax - curMin) * factor);

    const fullSpan = b.maxMs - b.minMs;
    const clampedSpan = Math.min(span, fullSpan);

    let min = center - clampedSpan / 2;
    let max = center + clampedSpan / 2;
    if (min < b.minMs) { max += (b.minMs - min); min = b.minMs; }
    if (max > b.maxMs) { min -= (max - b.maxMs); max = b.maxMs; }
    min = clamp(min, b.minMs, b.maxMs - clampedSpan);
    max = min + clampedSpan;

    state.chartViewEnabled = true;
    state.chartViewMin = min;
    state.chartViewMax = max;
    applyChartViewport(state.chart);
    try { state.chart.update('none'); } catch {}
  };

  const panChart = (dir) => {
    if (!state.chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    let curMin = state.chart.options.scales.x.min ?? b.minMs;
    let curMax = state.chart.options.scales.x.max ?? b.maxMs;
    curMin = typeof curMin === 'number' ? curMin : new Date(curMin).getTime();
    curMax = typeof curMax === 'number' ? curMax : new Date(curMax).getTime();

    const span = Math.max(60*1000, curMax - curMin);
    const delta = span * 0.2 * dir;

    let min = curMin + delta;
    let max = curMax + delta;
    if (min < b.minMs) { max += (b.minMs - min); min = b.minMs; }
    if (max > b.maxMs) { min -= (max - b.maxMs); max = b.maxMs; }
    min = clamp(min, b.minMs, b.maxMs - span);
    max = min + span;

    state.chartViewEnabled = true;
    state.chartViewMin = min;
    state.chartViewMax = max;
    applyChartViewport(state.chart);
    try { state.chart.update('none'); } catch {}
  };

  if (btnChartZoomIn) btnChartZoomIn.addEventListener('click', () => zoomChart(0.7));
  if (btnChartZoomOut) btnChartZoomOut.addEventListener('click', () => zoomChart(1.3));
  if (btnChartLeft) btnChartLeft.addEventListener('click', () => panChart(-1));
  if (btnChartRight) btnChartRight.addEventListener('click', () => panChart(1));
  if (btnChartReset) btnChartReset.addEventListener('click', () => resetChartViewport(state.chart));


  if (dayViewSelect) {
    dayViewSelect.addEventListener('change', () => {
      state.dayView = dayViewSelect.value || 'combined';
      refreshAll();
    });
  }

  btnClear.addEventListener('click', () => {
    state.paymentsByTxnId.clear();
    state.tripsByRideId.clear();
    state.periodStartBD = null;
    state.periodEndBD = null;
    loadStatus.textContent = '未読み込み';
    refreshAll();
  });

  btnExport.addEventListener('click', () => {
    const eventsAll = buildEvents();
    const payload = {
      exportedAt: new Date().toISOString(),
      totals: {
        paymentsRows: state.paymentsByTxnId.size,
        tripsRows: state.tripsByRideId.size,
      },
      payments: [...state.paymentsByTxnId.values()],
      trips: [...state.tripsByRideId.values()],
      events: eventsAll.map(e => ({
        kind: e.kind,
        time: e.time.toISOString(),
        requestTime: e.requestTime ? e.requestTime.toISOString() : null,
        businessDate: e.businessDate,
        amount: e.amount,
        rideId: e.rideId,
        txnIds: e.txnIds,
        pickupName: e.pickupName,
        pickupAddr: e.pickupAddr,
        dropoffAddr: e.dropoffAddr,
        note: e.note,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });


  // ----- Detail filters/actions -----
  if (btnClearDetailFilters) {
    btnClearDetailFilters.addEventListener('click', () => {
      if (pickupSearchBox) pickupSearchBox.value = '';
      if (dropoffSearchBox) dropoffSearchBox.value = '';
      if (fAmtMin) fAmtMin.value = '';
      if (fAmtMax) fAmtMax.value = '';
      if (fWageMin) fWageMin.value = '';
      if (fWageMax) fWageMax.value = '';
      if (fDurMin) fDurMin.value = '';
      if (fDurMax) fDurMax.value = '';
      refreshAll();
    });
  }

  if (toggleHideDropoff) {
    toggleHideDropoff.addEventListener('change', () => {
      state.hideDropoff = !!toggleHideDropoff.checked;
      document.body.classList.toggle('hide-dropoff', state.hideDropoff);
      refreshAll();
    });
  }

  // ----- Detail header sort (click to sort, click again to toggle) -----
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const raw = (th.getAttribute('data-sort') || '').trim();
      if (!raw) return;
      const base = raw.replace(/(Asc|Desc)$/,'');
      const initialDir = raw.endsWith('Asc') ? 1 : -1;

      if (state.detailSortKey === base) {
        state.detailSortDir = (state.detailSortDir === 1) ? -1 : 1;
      } else {
        state.detailSortKey = base;
        state.detailSortDir = initialDir;
      }
      refreshAll();
    });
  });


  // ===== Ranking control listeners =====
  const resetRankSortAuto = () => { state.rankSortKey = 'auto'; state.rankSortDir = -1; };

  if (rankTargetStore) rankTargetStore.addEventListener('click', () => { state.rankTarget = 'store'; resetRankSortAuto(); updateRankUI(); refreshAll(); });
  if (rankTargetDropoff) rankTargetDropoff.addEventListener('click', () => { state.rankTarget = 'dropoff'; resetRankSortAuto(); updateRankUI(); refreshAll(); });

  if (rankMetricCount) rankMetricCount.addEventListener('click', () => { state.rankMetric = 'count'; resetRankSortAuto(); updateRankUI(); refreshAll(); });
  if (rankMetricWage) rankMetricWage.addEventListener('click', () => { state.rankMetric = 'wage'; resetRankSortAuto(); updateRankUI(); refreshAll(); });
  if (rankMetricDuration) rankMetricDuration.addEventListener('click', () => { state.rankMetric = 'duration'; resetRankSortAuto(); updateRankUI(); refreshAll(); });

  if (rankDurAvg) rankDurAvg.addEventListener('click', () => { state.rankDurationMode = 'avg'; resetRankSortAuto(); updateRankUI(); refreshAll(); });
  if (rankDurTotal) rankDurTotal.addEventListener('click', () => { state.rankDurationMode = 'total'; resetRankSortAuto(); updateRankUI(); refreshAll(); });

  // header click sort for ranking
  document.querySelectorAll('#rankTable th[data-rsort]').forEach(th => {
    th.addEventListener('click', () => {
      const raw = (th.getAttribute('data-rsort') || '').trim();
      if (!raw) return;
      const base = raw.replace(/(Asc|Desc)$/,'');
      const initialDir = raw.endsWith('Asc') ? 1 : -1;
      const map = { label:'label', count:'count', wage:'wage', dur:'durAvg', amount:'amount', avgAmount:'avgAmount', rank:'rank' };
      let key = base;
      if (key === 'dur') key = (state.rankDurationMode === 'total') ? 'durTotal' : 'durAvg';
      if (key === 'label') key = 'label';
      if (key === 'count') key = 'count';
      if (key === 'wage') key = 'wage';
      if (key === 'amount') key = 'amount';
      if (key === 'avgAmount') key = 'avgAmount';
      if (key === 'rank') { state.rankSortKey = 'auto'; state.rankSortDir = -1; refreshAll(); return; }

      if (state.rankSortKey === key) {
        state.rankSortDir = (state.rankSortDir === 1) ? -1 : 1;
      } else {
        state.rankSortKey = key;
        state.rankSortDir = initialDir;
      }
      refreshAll();
    });
  });



  // ===== Jump buttons (▲▼) =====
  document.querySelectorAll('.jumpBtn[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-scroll-to');
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  // ===== Zip dict UI init =====
  const setZipStatus = (msg) => { if (zipDictStatus) zipDictStatus.textContent = msg; };
  if (zipDictHint && location && location.protocol === 'file:') {
    zipDictHint.style.display = 'block';
  }
  if (zipDictLoadBtn && zipDictLoader) {
    zipDictLoadBtn.addEventListener('click', () => {
      if (state.zipDictReady) { refreshAll(); return; }
      // For file://, prefer file picker (fetch may be blocked)
      if (location && location.protocol === 'file:') {
        zipDictLoader.click();
        return;
      }
      setZipStatus('読み込み中...');
      ensureZipDict().then(() => { setZipStatus('読み込み済み'); refreshAll(); })
        .catch(() => { setZipStatus('読込失敗（ファイルから選択してください）'); zipDictLoader.click(); });
    });

    zipDictLoader.addEventListener('change', () => {
      const f = zipDictLoader.files && zipDictLoader.files[0];
      if (!f) return;
      setZipStatus('読み込み中...');
      Papa.parse(f, {
        header: false,
        skipEmptyLines: true,
        worker: true,
        complete: (res) => {
          try {
            state.zipDict = buildZipDictFromRows(res.data || []);
            state.zipDictReady = true;
            setZipStatus('読み込み済み');
            refreshAll();
          } catch (e) {
            console.error(e);
            setZipStatus('読込失敗');
          }
        },
        error: (err) => {
          console.error(err);
          setZipStatus('読込失敗');
        },
      });
    });
  }
  if (state.zipDictReady) setZipStatus('読み込み済み');


  // ===== Workday marker datepicker init =====
  const initDatepicker = () => {
    if (typeof flatpickr !== 'function') return;
    const common = {
      dateFormat: 'Y-m-d',
      allowInput: true,
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        const s = yyyyMmDd(dayElem.dateObj);
        if (state.activeBizDates && state.activeBizDates.has(s)) {
          dayElem.classList.add('hasWorkDay');
        }
      },
    };

    try {
      // force text type (avoid native date picker)
      if (periodStart) { periodStart.type = 'text'; periodStart.setAttribute('inputmode','numeric'); }
      if (periodEnd) { periodEnd.type = 'text'; periodEnd.setAttribute('inputmode','numeric'); }

      if (periodStart && !state.fpStart) {
        state.fpStart = flatpickr(periodStart, {
          ...common,
          defaultDate: periodStart.value || null,
          onChange: (_sel, dateStr) => {
            if (dateStr) {
              periodStart.value = dateStr;
              periodStart.dispatchEvent(new Event('change'));
            }
          },
        });
      }
      if (periodEnd && !state.fpEnd) {
        state.fpEnd = flatpickr(periodEnd, {
          ...common,
          defaultDate: periodEnd.value || null,
          onChange: (_sel, dateStr) => {
            if (dateStr) {
              periodEnd.value = dateStr;
              periodEnd.dispatchEvent(new Event('change'));
            }
          },
        });
      }
    } catch (e) {
      console.warn('flatpickr init failed', e);
    }
  };

  initDatepicker();

  // ====== Init ======
  setActiveRange('month');
})();
