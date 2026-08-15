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
 * Page tools bar: namespace tabs (page / talk), views (read / edit / history / watch),
 * the "more" dropdown (actions) and the language-variant dropdown.
 */
class ArknightsComponentPageTools implements ArknightsComponent {

	public function __construct(
		private readonly Config $config,
		private readonly MessageLocalizer $localizer,
		private readonly Title $title,
		private readonly User $user,
		private readonly PermissionManager $permissionManager,
		private readonly array $portlets
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

		return [
			'is-visible' => $isVisible,
			'data-associated-pages' => $associated,
			'data-views' => $views,
			'data-actions' => $actions,
			'data-variants' => $variants,
			'has-tools' => $isVisible && ( $associated || $views || $actions || $variants ),
			'msg-more' => $this->localizer->msg( 'arknights-page-tools-more' )->text(),
			'msg-variants' => $this->localizer->msg( 'arknights-variants-toggle' )->text(),
		];
	}
}
