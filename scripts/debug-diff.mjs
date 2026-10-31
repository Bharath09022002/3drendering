import fs from 'fs';
import zlib from 'zlib';

function parsePNG(buf) {
  let pos = 8;
  let width, height;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idats.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  return { width, height, data: decompressed };
}

function unfilterPNG(png) {
  const { width, height, data } = png;
  const bpp = 3;
  const stride = 1 + width * bpp;
  const raw = Buffer.alloc(width * height * bpp);
  
  for (let y = 0; y < height; y++) {
    const filter = data[y * stride];
    const rowOffset = y * stride + 1;
    const outOffset = y * width * bpp;
    
    for (let x = 0; x < width * bpp; x++) {
      const byte = data[rowOffset + x];
      const a = x >= bpp ? raw[outOffset + x - bpp] : 0;
      const b = y > 0 ? raw[(y - 1) * width * bpp + x] : 0;
      const c = (x >= bpp && y > 0) ? raw[(y - 1) * width * bpp + x - bpp] : 0;
      
      let val = byte;
      if (filter === 1) val = (byte + a) & 0xff;
      else if (filter === 2) val = (byte + b) & 0xff;
      else if (filter === 3) val = (byte + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (byte + pr) & 0xff;
      }
      raw[outOffset + x] = val;
    }
  }
  return raw;
}

const fboPNG = parsePNG(fs.readFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/8887a868-d65c-4eb0-8722-c11b063cd3c1/gate4/gate4-handover-fbo-plane.png'));
const directPNG = parsePNG(fs.readFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/8887a868-d65c-4eb0-8722-c11b063cd3c1/gate4/gate4-handover-direct-render.png'));

const fboRaw = unfilterPNG(fboPNG);
const directRaw = unfilterPNG(directPNG);

function getPixel(raw, x, y) {
  const idx = (y * 1280 + x) * 3;
  return [raw[idx], raw[idx+1], raw[idx+2]];
}

let printed = 0;
for (let y = 0; y < 720 && printed < 12; y += 40) {
  for (let x = 0; x < 1280 && printed < 12; x += 40) {
    const p1 = getPixel(fboRaw, x, y);
    const p2 = getPixel(directRaw, x, y);
    const diff = (Math.abs(p1[0]-p2[0]) + Math.abs(p1[1]-p2[1]) + Math.abs(p1[2]-p2[2])) / 3;
    if (diff > 10) {
      console.log('Diff at (' + x + ', ' + y + '): FBO=' + JSON.stringify(p1) + ', Direct=' + JSON.stringify(p2) + ', diff=' + diff.toFixed(1));
      printed++;
    }
  }
}

let totalDiff = 0;
for (let i = 0; i < fboRaw.length; i++) {
  totalDiff += Math.abs(fboRaw[i] - directRaw[i]);
}
const macd = (totalDiff / (fboRaw.length * 255)) * 100;
console.log('Total MACD:', macd.toFixed(3) + '%');
