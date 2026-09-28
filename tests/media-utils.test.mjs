import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './helpers/transpile.mjs';

const m = await importTs('src/components/knowledge/mediaUtils.ts', 'media-utils');
const blob = 'blob:http://localhost:5173/0f6c2d1e-aaaa-bbbb-cccc-123456789abc';

test('name and size are read from a #name=…&size=… hash (PDF name bug)', () => {
  assert.deepEqual(m.readMediaFile(`${blob}#name=doc.pdf&size=15`), { name: 'doc.pdf', size: 15 });
  const meta = m.parseMediaMetadata(`${blob}#name=doc.pdf&size=15`, 'pdf');
  assert.equal(meta.name, 'doc.pdf');
  assert.equal(meta.formattedSize, '15 B');
});

test('file names with special characters survive buildMediaUrl → readMediaFile', () => {
  for (const name of ['a&b.pdf', 'R&D report.pdf', '50%.png', 'a=b.png', 'a+b.mp4', 'size=1&name=x.pdf', 'çalışma ı.pdf', '#hash?.png']) {
    const url = m.buildMediaUrl(blob, { name, size: 1234 });
    assert.deepEqual(m.readMediaFile(url), { name, size: 1234 }, name);
    assert.equal(m.parseMediaMetadata(url, 'pdf').name, name, name);
  }
});

test('URLs saved with the older encodeURIComponent format still read correctly', () => {
  const url = `${blob}#name=${encodeURIComponent('R&D report.pdf')}&size=15`;
  assert.deepEqual(m.readMediaFile(url), { name: 'R&D report.pdf', size: 15 });
});

test('the older #file.ext hash and malformed escapes do not throw', () => {
  assert.equal(m.readMediaFile('https://assets.test/docs/x.pdf#whatsapp-guide.pdf').name, 'whatsapp-guide.pdf');
  assert.equal(m.readMediaFile('https://assets.test/docs/x.pdf#my%20guide.pdf').name, 'my guide.pdf');
  assert.equal(m.readMediaFile('https://assets.test/docs/x.pdf#100%.pdf').name, '100%.pdf');
  assert.equal(m.readMediaFile('https://assets.test/docs/report.pdf').name, 'report.pdf');
  assert.equal(m.readMediaFile('https://assets.test/docs/x?name=from-query.pdf&size=7').name, 'from-query.pdf');
  assert.deepEqual(m.readMediaFile(''), {});
});

test('an invalid size is ignored', () => {
  assert.equal(m.readMediaFile(`${blob}#name=a.pdf&size=abc`).size, undefined);
  assert.equal(m.readMediaFile(`${blob}#name=a.pdf&size=-5`).size, undefined);
  assert.equal(m.readMediaFile(`${blob}#name=a.pdf&size=`).size, undefined);
});

test('validateMediaFile requires both the extension and the MIME type', () => {
  const ok = (type, name, mime) => assert.equal(m.validateMediaFile(type, { name, type: mime }), undefined, `${name} ${mime}`);
  const bad = (type, name, mime) => assert.match(m.validateMediaFile(type, { name, type: mime }) ?? '', /is not a supported file/, `${name} ${mime}`);

  ok('pdf', 'guide.pdf', 'application/pdf');
  ok('pdf', 'GUIDE.PDF', 'application/pdf');
  ok('video', 'clip.mov', 'video/quicktime');
  ok('video', 'clip.webm', 'video/webm');
  ok('image', 'shot.JPEG', 'image/jpeg');

  bad('pdf', 'notes.pdf', 'text/plain');
  bad('pdf', 'notes.txt', 'application/pdf');
  bad('video', 'clip.mkv', 'video/x-matroska');
  bad('image', 'shot.png', '');
  bad('pdf', 'pdf', 'application/pdf');
  bad('image', 'shot.pdf', 'application/pdf');
});

test('the rejection message names the file and the accepted formats', () => {
  assert.equal(m.validateMediaFile('pdf', { name: 'notes.txt', type: 'text/plain' }), 'notes.txt is not a supported file. Accepted format: PDF');
  assert.equal(m.validateMediaFile('video', { name: 'clip.mkv', type: 'video/x-matroska' }), 'clip.mkv is not a supported file. Accepted formats: MP4, WebM, MOV');
});
