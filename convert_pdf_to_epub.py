#!/usr/bin/env python3
"""
Converts 'The Way Things Work - Volume Two' PDF into a clean, high-quality EPUB
with well-formatted text and embedded technical schematic illustrations.
"""

import os
import re
import io
import pymupdf
from PIL import Image
import ebooklib
from ebooklib import epub

PDF_FILE = "The way things work; Volume Two an illustrated encyclopedia -- The way things work -- First American edition_, PT, 1971 -- New York, Simon and -- isbn13 9780671210861 -- a15dea9bb55843f5a4a3762d04a007d6 -- Anna’s Archive.pdf"
OUTPUT_EPUB = "The_Way_Things_Work_Volume_Two.epub"

def clean_paragraph_text(raw_text):
    """Clean OCR text, join hyphens, fix paragraph breaks."""
    lines = raw_text.split('\n')
    cleaned_lines = []
    for l in lines:
        l = l.strip()
        if not l:
            continue
        # Skip pure page numbers
        if l.isdigit() and len(l) <= 3:
            continue
        cleaned_lines.append(l)
    
    raw = ' '.join(cleaned_lines)
    # Fix hyphenation across lines: e.g. "tempera- ture" -> "temperature"
    raw = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', raw)
    # Normalize whitespace
    raw = re.sub(r'\s+', ' ', raw).strip()
    return raw

def split_into_paragraphs(cleaned_text):
    """Split text into logical paragraphs based on sentence boundaries and headers."""
    # Often in this encyclopedia, text has subheadings like "Pressurized-water reactor : This is..."
    # or colon-led definitions. Let's split on double spaces or after long sentences where appropriate.
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9"\'(])', cleaned_text)
    paragraphs = []
    current_para = []
    
    for s in sentences:
        current_para.append(s)
        # Form paragraphs every 3-5 sentences or ~500 chars
        if len(' '.join(current_para)) > 450:
            paragraphs.append(' '.join(current_para))
            current_para = []
    if current_para:
        paragraphs.append(' '.join(current_para))
        
    return paragraphs

def create_epub():
    print(f"Opening PDF: {PDF_FILE}")
    doc = pymupdf.open(PDF_FILE)
    print(f"Total pages: {len(doc)}")
    
    book = epub.EpubBook()
    book.set_identifier('isbn-9780671210861')
    book.set_title('The Way Things Work: Volume Two - An Illustrated Encyclopedia of Technology')
    book.set_language('en')
    book.add_author('C. van Amerongen / Simon and Schuster')
    
    # CSS Stylesheet
    css_content = """
    body {
        font-family: serif, sans-serif;
        line-height: 1.6;
        padding: 1em;
        color: #1a1a1a;
    }
    h1 {
        color: #0f172a;
        font-size: 1.8em;
        margin-bottom: 0.5em;
        text-align: center;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.3em;
    }
    h2 {
        color: #1e293b;
        font-size: 1.4em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    p {
        margin-bottom: 1em;
        text-align: justify;
        text-indent: 1.5em;
    }
    .diagram-container {
        text-align: center;
        margin: 1.5em 0;
    }
    .diagram-container img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .diagram-caption {
        font-size: 0.9em;
        color: #64748b;
        font-style: italic;
        margin-top: 0.5em;
    }
    """
    style_item = epub.EpubItem(
        uid="style_main",
        file_name="style/main.css",
        media_type="text/css",
        content=css_content
    )
    book.add_item(style_item)
    
    chapters = []
    spine = ['nav']
    
    # 1. Front Matter - Cover & Title Page
    print("Generating Cover & Front Matter...")
    cover_page = doc[0]
    cover_pix = cover_page.get_pixmap(dpi=150)
    cover_buf = io.BytesIO()
    cover_img = Image.open(io.BytesIO(cover_pix.tobytes('jpeg')))
    cover_img.save(cover_buf, format='JPEG', quality=85, optimize=True)
    book.set_cover("images/cover.jpg", cover_buf.getvalue())
    
    # Introduction (Pages 9 - 10)
    intro_raw = doc[8].get_text() + "\n" + doc[9].get_text()
    intro_clean = clean_paragraph_text(intro_raw)
    intro_paras = split_into_paragraphs(intro_clean)
    
    intro_ch = epub.EpubHtml(title='Introduction', file_name='ch_intro.xhtml', lang='en')
    intro_ch.content = f"""
    <html>
    <head><link rel="stylesheet" href="style/main.css" type="text/css"/></head>
    <body>
        <h1>INTRODUCTION</h1>
        <p><em>by The Right Hon. The Lord Ritchie-Calder, C.B.E., M.A.</em></p>
        {"".join(f"<p>{p}</p>" for p in intro_paras)}
    </body>
    </html>
    """
    intro_ch.add_item(style_item)
    book.add_item(intro_ch)
    chapters.append(intro_ch)
    spine.append(intro_ch)
    
    # Foreword (Pages 11 - 15)
    foreword_raw = "".join([doc[p].get_text() + "\n" for p in range(10, 15)])
    foreword_clean = clean_paragraph_text(foreword_raw)
    foreword_paras = split_into_paragraphs(foreword_clean)
    
    foreword_ch = epub.EpubHtml(title='A Foreword from the Publishers', file_name='ch_foreword.xhtml', lang='en')
    foreword_ch.content = f"""
    <html>
    <head><link rel="stylesheet" href="style/main.css" type="text/css"/></head>
    <body>
        <h1>A FOREWORD FROM THE PUBLISHERS</h1>
        {"".join(f"<p>{p}</p>" for p in foreword_paras)}
    </body>
    </html>
    """
    foreword_ch.add_item(style_item)
    book.add_item(foreword_ch)
    chapters.append(foreword_ch)
    spine.append(foreword_ch)
    
    # 2. Main Encyclopedia Entries (Pages 24 to 578)
    print("Processing encyclopedia entries and illustrations...")
    current_topic_title = ""
    current_topic_paras = []
    current_topic_images = []
    
    entry_index = 0
    
    for p in range(23, 578, 2):
        text_page_idx = p
        diag_page_idx = p + 1 if p + 1 < len(doc) else None
        
        # Extract text from even page
        raw_text = doc[text_page_idx].get_text().strip()
        lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
        
        if not lines:
            continue
            
        first_line = lines[0]
        # Detect if continuation or new entry
        is_continuation = "(continued)" in first_line.lower() or "cont." in first_line.lower()
        
        # Render diagram image from odd page
        img_filename = None
        if diag_page_idx and diag_page_idx < len(doc):
            diag_page = doc[diag_page_idx]
            pix = diag_page.get_pixmap(dpi=140)
            buf = io.BytesIO()
            img = Image.open(io.BytesIO(pix.tobytes('jpeg')))
            img.save(buf, format='JPEG', quality=80, optimize=True)
            
            img_filename = f"diagram_p{diag_page_idx+1}.jpg"
            img_item = epub.EpubItem(
                uid=f"img_p{diag_page_idx+1}",
                file_name=f"images/{img_filename}",
                media_type="image/jpeg",
                content=buf.getvalue()
            )
            book.add_item(img_item)
            
        # Determine Title
        if not is_continuation:
            entry_title = first_line.title() if first_line.isupper() else first_line
        else:
            # Look for subhead in 2nd or 3rd line, or use previous title
            subhead = ""
            for l in lines[1:4]:
                if ":" in l or (len(l) > 3 and len(l) < 50):
                    subhead = l.split(":")[0].strip()
                    break
            if subhead:
                entry_title = f"{current_topic_title}: {subhead}"
            else:
                entry_title = f"{current_topic_title} (Part {p+1})"
                
        if not is_continuation:
            current_topic_title = entry_title
            
        # Clean text content
        cleaned_text = clean_paragraph_text(raw_text)
        paras = split_into_paragraphs(cleaned_text)
        
        entry_index += 1
        ch_uid = f"entry_{entry_index}"
        ch_file = f"entry_{entry_index:03d}.xhtml"
        
        ch_html = epub.EpubHtml(title=entry_title, file_name=ch_file, lang='en')
        
        img_html = ""
        if img_filename:
            img_html = f"""
            <div class="diagram-container">
                <img src="images/{img_filename}" alt="Schematic Diagram for {entry_title}"/>
                <div class="diagram-caption">Schematic Diagram: {entry_title} (Page {diag_page_idx+1})</div>
            </div>
            """
            
        paras_html = "".join([f"<p>{p_text}</p>" for p_text in paras])
        
        ch_html.content = f"""
        <html>
        <head><link rel="stylesheet" href="style/main.css" type="text/css"/></head>
        <body>
            <h2>{entry_title}</h2>
            {img_html}
            {paras_html}
        </body>
        </html>
        """
        ch_html.add_item(style_item)
        book.add_item(ch_html)
        chapters.append(ch_html)
        spine.append(ch_html)
        
        if entry_index % 30 == 0:
            print(f"  Processed {entry_index} entries (Page {p+1}/{578})...")
            
    # 3. Index (Pages 578 - 596)
    print("Processing Index...")
    index_raw = "".join([doc[p].get_text() + "\n" for p in range(577, min(596, len(doc)))])
    index_clean = clean_paragraph_text(index_raw)
    index_paras = split_into_paragraphs(index_clean)
    
    index_ch = epub.EpubHtml(title='Subject Index', file_name='ch_index.xhtml', lang='en')
    index_ch.content = f"""
    <html>
    <head><link rel="stylesheet" href="style/main.css" type="text/css"/></head>
    <body>
        <h1>SUBJECT INDEX</h1>
        {"".join(f"<p>{p}</p>" for p in index_paras)}
    </body>
    </html>
    """
    index_ch.add_item(style_item)
    book.add_item(index_ch)
    chapters.append(index_ch)
    spine.append(index_ch)
    
    # 4. Finalize Table of Contents & Navigation
    print("Finalizing TOC & Navigation...")
    book.toc = tuple(chapters)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = spine
    
    print(f"Writing EPUB output to {OUTPUT_EPUB}...")
    epub.write_epub(OUTPUT_EPUB, book)
    
    size_mb = os.path.getsize(OUTPUT_EPUB) / (1024 * 1024)
    print(f"Done! Created '{OUTPUT_EPUB}' successfully ({size_mb:.2f} MB, {len(chapters)} entries).")

if __name__ == "__main__":
    create_epub()
