<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Config\Config;
use MediaWiki\Skins\Arknights\Menu\WikitextMenuParser;
use MessageLocalizer;

/**
 * Primary header navigation rendered from the wikitext page
 * MediaWiki:Arknights-header-nav (a `*` list; the parser marks the current
 * page with a.mw-selflink, which the skin styles as the active item).
 */
class ArknightsComponentHeaderNav implements ArknightsComponent {

	public function __construct(
		private readonly Config $config,
		private readonly MessageLocalizer $localizer,
		private readonly WikitextMenuParser $parser
	) {
	}

	public function getTemplateData(): array {
		$messageName = (string)$this->config->get( 'ArknightsHeaderNavMessage' );
		$html = $messageName !== '' ? $this->parser->parse( $messageName ) : null;
		if ( $html === null ) {
			return [];
		}
		return [
			'html-items' => $html,
			'label' => $this->localizer->msg( 'arknights-header-nav-label' )->text(),
		];
	}
}
