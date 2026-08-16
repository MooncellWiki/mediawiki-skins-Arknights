/**
 * Arknights — skins.arknights.scripts entry point
 *
 * Everything is progressive enhancement over the server-rendered markup and
 * tolerates missing elements.
 */
const config = require( './config.json' );

function main() {
	require( './theme.js' ).init( config );
	require( './dropdown.js' ).init();
	require( './drawer.js' ).init();
	require( './header.js' ).init();
	// Floating search palette (lazily loaded on intent), with the plain header form as the opt-out
	if ( !require( './searchLoader.js' ).init( config ) ) {
		require( './search.js' ).init();
	}
	require( './toc.js' ).init();
	require( './backToTop.js' ).init();
	require( './catlinks.js' ).init();
	require( './interactive.js' ).init();
	// Multi-level sidebar navigation (shared with the design-system preview)
	require( './sidebarTree.js' ).init( config );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', main );
} else {
	main();
}
