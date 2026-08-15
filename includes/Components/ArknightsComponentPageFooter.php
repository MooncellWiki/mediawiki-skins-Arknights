<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

/**
 * Last-modified / credits / copyright block rendered under the article body
 * (data-footer.data-info from core).
 */
class ArknightsComponentPageFooter implements ArknightsComponent {

	public function __construct(
		private readonly array $footerInfoData
	) {
	}

	public function getTemplateData(): array {
		$items = [];
		foreach ( $this->footerInfoData['array-items'] ?? [] as $item ) {
			if ( !is_array( $item ) || ( $item['html'] ?? '' ) === '' ) {
				continue;
			}
			$items[] = [
				'id' => $item['id'] ?? '',
				'name' => $item['name'] ?? '',
				'html' => $item['html'],
			];
		}
		return $items ? [
			'id' => $this->footerInfoData['id'] ?? 'footer-info',
			'array-items' => $items,
		] : [];
	}
}
