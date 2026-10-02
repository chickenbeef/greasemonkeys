// ==UserScript==
// @name         Amazon.co.za - Always Enable Amazon Seller Filter
// @namespace    https://amazon.co.za/
// @version      1.1
// @description  Restores the "Amazon.co.za" seller filter on search and browse pages where Amazon omits it.
// @match        https://www.amazon.co.za/s*
// @match        https://www.amazon.co.za/b*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'amazon_za_seller_id';

    function getStoredSellerId() {
        return (typeof GM_getValue !== 'undefined' ? GM_getValue(STORAGE_KEY) : null) ||
               localStorage.getItem(STORAGE_KEY);
    }

    function saveSellerId(id) {
        if (!id) return;
        if (typeof GM_setValue !== 'undefined') GM_setValue(STORAGE_KEY, id);
        localStorage.setItem(STORAGE_KEY, id);
    }

    // Attempt to scrape the Seller ID if the native filter exists on the current page
    function harvestSellerIdFromDOM() {
        // 1. Check native refinement links matching "Amazon.co.za"
        const links = document.querySelectorAll('#s-refinements a, #filters a');
        for (const a of links) {
            const text = a.textContent.trim();
            if (text.includes('Amazon.co.za') && !text.includes('App')) {
                const match = a.href.match(/p_6(?:%3A|:)([A-Z0-9]+)/i);
                if (match) return match[1];
            }
        }

        // 2. Check list items under refinements
        const lis = document.querySelectorAll('#s-refinements li[id^="p_6/"]');
        for (const li of lis) {
            if (li.textContent.includes('Amazon.co.za')) {
                const parts = li.id.split('/');
                if (parts[1]) return parts[1];
            }
        }
        return null;
    }

    // Background harvest fallback if no ID has been cached yet
    async function fetchSellerId() {
        try {
            const res = await fetch('/s?k=Herschell&rh=n%3A27125177031');
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('#s-refinements a');
            for (const a of links) {
                if (a.textContent.includes('Amazon.co.za')) {
                    const match = a.href.match(/p_6(?:%3A|:)([A-Z0-9]+)/i);
                    if (match) return match[1];
                }
            }
        } catch {
            // Silently continue if network fails
        }
        return null;
    }

    function isFilterActive(sellerId) {
        const url = new URL(window.location.href);
        const rh = url.searchParams.get('rh') || '';
        const emi = url.searchParams.get('emi') || '';

        if (sellerId) {
            const pattern = new RegExp(`p_6(?:%3A|:)${sellerId}`, 'i');
            return pattern.test(rh) || emi.toLowerCase() === sellerId.toLowerCase();
        }
        return /p_6(?:%3A|:)/i.test(rh);
    }

    async function toggleFilter() {
        let sellerId = getStoredSellerId();
        if (!sellerId) {
            sellerId = await fetchSellerId();
            if (sellerId) saveSellerId(sellerId);
        }

        if (!sellerId) {
            alert('Amazon.co.za Seller ID not found. Visit a category page with the Seller filter visible once to cache it.');
            return;
        }

        const url = new URL(window.location.href);
        let rh = url.searchParams.get('rh') || '';
        const isActive = isFilterActive(sellerId);

        if (isActive) {
            // Remove seller filter
            const removeRegex = new RegExp(`(?:%2C|,)?p_6(?:%3A|:)[^,&]+`, 'ig');
            rh = rh.replace(removeRegex, '').replace(/^[,%2C]+|[,%2C]+$/g, '');
            if (rh) {
                url.searchParams.set('rh', rh);
            } else {
                url.searchParams.delete('rh');
            }
            url.searchParams.delete('emi');
        } else {
            // Append seller filter
            if (rh) {
                rh = `${rh},p_6:${sellerId}`;
            } else {
                rh = `p_6:${sellerId}`;
            }
            url.searchParams.set('rh', rh);
        }

        url.searchParams.delete('page'); // Reset pagination to page 1
        window.location.href = url.toString();
    }

    function injectTopBarToggle(isActive) {
        if (document.getElementById('custom-amazon-seller-toggle')) return;

        const target = document.querySelector('.s-desktop-top-toolbar, #search, .s-result-list');
        if (!target) return;

        const container = document.createElement('div');
        container.id = 'custom-amazon-seller-toggle';
        container.style.cssText = 'margin: 6px 10px; display: inline-block; vertical-align: middle; z-index: 100;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = isActive ? '✓ Sold by Amazon.co.za' : '+ Seller: Amazon.co.za';
        btn.style.cssText = `
            cursor: pointer;
            padding: 5px 12px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            border: 1px solid ${isActive ? '#007185' : '#d5d9d9'};
            background-color: ${isActive ? '#e7f4f5' : '#ffffff'};
            color: ${isActive ? '#007185' : '#0f1111'};
            box-shadow: 0 1px 2px rgba(15,17,17,0.15);
        `;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFilter();
        });

        container.appendChild(btn);

        const toolbar = document.querySelector('.s-desktop-top-toolbar');
        if (toolbar) {
            toolbar.prepend(container);
        } else {
            const main = document.querySelector('#search');
            if (main) main.prepend(container);
        }
    }

    function injectSidebarFilter(isActive) {
        const sidebar = document.querySelector('#s-refinements');
        if (!sidebar || document.getElementById('custom-sidebar-seller-section')) return;

        // Verify if a native Seller group already contains "Amazon.co.za"
        const existingLabels = sidebar.querySelectorAll('span');
        for (const span of existingLabels) {
            if (span.textContent.trim() === 'Amazon.co.za') {
                return; // Native option is already present on this page
            }
        }

        const section = document.createElement('div');
        section.id = 'custom-sidebar-seller-section';
        section.className = 'a-section a-spacing-none';
        section.innerHTML = `
            <span class="a-size-base a-color-base puis-bold-weight-text">Seller</span>
            <ul class="a-unordered-list a-nostyle a-vertical a-spacing-medium" style="margin-top: 5px;">
                <li class="a-spacing-micro">
                    <span class="a-list-item">
                        <a class="a-link-normal s-navigation-item" href="javascript:void(0)" style="display: flex; align-items: center; text-decoration: none;">
                            <input type="checkbox" ${isActive ? 'checked' : ''} style="margin-right: 8px; cursor: pointer;">
                            <span class="a-size-base a-color-base ${isActive ? 'puis-bold-weight-text' : ''}">Amazon.co.za</span>
                        </a>
                    </span>
                </li>
            </ul>
        `;

        section.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            toggleFilter();
        });

        sidebar.appendChild(section);
    }

    function init() {
        const detectedId = harvestSellerIdFromDOM();
        if (detectedId) {
            saveSellerId(detectedId);
        }

        const sellerId = getStoredSellerId();
        const active = isFilterActive(sellerId);

        injectTopBarToggle(active);
        injectSidebarFilter(active);
    }

    init();

    // Re-check on dynamic page updates / navigation
    const observer = new MutationObserver(() => {
        const sellerId = getStoredSellerId();
        const active = isFilterActive(sellerId);
        injectTopBarToggle(active);
        injectSidebarFilter(active);
    });

    const rootTarget = document.querySelector('#search') || document.body;
    if (rootTarget) {
        observer.observe(rootTarget, { childList: true, subtree: true });
    }
})();
