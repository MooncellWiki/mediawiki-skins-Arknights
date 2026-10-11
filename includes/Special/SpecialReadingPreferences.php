<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Special;

use MediaWiki\Html\Html;
use MediaWiki\Html\TemplateParser;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentReadingPreferences;
use MediaWiki\Skins\Arknights\ReadingPreferences;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsManager;

/**
 * Special:ReadingPreferences — the reading preferences on a page of their own: where the
 * header's glasses icon goes without JS, and where the panel's head links to. The same form
 * as the panel (templates/ReadingPreferences.mustache) at full size, plus an actions row.
 *
 * With JS nothing is submitted: client-prefs.js applies each change as it is made and stores
 * it in the browser (clientPrefs.js), the save button is hidden by chrome/prefs.css, "restore
 * defaults" resets in place and "back" goes back in history.
 *
 * Without JS the form posts here, as Special:MobileOptions does. Logged-in users get the
 * values saved as user options, which the skin renders server-side
 * (ReadingPreferences::getValues()). Logged-out visitors have nowhere to keep them but the
 * browser — a cookie read on the server would split the CDN cache of every page — so they get
 * an explanation instead.
 */
class SpecialReadingPreferences extends UnlistedSpecialPage {

	public function __construct(
		private readonly UserOptionsManager $userOptionsManager
	) {
		parent::__construct( 'ReadingPreferences' );
	}

	/**
	 * @inheritDoc
	 */
	public function doesWrites() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->setHeaders();
		$this->outputHeader();
		$out = $this->getOutput();
		$prefs = new ReadingPreferences( $this->getConfig(), $this->userOptionsManager );

		if ( $this->getRequest()->wasPosted() ) {
			$error = $this->submit( $prefs );
			if ( $error === null ) {
				return;
			}
			$out->addHTML( Html::errorBox( $this->msg( $error )->parse() ) );
		} elseif ( $this->getRequest()->getCheck( 'saved' ) ) {
			$out->addHTML( Html::successBox( $this->msg( 'arknights-prefs-saved' )->parse() ) );
		}

		$this->showForm( $prefs );
	}

	private function showForm( ReadingPreferences $prefs ): void {
		$request = $this->getRequest();
		$form = new ArknightsComponentReadingPreferences(
			$this->getContext(),
			$prefs,
			$prefs->getValues( $this->getUser() ),
			$this->getPageTitle()->getLocalURL(),
			[
				'token' => $this->getUser()->getEditToken(),
				// null rather than '': the Mustache runtime treats '' as truthy in a section
				'returnto' => $request->getVal( 'returnto' ) ?: null,
				'returntoquery' => $request->getVal( 'returntoquery' ) ?: null,
				'href-back' => $this->getReturnUrl() ?? Title::newMainPage()->getLocalURL(),
			]
		);
		$templateParser = new TemplateParser( __DIR__ . '/../../templates' );
		$this->getOutput()->addHTML(
			$templateParser->processTemplate( 'ReadingPreferences', $form->getTemplateData() )
		);
	}

	/**
	 * Save a no-JS submit and redirect back.
	 *
	 * @param ReadingPreferences $prefs
	 * @return string|null message key of the error, or null once redirected
	 */
	private function submit( ReadingPreferences $prefs ): ?string {
		$request = $this->getRequest();
		$user = $this->getUser();
		if ( !$user->isNamed() ) {
			return 'arknights-prefs-anon-nojs';
		}
		if ( !$user->matchEditToken( $request->getVal( 'wpEditToken' ) ) ) {
			return 'sessionfailure';
		}
		$this->checkReadOnly();

		$reset = $request->getCheck( 'reset' );
		$current = $prefs->getValues( $user );
		foreach ( array_keys( $prefs->getOfferedFeatures() ) as $feature ) {
			if ( $reset ) {
				$this->userOptionsManager->setOption( $user, $feature, null );
				continue;
			}
			// Only what was changed: an untouched field stays unset and keeps following the
			// site default (or, for the text size, the old mobile site's choice)
			$value = $request->getRawVal( $feature );
			if ( ReadingPreferences::isValid( $feature, $value ) && $value !== $current[$feature] ) {
				$this->userOptionsManager->setOption( $user, $feature, $value );
			}
		}
		$this->userOptionsManager->saveOptions( $user );

		$this->getOutput()->redirect(
			$this->getReturnUrl() ?? $this->getPageTitle()->getFullURL( [ 'saved' => 1 ] )
		);
		return null;
	}

	/**
	 * The page the visitor came from (returnto / returntoquery, as on Special:UserLogin)
	 */
	private function getReturnUrl(): ?string {
		$request = $this->getRequest();
		$title = Title::newFromText( (string)$request->getVal( 'returnto', '' ) );
		if ( !$title || $title->isExternal() || $title->isSpecial( 'ReadingPreferences' ) ) {
			return null;
		}
		return $title->getFullURL( (string)$request->getVal( 'returntoquery', '' ) );
	}
}
