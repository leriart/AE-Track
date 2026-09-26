/* ====================== CSS ====================== */
    function injectCSS() {
        const css =
            ":root{\n" +
            "  --rondo-bg:#1f2330; --rondo-bg-soft:#272d3c; --rondo-bg-strong:#313849;\n" +
            "  --rondo-border:#3a4252; --rondo-border-soft:#2f3645;\n" +
            "  --rondo-fg:#e8ecf3; --rondo-fg-dim:#9aa4b5; --rondo-fg-mute:#6f7888;\n" +
            "  --rondo-accent:#850D22; --rondo-accent-2:#B52C44; --rondo-accent-rgb:133,13,34;\n" +
            "  --rondo-ok:#43a047; --rondo-ok-fg:#a5d6a7; --rondo-ok-bg:#1b3320;\n" +
            "  --rondo-warn:#f9a825; --rondo-warn-fg:#ffe082; --rondo-warn-bg:#33270e;\n" +
            "  --rondo-bad:#e53935; --rondo-bad-fg:#ef9a9a; --rondo-bad-bg:#2b1010;\n" +
            "  --rondo-shadow:0 4px 14px rgba(0,0,0,.32);\n" +
            "  --rondo-radius:10px;\n" +
            "  --rondo-radius-sm:7px;\n" +
            "  --rondo-accent-grad:linear-gradient(135deg,#950f27,#B52C44);\n" +
            "  --rondo-elev:0 10px 26px rgba(0,0,0,.42);\n" +
            "  --rondo-font:'Inter','Roboto','Segoe UI','Helvetica Neue',Arial,sans-serif;\n" +
            "  --rondo-easing:cubic-bezier(.4,0,.2,1);\n" +
            "  --rondo-esc:1;\n" +
            "}\n" +
            "body[data-rondo-theme='claro']{\n" +
            "  --rondo-bg:#f5f7fa; --rondo-bg-soft:#ffffff; --rondo-bg-strong:#eef2f7;\n" +
            "  --rondo-border:#dfe4ec; --rondo-border-soft:#ebeef3;\n" +
            "  --rondo-fg:#1d2433; --rondo-fg-dim:#5b6577; --rondo-fg-mute:#8993a3;\n" +
            "  --rondo-accent:#850D22; --rondo-accent-2:#B52C44;\n" +
            "  --rondo-ok:#2e7d32; --rondo-ok-fg:#1b5e20; --rondo-ok-bg:#e8f5e9;\n" +
            "  --rondo-warn:#f9a825; --rondo-warn-fg:#8d6b00; --rondo-warn-bg:#fff4d4;\n" +
            "  --rondo-bad:#c62828; --rondo-bad-fg:#b71c1c; --rondo-bad-bg:#fde2e2;\n" +
            "  --rondo-shadow:0 2px 8px rgba(20,30,50,.10);\n" +
            "  --rondo-elev:0 8px 22px rgba(20,30,50,.16);\n" +
            "}\n" +
            "#rondo-toasts{position:fixed;bottom:20px;right:15px;z-index:1000002;display:flex;flex-direction:column;gap:8px;width:330px;pointer-events:none;transition:opacity .2s}\n" +
            ".rondo-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:9px;background:var(--rondo-bg-soft);color:var(--rondo-fg);\n" +
            "  border-left:4px solid var(--rondo-accent);border-radius:var(--rondo-radius);padding:10px 12px;box-shadow:var(--rondo-shadow);\n" +
            "  font:12.5px/1.35 var(--rondo-font);animation: rondoIn .28s var(--rondo-easing) both}\n" +
            ".rondo-toast.sale{opacity:0;transform:translateX(40px);transition:all .35s var(--rondo-easing)}\n" +
            "@keyframes rondoIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\n" +
            ".rondo-toast .ico{font-size:18px;line-height:1;width:18px;text-align:center}\n" +
            ".rondo-toast .cuerpo{display:flex;flex-direction:column;flex:1;min-width:0}\n" +
            ".rondo-toast .cuerpo b{font-size:12.5px}\n" +
            ".rondo-toast .cuerpo span{color:var(--rondo-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            ".rondo-toast .hora{color:var(--rondo-fg-mute);font-size:10px}\n" +
            ".rondo-toast .mini{background:transparent;border:none;color:var(--rondo-fg-mute);cursor:pointer;font-size:11px}\n" +
            "#rondo-barra{position:fixed;top:80px;right:15px;z-index:999999;display:flex;flex-wrap:wrap;row-gap:4px;align-items:center;gap:6px;\n" +
            "  background:rgba(28,30,36,.94);border:1px solid var(--rondo-border);border-radius:10px;padding:5px;\n" +
            "  box-shadow:var(--rondo-shadow);font:12px var(--rondo-font);user-select:none;touch-action:none;max-width:95vw}\n" +
            "#rondo-barra.vertical{flex-direction:column;align-items:stretch}\n" +
            "#rondo-barra .rondo-grip{cursor:grab;color:var(--rondo-fg-mute);padding:0 3px;font-size:15px;line-height:1;letter-spacing:-2px;user-select:none}\n" +
            "#rondo-barra .rondo-grip:active{cursor:grabbing}\n" +
            "#rondo-barra .rondo-btn{display:inline-flex;align-items:center;gap:4px;background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:7px 11px;\n" +
            "  cursor:pointer;font:600 12px var(--rondo-font);white-space:nowrap;transition:filter .15s,transform .1s,box-shadow .15s}\n" +
            "#rondo-barra .rondo-btn:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-barra .rondo-btn:active{transform:translateY(0)}\n" +
            "#rondo-barra .rondo-fold{background:var(--rondo-bg);color:var(--rondo-fg-dim);padding:4px 9px}\n" +
            "#rondo-barra.plegada .rondo-btn:not(.rondo-fold){display:none}\n" +
            "#rondo-btn-main,#rondo-btn-panel{background:var(--rondo-accent-grad);color:#fff;border-color:transparent}\n" +
            "#rondo-btn-close{background:var(--rondo-bg-strong);color:var(--rondo-fg-dim)}\n" +
            "#rondo-btn-update{background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff;border-color:transparent;box-shadow:0 0 0 0 rgba(67,160,71,.5);animation: rondoPulseGreen 2s infinite}\n" +
            "#rondo-panel .rondo-tile.armado,#rondo-barra .rondo-btn.armado{background:linear-gradient(135deg,#b71c1c,#e53935)!important;color:#fff!important;border-color:transparent!important;animation: rondoArmPulse .7s ease infinite}\n" +
            "@keyframes rondoArmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}\n" +
            "@keyframes rondoPulseGreen{0%{box-shadow:0 0 0 0 rgba(67,160,71,.55)}70%{box-shadow:0 0 0 9px rgba(67,160,71,0)}100%{box-shadow:0 0 0 0 rgba(67,160,71,0)}}\n" +
            "#rondo-panel .rondo-iconbtn.warn{color:var(--rondo-warn)}\n" +
            "#rondo-panel{position:fixed;left:10px;bottom:10px;width:470px;height:440px;display:none;flex-direction:column;\n" +
            "  background:var(--rondo-bg);color:var(--rondo-fg);font:12.5px/1.4 var(--rondo-font);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);\n" +
            "  box-shadow:var(--rondo-elev);z-index:1000000;overflow:hidden;resize:both;min-width:360px;min-height:260px;max-width:1000px;max-height:92vh;\n" +
            "  transition:transform .3s var(--rondo-easing),opacity .2s ease,border-color .2s}\n" +
            "#rondo-panel.visible{opacity:1}\n" +
            "#rondo-panel.lateral{left:auto;right:0;top:0;bottom:0;height:100vh;max-height:100vh;border-radius:0;resize:none;\n" +
            "  box-shadow:-14px 0 34px rgba(0,0,0,.35);border-top:none;border-bottom:none;border-right:none;will-change:transform}\n" +
            "#rondo-panel.lateral.izquierda{left:0;right:auto;box-shadow:14px 0 34px rgba(0,0,0,.35);border-left:none;border-right:1px solid var(--rondo-border)}\n" +
            "#rondo-panel.lateral header{cursor:default}\n" +
            "#rondo-panel.lateral.oculto{transform:translateX(100%);opacity:0;pointer-events:none}\n" +
            "#rondo-panel.lateral.izquierda.oculto{transform:translateX(-100%)}\n" +
            "#rondo-rail{position:fixed;top:50%;transform:translateY(-50%);width:34px;height:104px;background:var(--rondo-accent-grad);\n" +
            "  border:none;border-radius:17px;display:none;align-items:center;justify-content:center;flex-direction:column;gap:2px;\n" +
            "  cursor:pointer;z-index:999999;box-shadow:var(--rondo-elev);color:#fff;font:600 15px var(--rondo-font);\n" +
            "  opacity:0;transition:transform .25s var(--rondo-easing),opacity .25s ease,filter .15s}\n" +
            "#rondo-rail:hover{transform:translateY(-50%) scale(1.08);filter:brightness(1.12)}\n" +
            "#rondo-rail.mostrar{display:flex;opacity:1;animation: rondoRailIn .3s var(--rondo-easing)}\n" +
            "#rondo-rail .rondo-rail-txt{writing-mode:vertical-rl;text-orientation:mixed;font-size:9px;letter-spacing:1.5px;opacity:.85}\n" +
            "#rondo-rail.derecha{right:0;border-radius:17px 0 0 17px;padding-right:2px}\n" +
            "#rondo-rail.izquierda{left:0;border-radius:0 17px 17px 0;padding-left:2px}\n" +
            "@keyframes rondoRailIn{from{opacity:0;transform:translateY(-50%) scale(.8)}to{opacity:1;transform:translateY(-50%) scale(1)}}\n" +
            "#rondo-panel header{display:flex;align-items:center;gap:4px;padding:8px 10px;background:linear-gradient(180deg,var(--rondo-bg-strong),var(--rondo-bg-soft));cursor:move;border-bottom:1px solid var(--rondo-border-soft);flex-wrap:wrap;box-shadow:0 1px 0 rgba(255,255,255,.03)}\n" +
            "#rondo-panel header h3{margin:0 6px 0 2px;font-size:13px;flex:1;letter-spacing:.2px;font-weight:700;min-width:110px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n" +
            // v5.14.2: chip de version en linea con el titulo. v5.14.1 lo
            // puso como boton aparte al final de la cabecera; el usuario
            // prefierio tenerlo pegado al 'Rondo'. Sigue siendo boton
            // (clickable) pero vive dentro del h3, con estilo mas discreto.
            "#rondo-panel #rondo-version-chip{display:inline-flex;align-items:center;height:18px;padding:0 7px;font:700 10.5px var(--rondo-font);border-radius:9px;border:1px solid var(--rondo-border);background:var(--rondo-bg-soft);color:var(--rondo-fg-dim);cursor:pointer;transition:all .15s var(--rondo-easing);margin-left:2px;vertical-align:middle;line-height:1}\n" +
            "#rondo-panel #rondo-version-chip:hover{transform:translateY(-1px);box-shadow:var(--rondo-shadow);border-color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"current\"]{color:var(--rondo-ok-fg,#2e7d32);border-color:rgba(46,125,50,.45);background:rgba(46,125,50,.1)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"available\"]{color:var(--rondo-bad-fg,#b71c1c);border-color:rgba(183,28,28,.5);background:rgba(183,28,28,.12);animation:rondo-ver-pulse 1.6s ease-in-out infinite}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"ahead\"]{color:var(--rondo-fg-dim);border-color:var(--rondo-border)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"checking\"]{color:var(--rondo-accent-2);border-color:rgba(var(--rondo-accent-rgb),.5);background:rgba(var(--rondo-accent-rgb),.08)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"unknown\"]{color:var(--rondo-warn-fg,#f9a825);border-color:rgba(249,168,37,.5);background:rgba(249,168,37,.12)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"error\"]{color:var(--rondo-warn-fg,#f9a825);border-color:rgba(249,168,37,.5);background:rgba(249,168,37,.12)}\n" +
            "#rondo-panel #rondo-version-chip[data-estado=\"stale\"]{color:var(--rondo-bad-fg,#b71c1c);border-color:rgba(183,28,28,.5);background:rgba(183,28,28,.12);animation:rondo-ver-pulse 1.6s ease-in-out infinite}\n" +
            "#rondo-panel .rondo-rutas-bar{display:flex;align-items:center;gap:8px;padding:7px 9px;border-bottom:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .rondo-rutas-pend{flex:1;min-width:0;font-size:11.5px;color:var(--rondo-warn-fg);font-weight:600}\n" +
            // v6.0.7: tarjeta de ruta rediseñada (datos legibles y ordenados).
            "#rondo-panel #rondo-lista-rutas{display:flex;flex-direction:column;gap:8px;padding:8px}\n" +
            "#rondo-panel .rondo-ruta-card{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-left:4px solid var(--rondo-accent-2);border-radius:var(--rondo-radius-sm);padding:8px 10px;display:flex;flex-direction:column;gap:6px}\n" +
            "#rondo-panel .rondo-ruta-card.est-ok{border-left-color:var(--rondo-ok)}\n" +
            "#rondo-panel .rondo-ruta-card.est-desv{border-left-color:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-ruta-card.est-sin{border-left-color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-ruta-card.est-pend{border-left-color:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-ruta-card .rr-eco{font:700 14px var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est{font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.4px;border-radius:9px;padding:2px 7px;border:1px solid var(--rondo-border);white-space:nowrap}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est-ok{color:var(--rondo-ok-fg);border-color:rgba(67,160,71,.5);background:rgba(67,160,71,.12)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est-desv{color:var(--rondo-bad-fg);border-color:rgba(183,28,28,.5);background:rgba(183,28,28,.12)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est-ruta{color:var(--rondo-accent-2);border-color:rgba(var(--rondo-accent-rgb),.55);background:rgba(var(--rondo-accent-rgb),.1)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est-sin{color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-est-pend{color:var(--rondo-warn-fg);border-color:rgba(249,168,37,.5);background:rgba(249,168,37,.12)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-km{font:700 12.5px var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-modo{font:600 10.5px var(--rondo-font);color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-actions{margin-left:auto;display:inline-flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}\n" +
            "#rondo-panel .rondo-ruta-card .rr-actions .mini{padding:2px 5px}\n" +
            "#rondo-panel .rondo-ruta-card .rr-dest{font-size:12.5px;color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-ruta-card .rr-progress{height:6px;background:var(--rondo-bg);border-radius:3px;overflow:hidden}\n" +
            "#rondo-panel .rondo-ruta-card .rr-progress-fill{height:100%;background:var(--rondo-accent-2);transition:width .3s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-ruta-card .rr-meta{display:flex;flex-wrap:wrap;gap:5px}\n" +
            "#rondo-panel .rondo-ruta-card .rr-chip{font:600 10.5px var(--rondo-font);color:var(--rondo-fg-dim);background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:1px 7px;white-space:nowrap}\n" +
            "#rondo-panel .rondo-ruta-card .rr-mini{height:150px;margin-top:2px}\n" +
            // v6.0.11: replay del dia.
            "#rondo-panel .rondo-replay-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-replay-bar .filtro{min-width:0}\n" +
            "#rondo-panel .rondo-replay-mapa{width:100%;height:240px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:10px;overflow:hidden;margin:8px 0}\n" +
            "#rondo-panel .rondo-replay-mapa svg{width:100%;height:100%;display:block}\n" +
            "#rondo-panel .rondo-replay-vacio{display:flex;align-items:center;justify-content:center;height:100%;font-size:11.5px;color:var(--rondo-fg-mute);padding:10px;text-align:center}\n" +
            "#rondo-panel .rondo-replay-ctrl{display:flex;gap:6px;align-items:center;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-replay-ctrl input[type=range]{flex:1;min-width:110px}\n" +
            "#rondo-panel .rondo-replay-info{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}\n" +
            "#rondo-panel .rondo-replay-info .rr-chip{font:600 11px var(--rondo-font);color:var(--rondo-fg-dim);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:2px 7px}\n" +
            "#rondo-panel .rondo-replay-eventos{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow:auto}\n" +
            "#rondo-panel .rondo-replay-ev{display:flex;gap:8px;align-items:center;font-size:11.5px;padding:5px 7px;border-radius:7px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);cursor:pointer}\n" +
            "#rondo-panel .rondo-replay-ev:hover{border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-replay-ev.activo{box-shadow:inset 0 0 0 1px var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-ev .ev-hora{color:var(--rondo-fg-dim);flex:0 0 auto;font-variant-numeric:tabular-nums}\n" +
            "#rondo-panel .rondo-replay-ev .ev-tipo{font-size:9.5px;text-transform:uppercase;letter-spacing:.3px;border-radius:6px;padding:1px 5px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);flex:0 0 auto}\n" +
            "#rondo-panel .rondo-replay-ev .ev-parada{color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-ev .ev-exceso{color:#b71c1c}\n" +
            "#rondo-panel .rondo-replay-ev .ev-desvio{color:#e65100}\n" +
            "#rondo-panel .rondo-replay-ev .ev-zona{color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-ev .ev-txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-replay-sec{margin-top:8px}\n" +
            "#rondo-panel .rondo-replay-sec h5{margin:0 0 4px;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-lista{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto}\n" +
            "#rondo-panel .rondo-replay-par{display:flex;gap:8px;align-items:center;font-size:11.5px;padding:5px 7px;border-radius:7px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);cursor:pointer}\n" +
            "#rondo-panel .rondo-replay-par:hover{border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-replay-par.activo{box-shadow:inset 0 0 0 1px var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-par .par-idx{width:18px;height:18px;flex:0 0 auto;border-radius:50%;background:var(--rondo-bg-strong);display:inline-flex;align-items:center;justify-content:center;font:700 10px var(--rondo-font)}\n" +
            "#rondo-panel .rondo-replay-par .par-hora{color:var(--rondo-fg-dim);font-variant-numeric:tabular-nums;flex:0 0 auto}\n" +
            "#rondo-panel .rondo-replay-par .par-dur{flex:0 0 auto;color:var(--rondo-accent-2);font-weight:600}\n" +
            "#rondo-panel .rondo-replay-par .par-lugar{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-replay-acciones{display:flex;gap:6px;margin-top:8px}\n" +
            "#rondo-panel .rondo-replay-hint{font-size:11px;color:var(--rondo-fg-mute)}\n" +
            // v6.0.11: mini-mapa propio (global: se usa en el panel y en el dialogo de ruta).
            ".rondo-minimapa{height:min(64vh,560px);border-radius:10px;overflow:hidden}\n" +
            ".rondo-mm{position:relative;overflow:hidden;background:var(--rondo-bg-strong);cursor:grab;touch-action:none;border-radius:10px;border:1px solid var(--rondo-border-soft)}\n" +
            ".rondo-mm:active{cursor:grabbing}\n" +
            ".rondo-mm-tiles{position:absolute;inset:0}\n" +
            ".rondo-mm-tile{position:absolute;width:256px;height:256px;user-select:none;pointer-events:none}\n" +
            ".rondo-mm-svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}\n" +
            ".rondo-mm-atrib{position:absolute;right:3px;bottom:2px;font-size:9px;color:#222;background:rgba(255,255,255,.72);padding:0 3px;border-radius:3px;pointer-events:none}\n" +
            ".rondo-mm-resumen{font-size:12.5px;color:var(--rondo-fg-dim);margin:0 0 8px}\n" +
            ".rondo-mm-hint{font-size:11px;color:var(--rondo-fg-dim);margin-top:6px}\n" +
            "@keyframes rondo-ver-pulse{0%,100%{box-shadow:0 0 0 0 rgba(183,28,28,.45)}50%{box-shadow:0 0 0 5px rgba(183,28,28,0)}}\n" +
            "#rondo-panel .rondo-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);cursor:pointer;border-radius:var(--rondo-radius-sm);font-size:13px;line-height:1;transition:background .15s var(--rondo-easing),color .15s,transform .1s,box-shadow .15s}\n" +
            "#rondo-panel .rondo-iconbtn .rondo-usym{font-size:16px;font-weight:600;line-height:1}\n" +
            "#rondo-panel .rondo-iconbtn:hover{background:var(--rondo-bg);border-color:var(--rondo-border);color:var(--rondo-fg);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-iconbtn:active{transform:translateY(0)}\n" +
            "#rondo-panel .rondo-iconbtn.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(var(--rondo-accent-rgb),.4)}\n" +
            // Indicador de IA en cabecera: badge (punto/check) sobre el robot.
            "#rondo-panel .rondo-ia-head{position:relative}\n" +
            "#rondo-panel .rondo-ia-badge{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;border:1.5px solid var(--rondo-bg);box-sizing:content-box;pointer-events:none;transition:background .15s,box-shadow .15s}\n" +
            "#rondo-panel .rondo-ia-head.ia-off .rondo-ia-badge{background:var(--rondo-warn-fg,#f9a825)}\n" +
            "#rondo-panel .rondo-ia-head.ia-on .rondo-ia-badge{background:var(--rondo-ok-fg,#2e7d32);box-shadow:0 0 0 2px rgba(46,125,50,.22)}\n" +
            "#rondo-panel .rondo-ia-head.ia-on{color:var(--rondo-ok-fg,#2e7d32)}\n" +
            "#rondo-panel .rondo-ia-head.ia-off{color:var(--rondo-warn-fg,#f9a825)}\n" +
            "#rondo-panel .rondo-ia-head.ia-on .rondo-ia-badge::after{content:'';position:absolute;left:2.5px;top:0.5px;width:3px;height:5px;border:solid #fff;border-width:0 1.5px 1.5px 0;transform:rotate(45deg)}\n" +
            "#rondo-panel .tabs{display:flex;gap:3px;background:var(--rondo-bg-soft);padding:5px 6px;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .tab{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);padding:9px 2px;cursor:pointer;font:600 10.5px/1 var(--rondo-font);border-radius:var(--rondo-radius-sm);letter-spacing:.2px;transition:background .18s var(--rondo-easing),color .18s,box-shadow .18s,transform .1s}\n" +
            +
            "#rondo-panel .tab:hover{color:var(--rondo-fg);background:var(--rondo-bg-strong);transform:translateY(-1px)}\n" +
            "#rondo-panel .tab.activo{color:#fff;background:var(--rondo-accent-grad);box-shadow:0 3px 10px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-panel .tab .contador{font-size:10px;background:var(--rondo-bg-strong);color:var(--rondo-fg-dim);padding:1px 5px;border-radius:8px;margin-left:2px;display:inline-block;font-weight:700}\n" +
            "#rondo-panel .tab.activo .contador{background:rgba(255,255,255,.25);color:#fff}\n" +
            "#rondo-panel .tools{display:flex;gap:6px;padding:7px 9px;border-bottom:1px solid var(--rondo-border-soft);flex-wrap:wrap;align-items:center;background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .tools button{display:inline-flex;align-items:center;gap:4px;background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:5px 9px;cursor:pointer;font-size:11px;font-weight:600;transition:background .15s,transform .1s,box-shadow .15s,border-color .15s}\n" +
            "#rondo-panel .tools button:hover{background:var(--rondo-bg);border-color:var(--rondo-fg-mute);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .tools button:active{transform:translateY(0)}\n" +
            "#rondo-panel .tools button.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent}\n" +
            "#rondo-panel .tools button.rondo-tool-ico{padding:5px 7px;min-width:30px;justify-content:center}\n" +
            "#rondo-panel .tools button.rondo-tool-ico .rondo-usym{font-size:15px;margin:0}\n" +
            "#rondo-panel input.filtro{flex:1;min-width:90px;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-panel input.filtro:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-panel select.filtro{flex:0 0 auto;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-panel select.filtro:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .severidad-pick{display:flex;gap:3px;align-items:center;padding:6px 9px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .severidad-pick span{cursor:pointer;padding:2px 6px;border-radius:5px;font:600 11px var(--rondo-font);border:1px solid var(--rondo-border);color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .severidad-pick span.activo{border-color:var(--rondo-accent-2);color:var(--rondo-fg)}\n" +
            // v6.0.x: barra de analisis con IA en Avisos.
            "#rondo-panel .rondo-ia-bar{display:flex;gap:8px;align-items:stretch;padding:8px 9px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-ia-bar-title{display:inline-flex;align-items:center;gap:5px;font:700 11px var(--rondo-font);color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}\n" +
            "#rondo-panel .rondo-ia-bar-title .rondo-usym{color:var(--rondo-accent-2);font-size:15px}\n" +
            "#rondo-panel .rondo-ia-action{flex:1;min-width:150px;display:flex;align-items:center;gap:9px;text-align:left;background:var(--rondo-bg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:7px 10px;cursor:pointer;color:var(--rondo-fg);transition:background .15s,border-color .15s,transform .1s,box-shadow .15s}\n" +
            "#rondo-panel .rondo-ia-action:hover:not(:disabled){background:var(--rondo-bg-strong);border-color:var(--rondo-accent-2);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-ia-action:disabled{cursor:default}\n" +
            "#rondo-panel .rondo-ia-action .rondo-usym.lg{color:var(--rondo-accent-2);font-size:20px;flex-shrink:0}\n" +
            "#rondo-panel .rondo-ia-action-txt{display:flex;flex-direction:column;gap:1px;min-width:0}\n" +
            "#rondo-panel .rondo-ia-action-txt b{font:700 12px var(--rondo-font)}\n" +
            "#rondo-panel .rondo-ia-action-txt small{font-size:10px;color:var(--rondo-fg-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-ia-action.busy{opacity:.7;pointer-events:none}\n" +
            // v6.0.3: modal de Carga rapida de rutas (embarque).
            "#rondo-carga-modal{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:14px}\n" +
            "#rondo-carga-modal.abierto{display:flex}\n" +
            "#rondo-carga-modal .carga-card{width:min(680px,96vw);max-height:92vh;display:flex;flex-direction:column;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;font:400 13px var(--rondo-font)}\n" +
            "#rondo-carga-modal .carga-head{display:flex;align-items:center;gap:8px;padding:11px 13px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);font-weight:700}\n" +
            "#rondo-carga-modal .carga-body{padding:11px 13px;overflow-y:auto;display:flex;flex-direction:column;gap:9px}\n" +
            "#rondo-carga-modal .carga-rowline{display:flex;gap:10px;flex-wrap:wrap;align-items:center}\n" +
            "#rondo-carga-modal .carga-rowline label{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--rondo-fg-dim);font-weight:600}\n" +
            "#rondo-carga-modal select,#rondo-carga-modal textarea{background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:5px 8px;font-size:12px;font-family:var(--rondo-font)}\n" +
            "#rondo-carga-modal #carga-texto{width:100%;height:110px;resize:vertical;box-sizing:border-box}\n" +
            "#rondo-carga-modal .carga-drop{display:flex;align-items:center;gap:7px;justify-content:center;padding:10px;border:1.5px dashed var(--rondo-border);border-radius:8px;color:var(--rondo-fg-dim);font-size:12px;cursor:pointer;text-align:center}\n" +
            "#rondo-carga-modal .carga-drop.over{border-color:var(--rondo-accent-2);color:var(--rondo-fg);background:var(--rondo-bg-soft)}\n" +
            "#rondo-carga-modal .carga-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}\n" +
            "#rondo-carga-modal .carga-resumen{font-size:11px;color:var(--rondo-fg-dim);margin-left:auto}\n" +
            "#rondo-carga-modal .carga-btn{display:inline-flex;align-items:center;gap:5px;background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:8px;padding:7px 12px;cursor:pointer;font:600 12px var(--rondo-font)}\n" +
            "#rondo-carga-modal .carga-btn:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-carga-modal .carga-btn.primary{background:var(--rondo-accent);color:#fff;border-color:transparent}\n" +
            "#rondo-carga-modal .carga-mini{background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:6px;cursor:pointer;padding:3px 7px}\n" +
            "#rondo-carga-modal .carga-list{display:flex;flex-direction:column;gap:5px}\n" +
            "#rondo-carga-modal .carga-row{display:flex;align-items:center;gap:9px;padding:6px 8px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px}\n" +
            "#rondo-carga-modal .carga-row.off{opacity:.5}\n" +
            "#rondo-carga-modal .carga-check{display:flex;align-items:center}\n" +
            "#rondo-carga-modal .carga-cliente{flex:1;min-width:0;display:flex;align-items:center;gap:6px}\n" +
            "#rondo-carga-modal .carga-cliente b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-carga-modal .carga-conf{font-size:9.5px;text-transform:uppercase;letter-spacing:.3px;border-radius:8px;padding:1px 6px;border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-carga-modal .carga-conf-ok{color:var(--rondo-ok-fg);border-color:rgba(67,160,71,.5)}\n" +
            "#rondo-carga-modal .carga-conf-warn{color:var(--rondo-warn-fg);border-color:rgba(249,168,37,.5)}\n" +
            "#rondo-carga-modal .carga-conf-dim{color:var(--rondo-fg-dim)}\n" +
            "#rondo-carga-modal .carga-conf-no{color:var(--rondo-bad-fg);border-color:rgba(183,28,28,.5)}\n" +
            "#rondo-carga-modal select.carga-zona{flex:0 0 46%;max-width:46%}\n" +
            "#rondo-carga-modal .carga-vacio{padding:16px;text-align:center;color:var(--rondo-fg-mute);font-size:12px}\n" +
            "#rondo-carga-modal .carga-foot{display:flex;gap:8px;justify-content:flex-end;padding:11px 13px;border-top:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .tabla{overflow:auto;flex:1}\n" +
            "#rondo-panel table{width:100%;border-collapse:collapse}\n" +
            "#rondo-panel th{position:sticky;top:0;background:var(--rondo-bg-soft);text-align:left;padding:6px 9px;font-size:11px;color:var(--rondo-fg-dim);border-bottom:1px solid var(--rondo-border-soft);z-index:1;letter-spacing:.3px;text-transform:uppercase}\n" +
            "#rondo-panel td{padding:5px 9px;border-top:1px solid var(--rondo-border-soft);white-space:nowrap;font-size:12px}\n" +
            "#rondo-panel tr.fila{cursor:pointer;transition:background .1s}\n" +
            "#rondo-panel tr.fila:hover{background:var(--rondo-bg-soft)}\n" +
            "@keyframes rondoPulse{0%{background:var(--rondo-warn-bg)}to{background:transparent}}\n" +
            "#rondo-panel tr.off td.eco{color:var(--rondo-bad-fg);font-weight:bold}\n" +
            "#rondo-panel tr.det td.eco{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel tr.on td.eco{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .estadoicon{display:inline-block;width:18px;text-align:center;font-size:13px}\n" +
            "#rondo-panel .estadoicon.off{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .estadoicon.det{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .estadoicon.on{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .mini{display:inline-flex;align-items:center;justify-content:center;gap:3px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);cursor:pointer;padding:3px 8px;font-size:11px;transition:background .15s,color .15s,transform .1s,border-color .15s}\n" +
            "#rondo-panel .mini:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-panel .minusil.on{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .alerta{display:flex;gap:9px;padding:8px 10px;border-bottom:1px solid var(--rondo-border-soft);align-items:flex-start;transition:background .1s}\n" +
            "#rondo-panel .alerta:hover{background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .alerta .ico{font-size:16px;line-height:1.15;width:18px;text-align:center}\n" +
            "#rondo-panel .alerta .cuerpo{flex:1;min-width:0;display:flex;flex-direction:column}\n" +
            "#rondo-panel .alerta b{font-size:12px;letter-spacing:.2px}\n" +
            "#rondo-panel .alerta span{color:var(--rondo-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            "#rondo-panel .alerta .hora{color:var(--rondo-fg-mute);font-size:10px}\n" +
            "#rondo-panel .alerta .meta{display:flex;gap:6px;font-size:10px;color:var(--rondo-fg-mute);margin-top:3px;flex-wrap:wrap}\n" +
            "#rondo-panel .alerta .meta .regla{background:var(--rondo-bg-strong);padding:1px 5px;border-radius:4px}\n" +
            /* ── Dashboard compacto (sidebar 460 px) ────────────────────── */
            "#rondo-dash{display:flex;flex-direction:column;padding:8px 10px;gap:8px;overflow:auto;flex:1;box-sizing:border-box}\n" +
            "#rondo-dash .rondo-dash-head{display:flex;align-items:baseline;gap:6px;padding:2px 2px 6px;font:700 13px var(--rondo-font);color:var(--rondo-fg);border-bottom:1px solid var(--rondo-border-soft);margin-bottom:2px}\n" +
            "#rondo-dash .rondo-dash-head b{letter-spacing:.2px}\n" +
            "#rondo-dash .rondo-dash-vel{margin-left:auto;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute)}\n" +
            "#rondo-dash .rondo-dash-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}\n" +
            "#rondo-dash .kpi{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:6px 8px;display:flex;flex-direction:column;gap:1px;min-width:0;position:relative;overflow:hidden;transition:border-color .15s,transform .12s,box-shadow .15s;cursor:pointer}\n" +
            "#rondo-dash .kpi:hover{border-color:var(--rondo-border);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-dash .kpi:active{transform:translateY(0)}\n" +
            "#rondo-dash .kpi .kpi-etq{font:600 9.5px var(--rondo-font);color:var(--rondo-fg-mute);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dash .kpi .kpi-val{font:700 19px/1.1 var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;letter-spacing:-.3px}\n" +
            "#rondo-dash .kpi .kpi-pct{font:500 9.5px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dash .kpi .kpi-pct:empty{display:none}\n" +
            "#rondo-dash .kpi.ok{border-left:3px solid var(--rondo-ok)}\n" +
            "#rondo-dash .kpi.bad{border-left:3px solid var(--rondo-bad)}\n" +
            "#rondo-dash .kpi.warn{border-left:3px solid var(--rondo-warn)}\n" +
            "#rondo-dash .kpi.sub{border-left:3px solid var(--rondo-fg-mute)}\n" +
            /* Salud de flota */
            "#rondo-dash .rondo-salud{display:flex;flex-direction:column;gap:8px;padding:11px 12px;background:linear-gradient(135deg,var(--rondo-bg-soft),var(--rondo-bg));position:relative;overflow:hidden}\n" +
            "#rondo-dash .rondo-salud::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rondo-ok)}\n" +
            "#rondo-dash .rondo-salud.warn::before{background:var(--rondo-warn)}\n" +
            "#rondo-dash .rondo-salud-pct.warn{color:var(--rondo-warn-fg)}\n" +
            "#rondo-dash .rondo-salud-pct.bad{color:var(--rondo-bad-fg)}\n" +
            "#rondo-dash .rondo-salud-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}\n" +
            "#rondo-dash .rondo-salud.bad::before{background:var(--rondo-bad)}\n" +
            "#rondo-dash .rondo-salud-top{display:flex;align-items:center;gap:10px}\n" +
            "#rondo-dash .rondo-salud-tag{flex-shrink:0;background:var(--rondo-bg);color:var(--rondo-fg-dim);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:2px 7px;font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#rondo-dash .rondo-salud-tag.ok{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg);border-color:transparent}\n" +
            "#rondo-dash .rondo-salud-tag.warn{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg);border-color:transparent}\n" +
            "#rondo-dash .rondo-salud-tag.bad{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg);border-color:transparent}\n" +
            "#rondo-dash-block-head .rondo-dash-chip{margin-left:auto;background:var(--rondo-bg);color:var(--rondo-fg-dim);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:1px 6px;font:700 9.5px var(--rondo-font);letter-spacing:.2px}\n" +
            "#rondo-dash-block-head .rondo-dash-chip.alerta{color:var(--rondo-warn-fg)}\n" +
            "#rondo-dash-block-head .rondo-dash-chip.critico{color:var(--rondo-bad-fg)}\n" +
            "#rondo-dash-list .rondo-geo-dash, #rondo-dash-list .rondo-ruta-dash{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:var(--rondo-radius-sm);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-dash-list .rondo-geo-dash + .rondo-geo-dash, #rondo-dash-list .rondo-ruta-dash + .rondo-ruta-dash{margin-top:3px}\n" +
            "#rondo-dash-list .rondo-geo-dash .ico, #rondo-dash-list .rondo-ruta-dash .ico{font-size:14px;color:var(--rondo-accent-2);flex-shrink:0;width:14px;text-align:center}\n" +
            "#rondo-dash-list .rondo-geo-dash .body, #rondo-dash-list .rondo-ruta-dash .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:0}\n" +
            "#rondo-dash-list .rondo-geo-dash b, #rondo-dash-list .rondo-ruta-dash b{font:600 11.5px var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dash-list .rondo-geo-dash span, #rondo-dash-list .rondo-ruta-dash span{font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dash-list .rondo-geo-dash .pct, #rondo-dash-list .rondo-ruta-dash .pct{flex-shrink:0;font:700 11px var(--rondo-font);color:var(--rondo-accent-2)}\n" +
            "#rondo-dash-list .rondo-ruta-dash .ruta-bar{flex:1;min-width:0;height:4px;background:var(--rondo-bg);border-radius:2px;margin-top:3px;overflow:hidden}\n" +
            "#rondo-dash-list .rondo-ruta-dash .ruta-bar-fill{height:100%;background:var(--rondo-accent-2);transition:width .3s var(--rondo-easing)}\n" +
            "#rondo-dash .rondo-dash-empty{padding:8px;color:var(--rondo-fg-mute);font-size:11px;text-align:center}\n" +
            "#rondo-dash .kpi[data-kpi]::after{content:'';position:absolute;right:6px;top:6px;color:var(--rondo-fg-mute);font-size:11px;opacity:.5}\n" +
            "#rondo-dash .rondo-dash-block{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:7px 9px;display:flex;flex-direction:column;gap:5px}\n" +
            "#rondo-dash .rondo-dash-block-head{font:600 10px var(--rondo-font);color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:5px}\n" +
            "#rondo-dash .rondo-dash-block-head .rondo-usym{font-size:12px;color:var(--rondo-accent-2)}\n" +
            "#rondo-dash .rondo-dash-dist-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-dash .rondo-dash-dist-bar .seg{height:100%;transition:width .4s var(--rondo-easing)}\n" +
            "#rondo-dash .rondo-dash-dist-bar .seg.on{background:var(--rondo-ok)}\n" +
            "#rondo-dash .rondo-dash-dist-bar .seg.det{background:var(--rondo-warn)}\n" +
            "#rondo-dash .rondo-dash-dist-bar .seg.off{background:var(--rondo-bad)}\n" +
            "#rondo-dash .rondo-dash-dist-legend{display:flex;flex-wrap:wrap;gap:8px;font:600 9.5px var(--rondo-font);color:var(--rondo-fg-mute)}\n" +
            "#rondo-dash .rondo-dash-dist-legend span{display:inline-flex;align-items:center;gap:4px}\n" +
            "#rondo-dash .rondo-dash-dist-legend i{width:7px;height:7px;border-radius:2px;display:inline-block}\n" +
            "#rondo-dash .rondo-dash-dist-legend i.on{background:var(--rondo-ok)}\n" +
            "#rondo-dash .rondo-dash-dist-legend i.det{background:var(--rondo-warn)}\n" +
            "#rondo-dash .rondo-dash-dist-legend i.off{background:var(--rondo-bad)}\n" +
            "#rondo-dash .rondo-dash-list{display:flex;flex-direction:column;gap:3px;max-height:140px;overflow:auto}\n" +
            "#rondo-dash .rondo-dash-list .alerta{padding:4px 6px;border-left:3px solid var(--rondo-fg-mute);font-size:11px;background:transparent}\n" +
            "#rondo-dash .rondo-dash-list .alerta .cuerpo b{font-size:11px}\n" +
            "#rondo-dash .rondo-dash-list .alerta .cuerpo span{font-size:10px}\n" +
            "#rondo-dash .rondo-dash-list .rondo-atencion-item{padding:4px 6px;border-radius:0;background:transparent}\n" +
            "#rondo-dash .rondo-dash-empty{padding:8px;color:var(--rondo-fg-mute);font-size:11px;text-align:center}\n" +
            "#rondo-dash .kpi[data-kpi]{cursor:pointer}\n" +
            "#rondo-dash .kpi .kpi-ico{position:absolute;right:7px;top:6px;font-size:14px;line-height:1;opacity:.85}\n" +
            "#rondo-dash .kpi.ok .kpi-ico{color:var(--rondo-ok-fg)}\n" +
            "#rondo-dash .kpi.bad .kpi-ico{color:var(--rondo-bad-fg)}\n" +
            "#rondo-dash .kpi.warn .kpi-ico{color:var(--rondo-warn-fg)}\n" +
            "#rondo-dash .kpi.sub .kpi-ico{color:var(--rondo-accent-2)}\n" +
            "#rondo-dash .kpi .kpi-etq{padding-right:18px}\n" +
            "#rondo-dash .rondo-atencion-item:hover{background:var(--rondo-bg-strong)}\n" +
            /* Tarjeta de actualizaciones del Dashboard */
            "#rondo-panel .tabla{padding:8px 4px}\n" +
            "#rondo-panel .tabla table{width:auto;max-width:100%;min-width:100%;margin:0 auto;border-collapse:collapse}\n" +
            "#rondo-panel .rondo-caravana-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .rondo-caravana-body{padding:8px 10px;display:flex;flex-direction:column;gap:8px}\n" +
            // v5.14.6: chat con IA. Layout vertical: cabecera + log scrollable
            // + barra de input fija abajo.
            "#rondo-panel #rondo-wrap-chat{display:flex;flex-direction:column;flex:1;min-height:0;padding:0;overflow:hidden}\n" +
            "#rondo-panel .rondo-chat-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft);flex-shrink:0}\n" +
            "#rondo-panel .rondo-chat-info{flex:1;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--rondo-fg);min-width:0}\n" +
            "#rondo-panel .rondo-chat-info .rondo-usym{color:var(--rondo-accent-2);font-size:16px}\n" +
            "#rondo-panel .rondo-chat-info #rondo-chat-prov{color:var(--rondo-fg-dim);font-weight:600;font-size:11.5px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}\n" +
            "#rondo-panel .rondo-chat-actions{flex-shrink:0}\n" +
            // v5.14.7: toggle "Toda la flota" (switch compacto).
            "#rondo-panel .rondo-chat-scope{display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:10.5px;color:var(--rondo-fg-dim);user-select:none;flex-shrink:0}\n" +
            "#rondo-panel .rondo-chat-scope input{position:absolute;opacity:0;pointer-events:none}\n" +
            "#rondo-panel .rondo-chat-scope-track{position:relative;width:28px;height:15px;border-radius:8px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border);transition:background .15s,border-color .15s;flex-shrink:0}\n" +
            "#rondo-panel .rondo-chat-scope-dot{position:absolute;top:1.5px;left:1.5px;width:10px;height:10px;border-radius:50%;background:var(--rondo-fg-dim);transition:transform .15s,background .15s}\n" +
            "#rondo-panel .rondo-chat-scope input:checked + .rondo-chat-scope-track{background:rgba(var(--rondo-accent-rgb),.35);border-color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-chat-scope input:checked + .rondo-chat-scope-track .rondo-chat-scope-dot{transform:translateX(13px);background:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-chat-scope input:checked ~ .rondo-chat-scope-lbl{color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-chat-scope:hover .rondo-chat-scope-lbl{color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-chat-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--rondo-bg);scroll-behavior:smooth}\n" +
            "#rondo-panel .rondo-chat-msg{display:flex;flex-direction:column;gap:3px;max-width:88%;animation:rondo-chat-in .25s var(--rondo-easing)}\n" +
            "@keyframes rondo-chat-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}\n" +
            "#rondo-panel .rondo-chat-msg.user{align-self:flex-end;align-items:flex-end}\n" +
            "#rondo-panel .rondo-chat-msg.ia{align-self:flex-start;align-items:flex-start}\n" +
            "#rondo-panel .rondo-chat-msg.system{align-self:center;align-items:center;max-width:100%}\n" +
            "#rondo-panel .rondo-chat-bubble{padding:8px 12px;border-radius:12px;line-height:1.45;font-size:12.5px;word-wrap:break-word;white-space:pre-wrap}\n" +
            "#rondo-panel .rondo-chat-msg.user .rondo-chat-bubble{background:var(--rondo-accent);color:#fff;border-bottom-right-radius:3px}\n" +
            "#rondo-panel .rondo-chat-msg.ia .rondo-chat-bubble{background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border-soft);border-bottom-left-radius:3px}\n" +
            "#rondo-panel .rondo-chat-msg.system .rondo-chat-bubble{background:transparent;color:var(--rondo-fg-dim);font-size:11.5px;font-style:italic}\n" +
            "#rondo-panel .rondo-chat-msg.error .rondo-chat-bubble{background:rgba(229,57,53,.1);color:var(--rondo-bad-fg);border:1px solid rgba(229,57,53,.3)}\n" +
            "#rondo-panel .rondo-chat-meta{font-size:10.5px;color:var(--rondo-fg-dim);padding:0 4px;display:flex;gap:6px;align-items:center}\n" +
            "#rondo-panel .rondo-chat-msg.user .rondo-chat-meta{flex-direction:row-reverse}\n" +
            "#rondo-panel .rondo-chat-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--rondo-fg-dim);font-size:12.5px;text-align:center;padding:24px;height:100%}\n" +
            "#rondo-panel .rondo-chat-empty .rondo-usym{font-size:32px;color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-chat-typing{display:inline-flex;gap:4px;align-items:center}\n" +
            "#rondo-panel .rondo-chat-typing span{width:6px;height:6px;border-radius:50%;background:var(--rondo-fg-dim);animation:rondo-chat-typing 1.2s infinite ease-in-out}\n" +
            "#rondo-panel .rondo-chat-typing span:nth-child(2){animation-delay:.15s}\n" +
            "#rondo-panel .rondo-chat-typing span:nth-child(3){animation-delay:.3s}\n" +
            "@keyframes rondo-chat-typing{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}\n" +
            "#rondo-panel .rondo-chat-input-bar{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft);flex-shrink:0;align-items:flex-end}\n" +
            "#rondo-panel .rondo-chat-input-bar textarea{flex:1;min-height:36px;max-height:140px;resize:vertical;padding:8px 10px;border-radius:var(--rondo-radius-sm);border:1px solid var(--rondo-border);background:var(--rondo-bg);color:var(--rondo-fg);font:400 12.5px var(--rondo-font);line-height:1.4;outline:none}\n" +
            "#rondo-panel .rondo-chat-input-bar textarea:focus{border-color:var(--rondo-accent-2);box-shadow:0 0 0 1px rgba(var(--rondo-accent-rgb),.25)}\n" +
            "#rondo-panel .rondo-chat-input-bar button#rondo-chat-send{height:36px;padding:0 14px;background:var(--rondo-accent);color:#fff;border:0;border-radius:var(--rondo-radius-sm);cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;transition:filter .15s,transform .1s}\n" +
            "#rondo-panel .rondo-chat-input-bar button#rondo-chat-send:hover:not(:disabled){filter:brightness(1.1)}\n" +
            "#rondo-panel .rondo-chat-input-bar button#rondo-chat-send:disabled{opacity:.4;cursor:not-allowed}\n" +
            "#rondo-panel .rondo-chat-input-bar button#rondo-chat-send .rondo-usym{font-size:14px}\n" +
            // La visibilidad de #rondo-wrap-chat la decide setTab() (display ''
            // o 'none') y la tab la oculta paintTabsChat() si no hay IA. Se
            // retiro un selector que dependia de una clase en <html> que nunca
            // se aplicaba.
            "#rondo-panel .rondo-cv-card{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:8px 10px;display:flex;flex-direction:column;gap:4px}\n" +
            "#rondo-panel .rondo-cv-card.lider{border-color:var(--rondo-accent-2);box-shadow:0 0 0 1px rgba(var(--rondo-accent-rgb),.25)}\n" +
            "#rondo-panel .rondo-cv-card .cv-head{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}\n" +
            "#rondo-panel .rondo-cv-card .cv-eco{color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-cv-card .cv-sub{font-size:10.5px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-cv-card .cv-dist{font:600 13px/1 var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:10.5px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta .pill{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:9px;background:var(--rondo-bg-strong);color:var(--rondo-fg);font-weight:600}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta .pill.en-ruta{background:rgba(40,170,80,.18);color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta .pill.contrario{background:rgba(220,80,40,.22);color:var(--rondo-crit-fg)}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta .pill.alerta{background:rgba(var(--rondo-warn-rgb),.18);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-cv-card .cv-meta .pill.dim{opacity:.75}\n" +
            "#rondo-panel .rondo-cv-card.contrario{border-color:rgba(var(--rondo-crit-rgb),.6)}\n" +
            "#rondo-panel .rondo-cv-empty{padding:18px 8px;text-align:center;color:var(--rondo-fg-dim);font-size:12px}\n" +
            /* ── Pestaña Riesgo ───────────────────────────────────── */
            /* La pestana Zonas tiene un segmentado fijo arriba y dos paneles
             * (Geocercas / Riesgo) que scrollean por separado. */
            "#rondo-panel #rondo-wrap-zonas{display:flex;flex-direction:column;flex:1;min-height:0;padding:0;overflow:hidden}\n" +
            /* Los hijos NO deben encogerse: si no, el contenido se desborda
             * sobre la seccion siguiente (solapamiento). */
            "#rondo-panel #rondo-wrap-zonas > *{flex-shrink:0;min-width:0}\n" +
            "#rondo-panel .rondo-zpane{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:8px;display:flex;flex-direction:column;gap:9px}\n" +
            "#rondo-panel .rondo-zpane > *{flex-shrink:0;min-width:0}\n" +
            "#rondo-dash > *{flex-shrink:0;min-width:0}\n" +
            /* Segmentado Geocercas / Riesgo */
            "#rondo-panel .rondo-zonas-seg{display:flex;gap:4px;padding:7px 9px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);flex-shrink:0}\n" +
            "#rondo-panel .rondo-zseg{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);padding:6px 8px;cursor:pointer;font:600 11.5px var(--rondo-font);transition:all .15s var(--rondo-easing);min-width:0}\n" +
            "#rondo-panel .rondo-zseg:hover{color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-zseg.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(var(--rondo-accent-rgb),.3)}\n" +
            "#rondo-panel .rondo-zseg .rondo-usym{font-size:13px}\n" +
            /* Barra de geocercas + tarjetas */
            "#rondo-panel .rondo-zbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-zbar-info{flex:1;min-width:0;font-size:11.5px;color:var(--rondo-fg-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-zbar-info b{color:var(--rondo-fg);font-weight:700}\n" +
            "#rondo-panel .rondo-geo-list{border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);background:var(--rondo-bg);overflow:hidden}\n" +
            "#rondo-panel .rondo-geo-cards{display:flex;flex-direction:column;gap:5px;padding:7px}\n" +
            "#rondo-panel .rondo-geo-card{display:flex;align-items:center;gap:9px;padding:6px 9px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);transition:background .15s,border-color .15s}\n" +
            "#rondo-panel .rondo-geo-card:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;background:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-geo-card.ocupada .rondo-geo-dot{background:var(--rondo-ok);box-shadow:0 0 0 3px rgba(67,160,71,.2)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-name{font-size:11.5px;font-weight:600;color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-inside{font-size:10.5px;color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-badge{flex-shrink:0;font:700 11px/1 var(--rondo-font);padding:3px 8px;border-radius:9px;background:var(--rondo-bg);color:var(--rondo-fg-mute);border:1px solid var(--rondo-border-soft);min-width:24px;text-align:center}\n" +
            "#rondo-panel .rondo-geo-card.ocupada .rondo-geo-badge{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg);border-color:transparent}\n" +
            "#rondo-panel .rondo-geo-empty{padding:4px}\n" +
            /* Hero: header grande con titulo, KPIs y distribution bar */
            "#rondo-panel .rondo-riesgo-hero{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-left:3px solid var(--rondo-accent-2);border-radius:var(--rondo-radius-sm);padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;position:relative}\n" +
            "#rondo-panel .rondo-riesgo-hero::before{content:none}\n" +
            "#rondo-panel .rondo-riesgo-hero-head{display:flex;align-items:center;gap:9px}\n" +
            "#rondo-panel .rondo-riesgo-hero-head .rondo-usym{font-size:22px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-riesgo-hero-head .ht{font:700 13.5px var(--rondo-font);color:var(--rondo-fg);letter-spacing:.2px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-riesgo-hero-head .hs{font:600 11px var(--rondo-font);color:var(--rondo-fg-dim);display:flex;gap:4px;align-items:center}\n" +
            "#rondo-panel .rondo-riesgo-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n" +
            "#rondo-panel .rondo-riesgo-kpi{background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:6px 8px;display:flex;flex-direction:column;gap:1px;min-width:0;position:relative;overflow:hidden;transition:border-color .15s,transform .12s}\n" +
            "#rondo-panel .rondo-riesgo-kpi:hover{border-color:var(--rondo-border);transform:translateY(-1px)}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-etq{font:600 9.5px var(--rondo-font);color:var(--rondo-fg-mute);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-val{font:700 17px/1.1 var(--rondo-font);color:var(--rondo-fg);white-space:nowrap}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-res{font:500 9.5px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-riesgo-kpi.alto .kpi-val{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.alto{border-color:rgba(var(--rondo-bad-fg),.25)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.medio .kpi-val{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.medio{border-color:rgba(var(--rondo-warn-fg),.25)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.bajo .kpi-val{color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-dist{display:flex;height:7px;border-radius:4px;overflow:hidden;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .rondo-riesgo-dist-seg{height:100%;transition:width .35s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-riesgo-dist-seg.alto{background:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-dist-seg.medio{background:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-dist-seg.bajo{background:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-dist-legend{display:flex;gap:10px;font:600 10px var(--rondo-font);color:var(--rondo-fg-dim);flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-riesgo-dist-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:-1px}\n" +
            "#rondo-panel .rondo-riesgo-dist-legend i.alto{background:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-dist-legend i.medio{background:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-dist-legend i.bajo{background:var(--rondo-fg-mute)}\n" +
            /* Seccion generica (config, filtros, lista) */
            "#rondo-panel .rondo-seccion{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:9px 11px;display:flex;flex-direction:column;gap:8px}\n" +
            "#rondo-panel .rondo-seccion h4{margin:0;font-size:11px;color:var(--rondo-accent-2);text-transform:uppercase;letter-spacing:.6px;display:flex;align-items:center;gap:6px;font-weight:700}\n" +
            "#rondo-panel .rondo-seccion h4 .rondo-usym{font-size:14px;color:var(--rondo-accent-2);line-height:1}\n" +
            "#rondo-panel .rondo-seccion h4 .rondo-count{margin-left:auto;background:var(--rondo-bg-strong);color:var(--rondo-fg-dim);padding:2px 8px;border-radius:9px;font:700 10px/1 var(--rondo-font);letter-spacing:.2px}\n" +
            "#rondo-panel .rondo-seccion p{margin:0;font-size:11px;color:var(--rondo-fg-dim);line-height:1.45}\n" +
            /* Status banner dentro de la pestana */
            "#rondo-panel .rondo-riesgo-status{display:flex;gap:9px;padding:8px 10px;border-radius:var(--rondo-radius-sm);align-items:flex-start;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-left:4px solid var(--rondo-fg-mute);transition:border-color .2s}\n" +
            "#rondo-panel .rondo-riesgo-status.ok{border-left-color:var(--rondo-ok);background:var(--rondo-ok-bg)}\n" +
            "#rondo-panel .rondo-riesgo-status.err{border-left-color:var(--rondo-bad);background:var(--rondo-bad-bg)}\n" +
            "#rondo-panel .rondo-riesgo-status.load{border-left-color:var(--rondo-accent-2);background:var(--rondo-bg)}\n" +
            "#rondo-panel .rondo-riesgo-status .ico{font-size:16px;line-height:1.15;width:18px;text-align:center}\n" +
            "#rondo-panel .rondo-riesgo-status.ok .ico{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .rondo-riesgo-status.err .ico{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-riesgo-status.load .ico{color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-riesgo-status .cuerpo{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}\n" +
            "#rondo-panel .rondo-riesgo-status b{font-size:12px;letter-spacing:.2px;color:var(--rondo-fg);font-weight:600}\n" +
            "#rondo-panel .rondo-riesgo-status span{color:var(--rondo-fg-dim);font-size:11.5px}\n" +
            /* Toolbar: URL, archivo, recargar, limpiar */
            /* Parametros: grid 3 columnas */
            /* Toggle regla */
            /* Filtros: busqueda + nivel + orden + vista */
            "#rondo-panel .rondo-riesgo-filters{display:grid;grid-template-columns:1fr;gap:6px}\n" +
            "#rondo-panel .rondo-riesgo-filters-row{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap{position:relative;display:flex;align-items:center}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap > .rondo-usym{position:absolute;left:7px;color:var(--rondo-fg-mute);font-size:14px;pointer-events:none}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap > input{padding-left:24px!important}\n" +
            "#rondo-panel .rondo-riesgo-filters-row select.filtro,#rondo-panel .rondo-riesgo-filters-row .mini{width:auto;min-width:0}\n" +
            "#rondo-panel .rondo-riesgo-chips{display:flex;gap:4px;flex-wrap:wrap;align-items:center}\n" +
            /* Simbolos Unicode: usan la fuente sans-serif del panel, sin
             * dependencia de Material Icons. Heredan color/tamano del
             * contexto. */
            "#rondo-panel .rondo-usym{font-family: var(--rondo-font);font-weight:700;line-height:1;display:inline-block;flex-shrink:0}\n" +
            /* Iconos de Ant Design (SVG inline): mismos que la plataforma. */
            ".rondo-na{width:1em;height:1em;fill:currentColor;display:inline-block;vertical-align:-.125em;flex-shrink:0;overflow:visible}\n" +
            // Veredicto IA en tarjetas de Avisos.
            "#rondo-panel .rondo-ia-verdict{margin-top:6px;padding:6px 8px;background:var(--rondo-bg-soft);border-radius:var(--rondo-radius-sm);font-size:12px;line-height:1.4}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-head{margin-bottom:3px}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-summary{color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-ev{margin:4px 0 4px 18px;padding:0;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-rec{margin-top:3px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-err{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-ia-verdict .rondo-ia-loading{color:var(--rondo-fg-dim);font-style:italic}\n" +
            "#rondo-panel .rondo-ia-btn{margin-left:6px}\n" +
            ".rondo-usym .rondo-na,.rondo-usym .rondo-na{width:1em;height:1em}\n" +
            "#rondo-panel .rondo-usym.lg{font-size:18px}\n" +
            "#rondo-panel .rondo-usym.md{font-size:14px}\n" +
            "#rondo-panel .rondo-usym.sm{font-size:11px}\n" +
            /* Spinner Unicode (gira via animation CSS). */
            "#rondo-panel .rondo-usym-spin{display:inline-block;animation: rondoSpin .9s linear infinite;font-size:16px;transform-origin:center}\n" +
            "#rondo-panel .rondo-riesgo-status-sec{position:relative;overflow:hidden}\n" +
            "#rondo-panel .rondo-riesgo-status-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-riesgo-status-text{flex:1;min-width:0;display:flex;align-items:center;gap:5px;font-size:12px;color:var(--rondo-fg);overflow:hidden}\n" +
            "#rondo-panel .rondo-riesgo-status-text .rondo-usym{font-size:18px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-riesgo-status-text b{flex-shrink:0}\n" +
            "#rondo-panel .rondo-riesgo-status-sub{font-weight:400;color:var(--rondo-fg-mute);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}\n" +
            "#rondo-panel .rondo-riesgo-status-sub:empty{display:none}\n" +
            "#rondo-panel .rondo-riesgo-configurar,#rondo-panel .rondo-riesgo-recargar,#rondo-panel .rondo-riesgo-limpiar{flex-shrink:0;display:inline-flex;align-items:center;gap:3px}\n" +
            "#rondo-panel .rondo-riesgo-status-hint{margin:0;font-size:10.5px;color:var(--rondo-fg-mute);line-height:1.4}\n" +
            "#rondo-panel .rondo-riesgo-status-hint b{color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-riesgo-search{display:flex;align-items:center;gap:5px;flex:1;min-width:0}\n" +
            "#rondo-panel .rondo-riesgo-search input{padding-left:0!important;flex:1;min-width:0;width:100%}\n" +
            "#rondo-panel .rondo-riesgo-filters-row{grid-template-columns:1fr auto auto auto auto auto}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > select.filtro{padding:5px 6px;font-size:11.5px;min-width:0}\n" +
            "#rondo-panel .rondo-riesgo-filters-row .mini{padding:5px 7px;font-size:11px}\n" +
            "#rondo-panel .rondo-riesgo-filters-row .mini .rondo-usym{font-size:13px}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .rondo-usym{font-size:14px;margin-right:2px}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-actions button .rondo-usym{font-size:13px}\n" +
            +
            "#rondo-panel .rondo-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);font:600 10.5px var(--rondo-font);cursor:pointer;transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-chip:hover{color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-chip.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 2px 6px rgba(var(--rondo-accent-rgb),.3)}\n" +
            "#rondo-panel .rondo-chip.alto.activo{background:var(--rondo-bad);box-shadow:0 2px 6px rgba(229,57,53,.35)}\n" +
            "#rondo-panel .rondo-chip.medio.activo{background:var(--rondo-warn);color:#1d2433;box-shadow:0 2px 6px rgba(249,168,37,.35)}\n" +
            "#rondo-panel .rondo-chip.bajo.activo{background:var(--rondo-fg-mute);color:#1d2433;box-shadow:0 2px 6px rgba(111,120,136,.35)}\n" +
            "#rondo-panel .rondo-riesgo-summary{display:flex;align-items:center;gap:8px;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-dim);padding:4px 2px 2px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-riesgo-summary b{color:var(--rondo-fg);font-weight:600}\n" +
            "#rondo-panel .rondo-riesgo-summary .sep{opacity:.5}\n" +
            /* Lista */
            "#rondo-panel .rondo-riesgo-list{display:flex;flex-direction:column;gap:7px;max-height:none}\n" +
            /* Grupo colapsable por estado */
            "#rondo-panel .rondo-riesgo-grupo{background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);overflow:hidden;transition:border-color .15s}\n" +
            "#rondo-panel .rondo-riesgo-grupo:hover{border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;user-select:none;background:var(--rondo-bg-soft);transition:background .15s}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head:hover{background:var(--rondo-bg-strong)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-estado{font:700 12px var(--rondo-font);color:var(--rondo-fg);letter-spacing:.3px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-meta{display:flex;align-items:center;gap:5px;flex-shrink:0}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-meta .pill{font:600 10px/1 var(--rondo-font);padding:2px 7px;border-radius:9px;background:var(--rondo-bg-strong);color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-meta .pill.alto{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-meta .pill.medio{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-meta .pill.bajo{background:var(--rondo-bg);color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-toggle{font-size:14px;color:var(--rondo-fg-mute);transition:transform .2s var(--rondo-easing);display:inline-block;width:14px;text-align:center}\n" +
            "#rondo-panel .rondo-riesgo-grupo.colapsado .g-toggle{transform:rotate(-90deg)}\n" +
            "#rondo-panel .rondo-riesgo-grupo-body{display:flex;flex-direction:column;gap:5px;padding:7px;max-height:520px;overflow:auto}\n" +
            "#rondo-panel .rondo-riesgo-grupo.colapsado .rondo-riesgo-grupo-body{display:none}\n" +
            /* Card de zona */
            "#rondo-panel .rondo-riesgo-card{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:8px 10px;display:flex;flex-direction:column;gap:5px;transition:background .15s,border-color .15s,transform .12s,box-shadow .15s;position:relative}\n" +
            "#rondo-panel .rondo-riesgo-card:hover{background:var(--rondo-bg);border-color:var(--rondo-border);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-riesgo-card.alto{border-left:3px solid var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-card.medio{border-left:3px solid var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-card.bajo{border-left:3px solid var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-head{display:flex;align-items:center;gap:7px;line-height:1.2}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-head .rb-loc{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--rondo-fg);font:600 12px var(--rondo-font)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-head .rb-loc .rb-est{color:var(--rondo-accent-2);margin-right:2px}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-head .rb-mun{color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-score{font:700 12px/1 var(--rondo-font);padding:3px 8px;border-radius:8px;flex-shrink:0;min-width:30px;text-align:center}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-score.alto{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-score.medio{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-score.bajo{background:var(--rondo-bg);color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-bar{flex:1;height:5px;background:var(--rondo-bg);border-radius:3px;overflow:hidden;min-width:40px;max-width:80px}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-bar-fill{height:100%;transition:width .35s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-bar-fill.alto{background:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-bar-fill.medio{background:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-bar-fill.bajo{background:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-sub{font-size:10.5px;color:var(--rondo-fg-dim);line-height:1.4;word-wrap:break-word}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta{display:flex;flex-wrap:wrap;gap:4px;font-size:10px;color:var(--rondo-fg-dim);align-items:center}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta .pill{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:999px;background:var(--rondo-bg);color:var(--rondo-fg);font:600 10px var(--rondo-font);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta .pill.coord{font-family:monospace}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta .pill.fuente{margin-left:auto;background:transparent;color:var(--rondo-fg-mute);font-weight:500;border-color:transparent}\n" +
            /* Estado vacio de la lista */
            "#rondo-panel .rondo-riesgo-empty{padding:28px 14px;text-align:center;color:var(--rondo-fg-dim);font-size:12px;border:1px dashed var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .rondo-riesgo-empty .rondo-usym,#rondo-panel .rondo-riesgo-empty .rondo-usym{display:block;margin:0 auto 8px;font-size:34px;color:var(--rondo-fg-mute);opacity:.55}\n" +
            "#rondo-panel .rondo-riesgo-empty b{color:var(--rondo-fg);font-weight:600}\n" +
            "#rondo-panel .rondo-riesgo-empty button{margin-top:8px}\n" +
            /* Footer de la lista */
            "#rondo-panel .rondo-riesgo-foot{font-size:10.5px;color:var(--rondo-fg-mute);padding:6px 4px 0;text-align:right;border-top:1px dashed var(--rondo-border-soft);margin-top:4px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-riesgo-foot b{color:var(--rondo-fg-dim);font-weight:600}\n" +
            /* ── Hero: dona SVG + KPIs clickeables ── */
            "#rondo-panel .rondo-riesgo-dona{position:relative;width:74px;height:74px;flex-shrink:0;cursor:default;transition:transform .2s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-riesgo-dona:hover{transform:scale(1.04)}\n" +
            "#rondo-panel .rondo-riesgo-dona svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}\n" +
            "#rondo-panel .rondo-riesgo-dona circle{fill:none;stroke-width:9;transition:stroke-width .2s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-riesgo-dona circle.fondo{stroke:var(--rondo-bg);opacity:.6}\n" +
            "#rondo-panel .rondo-riesgo-dona circle.seg-alto{stroke:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-dona circle.seg-medio{stroke:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-dona circle.seg-bajo{stroke:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-dona-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}\n" +
            "#rondo-panel .rondo-riesgo-dona-center .dona-val{font:700 18px/1 var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-riesgo-dona-center .dona-etq{font:600 9px var(--rondo-font);color:var(--rondo-fg-mute);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}\n" +
            "#rondo-panel .rondo-riesgo-hero-side{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}\n" +
            "#rondo-panel .rondo-riesgo-hero-side .ht{font:700 13.5px var(--rondo-font);color:var(--rondo-fg);letter-spacing:.2px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-riesgo-hero-side .hs{font:600 11px var(--rondo-font);color:var(--rondo-fg-dim);display:flex;gap:4px;align-items:center}\n" +
            /* KPI clickeable */
            "#rondo-panel .rondo-riesgo-kpi{cursor:pointer;transition:border-color .15s,transform .12s,background .15s,box-shadow .15s}\n" +
            "#rondo-panel .rondo-riesgo-kpi:hover{border-color:var(--rondo-border);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-riesgo-kpi:active{transform:translateY(0)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.activo{box-shadow:0 0 0 1px var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.alto.activo{border-color:var(--rondo-bad);box-shadow:0 0 0 1px var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.medio.activo{border-color:var(--rondo-warn);box-shadow:0 0 0 1px var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.bajo.activo{border-color:var(--rondo-fg-mute);box-shadow:0 0 0 1px var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.alto:hover .kpi-val{color:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-kpi.medio:hover .kpi-val{color:var(--rondo-warn)}\n" +
            /* Histograma (sparkline vertical de 5 buckets) */
            "#rondo-panel .rondo-riesgo-hist{display:flex;align-items:flex-end;gap:3px;height:34px;padding:2px 0}\n" +
            "#rondo-panel .rondo-riesgo-hist-b{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .bar{width:100%;background:var(--rondo-fg-mute);border-radius:2px 2px 1px 1px;min-height:2px;transition:height .35s var(--rondo-easing),background .2s}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .bar.alto{background:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .bar.medio{background:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .bar.bajo{background:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .lbl{font:600 8.5px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap}\n" +
            "#rondo-panel .rondo-riesgo-hist-wrap{display:flex;flex-direction:column;gap:3px;padding:5px 7px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm)}\n" +
            "#rondo-panel .rondo-riesgo-hist-head{display:flex;justify-content:space-between;align-items:center;font:600 9.5px var(--rondo-font);color:var(--rondo-fg-mute);text-transform:uppercase;letter-spacing:.4px}\n" +
            "#rondo-panel .rondo-riesgo-hist-head b{color:var(--rondo-fg);font-weight:700}\n" +
            /* Drag and drop overlay para toolbar */
            "#rondo-panel .rondo-riesgo-status-sec.drag-over > .rondo-riesgo-dropmask{opacity:1;pointer-events:auto}\n" +
            "#rondo-panel .rondo-riesgo-dropmask{position:absolute;inset:0;border:2px dashed var(--rondo-accent-2);border-radius:var(--rondo-radius);background:rgba(var(--rondo-accent-rgb),.06);display:flex;align-items:center;justify-content:center;gap:6px;color:var(--rondo-accent-2);font:700 11.5px var(--rondo-font);opacity:0;pointer-events:none;transition:opacity .15s;z-index:2;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}\n" +
            /* Slider de score min. */
            /* Toggle: anade icono */
            /* Sticky filters */
            "#rondo-panel .rondo-riesgo-filters{display:grid;grid-template-columns:1fr;gap:6px}\n" +
            "#rondo-panel .rondo-riesgo-filters-row{grid-template-columns:1fr auto auto auto auto auto}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap{position:relative;display:flex;align-items:center}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap > .rondo-usym{position:absolute;left:7px;color:var(--rondo-fg-mute);font-size:14px;pointer-events:none}\n" +
            "#rondo-panel .rondo-riesgo-filters-row > .search-wrap > input{padding-left:24px!important;width:100%}\n" +
            /* Export bar */
            "#rondo-panel .rondo-riesgo-export{display:inline-flex;gap:4px;align-items:center;margin-left:auto}\n" +
            "#rondo-panel .rondo-riesgo-export .etq{font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute);margin-right:auto}\n" +
            /* Chips con feedback al cambiar */
            "#rondo-panel .rondo-riesgo-chips{transition:opacity .2s}\n" +
            "#rondo-panel .rondo-chip{transition:all .15s var(--rondo-easing);padding:3px 9px}\n" +
            "#rondo-panel .rondo-chip:hover{transform:translateY(-1px)}\n" +
            "#rondo-panel .rondo-chip:active{transform:translateY(0)}\n" +
            /* Card: posicion relativa + acciones en hover + tooltip */
            "#rondo-panel .rondo-riesgo-card{position:relative}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-actions{display:flex;gap:3px;margin-left:auto;align-items:center;opacity:0;transition:opacity .15s}\n" +
            "#rondo-panel .rondo-riesgo-card:hover .rb-actions{opacity:1}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-actions button{background:transparent;border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-mute);border-radius:6px;padding:2px 5px;cursor:pointer;font-size:11px;line-height:1;transition:all .15s}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-actions button:hover{background:var(--rondo-bg-soft);color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-actions button.ok{color:var(--rondo-ok-fg);border-color:var(--rondo-ok)}\n" +
            "#rondo-panel .rondo-riesgo-card[title]{cursor:default}\n" +
            /* Empty state con onboarding */
            "#rondo-panel .rondo-riesgo-empty{display:flex;flex-direction:column;align-items:center;gap:6px}\n" +
            "#rondo-panel .rondo-riesgo-empty .rondo-usym,#rondo-panel .rondo-riesgo-empty .rondo-usym{line-height:1}\n" +
            "#rondo-panel .rondo-riesgo-empty .pasos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;width:100%}\n" +
            "#rondo-panel .rondo-riesgo-empty .paso{display:flex;flex-direction:column;gap:3px;padding:8px 9px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);text-align:left}\n" +
            "#rondo-panel .rondo-riesgo-empty .paso .n{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--rondo-accent-grad);color:#fff;font:700 10px var(--rondo-font);margin-bottom:2px}\n" +
            "#rondo-panel .rondo-riesgo-empty .paso .t{font:600 11px var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-riesgo-empty .paso .d{font:500 10px var(--rondo-font);color:var(--rondo-fg-mute);line-height:1.35}\n" +
            /* Tab Riesgo: contador + indicador de regla activa */
            "#rondo-panel .tab[data-tab='riesgo']{position:relative}\n" +
            /* Pestanas solo icono (sin etiqueta de texto), con badge contador. */
            "#rondo-panel .tab .etqt{display:none}\n" +
            "#rondo-panel .tab{padding:9px 2px;gap:4px}\n" +
            "#rondo-panel .tab .rondo-usym{font-size:19px;font-weight:700;line-height:1;opacity:.8;transition:transform .14s var(--rondo-easing),opacity .15s}\n" +
            "#rondo-panel .tab:hover .rondo-usym{opacity:1}\n" +
            "#rondo-panel .tab.activo .rondo-usym{opacity:1;transform:scale(1.08)}\n" +
            "#rondo-panel .tab .contador{font-size:9.5px;padding:1px 5px;margin-left:0}\n" +
            +
            +
            "#rondo-panel .kpi{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:9px 11px;display:flex;flex-direction:column;gap:3px}\n" +
            "#rondo-panel .kpi .etq{font-size:10px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#rondo-panel .kpi .valor{font:600 18px/1 var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .kpi.ok .valor{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .kpi.warn .valor{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .kpi.bad .valor{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .kpi.sub .valor{color:var(--rondo-fg)}\n" +
            "#rondo-panel .kpi .resumen{font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-dash .sparkline{display:none}\n" +
            "#rondo-dash .sparkline path{fill:none;stroke-width:1.6}\n" +
            "#rondo-dash .recent{padding:9px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px}\n" +
            "#rondo-dash .recent h4{margin:0 0 6px;font-size:11px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#rondo-dash .recent .alerta{padding:5px 0;border-bottom-color:var(--rondo-border-soft)}\n" +
            /* ── Unidades: barra de orden + lista de tarjetas ── */
            "#rondo-panel #rondo-wrap-unidades{padding:0;display:flex;flex-direction:column}\n" +
            "#rondo-panel .rondo-uni-bar{display:flex;align-items:center;gap:6px;padding:7px 9px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);position:sticky;top:0;z-index:3;flex-wrap:wrap;flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-bar .etq{display:inline-flex;align-items:center;gap:4px;font:600 10.5px var(--rondo-font);color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-bar .etq .rondo-usym{font-size:13px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-uni-bar select.filtro{flex:1;min-width:120px}\n" +
            "#rondo-panel .rondo-uni-list{display:flex;flex-direction:column;gap:6px;padding:8px;flex:1;min-height:0;overflow:auto}\n" +
            "#rondo-panel .rondo-uni-empty{display:flex;align-items:center;justify-content:center;padding:10px}\n" +
            "#rondo-panel .rondo-uni-card{display:flex;gap:8px;align-items:stretch;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-left:3px solid var(--rondo-fg-mute);border-radius:var(--rondo-radius-sm);padding:7px 9px;cursor:pointer;transition:background .15s,border-color .15s,transform .12s,box-shadow .15s;animation: rondoFadeUp .3s var(--rondo-easing) both}\n" +
            "#rondo-panel .rondo-uni-card:hover{background:var(--rondo-bg);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-uni-card.on{border-left-color:var(--rondo-ok)}\n" +
            "#rondo-panel .rondo-uni-card.det{border-left-color:var(--rondo-warn)}\n" +
            "#rondo-panel .rondo-uni-card.off{border-left-color:var(--rondo-bad)}\n" +
            "#rondo-panel .rondo-uni-card.sel-row{background:var(--rondo-ok-bg);border-color:var(--rondo-ok)}\n" +
            "#rondo-panel .rondo-uni-card .u-check{display:flex;align-items:center;padding-right:2px;flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-card .u-check .rondo-sel{width:15px;height:15px;accent-color:var(--rondo-accent);cursor:pointer}\n" +
            "#rondo-panel .rondo-uni-card .u-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}\n" +
            "#rondo-panel .rondo-uni-card .u-head{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-uni-card .u-eco{font:700 13px/1 var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;display:inline-flex;align-items:center;gap:3px}\n" +
            "#rondo-panel .rondo-uni-card .u-eco .rondo-usym{font-size:12px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-uni-card .u-placa{font:600 10.5px var(--rondo-font);color:var(--rondo-fg-dim);background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:5px;padding:1px 6px;white-space:nowrap}\n" +
            "#rondo-panel .rondo-uni-card .u-placa:empty{display:none}\n" +
            "#rondo-panel .rondo-uni-card .u-vel{margin-left:auto;display:inline-flex;align-items:baseline;gap:2px;font:700 15px/1 var(--rondo-font);color:var(--rondo-fg);white-space:nowrap}\n" +
            "#rondo-panel .rondo-uni-card .u-vel small{font:600 10px var(--rondo-font);color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-uni-card .u-vel em{font:500 9px var(--rondo-font);color:var(--rondo-fg-mute);font-style:normal;margin-left:1px}\n" +
            "#rondo-panel .rondo-uni-card .u-vel.excede{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-uni-card .u-sil{flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-card .u-quick{display:inline-flex;gap:3px;flex-shrink:0;align-items:center;margin-left:4px}\n" +
            "#rondo-panel .rondo-uni-card .u-quick .mini{padding:2px 5px;font-size:11px;line-height:1}\n" +
            "#rondo-panel .rondo-uni-card .u-quick .mini .rondo-usym{font-size:12px}\n" +
            "#rondo-panel .rondo-uni-card .u-quick .u-watch.on{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg);border-color:transparent}\n" +
            "#rondo-panel .rondo-uni-card .u-meta{display:flex;flex-wrap:wrap;gap:5px;font-size:10.5px;color:var(--rondo-fg-dim);min-width:0}\n" +
            "#rondo-panel .rondo-uni-card .u-meta .u-tag{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-uni-card .u-meta .u-tag .rondo-usym{font-size:12px;color:var(--rondo-fg-mute);flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta{display:flex;align-items:center;gap:6px;min-width:0}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta .rondo-pill{flex-shrink:0}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta-bar{flex:1;height:5px;background:var(--rondo-bg);border-radius:3px;overflow:hidden;min-width:40px}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta-fill{height:100%;background:var(--rondo-accent-2);transition:width .3s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta-meta{font:600 10px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;flex-shrink:0}\n" +
            "#rondo-panel table.zone{width:100%;border-collapse:collapse;table-layout:fixed}\n" +
            "#rondo-panel table.zone th{position:sticky;top:0;background:var(--rondo-bg-soft);z-index:1}\n" +
            "#rondo-panel table.zone th:first-child,#rondo-panel table.zone td:first-child{width:42%}\n" +
            "#rondo-panel table.zone td{padding:5px 8px;white-space:normal;word-break:break-word;vertical-align:top;font-size:11.5px}\n" +
            "#rondo-panel table.zone tr.fila td:first-child{color:var(--rondo-accent-2);font-weight:600}\n" +
            "#rondo-panel .zone .contador-unidades{color:var(--rondo-ok-fg);font-weight:600}\n" +
            "#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--rondo-bg-soft);padding:14px;\n" +
            "  border-radius:10px;box-shadow:var(--rondo-shadow);z-index:1000001;display:none;flex-direction:column;gap:10px;\n" +
            "  width:340px;color:var(--rondo-fg);font:13px var(--rondo-font);border:1px solid var(--rondo-border)}\n" +
            "#rondo-modal{width:520px;max-height:88vh;overflow-y:auto;overflow-x:hidden;padding:0}\n" +
            "#rondo-modal > h3{padding:12px 14px 6px}\n" +
            "#rondo-modal > p{padding:0 14px 8px}\n" +
            "#rondo-modal > textarea{margin:0 14px 0;width:calc(100% - 28px);height:88px}\n" +
            "#rondo-modal .rondo-modal-actions{display:flex;gap:6px;padding:6px 14px 0}\n" +
            "#rondo-modal .rondo-modal-actions button{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 10px;cursor:pointer;font:11.5px var(--rondo-font)}\n" +
            "#rondo-modal .rondo-modal-actions button:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-modal .mini{display:inline-flex;align-items:center;justify-content:center;gap:3px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);cursor:pointer;padding:4px 9px;font:600 11px var(--rondo-font);transition:background .15s,color .15s,transform .1s,border-color .15s,box-shadow .15s}\n" +
            "#rondo-modal .mini:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-modal-lista-wrap{margin:8px 14px 0;border:1px solid var(--rondo-border);border-radius:7px;max-height:200px;overflow:auto}\n" +
            "#rondo-modal-lista .lista-row{display:flex;gap:6px;align-items:center;padding:5px 8px;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-modal-lista .lista-row:last-child{border-bottom:none}\n" +
            "#rondo-modal-lista .lista-row .eco{font:600 12px monospace;color:var(--rondo-accent-2);min-width:64px}\n" +
            "#rondo-modal-lista .lista-row .rondo-dest{flex:1;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-modal-lista .lista-row .rondo-dest:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-modal-lista .lista-row button{background:transparent;border:1px solid var(--rondo-border);color:var(--rondo-fg-dim);border-radius:5px;padding:2px 9px;cursor:pointer;font-size:11px}\n" +
            "#rondo-modal-lista .lista-row button:hover{color:var(--rondo-bad-fg);border-color:var(--rondo-bad-fg)}\n" +
            "#rondo-modal-lista .lista-empty{padding:14px;text-align:center;color:var(--rondo-fg-mute);font-size:12px}\n" +
            "#rondo-modal-lista .lista-row.arrastrando{opacity:.5;background:var(--rondo-bg-strong)}\n" +
            "#rondo-modal-lista .rondo-drag-handle{cursor:grab;color:var(--rondo-fg-mute);font-size:14px;letter-spacing:-2px;padding:0 4px;user-select:none;touch-action:none}\n" +
            "#rondo-modal-lista .rondo-drag-handle:active{cursor:grabbing}\n" +
            "#rondo-modal-lista .orden-num{font:600 10px monospace;color:var(--rondo-fg-mute);min-width:16px;text-align:right}\n" +
            "#rondo-modal .rondo-order-tools{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:8px 14px 0;padding:7px 9px;background:var(--rondo-bg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-modal .rondo-order-tools .etq{font-weight:600;color:var(--rondo-fg)}\n" +
            "#rondo-modal .rondo-order-tools button.activo{background:var(--rondo-accent);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-modal .rondo-modal-add{display:flex;gap:6px;padding:8px 14px 0}\n" +
            "#rondo-modal .rondo-modal-add input{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:5px 7px;font-size:12px;flex:1;min-width:60px}\n" +
            "#rondo-modal .rondo-modal-add input:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-modal > .rondo-acciones{margin-top:10px;padding:10px 14px;border-top:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-modal p code{background:var(--rondo-bg);padding:1px 4px;border-radius:3px;color:var(--rondo-accent-2)}\n" +
            "#rondo-config{width:560px;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#rondo-ayuda{width:620px;max-width:94vw;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#rondo-ayuda .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--rondo-bg);border-bottom:1px solid var(--rondo-border-soft);border-radius:10px 10px 0 0}\n" +
            "#rondo-ayuda .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#rondo-ayuda .ayuda-body{overflow:auto;padding:12px 14px;max-height:calc(88vh - 60px)}\n" +
            "#rondo-ayuda h4{margin:12px 0 6px;font-size:11px;color:var(--rondo-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--rondo-border-soft);padding-bottom:4px}\n" +
            "#rondo-ayuda h4:first-child{margin-top:0}\n" +
            "#rondo-ayuda p,#rondo-ayuda li{font-size:12.5px;color:var(--rondo-fg);margin:4px 0}\n" +
            "#rondo-ayuda ul{margin:4px 0 4px 18px;padding:0}\n" +
            "#rondo-ayuda code,#rondo-ayuda kbd{background:var(--rondo-bg);padding:1px 5px;border-radius:4px;font:11.5px monospace;color:var(--rondo-accent-2);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-ayuda .pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:6px}\n" +
            "#rondo-ayuda .paso{background:var(--rondo-bg);border:1px solid var(--rondo-border);border-radius:8px;padding:9px 11px}\n" +
            "#rondo-ayuda .paso b{display:block;color:var(--rondo-accent-2);font-size:12px;margin-bottom:3px}\n" +
            "#rondo-ayuda .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft);border-radius:0 0 10px 10px}\n" +
            "#rondo-ayuda .rondo-iconbtn{background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);cursor:pointer;border-radius:6px;padding:3px 7px;font-size:13px;line-height:1}\n" +
            "#rondo-ayuda .rondo-iconbtn:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-border);color:var(--rondo-fg)}\n" +
            "#rondo-ayuda button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-ayuda button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-ayuda button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-ayuda button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-config .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--rondo-bg);border-bottom:1px solid var(--rondo-border-soft);border-radius:10px 10px 0 0}\n" +
            "#rondo-config .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#rondo-config .cfg-tabs{display:flex;background:var(--rondo-bg);padding:0 10px;border-bottom:1px solid var(--rondo-border-soft);gap:6px;flex-wrap:wrap}\n" +
            "#rondo-config .cfg-tab{background:transparent;border:none;color:var(--rondo-fg-dim);padding:9px 12px;cursor:pointer;font:600 11.5px var(--rondo-font);border-bottom:2px solid transparent;letter-spacing:.4px;text-transform:uppercase}\n" +
            "#rondo-config .cfg-tab.activo{color:var(--rondo-fg);border-bottom-color:var(--rondo-accent-2)}\n" +
            "#rondo-config .cfg-body{overflow:auto;padding:12px;max-height:calc(88vh - 110px)}\n" +
            "#rondo-config .cfg-body h4{margin:8px 0 6px;font-size:11px;color:var(--rondo-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--rondo-border-soft);padding-bottom:4px}\n" +
            "#rondo-config .cfg-body h4:first-child{margin-top:0}\n" +
            "#rondo-config label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0}\n" +
            "#rondo-config label.full{display:block}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time],\n" +
            "#rondo-config input[type=color],#rondo-config textarea,#rondo-config select{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:4px 7px;font:12px var(--rondo-font)}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time]{width:90px}\n" +
            "#rondo-config input[type=color]{width:55px;padding:0;height:30px}\n" +
            "#rondo-config textarea{width:100%;height:90px;font:11.5px monospace;resize:vertical;box-sizing:border-box}\n" +
            "#rondo-config .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft);border-radius:0 0 10px 10px}\n" +
            "#rondo-config .row-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}\n" +
            "#rondo-config .row-grid label{padding:1px 0}\n" +
            "#rondo-config button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-config button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-config button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-config button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-modal textarea{width:100%;height:160px;resize:none;padding:10px;border-radius:6px;border:1px solid var(--rondo-border);background:var(--rondo-bg);color:var(--rondo-fg);box-sizing:border-box;font:12px monospace}\n" +
            // v5.15.2: modal de unidades/destinos unificado.
            "#rondo-modal .rondo-modal-intro{font-size:11.5px;color:var(--rondo-fg-dim);margin:-4px 0 8px;line-height:1.4}\n" +
            "#rondo-modal .rondo-modal-sintaxis{font-size:10.5px;color:var(--rondo-fg-mute);flex:1;min-width:120px;line-height:1.3}\n" +
            "#rondo-modal .rondo-modal-sintaxis code,#rondo-modal .rondo-modal-hint code{background:var(--rondo-bg-strong);padding:0 3px;border-radius:3px}\n" +
            "#rondo-modal .rondo-modal-sec{display:flex;align-items:center;gap:5px;margin:8px 14px 0;font-size:11px;font-weight:700;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.3px}\n" +
            "#rondo-modal .rondo-modal-sec .rondo-count{margin-left:auto}\n" +
            "#rondo-modal .rondo-modal-hint{font-size:11px;color:var(--rondo-fg-dim);margin:4px 14px 0;line-height:1.35}\n" +
            "#rondo-modal-lista .lista-row .rondo-dest-resumen{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:3px;align-items:center;overflow:hidden}\n" +
            "#rondo-modal-lista .rondo-dest-chip{font:600 10.5px var(--rondo-font);background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg);border-radius:8px;padding:1px 6px;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-modal-lista .rondo-dest-mas{font:700 10px var(--rondo-font);color:var(--rondo-fg-dim);background:var(--rondo-bg-strong);border-radius:8px;padding:1px 5px}\n" +
            "#rondo-modal-lista .rondo-dest-modo{font:700 9.5px var(--rondo-font);color:var(--rondo-accent-2);border:1px solid rgba(var(--rondo-accent-rgb),.5);border-radius:8px;padding:1px 5px;text-transform:uppercase;letter-spacing:.3px}\n" +
            "#rondo-modal-lista .rondo-dest-vacio{font-size:11px;color:var(--rondo-fg-mute);font-style:italic}\n" +
            "#rondo-modal-lista .lista-row{flex-wrap:wrap}\n" +
            "#rondo-modal h3{margin:0;text-align:center;font-size:13px;color:var(--rondo-fg)}\n" +
            "#rondo-modal button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-modal button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-modal button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-modal button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-contexto{padding:4px;gap:0;width:auto;min-width:170px;max-height:calc(100vh - 16px);overflow-y:auto;overscroll-behavior:contain}\n" +
            "#rondo-contexto .op{padding:7px 12px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--rondo-border-soft);display:flex;align-items:center;gap:8px}\n" +
            "#rondo-contexto .op .rondo-usym{color:var(--rondo-accent-2);font-size:1.15em}\n" +
            "#rondo-contexto .op:last-child{border-bottom:none}\n" +
            "#rondo-contexto .op:hover,#rondo-contexto .op:focus{background:var(--rondo-bg-strong)}\n" +
            "#rondo-contexto .sep{height:1px;background:var(--rondo-border-soft);margin:2px 0}\n" +
            ".rondo-acciones{display:flex;justify-content:space-between;gap:8px}\n" +
            "#rondo-aviso{position:fixed;top:5px;left:50%;transform:translateX(-50%);background:var(--rondo-bad);color:#fff;padding:6px 16px;\n" +
            "  border-radius:5px;z-index:1000002;font:12px var(--rondo-font);display:none;box-shadow:var(--rondo-shadow)}\n" +
            "body.rondo-lateral #rondo-barra{display:none}\n" +
            "#rondo-panel .rondo-sidebar-tools{display:none;gap:8px;padding:10px;background:linear-gradient(180deg,var(--rondo-bg-strong),var(--rondo-bg-soft));border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel.lateral .rondo-sidebar-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));border-top:3px solid var(--rondo-accent)}\n" +
            "#rondo-panel .rondo-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;overflow:hidden;padding:11px 6px;border-radius:var(--rondo-radius);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg);cursor:pointer;font:600 10.5px var(--rondo-font);transition:background .16s var(--rondo-easing),transform .12s,box-shadow .16s,border-color .16s}\n" +
            "#rondo-panel .rondo-tile:hover{background:var(--rondo-bg);border-color:var(--rondo-fg-mute);transform:translateY(-2px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-tile:active{transform:translateY(0)}\n" +
            "#rondo-panel .rondo-tile .rondo-usym{font-size:21px;color:var(--rondo-accent-2);line-height:1}\n" +
            "#rondo-panel .rondo-tile .tile-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}\n" +
            "#rondo-panel .rondo-tile.primary{background:var(--rondo-accent-grad);border-color:transparent;color:#fff;box-shadow:0 4px 12px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-panel .rondo-tile.primary .rondo-usym{color:#fff}\n" +
            "#rondo-panel .rondo-tile-escala{display:flex;flex-direction:column;gap:3px;justify-content:center;align-items:stretch;min-width:0}\n" +
            "#rondo-panel .rondo-tile.mini{flex:1 1 0;min-height:0;padding:1px 0;gap:0;border-radius:8px}\n" +
            "#rondo-panel .rondo-tile.mini .rondo-usym{font-size:12px}\n" +
            "#rondo-barra .rondo-badge-estado{display:inline-block;width:11px;height:11px;border-radius:50%;background:#7d8595;flex-shrink:0;border:1px solid rgba(255,255,255,.15)}\n" +
            "#rondo-barra .rondo-badge-estado.ok{background:var(--rondo-ok)}\n" +
            "#rondo-barra .rondo-badge-estado.warn{background:var(--rondo-warn)}\n" +
            "#rondo-barra .rondo-badge-estado.bad{background:var(--rondo-bad)}\n" +
            "#rondo-barra .rondo-badge-estado.nm{background:#7d8595;outline:2px dashed var(--rondo-warn)}\n" +
            "#rondo-panel.density-compact .kpi{padding:6px 9px}\n" +
            "#rondo-panel.density-compact .kpi .valor{font-size:16px}\n" +
            "#rondo-panel.density-compact td,#rondo-panel.density-compact th{padding:3px 9px;font-size:11.5px}\n" +
            "#rondo-panel .rondo-iconbtn:focus-visible,#rondo-panel .tab:focus-visible,#rondo-panel .tools button:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            "#rondo-panel table .col-sel{width:28px;text-align:center;padding:4px 6px}\n" +
            "#rondo-panel table .rondo-sel{accent-color:var(--rondo-accent);cursor:pointer;width:14px;height:14px}\n" +
            "#rondo-panel tr.sel-row td{background:var(--rondo-ok-bg)}\n" +
            "#rondo-panel tr.sel-row:hover td{background:linear-gradient(0deg,var(--rondo-ok-bg),var(--rondo-bg-soft))}\n" +
            "#rondo-panel table th:first-child{padding-left:10px}\n" +
            "#rondo-panel ::-webkit-scrollbar,#rondo-config ::-webkit-scrollbar,#rondo-modal ::-webkit-scrollbar,#rondo-ayuda ::-webkit-scrollbar{width:9px;height:9px}\n" +
            "#rondo-panel ::-webkit-scrollbar-thumb,#rondo-config ::-webkit-scrollbar-thumb,#rondo-modal ::-webkit-scrollbar-thumb,#rondo-ayuda ::-webkit-scrollbar-thumb{background:var(--rondo-border);border-radius:8px;border:2px solid transparent;background-clip:content-box}\n" +
            "#rondo-panel ::-webkit-scrollbar-thumb:hover,#rondo-config ::-webkit-scrollbar-thumb:hover,#rondo-modal ::-webkit-scrollbar-thumb:hover,#rondo-ayuda ::-webkit-scrollbar-thumb:hover{background:var(--rondo-fg-mute);background-clip:content-box}\n" +
            "#rondo-panel ::-webkit-scrollbar-track{background:transparent}\n" +
            "#rondo-panel .rondo-sidebar-tools .rondo-tile:focus-visible,#rondo-panel .mini:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            "@keyframes rondoFadeUp{from{opacity:0}to{opacity:1}}\n" +
            "#rondo-panel .kpi,#rondo-panel .recent,#rondo-panel .rondo-tile{animation: rondoFadeUp .3s var(--rondo-easing) both}\n" +
            "#rondo-panel .kpi{position:relative;overflow:hidden}\n" +
            "#rondo-panel .kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rondo-accent-grad);opacity:.7}\n" +
            "#rondo-panel .kpi.ok::before{background:var(--rondo-ok)}\n" +
            "#rondo-panel .kpi.warn::before{background:var(--rondo-warn)}\n" +
            "#rondo-panel .kpi.bad::before{background:var(--rondo-bad)}\n" +
            "#rondo-panel .kpi:hover{transform:translateY(-2px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .kpi{transition:transform .15s var(--rondo-easing),box-shadow .15s}\n" +
            "#rondo-barra{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n" +
            "#rondo-panel header{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n" +
            /* ── Estados vacios ── */
            ".rondo-vacio{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:36px 22px;text-align:center;color:var(--rondo-fg-dim);animation: rondoFadeUp .3s var(--rondo-easing) both}\n" +
            ".rondo-vacio .rondo-usym{font-size:40px;color:var(--rondo-fg-mute);opacity:.6;line-height:1}\n" +
            ".rondo-vacio b{font-size:13px;color:var(--rondo-fg);font-weight:600}\n" +
            ".rondo-vacio span{font-size:12px;max-width:380px;line-height:1.5}\n" +
            ".rondo-vacio button{margin-top:6px}\n" +
            /* ── Spinner / estado de carga ── */
            "@keyframes rondoSpin{to{transform:rotate(360deg)}}\n" +
            ".rondo-spin{display:inline-block;width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation: rondoSpin .7s linear infinite;vertical-align:-2px}\n" +
            "button.rondo-busy{opacity:.65;pointer-events:none;cursor:progress}\n" +
            "[aria-busy='true']{cursor:progress}\n" +
            /* ── Toasts: icono por severidad ── */
            ".rondo-toast.ok .ico{color:var(--rondo-ok-fg)}\n" +
            ".rondo-toast.medio .ico{color:var(--rondo-warn-fg)}\n" +
            ".rondo-toast.alto .ico,.rondo-toast.critico .ico,.rondo-toast.err .ico{color:var(--rondo-bad-fg)}\n" +
            /* ── Focus visible global ── */
            "#rondo-panel button:focus-visible,#rondo-barra button:focus-visible,#rondo-modal button:focus-visible,#rondo-config button:focus-visible,#rondo-ayuda button:focus-visible,#rondo-contexto .op:focus-visible,#rondo-panel input:focus-visible,#rondo-config input:focus-visible,#rondo-config select:focus-visible,#rondo-dialog button:focus-visible,#rondo-dialog input:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            /* ── Dialogo propio (confirm / prompt / bienvenida) ── */
            "#rondo-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);box-shadow:var(--rondo-elev);z-index:1000004;display:none;flex-direction:column;width:min(420px,92vw);max-height:90vh;font:13px var(--rondo-font);overflow:hidden}\n" +
            "#rondo-dialog.abierto{display:flex;animation: rondoPop .18s var(--rondo-easing) both}\n" +
            "@keyframes rondoPop{from{opacity:0;transform:translate(-50%,-48%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}\n" +
            "#rondo-dialog .dlg-head{padding:16px 18px 4px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;flex:0 0 auto}\n" +
            "#rondo-dialog .dlg-head .rondo-usym{color:var(--rondo-accent-2);font-size:20px}\n" +
            "#rondo-dialog .dlg-body{padding:4px 18px 16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0;flex:1 1 auto}\n" +
            "#rondo-dialog p{margin:0;font-size:12.5px;color:var(--rondo-fg-dim);line-height:1.5}\n" +
            "#rondo-dialog input{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:7px;padding:8px 10px;font:13px var(--rondo-font);width:100%;box-sizing:border-box}\n" +
            "#rondo-dialog input:focus{outline:none;border-color:var(--rondo-accent-2);box-shadow:0 0 0 3px rgba(var(--rondo-accent-rgb),.2)}\n" +
            "#rondo-dialog .dlg-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft);flex:0 0 auto}\n" +
            "#rondo-dialog .dlg-foot button{border-radius:7px;padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);border:1px solid transparent;transition:transform .12s,filter .15s,box-shadow .15s}\n" +
            "#rondo-dialog .dlg-foot .dlg-cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-dialog .dlg-foot .dlg-ok{background:var(--rondo-accent-grad);color:#fff}\n" +
            "#rondo-dialog .dlg-foot .dlg-ok.peligro{background:linear-gradient(135deg,#b71c1c,#e53935)}\n" +
            "#rondo-dialog .dlg-foot button:hover{transform:translateY(-1px);filter:brightness(1.06)}\n" +
            /* ── Bienvenida ── */
            "#rondo-dialog.rondo-bienvenida{width:min(510px,94vw)}\n" +
            "#rondo-dialog .pasos{display:grid;gap:8px}\n" +
            "#rondo-dialog .paso{display:flex;gap:10px;align-items:flex-start;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:10px 12px}\n" +
            "#rondo-dialog .paso .n{flex:0 0 24px;height:24px;border-radius:50%;background:var(--rondo-accent-grad);color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px var(--rondo-font)}\n" +
            "#rondo-dialog .paso b{display:block;font-size:12.5px;margin-bottom:2px}\n" +
            "#rondo-dialog .paso span{font-size:11.5px;color:var(--rondo-fg-dim);line-height:1.45}\n" +
            "#rondo-config .cfg-foot{align-items:center}\n" +
            ".cfg-dirty{font-size:11px;color:var(--rondo-warn-fg);display:none;align-items:center;gap:5px;font-weight:600}\n" +
            ".cfg-dirty.on{display:inline-flex}\n" +
            ".cfg-dirty::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--rondo-warn)}\n" +
            /* ── Tabla ordenable y pildoras de estado ── */
            "#rondo-panel th.rondo-sortable{cursor:pointer;user-select:none;white-space:nowrap}\n" +
            "#rondo-panel th.rondo-sortable:hover{color:var(--rondo-fg)}\n" +
            "#rondo-panel th.rondo-sortable .rondo-sort{font-size:10px;color:var(--rondo-accent-2);margin-left:3px;opacity:.45}\n" +
            "#rondo-panel th.rondo-sort-asc .rondo-sort,#rondo-panel th.rondo-sort-desc .rondo-sort{opacity:1}\n" +
            ".rondo-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font:600 10.5px var(--rondo-font);line-height:1.7;white-space:nowrap}\n" +
            ".rondo-pill.on{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg)}\n" +
            ".rondo-pill.det{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            ".rondo-pill.off{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg)}\n" +
            ".rondo-pill.ok{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg)}\n" +
            ".rondo-pill.warn{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            ".rondo-pill.mute{background:var(--rondo-bg-alt);color:var(--rondo-fg-mute)}\n" +
            /* ── Columna de Ruta en la tabla de unidades ── */
            "#rondo-body td.ruta{min-width:128px;padding:5px 7px;line-height:1.2;vertical-align:middle}\n" +
            "#rondo-body td.ruta .ronda-pill{font-size:10px}\n" +
            "#rondo-body td.ruta .ruta-bar{margin-top:3px;height:4px;background:var(--rondo-bg-alt);border-radius:3px;overflow:hidden;min-width:96px}\n" +
            "#rondo-body td.ruta .ruta-bar-fill{height:100%;background:var(--rondo-accent-2);transition:width .3s ease}\n" +
            "#rondo-body td.ruta .ruta-meta{margin-top:2px;font:500 10px monospace;color:var(--rondo-fg-dim);white-space:nowrap}\n" +
            +
            /* ── Responsive ── */
            "@media (max-width:720px){\n" +
            "  #rondo-panel{min-width:0;max-width:96vw}\n" +
            "  #rondo-config{width:min(96vw,560px)}\n" +
            "  #rondo-ayuda{width:min(96vw,620px)}\n" +
            "  #rondo-modal{width:min(96vw,520px)}\n" +
            "  #rondo-panel .kpi-grid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}\n" +
            "  #rondo-config .row-grid{grid-template-columns:1fr}\n" +
            "  #rondo-dash{padding:10px}\n" +
            "  #rondo-toasts{width:min(92vw,330px);right:8px;bottom:8px}\n" +
            "}\n" +
            "@media (max-width:480px){\n" +
            "  #rondo-barra .rondo-modo-label{display:none}\n" +
            "}\n" +
            /* ── Dashboard: distribucion y atencion ── */
            /* ── Escala de interfaz (accesibilidad visual) ──
               Se controla con --rondo-esc. Todos los tamanos se multiplican por el
               factor elegido en Ajustes > Visual. */
            "#rondo-panel{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-panel header h3{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-iconbtn{width:calc(30px * var(--rondo-esc));height:calc(30px * var(--rondo-esc));font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab{padding:calc(8px * var(--rondo-esc)) calc(4px * var(--rondo-esc));font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab{padding:calc(9px * var(--rondo-esc)) calc(2px * var(--rondo-esc));gap:calc(4px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab .rondo-usym{font-size:calc(19px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-iconbtn .rondo-usym{font-size:calc(16px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab .contador{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab .contador{font-size:calc(10px * var(--rondo-esc));padding:calc(1px * var(--rondo-esc)) calc(5px * var(--rondo-esc))}\n" +
            "#rondo-panel .tools button{padding:calc(5px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel input.filtro,#rondo-panel select.filtro{padding:calc(4px * var(--rondo-esc)) calc(7px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel th{padding:calc(6px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel td{padding:calc(5px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .mini{padding:calc(3px * var(--rondo-esc)) calc(8px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-pill{font-size:calc(10.5px * var(--rondo-esc));padding:calc(1px * var(--rondo-esc)) calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card{padding:calc(7px * var(--rondo-esc)) calc(9px * var(--rondo-esc));gap:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-eco{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-placa{font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-vel{font-size:calc(15px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-vel small{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-vel em{font-size:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-meta{font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-uni-card .u-ruta-meta{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta{padding:calc(8px * var(--rondo-esc)) calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta .ico{font-size:calc(16px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta b{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta span{font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta .hora,#rondo-panel .alerta .meta{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-seccion{padding:calc(9px * var(--rondo-esc)) calc(11px * var(--rondo-esc));gap:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-seccion h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-seccion h4 .rondo-usym{font-size:calc(14px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hero{padding:calc(11px * var(--rondo-esc)) calc(12px * var(--rondo-esc));gap:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-dona{width:calc(74px * var(--rondo-esc));height:calc(74px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-dona circle{stroke-width:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-dona-center .dona-val{font-size:calc(18px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-dona-center .dona-etq{font-size:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hero-side .ht{font-size:calc(13.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hero-side .hs{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-kpi{padding:calc(5px * var(--rondo-esc)) calc(7px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-etq{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-val{font-size:calc(17px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-kpi .kpi-res{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hist{height:calc(34px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hist-b .lbl{font-size:calc(8.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-hist-head{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-status{padding:calc(8px * var(--rondo-esc)) calc(10px * var(--rondo-esc));gap:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-status .ico{font-size:calc(16px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-status b{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-status span{font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-filters-row{gap:calc(6px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-chip{font-size:calc(10.5px * var(--rondo-esc));padding:calc(2px * var(--rondo-esc)) calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-summary{font-size:calc(10.5px * var(--rondo-esc));gap:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head{padding:calc(7px * var(--rondo-esc)) calc(10px * var(--rondo-esc));gap:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-grupo-head .g-estado{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-grupo-body{padding:calc(7px * var(--rondo-esc));gap:calc(5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card{padding:calc(8px * var(--rondo-esc)) calc(10px * var(--rondo-esc));gap:calc(5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-head .rb-loc{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-score{font-size:calc(12px * var(--rondo-esc));padding:calc(3px * var(--rondo-esc)) calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-sub{font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-card .rb-meta .pill{font-size:calc(10px * var(--rondo-esc));padding:calc(1px * var(--rondo-esc)) calc(7px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-empty{padding:calc(28px * var(--rondo-esc)) calc(14px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-empty .rondo-usym{font-size:calc(34px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-riesgo-foot{font-size:calc(10.5px * var(--rondo-esc));padding:calc(6px * var(--rondo-esc)) calc(4px * var(--rondo-esc)) 0}\n" +
            "#rondo-panel .kpi{padding:calc(9px * var(--rondo-esc)) calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .etq{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .valor{font-size:calc(18px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .resumen{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-dash{padding:calc(8px * var(--rondo-esc)) calc(10px * var(--rondo-esc));gap:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-head{font-size:calc(11.5px * var(--rondo-esc));margin-bottom:calc(2px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-kpis{gap:calc(6px * var(--rondo-esc))}\n" +
            "#rondo-dash .kpi{padding:calc(6px * var(--rondo-esc)) calc(8px * var(--rondo-esc))}\n" +
            "#rondo-dash .kpi .kpi-etq{font-size:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-dash .kpi .kpi-val{font-size:calc(17px * var(--rondo-esc))}\n" +
            "#rondo-dash .kpi .kpi-pct{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-block{padding:calc(7px * var(--rondo-esc)) calc(9px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-block-head{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-dist-bar{height:calc(8px * var(--rondo-esc))}\n" +
            "#rondo-dash .rondo-dash-list .alerta{padding:calc(4px * var(--rondo-esc)) calc(6px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +

            "#rondo-panel footer{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio{padding:calc(36px * var(--rondo-esc)) calc(22px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio .rondo-usym{font-size:calc(40px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio b{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio span{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-tile{padding:calc(11px * var(--rondo-esc)) calc(6px * var(--rondo-esc));font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-tile .rondo-usym{font-size:calc(21px * var(--rondo-esc))}\n" +
            "#rondo-barra{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-barra .rondo-btn{padding:calc(7px * var(--rondo-esc)) calc(11px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            ".rondo-toast{font:calc(12.5px * var(--rondo-esc))/1.35 var(--rondo-font);padding:calc(10px * var(--rondo-esc)) calc(12px * var(--rondo-esc))}\n" +
            ".rondo-toast .cuerpo b{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            ".rondo-toast .cuerpo span{font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-config,#rondo-modal,#rondo-ayuda,#rondo-dialog{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-config label{font-size:calc(12px * var(--rondo-esc));padding:calc(3px * var(--rondo-esc)) 0}\n" +
            "#rondo-config .cfg-tab{padding:calc(9px * var(--rondo-esc)) calc(12px * var(--rondo-esc));font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time],#rondo-config input[type=color],#rondo-config textarea,#rondo-config select{padding:calc(4px * var(--rondo-esc)) calc(7px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time]{width:calc(90px * var(--rondo-esc))}\n" +
            "#rondo-config .cfg-body h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-config button.accbtn,#rondo-config button.cancel{padding:calc(8px * var(--rondo-esc)) calc(14px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-modal h3,#rondo-modal > h3,.rondo-dialog .dlg-head{font-size:calc(14px * var(--rondo-esc))}\n" +
            "#rondo-modal p,.rondo-dialog p{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-modal .mini{padding:calc(4px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-modal button.accbtn,#rondo-modal button.cancel{padding:calc(8px * var(--rondo-esc)) calc(16px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-ayuda p,#rondo-ayuda li{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-ayuda h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-contexto .op{padding:calc(7px * var(--rondo-esc)) calc(12px * var(--rondo-esc));font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-dialog .dlg-foot button{padding:calc(8px * var(--rondo-esc)) calc(16px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            /* ── v5.15: editor de paradas multipunto ───────────────── */
            "#rondo-plan-modal{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:14px}\n" +
            "#rondo-plan-modal.abierto{display:flex}\n" +
            "#rondo-plan-modal .rpm-card{position:relative;width:min(1120px,96vw);max-height:92vh;display:flex;flex-direction:column;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;font:400 13px var(--rondo-font);min-width:0}\n" +
            "#rondo-plan-modal .rpm-head{display:flex;align-items:center;gap:8px;padding:11px 13px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);font-weight:700;cursor:move;touch-action:none;user-select:none}\n" +
            "#rondo-plan-modal .rpm-head button{cursor:pointer}\n" +
            "#rondo-plan-modal .rpm-head .rpm-eco{color:var(--rondo-accent-2)}\n" +
            "#rondo-plan-modal .rpm-head .rpm-count{margin-left:8px;font-size:10.5px;font-weight:600;color:var(--rondo-fg-dim);background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:1px 7px}\n" +
            "#rondo-plan-modal .rpm-sug-item .rondo-usym{font-size:13px;color:var(--rondo-accent-2);flex:0 0 auto}\n" +
            "#rondo-plan-modal .rpm-body{padding:11px 13px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;flex:1;min-height:0}\n" +
            "#rondo-plan-modal .rpm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n" +
            "#rondo-plan-modal label.rpm-lbl{font-size:11.5px;color:var(--rondo-fg-dim);font-weight:600}\n" +
            "#rondo-plan-modal select,#rondo-plan-modal input[type=text]{background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:5px 8px;font-size:12px}\n" +
            "#rondo-plan-modal .rpm-stops{display:flex;flex-direction:column;gap:5px}\n" +
            "#rondo-plan-modal .rpm-stop{display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px}\n" +
            "#rondo-plan-modal .rpm-stop .rpm-idx{width:22px;height:22px;flex:0 0 auto;border-radius:50%;background:var(--rondo-bg-strong);display:inline-flex;align-items:center;justify-content:center;font:700 11px var(--rondo-font)}\n" +
            "#rondo-plan-modal .rpm-stop .rpm-tipo{font-size:10px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.4px;flex:0 0 auto}\n" +
            "#rondo-plan-modal .rpm-stop .rpm-txt{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-plan-modal .rpm-stop.pinned{border-color:var(--rondo-accent-2)}\n" +
            "#rondo-plan-modal .rpm-mini{background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:6px;cursor:pointer;padding:3px 7px;font-size:11px}\n" +
            "#rondo-plan-modal .rpm-mini:hover{color:var(--rondo-fg);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-plan-modal .rpm-add{position:relative;display:flex;gap:6px}\n" +
            "#rondo-plan-modal .rpm-add input{flex:1}\n" +
            "#rondo-plan-modal .rpm-sug{position:absolute;top:100%;left:0;right:0;z-index:5;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border);border-radius:8px;margin-top:3px;max-height:210px;overflow-y:auto;box-shadow:0 12px 30px rgba(0,0,0,.4);display:none}\n" +
            "#rondo-plan-modal .rpm-sug.abierto{display:block}\n" +
            "#rondo-plan-modal .rpm-sug-item{padding:7px 10px;cursor:pointer;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-plan-modal .rpm-sug-item:last-child{border-bottom:none}\n" +
            "#rondo-plan-modal .rpm-sug-item:hover{background:var(--rondo-bg-strong)}\n" +
            "#rondo-plan-modal .rpm-sug-item .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-plan-modal .rpm-sug-item .k{font-size:10px;color:var(--rondo-fg-dim);text-transform:uppercase}\n" +
            "#rondo-plan-modal .rpm-foot{display:flex;gap:8px;justify-content:flex-end;padding:11px 26px 11px 13px;border-top:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft)}\n" +
            "#rondo-plan-modal .rpm-foot button{padding:7px 14px;border-radius:8px;border:1px solid var(--rondo-border);background:var(--rondo-bg);color:var(--rondo-fg);cursor:pointer;font-weight:600}\n" +
            "#rondo-plan-modal .rpm-foot button.primary{background:var(--rondo-accent);color:#fff;border-color:transparent}\n" +
            "#rondo-plan-modal .rpm-hint{font-size:11px;color:var(--rondo-fg-mute)}\n" +
            // v6.0.9: editor movible/redimensionable, reordenar arrastrando y
            // navegacion por teclado en las sugerencias.
            "#rondo-plan-modal .rpm-card.moviendo{box-shadow:0 30px 90px rgba(0,0,0,.65)}\n" +
            "#rondo-plan-modal .rpm-resize{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;z-index:4;touch-action:none;" +
            "background:linear-gradient(135deg,transparent 46%,var(--rondo-fg-mute) 46%,var(--rondo-fg-mute) 54%,transparent 54%,transparent 68%,var(--rondo-fg-mute) 68%,var(--rondo-fg-mute) 76%,transparent 76%);border-bottom-right-radius:12px}\n" +
            "#rondo-plan-modal .rpm-stop .rpm-grip{color:var(--rondo-fg-mute);cursor:grab;font-size:13px;line-height:1;flex:0 0 auto;touch-action:none}\n" +
            "#rondo-plan-modal .rpm-stop .rpm-grip:active{cursor:grabbing}\n" +
            "#rondo-plan-modal .rpm-stop.dragging{opacity:.45}\n" +
            "#rondo-plan-modal .rpm-stop.drop-target{border-top:2px solid var(--rondo-accent-2)}\n" +
            "#rondo-plan-modal .rpm-sug-item.sel{background:var(--rondo-bg-strong);box-shadow:inset 0 0 0 1px var(--rondo-accent-2)}\n" +
            /* ── v5.15: geocercas enriquecidas ─────────────────────── */
            "#rondo-panel .rondo-geo-kpis{display:flex;gap:6px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-geo-kpi{flex:1;min-width:70px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:1px}\n" +
            "#rondo-panel .rondo-geo-kpi b{font-size:15px;color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-geo-kpi span{font-size:10px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.3px}\n" +
            "#rondo-panel .rondo-geo-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}\n" +
            "#rondo-panel .rondo-geo-filters input{flex:1;min-width:110px}\n" +
            "#rondo-panel .rondo-geo-role{font-size:9.5px;padding:1px 6px;border-radius:8px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.3px;flex:0 0 auto}\n" +
            "#rondo-panel .rondo-geo-card.rol-base .rondo-geo-role{color:var(--rondo-ok-fg);border-color:rgba(67,160,71,.5)}\n" +
            "#rondo-panel .rondo-geo-card.rol-carga .rondo-geo-role{color:var(--rondo-accent-2);border-color:rgba(var(--rondo-accent-rgb),.5)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-acc{display:inline-flex;gap:3px;flex:0 0 auto}\n";

        const style = makeEl('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

