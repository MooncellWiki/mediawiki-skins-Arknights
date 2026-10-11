<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Hooks;

use MediaWiki\Config\Config;
use MediaWiki\Html\Html;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Output\Hook\OutputPageAfterGetHeadLinksArrayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\ResourceLoader as RL;
use MediaWiki\Skins\Arknights\ReadingPreferences;
use MediaWiki\Skins\Hook\SkinPageReadyConfigHook;

/**
 * Hooks relating to the skin
 */
class SkinHooks implements
	BeforePageDisplayHook,
	GetPreferencesHook,
	OutputPageAfterGetHeadLinksArrayHook,
	SkinPageReadyConfigHook
{
	public const SKIN_NAME = 'arknights';

	private static ?string $inlineScript = null;

	public function __construct( private readonly Config $config ) {
	}

	/**
	 * Stop core wiring up its legacy search suggestions while the palette is on.
	 *
	 * `mediawiki.page.ready` lazy-loads `mediawiki.searchSuggest` the first time a search
	 * input takes focus. The palette keeps the real `#searchInput` alive — it moves the
	 * whole form into its own head so gadgets and no-JS submits keep working — so without
	 * this the old dropdown would attach to that very field and draw a second, competing
	 * list inside the palette. Vector 2022 switches the same flag off for the same reason.
	 *
	 * @param RL\Context $context
	 * @param mixed[] &$config
	 */
	public function onSkinPageReadyConfig( RL\Context $context, array &$config ): void {
		if ( $context->getSkin() !== self::SKIN_NAME ) {
			return;
		}
		if ( $this->config->get( 'ArknightsSearchPalette' ) === true ) {
			$config['search'] = false;
		}
	}

	/**
	 * Adds the inline theme bootstrap script (applies the visitor's stored theme
	 * before first paint, avoiding a flash of the wrong theme).
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		if ( $skin->getSkinName() !== self::SKIN_NAME ) {
			return;
		}

		self::$inlineScript ??= Html::inlineScript(
			RL\ResourceLoader::filter(
				'minify-js',
				file_get_contents( __DIR__ . '/../../resources/skins.arknights.scripts/inline.js' )
			)
		);
		$out->addHeadItem( 'skin.arknights.inline', self::$inlineScript );
	}

	/**
	 * Register the reading preferences as hidden user options, which is what the no-JS form
	 * of Special:ReadingPreferences saves for logged-in users. Hidden ('api') because
	 * that page, not Special:Preferences, is where they are edited; registered so the API
	 * accepts them and maintenance scripts do not treat them as unknown.
	 *
	 * No defaults (DefaultUserOptions): those live in ReadingPreferences, where the theme's
	 * follows $wgArknightsThemeDefault — an unset option means "follow the default".
	 *
	 * @param User $user
	 * @param array &$preferences
	 */
	public function onGetPreferences( $user, &$preferences ) {
		foreach ( array_keys( ReadingPreferences::FEATURES ) as $feature ) {
			$preferences[$feature] = [ 'type' => 'api' ];
		}
	}

	/**
	 * Use a saner viewport meta tag (viewport-fit=cover for notched devices).
	 *
	 * @param array &$tags
	 * @param OutputPage $out
	 */
	public function onOutputPageAfterGetHeadLinksArray( &$tags, $out ): void {
		if ( $out->getSkin()->getSkinName() !== self::SKIN_NAME || !isset( $tags['meta-viewport'] ) ) {
			return;
		}
		$tags['meta-viewport'] = Html::element( 'meta', [
			'name' => 'viewport',
			'content' => 'width=device-width,initial-scale=1,viewport-fit=cover',
		] );
	}
}
