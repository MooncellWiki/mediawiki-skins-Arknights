<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use Countable;

/**
 * Normalises a portlet data array (Skin::getPortletData()) so that Menu.mustache
 * can render it without guarding every key.
 */
class ArknightsComponentMenu implements ArknightsComponent, Countable {

	public function __construct(
		private readonly array $data
	) {
	}

	/**
	 * Number of items in the menu.
	 */
	public function count(): int {
		$items = $this->data['array-list-items'] ?? null;
		if ( is_array( $items ) ) {
			return count( $items );
		}
		return substr_count( $this->data['html-items'] ?? '', '<li' );
	}

	public function getTemplateData(): array {
		$data = $this->data + [
			'id' => '',
			'class' => null,
			'label' => null,
			'html-tooltip' => '',
			'label-class' => null,
			'html-before-portal' => '',
			'html-items' => '',
			'html-after-portal' => '',
			'array-list-items' => null,
			'is-empty' => $this->count() === 0 && ( $this->data['html-after-portal'] ?? '' ) === '',
		];
		// MediaWiki's Mustache runtime treats '' as truthy in {{#sections}}: normalise optionals to null
		foreach ( [ 'class', 'label', 'label-class' ] as $key ) {
			if ( $data[$key] === '' ) {
				$data[$key] = null;
			}
		}
		return $data;
	}
}
