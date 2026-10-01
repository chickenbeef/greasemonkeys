// ==UserScript==
// @name         getWorth Vehicle Insights Overlay
// @namespace    getworth-insights
// @version      1.1
// @description  Fetches API data directly by car ID and overlays listing insights
// @match        https://www.getworth.co.za/cars-for-sale/*
// @grant        none
// @run-at       document-idle
// @updateUrl    https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/getworth-insights.user.js
// @downloadUrl  https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/getworth-insights.user.js
// ==/UserScript==

(function () {
    'use strict';

    const OVERLAY_ID = 'gw-vehicle-insights-overlay';
    let activeCarId = null;

    function log(...args) {
        console.log('%c[getWorth Insights]', 'background: #2563eb; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;', ...args);
    }

    function extractCarId() {
        // Strips any trailing slashes and extracts the last numeric segment
        const cleanPath = window.location.pathname.replace(/\/+$/, '');
        const segments = cleanPath.split('/');
        const candidate = segments[segments.length - 1];

        // Ensure it is numeric and not the top-level route
        if (/^\d+$/.test(candidate) && segments.length > 2) {
            return candidate;
        }
        return null;
    }

    function getOrCreateContainer() {
        let container = document.getElementById(OVERLAY_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = OVERLAY_ID;
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '320px',
                backgroundColor: '#111827',
                color: '#f3f4f6',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
                border: '1px solid #374151',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                lineHeight: '1.4',
                zIndex: '2147483647',
                overflow: 'hidden'
            });

            const mountPoint = document.body || document.documentElement;
            mountPoint.appendChild(container);
        }
        return container;
    }

    function formatDaysAgo(isoDate) {
        if (!isoDate) return 'N/A';
        const created = new Date(isoDate);
        if (isNaN(created)) return isoDate;
        const diffMs = new Date() - created;
        const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const dateStr = created.toISOString().split('T')[0];
        return `${dateStr} (${days}d ago)`;
    }

    function renderLoading(id) {
        const container = getOrCreateContainer();
        container.innerHTML = `
            <div style="padding: 14px; text-align: center; color: #9ca3af;">
                Fetching data for vehicle <strong>#${id}</strong>...
            </div>
        `;
    }

    function renderError(message) {
        const container = getOrCreateContainer();
        container.innerHTML = `
            <div style="padding: 14px; color: #f87171; background-color: #1f2937;">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }

    function renderInsights(data) {
        const container = getOrCreateContainer();
        const hasDiscount = data.is_discounted || data.discount_value > 0;
        const discountBadge = hasDiscount
            ? `<span style="color: #4ade80; font-weight: 700;">R ${Number(data.discount_value).toLocaleString()} OFF</span>`
            : `<span style="color: #9ca3af;">None</span>`;

        container.innerHTML = `
            <div style="background-color: #1f2937; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #374151;">
                <span style="font-weight: 700; color: #f9fafb;">Vehicle Insights #${data.id}</span>
                <button id="gw-min-btn" style="background: none; border: none; color: #9ca3af; font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px;">−</button>
            </div>
            <div id="gw-body" style="padding: 12px 14px; display: flex; flex-direction: column; gap: 7px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Date Listed:</span>
                    <span style="font-weight: 600;">${formatDaysAgo(data.date_created)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Previous Owners:</span>
                    <span style="font-weight: 600;">${data.previous_owners || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Discount:</span>
                    <span>${discountBadge}</span>
                </div>
                ${hasDiscount && data.discount_start_date ? `
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
                    <span>Window:</span>
                    <span>${data.discount_start_date.split('T')[0]} to${data.discount_end_date.split('T')[0]}</span>
                </div>` : ''}
                <div style="height: 1px; background-color: #374151; margin: 2px 0;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #9ca3af;">MMCode:</span>
                    <code style="background: #374151; padding: 1px 5px; border-radius: 3px; font-size: 11px; color: #60a5fa;">${data.mmcode || 'N/A'}</code>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Reg Date:</span>
                    <span>${data.registration_date || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Condition:</span>
                    <span>${data.condition || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #9ca3af;">Service History:</span>
                    <span style="max-width: 170px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${data.service_history || ''}">${data.service_history || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin-top: 2px;">
                    <span>Ratings:</span>
                    <span>Eng: ${data.rate_engine} | Int: ${data.rate_interior} | Ext: ${data.rate_exterior}</span>
                </div>
            </div>
        `;

        const minBtn = container.querySelector('#gw-min-btn');
        const body = container.querySelector('#gw-body');
        minBtn.onclick = () => {
            const isClosed = body.style.display === 'none';
            body.style.display = isClosed ? 'flex' : 'none';
            minBtn.textContent = isClosed ? '−' : '+';
        };
    }

    async function fetchVehicle(id) {
        log(`Loading details for vehicle ID: ${id}`);
        renderLoading(id);

        try {
            const res = await fetch(`https://api.getworth.co.za/api/showroom/${id}`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'x-requested-with': 'Fetch'
                }
            });

            if (!res.ok) {
                throw new Error(`API returned HTTP ${res.status}`);
            }

            const data = await res.json();
            log('Vehicle payload received:', data);
            renderInsights(data);
        } catch (err) {
            log('Fetch error:', err);
            renderError(err.message || 'Failed to retrieve vehicle data');
        }
    }

    function checkRoute() {
        const id = extractCarId();
        if (id && id !== activeCarId) {
            activeCarId = id;
            fetchVehicle(id);
        } else if (!id && activeCarId) {
            activeCarId = null;
            const container = document.getElementById(OVERLAY_ID);
            if (container) container.remove();
        }
    }

    // Monitor SPA navigation events
    window.addEventListener('popstate', checkRoute);

    // Intercept pushState and replaceState for SPA view changes
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        checkRoute();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        checkRoute();
    };

    // Polling fallback
    setInterval(checkRoute, 1000);
    checkRoute();
})();
