/**
 * Copy short link — the chain icon trailing the page title (a.ak-page-heading__shortlink,
 * rendered when $wgArknightsShortUrl is set). Its href is the short URL itself: a plain
 * click copies it, a modified click (new tab / window) is left to the browser.
 *
 * Feedback is the icon itself: .is-copied turns it into a check mark for a moment (icons.less,
 * chrome/page-header.css) and the tooltip / aria-label say "copied" meanwhile. No notification.
 * The link sits inside the h1 and has no text of its own, so nothing here adds any.
 */
const COPIED_MS = 2000;

function copy( text ) {
	if ( navigator.clipboard && navigator.clipboard.writeText ) {
		return navigator.clipboard.writeText( text );
	}
	// Insecure contexts (plain http) have no navigator.clipboard
	const field = document.createElement( 'textarea' );
	field.value = text;
	field.setAttribute( 'readonly', '' );
	field.style.position = 'fixed';
	field.style.opacity = '0';
	document.body.appendChild( field );
	field.select();
	let ok = false;
	try {
		ok = document.execCommand( 'copy' );
	} catch ( e ) {
		ok = false;
	}
	field.remove();
	return ok ? Promise.resolve() : Promise.reject();
}

function init() {
	let timer = null;

	const setCopied = ( link, copied ) => {
		if ( copied && !link.dataset.title ) {
			link.dataset.title = link.title;
			link.dataset.label = link.getAttribute( 'aria-label' ) || '';
		}
		link.classList.toggle( 'is-copied', copied );
		const text = mw.msg( 'arknights-shortlink-copied' );
		link.title = copied ? text : link.dataset.title;
		link.setAttribute( 'aria-label', copied ? text : link.dataset.label );
	};

	document.addEventListener( 'click', ( e ) => {
		const target = e.target;
		const link = target instanceof Element && target.closest( '.ak-page-heading__shortlink' );
		if ( !link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey ) {
			return;
		}
		e.preventDefault();
		const url = link.href;
		copy( url ).then(
			() => {
				setCopied( link, true );
				clearTimeout( timer );
				timer = setTimeout( () => setCopied( link, false ), COPIED_MS );
			},
			// The one case that does notify: the browser refused, so nothing would show at all.
			// The URL is in the message, so it can still be copied by hand.
			() => mw.notify( mw.msg( 'arknights-shortlink-copy-failed', url ), { tag: 'arknights-shortlink', type: 'warn', autoHide: false } )
		);
	} );
}

module.exports = { init };
