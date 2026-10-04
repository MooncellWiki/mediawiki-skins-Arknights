<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\Html\Html;
use MediaWiki\Output\OutputPage;
use MediaWiki\Skins\Arknights\Menu\MenuItemDecorator;
use MediaWiki\Title\Title;
use MessageLocalizer;

/**
 * Page title block: the h1 (with the parenthetical disambiguator wrapped so it
 * can be de-emphasised), the namespace eyebrow, the tagline / short description and
 * the "copy short link" icon that trails the title.
 */
class ArknightsComponentPageHeading implements ArknightsComponent {

	public function __construct(
		private readonly MessageLocalizer $localizer,
		private readonly OutputPage $out,
		private readonly Title $title,
		private readonly string $titleHeadingHtml,
		private readonly bool $isTitleBlank,
		private readonly ?string $shortUrl = null
	) {
	}

	/**
	 * Wrap a trailing "(disambiguator)" so CSS can render it lighter.
	 * Only applied to content pages, where such suffixes are titles rather than UI.
	 */
	private function getPageHeading(): string {
		if ( !$this->title->isContentPage() ) {
			return $this->addShortLink( $this->titleHeadingHtml );
		}
		$pattern = '/\s?(\p{Ps}[^<>]+\p{Pe})<\/(span|h1)>/u';
		$replacement = ' <span class="mw-page-title-parenthesis">$1</span></$2>';
		return $this->addShortLink(
			preg_replace( $pattern, $replacement, $this->titleHeadingHtml ) ?? $this->titleHeadingHtml
		);
	}

	/**
	 * Put the "copy short link" icon at the end of the h1, right after the title text.
	 *
	 * Inside the h1 rather than next to it: pages append things to #firstHeading from
	 * script (on PRTS a block with the English name of the page), and the icon has to stay
	 * on the title's own line, in front of whatever comes after. It carries no text of its
	 * own — the name is an aria-label — so the h1's textContent is still the title alone,
	 * which is what gadgets read.
	 *
	 * The link is the short URL itself, so it is of use without the script too (open it, or
	 * copy it from the context menu); shortLink.js turns a plain click into a copy.
	 */
	private function addShortLink( string $headingHtml ): string {
		$end = $this->shortUrl !== null ? strripos( $headingHtml, '</h1>' ) : false;
		if ( $end === false ) {
			return $headingHtml;
		}
		$link = Html::rawElement( 'a', [
			'class' => 'ak-page-heading__shortlink',
			'id' => 'ak-shortlink',
			'href' => $this->shortUrl,
			'title' => $this->localizer->msg( 'arknights-shortlink-tooltip' )->text(),
			'aria-label' => $this->localizer->msg( 'arknights-shortlink' )->text(),
		], MenuItemDecorator::getIconHtml( 'shortLink' ) );
		return substr_replace( $headingHtml, $link, $end, 0 );
	}

	private function getTagline(): string {
		// Extension:ShortDescription
		$shortDesc = $this->out->getProperty( 'shortdesc' );
		if ( is_string( $shortDesc ) && $shortDesc !== '' ) {
			return htmlspecialchars( $shortDesc, ENT_QUOTES );
		}
		if ( $this->title->isSpecialPage() ) {
			return '';
		}
		$nsText = $this->title->getNsText();
		if ( $nsText !== '' ) {
			$nsMsg = $this->localizer->msg( 'arknights-tagline-ns-' . strtolower( str_replace( ' ', '_', $nsText ) ) );
			if ( $nsMsg->exists() && !$nsMsg->isDisabled() ) {
				return $nsMsg->parse();
			}
		}
		// No fallback to core's `tagline` (「来自{{SITENAME}}」): it says nothing on the wiki itself
		return '';
	}

	public function getTemplateData(): array {
		$nsText = $this->title->getNsText();
		$tagline = $this->getTagline();
		return [
			'html-title-heading' => $this->getPageHeading(),
			// '' is truthy for MediaWiki's Mustache sections: use null for "absent"
			'html-tagline' => trim( $tagline ) !== '' ? $tagline : null,
			'is-title-blank' => $this->isTitleBlank,
			'namespace-text' => $nsText !== '' ? str_replace( '_', ' ', $nsText ) : null,
			'is-special' => $this->title->isSpecialPage(),
		];
	}
}
