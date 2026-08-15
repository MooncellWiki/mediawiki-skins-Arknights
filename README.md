# Skin:Arknights — PRTS.wiki 明日方舟皮肤

基于 [AKDS 设计系统](https://github.com/MooncellWiki/prts-redesign)（prts-redesign）实现的 MediaWiki 1.43+ 皮肤，
结构参考 [Citizen](https://github.com/StarCitizenTools/mediawiki-skins-Citizen)：`SkinMustache` + PHP 组件 + Mustache 模板 + LESS + ResourceLoader 包模块。

- 终端（暗）/ 档案（亮）/ 跟随系统 三态主题，`<html class="skin-theme-clientpref-*">`，与 Vector 2022 / Minerva 同一套类名（`.skin-invert` `.notheme` `.mw-no-invert` 约定同样支持）
- **wikitext 侧栏**：`MediaWiki:MenuSidebar` 以当前页面为上下文解析后直接渲染进侧栏（VectorMenuSidebar 的皮肤原生实现，见下文）
- wikitext 页眉主导航（`MediaWiki:Arknights-header-nav`）
- 多层树形侧栏（任意深度展开、记忆、当前页路径自动展开、桌面悬停飞出）
- 右侧粘性目录（scrollspy + 阅读进度 + 折叠），窄屏变浮动抽屉
- 响应式：≥1400 三栏 · ≥1120 双栏 · <1120 侧栏抽屉 · <640 紧凑页眉
- Codex/OOUI/核心特殊页面/常用扩展（Echo、TabberNeue、WikiEditor、CodeMirror、ULS、Cargo、SMW …）的 skinStyles

## 安装

```bash
cd skins/
git clone https://github.com/MooncellWiki/mediawiki-skins-Arknights Arknights
```

`LocalSettings.php`：

```php
wfLoadSkin( 'Arknights' );
$wgDefaultSkin = 'arknights';          // 可选

// PRTS：用 MediaWiki:MenuSidebar 作为侧栏（替代 Extension:VectorMenuSidebar 的作用）
$wgArknightsMenuSidebar = true;
```

无需 composer / npm 构建；ResourceLoader 直接编译 LESS 与 CSS。

## 配置

| 变量 | 默认 | 说明 |
|---|---|---|
| `$wgArknightsThemeDefault` | `'os'` | 访客未选择时的主题：`os` / `day`（档案·亮）/ `night`（终端·暗），也接受 `auto/light/dark` |
| `$wgArknightsThemeColor` | `'#0f0f10'` | `<meta name="theme-color">` |
| `$wgArknightsEnableThemeToggle` | `true` | 页眉主题切换 |
| `$wgArknightsMenuSidebar` | `false` | 渲染 `MediaWiki:MenuSidebar`（wikitext）为侧栏导航 |
| `$wgArknightsMenuSidebarMessage` | `'MenuSidebar'` | 侧栏 wikitext 所在的 MediaWiki 名字空间消息名 |
| `$wgArknightsMenuSidebarAfterMessage` | `'MenuSidebarAfter'` | 侧栏下方追加内容的消息名，`''` 关闭 |
| `$wgArknightsMenuSidebarHidePortlets` | `true` | 启用 MenuSidebar 时隐藏 `MediaWiki:Sidebar` 门户（工具箱与语言除外），与 VMS 行为一致 |
| `$wgArknightsHeaderNavMessage` | `'Arknights-header-nav'` | 页眉主导航的消息名（`*` 列表 wikitext）；消息不存在或为 `-` 时不显示 |
| `$wgArknightsShowPageTools` | `true` | 页面工具可见性：`true` / `false` / `'login'` / `'permission-edit'` 等 |
| `$wgArknightsSidebarFlyout` | `true` | 桌面端侧栏折叠分支的悬停飞出预览 |
| `$wgArknightsTableOfContentsCollapseAtCount` | `28` | 标题数 ≥ 此值时目录默认折叠子节 |

站内可编辑的消息：

| 页面 | 用途 |
|---|---|
| `MediaWiki:MenuSidebar` / `MediaWiki:MenuSidebarAfter` | 侧栏（同 VMS 语法：`分组标题` 独立一行 / `*` 项 / `'''粗体'''` = 有子级的分组项 / `**` 子项，深度不限；支持 `{{#tsl:}}` `{{FULLPAGENAME}}` `{{PAGEID}}` `{{#widget:}}` 等） |
| `MediaWiki:Arknights-header-nav` | 页眉主导航，`* [[干员一览|干员]]` 列表；解析器自动给当前页加 `a.mw-selflink` → 高亮 |
| `MediaWiki:Arknights-header-tagline` | 页眉/页脚站名下方的拉丁小字（如 `ARKNIGHTS WIKI`） |
| `MediaWiki:Arknights-footer-desc` / `-footer-tagline` | 页脚描述段 / 底栏一句话（wikitext，默认关闭） |
| `MediaWiki:Arknights-tagline-ns-<名字空间小写>` | 按名字空间覆盖标题下方的 tagline |
| `MediaWiki:Arknights.css` / `MediaWiki:Arknights.js` | 皮肤专属站点样式/脚本（MediaWiki 自动加载） |

## 目录结构

```
skin.json                         注册：ValidSkinNames / ResourceModules / skinStyles / config
includes/
  SkinArknights.php               SkinMustache 子类：模板数据、<html> 主题类、watch 星标搬到 views、菜单图标
  Components/*.php                每块 UI 一个组件（Citizen 风格）：MainMenu / MenuSidebar / HeaderNav / UserMenu /
                                  PageHeading / PageTools / TableOfContents / PageFooter / Footer / Menu
  Menu/WikitextMenuParser.php     以当前页为上下文解析 MediaWiki 名字空间 wikitext，并把 RL 模块转发给 OutputPage
  Menu/MenuItemDecorator.php      把核心的 icon 键变成 <span class="ak-icon ak-icon--x">
  Hooks/SkinHooks.php             BeforePageDisplay（内联主题脚本）/ viewport / 工具箱图标
  Hooks/ResourceLoaderHooks.php   config.json
templates/*.mustache              skin · Header · Header__logo · HeaderNav · Search · ThemeToggle · UserMenu · Menu ·
                                  Sidebar · PageHeader · PageTools · Indicators · TableOfContents(+__list/__line) ·
                                  PageFooter · Footer · SectionLinks · Link
resources/
  design-system/                  ← 从 prts-redesign/src 原样同步（tokens/base/components/arknights/utilities.css + sidebar-tree.js），勿改
  mediawiki.less/                 mediawiki.skin.variables.less（Codex 令牌 → --ak-* 桥接）
  skins.arknights.styles/         皮肤骨架 LESS（header / sidebar / menu-sidebar / page-header / page-tools / toc / footer / responsive / print …）
  skins.arknights.scripts/        theme · dropdown · drawer · header · search · toc · backToTop · interactive · sidebarTree · inline(<head>)
skinStyles/                       核心 / OOUI / jQuery / 扩展 的皮肤覆盖
i18n/                             en · qqq · zh-hans · zh-hant · ja
scripts/sync-design-system.sh     同步设计系统 + 生成 .notheme 令牌重置
```

分层：`tokens.css`（令牌+主题+Codex 桥接）→ `base.css`（wikitext 产物）→ `components.css` / `arknights.css`（组件与方舟装饰）→ `utilities.css` → `skin.less`（皮肤骨架）。前五个文件是设计系统的产物，
**只在 prts-redesign 里改**，然后运行 `scripts/sync-design-system.sh [path/to/prts-redesign]`。

## MenuSidebar：VectorMenuSidebar 的皮肤原生实现

现网 `Extension:VectorMenuSidebar` 的做法：`BeforePageDisplay` 里把 `wfMessage('MenuSidebar')->parse()` 塞进页面末尾一个 `display:none` 的 `<div id="MenuSidebar">`，再用内联脚本在 `DOMContentLoaded` 时删除 `#mw-panel` 的门户、把 `#p-tb ul` 复制进 `#MSToolbox`、把整个 div 挪进 `#mw-panel`。

本皮肤把同一件事做成了组件（`ArknightsComponentMenuSidebar` + `WikitextMenuParser`）：

| | VectorMenuSidebar | Skin:Arknights |
|---|---|---|
| 解析 | `wfMessage()->parse()`，标题上下文靠 `$wgTitle` | `Parser::parse( $wikitext, $currentTitle, ParserOptions(interface) )`，显式以当前页为上下文，`{{FULLPAGENAME}}` `{{PAGEID}}` `{{NAMESPACENUMBER}}` `{{#tsl:}}` 全部可用 |
| 输出位置 | 页尾隐藏 div + 内联 JS 搬运 | 服务端直接渲染进 `aside.ak-sidebar > #mw-panel > nav#MenuSidebar`，无 JS 依赖、无闪动、无内联脚本（CSP 友好） |
| 工具箱 | 复制 `#p-tb ul` 到 `#MSToolbox` 后删除门户 | 工具箱作为标准门户 `#p-tb` 保留在侧栏中（`mw.util.addPortletLink('p-tb', …)` 继续可用），并带图标 |
| 样式 | `MediaWiki:MenuSidebar.css` 内联 `<style>` | 皮肤 LESS（`common/sidebar.less` `common/menu-sidebar.less`）；站点定制放 `MediaWiki:Arknights.css` |
| 交互 | CSS `:hover` 飞出 | `design-system/sidebar-tree.js`：任意深度展开/收起 + `localStorage` 记忆 + 当前页路径自动展开 + 键盘 + 桌面悬停飞出 |
| 输出结构 | `p` / `ul` / `li > b` / `li > a` | 完全相同（HTML 由同一段 wikitext 解析得到），`#MenuSidebar` id 也保留 |
| 模板里的 TemplateStyles / 模块 | 丢失 | `ParserOutput` 的 modules / moduleStyles / jsConfigVars 转发到 OutputPage |
| 其他皮肤 | 只对 vector 生效 | 只对 arknights 生效；VMS 与本皮肤可以同时安装、互不干扰（各自检查 skin name） |

因此**无需改动 `MediaWiki:MenuSidebar` 的 wikitext** 即可迁移；`MediaWiki:MenuSidebarAfter` 同样支持。

后续可评估的改进（尚未做，欢迎评估）：
1. **缓存**：现在与 VMS 一样每次请求都解析一次；可以按 (页面 ID, 用户语言, MenuSidebar 最后修改时间) 做 WAN 缓存，代价是模板变化（如 `{{MenuSidebarAutoEvents}}`）会有 TTL 延迟。
2. **VMS 退役**：Vector 皮肤上线期间两者并存；全站切到 Arknights 后 VMS 可以卸载。若希望在 Vector 上也用这套渲染，可以把 `WikitextMenuParser` 抽成一个小扩展给两边共用。
3. `#MSToolbox` id 未保留（工具箱现在就是 `#p-tb`）；若站点脚本/小工具依赖 `#MSToolbox`，需要改成 `#p-tb`。

## 与设计系统的对应

- 页眉 `.ak-header`、侧栏 `.ak-sidebar`、页面头 `.ak-page-header`、目录 `.ak-toc`、页脚 `.ak-footer` 等类名与 prts-redesign 的 `src/skin.css` 一致，但骨架样式由本皮肤的 LESS 维护（DOM 由模板定义）。
- 图标：`skins.arknights.icons`（OOUI WikimediaUI 图标，`mask-image` + `currentColor`），类名 `.ak-icon.ak-icon--{name}`；可用名称见 `includes/Menu/MenuItemDecorator.php::ICONS`（与 skin.json 保持同步）。
- 模板/TemplateStyles 中直接使用 `.ak-*` 组件与 `var(--ak-*)` 令牌，与预览页一致；`data-bind`/`.ak-tabs`/`.ak-phase-tabs` 等交互约定由 `interactive.js` 提供。
- 小工具可用的钩子：`mw.hook('skin.arknights.clientPrefs')`（主题变化）、`mw.hook('skin.arknights.toast').fire(msg, type, title)`、`mw.hook('skin.arknights.sidebar').fire()`（侧栏内容变化后重新增强树）。

## 开发

```bash
scripts/sync-design-system.sh ../../JSWorkspace/prts-redesign   # 同步设计系统
```

本地验证：把仓库放到 MediaWiki 的 `skins/Arknights`，`wfLoadSkin( 'Arknights' )`，打开 `?debug=2` 查看未压缩的 LESS 输出。
LESS 注意：less.php 会尝试求值 CSS 的 `min()/max()`，需要写成 `~"min( 92vw, 360px )"`。
Mustache 注意：MediaWiki 的 LightnCandy 只把 `null` / `false` / 空数组当假值，`''` 在 `{{#x}}` 里为真 —— PHP 侧可选字符串请返回 `null`。

## 许可

GPL-3.0-or-later。游戏素材版权归鹰角网络所有。
