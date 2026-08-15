/**
 * Theme switcher — os / day / night, stored as a client preference in localStorage
 * (same "feature-clientpref-value" vocabulary as MediaWiki core, see inline.js).
 */
const FEATURE = 'skin-theme';
const STORAGE_KEY = 'mwclientpreferences';
const SUFFIX = '-clientpref-';
const VALID = [ 'os', 'day', 'night' ];

/**
 * @param {string} feature
 * @return {string|null}
 */
function getPref( feature ) {
	const m = document.documentElement.className.match(
		new RegExp( '(?:^| )' + feature + SUFFIX + '([a-zA-Z0-9]+)(?: |$)' )
	);
	return m ? m[ 1 ] : null;
}

/**
 * Persist a client preference (all features share one comma-separated string).
 *
 * @param {string} feature
 * @param {string} value
 */
function savePref( feature, value ) {
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
 * @param {string} feature
 * @param {string} value
 */
function setPref( feature, value ) {
	const html = document.documentElement;
	const current = getPref( feature );
	if ( current ) {
		html.classList.remove( feature + SUFFIX + current );
	}
	html.classList.add( feature + SUFFIX + value );
	savePref( feature, value );
	mw.hook( 'skin.arknights.clientPrefs' ).fire( feature, value );
}

/**
 * @param {string} value
 * @return {string}
 */
function normalize( value ) {
	return VALID.indexOf( value ) !== -1 ? value : 'os';
}

/**
 * Reflect the current theme on the toggle buttons.
 */
function syncToggles() {
	const theme = normalize( getPref( FEATURE ) || 'os' );
	document.querySelectorAll( '.ak-theme-toggle > button[data-theme]' ).forEach( ( btn ) => {
		const active = btn.dataset.theme === theme;
		btn.classList.toggle( 'is-active', active );
		btn.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
	} );
}

/**
 * @param {Object} config
 */
function init( config ) {
	// Make sure the feature class exists so getPref() can find it (cached HTML from
	// before the skin set a default class, or on-wiki overrides removing it).
	if ( !getPref( FEATURE ) ) {
		document.documentElement.classList.add(
			FEATURE + SUFFIX + normalize( config.wgArknightsThemeDefault )
		);
	}
	syncToggles();

	document.addEventListener( 'click', ( e ) => {
		const btn = e.target.closest( '.ak-theme-toggle > button[data-theme]' );
		if ( !btn ) {
			return;
		}
		e.preventDefault();
		setPref( FEATURE, normalize( btn.dataset.theme ) );
		syncToggles();
	} );

	// Keep multiple tabs in sync
	window.addEventListener( 'storage', ( e ) => {
		if ( e.key !== STORAGE_KEY || !e.newValue ) {
			return;
		}
		const m = new RegExp( '(?:^|,)' + FEATURE + SUFFIX + '([a-zA-Z0-9]+)(?:,|$)' ).exec( e.newValue );
		if ( m && m[ 1 ] !== getPref( FEATURE ) ) {
			const html = document.documentElement;
			const current = getPref( FEATURE );
			if ( current ) {
				html.classList.remove( FEATURE + SUFFIX + current );
			}
			html.classList.add( FEATURE + SUFFIX + normalize( m[ 1 ] ) );
			syncToggles();
		}
	} );
}

module.exports = { init, getPref, setPref };
