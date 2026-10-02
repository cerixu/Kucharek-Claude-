/* ==========================================================================
   barcode-decoder.js — lokalny dekoder EAN dla skanera aparatu.
   Nie korzysta z sieci ani z zewnętrznego API. Dekoduje pasek pod linią skanującą.
   Obsługa: EAN-13, EAN-8 oraz UPC-A (UPC-A normalizujemy do EAN-13 z zerem).
   ========================================================================== */

const L = {
  '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011',
  '5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011',
};
const G = {
  '0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101',
  '5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111',
};
const R = {
  '0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100',
  '5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100',
};
const LREV = Object.fromEntries(Object.entries(L).map(([d,b]) => [b,d]));
const GREV = Object.fromEntries(Object.entries(G).map(([d,b]) => [b,d]));
const RREV = Object.fromEntries(Object.entries(R).map(([d,b]) => [b,d]));
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGGLGL','LGGLGL'.replace('LL','LL')];
PARITY[9] = 'LGGLGL';

function checksumEAN(code) {
  if (!/^\\d+$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const body = digits.slice(0, -1);
  const sum = body.reduce((acc, d, i) => acc + d * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[digits.length - 1];
}

function decodeEAN13Bits(bits) {
  if (bits.length < 95 || bits.slice(0,3) !== '101' || bits.slice(45,50) !== '01010' || bits.slice(92,95) !== '101') return null;
  const left = [], parity = [];
  for (let i = 0; i < 6; i++) {
    const b = bits.slice(3 + i * 7, 10 + i * 7);
    if (LREV[b] != null) { left.push(LREV[b]); parity.push('L'); }
    else if (GREV[b] != null) { left.push(GREV[b]); parity.push('G'); }
    else return null;
  }
  const p = parity.join('');
  const first = PARITY.indexOf(p);
  if (first < 0) return null;
  const right = [];
  for (let i = 0; i < 6; i++) {
    const b = bits.slice(50 + i * 7, 57 + i * 7);
    if (RREV[b] == null) return null;
    right.push(RREV[b]);
  }
  const code = String(first) + left.join('') + right.join('');
  return checksumEAN(code) ? code : null;
}

function decodeEAN8Bits(bits) {
  if (bits.length < 67 || bits.slice(0,3) !== '101' || bits.slice(31,36) !== '01010' || bits.slice(64,67) !== '101') return null;
  const left = [], right = [];
  for (let i = 0; i < 4; i++) {
    const b = bits.slice(3 + i * 7, 10 + i * 7);
    if (LREV[b] == null) return null;
    left.push(LREV[b]);
  }
  for (let i = 0; i < 4; i++) {
    const b = bits.slice(36 + i * 7, 43 + i * 7);
    if (RREV[b] == null) return null;
    right.push(RREV[b]);
  }
  const code = left.join('') + right.join('');
  return checksumEAN(code) ? code : null;
}

function runsFromRow(gray, width, y) {
  const values = new Uint8Array(width);
  for (let x = 0; x < width; x++) values[x] = gray[y * width + x];
  let min = 255, max = 0;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  if (max - min < 35) return null;
  const hist = new Uint32Array(256);
  for (const v of values) hist[v]++;
  let sum = 0, count = 0;
  for (let i = 0; i < 256; i++) { sum += i * hist[i]; count += hist[i]; }
  const mean = sum / Math.max(1, count);
  const threshold = Math.max(min + 20, Math.min(max - 20, mean));
  const runs = [];
  let black = values[0] < threshold, start = 0;
  for (let x = 1; x < width; x++) {
    const b = values[x] < threshold;
    if (b !== black) {
      runs.push({ black, start, end:x, width:x-start });
      start = x; black = b;
    }
  }
  runs.push({ black, start, end:width, width:width-start });
  return runs;
}

function sampleModules(gray, width, y, start, moduleWidth, count, reverse = false) {
  const bits = [];
  for (let i = 0; i < count; i++) {
    const x0 = Math.max(0, Math.min(width - 1, Math.floor(start + (i + .5) * moduleWidth)));
    const x = reverse ? width - 1 - x0 : x0;
    let acc = 0, n = 0;
    const y0 = Math.max(0, y - 1), y1 = Math.min(Math.floor(gray.length / width) - 1, y + 1);
    for (let yy = y0; yy <= y1; yy++) { acc += gray[yy * width + x]; n++; }
    bits.push(acc / Math.max(1,n) < 128 ? '1' : '0');
  }
  return bits.join('');
}

function decodeDirection(gray, width, height, reverse = false) {
  const ys = [Math.floor(height * .5), Math.floor(height * .42), Math.floor(height * .58), Math.floor(height * .34), Math.floor(height * .66)];
  for (const y of ys) {
    const runs = runsFromRow(gray, width, y);
    if (!runs) continue;
    for (let i = 0; i < runs.length - 2; i++) {
      const a = runs[i], b = runs[i+1], c = runs[i+2];
      if (!a.black || b.black || !c.black) continue;
      const lo = Math.min(a.width,b.width,c.width), hi = Math.max(a.width,b.width,c.width);
      if (lo < 1 || hi / lo > 2.8) continue;
      const moduleWidth = (a.width + b.width + c.width) / 3;
      if (moduleWidth < 1.1 || moduleWidth > width / 12) continue;
      const start = a.start;
      for (const drift of [-.65,-.35,0,.35,.65]) {
        const w = moduleWidth * (1 + drift / 10);
        const bits95 = sampleModules(gray,width,y,start,w,95,reverse);
        const e13 = decodeEAN13Bits(bits95);
        if (e13) return e13;
        const bits67 = sampleModules(gray,width,y,start,w,67,reverse);
        const e8 = decodeEAN8Bits(bits67);
        if (e8) return e8;
      }
    }
  }
  return null;
}

export function decodeEANImageData(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      gray[y * width + x] = Math.round(data[p] * .299 + data[p+1] * .587 + data[p+2] * .114);
    }
  }
  return decodeDirection(gray,width,height,false) || decodeDirection(gray,width,height,true);
}

export function normalizeScannedEAN(value) {
  const digits = String(value ?? '').replace(/\\D/g,'');
  if (digits.length === 12) return '0' + digits;
  if (digits.length === 13 || digits.length === 8) return digits;
  return '';
}

export function validScannedEAN(value) {
  const code = normalizeScannedEAN(value);
  return (code.length === 13 || code.length === 8) && checksumEAN(code);
}
