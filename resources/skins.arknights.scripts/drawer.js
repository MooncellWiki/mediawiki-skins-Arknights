/**
 * Off-canvas drawer — the sidebar below 1120px, opened from the local nav.
 * A drawer is any element toggled with .is-open; an overlay is inserted behind it.
 * (The table of contents is not a drawer: it is a CSS flyout, see toc.js.)
 */
const scrollLock = require( './scrollLock.js' );

let overlay = null;
let openDrawer = null;
let lastFocus = null;

function removeOverlay() {
	if ( overlay ) {
		overlay.remove();
		overlay = null;
	}
}

/**
 * @param {HTMLElement} drawer
 * @param {HTMLElement|null} toggle
 */
function open( drawer, toggle ) {
	if ( openDrawer && openDrawer !== drawer ) {
		close();
	}
	lastFocus = document.activeElement;
	drawer.classList.add( 'is-open' );
	drawer.setAttribute( 'aria-hidden', 'false' );
	if ( toggle ) {
		toggle.setAttribute( 'aria-expanded', 'true' );
	}
	if ( !overlay ) {
		overlay = document.createElement( 'div' );
		overlay.className = 'ak-overlay ak-overlay--drawer';
		overlay.addEventListener( 'click', close );
		document.body.appendChild( overlay );
	}
	document.body.classList.add( 'ak-drawer-open' );
	// The drawer scrolls on its own; the page behind it must not follow along
	scrollLock.set( 'drawer', true );
	openDrawer = drawer;
	// Move focus into the drawer for keyboard / screen-reader users
	const focusable = drawer.querySelector( 'a[href], button:not([disabled]), input, [tabindex="0"]' );
	( focusable || drawer ).focus( { preventScroll: true } );
}

function close() {
	if ( !openDrawer ) {
		return;
	}
	openDrawer.classList.remove( 'is-open' );
	openDrawer.removeAttribute( 'aria-hidden' );
	document.querySelectorAll( '[aria-controls="' + openDrawer.id + '"]' ).forEach( ( t ) => {
		t.setAttribute( 'aria-expanded', 'false' );
	} );
	document.body.classList.remove( 'ak-drawer-open' );
	scrollLock.set( 'drawer', false );
	removeOverlay();
	if ( lastFocus && typeof lastFocus.focus === 'function' ) {
		lastFocus.focus( { preventScroll: true } );
	}
	openDrawer = null;
	lastFocus = null;
}

/**
 * @param {HTMLElement} drawer
 * @param {HTMLElement|null} toggle
 */
function toggle( drawer, toggle ) {
	if ( drawer.classList.contains( 'is-open' ) ) {
		close();
	} else {
		open( drawer, toggle );
	}
}

function init() {
	const sidebar = document.getElementById( 'ak-sidebar' );

	document.addEventListener( 'click', ( e ) => {
		const target = e.target;
		if ( !( target instanceof Element ) ) {
			return;
		}
		const sidebarToggle = target.closest( '#ak-drawer-toggle' );
		if ( sidebarToggle && sidebar ) {
			e.preventDefault();
			toggle( sidebar, sidebarToggle );
			return;
		}
		if ( target.closest( '.ak-sidebar__close' ) ) {
			e.preventDefault();
			close();
		}
	} );

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && openDrawer ) {
			close();
		}
	} );

	// Leaving the drawer breakpoint: make sure nothing stays stuck open
	const mq = window.matchMedia( '(min-width: 1120px)' );
	const onChange = () => {
		if ( mq.matches && openDrawer ) {
			close();
		}
	};
	if ( mq.addEventListener ) {
		mq.addEventListener( 'change', onChange );
	}
}

module.exports = { init, open, close };
