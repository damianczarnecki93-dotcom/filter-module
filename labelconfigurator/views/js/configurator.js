const products = {$products_json nofilter}; // Dane wstrzyknięte ze Smarty

document.addEventListener('DOMContentLoaded', () => {
    const wSlider = document.getElementById('w-slider');
    const hSlider = document.getElementById('h-slider');

    function update() {
        const w = parseInt(wSlider.value);
        const h = parseInt(hSlider.value);
        
        // Filtrowanie listy
        const filtered = products.filter(p => parseInt(p.width) >= w && parseInt(p.height) >= h);
        
        // Renderowanie listy
        document.getElementById('results').innerHTML = filtered.map(p => `<div>${p.name} (${p.width}x${p.height})</div>`).join('');
        
        // Aktualizacja podglądu w prawym rogu (SVG)
        document.getElementById('svg-viz').innerHTML = `<svg width="100" height="100"><rect width="${w/2}" height="${h/2}" style="fill:blue"/></svg>`;
    }

    wSlider.addEventListener('input', update);
    hSlider.addEventListener('input', update);
});