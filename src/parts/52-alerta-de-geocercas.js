/* ====================== ALERTA DE GEOCERCAS: NUCLEO ======================
 * Cada geocerca lleva SU PROPIA alerta. En lugar de una configuracion global
 * que se aplicaba a un grupo de geocercas, aqui cada una se configura desde
 * su tarjeta (la campana abre el menu) y decide por separado:
 *
 *   - si esta vigilada o no,
 *   - a quien: solo las unidades vigiladas o toda la flota,
 *   - con que gravedad avisa,
 *   - y QUE dispara dentro: solo pasar, quedarse parado, o pararse con el
 *     motor apagado,
 *   - mas sus tiempos y un cooldown propio.
 *
 * Por que NO reutiliza reglaGeocerca: aquella avisa de entrar y salir de
 * CUALQUIER geocerca, para las unidades vigiladas y con severidad fija.
 * Aqui es por geocerca, con el ambito, la gravedad y el disparador a
 * eleccion del operador.
 *
 * El nucleo de este fragmento es puro (no toca DOM ni red) para poder
 * probarlo aislado en tests/geocerca-alerta.test.js.
 */
const GEO_ALERTA_MAX_ZONAS = 60;
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
// Los tres disparadores que se pueden elegir en cada geocerca.
const GEO_ALERTA_DISPAROS = Object.freeze({
    paso: { txt: 'Solo pas\u00f3', corto: 'paso', icono: 'zone', ayuda: 'Avisa una vez al entrar y mantenerse dentro. El margen de borde evita el parpadeo.' },
    detenida: { txt: 'Se detuvo', corto: 'detenida', icono: 'stopped', ayuda: 'Avisa una vez cuando la unidad lleva los minutos de parada dentro. Si se mueve o sale, se rearma.' },
    motor: { txt: 'Motor apagado', corto: 'motor', icono: 'offline', ayuda: 'Avisa cuando la unidad lleva ese tiempo quieta sin reportar posicion dentro. Usa el sensor si la unidad publica motor/ignicion; si no, lo estima por el corte de reporte.' }
});
// Gravedad, de menos a mas (la UI las pinta en este orden).
const GEO_ALERTA_SEVS = Object.freeze([
    { k: 'bajo', txt: 'Baja' },
    { k: 'medio', txt: 'Media' },
    { k: 'alto', txt: 'Alta' },
    { k: 'critico', txt: 'Cr\u00edtica' }
]);
// Sub-etiqueta para el reloj en vivo: "se detuvo" y "motor" cuentan minutos
// distintos, asi que la lista en vivo puede mostrar uno u otro.
const GEO_ALERTA_ETIQUETAS = Object.freeze({
    paso: 'DENTRO', detenida: 'PARADA', motor: 'MOTOR'
});

function geoAlertaNum(v, def) {
    const n = Number(v);
    return (v == null || !Number.isFinite(n)) ? def : n;
}
// Geocerca llamada "__proto__", "constructor" o "prototype" no debe poder
// tocar el prototipo al guardar o leer el mapa por nombre.
function geoAlertaKeyOk(k) {
    return !!k && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}
function geoAlertaSev(k) {
    return GEO_ALERTA_SEVS.some((s) => s.k === k) ? k : DEFAULTS.geoAlertas.severidad;
}
// Configuracion por defecto de UNA geocerca (la que se ofrece en el menu
// cuando todavia no hay nada guardado para ella).
function geoAlertaDef() {
    const d = DEFAULTS.geoAlertas;
    return {
        on: false,
        alcance: d.alcance,
        severidad: d.severidad,
        disparo: d.disparo,
        minMin: d.minMin,
        motorMin: d.motorMin,
        estableSeg: d.estableSeg,
        cooldownS: d.cooldownS
    };
}
// Normaliza un objeto de configuracion: nunca lanza y nunca deja campos
// raros (un cfg editado a mano o de una version vieja no puede romper el
// refresco). Es la unica puerta por la que se leen estos valores.
function geoAlertaLimpia(raw) {
    const d = DEFAULTS.geoAlertas;
    const g = (raw && typeof raw === 'object') ? raw : {};
    return {
        on: !!g.on,
        alcance: (g.alcance === 'todas') ? 'todas' : 'vigiladas',
        severidad: geoAlertaSev(g.severidad),
        disparo: GEO_ALERTA_DISPAROS[g.disparo] ? g.disparo : d.disparo,
        minMin: clamp(geoAlertaNum(g.minMin, d.minMin), 1, 240),
        motorMin: clamp(geoAlertaNum(g.motorMin, d.motorMin), 1, 720),
        estableSeg: clamp(geoAlertaNum(g.estableSeg, d.estableSeg), 0, 600),
        cooldownS: clamp(geoAlertaNum(g.cooldownS, d.cooldownS), 0, 86400)
    };
}
// Mapa nombre -> configuracion de las geocercas vigiladas, ya saneado.
// hasOwnProperty evita que un nombre tipo "__proto__" o "constructor" lea o
// escriba propiedades del prototipo.
function geoAlertaPorZona() {
    const g = (APP.config && APP.config.geoAlertas) || {};
    const crudo = (g.porZona && typeof g.porZona === 'object') ? g.porZona : {};
    const out = {};
    for (const k of Object.keys(crudo)) {
        if (!geoAlertaKeyOk(k) || !Object.prototype.hasOwnProperty.call(crudo, k)) continue;
        const c = geoAlertaLimpia(crudo[k]);
        if (c.on) out[k] = c;
    }
    return out;
}
// Configuracion de una geocerca (null si no esta vigilada). Devuelve un
// objeto NUEVO: el menu edita una copia, no el config guardado.
function geoAlertaCfgZona(nombre, mapa) {
    if (!geoAlertaKeyOk(nombre)) return null;
    const m = mapa || geoAlertaPorZona();
    if (!Object.prototype.hasOwnProperty.call(m, nombre)) return null;
    return m[nombre];
}
function geoAlertaVigiladas(mapa) {
    return Object.keys(mapa || geoAlertaPorZona()).slice(0, GEO_ALERTA_MAX_ZONAS);
}
// Geocercas de la plataforma que tienen alerta. Las configuradas que ya no
// existen (borradas en la plataforma) se ignoran sin perder el ajuste: el
// nombre guardado sobrevive por si la geocerca vuelve.
function geoAlertaZonasDe(mapa) {
    const m = mapa || geoAlertaPorZona();
    const out = [];
    for (const z of (APP.zonas || [])) {
        if (!z) continue;
        const nom = z.n || ('Zona ' + z.id);
        if (geoAlertaKeyOk(nom) && Object.prototype.hasOwnProperty.call(m, nom)) out.push(z);
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
    return { off: gap >= clamp(geoAlertaNum(motorMin, 15), 1, 720), fuente: 'estimado' };
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
// ahora (segundos) y cfg (la config de ESA geocerca).
//
// Sin estado previo se toma la foto inicial sin avisar: si la alerta se
// activa con una unidad ya dentro, no queremos un "ha pasado" fantasma.
function geoAlertaEvalua(e, o) {
    const cfg = geoAlertaLimpia(o.cfg);
    const estSeg = cfg.estableSeg;
    const minMin = cfg.minMin;
    const motorMin = cfg.motorMin;
    const disparo = cfg.disparo;
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
    // senal no se confirma nada (su ultima posicion puede ser de hace media
    // hora), salvo con el disparador de motor: ese busca justamente el corte
    // de reporte, asi que trabaja con la posicion congelada.
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
function geoAlertaTextoEvento(evento, zona, etq, minutos, cfg) {
    const m = Math.max(0, Math.round(minutos));
    if (evento === 'paso') {
        return {
            titulo: 'PASO POR GEOCERCA \u00b7 ' + zona + ' \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' pas\u00f3 por la geocerca vigilada ' + zona,
            hablar: 'La unidad ' + etq + ' pas\u00f3 por la geocerca ' + zona
        };
    }
    if (evento === 'motor') {
        const src = (cfg && cfg.motorFuente === 'estimado') ? ' \u00b7 motor apagado estimado' : '';
        return {
            titulo: 'MOTOR APAGADO EN GEOCERCA \u00b7 ' + zona + ' \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' lleva ' + m + ' min detenida con el motor apagado dentro de la geocerca vigilada ' + zona + src,
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
    const clave = (info && info.clave) || '';
    // El estado previo vive en R.geoAlerta: evaluateUnit lo inicializa con
    // el memo de la unidad y la flota completa lo pasa a mano.
    const estado = (R.geoAlerta && typeof R.geoAlerta === 'object') ? R.geoAlerta : {};
    // El "vivo" se repone al final si la unidad sigue dentro de una geocerca
    // vigilada; hasta entonces sale de la lista en vivo.
    if (clave) delete APP.geoAlertaVivo[clave];
    const mapa = geoAlertaPorZona();
    if (!(APP.config.reglas && APP.config.reglas.geoAlerta) || !Object.keys(mapa).length ||
        !APP.config.loadZones || !info || !clave || !st || st.lat == null || st.lon == null) {
        R.geoAlerta = null;
        return;
    }
    const zonas = geoAlertaZonasDe(mapa);
    if (!zonas.length) { R.geoAlerta = null; return; }
    const ahora = Math.floor(Date.now() / 1000);
    const etq = (info.eco || info.placa || info.nombre || info.id || '');
    const vel = geoAlertaNum(velSuavizada(info, st), st.vel);
    const nuevo = {};
    const vivos = [];
    for (let i = 0; i < zonas.length; i++) {
        const z = zonas[i];
        const nom = z.n || ('Zona ' + z.id);
        const cfg = mapa[nom];
        const e0 = estado[nom];
        const mot = geoAlertaMotor(u, st, cfg.motorMin);
        const antiguedad = mot.off ? Math.max(0, geoAlertaNum(st.edadMin, 0)) : 0;
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
            // "cumple" es si AHORA se cumple el disparador de esa geocerca:
            // lo que cuenta para el KPI "En alerta" y para resaltar la fila.
            const cumple = (cfg.disparo === 'paso') ||
                (cfg.disparo === 'detenida' ? res.minutos >= cfg.minMin : res.minutosMotor >= cfg.motorMin);
            vivos.push({
                zona: nom,
                minutos: res.minutos,
                minutosMotor: res.minutosMotor,
                motor: res.minutosMotor > 0,
                cumple: cumple,
                vel: vel,
                disparo: cfg.disparo
            });
        }
        if (res.evento && geoAlertaPermitido(clave, nom, cfg, ahora)) {
            const mins = (res.evento === 'motor') ? res.minutosMotor : res.minutos;
            const c2 = Object.assign({}, cfg, { motorFuente: mot.fuente });
            const t = geoAlertaTextoEvento(res.evento, nom, etq, mins, c2);
            pushAlert({
                regla: 'geoAlerta', sev: cfg.severidad, clave: clave, eco: info.eco, zona: nom,
                icono: (GEO_ALERTA_DISPAROS[cfg.disparo] || GEO_ALERTA_DISPAROS.paso).icono,
                titulo: t.titulo, detalle: t.detalle, hablar: t.hablar,
                lat: st.lat, lon: st.lon
            });
        }
    }
    R.geoAlerta = nuevo;
    // Una unidad puede estar en varias geocercas vigiladas: se guarda la
    // mas avanzada para la lista en vivo y, en `zonas`, los nombres de las
    // que esta cumpliendo ahora (asi las pills pueden contarlas).
    if (clave && vivos.length) {
        vivos.sort((a, b) => (b.cumple === a.cumple) ? (b.minutos - a.minutos) : ((b.cumple ? 1 : 0) - (a.cumple ? 1 : 0)));
        const t = vivos[0];
        APP.geoAlertaVivo[clave] = {
            zona: t.zona, minutos: t.minutos, minutosMotor: t.minutosMotor,
            motor: t.motor, cumple: t.cumple, vel: t.vel, disparo: t.disparo,
            zonas: vivos.filter((v) => v.cumple).map((v) => v.zona)
        };
    }
}
// Segunda pasada del refresco para el alcance "toda la flota": el motor
// normal solo evalua las unidades vigiladas, asi que las demas se recorren
// aqui SOLO para esta regla (sin odometro, sin traza, sin reglas globales).
// Tambien poda el estado vivo de unidades que ya no reportan.
function geoAlertaFlota(unidades, clavesVigiladas) {
    const mapa = geoAlertaPorZona();
    const lista = unidades || [];
    const algunaTodas = Object.keys(mapa).some((k) => mapa[k].alcance === 'todas');
    const activa = !!(APP.config.reglas && APP.config.reglas.geoAlerta) && APP.config.loadZones;
    if (!activa || !algunaTodas || !Object.keys(mapa).length) {
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
// Al cambiar el menu de una geocerca (o el interruptor general) los
// episodios anteriores ya no significan nada: se limpian para que la alerta
// no salte con estado viejo.
function geoAlertaReinicia() {
    APP.memoGeoAlerta = {};
    writeSession(SS.geoAlerta, APP.memoGeoAlerta);
    // La vista en vivo NO se borra: se recalcula entera en el siguiente
    // refresco, y dejarla evita que la franja parpadee a "0" justo despues
    // de guardar el menu. Los episodios de reloj si empiezan de cero.
    const memo = APP.memo || {};
    let cambio = false;
    for (const k of Object.keys(memo)) {
        if (memo[k] && memo[k].geoAlerta) { delete memo[k].geoAlerta; cambio = true; }
    }
    if (cambio) writeSession(SS.memo, memo);
}

// Guarda el menu de UNA geocerca en la configuracion y reinicia los
// episodios de esa geocerca (no de las demas). Si queda alguna activa, el
// interruptor general se enciende solo.
function geoAlertaGuardaZona(nombre, cambios) {
    if (!geoAlertaKeyOk(nombre)) return;
    if (!APP.config.geoAlertas || typeof APP.config.geoAlertas !== 'object') {
        APP.config.geoAlertas = Object.assign({}, DEFAULTS.geoAlertas);
    }
    if (!APP.config.geoAlertas.porZona || typeof APP.config.geoAlertas.porZona !== 'object') {
        APP.config.geoAlertas.porZona = {};
    }
    const mapa = APP.config.geoAlertas.porZona;
    const previo = Object.prototype.hasOwnProperty.call(mapa, nombre) ? geoAlertaLimpia(mapa[nombre]) : geoAlertaDef();
    const cfg = geoAlertaLimpia(Object.assign({}, previo, cambios || {}));
    if (cfg.on) {
        if (Object.keys(mapa).length >= GEO_ALERTA_MAX_ZONAS && !Object.prototype.hasOwnProperty.call(mapa, nombre)) {
            adviceWarn('Limite alcanzado', 'Se pueden vigilar hasta ' + GEO_ALERTA_MAX_ZONAS + ' geocercas.');
            return;
        }
        mapa[nombre] = cfg;
        if (!(APP.config.reglas && APP.config.reglas.geoAlerta)) APP.config.reglas.geoAlerta = true;
    } else {
        delete mapa[nombre];
    }
    writeJSON(LS.cfg, APP.config);
    geoAlertaReinicia();
    if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
}
// Accion en cascada para la franja resumen: activar o desactivar todas.
function geoAlertaTodas(activar) {
    const zonas = (APP.zonas || []).map((z) => z && (z.n || ('Zona ' + z.id))).filter(Boolean);
    if (!APP.config.geoAlertas || typeof APP.config.geoAlertas !== 'object') {
        APP.config.geoAlertas = Object.assign({}, DEFAULTS.geoAlertas);
    }
    const mapa = {};
    if (activar) {
        const previo = geoAlertaPorZona();
        for (let i = 0; i < zonas.length && i < GEO_ALERTA_MAX_ZONAS; i++) {
            const nom = zonas[i];
            const c = Object.prototype.hasOwnProperty.call(previo, nom) ? previo[nom] : geoAlertaDef();
            c.on = true;
            mapa[nom] = c;
        }
        APP.config.reglas.geoAlerta = true;
    }
    APP.config.geoAlertas.porZona = mapa;
    writeJSON(LS.cfg, APP.config);
    geoAlertaReinicia();
    if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
    adviceOk(activar ? 'Alertas activadas' : 'Alertas desactivadas',
        (activar ? mapa.length : 0) + ' geocerca(s)');
}

/* ====================== ALERTA DE GEOCERCAS: UI ====================== */
function geoAlertaChip(act, attr, valor, txt, cls) {
    return '<button type="button" class="rondo-ga-chip' + (act ? ' activo' : '') + (cls ? ' ' + cls : '') +
        '" ' + attr + ' data-v="' + esc(valor) + '">' + esc(txt) + '</button>';
}
// Etiqueta corta de una geocerca vigilada: "PATIO · alta · parada".
function geoAlertaEtiqueta(nombre, cfg) {
    const d0 = GEO_ALERTA_DISPAROS[cfg.disparo] || GEO_ALERTA_DISPAROS.paso;
    const sev = (GEO_ALERTA_SEVS.find((s) => s.k === cfg.severidad) || { txt: '' }).txt;
    return { txt: nombre, sub: (cfg.alcance === 'todas' ? 'flota' : 'vigiladas') + ' \u00b7 ' + sev.toLowerCase() + ' \u00b7 ' + d0.corto, sev: cfg.severidad };
}
// Franja compacta de la pestana: cuantas geocercas vigila Rondo, cuales y
// dos acciones en cascada. El detalle de cada una vive en su campana.
function paintGeoAlertas() {
    const box = byId('rondo-geo-ga-resumen');
    if (!box) return;
    const mapa = geoAlertaPorZona();
    const zonas = APP.zonas || [];
    const n = Object.keys(mapa).length;
    const enAlerta = Object.keys(APP.geoAlertaVivo || {}).filter((k) => APP.geoAlertaVivo[k].cumple).length;
    const master = !!(APP.config.reglas && APP.config.reglas.geoAlerta);
    const chips = Object.keys(mapa).sort((a, b) => a.localeCompare(b, 'es')).map((k) => {
        const et = geoAlertaEtiqueta(k, mapa[k]);
        const vivos = Object.keys(APP.geoAlertaVivo || {}).filter((c) =>
            (APP.geoAlertaVivo[c].zonas || []).indexOf(k) >= 0);
        return '<button type="button" class="rondo-ga-pill sev-' + et.sev + (vivos.length ? ' avisa' : '') +
            '" data-ga="cfg" data-zona="' + esc(k) + '" title="' + esc(et.sub) + '">' +
            '<i></i><span class="nm">' + esc(et.txt) + '</span><em>' + esc(et.sub) + '</em>' +
            (vivos.length ? '<b>' + vivos.length + '</b>' : '') + '</button>';
    }).join('');
    const html = '<div class="rondo-ga-res' + (master && n ? ' on' : '') + '">' +
        '<span class="rondo-ga-resico rondo-usym">' + UIS.alertas + '</span>' +
        '<div class="rondo-ga-restxt"><b>' + (n ? n + ' de ' + zonas.length + ' geocercas vigiladas' : 'Ninguna geocerca vigilada') + '</b>' +
        '<span>' + (master ? (enAlerta ? enAlerta + ' unidad(es) cumpliendo ahora' : 'sin avisos activos ahora') : 'interruptor general apagado (Ajustes &gt; Reglas)') + '</span></div>' +
        (chips ? '<div class="rondo-ga-pills">' + chips + '</div>' : '') +
        '<span class="rondo-ga-resacc">' +
        '<button type="button" class="mini" data-ga="todas" title="Vigilar todas las geocercas con los ajustes por defecto">' +
        '<span class="rondo-usym">' + UIS.check + '</span> Todas</button>' +
        '<button type="button" class="mini" data-ga="ninguna" title="Dejar de vigilar todas las geocercas">' +
        '<span class="rondo-usym">' + UIS.clear + '</span> Ninguna</button>' +
        '</span></div>';
    setHtml(box, html);
    const kpi = byId('rondo-geo-kpi-alerta');
    if (kpi) kpi.textContent = enAlerta;
}
// Vista previa del aviso tal y como saldria en la pestana Avisos, para que
// el operador elija el disparador viendo el texto y no solo la etiqueta.
function geoAlertaPreview(p, nombre) {
    const ev = (p.disparo === 'motor') ? 'motor' : (p.disparo === 'detenida' ? 'detenida' : 'paso');
    const mins = (ev === 'motor') ? p.motorMin : p.minMin;
    const t = geoAlertaTextoEvento(ev, nombre, '105', mins, p);
    return '<div class="rondo-ga-dprev"><b>As\u00ed se ver\u00e1 el aviso</b>' +
        '<div class="rondo-ga-dpv sev-' + p.severidad + '">' +
        '<span class="pv-t">' + esc(t.titulo) + '</span>' +
        '<span class="pv-d">' + esc(t.detalle) + '</span>' +
        '</div></div>';
}
// Menu de la alerta de UNA geocerca. Toda la edicion vive en una copia
// (pend) y solo se guarda al pulsar Aceptar: cancelar no toca nada.
function abrirGeoAlerta(nombre) {
    const z = (APP.zonas || []).find((x) => (x.n || ('Zona ' + x.id)) === nombre);
    const cfg0 = geoAlertaCfgZona(nombre) || geoAlertaDef();
    const pend = geoAlertaLimpia(cfg0);
    const dentro = geoAlertaUnidadesPorZona()[nombre] || [];
    const titulo = nombre;
    // Cabecera: nombre, situacion actual y el interruptor de esta geocerca.
    const cab = (p) => {
        const d0 = GEO_ALERTA_DISPAROS[p.disparo];
        return '<div class="rondo-ga-dhead sev-' + p.severidad + '">' +
            '<span class="rondo-ga-dico rondo-usym">' + UIS.alertas + '</span>' +
            '<div class="rondo-ga-dht"><b>' + esc(titulo) + '</b>' +
            '<span>' + (dentro.length ? dentro.length + ' unidad(es) dentro ahora' + (dentro.length ? ' \u00b7 ' + esc(dentro.slice(0, 4).join(' \u00b7 ')) : '') : 'sin unidades dentro ahora') + '</span></div>' +
            '<button type="button" class="rondo-ga-sw' + (p.on ? ' on' : '') + '" data-gz="on" title="Vigilar esta geocerca">' +
            '<span class="knob"></span><span class="lb">' + (p.on ? 'Vigilada' : 'Sin vigilar') + '</span></button>' +
            '</div>';
    };
    const fila = (etiqueta, controles, extra) => '<div class="rondo-ga-drow"><span class="rondo-ga-dlb">' + etiqueta + '</span>' +
        '<div class="rondo-ga-chips">' + controles + '</div>' + (extra || '') + '</div>';
    const cuerpo = (p) => cab(p) +
        '<div class="rondo-ga-dbody' + (p.on ? '' : ' off') + '">' +
        fila('Unidades',
            geoAlertaChip(p.alcance === 'vigiladas', 'data-gz="alcance"', 'vigiladas', 'Solo vigiladas') +
            geoAlertaChip(p.alcance === 'todas', 'data-gz="alcance"', 'todas', 'Toda la flota', 'ancho')) +
        fila('Gravedad', GEO_ALERTA_SEVS.map((s) =>
            geoAlertaChip(p.severidad === s.k, 'data-gz="sev"', s.k, s.txt, 'sev-' + s.k)).join('')) +
        fila('Dispara cuando', Object.keys(GEO_ALERTA_DISPAROS).map((k) =>
            geoAlertaChip(p.disparo === k, 'data-gz="disparo"', k, GEO_ALERTA_DISPAROS[k].txt, 'ancho')).join('')) +
        fila('Tiempos',
            '<label class="rondo-ga-dnum">Parada (min)<input type="number" min="1" max="240" data-gz-num="minMin" value="' + p.minMin + '"></label>' +
            '<label class="rondo-ga-dnum">Motor (min)<input type="number" min="1" max="720" data-gz-num="motorMin" value="' + p.motorMin + '"></label>' +
            '<label class="rondo-ga-dnum">Confirmar (s)<input type="number" min="0" max="600" data-gz-num="estableSeg" value="' + p.estableSeg + '"></label>' +
            '<label class="rondo-ga-dnum">Cooldown (s)<input type="number" min="0" max="86400" data-gz-num="cooldownS" value="' + p.cooldownS + '"></label>',
            '<p class="rondo-ga-dhint">' + esc(GEO_ALERTA_DISPAROS[p.disparo].ayuda) + '</p>') +
        geoAlertaPreview(p, titulo) +
        '</div>';
    abrirDialogo({
        icon: UIS.alertas,
        titulo: 'Alerta de geocerca',
        ancho: 440,
        okText: 'Guardar',
        html: '<div class="rondo-ga-d" id="rondo-ga-dlg">' + cuerpo(pend) + '</div>',
        onOpen: (el) => {
            const box = el.querySelector('#rondo-ga-dlg');
            if (!box) return;
            const pinta = () => {
                const n = el.querySelector('[data-gz-num="minMin"]');
                const mo = el.querySelector('[data-gz-num="motorMin"]');
                const es = el.querySelector('[data-gz-num="estableSeg"]');
                const cd = el.querySelector('[data-gz-num="cooldownS"]');
                if (n) pend.minMin = n.value;
                if (mo) pend.motorMin = mo.value;
                if (es) pend.estableSeg = es.value;
                if (cd) pend.cooldownS = cd.value;
                setHtml(box, cuerpo(geoAlertaLimpia(pend)));
            };
            box.addEventListener('click', (ev) => {
                const b = ev.target.closest && ev.target.closest('[data-gz]');
                if (!b || !box.contains(b)) return;
                const q = b.dataset.gz;
                if (q === 'on') pend.on = !pend.on;
                else if (q === 'alcance') pend.alcance = b.dataset.v;
                else if (q === 'sev') pend.severidad = b.dataset.v;
                else if (q === 'disparo') pend.disparo = b.dataset.v;
                else return;
                pinta();
            });
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || !t.dataset || !t.dataset.gzNum) return;
                pinta();
            });
        },
        onOk: () => {
            const limpio = geoAlertaLimpia(pend);
            geoAlertaGuardaZona(titulo, limpio);
            if (limpio.on) adviceOk('Alerta guardada', titulo + ' \u00b7 ' + limpio.disparo);
            else adviceOk('Alerta quitada', titulo);
        }
    });
}
// Delegacion de eventos de la franja resumen (los chips abren el menu de su
// geocerca). Vive aqui para que todo lo de la alerta quede en un fragmento.
function bindGeoAlerta() {
    const box = byId('rondo-geo-ga-resumen');
    if (!box) return;
    box.addEventListener('click', (ev) => {
        const b = ev.target.closest && ev.target.closest('[data-ga]');
        if (!b || !box.contains(b)) return;
        if (b.dataset.ga === 'cfg') { abrirGeoAlerta(b.dataset.zona); return; }
        if (b.dataset.ga === 'todas') { geoAlertaTodas(true); return; }
        if (b.dataset.ga === 'ninguna') { geoAlertaTodas(false); return; }
    });
}
// Unidades dentro de cada geocerca vigilada (alimenta el menu y las
// tarjetas). Se calcula una vez por pintado: son pocas zonas.
function geoAlertaUnidadesPorZona(mapa) {
    const m = mapa || geoAlertaPorZona();
    const dentro = {};
    if (!Object.keys(m).length) return dentro;
    // Si alguna geocerca pide toda la flota, el conteo tambien es de toda.
    const todaFlota = Object.keys(m).some((k) => m[k].alcance === 'todas');
    for (const u of (APP.unidades || [])) {
        if (!todaFlota && !shouldWatch(u)) continue;
        const st = unitState(u);
        if (!st.online || st.lat == null) continue;
        const info = parseUnitName(u);
        const eco = info.eco || info.clave;
        if (!eco) continue;
        for (const z of (APP.zonas || [])) {
            const nom = z && (z.n || ('Zona ' + z.id));
            if (!Object.prototype.hasOwnProperty.call(m, nom)) continue;
            if (geoAlertaDentro(z, st.lat, st.lon, GEO_ALERTA_MARGEN_M)) {
                (dentro[nom] || (dentro[nom] = [])).push(eco);
            }
        }
    }
    return dentro;
}