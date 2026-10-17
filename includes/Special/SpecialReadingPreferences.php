<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Special;

use MediaWiki\Html\Html;
use MediaWiki\Html\TemplateParser;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentReadingPreferences;
use MediaWiki\Skins\Arknights\ReadingPreferences;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;

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
 * values saved in a cookie on this device — the same "feature-clientpref-value,…" string the
 * panel keeps in localStorage — which the skin renders server-side
 * (ReadingPreferences::getValues()); their pages bypass the CDN anyway. Not as user options:
 * these settings follow the screen, and an option would carry a text size picked on a desktop
 * over to a phone. Logged-out visitors have nowhere to keep them but the browser — reading a
 * cookie for them would split the CDN cache of every page — so they get an explanation instead.
 */
class SpecialReadingPreferences extends UnlistedSpecialPage {

	public function __construct() {
		parent::__construct( 'ReadingPreferences' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->setHeaders();
		$this->outputHeader();
		$out = $this->getOutput();
		$prefs = new ReadingPreferences( $this->getConfig() );

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
			$prefs->getValues( $this->getUser(), $request ),
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

		$response = $request->response();
		if ( $request->getCheck( 'reset' ) ) {
			$response->clearCookie( ReadingPreferences::COOKIE );
		} else {
			$stored = ReadingPreferences::decode(
				(string)$request->getCookie( ReadingPreferences::COOKIE, null, '' )
			);
			$current = $prefs->getValues( $user, $request );
			foreach ( array_keys( $prefs->getOfferedFeatures() ) as $feature ) {
				// Only what was changed: an untouched field stays unset and keeps following the
				// site default. Section collapsing left on `auto` checks no radio and so does not
				// arrive at all.
				$value = $request->getRawVal( $feature );
				if ( ReadingPreferences::isValid( $feature, $value ) && $value !== $current[$feature] ) {
					$stored[$feature] = $value;
				}
			}
			// Expires after $wgCookieExpiration, like core's clientprefs cookie
			$response->setCookie( ReadingPreferences::COOKIE, ReadingPreferences::encode( $stored ) );
		}

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
