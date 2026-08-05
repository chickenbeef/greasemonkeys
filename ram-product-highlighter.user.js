// ==UserScript==
// @name         Amazon.co.za RAM Highlighter & Filter
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Highlights DDR4 (16/32/64GB - yellow) and DDR5 (8/16/24/32/48/64GB - light red) RAM modules; hides 4GB/8GB DDR4, DDR4 > R2000, and all DDR3/DDR2 modules
// @match        *://*.amazon.co.za/*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hasDDR2 = /DDR2/i;
    const hasDDR3 = /DDR3/i;
    const hasDDR4 = /DDR4/i;
    const hasDDR5 = /DDR5/i;

    // Capacity regex patterns
    const ddr4Capacity = /(16|32|64)\s*GB/i;
    const ddr4Exclude = /\b(4|8)\s*GB\b/i;
    const ddr5Capacity = /(8|16|24|32|48|64)\s*GB/i;

    function getProductPrice(card) {
        if (!card) return null;
        const priceEl = card.querySelector('.a-price .a-offscreen') || card.querySelector('.a-price');
        if (!priceEl) return null;

        const cleaned = priceEl.textContent.replace(/[^\d.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }

    function processProducts() {
        const productTitles = document.querySelectorAll(
            'h2 span.a-text-normal:not(.ram-highlighted), h2 a span:not(.ram-highlighted), [data-cy="title-recipe"] h2:not(.ram-highlighted)'
        );

        if (productTitles.length === 0) return;

        let newlyProcessed = 0;

        productTitles.forEach(title => {
            title.classList.add('ram-highlighted');

            const text = title.textContent;
            const card = title.closest('.s-result-item, [data-component-type="s-search-result"]');

            if (hasDDR3.test(text) || hasDDR2.test(text)) {
                if (card) {
                    card.style.setProperty('display', 'none', 'important');
                    newlyProcessed++;
                }
            } else if (hasDDR4.test(text)) {
                const price = getProductPrice(card);

                if (price !== null && price > 1800) {
                    // Hide DDR4 costing strictly more than R2000
                    if (card) {
                        card.style.setProperty('display', 'none', 'important');
                        newlyProcessed++;
                    }
                } else if (ddr4Capacity.test(text)) {
                    // Highlight 16GB, 32GB, 64GB DDR4 (<= R2000)
                    title.style.setProperty('background-color', 'yellow', 'important');
                    title.style.setProperty('color', 'black', 'important');
                    title.style.setProperty('font-weight', 'bold', 'important');
                    newlyProcessed++;
                } else if (ddr4Exclude.test(text)) {
                    // Hide 4GB and 8GB DDR4 modules
                    if (card) {
                        card.style.setProperty('display', 'none', 'important');
                        newlyProcessed++;
                    }
                }
            } else if (hasDDR5.test(text) && ddr5Capacity.test(text)) {
                title.style.setProperty('background-color', '#ffcccc', 'important');
                title.style.setProperty('color', 'black', 'important');
                title.style.setProperty('font-weight', 'bold', 'important');
                newlyProcessed++;
            }
        });

        if (newlyProcessed > 0) {
            console.log(`[RAM Highlighter] Processed ${newlyProcessed} new products.`);
        }
    }

    // 1. Run once immediately
    processProducts();

    // 2. Set up a MutationObserver for dynamic loads
    const observer = new MutationObserver(() => {
        processProducts();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
