// ==UserScript==
// @name         eBucks 40%
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Highlight 40% eBucks discounts
// @author       You
// @match        https://www.ebucks.com/web/shop/categorySelected.do?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ebucks.com
// @grant        none
// ==/UserScript==

setTimeout(highlightWord, 3000);
// Wait for slow 40% off to load
setTimeout(highlightWord, 10000);

function highlightWord() {
    console.log("Highlighting");
    document.body.innerHTML = document.body.innerHTML.replace(/You get up to 40% off/g, function(m){
        return '<span style="background-color:yellow">'+m+'</span>'
    });
    document.body.innerHTML = document.body.innerHTML.replace(/Get up to 40% off/g, function(m){
        return '<span style="background-color:yellow">'+m+'</span>'
    });
}


