<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Menu;

use MediaWiki\Context\IContextSource;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Title\Title;

/**
 * Parses a MediaWiki-namespace message as wikitext in the context of the page
 * being viewed and returns the HTML.
 *
 * Unlike MediaWiki:Sidebar this supports the full wikitext syntax — parser
 * functions ({{#ifeq:}}, {{#tsl:}}, {{FULLPAGENAME}}, {{PAGEID}} …), templates,
 * widgets, HTML — which is what Extension:VectorMenuSidebar provides for Vector
 * through an inline <script>. Here the parse happens server-side and the HTML is
 * dropped straight into the skin template.
 *
 * ResourceLoader modules requested by the parsed wikitext (TemplateStyles,
 * gadgets requested via {{#widget}} …) are forwarded to the OutputPage.
 *
 * @internal
 */
class WikitextMenuParser {

	public function __construct(
		private readonly IContextSource $context,
		private readonly OutputPage $out,
		private readonly Title $title
	) {
	}

	/**
	 * Whether the message exists on-wiki (or in i18n) and is not disabled ('-').
	 */
	public function isAvailable( string $messageName ): bool {
		if ( $messageName === '' ) {
			return false;
		}
		$msg = $this->context->msg( $messageName )->inContentLanguage();
		return $msg->exists() && !$msg->isDisabled();
	}

	/**
	 * Parse the message and return the resulting HTML, or null when the message
	 * is missing / disabled / empty.
	 */
	public function parse( string $messageName ): ?string {
		if ( !$this->isAvailable( $messageName ) ) {
			return null;
		}

		// ->plain() so that the wikitext reaches the parser untouched; the
		// interface flag below still gives {{int:}} / {{#tsl:}} the user language.
		$wikitext = $this->context->msg( $messageName )->plain();
		if ( trim( $wikitext ) === '' ) {
			return null;
		}

		$services = MediaWikiServices::getInstance();
		$parser = $services->getParserFactory()->getInstance();
		$popts = ParserOptions::newFromContext( $this->context );
		$popts->setInterfaceMessage( true );

		$parserOutput = $parser->parse( $wikitext, $this->title, $popts, true );

		$this->forwardMetadata( $parserOutput );

		$html = $services->getDefaultOutputPipeline()
			->run( $parserOutput, $popts, [
				'allowTOC' => false,
				'enableSectionEditLinks' => false,
				'wrapperDivClass' => '',
				'userLang' => $this->context->getLanguage(),
			] )
			->getContentHolderText();

		return trim( $html ) === '' ? null : $html;
	}

	/**
	 * Modules and JS config vars are the only metadata that must survive the parse;
	 * categories, indicators and the TOC of a navigation menu must not leak into the page.
	 */
	private function forwardMetadata( ParserOutput $parserOutput ): void {
		$modules = $parserOutput->getModules();
		if ( $modules ) {
			$this->out->addModules( $modules );
		}
		$styles = $parserOutput->getModuleStyles();
		if ( $styles ) {
			$this->out->addModuleStyles( $styles );
		}
		$vars = $parserOutput->getJsConfigVars();
		if ( $vars ) {
			$this->out->addJsConfigVars( $vars );
		}
	}
}
