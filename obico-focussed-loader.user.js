// ==UserScript==
// @name         ObicoFocussedFeedback
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Starts Focussed Feedback
// @author       iftekhar
// @match        https://app.obico.io/prints/*
// @grant        none
// ==/UserScript==


LoadIt()

function LoadIt()
{
    try {
        if(document.getElementsByClassName('custom-control-input')[0]){
            document.getElementsByClassName('custom-control-input')[0].click();
        }
        setTimeout(1000);
        if(document.getElementsByClassName('btn btn-primary btn-block')[0]){
            document.getElementsByClassName('btn btn-primary btn-block')[0].click();
        }
        setTimeout(2000);
        if(document.getElementsByClassName('btn btn-outline-primary btn-sm')[0]){
            document.getElementsByClassName('btn btn-outline-primary btn-sm')[0].click();
        }

    }
    catch (e){
    }

}


