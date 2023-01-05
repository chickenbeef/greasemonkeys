// ==UserScript==
// @name         TakealotMore
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Clicks the Load More button on Takealot
// @author       iftekhar
// @match        https://www.takealot.com/seller/*
// @grant        none
// ==/UserScript==


var Timeout = 15000; //in milliseconds
setInterval(function() {LoadIt();}, Timeout); //Script runs every time period as per the Timeout variable

function LoadIt()
{
    LoadMore();
}

function LoadMore()
{
    try {
        if(document.getElementsByClassName('button ghost search-listings-module_load-more_OwyvW')[0]){
            document.getElementsByClassName('button ghost search-listings-module_load-more_OwyvW')[0].click();
        }
    }
    catch (e){
    }

}
