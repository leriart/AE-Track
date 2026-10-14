/* ====================== COMBUSTIBLE: DETECCION PROPIA (V8.3) ======================
 * v8.3: algoritmo PROPIO de deteccion de robo/perdida de combustible. Mejora el
 * detector simple de 55 (rxFuelDetecta, "referencia + anti-rebote") con:
 *   - limpieza de la serie con mediana movil 3 y banda de ruido adaptativa (MAD);
 *   - deteccion de mesetas inicial y final (una caida solo cuenta si sale de una
 *     base firme y termina en un nivel firme);
 *   - features por caida (delta, duracion, ritmo, velocidad, motor, estabilidad
 *     de la meseta posterior, banda previa, cercania a un llenado, plausibilidad
 *     por capacidad, entorno de geocerca y recurrencia del punto);
 *   - cruce con las unidades carnada (sensor integro) detenidas en el mismo punto
 *     y tramo horario, reutilizando la triangulacion existente (haversine);
 *   - un VEREDICTO razonado (descarga_no_autorizada | llenado_contiguo |
 *     error_sensor | fuga | ruido) y un puntaje de sospecha 0-9 con los mismos
 *     componentes del informe (entorno 0-2, recurrencia 0-2, volumen 0-3 y
 *     convergencia 0-2).
 *
 * Por que: el detector anterior marcaba como perdida cualquier caida >= 10 L con
 * la unidad parada, y eso produce falsos positivos por picos/escalones del
 * sensor, por salpicaduras (el nivel rebota en segundos) y por llenados
 * contiguos. Aqui se descartan esos casos con evidencia y se deja el robo
 * "firme" solo cuando no hay ninguna salvedad.
 *
 * Todas las funciones son PURAS: sin red, sin DOM y sin estado. No cambian el
 * comportamiento por defecto (se activan con APP.config.combustible.on); sirven
 * al informe de combustible y a su suite (tests/combustible.test.js).
 */
/* === BEGIN: combustible === */
// Veredictos posibles: un evento SIEMPRE cae en uno de estos cinco.
const COMB_VEREDICTOS = ['descarga_no_autorizada', 'llenado_contiguo', 'error_sensor', 'fuga', 'ruido'];
// Tunables por defecto (espejo de APP.config.combustible).
const COMB_DEF = Object.freeze({
    litrosMin: 3,
    ventanaMin: 2,
    ritmoMax: 60,
    radioM: 30,
    reversionMin: 5,
    llenadoMin: 30,
    fugaRitmo: 2,
    fugaMinSeg: 1800,
    capacidadL: 400,
    bandaMin: 0.5,
    bandaK: 3,
    convVentanaMin: 0
});
const COMB_UMBRAL = Object.freeze({ alta: 5, media: 3 });
const COMB_TXT = Object.freeze({
    descarga_no_autorizada: 'Descarga no autorizada',
    llenado_contiguo: 'Llenado contiguo',
    error_sensor: 'Error de sensor',
    fuga: 'Fuga',
    ruido: 'Ruido'
});
const COMB_CSV_COLS = ['veredicto', 'firme', 'candidato', 'delta', 'durSeg', 'ritmo',
    'entorno', 'recurrencia', 'carnada', 'puntaje', 'nivel', 'lat', 'lon', 'geocerca',
    'salvedades', 'evidencia'];
function combNum(v, def) {
    const n = Number(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : (def === undefined ? 0 : def);
}
function combNumOrNull(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'object') {
        if (v.v != null) return combNumOrNull(v.v);
        if (v.n != null) return combNumOrNull(v.n);
        return null;
    }
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
}
function combFmt(v) {
    const n = combNumOrNull(v);
    if (n == null) return '-';
    return String(Math.round(n * 100) / 100);
}
function combOpts(opts) {
    const o = opts || {};
    const out = {};
    Object.keys(COMB_DEF).forEach((k) => { out[k] = (o[k] == null) ? COMB_DEF[k] : combNum(o[k], COMB_DEF[k]); });
    return out;
}
function combMediana(valores) {
    const a = (valores || []).map((v) => combNumOrNull(v)).filter((v) => v != null).sort((x, y) => x - y);
    const n = a.length;
    if (!n) return null;
    const m = Math.floor(n / 2);
    return (n % 2) ? a[m] : (a[m - 1] + a[m]) / 2;
}
// Mediana movil de ventana 3: quita el pico de UN SOLO dato (el ruido tipico del
// sensor de nivel) sin desplazar la rampa de una caida real.
function combMedianaMovil3(serie) {
    const a = (serie || []).map((v) => combNumOrNull(v));
    const out = [];
    for (let i = 0; i < a.length; i++) {
        const win = [];
        for (let j = Math.max(0, i - 1); j <= Math.min(a.length - 1, i + 1); j++) if (a[j] != null) win.push(a[j]);
        out.push(win.length ? combMediana(win) : null);
    }
    return out;
}
// Desviacion absoluta mediana (MAD): robusta ante valores extremos, a diferencia
// de la desviacion estandar. sigma = 1.4826 * MAD es su equivalente gaussiano.
function combMAD(valores) {
    const a = (valores || []).map((v) => combNumOrNull(v)).filter((v) => v != null);
    const med = combMediana(a);
    if (med == null) return { mediana: null, mad: 0, sigma: 0, n: 0 };
    const mad = combMediana(a.map((v) => Math.abs(v - med))) || 0;
    return { mediana: med, mad: mad, sigma: mad * 1.4826, n: a.length };
}
// Banda de ruido adaptativa: centro +- bandaK sigmas (con un minimo). Todo lo que
// quepa dentro de la banda no es una caida, es fluctuacion del sensor.
function combBandaRuido(valores, opts) {
    const o = combOpts(opts);
    const m = combMAD(valores);
    const banda = Math.max(o.bandaMin, o.bandaK * (m.sigma || 0));
    return { centro: (m.mediana == null ? 0 : m.mediana), mad: m.mad, sigma: m.sigma, banda: banda, n: m.n };
}
// Meseta inicial o final: tramo contiguo y estable (dentro de la banda) desde un
// extremo de la serie. Sirve para saber si la caida arranca de una base firme.
function combMeseta(serie, banda, desdeFin) {
    const n = serie.length;
    if (!n) return { desde: 0, hasta: 0, n: 0, nivel: null };
    const b = Math.max(0.001, combNum(banda, 0.5));
    if (!desdeFin) {
        const base = serie[0].nivel;
        let fin = 0;
        for (let i = 0; i < n; i++) { if (Math.abs(serie[i].nivel - base) <= b) fin = i; else break; }
        return { desde: 0, hasta: fin, n: fin + 1, nivel: base };
    }
    const base = serie[n - 1].nivel;
    let ini = n - 1;
    for (let i = n - 1; i >= 0; i--) { if (Math.abs(serie[i].nivel - base) <= b) ini = i; else break; }
    return { desde: ini, hasta: n - 1, n: n - ini, nivel: base };
}
// Limpia y normaliza una serie de nivel y calcula su banda de ruido y sus
// mesetas. La mediana movil va sobre el nivel, no sobre el tiempo.
function combLimpiaSerie(muestras, opts) {
    const o = combOpts(opts);
    // El nivel puede llegar con el nombre del sensor (fuel), como `nivel` o como
    // `value`: se aceptan los tres nombres para no atar el algoritmo a una sola
    // fuente. combNumOrNull ya resuelve los objetos {v:...} de la API.
    const crudo = (m) => combNumOrNull(m.fuel != null ? m.fuel : (m.nivel != null ? m.nivel : m.value));
    const arr = (muestras || [])
        .filter((m) => m && crudo(m) != null && isFinite(Number(m.t)))
        .map((m) => ({
            t: Number(m.t), fuel: crudo(m),
            lat: (m.lat == null ? null : combNum(m.lat)), lon: (m.lon == null ? null : combNum(m.lon)),
            s: (m.s == null ? 0 : combNum(m.s)),
            motor: (m.motor === true || m.motor === false) ? m.motor : null
        }))
        .sort((a, b) => a.t - b.t);
    const nivel = combMedianaMovil3(arr.map((m) => m.fuel));
    const banda = combBandaRuido(nivel, o);
    const serie = arr.map((m, i) => ({
        t: m.t, fuel: m.fuel, nivel: (nivel[i] == null ? m.fuel : nivel[i]),
        lat: m.lat, lon: m.lon, s: m.s, motor: m.motor
    }));
    return {
        serie: serie, banda: banda,
        mesetaIni: combMeseta(serie, banda.banda, false),
        mesetaFin: combMeseta(serie, banda.banda, true)
    };
}
// Si el nivel vuelve a su base poco despues de la caida, fue una salpicadura o
// un rebote del sensor, no una descarga. Devuelve los segundos que tardo.
function combReversion(serie, iFin, nivelIni, banda, o) {
    const lim = combNum(o.reversionMin, COMB_DEF.reversionMin) * 60;
    const t0 = serie[iFin].t;
    const umbral = nivelIni - Math.max(banda, combNum(o.litrosMin, COMB_DEF.litrosMin) / 2);
    for (let j = iFin + 1; j < serie.length; j++) {
        const dt = serie[j].t - t0;
        if (dt > lim) break;
        if (serie[j].nivel >= umbral) return { seg: dt, salpicadura: true };
    }
    return { seg: null, salpicadura: false };
}
// La meseta posterior a la caida se mantiene dentro de una banda? Si rebota mas
// alla de la banda, el nivel no es fiable (salpicadura) y hay que mirarlo.
function combEstablePost(serie, iFin, banda, win) {
    const t0 = serie[iFin].t;
    const vals = [];
    for (let j = iFin; j < serie.length; j++) {
        if (serie[j].t - t0 > win) break;
        vals.push(serie[j].nivel);
    }
    if (vals.length < 2) return true;
    const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    return (mx - mn) <= Math.max(banda * 2, 1);
}
// Caidas candidatas con "referencia + banda": se guarda el ultimo nivel estable
// y, cuando el nivel cae mas de litrosMin fuera de la banda con la unidad
// detenida, se marca la caida y la referencia pasa al nivel bajo (asi una caida
// escalonada se cuenta entera y no se solapa). Para cada caida mide las features.
function combCaidas(limpia, opts) {
    const o = combOpts(opts);
    const serie = limpia.serie;
    const banda = limpia.banda.banda;
    const out = [];
    const win = o.ventanaMin * 60;
    let ref = -1;
    for (let k = 0; k < serie.length; k++) {
        const cur = serie[k];
        if (ref < 0) { ref = k; continue; }
        const r = serie[ref];
        if (cur.s > 3 || r.s > 3) { ref = k; continue; }
        if (cur.nivel >= r.nivel - banda / 2) {
            if (cur.nivel > r.nivel + banda / 2 || (cur.t - r.t) >= win) ref = k;
            continue;
        }
        const dt = cur.t - r.t;
        if (dt <= 0) { ref = k; continue; }
        // Base efectiva de la caida. Con la unidad parada mucho tiempo, o con
        // muestreo disperso (una muestra cada 5 min), la referencia queda fuera
        // de la ventana: la caida empieza en la muestra anterior si esa sigue en
        // el nivel alto. Sin esto se perdia la descarga completa, que es el caso
        // normal (la unidad lleva media hora detenida y despues baja el nivel).
        let base = r, iBase = ref;
        if (dt > win) {
            const prev = serie[k - 1];
            if (prev && (cur.t - prev.t) > 0 && prev.nivel >= r.nivel - banda / 2) { base = prev; iBase = k - 1; }
            else { ref = k; continue; }
        }
        const delta = base.nivel - cur.nivel;
        const dtm = cur.t - base.t;
        if (dtm <= 0) { ref = k; continue; }
        if (delta < o.litrosMin) continue;
        const rev = combReversion(serie, k, base.nivel, banda, o);
        out.push({
            iIni: iBase, iFin: k, tIni: base.t, tFin: cur.t, durSeg: dtm, delta: delta,
            ritmo: (delta / dtm) * 60, velIni: base.s, velFin: cur.s,
            motorIni: base.motor, motorFin: cur.motor, nivelIni: base.nivel, nivelFin: cur.nivel,
            bandaPrev: banda, reversionSeg: rev.seg, salpicadura: rev.salpicadura,
            establePost: combEstablePost(serie, k, banda, win), lat: cur.lat, lon: cur.lon
        });
        ref = k;
    }
    return out;
}
// ── Contexto: entorno de la geocerca y convergencia ──────────────────────────
// Entorno 0-2 segun el NOMBRE de la geocerca (misma escala del informe): campo
// abierto / acotamiento / carretera vale 2 (mas expuesto), calle o poblado 1,
// patio o instalacion propia 0. Una geocerca de PRUEBA se marca aparte: no es un
// punto de operacion y no debe sostener un hallazgo firme.
function combEntorno(geocerca) {
    const n = (typeof norm === 'function')
        ? norm(geocerca)
        : String(geocerca == null ? '' : geocerca).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (!n) return { puntos: 1, tipo: 'desconocido' };
    if (/(TESTEO|PRUEBA|PRUEBAS|TEST\b)/.test(n)) return { puntos: 0, tipo: 'prueba' };
    if (/(GENA|RASTRO|AGENCIA|CEDI|PREDIO|PLANTA|BODEGA|CORRAL|ESTABLO|PATIO|TALLER|GRANJA|DESCARGA|SUCURSAL|BASE)/.test(n)) {
        return { puntos: 0, tipo: 'patio' };
    }
    if (/(CARRETERA|LIBRAMIENTO|AUTOPISTA|ACOTAMIENTO|CAMINO|TERRACERIA|BRECHA|KILOMETRO|MEX-\s*\d|JAL-\s*\d|MEX\s*\d|JAL\s*\d)/.test(n)) {
        return { puntos: 2, tipo: 'carretera' };
    }
    if (/(CALLE|AVENIDA|BOULEVARD|PROLONGACION|FRACC|COLONIA|EJIDO|RANCHO|COMUNIDAD|CONG|BUENAVISTA|BARRIO|CENTRO)/.test(n)) {
        return { puntos: 1, tipo: 'poblado' };
    }
    return { puntos: 1, tipo: 'rural' };
}
// Un llenado es "contiguo" si cae dentro de llenadoMin minutos de la caida: el
// nivel que "baja" ahi es el artefacto de mezclar el repostaje con la caida.
function combLlenadoCerca(tEventoSeg, tLlenadoSeg, opts) {
    const o = combOpts(opts);
    const a = combNumOrNull(tEventoSeg), b = combNumOrNull(tLlenadoSeg);
    if (a == null || b == null) return false;
    return Math.abs(b - a) <= combNum(o.llenadoMin, COMB_DEF.llenadoMin) * 60;
}
// Distancia (m) entre dos coordenadas: fallback local de la triangulacion por si
// haversine no esta disponible (p. ej. al probar el fragmento aislado).
function combDistancia(lat1, lon1, lat2, lon2) {
    const a = combNumOrNull(lat1), b = combNumOrNull(lon1), c = combNumOrNull(lat2), d = combNumOrNull(lon2);
    if (a == null || b == null || c == null || d == null) return null;
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (c - a) * rad, dLon = (d - b) * rad;
    const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
// Convergencia con unidades carnada (sensor integro): unidades DISTINTAS que
// llegaron al mismo punto dentro de radioM (30 m por defecto) y, si se pide, en
// el mismo tramo horario. Reutiliza la triangulacion existente (haversine) para
// la distancia. Devuelve las unidades, cuantas son y los litros que traian.
function combConvergencia(ev, llegadas, opts) {
    const o = combOpts(opts);
    const e = ev || {};
    const lat = combNumOrNull(e.lat), lon = combNumOrNull(e.lon), t = combNumOrNull(e.t);
    const radio = combNum(o.radioM, COMB_DEF.radioM);
    const ventana = combNum(o.convVentanaMin) * 60;
    const vistas = {};
    const unidades = [];
    let litros = 0;
    if (lat == null || lon == null) {
        return { n: 0, unidades: [], litros: 0, radioM: radio, puntos: 0 };
    }
    for (const g of (llegadas || [])) {
        if (!g) continue;
        const glat = combNumOrNull(g.lat), glon = combNumOrNull(g.lon);
        if (glat == null || glon == null) continue;
        let d = null;
        try {
            d = (typeof haversine === 'function') ? haversine(lat, lon, glat, glon) : combDistancia(lat, lon, glat, glon);
        } catch (_) {
            d = combDistancia(lat, lon, glat, glon); /* noop */
        }
        if (d == null || d > radio) continue;
        if (ventana > 0 && t != null) {
            const gt = combNumOrNull(g.t);
            if (gt != null && Math.abs(gt - t) > ventana) continue;
        }
        const u = String(g.unidad == null ? (g.eco == null ? '' : g.eco) : g.unidad).trim();
        const k = u || (glat.toFixed(5) + ',' + glon.toFixed(5));
        if (vistas[k]) continue;
        vistas[k] = 1;
        unidades.push({ unidad: u, lat: glat, lon: glon, m: Math.round(d), t: combNumOrNull(g.t) });
        litros += combNum(g.litros);
    }
    return { n: unidades.length, unidades: unidades, litros: litros, radioM: radio, puntos: combPuntosConvergencia(unidades.length) };
}
// ── Puntaje de sospecha 0-9 ──────────────────────────────────────────────────
function combPuntosVolumen(litros) {
    const l = combNum(litros);
    if (l >= 200) return 3;
    if (l >= 100) return 2;
    if (l >= 50) return 1;
    return 0;
}
function combPuntosRecurrencia(n) {
    const c = combNum(n);
    if (c >= 3) return 2;
    if (c >= 2) return 1;
    return 0;
}
function combPuntosConvergencia(n) {
    const c = combNum(n);
    if (c >= 5) return 2;
    if (c >= 3) return 1;
    return 0;
}
// Suma de los cuatro componentes (entorno 0-2, recurrencia 0-2, volumen 0-3 y
// convergencia 0-2) y su nivel. Tope 9.
function combPuntaje(componentes) {
    const c = componentes || {};
    const partes = {
        entorno: Math.min(2, Math.max(0, combNum(c.entorno))),
        recurrencia: Math.min(2, Math.max(0, combNum(c.recurrencia))),
        volumen: Math.min(3, Math.max(0, combNum(c.volumen))),
        convergencia: Math.min(2, Math.max(0, combNum(c.convergencia)))
    };
    let total = partes.entorno + partes.recurrencia + partes.volumen + partes.convergencia;
    if (total > 9) total = 9;
    const nivel = (total >= COMB_UMBRAL.alta) ? 'Alta' : ((total >= COMB_UMBRAL.media) ? 'Media' : 'Baja');
    return { puntaje: total, nivel: nivel, componentes: partes };
}
// ── Clasificacion con veredicto ──────────────────────────────────────────────
function combEvidencia(veredicto, f, base, salvedades) {
    const p = [];
    p.push('delta ' + combFmt(base.delta) + ' L en ' + combFmt(base.durSeg) + ' s');
    if (base.ritmo != null) p.push('ritmo ' + combFmt(base.ritmo) + ' L/min');
    if (f.reversionSeg != null) p.push('revierte en ' + combFmt(f.reversionSeg) + ' s');
    if (f.entornoTipo) p.push('entorno ' + f.entornoTipo);
    if (f.incoherente) p.push('niveles incoherentes con los viajes');
    if (salvedades && salvedades.length) p.push('salvedad ' + salvedades.join('+'));
    return COMB_TXT[veredicto] + ': ' + p.join('; ');
}
function combVeredicto(veredicto, firme, candidato, salvedades, delta, f, base) {
    return {
        veredicto: veredicto, firme: !!firme, candidato: !!candidato,
        salvedades: salvedades || [], delta: delta,
        evidencia: combEvidencia(veredicto, f, base, salvedades)
    };
}
// Orden de descartes pensado para que gane la explicacion mas simple:
// ruido -> escalon de sensor -> rebote/salpicadura -> llenado contiguo -> fuga ->
// delta imposible -> zona de prueba / niveles incoherentes -> descarga no
// autorizada. Solo la descarga sin salvedades es "firme".
function combClasifica(feat, opts) {
    const o = combOpts(opts);
    const f = feat || {};
    const delta = combNum(f.delta);
    const durSeg = combNum(f.durSeg);
    const ritmo = (f.ritmo == null ? null : combNum(f.ritmo));
    const salvedades = [];
    const base = { delta: delta, durSeg: durSeg, ritmo: ritmo };
    if (delta < combNum(o.litrosMin, COMB_DEF.litrosMin)) {
        return combVeredicto('ruido', false, false, ['delta_bajo'], delta, f, base);
    }
    if (durSeg <= 0 || (durSeg < 5 && ritmo != null && ritmo > combNum(o.ritmoMax, COMB_DEF.ritmoMax))) {
        return combVeredicto('error_sensor', false, true, ['escalon_sensor'], delta, f, base);
    }
    if (f.reversionSeg != null && combNum(f.reversionSeg) < combNum(o.reversionMin, COMB_DEF.reversionMin) * 60) {
        return combVeredicto('error_sensor', false, true, ['rebote_salpicadura'], delta, f, base);
    }
    if (f.llenadoCerca) return combVeredicto('llenado_contiguo', false, true, ['llenado_cercano'], delta, f, base);
    if (ritmo != null && ritmo <= combNum(o.fugaRitmo, COMB_DEF.fugaRitmo) && durSeg >= combNum(o.fugaMinSeg, COMB_DEF.fugaMinSeg)) {
        return combVeredicto('fuga', false, true, [], delta, f, base);
    }
    if (delta > combNum(o.capacidadL, COMB_DEF.capacidadL) * 1.05) {
        return combVeredicto('error_sensor', false, true, ['delta_imposible'], delta, f, base);
    }
    if (f.entornoTipo === 'prueba') salvedades.push('zona_de_prueba');
    if (f.incoherente) salvedades.push('niveles_incoherentes');
    if (salvedades.indexOf('niveles_incoherentes') >= 0) {
        return combVeredicto('error_sensor', false, true, salvedades.concat(['posible_artefacto']), delta, f, base);
    }
    return combVeredicto('descarga_no_autorizada', salvedades.length === 0, true, salvedades, delta, f, base);
}
// ── Evaluacion de un evento (serie o resumen) ────────────────────────────────
// Evalua un evento completo: features -> puntaje -> veredicto. `ev` puede venir
// de combCaidas (con serie) o ser un resumen externo (litros/min/ritmo) como el
// del informe nativo de la plataforma.
function combEvaluaEvento(ev, ctx) {
    const e = ev || {};
    const c = ctx || {};
    const o = combOpts(c.opts || c);
    const delta = combNum(e.delta != null ? e.delta : e.litros);
    const durSeg = combNum(e.durSeg != null ? e.durSeg : (e.min != null ? combNum(e.min) * 60 : 0));
    let ritmo = null;
    if (e.ritmo != null && e.ritmo !== '-' && e.ritmo !== '') {
        ritmo = combNum(e.ritmo);
    } else if (durSeg > 0) {
        ritmo = (delta / durSeg) * 60;
    }
    const geo = (e.geocerca != null ? e.geocerca : c.geocerca);
    const ent = combEntorno(geo);
    const recurrencia = (c.recurrencia != null) ? combNum(c.recurrencia) : combNum(e.recurrencia);
    const carnada = (e.carnada != null) ? combNum(e.carnada)
        : ((e.unidadesCarnada != null) ? combNum(e.unidadesCarnada) : combNum(c.carnada));
    const feat = {
        delta: delta, durSeg: durSeg, ritmo: ritmo,
        reversionSeg: (e.reversionSeg != null) ? combNum(e.reversionSeg) : null,
        salpicadura: !!e.salpicadura,
        establePost: (e.establePost == null ? true : !!e.establePost),
        motorIni: (e.motorIni != null ? e.motorIni : e.motor),
        motorFin: (e.motorFin != null ? e.motorFin : e.motor),
        velIni: combNum(e.velIni), velFin: combNum(e.velFin), bandaPrev: combNum(e.bandaPrev),
        entornoTipo: ent.tipo, entornoPuntos: ent.puntos,
        llenadoCerca: !!e.llenadoCerca, incoherente: !!e.incoherente,
        lat: (e.lat != null ? e.lat : null), lon: (e.lon != null ? e.lon : null),
        t: (e.tFin != null ? e.tFin : e.t)
    };
    const componentes = {
        entorno: ent.puntos,
        recurrencia: combPuntosRecurrencia(recurrencia),
        volumen: combPuntosVolumen(delta),
        convergencia: combPuntosConvergencia(carnada)
    };
    const cls = combClasifica(feat, o);
    const sc = combPuntaje(componentes);
    return {
        veredicto: cls.veredicto, firme: cls.firme, candidato: cls.candidato,
        salvedades: cls.salvedades, evidencia: cls.evidencia,
        delta: delta, durSeg: durSeg, ritmo: ritmo,
        entorno: ent.tipo, entornoPuntos: ent.puntos,
        recurrencia: combNum(recurrencia), carnada: carnada,
        componentes: sc.componentes, puntaje: sc.puntaje, nivel: sc.nivel,
        lat: feat.lat, lon: feat.lon, t: feat.t,
        geocerca: (geo == null ? '' : geo)
    };
}
// Pipeline completo de UNA unidad: limpia la serie, detecta las caidas y evalua
// cada una. `opts.ctx` aporta el contexto (geocerca, recurrencia, carnada,
// llenadoCerca, incoherente).
function combDetecta(muestras, opts) {
    const o = combOpts(opts);
    const limpia = combLimpiaSerie(muestras, o);
    const crudas = combCaidas(limpia, o);
    const ctx = (opts && opts.ctx) || {};
    const out = [];
    for (const c of crudas) out.push(combEvaluaEvento(c, Object.assign({}, ctx, { opts: o })));
    return out;
}
// ── Agregacion por punto y salidas ───────────────────────────────────────────
// Agrega los eventos por punto (coordenada redondeada a ~11 m) para el informe:
// cuantos eventos, cuantos litros, la peor sospecha y el veredicto dominante.
function combAgregaPuntos(eventos, opts) {
    const o = combOpts(opts);
    const dec = (o.dec == null ? 4 : o.dec);
    const map = {};
    for (const e of (eventos || [])) {
        if (!e) continue;
        const lat = combNumOrNull(e.lat), lon = combNumOrNull(e.lon);
        const k = (lat == null ? 's/lat' : lat.toFixed(dec)) + '|' + (lon == null ? 's/lon' : lon.toFixed(dec));
        const pt = map[k] || (map[k] = {
            clave: k, lat: lat, lon: lon, geocerca: e.geocerca || '', eventos: 0,
            litros: 0, carnada: 0, puntajeMax: 0, nivel: 'Baja',
            veredicto: e.veredicto || 'ruido', veredictos: {}
        });
        pt.eventos++;
        pt.litros += combNum(e.delta);
        pt.carnada = Math.max(pt.carnada, combNum(e.carnada));
        pt.veredictos[e.veredicto] = (pt.veredictos[e.veredicto] || 0) + 1;
        if (e.geocerca) pt.geocerca = e.geocerca;
        if (combNum(e.puntaje) > pt.puntajeMax) { pt.puntajeMax = combNum(e.puntaje); pt.nivel = e.nivel || pt.nivel; }
    }
    const out = Object.keys(map).map((k) => {
        const pt = map[k];
        let mejor = pt.veredicto, n = -1;
        Object.keys(pt.veredictos).forEach((v) => { if (pt.veredictos[v] > n) { n = pt.veredictos[v]; mejor = v; } });
        pt.veredicto = mejor;
        return pt;
    });
    out.sort((a, b) => (b.puntajeMax - a.puntajeMax) || (b.litros - a.litros));
    return out;
}
function combCsvCelda(v) {
    const s = String(v == null ? '' : v);
    return '"' + s.replace(/"/g, '""') + '"';
}
// Serializa los eventos evaluados a CSV (una fila por evento). Campos entre
// comillas para que la coma del texto no rompa las columnas.
function combCSV(eventos, opts) {
    const cols = (opts && opts.cols) || COMB_CSV_COLS;
    const filas = [cols.join(',')];
    for (const e of (eventos || [])) {
        if (!e) continue;
        filas.push(cols.map((c) => {
            if (c === 'salvedades') return combCsvCelda((e.salvedades || []).join('+'));
            if (c === 'lat' || c === 'lon') {
                const n = combNumOrNull(e[c]);
                return combCsvCelda(n == null ? '' : n.toFixed(5));
            }
            if (c === 'delta' || c === 'durSeg' || c === 'ritmo' || c === 'puntaje' ||
                c === 'recurrencia' || c === 'carnada') {
                const n = combNumOrNull(e[c]);
                return combCsvCelda(n == null ? '' : (Math.round(n * 100) / 100));
            }
            return combCsvCelda(e[c]);
        }).join(','));
    }
    return filas.join('\n') + '\n';
}
// Resumen de conteos por veredicto (para la cabecera del informe): cuantos
// eventos y cuantos litros en cada categoria, y cuantos firme/candidato.
function combResumen(eventos) {
    const out = { total: 0, litros: 0, firme: 0, candidato: 0, porVeredicto: {} };
    COMB_VEREDICTOS.forEach((v) => { out.porVeredicto[v] = { eventos: 0, litros: 0 }; });
    for (const e of (eventos || [])) {
        if (!e) continue;
        out.total++;
        out.litros += combNum(e.delta);
        if (e.firme) out.firme++;
        if (e.candidato) out.candidato++;
        const v = (COMB_VEREDICTOS.indexOf(e.veredicto) >= 0) ? e.veredicto : 'ruido';
        out.porVeredicto[v].eventos++;
        out.porVeredicto[v].litros += combNum(e.delta);
    }
    return out;
}
/* === END: combustible === */
