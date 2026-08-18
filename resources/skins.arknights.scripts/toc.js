/**
 * Table of contents — scroll spy, reading progress, collapsible top-level sections and
 * dismissing the flyout.
 *
 * Below 1400px the TOC is a flyout pulled down from the local nav. Opening and closing it
 * is pure CSS (#ak-toc-toggle + its label), so it works without JS; this module only adds
 * the parts a checkbox cannot express: close after following an entry, on Escape, or on a
 * click outside.
 */

function setupFlyout() {
	const cb = document.getElementById( 'ak-toc-toggle' );
	if ( !cb ) {
		return;
	}

	document.addEventListener( 'click', ( e ) => {
		if ( !cb.checked ) {
			return;
		}
		const target = e.target;
		if ( !( target instanceof Element ) ) {
			return;
		}
		if ( target.closest( '.ak-toc__link, .ak-toc__top' ) ) {
			cb.checked = false;
			return;
		}
		// Clicking the label dispatches a second click on the checkbox itself —
		// that one must not count as "outside", or the flyout would close as it opens.
		if ( !target.closest( '.ak-toc, .ak-local-nav__toc, .ak-toc-cb' ) ) {
			cb.checked = false;
		}
	} );

	document.addEventListener( 'keydown', ( e ) => {
		if ( e.key === 'Escape' && cb.checked ) {
			cb.checked = false;
			cb.focus( { preventScroll: true } );
		}
	} );

	// Leaving the flyout breakpoint: do not leave it stuck open behind the rail
	const mq = window.matchMedia( '(min-width: 1400px)' );
	if ( mq.addEventListener ) {
		mq.addEventListener( 'change', () => {
			if ( mq.matches ) {
				cb.checked = false;
			}
		} );
	}
}

/**
 * @param {HTMLElement} toc
 */
function setupCollapse( toc ) {
	const collapseByDefault = toc.classList.contains( 'ak-toc--collapse-enabled' );
	toc.querySelectorAll( '.ak-toc__item--parent > .ak-toc__toggle' ).forEach( ( btn ) => {
		const li = btn.parentElement;
		if ( collapseByDefault ) {
			li.classList.add( 'is-collapsed' );
			btn.setAttribute( 'aria-expanded', 'false' );
		}
		btn.addEventListener( 'click', () => {
			const collapsed = li.classList.toggle( 'is-collapsed' );
			btn.setAttribute( 'aria-expanded', collapsed ? 'false' : 'true' );
		} );
	} );
}

/**
 * Resolve the heading a TOC entry points at.
 *
 * @param {Element} a
 * @return {HTMLElement|null}
 */
function headingOf( a ) {
	const href = a.getAttribute( 'href' ) || '';
	if ( href.charAt( 0 ) !== '#' ) {
		return null;
	}
	let id = href.slice( 1 );
	try {
		id = decodeURIComponent( id );
	} catch ( e ) {
		// A fragment the browser accepts but decodeURIComponent rejects — match it raw
	}
	return id ? document.getElementById( id ) : null;
}

/**
 * @param {HTMLElement} toc
 */
function setupScrollSpy( toc ) {
	const items = new Map();
	toc.querySelectorAll( '.ak-toc__link' ).forEach( ( a ) => {
		const heading = headingOf( a );
		if ( heading && !items.has( heading ) ) {
			items.set( heading, a.parentElement );
		}
	} );
	if ( !items.size ) {
		return;
	}

	const headings = Array.from( items.keys() );
	const headerH = parseInt( getComputedStyle( document.documentElement ).getPropertyValue( '--ak-header-h' ), 10 ) || 56;
	let current = null;

	const activate = ( li ) => {
		if ( li === current ) {
			return;
		}
		if ( current ) {
			current.classList.remove( 'is-active' );
			let p = current.parentElement.closest( '.ak-toc__item' );
			while ( p ) {
				p.classList.remove( 'is-active-path' );
				p = p.parentElement.closest( '.ak-toc__item' );
			}
		}
		current = li;
		if ( !li ) {
			return;
		}
		li.classList.add( 'is-active' );
		let parent = li.parentElement.closest( '.ak-toc__item' );
		while ( parent ) {
			parent.classList.add( 'is-active-path' );
			// Reveal the active branch even if collapsed by default
			parent.classList.remove( 'is-collapsed' );
			const t = parent.querySelector( ':scope > .ak-toc__toggle' );
			if ( t ) {
				t.setAttribute( 'aria-expanded', 'true' );
			}
			parent = parent.parentElement.closest( '.ak-toc__item' );
		}
		// Keep the active entry visible inside the scrolling part of the TOC
		const rect = li.getBoundingClientRect();
		const box = ( toc.querySelector( '.ak-toc__inner' ) || toc ).getBoundingClientRect();
		if ( rect.top < box.top || rect.bottom > box.bottom ) {
			li.scrollIntoView( { block: 'nearest' } );
		}
	};

	let ticking = false;
	const update = () => {
		ticking = false;
		const line = headerH + 24;
		let best = null;
		for ( let i = 0; i < headings.length; i++ ) {
			if ( headings[ i ].getBoundingClientRect().top - line <= 0 ) {
				best = headings[ i ];
			} else {
				break;
			}
		}
		activate( best ? items.get( best ) : null );
	};
	window.addEventListener( 'scroll', () => {
		if ( !ticking ) {
			ticking = true;
			window.requestAnimationFrame( update );
		}
	}, { passive: true } );
	window.addEventListener( 'resize', update );
	update();
}

/**
 * @param {HTMLElement} toc
 */
function setupProgress( toc ) {
	const bar = toc.querySelector( '.ak-toc__progress > i' );
	if ( !bar ) {
		return;
	}
	let ticking = false;
	const update = () => {
		ticking = false;
		const d = document.documentElement;
		const max = d.scrollHeight - d.clientHeight;
		const p = max > 0 ? Math.min( 100, Math.max( 0, ( d.scrollTop / max ) * 100 ) ) : 0;
		bar.style.setProperty( '--_p', p.toFixed( 1 ) + '%' );
	};
	window.addEventListener( 'scroll', () => {
		if ( !ticking ) {
			ticking = true;
			window.requestAnimationFrame( update );
		}
	}, { passive: true } );
	update();
}

function init() {
	const toc = document.getElementById( 'ak-toc' );
	if ( !toc ) {
		return;
	}
	setupCollapse( toc );
	setupScrollSpy( toc );
	setupProgress( toc );
	setupFlyout();
}

module.exports = { init };
