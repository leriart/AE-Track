/*
 * Pruebas de Velocidad promedio por unidad (fragmento 60): el operador pega
 * una lista de numeros economicos y el reporte calcula, con el historial GPS
 * del periodo, los km, las horas en movimiento y la velocidad media de cada
 * unidad.
 *
 * El motor (rxVelTokens, rxVelResolver, rxVelCalcula, rxVelTotales, rxVelCSV,
 * rxVelHTML, rxVelCorre) se extrae del bundle y se evalua con stubs de lo que
 * vive fuera. `rxVelCorre` recibe la carga del historial por parametro, asi
 * que tambien se prueba sin red.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== VELOCIDAD PROMEDIO POR UNIDAD');
const fin = src.lastIndexOf('\n})();');
if (ini < 0 || fin < 0 || fin <= ini) {
    console.error('No se encontro el bloque de velocidad promedio en ' + ARCHIVO);
    process.exit(1);
}

const stubs = [
    'function haversine(a,b,c,d){ const l0=(a+c)/2, mx=111320*Math.cos(l0*Math.PI/180), my=110540;' +
        ' const dx=(d-b)*mx, dy=(c-a)*my; return Math.sqrt(dx*dx+dy*dy); }' +
        'function rxDistM(a,b,c,d){ return haversine(a,b,c,d); }',
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ return String(s==null?"":s); }',
    'function norm(s){ return String(s==null?"":s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim(); }',
    'function rxFechaHora(t){ return t ? new Date(t*1000).toISOString().slice(0,16).replace("T"," ") : "-"; }',
    'function rxInfFmt(n){ return (n==null||!isFinite(n)) ? "" : String(Math.round(n*100)/100); }',
    'function rxInfFmtDur(seg){ const s=Math.max(0,Math.round(Number(seg)||0)); const p2=function(x){return x<10?"0"+x:""+x;};' +
        ' return Math.floor(s/3600)+":"+p2(Math.floor((s%3600)/60))+":"+p2(s%60); }',
    'function rxCsvCelda(c){ return "\\"" + String(c==null?"":c).replace(/"/g,"\\"\\"") + "\\""; }',
    'function rxInfCSVTexto(cols, filas, extra){ const L=[];' +
        ' if(extra&&extra.length) L.push(extra.map(rxCsvCelda).join(","));' +
        ' L.push((cols||[]).map(rxCsvCelda).join(","));' +
        ' for (const f of (filas||[])) L.push((f||[]).map(rxCsvCelda).join(","));' +
        ' return L.join("\\n"); }',
    'function rxInfEstilo(){ return ""; }',
    'function rxInfCabecera(a,b,c){ return "<header>"+a+"|"+b+"|"+c+"</header>"; }',
    'function rxInfPie(){ return "<footer></footer>"; }',
    'function rxInfTabla(cab, filas){ return "<table>" + (cab||[]).join("|") +' +
        ' (filas||[]).map(function(f){ return "<tr>"+f.join("|")+"</tr>"; }).join("") + "</table>"; }',
    'function rxInfExplicaError(m){ return "detalle: " + String(m||""); }',
    'function rxRendPuntos(msgs){ const out=[];' +
        ' for (const m of (msgs||[])) { const pos=m&&m.pos; const t=Number(m&&m.t)||0;' +
        ' if(!pos||!isFinite(+pos.y)||!isFinite(+pos.x)||t<=0) continue;' +
        ' out.push({t:t,lat:+pos.y,lon:+pos.x,s:(pos.s!=null&&isFinite(+pos.s))?+pos.s:null}); }' +
        ' out.sort(function(a,b){return a.t-b.t;}); return out; }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||"");' +
        ' let eco=""; const mEco=n.match(/\\.\\s*0*(\\d{3,5})(?!\\d)/) || n.match(/\\b0*(\\d{3,5})\\b/);' +
        ' if(mEco) eco=mEco[1];' +
        ' let placa=""; const mPlaca=n.match(/\\b([A-Z]{2,4}[-\\s]?\\d{2,4}[A-Z]{0,3})\\b/); if(mPlaca) placa=mPlaca[1];' +
        ' return {id:u&&u.id,nombre:n,eco:eco,placa:placa,clave:eco||placa||String(u&&u.id)}; }',
    'const APP = { unidades: [] };',
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
    'function invalidarHtml(){ }',
    'function abrirDialogo(o){ global.__rxvelDlg = o; }',
    'function advice(){} function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    'function rxGeoInfYield(){ return Promise.resolve(); }',
    'function rxGeoInfFetchMensajes(id, desde){ const t0=Number(desde)||1762764000;' +
        ' return Promise.resolve({ msgs: [' +
        ' {t:t0,pos:{y:20.0,x:-103.0,s:0}},' +
        ' {t:t0+3600,pos:{y:20.1,x:-103.0,s:60}}' +
        ' ] }); }',
    'function rxInfDescarga(txt){ global.__rxvelCsv = txt; }',
    'function rxImprimirHTML(html){ global.__rxvelPdf = html; }',
    'function rxRendFechaSeg(s, fin){ const m=String(s||"").trim().match(/^(\\d{4})-(\\d{2})-(\\d{2})/);' +
        ' if(!m) return 0; const d=new Date(+m[1],+m[2]-1,+m[3],fin?23:0,fin?59:0,fin?59:0);' +
        ' const t=Math.floor(d.getTime()/1000); return (isFinite(t)&&t>0)?t:0; }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn { RX_VEL, RX_VEL_MAX_U, rxVelNum, rxVelFechaDe, rxVelSumaDias, rxVelTokens,' +
    ' rxVelClaveTexto, rxVelClaveCompacta, rxVelClaveEco, rxVelResolver, rxVelCalcula,' +
    ' rxVelTotales, rxVelOrdenar, rxVelNombreArchivo, rxVelCSV, rxVelHTML, rxVelCorre,' +
    ' rxVelDiasDe, abrirVelocidadPromedio, fakeEl, nodos, setUnidades:function(l){ APP.unidades = l; return APP.unidades; } };';
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
function cerca(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 0.001 : tol); }

// ── Lista pegada y resolucion contra la flota ────────────────────────────
{
    const t = mod.rxVelTokens('Econ\u00f3mico, 105, 208\n312; ECO-415 | CAMION 502\n\nECO Unidad');
    ok('tokens: separa por coma, linea, punto y coma y barra',
        t.indexOf('105') >= 0 && t.indexOf('208') >= 0 && t.indexOf('312') >= 0 &&
        t.indexOf('ECO-415') >= 0 && t.indexOf('502') >= 0, JSON.stringify(t));
    ok('tokens: descarta etiquetas sin digitos de un trozo con palabras',
        t.indexOf('CAMION') < 0 && t.indexOf('Unidad') < 0, JSON.stringify(t));
    ok('tokens: descarta encabezados de una hoja de calculo',
        t.indexOf('Econ\u00f3mico') < 0 && t.indexOf('ECO') < 0, JSON.stringify(t));
    ok('tokens: una lista vacia no produce nada', mod.rxVelTokens('  \n , ; ').length === 0);

    const UNI = [
        { id: 1, nm: 'CAMION 105' },
        { id: 2, nm: 'ECO 208' },
        { id: 3, nm: 'PLACA ABC-1234' },
        { id: 4, nm: 'UNIDAD 0007' }
    ];
    const m = mod.rxVelResolver(UNI, '0105, 208, abc-1234, 7, 999');
    ok('resolver: encuentra economico, prefijo, placa y ceros a la izquierda', m.unidades.length === 4,
        JSON.stringify(m.unidades.map((u) => u.eco)));
    ok('resolver: avisa del numero que no existe', m.noEncontradas.length === 1 && m.noEncontradas[0] === '999',
        JSON.stringify(m.noEncontradas));
    ok('resolver: conserva una sola fila por unidad', new Set(m.unidades.map((u) => u.id)).size === m.unidades.length);
    const m2 = mod.rxVelResolver(UNI, 'ECO-105');
    ok('resolver: acepta un token con prefijo (ECO-105)', m2.unidades.length === 1 && m2.unidades[0].eco === '105');

    const AMB = [
        { id: 10, nm: 'CAMION 105' },
        { id: 11, nm: 'CAMION 105' }
    ];
    const m3 = mod.rxVelResolver(AMB, '105');
    ok('resolver: dos unidades con el mismo economico son ambiguas',
        m3.unidades.length === 0 && m3.ambiguas.length === 1 && m3.ambiguas[0].candidatos.length === 2,
        JSON.stringify(m3.ambiguas));
}

// ── Calculo puro ─────────────────────────────────────────────────────────
{
    // 0,1 grado de latitud = 11.054 km en una hora -> 11,054 km/h.
    const pts = [
        { t: 3600, lat: 20.0, lon: -103.0, s: 0 },
        { t: 7200, lat: 20.1, lon: -103.0, s: 55 },
        { t: 10800, lat: 20.2, lon: -103.0, s: 80 }
    ];
    const r = mod.rxVelCalcula(pts, { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: suma la distancia de los tramos', cerca(r.km, 22.108, 0.02), r.km);
    ok('calculo: dos horas en movimiento', cerca(r.minMov, 120, 0.001), r.minMov);
    ok('calculo: velocidad media en movimiento', cerca(r.velMov, 11.054, 0.02), r.velMov);
    ok('calculo: velocidad media del periodo', cerca(r.velPeriodo, r.velMov, 0.02), r.velPeriodo);
    ok('calculo: velocidad maxima observada', r.velMax === 80, r.velMax);
    ok('calculo: muestras contadas', r.muestras === 3, r.muestras);

    // Bajo el umbral: la unidad se movio, pero no cuenta como movimiento.
    const lento = mod.rxVelCalcula([
        { t: 0, lat: 20.0, lon: -103.0, s: 0 },
        { t: 3600, lat: 20.01, lon: -103.0, s: 2 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: bajo el umbral no suma tiempo en movimiento', lento.minMov === 0, lento.minMov);
    ok('calculo: bajo el umbral conserva la media del periodo', lento.velPeriodo > 1 && lento.velPeriodo < 2,
        lento.velPeriodo);

    // Salto de GPS: no suma distancia ni movimiento.
    const salto = mod.rxVelCalcula([
        { t: 0, lat: 20.0, lon: -103.0, s: 0 },
        { t: 60, lat: 21.0, lon: -103.0, s: 120 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: descarta saltos de GPS mayores al limite', salto.km === 0 && salto.saltos === 1,
        JSON.stringify({ km: salto.km, saltos: salto.saltos }));

    // Un tramo largo a velocidad normal es un viaje, no un salto: el umbral
    // de distancia solo descarta cuando la velocidad tambien es anormal.
    const largo = mod.rxVelCalcula([
        { t: 0, lat: 20.0, lon: -103.0, s: 0 },
        { t: 153, lat: 20.05, lon: -103.0, s: 130 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: un tramo largo a 130 km/h no es salto', largo.km > 5 && largo.saltos === 0,
        JSON.stringify({ km: largo.km, saltos: largo.saltos }));
    const saltoGrande = mod.rxVelCalcula([
        { t: 0, lat: 20.0, lon: -103.0, s: 0 },
        { t: 60, lat: 20.0317, lon: -103.0, s: 210 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: descarta un salto grande a 210 km/h', saltoGrande.km === 0 && saltoGrande.saltos === 1,
        JSON.stringify({ km: saltoGrande.km, saltos: saltoGrande.saltos }));

    // Hueco de reporte: no suma tiempo ni distancia.
    const hueco = mod.rxVelCalcula([
        { t: 0, lat: 20.0, lon: -103.0, s: 0 },
        { t: 18000, lat: 20.1, lon: -103.0, s: 60 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: ignora huecos de reporte largos', hueco.km === 0 && hueco.huecos === 1 && hueco.minCubierto === 0,
        JSON.stringify({ km: hueco.km, huecos: hueco.huecos }));

    // Detalle por dia.
    const t1 = Math.floor(new Date(2026, 10, 10, 12, 0, 0).getTime() / 1000);
    const t2 = t1 + 3600;
    const t3 = Math.floor(new Date(2026, 10, 11, 12, 0, 0).getTime() / 1000);
    const t4 = t3 + 3600;
    const porDia = mod.rxVelCalcula([
        { t: t1, lat: 20.0, lon: -103.0, s: 0 },
        { t: t2, lat: 20.1, lon: -103.0, s: 50 },
        { t: t3, lat: 20.1, lon: -103.0, s: 0 },
        { t: t4, lat: 20.2, lon: -103.0, s: 50 }
    ], { velMin: 5, saltoKm: 3, huecoMin: 240 });
    ok('calculo: separa el detalle por dia', porDia.dias.length === 2, porDia.dias.length);
    ok('calculo: cada dia lleva su velocidad', porDia.dias.every((d) => d.velMov > 10),
        JSON.stringify(porDia.dias.map((d) => d.velMov)));
}

// ── Totales y orden ──────────────────────────────────────────────────────
{
    const filas = [
        { eco: '105', estado: 'ok', km: 100, minMov: 120, minCubierto: 300 },
        { eco: '208', estado: 'ok', km: 50, minMov: 60, minCubierto: 120 },
        { eco: '312', estado: 'sin_datos', km: 0, minMov: 0, minCubierto: 0 },
        { eco: '415', estado: 'error', km: 0, minMov: 0, minCubierto: 0 }
    ];
    const t = mod.rxVelTotales(filas);
    ok('totales: cuenta con datos, sin datos y errores',
        t.conDatos === 2 && t.sinDatos === 1 && t.errores === 1 && t.total === 4,
        JSON.stringify(t));
    ok('totales: media ponderada por horas', cerca(t.velMov, 50, 0.001), t.velMov);
    ok('totales: km sumados', t.km === 150, t.km);

    const ord = mod.rxVelOrdenar(filas, 'vel', -1);
    ok('orden: velocidad de mayor a menor', ord[0].eco === '105' && ord[1].eco === '208',
        JSON.stringify(ord.map((f) => f.eco)));
    const num = mod.rxVelOrdenar([{ eco: '10' }, { eco: '2' }], 'eco', 1);
    ok('orden: economico numerico', num[0].eco === '2' && num[1].eco === '10');
    ok('dias: del detalle diario se cuenta el array',
        mod.rxVelDiasDe({ dias: [{ fecha: '2026-11-01' }, { fecha: '2026-11-02' }] }) === 2);
    ok('dias: un numero ya contado se respeta', mod.rxVelDiasDe({ dias: 3 }) === 3);
}

// ── Salidas CSV y PDF ────────────────────────────────────────────────────
{
    const res = {
        desde: '2026-11-01', hasta: '2026-11-07', velMin: 5, saltoKm: 3, huecoMin: 30,
        noEncontradas: ['999'], ambiguas: [],
        filas: [{
            eco: '105', nombre: 'CAMION 105', estado: 'ok', dias: 1, km: 22.1,
            minMov: 120, minCubierto: 180, velMov: 11.1, velPeriodo: 7.4,
            velMax: 80, muestras: 3, truncado: false,
            diasDetalle: [],
            dias: [{ fecha: '2026-11-01', km: 22.1, minMov: 120, minCubierto: 180, velMov: 11.1, velPeriodo: 7.4, muestras: 3 }]
        }]
    };
    res.resumen = mod.rxVelTotales(res.filas);
    const csv = mod.rxVelCSV(res);
    ok('csv: cabecera y metadatos', csv.indexOf('Velocidad promedio por unidad') >= 0 &&
        csv.indexOf('2026-11-01') >= 0 && csv.indexOf('No encontrados: 999') >= 0);
    ok('csv: fila de la unidad', csv.indexOf('CAMION 105') >= 0 && csv.indexOf('11,1') >= 0);
    ok('csv: bloque de detalle por dia', csv.indexOf('Detalle por d') >= 0 && csv.indexOf('2026-11-01') >= 0);
    ok('csv: la columna de dias cuenta dias, no vuelca el array', csv.indexOf('[object Object]') < 0);
    ok('csv: nombre de archivo', mod.rxVelNombreArchivo('2026-11-01', '2026-11-07') ===
        'rondo_velocidad_promedio_2026-11-01_a_2026-11-07.csv');

    const html = mod.rxVelHTML(res);
    ok('pdf: titulo y periodo', html.indexOf('Velocidad promedio por unidad') >= 0 && html.indexOf('2026-11-07') >= 0);
    ok('pdf: grafica de barras', html.indexOf('rxv-bar') >= 0 && html.indexOf('11,1 km/h') >= 0);
    ok('pdf: tabla y metodologia', html.indexOf('Detalle por unidad') >= 0 && html.indexOf('se calcula') >= 0);
    ok('pdf: nota de numeros no encontrados', html.indexOf('sin coincidencia') >= 0);
}

// ── Motor del lote (sin red) ─────────────────────────────────────────────
(async () => {
    const t0 = Math.floor(new Date(2026, 10, 10, 8, 0, 0).getTime() / 1000);
    const UNI = [{ id: '1', eco: '105', nombre: 'CAMION 105' }, { id: '2', eco: '208', nombre: 'ECO 208' }];
    const carga = async (id) => {
        if (String(id) === '2') throw new Error('sin historial');
        return {
            msgs: [
                { t: t0, pos: { y: 20.0, x: -103.0, s: 0 } },
                { t: t0 + 3600, pos: { y: 20.1, x: -103.0, s: 60 } }
            ]
        };
    };
    const prog = [];
    const filas = await mod.rxVelCorre(UNI, { desde: t0, hasta: t0 + 7200, velMin: 5, saltoKm: 3, huecoMin: 240 },
        (h, t, eco) => prog.push([h, t, eco]), null, carga);
    ok('lote: conserva una fila por unidad', filas.length === 2, filas.length);
    ok('lote: la unidad con historial queda OK', filas[0].estado === 'ok' && filas[0].km > 11,
        JSON.stringify({ estado: filas[0].estado, km: filas[0].km }));
    ok('lote: el error de una unidad no tira el lote', filas[1].estado === 'error' &&
        filas[1].error.indexOf('sin historial') >= 0, filas[1].error);
    ok('lote: reporta avance', prog.length >= 2 && prog[prog.length - 1][0] === 2,
        JSON.stringify(prog));

    // ── Dialogo ──────────────────────────────────────────────────────────
    mod.setUnidades([{ id: 1, nm: 'CAMION 105' }, { id: 2, nm: 'ECO 208' }]);
    mod.abrirVelocidadPromedio();
    const dlg = global.__rxvelDlg;
    ok('dialogo: se abre con el titulo y el cuerpo', !!dlg &&
        dlg.titulo === 'Velocidad promedio por unidad' && dlg.html.indexOf('rxvel-box') >= 0);
    const cont = mod.fakeEl('contenedor');
    const box = mod.fakeEl('rxvel-box');
    cont.children['rxvel-box'] = box;
    mod.nodos['rxvel-box'] = box;
    dlg.onOpen(cont);
    const html = box.innerHTML;
    ok('dialogo: pide la lista de economicos', html.indexOf('rxvel-nums') >= 0);
    ok('dialogo: muestra pasos de periodo y calculo', html.indexOf('Periodo') >= 0 && html.indexOf('C\u00e1lculo') >= 0);
    ok('dialogo: boton de calcular con el conteo', html.indexOf('rxvel-generar') >= 0 && html.indexOf('Calcular') >= 0 &&
        html.indexOf('rxvel-gen-n') >= 0);
    ok('dialogo: la barra de avance nace oculta', html.indexOf('id="rxvel-prog"') >= 0 && html.indexOf('display:none') >= 0);
    ok('dialogo: sin resultados todavia', html.indexOf('A\u00fan no hay resultados') >= 0);
    ok('dialogo: engancha los eventos', !!box.handlers.click && !!box.handlers.input && !!box.handlers.change);

    // ── Flujo completo: calcular y descargar ─────────────────────────────
    const click = (id) => {
        const btn = { id: id, dataset: {}, closest: function (sel) { return sel === 'button' ? btn : null; } };
        const ev = { target: { closest: function (sel) { return sel === 'button' ? btn : null; } } };
        (box.handlers.click || []).forEach((h) => h(ev));
    };
    mod.RX_VEL.texto = '105';
    mod.RX_VEL.desde = '2026-11-01';
    mod.RX_VEL.hasta = '2026-11-07';
    click('rxvel-generar');
    await new Promise((r) => setTimeout(r, 20));
    ok('flujo: calcula y pinta resultados', !!mod.RX_VEL.res && mod.RX_VEL.res.filas.length === 1 &&
        mod.RX_VEL.res.filas[0].estado === 'ok' && mod.RX_VEL.res.filas[0].km > 11,
        JSON.stringify(mod.RX_VEL.res && mod.RX_VEL.res.filas[0]));
    ok('flujo: muestra las salidas', box.innerHTML.indexOf('rxvel-csv') >= 0 && box.innerHTML.indexOf('rxvel-pdf') >= 0);
    click('rxvel-csv');
    ok('flujo: descarga CSV', String(global.__rxvelCsv || '').indexOf('CAMION 105') >= 0);
    click('rxvel-pdf');
    ok('flujo: prepara el PDF', String(global.__rxvelPdf || '').indexOf('Velocidad promedio por unidad') >= 0);

    console.log('');
    if (fallos) { console.log('FALLO - ' + fallos + ' check(s) con error'); process.exit(1); }
    console.log('Todos los tests pasan');
})();
