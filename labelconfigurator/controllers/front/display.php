<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);

class LabelConfiguratorDisplayModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        $id_lang = (int)$this->context->language->id;
        $id_shop = (int)$this->context->shop->id;
        $db = Db::getInstance();

        $sql = "SELECT p.id_product, pl.name 
                FROM "._DB_PREFIX_."product p
                JOIN "._DB_PREFIX_."product_lang pl ON (p.id_product = pl.id_product AND pl.id_lang = $id_lang AND pl.id_shop = $id_shop)
                JOIN "._DB_PREFIX_."product_shop ps ON (p.id_product = ps.id_product AND ps.id_shop = $id_shop)
                WHERE ps.active = 1 LIMIT 300";

        $products_raw = $db->executeS($sql);
        $results = [];

        if ($products_raw) {
            foreach ($products_raw as $p) {
                $product = new Product($p['id_product'], false, $id_lang);
                $features = $product->getFrontFeatures($id_lang);
                
                $width = 0; $height = 0; $diameter = 0;
                $material = ''; $shape = ''; $labelsPerSheet = '';
                
                foreach ($features as $f) {
                    if ($f['id_feature'] == 6) {
                        if (preg_match('/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i', $f['value'], $matches)) {
                            $width = (float)str_replace(',', '.', $matches[1]);
                            $height = (float)str_replace(',', '.', $matches[2]);
                        }
                    } elseif ($f['id_feature'] == 14) {
                        if (preg_match('/(\d+(?:[.,]\d+)?)/', $f['value'], $matches)) {
                            $diameter = (float)str_replace(',', '.', $matches[1]);
                        }
                    } elseif ($f['id_feature'] == 23) {
                        $material = $f['value'];
                    } elseif ($f['id_feature'] == 27) {
                        $shape = $f['value'];
                    } elseif ($f['id_feature'] == 15) {
                        $labelsPerSheet = $f['value'];
                    }
                }
                
                if ($width == 0 && $height == 0 && $diameter > 0) {
                    $width = $diameter;
                    $height = $diameter;
                }
                
                if ($width > 0 && $height > 0) {
                    // Generowanie linku do produktu
                    $link = $this->context->link->getProductLink((int)$p['id_product'], null, null, null, $id_lang, $id_shop);
                    
                    $results[] = [
                        'name' => $p['name'],
                        'width' => $width,
                        'height' => $height,
                        'diameter' => $diameter,
                        'material' => $material,
                        'shape' => $shape,
                        'labelsPerSheet' => $labelsPerSheet,
                        'url' => $link // Przekazujemy URL do szablonu
                    ];
                }
            }
        }

        $this->context->smarty->assign('products_json', json_encode($results));
        $this->setTemplate('module:labelconfigurator/views/templates/front/configurator.tpl');
    }
}