#!/usr/bin/env node
'use strict';

// Kaynaktaki byte'lar ile story.js içindeki byte'ların aynı olduğunu denetler.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { collectSource, getRequestedSource, sha256 } = require('./build.js');

const sourcePath = getRequestedSource(process.argv.slice(2));
const storyPath = path.join(__dirname, 'story.js');

try {
  if (!fs.existsSync(sourcePath)) throw new Error(`Kaynak bulunamadı: ${sourcePath}`);
  if (!fs.existsSync(storyPath)) throw new Error('story.js bulunamadı. Önce build.js çalıştırın.');

  const source = collectSource(sourcePath);
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(storyPath, 'utf8'), sandbox, { filename: storyPath });
  const generated = sandbox.window.BOOK_STORY;
  if (!generated || typeof generated.textBase64 !== 'string') throw new Error('story.js geçerli bir BOOK_STORY içermiyor.');

  const embedded = Buffer.from(generated.textBase64, 'base64');
  const embeddedHash = sha256(embedded);
  const sameBytes = embedded.equals(source.bytes);
  const sameMetadata = generated.byteLength === source.bytes.length
    && generated.charLength === source.text.length
    && generated.wordCount === (source.text.match(/\S+/gu) || []).length
    && generated.sha256 === sha256(source.bytes);

  if (!sameBytes || !sameMetadata || embeddedHash !== generated.sha256) {
    throw new Error('DOĞRULAMA BAŞARISIZ: kaynak ile gömülü hikâye birebir eşleşmiyor.');
  }

  const lines = source.text.match(/^.+$/gm) || [];
  // Headings are metadata, not prose sentences. This is diagnostic-only and
  // never changes the byte stream being compared above.
  const proseLines = source.text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() && !/^#{1,6}\s/.test(line))
    .filter((line) => !(/^(?:[IVXLCDM]+\.\s+KİTAP\s+—|(?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI)\s+KISIM\s+—|Bölüm\s+\d+\s+—|EPİLOG\s+—|BİRİNCİ\s+KİTAP\s+SONU)/iu.test(line) || line.includes('•') || /^[A-ZÇĞİÖŞÜ\sİ]+$/u.test(line)));
  const sentences = proseLines.flatMap((line) => line.match(/[^.!?…]+[.!?…]+(?:[”"')\]]+)?/gu) || []);
  console.log('DOĞRULAMA BAŞARILI — kaynak ve story.js byte byte aynı.');
  console.log(`SHA-256: ${embeddedHash}`);
  console.log(`Byte: ${embedded.length} | Karakter: ${source.text.length} | Kelime: ${(source.text.match(/\S+/gu) || []).length}`);
  console.log(`İlk cümle: ${(sentences[0] || '').trim()}`);
  console.log(`Son cümle: ${(sentences.at(-1) || '').trim()}`);
  console.log(`İlk satır: ${lines[0] || ''}`);
  console.log(`Son satır: ${lines.at(-1) || ''}`);
} catch (error) {
  console.error(`Hata: ${error.message}`);
  process.exitCode = 1;
}
