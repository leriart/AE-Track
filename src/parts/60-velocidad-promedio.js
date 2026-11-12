    /* ====================== VELOCIDAD PROMEDIO POR UNIDAD ======================
     * Reporte de velocidad media: el operador pega una lista de numeros
     * economicos (uno por linea, con comas o espacios) y elige un periodo de
     * dias. Por cada unidad se baja su historial GPS con messages/load_interval
     * y se calcula:
     *   - distancia recorrida (sin saltos de GPS ni huecos largos de reporte),
     *   - horas en movimiento (tramos por encima del umbral de velocidad),
     *   - velocidad media en movimiento y velocidad media del periodo,
     *   - detalle por dia y velocidad maxima observada.
     *
     * El motor (rxVelCalcula, rxVelResolver, rxVelCSV, rxVelHTML) es puro o
     * recibe sus dependencias por parametro, para probarlo sin red en
     * tests/velocidad-promedio.test.js.
     */
    // Tope de unidades por corrida: una lista pegada por error no debe lanzar
    // cientos de peticiones. El aviso de recorte se muestra en el resumen.
    const RX_VEL_MAX_U = 250;
    // Peticiones simultaneas: el historial de cada unidad es independiente y
    // la plataforma responde bien en paralelo; 4 mantiene la UI agil sin
    // castigar el servidor.
    const RX_VEL_CONC = 4;
    // Periodo maximo: mas dias son mas mensajes por unidad y una espera que el
    // operador no puede justificar en un reporte operativo.
    const RX_VEL_MAX_DIAS = 92;
    // Velocidad por encima de la cual un tramo es un salto del GPS, no un
    // desplazamiento real. El segundo umbral solo aplica cuando ademas se
    // supera la distancia configurada: asi un viaje largo a 130 km/h cuenta y
    // un salto de 4 km en un minuto no.
    const RX_VEL_SALTO_KMH = 250;
    const RX_VEL_SALTO_GRANDE_KMH = 180;
    // Estado de la pantalla (dialog-local, como RX_REND/RX_MAS): los
    // parametros de una consulta puntual no se persisten.
    const RX_VEL = {
        texto: '',                 // lista pegada de numeros economicos
        desde: '', hasta: '',      // fechas YYYY-MM-DD
        velMin: 5,                 // km/h a partir de los cuales cuenta movimiento
        saltoKm: 3,                // saltos de GPS mayores que esto no suman km
        huecoMin: 240,             // huecos de reporte mayores que esto se ignoran
        orden: 'eco', ordenDir: 1, // orden de la tabla de resultados
        res: null,                 // ultimo calculo
        prog: { activo: false, pct: 0, txt: '' },
        _token: null, _busy: false
    };
    // Numero con decimales fijos y coma decimal, como el resto de Rondo.
    function rxVelNum(n, dec) {
        if (n == null || !isFinite(+n)) return '-';
        const d = (dec == null) ? 1 : Math.max(0, Math.min(3, +dec || 0));
        return (+n).toFixed(d).replace('.', ',');
    }
    // Fecha local de un mensaje (segundos epoch) en YYYY-MM-DD. Se usa la hora
    // local del operador: el reporte habla de "dias" de trabajo, no de UTC.
    function rxVelFechaDe(t) {
        const d = new Date((+t || 0) * 1000);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    function rxVelFechaHoy() {
        return rxVelFechaDe(Math.floor(Date.now() / 1000));
    }
    // Suma (o resta) dias a una fecha YYYY-MM-DD sin cruzar zonas horarias.
    function rxVelSumaDias(fecha, delta) {
        const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
        d.setDate(d.getDate() + (Number(delta) || 0));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    // ── Lista pegada: numeros economicos ────────────────────────────────
    // Separa por saltos de linea, comas, punto y coma, barras o espacios.
    // De cada trozo toma las palabras con digitos (un nombre completo pegado
    // como "CAMION 105" tambien encuentra el 105) y descarta etiquetas sueltas
    // como "ECO" o "Unidad". Se conservan los duplicados para poder avisar.
    function rxVelTokens(texto) {
        const out = [];
        const chunks = String(texto == null ? '' : texto).split(/[\n\r,;|/]+/);
        // Encabezados que suelen venir al copiar una lista de una hoja de
        // calculo ("Economico", "Unidad", "Numero"): no son economicos.
        const RUIDO = {
            ECONOMICO: 1, ECONOMICOS: 1, UNIDAD: 1, UNIDADES: 1, ECO: 1, ECOS: 1,
            PLACA: 1, PLACAS: 1, NUMERO: 1, NUMEROS: 1, NUM: 1, NO: 1, N: 1,
            VEHICULO: 1, VEHICULOS: 1, LISTA: 1
        };
        const limpia = (s) => String(s || '').replace(/^[^\w]+|[^\w]+$/g, '');
        for (const chunk of chunks) {
            const s = String(chunk || '').trim();
            if (!s) continue;
            const palabras = s.split(/\s+/);
            for (const palabra of palabras) {
                const w = limpia(palabra);
                if (!w) continue;
                const sinDigito = !/\d/.test(w);
                if (sinDigito) {
                    const clave = rxVelClaveTexto(w).replace(/[^A-Z0-9]+/g, '');
                    // En un trozo con varias palabras solo interesan las que
                    // llevan un numero; los encabezados se descartan siempre.
                    if (palabras.length > 1 || RUIDO[clave]) continue;
                }
                out.push(w);
            }
        }
        return out;
    }
    // Claves de comparacion: texto normalizado (mayusculas, sin acentos),
    // compacto (sin espacios ni guiones) y economico (sin ceros a la izquierda).
    function rxVelClaveTexto(s) {
        try { return String(norm(s) || '').trim(); } catch (_) { return String(s || '').trim().toUpperCase(); }
    }
    function rxVelClaveCompacta(s) {
        return rxVelClaveTexto(s).replace(/[^A-Z0-9]+/g, '');
    }
    function rxVelClaveEco(s) {
        const t = rxVelClaveTexto(s);
        return /^\d+$/.test(t) ? t.replace(/^0+(?=\d)/, '') : rxVelClaveCompacta(s);
    }
    // Indice de la flota: mapas de economico, placa, id y nombre. Se arma una
    // vez por resolucion de la lista (no por cada tecla de busqueda).
    function rxVelIndice(unidades) {
        const idx = {
            eco: new Map(), placa: new Map(), id: new Map(),
            nombre: new Map(), numeros: new Map()
        };
        const meter = (map, clave, u) => {
            if (!clave) return;
            const k = String(clave);
            let arr = map.get(k);
            if (!arr) { arr = []; map.set(k, arr); }
            if (arr.indexOf(u) < 0) arr.push(u);
        };
        const lista = [];
        for (const u of (unidades || [])) {
            if (!u || u.id == null) continue;
            let info = null;
            try { info = parseUnitName(u); } catch (_) { info = null; }
            const nombre = String((info && info.nombre) || u.nm || u.id);
            const eco = String((info && (info.eco || info.placa)) || u.nm || u.id);
            const rec = {
                id: String(u.id), eco: eco, nombre: nombre,
                info: info || { eco: eco, nombre: nombre, clave: eco }
            };
            lista.push(rec);
            meter(idx.eco, rxVelClaveEco((info && info.eco) || ''), rec);
            meter(idx.placa, rxVelClaveCompacta((info && info.placa) || ''), rec);
            meter(idx.id, String(u.id), rec);
            meter(idx.nombre, rxVelClaveTexto(nombre), rec);
            // Numeros dentro del nombre: cubre economicos de 1, 2 o 6+ digitos
            // que parseUnitName no extrae (su patron es de 3 a 5).
            const nums = nombre.match(/\d{1,8}/g) || [];
            for (const n of nums) meter(idx.numeros, rxVelClaveEco(n), rec);
        }
        return idx;
    }
    // Candidatos para un token. Se respeta la prioridad economico -> placa ->
    // id -> nombre exacto -> numero dentro del nombre. Si un mapa devuelve
    // varias unidades, el token es ambiguo y el operador debe aclararlo.
    function rxVelBusca(idx, tok) {
        const t = rxVelClaveTexto(tok);
        const eco = rxVelClaveEco(tok);
        const comp = rxVelClaveCompacta(tok);
        const porEco = idx.eco.get(eco);
        if (porEco && porEco.length) return porEco.slice();
        const porPlaca = idx.placa.get(comp);
        if (porPlaca && porPlaca.length) return porPlaca.slice();
        const porId = idx.id.get(t);
        if (porId && porId.length) return porId.slice();
        const porNombre = idx.nombre.get(t);
        if (porNombre && porNombre.length) return porNombre.slice();
        const porNumero = idx.numeros.get(eco);
        if (porNumero && porNumero.length) return porNumero.slice();
        // Token con prefijo ("ECO-105", "CAMION105"): se intenta el numero
        // como economico, que es lo que el operador quiso pegar.
        const m = String(tok || '').match(/(\d{1,8})/);
        if (m) {
            const n = rxVelClaveEco(m[1]);
            const porEcoNum = idx.eco.get(n);
            if (porEcoNum && porEcoNum.length) return porEcoNum.slice();
            const porNum2 = idx.numeros.get(n);
            if (porNum2 && porNum2.length) return porNum2.slice();
        }
        return [];
    }
    // Resuelve la lista pegada contra la flota. Devuelve las unidades en el
    // orden en que se pegaron, las que no existen y las ambiguas (con los
    // economicos candidatos) para que el operador corrija la lista.
    function rxVelResolver(unidades, texto) {
        const tokens = rxVelTokens(texto);
        const idx = rxVelIndice(unidades);
        const ok = [], no = [], amb = [];
        const vistos = new Set();
        for (const tok of tokens) {
            const claveToken = 't:' + rxVelClaveTexto(tok);
            if (vistos.has(claveToken)) continue;
            vistos.add(claveToken);
            const cands = rxVelBusca(idx, tok);
            if (cands.length === 1) {
                const u = cands[0];
                const claveUni = 'u:' + u.id;
                if (!vistos.has(claveUni)) {
                    vistos.add(claveUni);
                    ok.push({ token: tok, id: u.id, eco: u.eco, nombre: u.nombre, info: u.info });
                }
            } else if (cands.length > 1) {
                amb.push({ token: tok, candidatos: cands.map((u) => u.eco) });
            } else {
                no.push(tok);
            }
        }
        return { tokens: tokens.length, unidades: ok, noEncontradas: no, ambiguas: amb };
    }
    // ── Calculo puro del promedio ───────────────────────────────────────
    // Recibe puntos {t, lat, lon, s} ordenados o no, y devuelve kilometros,
    // minutos en movimiento, minutos con reportes y las velocidades medias.
    // Un tramo cuenta como movimiento si su velocidad media supera velMin.
    // Los saltos de GPS (distancia grande a velocidad anormal) no suman
    // distancia y los huecos de reporte mayores a huecoMin no suman tiempo
    // (la unidad pudo estar apagada o sin cobertura: contarlos como
    // "detenida" hundiria la media).
    function rxVelCalcula(puntos, opts) {
        const o = opts || {};
        const velMin = (o.velMin != null && isFinite(+o.velMin)) ? Math.max(0, +o.velMin) : 5;
        const saltoM = ((o.saltoKm != null && isFinite(+o.saltoKm)) ? Math.max(0, +o.saltoKm) : 3) * 1000;
        const huecoSeg = ((o.huecoMin != null && isFinite(+o.huecoMin)) ? Math.max(0, +o.huecoMin) : 240) * 60;
        const pts = (puntos || []).filter((p) => p && isFinite(+p.t) && isFinite(+p.lat) && isFinite(+p.lon))
            .map((p) => ({
                t: +p.t, lat: +p.lat, lon: +p.lon,
                s: (p.s != null && isFinite(+p.s)) ? +p.s : null
            }))
            .sort((a, b) => a.t - b.t);
        const res = {
            muestras: pts.length, km: 0, minMov: 0, minCubierto: 0,
            velMov: 0, velPeriodo: 0, velMax: 0, saltos: 0, huecos: 0,
            tIni: pts.length ? pts[0].t : 0, tFin: pts.length ? pts[0].t : 0,
            dias: []
        };
        if (!pts.length) return res;
        const dias = new Map();
        const bucket = (fecha) => {
            let b = dias.get(fecha);
            if (!b) {
                b = { fecha: fecha, km: 0, minMov: 0, minCubierto: 0, muestras: 0, velMax: 0 };
                dias.set(fecha, b);
            }
            return b;
        };
        let maxSeg = 0;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const dt = b.t - a.t;
            if (!(dt > 0)) continue;
            res.tFin = b.t;
            const bb = bucket(rxVelFechaDe(b.t));
            bb.muestras++;
            if (b.s != null && b.s > bb.velMax) bb.velMax = b.s;
            if (b.s != null && b.s > res.velMax) res.velMax = b.s;
            // Hueco de reporte: no suma tiempo ni distancia, pero si queda
            // como dia con muestras para que el detalle diario sea honesto.
            if (huecoSeg > 0 && dt > huecoSeg) { res.huecos++; continue; }
            res.minCubierto += dt / 60;
            bb.minCubierto += dt / 60;
            const d = rxDistM(a.lat, a.lon, b.lat, b.lon);
            if (!isFinite(+d) || d < 0) { res.saltos++; continue; }
            const kmh0 = (d / 1000) / (dt / 3600);
            // Un salto de GPS no es solo "mucha distancia": con reportes
            // espaciados un tramo largo puede ser un viaje real. Se descarta
            // cuando la velocidad implicita es imposible o cuando supera el
            // umbral de distancia Y sigue siendo demasiado rapido.
            const esSalto = (kmh0 > RX_VEL_SALTO_KMH) ||
                (saltoM > 0 && d > saltoM && kmh0 > RX_VEL_SALTO_GRANDE_KMH);
            if (esSalto) { res.saltos++; continue; }
            const km = d / 1000;
            const kmh = km / (dt / 3600);
            res.km += km;
            bb.km += km;
            if (kmh > maxSeg) maxSeg = kmh;
            if (kmh >= velMin) {
                res.minMov += dt / 60;
                bb.minMov += dt / 60;
            }
        }
        if (maxSeg > res.velMax) res.velMax = maxSeg;
        res.velMov = res.minMov > 0 ? (res.km / (res.minMov / 60)) : 0;
        res.velPeriodo = res.minCubierto > 0 ? (res.km / (res.minCubierto / 60)) : 0;
        res.dias = Array.from(dias.values()).map((b) => Object.assign(b, {
            velMov: b.minMov > 0 ? (b.km / (b.minMov / 60)) : 0,
            velPeriodo: b.minCubierto > 0 ? (b.km / (b.minCubierto / 60)) : 0
        })).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
        return res;
    }
    // Totales de la tabla: suma ponderada (km / horas), no el promedio simple
    // de las velocidades, para que una unidad con dos viajes no pese lo mismo
    // que una con veinte.
    function rxVelTotales(filas) {
        const t = {
            total: 0, conDatos: 0, sinDatos: 0, errores: 0, truncadas: 0,
            saltos: 0, huecos: 0,
            km: 0, minMov: 0, minCubierto: 0, velMov: 0, velPeriodo: 0
        };
        for (const f of (filas || [])) {
            if (!f) continue;
            t.total++;
            if (f.estado === 'error') { t.errores++; continue; }
            if (f.estado === 'sin_datos') { t.sinDatos++; continue; }
            t.conDatos++;
            if (f.truncado) t.truncadas++;
            t.km += +f.km || 0;
            t.minMov += +f.minMov || 0;
            t.minCubierto += +f.minCubierto || 0;
            t.saltos += +f.saltos || 0;
            t.huecos += +f.huecos || 0;
        }
        t.velMov = t.minMov > 0 ? (t.km / (t.minMov / 60)) : 0;
        t.velPeriodo = t.minCubierto > 0 ? (t.km / (t.minCubierto / 60)) : 0;
        return t;
    }
    // Dias con datos de una fila. `dias` puede ser el detalle diario (array)
    // o un numero ya contado; se aceptan ambos para no romper resultados
    // guardados ni pruebas parciales.
    function rxVelDiasDe(f) {
        if (!f) return 0;
        if (Array.isArray(f.dias)) return f.dias.length;
        return +f.dias || 0;
    }
    // Orden de la tabla (puro, para probarlo sin DOM).
    function rxVelOrdenar(filas, campo, dir) {
        const d = (Number(dir) < 0) ? -1 : 1;
        const num = (f, c) => {
            if (c === 'dias') return rxVelDiasDe(f);
            if (c === 'km') return +f.km || 0;
            if (c === 'mov') return +f.minMov || 0;
            if (c === 'periodo') return +f.velPeriodo || 0;
            if (c === 'max') return +f.velMax || 0;
            return +f.velMov || 0;
        };
        return (filas || []).slice().sort((a, b) => {
            if (campo === 'eco') {
                return String(a.eco || '').localeCompare(String(b.eco || ''), 'es', { numeric: true }) * d;
            }
            const va = num(a, campo), vb = num(b, campo);
            if (va !== vb) return (va - vb) * d;
            return String(a.eco || '').localeCompare(String(b.eco || ''), 'es', { numeric: true });
        });
    }
    // ── Salidas ─────────────────────────────────────────────────────────
    function rxVelNombreArchivo(desde, hasta) {
        const limpia = (s) => String(s || '').replace(/[^\d-]/g, '');
        return 'rondo_velocidad_promedio_' + limpia(desde) + '_a_' + limpia(hasta) + '.csv';
    }
    // CSV en dos bloques: resumen por unidad y detalle por dia. El detalle
    // permite ver si la media sale de un viaje largo o de muchos dias cortos.
    function rxVelCSV(res) {
        const r = res || {};
        const tot = r.resumen || rxVelTotales(r.filas);
        const cols = ['Econ\u00f3mico', 'Unidad', 'Estado', 'D\u00edas con datos', 'Distancia km',
            'Horas en movimiento', 'Vel. media en movimiento km/h',
            'Vel. media del periodo km/h', 'Vel. m\u00e1xima km/h', 'Muestras', 'Detalle'];
        const filas = (r.filas || []).map((f) => [
            f.eco, f.nombre,
            f.estado === 'error' ? 'Error' : (f.estado === 'sin_datos' ? 'Sin datos' : (f.truncado ? 'Truncado' : 'OK')),
            rxVelDiasDe(f), rxVelNum(f.km, 2), rxVelNum((+f.minMov || 0) / 60, 2),
            rxVelNum(f.velMov, 1), rxVelNum(f.velPeriodo, 1),
            rxVelNum(f.velMax, 1), f.muestras || 0,
            f.estado === 'error'
                ? String(f.error || '').replace(/\s+/g, ' ')
                : (f.truncado ? 'Historial truncado en el periodo' : '')
        ]);
        const meta = [
            'Velocidad promedio por unidad',
            'Periodo: ' + (r.desde || '') + ' a ' + (r.hasta || ''),
            'Movimiento sobre: ' + rxVelNum(r.velMin, 1) + ' km/h',
            'Saltos de GPS ignorados: distancia > ' + rxVelNum(r.saltoKm, 1) + ' km con velocidad anormal',
            'Huecos de reporte ignorados: m\u00e1s de ' + rxVelNum(r.huecoMin, 0) + ' min',
            'Unidades con datos: ' + tot.conDatos + ' de ' + tot.total,
            'Distancia total: ' + rxVelNum(tot.km, 2) + ' km',
            'Velocidad media en movimiento: ' + rxVelNum(tot.velMov, 1) + ' km/h',
            'Velocidad media del periodo: ' + rxVelNum(tot.velPeriodo, 1) + ' km/h'
        ];
        if (tot.truncadas) meta.push('Unidades con historial truncado: ' + tot.truncadas);
        if (tot.saltos || tot.huecos) meta.push('Tramos descartados: ' + tot.saltos + ' saltos de GPS, ' + tot.huecos + ' huecos');
        if (r.noEncontradas && r.noEncontradas.length) meta.push('No encontrados: ' + r.noEncontradas.join(', '));
        if (r.ambiguas && r.ambiguas.length) meta.push('Ambiguos: ' + r.ambiguas.map((a) => a.token).join(', '));
        let txt = rxInfCSVTexto(cols, filas, meta);
        const dias = [];
        for (const f of (r.filas || [])) {
            if (!Array.isArray(f.dias)) continue;
            for (const d of f.dias) {
                dias.push([
                    f.eco, d.fecha, rxVelNum(d.km, 2), rxVelNum(d.minMov / 60, 2),
                    rxVelNum(d.minCubierto / 60, 2), rxVelNum(d.velMov, 1),
                    rxVelNum(d.velPeriodo, 1), d.muestras || 0
                ]);
            }
        }
        if (dias.length) {
            txt += '\n\n' + rxInfCSVTexto(
                ['Econ\u00f3mico', 'Fecha', 'Distancia km', 'Horas en movimiento',
                    'Horas con reportes', 'Vel. media en movimiento km/h',
                    'Vel. media del periodo km/h', 'Muestras'],
                dias, ['Detalle por d\u00eda']);
        }
        return txt;
    }
    // PDF imprimible: KPIs, grafica de barras de las velocidades medias y las
    // tablas de detalle. Usa el maquetado comun de los informes de Rondo.
    function rxVelHTML(res) {
        const r = res || {};
        const tot = r.resumen || rxVelTotales(r.filas);
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const orden = rxVelOrdenar(r.filas, 'vel', -1).filter((f) => f.estado === 'ok');
        const maxVel = orden.reduce((m, f) => Math.max(m, +f.velMov || 0), 0) || 1;
        const barras = orden.slice(0, 24).map((f) => {
            const v = +f.velMov || 0;
            const pct = v > 0 ? Math.max(2, Math.min(100, Math.round((v / maxVel) * 100))) : 0;
            return '<div class="rxv-bar"><b>' + esc(f.eco) + '</b>' +
                '<span class="rxv-track"><i style="width:' + pct + '%"></i></span>' +
                '<em>' + esc(rxVelNum(f.velMov, 1)) + ' km/h</em></div>';
        }).join('');
        const filas = (r.filas || []).map((f) => [
            '<b>' + esc(f.eco) + '</b>' + (f.nombre ? '<br><span class="muted">' + esc(f.nombre) + '</span>' : ''),
            f.estado === 'error'
                ? '<span class="bad">Error</span><br><span class="muted">' + esc(typeof rxInfExplicaError === 'function' ? rxInfExplicaError(f.error) : f.error) + '</span>'
                : (f.estado === 'sin_datos' ? '<span class="warn">Sin datos</span>'
                    : (f.truncado ? '<span class="warn">Truncado</span>' : '<span class="ok">OK</span>')),
            esc(String(rxVelDiasDe(f))),
            esc(rxVelNum(f.km, 1)),
            esc(rxVelNum((+f.minMov || 0) / 60, 1)),
            esc(rxVelNum(f.velMov, 1)),
            esc(rxVelNum(f.velPeriodo, 1)),
            esc(rxVelNum(f.velMax, 1)),
            esc(String(f.muestras || 0))
        ]);
        const dias = [];
        for (const f of (r.filas || [])) {
            if (!Array.isArray(f.dias)) continue;
            for (const d of f.dias) {
                dias.push([
                    esc(f.eco), esc(d.fecha), esc(rxVelNum(d.km, 1)),
                    esc(rxVelNum(d.minMov / 60, 1)), esc(rxVelNum(d.minCubierto / 60, 1)),
                    esc(rxVelNum(d.velMov, 1)), esc(rxVelNum(d.velPeriodo, 1)),
                    esc(String(d.muestras || 0))
                ]);
            }
        }
        const avisoDias = dias.length > 600
            ? '<p class="muted">Se listan los primeros 600 d\u00edas; el CSV lleva todos.</p>' : '';
        const noEncontradas = (r.noEncontradas && r.noEncontradas.length)
            ? '<p><b>N\u00fameros sin coincidencia:</b> ' + esc(r.noEncontradas.join(', ')) + '</p>' : '';
        const ambiguas = (r.ambiguas && r.ambiguas.length)
            ? '<p><b>N\u00fameros ambiguos:</b> ' + esc(r.ambiguas.map((a) => a.token + ' (' + a.candidatos.join(', ') + ')').join('; ')) + '</p>' : '';
        const estilo = '<style>' + rxInfEstilo() +
            '.rxv-bars{margin:2px 0 12px}' +
            '.rxv-bar{display:flex;align-items:center;gap:7px;margin:2px 0;font-size:9.2px}' +
            '.rxv-bar b{width:74px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.rxv-track{flex:1;height:8px;background:#eef1f6;border-radius:5px;overflow:hidden}' +
            '.rxv-track i{display:block;height:100%;background:#850D22;border-radius:5px}' +
            '.rxv-bar em{width:58px;text-align:right;font-style:normal;font-weight:700;color:#3a4050}' +
            '</style>';
        return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Velocidad promedio ' +
            esc(r.desde || '') + ' a ' + esc(r.hasta || '') + '</title>' + estilo + '</head><body>' +
            rxInfCabecera('Rondo', 'Velocidad promedio por unidad',
                'Periodo: <b>' + esc(r.desde || '') + '</b> a <b>' + esc(r.hasta || '') + '</b><br>' +
                'Movimiento sobre <b>' + esc(rxVelNum(r.velMin, 1) + ' km/h') + '</b>') +
            '<div class="kpis">' +
            kpi(tot.conDatos + ' de ' + tot.total, 'Unidades con datos') +
            kpi(rxVelNum(tot.km, 1) + ' km', 'Distancia total') +
            kpi(rxVelNum(tot.minMov / 60, 1) + ' h', 'Tiempo en movimiento') +
            kpi(rxVelNum(tot.velMov, 1), 'Velocidad media km/h') +
            kpi(rxVelNum(tot.velPeriodo, 1), 'Media del periodo km/h') +
            '</div>' +
            '<div class="callout"><b>C\u00f3mo se calcula.</b> La velocidad media en movimiento divide los kil\u00f3metros ' +
            'recorridos entre las horas con el veh\u00edculo en movimiento (tramos por encima de ' +
            esc(rxVelNum(r.velMin, 1)) + ' km/h). La media del periodo reparte esos mismos kil\u00f3metros entre ' +
            'todo el tiempo con reportes. No suman los saltos de GPS (distancia mayor a ' + esc(rxVelNum(r.saltoKm, 1)) +
            ' km con velocidad anormal) ni los huecos de reporte mayores a ' + esc(rxVelNum(r.huecoMin, 0)) + ' minutos.' +
            ((tot.saltos || tot.huecos)
                ? (' Se descartaron ' + tot.saltos + ' saltos y ' + tot.huecos + ' huecos.')
                : '') + '</div>' +
            (barras ? '<h2 class="seccion">1. Velocidades medias</h2><div class="rxv-bars">' + barras + '</div>' : '') +
            '<h2 class="seccion">' + (barras ? '2' : '1') + '. Detalle por unidad</h2>' +
            rxInfTabla(['Unidad', 'Estado', 'D\u00edas', 'km', 'Horas mov.', 'Vel. media km/h', 'Vel. periodo km/h', 'Vel. m\u00e1xima km/h', 'Muestras'], filas) +
            (dias.length
                ? '<h2 class="seccion">' + (barras ? '3' : '2') + '. Detalle por d\u00eda</h2>' + avisoDias +
                  rxInfTabla(['Unidad', 'Fecha', 'km', 'Horas mov.', 'Horas con reportes', 'Vel. media km/h', 'Vel. periodo km/h', 'Muestras'], dias.slice(0, 600))
                : '') +
            (noEncontradas ? '<h2 class="seccion">Notas</h2>' + noEncontradas + ambiguas : (ambiguas ? '<h2 class="seccion">Notas</h2>' + ambiguas : '')) +
            rxInfPie() + '</body></html>';
    }
    // Ejecuta el calculo de cada unidad con un pool pequeno. `carga` se puede
    // inyectar en las pruebas; en produccion es rxGeoInfFetchMensajes (54).
    async function rxVelCorre(unidades, opts, onProg, token, carga) {
        const lista = unidades || [];
        const o = opts || {};
        const out = new Array(lista.length);
        const pide = (typeof carga === 'function') ? carga : rxGeoInfFetchMensajes;
        let idx = 0, hechas = 0;
        const obrero = async () => {
            while (idx < lista.length) {
                if (token && token.cancelado) return;
                const i = idx++;
                const u = lista[i] || {};
                const fila = {
                    eco: u.eco || u.id || '', nombre: u.nombre || u.eco || '',
                    estado: 'sin_datos', error: '', km: 0, minMov: 0, minCubierto: 0,
                    velMov: 0, velPeriodo: 0, velMax: 0, muestras: 0, dias: [], truncado: false
                };
                if (onProg) onProg(hechas, lista.length, u.eco || String(u.id || ''));
                try {
                    const got = await pide(u.id, o.desde, o.hasta, token);
                    if (got && got.error && got.error !== 'cancelado') throw new Error(got.error);
                    const pts = rxRendPuntos((got && got.msgs) || []);
                    const calc = rxVelCalcula(pts, o);
                    Object.assign(fila, calc, { muestras: pts.length, truncado: !!(got && got.truncado) });
                    fila.estado = pts.length >= 2 ? 'ok' : 'sin_datos';
                } catch (e) {
                    fila.estado = 'error';
                    fila.error = (e && e.message) || String(e);
                }
                out[i] = fila;
                hechas++;
                try { await rxGeoInfYield(); } catch (_) { /* noop */ }
            }
        };
        const n = Math.max(1, Math.min(RX_VEL_CONC, lista.length || 1));
        const tareas = [];
        for (let k = 0; k < n; k++) tareas.push(obrero());
        await Promise.all(tareas);
        if (onProg && !(token && token.cancelado)) onProg(hechas, lista.length, '');
        return out.filter(Boolean);
    }
    // ── Dialogo ─────────────────────────────────────────────────────────
    function rxVelUnidades() {
        const out = [];
        for (const u of (APP.unidades || [])) {
            if (!u || u.id == null) continue;
            let info = null;
            try { info = parseUnitName(u); } catch (_) { info = null; }
            out.push({
                id: String(u.id),
                eco: (info && (info.eco || info.placa)) || u.nm || String(u.id),
                nombre: String((info && info.nombre) || u.nm || u.id),
                info: info
            });
        }
        out.sort((a, b) => String(a.eco).localeCompare(String(b.eco), 'es', { numeric: true }));
        return out;
    }
    function abrirVelocidadPromedio() {
        const hoy = rxVelFechaHoy();
        if (!RX_VEL.hasta) RX_VEL.hasta = hoy;
        if (!RX_VEL.desde) RX_VEL.desde = rxVelSumaDias(hoy, -6);
        abrirDialogo({
            icon: UIS.speed,
            titulo: 'Velocidad promedio por unidad',
            ancho: 780,
            okText: 'Cerrar',
            cancel: false,
            html: '<div class="rgi-tool"><div id="rxvel-box"></div></div>',
            onOpen: (el) => {
                const box = el.querySelector('#rxvel-box');
                // El memo de setHtml es por id y al reabrir el nodo es nuevo.
                // Sin invalidar, el cuerpo quedaba vacio (mismo cuidado que en
                // Rendimientos y Recorridos masivos).
                try { invalidarHtml('rxvel-box'); } catch (_) { /* noop */ }
                if (RX_VEL._token) RX_VEL._token.cancelado = true;
                RX_VEL._busy = false;
                RX_VEL._token = null;
                // Cerrar el dialogo tambien cancela una corrida en curso: no
                // tiene sentido seguir pidiendo historial para una pantalla
                // que ya no se ve.
                try {
                    const cerrar = el.querySelector('.dlg-ok');
                    if (cerrar) cerrar.addEventListener('click', () => {
                        if (RX_VEL._token) RX_VEL._token.cancelado = true;
                    });
                } catch (_) { /* noop */ }
                const US = rxVelUnidades();
                const matchDe = () => rxVelResolver(APP.unidades, RX_VEL.texto);
                const chipLista = (txt, tit) => '<span class="rxvel-chip"' +
                    (tit ? ' title="' + esc(tit) + '"' : '') + '>' + esc(txt) + '</span>';
                const matchHtml = (m) => {
                    if (!US.length) {
                        return '<span class="rxvel-hint">La flota a\u00fan no est\u00e1 cargada. Espera el primer refresco de Rondo y vuelve a abrir el reporte.</span>';
                    }
                    if (!m.tokens) {
                        return '<span class="rxvel-hint">Pega los n\u00fameros econ\u00f3micos: uno por l\u00ednea, separados por coma o espacio.</span>';
                    }
                    let h = '<span class="rxvel-tag ok">' + m.unidades.length + ' encontrada(s)</span>';
                    if (m.noEncontradas.length) {
                        const resto = m.noEncontradas.length - 16;
                        h += '<span class="rxvel-tag no">' + m.noEncontradas.length + ' sin coincidencia</span>' +
                            m.noEncontradas.slice(0, 16).map((t) => chipLista(t, 'No est\u00e1 en la flota cargada')).join('') +
                            (resto > 0 ? '<span class="rxvel-chip">+' + resto + '</span>' : '');
                    }
                    if (m.ambiguas.length) {
                        const resto = m.ambiguas.length - 10;
                        h += '<span class="rxvel-tag amb">' + m.ambiguas.length + ' ambigua(s)</span>' +
                            m.ambiguas.slice(0, 10).map((a) => chipLista(a.token, 'Coincide con: ' + a.candidatos.join(', '))).join('') +
                            (resto > 0 ? '<span class="rxvel-chip">+' + resto + '</span>' : '');
                    }
                    return h;
                };
                const actualizaMatch = () => {
                    const m = matchDe();
                    const c = byId('rxvel-match');
                    if (c) setHtml(c, matchHtml(m));
                    const n = byId('rxvel-gen-n');
                    if (n) n.textContent = m.unidades.length + ' unidad(es)';
                };
                // Invalida resultados cuando cambia un parametro. Se repinta
                // solo el bloque de resultados para no perder el foco.
                const invalidaRes = () => {
                    RX_VEL.res = null;
                    const dyn = byId('rxvel-dyn');
                    if (dyn) setHtml(dyn, resultados());
                };
                const resultados = () => {
                    const r = RX_VEL.res;
                    if (!r) {
                        return '<p class="rgi-more">A\u00fan no hay resultados. Pega los n\u00fameros, elige el periodo y pulsa "Calcular".</p>';
                    }
                    const tot = r.resumen || rxVelTotales(r.filas);
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi ok"><b>' + tot.conDatos + '/' + tot.total + '</b><span>Con datos</span></div>' +
                        '<div class="rgi-kpi"><b>' + esc(rxVelNum(tot.km, 1)) + '</b><span>km totales</span></div>' +
                        '<div class="rgi-kpi"><b>' + esc(rxVelNum(tot.minMov / 60, 1)) + '</b><span>h en movimiento</span></div>' +
                        '<div class="rgi-kpi ok"><b>' + esc(rxVelNum(tot.velMov, 1)) + '</b><span>vel. media km/h</span></div>' +
                        ((tot.sinDatos + tot.errores)
                            ? '<div class="rgi-kpi vivo"><b>' + (tot.sinDatos + tot.errores) + '</b><span>sin datos/error</span></div>'
                            : '') +
                        '</div>';
                    h += '<p class="rgi-res">' + esc(
                        'Periodo ' + (r.desde || '') + ' a ' + (r.hasta || '') + ': ' +
                        tot.conDatos + ' de ' + tot.total + ' unidad(es) con datos. ' +
                        rxVelNum(tot.km, 1) + ' km recorridos, ' +
                        rxVelNum(tot.minMov / 60, 1) + ' h en movimiento. ' +
                        'Media del periodo: ' + rxVelNum(tot.velPeriodo, 1) + ' km/h.' +
                        (tot.truncadas ? (' ' + tot.truncadas + ' con historial truncado.') : '') +
                        ((tot.saltos || tot.huecos)
                            ? (' Descartados: ' + tot.saltos + ' saltos de GPS y ' + tot.huecos + ' huecos.')
                            : '') +
                        (r.recorte ? (' Se procesaron las primeras ' + RX_VEL_MAX_U + ' unidades.') : '')
                    ) + '</p>';
                    if ((r.noEncontradas && r.noEncontradas.length) || (r.ambiguas && r.ambiguas.length)) {
                        let w = '<div class="rgi-aviso"><b>Revisa la lista:</b> ';
                        if (r.noEncontradas && r.noEncontradas.length) {
                            const resto = r.noEncontradas.length - 20;
                            w += 'sin coincidencia: ' +
                                r.noEncontradas.slice(0, 20).map((t) => chipLista(t, 'No est\u00e1 en la flota cargada')).join(' ') +
                                (resto > 0 ? ' <span class="rxvel-chip">+' + resto + '</span>' : '');
                        }
                        if (r.ambiguas && r.ambiguas.length) {
                            const resto = r.ambiguas.length - 12;
                            w += (r.noEncontradas && r.noEncontradas.length ? ' \u00b7 ' : '') + 'ambiguos: ' +
                                r.ambiguas.slice(0, 12).map((a) => chipLista(a.token, 'Coincide con: ' + a.candidatos.join(', '))).join(' ') +
                                (resto > 0 ? ' <span class="rxvel-chip">+' + resto + '</span>' : '');
                        }
                        h += w + '</div>';
                    }
                    if (!r.filas.length) {
                        return h + '<div class="rgi-aviso">No se calcul\u00f3 ninguna unidad. Revisa la lista y el periodo.</div>';
                    }
                    const filas = rxVelOrdenar(r.filas, RX_VEL.orden, RX_VEL.ordenDir);
                    const maxVel = filas.reduce((m, f) => Math.max(m, (f.estado === 'ok') ? (+f.velMov || 0) : 0), 0) || 1;
                    const barra = (v) => {
                        const vel = +v || 0;
                        const w = vel > 0 ? Math.max(2, Math.min(100, Math.round((vel / maxVel) * 100))) : 0;
                        return '<span class="rxvel-b"><i style="width:' + w + '%"></i></span>';
                    };
                    const th = (campo, txt) => '<th class="ord' + (RX_VEL.orden === campo ? ' on' : '') +
                        '" data-rxvel-ord="' + campo + '" title="Ordenar por ' + esc(txt) + '">' +
                        esc(txt) + (RX_VEL.orden === campo
                            ? '<span class="rondo-usym rxvel-ordo">' + (RX_VEL.ordenDir > 0 ? UIS.up : UIS.down) + '</span>'
                            : '') + '</th>';
                    let tb = '';
                    for (const f of filas) {
                        const ok = f.estado === 'ok';
                        const sub = f.estado === 'error'
                            ? ('Error: ' + (typeof rxInfExplicaError === 'function' ? rxInfExplicaError(f.error) : f.error))
                            : (f.estado === 'sin_datos'
                                ? 'Sin datos en el periodo'
                                : (f.nombre || '') + (f.truncado ? ' \u00b7 historial truncado' : ''));
                        tb += '<tr class="' + (f.estado === 'error' ? 'rxvel-rowerr'
                            : (f.estado === 'sin_datos' ? 'rxvel-rowbad' : '')) + '">' +
                            '<td><b>' + esc(f.eco) + '</b><i class="rxvel-nm" title="' + esc(sub) + '">' + esc(sub) + '</i></td>' +
                            '<td class="num">' + (ok ? String(rxVelDiasDe(f)) : '-') + '</td>' +
                            '<td class="num">' + (ok ? esc(rxVelNum(f.km, 1)) : '-') + '</td>' +
                            '<td class="num">' + (ok ? esc(rxVelNum((+f.minMov || 0) / 60, 1)) : '-') + '</td>' +
                            '<td class="num"><span class="rxvel-v">' + (ok ? esc(rxVelNum(f.velMov, 1)) : '-') + '</span>' +
                            (ok ? barra(f.velMov) : '') + '</td>' +
                            '<td class="num">' + (ok ? esc(rxVelNum(f.velPeriodo, 1)) : '-') + '</td>' +
                            '<td class="num">' + (ok ? esc(rxVelNum(f.velMax, 1)) : '-') + '</td>' +
                            '</tr>';
                    }
                    h += '<div class="rgi-prev"><table><thead><tr>' +
                        th('eco', 'Unidad') + th('dias', 'D\u00edas') + th('km', 'km') +
                        th('mov', 'h mov.') + th('vel', 'Vel. media') +
                        th('periodo', 'Vel. periodo') + th('max', 'Vel. m\u00e1x.') +
                        '</tr></thead><tbody>' + tb + '</tbody></table></div>' +
                        '<p class="rgi-more">Pulsa los encabezados para ordenar. La barra compara la velocidad media de cada unidad con la m\u00e1s alta del resultado.</p>';
                    h += '<div class="rgi-io">' +
                        '<button type="button" class="rgi-btn primary" id="rxvel-pdf" title="Reporte imprimible con gr\u00e1fica y tablas">' +
                        '<span class="rondo-usym">' + UIS.export + '</span><b>PDF</b><i>gr\u00e1fica y detalle</i></button>' +
                        '<button type="button" class="rgi-btn" id="rxvel-csv" title="Resumen por unidad y detalle por d\u00eda">' +
                        '<span class="rondo-usym">' + UIS.csv + '</span><b>CSV</b><i>resumen y por d\u00eda</i></button>' +
                        '<button type="button" class="rgi-btn" id="rxvel-copiar" title="Copiar la tabla al portapapeles">' +
                        '<span class="rondo-usym">' + UIS.copy + '</span><b>Copiar</b><i>tabla al portapapeles</i></button>' +
                        '</div>';
                    return h;
                };
                const paso = (n, tit, cont) => '<div class="rgi-cfg"><div class="rgi-paso-c"><i>' + n + '</i><b>' +
                    esc(tit) + '</b></div>' + cont + '</div>';
                const chipDias = (v, txt, dis) => '<button type="button" class="rgi-chip" data-rxvel-dias="' + v + '"' + dis + '>' +
                    esc(txt) + '</button>';
                const cuerpo = () => {
                    const dis = RX_VEL._busy ? ' disabled' : '';
                    const mAct = matchDe();
                    const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.speed + '</span>' +
                        '<div class="rgi-herot"><b>Velocidad promedio por unidad</b>' +
                        '<span>Pega los n\u00fameros econ\u00f3micos y mide la velocidad media de cada unidad en el periodo, con su historial GPS.</span></div>' +
                        '<i class="rgi-ori">Historial</i></div>';
                    const paso1 = paso(1, 'N\u00fameros econ\u00f3micos',
                        '<div class="rgi-row"><span class="rgi-lb">Lista</span><span class="rgi-gen-hint">' +
                        'Uno por l\u00ednea, separados por coma o espacio. Tambi\u00e9n acepta placas y nombres.</span>' +
                        '<span class="rxvel-tools">' +
                        '<button type="button" class="mini" id="rxvel-pegar" title="Leer la lista del portapapeles">Pegar</button>' +
                        '<button type="button" class="mini" id="rxvel-todas" title="Cargar los econ\u00f3micos de la flota cargada">Toda la flota</button>' +
                        '<button type="button" class="mini" id="rxvel-limpiar">Limpiar</button>' +
                        '</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><textarea id="rxvel-nums" class="rxvel-area" rows="4" spellcheck="false" ' +
                        'placeholder="105, 208, 312&#10;ECO-415&#10;CAMION 502"' + dis + '>' + esc(RX_VEL.texto) + '</textarea></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rxvel-match" id="rxvel-match">' +
                        matchHtml(mAct) + '</div></div>');
                    const paso2 = paso(2, 'Periodo',
                        '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                        '<input type="date" id="rxvel-desde" class="filtro" title="D\u00eda inicial (incluido)" value="' + esc(RX_VEL.desde) + '"' + dis + '>' +
                        '<span class="sep">\u2192</span>' +
                        '<input type="date" id="rxvel-hasta" class="filtro" title="D\u00eda final (incluido)" value="' + esc(RX_VEL.hasta) + '"' + dis + '>' +
                        '</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Atajos</span><div class="rgi-chips">' +
                        chipDias(7, '7 d\u00edas', dis) + chipDias(15, '15 d\u00edas', dis) +
                        chipDias(30, '30 d\u00edas', dis) + chipDias('mes', 'Mes actual', dis) +
                        '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        'Fechas incluyentes. El periodo m\u00e1ximo es de ' + RX_VEL_MAX_DIAS + ' d\u00edas.</span></div>');
                    const paso3 = paso(3, 'C\u00e1lculo',
                        '<div class="rgi-row"><span class="rgi-lb">Movimiento</span>' +
                        '<span class="rgi-num">sobre <input type="number" min="0" max="80" step="1" id="rxvel-velmin" value="' + esc(String(RX_VEL.velMin)) + '"' + dis + '> km/h</span>' +
                        '<span class="rgi-num">saltos &gt; <input type="number" min="0" max="100" step="1" id="rxvel-salto" value="' + esc(String(RX_VEL.saltoKm)) + '"' + dis + '> km</span>' +
                        '<span class="rgi-num">huecos &gt; <input type="number" min="0" max="1440" step="30" id="rxvel-hueco" value="' + esc(String(RX_VEL.huecoMin)) + '"' + dis + '> min</span>' +
                        '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        'La velocidad media en movimiento divide los km entre las horas en movimiento; la del periodo, entre todo el tiempo con reportes. ' +
                        'Los saltos de GPS y los huecos largos no suman.</span></div>');
                    const ejecutar = RX_VEL._busy
                        ? '<button type="button" class="rgi-btn gen busy" id="rxvel-cancel">' +
                          '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>descarta lo calculado</i></button>'
                        : '<button type="button" class="rgi-btn gen pulsa" id="rxvel-generar">' +
                          '<span class="rondo-usym">' + UIS.play + '</span><b>Calcular</b></button>';
                    const barra = '<div class="rgi-generar">' + ejecutar +
                        '<span class="rgi-gen-hint">' + (RX_VEL._busy
                            ? 'Leyendo el historial de las unidades\u2026'
                            : '<b id="rxvel-gen-n">' + mAct.unidades.length + ' unidad(es)</b> listas. Un clic y el reporte queda listo para descargar.') +
                        '</span></div>';
                    const prog = '<div class="rgi-carga" id="rxvel-prog" style="display:' + (RX_VEL.prog.activo ? 'flex' : 'none') + '">' +
                        '<span id="rxvel-prog-t">' + esc(RX_VEL.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rxvel-prog-b" style="width:' + Math.max(2, RX_VEL.prog.pct || 0) + '%"></i></span></div>';
                    return '<div class="rgi">' + hero + paso1 + paso2 + paso3 + prog + barra +
                        '<div id="rxvel-dyn">' + resultados() + '</div></div>';
                };
                const pinta = () => { if (box && box.isConnected !== false) setHtml(box, cuerpo()); };
                const setProg = (pct, txt) => {
                    RX_VEL.prog = { activo: pct != null, pct: pct || 0, txt: txt || '' };
                    const p = byId('rxvel-prog');
                    if (!p) return;
                    p.style.display = (pct != null) ? 'flex' : 'none';
                    const t = byId('rxvel-prog-t'), b = byId('rxvel-prog-b');
                    if (t) t.textContent = txt || '';
                    if (b) b.style.width = clamp(pct || 0, 0, 100) + '%';
                };
                const generar = async () => {
                    if (RX_VEL._busy) return;
                    const m = matchDe();
                    if (!m.tokens) { adviceWarn('Velocidad promedio', 'Pega al menos un n\u00famero econ\u00f3mico.'); return; }
                    if (!m.unidades.length) {
                        adviceWarn('Velocidad promedio', 'Ninguno de los n\u00fameros coincide con la flota cargada. Revisa la lista.');
                        return;
                    }
                    const desde = rxRendFechaSeg(RX_VEL.desde, false);
                    const hasta = rxRendFechaSeg(RX_VEL.hasta, true);
                    if (!desde || !hasta || hasta <= desde) { adviceWarn('Velocidad promedio', 'Revisa el periodo (desde/hasta).'); return; }
                    const dias = Math.round((hasta - desde) / 86400);
                    if (dias > RX_VEL_MAX_DIAS) {
                        adviceWarn('Velocidad promedio', 'El periodo m\u00e1ximo es de ' + RX_VEL_MAX_DIAS + ' d\u00edas.');
                        return;
                    }
                    const lista = m.unidades.slice(0, RX_VEL_MAX_U);
                    const recorte = m.unidades.length > lista.length;
                    const token = { cancelado: false };
                    RX_VEL._busy = true;
                    RX_VEL._token = token;
                    RX_VEL.res = null;
                    pinta();
                    setProg(3, 'Preparando ' + lista.length + ' unidad(es)\u2026');
                    try {
                        const filas = await rxVelCorre(lista, {
                            desde: desde, hasta: hasta,
                            velMin: RX_VEL.velMin, saltoKm: RX_VEL.saltoKm, huecoMin: RX_VEL.huecoMin
                        }, (h, t, eco) => {
                            if (RX_VEL._token !== token) return;
                            const pct = t ? (4 + Math.round((h / t) * 94)) : 4;
                            setProg(pct, eco
                                ? ('Calculando ' + Math.min(h + 1, t) + ' de ' + t + ': ' + eco)
                                : 'Calculando\u2026');
                        }, token);
                        // El dialogo se pudo cerrar y reabrir mientras se
                        // calculaba: si la corrida ya no es la actual, no se
                        // pisa el estado de la nueva.
                        if (RX_VEL._token !== token) return;
                        const resumen = rxVelTotales(filas);
                        RX_VEL.res = {
                            filas: filas, resumen: resumen,
                            desde: RX_VEL.desde, hasta: RX_VEL.hasta,
                            velMin: RX_VEL.velMin, saltoKm: RX_VEL.saltoKm, huecoMin: RX_VEL.huecoMin,
                            noEncontradas: m.noEncontradas, ambiguas: m.ambiguas,
                            totalPedidos: m.tokens, recorte: recorte
                        };
                        setProg(100, 'Listo: ' + resumen.conDatos + ' unidad(es) con datos');
                        pinta();
                        if (token.cancelado) {
                            adviceWarn('Velocidad promedio', 'C\u00e1lculo cancelado. Lo ya calculado queda en pantalla.');
                        } else if (!resumen.conDatos) {
                            adviceWarn('Velocidad promedio', 'Ninguna unidad tiene posiciones suficientes en el periodo.');
                        } else {
                            adviceOk('Velocidad promedio', resumen.conDatos + ' unidad(es) calculadas. ' +
                                'Velocidad media global: ' + rxVelNum(resumen.velMov, 1) + ' km/h.');
                        }
                        if (recorte) {
                            advice('Velocidad promedio', 'Se procesaron las primeras ' + RX_VEL_MAX_U +
                                ' unidades de ' + m.unidades.length + '.');
                        }
                    } catch (e) {
                        if (RX_VEL._token !== token) return;
                        setProg(null);
                        adviceErr('Velocidad promedio', 'No se pudo completar: ' + ((e && e.message) || e));
                    } finally {
                        if (RX_VEL._token === token) {
                            RX_VEL._busy = false;
                            RX_VEL._token = null;
                            setProg(null);
                            pinta();
                        }
                    }
                };
                if (!box) return;
                pinta();
                box.addEventListener('click', (e) => {
                    const ord = e.target && e.target.closest ? e.target.closest('th[data-rxvel-ord]') : null;
                    if (ord) {
                        if (RX_VEL._busy) return;
                        const campo = String(ord.dataset.rxvelOrd || 'eco');
                        if (RX_VEL.orden === campo) RX_VEL.ordenDir = -RX_VEL.ordenDir;
                        else { RX_VEL.orden = campo; RX_VEL.ordenDir = (campo === 'eco') ? 1 : -1; }
                        pinta();
                        return;
                    }
                    const b = e.target && e.target.closest ? e.target.closest('button') : null;
                    if (!b) return;
                    if (b.id === 'rxvel-cancel') {
                        if (RX_VEL._token) RX_VEL._token.cancelado = true;
                        setProg(99, 'Cancelando\u2026');
                        return;
                    }
                    if (RX_VEL._busy) return;
                    if (b.id === 'rxvel-generar') { generar(); return; }
                    if (b.id === 'rxvel-pegar') {
                        const ta = byId('rxvel-nums');
                        if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
                            adviceWarn('Velocidad promedio', 'El navegador no permite leer el portapapeles. Pega con Ctrl+V.');
                            if (ta && ta.focus) ta.focus();
                            return;
                        }
                        navigator.clipboard.readText().then((txt) => {
                            if (!txt) return;
                            RX_VEL.texto = (RX_VEL.texto ? RX_VEL.texto.replace(/\s+$/, '') + '\n' : '') + String(txt);
                            if (ta) ta.value = RX_VEL.texto;
                            RX_VEL.res = null;
                            actualizaMatch();
                        }).catch(() => {
                            adviceWarn('Velocidad promedio', 'No se pudo leer el portapapeles. Pega con Ctrl+V.');
                        });
                        return;
                    }
                    if (b.id === 'rxvel-limpiar') {
                        RX_VEL.texto = '';
                        RX_VEL.res = null;
                        const ta = byId('rxvel-nums');
                        if (ta) ta.value = '';
                        actualizaMatch();
                        const dyn = byId('rxvel-dyn');
                        if (dyn) setHtml(dyn, resultados());
                        return;
                    }
                    if (b.id === 'rxvel-todas') {
                        RX_VEL.texto = US.slice(0, RX_VEL_MAX_U).map((u) => u.eco).join('\n');
                        RX_VEL.res = null;
                        const ta = byId('rxvel-nums');
                        if (ta) ta.value = RX_VEL.texto;
                        actualizaMatch();
                        const dyn = byId('rxvel-dyn');
                        if (dyn) setHtml(dyn, resultados());
                        if (US.length > RX_VEL_MAX_U) {
                            advice('Velocidad promedio', 'Se cargaron las primeras ' + RX_VEL_MAX_U +
                                ' unidades de ' + US.length + '.');
                        }
                        return;
                    }
                    if (b.dataset && b.dataset.rxvelDias != null) {
                        const v = b.dataset.rxvelDias;
                        if (v === 'mes') {
                            const h = rxVelFechaHoy();
                            RX_VEL.hasta = h;
                            RX_VEL.desde = h.slice(0, 7) + '-01';
                        } else {
                            const n = clamp(+v || 7, 1, RX_VEL_MAX_DIAS);
                            RX_VEL.hasta = rxVelFechaHoy();
                            RX_VEL.desde = rxVelSumaDias(RX_VEL.hasta, -(n - 1));
                        }
                        RX_VEL.res = null;
                        pinta();
                        return;
                    }
                    if (b.id === 'rxvel-csv') {
                        if (RX_VEL.res) {
                            rxInfDescarga(rxVelCSV(RX_VEL.res),
                                rxVelNombreArchivo(RX_VEL.res.desde, RX_VEL.res.hasta),
                                'text/csv;charset=utf-8;');
                            adviceOk('Velocidad promedio', 'CSV descargado.');
                        }
                        return;
                    }
                    if (b.id === 'rxvel-pdf') {
                        if (RX_VEL.res && RX_VEL.res.filas.length) {
                            try {
                                rxImprimirHTML(rxVelHTML(RX_VEL.res));
                                advice('Reporte listo', 'Elige "Guardar como PDF" en el di\u00e1logo de impresi\u00f3n.');
                            } catch (err) {
                                adviceErr('Velocidad promedio', 'No se pudo preparar el PDF: ' + ((err && err.message) || err));
                            }
                        }
                        return;
                    }
                    if (b.id === 'rxvel-copiar') {
                        if (RX_VEL.res) {
                            const txt = rxVelCSV(RX_VEL.res);
                            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                                navigator.clipboard.writeText(txt).then(() => {
                                    adviceOk('Velocidad promedio', 'Tabla copiada al portapapeles.');
                                }).catch(() => {
                                    adviceWarn('Velocidad promedio', 'No se pudo copiar. Usa el CSV.');
                                });
                            } else {
                                adviceWarn('Velocidad promedio', 'El navegador no permite copiar. Usa el CSV.');
                            }
                        }
                    }
                });
                box.addEventListener('change', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rxvel-desde') { RX_VEL.desde = String(t.value || ''); RX_VEL.res = null; pinta(); }
                    else if (t.id === 'rxvel-hasta') { RX_VEL.hasta = String(t.value || ''); RX_VEL.res = null; pinta(); }
                    else if (t.id === 'rxvel-velmin') { RX_VEL.velMin = clamp(+t.value || 0, 0, 80); t.value = String(RX_VEL.velMin); invalidaRes(); }
                    else if (t.id === 'rxvel-salto') { RX_VEL.saltoKm = clamp(+t.value || 0, 0, 100); t.value = String(RX_VEL.saltoKm); invalidaRes(); }
                    else if (t.id === 'rxvel-hueco') { RX_VEL.huecoMin = clamp(+t.value || 0, 0, 1440); t.value = String(RX_VEL.huecoMin); invalidaRes(); }
                });
                // La lista se actualiza tecla a tecla sin repintar el cuerpo:
                // asi el foco y el cursor no saltan al principio.
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || t.id !== 'rxvel-nums') return;
                    RX_VEL.texto = String(t.value || '');
                    RX_VEL.res = null;
                    actualizaMatch();
                    const dyn = byId('rxvel-dyn');
                    if (dyn) setHtml(dyn, resultados());
                });
            }
        });
    }
