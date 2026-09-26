    /* ====================== ACTUALIZACIONES ====================== */
    function pintarActualizacion() {
        const b = byId('rondo-actualizar');
        const u = APP.update;
        const bar = byId('rondo-btn-update');
        // v5.14.1: chip de version sincronizado en cada repintado.
        paintVersionChip();
        if (bar) {
            const ver = (u.state === 'available');
            const visible = bar.style.display !== 'none';
            if (visible !== ver) {
                bar.style.display = ver ? '' : 'none';
                try { placeBar(); } catch (_) { /* noop */ }
            }
            if (ver) {
                bar.innerHTML = '<span class="rondo-usym">' + UIS.refresh + '</span> Actualizar' + (u.remote ? ' ' + esc(u.remote) : '');
                bar.title = 'Actualizar a la version ' + esc(u.remote || '') + ' (instalada ' + u.local + ')';
            }
        }
        if (b) {
            b.classList.remove('warn');
            if (u.state === 'available') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.refresh;
                b.title = 'Actualizar a la version ' + u.remote + ' (instalada ' + u.local + ')';
            } else if (u.state === 'installed') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.refresh;
                b.title = 'Actualizacion instalada · recarga para aplicar';
            } else if (u.state === 'error') {
                b.style.display = '';
                b.classList.remove('activo');
                b.classList.add('warn');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.warn;
                b.title = 'No se pudo comprobar actualizaciones' + (u.lastError ? ' (' + u.lastError + ')' : '') + ' · clic para reintentar';
            } else {
                b.style.display = 'none';
                b.classList.remove('activo');
            }
        }
        pintarInfoUpdate();
    }
    function pintarInfoUpdate() {
        const el = byId('rondo-update-info');
        if (!el) return;
        const u = APP.update;
        let html = 'Version instalada: <b>' + VER + '</b>';
        if (u.remote) html += ' · remota: <b>' + esc(u.remote) + '</b>' + (u.canal ? ' (' + esc(u.canal) + ')' : '');
        if (u.state === 'checking') html += ' · comprobando...';
        else if (u.state === 'current' && u.lastCheck) html += ' · al dia (revisado ' + new Date(u.lastCheck).toLocaleTimeString() + ')';
        else if (u.state === 'available') html += ' · <b style="color:var(--rondo-accent-2)">actualizacion disponible</b>';
        else if (u.state === 'installed') html += ' · <b style="color:var(--rondo-accent-2)">actualizada · recarga</b>';
        else if (u.state === 'ahead') html += ' · <b style="color:var(--rondo-fg-dim)">build local ahead</b>';
        else if (u.state === 'unknown') html += ' · <b style="color:var(--rondo-warn-fg)">no se pudo comprobar</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
        else if (u.state === 'error') html += ' · <b style="color:var(--rondo-warn-fg)">error</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
        el.innerHTML = html;
    }
    // v5.14.1: chip de version en la cabecera del panel. Muestra la version
    // instalada con un color que refleja el estado del check de updates.
    function paintVersionChip() {
        const chip = byId('rondo-version-chip');
        if (!chip) return;
        const u = APP.update || {};
        let estado = u.state || 'idle';
        let titulo = 'Version instalada: ' + VER;
        if (estado === 'idle') {
            titulo = 'Version ' + VER + ' · comprobando...';
        } else if (estado === 'checking') {
            estado = 'checking';
            titulo = 'Comprobando actualizaciones...';
        } else if (estado === 'current') {
            titulo = 'Version ' + VER + ' al dia' + (u.remote ? ' (remota: ' + u.remote + ')' : '') +
                (u.lastCheck ? ' · ultima comprobacion ' + new Date(u.lastCheck).toLocaleString() : '') +
                ' · clic para re-comprobar';
        } else if (estado === 'available') {
            titulo = 'Actualizacion disponible: ' + VER + ' -> ' + u.remote + ' · clic para aplicar';
        } else if (estado === 'ahead') {
            titulo = 'Build local por delante de la version remota (' + (u.remote || '?') + ')';
        } else if (estado === 'unknown') {
            titulo = 'No se pudo comprobar actualizaciones' + (u.lastError ? ': ' + u.lastError : '') + ' · clic para reintentar';
        } else if (estado === 'error') {
            titulo = 'Error comprobando actualizaciones · clic para reintentar';
        } else if (estado === 'installed') {
            titulo = 'Actualizacion instalada · recarga para aplicar';
        }
        chip.dataset.estado = estado;
        chip.title = titulo;
        const label = chip.querySelector('.rondo-version-label');
        if (label && estado === 'available' && u.remote) {
            // Mostrar "v5.14.0 -> 5.14.1" cuando hay update.
            label.textContent = 'v' + VER + ' -> ' + u.remote;
        } else if (label) {
            label.textContent = 'v' + VER;
        }
    }
    async function fetchVersionRemota(url) {
        // v5.14.1: usar httpRequest() en vez de fetch() directo.
        // raw.githubusercontent.com NO envia Access-Control-Allow-Origin,
        // asi que fetch desde el realm de la pagina falla por CORS.
        // httpRequest() cae a GM_xmlhttpRequest (que el sandbox del
        // userscript SI permite para URLs listadas en @connect).
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        const res = await httpRequest({
            method: 'GET',
            url: url + sep + 't=' + Date.now(),
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
            timeoutMs: UPDATE_HTTP_TIMEOUT_MS
        });
        if (res.red) throw new Error(res.timeout ? 'timeout' : 'red');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const v = parseVersionHeader(res.texto || '');
        if (!v) throw new Error('version no encontrada');
        return v;
    }
    async function comprobarActualizacion() {
        APP.update.state = 'checking';
        pintarActualizacion();
        const intentos = []; // {fuente, ok, v, error}
        // Fuente 1: canal main (raw.githubusercontent.com via httpRequest).
        try {
            const v = await fetchVersionRemota(UPDATE_URL);
            intentos.push({ fuente: 'main', ok: true, v });
            const cmp = cmpVersion(v, VER);
            APP.update.remote = v;
            APP.update.canal = 'main';
            APP.update.url = UPDATE_URL;
            APP.update.lastCheck = Date.now();
            guardarUpdatePersistente();
            log('update check (main):', 'instalada', VER, '· remota', v, '· cmp', cmp);
            return finalizarUpdate(cmp, v, 'main', UPDATE_URL);
        } catch (e1) {
            intentos.push({ fuente: 'main', ok: false, error: (e1 && e1.message) || 'fail' });
        }
        // Fuente 2: canal dev (solo si la copia instalada va por delante
        // de main: seria absurdo reportar dev si la main ya es mas nueva).
        if (intentos[0].ok && cmpVersion(VER, intentos[0].v) > 0) {
            try {
                const v = await fetchVersionRemota(UPDATE_URL_DEV);
                intentos.push({ fuente: 'dev', ok: true, v });
                const cmp = cmpVersion(v, VER);
                APP.update.remote = v;
                APP.update.canal = 'dev';
                APP.update.url = UPDATE_URL_DEV;
                APP.update.lastCheck = Date.now();
                guardarUpdatePersistente();
                log('update check (dev):', 'instalada', VER, '· remota', v, '· cmp', cmp);
                return finalizarUpdate(cmp, v, 'dev', UPDATE_URL_DEV);
            } catch (e2) {
                intentos.push({ fuente: 'dev', ok: false, error: (e2 && e2.message) || 'fail' });
            }
        }
        // Fuente 3: GitHub API -> contents/changelogs (CORS-friendly).
        // Devuelve JSON con la lista de archivos del directorio; el mas
        // alto en version semantica es la ultima publicada.
        try {
            const v = await fetchVersionDesdeChangelogs();
            if (v) {
                intentos.push({ fuente: 'changelogs', ok: true, v });
                const cmp = cmpVersion(v, VER);
                APP.update.remote = v;
                APP.update.canal = 'main';
                APP.update.url = UPDATE_URL;
                APP.update.lastCheck = Date.now();
                guardarUpdatePersistente();
                log('update check (changelogs):', 'instalada', VER, '· remota', v, '· cmp', cmp);
                return finalizarUpdate(cmp, v, 'main', UPDATE_URL);
            }
            intentos.push({ fuente: 'changelogs', ok: false, error: 'sin changelogs' });
        } catch (e3) {
            intentos.push({ fuente: 'changelogs', ok: false, error: (e3 && e3.message) || 'fail' });
        }
        // Todas las fuentes fallaron -> estado 'unknown'. NO mentimos
        // diciendo que esta al dia.
        APP.update.state = 'unknown';
        APP.update.lastError = intentos.map((i) => i.fuente + ':' + (i.error || '?')).join(', ');
        APP.update.lastCheck = Date.now();
        guardarUpdatePersistente();
        try { console.warn('[Rondo] update check failed:', APP.update.lastError); } catch (_) { /* noop */ }
        pintarActualizacion();
    }
    function finalizarUpdate(cmp, remote, canal, url) {
        APP.update.local = VER;
        if (cmp > 0) {
            APP.update.state = 'available';
            pintarActualizacion();
            if (!APP.update.notificado) {
                APP.update.notificado = true;
                advice('Nueva version disponible',
                    remote + ' (instalada ' + VER + ') · canal ' + canal +
                    '. Abre Ajustes > Avanzado > Buscar actualizaciones para aplicar.');
            }
        } else if (cmp < 0) {
            // Instalada por delante de la remota (build local de desarrollo).
            APP.update.state = 'ahead';
            pintarActualizacion();
        } else {
            APP.update.state = 'current';
            pintarActualizacion();
        }
        // Pintar chip de version despues de cualquier transicion de estado.
        paintVersionChip();
    }
    function guardarUpdatePersistente() {
        try {
            const persist = {
                remote: APP.update.remote || '',
                canal: APP.update.canal || '',
                url: APP.update.url || '',
                state: APP.update.state || '',
                lastCheck: APP.update.lastCheck || 0,
                lastError: APP.update.lastError || ''
            };
            localStorage.setItem('rondo.api.update', JSON.stringify(persist));
        } catch (_) { /* noop */ }
    }
    function cargarUpdatePersistente() {
        try {
            const raw = localStorage.getItem('rondo.api.update');
            if (!raw) return;
            const j = JSON.parse(raw);
            if (!j || typeof j !== 'object') return;
            if (j.remote) APP.update.remote = j.remote;
            if (j.canal) APP.update.canal = j.canal;
            if (j.url) APP.update.url = j.url;
            if (j.lastCheck) APP.update.lastCheck = j.lastCheck;
            if (j.lastError) APP.update.lastError = j.lastError;
            // Solo restauramos 'current'/'unknown'; los estados 'available'
            // y 'ahead' se recomprueban en cada arranque (no se fia de
            // una respuesta cacheada que podria estar desactualizada).
            if (j.state === 'current' || j.state === 'unknown') {
                APP.update.state = j.state;
            }
        } catch (_) { /* noop */ }
    }
    // Tercer fallback: lista el directorio changelogs/ de GitHub.
    // api.github.com SI envia Access-Control-Allow-Origin: * (es una
    // API publica), asi que funciona tanto con fetch como con GM_xmlhttpRequest.
    async function fetchVersionDesdeChangelogs() {
        const res = await httpRequest({
            method: 'GET',
            url: UPDATE_CHANGELOGS_API,
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            timeoutMs: UPDATE_HTTP_TIMEOUT_MS
        });
        if (res.red) throw new Error('red');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let data;
        try { data = JSON.parse(res.texto || '[]'); } catch (_) { return null; }
        if (!Array.isArray(data)) return null;
        // Cada item tiene { name, type, ... }. Filtramos .md y extraemos
        // version del nombre; nos quedamos con la mayor.
        let mejor = null;
        for (const it of data) {
            if (!it || it.type !== 'file') continue;
            const v = parseVersionFromFilename(it.name || '');
            if (!v) continue;
            if (!mejor || cmpVersion(v, mejor) > 0) mejor = v;
        }
        return mejor;
    }
    function recargarUnaVez() {
        if (APP.update.recargando) return;
        APP.update.recargando = true;
        try { location.reload(); } catch (_) { /* noop */ }
    }
    function aplicarActualizacion() {
        const u = APP.update;
        if (u.state === 'available') {
            u.state = 'installed';
            pintarActualizacion();
            const url = u.url || UPDATE_URL;
            // Abre la URL de instalacion: Tampermonkey/Violentmonkey mostrara el
            // dialogo de actualizacion con la nueva version.
            let abierto = null;
            try { abierto = window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
            if (!abierto) { try { location.href = url; return; } catch (_) { /* noop */ } }
            advice('Actualizando a ' + (u.remote || 'la nueva version'), 'confirma la instalacion en Tampermonkey; al volver se recargara sola');
            // Al volver a esta pestaña, recarga para aplicar la version nueva.
            const alVolver = () => {
                setTimeout(recargarUnaVez, 900);
            };
            window.addEventListener('focus', alVolver, { once: true });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) alVolver();
            }, { once: true });
        } else if (u.state === 'installed') {
            recargarUnaVez();
        } else {
            comprobarActualizacion();
        }
    }

    function exportConfig() {
        const data = {
            version: 6, ts: Date.now(),
            config: APP.config, barra: APP.barra,
            seleccion: Array.from(APP.seleccion), dismissed: Array.from(APP.dismissed),
            watchMap: APP.watchMap, limites: APP.limites, rutas: APP.rutas, planes: APP.planes,
            panelSize: APP.panelSize
        };
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })) });
        a.download = 'rondo_config_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('Configuración exportada');
    }
    function importConfig() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json';
        inp.addEventListener('change', () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                try {
                    const d = JSON.parse(r.result);
                    if (!d || typeof d !== 'object') throw new Error('JSON invalido');
                    if (d.config && typeof d.config === 'object') APP.config = deepMerge(d.config, DEFAULTS);
                    writeJSON(LS.cfg, APP.config);
                    if (d.barra && typeof d.barra === 'object') APP.barra = d.barra;
                    writeJSON(LS.barra, APP.barra);
                    if (Array.isArray(d.seleccion)) { APP.seleccion = new Set(d.seleccion); writeSession(SS.seleccion, Array.from(APP.seleccion)); }
                    if (Array.isArray(d.dismissed)) { APP.dismissed = new Set(d.dismissed); writeSession(SS.dismissed, Array.from(APP.dismissed)); }
                    if (d.watchMap && typeof d.watchMap === 'object') {
                        APP.watchMap = d.watchMap;
                        writeSession(SS.watch, APP.watchMap);
                        APP.orden = Object.keys(APP.watchMap);
                        guardarOrden();
                    }
                    if (d.limites && typeof d.limites === 'object') { APP.limites = d.limites; writeSession(SS.limites, APP.limites); }
                    if (d.rutas && typeof d.rutas === 'object') { APP.rutas = d.rutas; guardarRutas(); }
                    if (d.planes && typeof d.planes === 'object') { APP.planes = d.planes; guardarPlanes(); }
                    if (d.panelSize) { APP.panelSize = d.panelSize; writeJSON(LS.panelsize, APP.panelSize); }
                    applyBar(); applyTheme();
                    refresh();
                    paintIASwitch();
                    paintAlertas();
                    adviceOk('Configuración importada');
                } catch (e) {
                    adviceErr('Error importando', (e && e.message) || '');
                }
            };
            r.readAsText(f);
        });
        inp.click();
    }
    function pintarPerfiles() {
        const sel = byId('rondo-perfil-sel');
        if (!sel) return;
        const nombres = Object.keys(APP.perfiles).sort((a, b) => a.localeCompare(b));
        sel.innerHTML = nombres.length
            ? nombres.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('')
            : '<option value="">(sin perfiles)</option>';
    }
    function guardarPerfil(nombre) {
        if (!nombre) return false;
        APP.perfiles[nombre] = {
            config: JSON.parse(JSON.stringify(APP.config)),
            limites: JSON.parse(JSON.stringify(APP.limites)),
            ts: Date.now()
        };
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        const sel = byId('rondo-perfil-sel');
        if (sel) sel.value = nombre;
        return true;
    }
    function cargarPerfil(nombre) {
        const p = APP.perfiles[nombre];
        if (!p) return false;
        if (p.config) { APP.config = deepMerge(p.config, DEFAULTS); writeJSON(LS.cfg, APP.config); }
        if (p.limites) { APP.limites = p.limites; writeSession(SS.limites, APP.limites); }
        applyBar();
        applyTheme();
        restartTimers();
        refresh();
        return true;
    }
    function borrarPerfil(nombre) {
        if (!nombre || !APP.perfiles[nombre]) return false;
        delete APP.perfiles[nombre];
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        return true;
    }
    function limpiarBitacora() {
        const n = APP.historial.length;
        APP.historial = [];
        writeSession(SS.hist, APP.historial);
        paintCounters();
        if (APP.tab === 'alertas') paintAlertas();
        if (APP.tab === 'dash') paintKPI();
        paintStateBadge();
        return n;
    }
    function testNotify() {
        const previo = APP.noMolestar;
        APP.noMolestar = null;
        pushAlert({
            regla: 'test', sev: 'medio', eco: 'TEST', clave: 'TEST',
            titulo: 'TEST · Aviso de prueba',
            detalle: 'Comprueba voz, pitido, toast y notificacion del navegador',
            hablar: 'Aviso de prueba de la unidad 4340'
        });
        APP.noMolestar = previo;
    }

