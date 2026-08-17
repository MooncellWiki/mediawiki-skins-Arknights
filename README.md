# Skin:Arknights — PRTS.wiki 明日方舟皮肤

基于 [AKDS 设计系统](https://github.com/MooncellWiki/prts-design)（prts-design）实现的 MediaWiki 1.43+ 皮肤，
结构参考 [Citizen](https://github.com/StarCitizenTools/mediawiki-skins-Citizen)：`SkinMustache` + PHP 组件 + Mustache 模板 + LESS + ResourceLoader 包模块。

- 终端（暗）/ 档案（亮）/ 跟随系统 三态主题，`<html class="skin-theme-clientpref-*">`，与 Vector 2022 / Minerva 同一套类名（`.skin-invert` `.notheme` `.mw-no-invert` 约定同样支持）
- **wikitext 侧栏**：`MediaWiki:MenuSidebar` 以当前页面为上下文解析后直接渲染进侧栏（VectorMenuSidebar 的皮肤原生实现，见下文）
- 页眉主行是与正文三列对齐的 **品牌 · 搜索 · 工具** 网格，不放站点级主导航（导航只由侧栏承担）
- 多层树形侧栏（任意深度展开、记忆、当前页路径自动展开、桌面悬停飞出）
- 右侧粘性目录（scrollspy + 阅读进度 + 折叠），窄屏变浮动抽屉
- 响应式：≥1400 三栏 · ≥1120 双栏 · <1120 侧栏抽屉 + 页眉工具卡片 · <640 紧凑页眉
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

// 必需：切到 MW 1.43 的新版标题 DOM。皮肤已声明 supportsMwHeading，但解析器要等站点
// 关掉 legacy DOM 才会输出 <div class="mw-heading"><h2>…</h2><span class="mw-editsection">…
// </span></div>。仍用 legacy DOM 的话，章节标题排版（编辑链接靠右）和「悬停标题才显形」
// 都会失效——那些规则全挂在 .mw-heading 上，而 legacy DOM 里根本没有这个元素。
$wgParserEnableLegacyHeadingDOM = false;

// PRTS：用 MediaWiki:MenuSidebar 作为侧栏（替代 Extension:VectorMenuSidebar 的作用）
$wgArknightsMenuSidebar = true;
```

改动 `$wgParserEnableLegacyHeadingDOM` 会改变解析产物，既有的解析缓存需要失效
（`$wgCacheEpoch` 或逐页 `action=purge`）才能看到效果。

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
| `$wgArknightsShowPageTools` | `true` | 页面工具可见性：`true` / `false` / `'login'` / `'permission-edit'` 等 |
| `$wgArknightsSidebarFlyout` | `true` | 桌面端侧栏折叠分支的悬停飞出预览 |
| `$wgArknightsTableOfContentsCollapseAtCount` | `28` | 标题数 ≥ 此值时目录默认折叠子节 |
| `$wgArknightsSearchPalette` | `true` | 页眉搜索换成悬浮命令面板；`false` 保留原表单与核心搜索建议 |
| `$wgArknightsSearchIndex` | `[]` | 面板本地即时索引的 Cargo 数据源（见下文），空数组关闭 |
| `$wgArknightsSearchIndexTTL` | `3600` | 索引缓存秒数（服务端 WAN + CDN/浏览器） |

站内可编辑的消息：

| 页面 | 用途 |
|---|---|
| `MediaWiki:MenuSidebar` / `MediaWiki:MenuSidebarAfter` | 侧栏（同 VMS 语法：`分组标题` 独立一行 / `*` 项 / `'''粗体'''` = 有子级的分组项 / `**` 子项，深度不限；支持 `{{#tsl:}}` `{{FULLPAGENAME}}` `{{PAGEID}}` `{{#widget:}}` 等） |
| `MediaWiki:Arknights-search-shortcuts` | 搜索面板空态的快捷入口（同 `MediaWiki:Sidebar` 的条目语法，见下） |
| `MediaWiki:Arknights-header-tagline` | 页眉/页脚站名下方的拉丁小字（如 `ARKNIGHTS WIKI`） |
| `MediaWiki:Arknights-footer-desc` / `-footer-tagline` | 页脚描述段 / 底栏一句话（wikitext，默认关闭） |
| `MediaWiki:Arknights-tagline-ns-<名字空间小写>` | 按名字空间覆盖标题下方的 tagline |
| `MediaWiki:Arknights.css` / `MediaWiki:Arknights.js` | 皮肤专属站点样式/脚本（MediaWiki 自动加载） |

## 活动主题：头图 · 顶栏角饰 · 站标 · 主色

页眉与页脚是皮肤的「框」，在**两套主题下都是黑的**（官网导航栏 / 游戏主界面顶栏 / 干员档案页顶部黑边的框架语言），配色不读明暗主题，只读 `design-system/tokens.css §2d` 的 `--ak-chrome-*`。大活换皮不需要改选择器——现网 `ext.gadget.seventhStyle` 改的那几处（`body` 大图、`#mw-head` 左右底图、`.mw-wiki-logo`、侧栏分组渐变）都被抽成了接口变量，Gadget 或 `MediaWiki:Common.css` 只写变量即可，卸载即恢复：

```css
:root {
  --ak-theme-accent: #72a330;                       /* 页眉标语 / 悬停 / 外观开关选中项 / 搜索图标框、侧栏与目录分组条、页脚斜纹一起换 */
  --ak-keyart-image: url(//media.prts.wiki/…/kv.jpg);   --ak-keyart-h: 220px;   /* 头图 .ak-keyart：从页面顶端铺起、页眉压在它上面，-h 是页眉之下露出的那段，默认 0 不占位 */
  --ak-chrome-bg: rgba(8, 9, 10, .8);                                           /* 可选：页眉玻璃调淡些让头图多透一点（默认 .9，别低于 .72） */
  --ak-chrome-image: url(//media.prts.wiki/…/headleft.png);
  --ak-chrome-image-position: left top;   --ak-chrome-texture: 0;               /* 可选：顶栏角饰（现网 PRTSheadleft 那种活动徽章 / 深色底纹），有角饰就关掉默认网点 */
  --ak-logo-image: url(//media.prts.wiki/…/logo.png);                           /* 站标（Chromium / WebKit 生效；Firefox 请改 $wgLogos） */
  --ak-canvas-image: url(//media.prts.wiki/…/bkg.png);  --ak-canvas-repeat: no-repeat;   /* 画布底纹 */
}
html.skin-theme-clientpref-night { --ak-keyart-image: url(//media.prts.wiki/…/kv-night.jpg); }   /* 头图 / 画布图要分昼夜就这样写；页眉本身两套主题同色，角饰与站标只需一套 */
```

完整变量表见 prts-design 的 `docs/01-design-system.md §2.10`，可运行示例见 `preview/demo-theme.css`。四点注意：

- **页眉是压在头图上的一块均匀黑玻璃**：头图从页面顶端铺起（CSS 负外边距，DOM 顺序不变），页眉之下露出 `--ak-keyart-h` 那一段，`--ak-keyart-position` / `-size` 按「页眉 + 露出段」整块取景。可读性由 `--ak-chrome-bg` 的 alpha 保证，与底下是什么画无关——所以头图不必自己压暗顶部，也不要再裁一条「顶栏底图」从左缘渐入。`--ak-chrome-image` 画在玻璃**之上**、不被压暗，只放深色低对比的角饰 / 底纹，照片一律走 `--ak-keyart-image`。
- 接口变量里的 `url()` **必须写绝对地址**：Chromium 把自定义属性里的相对 `url()` 按「使用处」（`load.php`）解析，Firefox / WebKit 按「声明处」解析，相对地址两边指向不同目录。
- 只覆盖 `--ak-theme-accent` 时正文的链接 / 选中色不动，只有「框」在换；想连正文一起换，再覆盖 `--ak-accent`（亮 / 暗各写一次）。
- 头图上要放活动标题 / 倒计时，可往 `.ak-keyart__inner` 里塞内容（与页眉三列同宽）；`.ak-keyart` 默认带 `aria-hidden`，放可读内容时记得去掉。

### 页脚徽章（`$wgFooterIcons`）

徽章原样显示：26px 高、无底板、不灰度、不降透明、无悬停效果（只保留键盘焦点描边）。皮肤不改徽章本身——**换图与排序都由 `$wgFooterIcons` 决定**（核心按键序渲染分组），皮肤只负责把白描版素材放进 `resources/badge/`。

视觉稿的排法是：站点自己的徽章 → Powered by MediaWiki → Semantic MediaWiki → 许可；通用的三枚用白描版（由官方矢量重着色，文案与许可不变）——MW 自带的 `poweredby_mediawiki.svg` 与 SMW 的 `logo_footer.svg` 都是透明底黑字，在黑页脚上看不见。整份写下来就是：

```php
$badge = "$wgScriptPath/skins/Arknights/resources/badge";
$wgFooterIcons = [
  'sponsors' => [
    'mooncellproject' => [ 'src' => '//project.mooncell.wiki/project1.png', 'url' => '//project.mooncell.wiki', 'alt' => 'a Mooncell project' ],
    'horain'          => [ 'src' => '//static.prts.wiki/horain/90x32.min.png', 'url' => '//www.horain.net/', 'alt' => 'horain' ],
  ],
  'poweredby'    => [ 'mediawiki'        => [ 'src' => "$badge/mediawiki.svg", 'url' => 'https://www.mediawiki.org/', 'alt' => 'Powered by MediaWiki' ] ],
  'poweredbysmw' => [ 'semanticmediawiki' => [ 'src' => "$badge/smw.svg", 'url' => 'https://www.semantic-mediawiki.org/wiki/Semantic_MediaWiki', 'alt' => 'Powered by Semantic MediaWiki', 'class' => 'smw-footer' ] ],
  'copyright'    => [ 'copyright'         => [ 'src' => "$badge/cc-by-nc-sa.svg", 'url' => $wgRightsUrl, 'alt' => $wgRightsText ] ],
];
```

三点要注意：

- **必须整份赋值**，不能只 `$wgFooterIcons['sponsors'] = …` 追加：核心默认的键序是 `copyright` 在最前、`poweredby` 在后，追加只会排到末尾。
- 写了 `poweredbysmw` 就会**抢在 SMW 自己注册之前占位**——它见到该键已存在就不再注册（`SemanticMediaWiki/src/Setup.php`），所以顺序与图都归你管。
- `copyright` 显式写了 `src` 后，核心不再用 `$wgRightsIcon` 填充（它只在该项为空数组时才填）；换许可时记得同时换这里的图。

若某枚徽章只有浅底彩色版、在黑页脚上不好看，给 `#footer-icons` 加 `ak-footer__icons--plate` 可以恢复旧的浅色底板。

## 目录结构

```
skin.json                         注册：ValidSkinNames / ResourceModules / skinStyles / config
includes/
  SkinArknights.php               SkinMustache 子类：模板数据、<html> 主题类、watch 星标搬到 views、菜单图标
  Components/*.php                每块 UI 一个组件（Citizen 风格）：MainMenu / MenuSidebar / UserMenu /
                                  PageHeading / PageTools / TableOfContents / PageFooter / Footer / Menu
  Menu/WikitextMenuParser.php     以当前页为上下文解析 MediaWiki 名字空间 wikitext，并把 RL 模块转发给 OutputPage
  Menu/MenuItemDecorator.php      把核心的 icon 键变成 <span class="ak-icon ak-icon--x">
  Menu/SearchShortcutsParser.php  MediaWiki:Arknights-search-shortcuts → 搜索面板空态的快捷入口
  Hooks/SkinHooks.php             BeforePageDisplay（内联主题脚本）/ viewport / 工具箱图标
  Hooks/ResourceLoaderHooks.php   config.json / searchConfig.json
  Api/ApiArknightsSearchIndex.php 搜索面板的本地索引（Cargo → JSON，含服务端拼音）
templates/*.mustache              skin · Header · Header__logo · Search · ThemeToggle · UserMenu · Menu ·
                                  Sidebar · PageHeader · PageTools · Indicators · TableOfContents(+__list/__line) ·
                                  PageFooter · Footer · SectionLinks · Link
resources/
  badge/                          页脚徽章的白描版（MediaWiki / SMW / CC BY-NC-SA，见下文「页脚徽章」）
  design-system/                  ← 从 prts-design/src 原样同步（tokens/base/components/arknights/utilities.css +
                                  sidebar-tree.js + search-palette.js），勿改
  design-system/fonts.css         ← 同上：121 条 @font-face（自托管 web 字体，见下文「字体」）
  design-system/fonts/            ← 同上：woff2 与各族授权全文（Noto Sans SC 101 片 + 5 族，≈5MB）
  mediawiki.less/                 mediawiki.skin.variables.less（Codex 令牌 → --ak-* 桥接）
  skins.arknights.styles/         皮肤骨架 LESS（header / sidebar / menu-sidebar / page-header / page-tools / toc / footer / responsive / print …）
  skins.arknights.scripts/        常驻：theme · dropdown · drawer · header · toc · backToTop · interactive ·
                                  sidebarTree · searchLoader(搜索面板的懒加载存根) · search(面板关闭时的回退) · inline(<head>)
                                  懒加载 skins.arknights.search：searchPalette(数据源) · searchIndex(Cargo 索引)
skinStyles/                       核心 / OOUI / jQuery / 扩展 的皮肤覆盖
i18n/                             en · qqq · zh-hans · zh-hant · ja
scripts/sync-design-system.sh     同步设计系统 + 生成 .notheme 令牌重置
```

分层：`fonts.css`（@font-face）→ `tokens.css`（令牌+主题+Codex 桥接）→ `base.css`（wikitext 产物）→ `components.css` / `arknights.css`（组件与方舟装饰）→ `utilities.css` → `skin.less`（皮肤骨架）。前六个文件（连同 `fonts/`）是设计系统的产物，
**只在 prts-design 里改**，然后运行 `scripts/sync-design-system.sh [path/to/prts-design]`。

## 字体：自托管

`skins.arknights.fonts`（`resources/design-system/fonts.css` + `fonts/`）在所有页面加载，是 `styles` 的第一项。设计系统的字体链在 `tokens.css` 的 Typography 段，前两段都自托管，因此访客装没装字体看到的都是同一套：

| 角色 | 字族 | 来源 |
|---|---|---|
| 正文 `--ak-font-body` | Noto Sans SC 100–900 可变 | OFL；沿用 Google 的 101 片 `unicode-range` 切分，一页典型只下 5–15 片 |
| 展示 `--ak-font-display` | Novecento Sans Wide 500–800 → Bender → Oswald | 前两族取自明日方舟官网静态资源（**ASCII 子集**，`·` `»` `—` 等非 ASCII 逐字落到后面的 OFL 字体） |
| HUD 标签 / 数值 `--ak-font-label` | Bender 400/700 → Chakra Petch | 同上；Chakra Petch（OFL）接非 ASCII |
| 压缩 `--ak-font-condensed` / 等宽 `--ak-font-mono` | Oswald / JetBrains Mono | OFL |

- **授权**：Novecento Sans Wide 与 Bender 是商用字，PRTS.wiki 作为明日方舟官方赞助站点按与鹰角同一组织下共用授权使用；各族授权全文与来源说明随字体文件放在 `resources/design-system/fonts/<族>/{LICENSE,NOTICE.md}`。上游 `prts-design/scripts/fetch-fonts.py` 负责抓取与生成，这里只做同步。
- **落盘 ≈5MB，但按需下载**：`font-display: swap` + `unicode-range` 分片，ResourceLoader 只重写 `url()` 不内联。上线后建议确认 CSSMin 没有动 `unicode-range`。
- **要关掉**（用户偏好 / Gadget / 低带宽）：把 `skins.arknights.fonts` 从 `skin.json` 的 `styles` 里去掉即可，字体链会自然退到装机字与系统字，排版不塌。
- **数字**：Bender 只做 HUD 层（徽章、面板数值、大字号）。正文尺寸的连续数字（时间戳、差异行号、分页页数、表格数字列）走正文字体 + `font-variant-numeric: tabular-nums` —— Noto Sans SC 的数字本身等宽，天然对齐，而官网 Bender 子集没有 `tnum`、小字号又偏细。

## 表单控件

Widget / 小工具 / 模板里直接写裸 `<input>` `<select>` `<textarea>` `<button>` 即可，皮肤按设计系统 `docs/01-design-system.md §4` 兜底：36px 定高、正文（`.mw-body-content`，即解析产物）的表格单元格内自动收到 30px 且**文字对齐跟随单元格**（`text-align: center` 的属性计算器里输入框也居中，`td.num` 右对齐的列里输入也右对齐）、主题化的焦点 / 只读 / 禁用 / 校验失败四态、iOS 上 <640px 提到 16px 防聚焦缩放。规则整组包在 `:where()` 里（零特指度），任何带 class 的控件——`.ak-input`、Codex 的 `.cdx-text-input__input`、OOUI 的 `.oo-ui-inputWidget-input`、模板自己的 class——都稳稳压在它上面。

因此 Widget 里针对旧皮肤的补丁（`.skin-minerva #calc input { border… }`、`width: calc(100% - .8em)` 之类）可以删掉，只保留 `width: 100%` 这类布局意图（控件已是 `border-box`）。要标签 / 帮助 / 错误文案、前后缀拼接、常显 − / + 步进、方舟风勾选开关，再用 `.ak-field` / `.ak-input-group` / `.ak-number` / `.ak-check` / `.ak-switch`。

## 搜索：悬浮命令面板

`$wgArknightsSearchPalette`（默认开）把页眉搜索框换成一块居中悬浮的面板，参考 Citizen 的 Command Palette，
但不引 Vue/Codex —— 核心是设计系统脚本 `resources/design-system/search-palette.js`（与 prts-design 预览共用），
皮肤侧只提供数据源。

- **渐进增强**：`templates/Search.mustache` 渲染的仍是真表单。面板挂载后表单被换成 `button.ak-search-trigger`，
  **表单本身连同 `#searchform` / `#searchInput` / `action` 一起搬进面板顶部** —— 依赖这些 id 的小工具照常工作，
  没有高亮项时回车仍是原生提交（= MediaWiki 的 Go）。无 JS 时表单直接提交到 `Special:Search`。
- **懒加载**：面板整包（设计系统核心 + 数据源 + 索引）54 KB 未压缩，拆成 `skins.arknights.search` 不进常驻 bundle。
  常驻的只剩 `searchLoader.js`（去掉注释约 3 KB）：悬停/触摸时 `mw.loader.using('skins.arknights.search')` 预取并在 `requestIdleCallback` 时静默挂载，
  聚焦/点击/按键则直接加载并打开（已经输入的字会带进面板）。
  这套之所以便宜，是因为**页眉那个真表单本身就是加载前的兜底** —— 模块没到之前它照样提交到 `Special:Search`，
  所以预取失败可以完全静默，只有用户主动点了才需要提示（`arknights-search-load-error`）。
  唯一的约束：挂载会把输入框搬走，所以光标在框里或框里有字时不做静默挂载，留给下一次主动打开一起做。
- 打开：点触发器 / 手机上的搜索图标 / 按 `/`、`Ctrl(⌘)K`、accesskey F。关闭：Esc（有字先清空，模式中先退出）、点遮罩、选中结果。
- 空态显示最近访问（`localStorage['arknights-search-recent']`）与**站内可编辑的快捷入口**
  `MediaWiki:Arknights-search-shortcuts`（见下）；`/` 列出命令，`>` 动作 · `#` 分类 · `@` 用户 · `~` 文件。
- 面板开启时 `SkinHooks::onSkinPageReadyConfig()` 会把 `mediawiki.page.ready` 的 `search` 开关置 false
  （与 Vector 2022 同一做法）。核心是在搜索框**聚焦时**才懒加载 `mediawiki.searchSuggest` 的，不关掉的话
  它会挂到被搬进面板的那个 `#searchInput` 上、在面板里再画一份列表。
  注意不是 `Skin::getDefaultModules()` —— 1.43 里那里的 `'search'` 组本来就是空的。

数据源分三层，`search-providers` 逻辑在 `resources/skins.arknights.scripts/searchPalette.js`：

| 层 | 来源 | 说明 |
|---|---|---|
| 标题搜索 | `GET /rest.php/v1/search/title` | 与 Vector 2022 / Citizen 相同。`thumbnail` 需要 PageImages，`description` 需要短描述扩展；两者缺失时静默降级 |
| 本地即时索引 | `mw.hook( 'skin.arknights.search' )` | 见下节。给出中缀匹配、别名与拼音首字母 —— 核心标题搜索只能前缀匹配 |
| 模式 | Action API | `#` 分类（空查询＝本页所属）· `@` 用户 · `~` 文件；`>` 动作直接扫本页的 `#p-views #p-cactions #p-tb #p-personal` 与页面标签 |

### 快捷入口（`MediaWiki:Arknights-search-shortcuts`）

空态那排方块由这条消息决定，语法就是 `MediaWiki:Sidebar` 的条目语法去掉分组标题——一行一个 `* 目标|标签`，
最多取 8 条：

```wikitext
* mainpage|mainpage-description
* 干员一览|干员
* Special:RecentChanges|recentchanges
* https://www.mooncell.wiki|Mooncell主站
```

两半都是「存在同名消息就当消息键、否则按字面」：目标按内容语言解析（页面名或 URL），标签按界面语言。
目标或标签解析成 `-` 的那一行跳过，整条消息写 `-` 就完全不显示快捷入口。不填时用 i18n 默认值
（首页 / 最近更改 / 随机页面 / 帮助，与 MediaWiki 默认侧栏导航同一组链接）。

这里**不是 wikitext**：没有模板、解析器函数与魔术字。列表在服务端解析进 `skins.arknights.search` 的
`searchConfig.json`（`Menu/SearchShortcutsParser.php`），编辑消息即改变该文件内容，而 RL 正是按内容算模块版本，
所以缓存自动跟着走，不需要 `versionCallback`。改完不用清缓存，但客户端拿到新版本号要等 startup 模块的
HTTP 缓存过期（默认 5 分钟），自己测的时候按 Shift 刷新即可。

### 本地索引（Cargo）

没有 CirrusSearch 的中文 wiki 上，核心标题搜索只匹配标题**前缀**：搜「灰」出不来「银灰」，搜「yh」什么都没有。
`$wgArknightsSearchIndex` 把若干 Cargo 表拍平成一小段 JSON（`action=arknightssearchindex`），
客户端首次打开面板时取一次并存进 `localStorage`，之后每次击键都在内存里匹配，无网络往返。
条目里只有标题、别名、拼音与少量元数据，URL 由客户端 `mw.util.getUrl()` 现算 —— 预存 URL 会占掉三分之一
的体积，而真正上屏的只有十几行。

拼音由服务端用 PHP intl 的 `Transliterator`（`Han-Latin; Latin-ASCII`）算好：银灰 → `yh` / `yinhui`，
能天使 → `nts`，德克萨斯 → `dkss`。没装 intl 时索引照常可用，只是少了拼音这一路。

PRTS.wiki 的配置（表结构：`chara` 456 行、`item` 1369 行）：

```php
$wgArknightsSearchIndex = [
	[
		'id' => 'operator',
		'type' => 'operator',
		'labelMsg' => 'arknights-search-group-operator',
		'en' => 'Operators',
		'tables' => 'chara',
		'orderBy' => 'charId',
		'fields' => [
			'title' => '_pageName',
			'aliases' => [ 'en', 'jp' ],   // SilverAsh / シルバーアッシュ
			'class' => 'profession',
			'desc' => 'subProfession',
			'rarity' => 'rarity',
		],
		// chara.rarity 是 0-5，面板要 1-6 星（Cargo 不允许字段里写 rarity+1）
		'rarityOffset' => 1,
	],
	[
		'id' => 'item',
		'type' => 'item',
		'labelMsg' => 'arknights-search-group-item',
		'en' => 'Items',
		'tables' => 'item',
		'orderBy' => 'sortId',
		'fields' => [ 'title' => '_pageName', 'rarity' => 'rarity' ],
	],
];
```

每个分组接受 `tables` `fields` `where` `joinOn` `groupBy` `having` `orderBy` `limit` `rarityOffset`，
`fields.title` 必填。查询失败、Cargo 没装、表被改名 —— 任一情况都只是「没有本地索引」，不会影响面板本身。

小工具也可以自己接管这一层：`mw.hook( 'skin.arknights.search' ).fire( ( query ) => Group[] )`，
返回的结构与面板的 `providers.search()` 一致（`{ id, label, en, items: [ { label, url, desc, meta, … } ] }`）。

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

- 页眉 `.ak-header`、侧栏 `.ak-sidebar`、页面头 `.ak-page-header`、目录 `.ak-toc`、页脚 `.ak-footer` 等类名与 prts-design 的 `src/skin.css` 一致，但骨架样式由本皮肤的 LESS 维护（DOM 由模板定义）。
- **页眉主行（≥1120）**是 `var(--ak-sidebar-w) minmax(0,1fr) auto` 三列网格，`gap` 与 `.ak-layout` 同为 `--ak-gutter`：品牌盖着侧栏列，搜索从正文列左缘起（≤560px，与面包屑/标题同线），工具靠右。因此 ≥1680 的 `--ak-sidebar-w / --ak-toc-w: 268px` 覆盖写在 `:root` 而不是 `.ak-layout` 上，页眉与布局共用。页眉不放站点级主导航——它需要正文列，而侧栏在任何宽度下都已经渲染了一份。
- **页眉 / 页脚是黑色的「框」**，不随明暗主题变：`header.less` 在 `.ak-header` 内把语义令牌重映射到 `--ak-chrome-*`（`--ak-fg` → `--ak-chrome-fg`、`--ak-accent` → `--ak-theme-accent` …），页眉里的按钮、搜索触发器、Echo 徽标、用户菜单、窄屏工具卡片因此自动是页眉配色，不必逐个写；页脚直接读 `--ak-chrome-bg-solid / -fg`。活动主题的接口见上文「活动主题」。
- **<1120 页眉**回到 flex，只留 品牌 / 搜索（<640 收成图标）/ ≡。外观切换、Echo 徽标、用户菜单包在 `.ak-header__screen` 里：桌面 `display:contents`（子项直接进主行网格），窄屏变成 ≡ 拉下、贴主行右下沿的 320px 卡片。开合是纯 CSS 的 `input.ak-nav-cb` + `label.ak-header__burger`（同目录浮层的 `.ak-toc-cb` 做法），所以无 JS 也能用；`header.js` 只补 Esc / 点卡片外 / 回到 ≥1120 时收起，以及卡片开着时不收页眉。DOM 只有一份，`#p-personal` 与 `#pt-notifications-*` 不会重复。
- 图标：`skins.arknights.icons`（OOUI WikimediaUI 图标，`mask-image` + `currentColor`），类名 `.ak-icon.ak-icon--{name}`；可用名称见 `includes/Menu/MenuItemDecorator.php::ICONS`（与 skin.json 保持同步）。
- 模板/TemplateStyles 中直接使用 `.ak-*` 组件与 `var(--ak-*)` 令牌，与预览页一致；`data-bind`/`.ak-tabs`/`.ak-phase-tabs` 等交互约定由 `interactive.js` 提供。
- 小工具可用的钩子：`mw.hook('skin.arknights.clientPrefs')`（主题变化）、`mw.hook('skin.arknights.toast').fire(msg, type, title)`、`mw.hook('skin.arknights.sidebar').fire()`（侧栏内容变化后重新增强树）、`mw.hook('skin.arknights.search').fire(fn)`（注入搜索面板的本地即时索引）。

## 开发

```bash
scripts/sync-design-system.sh [path/to/prts-design]   # 同步设计系统；不给路径时在皮肤/MediaWiki 的相邻目录里找 prts-design
```

本地验证：把仓库放到 MediaWiki 的 `skins/Arknights`，`wfLoadSkin( 'Arknights' )`，打开 `?debug=2` 查看未压缩的 LESS 输出。
LESS 注意：less.php 会尝试求值 CSS 的 `min()/max()`，需要写成 `~"min( 92vw, 360px )"`。
Mustache 注意：MediaWiki 的 LightnCandy 只把 `null` / `false` / 空数组当假值，`''` 在 `{{#x}}` 里为真 —— PHP 侧可选字符串请返回 `null`。

## 许可

GPL-3.0-or-later。游戏素材版权归鹰角网络所有。
