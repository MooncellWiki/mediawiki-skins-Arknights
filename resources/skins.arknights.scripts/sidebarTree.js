/**
 * Multi-level sidebar navigation: tree expand / collapse with memory, current-page
 * path, keyboard support and desktop hover fly-outs.
 *
 * The implementation is the design-system script (resources/design-system/sidebar-tree.js,
 * synced verbatim from prts-redesign). It self-initialises on `.ak-sidebar` and watches
 * for late DOM injection, so all we do here is load it and expose a re-scan hook for
 * gadgets that rebuild parts of the sidebar.
 */

/**
 * @param {Object} config
 */
function init( config ) {
	if ( config.wgArknightsSidebarFlyout === false ) {
		document.documentElement.setAttribute( 'data-akds-flyout', 'off' );
	}
	require( '../design-system/sidebar-tree.js' );

	// Re-scan when content is injected (e.g. gadgets rebuilding the sidebar)
	mw.hook( 'skin.arknights.sidebar' ).add( () => {
		if ( window.akdsSidebarTree ) {
			window.akdsSidebarTree.init();
		}
	} );
}

module.exports = { init };
