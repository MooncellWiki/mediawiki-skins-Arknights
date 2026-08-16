/**
 * Search (fallback) — "/" focuses the search box; the mobile toggle reveals the form.
 *
 * This is the pre-palette behaviour, kept for `$wgArknightsSearchPalette = false`. When the
 * palette is on, searchPalette.js takes over the toggle, the shortcut keys and the form
 * itself, and this module is never initialised.
 */
function init() {
	const form = document.getElementById( 'searchform' );
	const input = document.getElementById( 'searchInput' );
	const toggle = document.getElementById( 'ak-search-toggle' );

	if ( toggle && form ) {
		toggle.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			const isOpen = form.classList.toggle( 'is-open' );
			toggle.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
			if ( isOpen && input ) {
				input.focus();
			}
		} );
		document.addEventListener( 'click', ( e ) => {
			if ( !form.classList.contains( 'is-open' ) ) {
				return;
			}
			const t = e.target;
			if ( t instanceof Element && !t.closest( '#searchform, #ak-search-toggle, .suggestions' ) ) {
				form.classList.remove( 'is-open' );
				toggle.setAttribute( 'aria-expanded', 'false' );
			}
		} );
	}

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !input ) {
			return;
		}
		const active = document.activeElement;
		if ( active && ( /^(input|textarea|select)$/i.test( active.tagName ) || active.isContentEditable ) ) {
			return;
		}
		e.preventDefault();
		if ( form && toggle && window.getComputedStyle( toggle ).display !== 'none' ) {
			form.classList.add( 'is-open' );
			toggle.setAttribute( 'aria-expanded', 'true' );
		}
		input.focus();
		input.select();
	} );
}

module.exports = { init };
