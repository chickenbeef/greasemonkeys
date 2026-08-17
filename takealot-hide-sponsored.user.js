// ==UserScript==
// @name         Takealot Hide Sponsored Products
// @namespace    https://takealot.com/
// @version      1.0
// @description  Hides sponsored product listings from search results and browsing pages on Takealot.
// @author       chickenbeef
// @match        https://www.takealot.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/takealot-hide-sponsored.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/takealot-hide-sponsored.user.js

// ==/UserScript==

(function () {
    'use strict';

    function findProductCard(el) {
        // Attempt matching known Takealot CSS module container patterns
        const directCard = el.closest('[class*="item-wrapper"], [class*="product-card"], [class*="grid-item"]');
        if (directCard) return directCard;

        // Fallback: traverse up to the immediate child of the grid listing container
        let current = el;
        while (current && current.parentElement && current.parentElement !== document.body) {
            const parent = current.parentElement;
            if (parent.children.length > 2) {
                const style = window.getComputedStyle(parent);
                if (style.display === 'grid' || (style.display === 'flex' && parent.children.length > 4)) {
                    return current;
                }
            }
            current = parent;
        }
        return null;
    }

    function removeSponsored() {
        // Find text nodes or elements containing the exact "Sponsored" tag
        const xpath = "//*[text()[normalize-space()='Sponsored']]";
        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            const card = findProductCard(node);
            if (card && card.style.display !== 'none') {
                card.style.display = 'none';
            }
        }
    }

    // Run on initial load
    removeSponsored();

    // Observe dynamic SPA content loading (infinite scroll, pagination, filter changes)
    let timeout;
    const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(removeSponsored, 150);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
