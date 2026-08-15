<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Config\Config;

/**
 * Sidebar menus: the MediaWiki:Sidebar portlets, the toolbox and the language
 * portlet, arranged around the optional wikitext MenuSidebar.
 */
class ArknightsComponentMainMenu implements ArknightsComponent {

	/** Portlet id MediaWiki assigns to the TOOLBOX sidebar entry */
	public const TOOLBOX_ID = 'p-tb';

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
		$toolbox = null;
		foreach ( $portlets as $portlet ) {
			$id = $portlet['id'] ?? '';
			if ( $id === self::TOOLBOX_ID ) {
				$toolbox = $portlet;
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

		$toolboxData = null;
		if ( $toolbox !== null ) {
			$toolboxData = ( new ArknightsComponentMenu( $toolbox ) )->getTemplateData();
			$toolboxData['class'] = trim( ( $toolboxData['class'] ?? '' ) . ' ak-menu-portlet--toolbox' );
			if ( $toolboxData['is-empty'] ) {
				$toolboxData = null;
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
			'data-toolbox' => $toolboxData,
			'data-languages' => $languages,
			'has-menu-sidebar' => !empty( $this->menuSidebarData ),
		];
	}
}
