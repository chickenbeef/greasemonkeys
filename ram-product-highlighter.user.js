// ==UserScript==
// @name         Amazon.co.za RAM Highlighter & Filter
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Highlights DDR4 (16/32/64GB - yellow) and DDR5 (8/16/24/32/48/64GB - light red) RAM modules; hides 4GB/8GB DDR4 and all DDR3 modules
// @match        *://*.amazon.co.za/*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ram-product-highlighter
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hasDDR3 = /DDR3/i;
    const hasDDR4 = /DDR4/i;
    const hasDDR5 = /DDR5/i;

    // Capacity regex patterns
    const ddr4Capacity = /(16|32|64)\s*GB/i;
    const ddr4Exclude = /\b(4|8)\s*GB\b/i;
    const ddr5Capacity = /(8|16|24|32|48|64)\s*GB/i;

    function processProducts() {
        // Select elements that haven't been processed yet
        const productTitles = document.querySelectorAll('h2 span.a-text-normal:not(.ram-highlighted), h2 a span:not(.ram-highlighted), [data-cy="title-recipe"] h2:not(.ram-highlighted)');

        if (productTitles.length === 0) return;

        let newlyProcessed = 0;

        productTitles.forEach(title => {
            title.classList.add('ram-highlighted');

            const text = title.textContent;
            const card = title.closest('.s-result-item, [data-component-type="s-search-result"]');

            if (hasDDR3.test(text)) {
                // Hide all DDR3 product cards
                if (card) {
                    card.style.setProperty('display', 'none', 'important');
                    newlyProcessed++;
                }
            } else if (hasDDR4.test(text)) {
                if (ddr4Capacity.test(text)) {
                    // Highlight 16GB, 32GB, 64GB DDR4
                    title.style.setProperty('background-color', 'yellow', 'important');
                    title.style.setProperty('color', 'black', 'important');
                    title.style.setProperty('font-weight', 'bold', 'important');
                    newlyProcessed++;
                } else if (ddr4Exclude.test(text)) {
                    // Hide 4GB and 8GB DDR4 product cards
                    if (card) {
                        card.style.setProperty('display', 'none', 'important');
                        newlyProcessed++;
                    }
                }
            } else if (hasDDR5.test(text) && ddr5Capacity.test(text)) {
                // Highlight DDR5 modules
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
