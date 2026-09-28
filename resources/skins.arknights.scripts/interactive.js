/**
 * Design-system interactive conventions (document-level delegation where possible):
 * .ak-tabs[data-tabs] · .ak-panel--collapsible · .ak-chip · .ak-btn-group / .ak-phase-tabs /
 * .ak-skill-levels (+ data-bind-* / data-show-*) · [data-dialog-open] / [data-dialog-close] ·
 * .ak-voice__play · input[data-toggle-class] · .ak-skill-matrix column highlight ·
 * [data-ak-tip] accessibility. Mirrors prts-design skin/resources/skin.js (and preview.js) so
 * templates behave the same on-wiki as in the design-system preview / docs.
 */

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @return {Element[]}
 */
function all( selector, root ) {
	return Array.from( ( root || document ).querySelectorAll( selector ) );
}

/**
 * Skill parameter matrix (.ak-skill-matrix): hovering / clicking a level column highlights
 * the whole column and swaps every `.ak-var[data-var]` in the sheet's description for that
 * level's value; leaving restores the range text. Without JS it is a static table.
 *
 * @param {Element} tb
 */
function bindSkillMatrix( tb ) {
	if ( tb.hasAttribute( 'data-ak-matrix-bound' ) ) {
		return;
	}
	tb.setAttribute( 'data-ak-matrix-bound', '' );
	const sheet = tb.closest( '.ak-skill-sheet' ) || tb.parentElement;
	const vars = all( '.ak-var[data-var]', sheet );
	vars.forEach( ( v ) => {
		v.dataset.range = v.textContent;
	} );
	const cols = all( 'thead th', tb );
	let pinned = -1;
	const paint = ( i ) => {
		cols.forEach( ( th, k ) => th.classList.toggle( 'is-hl', k === i ) );
		all( 'tbody tr', tb ).forEach( ( tr ) => {
			Array.prototype.forEach.call( tr.children, ( c, k ) => c.classList.toggle( 'is-hl', k === i ) );
			const v = tr.dataset.var;
			if ( v ) {
				vars.filter( ( x ) => x.dataset.var === v ).forEach( ( x ) => {
					x.textContent = i > 0 && tr.children[ i ] ? tr.children[ i ].textContent : x.dataset.range;
				} );
			}
		} );
	};
	const colOf = ( e ) => {
		const c = e.target instanceof Element ? e.target.closest( 'th, td' ) : null;
		return c && tb.contains( c ) ? Array.prototype.indexOf.call( c.parentElement.children, c ) : -1;
	};
	tb.addEventListener( 'mouseover', ( e ) => {
		const i = colOf( e );
		if ( i > 0 ) {
			paint( i );
		}
	} );
	tb.addEventListener( 'mouseleave', () => paint( pinned ) );
	tb.addEventListener( 'click', ( e ) => {
		const i = colOf( e );
		if ( i < 0 ) {
			return;
		}
		pinned = ( i > 0 && pinned !== i ) ? i : -1;
		paint( pinned );
	} );
}

let tipSeq = 0;
let tipBox = null;

/**
 * Pure-CSS tooltips ([data-ak-tip], components/tooltip.css) made reachable: the tip text is
 * wired to the element through aria-describedby (a node in a hidden container) unless it
 * merely repeats the element's own name (an item image whose alt is the item name); elements
 * that are not focusable but carry information beyond their name get tabindex=0 so keyboard
 * focus shows the tip via :focus-visible.
 *
 * @param {ParentNode} root
 */
function bindTips( root ) {
	all( '[data-ak-tip]:not([data-ak-tip-bound])', root ).forEach( ( el ) => {
		el.setAttribute( 'data-ak-tip-bound', '' );
		const tip = el.getAttribute( 'data-ak-tip' ).trim();
		if ( !tip ) {
			return;
		}
		const names = [ el.getAttribute( 'aria-label' ), el.textContent ]
			.concat( all( 'img[alt]', el ).map( ( i ) => i.alt ) );
		if ( names.some( ( n ) => n && n.trim() === tip ) ) {
			return;
		}
		if ( !tipBox ) {
			tipBox = document.createElement( 'div' );
			tipBox.hidden = true;
			tipBox.id = 'ak-tips';
			document.body.appendChild( tipBox );
		}
		const d = document.createElement( 'span' );
		d.id = 'ak-tip-' + ( ++tipSeq );
		d.textContent = tip;
		tipBox.appendChild( d );
		el.setAttribute( 'aria-describedby', ( ( el.getAttribute( 'aria-describedby' ) || '' ) + ' ' + d.id ).trim() );
		if ( !el.matches( 'a[href], button, input, select, textarea, summary, [tabindex]' ) && !el.closest( 'a[href], button' ) ) {
			el.tabIndex = 0;
		}
	} );
}

/**
 * Per-element setup for content that arrived after load as well (preview, VE save, lazy widgets).
 *
 * @param {ParentNode} root
 */
function enhance( root ) {
	all( '.ak-skill-matrix', root ).forEach( bindSkillMatrix );
	bindTips( root );
}

function init() {
	// input[data-toggle-class][data-toggle-target]: checking adds / removes a class on the
	// closest target (default `table`) — the talent table's potential / calc switches, the
	// module card's "read the full story".
	document.addEventListener( 'change', ( e ) => {
		const t = e.target instanceof Element ? e.target.closest( '[data-toggle-class]' ) : null;
		if ( !t ) {
			return;
		}
		const host = t.closest( t.dataset.toggleTarget || 'table' );
		if ( host ) {
			// The class comes from the template's data-toggle-class attribute (e.g. is-pot,
			// is-calc, is-open); the styles live in the synced design-system CSS.
			// eslint-disable-next-line mediawiki/class-doc
			host.classList.toggle( t.dataset.toggleClass, t.checked );
		}
	} );

	enhance( document );
	mw.hook( 'wikipage.content' ).add( ( $content ) => {
		enhance( $content && $content[ 0 ] ? $content[ 0 ] : document );
	} );

	document.addEventListener( 'click', ( e ) => {
		const target = e.target;
		if ( !( target instanceof Element ) ) {
			return;
		}

		const tab = target.closest( '.ak-tabs[data-tabs] .ak-tab' );
		if ( tab ) {
			e.preventDefault();
			const tabs = tab.closest( '.ak-tabs' );
			all( '.ak-tab', tabs ).forEach( ( t ) => {
				t.classList.toggle( 'is-active', t === tab );
				t.setAttribute( 'aria-selected', t === tab ? 'true' : 'false' );
			} );
			all( '.ak-tabpanel[data-tabs="' + tabs.dataset.tabs + '"]' ).forEach( ( p ) => {
				p.hidden = p.dataset.tab !== tab.dataset.tab;
			} );
			return;
		}

		const panelHead = target.closest( '.ak-panel--collapsible > .ak-panel__head' );
		if ( panelHead ) {
			panelHead.parentElement.classList.toggle( 'is-collapsed' );
			return;
		}

		const chip = target.closest( '.ak-chip' );
		if ( chip && !chip.closest( '[data-no-toggle]' ) ) {
			chip.classList.toggle( 'is-active' );
			chip.setAttribute( 'aria-pressed', chip.classList.contains( 'is-active' ) ? 'true' : 'false' );
		}

		const grp = target.closest( '.ak-btn-group > .ak-btn, .ak-phase-tabs > button, .ak-skill-levels > button' );
		if ( grp ) {
			const parent = grp.parentElement;
			all( ':scope > *', parent ).forEach( ( b ) => b.classList.toggle( 'is-active', b === grp ) );
			parent.dispatchEvent( new CustomEvent( 'akds:select', {
				bubbles: true,
				detail: { value: grp.dataset.value, el: grp }
			} ) );
		}

		const opener = target.closest( '[data-dialog-open]' );
		if ( opener ) {
			const dialog = document.querySelector( opener.dataset.dialogOpen );
			if ( dialog && typeof dialog.showModal === 'function' ) {
				dialog.showModal();
			}
		}
		const closer = target.closest( '[data-dialog-close]' );
		if ( closer ) {
			const dialog = closer.closest( 'dialog' );
			if ( dialog ) {
				dialog.close();
			}
		}

		const play = target.closest( '.ak-voice__play' );
		if ( play ) {
			play.classList.toggle( 'is-playing' );
		}
	} );

	document.addEventListener( 'akds:select', ( e ) => {
		const el = e.detail && e.detail.el;
		if ( !el ) {
			return;
		}
		const scope = el.closest( '[data-scope]' ) || document;
		const key = e.detail.value;
		const sel = e.target.dataset.bind;
		if ( !key || !sel ) {
			return;
		}
		all( '[data-bind-' + sel + ']', scope ).forEach( ( node ) => {
			try {
				const map = JSON.parse( node.getAttribute( 'data-bind-' + sel ) );
				if ( map[ key ] !== null && map[ key ] !== undefined ) {
					node.textContent = map[ key ];
				}
			} catch ( err ) {
				// malformed data-bind JSON: ignore
			}
		} );
		all( '[data-show-' + sel + ']', scope ).forEach( ( node ) => {
			node.hidden = node.getAttribute( 'data-show-' + sel ) !== key;
		} );
	} );

	/**
	 * Toast helper exposed for gadgets: mw.hook( 'skin.arknights.toast' ).fire( msg, type, title )
	 */
	mw.hook( 'skin.arknights.toast' ).add( ( msg, type, title ) => {
		let wrap = document.querySelector( '.ak-toasts' );
		if ( !wrap ) {
			wrap = document.createElement( 'div' );
			wrap.className = 'ak-toasts';
			document.body.appendChild( wrap );
		}
		const el = document.createElement( 'div' );
		// The following classes are used here:
		// * ak-toast--success
		// * ak-toast--warning
		// * ak-toast--danger
		// * ak-toast--info
		el.className = 'ak-toast' + ( type ? ' ak-toast--' + type : '' );
		el.style.position = 'relative';
		el.style.overflow = 'hidden';
		const body = document.createElement( 'div' );
		if ( title ) {
			const t = document.createElement( 'div' );
			t.className = 'ak-toast__title';
			t.textContent = title;
			body.appendChild( t );
		}
		const m = document.createElement( 'div' );
		m.className = 'ak-toast__msg';
		m.textContent = msg;
		body.appendChild( m );
		el.appendChild( body );
		const bar = document.createElement( 'i' );
		bar.className = 'ak-toast__progress';
		el.appendChild( bar );
		wrap.appendChild( el );
		setTimeout( () => el.remove(), 5000 );
	} );
}

module.exports = { init };
