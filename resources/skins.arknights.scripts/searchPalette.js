/**
 * Search palette — MediaWiki data sources for the floating command palette.
 *
 * The palette itself is the design-system script (resources/design-system/search-palette.js,
 * synced verbatim from prts-design); it owns the DOM, the keyboard model and the
 * accessibility plumbing but ships no data of its own. This file supplies the wiki half:
 *
 *   1. Title search   REST `/rest.php/v1/search/title` — the same endpoint Vector 2022 and
 *                     Citizen use. `thumbnail` needs PageImages, `description` needs a
 *                     short-description provider; both degrade to nothing when absent.
 *   2. Local index    Optional, injected by `mw.hook( 'skin.arknights.search' )` — see
 *                     searchIndex.js for the Cargo-backed one, which is what gives PRTS
 *                     pinyin-initial and alias matching that the title search cannot do.
 *   3. Modes          `>` actions (scraped from the page's own menus) · `#` categories ·
 *                     `@` users · `~` files, all over the Action API.
 *
 * Progressive enhancement: templates/Search.mustache renders a real form. Once this runs,
 * the form is swapped for `button.ak-search-trigger` and moved into the palette head with
 * its `id` / `action` / `#searchInput` intact, so gadgets that target `#searchform` or
 * `#searchInput` keep working and Enter still falls back to a native submit (= MediaWiki's
 * "Go"). Without JS the form simply submits to Special:Search.
 */

const palette = require( '../design-system/search-palette.js' );
const searchIndex = require( './searchIndex.js' );
const config = require( './searchConfig.json' );

const NS_CATEGORY = 14;
const NS_FILE = 6;
const RESULT_LIMIT = 10;

/** Special pages offered by the `>` mode, paired with the core message naming each one. */
const SPECIAL_PAGES = [
	[ 'Special:RecentChanges', 'recentchanges' ],
	[ 'Special:Random', 'randompage' ],
	[ 'Special:SpecialPages', 'specialpages' ],
	[ 'Special:AllPages', 'allpages' ],
	[ 'Special:Categories', 'categories' ],
	[ 'Special:Statistics', 'statistics' ]
];

/**
 * Menus worth offering as commands. These are the standard MediaWiki portlet ids, which
 * templates/*.mustache preserves, plus the skin's own page tabs.
 */
const ACTION_SOURCES = [
	'#p-views li a', '#p-cactions li a', '#p-tb li a', '#p-personal li a', '.ak-page-tabs a'
].join( ',' );

/**
 * Pick an icon for a menu entry from its target. Only a hint — the palette falls back to
 * the generic "action" glyph for anything unrecognised.
 *
 * @param {string} href
 * @return {string}
 */
function iconForAction( href ) {
	if ( /[?&](action=edit|veaction=)/.test( href ) ) {
		return 'edit';
	}
	if ( /[?&]action=history/.test( href ) ) {
		return 'clock';
	}
	if ( /Special:Upload|[?&]action=info/.test( href ) ) {
		return 'file';
	}
	if ( /Special:(My)?(User|Contributions|Preferences|Watchlist)/.test( href ) ) {
		return 'user';
	}
	return 'action';
}

/**
 * Aliases are only worth showing when they are not just a spelling of the target — the
 * same test Citizen applies, so "陈sir → 陈" stays quiet but "银老板 → 银灰" does not.
 *
 * @param {string} title
 * @param {string} matched
 * @return {boolean}
 */
function isRedirectWorthShowing( title, matched ) {
	const canon = ( s ) => s.toLowerCase().replace( /[-\s_]/g, '' );
	const a = canon( title );
	const b = canon( matched );
	return a.indexOf( b ) === -1 && b.indexOf( a ) === -1;
}

/**
 * Build the palette and wire the local index to it.
 *
 * This is the entry point of the lazily loaded `skins.arknights.search` module —
 * searchLoader.js calls it once, on the first sign that the reader wants to search.
 *
 * @return {Object} the palette API ({ open, close, toggle, isOpen, … })
 */
function init() {
	const api = new mw.Api();
	const scriptPath = mw.config.get( 'wgScriptPath' ) || '';

	// Sites and gadgets can add an instant local index: fn( query ) -> Group[] (or a promise
	// of one). searchIndex.js registers the Cargo-backed index through this hook.
	let localIndex = null;
	mw.hook( 'skin.arknights.search' ).add( ( fn ) => {
		localIndex = typeof fn === 'function' ? fn : null;
	} );

	/* ── 1. Title search ── */

	function restTitleSearch( query, signal ) {
		const params = new URLSearchParams( { q: query, limit: String( RESULT_LIMIT ) } );
		return fetch( scriptPath + '/rest.php/v1/search/title?' + params, {
			headers: { accept: 'application/json' },
			signal: signal
		} ).then( ( response ) => {
			if ( !response.ok ) {
				throw new Error( 'HTTP ' + response.status );
			}
			return response.json();
		} ).then( ( data ) => ( data.pages || [] ).map( ( page ) => ( {
			type: 'page',
			label: page.title,
			// Navigate to the redirect so the "redirected from" notice still appears
			url: mw.util.getUrl( page.matched_title || page.title ),
			desc: page.description || '',
			thumb: ( page.thumbnail && page.thumbnail.url ) || '',
			redirect: page.matched_title &&
				isRedirectWorthShowing( page.title, page.matched_title ) ?
				mw.msg( 'arknights-search-redirect', page.matched_title ) :
				null
		} ) ) );
	}

	function search( query, signal ) {
		const local = localIndex ?
			Promise.resolve().then( () => localIndex( query ) ).catch( () => [] ) :
			Promise.resolve( [] );

		return Promise.all( [ local, restTitleSearch( query, signal ) ] ).then( ( results ) => {
			const groups = ( results[ 0 ] || [] )
				.filter( ( group ) => group && group.items && group.items.length );

			// The local index and the title search overlap heavily; the index wins because
			// it carries the structured metadata (rarity, class) the REST result lacks.
			// Match on the title as well as the URL: a REST hit reached through a redirect
			// points at the redirect ("/w/SilverAsh"), not at the page the index listed
			// ("/w/银灰"), so URLs alone would let the same operator through twice.
			const seen = new Set();
			groups.forEach( ( group ) => group.items.forEach( ( item ) => {
				seen.add( item.url );
				seen.add( item.label );
			} ) );

			const rest = results[ 1 ].filter(
				( item ) => !seen.has( item.url ) && !seen.has( item.label )
			);
			if ( rest.length ) {
				groups.push( {
					id: 'pages',
					label: mw.msg( 'arknights-search-pages' ),
					en: 'Pages',
					items: rest
				} );
			}
			return groups;
		} );
	}

	/* ── 2. Modes ── */

	function menuActions() {
		const items = [];
		const seen = new Set();

		Array.from( document.querySelectorAll( ACTION_SOURCES ) ).forEach( ( link ) => {
			const label = ( link.textContent || '' ).trim();
			const href = link.getAttribute( 'href' );
			if ( !label || !href || href === '#' || seen.has( link.href ) ) {
				return;
			}
			seen.add( link.href );
			items.push( {
				type: 'action',
				label: label,
				url: link.href,
				desc: link.title || '',
				icon: iconForAction( link.href ),
				dark: true,
				noRecent: true
			} );
		} );

		SPECIAL_PAGES.forEach( ( [ page, messageKey ] ) => {
			const url = mw.util.getUrl( page );
			if ( seen.has( new URL( url, location.href ).href ) ) {
				return;
			}
			// The following messages are used here:
			// * allpages
			// * categories
			// * randompage
			// * recentchanges
			// * specialpages
			// * statistics
			items.push( {
				type: 'action',
				label: mw.msg( messageKey ),
				desc: page,
				url: url,
				dark: true,
				noRecent: true
			} );
		} );

		return items;
	}

	function matches( query ) {
		const q = ( query || '' ).toLowerCase();
		return ( item ) => !q ||
			item.label.toLowerCase().indexOf( q ) !== -1 ||
			( item.desc || '' ).toLowerCase().indexOf( q ) !== -1;
	}

	function prefixSearch( namespace, query ) {
		return api.get( {
			action: 'query',
			list: 'prefixsearch',
			pssearch: query,
			psnamespace: namespace,
			pslimit: RESULT_LIMIT,
			formatversion: 2
		} ).then( ( data ) => ( data.query && data.query.prefixsearch ) || [] );
	}

	function categoriesOfThisPage() {
		return api.get( {
			action: 'query',
			prop: 'categories',
			titles: mw.config.get( 'wgPageName' ),
			cllimit: 20,
			clshow: '!hidden',
			formatversion: 2
		} ).then( ( data ) => {
			const page = data.query && data.query.pages && data.query.pages[ 0 ];
			return ( ( page && page.categories ) || [] ).map( ( cat ) => ( { title: cat.title } ) );
		} );
	}

	const modes = [
		{
			id: 'action',
			trigger: '/action',
			alias: '>',
			label: mw.msg( 'arknights-search-mode-action' ),
			desc: mw.msg( 'arknights-search-mode-action-desc' ),
			placeholder: mw.msg( 'arknights-search-mode-action-placeholder' ),
			// Commands are not pages, so offering a full-text search of them makes no sense
			fulltext: false,
			search: ( query ) => [ {
				id: 'actions',
				label: mw.msg( 'arknights-search-mode-action' ),
				en: 'Actions',
				items: menuActions().filter( matches( query ) )
			} ]
		},
		{
			id: 'category',
			trigger: '/cat',
			alias: '#',
			label: mw.msg( 'arknights-search-mode-category' ),
			desc: mw.msg( 'arknights-search-mode-category-desc' ),
			placeholder: mw.msg( 'arknights-search-mode-category-placeholder' ),
			// With no query the useful default is "where am I" rather than a blank list
			search: ( query ) => (
				query ? prefixSearch( NS_CATEGORY, query ) : categoriesOfThisPage()
			)
				.then( ( rows ) => [ {
					id: 'categories',
					label: mw.msg( 'arknights-search-mode-category' ),
					en: 'Categories',
					hint: query ? '' : mw.msg( 'arknights-search-mode-category-thispage' ),
					items: rows.map( ( row ) => ( {
						type: 'category',
						label: row.title,
						url: mw.util.getUrl( row.title )
					} ) )
				} ] )
		},
		{
			id: 'user',
			trigger: '/user',
			alias: '@',
			label: mw.msg( 'arknights-search-mode-user' ),
			desc: mw.msg( 'arknights-search-mode-user-desc' ),
			placeholder: mw.msg( 'arknights-search-mode-user-placeholder' ),
			search: ( query ) => api.get( {
				action: 'query',
				list: 'allusers',
				auprefix: query,
				aulimit: RESULT_LIMIT,
				formatversion: 2
			} ).then( ( data ) => [ {
				id: 'users',
				label: mw.msg( 'arknights-search-mode-user' ),
				en: 'Users',
				items: ( ( data.query && data.query.allusers ) || [] ).map( ( user ) => ( {
					type: 'user',
					label: user.name,
					url: mw.util.getUrl( 'User:' + user.name ),
					desc: mw.msg( 'arknights-search-mode-user-row' )
				} ) )
			} ] )
		},
		{
			id: 'file',
			trigger: '/file',
			alias: '~',
			label: mw.msg( 'arknights-search-mode-file' ),
			desc: mw.msg( 'arknights-search-mode-file-desc' ),
			placeholder: mw.msg( 'arknights-search-mode-file-placeholder' ),
			search: ( query ) => api.get( {
				action: 'query',
				generator: 'prefixsearch',
				gpssearch: query,
				gpsnamespace: NS_FILE,
				gpslimit: RESULT_LIMIT,
				prop: 'pageimages',
				piprop: 'thumbnail',
				pithumbsize: 80,
				formatversion: 2
			} ).then( ( data ) => [ {
				id: 'files',
				label: mw.msg( 'arknights-search-mode-file' ),
				en: 'Files',
				items: ( ( data.query && data.query.pages ) || [] )
					.sort( ( a, b ) => a.index - b.index )
					.map( ( page ) => ( {
						type: 'file',
						label: page.title,
						url: mw.util.getUrl( page.title ),
						thumb: page.thumbnail && page.thumbnail.source
					} ) )
			} ] )
		}
	];

	/* ── 3. Empty state ── */

	/**
	 * Where the empty state's shortcuts come from, most specific first. The header carries
	 * no navigation of its own, so these are the sidebar's own top entries: the wikitext
	 * sidebar's first groups (children of branches are left out — the leaf links are the
	 * useful ones), else MediaWiki:Sidebar's first portlet, else whatever the panel holds.
	 *
	 * @type {string[]}
	 */
	const shortcutSources = [
		'#MenuSidebar > ul > li > a[href]',
		'#p-navigation a[href]',
		'#mw-panel a[href]'
	];

	function shortcuts() {
		let links = [];
		for ( const selector of shortcutSources ) {
			links = Array.from( document.querySelectorAll( selector ) );
			if ( links.length ) {
				break;
			}
		}
		return links
			.slice( 0, 8 )
			.map( ( link ) => ( { label: ( link.textContent || '' ).trim(), url: link.href } ) )
			.filter( ( item ) => item.label );
	}

	const messages = {
		label: mw.msg( 'arknights-search-label' ),
		placeholder: mw.msg( 'arknights-search-placeholder', mw.config.get( 'wgSiteName' ) ),
		recent: mw.msg( 'arknights-search-recent' ),
		modes: mw.msg( 'arknights-search-modes' ),
		fulltext: mw.msg( 'arknights-search-fulltext' ),
		fulltextDesc: mw.msg( 'arknights-search-fulltext-desc' ),
		emptyTitle: mw.msg( 'arknights-search-empty-title' ),
		emptyDesc: mw.msg( 'arknights-search-empty-desc' ),
		shortcuts: mw.msg( 'arknights-search-shortcuts' ),
		noResults: mw.msg( 'arknights-search-noresults' ),
		noResultsDesc: mw.msg( 'arknights-search-noresults-desc' ),
		error: mw.msg( 'arknights-search-error' ),
		results: mw.msg( 'arknights-search-results' ),
		hintNavigate: mw.msg( 'arknights-search-hint-navigate' ),
		hintOpen: mw.msg( 'arknights-search-hint-open' ),
		hintFulltext: mw.msg( 'arknights-search-hint-fulltext' ),
		hintClose: mw.msg( 'arknights-search-hint-close' ),
		hintClear: mw.msg( 'arknights-search-hint-clear' ),
		hintBack: mw.msg( 'arknights-search-hint-back' ),
		hintCommands: mw.msg( 'arknights-search-hint-commands' ),
		close: mw.msg( 'arknights-search-close' ),
		clear: mw.msg( 'arknights-search-clear' ),
		back: mw.msg( 'arknights-search-back' ),
		remove: mw.msg( 'arknights-search-remove' ),
		brand: mw.config.get( 'wgSiteName' ) + ' · Search'
	};

	const instance = palette.init( {
		trigger: 'form.ak-header__search',
		toggles: '.ak-header__search-toggle',
		messages: messages,
		urls: {
			// MediaWiki's native "Go": an exact title jumps straight there, anything else
			// lands on the full-text results page
			go: ( q ) => mw.util.getUrl( 'Special:Search', { search: q, go: 'Go' } ),
			fulltext: ( q ) => mw.util.getUrl( 'Special:Search', { search: q, fulltext: '1' } )
		},
		providers: { search: search, shortcuts: shortcuts },
		modes: modes,
		recent: { key: 'arknights-search-recent', max: 8 }
	} );

	// Registers itself through the same hook a gadget would use, and only fetches once the
	// palette is actually opened — a hover-driven prefetch should not cost an API request.
	searchIndex.init( config );

	return instance;
}

module.exports = { init };
