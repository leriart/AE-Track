    /* ====================== RENDIMIENTOS POR UNIDAD ======================
     * Reporte de rendimiento: dada una geocerca (de la plataforma o dibujada
     * en Rondo) o un punto de partida con radio, se toma la salida de ese
     * origen y se mide, entre cada parada, la distancia en km y el tiempo en
     * movimiento. La traza se baja con messages/load_interval (el mismo
     * paginador del informe por geocerca) y las paradas se detectan con el
     * umbral de velocidad, igual que el resto de motores.
     *
     * El nucleo (rxRendCalcula) es puro: recibe puntos, un predicado
     * `dentroDe` y umbrales; se prueba en tests/rendimientos.test.js.
     */
    // Estado de la pantalla (dialog-local, como RX_INF): nada de esto se
    // persiste; son parametros de una consulta puntual.
    const RX_REND = {
        unidad: '',           // id de la unidad elegida
        modo: 'zona',         // 'zona' (geocerca) | 'punto' (lat/lon + radio)
        zona: '',             // nombre de la geocerca de partida
        uniBusca: '',         // filtro del buscador de unidades
        zonaBusca: '',        // filtro del buscador de geocercas
        lat: '', lon: '', radio: 100,
        desde: '', hasta: '', // fechas YYYY-MM-DD
        paradaMin: 5,         // minutos quieto que ya cuentan como parada
        vel: 3,               // km/h por debajo de los cuales esta "quieta"
        res: null,            // ultimo calculo {filas, kmTotal, minTotal, salidas, traza}
        origen: null,         // {lat, lon, txt} del punto de partida (mapa del PDF)
        eco: '',              // eco de la unidad del ultimo calculo
        prog: { activo: false, pct: 0, txt: '' },
        _token: null, _busy: false
    };
    // Fecha de formulario ('YYYY-MM-DD') a epoch segundos; `fin` la lleva al
    // final del dia (23:59:59) para que el rango incluya todo el dia elegido.
    function rxRendFechaSeg(s, fin) {
        const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return 0;
        const d = new Date(+m[1], +m[2] - 1, +m[3], fin ? 23 : 0, fin ? 59 : 0, fin ? 59 : 0);
        const t = Math.floor(d.getTime() / 1000);
        return (isFinite(t) && t > 0) ? t : 0;
    }
    // Mensajes crudos de load_interval -> puntos ordenados {t, lat, lon, s}.
    // Solo se aceptan mensajes con posicion valida (flags:1 ya lo filtra en el
    // servidor, pero la defensa no cuesta nada).
    function rxRendPuntos(msgs) {
        const out = [];
        for (const m of (msgs || [])) {
            const pos = m && m.pos;
            const t = Number(m && m.t) || 0;
            if (!pos || !isFinite(+pos.y) || !isFinite(+pos.x) || t <= 0) continue;
            out.push({ t: t, lat: +pos.y, lon: +pos.x, s: (pos.s != null && isFinite(+pos.s)) ? +pos.s : null });
        }
        out.sort((a, b) => a.t - b.t);
        return out;
    }
    // Letra de un punto del recorrido: A = origen, B = primera parada,
    // C = segunda... (tras Z sigue AA, AB). Asi cada fila se lee como un
    // tramo "A -> B", "B -> C", "C -> A" sin ambiguedad.
    function rxRendLetra(i) {
        let n = Math.max(0, Math.floor(Number(i) || 0));
        let s = '';
        do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
        return s;
    }
    // Nucleo puro. `dentroDe(p)` dice si un punto esta en el origen (geocerca
    // o circulo). Cada transicion dentro->fuera re-ancla el tramo: el km y el
    // tiempo de la siguiente parada se miden desde ESA salida. Las paradas
    // cuyo centro cae dentro del origen no se listan (son la estancia en el
    // punto de partida, no una parada del recorrido). Los saltos de GPS
    // mayores a `saltoM` no suman distancia (teleportaciones del receptor).
    // Cada fila es un TRAMO entre dos puntos: `desde` -> `hasta`, con la
    // distancia (km), el tiempo en movimiento (min) y la velocidad media
    // (km/h) de ese tramo.
    function rxRendCalcula(puntos, dentroDe, opts, zonaDe) {
        const o = opts || {};
        const paradaSeg = Math.max(30, (Number(o.paradaMin) || 5) * 60);
        const vel = (o.vel != null && isFinite(+o.vel)) ? +o.vel : 3;
        const salto = (o.saltoM != null && isFinite(+o.saltoM)) ? +o.saltoM : 5000;
        const dentro = (typeof dentroDe === 'function') ? dentroDe : function () { return false; };
        // `zonaDe(lat, lon)` devuelve el nombre de la geocerca mas cercana a
        // la parada (lo calcula el llamador; el nucleo sigue siendo puro).
        const zona = (typeof zonaDe === 'function') ? zonaDe : null;
        const pts = (puntos || []).filter((p) => p && isFinite(+p.t) && isFinite(+p.lat) && isFinite(+p.lon))
            .sort((a, b) => a.t - b.t);
        const filas = [];
        let salidas = 0, kmTotal = 0, minTotal = 0;
        // Traza simplificada para el mapa del PDF (tope fijo: no retiene el
        // historial completo en memoria).
        const MAXT = 500;
        const paso = Math.max(1, Math.ceil(pts.length / MAXT));
        const traza = [];
        for (let i = 0; i < pts.length; i += paso) traza.push({ lat: pts[i].lat, lon: pts[i].lon });
        if (pts.length && (pts.length - 1) % paso !== 0) {
            traza.push({ lat: pts[pts.length - 1].lat, lon: pts[pts.length - 1].lon });
        }
        if (pts.length < 2) return { filas: filas, kmTotal: kmTotal, minTotal: minTotal, salidas: salidas, traza: traza };
        let ancla = 0;                                  // indice donde arranca el tramo actual
        let qIni = -1, qUlt = -1, qLat = 0, qLon = 0, qN = 0; // grupo quieto abierto
        let estabaDentro = !!dentro(pts[0]);
        let salio = false;                              // ya salio del origen alguna vez
        let nPunto = 0;                                 // 0 = A (origen)
        let puntoActual = 'A';                          // punto donde arranca el tramo
        const cerrar = () => {
            if (qIni < 0) return;
            const dur = pts[qUlt].t - pts[qIni].t;
            const clat = qN ? (qLat / qN) : null, clon = qN ? (qLon / qN) : null;
            if (dur >= paradaSeg && clat != null && !dentro({ lat: clat, lon: clon })) {
                let m = 0;
                for (let i = ancla; i < qIni; i++) {
                    const d = rxDistM(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon);
                    if (d <= salto) m += d;
                }
                const km = m / 1000;
                const minMov = Math.max(0, (pts[qIni].t - pts[ancla].t) / 60);
                const kmh = minMov > 0 ? (km / (minMov / 60)) : 0;
                nPunto++;
                const letra = rxRendLetra(nPunto);
                filas.push({
                    n: filas.length + 1,
                    desde: puntoActual, hasta: letra,
                    llegada: pts[qIni].t, salida: pts[qUlt].t, paradaSeg: dur,
                    km: km, minMov: minMov, kmh: kmh, lat: clat, lon: clon,
                    zona: zona ? (zona(clat, clon) || '') : ''
                });
                kmTotal += km; minTotal += minMov;
                puntoActual = letra;
                // El siguiente tramo arranca donde cerro esta parada.
                ancla = qUlt;
            }
            qIni = -1; qUlt = -1; qLat = 0; qLon = 0; qN = 0;
        };
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            const ahoraDentro = !!dentro(p);
            // Regreso al origen: el origen tambien es el destino. Al volver a
            // entrar se cierra el tramo desde la ultima salida o parada,
            // aunque la unidad no se detenga (el viaje de vuelta cuenta).
            if (!estabaDentro && ahoraDentro && salio) {
                let m = 0;
                for (let k = ancla; k < i; k++) {
                    const d = rxDistM(pts[k].lat, pts[k].lon, pts[k + 1].lat, pts[k + 1].lon);
                    if (d <= salto) m += d;
                }
                const km = m / 1000;
                const minMov = Math.max(0, (p.t - pts[ancla].t) / 60);
                const kmh = minMov > 0 ? (km / (minMov / 60)) : 0;
                filas.push({
                    n: filas.length + 1,
                    desde: puntoActual, hasta: 'A',
                    llegada: p.t, salida: p.t, paradaSeg: 0,
                    km: km, minMov: minMov, kmh: kmh, lat: p.lat, lon: p.lon, regreso: true,
                    zona: zona ? (zona(p.lat, p.lon) || '') : ''
                });
                kmTotal += km; minTotal += minMov;
                puntoActual = 'A';
                ancla = i;
            }
            if (estabaDentro && !ahoraDentro) { salidas++; ancla = i; salio = true; }
            estabaDentro = ahoraDentro;
            if (p.s == null || +p.s <= vel) {
                if (qIni < 0) { qIni = i; qLat = 0; qLon = 0; qN = 0; }
                qLat += p.lat; qLon += p.lon; qN++; qUlt = i;
            } else {
                cerrar();
            }
        }
        cerrar();
        return { filas: filas, kmTotal: kmTotal, minTotal: minTotal, salidas: salidas, traza: traza };
    }
    // Predicado de origen segun la pantalla: circulo (punto + radio) o
    // geocerca (geometria normalizada una vez, como hace rxGeoInfZonaSel).
    function rxRendDentroDe() {
        if (RX_REND.modo === 'punto') {
            const lat = +RX_REND.lat, lon = +RX_REND.lon;
            const r = clamp(+RX_REND.radio || 100, 10, 5000);
            if (!isFinite(lat) || !isFinite(lon)) return null;
            // Comparacion al cuadrado: se llama por cada punto del historial.
            return (p) => rxDist2M(lat, lon, p.lat, p.lon) <= r * r;
        }
        const z = (APP.zonas || []).find((x) => rxGeoInfNombre(x) === RX_REND.zona);
        if (!z) return null;
        let p = z.p;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
        const zz = Object.assign({}, z, { p: Array.isArray(p) ? p : null });
        return (pt) => { try { return !!inZone(pt.lat, pt.lon, zz); } catch (_) { return false; } };
    }
    // Unidad elegida (objeto completo de APP.unidades) o null.
    function rxRendUnidadSel() {
        const id = String(RX_REND.unidad || '');
        if (!id) return null;
        return (APP.unidades || []).find((u) => u && String(u.id) === id) || null;
    }
    // Margen alrededor del borde de una geocerca: una parada a pocos metros
    // del limite (jitter del GPS) tambien cuenta como "en" esa geocerca.
    const RX_REND_ZONA_MARGEN = 200;
    const RX_REND_M_LAT = 110540;      // metros por grado (prefiltro por bbox)
    const RX_REND_M_LON_EQ = 111320;
    // Distancia (m) del punto al BORDE de una geocerca. 0 si esta dentro.
    function rxRendDistZona(lat, lon, z, centro) {
        if (!z) return null;
        let p = z.p;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
        // Circulo: |distancia al centro - radio|.
        const radio = (z.w != null) ? +z.w : ((z.r != null) ? +z.r : null);
        if ((z.t === 3 || (z.t == null && radio != null)) && centro && radio != null && radio > 0) {
            return Math.abs(rxDistM(lat, lon, centro.lat, centro.lon) - radio);
        }
        // Poligono/linea: distancia a la arista mas cercana.
        if (Array.isArray(p) && p.length >= 2) {
            const px = (a) => (a.x != null) ? +a.x : +a[0];
            const py = (a) => (a.y != null) ? +a.y : +a[1];
            let mejor = Infinity;
            for (let i = 0; i < p.length - 1; i++) {
                let d = null;
                try { d = distPuntoSegmento(lat, lon, py(p[i]), px(p[i]), py(p[i + 1]), px(p[i + 1])); }
                catch (_) { d = null; }
                const dd = (d && isFinite(d.dist)) ? d.dist : null;
                if (dd != null && dd < mejor) mejor = dd;
            }
            return isFinite(mejor) ? mejor : null;
        }
        return null;
    }
    // Ranking: primero las que CONTIENEN la parada; luego borde mas cercano,
    // centro mas cercano y, por ultimo, la mas pequena (mas especifica).
    function rxRendZonaMejor(a, b) {
        // Dentro gana a "cerca": la parada esta realmente en esa zona.
        if (a.dentro !== b.dentro) return a.dentro;
        if (a.dentro) {
            // Entre varias que la contienen, la MAS PEQUENA es la especifica
            // (un patio dentro de una zona industrial, no la industrial).
            if (a.area !== b.area) return a.area < b.area;
            if (a.cDist !== b.cDist) return a.cDist < b.cDist;
            return a.nombre < b.nombre;
        }
        // Fuera de todas: la de borde mas cercano; desempates por centro y
        // tamano.
        if (a.dist !== b.dist) return a.dist < b.dist;
        if (a.cDist !== b.cDist) return a.cDist < b.cDist;
        if (a.area !== b.area) return a.area < b.area;
        return a.nombre < b.nombre;
    }
    // Geocerca mas cercana a un punto (o '' si ninguna queda dentro del
    // margen). Descarte rapido por bounding box y geometria fina solo para
    // las candidatas: con muchas geocercas no se recorre cada poligono.
    function rxRendZonaCercana(lat, lon, margen) {
        if (lat == null || lon == null) return '';
        const mg = (margen == null) ? RX_REND_ZONA_MARGEN : Math.max(0, +margen || 0);
        const zs = APP.zonas || [];
        const mx = RX_REND_M_LON_EQ * Math.cos(lat * Math.PI / 180) || RX_REND_M_LON_EQ;
        let mejor = null;
        for (let i = 0; i < zs.length; i++) {
            const z = zs[i];
            if (!z) continue;
            const nombre = rxGeoInfNombre(z);
            if (!nombre) continue;
            const b = z.b || {};
            // Distancia al rectangulo (0 si el punto cae dentro); salta la
            // geometria de las zonas lejanas.
            let dBbox = 0;
            const hayBbox = (b.min_x != null && b.max_x != null && b.min_y != null && b.max_y != null);
            if (hayBbox) {
                const dx = Math.max(b.min_x - lon, 0, lon - b.max_x) * mx;
                const dy = Math.max(b.min_y - lat, 0, lat - b.max_y) * RX_REND_M_LAT;
                dBbox = Math.sqrt(dx * dx + dy * dy);
                if (dBbox > mg) continue;
            }
            let dentro = false;
            try { dentro = !!inZone(lat, lon, z); } catch (_) { dentro = false; }
            let centro = null;
            try { centro = centroDeZona(z); } catch (_) { centro = null; }
            let d;
            if (dentro) d = 0;
            else {
                d = rxRendDistZona(lat, lon, z, centro);
                if (d == null || d > mg) {
                    // Sin geometria fina, el bbox sirve de aproximacion.
                    if (hayBbox && dBbox <= mg) d = dBbox;
                    else continue;
                }
            }
            let area = 0;
            try { area = (typeof zonaAreaM2 === 'function') ? (+zonaAreaM2(z) || 0) : 0; } catch (_) { area = 0; }
            const cDist = (centro && centro.lat != null && centro.lon != null)
                ? rxDistM(lat, lon, centro.lat, centro.lon) : d;
            const cand = { nombre: nombre, dist: d, cDist: cDist, area: area, dentro: dentro };
            if (!mejor || rxRendZonaMejor(cand, mejor)) mejor = cand;
        }
        return mejor ? mejor.nombre : '';
    }
    // Texto del lugar de una parada: la geocerca mas cercana si se detecto o,
    // si no, la que la contiene / el municipio.
    function rxRendLugar(f) {
        if (f && typeof f === 'object') {
            if (f.zona) return f.zona;
            if (f.lat == null || f.lon == null) return '';
        }
        const lat = (f && typeof f === 'object') ? f.lat : f;
        const lon = (f && typeof f === 'object') ? f.lon : arguments[1];
        if (lat == null || lon == null) return '';
        try { const z = zoneAt(lat, lon); if (z) return z; } catch (_) { /* noop */ }
        try {
            if (typeof municipioEn === 'function') {
                const m = municipioEn(lat, lon);
                if (m) return m.nombre || String(m);
            }
        } catch (_) { /* noop */ }
        return '';
    }
    // Coordenadas legibles "lat, lon" (la misma funcion que el resto de Rondo).
    function rxRendCoords(lat, lon) {
        if (lat == null || lon == null || !isFinite(+lat) || !isFinite(+lon)) return '';
        try { if (typeof rxCoord === 'function') return rxCoord(lat, lon, 5); } catch (_) { /* noop */ }
        return (+lat).toFixed(5) + ', ' + (+lon).toFixed(5);
    }
    function rxRendNombreArchivo(eco, d, h) {
        const e = String(eco || 'unidad').replace(/[^\w\-]+/g, '_').slice(0, 30);
        return 'rondo_rendimientos_' + e + '_' + (d || '') + '_a_' + (h || '') + '.csv';
    }
    function rxRendCSV(eco, res) {
        const cols = ['#', 'Tramo', 'Llegada', 'Distancia km', 'Tiempo min', 'Vel. media km/h',
            'Parada', 'Geocerca / municipio', 'Coordenadas'];
        const filas = (res && res.filas ? res.filas : []).map((f) => [
            f.n, (f.desde || '-') + ' -> ' + (f.hasta || '-'), rxFechaHora(f.llegada),
            rxInfFmt(f.km), rxInfFmt(f.minMov), rxInfFmt(f.kmh),
            f.regreso ? '-' : rxInfFmtDur(f.paradaSeg),
            f.regreso ? 'Regreso al origen' : (rxRendLugar(f) || ''),
            rxRendCoords(f.lat, f.lon)
        ]);
        const vel = (res && res.minTotal > 0) ? (res.kmTotal / (res.minTotal / 60)) : 0;
        const o = RX_REND.origen || null;
        const meta = [
            'Rendimientos', 'Unidad: ' + (eco || ''),
            'Periodo: ' + (RX_REND.desde || '') + ' a ' + (RX_REND.hasta || ''),
            'km totales: ' + rxInfFmt(res ? res.kmTotal : 0),
            'Minutos en movimiento: ' + rxInfFmt(res ? res.minTotal : 0),
            'Velocidad media: ' + rxInfFmt(vel) + ' km/h'
        ];
        if (o) meta.push('Punto de partida y regreso: ' + (o.txt || '') + ' ' + rxRendCoords(o.lat, o.lon));
        return rxInfCSVTexto(cols, filas, meta);
    }
    // Coordenadas del origen elegido (geocerca o punto), para el mapa del PDF.
    function rxRendOrigen() {
        if (RX_REND.modo === 'punto') {
            const lat = +RX_REND.lat, lon = +RX_REND.lon;
            if (!isFinite(lat) || !isFinite(lon)) return null;
            return { lat: lat, lon: lon, txt: 'Punto de partida' };
        }
        const z = (APP.zonas || []).find((x) => rxGeoInfNombre(x) === RX_REND.zona);
        if (!z) return null;
        let c = null;
        try { c = centroDeZona(z); } catch (_) { c = null; }
        if (!c) {
            const b = z.b || {};
            if (b.cen_x != null && b.cen_y != null) c = { lat: +b.cen_y, lon: +b.cen_x };
        }
        return c ? { lat: +c.lat, lon: +c.lon, txt: RX_REND.zona } : null;
    }
    // Documento imprimible (PDF): KPIs, mapa con la traza y las paradas (el
    // origen va marcado como partida y regreso) y la tabla del detalle.
    function rxRendHTML(eco, res, origen) {
        const o = origen || null;
        const cab = ['#', 'Tramo', 'Llegada', 'Distancia km', 'Tiempo min', 'Vel. media km/h',
            'Parada', 'Geocerca / municipio', 'Coordenadas'];
        const filas = (res.filas || []).slice(0, 400).map((f) => [
            esc(String(f.n)), esc((f.desde || '-') + ' \u2192 ' + (f.hasta || '-')),
            esc(rxFechaHora(f.llegada)),
            esc(rxInfFmt(f.km)), esc(rxInfFmt(f.minMov)), esc(rxInfFmt(f.kmh)),
            esc(f.regreso ? '-' : rxInfFmtDur(f.paradaSeg)),
            esc(f.regreso ? 'Regreso al origen' : (rxRendLugar(f) || '-')),
            esc(rxRendCoords(f.lat, f.lon) || '-')
        ]);
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const lineas = [];
        if (res.traza && res.traza.length > 1) {
            lineas.push({ pts: res.traza, color: '#850D22', width: 3, opacity: 0.9, glow: true });
        }
        const marcas = [];
        if (o) marcas.push({ lat: o.lat, lon: o.lon, color: '#2e7d32', radio: 7, txt: 'A \u00b7 Origen / Regreso' });
        (res.filas || []).slice(0, 120).forEach((f) => {
            marcas.push({
                lat: f.lat, lon: f.lon,
                color: f.regreso ? '#f9a825' : '#1565c0', radio: 5,
                txt: f.regreso ? 'A \u00b7 Regreso' : ((f.hasta || '') + ' \u00b7 ' + (f.zona || 'Parada'))
            });
        });
        const mapa = (lineas.length || marcas.length)
            ? '<h2 class="seccion">1. Mapa</h2>' + rxMiniMapaHTML({ lineas: lineas, marcas: marcas }, 680, 300)
            : '';
        const mas = (res.filas || []).length > 400
            ? '<p class="muted">Se listan las primeras 400 paradas; el CSV lleva todas.</p>' : '';
        return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Rendimientos ' +
            esc(eco) + '</title><style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Rendimientos entre paradas',
                'Unidad ' + esc(eco) + ' \u00b7 ' + esc(RX_REND.desde || '') + ' a ' + esc(RX_REND.hasta || '') +
                (o ? '<br>Punto de partida y regreso: ' + esc(o.txt) +
                    (rxRendCoords(o.lat, o.lon) ? ' \u00b7 ' + esc(rxRendCoords(o.lat, o.lon)) : '') : '')) +
            '<div class="kpis">' +
            kpi((res.filas || []).length, 'Tramos') +
            kpi(rxInfFmt(res.kmTotal), 'km entre puntos') +
            kpi(rxInfFmt(res.minTotal), 'min en movimiento') +
            kpi(rxInfFmt(res.minTotal > 0 ? (res.kmTotal / (res.minTotal / 60)) : 0), 'vel. media km/h') +
            kpi(res.salidas, 'Salidas del origen') +
            '</div>' + mapa +
            '<h2 class="seccion">' + (mapa ? '2' : '1') + '. Detalle</h2>' + mas +
            rxInfTabla(cab, filas) + rxInfPie() + '</body></html>';
    }
    // ── Dialogo ─────────────────────────────────────────────────────────
    function abrirRendimientos() {
        const hoy = (typeof rxReplayFechaHoy === 'function') ? rxReplayFechaHoy() : new Date().toISOString().slice(0, 10);
        if (!RX_REND.desde) RX_REND.hasta = hoy;
        if (!RX_REND.desde) {
            const d = new Date(); d.setDate(d.getDate() - 1);
            RX_REND.desde = d.toISOString().slice(0, 10);
        }
        abrirDialogo({
            icon: UIS.route,
            titulo: 'Rendimientos por unidad',
            ancho: 720,
            okText: 'Cerrar',
            cancel: false,
            html: '<div class="rgi-tool"><div id="rrnd-box"></div></div>',
            onOpen: (el) => {
                const box = el.querySelector('#rrnd-box');
                // El memo de setHtml es por id: al reabrir, el nodo es NUEVO y
                // el mismo HTML no se reescribiria (cuerpo vacio). Se invalida
                // y se cancela cualquier corrida anterior que siguiera viva.
                try { invalidarHtml('rrnd-box'); } catch (_) { /* noop */ }
                if (RX_REND._token) RX_REND._token.cancelado = true;
                RX_REND._busy = false;
                RX_REND._token = null;
                const unidades = () => (APP.unidades || [])
                    .filter((u) => u && u.id != null)
                    .map((u) => {
                        let info = null;
                        try { info = parseUnitName(u); } catch (_) { info = null; }
                        return { id: String(u.id), eco: (info && (info.eco || info.clave)) || u.nm || String(u.id) };
                    })
                    .sort((a, b) => String(a.eco).localeCompare(String(b.eco), 'es', { numeric: true }));
                const zonas = () => (APP.zonas || []).map((z) => rxGeoInfNombre(z)).filter(Boolean)
                    .sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
                // Listas fijas mientras el dialogo esta abierto: buscar y
                // repintar sugerencias no vuelve a recorrer la flota.
                const US = unidades();
                const ZS = zonas();
                // Buscador con sugerencias, igual que "Informes de la
                // plataforma": se escribe y la lista de chips se filtra; la
                // eleccion queda marcada (una sola, este informe es por
                // unidad).
                const filtra = (lista, texto, clave) => {
                    const q = norm(texto || '');
                    return lista.filter((x) => !q || norm(clave(x)).indexOf(q) >= 0);
                };
                const unisFiltradas = () => filtra(US, RX_REND.uniBusca, (u) => u.eco).slice(0, 120);
                const zonasFiltradas = () => filtra(ZS, RX_REND.zonaBusca, (z) => z).slice(0, 120);
                const uniEco = () => {
                    const u = US.filter((x) => x.id === RX_REND.unidad)[0];
                    return u ? u.eco : '';
                };
                const listaUniHtml = () => {
                    const l = unisFiltradas();
                    const dis = RX_REND._busy ? ' disabled' : '';
                    if (!l.length) return '<p class="rgi-more">Sin unidades con ese nombre.</p>';
                    return l.map((u) => '<button type="button" class="rgi-chip' + (RX_REND.unidad === u.id ? ' activo' : '') +
                        '" data-uni="' + esc(u.id) + '"' + dis + '>' + esc(u.eco) + '</button>').join('');
                };
                const listaZonaHtml = () => {
                    const l = zonasFiltradas();
                    const dis = RX_REND._busy ? ' disabled' : '';
                    if (!l.length) return '<p class="rgi-more">Sin geocercas con ese nombre.</p>';
                    return l.map((z) => '<button type="button" class="rgi-chip' + (RX_REND.zona === z ? ' activo' : '') +
                        '" data-zona="' + esc(z) + '"' + dis + '>' + esc(z) + '</button>').join('');
                };
                // Paso numerado, igual que el resto de dialogos de Rondo.
                const paso = (n, tit, cont) => '<div class="rgi-cfg"><div class="rgi-paso-c"><i>' + n + '</i><b>' +
                    esc(tit) + '</b></div>' + cont + '</div>';
                const cuerpo = () => {
                    const dis = RX_REND._busy ? ' disabled' : '';
                    const org = rxRendOrigen();
                    const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.route + '</span>' +
                        '<div class="rgi-herot"><b>Rendimiento entre puntos</b><span>Distancia y velocidad media de cada tramo (A→B, B→C…) entre paradas, contados desde cada salida del punto de partida</span></div>' +
                        '<i class="rgi-ori">Historial</i></div>';
                    const paso1 = paso(1, 'Unidad',
                        '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rrnd-uni-busca" class="filtro" placeholder="Buscar unidad\u2026" value="' + esc(RX_REND.uniBusca || '') + '"' + dis + '>' +
                        '<i id="rrnd-uni-n">' + unisFiltradas().length + '/' + US.length + '</i></span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-unis" id="rrnd-unis">' +
                        listaUniHtml() + '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(uniEco()
                            ? ('Seleccionada: ' + uniEco() + '. Se baja su historial en el periodo y se detectan sus paradas.')
                            : 'Escribe para filtrar y pulsa la unidad.') + '</span></div>');
                    const paso2 = paso(2, 'Punto de partida',
                        '<div class="rgi-row"><span class="rgi-lb">Origen</span><div class="rgi-chips">' +
                        '<button type="button" class="rgi-chip' + (RX_REND.modo === 'zona' ? ' activo' : '') + '" data-rr="modo" data-v="zona"' + dis + '>Geocerca</button>' +
                        '<button type="button" class="rgi-chip' + (RX_REND.modo === 'punto' ? ' activo' : '') + '" data-rr="modo" data-v="punto"' + dis + '>Punto y radio</button>' +
                        '</div></div>' +
                        (RX_REND.modo === 'zona'
                            ? '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                              '<span class="rgi-busca"><span class="rondo-usym">' + UIS.zone + '</span>' +
                              '<input type="text" id="rrnd-zona-busca" class="filtro" placeholder="Buscar geocerca\u2026" value="' + esc(RX_REND.zonaBusca || '') + '"' + dis + '>' +
                              '<i id="rrnd-zona-n">' + zonasFiltradas().length + '/' + ZS.length + '</i></span></div>' +
                              '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-zonas" id="rrnd-zonas">' +
                              listaZonaHtml() + '</div></div>'
                            : '<div class="rgi-row"><span class="rgi-lb">Coordenadas</span>' +
                              '<span class="rgi-num">lat <input type="number" step="any" id="rrnd-lat" value="' + esc(RX_REND.lat) + '" placeholder="20.6597"' + dis + '></span>' +
                              '<span class="rgi-num">lon <input type="number" step="any" id="rrnd-lon" value="' + esc(RX_REND.lon) + '" placeholder="-103.3496"' + dis + '></span>' +
                              '<span class="rgi-num">radio <input type="number" min="10" max="5000" id="rrnd-radio" value="' + esc(String(RX_REND.radio)) + '"' + dis + '> m</span>' +
                              '</div>') +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(RX_REND.modo === 'zona'
                            ? (RX_REND.zona
                                ? ('Partida: ' + RX_REND.zona +
                                    (org ? ' (' + rxRendCoords(org.lat, org.lon) + ')' : '') +
                                    '. Cada salida inicia un tramo nuevo.')
                                : 'Escribe para filtrar y pulsa la geocerca de partida.')
                            : (org
                                ? ('Punto de partida: ' + rxRendCoords(org.lat, org.lon) +
                                    '. El circulo del radio indicado es el origen y el regreso.')
                                : 'El circulo del radio indicado es el punto de partida.')) +
                        '</span></div>');
                    const paso3 = paso(3, 'Periodo y parada',
                        '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                        '<input type="date" id="rrnd-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_REND.desde) + '"' + dis + '>' +
                        '<span class="sep">\u2192</span>' +
                        '<input type="date" id="rrnd-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_REND.hasta) + '"' + dis + '>' +
                        '</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Parada</span>' +
                        '<span class="rgi-num"><input type="number" min="1" max="240" id="rrnd-parada" value="' + esc(String(RX_REND.paradaMin)) + '"' + dis + '> min o mas</span>' +
                        '<span class="rgi-num">quieta bajo <input type="number" min="0" max="80" id="rrnd-vel" value="' + esc(String(RX_REND.vel)) + '"' + dis + '> km/h</span>' +
                        '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        'Una parada empieza cuando la unidad lleva esos minutos bajo esa velocidad.</span></div>');
                    const ejecutar = RX_REND._busy
                        ? '<button type="button" class="rgi-btn gen busy" id="rrnd-cancel">' +
                          '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>descarta lo calculado</i></button>'
                        : '<button type="button" class="rgi-btn gen pulsa" id="rrnd-generar">' +
                          '<span class="rondo-usym">' + UIS.play + '</span><b>Generar</b><i>tramos A→B→C</i></button>';
                    const barra = '<div class="rgi-generar">' + ejecutar +
                        '<span class="rgi-gen-hint">' + esc(RX_REND._busy
                            ? 'Leyendo el historial de la unidad\u2026'
                            : 'Un clic y el reporte queda listo para descargar.') + '</span></div>';
                    const prog = '<div class="rgi-carga" id="rrnd-prog"' + (RX_REND.prog.activo ? ' style="display:flex"' : '') + '>' +
                        '<span id="rrnd-prog-t">' + esc(RX_REND.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rrnd-prog-b" style="width:' + Math.max(2, RX_REND.prog.pct || 0) + '%"></i></span></div>';
                    return '<div class="rgi">' + hero + paso1 + paso2 + paso3 + prog + barra +
                        '<div id="rrnd-dyn">' + resultados() + '</div></div>';
                };
                const resultados = () => {
                    const r = RX_REND.res;
                    if (!r) return '<p class="rgi-more">Sin resultados todav\u00eda. Elige unidad, origen y periodo, y pulsa "Generar".</p>';
                    if (!r.filas.length) {
                        return '<div class="rgi-aviso">Sin tramos fuera del origen en el periodo. ' +
                            'Prueba con otro rango o baja el m\u00ednimo de parada.</div>';
                    }
                    const vel = r.minTotal > 0 ? (r.kmTotal / (r.minTotal / 60)) : 0;
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi ok"><b>' + r.filas.length + '</b><span>Tramos</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.kmTotal) + '</b><span>km entre puntos</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.minTotal) + '</b><span>min en movimiento</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(vel) + '</b><span>vel. media km/h</span></div>' +
                        '<div class="rgi-kpi"><b>' + r.salidas + '</b><span>Salidas del origen</span></div></div>';
                    h += '<div class="rgi-prev"><table><thead><tr>' +
                        '<th>#</th><th>Tramo</th><th>Llegada</th><th>Distancia km</th><th>Tiempo min</th>' +
                        '<th>Vel. media km/h</th><th>Parada</th><th>Geocerca / municipio</th><th>Coordenadas</th>' +
                        '</tr></thead><tbody>';
                    for (const f of r.filas.slice(0, 500)) {
                        h += '<tr><td>' + f.n + '</td>' +
                            '<td><b>' + esc((f.desde || '-') + ' \u2192 ' + (f.hasta || '-')) + '</b></td>' +
                            '<td>' + esc(rxFechaHora(f.llegada)) + '</td>' +
                            '<td class="num">' + esc(rxInfFmt(f.km)) + '</td>' +
                            '<td class="num">' + esc(rxInfFmt(f.minMov)) + '</td>' +
                            '<td class="num">' + esc(rxInfFmt(f.kmh)) + '</td>' +
                            '<td>' + esc(f.regreso ? '-' : rxInfFmtDur(f.paradaSeg)) + '</td>' +
                            '<td>' + esc(f.regreso ? 'Regreso al origen' : (rxRendLugar(f) || '-')) + '</td>' +
                            '<td>' + esc(rxRendCoords(f.lat, f.lon) || '-') + '</td></tr>';
                    }
                    h += '</tbody></table>' +
                        (r.filas.length > 500 ? '<p class="rgi-more">Primeros 500 tramos de ' + r.filas.length + '. El CSV lleva todos.</p>' : '') + '</div>';
                    h += '<div class="rgi-io">' +
                        '<button type="button" class="rgi-btn primary" id="rrnd-pdf" title="Reporte imprimible con mapa (Guardar como PDF)">' +
                        '<span class="rondo-usym">' + UIS.export + '</span><b>PDF</b><i>mapa y paradas</i></button>' +
                        '<button type="button" class="rgi-btn" id="rrnd-csv" title="Una fila por parada">' +
                        '<span class="rondo-usym">' + UIS.csv + '</span><b>CSV</b><i>una fila por tramo</i></button></div>';
                    return h;
                };
                const pinta = () => { if (box && box.isConnected !== false) setHtml(box, cuerpo()); };
                const setProg = (pct, txt) => {
                    RX_REND.prog = { activo: pct != null, pct: pct || 0, txt: txt || '' };
                    const p = byId('rrnd-prog');
                    if (!p) return;
                    p.style.display = (pct != null) ? 'flex' : 'none';
                    const t = byId('rrnd-prog-t'), b = byId('rrnd-prog-b');
                    if (t) t.textContent = txt || '';
                    if (b) b.style.width = clamp(pct || 0, 0, 100) + '%';
                };
                const generar = async () => {
                    if (RX_REND._busy) return;
                    const u = rxRendUnidadSel();
                    if (!u) { adviceWarn('Rendimientos', 'Elige una unidad.'); return; }
                    const dentroDe = rxRendDentroDe();
                    if (!dentroDe) {
                        adviceWarn('Rendimientos', RX_REND.modo === 'zona'
                            ? 'Elige una geocerca de partida.'
                            : 'Escribe latitud y longitud del punto de partida.');
                        return;
                    }
                    const desde = rxRendFechaSeg(RX_REND.desde, false);
                    const hasta = rxRendFechaSeg(RX_REND.hasta, true);
                    if (!desde || !hasta || hasta <= desde) { adviceWarn('Rendimientos', 'Revisa el periodo (desde/hasta).'); return; }
                    let info = null;
                    try { info = parseUnitName(u); } catch (_) { info = null; }
                    const eco = (info && (info.eco || info.clave)) || u.nm || String(u.id);
                    RX_REND._busy = true;
                    RX_REND._token = { cancelado: false };
                    RX_REND.res = null;
                    pinta();
                    setProg(10, 'Descargando historial de ' + eco + '…');
                    try {
                        const got = await rxGeoInfFetchMensajes(u.id, desde, hasta, RX_REND._token);
                        if (RX_REND._token.cancelado) { setProg(null); return; }
                        if (got.error) throw new Error(got.error);
                        setProg(70, 'Calculando paradas…');
                        const pts = rxRendPuntos(got.msgs);
                        const res = rxRendCalcula(pts, dentroDe, { paradaMin: RX_REND.paradaMin, vel: RX_REND.vel },
                            (la, lo) => rxRendZonaCercana(la, lo));
                        RX_REND.res = res;
                        RX_REND.eco = eco;
                        RX_REND.origen = rxRendOrigen();
                        setProg(100, 'Listo: ' + res.filas.length + ' paradas');
                        setTimeout(() => setProg(null), 800);
                        pinta();
                        if (!pts.length) adviceWarn('Rendimientos', 'La unidad no tiene posiciones en el periodo.');
                    } catch (e) {
                        setProg(null);
                        adviceErr('Rendimientos', 'No se pudo calcular: ' + ((e && e.message) || e));
                    } finally {
                        RX_REND._busy = false;
                        RX_REND._token = null;
                        pinta();
                    }
                };
                if (!box) return;
                pinta();
                box.addEventListener('click', (e) => {
                    const b = e.target && e.target.closest ? e.target.closest('button') : null;
                    if (!b) return;
                    if (b.id === 'rrnd-generar') { generar(); return; }
                    if (b.id === 'rrnd-cancel') {
                        if (RX_REND._token) RX_REND._token.cancelado = true;
                        setProg(99, 'Cancelando…');
                        return;
                    }
                    if (b.id === 'rrnd-pdf') {
                        if (RX_REND.res && RX_REND.res.filas.length) {
                            try {
                                rxImprimirHTML(rxRendHTML(RX_REND.eco, RX_REND.res,
                                    RX_REND.origen || rxRendOrigen()));
                                advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
                            } catch (e) {
                                adviceErr('Rendimientos', 'No se pudo preparar el PDF: ' + ((e && e.message) || e));
                            }
                        }
                        return;
                    }
                    if (b.id === 'rrnd-csv') {
                        if (RX_REND.res && RX_REND.res.filas.length) {
                            rxInfDescarga(rxRendCSV(RX_REND.eco, RX_REND.res),
                                rxRendNombreArchivo(RX_REND.eco, RX_REND.desde, RX_REND.hasta), 'text/csv;charset=utf-8;');
                            adviceOk('Rendimientos', 'CSV descargado.');
                        }
                        return;
                    }
                    // Sugerencias: elegir unidad o geocerca marca el chip.
                    if (b.dataset && b.dataset.uni != null) {
                        if (RX_REND._busy) return;
                        RX_REND.unidad = String(b.dataset.uni);
                        RX_REND.res = null;
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.zona != null) {
                        if (RX_REND._busy) return;
                        RX_REND.zona = String(b.dataset.zona);
                        RX_REND.res = null;
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.rr === 'modo') {
                        RX_REND.modo = (b.dataset.v === 'punto') ? 'punto' : 'zona';
                        RX_REND.res = null;
                        pinta();
                    }
                });
                box.addEventListener('change', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rrnd-desde') RX_REND.desde = String(t.value || '');
                    else if (t.id === 'rrnd-hasta') RX_REND.hasta = String(t.value || '');
                    else return;
                    RX_REND.res = null;
                });
                // Buscadores: repintan SOLO su lista de sugerencias para no
                // perder el foco ni una pulsacion. Los numericos no repintan:
                // el input conserva su valor y el foco; solo se acota.
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rrnd-uni-busca') {
                        RX_REND.uniBusca = String(t.value || '');
                        const cont = byId('rrnd-unis');
                        if (cont) setHtml(cont, listaUniHtml()); else pinta();
                        const n = byId('rrnd-uni-n');
                        if (n) n.textContent = unisFiltradas().length + '/' + US.length;
                    } else if (t.id === 'rrnd-zona-busca') {
                        RX_REND.zonaBusca = String(t.value || '');
                        const cont = byId('rrnd-zonas');
                        if (cont) setHtml(cont, listaZonaHtml()); else pinta();
                        const n = byId('rrnd-zona-n');
                        if (n) n.textContent = zonasFiltradas().length + '/' + ZS.length;
                    } else if (t.id === 'rrnd-lat') RX_REND.lat = String(t.value || '');
                    else if (t.id === 'rrnd-lon') RX_REND.lon = String(t.value || '');
                    else if (t.id === 'rrnd-radio') RX_REND.radio = clamp(+t.value || 100, 10, 5000);
                    else if (t.id === 'rrnd-parada') RX_REND.paradaMin = clamp(+t.value || 5, 1, 240);
                    else if (t.id === 'rrnd-vel') RX_REND.vel = clamp(+t.value || 3, 0, 80);
                });
            }
        });
    }
