// ==UserScript==
// @name         BushCamp Deals — Unlock & Unblur
// @namespace    bushcamp-deals-unlock
// @version      1.0.0
// @description  Unblur deal images, strip "Join to view" locks, and reconstruct Amazon/Takealot buy links on BushCamp (bushcamp.co.za) without logging in.
// @author       you
// @match        https://bushcamp.co.za/*
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/bushcamp-deals-unlock.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/bushcamp-deals-unlock.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    /* ---------- helpers ---------- */

    const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));

    // Walk visible text nodes (skipping <script>/<style> bodies) whose trimmed
    // content matches `regex`. Regex must NOT use the /g flag.
    function walkText(regex) {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                    return NodeFilter.FILTER_REJECT;
                }
                const text = (node.nodeValue || '').trim();
                return text && regex.test(text)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });
        let node;
        while ((node = walker.nextNode())) out.push(node);
        return out;
    }

    /* ---------- 1. unblur deal images ---------- */

    // Logged-out deal thumbnails carry an inline `filter: blur(14px)`; the
    // underlying Cloudinary image is public, so removing the filter reveals it.
    function unblurImages() {
        document.querySelectorAll('img').forEach((img) => {
            if (img.style.filter && img.style.filter.includes('blur')) {
                img.style.filter = 'none';
            }
        });
    }

    /* ---------- 2. strip "Join to view" locks ---------- */

    // Walk up from the lock text and remove the dimming overlay (an
    // absolutely-positioned container with a dark rgba backdrop), which
    // reveals the product image underneath. Falls back to the innermost
    // absolute ancestor, or the element itself.
    function removeLockOverlay(el) {
        let node = el;
        let lastAbsolute = null;
        for (let i = 0; i < 5 && node && node !== document.body; i++) {
            const isAbsolute = node.classList && node.classList.contains('absolute');
            if (isAbsolute) {
                lastAbsolute = node;
                const styleAttr = node.getAttribute('style') || '';
                if (styleAttr.includes('rgba(0,0,0')) {
                    node.remove();
                    return;
                }
            }
            node = node.parentElement;
        }
        (lastAbsolute || el).remove();
    }

    function removeJoinToViewLocks() {
        walkText(/Join to view/i).forEach((textNode) => {
            const el = textNode.parentElement;
            if (el) removeLockOverlay(el);
        });
    }

    /* ---------- 3. reconstruct the buy link (deal detail page) ---------- */

    // The product ID rides in the Cloudinary deal-image filename:
    //   .../bushcamp/deals/takealot_100562166.jpg
    //   .../bushcamp/deals/amazon_B0CCRRTS4R.jpg
    const ID_RE = /(takealot|amazon)_([A-Za-z0-9]+)\.(?:jpe?g|png|webp)/i;

    function detectProduct() {
        const imgs = Array.from(document.querySelectorAll('img[src*="bushcamp/deals"]'));
        const img = imgs.find((i) => ID_RE.test(i.src));
        if (!img) return null;
        const match = ID_RE.exec(img.src);
        const h1 = document.querySelector('h1');
        return {
            source: match[1].toLowerCase(),
            id: match[2],
            title: (h1 ? h1.textContent.trim() : '') || img.alt || match[2]
        };
    }

    function buildBuyLink(product) {
        if (product.source === 'amazon') {
            // ASIN maps 1:1 to the canonical product page (verified working on
            // amazon.co.za).
            return 'https://www.amazon.co.za/dp/' + encodeURIComponent(product.id);
        }
        if (product.source === 'takealot') {
            // The numeric ID alone does not form a valid direct URL, so fall
            // back to a Takealot site search for the title (best-effort).
            return 'https://www.takealot.com/all?search=' + encodeURIComponent(product.title);
        }
        return null;
    }

    // Swap every "Join free to get the link" lock for a working link. Runs
    // before lock-overlay stripping so the two lock types never collide.
    function unlockBuyLinks() {
        const product = detectProduct();
        if (!product) return;
        const link = buildBuyLink(product);
        if (!link) return;

        walkText(/get the link/i).forEach((textNode) => {
            const holder = textNode.parentElement;
            if (!holder) return;
            const el = holder.closest('a, button') || holder;
            if (el.dataset.bcUnlocked || !/get the link/i.test(el.textContent || '')) return;

            const label = product.source === 'amazon' ? 'View on Amazon' : 'View on Takealot';
            const a = document.createElement('a');
            a.href = link;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = el.className || '';
            a.setAttribute('style', (el.getAttribute('style') || '') + '; cursor: pointer;');
            a.textContent = label + ' ↗';
            a.title = 'Reconstructed from product ID (' + product.source + '), not the member link';
            a.dataset.bcUnlocked = '1';
            el.replaceWith(a);
        });
    }

    /* ---------- main ---------- */

    function unlock() {
        unblurImages();
        unlockBuyLinks();
        removeJoinToViewLocks();
    }

    // CSS-level unblur so any image blurred after this script runs (or missed
    // by the DOM pass) is covered instantly.
    const style = document.createElement('style');
    style.textContent = 'img[style*="blur"] { filter: none !important; }';
    document.head.appendChild(style);

    unlock();

    // SvelteKit navigates client-side (pagination, list <-> detail, filters),
    // so re-run the unlock whenever the DOM changes, throttled to one pass per
    // animation frame. Once all locks are cleared the routine mutates nothing,
    // so the observer settles by itself.
    let scheduled = false;
    function scheduleUnlock() {
        if (scheduled) return;
        scheduled = true;
        raf(() => {
            scheduled = false;
            unlock();
        });
    }
    new MutationObserver(scheduleUnlock).observe(document.body, { childList: true, subtree: true });
})();
