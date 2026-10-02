import { test, expect } from '@playwright/test';
import { decodeEANImageData, normalizeScannedEAN, validScannedEAN } from '../barcode-decoder.js';

const L={0:'0001101',1:'0011001',2:'0010011',3:'0111101',4:'0100011',5:'0110001',6:'0101111',7:'0111011',8:'0110111',9:'0001011'};
const G={0:'0100111',1:'0110011',2:'0011011',3:'0100001',4:'0011101',5:'0111001',6:'0000101',7:'0010001',8:'0001001',9:'0010111'};
const R={0:'1110010',1:'1100110',2:'1101100',3:'1000010',4:'1011100',5:'1001110',6:'1010000',7:'1000100',8:'1001000',9:'1110100'};
const P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function bits(code){let s='101';for(let i=0;i<6;i++)s+=(P[+code[0]][i]==='L'?L:G)[code[1+i]];s+='01010';for(const d of code.slice(7))s+=R[d];return s+'101';}
function imageFor(code,scale=6){
  const b=bits(code), w=b.length*scale+260, h=120, data=new Uint8ClampedArray(w*h*4);
  data.fill(255); for(let y=18;y<102;y++)for(let i=0;i<b.length;i++)if(b[i]==='1')for(let x=0;x<scale;x++){const p=(y*w+i*scale+120+x)*4;data[p]=data[p+1]=data[p+2]=0;data[p+3]=255;}
  return {data,width:w,height:h};
}
test('dekoder EAN-13 odczytuje kod dokładnie z obrazu linii skanującej',()=>{expect(decodeEANImageData(imageFor('5901234123457'))).toBe('5901234123457');});
test('dekoder akceptuje UPC-A jako znormalizowany EAN-13',()=>{expect(normalizeScannedEAN('036000291452')).toBe('0036000291452');expect(validScannedEAN('0036000291452')).toBe(true);});
test('odrzuca kod z błędną cyfrą kontrolną',()=>{expect(validScannedEAN('5901234123458')).toBe(false);});
