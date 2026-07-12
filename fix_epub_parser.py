import re

with open('src/services/EpubParser.ts', 'r') as f:
    content = f.read()

# Fix 1: destructure tocId
target1 = "const { title, author, manifest, spine } = this.parseOpf(opfText);"
replace1 = "const { title, author, manifest, spine, tocId } = this.parseOpf(opfText);"
content = content.replace(target1, replace1)

# Fix 2: parseNcx missing
target2 = "toc = this.parseNcx(ncxText);"
replace2 = "toc = EpubParser.parseNcx(ncxText);"
content = content.replace(target2, replace2)

if "private static parseNcx" not in content:
    ncx_def = """
  private static parseNcx(ncxText: string): TocItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(ncxText, 'application/xml');
    const navPoints = doc.querySelectorAll('navPoint');
    const toc: TocItem[] = [];
    navPoints.forEach((np) => {
      const id = np.getAttribute('id') || '';
      const text = np.querySelector('navLabel text')?.textContent || '';
      const src = np.querySelector('content')?.getAttribute('src') || '';
      // Very basic parsing without hierarchy
      toc.push({
        id,
        label: text,
        href: src,
        subitems: []
      });
    });
    return toc;
  }
"""
    # Insert before the last closing brace
    last_brace_idx = content.rfind('}')
    content = content[:last_brace_idx] + ncx_def + content[last_brace_idx:]

with open('src/services/EpubParser.ts', 'w') as f:
    f.write(content)

print("EpubParser fixed")
