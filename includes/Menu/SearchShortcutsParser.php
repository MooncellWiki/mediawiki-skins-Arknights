<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Menu;

use MediaWiki\MediaWikiServices;
use MediaWiki\ResourceLoader as RL;
use MediaWiki\Title\Title;

/**
 * Parses MediaWiki:Arknights-search-shortcuts into the link list the search palette
 * offers in its empty state.
 *
 * The syntax is MediaWiki:Sidebar's item syntax (Skin::addToSidebarPlain) without the
 * group headings — one `* target|label` per line, flat:
 *
 *     * mainpage-url|mainpage-description
 *     * Special:Random|randompage
 *     * https://www.mooncell.wiki|Mooncell
 *
 * Each half is used as a message key when a message by that name exists and taken
 * literally otherwise, so both core keys and plain page names / URLs work. Targets are
 * resolved in the content language (they name a page), labels in the language the module
 * is being built for. A line whose target or label resolves to '-' is skipped; '-' as the
 * whole message turns the shortcuts off.
 *
 * Unlike MediaWiki:MenuSidebar this is not wikitext — no templates, parser functions or
 * magic words. The result is baked into a ResourceLoader package file, and a list of at
 * most eight links is not worth putting a parser (or its cache invalidation) behind.
 *
 * @internal
 */
final class SearchShortcutsParser {

	/** The on-wiki message holding the list. */
	public const MESSAGE = 'arknights-search-shortcuts';

	/** The palette's empty state has room for about two rows of chips. */
	private const MAX_ITEMS = 8;

	/**
	 * @param RL\Context $context
	 * @return array[] list of [ 'label' => string, 'url' => string ], empty when the
	 *   message is missing, disabled or holds nothing usable
	 */
	public static function parse( RL\Context $context ): array {
		$list = $context->msg( self::MESSAGE )->inContentLanguage();
		if ( !$list->exists() || $list->isDisabled() ) {
			return [];
		}

		$urlUtils = MediaWikiServices::getInstance()->getUrlUtils();
		$protocols = '/^(?i:' . $urlUtils->validProtocols() . ')/';

		$shortcuts = [];
		foreach ( explode( "\n", $list->plain() ) as $line ) {
			// Leading '*' or '**' both mean "an item here"; the list has no levels.
			$line = trim( $line, "* \t\r" );
			if ( !str_contains( $line, '|' ) ) {
				continue;
			}
			[ $target, $label ] = array_map( 'trim', explode( '|', $line, 2 ) );
			if ( $target === '' || $label === '' ) {
				continue;
			}

			$targetMsg = $context->msg( $target )->inContentLanguage();
			if ( $targetMsg->exists() ) {
				$target = trim( $targetMsg->text() );
			}
			$labelMsg = $context->msg( $label );
			if ( $labelMsg->exists() ) {
				$label = trim( $labelMsg->text() );
			}
			if ( $target === '' || $target === '-' || $label === '' || $label === '-' ) {
				continue;
			}

			if ( preg_match( $protocols, $target ) ) {
				$url = $target;
			} else {
				$title = Title::newFromText( $target );
				$url = $title ? $title->fixSpecialName()->getLinkURL() : '';
			}
			if ( $url === '' ) {
				continue;
			}

			$shortcuts[] = [ 'label' => $label, 'url' => $url ];
			if ( count( $shortcuts ) >= self::MAX_ITEMS ) {
				break;
			}
		}

		return $shortcuts;
	}
}
