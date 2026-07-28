// ==UserScript==
// @name         Bob Shop 1-Click Direct Category Report (Card View)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Adds a 1-click quick report button directly on product cards during category/search browsing on Bob Shop.
// @match        https://www.bobshop.co.za/*
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/bobshop-category-reporter.user.js
// @downloadURL  https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/bobshop-category-reporter.user.js
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'bobshop_report_email';
    let userEmail = localStorage.getItem(STORAGE_KEY) || '';

    function promptForEmail() {
        const input = prompt('Enter your Bob Shop email address for reports:', userEmail);
        if (input) {
            userEmail = input.trim();
            localStorage.setItem(STORAGE_KEY, userEmail);
            alert('Email updated to: ' + userEmail);
        }
    }

    GM_registerMenuCommand('Change Report Email', promptForEmail);

    // Extract Trade ID from Bob Shop product URLs (/p/123456789 or Trade_TradeId=123456789)
    function extractTradeId(urlStr) {
        if (!urlStr) return null;
        const match = urlStr.match(/(?:\/p\/|Trade_TradeId=|\/item\/)(\d+)/i);
        return match ? match[1] : null;
    }

    // Submit report via background POST request
    async function submitReport(tradeId, btnElement) {
        if (!userEmail) {
            promptForEmail();
            if (!userEmail) return;
        }

        btnElement.innerText = '⏳ Reporting...';
        btnElement.style.pointerEvents = 'none';
        btnElement.style.opacity = '0.7';

        const bodyData = new URLSearchParams({
            'from': userEmail,
            'Trade_TradeId': tradeId,
            'message2': '\u00A0null',
            'message3': '\u00A0null',
            'example': 'Item is listed in the wrong/multiple categories',
            'message1': ''
        });

        try {
            const response = await fetch('https://www.bobshop.co.za/jsp/email/EmailFraudWatch.jsp', {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                body: bodyData.toString(),
                credentials: 'include'
            });

            if (response.ok) {
                btnElement.innerText = '✅ Reported!';
                btnElement.style.backgroundColor = '#28a745';
                btnElement.style.color = '#ffffff';
                btnElement.style.opacity = '1';
            } else {
                btnElement.innerText = `❌ Error (${response.status})`;
                btnElement.style.backgroundColor = '#dc3545';
                btnElement.style.color = '#ffffff';
                btnElement.style.pointerEvents = 'auto';
                btnElement.style.opacity = '1';
            }
        } catch (err) {
            console.error('Report submission failed:', err);
            btnElement.innerText = '❌ Network Error';
            btnElement.style.backgroundColor = '#dc3545';
            btnElement.style.color = '#ffffff';
            btnElement.style.pointerEvents = 'auto';
            btnElement.style.opacity = '1';
        }
    }

    // Scan page for product cards and attach report buttons
    function attachButtonsToCards() {
        const productLinks = document.querySelectorAll('a[href*="/p/"], a[href*="Trade_TradeId="]');

        productLinks.forEach(link => {
            const tradeId = extractTradeId(link.href);
            if (!tradeId) return;

            // Locate product card wrapper
            const card = link.closest('[class*="card"], [class*="item"], [class*="product"], [class*="trade"], .grid-item') || link.parentElement;
            if (!card || card.dataset.quickReportAdded) return;

            card.dataset.quickReportAdded = 'true';

            // Create report button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-report-card-btn';
            btn.innerText = '⚡ Report Category';
            btn.style.cssText = `
                display: block;
                width: calc(100% - 16px);
                margin: 6px 8px 10px 8px;
                padding: 6px 10px;
                background-color: #dc3545;
                color: #ffffff;
                font-weight: bold;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-align: center;
                transition: background 0.2s ease;
                z-index: 10;
            `;

            btn.addEventListener('mouseenter', () => {
                if (!btn.innerText.includes('Reported')) btn.style.backgroundColor = '#bd2130';
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.innerText.includes('Reported')) btn.style.backgroundColor = '#dc3545';
            });

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                submitReport(tradeId, btn);
            });

            card.appendChild(btn);
        });
    }

    attachButtonsToCards();
    const observer = new MutationObserver(attachButtonsToCards);
    observer.observe(document.body, { childList: true, subtree: true });
})();
