/**
 * Header — scroll state class (shadow) and search reveal on small screens.
 */
function init() {
	const header = document.querySelector( '.ak-header' );
	if ( !header ) {
		return;
	}
	let ticking = false;
	const update = () => {
		header.classList.toggle( 'is-scrolled', window.scrollY > 4 );
		ticking = false;
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
