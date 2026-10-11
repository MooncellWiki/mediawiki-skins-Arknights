<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Skins\Arknights\ReadingPreferences;
use MessageLocalizer;

/**
 * The reading preferences form (templates/ReadingPreferences.mustache): one radio group per
 * preference, fieldset.ak-pref > .ak-seg[data-pref] > label > input.
 *
 * Rendered in two places from the same data: compact in the header panel
 * (dialog.ak-prefs-panel, opened by the glasses icon), and at full size on
 * Special:ReadingPreferences, which adds the actions row and what a no-JS submit needs.
 */
class ArknightsComponentReadingPreferences implements ArknightsComponent {

	/**
	 * @param MessageLocalizer $localizer
	 * @param ReadingPreferences $prefs
	 * @param array<string,string> $values the value to check per feature
	 * @param string $action URL the form posts to (Special:ReadingPreferences)
	 * @param array|null $actions null for the panel; for the special page: token, returnto,
	 *   returntoquery (each may be null) and href-back
	 */
	public function __construct(
		private readonly MessageLocalizer $localizer,
		private readonly ReadingPreferences $prefs,
		private readonly array $values,
		private readonly string $action,
		private readonly ?array $actions = null
	) {
	}

	public function getTemplateData(): array {
		$prefs = [];
		foreach ( $this->prefs->getOfferedFeatures() as $feature => $def ) {
			$options = [];
			foreach ( $def['options'] as $value => $msg ) {
				$options[] = [
					'value' => $value,
					'label' => $this->localizer->msg( $msg )->text(),
					'is-checked' => $value === ( $this->values[$feature] ?? null ),
				];
			}
			$prefs[] = [
				'feature' => $feature,
				'label' => $this->localizer->msg( $def['label'] )->text(),
				// .ak-seg--font: each step is shown in its own size
				'is-font-size' => $feature === 'ak-font-size',
				'array-options' => $options,
			];
		}

		return [
			'is-panel' => $this->actions === null,
			'action' => $this->action,
			'array-prefs' => $prefs,
			'data-actions' => $this->actions === null ? null : $this->actions + [
				'msg-save' => $this->localizer->msg( 'arknights-prefs-save' )->text(),
				'msg-reset' => $this->localizer->msg( 'arknights-prefs-reset' )->text(),
				'msg-back' => $this->localizer->msg( 'arknights-prefs-return' )->text(),
			],
		];
	}
}
