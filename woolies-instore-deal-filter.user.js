// ==UserScript==
// @name         Woolworths In-Store Deal Filter
// @namespace    https://woolworths.co.za/
// @version      1.1
// @description  Hides products without "In-Store Deal" on Woolworths and adds a floating toggle button.
// @author       You
// @match        https://www.woolworths.co.za/*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/woolies-instore-deal-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/woolies-instore-deal-filter.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Inject styles for hidden cards and the floating toggle button
    const style = document.createElement('style');
    style.id = 'ww-instore-deal-filter-styles';
    style.textContent = `
        body.ww-hide-non-deals [data-ww-has-deal="false"] {
            display: none !important;
        }
        #ww-deals-toggle {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: 50px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            transition: all 0.2s ease-in-out;
            user-select: none;
        }
        #ww-deals-toggle.active {
            background-color: #000000;
            color: #ffffff;
            border: 1px solid #000000;
        }
        #ww-deals-toggle.inactive {
            background-color: #ffffff;
            color: #444444;
            border: 1px solid #d1d5db;
        }
        #ww-deals-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
        }
        .ww-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }
        #ww-deals-toggle.active .ww-status-dot {
            background-color: #22c55e;
            box-shadow: 0 0 6px #22c55e;
        }
        #ww-deals-toggle.inactive .ww-status-dot {
            background-color: #9ca3af;
        }
    `;
    document.head.appendChild(style);

    // Retrieve saved state or default to enabled
    let isFilterActive = localStorage.getItem('ww_instore_filter') !== 'false';

    // Locate product cards across standard classes and fallback grid layouts
    function getProductCards() {
        const selectors = [
            'article',
            '[class*="product-card"]',
            '[class*="ProductCard"]',
            '[class*="product-list__item"]',
            '[class*="product-item"]',
            '[class*="range--item"]'
        ];

        for (const selector of selectors) {
            const nodes = document.querySelectorAll(selector);
            const valid = Array.from(nodes).filter(el => /R\s*\d+/i.test(el.textContent) && el.querySelector('img'));
            if (valid.length > 0) return valid;
        }

        // Structural fallback: find card ancestors from price labels
        const priceElements = Array.from(document.querySelectorAll('span, p, div')).filter(el =>
            el.children.length === 0 && /R\s*\d+(?:\.\d{2})?/.test(el.textContent.trim())
        );

        const cardSet = new Set();
        priceElements.forEach(el => {
            let curr = el;
            while (curr && curr !== document.body) {
                if (curr.querySelector('img') && curr.parentElement && curr.parentElement.children.length > 2) {
                    cardSet.add(curr);
                    break;
                }
                curr = curr.parentElement;
            }
        });

        return Array.from(cardSet);
    }

    // Tag cards and calculate counts
    function evaluateProducts() {
        const cards = getProductCards();
        let dealCount = 0;

        cards.forEach(card => {
            const hasDeal = /in[-\s]store\s+deal/i.test(card.textContent);
            card.setAttribute('data-ww-has-deal', hasDeal ? 'true' : 'false');
            if (hasDeal) dealCount++;
        });

        updateButtonUI(dealCount, cards.length);
    }

    // Create and attach floating UI button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'ww-deals-toggle';
    toggleButton.type = 'button';

    function updateButtonUI(dealsFound = 0, total = 0) {
        toggleButton.className = isFilterActive ? 'active' : 'inactive';
        toggleButton.innerHTML = `
            <span class="ww-status-dot"></span>
            <span>${isFilterActive ? 'In-Store Deals Only' : 'All Products'} (${dealsFound}/${total})</span>
        `;
    }

    toggleButton.addEventListener('click', () => {
        isFilterActive = !isFilterActive;
        localStorage.setItem('ww_instore_filter', isFilterActive);
        document.body.classList.toggle('ww-hide-non-deals', isFilterActive);
        evaluateProducts();
    });

    document.body.appendChild(toggleButton);

    if (isFilterActive) {
        document.body.classList.add('ww-hide-non-deals');
    }

    // Debounced mutation observer to handle infinite scrolling, sorting, and pagination
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(evaluateProducts, 200);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial evaluation
    evaluateProducts();
})();
