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
  const statTip = document.getElementById('statTip');
  const statPromo = document.getElementById('statPromo');
  const statPromoBreakdown = document.getElementById('statPromoBreakdown');
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
  const { rawModal } = getRawModalEls();
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

  // ===== Daily Route refs =====
  const routeDetails = document.getElementById('routeDetails');
  const routeMeta = document.getElementById('routeMeta');
  const routeLinks = document.getElementById('routeLinks');
  const routeZipOnly = document.getElementById('routeZipOnly');

  // ===== Cancel refs =====
  const cancelDetails = document.getElementById('cancelDetails');
  const cancelMeta = document.getElementById('cancelMeta');
  const cancelTbody = document.getElementById('cancelTbody');
  const cancelBadge = document.getElementById('cancelBadge');
  const routeTbody = document.getElementById('routeTbody');

  // ===== Quest refs =====
  const questDetails = document.getElementById('questDetails');
  const questMeta = document.getElementById('questMeta');
  const questTbody = document.getElementById('questTbody');
  const questBadge = document.getElementById('questBadge');


  // ===== Ranking refs =====
  const rankTbody = document.getElementById('rankTbody');
  const rankNote = document.getElementById('rankNote');
  const zipDictBox = document.getElementById('zipDictBox');
  const zipDictLoadBtn = document.getElementById('zipDictLoadBtn');
  const zipDictLoader = document.getElementById('zipDictLoader');
  const zipDictStatus = document.getElementById('zipDictStatus');
  const zipDictHint = document.getElementById('zipDictHint');

  // ===== Data Quality refs =====
  const qPayments1 = document.getElementById('qPayments1');
  const qPayments2 = document.getElementById('qPayments2');
  const qTrips1 = document.getElementById('qTrips1');
  const qTrips2 = document.getElementById('qTrips2');
  const qJoin1 = document.getElementById('qJoin1');
  const qJoin2 = document.getElementById('qJoin2');
  const qZip1 = document.getElementById('qZip1');
  const qZip2 = document.getElementById('qZip2');
  const qUpdatedAt = document.getElementById('qUpdatedAt');

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
        const shownLines = [];
        if (r.pickupDisplay) shownLines.push(r.pickupDisplay);
        if (r.pickupAddrShort) shownLines.push(r.pickupAddrShort);

        let rawPickup = (r.rawPickup || '').toString();
        // fallback: re-read from trip map if available
        if (!rawPickup && r.rideId && state.tripsByRideId && state.tripsByRideId.has(r.rideId)) {
          const t = state.tripsByRideId.get(r.rideId);
          if (t && t.pickupAddr) rawPickup = String(t.pickupAddr);
        }

        const rawLines = [];
        if (r.rideId) rawLines.push(`rideId: ${r.rideId}`);
        if (rawPickup) {
          rawLines.push(rawPickup);
        } else {
          rawLines.push("（店舗住所なし）");
        }

        // payments lines (if we have txnIds)
        const txnIds = Array.isArray(r.txnIds) ? r.txnIds : [];
        if (txnIds.length) {
          rawLines.push('');
          rawLines.push('payments_order:');
          for (const id of txnIds) {
            const p = state.paymentsByTxnId.get(id);
            if (!p) continue;
            const tm = p.paymentTime ? p.paymentTime.toLocaleString('ja-JP') : '';
            const note = p.note ? p.note.replace(/\s+/g, ' ').trim() : '';
            const tipTxt = (p.tipAmount && p.tipAmount > 0) ? ` / tip ${Math.round(p.tipAmount)}円` : '';
            rawLines.push(`- txnId: ${p.txnId} / ${Math.round(p.amount)}円${tipTxt} / ${tm}${note ? ' / ' + note : ''}`);
          }
        }

        // trip snapshot
        if (r.rideId && state.tripsByRideId && state.tripsByRideId.has(r.rideId)) {
          const t = state.tripsByRideId.get(r.rideId);
          rawLines.push('');
          rawLines.push('trip_activity:');
          if (t.requestTime) rawLines.push(`- 依頼: ${t.requestTime.toLocaleString('ja-JP')}`);
          if (t.dropoffTime) rawLines.push(`- 降車: ${t.dropoffTime.toLocaleString('ja-JP')}`);
          if (t.status) rawLines.push(`- status: ${t.status}`);
          if (!state.hideDropoff && t.dropoffAddr) rawLines.push(`- 降車住所: ${t.dropoffAddr}`);
          if (state.hideDropoff) rawLines.push(`- 降車住所: （住所非表示）`);
        }

        openRawModal({
          title: '乗車場所（店舗）',
          shown: shownLines.join('\n'),
          raw: rawLines.join('\n')
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
    dataMinBD: null,
    dataMaxBD: null,
    virtualXBounds: null,
    fpStart: null,
    fpEnd: null,
    chartViewMin: null,
    chartViewMax: null,
    chartViewEnabled: false,
    ingestTotals: null,
    qualitySnapshot: null,
    zipDictStats: { status: 'idle', source: '', rows: 0, loadMs: 0, error: '' },
  };

  // ====== Helpers ======

  function makeEmptyIngestTotals() {
    return {
      files: 0,
      paymentFiles: 0,
      tripFiles: 0,
      unknownFiles: 0,
      unknownRows: 0,
      parseErrors: 0,
      paymentRowsRead: 0,
      tripRowsRead: 0,
      paymentAdded: 0,
      tripAdded: 0,
      paymentDuplicates: 0,
      tripDuplicates: 0,
      paymentNoTxnId: 0,
      paymentSoPayout: 0,
      paymentNegative: 0,
      tripNoRideId: 0,
    };
  }

  function ensureIngestTotals() {
    if (!state.ingestTotals) state.ingestTotals = makeEmptyIngestTotals();
    return state.ingestTotals;
  }

  function computeQualitySnapshot() {
    const ingest = ensureIngestTotals();

    const paymentsTotal = state.paymentsByTxnId.size;
    let paymentsWithRideId = 0;
    let paymentsWithoutRideId = 0;
    let promoNoTime = 0;

    const payAggByRide = new Map();

    for (const p of state.paymentsByTxnId.values()) {
      if (p.rideId) {
        paymentsWithRideId++;
        const prev = payAggByRide.get(p.rideId) || { lastPaymentTime: null };
        if (!prev.lastPaymentTime || (p.paymentTime && p.paymentTime > prev.lastPaymentTime)) prev.lastPaymentTime = p.paymentTime;
        payAggByRide.set(p.rideId, prev);
      } else {
        paymentsWithoutRideId++;
        if (!p.paymentTime) promoNoTime++;
      }
    }

    const tripsTotal = state.tripsByRideId.size;
    let tripsMissingRequest = 0;
    let tripsMissingDropoff = 0;

    let stCompleted = 0;
    let stFailed = 0;
    let stCancelled = 0;
    let stOther = 0;

    let pickupZipHas = 0;
    let dropoffZipHas = 0;
    let pickupZipInDict = 0;
    let dropoffZipInDict = 0;

    let tripsWithPayment = 0;
    let tripsWithoutPayment = 0;
    let tripEventNoTime = 0;

    for (const [rideId, t] of state.tripsByRideId.entries()) {
      if (!t.requestTime) tripsMissingRequest++;
      if (!t.dropoffTime) tripsMissingDropoff++;

      const st = (t.status || '').toLowerCase();
      if (!st || st === 'completed') stCompleted++;
      else if (st === 'failed') stFailed++;
      else if (st === 'rider_cancelled' || st === 'rider cancelled' || st === 'cancelled') stCancelled++;
      else stOther++;

      const pz = extractZipFromText(t.pickupAddr);
      const dz = extractZipFromText(t.dropoffAddr);
      if (pz) pickupZipHas++;
      if (dz) dropoffZipHas++;

      if (state.zipDictReady && state.zipDict) {
        const p7 = normalizeZip7(pz);
        const d7 = normalizeZip7(dz);
        if (p7 && state.zipDict.has(p7)) pickupZipInDict++;
        if (d7 && state.zipDict.has(d7)) dropoffZipInDict++;
      }

      const pay = payAggByRide.get(rideId);
      if (pay) tripsWithPayment++; else tripsWithoutPayment++;

      const eventTime = t.dropoffTime || (pay ? pay.lastPaymentTime : null);
      if (!eventTime) tripEventNoTime++;
    }

    let paymentsRideIdNoTrip = 0;
    for (const rideId of payAggByRide.keys()) {
      if (!state.tripsByRideId.has(rideId)) paymentsRideIdNoTrip++;
    }

    const zip = {
      ready: !!state.zipDictReady,
      size: state.zipDict ? state.zipDict.size : 0,
      stats: state.zipDictStats || { status: 'idle', source: '', rows: 0, loadMs: 0, error: '' },
      pickupZipHas,
      dropoffZipHas,
      pickupZipInDict,
      dropoffZipInDict,
    };

    state.qualitySnapshot = {
      updatedAt: new Date(),
      ingest,
      derived: {
        paymentsTotal,
        paymentsWithRideId,
        paymentsWithoutRideId,
        promoNoTime,
        tripsTotal,
        tripsMissingRequest,
        tripsMissingDropoff,
        stCompleted,
        stFailed,
        stCancelled,
        stOther,
        tripsWithPayment,
        tripsWithoutPayment,
        paymentsRideIdNoTrip,
        tripEventNoTime,
      },
      zip,
    };

    return state.qualitySnapshot;
  }

  function renderQualitySnapshot() {
    if (!qPayments1 || !qTrips1 || !qJoin1 || !qZip1 || !qUpdatedAt) return;

    const snap = state.qualitySnapshot || computeQualitySnapshot();
    const ingest = snap.ingest || makeEmptyIngestTotals();
    const d = snap.derived;

    const nf = (n) => (Number.isFinite(n) ? Math.trunc(n).toLocaleString() : '0');

    qPayments1.textContent = `CSV行 ${nf(ingest.paymentRowsRead)} → ユニーク ${nf(d.paymentsTotal)}（重複 ${nf(ingest.paymentDuplicates)}）`;
    qPayments2.textContent = `除外: so.payout ${nf(ingest.paymentSoPayout)} / マイナス ${nf(ingest.paymentNegative)} / 取引IDなし ${nf(ingest.paymentNoTxnId)}  | rideIdあり ${nf(d.paymentsWithRideId)} / 空欄 ${nf(d.paymentsWithoutRideId)}`;

    qTrips1.textContent = `CSV行 ${nf(ingest.tripRowsRead)} → ユニーク ${nf(d.tripsTotal)}（重複 ${nf(ingest.tripDuplicates)} / rideIdなし ${nf(ingest.tripNoRideId)}）`;
    qTrips2.textContent = `時刻欠損: 依頼なし ${nf(d.tripsMissingRequest)} / 降車なし ${nf(d.tripsMissingDropoff)}  | ステータス: completed ${nf(d.stCompleted)} / failed ${nf(d.stFailed)} / cancelled ${nf(d.stCancelled)} / other ${nf(d.stOther)}`;

    qJoin1.textContent = `trip→支払い: あり ${nf(d.tripsWithPayment)} / なし ${nf(d.tripsWithoutPayment)}  | 支払い(rideIdあり)→tripなし ${nf(d.paymentsRideIdNoTrip)}`;
    qJoin2.textContent = `イベント時刻欠損で非表示: trip ${nf(d.tripEventNoTime)} / promo ${nf(d.promoNoTime)}`;

    const z = snap.zip;
    const zs = z.stats || { status: 'idle', source: '', rows: 0, loadMs: 0, error: '' };

    let zipState = '未読み込み';
    if (z.ready) {
      const extra = [];
      if (zs.source) extra.push(zs.source);
      if (zs.loadMs) extra.push(`${nf(zs.loadMs)}ms`);
      zipState = `読み込み済み（${nf(z.size)}件${extra.length ? ' / ' + extra.join(' / ') : ''}）`;
    } else if (zs.status === 'loading') {
      zipState = '読み込み中...';
    } else if (zs.status === 'error') {
      zipState = `読込失敗${zs.error ? '（' + zs.error + '）' : ''}`;
    }

    qZip1.textContent = `状態: ${zipState}`;

    if (z.ready) {
      qZip2.textContent = `住所に郵便番号あり: 店舗 ${nf(z.pickupZipHas)}/${nf(d.tripsTotal)}（辞書一致 ${nf(z.pickupZipInDict)}） / 降車 ${nf(z.dropoffZipHas)}/${nf(d.tripsTotal)}（辞書一致 ${nf(z.dropoffZipInDict)}）`;
    } else {
      qZip2.textContent = `住所に郵便番号あり: 店舗 ${nf(z.pickupZipHas)}/${nf(d.tripsTotal)} / 降車 ${nf(z.dropoffZipHas)}/${nf(d.tripsTotal)}`;
    }

    const up = snap.updatedAt ? snap.updatedAt.toLocaleString() : '';
    qUpdatedAt.textContent = `ファイル ${nf(ingest.files)}（不明 ${nf(ingest.unknownFiles)} / 不明行 ${nf(ingest.unknownRows)} / parseErr ${nf(ingest.parseErrors)}）  更新: ${up}`;

    // keep compact status line too
    if (zipDictStatus) zipDictStatus.textContent = zipState;
  }


  
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

  const hhMm = (d) => {
    if (!d) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const ymdHm = (d) => {
    if (!d) return '';
    return `${yyyyMmDd(d)} ${hhMm(d)}`;
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

  const normalizePaymentRow = (row, headers, ingest) => {
    const txnCol = findCol(headers, ['取引ID', 'transaction id', 'Transaction ID']);
    const rideCol = findCol(headers, ['乗車ID', '乗車の UUID', 'ride id', 'Trip UUID']);
    const amtCol  = findCol(headers, ['支払い額']);
    const timeCol = findCol(headers, ['決済時間', 'payment time', '支払い時間']);
    const noteCol = findCol(headers, ['備考', 'note', 'remarks']);
    const tipCol = findCol(headers, ['売り上げ:チップ', '売り上げ : チップ', '支払い額:売り上げ:チップ', '支払い額 : 売り上げ : チップ']);
    const questCol = findCol(headers, ['プロモーション:クエスト', 'プロモーション : クエスト', '支払い額:売り上げ:プロモーション:クエスト', '支払い額 : 売り上げ : プロモーション : クエスト']);
    // Promotion total (not quest). Some CSVs include both promo total and quest.
    const promoColExact = findCol(headers, ['支払い額 : 売り上げ : プロモーション', '支払い額:売り上げ:プロモーション']);
    let promoCol = promoColExact;
    if (!promoCol) {
      promoCol = (headers || []).find(h => /プロモーション/.test(h) && !/クエスト/.test(h) && /売り上げ/.test(h)) || null;
    }

    const txnId = txnCol ? String(row[txnCol] ?? '').trim() : '';
    if (!txnId) { if (ingest) ingest.paymentNoTxnId++; return null; }

    const rideIdRaw = rideCol ? String(row[rideCol] ?? '').trim() : '';
    const note = noteCol ? String(row[noteCol] ?? '').trim() : '';

    // so.payout は報酬支払（振込）として売上から除外
    const hay = `${txnId} ${rideIdRaw} ${note}`.toLowerCase();
    if (hay.includes('so.payout')) { if (ingest) ingest.paymentSoPayout++; return null; }

    let amount = amtCol ? toNumber(row[amtCol]) : 0;
    let tipAmount = tipCol ? toNumber(row[tipCol]) : 0;
    if (!Number.isFinite(tipAmount) || tipAmount < 0) tipAmount = 0;
    let questAmount = questCol ? toNumber(row[questCol]) : 0;
    if (!Number.isFinite(questAmount) || questAmount < 0) questAmount = 0;
    let promoAmount = promoCol ? toNumber(row[promoCol]) : 0;
    if (!Number.isFinite(promoAmount) || promoAmount < 0) promoAmount = 0;
    // 安全弁: マイナス金額は原則除外（返金/調整等で集計が崩れるのを防ぐ）
    if (amount < 0) { if (ingest) ingest.paymentNegative++; return null; }
    if (state.round10) amount = Math.round(amount / 100) * 100;
    const paymentTime = timeCol ? parseDateTime(row[timeCol]) : null;

    return {
      txnId,
      rideId: rideIdRaw || null,
      amount,
      tipAmount,
      questAmount,
      promoAmount,
      paymentTime,
      note,
    };
  };

  const normalizeTripRow = (row, headers, ingest) => {
    const rideCol = findCol(headers, ['乗車の UUID', '乗車ID', 'Trip UUID', 'ride id']);
    const requestCol = findCol(headers, ['乗車のリクエスト時間', '依頼時間', 'request']);
    const dropoffCol = findCol(headers, ['乗車の降車時間', '降車時間', 'dropoff']);
    const pickupCol = findCol(headers, ['乗車場所の住所', 'pickup']);
    const dropoffAddrCol = findCol(headers, ['降車場所の住所', 'dropoff address']);
    const statusCol = findCol(headers, ['乗車ステータス', 'status']);

    const rideId = rideCol ? String(row[rideCol] ?? '').trim() : '';
    if (!rideId) { if (ingest) ingest.tripNoRideId++; return null; }

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

    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    state.zipDictStats = { status: 'loading', source: 'assets', rows: 0, loadMs: 0, error: '' };
    if (zipDictStatus) zipDictStatus.textContent = '読み込み中...';

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
            const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            state.zipDictStats = { status: 'ready', source: 'assets', rows: (res.data || []).length, loadMs: Math.round(t1 - t0), error: '' };
            if (zipDictStatus) zipDictStatus.textContent = `読み込み済み（${map.size.toLocaleString()}件）`;
            resolve(map);
          } catch (e) {
            state.zipDictStats = { status: 'error', source: 'assets', rows: 0, loadMs: 0, error: String(e && e.message ? e.message : e) };
            if (zipDictStatus) zipDictStatus.textContent = '読込失敗';
            reject(e);
          } finally {
            computeQualitySnapshot();
            renderQualitySnapshot();
          }
        },
        error: (err) => {
          state.zipDictStats = { status: 'error', source: 'assets', rows: 0, loadMs: 0, error: String(err && err.message ? err.message : err) };
          if (zipDictStatus) zipDictStatus.textContent = '読込失敗';
          computeQualitySnapshot();
          renderQualitySnapshot();
          reject(err);
        },
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

const stripStoreNameFromPickupAddr = (addr) => {
  if (!addr) return '';
  const s = String(addr).trim();
  if (!s) return '';
  const parts = s.split(/,|，/).map(x=>x.trim()).filter(Boolean);
  if (parts.length <= 1) return s;
  const head = parts[0] || '';
  if (head && !head.startsWith('日本') && !head.startsWith('〒') && !head.match(/^\d{3}-?\d{4}/)) {
    return parts.slice(1).join(', ');
  }
  return s;
};


const formatDropoffDisplay = (addr) => {
    const src = (addr || '').toString().trim();
    if (!src) return '';
    const zRaw = extractZipFromText(src);
    const z = normalizeZip7(zRaw);
    if (z && state.zipDictReady) {
      const s = kanjiShortFromZip(z);
      if (s) return s;
    }
    return shortenAddress(src) || src;
  };

const shortPickupAddr = (addr) => {
  const src = stripStoreNameFromPickupAddr(addr);
  const z = extractZipFromText(src);
  if (z && state.zipDictReady) {
    const k = kanjiShortFromZip(z);
    if (k) return k;
  }
  return shortenAddress(src);
};

  const readFiles = async (files) => {
    const list = [...files];
    if (!list.length) return;

    const ingest = ensureIngestTotals();
    ingest.files += list.length;

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
          ingest.paymentFiles++;
          ingest.paymentRowsRead += rows.length;
          for (const r of rows) {
            const n = normalizePaymentRow(r, headers, ingest);
            if (!n) { ignored++; continue; }
            if (state.paymentsByTxnId.has(n.txnId)) { ingest.paymentDuplicates++; ignored++; continue; }
            state.paymentsByTxnId.set(n.txnId, n);
            ingest.paymentAdded++;
            addedPayments++;
          }
        } else if (type === 'trip') {
          ingest.tripFiles++;
          ingest.tripRowsRead += rows.length;
          for (const r of rows) {
            const n = normalizeTripRow(r, headers, ingest);
            if (!n) { ignored++; continue; }
            if (state.tripsByRideId.has(n.rideId)) { ingest.tripDuplicates++; ignored++; continue; }
            state.tripsByRideId.set(n.rideId, n);
            ingest.tripAdded++;
            addedTrips++;
          }
        } else {
          ingest.unknownFiles++;
          ingest.unknownRows += rows.length;
          ignored += rows.length;
        }
      } catch (e) {
        console.error(e);
        ingest.parseErrors++;
        ignored++;
      }
    }

    loadStatus.textContent =
      `読み込み完了：payments_order +${addedPayments.toLocaleString()}件 / trip_activity +${addedTrips.toLocaleString()}件（重複・不明・除外 ${ignored.toLocaleString()}件）` +
      `  |  合計：payments ${state.paymentsByTxnId.size.toLocaleString()}件 / trips ${state.tripsByRideId.size.toLocaleString()}件`;

    rebuildActiveBizDates();
    computeQualitySnapshot();
    renderQualitySnapshot();
    refreshAll();

    // zip dict warmup: load in background and re-render once ready
    if (!state.zipDictReady) {
      ensureZipDict().then(() => {
        computeQualitySnapshot();
        renderQualitySnapshot();
        if (state.events && state.events.length) refreshAll();
      }).catch(() => {
        if (zipDictStatus && !state.zipDictReady) zipDictStatus.textContent = '未読み込み';
        if (state.zipDictStats) state.zipDictStats.status = 'error';
        computeQualitySnapshot();
        renderQualitySnapshot();
      });
    }
  };

  // ====== Build events ======
  const buildEvents = () => {
    const paymentsByRide = new Map();
    const promoPayments = [];

    for (const p of state.paymentsByTxnId.values()) {
      if (p.rideId) {
        const prev = paymentsByRide.get(p.rideId) || { amount: 0, tipAmount: 0, questAmount: 0, txnIds: [], lastPaymentTime: null, notes: [] };
        prev.amount += p.amount;
        prev.tipAmount += (p.tipAmount || 0);
        prev.questAmount += (p.questAmount || 0);
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
        dropoffTime: t.dropoffTime || null,
        requestTime: t.requestTime || null,
        deliveryMinutes: (t.requestTime && t.dropoffTime) ? Math.max(0, Math.round((t.dropoffTime.getTime() - t.requestTime.getTime())/60000)) : null,
        businessDate: businessDateStr(eventTime),
        amount,
        tipAmount: pay ? (pay.tipAmount || 0) : 0,
        questAmount: pay ? (pay.questAmount || 0) : 0,
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
        dropoffTime: null,
        requestTime: null,
        deliveryMinutes: null,
        businessDate: businessDateStr(eventTime),
        amount: pay.amount,
        tipAmount: pay.tipAmount || 0,
        questAmount: pay.questAmount || 0,
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
        dropoffTime: null,
        requestTime: null,
        deliveryMinutes: null,
        businessDate: businessDateStr(eventTime),
        amount: p.amount,
        tipAmount: 0,
        questAmount: (p.questAmount || 0),
        promoAmount: (p.promoAmount || 0),
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

  const getMinBusinessDate = (events) => {
    if (!events.length) return null;
    let minBD = events[0].businessDate;
    for (const e of events) if (e.businessDate < minBD) minBD = e.businessDate;
    return minBD;
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


  const formatWageLine = (amount, minutes) => {
    const a = Number(amount);
    const m = Number(minutes);
    if (!Number.isFinite(a) || !Number.isFinite(m) || m <= 0) return '';
    const wage = a * 60 / m;
    if (!Number.isFinite(wage)) return '';
    return `時給換算: ${fmtYen(wage)}/時`;
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
    } else if (label.includes('プロモその他（累積）')) {
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
    } else if (label === 'プロモその他') {
      ds.borderColor = PINK;
      ds.backgroundColor = PINK_LINE_A;
      ds.order = 1;
    } else if (label === '総売上') {
      ds.borderColor = ORANGE;
      ds.backgroundColor = 'rgba(255, 159, 64, 0.20)';
    } else if (label === '配達（ガント）') {
      // Keep scriptable colors (functions) if already set
      if (typeof ds.backgroundColor !== 'function') ds.backgroundColor = 'rgba(75, 192, 192, 0.35)';
      if (typeof ds.borderColor !== 'function') ds.borderColor = 'rgb(75, 192, 192)';
      ds.order = 3;
    } else if (label === '配達（ポイント）') {
      ds.borderColor = BLUE;
      ds.backgroundColor = BLUE_LINE_A;
      ds.order = 1;
    }
  }
};


  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

  const getMinSpanX = (chart) => {
    const xType = chart && chart.options && chart.options.scales && chart.options.scales.x ? chart.options.scales.x.type : 'time';
    // omit-idle compression uses virtual hours (0..N)
    if (xType === 'linear' && state.virtualXBounds) return 0.05; // 0.05h (=3min)
    return 60 * 1000; // 1 min
  };

    const getRangeBoundsMs = () => {
    // NOTE:
    // - time scale: ms (timestamp)
    // - omit-idle compressed scale (linear): virtual hours (0..N)
    if (state.chart && state.chart.options && state.chart.options.scales && state.chart.options.scales.x) {
      const xType = state.chart.options.scales.x.type;
      if (xType === 'linear') {
        // In linear mode we only support omit-idle compression bounds.
        if (state.virtualXBounds && Number.isFinite(state.virtualXBounds.minX) && Number.isFinite(state.virtualXBounds.maxX)) {
          const minMs = Number(state.virtualXBounds.minX);
          const maxMs = Number(state.virtualXBounds.maxX);
          if (maxMs > minMs) return { minMs, maxMs };
        }
        return null;
      }
    }

    const key = state.lastRange || 'week';
    const dataMinBD = state.dataMinBD || null;
    const dataMaxBD = state.dataMaxBD || null;

    const clampStartBD = (bd) => {
      if (!bd) return bd;
      if (key === 'week') return clampWeekStartMondayStr(bd);
      if (key === 'month') return clampMonthStartStr(bd);
      return bd;
    };

    if (key === 'all') {
      if (!dataMinBD || !dataMaxBD) return null;
      const b0 = getBusinessDayRealBounds(dataMinBD);
      const b1 = getBusinessDayRealBounds(dataMaxBD);
      if (!b0 || !b1) return null;
      return { minMs: b0.start.getTime(), maxMs: b1.end.getTime() };
    }

    const startBD0 = clampStartBD(state.periodStartBD || dataMaxBD || dataMinBD);
    if (!startBD0) return null;

    if (key === 'custom') {
      const endBD0 = state.periodEndBD || startBD0;
      const b0 = getBusinessDayRealBounds(startBD0);
      const b1 = getBusinessDayRealBounds(endBD0);
      if (!b0 || !b1) return null;
      let minMs = b0.start.getTime();
      let maxMs = b1.end.getTime();
      if (maxMs < minMs) { const t = minMs; minMs = maxMs; maxMs = t; }
      return { minMs, maxMs };
    }

    if (key === 'day') {
      const b = getBusinessDayRealBounds(startBD0);
      if (!b) return null;
      return { minMs: b.start.getTime(), maxMs: b.end.getTime() };
    }

    const d0 = dateFromBusinessStr(startBD0);
    if (!d0) return null;
    const start = new Date(d0);
    start.setHours(4,0,0,0);

    let end = null;
    if (key === 'week') {
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else if (key === 'month') {
      end = addMonths(start, 1);
    } else {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    const minMs = start.getTime();
    const maxMs = end.getTime();
    if (!(maxMs > minMs)) return null;
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

    const minSpan = getMinSpanX(chart);
    const span = Math.max(minSpan, state.chartViewMax - state.chartViewMin);
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
    if (state.chartViewEnabled && state.chartViewMin != null && state.chartViewMax != null) return;
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
          { label:'配達報酬（累積）', type: (desired === 'dayGantt') ? 'bar' : 'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'yCum', stack:'sales' },
          { label:'プロモその他（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'yCum', stack:'sales' },
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
          { label:'プロモその他（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
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
      
      } else if (desired === 'dayGantt') {
        // Daily Gantt: request -> dropoff time bars (horizontal)
        data = { labels: [], datasets: [
          {
            label: '配達（ガント）',
            indexAxis: 'y',
            type: 'bar',
            data: [],
            // Floating bar: x is [start,end] and y is a category label.
            // Use explicit parsing keys (some environments fail to render when parsing is disabled).
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
            borderSkipped: false,
            borderRadius: 3,
            barPercentage: 0.95,
            categoryPercentage: 0.9,
            backgroundColor: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              if (raw && raw.isMax) return 'rgba(255, 159, 64, 0.35)'; // highlight
              if (meta.tipAmount && meta.tipAmount > 0) return 'rgba(54, 162, 235, 0.22)'; // tip
              return 'rgba(75, 192, 192, 0.35)';
            },
            borderColor: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              if (raw && raw.isMax) return 'rgb(255, 159, 64)';
              if (meta.tipAmount && meta.tipAmount > 0) return 'rgb(54, 162, 235)';
              return 'rgb(75, 192, 192)';
            },
            borderWidth: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              if (raw && raw.isMax) return 3;
              if (meta.tipAmount && meta.tipAmount > 0) return 2;
              return 1;
            },
            borderDash: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? [4,2] : [];
            },
          }
        ]};
        scales = {
          x: timeX,
          y: {
            type: 'category',
            ticks: {
              color: tc.muted,
              callback: () => '',
            },
            grid,
          },
        };
      } else if (desired === 'cumulative') {
        data = { datasets: [
          { label:'配達報酬（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'プロモその他（累積）', type:'line', data: [], stepped:true, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y', stack:'sales' },
          { label:'配達（ポイント）', type:'scatter', data: [], yAxisID:'y',
            pointRadius: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 5 : 3;
            },
            pointHoverRadius: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 8 : 6;
            },
            pointStyle: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 'triangle' : 'circle';
            },
            pointBorderWidth: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 2 : 1;
            },
            pointBorderColor: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 'rgb(255, 159, 64)' : 'rgb(54, 162, 235)';
            },
            pointBackgroundColor: (ctx) => {
              const raw = ctx.raw || {};
              const meta = raw.meta || {};
              return (meta.tipAmount && meta.tipAmount > 0) ? 'rgba(255, 159, 64, 0.35)' : 'rgba(54, 162, 235, 0.18)';
            },
            showLine:false },
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
          indexAxis: (desired === 'dayGantt') ? 'y' : 'x',
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
    const vDay = (state.lastRange === 'day') ? (state.dayView || 'combined') : null;
    const isGantt = (state.lastRange === 'day' && vDay === 'gantt');
    const xMode = isGantt ? 'time' : (omitIdle ? 'linear' : 'time');

    let chartMode = 'cumulative';
    if (state.lastRange === 'day' && (!omitIdle || isGantt)) {
      const v = vDay || 'combined';
      chartMode =
        (v === 'step') ? 'dayStep' :
        (v === 'hourly') ? 'dayHourly' :
        (v === 'gantt') ? 'dayGantt' :
        'dayCombined';
    }

    const chart = ensureChartForMode(chartMode, xMode);

    // zoom/pan is button-based

    const setInteractionForMode = (modeKey) => {
      // Bars: require intersect to avoid showing tooltips for distant bars.
      if (modeKey === 'dayHourly' || modeKey === 'dayCombined') {
        chart.options.interaction = { mode: 'x', intersect: true };
        chart.options.hover = { mode: 'x', intersect: true };
        chart.options.plugins.tooltip.position = 'nearest';
      } else if (modeKey === 'dayGantt') {
        // Horizontal floating bars: nearest works more reliably than mode 'x'
        chart.options.interaction = { mode: 'nearest', intersect: true };
        chart.options.hover = { mode: 'nearest', intersect: true };
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
    if (chartMode === 'dayCombined' || chartMode === 'dayStep' || chartMode === 'dayHourly' || chartMode === 'dayGantt') {
      const bd = state.periodStartBD;
      const bounds = bd ? getBusinessDayRealBounds(bd) : null;
      const start = bounds ? bounds.start : null;
      const end = bounds ? bounds.end : null;

      
    // --- Gantt mode (daily): request -> dropoff time bars ---
    if (chartMode === 'dayGantt') {
      // 1) collect eligible deliveries for the selected business day
      const itemsAll = [];
      for (const e of events) {
        if (e.kind !== 'base') continue;
        if (!e.rideId) continue;
        if (!e.requestTime) continue;
        if (e.deliveryMinutes == null) continue; // requires request+dropoff
        itemsAll.push(e);
      }
      if (!itemsAll.length) {
        chart.data.labels = ['1'];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
      }

      // Determine business-day bounds (4:00-4:00)
      const bd0 = state.periodStartBD || itemsAll[0].businessDate || null;
      const b2 = bd0 ? getBusinessDayRealBounds(bd0) : null;
      const start2 = b2 ? b2.start : null;
      const end2 = b2 ? b2.end : null;

      const items = [];
      for (const e of itemsAll) {
        if (start2 && e.time < start2) continue;
        if (end2 && e.time >= end2) continue;
        items.push(e);
      }
      if (!items.length) {
        chart.data.labels = ['1'];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
      }

      items.sort((a,b) => a.requestTime - b.requestTime);

      // 2) Lane assignment (readable order)
      // - 基本: 依頼時間順に「4件=1レーン」(上→下、左→右で追いやすい)
      // - ただし同一レーン内で重なりが出る場合は下のレーンへ逃がす
      // - 最後に「各レーンの最初の依頼時刻」でレーン順を整える（上ほど早い依頼）
      const laneEnds = [];        // lane -> last end(ms)
      const laneFirstStart = [];  // lane -> first start(ms)
      const laneCounts = [];      // lane -> count
      const pointsTmp = [];
      const maxKey = maxDelivery ? `${maxDelivery.rideId}|${maxDelivery.time.getTime()}|${maxDelivery.amount}` : null;

      for (let i = 0; i < items.length; i++) {
        const e = items[i];
        const s = e.requestTime.getTime();
        let t = e.time.getTime(); // dropoffTime when deliveryMinutes != null
        // Ensure minimum visible width (and avoid zero/negative intervals due to data quirks)
        if (!(t > s)) t = s + 60 * 1000;

        const preferred = Math.floor(i / 4);

        // Ensure lanes exist up to preferred
        while (laneEnds.length <= preferred) {
          laneEnds.push(0);
          laneFirstStart.push(null);
          laneCounts.push(0);
        }

        // Find first lane >= preferred that does not overlap
        let lane = preferred;
        while (lane < laneEnds.length && laneEnds[lane] > s) lane += 1;
        if (lane === laneEnds.length) {
          laneEnds.push(0);
          laneFirstStart.push(null);
          laneCounts.push(0);
        }
        // Extra safety (should be redundant)
        while (laneEnds[lane] > s) {
          lane += 1;
          if (lane === laneEnds.length) {
            laneEnds.push(0);
            laneFirstStart.push(null);
            laneCounts.push(0);
          }
        }

        laneEnds[lane] = t;
        if (laneFirstStart[lane] === null) laneFirstStart[lane] = s;
        laneCounts[lane] = (laneCounts[lane] || 0) + 1;

        const key = `${e.rideId}|${e.time.getTime()}|${e.amount}`;
        pointsTmp.push({
          x: [s, t],
          y: String(lane + 1), // temporary (remapped later)
          laneOld: lane,
          t,
          meta: {
            pickupName: e.pickupName || '',
            pickupAddr: e.pickupAddr || '',
            dropoffAddr: e.dropoffAddr || '',
            deliveryMinutes: e.deliveryMinutes,
            amount: e.amount,
            tipAmount: e.tipAmount || 0,
          },
          isMax: !!(maxKey && key === maxKey),
        });
      }

      // Remap lanes by earliest request time (stable)
      const laneCount = laneEnds.length;
      const ordered = Array.from({ length: laneCount }, (_, idx) => ({
        idx,
        first: (laneFirstStart[idx] === null) ? Number.POSITIVE_INFINITY : laneFirstStart[idx],
      })).sort((a, b) => (a.first - b.first) || (a.idx - b.idx));

      const laneMap = new Map();
      ordered.forEach((o, newIdx) => laneMap.set(o.idx, newIdx));

      const points = pointsTmp.map(p => ({
        ...p,
        y: String(((laneMap.get(p.laneOld) ?? p.laneOld) + 1)),
      }));


      // Labels for lanes (hidden, but required by category scale)
      chart.data.labels = Array.from({length: Math.max(1, laneEnds.length)}, (_,i) => String(i+1));
      chart.data.datasets[0].data = points;

      // Fix x-range to business day bounds if available
      if (start2) chart.options.scales.x.min = start2.getTime();
      if (end2) chart.options.scales.x.max = end2.getTime();

      // Tooltip like '配達（ポイント）'
      chart.options.plugins.tooltip.callbacks = {
        title: (items) => {
          if (!items || !items.length) return '';
          const raw = items[0].raw || {};
          const s = raw && raw.x ? raw.x[0] : null;
          const t = raw && raw.x ? raw.x[1] : null;
          if (s && t) {
            return `${new Date(s).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} → ${new Date(t).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`;
          }
          return '';
        },
        label: (ctx) => {
          const raw = ctx.raw || {};
          const meta = raw.meta || {};
          const lines = [];
          if (meta.pickupName) lines.push(`店舗: ${meta.pickupName}`);
          if (meta.pickupAddr) {
            const s = shortPickupAddr(meta.pickupAddr);
            if (s) lines.push(`店舗住所: ${s}`);
          }
          if (!state.hideDropoff) {
            const dropShort = formatDropoffDisplay(meta.dropoffAddr);
            if (dropShort) lines.push(`降車: ${dropShort}`);
          }
          const dur = formatDuration(meta.deliveryMinutes);
          if (dur) lines.push(`配達時間: ${dur}`);
          lines.push(`報酬: ${fmtYen(meta.amount)}`);
          if (meta.tipAmount && meta.tipAmount > 0) lines.push(`チップ: ${fmtYen(meta.tipAmount)}`);
          const wageLine = formatWageLine(meta.amount, meta.deliveryMinutes);
          if (wageLine) lines.push(wageLine);
          return lines;
        },
      };

      chart.update();
      return;
    }

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
            if (ctx.datasetIndex === 1) return `プロモその他（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 2) return `時間別報酬: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 3) return `時間別件数: ${ctx.parsed.y}件`;
            if (ctx.datasetIndex === 4) return `平均時給: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 5) return `平均 配達/時: ${ctx.parsed.y.toFixed(2)}件`;
            if (ctx.datasetIndex === 6) return `最高報酬の配達`;
          } else if (chartMode === 'dayStep') {
            if (ctx.datasetIndex === 0) return `配達報酬（累積）: ${fmtYen(ctx.parsed.y)}`;
            if (ctx.datasetIndex === 1) return `プロモその他（累積）: ${fmtYen(ctx.parsed.y)}`;
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
          if (meta.pickupAddr) {
            const s = shortPickupAddr(meta.pickupAddr);
            if (s) lines.push(`店舗住所: ${s}`);
          }
          if (!state.hideDropoff) {
            const dropShort = formatDropoffDisplay(meta.dropoffAddr);
            if (dropShort) lines.push(`降車: ${dropShort}`);
          }
          const dur = formatDuration(meta.deliveryMinutes);
          if (dur) lines.push(`配達時間: ${dur}`);
          lines.push(`報酬: ${fmtYen(meta.amount)}`);
          if (meta.tipAmount && meta.tipAmount > 0) lines.push(`チップ: ${fmtYen(meta.tipAmount)}`);
          const wageLine = formatWageLine(meta.amount, meta.deliveryMinutes);
          if (wageLine) lines.push(wageLine);
          return lines;
        }
      };

      applyChartViewport(chart);
    chart.update();
      return;
    }

    // cumulative (existing behavior, with optional omit-idle compression)
    const keptInfo = omitIdle ? computeKeptHours(events) : null;
    // bounds for omit-idle compression (virtual hours)
    if (omitIdle && keptInfo && keptInfo.sortedHours) {
      state.virtualXBounds = { minX: 0, maxX: Math.max(1, keptInfo.sortedHours.length) };
    } else {
      state.virtualXBounds = null;
    }
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
        if (ctx.datasetIndex === 1) return `プロモその他（累積）: ${fmtYen(ctx.parsed.y)}`;
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
        if (meta.pickupAddr) {
          const s = shortPickupAddr(meta.pickupAddr);
          if (s) lines.push(`店舗住所: ${s}`);
        }
        if (!state.hideDropoff) {
        const dropShort = formatDropoffDisplay(meta.dropoffAddr);
        if (dropShort) lines.push(`降車: ${dropShort}`);
      }
        const dur = formatDuration(meta.deliveryMinutes);
        if (dur) lines.push(`配達時間: ${dur}`);
        lines.push(`報酬: ${fmtYen(meta.amount)}`);
          if (meta.tipAmount && meta.tipAmount > 0) lines.push(`チップ: ${fmtYen(meta.tipAmount)}`);
          const wageLine = formatWageLine(meta.amount, meta.deliveryMinutes);
          if (wageLine) lines.push(wageLine);
        return lines;
      }
    };

    applyChartViewport(chart);
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

    // Breakdown for "プロモその他" sublabel
    let tipTotal = 0;
    let questTotal = 0;
    const seenRide = new Set();

    const questAmountFrom = (e) => {
      if (!e) return 0;
      const qAmt = Number(e.questAmount || 0);
      if (Number.isFinite(qAmt) && qAmt > 0) return qAmt;
      const note = (e.note || '').toString();
      if (note && /クエスト|quest/i.test(note)) return Number(e.amount || 0);
      return 0;
    };

    for (const e of events) {
      if (e.kind === 'base') {
        base += e.amount;
        if (e.rideId) trips += 1;
        baseEvents.push(e);

        if (e.rideId && !seenRide.has(e.rideId)) {
          seenRide.add(e.rideId);
          if ((e.tipAmount || 0) > 0) tipTotal += (e.tipAmount || 0);
        }
      } else if (e.kind === 'promo') {
        promo += e.amount;
        questTotal += questAmountFrom(e);
      }
    }

    questTotal = Math.min(promo, questTotal);
    const promoOther = Math.max(0, promo - questTotal);

    // NOTE: base already includes tip amounts (rideId-linked payments). We split it in summary.
    // Keep total consistent with existing logic.
    const totalAll = base + promo;
    const baseNoTip = (Number.isFinite(base) ? base : 0) - (Number.isFinite(tipTotal) ? tipTotal : 0);
    const baseFare = baseNoTip < 0 ? base : baseNoTip;

    const activeInfo = computeActiveHours(baseEvents);
    const activeMinutes = activeInfo.activeMinutes || 0;

    statBase.textContent = fmtYen(baseFare);
    if (statTip) statTip.textContent = fmtYen(tipTotal);
    statPromo.textContent = fmtYen(promo);
    if (statPromoBreakdown) {
      if (events && events.length) {
        statPromoBreakdown.innerHTML =
          `内訳: クエスト ${fmtYen(questTotal)} / その他 ${fmtYen(promoOther)}`;
      } else {
        statPromoBreakdown.textContent = '-';
      }
    }

    statTotal.textContent = fmtYen(totalAll);
    statTrips.textContent = trips.toLocaleString();
    statActiveHours.textContent = activeMinutes ? formatHM(activeMinutes) : '-';

    if (activeMinutes > 0) {
      const hours = activeMinutes / 60;
      const hourlyNoPromo = baseFare / hours;
      const hourlyAll = totalAll / hours;
      setText(statHourly, fmtYen(hourlyNoPromo));
      setText(statHourlyWithPromo, `チップ+プロモ込 ${fmtYen(hourlyAll)}`);
      const tph = trips / hours;
      setText(statTripsPerHour, tph.toFixed(2));

      if (trips > 0) {
        const unitNoPromo = baseFare / trips;
        const unitAll = totalAll / trips;
        setText(statUnit, fmtYen(unitNoPromo));
        setText(statUnitWithPromo, `チップ+プロモ込 ${fmtYen(unitAll)}`);
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
        tipAmount: e.tipAmount || 0,
        questAmount: e.questAmount || 0,
        pickupDisplay: e.pickupName || storeNameFromAddress(e.pickupAddr || ''),
        rideId: e.rideId,
        txnIds: e.txnIds || [],
        payNote: e.note || '',
        rawPickup: (e.pickupAddr || ''),
        pickupZip: extractZipFromText(e.pickupAddr || ''),
        pickupAddrShort: (() => {
          const z = (extractZipFromText(e.pickupAddr || '') || '').toString().trim();
          if (z && state.zipDictReady) {
            const s = kanjiShortFromZip(z);
            if (s) return s;
          }
          return shortPickupAddr(e.pickupAddr || '');
        })(),
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
      const amtMain = Math.round(r.amount).toLocaleString('ja-JP') + '円';
      if (r.tipAmount && r.tipAmount > 0) {
        const tipLine = Math.round(r.tipAmount).toLocaleString('ja-JP') + '円';
        tdAmt.innerHTML = `<div>${amtMain}</div><div class="small muted">チップ ${tipLine}</div>`;
      } else {
        tdAmt.textContent = amtMain;
      }
      tr.appendChild(tdAmt);

      const tdWage = document.createElement('td');
      tdWage.className = 'num';
      tdWage.textContent = (r.hourlyWage !== null && r.hourlyWage !== undefined)
        ? (Math.round(r.hourlyWage).toLocaleString('ja-JP') + '円/時')
        : '';
      tr.appendChild(tdWage);

      const tdPickup = document.createElement('td');
      tdPickup.textContent = r.pickupDisplay || '';
      const pickupTitleAddr = (r.pickupAddrShort || shortPickupAddr(r.rawPickup || '') || '').toString().trim();
      if (pickupTitleAddr) tdPickup.title = `店舗住所: ${pickupTitleAddr}`;
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

      const tdMap = document.createElement('td');
      if (!state.hideDropoff) {
        const origin = (r.pickupAddrShort || shortPickupAddr(r.rawPickup || '') || r.pickupDisplay || '').toString().trim();
        const dest = (r.dropoffZip ? (`〒${r.dropoffZip}`) : (r.dropoffDisplay || '')).toString().trim();
        if (origin && dest) {
          const a = document.createElement('a');
          a.href = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'mapLink';
          a.textContent = 'Map';
          a.title = `Google Mapsで概算ルートを表示\n店舗: ${origin}\n降車: ${dest}`;
          tdMap.appendChild(a);
        }
      }
      tr.appendChild(tdMap);

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

  // ===== Daily Route (approx) =====
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  const buildMapsDirUrl = ({ origin, destination, waypoints }) => {
    const o = (origin || '').toString().trim();
    const d = (destination || '').toString().trim();
    if (!o || !d) return '';
    const parts = [];
    parts.push('https://www.google.com/maps/dir/?api=1');
    parts.push(`origin=${encodeURIComponent(o)}`);
    parts.push(`destination=${encodeURIComponent(d)}`);
    if (waypoints && waypoints.length) {
      const wp = waypoints.map(x => (x || '').toString().trim()).filter(Boolean);
      if (wp.length) parts.push(`waypoints=${encodeURIComponent(wp.join('|'))}`);
    }
    return parts.join('&');
  };

  const getMapsOriginText = (r) => {
    const z = (r.pickupZip || '').toString().trim();
    if (state.routeZipOnly && z) return `〒${z}`;
    return (r.pickupAddrShort || shortPickupAddr(r.rawPickup || '') || r.pickupDisplay || '').toString().trim();
  };
  const getMapsDestText = (r) => {
    const z = (r.dropoffZip || '').toString().trim();
    if (state.routeZipOnly && z) return `〒${z}`;
    return (r.dropoffDisplay || '').toString().trim();
  };

  const buildRouteTripsForSelectedDay = (eventsAll, businessDateStrVal) => {
    const bounds = getBusinessDayRealBounds(businessDateStrVal);
    if (!bounds) return [];

    const base = eventsAll
      .filter(e => e.kind === 'base' && e.requestTime)
      .slice()
      .sort((a, b) => a.requestTime.getTime() - b.requestTime.getTime());

    if (!base.length) return [];

    const inDayIdx = [];
    for (let i = 0; i < base.length; i++) {
      const ms = base[i].requestTime.getTime();
      if (ms >= bounds.start.getTime() && ms < bounds.end.getTime()) inDayIdx.push(i);
    }
    if (!inDayIdx.length) return [];

    // Expand to session: if 4:00 is crossed but requests are within 6h gaps, keep as one group.
    let lo = inDayIdx[0];
    let hi = inDayIdx[inDayIdx.length - 1];
    while (lo > 0) {
      const gap = base[lo].requestTime.getTime() - base[lo - 1].requestTime.getTime();
      if (gap >= SIX_HOURS_MS) break;
      lo -= 1;
    }
    while (hi < base.length - 1) {
      const gap = base[hi + 1].requestTime.getTime() - base[hi].requestTime.getTime();
      if (gap >= SIX_HOURS_MS) break;
      hi += 1;
    }

    return base.slice(lo, hi + 1);
  };

  const buildRouteLocations = (detailRows) => {
    // Build chronological events: request(pickup) and dropoff(drop)
    const events = [];
    for (const r of detailRows) {
      if (r.reqMs && getMapsOriginText(r)) {
        events.push({ t: r.reqMs, kind: 'req', text: getMapsOriginText(r), key: getMapsOriginText(r) });
      }
      if (r.dropMs && getMapsDestText(r)) {
        const dest = getMapsDestText(r);
        const key = (r.dropoffZip ? (`zip:${normalizeZip7(r.dropoffZip)}`) : ('addr:' + dest));
        events.push({ t: r.dropMs, kind: 'drop', text: dest, key });
      }
    }
    events.sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t;
      // same time: request first
      if (a.kind === b.kind) return 0;
      return a.kind === 'req' ? -1 : 1;
    });

    // Compress consecutive same locations
    const locs = [];
    for (const e of events) {
      if (!locs.length || locs[locs.length - 1].key !== e.key) locs.push({ key: e.key, text: e.text });
    }
    return locs.map(x => x.text);
  };

  const splitRouteIntoMapLinks = (locTexts) => {
    const MAX_WAYPOINTS_SAFE = 20;
    const MAX_URL_LEN_SAFE = 1800;

    const links = [];
    const locs = (locTexts || []).map(x => (x || '').toString().trim()).filter(Boolean);
    if (locs.length < 2) return links;

    let cur = [locs[0]];
    for (let i = 1; i < locs.length; i++) {
      const next = locs[i];
      const test = cur.concat([next]);
      const waypoints = test.slice(1, test.length - 1);
      const url = buildMapsDirUrl({ origin: test[0], destination: test[test.length - 1], waypoints });
      const tooManyWaypoints = waypoints.length > MAX_WAYPOINTS_SAFE;
      const tooLong = url.length > MAX_URL_LEN_SAFE;

      if ((tooManyWaypoints || tooLong) && cur.length >= 2) {
        // finalize current
        const wps = cur.slice(1, cur.length - 1);
        links.push({ origin: cur[0], destination: cur[cur.length - 1], waypoints: wps, points: cur.length });
        // start new segment with overlap
        cur = [cur[cur.length - 1], next];
      } else {
        cur.push(next);
      }
    }
    if (cur.length >= 2) {
      const wps = cur.slice(1, cur.length - 1);
      links.push({ origin: cur[0], destination: cur[cur.length - 1], waypoints: wps, points: cur.length });
    }
    return links;
  };

  const renderDailyRoute = (eventsAll) => {
    if (!routeDetails || !routeTbody || !routeLinks || !routeMeta) return;

    const show = state.lastRange === 'day';
    routeDetails.style.display = show ? '' : 'none';
    if (show) routeDetails.open = true;
    if (!show) return;

    routeTbody.innerHTML = '';
    routeLinks.innerHTML = '';
    routeMeta.textContent = '';
    if (routeZipOnly) routeZipOnly.checked = !!state.routeZipOnly;

    if (!state.periodStartBD) {
      routeMeta.textContent = '日次が選択されていません。';
      return;
    }

    const sessionTrips = buildRouteTripsForSelectedDay(eventsAll, state.periodStartBD);
    if (!sessionTrips.length) {
      routeMeta.textContent = 'この日のデータがありません。';
      return;
    }

    const detailRows = buildDetailRows(sessionTrips);
    detailRows.sort((a, b) => (a.reqMs || 0) - (b.reqMs || 0));

    const startReq = sessionTrips.reduce((m, e) => {
      const t = e.requestTime ? e.requestTime.getTime() : null;
      if (!t) return m;
      return (m === null || t < m) ? t : m;
    }, null);
    const endDrop = sessionTrips.reduce((m, e) => {
      const t = e.time ? e.time.getTime() : null;
      if (!t) return m;
      return (m === null || t > m) ? t : m;
    }, null);

    const startTxt = startReq ? ymdHm(new Date(startReq)) : '';
    const endTxt = endDrop ? ymdHm(new Date(endDrop)) : '';
    const extra = (() => {
      const bounds = getBusinessDayRealBounds(state.periodStartBD);
      if (!bounds) return '';
      const s = bounds.start.getTime();
      const e = bounds.end.getTime();
      if ((startReq && startReq < s) || (endDrop && endDrop > e)) return '（4:00を跨いだ稼働を6時間空白で連結）';
      return '';
    })();
    routeMeta.textContent = `稼働: ${startTxt} 〜 ${endTxt} / ${detailRows.length.toLocaleString()}件 ${extra}`.trim();

    // Map links for the full sequence (compressed + split)
    if (!state.hideDropoff) {
      const locs = buildRouteLocations(detailRows);
      const segments = splitRouteIntoMapLinks(locs);
      if (segments.length) {
        const fragL = document.createDocumentFragment();
        segments.forEach((seg, idx) => {
          const url = buildMapsDirUrl(seg);
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'mapLink';
          a.textContent = `ルート${idx + 1}`;
          a.title = `Google Mapsで概算ルートを表示（地点 ${seg.points}）`;
          fragL.appendChild(a);
        });
        routeLinks.appendChild(fragL);
      }
    }

    // Table
    const frag = document.createDocumentFragment();
    for (const r of detailRows) {
      const tr = document.createElement('tr');

      const tdReq = document.createElement('td');
      tdReq.textContent = r.reqMs ? hhMm(new Date(r.reqMs)) : '';
      tr.appendChild(tdReq);

      const tdPick = document.createElement('td');
      tdPick.textContent = r.pickupDisplay || '';
      tdPick.classList.add('clickableCell');
      if (r.pickupAddrShort) tdPick.title = `店舗住所: ${r.pickupAddrShort}`;
      tr.appendChild(tdPick);

      const tdDrop = document.createElement('td');
      tdDrop.textContent = r.dropMs ? hhMm(new Date(r.dropMs)) : '';
      tr.appendChild(tdDrop);

      const tdDropAddr = document.createElement('td');
      tdDropAddr.textContent = state.hideDropoff ? '' : (r.dropoffDisplay || '');
      tr.appendChild(tdDropAddr);

      const tdMap = document.createElement('td');
      if (!state.hideDropoff) {
        const origin = getMapsOriginText(r);
        const dest = getMapsDestText(r);
        if (origin && dest) {
          const a = document.createElement('a');
          a.href = buildMapsDirUrl({ origin, destination: dest, waypoints: [] });
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'mapLink';
          a.textContent = 'Map';
          a.addEventListener('click', (ev) => ev.stopPropagation());
          tdMap.appendChild(a);
        }
      }
      tr.appendChild(tdMap);

      const dur = formatDuration(r.deliveryMinutes);
      const wageLine = formatWageLine(r.amount, r.deliveryMinutes);
      const tipLines = [];
      if (dur) tipLines.push(`配達時間: ${dur}`);
      tipLines.push(`金額: ${fmtYen(r.amount)}`);
      if (wageLine) tipLines.push(wageLine);
      if (r.tipAmount && r.tipAmount > 0) tipLines.push(`チップ: ${fmtYen(r.tipAmount)}`);
      if (wageLine) tipLines.push(wageLine);
      tr.title = tipLines.join('\n');

      tr.addEventListener('click', () => {
        const title = `配達（ルート）`;
        const shown = [
          r.reqMs ? (`依頼: ${ymdHm(new Date(r.reqMs))}`) : '依頼: -',
          `店舗: ${(r.pickupDisplay || '').toString()}`,
          r.dropMs ? (`降車: ${ymdHm(new Date(r.dropMs))}`) : '降車: -',
          state.hideDropoff ? '降車: （非表示）' : (`降車: ${(r.dropoffDisplay || '').toString()}`),
          dur ? `配達時間: ${dur}` : '',
          `金額: ${fmtYen(r.amount)}`,
          (r.tipAmount && r.tipAmount > 0) ? `チップ: ${fmtYen(r.tipAmount)}` : '',
          wageLine || ''
        ].filter(Boolean).join('\n');
        const rawLines = [
          `rideId: ${r.rideId || ''}`,
          r.reqMs ? (`requestTime: ${new Date(r.reqMs).toISOString()}`) : 'requestTime: ',
          r.dropMs ? (`dropoffTime: ${new Date(r.dropMs).toISOString()}`) : 'dropoffTime: ',
          `pickupAddr(raw): ${r.rawPickup || ''}`,
          `pickupShort: ${r.pickupAddrShort || ''}`,
          `dropoffAddr(raw): ${r.dropoffRaw || ''}`,
          `dropoffShort: ${state.hideDropoff ? '' : (r.dropoffDisplay || '')}`,
          `amount: ${r.amount}`,
          `tipAmount: ${r.tipAmount || 0}`,
          `deliveryMinutes: ${r.deliveryMinutes || ''}`,
          `txnIds: ${(r.txnIds || []).join(',')}`,
          `payNote: ${r.payNote || ''}`
        ];
	        // NOTE: Keep join argument as a literal "\\n". A stray newline here breaks parsing and prevents CSV loading.
	        openRawModal({ title, shown, raw: rawLines.join('\\n') });
      });

      frag.appendChild(tr);
    }
    routeTbody.appendChild(frag);
  };

  

  // ===== Cancels / failed trips list =====
  const getMaxBusinessDateFromTrips = () => {
    let maxBD = '';
    for (const t of state.tripsByRideId.values()) {
      const dt = t.dropoffTime || t.requestTime;
      if (!dt) continue;
      const bd = businessDateStr(dt);
      if (!maxBD || bd > maxBD) maxBD = bd;
    }
    return maxBD || null;
  };

  const getRangeBoundsForTrips = (rangeKey) => {
    const maxBD = state.dataMaxBD || getMaxBusinessDateFromTrips();
    if (!maxBD) return null;

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
      try { periodStart.value = mondayBD; } catch {}
      start = dateFromBusinessStr(mondayBD);
      end = addDays(start, 7);
    } else if (rangeKey === 'month') {
      const firstBD = clampMonthStartStr(startBD);
      state.periodStartBD = firstBD;
      try { periodStart.value = firstBD; } catch {}
      start = dateFromBusinessStr(firstBD);
      end = addMonths(start, 1);
    }

    return { start, end };
  };

  const renderCancels = (eventsAll) => {
    if (!cancelDetails || !cancelTbody || !cancelMeta) return;

    const hasTrips = !!(state.tripsByRideId && state.tripsByRideId.size);
    cancelDetails.style.display = hasTrips ? '' : 'none';
    if (!hasTrips) return;

    cancelTbody.innerHTML = '';
    cancelMeta.textContent = '';
    if (cancelBadge) cancelBadge.textContent = '0';

    const rangeKey = state.lastRange || 'week';
    const bounds = (eventsAll && eventsAll.length)
      ? getRangeBounds(eventsAll, rangeKey)
      : getRangeBoundsForTrips(rangeKey);

    // Aggregate payments by rideId (for tooltip/modal only)
    const payByRide = new Map();
    for (const p of state.paymentsByTxnId.values()) {
      if (!p.rideId) continue;
      const prev = payByRide.get(p.rideId) || { amount: 0, txnIds: [], notes: [], lastPaymentTime: null };
      prev.amount += p.amount;
      prev.txnIds.push(p.txnId);
      if (p.note) prev.notes.push(p.note);
      if (!prev.lastPaymentTime || (p.paymentTime && p.paymentTime > prev.lastPaymentTime)) prev.lastPaymentTime = p.paymentTime;
      payByRide.set(p.rideId, prev);
    }

    const rows = [];
    let unknownTime = 0;
    let stFailed = 0, stCancelled = 0, stOther = 0;

    for (const t of state.tripsByRideId.values()) {
      const stRaw = (t.status || '').toString().trim();
      const st = stRaw.toLowerCase();
      if (!st || st === 'completed') continue;

      if (st === 'failed') stFailed++;
      else if (st === 'rider_cancelled' || st === 'rider cancelled' || st === 'cancelled') stCancelled++;
      else stOther++;

      const dt = t.requestTime || t.dropoffTime;
      if (!dt) { unknownTime++; continue; }

      if (bounds && (bounds.start || bounds.end)) {
        const bd = businessDateStr(dt);
        const bdDate = dateFromBusinessStr(bd);
        if (!bdDate) continue;
        if (bounds.start && bdDate < bounds.start) continue;
        if (bounds.end && bdDate >= bounds.end) continue;
      }

      const pay = payByRide.get(t.rideId) || { amount: 0, txnIds: [], notes: [], lastPaymentTime: null };

      rows.push({
        rideId: t.rideId,
        requestTime: t.requestTime,
        dropoffTime: t.dropoffTime,
        status: stRaw,
        statusKey: st,
        pickupName: t.pickupName || '',
        pickupAddr: t.pickupAddr || '',
        dropoffAddr: t.dropoffAddr || '',
        amount: pay.amount || 0,
        txnIds: pay.txnIds || [],
        notes: pay.notes || [],
      });
    }

    rows.sort((a, b) => {
      const am = a.requestTime ? a.requestTime.getTime() : (a.dropoffTime ? a.dropoffTime.getTime() : 0);
      const bm = b.requestTime ? b.requestTime.getTime() : (b.dropoffTime ? b.dropoffTime.getTime() : 0);
      return am - bm;
    });

    const total = rows.length;
    if (cancelBadge) cancelBadge.textContent = total.toLocaleString('ja-JP');

    const meta = [];
    meta.push(`表示期間内: ${total.toLocaleString('ja-JP')}件`);
    meta.push(`内訳: failed ${stFailed.toLocaleString('ja-JP')} / cancelled ${stCancelled.toLocaleString('ja-JP')} / other ${stOther.toLocaleString('ja-JP')}`);
    if (unknownTime) meta.push(`時刻不明 ${unknownTime.toLocaleString('ja-JP')}件（一覧から除外）`);
    cancelMeta.textContent = meta.join(' / ');

    const MAX = 400;
    const frag = document.createDocumentFragment();

    for (const r of rows.slice(0, MAX)) {
      const tr = document.createElement('tr');

      const tdReq = document.createElement('td');
      tdReq.textContent = r.requestTime ? hhMm(r.requestTime) : (r.dropoffTime ? hhMm(r.dropoffTime) : '');
      tr.appendChild(tdReq);

      const tdSt = document.createElement('td');
      tdSt.textContent = r.status || '';
      tr.appendChild(tdSt);

      const tdPick = document.createElement('td');
      tdPick.textContent = r.pickupName || '';
      const pShort = (shortPickupAddr(r.pickupAddr || '') || '').toString().trim();
      if (pShort) tdPick.title = `店舗住所: ${pShort}`;
      tr.appendChild(tdPick);

      const tdDrop = document.createElement('td');
      tdDrop.textContent = state.hideDropoff ? '' : (formatDropoffDisplay(r.dropoffAddr || '') || '');
      tr.appendChild(tdDrop);

      // Tooltip
      const tipLines = [];
      if (r.requestTime) tipLines.push(`依頼: ${ymdHm(r.requestTime)}`);
      if (r.dropoffTime) tipLines.push(`降車: ${ymdHm(r.dropoffTime)}`);
      if (r.pickupName) tipLines.push(`店舗: ${r.pickupName}`);
      if (!state.hideDropoff) {
        const dd = formatDropoffDisplay(r.dropoffAddr || '');
        if (dd) tipLines.push(`降車: ${dd}`);
      }
      tipLines.push(`金額: ${fmtYen(r.amount || 0)}`);
      tr.title = tipLines.join('\n');

      tr.addEventListener('click', () => {
        const title = `キャンセル等`;
        const shown = [
          r.requestTime ? (`依頼: ${ymdHm(r.requestTime)}`) : '依頼: -',
          r.dropoffTime ? (`降車: ${ymdHm(r.dropoffTime)}`) : '降車: -',
          `ステータス: ${r.status || ''}`,
          `店舗: ${r.pickupName || ''}`,
          state.hideDropoff ? '降車: （非表示）' : (`降車: ${formatDropoffDisplay(r.dropoffAddr || '') || ''}`),
          `金額: ${fmtYen(r.amount || 0)}`,
        ].filter(Boolean).join('\n');

        const rawLines = [
          `rideId: ${r.rideId}`,
          `status: ${r.status || ''}`,
          r.requestTime ? (`requestTime: ${r.requestTime.toISOString()}`) : 'requestTime: ',
          r.dropoffTime ? (`dropoffTime: ${r.dropoffTime.toISOString()}`) : 'dropoffTime: ',
          `pickupAddr(raw): ${r.pickupAddr || ''}`,
          `pickupShort: ${shortPickupAddr(r.pickupAddr || '') || ''}`,
          `dropoffAddr(raw): ${state.hideDropoff ? '' : (r.dropoffAddr || '')}`,
          `dropoffShort: ${state.hideDropoff ? '' : (formatDropoffDisplay(r.dropoffAddr || '') || '')}`,
          `amount(sum): ${r.amount || 0}`,
          `txnIds: ${(r.txnIds || []).join(',')}`,
          `notes: ${(r.notes || []).join(' / ')}`,
        ];

        openRawModal({ title, shown, raw: rawLines.join('\n') });
      });

      frag.appendChild(tr);
    }

    cancelTbody.appendChild(frag);

    if (rows.length > MAX) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'muted small';
      td.textContent = `表示は先頭${MAX.toLocaleString('ja-JP')}件まで（以降省略）`;
      tr.appendChild(td);
      cancelTbody.appendChild(tr);
    }
  };



  // ===== Quest rendering =====
  const mdHm = (d) => {
    if (!d) return '';
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    return `${mm}/${dd} ${hhMm(d)}`;
  };

  const parseQuestNote = (note) => {
    const s = (note || '').toString();
    if (!s) return null;
    if (!/クエスト|quest/i.test(s)) return null;

    const dtRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(午前|午後)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/g;
    const dts = [];
    let m;
    while ((m = dtRe.exec(s)) && dts.length < 2) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const da = Number(m[3]);
      const ap = m[4];
      let hh = Number(m[5]);
      const mi = Number(m[6]);
      const ss = m[7] ? Number(m[7]) : 0;
      if (ap === '午後' && hh < 12) hh += 12;
      if (ap === '午前' && hh === 12) hh = 0;
      const dt = new Date(y, mo - 1, da, hh, mi, ss, 0);
      if (!Number.isNaN(dt.getTime())) dts.push(dt);
    }

    let start = dts[0] || null;
    let end = dts[1] || null;
    if (start && end && start.getTime() > end.getTime()) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const reqM = s.match(/[:：)]\s*(\d+)\s*回の乗車/) || s.match(/(\d+)\s*回の乗車/);
    const requiredTrips = reqM ? Number(reqM[1]) : null;
    const lvlM = s.match(/レベル\s*(\d+)/i);
    const level = lvlM ? Number(lvlM[1]) : null;

    let achieved = null;
    if (/達成しました|達成\b/.test(s)) achieved = true;
    if (/未達|達成できません|達成できな/.test(s)) achieved = false;

    return {
      start,
      end,
      requiredTrips: Number.isFinite(requiredTrips) ? requiredTrips : null,
      level: Number.isFinite(level) ? level : null,
      achieved,
      raw: s,
    };
  };

  const questAmountFromPromoEvent = (e) => {
    if (!e || e.kind !== 'promo') return 0;
    const qAmt = Number(e.questAmount || 0);
    if (Number.isFinite(qAmt) && qAmt > 0) return qAmt;
    const note = (e.note || '').toString();
    if (note && /クエスト|quest/i.test(note)) return Number(e.amount || 0);
    return 0;
  };

  const questKeyFrom = (info, note, fallbackTime) => {
    const st = info && info.start ? info.start.getTime() : null;
    const en = info && info.end ? info.end.getTime() : null;
    const req = info && info.requiredTrips != null ? info.requiredTrips : '';
    const lv = info && info.level != null ? info.level : '';
    if (st && en) return `q:${st}-${en}:${req}:${lv}`;
    const s = (note || '').toString().trim();
    if (s) return `qnote:${s.slice(0, 120)}`;
    if (fallbackTime) return `qtime:${fallbackTime.getTime()}`;
    return 'q:unknown';
  };



  const lowerBound = (arr, x) => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const getTripTimeMsSortedForQuest = () => {
    const includeFailed = !!(toggleFailed && toggleFailed.checked);
    const size = state.tripsByRideId ? state.tripsByRideId.size : 0;
    const key = `${includeFailed}:${size}`;
    if (state.questTripMsCache && state.questTripMsCache.key === key) return state.questTripMsCache.arr;

    const arr = [];
    if (state.tripsByRideId) {
      for (const t of state.tripsByRideId.values()) {
        if (!includeFailed) {
          const st = (t.status || '').toString().toLowerCase();
          if (st && st !== 'completed') continue;
        }
        const dt = t.requestTime || t.dropoffTime;
        if (!dt) continue;
        arr.push(dt.getTime());
      }
    }
    arr.sort((a, b) => a - b);
    state.questTripMsCache = { key, arr };
    return arr;
  };

  const countTripsInWindow = (arr, startMs, endMs) => {
    if (!arr || !arr.length) return 0;
    if (startMs === null || startMs === undefined) return 0;
    if (endMs === null || endMs === undefined) return 0;
    const a = lowerBound(arr, startMs);
    const b = lowerBound(arr, endMs);
    return Math.max(0, b - a);
  };

  const summarizeQuest = (g, note) => {
    const parts = [];
    if (g.level != null) parts.push(`Lv${g.level}`);
    if (g.requiredTrips != null) parts.push(`${g.requiredTrips}回`);
    if (g.achieved === true) parts.push('達成');
    if (g.achieved === false) parts.push('未達');
    if (parts.length) return parts.join(' / ');
    const s = (note || '').toString().trim();
    return s ? s.slice(0, 60) : '';
  };

  const renderQuests = (eventsFiltered) => {
    if (!questDetails || !questTbody || !questMeta) return;

    questTbody.innerHTML = '';
    questMeta.textContent = '';
    if (questBadge) questBadge.textContent = '0';

    const questLines = (eventsFiltered || []).filter(e => e.kind === 'promo' && questAmountFromPromoEvent(e) > 0);
    const has = questLines.length > 0;
    questDetails.style.display = has ? '' : 'none';
    if (!has) return;

    const groups = new Map();
    let questSum = 0;
    let parsedOk = 0;

    for (const e of questLines) {
      const qAmt = questAmountFromPromoEvent(e);
      questSum += qAmt;
      const info = parseQuestNote(e.note || '');
      if (info && info.start && info.end) parsedOk++;
      const key = questKeyFrom(info, e.note || '', e.time || null);

      const g = groups.get(key) || {
        key,
        start: info && info.start ? info.start : null,
        end: info && info.end ? info.end : null,
        requiredTrips: info ? info.requiredTrips : null,
        level: info ? info.level : null,
        achieved: info ? info.achieved : null,
        amount: 0,
        notes: [],
        txnIds: [],
        payTimes: [],
      };

      g.amount += qAmt;
      if (e.note) g.notes.push(e.note);
      if (e.txnIds && e.txnIds.length) g.txnIds.push(...e.txnIds);
      if (e.time) g.payTimes.push(e.time);

      if (!g.start && info && info.start) g.start = info.start;
      if (!g.end && info && info.end) g.end = info.end;
      if (g.requiredTrips == null && info && info.requiredTrips != null) g.requiredTrips = info.requiredTrips;
      if (g.level == null && info && info.level != null) g.level = info.level;
      if (g.achieved == null && info && info.achieved != null) g.achieved = info.achieved;

      groups.set(key, g);
    }

    const tripMsArr = getTripTimeMsSortedForQuest();
    const items = [...groups.values()];
    for (const g of items) {
      if (g.start && g.end) g.actualTrips = countTripsInWindow(tripMsArr, g.start.getTime(), g.end.getTime());
      else g.actualTrips = null;
    }

    items.sort((a, b) => {
      const as = a.start ? a.start.getTime() : (a.payTimes[0] ? a.payTimes[0].getTime() : 0);
      const bs = b.start ? b.start.getTime() : (b.payTimes[0] ? b.payTimes[0].getTime() : 0);
      return as - bs;
    });

    if (questBadge) questBadge.textContent = items.length.toLocaleString('ja-JP');

    const metaParts = [];
    metaParts.push(`表示期間内: クエスト ${fmtYen(questSum)} / グループ ${items.length.toLocaleString('ja-JP')} / 支払行 ${questLines.length.toLocaleString('ja-JP')}`);
    if (parsedOk) metaParts.push(`期間解析 ${parsedOk.toLocaleString('ja-JP')}件`);
    questMeta.textContent = metaParts.join(' / ');

    const MAX = 200;
    const frag = document.createDocumentFragment();

    for (const g of items.slice(0, MAX)) {
      const tr = document.createElement('tr');

      const tdPeriod = document.createElement('td');
      tdPeriod.textContent = (g.start && g.end)
        ? `${mdHm(g.start)}～${mdHm(g.end)}`
        : (g.payTimes[0] ? ymdHm(g.payTimes[0]) : '');
      tr.appendChild(tdPeriod);

      const tdReq = document.createElement('td');
      tdReq.className = 'num';
      tdReq.textContent = (g.requiredTrips != null) ? String(g.requiredTrips) : '-';
      tr.appendChild(tdReq);

      const tdAct = document.createElement('td');
      tdAct.className = 'num';
      tdAct.textContent = (g.actualTrips != null) ? String(g.actualTrips) : '-';
      tr.appendChild(tdAct);

      const tdAmt = document.createElement('td');
      tdAmt.className = 'num';
      tdAmt.textContent = fmtYen(g.amount || 0);
      tr.appendChild(tdAmt);

      const tdNote = document.createElement('td');
      const note0 = (g.notes && g.notes.length) ? g.notes[0] : '';
      tdNote.textContent = summarizeQuest(g, note0);
      tdNote.title = note0 || '';
      tr.appendChild(tdNote);

      const tipLines = [];
      if (g.start && g.end) tipLines.push(`期間: ${ymdHm(g.start)}～${ymdHm(g.end)}`);
      if (g.requiredTrips != null) tipLines.push(`必要回数: ${g.requiredTrips}`);
      if (g.actualTrips != null) tipLines.push(`実配達: ${g.actualTrips}`);
      if (g.level != null) tipLines.push(`レベル: ${g.level}`);
      if (g.achieved === true) tipLines.push('達成: はい');
      if (g.achieved === false) tipLines.push('達成: いいえ');
      tipLines.push(`獲得額: ${fmtYen(g.amount || 0)}`);
      tr.title = tipLines.join('\n');

      tr.addEventListener('click', () => {
        const title = 'クエスト';
        const shown = tipLines.join('\n');
        const rawLines = [
          `txnIds: ${(g.txnIds || []).join(',')}`,
          `notes: ${(g.notes || []).join(' / ')}`,
        ];
        openRawModal({ title, shown, raw: rawLines.join('\n') });
      });

      frag.appendChild(tr);
    }

    questTbody.appendChild(frag);

    if (items.length > MAX) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'muted small';
      td.textContent = `表示は先頭${MAX.toLocaleString('ja-JP')}件まで（以降省略）`;
      tr.appendChild(td);
      questTbody.appendChild(tr);
    }
  };
  if (routeZipOnly) {
    routeZipOnly.checked = !!state.routeZipOnly;
    routeZipOnly.addEventListener('change', () => {
      state.routeZipOnly = !!routeZipOnly.checked;
      refreshAll();
    });
  }
// ====== Main refresh ======
  const refreshAll = () => {
    const eventsAll = buildEvents();
    state.dataMinBD = getMinBusinessDate(eventsAll);
    state.dataMaxBD = getMaxBusinessDate(eventsAll);
    ensureChartViewportDefaults();
    const rangeKey = state.lastRange || 'week';
    updatePeriodUI(eventsAll);

    const events = filterEventsByRange(eventsAll, rangeKey);
    const activeInfo = updateStats(events);
    updateChart(events, activeInfo);
    renderDetails(events);
    renderDailyRoute(eventsAll);
    renderCancels(eventsAll);
    renderQuests(events);
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
  const animateViewport = (targetMin, targetMax, durationMs = 180) => {
    if (!state.chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    let fromMin = state.chart.options.scales.x.min ?? b.minMs;
    let fromMax = state.chart.options.scales.x.max ?? b.maxMs;
    fromMin = (typeof fromMin === 'number') ? fromMin : new Date(fromMin).getTime();
    fromMax = (typeof fromMax === 'number') ? fromMax : new Date(fromMax).getTime();

    const minSpan = getMinSpanX(state.chart);
    const span = Math.max(minSpan, targetMax - targetMin);
    let min = clamp(targetMin, b.minMs, b.maxMs - span);
    let max = min + span;

    const token = (state._viewportAnimToken = (state._viewportAnimToken || 0) + 1);
    const t0 = performance.now();
    const easeInOutQuad = (t) => (t < 0.5) ? (2 * t * t) : (1 - Math.pow(-2 * t + 2, 2) / 2);

    const step = (now) => {
      if (state._viewportAnimToken !== token) return;
      const p = Math.min(1, (now - t0) / durationMs);
      const e = easeInOutQuad(p);

      state.chartViewEnabled = true;
      state.chartViewMin = fromMin + (min - fromMin) * e;
      state.chartViewMax = fromMax + (max - fromMax) * e;

      applyChartViewport(state.chart);
      try { state.chart.update('none'); } catch {}

      if (p < 1) requestAnimationFrame(step);
      else {
        state.chartViewMin = min;
        state.chartViewMax = max;
        applyChartViewport(state.chart);
        try { state.chart.update('none'); } catch {}
      }
    };

    requestAnimationFrame(step);
  };

  const zoomChart = (factor) => {
    if (!state.chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    let curMin = state.chart.options.scales.x.min ?? b.minMs;
    let curMax = state.chart.options.scales.x.max ?? b.maxMs;
    curMin = typeof curMin === 'number' ? curMin : new Date(curMin).getTime();
    curMax = typeof curMax === 'number' ? curMax : new Date(curMax).getTime();

    const minSpan = getMinSpanX(state.chart);
    const span = Math.max(minSpan, (curMax - curMin) * factor);

    const fullSpan = b.maxMs - b.minMs;
    const clampedSpan = Math.min(span, fullSpan);

    // Anchor zoom at the left edge (current min), unless clamped by range bounds.
    let min = curMin;
    let max = min + clampedSpan;

    if (min < b.minMs) { min = b.minMs; max = min + clampedSpan; }
    if (max > b.maxMs) { max = b.maxMs; min = max - clampedSpan; }

    min = clamp(min, b.minMs, b.maxMs - clampedSpan);
    max = min + clampedSpan;

    animateViewport(min, max);
  };

  const panChart = (dir) => {
    if (!state.chart) return;
    const b = getRangeBoundsMs();
    if (!b) return;

    let curMin = state.chart.options.scales.x.min ?? b.minMs;
    let curMax = state.chart.options.scales.x.max ?? b.maxMs;
    curMin = typeof curMin === 'number' ? curMin : new Date(curMin).getTime();
    curMax = typeof curMax === 'number' ? curMax : new Date(curMax).getTime();

    const minSpan = getMinSpanX(state.chart);
    const span = Math.max(minSpan, curMax - curMin);
    const delta = span * 0.2 * dir;

    let min = curMin + delta;
    let max = curMax + delta;
    if (min < b.minMs) { max += (b.minMs - min); min = b.minMs; }
    if (max > b.maxMs) { min -= (max - b.maxMs); max = b.maxMs; }
    min = clamp(min, b.minMs, b.maxMs - span);
    max = min + span;

    animateViewport(min, max);
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
    state.ingestTotals = makeEmptyIngestTotals();
    state.qualitySnapshot = null;
    loadStatus.textContent = '未読み込み';
    computeQualitySnapshot();
    renderQualitySnapshot();
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

      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      state.zipDictStats = { status: 'loading', source: 'file', rows: 0, loadMs: 0, error: '' };

      setZipStatus('読み込み中...');
      Papa.parse(f, {
        header: false,
        skipEmptyLines: true,
        worker: true,
        complete: (res) => {
          try {
            const map = buildZipDictFromRows(res.data || []);
            state.zipDict = map;
            state.zipDictReady = true;

            const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            state.zipDictStats = { status: 'ready', source: 'file', rows: (res.data || []).length, loadMs: Math.round(t1 - t0), error: '' };

            setZipStatus(`読み込み済み（${map.size.toLocaleString()}件）`);
            computeQualitySnapshot();
            renderQualitySnapshot();
            refreshAll();
          } catch (e) {
            console.error(e);
            state.zipDictStats = { status: 'error', source: 'file', rows: 0, loadMs: 0, error: String(e && e.message ? e.message : e) };
            setZipStatus('読込失敗');
            computeQualitySnapshot();
            renderQualitySnapshot();
          }
        },
        error: (err) => {
          console.error(err);
          state.zipDictStats = { status: 'error', source: 'file', rows: 0, loadMs: 0, error: String(err && err.message ? err.message : err) };
          setZipStatus('読込失敗');
          computeQualitySnapshot();
          renderQualitySnapshot();
        },
      });
    });
  }
  if (state.zipDictReady) setZipStatus(`読み込み済み（${state.zipDict ? state.zipDict.size.toLocaleString() : '0'}件）`);


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
  computeQualitySnapshot();
  renderQualitySnapshot();
  setActiveRange('month');
})();
