/* ====================== CONVERGENCIA CON CARNADA (V8.4) ======================
 * Reporte "Convergencia con carnada": traza los puntos donde hay PROBABLE robo
 * de diesel. Se apoya en el detector de descargas de la plataforma (55, ya
 * depurado de falsos positivos) y en el algoritmo propio (56, comb*).
 *
 * Idea (la del informe de hallazgos de convergencia):
 *   - Unidades CARNADA = las que tienen sensor de combustible integro (en la
 *     flota se marcan con "(SC)"). Si una de ellas pierde combustible estando
 *     detenida en un punto, ese punto es sospechoso.
 *   - Un punto SOLO se marca cuando hay (1) perdida registrada y (2)
 *     convergencia: dos o mas unidades carnada distintas coincidieron ahi
 *     dentro de 30 m (perdieron combustible o simplemente se detuvieron).
 *   - Los puntos marcados a 150 m o menos entre si son un solo tramo operativo
 *     y se presentan como uno.
 *   - La sospecha 0-9 usa la escala del fragmento 56: entorno 0-2, recurrencia
 *     0-2, volumen 0-3 y convergencia 0-2 (Alta desde 5, Media desde 3).
 *
 * Las LLEGADAS (paradas de las unidades carnada) salen del historial de la
 * plataforma (messages/load_interval). Es lo caro, asi que va aparte y solo
 * mira el entorno de los puntos mas perdidosos (opt-in).
 *
 * El nucleo (clustering, puntaje, paradas, verificacion) es PURO y se prueba
 * sin red; la ejecucion y el PDF cuelgan de el.
 */
/* === BEGIN: carnada === */
const RX_CARN_TPL = { rid: '__carnada__', id: '__carnada__', nombre: 'Convergencia con carnada (robo de diesel)', fuel: true, carnada: true };
const RX_CARN = { res: null };      // ultimo resultado: lo usan el mapa, el PDF y las geocercas
const _rxCarnCache = new Map();     // unidad|ventana|params -> paradas (solo memoria)
const RX_CARN_MAX_EVS = 3000;       // tope del cruce O(n^2)
const RX_CARN_COL_PUNTOS = ['Punto', 'Coordenadas', 'Ubicaci\u00f3n', 'Carnada \u226430 m', 'Eventos', 'Litros', 'Unidades', 'Primera', '\u00daltima', 'Entorno', 'Sospecha'];
const RX_CARN_COL_EVENTOS = ['Punto', 'Unidad', 'Inicio', 'Fin', 'Duraci\u00f3n', 'Litros', 'L por minuto', 'Velocidad', 'Coordenadas', 'Distancia al punto', 'Sensor'];
const RX_CARN_COL_LLEGADAS = ['Punto', 'Unidad', 'Llegada', 'Salida', 'Minutos', 'Distancia al punto'];
const RX_CARN_COL_AISLADOS = ['Unidad', 'Inicio', 'Duraci\u00f3n', 'Litros', 'L por minuto', 'Coordenadas', 'Ubicaci\u00f3n', 'Por qu\u00e9 no se marca'];
const RX_CARN_COLOR = { Alta: '#9e1b24', Media: '#c97324', Baja: '#2a6dd6' };
// Opciones, siempre saneadas: lo que llegue de la pantalla puede ser cualquier cosa.
function carnCfg(c) {
    const o = c || {};
    const n = (v, d, lo, hi) => { const x = Number(v); return (isFinite(x) && x >= lo && x <= hi) ? x : d; };
    return {
        radio: n(o.radio, 30, 5, 500), unir: n(o.unir, 150, 10, 2000),
        minCarnada: Math.round(n(o.minCarnada, 2, 1, 50)), llegadas: !!o.llegadas,
        topPuntos: Math.round(n(o.topPuntos, 10, 1, 60)), ventanaH: n(o.ventanaH, 12, 1, 72),
        paradaMin: n(o.paradaMin, 2, 0.5, 120), vel: n(o.vel, 3, 0, 40), verifM: n(o.verifM, 50, 10, 500)
    };
}
function carnPad(i) { return (i < 9 ? '0' : '') + (i + 1); }
// Circulo como poligono (para dibujar radios reales en metros en el mapa).
function carnCirculo(lat, lon, r, n) {
    const pts = [], k = n || 28, rad = Math.PI / 180;
    const dLat = r / 111320, dLon = r / (111320 * Math.max(0.05, Math.cos(lat * rad)));
    for (let i = 0; i <= k; i++) {
        const a = (i / k) * 2 * Math.PI;
        pts.push({ lat: lat + dLat * Math.sin(a), lon: lon + dLon * Math.cos(a) });
    }
    return pts;
}
// ── Nucleos y puntos ────────────────────────────────────────────────────
// Nucleos: perdidas a <= radio de la mas grande (la semilla no se mueve, asi un
// grupo no "se arrastra" paso a paso y el resultado no depende del orden).
function carnNucleos(evs, radioM) {
    const lista = (evs || []).filter((e) => e && e.lat != null && e.lon != null)
        .slice(0, RX_CARN_MAX_EVS).sort((a, b) => (b.litros || 0) - (a.litros || 0));
    const nucleos = [];
    for (const e of lista) {
        let g = null, mejor = Infinity;
        for (const n of nucleos) {
            const d = rxFuelDist(n.lat, n.lon, e.lat, e.lon);
            if (d <= radioM && d < mejor) { g = n; mejor = d; }
        }
        if (!g) { g = { lat: e.lat, lon: e.lon, evs: [], llegadas: [], unidades: [] }; nucleos.push(g); }
        g.evs.push(e);
    }
    return nucleos;
}
// Une (cadena) los nucleos a <= unirM: "mismo tramo operativo".
function carnUneGrupos(nucleos, unirM) {
    const padre = nucleos.map((_, i) => i);
    const raiz = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
    for (let i = 0; i < nucleos.length; i++) {
        for (let j = i + 1; j < nucleos.length; j++) {
            if (rxFuelDist(nucleos[i].lat, nucleos[i].lon, nucleos[j].lat, nucleos[j].lon) <= unirM) {
                const a = raiz(i), b = raiz(j);
                if (a !== b) padre[b] = a;
            }
        }
    }
    const por = new Map();
    nucleos.forEach((n, i) => {
        const r = raiz(i);
        if (!por.has(r)) por.set(r, []);
        por.get(r).push(n);
    });
    return Array.from(por.values());
}
function carnMasFrecuente(textos) {
    const c = {};
    (textos || []).forEach((t) => { const k = String(t == null ? '' : t).trim(); if (k) c[k] = (c[k] || 0) + 1; });
    const k = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
    return k || '';
}
// Entorno y puntaje de sospecha de un punto (escala del fragmento 56).
function carnSospecha(p) {
    const texto = p.zona || p.ubi || '';
    let ent = { puntos: 1, tipo: 'desconocido' };
    try { if (typeof combEntorno === 'function') ent = combEntorno(texto); } catch (_) { /* noop */ }
    const comp = {
        entorno: ent.puntos,
        recurrencia: (typeof combPuntosRecurrencia === 'function') ? combPuntosRecurrencia(p.eventos) : (p.eventos >= 3 ? 2 : (p.eventos >= 2 ? 1 : 0)),
        volumen: (typeof combPuntosVolumen === 'function') ? combPuntosVolumen(p.litros) : (p.litros >= 200 ? 3 : (p.litros >= 100 ? 2 : (p.litros >= 50 ? 1 : 0))),
        convergencia: (typeof combPuntosConvergencia === 'function') ? combPuntosConvergencia(p.carnada) : (p.carnada >= 5 ? 2 : (p.carnada >= 3 ? 1 : 0))
    };
    let sc = null;
    try { if (typeof combPuntaje === 'function') sc = combPuntaje(comp); } catch (_) { sc = null; }
    if (!sc) {
        const t = Math.min(9, comp.entorno + comp.recurrencia + comp.volumen + comp.convergencia);
        sc = { puntaje: t, nivel: t >= 5 ? 'Alta' : (t >= 3 ? 'Media' : 'Baja'), componentes: comp };
    }
    return { entorno: ent.tipo, entornoPuntos: ent.puntos, puntaje: sc.puntaje, nivel: sc.nivel, componentes: sc.componentes };
}
function carnAgregaPunto(g, cfg) {
    const evs = [], llegadas = [], vistoL = {};
    let sw = 0, sla = 0, slo = 0;
    for (const n of g) {
        const w = n.evs.reduce((a, e) => a + (e.litros || 0), 0) || 1;
        sw += w; sla += n.lat * w; slo += n.lon * w;
        n.evs.forEach((e) => evs.push(e));
        n.llegadas.forEach((l) => { const k = l.eco + '|' + l.t0; if (!vistoL[k]) { vistoL[k] = 1; llegadas.push(l); } });
    }
    const lat = sla / sw, lon = slo / sw;
    const uni = {}, uniPerd = {}, dias = {};
    evs.forEach((e) => { uni[e.eco] = 1; uniPerd[e.eco] = 1; e.dPunto = Math.round(rxFuelDist(lat, lon, e.lat, e.lon)); if (e.ms0 != null) dias[new Date(e.ms0).toDateString()] = 1; });
    llegadas.forEach((l) => { uni[l.eco] = 1; l.dPunto = Math.round(rxFuelDist(lat, lon, l.lat, l.lon)); });
    const litros = evs.reduce((a, e) => a + (e.litros || 0), 0);
    const tasas = evs.map((e) => (e.litros != null && e.durSeg > 0) ? e.litros / (e.durSeg / 60) : null).filter((x) => x != null);
    const durs = evs.map((e) => (e.durSeg != null ? e.durSeg / 60 : null)).filter((x) => x != null);
    const vels = evs.map((e) => e.vel).filter((x) => x != null && isFinite(x));
    const tiempos = evs.map((e) => e.ms0).filter((x) => x != null).concat(llegadas.map((l) => l.t0));
    let zona = '';
    try { zona = (typeof rxFuelZona === 'function') ? (rxFuelZona(lat, lon) || '') : ''; } catch (_) { zona = ''; }
    const p = {
        id: '', lat: lat, lon: lon, evs: evs, llegadas: llegadas,
        unidades: Object.keys(uni), carnada: Object.keys(uni).length, unidadesPerdida: Object.keys(uniPerd),
        eventos: evs.length, litros: litros, dias: Object.keys(dias).length,
        ubi: carnMasFrecuente(evs.map((e) => e.ubi)), zona: zona,
        primera: tiempos.length ? Math.min.apply(null, tiempos) : null,
        ultima: tiempos.length ? Math.max.apply(null, tiempos) : null,
        minMin: durs.length ? Math.min.apply(null, durs) : null, maxMin: durs.length ? Math.max.apply(null, durs) : null,
        minTasa: tasas.length ? Math.min.apply(null, tasas) : null, maxTasa: tasas.length ? Math.max.apply(null, tasas) : null,
        velMax: vels.length ? Math.max.apply(null, vels) : null, nucleos: g.length
    };
    Object.assign(p, carnSospecha(p));
    return p;
}
// Puntos de probable robo. `paradas` = llegadas de las unidades carnada
// ({eco, lat, lon, t0, t1, min}); puede venir vacio (solo cuentan las perdidas).
function carnPuntos(evs, paradas, cfgIn) {
    const cfg = carnCfg(cfgIn);
    const nucleos = carnNucleos(evs, cfg.radio);
    for (const p of (paradas || [])) {
        if (!p || p.lat == null || p.lon == null) continue;
        for (const n of nucleos) {
            if (rxFuelDist(n.lat, n.lon, p.lat, p.lon) <= cfg.radio) {
                if (!n.llegadas.some((l) => l.eco === p.eco && l.t0 === p.t0)) n.llegadas.push(p);
            }
        }
    }
    nucleos.forEach((n) => {
        const u = {};
        n.evs.forEach((e) => { u[e.eco] = 1; });
        n.llegadas.forEach((l) => { u[l.eco] = 1; });
        n.unidades = Object.keys(u);
    });
    // Perdida + convergencia: las dos condiciones.
    const marcados = nucleos.filter((n) => n.evs.length >= 1 && n.unidades.length >= cfg.minCarnada);
    const puntos = carnUneGrupos(marcados, cfg.unir).map((g) => carnAgregaPunto(g, cfg));
    puntos.sort((a, b) => (b.carnada - a.carnada) || (b.litros - a.litros));
    puntos.forEach((p, i) => { p.id = 'C' + carnPad(i); });
    const enPunto = new Set();
    puntos.forEach((p) => p.evs.forEach((e) => enPunto.add(e)));
    const aislados = (evs || []).filter((e) => e && !enPunto.has(e));
    return { puntos: puntos, aislados: aislados, nucleos: nucleos.length, cfg: cfg };
}
// Por que una perdida NO forma punto (para la tabla de aislados).
function carnMotivoAislado(e, cfg) {
    if (e.lat == null || e.lon == null) return 'sin coordenadas';
    return 'solo ' + 1 + ' unidad en ' + cfg.radio + ' m: no hay convergencia de ' + cfg.minCarnada + ' unidades carnada';
}
// ── Verificacion con las llegadas ───────────────────────────────────────
// Cuantas perdidas tienen, de la MISMA unidad, una parada a <= verifM metros y
// solapada en el tiempo (+-10 min): dos fuentes (sensor e historial) que dicen
// lo mismo.
function carnVerifica(evs, paradas, cfgIn) {
    const cfg = carnCfg(cfgIn);
    const tol = 10 * 60000;
    let ok = 0, total = 0, mejor = null;
    for (const e of (evs || [])) {
        if (!e || e.lat == null || e.ms0 == null) continue;
        total++;
        let hit = null;
        for (const p of (paradas || [])) {
            if (!p || p.eco !== e.eco || p.lat == null) continue;
            if (p.t1 < e.ms0 - tol || p.t0 > (e.ms1 != null ? e.ms1 : e.ms0) + tol) continue;
            const d = rxFuelDist(e.lat, e.lon, p.lat, p.lon);
            if (d <= cfg.verifM && (hit == null || d < hit.d)) hit = { d: d, p: p };
        }
        if (hit) { ok++; if (mejor == null || hit.d < mejor.d) mejor = { d: hit.d, eco: e.eco, t0: hit.p.t0, t1: hit.p.t1, litros: e.litros }; }
    }
    return { coinciden: ok, total: total, pct: total ? (100 * ok / total) : 0, mejor: mejor };
}
// ── Paradas (llegadas) desde mensajes crudos ────────────────────────────
// Mensajes { t (s), pos:{x,y,s} } como los de load_interval. Una parada son
// puntos seguidos con velocidad <= vel que duran al menos paradaMin; si la
// unidad "se mueve" mas de 80 m del centro del grupo sin reportar velocidad,
// la parada se corta (GPS que salta o unidad remolcada).
function carnDetectaParadas(msgs, eco, opts) {
    const o = opts || {};
    const minSeg = Math.max(30, (Number(o.paradaMin) > 0 ? Number(o.paradaMin) : 2) * 60);
    const vel = (o.vel == null || !isFinite(Number(o.vel))) ? 3 : Number(o.vel);
    const deriva = (Number(o.deriva) > 0) ? Number(o.deriva) : 80;
    const arr = [];
    for (const m of (msgs || [])) {
        if (!m || !m.pos) continue;
        const la = +m.pos.y, lo = +m.pos.x, t = Number(m.t) || 0;
        if (!t || !isFinite(la) || !isFinite(lo)) continue;
        arr.push({ t: t, lat: la, lon: lo, s: Number(m.pos.s) || 0 });
    }
    arr.sort((a, b) => a.t - b.t);
    const out = [];
    let run = null;
    const cerrar = () => {
        if (run && (run.t1 - run.t0) >= minSeg) {
            out.push({ eco: eco, lat: run.sl / run.n, lon: run.so / run.n, t0: run.t0 * 1000, t1: run.t1 * 1000, min: Math.round((run.t1 - run.t0) / 60) });
        }
        run = null;
    };
    for (const p of arr) {
        if (p.s > vel) { cerrar(); continue; }
        if (run && rxFuelDist(run.sl / run.n, run.so / run.n, p.lat, p.lon) > deriva) cerrar();
        if (!run) run = { t0: p.t, t1: p.t, sl: 0, so: 0, n: 0 };
        run.t1 = p.t; run.sl += p.lat; run.so += p.lon; run.n++;
    }
    cerrar();
    return out;
}
// Ventanas de historial a pedir: +-ventanaH horas de cada perdida, unidas.
function carnVentanas(evs, horas) {
    const h = Math.round((Number(horas) > 0 ? Number(horas) : 12) * 3600);
    const w = (evs || []).filter((e) => e && e.ms0 != null)
        .map((e) => [Math.floor(e.ms0 / 1000) - h, Math.floor((e.ms1 != null ? e.ms1 : e.ms0) / 1000) + h])
        .sort((a, b) => a[0] - b[0]);
    const out = [];
    for (const x of w) {
        const u = out[out.length - 1];
        if (u && x[0] <= u[1]) u[1] = Math.max(u[1], x[1]); else out.push([x[0], x[1]]);
    }
    return out;
}
// Candidatos para pedir llegadas: los N grupos de perdidas (a unirM) con mas
// litros. Solo ahi se mira el historial.
function carnCandidatos(evs, cfgIn) {
    const cfg = carnCfg(cfgIn);
    const nucleos = carnNucleos(evs, cfg.unir);
    nucleos.forEach((n) => { n.litros = n.evs.reduce((a, e) => a + (e.litros || 0), 0); });
    nucleos.sort((a, b) => b.litros - a.litros);
    const top = nucleos.slice(0, cfg.topPuntos);
    const eventos = [];
    top.forEach((n) => n.evs.forEach((e) => eventos.push(e)));
    return { centros: top.map((n) => ({ lat: n.lat, lon: n.lon })), eventos: eventos, ventanas: carnVentanas(eventos, cfg.ventanaH) };
}
// Pide el historial de cada unidad carnada en las ventanas y se queda con las
// paradas cercanas a algun centro. Cacheado en memoria por unidad y ventana.
async function carnEscaneaLlegadas(unidades, ventanas, centros, cfgIn, onProg, token) {
    const cfg = carnCfg(cfgIn);
    const paradas = [], errores = [];
    let truncados = 0, hechas = 0;
    const trabajos = [];
    for (const u of (unidades || [])) for (const w of (ventanas || [])) trabajos.push({ u: u, w: w });
    const total = trabajos.length;
    let idx = 0;
    if (_rxCarnCache.size > 20000) _rxCarnCache.clear();
    const cerca = cfg.unir + cfg.radio;
    const obrero = async () => {
        while (true) {
            if (token && token.cancelado) return;
            const j = trabajos[idx++];
            if (!j) return;
            const key = j.u.id + '|' + j.w[0] + '|' + j.w[1] + '|' + cfg.paradaMin + '|' + cfg.vel;
            let st = _rxCarnCache.get(key);
            if (!st) {
                let r = null;
                try { r = await rxGeoInfCargaTrozo(String(j.u.id), j.w[0], j.w[1], token); } catch (e) { r = { msgs: [], error: (e && e.message) || String(e) }; }
                if (r.error && r.error !== 'cancelado') {
                    if (errores.length < 5) errores.push((j.u.eco ? (j.u.eco + ': ') : '') + r.error);
                    st = [];
                } else if (r.error === 'cancelado') {
                    return;
                } else {
                    st = carnDetectaParadas(r.msgs, j.u.eco, cfg);
                    if (r.truncado) truncados++;
                    _rxCarnCache.set(key, st);
                }
            }
            for (const p of st) {
                for (const c of centros) {
                    if (rxFuelDist(c.lat, c.lon, p.lat, p.lon) <= cerca) { paradas.push(p); break; }
                }
            }
            hechas++;
            if (onProg) onProg(hechas, total, j.u.eco);
            await (typeof rxGeoInfYield === 'function' ? rxGeoInfYield() : new Promise((x) => setTimeout(x, 0)));
        }
    };
    const n = Math.max(1, Math.min(4, total || 1));
    const tareas = [];
    for (let i = 0; i < n; i++) tareas.push(obrero());
    await Promise.all(tareas);
    return { paradas: paradas, errores: errores, hechas: hechas, total: total, truncados: truncados };
}
// Eventos del detector propio del sensor (rxFuelCorre) con la forma de los de
// la plataforma, para poder usar el mismo analisis cuando no hay plantilla.
function carnEvsDeSensor(res) {
    const out = [];
    for (const f of ((res && res.filas) || [])) {
        const ms1 = rxFuelParseFecha(f[1]);
        const min = Number(f[3]) || 0;
        const m = String(f[6] == null ? '' : f[6]).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
        const litros = Number(String(f[2]).replace(',', '.'));
        out.push({
            eco: String(f[0]), ubi: String(f[7] || ''), lat: m ? +m[1] : null, lon: m ? +m[2] : null,
            ini: String(f[1] || ''), fin: String(f[1] || ''), ms0: ms1 != null ? ms1 - min * 60000 : null, ms1: ms1,
            durSeg: Math.max(min, 1) * 60, litros: isFinite(litros) ? litros : null, iniNiv: null, finNiv: null,
            vel: isFinite(Number(f[4])) ? Number(f[4]) : null, sensor: '', rawL: String(f[2] == null ? '' : f[2]),
            n: 1, sensores: [], noCuadra: false, fusion: 0
        });
    }
    return out;
}
// ── Tablas ──────────────────────────────────────────────────────────────
function carnFechaTxt(ms) {
    if (ms == null || !isFinite(ms)) return '-';
    try { return rxFuelFecha(Math.round(ms / 1000)).slice(0, 16); } catch (_) { return '-'; }
}
function carnTablas(r, coma) {
    const L = (n) => rxFuelFmtN(n, 1, coma) + ' L';
    const pts = r.puntos || [];
    const filasP = pts.map((p) => [
        p.id, p.lat.toFixed(5) + ', ' + p.lon.toFixed(5), p.ubi || p.zona || '', p.carnada, p.eventos, L(p.litros),
        p.unidades.join(', '), carnFechaTxt(p.primera), carnFechaTxt(p.ultima), p.entorno, p.nivel + ' (' + p.puntaje + ')'
    ]);
    const filasE = [];
    pts.forEach((p) => p.evs.slice().sort((a, b) => (a.ms0 || 0) - (b.ms0 || 0)).forEach((e) => {
        filasE.push([p.id, e.eco, e.ini, e.fin, e.durSeg != null ? rxFuelFmtDur(e.durSeg) : '-', L(e.litros),
            (e.litros != null && e.durSeg > 0) ? rxFuelFmtN(e.litros / (e.durSeg / 60), 1, coma) : '-',
            e.vel != null ? (rxFuelFmtN(e.vel, 0, coma) + ' km/h') : '-',
            e.lat.toFixed(5) + ', ' + e.lon.toFixed(5), (e.dPunto != null ? e.dPunto : 0) + ' m', e.sensor || '']);
    }));
    const filasL = [];
    pts.forEach((p) => p.llegadas.slice().sort((a, b) => a.t0 - b.t0).forEach((l) => {
        filasL.push([p.id, l.eco, carnFechaTxt(l.t0), carnFechaTxt(l.t1), l.min, (l.dPunto != null ? l.dPunto : 0) + ' m']);
    }));
    const filasA = (r.aislados || []).slice(0, 2000).map((e) => [
        e.eco, e.ini, e.durSeg != null ? rxFuelFmtDur(e.durSeg) : '-', L(e.litros),
        (e.litros != null && e.durSeg > 0) ? rxFuelFmtN(e.litros / (e.durSeg / 60), 1, coma) : '-',
        (e.lat != null ? e.lat.toFixed(5) + ', ' + e.lon.toFixed(5) : ''), e.ubi || '', carnMotivoAislado(e, r.cfg)
    ]);
    const tablas = [{ idx: 0, name: 'puntos', label: 'Puntos de convergencia', cols: RX_CARN_COL_PUNTOS.slice(), filas: filasP }];
    tablas.push({ idx: 1, name: 'eventos', label: 'P\u00e9rdidas en los puntos', cols: RX_CARN_COL_EVENTOS.slice(), filas: filasE });
    if (filasL.length) tablas.push({ idx: 2, name: 'llegadas', label: 'Llegadas', cols: RX_CARN_COL_LLEGADAS.slice(), filas: filasL });
    if (filasA.length) tablas.push({ idx: 3, name: 'aislados', label: 'P\u00e9rdidas sin convergencia', cols: RX_CARN_COL_AISLADOS.slice(), filas: filasA });
    return tablas;
}
// ── Ejecucion ───────────────────────────────────────────────────────────
// `p` = { usarPlat, tpl, def, lista, desde, hasta, cfgFuel, cfgCarn, onFase(pct,txt), token }
async function carnCorre(p) {
    const t0 = Date.now();
    const cfg = carnCfg(p.cfgCarn);
    const cfgF = p.cfgFuel || RX_INF.fuel;
    const fase = (pct, txt) => { if (p.onFase) p.onFase(pct, txt); };
    let evs = [], rec = null, sensorRes = null;
    fase(5, 'P\u00e9rdidas de combustible\u2026');
    if (p.usarPlat && p.tpl) {
        rec = await rxFuelRecolecta(p.tpl, p.lista, p.desde, p.hasta, p.def, (h, t, n, eco) => {
            fase(5 + Math.round((h / Math.max(1, t)) * 45), 'P\u00e9rdidas \u00b7 ' + h + '/' + t + (eco ? ' \u00b7 ' + eco : '') + ' \u00b7 ' + n + ' descarga(s)');
        }, p.token);
        evs = rec.evs;
    } else {
        sensorRes = await rxFuelCorre(p.lista, p.desde, p.hasta, cfgF, (h, t, n, eco) => {
            fase(5 + Math.round((h / Math.max(1, t)) * 45), 'Sensor \u00b7 ' + h + '/' + t + (eco ? ' \u00b7 ' + eco : '') + ' \u00b7 ' + n + ' p\u00e9rdida(s)');
        }, p.token);
        evs = carnEvsDeSensor(sensorRes);
    }
    // Solo lo que parece robo (sin falla de sensor, consumo ni movimiento).
    const an = rxFuelAnalizaDescargas(evs, cfgF);
    const rel = an.rel.filter((e) => e.lat != null && e.lon != null);
    let llegadas = null;
    if (cfg.llegadas && rel.length && !(p.token && p.token.cancelado)) {
        const cand = carnCandidatos(rel, cfg);
        const unis = (p.lista || []).filter((u) => u && u.id != null);
        fase(52, 'Llegadas \u00b7 ' + unis.length + ' unidades en ' + cand.ventanas.length + ' ventana(s)\u2026');
        llegadas = await carnEscaneaLlegadas(unis, cand.ventanas, cand.centros, cfg, (h, t, eco) => {
            fase(52 + Math.round((h / Math.max(1, t)) * 42), 'Llegadas \u00b7 ' + h + '/' + t + (eco ? ' \u00b7 ' + eco : ''));
        }, p.token);
    }
    fase(96, 'Calculando puntos\u2026');
    const r = carnPuntos(rel, llegadas ? llegadas.paradas : [], cfg);
    const verif = llegadas ? carnVerifica(rel, llegadas.paradas, cfg) : null;
    const coma = rxFuelUsaComa(evs);
    const tablas = carnTablas(r, coma);
    const pts = r.puntos;
    const sum = (f) => pts.reduce((a, x) => a + f(x), 0);
    const res = {
        cols: RX_CARN_COL_PUNTOS.slice(), filas: tablas[0].filas, tablas: tablas,
        trozos: rec ? rec.trozos : 0, hechos: rec ? rec.hechas : 0, objetos: (p.lista || []).length, alcance: 'carnada',
        fallos: (rec ? rec.fallos : 0) + (llegadas ? llegadas.errores.length : 0),
        errores: (rec ? rec.errores : []).concat(llegadas ? llegadas.errores : []),
        cacheados: 0, lleno: rec ? rec.lleno : false,
        conSensor: rec ? rec.conDatos : (p.lista || []).length, sinSensor: rec ? (rec.objetos - rec.conDatos) : 0,
        ms: Date.now() - t0,
        // Para la pantalla y el PDF
        carn: true, cfg: cfg, desde: p.desde, hasta: p.hasta, puntos: pts, aislados: r.aislados, llegadas: llegadas ? llegadas.paradas : [],
        verif: verif, analisis: an, coma: coma,
        meta: {
            puntos: pts.length, litrosPuntos: sum((x) => x.litros), eventosPuntos: sum((x) => x.eventos),
            alta: pts.filter((x) => x.nivel === 'Alta').length, media: pts.filter((x) => x.nivel === 'Media').length,
            baja: pts.filter((x) => x.nivel === 'Baja').length,
            eventos: rel.length, litros: rel.reduce((a, e) => a + (e.litros || 0), 0),
            unidadesAfectadas: Object.keys(rel.reduce((a, e) => { a[e.eco] = 1; return a; }, {})).length,
            crudos: an.crudos, descartados: an.desc.length, llegadasN: llegadas ? llegadas.paradas.length : 0,
            llegadasTruncado: llegadas ? llegadas.truncados : 0
        }
    };
    RX_CARN.res = res;
    return res;
}
// ── Mapa del dialogo ────────────────────────────────────────────────────
// Radios reales (30 m) y marcas numeradas por punto, color = sospecha.
function carnMapaDatos() {
    const r = RX_CARN.res;
    if (!r || !r.puntos || !r.puntos.length) return null;
    const lineas = [], marcas = [];
    r.puntos.slice(0, 80).forEach((p) => {
        const c = RX_CARN_COLOR[p.nivel] || '#9e1b24';
        lineas.push({ pts: carnCirculo(p.lat, p.lon, r.cfg.radio), color: c, width: 2.5, opacity: 0.95 });
        marcas.push({ lat: p.lat, lon: p.lon, color: c, radio: 7, num: p.id,
            txt: p.id + ' \u00b7 ' + p.carnada + ' unidades \u00b7 ' + rxFuelFmtN(p.litros, 1, false) + ' L \u00b7 ' + p.nivel });
    });
    if (r.puntos.length <= 12) {
        r.puntos.forEach((p) => {
            p.evs.slice(0, 40).forEach((e) => marcas.push({ lat: e.lat, lon: e.lon, color: '#e53935', radio: 3.5, txt: e.eco + ' \u00b7 ' + rxFuelFmtN(e.litros, 1, false) + ' L' }));
            p.llegadas.slice(0, 80).forEach((l) => marcas.push({ lat: l.lat, lon: l.lon, color: '#1e6fe0', radio: 3, txt: l.eco + ' \u00b7 llegada' }));
        });
    }
    return {
        lineas: lineas, marcas: marcas,
        leyenda: '<span><i style="background:#9e1b24"></i>Alta</span><span><i style="background:#c97324"></i>Media</span>' +
            '<span><i style="background:#2a6dd6"></i>Baja</span><span><i style="background:#e53935"></i>P\u00e9rdida</span>' +
            '<span><i style="background:#1e6fe0"></i>Llegada</span>'
    };
}
// ── Geocercas de Rondo en los puntos ────────────────────────────────────
// Crea un circulo de `radio` m por punto (geocercas de la app, no tocan la
// plataforma) para vigilarlos despues. Devuelve cuantas creo.
function carnCreaGeocercas(puntos, radio, maxN) {
    if (typeof glocGuarda !== 'function' || typeof glocNombreLibre !== 'function') return 0;
    let n = 0;
    const tope = Math.min((puntos || []).length, maxN > 0 ? maxN : 30);
    for (let i = 0; i < tope; i++) {
        const p = puntos[i];
        let existentes = [];
        try { existentes = (APP.zonas || []); } catch (_) { existentes = []; }
        const nombre = glocNombreLibre('Robo ' + p.id + ' ' + p.lat.toFixed(4) + ',' + p.lon.toFixed(4), existentes, []);
        const z = glocGuarda({ n: nombre, t: 3, p: [{ x: p.lon, y: p.lat }], w: Math.max(10, Math.round(radio || 30)) });
        if (z) n++;
    }
    return n;
}
// ── CSV de datos por punto ──────────────────────────────────────────────
// Un archivo con todas las llegadas del entorno y las perdidas de cada punto
// (el "archivo de datos por punto" del informe).
function carnCSVDatos(r) {
    const cols = ['tipo', 'punto', 'unidad', 'latitud', 'longitud', 'distancia_m', 'inicio', 'fin', 'litros', 'minutos', 'ritmo_l_min', 'velocidad_kmh', 'carnada_punto', 'sospecha'];
    const f = (n, d) => (n == null || !isFinite(n)) ? '' : Number(n).toFixed(d);
    const filas = [];
    (r.puntos || []).forEach((p) => {
        filas.push(['punto', p.id, p.unidades.join(' '), f(p.lat, 6), f(p.lon, 6), 0, carnFechaTxt(p.primera), carnFechaTxt(p.ultima),
            f(p.litros, 1), '', '', '', p.carnada, p.nivel + ' (' + p.puntaje + ')']);
        p.evs.forEach((e) => filas.push(['perdida', p.id, e.eco, f(e.lat, 6), f(e.lon, 6), e.dPunto, carnFechaTxt(e.ms0), carnFechaTxt(e.ms1),
            f(e.litros, 2), e.durSeg != null ? f(e.durSeg / 60, 1) : '', (e.litros != null && e.durSeg > 0) ? f(e.litros / (e.durSeg / 60), 1) : '',
            e.vel != null ? f(e.vel, 0) : '', p.carnada, p.nivel + ' (' + p.puntaje + ')']));
        p.llegadas.forEach((l) => filas.push(['llegada', p.id, l.eco, f(l.lat, 6), f(l.lon, 6), l.dPunto, carnFechaTxt(l.t0), carnFechaTxt(l.t1),
            '', l.min, '', '', p.carnada, p.nivel + ' (' + p.puntaje + ')']));
    });
    return rxInfCSVTexto(cols, filas, null);
}
// ── Documento (PDF) ─────────────────────────────────────────────────────
function carnBarrasSVG(pts) {
    if (!pts.length) return '';
    const W = 680, H = 230, mL = 38, mB = 26, mT = 20;
    const max = Math.max.apply(null, pts.map((p) => p.litros)) || 1;
    const bw = Math.min(40, (W - mL - 10) / pts.length * 0.62);
    const paso = (W - mL - 10) / pts.length;
    const escala = (H - mB - mT) / max;
    let g = '';
    [0, 0.25, 0.5, 0.75, 1].forEach((k) => {
        const y = (H - mB - k * max * escala).toFixed(1);
        g += '<line x1="' + mL + '" x2="' + (W - 6) + '" y1="' + y + '" y2="' + y + '" stroke="#e6e8ee"/>' +
            '<text x="' + (mL - 5) + '" y="' + (+y + 3) + '" text-anchor="end" font-size="8.5" fill="#6b7280">' + Math.round(k * max) + '</text>';
    });
    pts.forEach((p, i) => {
        const h = Math.max(1, p.litros * escala);
        const x = mL + i * paso + (paso - bw) / 2;
        g += '<rect x="' + x.toFixed(1) + '" y="' + (H - mB - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
            '" fill="' + (RX_CARN_COLOR[p.nivel] || '#9e1b24') + '"/>' +
            '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - mB - h - 4).toFixed(1) + '" text-anchor="middle" font-size="8.5" fill="#1c2030">' + p.litros.toFixed(1) + '</text>' +
            '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="9" fill="#3a4050">' + esc(p.id) + '</text>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="font-family:Segoe UI,Arial,sans-serif">' + g + '</svg>';
}
// Mapa centrado en un punto: anillo de 30 m (rojo), 300 m (granate), 1 km
// (gris); azul = llegadas, rojo = perdidas con sus litros.
function carnMapaPunto(p, W, H, radio) {
    const lineas = [
        { pts: carnCirculo(p.lat, p.lon, radio || 30), color: '#d32f2f', width: 2 },
        { pts: carnCirculo(p.lat, p.lon, 300, 48), color: '#7b1b24', width: 1, opacity: 0.8 },
        { pts: carnCirculo(p.lat, p.lon, 1000, 64), color: '#8a8f9a', width: 1, opacity: 0.8 }
    ];
    const marcas = [];
    p.llegadas.slice(0, 120).forEach((l) => marcas.push({ lat: l.lat, lon: l.lon, color: 'rgba(30,111,224,.78)', radio: 5, txt: l.eco }));
    p.evs.slice(0, 40).forEach((e) => marcas.push({ lat: e.lat, lon: e.lon, color: '#c62828', radio: 4.5, txt: e.eco, num: rxFuelFmtN(e.litros, 0, false) + ' L' }));
    marcas.push({ lat: p.lat, lon: p.lon, color: '#850D22', radio: 3, txt: p.id });
    return rxMiniMapaHTML({ lineas: lineas, marcas: marcas }, W || 560, H || 330);
}
function carnNivelBadge(nv) {
    const c = RX_CARN_COLOR[nv] || '#555';
    return '<span style="display:inline-block;padding:0 7px;border-radius:8px;font-size:8.6px;font-weight:700;border:1px solid ' + c + ';color:' + c + '">' + esc(nv) + '</span>';
}
// Texto sobre el entorno, a partir de lo que se sabe (no se inventa nada).
function carnLecturaEntorno(p) {
    const partes = [];
    if (p.zona) partes.push('cae dentro de la geocerca "' + p.zona + '"');
    else partes.push('no cae dentro de ninguna geocerca conocida de la plataforma');
    const T = { carretera: 'sobre una v\u00eda de comunicaci\u00f3n (carretera, camino o acotamiento)', poblado: 'en una zona poblada o urbana',
        rural: 'en campo o zona rural', patio: 'en una instalaci\u00f3n propia (patio, planta o base)', prueba: 'en una geocerca de prueba',
        desconocido: 'con entorno desconocido' };
    partes.push(T[p.entorno] || ('entorno ' + p.entorno));
    return partes.join(', ');
}
function carnHTML(r) {
    const m = r.meta, pts = r.puntos, cfg = r.cfg;
    const kpi = (n, s) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(s) + '</span></div>';
    const L1 = (n) => rxInfFmt(Math.round(n * 10) / 10);
    // El periodo real de la ejecucion (los chips de rango no rellenan las fechas).
    const fSeg = (t) => { try { return rxFuelFecha(t).slice(0, 16); } catch (_) { return ''; } };
    const periodo = (r.desde && r.hasta) ? (fSeg(r.desde) + ' \u2192 ' + fSeg(r.hasta)) : ((RX_INF.desde || '') + ' \u2192 ' + (RX_INF.hasta || 'hoy'));
    const top = pts[0] || null;
    const extra = '.pg{page-break-before:always}.dos{display:flex;gap:14px;align-items:flex-start}.dos>div{flex:1 1 50%;min-width:0}' +
        '.big{font:700 15px Consolas,monospace;color:#850D22;margin:0 0 2px}ul.pl{margin:6px 0 10px 16px;padding:0;font-size:10.2px;line-height:1.55}' +
        'ul.pl li{margin:0 0 5px}.dato{display:flex;justify-content:space-between;border-bottom:1px solid #e6e8ee;padding:4px 0;font-size:10px}' +
        '.dato b{color:#1c2030}.dato span{color:#5a6072;text-transform:uppercase;font-size:8.6px;letter-spacing:.4px}';
    const sec = (t, sub) => '<h2 class="seccion">' + esc(t) + (sub ? ' <small style="color:#6b7280;font-weight:400">' + esc(sub) + '</small>' : '') + '</h2>';
    // 1. Portada + lo esencial
    let h = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Convergencia con carnada</title><style>' +
        rxInfEstilo() + extra + '</style></head><body>' +
        rxInfCabecera('Rondo \u00b7 P\u00e9rdidas de combustible', 'Hallazgos de convergencia con unidades carnada',
            'Periodo: <b>' + esc(periodo) + '</b><br>Unidades monitoreadas: <b>' + (r.objetos || 0) + '</b> \u00b7 Eventos de p\u00e9rdida: <b>' + m.eventos +
            '</b> \u00b7 Litros: <b>' + L1(m.litros) + ' L</b><br>Puntos marcados (p\u00e9rdida + convergencia): <b>' + m.puntos +
            '</b> \u00b7 Litros en esos puntos: <b>' + L1(m.litrosPuntos) + ' L</b>') +
        '<div class="kpis">' + kpi(m.puntos, 'Puntos marcados') + kpi(L1(m.litrosPuntos) + ' L', 'P\u00e9rdida en esos puntos') +
        kpi(m.eventosPuntos, 'Eventos con unidad detenida') + kpi(m.alta, 'Con sospecha alta') + '</div>';
    h += sec('Lo esencial', 'Resumen para direcci\u00f3n');
    h += '<ul class="pl"><li>Se marca un punto solo cuando cumple las dos condiciones: hay <b>p\u00e9rdida de combustible registrada</b> y hay <b>convergencia</b> \u2014 ' +
        cfg.minCarnada + ' o m\u00e1s <b>unidades carnada</b> (sensor \u00edntegro, sin alteraci\u00f3n) coincidieron en el mismo punto dentro de <b>' + cfg.radio + ' m</b>.</li>';
    if (top) {
        h += '<li><b>Mayor convergencia:</b> ' + esc(top.id) + ' (' + top.lat.toFixed(5) + ', ' + top.lon.toFixed(5) + '), con <b>' + top.carnada +
            ' unidades carnada</b> y <b>' + top.eventos + ' evento(s)</b> con <b>' + L1(top.litros) + ' L</b>; ' + esc(carnLecturaEntorno(top)) + '. Sospecha ' + esc(top.nivel) + ' (' + top.puntaje + '/9).</li>';
    }
    const mayor = pts.slice().sort((a, b) => b.litros - a.litros).slice(0, 3);
    if (mayor.length > 1) {
        h += '<li>Los puntos de mayor p\u00e9rdida son ' + mayor.map((p) => esc(p.id) + ' (' + L1(p.litros) + ' L)').join(', ') + ': concentran ' +
            L1(mayor.reduce((a, p) => a + p.litros, 0)) + ' L de los ' + L1(m.litrosPuntos) + ' L marcados.</li>';
    }
    if (r.verif && r.verif.total) {
        h += '<li>De los ' + r.verif.total + ' eventos, <b>' + r.verif.coinciden + ' (' + L1(r.verif.pct) + '%)</b> tienen una parada de la misma unidad a ' + cfg.verifM +
            ' m o menos en el historial de la plataforma: dos fuentes que describen el mismo hecho.</li>';
    }
    h += '</ul>';
    // 2. Metodologia
    h += '<div class="pg"></div>' + sec('C\u00f3mo se detect\u00f3', 'Metodolog\u00eda');
    h += '<ul class="pl"><li><b>Base:</b> unidades equipadas con sensor de combustible sin trucar (lectura \u00edntegra). Las que registran p\u00e9rdida estando detenidas en un punto espec\u00edfico se llaman <b>carnada</b>.</li>' +
        '<li><b>Depuraci\u00f3n:</b> de las descargas de la plataforma se descartan los sensores que caen a 0, las unidades en movimiento y las bajadas lentas (consumo, equipo de fr\u00edo o fuga). Se unen IZQ, DER y DIESEL TOTAL: son el mismo evento. De ' + m.crudos +
        ' filas quedan ' + m.eventos + ' p\u00e9rdidas con aspecto de robo (' + m.descartados + ' descartadas).</li>' +
        '<li><b>Triangulaci\u00f3n:</b> las p\u00e9rdidas a ' + cfg.radio + ' m se agrupan; el punto se marca si coincidieron ' + cfg.minCarnada + ' o m\u00e1s unidades distintas' +
        (cfg.llegadas ? ' (perdieron combustible o se detuvieron all\u00ed, seg\u00fan el historial de la plataforma)' : ' con p\u00e9rdida') + '.</li>' +
        '<li><b>Unificaci\u00f3n:</b> los puntos marcados a ' + cfg.unir + ' m o menos entre s\u00ed se presentan como uno solo (mismo tramo operativo).</li>' +
        '<li><b>Sospecha 0-9:</b> entorno (0-2) + recurrencia (0-2) + volumen (0-3) + convergencia (0-2). Alta desde 5, Media desde 3.</li></ul>';
    h += sec('El periodo en n\u00fameros', 'Panorama general');
    h += '<div class="kpis">' + kpi(m.eventos, 'Descargas con la unidad detenida') + kpi(L1(m.litros) + ' L', 'Litros perdidos') +
        kpi(m.unidadesAfectadas, 'Unidades afectadas') + kpi(m.puntos, 'Puntos con convergencia') + kpi(r.aislados.length, 'P\u00e9rdidas sin convergencia') + '</div>';
    const allT = pts.reduce((a, p) => a.concat(p.evs), []);
    const rt = allT.map((e) => (e.durSeg > 0 ? e.litros / (e.durSeg / 60) : null)).filter((x) => x != null);
    h += '<ul class="pl">' + (rt.length ? '<li>Ritmos de <b>' + L1(Math.min.apply(null, rt)) + ' a ' + L1(Math.max.apply(null, rt)) + ' litros por minuto</b> en los puntos marcados.</li>' : '') +
        (allT.some((e) => e.vel != null) ? '<li>Velocidad inicial m\u00e1xima en las descargas de los puntos: <b>' + L1(Math.max.apply(null, allT.map((e) => e.vel || 0))) + ' km/h</b>.</li>' : '') +
        '</ul>';
    if (!pts.length) {
        h += '<div class="vacio">Ning\u00fan punto cumple pérdida + convergencia en este periodo. Prueba un periodo m\u00e1s largo, activa las llegadas del historial o baja el m\u00ednimo de unidades.</div>';
    } else {
        // 3. Hallazgo principal
        h += '<div class="pg"></div>' + sec('El hallazgo principal \u2014 ' + top.id, 'D\u00f3nde se concentra la evidencia');
        h += '<div class="dos"><div>' + carnMapaPunto(top, 360, 300, cfg.radio) + '<div class="mapa-leyenda"><span><i style="background:#d32f2f"></i>' + cfg.radio +
            ' m</span><span><i style="background:#7b1b24"></i>300 m</span><span><i style="background:#8a8f9a"></i>1 km</span><span><i style="background:#1e6fe0"></i>llegadas</span><span><i style="background:#c62828"></i>p\u00e9rdidas</span></div></div><div>' +
            '<div class="big">' + top.lat.toFixed(5) + ', ' + top.lon.toFixed(5) + '</div><p class="muted">' + esc(top.ubi || top.zona || 'Sin direcci\u00f3n') + '</p>' +
            '<div class="dato"><span>Unidades carnada \u2264' + cfg.radio + ' m</span><b>' + top.carnada + '</b></div>' +
            '<div class="dato"><span>Eventos de p\u00e9rdida</span><b>' + top.eventos + '</b></div>' +
            '<div class="dato"><span>Litros perdidos</span><b>' + L1(top.litros) + ' L</b></div>' +
            '<div class="dato"><span>Sospecha</span><b>' + carnNivelBadge(top.nivel) + ' ' + top.puntaje + '/9</b></div>' +
            '<ul class="pl"><li>El punto ' + esc(carnLecturaEntorno(top)) + '.</li>' +
            '<li>' + top.carnada + ' unidades carnada distintas coincidieron ah\u00ed entre ' + esc(carnFechaTxt(top.primera)) + ' y ' + esc(carnFechaTxt(top.ultima)) + '.</li></ul></div></div>';
        // 4. Distribucion geografica
        h += '<div class="pg"></div>' + sec('D\u00f3nde est\u00e1n los ' + pts.length + ' puntos', 'Distribuci\u00f3n geogr\u00e1fica');
        h += rxMiniMapaHTML({ lineas: [], marcas: pts.map((p) => ({ lat: p.lat, lon: p.lon, color: RX_CARN_COLOR[p.nivel] || '#9e1b24', radio: 8, num: p.id, txt: p.id })) }, 700, 430);
        h += '<div class="mapa-leyenda"><span><i style="background:#9e1b24"></i>Sospecha alta</span><span><i style="background:#c97324"></i>Media</span><span><i style="background:#2a6dd6"></i>Baja</span></div>';
        // 5. Tabla
        h += sec('Los ' + pts.length + ' puntos', 'Tabla resumen');
        h += '<table><thead><tr><th>Punto</th><th>Coordenada</th><th>Ubicaci\u00f3n</th><th class="num">Carnada \u2264' + cfg.radio + ' m</th><th class="num">Eventos</th><th class="num">Litros</th><th>Sospecha</th></tr></thead><tbody>' +
            pts.slice(0, 60).map((p) => '<tr><td><b>' + esc(p.id) + '</b></td><td class="mono">' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + '</td><td>' + esc(p.ubi || p.zona || '-') +
                '</td><td class="num">' + p.carnada + '</td><td class="num">' + p.eventos + '</td><td class="num">' + L1(p.litros) + ' L</td><td>' + carnNivelBadge(p.nivel) + '</td></tr>').join('') +
            '<tr><td colspan="5"><b>TOTAL ' + pts.length + ' puntos</b></td><td class="num"><b>' + L1(m.litrosPuntos) + ' L</b></td><td>Alta ' + m.alta + ' \u00b7 Media ' + m.media + ' \u00b7 Baja ' + m.baja + '</td></tr></tbody></table>' +
            '<p class="muted">Los puntos a ' + cfg.unir + ' m o menos entre s\u00ed se presentan como uno solo (mismo tramo operativo).</p>';
        // 6. Volumen
        h += '<div class="pg"></div>' + sec('Volumen por punto', 'Concentraci\u00f3n de la p\u00e9rdida');
        h += '<div class="resumen">' + carnBarrasSVG(pts.slice(0, 40)) + '</div>';
        const t3 = pts.slice().sort((a, b) => b.litros - a.litros).slice(0, 3);
        h += '<p class="muted">Los tres primeros concentran ' + L1(t3.reduce((a, p) => a + p.litros, 0)) + ' L' + (m.litrosPuntos ? ' (' + Math.round(100 * t3.reduce((a, p) => a + p.litros, 0) / m.litrosPuntos) + '% de ' + L1(m.litrosPuntos) + ' L)' : '') + '. El color indica el nivel de sospecha.</p>';
        // 7. Top 3
        h += sec('Los tres de mayor p\u00e9rdida', 'Tres focos');
        h += '<div class="grid2">' + t3.map((p) => '<div>' + carnMapaPunto(p, 220, 200, cfg.radio) + '<p><b>' + esc(p.id) + ' \u00b7 ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + '</b><br>' +
            L1(p.litros) + ' L en <b>' + p.eventos + ' evento(s)</b>' + (p.minMin != null ? ' de ' + Math.round(p.minMin) + (p.maxMin > p.minMin ? ' a ' + Math.round(p.maxMin) : '') + ' min' : '') +
            ' \u00b7 ' + esc(p.ubi || p.zona || '') + ' \u00b7 sospecha ' + esc(p.nivel) + '</p></div>').join('') + '</div>';
        const rep = t3.filter((p) => p.eventos >= 3);
        if (rep.length) {
            h += '<p class="muted">En ' + rep.map((p) => esc(p.id)).join(' y ') + ' la p\u00e9rdida no es un incidente aislado: ' + rep.map((p) => p.eventos).join(' y ') +
                ' descargas repetidas en el mismo punto (' + rep.map((p) => p.dias).join(' y ') + ' d\u00eda(s) distintos). Ese patr\u00f3n es propio de un punto de descarga, no de una fuga.</p>';
        }
        // 8. Patron del entorno
        const altas = pts.filter((p) => p.nivel === 'Alta');
        h += '<div class="pg"></div>' + sec('El patr\u00f3n del entorno', 'Qu\u00e9 tienen en com\u00fan los puntos marcados');
        const porEnt = {};
        altas.forEach((p) => { porEnt[p.entorno] = (porEnt[p.entorno] || 0) + 1; });
        h += '<ul class="pl">' + (altas.length ? '<li>De los ' + altas.length + ' puntos de sospecha alta: ' +
            Object.keys(porEnt).map((k) => porEnt[k] + ' en entorno ' + esc(k)).join(', ') + '.</li>' : '<li>Ning\u00fan punto alcanza sospecha alta.</li>') +
            '<li>' + pts.filter((p) => !p.zona).length + ' de los ' + pts.length + ' puntos caen fuera de toda geocerca de la plataforma; ' + pts.filter((p) => p.zona).length + ' caen dentro de alguna.</li>' +
            (allT.some((e) => e.durSeg != null) ? '<li>Las unidades permanecen detenidas entre <b>' + L1(Math.min.apply(null, allT.filter((e) => e.durSeg != null).map((e) => e.durSeg / 60))) + ' y ' +
                L1(Math.max.apply(null, allT.filter((e) => e.durSeg != null).map((e) => e.durSeg / 60))) + ' minutos</b> en esos puntos.</li>' : '') + '</ul>';
        // 9. Verificacion
        h += sec('Verificaci\u00f3n con el historial', 'Contraste con una segunda fuente');
        if (r.verif && r.verif.total) {
            h += '<div class="kpis">' + kpi(r.verif.coinciden + '/' + r.verif.total, 'Eventos con parada a \u2264' + cfg.verifM + ' m') + kpi(L1(r.verif.pct) + '%', 'Coincidencia') +
                (r.verif.mejor ? kpi(Math.round(r.verif.mejor.d) + ' m', 'Mejor coincidencia') : '') + kpi(m.llegadasN, 'Paradas analizadas') + '</div>' +
                '<p>' + (r.verif.mejor ? 'Coincidencia m\u00e1s exacta: la unidad <b>' + esc(r.verif.mejor.eco) + '</b> estuvo detenida de ' + esc(carnFechaTxt(r.verif.mejor.t0)) + ' a ' + esc(carnFechaTxt(r.verif.mejor.t1)) +
                    ', que es el mismo evento que reporta el sensor (' + L1(r.verif.mejor.litros) + ' L). ' : '') + 'Los puntos se sostienen sobre dos fuentes independientes: el sensor de combustible y el historial de posiciones.</p>' +
                (m.llegadasTruncado ? '<div class="callout">' + m.llegadasTruncado + ' ventana(s) de historial se truncaron por exceso de mensajes: las llegadas pueden estar incompletas.</div>' : '');
        } else {
            h += '<div class="vacio">No se pidieron las llegadas del historial (opci\u00f3n apagada). Act\u00edvala para contrastar cada p\u00e9rdida con las paradas de las unidades y contar las llegadas sin p\u00e9rdida.</div>';
        }
        // 10. Descartando explicaciones
        h += sec('Por qu\u00e9 no es fuga ni error de sensor', 'Descartando explicaciones alternativas');
        h += '<div class="grid2"><div class="callout"><b>' + (allT.some((e) => e.vel != null) ? L1(Math.max.apply(null, allT.map((e) => e.vel || 0))) + ' km/h' : 'Unidad detenida') +
            '</b><br>Las descargas se midieron con la unidad detenida: no es consumo de ruta.</div>' +
            '<div class="callout"><b>' + (rt.length ? L1(Math.min.apply(null, rt)) + ' a ' + L1(Math.max.apply(null, rt)) + ' L/min' : 'Ritmo alto') +
            '</b><br>Una fuga no descarga litros por minuto con el veh\u00edculo inm\u00f3vil.</div>' +
            '<div class="callout"><b>Punto fijo</b><br>La p\u00e9rdida se repite en el mismo lugar con unidades distintas: es un punto de descarga, no un desperfecto.</div>' +
            '<div class="callout"><b>' + m.descartados + ' descartadas</b><br>Ca\u00eddas a 0, unidades en movimiento y bajadas lentas se excluyeron antes de marcar puntos.</div></div>';
        // 11. Conclusiones y acciones
        h += '<div class="pg"></div>' + sec('Conclusiones', 'Qu\u00e9 dicen los datos');
        h += '<ul class="pl"><li>' + m.puntos + ' punto(s) re\u00fanen p\u00e9rdida de combustible y convergencia de unidades carnada: ' + L1(m.litrosPuntos) + ' L en ' + m.eventosPuntos + ' evento(s).</li>' +
            (top ? '<li>El punto cr\u00edtico es ' + esc(top.id) + ' (' + top.carnada + ' unidades, ' + top.eventos + ' evento(s), ' + L1(top.litros) + ' L), ' + esc(carnLecturaEntorno(top)) + '.</li>' : '') +
            '<li>' + m.alta + ' punto(s) con sospecha alta, ' + m.media + ' media y ' + m.baja + ' baja.</li>' +
            '<li>Esto indica <b>probable</b> robo de diesel, no lo prueba: se confirma en campo.</li></ul>';
        h += sec('Acciones y siguientes pasos', 'Qu\u00e9 se propone hacer');
        h += '<ul class="pl"><li><b>Delimitar en campo</b> cada punto marcado y confirmar la propiedad de la franja donde cae.</li>' +
            '<li><b>Revisar c\u00e1maras, accesos y bit\u00e1coras</b> en las fechas de la convergencia' + (top ? ': ' + esc(carnFechaTxt(top.primera)) + ' a ' + esc(carnFechaTxt(top.ultima)) : '') + '.</li>' +
            '<li><b>Ampliar la triangulaci\u00f3n</b> a todas las unidades con sensor \u00edntegro que llegaron a esos puntos para estimar volumen y frecuencia reales.</li>' +
            '<li><b>Vigilar los puntos</b> con geocercas de Rondo (bot\u00f3n "Crear geocercas") para recibir aviso cuando una unidad se detenga ah\u00ed.</li></ul>';
    }
    h += rxInfPie() + '</body></html>';
    return h;
}
/* === END: carnada === */
