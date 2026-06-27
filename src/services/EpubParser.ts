import JSZip from 'jszip';

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
    const { title, author, manifest, spine } = this.parseOpf(opfText);

    // Extract images as base64 URLs
    const images: Record<string, string> = {};
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
        const doc = parser.parseFromString(fileContentText, 'application/xhtml+xml');
        
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

        // Skip sections that have almost no readable text (like pure title pages or covers)
        if (wordCount > 30) {
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
      images
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
    const manifest: Record<string, { href: string; mediaType: string }> = {};
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
      spine
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
    
    // Process block-level tags, paragraphs, and images
    const textBlocks = body.querySelectorAll('p, blockquote, li, h1, h2, h3, h4, img, div');
    
    if (textBlocks.length > 0) {
      textBlocks.forEach(block => {
        const tagName = block.tagName.toLowerCase();
        if (tagName === 'img') {
          const src = block.getAttribute('src') || '';
          if (src) {
            const filename = src.split('/').pop() || src;
            paragraphs.push(`[IMG:${filename}]`);
          }
        } else if (tagName === 'p' || tagName === 'blockquote' || tagName === 'li' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
          const text = block.textContent?.trim();
          if (text && text.length > 5) {
            const normalized = text
              .replace(/\s+/g, ' ')
              .replace(/\n+/g, ' ')
              .trim();
            paragraphs.push(normalized);
            
            // Also check for nested images
            const nestedImgs = block.querySelectorAll('img');
            nestedImgs.forEach(img => {
              const src = img.getAttribute('src') || '';
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
   * Auto-detects structure (chapters/modules) in pasted text and splits it.
   * Prefers modules/sections (smaller) if both chapters and modules exist.
   * Supports Vietnamese headings natively (Chương, Phần, Bài, Mục).
   */
  public static autoDetectAndSplitText(title: string, rawText: string): EpubBook {
    // Regex pattern definitions
    const chapterRegex = /^(?:chapter|ch\.|ch|chương|phần)\s+\d+/i;
    const moduleRegex = /^(?:module|mod\.|mod|section|sec\.|sec|bài|mục)\s+\d+/i;

    const lines = rawText.split(/\r?\n/);
    
    let chapterCount = 0;
    let moduleCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (chapterRegex.test(trimmed)) chapterCount++;
      if (moduleRegex.test(trimmed)) moduleCount++;
    });

    // Determine the division level: prefer modules if available
    let splitRegex = chapterRegex;
    let preferredType = 'Chapter';
    
    if (moduleCount > 0) {
      splitRegex = moduleRegex;
      preferredType = 'Module';
    } else if (chapterCount === 0) {
      // Fallback structural regex: matches general numbered headers or general headers
      splitRegex = /^(?:(?:chapter|ch\.|ch|module|mod\.|mod|section|sec\.|sec|chương|phần|bài|mục|đoạn)\s+\d+)/i;
    }

    const chapters: EpubChapter[] = [];
    let currentTitle = `${preferredType} 1`;
    let currentLines: string[] = [];
    let partIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.length > 0 && splitRegex.test(trimmed)) {
        if (currentLines.length > 0) {
          const content = currentLines.join('\n');
          const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount > 10) {
            chapters.push({
              id: `part_${partIndex}`,
              title: currentTitle,
              wordCount,
              content
            });
            partIndex++;
          }
        }
        currentTitle = trimmed;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // Add final chunk
    if (currentLines.length > 0) {
      const content = currentLines.join('\n');
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 5) {
        chapters.push({
          id: `part_${partIndex}`,
          title: currentTitle,
          wordCount,
          content
        });
      }
    }

    // Fallback: If no structured headings were detected, segment text into 1,000-word bite-sized chunks
    if (chapters.length <= 1) {
      const allWords = rawText.trim().split(/\s+/).filter(Boolean);
      const totalWords = allWords.length;
      
      if (totalWords > 0) {
        chapters.length = 0; // reset
        const chunkSize = 1000;
        let chunkIdx = 1;
        
        for (let i = 0; i < totalWords; i += chunkSize) {
          const chunk = allWords.slice(i, i + chunkSize).join(' ');
          chapters.push({
            id: `part_${chunkIdx}`,
            title: `Module ${chunkIdx}`,
            wordCount: chunk.split(/\s+/).filter(Boolean).length,
            content: chunk
          });
          chunkIdx++;
        }
      }
    }

    return {
      title: title.trim() || 'Custom Textbook',
      author: 'Self-Imported',
      chapters
    };
  }

  /**
   * Cleans space fragmentation around diacritical characters typical of client-side PDF extraction.
   * e.g., "Ph ầ n" -> "Phần", "l ự c" -> "lực", "c ơ" -> "cơ", "đ ạ t" -> "đạt"
   */
  public static cleanVietnamesePdfText(text: string): string {
    let cleaned = text;
    let prev = '';
    while (cleaned !== prev) {
      prev = cleaned;
      // Merge character with following diacritic marker
      cleaned = cleaned.replace(/([a-zA-ZđĐ])\s+([àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ])/g, '$1$2');
      // Merge diacritic marker with following character
      cleaned = cleaned.replace(/([àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ])\s+([a-zA-ZđĐ])/g, '$1$2');
      // Merge isolated letters
      cleaned = cleaned.replace(/(\b[a-zA-ZđĐ])\s+([a-zA-ZđĐ]\b)/g, '$1$2');
    }
    return cleaned;
  }

  /**
   * Parses a PDF File client-side via PDF.js CDN library.
   * Auto-detects modules and splits accordingly.
   */
  public static async parsePdf(file: File): Promise<EpubBook> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
      throw new Error('PDF.js library is not loaded. Ensure you are online to fetch it from CDN.');
    }
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += `Chương ${i}\n${pageText}\n\n`;
    }
    
    const cleanedText = this.cleanVietnamesePdfText(fullText);
    
    return this.autoDetectAndSplitText(file.name.replace(/\.pdf$/i, ''), cleanedText);
  }
}
