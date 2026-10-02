/* ==========================================================================
   barcode-scanner.js — kamera + prawdziwa linia skanująca.
   Dekoder dostaje WYŁĄCZNIE wąski pas obrazu przecinający linię.
   Dzięki temu linia nie jest dekoracją: kod musi faktycznie przeciąć strefę skanu.
   ========================================================================== */
import { h, icon, button, iconBtn, openSheet, toast } from './ui.js';
import { decodeEANImageData, normalizeScannedEAN, validScannedEAN } from './barcode-decoder.js';

function supportedNativeFormats() {
  return ['ean_13','ean_8','upc_a'];
}

export function openBarcodeScanner({ onDetected }) {
  let stream = null, timer = 0, stopped = false, busy = false, detector = null;
  let lastCode = '', stable = 0, lastAt = 0;
  const video = h('video', {
    class:'barcode-video',
    autoplay:true, muted:true, playsinline:true,
    'aria-label':'Podgląd aparatu do skanowania kodu kreskowego'
  });
  video.muted = true;
  video.playsInline = true;
  const canvas = document.createElement('canvas');
  const status = h('div',{class:'barcode-status','aria-live':'polite'},
    h('span',{class:'barcode-status-dot'}), h('span',null,'Ustaw kod kreskowy na linii'));
  const line = h('div',{class:'barcode-scan-line','aria-hidden':'true'},h('span'));
  const viewport = h('div',{class:'barcode-viewport'},video,line,
    h('div',{class:'barcode-hint'},icon('barcode',20),h('span',null,'Przesuń linię przez kod kreskowy')));
  const help = h('div',{class:'barcode-help'},
    h('strong',null,'Skanowanie EAN'),
    h('span',null,'Trzymaj kod poziomo i przesuń go tak, aby czarne kreski przecięły świecącą linię.'));
  const body = h('div',{class:'barcode-body'},viewport,status,help,
    h('div',{class:'barcode-actions'},button('Wpisz ręcznie',{kind:'ghost',icon:'edit',onClick:()=>finish(null)})));
  const sheet = openSheet({
    title:'Skanuj kod kreskowy', variant:'sheet', cls:'barcode-scanner-overlay',
    body, actions:[],
    onClose:()=>stop(),
  });

  function setStatus(msg, kind='') {
    status.className='barcode-status '+kind;
    status.lastChild.textContent=msg;
  }

  function finish(code) {
    if (stopped) return;
    if (code) {
      stopped=true;
      setStatus('Kod odczytany','ok');
      try { navigator.vibrate?.([35,45,70]); } catch (_) {}
      setTimeout(async()=>{ await onDetected(normalizeScannedEAN(code)); sheet.close('detected'); },120);
    } else {
      sheet.close('manual');
    }
  }

  async function makeDetector() {
    try {
      if (!('BarcodeDetector' in globalThis)) return null;
      const supported = typeof BarcodeDetector.getSupportedFormats === 'function'
        ? await BarcodeDetector.getSupportedFormats() : supportedNativeFormats();
      const formats = supportedNativeFormats().filter(x=>supported.includes(x));
      return formats.length ? new BarcodeDetector({formats}) : null;
    } catch (_) { return null; }
  }

  function drawScanBand() {
    const vw=video.videoWidth, vh=video.videoHeight;
    if (!vw || !vh) return null;
    // Wąski pas odpowiadający świecącej linii. To jedyny obszar przekazywany dekoderowi.
    const bandH=Math.max(56,Math.round(vh*.075));
    const cy=Math.round(vh*.52);
    const sy=Math.max(0,Math.min(vh-bandH,cy-Math.round(bandH/2)));
    const maxW=Math.min(vw,1600);
    const sx=Math.max(0,Math.round((vw-maxW)/2));
    const sw=maxW;
    canvas.width=sw; canvas.height=bandH;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,sx,sy,sw,bandH,0,0,sw,bandH);
    return ctx;
  }

  async function nativeDetect(ctx) {
    if (!detector || !ctx) return null;
    try {
      const found=await detector.detect(canvas);
      for (const b of found || []) {
        const code=normalizeScannedEAN(b.rawValue);
        if (validScannedEAN(code)) return code;
      }
    } catch (_) {}
    return null;
  }

  function localDetect(ctx) {
    if (!ctx) return null;
    try {
      return decodeEANImageData(ctx.getImageData(0,0,canvas.width,canvas.height));
    } catch (_) { return null; }
  }

  function acceptCandidate(code) {
    if (!code) {
      if (Date.now()-lastAt>700) { stable=0; lastCode=''; }
      return;
    }
    const now=Date.now();
    if (code===lastCode && now-lastAt<900) stable++;
    else { lastCode=code; stable=1; }
    lastAt=now;
    if (stable>=2) finish(code);
    else setStatus('Kod wykryty — utrzymaj go na linii…','near');
  }

  async function tick() {
    if (stopped) return;
    if (!busy && video.readyState>=2) {
      busy=true;
      const ctx=drawScanBand();
      const nativeCode=await nativeDetect(ctx);
      const code=nativeCode || localDetect(ctx);
      acceptCandidate(code);
      busy=false;
    }
    timer=setTimeout(tick,120);
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Ta przeglądarka nie udostępnia aparatu.','error');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('Skaner wymaga bezpiecznego połączenia HTTPS.','error');
      return;
    }
    try {
      detector=await makeDetector();
      stream=await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{
          facingMode:{ideal:'environment'},
          width:{ideal:1280,max:1920},
          height:{ideal:720,max:1440},
          frameRate:{ideal:30,max:30}
        }
      });
      video.srcObject=stream;
      await video.play();
      setStatus('Ustaw kod kreskowy na linii');
      raf=requestAnimationFrame(tick);
    } catch (e) {
      console.error(e);
      const denied=e?.name==='NotAllowedError'||e?.name==='SecurityError';
      setStatus(denied?'Brak dostępu do aparatu. Zezwól na aparat dla tej strony.':'Nie udało się uruchomić aparatu.','error');
      toast(denied?'Zezwól Kucharzowi na dostęp do aparatu.':'Nie udało się uruchomić aparatu',{type:'error'});
    }
  }

  function stop() {
    if (stopped && !stream) return;
    stopped=true;
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach(t=>t.stop());
    stream=null;
    video.srcObject=null;
  }

  sheet.panel.querySelector('.panel-head')?.appendChild(
    iconBtn('info','Informacje o skanowaniu',()=>toast('Linia jest aktywną strefą skanowania — dekoder analizuje tylko obraz bezpośrednio pod nią.'))
  );
  start();
  return { close:()=>{sheet.close('api');}, stop };
}
