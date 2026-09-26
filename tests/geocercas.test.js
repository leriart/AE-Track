/*
 * Pruebas del analisis de geocercas (v5.15.1): area y geometria correctas
 * para circulos, poligonos y polilineas. Regresion del bug que mostraba
 * 7,854 m2 en todas las geocercas (los poligonos caian en la rama de circulo).
 *
 * Extrae el bloque GEOCERCAS: ANALISIS Y EXPORT con stubs de las funciones
 * que viven fuera (centroDeZona, rad, isBase, esZonaCarga).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== GEOCERCAS: ANALISIS Y EXPORT');
const fin = src.indexOf('    function paintGeocercas() {', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de analisis de geocercas en ' + ARCHIVO);
    process.exit(1);
}

const code =
    'function rad(d){return d*Math.PI/180;}\n' +
    // centroDeZona real simplificado (ya se prueba en paradas.test.js).
    'function centroDeZona(z){ if(!z) return null; const b=z.b||{}; let p=z.p; if(typeof p==="string"){try{p=JSON.parse(p);}catch(_){p=null;}} const radio=(z.w!=null?+z.w:(z.r!=null?+z.r:0)); const cx=(z.c&&z.c.x!=null)?+z.c.x:(b.cen_x!=null?+b.cen_x:null); const cy=(z.c&&z.c.y!=null)?+z.c.y:(b.cen_y!=null?+b.cen_y:null); const min=(z.t===1)?2:3; const circ=(z.t===3)||((!Array.isArray(p)||p.length<min)&&cx!=null&&cy!=null&&radio>0); if(circ&&cx!=null&&cy!=null) return {lat:cy,lon:cx}; if(Array.isArray(p)&&p.length){let sl=0,so=0,n=0;for(const a of p){const la=(a&&a.y!=null)?+a.y:+a[1];const lo=(a&&a.x!=null)?+a.x:+a[0];if(!isNaN(la)&&!isNaN(lo)){sl+=la;so+=lo;n++;}}if(n)return{lat:sl/n,lon:so/n};} if(cx!=null&&cy!=null)return{lat:cy,lon:cx}; return null; }\n' +
    'function isBase(z){return /\\b(GENA|CEDIS|PATIO|PLANTA)\\b/.test(String(z||"").toUpperCase());}\n' +
    'function esZonaCarga(z){return /\\b(CARGA|CEDIS|BODEGA)\\b/.test(String(z||"").toUpperCase());}\n' +
    'const APP={zonas:[],geoFiltro:"",geoRol:"todas"};\n' +
    src.slice(ini, fin) +
    '\nreturn {zonaAreaM2,zonaGeometry,zonaRol,_zonaPuntos,_zonaEsCirculo,zonasStats,centroDeZona};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(rel, a, b) { return Math.abs(a - b) / Math.max(1, b) <= rel; }

// --- Circulo ---
const circ = { t: 3, w: 100, b: { cen_x: 0, cen_y: 0 } };
ok('area circulo: pi*r^2', casi(0.001, mod.zonaAreaM2(circ), Math.PI * 100 * 100), mod.zonaAreaM2(circ));
ok('geometria circulo: Point', mod.zonaGeometry(circ).type === 'Point');

// --- Poligono (rectangulo ~1 km) ---
const rect = {
    t: 2,
    b: { cen_x: 0.005, cen_y: 0.005, min_x: 0, min_y: 0, max_x: 0.01, max_y: 0.01 },
    p: [{ x: 0, y: 0 }, { x: 0.01, y: 0 }, { x: 0.01, y: 0.01 }, { x: 0, y: 0.01 }]
};
const areaEsperada = (0.01 * 111320) * (0.01 * 110540);
ok('area poligono: shoelace ~1.23 km2', casi(0.01, mod.zonaAreaM2(rect), areaEsperada), mod.zonaAreaM2(rect));
ok('geometria poligono: Polygon', mod.zonaGeometry(rect).type === 'Polygon');
ok('geometria poligono: anillo cerrado', (function () {
    const r = mod.zonaGeometry(rect).coordinates[0];
    return r.length === 5 && r[0][0] === r[4][0] && r[0][1] === r[4][1];
})());

// --- Regresion: poligono con b.cen_x y w presentes NO debe ser circulo ni 7854 ---
const poligonoConW = {
    t: 2, w: 50,
    b: { cen_x: 0.005, cen_y: 0.005 },
    p: [{ x: 0, y: 0 }, { x: 0.02, y: 0 }, { x: 0.02, y: 0.02 }, { x: 0, y: 0.02 }]
};
const areaW = mod.zonaAreaM2(poligonoConW);
ok('regresion: poligono no da 7854 m2', Math.abs(areaW - 7854) > 1000, 'area=' + Math.round(areaW));
ok('regresion: poligono usa shoelace (no pi*r^2)', !casi(0.01, areaW, Math.PI * 50 * 50), 'area=' + Math.round(areaW));

// --- Poligono sin tipo pero con puntos ---
const sinTipo = { p: [{ x: 0, y: 0 }, { x: 0.005, y: 0 }, { x: 0.005, y: 0.005 }, { x: 0, y: 0.005 }] };
ok('poligono sin tipo: area > 0', mod.zonaAreaM2(sinTipo) > 100000, mod.zonaAreaM2(sinTipo));
ok('poligono sin tipo: geometria Polygon', mod.zonaGeometry(sinTipo).type === 'Polygon');

// --- Linea: longitud x ancho ---
const linea = { t: 1, w: 5, p: [{ x: 0, y: 0 }, { x: 0.01, y: 0 }] };
const areaLinea = mod.zonaAreaM2(linea);
ok('linea: area = longitud x ancho', casi(0.02, areaLinea, 0.01 * 111320 * 10), Math.round(areaLinea));

// --- _zonaEsCirculo ---
ok('_zonaEsCirculo: t=3 true', mod._zonaEsCirculo({ t: 3, w: 10, b: { cen_x: 0, cen_y: 0 } }) === true);
ok('_zonaEsCirculo: poligono false', mod._zonaEsCirculo(rect, rect.p) === false);

// --- Rol ---
ok('zonaRol: base', mod.zonaRol({ n: 'PATIO NORTE' }) === 'base');
ok('zonaRol: carga', mod.zonaRol({ n: 'CEDIS CENTRAL' }) === 'base'); // CEDIS es base primero
ok('zonaRol: carga real', mod.zonaRol({ n: 'ZONA DE CARGA' }) === 'carga');
ok('zonaRol: normal', mod.zonaRol({ n: 'Cliente XYZ' }) === 'normal');

// --- Centro: poligono usa promedio de puntos ---
const cen = mod.centroDeZona(rect);
ok('centroDeZona: poligono promedio', casi(0.001, cen.lat, 0.005) && casi(0.001, cen.lon, 0.005));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
