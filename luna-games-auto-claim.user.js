// ==UserScript==
// @name         Auto Claim, Redeem & Loop Luna Games
// @namespace    https://luna.amazon.com/
// @version      1.5
// @description  Claims games, opens redemption links in the background, and returns to catalog.
// @match        https://luna.amazon.com/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let redirectTimer = null;
    let codeClaimed = false;

    function isVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function findElementByText(targetText, exact = false) {
        const candidates = document.querySelectorAll('button, a, [role="button"], span, div, h1, h2');
        const target = targetText.toLowerCase();

        for (const el of candidates) {
            if (!isVisible(el) || el.dataset.autoClicked) continue;

            const cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const matches = exact ? cleanText === target : cleanText.includes(target);

            if (matches) {
                return el.closest('button, a, [role="button"]') || el;
            }
        }
        return null;
    }

    function findClaimCodeElement() {
        // 1. Direct link detection (e.g. GOG / external redemption URLs)
        const directLink = document.querySelector('a[href*="gog.com"], a[href*="redeem"], a[href*="claim"]');
        if (directLink && isVisible(directLink) && !directLink.dataset.autoClicked) {
            return directLink;
        }

        // 2. Fuzzy text detection for "claim code", "redeem code", etc.
        const codeElement = findElementByText('claim code', false) || findElementByText('redeem code', false);
        if (codeElement && !codeElement.dataset.autoClicked) {
            return codeElement;
        }

        return null;
    }

    function handleSuccessView() {
        const claimCodeEl = findClaimCodeElement();

        if (claimCodeEl && !codeClaimed) {
            codeClaimed = true;
            claimCodeEl.dataset.autoClicked = 'true';

            if (redirectTimer) {
                clearTimeout(redirectTimer);
            }

            const anchor = claimCodeEl.tagName.toLowerCase() === 'a'
                ? claimCodeEl
                : (claimCodeEl.closest('a') || claimCodeEl.querySelector('a'));

            if (anchor && anchor.href) {
                GM_openInTab(anchor.href, { active: false, insert: true });
            } else {
                claimCodeEl.click();
            }

            // Redirect back shortly after opening the code tab
            setTimeout(() => {
                window.location.href = 'https://luna.amazon.com/claims';
            }, 1500);
            return;
        }

        // Fallback: If no code button appears after 3.5s (e.g., game claimed directly), navigate back
        if (!redirectTimer && !codeClaimed) {
            redirectTimer = setTimeout(() => {
                window.location.href = 'https://luna.amazon.com/claims';
            }, 3500);
        }
    }

    function processPage() {
        const path = window.location.pathname;
        const isSuccessPage = path.includes('/details') || !!findElementByText('Success,', false) || !!findElementByText('Game Claimed', false);
        const isProductPage = path.includes('/dp/') && !isSuccessPage;
        const isCatalogPage = !path.includes('/dp/') && !isSuccessPage;

        // 1. Success / Details View
        if (isSuccessPage) {
            handleSuccessView();
            return;
        }

        // 2. Product Detail View
        if (isProductPage) {
            const getGameBtn = findElementByText('Get game', true);
            if (getGameBtn && !getGameBtn.disabled && !getGameBtn.dataset.autoClicked) {
                getGameBtn.dataset.autoClicked = 'true';
                getGameBtn.click();
            }
            return;
        }

        // 3. Claims Catalog View
        if (isCatalogPage) {
            const claimGameBtn = findElementByText('Claim game', true);
            if (claimGameBtn && !claimGameBtn.disabled && !claimGameBtn.dataset.autoClicked) {
                claimGameBtn.dataset.autoClicked = 'true';
                claimGameBtn.click();
            }
        }
    }

    processPage();

    const observer = new MutationObserver(() => {
        processPage();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
