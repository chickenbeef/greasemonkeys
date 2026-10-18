// ==UserScript==
// @name         WeBuyCars Hidden API Data Overlay
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Overlays hidden API fields (Dealer Video, Price Drops, Service KM/Date, Grades, Stock Age) on WeBuyCars vehicle listings.
// @author       Iftekhar
// @match        https://www.webuycars.co.za/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/we-buy-cars-hidden-data.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/we-buy-cars-hidden-data.user.js
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE = 'https://appgateway.webuycars.co.za/website-elastic-backend/api/get-car/';
    let currentStockNumber = null;
    let vehicleCache = new Map();

    // --- 1. Helpers & Formatters ---
    const formatCurrency = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 'N/A';
        return 'R ' + Number(val).toLocaleString('en-ZA');
    };

    const formatNumber = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 'N/A';
        return Number(val).toLocaleString('en-ZA');
    };

    const isValidDate = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        // Filter out default .NET DateTime.MinValue (0001-01-01) or invalid dates
        return !isNaN(d.getTime()) && d.getFullYear() > 1970;
    };

    const formatDateWithRelative = (dateStr) => {
        if (!isValidDate(dateStr)) return 'Not recorded';
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const formatted = d.toISOString().split('T')[0];
        const rel = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        return `${formatted} <span class="wbc-sub">(${rel})</span>`;
    };

    // Extract photobooth date from social/shop image URL: e.g. .../188011914020261007121948973.jpg
    const extractPhotoboothDate = (data) => {
        const urls = [
            ...(data?.Images?.social || []),
            ...(data?.Images?.shop || [])
        ];
        const stock = String(data?.StockNumber || '');
        for (const url of urls) {
            const filename = url.split('/').pop() || '';
            // Match stockNumber + single digit + YYYYMMDDHHMMSS
            const regex = new RegExp(`^${stock}\\d(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})`);
            const match = filename.match(regex);
            if (match) {
                const [, year, month, day, hour, min] = match;
                return formatDateWithRelative(`${year}-${month}-${day}T${hour}:${min}:00`);
            }
        }
        return null;
    };

    // --- 2. Network Interceptor (Fetch & XHR) ---
    const handleApiData = (json) => {
        if (json && json.result && json.data && json.data.StockNumber) {
            const stockNo = String(json.data.StockNumber);
            vehicleCache.set(stockNo, json.data);
            if (stockNo === getStockNumberFromUrl()) {
                renderOverlay(json.data);
            }
        }
    };

    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await origFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
            if (url.includes('/api/get-car/')) {
                response.clone().json().then(handleApiData).catch(() => {});
            }
        } catch (e) {}
        return response;
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (typeof url === 'string' && url.includes('/api/get-car/')) {
            this.addEventListener('load', function () {
                try {
                    handleApiData(JSON.parse(this.responseText));
                } catch (e) {}
            });
        }
        return origOpen.call(this, method, url, ...rest);
    };

    // --- 3. Styles & Overlay UI ---
    const injectStyles = () => {
        if (document.getElementById('wbc-ext-styles')) return;
        const style = document.createElement('style');
        style.id = 'wbc-ext-styles';
        style.textContent = `
            #wbc-inspector-panel {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 350px;
                max-height: 85vh;
                background: #111827;
                color: #f9fafb;
                border: 1px solid #374151;
                border-radius: 10px;
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transition: opacity 0.2s ease;
            }
            #wbc-inspector-header {
                background: #1f2937;
                padding: 10px 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #f37021;
                cursor: pointer;
                user-select: none;
            }
            #wbc-inspector-header .wbc-title {
                font-weight: 700;
                font-size: 13.5px;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .wbc-badge {
                background: #f37021;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
            }
            #wbc-inspector-body {
                padding: 12px 14px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            #wbc-inspector-panel.wbc-collapsed #wbc-inspector-body {
                display: none;
            }
            .wbc-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                border-bottom: 1px solid #1f2937;
                padding-bottom: 5px;
                gap: 10px;
            }
            .wbc-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .wbc-label {
                color: #9ca3af;
                font-weight: 500;
                white-space: nowrap;
            }
            .wbc-val {
                color: #f3f4f6;
                font-weight: 600;
                text-align: right;
            }
            .wbc-sub {
                color: #9ca3af;
                font-weight: 400;
                font-size: 11.5px;
            }
            .wbc-price-drop { color: #34d399; }
            .wbc-price-up { color: #f87171; }
            .wbc-warn { color: #fbbf24; }
            .wbc-video-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: #f37021;
                color: #fff !important;
                text-decoration: none;
                padding: 7px 12px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 12.5px;
                margin-top: 4px;
                text-align: center;
                transition: background 0.15s;
            }
            .wbc-video-btn:hover {
                background: #d95d12;
            }
            .wbc-section-title {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #f37021;
                font-weight: 700;
                margin-top: 4px;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    };

    const removeOverlay = () => {
        const existing = document.getElementById('wbc-inspector-panel');
        if (existing) existing.remove();
    };

    const renderOverlay = (d) => {
        injectStyles();
        let panel = document.getElementById('wbc-inspector-panel');
        const wasCollapsed = panel ? panel.classList.contains('wbc-collapsed') : false;
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'wbc-inspector-panel';
            document.body.appendChild(panel);
        }
        if (wasCollapsed) panel.classList.add('wbc-collapsed');

        // Price Diff Calculation
        let priceDiffHtml = '<span class="wbc-sub">Unchanged</span>';
        if (d.PreviousPrice && d.PreviousPrice > 0 && d.PreviousPrice !== d.Price) {
            const diff = d.Price - d.PreviousPrice;
            const pct = ((diff / d.PreviousPrice) * 100).toFixed(1);
            const cls = diff < 0 ? 'wbc-price-drop' : 'wbc-price-up';
            const sign = diff > 0 ? '+' : '';
            priceDiffHtml = `${formatCurrency(d.PreviousPrice)} <span class="${cls}">(${sign}${formatCurrency(diff)} / ${sign}${pct}%)</span>`;
        }

        // Service KM Delta
        let serviceKmHtml = 'Not recorded';
        if (d.LastServiceKM && d.LastServiceKM > 0) {
            const deltaKm = d.Mileage ? d.Mileage - d.LastServiceKM : null;
            const deltaStr = deltaKm !== null && deltaKm >= 0 ? ` <span class="wbc-sub">(${formatNumber(deltaKm)} km ago)</span>` : '';
            serviceKmHtml = `${formatNumber(d.LastServiceKM)} km${deltaStr}`;
        }

        // Photobooth Date
        const photoDate = extractPhotoboothDate(d);

        // Roadworthy & Inspection
        const rwIssues = d.HasAnyRoadworthyRelevantIssues
            ? `<span class="wbc-price-up">Yes (${d.RoadworthyRelevantIssues})</span>`
            : `<span class="wbc-price-drop">None (0)</span>`;

        // Active plans & features
        const flags = [
            d.ActiveWarranty ? 'Warranty' : null,
            d.ActiveMaintenance ? 'Maintenance Plan' : null,
            d.Eval_Has_Car_Play_Android_Auto ? 'CarPlay/AA' : null,
            d.Eval_Has_Auto_Stop_Start ? 'Stop/Start' : null
        ].filter(Boolean);

        panel.innerHTML = `
            <div id="wbc-inspector-header" title="Click to toggle">
                <div class="wbc-title">
                    <span>WBC Hidden Data</span>
                    ${d.StockTag ? `<span class="wbc-badge">${d.StockTag}</span>` : ''}
                </div>
                <span id="wbc-toggle-icon" style="color:#9ca3af;font-size:12px;">${wasCollapsed ? '▲' : '▼'}</span>
            </div>
            <div id="wbc-inspector-body">
                <div class="wbc-section-title">Pricing & Stock History</div>
                <div class="wbc-row">
                    <span class="wbc-label">Previous Price</span>
                    <span class="wbc-val">${priceDiffHtml}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">Last Price Update</span>
                    <span class="wbc-val">${formatDateWithRelative(d.LastPriceUpdateDate)}</span>
                </div>
                ${photoDate ? `
                <div class="wbc-row">
                    <span class="wbc-label">Photobooth Date</span>
                    <span class="wbc-val">${photoDate}</span>
                </div>` : ''}
                <div class="wbc-row">
                    <span class="wbc-label">Pricing Grade</span>
                    <span class="wbc-val">${d.PricingGrade || d.Condition || 'N/A'}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">MM Code Demand</span>
                    <span class="wbc-val">${d.MmCodeFrequency || 'N/A'} <span class="wbc-sub">(Wt: ${d.MmCodeFrequencyWeight ?? '-'})</span></span>
                </div>

                <div class="wbc-section-title">Service & Condition</div>
                <div class="wbc-row">
                    <span class="wbc-label">Last Service Date</span>
                    <span class="wbc-val">${formatDateWithRelative(d.LastServiceDate)}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">Last Service KM</span>
                    <span class="wbc-val">${serviceKmHtml}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">RW Issues</span>
                    <span class="wbc-val">${rwIssues} | Done: ${d.HasRoadworthyCompleted ? 'Yes' : 'No'}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">Active Plans/Flags</span>
                    <span class="wbc-val">${flags.length ? flags.join(', ') : '<span class="wbc-sub">None active</span>'}</span>
                </div>

                <div class="wbc-section-title">Specs & Branch Extras</div>
                <div class="wbc-row">
                    <span class="wbc-label">Tyres (F / R)</span>
                    <span class="wbc-val">${d.FrontTyreSize || '-'} / ${d.RearTyreSize || '-'}</span>
                </div>
                <div class="wbc-row">
                    <span class="wbc-label">Mass (Tare / GVM / Tow)</span>
                    <span class="wbc-val">${d.Tare || '-'} / ${d.GVM || '-'} / ${d.TowingCapacity || '-'} kg</span>
                </div>
                ${d.AssignedParkingBay ? `
                <div class="wbc-row">
                    <span class="wbc-label">Parking Bay</span>
                    <span class="wbc-val">${d.AssignedParkingBay}</span>
                </div>` : ''}

                ${d.VideoReviewUrl ? `
                    <a class="wbc-video-btn" href="${d.VideoReviewUrl}" target="_blank" rel="noopener noreferrer">
                        ▶ Watch Dealer Video Review (Vimeo)
                    </a>
                ` : `
                    <div class="wbc-row">
                        <span class="wbc-label">Video Review</span>
                        <span class="wbc-val wbc-sub">No video URL on record</span>
                    </div>
                `}
            </div>
        `;

        document.getElementById('wbc-inspector-header').addEventListener('click', () => {
            panel.classList.toggle('wbc-collapsed');
            const isCollapsed = panel.classList.contains('wbc-collapsed');
            document.getElementById('wbc-toggle-icon').textContent = isCollapsed ? '▲' : '▼';
        });
    };

    // --- 4. SPA Navigation & Fallback Fetch ---
    const getStockNumberFromUrl = () => {
        const match = window.location.pathname.match(/\/car-for-sale\/[^/]+\/[^/]+\/(\d+)/i);
        return match ? match[1] : null;
    };

    const checkRoute = () => {
        const stockNo = getStockNumberFromUrl();
        if (!stockNo) {
            currentStockNumber = null;
            removeOverlay();
            return;
        }

        if (stockNo === currentStockNumber && document.getElementById('wbc-inspector-panel')) {
            return;
        }
        currentStockNumber = stockNo;

        if (vehicleCache.has(stockNo)) {
            renderOverlay(vehicleCache.get(stockNo));
            return;
        }

        // Fallback: If our interceptor missed the initial load or page came from cache, fetch directly after 800ms
        setTimeout(async () => {
            if (currentStockNumber === stockNo && !vehicleCache.has(stockNo)) {
                try {
                    const res = await origFetch(`${API_BASE}${stockNo}`);
                    const json = await res.json();
                    handleApiData(json);
                } catch (err) {
                    console.error('[WBC Hidden Data] Fallback fetch failed:', err);
                }
            }
        }, 800);
    };

    // Monitor SPA history changes
    const wrapHistory = (type) => {
        const orig = history[type];
        return function (...args) {
            const rv = orig.apply(this, args);
            window.dispatchEvent(new Event('wbc-url-change'));
            return rv;
        };
    };
    history.pushState = wrapHistory('pushState');
    history.replaceState = wrapHistory('replaceState');
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('wbc-url-change', checkRoute);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkRoute);
    } else {
        checkRoute();
    }
})();
