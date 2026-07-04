import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function generateEpub() {
  const zip = new JSZip();

  // 1. mimetype (MUST be first and uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS/content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Số Đỏ (Bản Thử Nghiệm)</dc:title>
    <dc:creator>Vũ Trọng Phụng</dc:creator>
    <dc:language>vi</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
</package>`);

  // 4. OEBPS/toc.ncx
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle>
    <text>Số Đỏ</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>Chương I: Cuộc đời Xuân Tóc Đỏ</text>
      </navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2" playOrder="2">
      <navLabel>
        <text>Chương II: Vinh hoa phú quý</text>
      </navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-3" playOrder="3">
      <navLabel>
        <text>Chương III: Trò chuyện hội quần vợt</text>
      </navLabel>
      <content src="chapter3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

  // 5. OEBPS/chapter1.xhtml
  zip.file('OEBPS/chapter1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chương I: Cuộc đời Xuân Tóc Đỏ</title>
</head>
<body>
  <h1>Chương I: Cuộc đời Xuân Tóc Đỏ</h1>
  <p>Vũ Trọng Phụng là một trong những cây bút trào phúng hiện thực xuất sắc nhất của nền văn học Việt Nam nửa đầu thế kỷ XX.</p>
  <p>Số Đỏ xoay quanh nhân vật chính tên là Xuân Tóc Đỏ, một kẻ lém lỉnh, lêu lổng ở vỉa hè bỗng chốc được bước chân vào thế giới thượng lưu nhờ những trò lừa gạt vô ý.</p>
  <p>Đây là tác phẩm tiêu biểu phản ánh xã hội Việt Nam thời kỳ thực dân phong kiến nửa mùa đầy giả dối, lố lăng và học đòi văn minh Tây phương.</p>
  <div>Xuân Tóc Đỏ lúc này vẫn chỉ là một đứa trẻ đi bán thuốc dạo và lượm lặt nhặt bóng quần vợt kiếm cơm qua ngày.</div>
</body>
</html>`);

  // 6. OEBPS/chapter2.xhtml
  zip.file('OEBPS/chapter2.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chương II: Vinh hoa phú quý</title>
</head>
<body>
  <h1>Chương II: Vinh hoa phú quý</h1>
  <p>Nhờ được bà Phó Đoan - một góa phụ giàu có và "lãng mạn" nâng đỡ, Xuân Tóc Đỏ nhanh chóng gia nhập câu lạc bộ thể thao danh giá.</p>
  <p>Hắn giả danh làm giáo sư quần vợt, rồi tình cờ trở thành vị anh hùng cứu quốc trong mắt mọi người.</p>
  <p>Tác phẩm vẽ nên bức tranh châm biếm sâu cay về thói sính ngoại, phong trào "Âu hóa" nửa mùa thời bấy giờ.</p>
</body>
</html>`);

  // 7. OEBPS/chapter3.xhtml (with short dialogues to verify formatting preservation!)
  zip.file('OEBPS/chapter3.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chương III: Trò chuyện hội quần vợt</title>
</head>
<body>
  <h1>Chương III: Trò chuyện hội quần vợt</h1>
  <p>Hôm ấy là một ngày nắng rực rỡ tại sân tennis trung tâm Hà thành. Xuân Tóc Đỏ đứng tựa lưng vào lưới vợt.</p>
  <p>Bà Phó Đoan bước tới với nụ cười niềm nở:</p>
  <p>— Chào ông Xuân!</p>
  <p>Xuân gật đầu đáp:</p>
  <p>— Kính chào bà Phó.</p>
  <p>— Ông thấy trận đấu hôm nay thế nào?</p>
  <p>— Tuyệt vời.</p>
  <p>— Rất tốt.</p>
  <p>Bà Phó Đoan cười lớn:</p>
  <p>— Quả đúng là anh hùng xuất thiếu niên! Danh tiếng của ông đã vang xa khắp Hà Nội rồi đấy.</p>
</body>
</html>`);

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outputPath = path.join(process.cwd(), 'vietnamese_test_book.epub');
  fs.writeFileSync(outputPath, content);
  console.log(`Successfully generated Vietnamese test EPUB at: ${outputPath}`);
}

generateEpub().catch(console.error);
