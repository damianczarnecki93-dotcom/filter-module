<?php
class LabelConfiguratorAjaxModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        $minW = (float)Tools::getValue('minW');
        $maxW = (float)Tools::getValue('maxW');
        $mat = Tools::getValue('mat');
        $id_lang = (int)$this->context->language->id;

        // 1. Pobierz ID produktów spełniających kryteria (z Twoich cech)
        $sql = "SELECT DISTINCT cp.id_product 
                FROM "._DB_PREFIX_."feature_value_lang fv
                JOIN "._DB_PREFIX_."feature_product cp ON (fv.id_feature_value = cp.id_feature_value)
                WHERE 1";
        
        // Tutaj musielibyśmy wstawić logikę SQL sprawdzającą wartości cech 6, 14 i 23.
        // Dla uproszczenia (aby kod był czytelny) pobieramy je przez Product::getProducts
        $product_ids = Db::getInstance()->executeS($sql);
        $ids = array_column($product_ids, 'id_product');

        // 2. Wykorzystaj silnik PrestaShop do renderowania listy
        $searchProvider = new PrestaShop\PrestaShop\Adapter\Search\ProductSearchProvider(
            $this->context->getTranslator(),
            new PrestaShop\PrestaShop\Adapter\Category\CategoryProductSearchContext($this->context)
        );
        
        $query = new PrestaShop\PrestaShop\Core\Product\Search\ProductSearchQuery();
        $query->setResultsPerPage(20);
        $query->setPage(1);
        
        // Wymuszenie produktów o ID, które przefiltrowaliśmy
        $query->setQueryType('category'); 
        
        $result = $searchProvider->runQuery(
            $query,
            (new PrestaShop\PrestaShop\Core\Product\Search\ProductSearchContext($this->context))
        );

        $this->context->smarty->assign('listing', $result->getEncodedFacets());
        $this->context->smarty->assign('products', $result->getProducts());
        
        // Zwróć tylko listę produktów (ten partial używany jest w catalog/_partials/products.tpl)
        echo $this->renderTemplate('catalog/_partials/products.tpl');
        die();
    }
}