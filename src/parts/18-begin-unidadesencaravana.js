    /* === BEGIN: unidadesEnCaravana === */
    // Determina que unidades acompanial al "lider" en una misma ruta o muy
    // cerca. Una unidad cuenta como miembro si se proyecta a menos de
    // lateralM metros del eje (modo en ruta) o si esta a menos de cercaM
    // metros del lider aunque no toque la polilinea. Ademas se marca como
    // sentido contrario cuando su rumbo real difiere >130 grados del rumbo
    // del segmento de ruta donde se proyecta.
    function unidadesEnCaravana(infoLider, stLider) {
        const rutaLider = rutaDe(infoLider);
        const lateralM = Math.max(50, Number(APP.config.caravanaM) || 300);
        const cercaM = Math.max(200, Number(APP.config.caravanaCercaM) || 2000);
        // Sin posicion del lider no hay referencia para medir cercania; solo
        // podemos usar la proyeccion sobre la ruta.
        if (!stLider || !stLider.online || stLider.lat == null || stLider.lon == null) {
            return { miembros: [], rutaLider: rutaLider, snapLider: null };
        }
        let snapLider = null;
        if (rutaLider) {
            const memo = APP.snapMemo[infoLider.clave] || (APP.snapMemo[infoLider.clave] = { idx: 0 });
            snapLider = snapRuta(stLider.lat, stLider.lon, rutaLider, memo);
        }
        const miembros = [];
        const lista = APP.unidades || [];
        for (let i = 0; i < lista.length; i++) {
            const it = lista[i];
            const info = parseUnitName(it);
            if (!info || !info.clave) continue;
            if (info.clave === infoLider.clave) continue;
            const vigilada = shouldWatch(it);
            const st = unitState(it);
            if (!st || !st.online || st.lat == null || st.lon == null) continue;
            const distDirecta = haversine(stLider.lat, stLider.lon, st.lat, st.lon);
            let enRuta = false, contrario = false, snap = null;
            if (rutaLider) {
                snap = snapRuta(st.lat, st.lon, rutaLider, { idx: 0 });
                if (snap && snap.dist <= lateralM) {
                    enRuta = true;
                    if (st.vel > 3 && snap.rumbo != null && st.curso != null) {
                        contrario = difAngulo(st.curso, snap.rumbo) > 130;
                    }
                }
            }
            if (!enRuta && distDirecta > cercaM) continue;
            miembros.push({
                info: info,
                st: st,
                vigilada: vigilada,
                enRuta: enRuta,
                contrario: contrario,
                distDirecta: distDirecta,
                distEje: snap ? snap.dist : null,
                deltaRuta: (enRuta && snapLider) ? snap.recorrido - snapLider.recorrido : null,
                rumboRuta: snap ? snap.rumbo : null,
                snap: snap
            });
        }
        miembros.sort(function (a, b) {
            const da = (a.deltaRuta != null) ? a.deltaRuta : a.distDirecta;
            const db = (b.deltaRuta != null) ? b.deltaRuta : b.distDirecta;
            return da - db;
        });
        return { miembros: miembros, rutaLider: rutaLider, snapLider: snapLider };
    }
