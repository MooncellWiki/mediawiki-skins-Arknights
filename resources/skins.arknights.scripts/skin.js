/**
 * Arknights — skins.arknights.scripts entry point
 *
 * Everything is progressive enhancement over the server-rendered markup and
 * tolerates missing elements.
 */
const config = require( './config.json' );

function main() {
	// Reading preferences (theme, sections, text size), then section collapsing, which reads them
	require( './clientPrefs.js' ).init( config );
	require( './sectionCollapse.js' ).init();
	require( './dropdown.js' ).init();
	require( './drawer.js' ).init();
	require( './header.js' ).init();
	// Floating search palette (lazily loaded on intent), with the plain header form as the opt-out
	if ( !require( './searchLoader.js' ).init( config ) ) {
		require( './search.js' ).init();
	}
	require( './toc.js' ).init();
	require( './backToTop.js' ).init();
	require( './shortLink.js' ).init();
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
