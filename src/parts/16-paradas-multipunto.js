    /* ====================== PARADAS MULTIPUNTO ======================
     * v5.15. Un plan de ruta es una lista ordenada de paradas con un modo:
     *   - 'secuencial': se visitan en el orden dado.
     *   - 'optimo': el optimizador reordena las paradas no fijadas. En la UI
     *     "mejor ruta" implica circuito (vuelve al origen); aqui el cierre lo
     *     decide el parametro `circuito` que reciba el optimizador.
     * Cada parada tiene { id, tipo, texto, coords, fijo }. El texto muestra
     * una pista del tipo: "geo:", "mun:" o "coord:" (el resto es libre).
     */
    function nuevaParada(tipo, texto, coords) {
        return {
            id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            tipo: tipo || 'lugar',
            texto: String(texto || '').trim(),
            coords: coords || null,
            fijo: false
        };
    }
    function parsearParada(txt) {
        let t = String(txt || '').trim();
        if (!t) return null;
        let tipo = 'lugar';
        const m = /^(geo|mun|coord):\s*(.+)$/i.exec(t);
        if (m) {
            tipo = { geo: 'geocerca', mun: 'municipio', coord: 'coord' }[m[1].toLowerCase()];
            t = m[2].trim();
        }
        let coords = null;
        const cm = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(t);
        if (cm) { tipo = 'coord'; coords = { lat: parseFloat(cm[1]), lon: parseFloat(cm[2]) }; }
        return nuevaParada(tipo, t, coords);
    }
    function textoAParadas(texto) {
        return String(texto || '').split(/[|\n;]+/).map(parsearParada).filter(Boolean);
    }
    function paradaATexto(p) {
        if (!p) return '';
        const pref = p.tipo === 'geocerca' ? 'geo:' : (p.tipo === 'municipio' ? 'mun:' : (p.tipo === 'coord' ? 'coord:' : ''));
        return pref + (p.texto || '');
    }
    function planATexto(plan) {
        return (plan && plan.paradas ? plan.paradas : []).map(paradaATexto).join(' | ');
    }
    function planDe(info) {
        if (!info) return null;
        const k = info.clave;
        if (k && APP.planes[k]) return APP.planes[k];
        // Compatibilidad: destino simple guardado en watchMap.
        const txt = (k && APP.watchMap[k]) || APP.watchMap[info.eco] || APP.watchMap[info.placa] || '';
        if (!txt) return null;
        return { modo: 'secuencial', circuito: false, paradas: textoAParadas(txt) };
    }
    function guardarPlanes() { writeSession(SS.planes, APP.planes); }
    // Resuelve las coordenadas de una parada (geocerca, municipio, coord o
    // lugar) y guarda en la misma parada la informacion util de la capa.
    async function resolverParada(p) {
        if (!p) return null;
        if (p.coords && p.coords.lat != null && p.coords.lon != null) return p;
        if (p.tipo === 'geocerca') {
            const z = encontrarZona(p.texto);
            if (!z) return null;
            const c = centroDeZona(z);
            if (!c) return null;
            p.coords = c; p.zonaId = z.id; p.texto = z.n || p.texto;
            return p;
        }
        if (p.tipo === 'municipio') {
            const m = await municipioOSM(p.texto);
            if (!m) return null;
            p.coords = m.centro; p.municipioId = m.id; p.texto = m.nombre;
            return p;
        }
        const c = await geocodificarLugar(p.texto);
        if (!c) return null;
        p.coords = c;
        return p;
    }
    // Optimizador de orden de paradas. Mantiene las paradas fijadas en su
    // posicion relativa; el resto se resuelve con vecino mas cercano + 2-opt.
    function ordenarParadasOptimo(paradas, origen, circuito) {
        if (!paradas || paradas.length < 2) return paradas;
        if (!origen || origen.lat == null) return paradas;
        for (let i = 0; i < paradas.length; i++) {
            if (!paradas[i].coords) return paradas; // sin resolver: no reordenar
        }
        const n = paradas.length;
        const fixedPos = [];
        for (let i = 0; i < n; i++) if (paradas[i].fijo) fixedPos.push(i);
        const out = [];
        const ultimoCoords = () => (out.length ? out[out.length - 1].coords : origen);
        let cursor = -1;
        for (let f = 0; f < fixedPos.length; f++) {
            const end = fixedPos[f];
            const seg = [];
            for (let i = cursor + 1; i < end; i++) seg.push(paradas[i]);
            const orden = ordenarSegmento(seg, ultimoCoords(), paradas[end].coords);
            for (let i = 0; i < orden.length; i++) out.push(orden[i]);
            out.push(paradas[end]);
            cursor = end;
        }
        const tail = [];
        for (let i = cursor + 1; i < n; i++) tail.push(paradas[i]);
        const orden = ordenarSegmento(tail, ultimoCoords(), circuito ? origen : null);
        for (let i = 0; i < orden.length; i++) out.push(orden[i]);
        return out;
    }
    function ordenarSegmento(items, inicio, fin) {
        if (!items || items.length <= 1) return items || [];
        // Vecino mas cercano desde `inicio`.
        const restantes = items.slice();
        const orden = [];
        let actual = inicio;
        while (restantes.length) {
            let bi = 0, bd = Infinity;
            for (let i = 0; i < restantes.length; i++) {
                const c = restantes[i].coords;
                const d = haversine(actual.lat, actual.lon, c.lat, c.lon);
                if (d < bd) { bd = d; bi = i; }
            }
            const sig = restantes.splice(bi, 1)[0];
            orden.push(sig);
            actual = sig.coords;
        }
        if (!fin) return orden;
        // 2-opt con extremos fijos (inicio -> ... -> fin). Los marcadores de
        // inicio/fin se representan con objetos centinela para no moverlos.
        const seq = [{ coords: inicio }].concat(orden).concat([{ coords: fin }]);
        const hav = (a, b) => haversine(a.lat, a.lon, b.lat, b.lon);
        let mejoro = true, vueltas = 0;
        while (mejoro && vueltas < 40) {
            mejoro = false; vueltas++;
            for (let i = 1; i < seq.length - 2; i++) {
                for (let j = i + 1; j < seq.length - 1; j++) {
                    const antes = hav(seq[i - 1].coords, seq[i].coords) + hav(seq[j].coords, seq[j + 1].coords);
                    const despues = hav(seq[i - 1].coords, seq[j].coords) + hav(seq[i].coords, seq[j + 1].coords);
                    if (despues + 1 < antes) {
                        let lo = i, hi = j;
                        while (lo < hi) { const tmp = seq[lo]; seq[lo] = seq[hi]; seq[hi] = tmp; lo++; hi--; }
                        mejoro = true;
                    }
                }
            }
        }
        return seq.slice(1, seq.length - 1);
    }
    // Nombres de los municipios por los que pasa una ruta (guardado al trazar).
    function municipioDeRuta(ruta, m) {
        if (!ruta || !m) return false;
        const lista = ruta.municipios || [];
        const n = norm(m.nombre || '');
        for (let i = 0; i < lista.length; i++) if (norm(lista[i]) === n) return true;
        return false;
    }
    function calcularMunicipiosDeRuta(coords) {
        if (!coords || !coords.length || !(APP.municipios || APP.municipiosRiesgo || []).length) return [];
        const set = new Set();
        const paso = Math.max(1, Math.floor(coords.length / 60));
        for (let i = 0; i < coords.length; i += paso) {
            const c = coords[i]; // [lon,lat]
            const m = municipioEn(c[1], c[0]);
            if (m && m.nombre) set.add(m.nombre);
        }
        return Array.from(set);
    }

