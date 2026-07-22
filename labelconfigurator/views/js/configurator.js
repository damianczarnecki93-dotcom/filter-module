document.addEventListener('DOMContentLoaded', () => {
    const rawDataEl = document.getElementById('json-data');
    const rawConfigEl = document.getElementById('config-data');
    const appEl = document.getElementById('configurator-app');

    if (!rawDataEl || !rawConfigEl || !appEl) return;

    // Helper: decode HTML entities (handles &quot;, &amp;, etc. safely)
    function decodeHtml(html) {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }

    // Helper: Try multiple formats to parse JSON (direct, HTML decoded, or Base64)
    function tryParse(rawStr) {
        if (!rawStr) return [];
        const str = rawStr.trim();

        try {
            return JSON.parse(str);
        } catch (e) {}

        try {
            const decoded = decodeHtml(str);
            return JSON.parse(decoded);
        } catch (e) {}

        try {
            const decodedBase64 = atob(str);
            return JSON.parse(decodedBase64);
        } catch (e) {}

        console.error("Failed to parse JSON string:", str);
        return [];
    }

    let products = [];
    let filtersConfig = [];

    products = tryParse(rawDataEl.textContent || rawDataEl.innerHTML);
    filtersConfig = tryParse(rawConfigEl.textContent || rawConfigEl.innerHTML);

    // Bulletproof conversion to Array in case of PHP JSON associative array / object serialization
    if (products && !Array.isArray(products)) {
        products = Object.values(products);
    }
    if (filtersConfig && !Array.isArray(filtersConfig)) {
        filtersConfig = Object.values(filtersConfig);
    }

    if (!products) products = [];
    if (!filtersConfig) filtersConfig = [];

    const dynamicFiltersContainer = document.getElementById('dynamic-filters-container');
    const btnResetAll = document.getElementById('btn-reset-all');
    const btnApplyFilters = document.getElementById('btn-apply-filters');

    // Configuration settings
    const isInstant = appEl.getAttribute('data-instant') === '1';
    const ajaxUrl = appEl.getAttribute('data-ajax-url') || '';
    const idCategory = parseInt(appEl.getAttribute('data-id-category')) || 0;

    // Show/hide Apply Button based on configuration
    if (!isInstant && btnApplyFilters) {
        btnApplyFilters.style.display = 'block';
        btnApplyFilters.addEventListener('click', () => {
            applyFilters();
        });
    } else if (btnApplyFilters) {
        btnApplyFilters.style.display = 'none';
    }

    // Sidebar references for mobile view
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    // Dynamic state trackers
    let filterStates = {};
    let isCategoryLiveFilter = false;
    let mappedThemeCards = [];

    // Helper: Safely retrieve feature values without any null pointer exceptions
    function getFeatureValue(product, fid) {
        if (!product || !product.features) return '';
        const features = product.features;
        const key = 'f_' + fid;
        if (typeof features === 'object' && features !== null) {
            if (features[key] !== undefined && features[key] !== null) {
                return String(features[key]).trim();
            }
        }
        return '';
    }

    // Helper: parse numbers from string
    function parseNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val);
        const match = str.replace(',', '.').match(/(\d+(?:[.,]\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // Helper: parse dimension pair (e.g. "70x37" or "105 x 148 mm")
    function parseSizeSplit(val) {
        if (!val) return { w: 0, h: 0 };
        const str = String(val);
        const match = str.replace(',', '.').match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
        if (match) {
            return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
        }
        const single = parseNumber(val);
        return { w: single, h: single };
    }

    // Colors swatches dictionary
    const colorMap = {
        'czarny': '#111827', 'czarna': '#111827', 'black': '#111827',
        'biały': '#ffffff', 'biała': '#ffffff', 'white': '#ffffff',
        'szary': '#6b7280', 'szara': '#6b7280', 'gray': '#6b7280', 'grey': '#6b7280',
        'czerwony': '#dc2626', 'czerwona': '#dc2626', 'red': '#dc2626',
        'niebieski': '#2563eb', 'niebieska': '#2563eb', 'blue': '#2563eb',
        'zielony': '#16a34a', 'zielona': '#16a34a', 'green': '#16a34a',
        'żółty': '#facc15', 'żółta': '#facc15', 'yellow': '#facc15',
        'pomarańczowy': '#ea580c', 'pomarańczowa': '#ea580c', 'orange': '#ea580c',
        'różowy': '#db2777', 'różowa': '#db2777', 'pink': '#db2777',
        'brązowy': '#78350f', 'brązowa': '#78350f', 'brown': '#78350f',
        'złoty': '#ca8a04', 'gold': '#ca8a04',
        'srebrny': '#cbd5e1', 'silver': '#cbd5e1',
        'przezroczysty': 'rgba(255, 255, 255, 0.2)', 'transparent': 'rgba(255, 255, 255, 0.2)'
    };

    function getSwatchColor(name) {
        if (!name) return '#e2e8f0';
        const cleanName = name.toLowerCase().trim();
        if (colorMap[cleanName]) return colorMap[cleanName];

        let hash = 0;
        for (let i = 0; i < cleanName.length; i++) {
            hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    // Helper: Normalize URL pathname to match reliably
    function getUrlPathname(urlStr) {
        if (!urlStr) return '';
        try {
            const u = new URL(urlStr, window.location.origin);
            return u.pathname;
        } catch(e) {
            return urlStr;
        }
    }

    // Helper: Extract Product ID from theme miniature card with extreme robustness
    function getProductIdFromCard(cardEl) {
        // 1. Check data-id-product or data-id attributes
        let id = cardEl.getAttribute('data-id-product') || cardEl.getAttribute('data-id') || cardEl.getAttribute('data-product-id');
        if (id && !isNaN(id)) return parseInt(id);

        // 2. Search inside class list (e.g. id-product-123 or product-123)
        for (const cls of cardEl.classList) {
            const match = cls.match(/(?:id_product|id-product|product-id|product)-(\d+)/i);
            if (match) return parseInt(match[1]);
        }

        // 3. Search inside input fields or forms
        const idInput = cardEl.querySelector('input[name="id_product"]') || cardEl.querySelector('input[name="id"]');
        if (idInput && idInput.value && !isNaN(idInput.value)) return parseInt(idInput.value);

        const form = cardEl.querySelector('form[action*="cart"]');
        if (form) {
            const action = form.getAttribute('action');
            const matchAction = action.match(/id_product=(\d+)/i) || action.match(/id=(\d+)/i);
            if (matchAction) return parseInt(matchAction[1]);
        }

        // 4. Search inside anchor links (e.g. href="/123-product-name")
        const anchors = cardEl.querySelectorAll('a[href]');
        for (const a of anchors) {
            const href = a.getAttribute('href');
            if (href) {
                const matchId = href.match(/id_product=(\d+)/i) ||
                                href.match(/\/(\d+)-/i) ||
                                href.match(/-(\d+)\.html/i) ||
                                href.match(/-(\d+)$/i);
                if (matchId) return parseInt(matchId[1]);
            }
        }
        return null;
    }

    // Attempt to detect and map theme product cards for Live Category Filtering
    function detectThemeProducts() {
        const cardSelectors = [
            '.product-miniature',
            '.js-product-miniature',
            '.product-miniature-wrapper',
            '.product-preview',
            'article.product-miniature',
            '.products .product'
        ];

        let foundCards = [];
        for (const selector of cardSelectors) {
            const els = document.querySelectorAll(selector);
            if (els && els.length > 0) {
                foundCards = Array.from(els);
                break;
            }
        }

        if (foundCards.length === 0) {
            isCategoryLiveFilter = false;
            return;
        }

        mappedThemeCards = [];
        foundCards.forEach(cardEl => {
            let productId = cardEl.getAttribute('data-id-product');
            const anchors = cardEl.querySelectorAll('a[href]');
            let hrefs = Array.from(anchors).map(a => getUrlPathname(a.getAttribute('href'))).filter(Boolean);

            let matchedProduct = null;
            if (productId) {
                matchedProduct = products.find(p => p.id_product == productId);
            }
            if (!matchedProduct && hrefs.length > 0) {
                matchedProduct = products.find(p => {
                    const pPath = getUrlPathname(p.url);
                    return hrefs.includes(pPath);
                });
            }

            if (matchedProduct) {
                mappedThemeCards.push({
                    el: cardEl,
                    product: matchedProduct
                });
            }
        });

        if (mappedThemeCards.length > 0) {
            isCategoryLiveFilter = true;

            // ADAPT SIDEBAR LAYOUT TO NATIVE LEFT COLUMN
            // Prevents overflow / squishing issues
            const app = document.getElementById('configurator-app');
            const layout = document.querySelector('.config-layout');
            const sidebar = document.getElementById('sidebar');

            if (app) app.style.maxWidth = '100%';
            if (layout) {
                layout.style.display = 'block';
                layout.style.gap = '0';
            }
            if (sidebar) {
                sidebar.style.width = '100%';
                sidebar.style.flex = 'none';
                sidebar.style.boxSizing = 'border-box';
            }
        }
    }

    // Helper: Build dynamic filters based on configuration
    function buildDynamicFilters() {
        dynamicFiltersContainer.innerHTML = '';
        filterStates = {};

        const activeFilters = filtersConfig.filter(f => f && f.active);

        activeFilters.forEach(filter => {
            const fid = filter.id;
            const label = filter.label || 'Filtr';
            const type = filter.type;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';

            // Create Accordion Header
            const header = document.createElement('div');
            header.className = 'filter-header';
            header.innerHTML = `
                <label>${label}</label>
                <i class="material-icons">expand_more</i>
            `;
            groupDiv.appendChild(header);

            // Create Accordion Body Container
            const body = document.createElement('div');
            body.className = 'filter-body';
            groupDiv.appendChild(body);

            // Register toggle event on header click
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
            });

            if (fid === 'price') {
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

                body.innerHTML = `
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
                setupSliderEvents('price', filterStates[fid], true);

            } else if (type === 'slider') {
                const values = products.map(p => {
                    const featVal = getFeatureValue(p, fid);
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

                body.innerHTML = `
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
                setupSliderEvents(fid, filterStates[fid], false);

            } else if (type === 'size_split') {
                const widths = [];
                const heights = [];

                products.forEach(p => {
                    const featVal = getFeatureValue(p, fid);
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

                body.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <span style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Szerokość (mm):</span>
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
                    <div>
                        <span style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Wysokość (mm):</span>
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
                setupSizeSplitEvents(fid, filterStates[fid]);

            } else if (type === 'checkboxes') {
                const uniqueValues = [...new Set(products.map(p => {
                    return getFeatureValue(p, fid);
                }).filter(Boolean))].sort();

                filterStates[fid] = {
                    type: 'checkboxes',
                    selected: [],
                    allOptions: uniqueValues,
                    featureId: fid
                };

                const isColor = /kolor|color|barwa/i.test(label);

                if (isColor) {
                    const swatchesHtml = uniqueValues.map(val => {
                        const hex = getSwatchColor(val);
                        const lightBorder = hex.toLowerCase() === '#ffffff' ? 'border: 1px solid #cbd5e1;' : '';
                        return `
                            <div class="swatch-item" data-val="${val}" style="background-color: ${hex}; ${lightBorder}" title="${val}"></div>
                        `;
                    }).join('');

                    body.innerHTML = `<div class="swatch-grid" id="grid-${fid}">${swatchesHtml}</div>`;
                    setupSwatchEvents(fid, filterStates[fid]);

                } else {
                    const inCategorySearchId = `search-cat-${fid}`;
                    const itemsContainerId = `list-${fid}`;
                    const dropdownTriggerId = `trigger-${fid}`;
                    const dropdownMenuId = `menu-${fid}`;

                    body.innerHTML = `
                        <div class="lc-custom-dropdown" id="dropdown-${fid}">
                            <div class="lc-dropdown-trigger" id="${dropdownTriggerId}">
                                <span class="lc-trigger-text">Wybierz opcje...</span>
                                <i class="material-icons lc-chevron">expand_more</i>
                            </div>
                            <div class="lc-dropdown-menu" id="${dropdownMenuId}" style="display: none;">
                                <div class="lc-in-category-search">
                                    <i class="material-icons">search</i>
                                    <input type="text" id="${inCategorySearchId}" placeholder="Wyszukaj wartości...">
                                </div>
                                <div class="lc-select-options" id="${itemsContainerId}">
                                </div>
                            </div>
                        </div>
                    `;

                    // Handle custom dropdown open/close click event
                    const trigger = body.querySelector(`#${dropdownTriggerId}`);
                    const menu = body.querySelector(`#${dropdownMenuId}`);

                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Close all other open dropdowns first
                        document.querySelectorAll('.lc-dropdown-menu').forEach(m => {
                            if (m !== menu) m.style.display = 'none';
                        });
                        document.querySelectorAll('.lc-dropdown-trigger').forEach(t => {
                            if (t !== trigger) t.classList.remove('open');
                        });

                        const isOpen = menu.style.display === 'flex';
                        menu.style.display = isOpen ? 'none' : 'flex';
                        trigger.classList.toggle('open', !isOpen);
                    });

                    // Prevent click inside menu from closing the dropdown
                    menu.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });

                    setupPillsEvents(fid, filterStates[fid], inCategorySearchId, itemsContainerId, trigger);
                }
            }

            dynamicFiltersContainer.appendChild(groupDiv);
        });
    }

    function onFilterInput() {
        updateAllCheckboxesPills();
        if (isInstant) {
            applyFilters();
        }
    }

    function setupSliderEvents(id, state, isDecimal) {
        const minRange = document.getElementById(`min-${id}`);
        const maxRange = document.getElementById(`max-${id}`);
        const minValInput = document.getElementById(`val-${id}-min`);
        const maxValInput = document.getElementById(`val-${id}-max`);

        if (!minRange || !maxRange || !minValInput || !maxValInput) return;

        // Ensure proper overlapping thumbs interaction
        minRange.style.pointerEvents = 'auto';
        maxRange.style.pointerEvents = 'auto';

        function updateRangeOverlap(e) {
            if (e.target === minRange) {
                minRange.style.zIndex = "10";
                maxRange.style.zIndex = "9";
            } else {
                minRange.style.zIndex = "9";
                maxRange.style.zIndex = "10";
            }
        }

        const stepFormatter = (val) => isDecimal ? val.toFixed(2) : Math.round(val);

        minRange.addEventListener('input', (e) => {
            updateRangeOverlap(e);
            let val = parseFloat(minRange.value);
            if (val > parseFloat(maxRange.value)) {
                val = parseFloat(maxRange.value);
                minRange.value = val;
            }
            state.currentMin = val;
            minValInput.value = stepFormatter(val);
            onFilterInput();
        });

        maxRange.addEventListener('input', (e) => {
            updateRangeOverlap(e);
            let val = parseFloat(maxRange.value);
            if (val < parseFloat(minRange.value)) {
                val = parseFloat(minRange.value);
                maxRange.value = val;
            }
            state.currentMax = val;
            maxValInput.value = stepFormatter(val);
            onFilterInput();
        });

        minValInput.addEventListener('change', () => {
            let val = parseFloat(minValInput.value) || state.min;
            if (val < state.min) val = state.min;
            if (val > state.currentMax) val = state.currentMax;
            minValInput.value = stepFormatter(val);
            minRange.value = val;
            state.currentMin = val;
            onFilterInput();
        });

        maxValInput.addEventListener('change', () => {
            let val = parseFloat(maxValInput.value) || state.max;
            if (val > state.max) val = state.max;
            if (val < state.currentMin) val = state.currentMin;
            maxValInput.value = stepFormatter(val);
            maxRange.value = val;
            state.currentMax = val;
            onFilterInput();
        });
    }

    function setupSizeSplitEvents(id, state) {
        // Width
        const minWRange = document.getElementById(`min-${id}-w`);
        const maxWRange = document.getElementById(`max-${id}-w`);
        const minWValInput = document.getElementById(`val-${id}-w-min`);
        const maxWValInput = document.getElementById(`val-${id}-w-max`);

        if (minWRange && maxWRange && minWValInput && maxWValInput) {
            minWRange.style.pointerEvents = 'auto';
            maxWRange.style.pointerEvents = 'auto';

            minWRange.addEventListener('input', (e) => {
                minWRange.style.zIndex = "10";
                maxWRange.style.zIndex = "9";
                let val = parseFloat(minWRange.value);
                if (val > parseFloat(maxWRange.value)) {
                    val = parseFloat(maxWRange.value);
                    minWRange.value = val;
                }
                state.currentMinW = val;
                minWValInput.value = Math.round(val);
                onFilterInput();
            });

            maxWRange.addEventListener('input', (e) => {
                minWRange.style.zIndex = "9";
                maxWRange.style.zIndex = "10";
                let val = parseFloat(maxWRange.value);
                if (val < parseFloat(minWRange.value)) {
                    val = parseFloat(minWRange.value);
                    maxWRange.value = val;
                }
                state.currentMaxW = val;
                maxWValInput.value = Math.round(val);
                onFilterInput();
            });

            minWValInput.addEventListener('change', () => {
                let val = parseFloat(minWValInput.value) || state.minW;
                if (val < state.minW) val = state.minW;
                if (val > state.currentMaxW) val = state.currentMaxW;
                minWValInput.value = Math.round(val);
                minWRange.value = val;
                state.currentMinW = val;
                onFilterInput();
            });

            maxWValInput.addEventListener('change', () => {
                let val = parseFloat(maxWValInput.value) || state.maxW;
                if (val > state.maxW) val = state.maxW;
                if (val < state.currentMinW) val = state.currentMinW;
                maxWValInput.value = Math.round(val);
                maxWRange.value = val;
                state.currentMaxW = val;
                onFilterInput();
            });
        }

        // Height
        const minHRange = document.getElementById(`min-${id}-h`);
        const maxHRange = document.getElementById(`max-${id}-h`);
        const minHValInput = document.getElementById(`val-${id}-h-min`);
        const maxHValInput = document.getElementById(`val-${id}-h-max`);

        if (minHRange && maxHRange && minHValInput && maxHValInput) {
            minHRange.style.pointerEvents = 'auto';
            maxHRange.style.pointerEvents = 'auto';

            minHRange.addEventListener('input', (e) => {
                minHRange.style.zIndex = "10";
                maxHRange.style.zIndex = "9";
                let val = parseFloat(minHRange.value);
                if (val > parseFloat(maxHRange.value)) {
                    val = parseFloat(maxHRange.value);
                    minHRange.value = val;
                }
                state.currentMinH = val;
                minHValInput.value = Math.round(val);
                onFilterInput();
            });

            maxHRange.addEventListener('input', (e) => {
                minHRange.style.zIndex = "9";
                maxHRange.style.zIndex = "10";
                let val = parseFloat(maxHRange.value);
                if (val < parseFloat(minHRange.value)) {
                    val = parseFloat(minHRange.value);
                    maxHRange.value = val;
                }
                state.currentMaxH = val;
                maxHValInput.value = Math.round(val);
                onFilterInput();
            });

            minHValInput.addEventListener('change', () => {
                let val = parseFloat(minHValInput.value) || state.minH;
                if (val < state.minH) val = state.minH;
                if (val > state.currentMaxH) val = state.currentMaxH;
                minHValInput.value = Math.round(val);
                minHRange.value = val;
                state.currentMinH = val;
                onFilterInput();
            });

            maxHValInput.addEventListener('change', () => {
                let val = parseFloat(maxHValInput.value) || state.maxH;
                if (val > state.maxH) val = state.maxH;
                if (val < state.currentMinH) val = state.currentMinH;
                maxHValInput.value = Math.round(val);
                maxHRange.value = val;
                state.currentMaxH = val;
                onFilterInput();
            });
        }
    }

    function setupSwatchEvents(id, state) {
        const grid = document.getElementById(`grid-${id}`);
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.swatch-item');
            if (!item) return;

            const val = item.getAttribute('data-val');
            item.classList.toggle('active');

            if (item.classList.contains('active')) {
                state.selected.push(val);
            } else {
                const idx = state.selected.indexOf(val);
                if (idx > -1) state.selected.splice(idx, 1);
            }
            onFilterInput();
        });
    }

    // Dynamic Server-Side AJAX Filtering
    function applyFilters() {
        if (!ajaxUrl) {
            applyFiltersLocally();
            return;
        }

        fetch(ajaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_category: idCategory,
                filters: filterStates
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.success) {
                updateUIWithFilteredProducts(data.products);
            } else {
                applyFiltersLocally(); // fallback
            }
        })
        .catch(err => {
            console.error("AJAX filter request failed:", err);
            applyFiltersLocally(); // fallback
        });
    }

    function applyFiltersLocally() {
        const filtered = products.filter(p => {
            for (const [fid, state] of Object.entries(filterStates)) {
                if (fid === 'price') {
                    if (p.price < state.currentMin || p.price > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'slider') {
                    const featVal = getFeatureValue(p, fid);
                    const num = parseNumber(featVal);
                    if (num < state.currentMin || num > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'size_split') {
                    const featVal = getFeatureValue(p, fid);
                    const size = parseSizeSplit(featVal);
                    if (size.w < state.currentMinW || size.w > state.currentMaxW ||
                        size.h < state.currentMinH || size.h > state.currentMaxH) {
                        return false;
                    }
                } else if (state.type === 'checkboxes') {
                    if (state.selected.length > 0) {
                        const featVal = getFeatureValue(p, fid);
                        if (!featVal || !state.selected.includes(featVal)) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });

        updateUIWithFilteredProducts(filtered);
    }

    function updateUIWithFilteredProducts(filtered) {
        // Native product card selectors for PrestaShop 1.7 theme
        const cardSelectors = [
            '.product-miniature',
            '.js-product-miniature',
            '.product-miniature-wrapper',
            '.product-preview',
            'article.product-miniature',
            '.products .product'
        ];

        let foundCards = [];
        for (const selector of cardSelectors) {
            const els = document.querySelectorAll(selector);
            if (els && els.length > 0) {
                foundCards = Array.from(els);
                break;
            }
        }

        if (foundCards.length > 0) {
            let visibleCount = 0;
            foundCards.forEach(cardEl => {
                const productId = getProductIdFromCard(cardEl);
                if (productId) {
                    const isMatched = filtered.some(fp => fp.id_product == productId);

                    // Find the grid column wrapper element (bootstrap col-)
                    let displayElement = cardEl;
                    let parent = cardEl.parentElement;
                    if (parent) {
                        const classes = Array.from(parent.classList);
                        const isCol = classes.some(c => c.startsWith('col-') || c === 'product-miniature-wrapper' || c.includes('product-miniature-wrapper'));
                        if (isCol) {
                            displayElement = parent;
                        } else {
                            // Go one level higher if needed (sometimes miniatures have inner wraps)
                            let grandParent = parent.parentElement;
                            if (grandParent) {
                                const gpClasses = Array.from(grandParent.classList);
                                if (gpClasses.some(c => c.startsWith('col-'))) {
                                    displayElement = grandParent;
                                }
                            }
                        }
                    }

                    if (isMatched) {
                        displayElement.style.display = '';
                        visibleCount++;
                    } else {
                        displayElement.style.display = 'none';
                    }
                }
            });

            // Update all badge counts (both sidebar and main toolbar)
            document.querySelectorAll('.badge-count').forEach(el => {
                el.textContent = visibleCount;
            });
        }
    }

    function setupPillsEvents(id, state, searchInputId, containerId, trigger) {
        const searchInput = document.getElementById(searchInputId);
        const container = document.getElementById(containerId);

        if (!searchInput || !container) return;

        state.searchTerm = '';

        searchInput.addEventListener('input', () => {
            state.searchTerm = searchInput.value.toLowerCase().trim();
            updatePillsRender(id, state, container, trigger);
        });

        updatePillsRender(id, state, container, trigger);
    }

    function updatePillsRender(id, state, container, trigger) {
        if (!container) return;
        container.innerHTML = '';

        const visibleOptions = state.allOptions.filter(opt => {
            return opt.toLowerCase().includes(state.searchTerm);
        });

        if (visibleOptions.length === 0) {
            container.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:10px 0;">Brak pasujących opcji</div>';
            return;
        }

        visibleOptions.forEach(opt => {
            const pill = document.createElement('div');
            pill.className = 'lc-pill-item';
            if (state.selected.includes(opt)) {
                pill.classList.add('active');
            }

            const count = countProductsForOption(id, opt);
            pill.innerHTML = `${opt} <span style="font-weight:400;margin-left:4px;opacity:0.75;">(${count})</span>`;

            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                if (pill.classList.contains('active')) {
                    state.selected.push(opt);
                } else {
                    const idx = state.selected.indexOf(opt);
                    if (idx > -1) state.selected.splice(idx, 1);
                }

                // Update Trigger Text dynamically
                if (trigger) {
                    const triggerText = trigger.querySelector('.lc-trigger-text');
                    if (triggerText) {
                        if (state.selected.length === 0) {
                            triggerText.textContent = 'Wybierz opcje...';
                        } else {
                            triggerText.textContent = state.selected.join(', ');
                        }
                    }
                }

                onFilterInput();
            });

            container.appendChild(pill);
        });
    }

    function updateAllCheckboxesPills() {
        for (const [fid, state] of Object.entries(filterStates)) {
            if (state.type === 'checkboxes') {
                const label = filtersConfig.find(f => f.id == fid || f.id === fid)?.label || '';
                const isColor = /kolor|color|barwa/i.test(label);
                if (!isColor) {
                    const container = document.getElementById(`list-${fid}`);
                    const trigger = document.getElementById(`trigger-${fid}`);
                    if (container) {
                        updatePillsRender(fid, state, container, trigger);
                    }
                }
            }
        }
    }

    btnResetAll.addEventListener('click', () => {
        buildDynamicFilters();
        applyFilters();
    });

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

    // Close open custom dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.lc-dropdown-menu').forEach(m => {
            m.style.display = 'none';
        });
        document.querySelectorAll('.lc-dropdown-trigger').forEach(t => {
            t.classList.remove('open');
        });
    });

    // Try to detect theme products on the category page first
    detectThemeProducts();

    // Initial builder execution
    buildDynamicFilters();
    applyFilters();
});