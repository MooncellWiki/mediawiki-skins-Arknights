<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Hooks;

use MediaWiki\Hook\SidebarBeforeOutputHook;
use MediaWiki\Html\Html;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Output\Hook\OutputPageAfterGetHeadLinksArrayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\ResourceLoader as RL;
use MediaWiki\Skins\Arknights\Menu\MenuItemDecorator;
use Skin;

/**
 * Hooks relating to the skin
 */
class SkinHooks implements
	BeforePageDisplayHook,
	OutputPageAfterGetHeadLinksArrayHook,
	SidebarBeforeOutputHook
{
	public const SKIN_NAME = 'arknights';

	private static ?string $inlineScript = null;

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

	/**
	 * Decorate the toolbox with icons (the sidebar hooks are the only place where
	 * the toolbox items exist as an array).
	 *
	 * @param Skin $skin
	 * @param array &$sidebar
	 */
	public function onSidebarBeforeOutput( $skin, &$sidebar ): void {
		if ( $skin->getSkinName() !== self::SKIN_NAME ) {
			return;
		}

		if ( isset( $sidebar['TOOLBOX'] ) && is_array( $sidebar['TOOLBOX'] ) ) {
			MenuItemDecorator::mapIcons( $sidebar['TOOLBOX'], [
				'recentchangeslinked' => 'recentChanges',
				'print' => 'printer',
				'contributions' => 'userContributions',
				'emailuser' => 'userTalk',
				'upload' => 'upload',
				'specialpages' => 'specialPages',
				'permalink' => 'link',
				'info' => 'infoFilled',
				'cargo-pagevalues' => 'table',
				'smwbrowselink' => 'table',
				'citethispage' => 'wikiText',
			] );
			MenuItemDecorator::addIconsToMenuItems( $sidebar['TOOLBOX'] );
		}

		foreach ( $sidebar as $name => &$menu ) {
			if ( $name === 'TOOLBOX' || !is_array( $menu ) ) {
				continue;
			}
			MenuItemDecorator::addIconsToMenuItems( $menu );
		}
		unset( $menu );
	}
}
