/**
 * Header — scroll state class (shadow), the tools card below 1120px, and, below the TOC
 * breakpoint, collapsing the header's main row on the way down so only the local nav
 * stays pinned.
 *
 * Below 1120px it also turns Echo's bells back into plain links to Special:Notifications.
 *
 * Both are progressive: the collapse is CSS-gated to 640–1399px (see responsive.css; below
 * 640px the two rows are one and it stays put) and without JS the header simply keeps both
 * rows; the tools card opens and closes on its own checkbox, and this file only adds the
 * dismissals a checkbox cannot express.
 */

/** Distance from the top below which the header is always expanded */
const EXPAND_ABOVE = 120;
/** Scroll delta needed to flip the state, so a jittery wheel does not flicker it */
const THRESHOLD = 4;
/** Width at or above which the tools are back in the main row and the card is pointless */
const DESKTOP = '( min-width: 1120px )';

/**
 * The tools card (theme toggle / notifications / user menu) pulled down by the burger.
 * Opening it is pure CSS — this only closes it again on Escape, on an in-page link, on a
 * click outside it, and on the way back to desktop widths.
 *
 * Inside the card the user menu is laid out flat rather than folded: below 1120px its
 * <details> is held open (responsive.css hides the summary row), and handed back to the
 * dropdown behaviour at desktop widths.
 *
 * @param {HTMLInputElement} toggle
 */
function initNavScreen( toggle ) {
	const close = () => {
		if ( toggle.checked ) {
			toggle.checked = false;
		}
	};

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && toggle.checked ) {
			close();
			toggle.focus();
		}
	} );

	document.addEventListener( 'click', ( e ) => {
		if ( !toggle.checked || !( e.target instanceof Element ) ) {
			return;
		}
		// An in-page anchor does not reload, and the search toggle opens the palette on top
		if ( e.target.closest( '.ak-header__screen a[href^="#"], .ak-header__search-toggle' ) ) {
			close();
			return;
		}
		// Clicking the label dispatches a second click on the checkbox itself — that one is
		// not "outside", so let it through or the card would close the moment it opened
		if ( !e.target.closest( '.ak-header__screen, .ak-header__burger, .ak-nav-cb' ) ) {
			close();
		}
	} );

	const flat = document.querySelectorAll( '.ak-header__tools .ak-dropdown > details' );
	const mq = window.matchMedia( DESKTOP );
	// The attribute tells dropdown.js to leave it alone: flat, it is not a dropdown to fold
	// on an outside click or on Escape
	const setFlat = ( open ) => flat.forEach( ( details ) => {
		details.toggleAttribute( 'data-ak-flat', open );
		details.open = open;
	} );
	mq.addEventListener( 'change', ( e ) => {
		if ( e.matches ) {
			close();
		}
		setFlat( !e.matches );
	} );
	if ( !mq.matches ) {
		setFlat( true );
	}
}

/**
 * Below 1120px the bells sit inside the tools card, and Echo's popup — anchored to a bell,
 * in an overlay on <body> — opens underneath that card with nowhere to go. A phone gets the
 * full page instead: the badge is already a link to Special:Notifications, so it is enough
 * to keep the click from reaching Echo (ext.echo.init before the widgets load, OOUI's
 * BadgeLinkWidget after), both of which cancel the navigation to open the popup.
 *
 * Capturing on the document runs ahead of either handler, whichever is bound by then.
 */
function initNotificationLinks() {
	const mq = window.matchMedia( DESKTOP );
	document.addEventListener( 'click', ( e ) => {
		if ( mq.matches || !( e.target instanceof Element ) ) {
			return;
		}
		if ( e.target.closest( '.ak-header__notifications a.mw-echo-notifications-badge[href]' ) ) {
			e.stopPropagation();
		}
	}, true );
}

function init() {
	const header = document.querySelector( '.ak-header' );
	if ( !header ) {
		return;
	}
	const root = document.documentElement;
	const tocToggle = document.getElementById( 'ak-toc-toggle' );
	const navToggle = document.getElementById( 'ak-nav-toggle' );
	if ( navToggle ) {
		initNavScreen( navToggle );
	}
	initNotificationLinks();

	let lastY = Math.max( 0, window.scrollY );
	let ticking = false;

	const update = () => {
		ticking = false;
		const y = Math.max( 0, window.scrollY );
		header.classList.toggle( 'is-scrolled', y > 4 );
		// Leave the header alone while the TOC flyout or the tools card is open, so neither
		// jumps away underneath the pointer
		if ( !( tocToggle && tocToggle.checked ) && !( navToggle && navToggle.checked ) ) {
			if ( y < EXPAND_ABOVE || y < lastY - THRESHOLD ) {
				root.classList.remove( 'ak-condensed' );
			} else if ( y > lastY + THRESHOLD ) {
				root.classList.add( 'ak-condensed' );
			}
		}
		lastY = y;
	};

	window.addEventListener( 'scroll', () => {
		if ( !ticking ) {
			ticking = true;
			window.requestAnimationFrame( update );
		}
	}, { passive: true } );
	update();
}

module.exports = { init };
