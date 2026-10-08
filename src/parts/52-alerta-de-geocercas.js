/* ====================== ALERTA DE GEOCERCAS: NUCLEO ======================
 * Vigilancia dirigida: el operador elige una o varias geocercas de la
 * plataforma y Rondo avisa SOLO de lo que pase dentro de ellas. Completa a
 * las reglas globales (que miran cualquier geocerca y cualquier unidad):
 *
 *   - que geocercas importan (seleccion),
 *   - a quien se vigila (solo la lista vigilada o toda la flota),
 *   - con que gravedad se avisa,
 *   - y QUE dispara: solo pasar, quedarse parado, o pararse con el motor
 *     apagado.
 *
 * Por que NO reutiliza reglaGeocerca: aquella avisa de entrar y salir de
 * CUALQUIER geocerca, para las unidades vigiladas, y con severidad fija.
 * Aqui la severidad, el ambito y el disparador los elige el operador, y la
 * unidad vigilada por defecto es la lista vigilada.
 *
 * El nucleo de este fragmento es puro (no toca DOM ni red) para poder
 * probarlo aislado en tests/geocerca-alerta.test.js.
 */
const GEO_ALERTA_SEP = ' | ';
const GEO_ALERTA_MAX_ZONAS = 40;
// Margen (m) para DAR LA SALIDA de una geocerca. Sin el, un vehiculo parado
// en el borde alterna dentro/fuera cada reporte y el episodio nunca termina.
const GEO_ALERTA_MARGEN_M = 40;
// Por debajo de esta velocidad (km/h) la unidad se considera parada.
const GEO_ALERTA_VEL_PARADA = 1.5;
// Campos personalizados donde una instalacion puede publicar el estado del
// motor/ignicion. Si no hay ninguno, se estima por el corte de reporte.
const GEO_ALERTA_MOTOR_KEYS = Object.freeze([
    'ENGINE', 'ENG', 'ENGINESTATUS', 'IGNITION', 'IGNITIONSTATUS', 'ACC', 'MOTOR',
    'ENCENDIDO', 'IGNICION', 'ENGINEOPERATION', 'MOTORON', 'STATUSMOTOR'
]);
// Los tres disparadores que el operador puede elegir.
const GEO_ALERTA_DISPAROS = Object.freeze({
    paso: { txt: 'Solo pas\u00f3', corto: 'paso', icono: 'zone' },
    detenida: { txt: 'Se detuvo', corto: 'detenida', icono: 'stopped' },
    motor: { txt: 'Se detuvo y apag\u00f3 el motor', corto: 'motor', icono: 'offline' }
});
// Gravedad, de menos a mas (el panel las pinta en este orden).
const GEO_ALERTA_SEVS = Object.freeze([
    { k: 'bajo', txt: 'Baja' },
    { k: 'medio', txt: 'Media' },
    { k: 'alto', txt: 'Alta' },
    { k: 'critico', txt: 'Cr\u00edtica' }
]);

function geoAlertaNum(v, def) {
    const n = Number(v);
    return (v == null || !Number.isFinite(n)) ? def : n;
}
// Lectura normalizada de la configuracion: nunca lanza ni deja campos
// raros (un cfg editado a mano o de una version vieja no puede romper el
// refresco). Todo lo que decide la regla pasa por aqui.
function geoAlertaCfg() {
    const cfg = (APP && APP.config) || {};
    const g = cfg.geoAlertas || {};
    const sev = GEO_ALERTA_SEVS.some((s) => s.k === g.severidad) ? g.severidad : DEFAULTS.geoAlertas.severidad;
    return {
        activa: !!(cfg.reglas && cfg.reglas.geoAlerta),
        zonas: geoAlertaNombres(g.zonas),
        alcance: (g.alcance === 'todas') ? 'todas' : 'vigiladas',
        severidad: sev,
        disparo: GEO_ALERTA_DISPAROS[g.disparo] ? g.disparo : DEFAULTS.geoAlertas.disparo,
        minMin: clamp(geoAlertaNum(g.minMin, DEFAULTS.geoAlertas.minMin), 1, 240),
        motorMin: clamp(geoAlertaNum(g.motorMin, DEFAULTS.geoAlertas.motorMin), 1, 720),
        estableSeg: clamp(geoAlertaNum(g.estableSeg, DEFAULTS.geoAlertas.estableSeg), 0, 600),
        cooldownS: clamp(geoAlertaNum(g.cooldownS, 0), 0, 86400)
    };
}
// La seleccion es texto con ' | ' (mismo formato que los planes multipunto):
// se parsea aqui y se serializa en geoAlertaGuarda.
function geoAlertaNombres(txt) {
    const s = String(txt == null ? '' : txt);
    if (!s) return [];
    const out = [];
    for (const p of s.split(GEO_ALERTA_SEP)) {
        const n = p.trim();
        if (n && out.indexOf(n) < 0 && out.length < GEO_ALERTA_MAX_ZONAS) out.push(n);
    }
    return out;
}
function geoAlertaTexto(nombres) {
    return (nombres || []).filter(Boolean).slice(0, GEO_ALERTA_MAX_ZONAS).join(GEO_ALERTA_SEP);
}
// Set de nombres seleccionados (para consultas O(1) al pintar).
function geoAlertaSel(cfg) {
    const c = cfg || geoAlertaCfg();
    return new Set(c.zonas);
}
// Geocercas de la plataforma que estan en la seleccion. Las que ya no
// existen (borradas en la plataforma) se ignoran: el nombre guardado solo
// sobrevive hasta que la geocerca vuelve.
function geoAlertaZonasDe(cfg) {
    const c = cfg || geoAlertaCfg();
    if (!c.zonas.length) return [];
    const sel = new Set(c.zonas);
    const out = [];
    for (const z of (APP.zonas || [])) {
        if (!z) continue;
        const nom = z.n || ('Zona ' + z.id);
        if (sel.has(nom)) out.push(z);
    }
    return out;
}
// Pertenencia con margen: la entrada exige estar dentro (inZone), la salida
// exige estar fuera del bbox ampliado. Asi el borde no genera parpadeo.
function geoAlertaDentro(z, lat, lon, margen) {
    if (!z || lat == null || lon == null) return false;
    try {
        if (inZone(lat, lon, z)) return true;
        const mg = geoAlertaNum(margen, 0);
        if (mg <= 0) return false;
        const b = z.b;
        if (!b || b.min_x == null || b.min_y == null) return false;
        const mx = 111320 * Math.cos(lat * Math.PI / 180) || 111320;
        const dl = mg / mx, da = mg / 110540;
        return (+lon >= b.min_x - dl && +lon <= b.max_x + dl &&
            +lat >= b.min_y - da && +lat <= b.max_y + da);
    } catch (_) { return false; }
}
// Estado del motor: 1) sensor (campo personalizado de la unidad) si la
// instalacion lo publica; 2) estimado por el corte de reporte: una unidad
// parada que lleva motorMin sin reportar posicion dejo de emitir, y la causa
// tipica es el motor apagado. Es la misma heuristica que usa el Replay.
function geoAlertaMotor(u, st, motorMin) {
    const flds = u && u.flds;
    if (flds && typeof flds === 'object') {
        for (const k of Object.keys(flds)) {
            if (GEO_ALERTA_MOTOR_KEYS.indexOf(norm(k).replace(/[^A-Z0-9]/g, '')) < 0) continue;
            const v = flds[k];
            if (v === true || v === 1) return { off: false, fuente: 'sensor' };
            if (v === false || v === 0) return { off: true, fuente: 'sensor' };
            const s = String(v).trim().toLowerCase();
            if (s === '1' || s === 'on' || s === 'true' || s === 'encendido') return { off: false, fuente: 'sensor' };
            if (s === '0' || s === 'off' || s === 'false' || s === 'apagado') return { off: true, fuente: 'sensor' };
        }
    }
    if (!st || geoAlertaNum(st.vel, 0) > GEO_ALERTA_VEL_PARADA) return { off: false, fuente: 'en marcha' };
    const gap = Math.max(0, geoAlertaNum(st.edadMin, 0));
    return { off: gap >= clamp(geoAlertaNum(motorMin, 15), 1, 720), fuente: 'gap' };
}
// Maquina de estados de UNA geocerca y UNA unidad. Devuelve el estado
// siguiente y el evento a emitir en este tick (o null).
//
// e (estado previo, se persiste en R.geoAlerta por geocerca):
//   d  dentro confirmado · p  entrada pendiente · ps  inicio del pendiente
//   ds desde cuando esta parada dentro · da ya aviso "detenida"
//   ms desde cuando el motor esta apagado · ma ya aviso "motor"
//
// o (observacion del tick): dentro, vel, online, motorOff, motorAntiguedadMin,
// ahora (segundos) y cfg {estableSeg, minMin, motorMin, disparo}.
//
// Sin estado previo se toma la foto inicial sin avisar: si la regla se
// activa con una unidad ya dentro, no queremos un "ha pasado" fantasma.
function geoAlertaEvalua(e, o) {
    const d = DEFAULTS.geoAlertas;
    const cfg = o.cfg || {};
    const estSeg = clamp(geoAlertaNum(cfg.estableSeg, d.estableSeg), 0, 600);
    const minMin = clamp(geoAlertaNum(cfg.minMin, d.minMin), 1, 240);
    const motorMin = clamp(geoAlertaNum(cfg.motorMin, d.motorMin), 1, 720);
    const disparo = GEO_ALERTA_DISPAROS[cfg.disparo] ? cfg.disparo : d.disparo;
    const ahora = geoAlertaNum(o.ahora, Math.floor(Date.now() / 1000));
    const dentro = !!o.dentro;
    const online = (o.online !== false);
    const vel = geoAlertaNum(o.vel, 0);
    const n = {
        d: e && e.d ? 1 : 0, p: e && e.p ? 1 : 0, ps: e ? geoAlertaNum(e.ps, 0) : 0,
        ds: e ? geoAlertaNum(e.ds, 0) : 0, da: e && e.da ? 1 : 0,
        ms: e ? geoAlertaNum(e.ms, 0) : 0, ma: e && e.ma ? 1 : 0
    };
    const salida = { e: n, evento: null, minutos: 0, minutosMotor: 0, dentro: false };
    if (!dentro) {
        // Salida confirmada: el episodio se rearma por completo.
        n.d = 0; n.p = 0; n.ps = 0; n.ds = 0; n.da = 0; n.ms = 0; n.ma = 0;
        return salida;
    }
    if (!e) {
        // Foto inicial: la unidad ya estaba dentro cuando se creo el estado.
        n.d = 1;
        salida.dentro = true;
        salida.e = n;
        return salida;
    }
    // Histeresis de entrada: con estableSeg 0 confirma en el mismo tick. Sin
    // senal no se confirma nada (su ultima posicion puede ser de hace
    // media hora), salvo con el disparador de motor: ese busca justamente
    // el corte de reporte, asi que trabaja con la posicion congelada.
    const puede = online || disparo === 'motor';
    if (!n.d && puede) {
        if (!n.p) { n.p = 1; n.ps = ahora; }
        if ((ahora - n.ps) >= estSeg) { n.d = 1; n.p = 0; n.ps = 0; }
    }
    // Parada dentro de la geocerca (solo con la unidad reportando).
    const entra = (n.d === 1 && e.d !== 1);
    if (vel > GEO_ALERTA_VEL_PARADA) {
        n.ds = 0; n.da = 0; n.ms = 0; n.ma = 0;
    } else if (online && !n.ds) {
        n.ds = ahora;
    }
    // Motor apagado: solo cuenta si la unidad esta parada y dentro. El corte
    // de reporte se data hacia atras (motorAntiguedadMin) para no pedir N
    // minutos adicionales de los que la unidad lleva ya apagada.
    if (n.d && o.motorOff && vel <= GEO_ALERTA_VEL_PARADA) {
        if (!n.ms) n.ms = ahora - Math.max(0, geoAlertaNum(o.motorAntiguedadMin, 0)) * 60;
    } else if (online || vel > GEO_ALERTA_VEL_PARADA) {
        n.ms = 0;
    }
    if (n.d) {
        salida.dentro = true;
        salida.minutos = n.ds ? Math.max(0, (ahora - n.ds) / 60) : 0;
        salida.minutosMotor = n.ms ? Math.max(0, (ahora - n.ms) / 60) : 0;
        if (entra && disparo === 'paso') {
            salida.evento = 'paso';
        } else if (disparo === 'detenida' && !n.da && salida.minutos >= minMin) {
            n.da = 1;
            salida.evento = 'detenida';
        } else if (disparo === 'motor' && !n.ma && salida.minutosMotor >= motorMin) {
            n.ma = 1;
            salida.evento = 'motor';
        }
    }
    return salida;
}
// Cooldown propio de la alerta (por unidad + geocerca). Si el operador lo
// deja en 0 se usa el cooldown global de alertas, que ya aplica pushAlert.
function geoAlertaPermitido(clave, zona, cfg, ahora) {
    if (!APP.cooldowns) return true;
    const seg = Math.max(1, (Number(cfg && cfg.cooldownS) || 0));
    const ck = 'geoAlerta::' + clave + '::' + zona;
    const t = geoAlertaNum(ahora, Date.now());
    const cd = seg * 1000;
    if (APP.cooldowns[ck] && (t * 1000) - APP.cooldowns[ck] < cd) return false;
    APP.cooldowns[ck] = t * 1000;
    return true;
}

/* ====================== ALERTA DE GEOCERCAS: MOTOR ====================== */
function geoAlertaTextoEvento(evento, zona, etq, minutos) {
    const m = Math.max(0, Math.round(minutos));
    if (evento === 'paso') {
        return {
            titulo: 'PASO POR GEOCERCA \u00b7 ' + zona + ' \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' pas\u00f3 por la geocerca vigilada ' + zona,
            hablar: 'La unidad ' + etq + ' pas\u00f3 por la geocerca ' + zona
        };
    }
    if (evento === 'motor') {
        return {
            titulo: 'MOTOR APAGADO EN GEOCERCA \u00b7 ' + zona + ' \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' lleva ' + m + ' min detenida con el motor apagado dentro de la geocerca vigilada ' + zona,
            hablar: 'La unidad ' + etq + ' est\u00e1 detenida con el motor apagado en la geocerca ' + zona
        };
    }
    return {
        titulo: 'DETENIDA EN GEOCERCA VIGILADA \u00b7 ' + zona + ' \u00b7 ' + etq,
        detalle: 'La unidad ' + etq + ' lleva ' + m + ' min detenida dentro de la geocerca vigilada ' + zona,
        hablar: 'La unidad ' + etq + ' est\u00e1 detenida en la geocerca ' + zona
    };
}
// Suavizado de velocidad para las unidades que no son vigiladas (el motor
// normal ya lo hace en evaluateUnit). Misma media exponencial ponderada por
// tiempo que alli, para que el umbral de parada no baile con el GPS.
function geoAlertaSuaviza(info, st) {
    const clave = info && info.clave;
    if (!clave || !st || !Number.isFinite(st.vel)) return;
    const pv = APP.velSuave[clave];
    const ahoraS = Date.now() / 1000;
    if (pv == null) {
        APP.velSuave[clave] = st.vel;
        APP.velSuaveTs[clave] = ahoraS;
        return;
    }
    const pollSeg = Math.max(1, (Number(APP.config.pollMs) || 10000) / 1000);
    const dtSeg = APP.velSuaveTs[clave] ? (ahoraS - APP.velSuaveTs[clave]) : pollSeg;
    const a = alphaEMA(dtSeg, pollSeg * 2.32);
    APP.velSuave[clave] = pv * (1 - a) + st.vel * a;
    APP.velSuaveTs[clave] = ahoraS;
}
// Regla de la alerta. Se llama desde evaluateUnit (unidades vigiladas) y
// desde geoAlertaFlota (flota completa). Lee el estado de R.geoAlerta y lo
// sustituye por el del tick; publica en APP.geoAlertaVivo lo que la UI
// pinta como "ahora".
function reglaGeoAlerta(u, info, st, R) {
    const cfg = geoAlertaCfg();
    // El estado previo vive en R.geoAlerta: evaluateUnit lo inicializa con
    // el memo de la unidad y la flota completa lo pasa a mano.
    const estado = (R.geoAlerta && typeof R.geoAlerta === 'object') ? R.geoAlerta : {};
    const clave = (info && info.clave) || '';
    // El "vivo" se repone al final si la unidad sigue dentro de una
    // geocerca vigilada; hasta entonces sale de la lista en vivo.
    if (clave) delete APP.geoAlertaVivo[clave];
    if (!cfg.activa || !cfg.zonas.length || !APP.config.loadZones) {
        R.geoAlerta = null;
        return;
    }
    if (!info || !info.clave || !st || st.lat == null || st.lon == null) return;
    const zonas = geoAlertaZonasDe(cfg);
    if (!zonas.length) { R.geoAlerta = null; return; }
    const ahora = Math.floor(Date.now() / 1000);
    const etq = (info.eco || info.placa || info.nombre || info.id || '');
    const vel = geoAlertaNum(velSuavizada(info, st), st.vel);
    const mot = geoAlertaMotor(u, st, cfg.motorMin);
    const antiguedad = mot.off ? Math.max(0, geoAlertaNum(st.edadMin, 0)) : 0;
    const nuevo = {};
    let vivo = null;
    for (let i = 0; i < zonas.length; i++) {
        const z = zonas[i];
        const nom = z.n || ('Zona ' + z.id);
        const e0 = estado[nom];
        const res = geoAlertaEvalua(e0, {
            dentro: geoAlertaDentro(z, st.lat, st.lon, (e0 && e0.d) ? GEO_ALERTA_MARGEN_M : 0),
            vel: vel,
            online: st.online,
            motorOff: mot.off,
            motorAntiguedadMin: antiguedad,
            ahora: ahora,
            cfg: cfg
        });
        nuevo[nom] = res.e;
        if (res.dentro) {
            // "cumple" es si AHORA se cumple el disparador elegido: lo que
            // cuenta para el KPI "En alerta" y para resaltar la fila en vivo.
            const cumple = (cfg.disparo === 'paso') ||
                (cfg.disparo === 'detenida' ? res.minutos >= cfg.minMin : res.minutosMotor >= cfg.motorMin);
            const v = {
                zona: nom,
                minutos: res.minutos,
                minutosMotor: res.minutosMotor,
                motor: res.minutosMotor > 0,
                cumple: cumple,
                vel: vel,
                disparo: cfg.disparo
            };
            if (!vivo || (v.cumple && !vivo.cumple) || v.minutos > vivo.minutos) vivo = v;
        }
        if (res.evento && geoAlertaPermitido(info.clave, nom, cfg, ahora)) {
            const mins = (res.evento === 'motor') ? res.minutosMotor : res.minutos;
            const t = geoAlertaTextoEvento(res.evento, nom, etq, mins);
            pushAlert({
                regla: 'geoAlerta', sev: cfg.severidad, clave: info.clave, eco: info.eco,
                icono: (GEO_ALERTA_DISPAROS[cfg.disparo] || GEO_ALERTA_DISPAROS.paso).icono,
                titulo: t.titulo, detalle: t.detalle, hablar: t.hablar,
                lat: st.lat, lon: st.lon
            });
        }
    }
    R.geoAlerta = nuevo;
    if (vivo && clave) APP.geoAlertaVivo[clave] = vivo;
}
// Segunda pasada del refresco para el alcance "toda la flota": el motor
// normal solo evalua las unidades vigiladas, asi que las demas se recorren
// aqui SOLO para esta regla (sinodometro, sin traza, sin reglas globales).
// Tambien poda el estado vivo de unidades que ya no reportan.
function geoAlertaFlota(unidades, clavesVigiladas) {
    const cfg = geoAlertaCfg();
    const lista = unidades || [];
    if (!cfg.activa || cfg.alcance !== 'todas' || !cfg.zonas.length || !APP.config.loadZones) {
        if (Object.keys(APP.memoGeoAlerta || {}).length) {
            APP.memoGeoAlerta = {};
            writeSession(SS.geoAlerta, APP.memoGeoAlerta);
        }
        geoAlertaPodaVivo(lista);
        return;
    }
    const memo = {};
    for (let i = 0; i < lista.length; i++) {
        const u = lista[i];
        const info = parseUnitName(u);
        if (!info.clave || (clavesVigiladas && clavesVigiladas[info.clave])) continue;
        const st = unitState(u);
        if (st.lat == null || st.lon == null) continue;
        const prev = (APP.memoGeoAlerta || {})[info.clave];
        const R = { geoAlerta: (prev && prev.g) || null };
        try {
            geoAlertaSuaviza(info, st);
            reglaGeoAlerta(u, info, st, R);
            memo[info.clave] = { g: R.geoAlerta };
        } catch (e) {
            if (APP.unlocked) console.warn('[Rondo] geoAlerta', info.clave, e && e.message);
        }
    }
    APP.memoGeoAlerta = memo;
    writeSession(SS.geoAlerta, memo);
    geoAlertaPodaVivo(lista);
}
// Quit del estado vivo las unidades que ya no vienen de la plataforma.
function geoAlertaPodaVivo(unidades) {
    const vivo = APP.geoAlertaVivo;
    if (!vivo || !Object.keys(vivo).length) return;
    const hay = {};
    for (const u of (unidades || [])) {
        const info = parseUnitName(u);
        if (info.clave) hay[info.clave] = 1;
    }
    for (const k of Object.keys(vivo)) {
        if (!hay[k]) delete vivo[k];
    }
}
// Al cambiar la seleccion (o el interruptor) los episodios anteriores ya no
// significan nada: se limpian para que la alerta no salte con estado viejo.
function geoAlertaReinicia() {
    APP.memoGeoAlerta = {};
    writeSession(SS.geoAlerta, APP.memoGeoAlerta);
    APP.geoAlertaVivo = {};
    const memo = APP.memo || {};
    let cambio = false;
    for (const k of Object.keys(memo)) {
        if (memo[k] && memo[k].geoAlerta) { delete memo[k].geoAlerta; cambio = true; }
    }
    if (cambio) writeSession(SS.memo, memo);
}

/* ====================== ALERTA DE GEOCERCAS: UI ====================== */
function geoAlertaGuarda(cambios) {
    if (!APP.config.geoAlertas) APP.config.geoAlertas = Object.assign({}, DEFAULTS.geoAlertas);
    Object.assign(APP.config.geoAlertas, cambios || {});
    writeJSON(LS.cfg, APP.config);
    // Los episodios se limpian solo si cambian el QUE (geocercas o
    // disparador) o el interruptor: retocar la gravedad o los minutos no
    // debe reiniciar el reloj de una parada que ya se esta midiendo.
    const c = cambios || {};
    if (!Object.keys(c).length || c.zonas !== undefined || c.disparo !== undefined) geoAlertaReinicia();
    if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
}
// Alterna una geocerca de la seleccion desde la campana de su tarjeta.
function geoAlertaAlternaZona(nombre) {
    const cfg = geoAlertaCfg();
    const sel = cfg.zonas.slice();
    const i = sel.indexOf(nombre);
    if (i >= 0) sel.splice(i, 1);
    else if (sel.length >= GEO_ALERTA_MAX_ZONAS) {
        adviceWarn('Limite de geocercas', 'Se pueden vigilar hasta ' + GEO_ALERTA_MAX_ZONAS + ' geocercas por alerta.');
        return;
    } else sel.push(nombre);
    geoAlertaGuarda({ zonas: geoAlertaTexto(sel) });
    if (sel.indexOf(nombre) >= 0) adviceOk('Geocerca vigilada', nombre);
}
function geoAlertaFila(etiqueta, controles, extra) {
    return '<div class="rondo-ga-row"><span class="rondo-ga-lb">' + etiqueta + '</span>' +
        '<div class="rondo-ga-chips">' + controles + '</div>' +
        (extra || '') + '</div>';
}
function geoAlertaChip(act, attr, valor, txt, cls) {
    return '<button type="button" class="rondo-ga-chip' + (act ? ' activo' : '') + (cls ? ' ' + cls : '') +
        '" ' + attr + ' data-v="' + esc(valor) + '">' + esc(txt) + '</button>';
}
// Pintado del panel. El HTML se reconstruye aqui (igual que el resto de la
// pestana) pero setHtml solo escribe si cambio, y se devuelve el foco al
// control que lo tenia: el buscador y los numeros se editan en vivo.
function paintGeoAlertas() {
    const box = byId('rondo-geo-alerta');
    if (!box) return;
    const act = document.activeElement;
    const foco = (act && act.id && box.contains(act)) ? act.id : '';
    const cfg = geoAlertaCfg();
    const zonas = APP.zonas || [];
    const sel = geoAlertaSel(cfg);
    const busq = String(APP.geoAlertaBusca || '').toLowerCase();
    const dentro = geoAlertaUnidadesPorZona(cfg);
    const val = (id, def) => {
        const e = (foco === id) ? byId(id) : null;
        return esc(e ? e.value : def);
    };
    const chips = [];
    for (const d of Object.keys(GEO_ALERTA_DISPAROS)) {
        const d0 = GEO_ALERTA_DISPAROS[d];
        chips.push(geoAlertaChip(cfg.disparo === d, 'data-ga="disparo"', d, d0.txt, 'ancho'));
    }
    const grav = GEO_ALERTA_SEVS.map((s) => geoAlertaChip(cfg.severidad === s.k, 'data-ga="sev"', s.k, s.txt, 'sev-' + s.k));
    // Lista de geocercas elegibles (mismas geocercas que la tabla).
    const elegibles = zonas.filter((z) => !busq || ((z.n || '') + ' ' + (z.id || '')).toLowerCase().indexOf(busq) >= 0)
        .sort((a, b) => (a.n || '').localeCompare(b.n || '', 'es'));
    const items = elegibles.map((z) => {
        const nom = z.n || ('Zona ' + z.id);
        const n = dentro[nom] || [];
        return '<label class="rondo-ga-z' + (sel.has(nom) ? ' sel' : '') + '">' +
            '<input type="checkbox" data-ga-zona="' + esc(nom) + '"' + (sel.has(nom) ? ' checked' : '') + '>' +
            '<span class="nm">' + esc(nom) + '</span>' +
            '<i>' + (n.length ? esc(n.slice(0, 3).join(' \u00b7 ') + (n.length > 3 ? ' +' + (n.length - 3) : '')) : 'libre') + '</i>' +
            '</label>';
    }).join('');
    const vivos = Object.keys(APP.geoAlertaVivo || {})
        .map((k) => Object.assign({ clave: k }, APP.geoAlertaVivo[k]))
        .sort((a, b) => (b.cumple === a.cumple) ? (b.minutos - a.minutos) : ((b.cumple ? 1 : 0) - (a.cumple ? 1 : 0)))
        .slice(0, 12);
    const enAlerta = vivos.filter((v) => v.cumple).length;
    const d0 = GEO_ALERTA_DISPAROS[cfg.disparo];
    const resumen = [sel.size + ' de ' + zonas.length + ' geocercas',
        (cfg.alcance === 'todas') ? 'toda la flota' : 'solo vigiladas',
        (GEO_ALERTA_SEVS.find((s) => s.k === cfg.severidad) || { txt: cfg.severidad }).txt.toLowerCase() + ' \u00b7 ' + d0.corto].join(' \u00b7 ');
    const html =
        '<div class="rondo-ga" data-activa="' + (cfg.activa ? '1' : '0') + '" data-sev="' + esc(cfg.severidad) + '" data-disparo="' + esc(cfg.disparo) + '">' +
        '<div class="rondo-ga-head">' +
        '<span class="rondo-usym ga-ico">' + UIS.alertas + '</span>' +
        '<div class="rondo-ga-ht"><b>Alerta de geocercas</b><span>' + esc(resumen) + '</span></div>' +
        '<button type="button" class="rondo-ga-sw' + (cfg.activa ? ' on' : '') + '" data-ga="on" title="Activar o desactivar la alerta">' +
        '<span class="knob"></span><span class="lb">' + (cfg.activa ? 'Activa' : 'Apagada') + '</span></button>' +
        '</div>' +
        (!cfg.activa
            ? '<p class="rondo-ga-off">Elige una o varias geocercas y activa la alerta para vigilar solo lo que pase dentro: ' +
            'pasar, quedarse parado o pararse con el motor apagado.</p>'
            : '<div class="rondo-ga-body">' +
            geoAlertaFila('Unidades',
                geoAlertaChip(cfg.alcance === 'vigiladas', 'data-ga="alcance"', 'vigiladas', 'Solo vigiladas') +
                geoAlertaChip(cfg.alcance === 'todas', 'data-ga="alcance"', 'todas', 'Toda la flota')) +
            geoAlertaFila('Gravedad', grav.join('')) +
            geoAlertaFila('Dispara cuando', chips.join('')) +
            geoAlertaFila('Tiempos',
                '<label class="rondo-ga-num">Parada (min)<input type="number" id="rondo-ga-min" min="1" max="240" value="' + val('rondo-ga-min', cfg.minMin) + '"></label>' +
                '<label class="rondo-ga-num">Motor apagado (min)<input type="number" id="rondo-ga-motor" min="1" max="720" value="' + val('rondo-ga-motor', cfg.motorMin) + '"></label>' +
                '<label class="rondo-ga-num">Confirmar (s)<input type="number" id="rondo-ga-est" min="0" max="600" value="' + val('rondo-ga-est', cfg.estableSeg) + '"></label>' +
                '<label class="rondo-ga-num">Cooldown (s)<input type="number" id="rondo-ga-cd" min="0" max="86400" value="' + val('rondo-ga-cd', cfg.cooldownS) + '"></label>',
                '<p class="rondo-ga-hint">' + esc(geoAlertaAyuda(cfg)) + '</p>') +
            '<div class="rondo-ga-zonas">' +
            '<div class="rondo-ga-zhead"><b>Geocercas vigiladas</b>' +
            '<input id="rondo-ga-buscar" class="filtro" placeholder="Buscar geocerca\u2026" value="' + val('rondo-ga-buscar', APP.geoAlertaBusca || '') + '">' +
            '<button type="button" class="mini" data-ga="ztodas" title="Vigilar todas las geocercas">Todas</button>' +
            '<button type="button" class="mini" data-ga="zninguna" title="Quitar todas">Ninguna</button>' +
            '<button type="button" class="mini" data-ga="zfiltro" title="Vigilar solo las que muestra el filtro">Solo las filtradas</button>' +
            '</div>' +
            (items
                ? '<div class="rondo-ga-zlist">' + items + '</div>'
                : '<div class="rondo-ga-zempty">' + (zonas.length ? 'Ninguna geocerca coincide con la busqueda.' : 'No hay geocercas cargadas.') + '</div>') +
            '</div>' +
            '<div class="rondo-ga-live">' +
            '<b>Ahora</b>' + (vivos.length ? '<span class="rondo-ga-liveh">' + enAlerta + ' en alerta</span>' : '') +
            (vivos.length
                ? vivos.map((v) => '<span class="rondo-ga-livec' + (v.cumple ? ' avisa' : '') + (v.motor ? ' motor' : '') + '">' +
                    esc(v.clave) + ' \u00b7 ' + esc(v.zona) + ' \u00b7 ' +
                    (v.motor ? Math.round(v.minutosMotor) + ' min motor' :
                        (v.disparo === 'paso' ? 'dentro' : Math.round(v.minutos) + ' min')) +
                    '</span>').join('')
                : '<span class="rondo-ga-livenone">Ninguna unidad dentro de las geocercas vigiladas.</span>') +
            '</div>' +
            '</div>') +
        '</div>';
    const kpi = byId('rondo-geo-kpi-alerta');
    if (kpi) kpi.textContent = enAlerta;
    if (setHtml(box, html) && foco) {
        const again = byId(foco);
        if (again && again.focus) {
            try {
                again.focus();
                if (again.setSelectionRange && typeof again.selectionStart === 'number') {
                    const p = (act && act.selectionStart != null) ? act.selectionStart : String(again.value).length;
                    again.setSelectionRange(p, p);
                }
            } catch (_) { /* noop */ }
        }
    }
}
// Unidades dentro de cada geocerca vigilada (alimenta las etiquetas de la
// lista y el KPI). Se calcula una vez por pintado: son pocas zonas.
function geoAlertaUnidadesPorZona(cfg) {
    const c = cfg || geoAlertaCfg();
    const dentro = {};
    if (!c.zonas.length) return dentro;
    const sel = new Set(c.zonas);
    const todo = (c.alcance === 'todas');
    for (const u of (APP.unidades || [])) {
        if (!todo && !shouldWatch(u)) continue;
        const st = unitState(u);
        if (!st.online || st.lat == null) continue;
        const info = parseUnitName(u);
        const eco = info.eco || info.clave;
        if (!eco) continue;
        for (const z of (APP.zonas || [])) {
            const nom = z && (z.n || ('Zona ' + z.id));
            if (!sel.has(nom)) continue;
            if (geoAlertaDentro(z, st.lat, st.lon, GEO_ALERTA_MARGEN_M)) {
                (dentro[nom] || (dentro[nom] = [])).push(eco);
            }
        }
    }
    return dentro;
}
// Texto de ayuda segun el disparador elegido (que cuenta cada parametro).
function geoAlertaAyuda(cfg) {
    if (cfg.disparo === 'paso') {
        return 'Avisa una vez cuando la unidad entra y se mantiene ' + cfg.estableSeg +
            ' s dentro. El margen de salida evita el parpadeo en el borde.';
    }
    if (cfg.disparo === 'detenida') {
        return 'Avisa una vez cuando la unidad lleva ' + cfg.minMin +
            ' min parada dentro. Si se mueve o sale, se rearma.';
    }
    return 'Avisa cuando la unidad lleva ' + cfg.motorMin +
        ' min parada sin reportar posicion dentro (motor apagado estimado; si la unidad publica el sensor, se usa ese dato).';
}
// Delegacion de eventos del panel. Vive aqui (y no en 44-eventos) para que
// todo lo de la alerta quede en un solo fragmento.
function bindGeoAlerta() {
    const box = byId('rondo-geo-alerta');
    if (!box) return;
    box.addEventListener('click', (ev) => {
        const t = ev.target;
        const chip = t.closest && t.closest('[data-ga]');
        if (!chip || !box.contains(chip)) return;
        const que = chip.dataset.ga;
        const v = chip.dataset.v;
        const cfg = geoAlertaCfg();
        if (que === 'on') {
            APP.config.reglas.geoAlerta = !cfg.activa;
            geoAlertaGuarda({});
            if (APP.config.reglas.geoAlerta && !cfg.zonas.length) {
                adviceWarn('Sin geocercas elegidas', 'Marca al menos una geocerca: las que tengan la campana encendida.');
            }
            return;
        }
        if (que === 'alcance') { geoAlertaGuarda({ alcance: v }); return; }
        if (que === 'sev') { geoAlertaGuarda({ severidad: v }); return; }
        if (que === 'disparo') { geoAlertaGuarda({ disparo: v }); return; }
        if (que === 'ztodas') {
            geoAlertaGuarda({ zonas: geoAlertaTexto((APP.zonas || []).map((z) => z.n || ('Zona ' + z.id))) });
            return;
        }
        if (que === 'zninguna') { geoAlertaGuarda({ zonas: '' }); return; }
        if (que === 'zfiltro') {
            const vis = geoAlertaVisibles();
            if (!vis.length) {
                adviceWarn('Sin geocercas a la vista', 'Ajusta el buscador o el filtro de rol de la lista.');
                return;
            }
            geoAlertaGuarda({ zonas: geoAlertaTexto(vis) });
            return;
        }
    });
    box.addEventListener('change', (ev) => {
        const cb = ev.target;
        if (!cb || !cb.dataset || !cb.dataset.gaZona) return;
        const cfg = geoAlertaCfg();
        const sel = cfg.zonas.slice();
        const i = sel.indexOf(cb.dataset.gaZona);
        if (cb.checked && i < 0) sel.push(cb.dataset.gaZona);
        else if (!cb.checked && i >= 0) sel.splice(i, 1);
        geoAlertaGuarda({ zonas: geoAlertaTexto(sel) });
    });
    let _t = null;
    box.addEventListener('input', (ev) => {
        const e = ev.target;
        if (!e || e.id !== 'rondo-ga-buscar') return;
        clearTimeout(_t);
        const v = e.value;
        _t = setTimeout(() => {
            APP.geoAlertaBusca = v.trim();
            paintGeoAlertas();
        }, 140);
    });
}
// Nombres de las geocercas que muestra ahora la lista (mismo filtro y orden
// que paintGeocercas) para el boton "Solo las filtradas".
function geoAlertaVisibles() {
    const zonas = APP.zonas || [];
    if (!zonas.length) return [];
    const f = (APP.geoFiltro || '').toLowerCase();
    const rol = APP.geoRol || 'todas';
    const out = [];
    for (const z of zonas) {
        const nom = z.n || ('Zona ' + z.id);
        const r = zonaRol(z);
        if (rol === 'base' || rol === 'carga') { if (r !== rol) continue; }
        else if (rol === 'ocupadas') {
            const ocupada = (APP.unidades || []).some((u) => {
                const st = unitState(u);
                return st.online && st.lat != null && inZone(st.lat, st.lon, z);
            });
            if (!ocupada) continue;
        }
        if (f && nom.toLowerCase().indexOf(f) < 0) continue;
        out.push(nom);
    }
    return out;
}