/**
 * Search palette — lazy loader.
 *
 * The palette (`skins.arknights.search`: the design-system core, the wiki data sources and
 * the Cargo index) is ~54 kB raw for a feature most page views never touch, so it is not in
 * the always-on bundle. This module is the stub that stays there (~3 kB once ResourceLoader
 * has stripped these comments), watches the header search box for intent, and pulls the real
 * thing in.
 *
 * What makes this cheap for us is that the header already renders a *working* search form.
 * It is the no-JS fallback, and it doubles as the pre-load fallback: until the module lands,
 * the field submits to Special:Search exactly as it always did. So a failed prefetch needs
 * no recovery and no message — only an explicit activation deserves a toast.
 *
 * Two levels of intent:
 *
 *   hover / touch   Fetch the module, then mount at idle. Mounting swaps the form for
 *                   `button.ak-search-trigger` and moves the form into the (closed) palette,
 *                   so the click that follows opens instantly. Held back while the field
 *                   has the caret or any text in it — see `onLoaded`.
 *   focus / click / `/` / Ctrl(⌘)K
 *                   Load and open, carrying anything already typed across as a prefill.
 *
 * Once mounted, the palette owns the trigger, the shortcuts and the form; this module steps
 * out of the way.
 */

const MODULE = 'skins.arknights.search';
/** Beyond this the load has failed in every way that matters to someone waiting on it. */
const LOAD_TIMEOUT_MS = 10000;
const INTENT_EVENTS = [ 'pointerenter', 'touchstart' ];

/**
 * Is the event target something that swallows plain keystrokes? Mirrors the same test in
 * the palette itself, so `/` behaves identically before and after the module lands.
 *
 * @param {EventTarget|null} el
 * @return {boolean}
 */
function isFormField( el ) {
	if ( !el || el.nodeType !== 1 ) {
		return false;
	}
	const name = el.nodeName.toLowerCase();
	const type = ( el.getAttribute( 'type' ) || '' ).toLowerCase();
	return name === 'select' ||
		name === 'textarea' ||
		( name === 'input' && [ 'submit', 'reset', 'checkbox', 'radio', 'button' ].indexOf( type ) === -1 ) ||
		el.isContentEditable;
}

/**
 * @param {Object} config
 * @return {boolean} whether the palette is in charge of search on this page
 */
function init( config ) {
	if ( config.wgArknightsSearchPalette === false ) {
		return false;
	}

	const form = document.getElementById( 'searchform' );
	const toggle = document.getElementById( 'ak-search-toggle' );
	if ( !form && !toggle ) {
		return false;
	}
	const input = document.getElementById( 'searchInput' );

	let state = 'idle';
	let palette = null;
	// The module's require(), kept from the moment the bytes land so a later activation can
	// mount without going near the loader again
	let loadedRequire = null;
	// An activation arrived while the bytes were still in flight
	let openWhenReady = false;

	/**
	 * Whatever is in the header field right now. Read at mount time rather than when the
	 * user first reached for search: they may well have typed in the interim, and the field
	 * they typed into is the very node the palette is about to adopt.
	 *
	 * @return {string}
	 */
	function currentQuery() {
		return input && input.value ? input.value : '';
	}

	/**
	 * Is the header field untouched, so that adopting it would steal nothing?
	 *
	 * @return {boolean}
	 */
	function fieldIsIdle() {
		return !input || ( document.activeElement !== input && !input.value );
	}

	function mount() {
		if ( state === 'ready' ) {
			return;
		}
		const shouldOpen = openWhenReady;
		// Adopts the form: swaps it for the trigger button and moves it into the palette
		palette = loadedRequire( MODULE ).init();
		state = 'ready';
		openWhenReady = false;
		detachIntent();
		if ( shouldOpen ) {
			palette.open( currentQuery() );
		}
	}

	/**
	 * The bytes have landed. Mount straight away if someone is waiting on it; otherwise
	 * wait for idle, and only while the header field is untouched — mounting moves that
	 * field into the closed palette, which would silently take the caret and the text with
	 * it. If the field is busy we simply hold: `activate()` mounts the moment it is asked.
	 */
	function onLoaded() {
		if ( openWhenReady ) {
			mount();
			return;
		}
		mw.requestIdleCallback( () => {
			if ( state === 'loading' && ( openWhenReady || fieldIsIdle() ) ) {
				mount();
			}
		} );
	}

	/**
	 * @param {boolean} announceFailure whether the user is waiting on this load
	 */
	function load( announceFailure ) {
		if ( state !== 'idle' ) {
			return;
		}
		state = 'loading';

		let timer = null;
		const timeout = new Promise( ( resolve, reject ) => {
			timer = setTimeout( () => reject( new Error( 'timeout' ) ), LOAD_TIMEOUT_MS );
		} );

		Promise.race( [ mw.loader.using( MODULE ), timeout ] ).then( ( require ) => {
			clearTimeout( timer );
			loadedRequire = require;
			onLoaded();
		}, () => {
			clearTimeout( timer );
			// Back to idle so the next click retries rather than doing nothing
			state = 'idle';
			openWhenReady = false;
			if ( announceFailure ) {
				// The form underneath still works, so this is a nudge, not a dead end
				mw.notify( mw.msg( 'arknights-search-load-error' ), { type: 'warn' } );
			}
		} );
	}

	function prefetch() {
		load( false );
	}

	/**
	 * Open the palette, loading it first if necessary.
	 *
	 * Inert once mounted: from that point the palette has its own trigger, toggle handler
	 * and shortcut keys, while the listeners below are still attached to nodes it has moved
	 * inside itself. Without this guard, the palette focusing its own field would come back
	 * through here and reset whatever the user had typed.
	 */
	function activate() {
		if ( state === 'ready' ) {
			return;
		}
		openWhenReady = true;
		if ( loadedRequire ) {
			// A prefetch already finished and held off; nothing to wait for
			mount();
		} else if ( state === 'idle' ) {
			load( true );
		}
	}

	/* ── Intent ── */

	const intentTargets = [ form, toggle ].filter( Boolean );

	function detachIntent() {
		intentTargets.forEach( ( el ) => {
			INTENT_EVENTS.forEach( ( event ) => el.removeEventListener( event, prefetch ) );
		} );
	}

	intentTargets.forEach( ( el ) => {
		INTENT_EVENTS.forEach( ( event ) => {
			el.addEventListener( event, prefetch, { once: true, passive: true } );
		} );
	} );

	/* ── Activation ── */

	if ( input ) {
		// Reaching the field at all — pointer or Tab or the accesskey — is the request.
		// The palette's own field takes the caret over from here.
		input.addEventListener( 'focus', activate );
	}
	if ( form ) {
		form.addEventListener( 'click', ( event ) => {
			// Let the submit buttons submit: without the palette that is still the way out
			if ( event.target.closest( 'button, input[type="submit"]' ) ) {
				return;
			}
			activate();
		} );
	}
	if ( toggle ) {
		toggle.addEventListener( 'click', ( event ) => {
			event.preventDefault();
			activate();
		} );
	}

	// "/" and Ctrl(⌘)K, until the palette binds its own pair of these
	window.addEventListener( 'keydown', ( event ) => {
		if ( state === 'ready' ) {
			return;
		}
		const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
		const ctrlK = ( event.ctrlKey || event.metaKey ) && !event.altKey && !event.shiftKey &&
			( event.key === 'k' || event.key === 'K' );
		if ( !slash && !ctrlK ) {
			return;
		}
		// Plain "/" only outside a field; Ctrl(⌘)K works inside any field but the search one
		const inField = isFormField( event.target );
		if ( inField && !( ctrlK && event.target !== input ) ) {
			return;
		}
		event.preventDefault();
		activate();
	}, true );

	return true;
}

module.exports = { init };
