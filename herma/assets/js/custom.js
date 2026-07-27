/* ==========================================================================
   OBSŁUGA ROZWIJANIA OPISÓW KATEGORII (TYLKO SMARTFONY)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function() {
    var readMoreBtn = document.getElementById('readMoreBtn');
    var descContent = document.getElementById('category-description-content');

    // Uruchom tylko jeśli elementy istnieją i NIE jesteśmy na stronie głównej
    if (readMoreBtn && descContent && document.body.id !== 'index') {

        function checkAndHideButton() {
            var isMobile = window.innerWidth <= 767;

            // 1. Jeśli to komputer (desktop), całkowicie wyłącz mechanizm
            if (!isMobile) {
                readMoreBtn.style.display = 'none';
                descContent.classList.remove('content-collapsed');
                descContent.classList.add('content-expanded');
                return; // Zakończ sprawdzanie
            }

            // 2. Logika TYLKO dla smartfonów
            var currentMaxHeight = 100;

            // Jeśli tekst jest bardzo krótki (np. 1 linijka), ukryj przycisk nawet na smartfonie
            if (descContent.scrollHeight <= (currentMaxHeight + 5)) {
                readMoreBtn.style.display = 'none';
                descContent.classList.remove('content-collapsed');
            } else {
                // Tekst jest długi - pokaż przycisk ucinania
                readMoreBtn.style.display = 'flex';
                if (!descContent.classList.contains('content-expanded')) {
                    descContent.classList.add('content-collapsed');
                }
            }
        }

        // Uruchom sprawdzanie przy starcie strony
        checkAndHideButton();

        // Uruchom ponownie, gdy ktoś obróci telefon lub zmniejszy okno na komputerze
        window.addEventListener('resize', checkAndHideButton);

        // Obsługa kliknięcia w przycisk
        readMoreBtn.addEventListener('click', function() {
            if (descContent.classList.contains('content-collapsed')) {
                // ROZWIŃ
                descContent.classList.remove('content-collapsed');
                descContent.classList.add('content-expanded');
                readMoreBtn.classList.add('is-open');
                readMoreBtn.innerHTML = 'Zwiń opis <i class="material-icons">keyboard_arrow_up</i>';
            } else {
                // ZWIŃ
                descContent.classList.remove('content-expanded');
                descContent.classList.add('content-collapsed');
                readMoreBtn.classList.remove('is-open');
                readMoreBtn.innerHTML = 'Czytaj pełny opis <i class="material-icons">keyboard_arrow_down</i>';
            }
        });
    }
});

/* ==========================================================================
   DOPASOWANIE WIDOCZNOŚCI WYSZUKIWARKI NA MOBILE
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function() {
    if (window.innerWidth <= 767) {
        var headerTop = document.querySelector('#header .header-top');
        var searchWidget = document.querySelector('.search-widget');

        if (headerTop && searchWidget) {
            // Wymuszenie widoczności poprzez zmianę struktury DOM
            searchWidget.style.display = 'block';
            searchWidget.style.setProperty('display', 'block', 'important');
            searchWidget.style.visibility = 'visible';
            searchWidget.style.opacity = '1';

            // Jeśli wyszukiwarka była ukryta wewnątrz innej klasy,
            // przenosimy ją bezpośrednio do header-top
            if (searchWidget.parentNode !== headerTop) {
                headerTop.appendChild(searchWidget);
            }
        }
    }
});

/* ==========================================================================
   ROZWIJANIE KATEGORII W PANELU BOCZNYM (MOBILE <= 767px)
   ========================================================================== */
(function() {
    let limitInitialized = false;

    function initMainCategoryToggle() {
        if (window.innerWidth >= 768) return;
        if (limitInitialized) return; // Zabezpieczenie przed wielokrotnym nakładaniem triggera

        const container = document.querySelector('#categories_block_left.verticalblockcategories');
        const list = container ? container.querySelector('ul.block_content') : null;

        if (!container || !list || document.querySelector('.category-expand-trigger')) return;

        const items = list.querySelectorAll(':scope > li');
        const limit = 5;

        if (items.length > limit) {
            limitInitialized = true;
            // Włączamy domyślne ucinanie do 5 elementów i gradient
            list.classList.add('js-limit-active', 'has-fade-effect');

            // Tworzymy przycisk na dole modułu
            const expandBtn = document.createElement('div');
            expandBtn.className = 'category-expand-trigger';
            expandBtn.innerHTML = 'Rozwiń kategorie <span class="expand-arrow"></span>';
            container.appendChild(expandBtn);

            // Obsługa kliknięcia (zarówno myszką jak i dotykiem)
            const toggleAction = function(e) {
                e.preventDefault();
                e.stopPropagation(); // Blokuje skrypty zamykające przy kliknięciu poza listę

                const isOpen = expandBtn.classList.contains('is-open');
                if (!isOpen) {
                    list.classList.remove('js-limit-active', 'has-fade-effect');
                    expandBtn.innerHTML = 'Zwiń kategorie <span class="expand-arrow"></span>';
                    expandBtn.classList.add('is-open');
                } else {
                    list.classList.add('js-limit-active', 'has-fade-effect');
                    expandBtn.innerHTML = 'Rozwiń kategorie <span class="expand-arrow"></span>';
                    expandBtn.classList.remove('is-open');
                    container.scrollIntoView({ behavior: 'smooth' });
                }
            };

            expandBtn.addEventListener('click', toggleAction);
            expandBtn.addEventListener('touchstart', toggleAction, { passive: false });
        }
    }

    // Wywołanie odporne na asynchroniczne ładowanie Presty - ograniczenie narzutu przez MutationObserver
    document.addEventListener('DOMContentLoaded', initMainCategoryToggle);
    window.addEventListener('load', initMainCategoryToggle);

    // Optymalizacja obserwatora: uruchamia się tylko, gdy kontener kategorii pojawia się w DOM
    const mainObserver = new MutationObserver(function(mutations, observer) {
        if (document.querySelector('#categories_block_left.verticalblockcategories')) {
            initMainCategoryToggle();
            if (limitInitialized) {
                observer.disconnect(); // Gdy pomyślnie zainicjalizowano, odłączamy obserwatora!
            }
        }
    });
    mainObserver.observe(document.body, { childList: true, subtree: true });

    initMainCategoryToggle();
})();

/* ==========================================================================
   STRZAŁKA POWROTU DO STRONY GŁÓWNEJ PRZY TYTULE KATEGORII
   ========================================================================== */
(function() {
    let arrowInjected = false;

    function injectHermaArrow() {
        if (arrowInjected) return;

        // 1. Warunek: Jeśli jesteśmy na stronie głównej, nie dodawaj strzałki
        if (window.location.pathname === '/' || window.location.href === 'https://herma-polska.pl' || window.location.href === 'https://herma-polska.pl/') {
            return;
        }

        // Szukamy nagłówka Twojego modułu kategorii
        const categoryHeader = document.querySelector(
            '#categories_block_left.verticalblockcategories .title_block, ' +
            '#categories_block_left.verticalblockcategories h4, ' +
            '.block-categories .title-block, ' +
            '.block-categories .h6, ' +
            '#verticalblockcategories .title_block, ' +
            '#verticalblockcategories h2'
        );

        // Jeśli nagłówek istnieje i strzałka nie została jeszcze dodana
        if (categoryHeader && !document.querySelector('.herma-title-back-arrow')) {
            arrowInjected = true;
            // Tworzymy link ze strzałką kierujący do strony głównej
            const arrowLink = document.createElement('a');
            arrowLink.href = 'https://herma-polska.pl';
            arrowLink.className = 'herma-title-back-arrow';
            arrowLink.innerHTML = '← '; // Możesz zmienić znak strzałki (np. ❮ lub &larr;)
            arrowLink.title = 'Powrót do strony głównej';

            // Wstawiamy strzałkę na sam początek tekstu w nagłówku
            categoryHeader.insertBefore(arrowLink, categoryHeader.firstChild);
        }
    }

    // Uruchomienie na starcie i przez obserwatora
    injectHermaArrow();
    window.addEventListener('load', injectHermaArrow);

    // Optymalizacja: odłączanie obserwatora, gdy strzałka została wstrzyknięta
    const observer = new MutationObserver(function(mutations, obs) {
        injectHermaArrow();
        if (arrowInjected) {
            obs.disconnect(); // Oszczędność zasobów - wyłączamy niepotrzebne obserwowanie body
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

/* ==========================================================================
   PRZENOSZENIE NAWIGACJI FASETOWEJ POD OPIS KATEGORII
   ========================================================================== */
(function() {
    function moveFacetedSearch() {
        // Sprawdzamy, czy jesteśmy na podstronie kategorii
        if (typeof prestashop !== 'undefined' && prestashop.page && prestashop.page.page_name === 'category') {

            // 1. Namierzamy element z filtrami
            const filters = document.getElementById('search_filters_wrapper');

            // 2. Namierzamy sekcję z produktami (jej początek, gdzie jest informacja o liczbie produktów)
            const productsSection = document.getElementById('products');

            // Jeśli znaleźliśmy filtry i miejsce docelowe (nad sekcją produktów)
            if (filters && productsSection) {
                // Warunek: Przenosimy tylko wtedy, gdy filtry nie są już na właściwym miejscu
                if (productsSection.previousElementSibling !== filters) {
                    // Wstawiamy filtry bezpośrednio przed sekcją produktów (czyli pod opisem)
                    productsSection.parentNode.insertBefore(filters, productsSection);
                }
            }
        }
    }

    // Uruchomienie przy pierwszym załadowaniu strony
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', moveFacetedSearch);
    } else {
        moveFacetedSearch();
    }

    // Ponowne uruchomienie przy filtrowaniu AJAX (PrestaShop odbudowuje listę produktów i mogłaby cofnąć zmianę)
    if (typeof prestashop !== 'undefined') {
        prestashop.on('updateProductList', function() {
            setTimeout(moveFacetedSearch, 150);
        });
    }
})();
