<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Config\Config;

/**
 * Sidebar menus: the MediaWiki:Sidebar portlets, the site tools and the language
 * portlet, arranged around the optional wikitext MenuSidebar.
 *
 * The toolbox is no longer one of them — it is rendered in the title row's "more" card
 * (ArknightsComponentPageTools). It is still dropped here so it does not fall through
 * into the sidebar as an ordinary portlet.
 */
class ArknightsComponentMainMenu implements ArknightsComponent {

	/** Portlet id MediaWiki assigns to the TOOLBOX sidebar entry */
	public const TOOLBOX_ID = 'p-tb';

	/** Portlet id of the site-level entries SkinHooks splits out of the toolbox */
	public const SITE_TOOLS_ID = 'p-site-tools';

	public function __construct(
		private readonly Config $config,
		private readonly array $sidebarData,
		private readonly array $languagesData,
		private readonly array $menuSidebarData
	) {
	}

	public function getTemplateData(): array {
		$first = $this->sidebarData['data-portlets-first'] ?? null;
		$rest = $this->sidebarData['array-portlets-rest'] ?? [];

		$hidePortlets = !empty( $this->menuSidebarData ) && !empty( $this->menuSidebarData['hide-portlets'] );

		$portlets = [];
		if ( is_array( $first ) && $first ) {
			$portlets[] = $first;
		}
		foreach ( $rest as $portlet ) {
			if ( is_array( $portlet ) ) {
				$portlets[] = $portlet;
			}
		}

		$menus = [];
		$siteTools = null;
		foreach ( $portlets as $portlet ) {
			$id = $portlet['id'] ?? '';
			// The toolbox belongs to the page, not the site: it is rendered in the title
			// row's "more" card. Skipped rather than collected — PageTools reads it
			// straight from the portlet data.
			if ( $id === self::TOOLBOX_ID ) {
				continue;
			}
			if ( $id === self::SITE_TOOLS_ID ) {
				$siteTools = $portlet;
				continue;
			}
			if ( $hidePortlets ) {
				continue;
			}
			$menu = ( new ArknightsComponentMenu( $portlet ) )->getTemplateData();
			if ( !$menu['is-empty'] ) {
				$menus[] = $menu;
			}
		}

		$siteToolsData = null;
		if ( $siteTools !== null ) {
			$siteToolsData = ( new ArknightsComponentMenu( $siteTools ) )->getTemplateData();
			// Untitled: `site-tools` is not an interface message, and the group reads as a
			// continuation of the navigation above it rather than a heading of its own.
			$siteToolsData['label'] = null;
			$siteToolsData['class'] = trim( ( $siteToolsData['class'] ?? '' ) . ' ak-menu-portlet--site-tools' );
			if ( $siteToolsData['is-empty'] ) {
				$siteToolsData = null;
			}
		}

		$languages = null;
		if ( $this->languagesData ) {
			$languages = ( new ArknightsComponentMenu( $this->languagesData ) )->getTemplateData();
			if ( $languages['is-empty'] ) {
				$languages = null;
			}
		}

		return [
			'array-portlets' => $menus,
			'data-site-tools' => $siteToolsData,
			'data-languages' => $languages,
			'has-menu-sidebar' => !empty( $this->menuSidebarData ),
		];
	}
}
