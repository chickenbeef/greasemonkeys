// ==UserScript==
// @name         Car Specs SA - Arial Font
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Forces the font to Arial for improved readability.
// @author       You
// @match        *://*.car-specs.za.net/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const css = `
        * {
            font-family: Arial, Helvetica, sans-serif !important;
        }
    `;

    if (typeof GM_addStyle !== "undefined") {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }
})();
