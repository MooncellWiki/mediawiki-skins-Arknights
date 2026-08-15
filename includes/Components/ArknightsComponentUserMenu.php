<?php

declare( strict_types=1 );

namespace MediaWiki\Skins\Arknights\Components;

use MediaWiki\User\User;
use MessageLocalizer;

/**
 * Header user area: notifications badges (Echo), the user dropdown and the
 * button that opens it.
 */
class ArknightsComponentUserMenu implements ArknightsComponent {

	public function __construct(
		private readonly MessageLocalizer $localizer,
		private readonly User $user,
		private readonly array $userMenuData,
		private readonly array $userPageData,
		private readonly array $notificationsData,
		private readonly array $userInterfacePreferencesData
	) {
	}

	public function getTemplateData(): array {
		$isAnon = !$this->user->isRegistered();
		$isTemp = $this->user->isTemp();

		$userMenu = ( new ArknightsComponentMenu( $this->userMenuData ) )->getTemplateData();
		$userPage = $this->userPageData ? ( new ArknightsComponentMenu( $this->userPageData ) )->getTemplateData() : null;
		$notifications = $this->notificationsData
			? ( new ArknightsComponentMenu( $this->notificationsData ) )->getTemplateData()
			: null;
		$uiPrefs = $this->userInterfacePreferencesData
			? ( new ArknightsComponentMenu( $this->userInterfacePreferencesData ) )->getTemplateData()
			: null;

		$label = $isAnon
			? $this->localizer->msg( 'arknights-usermenu-anon' )->text()
			: $this->user->getName();

		return [
			'is-anon' => $isAnon,
			'is-temp' => $isTemp,
			'is-registered' => !$isAnon,
			'username' => $isAnon ? '' : $this->user->getName(),
			'label' => $label,
			'msg-toggle' => $this->localizer->msg( 'arknights-usermenu-toggle' )->text(),
			'data-user-menu' => $userMenu,
			'data-user-page' => $userPage && !$userPage['is-empty'] ? $userPage : null,
			'data-notifications' => $notifications && !$notifications['is-empty'] ? $notifications : null,
			'data-user-interface-preferences' => $uiPrefs && !$uiPrefs['is-empty'] ? $uiPrefs : null,
		];
	}
}
