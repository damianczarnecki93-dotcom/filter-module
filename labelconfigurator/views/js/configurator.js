document.addEventListener('DOMContentLoaded', () => {
    const rawDataEl = document.getElementById('json-data');
    const rawConfigEl = document.getElementById('config-data');
    if (!rawDataEl || !rawConfigEl) return;

    let products = [];
    let filtersConfig = [];

    try {
        products = JSON.parse(rawDataEl.textContent);
        filtersConfig = JSON.parse(rawConfigEl.textContent);
    } catch (e) {
        console.error("Failed to parse product or config JSON:", e);
        return;
    }

    // Element references
    const dynamicFiltersContainer = document.getElementById('dynamic-filters-container');
    const productListContainer = document.getElementById('product-list');
    const productCountBadge = document.getElementById('product-count');
    const noResultsMsg = document.getElementById('no-results');
    const btnResetAll = document.getElementById('btn-reset-all');

    // Sidebar references for mobile view
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    // Dynamic state trackers
    let filterStates = {};

    // Helper: parse numbers from string
    function parseNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const match = val.replace(',', '.').match(/(\d+(?:[.,]\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // Helper: parse dimension pair (e.g. "70x37" or "105 x 148 mm")
    function parseSizeSplit(val) {
        if (!val) return { w: 0, h: 0 };
        const match = val.replace(',', '.').match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
        if (match) {
            return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
        }
        // Fallback if it's just a single number
        const single = parseNumber(val);
        return { w: single, h: single };
    }

    // Helper: Build dynamic filters based on configuration
    function buildDynamicFilters() {
        dynamicFiltersContainer.innerHTML = '';
        filterStates = {};

        // Only process active configs
        const activeFilters = filtersConfig.filter(f => f.active);

        activeFilters.forEach(filter => {
            const fid = filter.id;
            const label = filter.label || 'Filtr';
            const type = filter.type;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';

            if (fid === 'price') {
                // Special Price Filter
                const prices = products.map(p => p.price || 0);
                const min = prices.length ? Math.min(...prices) : 0;
                const max = prices.length ? Math.max(...prices) : 0;

                filterStates[fid] = {
                    type: 'slider',
                    min: min,
                    max: max,
                    currentMin: min,
                    currentMax: max
                };

                groupDiv.innerHTML = `
                    <label>${label}:</label>
                    <div class="input-range-wrapper">
                        <input type="number" class="manual-input" id="val-price-min" value="${min.toFixed(2)}" min="${min}" step="0.01">
                        <span>-</span>
                        <input type="number" class="manual-input" id="val-price-max" value="${max.toFixed(2)}" min="${min}" step="0.01">
                    </div>
                    <div class="dual-slider">
                        <input type="range" id="min-price" value="${min}" min="${min}" max="${max}" step="0.01">
                        <input type="range" id="max-price" value="${max}" min="${min}" max="${max}" step="0.01">
                    </div>
                `;
                dynamicFiltersContainer.appendChild(groupDiv);
                setupSliderEvents('price', filterStates[fid], true);

            } else if (type === 'slider') {
                // Numeric slider for a feature
                const values = products.map(p => {
                    const featVal = p.features && p.features[fid];
                    return parseNumber(featVal);
                }).filter(v => v > 0);

                const min = values.length ? Math.min(...values) : 0;
                const max = values.length ? Math.max(...values) : 0;

                filterStates[fid] = {
                    type: 'slider',
                    min: min,
                    max: max,
                    currentMin: min,
                    currentMax: max,
                    featureId: fid
                };

                groupDiv.innerHTML = `
                    <label>${label}:</label>
                    <div class="input-range-wrapper">
                        <input type="number" class="manual-input" id="val-${fid}-min" value="${min}" min="${min}" step="1">
                        <span>-</span>
                        <input type="number" class="manual-input" id="val-${fid}-max" value="${max}" min="${min}" step="1">
                    </div>
                    <div class="dual-slider">
                        <input type="range" id="min-${fid}" value="${min}" min="${min}" max="${max}" step="1">
                        <input type="range" id="max-${fid}" value="${max}" min="${min}" max="${max}" step="1">
                    </div>
                `;
                dynamicFiltersContainer.appendChild(groupDiv);
                setupSliderEvents(fid, filterStates[fid], false);

            } else if (type === 'size_split') {
                // Width & Height dual slider split for a feature
                const widths = [];
                const heights = [];

                products.forEach(p => {
                    const featVal = p.features && p.features[fid];
                    if (featVal) {
                        const parsed = parseSizeSplit(featVal);
                        if (parsed.w > 0) widths.push(parsed.w);
                        if (parsed.h > 0) heights.push(parsed.h);
                    }
                });

                const minW = widths.length ? Math.min(...widths) : 0;
                const maxW = widths.length ? Math.max(...widths) : 0;
                const minH = heights.length ? Math.min(...heights) : 0;
                const maxH = heights.length ? Math.max(...heights) : 0;

                filterStates[fid] = {
                    type: 'size_split',
                    minW: minW,
                    maxW: maxW,
                    currentMinW: minW,
                    currentMaxW: maxW,
                    minH: minH,
                    maxH: maxH,
                    currentMinH: minH,
                    currentMaxH: maxH,
                    featureId: fid
                };

                groupDiv.innerHTML = `
                    <div class="filter-subgroup" style="margin-bottom: 20px;">
                        <label>${label} - Szerokość (mm):</label>
                        <div class="input-range-wrapper">
                            <input type="number" class="manual-input" id="val-${fid}-w-min" value="${minW}" min="${minW}">
                            <span>-</span>
                            <input type="number" class="manual-input" id="val-${fid}-w-max" value="${maxW}" min="${minW}">
                        </div>
                        <div class="dual-slider">
                            <input type="range" id="min-${fid}-w" value="${minW}" min="${minW}" max="${maxW}">
                            <input type="range" id="max-${fid}-w" value="${maxW}" min="${minW}" max="${maxW}">
                        </div>
                    </div>
                    <div class="filter-subgroup">
                        <label>${label} - Wysokość (mm):</label>
                        <div class="input-range-wrapper">
                            <input type="number" class="manual-input" id="val-${fid}-h-min" value="${minH}" min="${minH}">
                            <span>-</span>
                            <input type="number" class="manual-input" id="val-${fid}-h-max" value="${maxH}" min="${minH}">
                        </div>
                        <div class="dual-slider">
                            <input type="range" id="min-${fid}-h" value="${minH}" min="${minH}" max="${maxH}">
                            <input type="range" id="max-${fid}-h" value="${maxH}" min="${minH}" max="${maxH}">
                        </div>
                    </div>
                `;
                dynamicFiltersContainer.appendChild(groupDiv);
                setupSizeSplitEvents(fid, filterStates[fid]);

            } else if (type === 'checkboxes') {
                // Multi-select list of checkboxes
                const uniqueValues = [...new Set(products.map(p => {
                    return p.features && p.features[fid];
                }).filter(Boolean))].sort();

                filterStates[fid] = {
                    type: 'checkboxes',
                    selected: [],
                    featureId: fid
                };

                const checkboxesHtml = uniqueValues.map(val => `
                    <label class="filter-item">
                        <input type="checkbox" name="cb-${fid}" value="${val}">
                        ${val}
                    </label>
                `).join('');

                groupDiv.innerHTML = `
                    <label>${label}:</label>
                    <div class="checkbox-filter-list" id="cb-container-${fid}">
                        ${uniqueValues.length ? checkboxesHtml : '<div style="font-size:12px;color:#94a3b8;padding: 5px 0;">Brak opcji</div>'}
                    </div>
                `;
                dynamicFiltersContainer.appendChild(groupDiv);
                setupCheckboxEvents(fid, filterStates[fid]);
            }
        });
    }

    // Bind slider events
    function setupSliderEvents(id, state, isDecimal) {
        const minRange = document.getElementById(`min-${id}`);
        const maxRange = document.getElementById(`max-${id}`);
        const minValInput = document.getElementById(`val-${id}-min`);
        const maxValInput = document.getElementById(`val-${id}-max`);

        const stepFormatter = (val) => isDecimal ? val.toFixed(2) : Math.round(val);

        minRange.addEventListener('input', () => {
            let val = parseFloat(minRange.value);
            if (val > parseFloat(maxRange.value)) {
                val = parseFloat(maxRange.value);
                minRange.value = val;
            }
            state.currentMin = val;
            minValInput.value = stepFormatter(val);
            applyFilters();
        });

        maxRange.addEventListener('input', () => {
            let val = parseFloat(maxRange.value);
            if (val < parseFloat(minRange.value)) {
                val = parseFloat(minRange.value);
                maxRange.value = val;
            }
            state.currentMax = val;
            maxValInput.value = stepFormatter(val);
            applyFilters();
        });

        minValInput.addEventListener('change', () => {
            let val = parseFloat(minValInput.value) || state.min;
            if (val < state.min) val = state.min;
            if (val > state.currentMax) val = state.currentMax;
            minValInput.value = stepFormatter(val);
            minRange.value = val;
            state.currentMin = val;
            applyFilters();
        });

        maxValInput.addEventListener('change', () => {
            let val = parseFloat(maxValInput.value) || state.max;
            if (val > state.max) val = state.max;
            if (val < state.currentMin) val = state.currentMin;
            maxValInput.value = stepFormatter(val);
            maxRange.value = val;
            state.currentMax = val;
            applyFilters();
        });
    }

    // Bind size_split events
    function setupSizeSplitEvents(id, state) {
        // Width Controls
        const minWRange = document.getElementById(`min-${id}-w`);
        const maxWRange = document.getElementById(`max-${id}-w`);
        const minWValInput = document.getElementById(`val-${id}-w-min`);
        const maxWValInput = document.getElementById(`val-${id}-w-max`);

        minWRange.addEventListener('input', () => {
            let val = parseFloat(minWRange.value);
            if (val > parseFloat(maxWRange.value)) {
                val = parseFloat(maxWRange.value);
                minWRange.value = val;
            }
            state.currentMinW = val;
            minWValInput.value = Math.round(val);
            applyFilters();
        });

        maxWRange.addEventListener('input', () => {
            let val = parseFloat(maxWRange.value);
            if (val < parseFloat(minWRange.value)) {
                val = parseFloat(minWRange.value);
                maxWRange.value = val;
            }
            state.currentMaxW = val;
            maxWValInput.value = Math.round(val);
            applyFilters();
        });

        minWValInput.addEventListener('change', () => {
            let val = parseFloat(minWValInput.value) || state.minW;
            if (val < state.minW) val = state.minW;
            if (val > state.currentMaxW) val = state.currentMaxW;
            minWValInput.value = Math.round(val);
            minWRange.value = val;
            state.currentMinW = val;
            applyFilters();
        });

        maxWValInput.addEventListener('change', () => {
            let val = parseFloat(maxWValInput.value) || state.maxW;
            if (val > state.maxW) val = state.maxW;
            if (val < state.currentMinW) val = state.currentMinW;
            maxWValInput.value = Math.round(val);
            maxWRange.value = val;
            state.currentMaxW = val;
            applyFilters();
        });

        // Height Controls
        const minHRange = document.getElementById(`min-${id}-h`);
        const maxHRange = document.getElementById(`max-${id}-h`);
        const minHValInput = document.getElementById(`val-${id}-h-min`);
        const maxHValInput = document.getElementById(`val-${id}-h-max`);

        minHRange.addEventListener('input', () => {
            let val = parseFloat(minHRange.value);
            if (val > parseFloat(maxHRange.value)) {
                val = parseFloat(maxHRange.value);
                minHRange.value = val;
            }
            state.currentMinH = val;
            minHValInput.value = Math.round(val);
            applyFilters();
        });

        maxHRange.addEventListener('input', () => {
            let val = parseFloat(maxHRange.value);
            if (val < parseFloat(minHRange.value)) {
                val = parseFloat(minHRange.value);
                maxHRange.value = val;
            }
            state.currentMaxH = val;
            maxHValInput.value = Math.round(val);
            applyFilters();
        });

        minHValInput.addEventListener('change', () => {
            let val = parseFloat(minHValInput.value) || state.minH;
            if (val < state.minH) val = state.minH;
            if (val > state.currentMaxH) val = state.currentMaxH;
            minHValInput.value = Math.round(val);
            minHRange.value = val;
            state.currentMinH = val;
            applyFilters();
        });

        maxHValInput.addEventListener('change', () => {
            let val = parseFloat(maxHValInput.value) || state.maxH;
            if (val > state.maxH) val = state.maxH;
            if (val < state.currentMinH) val = state.currentMinH;
            maxHValInput.value = Math.round(val);
            maxHRange.value = val;
            state.currentMaxH = val;
            applyFilters();
        });
    }

    // Bind checkboxes events
    function setupCheckboxEvents(id, state) {
        const container = document.getElementById(`cb-container-${id}`);
        if (!container) return;

        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    state.selected.push(cb.value);
                } else {
                    const idx = state.selected.indexOf(cb.value);
                    if (idx > -1) state.selected.splice(idx, 1);
                }
                applyFilters();
            });
        });
    }

    // Apply active filter logic
    function applyFilters() {
        const filtered = products.filter(p => {
            for (const [fid, state] of Object.entries(filterStates)) {
                if (fid === 'price') {
                    // Check price boundaries
                    if (p.price < state.currentMin || p.price > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'slider') {
                    // Check simple numeric slider boundaries
                    const featVal = p.features && p.features[fid];
                    const num = parseNumber(featVal);
                    if (num < state.currentMin || num > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'size_split') {
                    // Check Width and Height boundaries
                    const featVal = p.features && p.features[fid];
                    const size = parseSizeSplit(featVal);
                    if (size.w < state.currentMinW || size.w > state.currentMaxW ||
                        size.h < state.currentMinH || size.h > state.currentMaxH) {
                        return false;
                    }
                } else if (state.type === 'checkboxes') {
                    // Check multi-select checkbox constraints
                    if (state.selected.length > 0) {
                        const featVal = p.features && p.features[fid];
                        if (!featVal || !state.selected.includes(featVal)) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });

        renderProducts(filtered);
    }

    // Render list of matching products
    function renderProducts(items) {
        productCountBadge.textContent = items.length;
        productListContainer.innerHTML = '';

        if (items.length === 0) {
            noResultsMsg.style.display = 'block';
            return;
        }
        noResultsMsg.style.display = 'none';

        items.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgUrl = p.image || '/img/p/pl-default-home_default.jpg';

            // Gather dynamically mapped features description badges
            let detailsHtml = '';
            filtersConfig.forEach(f => {
                if (f.active && f.id !== 'price') {
                    const val = p.features && p.features[f.id];
                    if (val) {
                        detailsHtml += `<p>${f.label}: <span>${val}</span></p>`;
                    }
                }
            });

            card.innerHTML = `
                <div>
                    <div class="card-img-wrapper">
                        <img src="${imgUrl}" alt="${p.name}" class="card-img">
                    </div>
                    <h4 class="card-title" title="${p.name}">${p.name}</h4>
                    <div class="card-price">${p.formatted_price}</div>
                    <div class="card-details">
                        ${detailsHtml}
                    </div>
                </div>
                <a href="${p.url}" class="card-btn">
                    <i class="material-icons">shopping_bag</i> Zobacz produkt
                </a>
            `;
            productListContainer.appendChild(card);
        });
    }

    // Reset all triggers and UI elements to initial values
    btnResetAll.addEventListener('click', () => {
        buildDynamicFilters();
        applyFilters();
    });

    // Mobile Sidebar Toggles
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Initial builder execution
    buildDynamicFilters();
    applyFilters();
});
