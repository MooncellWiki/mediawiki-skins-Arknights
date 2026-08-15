<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Config\Config;
use MediaWiki\Skins\Arknights\Menu\WikitextMenuParser;
use MessageLocalizer;

/**
 * Wikitext sidebar (MediaWiki:MenuSidebar / MediaWiki:MenuSidebarAfter).
 *
 * Skin-native replacement for Extension:VectorMenuSidebar: the same wikitext
 * page, parsed with the current page as context, rendered directly into the
 * sidebar without a hidden <div> + inline script moving DOM nodes around.
 *
 * Output shape (kept identical to VectorMenuSidebar so MediaWiki:MenuSidebar.css
 * / gadgets targeting it keep working):
 *   <p>Group heading</p>
 *   <ul><li><b>Non-link item</b><ul>…</ul></li><li><a>Link</a></li></ul>
 */
class ArknightsComponentMenuSidebar implements ArknightsComponent {

	public function __construct(
		private readonly Config $config,
		private readonly MessageLocalizer $localizer,
		private readonly WikitextMenuParser $parser
	) {
	}

	/**
	 * @return array Empty array when the feature is disabled or the page is missing,
	 *   otherwise: html-menu (string), html-after (string|null), label (string), hide-portlets (bool)
	 */
	public function getTemplateData(): array {
		if ( $this->config->get( 'ArknightsMenuSidebar' ) !== true ) {
			return [];
		}

		$menuHtml = $this->parser->parse( (string)$this->config->get( 'ArknightsMenuSidebarMessage' ) );
		if ( $menuHtml === null ) {
			return [];
		}

		$afterMessage = (string)$this->config->get( 'ArknightsMenuSidebarAfterMessage' );
		$afterHtml = $afterMessage !== '' ? $this->parser->parse( $afterMessage ) : null;

		return [
			'html-menu' => $menuHtml,
			'html-after' => $afterHtml,
			'label' => $this->localizer->msg( 'navigation-heading' )->text(),
			'hide-portlets' => $this->config->get( 'ArknightsMenuSidebarHidePortlets' ) === true,
		];
	}
}
