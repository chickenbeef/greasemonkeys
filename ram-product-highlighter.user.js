// ==UserScript==
// @name         Amazon.co.za RAM Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Highlights DDR4 (16/32/64GB - yellow) and DDR5 (8/16/24/32/48/64GB - light red) RAM modules
// @match        *://*.amazon.co.za/*
// @updateURL    https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/ram-product-highlighter.user.js
// @downloadURL  https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/ram-product-highlighter.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hasDDR4 = /DDR4/i;
    const hasDDR5 = /DDR5/i;

    // Separate size patterns for DDR4 and DDR5
    const ddr4Capacity = /(16|32|64)\s*GB/i;
    const ddr5Capacity = /(8|16|24|32|48|64)\s*GB/i;

    function highlightProducts() {
        // Select elements that haven't been highlighted yet to avoid infinite loops
        const productTitles = document.querySelectorAll('h2 span.a-text-normal:not(.ram-highlighted), h2 a span:not(.ram-highlighted), [data-cy="title-recipe"] h2:not(.ram-highlighted)');

        if (productTitles.length === 0) return;

        let newlyHighlighted = 0;

        productTitles.forEach(title => {
            // Mark as processed immediately
            title.classList.add('ram-highlighted');

            const text = title.textContent;
            let bgColor = '';

            if (hasDDR4.test(text) && ddr4Capacity.test(text)) {
                bgColor = 'yellow';
            } else if (hasDDR5.test(text) && ddr5Capacity.test(text)) {
                bgColor = '#ffcccc'; // Light red
            }

            if (bgColor) {
                title.style.setProperty('background-color', bgColor, 'important');
                title.style.setProperty('color', 'black', 'important');
                title.style.setProperty('font-weight', 'bold', 'important');
                newlyHighlighted++;
            }
        });

        if (newlyHighlighted > 0) {
            console.log(`[RAM Highlighter] Found and highlighted ${newlyHighlighted} new products.`);
        }
    }

    // 1. Run once immediately in case the page is already fully loaded
    highlightProducts();

    // 2. Set up a MutationObserver to watch for dynamic background loading or infinite scrolling
    const observer = new MutationObserver(() => {
        highlightProducts();
    });

    // Start observing the entire body for injected elements
    observer.observe(document.body, { childList: true, subtree: true });

})();
