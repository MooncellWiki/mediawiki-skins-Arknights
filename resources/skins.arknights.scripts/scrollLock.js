/**
 * Page scroll lock — shared by the sidebar drawer and the table-of-contents flyout
 * (upstream prts-design bde3f97; VitePress solves the same problem in useBodyScrollLock).
 *
 * The lock is `overflow: hidden` on <html> (`.ak-scroll-lock`), which — unlike the
 * `body { position: fixed }` recipe — leaves the scroll position alone. Two wrinkles:
 *
 *   - where the scrollbar takes up real width (Windows, or "always show scrollbars"),
 *     hiding it would shift the page sideways, so `scrollbar-gutter: stable` holds the
 *     space. Older desktop engines have neither, and there the lock falls back to
 *     swallowing the scroll events instead — anything genuinely scrollable inside the
 *     open panel still gets them;
 *   - iOS ignores `overflow: hidden` for touch scrolling, so `touchmove` is blocked too.
 *
 * Both panels share one lock, counted by holder: closing one while the other is still
 * open must not unlock the page.
 */
const html = document.documentElement;
const owners = new Set();
const listenerOptions = { capture: true, passive: false };
// iPadOS 13+ reports itself as a Mac, hence the second half
const isIOS = /iP(?:ad|hone|od)/.test( navigator.userAgent ) ||
	( navigator.platform === 'MacIntel' && 'ontouchend' in document );
const SCROLL_KEYS = new Set( [
	' ', 'PageUp', 'PageDown', 'Home', 'End',
	'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
] );

let mode = '';
let savedGutter = null;

/**
 * Is the event heading for something that scrolls on its own?
 *
 * @param {EventTarget|null} target
 * @return {boolean}
 */
function inScrollable( target ) {
	let el = target instanceof Element ? target : null;
	while ( el && el !== document.body ) {
		const style = getComputedStyle( el );
		if (
			( /auto|scroll/.test( style.overflowY ) && el.scrollHeight > el.clientHeight ) ||
			( /auto|scroll/.test( style.overflowX ) && el.scrollWidth > el.clientWidth )
		) {
			return true;
		}
		el = el.parentElement;
	}
	return false;
}

/**
 * @param {Event} e
 */
function block( e ) {
	// Pinch-zoom is not scrolling
	if ( e.touches && e.touches.length > 1 ) {
		return;
	}
	if ( !inScrollable( e.target ) ) {
		e.preventDefault();
	}
}

/**
 * @param {KeyboardEvent} e
 */
function blockKeys( e ) {
	if ( e.metaKey || e.ctrlKey || e.altKey || !SCROLL_KEYS.has( e.key ) ) {
		return;
	}
	const target = e.target;
	if ( target instanceof HTMLElement &&
		( target.isContentEditable || target.matches( 'input, textarea, select' ) )
	) {
		return;
	}
	block( e );
}

function lock() {
	// A scrollbar that takes up width; overlay scrollbars and phones report 0
	const hasScrollbar = window.innerWidth > html.clientWidth;
	if ( hasScrollbar && !( window.CSS && CSS.supports( 'scrollbar-gutter', 'stable' ) ) ) {
		mode = 'events';
		document.addEventListener( 'wheel', block, listenerOptions );
		document.addEventListener( 'touchmove', block, listenerOptions );
		document.addEventListener( 'keydown', blockKeys, listenerOptions );
		return;
	}
	mode = 'overflow';
	if ( hasScrollbar && getComputedStyle( html ).scrollbarGutter.indexOf( 'stable' ) === -1 ) {
		savedGutter = html.style.scrollbarGutter;
		html.style.scrollbarGutter = 'stable';
	}
	html.classList.add( 'ak-scroll-lock' );
	if ( isIOS ) {
		document.addEventListener( 'touchmove', block, listenerOptions );
	}
}

function unlock() {
	if ( mode === 'events' ) {
		document.removeEventListener( 'wheel', block, listenerOptions );
		document.removeEventListener( 'touchmove', block, listenerOptions );
		document.removeEventListener( 'keydown', blockKeys, listenerOptions );
	} else {
		if ( isIOS ) {
			document.removeEventListener( 'touchmove', block, listenerOptions );
		}
		html.classList.remove( 'ak-scroll-lock' );
		if ( savedGutter !== null ) {
			html.style.scrollbarGutter = savedGutter;
			savedGutter = null;
		}
	}
	mode = '';
}

/**
 * Take or release the lock on behalf of one holder.
 *
 * @param {string} owner
 * @param {boolean} on
 */
function set( owner, on ) {
	const wasLocked = owners.size > 0;
	if ( on ) {
		owners.add( owner );
	} else {
		owners.delete( owner );
	}
	if ( !wasLocked && owners.size ) {
		lock();
	} else if ( wasLocked && !owners.size ) {
		unlock();
	}
}

module.exports = { set };
