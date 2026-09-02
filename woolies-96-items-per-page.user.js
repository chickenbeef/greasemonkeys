// ==UserScript==
// @name         Woolworths SA - 96 Items Per Page
// @namespace    https://www.woolworths.co.za/
// @version      2.0
// @description  Intercepts Constructor.io catalog requests to display 96 items per page on Woolworths South Africa.
// @author       Assistant
// @match        https://www.woolworths.co.za/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TARGET_ITEMS = 96;

    function rewriteUrl(rawUrl) {
        if (typeof rawUrl !== 'string') return rawUrl;
        if (rawUrl.includes('cnstrc.com') && rawUrl.includes('num_results_per_page=')) {
            return rawUrl.replace(/([?&])num_results_per_page=\d+/, `$1num_results_per_page=${TARGET_ITEMS}`);
        }
        return rawUrl;
    }

    // Intercept Fetch API
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string') {
            input = rewriteUrl(input);
        } else if (input instanceof Request) {
            const rewritten = rewriteUrl(input.url);
            if (rewritten !== input.url) {
                input = new Request(rewritten, input);
            }
        } else if (input instanceof URL) {
            input = new URL(rewriteUrl(input.toString()));
        }
        return originalFetch.call(this, input, init);
    };

    // Intercept XMLHttpRequest fallback
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (typeof url === 'string') {
            url = rewriteUrl(url);
        }
        return originalOpen.call(this, method, url, ...rest);
    };
})();
