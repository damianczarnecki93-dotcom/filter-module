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

    console.log("LabelConfigurator Raw Products Parsed:", products);
    console.log("LabelConfigurator Raw Filters Config Parsed:", filtersConfig);

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
    const isInstant = false; // Always force Apply button as per user's explicit request
    const ajaxUrl = appEl.getAttribute('data-ajax-url') || '';
    const idCategory = parseInt(appEl.getAttribute('data-id-category')) || 0;

    // Show/hide Apply Button based on configuration
    if (btnApplyFilters) {
        btnApplyFilters.style.display = 'block';
        btnApplyFilters.addEventListener('click', () => {
            applyFiltersByRedirect();
        });
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

    // Helper: Count products that have a specific option for a feature
    function countProductsForOption(fid, opt) {
        if (!products) return 0;
        return products.filter(p => {
            const val = getFeatureValue(p, fid);
            return val === opt;
        }).length;
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

    // Custom Swatch style generator (returns CSS string for element background / border)
    function getSwatchStyle(name) {
        if (!name) return 'background: #e2e8f0;';
        const clean = name.toLowerCase().replace(/\s\s+/g, ' ').trim();

        // Accurate user request custom color swatches assignments
        if (clean === 'transparentny matowy' || clean === 'transparentny mat' || clean === 'matowy transparentny') {
            return 'background-color: #f1f5f9; background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0), linear-gradient(45deg, #e2e8f0 25%, #f1f5f9 25%, #f1f5f9 75%, #e2e8f0 75%, #e2e8f0); background-size: 8px 8px; background-position: 0 0, 4px 4px; border: 1px solid #cbd5e1;';
        }

        if (clean === 'transparentny błyszczący' || clean === 'transparentny blyszczacy' || clean === 'transparentny błysk') {
            return 'background-color: #ffffff; background-image: linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1), linear-gradient(45deg, #cbd5e1 25%, #ffffff 25%, #ffffff 75%, #cbd5e1 75%, #cbd5e1); background-size: 8px 8px; background-position: 0 0, 4px 4px; border: 1px solid #94a3b8; box-shadow: inset 0 0 4px rgba(255,255,255,0.8);';
        }

        if (clean === 'biały matowy' || clean === 'biały mat' || clean === 'bialy matowy') {
            return 'background: #ffffff; border: 1px solid #cbd5e1;';
        }

        if (clean === 'biały błyszczący' || clean === 'biały błysk' || clean === 'bialy blyszczacy') {
            return 'background: linear-gradient(135deg, #fffdf0 50%, #ffffff 50%); border: 1px solid #cbd5e1;';
        }

        if (clean === 'żółty' || clean === 'zolty') {
            return 'background: #facc15;';
        }

        if (clean === 'czerwony neonowy' || clean === 'czerwony neon' || clean === 'neonowy czerwony') {
            return 'background: #ff0055; box-shadow: 0 0 8px #ff0055;';
        }

        if (clean === 'żółty neonowy' || clean === 'neonowy zolty' || clean === 'żółty neon') {
            return 'background: #ccff00; box-shadow: 0 0 8px #ccff00;';
        }

        if (clean === 'pomarańczowy neonowy' || clean === 'pomarańczowy neon' || clean === 'neonowy pomaranczowy') {
            return 'background: #ff5500; box-shadow: 0 0 8px #ff5500;';
        }

        if (clean === 'zielony neonowy' || clean === 'zielony neon' || clean === 'neonowy zielony') {
            return 'background: #00ff66; box-shadow: 0 0 8px #00ff66;';
        }

        if (clean === 'zielony') {
            return 'background: #16a34a;';
        }

        if (clean === 'niebieski') {
            return 'background: #2563eb;';
        }

        if (clean === 'czerwony') {
            return 'background: #dc2626;';
        }

        if (clean === 'różowy' || clean === 'rozowy') {
            return 'background: #db2777;';
        }

        if (clean === 'ciemnoniebieski' || clean === 'ciemny niebieski') {
            return 'background: #1e3a8a;';
        }

        if (clean === 'ciemnozielony' || clean === 'ciemny zielony') {
            return 'background: #14532d;';
        }

        if (clean === 'popielaty' || clean === 'popiel') {
            return 'background: #94a3b8;';
        }

        if (clean === 'czarny' || clean === 'czarna') {
            return 'background: #111827;';
        }

        if (clean === 'złoty błyszczący' || clean === 'zloty blyszczacy' || clean === 'złoty') {
            return 'background: linear-gradient(135deg, #fef08a 0%, #ca8a04 50%, #fef08a 100%); border: 1px solid #a16207;';
        }

        if (clean === 'srebrny błyszczący' || clean === 'srebrny blyszczacy' || clean === 'srebrny') {
            return 'background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #f1f5f9 100%); border: 1px solid #94a3b8;';
        }

        if (clean === 'srebrny matowy' || clean === 'srebrny mat') {
            return 'background: #94a3b8; border: 1px solid #475569;';
        }

        if (clean === 'mix kolorów' || clean === 'mix' || clean === 'wielokolorowy') {
            return 'background: linear-gradient(45deg, #f43f5e, #3b82f6, #10b981, #eab308);';
        }

        if (clean === 'jasnobrązowy' || clean === 'jasny brazowy') {
            return 'background: #b45309;';
        }

        if (clean === 'granatowy') {
            return 'background: #0f172a;';
        }

        if (clean === 'błękitny' || clean === 'blekitny') {
            return 'background: #38bdf8;';
        }

        if (clean === 'jasnozielony' || clean === 'jasny zielony') {
            return 'background: #4ade80;';
        }

        if (clean === 'naturalny brązowy' || clean === 'naturalny brazowy') {
            return 'background: #78350f;';
        }

        // Generic color mapping fallbacks
        const colorMap = {
            'czarny': '#111827', 'czarna': '#111827', 'black': '#111827',
            'szary': '#6b7280', 'szara': '#6b7280', 'gray': '#6b7280', 'grey': '#6b7280',
            'czerwony': '#dc2626', 'czerwona': '#dc2626', 'red': '#dc2626',
            'niebieski': '#2563eb', 'niebieska': '#2563eb', 'blue': '#2563eb',
            'zielony': '#16a34a', 'zielona': '#16a34a', 'green': '#16a34a',
            'żółty': '#facc15', 'żółta': '#facc15', 'yellow': '#facc15',
            'pomarańczowy': '#ea580c', 'pomarańczowa': '#ea580c', 'orange': '#ea580c',
            'różowy': '#db2777', 'różowa': '#db2777', 'pink': '#db2777',
            'brązowy': '#78350f', 'brązowa': '#78350f', 'brown': '#78350f',
            'złoty': '#ca8a04', 'gold': '#ca8a04',
            'srebrny': '#cbd5e1', 'silver': '#cbd5e1'
        };

        if (colorMap[clean]) {
            return `background: ${colorMap[clean]};`;
        }

        let hash = 0;
        for (let i = 0; i < clean.length; i++) {
            hash = clean.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return `background: ${color};`;
    }

    // Helper: Normalize URL pathname to match reliably (stripping language slugs like /pl/)
    function getUrlPathname(urlStr) {
        if (!urlStr) return '';
        try {
            let path = '';
            if (urlStr.startsWith('/') || !urlStr.includes('://')) {
                path = urlStr.split('?')[0].split('#')[0];
            } else {
                const u = new URL(urlStr, window.location.origin);
                path = u.pathname;
            }
            // Strip language slug if present (e.g. /pl/ or /en/ or /de/)
            path = path.replace(/^\/[a-z]{2}\//i, '/');
            return path;
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

        // 5. Check if the element itself has an ID or classes that can identify it
        if (cardEl.id) {
            const matchId = cardEl.id.match(/(?:id_product|id-product|product-id|product)-(\d+)/i);
            if (matchId) return parseInt(matchId[1]);
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
            '.products .product',
            '.products article'
        ];

        let foundCards = [];
        for (const selector of cardSelectors) {
            const els = document.querySelectorAll(selector);
            if (els && els.length > 0) {
                foundCards = Array.from(els);
                break;
            }
        }

        console.log("LabelConfigurator: Found card elements on page:", foundCards.length);

        if (foundCards.length === 0) {
            isCategoryLiveFilter = false;
            return;
        }

        mappedThemeCards = [];
        foundCards.forEach(cardEl => {
            let productId = getProductIdFromCard(cardEl);
            const anchors = cardEl.querySelectorAll('a[href]');
            let hrefs = Array.from(anchors).map(a => getUrlPathname(a.getAttribute('href'))).filter(Boolean);

            let matchedProduct = null;
            if (productId) {
                matchedProduct = products.find(p => p.id_product == productId);
            }
            if (!matchedProduct && hrefs.length > 0) {
                matchedProduct = products.find(p => {
                    const pPath = getUrlPathname(p.url);
                    return hrefs.some(href => href === pPath || href.endsWith(pPath) || pPath.endsWith(href));
                });
            }

            if (matchedProduct) {
                mappedThemeCards.push({
                    el: cardEl,
                    product: matchedProduct
                });
            } else {
                console.warn("LabelConfigurator: Card element has no matching product in JSON. ID:", productId, "Hrefs:", hrefs);
            }
        });

        console.log("LabelConfigurator: Successfully mapped theme cards:", mappedThemeCards.length);

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
        console.log("LabelConfigurator: Building dynamic filters. Products available:", products.length);
        console.log("Filters configuration active:", filtersConfig);

        dynamicFiltersContainer.innerHTML = '';
        filterStates = {};

        const activeFilters = filtersConfig.filter(f => f && f.active);

        activeFilters.forEach(filter => {
            const fid = filter.id;
            const label = filter.label || 'Filtr';
            const type = filter.type;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';

            // Append groupDiv immediately to DOM so lookups succeed
            dynamicFiltersContainer.appendChild(groupDiv);

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
                setupSliderEvents(body, 'price', filterStates[fid], true);

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
                setupSliderEvents(body, fid, filterStates[fid], false);

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
                setupSizeSplitEvents(body, fid, filterStates[fid]);

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
                        const swatchStyle = getSwatchStyle(val);
                        return `
                            <div class="swatch-item" data-val="${val}" style="${swatchStyle}" title="${val}"></div>
                        `;
                    }).join('');

                    body.innerHTML = `<div class="swatch-grid" id="grid-${fid}">${swatchesHtml}</div>`;
                    setupSwatchEvents(body, fid, filterStates[fid]);

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

                    setupPillsEvents(body, fid, filterStates[fid], inCategorySearchId, itemsContainerId, trigger);
                }
            }
        });
    }

    function onFilterInput() {
        updateAllCheckboxesPills();
        if (isInstant) {
            applyFiltersByRedirect();
        }
    }

    function setupSliderEvents(parentEl, id, state, isDecimal) {
        const minRange = parentEl.querySelector(`#min-${id}`);
        const maxRange = parentEl.querySelector(`#max-${id}`);
        const minValInput = parentEl.querySelector(`#val-${id}-min`);
        const maxValInput = parentEl.querySelector(`#val-${id}-max`);

        if (!minRange || !maxRange || !minValInput || !maxValInput) return;

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

    function setupSizeSplitEvents(parentEl, id, state) {
        // Width
        const minWRange = parentEl.querySelector(`#min-${id}-w`);
        const maxWRange = parentEl.querySelector(`#max-${id}-w`);
        const minWValInput = parentEl.querySelector(`#val-${id}-w-min`);
        const maxWValInput = parentEl.querySelector(`#val-${id}-w-max`);

        if (minWRange && maxWRange && minWValInput && maxWValInput) {
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
        const minHRange = parentEl.querySelector(`#min-${id}-h`);
        const maxHRange = parentEl.querySelector(`#max-${id}-h`);
        const minHValInput = parentEl.querySelector(`#val-${id}-h-min`);
        const maxHValInput = parentEl.querySelector(`#val-${id}-h-max`);

        if (minHRange && maxHRange && minHValInput && maxHValInput) {
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

    function setupSwatchEvents(parentEl, id, state) {
        const grid = parentEl.querySelector(`#grid-${id}`);
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

    // Redirect Filtering Strategy building native URL parameters (PrestaShop Faceted Search structure)
    function applyFiltersByRedirect() {
        const queryParts = [];

        // Parse already active query parameter q to preserve other active filters if desired
        const urlParams = new URLSearchParams(window.location.search);
        let existingQ = urlParams.get('q') || '';

        for (const [fid, state] of Object.entries(filterStates)) {
            // Find filter configuration original name
            const config = filtersConfig.find(f => f.id == fid || f.id === fid);
            if (!config) continue;

            const filterLabel = config.original_name || config.label;

            if (state.type === 'checkboxes') {
                if (state.selected && state.selected.length > 0) {
                    // For multiple values in PrestaShop faceted search: "Rodzaj+drukarki-kopiarka-laserowa" or separate parts
                    // We join options with '-'
                    const valuesJoined = state.selected.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                    queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                }
            } else if (state.type === 'slider') {
                // Check if slider range has been changed from initial limits
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    // Find all product features values that match this range to pass them as exact option values
                    const matchedValues = [];
                    products.forEach(p => {
                        const featVal = getFeatureValue(p, fid);
                        if (featVal) {
                            const num = parseNumber(featVal);
                            if (num >= state.currentMin && num <= state.currentMax) {
                                if (!matchedValues.includes(featVal)) {
                                    matchedValues.push(featVal);
                                }
                            }
                        }
                    });

                    if (matchedValues.length > 0) {
                        const valuesJoined = matchedValues.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                        queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                    }
                }
            } else if (state.type === 'size_split') {
                // Check if dimensions range has been changed from initial limits
                if (state.currentMinW > state.minW || state.currentMaxW < state.maxW ||
                    state.currentMinH > state.minH || state.currentMaxH < state.maxH) {
                    // Match the 2D size split dimensions to corresponding existing values
                    const matchedValues = [];
                    products.forEach(p => {
                        const featVal = getFeatureValue(p, fid);
                        if (featVal) {
                            const size = parseSizeSplit(featVal);
                            if (size.w >= state.currentMinW && size.w <= state.currentMaxW &&
                                size.h >= state.currentMinH && size.h <= state.currentMaxH) {
                                if (!matchedValues.includes(featVal)) {
                                    matchedValues.push(featVal);
                                }
                            }
                        }
                    });

                    if (matchedValues.length > 0) {
                        const valuesJoined = matchedValues.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                        queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                    }
                }
            } else if (fid === 'price') {
                // Check if price range has been changed from initial limits
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    // PrestaShop handles price with: "Cena-PLN-10-50"
                    queryParts.push(`Cena-${state.currentMin.toFixed(2)}-${state.currentMax.toFixed(2)}`);
                }
            }
        }

        const newUrl = new URL(window.location.href);
        if (queryParts.length > 0) {
            // Native format: ?q=FeatureName-Value1-Value2/AnotherFeature-Value3
            const qValue = queryParts.join('/');
            newUrl.searchParams.set('q', qValue);
        } else {
            newUrl.searchParams.delete('q');
        }

        console.log("LabelConfigurator Redirecting to URL:", newUrl.toString());
        window.location.href = newUrl.toString();
    }

    // Dynamic Server-Side AJAX Filtering
    function applyFilters() {
        // Since we are forcing applyFiltersByRedirect, let's keep applyFilters as a fallback local w/o redirect for counting
        applyFiltersLocally();
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
        console.log("LabelConfigurator: Updating UI with filtered products count:", filtered.length);

        // Check if there is a "q" parameter active in URL. If not, we do not hide any products.
        const urlParams = new URLSearchParams(window.location.search);
        const hasQ = urlParams.has('q');

        // If we mapped theme cards successfully, use them directly (most reliable)
        if (mappedThemeCards && mappedThemeCards.length > 0) {
            let visibleCount = 0;
            mappedThemeCards.forEach(item => {
                const isMatched = !hasQ || filtered.some(fp => fp.id_product == item.product.id_product);

                // Find bootstrap grid column or wrapper element to hide/show
                let displayElement = item.el;
                let parent = item.el.parentElement;
                if (parent) {
                    const classes = Array.from(parent.classList);
                    const isCol = classes.some(c => c.startsWith('col-') || c === 'product-miniature-wrapper' || c.includes('product-miniature-wrapper'));
                    if (isCol) {
                        displayElement = parent;
                    } else {
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
                    displayElement.style.setProperty('display', '', 'important');
                    visibleCount++;
                } else {
                    displayElement.style.setProperty('display', 'none', 'important');
                }
            });

            // Update all badge counts
            document.querySelectorAll('.badge-count').forEach(el => {
                el.textContent = hasQ ? visibleCount : products.length;
            });
            return;
        }

        // Fallback: search DOM if theme cards were not pre-mapped
        const cardSelectors = [
            '.product-miniature',
            '.js-product-miniature',
            '.product-miniature-wrapper',
            '.product-preview',
            'article.product-miniature',
            '.products .product',
            '.products article'
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
                    const isMatched = !hasQ || filtered.some(fp => fp.id_product == productId);

                    let displayElement = cardEl;
                    let parent = cardEl.parentElement;
                    if (parent) {
                        const classes = Array.from(parent.classList);
                        const isCol = classes.some(c => c.startsWith('col-') || c === 'product-miniature-wrapper' || c.includes('product-miniature-wrapper'));
                        if (isCol) {
                            displayElement = parent;
                        } else {
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
                        displayElement.style.setProperty('display', '', 'important');
                        visibleCount++;
                    } else {
                        displayElement.style.setProperty('display', 'none', 'important');
                    }
                }
            });

            // Update all badge counts
            document.querySelectorAll('.badge-count').forEach(el => {
                el.textContent = hasQ ? visibleCount : products.length;
            });
        }
    }

    function setupPillsEvents(parentEl, id, state, searchInputId, containerId, trigger) {
        const searchInput = parentEl.querySelector(`#${searchInputId}`);
        const container = parentEl.querySelector(`#${containerId}`);

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
                    const container = dynamicFiltersContainer.querySelector(`#list-${fid}`);
                    const trigger = dynamicFiltersContainer.querySelector(`#trigger-${fid}`);
                    if (container) {
                        updatePillsRender(fid, state, container, trigger);
                    }
                }
            }
        }
    }

    btnResetAll.addEventListener('click', () => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('q');
        window.location.href = newUrl.toString();
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

    // Parse current URL 'q' parameter to populate selected filters on load
    function parseActiveFiltersFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const qVal = urlParams.get('q');
        if (!qVal) return;

        const parts = qVal.split('/');
        parts.forEach(part => {
            const separatorIndex = part.indexOf('-');
            if (separatorIndex === -1) return;

            const paramName = part.substring(0, separatorIndex).replace(/\+/g, ' ').trim();
            const paramValuesJoined = part.substring(separatorIndex + 1).replace(/\+/g, ' ');

            // Find matching filter config by label or original_name
            const config = filtersConfig.find(f => f.original_name === paramName || f.label === paramName);
            if (!config) return;

            const fid = config.id;
            const state = filterStates[fid];
            if (!state) return;

            if (state.type === 'checkboxes') {
                // Split back selected options
                const values = paramValuesJoined.split('-');
                state.selected = values;

                // Update Trigger Text dynamically
                const trigger = dynamicFiltersContainer.querySelector(`#trigger-${fid}`);
                if (trigger) {
                    const triggerText = trigger.querySelector('.lc-trigger-text');
                    if (triggerText) {
                        triggerText.textContent = state.selected.join(', ');
                    }
                }
            } else if (state.type === 'slider' && fid !== 'price') {
                // Handle slider range min/max estimation based on matched values if any
                const values = paramValuesJoined.split('-');
                if (values.length > 0) {
                    const parsedNums = values.map(v => parseNumber(v));
                    state.currentMin = Math.min(...parsedNums);
                    state.currentMax = Math.max(...parsedNums);

                    const minRange = dynamicFiltersContainer.querySelector(`#min-${fid}`);
                    const maxRange = dynamicFiltersContainer.querySelector(`#max-${fid}`);
                    const minValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-min`);
                    const maxValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-max`);

                    if (minRange) minRange.value = state.currentMin;
                    if (maxRange) maxRange.value = state.currentMax;
                    if (minValInput) minValInput.value = state.currentMin;
                    if (maxValInput) maxValInput.value = state.currentMax;
                }
            } else if (state.type === 'size_split') {
                const values = paramValuesJoined.split('-');
                if (values.length > 0) {
                    const parsedSizes = values.map(v => parseSizeSplit(v));
                    const widths = parsedSizes.map(s => s.w);
                    const heights = parsedSizes.map(s => s.h);

                    state.currentMinW = Math.min(...widths);
                    state.currentMaxW = Math.max(...widths);
                    state.currentMinH = Math.min(...heights);
                    state.currentMaxH = Math.max(...heights);

                    const minWRange = dynamicFiltersContainer.querySelector(`#min-${fid}-w`);
                    const maxWRange = dynamicFiltersContainer.querySelector(`#max-${fid}-w`);
                    const minWValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-w-min`);
                    const maxWValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-w-max`);

                    const minHRange = dynamicFiltersContainer.querySelector(`#min-${fid}-h`);
                    const maxHRange = dynamicFiltersContainer.querySelector(`#max-${fid}-h`);
                    const minHValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-h-min`);
                    const maxHValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-h-max`);

                    if (minWRange) minWRange.value = state.currentMinW;
                    if (maxWRange) maxWRange.value = state.currentMaxW;
                    if (minWValInput) minWValInput.value = Math.round(state.currentMinW);
                    if (maxWValInput) maxWValInput.value = Math.round(state.currentMaxW);

                    if (minHRange) minHRange.value = state.currentMinH;
                    if (maxHRange) maxHRange.value = state.currentMaxH;
                    if (minHValInput) minHValInput.value = Math.round(state.currentMinH);
                    if (maxHValInput) maxHValInput.value = Math.round(state.currentMaxH);
                }
            } else if (fid === 'price') {
                // PrestaShop format: Cena-PLN-10.00-50.00 or similar
                const values = paramValuesJoined.split('-');
                if (values.length >= 2) {
                    state.currentMin = parseFloat(values[0]) || state.min;
                    state.currentMax = parseFloat(values[1]) || state.max;

                    const minRange = dynamicFiltersContainer.querySelector(`#min-price`);
                    const maxRange = dynamicFiltersContainer.querySelector(`#max-price`);
                    const minValInput = dynamicFiltersContainer.querySelector(`#val-price-min`);
                    const maxValInput = dynamicFiltersContainer.querySelector(`#val-price-max`);

                    if (minRange) minRange.value = state.currentMin;
                    if (maxRange) maxRange.value = state.currentMax;
                    if (minValInput) minValInput.value = state.currentMin.toFixed(2);
                    if (maxValInput) maxValInput.value = state.currentMax.toFixed(2);
                }
            }
        });
    }

    parseActiveFiltersFromUrl();
    updateAllCheckboxesPills();

    // Since products might be loaded asynchronously or theme cards rendered via other scripts, execute map retry after a short delay
    setTimeout(() => {
        console.log("LabelConfigurator: Retrying theme products detection...");
        detectThemeProducts();
        applyFiltersLocally(); // Local apply only for count badge update on page load
    }, 1500);
});