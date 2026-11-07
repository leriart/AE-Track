/*
 * Pruebas del arranque y del refresco: evaluacion en lotes (rxEnLotes),
 * capa de rendimiento aplicada desde el primer frame, espera de sesion sin
 * rendirse, geocodificacion serializada y repintado pausado con el panel
 * oculto.
 *
 * rxEnLotes se extrae del bundle y se ejecuta con promesas reales; el resto
 * son comprobaciones de la fuente (no usan red ni navegador).
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

function extraerFuncion(nombre, asincrona) {
    const i = src.indexOf((asincrona ? 'async function ' : 'function ') + nombre + '(');
    if (i < 0) return '';
    let depth = 0, started = false;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (c === '{') { depth++; started = true; }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
    }
    return '';
}

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    // ── Evaluacion en lotes ────────────────────────────────────────────
    const fnSrc = extraerFuncion('rxEnLotes', true);
    if (!fnSrc) {
        console.error('No se encontro rxEnLotes en ' + ARCHIVO);
        process.exit(1);
    }
    const rxEnLotes = new Function(fnSrc + '\nreturn rxEnLotes;')();

    const orden = await rxEnLotes([1, 2, 3, 4, 5], 2, async (x) => {
        await esperar(x === 1 ? 10 : 1);
        return x * 2;
    });
    ok('rxEnLotes: conserva el orden de la entrada',
        orden.length === 5 && orden[0] === 2 && orden[4] === 10, JSON.stringify(orden));

    let activos = 0, pico = 0;
    await rxEnLotes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3, async () => {
        activos++;
        if (activos > pico) pico = activos;
        await esperar(5);
        activos--;
    });
    ok('rxEnLotes: nunca supera el limite', pico <= 3, 'pico=' + pico);
    ok('rxEnLotes: aprovecha el limite completo', pico === 3, 'pico=' + pico);

    const errores = [];
    const mixto = await rxEnLotes([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error('fallo simulado');
        return x;
    }, (e, item) => errores.push(item));
    ok('rxEnLotes: aisla el error y sigue con el resto',
        mixto[0] === 1 && mixto[1] === undefined && mixto[2] === 3 && errores.length === 1 && errores[0] === 2);

    const vacio = await rxEnLotes([], 4, async () => 1);
    const noArray = await rxEnLotes(null, 4, async () => 1);
    ok('rxEnLotes: entrada vacia o invalida devuelve []',
        Array.isArray(vacio) && vacio.length === 0 && Array.isArray(noArray) && noArray.length === 0);

    // ── Fuente: arranque, refresh y rendimiento ───────────────────────
    ok('header arranca en document-end (la UI aparece antes en paginas pesadas)',
        /\/\/ @run-at\s+document-end/.test(src));
    ok('init evita duplicarse en un iframe de la misma plataforma',
        /function rxEsMarcoDuplicado\(/.test(src) && /if \(rxEsMarcoDuplicado\(\)\) return;/.test(src));
    ok('init aplica la capa de rendimiento antes de construir la UI',
        /rxAplicarRendimientoPagina\(\);[\s\S]{0,600}injectCSS\(\);/.test(src));
    ok('init pinta el panel abierto con datos persistidos antes de la API',
        /if \(!APP\.panelHidden\) \{ try \{ paintPanel\(\); \}/.test(src));
    ok('init ya no abandona la sesion a los 120 s',
        /while \(!currentUser\(\)\)/.test(src) && src.indexOf('intentos < 120') < 0);
    ok('helper wialonListo para reintentar la API',
        /function wialonListo\(\)/.test(src) && /const w = PAGE\.wialon;/.test(src));
    ok('refresh evalua en lotes con limite',
        /const RX_REFRESH_CONC = 6;/.test(src) && /rxEnLotes\(watched, RX_REFRESH_CONC/.test(src));
    ok('refresh pide unidades y geocercas a la vez',
        /const zonasP = necesitaZonas \? fetchZones\(\)\.catch\(\(\) => \[\]\) : null;/.test(src));
    ok('refresh conserva las geocercas dibujadas en Rondo',
        /glocSincroniza\(glocLista\(\)\)/.test(src));
    ok('geocercas con reintento diferido (no 4 busquedas cada 10 s)',
        /RX_ZONAS_REINTENTO_MS = 5 \* 60000/.test(src) && /_rxZonasProximo = zs\.length \? 0 : \(Date\.now\(\) \+ RX_ZONAS_REINTENTO_MS\)/.test(src));
    ok('get_zone_data de varios recursos en paralelo',
        /await rxEnLotes\(recursos, 4,/.test(src));
    ok('geocodificacion serializada (cuota de Nominatim)',
        /_rxGeoCola/.test(src) && /const p = _rxGeoCola\.then\(ejecutar, ejecutar\)/.test(src));
    ok('el reloj de 1 s se detiene con el panel oculto',
        /APP\.panelHidden \|\| document\.hidden/.test(src));
    ok('refresh no repinta con el panel oculto',
        /if \(!APP\.panelHidden\) paintPanel\(\);/.test(src) && /else APP\._paintRev = 0;/.test(src));

    // ── Capa de rendimiento: sin escaneo completo en el camino caliente ─
    const optimiza = extraerFuncion('rxPerfOptimizaDom');
    ok('rxPerfOptimizaDom ya no recorre todo el DOM',
        !!optimiza && optimiza.indexOf('rxPerfResumen') < 0);
    ok('observer de la pagina con throttle de 3 s y pausa oculta',
        /t - _rxPerfUltimo < 3000/.test(src) && /if \(document\.hidden\) return;/.test(src));
    ok('la capa no reescribe CSS identico',
        /if \(el\.textContent !== cssPerf\) el\.textContent = cssPerf;/.test(src));

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();
