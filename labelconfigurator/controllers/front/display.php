<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

class LabelConfiguratorDisplayModuleFrontController extends ModuleFrontController
{
    public function setMedia()
    {
        parent::setMedia();
        $this->registerJavascript(
            'module-labelconfigurator-js',
            'modules/labelconfigurator/views/js/configurator.js',
            ['position' => 'bottom', 'priority' => 150]
        );
    }

    public function initContent()
    {
        parent::initContent();

        // Get products via module's getFilteredProductsData method
        $results = $this->module->getFilteredProductsData();

        $this->context->smarty->assign('products_json', json_encode($results));
        $this->setTemplate('module:labelconfigurator/views/templates/front/configurator.tpl');
    }
}
