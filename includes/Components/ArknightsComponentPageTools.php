<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use Exception;
use MediaWiki\Config\Config;
use MediaWiki\Permissions\PermissionManager;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MessageLocalizer;

/**
 * The page action cluster that sits on the title row: namespace tabs (page / talk),
 * views (read / edit / history / watch), the language-variant dropdown and the "more"
 * card holding the actions and toolbox portlets.
 */
class ArknightsComponentPageTools implements ArknightsComponent {

	public function __construct(
		private readonly Config $config,
		private readonly MessageLocalizer $localizer,
		private readonly Title $title,
		private readonly User $user,
		private readonly PermissionManager $permissionManager,
		private readonly array $portlets,
		private readonly array $toolbox = []
	) {
	}

	/**
	 * Visibility condition for the views/actions tabs:
	 * true | false | 'login' | 'permission-<right>' (e.g. permission-edit)
	 */
	private function shouldShowPageTools(): bool {
		$condition = $this->config->get( 'ArknightsShowPageTools' );

		if ( $condition === 'login' ) {
			return $this->user->isRegistered();
		}
		if ( is_string( $condition ) && str_starts_with( $condition, 'permission-' ) ) {
			$permission = substr( $condition, 11 );
			try {
				return $this->permissionManager->userCan( $permission, $this->user, $this->title );
			} catch ( Exception ) {
				return false;
			}
		}
		return (bool)$condition;
	}

	private function menu( string $key ): ?array {
		$data = $this->portlets[$key] ?? null;
		if ( !is_array( $data ) || !$data ) {
			return null;
		}
		$menu = ( new ArknightsComponentMenu( $data ) )->getTemplateData();
		return $menu['is-empty'] ? null : $menu;
	}

	public function getTemplateData(): array {
		$isVisible = $this->shouldShowPageTools();
		$associated = $this->menu( 'data-associated-pages' ) ?? $this->menu( 'data-namespaces' );
		$views = $this->menu( 'data-views' );
		$actions = $this->menu( 'data-actions' );
		$variants = $this->menu( 'data-variants' );

		$toolbox = null;
		if ( $this->toolbox ) {
			$menu = ( new ArknightsComponentMenu( $this->toolbox ) )->getTemplateData();
			$toolbox = $menu['is-empty'] ? null : $menu;
		}

		// $wgArknightsShowPageTools gates the tabs, not the card: the toolbox is how you
		// reach "what links here" / "page information" at all now that it has left the
		// sidebar, so hiding the tabs must not take it with them. Citizen keeps
		// has-overflow independent of is-visible for the same reason.
		$hasOverflow = (bool)( $actions || $toolbox );

		return [
			'is-visible' => $isVisible,
			'data-associated-pages' => $associated,
			'data-views' => $views,
			'data-actions' => $actions,
			'data-toolbox' => $toolbox,
			'data-variants' => $variants,
			'has-overflow' => $hasOverflow,
			'has-tools' => $hasOverflow || ( $isVisible && ( $associated || $views || $variants ) ),
			'is-tabs-visible' => $isVisible,
			'msg-more' => $this->localizer->msg( 'arknights-page-tools-more' )->text(),
			'msg-variants' => $this->localizer->msg( 'arknights-variants-toggle' )->text(),
		];
	}
}
