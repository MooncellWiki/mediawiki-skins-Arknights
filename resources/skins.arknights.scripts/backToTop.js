/**
 * Back to top — the floating button, plus the first row of the TOC flyout that replaces
 * it below 1400px (where a floating button would eat into an already small viewport).
 */
function scrollToTop() {
	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	window.scrollTo( { top: 0, behavior: reduce ? 'auto' : 'smooth' } );
}

function init() {
	// Same smooth scroll as the button, without leaving a bare "#" in the URL
	document.addEventListener( 'click', ( e ) => {
		const target = e.target;
		if ( target instanceof Element && target.closest( '.ak-toc__top' ) ) {
			e.preventDefault();
			scrollToTop();
		}
	} );

	const btn = document.getElementById( 'ak-back-to-top' );
	if ( !btn ) {
		return;
	}
	btn.hidden = false;
	let ticking = false;
	const update = () => {
		ticking = false;
		btn.classList.toggle( 'is-visible', window.scrollY > 600 );
	};
	window.addEventListener( 'scroll', () => {
		if ( !ticking ) {
			ticking = true;
			window.requestAnimationFrame( update );
		}
	}, { passive: true } );
	btn.addEventListener( 'click', scrollToTop );
	update();
}

module.exports = { init };
