// ==UserScript==
// @name         Amazon Price Filter Inputs
// @namespace    https://amazon.com/
// @version      1.0
// @description  Replaces the Amazon price slider with min/max input boxes and a submit button.
// @author       You
// @match        https://*.amazon.com/*
// @match        https://*.amazon.co.za/*
// @match        https://*.amazon.co.uk/*
// @match        https://*.amazon.de/*
// @match        https://*.amazon.fr/*
// @match        https://*.amazon.it/*
// @match        https://*.amazon.es/*
// @match        https://*.amazon.ca/*
// @match        https://*.amazon.com.au/*
// @match        https://*.amazon.in/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/amazon-price-filter-inputs.user.js
// @downloadURL  https://github.com/chickenbeef/greasemonkeys/raw/refs/heads/main/amazon-price-filter-inputs.user.js
// ==/UserScript==

(function () {
  'use strict';

  function parseCurrentPrices() {
    const params = new URLSearchParams(window.location.search);
    let min = '';
    let max = '';

    const rh = params.get('rh') || '';
    const match = rh.match(/p_36:([0-9]*)-([0-9]*)/);

    if (match) {
      if (match[1]) min = (parseInt(match[1], 10) / 100).toString();
      if (match[2]) max = (parseInt(match[2], 10) / 100).toString();
    } else {
      min = params.get('low-price') || '';
      max = params.get('high-price') || '';
    }

    return { min, max };
  }

  function applyPriceFilter(minVal, maxVal) {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const minCents = minVal ? Math.round(parseFloat(minVal) * 100) : '';
    const maxCents = maxVal ? Math.round(parseFloat(maxVal) * 100) : '';

    let rh = params.get('rh') || '';
    let rhParts = rh ? rh.split(',').filter(part => !part.startsWith('p_36:')) : [];

    if (minCents !== '' || maxCents !== '') {
      rhParts.push(`p_36:${minCents}-${maxCents}`);
      params.set('rh', rhParts.join(','));
    } else if (rhParts.length > 0) {
      params.set('rh', rhParts.join(','));
    } else {
      params.delete('rh');
    }

    // Clean up alternative params and pagination
    params.delete('low-price');
    params.delete('high-price');
    params.delete('page');

    window.location.href = url.toString();
  }

  function createInputUI() {
    if (document.getElementById('custom-price-filter-container')) return;

    // Locate Amazon's price refinement section or slider container
    const sliderContainer = document.querySelector('.a-slider-container') ||
      document.querySelector('[id*="p_36_range"]') ||
      document.querySelector('li[id*="p_36"]');

    const priceSection = sliderContainer?.closest('ul') ||
      document.querySelector('#priceRefinements') ||
      document.querySelector('#s-refinements div[aria-labelledby*="p_36"]') ||
      sliderContainer?.parentElement;

    if (!priceSection) return;

    const { min, max } = parseCurrentPrices();

    const container = document.createElement('div');
    container.id = 'custom-price-filter-container';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 10px 0;
      font-size: 13px;
    `;

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.value = min;
    minInput.style.cssText = `
      width: 65px;
      padding: 4px 6px;
      border: 1px solid #888;
      border-radius: 4px;
      font-size: 13px;
    `;

    const separator = document.createElement('span');
    separator.textContent = '–';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.value = max;
    maxInput.style.cssText = `
      width: 65px;
      padding: 4px 6px;
      border: 1px solid #888;
      border-radius: 4px;
      font-size: 13px;
    `;

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.type = 'button';
    goBtn.style.cssText = `
      padding: 4px 10px;
      background: #ffd814;
      border: 1px solid #fcd200;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    `;

    const triggerSubmit = () => {
      applyPriceFilter(minInput.value.trim(), maxInput.value.trim());
    };

    goBtn.addEventListener('click', triggerSubmit);
    minInput.addEventListener('keydown', (e) => e.key === 'Enter' && triggerSubmit());
    maxInput.addEventListener('keydown', (e) => e.key === 'Enter' && triggerSubmit());

    container.appendChild(minInput);
    container.appendChild(separator);
    container.appendChild(maxInput);
    container.appendChild(goBtn);

    // Hide slider if present and inject the input container
    if (sliderContainer) {
      sliderContainer.style.display = 'none';
      sliderContainer.parentNode.insertBefore(container, sliderContainer);
    } else {
      priceSection.prepend(container);
    }
  }

  createInputUI();

  // Watch for dynamic DOM re-renders during filter updates
  const observer = new MutationObserver(() => {
    if (!document.getElementById('custom-price-filter-container')) {
      createInputUI();
    }
  });

  const targetNode = document.getElementById('s-refinements') || document.body;
  observer.observe(targetNode, { childList: true, subtree: true });
})();
