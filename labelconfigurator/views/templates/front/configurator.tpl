<div id="configurator-app" data-instant="{$filters_instant|intval}" data-ajax-url="{$ajax_url|escape:'html':'UTF-8'}" data-id-category="{$id_category|intval}">
    <!-- Preloaded Data for Client-Side Engine -->
    <div id="json-data" style="display:none;">{$products_json|escape:'html':'UTF-8'}</div>
    <div id="config-data" style="display:none;">{$filters_config_json|escape:'html':'UTF-8'}</div>

    <!-- Mobile Responsive Controls -->
    <button class="lc-mobile-toggle-btn" id="toggle-sidebar-mobile">
        <i class="material-icons">filter_list</i> Filtruj produkty
    </button>
    <button class="lc-mobile-fab" id="toggle-sidebar-fab" title="Filtruj produkty">
        <i class="material-icons">filter_list</i>
    </button>
    <div class="lc-sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Left Sidebar: Dynamic Filters Panel -->
    <div class="config-sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3>FILTRY <span class="badge-count header-badge">0</span></h3>
            <button class="close-sidebar-btn" id="close-sidebar">&times;</button>
        </div>

        <!-- Active Filters Tags Container -->
        <div id="active-filters-tags" class="lc-active-tags-container"></div>

        <!-- Filter Conflict Alert Container -->
        <div id="lc-filter-conflict-alert" class="lc-conflict-alert" style="display: none;"></div>

        <!-- Dynamic Filters Placeholder -->
        <div id="dynamic-filters-container">
            <!-- Built dynamically via Javascript -->
        </div>

        <!-- Action Buttons (Apply / Reset) -->
        <div class="sidebar-actions">
            <button class="btn-apply" id="btn-apply-filters" style="display: block;">Zastosuj filtry</button>
            <button class="btn-reset" id="btn-reset-all">Wyczyść filtry</button>
        </div>
    </div>
</div>

<!-- Load Google Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

<!-- Inject Configurator Javascript with Timestamp Parameter to Force Cache Busting -->
<script src="/modules/labelconfigurator/views/js/configurator.js?v={$smarty.now}" defer></script>

<style>
    #configurator-app { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; width: 100%; box-sizing: border-box; }

    /* Left Sidebar */
    .config-sidebar { width: 100%; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); box-sizing: border-box; }

    /* Filter Conflict Alert */
    .lc-conflict-alert {
        background: #fff1f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 12px;
        margin: 0 5px 15px;
        font-size: 12px;
        color: #991b1b;
        line-height: 1.5;
    }
    .sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px; }
    .sidebar-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
    .close-sidebar-btn { display: none; background: none; border: none; font-size: 28px; color: #64748b; cursor: pointer; }

    /* Accordion / Collapsible Filter Group */
    .filter-group { border-bottom: 1px solid #f1f5f9; padding: 15px 5px; }
    .filter-group:last-of-type { border-bottom: none; }

    .filter-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .filter-header label { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; cursor: pointer; pointer-events: none; }
    .filter-header .chevron { color: #64748b; font-size: 22px; transition: transform 0.2s ease; transform: rotate(0deg); }
    .filter-header.collapsed .chevron { transform: rotate(180deg); }

    .filter-body { margin-top: 15px; transition: opacity 0.2s ease-out; }
    .filter-header.collapsed + .filter-body { display: none; }

    /* Active Filters Tags styling */
    .lc-active-tags-container { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 5px 15px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
    .lc-active-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; font-size: 11px; font-weight: 600; color: #0369a1; cursor: pointer; transition: background 0.15s, color 0.15s; }
    .lc-active-tag:hover { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
    .lc-active-tag .lc-tag-close { font-size: 13px; font-weight: bold; }

    /* Custom Dropdown select-with-search styling (prefixed with lc- to prevent leaks) */
    .lc-custom-dropdown { position: relative; width: 100%; box-sizing: border-box; }

    .lc-dropdown-trigger {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 14px; background: #ffffff; border: 1px solid #cbd5e1;
        border-radius: 6px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
        font-size: 13px; font-weight: 600; color: #334155; user-select: none;
    }
    .lc-dropdown-trigger:hover { border-color: #2c7da0; }
    .lc-dropdown-trigger.open { border-color: #2c7da0; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.15); }
    .lc-dropdown-trigger .chevron { font-size: 18px; color: #64748b; transition: transform 0.2s; }
    .lc-dropdown-trigger.open .chevron { transform: rotate(180deg); }
    .lc-dropdown-trigger .lc-trigger-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }

    .lc-dropdown-menu {
        position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;
        margin-top: 4px; background: #ffffff; border: 1px solid #cbd5e1;
        border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 250px;
    }

    .lc-select-options { max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .lc-select-options::-webkit-scrollbar { width: 5px; }
    .lc-select-options::-webkit-scrollbar-track { background: #f1f5f9; }
    .lc-select-options::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    /* Custom options inside dropdown */
    .lc-select-options .lc-pill-item {
        padding: 8px 12px; border: 1px solid transparent; border-radius: 4px;
        text-align: left; justify-content: flex-start; background: #f8fafc; font-weight: 500;
        cursor: pointer; box-sizing: border-box; width: 100%; display: flex; align-items: center;
    }
    .lc-select-options .lc-pill-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .lc-select-options .lc-pill-item.active { background: #2c7da0; color: #ffffff; }

    /* In-Category Search Box inside filter lists */
    .lc-in-category-search { position: relative; width: 100%; box-sizing: border-box; }
    .lc-in-category-search input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; box-sizing: border-box; background: #f8fafc; }
    .lc-in-category-search input:focus { outline: none; border-color: #2c7da0; background: #fff; }
    .lc-in-category-search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #94a3b8; }

    /* Grid-based Color Swatch filter option styling */
    .swatch-grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 5px 0; }
    .swatch-item {
        position: relative; width: 26px; height: 26px; border-radius: 4px;
        border: 1px solid #cbd5e1; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .swatch-item:hover { transform: scale(1.15); z-index: 10; }
    .swatch-item.active { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.4); transform: scale(1.1); }

    /* Range Slider Styling */
    .input-range-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
    .manual-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 13px; font-weight: bold; color: #1e293b; box-sizing: border-box; }
    .manual-input:focus { outline: none; border-color: #2c7da0; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.15); }
    .manual-input::-webkit-outer-spin-button, .manual-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .manual-input[type=number] { -moz-appearance: textfield; }

    .dual-slider { position: relative; height: 20px; margin: 10px 0 15px; }
    .dual-slider input[type="range"] { position: absolute; width: 100%; top: 0; left: 0; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; margin: 0; z-index: 3; height: 20px; }
    .dual-slider::before { content: ''; position: absolute; top: 7px; left: 0; right: 0; height: 6px; background: #e2e8f0; border-radius: 3px; z-index: 1; }
    .dual-slider input[type="range"]::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 18px; height: 18px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 4; margin-top: 1px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-webkit-slider-thumb:hover { background: #1f5d78; }
    .dual-slider input[type="range"]::-moz-range-thumb { pointer-events: auto; width: 16px; height: 16px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 4; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-moz-range-thumb:hover { background: #1f5d78; }

    /* Action Buttons Area */
    .sidebar-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px; }

    /* Reset Button */
    .btn-reset { width: 100%; padding: 12px; background: #f1f5f9; border: none; border-radius: 6px; color: #475569; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-reset:hover { background: #e2e8f0; color: #0f172a; }

    /* Apply Button */
    .btn-apply { width: 100%; padding: 12px; background: #2c7da0; border: none; border-radius: 6px; color: #ffffff; font-weight: 700; cursor: pointer; transition: background 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-apply:hover { background: #1f5d78; }

    .badge-count { background: #2c7da0; color: white; padding: 4px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; }
    .header-badge { font-size: 12px; padding: 2px 8px; }

    /* Graphic Size Visualizer Styling */
    .lc-size-visualizer-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
    }
    .lc-size-visualizer-container {
        width: 100%;
        height: 140px;
        background: #f1f5f9;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        overflow: hidden;
        margin-bottom: 15px;
    }
    .lc-visualizer-shape {
        background: #ffffff;
        border: 2px solid #2c7da0;
        box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: width 0.3s ease, height 0.3s ease, border-radius 0.3s ease;
        position: relative;
        max-width: 90%;
        max-height: 90%;
    }
    .lc-visualizer-shape.rectangle {
        border-radius: 4px;
    }
    .lc-visualizer-shape.rounded-rectangle {
        border-radius: 12px;
    }
    .lc-visualizer-shape.circle {
        border-radius: 50%;
        aspect-ratio: 1 / 1;
    }
    .lc-shape-label {
        font-size: 11px;
        font-weight: 700;
        color: #1e293b;
        text-align: center;
        user-select: none;
    }
    .lc-dimension-indicator-w {
        position: absolute;
        bottom: -22px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
    }
    .lc-dimension-indicator-h {
        position: absolute;
        right: -45px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
    }

    /* Graphical interactive selector switcher buttons */
    .lc-shape-toggle-buttons {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
    }
    .lc-shape-toggle-btn {
        flex: 1;
        padding: 6px 10px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
    }
    .lc-shape-toggle-btn.active {
        background: #2c7da0;
        border-color: #2c7da0;
        color: #ffffff;
    }

    /* Combo box design */
    .lc-combo-box {
        position: relative;
        width: 100%;
        margin-bottom: 12px;
    }
    .lc-combo-label {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        display: block;
        margin-bottom: 4px;
    }
    .lc-combo-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }
    .lc-combo-input {
        width: 100%;
        padding: 8px 32px 8px 10px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        box-sizing: border-box;
    }
    .lc-combo-input:focus {
        outline: none;
        border-color: #2c7da0;
        box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.15);
    }
    .lc-combo-toggle {
        position: absolute;
        right: 8px;
        cursor: pointer;
        color: #64748b;
        user-select: none;
        font-size: 18px;
        transition: transform 0.2s;
    }
    .lc-combo-toggle.open {
        transform: rotate(180deg);
    }
    .lc-combo-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1010;
        max-height: 140px;
        overflow-y: auto;
        display: none;
        margin-top: 4px;
    }
    .lc-combo-dropdown.open {
        display: block;
    }
    .lc-combo-option {
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
    }
    .lc-combo-option:hover {
        background: #f1f5f9;
        color: #0f172a;
    }
    .lc-combo-option.active {
        background: #2c7da0;
        color: #ffffff;
    }

    /* Suggestions styling */
    .lc-size-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
        margin-bottom: 12px;
    }
    .lc-suggestions-title {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        width: 100%;
        margin-bottom: 4px;
    }
    .lc-suggestion-badge {
        padding: 4px 8px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .lc-suggestion-badge:hover {
        background: #e2e8f0;
        border-color: #94a3b8;
        color: #0f172a;
    }
    .lc-suggestion-badge.exact {
        background: #e0f2fe;
        border-color: #7dd3fc;
        color: #0369a1;
    }
    .lc-suggestion-badge.exact:hover {
        background: #bae6fd;
    }
    .lc-suggestion-badge.active {
        background: #2c7da0;
        border-color: #2c7da0;
        color: #ffffff;
    }

    /* Mobile Toggle and FAB Styling */
    .lc-mobile-toggle-btn {
        display: none;
        width: 100%;
        padding: 12px;
        background: #2c7da0;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        margin-bottom: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        transition: background 0.2s;
    }
    .lc-mobile-toggle-btn:hover, .lc-mobile-toggle-btn:focus {
        background: #1f5d78;
        color: #fff;
        text-decoration: none;
    }

    .lc-mobile-fab {
        display: none;
        position: fixed;
        bottom: 25px;
        right: 25px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #2c7da0;
        border: none;
        color: #fff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        z-index: 9998;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
    }
    .lc-mobile-fab:hover {
        background: #1f5d78;
    }
    .lc-mobile-fab:active {
        transform: scale(0.9);
    }

    /* Mobile Overlay Backdrop */
    .lc-sidebar-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 9998;
        backdrop-filter: blur(2px);
    }

    /* Media queries for Responsiveness */
    @media (max-width: 991px) {
        .lc-mobile-toggle-btn { display: flex; }
        .lc-mobile-fab { display: flex; }

        .config-sidebar {
            position: fixed;
            top: 0;
            left: -350px;
            width: 310px;
            height: 100%;
            z-index: 9999;
            overflow-y: auto;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 25px rgba(0, 0, 0, 0.15);
            border-radius: 0 12px 12px 0;
            border: none;
            padding: 20px 15px;
        }

        .config-sidebar.open {
            left: 0;
        }

        .close-sidebar-btn {
            display: block;
            background: #f1f5f9;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            font-size: 24px;
            color: #475569;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .close-sidebar-btn:hover {
            background: #e2e8f0;
        }
    }
</style>