/**
 * Category links — normalise the bare text nodes core emits inside #catlinks.
 *
 * Core renders `<a>Categories</a>` + a colon-separator text node + `<ul>`, and for hidden
 * categories a plain "Hidden categories:" label with no element of its own. The design has
 * no colon and styles the label as an overline, so:
 *   - drop the separator text node, and
 *   - wrap the hidden-categories label in span.ak-catlinks__label.
 *
 * CSS already swallows the colon on its own (font-size:0 on the row), so this is a
 * refinement, not a requirement — the bar is correct without JS.
 */

/** Trailing whitespace, zero-width / bidi marks and either colon */
const TRAILING_SEPARATOR = /[\s\u200B\u200E\u200F\uFEFF:\uFF1A]+$/;

/**
 * @param {Document|HTMLElement} [root]
 */
function tidy( root ) {
	const scope = root || document;
	Array.prototype.forEach.call( scope.querySelectorAll( '.catlinks > div' ), ( row ) => {
		Array.prototype.slice.call( row.childNodes ).forEach( ( node ) => {
			if ( node.nodeType !== Node.TEXT_NODE ) {
				return;
			}
			const text = node.nodeValue.replace( TRAILING_SEPARATOR, '' ).trim();
			if ( !text ) {
				node.remove();
				return;
			}
			const span = document.createElement( 'span' );
			span.className = 'ak-catlinks__label';
			span.textContent = text;
			row.replaceChild( span, node );
		} );
	} );
}

function init() {
	tidy();
	// Re-run after a preview or a VisualEditor save re-renders the category bar
	if ( window.mw && mw.hook ) {
		mw.hook( 'wikipage.categories' ).add( ( $catlinks ) => {
			tidy( $catlinks && $catlinks[ 0 ] ? $catlinks[ 0 ] : document );
		} );
	}
}

module.exports = { init, tidy };
