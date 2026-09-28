<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Menu;

use Skin;

/**
 * Parses MediaWiki:Arknights-footer-links into the link columns of the site footer
 * (the design's 浏览 / 参与 columns; the trailing 关于 column stays core's #footer-places).
 *
 * The syntax is MediaWiki:Sidebar's, group headings included — Skin::addToSidebarPlain
 * does the parsing, so whatever works there works here:
 *
 *     * 浏览
 *     ** 干员一览|干员
 *     ** 敌人一览|敌人
 *     * 参与
 *     ** Help:编辑指南|编辑指南
 *     ** Special:RecentChanges|recentchanges
 *
 * Headings and both halves of an item are message keys when a message by that name
 * exists and literal text otherwise. A group without usable items is dropped; '-' as
 * the whole message (the i18n default) turns the columns off.
 *
 * @internal
 */
final class FooterLinksParser {

	/** The on-wiki message holding the list. */
	public const MESSAGE = 'arknights-footer-links';

	/**
	 * @param Skin $skin
	 * @return array[] list of [ 'label' => string, 'array-items' => [ [ 'html' => string ] … ] ],
	 *   empty when the message is missing, disabled or holds nothing usable
	 */
	public static function parse( Skin $skin ): array {
		$msg = $skin->msg( self::MESSAGE )->inContentLanguage();
		if ( !$msg->exists() || $msg->isDisabled() ) {
			return [];
		}

		$bar = [];
		$skin->addToSidebarPlain( $bar, $msg->plain() );

		$columns = [];
		foreach ( $bar as $heading => $items ) {
			$heading = (string)$heading;
			$links = [];
			foreach ( $items as $item ) {
				if ( !is_array( $item ) || ( $item['href'] ?? '' ) === '' ) {
					continue;
				}
				// The sidebar parser stamps every item with an n-<label> id, which would
				// collide with the same link in the sidebar; the footer needs neither that
				// nor the icon / active flags.
				unset( $item['id'], $item['icon'], $item['active'] );
				$links[] = [ 'html' => $skin->makeLink( 'footer-link', $item ) ];
			}
			if ( !$links ) {
				continue;
			}
			$labelMsg = $skin->msg( $heading );
			$columns[] = [
				'label' => $labelMsg->exists() ? $labelMsg->text() : $heading,
				'array-items' => $links,
			];
		}

		return $columns;
	}
}
