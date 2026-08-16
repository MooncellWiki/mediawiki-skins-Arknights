<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Menu;

/**
 * Turns the `icon` key MediaWiki core sets on menu items into markup rendered
 * inside the link (`link-html`), using the mask-image icon classes provided by
 * the skins.arknights.icons module.
 *
 * @internal
 */
final class MenuItemDecorator {

	/**
	 * Icons shipped by skins.arknights.icons (keep in sync with skin.json).
	 * Items whose icon is not in this list are left untouched so no empty box renders.
	 */
	public const ICONS = [
		'appearance', 'articleRedirect', 'bell', 'bellOutline', 'block', 'bright', 'close',
		'collapse', 'die', 'edit', 'ellipsis', 'expand', 'eye', 'halfBright', 'help', 'history', 'home',
		'info', 'infoFilled', 'language', 'link', 'linkExternal', 'listBullet', 'lock', 'logIn', 'logOut',
		'menu', 'moon', 'move', 'printer', 'recentChanges', 'reload', 'search', 'settings', 'share',
		'specialPages', 'star', 'table', 'trash', 'unBlock', 'unLock', 'unStar', 'upload', 'userAdd',
		'userAvatar', 'userAvatarOutline', 'userContributions', 'userGroup', 'userTalk', 'watchlist',
		'wikiText',
	];

	/**
	 * Add icon markup to every item of a menu that carries a known `icon`.
	 *
	 * @param array &$items menu items keyed by name (the shape accepted by Skin::makeListItem)
	 */
	public static function addIconsToMenuItems( array &$items ): void {
		foreach ( $items as $key => $item ) {
			if ( !is_array( $item ) ) {
				continue;
			}
			$icon = $item['icon'] ?? '';
			if ( !is_string( $icon ) || $icon === '' || isset( $item['link-html'] ) ) {
				continue;
			}
			// Some extensions still name icons the way mw-ui-icon did, e.g. ULS asks for
			// 'wikimedia-language' where OOUI (and skins.arknights.icons) calls it 'language'.
			$icon = preg_replace( '/^wikimedia-/', '', $icon );
			if ( in_array( $icon, self::ICONS, true ) ) {
				$items[$key]['link-html'] = self::getIconHtml( $icon );
			}
		}
	}

	/**
	 * Map menu item keys to icons (only when the item exists and has no icon yet).
	 *
	 * @param array &$items
	 * @param array<string,string> $map item key => icon name
	 */
	public static function mapIcons( array &$items, array $map ): void {
		foreach ( $map as $key => $icon ) {
			if ( isset( $items[$key] ) && is_array( $items[$key] ) && empty( $items[$key]['icon'] ) ) {
				$items[$key]['icon'] = $icon;
			}
		}
	}

	/**
	 * Icon markup. Passed through Html::rawElement by Skin::makeLink, so it must be trusted HTML.
	 */
	public static function getIconHtml( string $icon ): string {
		$icon = preg_replace( '/[^a-zA-Z0-9-]/', '', $icon ) ?? '';
		return '<span class="ak-icon ak-icon--' . $icon . '" aria-hidden="true"></span>';
	}
}
