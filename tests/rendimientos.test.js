/*
 * Pruebas del reporte de Rendimientos (fragmento 58): dada una geocerca o
 * punto de partida, se mide la distancia en km y el tiempo en movimiento
 * entre cada parada, contados desde la salida del origen.
 *
 * El nucleo (rxRendCalcula, rxRendPuntos, rxRendFechaSeg, rxRendCSV) es puro;
 * se extrae del bundle y se evalua con stubs de lo que vive fuera.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== RENDIMIENTOS POR UNIDAD');
const fin = src.indexOf('/* ====================== REPORTES MASIVOS DE RECORRIDOS');
if (ini < 0 || fin < 0 || fin <= ini) {
    console.error('No se encontro el bloque de rendimientos en ' + ARCHIVO);
    process.exit(1);
}

const stubs = [
    // Distancia equirectangular en metros (fiel a haversine a estas escalas).
    'function haversine(a,b,c,d){ const l0=(a+c)/2, mx=111320*Math.cos(l0*Math.PI/180), my=110540;' +
        ' const dx=(d-b)*mx, dy=(c-a)*my; return Math.sqrt(dx*dx+dy*dy); }' +
        'function rxDistM(a,b,c,d){ return haversine(a,b,c,d); }' +
        'function rxDist2M(a,b,c,d){ const d0=rxDistM(a,b,c,d); return d0*d0; }',
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ return String(s==null?"":s); }',
    'function norm(s){ return String(s==null?"":s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim(); }',
    'function rxFechaHora(t){ return t ? new Date(t*1000).toISOString().slice(0,16).replace("T"," ") : "-"; }',
    'function rxInfFmt(n){ return (n==null||!isFinite(n)) ? "" : String(Math.round(n*100)/100); }',
    'function rxInfFmtDur(seg){ const s=Math.max(0,Math.round(Number(seg)||0)); const p2=function(x){return x<10?"0"+x:""+x;};' +
        ' return Math.floor(s/3600)+":"+p2(Math.floor((s%3600)/60))+":"+p2(s%60); }',
    'function rxCsvCelda(c){ return "\\"" + String(c==null?"":c) + "\\""; }',
    'function rxInfCSVTexto(cols, filas, extra){ const L=[];' +
        ' if(extra&&extra.length) L.push(extra.map(rxCsvCelda).join(","));' +
        ' L.push((cols||[]).map(rxCsvCelda).join(","));' +
        ' for (const f of (filas||[])) L.push((f||[]).map(rxCsvCelda).join(","));' +
        ' return L.join("\\n"); }',
    'function zoneAt(){ return ""; }',
    'function municipioEn(){ return null; }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||""); const m=n.match(/\\b0*(\\d{3,5})\\b/);' +
        ' const e=m?m[1]:""; return {id:u&&u.id,nombre:n,eco:e,placa:"",clave:e||n}; }',
    'function rxGeoInfNombre(z){ return (z && (z.n || z.nombre)) || (z ? ("Zona " + z.id) : ""); }',
    'const APP = { zonas: [], unidades: [] };',
    // Stubs de UI para montar el dialogo como lo haria Rondo.
    'const UIS = new Proxy({}, { get: function(){ return "<svg></svg>"; } });',
    'const nodos = {};',
    'function fakeEl(id){ return { id:id, style:{}, innerHTML:"", textContent:"", value:"", isConnected:true,' +
        ' children:{}, handlers:{}, dataset:{},' +
        ' classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return true;}},' +
        ' addEventListener:function(t,h){ (this.handlers[t]=this.handlers[t]||[]).push(h); },' +
        ' querySelector:function(sel){ var k=String(sel).replace(/^#/,""); return this.children[k]||nodos[k]||null; },' +
        ' querySelectorAll:function(){ return []; }, contains:function(){ return true; },' +
        ' focus:function(){}, click:function(){}, closest:function(){ return null; } }; }',
    'function byId(id){ return id ? (nodos[id]||(nodos[id]=fakeEl(id))) : null; }',
    'function setHtml(el, html){ if(!el) return false; if(el.innerHTML===html) return false; el.innerHTML=html; return true; }',
    'function abrirDialogo(o){ global.__rrendDlg = o; }',
    'function advice(){} function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    // Maquetado del PDF: basta con comprobar que se arma y que lleva mapa.
    'function rxInfEstilo(){ return ""; }',
    'function rxInfCabecera(a,b,c){ return "<header>"+a+b+c+"</header>"; }',
    'function rxInfPie(){ return "<footer></footer>"; }',
    'function rxInfTabla(cab, filas){ return "<table>" + (cab||[]).join("|") +' +
        ' (filas||[]).map(function(f){ return "<tr>"+f.join("|")+"</tr>"; }).join("") + "</table>"; }',
    'function rxMiniMapaHTML(cfg){ return "<div class=\\"m-mapa\\">" + (((cfg||{}).marcas||[]).length) + " marcas</div>"; }',
    'function rxImprimirHTML(html){ global.__rrendPrints.push(html); }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn { RX_REND, rxRendFechaSeg, rxRendPuntos, rxRendCalcula, rxRendNombreArchivo, rxRendCSV, rxRendHTML, abrirRendimientos, fakeEl, APP, nodos };';
const mod = new Function(code)();
global.document = {
    body: { appendChild() {}, removeChild() {} },
    createElement(tag) { return mod.fakeEl(tag); }
};

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Origen: circulo de 100 m en (0,0).
const dentroOrigen = (p) => {
    const mx = 111320, my = 110540;
    const dx = p.lon * mx, dy = p.lat * my;
    return Math.sqrt(dx * dx + dy * dy) <= 100;
};
const OPTS = { paradaMin: 1, vel: 3 };   // parada minima de 60 s
const quieto = (t, lat, lon) => ({ t: t, lat: lat, lon: lon, s: 0 });
const moviendo = (t, lat, lon) => ({ t: t, lat: lat, lon: lon, s: 50 });

// ── rxRendFechaSeg ──────────────────────────────────────────────────────
{
    const d0 = mod.rxRendFechaSeg('2026-11-03', false);
    const d1 = mod.rxRendFechaSeg('2026-11-03', true);
    ok('fecha: inicio del dia', d0 === Math.floor(new Date(2026, 10, 3, 0, 0, 0).getTime() / 1000));
    ok('fecha: fin del dia (+86399 s)', d1 - d0 === 86399);
    ok('fecha: texto invalido da 0', mod.rxRendFechaSeg('', false) === 0 && mod.rxRendFechaSeg('ayer', false) === 0);
}

// ── rxRendPuntos ────────────────────────────────────────────────────────
{
    const pts = mod.rxRendPuntos([
        { t: 300, pos: { y: 20.6, x: -103.3, s: 40 } },
        { t: 100, pos: { y: 20.5, x: -103.4, s: 0 } },
        { t: 200, pos: null },
        { t: 250, pos: { y: 'x', x: -103.3 } }
    ]);
    ok('puntos: ordena por tiempo y descarta los invalidos',
        pts.length === 2 && pts[0].t === 100 && pts[1].t === 300);
    ok('puntos: pos.y es lat y pos.x es lon',
        pts[0].lat === 20.5 && pts[0].lon === -103.4 && pts[1].s === 40);
    ok('puntos: sin mensajes da lista vacia', mod.rxRendPuntos(null).length === 0);
}

// ── rxRendCalcula: caso feliz ───────────────────────────────────────────
{
    const pts = [
        quieto(0, 0, 0), quieto(60, 0, 0), quieto(120, 0, 0),   // estacionada en el origen
        moviendo(180, 0.005, 0),                                // salida (~555 m)
        moviendo(240, 0.010, 0),
        moviendo(300, 0.015, 0),
        quieto(360, 0.020, 0), quieto(660, 0.020, 0),           // parada 1 (300 s)
        moviendo(720, 0.025, 0),
        quieto(780, 0.030, 0), quieto(1140, 0.030, 0),          // parada 2 (360 s)
        moviendo(1200, 0.035, 0)
    ];
    const r = mod.rxRendCalcula(pts, dentroOrigen, OPTS);
    ok('calculo: dos paradas fuera del origen', r.filas.length === 2, 'filas=' + r.filas.length);
    ok('calculo: una salida del origen', r.salidas === 1);
    ok('calculo: la parada en el origen no se lista',
        r.filas.every((f) => f.lat > 0.005));
    const f1 = r.filas[0], f2 = r.filas[1];
    // km del tramo 1: de (0.005,0) a (0.02,0) = 0.015 gr ~= 1669 m.
    ok('calculo: km del primer tramo (~1.67 km)', f1 && f1.km > 1.4 && f1.km < 1.9, f1 && f1.km);
    ok('calculo: tiempo del primer tramo (3 min)', f1 && Math.round(f1.minMov) === 3, f1 && f1.minMov);
    ok('calculo: duracion de la parada 1 (300 s)', f1 && f1.paradaSeg === 300);
    ok('calculo: llegada y salida de la parada 1', f1 && f1.llegada === 360 && f1.salida === 660);
    // km del tramo 2: de la parada 1 (0.02,0) a la parada 2 (0.03,0) ~= 1113 m.
    ok('calculo: km del segundo tramo (~1.11 km)', f2 && f2.km > 0.9 && f2.km < 1.35, f2 && f2.km);
    ok('calculo: tiempo del segundo tramo (2 min)', f2 && Math.round(f2.minMov) === 2, f2 && f2.minMov);
    ok('calculo: totales acumulados', Math.round(r.kmTotal * 100) === Math.round((f1.km + f2.km) * 100) &&
        Math.round(r.minTotal) === 5);
    ok('calculo: numeracion correlativa', f1.n === 1 && f2.n === 2);
}

// ── rxRendCalcula: parada mas corta que el minimo no cuenta ─────────────
{
    const pts = [
        moviendo(0, 0.010, 0),                                  // ya fuera del origen
        moviendo(60, 0.015, 0),
        quieto(120, 0.020, 0), quieto(140, 0.020, 0),           // pausa de 20 s
        moviendo(160, 0.025, 0),
        quieto(220, 0.030, 0), quieto(400, 0.030, 0),           // parada real (180 s)
        moviendo(460, 0.035, 0)
    ];
    const r = mod.rxRendCalcula(pts, dentroOrigen, OPTS);
    ok('calculo: la pausa corta no es parada', r.filas.length === 1, 'filas=' + r.filas.length);
}

// ── rxRendCalcula: salto de GPS no suma distancia ───────────────────────
{
    const pts = [
        moviendo(0, 0.010, 0),
        moviendo(60, 0.020, 0),
        moviendo(120, 0.520, 0),                                // teleportacion (~55 km)
        quieto(180, 0.530, 0), quieto(360, 0.530, 0),
        moviendo(420, 0.540, 0)
    ];
    const r = mod.rxRendCalcula(pts, dentroOrigen, OPTS);
    // Sin el filtro del salto serian ~56 km; con el, solo ~2.2 km validos.
    ok('calculo: el salto GPS se descarta del km', r.filas.length === 1 && r.filas[0].km < 3,
        r.filas[0] && r.filas[0].km);
}

// ── rxRendCalcula: bordes ───────────────────────────────────────────────
{
    ok('calculo: sin puntos no rompe', mod.rxRendCalcula([], dentroOrigen, OPTS).filas.length === 0);
    ok('calculo: un punto no rompe',
        mod.rxRendCalcula([quieto(0, 0.01, 0)], dentroOrigen, OPTS).filas.length === 0);
    ok('calculo: sin predicado no rompe',
        mod.rxRendCalcula([quieto(0, 0.01, 0), quieto(120, 0.01, 0)], null, OPTS).filas.length === 0);
    // Nunca sale del origen: toda la estancia es del punto de partida.
    const dentro = [quieto(0, 0, 0), quieto(600, 0, 0), quieto(1200, 0, 0)];
    const r = mod.rxRendCalcula(dentro, dentroOrigen, OPTS);
    ok('calculo: sin salida del origen no hay filas', r.filas.length === 0 && r.salidas === 0);
    // Parada abierta al final del rango (la unidad sigue parada): se cierra
    // con el ultimo punto y cuenta.
    const abierta = [
        moviendo(0, 0.010, 0),
        quieto(60, 0.020, 0), quieto(300, 0.020, 0)
    ];
    const r2 = mod.rxRendCalcula(abierta, dentroOrigen, OPTS);
    ok('calculo: parada abierta al final cuenta', r2.filas.length === 1 && r2.filas[0].salida === 300);
    // Una segunda salida re-ancla el tramo: el km vuelve a medirse desde ella.
    const dosVueltas = [
        quieto(0, 0, 0),
        moviendo(60, 0.005, 0),                                 // salida 1
        quieto(120, 0.020, 0), quieto(300, 0.020, 0),           // parada 1
        moviendo(360, 0.005, 0),
        quieto(420, 0, 0), quieto(480, 0, 0),                   // regreso al origen
        moviendo(540, 0.005, 0),                                // salida 2
        quieto(600, 0.010, 0), quieto(900, 0.010, 0),           // parada 2 (~555 m de la salida 2)
        moviendo(960, 0.015, 0)
    ];
    const r3 = mod.rxRendCalcula(dosVueltas, dentroOrigen, OPTS);
    // El origen tambien es el regreso: el tramo de vuelta se registra.
    ok('calculo: dos salidas, dos paradas y un regreso',
        r3.salidas === 2 && r3.filas.length === 3,
        'salidas=' + r3.salidas + ' filas=' + r3.filas.length);
    ok('calculo: el regreso al origen se marca', r3.filas[1] && r3.filas[1].regreso === true);
    ok('calculo: la segunda vuelta mide desde su propia salida',
        r3.filas[2] && r3.filas[2].km > 0.3 && r3.filas[2].km < 0.8, r3.filas[2] && r3.filas[2].km);
    // La vuelta cuenta km y tiempo aunque la unidad NO se detenga al llegar.
    const vuelta = [
        quieto(0, 0, 0),
        moviendo(60, 0.005, 0),
        moviendo(120, 0.010, 0),
        quieto(180, 0.010, 0), quieto(300, 0.010, 0),           // parada 1
        moviendo(360, 0.005, 0),
        moviendo(420, 0, 0)                                     // entra al origen sin parar
    ];
    const rv = mod.rxRendCalcula(vuelta, dentroOrigen, OPTS);
    ok('calculo: el regreso sin parada tambien cuenta',
        rv.filas.length === 2 && rv.filas[1].regreso === true && rv.filas[1].km > 0.5,
        'filas=' + rv.filas.length + ' km=' + (rv.filas[1] && rv.filas[1].km));
    ok('calculo: el regreso suma a los totales',
        rv.kmTotal > rv.filas[0].km && Math.round(rv.minTotal) >= 3);
    // Traza simplificada para el mapa del PDF.
    ok('calculo: traza para el mapa', Array.isArray(r3.traza) && r3.traza.length >= 2 &&
        r3.traza.length <= 501 && r3.traza[0].lat != null);
}

// ── Salidas ─────────────────────────────────────────────────────────────
{
    ok('nombre de archivo', mod.rxRendNombreArchivo('ECO 105', '2026-11-01', '2026-11-03') ===
        'rondo_rendimientos_ECO_105_2026-11-01_a_2026-11-03.csv',
        mod.rxRendNombreArchivo('ECO 105', '2026-11-01', '2026-11-03'));
    mod.RX_REND.desde = '2026-11-01';
    mod.RX_REND.hasta = '2026-11-03';
    const res = mod.rxRendCalcula([
        moviendo(0, 0.010, 0),
        quieto(60, 0.020, 0), quieto(300, 0.020, 0),
        moviendo(360, 0.025, 0)
    ], dentroOrigen, OPTS);
    const csv = mod.rxRendCSV('ECO 105', res);
    ok('csv: trae cabecera y metadatos',
        csv.indexOf('Llegada') >= 0 && csv.indexOf('Rendimientos') >= 0 && csv.indexOf('ECO 105') >= 0);
    ok('csv: una fila por parada', csv.split('\n').length === 3, csv.split('\n').length);
}

// ── Montaje del dialogo: maquetado con las clases de Rondo ──────────────
{
    mod.APP.unidades = [{ id: 1, nm: 'TRACTO 105' }, { id: 2, nm: 'TRACTO 205' }];
    mod.APP.zonas = [{ id: 9, n: 'PATIO' }, { id: 10, n: 'CEDIS' }];
    mod.abrirRendimientos();
    const dlg = global.__rrendDlg;
    ok('ui: titulo y ancho del dialogo', dlg && /Rendimientos/.test(dlg.titulo) && dlg.ancho >= 700);
    const raiz = global.document.createElement('raiz');
    const box = global.document.createElement('rrnd-box');
    raiz.children['rrnd-box'] = box;
    dlg.onOpen(raiz);
    const h = box.innerHTML;
    ok('ui: hero con icono y badge', /class="rgi-hero"/.test(h) && /rgi-heroico/.test(h) && /rgi-ori/.test(h));
    ok('ui: pasos numerados', /rgi-paso-c"><i>1<\/i>/.test(h) && /rgi-paso-c"><i>2<\/i>/.test(h) && /rgi-paso-c"><i>3<\/i>/.test(h));
    ok('ui: chip activo con la clase de Rondo', /class="rgi-chip activo"[^>]*data-rr="modo" data-v="zona"/.test(h));
    ok('ui: rango de fechas con estilo', /class="rgi-rango"/.test(h) && /id="rrnd-desde"/.test(h) && /id="rrnd-hasta"/.test(h));
    ok('ui: boton generar pulsable', /class="rgi-btn gen pulsa" id="rrnd-generar"/.test(h));
    ok('ui: no quedan clases fuera de estilo', !/rgi-btn pri/.test(h) && !/rgi-chip on/.test(h));
    // Sin desplegables: buscador con sugerencias (como Informes de la plataforma).
    ok('ui: unidad y geocerca son buscadores, no <select>',
        !/<select/.test(h) && /id="rrnd-uni-busca"/.test(h) && /id="rrnd-zona-busca"/.test(h) && /class="rgi-busca"/.test(h));
    ok('ui: sugerencias de unidades y geocercas en chips',
        /data-uni="1"/.test(h) && /data-zona="PATIO"/.test(h) && /id="rrnd-unis"/.test(h) && /id="rrnd-zonas"/.test(h));
    ok('ui: contador de sugerencias', /id="rrnd-uni-n">2\/2</.test(h) && /id="rrnd-zona-n">2\/2</.test(h));
    // Elegir una unidad desde las sugerencias la marca y la muestra.
    const uni = global.document.createElement('uni');
    uni.dataset = { uni: '1' };
    for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => uni } });
    ok('ui: la unidad elegida queda activa', /class="rgi-chip activo" data-uni="1"/.test(box.innerHTML));
    ok('ui: el paso indica la unidad elegida', /Seleccionada: 105/.test(box.innerHTML));
    // Escribir en el buscador filtra las sugerencias sin repintar el cuerpo.
    for (const fn of (box.handlers.input || [])) fn({ target: { id: 'rrnd-uni-busca', value: '205' } });
    const listaUni = mod.nodos['rrnd-unis'] ? mod.nodos['rrnd-unis'].innerHTML : '';
    ok('ui: el buscador filtra las sugerencias de unidad',
        /data-uni="2"/.test(listaUni) && !/data-uni="1"/.test(listaUni), listaUni);
    // Elegir la geocerca de partida.
    const zona = global.document.createElement('zona');
    zona.dataset = { zona: 'PATIO' };
    for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => zona } });
    ok('ui: la geocerca elegida queda activa y se muestra',
        /class="rgi-chip activo" data-zona="PATIO"/.test(box.innerHTML) && /Partida: PATIO/.test(box.innerHTML));
    // Cambiar a "Punto y radio" repinta con los campos numericos.
    const chip = global.document.createElement('chip');
    chip.dataset = { rr: 'modo', v: 'punto' };
    for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => chip } });
    ok('ui: el origen por punto muestra lat/lon/radio',
        /id="rrnd-lat"/.test(box.innerHTML) && /id="rrnd-lon"/.test(box.innerHTML) && /class="rgi-num"/.test(box.innerHTML));
    // Reabrir: el memo de setHtml se invalida (si no, el cuerpo sale vacio).
    ok('ui: el dialogo invalida el memo al abrir', /invalidarHtml\('rrnd-box'\)/.test(src));
    // PDF: se arma el documento con mapa y con el regreso al origen.
    global.__rrendPrints = [];
    mod.RX_REND.eco = '105';
    mod.RX_REND.origen = { lat: 0, lon: 0, txt: 'PATIO' };
    mod.RX_REND.res = {
        filas: [
            { n: 1, llegada: 100, salida: 200, paradaSeg: 60, km: 1.2, minMov: 2, lat: 0.01, lon: 0 },
            { n: 2, llegada: 300, salida: 300, paradaSeg: 0, km: 1.1, minMov: 2, lat: 0, lon: 0, regreso: true }
        ],
        kmTotal: 2.3, minTotal: 4, salidas: 1,
        traza: [{ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 }]
    };
    const pdfb = global.document.createElement('rrnd-pdf');
    for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => pdfb } });
    const doc = global.__rrendPrints[0] || '';
    ok('ui: el PDF incluye el mapa de paradas', /m-mapa/.test(doc) && /3 marcas/.test(doc));
    ok('ui: el PDF marca el regreso al origen', /Regreso al origen/.test(doc) && /partida y regreso/i.test(doc));
    ok('ui: el PDF trae la tabla de detalle', /Llegada/.test(doc) && /Min mov/.test(doc));
}

console.log(fallos ? ('FALLO - ' + fallos + ' checks') : 'Todos los tests pasaron');
process.exit(fallos ? 1 : 0);
