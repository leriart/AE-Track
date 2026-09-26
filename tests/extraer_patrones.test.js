/*
 * Pruebas del fallback extraerPatronesDeTexto (v5.14.2).
 * Cuando el proveedor devuelve texto en vez de JSON estricto
 * (modelos que envuelven en markdown o generan prosa), este
 * helper intenta recuperar la estructura basica por regex.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('function extraerPatronesDeTexto');
const fin = src.indexOf('\n    /* ======================', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro la funcion extraerPatronesDeTexto en ' + ARCHIVO);
    process.exit(1);
}
const code = src.slice(ini, fin) + '\nreturn extraerPatronesDeTexto;';
const fn = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

ok('null con null', fn(null) === null);
ok('null con undefined', fn(undefined) === null);
ok('null con string vacio', fn('') === null);
ok('null con texto libre', fn('hola mundo') === null);
ok('null con numero', fn(123) === null);

const t1 = '{"patrones":[{"descripcion":"La unidad 4381 acumula 8 avisos de sinSenal entre 02 y 04"}],"sugerencias":[{"parametro":"offlineMin","valor_actual":5,"valor_sugerido":10,"motivo":"x"}]}';
const r1 = fn(t1);
ok('extrae parametro', r1 && r1.sugerencias[0].parametro === 'offlineMin');
ok('extrae valor sugerido numerico', r1 && r1.sugerencias[0].valor_sugerido === 10);
ok('extrae descripcion de patron', r1 && r1.patrones.length === 1 && /4381/.test(r1.patrones[0].descripcion));

const t2 = '{"sugerencias":[{"parametro":"velMax","valor_sugerido":90}]}';
const r2 = fn(t2);
ok('1 sugerencia sin patrones', r2 && r2.sugerencias.length === 1 && r2.patrones.length === 0);

const t3 = '{"patrones":[{"descripcion":"corto"},{"descripcion":"este es un patron lo suficientemente largo para matchear"}]}';
const r3 = fn(t3);
ok('filtra descripcion corta y conserva la larga', r3 && r3.patrones.length === 1 && /largo/.test(r3.patrones[0].descripcion));

// Solo un patron corto y sin sugerencias -> null (no hay nada que mostrar)
ok('solo patron corto sin sugerencias -> null', fn('{"patrones":[{"descripcion":"corto"}]}') === null);

// Caso real: el modelo devolvio prosa y el JSON esta embebido.
const t5 = 'Aqui tienes mi analisis:\n\n```json\n{"sugerencias":[{"parametro":"gpsMin","valor_sugerido":10}]}\n```\n\nEspero que ayude.';
const r5 = fn(t5);
ok('extrae de prosa con markdown', r5 && r5.sugerencias[0].parametro === 'gpsMin');

// Cap a 10 patrones
const t6 = '{"patrones":[' + Array(15).fill(0).map((_, i) =>
    '{"descripcion":"patron largo numero ' + i + ' con suficiente texto"}').join(',') + ']}';
const r6 = fn(t6);
ok('corta a 10 patrones', r6 && r6.patrones.length === 10);

// Multiples sugerencias
const t7 = '{"sugerencias":[{"parametro":"offlineMin","valor_sugerido":15},{"parametro":"gpsMin","valor_sugerido":20}]}';
const r7 = fn(t7);
ok('multiples sugerencias', r7 && r7.sugerencias.length === 2 &&
    r7.sugerencias[0].parametro === 'offlineMin' &&
    r7.sugerencias[1].parametro === 'gpsMin');

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);