// ==UserScript==
// @name         AutoRefresh eBucks
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Auto refresh eBucks page
// @author       Iftekhar
// @match        https://www.ebucks.com/web/shop/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=a2z.com
// @update       https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/ebucksReload.js
// @grant        none
// ==/UserScript==

(function() {
    var currentdate = new Date();
    var datetime = "Last Load: " + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
    console.log(datetime);
    setTimeout(function(){ location.reload(); }, 120*1000);
})();
