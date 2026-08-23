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
				$parentData['data-portlets']['data-user-page'] ?? [],
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
				$parentData['data-footer'] ?? []
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
		$parentData['has-indicators'] = !empty( $parentData['array-indicators'] );
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
