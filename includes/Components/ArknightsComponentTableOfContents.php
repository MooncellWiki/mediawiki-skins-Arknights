<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Config\Config;

/**
 * Enriches MediaWiki core's data-toc with skin-specific flags.
 */
class ArknightsComponentTableOfContents implements ArknightsComponent {

	public function __construct(
		private readonly array $tocData,
		private readonly Config $config
	) {
	}

	public function getTemplateData(): array {
		$sections = $this->tocData['array-sections'] ?? [];
		if ( !$sections ) {
			return [];
		}
		$count = (int)( $this->tocData['number-section-count'] ?? 0 );
		return $this->tocData + [
			'is-collapse-sections-enabled' =>
				count( $sections ) > 3 &&
				$count >= (int)$this->config->get( 'ArknightsTableOfContentsCollapseAtCount' ),
		];
	}
}
