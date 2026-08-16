/**
 * Header — scroll state class (shadow), the tools card below 1120px, and, below the TOC
 * breakpoint, collapsing the header's main row on the way down so only the local nav
 * stays pinned.
 *
 * Both are progressive: the collapse is CSS-gated to < 1400px (see responsive.less) and
 * without JS the header simply keeps both rows; the tools card opens and closes on its own
 * checkbox, and this file only adds the dismissals a checkbox cannot express.
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

	window.matchMedia( DESKTOP ).addEventListener( 'change', ( e ) => {
		if ( e.matches ) {
			close();
		}
	} );
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
