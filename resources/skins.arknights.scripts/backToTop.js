/**
 * Back to top button
 */
function init() {
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
	btn.addEventListener( 'click', () => {
		const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		window.scrollTo( { top: 0, behavior: reduce ? 'auto' : 'smooth' } );
	} );
	update();
}

module.exports = { init };
