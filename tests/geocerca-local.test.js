/*
 * Pruebas de las geocercas creadas en Rondo (v6.13, "de la app"): no estan en
 * la plataforma, se dibujan a mano y se guardan en la sesion.
 *
 * El bloque va de NUCLEO a la seccion de MAPA (nucleo + almacenamiento, sin
 * DOM) y se evalua con stubs de lo que vive fuera (inZone, zoneAreaM2,
 * fetchZones...). Se comprueba la normalizacion de la geometria, el bbox de
 * los circulos (que debe cubrir el radio), la fusion con APP.zonas, el
 * guardado/borrado, la exportacion e importacion (formato propio y GeoJSON)
 * y la inversa de la proyeccion del mapa.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== GEOCERCAS DE LA APP: NUCLEO');
const fin = src.indexOf('/* ====================== GEOCERCAS DE LA APP: MAPA');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de geocercas de la app en ' + ARCHIVO);
    process.exit(1);
}

// Proyeccion real del mini-mapa (se extrae del fragmento 48) para verificar
// la inversa contra la misma formula que usa rxMMPt.
function extraer(nombre) {
    const i = src.indexOf('    function ' + nombre + '(');
    if (i < 0) return '';
    let depth = 0, started = false;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (c === '{') { depth++; started = true; }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
    }
    return '';
}

const H = {
    guardadas: [],
    sesiones: [],
    APP: {
        config: { loadZones: true, geolocalRecordar: false },
        zonas: [{ id: 1, n: 'PATIO NORTE' }, { id: 2, n: 'CEDIS' }],
        zonasLocales: [],
        zonasPorNombre: new Map(),
        zonasIndex: { arr: 'viejo' },
        unidades: []
    }
};
// El bloque usa H.APP: el test comparte ese MISMO objeto para poder
// comprobar como quedan APP.zonas y APP.zonasLocales.
const APP = H.APP;

const stubs = [
    'const APP = H.APP;',
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ return String(s==null?"":s).replace(/[&<>"\']/g,""); }',
    'function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    'function paintGeoAlertas(){} function paintGeocercas(){}',
    'function writeJSON(k,v){ H.guardadas.push([k, v]); }',
    'function writeSession(k,v){ H.sesiones.push([k, v]); }',
    'const LS = { cfg:"cfg", geolocal:"LS.geolocal" }, SS = { geolocal:"SS.geolocal" };',
    'function zonaAreaM2(z){ return (z && z._area) || 1000; }',
    'function fmtArea(v){ return (Math.round(v * 10) / 10) + " km2"; }',
    'function shouldWatch(){ return true; }',
    'function unitState(){ return { lat:0, lon:0, vel:0, online:true }; }',
    'function geoAlertaCfgZona(){ return null; }',
    'function abrirGeoAlerta(){}',
    // Distancia local real (12-geo.js): la usa el perimetro.
    'function _geoDistM(lat1, lon1, lat2, lon2){ const lat0=(lat1+lat2)/2;' +
        ' const mx=111320*Math.cos(lat0*Math.PI/180), my=110540;' +
        ' const dx=(lon2-lon1)*mx, dy=(lat2-lat1)*my; return Math.sqrt(dx*dx+dy*dy); }',
    extraer('rxMMLonX'),
    extraer('rxMMLatY'),
    extraer('rxMMPt')
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {glocPts,glocLatLon,glocCentro,glocBBox,glocNormaliza,glocNombreLibre,' +
    'glocExportaJSON,glocExportaGeoJSON,glocParsea,glocLista,glocSincroniza,glocGuarda,glocBorra,' +
    'glocImporta,glocEsApp,glocOrigen,glocPerimM,glocM2,glocTextoTam,glocPxALatLon,' +
    'GEOLOC_MAX_PUNTOS,GEOLOC_MAX_ZONAS,GEOLOC_MIN_RADIO,GEOLOC_MAX_RADIO,GEOLOC_NOMBRE_MAX};';
const mod = new Function('H', code)(H);

// Las dos funciones de proyeccion, evaluadas aparte para poder comprobar la
// inversa del mapa contra la misma formula que usa rxMMPt.
const rxMMLonX = new Function('function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }\n' +
    extraer('rxMMLonX') + '\nreturn rxMMLonX;')();
const rxMMLatY = new Function('function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }\n' +
    extraer('rxMMLatY') + '\nreturn rxMMLatY;')();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1e-6 : tol); }

// ── Puntos ───────────────────────────────────────────────────────────────
ok('pts: acepta {x,y}', mod.glocPts([{ x: -99.1, y: 19.4 }]).length === 1);
ok('pts: acepta {lat,lon}', casi(mod.glocPts([{ lat: 19.4, lon: -99.1 }])[0].y, 19.4));
ok('pts: acepta [lon,lat]', casi(mod.glocPts([[-99.1, 19.4]])[0].x, -99.1) && casi(mod.glocPts([[-99.1, 19.4]])[0].y, 19.4));
ok('pts: descarta basura', mod.glocPts([{ x: 'x', y: 1 }, null, 'a', { x: 1, y: 2 }]).length === 1);
ok('pts: descarta coordenadas fuera de rango', mod.glocPts([{ x: -200, y: 19 }, { x: 1, y: 91 }]).length === 0);
ok('pts: respeta el maximo de puntos', mod.glocPts(new Array(400).fill({ x: 1, y: 1 })).length === mod.GEOLOC_MAX_PUNTOS);
ok('pts: latLon ida y vuelta', (function () {
    const a = mod.glocLatLon([{ x: -99.1, y: 19.4 }]);
    return a.length === 1 && casi(a[0].lat, 19.4) && casi(a[0].lon, -99.1);
})());
ok('centro: promedio de puntos', (function () {
    const c = mod.glocCentro([{ x: 0, y: 0 }, { x: 2, y: 4 }]);
    return casi(c.x, 1) && casi(c.y, 2);
})());
ok('centro: sin puntos -> null', mod.glocCentro([]) === null && mod.glocCentro(null) === null);

// ── Normalizacion ────────────────────────────────────────────────────────
const CUAD = [{ x: -99.1, y: 19.4 }, { x: -99.09, y: 19.4 }, { x: -99.09, y: 19.41 }, { x: -99.1, y: 19.41 }];
let z = mod.glocNormaliza({ n: 'Patio cliente', t: 2, p: CUAD });
ok('norm: poligono completo', !!z && z.t === 2 && z.p.length === 4 && z.n === 'Patio cliente');
ok('norm: lleva id propio (no es de la plataforma)', !!z && typeof z.id === 'string' && z.id.length > 0 && z.id !== '1');
ok('norm: marcada como de la app', !!z && z.app === 1 && mod.glocEsApp(z) === true);
ok('norm: NO lleva _rid (la plataforma no la busca)', !!z && z._rid === undefined);
ok('norm: bbox con centro y extremos', !!z && z.b.min_x < z.b.cen_x && z.b.cen_x < z.b.max_x &&
    z.b.min_y < z.b.cen_y && z.b.cen_y < z.b.max_y);
z = mod.glocNormaliza({ n: 'Muelle', t: 3, p: [{ x: -99.1, y: 19.4 }], w: 250 });
ok('norm: circulo con radio', !!z && z.t === 3 && z.w === 250);
ok('norm: el bbox del circulo cubre el radio', !!z && ((z.b.max_x - z.b.cen_x) * 111320) > 250,
    Math.round((z.b.max_x - z.b.cen_x) * 111320) + ' m');
ok('norm: el centro del circulo es su punto', !!z && casi(z.b.cen_x, -99.1) && casi(z.b.cen_y, 19.4));
ok('norm: radio minimo y maximo', mod.glocNormaliza({ n: 'a', t: 3, p: [{ x: 0, y: 0 }], w: 1 }).w === mod.GEOLOC_MIN_RADIO &&
    mod.glocNormaliza({ n: 'a', t: 3, p: [{ x: 0, y: 0 }], w: 1e9 }).w === mod.GEOLOC_MAX_RADIO);
ok('norm: linea con ancho', (function () {
    const l = mod.glocNormaliza({ n: 'ruta', t: 1, p: [{ x: 0, y: 0 }, { x: 1, y: 1 }], w: 80 });
    return !!l && l.t === 1 && l.w === 80 && l.p.length === 2;
})());
ok('norm: sin tipo se asume poligono', mod.glocNormaliza({ n: 'x', p: CUAD }).t === 2);
ok('norm: poligono de 2 puntos se rechaza', mod.glocNormaliza({ n: 'x', t: 2, p: CUAD.slice(0, 2) }) === null);
ok('norm: linea de 1 punto se rechaza', mod.glocNormaliza({ n: 'x', t: 1, p: [{ x: 0, y: 0 }] }) === null);
ok('norm: sin nombre se rechaza', mod.glocNormaliza({ t: 2, p: CUAD }) === null);
ok('norm: sin puntos se rechaza', mod.glocNormaliza({ n: 'x', t: 2 }) === null);
ok('norm: null y basura no rompen', mod.glocNormaliza(null) === null && mod.glocNormaliza('x') === null && mod.glocNormaliza(7) === null);
ok('norm: acepta nombre con espacios raros y lo limpia', mod.glocNormaliza({ n: '  Patio\n  del\t cliente  ', t: 2, p: CUAD }).n === 'Patio del cliente');
ok('norm: el nombre se acota', mod.glocNormaliza({ n: new Array(200).join('A'), t: 2, p: CUAD }).n.length <= mod.GEOLOC_NOMBRE_MAX);
ok('norm: centro como par plano [lat,lon]', (function () {
    const c = mod.glocNormaliza({ n: 'm', t: 3, puntos: [19.4, -99.1], radio: 100 });
    return !!c && casi(c.p[0].x, -99.1) && casi(c.p[0].y, 19.4);
})());
ok('norm: conserva el id al reeditar', mod.glocNormaliza({ id: 'g123', n: 'x', t: 2, p: CUAD }).id === 'g123');

// ── Nombres unicos ───────────────────────────────────────────────────────
ok('nombre: reutiliza si no existe', mod.glocNombreLibre('Patio', [], []) === 'Patio');
ok('nombre: no repite uno de la plataforma', mod.glocNombreLibre('PATIO NORTE', [{ n: 'PATIO NORTE' }], []) === 'PATIO NORTE 2');
ok('nombre: no repite uno propio', mod.glocNombreLibre('Patio', [], [{ n: 'Patio' }]) === 'Patio 2');
ok('nombre: distingue mayusculas', mod.glocNombreLibre('patio', [{ n: 'PATIO' }], []) === 'patio 2');
ok('nombre: cadena de 3', mod.glocNombreLibre('A', [{ n: 'A' }], [{ n: 'A 2' }]) === 'A 3');
ok('nombre: vacio -> Geocerca', mod.glocNombreLibre('', [], []) === 'Geocerca');
ok('nombre: "__proto__" se renombra', mod.glocNombreLibre('__proto__', [], []) === 'Geocerca');
ok('nombre: "constructor" se renombra', mod.glocNombreLibre('constructor', [], []) === 'Geocerca');

// ── Medidas ──────────────────────────────────────────────────────────────
const pol = mod.glocNormaliza({ n: 'Patio cliente', t: 2, p: CUAD });
const cir = mod.glocNormaliza({ n: 'Muelle', t: 3, p: [{ x: -99.1, y: 19.4 }], w: 250 });
ok('medidas: perimetro del poligono cerrado', mod.glocPerimM(pol.p, true) > 1000 && mod.glocPerimM(pol.p, true) > mod.glocPerimM(pol.p, false));
ok('medidas: area del circulo = pi r2', casi(mod.glocM2(cir), Math.PI * 250 * 250, 1));
ok('medidas: area del poligono usa zonaAreaM2', mod.glocM2(pol) === 1000);
ok('medidas: texto con superficie', /km2|m2/.test(mod.glocTextoTam(pol)));
ok('medidas: la linea se mide por longitud', /trazo/.test(mod.glocTextoTam(mod.glocNormaliza({ n: 'l', t: 1, p: [{ x: 0, y: 0 }, { x: 1, y: 0 }], w: 50 }))));

// ── Fusion con las geocercas de la plataforma ────────────────────────────
mod.glocSincroniza([pol, cir]);
ok('sync: las nativas se quedan', APP.zonas.filter((x) => !x.app).length === 2);
ok('sync: las de la app se anaden', APP.zonas.filter((x) => x.app).length === 2);
ok('sync: las nativas van primero', APP.zonas[0].n === 'PATIO NORTE');
ok('sync: el array se reasigna (el indice espacial se invalida)', APP.zonasIndex === null && APP.zonas.length === 4);
ok('sync: el mapa por nombre se rehace', APP.zonasPorNombre.get('Muelle') !== undefined &&
    APP.zonasPorNombre.get('Muelle').app === 1);
APP.zonasLocales = [];
mod.glocSincroniza([mod.glocNormaliza({ n: 'Sucia', t: 2, p: [{ x: 0, y: 0 }] })]);
ok('sync: lo invalido del storage se descarta', APP.zonasLocales.length === 0 && APP.zonas.length === 2);

// ── Guardar / borrar ─────────────────────────────────────────────────────
mod.glocSincroniza([]);
const a = mod.glocGuarda(mod.glocNormaliza({ n: 'A', t: 2, p: CUAD }));
ok('guarda: nueva geocerca en la lista', !!a && APP.zonasLocales.length === 1);
ok('guarda: persistida en la sesion', H.sesiones.some(([k]) => k === 'SS.geolocal'));
ok('guarda: sin "recordar" se limpia la copia persistente',
    H.guardadas.filter(([k]) => k === 'LS.geolocal').every(([, v]) => Array.isArray(v) && !v.length));
APP.config.geolocalRecordar = true;
mod.glocGuarda(mod.glocNormaliza({ n: 'Persistente', t: 3, p: [{ x: 1, y: 2 }], w: 100 }));
ok('guarda: con "recordar" escribe en localStorage',
    H.guardadas.filter(([k]) => k === 'LS.geolocal').some(([, v]) => Array.isArray(v) && v.length === 2),
    JSON.stringify(H.guardadas.filter(([k]) => k === 'LS.geolocal').map(([, v]) => Array.isArray(v) ? v.length : -1)));
APP.config.geolocalRecordar = false;
mod.glocGuarda(Object.assign({}, a, { n: 'A', p: CUAD.slice(0, 3) }));
ok('guarda: mismo id actualiza en vez de duplicar',
    APP.zonasLocales.length === 2 && APP.zonasLocales.filter((x) => x.n === 'A')[0].p.length === 3,
    'len=' + APP.zonasLocales.length);
mod.glocGuarda(mod.glocNormaliza({ n: 'B', t: 3, p: [{ x: 0, y: 0 }], w: 100 }));
ok('guarda: respeta el maximo de geocercas de la app', (function () {
    for (let i = 0; i < mod.GEOLOC_MAX_ZONAS + 5; i++) {
        mod.glocGuarda(mod.glocNormaliza({ n: 'L' + i, t: 3, p: [{ x: 0, y: 0 }], w: 100 }));
    }
    return APP.zonasLocales.length === mod.GEOLOC_MAX_ZONAS;
})());
ok('guarda: devuelve null si es invalida', mod.glocGuarda({ n: '', t: 2, p: CUAD }) === null);
ok('borrar: quita de la lista y de APP.zonas', (function () {
    const nLoc = APP.zonasLocales.length;
    const id = APP.zonasLocales[0].id;
    const r = mod.glocBorra(id);
    return r === true && APP.zonasLocales.length === nLoc - 1 &&
        APP.zonas.filter((x) => x.app).length === nLoc - 1 &&
        APP.zonas.filter((x) => !x.app).length === 2;
})(), 'locales=' + APP.zonasLocales.length + ' zonas=' + APP.zonas.length);
ok('borrar: id inexistente no hace nada', mod.glocBorra('no-existe') === false);
mod.glocSincroniza([]);

// ── Exportar / importar ──────────────────────────────────────────────────
mod.glocGuarda(pol);
mod.glocGuarda(cir);
const lista = mod.glocLista();
const json = mod.glocExportaJSON(lista);
ok('export: el JSON lleva el tipo y la version', JSON.parse(json).tipo === 'rondo-geocercas' && JSON.parse(json).version >= 1);
ok('export: el JSON trae las dos geocercas', JSON.parse(json).geocercas.length === 2);
let vuelta = mod.glocParsea(json);
ok('import: ida y vuelta del formato propio',
    vuelta.lista.length === 2 && vuelta.lista.map((x) => x.n).sort().join(',') === 'Muelle,Patio cliente' && !vuelta.error);
ok('import: conserva el radio del circulo', vuelta.lista.filter((x) => x.t === 3)[0].w === 250);
ok('import: conserva los vertices', vuelta.lista.filter((x) => x.t === 2)[0].p.length === 4);
const gj = JSON.parse(mod.glocExportaGeoJSON(lista));
ok('export geojson: FeatureCollection con 2 features', gj.type === 'FeatureCollection' && gj.features.length === 2);
ok('export geojson: marca el origen rondo-app', gj.features.every((f) => f.properties.origen === 'rondo-app'));
ok('export geojson: poligono cerrado', gj.features[0].geometry.type === 'Polygon' && gj.features[0].geometry.coordinates[0][0][0] === gj.features[0].geometry.coordinates[0].slice(-1)[0][0]);
ok('export geojson: circulo como Point con radio en propiedades',
    gj.features[1].geometry.type === 'Point' && gj.features[1].properties.radio_m === 250);
vuelta = mod.glocParsea(JSON.stringify(gj));
ok('import geojson: ida y vuelta completa',
    vuelta.lista.length === 2 && vuelta.lista.filter((x) => x.t === 3)[0].w === 250 && !vuelta.error);
ok('import: LineString se importa como linea', mod.glocParsea(JSON.stringify({
    type: 'Feature', properties: { nombre: 'ruta' },
    geometry: { type: 'LineString', coordinates: [[-99.1, 19.4], [-99.0, 19.5]] }
})).lista[0].t === 1);
ok('import: geometria suelta (Polygon sin Feature)', (function () {
    const r = mod.glocParsea(JSON.stringify({
        type: 'Feature', properties: { nombre: 'suelta' },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] }
    }));
    return r.lista.length === 1 && r.lista[0].t === 2;
})());
ok('import: geometria suelta Point (con nombre en properties)', (function () {
    const r = mod.glocParsea(JSON.stringify({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { nombre: 'punto', radio_m: 150 }, geometry: { type: 'Point', coordinates: [1, 2] } }]
    }));
    return r.lista.length === 1 && r.lista[0].t === 3 && r.lista[0].w === 150;
})());
ok('import: MultiPolygon toma el anillo mayor', (function () {
    const r = mod.glocParsea(JSON.stringify({
        type: 'Feature', properties: { nombre: 'multi' },
        geometry: {
            type: 'MultiPolygon', coordinates: [
                [[[0, 0], [0, 1], [1, 1], [0, 0]]],
                [[[0, 0], [0, 1], [2, 1], [2, 0], [0, 0]]]
            ]
        }
    }));
    return r.lista.length === 1 && r.lista[0].p.length === 5;
})());
ok('import: array suelto de objetos', mod.glocParsea(JSON.stringify([{ n: 's', t: 2, p: CUAD }])).lista.length === 1);
ok('import: JSON roto avisa', mod.glocParsea('{no json').error === 'No es JSON valido');
ok('import: vacio avisa', mod.glocParsea('').error === 'El archivo esta vacio' && mod.glocParsea('   ').error === 'El archivo esta vacio');
ok('import: null no revienta', mod.glocParsea(null).error === 'El archivo esta vacio');
ok('import: objeto sin geocercas avisa', mod.glocParsea('{"otra":1}').error === 'El archivo no contiene geocercas');
ok('import: descarta lo inservible y cuenta', (function () {
    const r = mod.glocParsea('[{"n":""},{"n":"ok","t":2,"p":' + JSON.stringify(CUAD) + '}]');
    return r.lista.length === 1 && r.ignoradas === 1;
})());
ok('import: sin nada utilizable avisa', mod.glocParsea('[{"n":""}]').error === 'Ninguna geocerca utilizable');
// Importar de verdad: renombra si choca y genera ids nuevos.
const antes = APP.zonasLocales.length;
const r2 = mod.glocImporta(json, 'anadir');
ok('import: anade sin pisar las existentes', APP.zonasLocales.length === antes + 2 && r2.nuevas === 2);
ok('import: renombra las que chocan de nombre', APP.zonasLocales.some((x) => x.n === 'Patio cliente 2'));
ok('import: los ids son nuevos (no pisa la Edicion)',
    APP.zonasLocales.filter((x) => x.n.indexOf('Muelle') === 0).length === 2);
ok('import: respeta el maximo', (function () {
    mod.glocImporta(json, 'anadir');
    return APP.zonasLocales.length <= mod.GEOLOC_MAX_ZONAS;
})());
ok('import: fichero con JSON roto no toca la lista', (function () {
    const n = APP.zonasLocales.length;
    const r = mod.glocImporta('nada', 'anadir');
    return r.lista.length === 0 && APP.zonasLocales.length === n;
})());
mod.glocSincroniza([]);

// ── Inversa de la proyeccion del mapa ────────────────────────────────────
ok('proyeccion: ida y vuelta en 16 zooms', (function () {
    let mal = 0;
    for (const z of [2, 8, 16, 19]) {
        for (const la of [19.4, -33.9, 0.001, 60.2]) {
            for (const lo of [-99.1, 151.2, -0.1276, 0]) {
                const inst = { z: z, ox: 0, oy: 0 };
                const p = mod.glocPxALatLon(inst, rxMMLonX(lo, z), rxMMLatY(la, z));
                if (!casi(p.lat, la, 1e-6) || !casi(p.lon, lo, 1e-6)) mal++;
            }
        }
    }
    return mal === 0;
})());
ok('proyeccion: respeta el desplazamiento del contenedor', (function () {
    const inst = { z: 16, ox: rxMMLonX(-99.1, 16) - 137, oy: rxMMLatY(19.4, 16) - 211 };
    const p = mod.glocPxALatLon(inst, 137, 211);
    return casi(p.lat, 19.4, 1e-6) && casi(p.lon, -99.1, 1e-6);
})());
ok('proyeccion: sin instancia no rompe', (function () {
    const p = mod.glocPxALatLon(null, 10, 10);
    return isFinite(p.lat) && isFinite(p.lon);
})());
ok('proyeccion: no se sale del rango de latitudes', mod.glocPxALatLon({ z: 2, ox: 0, oy: 0 }, 0, 0).lat <= 85.06);

// ── Origen de cada geocerca ─────────────────────────────────────────────
ok('origen: la de la plataforma', (function () {
    const o = mod.glocOrigen({ id: 1, n: 'PATIO' });
    return o.id === 'plat' && o.corto === 'PLAT' && !o.guardado;
})());
ok('origen: la de la app se marca segun donde este guardada', (function () {
    APP.config.geolocalRecordar = false;
    const a = mod.glocOrigen({ id: 'g1', n: 'Mia', app: 1 });
    APP.config.geolocalRecordar = true;
    const b = mod.glocOrigen({ id: 'g1', n: 'Mia', app: 1 });
    APP.config.geolocalRecordar = false;
    return a.id === 'app' && a.corto === 'APP' && !a.guardado && /sesi\u00f3n/.test(a.largo) &&
        b.guardado === true && /navegador/.test(b.largo);
})());
ok('origen: _app tambien cuenta como de la app', mod.glocEsApp({ _app: true }) === true);
ok('origen: null no revienta', mod.glocOrigen(null).id === 'plat');

// ── Importar con seleccion ───────────────────────────────────────────────
mod.glocSincroniza([]);
mod.glocGuarda(mod.glocNormaliza({ n: 'Ya existe', t: 2, p: CUAD }));
const archivo = JSON.stringify({ geocercas: [
    { n: 'Una', t: 2, p: CUAD },
    { n: 'Dos', t: 3, p: [{ x: 1, y: 2 }], w: 300 },
    { n: 'Ya existe', t: 2, p: CUAD.slice(0, 3) }
] });
let imp = mod.glocImporta(archivo, 'anadir');
ok('seleccion: sin filtro importa todas', imp.nuevas === 3 && APP.zonasLocales.length === 4);
ok('seleccion: el nombre repetido se renombra', APP.zonasLocales.some((x) => x.n === 'Ya existe 2'));
mod.glocSincroniza([mod.glocNormaliza({ n: 'Ya existe', t: 2, p: CUAD })]);
imp = mod.glocImporta(archivo, 'anadir', [1]);
ok('seleccion: importa solo la elegida', imp.nuevas === 1 && APP.zonasLocales.length === 2 &&
    APP.zonasLocales.filter((x) => x.n.indexOf('Dos') === 0).length === 1,
    JSON.stringify(APP.zonasLocales.map((x) => x.n)));
ok('seleccion: las demas no se crean', !APP.zonasLocales.some((x) => x.n.indexOf('Una') === 0));
const antesSel = APP.zonasLocales.length;
imp = mod.glocImporta(archivo, 'anadir', [9]);
ok('seleccion: indice inexistente no rompe',
    imp.nuevas === 0 && APP.zonasLocales.length === antesSel);
mod.glocSincroniza([]);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
process.exit(fallos ? 1 : 0);