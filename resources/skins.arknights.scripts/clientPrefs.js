/**
 * Reading preferences — theme, section collapsing, text size, table text size
 * (ReadingPreferences.php has the list).
 *
 * The design-system script does the work (resources/design-system/client-prefs.js, synced
 * verbatim from prts-design): the radio groups in the header panel and on
 * Special:ReadingPreferences, the panel itself (dialog.ak-prefs-panel, opened by the glasses
 * icon), and the `akds:pref` event sections.js listens for. What it cannot know is where this
 * skin keeps the values, which is what this module adds.
 *
 * Every visitor's preferences live in localStorage here, as one "feature-clientpref-value,…"
 * string (the format of core's mwclientpreferences cookie), and inline.js puts them on <html>
 * before the first paint. The shared script hands a change to mw.user.clientPrefs whenever
 * <html> carries the feature's class, which on this skin would go wrong twice over: core
 * stores a cookie nothing here reads back (clientPrefEnabled is off, so core's own inline
 * script never runs), and for logged-in users it throws. So mw.user.clientPrefs.set is
 * pointed at the skin's store — for gadgets calling it as much as for the shared script.
 */
const scrollLock = require( './scrollLock.js' );

const STORAGE_KEY = 'mwclientpreferences';
const SUFFIX = '-clientpref-';

/**
 * Persist a client preference (all features share one comma-separated string).
 *
 * @param {string} feature
 * @param {string} value
 */
function save( feature, value ) {
	const existing = mw.storage.get( STORAGE_KEY ) || '';
	const data = {};
	existing.split( ',' ).forEach( ( pair ) => {
		const m = /^([\w-]+)-clientpref-(\w+)$/.exec( pair );
		if ( m ) {
			data[ m[ 1 ] ] = m[ 2 ];
		}
	} );
	data[ feature ] = value;
	mw.storage.set(
		STORAGE_KEY,
		Object.keys( data ).map( ( k ) => k + SUFFIX + data[ k ] ).join( ',' )
	);
}

/**
 * mw.user.clientPrefs.set, storing where inline.js reads, for logged-in users too. Same
 * contract as core's: false when the name or value is malformed, or <html> carries no class
 * for the feature.
 *
 * @param {string} feature
 * @param {string} value
 * @return {boolean}
 */
function set( feature, value ) {
	if ( !/^[a-zA-Z0-9-]+$/.test( feature ) || !/^[a-zA-Z0-9]+$/.test( value ) ) {
		return false;
	}
	const current = mw.user.clientPrefs.get( feature );
	if ( !current ) {
		return false;
	}
	const html = document.documentElement;
	// `<feature>-clientpref-<value>`, the classes listed in ReadingPreferences::FEATURES
	// eslint-disable-next-line mediawiki/class-doc
	html.classList.remove( feature + SUFFIX + current );
	// eslint-disable-next-line mediawiki/class-doc
	html.classList.add( feature + SUFFIX + value );
	save( feature, value );
	return true;
}

/**
 * .ak-theme-toggle (chrome/theme-toggle.css) is no longer in the header — the theme moved
 * into the reading preferences — but stays a component an event page or a gadget can drop
 * in, as it is upstream. Its buttons set the same preference.
 */
function initThemeToggles() {
	const sync = () => {
		const theme = window.akdsClientPrefs.get( 'skin-theme' );
		const buttons = document.querySelectorAll( '.ak-theme-toggle > button[data-theme]' );
		buttons.forEach( ( btn ) => {
			const active = btn.dataset.theme === theme;
			btn.classList.toggle( 'is-active', active );
			btn.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
		} );
	};
	document.addEventListener( 'click', ( e ) => {
		const btn = e.target instanceof Element && e.target.closest( '.ak-theme-toggle > button[data-theme]' );
		if ( btn ) {
			e.preventDefault();
			window.akdsClientPrefs.set( 'skin-theme', btn.dataset.theme );
		}
	} );
	document.addEventListener( 'akds:pref', sync );
	sync();
}

function init() {
	mw.user.clientPrefs.set = set;
	// The panel is modal on phones and locks the page like the drawer and the TOC flyout do
	window.akdsScrollLock = scrollLock.set;
	require( '../design-system/client-prefs.js' );

	const prefs = window.akdsClientPrefs;
	// HTML cached from before a feature existed has no class for it, and core's get() — which
	// set() above goes by — needs one
	const html = document.documentElement;
	Object.keys( prefs.defaults ).forEach( ( feature ) => {
		if ( !mw.user.clientPrefs.get( feature ) ) {
			// eslint-disable-next-line mediawiki/class-doc
			html.classList.add( feature + SUFFIX + prefs.defaults[ feature ] );
		}
	} );

	// For gadgets: fired with ( feature, value ) on every change, the theme included
	document.addEventListener( 'akds:pref', ( e ) => {
		mw.hook( 'skin.arknights.clientPrefs' ).fire( e.detail.feature, e.detail.value );
	} );

	initThemeToggles();
}

module.exports = { init };
