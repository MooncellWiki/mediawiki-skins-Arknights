/**
 * Design-system interactive conventions (pure delegation, no per-element setup):
 * .ak-tabs[data-tabs] · .ak-panel--collapsible · .ak-chip · .ak-btn-group / .ak-phase-tabs /
 * .ak-skill-levels (+ data-bind-* / data-show-*) · [data-dialog-open] / [data-dialog-close] ·
 * .ak-voice__play. Mirrors prts-design/preview/preview.js so templates behave the same
 * on-wiki as in the design-system preview.
 */

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @return {Element[]}
 */
function all( selector, root ) {
	return Array.from( ( root || document ).querySelectorAll( selector ) );
}

function init() {
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
