// ==UserScript==
// @name         Amazon Price Filter Inputs
// @namespace    https://amazon.com/
// @version      1.3
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

  function isInsideProductOrDealCard(el) {
    return Boolean(
      el.closest(
        '[data-asin], [data-component-type="s-search-result"], [data-testid*="deal-card" i], [data-testid*="product-card" i], [data-testid="grid-deals-container"], .s-result-item, a, button'
      )
    );
  }

  function hasFilterControl(el) {
    if (!el) return false;
    return Boolean(
      el.querySelector(
        'input[type="range"], [role="slider"], [class*="slider" i], [id*="slider" i], a[href*="low-price="], a[href*="p_36"]'
      )
    );
  }

  function climbToFilterSection(startEl) {
    let curr = startEl;
    for (let depth = 0; depth < 5 && curr && curr.parentElement; depth++) {
      if (hasFilterControl(curr) && !/^price$/i.test(curr.textContent.trim())) {
        return curr;
      }
      const parent = curr.parentElement;
      if (isInsideProductOrDealCard(parent)) break;
      // Stop before climbing into a shared sidebar parent that holds multiple sliders (e.g. Price + Discount)
      if (parent.querySelectorAll('input[type="range"]').length > 2) {
        break;
      }
      curr = parent;
    }
    return hasFilterControl(curr) ? curr : null;
  }

  function findPriceHeading(root = document) {
    const scope = document.getElementById('s-refinements') || root;
    const headings = scope.querySelectorAll('span, h2, h3, h4, div, label');
    for (const heading of headings) {
      if (
        heading.children.length === 0 &&
        /^price$/i.test(heading.textContent.trim()) &&
        !isInsideProductOrDealCard(heading)
      ) {
        const section = climbToFilterSection(heading);
        if (section) return { heading, section };
      }
    }
    return null;
  }

  function findPriceSection() {
    // 1. Direct ID / attribute matches strictly inside refinement sidebars
    const directMatch = document.querySelector(
      '#priceRefinements, #s-refinements [id="p_36"], #s-refinements [id*="p_36"], #s-refinements [data-filter-id="p_36"]'
    );
    if (directMatch && !isInsideProductOrDealCard(directMatch)) {
      const base = directMatch.closest('.a-section') || directMatch;
      return climbToFilterSection(base) || base;
    }

    // 2. Locate section via the "Price" heading text that encloses a slider or refinement links
    const matched = findPriceHeading();
    if (matched) {
      return matched.section;
    }

    // 3. Fallback: find any sidebar block holding price-related filter links
    const container = document.getElementById('s-refinements') || document;
    const priceLinks = container.querySelectorAll('a[href*="low-price="], a[href*="p_36"]');
    for (const priceLink of priceLinks) {
      if (!isInsideProductOrDealCard(priceLink)) {
        return priceLink.closest('.a-section') || priceLink.parentElement;
      }
    }

    return null;
  }

  function getLowestCommonAncestor(nodes) {
    if (!nodes.length) return null;
    let lca = nodes[0];
    for (let i = 1; i < nodes.length; i++) {
      while (lca && !lca.contains(nodes[i])) {
        lca = lca.parentElement;
      }
    }
    return lca;
  }

  function findSliderElement(section) {
    if (!section) return null;

    // 1. Check known dedicated outer slider containers first
    const knownContainer = section.querySelector(
      '#p_36\\/range-slider, .s-range-slider-container, .a-slider-container, .s-slider-container, [class*="slider-container" i], [class*="sliderContainer" i], [class*="rangeSlider" i]'
    );
    if (knownContainer && section.contains(knownContainer)) {
      return knownContainer;
    }

    // 2. Gather all slider inputs, thumbs, and slider-tagged elements in the section
    const sliderNodes = Array.from(
      section.querySelectorAll('input[type="range"], [role="slider"], [class*="slider" i], [id*="slider" i]')
    );
    if (!sliderNodes.length) return null;

    let sliderBox = getLowestCommonAncestor(sliderNodes);
    if (!sliderBox) return null;

    if (
      sliderBox.tagName === 'INPUT' ||
      sliderBox.getAttribute('role') === 'slider'
    ) {
      sliderBox = sliderBox.parentElement;
    }

    // Climb up through inner track/thumb positioning wrappers that contain no extra text or links
    while (
      sliderBox &&
      sliderBox.parentElement &&
      sliderBox.parentElement !== section &&
      section.contains(sliderBox.parentElement) &&
      !sliderBox.parentElement.querySelector('a[href]') &&
      sliderBox.parentElement.textContent.trim() === sliderBox.textContent.trim()
    ) {
      sliderBox = sliderBox.parentElement;
    }

    return sliderBox && sliderBox !== section ? sliderBox : null;
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
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      margin: 8px 0 !important;
      padding: 0 !important;
      font-size: 13px !important;
      line-height: 1 !important;
    `;

    const inputStyles = `
      width: 58px !important;
      height: 28px !important;
      margin: 0 !important;
      padding: 3px 6px !important;
      border: 1px solid #888 !important;
      border-radius: 4px !important;
      font-size: 13px !important;
      line-height: 20px !important;
      box-sizing: border-box !important;
      background: #fff !important;
      color: #0f1111 !important;
    `;

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.value = min;
    minInput.step = 'any';
    minInput.style.cssText = inputStyles;

    const separator = document.createElement('span');
    separator.textContent = '–';
    separator.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1 !important;
    `;

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.value = max;
    maxInput.step = 'any';
    maxInput.style.cssText = inputStyles;

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.type = 'button';
    goBtn.style.cssText = `
      height: 28px !important;
      margin: 0 !important;
      padding: 0 10px !important;
      background: #ffd814 !important;
      border: 1px solid #fcd200 !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      line-height: 26px !important;
      box-sizing: border-box !important;
      color: #0f1111 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
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
      sliderElement.style.setProperty('display', 'none', 'important');
      priceSection
        .querySelectorAll('input[type="range"], [role="slider"]')
        .forEach((el) => el.style.setProperty('display', 'none', 'important'));
      sliderElement.parentNode.insertBefore(container, sliderElement);
    } else {
      let headerBlock = priceSection.querySelector('span, h2, h3');
      if (headerBlock) {
        while (
          headerBlock.parentElement &&
          headerBlock.parentElement !== priceSection &&
          /^price$/i.test(headerBlock.parentElement.textContent.trim())
        ) {
          headerBlock = headerBlock.parentElement;
        }
        headerBlock.after(container);
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
