<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights;

use MediaWiki\Output\OutputPage;
use MediaWiki\Permissions\PermissionManager;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentFooter;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentMainMenu;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentMenuSidebar;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentPageFooter;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentPageHeading;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentPageTools;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentTableOfContents;
use MediaWiki\Skins\Arknights\Components\ArknightsComponentUserMenu;
use MediaWiki\Skins\Arknights\Menu\FooterLinksParser;
use MediaWiki\Skins\Arknights\Menu\MenuItemDecorator;
use MediaWiki\Skins\Arknights\Menu\WikitextMenuParser;
use SkinMustache;
use SkinTemplate;

/**
 * Skin subclass for Arknights (PRTS.wiki)
 *
 * @ingroup Skins
 */
class SkinArknights extends SkinMustache {

	/** Client-pref values understood by the theme switcher */
	public const THEMES = [ 'os', 'day', 'night' ];

	/** Class prefix on <html>, shared with Vector 2022 / Minerva so on-wiki CSS can target one selector */
	public const THEME_CLASS_PREFIX = 'skin-theme-clientpref-';

	/**
	 * The `userpage` item lifted out of the user menu (it becomes the card's head), or null.
	 * Filled in runOnSkinTemplateNavigationHooks(), read in getTemplateData().
	 */
	private ?array $userPageLink = null;

	public function __construct(
		private readonly PermissionManager $permissionManager,
		array $options = []
	) {
		if ( !isset( $options['name'] ) ) {
			$options['name'] = 'arknights';
		}
		parent::__construct( $options );
	}

	/**
	 * @inheritDoc
	 */
	public function initPage( OutputPage $out ): void {
		parent::initPage( $out );
		$out->addMeta( 'theme-color', (string)$this->getConfig()->get( 'ArknightsThemeColor' ) );
	}

	/**
	 * Add the default theme class and feature flags to <html>.
	 * The inline script added in SkinHooks::onBeforePageDisplay swaps the theme
	 * class before first paint when the visitor has stored a preference.
	 *
	 * @inheritDoc
	 */
	public function getHtmlElementAttributes(): array {
		$attrs = parent::getHtmlElementAttributes();
		$config = $this->getConfig();

		$classes = [
			self::THEME_CLASS_PREFIX . self::normalizeTheme( $config->get( 'ArknightsThemeDefault' ) ),
		];
		if ( $config->get( 'ArknightsSidebarFlyout' ) !== true ) {
			// Read by resources/design-system/sidebar-tree.js
			$attrs['data-akds-flyout'] = 'off';
		}

		$attrs['class'] = trim( ( $attrs['class'] ?? '' ) . ' ' . implode( ' ', $classes ) );
		return $attrs;
	}

	/**
	 * Map any configured value onto one of the supported theme keys.
	 * Also accepts the Citizen/Vector-style aliases auto|light|dark.
	 */
	public static function normalizeTheme( mixed $theme ): string {
		$map = [ 'auto' => 'os', 'light' => 'day', 'dark' => 'night' ];
		if ( is_string( $theme ) ) {
			$theme = $map[$theme] ?? $theme;
			if ( in_array( $theme, self::THEMES, true ) ) {
				return $theme;
			}
		}
		return 'os';
	}

	/**
	 * Decorate the navigation menus (icons) after every SkinTemplateNavigation hook has run.
	 *
	 * @param SkinTemplate $skin
	 * @param array &$content_navigation
	 */
	protected function runOnSkinTemplateNavigationHooks( SkinTemplate $skin, &$content_navigation ): void {
		parent::runOnSkinTemplateNavigationHooks( $skin, $content_navigation );

		// Promote the watch star from the "more" dropdown to the views tabs (as Vector does)
		foreach ( [ 'watch', 'unwatch' ] as $key ) {
			if ( isset( $content_navigation['actions'][$key] ) ) {
				$content_navigation['views'][$key] = $content_navigation['actions'][$key];
				unset( $content_navigation['actions'][$key] );
			}
		}

		// The user page link is the head of the user card (a.ak-menu__head#pt-userpage), so the
		// name shows up once: take it out of the menu before the portlet is rendered.
		if ( isset( $content_navigation['user-menu']['userpage'] )
			&& is_array( $content_navigation['user-menu']['userpage'] )
		) {
			$this->userPageLink = $content_navigation['user-menu']['userpage'];
			unset( $content_navigation['user-menu']['userpage'] );
		}

		// Core sets no `icon` on views / associated-pages, so the action cluster maps its own.
		if ( isset( $content_navigation['views'] ) && is_array( $content_navigation['views'] ) ) {
			MenuItemDecorator::mapIcons( $content_navigation['views'], [
				'view' => 'eye',
				'edit' => 'edit',
				've-edit' => 'edit',
				'viewsource' => 'wikiText',
				'history' => 'history',
				'watch' => 'star',
				'unwatch' => 'unStar',
				'addsection' => 'speechBubbleAdd',
			] );
		}

		// Core ices most of #p-cactions with an icon but leaves purge bare, which shows now
		// that the actions sit in a card next to the fully-iconed toolbox.
		if ( isset( $content_navigation['actions'] ) && is_array( $content_navigation['actions'] ) ) {
			MenuItemDecorator::mapIcons( $content_navigation['actions'], [
				'purge' => 'reload',
			] );
		}

		if ( isset( $content_navigation['associated-pages'] )
			&& is_array( $content_navigation['associated-pages'] )
		) {
			$associated = &$content_navigation['associated-pages'];
			// Keys here are namespace names, so only the talk side has a fixed one — the
			// subject tab is `main` in article space but `project`, `user`, `file`, … in
			// every other. Whatever it is called, on a talk page it is a *return* to the
			// page you came from rather than a new destination, so it takes arrowPrevious.
			$navTitle = $skin->getTitle();
			$onTalkPage = $navTitle !== null && $navTitle->isTalkPage();
			foreach ( $associated as $key => $item ) {
				if ( !is_array( $item ) || !empty( $item['icon'] ) ) {
					continue;
				}
				$isTalkTab = $key === 'talk' || str_ends_with( (string)$key, '_talk' );
				if ( $isTalkTab ) {
					$associated[$key]['icon'] = 'speechBubbles';
				} else {
					$associated[$key]['icon'] = $onTalkPage ? 'arrowPrevious' : 'articleRedirect';
				}
			}
			unset( $associated );
		}

		$menus = [
			'user-interface-preferences', 'user-menu', 'user-page',
			'views', 'actions', 'associated-pages', 'variants',
		];
		foreach ( $menus as $menu ) {
			if ( isset( $content_navigation[$menu] ) && is_array( $content_navigation[$menu] ) ) {
				MenuItemDecorator::addIconsToMenuItems( $content_navigation[$menu] );
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public function getTemplateData(): array {
		$parentData = parent::getTemplateData();

		$config = $this->getConfig();
		$localizer = $this->getContext();
		$out = $this->getOutput();
		$title = $this->getTitle();
		$user = $this->getUser();

		$wikitextMenus = new WikitextMenuParser( $this->getContext(), $out, $title );
		$menuSidebar = new ArknightsComponentMenuSidebar( $config, $localizer, $wikitextMenus );
		$menuSidebarData = $menuSidebar->getTemplateData();

		$components = [
			'data-main-menu' => new ArknightsComponentMainMenu(
				$config,
				$parentData['data-portlets-sidebar'] ?? [],
				$parentData['data-portlets']['data-languages'] ?? [],
				$menuSidebarData
			),
			'data-user-menu' => new ArknightsComponentUserMenu(
				$localizer,
				$user,
				$parentData['data-portlets']['data-user-menu'] ?? [],
				$this->userPageLink,
				$parentData['data-portlets']['data-notifications'] ?? [],
				$parentData['data-portlets']['data-user-interface-preferences'] ?? []
			),
			'data-page-heading' => new ArknightsComponentPageHeading(
				$localizer,
				$out,
				$title,
				$parentData['html-title-heading'] ?? '',
				$parentData['is-title-blank'] ?? false
			),
			'data-page-tools' => new ArknightsComponentPageTools(
				$config,
				$localizer,
				$title,
				$user,
				$this->permissionManager,
				$parentData['data-portlets'] ?? [],
				self::extractToolbox( $parentData['data-portlets-sidebar'] ?? [] )
			),
			'data-toc' => new ArknightsComponentTableOfContents(
				$parentData['data-toc'] ?? [],
				$config
			),
			'data-page-footer' => new ArknightsComponentPageFooter(
				$parentData['data-footer']['data-info'] ?? []
			),
			'data-footer' => new ArknightsComponentFooter(
				$localizer,
				$parentData['data-footer'] ?? [],
				FooterLinksParser::parse( $this )
			),
		];

		foreach ( $components as $key => $component ) {
			$parentData[$key] = $component->getTemplateData();
		}

		$parentData['data-menu-sidebar'] = $menuSidebarData;
		$parentData['is-mainpage-view'] = $title->isMainPage() && $this->getActionName() === 'view';
		$parentData['toc-enabled'] = !$parentData['is-mainpage-view']
			&& !empty( $parentData['data-toc']['array-sections'] );
		$parentData['has-theme-toggle'] = $config->get( 'ArknightsEnableThemeToggle' ) === true;
		$parentData['html-logo-icon-src'] = $this->getLogoIconSrc( $parentData['data-logos'] ?? [] );
		// Whitespace-only indicators (SMW's entity examiner holds a "\n" placeholder until its script finds
		// something) are trimmed to truly :empty, so chrome/page-header.css can collapse the row they sit in
		$parentData['array-indicators'] = array_map(
			static fn ( array $indicator ) => [ 'html' => trim( $indicator['html'] ?? '' ) ] + $indicator,
			$parentData['array-indicators'] ?? []
		);
		$parentData['has-indicators'] = !empty( $parentData['array-indicators'] );
		// Between announcements MediaWiki:Sitenotice is left as an empty shell (on PRTS an empty .nomobile
		// and an empty .mobileonly div around two transcluded subpages). .ak-sitenotice would still render
		// with its top padding — 12px above every page — so a notice that shows nothing is not output at all.
		// Nothing fills #siteNotice client-side here (no CentralNotice, no gadget touches it).
		if ( self::isBlankHtml( $parentData['html-site-notice'] ?? '' ) ) {
			$parentData['html-site-notice'] = null;
		}
		$parentData['html-header-tagline'] = $this->getOptionalMessageText( 'arknights-header-tagline' );

		if ( $parentData['toc-enabled'] ) {
			// Template data is only computed for the active skin, so it is safe to touch $out here.
			$out->addBodyClasses( 'ak-toc-enabled' );
		}
		if ( $menuSidebarData ) {
			$out->addBodyClasses( 'ak-menusidebar-enabled' );
		}

		return $parentData;
	}

	/**
	 * Icons for toolbox entries that arrive without one.
	 *
	 * Keyed by the *array key* the item is registered under, which is not always the `t-`
	 * id you see in the HTML: CiteThisPage registers `citethispage` with `id => t-cite`,
	 * Cargo registers `cargo-pagevalues` with `id => t-cargopagevalueslink`.
	 *
	 * Extensions that pick their own icon are left alone — SemanticMediaWiki asks for
	 * `database` on its browse link, so that is what it gets (the name only has to be in
	 * MenuItemDecorator::ICONS for the markup to be emitted).
	 */
	private const TOOLBOX_ICONS = [
		'recentchangeslinked' => 'recentChanges',
		'print' => 'printer',
		'contributions' => 'userContributions',
		'emailuser' => 'userTalk',
		'upload' => 'upload',
		'specialpages' => 'specialPages',
		'permalink' => 'link',
		'info' => 'infoFilled',
		'cargo-pagevalues' => 'table',
		'citethispage' => 'quotes',
		// Atom / RSS. `feeds` is core's nested wrapper (see makeToolbox); the icon is pushed
		// down onto each feed link by MenuItemDecorator.
		'feeds' => 'feed',
	];

	/**
	 * Decorate the sidebar *after* every SidebarBeforeOutput handler has run.
	 *
	 * This used to be a SidebarBeforeOutput handler of our own, which turned out to be a
	 * race we lose: CiteThisPage and SemanticMediaWiki add their toolbox entries from that
	 * very hook, and hook handlers run in load order, so with `wfLoadSkin( 'Arknights' )`
	 * sitting above those extensions in LocalSettings.php their items simply did not exist
	 * yet when we went looking for them — 引用此页 and 浏览属性 rendered without icons, and
	 * whether they did was a property of the wiki's config file rather than of this skin.
	 *
	 * Core runs the hook inside buildSidebar() and returns straight after, so overriding it
	 * here puts us last unconditionally. Both steps below are idempotent, which matters
	 * because core memoises the pre-decoration array and hands us a fresh copy every call.
	 *
	 * @return array
	 */
	public function buildSidebar(): array {
		$sidebar = parent::buildSidebar();

		if ( isset( $sidebar['TOOLBOX'] ) && is_array( $sidebar['TOOLBOX'] ) ) {
			MenuItemDecorator::mapIcons( $sidebar['TOOLBOX'], self::TOOLBOX_ICONS );
			self::extractSiteTools( $sidebar );
		}

		foreach ( $sidebar as &$menu ) {
			if ( is_array( $menu ) ) {
				MenuItemDecorator::addIconsToMenuItems( $menu );
			}
		}
		unset( $menu );

		return $sidebar;
	}

	/**
	 * Split the two site-level entries out of the toolbox into their own sidebar section.
	 *
	 * The toolbox as a whole travels to the title row's "more" card because everything in
	 * it acts on the page you are looking at — except these two, which act on the wiki.
	 * Citizen draws the same line with moveUploadToSiteTools() + addSiteTools().
	 *
	 * The section name becomes the portlet id: SkinTemplate maps TOOLBOX to `p-tb` by hand
	 * and runs every other section through `p-$name`, so `site-tools` arrives as
	 * `#p-site-tools`. It renders untitled (ArknightsComponentMainMenu drops the label) so
	 * it reads as a continuation of the navigation above it rather than a heading of its own.
	 *
	 * `upload` is only present when the visitor may actually upload; taking it when it is
	 * absent is not an error, the section just comes out one item shorter.
	 *
	 * @param array &$sidebar
	 */
	private static function extractSiteTools( array &$sidebar ): void {
		$siteTools = [];
		foreach ( [ 'specialpages', 'upload' ] as $key ) {
			if ( isset( $sidebar['TOOLBOX'][$key] ) ) {
				$siteTools[$key] = $sidebar['TOOLBOX'][$key];
				unset( $sidebar['TOOLBOX'][$key] );
			}
		}
		if ( $siteTools ) {
			$sidebar['site-tools'] = $siteTools;
		}
	}

	/**
	 * Pull the toolbox portlet out of the sidebar data so it can be rendered in the title
	 * row's "more" card instead — the same move as Citizen's
	 * SkinCitizen::extractPageToolsFromSidebar(). ArknightsComponentMainMenu skips the
	 * same id, so it is rendered once, in the card.
	 *
	 * @param array $sidebarData data-portlets-sidebar
	 * @return array the `p-tb` portlet, or [] when the wiki has no toolbox
	 */
	private static function extractToolbox( array $sidebarData ): array {
		$portlets = $sidebarData['array-portlets-rest'] ?? [];
		$first = $sidebarData['data-portlets-first'] ?? null;
		if ( is_array( $first ) ) {
			array_unshift( $portlets, $first );
		}
		foreach ( $portlets as $portlet ) {
			if ( is_array( $portlet )
				&& ( $portlet['id'] ?? '' ) === ArknightsComponentMainMenu::TOOLBOX_ID
			) {
				return $portlet;
			}
		}
		return [];
	}

	/**
	 * Icon > svg > 1x, mirroring the fallback order of Vector/Citizen.
	 * Returns null (not '') when no logo is configured: MediaWiki's Mustache runtime
	 * treats '' as truthy inside {{#sections}}.
	 */
	private function getLogoIconSrc( array $logos ): ?string {
		foreach ( [ 'icon', 'svg', '1x' ] as $key ) {
			if ( !empty( $logos[$key] ) && is_string( $logos[$key] ) ) {
				return $logos[$key];
			}
		}
		return null;
	}

	/**
	 * Whether rendered HTML shows nothing: no text once tags, comments and entities are gone
	 * (whitespace, NBSP and zero-width spaces count as nothing), and no element that is visible
	 * without text (images, media, embeds, form controls).
	 */
	private static function isBlankHtml( string $html ): bool {
		$visible = 'img|svg|picture|video|audio|iframe|object|embed|canvas|input|button|select|textarea';
		if ( preg_match( "/<(?:$visible)\\b/i", $html ) ) {
			return false;
		}
		$text = html_entity_decode( strip_tags( $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		return preg_replace( '/[\s\x{00A0}\x{200B}\x{FEFF}]+/u', '', $text ) === '';
	}

	/**
	 * Text of an optional interface message: null when missing, disabled ('-') or empty.
	 */
	private function getOptionalMessageText( string $key ): ?string {
		$msg = $this->msg( $key );
		if ( !$msg->exists() || $msg->isDisabled() ) {
			return null;
		}
		$text = trim( $msg->text() );
		return $text !== '' ? $text : null;
	}
}
