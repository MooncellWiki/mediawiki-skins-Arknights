<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MessageLocalizer;

/**
 * Site footer: places (about / privacy / disclaimer + hook additions), icons and
 * the optional on-wiki description / tagline messages.
 */
class ArknightsComponentFooter implements ArknightsComponent {

	public function __construct(
		private readonly MessageLocalizer $localizer,
		private readonly array $footerData
	) {
	}

	private function parseMessage( string $key ): ?string {
		$msg = $this->localizer->msg( $key )->inContentLanguage();
		if ( !$msg->exists() || $msg->isDisabled() ) {
			return null;
		}
		$html = $msg->parse();
		return trim( $html ) !== '' ? $html : null;
	}

	public function getTemplateData(): array {
		$places = $this->footerData['data-places'] ?? [];
		$icons = $this->footerData['data-icons'] ?? [];
		return [
			'data-places' => !empty( $places['array-items'] ) ? $places : null,
			'data-icons' => !empty( $icons['array-items'] ) ? $icons : null,
			'html-footer-desc' => $this->parseMessage( 'arknights-footer-desc' ),
			'html-footer-tagline' => $this->parseMessage( 'arknights-footer-tagline' ),
		];
	}
}
