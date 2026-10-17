<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights;

use MediaWiki\Config\Config;
use MediaWiki\Request\WebRequest;
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
 *   2. for logged-in users, the mwclientpreferences cookie — the same string — which the no-JS
 *      form of the special page saves;
 *   3. the default.
 * The server can only do 2 and 3, and does 2 only for logged-in users, whose pages bypass the
 * CDN anyway: logged-out page views always carry the defaults and stay cacheable.
 *
 * All of it stays on this device, logged in or not (prts-design /chrome/prefs, "为什么存本机、
 * 不跟账号"): these settings follow the screen — a text size picked on a 27-inch monitor is not
 * the one wanted on a phone, section collapsing is navigation on a phone and clutter on a
 * desktop — so they are never written to user options, which would carry them across devices.
 */
final class ReadingPreferences {

	/** Name of the cookie the no-JS form saves for logged-in users (with $wgCookiePrefix) */
	public const COOKIE = 'mwclientpreferences';

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
		// On / off. Not set means `auto` (see UNOFFERED): on at ≤ 639px only, Minerva's range.
		'ak-sections-on' => [
			'label' => 'arknights-prefs-sections-on',
			'options' => [
				'on' => 'arknights-prefs-sections-on-on',
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

	/**
	 * Values a feature can carry that have no radio of their own. `auto` is what section
	 * collapsing is until the visitor picks: since the setting lives on the device, a third
	 * "narrow screens" option would only stand in for "on here, off there", which they get by
	 * picking on each. The form checks neither radio for it (client-prefs.js lights the one
	 * the viewport resolves to).
	 */
	private const UNOFFERED = [
		'ak-sections-on' => [ 'auto' ],
	];

	/** Defaults other than the theme's, which is $wgArknightsThemeDefault */
	private const DEFAULTS = [
		'ak-sections-on' => 'auto',
		'ak-sections' => 'expand',
		'ak-font-size' => 'regular',
		'ak-table-font-size' => 'auto',
	];

	public function __construct(
		private readonly Config $config
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
		return is_string( $value ) && (
			isset( self::FEATURES[$feature]['options'][$value] ) ||
			in_array( $value, self::UNOFFERED[$feature] ?? [], true )
		);
	}

	/**
	 * What the server knows of the user's choices (steps 2 and 3 above).
	 *
	 * @param User $user
	 * @param WebRequest $request
	 * @return array<string,string> feature => value, for every feature
	 */
	public function getValues( User $user, WebRequest $request ): array {
		$values = [];
		foreach ( array_keys( self::FEATURES ) as $feature ) {
			$values[$feature] = $this->getDefault( $feature );
		}
		if ( !$user->isNamed() ) {
			return $values;
		}
		return self::decode( (string)$request->getCookie( self::COOKIE, null, '' ) ) + $values;
	}

	/**
	 * <html> classes for getValues()
	 *
	 * @param User $user
	 * @param WebRequest $request
	 * @return string[]
	 */
	public function getHtmlClasses( User $user, WebRequest $request ): array {
		$classes = [];
		foreach ( $this->getValues( $user, $request ) as $feature => $value ) {
			$classes[] = $feature . '-clientpref-' . $value;
		}
		return $classes;
	}

	/**
	 * Parse the stored string ("feature-clientpref-value,…", as in localStorage), keeping
	 * only known features with valid values.
	 *
	 * @param string $stored
	 * @return array<string,string> feature => value
	 */
	public static function decode( string $stored ): array {
		$values = [];
		foreach ( explode( ',', $stored ) as $pair ) {
			if ( preg_match( '/^([a-z0-9-]+)-clientpref-([a-zA-Z0-9]+)$/', $pair, $m ) &&
				self::isValid( $m[1], $m[2] )
			) {
				$values[$m[1]] = $m[2];
			}
		}
		return $values;
	}

	/**
	 * @param array<string,string> $values feature => value
	 * @return string
	 */
	public static function encode( array $values ): string {
		$pairs = [];
		foreach ( $values as $feature => $value ) {
			$pairs[] = $feature . '-clientpref-' . $value;
		}
		return implode( ',', $pairs );
	}
}
