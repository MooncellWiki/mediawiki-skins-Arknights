<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights;

use MediaWiki\Config\Config;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\User;

/**
 * Reading preferences: appearance, section collapsing, text size and table text size,
 * offered in the header's panel and on Special:ReadingPreferences (prts-design docs site,
 * /chrome/prefs).
 *
 * Each one is a single class on <html> in MediaWiki's clientPrefs format,
 * `<feature>-clientpref-<value>`, and that class is all the design system reads: tokens.css
 * for the theme, base/sections.css with sections.js, base/typography.css, base/tables.css.
 *
 * Where the value a page is shown with comes from, first match wins:
 *   1. the browser — inline.js swaps in what the visitor picked (localStorage, one
 *      "feature-clientpref-value,…" string, the format of core's cookie) before the first
 *      paint. The panel writes there for everyone, logged in or not (clientPrefs.js);
 *   2. for logged-in users, the user option of the same name, which the no-JS form of the
 *      special page saves;
 *   3. the default.
 * The server can only do 2 and 3, so logged-out page views always carry the defaults and
 * stay cacheable.
 */
final class ReadingPreferences {

	/**
	 * feature => label message and value => option message, in the order they are offered.
	 * The values must match DEFAULTS in resources/design-system/client-prefs.js.
	 */
	public const FEATURES = [
		'skin-theme' => [
			'label' => 'arknights-appearance',
			'options' => [
				'os' => 'arknights-theme-os',
				'day' => 'arknights-theme-day',
				'night' => 'arknights-theme-night',
			],
		],
		'ak-sections-on' => [
			'label' => 'arknights-prefs-sections-on',
			'options' => [
				'mobile' => 'arknights-prefs-sections-on-mobile',
				'all' => 'arknights-prefs-sections-on-all',
				'off' => 'arknights-prefs-sections-on-off',
			],
		],
		'ak-sections' => [
			'label' => 'arknights-prefs-sections',
			'options' => [
				'expand' => 'arknights-prefs-sections-expand',
				'collapse' => 'arknights-prefs-sections-collapse',
			],
		],
		'ak-font-size' => [
			'label' => 'arknights-prefs-font-size',
			'options' => [
				'xsmall' => 'arknights-prefs-font-size-xsmall',
				'small' => 'arknights-prefs-font-size-small',
				'regular' => 'arknights-prefs-font-size-regular',
				'large' => 'arknights-prefs-font-size-large',
			],
		],
		'ak-table-font-size' => [
			'label' => 'arknights-prefs-table-font-size',
			'options' => [
				'auto' => 'arknights-prefs-table-font-size-auto',
				'xsmall' => 'arknights-prefs-font-size-xsmall',
			],
		],
	];

	/** Defaults other than the theme's, which is $wgArknightsThemeDefault */
	private const DEFAULTS = [
		'ak-sections-on' => 'mobile',
		'ak-sections' => 'expand',
		'ak-font-size' => 'regular',
		'ak-table-font-size' => 'auto',
	];

	public function __construct(
		private readonly Config $config,
		private readonly UserOptionsLookup $userOptionsLookup
	) {
	}

	/**
	 * The features offered, in order. The theme only while $wgArknightsEnableThemeToggle is
	 * on — the class is still output with its default either way.
	 *
	 * @return array<string,array{label:string,options:array<string,string>}>
	 */
	public function getOfferedFeatures(): array {
		$features = self::FEATURES;
		if ( $this->config->get( 'ArknightsEnableThemeToggle' ) !== true ) {
			unset( $features['skin-theme'] );
		}
		return $features;
	}

	public function getDefault( string $feature ): string {
		if ( $feature === 'skin-theme' ) {
			return SkinArknights::normalizeTheme( $this->config->get( 'ArknightsThemeDefault' ) );
		}
		return self::DEFAULTS[$feature];
	}

	public static function isValid( string $feature, mixed $value ): bool {
		return is_string( $value ) && isset( self::FEATURES[$feature]['options'][$value] );
	}

	/**
	 * What the server knows of the user's choices (steps 2 and 3 above).
	 *
	 * @param User $user
	 * @return array<string,string> feature => value, for every feature
	 */
	public function getValues( User $user ): array {
		$values = [];
		foreach ( array_keys( self::FEATURES ) as $feature ) {
			$values[$feature] = $this->getDefault( $feature );
		}
		if ( !$user->isNamed() ) {
			return $values;
		}
		foreach ( array_keys( self::FEATURES ) as $feature ) {
			$stored = $this->userOptionsLookup->getOption( $user, $feature );
			if ( self::isValid( $feature, $stored ) ) {
				$values[$feature] = $stored;
			}
		}
		return $values;
	}

	/**
	 * <html> classes for getValues()
	 *
	 * @param User $user
	 * @return string[]
	 */
	public function getHtmlClasses( User $user ): array {
		$classes = [];
		foreach ( $this->getValues( $user ) as $feature => $value ) {
			$classes[] = $feature . '-clientpref-' . $value;
		}
		return $classes;
	}
}
