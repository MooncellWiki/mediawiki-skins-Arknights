/*
 * Arknights — inline theme bootstrap (added to <head> by SkinHooks::onBeforePageDisplay).
 *
 * Applies the visitor's stored client preferences (theme) to <html> before the
 * first paint so there is no flash of the wrong theme. Storage format is the same
 * as MediaWiki core's clientprefs cookie ("feature-clientpref-value,…"), kept in
 * localStorage so it works for logged-in and anonymous visitors alike.
 */
( function () {
	var KEY = 'mwclientpreferences';
	var storage;
	try {
		// eslint-disable-next-line mediawiki/no-storage
		storage = localStorage.getItem( KEY );
	} catch ( e ) {
		return;
	}
	if ( !storage ) {
		return;
	}
	var className = document.documentElement.className;
	storage.split( ',' ).forEach( function ( pref ) {
		if ( !/^[a-zA-Z0-9-]+-clientpref-[a-zA-Z0-9]+$/.test( pref ) ) {
			return;
		}
		var feature = pref.replace( /-clientpref-[a-zA-Z0-9]+$/, '' );
		var pattern = new RegExp( '(^| )' + feature + '-clientpref-[a-zA-Z0-9]+( |$)' );
		if ( pattern.test( className ) ) {
			className = className.replace( pattern, '$1' + pref + '$2' );
		} else {
			className += ' ' + pref;
		}
	} );
	document.documentElement.className = className;
}() );
