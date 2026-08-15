<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

/**
 * Component interface for skin-modified template data
 *
 * @internal
 */
interface ArknightsComponent {

	public function getTemplateData(): array;
}
