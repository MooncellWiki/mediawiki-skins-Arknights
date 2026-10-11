/**
 * Section collapsing — a + / − in front of every top-level heading, as MobileFrontend's
 * sectionCollapsing did for Minerva on the old m. site.
 *
 * The design-system script does it all (resources/design-system/sections.js, synced verbatim
 * from prts-design): it wraps each .mw-heading2 and what follows it in section.ak-section,
 * collapses with hidden="until-found" (find-in-page and anchors still reach the text), and
 * follows the reading preferences ak-sections-on / ak-sections — by default only at ≤ 639px,
 * and expanded. It reads those through clientPrefs.js, so it loads after that; here it is
 * also pointed at content rendered again later (edit preview, VisualEditor saves).
 */
function init() {
	require( '../design-system/sections.js' );

	// Fires for the page's own content on load too, which init() then finds already done
	mw.hook( 'wikipage.content' ).add( ( $content ) => {
		if ( $content && $content[ 0 ] && window.akdsSections ) {
			window.akdsSections.init( $content[ 0 ] );
		}
	} );
}

module.exports = { init };
