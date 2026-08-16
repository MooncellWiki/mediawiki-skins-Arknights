/**
 * Header — scroll state class (shadow) and, below the TOC breakpoint, collapsing the
 * header's main row on the way down so only the local nav stays pinned.
 *
 * The collapse is CSS-gated to < 1400px (see responsive.less); without JS the header
 * simply keeps both rows, which is equally usable.
 */

/** Distance from the top below which the header is always expanded */
const EXPAND_ABOVE = 120;
/** Scroll delta needed to flip the state, so a jittery wheel does not flicker it */
const THRESHOLD = 4;

function init() {
	const header = document.querySelector( '.ak-header' );
	if ( !header ) {
		return;
	}
	const root = document.documentElement;
	const tocToggle = document.getElementById( 'ak-toc-toggle' );

	let lastY = Math.max( 0, window.scrollY );
	let ticking = false;

	const update = () => {
		ticking = false;
		const y = Math.max( 0, window.scrollY );
		header.classList.toggle( 'is-scrolled', y > 4 );
		// Leave the header alone while the TOC flyout is open, so it does not jump away
		if ( !( tocToggle && tocToggle.checked ) ) {
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
