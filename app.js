/* 売上管理 Webアプリ（完全クライアントサイド） */
(() => {
  'use strict';

  // ====== DOM ======
  const dropzone = document.getElementById('dropzone');
  const filePicker = document.getElementById('filePicker');
  const loadStatus = document.getElementById('loadStatus');

  const pills = [...document.querySelectorAll('.pill[data-range]')];
  const togglePromo = document.getElementById('togglePromo');
  const toggleFailed = document.getElementById('toggleFailed');

  const statBase = document.getElementById('statBase');
  const statPromo = document.getElementById('statPromo');
  const statTotal = document.getElementById('statTotal');
  const statTrips = document.getElementById('statTrips');

  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  const detailTbody = document.getElementById('detailTbody');
  const detailNote = document.getElementById('detailNote');

  const btnClear = document.getElementById('btnClear');
  const btnExport = document.getElementById('btnExport');

  // ====== State ======
  const state = {
    paymentsByTxnId: new Map(),  // txnId -> normalized payment row
    tripsByRideId: new Map(),    // rideId -> normalized trip row
    lastRange: 'thisWeek',
    chart: null,
  };

  // ====== Helpers ======
  const fmtYen = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
  };

  const toNumber = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();
    if (!s) return 0;
    const cleaned = s.replace(/,/g, '').replace(/[^\d\.\-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  // "2026-02-08 15:59:37.745 +0900 JST" or "2026-02-13 03:13:10"
  const parseDateTime = (v) => {
    if (v === null || v === undefined) return null;
    let s = String(v).trim();
    if (!s) return null;
    s = s.replace(/\s+JST\b/i, '').trim();

    // YYYY-MM-DD HH:MM:SS(.sss) (+0900)?
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

  // Business date: local time, day flips at 04:00
  const businessDateStr = (d) => {
    const adj = new Date(d.getTime() - 4 * 60 * 60 * 1000);
    return yyyyMmDd(adj);
  };

  const dateFromBusinessStr = (s) => {
    // local midnight
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const startOfWeekMonday = (businessDate /*Date at midnight*/) => {
    const day = (businessDate.getDay() + 6) % 7; // Monday=0
    const start = new Date(businessDate);
    start.setDate(businessDate.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const startOfMonth = (businessDate /*Date at midnight*/) => {
    const d = new Date(businessDate);
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  };

  const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  
  const downsample = (arr, maxPoints) => {
    if (!arr || arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
    const out = [];
    for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
    // ensure last point
    if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
    return out;
  };

  // ====== CSV type detection & normalization ======
  const detectCsvType = (fileName, headers) => {
    const lower = (fileName || '').toLowerCase();
    const h = (headers || []).join('|');

    if (lower.includes('trip_activity')) return 'trip';
    if (lower.includes('payments_order')) return 'payment';

    // fallback by column hints
    if (h.includes('乗車の降車時間') || h.includes('乗車の uuid')) return 'trip';
    if (h.includes('取引ID') || h.includes('決済時間') || h.includes('支払い額')) return 'payment';

    return 'unknown';
  };

  const findCol = (headers, candidates) => {
    const set = new Set(headers);
    for (const c of candidates) {
      if (set.has(c)) return c;
    }
    // fuzzy contains
    for (const h of headers) {
      for (const c of candidates) {
        if (h.includes(c)) return h;
      }
    }
    return null;
  };

  const isIgnoredPaymentRow = (note) => {
    const normalized = String(note ?? '').trim().toLowerCase();
    return normalized === 'so.payout';
  };

  const normalizePaymentRow = (row, headers) => {
    const txnCol = findCol(headers, ['取引ID', 'transaction id', 'Transaction ID']);
    const rideCol = findCol(headers, ['乗車ID', '乗車の UUID', 'ride id', 'Trip UUID']);
    const amtCol  = findCol(headers, ['支払い額', '支払い額 ']); // allow trailing spaces
    const timeCol = findCol(headers, ['決済時間', 'payment time', '支払い時間']);
    const noteCol = findCol(headers, ['備考', 'note', 'remarks']);

    const txnId = txnCol ? String(row[txnCol] ?? '').trim() : '';
    if (!txnId) return null;

    const note = noteCol ? String(row[noteCol] ?? '').trim() : '';
    if (isIgnoredPaymentRow(note)) return null;

    const rideIdRaw = rideCol ? String(row[rideCol] ?? '').trim() : '';
    const rideId = rideIdRaw || null;

    const amount = amtCol ? toNumber(row[amtCol]) : 0;
    const paymentTime = timeCol ? parseDateTime(row[timeCol]) : null;

    return {
      txnId,
      rideId,
      amount,
      paymentTime,
      note,
    };
  };

  const normalizeTripRow = (row, headers) => {
    const rideCol = findCol(headers, ['乗車の UUID', '乗車ID', 'Trip UUID', 'ride id']);
    const dropoffCol = findCol(headers, ['乗車の降車時間', '降車時間', 'dropoff']);
    const pickupCol = findCol(headers, ['乗車場所の住所', 'pickup']);
    const dropoffAddrCol = findCol(headers, ['降車場所の住所', 'dropoff address']);
    const statusCol = findCol(headers, ['乗車ステータス', 'status']);

    const rideId = rideCol ? String(row[rideCol] ?? '').trim() : '';
    if (!rideId) return null;

    const dropoffTime = dropoffCol ? parseDateTime(row[dropoffCol]) : null;

    return {
      rideId,
      dropoffTime,
      pickupAddr: pickupCol ? String(row[pickupCol] ?? '').trim() : '',
      dropoffAddr: dropoffAddrCol ? String(row[dropoffAddrCol] ?? '').trim() : '',
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
      error: (err) => reject(err),
    });
  });

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
          console.warn('Unknown CSV type:', file.name);
        }
      } catch (e) {
        console.error(e);
        ignored++;
      }
    }

    loadStatus.textContent =
      `読み込み完了：payments_order +${addedPayments.toLocaleString()}件 / trip_activity +${addedTrips.toLocaleString()}件（重複・不明 ${ignored.toLocaleString()}件）` +
      `  |  合計：payments ${state.paymentsByTxnId.size.toLocaleString()}件 / trips ${state.tripsByRideId.size.toLocaleString()}件`;

    refreshAll();
  };

  // ====== Build events from merged data ======
  const buildEvents = () => {
    // Sum payments by rideId (rideId present)
    const paymentsByRide = new Map();
    const promoPayments = []; // rideId null

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

    // Trip-based (preferred time axis = dropoff time)
    for (const [rideId, t] of state.tripsByRideId.entries()) {
      if (!includeFailed) {
        const st = (t.status || '').toLowerCase();
        if (st && st !== 'completed') continue;
      }

      const pay = paymentsByRide.get(rideId);
      const amount = pay ? pay.amount : 0;

      // Even if amount is 0, keep event so that counts / timeline are consistent? -> keep only if payment exists or completed
      const eventTime = t.dropoffTime || (pay ? pay.lastPaymentTime : null);
      if (!eventTime) continue;

      events.push({
        kind: 'base',
        time: eventTime,
        businessDate: businessDateStr(eventTime),
        amount,
        rideId,
        txnIds: pay ? pay.txnIds : [],
        place: t.dropoffAddr || t.pickupAddr || '',
        note: pay ? pay.notes.join(' / ') : '',
      });

      // Remove so leftovers can be handled
      if (pay) paymentsByRide.delete(rideId);
    }

    // Leftover rideId payments without trip (fallback: payment time)
    for (const [rideId, pay] of paymentsByRide.entries()) {
      const eventTime = pay.lastPaymentTime;
      if (!eventTime) continue;
      events.push({
        kind: 'base',
        time: eventTime,
        businessDate: businessDateStr(eventTime),
        amount: pay.amount,
        rideId,
        txnIds: pay.txnIds,
        place: '',
        note: pay.notes.join(' / '),
      });
    }

    // Promo events: use paymentTime as time axis
    for (const p of promoPayments) {
      const eventTime = p.paymentTime;
      if (!eventTime) continue;
      events.push({
        kind: 'promo',
        time: eventTime,
        businessDate: businessDateStr(eventTime),
        amount: p.amount,
        rideId: null,
        txnIds: [p.txnId],
        place: '',
        note: p.note || '',
      });
    }

    // sort by time asc; tie-break base before promo for stable stacking
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
  const getRangeBounds = (events, rangeKey) => {
    if (!events.length) return null;

    // max business date
    let maxBD = events[events.length - 1].businessDate;
    // because events are sorted by time, last event has max time, but business date may not be max if time missing; safe enough
    // We'll compute max explicitly
    for (const e of events) {
      if (e.businessDate > maxBD) maxBD = e.businessDate;
    }
    const maxDate = dateFromBusinessStr(maxBD);
    if (!maxDate) return null;

    let start = null;
    let end = addDays(maxDate, 1); // exclusive upper bound

    switch (rangeKey) {
      case 'day':
        start = maxDate;
        break;
      case 'thisWeek':
        start = startOfWeekMonday(maxDate);
        break;
      case 'last7':
        start = addDays(maxDate, -6);
        break;
      case 'thisMonth':
        start = startOfMonth(maxDate);
        break;
      case 'all':
      default:
        start = null;
        end = null;
        break;
    }

    return { start, end, maxDate };
  };

  const filterEventsByRange = (events, rangeKey) => {
    if (rangeKey === 'all') return events;
    const b = getRangeBounds(events, rangeKey);
    if (!b) return [];
    const { start, end } = b;

    return events.filter(e => {
      const d = dateFromBusinessStr(e.businessDate);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d >= end) return false; // end exclusive
      return true;
    });
  };

  // ====== Chart ======
  const buildCumulativeSeries = (events) => {
    let baseCum = 0;
    let promoCum = 0;

    const baseData = [];
    const promoData = [];

    for (const e of events) {
      if (e.kind === 'base') baseCum += e.amount;
      else if (e.kind === 'promo') promoCum += e.amount;

      const x = e.time;
      baseData.push({ x, y: baseCum });
      promoData.push({ x, y: promoCum });
    }

    return { baseData, promoData, baseCum, promoCum };
  };

  const ensureChart = () => {
    if (state.chart) return state.chart;
    const ctx = document.getElementById('chart');

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '配達報酬（累積）',
            data: [],
            stepped: true,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
            stack: 'sales',
          },
          {
            label: 'プロモーション（累積）',
            data: [],
            stepped: true,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
            stack: 'sales',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          decimation: { enabled: true, algorithm: 'min-max' },
          legend: { display: true, labels: { color: '#e8eef7' } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || '';
                const v = ctx.parsed.y || 0;
                return `${label}: ${fmtYen(v)}`;
              },
              afterBody: (items) => {
                if (!items || !items.length) return '';
                // total = baseCum + promoCum (stacked)
                let base = 0, promo = 0;
                for (const it of items) {
                  if (it.datasetIndex === 0) base = it.parsed.y || 0;
                  if (it.datasetIndex === 1) promo = it.parsed.y || 0;
                }
                return `総売上（累積）: ${fmtYen(base + promo)}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'yyyy-MM-dd HH:mm' },
            ticks: { color: '#9db0c9' },
            grid: { color: 'rgba(29,42,60,.6)' },
          },
          y: {
            stacked: true,
            ticks: {
              color: '#9db0c9',
              callback: (v) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return v;
                return `${Math.round(n).toLocaleString()}円`;
              }
            },
            grid: { color: 'rgba(29,42,60,.6)' },
          },
        },
      }
    });

    // Promo initial visibility
    state.chart.data.datasets[1].hidden = !togglePromo.checked;
    state.chart.update();
    return state.chart;
  };

  const updateChart = (events) => {
    const chart = ensureChart();

    if (!events.length) {
      chart.data.datasets[0].data = [];
      chart.data.datasets[1].data = [];
      chart.update();
      return;
    }

    const { baseData, promoData } = buildCumulativeSeries(events);

    const baseDs = downsample(baseData, 6000);
    const promoDs = downsample(promoData, 6000);

    chart.data.datasets[0].data = baseDs;
    chart.data.datasets[1].data = promoDs;
    chart.data.datasets[1].hidden = !togglePromo.checked;

    chart.update();
  };

  // ====== Stats & details ======
  const updateStats = (events) => {
    let base = 0, promo = 0, trips = 0;
    for (const e of events) {
      if (e.kind === 'base') { base += e.amount; trips += (e.rideId ? 1 : 0); }
      if (e.kind === 'promo') promo += e.amount;
    }
    statBase.textContent = fmtYen(base);
    statPromo.textContent = fmtYen(promo);
    statTotal.textContent = fmtYen(base + promo);
    statTrips.textContent = trips.toLocaleString();
  };

  const buildDetailRows = (events) => {
    // copy for sorting/searching
    return events.map(e => ({
      ...e,
      timeMs: e.time.getTime(),
      kindLabel: e.kind === 'base' ? '配達報酬' : 'プロモーション',
      txnId: e.txnIds && e.txnIds.length ? e.txnIds[0] : '',
      ride: e.rideId || '',
      searchable: [
        e.kind,
        e.businessDate,
        e.rideId || '',
        (e.txnIds || []).join(' '),
        e.place || '',
        e.note || '',
      ].join(' ').toLowerCase(),
    }));
  };

  const applyDetailSort = (rows) => {
    const key = sortSelect.value;
    const dir = (key.endsWith('Desc') ? -1 : 1);

    rows.sort((a, b) => {
      if (key.startsWith('time')) return dir * (a.timeMs - b.timeMs);
      if (key.startsWith('amount')) return dir * (a.amount - b.amount);
      return dir * (a.timeMs - b.timeMs);
    });

    return rows;
  };

  const renderDetails = (events) => {
    const q = (searchBox.value || '').trim().toLowerCase();
    let rows = buildDetailRows(events);
    if (q) rows = rows.filter(r => r.searchable.includes(q));
    applyDetailSort(rows);

    const MAX = 1200;
    const shown = rows.slice(sortSelect.value.startsWith('timeDesc') ? 0 : 0, MAX);

    detailTbody.textContent = '';
    const frag = document.createDocumentFragment();

    for (const r of shown) {
      const tr = document.createElement('tr');

      const tdTime = document.createElement('td');
      tdTime.textContent = new Date(r.timeMs).toLocaleString('ja-JP');
      tr.appendChild(tdTime);

      const tdBD = document.createElement('td');
      tdBD.textContent = r.businessDate;
      tr.appendChild(tdBD);

      const tdKind = document.createElement('td');
      tdKind.textContent = r.kindLabel;
      tr.appendChild(tdKind);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'num';
      tdAmt.textContent = Math.round(r.amount).toLocaleString('ja-JP') + '円';
      tr.appendChild(tdAmt);

      const tdRide = document.createElement('td');
      tdRide.textContent = r.ride;
      tr.appendChild(tdRide);

      const tdTxn = document.createElement('td');
      tdTxn.textContent = r.txnId;
      tr.appendChild(tdTxn);

      const tdPlace = document.createElement('td');
      tdPlace.textContent = r.place || '';
      tr.appendChild(tdPlace);

      const tdNote = document.createElement('td');
      tdNote.textContent = r.note || '';
      tr.appendChild(tdNote);

      frag.appendChild(tr);
    }

    detailTbody.appendChild(frag);

    const note = [];
    note.push(`対象 ${rows.length.toLocaleString()}件`);
    if (rows.length > MAX) note.push(`表示 ${MAX.toLocaleString()}件（以降は省略）`);
    if (q) note.push(`検索: "${q}"`);
    detailNote.textContent = note.join(' / ');
  };

  // ====== Main refresh ======
  const refreshAll = () => {
    const eventsAll = buildEvents();
    const rangeKey = state.lastRange || 'thisWeek';
    const events = filterEventsByRange(eventsAll, rangeKey);

    updateStats(events);
    updateChart(events);
    renderDetails(events);
  };

  // ====== Events: range selection ======
  const setActiveRange = (rangeKey) => {
    state.lastRange = rangeKey;
    for (const b of pills) b.classList.toggle('is-active', b.dataset.range === rangeKey);
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

  togglePromo.addEventListener('change', () => refreshAll());
  toggleFailed.addEventListener('change', () => refreshAll());
  searchBox.addEventListener('input', () => refreshAll());
  sortSelect.addEventListener('change', () => refreshAll());

  btnClear.addEventListener('click', () => {
    state.paymentsByTxnId.clear();
    state.tripsByRideId.clear();
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
      // Export normalized rows (not raw CSV)
      payments: [...state.paymentsByTxnId.values()],
      trips: [...state.tripsByRideId.values()],
      events: eventsAll.map(e => ({
        kind: e.kind,
        time: e.time.toISOString(),
        businessDate: e.businessDate,
        amount: e.amount,
        rideId: e.rideId,
        txnIds: e.txnIds,
        place: e.place,
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

  // ====== Init ======
  setActiveRange('thisWeek');
})();
