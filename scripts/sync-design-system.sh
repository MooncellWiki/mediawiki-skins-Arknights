#!/usr/bin/env bash
# Sync the AKDS design system from prts-design into this skin.
#
#   scripts/sync-design-system.sh [path/to/prts-design]
#   AKDS_SRC=/path/to/prts-design scripts/sync-design-system.sh
#
# What it does:
#   1. Copies packages/css/src/ (tokens, Codex bridge, scope, base/, components/, decor/,
#      arknights/, utilities, forced-colors, fonts, img/, chrome/, shared JS) into
#      resources/design-system/ VERBATIM. chrome/ (the L2 skin shell) is loaded block by block:
#      the ADOPTED_CHROME list in the Python part below says which of its files go into
#      skins.arknights.shell; the rest of the shell is still this skin's LESS
#      (resources/skins.arknights.styles/), which loads after it.
#   2. Expands packages/css/src/index.css (the single source of load order) into the per-file
#      style lists of skins.arknights.base / .components / .fonts / .tokens in skin.json.
#      ResourceLoader does not follow @import, so the files have to be listed one by one.
#   3. Extracts the SVG icon sprite from skin/templates/skin.mustache into
#      templates/IconSprite.mustache so templates can use <svg class="ak-icon"><use href="#i-…">.
#   4. Regenerates common/notheme.generated.less (the archive/light token reset) from
#      tokens.css §2b + bridge-codex.css.
#
# Files under resources/design-system/ must not be edited here — change them upstream
# (prts-design/packages/css/src) and re-run this script.
set -euo pipefail

SKIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$SKIN_DIR/resources/design-system"

# Without an explicit path: look for a prts-design checkout next to the skin (dev layout),
# then next to MediaWiki (skin installed as skins/Arknights).
SRC="${1:-${AKDS_SRC:-}}"
if [ -z "$SRC" ]; then
	for candidate in "$SKIN_DIR/.." "$SKIN_DIR/../.." "$SKIN_DIR/../../.."; do
		if [ -f "$candidate/prts-design/packages/css/src/index.css" ]; then
			SRC="$candidate/prts-design"
			break
		fi
	done
	SRC="${SRC:-$SKIN_DIR/../prts-design}"
fi
CSS="$SRC/packages/css/src"
if [ ! -f "$CSS/index.css" ]; then
	echo "prts-design not found at: $SRC (expected packages/css/src/index.css; set AKDS_SRC or pass the path)" >&2
	exit 1
fi

# ── 1. Copy the design system ────────────────────────────────────────────────────────────
# Replaced wholesale so files dropped upstream do not linger here. ResourceLoader rewrites the
# relative url()s (fonts, img/) against each file's own directory, so the tree keeps its shape.
rm -rf "$DEST"
mkdir -p "$DEST"
FILES=(fonts.css tokens.css bridge-codex.css scope.css utilities.css forced-colors.css sidebar-tree.js search-palette.js)
for f in "${FILES[@]}"; do
	cp "$CSS/$f" "$DEST/$f"
	echo "synced $f"
done
DIRS=(base components decor arknights chrome img fonts)
for d in "${DIRS[@]}"; do
	cp -R "$CSS/$d" "$DEST/$d"
	echo "synced $d/ ($(find "$DEST/$d" -type f | wc -l | tr -d ' ') files)"
done
# The per-layer index.css files only carry @import order; skin.json is the record of that here.
# demo-theme.css is the sample event gadget — not part of the shell (not in index.css upstream either).
find "$DEST" -name index.css -delete
rm -f "$DEST/chrome/demo-theme.css"

REV="unknown"
if git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
	REV="$(git -C "$SRC" rev-parse --short HEAD)"
	if [ -n "$(git -C "$SRC" status --porcelain -- packages/css/src skin/templates 2>/dev/null)" ]; then
		REV="$REV (dirty)"
	fi
fi
{
	echo "# AKDS design system — synced copy"
	echo ""
	echo "Source: prts-design/packages/css/src @ $REV"
	echo "Synced: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo ""
	echo "Do not edit files in this directory. Edit them in prts-design/packages/css/src and run"
	echo "\`scripts/sync-design-system.sh\`. chrome/ (the skin shell) is adopted file by file — see"
	echo "ADOPTED_CHROME in the sync script; what is not adopted yet is styled by this skin's LESS."
} > "$DEST/README.md"
echo "recorded upstream revision: $REV"

# ── 2. skin.json file lists · 3. icon sprite · 4. .notheme token reset ───────────────────
python3 - "$CSS" "$SRC/skin/templates/skin.mustache" "$SKIN_DIR" <<'PY'
import collections, json, os, re, sys

css_root, upstream_mustache, skin_dir = sys.argv[1], sys.argv[2], sys.argv[3]
dest = os.path.join(skin_dir, 'resources', 'design-system')

# ── Expand index.css (recursively following @import) into leaf files relative to src/ ──
def expand(path):
    css = re.sub(r'/\*.*?\*/', '', open(path, encoding='utf-8').read(), flags=re.S)
    imports = re.findall(r'@import\s+url\("([^"]+)"\)', css)
    if not imports:
        return [os.path.relpath(path, css_root)]
    out = []
    for imp in imports:
        out += expand(os.path.normpath(os.path.join(os.path.dirname(path), imp)))
    return out

files = expand(os.path.join(css_root, 'index.css'))

# chrome/ files adopted from upstream (skins.arknights.shell), in index.css order. Whatever is not
# listed here is still styled by this skin's LESS (skins.arknights.styles, which loads after shell).
ADOPTED_CHROME = [
    'chrome/shell.css', 'chrome/header.css', 'chrome/local-nav.css', 'chrome/keyart.css', 'chrome/layout.css',
    'chrome/sidebar.css', 'chrome/sidebar-tree.css', 'chrome/page-header.css', 'chrome/body.css', 'chrome/toc.css',
    'chrome/footer.css', 'chrome/theme-toggle.css', 'chrome/search-palette.css', 'chrome/special-pages.css',
    'chrome/responsive.css',
]

# Same partition as upstream scripts/css-order.ts; the shell module only takes the adopted files.
# Module names sort base < components < fonts < icons < shell < styles — MediaWiki outputs a skin's
# style modules in alphabetical order, so that IS the cascade (base, components, upstream shell,
# then this skin's LESS on top).
def module_of(f):
    if f == 'fonts.css':
        return 'skins.arknights.fonts'
    if f == 'bridge-codex.css' or f.startswith('base/'):
        return 'skins.arknights.base'
    if f.startswith('chrome/'):
        return 'skins.arknights.shell' if f in ADOPTED_CHROME else None
    return 'skins.arknights.components'

groups = collections.OrderedDict((m, []) for m in ('skins.arknights.base', 'skins.arknights.components', 'skins.arknights.fonts', 'skins.arknights.shell'))
for f in files:
    m = module_of(f)
    if m:
        groups[m].append(f)
tokens = ['tokens.css', 'scope.css']
comps = groups['skins.arknights.components']
groups['skins.arknights.components'] = tokens + [f for f in comps if f not in tokens]
groups['skins.arknights.tokens'] = list(tokens)

for m, lst in groups.items():
    for f in lst:
        if not os.path.isfile(os.path.join(dest, f)):
            sys.exit(f'{m}: {f} is listed in index.css but was not copied — add it to the sync script')

skin_json = os.path.join(skin_dir, 'skin.json')
raw = open(skin_json, encoding='utf-8').read()
data = json.loads(raw, object_pairs_hook=collections.OrderedDict)
modules = data['ResourceModules']
for m, lst in groups.items():
    if m not in modules:
        sys.exit(f'skin.json has no module {m} — add its definition first (features / class stay hand-written)')
    modules[m]['styles'] = ['resources/design-system/' + f for f in lst]
    print(f'{m}: {len(lst)} files')
skin_styles = data['ValidSkinNames']['arknights']['args'][0]['styles']
for m in ('skins.arknights.base', 'skins.arknights.components', 'skins.arknights.fonts', 'skins.arknights.shell'):
    if m not in skin_styles:
        sys.exit(f'{m} is missing from the skin\'s "styles" list in skin.json')
if 'skins.arknights.tokens' in skin_styles:
    sys.exit('skins.arknights.tokens must not be in the skin\'s "styles" (it duplicates components)')
with open(skin_json, 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, indent='\t', ensure_ascii=False) + '\n')

# ── Icon sprite: <svg><symbol id="i-…"> from the upstream skin.mustache ──
src = open(upstream_mustache, encoding='utf-8').read()
m = re.search(r'<svg [^>]*>\s*(?:<symbol id="i-[\s\S]*?)</svg>', src)
if not m:
    sys.exit('could not find the SVG sprite in ' + upstream_mustache)
sprite = m.group(0)
symbols = re.findall(r'<symbol id="i-([\w-]+)"', sprite)
out = os.path.join(skin_dir, 'templates', 'IconSprite.mustache')
with open(out, 'w', encoding='utf-8') as f:
    f.write('{{!\n\tGENERATED by scripts/sync-design-system.sh from prts-design skin/templates/skin.mustache — do not edit.\n')
    f.write('\tInline SVG sprite of the design-system line icons: templates and widgets reference them as\n')
    f.write('\t<svg class="ak-icon"><use href="#i-name"/></svg> (see the docs site, /foundations/icons).\n')
    f.write('\tThe skin chrome itself uses the OOUI icon pack (.ak-icon--{name}, skins.arknights.icons).\n}}\n')
    f.write(sprite + '\n')
print(f'generated templates/IconSprite.mustache ({len(symbols)} symbols)')

# ── .notheme / .skin-invert: the archive (light) tokens re-declared on a subtree ──
# (Vector 2022 convention: .notheme keeps the light theme even in dark mode, and .skin-invert
#  needs the same set because the dark theme flips it with a filter — see dark-compat.less.)
tokens_css = open(os.path.join(dest, 'tokens.css'), encoding='utf-8').read()
light = re.search(r'/\* ═══ 2b\..*?\*/\s*:root\s*\{(.*?)\n\}', tokens_css, re.S)
if not light:
    sys.exit('could not find the light token block (2b) in tokens.css')
bridge_css = open(os.path.join(dest, 'bridge-codex.css'), encoding='utf-8').read()
# The Codex/MediaWiki bridge must be re-declared too: custom properties are resolved where they
# are declared, so the inherited bridge values would still be dark.
bridge = re.search(r'/\* ═══ 3\. CODEX.*?\*/\s*[^{]*\{(.*?)\n\}', bridge_css, re.S)
if not bridge:
    sys.exit('could not find the Codex bridge block (3) in bridge-codex.css')
body = light.group(1) + '\n' + bridge.group(1)
# Drop comments first, across the whole block: upstream annotates tokens with /* ... */ that
# spans several lines, and stripping line by line would leak those lines in as declarations.
body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
decls = []
for line in body.splitlines():
    line = line.strip()
    if not line:
        continue
    for part in re.split(r';\s*', line):
        part = part.strip()
        if part:
            decls.append(part + ';')
out = os.path.join(skin_dir, 'resources', 'skins.arknights.styles', 'common', 'notheme.generated.less')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/**\n * GENERATED by scripts/sync-design-system.sh from design-system/tokens.css (§2b) and\n')
    f.write(' * design-system/bridge-codex.css — do not edit.\n')
    f.write(' * .notheme keeps the archive (light) tokens inside a subtree regardless of the page theme,\n')
    f.write(' * matching the Vector 2022 convention used by templates.\n')
    f.write(' *\n')
    f.write(' * .skin-invert gets the same set on purpose: the dark theme renders it by flipping the\n')
    f.write(' * subtree with invert() (dark-compat.less), so the LIGHT palette is what has to go in for\n')
    f.write(' * the flipped result to come out right. Feeding it the dark palette flips twice — that is\n')
    f.write(' * how WikiEditor\'s toolbar tabs (extensions mark them .skin-invert to flip their glyph)\n')
    f.write(' * ended up dark-on-dark. Vector 2022 does the same with .cdx-mode-reset().\n */\n')
    f.write('.notheme,\n.skin-invert {\n')
    for d in decls:
        f.write('\t' + d + '\n')
    f.write('}\n')
print(f'generated notheme.generated.less ({len(decls)} declarations)')
PY
