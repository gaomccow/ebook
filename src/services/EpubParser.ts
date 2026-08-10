import JSZip from 'jszip';

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export interface EpubChapter {
  id: string;
  title: string;
  wordCount: number;
  content: string;
}

export interface EpubBook {
  title: string;
  author: string;
  chapters: EpubChapter[];
  images?: Record<string, string>;
  toc?: TocItem[];
}

export class EpubParser {
  /**
   * Parses an EPUB File client-side.
   */
  public static async parse(file: File): Promise<EpubBook> {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Parse container.xml to locate the OPF file
    const containerXmlText = await this.getFileText(zip, 'META-INF/container.xml');
    const opfPath = this.parseContainer(containerXmlText);
    
    // Determine the base folder path of the OPF file (for resolving relative assets)
    const opfBaseDir = opfPath.includes('/') 
      ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
      : '';

    // 2. Parse the OPF file (manifest, metadata, spine)
    const opfText = await this.getFileText(zip, opfPath);
    const { title, author, manifest, spine, tocId } = this.parseOpf(opfText);

    // Extract TOC if available (EPUB 2 NCX)
    let toc: TocItem[] | undefined;
    if (tocId && manifest[tocId]) {
      const ncxPath = this.resolveRelativePath(opfBaseDir, manifest[tocId].href);
      try {
        const ncxText = await this.getFileText(zip, ncxPath);
        toc = EpubParser.parseNcx(ncxText);
      } catch (e) {
        console.warn("Failed to parse NCX TOC", e);
      }
    }

    // Extract images as base64 URLs
    const images: Record<string, string> = Object.create(null);
    const imageKeys = Object.keys(manifest).filter(key => {
      const type = manifest[key].mediaType || '';
      return type.startsWith('image/');
    });

    for (const key of imageKeys) {
      const item = manifest[key];
      const filePath = this.resolveRelativePath(opfBaseDir, item.href);
      try {
        const imageFile = zip.file(filePath);
        if (imageFile) {
          const blob = await imageFile.async('blob');
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const filename = item.href.split('/').pop() || item.href;
          images[filename] = base64Data;
        }
      } catch (err) {
        console.warn(`Failed to extract image file: ${filePath}`, err);
      }
    }

    // 3. Read content files in spine order
    const chapters: EpubChapter[] = [];
    const parser = new DOMParser();

    for (let i = 0; i < spine.length; i++) {
      const idref = spine[i];
      const manifestItem = manifest[idref];
      
      if (!manifestItem) continue;

      // Resolve the actual file path inside the ZIP
      const filePath = this.resolveRelativePath(opfBaseDir, manifestItem.href);
      
      try {
        const fileContentText = await this.getFileText(zip, filePath);
        let doc = parser.parseFromString(fileContentText, 'application/xhtml+xml');
        
        // Fallback: If xml parsing failed or had a parsererror (e.g. malformed entities), parse as text/html
        if (doc.querySelector('parsererror') || !doc.body) {
          doc = parser.parseFromString(fileContentText, 'text/html');
        }
        
        // Extract Title: Look in <h1>, <h2>, or the <title> tag
        let chapterTitle = `Chapter ${i + 1}`;
        const header = doc.querySelector('h1, h2, h3');
        if (header && header.textContent?.trim()) {
          chapterTitle = header.textContent.trim();
        } else {
          const docTitle = doc.querySelector('title');
          if (docTitle && docTitle.textContent?.trim()) {
            chapterTitle = docTitle.textContent.trim();
          }
        }

        // Clean title if it contains noise
        if (chapterTitle.length > 60) {
          chapterTitle = chapterTitle.substring(0, 57) + '...';
        }

        // Extract and clean content text
        const contentText = this.cleanHtmlContent(doc);
        const wordCount = this.calculateWordCount(contentText);
        const hasImages = contentText.includes('[IMG:');

        // Skip sections that have almost no readable text AND no images (like pure title pages or empty covers)
        if (wordCount > 30 || hasImages) {
          chapters.push({
            id: `ch_${i}_${idref}`,
            title: chapterTitle,
            wordCount,
            content: contentText
          });
        }
      } catch (err) {
        console.warn(`Failed to parse chapter content for item: ${idref} at ${filePath}`, err);
      }
    }

    if (chapters.length === 0) {
      throw new Error("No readable chapter content could be extracted from this EPUB.");
    }

    return {
      title: title || file.name.replace(/\.epub$/i, ''),
      author: author || 'Unknown Author',
      chapters,
      images,
      toc
    };
  }

  // --- XML Parsing Helpers ---

  private static async getFileText(zip: JSZip, path: string): Promise<string> {
    // Find the file ignoring case or slight folder differences (some epubs have loose folders)
    let file = zip.file(path);
    if (!file) {
      // Fallback: search for case-insensitive match
      const lowerPath = path.toLowerCase();
      const matchedKey = Object.keys(zip.files).find(key => key.toLowerCase() === lowerPath);
      if (matchedKey) {
        file = zip.file(matchedKey);
      }
    }

    if (!file) {
      throw new Error(`File not found in EPUB ZIP archive: ${path}`);
    }

    return await file.async('text');
  }

  private static parseContainer(xmlText: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const rootfile = doc.querySelector('rootfile');
    
    if (!rootfile) {
      throw new Error('Invalid container.xml structure in EPUB: missing rootfile tag.');
    }

    const fullPath = rootfile.getAttribute('full-path');
    if (!fullPath) {
      throw new Error('Invalid container.xml structure in EPUB: missing full-path attribute.');
    }

    return fullPath;
  }

  private static parseOpf(opfText: string): {
    tocId?: string;
    title: string;
    author: string;
    manifest: Record<string, { href: string; mediaType: string }>;
    spine: string[];
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfText, 'text/xml');

    // Get Metadata
    let title = '';
    let author = '';
    const titleNode = doc.querySelector('title, dc\\:title');
    if (titleNode) title = titleNode.textContent || '';

    const creatorNode = doc.querySelector('creator, dc\\:creator');
    if (creatorNode) author = creatorNode.textContent || '';

    // Get Manifest Items
    const manifest: Record<string, { href: string; mediaType: string }> = Object.create(null);
    const itemNodes = doc.querySelectorAll('manifest > item');
    itemNodes.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');
      if (id && href) {
        manifest[id] = {
          href,
          mediaType: mediaType || ''
        };
      }
    });

    const tocId = doc.querySelector('spine')?.getAttribute('toc') || undefined;
    
    // Get Spine Items (defines sequence)
    const spine: string[] = [];
    const itemrefNodes = doc.querySelectorAll('spine > itemref');
    itemrefNodes.forEach(itemref => {
      const idref = itemref.getAttribute('idref');
      // Ignore linear="no" auxiliary items (like covers or indexes) for the main reading path
      const linear = itemref.getAttribute('linear');
      if (idref && linear !== 'no') {
        spine.push(idref);
      }
    });

    return {
      title,
      author,
      manifest,
      spine,
      tocId
    };
  }

  // --- Content Cleaning Helpers ---

  private static cleanHtmlContent(doc: Document): string {
    // Clone the body to avoid destructive updates to the doc if cached
    const body = doc.body ? doc.body.cloneNode(true) as HTMLElement : doc.documentElement.cloneNode(true) as HTMLElement;
    
    // Remove scripts, styles, and iframe elements (but keep images!)
    const elementsToRemove = body.querySelectorAll('script, style, nav, iframe, link');
    elementsToRemove.forEach(el => el.remove());

    const paragraphs: string[] = [];
    
    // Process block-level tags, paragraphs, and images (supporting h1-h6 and div)
    const textBlocks = body.querySelectorAll('p, blockquote, li, h1, h2, h3, h4, h5, h6, img, image, div');
    
    if (textBlocks.length > 0) {
      textBlocks.forEach(block => {
        const tagName = block.tagName.toLowerCase();
        if (tagName === 'img' || tagName === 'image') {
          const src = block.getAttribute('src') || block.getAttribute('xlink:href') || block.getAttribute('href') || '';
          if (src) {
            const filename = src.split('/').pop() || src;
            paragraphs.push(`[IMG:${filename}]`);
          }
        } else if (
          tagName === 'p' || tagName === 'blockquote' || tagName === 'li' || 
          tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6' ||
          tagName === 'div'
        ) {
          // If it is a div, only process it if it does not contain other block tags to avoid duplicate text extraction
          if (tagName === 'div' && block.querySelector('p, div, blockquote, li, h1, h2, h3, h4, h5, h6, img, image')) {
            return;
          }
          const text = block.textContent?.trim();
          if (text && text.length > 0) {
            const normalized = text
              .replace(/\s+/g, ' ')
              .replace(/\n+/g, ' ')
              .trim();
            paragraphs.push(normalized);
            
            // Also check for nested images
            const nestedImgs = block.querySelectorAll('img, image');
            nestedImgs.forEach(img => {
              const src = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href') || '';
              if (src) {
                const filename = src.split('/').pop() || src;
                paragraphs.push(`[IMG:${filename}]`);
              }
            });
          }
        }
      });
    } else {
      // Fallback
      const rawText = body.textContent || '';
      return rawText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n');
    }

    return paragraphs.join('\n\n');
  }

  private static calculateWordCount(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  private static resolveRelativePath(baseDir: string, relativePath: string): string {
    // If it is absolute, return it
    if (relativePath.startsWith('/') || relativePath.includes('://')) {
      return relativePath;
    }

    const baseParts = baseDir.split('/').filter(p => p.length > 0);
    const relParts = relativePath.split('/');

    for (const part of relParts) {
      if (part === '.') {
        continue;
      }
      if (part === '..') {
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }

    return baseParts.join('/');
  }

  /**
   * DETECTION METHOD 1: Keyword-based chapter detection.
   * Recognizes lines starting with "Chapter N", "Ch. N", "Chương N",
   * numbered headings like "1. Title" or "1) Title",
   * or module/section variants.
   */
  private static isKeywordHeading(line: string): boolean {
    return (
      /^(?:chapter|ch\.?|chương|phần|part|bài|mục|section|sec\.?|module|mod\.?)\s+[\dIVXivx]+/i.test(line) ||
      /^\d+[.)\s]\s+\p{L}/u.test(line)
    );
  }

  /**
   * DETECTION METHOD 2: All-caps heading detection.
   * Matches lines that are entirely uppercase (2–80 chars), not pure numbers,
   * and not boilerplate front-matter noise.
   */
  private static isAllCapsHeading(line: string): boolean {
    if (line.length < 3 || line.length > 80) return false;
    if (/^[\d\s]+$/.test(line)) return false; // skip pure numbers
    return line === line.toUpperCase() && /\p{L}/u.test(line);
  }

  /**
   * Front-matter keywords that signal pages to skip (title page, copyright, ToC…).
   */
  private static readonly FRONT_MATTER_SIGNALS = [
    /^copyright/i,
    /^all rights reserved/i,
    /^published by/i,
    /^isbn/i,
    /^\s*\d{3}-\d+/,         // ISBN numbers
    /^table of contents/i,
    /^contents$/i,
    /^dedication/i,
    /^acknowledgements?/i,
    /^preface$/i,
    /^foreword$/i,
    /^about the author/i,
    /^printed in/i,
    /^first (published|edition)/i,
  ];

  private static isFrontMatterLine(line: string): boolean {
    return EpubParser.FRONT_MATTER_SIGNALS.some(re => re.test(line.trim()));
  }

  /**
   * Finds the index (within lines[]) of the first real chapter heading,
   * skipping all front-matter. Returns -1 if none found.
   */
  private static findFirstChapterLine(lines: string[]): number {
    // First pass: look for keyword headings
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.length === 0) continue;
      if (EpubParser.isKeywordHeading(t)) return i;
    }
    // Second pass: look for all-caps headings that are NOT front-matter
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.length === 0) continue;
      if (EpubParser.isAllCapsHeading(t) && !EpubParser.isFrontMatterLine(t)) return i;
    }
    return -1;
  }

  /**
   * Auto-detects chapters in pasted/imported plain text using dual-method detection.
   * Strips leading front matter, then splits on detected headings.
   * Falls back to even word-count chunks when no headings are found.
   */
  public static autoDetectAndSplitText(title: string, rawText: string): EpubBook {
    const lines = rawText.split(/\r?\n/);

    // --- Strip front matter ---
    const firstChapterLine = EpubParser.findFirstChapterLine(lines);
    const contentLines = firstChapterLine > 0 ? lines.slice(firstChapterLine) : lines;

    // --- Split on headings (dual-method) ---
    const chapters: EpubChapter[] = [];
    let currentTitle = 'Part 1';
    let currentLines: string[] = [];
    let partIndex = 1;

    const flushChunk = () => {
      const content = currentLines.join('\n').trim();
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      if (wordCount > 10) {
        chapters.push({
          id: `part_${partIndex}`,
          title: currentTitle,
          wordCount,
          content
        });
        partIndex++;
      }
    };

    for (const line of contentLines) {
      const t = line.trim();
      const isHeading = EpubParser.isKeywordHeading(t) ||
                        (EpubParser.isAllCapsHeading(t) && !EpubParser.isFrontMatterLine(t));

      if (isHeading && t.length > 0) {
        flushChunk();
        currentTitle = t;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    flushChunk();

    // --- Fallback: even word-count chunks (1 000 words each) ---
    if (chapters.length <= 1) {
      const allWords = contentLines.join(' ').trim().split(/\s+/).filter(Boolean);
      if (allWords.length > 0) {
        chapters.length = 0;
        const chunkSize = 1000;
        let idx = 1;
        for (let i = 0; i < allWords.length; i += chunkSize) {
          const chunk = allWords.slice(i, i + chunkSize).join(' ');
          chapters.push({
            id: `part_${idx}`,
            title: `Section ${idx}`,
            wordCount: chunk.split(/\s+/).filter(Boolean).length,
            content: chunk
          });
          idx++;
        }
      }
    }

    return {
      title: title.trim() || 'Imported Book',
      author: 'Self-Imported',
      chapters
    };
  }

  private static parseNcx(ncxText: string): TocItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(ncxText, 'application/xml');
    const navPoints = doc.querySelectorAll('navPoint');
    const toc: TocItem[] = [];
    navPoints.forEach((np) => {
      /* const id = np.getAttribute('id') || ''; */
      const text = np.querySelector('navLabel text')?.textContent || '';
      const src = np.querySelector('content')?.getAttribute('src') || '';
      // Very basic parsing without hierarchy
      toc.push({
        /* id, */
        label: text,
        href: src,
        subitems: []
      });
    });
    return toc;
  }
}
