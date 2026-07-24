// ==UserScript==
// @name         Bob Shop Auto-Check Listing Confirmation
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically ticks the policy agreement checkbox on Bob Shop trade creation review page.
// @author       You
// @match        https://www.bobshop.co.za/*TradeForm*
// @match        https://www.bobshop.co.za/*tradecreate*
// @match        https://*.bobshop.co.za/*TradeForm*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/bob-shop-auto-check-confirmation.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/bob-shop-auto-check-confirmation.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let isChecking = false;
    let debounceTimer = null;

    function autoCheck() {
        if (isChecking) return;
        isChecking = true;

        try {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');

            checkboxes.forEach(checkbox => {
                if (checkbox.checked) return;

                const container = checkbox.closest('label, .checkbox, .form-group, .form-check, div, td, p, span');
                const text = container ? (container.textContent || container.innerText || '').toLowerCase() : '';

                const keywords = [
                    'listing policy',
                    'i confirm',
                    'i have read',
                    'i agree',
                    'terms and conditions',
                    'confirm that',
                    'acknowledge'
                ];

                const isPolicyCheckbox = keywords.some(kw => text.includes(kw));

                if (isPolicyCheckbox) {
                    checkbox.click();

                    if (!checkbox.checked) {
                        checkbox.checked = true;
                    }

                    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        } finally {
            isChecking = false;
        }
    }

    function debouncedCheck() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(autoCheck, 300);
    }

    autoCheck();

    const observer = new MutationObserver(debouncedCheck);
    observer.observe(document.body, { childList: true, subtree: true });
})();
