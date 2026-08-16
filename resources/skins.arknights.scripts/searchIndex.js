/**
 * Search palette — the instant local index.
 *
 * Fetches `action=arknightssearchindex` (Cargo tables flattened by
 * includes/Api/ApiArknightsSearchIndex.php) once, keeps it in localStorage, and registers a
 * matcher through `mw.hook( 'skin.arknights.search' )` so the palette can answer from memory
 * while the REST title search is still in flight.
 *
 * It exists because MediaWiki's title search only matches a *prefix* of a title. On a wiki
 * with no CirrusSearch that means "灰" never finds "银灰", and "yh" finds nothing. Here,
 * titles match anywhere in the string, alternate names match, and pinyin initials match.
 *
 * Nothing happens until the palette is opened for the first time, and nothing happens at all
 * on a wiki that has not configured `$wgArknightsSearchIndex` — the API then reports an
 * empty index and no hook is registered.
 */

const STORAGE_KEY = 'arknights-search-index';
const DEFAULT_TTL = 3600;
const MAX_PER_GROUP = 8;
const MAX_TOTAL = 16;

/** Score bands, highest first. The exact numbers only matter relative to each other. */
const SCORE = {
	titleExact: 100,
	titlePrefix: 80,
	titleInfix: 60,
	aliasExact: 55,
	aliasPrefix: 50,
	initialsPrefix: 46,
	pinyinPrefix: 42,
	aliasInfix: 38,
	pinyinInfix: 30
};

function readCache() {
	try {
		const raw = mw.storage.get( STORAGE_KEY );
		const data = raw ? JSON.parse( raw ) : null;
		return data && Array.isArray( data.groups ) ? data : null;
	} catch ( e ) {
		return null;
	}
}

function writeCache( data ) {
	try {
		mw.storage.set( STORAGE_KEY, JSON.stringify( data ) );
	} catch ( e ) {
		// Quota or private mode — the index still works for this page view
	}
}

function isFresh( data ) {
	const ttl = ( data.ttl || DEFAULT_TTL ) * 1000;
	return typeof data.fetched === 'number' && Date.now() - data.fetched < ttl;
}

/**
 * Score one entry against a lowercased query. Returns 0 for no match.
 *
 * @param {Object} item
 * @param {string} q lowercased, trimmed
 * @param {boolean} asciiQuery whether `q` could plausibly be pinyin (letters only)
 * @return {{score: number, via: string|null}}
 */
function scoreItem( item, q, asciiQuery ) {
	const title = item.t.toLowerCase();
	if ( title === q ) {
		return { score: SCORE.titleExact, via: null };
	}
	if ( title.startsWith( q ) ) {
		return { score: SCORE.titlePrefix, via: null };
	}
	if ( title.indexOf( q ) !== -1 ) {
		return { score: SCORE.titleInfix, via: null };
	}

	// Alias hits report which name matched, so the row can explain itself
	let best = { score: 0, via: null };
	( item.a || [] ).forEach( ( alias ) => {
		const a = alias.toLowerCase();
		let score = 0;
		if ( a === q ) {
			score = SCORE.aliasExact;
		} else if ( a.startsWith( q ) ) {
			score = SCORE.aliasPrefix;
		} else if ( a.indexOf( q ) !== -1 ) {
			score = SCORE.aliasInfix;
		}
		if ( score > best.score ) {
			best = { score: score, via: alias };
		}
	} );

	if ( asciiQuery && item.p ) {
		let score = 0;
		if ( item.p.startsWith( q ) ) {
			score = SCORE.initialsPrefix;
		} else if ( item.f && item.f.startsWith( q ) ) {
			score = SCORE.pinyinPrefix;
		} else if ( item.f && item.f.indexOf( q ) !== -1 ) {
			score = SCORE.pinyinInfix;
		}
		if ( score > best.score ) {
			best = { score: score, via: null };
		}
	}

	return best;
}

/**
 * Right-hand metadata for a row: star rating (pure CSS) and class as plain text.
 * Deliberately asset-free — the design system's `.ak-prof` icons live on the wiki, not in
 * the skin, so a site that wants them can decorate rows from its own hook instead.
 *
 * @param {Object} item
 * @return {Array}
 */
function metaFor( item ) {
	const meta = [];
	if ( item.c ) {
		meta.push( { text: item.c } );
	}
	if ( item.r ) {
		meta.push( {
			html: '<span class="ak-rarity ak-rarity--r' + item.r + '">' +
				'<i></i>'.repeat( item.r ) + '</span>'
		} );
	}
	return meta;
}

/**
 * Build the matcher handed to the palette.
 *
 * @param {Array} groups
 * @return {Function} fn( query ) -> Group[]
 */
function createMatcher( groups ) {
	return function ( query ) {
		const q = ( query || '' ).trim().toLowerCase();
		if ( q.length < 1 ) {
			return [];
		}
		const asciiQuery = /^[a-z]+$/.test( q );
		let budget = MAX_TOTAL;

		return groups.map( ( group ) => {
			if ( budget <= 0 ) {
				return null;
			}
			const hits = [];
			group.items.forEach( ( item ) => {
				const { score, via } = scoreItem( item, q, asciiQuery );
				if ( score > 0 ) {
					hits.push( { item: item, score: score, via: via } );
				}
			} );
			if ( !hits.length ) {
				return null;
			}

			// Stable ordering: score first, then the shorter title, then the index order
			hits.sort( ( a, b ) => b.score - a.score || a.item.t.length - b.item.t.length );

			const take = Math.min( MAX_PER_GROUP, budget );
			budget -= Math.min( hits.length, take );

			return {
				id: 'local-' + group.id,
				label: group.label,
				en: group.en,
				items: hits.slice( 0, take ).map( ( { item, score, via } ) => ( {
					type: group.type || 'page',
					label: item.t,
					// Derived rather than shipped: a precomputed URL per row is a third of
					// the payload, and only the handful of rows on screen ever need one.
					// It also matches the REST results byte for byte, which is what lets
					// searchPalette.js dedupe the two sources against each other.
					url: mw.util.getUrl( item.t ),
					desc: item.d || '',
					// Only highlight the typed text when it really is in the title —
					// a pinyin or alias hit has nothing to underline there
					match: score >= SCORE.titleInfix,
					redirect: via || null,
					meta: metaFor( item )
				} ) )
			};
		} ).filter( Boolean );
	};
}

/**
 * @param {Object} config
 */
function init( config ) {
	if ( config.wgArknightsSearchIndex !== true ) {
		return;
	}

	// Firing again simply swaps the matcher the palette holds, so a background refresh can
	// replace the stale one mid-session without any coordination.
	function register( data ) {
		if ( data.groups.length ) {
			mw.hook( 'skin.arknights.search' ).fire( createMatcher( data.groups ) );
		}
	}

	function fetchIndex() {
		return new mw.Api().get( {
			action: 'arknightssearchindex',
			formatversion: 2
		} ).then( ( response ) => {
			const payload = response.arknightssearchindex;
			if ( !payload || !Array.isArray( payload.groups ) ) {
				return;
			}
			const data = {
				version: payload.version,
				ttl: payload.ttl || DEFAULT_TTL,
				groups: payload.groups,
				fetched: Date.now()
			};
			writeCache( data );
			register( data );
		} ).catch( () => {
			// The palette is fully usable without the local index
		} );
	}

	function load() {
		const cached = readCache();
		if ( cached ) {
			// Serve the stale copy immediately; a background refresh replaces it for the
			// next page view rather than making the user wait on this one.
			register( cached );
			if ( isFresh( cached ) ) {
				return;
			}
		}
		fetchIndex();
	}

	// Pay for the index only once the user actually reaches for search
	document.addEventListener( 'akds:palette-open', load, { once: true } );
}

module.exports = { init };
