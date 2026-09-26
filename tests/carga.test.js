/*
 * Pruebas de la "Carga rapida de rutas": parseo de la lista de clientes
 * (texto pegado o filas de Excel) y emparejamiento por busqueda difusa.
 * Extrae el bloque rxCargaParse.. con stubs de norm/fuzzyScore.
 */
'use strict';

const { src } = require('./_source.js');

const ini = src.indexOf('/* === BEGIN: rxCargaParse === */');
const fin = src.indexOf('/* === END: rxCargaParse === */');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque rxCargaParse en el bundle');
    process.exit(1);
}
const code =
    'function norm(s){return String(s==null?"":s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim();}\n' +
    'function fuzzyScore(q,t){const a=norm(q),b=norm(t);if(!a||!b)return 0;if(b.indexOf(a)>=0)return 500;const at=a.split(" ");let hit=0;for(const w of at){if(w.length>3&&b.indexOf(w)>=0)hit++;}return hit?300+hit:0;}\n' +
    src.slice(ini, fin) +
    '\nreturn {rxCargaLimpiarCliente,rxCargaColumnaCliente,rxCargaParsearFilas,rxCargaParsearTexto,rxCargaEmparejarCliente,rxCargaConfianza};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Limpieza
ok('limpiar: quita numeracion "1. "', mod.rxCargaLimpiarCliente('1. SERVI CARNES DE VALLARTA C30') === 'SERVI CARNES DE VALLARTA C30');
ok('limpiar: quita "2)"', mod.rxCargaLimpiarCliente('2)IMPORTADORA CALLE 7') === 'IMPORTADORA CALLE 7');
ok('limpiar: colapsa espacios', mod.rxCargaLimpiarCliente('  SERVI   CARNES  ') === 'SERVI CARNES');

// Texto pegado: una linea por cliente
const linea = mod.rxCargaParsearTexto('1. SERVI CARNES DE VALLARTA C30\n2.IMPORATODARA DE SERVICARNES CALLE 30\n3.SERVICARNES DE VALLARTA CALLE 7\n4.IMPORTADORA DE SERVICARNES CALLE 7\n');
ok('texto: 4 clientes', linea.length === 4, 'n=' + linea.length);
ok('texto: limpia numeracion', linea[0] === 'SERVI CARNES DE VALLARTA C30' && linea[2] === 'SERVICARNES DE VALLARTA CALLE 7');

// Dedupe
const conDup = mod.rxCargaParsearTexto('CLIENTE A\nCLIENTE A\ncliente a\nCLIENTE B\n');
ok('texto: deduplica (case-insensitive)', conDup.length === 2, 'n=' + conDup.length);

// Ignora lineas muy cortas / vacias
ok('texto: ignora vacias y cortas', mod.rxCargaParsearTexto('\n\nab\n\nCLIENTE VALIDO UNO\n').length === 1);

// Tabla con encabezado "Cliente" (estilo Excel pegado)
const tabla = [
    ['No. Pedido', '', '', 'Cliente', 'Producto', 'Tipo'],
    ['', '', '', 'SERVI CARNES DE VALLARTA C30', 'ESPALDA', 'REFRIGERADO'],
    ['', '', '', 'SERVI CARNES DE VALLARTA C30', 'PAPADA', 'REFRIGERADO'],
    ['', '', '', 'IMPORTADORA DE SERVICARNES CALLE 7', 'ESPALDA', 'REFRIGERADO'],
];
const hdr = mod.rxCargaColumnaCliente(tabla);
ok('tabla: detecta columna Cliente', hdr && hdr.col === 3, JSON.stringify(hdr));
const cli = mod.rxCargaParsearFilas(tabla);
ok('tabla: 2 clientes unicos', cli.length === 2, 'n=' + cli.length);
ok('tabla: nombres correctos', cli[0] === 'SERVI CARNES DE VALLARTA C30' && cli[1] === 'IMPORTADORA DE SERVICARNES CALLE 7');

// Emparejamiento difuso
const zonas = [
    { id: 1, n: 'SERVICARNES DE VALLARTA C30' },
    { id: 2, n: 'IMPORTADORA DE SERVICARNES CALLE 7' },
    { id: 3, n: 'CEDIS NORTE' }
];
const m1 = mod.rxCargaEmparejarCliente('SERVI CARNES DE VALLARTA C30', zonas);
ok('match: elige la geocerca correcta', m1.zona && m1.zona.id === 1, JSON.stringify(m1));
const m2 = mod.rxCargaEmparejarCliente('IMPORATODARA DE SERVICARNES CALLE 7', zonas);
ok('match: tolera typo', m2.zona && m2.zona.id === 2, JSON.stringify(m2));
const m3 = mod.rxCargaEmparejarCliente('ZZZZ', zonas);
ok('match: sin coincidencia -> score 0', m3.score === 0);
ok('confianza: etiquetas', mod.rxCargaConfianza(900).etq === 'alta' && mod.rxCargaConfianza(500).etq === 'media' && mod.rxCargaConfianza(10).etq === 'baja' && mod.rxCargaConfianza(0).etq === 'sin');

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
