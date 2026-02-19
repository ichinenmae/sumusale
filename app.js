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
  const toggleZoom = document.getElementById('toggleZoom');
  const togglePan = document.getElementById('togglePan');
  const btnResetZoom = document.getElementById('btnResetZoom');
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
    lastRange: 'week',
    periodStartBD: null,         // 'YYYY-MM-DD'
    periodEndBD: null,           // 'YYYY-MM-DD' (for custom)
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

  const storeNameFromAddress = (addr) => {
    if (!addr) return '';
    const s = String(addr).trim();
    if (!s) return '';
    // 典型: '店名, 日本、〒...' の形式
    const parts = s.split(/,|，/);
    const head = (parts[0] || '').trim();
    // 先頭が日本/郵便などの場合は店名なし扱い
    if (head.startsWith('日本') || head.startsWith('〒')) return '';
    return head;
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

  const normalizePaymentRow = (row, headers) => {
    const txnCol = findCol(headers, ['取引ID', 'transaction id', 'Transaction ID']);
    const rideCol = findCol(headers, ['乗車ID', '乗車の UUID', 'ride id', 'Trip UUID']);
    const amtCol  = findCol(headers, ['支払い額', '支払い額 ']); // allow trailing spaces
    const timeCol = findCol(headers, ['決済時間', 'payment time', '支払い時間']);
    const noteCol = findCol(headers, ['備考', 'note', 'remarks']);

    const txnId = txnCol ? String(row[txnCol] ?? '').trim() : '';
    if (!txnId) return null;

    const rideIdRaw = rideCol ? String(row[rideCol] ?? '').trim() : '';
    const rideId = rideIdRaw || null;

    const note = noteCol ? String(row[noteCol] ?? '').trim() : '';

    // so.payout は報酬支払（振込）で売上ではないため除外
    const hay = `${txnId} ${rideIdRaw} ${note}`.toLowerCase();
    if (hay.includes('so.payout')) return null;

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
    const requestCol = findCol(headers, ['乗車のリクエスト時間', '依頼時間', 'request']);
    const dropoffCol = findCol(headers, ['乗車の降車時間', '降車時間', 'dropoff']);
    const pickupCol = findCol(headers, ['乗車場所の住所', 'pickup']);
    const dropoffAddrCol = findCol(headers, ['降車場所の住所', 'dropoff address']);
    const statusCol = findCol(headers, ['乗車ステータス', 'status']);

    const rideId = rideCol ? String(row[rideCol] ?? '').trim() : '';
    if (!rideId) return null;

    const requestTime = requestCol ? parseDateTime(row[requestCol]) : null;
    const dropoffTime = dropoffCol ? parseDateTime(row[dropoffCol]) : null;

    return {
      rideId,
      requestTime,
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
        requestTime: t.requestTime || null,
        dropoffTime: t.dropoffTime || null,
        pickupAddr: t.pickupAddr || '',
        pickupName: storeNameFromAddress(t.pickupAddr || ''),
        dropoffAddr: t.dropoffAddr || '',
        businessDate: businessDateStr(eventTime),
        amount,
        rideId,
        txnIds: pay ? pay.txnIds : [],
        place: t.dropoffAddr || '',
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
        requestTime: t.requestTime || null,
        dropoffTime: t.dropoffTime || null,
        pickupAddr: t.pickupAddr || '',
        pickupName: storeNameFromAddress(t.pickupAddr || ''),
        dropoffAddr: t.dropoffAddr || '',
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
        requestTime: null,
        dropoffTime: null,
        pickupAddr: '',
        pickupName: '',
        dropoffAddr: '',
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
  const clampWeekStartMondayStr = (bdStr) => {
    const d = dateFromBusinessStr(bdStr);
    if (!d) return null;
    const start = startOfWeekMonday(d);
    return yyyyMmDd(start);
  };

  const clampMonthStartStr = (bdStr) => {
    const d = dateFromBusinessStr(bdStr);
    if (!d) return null;
    d.setDate(1);
    d.setHours(0,0,0,0);
    return yyyyMmDd(d);
  };

  const addMonths = (d, months) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
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
      } else {
        state.periodStartBD = maxBD;
      }
    }

    if (state.lastRange === 'custom' && !state.periodEndBD) state.periodEndBD = maxBD;

    periodStart.value = state.periodStartBD || '';
    if (state.lastRange === 'custom') periodEnd.value = state.periodEndBD || '';
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

    if (rangeKey === 'all') return { start: null, end: null, maxDate };

    const startBD = state.periodStartBD || maxBD;
    const startDate = dateFromBusinessStr(startBD);
    if (!startDate) return null;

    let start = null;
    let end = null;

    if (rangeKey === 'day') {
      start = startDate;
      end = addDays(start, 1);
    } else if (rangeKey === 'week') {
      const mondayBD = clampWeekStartMondayStr(startBD) || clampWeekStartMondayStr(maxBD);
      state.periodStartBD = mondayBD;
      periodStart.value = mondayBD || '';
      start = dateFromBusinessStr(mondayBD);
      end = addDays(start, 7);
    } else if (rangeKey === 'month') {
      const firstBD = clampMonthStartStr(startBD) || clampMonthStartStr(maxBD);
      state.periodStartBD = firstBD;
      periodStart.value = firstBD || '';
      start = dateFromBusinessStr(firstBD);
      end = addMonths(start, 1);
    } else if (rangeKey === 'custom') {
      const sBD = state.periodStartBD || maxBD;
      const eBD = state.periodEndBD || maxBD;
      const sD = dateFromBusinessStr(sBD);
      const eD = dateFromBusinessStr(eBD);
      if (!sD || !eD) return null;
      start = sD;
      end = addDays(eD, 1); // inclusive end
    }

    return { start, end, maxDate };
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
      periodEnd.value = state.periodEndBD || '';
    }

    periodStart.value = state.periodStartBD || '';
    refreshAll();
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

        // chartjs-plugin-zoom (UMD) register
    const zoomPlugin = window.ChartZoom || window.chartjsPluginZoom || window['chartjs-plugin-zoom'];
    if (zoomPlugin) Chart.register(zoomPlugin);

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
          zoom: {
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
            pan: { enabled: true, mode: 'x', modifierKey: 'shift' }
          },
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

  const updateChart = (events, activeHoursInfo) => {
    const chart = ensureChart();

    if (!events.length) {
      chart.data.datasets[0].data = [];
      chart.data.datasets[1].data = [];
      chart.update();
      return;
    }

    const omitIdle = !!toggleOmitIdle.checked;
    const indexByHour = (activeHoursInfo && activeHoursInfo.indexByHour) ? activeHoursInfo.indexByHour : new Map();

    const buildSeries = () => {
      let baseCum = 0;
      let promoCum = 0;
      const baseData = [];
      const promoData = [];

      for (const e of events) {
        if (e.kind === 'base') baseCum += e.amount;
        else if (e.kind === 'promo') promoCum += e.amount;

        if (omitIdle) {
          const vx = computeVirtualX(e.time, indexByHour);
          baseData.push({ x: vx, y: baseCum, t: e.time });
          promoData.push({ x: vx, y: promoCum, t: e.time });
        } else {
          baseData.push({ x: e.time, y: baseCum });
          promoData.push({ x: e.time, y: promoCum });
        }
      }
      return { baseData, promoData };
    };

    const { baseData, promoData } = buildSeries();

    const baseDs = downsample(baseData, 6000);
    const promoDs = downsample(promoData, 6000);

    chart.data.datasets[0].data = baseDs;
    chart.data.datasets[1].data = promoDs;
    chart.data.datasets[1].hidden = !togglePromo.checked;

    // switch x scale type
    if (omitIdle) {
      chart.options.scales.x.type = 'linear';
      chart.options.scales.x.title = { display: true, text: '稼働時間（省略表示）' };
      chart.options.scales.x.ticks.callback = (v) => `${Math.round(v)}h`;
      // tooltip title shows original datetime if available
      chart.options.plugins.tooltip.callbacks.title = (items) => {
        if (!items || !items.length) return '';
        const raw = items[0].raw;
        const t = raw && raw.t ? raw.t : null;
        return t ? new Date(t).toLocaleString('ja-JP') : '';
      };
      chart.options.plugins.zoom.zoom.mode = 'x';
      chart.options.plugins.zoom.pan.mode = 'x';
    } else {
      chart.options.scales.x.type = 'time';
      chart.options.scales.x.title = { display: false };
      chart.options.scales.x.ticks.callback = undefined;
      chart.options.plugins.tooltip.callbacks.title = undefined;
    }

    chart.update();
  };

  // ====== Working hours (estimated) ======
  const hourStartMs = (d) => {
    const x = new Date(d);
    x.setMinutes(0,0,0);
    return x.getTime();
  };

  // Determine active hours from base trips (prefer requestTime). Fill gaps < 6 hours as active.
  const computeActiveHours = (baseEvents) => {
    const active = new Set();
    const hours = [];

    for (const e of baseEvents) {
      const t = e.requestTime || e.time;
      if (!t) continue;
      const ms = hourStartMs(t);
      if (!active.has(ms)) {
        active.add(ms);
        hours.push(ms);
      }
    }

    hours.sort((a,b)=>a-b);

    // Fill gaps < 6h (i.e., deltaHours < 6)
    for (let i=0;i<hours.length-1;i++){
      const a = hours[i], b = hours[i+1];
      const delta = Math.round((b - a) / (60*60*1000));
      if (delta >= 2 && delta < 6) {
        for (let k=1;k<delta;k++){
          active.add(a + k*60*60*1000);
        }
      }
    }

    // Build sorted list & index map
    const sorted = [...active].sort((a,b)=>a-b);
    const indexByHour = new Map();
    for (let i=0;i<sorted.length;i++) indexByHour.set(sorted[i], i);

    return { activeSet: active, sortedHours: sorted, indexByHour };
  };

  const computeVirtualX = (dateObj, indexByHour) => {
    if (!dateObj) return 0;
    const ms0 = hourStartMs(dateObj);
    let idx = indexByHour.get(ms0);
    if (idx === undefined) {
      // if inactive hour, map to previous index (or 0)
      // find closest previous hour in map by stepping back up to 24h
      let tmp = ms0;
      for (let i=0;i<24;i++){
        tmp -= 60*60*1000;
        const v = indexByHour.get(tmp);
        if (v !== undefined) { idx = v; break; }
      }
      if (idx === undefined) idx = 0;
    }
    const frac = (dateObj.getMinutes() + dateObj.getSeconds()/60 + dateObj.getMilliseconds()/60000) / 60;
    return idx + frac;
  };

  // ====== Stats & details ======
  const updateStats = (events) => {
    let base = 0, promo = 0, trips = 0;
    const baseEvents = [];
    for (const e of events) {
      if (e.kind === 'base') {
        base += e.amount;
        if (e.rideId) trips += 1;
        baseEvents.push(e);
      }
      if (e.kind === 'promo') promo += e.amount;
    }

    const { sortedHours } = computeActiveHours(baseEvents);
    const activeHours = sortedHours.length;

    statBase.textContent = fmtYen(base);
    statPromo.textContent = fmtYen(promo);
    statTotal.textContent = fmtYen(base + promo);
    statTrips.textContent = trips.toLocaleString();

    statActiveHours.textContent = activeHours ? `${activeHours.toLocaleString()}h` : '-';
    if (activeHours) {
      const hourly = (base + promo) / activeHours;
      statHourly.textContent = fmtYen(hourly);
      statTripsPerHour.textContent = (trips / activeHours).toFixed(2);
    } else {
      statHourly.textContent = '-';
      statTripsPerHour.textContent = '-';
    }

    return { activeHoursInfo: computeActiveHours(baseEvents) };
  };

  const buildDetailRows = (events) => {
    // copy for sorting/searching
    return events.map(e => ({
      requestMs: e.requestTime ? e.requestTime.getTime() : null,
      dropoffMs: e.dropoffTime ? e.dropoffTime.getTime() : (e.kind==='base' ? e.time.getTime() : null),
      pickupName: e.pickupName || storeNameFromAddress(e.pickupAddr || ''),
      pickupAddr: e.pickupAddr || '',
      dropoffAddr: e.dropoffAddr || e.place || '',
        (e.pickupName || '') + ' ' + (e.pickupAddr || ''),
        (e.dropoffAddr || ''),
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
        (e.pickupName || '') + ' ' + (e.pickupAddr || ''),
        (e.dropoffAddr || ''),
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

      const tdReq = document.createElement('td');
      tdReq.textContent = r.requestMs ? new Date(r.requestMs).toLocaleString('ja-JP') : '';
      tr.appendChild(tdReq);

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

      const tdPickup = document.createElement('td');
      tdPickup.textContent = r.pickupName || '';
      tr.appendChild(tdPickup);

      const tdDrop = document.createElement('td');
      tdDrop.textContent = r.dropoffAddr || '';
      tr.appendChild(tdDrop);

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
    const rangeKey = state.lastRange || 'week';
    updatePeriodUI(eventsAll);
    const events = filterEventsByRange(eventsAll, rangeKey);

    const statsInfo = updateStats(events);
    updateChart(events, statsInfo ? statsInfo.activeHoursInfo : null);
    renderDetails(events);
  };

  // ====== Events: range selection ======
  const setActiveRange = (rangeKey) => {
    state.lastRange = rangeKey;
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
    const v = periodStart.value;
    if (!v) return;
    state.periodStartBD = v;
    if (state.lastRange === 'week') state.periodStartBD = clampWeekStartMondayStr(v);
    if (state.lastRange === 'month') state.periodStartBD = clampMonthStartStr(v);
    periodStart.value = state.periodStartBD || v;
    refreshAll();
  });

  periodEnd.addEventListener('change', () => {
    const v = periodEnd.value;
    if (!v) return;
    state.periodEndBD = v;
    refreshAll();
  });

  btnPrev.addEventListener('click', () => stepPeriod(-1));
  btnNext.addEventListener('click', () => stepPeriod(1));

  toggleZoom.addEventListener('change', () => {
    if (!state.chart) return;
    const z = state.chart.options.plugins && state.chart.options.plugins.zoom;
    if (!z) return;
    z.zoom.wheel.enabled = !!toggleZoom.checked;
    z.zoom.pinch.enabled = !!toggleZoom.checked;
    state.chart.update('none');
  });

  togglePan.addEventListener('change', () => {
    if (!state.chart) return;
    const z = state.chart.options.plugins && state.chart.options.plugins.zoom;
    if (!z) return;
    z.pan.enabled = !!togglePan.checked;
    state.chart.update('none');
  });

  btnResetZoom.addEventListener('click', () => {
    if (!state.chart) return;
    if (typeof state.chart.resetZoom === 'function') state.chart.resetZoom();
  });

  togglePromo.addEventListener('change', () => refreshAll());
  toggleOmitIdle.addEventListener('change', () => refreshAll());
  toggleFailed.addEventListener('change', () => refreshAll());
  searchBox.addEventListener('input', () => refreshAll());
  sortSelect.addEventListener('change', () => refreshAll());

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
  setActiveRange('week');
})();