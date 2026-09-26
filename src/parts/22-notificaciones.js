    /* ====================== NOTIFICACIONES ====================== */
    // ── Voz / TTS ───────────────────────────────────────────────────
    // Motores: 'web' (Web Speech API del navegador), 'online'
    // (StreamElements, gratis y con CORS) y 'google' (Google Translate TTS
    // via <audio>). Los dos ultimos necesitan internet.
    let _ttsAudioEl = null;
    let _ttsBufSrc = null;
    let _ttsSeq = [];
    let _ttsLastErr = '';
    // true si la ultima reproduccion "online" tuvo que caer a la voz generica
    // de Google (StreamElements saturado). La UI lo avisa.
    let _ttsUsandoGoogle = false;
    // Generacion de reproduccion: cada _ttsDetener() la incrementa, y los
    // callbacks async abortan si su generacion ya no es la actual. Evita que
    // un audio viejo (p. ej. una descarga lenta) suene encima del nuevo.
    let _ttsGen = 0;
    // Cache de buffers decodificados por URL: repetir la misma frase suena
    // al instante (sin volver a descargar ni decodificar).
    const _ttsCache = new Map();
    // Resuelve un constructor del navegador prefiriendo el realm de la
    // pagina (necesario con el sandbox de Tampermonkey) y cayendo al global
    // del script si PAGE no lo expone.
    function pageCtor(nombre) {
        try { if (PAGE && typeof PAGE[nombre] === 'function') return PAGE[nombre]; } catch (_) { /* noop */ }
        try { if (typeof window !== 'undefined' && typeof window[nombre] === 'function') return window[nombre]; } catch (_) { /* noop */ }
        try { if (typeof globalThis !== 'undefined' && typeof globalThis[nombre] === 'function') return globalThis[nombre]; } catch (_) { /* noop */ }
        return null;
    }
    function _ttsVolumen() {
        return Math.min(1, Math.max(0, Number(APP.config.vozVolumen == null ? 1 : APP.config.vozVolumen)));
    }
    function _ttsDetener() {
        _ttsGen++;
        _ttsSeq = [];
        if (_ttsBufSrc) { try { _ttsBufSrc.onended = null; _ttsBufSrc.stop(); } catch (_) { /* noop */ } _ttsBufSrc = null; }
        if (_ttsAudioEl) { try { _ttsAudioEl.onended = null; _ttsAudioEl.pause(); } catch (_) { /* noop */ } _ttsAudioEl = null; }
        try { if (PAGE.speechSynthesis) PAGE.speechSynthesis.cancel(); } catch (_) { /* noop */ }
    }
    // Trae los bytes de una URL de audio por GM_xmlhttpRequest (salta CORS y
    // la CSP de la pagina, que suele bloquear media-src/connect-src externo).
    // Reintenta ante 401/403/429/5xx (StreamElements se satura y luego se
    // recupera). Devuelve Promise<ArrayBuffer|null>, o null si no hay GM.
    function _ttsBytesViaGM(url, reintentos) {
        const gm = gmXhr();
        if (!gm) return null;
        const max = reintentos == null ? 2 : reintentos;
        const intento = (n) => new Promise((resolve) => {
            let hecho = false;
            const fin = (v) => { if (!hecho) { hecho = true; resolve(v); } };
            try {
                gm({
                    method: 'GET', url: url, responseType: 'arraybuffer', timeout: 15000,
                    onload: (r) => {
                        if (r.status >= 200 && r.status < 300 && r.response) { fin(r.response); return; }
                        const recuperable = (r.status === 401 || r.status === 403 || r.status === 429 || r.status >= 500);
                        if (recuperable && n < max) {
                            _ttsLastErr = 'TTS HTTP ' + r.status + ' (reintentando)';
                            setTimeout(() => { intento(n + 1).then(fin); }, 800 + n * 700);
                        } else { _ttsLastErr = 'TTS HTTP ' + r.status; fin(null); }
                    },
                    onerror: () => {
                        if (n < max) setTimeout(() => { intento(n + 1).then(fin); }, 800 + n * 700);
                        else { _ttsLastErr = 'TTS fallo de red'; fin(null); }
                    },
                    ontimeout: () => { _ttsLastErr = 'TTS timeout'; fin(null); }
                });
            } catch (e) { _ttsLastErr = 'TTS: ' + (e && e.message || e); fin(null); }
        });
        return intento(0);
    }
    // Reproduce un <audio> desde una URL (blob o remota). Devuelve true si
    // pudo lanzar el play().
    function _ttsPlayUrl(src, onEnd, onError) {
        const A = pageCtor('Audio');
        if (!A) { _ttsLastErr = 'sin Audio'; if (onError) onError(); return false; }
        let a;
        try { a = new A(src); } catch (e) { _ttsLastErr = 'Audio: ' + (e && e.message || e); if (onError) onError(); return false; }
        a.volume = _ttsVolumen();
        _ttsAudioEl = a;
        if (onEnd) a.onended = onEnd;
        a.onerror = () => {
            const me = a.error;
            _ttsLastErr = me ? ('media ' + me.code) : 'error de audio';
            if (onError) onError();
        };
        const p = a.play();
        if (p && p.catch) p.catch((e) => { _ttsLastErr = 'play: ' + (e && e.message || e); if (onError) onError(); });
        return true;
    }
    // Reproduce un AudioBuffer por Web Audio.
    function _ttsPlayBuffer(buf, onEnd, onError) {
        const ctx = audioCtx();
        if (!ctx) { _ttsLastErr = 'sin AudioContext'; if (onError) onError(); return false; }
        if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (_) { /* noop */ } }
        try {
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const g = ctx.createGain();
            g.gain.value = _ttsVolumen();
            src.connect(g); g.connect(ctx.destination);
            _ttsBufSrc = src;
            if (onEnd) src.onended = onEnd;
            src.start(0);
            return true;
        } catch (e) { _ttsLastErr = 'buffer: ' + (e && e.message || e); if (onError) onError(); return false; }
    }
    // Decodifica y reproduce bytes. Web Audio primero (no le afecta la CSP);
    // si no, <audio> con blob local.
    function _ttsPlayBytes(url, bytes, onEnd, onError, gen) {
        const ctx = audioCtx();
        if (ctx) {
            try {
                if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (_) { /* noop */ } }
                let ya = false;
                const done = (buf) => {
                    if (ya || gen !== _ttsGen) return; ya = true;
                    if (url) { _ttsCache.set(url, buf); if (_ttsCache.size > 40) _ttsCache.delete(_ttsCache.keys().next().value); }
                    _ttsPlayBuffer(buf, onEnd, onError);
                };
                const fail = () => {
                    if (ya || gen !== _ttsGen) return; ya = true;
                    _ttsLastErr = 'decode: audio no decodable';
                    _ttsPlayBlob(bytes, 'audio/mpeg', onEnd, onError);
                };
                const data = bytes && bytes.slice ? bytes.slice(0) : bytes;
                const p = ctx.decodeAudioData(data);
                if (p && p.then) p.then(done).catch(fail);
                else ctx.decodeAudioData(data, done, fail);
                return true;
            } catch (e) { _ttsLastErr = 'decode: ' + (e && e.message || e); }
        }
        return _ttsPlayBlob(bytes, 'audio/mpeg', onEnd, onError);
    }
    function _ttsPlayBlob(bytes, mime, onEnd, onError) {
        const B = pageCtor('Blob');
        const U = PAGE.URL || (typeof URL !== 'undefined' ? URL : null);
        if (!B || !U) { if (onError) onError(); return false; }
        let url;
        try { url = U.createObjectURL(new B([bytes], { type: mime || 'audio/mpeg' })); }
        catch (e) { _ttsLastErr = 'blob: ' + (e && e.message || e); if (onError) onError(); return false; }
        // Libera el object URL al terminar (o fallar) para no acumular
        // blobs en memoria durante sesiones largas.
        const liberar = () => { try { U.revokeObjectURL(url); } catch (_) { /* noop */ } };
        const fin = () => { liberar(); if (onEnd) onEnd(); };
        const err = () => { liberar(); if (onError) onError(); };
        return _ttsPlayUrl(url, fin, err);
    }
    // Reproduce una URL remota: cache -> GM+Web Audio -> blob -> directo.
    function _ttsPlay(url, onEnd, onError) {
        _ttsDetener();
        const gen = _ttsGen;
        const cache = _ttsCache.get(url);
        if (cache) { _ttsPlayBuffer(cache, onEnd, onError); return true; }
        const prom = _ttsBytesViaGM(url);
        if (prom) {
            prom.then((bytes) => {
                if (gen !== _ttsGen) return;
                if (bytes) _ttsPlayBytes(url, bytes, onEnd, onError, gen);
                else if (!_ttsPlayUrl(url, onEnd, onError) && onError) onError();
            });
            return true;
        }
        return _ttsPlayUrl(url, onEnd, onError);
    }
    // Encadena varios audios (Google Translate parte el texto).
    function _ttsPlaySeq(urls) {
        _ttsDetener();
        const gen = _ttsGen;
        _ttsSeq = urls.slice();
        const next = () => {
            if (gen !== _ttsGen || !_ttsSeq.length) return;
            const url = _ttsSeq.shift();
            const avanzar = () => { if (gen === _ttsGen) setTimeout(next, 10); };
            const cache = _ttsCache.get(url);
            if (cache) { _ttsPlayBuffer(cache, avanzar, avanzar); return; }
            const prom = _ttsBytesViaGM(url);
            if (prom) prom.then((bytes) => { if (gen === _ttsGen) { if (bytes) _ttsPlayBytes(url, bytes, avanzar, avanzar, gen); else _ttsPlayUrl(url, avanzar, avanzar); } });
            else _ttsPlayUrl(url, avanzar, avanzar);
        };
        next();
        return true;
    }
    // Parte un texto en trozos <= n (Google Translate tiene limite ~200).
    function _partirTexto(text, n) {
        const out = [];
        const palabras = String(text || '').split(/\s+/);
        let cur = '';
        palabras.forEach((p) => {
            if ((cur + ' ' + p).trim().length > n && cur) { out.push(cur.trim()); cur = p; }
            else cur = (cur ? cur + ' ' : '') + p;
        });
        if (cur.trim()) out.push(cur.trim());
        return out.length ? out : [String(text || '').slice(0, n)];
    }
    function speak(text) {
        const txt = String(text || '').trim();
        if (!APP.config.voice || !txt) return false;
        _ttsLastErr = '';
        _ttsUsandoGoogle = false;
        // Corta cualquier reproduccion previa (evita solapamientos).
        _ttsDetener();
        const motor = APP.config.vozMotor || 'online';
        if (motor === 'google') return speakGoogle(txt);
        if (motor === 'web') {
            // Si el navegador no tiene Web Speech API o no hay voces, cae a
            // online. NO hay watchdog (esperar causaba eco y retardo).
            if (speakWeb(txt)) return true;
            _ttsLastErr = '';
            return speakOnline(txt);
        }
        return speakOnline(txt);
    }
    // Devuelve true si pudo lanzar la sintesis de voz del navegador. La
    // decision de usar web u online es SINCRONA (voces disponibles o no),
    // nunca "espero 1 s a ver": asi no hay solapamiento ni retardo.
    function speakWeb(text) {
        const synth = PAGE.speechSynthesis;
        const Utter = pageCtor('SpeechSynthesisUtterance');
        if (!synth || !Utter) { _ttsLastErr = 'sin Web Speech API'; return false; }
        const voces = synth.getVoices() || [];
        if (!voces.length) { _ttsLastErr = 'sin voces del sistema'; return false; }
        try {
            _ttsDetener();
            // SpeechSynthesisUtterance del realm de la pagina (con el sandbox
            // de Tampermonkey, uno del realm del script puede no pronunciarse).
            const u = new Utter(text);
            const lang = APP.config.voiceLang || 'es-MX';
            u.lang = lang;
            u.rate = 1.05; u.pitch = 1.0;
            u.volume = _ttsVolumen();
            // Solo voces en espanol.
            const esVoces = voces.filter((v) => String(v.lang || '').toLowerCase().indexOf('es') === 0);
            const vozPorNombre = APP.config.voiceVoice && esVoces.find((v) => v.name === APP.config.voiceVoice);
            const voz = vozPorNombre
                || esVoces.find((v) => String(v.lang || '').toLowerCase().replace('_', '-') === lang.toLowerCase())
                || esVoces[0];
            if (voz) u.voice = voz;
            u.onerror = () => { _ttsLastErr = 'error de sintesis'; };
            synth.speak(u);
            return true;
        } catch (e) { _ttsLastErr = 'speak: ' + (e && e.message || e); return false; }
    }
    // Voz "online". Cadena de proveedores GRATIS y SIN API KEY:
    //   1) ttsmp3.com  (POST -> URL de MP3; el mas fiable, 7 voces es)
    //   2) StreamElements (Polly; a veces se satura)
    //   3) Google Translate TTS (una sola voz)
    // La voz elegida se respeta en 1 y 2; en 3 es generica (se avisa).
    function _vozOnlineValida() {
        const pedida = APP.config.vozOnline || '';
        return TTS_ONLINE_VOCES.some((v) => v.v === pedida) ? pedida : 'Mia';
    }
    function speakOnline(text) {
        _ttsUsandoGoogle = false;
        const voz = _vozOnlineValida();
        const aGoogle = () => {
            if (APP.config.vozMotor !== 'google') { _ttsUsandoGoogle = true; speakGoogle(text); }
        };
        const aStreamElements = () => {
            const url = 'https://api.streamelements.com/kappa/v2/speech?voice='
                + encodeURIComponent(voz) + '&text=' + encodeURIComponent(text);
            _ttsPlay(url, null, aGoogle);
        };
        return speakTtsmp3(text, voz, aStreamElements);
    }
    // ttsmp3.com: POST al formulario publico y obtiene la URL del MP3.
    // Gratis, sin key. Si falla, llama a onFail (siguiente proveedor).
    function speakTtsmp3(text, voz, onFail) {
        const gm = gmXhr();
        if (!gm) { if (onFail) onFail(); return false; }
        const gen = _ttsGen;
        const cuerpo = 'msg=' + encodeURIComponent(text) + '&lang=' + encodeURIComponent(voz) + '&source=ttsmp3';
        try {
            gm({
                method: 'POST',
                url: 'https://ttsmp3.com/makemp3_new.php',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: cuerpo,
                timeout: 15000,
                onload: (r) => {
                    if (gen !== _ttsGen) return;
                    let j = null;
                    try { j = JSON.parse(r.responseText || '{}'); } catch (_) { /* noop */ }
                    if (r.status >= 200 && r.status < 300 && j && j.URL) {
                        _ttsPlay(j.URL, null, onFail); // baja el MP3 (GM) y lo reproduce
                    } else {
                        _ttsLastErr = 'ttsmp3 HTTP ' + r.status;
                        if (onFail) onFail();
                    }
                },
                onerror: () => { if (gen === _ttsGen) { _ttsLastErr = 'ttsmp3 fallo de red'; if (onFail) onFail(); } },
                ontimeout: () => { if (gen === _ttsGen) { _ttsLastErr = 'ttsmp3 timeout'; if (onFail) onFail(); } }
            });
        } catch (e) { _ttsLastErr = 'ttsmp3: ' + (e && e.message || e); if (onFail) onFail(); }
        return true;
    }
    // Google Translate TTS. Se reproduce via <audio> (no requiere CORS).
    function speakGoogle(text) {
        try {
            const lang = APP.config.voiceLang || 'es-MX';
            const tl = String(lang).split('-')[0].toLowerCase();
            const partes = _partirTexto(text, 190);
            const urls = partes.map((p, i) =>
                'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob'
                + '&tl=' + encodeURIComponent(tl)
                + '&q=' + encodeURIComponent(p)
                + '&total=' + partes.length + '&idx=' + i + '&textlen=' + p.length);
            return _ttsPlaySeq(urls);
        } catch (e) { _ttsLastErr = 'google: ' + (e && e.message || e); return false; }
    }
    // Prueba de voz con feedback: lee la frase con el motor/idioma/voz
// configurados y refleja en #c-voz-status que paso (para no quedarse en
// silencio sin saber por que).
    function probarVoz() {
        const setStatus = (txt, ok) => {
            const el = byId('c-voz-status');
            if (el) { el.textContent = txt; el.style.color = ok ? 'var(--rondo-ok-fg)' : 'var(--rondo-warn-fg)'; }
        };
        const txtEl = byId('c-voz-test-text');
        const txt = String((txtEl && txtEl.value) || DEFAULTS.vozTest || '').trim();
        if (!txt) { setStatus('Escribe una frase de prueba.', false); return; }
        unlockAudio();
        // Leemos los valores ACTUALES de los desplegables (no la config
        // guardada): asi cambiar la voz y pulsar Probar suena esa voz, sin
        // necesidad de Guardar. Los restauramos despues para no ensuciar.
        const selMotor = byId('c-voz-motor');
        const selLang = byId('c-voz-lang');
        const selVoz = byId('c-voz-voice');
        const motor = (selMotor && selMotor.value) || APP.config.vozMotor || 'online';
        const lang = (selLang && selLang.value) || APP.config.voiceLang || 'es-MX';
        const voz = selVoz ? selVoz.value : '';
        const prev = {
            vozMotor: APP.config.vozMotor, voiceLang: APP.config.voiceLang,
            vozOnline: APP.config.vozOnline, voiceVoice: APP.config.voiceVoice, voice: APP.config.voice
        };
        APP.config.vozMotor = motor;
        APP.config.voiceLang = lang;
        APP.config.voice = true; // el test suena aunque "Voz" este desactivada
        if (motor === 'online') APP.config.vozOnline = voz || (prev.vozOnline || 'Mia');
        else if (motor === 'web') APP.config.voiceVoice = voz || '';
        const ok = speak(txt);
        Object.assign(APP.config, prev);
        if (!ok) { setStatus('No se pudo reproducir: ' + (_ttsLastErr || 'desconocido'), false); return; }
        const etq = (motor === 'online' && voz) ? (voz + ' · online') : motor;
        setStatus('Reproduciendo con ' + etq + '...', true);
        setTimeout(() => {
            if (_ttsUsandoGoogle) {
                setStatus('El proveedor online no respondio: sono la voz generica de Google (por eso todas suenan igual). Reintenta en unos segundos.', false);
            } else if (_ttsLastErr) {
                setStatus('Aviso de voz: ' + _ttsLastErr + '. Si no oyes nada, usa el motor Online.', false);
            } else if (!prev.voice) {
                setStatus('Suena (' + etq + '). Ojo: "Voz" esta desactivada; activala para los avisos.', true);
            } else {
                setStatus('Listo (' + etq + '). Pulsa Guardar para dejarlo fijo.', true);
            }
        }, 4500);
    }

    // Rellena el desplegable de voces segun el motor elegido.
    function poblarVozSelect() {
        const sel = byId('c-voz-voice');
        if (!sel) return;
        const motorEl = byId('c-voz-motor');
        const motor = (motorEl && motorEl.value) || (APP.config.vozMotor || 'web');
        const langEl = byId('c-voz-lang');
        const lang = (langEl && langEl.value) || APP.config.voiceLang || 'es-MX';
        if (motor === 'online') {
            const pref = lang.slice(0, 2).toLowerCase();
            const orden = TTS_ONLINE_VOCES.slice().sort((a, b) => {
                const pa = a.l.toLowerCase().indexOf(pref) === 0 ? 0 : 1;
                const pb = b.l.toLowerCase().indexOf(pref) === 0 ? 0 : 1;
                return pa - pb;
            });
            sel.disabled = false;
            sel.innerHTML = orden.map((v) => '<option value="' + esc(v.v) + '">' + esc(v.n) + '</option>').join('');
            const actual = APP.config.vozOnline || DEFAULTS.vozOnline;
            if (orden.some((v) => v.v === actual)) sel.value = actual;
        } else if (motor === 'google') {
            sel.disabled = true;
            sel.innerHTML = '<option value="">(usa el idioma de arriba)</option>';
        } else {
            sel.disabled = false;
            const synth = PAGE.speechSynthesis;
            const todas = (synth ? synth.getVoices() : []) || [];
            // Solo voces en ESPANOL (la interfaz y los avisos son en espanol).
            const voces = todas.filter((v) => String(v.lang || '').toLowerCase().indexOf('es') === 0);
            sel.innerHTML = '<option value="">Predeterminada</option>' +
                voces.map((v) => '<option value="' + esc(v.name) + '">' + esc(v.name) + ' (' + esc(v.lang) + ')</option>').join('');
            if (APP.config.voiceVoice) sel.value = APP.config.voiceVoice;
        }
    }
    function audioCtx() {
        try {
            const Ctor = PAGE.AudioContext || PAGE.webkitAudioContext;
            if (!Ctor) return null;
            return beep._ctx || (beep._ctx = new Ctor());
        } catch (_) { return null; }
    }
    function unlockAudio() {
        const ctx = audioCtx();
        if (ctx && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (_) { /* noop */ } }
    }

