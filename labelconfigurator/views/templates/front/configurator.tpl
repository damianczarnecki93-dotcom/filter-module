<div id="configurator-app">
    <div id="json-data" style="display:none;">{$products_json|escape:'html':'UTF-8'}</div>

    <div class="config-layout">
        
        <div class="config-sidebar">
            <h3>FILTRY</h3>
            
            <div class="filter-group">
                <label>Szerokość (mm):</label>
                <div class="input-range-wrapper">
                    <input type="number" class="manual-input" id="val-w-min" value="0" min="0"> 
                    <span>-</span> 
                    <input type="number" class="manual-input" id="val-w-max" value="0" min="0">
                </div>
                <div class="dual-slider">
                    <input type="range" id="min-w" value="0">
                    <input type="range" id="max-w" value="0">
                </div>
            </div>
            
            <div class="filter-group">
                <label>Wysokość (mm):</label>
                <div class="input-range-wrapper">
                    <input type="number" class="manual-input" id="val-h-min" value="0" min="0"> 
                    <span>-</span> 
                    <input type="number" class="manual-input" id="val-h-max" value="0" min="0">
                </div>
                <div class="dual-slider">
                    <input type="range" id="min-h" value="0">
                    <input type="range" id="max-h" value="0">
                </div>
            </div>
            
            <div class="filter-group">
                <label>Materiał:</label>
                <div id="material-filters" class="material-buttons">
                    <button class="mat-btn active" data-mat="all">Wszystkie</button>
                </div>
            </div>
        </div>

        <div class="config-main">
            <h3 class="results-header">Znalezione etykiety: <span id="product-count" class="badge">0</span></h3>
            <div id="product-list" class="product-grid">
                </div>
        </div>

    </div>
</div>

{literal}
<script>
function applyFilters() {
    const minW = document.getElementById('min-w').value;
    const maxW = document.getElementById('max-w').value;
    const mat = document.querySelector('.mat-btn.active').getAttribute('data-mat');

    // Pokazujemy loader (opcjonalnie)
    document.querySelector('#js-product-list').style.opacity = '0.5';

    fetch('/index.php?fc=module&module=labelconfigurator&controller=ajax&minW='+minW+'&maxW='+maxW+'&mat='+mat)
        .then(response => response.text())
        .then(html => {
            // Podmiana zawartości głównej listy produktów
            document.querySelector('#js-product-list').innerHTML = html;
            document.querySelector('#js-product-list').style.opacity = '1';
        });
}
</script>
{/literal}

<style>
    #configurator-app { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; color: #333; }
    .config-layout { display: flex; gap: 20px; align-items: flex-start; }
    
    .config-sidebar { flex: 0 0 300px; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; }
    .filter-group { margin-bottom: 25px; }
    .filter-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; }
    
    .input-range-wrapper { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .manual-input { width: 65px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; text-align: center; font-size: 14px; font-weight: bold; color: #2c7da0; }
    .manual-input:focus { outline: none; border-color: #2c7da0; box-shadow: 0 0 4px rgba(44, 125, 160, 0.3); }
    .manual-input::-webkit-outer-spin-button, .manual-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .manual-input[type=number] { -moz-appearance: textfield; }

    .dual-slider { position: relative; height: 30px; }
    .dual-slider input[type="range"] { position: absolute; width: 100%; top: 0; left: 0; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; }
    .dual-slider::before { content: ''; position: absolute; top: 12px; left: 0; right: 0; height: 6px; background: #ddd; border-radius: 3px; z-index: 1; }
    .dual-slider input[type="range"]::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 20px; height: 20px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; margin-top: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .dual-slider input[type="range"]::-moz-range-thumb { pointer-events: auto; width: 20px; height: 20px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: none; }

    .material-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .mat-btn { padding: 8px 12px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; transition: 0.2s; font-size: 13px; }
    .mat-btn:hover { background: #f0f0f0; }
    .mat-btn.active { background: #2c7da0; color: #fff; border-color: #2c7da0; font-weight: bold; }

    .config-main { flex: 1; }
    .results-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
    .badge { background: #2c7da0; color: white; padding: 4px 10px; border-radius: 20px; font-size: 14px; }
    
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    
    /* Wygląd kafelka zmieniony pod przycisk CTA */
    .product-card { 
        display: flex; flex-direction: column; justify-content: space-between;
        background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; 
        padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s;
    }
    .product-card:hover { border-color: #61b3d6; box-shadow: 0 6px 15px rgba(0,0,0,0.1); transform: translateY(-3px); }
    .card-title { font-weight: bold; font-size: 16px; color: #333; margin-bottom: 15px; line-height: 1.4; }
    .card-details { margin-bottom: 20px; flex-grow: 1; }
    .card-details p { margin: 6px 0; font-size: 13px; color: #555; }
    
    /* Przycisk CTA */
    .card-btn {
        display: block; width: 100%; text-align: center; padding: 10px; 
        background: #2c7da0; color: #fff; text-decoration: none; border-radius: 4px;
        font-weight: bold; transition: background 0.2s; box-sizing: border-box;
    }
    .card-btn:hover { background: #1f5d78; color: #fff; text-decoration: none; }
    
    @media (max-width: 768px) {
        .config-layout { flex-direction: column; }
        .config-sidebar { width: 100%; flex: auto; box-sizing: border-box; }
    }
	
    /* Układ dla lewej kolumny (wąski) */
    #configurator-app { width: 100%; font-family: Arial, sans-serif; }
    .config-layout { display: flex; flex-direction: column; gap: 15px; } /* Zmieniamy na kolumnę */
    
    .config-sidebar { width: 100%; background: #f8f9fa; padding: 15px; border-radius: 8px; box-sizing: border-box; }
    
    /* Inputy muszą być mniejsze, żeby weszły w kolumnę */
    .input-range-wrapper { flex-direction: column; align-items: flex-start; }
    .manual-input { width: 100%; box-sizing: border-box; margin-top: 5px; }
    
    .config-main { width: 100%; }
    .product-grid { grid-template-columns: 1fr; } /* Jedna kolumna produktów w głównym obszarze */
</style>