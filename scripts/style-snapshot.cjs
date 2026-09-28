#!/usr/bin/env node
/**
 * Computed-style snapshots of the skin running in the local sandbox (prts-sandbox,
 * http://localhost:8080 — the skin directory is bind-mounted, nothing is cached), for
 * comparing the shell before / after a CSS refactor. Same idea as prts-design's
 * e2e/support/computed.ts: every element (plus ::before / ::after) → its computed style,
 * keyed by a DOM path, plus the --ak-* tokens on <html>; a screenshot per scene as well.
 *
 *   node scripts/style-snapshot.cjs capture <dir> [--only=scene,scene] [--base=http://localhost:8080]
 *   node scripts/style-snapshot.cjs diff <dirA> <dirB> [--ignore=prop,prop] [--max=N]
 *
 * Needs Playwright — resolved from the prts-design checkout next to this repo (it is a
 * devDependency there), or set AKDS_SRC.
 */
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

const SKIN_DIR = path.resolve( __dirname, '..' );
const SRC = process.env.AKDS_SRC || path.join( SKIN_DIR, '..', 'prts-design' );
const { chromium } = require( path.join( SRC, 'node_modules', '@playwright', 'test' ) );

const args = process.argv.slice( 2 );
const cmd = args.shift();
const opt = Object.fromEntries( args.filter( ( a ) => a.startsWith( '--' ) ).map( ( a ) => { const [ k, v ] = a.slice( 2 ).split( '=' ); return [ k, v === undefined ? true : v ]; } ) );
const positional = args.filter( ( a ) => !a.startsWith( '--' ) );
const BASE = opt.base || 'http://localhost:8080';

/** Viewport / theme modes (os theme + emulated colour scheme = the two canonical themes) */
const MODES = {
	'dark-1440': { width: 1440, height: 900, scheme: 'dark' },
	'light-1440': { width: 1440, height: 900, scheme: 'light' },
	'light-1280': { width: 1280, height: 800, scheme: 'light' },
	'light-1024': { width: 1024, height: 800, scheme: 'light' },
	'dark-390': { width: 390, height: 844, scheme: 'dark', mobile: true }
};

/**
 * Scenes: page × mode × optional interaction that opens a shell state before the dump.
 * Paths are relative to the wiki root (/w/…).
 */
const SCENES = [
	{ id: 'home-dark', url: '/w/首页', mode: 'dark-1440' },
	{ id: 'home-light', url: '/w/首页', mode: 'light-1440' },
	{ id: 'chen-dark', url: '/w/陈', mode: 'dark-1440' },
	{ id: 'chen-light', url: '/w/陈', mode: 'light-1440' },
	{ id: 'chen-light-scrolled', url: '/w/陈', mode: 'light-1440', scroll: 900 },
	{ id: 'chen-1280', url: '/w/陈', mode: 'light-1280' },
	{ id: 'chen-1280-scrolled', url: '/w/陈', mode: 'light-1280', scroll: 900 },
	{ id: 'chen-1024', url: '/w/陈', mode: 'light-1024' },
	{ id: 'chen-390', url: '/w/陈', mode: 'dark-390' },
	{ id: 'rc-light', url: '/w/Special:RecentChanges', mode: 'light-1440' },
	{ id: 'history-dark', url: '/w/陈?action=history', mode: 'dark-1440' },
	{ id: 'edit-light', url: '/w/陈?action=edit', mode: 'light-1440' },
	{ id: 'search-light', url: '/w/Special:Search?search=%E9%99%88&fulltext=1', mode: 'light-1440' },
	// Shell states
	{ id: 'palette', url: '/w/陈', mode: 'light-1440', state: 'palette' },
	{ id: 'palette-dark-390', url: '/w/陈', mode: 'dark-390', state: 'palette' },
	{ id: 'usermenu', url: '/w/陈', mode: 'dark-1440', state: 'usermenu' },
	{ id: 'more', url: '/w/陈', mode: 'light-1440', state: 'more' },
	{ id: 'toc-flyout-1024', url: '/w/陈', mode: 'light-1024', state: 'toc' },
	{ id: 'drawer-1024', url: '/w/陈', mode: 'light-1024', state: 'drawer' },
	{ id: 'navcard-1024', url: '/w/陈', mode: 'light-1024', state: 'navcard' },
	{ id: 'navcard-390', url: '/w/陈', mode: 'dark-390', state: 'navcard' },
	{ id: 'flyout', url: '/w/陈', mode: 'light-1440', state: 'flyout' }
];

/* Runs in the page: dump every element's computed style (see prts-design e2e/support/computed.ts) */
function dump() {
	const table = new Map();
	const intern = ( s ) => { let id = table.get( s ); if ( id === undefined ) { id = table.size; table.set( s, id ); } return id; };
	const ser = ( cs ) => {
		const out = [];
		for ( let i = 0; i < cs.length; i++ ) { const p = cs[ i ]; if ( !p.startsWith( '--' ) ) { out.push( p + ':' + cs.getPropertyValue( p ) ); } }
		return out.join( '\n' ).replaceAll( location.origin, '' );
	};
	const pathOf = ( el ) => {
		const seg = [];
		for ( let e = el; e && e !== document.documentElement; e = e.parentElement ) {
			let i = 1; for ( let s = e.previousElementSibling; s; s = s.previousElementSibling ) { if ( s.tagName === e.tagName ) { i++; } }
			seg.push( e.tagName.toLowerCase() + ( e.id ? '#' + e.id : '' ) + ':' + i );
		}
		return seg.reverse().join( '>' );
	};
	const pseudo = ( el, p ) => { const cs = getComputedStyle( el, p ); return cs.content === 'none' || cs.content === 'normal' ? -1 : intern( ser( cs ) ); };
	const rows = [];
	// The parser output is not the shell: skip everything inside .mw-parser-output except its root
	for ( const el of document.querySelectorAll( 'html, html *' ) ) {
		if ( el.closest( 'svg' ) && el.tagName.toLowerCase() !== 'svg' ) { continue; }
		if ( el.closest( '.mw-parser-output' ) && !el.classList.contains( 'mw-parser-output' ) ) { continue; }
		if ( el.closest( 'script, style, noscript' ) ) { continue; }
		rows.push( [ pathOf( el ), intern( ser( getComputedStyle( el ) ) ), pseudo( el, '::before' ), pseudo( el, '::after' ), el.getAttribute( 'class' ) || '' ] );
	}
	const tokens = {};
	const rcs = getComputedStyle( document.documentElement );
	for ( let i = 0; i < rcs.length; i++ ) { const p = rcs[ i ]; if ( p.startsWith( '--' ) ) { tokens[ p ] = rcs.getPropertyValue( p ).trim(); } }
	return { rows, table: [ ...table.keys() ], tokens };
}

async function enterState( page, state ) {
	switch ( state ) {
		case 'palette':
			await page.keyboard.press( '/' );
			await page.waitForSelector( '.ak-palette:not([hidden])', { timeout: 8000 } );
			await page.waitForTimeout( 600 );
			break;
		case 'usermenu':
			await page.click( '#ak-user-menu summary' );
			break;
		case 'more':
			await page.click( '.ak-page-tools__more summary' );
			break;
		case 'toc':
			await page.click( 'label.ak-local-nav__toc' );
			break;
		case 'drawer':
			await page.click( '.ak-local-nav__menu' );
			break;
		case 'navcard':
			await page.click( 'label.ak-header__burger' );
			break;
		case 'flyout': {
			// hover the first collapsed branch in the sidebar
			const branch = page.locator( '.ak-sidebar .ak-tree__branch:not(.is-open) > .ak-tree__label' ).first();
			await branch.hover();
			await page.waitForTimeout( 500 );
			break;
		}
		default:
	}
	await page.waitForTimeout( 400 );
}

async function capture( dir ) {
	fs.mkdirSync( dir, { recursive: true } );
	const only = opt.only ? String( opt.only ).split( ',' ) : null;
	const browser = await chromium.launch();
	const problems = [];
	for ( const scene of SCENES ) {
		if ( only && !only.includes( scene.id ) ) { continue; }
		const mode = MODES[ scene.mode ];
		const context = await browser.newContext( {
			viewport: { width: mode.width, height: mode.height },
			deviceScaleFactor: 1,
			reducedMotion: 'reduce',
			colorScheme: mode.scheme,
			isMobile: !!mode.mobile,
			hasTouch: !!mode.mobile
		} );
		const page = await context.newPage();
		// Offline apart from the sandbox itself: external widget bundles / images are not the
		// skin's business and only add noise and timing variance.
		await context.route( ( u ) => !u.href.startsWith( BASE ), ( route ) => route.abort( 'blockedbyclient' ) );
		page.on( 'pageerror', ( e ) => problems.push( `${scene.id}: pageerror ${String( e ).slice( 0, 200 )}` ) );
		page.on( 'console', ( m ) => {
			if ( m.type() !== 'error' || /Failed to load resource|CORS policy|ERR_BLOCKED_BY_CLIENT/.test( m.text() ) ) { return; }
			problems.push( `${scene.id}: console ${m.text().slice( 0, 200 )}` );
		} );
		await page.goto( BASE + scene.url, { waitUntil: 'networkidle' } );
		await page.evaluate( () => document.fonts.ready );
		await page.waitForTimeout( 500 );
		if ( scene.scroll ) {
			await page.evaluate( ( y ) => window.scrollTo( 0, y ), scene.scroll );
			await page.waitForTimeout( 500 );
		}
		if ( scene.state ) {
			try {
				await enterState( page, scene.state );
			} catch ( e ) {
				problems.push( `${scene.id}: state ${scene.state} failed: ${String( e ).slice( 0, 200 )}` );
			}
		}
		await page.addStyleTag( { content: '*, *::before, *::after { transition: none !important; animation: none !important; }' } );
		await page.waitForTimeout( 100 );
		const snap = await page.evaluate( dump );
		fs.writeFileSync( path.join( dir, scene.id + '.json' ), JSON.stringify( snap ) );
		await page.screenshot( { path: path.join( dir, scene.id + '.png' ), fullPage: false } );
		process.stdout.write( `${scene.id}: ${snap.rows.length} elements\n` );
		await context.close();
	}
	await browser.close();
	fs.writeFileSync( path.join( dir, 'problems.txt' ), problems.join( '\n' ) + '\n' );
	if ( problems.length ) { process.stdout.write( `problems (${problems.length}):\n  ` + problems.join( '\n  ' ) + '\n' ); }
}

/** Custom-property values are raw text: normalise spacing, #abc → #aabbcc, .1 → 0.1 before comparing */
const normToken = ( v ) => v === undefined ? v : v.replace( /\s+/g, '' )
	.replace( /#([0-9a-f])([0-9a-f])([0-9a-f])\b/gi, ( _, r, g, b ) => `#${r}${r}${g}${g}${b}${b}` )
	.replace( /(?<![\d.])\.(\d)/g, '0.$1' ).replace( /(\.\d*?)0+\b/g, '$1' ).replace( /\.(?!\d)/g, '' ).toLowerCase();

const propsOf = ( s ) => new Map( ( s || '' ).split( '\n' ).filter( Boolean ).map( ( l ) => { const i = l.indexOf( ':' ); return [ l.slice( 0, i ), l.slice( i + 1 ) ]; } ) );

function diff( a, b ) {
	const GEOMETRY = [ 'width', 'height', 'block-size', 'inline-size', 'top', 'right', 'bottom', 'left', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end', 'grid-template-rows', 'grid-template-columns', 'perspective-origin', 'transform-origin', 'min-height', 'max-height', 'min-width', 'max-width', 'min-block-size', 'max-block-size', 'min-inline-size', 'max-inline-size' ];
	const ignore = new Set( ( opt.ignore ? String( opt.ignore ).split( ',' ) : [] ).concat( opt[ 'no-geometry' ] ? GEOMETRY : [ 'perspective-origin', 'transform-origin', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end', 'block-size', 'inline-size', 'min-block-size', 'max-block-size', 'min-inline-size', 'max-inline-size' ] ).concat( [ 'transition', 'transition-duration', 'transition-property', 'transition-timing-function', 'transition-delay', 'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-fill-mode', 'animation-play-state', 'animation-iteration-count', 'animation-delay', 'animation-direction', 'animation-composition', 'animation-range-start', 'animation-range-end', 'animation-timeline' ] ) );
	const max = Number( opt.max || 400 );
	const scenes = fs.readdirSync( a ).filter( ( f ) => f.endsWith( '.json' ) ).map( ( f ) => f.slice( 0, -5 ) );
	let total = 0;
	for ( const id of scenes ) {
		const fb = path.join( b, id + '.json' );
		if ( !fs.existsSync( fb ) ) { process.stdout.write( `${id}: missing in ${b}\n` ); continue; }
		const A = JSON.parse( fs.readFileSync( path.join( a, id + '.json' ) ) );
		const B = JSON.parse( fs.readFileSync( fb ) );
		const rowsA = new Map( A.rows.map( ( r ) => [ r[ 0 ], r ] ) );
		const rowsB = new Map( B.rows.map( ( r ) => [ r[ 0 ], r ] ) );
		const lines = [];
		for ( const [ k, v ] of Object.entries( A.tokens ) ) { if ( normToken( B.tokens[ k ] ) !== normToken( v ) ) { lines.push( `  token ${k}: ${v} → ${B.tokens[ k ]}` ); } }
		for ( const k of Object.keys( B.tokens ) ) { if ( !( k in A.tokens ) ) { lines.push( `  token ${k}: (none) → ${B.tokens[ k ]}` ); } }
		const removed = [ ...rowsA.keys() ].filter( ( p ) => !rowsB.has( p ) );
		const added = [ ...rowsB.keys() ].filter( ( p ) => !rowsA.has( p ) );
		if ( removed.length ) { lines.push( `  removed elements (${removed.length}): ` + removed.slice( 0, 12 ).map( ( p ) => p.split( '>' ).slice( -3 ).join( '>' ) ).join( ' | ' ) ); }
		if ( added.length ) { lines.push( `  added elements (${added.length}): ` + added.slice( 0, 12 ).map( ( p ) => p.split( '>' ).slice( -3 ).join( '>' ) ).join( ' | ' ) ); }
		const byProp = new Map();
		for ( const [ p, ra ] of rowsA ) {
			const rb = rowsB.get( p ); if ( !rb ) { continue; }
			for ( const [ slot, label ] of [ [ 1, '' ], [ 2, '::before' ], [ 3, '::after' ] ] ) {
				const sa = ra[ slot ] < 0 ? undefined : A.table[ ra[ slot ] ];
				const sb = rb[ slot ] < 0 ? undefined : B.table[ rb[ slot ] ];
				if ( sa === sb ) { continue; }
				if ( sa === undefined || sb === undefined ) { lines.push( `  ${p.split( '>' ).slice( -3 ).join( '>' )}${label}: pseudo ${sa === undefined ? 'added' : 'removed'}` ); continue; }
				const pa = propsOf( sa ), pb = propsOf( sb );
				for ( const [ prop, va ] of pa ) {
					if ( ignore.has( prop ) ) { continue; }
					const vb = pb.get( prop );
					if ( vb !== va ) {
						const key = `${prop}: ${va} → ${vb}`;
						if ( !byProp.has( key ) ) { byProp.set( key, [] ); }
						byProp.get( key ).push( p.split( '>' ).slice( -2 ).join( '>' ) + label + ( ra[ 4 ] ? ` .${ra[ 4 ].split( ' ' )[ 0 ]}` : '' ) );
					}
				}
			}
		}
		const changes = [ ...byProp.entries() ].sort( ( x, y ) => y[ 1 ].length - x[ 1 ].length );
		for ( const [ key, els ] of changes.slice( 0, max ) ) {
			lines.push( `  ${key}   [${els.length}] ${[ ...new Set( els ) ].slice( 0, 4 ).join( ' | ' )}` );
		}
		if ( changes.length > max ) { lines.push( `  … ${changes.length - max} more property changes` ); }
		total += lines.length;
		process.stdout.write( `${id}: ${lines.length ? lines.length + ' differences' : 'identical'}\n` + lines.join( '\n' ) + ( lines.length ? '\n' : '' ) );
	}
	process.stdout.write( `TOTAL: ${total}\n` );
}

if ( cmd === 'capture' ) {
	capture( positional[ 0 ] || '_snap' ).catch( ( e ) => { console.error( e ); process.exit( 1 ); } );
} else if ( cmd === 'diff' ) {
	diff( positional[ 0 ], positional[ 1 ] );
} else {
	console.error( 'usage: style-snapshot.cjs capture <dir> | diff <dirA> <dirB>' );
	process.exit( 2 );
}
