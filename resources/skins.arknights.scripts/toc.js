/**
 * Table of contents — scroll spy, reading progress, collapsible top-level sections.
 */

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
 * @param {HTMLElement} toc
 */
function setupScrollSpy( toc ) {
	const links = Array.from( toc.querySelectorAll( '.ak-toc__link' ) );
	if ( !links.length ) {
		return;
	}
	const items = new Map();
	links.forEach( ( a ) => {
		let id = '';
		try {
			id = decodeURIComponent( ( a.getAttribute( 'href' ) || '' ).slice( 1 ) );
		} catch ( e ) {
			id = ( a.getAttribute( 'href' ) || '' ).slice( 1 );
		}
		const heading = id && document.getElementById( id );
		if ( heading ) {
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
		// Keep the active entry visible inside a scrolling TOC
		const rect = li.getBoundingClientRect();
		const box = toc.getBoundingClientRect();
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
}

module.exports = { init };
