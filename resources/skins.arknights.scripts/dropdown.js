/**
 * Dropdowns — <details class="ak-dropdown__details"> enhancements:
 * only one open at a time, close on outside click / Escape / link activation.
 */
const SELECTOR = 'details.ak-dropdown__details';

/**
 * @param {HTMLDetailsElement|null} except
 */
function closeAll( except ) {
	document.querySelectorAll( SELECTOR + '[open]' ).forEach( ( d ) => {
		if ( d !== except ) {
			d.removeAttribute( 'open' );
		}
	} );
}

function init() {
	document.addEventListener( 'toggle', ( e ) => {
		const details = e.target;
		if ( !( details instanceof HTMLElement ) || !details.matches( SELECTOR ) ) {
			return;
		}
		if ( details.open ) {
			closeAll( details );
		}
	}, true );

	document.addEventListener( 'click', ( e ) => {
		const target = e.target;
		if ( !( target instanceof Element ) ) {
			return;
		}
		const inside = target.closest( SELECTOR );
		if ( !inside ) {
			closeAll( null );
			return;
		}
		// Following a link inside a card closes it
		if ( target.closest( '.ak-dropdown__card a[href]' ) ) {
			closeAll( null );
		}
	} );

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key !== 'Escape' ) {
			return;
		}
		const open = document.querySelector( SELECTOR + '[open]' );
		if ( open ) {
			open.removeAttribute( 'open' );
			const summary = open.querySelector( 'summary' );
			if ( summary ) {
				summary.focus();
			}
		}
	} );
}

module.exports = { init, closeAll };
