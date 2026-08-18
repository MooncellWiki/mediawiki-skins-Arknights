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
 * Scroll spy — walk the headings in document order and take the last one above the
 * baseline, the way VitePress (useActiveAnchor) and Docusaurus (useTOCHighlight) do.
 *
 * Deliberately not IntersectionObserver: after an anchor jump the target heading and the
 * one right below it enter the observed band in the same batch, the last entry of the
 * callback wins, and the highlight lands on the *next* item — and whether they arrive
 * together depends on where the jump started, so it only misbehaves some of the time.
 *
 *   - the baseline is each heading's own scroll-margin-top (exactly where the browser
 *     parks it after an anchor jump) plus 4px of slack, so clicking an entry always
 *     lights up that entry;
 *   - clicking an entry highlights it immediately and skips the one scroll it triggers,
 *     because the last few sections never reach the baseline and the "bottom of the page"
 *     rule below would take the highlight straight back;
 *   - nothing is active at the very top, the last entry is active at the very bottom;
 *   - headings with no box at all (collapsed section, hidden tab) are skipped.
 *
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
	const shown = ( h ) => {
		const r = h.getBoundingClientRect();
		return r.width > 0 || r.height > 0;
	};
	let current = null;
	let ignoreOnce = false;
	let ticking = false;

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

	const update = () => {
		ticking = false;
		if ( ignoreOnce ) {
			ignoreOnce = false;
			return;
		}
		const d = document.documentElement;
		if ( window.scrollY < 1 ) {
			activate( null );
			return;
		}
		if ( window.scrollY + window.innerHeight >= d.scrollHeight - 1 ) {
			for ( let i = headings.length - 1; i >= 0; i-- ) {
				if ( shown( headings[ i ] ) ) {
					activate( items.get( headings[ i ] ) );
					return;
				}
			}
			return;
		}
		let best = null;
		for ( let i = 0; i < headings.length; i++ ) {
			const h = headings[ i ];
			if ( !shown( h ) ) {
				continue;
			}
			const line = parseFloat( getComputedStyle( h ).scrollMarginTop ) || 0;
			if ( h.getBoundingClientRect().top > line + 4 ) {
				break;
			}
			best = h;
		}
		activate( best ? items.get( best ) : null );
	};

	toc.addEventListener( 'click', ( e ) => {
		const target = e.target;
		if ( !( target instanceof Element ) ) {
			return;
		}
		const a = target.closest( '.ak-toc__link' );
		const heading = a && headingOf( a );
		const li = heading && items.get( heading );
		if ( li ) {
			ignoreOnce = true;
			activate( li );
		}
	} );

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
