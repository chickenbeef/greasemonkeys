// ==UserScript==
// @name         Amazon Price Filter Inputs
// @namespace    https://amazon.com/
// @version      1.1
// @description  Replaces the Amazon price slider with min/max input boxes and a submit button.
// @author       chickenbeef
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
// @updateURL    https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/amazon-price-filter-inputs.user.js
// @downloadURL  https://raw.githubusercontent.com/chickenbeef/greasemonkeys/main/amazon-price-filter-inputs.user.js
// ==/UserScript==

(function () {
  'use strict';

  function parseCurrentPrices() {
    const params = new URLSearchParams(window.location.search);
    let min = params.get('low-price') || '';
    let max = params.get('high-price') || '';

    // Fallback if URL still uses legacy p_36 cents format in rh
    if (!min && !max) {
      const rh = params.get('rh') || '';
      const match = rh.match(/p_36:([0-9]*)-([0-9]*)/);
      if (match) {
        if (match[1]) min = (parseInt(match[1], 10) / 100).toString();
        if (match[2]) max = (parseInt(match[2], 10) / 100).toString();
      }
    }

    return { min, max };
  }

  function applyPriceFilter(minVal, maxVal) {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Apply native Amazon low-price and high-price parameters
    if (minVal !== '') {
      params.set('low-price', minVal);
    } else {
      params.delete('low-price');
    }

    if (maxVal !== '') {
      params.set('high-price', maxVal);
    } else {
      params.delete('high-price');
    }

    // Strip legacy or preset p_36 filter from rh so it does not conflict
    const rh = params.get('rh') || '';
    if (rh) {
      const rhParts = rh.split(',').filter(part => !part.startsWith('p_36:'));
      if (rhParts.length > 0) {
        params.set('rh', rhParts.join(','));
      } else {
        params.delete('rh');
      }
    }

    // Reset pagination
    params.delete('page');

    window.location.href = url.toString();
  }

  function findPriceSection() {
    // 1. Direct ID / attribute matches
    const directMatch = document.querySelector(
      '#priceRefinements, #s-refinements [id="p_36"], #s-refinements [id*="p_36"], #s-refinements [data-filter-id="p_36"]'
    );
    if (directMatch) {
      return directMatch.closest('.a-section') || directMatch;
    }

    // 2. Locate section via the "Price" heading text inside the sidebar
    const container = document.getElementById('s-refinements') || document;
    const headings = container.querySelectorAll('span, h2, h3, div');
    for (const heading of headings) {
      if (heading.children.length === 0 && /^price$/i.test(heading.textContent.trim())) {
        return heading.closest('.a-section') || heading.parentElement;
      }
    }

    // 3. Fallback: find any block holding price-related links
    const priceLink = container.querySelector('a[href*="low-price="], a[href*="p_36"]');
    if (priceLink) {
      return priceLink.closest('.a-section') || priceLink.parentElement;
    }

    return null;
  }

  function findSliderElement(section) {
    if (!section) return null;
    const sliderThumb = section.querySelector('[role="slider"]');
    if (sliderThumb) {
      return sliderThumb.closest('.a-slider-container, .s-slider-container, [class*="slider"]') || sliderThumb.parentElement;
    }
    return section.querySelector('.a-slider-container, .s-slider-container, [class*="slider"], [id*="slider"]');
  }

  function createInputUI() {
    if (document.getElementById('custom-price-filter-container')) return;

    const priceSection = findPriceSection();
    if (!priceSection) return;

    const sliderElement = findSliderElement(priceSection);
    const { min, max } = parseCurrentPrices();

    const container = document.createElement('div');
    container.id = 'custom-price-filter-container';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 8px 0;
      font-size: 13px;
    `;

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.value = min;
    minInput.step = 'any';
    minInput.style.cssText = `
      width: 58px;
      padding: 3px 6px;
      border: 1px solid #888;
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    `;

    const separator = document.createElement('span');
    separator.textContent = '–';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.value = max;
    maxInput.step = 'any';
    maxInput.style.cssText = `
      width: 58px;
      padding: 3px 6px;
      border: 1px solid #888;
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    `;

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.type = 'button';
    goBtn.style.cssText = `
      padding: 3px 10px;
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

    if (sliderElement) {
      sliderElement.style.display = 'none';
      sliderElement.parentNode.insertBefore(container, sliderElement);
    } else {
      const header = priceSection.querySelector('span, h2, h3');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(container, header.nextSibling);
      } else {
        priceSection.prepend(container);
      }
    }
  }

  createInputUI();

  const observer = new MutationObserver(() => {
    if (!document.getElementById('custom-price-filter-container')) {
      createInputUI();
    }
  });

  const targetNode = document.getElementById('s-refinements') || document.body;
  observer.observe(targetNode, { childList: true, subtree: true });
})();
