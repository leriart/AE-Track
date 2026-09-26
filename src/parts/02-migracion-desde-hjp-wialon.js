    /* ====================== MIGRACION DESDE HJP WIALON ======================
     * Rondo es un proyecto nuevo (namespace/nombre distinto). Para que los
     * usuarios existentes conserven su configuracion, lista vigilada, rutas,
     * odometro y perfiles, copiamos las claves antiguas hjp.api.* -> rondo.api.*
     * y hjp.api.s.* -> rondo.api.s.* la primera vez que arranca el script.
     * COPIAMOS, no movemos: asi el script "HJP · Wialon" (si alguien conserva
     * la version anterior instalada) sigue funcionando con sus propios datos.
     * La marca de migracion evita repetir el trabajo en arranques sucesivos.
     */
    (function migrarDesdeHjp() {
        try {
            if (window.localStorage.getItem('rondo.api.migrated')) return;
            const pares = [
                ['hjp.api.cfg',      'rondo.api.cfg'],
                ['hjp.api.watch',    'rondo.api.watch'],
                ['hjp.api.memo',     'rondo.api.memo'],
                ['hjp.api.dismissed','rondo.api.dismissed'],
                ['hjp.api.hist',     'rondo.api.hist'],
                ['hjp.api.geo',      'rondo.api.geo'],
                ['hjp.api.barra',    'rondo.api.barra'],
                ['hjp.api.panelsize','rondo.api.panelsize'],
                ['hjp.api.nmolestar','rondo.api.nmolestar'],
                ['hjp.api.limites',  'rondo.api.limites'],
                ['hjp.api.perfiles', 'rondo.api.perfiles'],
                ['hjp.api.filtEstado','rondo.api.filtEstado'],
                ['hjp.api.sortCol',  'rondo.api.sortCol'],
                ['hjp.api.sortDir',  'rondo.api.sortDir'],
                ['hjp.api.rutas',    'rondo.api.rutas'],
                ['hjp.api.odometro', 'rondo.api.odometro'],
                ['hjp.api.s.watch',  'rondo.api.s.watch'],
                ['hjp.api.s.memo',   'rondo.api.s.memo'],
                ['hjp.api.s.dismissed','rondo.api.s.dismissed'],
                ['hjp.api.s.hist',   'rondo.api.s.hist'],
                ['hjp.api.s.geo',    'rondo.api.s.geo'],
                ['hjp.api.s.seleccion','rondo.api.s.seleccion'],
                ['hjp.api.s.kpi',    'rondo.api.s.kpi'],
                ['hjp.api.s.limites', 'rondo.api.s.limites'],
                ['hjp.api.s.orden',  'rondo.api.s.orden'],
                ['hjp.api.s.viajes', 'rondo.api.s.viajes'],
                ['hjp.api.s.filtEstado','rondo.api.s.filtEstado']
            ];
            for (let i = 0; i < pares.length; i++) {
                const from = pares[i][0], to = pares[i][1];
                const v = window.localStorage.getItem(from);
                if (v == null) continue;
                if (window.localStorage.getItem(to) == null) window.localStorage.setItem(to, v);
                // No borramos la clave antigua para no romper la version vieja.
            }
            window.localStorage.setItem('rondo.api.migrated', '1');
        } catch (_) { /* sin localStorage o bloqueado: continuar */ }
    })();

