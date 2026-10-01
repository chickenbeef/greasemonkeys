// ==UserScript==
// @name         Amazon.co.za RAM Highlighter & Filter
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Highlights DDR4 and DDR5 RAM modules; filters out unwanted modules with floating configuration controls.
// @match        https://www.amazon.co.za/s?i=electronics&rh=n%3A28035463031*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'amazon_ram_filter_settings';
    const DEFAULT_CONFIG = {
        enableHiding: true,
        ddr4MaxPrice: 1800,
        ddr5SmallMaxPrice: 900,
        hideDdr2Ddr3: true,
        hideDdr4LowCap: true,
        isMinimized: false
    };

    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
        } catch {
            return { ...DEFAULT_CONFIG };
        }
    }

    function saveConfig(cfg) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error('[RAM Filter] Could not save settings', e);
        }
    }

    const config = loadConfig();

    const hasDDR2 = /DDR2/i;
    const hasDDR3 = /DDR3/i;
    const hasDDR4 = /DDR4/i;
    const hasDDR5 = /DDR5/i;

    const ddr4Capacity = /(16|32|64)\s*GB/i;
    const ddr4Exclude = /\b(4|8)\s*GB\b/i;
    const ddr5Capacity = /(8|16|24|32|48|64)\s*GB/i;
    const ddr5SmallCapacity = /\b8\s*GB\b/i;

    function getProductPrice(card) {
        if (!card) return null;

        const offscreen = card.querySelector('.a-price .a-offscreen');
        if (offscreen && offscreen.textContent) {
            const cleaned = offscreen.textContent.replace(/[^\d.]/g, '');
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed)) return parsed;
        }

        const whole = card.querySelector('.a-price-whole');
        if (whole) {
            const frac = card.querySelector('.a-price-fraction');
            const wholeCleaned = whole.textContent.replace(/[^\d]/g, '');
            const fracCleaned = frac ? frac.textContent.replace(/[^\d]/g, '') : '00';
            const parsed = parseFloat(`${wholeCleaned}.${fracCleaned}`);
            if (!isNaN(parsed)) return parsed;
        }

        const priceEl = card.querySelector('.a-price');
        if (!priceEl) return null;
        const cleaned = priceEl.textContent.replace(/[^\d.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }

    function processProducts() {
        const cards = document.querySelectorAll('.s-result-item, [data-component-type="s-search-result"]');
        let hiddenCount = 0;
        let highlightedCount = 0;

        cards.forEach(card => {
            const title = card.querySelector('h2 span.a-text-normal, h2 a span, [data-cy="title-recipe"] h2');
            if (!title) return;

            const text = title.textContent || '';
            if (!text.trim()) return;

            // Reset dynamically applied styles
            card.style.removeProperty('display');
            title.style.removeProperty('background-color');
            title.style.removeProperty('color');
            title.style.removeProperty('font-weight');

            let shouldHide = false;
            let highlightType = null; // 'ddr4' | 'ddr5'

            if (hasDDR3.test(text) || hasDDR2.test(text)) {
                if (config.hideDdr2Ddr3) {
                    shouldHide = true;
                }
            } else if (hasDDR4.test(text)) {
                const price = getProductPrice(card);
                if (price !== null && price > config.ddr4MaxPrice) {
                    shouldHide = true;
                } else if (ddr4Capacity.test(text)) {
                    highlightType = 'ddr4';
                } else if (ddr4Exclude.test(text)) {
                    if (config.hideDdr4LowCap) {
                        shouldHide = true;
                    }
                }
            } else if (hasDDR5.test(text) && ddr5Capacity.test(text)) {
                const price = getProductPrice(card);
                if (ddr5SmallCapacity.test(text) && price !== null && price > config.ddr5SmallMaxPrice) {
                    shouldHide = true;
                } else {
                    highlightType = 'ddr5';
                }
            }

            if (shouldHide) {
                if (config.enableHiding) {
                    card.style.setProperty('display', 'none', 'important');
                    hiddenCount++;
                }
            } else if (highlightType === 'ddr4') {
                title.style.setProperty('background-color', 'yellow', 'important');
                title.style.setProperty('color', 'black', 'important');
                title.style.setProperty('font-weight', 'bold', 'important');
                highlightedCount++;
            } else if (highlightType === 'ddr5') {
                title.style.setProperty('background-color', '#ffcccc', 'important');
                title.style.setProperty('color', 'black', 'important');
                title.style.setProperty('font-weight', 'bold', 'important');
                highlightedCount++;
            }
        });

        updateWidgetStats(hiddenCount, highlightedCount);
    }

    function createUI() {
        if (document.getElementById('ram-filter-root')) return;

        const root = document.createElement('div');
        root.id = 'ram-filter-root';
        root.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 12px;
            color: #f3f4f6;
        `;

        root.innerHTML = `
            <div id="ram-widget-minimized" style="
                display: ${config.isMinimized ? 'flex' : 'none'};
                align-items: center;
                gap: 6px;
                background: #111827;
                border: 1px solid #374151;
                border-radius: 20px;
                padding: 6px 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                cursor: pointer;
                user-select: none;
            ">
                <span>⚙️ RAM Filter</span>
                <span id="ram-min-status" style="font-weight: 700; color: ${config.enableHiding ? '#4ade80' : '#f87171'};">
                    [${config.enableHiding ? 'HIDING ON' : 'HIDING OFF'}]
                </span>
            </div>

            <div id="ram-widget-panel" style="
                display: ${config.isMinimized ? 'none' : 'block'};
                background: #111827;
                border: 1px solid #374151;
                border-radius: 8px;
                padding: 12px 14px;
                width: 240px;
                box-shadow: 0 6px 18px rgba(0,0,0,0.45);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #374151; padding-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 13px; color: #fff;">RAM Filter & Highlighter</span>
                    <button id="ram-btn-minimize" title="Minimize" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px; padding: 0 2px;">✕</button>
                </div>

                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer; font-weight: 600; color: #f9fafb;">
                    <input type="checkbox" id="ram-cfg-enable" ${config.enableHiding ? 'checked' : ''} style="cursor: pointer;" />
                    <span>Hide Unwanted Items</span>
                </label>

                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #d1d5db;">Max DDR4 (R):</span>
                        <input type="number" id="ram-cfg-ddr4-max" value="${config.ddr4MaxPrice}" style="
                            width: 75px;
                            background: #1f2937;
                            border: 1px solid #4b5563;
                            border-radius: 4px;
                            color: #fff;
                            padding: 2px 6px;
                            text-align: right;
                            font-size: 12px;
                        " />
                    </label>
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #d1d5db;">Max DDR5 8GB (R):</span>
                        <input type="number" id="ram-cfg-ddr5-max" value="${config.ddr5SmallMaxPrice}" style="
                            width: 75px;
                            background: #1f2937;
                            border: 1px solid #4b5563;
                            border-radius: 4px;
                            color: #fff;
                            padding: 2px 6px;
                            text-align: right;
                            font-size: 12px;
                        " />
                    </label>
                </div>

                <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; border-top: 1px solid #374151; padding-top: 8px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #d1d5db;">
                        <input type="checkbox" id="ram-cfg-legacy" ${config.hideDdr2Ddr3 ? 'checked' : ''} style="cursor: pointer;" />
                        <span>Hide DDR2 & DDR3</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #d1d5db;">
                        <input type="checkbox" id="ram-cfg-ddr4-low" ${config.hideDdr4LowCap ? 'checked' : ''} style="cursor: pointer;" />
                        <span>Hide 4GB & 8GB DDR4</span>
                    </label>
                </div>

                <div id="ram-stats" style="border-top: 1px solid #374151; padding-top: 6px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
                    <span>Hidden: <strong id="ram-stat-hidden" style="color: #e5e7eb;">0</strong></span>
                    <span>Highlighted: <strong id="ram-stat-highlighted" style="color: #e5e7eb;">0</strong></span>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        const minimizedEl = document.getElementById('ram-widget-minimized');
        const panelEl = document.getElementById('ram-widget-panel');
        const minStatusEl = document.getElementById('ram-min-status');

        minimizedEl.addEventListener('click', () => {
            config.isMinimized = false;
            saveConfig(config);
            minimizedEl.style.display = 'none';
            panelEl.style.display = 'block';
        });

        document.getElementById('ram-btn-minimize').addEventListener('click', () => {
            config.isMinimized = true;
            saveConfig(config);
            panelEl.style.display = 'none';
            minimizedEl.style.display = 'flex';
        });

        document.getElementById('ram-cfg-enable').addEventListener('change', (e) => {
            config.enableHiding = e.target.checked;
            minStatusEl.textContent = config.enableHiding ? '[HIDING ON]' : '[HIDING OFF]';
            minStatusEl.style.color = config.enableHiding ? '#4ade80' : '#f87171';
            saveConfig(config);
            processProducts();
        });

        document.getElementById('ram-cfg-ddr4-max').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
                config.ddr4MaxPrice = val;
                saveConfig(config);
                processProducts();
            }
        });

        document.getElementById('ram-cfg-ddr5-max').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
                config.ddr5SmallMaxPrice = val;
                saveConfig(config);
                processProducts();
            }
        });

        document.getElementById('ram-cfg-legacy').addEventListener('change', (e) => {
            config.hideDdr2Ddr3 = e.target.checked;
            saveConfig(config);
            processProducts();
        });

        document.getElementById('ram-cfg-ddr4-low').addEventListener('change', (e) => {
            config.hideDdr4LowCap = e.target.checked;
            saveConfig(config);
            processProducts();
        });
    }

    function updateWidgetStats(hidden, highlighted) {
        const hiddenEl = document.getElementById('ram-stat-hidden');
        const highlightedEl = document.getElementById('ram-stat-highlighted');
        if (hiddenEl) hiddenEl.textContent = hidden;
        if (highlightedEl) highlightedEl.textContent = highlighted;
    }

    createUI();
    processProducts();

    let debounceTimer = null;
    const observer = new MutationObserver((mutations) => {
        const hasExternalChanges = mutations.some(m => !m.target.closest || !m.target.closest('#ram-filter-root'));
        if (hasExternalChanges) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(processProducts, 150);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
