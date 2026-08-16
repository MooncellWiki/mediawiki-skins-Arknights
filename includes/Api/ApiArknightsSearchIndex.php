<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Api;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiResult;
use MediaWiki\Config\Config;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Throwable;
use Transliterator;

/**
 * `action=arknightssearchindex` — the instant local index behind the search palette.
 *
 * MediaWiki's title search can only match a prefix of a title, which on a Chinese wiki
 * without CirrusSearch means "灰" never finds "银灰" and "yh" finds nothing at all. This
 * module flattens a few Cargo tables into a small JSON blob the client keeps in
 * localStorage, so the palette can match titles anywhere in the string, match alternate
 * names, and match pinyin initials — with no network round trip per keystroke.
 *
 * The shape of the index is entirely driven by `$wgArknightsSearchIndex`, so the skin holds
 * no knowledge of any particular wiki's Cargo schema. It is empty (and this module reports
 * an empty index) until a site configures it. See README.md for the PRTS.wiki example.
 *
 * The response is cached both server-side (WAN, `$wgArknightsSearchIndexTTL`) and by the
 * CDN / browser for the same period; the client additionally holds it in localStorage keyed
 * by the returned `version`.
 */
class ApiArknightsSearchIndex extends ApiBase {

	/**
	 * Cache epoch — bump whenever this class emits different bytes for the same wiki data,
	 * shape or content alike. The key already tracks the configuration, so nothing else
	 * invalidates a warm entry before its TTL runs out.
	 */
	private const CACHE_VERSION = 3;

	/** Guard against a misconfigured `limit` pulling an entire wiki into one response. */
	private const MAX_ROWS_PER_GROUP = 20000;

	/**
	 * Cargo namespaced its classes and kept no alias, so accept either name. A wiki
	 * without Cargo simply gets no index.
	 */
	private const CARGO_QUERY_CLASSES = [
		'MediaWiki\\Extension\\Cargo\\CargoSQLQuery',
		'CargoSQLQuery',
	];

	private ?Transliterator $transliterator = null;
	private bool $transliteratorResolved = false;

	/**
	 * @param ApiMain $main
	 * @param string $moduleName
	 * @param Config $config
	 * @param \WANObjectCache $cache Typed only as `object`: core moved the class into
	 *   Wikimedia\ObjectCache, and the skin should not care which core it runs on.
	 */
	public function __construct(
		ApiMain $main,
		string $moduleName,
		private readonly Config $config,
		private readonly object $cache
	) {
		parent::__construct( $main, $moduleName );
	}

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$ttl = $this->getTtl();
		$index = $this->cache->getWithSetCallback(
			$this->cache->makeKey(
				'arknights-search-index',
				self::CACHE_VERSION,
				$this->getLanguage()->getCode(),
				// Editing the configuration invalidates the entry without a cache flush
				substr( sha1( json_encode( $this->getGroupConfigs() ) ), 0, 12 )
			),
			$ttl,
			fn () => $this->buildIndex()
		);

		$result = $this->getResult();
		foreach ( $index['groups'] as $i => $group ) {
			ApiResult::setIndexedTagName( $index['groups'][$i]['items'], 'item' );
			foreach ( $group['items'] as $j => $item ) {
				if ( isset( $item['a'] ) ) {
					ApiResult::setIndexedTagName( $index['groups'][$i]['items'][$j]['a'], 'alias' );
				}
			}
		}
		ApiResult::setIndexedTagName( $index['groups'], 'group' );
		$result->addValue( null, $this->getModuleName(), $index );

		// The index changes only when the wiki's data does, so let the CDN and the browser
		// hold onto it for as long as the server-side entry lives.
		$this->getMain()->setCacheMaxAge( $ttl );
		$this->getMain()->setCacheMode( 'public' );
	}

	/**
	 * Run every configured group and stitch the results into one payload.
	 *
	 * @return array{version:string,ttl:int,groups:array}
	 */
	private function buildIndex(): array {
		$groups = [];
		foreach ( $this->getGroupConfigs() as $i => $groupConfig ) {
			$group = $this->buildGroup( $groupConfig, (string)$i );
			if ( $group !== null ) {
				$groups[] = $group;
			}
		}

		return [
			// Content-addressed: the client can skip re-parsing when nothing has changed
			'version' => substr( sha1( json_encode( $groups ) ), 0, 16 ),
			'ttl' => $this->getTtl(),
			'groups' => $groups,
		];
	}

	/**
	 * @param array $groupConfig one entry of $wgArknightsSearchIndex
	 * @param string $fallbackId
	 * @return array|null null when the group is unusable (bad config, missing table)
	 */
	private function buildGroup( array $groupConfig, string $fallbackId ): ?array {
		$fields = $groupConfig['fields'] ?? [];
		$titleField = $fields['title'] ?? null;
		$tables = $groupConfig['tables'] ?? null;

		if ( !is_string( $tables ) || $tables === '' || !is_string( $titleField ) || $titleField === '' ) {
			$this->warn( 'group is missing "tables" or "fields.title"', $groupConfig );
			return null;
		}
		$cargoQuery = $this->getCargoQueryClass();
		if ( $cargoQuery === null ) {
			$this->warn( 'Cargo is not installed, so no index can be built', $groupConfig );
			return null;
		}

		// Map the configured Cargo expressions onto the fixed aliases used below. Aliases
		// rather than raw field names, so a group can point at a computed expression too.
		$select = [ 'ak_title' => $titleField ];
		foreach ( [ 'desc', 'rarity', 'class' ] as $key ) {
			if ( !empty( $fields[$key] ) && is_string( $fields[$key] ) ) {
				$select[ 'ak_' . $key ] = $fields[$key];
			}
		}
		$aliasFields = array_values( array_filter(
			(array)( $fields['aliases'] ?? [] ),
			static fn ( $f ) => is_string( $f ) && $f !== ''
		) );
		foreach ( $aliasFields as $n => $field ) {
			$select[ 'ak_alias' . $n ] = $field;
		}

		$fieldsStr = implode( ',', array_map(
			static fn ( $alias, $expr ) => $expr . '=' . $alias,
			array_keys( $select ),
			$select
		) );

		$limit = (int)( $groupConfig['limit'] ?? 5000 );
		$limit = max( 1, min( $limit, self::MAX_ROWS_PER_GROUP ) );
		$rarityOffset = (int)( $groupConfig['rarityOffset'] ?? 0 );

		try {
			$query = $cargoQuery::newFromValues(
				$tables,
				$fieldsStr,
				(string)( $groupConfig['where'] ?? '' ),
				(string)( $groupConfig['joinOn'] ?? '' ),
				(string)( $groupConfig['groupBy'] ?? '' ),
				(string)( $groupConfig['having'] ?? '' ),
				(string)( $groupConfig['orderBy'] ?? '' ),
				(string)$limit,
				'0'
			);
			$rows = $query->run();
		} catch ( Throwable $e ) {
			// A wiki editing its Cargo schema should degrade to "no local index", never to
			// a broken search box.
			$this->warn( 'Cargo query failed: ' . $e->getMessage(), $groupConfig );
			return null;
		}

		$items = [];
		$seen = [];
		foreach ( $rows as $row ) {
			$title = trim( (string)( $row['ak_title'] ?? '' ) );
			if ( $title === '' || isset( $seen[$title] ) ) {
				continue;
			}
			$seen[$title] = true;

			$aliases = [];
			foreach ( array_keys( $aliasFields ) as $n ) {
				$alias = self::plain( $row[ 'ak_alias' . $n ] ?? '' );
				// An alias identical to the title earns nothing and costs bytes
				if ( $alias !== '' && $alias !== $title && !in_array( $alias, $aliases, true ) ) {
					$aliases[] = $alias;
				}
			}

			// No URL in the payload: the client derives it with mw.util.getUrl(), which
			// costs one call per rendered row and saves a third of the transfer. We still
			// validate here, so a row that could never resolve to a page is dropped rather
			// than shipped as a dead link.
			if ( !$this->isUsableTitle( $title ) ) {
				continue;
			}

			$item = [ 't' => $title ];
			if ( $aliases ) {
				$item['a'] = $aliases;
			}
			[ $initials, $full ] = $this->pinyin( $title );
			if ( $initials !== '' ) {
				$item['p'] = $initials;
				$item['f'] = $full;
			}
			foreach ( [ 'desc' => 'd', 'class' => 'c' ] as $key => $short ) {
				$value = self::plain( $row[ 'ak_' . $key ] ?? '' );
				if ( $value !== '' ) {
					$item[$short] = $value;
				}
			}
			// Star count, normalised to 1..6. Cargo tables commonly store this zero-based
			// (PRTS.wiki's `chara.rarity` is 0-5), hence the configurable offset — Cargo's
			// API rejects arithmetic in a field expression, so it cannot be done in SQL.
			$rarity = trim( (string)( $row['ak_rarity'] ?? '' ) );
			if ( $rarity !== '' && is_numeric( $rarity ) ) {
				$stars = (int)$rarity + $rarityOffset;
				if ( $stars >= 1 && $stars <= 6 ) {
					$item['r'] = $stars;
				}
			}
			$items[] = $item;
		}

		if ( !$items ) {
			return null;
		}

		$labelMsg = $groupConfig['labelMsg'] ?? null;
		return [
			'id' => (string)( $groupConfig['id'] ?? $fallbackId ),
			'type' => (string)( $groupConfig['type'] ?? 'page' ),
			'label' => is_string( $labelMsg ) && $labelMsg !== '' ?
				$this->msg( $labelMsg )->text() :
				(string)( $groupConfig['label'] ?? '' ),
			'en' => (string)( $groupConfig['en'] ?? '' ),
			'items' => $items,
		];
	}

	/**
	 * Cargo stores what the wikitext produced, so values that came from templates arrive
	 * HTML-escaped — PRTS.wiki's `chara.en` holds `Ch&#039;en`, not `Ch'en`. These are
	 * rendered as text in the palette, so decode them once here rather than shipping the
	 * entities to every client.
	 *
	 * Deliberately not applied to the title: `_pageName` comes straight from the page
	 * table and is never escaped, so decoding could only corrupt a page whose name really
	 * does contain an ampersand sequence.
	 */
	private static function plain( mixed $value ): string {
		return trim( html_entity_decode( (string)$value, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
	}

	private function isUsableTitle( string $title ): bool {
		return Title::newFromText( $title ) !== null;
	}

	private function getCargoQueryClass(): ?string {
		foreach ( self::CARGO_QUERY_CLASSES as $class ) {
			if ( class_exists( $class ) ) {
				return $class;
			}
		}
		return null;
	}

	/**
	 * Pinyin initials and full reading for a Han string, e.g. 银灰 → [ 'yh', 'yinhui' ].
	 *
	 * Needs PHP's intl extension; without it the index still works, just without the
	 * pinyin shortcut. Strings with no Han characters get nothing — matching those
	 * literally is already what the title and alias fields do.
	 *
	 * @return array{0:string,1:string}
	 */
	private function pinyin( string $text ): array {
		if ( !preg_match( '/\p{Han}/u', $text ) ) {
			return [ '', '' ];
		}
		$transliterator = $this->getTransliterator();
		if ( !$transliterator ) {
			return [ '', '' ];
		}

		$latin = $transliterator->transliterate( $text );
		if ( !is_string( $latin ) ) {
			return [ '', '' ];
		}
		// Han-Latin emits one space-separated syllable per character
		if ( !preg_match_all( '/[a-z]+/', strtolower( $latin ), $matches ) ) {
			return [ '', '' ];
		}
		$syllables = $matches[0];
		$initials = implode( '', array_map( static fn ( $s ) => $s[0], $syllables ) );
		return [ $initials, implode( '', $syllables ) ];
	}

	private function getTransliterator(): ?Transliterator {
		if ( !$this->transliteratorResolved ) {
			$this->transliteratorResolved = true;
			if ( class_exists( Transliterator::class ) ) {
				// Latin-ASCII strips the tone marks Han-Latin adds (yín → yin)
				$this->transliterator = Transliterator::create( 'Han-Latin; Latin-ASCII' );
			}
			if ( !$this->transliterator ) {
				$this->warn( 'intl/Transliterator unavailable — index built without pinyin', [] );
			}
		}
		return $this->transliterator;
	}

	private function getGroupConfigs(): array {
		$groups = $this->config->get( 'ArknightsSearchIndex' );
		return is_array( $groups ) ? array_values( array_filter( $groups, 'is_array' ) ) : [];
	}

	private function getTtl(): int {
		return max( 60, (int)$this->config->get( 'ArknightsSearchIndexTTL' ) );
	}

	private function warn( string $message, array $groupConfig ): void {
		LoggerFactory::getInstance( 'Arknights' )->warning(
			'search index: {message}',
			[ 'message' => $message, 'group' => $groupConfig['id'] ?? '?' ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getAllowedParams(): array {
		return [];
	}

	/**
	 * @inheritDoc
	 */
	public function getCacheMode( $params ): string {
		return 'public';
	}

	/**
	 * @inheritDoc
	 */
	public function isInternal(): bool {
		// The payload is a reshaping of public wiki content, but the format is the skin's
		// private contract with searchIndex.js and may change without notice.
		return true;
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages(): array {
		return [
			'action=arknightssearchindex' => 'apihelp-arknightssearchindex-example',
		];
	}
}
