/**
 * Header — scroll state class, and the tools card below 1120px.
 *
 * Below 1120px it also turns Echo's bells back into plain links to Special:Notifications.
 *
 * The header is a single row at every width and always stays pinned (the local nav's menu
 * and TOC buttons sit in that same row, see chrome/responsive.css), so nothing here
 * collapses it on scroll. The tools card opens and closes on its own checkbox, and this
 * file only adds the dismissals a checkbox cannot express.
 */

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
	const navToggle = document.getElementById( 'ak-nav-toggle' );
	if ( navToggle ) {
		initNavScreen( navToggle );
	}
	initNotificationLinks();

	let ticking = false;

	const update = () => {
		ticking = false;
		header.classList.toggle( 'is-scrolled', window.scrollY > 4 );
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
