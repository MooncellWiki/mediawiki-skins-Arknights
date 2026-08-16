<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Hooks;

use MediaWiki\Config\Config;
use MediaWiki\ResourceLoader as RL;
use MediaWiki\Skins\Arknights\SkinArknights;

/**
 * Hooks relating to ResourceLoader
 */
class ResourceLoaderHooks {

	/**
	 * Config exposed to skins.arknights.scripts (config.json virtual file).
	 *
	 * @param RL\Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getSkinResourceLoaderConfig( RL\Context $context, Config $config ): array {
		return [
			'wgArknightsThemeDefault' => SkinArknights::normalizeTheme( $config->get( 'ArknightsThemeDefault' ) ),
			'wgArknightsEnableThemeToggle' => (bool)$config->get( 'ArknightsEnableThemeToggle' ),
			'wgArknightsSidebarFlyout' => (bool)$config->get( 'ArknightsSidebarFlyout' ),
			'wgArknightsTableOfContentsCollapseAtCount' => (int)$config->get( 'ArknightsTableOfContentsCollapseAtCount' ),
			'wgArknightsSearchPalette' => (bool)$config->get( 'ArknightsSearchPalette' ),
		];
	}

}
