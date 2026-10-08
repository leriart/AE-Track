'use strict';
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
            "#rondo-lista-rutas{position:relative}\n" +
            "#rondo-lista-rutas .rr-mini-abs{position:absolute;left:0;top:0;z-index:1}\n" +
            "#rondo-lista-rutas .rr-mini-abs.rondo-mm{position:absolute}\n" +
            // v6.0.11: replay del dia.
            // v6.0.12: replay en tarjetas (consulta, mapa, reproduccion y listas).
            "#rondo-panel .rondo-replay-card{display:flex;flex-direction:column;gap:8px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:10px;padding:10px;margin-bottom:8px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-height:16px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-title{font:700 11px var(--rondo-font);text-transform:uppercase;letter-spacing:.6px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-sub{font-size:10.5px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-time{font:700 12px var(--rondo-font);font-variant-numeric:tabular-nums;color:var(--rondo-fg);background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:7px;padding:1px 7px}\n" +
            "#rondo-panel .rondo-replay-card .rondo-replay-buscar{position:relative;min-width:0}\n" +
            "#rondo-panel .rondo-replay-card .rondo-replay-buscar input{width:100%;box-sizing:border-box}\n" +
            "#rondo-panel .rondo-replay-card .rrc-range{display:grid;grid-template-columns:1fr 1fr;gap:7px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-field{display:flex;flex-direction:column;gap:3px;min-width:0}\n" +
            "#rondo-panel .rondo-replay-card .rrc-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-field input{width:100%;box-sizing:border-box;min-width:0}\n" +
            "#rondo-panel .rondo-replay-card .rrc-actions{display:grid;grid-template-columns:1.6fr 1fr;gap:6px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-actions .accbtn,#rondo-panel .rondo-replay-card .rrc-actions .mini{width:100%;text-align:center;justify-content:center}\n" +
            "#rondo-panel .rondo-replay-card .rondo-replay-mapa{margin:0}\n" +
            "#rondo-panel .rondo-replay-card .rondo-replay-ctrl{margin:0}\n" +
            "#rondo-panel .rondo-replay-card .rrc-vel{display:flex;align-items:center;gap:6px;flex:1;min-width:0}\n" +
            "#rondo-panel .rondo-replay-card .rrc-vel select{flex:1;min-width:0}\n" +
            "#rondo-panel .rondo-replay-card .rondo-replay-chart{margin:0;height:78px}\n" +
            "#rondo-panel #rondo-replay-slider{width:100%;box-sizing:border-box;margin:0}\n" +
            // v6.9.2: cuando esta reproduciendo, el boton Play se marca con un
            // halo (el color base ya es el acento, asi que el cambio de fondo
            // no bastaba para distinguir el estado).
            "#rondo-panel #rondo-replay-play.activo{box-shadow:0 0 0 2px rgba(var(--rondo-accent-rgb),.5),0 6px 16px rgba(var(--rondo-accent-rgb),.35);filter:brightness(1.08)}\n" +
            "#rondo-panel .rondo-replay-mapa{width:100%;height:240px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:10px;overflow:hidden;margin:8px 0}\n" +
            "#rondo-panel .rondo-replay-mapa svg{width:100%;height:100%;display:block}\n" +
            "#rondo-panel .rondo-replay-vacio{display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;height:100%;font-size:11.5px;color:var(--rondo-fg-mute);padding:10px;text-align:center}\n" +
            "#rondo-panel .rondo-replay-vacio .rv-ico{font-size:22px;opacity:.55}\n" +
            "#rondo-panel .rondo-replay-ctrl{display:flex;gap:6px;align-items:center;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-replay-ctrl input[type=range]{flex:1;min-width:110px}\n" +
            "#rondo-panel .rondo-replay-info{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}\n" +
            "#rondo-panel .rondo-replay-info .rr-chip{font:600 11px var(--rondo-font);font-variant-numeric:tabular-nums;color:var(--rondo-fg);background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:2px 8px}\n" +
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
            "#rondo-panel .rondo-replay-sec h5{margin:0 0 5px;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-lista{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto}\n" +
            "#rondo-panel .rondo-replay-par{display:flex;gap:8px;align-items:center;font-size:11.5px;padding:5px 7px;border-radius:7px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);cursor:pointer}\n" +
            "#rondo-panel .rondo-replay-par:hover{border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-replay-par.activo{box-shadow:inset 0 0 0 1px var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-par .par-idx{width:18px;height:18px;flex:0 0 auto;border-radius:50%;background:var(--rondo-bg-strong);display:inline-flex;align-items:center;justify-content:center;font:700 10px var(--rondo-font)}\n" +
            "#rondo-panel .rondo-replay-par .par-hora{color:var(--rondo-fg-dim);font-variant-numeric:tabular-nums;flex:0 0 auto}\n" +
            "#rondo-panel .rondo-replay-par .par-dur{flex:0 0 auto;color:var(--rondo-accent-2);font-weight:600}\n" +
            "#rondo-panel .rondo-replay-par .par-motor{flex:0 0 auto;font-size:10.5px;padding:1px 6px;border-radius:99px;background:var(--rondo-ok-soft,rgba(67,160,71,.14));color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .rondo-replay-par .par-motor.off{background:var(--rondo-bg);color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-par .par-lugar{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-replay-acciones{display:flex;gap:6px;margin-top:8px}\n" +
            "#rondo-panel .rondo-replay-buscar{position:relative;grid-column:1 / -1;min-width:0}\n" +
            "#rondo-panel .rondo-replay-buscar input{width:100%;box-sizing:border-box}\n" +
            "#rondo-panel .rondo-replay-sug{position:relative;margin-top:4px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border);border-radius:8px;max-height:200px;overflow:auto;box-shadow:0 8px 22px rgba(0,0,0,.35);display:none}\n" +
            "#rondo-panel .rondo-replay-sug.abierto{display:block}\n" +
            "#rondo-panel .rondo-replay-sug-item{padding:6px 9px;cursor:pointer;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .rondo-replay-sug-item:last-child{border-bottom:none}\n" +
            "#rondo-panel .rondo-replay-sug-item:hover,#rondo-panel .rondo-replay-sug-item.sel{background:var(--rondo-bg-strong)}\n" +
            "#rondo-panel .rondo-replay-sug-item .su-eco{font-weight:700;color:var(--rondo-fg);flex:0 0 auto}\n" +
            "#rondo-panel .rondo-replay-sug-item .su-sub{flex:1;min-width:0;color:var(--rondo-fg-dim);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-replay-quick{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}\n" +
            "#rondo-panel .rondo-replay-quick .rq-lbl{font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-replay-chart{height:70px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px;overflow:hidden;margin:8px 0;cursor:crosshair}\n" +
            "#rondo-panel .rondo-replay-chart svg{width:100%;height:100%;display:block}\n" +
            "#rondo-panel .rondo-replay-leyenda{display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;color:var(--rondo-fg-dim);margin-bottom:6px}\n" +
            "#rondo-panel .rondo-replay-leyenda .lg{display:inline-flex;align-items:center;gap:4px}\n" +
            "#rondo-panel .rondo-replay-leyenda .lg i{width:9px;height:9px;border-radius:50%;display:inline-block}\n" +
            "#rondo-panel .rondo-replay-hint{font-size:11px;color:var(--rondo-fg-mute)}\n" +
            // v6.9.1: estado bajo el boton Cargar + controles de reproduccion.
            "#rondo-panel .rondo-replay-card .rrc-estado{font-size:11px;color:var(--rondo-fg-dim);min-height:14px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-replay-card .rrc-estado.ok{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-estado.warn{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-estado.err{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-estado.cargando{color:var(--rondo-accent-2)}\n" +
            // v6.11.1: opciones del reporte del recorrido (checkboxes).
            "#rondo-panel .rondo-replay-card .rrc-checks{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-chk{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--rondo-fg);cursor:pointer;min-width:0;line-height:1.3}\n" +
            "#rondo-panel .rondo-replay-card .rrc-chk input{flex:0 0 auto;accent-color:var(--rondo-accent-2);cursor:pointer;margin:0;width:14px;height:14px}\n" +
            "#rondo-panel .rondo-replay-card .rrc-chk:hover{color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .rondo-replay-card .rrc-chk:last-child{grid-column:1 / -1}\n" +
            "#rondo-panel .rrc-play{min-width:104px;font-weight:700;justify-content:center}\n" +
            "#rondo-panel .rrc-play .rrc-play-ico{font-size:15px}\n" +
            "#rondo-panel .rrc-btn-ico{width:36px;flex:0 0 auto;padding:0;display:inline-flex;align-items:center;justify-content:center}\n" +
            "#rondo-panel .rrc-btn-ico:disabled{opacity:.45;cursor:not-allowed;filter:none;transform:none}\n" +
            "#rondo-panel .rondo-busy-lbl{margin-left:6px;font-weight:600}\n" +
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
            // v6.9.2: base de boton primario DENTRO del panel. Antes solo
            // existia `button.accbtn` para #rondo-config/#rondo-modal/#rondo-ayuda,
            // asi que los .accbtn del panel (Cargar recorrido, Play) salian con
            // el aspecto nativo del navegador. Aqui se les da la misma base.
            "#rondo-panel button.accbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);cursor:pointer;padding:6px 12px;font:600 12px var(--rondo-font);line-height:1.2;transition:transform .12s,box-shadow .15s,filter .15s,opacity .15s}\n" +
            "#rondo-panel button.accbtn .rondo-usym{font-size:14px}\n" +
            "#rondo-panel button.accbtn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-panel button.accbtn:active:not(:disabled){transform:translateY(0);filter:brightness(.96)}\n" +
            "#rondo-panel button.accbtn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.25);box-shadow:none;transform:none}\n" +
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
            // v6.0.13: dashboard ampliado (accesos rapidos, tendencia y ranking).
            "#rondo-dash .rondo-dash-nav{display:flex;gap:6px;flex-wrap:wrap}\n" +
            "#rondo-dash .rondo-dash-go{display:inline-flex;align-items:center;gap:5px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:999px;padding:3px 10px;font:600 10.5px var(--rondo-font);cursor:pointer;transition:background .15s,color .15s,border-color .15s,transform .1s}\n" +
            "#rondo-dash .rondo-dash-go:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-border);transform:translateY(-1px)}\n" +
            "#rondo-dash .rondo-dash-go:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            "#rondo-dash .rondo-dash-go .rondo-usym{font-size:12px;opacity:.85}\n" +
            "#rondo-dash .rondo-dash-trend .sparkline{margin-top:2px}\n" +
            "#rondo-dash .rondo-top-item{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:7px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);cursor:pointer;font-size:11.5px}\n" +
            "#rondo-dash .rondo-top-item:hover{border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-dash .rondo-top-item .eco{color:var(--rondo-warn-fg);flex:0 0 auto}\n" +
            "#rondo-dash .rondo-top-item .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}\n" +
            "#rondo-dash .rondo-top-item .pct{font:700 11.5px var(--rondo-font);color:var(--rondo-fg);flex:0 0 auto;font-variant-numeric:tabular-nums}\n" +
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
            "#rondo-panel .rondo-cv-empty{display:flex;flex-direction:column;gap:6px;align-items:center;padding:18px 8px;text-align:center;color:var(--rondo-fg-dim);font-size:12px}\n" +
            "#rondo-panel .rondo-cv-empty .rondo-usym{font-size:22px;opacity:.55}\n" +
            "#rondo-panel .rondo-caravana-resumen{margin-left:auto;font:600 10.5px var(--rondo-font);color:var(--rondo-fg-dim);white-space:nowrap}\n" +
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
            "#rondo-dash .sparkline{display:block;width:100%;height:46px}\n" +
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
            "#rondo-modal-lista .lista-empty{display:flex;flex-direction:column;gap:6px;align-items:center;padding:14px;text-align:center;color:var(--rondo-fg-mute);font-size:12px}\n" +
            "#rondo-modal-lista .lista-empty .rondo-usym{font-size:20px;opacity:.5}\n" +
            "#rondo-modal .rondo-modal-buscar{width:100%;box-sizing:border-box;margin:0 0 8px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:7px;color:var(--rondo-fg);padding:6px 9px;font:400 12px var(--rondo-font)}\n" +
            "#rondo-modal .rondo-modal-buscar::placeholder{color:var(--rondo-fg-dim)}\n" +
            "#rondo-modal .rondo-modal-buscar:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
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
            // v6.0.11: buscador de ajustes y estado de filtrado.
            "#rondo-config .rondo-cfg-buscar{flex:0 1 200px;min-width:110px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:7px;color:var(--rondo-fg);padding:5px 8px;font:400 11.5px var(--rondo-font)}\n" +
            "#rondo-config .rondo-cfg-buscar::placeholder{color:var(--rondo-fg-dim)}\n" +
            "#rondo-config .cfg-buscar-count{font-size:10.5px;color:var(--rondo-fg-dim);white-space:nowrap}\n" +
            "#rondo-config label.oculto,#rondo-config h4.oculto,#rondo-config .row-grid.oculto{display:none}\n" +
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
            "  #rondo-panel .rrc-range,#rondo-panel .rrc-actions{grid-template-columns:1fr}\n" +
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
            "#rondo-panel .rondo-geo-card .rondo-geo-acc{display:inline-flex;gap:3px;flex:0 0 auto}\n" +
            // ── v6.12: alerta de geocercas (pestana Zonas > Geocercas) ─────
            // Tarjeta: barra lateral y badge con gravedad + disparador.
            "#rondo-panel .rondo-geo-card .rondo-geo-ga{color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-ga.on{color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-ga.on.sev-bajo{color:var(--rondo-fg-dim);background:var(--rondo-bg-strong)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-ga.on.sev-medio{color:var(--rondo-warn-fg);background:var(--rondo-warn-bg);border-color:transparent}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-ga.on.sev-alto{color:var(--rondo-warn-fg);background:var(--rondo-warn-bg);border-color:transparent}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-ga.on.sev-critico{color:var(--rondo-bad-fg);background:var(--rondo-bad-bg);border-color:transparent}\n" +
            "#rondo-panel .rondo-geo-card.alerta-sel{border-color:var(--rondo-border)}\n" +
            "#rondo-panel .rondo-geo-card.alerta-sel.sev-bajo{box-shadow:inset 3px 0 0 var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-geo-card.alerta-sel.sev-medio{box-shadow:inset 3px 0 0 var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-geo-card.alerta-sel.sev-alto{box-shadow:inset 3px 0 0 var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-geo-card.alerta-sel.sev-critico{box-shadow:inset 3px 0 0 var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-gabadge{display:inline-flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0;max-width:82px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 8.5px var(--rondo-font);letter-spacing:.4px;padding:2px 7px;border-radius:8px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-gabadge i{width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 auto}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-gabadge.sev-bajo{color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-gabadge.sev-medio,#rondo-panel .rondo-geo-card .rondo-geo-gabadge.sev-alto{color:var(--rondo-warn-fg);border-color:rgba(249,168,37,.45);background:var(--rondo-warn-bg)}\n" +
            "#rondo-panel .rondo-geo-card .rondo-geo-gabadge.sev-critico{color:var(--rondo-bad-fg);border-color:transparent;background:var(--rondo-bad-bg)}\n" +
            "#rondo-panel .rondo-geo-kpi:last-child b{color:var(--rondo-warn-fg)}\n" +
            // Franja resumen (una sola linea, sin desbordes).
            "#rondo-panel #rondo-geo-ga-resumen:empty{display:none}\n" +
            "#rondo-panel .rondo-ga-res{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 9px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);min-width:0}\n" +
            "#rondo-panel .rondo-ga-res.on{border-color:rgba(249,168,37,.5)}\n" +
            "#rondo-panel .rondo-ga-resico{font-size:15px;color:var(--rondo-fg-mute);flex:0 0 auto}\n" +
            "#rondo-panel .rondo-ga-res.on .rondo-ga-resico{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-ga-restxt{flex:0 1 auto;min-width:0;display:flex;flex-direction:column;gap:0}\n" +
            "#rondo-panel .rondo-ga-restxt b{font:600 11.5px var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-ga-restxt span{font:500 10px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-panel .rondo-ga-pills{display:flex;gap:4px;flex-wrap:wrap;flex:1 1 190px;min-width:0;max-height:52px;overflow-y:auto}\n" +
            "#rondo-panel .rondo-ga-pill{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;padding:2px 8px;border-radius:999px;cursor:pointer;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);font:600 10px var(--rondo-font);transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-panel .rondo-ga-pill:hover{border-color:var(--rondo-border);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-ga-pill i{width:6px;height:6px;border-radius:50%;background:var(--rondo-fg-mute);flex:0 0 auto}\n" +
            "#rondo-panel .rondo-ga-pill .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .rondo-ga-pill em{font:500 9px var(--rondo-font);font-style:normal;opacity:.7;white-space:nowrap}\n" +
            "#rondo-panel .rondo-ga-pill b{font:700 9px var(--rondo-font);padding:0 5px;border-radius:7px;background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-ga-pill.sev-bajo i{background:var(--rondo-fg-mute)}\n" +
            "#rondo-panel .rondo-ga-pill.sev-medio i,#rondo-panel .rondo-ga-pill.sev-alto i{background:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .rondo-ga-pill.sev-critico i{background:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .rondo-ga-pill.avisa{border-color:var(--rondo-warn-fg);color:var(--rondo-fg)}\n" +
            "#rondo-panel .rondo-ga-resacc{display:inline-flex;gap:4px;flex:0 0 auto;margin-left:auto}\n" +
            // Menu de la alerta de una geocerca (dentro del dialogo propio).
            "#rondo-dialog .rondo-ga-d{display:flex;flex-direction:column;gap:9px;min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dhead{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:var(--rondo-radius-sm);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-left:3px solid var(--rondo-fg-mute);min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dhead.sev-bajo{border-left-color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rondo-ga-dhead.sev-medio,#rondo-dialog .rondo-ga-dhead.sev-alto{border-left-color:var(--rondo-warn-fg)}\n" +
            "#rondo-dialog .rondo-ga-dhead.sev-critico{border-left-color:var(--rondo-bad-fg)}\n" +
            "#rondo-dialog .rondo-ga-dico{font-size:16px;color:var(--rondo-fg-mute);flex:0 0 auto}\n" +
            "#rondo-dialog .rondo-ga-dhead.sev-medio .rondo-ga-dico,#rondo-dialog .rondo-ga-dhead.sev-alto .rondo-ga-dico{color:var(--rondo-warn-fg)}\n" +
            "#rondo-dialog .rondo-ga-dhead.sev-critico .rondo-ga-dico{color:var(--rondo-bad-fg)}\n" +
            "#rondo-dialog .rondo-ga-dht{flex:1;min-width:0;display:flex;flex-direction:column;gap:0}\n" +
            "#rondo-dialog .rondo-ga-dht b{font:600 12px var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dialog .rondo-ga-dht span{font:500 10px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-dialog .rondo-ga-dbody{display:flex;flex-direction:column;gap:8px;min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dbody.off{opacity:.5;pointer-events:none}\n" +
            "#rondo-dialog .rondo-ga-drow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dlb{flex:0 0 82px;font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rondo-ga-chips{display:flex;gap:4px;flex-wrap:wrap;flex:1;min-width:0}\n" +
            "#rondo-dialog .rondo-ga-chip{background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:999px;padding:3px 10px;cursor:pointer;color:var(--rondo-fg-dim);font:600 10.5px var(--rondo-font);text-align:left;transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-dialog .rondo-ga-chip:hover{color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-dialog .rondo-ga-chip.ancho{white-space:normal}\n" +
            "#rondo-dialog .rondo-ga-chip.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 1px 6px rgba(var(--rondo-accent-rgb),.28)}\n" +
            "#rondo-dialog .rondo-ga-chip.sev-bajo.activo{background:var(--rondo-bg-strong);color:var(--rondo-fg);border-color:var(--rondo-border);box-shadow:none}\n" +
            "#rondo-dialog .rondo-ga-chip.sev-critico.activo{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg);border-color:transparent;box-shadow:none}\n" +
            "#rondo-dialog .rondo-ga-dnum{display:inline-flex;align-items:center;gap:5px;font:600 9.5px var(--rondo-font);color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.3px}\n" +
            "#rondo-dialog .rondo-ga-dnum input{width:62px;padding:3px 6px;font:600 11px var(--rondo-font)}\n" +
            "#rondo-dialog .rondo-ga-dhint{flex:1;min-width:170px;margin:0;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rondo-ga-dprev{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border-radius:var(--rondo-radius-sm);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dprev > b{font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rondo-ga-dpv{display:flex;flex-direction:column;gap:2px;padding-left:9px;border-left:2px solid var(--rondo-fg-mute);min-width:0}\n" +
            "#rondo-dialog .rondo-ga-dpv.sev-medio,#rondo-dialog .rondo-ga-dpv.sev-alto{border-left-color:var(--rondo-warn-fg)}\n" +
            "#rondo-dialog .rondo-ga-dpv.sev-critico{border-left-color:var(--rondo-bad-fg)}\n" +
            "#rondo-dialog .rondo-ga-dpv .pv-t{font:600 10.5px var(--rondo-font);color:var(--rondo-fg);overflow-wrap:anywhere}\n" +
            "#rondo-dialog .rondo-ga-dpv .pv-d{font:500 10px var(--rondo-font);color:var(--rondo-fg-dim);overflow-wrap:anywhere}\n" +
            // Interruptor del menu (mismo lenguaje visual que el resto).
            "#rondo-dialog .rondo-ga-sw{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:999px;padding:3px 9px 3px 4px;cursor:pointer;color:var(--rondo-fg-dim);font:600 10px var(--rondo-font);white-space:nowrap}\n" +
            "#rondo-dialog .rondo-ga-sw .knob{width:20px;height:11px;border-radius:999px;background:var(--rondo-fg-mute);position:relative;flex:0 0 auto;transition:background .18s var(--rondo-easing)}\n" +
            "#rondo-dialog .rondo-ga-sw .knob::after{content:'';position:absolute;top:1.5px;left:1.5px;width:8px;height:8px;border-radius:50%;background:var(--rondo-bg);transition:transform .18s var(--rondo-easing)}\n" +
            "#rondo-dialog .rondo-ga-sw.on{color:var(--rondo-warn-fg);border-color:rgba(249,168,37,.5)}\n" +
            "#rondo-dialog .rondo-ga-sw.on .knob{background:var(--rondo-warn-fg)}\n" +
            "#rondo-dialog .rondo-ga-sw.on .knob::after{transform:translateX(9px)}\n" +
            // Tarjetas estrechas: la alerta no come el ancho de la lista.
            "@media (max-width:420px){#rondo-panel .rondo-geo-card .rondo-geo-gabadge{display:none}#rondo-panel .rondo-ga-resacc{margin-left:0}}\n" +
            // Escala de interfaz (Ajustes > Visual): el menu respeta el tamaño.
            "#rondo-dialog .rondo-ga-dhead b,#rondo-dialog .rondo-ga-dht b{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-dialog .rondo-ga-dht span{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-dialog .rondo-ga-dlb,#rondo-dialog .rondo-ga-dnum,#rondo-dialog .rondo-ga-dprev > b{font-size:calc(9.5px * var(--rondo-esc))}\n" +
            "#rondo-dialog .rondo-ga-chip,#rondo-dialog .rondo-ga-dhint,#rondo-dialog .rondo-ga-dpv .pv-t{font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-dialog .rondo-ga-dpv .pv-d,#rondo-dialog .rondo-ga-sw{font-size:calc(10px * var(--rondo-esc))}\n" +
            // ── v6.13: geocercas de la app (mapa de dibujo + paneles) ─────
            // Mismo lenguaje que el editor de paradas (.rpm-*): tarjeta con
            // cabecera, cuerpo y pie; botones planos, chips redondeados y
            // acento en la accion principal.
            "#rondo-geocerca-modal{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:14px}\n" +
            "#rondo-geocerca-modal.abierto{display:flex}\n" +
            "#rondo-geocerca-modal .gg-card{position:relative;width:min(1240px,97vw);height:min(92vh,780px);display:flex;flex-direction:column;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;font:400 13px var(--rondo-font);min-width:0}\n" +
            // Cabecera
            "#rondo-geocerca-modal .gg-head{display:flex;align-items:center;gap:9px;padding:11px 13px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft);font-weight:700;flex:0 0 auto;flex-wrap:wrap;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-head .rondo-usym{color:var(--rondo-accent-2);font-size:18px;flex:0 0 auto}\n" +
            "#rondo-geocerca-modal .gg-head b{font-size:14px;letter-spacing:.2px}\n" +
            "#rondo-geocerca-modal .gg-headsub{font:500 11px var(--rondo-font);color:var(--rondo-fg-mute);font-weight:500;padding-left:9px;border-left:1px solid var(--rondo-border);white-space:nowrap}\n" +
            "#rondo-geocerca-modal .gg-x{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);cursor:pointer;color:var(--rondo-fg-dim);transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-geocerca-modal .gg-x:hover{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg);border-color:transparent}\n" +
            // Cuerpo: mapa a la izquierda, paneles a la derecha.
            "#rondo-geocerca-modal .gg-cuerpo{flex:1;min-height:0;display:flex;gap:11px;padding:11px 13px;min-width:0}\n" +
            "#rondo-geocerca-modal .rondo-gg-mapa{position:relative;flex:1;min-width:0;overflow:hidden;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);box-shadow:inset 0 0 0 1px rgba(0,0,0,.18);touch-action:none}\n" +
            "#rondo-geocerca-modal .rondo-gg-mapa .rondo-mm{cursor:crosshair;border:0;border-radius:0}\n" +
            // Las dos capas SVG van por encima de los tiles del mini-mapa.
            "#rondo-geocerca-modal .rondo-gg-ctx,#rondo-geocerca-modal .rondo-gg-capa{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}\n" +
            "#rondo-geocerca-modal .rondo-gg-ctx{z-index:2}\n" +
            "#rondo-geocerca-modal .rondo-gg-capa{z-index:3}\n" +
            "#rondo-geocerca-modal .rondo-gg-atrib{position:absolute;right:5px;bottom:4px;font-size:9px;color:#222;background:rgba(255,255,255,.75);padding:1px 4px;border-radius:4px;pointer-events:none;z-index:4}\n" +
            // Chapa flotante sobre el mapa: modo actual + como se dibuja.
            "#rondo-geocerca-modal .gg-hud{position:absolute;left:9px;top:9px;z-index:4;display:flex;flex-direction:column;gap:5px;align-items:flex-start;max-width:min(72%,320px);pointer-events:none}\n" +
            "#rondo-geocerca-modal .gg-hud-m{display:inline-flex;align-items:center;gap:6px;background:rgba(20,24,34,.82);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:3px 10px;font:600 10.5px var(--rondo-font);backdrop-filter:blur(2px)}\n" +
            "#rondo-geocerca-modal .gg-hud-m .rondo-usym{font-size:13px}\n" +
            "#rondo-geocerca-modal .gg-hud-h{background:rgba(20,24,34,.72);color:#e6e9f0;border-radius:8px;padding:3px 8px;font:500 10px var(--rondo-font);line-height:1.35}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-hud-m,body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-hud-h{background:rgba(255,255,255,.9);color:#1d2433;border-color:rgba(0,0,0,.1)}\n" +
            "#rondo-geocerca-modal .rondo-gg-plat{z-index:1}\n" +
            // Leyenda del mapa: que color es cada origen y cuantas hay.
            "#rondo-geocerca-modal .gg-leyenda{position:absolute;left:9px;bottom:9px;z-index:4;display:flex;align-items:center;gap:4px;flex-wrap:wrap;max-width:calc(100% - 18px);pointer-events:none}\n" +
            "#rondo-geocerca-modal .gg-ley-b{display:inline-flex;align-items:center;gap:5px;pointer-events:auto;cursor:pointer;background:rgba(20,24,34,.8);color:#e6e9f0;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:2px 8px;font:600 9.5px var(--rondo-font);backdrop-filter:blur(2px);transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-geocerca-modal .gg-ley-b:hover{border-color:rgba(255,255,255,.3);color:#fff}\n" +
            "#rondo-geocerca-modal .gg-ley-b.activo{background:var(--rondo-warn-fg);color:#2a1d00;border-color:transparent}\n" +
            "#rondo-geocerca-modal .gg-ley-b b{font-weight:800}\n" +
            "#rondo-geocerca-modal .gg-ley-b i{width:9px;height:9px;border-radius:3px;flex:0 0 auto;border:1.5px dashed rgba(255,255,255,.5);background:rgba(255,255,255,.12)}\n" +
            "#rondo-geocerca-modal .gg-ley-b.activo i{border-color:rgba(0,0,0,.45);background:rgba(0,0,0,.12)}\n" +
            "#rondo-geocerca-modal .gg-ley-b i.sw-app{border-color:#7d8595;background:rgba(125,133,149,.28)}\n" +
            "#rondo-geocerca-modal .gg-ley-b i.sw-plat{border-color:#5c7a99;background:rgba(92,122,153,.28)}\n" +
            "#rondo-geocerca-modal .gg-ley-draft{pointer-events:none;display:inline-flex;align-items:center;gap:5px;background:rgba(20,24,34,.8);color:#ffe082;border:1px solid rgba(249,168,37,.5);border-radius:999px;padding:2px 8px;font:600 9.5px var(--rondo-font);text-transform:none;letter-spacing:0}\n" +
            "#rondo-geocerca-modal .gg-ley-draft::before{content:'';width:9px;height:9px;border-radius:3px;background:rgba(249,168,37,.35);border:1.5px solid #f9a817}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-ley-b{background:rgba(255,255,255,.9);color:#1d2433;border-color:rgba(0,0,0,.12)}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-ley-b.activo{background:var(--rondo-warn-fg);color:#3a2b00}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-ley-b i{border-color:rgba(0,0,0,.3);background:rgba(0,0,0,.08)}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-ley-draft{background:rgba(255,255,255,.9);color:#8d6b00}\n" +
            // Paneles laterales
            "#rondo-geocerca-modal .gg-lados{flex:0 0 296px;min-width:0;display:flex;flex-direction:column;gap:10px;overflow-y:auto;padding-right:2px}\n" +
            "#rondo-geocerca-modal .gg-lado{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-lado h4{margin:0;font:700 10px var(--rondo-font);text-transform:uppercase;letter-spacing:.5px;color:var(--rondo-fg-mute);display:flex;align-items:center;gap:6px;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-lado h4 .rondo-usym{font-size:13px;color:var(--rondo-accent-2)}\n" +
            "#rondo-geocerca-modal .gg-lado h4 .gg-count{margin-left:auto;font:700 9.5px var(--rondo-font);background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:1px 7px;color:var(--rondo-fg-dim);font-style:normal}\n" +
            "#rondo-geocerca-modal .gg-lado h4 .gg-modo-tag{margin-left:auto;font:700 8.5px var(--rondo-font);font-style:normal;letter-spacing:.4px;background:var(--rondo-accent-grad);color:#fff;border-radius:7px;padding:1px 7px}\n" +
            "#rondo-geocerca-modal .gg-sec{font:700 9px var(--rondo-font);text-transform:uppercase;letter-spacing:.5px;color:var(--rondo-fg-mute);padding-top:2px;border-top:1px solid var(--rondo-border-soft)}\n" +
            // Campos
            "#rondo-geocerca-modal .gg-lab{display:flex;flex-direction:column;gap:3px;font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.3px;color:var(--rondo-fg-mute);min-width:0}\n" +
            "#rondo-geocerca-modal .gg-lab input{width:100%;min-width:0;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:5px 8px;font:500 12px var(--rondo-font);text-transform:none;letter-spacing:0;transition:border-color .15s,box-shadow .15s}\n" +
            "#rondo-geocerca-modal .gg-lab input:focus{outline:none;border-color:var(--rondo-accent-2);box-shadow:0 0 0 2px rgba(var(--rondo-accent-rgb),.28)}\n" +
            "#rondo-geocerca-modal .gg-two{display:flex;gap:5px;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-two input{flex:1;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-ir{flex:0 0 auto;align-self:stretch}\n" +
            "#rondo-geocerca-modal .gg-unit{position:relative;display:block}\n" +
            "#rondo-geocerca-modal .gg-unit input{padding-right:26px}\n" +
            "#rondo-geocerca-modal .gg-unit i{position:absolute;right:8px;top:50%;transform:translateY(-50%);font:700 9.5px var(--rondo-font);font-style:normal;letter-spacing:.3px;color:var(--rondo-fg-mute);pointer-events:none}\n" +
            // Chips de modo
            "#rondo-geocerca-modal .gg-modos{display:flex;gap:4px}\n" +
            "#rondo-geocerca-modal .gg-chip{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:999px;padding:5px 7px;cursor:pointer;color:var(--rondo-fg-dim);font:600 11px var(--rondo-font);transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-geocerca-modal .gg-chip .rondo-usym{font-size:13px}\n" +
            "#rondo-geocerca-modal .gg-chip:hover{color:var(--rondo-fg);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-geocerca-modal .gg-chip.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(var(--rondo-accent-rgb),.32)}\n" +
            // Tira de cifras
            "#rondo-geocerca-modal .gg-stats{display:flex;gap:5px}\n" +
            "#rondo-geocerca-modal .gg-stat{flex:1;min-width:0;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:5px 6px;display:flex;flex-direction:column;gap:1px}\n" +
            "#rondo-geocerca-modal .gg-stat.ok{border-color:rgba(67,160,71,.42);background:var(--rondo-ok-bg)}\n" +
            "#rondo-geocerca-modal .gg-stat b{font:700 11.5px var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-geocerca-modal .gg-stat.ok b{color:var(--rondo-ok-fg)}\n" +
            "#rondo-geocerca-modal .gg-stat span{font:700 8.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.3px;color:var(--rondo-fg-mute)}\n" +
            // Botones: el modal vive fuera de #rondo-panel, asi que los .mini
            // de la app no le alcanzan: se redefinen aqui con su mismo estilo.
            "#rondo-geocerca-modal .mini{display:inline-flex;align-items:center;justify-content:center;gap:4px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);cursor:pointer;padding:4px 9px;font:600 11px var(--rondo-font);white-space:nowrap;transition:background .15s,color .15s,transform .1s,border-color .15s}\n" +
            "#rondo-geocerca-modal .mini:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-geocerca-modal .mini:active{transform:translateY(0)}\n" +
            "#rondo-geocerca-modal .gg-acciones{display:flex;gap:5px;flex-wrap:wrap}\n" +
            "#rondo-geocerca-modal .gg-acciones .mini{flex:1;min-width:88px}\n" +
            "#rondo-geocerca-modal .gg-pista{margin:0;display:flex;gap:6px;align-items:flex-start;font:500 10px var(--rondo-font);color:var(--rondo-fg-mute);line-height:1.4;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:5px 7px}\n" +
            "#rondo-geocerca-modal .gg-pista .rondo-usym{font-size:12px;flex:0 0 auto;margin-top:1px}\n" +
            // Dialogo de importacion (seleccion de geocercas)
            "#rondo-dialog .gg-imp-t{margin:0;font-size:12px;color:var(--rondo-fg-dim);line-height:1.5}\n" +
            "#rondo-dialog .gg-imp-t b{color:var(--rondo-fg)}\n" +
            "#rondo-dialog .gg-imp-av{color:var(--rondo-warn-fg);font-size:11px}\n" +
            "#rondo-dialog .gg-imp-l{display:flex;flex-direction:column;gap:4px;max-height:min(44vh,320px);overflow-y:auto}\n" +
            "#rondo-dialog .gg-imp{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);cursor:pointer;transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-dialog .gg-imp:hover{border-color:var(--rondo-border);background:var(--rondo-bg-strong)}\n" +
            "#rondo-dialog .gg-imp.sel{border-color:var(--rondo-accent-2);background:var(--rondo-bg-strong)}\n" +
            "#rondo-dialog .gg-imp input{margin:0;flex:0 0 auto}\n" +
            "#rondo-dialog .gg-imp .nm{flex:1;min-width:0;display:flex;align-items:center;gap:5px;font:600 12px var(--rondo-font);color:var(--rondo-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-dialog .gg-imp .nm .rondo-usym{font-size:12px;color:var(--rondo-warn-fg);flex:0 0 auto}\n" +
            "#rondo-dialog .gg-imp em{flex:0 0 auto;font:500 10px var(--rondo-font);font-style:normal;color:var(--rondo-fg-mute);white-space:nowrap}\n" +
            "#rondo-dialog .gg-imp-a{display:flex;align-items:center;gap:6px}\n" +
            "#rondo-dialog .gg-imp-a .mini{padding:3px 9px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);border-radius:7px;cursor:pointer;color:var(--rondo-fg-dim);font:600 10.5px var(--rondo-font)}\n" +
            "#rondo-dialog .gg-imp-a .mini:hover{color:var(--rondo-fg);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .gg-imp-a span{margin-left:auto;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute)}\n" +
            // Selector de origen de la lista
            "#rondo-geocerca-modal .gg-filtro{display:flex;gap:4px}\n" +
            "#rondo-geocerca-modal .gg-fchip{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:999px;padding:3px 6px;cursor:pointer;color:var(--rondo-fg-dim);font:600 9.5px var(--rondo-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-geocerca-modal .gg-fchip b{font-weight:800;opacity:.75}\n" +
            "#rondo-geocerca-modal .gg-fchip:hover{color:var(--rondo-fg);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-geocerca-modal .gg-fchip.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent}\n" +
            "#rondo-geocerca-modal .gg-fchip.activo b{opacity:.9}\n" +
            // Etiqueta de origen en cada fila
            "#rondo-geocerca-modal .gg-origen{display:inline-block;vertical-align:1px;margin-left:6px;font:700 7.5px var(--rondo-font);font-style:normal;letter-spacing:.5px;padding:1px 4px;border-radius:5px;background:var(--rondo-bg-strong);color:var(--rondo-fg-mute);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-geocerca-modal .gg-origen.o-app{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg);border-color:transparent}\n" +
            "#rondo-geocerca-modal .gg-origen.o-plat{background:rgba(92,122,153,.22);color:#a8c6e0;border-color:transparent}\n" +
            "body[data-rondo-theme='claro'] #rondo-geocerca-modal .gg-origen.o-plat{background:#e4edf5;color:#33607f}\n" +
            "#rondo-geocerca-modal .gg-lock{display:inline-flex;vertical-align:-2px;margin-left:4px;color:var(--rondo-ok-fg)}\n" +
            "#rondo-geocerca-modal .gg-lock .rondo-usym{font-size:10px}\n" +
            // Lista de geocercas
            "#rondo-geocerca-modal .gg-lista{display:flex;flex-direction:column;gap:4px;max-height:236px;overflow-y:auto}\n" +
            "#rondo-geocerca-modal .gg-item{display:flex;align-items:center;gap:7px;padding:6px 7px;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:8px;min-width:0;transition:border-color .15s,background .15s}\n" +
            "#rondo-geocerca-modal .gg-item:hover{border-color:var(--rondo-border);background:var(--rondo-bg-strong)}\n" +
            "#rondo-geocerca-modal .gg-ptag{flex:0 0 auto;width:22px;height:22px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);color:var(--rondo-accent-2)}\n" +
            "#rondo-geocerca-modal .gg-ptag .rondo-usym{font-size:13px}\n" +
            "#rondo-geocerca-modal .gg-in{flex:1;min-width:0;display:flex;flex-direction:column}\n" +
            "#rondo-geocerca-modal .gg-in b{font:600 11.5px var(--rondo-font);color:var(--rondo-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-geocerca-modal .gg-in span{font:500 9.5px var(--rondo-font);color:var(--rondo-fg-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n" +
            "#rondo-geocerca-modal .gg-tag-alerta{flex:0 0 auto;font:700 8px var(--rondo-font);font-style:normal;letter-spacing:.4px;color:var(--rondo-warn-fg);background:var(--rondo-warn-bg);border-radius:7px;padding:2px 5px}\n" +
            "#rondo-geocerca-modal .gg-acc{display:inline-flex;gap:3px;flex:0 0 auto}\n" +
            "#rondo-geocerca-modal .gg-acc .mini{padding:3px 5px}\n" +
            "#rondo-geocerca-modal .gg-acc .mini .rondo-usym{font-size:12px}\n" +
            "#rondo-geocerca-modal .gg-acc .gg-al.on{color:var(--rondo-warn-fg);background:var(--rondo-warn-bg);border-color:transparent}\n" +
            "#rondo-geocerca-modal .gg-acc .gg-del:hover{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg);border-color:transparent}\n" +
            "#rondo-geocerca-modal .gg-vacio{display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 8px;text-align:center;border:1px dashed var(--rondo-border-soft);border-radius:8px}\n" +
            "#rondo-geocerca-modal .gg-vacio .rondo-usym{font-size:20px;color:var(--rondo-fg-mute);opacity:.7}\n" +
            "#rondo-geocerca-modal .gg-vacio b{font:600 11.5px var(--rondo-font);color:var(--rondo-fg-dim)}\n" +
            "#rondo-geocerca-modal .gg-vacio span{font:500 10px var(--rondo-font);color:var(--rondo-fg-mute);line-height:1.4}\n" +
            // Importar / exportar
            "#rondo-geocerca-modal .gg-io{display:grid;grid-template-columns:1fr 1fr;gap:5px}\n" +
            "#rondo-geocerca-modal .gg-io .mini{width:100%}\n" +
            "#rondo-geocerca-modal .gg-check{display:flex;align-items:flex-start;gap:7px;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-dim);cursor:pointer;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:6px 8px;transition:border-color .15s}\n" +
            "#rondo-geocerca-modal .gg-check:hover{border-color:var(--rondo-border)}\n" +
            "#rondo-geocerca-modal .gg-check input{margin:1px 0 0}\n" +
            "#rondo-geocerca-modal .gg-check span{display:flex;flex-direction:column;min-width:0}\n" +
            "#rondo-geocerca-modal .gg-check b{font:600 11px var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-geocerca-modal .gg-check i{font:500 9.5px var(--rondo-font);font-style:normal;color:var(--rondo-fg-mute)}\n" +
            // Pie
            "#rondo-geocerca-modal .gg-foot{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:10px 13px;border-top:1px solid var(--rondo-border-soft);background:var(--rondo-bg-soft);flex:0 0 auto}\n" +
            "#rondo-geocerca-modal .gg-foot .gg-pie{flex:1;min-width:200px;font:500 10.5px var(--rondo-font);color:var(--rondo-fg-mute);line-height:1.4}\n" +
            "#rondo-geocerca-modal .gg-foot button{display:inline-flex;align-items:center;gap:5px;padding:7px 15px;border-radius:8px;border:1px solid var(--rondo-border);background:var(--rondo-bg);color:var(--rondo-fg);cursor:pointer;font:600 12px var(--rondo-font);transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-geocerca-modal .gg-foot button:hover{border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-geocerca-modal .gg-foot button.primary{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(var(--rondo-accent-rgb),.32)}\n" +
            "#rondo-geocerca-modal .gg-foot button.primary:hover{box-shadow:0 4px 16px rgba(var(--rondo-accent-rgb),.44)}\n" +
            // Barra de scroll discreta, como en el resto del panel.
            "#rondo-geocerca-modal .gg-lados::-webkit-scrollbar,#rondo-geocerca-modal .gg-lista::-webkit-scrollbar{width:8px}\n" +
            "#rondo-geocerca-modal .gg-lados::-webkit-scrollbar-thumb,#rondo-geocerca-modal .gg-lista::-webkit-scrollbar-thumb{background:var(--rondo-border);border-radius:4px}\n" +
            "#rondo-geocerca-modal .gg-lados::-webkit-scrollbar-track,#rondo-geocerca-modal .gg-lista::-webkit-scrollbar-track{background:transparent}\n" +
            // Pantallas estrechas: mapa arriba, paneles debajo.
            "@media (max-width:900px){#rondo-geocerca-modal{padding:8px}#rondo-geocerca-modal .gg-cuerpo{flex-direction:column;gap:9px}#rondo-geocerca-modal .rondo-gg-mapa{flex:0 0 40vh}#rondo-geocerca-modal .gg-lados{flex:1;flex-basis:auto}\n" +
            "@media (max-width:900px){#rondo-geocerca-modal .gg-lados{display:grid;grid-template-columns:1fr 1fr;align-items:start}}\n" +
            "@media (max-width:620px){#rondo-geocerca-modal .gg-lados{grid-template-columns:1fr}#rondo-geocerca-modal .gg-headsub{display:none}#rondo-geocerca-modal .gg-foot .gg-pie{display:none}}\n" +
            // ── v6.15: informe por geocerca (dialogo de la barra) ──────
            "#rondo-dialog .rgi{display:flex;flex-direction:column;gap:9px;min-width:0}\n" +
            "#rondo-dialog .rgi-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n" +
            "#rondo-dialog .rgi-lb{flex:0 0 76px;font:700 9.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.4px;color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rgi-chips{display:flex;gap:4px;flex-wrap:wrap;flex:1;min-width:0}\n" +
            "#rondo-dialog .rgi select{flex:1;min-width:180px;max-width:100%}\n" +
            "#rondo-dialog .rgi-chip{background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:999px;padding:4px 11px;cursor:pointer;color:var(--rondo-fg-dim);font:600 10.5px var(--rondo-font);white-space:nowrap;transition:all .15s var(--rondo-easing)}\n" +
            "#rondo-dialog .rgi-chip:hover{color:var(--rondo-fg);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rgi-chip.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(var(--rondo-accent-rgb),.28)}\n" +
            "#rondo-dialog .rgi-res{margin:0;font:500 11px var(--rondo-font);color:var(--rondo-fg-dim);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-left:3px solid var(--rondo-accent-2);border-radius:8px;padding:6px 9px;line-height:1.45}\n" +
            "#rondo-dialog .rgi-kpis{display:flex;gap:5px;flex-wrap:wrap}\n" +
            "#rondo-dialog .rgi-kpi{flex:1;min-width:64px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:5px 6px;display:flex;flex-direction:column;gap:1px;text-align:center}\n" +
            "#rondo-dialog .rgi-kpi b{font-size:15px;color:var(--rondo-fg);line-height:1.1}\n" +
            "#rondo-dialog .rgi-kpi span{font:700 8.5px var(--rondo-font);text-transform:uppercase;letter-spacing:.3px;color:var(--rondo-fg-mute)}\n" +
            "#rondo-dialog .rgi-prev{max-height:230px;overflow:auto;border:1px solid var(--rondo-border-soft);border-radius:8px;padding:6px}\n" +
            "#rondo-dialog .rgi-prev table{font-size:10.5px}\n" +
            "#rondo-dialog .rgi-prev th{position:sticky;top:0;background:var(--rondo-bg-soft);z-index:1}\n" +
            "#rondo-dialog .rgi-io{display:flex;gap:5px;flex-wrap:wrap}\n" +
            "#rondo-dialog .rgi-io .mini{flex:1;min-width:96px;justify-content:center}\n" +
            // Tarjeta de geocerca de la app: distintivo violeta/acento.
            "#rondo-panel .rondo-geo-card .rondo-geo-app{display:inline-block;margin-left:6px;vertical-align:1px;font:700 8px var(--rondo-font);letter-spacing:.6px;padding:1px 5px;border-radius:7px;background:var(--rondo-accent-grad);color:#fff}\n" +
            "#rondo-panel .rondo-geo-card.de-la-app{box-shadow:inset 0 0 0 1px var(--rondo-accent-2)}\n";

        const style = makeEl('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ====================== UI BUILD ====================== */
    let mainBtn, panelBtn, helpBtn, closeBtn, updateBtn, foldBtn, gripEl, barraEl,
        panelEl, modalEl, cfgWinEl, ayudaEl, ctxEl, toastsEl, avisoEl, railEl;

    function checkRow(id, txt) {
        return '<label>' + txt + ' <input type="checkbox" id="' + id + '"></label>';
    }
    function numRow(id, txt) {
        return '<label>' + txt + ' <input type="number" id="' + id + '"></label>';
    }
    function buildUI() {
        mainBtn = makeEl('button', { innerHTML: '<span class="rondo-usym">' + UIS.gear + '</span> Automatizar Unidades', id: 'rondo-btn-main', className: 'rondo-btn', title: 'Abrir lista de unidades y automatizar ventanas' });
        panelBtn = makeEl('button', { innerHTML: '<span class="rondo-usym">' + UIS.panel + '</span> Panel', id: 'rondo-btn-panel', className: 'rondo-btn', title: 'Mostrar u ocultar el panel (Alt+P)' });
        closeBtn = makeEl('button', { innerHTML: '<span class="rondo-usym">' + UIS.close + '</span> Cerrar Todas', id: 'rondo-btn-close', className: 'rondo-btn', title: 'Cerrar todas las ventanas de unidades' });
        helpBtn = makeEl('button', { innerHTML: '<span class="rondo-usym">' + UIS.help + '</span>', id: 'rondo-btn-help', className: 'rondo-btn', title: 'Ayuda rápida (?)' });
        updateBtn = makeEl('button', { innerHTML: '<span class="rondo-usym">' + UIS.refresh + '</span> Actualizar', id: 'rondo-btn-update', className: 'rondo-btn rondo-update', title: 'Nueva version disponible', style: 'display:none' });
        foldBtn = makeEl('button', { innerText: '▾', id: 'rondo-btn-fold', className: 'rondo-btn rondo-fold', title: 'Plegar barra' });
        gripEl = makeEl('span', { innerText: '⠿', id: 'rondo-grip', className: 'rondo-grip', title: 'Arrastrar barra · doble clic para orientar' });
        barraEl = makeEl('div', { id: 'rondo-barra' });
        barraEl.append(gripEl, updateBtn, mainBtn, panelBtn, helpBtn, closeBtn, foldBtn);
        if (APP.barra.vertical) barraEl.classList.add('vertical');

        panelEl = makeEl('div', { id: 'rondo-panel' });
        panelEl.innerHTML = (
            '<div class="rondo-sidebar-tools" id="rondo-sidebar-tools">' +
            '<button class="rondo-tile primary" id="rondo-sb-main" title="Abrir lista de unidades y automatizar ventanas"><span class="rondo-usym">' + UIS.gear + '</span><span class="tile-lbl">Automatizar</span></button>' +
            '<button class="rondo-tile" id="rondo-sb-panel" title="Ocultar o mostrar las ventanas de unidades abiertas (sin cerrarlas)"><span class="rondo-usym">' + UIS.collapse + '</span><span class="tile-lbl">Ocultar</span></button>' +
            '<div class="rondo-tile-escala" role="group" aria-label="Tamano de las ventanas de unidades">' +
            '<button class="rondo-tile mini" id="rondo-sb-mas" title="Aumentar el tamano de las ventanas abiertas" aria-label="Aumentar el tamano de las ventanas"><span class="rondo-usym">' + UIS.mas + '</span></button>' +
            '<button class="rondo-tile mini" id="rondo-sb-menos" title="Disminuir el tamano de las ventanas abiertas" aria-label="Disminuir el tamano de las ventanas"><span class="rondo-usym">' + UIS.menos + '</span></button>' +
            '</div>' +
            '<button class="rondo-tile" id="rondo-sb-close" title="Cerrar todas las ventanas de unidades"><span class="rondo-usym">' + UIS.close + '</span><span class="tile-lbl">Cerrar</span></button>' +
            '</div>' +
'<header id="rondo-drag">' +
             '<span id="rondo-estado-barra" class="rondo-badge-estado"></span>' +
             '<h3>' + esc(LANG.titlePanel) +
             // v5.14.2: chip de version en linea con el titulo. Color por
             // estado del check (verde=al dia, rojo=update, ambar=unknown,
             // azul=checking, gris=ahead). Click = fuerza check;
             // doble click = abre Ajustes > Avanzado.
             ' <button type="button" id="rondo-version-chip" data-estado="idle" title="Version instalada">' +
             '<span class="rondo-version-label">v' + esc(VER) + '</span></button>' +
             '</h3>' +
             '<button class="rondo-iconbtn" id="rondo-actualizar" title="Buscar actualizaciones" style="display:none;color:var(--rondo-accent-2)"><span class="rondo-usym md">' + UIS.refresh + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-tema" title="Tema"><span class="rondo-usym md">' + UIS.theme + '</span></button>' +
            // Indicador/toggle de IA en la cabecera, junto al tema. Muestra
            // si hay una API disponible (punto) y si la IA esta activa
            // (check). Oculto si no hay API key configurada.
            '<button class="rondo-iconbtn rondo-ia-head" id="rondo-ia" title="IA" style="display:none" aria-pressed="false">' +
            '<span class="rondo-usym md">' + UIS.robot + '</span>' +
            '<span class="rondo-ia-badge" aria-hidden="true"></span></button>' +
            '<button class="rondo-iconbtn" id="rondo-nmolestar" title="No molestar"><span class="rondo-usym md">' + UIS.mute + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-refresh" title="Refrescar datos"><span class="rondo-usym md">' + UIS.refresh + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-cfg-btn" title="Ajustes"><span class="rondo-usym md">' + UIS.gear + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-collapse" title="Colapsar/expandir barra lateral"><span class="rondo-usym md">' + UIS.collapse + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-ayuda-btn" title="Ayuda rápida"><span class="rondo-usym md">' + UIS.help + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-cerrar-panel" title="Cerrar panel"><span class="rondo-usym md">' + UIS.close + '</span></button>' +
            '</header>' +
            '<div class="tabs" id="rondo-tabs">' +
            '<button class="tab activo" data-tab="dash" title="Resumen general de la flota"><span class="rondo-usym md">' + UIS.dashboard + '</span><span class="etqt">Dashboard</span><span class="contador" id="rondo-c-on">0</span></button>' +
            '<button class="tab" data-tab="unidades" title="Lista de unidades y acciones"><span class="rondo-usym md">' + UIS.panel + '</span><span class="etqt">Unidades</span><span class="contador" id="rondo-c-tot">0</span></button>' +
            '<button class="tab" data-tab="alertas" title="Historial de avisos"><span class="rondo-usym md">' + UIS.alertas + '</span><span class="etqt">Avisos</span><span class="contador" id="rondo-c-al">0</span></button>' +
            '<button class="tab" data-tab="rutas" title="Rutas planificadas y seguimiento"><span class="rondo-usym md">' + UIS.route + '</span><span class="etqt">Rutas</span><span class="contador" id="rondo-c-ru">0</span></button>' +
            '<button class="tab" data-tab="zonas" title="Geocercas de la plataforma y zonas de riesgo"><span class="rondo-usym md">' + UIS.map + '</span><span class="contador" id="rondo-c-zn">0</span></button>' +
            '<button class="tab" data-tab="caravana" title="Modo caravana: vehiculos cerca de la unidad vigilada"><span class="rondo-usym md">' + UIS.caravana + '</span><span class="etqt">Caravana</span><span class="contador" id="rondo-c-cv">0</span></button>' +
            // v6.0.11: tab de replay (reproducir el recorrido de un dia).
            '<button class="tab" data-tab="replay" title="Reproducir el recorrido de una unidad en un dia"><span class="rondo-usym md">' + UIS.moving + '</span><span class="etqt">Replay</span></button>' +
            // v5.14.6: tab de chat con IA. Visible solo si la IA esta
            // habilitada y tiene API key (se oculta desde paintTabs() si no).
            '<button class="tab tab-ia" data-tab="chat" title="Chat con la IA (consultas libres)" style="display:none"><span class="rondo-usym md">' + UIS.robot + '</span><span class="etqt">Chat IA</span></button>' +
            
            '</div>' +
            '<div class="tools" id="rondo-tools">' +
            '<input class="filtro rondo-tool" id="rondo-filtro" data-tabs="unidades,alertas,geocercas" placeholder="' + esc(LANG.busq) + '">' +
            '<select class="filtro rondo-tool" id="rondo-filtro-estado" data-tabs="unidades" title="Filtrar por estado">' +
            '<option value="todas">Todas</option>' +
            '<option value="moviendo">Moviendo</option>' +
            '<option value="detenida">Det.</option>' +
            '<option value="offline">Off</option>' +
            '<option value="vigilada">Vigiladas</option>' +
            '<option value="silenciada">Silenciadas</option>' +
            '</select>' +
            '<select class="filtro rondo-tool" id="rondo-orden-sel" data-tabs="unidades" title="Orden de las ventanas de unidades">' +
            '<option value="">Orden de ventanas…</option>' +
            '<option value="pegado">Pegado</option>' +
            '<option value="numero">Número (menor a mayor)</option>' +
            '<option value="numero-desc">Número (mayor a menor)</option>' +
            '<option value="alfabetico">Alfabético A-Z</option>' +
            '<option value="invertir">Invertir orden</option>' +
            '</select>' +
            '<button id="rondo-unidades-menu" class="rondo-tool" data-tabs="unidades" title="Agregar unidades, destinos y rutas multipunto"><span class="rondo-usym">' + UIS.route + '</span> Unidades y rutas</button>' +
            '<button id="rondo-carga-btn" class="rondo-tool" data-tabs="unidades" title="Carga rapida: pega la lista de clientes del embarque y asigna la ruta a una unidad"><span class="rondo-usym">' + UIS.watch + '</span> Carga rapida</button>' +
            '<button id="rondo-csv" class="rondo-tool" data-tabs="unidades" title="Exportar unidades a CSV"><span class="rondo-usym">' + UIS.csv + '</span> CSV</button>' +
            '<button id="rondo-informe" class="rondo-tool" data-tabs="dash,unidades,alertas" title="Generar reporte PDF (se abre el dialogo de impresion; elige Guardar como PDF)"><span class="rondo-usym">' + UIS.export + '</span> Reporte PDF</button>' +
            // v6.15: informe por geocerca (cruces y paradas dentro). Elige la
            // geocerca, el periodo y los datos; sale en PDF, CSV o Markdown.
            '<button id="rondo-informe-geo" class="rondo-tool rondo-tool-ico" data-tabs="dash,unidades,alertas,zonas" title="Informe por geocerca: cruces y unidades paradas dentro de una geocerca"><span class="rondo-usym">' + UIS.zone + '</span></button>' +
            '<button id="rondo-informe-md" class="rondo-tool rondo-tool-ico" data-tabs="dash,unidades,alertas" title="Generar informe Markdown (texto)"><span class="rondo-usym">' + UIS.csv + '</span></button>' +
            '<button id="rondo-csv-al" class="rondo-tool rondo-tool-ico" data-tabs="alertas" title="Exportar el historial de avisos a CSV"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
            '<button id="rondo-verif" class="rondo-tool rondo-tool-ico" data-tabs="unidades" title="Abrir solo las ventanas seleccionadas"><span class="rondo-usym">' + UIS.check + '</span></button>' +
            '<button id="rondo-captura" class="rondo-tool rondo-tool-ico" data-tabs="unidades" title="Capturar las ventanas abiertas"><span class="rondo-usym">' + UIS.expand + '</span></button>' +
            '<button id="rondo-verifica" class="rondo-tool rondo-tool-ico" data-tabs="unidades" title="Verificar y acomodar ahora"><span class="rondo-usym">' + UIS.check + '</span></button>' +
            '<button id="rondo-sel-all" class="rondo-tool rondo-tool-ico" data-tabs="unidades" title="Seleccionar todas las unidades visibles"><span class="rondo-usym">' + UIS.check + '</span></button>' +
            '<button id="rondo-sel-clear" class="rondo-tool rondo-tool-ico" data-tabs="unidades" title="Quitar toda la selección"><span class="rondo-usym">' + UIS.clear + '</span></button>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-dash">' +
            '<div id="rondo-dash">' +
            '<div class="rondo-dash-head">' +
            '<b>Resumen general de la flota</b>' +
            '<span class="rondo-dash-vel" id="rondo-dash-vel"></span>' +
            '</div>' +
            // v6.0.13: accesos rapidos a las secciones relacionadas.
            '<div class="rondo-dash-nav">' +
            '<button class="rondo-dash-go" data-go="unidades" title="Ir a la lista de unidades"><span class="rondo-usym">' + UIS.panel + '</span> Unidades</button>' +
            '<button class="rondo-dash-go" data-go="alertas" title="Ir al historial de avisos"><span class="rondo-usym">' + UIS.alertas + '</span> Avisos</button>' +
            '<button class="rondo-dash-go" data-go="rutas" title="Ir a las rutas planificadas"><span class="rondo-usym">' + UIS.route + '</span> Rutas</button>' +
            '<button class="rondo-dash-go" data-go="zonas" title="Ir a geocercas y zonas de riesgo"><span class="rondo-usym">' + UIS.map + '</span> Zonas</button>' +
            '</div>' +
            '<div class="rondo-dash-block rondo-salud" id="rondo-salud">' +
            '<div class="rondo-salud-top">' +
            '<span class="rondo-salud-pct" id="rondo-salud-pct">\u2014</span>' +
            '<div class="rondo-salud-txt">' +
            '<b>Salud de la flota</b>' +
            '<span id="rondo-salud-sub">Recolectando datos\u2026</span>' +
            '</div>' +
            '<span class="rondo-salud-tag" id="rondo-salud-tag">\u2014</span>' +
            '</div>' +
            '<div class="rondo-dash-dist-bar">' +
            '<span class="seg on" id="rondo-dist-on"></span>' +
            '<span class="seg det" id="rondo-dist-det"></span>' +
            '<span class="seg off" id="rondo-dist-off"></span>' +
            '</div>' +
            '<div class="rondo-dash-dist-legend" id="rondo-dist-legend"></div>' +
            '</div>' +
            // v6.0.13: tendencia de la flota (en linea / sin senal) en el tiempo.
            '<div class="rondo-dash-block rondo-dash-trend">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.online + '</span> Tendencia (en linea / sin senal)</div>' +
            '<svg class="sparkline" id="rondo-spark" viewBox="0 0 200 32" preserveAspectRatio="none" role="img" aria-label="Tendencia de unidades en linea y sin senal"></svg>' +
            '</div>' +
            '<div class="rondo-dash-kpis">' +
            '<div class="kpi ok" data-kpi="online" title="Unidades que reportaron dentro del umbral de sin senal · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.online + '</span><span class="kpi-etq">En linea</span><span class="kpi-val" id="rondo-kpi-on">0</span><span class="kpi-pct" id="rondo-kpi-on-pct"></span></div>' +
            '<div class="kpi bad" data-kpi="offline" title="Unidades cuyo ultimo reporte supero el umbral · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.offline + '</span><span class="kpi-etq">Sin senal</span><span class="kpi-val" id="rondo-kpi-off">0</span><span class="kpi-pct" id="rondo-kpi-off-pct"></span></div>' +
            '<div class="kpi warn" data-kpi="detenida" title="Unidades en linea con velocidad muy baja · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.stopped + '</span><span class="kpi-etq">Detenidas</span><span class="kpi-val" id="rondo-kpi-det">0</span></div>' +
            '<div class="kpi sub" data-kpi="moviendo" title="Unidades en linea con velocidad normal · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.moving + '</span><span class="kpi-etq">En mov.</span><span class="kpi-val" id="rondo-kpi-mov">0</span></div>' +
            '<div class="kpi sub" data-kpi="zonas" title="Geocercas ocupadas · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.map + '</span><span class="kpi-etq">En zonas</span><span class="kpi-val" id="rondo-kpi-zonas">0</span><span class="kpi-pct" id="rondo-kpi-zonas-pct"></span></div>' +
            '<div class="kpi" data-kpi="alertas" title="Avisos desde la medianoche · clic para verlos"><span class="kpi-ico rondo-usym">' + UIS.alertas + '</span><span class="kpi-etq">Avisos hoy</span><span class="kpi-val" id="rondo-kpi-aho">0</span><span class="kpi-pct" id="rondo-kpi-criticos"></span></div>' +
            '<div class="kpi sub" data-kpi="ruta" title="Unidades con ruta activa en curso · clic para ver las rutas"><span class="kpi-ico rondo-usym">' + UIS.route + '</span><span class="kpi-etq">En ruta</span><span class="kpi-val" id="rondo-kpi-ruta">0</span><span class="kpi-pct" id="rondo-kpi-ruta-pct"></span></div>' +
            '<div class="kpi warn" data-kpi="exceso" title="Unidades en linea por encima de su limite de velocidad · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.speed + '</span><span class="kpi-etq">Exceso</span><span class="kpi-val" id="rondo-kpi-exc">0</span><span class="kpi-pct" id="rondo-kpi-exc-pct"></span></div>' +
            '<div class="kpi sub" data-kpi="silenciadas" title="Unidades vigiladas silenciadas (no generan avisos)"><span class="kpi-ico rondo-usym">' + UIS.mute + '</span><span class="kpi-etq">Silenciadas</span><span class="kpi-val" id="rondo-kpi-sil">0</span></div>' +
            '</div>' +
            '<div class="rondo-dash-block">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.warn + '</span> Requieren atencion<span class="rondo-dash-chip" id="rondo-atencion-n">0</span></div>' +
            '<div id="rondo-atencion" class="rondo-dash-list"></div>' +
            '</div>' +
            '<div class="rondo-dash-block">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.map + '</span> Unidades en zonas<span class="rondo-dash-chip" id="rondo-zonas-n">0</span></div>' +
            '<div id="rondo-dash-zonas" class="rondo-dash-list"></div>' +
            '</div>' +
            '<div class="rondo-dash-block">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.route + '</span> Rutas activas<span class="rondo-dash-chip" id="rondo-rutas-n">0</span></div>' +
            '<div id="rondo-dash-rutas" class="rondo-dash-list"></div>' +
            '</div>' +
            '<div class="rondo-dash-block">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.alertas + '</span> Avisos recientes</div>' +
            '<div id="rondo-kpi-recientes" class="rondo-dash-list"></div>' +
            '</div>' +
            // v6.0.13: ranking de unidades por avisos de hoy (clic -> filtra Avisos).
            '<div class="rondo-dash-block">' +
            '<div class="rondo-dash-block-head"><span class="rondo-usym sm">' + UIS.warn + '</span> Unidades con mas avisos hoy<span class="rondo-dash-chip" id="rondo-top-n">0</span></div>' +
            '<div id="rondo-dash-top" class="rondo-dash-list"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-unidades" style="display:none">' +
            '<div class="rondo-uni-bar">' +
            '<span class="etq"><span class="rondo-usym">' + UIS.filter + '</span> Ordenar</span>' +
            '<select class="filtro" id="rondo-uni-orden" title="Orden de la lista">' +
            '<option value="">Estado (prioridad)</option>' +
            '<option value="eco">Eco</option>' +
            '<option value="placa">Placa</option>' +
            '<option value="estado">Estado</option>' +
            '<option value="edad">Último reporte</option>' +
            '<option value="vel">Velocidad</option>' +
            '<option value="zona">Zona</option>' +
            '<option value="odo">Odómetro</option>' +
            '<option value="ruta">Ruta</option>' +
            '</select>' +
            '<button class="mini" id="rondo-uni-dir" title="Cambiar direccion del orden"><span class="rondo-usym">' + UIS.down + '</span></button>' +
            '</div>' +
            '<div id="rondo-body" class="rondo-uni-list"></div>' +
            '<div id="rondo-sel-vacio" style="display:none;padding:18px;text-align:center;color:var(--rondo-fg-dim);font-size:12px">No has seleccionado ninguna unidad. Activa <b>Monitorear todas</b> en Configuración o marca los vehículos que quieres monitorear con la casilla de cada tarjeta.</div>' +
            '</div>' +
'<div class="tabla" id="rondo-wrap-alertas" style="display:none">' +
             '<div class="severidad-pick" id="rondo-filtroseveridad">' +
             '<span data-sev="todas" class="activo">Todas</span>' +
             '<span data-sev="critico">Criticas</span>' +
             '<span data-sev="alto">Altas</span>' +
             '<span data-sev="medio">Medias</span>' +
             '<span data-sev="bajo">Bajas</span>' +
             '</div>' +
             '<div class="rondo-ia-bar" id="rondo-ia-bar" style="display:none">' +
             '<span class="rondo-ia-bar-title"><span class="rondo-usym">' + UIS.robot + '</span> Analisis con IA</span>' +
             '<button type="button" class="rondo-ia-action" id="rondo-ia-batch" title="Analiza los avisos del dia (o los ultimos) y devuelve un ranking de los mas urgentes"><span class="rondo-usym lg">' + UIS.robot + '</span>' +
             '<span class="rondo-ia-action-txt"><b>Analizar lote</b><small>Prioriza los avisos mas urgentes</small></span></button>' +
             '<button type="button" class="rondo-ia-action" id="rondo-ia-flota" title="Revision proactiva de toda la flota: unidades que requieren atencion, riesgos y recomendaciones"><span class="rondo-usym lg">' + UIS.robot + '</span>' +
             '<span class="rondo-ia-action-txt"><b>Analizar flota</b><small>Unidades por atender, riesgos y consejos</small></span></button>' +
             '</div>' +
             '<div id="rondo-lista-alertas"></div>' +
             '</div>' +
            '<div class="tabla" id="rondo-wrap-rutas" style="display:none">' +
            '<div class="rondo-rutas-bar">' +
            '<span class="rondo-rutas-pend" id="rondo-rutas-pend"></span>' +
            '<button class="mini" id="rondo-rutas-trazar" title="Reintentar el trazado de todas las rutas pendientes (sin limite de intentos)"><span class="rondo-usym">' + UIS.refresh + '</span> Trazar pendientes</button>' +
            '</div>' +
            '<div id="rondo-lista-rutas"></div>' +
            '<div id="rondo-lista-viajes"></div>' +
            '</div>' +
'<div class="tabla" id="rondo-wrap-caravana" style="display:none">' +
             '<div class="rondo-caravana-bar">' +
             '<label for="rondo-caravana-sel" style="font-size:11px;color:var(--rondo-fg-dim)">Unidad vigilada:</label>' +
             '<select id="rondo-caravana-sel" class="filtro" style="flex:1"></select>' +
             '<span class="rondo-caravana-resumen" id="rondo-caravana-resumen"></span>' +
             '</div>' +
             '<div id="rondo-caravana-body" class="rondo-caravana-body"></div>' +
             '</div>' +
             // v6.0.11: tab de replay. Reproduce el recorrido de una unidad
             // entre una fecha/hora de inicio y una de fin (permite multidia).
             // v6.0.12: tab de replay en tarjetas (consulta, mapa, reproduccion
             // y listas) para que la jerarquia visual sea clara.
             '<div class="tabla" id="rondo-wrap-replay" style="display:none">' +
             // 1) Consulta: unidad, rango (fecha/hora inicio y fin) y rangos rapidos.
             '<div class="rondo-replay-card">' +
             '<div class="rrc-head"><span class="rrc-title">Unidad y rango</span><span class="rrc-sub">Del inicio al fin</span></div>' +
             '<div class="rondo-replay-buscar">' +
             '<input type="text" id="rondo-replay-buscar" class="filtro" placeholder="Buscar unidad (eco, placa, nombre)..." autocomplete="off" spellcheck="false" title="Buscar la unidad a reproducir">' +
             '<input type="hidden" id="rondo-replay-eco">' +
             '<div id="rondo-replay-sug" class="rondo-replay-sug"></div>' +
             '</div>' +
             '<div class="rrc-range">' +
             '<label class="rrc-field"><span class="rrc-lbl">Desde</span>' +
             '<input type="date" id="rondo-replay-fecha" class="filtro" title="Fecha de inicio">' +
             '<input type="time" id="rondo-replay-desde" class="filtro" title="Hora de inicio" value="00:00"></label>' +
             '<label class="rrc-field"><span class="rrc-lbl">Hasta</span>' +
             '<input type="date" id="rondo-replay-fecha2" class="filtro" title="Fecha de fin (si es igual al inicio, es el mismo dia)">' +
             '<input type="time" id="rondo-replay-hasta" class="filtro" title="Hora de fin" value="23:59"></label>' +
             '</div>' +
             '<div class="rondo-replay-quick">' +
             '<span class="rq-lbl">Rango:</span>' +
             '<button class="mini" data-rango="hoy">Hoy</button>' +
             '<button class="mini" data-rango="ayer">Ayer</button>' +
             '<button class="mini" data-rango="24h">Ult. 24 h</button>' +
             '<button class="mini" data-rango="dia">Turno dia</button>' +
             '<button class="mini" data-rango="noche">Turno noche</button>' +
             '</div>' +
             '<div class="rrc-actions">' +
             '<button class="accbtn" id="rondo-replay-cargar" title="Cargar el recorrido del rango elegido"><span class="rondo-usym">' + UIS.refresh + '</span> <span class="rrc-cargar-txt">Cargar recorrido</span></button>' +
             '<button class="mini" id="rondo-replay-centrar" title="Centrar el mini-mapa en el recorrido"><span class="rondo-usym">' + UIS.map + '</span> Centrar</button>' +
             '</div>' +
             // v6.9.1: linea de estado del recorrido (unidad/rango/km/paradas).
             '<div class="rrc-estado" id="rondo-replay-estado" aria-live="polite"></div>' +
             '</div>' +
             // 2) Resumen (chips) y mapa, con leyenda y detalle del punto actual.
             '<div id="rondo-replay-resumen" class="rondo-replay-info"></div>' +
             '<div class="rondo-replay-card">' +
             '<div class="rrc-head"><span class="rrc-title">Mapa del recorrido</span></div>' +
             '<div class="rondo-replay-mapa" id="rondo-replay-mapa"><div class="rondo-replay-vacio"><span class="rondo-usym rv-ico">' + UIS.map + '</span><span>Carga un recorrido para verlo en el mapa</span></div></div>' +
             '<div class="rondo-replay-leyenda"><span class="lg"><i style="background:#7d8595"></i>parada</span><span class="lg"><i style="background:#1565c0"></i>geocerca</span><span class="lg"><i style="background:#b71c1c"></i>exceso</span><span class="lg"><i style="background:#e65100"></i>desvio</span></div>' +
             '<div id="rondo-replay-info" class="rondo-replay-info"></div>' +
             '</div>' +
             // 3) Reproduccion: play, velocidad, progreso y perfil de velocidad.
             '<div class="rondo-replay-card">' +
             '<div class="rrc-head"><span class="rrc-title">Reproduccion</span><span class="rrc-time" id="rondo-replay-tiempo">--:-- / --:--</span></div>' +
             '<div class="rondo-replay-ctrl">' +
             '<button class="accbtn rrc-play" id="rondo-replay-play" title="Reproducir o pausar" disabled><span class="rondo-usym rrc-play-ico">' + UIS.play + '</span> <span class="rrc-play-txt">Play</span></button>' +
             '<button class="mini rrc-btn-ico" id="rondo-replay-reiniciar" title="Volver al inicio del recorrido" disabled><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
             '<label class="rrc-vel"><span class="rrc-lbl">Velocidad</span>' +
             '<select id="rondo-replay-vel" class="filtro" title="Velocidad de reproduccion">' +
             '<option value="60">1 min/s</option>' +
             '<option value="300" selected>5 min/s</option>' +
             '<option value="900">15 min/s</option>' +
             '<option value="3600">1 h/s</option>' +
             '</select></label>' +
             '</div>' +
             '<input type="range" id="rondo-replay-slider" min="0" max="0" value="0">' +
             '<div class="rondo-replay-chart" id="rondo-replay-chart" title="Velocidad en el tiempo; clic para saltar"><div class="rondo-replay-vacio">Perfil de velocidad</div></div>' +
             '</div>' +
             // 4) Paradas y eventos del recorrido.
             '<div class="rondo-replay-card">' +
             '<div class="rondo-replay-sec"><h5>Paradas</h5><div id="rondo-replay-paradas" class="rondo-replay-lista"></div></div>' +
             '<div class="rondo-replay-sec"><h5>Eventos</h5><div id="rondo-replay-eventos" class="rondo-replay-lista"></div></div>' +
             '</div>' +
             // v6.11.1: opciones del reporte del recorrido. Cada check decide
             // si esa parte aparece en el PDF generado.
             '<div class="rondo-replay-card">' +
             '<div class="rrc-head"><span class="rrc-title">Opciones del reporte</span><span class="rrc-sub">que incluir en el PDF</span></div>' +
             '<div class="rrc-checks">' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-mapa"> Mapa del recorrido</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-kpis"> Resumen (KPIs)</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-paradas"> Paradas</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-eventos"> Eventos</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-puntos"> Puntos del recorrido</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-coords"> Coordenadas</label>' +
             '<label class="rrc-chk"><input type="checkbox" id="rondo-rep-solooff"> Solo paradas con motor apagado</label>' +
             '</div>' +
             '</div>' +
             '<div class="rondo-replay-acciones">' +
             '<button class="mini" id="rondo-replay-pdf" title="Generar un PDF del recorrido con las opciones elegidas"><span class="rondo-usym">' + UIS.export + '</span> Reporte PDF</button>' +
             '<button class="mini" id="rondo-replay-geo" title="Exportar el recorrido del dia a GeoJSON"><span class="rondo-usym">' + UIS.export + '</span> GeoJSON</button>' +
             '<button class="mini" id="rondo-replay-csv" title="Exportar las paradas del dia a CSV"><span class="rondo-usym">' + UIS.csv + '</span> Paradas CSV</button>' +
             '</div>' +
             '</div>' +
             // v5.14.6: tab de chat con IA. Solo se muestra si la IA esta
             // habilitada y con API key (ver paintTabsChat()).
             '<div class="tabla" id="rondo-wrap-chat" style="display:none">' +
             '<div class="rondo-chat-head">' +
             '<div class="rondo-chat-info"><span class="rondo-usym">' + UIS.robot + '</span> Chat IA · <span id="rondo-chat-prov">-</span></div>' +
             // v5.14.7: toggle de alcance del contexto. false = solo
             // unidades vigiladas, true = toda la flota que reporta.
             '<label class="rondo-chat-scope" title="Que unidades incluir en el contexto que ve la IA"><input type="checkbox" id="rondo-chat-all"><span class="rondo-chat-scope-track"><span class="rondo-chat-scope-dot"></span></span><span class="rondo-chat-scope-lbl">Toda la flota</span></label>' +
             '<div class="rondo-chat-actions"><button type="button" class="mini" id="rondo-chat-clear" title="Limpiar conversacion"><span class="rondo-usym sm">' + UIS.clear + '</span> Limpiar</button></div>' +
             '</div>' +
             '<div id="rondo-chat-log" class="rondo-chat-log"></div>' +
             '<div class="rondo-chat-input-bar">' +
             '<textarea id="rondo-chat-input" rows="1" placeholder="Escribe tu consulta a la IA..."></textarea>' +
             '<button type="button" id="rondo-chat-send" title="Enviar (Enter)"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
             '</div>' +
             '</div>' +
            '<div class="tabla" id="rondo-wrap-zonas" style="display:none">' +
            '<div class="rondo-zonas-seg" id="rondo-zonas-seg">' +
            '<button class="rondo-zseg activo" data-ztab="geocercas"><span class="rondo-usym">' + UIS.map + '</span> Geocercas</button>' +
            '<button class="rondo-zseg" data-ztab="riesgo"><span class="rondo-usym">' + UIS.riesgo + '</span> Riesgo</button>' +
            '</div>' +
            '<div class="rondo-zpane" id="rondo-zpane-geocercas">' +
            '<div class="rondo-zbar">' +
            '<span class="rondo-zbar-info"><b id="rondo-geo-count">0</b> geocercas</span>' +
            '<button class="mini" id="rondo-geo-recargar" title="Volver a consultar las geocercas de la plataforma"><span class="rondo-usym">' + UIS.refresh + '</span> Recargar</button>' +
            '<button class="mini" id="rondo-geo-configurar" title="Ajustes > General: Cargar geocercas"><span class="rondo-usym">' + UIS.gear + '</span> Ajustes</button>' +
            '</div>' +
            '<div class="rondo-geo-kpis" id="rondo-geo-kpis">' +
            '<div class="rondo-geo-kpi"><b id="rondo-geo-kpi-total">0</b><span>Geocercas</span></div>' +
            '<div class="rondo-geo-kpi"><b id="rondo-geo-kpi-ocupadas">0</b><span>Con unidades</span></div>' +
            '<div class="rondo-geo-kpi"><b id="rondo-geo-kpi-base">0</b><span>Base</span></div>' +
            '<div class="rondo-geo-kpi"><b id="rondo-geo-kpi-carga">0</b><span>Carga</span></div>' +
            '<div class="rondo-geo-kpi"><b id="rondo-geo-kpi-alerta">0</b><span>En alerta</span></div>' +
            '</div>' +
            // v6.12: franja de la alerta de geocercas (resumen de las
            // geocercas vigiladas). El detalle de cada una esta en su campana.
            '<div id="rondo-geo-ga-resumen"></div>' +
            '<div class="rondo-geo-filters">' +
            '<input id="rondo-geo-buscar" class="filtro" placeholder="Buscar geocerca o unidad\u2026">' +
            '<select id="rondo-geo-orden" class="filtro" title="Ordenar">' +
            '<option value="nombre">Nombre (A-Z)</option>' +
            '<option value="unidades">Mas unidades</option>' +
            '<option value="area">Mayor area</option>' +
            '</select>' +
            '<select id="rondo-geo-rol" class="filtro" title="Filtrar por rol">' +
            '<option value="todas">Todas</option>' +
            '<option value="base">Base</option>' +
            '<option value="carga">Carga</option>' +
            '<option value="ocupadas">Con unidades</option>' +
            '<option value="app">De la app</option>' +
            '</select>' +
            '<button class="mini" id="rondo-geo-nueva" title="Dibujar una geocerca nueva en Rondo (fuera de la plataforma)"><span class="rondo-usym">' + UIS.zone + '</span> Nueva</button>' +
            '<button class="mini" id="rondo-geo-csv" title="Descargar CSV"><span class="rondo-usym">' + UIS.csv + '</span> CSV</button>' +
            '<button class="mini" id="rondo-geo-geo" title="Descargar GeoJSON"><span class="rondo-usym">' + UIS.export + '</span> GeoJSON</button>' +
            '</div>' +
            '<div class="rondo-geo-list"><div id="rondo-body-zonas" class="rondo-geo-cards"></div></div>' +
            '</div>' +
            '<div class="rondo-zpane" id="rondo-zpane-riesgo" style="display:none">' +
            '<div class="rondo-riesgo-hero">' +
            '<div class="rondo-riesgo-dona" id="rondo-riesgo-dona" title="Distribucion por nivel">' +
            '<svg viewBox="0 0 74 74" aria-hidden="true">' +
            '<circle class="fondo" cx="37" cy="37" r="28.5"></circle>' +
            '<circle class="seg-alto" id="rondo-riesgo-dona-alto" cx="37" cy="37" r="28.5" stroke-dasharray="0 999" stroke-dashoffset="0"></circle>' +
            '<circle class="seg-medio" id="rondo-riesgo-dona-medio" cx="37" cy="37" r="28.5" stroke-dasharray="0 999" stroke-dashoffset="0"></circle>' +
            '<circle class="seg-bajo" id="rondo-riesgo-dona-bajo" cx="37" cy="37" r="28.5" stroke-dasharray="0 999" stroke-dashoffset="0"></circle>' +
            '</svg>' +
            '<div class="rondo-riesgo-dona-center">' +
            '<span class="dona-val" id="rondo-riesgo-dona-val">0</span>' +
            '<span class="dona-etq">zonas</span>' +
            '</div>' +
            '</div>' +
            '<div class="rondo-riesgo-hero-side">' +
            '<div class="rondo-riesgo-hero-head">' +
            '<span class="ht">Zonas de riesgo</span>' +
            '<span class="hs" id="rondo-riesgo-fuente-tag"></span>' +
            '</div>' +
            '<div class="rondo-riesgo-kpis" id="rondo-riesgo-kpis">' +
            '<div class="rondo-riesgo-kpi" data-kpi-nivel="todas"><span class="kpi-etq">Total</span><span class="kpi-val" id="rondo-riesgo-kpi-total">0</span><span class="kpi-res" id="rondo-riesgo-kpi-prom">&mdash;</span></div>' +
            '<div class="rondo-riesgo-kpi alto" data-kpi-nivel="alto" title="Clic para filtrar por Alto"><span class="kpi-etq">Alto</span><span class="kpi-val" id="rondo-riesgo-kpi-alto">0</span><span class="kpi-res">score &ge; 70</span></div>' +
            '<div class="rondo-riesgo-kpi medio" data-kpi-nivel="medio" title="Clic para filtrar por Medio"><span class="kpi-etq">Medio</span><span class="kpi-val" id="rondo-riesgo-kpi-medio">0</span><span class="kpi-res">40&ndash;69</span></div>' +
            '<div class="rondo-riesgo-kpi bajo" data-kpi-nivel="bajo" title="Clic para filtrar por Bajo"><span class="kpi-etq">Bajo</span><span class="kpi-val" id="rondo-riesgo-kpi-bajo">0</span><span class="kpi-res">&lt; 40</span></div>' +
            '</div>' +
            '<div class="rondo-riesgo-hist-wrap" id="rondo-riesgo-hist-wrap">' +
            '<div class="rondo-riesgo-hist-head"><span>Distribucion de score</span><b id="rondo-riesgo-hist-rango">0&ndash;100</b></div>' +
            '<div class="rondo-riesgo-hist" id="rondo-riesgo-hist"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="rondo-seccion rondo-riesgo-status-sec" id="rondo-riesgo-drop">' +
            '<div class="rondo-riesgo-status-row">' +
            '<div class="rondo-riesgo-status-text">' +
            '<span class="rondo-usym lg">' + UIS.riesgo + '</span> ' +
            '<b id="rondo-riesgo-status-cuenta">0 zonas</b>' +
            '<span id="rondo-riesgo-status-fuente" class="rondo-riesgo-status-sub"></span>' +
            '</div>' +
            '<button class="mini" id="rondo-riesgo-recargar" title="Recargar el dataset desde la URL"><span class="rondo-usym">' + UIS.refresh + '</span> Recargar</button>' +
            '<button class="mini" id="rondo-riesgo-configurar" title="Abrir Ajustes de Reglas (URL, formato, parametros y regla)"><span class="rondo-usym">' + UIS.gear + '</span> Ajustes</button>' +
            '<button class="mini" id="rondo-riesgo-limpiar" title="Olvidar el dataset en memoria"><span class="rondo-usym">' + UIS.clear + '</span></button>' +
            '</div>' +
            '<div id="rondo-riesgo-estado" class="rondo-riesgo-estado"></div>' +
            '<p class="rondo-riesgo-status-hint">Configura la URL, formato, parametros y la regla en <b>Ajustes &gt; Reglas</b>. Tambien puedes arrastrar aqui un CSV/JSON.</p>' +
            '<div class="rondo-riesgo-dropmask"><span class="rondo-usym md">' + UIS.drop + '</span> Suelta el archivo aqui</div>' +
            '</div>' +
            '<div class="rondo-seccion">' +
            '<h4><span class="rondo-usym md">' + UIS.filter + '</span> Filtros y vista<span class="rondo-count" id="rondo-riesgo-filtradas">0</span></h4>' +
            '<div class="rondo-riesgo-filters">' +
            '<div class="rondo-riesgo-filters-row">' +
            '<input id="rondo-riesgo-buscar" class="filtro" placeholder="Buscar estado, municipio, delito, id\u2026">' +
            '<select id="rondo-riesgo-orden" class="filtro" title="Ordenar">' +
            '<option value="score">Mayor score</option>' +
            '<option value="score-asc">Menor score</option>' +
            '<option value="estado">Estado (A-Z)</option>' +
            '<option value="municipio">Municipio (A-Z)</option>' +
            '<option value="radio-desc">Mayor buffer</option>' +
            '<option value="radio-asc">Menor buffer</option>' +
            '</select>' +
            '<select id="rondo-riesgo-vista" class="filtro" title="Vista">' +
            '<option value="grupo">Por estado</option>' +
            '<option value="plano">Lista plana</option>' +
            '</select>' +
            '<button class="mini" id="rondo-riesgo-limpiar-filtros" title="Quitar filtros y ver todas las zonas"><span class="rondo-usym">' + UIS.clear + '</span></button>' +
            '<button class="mini" id="rondo-riesgo-expandir" title="Expandir o colapsar todos los grupos"><span class="rondo-usym">' + UIS.expand + '</span></button>' +
            '</div>' +
            '<div class="rondo-riesgo-chips">' +
            '<span class="rondo-chip activo" data-nivel="todas">Todas</span>' +
            '<span class="rondo-chip alto" data-nivel="alto">Alto</span>' +
            '<span class="rondo-chip medio" data-nivel="medio">Medio</span>' +
            '<span class="rondo-chip bajo" data-nivel="bajo">Bajo</span>' +
            '<span class="rondo-riesgo-export">' +
            '<button class="mini" id="rondo-riesgo-csv" title="Descargar CSV"><span class="rondo-usym">' + UIS.csv + '</span> CSV</button>' +
            '<button class="mini" id="rondo-riesgo-geo" title="Descargar GeoJSON"><span class="rondo-usym">' + UIS.export + '</span> GeoJSON</button>' +
            '<button class="mini" id="rondo-riesgo-copiar" title="Copiar al portapapeles"><span class="rondo-usym">' + UIS.copy + '</span> Copiar</button>' +
            '</span>' +
            '</div>' +
            '<div class="rondo-riesgo-summary" id="rondo-riesgo-summary"></div>' +
            '</div>' +
            '</div>' +
            '<div class="rondo-seccion">' +
            '<h4><span class="rondo-usym md">' + UIS.zone + '</span> Zonas<span class="rondo-count" id="rondo-riesgo-total">0</span></h4>' +
            '<div id="rondo-riesgo-lista" class="rondo-riesgo-list"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<footer><span id="rondo-info">iniciando...</span><span id="rondo-upd"></span></footer>'
        );
        panelEl.style.width = (APP.panelSize && APP.panelSize.w) ? APP.panelSize.w + 'px' : '520px';
        panelEl.style.height = (APP.panelSize && APP.panelSize.h) ? APP.panelSize.h + 'px' : '440px';

        modalEl = makeEl('div', { id: 'rondo-modal' });
        modalEl.innerHTML = (
            '<h3><span class="rondo-usym">' + UIS.route + '</span> Unidades y rutas</h3>' +
            '<p class="rondo-modal-intro">Una sola lista para vigilar unidades, abrir ventanas y asignar <b>destinos o rutas multipunto</b> (geocercas, municipios, lugares o coordenadas).</p>' +
            '<textarea id="rondo-txt" placeholder="Pega una unidad por linea:&#10;4381&#10;4132=Monterrey&#10;4201=geo:CEDIS Norte | mun:Saltillo | coord:25.68,-100.31"></textarea>' +
            '<div class="rondo-modal-actions">' +
            '<button class="mini" id="rondo-modal-parse"><span class="rondo-usym">' + UIS.down + '</span> Pegar a la lista</button>' +
            '<button class="mini" id="rondo-modal-clear-txt"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar area</button>' +
            '<span class="rondo-modal-sintaxis">Tipos: <code>geo:</code> geocerca · <code>mun:</code> municipio · <code>coord:</code> coordenadas. Separa paradas con <code>|</code>.</span>' +
            '</div>' +
            '<div class="rondo-order-tools">' +
            '<span class="etq">Orden de las ventanas:</span>' +
            '<button class="mini" id="rondo-orden-pegado" title="En el orden en que se pegaron">Pegado</button>' +
            '<button class="mini" id="rondo-orden-numero" title="Por numero de economico (menor a mayor)">Número</button>' +
            '<button class="mini" id="rondo-orden-numero-desc" title="Por numero de economico (mayor a menor)">Número inverso</button>' +
            '<button class="mini" id="rondo-orden-alfabetico" title="Orden alfabetico">A-Z</button>' +
            '<button class="mini" id="rondo-orden-invertir" title="Invertir el orden actual">Invertir</button>' +
            '</div>' +
            '<div class="rondo-modal-sec"><span class="rondo-usym sm">' + UIS.watch + '</span> Unidades en la lista<span class="rondo-count" id="rondo-modal-count">0</span></div>' +
            '<input type="search" id="rondo-modal-buscar" class="rondo-modal-buscar" placeholder="Buscar unidad o destino en la lista..." autocomplete="off" spellcheck="false" title="Filtra la lista por eco, placa o destino">' +
            '<div id="rondo-modal-lista-wrap">' +
                '<div id="rondo-modal-lista"></div>' +
            '</div>' +
            '<p class="rondo-modal-hint">Arrastra el asa ⠿ para cambiar el orden de las ventanas. Pulsa <b>Paradas</b> en una unidad para anadir destinos o una ruta multipunto.</p>' +
            '<div class="rondo-modal-add">' +
                '<input type="text" id="rondo-modal-new-eco" placeholder="eco (ej. 4381)">' +
                '<button class="mini" id="rondo-modal-add"><span class="rondo-usym">' + UIS.check + '</span> Anadir</button>' +
                '<button class="accbtn" id="rondo-modal-add-plan"><span class="rondo-usym">' + UIS.route + '</span> Anadir con paradas</button>' +
            '</div>' +
            '<div class="rondo-acciones">' +
            '<button class="cancel" id="rondo-cancelar">Cancelar</button>' +
            '<button class="mini" id="rondo-modal-vaciar" style="background:#b71c1c;color:#fff"><span class="rondo-usym">' + UIS.clear + '</span> Vaciar lista</button>' +
            '<button class="accbtn" id="rondo-ejecutar"><span class="rondo-usym">' + UIS.panel + '</span> Ejecutar (abrir ventanas)</button>' +
            '</div>'
        );

        cfgWinEl = makeEl('div', { id: 'rondo-config' });
        cfgWinEl.innerHTML = (
            '<div class="cfg-head"><h3><span class="rondo-usym">' + UIS.gear + '</span> Configuración</h3>' +
            '<input type="search" id="rondo-cfg-buscar" class="rondo-cfg-buscar" placeholder="Buscar ajuste..." autocomplete="off" spellcheck="false" title="Filtra los ajustes por nombre (p. ej. velocidad, IA, umbral, geocerca)">' +
            '<span class="cfg-buscar-count" id="rondo-cfg-buscar-count"></span>' +
            '<button class="rondo-iconbtn" id="rondo-cfg-cerrar-x" title="Cerrar">×</button></div>' +
            '<div class="cfg-tabs" id="rondo-cfg-tabs">' +
            '<button class="cfg-tab activo" data-cfg="general">General</button>' +
            '<button class="cfg-tab" data-cfg="reglas">Reglas</button>' +
            '<button class="cfg-tab" data-cfg="avisos">Avisos</button>' +
            '<button class="cfg-tab" data-cfg="visual">Visual</button>' +
            '<button class="cfg-tab" data-cfg="ventanas">Ventanas</button>' +
            '<button class="cfg-tab" data-cfg="rutas">Rutas</button>' +
            '<button class="cfg-tab" data-cfg="ia">IA</button>' +
            '<button class="cfg-tab" data-cfg="avanzado">Avanzado</button>' +
            '</div>' +
            '<div class="cfg-body" id="rondo-cfg-body">' +
            '<div class="cfg-pane" data-cfg="general">' +
            '<h4>General</h4>' +
            numRow('c-poll', 'Refresco (ms)') +
            numRow('c-off', 'Off > (min)') +
            numRow('c-cd', 'Cooldown alerta (min)') +
            checkRow('c-watchAll', 'Monitorear todas las unidades (ignora selección)') +
            checkRow('c-auto', 'Abrir al caer (critico)') +
            checkRow('c-zonas', 'Cargar geocercas') +
            checkRow('c-geo', 'Geocodificación inversa') +
            checkRow('c-hist', 'Consultar histórico de detención') +
            '<h4>Búsqueda de lugares / municipios</h4>' +
            '<label class="full">País (código ISO, ej. <b>mx</b>; vacío = sin restricción) <input type="text" id="c-geo-pais" maxlength="40" placeholder="mx"></label>' +
            numRow('c-geo-bias', 'Sesgo por cercanía a la unidad (km, 0 = sin sesgo)') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="reglas" style="display:none">' +
            '<h4>Umbrales</h4>' +
            numRow('c-gps', 'GPS perdido > (min)') +
            numRow('c-stop', 'Detenido > (min)') +
            numRow('c-zona', 'Zona no prevista > (min)') +
            numRow('c-desco', 'Desconexión > (min)') +
            numRow('c-vel', 'Velocidad máxima (km/h)') +
            '<h4>Reglas activas</h4>' +
            '<div class="row-grid">' +
            checkRow('c-r-off', 'Off') +
            checkRow('c-r-gps', 'GPS en marcha') +
            checkRow('c-r-det', 'Detenido') +
            checkRow('c-r-zona', 'Zona') +
            checkRow('c-r-geo', 'Geocercas') +
            checkRow('c-r-geo-det', 'Detenida en geocerca') +
            numRow('c-geo-det-min', 'Min detenido para alertar (min)') +
            numRow('c-geo-estable', 'Confirmar cambio de geocerca (s)') +
            checkRow('c-r-geo-alerta', 'Alerta de geocercas (interruptor general)') +
            checkRow('c-r-des', 'Destino') +
            checkRow('c-r-dis', 'Desconexión') +
            checkRow('c-r-vel', 'Velocidad') +
            checkRow('c-r-vel-sost', 'Exceso sostenido') +
            numRow('c-vel-sost-kmh', 'Velocidad sostenida (km/h)') +
            numRow('c-vel-sost-min', 'Minutos sobre el umbral') +
            checkRow('c-r-riesgo', 'Perdi\u00f3 se\u00f1al en zona de riesgo') +
            checkRow('c-r-riesgo-pre', 'Aproximaci\u00f3n a zona de riesgo (predictiva)') +
            '</div>' +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:0 0 6px">Este es el interruptor general. Cada geocerca se vigila por separado (a quien, ' +
            'gravedad y si dispara al pasar, al detenerse o al detenerse con el motor apagado) desde la <b>campana</b> de su tarjeta en <b>Zonas &gt; Geocercas</b>.</p>' +
            '<h4>Zonas de riesgo</h4>' +
            '<label>URL del CSV / JSON <span style="color:var(--rondo-fg-dim);font-size:11px">(opcional; se consulta en cada arranque; el repo no incluye datos)</span>' +
            '<input type="text" id="c-riesgo-url" style="width:100%;margin-top:4px" placeholder="pega la URL aqu\u00ed (https://...)">' +
            '</label>' +
            '<label>Formato ' +
            '<select id="c-riesgo-formato">' +
            '<option value="auto">Auto detectar</option>' +
            '<option value="csv">CSV / TSV</option>' +
            '<option value="json">JSON</option>' +
            '</select>' +
            '</label>' +
            numRow('c-riesgo-min', 'Score m\u00ednimo (0-100)') +
            numRow('c-riesgo-mul', 'Multiplicador de radio (x)') +
            '<h4>Alerta predictiva (aproximaci\u00f3n)</h4>' +
            '<p style="font-size:11.5px;color:var(--rondo-fg-dim);margin:0 0 6px">Dispara cuando una unidad <b>en movimiento</b> se est\u00e1 acercando a una zona de riesgo, ANTES de que llegue o pierda se\u00f1al. Por defecto apagada.</p>' +
            numRow('c-riesgo-pre-min', 'Score m\u00ednimo para anticipar (0-100)') +
            numRow('c-riesgo-pre-buffer', 'Buffer de anticipaci\u00f3n (m)') +
            numRow('c-riesgo-pre-vel', 'Velocidad m\u00ednima para alertar (km/h)') +
            numRow('c-riesgo-pre-cooldown', 'Cooldown por unidad+zona (s)') +
            checkRow('c-riesgo-pre-noct', 'S\u00f3lo de noche') +
            '<label>Ventana nocturna desde <input type="time" id="c-riesgo-pre-desde" value="22:00"></label>' +
            '<label>Ventana nocturna hasta <input type="time" id="c-riesgo-pre-hasta" value="05:00"></label>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avisos" style="display:none">' +
            '<h4>Avisos</h4>' +
            checkRow('c-voz', 'Voz') +
            '<label>Motor de voz <select id="c-voz-motor">' +
            '<option value="web">Navegador (sin internet)</option>' +
            '<option value="online">Online \u00b7 gratis (ttsmp3 / StreamElements)</option>' +
            '<option value="google">Online \u00b7 Google</option>' +
            '</select></label>' +
            '<label>Idioma de voz <select id="c-voz-lang">' +
            '<option value="es-MX">Español (México)</option>' +
            '<option value="es-ES">Español (España)</option>' +
            '<option value="es-US">Español (EE. UU.)</option>' +
            '</select></label>' +
            '<label>Voz <select id="c-voz-voice"><option value="">Predeterminada</option></select></label>' +
            '<div class="rondo-acciones" style="margin-top:6px">' +
                '<button type="button" class="accbtn" id="c-voz-test"><span class="rondo-usym">' + UIS.speak + '</span> Probar voz</button>' +
                '<button type="button" class="accbtn" id="c-voz-detener"><span class="rondo-usym">' + UIS.close + '</span> Detener</button>' +
            '</div>' +
            '<label>Texto de prueba <input type="text" id="c-voz-test-text" value="' + esc(DEFAULTS.vozTest) + '" maxlength="180" title="Frase que se lee al pulsar Probar voz"></label>' +
            '<span style="font-size:11px;color:var(--rondo-fg-dim);display:block;margin-top:-2px">Se lee con el motor, idioma y voz configurados arriba. <b>Online</b> es gratis y sin API key (ttsmp3.com y, si falla, StreamElements y Google). Si eliges <b>Navegador</b> y tu equipo no tiene voces, Rondo usa <b>Online</b> automaticamente.</span>' +
            '<span id="c-voz-status" style="font-size:11.5px;display:block;margin-top:4px"></span>' +
            checkRow('c-beep', 'Pitido en alertas graves') +
            numRow('c-beep-vol', 'Volumen del pitido (0-1)') +
            checkRow('c-desktop', 'Notificación del navegador') +
            numRow('c-toastSeg', 'Duración de toasts (s)') +
            '<label>Severidad mínima en toasts' +
            '<select id="c-sevmin">' +
            '<option value="bajo">Bajo y arriba</option>' +
            '<option value="medio">Medio y arriba</option>' +
            '<option value="alto">Alto y arriba</option>' +
            '<option value="critico">Solo críticas</option>' +
            '</select>' +
            '</label>' +
            '<h4>Horario y vigilancia</h4>' +
            '<label>Horario activo <input type="checkbox" id="c-hor-on"></label>' +
            '<label>Desde <input type="time" id="c-hor-a"></label>' +
            '<label>Hasta <input type="time" id="c-hor-b"></label>' +
            '<div class="rondo-acciones" style="margin-top:8px">' +
                '<button class="accbtn" id="c-lista-editar" style="flex:1">⎘ Editar lista de unidades</button>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="visual" style="display:none">' +
            '<h4>Apariencia</h4>' +
            '<label>Tema <select id="c-tema">' +
            '<option value="oscuro">Oscuro</option>' +
            '<option value="claro">Claro</option>' +
            '<option value="auto">Automatico</option>' +
            '</select></label>' +
            '<label>Densidad <select id="c-dens">' +
            '<option value="normal">Normal</option>' +
            '<option value="compact">Compacta</option>' +
            '</select></label>' +
            '<label>Tamaño de la interfaz <select id="c-escala" title="Agranda el texto y los controles del panel, util si te cuesta ver">' +
            '<option value="1">Normal (100%)</option>' +
            '<option value="1.15">Grande (115%)</option>' +
            '<option value="1.3">Muy grande (130%)</option>' +
            '<option value="1.5">Enorme (150%)</option>' +
            '</select></label>' +
            '<label>Color de acento <input type="color" id="c-acento"></label>' +
            checkRow('c-tema-plat', 'Usar el color de acento de la plataforma') +
            '<span id="rondo-plat-info" style="font-size:11px;color:var(--rondo-fg-dim);display:block;margin:-2px 0 6px"></span>' +
            checkRow('c-estilo-pag', 'Aplicar el estilo de Rondo a la pagina (experimental)') +
            checkRow('c-idioma-plat', 'Usar el idioma de la plataforma para la voz') +
            checkRow('c-coords', 'Mostrar lat/lon en unidades') +
            checkRow('c-contornos', 'Remarcar contornos de ventanas abiertas') +
            numRow('c-contorno-horas', 'Antigüedad de contornos (h)') +
            '<h4>Informacion</h4>' +
            '<span style="font-size:11.5px;color:var(--rondo-fg-dim)">Atajos: <b>Alt+1..8</b> cambia pestañas · <b>Alt+P</b> barra · <b>Alt+L</b> barra · <b>Alt+H</b> pliega barra · <b>?</b> ayuda · <b>Esc</b> cierra el dialogo superior</span>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="ventanas" style="display:none">' +
            '<h4>Barra lateral</h4>' +
            '<label>Lado de la barra <select id="c-panel-lado">' +
            '<option value="derecha">Derecha</option>' +
            '<option value="izquierda">Izquierda</option>' +
            '</select></label>' +
            numRow('c-panel-ancho', 'Ancho de la barra (px)') +
            checkRow('c-panel-clicfuera', 'Ocultar la barra lateral al hacer clic fuera') +
            checkRow('c-confirmar-cierre', 'Pedir confirmación al cerrar todas las ventanas') +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:2px 0 0">Rondo vive como barra lateral redimensionable. La barra recuerda su lado y si estaba abierta.</p>' +
            '<h4>Verificacion</h4>' +
            checkRow('c-verif', 'Verificación automática') +
            numRow('c-verif-seg', 'Revisar cada (seg)') +
            '<h4>Tamaño del panel</h4>' +
            '<button class="accbtn" id="rondo-reset-panel" style="width:100%"><span class="rondo-usym">' + UIS.collapse + '</span> Restablecer tamano</button>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="rutas" style="display:none">' +
            '<h4>Rutas y OpenStreetMap</h4>' +
            checkRow('c-osrm', 'Calcular rutas con OSRM (OpenStreetMap)') +
            checkRow('c-overpass', 'Permitir A* sobre datos OSM (Overpass, experimental)') +
            checkRow('c-trazado', 'Registrar trazado del recorrido') +
            numRow('c-trazado-max', 'Puntos por traza') +
            '<h4>Trazado automático</h4>' +
            checkRow('c-auto-ruta', 'Trazar ruta automáticamente al asignar un destino') +
            '<label>Trazar con ' +
            '<select id="c-auto-ruta-modo" style="flex:1">' +
            '<option value="osrm">OSRM (rápido)</option>' +
            '<option value="astar">A* sobre OSM (experimental)</option>' +
            '</select></label>' +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:4px 0 8px">Al activar este check, cuando una unidad vigilada tenga un destino, Rondo hace las tres cosas siguientes usando los algoritmos de la casa:<br>' +
            '&#8226; <b>Punto de partida</b>: detecta la ultima parada larga del historial (mas de <b>' + DEFAULTS.partidaHoras + ' h</b>) y la usa como origen de la ruta.<br>' +
            '&#8226; <b>Destino</b>: traza la ruta hacia el destino guardado en la lista vigilada (resuelve el lugar con Nominatim si hace falta).<br>' +
            '&#8226; <b>Regreso</b>: detecta cuando la unidad vuelve al punto de partida tras haber llegado al destino, y avisa.<br>' +
            'Los calculos se hacen en background respetando los servicios publicos (OSRM/Nominatim).</p>' +
            '<h4>Modo caravana</h4>' +
            numRow('c-caravana-m', 'Tolerancia lateral al eje de la ruta (m)') +
            numRow('c-caravana-cerca', 'Cercanía sin ruta (m)') +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:4px 0 8px">En la pestaña <b>Caravana</b> se elige una unidad vigilada como lider y se listan todas las unidades cercanas (vigiladas o no). Una unidad cuenta como acompañante si se proyecta a menos de la tolerancia lateral del eje de la ruta del lider; si la unidad no toca la polilinea pero esta dentro del radio de cercania tambien aparece (modo "cerca"). Las que no estan en tu lista vigilada se marcan con la pildora <b>NO VIGILADA</b>. Las que avanzan en sentido contrario se marcan en rojo.</p>' +
            '<h4>Alertas de ruta</h4>' +
            checkRow('c-r-desvio', 'Desvío de ruta') +
            numRow('c-desvio-m', 'Desvío mayor a (m)') +
            numRow('c-desvio-min', 'Desvío sostenido (min)') +
            checkRow('c-desvio-municipio', 'No marcar desvío dentro del municipio (OpenStreetMap)') +
            numRow('c-desvio-municipio-m', 'Tolerancia dentro del municipio (m)') +
            numRow('c-parada-llegada', 'Radio de llegada a cada parada (m)') +
            checkRow('c-r-retorno', 'Retorno / viaje cancelado') +
            numRow('c-retorno-m', 'Radio de origen (m)') +
            numRow('c-retorno-pct', 'Retroceso mínimo (%)') +
            checkRow('c-r-giro', 'Giro en U') +
            numRow('c-giro-grados', 'Ángulo de giro (grados)') +
            numRow('c-giro-min', 'Giro sostenido (min)') +
            checkRow('c-r-demora-base', 'Demora en base (parado en CEDIS/patio)') +
            numRow('c-demora-base-min', 'Tiempo en base para alertar (min)') +
            '<h4>Análisis de viaje (historial)</h4>' +
            numRow('c-partida-horas', 'Punto de partida: parada mayor a (h)') +
            numRow('c-parada-min', 'Parada mínima (min)') +
            numRow('c-hist-horas', 'Historial a analizar (h)') +
            checkRow('c-analizar-auto', 'Analizar automáticamente al planear ruta') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="ia" style="display:none">' +
            '<h4>IA de razonamiento</h4>' +
            '<p style="font-size:11.5px;color:var(--rondo-fg-dim);margin:0 0 8px">Cuando pulses <b>Analizar con IA</b> en un aviso, Rondo junta contexto (estado de la unidad, geocercas, POIs cercanos por Overpass, alertas recientes) y se lo envia al proveedor. La IA devuelve un veredicto (falso positivo / normal / sospechoso / critico) y un resumen. Tu <b>API key</b> se guarda solo en este navegador y solo se envia al endpoint del proveedor.</p>' +
            checkRow('c-ia-on', 'Habilitar IA (boton Analizar en Avisos)') +
            '<label>Proveedor <select id="c-ia-prov">' +
            '<option value="deepseek">DeepSeek · deepseek-chat</option>' +
            '<option value="nvidia">NVIDIA NIM · meta/llama-3.1-70b-instruct</option>' +
            '<option value="kimi">Kimi for Coding (kimi.com) · kimi-for-coding</option>' +
            '<option value="moonshot">Moonshot (platform.moonshot.ai) · kimi-k2.6</option>' +
            '<option value="minimax">MiniMax · MiniMax-M3</option>' +
            '<option value="custom">Personalizado (OpenAI-compatible)</option>' +
            '</select></label>' +
            '<span id="c-ia-prov-nota" style="font-size:11px;color:var(--rondo-fg-dim);display:block;margin-top:-2px"></span>' +
            '<label>API key <input type="password" id="c-ia-key" autocomplete="off" spellcheck="false" placeholder="sk-... / kimi-... / nvapi-..." title="Solo se envia al endpoint del proveedor; nunca a Rondo. Se guarda en este navegador."></label>' +
            '<label>Endpoint (opcional, vacio = el del proveedor) <input type="text" id="c-ia-endpoint" autocomplete="off" placeholder="https://api.kimi.ai/coding/v1/chat/completions" spellcheck="false" title="Sobreescribe la URL. Util si tu key es de otra region o producto (Kimi.ai vs Moonshot)."></label>' +
            '<label>Modelo (opcional, vacio = el del proveedor) <input type="text" id="c-ia-modelo" autocomplete="off" placeholder="(modelo por defecto)" spellcheck="false"></label>' +
            '<label>Temperatura (opcional, vacio = la del modelo) <input type="text" id="c-ia-temp" autocomplete="off" placeholder="(omitir)" spellcheck="false" title="Algunos modelos (Kimi for Coding) solo aceptan 1. Vacio = se omite y usa la del modelo."></label>' +
            '<label>Max tokens (opcional, vacio = el del modelo) <input type="text" id="c-ia-maxtok" autocomplete="off" placeholder="(omitir)" spellcheck="false" title="Vacio = se omite. Algunos modelos rechazan max_tokens bajo."></label>' +
            numRow('c-ia-radio', 'Radio de busqueda de POIs (m)') +
            numRow('c-ia-timeout', 'Timeout (s)') +
            '<h4>Contexto de la API</h4>' +
            checkRow('c-ia-contexto-api', 'Ampliar contexto con la API (historial y propiedades de la unidad preguntada)') +
            checkRow('c-ia-reporte-servidor', 'Usar reportes del servidor (report/exec_report; puede interferir con los reportes de la plataforma)') +
            '<h4>Analisis en lote y resumen</h4>' +
            checkRow('c-ia-resumen-on', 'Incluir resumen IA en el informe diario') +
            numRow('c-ia-batchmax', 'Max avisos por analisis en lote (5-50)') +
            numRow('c-ia-limite', 'Limite diario de llamadas IA (0 = sin limite)') +
            '<div id="c-ia-uso" style="font-size:11.5px;color:var(--rondo-fg-dim);margin:4px 0 6px"></div>' +
            '<div class="rondo-acciones" style="margin-top:6px">' +
                '<button type="button" class="accbtn" id="c-ia-test"><span class="rondo-usym">' + UIS.robot + '</span> Probar conexion</button>' +
                '<button type="button" class="accbtn" id="c-ia-patrones"><span class="rondo-usym">' + UIS.filter + '</span> Detectar patrones</button>' +
                '<button type="button" class="accbtn" id="c-ia-clear"><span class="rondo-usym">' + UIS.clear + '</span> Borrar API key</button>' +
            '</div>' +
            '<div id="c-ia-status" style="font-size:11.5px;color:var(--rondo-fg-dim);margin-top:6px"></div>' +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:8px 0 0">Si te da <b>401</b>: la key suele ser de otro producto. Usa <b>Kimi for Coding</b> con keys <code>kimi-...</code> de kimi.com/code (endpoint <code>/coding/v1</code>) o <b>Moonshot</b> con keys <code>sk-...</code> de platform.moonshot.ai. Si te da <b>404</b>: la ruta del endpoint esta mal; pega la URL exacta en <b>Endpoint</b>. Si te da <b>400</b>: deja <b>Temperatura</b> y <b>Max tokens</b> vacios (algunos modelos como Kimi for Coding solo aceptan <code>temperature=1</code>).</p>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avanzado" style="display:none">' +
            '<h4>Actualizaciones</h4>' +
            '<div id="rondo-update-info" style="font-size:11.5px;color:var(--rondo-fg-dim);margin-bottom:6px">Versión instalada: <b>' + VER + '</b></div>' +
            '<button class="accbtn" id="rondo-check-update" style="width:100%"><span class="rondo-usym">' + UIS.refresh + '</span> Buscar actualizaciones</button>' +
            '<h4>Datos y prueba</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-test-btn"><span class="rondo-usym">' + UIS.info + '</span> Probar avisos</button>' +
            '<button class="accbtn" id="rondo-exportar-btn"><span class="rondo-usym">' + UIS.export + '</span> Exportar</button>' +
            '<button class="accbtn" id="rondo-importar-btn"><span class="rondo-usym">' + UIS.upload + '</span> Importar</button>' +
            '</div>' +
            '<h4>Perfiles de configuración</h4>' +
            '<label>Perfil <select id="rondo-perfil-sel" style="flex:1"></select></label>' +
            '<div class="rondo-acciones" style="margin-top:6px">' +
            '<button class="accbtn" id="rondo-perfil-guardar">Guardar como...</button>' +
            '<button class="accbtn" id="rondo-perfil-cargar">Cargar</button>' +
            '<button class="accbtn" id="rondo-perfil-borrar" style="background:#b71c1c">Borrar</button>' +
            '</div>' +
            '<h4>Historial de avisos</h4>' +
            '<button class="accbtn" id="rondo-limpiar-hist" style="width:100%;background:var(--rondo-accent)">' + '<span class="rondo-usym">' + UIS.clear + '</span> Limpiar historial</button>' +
            '<h4>Reseteo</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-borrar-memo" style="background:var(--rondo-accent)"><span class="rondo-usym">' + UIS.clear + '</span> Borrar estado</button>' +
            '<button class="accbtn" id="rondo-borrar-todo" style="background:#5d0007">Borrar TODO</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<span class="cfg-dirty" id="rondo-cfg-dirty" title="Tienes cambios sin guardar">Cambios sin guardar</span>' +
            '<div style="display:flex;gap:8px">' +
            '<button class="cancel" id="rondo-cfg-reset" title="Restaurar todas las opciones a sus valores por defecto (no borra tus datos)">Restaurar</button>' +
            '<button class="cancel" id="rondo-cfg-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="rondo-cfg-guardar">Guardar</button>' +
            '</div>' +
            '</div>'
        );

        ayudaEl = makeEl('div', { id: 'rondo-ayuda' });
        ayudaEl.innerHTML = (
'<div class="cfg-head"><h3>? Ayuda rapida</h3>' +
            '<button class="rondo-iconbtn" id="rondo-ayuda-x" title="Cerrar">×</button></div>' +
            '<div class="ayuda-body">' +
            '<h4>En 3 pasos</h4>' +
            '<div class="pasos">' +
            '<div class="paso"><b>1. Configura la flota</b>En <i>Ajustes > Reglas</i> define la lista vigilada, las reglas y las notificaciones (voz, pitido, toasts).</div>' +
            '<div class="paso"><b>2. Abre las ventanas</b>En el Dashboard, abre la lista de unidades con el boton <i>Lista</i> o pulsa <i>Automatizar Unidades</i> en la barra superior para abrirlas y acomodarlas solas.</div>' +
            '<div class="paso"><b>3. Vigila los avisos</b>Las alertas se ven como tarjetas en la pestana <i>Avisos</i> y, si estan activadas, se anuncian con voz y pitido. Las criticas saltan un toast y (opcional) una notificacion del navegador.</div>' +
            '</div>' +
            '<h4>Que hace cada pestana</h4>' +
            '<ul>' +
            '<li><b>Dashboard</b>: resumen general de la flota. Cabecera con velocidad promedio, <b>accesos rapidos</b> (Unidades, Avisos, Rutas, Zonas) y <b>9 KPIs</b> (en linea, sin senal, detenidas, en mov., en zonas, avisos hoy, en ruta, exceso, silenciadas) clicables. Incluye la salud de la flota, la barra de distribucion, la <b>tendencia</b> de unidades en linea/sin senal, "Requieren atencion", el <b>ranking de unidades con mas avisos hoy</b> y los avisos recientes.</li>' +
            '<li><b>Unidades</b>: lista de tarjetas con estado, velocidad, zona y acciones. Clic para abrir su ventana; clic derecho para mas opciones (ruta, geocerca, odometro, etc.).</li>' +
            '<li><b>Avisos</b>: historial filtrable por severidad (criticas, altas, medias, bajas). Exportable a CSV.</li>' +
            '<li><b>Rutas</b>: progreso de cada ruta trazada (OSRM o A*) con ETA. Se planea desde el clic derecho de una unidad.</li>' +
            '<li><b>Zonas</b>: segmentado con dos vistas: <b>Geocercas</b> de la plataforma (unidades dentro) y <b>Zonas de riesgo</b> (dona, histograma, KPIs, filtros, export).</li>' +
            '<li><b>Caravana</b>: unidades (vigiladas o no) cerca de una unidad "lider" en la misma ruta (distancia firmada) o dentro del radio de cercania.</li>' +
            '<li><b>Replay</b>: reproduce el recorrido de una unidad entre una <b>fecha/hora de inicio y una de fin</b> (permite multidia), con mini-mapa de OpenStreetMap, perfil de velocidad, resumen, <b>paradas</b> (con motor encendido/apagado) y eventos (geocercas, excesos, desvios). Exporta GeoJSON, CSV de paradas y un reporte PDF. Solo lectura.</li>' +
            '<li><b>Chat IA</b>: consultas libres a la IA (solo si la IA esta habilitada con API key). Pregunta por el estado de la flota ("que unidades estan sin senal", "cual es la alerta mas urgente") o por el uso del propio Rondo ("como activo la regla de destino"). Tiene un selector <b>Toda la flota</b> / solo vigiladas y un boton <b>Limpiar</b>.</li>' +
            '</ul>' +
            '<h4>Alertas de ruta</h4>' +
            '<p>Con una ruta planeada, el script avisa si la unidad se <b>desvia</b> del trazado, hace un <b>giro en U</b> o <b>regresa al origen</b> (posible viaje cancelado). Activadas en Ajustes > Rutas.</p>' +
            '<h4>Chat con la IA</h4>' +
            '<p>La pestana <b>Chat IA</b> (arriba) es un asistente conversacional. Conoce el <b>manual de Rondo</b> y el <b>estado actual de la flota</b>, asi que puedes preguntarle tanto datos como dudas de uso. Ejemplos:</p>' +
            '<ul>' +
            '<li>"Que unidades estan sin senal ahora y donde fue su ultima posicion?"</li>' +
            '<li>"Que unidades estan fuera de geocerca y detenidas?"</li>' +
            '<li>"Cual es la alerta mas urgente de revisar?"</li>' +
            '<li>"Como activo la regla de destino?" / "Para que sirve la zona de riesgo?"</li>' +
            '<li>"Que hace el boton Analizar lote?"</li>' +
            '</ul>' +
            '<p>El selector <b>Toda la flota</b> decide si la IA ve todas las unidades o solo las vigiladas. El contexto incluye: unidades (estado, zona, ultimo reporte, velocidad), alertas de hoy por severidad y los ultimos avisos. Requiere la IA habilitada con API key en Ajustes > IA.</p>' +
            '<h4>Voz y notificaciones</h4>' +
            '<p>En <i>Ajustes > Avisos</i> puedes:</p>' +
            '<ul>' +
            '<li><b>Voz</b>: activar/desactivar la lectura de alertas.</li>' +
            '<li><b>Idioma de voz</b>: elige el idioma del TTS del navegador.</li>' +
            '<li><b>Voz</b>: elige una voz concreta de entre las disponibles (se actualiza al abrir el desplegable).</li>' +
            '<li><b>Pitido</b>: volumen en alertas graves.</li>' +
            '<li><b>Notificacion del navegador</b>: aviso del sistema aunque Rondo este minimizado.</li>' +
            '</ul>' +
            '<h4>Atajos de teclado</h4>' +
            '<ul>' +
            '<li><kbd>Alt</kbd>+<kbd>1</kbd>..<kbd>6</kbd>: cambiar de pestana (Dashboard, Unidades, Avisos, Rutas, Zonas, Caravana).</li>' +
            '<li><kbd>Alt</kbd>+<kbd>7</kbd>: Chat IA (si la IA esta activa).</li>' +
            '<li><kbd>Alt</kbd>+<kbd>P</kbd>: mostrar u ocultar la barra lateral.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>L</kbd>: mostrar u ocultar la barra lateral (atajo alternativo).</li>' +
            '<li><kbd>Alt</kbd>+<kbd>H</kbd>: plegar la barra de botones.</li>' +
            '<li><kbd>?</kbd>: abrir esta ayuda rapida.</li>' +
            '<li><kbd>Esc</kbd>: cerrar ventanas emergentes.</li>' +
            '</ul>' +
            '<h4>Datos y privacidad</h4>' +
            '<p>Rondo no envia datos a servidores propios. Solo usa los servicios de Wialon (geocercas, unidades, rutas) y la API publica de OpenStreetMap (OSRM/A*) para el trazo de rutas. La configuracion se guarda en tu navegador (<i>localStorage</i>, prefijo <code>rondo.api.*</code>).</p>' +
            '<h4>Consejo</h4>' +
            '<p>Rondo vive como <b>barra lateral</b> a pantalla completa. Al ocultarla queda una pestana en el borde (rail) que la trae de vuelta con un clic. Tambien puedes ajustar el lado (izquierda/derecha) y el ancho en <i>Ajustes > Ventanas</i>.</p>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<button class="cancel" id="rondo-ayuda-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="rondo-ayuda-config">Abrir ajustes</button>' +
            '</div>'

        );

        ctxEl = makeEl('div', { id: 'rondo-contexto' });
        toastsEl = makeEl('div', { id: 'rondo-toasts' });
        avisoEl = makeEl('div', { id: 'rondo-aviso' });
        railEl = makeEl('div', { id: 'rondo-rail' });
        railEl.title = 'Mostrar el panel';

        // Accesibilidad base: dialogos, regiones vivas y tabs.
        try {
            [[modalEl, 'Lista de unidades'], [cfgWinEl, 'Configuración'], [ayudaEl, 'Ayuda rápida']].forEach(([el, lbl]) => {
                el.setAttribute('role', 'dialog');
                el.setAttribute('aria-modal', 'true');
                el.setAttribute('aria-label', lbl);
            });
            toastsEl.setAttribute('role', 'status');
            toastsEl.setAttribute('aria-live', 'polite');
            avisoEl.setAttribute('role', 'alert');
            // panelEl aun no esta en el DOM: se consulta sobre el propio nodo.
            const tabsEl = panelEl.querySelector('#rondo-tabs');
            if (tabsEl) tabsEl.setAttribute('role', 'tablist');
            panelEl.querySelectorAll('#rondo-tabs .tab').forEach((t) => {
                t.setAttribute('role', 'tab');
                // El contador (un numero) seria el unico texto visible para el
                // lector de pantalla; el title describe mejor la pestana.
                if (t.title) t.setAttribute('aria-label', t.title);
                const wrap = t.dataset.tab ? panelEl.querySelector('#rondo-wrap-' + t.dataset.tab) : null;
                if (wrap) {
                    t.setAttribute('aria-controls', 'rondo-wrap-' + t.dataset.tab);
                    wrap.setAttribute('role', 'tabpanel');
                }
            });
            // Botones de solo icono: los lectores de pantalla no siempre leen
            // el title, asi que se copia a aria-label cuando el boton no tiene
            // texto visible (para no pisar la etiqueta de los botones de texto).
            [barraEl, panelEl, modalEl, cfgWinEl, ayudaEl].forEach((root) => {
                root.querySelectorAll('button[title]').forEach((b) => {
                    if (b.getAttribute('aria-label')) return;
                    const txt = (b.textContent || '').trim();
                    if (!/[A-Za-z0-9]/.test(txt)) b.setAttribute('aria-label', b.title);
                });
            });
            if (ctxEl) ctxEl.setAttribute('role', 'menu');
            if (railEl) railEl.setAttribute('aria-label', 'Mostrar el panel');
        } catch (_) { /* noop */ }

        document.body.appendChild(barraEl);
        document.body.appendChild(panelEl);
        document.body.appendChild(modalEl);
        document.body.appendChild(cfgWinEl);
        document.body.appendChild(ayudaEl);
        document.body.appendChild(ctxEl);
        document.body.appendChild(toastsEl);
        document.body.appendChild(avisoEl);
        document.body.appendChild(railEl);
    }
/* ====================== PLACE / DRAG ====================== */
    function placeBar() {
        const r = barraEl.getBoundingClientRect();
        const maxX = Math.max(0, window.innerWidth - r.width - 4);
        const maxY = Math.max(0, window.innerHeight - r.height - 4);
        APP.barra.x = clamp(APP.barra.x || 0, 0, maxX);
        APP.barra.y = clamp(APP.barra.y || 0, 0, maxY);
        barraEl.style.left = APP.barra.x + 'px';
        barraEl.style.top = APP.barra.y + 'px';
        barraEl.style.right = 'auto';
    }
    function applyBar() {
        const b = APP.barra.botones;
        mainBtn.style.display = b.main ? '' : 'none';
        panelBtn.style.display = b.panel ? '' : 'none';
        closeBtn.style.display = b.close ? '' : 'none';
        barraEl.classList.toggle('plegada', !!APP.barra.plegada);
        barraEl.classList.toggle('vertical', !!APP.barra.vertical);
        foldBtn.innerText = APP.barra.plegada ? '▸' : '▾';
        if (APP.barra.x == null || APP.barra.y == null) {
            APP.barra.x = Math.max(4, window.innerWidth - barraEl.offsetWidth - 15);
            APP.barra.y = 80;
        }
        placeBar();
        writeJSON(LS.barra, APP.barra);
    }
    // Rondo solo tiene modo sidebar (barra lateral). Se mantiene la funcion
    // por compatibilidad de llamadas, pero siempre devuelve true.
    function esLateral() { return true; }
    function aplicarModoPanel() {
        if (!panelEl) return;
        const lado = APP.config.panelLado || 'derecha';
        const ancho = clamp(Number(APP.config.panelAncho) || 460, 360, Math.max(360, window.innerWidth - 20));
        panelEl.classList.add('lateral');
        panelEl.classList.toggle('izquierda', lado === 'izquierda');
        document.body.classList.add('rondo-lateral');
        panelEl.style.top = '0px';
        panelEl.style.bottom = '0px';
        panelEl.style.height = '100vh';
        panelEl.style.width = ancho + 'px';
        if (lado === 'izquierda') { panelEl.style.left = '0px'; panelEl.style.right = 'auto'; }
        else { panelEl.style.left = 'auto'; panelEl.style.right = '0px'; }
        const colIcon = document.querySelector('#rondo-collapse .rondo-usym');
        if (colIcon) colIcon.innerHTML = UIS.collapse;
        const colBtn = byId('rondo-collapse');
        if (colBtn) colBtn.title = APP.panelHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral';
        panelEl.style.display = 'flex';
        panelEl.classList.toggle('oculto', !!APP.panelHidden);
        aplicarRail();
        writeJSON(LS.cfg, APP.config);
    }
    // Ya no hay modo flotante: Alt+L / boton del modo ahora solo muestran u ocultan.
    function toggleSidebar() {
        togglePanel();
    }
    function actualizarBotonesModo() {
        const panelLbl = byId('rondo-btn-panel');
        if (panelLbl) panelLbl.title = APP.panelHidden ? 'Mostrar la barra lateral (Alt+P)' : 'Ocultar la barra lateral (Alt+P)';
        const colBtn = byId('rondo-collapse');
        if (colBtn) colBtn.title = APP.panelHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral';
    }
    function togglePanel() {
        APP.panelHidden = !APP.panelHidden;
        APP.config.panelVisible = !APP.panelHidden;
        panelEl.style.display = 'flex';
        aplicarModoPanel();
        const icon = document.querySelector('#rondo-btn-panel .rondo-usym');
        if (icon) icon.innerHTML = APP.panelHidden ? UIS.panel : UIS.close;
        const t = byId('rondo-btn-panel');
        if (t) t.title = APP.panelHidden ? 'Mostrar la barra lateral (Alt+P)' : 'Ocultar la barra lateral (Alt+P)';
        if (APP.panelHidden) advice('Panel', 'oculto · usa el boton de la barra o el rail para mostrarlo');
        actualizarBotonesModo();
    }
    // Oculta la barra lateral sin avisos (util para el clic fuera del panel).
    function ocultarSidebar() {
        if (APP.panelHidden) return;
        APP.panelHidden = true;
        APP.config.panelVisible = false;
        aplicarModoPanel();
        actualizarBotonesModo();
    }
    function aplicarRail() {
        if (!railEl) return;
        const lado = APP.config.panelLado || 'derecha';
        railEl.classList.toggle('izquierda', lado === 'izquierda');
        railEl.classList.toggle('derecha', lado !== 'izquierda');
        railEl.innerHTML = '<span class="rondo-usym">' + (lado === 'izquierda' ? UIS.right : UIS.left) + '</span>' +
            '<span class="rondo-rail-txt">PANEL</span>';
        railEl.classList.toggle('mostrar', APP.panelHidden);
    }
    function attachDraggables() {
        (function dragBar() {
            let activo = false, dx = 0, dy = 0;
            barraEl.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button') && !e.target.closest('.rondo-grip')) return;
                activo = true;
                const r = barraEl.getBoundingClientRect();
                dx = e.clientX - r.left; dy = e.clientY - r.top;
                try { barraEl.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            barraEl.addEventListener('pointermove', (e) => {
                if (!activo) return;
                const r = barraEl.getBoundingClientRect();
                const maxX = Math.max(0, window.innerWidth - r.width - 4);
                const maxY = Math.max(0, window.innerHeight - r.height - 4);
                APP.barra.x = clamp(e.clientX - dx, 0, maxX);
                APP.barra.y = clamp(e.clientY - dy, 0, maxY);
                barraEl.style.left = APP.barra.x + 'px';
                barraEl.style.top = APP.barra.y + 'px';
                barraEl.style.right = 'auto';
            });
            const end = () => { if (activo) { activo = false; writeJSON(LS.barra, APP.barra); } };
            barraEl.addEventListener('pointerup', end);
            barraEl.addEventListener('pointercancel', end);
        })();

        // v5.15: se elimino el modo flotante. El panel es siempre barra
        // lateral; la barra de botones sigue siendo arrastrable.
        window.addEventListener('resize', () => {
            placeBar();
        });
    }

    /* ====================== PAINT ====================== */
    function setTab(name) {
        APP.tab = name;
        // v6.0.11: recuerda la pestaña para retomarla al recargar la pagina.
        try { writeSession(SS.tab, name); } catch (_) { /* noop */ }
        const ids = ['dash', 'unidades', 'alertas', 'rutas', 'caravana', 'replay', 'chat', 'zonas'];
        ids.forEach((n) => {
            const el = byId('rondo-wrap-' + n);
            if (el) el.style.display = (n === name) ? '' : 'none';
        });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) => {
            const act = t.dataset.tab === name;
            t.classList.toggle('activo', act);
            t.setAttribute('aria-selected', act ? 'true' : 'false');
            // El tabindex sigue a la pestaña activa (patron ARIA de tablist).
            if (t.getAttribute('role') === 'tab') t.setAttribute('tabindex', act ? '0' : '-1');
        });
        paintTools();
        if (name === 'dash') paintKPI();
        else if (name === 'unidades') paintTabla();
        else if (name === 'alertas') paintAlertas();
        else if (name === 'rutas') paintRutas();
        else if (name === 'caravana') paintCaravana();
        else if (name === 'replay') { rxReplayPintar(); }
        else if (name === 'chat') pintarChat();
        else if (name === 'zonas') { aplicarZonasVista(); paintGeocercas(); paintRiesgo(); }
        paintCounters();
        paintStateBadge();
        paintInfo();
    }
    // Muestra solo las herramientas relevantes a la pestaña activa. Cada
    // boton/select/input de la barra .tools lleva data-tabs con las pestañas
    // en las que aplica (vacio = siempre).
    function paintTools() {
        const tab = APP.tab || 'dash';
        const cont = byId('rondo-tools');
        if (!cont) return;
        let visibles = 0;
        cont.querySelectorAll('.rondo-tool').forEach((el) => {
            const tabs = String(el.dataset.tabs || '').split(',').map((s) => s.trim()).filter(Boolean);
            const show = tabs.length === 0 || tabs.indexOf(tab) >= 0;
            el.style.display = show ? '' : 'none';
            if (show) visibles++;
        });
        cont.style.display = visibles ? '' : 'none';
    }
    function paintInfo() {
        const info = byId('rondo-info');
        if (!info) return;
        const n = APP.unidades.filter(shouldWatch).length;
        info.textContent = n + ' unidades · ' + (APP.config.watchAll ? 'monitor todas' : ('sel ' + APP.seleccion.size))
            + ' · ' + APP.historial.length + ' avisos';
    }
    function paintCounters() {
        const watched = APP.unidades.filter(shouldWatch);
        const on = watched.filter((u) => unitState(u).online).length;
        const cOn = byId('rondo-c-on');
        const cTot = byId('rondo-c-tot');
        const cAl = byId('rondo-c-al');
        const cRu = byId('rondo-c-ru');
        const cZn = byId('rondo-c-zn');
        if (cOn) cOn.textContent = on;
        if (cTot) cTot.textContent = watched.length;
        if (cAl) cAl.textContent = APP.historial.length;
        if (cRu) cRu.textContent = Object.keys(APP.rutas).length;
        if (cZn) cZn.textContent = (APP.zonas || []).length;
        const cCv = byId('rondo-c-cv');
        if (cCv) cCv.textContent = APP.caravanaEco ? countCaravana() : 0;
    }
    function countCaravana() {
        const it = unitByEco(APP.caravanaEco);
        if (!it) return 0;
        const info = parseUnitName(it.u);
        const st = unitState(it.u);
        try {
            const r = unidadesEnCaravana(info, st);
            return (r && r.miembros) ? r.miembros.length : 0;
        } catch (_) { return 0; }
    }
    function paintStateBadge() {
        const b = byId('rondo-estado-barra');
        if (!b) return;
        const watched = APP.unidades.filter(shouldWatch);
        const off = watched.filter((u) => !unitState(u).online).length;
        const det = watched.filter((u) => { const s = unitState(u); return s.online && s.estado === 'detenida'; }).length;
        const criticos = APP.historial.filter((a) => a.sev === 'critico' && (Date.now() - a.ts) < 30 * 60000).length;
        let cls = 'ok';
        if (nmActivo()) cls = 'nm';
        else if (criticos > 0) cls = 'bad';
        else if (off > 0 || det > watched.length / 3) cls = 'warn';
        b.className = 'rondo-badge-estado ' + cls;
        b.title = nmActivo()
            ? 'No molestar hasta ' + new Date(APP.noMolestar.hasta).toLocaleTimeString().slice(0, 5)
            : 'criticos: ' + criticos + ' · sin señal: ' + off + ' · detenidas: ' + det;
    }
    // Igual que setHtml, pero conserva la posicion de scroll del propio
    // contenedor cuando se reescribe. Las listas del Dashboard se repintan
    // cada segundo; sin esto, quien habia bajado en la lista volvia arriba
    // en cada refresco.
    function rxSetHtmlKeepScroll(el, html) {
        if (!el) return false;
        const top = el.scrollTop, left = el.scrollLeft;
        const cambio = setHtml(el, html);
        if (cambio && (top || left)) { el.scrollTop = top; el.scrollLeft = left; }
        return cambio;
    }
    // Lista "Requieren atención": unidades sin señal, con exceso, desviadas,
    // detenidas o con ruta nueva sin trazar, ordenadas por prioridad. Cada fila
    // abre la ventana de la unidad.
    function paintAtencion(watched) {
        const cont = byId('rondo-atencion');
        if (!cont) return;
        const ahora = Date.now() / 1000;
        const items = [];
        watched.forEach((u) => {
            const info = parseUnitName(u);
            const st = unitState(u);
            const memo = APP.memo[info.clave] || {};
            const eco = info.eco || info.placa || String(info.id);
            if (!st.online) {
                items.push({ eco, tipo: 'offline', peso: 4000 + (st.edadMin || 0), txt: 'sin señal hace ' + ageText(st.edadMin) });
                return;
            }
            const lim = limiteDe(info);
            if (st.vel > lim) items.push({ eco, tipo: 'vel', peso: 3000 + st.vel, txt: 'a ' + Math.round(st.vel) + ' km/h (límite ' + lim + ')' });
            if (memo.desviadoDesde) {
                const min = (ahora - memo.desviadoDesde) / 60;
                items.push({ eco, tipo: 'desv', peso: 2000 + min, txt: 'desviada de su ruta hace ' + ageText(min) });
            }
            // Pendiente de trazar ruta: el destino esta definido pero la ruta
            // aun no esta calculada (o esta obsoleta). Es prioritario para que
            // el operario sepa que la unidad esta sin guia de ruta.
            const dest = watchDest(info);
            const ruta = rutaDe(info);
            if (dest && (!ruta || ruta.destinoTexto !== dest)) {
                items.push({ eco, tipo: 'ruta-pend', peso: 1500, txt: 'sin ruta hacia ' + dest });
            }
            if (st.estado === 'detenida' && memo.detenidoDesde) {
                const min = (ahora - memo.detenidoDesde) / 60;
                items.push({ eco, tipo: 'det', peso: 1000 + min, txt: 'detenida hace ' + ageText(min) });
            }
        });
        items.sort((a, b) => b.peso - a.peso);
        const top = items.slice(0, 5);
        if (!top.length) {
            rxSetHtmlKeepScroll(cont, '<div style="padding:8px;color:var(--rondo-fg-mute)">Todo en orden: ninguna unidad requiere atención.</div>');
            return;
        }
        const meta = {
            offline: { col: 'var(--rondo-bad-fg)', ic: UIS.offline },
            vel: { col: 'var(--rondo-warn-fg)', ic: UIS.speed },
            desv: { col: 'var(--rondo-warn-fg)', ic: UIS.route },
            det: { col: 'var(--rondo-accent-2)', ic: UIS.stopped },
            'ruta-pend': { col: 'var(--rondo-warn-fg)', ic: UIS.route }
        };
        rxSetHtmlKeepScroll(cont, top.map((it) => {
            const mm = meta[it.tipo] || meta.det;
            return '<div class="alerta rondo-atencion-item" data-eco="' + esc(it.eco) + '" style="border-left:3px solid ' + mm.col + ';cursor:pointer" title="Abrir la ventana de ' + esc(it.eco) + '">' +
                '<span class="ico rondo-usym" style="color:' + mm.col + '">' + mm.ic + '</span>' +
                '<div class="cuerpo"><b>' + esc(it.eco) + '</b><span>' + esc(it.txt) + '</span></div>' +
                '</div>';
        }).join(''));
    }
    function paintKPI() {
        const watched = APP.unidades.filter(shouldWatch);
        const estados = watched.map(unitState);
        const total = estados.length;
        const on = estados.filter((s) => s.online).length;
        const off = total - on;
        const mov = estados.filter((s) => s.estado === 'moviendo').length;
        const det = estados.filter((s) => s.estado === 'detenida').length;
        const vel = estados.filter((s) => s.online).reduce((a, s) => a + s.vel, 0) / Math.max(1, on);
        const enZona = new Set();
        estados.forEach((s) => { if (s.online) { const z = zoneAt(s.lat, s.lon); if (z) enZona.add(z); } });
        const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
        const aho = APP.historial.filter((a) => a.ts >= inicio.getTime()).length;
        const critAho = APP.historial.filter((a) => a.sev === 'critico' && a.ts >= inicio.getTime()).length;
        const kv = (id, v) => { const e = byId(id); if (e) e.textContent = v; };
        // v6.0.13: la velocidad promedio vive en la cabecera (antes se escribia
        // en un elemento inexistente) y se anaden KPIs de exceso y silenciadas.
        kv('rondo-dash-vel', total ? (on ? Math.round(vel) + ' km/h prom.' : 'sin unidades en linea') : 'sin unidades vigiladas');
        let exceso = 0, silenciadas = 0;
        for (let i = 0; i < watched.length; i++) {
            const info = parseUnitName(watched[i]);
            const s = estados[i] || {};
            if (info.eco && APP.dismissed.has(info.eco)) silenciadas++;
            if (s.online && s.vel > limiteDe(info)) exceso++;
        }
        kv('rondo-kpi-on', on);
        kv('rondo-kpi-off', off);
        kv('rondo-kpi-det', det);
        kv('rondo-kpi-mov', mov);
        kv('rondo-kpi-exc', exceso);
        kv('rondo-kpi-exc-pct', total ? ((exceso / total) * 100).toFixed(0) + '%' : '');
        kv('rondo-kpi-sil', silenciadas);
        kv('rondo-kpi-on-pct', total ? ((on / total) * 100).toFixed(0) + '%' : '');
        kv('rondo-kpi-off-pct', total ? ((off / total) * 100).toFixed(0) + '%' : '');
        kv('rondo-kpi-zonas', enZona.size);
        kv('rondo-kpi-zonas-pct', (APP.zonas || []).length ? 'de ' + APP.zonas.length : '');
        kv('rondo-kpi-aho', aho);
        kv('rondo-kpi-criticos', critAho ? critAho + ' criticas' : '');

        paintSalud(on, off, total, mov, det);
        const totalD = Math.max(1, total);
        const segOn = byId('rondo-dist-on');
        const segDet = byId('rondo-dist-det');
        const segOff = byId('rondo-dist-off');
        if (segOn) segOn.style.width = (mov / totalD * 100) + '%';
        if (segDet) segDet.style.width = (det / totalD * 100) + '%';
        if (segOff) segOff.style.width = (off / totalD * 100) + '%';
        const legend = byId('rondo-dist-legend');
        if (legend) {
            const pct = (v) => (total ? Math.round((v / total) * 100) + '%' : '0%');
            setHtml(legend,
                '<span><i class="on"></i> Mov. ' + mov + ' (' + pct(mov) + ')</span>' +
                '<span><i class="det"></i> Det. ' + det + ' (' + pct(det) + ')</span>' +
                '<span><i class="off"></i> Off ' + off + ' (' + pct(off) + ')</span>');
        }
        paintAtencion(watched);
        paintZonasDash();
        paintRutasDash();

        const recientes = byId('rondo-kpi-recientes');
        if (recientes) {
            const items = APP.historial.slice(0, 6);
            rxSetHtmlKeepScroll(recientes, items.length
                ? items.slice(0, 4).map((a) => (
                    '<div class="alerta" style="border-left:3px solid ' + (COL[a.sev] || '#555') + '">' +
                    '<span class="ico rondo-usym" style="color:' + (COL[a.sev] || '#777') + '">' + (SEV_UIS[a.sev] || UIS.info) + '</span>' +
                    '<div class="cuerpo"><b>' + esc(a.titulo) + '</b>' +
                    (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') + '</div>' +
                    '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                    '</div>'
                )).join('')
                : '<div class="rondo-dash-empty">' + LANG.recientesNone + '</div>');
        }
        // v6.0.13: ranking de unidades por avisos de hoy (clic -> filtra Avisos).
        const topEl = byId('rondo-dash-top');
        if (topEl) {
            const hoyConEco = APP.historial.filter((a) => a.ts >= inicio.getTime() && a.eco);
            const cuenta = new Map();
            hoyConEco.forEach((a) => { cuenta.set(a.eco, (cuenta.get(a.eco) || 0) + 1); });
            const top = Array.from(cuenta.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const nTop = byId('rondo-top-n');
            if (nTop) nTop.textContent = cuenta.size;
            const max = top.length ? top[0][1] : 1;
            rxSetHtmlKeepScroll(topEl, top.length
                ? top.map(([eco, n]) => (
                    '<div class="rondo-top-item" data-eco="' + esc(eco) + '" title="Ver los avisos de ' + esc(eco) + '">' +
                    '<span class="eco rondo-usym">' + UIS.warn + '</span>' +
                    '<div class="body"><b>' + esc(eco) + '</b>' +
                    '<div class="ruta-bar"><div class="ruta-bar-fill" style="width:' + Math.round((n / Math.max(1, max)) * 100) + '%"></div></div></div>' +
                    '<span class="pct">' + n + '</span>' +
                    '</div>'
                )).join('')
                : '<div class="rondo-dash-empty">Sin avisos hoy.</div>');
        }
        paintSparkline();
    }
    function paintSalud(on, off, total, mov, det) {
        const pctEl = byId('rondo-salud-pct');
        const subEl = byId('rondo-salud-sub');
        const tagEl = byId('rondo-salud-tag');
        if (!pctEl) return;
        const pct = total ? Math.round((on / total) * 100) : null;
        pctEl.textContent = (pct == null) ? '\u2014' : pct + '%';
        let cls = 'ok', tag = 'OK';
        if (pct == null) { cls = ''; tag = '\u2014'; }
        else if (pct < 50) { cls = 'bad'; tag = 'BAJA'; }
        else if (pct < 85) { cls = 'warn'; tag = 'ATENCION'; }
        pctEl.className = 'rondo-salud-pct ' + cls;
        if (tagEl) { tagEl.className = 'rondo-salud-tag ' + cls; tagEl.textContent = tag; }
        const card = byId('rondo-salud');
        if (card) { card.classList.toggle('warn', cls === 'warn'); card.classList.toggle('bad', cls === 'bad'); }
        if (subEl) {
            const resumen = total
                ? '<b>' + on + '</b> en linea \u00b7 <b>' + off + '</b> sin senal \u00b7 <b>' + det + '</b> detenidas \u00b7 <b>' + mov + '</b> en mov.'
                : 'Sin unidades vigiladas (abre la lista para anadir).';
            subEl.innerHTML = resumen;
        }
    }
    function paintZonasDash() {
        const cont = byId('rondo-dash-zonas');
        const countEl = byId('rondo-zonas-n');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch);
        const items = [];
        if (APP.zonas && APP.zonas.length) {
            for (let i = 0; i < APP.zonas.length; i++) {
                const z = APP.zonas[i];
                const dentro = watched.filter((u) => {
                    const st = unitState(u); return st.online && inZone(st.lat, st.lon, z);
                });
                if (dentro.length) {
                    const ecos = dentro.map((u) => parseUnitName(u).eco || parseUnitName(u).placa).filter(Boolean);
                    items.push({ z, dentro, ecos });
                }
            }
        }
        items.sort((a, b) => b.dentro.length - a.dentro.length);
        const top = items.slice(0, 6);
        if (countEl) countEl.textContent = items.length;
        rxSetHtmlKeepScroll(cont, top.length
            ? top.map((it) =>
                '<div class="rondo-geo-dash" data-zona="' + esc(it.z.n || '') + '">' +
                '<span class="ico rondo-usym">' + UIS.zone + '</span>' +
                '<div class="body">' +
                '<b>' + esc(it.z.n || ('Zona ' + it.z.id)) + '</b>' +
                '<span>' + esc(it.ecos.slice(0, 6).join(' \u00b7 ')) + (it.ecos.length > 6 ? ' \u2026' : '') + '</span>' +
                '</div>' +
                '<span class="pct">' + it.dentro.length + '</span>' +
                '</div>'
              ).join('')
            : '<div class="rondo-dash-empty">Ninguna geocerca con unidades dentro (activa <b>Cargar geocercas</b> en Ajustes).</div>');
    }
    function paintRutasDash() {
        const cont = byId('rondo-dash-rutas');
        const countEl = byId('rondo-rutas-n');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch);
        const items = [];
        for (let i = 0; i < watched.length; i++) {
            const u = watched[i];
            const info = parseUnitName(u);
            const st = unitState(u);
            const destino = watchDest(info);
            const ruta = rutaDe(info);
            if (!destino) continue;
            const er = estadoRuta(info, st);
            if (er.estado === 'SIN POSICION') continue;
            const pct = er.snap ? Math.round(er.snap.progreso * 100) : null;
            const etaSeg = er.snap ? calcularETA(er.snap, er.ruta, st.vel) : null;
            items.push({ eco: info.eco || info.placa || String(info.id), estado: er.estado, pct, etaSeg, destino });
        }
        items.sort((a, b) => (b.pct || 0) - (a.pct || 0));
        const top = items.slice(0, 6);
        if (countEl) countEl.textContent = items.length;
        // v6.0.13: KPI "En ruta" (unidades con ruta en curso o desviadas).
        const enCurso = items.filter((it) => it.estado === 'EN RUTA' || it.estado === 'DESV').length;
        const kvR = byId('rondo-kpi-ruta');
        if (kvR) kvR.textContent = enCurso;
        const kvRp = byId('rondo-kpi-ruta-pct');
        if (kvRp) kvRp.textContent = items.length ? items.length + ' activas' : '';
        rxSetHtmlKeepScroll(cont, top.length
            ? top.map((it) => {
                const etaTxt = (it.etaSeg != null && isFinite(it.etaSeg)) ? (Math.round(it.etaSeg / 60) + ' min') : '\u2014';
                return '<div class="rondo-ruta-dash" data-eco="' + esc(it.eco) + '">' +
                    '<span class="ico rondo-usym">' + UIS.route + '</span>' +
                    '<div class="body">' +
                    '<b>' + esc(it.eco) + ' \u00b7 ' + esc(it.estado) + '</b>' +
                    '<span>' + esc(it.destino || '') + '</span>' +
                    (it.pct != null ? '<div class="ruta-bar"><div class="ruta-bar-fill" style="width:' + it.pct + '%"></div></div>' : '') +
                    '</div>' +
                    '<span class="pct">' + (it.pct != null ? (it.pct + '%') : '\u2014') + '</span>' +
                    '</div>';
              }).join('')
            : '<div class="rondo-dash-empty">Sin rutas activas (define destinos desde la lista vigilada).</div>');
    }
        function paintSparkline() {
        const svg = byId('rondo-spark');
        if (!svg) { return; }
        const on = (APP.kpi.online || []).slice(-60);
        const off = (APP.kpi.offline || []).slice(-60);
        if (on.length < 2) {
            setHtml(svg, '<text x="100" y="22" text-anchor="middle" fill="currentColor" font-size="11">Recolectando datos...</text>');
            return;
        }
        const todos = on.concat(off);
        const max = Math.max.apply(null, todos);
        const min = Math.min.apply(null, todos);
        const h = 32, w = 200;
        const dx = w / (on.length - 1);
        const linea = (data) => data.map((v, i) => {
            const x = i * dx;
            const y = h - ((v - min) / Math.max(1, max - min)) * h;
            return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
        const puntosOn = linea(on);
        const areaOn = puntosOn + ' L' + w + ',' + h + ' L0,' + h + ' Z';
        const puntosOff = off.length === on.length ? linea(off) : '';
        setHtml(svg,
            '<path d="' + areaOn + '" fill="var(--rondo-accent-2)" fill-opacity="0.18" stroke="none"></path>' +
            '<path d="' + puntosOn + '" stroke="var(--rondo-accent-2)" stroke-width="1.6"></path>' +
            (puntosOff ? '<path d="' + puntosOff + '" stroke="var(--rondo-fg-mute)" stroke-width="1" stroke-dasharray="3 3" fill="none"></path>' : '') +
            '<text x="6" y="14" fill="var(--rondo-fg-dim)" font-size="10">ONLINE ' + on[on.length - 1] + ' · OFFLINE ' + (off[off.length - 1] != null ? off[off.length - 1] : '-') + '</text>');
    }
    // Valor de ordenamiento por columna de la tabla de unidades.
    function valorOrden(x, col) {
        switch (col) {
            case 'eco': return x.info.eco || '';
            case 'placa': return x.info.placa || '';
            case 'estado': return x.st.estado || '';
            case 'edad': return x.st.edadMin == null ? Infinity : x.st.edadMin;
            case 'vel': return x.st.vel || 0;
            case 'zona': return (x.zona != null) ? x.zona : zoneAt(x.st.lat, x.st.lon);
            case 'odo': { const o = odometroDe(x.info); return o ? o.m : 0; }
            case 'ruta': {
                // Orden por estado de ruta: primero "LLEGO", luego "DESV",
                // "EN RUTA", "SIN RUTA" y al final "SIN POSICION".
                const er = estadoRuta(x.info, x.st);
                const peso = { 'LLEGO': 0, 'DESV': 1, 'EN RUTA': 2, 'SIN RUTA': 3, 'SIN POSICION': 4 };
                return (peso[er.estado] != null) ? peso[er.estado] : 5;
            }
            default: return '';
        }
    }
    function cmpOrd(a, b) {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }
    function rutaClasePill(estado) {
        switch (estado) {
            case 'LLEGO': return 'ok';
            case 'DESV': return 'warn';
            case 'EN RUTA': return 'on';
            case 'SIN POSICION': return 'off';
            default: return 'mute';
        }
    }
    function actualizarCabecerasOrden() {
        const sel = byId('rondo-uni-orden');
        if (sel && sel.value !== (APP.sortCol || '')) sel.value = APP.sortCol || '';
        const dir = byId('rondo-uni-dir');
        if (dir) {
            const icon = dir.querySelector('.rondo-usym');
            if (icon) icon.innerHTML = APP.sortDir === 'desc' ? UIS.down : UIS.up;
            dir.title = APP.sortDir === 'desc' ? 'Orden descendente (clic para ascendente)' : 'Orden ascendente (clic para descendente)';
        }
    }
    // Render incremental de listas: reutiliza los nodos existentes y actualiza
    // sus campos EN EL SITIO (sin reescribir innerHTML), de modo que no se
    // reinician animaciones/transiciones ni se pierde el scroll ni el foco.
    function renderLista(cont, items, claveDe, crear, actualizar) {
        const mapa = cont._rondoItems || (cont._rondoItems = new Map());
        invalidarHtml(cont.id);
        cont._rondoVacio = null;
        const nodos = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const k = claveDe(it);
            let n = mapa.get(k);
            if (!n) { n = crear(it); mapa.set(k, n); }
            actualizar(n, it);
            nodos.push(n);
        }
        const vigentes = new Set(items.map(claveDe));
        mapa.forEach((n, k) => {
            if (vigentes.has(k)) return;
            if (n.parentNode) n.parentNode.removeChild(n);
            mapa.delete(k);
        });
        const setNodos = new Set(nodos);
        Array.prototype.slice.call(cont.children).forEach((ch) => {
            if (!setNodos.has(ch)) cont.removeChild(ch);
        });
        let igual = cont.children.length === nodos.length;
        if (igual) {
            for (let i = 0; i < nodos.length; i++) {
                if (cont.children[i] !== nodos[i]) { igual = false; break; }
            }
        }
        if (!igual) {
            for (let i = 0; i < nodos.length; i++) cont.appendChild(nodos[i]);
        }
    }
    // Crea el esqueleto de una tarjeta de unidad y cachea las referencias a
    // los nodos que cambian con frecuencia.
    function unidCardNode() {
        const n = document.createElement('div');
        n.className = 'rondo-uni-card fila';
        n.innerHTML =
            '<label class="u-check" title="Seleccionar la unidad">' +
            '<input type="checkbox" class="rondo-sel">' +
            '</label>' +
            '<div class="u-body">' +
            '<div class="u-head">' +
            '<span class="u-eco"><span class="rondo-usym u-eco-watch" title="En lista vigilada" style="display:none">' + UIS.watch + '</span><span class="u-eco-txt"></span></span>' +
            '<span class="u-placa"></span>' +
            '<span class="rondo-pill u-estado"><span class="rondo-usym u-estado-ico"></span><span class="u-estado-txt"></span></span>' +
            '<span class="u-vel"><span class="u-vel-num"></span><small class="u-vel-lim" style="display:none"></small><em>km/h</em></span>' +
            '<span class="u-quick">' +
            '<button class="mini u-open" title="Abrir ventana de la unidad"><span class="rondo-usym">' + UIS.panel + '</span></button>' +
            '<button class="mini u-route" title="Paradas y ruta"><span class="rondo-usym">' + UIS.route + '</span></button>' +
            '<button class="mini u-map" title="Ver en OpenStreetMap"><span class="rondo-usym">' + UIS.pin + '</span></button>' +
            '<button class="mini u-watch" title="Anadir a la lista vigilada"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
            '<button class="mini u-sil rondo-sil" title="Silenciar unidad"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
            '</span>' +
            '</div>' +
            '<div class="u-meta">' +
            '<span class="u-tag"><span class="rondo-usym">' + UIS.clock + '</span><span class="u-v-edad"></span></span>' +
            '<span class="u-tag u-t-zona" style="display:none"><span class="rondo-usym">' + UIS.zone + '</span><span class="u-v-zona"></span></span>' +
            '<span class="u-tag u-t-coords" style="display:none"><span class="rondo-usym">' + UIS.info + '</span><span class="u-v-coords"></span></span>' +
            '<span class="u-tag"><span class="rondo-usym">' + UIS.pin + '</span><span class="u-v-km"></span></span>' +
            '</div>' +
            '<div class="u-ruta">' +
            '<span class="rondo-pill u-ruta-pill">SIN RUTA</span>' +
            '<div class="u-ruta-bar" style="display:none"><div class="u-ruta-fill" style="width:0%"></div></div>' +
            '<span class="u-ruta-meta" style="display:none"></span>' +
            '</div>' +
            '</div>';
        const q = (s) => n.querySelector(s);
        n._ref = {
            check: q('.rondo-sel'),
            ecoWatch: q('.u-eco-watch'), ecoTxt: q('.u-eco-txt'), placa: q('.u-placa'),
            estado: q('.u-estado'), estadoIco: q('.u-estado-ico'), estadoTxt: q('.u-estado-txt'),
            vel: q('.u-vel'), velNum: q('.u-vel-num'), velLim: q('.u-vel-lim'),
            btnWatch: q('.u-watch'), btnSil: q('.u-sil'), silIco: q('.u-sil .rondo-usym'),
            tZona: q('.u-t-zona'), vZona: q('.u-v-zona'),
            tCoords: q('.u-t-coords'), vCoords: q('.u-v-coords'),
            vEdad: q('.u-v-edad'), vKm: q('.u-v-km'),
            rutaPill: q('.u-ruta-pill'), rutaBar: q('.u-ruta-bar'),
            rutaFill: q('.u-ruta-fill'), rutaMeta: q('.u-ruta-meta')
        };
        return n;
    }
    // Actualiza los campos de una tarjeta de unidad sin recrear el DOM.
    function unidCardUpdate(n, x) {
        const info = x.info, st = x.st, zona = x.zona;
        const r = n._ref;
        const eco = info.eco || '';
        const clave = info.clave;
        const sel = APP.seleccion.has(info.eco) || APP.seleccion.has(info.placa);
        const sil = APP.dismissed.has(clave);
        const vig = isWatched(info);
        const clase = st.estado === 'offline' ? 'off' : (st.estado === 'detenida' ? 'det' : 'on');
        const nuevaClase = 'rondo-uni-card fila ' + clase + (sel ? ' sel-row' : '');
        if (n.className !== nuevaClase) n.className = nuevaClase;
        n.dataset.eco = eco;
        if (r.check.dataset.eco !== eco) r.check.dataset.eco = eco;
        if (r.check.dataset.placa !== (info.placa || '')) r.check.dataset.placa = info.placa || '';
        if (r.check.checked !== sel) r.check.checked = sel;
        if (n._estadoKey !== clase) {
            n._estadoKey = clase;
            r.estadoIco.innerHTML = st.estado === 'offline' ? UIS.offline : (st.estado === 'detenida' ? UIS.stopped : UIS.moving);
        }
        r.estado.className = 'rondo-pill u-estado ' + clase;
        const txt = st.estado === 'offline' ? 'sin señal' : (st.estado === 'detenida' ? 'detenida' : 'moviendo');
        if (r.estadoTxt.textContent !== txt) r.estadoTxt.textContent = txt;
        if (r.ecoWatch.style.display !== (vig ? '' : 'none')) r.ecoWatch.style.display = vig ? '' : 'none';
        const ecoTxt = eco || '-';
        if (r.ecoTxt.textContent !== ecoTxt) r.ecoTxt.textContent = ecoTxt;
        const placa = info.placa || '';
        if (r.placa.textContent !== placa) r.placa.textContent = placa;
        const lim = limiteDe(info);
        const excede = st.online && st.vel > lim;
        const velTxt = String(Math.round(st.vel));
        if (r.velNum.textContent !== velTxt) r.velNum.textContent = velTxt;
        const limTxt = (lim !== APP.config.velMax) ? '/' + lim : '';
        if (r.velLim.textContent !== limTxt) r.velLim.textContent = limTxt;
        if (r.velLim.style.display !== (limTxt ? '' : 'none')) r.velLim.style.display = limTxt ? '' : 'none';
        r.vel.classList.toggle('excede', excede);
        const velTitle = (lim !== APP.config.velMax ? 'límite de la unidad: ' + lim + ' km/h' : 'límite global: ' + lim + ' km/h');
        if (r.vel.title !== velTitle) r.vel.title = velTitle;
        if (n._vig !== vig) {
            n._vig = vig;
            r.btnWatch.classList.toggle('on', vig);
            r.btnWatch.title = vig ? 'Quitar de la lista vigilada' : 'Anadir a la lista vigilada';
        }
        if (n._sil !== sil) {
            n._sil = sil;
            r.silIco.innerHTML = sil ? UIS.mute : UIS.alertas;
            r.btnSil.classList.toggle('on', sil);
            r.btnSil.title = sil ? 'Reactivar avisos' : 'Silenciar unidad';
        }
        const edad = ageText(st.edadMin);
        if (r.vEdad.textContent !== edad) r.vEdad.textContent = edad;
        const zonaTxt = zona || '';
        if (r.vZona.textContent !== zonaTxt) r.vZona.textContent = zonaTxt;
        if (r.tZona.style.display !== (zonaTxt ? '' : 'none')) r.tZona.style.display = zonaTxt ? '' : 'none';
        const coords = (APP.config.mostrarCoords && st.lat != null) ? st.lat.toFixed(3) + ', ' + st.lon.toFixed(3) : '';
        if (r.vCoords.textContent !== coords) r.vCoords.textContent = coords;
        if (r.tCoords.style.display !== (coords ? '' : 'none')) r.tCoords.style.display = coords ? '' : 'none';
        const odo = odometroDe(info);
        const kmTxt = (odo ? Math.round(odo.m / 100) / 10 : 0).toFixed(1) + ' km';
        if (r.vKm.textContent !== kmTxt) r.vKm.textContent = kmTxt;
        // Ruta: pill, barra de progreso (con su transicion) y ETA.
        const er = estadoRuta(info, st);
        if (r.rutaPill.textContent !== er.estado) r.rutaPill.textContent = er.estado;
        r.rutaPill.className = 'rondo-pill u-ruta-pill ' + rutaClasePill(er.estado);
        if (er.snap) {
            const pct = Math.round(er.snap.progreso * 100);
            const etaSeg = calcularETA(er.snap, er.ruta, velSuavizada(info, st));
            const etaTxt = etaSeg != null ? Math.round(etaSeg / 60) + ' min' : '-';
            if (r.rutaBar.style.display) r.rutaBar.style.display = '';
            r.rutaFill.style.width = pct + '%';
            const meta = pct + '% · ' + etaTxt;
            if (r.rutaMeta.textContent !== meta) r.rutaMeta.textContent = meta;
            if (r.rutaMeta.style.display) r.rutaMeta.style.display = '';
        } else if (watchDest(info)) {
            if (r.rutaBar.style.display !== 'none') r.rutaBar.style.display = 'none';
            if (r.rutaMeta.textContent !== 'trazando...') r.rutaMeta.textContent = 'trazando...';
            if (r.rutaMeta.style.display) r.rutaMeta.style.display = '';
        } else {
            if (r.rutaBar.style.display !== 'none') r.rutaBar.style.display = 'none';
            if (r.rutaMeta.style.display !== 'none') r.rutaMeta.style.display = 'none';
        }
    }
    function paintTabla() {
        const body = byId('rondo-body');
        if (!body) return;
        const filtro = (APP.filtro || '').toLowerCase();
        const est = APP.filtEstado || 'todas';
        const lista = APP.unidades
            .filter(shouldWatch)
            .map((u) => {
                const info = parseUnitName(u);
                const st = unitState(u);
                // La zona se calcula una sola vez por unidad y se reutiliza en
                // el filtro, la tarjeta y el orden.
                return { info: info, st: st, zona: zoneAt(st.lat, st.lon) };
            })
            .filter((x) => {
                if (est === 'moviendo' && x.st.estado !== 'moviendo') return false;
                if (est === 'detenida' && x.st.estado !== 'detenida') return false;
                if (est === 'offline' && x.st.estado !== 'offline') return false;
                if (est === 'vigilada' && !isWatched(x.info)) return false;
                if (est === 'silenciada' && !APP.dismissed.has(x.info.clave)) return false;
                if (!filtro) return true;
                return (x.info.eco + ' ' + x.info.placa + ' ' + x.info.nombre + ' ' + x.zona).toLowerCase().indexOf(filtro) >= 0;
            });
        if (APP.sortCol) {
            const col = APP.sortCol;
            lista.forEach((x) => { x._ord = valorOrden(x, col); });
        }
        lista.sort((a, b) => {
            if (APP.sortCol) {
                const r = cmpOrd(a._ord, b._ord);
                if (r !== 0) return APP.sortDir === 'desc' ? -r : r;
            } else {
                const peso = (e) => e === 'offline' ? 0 : (e === 'detenida' ? 1 : 2);
                const d = peso(a.st.estado) - peso(b.st.estado);
                if (d !== 0) return d;
            }
            return a.info.eco.localeCompare(b.info.eco, undefined, { numeric: true });
        });
        if (!lista.length) {
            body._rondoItems = new Map();
            const vacio = emptyState(UIS.panel, LANG.sinUni,
                'Activa <b>Monitorear todas</b> en Ajustes, o abre la lista y agrega tus economicos.',
                '<button class="mini rondo-vacio-acc" data-acc="abrir-lista"><span class="rondo-usym">' + UIS.gear + '</span> Abrir lista de unidades</button>');
            const html = '<div class="rondo-uni-empty">' + vacio + '</div>';
            // Solo se escribe si cambio: antes se reescribia cada segundo y el
            // estado vacio tambien parpadeaba.
            if (body._rondoVacio !== html) {
                body._rondoVacio = html;
                invalidarHtml(body.id);
                body.innerHTML = html;
            }
        } else {
            renderLista(body, lista, (x) => x.info.clave || x.info.eco, unidCardNode, unidCardUpdate);
        }
        const aviso = byId('rondo-sel-vacio');
        if (aviso) {
            const noHaySel = (!APP.config.watchAll && APP.seleccion.size === 0 && lista.length > 0);
            aviso.style.display = noHaySel ? 'block' : 'none';
        }
        byId('rondo-upd').innerHTML = '<span class="rondo-usym sm">' + UIS.clock + '</span> ' + new Date().toLocaleTimeString();
        actualizarCabecerasOrden();
        paintInfo();
    }
    function paintAlertas() {
        const cont = byId('rondo-lista-alertas');
        if (!cont) return;
        const f = (APP.filtro || '').toLowerCase();
        const lista = APP.historial.filter((a) => {
            if (APP.filtSever && APP.filtSever !== 'todas' && a.sev !== APP.filtSever) return false;
            if (!f) return true;
            return (a.titulo + ' ' + (a.detalle || '') + ' ' + (a.eco || '')).toLowerCase().indexOf(f) >= 0;
        });
        // Estructura por alerta para poder actualizar la IA sin re-pintar
        // toda la lista (delegamos el click abajo).
        const iah = !!(APP.config && APP.config.iaHabilitada && APP.config.iaApiKey);
        // v5.14: muestra/oculta el boton "Analizar lote" segun si la IA
        // esta activa y hay avisos en el historial.
        paintIABatchBtn();
        setHtml(cont, lista.length
            ? lista.map((a) => (
                '<div class="alerta" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" style="border-left:4px solid ' + (COL[a.sev] || '#555') + '">' +
                '<span class="ico rondo-usym" style="color:' + (COL[a.sev] || '#777') + '">' + (UIS[a.icono] || SEV_UIS[a.sev] || UIS.info) + '</span>' +
                '<div class="cuerpo">' +
                '<b>' + esc(a.titulo) + '</b>' +
                (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') +
                '<div class="meta"><span class="regla">' + esc(a.regla) + '</span>' +
                '<span>' + new Date(a.ts).toLocaleString().slice(0, 16) + '</span></div>' +
                '<div class="rondo-ia-verdict" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" style="display:none"></div>' +
                '</div>' +
                '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                (iah ? '<button type="button" class="mini rondo-ia-btn" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" title="Analizar con IA (DeepSeek / NVIDIA / Kimi)"><span class="rondo-usym sm">' + UIS.robot + '</span> IA</button>' : '') +
                '</div>'
            )).join('')
            : emptyState(UIS.alertas, 'Sin avisos registrados',
                'Aqui se acumula el historial de alertas. Cuando una regla se dispare, aparecera en esta lista.'));
        paintSeverity();
    }

    // Lanza el analisis IA para un aviso concreto. Re-pinta solo el bloque
    // del veredicto dentro de la tarjeta correspondiente.
    async function aiAnalizarAviso(clave, ts) {
        if (!APP.config.iaHabilitada || !APP.config.iaApiKey) {
            adviceWarn('IA deshabilitada', 'Activala y mete tu API key en Ajustes > IA.');
            return;
        }
        const item = APP.historial.find((h) => h.clave === clave && h.ts === +ts);
        if (!item) return;
        const verEl = document.querySelector('.rondo-ia-verdict[data-clave="' + cssEscape(clave) + '"][data-ts="' + ts + '"]');
        const btn = document.querySelector('.rondo-ia-btn[data-clave="' + cssEscape(clave) + '"][data-ts="' + ts + '"]');
        if (verEl) verEl.innerHTML = '<span class="rondo-ia-loading">Analizando con IA... (' + (IA_PROVEEDORES[APP.config.iaProveedor].nombre) + ')</span>';
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        const res = await aiAnalizar(item);
        if (!verEl) return;
        if (res.error) {
            verEl.style.display = 'block';
            verEl.innerHTML = '<div class="rondo-ia-err"><b>Error IA:</b> ' + esc(res.error) + '</div>';
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="rondo-usym sm">' + UIS.refresh + '</span> Reintentar'; }
            return;
        }
        const v = String(res.veredicto || '?');
        const colores = { falso_positivo: '#2e7d32', normal: '#1565c0', sospechoso: '#e65100', critico: '#b71c1c' };
        const color = colores[v] || '#555';
        const resumen = res.resumen ? esc(res.resumen) : '(sin resumen)';
        const ev = Array.isArray(res.evidencia) ? res.evidencia : [];
        const rec = res.recomendacion ? '<div class="rondo-ia-rec"><b>Recomendacion:</b> ' + esc(res.recomendacion) + '</div>' : '';
        const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
        verEl.style.display = 'block';
        verEl.style.borderLeft = '3px solid ' + color;
        verEl.style.paddingLeft = '6px';
        verEl.innerHTML =
            '<div class="rondo-ia-head"><b style="color:' + color + '">' + v.toUpperCase().replace('_', ' ') + '</b>' +
            ' <span style="color:var(--rondo-fg-dim);font-size:11px"> · ' + esc(provNombre) +
            ' · confianza ' + (res.confianza != null ? res.confianza : '?') + '</span></div>' +
            '<div class="rondo-ia-summary">' + resumen + '</div>' +
            (ev.length ? '<ul class="rondo-ia-ev">' + ev.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '') +
            rec;
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="rondo-usym sm">' + UIS.refresh + '</span> Reanalizar'; }
    }
    function paintSeverity() {
        document.querySelectorAll('#rondo-filtroseveridad span[data-sev]').forEach((s) => {
            s.classList.toggle('activo', s.dataset.sev === (APP.filtSever || 'todas'));
        });
    }
    /* ====================== GEOCERCAS: ANALISIS Y EXPORT (v5.15) ====================== */
    function zonaRol(z) {
        const n = (z && z.n) || '';
        if (isBase(n)) return 'base';
        if (esZonaCarga(n)) return 'carga';
        return 'normal';
    }
    function _zonaPuntos(z) {
        let p = z && z.p;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
        return Array.isArray(p) ? p : null;
    }
    function _zonaRadio(z) {
        const r = (z && (z.w != null ? z.w : z.r));
        const n = +r;
        return Number.isFinite(n) && n > 0 ? n : 0;
    }
    function _zonaEsCirculo(z, pts) {
        if (!z) return false;
        if (z.t === 3) return true;
        const minimoPts = (z.t === 1) ? 2 : 3;
        if (Array.isArray(pts) && pts.length >= minimoPts) return false;
        const b = z.b;
        return !!(b && b.cen_x != null && b.cen_y != null && _zonaRadio(z) > 0);
    }
    function zonaAreaM2(z) {
        if (!z) return 0;
        const pts = _zonaPuntos(z);
        const c = centroDeZona(z) || { lat: 0, lon: 0 };
        const mx = 111320 * Math.cos(rad(c.lat)), my = 110540;
        if (_zonaEsCirculo(z, pts)) {
            const r = _zonaRadio(z);
            return Math.PI * r * r;
        }
        const xy = (a) => {
            const la = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : null);
            const lo = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : null);
            return (la == null || lo == null || isNaN(la) || isNaN(lo)) ? null : [lo * mx, la * my];
        };
        if (Array.isArray(pts) && pts.length >= 2) {
            // Linea (t=1) o polilinea de 2 puntos: longitud x ancho.
            if (z.t === 1 || (z.t !== 2 && pts.length === 2)) {
                let len = 0;
                for (let i = 1; i < pts.length; i++) {
                    const a = xy(pts[i - 1]), b2 = xy(pts[i]);
                    if (!a || !b2) continue;
                    len += Math.hypot(b2[0] - a[0], b2[1] - a[1]);
                }
                let ancho = _zonaRadio(z);
                if (!ancho) {
                    ancho = pts.reduce((m, a) => Math.max(m, +(a && a.r) || 0), 0);
                }
                return len * ancho * 2; // el radio/medio-ancho se cuenta a ambos lados
            }
            // Poligono: formula del area (shoelace) en metros.
            if (pts.length >= 3) {
                let a2 = 0;
                let prev = xy(pts[pts.length - 1]);
                for (let i = 0; i < pts.length; i++) {
                    const cur = xy(pts[i]);
                    if (!cur || !prev) { prev = cur; continue; }
                    a2 += prev[0] * cur[1] - cur[0] * prev[1];
                    prev = cur;
                }
                return Math.abs(a2 / 2);
            }
        }
        if (z.b && z.b.min_x != null && z.b.max_x != null && z.b.min_y != null && z.b.max_y != null) {
            const w = (z.b.max_x - z.b.min_x) * mx, h = (z.b.max_y - z.b.min_y) * my;
            return Math.abs(w * h);
        }
        return 0;
    }
    function zonaGeometry(z) {
        const pts = _zonaPuntos(z);
        const c = centroDeZona(z);
        if (_zonaEsCirculo(z, pts)) return c ? { type: 'Point', coordinates: [c.lon, c.lat] } : null;
        if (Array.isArray(pts) && pts.length >= 3) {
            // Descarta puntos sin coordenadas validas: un GeoJSON con NaN es
            // invalido y algunos visores lo rechazan entero.
            const ring = pts.map((a) => {
                const la = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : NaN);
                const lo = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : NaN);
                return [lo, la];
            }).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
            if (ring.length >= 3) {
                if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
                return { type: 'Polygon', coordinates: [ring] };
            }
        }
        if (z.b && z.b.min_x != null && z.b.max_x != null && z.b.min_y != null && z.b.max_y != null) {
            const ring = [
                [z.b.min_x, z.b.min_y], [z.b.max_x, z.b.min_y], [z.b.max_x, z.b.max_y],
                [z.b.min_x, z.b.max_y], [z.b.min_x, z.b.min_y]
            ];
            return { type: 'Polygon', coordinates: [ring] };
        }
        return c ? { type: 'Point', coordinates: [c.lon, c.lat] } : null;
    }
    function zonasStats(unidades) {
        const zonas = APP.zonas || [];
        let ocupadas = 0, base = 0, carga = 0, areaM2 = 0;
        for (let i = 0; i < zonas.length; i++) {
            const z = zonas[i];
            const rol = zonaRol(z);
            if (rol === 'base') base++;
            else if (rol === 'carga') carga++;
            areaM2 += zonaAreaM2(z);
            let occ = false;
            for (let k = 0; k < unidades.length; k++) {
                const u = unidades[k];
                if (u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)) { occ = true; break; }
            }
            if (occ) ocupadas++;
        }
        return { total: zonas.length, ocupadas, base, carga, areaM2 };
    }
    function geocercasSubsetVisible() {
        // Devuelve las geocercas segun el filtro/rol actuales (para export).
        const f = (APP.geoFiltro || '').toLowerCase();
        const rol = APP.geoRol || 'todas';
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        return (APP.zonas || []).filter((z) => {
            const r = zonaRol(z);
            if (rol !== 'todas' && rol !== r && !(rol === 'ocupadas' && unidades.some((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)))) return false;
            if (f) {
                const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
                if (!((z.n || '').toLowerCase().indexOf(f) >= 0 || ecos.some((e) => (e || '').toLowerCase().indexOf(f) >= 0))) return false;
            }
            return true;
        });
    }
    function exportarGeocercasCSV() {
        const items = geocercasSubsetVisible();
        if (!items.length) { adviceWarn('Sin geocercas', 'Nada que exportar con los filtros actuales'); return; }
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const filas = [['nombre', 'origen', 'guardado', 'rol', 'area_km2', 'lat', 'lon', 'unidades']];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const c = centroDeZona(z) || {};
            const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
            // v6.14: origen explicito, para no confundir una geocerca dibujada
            // en Rondo con una de la plataforma al abrir el CSV.
            const org = glocOrigen(z);
            filas.push([z.n || ('Zona ' + z.id), org.corto, (org.id === 'app' ? (org.guardado ? 'navegador' : 'sesion') : ''),
                zonaRol(z), (zonaAreaM2(z) / 1e6).toFixed(3),
                c.lat == null ? '' : c.lat, c.lon == null ? '' : c.lon, ecos.join(' ')]);
        }
        const csv = filas.map((r) => r.map(rxCsvCelda).join(',')).join('\n');
        const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })) });
        a.download = 'rondo_geocercas_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('Geocercas exportadas', items.length + ' zonas');
    }
    function exportarGeocercasGeoJSON() {
        const items = geocercasSubsetVisible();
        if (!items.length) { adviceWarn('Sin geocercas', 'Nada que exportar con los filtros actuales'); return; }
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const features = items.map((z) => {
            const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
            const geom = zonaGeometry(z);
            return {
                type: 'Feature',
                properties: (function () {
                    const org = glocOrigen(z);
                    return {
                        nombre: z.n || ('Zona ' + z.id), rol: zonaRol(z),
                        area_km2: +(zonaAreaM2(z) / 1e6).toFixed(3), unidades: ecos,
                        origen: org.id === 'app' ? 'rondo-app' : 'plataforma',
                        guardado: (org.id === 'app') ? (org.guardado ? 'navegador' : 'sesion') : null
                    };
                })(),
                geometry: geom || { type: 'Point', coordinates: [0, 0] }
            };
        });
        descargarJSON({ type: 'FeatureCollection', features }, 'rondo_geocercas_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Geocercas exportadas', items.length + ' zonas');
    }
    // Anade una geocerca como parada del plan de una unidad vigilada.
    function elegirUnidadParaGeocerca(z) {
        if (!z) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u)).filter((i) => i.eco || i.clave);
        if (!vigiladas.length) {
            adviceWarn('Sin unidades vigiladas', 'Vigila una unidad para asignarle paradas. Puedes hacerlo en Automatizar Unidades.');
            return;
        }
        let elegido = vigiladas[0].eco || vigiladas[0].clave;
        const opciones = vigiladas.map((i) => {
            const eco = i.eco || i.clave;
            return '<option value="' + esc(eco) + '">' + esc(eco) + (i.placa ? ' \u00b7 ' + esc(i.placa) : '') + '</option>';
        }).join('');
        abrirDialogo({
            icon: UIS.route,
            titulo: 'Usar geocerca como parada',
            okText: 'Anadir',
            html: '<p>Anade <b>' + esc(z.n || ('Zona ' + z.id)) + '</b> como parada del plan de:</p>' +
                '<select id="rondo-geo-unit" class="filtro" style="width:100%">' + opciones + '</select>',
            onOpen: (el) => {
                const sel = el.querySelector('#rondo-geo-unit');
                if (sel) { elegido = sel.value; sel.addEventListener('change', () => { elegido = sel.value; }); }
            },
            onOk: () => {
                const eco = elegido;
                const it = unitByEco(eco);
                const clave = it ? it.info.clave : eco;
                const plan = (it ? planDe(it.info) : null) || { modo: 'secuencial', circuito: false, paradas: [] };
                plan.paradas = (plan.paradas || []).concat([nuevaParada('geocerca', z.n || ('Zona ' + z.id), centroDeZona(z))]);
                APP.planes[clave] = plan;
                APP.watchMap[eco] = planATexto(plan);
                if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
                guardarPlanes(); guardarLista(); guardarOrden();
                adviceOk('Parada anadida', (z.n || '') + ' \u2192 ' + eco);
                if (APP.config.autoRuta) planearRuta(eco, plan, null, (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
            }
        });
    }

    function paintGeocercas() {
        paintGeoAlertas();
        const body = byId('rondo-body-zonas');
        const countEl = byId('rondo-geo-count');
        const zonas = APP.zonas || [];
        const total = zonas.length;
        if (countEl) countEl.textContent = total;
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const stats = zonasStats(unidades);
        const setK = (id, v) => { const e = byId(id); if (e) e.textContent = v; };
        setK('rondo-geo-kpi-total', stats.total);
        setK('rondo-geo-kpi-ocupadas', stats.ocupadas);
        setK('rondo-geo-kpi-base', stats.base);
        setK('rondo-geo-kpi-carga', stats.carga);
        if (!body) return;
        if (!APP.config.loadZones || !total) {
            let hint = 'Activa <b>Cargar geocercas</b> en Ajustes &gt; General para verlas.';
            if (APP.config.loadZones) {
                hint = 'No se encontraron geocercas. Usa <b>Recargar</b> o revisa que tu usuario tenga geocercas en la plataforma.';
                const d = APP.zonasDiag;
                if (d) {
                    hint += '<br><span style="font-size:10px;color:var(--rondo-fg-mute)">'
                        + 'Recursos: ' + (d.recursos || 0)
                        + (d.claves && d.claves.length ? ' \u00b7 claves: ' + esc(d.claves.join(', ')) : '')
                        + (d.error ? ' \u00b7 ' + esc(d.error) : '')
                        + '</span>';
                }
            }
            const accion = !APP.config.loadZones
                ? '<button class="mini rondo-vacio-acc" data-acc="ajustes"><span class="rondo-usym">' + UIS.gear + '</span> Abrir Ajustes</button>'
                : '<button class="mini" id="rondo-geo-vacio-recargar"><span class="rondo-usym">' + UIS.refresh + '</span> Recargar</button>';
            setHtml(body, '<div class="rondo-geo-empty">' + emptyState(UIS.map, 'Sin geocercas cargadas', hint, accion) + '</div>');
            const b = byId('rondo-geo-vacio-recargar');
            if (b) b.addEventListener('click', () => recargarGeocercas());
            return;
        }
        const f = (APP.geoFiltro || '').toLowerCase();
        const rol = APP.geoRol || 'todas';
        let lista = zonas.map((z) => {
            const dentro = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z));
            const ecos = dentro.map((u) => u.info.eco).filter(Boolean);
            return { z: z, ecos: ecos, rol: zonaRol(z), area: zonaAreaM2(z) };
        });
        if (rol === 'base' || rol === 'carga') lista = lista.filter((x) => x.rol === rol);
        else if (rol === 'ocupadas') lista = lista.filter((x) => x.ecos.length);
        else if (rol === 'app') lista = lista.filter((x) => glocEsApp(x.z));
        if (f) {
            lista = lista.filter((x) => ((x.z.n || '').toLowerCase().indexOf(f) >= 0) || x.ecos.some((e) => (e || '').toLowerCase().indexOf(f) >= 0));
        }
        const orden = APP.geoOrden || 'nombre';
        lista.sort((a, b) => {
            if (orden === 'unidades') return b.ecos.length - a.ecos.length || (a.z.n || '').localeCompare(b.z.n || '', 'es');
            if (orden === 'area') return b.area - a.area;
            return (a.z.n || '').localeCompare(b.z.n || '', 'es');
        });
        const cards = lista.map((x) => {
            const z = x.z;
            const rolTxt = x.rol === 'base' ? 'Base' : (x.rol === 'carga' ? 'Carga' : 'Normal');
            // v6.13: para circulos el area no viene de zonaAreaM2; se usa la
            // de la propia geocerca (pi*r2) para que el dato sea correcto.
            const areaTxt = (z.t === 3) ? glocTextoTam(z) : (x.area ? fmtArea(x.area / 1e6) : '');
            // v6.12: la campana abre el menu de alerta DE ESTA geocerca
            // (alcance, gravedad, disparador y tiempos). El badge muestra su
            // gravedad y disparador cuando esta vigilada.
            const nomZ = z.n || ('Zona ' + z.id);
            const gac = geoAlertaCfgZona(nomZ);
            const esApp = glocEsApp(z);
            return '<div class="rondo-geo-card' + (x.ecos.length ? ' ocupada' : '') + (gac ? ' alerta-sel sev-' + gac.severidad : '') + ' rol-' + x.rol + (esApp ? ' de-la-app' : '') + '" data-zona="' + esc(z.n || '') + '" title="' + esc(z.n || '') + '">' +
                '<span class="rondo-geo-dot"></span>' +
                '<div class="rondo-geo-body">' +
                '<b class="rondo-geo-name">' + esc(z.n || ('Zona ' + z.id)) +
                (esApp ? '<span class="rondo-geo-app" title="' + esc(glocOrigen(z).largo) + '">' + esc(glocOrigen(z).corto) + '</span>' : '') +
                '</b>' +
                '<span class="rondo-geo-inside">' +
                (x.ecos.length
                    ? esc(x.ecos.slice(0, 8).join(' \u00b7 ')) + (x.ecos.length > 8 ? ' +' + (x.ecos.length - 8) : '')
                    : 'sin unidades dentro') +
                '</span>' +
                '</div>' +
                '<span class="rondo-geo-role">' + rolTxt + (areaTxt ? ' \u00b7 ' + areaTxt : '') + '</span>' +
                (gac ? '<span class="rondo-geo-gabadge sev-' + gac.severidad + '" title="' + esc(geoAlertaEtiqueta(nomZ, gac).sub) + '">' +
                    '<i></i>' + esc(GEO_ALERTA_ETIQUETAS[gac.disparo] || '') + '</span>' : '') +
                '<span class="rondo-geo-acc">' +
                (esApp ? '<button class="mini rondo-geo-edit" data-zona="' + esc(nomZ) + '" title="Editar en el mapa de Rondo"><span class="rondo-usym">' + UIS.watch + '</span></button>' : '') +
                '<button class="mini rondo-geo-ga' + (gac ? ' on sev-' + gac.severidad : '') + '" data-zona="' + esc(nomZ) + '" title="' + (gac ? 'Ajustar la alerta de esta geocerca' : 'Vigilar esta geocerca') + '"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
                '<button class="mini rondo-geo-usar" data-zona="' + esc(z.n || '') + '" title="Anadir como parada a una unidad"><span class="rondo-usym">' + UIS.route + '</span></button>' +
                '<button class="mini rondo-geo-copy" data-zona="' + esc(z.n || '') + '" title="Copiar nombre y centro"><span class="rondo-usym">' + UIS.copy + '</span></button>' +
                '</span>' +
                '<span class="rondo-geo-badge">' + x.ecos.length + '</span>' +
                '</div>';
        });
        setHtml(body, cards.join('') || '<div class="rondo-geo-empty">' + emptyState(UIS.filter, LANG.sinCoin,
            'Ninguna geocerca coincide con los filtros actuales.') + '</div>');
    }
    // Muestra el panel de la pestana Zonas segun el segmentado (geocercas|riesgo).
    function aplicarZonasVista() {
        const v = (APP.zonasVista === 'riesgo') ? 'riesgo' : 'geocercas';
        const g = byId('rondo-zpane-geocercas');
        const r = byId('rondo-zpane-riesgo');
        if (g) g.style.display = (v === 'geocercas') ? '' : 'none';
        if (r) r.style.display = (v === 'riesgo') ? '' : 'none';
        document.querySelectorAll('#rondo-zonas-seg .rondo-zseg').forEach((b) => {
            b.classList.toggle('activo', b.dataset.ztab === v);
        });
    }
    // Vuelve a consultar las geocercas de la plataforma y repinta la pestaña.
    async function recargarGeocercas() {
        try {
            APP.config.loadZones = true;
            APP.zonas = await fetchZones();
            // v6.13: Recargar solo repone las de la plataforma; las dibujadas
            // en Rondo se vuelven a fusionar (glocSincroniza las separa).
            glocSincroniza();
            paintGeocercas();
            if (APP.tab === 'zonas') paintRiesgo();
            if (APP.zonas.length) adviceOk('Geocercas recargadas', APP.zonas.length + ' geocercas');
            else adviceWarn('Sin geocercas', 'La plataforma no devolvio geocercas. Revisa que tu usuario las tenga.');
        } catch (e) {
            adviceErr('No se pudieron cargar', (e && e.message) || 'error');
        }
    }
    function paintViajes() {
        const cont = byId('rondo-lista-viajes');
        if (!cont) return;
        const ecos = Object.keys(APP.viajes || {});
        if (!ecos.length) {
            setHtml(cont, emptyState(UIS.clock, 'Sin viajes analizados',
                'Clic derecho en una unidad &gt; <b>Analizar viaje</b> para detectar el punto de partida (parada de mas de '
                + (APP.config.partidaHoras || 6) + ' h), el trayecto, las paradas y la carga.'));
            return;
        }
        setHtml(cont, ecos.map((eco) => {
            const v = APP.viajes[eco];
            const flags = [];
            if (v.cargo) flags.push('carga');
            if (v.paradas.length) flags.push(v.paradas.length + ' parada(s)');
            if (v.llego) flags.push('llego a destino');
            if (v.regreso) flags.push('en regreso');
            const color = v.regreso ? 'var(--rondo-warn-fg)' : (v.llego ? 'var(--rondo-ok-fg)' : 'var(--rondo-accent-2)');
            return '<div class="alerta" style="border-left:4px solid ' + color + '">' +
                '<span class="ico rondo-usym" style="color:' + color + '">' + UIS.clock + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco) + ' · VIAJE</b>' +
                '<span>Partida ' + new Date(v.partida.t * 1000).toLocaleString().slice(0, 16) + (v.zonaPartida ? ' · ' + esc(v.zonaPartida) : '') + '</span>' +
                '<div class="meta">' +
                '<span class="regla">' + v.distanciaKm + ' km</span>' +
                '<span>' + v.puntos + ' puntos</span>' +
                (v.salida ? '<span>salida ' + new Date(v.salida * 1000).toLocaleTimeString().slice(0, 5) + '</span>' : '') +
                (flags.length ? '<span>' + esc(flags.join(' · ')) + '</span>' : '') +
                '<span>' + new Date(v.analizado).toLocaleTimeString().slice(0, 5) + '</span>' +
                '</div></div>' +
                '<button class="mini rondo-viaje-geo" data-eco="' + esc(eco) + '" title="Exportar viaje GeoJSON"><span class="rondo-usym">' + UIS.export + '</span></button>' +
                '<button class="mini rondo-viaje-re" data-eco="' + esc(eco) + '" title="Reanalizar viaje"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '</div>';
        }).join(''));
    }
    // v6.0.7: formato legible de distancias y duraciones para la tarjeta de rutas.
    function rxFmtDist(m) {
        if (!isFinite(m)) return '-';
        if (m < 1000) return Math.round(m) + ' m';
        const km = m / 1000;
        return (km >= 100 ? Math.round(km) : Math.round(km * 10) / 10).toLocaleString('es-MX') + ' km';
    }
    function rxFmtDur(seg) {
        const min = Math.round((seg || 0) / 60);
        if (min < 60) return min + ' min';
        return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
    }
    function paintRutas() {
        paintViajes();
        const cont = byId('rondo-lista-rutas');
        if (!cont) return;
        const watched = (APP.unidades || []).filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const filas = watched.filter((x) => rutaDe(x.info));
        const pendientes = watched.filter((x) => !rutaDe(x.info) && !!watchDest(x.info));
        const sinUnidad = Object.keys(APP.rutas || {}).filter((eco) => !watched.some((x) => x.info.clave === eco || x.info.eco === eco));
        const pendEl = byId('rondo-rutas-pend');
        if (pendEl) pendEl.textContent = pendientes.length ? (pendientes.length + ' sin trazar') : '';
        if (!filas.length && !sinUnidad.length && !pendientes.length) {
            setHtml(cont, emptyState(UIS.route, 'Sin rutas planificadas',
                'Haz <b>clic derecho</b> en una unidad de la pestaña Unidades y elige <b>Planear ruta (OSRM)</b> o <b>(A*)</b>. Aquí verás el progreso, la distancia y los desvíos.',
                '<button class="mini rondo-vacio-acc" data-acc="tab-unidades"><span class="rondo-usym">' + UIS.panel + '</span> Ir a Unidades</button>'));
            try { rxRutasMiniSync([]); } catch (_) { /* noop */ }
            return;
        }
        const tarjeta = (info, st) => {
            const eco = info.clave;
            const r = rutaDe(info);
            const er = estadoRuta(info, st);
            const s = er.snap || null;
            const llego = !!er.llego, desviado = !!er.desviado;
            const est = !s ? 'SIN POSICION' : (llego ? 'LLEGO' : (desviado ? 'DESVIADO' : 'EN RUTA'));
            const estClase = llego ? 'ok' : (desviado ? 'desv' : (s ? 'ruta' : 'sin'));
            const dest = r.destinoTexto || (r.destino.lat.toFixed(4) + ',' + r.destino.lon.toFixed(4));
            const etaSeg = s ? calcularETA(s, r, st.vel) : null;
            const pct = s ? Math.round(s.progreso * 100) : 0;
            const totalP = er.totalParadas || (r.paradas ? r.paradas.length : 0);
            const chips = [];
            if (s) chips.push('progreso ' + pct + '%');
            if (totalP > 1) chips.push('parada ' + Math.min(totalP, (er.llegadas || 0) + (llego ? 0 : 1)) + '/' + totalP);
            if (s) chips.push('a ' + rxFmtDist(s.dist) + ' del trazado');
            if (etaSeg != null) chips.push('ETA ' + rxFmtDur(etaSeg));
            if (r.duracion) chips.push(esc(r.modo || '') + ' ' + rxFmtDur(r.duracion));
            if (!llego && er.parada) chips.push('siguiente: ' + esc(er.parada.texto || ''));
            chips.push(new Date(r.creada).toLocaleString().slice(0, 16));
            return '<div class="rondo-ruta-card est-' + estClase + '">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco || info.nombre) + '</span>' +
                '<span class="rr-est rr-est-' + estClase + '">' + esc(est) + '</span>' +
                '<span class="rr-km">' + rxFmtDist(r.total) + '</span>' +
                '<span class="rr-modo">' + esc(r.optimo ? 'mejor ruta' : 'secuencial') + ' \u00b7 ' + esc(r.modo || '') + '</span>' +
                '<span class="rr-actions">' +
                '<button class="mini rondo-plan-edit" data-eco="' + esc(eco) + '" title="Editar paradas del plan"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
                '<button class="mini rondo-ruta-mapa" data-eco="' + esc(eco) + '" title="Ver la ruta en el mini-mapa"><span class="rondo-usym">' + UIS.map + '</span></button>' +
                '<button class="mini rondo-ruta-gmaps" data-eco="' + esc(eco) + '" title="Abrir la ruta en Google Maps (con paradas)"><span class="rondo-usym">' + UIS.pin + '</span></button>' +
                '<button class="mini rondo-ruta-geo" data-eco="' + esc(eco) + '" title="Exportar ruta GeoJSON"><span class="rondo-usym">' + UIS.export + '</span></button>' +
                '<button class="mini rondo-traza-geo" data-eco="' + esc(eco) + '" title="Exportar traza GeoJSON"><span class="rondo-usym">' + UIS.csv + '</span></button>' +
                '<button class="mini rondo-ruta-calc" data-eco="' + esc(eco) + '" title="Recalcular"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '<button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-usym">' + UIS.close + '</span></button>' +
                '</span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(dest) + '">' + esc(dest) + '</div>' +
                (totalP > 1 || s ? '<div class="rr-progress"><div class="rr-progress-fill" style="width:' + pct + '%"></div></div>' : '') +
                '<div class="rr-meta">' + chips.map((c) => '<span class="rr-chip">' + c + '</span>').join('') + '</div>' +
                '<div class="rr-mini" id="rondo-ru-mini-' + esc(eco) + '"></div>' +
                '</div>';
        };
        let html = pendientes.map((x) => {
            const eco = x.info.clave;
            const dest = watchDest(x.info);
            const intentos = (APP.rutaIntentos && APP.rutaIntentos[eco]) || 0;
            return '<div class="rondo-ruta-card est-pend">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco) + '</span>' +
                '<span class="rr-est rr-est-pend">SIN TRAZAR</span>' +
                '<span class="rr-actions">' +
                '<button class="mini rondo-plan-edit" data-eco="' + esc(eco) + '" title="Editar paradas"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
                '<button class="mini rondo-ruta-trazar" data-eco="' + esc(eco) + '" title="Trazar ahora"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '</span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(dest) + '">' + esc(dest) + '</div>' +
                '<div class="rr-meta">' +
                '<span class="rr-chip">pendiente</span>' +
                (intentos ? '<span class="rr-chip">' + intentos + ' intento(s)</span>' : '') +
                (intentos >= 2 ? '<span class="rr-chip">usa Trazar pendientes</span>' : '') +
                '</div>' +
                '</div>';
        }).join('');
        html += filas.map((x) => tarjeta(x.info, x.st)).join('');
        sinUnidad.forEach((eco) => {
            const r = APP.rutas[eco];
            if (!r) return;
            html += '<div class="rondo-ruta-card est-sin" style="opacity:.75">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco) + '</span>' +
                '<span class="rr-est rr-est-sin">FUERA DE VIGILANCIA</span>' +
                '<span class="rr-km">' + rxFmtDist(r.total) + '</span>' +
                '<span class="rr-actions"><button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-usym">' + UIS.close + '</span></button></span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(r.destinoTexto || '') + '">' + esc(r.destinoTexto || '') + '</div>' +
                '</div>';
        });
        setHtml(cont, html);
        try { rxRutasMiniSync(filas); } catch (_) { /* noop */ }
    }
    function paintPanel() { setTab(APP.tab); }

    /* === BEGIN: paintCaravana === */
    function paintCaravana() {
        const sel = byId('rondo-caravana-sel');
        const body = byId('rondo-caravana-body');
        if (!sel || !body) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch);
        const resEl = byId('rondo-caravana-resumen');
        if (!vigiladas.length) {
            sel.innerHTML = '';
            if (resEl) resEl.textContent = '';
            body.innerHTML = '<div class="rondo-cv-empty"><span class="rondo-usym">' + UIS.caravana + '</span><div>No hay unidades vigiladas. Agrega unidades desde la lista para usar el modo caravana.</div></div>';
            return;
        }
        // Reconstruye el <select> solo si cambia la lista de economicos (asi
        // no se pierde la seleccion del usuario en cada repaint).
        const ecosActuales = vigiladas.map((u) => (parseUnitName(u).eco || parseUnitName(u).placa || String(parseUnitName(u).id)));
        const firma = ecosActuales.join('|');
        if (sel.dataset.firma !== firma) {
            const previo = APP.caravanaEco;
            sel.innerHTML = ecosActuales.map((e) => '<option value="' + esc(e) + '">' + esc(e) + '</option>').join('');
            let candidato = previo;
            if (!candidato || !ecosActuales.includes(candidato)) {
                const conRuta = vigiladas.find((u) => { const i = parseUnitName(u); return rutaDe(i); });
                candidato = conRuta ? (parseUnitName(conRuta).eco || parseUnitName(conRuta).placa || String(parseUnitName(conRuta).id)) : ecosActuales[0];
            }
            APP.caravanaEco = candidato;
            sel.value = candidato;
            sel.dataset.firma = firma;
        } else {
            if (APP.caravanaEco && sel.value !== APP.caravanaEco) sel.value = APP.caravanaEco;
        }
        const it = unitByEco(APP.caravanaEco);
        if (!it) { body.innerHTML = ''; return; }
        const info = parseUnitName(it.u);
        const st = unitState(it.u);
        let res;
        try { res = unidadesEnCaravana(info, st); }
        catch (e) { body.innerHTML = '<div class="rondo-cv-empty">Error: ' + esc(e.message) + '</div>'; return; }
        const miembros = res.miembros;
        const ruta = res.rutaLider;
        const html = [];
        // Tarjeta del lider
        html.push(renderCaravanaLider(info, st, ruta, res.snapLider));
        if (!miembros.length) {
            html.push('<div class="rondo-cv-empty"><span class="rondo-usym">' + UIS.caravana + '</span><div>Ninguna unidad vigilada cercana a ' + esc(APP.caravanaEco) + '.</div></div>');
        } else {
            miembros.forEach((m) => { html.push(renderCaravanaMiembro(m)); });
        }
        setHtml(body, html.join(''));
        if (resEl) {
            resEl.textContent = miembros.length
                ? (miembros.length + ' cerca \u00b7 ' + miembros.filter((m) => !m.vigilada).length + ' sin vigilar')
                : '';
        }
        const cCv = byId('rondo-c-cv');
        if (cCv) cCv.textContent = miembros.length;
    }
    function renderCaravanaLider(info, st, ruta, snap) {
        const eco = info.eco || info.placa || String(info.id);
        const cls = ['rondo-cv-card', 'lider'];
        const meta = [];
        if (ruta) {
            const totalKm = ruta.total ? (ruta.total / 1000).toFixed(1) + ' km' : '';
            meta.push('<span class="pill en-ruta">EN RUTA ' + esc(totalKm) + '</span>');
        } else {
            meta.push('<span class="pill dim">SIN RUTA</span>');
        }
        meta.push('<span class="pill">' + (st.online ? 'online' : 'offline') + '</span>');
        if (st.vel != null) meta.push('<span class="pill">' + Math.round(st.vel) + ' km/h</span>');
        if (snap && Number.isFinite(snap.progreso)) {
            meta.push('<span class="pill">' + Math.round(snap.progreso * 100) + '% ruta</span>');
        }
        return '<div class="' + cls.join(' ') + '">' +
            '<div class="cv-head"><span class="cv-eco">' + esc(eco) + '</span><span>· lider</span></div>' +
            '<div class="cv-meta">' + meta.join('') + '</div>' +
            '</div>';
    }
    function fmtDistancia(d) {
        if (!Number.isFinite(d)) return '';
        if (d >= 1000) return (d / 1000).toFixed(2) + ' km';
        return Math.round(d) + ' m';
    }
    function fmtDelta(d) {
        if (d == null) return '';
        const a = Math.abs(d);
        const txt = fmtDistancia(a);
        return (d >= 0 ? '+' : '−') + txt;
    }
    function renderCaravanaMiembro(m) {
        const eco = m.info.eco || m.info.placa || String(m.info.id);
        const cls = ['rondo-cv-card'];
        if (m.contrario) cls.push('contrario');
        const meta = [];
        let distTxt = '';
        if (m.enRuta && m.deltaRuta != null) {
            if (Math.abs(m.deltaRuta) < 25) distTxt = 'a ' + fmtDistancia(Math.abs(m.deltaRuta));
            else if (m.deltaRuta >= 0) distTxt = fmtDelta(m.deltaRuta) + ' delante';
            else distTxt = fmtDelta(m.deltaRuta) + ' detras';
        } else {
            distTxt = 'a ' + fmtDistancia(m.distDirecta);
        }
        if (m.enRuta) meta.push('<span class="pill en-ruta">EN RUTA</span>');
        else meta.push('<span class="pill dim">CERCA</span>');
        if (!m.vigilada) meta.push('<span class="pill dim">NO VIGILADA</span>');
        meta.push('<span class="pill">' + (m.st.online ? 'online' : 'offline') + '</span>');
        if (m.st.vel != null) meta.push('<span class="pill">' + Math.round(m.st.vel) + ' km/h</span>');
        if (m.enRuta && m.distEje != null) meta.push('<span class="pill">' + Math.round(m.distEje) + ' m del eje</span>');
        if (m.contrario) meta.push('<span class="pill contrario">SENTIDO CONTRARIO</span>');
        return '<div class="' + cls.join(' ') + '" data-eco="' + esc(eco) + '">' +
            '<div class="cv-head"><span class="cv-eco">' + esc(eco) + '</span><span class="cv-dist">' + esc(distTxt) + '</span></div>' +
            '<div class="cv-meta">' + meta.join('') + '</div>' +
            '</div>';
    }
    function bindCaravanaSelect() {
        const sel = byId('rondo-caravana-sel');
        if (!sel) return;
        sel.addEventListener('change', () => {
            APP.caravanaEco = sel.value || '';
            paintCaravana();
        });
        const body = byId('rondo-caravana-body');
        if (body) {
            body.addEventListener('click', (ev) => {
                const card = ev.target.closest('.rondo-cv-card');
                if (!card || !card.dataset.eco) return;
                if (card.classList.contains('lider')) return;
                openUnitWindow(card.dataset.eco);
            });
        }
    }
    /* === END: paintCaravana === */

    function paintRiesgo() {
        const cfg = APP.config || {};
        const items = APP.riesgo || [];
        // ── Estado / status banner ───────────────────────────────────
        const estadoEl = byId('rondo-riesgo-estado');
        if (estadoEl) {
            let html;
            const rel = tiempoRelativo(APP.riesgoTs);
            const fechaAbs = APP.riesgoTs ? new Date(APP.riesgoTs).toLocaleString() : '\u2014';
            if (APP.riesgoEstado === 'cargando') {
                html = '<div class="rondo-riesgo-status load"><span class="ico rondo-usym rondo-usym-spin">' + UIS.load + '</span><div class="cuerpo"><b>Cargando zonas de riesgo\u2026</b><span>Descargando desde la URL configurada.</span></div></div>';
            } else if (items.length > 0) {
                html = '<div class="rondo-riesgo-status ok"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>' + items.length + ' zonas cargadas</b><span>\u00daltima carga ' + esc(rel) + ' \u00b7 ' + esc(fechaAbs) + '</span></div></div>';
            } else if (APP.riesgoEstado === 'error') {
                html = '<div class="rondo-riesgo-status err"><span class="ico rondo-usym">' + UIS.warn + '</span><div class="cuerpo"><b>Sin dataset activo</b><span>' + esc(APP.riesgoErr || 'configura una URL en Ajustes > Reglas, o importa un archivo') + '. La alerta cr\u00edtica de zona de riesgo queda desactivada.</span></div></div>';
            } else if (!cfg.riesgoUrl) {
                html = '<div class="rondo-riesgo-status"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>A\u00fan no hay URL configurada</b><span>Pega una URL en <b>Ajustes &gt; Reglas &gt; Zonas de riesgo</b> o arrastra un archivo CSV/JSON aqui.</span></div></div>';
            } else {
                html = '<div class="rondo-riesgo-status"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>Sin zonas cargadas</b><span>Pulsa <b>Recargar</b> o arrastra un CSV/JSON aqui.</span></div></div>';
            }
            estadoEl.innerHTML = html;
        }
        // ── Contador de la pestana ───────────────────────────────────
        const tabContador = byId('rondo-c-riesgo');
        if (tabContador) tabContador.textContent = items.length || 0;
        // ── Cuenta + fuente (linea compacta) ────────────────────────
        const cuentaEl = byId('rondo-riesgo-status-cuenta');
        if (cuentaEl) {
            cuentaEl.textContent = items.length + (items.length === 1 ? ' zona' : ' zonas');
        }
        const fuenteEl = byId('rondo-riesgo-status-fuente');
        if (fuenteEl) {
            const partes = [];
            // Fuente del dataset: primero config (URL), luego APP._riesgoFetched,
            // luego la fuente del primer item.
            const fuente = (cfg.riesgoUrl && APP._riesgoFetched) || '';
            if (fuente) {
                let tag = fuente;
                try {
                    const u = new URL(fuente);
                    tag = u.hostname + u.pathname;
                    if (tag.length > 38) tag = tag.slice(0, 35) + '\u2026';
                } catch (_) { /* noop */ }
                partes.push(esc(tag));
            }
            if (APP.riesgoTs && items.length) {
                partes.push('carga ' + esc(tiempoRelativo(APP.riesgoTs)));
            }
            fuenteEl.innerHTML = partes.length ? ' \u00b7 ' + partes.join(' \u00b7 ') : '';
            fuenteEl.title = fuente;
        }
        // ── Dona SVG ─────────────────────────────────────────────────
        const stats = calcularStatsRiesgo(items);
        renderRiesgoDona(stats);
        // ── Histograma ───────────────────────────────────────────────
        const hist = histogramaScores(items);
        renderRiesgoHistograma(hist);
        // ── KPIs ─────────────────────────────────────────────────────
        const totalEl = byId('rondo-riesgo-kpi-total');
        if (totalEl) totalEl.textContent = stats.total;
        const promEl = byId('rondo-riesgo-kpi-prom');
        if (promEl) {
            if (stats.total) promEl.textContent = 'prom. ' + stats.promScore + '/100';
            else promEl.innerHTML = '&mdash;';
        }
        const altoEl = byId('rondo-riesgo-kpi-alto');
        if (altoEl) altoEl.textContent = stats.alto;
        const medioEl = byId('rondo-riesgo-kpi-medio');
        if (medioEl) medioEl.textContent = stats.medio;
        const bajoEl = byId('rondo-riesgo-kpi-bajo');
        if (bajoEl) bajoEl.textContent = stats.bajo;
        // Marca el KPI activo segun el nivel filtrado
        document.querySelectorAll('#rondo-wrap-zonas .rondo-riesgo-kpi').forEach((k) => {
            k.classList.toggle('activo', k.dataset.kpiNivel === (APP.riesgoNivel || 'todas'));
        });
        // ── Filtros (sync UI con APP.riesgoFiltro/Nivel/Orden/Vista) ──
        const buscar = byId('rondo-riesgo-buscar');
        if (buscar && document.activeElement !== buscar && buscar.value !== (APP.riesgoFiltro || '')) {
            buscar.value = APP.riesgoFiltro || '';
        }
        const ordenSel = byId('rondo-riesgo-orden');
        if (ordenSel && ordenSel.value !== (APP.riesgoOrden || 'score')) ordenSel.value = APP.riesgoOrden || 'score';
        const vistaSel = byId('rondo-riesgo-vista');
        if (vistaSel && vistaSel.value !== (APP.riesgoVista || 'grupo')) vistaSel.value = APP.riesgoVista || 'grupo';
        document.querySelectorAll('#rondo-wrap-zonas .rondo-chip').forEach((c) => {
            c.classList.toggle('activo', c.dataset.nivel === (APP.riesgoNivel || 'todas'));
        });
        // ── Lista: filtrar -> ordenar -> (agrupar o plano) ────────────
        const listaEl = byId('rondo-riesgo-lista');
        const totalLabel = byId('rondo-riesgo-total');
        const filtradasLabel = byId('rondo-riesgo-filtradas');
        if (totalLabel) totalLabel.textContent = items.length;
        if (filtradasLabel) filtradasLabel.textContent = '...';
        if (!listaEl) return;
        const filtradas = filtrarZonas(items, APP.riesgoFiltro, APP.riesgoNivel);
        const ordenadas = ordenarZonas(filtradas, APP.riesgoOrden || 'score');
        if (filtradasLabel) filtradasLabel.textContent = ordenadas.length;
        // Summary line
        const summary = byId('rondo-riesgo-summary');
        if (summary) {
            const partes = [];
            partes.push('<span><b>' + ordenadas.length + '</b> visibles</span>');
            if (ordenadas.length !== items.length) partes.push('<span class="sep">de</span><span>' + items.length + ' totales</span>');
            const estSet = new Set();
            ordenadas.forEach((z) => { if (z.estado) estSet.add(z.estado); });
            if (estSet.size > 1) partes.push('<span class="sep">\u00b7</span><span>' + estSet.size + ' estados</span>');
            const sumArea = ordenadas.reduce((acc, z) => acc + areaKm2DeRadio(z.radio_m || 0), 0);
            if (sumArea > 0) partes.push('<span class="sep">\u00b7</span><span>' + fmtArea(Math.round(sumArea * 10) / 10) + '</span>');
            const top = topDelitos(calcularStatsRiesgo(ordenadas), 2);
            if (top.length) {
                partes.push('<span class="sep">\u00b7</span><span>top ' + top.map((t) => t.key.replace(/_/g, ' ') + ' ' + t.n).join(', ') + '</span>');
            }
            summary.innerHTML = partes.join(' ');
        }
        // Empty state: con onboarding si no hay items, con sugerencias si los hay pero el filtro no devuelve nada.
        if (!ordenadas.length) {
            let inner;
            if (items.length === 0) {
                inner =
                    '<span class="rondo-usym">' + UIS.zone + '</span>' +
                    '<b>Aun no hay zonas cargadas</b>' +
                    '<span>Sigue estos pasos para empezar.</span>' +
                    '<div class="pasos">' +
                        '<div class="paso"><span class="n">1</span><span class="t">Pega la URL</span><span class="d">En <b>Origen del dataset</b> arriba. Acepta CSV o JSON publico.</span></div>' +
                        '<div class="paso"><span class="n">2</span><span class="t">Recarga</span><span class="d">Pulsa <b>Recargar</b>. Tambien puedes arrastrar un archivo CSV/JSON al recuadro.</span></div>' +
                        '<div class="paso"><span class="n">3</span><span class="t">Activa la regla</span><span class="d">Si quieres alerta critica cuando una unidad pierda senal en zona, marca <b>PERDIO SENAL EN ZONA DE RIESGO</b>.</span></div>' +
                    '</div>' +
                    '<button class="mini" id="rondo-riesgo-empty-ajustes"><span class="rondo-usym">' + UIS.gear + '</span> Abrir Ajustes</button>';
            } else {
                inner =
                    '<span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<b>Ninguna zona coincide</b>' +
                    '<span>Ajusta el texto o el nivel. Visibles: 0 de ' + items.length + '.</span>' +
                    '<button class="mini" id="rondo-riesgo-empty-clear"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar filtros</button>';
            }
            listaEl.innerHTML = '<div class="rondo-riesgo-empty">' + inner + '</div>';
            return;
        }
        // Render: agrupado o plano
        if (APP.riesgoVista === 'plano') {
            listaEl.innerHTML = renderZonasPlano(ordenadas);
        } else {
            listaEl.innerHTML = renderZonasAgrupadas(ordenadas);
        }
        // Footer con conteo
        const totalShown = APP.riesgoVista === 'plano' ? ordenadas.length
            : agruparPorEstado(ordenadas).reduce((acc, g) => acc + g.zonas.length, 0);
        const fHtml = totalShown < items.length
            ? '<span>Mostrando <b>' + totalShown + '</b> de <b>' + items.length + '</b></span>'
            : '<span>Mostrando <b>' + totalShown + '</b></span>';
        const fHtmlR = APP.riesgoColapsado && Object.keys(APP.riesgoColapsado).filter((k) => APP.riesgoColapsado[k]).length
            ? '<span>' + Object.values(APP.riesgoColapsado).filter(Boolean).length + ' grupo(s) colapsado(s)</span>'
            : '';
        listaEl.insertAdjacentHTML('beforeend', '<div class="rondo-riesgo-foot">' + fHtml + fHtmlR + '</div>');
    }
    // Render de la dona SVG del hero.
    function renderRiesgoDona(stats) {
        const valEl = byId('rondo-riesgo-dona-val');
        if (valEl) valEl.textContent = stats.total;
        const radio = 28.5;
        const circ = 2 * Math.PI * radio;
        const seg = donutSegmentos(stats.alto, stats.medio, stats.bajo, 74, 9);
        const dash = donutDashArray(seg.segmentos, circ);
        const els = [
            byId('rondo-riesgo-dona-alto'),
            byId('rondo-riesgo-dona-medio'),
            byId('rondo-riesgo-dona-bajo'),
        ];
        let acc = 0;
        for (let i = 0; i < 3; i++) {
            const el = els[i];
            if (!el) continue;
            const d = dash[i];
            if (!d || d.fraccion <= 0 || stats.total === 0) {
                el.setAttribute('stroke-dasharray', '0 999');
                continue;
            }
            // stroke-dasharray: visible_len, (circ - visible_len) para que el resto sea hueco.
            el.setAttribute('stroke-dasharray', (d.len - 0.5) + ' ' + (circ + 1));
            // offset: empezamos donde termina el segmento previo (rotacion -90deg ya aplicada al SVG).
            acc += d.len;
            el.setAttribute('stroke-dashoffset', -(acc - d.len));
        }
    }
    // Render del histograma de scores (5 barras verticales).
    function renderRiesgoHistograma(hist) {
        const wrap = byId('rondo-riesgo-hist');
        if (!wrap) return;
        if (!hist.total) {
            wrap.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--rondo-fg-mute);font-size:10.5px">Sin datos</div>';
            return;
        }
        const lvlOf = (lo, hi) => {
            // Score maximo del bucket: alto >= 60, medio >= 20, bajo < 20.
            const mid = (lo + hi - 1) / 2;
            return nivelRiesgo(mid);
        };
        let html = '';
        for (let i = 0; i < hist.buckets.length; i++) {
            const b = hist.buckets[i];
            const c = hist.counts[i];
            const pct = hist.max ? Math.max(4, Math.round((c / hist.max) * 100)) : 0;
            const lvl = lvlOf(b[0], b[1]);
            const lbl = (b[0] === 80 ? '80+' : b[0] + '\u2013' + (b[1] - 1));
            html += '<div class="rondo-riesgo-hist-b" title="Score ' + lbl + ': ' + c + ' zonas">' +
                '<div class="bar ' + lvl + '" style="height:' + pct + '%"></div>' +
                '<div class="lbl">' + lbl + '</div>' +
                '</div>';
        }
        wrap.innerHTML = html;
    }
    // Render plano: una card por zona, sin agrupar.
    function renderZonasPlano(ordenadas) {
        const MAX = 500;
        const html = [];
        for (let i = 0; i < ordenadas.length && i < MAX; i++) html.push(renderZonaCard(ordenadas[i]));
        return html.join('');
    }
    // Render agrupado: un grupo colapsable por estado.
    function renderZonasAgrupadas(ordenadas) {
        const grupos = agruparPorEstado(ordenadas);
        const out = [];
        for (let i = 0; i < grupos.length; i++) {
            const g = grupos[i];
            const colapsado = !!(APP.riesgoColapsado && APP.riesgoColapsado[g.estado]);
            const max = Math.min(3, g.zonas.length);
            const meta = [];
            meta.push('<span class="pill"><b>' + g.count + '</b></span>');
            meta.push('<span class="pill ' + (nivelRiesgo(g.maxScore)) + '">max ' + g.maxScore + '</span>');
            if (g.municipios > 1) meta.push('<span class="pill">' + g.municipios + ' mun.</span>');
            const bodyHtml = g.zonas.map(renderZonaCard).join('');
            out.push(
                '<div class="rondo-riesgo-grupo' + (colapsado ? ' colapsado' : '') + '" data-estado="' + esc(g.estado) + '">' +
                '<div class="rondo-riesgo-grupo-head">' +
                '<span class="rondo-usym g-toggle">' + UIS.smallDown + '</span>' +
                '<span class="g-estado">' + esc(g.estado) + '</span>' +
                '<span class="g-meta">' + meta.join('') + '</span>' +
                '</div>' +
                '<div class="rondo-riesgo-grupo-body">' + bodyHtml + '</div>' +
                '</div>'
            );
        }
        return out.join('');
    }
    // Render de una sola card de zona (reusada por plano y agrupado).
    function renderZonaCard(z) {
        const score = Number(z.score) || 0;
        const nivel = nivelRiesgo(score);
        const estado = esc(z.estado || '?');
        const municipio = esc(z.municipio || '(sin municipio)');
        const radio = z.radio_m || 0;
        const lat = (z.lat != null) ? z.lat.toFixed(3) : (z.centro && z.centro[0] != null ? z.centro[0].toFixed(3) : '');
        const lon = (z.lon != null) ? z.lon.toFixed(3) : (z.centro && z.centro[1] != null ? z.centro[1].toFixed(3) : '');
        const coord = (lat && lon) ? (lat + ', ' + lon) : '';
        const detalle = delitosTop(z, 3);
        const fuenteTag = z.fuente ? '<span class="pill fuente" title="Fuente del dato">' + esc(z.fuente) + '</span>' : '';
        const idTag = z.id ? '<span class="pill" title="ID">' + esc(z.id) + '</span>' : '';
        // Boton copiar: data-acc="copy-zone" con data-eco apunta al index en APP.riesgo (no tenemos id estable).
        const idx = (APP.riesgo || []).indexOf(z);
        const dataIdx = idx >= 0 ? ' data-zona-idx="' + idx + '"' : '';
        return '<div class="rondo-riesgo-card ' + nivel + '"' + dataIdx +
            ' title="' + esc(riesgoDetalleHTML(z).replace(/<\/?b>/g, '')) + '">' +
            '<div class="rb-head">' +
                '<span class="rb-loc"><span class="rb-est">' + estado + '</span><span class="rb-mun"> \u00b7 ' + municipio + '</span></span>' +
                '<span class="rb-bar" title="Score ' + score + '/100"><span class="rb-bar-fill ' + nivel + '" style="width:' + score + '%"></span></span>' +
                '<span class="rb-score ' + nivel + '">' + score + '</span>' +
            '</div>' +
            (detalle ? '<div class="rb-sub">' + esc(detalle) + '</div>' : '') +
            '<div class="rb-meta">' +
                (radio ? '<span class="pill">buffer ' + radio + ' m</span>' : '') +
                (coord ? '<span class="pill coord">' + coord + '</span>' : '') +
                idTag +
                fuenteTag +
                '<span class="rb-actions">' +
                    '<button class="rondo-copy-zone" data-acc="copy-zone" data-zona-idx="' + idx + '" title="Copiar al portapapeles">' + UIS.copy + '</button>' +
                '</span>' +
            '</div>' +
            '</div>';
    }
    // Helper: actualiza el texto "n grupo(s) colapsado(s)" en el footer de la lista.
    function actualizarContadorColapsados(footEl) {
        if (!footEl) return;
        const n = (APP.riesgoColapsado && Object.values(APP.riesgoColapsado).filter(Boolean).length) || 0;
        const span = footEl.querySelector('.rondo-foot-grupos');
        if (n > 0) {
            if (span) span.textContent = n + ' grupo(s) colapsado(s)';
            else footEl.insertAdjacentHTML('beforeend', '<span class="rondo-foot-grupos">' + n + ' grupo(s) colapsado(s)</span>');
        } else if (span) {
            span.remove();
        }
    }

    setInterval(() => {
        // Ventanas ocultas: oculta tambien las que se abran despues.
        try { if (typeof rxVentanasSync === 'function') rxVentanasSync(); } catch (_) { /* noop */ }
        if (panelEl.style.display === 'none') return;
        if (APP.tab === 'unidades') paintTabla();
        if (APP.tab === 'dash') paintKPI();
        if (APP.tab === 'rutas') paintRutas();
        if (APP.tab === 'zonas' && APP.zonasVista !== 'riesgo') paintGeocercas();
        if (APP.tab === 'caravana') paintCaravana();
        // Riesgo NO se repinta cada segundo para evitar parpadeo: solo se
        // re-pinta cuando cambian los datos, los filtros o se carga el dataset.
        byId('rondo-upd').innerHTML = '<span class="rondo-usym sm">' + UIS.clock + '</span> ' + new Date().toLocaleTimeString();
        if (nmActivo()) updateNoMolestar();
        paintStateBadge();
        paintInfo();
    }, 1000);

    /* ====================== CSV + BACKUP ====================== */
    // Escapa una celda CSV y neutraliza formulas (=, +, @, tab, CR) que una
    // hoja de calculo podria ejecutar (CSV injection). Los numeros negativos
    // no se tocan: '-' no entra en la lista.
    function rxCsvCelda(c) {
        let s = String(c == null ? '' : c);
        if (/^[=+@\t\r]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
    }
    function downloadCSV(filas, nombre) {
        const csv = (filas || []).map((f) => (f || []).map(rxCsvCelda).join(',')).join('\n');
        const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })) });
        a.download = (nombre || 'rondo') + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function exportUnits() {
        // v6.11: incluye la fecha y hora del ultimo reporte y las coordenadas.
        const filas = [['Eco', 'Placa', 'Nombre', 'ID', 'Estado', 'Ultimo', 'Ultimo(min)', 'km/h', 'Lat', 'Lon', 'Zona', 'Silenciada', 'Vigilada']];
        (APP.unidades || []).filter(shouldWatch).forEach((u) => {
            const info = parseUnitName(u), st = unitState(u);
            filas.push([info.eco, info.placa, info.nombre, info.id, st.estado,
                rxFechaHora(st.t),
                isFinite(st.edadMin) ? st.edadMin.toFixed(1) : '', Math.round(st.vel),
                st.lat, st.lon, zoneAt(st.lat, st.lon),
                APP.dismissed.has(info.clave) ? 'si' : '',
                isWatched(info) ? 'si' : ''
            ]);
        });
        downloadCSV(filas, 'wialon_unidades');
    }
    function exportAlertas() {
        // v6.11: fecha y hora completas + coordenadas de cada aviso.
        const filas = [['Fecha y hora', 'Severidad', 'Regla', 'Titulo', 'Detalle', 'Eco', 'Lat', 'Lon']];
        (APP.historial || []).forEach((a) => filas.push([
            rxFechaHora(a.ts, true), a.sev, a.regla, a.titulo, a.detalle, a.eco,
            a.lat == null ? '' : a.lat, a.lon == null ? '' : a.lon
        ]));
        downloadCSV(filas, 'wialon_bitacora');
    }
    function exportInforme() {
        const inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        const hoy = (APP.historial || []).filter((a) => a.ts >= inicio.getTime());
        const cuenta = (lista, campo) => lista.reduce((acc, a) => {
            const k = a[campo] || '—';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const porSev = cuenta(hoy, 'sev');
        const porRegla = cuenta(hoy, 'regla');
        const porEco = cuenta(hoy.filter((a) => a.eco), 'eco');
        const watched = (APP.unidades || []).filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const off = watched.filter((x) => !x.st.online);

        const enLinea = watched.filter((x) => x.st.online).length;
        const coords = (lat, lon) => (lat == null || lon == null) ? '-' : (+lat).toFixed(5) + ', ' + (+lon).toFixed(5);
        const lineas = [];
        lineas.push('# Informe Rondo');
        lineas.push('');
        lineas.push('Generado: ' + rxFechaHora(Date.now(), true));
        lineas.push('Alcance: ' + (APP.config.watchAll ? 'toda la flota' : 'unidades vigiladas'));
        lineas.push('Unidades vigiladas: ' + watched.length);
        lineas.push('En línea: ' + enLinea + ' · Off: ' + off.length);
        lineas.push('');
        // v5.14: bloque de resumen IA (placeholder; se rellena async abajo).
        const resumenIdx = lineas.length;
        lineas.push('## Resumen IA');
        lineas.push('_Generando resumen con IA..._');
        lineas.push('');
        lineas.push('## Alertas de hoy (' + hoy.length + ')');
        const sevs = Object.keys(porSev).sort((a, b) => pickSeverity(b) - pickSeverity(a));
        if (sevs.length) sevs.forEach((s) => lineas.push('- ' + s + ': ' + porSev[s]));
        else lineas.push('- Sin alertas registradas.');
        lineas.push('');
        lineas.push('## Por regla');
        const reglas = Object.keys(porRegla).sort((a, b) => porRegla[b] - porRegla[a]);
        if (reglas.length) reglas.forEach((r) => lineas.push('- ' + r + ': ' + porRegla[r]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        lineas.push('## Unidades con mas alertas');
        const ecos = Object.keys(porEco).sort((a, b) => porEco[b] - porEco[a]).slice(0, 15);
        if (ecos.length) ecos.forEach((e) => lineas.push('- ' + e + ': ' + porEco[e]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        // v6.11: tabla de unidades con fecha/hora del ultimo reporte y coords.
        lineas.push('## Unidades (' + watched.length + ')');
        lineas.push('');
        lineas.push('| Eco | Placa | Estado | Ultimo reporte | Velocidad | Zona | Coordenadas |');
        lineas.push('| --- | --- | --- | --- | --- | --- | --- |');
        if (watched.length) {
            const zonasCargadas = !!(APP.config.loadZones && (APP.zonas || []).length);
            watched.forEach((x) => {
                const zona = (x.st.lat != null) ? (zoneAt(x.st.lat, x.st.lon) || (zonasCargadas ? 'Fuera de geocerca' : '-')) : '-';
                lineas.push('| ' + (x.info.eco || x.info.nombre || '-') + ' | ' + (x.info.placa || '-') + ' | ' +
                    (x.st.online ? 'En linea' : 'Sin senal') + ' | ' + rxFechaHora(x.st.t) + ' | ' +
                    Math.round(x.st.vel) + ' km/h | ' + zona + ' | ' + coords(x.st.lat, x.st.lon) + ' |');
            });
        } else {
            lineas.push('| - | - | - | - | - | - | - |');
        }
        lineas.push('');
        lineas.push('## Unidades sin señal ahora (' + off.length + ')');
        if (off.length) {
            lineas.push('');
            lineas.push('| Eco | Placa | Ultimo reporte | Sin reportar | Coordenadas |');
            lineas.push('| --- | --- | --- | --- | --- |');
            off.forEach((x) => lineas.push('| ' + (x.info.eco || x.info.nombre || '-') + ' | ' + (x.info.placa || '-') + ' | ' +
                rxFechaHora(x.st.t) + ' | ' + ageText(x.st.edadMin) + ' | ' + coords(x.st.lat, x.st.lon) + ' |'));
        } else {
            lineas.push('- Todas reportando.');
        }
        lineas.push('');
        lineas.push('## Ultimos avisos');
        if ((APP.historial || []).length) {
            lineas.push('');
            lineas.push('| Fecha y hora | Severidad | Regla | Eco | Coordenadas | Titulo |');
            lineas.push('| --- | --- | --- | --- | --- | --- |');
            (APP.historial || []).slice(0, 50).forEach((a) => lineas.push(
                '| ' + rxFechaHora(a.ts, true) + ' | ' + a.sev + ' | ' + (a.regla || '-') + ' | ' + (a.eco || '-') + ' | ' +
                coords(a.lat, a.lon) + ' | ' + String(a.titulo || '').replace(/\|/g, '/') +
                (a.detalle ? ' — ' + String(a.detalle).replace(/\|/g, '/') : '') + ' |'
            ));
        } else {
            lineas.push('- Sin avisos.');
        }
        const nombre = 'rondo_informe_' + new Date().toISOString().slice(0, 10) + '.md';
        // v5.14: si la IA esta habilitada y el usuario quiere resumen, lo
        // pedimos DESPUES de generar el .md para que el placeholder viaje
        // siempre en el archivo y, cuando llegue el texto, lo sustituimos
        // y volvemos a descargar el .md con el resumen rellenado.
        const quiereResumen = !!(APP.config && APP.config.iaHabilitada && APP.config.iaApiKey && APP.config.iaResumenInforme);
        const descarga = (lineasFinal) => {
            const a = makeEl('a', { href: URL.createObjectURL(new Blob([lineasFinal.join('\n')], { type: 'text/markdown;charset=utf-8;' })) });
            a.download = nombre;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        };
        descarga(lineas);
        advice('Informe generado', hoy.length + ' alertas hoy');
        if (!quiereResumen) return;
        // Llamada async a la IA para rellenar el bloque de resumen. Si falla,
        // dejamos el placeholder y avisamos al operador.
        aiResumenDia(hoy).then((r) => {
            if (r && r.error) {
                lineas[resumenIdx + 1] = '_' + r.error + '_';
            } else if (r && r.texto) {
                // Metemos el texto tal cual en una sola linea (es texto
                // libre, no markdown); lo partimos en lineas de ~120 chars.
                const txt = String(r.texto).replace(/\s*\n\s*/g, ' ').trim();
                lineas[resumenIdx + 1] = txt;
            } else {
                lineas[resumenIdx + 1] = '_La IA no devolvio resumen._';
            }
            descarga(lineas);
            adviceOk('Resumen IA anadido', 'El informe se volvio a descargar con el resumen.');
        }).catch((e) => {
            lineas[resumenIdx + 1] = '_Error al generar resumen IA: ' + (e && e.message ? e.message : e) + '_';
            descarga(lineas);
        });
    }

    /* ====================== ACTUALIZACIONES ====================== */
    function pintarActualizacion() {
        const b = byId('rondo-actualizar');
        const u = APP.update;
        const bar = byId('rondo-btn-update');
        // v5.14.1: chip de version sincronizado en cada repintado.
        paintVersionChip();
        if (bar) {
            const ver = (u.state === 'available');
            const visible = bar.style.display !== 'none';
            if (visible !== ver) {
                bar.style.display = ver ? '' : 'none';
                try { placeBar(); } catch (_) { /* noop */ }
            }
            if (ver) {
                bar.innerHTML = '<span class="rondo-usym">' + UIS.refresh + '</span> Actualizar' + (u.remote ? ' ' + esc(u.remote) : '');
                bar.title = 'Actualizar a la version ' + esc(u.remote || '') + ' (instalada ' + u.local + ')';
            }
        }
        if (b) {
            b.classList.remove('warn');
            if (u.state === 'available') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.refresh;
                b.title = 'Actualizar a la version ' + u.remote + ' (instalada ' + u.local + ')';
            } else if (u.state === 'installed') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.refresh;
                b.title = 'Actualizacion instalada · recarga para aplicar';
            } else if (u.state === 'error') {
                b.style.display = '';
                b.classList.remove('activo');
                b.classList.add('warn');
                const icon = b.querySelector('.rondo-usym');
                if (icon) icon.innerHTML = UIS.warn;
                b.title = 'No se pudo comprobar actualizaciones' + (u.lastError ? ' (' + u.lastError + ')' : '') + ' · clic para reintentar';
            } else {
                b.style.display = 'none';
                b.classList.remove('activo');
            }
        }
        pintarInfoUpdate();
    }
    function pintarInfoUpdate() {
        const el = byId('rondo-update-info');
        if (!el) return;
        const u = APP.update;
        let html = 'Version instalada: <b>' + VER + '</b>';
        if (u.remote) html += ' · remota: <b>' + esc(u.remote) + '</b>' + (u.canal ? ' (' + esc(u.canal) + ')' : '');
        if (u.state === 'checking') html += ' · comprobando...';
        else if (u.state === 'current' && u.lastCheck) html += ' · al dia (revisado ' + new Date(u.lastCheck).toLocaleTimeString() + ')';
        else if (u.state === 'available') html += ' · <b style="color:var(--rondo-accent-2)">actualizacion disponible</b>';
        else if (u.state === 'installed') html += ' · <b style="color:var(--rondo-accent-2)">actualizada · recarga</b>';
        else if (u.state === 'ahead') html += ' · <b style="color:var(--rondo-fg-dim)">build local ahead</b>';
        else if (u.state === 'unknown') html += ' · <b style="color:var(--rondo-warn-fg)">no se pudo comprobar</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
        else if (u.state === 'error') html += ' · <b style="color:var(--rondo-warn-fg)">error</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
        else if (u.state === 'stale') html += ' · <b style="color:var(--rondo-warn-fg)">modulos desactualizados</b> (' + esc((u.stale && u.stale.detectado) || '?') + ' vs ' + esc(VER) + ') · clic en el chip para reinstalar';
        el.innerHTML = html;
    }
    // v5.14.1: chip de version en la cabecera del panel. Muestra la version
    // instalada con un color que refleja el estado del check de updates.
    function paintVersionChip() {
        const chip = byId('rondo-version-chip');
        if (!chip) return;
        const u = APP.update || {};
        let estado = u.state || 'idle';
        let titulo = 'Version instalada: ' + VER;
        if (estado === 'idle') {
            titulo = 'Version ' + VER + ' · comprobando...';
        } else if (estado === 'checking') {
            estado = 'checking';
            titulo = 'Comprobando actualizaciones...';
        } else if (estado === 'current') {
            titulo = 'Version ' + VER + ' al dia' + (u.remote ? ' (remota: ' + u.remote + ')' : '') +
                (u.lastCheck ? ' · ultima comprobacion ' + new Date(u.lastCheck).toLocaleString() : '') +
                ' · clic para re-comprobar';
        } else if (estado === 'available') {
            titulo = 'Actualizacion disponible: ' + VER + ' -> ' + u.remote + ' · clic para aplicar';
        } else if (estado === 'ahead') {
            titulo = 'Build local por delante de la version remota (' + (u.remote || '?') + ')';
        } else if (estado === 'unknown') {
            titulo = 'No se pudo comprobar actualizaciones' + (u.lastError ? ': ' + u.lastError : '') + ' · clic para reintentar';
        } else if (estado === 'error') {
            titulo = 'Error comprobando actualizaciones · clic para reintentar';
        } else if (estado === 'installed') {
            titulo = 'Actualizacion instalada · recarga para aplicar';
        } else if (estado === 'stale') {
            titulo = 'Modulos desactualizados (' + (u.stale && u.stale.declarado) + ' vs ' + (u.stale && u.stale.detectado) +
                ') · clic para reinstalar y forzar la recarga de modulos';
        }
        chip.dataset.estado = estado;
        chip.title = titulo;
        const label = chip.querySelector('.rondo-version-label');
        if (label && estado === 'available' && u.remote) {
            // Mostrar "v5.14.0 -> 5.14.1" cuando hay update.
            label.textContent = 'v' + VER + ' -> ' + u.remote;
        } else if (label && estado === 'stale' && u.stale && u.stale.detectado) {
            label.textContent = 'v' + u.stale.detectado + ' -> v' + VER;
        } else if (label) {
            label.textContent = 'v' + VER;
        }
    }
    async function fetchVersionRemota(url) {
        // v5.14.1: usar httpRequest() en vez de fetch() directo.
        // raw.githubusercontent.com NO envia Access-Control-Allow-Origin,
        // asi que fetch desde el realm de la pagina falla por CORS.
        // httpRequest() cae a GM_xmlhttpRequest (que el sandbox del
        // userscript SI permite para URLs listadas en @connect).
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        const res = await httpRequest({
            method: 'GET',
            url: url + sep + 't=' + Date.now(),
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
            timeoutMs: UPDATE_HTTP_TIMEOUT_MS
        });
        if (res.red) throw new Error(res.timeout ? 'timeout' : 'red');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const v = parseVersionHeader(res.texto || '');
        if (!v) throw new Error('version no encontrada');
        return v;
    }
    async function comprobarActualizacion() {
        APP.update.state = 'checking';
        pintarActualizacion();
        const intentos = []; // {fuente, ok, v, error}
        // Fuente 1: canal main (raw.githubusercontent.com via httpRequest).
        try {
            const v = await fetchVersionRemota(UPDATE_URL);
            intentos.push({ fuente: 'main', ok: true, v });
            const cmp = cmpVersion(v, VER);
            APP.update.remote = v;
            APP.update.canal = 'main';
            APP.update.url = UPDATE_URL;
            APP.update.lastCheck = Date.now();
            guardarUpdatePersistente();
            log('update check (main):', 'instalada', VER, '· remota', v, '· cmp', cmp);
            return finalizarUpdate(cmp, v, 'main', UPDATE_URL);
        } catch (e1) {
            intentos.push({ fuente: 'main', ok: false, error: (e1 && e1.message) || 'fail' });
        }
        // Fuente 2: canal dev (solo si la copia instalada va por delante
        // de main: seria absurdo reportar dev si la main ya es mas nueva).
        if (intentos[0].ok && cmpVersion(VER, intentos[0].v) > 0) {
            try {
                const v = await fetchVersionRemota(UPDATE_URL_DEV);
                intentos.push({ fuente: 'dev', ok: true, v });
                const cmp = cmpVersion(v, VER);
                APP.update.remote = v;
                APP.update.canal = 'dev';
                APP.update.url = UPDATE_URL_DEV;
                APP.update.lastCheck = Date.now();
                guardarUpdatePersistente();
                log('update check (dev):', 'instalada', VER, '· remota', v, '· cmp', cmp);
                return finalizarUpdate(cmp, v, 'dev', UPDATE_URL_DEV);
            } catch (e2) {
                intentos.push({ fuente: 'dev', ok: false, error: (e2 && e2.message) || 'fail' });
            }
        }
        // Fuente 3: GitHub API -> contents/changelogs (CORS-friendly).
        // Devuelve JSON con la lista de archivos del directorio; el mas
        // alto en version semantica es la ultima publicada.
        try {
            const v = await fetchVersionDesdeChangelogs();
            if (v) {
                intentos.push({ fuente: 'changelogs', ok: true, v });
                const cmp = cmpVersion(v, VER);
                APP.update.remote = v;
                APP.update.canal = 'main';
                APP.update.url = UPDATE_URL;
                APP.update.lastCheck = Date.now();
                guardarUpdatePersistente();
                log('update check (changelogs):', 'instalada', VER, '· remota', v, '· cmp', cmp);
                return finalizarUpdate(cmp, v, 'main', UPDATE_URL);
            }
            intentos.push({ fuente: 'changelogs', ok: false, error: 'sin changelogs' });
        } catch (e3) {
            intentos.push({ fuente: 'changelogs', ok: false, error: (e3 && e3.message) || 'fail' });
        }
        // Todas las fuentes fallaron -> estado 'unknown'. NO mentimos
        // diciendo que esta al dia.
        APP.update.state = 'unknown';
        APP.update.lastError = intentos.map((i) => i.fuente + ':' + (i.error || '?')).join(', ');
        APP.update.lastCheck = Date.now();
        guardarUpdatePersistente();
        try { console.warn('[Rondo] update check failed:', APP.update.lastError); } catch (_) { /* noop */ }
        pintarActualizacion();
    }
    function finalizarUpdate(cmp, remote, canal, url) {
        APP.update.local = VER;
        if (cmp > 0) {
            APP.update.state = 'available';
            pintarActualizacion();
            if (!APP.update.notificado) {
                APP.update.notificado = true;
                advice('Nueva version disponible',
                    remote + ' (instalada ' + VER + ') · canal ' + canal +
                    '. Abre Ajustes > Avanzado > Buscar actualizaciones para aplicar.');
            }
        } else if (cmp < 0) {
            // Instalada por delante de la remota (build local de desarrollo).
            APP.update.state = 'ahead';
            pintarActualizacion();
        } else {
            APP.update.state = 'current';
            pintarActualizacion();
        }
        // Pintar chip de version despues de cualquier transicion de estado.
        paintVersionChip();
    }
    function guardarUpdatePersistente() {
        try {
            const persist = {
                remote: APP.update.remote || '',
                canal: APP.update.canal || '',
                url: APP.update.url || '',
                state: APP.update.state || '',
                lastCheck: APP.update.lastCheck || 0,
                lastError: APP.update.lastError || ''
            };
            localStorage.setItem('rondo.api.update', JSON.stringify(persist));
        } catch (_) { /* noop */ }
    }
    function cargarUpdatePersistente() {
        try {
            const raw = localStorage.getItem('rondo.api.update');
            if (!raw) return;
            const j = JSON.parse(raw);
            if (!j || typeof j !== 'object') return;
            if (j.remote) APP.update.remote = j.remote;
            if (j.canal) APP.update.canal = j.canal;
            if (j.url) APP.update.url = j.url;
            if (j.lastCheck) APP.update.lastCheck = j.lastCheck;
            if (j.lastError) APP.update.lastError = j.lastError;
            // Solo restauramos 'current'/'unknown'; los estados 'available'
            // y 'ahead' se recomprueban en cada arranque (no se fia de
            // una respuesta cacheada que podria estar desactualizada).
            if (j.state === 'current' || j.state === 'unknown') {
                APP.update.state = j.state;
            }
        } catch (_) { /* noop */ }
    }
    // Tercer fallback: lista el directorio changelogs/ de GitHub.
    // api.github.com SI envia Access-Control-Allow-Origin: * (es una
    // API publica), asi que funciona tanto con fetch como con GM_xmlhttpRequest.
    async function fetchVersionDesdeChangelogs() {
        const res = await httpRequest({
            method: 'GET',
            url: UPDATE_CHANGELOGS_API,
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            timeoutMs: UPDATE_HTTP_TIMEOUT_MS
        });
        if (res.red) throw new Error('red');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let data;
        try { data = JSON.parse(res.texto || '[]'); } catch (_) { return null; }
        if (!Array.isArray(data)) return null;
        // Cada item tiene { name, type, ... }. Filtramos .md y extraemos
        // version del nombre; nos quedamos con la mayor.
        let mejor = null;
        for (const it of data) {
            if (!it || it.type !== 'file') continue;
            const v = parseVersionFromFilename(it.name || '');
            if (!v) continue;
            if (!mejor || cmpVersion(v, mejor) > 0) mejor = v;
        }
        return mejor;
    }
    function recargarUnaVez() {
        if (APP.update.recargando) return;
        APP.update.recargando = true;
        try { location.reload(); } catch (_) { /* noop */ }
    }
    function aplicarActualizacion() {
        const u = APP.update;
        if (u.state === 'available') {
            u.state = 'installed';
            pintarActualizacion();
            const url = u.url || UPDATE_URL;
            // Abre la URL de instalacion: Tampermonkey/Violentmonkey mostrara el
            // dialogo de actualizacion con la nueva version.
            let abierto = null;
            try { abierto = window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
            if (!abierto) { try { location.href = url; return; } catch (_) { /* noop */ } }
            advice('Actualizando a ' + (u.remote || 'la nueva version'), 'confirma la instalacion en Tampermonkey; al volver se recargara sola');
            // Al volver a esta pestaña, recarga para aplicar la version nueva.
            const alVolver = () => {
                setTimeout(recargarUnaVez, 900);
            };
            window.addEventListener('focus', alVolver, { once: true });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) alVolver();
            }, { once: true });
        } else if (u.state === 'installed') {
            recargarUnaVez();
        } else {
            comprobarActualizacion();
        }
    }

    function exportConfig() {
        const data = {
            version: 6, ts: Date.now(),
            config: APP.config, barra: APP.barra,
            seleccion: Array.from(APP.seleccion), dismissed: Array.from(APP.dismissed),
            watchMap: APP.watchMap, limites: APP.limites, rutas: APP.rutas, planes: APP.planes,
            panelSize: APP.panelSize
        };
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })) });
        a.download = 'rondo_config_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('Configuración exportada');
    }
    function importConfig() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json';
        inp.addEventListener('change', () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                try {
                    const d = JSON.parse(r.result);
                    if (!d || typeof d !== 'object') throw new Error('JSON invalido');
                    if (d.config && typeof d.config === 'object') APP.config = deepMerge(d.config, DEFAULTS);
                    writeJSON(LS.cfg, APP.config);
                    if (d.barra && typeof d.barra === 'object') APP.barra = d.barra;
                    writeJSON(LS.barra, APP.barra);
                    if (Array.isArray(d.seleccion)) { APP.seleccion = new Set(d.seleccion); writeSession(SS.seleccion, Array.from(APP.seleccion)); }
                    if (Array.isArray(d.dismissed)) { APP.dismissed = new Set(d.dismissed); writeSession(SS.dismissed, Array.from(APP.dismissed)); }
                    if (d.watchMap && typeof d.watchMap === 'object') {
                        APP.watchMap = d.watchMap;
                        writeSession(SS.watch, APP.watchMap);
                        APP.orden = Object.keys(APP.watchMap);
                        guardarOrden();
                    }
                    if (d.limites && typeof d.limites === 'object') { APP.limites = d.limites; writeSession(SS.limites, APP.limites); }
                    if (d.rutas && typeof d.rutas === 'object') { APP.rutas = d.rutas; guardarRutas(); }
                    if (d.planes && typeof d.planes === 'object') { APP.planes = d.planes; guardarPlanes(); }
                    if (d.panelSize && typeof d.panelSize === 'object') { APP.panelSize = d.panelSize; writeJSON(LS.panelsize, APP.panelSize); }
                    applyBar(); applyTheme(); aplicarModoPanel(); restartTimers();
                    refresh();
                    paintIASwitch();
                    paintTabsChat();
                    paintAlertas();
                    adviceOk('Configuración importada');
                } catch (e) {
                    adviceErr('Error importando', (e && e.message) || '');
                }
            };
            r.readAsText(f);
        });
        inp.click();
    }
    function pintarPerfiles() {
        const sel = byId('rondo-perfil-sel');
        if (!sel) return;
        const nombres = Object.keys(APP.perfiles).sort((a, b) => a.localeCompare(b));
        sel.innerHTML = nombres.length
            ? nombres.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('')
            : '<option value="">(sin perfiles)</option>';
    }
    function guardarPerfil(nombre) {
        if (!nombre) return false;
        APP.perfiles[nombre] = {
            config: JSON.parse(JSON.stringify(APP.config)),
            limites: JSON.parse(JSON.stringify(APP.limites)),
            ts: Date.now()
        };
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        const sel = byId('rondo-perfil-sel');
        if (sel) sel.value = nombre;
        return true;
    }
    function cargarPerfil(nombre) {
        const p = APP.perfiles[nombre];
        if (!p) return false;
        if (p.config) { APP.config = deepMerge(p.config, DEFAULTS); writeJSON(LS.cfg, APP.config); }
        if (p.limites) { APP.limites = p.limites; writeSession(SS.limites, APP.limites); }
        applyBar();
        applyTheme();
        restartTimers();
        refresh();
        return true;
    }
    function borrarPerfil(nombre) {
        if (!nombre || !APP.perfiles[nombre]) return false;
        delete APP.perfiles[nombre];
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        return true;
    }
    function limpiarBitacora() {
        const n = APP.historial.length;
        APP.historial = [];
        writeSession(SS.hist, APP.historial);
        paintCounters();
        if (APP.tab === 'alertas') paintAlertas();
        if (APP.tab === 'dash') paintKPI();
        paintStateBadge();
        return n;
    }
    function testNotify() {
        const previo = APP.noMolestar;
        APP.noMolestar = null;
        pushAlert({
            regla: 'test', sev: 'medio', eco: 'TEST', clave: 'TEST',
            titulo: 'TEST · Aviso de prueba',
            detalle: 'Comprueba voz, pitido, toast y notificacion del navegador',
            hablar: 'Aviso de prueba de la unidad 4340'
        });
        APP.noMolestar = previo;
    }

    /* ====================== MENU CONTEXTUAL ====================== */
    function showMenu(x, y, options, anchor) {
        if (!ctxEl) return;
        const ops = Array.isArray(options) ? options : [];
        ctxEl.setAttribute('role', 'menu');
        ctxEl.innerHTML = ops.map((o) =>
            o.sep ? '<div class="sep" role="separator"></div>' : '<div class="op" role="menuitem" tabindex="-1" data-acc="' + esc(o.id) + '">' + (o.icon ? '<span class="rondo-usym">' + o.icon + '</span> ' : '') + esc(o.label) + '</div>'
        ).join('');
        ctxEl.style.display = 'flex';
        // La regla base de #rondo-contexto lo centra con translate(-50%,-50%);
        // hay que anularla o el menu aparece descuadrado y se sale.
        ctxEl.style.transform = 'none';
        ctxEl.style.left = '0px';
        ctxEl.style.top = '0px';
        const r = ctxEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const m = 8;
        let left, top;
        if (anchor && anchor.getBoundingClientRect) {
            const a = anchor.getBoundingClientRect();
            // Despliega a la derecha de la tarjeta; si no cabe, a la izquierda.
            left = a.right + 6;
            if (left + r.width > vw - m) left = a.left - r.width - 6;
            top = a.top;
            if (top + r.height > vh - m) top = a.bottom - r.height;
        } else {
            left = x; top = y;
        }
        left = clamp(left, m, Math.max(m, vw - r.width - m));
        top = clamp(top, m, Math.max(m, vh - r.height - m));
        ctxEl.style.left = left + 'px';
        ctxEl.style.top = top + 'px';
        ctxEl._options = ops;
    }
    function hideMenu() { if (!ctxEl) return; ctxEl.style.display = 'none'; ctxEl._target = null; }
    // Navegacion por teclado dentro del menu: flechas, Inicio/Fin y
    // Enter/Espacio. El menu se abre tambien con la tecla de menu contextual
    // del teclado, asi que debe poder recorrerse sin raton.
    function rxMoverFocoMenu(delta) {
        if (!ctxEl) return;
        const ops = Array.prototype.slice.call(ctxEl.querySelectorAll('.op'));
        if (!ops.length) return;
        let i = ops.indexOf(document.activeElement);
        if (i < 0) i = delta > 0 ? -1 : ops.length;
        i = (i + delta + ops.length) % ops.length;
        ops[i].focus();
    }
    document.addEventListener('keydown', (e) => {
        if (!ctxEl || ctxEl.style.display !== 'flex') return;
        if (e.key === 'ArrowDown') { rxMoverFocoMenu(1); e.preventDefault(); return; }
        if (e.key === 'ArrowUp') { rxMoverFocoMenu(-1); e.preventDefault(); return; }
        if (e.key === 'Home') { const o = ctxEl.querySelector('.op'); if (o) o.focus(); e.preventDefault(); return; }
        if (e.key === 'End') { const ops = ctxEl.querySelectorAll('.op'); if (ops.length) ops[ops.length - 1].focus(); e.preventDefault(); return; }
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('op')) {
            e.preventDefault();
            document.activeElement.click();
        }
    });
    document.addEventListener('click', (e) => {
        if (ctxEl && ctxEl.style.display !== 'none' && !ctxEl.contains(e.target)) hideMenu();
    });
    function copyToClipboard(text) {
        try { return navigator.clipboard.writeText(String(text || '')); } catch (_) {
            const t = document.createElement('textarea');
            t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
            document.body.appendChild(t); t.select();
            try { document.execCommand('copy'); } catch (e) { /* noop */ }
            document.body.removeChild(t);
            return Promise.resolve();
        }
    }

    /* ====================== TECLAS ====================== */
    // Accesibilidad de las pestañas: roles ARIA, tabindex y navegacion con
    // flechas (izq/der, Home/End). Se aplica en runtime para cubrir tambien
    // la pestaña de chat, que se muestra u oculta segun la IA configurada.
    function rxA11yTabs() {
        const cont = byId('rondo-tabs');
        if (!cont) return;
        cont.setAttribute('role', 'tablist');
        const tabs = Array.prototype.slice.call(cont.querySelectorAll('.tab'));
        tabs.forEach((t) => {
            const name = t.dataset.tab;
            if (!name) return;
            t.setAttribute('role', 'tab');
            t.id = 'rondo-tab-' + name;
            const panel = byId('rondo-wrap-' + name);
            if (panel) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', 'rondo-tab-' + name);
                t.setAttribute('aria-controls', 'rondo-wrap-' + name);
            }
            t.setAttribute('tabindex', t.classList.contains('activo') ? '0' : '-1');
            if (t._rxA11y) return;
            t._rxA11y = true;
            t.addEventListener('keydown', (e) => {
                const visibles = tabs.filter((x) => x.style.display !== 'none');
                const idx = visibles.indexOf(t);
                if (idx < 0) return;
                let next = null;
                if (e.key === 'ArrowRight') next = visibles[(idx + 1) % visibles.length];
                else if (e.key === 'ArrowLeft') next = visibles[(idx - 1 + visibles.length) % visibles.length];
                else if (e.key === 'Home') next = visibles[0];
                else if (e.key === 'End') next = visibles[visibles.length - 1];
                if (!next) return;
                e.preventDefault();
                try { next.focus(); } catch (_) { /* noop */ }
                next.click();
            });
        });
    }
    function bindKeys() {
        rxA11yTabs();
        document.addEventListener('keydown', (e) => {
            const tgt = e.target;
            const enCampo = !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable));
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                // v5.14.8: Alt+7 = Chat IA (solo si la IA esta configurada).
                const tabs = { '1': 'dash', '2': 'unidades', '3': 'alertas', '4': 'rutas', '5': 'zonas', '6': 'caravana', '7': 'chat', '8': 'replay' };
                if (tabs[e.key] && (tabs[e.key] !== 'chat' || (APP.config.iaHabilitada && APP.config.iaApiKey))) {
                    setTab(tabs[e.key]);
                    if (APP.panelHidden) togglePanel();
                    e.preventDefault();
                    return;
                }
                if (e.key.toLowerCase() === 'p') {
                    togglePanel();
                    paintPanel();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'l') {
                    toggleSidebar();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'h') {
                    APP.barra.plegada = !APP.barra.plegada;
                    applyBar();
                    e.preventDefault(); return;
                }
            }
            // '?' abre la ayuda rapida (salvo si el foco esta en un campo de
            // texto, para no impedir escribir el signo).
            if (e.key === '?' && !enCampo) {
                if (ayudaEl) ayudaEl.style.display = 'flex';
                e.preventDefault();
                return;
            }
            if (e.key === 'Escape') {
                // Cierra solo el dialogo superior: primero el flotante, luego
                // el menu contextual, y por ultimo las ventanas modales.
                if (dialogoAbierto()) { cerrarDialogo(); return; }
                if (ctxEl && ctxEl.style.display === 'flex') { hideMenu(); return; }
                const planM = byId('rondo-plan-modal');
                if (planM && planM.classList.contains('abierto')) { cerrarEditorParadas(); return; }
                const glocM = byId('rondo-geocerca-modal');
                if (glocM && glocM.classList.contains('abierto')) { cerrarGeocercaApp(); return; }
                const ventanas = [modalEl, cfgWinEl, ayudaEl];
                for (let i = ventanas.length - 1; i >= 0; i--) {
                    const w = ventanas[i];
                    if (w && w.style.display && w.style.display !== 'none') { w.style.display = 'none'; return; }
                }
            }
        });
    }
/* ====================== EVENTOS ====================== */
    function bindEvents() {
        mainBtn.addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        });
        function abrirModalLista(prefill) {
            const ta = byId('rondo-txt');
            if (ta) ta.value = prefill ? prefill : '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        }
        byId('rondo-cancelar').addEventListener('click', () => {
            modalEl.style.display = 'none';
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.value = '';
        });
        byId('rondo-modal-parse').addEventListener('click', () => {
            const ta = byId('rondo-txt');
            const n = parsearPegado(ta ? ta.value : '');
            if (ta) ta.value = '';
            pintarModalLista();
            paintInfo();
            adviceOk('Pegado', n + ' unidad(es) procesadas');
        });
        byId('rondo-orden-pegado').addEventListener('click', () => aplicarOrdenModo('pegado'));
        byId('rondo-orden-numero').addEventListener('click', () => aplicarOrdenModo('numero'));
        byId('rondo-orden-numero-desc').addEventListener('click', () => aplicarOrdenModo('numero-desc'));
        byId('rondo-orden-alfabetico').addEventListener('click', () => aplicarOrdenModo('alfabetico'));
        byId('rondo-orden-invertir').addEventListener('click', () => aplicarOrdenModo('invertir'));
        inicializarDragLista();
        byId('rondo-modal-clear-txt').addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            ta && ta.focus();
        });
        byId('rondo-modal-add').addEventListener('click', () => {
            const ne = byId('rondo-modal-new-eco');
            const eco = ne ? ne.value.trim() : '';
            if (!eco) { if (ne) ne.focus(); return; }
            agregarALista(eco, '');
            if (ne) ne.value = '';
            pintarModalLista();
            paintInfo();
            if (ne) ne.focus();
        });
        byId('rondo-modal-add-plan').addEventListener('click', () => {
            const ne = byId('rondo-modal-new-eco');
            const eco = ne ? ne.value.trim() : '';
            if (!eco) { if (ne) ne.focus(); return; }
            agregarALista(eco, '');
            if (ne) ne.value = '';
            pintarModalLista();
            paintInfo();
            abrirEditorParadas(eco);
        });
        const unidadesMenu = byId('rondo-unidades-menu');
        if (unidadesMenu) unidadesMenu.addEventListener('click', () => abrirModalLista(''));
        byId('rondo-modal-vaciar').addEventListener('click', () => {
            rondoConfirm('Vaciar la lista', 'Se quitaran todas las unidades de la lista vigilada. Esta accion no se puede deshacer.', () => {
                APP.watchMap = {};
                guardarLista();
                pintarModalLista();
                paintInfo();
                adviceOk('Lista vaciada');
            }, { peligro: true, okText: 'Vaciar' });
        });
        document.getElementById('rondo-modal-lista').addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('button');
            const eco = (b && b.dataset && b.dataset.eco) || (e.target.dataset && e.target.dataset.eco);
            if (!eco) return;
            if (b && b.classList.contains('rondo-plan-open')) {
                abrirEditorParadas(eco);
                return;
            }
            if (b && b.classList.contains('rondo-del')) {
                quitarDeLista(eco);
                pintarModalLista();
                paintInfo();
            }
        });
        // Nota (v5.15.2): los destinos y multipuntos se editan en el editor
        // unificado "Paradas" de cada fila (abrirEditorParadas), no en un
        // input en linea. Pegar texto sigue soportando "eco=destino" y
        // "eco=A | B | C".
        // v6.0.13: buscador de la lista de unidades de la ventana.
        const modalBuscar = byId('rondo-modal-buscar');
        if (modalBuscar) modalBuscar.addEventListener('input', () => pintarModalLista());
        byId('rondo-ejecutar').addEventListener('click', async () => {
            const ta = byId('rondo-txt');
            const texto = ta ? ta.value : '';
            if (texto && texto.trim()) parsearPegado(texto);
            const ecos = Object.keys(APP.watchMap);
            if (!ecos.length) {
                advice('Lista vacía', 'Añade al menos una unidad.');
                return;
            }
            modalEl.style.display = 'none';
            await execList(ecos);
            if (ta) ta.value = '';
        });
        closeBtn.addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        panelBtn.addEventListener('click', () => {
            togglePanel();
            paintPanel();
        });
        if (railEl) railEl.addEventListener('click', togglePanel);
        byId('rondo-sb-main').addEventListener('click', () => mainBtn.click());
        byId('rondo-sb-close').addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        byId('rondo-sb-panel').addEventListener('click', alternarVentanas);
        pintarBotonVentanas();
        byId('rondo-sb-mas').addEventListener('click', () => rxAjustarVentanas(1));
        byId('rondo-sb-menos').addEventListener('click', () => rxAjustarVentanas(-1));
        // Clic fuera del panel en modo barra lateral: se oculta.
        document.addEventListener('pointerdown', (e) => {
            if (!APP.config.ocultarAlClicFuera) return;
            if (e.button !== 0) return;
            if (!esLateral() || APP.panelHidden) return;
            const t = e.target;
            if (!t || !t.closest) return;
            if (esUIPropia(t)) return;
            ocultarSidebar();
        }, true);
        byId('rondo-cerrar-panel').addEventListener('click', () => { if (!APP.panelHidden) togglePanel(); });
        byId('rondo-collapse').addEventListener('click', togglePanel);
        byId('rondo-ayuda-btn').addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        helpBtn.addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        byId('rondo-ayuda-x').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-cerrar').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-config').addEventListener('click', () => {
            ayudaEl.style.display = 'none';
            abrirCfg();
        });
        byId('rondo-refresh').addEventListener('click', (e) => conBusy(e.currentTarget, refresh));
        const rutasTrazar = byId('rondo-rutas-trazar');
        if (rutasTrazar) rutasTrazar.addEventListener('click', (e) => conBusy(e.currentTarget, () => trazarRutasAhora()));
        byId('rondo-csv').addEventListener('click', exportUnits);
        byId('rondo-csv-al').addEventListener('click', exportAlertas);
        byId('rondo-informe').addEventListener('click', () => exportReportePDF());
        const informeMd = byId('rondo-informe-md');
        if (informeMd) informeMd.addEventListener('click', exportInforme);
        const informeGeo = byId('rondo-informe-geo');
        if (informeGeo) informeGeo.addEventListener('click', abrirInformeGeocerca);
        const listaRutasEl = byId('rondo-lista-rutas');
        if (listaRutasEl) {
            listaRutasEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-ruta-del')) {
                    rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                        if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                    }, { peligro: true, okText: 'Eliminar', icon: UIS.close });
                } else if (b.classList.contains('rondo-plan-edit')) abrirEditorParadas(eco);
                else if (b.classList.contains('rondo-ruta-trazar')) {
                    const it = unitByEco(eco);
                    const destino = it ? watchDest(it.info) : '';
                    if (!destino) { adviceWarn('Sin destino', eco); }
                    else {
                        if (it) delete APP.rutaIntentos[it.info.clave];
                        planearRuta(eco, destino, null, (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
                    }
                }
                else if (b.classList.contains('rondo-ruta-mapa')) rxRutaMiniMapa(eco);
                else if (b.classList.contains('rondo-ruta-gmaps')) rxRutaGoogleMaps(eco);
                else if (b.classList.contains('rondo-ruta-geo')) exportRutaGeoJSON(eco);
                else if (b.classList.contains('rondo-traza-geo')) exportTraza(eco);
                else if (b.classList.contains('rondo-ruta-calc')) {
                    const it = unitByEco(eco);
                    const r = it ? rutaDe(it.info) : APP.rutas[eco];
                    if (r) planearRuta(eco, r.plan || r.destinoTexto || (r.destino.lat + ',' + r.destino.lon), null, r.modo);
                }
            });
        }
        const listaViajesEl = byId('rondo-lista-viajes');
        if (listaViajesEl) {
            listaViajesEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-viaje-geo')) exportViajeGeoJSON(eco);
                else if (b.classList.contains('rondo-viaje-re')) analizarViaje(eco, false);
            });
        }
        byId('rondo-captura').addEventListener('click', (e) => conBusy(e.currentTarget, captureSelection));
        byId('rondo-verifica').addEventListener('click', (e) => conBusy(e.currentTarget, () => verifyWindows(false)));
        byId('rondo-sel-all').addEventListener('click', () => { selectAllVisible(); });
        byId('rondo-sel-clear').addEventListener('click', () => { clearSelection(); });
        byId('rondo-verif').addEventListener('click', () => {
            APP.config.verificar = !APP.config.verificar;
            writeJSON(LS.cfg, APP.config);
            restartVerificationLoop();
            advice('Verificación ' + (APP.config.verificar ? 'activada' : 'desactivada'),
                APP.config.verificar ? 'Solo se mantendran las ventanas seleccionadas' : '');
        });
        byId('rondo-filtro').addEventListener('input', (e) => {
            APP.filtro = e.target.value;
            if (APP.tab === 'alertas') paintAlertas();
            else if (APP.tab === 'unidades') paintTabla();
        });
        const selEst = byId('rondo-filtro-estado');
        if (selEst) {
            selEst.value = APP.filtEstado || 'todas';
            selEst.addEventListener('change', (e) => {
                APP.filtEstado = e.target.value;
                writeJSON(LS.filtEstado, APP.filtEstado);
                if (APP.tab === 'unidades') paintTabla();
            });
        }
        const selOrden = byId('rondo-orden-sel');
        if (selOrden) {
            selOrden.addEventListener('change', (e) => {
                const modo = e.target.value;
                if (modo) aplicarOrdenModo(modo);
                e.target.value = '';
            });
        }
        const ordenUnid = byId('rondo-uni-orden');
        if (ordenUnid) {
            ordenUnid.addEventListener('change', () => {
                APP.sortCol = ordenUnid.value || '';
                if (APP.sortCol) APP.sortDir = APP.sortDir || 'asc';
                writeJSON(LS.sortCol, APP.sortCol);
                writeJSON(LS.sortDir, APP.sortDir);
                paintTabla();
            });
        }
        const dirUnid = byId('rondo-uni-dir');
        if (dirUnid) {
            dirUnid.addEventListener('click', () => {
                APP.sortDir = (APP.sortDir === 'desc') ? 'asc' : 'desc';
                writeJSON(LS.sortDir, APP.sortDir);
                paintTabla();
            });
        }
        // Dashboard: KPI clicables (filtran Unidades) y filas de "Requieren atención".
        const dashEl = byId('rondo-dash');
        if (dashEl) {
            dashEl.addEventListener('click', (e) => {
                const item = e.target.closest && e.target.closest('.rondo-atencion-item');
                if (item && item.dataset.eco) { openUnitWindow(item.dataset.eco); return; }
                // v6.0.13: accesos rapidos del dashboard.
                const go = e.target.closest && e.target.closest('.rondo-dash-go');
                if (go && go.dataset.go) { setTab(go.dataset.go); return; }
                // v6.0.13: ranking por avisos -> filtra la pestana de Avisos.
                const topIt = e.target.closest && e.target.closest('.rondo-top-item');
                if (topIt && topIt.dataset.eco) {
                    APP.filtro = topIt.dataset.eco;
                    const inp = byId('rondo-filtro');
                    if (inp) inp.value = topIt.dataset.eco;
                    setTab('alertas');
                    return;
                }
                const kpi = e.target.closest && e.target.closest('.kpi[data-kpi]');
                if (!kpi) return;
                const acc = kpi.dataset.kpi;
                if (acc === 'alertas') { setTab('alertas'); return; }
                if (acc === 'zonas') { setTab('zonas'); return; }
                // v6.0.13: los KPIs nuevos no son estados de unidad; navegan.
                if (acc === 'ruta') { setTab('rutas'); return; }
                if (acc === 'exceso' || acc === 'silenciadas') { setTab('unidades'); return; }
                APP.filtEstado = (acc === 'online') ? 'todas' : acc;
                const selF = byId('rondo-filtro-estado');
                if (selF) selF.value = APP.filtEstado;
                writeJSON(LS.filtEstado, APP.filtEstado);
                setTab('unidades');
            });
        }
        document.addEventListener('pointerdown', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) =>
            t.addEventListener('click', () => setTab(t.dataset.tab)));
        document.querySelectorAll('#rondo-filtroseveridad span').forEach((s) =>
            s.addEventListener('click', () => { APP.filtSever = s.dataset.sev; paintAlertas(); }));
        // Delegacion: click en un boton "IA" dentro de una tarjeta de Avisos.
        // Usamos un solo listener en el contenedor.
        const listaAlertasEl = byId('rondo-lista-alertas');
        if (listaAlertasEl) listaAlertasEl.addEventListener('click', (ev) => {
            const btn = ev.target.closest && ev.target.closest('.rondo-ia-btn');
            if (!btn) return;
            ev.preventDefault();
            aiAnalizarAviso(btn.dataset.clave, +btn.dataset.ts);
        });
        // v5.14.1: chip de version en cabecera. Click fuerza una comprobacion;
        // doble click abre la pestana de Ajustes > Avanzado donde esta el
        // boton 'Buscar actualizaciones' y el detalle completo.
        const verChip = byId('rondo-version-chip');
        if (verChip) {
            let lastClickChip = 0;
            verChip.addEventListener('click', (e) => {
                const ahora = Date.now();
                if (ahora - lastClickChip < 350) {
                    // doble click: abrir Ajustes > Avanzado
                    abrirCfg();
                    const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="avanzado"]');
                    if (tab) tab.click();
                    lastClickChip = 0;
                    return;
                }
                lastClickChip = ahora;
                // Si hay update disponible (o modulos desfasados por cache),
                // aplicar/reinstalar; si no, forzar re-comprobacion.
                if (APP.update && APP.update.state === 'available') {
                    aplicarActualizacion();
                } else if (APP.update && APP.update.state === 'stale') {
                    // Reinstalar fuerza al gestor a re-descargar los @require.
                    try { window.open(UPDATE_URL, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
                    advice('Reinstalando modulos', 'Confirma la instalacion en el gestor de userscripts y recarga la pagina.');
                } else {
                    APP.update.notificado = false;
                    comprobarActualizacion();
                }
                e.stopPropagation();
            });
        }
        byId('rondo-tema').addEventListener('click', () => {
            APP.config.theme = APP.config.theme === 'oscuro' ? 'claro' : (APP.config.theme === 'claro' ? 'auto' : 'oscuro');
            writeJSON(LS.cfg, APP.config);
            applyTheme();
            advice('Tema', APP.config.theme);
        });
        byId('rondo-ia').addEventListener('click', () => toggleIA());
        // Despues de Guardar config: repintar Avisos para que aparezcan/
        // desaparezcan los botones "IA" segun iaHabilitada + iaApiKey.
        // Se hace en cerrarCfg/Guardar abajo, pero nos aseguramos tambien
        // cuando cambia el tema u otras opciones que afectan la UI.
        const _repintarAlertasSi = () => { if (APP.tab === 'alertas') paintAlertas(); };
        byId('rondo-actualizar').addEventListener('click', aplicarActualizacion);
        updateBtn.addEventListener('click', aplicarActualizacion);
        byId('rondo-nmolestar').addEventListener('click', () => { toggleNoMolestar(); });
        byId('rondo-test-btn').addEventListener('click', testNotify);
        byId('rondo-exportar-btn').addEventListener('click', exportConfig);
        byId('rondo-importar-btn').addEventListener('click', importConfig);
        foldBtn.addEventListener('click', () => {
            APP.barra.plegada = !APP.barra.plegada;
            applyBar();
        });
        gripEl.addEventListener('dblclick', () => {
            APP.barra.vertical = !APP.barra.vertical;
            applyBar();
            advice('Barra', APP.barra.vertical ? 'orientacion vertical' : 'orientacion horizontal');
        });

        document.getElementById('rondo-body').addEventListener('change', (e) => {
            if (!e.target.classList.contains('rondo-sel')) return;
            e.stopPropagation();
            const eco = e.target.dataset.eco || '';
            const placa = e.target.dataset.placa || '';
            if (e.target.checked) addToSelection(eco, placa);
            else removeFromSelection(eco, placa);
            const card = e.target.closest('.fila');
            if (card) card.classList.toggle('sel-row', !!e.target.checked);
        });
        document.getElementById('rondo-body').addEventListener('click', (e) => {
            if (e.target.classList && (e.target.classList.contains('rondo-sel') || e.target.closest('label.u-check'))) {
                e.stopPropagation();
                return;
            }
            const card = e.target.closest('.fila');
            if (!card) return;
            const eco = card.dataset.eco;
            if (!eco) return;
            const btn = e.target.closest('button');
            const cl = btn ? btn.classList : null;
            if (cl && cl.contains('rondo-sil')) {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
                return;
            }
            if (cl && cl.contains('u-open')) { openUnitWindow(eco); return; }
            if (cl && cl.contains('u-route')) { abrirEditorParadas(eco); return; }
            if (cl && cl.contains('u-map')) { openMap(eco, 'osm'); return; }
            if (cl && cl.contains('u-watch')) {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); adviceOk('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); adviceOk('Anadida a la lista', eco); }
                paintTabla();
                return;
            }
            openUnitWindow(eco);
        });
        document.getElementById('rondo-body').addEventListener('contextmenu', (e) => {
            const card = e.target.closest && e.target.closest('.fila');
            const eco = card ? card.dataset.eco : null;
            if (!eco) return;
            e.preventDefault();
            const it = unitByEco(eco);
            const lim = it ? limiteDe(it.info) : APP.config.velMax;
            const silenciado = APP.dismissed.has(eco);
            const enLista = APP.watchMap[eco] !== undefined;
            showMenu(e.clientX, e.clientY, [
                { id: 'open', icon: UIS.panel, label: 'Abrir ventana' },
                { id: 'sil', icon: silenciado ? UIS.mute : UIS.alertas, label: silenciado ? 'Reactivar avisos' : 'Silenciar esta unidad' },
                { id: 'verif', icon: UIS.check, label: 'Aplicar verificación' },
                { sep: 1 },
                { id: 'lista', icon: UIS.watch, label: enLista ? 'Quitar de lista vigilada' : 'Añadir a lista vigilada' },
                { id: 'limite', icon: UIS.speed, label: 'Límite de velocidad (actual ' + lim + ' km/h)' },
                { sep: 1 },
                { id: 'ruta-paradas', icon: UIS.route, label: 'Destinos y paradas (multipunto)…' },
                { id: 'ruta-mapa', icon: UIS.map, label: 'Ver ruta en el mini-mapa' },
                { id: 'ruta-gmaps', icon: UIS.pin, label: 'Abrir ruta en Google Maps' },
                { id: 'ruta-osm', icon: UIS.zone, label: 'Abrir ruta en OpenStreetMap' },
                { id: 'ruta-geo', icon: UIS.export, label: 'Exportar ruta GeoJSON' },
                { id: 'ruta-del', icon: UIS.close, label: 'Eliminar ruta' },
                { id: 'traza-geo', icon: UIS.csv, label: 'Exportar traza GeoJSON' },
                { id: 'viaje-analizar', icon: UIS.clock, label: 'Analizar viaje (historial)' },
                { id: 'viaje-geo', icon: UIS.export, label: 'Exportar viaje GeoJSON' },
                { id: 'replay', icon: UIS.moving, label: 'Reproducir el dia (replay)' },
                { id: 'odo-reset', icon: UIS.refresh, label: 'Reiniciar odómetro' },
                { sep: 1 },
                { id: 'mapa-osm', icon: UIS.zone, label: 'Ver en OpenStreetMap' },
                { id: 'mapa-google', icon: UIS.zone, label: 'Ver en Google Maps' },
                { id: 'copy-eco', icon: UIS.copy, label: 'Copiar economico' },
                { id: 'copy-placa', icon: UIS.copy, label: 'Copiar placa' },
                { id: 'copy-coords', icon: UIS.copy, label: 'Copiar coordenadas' }
            ], card);
            ctxEl._target = { eco };
        });
        ctxEl.addEventListener('click', (e) => {
            // El clic puede caer en el icono SVG dentro de la opcion: subimos
            // al .op para leer su data-acc (antes, pulsar el icono no hacia nada).
            const op = e.target.closest && e.target.closest('.op');
            const acc = op ? op.dataset.acc : (e.target.dataset && e.target.dataset.acc);
            if (!acc || !ctxEl._target) return;
            const eco = ctxEl._target.eco;
            if (acc === 'open') openUnitWindow(eco);
            else if (acc === 'sil') {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
            } else if (acc === 'verif') verifyWindows(false);
            else if (acc === 'lista') {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); adviceOk('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); adviceOk('Anadida a la lista', eco); }
                paintTabla();
            } else if (acc === 'limite') {
                const it = unitByEco(eco);
                const actual = it ? limiteDe(it.info) : APP.config.velMax;
                rondoPrompt('Límite de velocidad', 'Para ' + eco + '. Dejalo vacio para usar el global (' + APP.config.velMax + ' km/h).', actual, (val) => {
                    setLimite(eco, val);
                    adviceOk('Límite actualizado', eco + ': ' + (APP.limites[eco] ? APP.limites[eco] + ' km/h' : 'global ' + APP.config.velMax + ' km/h'));
                }, { type: 'number', icon: UIS.speed, okText: 'Guardar' });
            } else if (acc === 'ruta-paradas') abrirEditorParadas(eco);
            else if (acc === 'ruta-mapa') rxRutaMiniMapa(eco);
            else if (acc === 'ruta-gmaps') rxRutaGoogleMaps(eco);
            else if (acc === 'ruta-osm') rxRutaOSM(eco);
            else if (acc === 'ruta-geo') exportRutaGeoJSON(eco);
            else if (acc === 'ruta-del') {
                rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                    if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                }, { peligro: true, okText: 'Eliminar', icon: UIS.close });
            } else if (acc === 'traza-geo') exportTraza(eco);
            else if (acc === 'viaje-analizar') analizarViaje(eco, false);
            else if (acc === 'viaje-geo') exportViajeGeoJSON(eco);
            else if (acc === 'replay') rxReplayAbrirUnidad(eco);
            else if (acc === 'odo-reset') {
                rondoConfirm('Reiniciar odómetro', 'El odómetro acumulado de ' + eco + ' volverá a 0 km.', () => resetOdometro(eco), { okText: 'Reiniciar', icon: UIS.refresh });
            }
            else if (acc === 'mapa-osm') openMap(eco, 'osm');
            else if (acc === 'mapa-google') openMap(eco, 'google');
            else if (acc === 'copy-eco') { copyToClipboard(eco); advice('Copiado', eco); }
            else if (acc === 'copy-placa') {
                const u = APP.unidades.find((x) => parseUnitName(x).eco === eco);
                const placa = u ? parseUnitName(u).placa : '';
                copyToClipboard(placa);
                advice('Copiado', placa || eco);
            } else if (acc === 'copy-coords') {
                const it = unitByEco(eco);
                const txt = (it && it.st.lat != null) ? (it.st.lat + ',' + it.st.lon) : '';
                if (!txt) adviceWarn('Sin ubicación', 'La unidad no reporta coordenadas');
                else { copyToClipboard(txt); advice('Coordenadas copiadas', txt); }
            }
            hideMenu();
        });

        document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((b) => b.addEventListener('click', () => {
            document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((x) => x.classList.remove('activo'));
            b.classList.add('activo');
            const sel = b.dataset.cfg;
            document.querySelectorAll('#rondo-config .cfg-pane').forEach((p) => {
                p.style.display = (p.dataset.cfg === sel) ? '' : 'none';
            });
            // v6.0.11: recuerda la seccion para reabrir Ajustes donde estaba.
            writeSession(SS.cfgTab, sel);
        }));
        // Activa una seccion de Ajustes por nombre (o General si no existe).
        const rxCfgTab = (sel) => {
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="' + sel + '"]') ||
                document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="general"]');
            if (tab) tab.click();
        };

        // v6.0.11: buscador de ajustes. Filtra las filas de todas las
        // pestañas a la vez y salta a la primera que tenga coincidencias.
        // Al vaciar el campo se restaura la pestaña activa y todas las filas.
        const cfgBuscar = byId('rondo-cfg-buscar');
        const cfgBuscarAplicar = () => {
            if (!cfgBuscar) return;
            const cont = byId('rondo-cfg-buscar-count');
            const panes = Array.prototype.slice.call(document.querySelectorAll('#rondo-config .cfg-pane'));
            const q = norm(cfgBuscar.value || '');
            if (!q) {
                panes.forEach((p) => {
                    Array.prototype.forEach.call(p.querySelectorAll('label, h4, .row-grid'), (el) => el.classList.remove('oculto'));
                });
                const act = document.querySelector('#rondo-cfg-tabs .cfg-tab.activo') || document.querySelector('#rondo-cfg-tabs .cfg-tab');
                if (act) act.click();
                if (cont) cont.textContent = '';
                return;
            }
            let total = 0, primera = null;
            panes.forEach((p) => {
                Array.prototype.forEach.call(p.querySelectorAll('h4'), (h) => h.classList.add('oculto'));
                let visibles = 0;
                Array.prototype.forEach.call(p.querySelectorAll('label'), (l) => {
                    const inp = l.querySelector('input,select,textarea');
                    const hay = norm(l.textContent).indexOf(q) >= 0 || (inp && norm(inp.id).indexOf(q) >= 0);
                    l.classList.toggle('oculto', !hay);
                    if (!hay) return;
                    visibles++;
                    // Muestra el titulo (h4) de la seccion a la que pertenece.
                    let prev = l.previousElementSibling, guard = 0;
                    while (prev && prev.tagName !== 'H4' && guard < 60) { prev = prev.previousElementSibling; guard++; }
                    if (prev && prev.tagName === 'H4') prev.classList.remove('oculto');
                });
                // Los grupos (.row-grid) y su titulo se ocultan si no queda fila.
                Array.prototype.forEach.call(p.querySelectorAll('.row-grid'), (grid) => {
                    const hay = !!grid.querySelector('label:not(.oculto)');
                    grid.classList.toggle('oculto', !hay);
                    if (hay) {
                        const prev = grid.previousElementSibling;
                        if (prev && prev.tagName === 'H4') prev.classList.remove('oculto');
                    }
                });
                p.style.display = visibles ? '' : 'none';
                total += visibles;
                if (visibles && !primera) primera = p.dataset.cfg;
            });
            if (primera) {
                document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((b) => {
                    b.classList.toggle('activo', b.dataset.cfg === primera);
                });
            }
            if (cont) cont.textContent = total ? (total + ' ajuste(s)') : 'Sin resultados';
        };
        if (cfgBuscar) {
            cfgBuscar.addEventListener('input', cfgBuscarAplicar);
            cfgBuscar.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { cfgBuscar.value = ''; cfgBuscarAplicar(); }
            });
        }

        // v6.0.11: restaurar los ajustes a los valores por defecto (sin borrar
        // datos: lista vigilada, rutas, odometro y perfiles se conservan).
        const cfgReset = byId('rondo-cfg-reset');
        if (cfgReset) cfgReset.addEventListener('click', () => {
            abrirDialogo({
                titulo: 'Restaurar valores por defecto',
                html: '<div style="text-align:left;font-size:12.5px;line-height:1.5">Se restableceran <b>todas las opciones</b> a su valor por defecto.<br><br>No se borran tus datos (lista vigilada, rutas, odometro ni perfiles).</div>',
                cancelText: 'Cancelar',
                okText: 'Restaurar',
                onOk: () => {
                    APP.config = deepMerge({}, DEFAULTS);
                    writeJSON(LS.cfg, APP.config);
                    try { applyTheme(); } catch (_) { /* noop */ }
                    try { aplicarModoPanel(); } catch (_) { /* noop */ }
                    try { applyBar(); } catch (_) { /* noop */ }
                    try { paintIASwitch(); } catch (_) { /* noop */ }
                    try { abrirCfg(); } catch (_) { /* noop */ }
                    adviceOk('Ajustes restaurados', 'Se aplicaron los valores por defecto.');
                }
            });
        });

        function abrirCfg() {
            limpiarCfgDirty();
            // v6.0.11: reabre en la ultima seccion usada (por defecto, General).
            try { rxCfgTab(readSession(SS.cfgTab, 'general')); } catch (_) { /* noop */ }
            const g = (id) => byId(id);
            g('c-poll').value = APP.config.pollMs;
            g('c-off').value = APP.config.offlineMin;
            g('c-cd').value = APP.config.cooldownMin;
            g('c-gps').value = APP.config.gpsMin;
            g('c-stop').value = APP.config.stopMin;
            g('c-zona').value = APP.config.zonaMin;
            g('c-desco').value = APP.config.descoMin;
            g('c-vel').value = APP.config.velMax;
            g('c-toastSeg').value = APP.config.toastSeg;
            g('c-sevmin').value = APP.config.severidadMin;
            g('c-voz').checked = !!APP.config.voice;
            g('c-voz-lang').value = APP.config.voiceLang || 'es-MX';
            g('c-voz-motor').value = APP.config.vozMotor || 'web';
            const vozTestTextEl = byId('c-voz-test-text');
            if (vozTestTextEl) vozTestTextEl.value = APP.config.vozTest || DEFAULTS.vozTest;
            poblarVozSelect();
            // Pestana IA: precarga valores. La API key se enmascara al
            // mostrarla (nunca el texto plano en el DOM).
            const iaOnEl = byId('c-ia-on');
            if (iaOnEl) iaOnEl.checked = !!APP.config.iaHabilitada;
            const iaProvEl = byId('c-ia-prov');
            if (iaProvEl) iaProvEl.value = APP.config.iaProveedor || 'deepseek';
            const iaKeyEl = byId('c-ia-key');
            if (iaKeyEl) iaKeyEl.value = APP.config.iaApiKey ? '********' : '';
            const iaEndpointEl = byId('c-ia-endpoint');
            if (iaEndpointEl) iaEndpointEl.value = APP.config.iaEndpoint || '';
            const iaModeloEl = byId('c-ia-modelo');
            if (iaModeloEl) iaModeloEl.value = APP.config.iaModelo || '';
            const iaTempEl = byId('c-ia-temp');
            if (iaTempEl) iaTempEl.value = (APP.config.iaTemperature == null ? '' : APP.config.iaTemperature);
            const iaMaxTokEl = byId('c-ia-maxtok');
            if (iaMaxTokEl) iaMaxTokEl.value = (APP.config.iaMaxTokens == null ? '' : APP.config.iaMaxTokens);
            const iaRadioEl = byId('c-ia-radio');
            if (iaRadioEl) iaRadioEl.value = APP.config.iaRadioPoisM != null ? APP.config.iaRadioPoisM : 250;
            const iaTimeoutEl = byId('c-ia-timeout');
            if (iaTimeoutEl) iaTimeoutEl.value = APP.config.iaTimeoutS != null ? APP.config.iaTimeoutS : 25;
            // v6.0.9: contexto ampliado por API y reporte del servidor.
            const iaCtxEl = byId('c-ia-contexto-api');
            if (iaCtxEl) iaCtxEl.checked = APP.config.iaContextoAPI !== false;
            const iaRepEl = byId('c-ia-reporte-servidor');
            if (iaRepEl) iaRepEl.checked = !!APP.config.iaReporteServidor;
            // v5.14: analisis en lote + resumen + limite diario.
            const iaResumenEl = byId('c-ia-resumen-on');
            if (iaResumenEl) iaResumenEl.checked = !!APP.config.iaResumenInforme;
            const iaBatchmaxEl = byId('c-ia-batchmax');
            if (iaBatchmaxEl) iaBatchmaxEl.value = APP.config.iaBatchMax != null ? APP.config.iaBatchMax : DEFAULTS.iaBatchMax;
            const iaLimiteEl = byId('c-ia-limite');
            if (iaLimiteEl) iaLimiteEl.value = APP.config.iaLimiteDiario != null ? APP.config.iaLimiteDiario : DEFAULTS.iaLimiteDiario;
            paintIAUso();
            const iaStatusEl = byId('c-ia-status');
            if (iaStatusEl) iaStatusEl.textContent = '';
            actualizarNotaProveedorIA();
            g('c-beep').checked = !!APP.config.beep;
            g('c-beep-vol').value = APP.config.beepVol;
            g('c-beep-vol').step = '0.01';
            g('c-desktop').checked = !!APP.config.desktop;
            g('c-watchAll').checked = !!APP.config.watchAll;
            g('c-auto').checked = !!APP.config.autoOpen;
            g('c-zonas').checked = !!APP.config.loadZones;
            g('c-geo').checked = !!APP.config.geocode;
            g('c-hist').checked = !!APP.config.historico;
            const cGeoPais = byId('c-geo-pais'); if (cGeoPais) cGeoPais.value = APP.config.geoPais || '';
            const cGeoBias = byId('c-geo-bias'); if (cGeoBias) cGeoBias.value = (APP.config.geoBiasKm != null ? APP.config.geoBiasKm : DEFAULTS.geoBiasKm);
            g('c-verif').checked = !!APP.config.verificar;
            g('c-verif-seg').value = APP.config.verifSeg;
            g('c-tema').value = APP.config.theme;
            g('c-dens').value = APP.config.density;
            g('c-escala').value = String(normalizarEscala(APP.config.escalaUI));
            g('c-acento').value = APP.config.acento || '#850D22';
            // v6.0.14: tema heredado de la plataforma + info de lo detectado.
            const cTemaPlat = g('c-tema-plat');
            if (cTemaPlat) cTemaPlat.checked = !!APP.config.temaPlataforma;
            const platInfo = g('rondo-plat-info');
            if (platInfo) {
                const ac = rxPlatAcento();
                const nom = rxPlatNombre();
                const idi = rxPlatIdioma();
                platInfo.textContent = (nom || ac)
                    ? ('Plataforma detectada: ' + (nom || 'sin nombre') + (ac ? ' · acento ' + ac : '') + (idi ? ' · idioma ' + idi : ''))
                    : 'No se detectaron datos de la plataforma (no pasa nada: usa tu propio color de acento).';
            }
            const cEstiloPag = g('c-estilo-pag');
            if (cEstiloPag) cEstiloPag.checked = !!APP.config.estiloPagina;
            const cIdiomaPlat = g('c-idioma-plat');
            if (cIdiomaPlat) cIdiomaPlat.checked = !!APP.config.idiomaPlataforma;
            g('c-coords').checked = !!APP.config.mostrarCoords;
            g('c-contornos').checked = !!APP.config.contornos;
            g('c-contorno-horas').value = APP.config.contornoHoras;
            g('c-panel-clicfuera').checked = !!APP.config.ocultarAlClicFuera;
            g('c-confirmar-cierre').checked = !!APP.config.confirmarCierre;
            g('c-panel-lado').value = APP.config.panelLado || 'derecha';
            g('c-panel-ancho').value = APP.config.panelAncho || 460;
            g('c-r-off').checked = !!APP.config.reglas.offline;
            g('c-r-gps').checked = !!APP.config.reglas.gpsPerdido;
            g('c-r-det').checked = !!APP.config.reglas.detenido;
            g('c-r-zona').checked = !!APP.config.reglas.zona;
            g('c-r-geo').checked = !!APP.config.reglas.geocerca;
            const cRGeoDet = byId('c-r-geo-det'); if (cRGeoDet) cRGeoDet.checked = !!APP.config.reglas.geocercaDetenido;
            const cGeoDetMin = byId('c-geo-det-min');
            if (cGeoDetMin) cGeoDetMin.value = APP.config.geocercaDetenidoMin != null ? APP.config.geocercaDetenidoMin : DEFAULTS.geocercaDetenidoMin;
            const cGeoEst = byId('c-geo-estable');
            if (cGeoEst) cGeoEst.value = APP.config.geocercaEstableSeg != null ? APP.config.geocercaEstableSeg : DEFAULTS.geocercaEstableSeg;
            // v6.12: la alerta de geocercas se configura en Zonas; aqui solo
            // el interruptor, para poder apagarla sin ir a la pestana.
            const cRGeoAl = byId('c-r-geo-alerta'); if (cRGeoAl) cRGeoAl.checked = !!APP.config.reglas.geoAlerta;
            g('c-r-des').checked = !!APP.config.reglas.destino;
            g('c-r-dis').checked = !!APP.config.reglas.desconexion;
            g('c-r-vel').checked = !!APP.config.reglas.velocidad;
            const cRVelSost = g('c-r-vel-sost');
            if (cRVelSost) cRVelSost.checked = !!APP.config.reglas.velocidadSostenida;
            const cVelSostKmh = g('c-vel-sost-kmh');
            if (cVelSostKmh) cVelSostKmh.value = APP.config.velSostenidaKmh != null ? APP.config.velSostenidaKmh : DEFAULTS.velSostenidaKmh;
            const cVelSostMin = g('c-vel-sost-min');
            if (cVelSostMin) cVelSostMin.value = APP.config.velSostenidaMin != null ? APP.config.velSostenidaMin : DEFAULTS.velSostenidaMin;
            g('c-r-riesgo').checked = !!APP.config.reglas.riesgoSinSenal;
            const cRRiesgoPre = g('c-r-riesgo-pre'); if (cRRiesgoPre) cRRiesgoPre.checked = !!APP.config.reglas.riesgoPredict;
            g('c-riesgo-url').value = APP.config.riesgoUrl || '';
            g('c-riesgo-formato').value = APP.config.riesgoFormato || 'auto';
            g('c-riesgo-min').value = APP.config.riesgoMinScore;
            g('c-riesgo-mul').value = APP.config.riesgoRadioMul;
            // v5.14: regla predictiva.
            const cRiesgoPreMin = g('c-riesgo-pre-min');
            if (cRiesgoPreMin) cRiesgoPreMin.value = APP.config.riesgoPredictMinScore != null ? APP.config.riesgoPredictMinScore : DEFAULTS.riesgoPredictMinScore;
            const cRiesgoPreBuffer = g('c-riesgo-pre-buffer');
            if (cRiesgoPreBuffer) cRiesgoPreBuffer.value = APP.config.riesgoPredictBufferM != null ? APP.config.riesgoPredictBufferM : DEFAULTS.riesgoPredictBufferM;
            const cRiesgoPreVel = g('c-riesgo-pre-vel');
            if (cRiesgoPreVel) cRiesgoPreVel.value = APP.config.riesgoPredictVelMin != null ? APP.config.riesgoPredictVelMin : DEFAULTS.riesgoPredictVelMin;
            const cRiesgoPreCd = g('c-riesgo-pre-cooldown');
            if (cRiesgoPreCd) cRiesgoPreCd.value = APP.config.riesgoPredictCooldownS != null ? APP.config.riesgoPredictCooldownS : DEFAULTS.riesgoPredictCooldownS;
            const cRiesgoPreNoct = g('c-riesgo-pre-noct');
            if (cRiesgoPreNoct) cRiesgoPreNoct.checked = !!APP.config.riesgoPredictNocturno;
            const cRiesgoPreDesde = g('c-riesgo-pre-desde');
            if (cRiesgoPreDesde) cRiesgoPreDesde.value = APP.config.riesgoPredictNocturnoDesde || DEFAULTS.riesgoPredictNocturnoDesde;
            const cRiesgoPreHasta = g('c-riesgo-pre-hasta');
            if (cRiesgoPreHasta) cRiesgoPreHasta.value = APP.config.riesgoPredictNocturnoHasta || DEFAULTS.riesgoPredictNocturnoHasta;
            g('c-r-desvio').checked = !!APP.config.reglas.desvio;
            g('c-desvio-m').value = APP.config.desvioM;
            g('c-desvio-min').value = APP.config.desvioMin;
            if (g('c-desvio-municipio')) g('c-desvio-municipio').checked = !!APP.config.desvioMunicipio;
            if (g('c-desvio-municipio-m')) g('c-desvio-municipio-m').value = APP.config.desvioMunicipioM;
            if (g('c-parada-llegada')) g('c-parada-llegada').value = APP.config.paradaLlegadaM;
            g('c-r-retorno').checked = !!APP.config.reglas.retorno;
            g('c-retorno-m').value = APP.config.retornoM;
            g('c-retorno-pct').value = APP.config.retornoPct;
            g('c-r-giro').checked = !!APP.config.reglas.giroU;
            g('c-giro-grados').value = APP.config.giroGrados;
            g('c-giro-min').value = APP.config.giroMin;
            g('c-r-demora-base').checked = !!APP.config.reglas.demoraBase;
            g('c-demora-base-min').value = APP.config.demoraBaseMin;
            g('c-partida-horas').value = APP.config.partidaHoras;
            g('c-parada-min').value = APP.config.paradaMin;
            g('c-hist-horas').value = APP.config.historialHoras;
            g('c-analizar-auto').checked = !!APP.config.analizarAuto;
            g('c-osrm').checked = !!APP.config.osrm;
            g('c-overpass').checked = !!APP.config.overpass;
            g('c-trazado').checked = !!APP.config.trazado;
            g('c-trazado-max').value = APP.config.trazadoMax;
            g('c-auto-ruta').checked = APP.config.autoRuta !== false;
            g('c-auto-ruta-modo').value = APP.config.autoRutaModo || 'osrm';
            g('c-caravana-m').value = APP.config.caravanaM;
            g('c-caravana-cerca').value = APP.config.caravanaCercaM;
            g('c-hor-on').checked = !!APP.config.horario.on;
            g('c-hor-a').value = APP.config.horario.desde;
            g('c-hor-b').value = APP.config.horario.hasta;
            pintarPerfiles();
            pintarInfoUpdate();
            const N = PAGE.Notification;
            if (APP.config.desktop && typeof N !== 'undefined' && N.permission === 'default') {
                N.requestPermission();
            }
            cfgWinEl.style.display = 'flex';
        }
        byId('rondo-cfg-btn').addEventListener('click', abrirCfg);
        const vozMotorEl = byId('c-voz-motor');
        if (vozMotorEl) vozMotorEl.addEventListener('change', () => poblarVozSelect());
        const vozLangEl = byId('c-voz-lang');
        if (vozLangEl) vozLangEl.addEventListener('change', () => {
            if ((byId('c-voz-motor') || {}).value === 'online') poblarVozSelect();
        });
        // Probar voz / Detener: lee la frase configurada con el motor, idioma
        // y voz actuales. El texto se guarda en APP.config.vozTest al pulsar
        // Guardar en la pestana de Avisos.
        const vozTestBtn = byId('c-voz-test');
        if (vozTestBtn) vozTestBtn.addEventListener('click', () => probarVoz());
        const vozStopBtn = byId('c-voz-detener');
        if (vozStopBtn) vozStopBtn.addEventListener('click', () => _ttsDetener());

        // Pestana IA: probar conexion y borrar API key.
        const iaTestBtn = byId('c-ia-test');
        if (iaTestBtn) iaTestBtn.addEventListener('click', () => aiProbar());
        const iaClearBtn = byId('c-ia-clear');
        if (iaClearBtn) iaClearBtn.addEventListener('click', () => {
            APP.config.iaApiKey = '';
            writeJSON(LS.cfg, APP.config);
            const k = byId('c-ia-key'); if (k) k.value = '';
            const s = byId('c-ia-status');
            if (s) { s.textContent = 'API key borrada.'; s.style.color = 'var(--rondo-fg-dim)'; }
            paintIASwitch();
            paintIABatchBtn();
            paintIAUso();
            if (APP.tab === 'alertas') paintAlertas();
        });
        // v5.14: analisis en lote desde la cabecera de Avisos.
        const iaBatchBtn = byId('rondo-ia-batch');
        if (iaBatchBtn) iaBatchBtn.addEventListener('click', () => aiAnalizarLoteUI());
        const iaFlotaBtn = byId('rondo-ia-flota');
        if (iaFlotaBtn) iaFlotaBtn.addEventListener('click', () => aiFlotaUI());
        // v5.14: deteccion de patrones desde la pestana IA.
        const iaPatronesBtn = byId('c-ia-patrones');
        if (iaPatronesBtn) iaPatronesBtn.addEventListener('click', () => aiPatronesUI());
        // v5.14.6: chat con IA (send, clear, textarea autoresize, enter).
        const chatSendBtn = byId('rondo-chat-send');
        if (chatSendBtn) chatSendBtn.addEventListener('click', () => chatEnviar());
        const chatInput = byId('rondo-chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    chatEnviar();
                }
            });
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(140, chatInput.scrollHeight) + 'px';
            });
        }
        const chatClearBtn = byId('rondo-chat-clear');
        if (chatClearBtn) chatClearBtn.addEventListener('click', () => {
            rondoConfirm('Limpiar conversacion', 'Se borraran todos los mensajes del chat actual.', () => limpiarChat());
        });
        // v5.14.7: toggle "Toda la flota" (alcance del contexto que ve la IA).
        const chatAllEl = byId('rondo-chat-all');
        if (chatAllEl) {
            chatAllEl.checked = !!APP.config.chatTodaFlota;
            chatAllEl.addEventListener('change', () => {
                APP.config.chatTodaFlota = !!chatAllEl.checked;
                writeJSON(LS.cfg, APP.config);
                adviceOk('Alcance del chat', chatAllEl.checked
                    ? 'La IA vera toda la flota que reporta en la plataforma.'
                    : 'La IA vera solo las unidades que vigilas.');
            });
        }
        // Al cambiar cualquier toggle/input de IA, refresca el contador de uso.
        ['c-ia-batchmax', 'c-ia-limite'].forEach((id) => {
            const el = byId(id);
            if (el) el.addEventListener('input', () => paintIAUso());
        });
        // Al cambiar de proveedor, actualizamos la nota (keys esperadas) y
        // los placeholders de endpoint/modelo. No borramos lo que el user
        // haya escrito: solo ajustamos las pistas visuales.
        const iaProvSel = byId('c-ia-prov');
        if (iaProvSel) iaProvSel.addEventListener('change', () => actualizarNotaProveedorIA());
        // Las voces del navegador cargan de forma asincrona.
        if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                if (cfgWinEl && cfgWinEl.style.display !== 'none' && (byId('c-voz-motor') || {}).value === 'web') poblarVozSelect();
            };
        }
        byId('c-lista-editar').addEventListener('click', () => {
            cfgWinEl.style.display = 'none';
            const prefill = Object.keys(APP.watchMap).map((k) =>
                APP.watchMap[k] ? k + '=' + APP.watchMap[k] : k
            ).join('\n');
            abrirModalLista(prefill);
        });
        function cerrarCfg() {
            if (cfgDirty) {
                rondoConfirm('Descartar cambios', 'Tienes cambios sin guardar en la configuracion. ¿Quieres descartarlos?', () => {
                    limpiarCfgDirty();
                    applyTheme(); // revierte la vista previa de escala/tema
                    cfgWinEl.style.display = 'none';
                }, { peligro: true, okText: 'Descartar', icon: UIS.gear });
            } else {
                cfgWinEl.style.display = 'none';
            }
        }
        byId('rondo-cfg-cerrar').addEventListener('click', cerrarCfg);
        byId('rondo-cfg-cerrar-x').addEventListener('click', cerrarCfg);
        const cfgBody = byId('rondo-cfg-body');
        if (cfgBody) {
            cfgBody.addEventListener('input', marcarCfgDirty);
            cfgBody.addEventListener('change', marcarCfgDirty);
        }
        // Vista previa de la escala de UI mientras se elige (se confirma al Guardar).
        const selEscala = byId('c-escala');
        if (selEscala) {
            selEscala.addEventListener('change', (e) => {
                document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(e.target.value)));
            });
        }
        byId('rondo-cfg-guardar').addEventListener('click', () => {
            const g = (id) => byId(id);
            const cf = APP.config;
            cf.pollMs = Math.max(2000, isoNum(g('c-poll').value, cf.pollMs));
            cf.offlineMin = Math.max(1, isoNum(g('c-off').value, cf.offlineMin));
            cf.cooldownMin = Math.max(1, isoNum(g('c-cd').value, cf.cooldownMin));
            cf.gpsMin = Math.max(1, isoNum(g('c-gps').value, cf.gpsMin));
            cf.stopMin = Math.max(1, isoNum(g('c-stop').value, cf.stopMin));
            cf.zonaMin = Math.max(1, isoNum(g('c-zona').value, cf.zonaMin));
            cf.descoMin = Math.max(1, isoNum(g('c-desco').value, cf.descoMin));
            cf.velMax = Math.max(10, isoNum(g('c-vel').value, cf.velMax));
            cf.toastSeg = Math.max(3, isoNum(g('c-toastSeg').value, cf.toastSeg));
            cf.severidadMin = g('c-sevmin').value;
            // Texto del boton Probar voz (truncado a 180 chars por el input).
            const vozTestEl = byId('c-voz-test-text');
            if (vozTestEl) cf.vozTest = String(vozTestEl.value || '').trim().slice(0, 180) || DEFAULTS.vozTest;
            // IA: recoge config. La API key se acepta tal cual (la pega el
            // usuario) pero si llega enmascarada ('********') se respeta
            // la anterior.
            const iaOnEl = byId('c-ia-on'); if (iaOnEl) cf.iaHabilitada = !!iaOnEl.checked;
            const iaProvEl = byId('c-ia-prov'); if (iaProvEl) cf.iaProveedor = iaProvEl.value || 'deepseek';
            const iaKeyEl = byId('c-ia-key');
            if (iaKeyEl) {
                const v = String(iaKeyEl.value || '').trim();
                if (v && v !== '********') cf.iaApiKey = v;
                // Si el usuario la dejo enmascarada y no la cambio, se conserva.
            }
            const iaEndpointEl = byId('c-ia-endpoint'); if (iaEndpointEl) cf.iaEndpoint = String(iaEndpointEl.value || '').trim().slice(0, 300);
            const iaModeloEl = byId('c-ia-modelo'); if (iaModeloEl) cf.iaModelo = String(iaModeloEl.value || '').trim().slice(0, 120);
            const iaTempEl = byId('c-ia-temp');
            if (iaTempEl) {
                const v = String(iaTempEl.value || '').trim();
                cf.iaTemperature = (v === '' || !isFinite(Number(v))) ? '' : clamp(Number(v), 0, 2);
            }
            const iaMaxTokEl = byId('c-ia-maxtok');
            if (iaMaxTokEl) {
                const v = String(iaMaxTokEl.value || '').trim();
                cf.iaMaxTokens = (v === '' || !isFinite(Number(v))) ? '' : clamp(Math.round(Number(v)), 64, 4000);
            }
            const iaRadioEl = byId('c-ia-radio'); if (iaRadioEl) cf.iaRadioPoisM = clamp(isoNum(iaRadioEl.value, 250), 50, 2000);
            const iaTimeoutEl = byId('c-ia-timeout'); if (iaTimeoutEl) cf.iaTimeoutS = clamp(isoNum(iaTimeoutEl.value, 25), 5, 120);
            const iaCtxEl = byId('c-ia-contexto-api'); if (iaCtxEl) cf.iaContextoAPI = !!iaCtxEl.checked;
            const iaRepEl = byId('c-ia-reporte-servidor'); if (iaRepEl) cf.iaReporteServidor = !!iaRepEl.checked;
            // v5.14: analisis en lote + resumen narrativo.
            const iaResumenEl = byId('c-ia-resumen-on'); if (iaResumenEl) cf.iaResumenInforme = !!iaResumenEl.checked;
            const iaBatchmaxEl = byId('c-ia-batchmax'); if (iaBatchmaxEl) cf.iaBatchMax = clamp(isoNum(iaBatchmaxEl.value, DEFAULTS.iaBatchMax), 5, 50);
            const iaLimiteEl = byId('c-ia-limite'); if (iaLimiteEl) cf.iaLimiteDiario = clamp(isoNum(iaLimiteEl.value, DEFAULTS.iaLimiteDiario), 0, 10000);
            cf.voice = g('c-voz').checked;
            cf.voiceLang = g('c-voz-lang').value || DEFAULTS.voiceLang;
            cf.vozMotor = g('c-voz-motor').value || 'web';
            const vozSel = g('c-voz-voice');
            if (vozSel) {
                if (cf.vozMotor === 'online') cf.vozOnline = vozSel.value || DEFAULTS.vozOnline;
                else cf.voiceVoice = vozSel.value || '';
            }
            cf.vozVolumen = 1;
            cf.beep = g('c-beep').checked;
            cf.beepVol = clamp(parseFloat(g('c-beep-vol').value) || cf.beepVol || DEFAULTS.beepVol, 0, 1);
            cf.desktop = g('c-desktop').checked;
            cf.watchAll = g('c-watchAll').checked;
            cf.autoOpen = g('c-auto').checked;
            cf.loadZones = g('c-zonas').checked;
            cf.geocode = g('c-geo').checked;
            cf.historico = g('c-hist').checked;
            cf.geoPais = String((g('c-geo-pais') || {}).value || '').trim().toLowerCase().replace(/[^a-z,]/g, '');
            cf.geoBiasKm = clamp(isoNum((g('c-geo-bias') || {}).value, cf.geoBiasKm), 0, 2000);
            cf.verificar = g('c-verif').checked;
            cf.verifSeg = Math.max(2, isoNum(g('c-verif-seg').value, cf.verifSeg));
            cf.theme = g('c-tema').value;
            cf.density = g('c-dens').value;
            cf.escalaUI = normalizarEscala(g('c-escala').value);
            cf.acento = g('c-acento').value;
            const cTemaPlat2 = g('c-tema-plat');
            cf.temaPlataforma = !!(cTemaPlat2 && cTemaPlat2.checked);
            const cEstiloPag2 = g('c-estilo-pag');
            cf.estiloPagina = !!(cEstiloPag2 && cEstiloPag2.checked);
            const cIdiomaPlat2 = g('c-idioma-plat');
            cf.idiomaPlataforma = !!(cIdiomaPlat2 && cIdiomaPlat2.checked);
            // v6.0.14: si se usa el idioma de la plataforma, ajusta la voz.
            if (cf.idiomaPlataforma) {
                const vl = rxVoiceLangPlataforma();
                if (vl) cf.voiceLang = vl;
            }
            cf.mostrarCoords = g('c-coords').checked;
            cf.contornos = g('c-contornos').checked;
            cf.contornoHoras = Math.max(1, isoNum(g('c-contorno-horas').value, cf.contornoHoras));
            cf.reglas.offline = g('c-r-off').checked;
            cf.reglas.gpsPerdido = g('c-r-gps').checked;
            cf.reglas.detenido = g('c-r-det').checked;
            cf.reglas.zona = g('c-r-zona').checked;
            cf.reglas.geocerca = g('c-r-geo').checked;
            const geoDetEl = g('c-r-geo-det'); if (geoDetEl) cf.reglas.geocercaDetenido = !!geoDetEl.checked;
            const geoDetMinEl = g('c-geo-det-min');
            if (geoDetMinEl) cf.geocercaDetenidoMin = clamp(isoNum(geoDetMinEl.value, DEFAULTS.geocercaDetenidoMin), 1, 240);
            const geoEstEl = g('c-geo-estable');
            if (geoEstEl) cf.geocercaEstableSeg = clamp(isoNum(geoEstEl.value, DEFAULTS.geocercaEstableSeg), 2, 300);
            // v6.12: interruptor de la alerta de geocercas (el resto vive en
            // la pestana Zonas). Cambiarlo reinicia los episodios medidos.
            const rGeoAlEl = g('c-r-geo-alerta');
            if (rGeoAlEl) {
                const antes = !!cf.reglas.geoAlerta;
                cf.reglas.geoAlerta = !!rGeoAlEl.checked;
                if (antes !== cf.reglas.geoAlerta) geoAlertaReinicia();
            }
            cf.reglas.destino = g('c-r-des').checked;
            cf.reglas.desconexion = g('c-r-dis').checked;
            cf.reglas.velocidad = g('c-r-vel').checked;
            cf.reglas.velocidadSostenida = g('c-r-vel-sost').checked;
            cf.velSostenidaKmh = clamp(isoNum(g('c-vel-sost-kmh').value, DEFAULTS.velSostenidaKmh), 10, 400);
            cf.velSostenidaMin = clamp(isoNum(g('c-vel-sost-min').value, DEFAULTS.velSostenidaMin), 1, 120);
            cf.reglas.riesgoSinSenal = g('c-r-riesgo').checked;
            const riesgoPreEl = g('c-r-riesgo-pre'); if (riesgoPreEl) cf.reglas.riesgoPredict = !!riesgoPreEl.checked;
            cf.riesgoUrl = (g('c-riesgo-url').value || '').trim();
            cf.riesgoFormato = g('c-riesgo-formato').value || 'auto';
            cf.riesgoMinScore = clamp(isoNum(g('c-riesgo-min').value, DEFAULTS.riesgoMinScore), 0, 100);
            cf.riesgoRadioMul = clamp(parseFloat(g('c-riesgo-mul').value) || DEFAULTS.riesgoRadioMul, 0.1, 5);
            // v5.14: regla predictiva.
            const riesgoPreMinEl = g('c-riesgo-pre-min');
            if (riesgoPreMinEl) cf.riesgoPredictMinScore = clamp(isoNum(riesgoPreMinEl.value, DEFAULTS.riesgoPredictMinScore), 0, 100);
            const riesgoPreBufferEl = g('c-riesgo-pre-buffer');
            if (riesgoPreBufferEl) cf.riesgoPredictBufferM = clamp(isoNum(riesgoPreBufferEl.value, DEFAULTS.riesgoPredictBufferM), 0, 5000);
            const riesgoPreVelEl = g('c-riesgo-pre-vel');
            if (riesgoPreVelEl) cf.riesgoPredictVelMin = clamp(isoNum(riesgoPreVelEl.value, DEFAULTS.riesgoPredictVelMin), 0, 200);
            const riesgoPreCdEl = g('c-riesgo-pre-cooldown');
            if (riesgoPreCdEl) cf.riesgoPredictCooldownS = clamp(isoNum(riesgoPreCdEl.value, DEFAULTS.riesgoPredictCooldownS), 60, 3600);
            const riesgoPreNoctEl = g('c-riesgo-pre-noct');
            if (riesgoPreNoctEl) cf.riesgoPredictNocturno = !!riesgoPreNoctEl.checked;
            const riesgoPreDesdeEl = g('c-riesgo-pre-desde');
            if (riesgoPreDesdeEl) cf.riesgoPredictNocturnoDesde = riesgoPreDesdeEl.value || DEFAULTS.riesgoPredictNocturnoDesde;
            const riesgoPreHastaEl = g('c-riesgo-pre-hasta');
            if (riesgoPreHastaEl) cf.riesgoPredictNocturnoHasta = riesgoPreHastaEl.value || DEFAULTS.riesgoPredictNocturnoHasta;
            // Si la URL cambi\u00f3 (o se activ\u00f3), recarga de inmediato.
            if (cf.riesgoUrl !== APP._riesgoFetched || APP.riesgoEstado === 'error') {
                APP._riesgoFetched = cf.riesgoUrl;
                cargarRiesgo();
            }
            cf.reglas.desvio = g('c-r-desvio').checked;
            cf.desvioM = Math.max(30, isoNum(g('c-desvio-m').value, cf.desvioM));
            cf.desvioMin = Math.max(1, isoNum(g('c-desvio-min').value, cf.desvioMin));
            cf.desvioMunicipio = !!(g('c-desvio-municipio') && g('c-desvio-municipio').checked);
            cf.desvioMunicipioM = clamp(isoNum(g('c-desvio-municipio-m').value, cf.desvioMunicipioM), 100, 30000);
            cf.paradaLlegadaM = clamp(isoNum(g('c-parada-llegada').value, cf.paradaLlegadaM), 50, 3000);
            cf.reglas.retorno = g('c-r-retorno').checked;
            cf.retornoM = Math.max(50, isoNum(g('c-retorno-m').value, cf.retornoM));
            cf.retornoPct = clamp(isoNum(g('c-retorno-pct').value, cf.retornoPct), 5, 90);
            cf.reglas.giroU = g('c-r-giro').checked;
            cf.giroGrados = clamp(isoNum(g('c-giro-grados').value, cf.giroGrados), 90, 180);
            cf.giroMin = Math.max(1, isoNum(g('c-giro-min').value, cf.giroMin));
            cf.reglas.demoraBase = g('c-r-demora-base').checked;
            cf.demoraBaseMin = Math.max(5, isoNum(g('c-demora-base-min').value, cf.demoraBaseMin));
            cf.partidaHoras = Math.max(1, isoNum(g('c-partida-horas').value, cf.partidaHoras));
            cf.paradaMin = Math.max(1, isoNum(g('c-parada-min').value, cf.paradaMin));
            cf.historialHoras = Math.max(2, isoNum(g('c-hist-horas').value, cf.historialHoras));
            cf.analizarAuto = g('c-analizar-auto').checked;
            cf.osrm = g('c-osrm').checked;
            cf.overpass = g('c-overpass').checked;
            cf.trazado = g('c-trazado').checked;
            cf.trazadoMax = Math.max(50, isoNum(g('c-trazado-max').value, cf.trazadoMax));
            cf.autoRuta = g('c-auto-ruta').checked;
            const _modo = g('c-auto-ruta-modo').value;
            cf.autoRutaModo = (_modo === 'astar' && cf.overpass) ? 'astar' : 'osrm';
            cf.caravanaM = Math.max(50, isoNum(g('c-caravana-m').value, DEFAULTS.caravanaM));
            cf.caravanaCercaM = Math.max(200, isoNum(g('c-caravana-cerca').value, DEFAULTS.caravanaCercaM));
            // Si el usuario acaba de activar el trazado automatico, lanzamos
            // un pase inmediato para las unidades pendientes.
            const _autoAntes = APP.config.autoRuta;
            if (!_autoAntes && cf.autoRuta) {
                setTimeout(() => autoTrazarRutas(), 200);
            }
            cf.horario.on = g('c-hor-on').checked;
            cf.horario.desde = g('c-hor-a').value || DEFAULTS.horario.desde;
            cf.horario.hasta = g('c-hor-b').value || DEFAULTS.horario.hasta;
            cf.panelLado = g('c-panel-lado').value || 'derecha';
            cf.panelAncho = clamp(isoNum(g('c-panel-ancho').value, cf.panelAncho), 360, 900);
            cf.ocultarAlClicFuera = g('c-panel-clicfuera').checked;
            cf.confirmarCierre = g('c-confirmar-cierre').checked;
            applyBar();
            paintVerifyButton();
            if (!cf.loadZones) APP.zonas = [];
            writeJSON(LS.cfg, APP.config);
            writeSession(SS.watch, APP.watchMap);
            writeJSON(LS.barra, APP.barra);
            applyTheme();
            aplicarModoPanel();
            restartTimers();
            limpiarCfgDirty();
            cfgWinEl.style.display = 'none';
            refresh();
            // Repintar Avisos para que aparezcan/desaparezcan los botones IA
            // y actualizar el indicador de IA de la cabecera.
            paintAlertas();
            paintIASwitch();
            adviceOk(LANG.guardado);
        });

        byId('rondo-reset-panel').addEventListener('click', () => {
            APP.config.panelAncho = 460;
            writeJSON(LS.cfg, APP.config);
            aplicarModoPanel();
            const inp = byId('c-panel-ancho');
            if (inp) inp.value = 460;
            adviceOk('Ancho restablecido', '460 px');
        });
        byId('rondo-perfil-guardar').addEventListener('click', () => {
            rondoPrompt('Guardar perfil', 'Ponle un nombre a la configuracion actual.', '', (n) => {
                if (n && n.trim()) {
                    guardarPerfil(n.trim());
                    adviceOk('Perfil guardado', n.trim());
                }
            }, { icon: UIS.export, okText: 'Guardar', placeholder: 'Ej. Turno manana' });
        });
        byId('rondo-perfil-cargar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) { adviceWarn('Sin perfil', 'Guarda un perfil primero'); return; }
            if (cargarPerfil(n)) {
                cfgWinEl.style.display = 'none';
                adviceOk('Perfil cargado', n);
            }
        });
        byId('rondo-perfil-borrar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) return;
            rondoConfirm('Borrar perfil', 'Se borrara el perfil "' + n + '".', () => {
                borrarPerfil(n);
                adviceOk('Perfil borrado', n);
            }, { peligro: true, okText: 'Borrar', icon: UIS.close });
        });
        byId('rondo-check-update').addEventListener('click', async (e) => {
            await conBusy(e.currentTarget, async () => {
                await comprobarActualizacion();
                const u = APP.update;
                if (u.state === 'available') adviceOk('Nueva version disponible', u.remote + ' (instalada ' + VER + ')');
                else if (u.state === 'current') adviceOk('Estas al dia', 'Versión instalada ' + VER + ' · remota ' + (u.remote || '?'));
                else adviceErr('No se pudo comprobar', u.lastError || 'sin conexion');
            });
        });
        byId('rondo-limpiar-hist').addEventListener('click', () => {
            if (!APP.historial.length) { adviceWarn('Sin avisos', 'El historial ya esta vacio'); return; }
            rondoConfirm('Limpiar historial', 'Se borrarán todos los avisos registrados en esta pestaña.', () => {
                limpiarBitacora();
                adviceOk('Historial limpiado');
            }, { peligro: true, okText: 'Limpiar', icon: UIS.clear });
        });
        byId('rondo-borrar-memo').addEventListener('click', () => {
            rondoConfirm('Borrar estado', 'Se reinicia el estado interno de las reglas (detenciones, desvíos, etc.).', () => {
                APP.memo = {}; writeSession(SS.memo, APP.memo); refresh();
                adviceOk('Estado borrado');
            }, { okText: 'Borrar', icon: UIS.clear });
        });
        byId('rondo-borrar-todo').addEventListener('click', () => {
            rondoConfirm('Borrar TODO', 'Se borrará la configuración, el estado, el historial de avisos, rutas y odómetros. Esta accion no se puede deshacer.', () => {
                Object.keys(LS).forEach((k) => { try { localStorage.removeItem(LS[k]); } catch (_) { /* noop */ } });
                Object.keys(SS).forEach((k) => { try { sessionStorage.removeItem(SS[k]); } catch (_) { /* noop */ } });
                avisoEl.textContent = 'Estado borrado, recargando...';
                avisoEl.style.display = 'block';
                setTimeout(() => { try { location.reload(); } catch (_) { /* noop */ } }, 700);
            }, { peligro: true, okText: 'Borrar TODO' });
        });
        // Acciones de los estados vacios (delegado, un solo listener).
        panelEl.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('.rondo-vacio-acc');
            if (!b) return;
            const acc = b.dataset.acc;
            if (acc === 'abrir-lista') mainBtn.click();
            else if (acc === 'ajustes') abrirCfg();
            else if (acc === 'tab-unidades') setTab('unidades');
        });
    }

    /* ====================== RIESGO: BINDINGS ====================== */
    function bindRiesgo() {
        const wrap = byId('rondo-wrap-zonas');
        if (!wrap) return;
        // ── Delegacion de change en inputs/selects de la pestana ──────
        wrap.addEventListener('change', (e) => {
            const t = e.target;
            if (!t || !t.id) return;
            const cfg = APP.config;
            if (t.id === 'rondo-riesgo-url') {
                const newUrl = (t.value || '').trim();
                if (newUrl !== (cfg.riesgoUrl || '')) {
                    cfg.riesgoUrl = newUrl;
                    APP._riesgoFetched = newUrl;
                    writeJSON(LS.cfg, APP.config);
                    cargarRiesgo();
                }
            } else if (t.id === 'rondo-riesgo-formato-sel') {
                cfg.riesgoFormato = t.value || 'auto';
                writeJSON(LS.cfg, APP.config);
            } else if (t.id === 'rondo-riesgo-min') {
                cfg.riesgoMinScore = clamp(parseFloat(t.value) || DEFAULTS.riesgoMinScore, 0, 100);
                t.value = cfg.riesgoMinScore;
                writeJSON(LS.cfg, APP.config);
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-mul') {
                cfg.riesgoRadioMul = clamp(parseFloat(t.value) || DEFAULTS.riesgoRadioMul, 0.1, 5);
                t.value = cfg.riesgoRadioMul;
                writeJSON(LS.cfg, APP.config);
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-orden') {
                APP.riesgoOrden = t.value || 'score';
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-vista') {
                APP.riesgoVista = (t.value === 'plano') ? 'plano' : 'grupo';
                paintRiesgo();
            }
        });
        // ── Slider de score min: actualiza valor mostrado y repinta en vivo ──
        const slider = byId('rondo-riesgo-min');
        const sliderVal = byId('rondo-riesgo-min-val');
        if (slider && sliderVal) {
            slider.addEventListener('input', () => {
                sliderVal.textContent = slider.value;
                APP.config.riesgoMinScore = parseFloat(slider.value) || 0;
                paintRiesgo();
            });
            slider.addEventListener('change', () => {
                writeJSON(LS.cfg, APP.config);
            });
        }
        // ── Busqueda: input con debounce ──────────────────────────────
        const buscar = byId('rondo-riesgo-buscar');
        if (buscar) {
            let to = null;
            buscar.addEventListener('input', () => {
                clearTimeout(to);
                to = setTimeout(() => {
                    APP.riesgoFiltro = buscar.value || '';
                    paintRiesgo();
                }, 120);
            });
        }
        // ── Click delegation: chips, KPI, grupo, copy zone, etc. ──────
        wrap.addEventListener('click', (e) => {
            // Boton copiar de una card.
            const copyBtn = e.target.closest('[data-acc="copy-zone"]');
            if (copyBtn && wrap.contains(copyBtn)) {
                const idx = parseInt(copyBtn.dataset.zonaIdx, 10);
                const z = (APP.riesgo || [])[idx];
                if (z) copiarZonaRiesgo(z);
                return;
            }
            // Boton empty-state "Abrir Ajustes".
            const ajBtn = e.target.closest('#rondo-riesgo-empty-ajustes');
            if (ajBtn) {
                abrirAjustes();
                return;
            }
            // KPI: click para filtrar por ese nivel.
            const kpi = e.target.closest('.rondo-riesgo-kpi');
            if (kpi && kpi.dataset.kpiNivel) {
                APP.riesgoNivel = (APP.riesgoNivel === kpi.dataset.kpiNivel) ? 'todas' : kpi.dataset.kpiNivel;
                paintRiesgo();
                return;
            }
            // Chips de nivel.
            const chip = e.target.closest('.rondo-chip');
            if (chip && wrap.contains(chip) && chip.dataset.nivel) {
                APP.riesgoNivel = chip.dataset.nivel;
                paintRiesgo();
                return;
            }
            // Header de grupo: colapsar / expandir.
            const head = e.target.closest('.rondo-riesgo-grupo-head');
            if (head) {
                const grupo = head.closest('.rondo-riesgo-grupo');
                if (grupo && grupo.dataset.estado) {
                    APP.riesgoColapsado = APP.riesgoColapsado || {};
                    APP.riesgoColapsado[grupo.dataset.estado] = !grupo.classList.contains('colapsado');
                    grupo.classList.toggle('colapsado');
                    const f = wrap.querySelector('.rondo-riesgo-foot');
                    if (f) actualizarContadorColapsados(f);
                    return;
                }
            }
            // Limpiar filtros.
            const clearBtn = e.target.closest('#rondo-riesgo-limpiar-filtros, #rondo-riesgo-empty-clear');
            if (clearBtn) {
                APP.riesgoFiltro = '';
                APP.riesgoNivel = 'todas';
                APP.riesgoOrden = 'score';
                APP.riesgoVista = 'grupo';
                paintRiesgo();
                return;
            }
            // Expandir / colapsar todos los grupos.
            const expBtn = e.target.closest('#rondo-riesgo-expandir');
            if (expBtn) {
                const grupos = wrap.querySelectorAll('.rondo-riesgo-grupo');
                const todosColapsados = Array.from(grupos).every((g) => g.classList.contains('colapsado'));
                APP.riesgoColapsado = APP.riesgoColapsado || {};
                grupos.forEach((g) => {
                    const col = !todosColapsados;
                    g.classList.toggle('colapsado', col);
                    if (g.dataset.estado) APP.riesgoColapsado[g.dataset.estado] = col;
                });
                const f = wrap.querySelector('.rondo-riesgo-foot');
                if (f) actualizarContadorColapsados(f);
                return;
            }
        });
        // ── Drag and drop sobre la seccion de estado ───────────────────
        const dropZone = byId('rondo-riesgo-drop');
        if (dropZone) {
            ['dragenter', 'dragover'].forEach((evt) =>
                dropZone.addEventListener(evt, (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    dropZone.classList.add('drag-over');
                }));
            ['dragleave', 'drop'].forEach((evt) =>
                dropZone.addEventListener(evt, (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (evt === 'dragleave' && dropZone.contains(ev.relatedTarget)) return;
                    dropZone.classList.remove('drag-over');
                }));
            dropZone.addEventListener('drop', (ev) => {
                const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
                if (f) cargarRiesgoDesdeArchivo(f);
            });
        }
        // ── Botones de exportacion ────────────────────────────────────
        const csvBtn = byId('rondo-riesgo-csv');
        if (csvBtn) csvBtn.addEventListener('click', () => exportarRiesgoCSV());
        const geoBtn = byId('rondo-riesgo-geo');
        if (geoBtn) geoBtn.addEventListener('click', () => exportarRiesgoGeoJSON());
        const copiarBtn = byId('rondo-riesgo-copiar');
        if (copiarBtn) copiarBtn.addEventListener('click', () => copiarRiesgoFiltrado());
        // Boton "Exportar" grande (muestra menu).
        const exportBig = byId('rondo-riesgo-exportar');
        if (exportBig) exportBig.addEventListener('click', () => mostrarMenuExportarRiesgo());
        // ── Segmentado Geocercas / Riesgo (pestana Zonas) ─────────────
        const seg = byId('rondo-zonas-seg');
        if (seg) {
            seg.addEventListener('click', (ev) => {
                const b = ev.target.closest('.rondo-zseg');
                if (!b || !seg.contains(b) || !b.dataset.ztab) return;
                APP.zonasVista = b.dataset.ztab;
                aplicarZonasVista();
                if (APP.zonasVista === 'riesgo') paintRiesgo();
                else paintGeocercas();
            });
        }
        // ── Geocercas de la plataforma (pestana Zonas) ────────────────
        const geoRec = byId('rondo-geo-recargar');
        if (geoRec) geoRec.addEventListener('click', () => recargarGeocercas());
        // v6.13: editor de geocercas de Rondo (mapa propio, dibujo a mano).
        const geoNueva = byId('rondo-geo-nueva');
        if (geoNueva) geoNueva.addEventListener('click', () => abrirGeocercaApp());
        const geoCfg = byId('rondo-geo-configurar');
        if (geoCfg) geoCfg.addEventListener('click', () => abrirAjustes());
        // v5.15: filtros, orden y acciones de las geocercas.
        const geoBuscar = byId('rondo-geo-buscar');
        let _geoBusqT = null;
        if (geoBuscar) geoBuscar.addEventListener('input', () => {
            clearTimeout(_geoBusqT);
            _geoBusqT = setTimeout(() => { APP.geoFiltro = geoBuscar.value.trim(); paintGeocercas(); }, 120);
        });
        const geoOrdenEl = byId('rondo-geo-orden');
        if (geoOrdenEl) geoOrdenEl.addEventListener('change', () => { APP.geoOrden = geoOrdenEl.value; paintGeocercas(); });
        const geoRolEl = byId('rondo-geo-rol');
        if (geoRolEl) geoRolEl.addEventListener('change', () => { APP.geoRol = geoRolEl.value; paintGeocercas(); });
        const geoCsv = byId('rondo-geo-csv');
        if (geoCsv) geoCsv.addEventListener('click', exportarGeocercasCSV);
        const geoGeo = byId('rondo-geo-geo');
        if (geoGeo) geoGeo.addEventListener('click', exportarGeocercasGeoJSON);
        const geoBody = byId('rondo-body-zonas');
        if (geoBody) geoBody.addEventListener('click', (ev) => {
            const b = ev.target.closest && ev.target.closest('button');
            if (!b) return;
            const nombre = b.dataset.zona;
            // La campana abre el menu de alerta de ESA geocerca (alcance,
            // gravedad, disparador y tiempos).
            if (b.classList.contains('rondo-geo-ga')) { abrirGeoAlerta(nombre); return; }
            // v6.13: editar en el mapa la geocerca creada en Rondo.
            if (b.classList.contains('rondo-geo-edit')) { abrirGeocercaApp(nombre); return; }
            const z = (APP.zonas || []).find((x) => (x.n || '') === nombre);
            if (!z) return;
            if (b.classList.contains('rondo-geo-usar')) elegirUnidadParaGeocerca(z);
            else if (b.classList.contains('rondo-geo-copy')) {
                const c = centroDeZona(z);
                copiarAlPortapapeles((z.n || '') + (c ? '\n' + c.lat.toFixed(6) + ',' + c.lon.toFixed(6) : ''), 'Geocerca copiada', z.n || '');
            }
        });
        // v6.12: franja resumen de la alerta de geocercas (pills y acciones).
        bindGeoAlerta();
        // ── Botones existentes (recargar / limpiar / archivo) ─────────
        const rec = byId('rondo-riesgo-recargar');
        if (rec) rec.addEventListener('click', () => cargarRiesgo());
        const lim = byId('rondo-riesgo-limpiar');
        if (lim) {
            lim.addEventListener('click', () => {
                APP.riesgo = null;
                APP.riesgoErr = null;
                APP.riesgoEstado = 'idle';
                APP.riesgoTs = 0;
                paintRiesgo();
            });
        }
    }
    // Lee un archivo CSV/JSON y lo aplica como dataset de riesgo.
    function cargarRiesgoDesdeArchivo(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = String(ev.target.result || '');
            const trimmed = text.trim();
            let items = [];
            let fmt = trimmed.length && (trimmed[0] === '[' || trimmed[0] === '{') ? 'json' : 'csv';
            try {
                if (fmt === 'json') {
                    const data = JSON.parse(trimmed);
                    items = _itemsFromJSON(data);
                } else {
                    items = _itemsFromCSV(trimmed);
                }
            } catch (e1) {
                APP.riesgoErr = 'Archivo invalido: ' + (e1 && e1.message || '');
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
                paintRiesgo();
                return;
            }
            if (!items.length) {
                APP.riesgoErr = 'Archivo sin items reconocibles (revisa columnas lat/lon)';
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
                paintRiesgo();
                return;
            }
            APP.riesgo = items;
            APP.riesgoErr = null;
            APP.riesgoTs = Date.now();
            APP.riesgoEstado = 'ok';
            // El archivo cargado reemplaza la URL: dejamos constancia.
            APP._riesgoFetched = (APP.config && APP.config.riesgoUrl) || 'archivo local';
            paintRiesgo();
            if (APP.unlocked) {
                try { console.log('[Rondo] riesgo cargado desde archivo:', items.length, 'zonas'); } catch (_) {}
            }
            adviceOk('Dataset cargado', items.length + ' zonas');
        };
        reader.onerror = () => {
            APP.riesgoErr = 'No se pudo leer el archivo';
            APP.riesgo = null;
            APP.riesgoEstado = 'error';
            paintRiesgo();
        };
        reader.readAsText(file);
    }

    /* ====================== CARGA RAPIDA DE RUTAS (embarque) ======================
     * v6.0.3. Pegas (o sueltas el .xlsx/.csv de) una lista de clientes, se
     * emparejan con las geocercas existentes por BUSQUEDA DIFUSA y se arma la
     * ruta multipunto de una unidad.
     *
     * Es 100% local y de SOLO LECTURA: no crea ni modifica nada en Wialon.
     * Unicamente construye el plan de ruta de Rondo (APP.planes).
     */

    /* === BEGIN: rxCargaParse === */
    // Limpia el nombre de un cliente: quita numeracion ("1. ", "2) ") y espacios.
    function rxCargaLimpiarCliente(txt) {
        let s = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
        s = s.replace(/^\d+\s*[.):\-]?\s*/, '');
        return s.trim();
    }
    // Busca la fila de encabezado con la columna "Cliente".
    function rxCargaColumnaCliente(filas) {
        for (let i = 0; i < filas.length; i++) {
            const fila = filas[i] || [];
            for (let j = 0; j < fila.length; j++) {
                if (norm(fila[j] || '') === 'CLIENTE') return { header: i, col: j };
            }
        }
        return null;
    }
    // Convierte una matriz de celdas en la lista (unica) de clientes.
    function rxCargaParsearFilas(filas) {
        const out = [];
        const vistos = new Set();
        const empujar = (s) => {
            const c = rxCargaLimpiarCliente(s);
            if (!c || c.length < 3) return;
            const k = norm(c);
            if (vistos.has(k)) return;
            vistos.add(k); out.push(c);
        };
        const hdr = rxCargaColumnaCliente(filas);
        if (hdr) {
            for (let i = hdr.header + 1; i < filas.length; i++) empujar((filas[i] || [])[hdr.col] || '');
        } else {
            for (let i = 0; i < filas.length; i++) {
                const fila = filas[i] || [];
                let cand = '';
                for (let j = 0; j < fila.length; j++) {
                    const v = String(fila[j] || '').trim();
                    if (v && !/^[\d.,\/-]+$/.test(v)) cand = v;
                }
                if (!cand) cand = String(fila[0] || '').trim();
                empujar(cand);
            }
        }
        return out;
    }
    // Texto pegado (columnas separadas por tabulador) -> clientes.
    function rxCargaParsearTexto(texto) {
        const filas = String(texto || '').split(/\r?\n/).map((l) => l.split('\t').map((c) => c.trim()));
        return rxCargaParsearFilas(filas);
    }
    // Puntua la mejor geocerca para un cliente. Devuelve {zona, score}.
    function rxCargaEmparejarCliente(cliente, zonas) {
        let best = null, bestSc = 0;
        const zs = zonas || [];
        for (let i = 0; i < zs.length; i++) {
            const n = zs[i] ? (zs[i].texto || zs[i].n || '') : '';
            if (!n) continue;
            const sc = fuzzyScore(cliente, n);
            if (sc > bestSc) { bestSc = sc; best = zs[i]; }
        }
        return { zona: best, score: bestSc };
    }
    function rxCargaConfianza(score) {
        if (score >= 800) return { etq: 'alta', clase: 'ok' };
        if (score >= 400) return { etq: 'media', clase: 'warn' };
        if (score > 0) return { etq: 'baja', clase: 'dim' };
        return { etq: 'sin', clase: 'no' };
    }
    /* === END: rxCargaParse === */

    // ---------------------------------------------------------------- xlsx (solo lectura)
    function rxCargaColIndex(letras) {
        let n = 0;
        for (let i = 0; i < letras.length; i++) n = n * 26 + (letras.charCodeAt(i) - 64);
        return n - 1;
    }
    async function rxCargaUnzip(buf) {
        const dv = new DataView(buf), u8 = new Uint8Array(buf);
        let eocd = -1;
        const from = Math.max(0, u8.length - 66000);
        for (let i = u8.length - 22; i >= from; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return null;
        const n = dv.getUint16(eocd + 10, true);
        let off = dv.getUint32(eocd + 16, true);
        const out = {};
        const dec = new TextDecoder();
        for (let k = 0; k < n && off + 46 <= u8.length; k++) {
            if (dv.getUint32(off, true) !== 0x02014b50) break;
            const method = dv.getUint16(off + 10, true);
            const compSize = dv.getUint32(off + 20, true);
            const nameLen = dv.getUint16(off + 28, true);
            const extraLen = dv.getUint16(off + 30, true);
            const commentLen = dv.getUint16(off + 32, true);
            const localOff = dv.getUint32(off + 42, true);
            const name = dec.decode(u8.subarray(off + 46, off + 46 + nameLen));
            const lNameLen = dv.getUint16(localOff + 26, true);
            const lExtraLen = dv.getUint16(localOff + 28, true);
            const dataStart = localOff + 30 + lNameLen + lExtraLen;
            out[name] = { method: method, data: u8.subarray(dataStart, dataStart + compSize) };
            off += 46 + nameLen + extraLen + commentLen;
        }
        return out;
    }
    async function rxCargaInflate(entry) {
        if (!entry) return null;
        if (entry.method === 0) return new TextDecoder().decode(entry.data);
        if (typeof DecompressionStream === 'undefined') return null;
        try {
            const stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            const buf = await new Response(stream).arrayBuffer();
            return new TextDecoder().decode(buf);
        } catch (_) { return null; }
    }
    function rxCargaSharedStrings(xml) {
        const out = [];
        if (!xml || typeof DOMParser === 'undefined') return out;
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const sis = doc.getElementsByTagName('si');
        for (let i = 0; i < sis.length; i++) {
            const ts = sis[i].getElementsByTagName('t');
            let s = '';
            for (let j = 0; j < ts.length; j++) s += ts[j].textContent || '';
            out.push(s);
        }
        return out;
    }
    function rxCargaSheetRows(xml, shared) {
        const rows = [];
        if (!xml || typeof DOMParser === 'undefined') return rows;
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const rowEls = doc.getElementsByTagName('row');
        for (let i = 0; i < rowEls.length; i++) {
            const cells = rowEls[i].getElementsByTagName('c');
            const fila = [];
            for (let j = 0; j < cells.length; j++) {
                const c = cells[j];
                const ref = c.getAttribute('r') || '';
                const idx = rxCargaColIndex(ref.replace(/[0-9]/g, ''));
                const t = c.getAttribute('t');
                const v = c.getElementsByTagName('v')[0];
                let val = v ? (v.textContent || '') : '';
                if (t === 's') val = shared[parseInt(val, 10)] || '';
                if (idx >= 0) fila[idx] = val;
            }
            rows.push(fila);
        }
        return rows;
    }
    async function rxCargaLeerXlsx(buf) {
        const files = await rxCargaUnzip(buf);
        if (!files) return null;
        const shared = rxCargaSharedStrings(await rxCargaInflate(files['xl/sharedStrings.xml']));
        const hoja = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
        if (!hoja) return null;
        return rxCargaSheetRows(await rxCargaInflate(files[hoja]), shared);
    }

    // ------------------------------------------------------------------- UI
    let _carga = null;
    function cargaModalEl() {
        let el = byId('rondo-carga-modal');
        if (el) return el;
        el = makeEl('div', { id: 'rondo-carga-modal' });
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => { if (e.target === el) cerrarCarga(); });
        return el;
    }
    function cerrarCarga() {
        const el = byId('rondo-carga-modal');
        if (el) el.classList.remove('abierto');
        _carga = null;
    }
    function abrirCarga(eco) {
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u));
        if (!vigiladas.length) {
            adviceWarn('Sin unidades vigiladas', 'Vigila una unidad antes de asignarle una ruta.');
            return;
        }
        const sel = eco || APP.cargaEco || (vigiladas[0].eco || vigiladas[0].clave);
        _carga = { eco: sel, modo: 'optimo', engine: APP.config.autoRutaModo || 'osrm', filas: [], crudo: '', catalogo: null };
        renderCarga();
        cargaModalEl().classList.add('abierto');
    }
    // Catalogo de destinos: geocercas + municipios (OSM y zonas de riesgo).
    function cargaCatalogo() {
        const out = [];
        const zs = (APP.zonas || []).slice().sort((a, b) => String(a.n || '').localeCompare(String(b.n || ''), 'es'));
        for (let i = 0; i < zs.length; i++) {
            const z = zs[i];
            out.push({ tipo: 'geocerca', texto: z.n || ('Zona ' + z.id), sub: 'geocerca', coords: centroDeZona(z), ref: z });
        }
        const ms = (APP.municipios || []).concat(APP.municipiosRiesgo || []);
        const vistos = new Set();
        for (let i = 0; i < ms.length; i++) {
            const m = ms[i];
            if (!m || !m.nombre) continue;
            const k = norm(m.nombre) + '|' + norm(m.estado || '');
            if (vistos.has(k)) continue;
            vistos.add(k);
            out.push({ tipo: 'municipio', texto: m.nombre, sub: (m.estado || '') + ' \u00b7 municipio', coords: m.centro });
        }
        return out;
    }
    function renderCarga() {
        const el = cargaModalEl();
        if (!el || !_carga) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u)).filter((i) => i.eco || i.clave);
        const opcionesUnidad = vigiladas.map((i) => {
            const eco = i.eco || i.clave;
            return '<option value="' + esc(eco) + '"' + (eco === _carga.eco ? ' selected' : '') + '>' + esc(eco) + (i.placa ? ' \u00b7 ' + esc(i.placa) : '') + '</option>';
        }).join('');
        if (!_carga.catalogo) _carga.catalogo = cargaCatalogo();
        const catalogo = _carga.catalogo;
        const opcionesCatalogo = (sel) => '<option value="">\u2014 sin asignar \u2014</option>' + catalogo.map((it, k) =>
            '<option value="' + k + '"' + (sel && it.texto === sel.texto && it.tipo === sel.tipo ? ' selected' : '') + '>' + esc(it.texto) + ' \u00b7 ' + esc(it.tipo) + '</option>').join('');
        const filasHtml = _carga.filas.map((f, i) => {
            const conf = rxCargaConfianza(f.score);
            return '<div class="carga-row' + (f.incluir ? '' : ' off') + '" data-i="' + i + '">' +
                '<label class="carga-check"><input type="checkbox" data-carga-fila="' + i + '"' + (f.incluir ? ' checked' : '') + '></label>' +
                '<div class="carga-cliente"><b>' + esc(f.cliente) + '</b><small class="carga-conf carga-conf-' + conf.clase + '">' + conf.etq + '</small></div>' +
                '<select class="carga-zona" data-carga-fila="' + i + '">' + opcionesCatalogo(f.item) + '</select>' +
                '</div>';
        }).join('') || '<div class="carga-vacio">Pega la lista de clientes o suelta el archivo (.xlsx, .csv, .txt) y pulsa <b>Emparejar</b>.</div>';
        const nMatch = _carga.filas.filter((f) => f.item).length;
        el.innerHTML =
            '<div class="carga-card">' +
            '<div class="carga-head"><span class="rondo-usym">' + UIS.route + '</span> Carga rapida de rutas' +
            '<span style="flex:1"></span><button class="carga-mini" data-carga="cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
            '<div class="carga-body">' +
            '<div class="carga-rowline">' +
            '<label>Unidad <select id="carga-unidad">' + opcionesUnidad + '</select></label>' +
            '<label>Modo <select id="carga-modo">' +
            '<option value="optimo"' + (_carga.modo === 'optimo' ? ' selected' : '') + '>Mejor ruta (circuito)</option>' +
            '<option value="secuencial"' + (_carga.modo === 'secuencial' ? ' selected' : '') + '>Secuencial</option>' +
            '</select></label>' +
            '<label>Motor <select id="carga-engine">' +
            '<option value="osrm"' + (_carga.engine === 'osrm' ? ' selected' : '') + '>OSRM</option>' +
            '<option value="astar"' + (_carga.engine === 'astar' ? ' selected' : '') + '>A*</option>' +
            '</select></label>' +
            '</div>' +
            '<textarea id="carga-texto" placeholder="Pega aqui los clientes (una linea o la tabla completa de Excel; detecta la columna Cliente).">' + esc(_carga.crudo || '') + '</textarea>' +
            '<div class="carga-drop" id="carga-drop"><span class="rondo-usym">' + UIS.drop + '</span> Arrastra aqui el .xlsx / .csv / .txt (o usa el selector) <input type="file" id="carga-file" accept=".xlsx,.csv,.tsv,.txt" hidden></div>' +
            '<div class="carga-actions">' +
            '<button class="carga-btn" data-carga="file"><span class="rondo-usym">' + UIS.upload + '</span> Elegir archivo</button>' +
            '<button class="carga-btn primary" data-carga="match"><span class="rondo-usym">' + UIS.check + '</span> Emparejar ' + (_carga.filas.length ? 'de nuevo' : 'clientes') + '</button>' +
            '<span class="carga-resumen">' + (_carga.filas.length ? (_carga.filas.length + ' cliente(s) \u00b7 ' + nMatch + ' con geocerca') : '') + '</span>' +
            '</div>' +
            '<div class="carga-list">' + filasHtml + '</div>' +
            '</div>' +
            '<div class="carga-foot">' +
            '<button class="carga-btn" data-carga="cerrar">Cancelar</button>' +
            '<button class="carga-btn" data-carga="asignar">Solo asignar</button>' +
            '<button class="carga-btn primary" data-carga="asignar-trazar"><span class="rondo-usym">' + UIS.route + '</span> Asignar y trazar</button>' +
            '</div>' +
            '</div>';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        byId('carga-unidad').onchange = (e) => { if (_carga) _carga.eco = e.target.value; };
        byId('carga-modo').onchange = (e) => { if (_carga) _carga.modo = e.target.value; };
        byId('carga-engine').onchange = (e) => { if (_carga) _carga.engine = e.target.value; };
        byId('carga-texto').oninput = (e) => { if (_carga) _carga.crudo = e.target.value; };
        el.querySelectorAll('input[data-carga-fila]').forEach((b) => {
            b.onchange = () => { const i = +b.dataset.cargaFila; if (_carga && _carga.filas[i]) _carga.filas[i].incluir = b.checked; renderCarga(); };
        });
        el.querySelectorAll('select.carga-zona').forEach((s) => {
            s.onchange = () => {
                const i = +s.dataset.cargaFila;
                if (!_carga || !_carga.filas[i]) return;
                const it = catalogo[+s.value] || null;
                _carga.filas[i].item = it; _carga.filas[i].score = it ? 999 : 0;
                renderCarga();
            };
        });
        const drop = byId('carga-drop');
        if (drop) {
            drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
            drop.addEventListener('dragleave', () => drop.classList.remove('over'));
            drop.addEventListener('drop', (e) => {
                e.preventDefault(); drop.classList.remove('over');
                const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) cargarArchivo(f);
            });
        }
    }
    async function cargarArchivo(file) {
        if (!file || !_carga) return;
        try {
            let clientes = [];
            if (/\.xlsx$/i.test(file.name)) {
                const buf = await file.arrayBuffer();
                const filas = await rxCargaLeerXlsx(buf);
                if (!filas) { adviceWarn('No se pudo leer el Excel', 'Copia y pega la columna de clientes.'); return; }
                clientes = rxCargaParsearFilas(filas);
            } else {
                clientes = rxCargaParsearTexto(await file.text());
            }
            if (!clientes.length) { adviceWarn('Sin clientes', 'No se reconocio ninguna fila de cliente.'); return; }
            _carga.crudo = clientes.join('\n');
            emparejarCarga();
            adviceOk('Archivo cargado', clientes.length + ' cliente(s)');
        } catch (e) {
            adviceErr('Error leyendo el archivo', (e && e.message) || '');
        }
    }
    function emparejarCarga() {
        if (!_carga) return;
        const texto = (byId('carga-texto') && byId('carga-texto').value) || _carga.crudo || '';
        const clientes = rxCargaParsearTexto(texto);
        _carga.crudo = texto;
        _carga.catalogo = cargaCatalogo();
        _carga.filas = clientes.map((c) => {
            const m = rxCargaEmparejarCliente(c, _carga.catalogo);
            return { cliente: c, item: m.zona, score: m.score, incluir: !!m.zona };
        });
        renderCarga();
    }
    function asignarCarga(trazar) {
        if (!_carga) return;
        const eco = _carga.eco;
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        const paradas = _carga.filas
            .filter((f) => f.incluir && f.item)
            .map((f) => {
                const item = f.item;
                if (item.tipo === 'geocerca' && item.ref) return nuevaParada('geocerca', item.texto, centroDeZona(item.ref));
                return nuevaParada(item.tipo === 'ciudad' ? 'municipio' : item.tipo, item.texto, item.coords || null);
            });
        if (!paradas.length) { adviceWarn('Sin paradas', 'Empareja al menos un cliente con una geocerca.'); return; }
        const modo = _carga.modo === 'secuencial' ? 'secuencial' : 'optimo';
        const plan = { modo: modo, circuito: modo === 'optimo', paradas: paradas };
        APP.planes[clave] = plan;
        APP.watchMap[eco] = planATexto(plan);
        APP.cargaEco = eco;
        if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
        guardarPlanes(); guardarLista(); guardarOrden();
        const engine = _carga.engine === 'astar' ? 'astar' : 'osrm';
        cerrarCarga();
        pintarModalLista();
        paintInfo();
        adviceOk('Ruta asignada a ' + eco, paradas.length + ' parada(s) \u00b7 ' + (modo === 'optimo' ? 'mejor ruta' : 'secuencial'));
        if (trazar) {
            if (engine === 'astar' && !APP.config.overpass) adviceWarn('A* desactivado', 'Se usara OSRM; activa Overpass en Ajustes \u00b7 Rutas.');
            planearRuta(eco, plan, null, (engine === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
            if (APP.tab === 'rutas') paintRutas();
        }
    }
    // Delegacion de clics (el boton y el modal se crean/inyectan dinamicamente).
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#rondo-carga-btn')) { e.preventDefault(); abrirCarga(); return; }
        const acc = t.closest('[data-carga]');
        if (!acc) return;
        const a = acc.dataset.carga;
        if (a === 'cerrar') cerrarCarga();
        else if (a === 'file') { const f = byId('carga-file'); if (f) f.click(); }
        else if (a === 'match') emparejarCarga();
        else if (a === 'asignar') asignarCarga(false);
        else if (a === 'asignar-trazar') asignarCarga(true);
    });
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'carga-file' && e.target.files && e.target.files[0]) cargarArchivo(e.target.files[0]);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const el = byId('rondo-carga-modal');
        if (el && el.classList.contains('abierto')) cerrarCarga();
    });
    /* ====================== INIT ====================== */
    async function init() {
        // Idempotente: en modo hibrido el chunk ui y el bootstrap pueden
        // llamarla; evita construir la interfaz dos veces (dos UI superpuestas,
        // la de arriba sin listeners = botones muertos).
        if (APP._iniciado) return;
        APP._iniciado = true;
        const primerUso = !localStorage.getItem(LS.cfg);
        injectCSS();
        buildUI();
        try { rxBarridoAutofill(); } catch (_) { /* noop */ }
        // La barra lateral se aplica de inmediato (antes de esperar a Wialon)
        // para que el panel ya tenga su layout correcto desde el primer dibujo.
        aplicarModoPanel();
        attachDraggables();
        bindKeys();
        bindEvents();
        bindCaravanaSelect();
        bindReplay();
        bindRiesgo();
        try { rxDiagBind(); } catch (_) { /* noop */ }

        const ok = await wialonReady();
        if (!ok) {
            // v6.0.14: en la pantalla de login es normal que la API aun no
            // exista, asi que se pide iniciar sesion en vez de avisar de que
            // falta la API.
            avisoEl.textContent = rxEnLogin()
                ? 'Inicia sesión en la plataforma para que Rondo pueda monitorear.'
                : 'No se encontró la API de Wialon (wialon.core) en esta página.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        log('API de Wialon detectada. Esperando sesion...');
        let intentos = 0;
        while (!currentUser() && intentos < 120) { await sleep(1000); intentos++; }
        if (!currentUser()) {
            avisoEl.textContent = 'Sesión de Wialon no iniciada. Inicia sesión para monitorear.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        APP.unlocked = true;
        // Migracion de voz: en Linux la Web Speech API suele existir pero no
        // sonar. Si el motor guardado es 'web' y estamos en Linux, pasamos a
        // 'online' (StreamElements) una sola vez. El user puede volver a
        // elegir 'Navegador' cuando quiera.
        try {
            if (!window.localStorage.getItem('rondo.api.vozLinux')) {
                const ua = String(navigator.userAgent || '') + ' ' + String(navigator.platform || '');
                if (APP.config.vozMotor === 'web' && /linux/i.test(ua) && !/android/i.test(ua)) {
                    APP.config.vozMotor = 'online';
                    writeJSON(LS.cfg, APP.config);
                }
                window.localStorage.setItem('rondo.api.vozLinux', '1');
            }
        } catch (_) { /* noop */ }
        applyBar();
        applyTheme();
        aplicarModoPanel();
        paintVerifyButton();
        updateNoMolestar();
        paintIASwitch();
        await refresh();
        // Carga en background (no bloquea el inicio). Sin URL por defecto -> queda inactivo.
        cargarRiesgo();
        restartTimers();
        if (primerUso) {
            setTimeout(abrirBienvenida, 900);
        }
        // v5.14.1: sistema de updates rehecho.
        // 1) Restaurar lastCheck de localStorage para que el chip muestre
        //    estado correcto desde el primer paint (sin parpadeo a idle).
        cargarUpdatePersistente();
        // 2) Self-check de la constante VER contra el @version detectado
        //    del propio archivo (catches la deriva silenciosa).
        autodetectarVER();
        // v5.14.6: cargar historial de chat de sessionStorage.
        cargarChat();
        paintTabsChat();
        setTimeout(pintarChat, 0);
        // 3) Primer check diferido para no bloquear el arranque.
        setTimeout(comprobarActualizacion, 5000);
        // 4) Check periodico cada 6h (antes 30min -> demasiado ruido).
        setInterval(comprobarActualizacion, UPDATE_CHECK_INTERVAL_MS);
        // 5) Re-check al recuperar el foco: si el usuario vuelve a la
        //    pestana despues de un rato, conviene re-comprobar (el
        //    check previo pudo haber fallado por red).
        let _lastFocusCheck = 0;
        const focusHandler = () => {
            const ahora = Date.now();
            // Throttle: no mas de una vez por minuto.
            if (ahora - _lastFocusCheck < 60000) return;
            _lastFocusCheck = ahora;
            if (!APP.update || APP.update.state !== 'checking') {
                comprobarActualizacion();
            }
        };
        window.addEventListener('focus', focusHandler);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) focusHandler();
        });
        // Las ventanas de unidad pueden restaurarse despues de cargar la pagina;
        // revalidamos el contorno varias veces al inicio.
        [1500, 4000, 8000, 15000].forEach((t) => setTimeout(revalidarContornos, t));
        // Trazado automatico inicial: cualquier unidad vigilada con destino
        // pendiente recibe su ruta en background. Si ya hay ruta valida para
        // el destino actual, no se recalcula.
        setTimeout(() => { autoTrazarRutas(); }, 2500);
    }
    function log() { try { console.log.apply(console, ['[Rondo]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

    /* ====================== MINI-MAPA PROPIO + RUTA (v6.0.11) ======================
     * v6.0.11: se elimino el overlay sobre el mapa de la plataforma (dependia
     * del motor del mapa y no era fiable). En su lugar, Rondo trae su propio
     * mini-mapa de tiles de OpenStreetMap: no depende del mapa de la
     * plataforma, asi que siempre funciona. Se usa para ver una ruta
     * planificada y para el replay del dia.
     *
     * Es solo lectura: pide tiles publicos de OSM (con atribucion) y dibuja
     * encima el trazo y los marcadores.
     */
    function rxMMLonX(lon, z) { return ((lon + 180) / 360) * Math.pow(2, z) * 256; }
    function rxMMLatY(lat, z) {
        const l = clamp(Number(lat) || 0, -85.05112878, 85.05112878);
        const s = Math.sin(l * Math.PI / 180);
        return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * 256;
    }
    function rxMMMuestrear(arr, max) {
        if (!arr || arr.length <= max) return arr || [];
        const paso = Math.ceil(arr.length / max);
        const out = [];
        for (let i = 0; i < arr.length; i += paso) out.push(arr[i]);
        if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
        return out;
    }
    function rxMMPt(inst, lat, lon) {
        return [rxMMLonX(lon, inst.z) - inst.ox, rxMMLatY(lat, inst.z) - inst.oy];
    }
    function rxMMPuntos(inst) {
        const out = [];
        (inst.lineas || []).forEach((ln) => { if (ln && ln.pts) for (let i = 0; i < ln.pts.length; i++) out.push(ln.pts[i]); });
        (inst.marcas || []).forEach((m) => out.push(m));
        if (inst.pos) out.push(inst.pos);
        return out;
    }
    function rxMMFit(inst) {
        const pts = rxMMPuntos(inst);
        if (!pts.length) return;
        let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (!p || !isFinite(p.lat) || !isFinite(p.lon)) continue;
            if (p.lat < latMin) latMin = p.lat;
            if (p.lat > latMax) latMax = p.lat;
            if (p.lon < lonMin) lonMin = p.lon;
            if (p.lon > lonMax) lonMax = p.lon;
        }
        if (!isFinite(latMin)) return;
        const W = Math.max(80, inst.W), H = Math.max(80, inst.H);
        if (latMax - latMin < 1e-5 && lonMax - lonMin < 1e-5) {
            inst.z = 16;
            inst.ox = rxMMLonX(lonMin, 16) - W / 2;
            inst.oy = rxMMLatY(latMin, 16) - H / 2;
            return;
        }
        let z = 19;
        for (; z >= 2; z--) {
            const pw = rxMMLonX(lonMax, z) - rxMMLonX(lonMin, z);
            const ph = rxMMLatY(latMin, z) - rxMMLatY(latMax, z);
            if (pw <= W - 40 && ph <= H - 40) break;
        }
        inst.z = clamp(z, 2, 19);
        const cx = (rxMMLonX(lonMin, inst.z) + rxMMLonX(lonMax, inst.z)) / 2;
        const cy = (rxMMLatY(latMin, inst.z) + rxMMLatY(latMax, inst.z)) / 2;
        inst.ox = cx - W / 2;
        inst.oy = cy - H / 2;
    }
    function rxMMTilesHTML(inst, lazy) {
        const z = inst.z;
        const n = Math.pow(2, z);
        const x0 = Math.floor(inst.ox / 256), x1 = Math.floor((inst.ox + inst.W) / 256);
        const y0 = Math.floor(inst.oy / 256), y1 = Math.floor((inst.oy + inst.H) / 256);
        let html = '';
        for (let tx = x0; tx <= x1; tx++) {
            for (let ty = y0; ty <= y1; ty++) {
                if (ty < 0 || ty >= n) continue;
                const wx = ((tx % n) + n) % n;
                const left = tx * 256 - inst.ox;
                const top = ty * 256 - inst.oy;
                html += '<img class="rondo-mm-tile" src="https://tile.openstreetmap.org/' + z + '/' + wx + '/' + ty + '.png"' +
                    ' style="left:' + left + 'px;top:' + top + 'px" alt="" draggable="false"' + (lazy === false ? '' : ' loading="lazy"') + '>';
            }
        }
        return html;
    }
    function rxMMTiles(inst) {
        inst.capaTiles.innerHTML = rxMMTilesHTML(inst);
    }
    function rxMMLineaHTML(inst, ln) {
        if (!ln || !ln.pts || ln.pts.length < 2) return '';
        const pts = rxMMMuestrear(ln.pts, 2000);
        let d = '';
        for (let i = 0; i < pts.length; i++) {
            const q = rxMMPt(inst, pts[i].lat, pts[i].lon);
            d += (d ? ' ' : '') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
        }
        const color = ln.color || '#850D22';
        let out = '';
        if (ln.glow) {
            out += '<polyline fill="none" stroke="' + color + '" stroke-width="' + ((ln.width || 3) + 7) +
                '" stroke-opacity="0.22" stroke-linejoin="round" stroke-linecap="round" points="' + d + '"/>';
        }
        out += '<polyline fill="none" stroke="' + color + '" stroke-width="' + (ln.width || 3) +
            '" stroke-opacity="' + (ln.opacity == null ? 1 : ln.opacity) + '" stroke-linejoin="round" stroke-linecap="round" points="' + d + '"/>';
        return out;
    }
    function rxMMMarcasHTML(inst) {
        let html = '';
        (inst.marcas || []).forEach((m) => {
            if (!m || !isFinite(m.lat) || !isFinite(m.lon)) return;
            const q = rxMMPt(inst, m.lat, m.lon);
            html += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (m.radio || 5) +
                '" fill="' + (m.color || '#1565c0') + '" stroke="#fff" stroke-width="1.5">' +
                (m.txt ? '<title>' + esc(m.txt) + '</title>' : '') + '</circle>';
            if (m.num != null) {
                html += '<text x="' + (q[0] + 7).toFixed(1) + '" y="' + (q[1] + 3.5).toFixed(1) + '" font-size="10" font-weight="700"' +
                    ' fill="#1c2030" stroke="#fff" stroke-width="2.5" paint-order="stroke" style="font-family:system-ui,Arial,sans-serif">' +
                    esc(String(m.num)) + '</text>';
            }
        });
        return html;
    }
    function rxMMDibujar(inst, soloDinamico) {
        const est = inst.svg.querySelector('.rondo-mm-est');
        const din = inst.svg.querySelector('.rondo-mm-din');
        if (!soloDinamico && est) {
            let h = '';
            (inst.lineas || []).forEach((ln) => { if (ln && !ln.dyn) h += rxMMLineaHTML(inst, ln); });
            h += rxMMMarcasHTML(inst);
            est.innerHTML = h;
        }
        if (din) {
            let h = '';
            (inst.lineas || []).forEach((ln) => { if (ln && ln.dyn) h += rxMMLineaHTML(inst, ln); });
            if (inst.pos && isFinite(inst.pos.lat)) {
                const q = rxMMPt(inst, inst.pos.lat, inst.pos.lon);
                h += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7" fill="#850D22" stroke="#fff" stroke-width="2"/>';
            }
            din.innerHTML = h;
        }
    }
    // Crea un mini-mapa dentro de `cont`.
    // cfg: { lineas:[{pts:[{lat,lon}], color, width, opacity, dyn}], marcas:[{lat,lon,color,radio,txt}], pos }
    function rxMiniMapa(cont, cfg) {
        if (!cont) return null;
        const o = cfg || {};
        cont.classList.add('rondo-mm');
        cont.innerHTML = '<div class="rondo-mm-tiles"></div>' +
            '<svg class="rondo-mm-svg" xmlns="http://www.w3.org/2000/svg"><g class="rondo-mm-est"></g><g class="rondo-mm-din"></g></svg>' +
            '<div class="rondo-mm-atrib">\u00a9 OpenStreetMap</div>';
        const inst = {
            cont: cont,
            capaTiles: cont.querySelector('.rondo-mm-tiles'),
            svg: cont.querySelector('.rondo-mm-svg'),
            lineas: o.lineas || [],
            marcas: o.marcas || [],
            pos: o.pos || null,
            W: 0, H: 0, z: 16, ox: 0, oy: 0
        };
        inst.medir = () => {
            inst.W = Math.max(80, cont.clientWidth || 300);
            inst.H = Math.max(80, cont.clientHeight || 240);
            inst.svg.setAttribute('viewBox', '0 0 ' + inst.W + ' ' + inst.H);
        };
        inst.render = () => { rxMMTiles(inst); rxMMDibujar(inst, false); };
        inst.encuadrar = () => { inst.medir(); rxMMFit(inst); inst.render(); };
        inst.ponerDatos = (d) => {
            if (!d) return;
            if (d.lineas) inst.lineas = d.lineas;
            if (d.marcas) inst.marcas = d.marcas;
            inst.pos = d.pos || null;
            inst.encuadrar();
        };
        inst.setPos = (lat, lon) => {
            inst.pos = (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) ? null : { lat: lat, lon: lon };
            if (inst.svg) rxMMDibujar(inst, true);
        };
        inst.setLinea = (i, pts, color, width, opacity) => {
            inst.lineas[i] = { pts: pts, color: color, width: width, opacity: opacity, dyn: true };
            if (inst.svg) rxMMDibujar(inst, true);
        };
        inst.setMarcas = (marcas) => {
            inst.marcas = marcas || [];
            if (inst.svg) rxMMDibujar(inst, false);
        };
        inst.destruir = () => { try { cont.innerHTML = ''; } catch (_) { /* noop */ } };
        // Pan con arrastre.
        let drag = null;
        cont.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            drag = { x: e.clientX, y: e.clientY, ox: inst.ox, oy: inst.oy };
            try { cont.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
            e.preventDefault();
        });
        cont.addEventListener('pointermove', (e) => {
            if (!drag) return;
            inst.ox = drag.ox - (e.clientX - drag.x);
            inst.oy = drag.oy - (e.clientY - drag.y);
            rxMMTiles(inst); rxMMDibujar(inst, false);
        });
        const fin = () => { drag = null; };
        cont.addEventListener('pointerup', fin);
        cont.addEventListener('pointercancel', fin);
        // Zoom con rueda, centrado en el cursor.
        cont.addEventListener('wheel', (e) => {
            const nz = clamp(inst.z + (e.deltaY < 0 ? 1 : -1), 2, 19);
            if (nz === inst.z) return;
            e.preventDefault();
            const rect = cont.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const f = Math.pow(2, nz - inst.z);
            inst.ox = (inst.ox + mx) * f - mx;
            inst.oy = (inst.oy + my) * f - my;
            inst.z = nz;
            rxMMTiles(inst); rxMMDibujar(inst, false);
        }, { passive: false });
        inst.encuadrar();
        return inst;
    }
    // Mini-mapa estatico en HTML (tiles + SVG) para incrustar en el reporte PDF.
    // Los tiles son <img> normales: el navegador los carga y los imprime.
    function rxMiniMapaHTML(cfg, W, H) {
        const o = cfg || {};
        const inst = {
            W: Math.max(160, W || 680), H: Math.max(120, H || 300), z: 16, ox: 0, oy: 0,
            lineas: o.lineas || [], marcas: o.marcas || [], pos: o.pos || null
        };
        rxMMFit(inst);
        let svg = '';
        (inst.lineas || []).forEach((ln) => { svg += rxMMLineaHTML(inst, ln); });
        svg += rxMMMarcasHTML(inst);
        if (inst.pos) {
            const q = rxMMPt(inst, inst.pos.lat, inst.pos.lon);
            svg += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7" fill="#850D22" stroke="#fff" stroke-width="2"/>';
        }
        return '<div class="rondo-mm-print" style="width:' + inst.W + 'px;height:' + inst.H + 'px">' +
            rxMMTilesHTML(inst, false) +
            '<svg width="' + inst.W + '" height="' + inst.H + '" viewBox="0 0 ' + inst.W + ' ' + inst.H + '">' + svg + '</svg>' +
            '</div>';
    }
    // Lineas y marcadores de una ruta (trazo resaltado con halo).
    function rxRutaLineasMarcas(r) {
        const lineas = [{ pts: r.coords.map((c) => ({ lat: c[1], lon: c[0] })), color: '#850D22', width: 4, opacity: 0.95, glow: true }];
        const marcas = [];
        if (r.origen) marcas.push({ lat: r.origen.lat, lon: r.origen.lon, color: '#2e7d32', radio: 6, txt: 'Origen' });
        (r.paradas || []).forEach((p, i) => {
            if (p.coords) marcas.push({ lat: p.coords.lat, lon: p.coords.lon, color: '#1565c0', radio: 5, txt: (i + 1) + '. ' + (p.texto || '') });
        });
        if (r.destino) marcas.push({ lat: r.destino.lat, lon: r.destino.lon, color: '#b71c1c', radio: 6, txt: 'Destino' });
        return { lineas: lineas, marcas: marcas };
    }
    // Mini-mapas de las tarjetas de la pestana Rutas. Para que no parpadeen ni
    // se reencuadren, NO van dentro del HTML que se repinta cada segundo: se
    // crean una vez como capa absoluta dentro de la lista y solo se reposicionan
    // sobre su hueco (.rr-mini) en cada repintado.
    const _rxRutaMini = new Map(); // eco -> { inst, hold, key, w, h }
    function rxRutasMiniSync(filas) {
        const list = byId('rondo-lista-rutas');
        if (!list) return;
        const listRect = list.getBoundingClientRect();
        const vistos = new Set();
        (filas || []).forEach((x) => {
            const info = x && x.info ? x.info : x;
            if (!info || !info.clave) return;
            const eco = info.clave;
            const r = rutaDe(info);
            if (!r || !r.coords || r.coords.length < 2) return;
            const ph = byId('rondo-ru-mini-' + eco);
            if (!ph) return;
            vistos.add(eco);
            const st = x && x.st ? x.st : null;
            const er = (typeof estadoRuta === 'function') ? estadoRuta(info, st) : { snap: null };
            const s = er.snap || null;
            const key = (r.creada || 0) + ':' + eco + ':' + r.coords.length;
            const phRect = ph.getBoundingClientRect();
            const w = Math.max(120, Math.round(phRect.width || 300));
            const h = Math.max(90, Math.round(phRect.height || 150));
            const left = Math.round(phRect.left - listRect.left);
            const top = Math.round(phRect.top - listRect.top);
            let ent = _rxRutaMini.get(eco);
            if (!ent || ent.key !== key) {
                if (ent) {
                    try { ent.inst.destruir(); } catch (_) { /* noop */ }
                    if (ent.hold && ent.hold.parentNode) ent.hold.parentNode.removeChild(ent.hold);
                }
                const hold = document.createElement('div');
                hold.className = 'rr-mini-abs';
                hold.style.left = left + 'px'; hold.style.top = top + 'px';
                hold.style.width = w + 'px'; hold.style.height = h + 'px';
                list.appendChild(hold);
                const lm = rxRutaLineasMarcas(r);
                lm.lineas.push({ pts: [], dyn: true });
                const pos = (st && st.lat != null) ? { lat: st.lat, lon: st.lon } : null;
                ent = { inst: rxMiniMapa(hold, { lineas: lm.lineas, marcas: lm.marcas, pos: pos }), hold: hold, key: key, w: w, h: h };
                _rxRutaMini.set(eco, ent);
            } else {
                // El repintado vacio la lista: re-inserta la capa (conserva tiles y paneo).
                if (ent.hold.parentNode !== list) list.appendChild(ent.hold);
                if (ent.hold.style.left !== (left + 'px')) ent.hold.style.left = left + 'px';
                if (ent.hold.style.top !== (top + 'px')) ent.hold.style.top = top + 'px';
                if (ent.w !== w || ent.h !== h) {
                    ent.hold.style.width = w + 'px'; ent.hold.style.height = h + 'px';
                    ent.w = w; ent.h = h;
                    try { ent.inst.medir(); ent.inst.render(); } catch (_) { /* noop */ }
                }
            }
            if (s && st && st.lat != null) {
                const idx = clamp((s.idx || 0) + 1, 0, r.coords.length - 1);
                const paso = Math.max(1, Math.ceil((idx + 1) / 200));
                const pts = [];
                for (let i = 0; i <= idx; i += paso) { const c = r.coords[i]; pts.push({ lat: c[1], lon: c[0] }); }
                pts.push({ lat: st.lat, lon: st.lon });
                ent.inst.setLinea(1, pts, '#1565c0', 4, 0.95);
                ent.inst.setPos(st.lat, st.lon);
            } else {
                ent.inst.setLinea(1, [], '#1565c0', 4, 0.95);
                ent.inst.setPos(null, null);
            }
        });
        _rxRutaMini.forEach((ent, eco) => {
            if (vistos.has(eco)) return;
            try { ent.inst.destruir(); } catch (_) { /* noop */ }
            if (ent.hold && ent.hold.parentNode) ent.hold.parentNode.removeChild(ent.hold);
            _rxRutaMini.delete(eco);
        });
    }
    // Abre una ventana con el mini-mapa de la ruta planificada de una unidad.
    function rxRutaMiniMapa(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.coords || r.coords.length < 2) { adviceWarn('Sin ruta', 'No hay una ruta trazada para ' + eco + '.'); return; }
        const lm = rxRutaLineasMarcas(r);
        const resumen = Math.round((r.total || 0) / 1000) + ' km' +
            (r.modo ? ' \u00b7 ' + r.modo : '') + ' \u00b7 ' + ((r.paradas || []).length) + ' parada(s)';
        abrirDialogo({
            icon: UIS.map,
            titulo: 'Ruta de ' + eco,
            html: '<div class="rondo-mm-resumen">' + esc(resumen) + '</div>' +
                '<div id="rondo-ruta-minimapa" class="rondo-minimapa"></div>' +
                '<div class="rondo-mm-hint">Arrastra para mover, rueda para acercar. Trazo y marcadores de Rondo.</div>',
            cancelText: 'Cerrar',
            okText: 'Cerrar',
            onOk: () => {},
            ancho: 860,
            onOpen: (el) => {
                const cont = el.querySelector('#rondo-ruta-minimapa');
                if (cont) rxMiniMapa(cont, { lineas: lm.lineas, marcas: lm.marcas });
            }
        });
    }
    // Alternativa garantizada: abrir la ruta en Google Maps con paradas.
    function rxRutaGoogleMaps(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.origen || !r.destino) { adviceWarn('Sin ruta', eco); return; }
        const paradas = (r.paradas || []).map((p) => p.coords).filter(Boolean);
        const o = r.origen, d = r.destino;
        let url = 'https://www.google.com/maps/dir/?api=1&origin=' + o.lat + ',' + o.lon +
            '&destination=' + d.lat + ',' + d.lon + '&travelmode=driving';
        if (paradas.length > 1) {
            const wp = paradas.slice(0, -1).map((p) => p.lat + ',' + p.lon).slice(0, 10).join('|');
            if (wp) url += '&waypoints=' + encodeURIComponent(wp);
        }
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
    }
    // Alternativa: abrir la ruta en OpenStreetMap (una parada como destino).
    function rxRutaOSM(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.origen) { adviceWarn('Sin ruta', eco); return; }
        const d = r.destino || r.origen;
        const url = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' +
            r.origen.lat + ',' + r.origen.lon + ';' + d.lat + ',' + d.lon;
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
    }
    /* ====================== REPLAY DEL DIA (v6.0.12) ======================
     * Reproduce el recorrido de una unidad en un dia o en un rango de horas.
     * Solo lectura: pide el historial con messages/load_interval y lo dibuja en
     * el mini-mapa propio de Rondo (tiles de OSM), sin depender del mapa de la
     * plataforma.
     *
     * Incluye: buscador de unidades, rango por dia y horas, resumen del tramo,
     * perfil de velocidad, paradas (zona/municipio), eventos (geocercas,
     * excesos, desvios) y exportacion (GeoJSON del recorrido, CSV de paradas).
     */
    let RX_REPLAY = null;
    let _rxRepSug = [];
    let _rxRepSugIdx = -1;

    function rxReplayHHMM(t) {
        try { return new Date((Number(t) || 0) * 1000).toLocaleTimeString().slice(0, 5); } catch (_) { return '--:--'; }
    }
    function rxReplayFechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }
    function rxReplayRango(fecha, h1, h2, fecha2) {
        // Inicio y fin son fecha+hora independientes: si no se indica fecha de
        // fin, el rango cae en el mismo dia que el inicio (compatibilidad).
        const f1 = String(fecha || rxReplayFechaHoy());
        const f2 = String(fecha2 || f1);
        const t1 = /^\d{1,2}:\d{2}$/.test(h1) ? h1 : '00:00';
        const t2 = /^\d{1,2}:\d{2}$/.test(h2) ? h2 : '23:59';
        let desde = Math.floor(new Date(f1 + 'T' + t1 + ':00').getTime() / 1000);
        let hasta = Math.floor(new Date(f2 + 'T' + t2 + ':59').getTime() / 1000);
        const ahora = Math.floor(Date.now() / 1000);
        if (!isFinite(desde)) desde = ahora - 86400;
        if (!isFinite(hasta)) hasta = ahora;
        if (hasta > ahora) hasta = ahora;
        return { desde: desde, hasta: hasta };
    }
    // Estado de motor (ignicion) de un mensaje, si el sensor viene entre sus
    // parametros. Devuelve true/false, o null si no hay dato. El nombre del
    // sensor depende de cada instalacion, asi que se aceptan los tipicos.
    const RX_MOTOR_KEYS = ['engine', 'ignition', 'acc', 'motor', 'encendido', 'engineoperation', 'ignicion'];
    function rxMotorMsg(m) {
        if (!m) return null;
        if (m.eng === true || m.eng === false) return m.eng;
        const p = m.params;
        if (!p || typeof p !== 'object') return null;
        for (const k of Object.keys(p)) {
            const kk = String(k).toLowerCase().replace(/[\s_]/g, '');
            if (RX_MOTOR_KEYS.indexOf(kk) < 0) continue;
            const v = p[k];
            if (v === true || v === 1) return true;
            if (v === false || v === 0) return false;
            const s = String(v).trim().toLowerCase();
            if (s === '1' || s === 'on' || s === 'true' || s === 'encendido') return true;
            if (s === '0' || s === 'off' || s === 'false' || s === 'apagado') return false;
        }
        return null;
    }
    // Clasifica el motor de una parada a partir de las muestras del sensor y
    // del mayor hueco de reporte (s). Si no hay sensor, estima: un hueco
    // largo = apagado; reporte continuo a velocidad 0 = encendido (ralenti).
    function rxMotorClasificar(muestras, gapMaxS, gapMinS) {
        let on = 0, off = 0;
        for (const v of (muestras || [])) { if (v === true) on++; else if (v === false) off++; }
        if (on || off) return { motor: (on >= off) ? 'on' : 'off', fuente: 'sensor' };
        return { motor: ((Number(gapMaxS) || 0) >= (Number(gapMinS) || 0)) ? 'off' : 'on', fuente: 'estimado' };
    }
    function rxReplayColor(tipo) {
        return { parada: '#7d8595', exceso: '#b71c1c', zona: '#1565c0', desvio: '#e65100' }[tipo] || '#888';
    }
    function rxReplayDescargar(nombre, texto, mime) {
        try {
            const a = makeEl('a', { href: URL.createObjectURL(new Blob([texto], { type: mime || 'text/plain;charset=utf-8;' })) });
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) { /* noop */ } }, 1500);
        } catch (_) { adviceWarn('No se pudo exportar', nombre); }
    }
    // ---- Buscador de unidades (combobox) ----
    function rxReplayUnidades() {
        const out = [], vistos = new Set();
        const push = (u) => {
            let info; try { info = parseUnitName(u); } catch (_) { return; }
            const eco = info.eco || info.clave;
            if (!eco || vistos.has(eco)) return;
            vistos.add(eco);
            out.push({ eco: eco, placa: info.placa || '', nombre: info.nombre || '', etq: eco + (info.placa ? ' \u00b7 ' + info.placa : '') });
        };
        (APP.unidades || []).forEach((u) => { try { if (shouldWatch(u)) push(u); } catch (_) { /* noop */ } });
        (APP.unidades || []).forEach(push);
        return out;
    }
    function rxReplayFiltrar(q) {
        const cat = rxReplayUnidades();
        const t = String(q || '').trim();
        if (!t) return cat.slice(0, 40);
        const sc = cat.map((u) => ({ u: u, s: fuzzyScore(t, u.eco + ' ' + u.placa + ' ' + u.nombre) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 30)
            .map((x) => x.u);
        // Si escribieron un economico exacto y no aparecio, lo agregamos.
        const m = /^0*(\d{3,5})\b/.exec(t);
        if (m && !sc.some((u) => u.eco === m[1])) {
            const exacto = cat.filter((u) => u.eco === m[1])[0];
            if (exacto) sc.unshift(exacto);
        }
        return sc;
    }
    function rxReplaySugResaltar() {
        const box = byId('rondo-replay-sug');
        if (!box) return;
        box.querySelectorAll('.rondo-replay-sug-item').forEach((n) => n.classList.toggle('sel', +n.dataset.i === _rxRepSugIdx));
        const sel = box.querySelector('.rondo-replay-sug-item.sel');
        if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest' }); } catch (_) { /* noop */ } }
    }
    function rxReplaySugRender() {
        const inp = byId('rondo-replay-buscar');
        const box = byId('rondo-replay-sug');
        if (!inp || !box) return;
        _rxRepSug = rxReplayFiltrar(inp.value);
        if (!_rxRepSug.length) { box.classList.remove('abierto'); box.innerHTML = ''; return; }
        if (_rxRepSugIdx >= _rxRepSug.length) _rxRepSugIdx = _rxRepSug.length - 1;
        box.innerHTML = _rxRepSug.map((u, i) =>
            '<div class="rondo-replay-sug-item' + (i === _rxRepSugIdx ? ' sel' : '') + '" data-i="' + i + '">' +
            '<span class="su-eco">' + esc(u.eco) + '</span>' +
            '<span class="su-sub">' + esc([u.placa, u.nombre].filter(Boolean).join(' \u00b7 ')) + '</span>' +
            '</div>').join('');
        box.classList.add('abierto');
        box.querySelectorAll('.rondo-replay-sug-item').forEach((n) => {
            n.onclick = () => rxReplayElegir(+n.dataset.i);
            n.onmouseenter = () => { _rxRepSugIdx = +n.dataset.i; rxReplaySugResaltar(); };
        });
    }
    function rxReplayCerrarSug() {
        const box = byId('rondo-replay-sug');
        if (box) { box.classList.remove('abierto'); box.innerHTML = ''; }
        _rxRepSugIdx = -1;
    }
    function rxReplayElegir(i) {
        const u = _rxRepSug[i];
        if (!u) return;
        rxReplaySetUnidad(u.eco, u.etq);
    }
    function rxReplaySetUnidad(eco, etq) {
        APP.replayEco = eco || '';
        const hid = byId('rondo-replay-eco');
        if (hid) hid.value = APP.replayEco;
        const inp = byId('rondo-replay-buscar');
        if (inp) inp.value = etq || eco || '';
        rxReplayCerrarSug();
    }
    // ---- Analisis del recorrido ----
    function rxReplayDetalleParada(lat, lon, zonas) {
        let zona = '', municipio = '';
        try { if (zonas && lat != null) zona = zoneAt(lat, lon) || ''; } catch (_) { /* noop */ }
        try { const m = municipioEn(lat, lon); municipio = (m && m.nombre) ? m.nombre : ''; } catch (_) { /* noop */ }
        return { zona: zona, municipio: municipio };
    }
    // ---- Lugares de OpenStreetMap para las paradas ----
    // Etiqueta de una parada: lugar de OSM > geocerca > municipio > coordenadas.
    function rxReplayParadaEtiqueta(p) {
        if (!p) return '';
        if (p.lugar) return p.lugar + (p.categoria ? ' (' + p.categoria + ')' : '');
        if (p.zona) return p.zona;
        if (p.municipio) return p.municipio;
        return (+p.lat).toFixed(4) + ',' + (+p.lon).toFixed(4);
    }
    function rxReplayParadaTooltip(p) {
        const partes = [];
        if (p.lugar) partes.push(p.lugar + (p.categoria ? ' (' + p.categoria + ')' : ''));
        if (p.direccion && p.direccion !== p.lugar) partes.push(p.direccion);
        if (p.zona) partes.push('geocerca: ' + p.zona);
        if (p.municipio) partes.push('municipio: ' + p.municipio);
        partes.push((+p.lat).toFixed(5) + ',' + (+p.lon).toFixed(5));
        return partes.join(' \u00b7 ');
    }
    function rxReplayCatPOI(t) {
        if (!t) return 'lugar';
        if (t.shop) {
            const map = { convenience: 'tienda de conveniencia', supermarket: 'supermercado', bakery: 'panaderia', butcher: 'carniceria', greengrocer: 'fruteria', clothes: 'ropa', hardware: 'ferreteria', car_repair: 'taller', tyres: 'llantera', pharmacy: 'farmacia', beverages: 'bebidas', department_store: 'tienda', variety_store: 'tienda', wholesale: 'mayoreo', doityourself: 'ferreteria', mall: 'plaza' };
            return map[t.shop] || ('tienda de ' + t.shop);
        }
        if (t.amenity) {
            const map = { fuel: 'gasolinera', restaurant: 'restaurante', fast_food: 'comida rapida', cafe: 'cafeteria', bank: 'banco', atm: 'cajero', pharmacy: 'farmacia', hospital: 'hospital', clinic: 'clinica', school: 'escuela', parking: 'estacionamiento', marketplace: 'mercado', toilets: 'sanitarios', place_of_worship: 'templo', police: 'policia' };
            return map[t.amenity] || ('servicio de ' + t.amenity);
        }
        if (t.tourism) return 'turismo';
        if (t.leisure) return 'ocio';
        if (t.office) return 'oficina';
        return 'lugar';
    }
    async function rxReplayPoiCerca(lat, lon, radio) {
        const q = '[out:json][timeout:12];(' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["shop"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["amenity"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["tourism"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["leisure"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["office"];' +
            ');out center 25;';
        const res = await _rxFetchJson('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(q)
        }, 12000);
        const els = (res && res.elements) || [];
        let mejor = null;
        els.forEach((el) => {
            const t = el.tags || {};
            if (!t.name) return;
            const y = (el.lat != null) ? el.lat : (el.center && el.center.lat);
            const x = (el.lon != null) ? el.lon : (el.center && el.center.lon);
            if (y == null || x == null) return;
            const d = haversine(lat, lon, y, x);
            if (d > radio) return;
            if (!mejor || d < mejor.dist) mejor = { nombre: t.name, categoria: rxReplayCatPOI(t), direccion: '', dist: Math.round(d) };
        });
        return mejor;
    }
    async function rxReplayReversa(lat, lon) {
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=es&lat=' + lat + '&lon=' + lon;
        const d = await _rxFetchJson(url, {}, 15000);
        if (!d) return null;
        const a = d.address || {};
        const via = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
        const colonia = a.suburb || a.neighbourhood || a.city_district || a.quarter || '';
        const ciudad = a.city || a.town || a.village || a.municipality || a.county || '';
        const direccion = [via, colonia, ciudad].filter(Boolean).join(', ');
        const nombre = (d.name && d.name !== ciudad) ? d.name : '';
        if (!nombre && !direccion) return null;
        return { nombre: nombre, categoria: '', direccion: direccion, dist: null };
    }
    const _rxRepLugares = new Map(); // "lat,lon" -> lugar|null
    async function rxReplayLugarOSM(lat, lon) {
        if (lat == null || lon == null) return null;
        const key = (+lat).toFixed(5) + ',' + (+lon).toFixed(5);
        if (_rxRepLugares.has(key)) return _rxRepLugares.get(key);
        let out = null;
        if (APP.config && APP.config.overpass) {
            try { out = await rxReplayPoiCerca(lat, lon, 90); } catch (_) { out = null; }
        }
        if (!out) {
            try { out = await rxReplayReversa(lat, lon); } catch (_) { out = null; }
        }
        _rxRepLugares.set(key, out);
        return out;
    }
    // Ubica las paradas con OSM en segundo plano y refresca la lista/mapa.
    async function rxReplayUbicarParadas() {
        const r = RX_REPLAY;
        if (!r || !r.paradas || !r.paradas.length) return;
        const pend = r.paradas.filter((p) => p.lugar === undefined);
        if (!pend.length) return;
        r.ubicando = true;
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        for (let i = 0; i < pend.length; i++) {
            if (RX_REPLAY !== r) return;
            const p = pend[i];
            let lugar = null;
            try { lugar = await rxReplayLugarOSM(p.lat, p.lon); } catch (_) { lugar = null; }
            p.lugar = lugar ? (lugar.nombre || lugar.direccion || '') : '';
            p.categoria = lugar ? (lugar.categoria || '') : '';
            p.direccion = lugar ? (lugar.direccion || '') : '';
            if (pars) {
                const celda = pars.querySelector('.rondo-replay-par[data-idx="' + p.idx + '"] .par-lugar');
                if (celda) { celda.textContent = rxReplayParadaEtiqueta(p); celda.title = rxReplayParadaTooltip(p); }
            }
        }
        if (RX_REPLAY !== r) return;
        r.ubicando = false;
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        if (r.mapa) {
            const marcas = [];
            r.paradas.forEach((p, i) => marcas.push({ lat: p.lat, lon: p.lon, color: rxReplayColor('parada'), radio: 5, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxFmtDur(p.dur) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
            r.eventos.forEach((m) => marcas.push({ lat: m.lat, lon: m.lon, color: rxReplayColor(m.tipo), radio: 5, txt: rxReplayHHMM(m.t) + ' \u00b7 ' + m.txt }));
            r.mapa.setMarcas(marcas);
        }
    }
    function rxReplayAnalizar(msgs, info) {
        const eventos = [], paradas = [];
        const paradaMinS = Math.max(60, (Number(APP.config.paradaMin) || 15) * 60);
        const limite = info ? limiteDe(info) : APP.config.velMax;
        const zonas = !!(APP.config.loadZones && (APP.zonas || []).length);
        let enParadaDesde = null, paradaLat = null, paradaLon = null, paradaIdx = 0;
        let paradaGapMax = 0, motorSamples = [];
        let zonaPrev = null;
        let excesoDesde = null, excesoMax = 0, excesoLat = null, excesoLon = null, excesos = 0;
        let detenido = 0, moviendo = 0, velMax = 0;
        const cerrarParada = (tFin, idxFin) => {
            const dur = tFin - enParadaDesde;
            if (dur >= paradaMinS) {
                const det = rxReplayDetalleParada(paradaLat, paradaLon, zonas);
                // Clasificacion del motor: si hay sensor, manda el sensor; si
                // no, se estima (hueco largo de reporte = apagado; reporte
                // continuo a velocidad 0 = encendido en ralenti).
                const gapMinS = Math.max(60, (Number(APP.config.replayGapMin) || 15) * 60);
                const cl = rxMotorClasificar(motorSamples, paradaGapMax, gapMinS);
                const motor = cl.motor, motorFuente = cl.fuente;
                paradas.push({
                    t: enParadaDesde, dur: dur, idx: paradaIdx, idxFin: idxFin,
                    lat: paradaLat, lon: paradaLon, zona: det.zona, municipio: det.municipio,
                    motor: motor, motorFuente: motorFuente, gapMax: Math.round(paradaGapMax)
                });
            }
            enParadaDesde = null;
        };
        const cerrarExceso = (idx) => {
            if (excesoDesde == null) return;
            excesos++;
            eventos.push({ t: excesoDesde, tipo: 'exceso', idx: idx, lat: excesoLat, lon: excesoLon, txt: 'Exceso ' + Math.round(excesoMax) + ' km/h (limite ' + Math.round(limite) + ')' });
            excesoDesde = null;
        };
        for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i];
            const dt = (i > 0) ? Math.max(0, m.t - (msgs[i - 1].t || m.t)) : 0;
            if (m.s > 3) { moviendo += dt; if (m.s > velMax) velMax = m.s; } else { detenido += dt; }
            if (m.s > 3) { if (enParadaDesde != null) cerrarParada(m.t, i); }
            else {
                if (enParadaDesde == null) {
                    enParadaDesde = m.t; paradaLat = m.lat; paradaLon = m.lon;
                    paradaIdx = i; paradaGapMax = 0; motorSamples = [];
                } else if (dt > paradaGapMax) paradaGapMax = dt;
                const em = rxMotorMsg(m);
                if (em !== null) motorSamples.push(em);
            }
            if (limite && m.s > limite) {
                if (excesoDesde == null) { excesoDesde = m.t; excesoMax = m.s; excesoLat = m.lat; excesoLon = m.lon; }
                else if (m.s > excesoMax) excesoMax = m.s;
            } else if (excesoDesde != null) cerrarExceso(i);
            if (zonas && m.lat != null) {
                const z = zoneAt(m.lat, m.lon) || null;
                if (z !== zonaPrev) {
                    if (z) eventos.push({ t: m.t, tipo: 'zona', idx: i, lat: m.lat, lon: m.lon, txt: 'Entra a ' + z });
                    else if (zonaPrev) eventos.push({ t: m.t, tipo: 'zona', idx: i, lat: m.lat, lon: m.lon, txt: 'Sale de ' + zonaPrev });
                    zonaPrev = z;
                }
            }
        }
        const ult = msgs[msgs.length - 1];
        if (enParadaDesde != null && ult) cerrarParada(ult.t, msgs.length - 1);
        cerrarExceso(msgs.length - 1);
        try {
            const ruta = info ? rutaDe(info) : null;
            if (ruta && ruta.coords && ruta.coords.length >= 2 && ruta.coords.length <= 4000) {
                const umbral = Number(APP.config.desvioM) || 250;
                const minSost = Math.max(60, (Number(APP.config.desvioMin) || 5) * 60);
                const paso = Math.max(1, Math.floor(msgs.length / 400));
                let memo = null, desde = null, max = 0, dLat = null, dLon = null;
                for (let i = 0; i < msgs.length; i += paso) {
                    const m = msgs[i];
                    let s = null;
                    try { s = snapRuta(m.lat, m.lon, ruta, memo); } catch (_) { s = null; }
                    memo = s;
                    if (s && s.dist > umbral) {
                        if (desde == null) { desde = m.t; max = s.dist; dLat = m.lat; dLon = m.lon; }
                        else if (s.dist > max) max = s.dist;
                    } else if (desde != null) {
                        if (m.t - desde >= minSost) eventos.push({ t: desde, tipo: 'desvio', idx: i, lat: dLat, lon: dLon, txt: 'Desvio ' + Math.round(max) + ' m del trazado' });
                        desde = null;
                    }
                }
                if (desde != null && ult && ult.t - desde >= minSost) {
                    eventos.push({ t: desde, tipo: 'desvio', idx: msgs.length - 1, lat: dLat, lon: dLon, txt: 'Desvio ' + Math.round(max) + ' m del trazado' });
                }
            }
        } catch (_) { /* sin desvios */ }
        eventos.sort((a, b) => a.t - b.t);
        const resumen = {
            distM: Math.round((ult && ult.km) || 0),
            durSeg: (ult && msgs[0]) ? Math.max(0, ult.t - msgs[0].t) : 0,
            inicio: msgs[0] ? msgs[0].t : 0,
            fin: ult ? ult.t : 0,
            detenidoSeg: Math.round(detenido),
            moviendoSeg: Math.round(moviendo),
            paradas: paradas.length,
            velMax: Math.round(velMax),
            excesos: excesos
        };
        return { eventos: eventos, paradas: paradas, resumen: resumen };
    }
    function rxReplayResumenHTML() {
        const r = RX_REPLAY;
        if (!r || !r.resumen) return '';
        const s = r.resumen;
        return '<span class="rr-chip"><b>' + esc(r.eco) + '</b></span>' +
            '<span class="rr-chip">' + rxReplayHHMM(s.inicio) + '-' + rxReplayHHMM(s.fin) + '</span>' +
            '<span class="rr-chip">' + rxFmtDist(s.distM) + '</span>' +
            '<span class="rr-chip">' + rxFmtDur(s.durSeg) + '</span>' +
            '<span class="rr-chip">' + s.paradas + ' parada(s)</span>' +
            '<span class="rr-chip">mov ' + rxFmtDur(s.moviendoSeg) + '</span>' +
            '<span class="rr-chip">det ' + rxFmtDur(s.detenidoSeg) + '</span>' +
            '<span class="rr-chip">max ' + s.velMax + ' km/h</span>' +
            (s.excesos ? '<span class="rr-chip">' + s.excesos + ' exceso(s)</span>' : '');
    }
    function rxReplayParadasHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        if (!r.paradas.length) return '<div class="rondo-replay-hint">Sin paradas de mas de ' + (APP.config.paradaMin || 15) + ' min.</div>';
        let html = r.paradas.map((p, i) =>
            '<div class="rondo-replay-par" data-idx="' + p.idx + '" data-idxfin="' + (p.idxFin == null ? p.idx : p.idxFin) + '">' +
            '<span class="par-idx">' + (i + 1) + '</span>' +
            '<span class="par-hora">' + rxReplayHHMM(p.t) + '</span>' +
            '<span class="par-dur">' + rxFmtDur(p.dur) + '</span>' +
            (p.motor ? '<span class="par-motor' + (p.motor === 'off' ? ' off' : '') + '" title="' +
                (p.motorFuente === 'sensor' ? 'Segun el sensor de motor de la unidad' : 'Estimado por el patron de reporte (hueco largo = apagado)') + '">' +
                'motor ' + (p.motor === 'off' ? 'apagado' : 'encendido') + (p.motorFuente === 'estimado' ? ' (est.)' : '') + '</span>' : '') +
            '<span class="par-lugar" title="' + esc(rxReplayParadaTooltip(p)) + '">' + esc(rxReplayParadaEtiqueta(p)) + '</span>' +
            '</div>'
        ).join('');
        if (r.ubicando) html += '<div class="rondo-replay-hint">Ubicando las paradas con OpenStreetMap...</div>';
        return html;
    }
    function rxReplayEventosHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        if (!r.eventos.length) return '<div class="rondo-replay-hint">Sin eventos (geocercas, excesos o desvios).</div>';
        return r.eventos.map((m) =>
            '<div class="rondo-replay-ev" data-idx="' + m.idx + '">' +
            '<span class="ev-hora">' + rxReplayHHMM(m.t) + '</span>' +
            '<span class="ev-tipo ev-' + m.tipo + '">' + esc(m.tipo) + '</span>' +
            '<span class="ev-txt" title="' + esc(m.txt) + '">' + esc(m.txt) + '</span>' +
            '</div>'
        ).join('');
    }
    // ---- Perfil de velocidad ----
    function rxReplayChartHTML() {
        const r = RX_REPLAY;
        if (!r || !r.msgs.length) return '<div class="rondo-replay-vacio">Perfil de velocidad</div>';
        const W = 1000, H = 100;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const dur = Math.max(1, t1 - t0);
        const vmax = Math.max(10, r.resumen.velMax);
        const paso = Math.max(1, Math.ceil(r.msgs.length / 500));
        let d = '';
        for (let i = 0; i < r.msgs.length; i += paso) {
            const m = r.msgs[i];
            const x = ((m.t - t0) / dur) * W;
            const y = H - (Math.min(m.s, vmax) / vmax * (H - 8)) - 4;
            d += (d ? ' ' : '') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        const last = r.msgs[r.msgs.length - 1];
        d += ' ' + W + ',' + (H - (Math.min(last.s, vmax) / vmax * (H - 8)) - 4).toFixed(1);
        let mx = '';
        r.paradas.forEach((p) => { mx += '<circle cx="' + (((p.t - t0) / dur) * W).toFixed(1) + '" cy="' + (H - 3) + '" r="2.5" fill="#7d8595"/>'; });
        r.eventos.forEach((e2) => { mx += '<circle cx="' + (((e2.t - t0) / dur) * W).toFixed(1) + '" cy="' + (H - 8) + '" r="2.5" fill="' + rxReplayColor(e2.tipo) + '"/>'; });
        return '<svg id="rondo-replay-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="rondo-replay-chart-svg">' +
            '<polyline fill="none" stroke="var(--rondo-accent-2)" stroke-width="2" vector-effect="non-scaling-stroke" points="' + d + '"/>' +
            mx +
            '<line id="rondo-replay-chart-cur" x1="0" y1="0" x2="0" y2="' + H + '" stroke="var(--rondo-accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            '</svg>';
    }
    function rxReplayChartRender() {
        const cont = byId('rondo-replay-chart');
        if (cont) cont.innerHTML = rxReplayChartHTML();
    }
    function rxReplayChartCursor() {
        const r = RX_REPLAY;
        const cur = byId('rondo-replay-chart-cur');
        if (!r || !cur) return;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const dur = Math.max(1, t1 - t0);
        const x = ((r.msgs[r.idx].t - t0) / dur) * 1000;
        cur.setAttribute('x1', x.toFixed(1));
        cur.setAttribute('x2', x.toFixed(1));
    }
    // ---- Mini-mapa ----
    function rxReplayMapaCrear() {
        const r = RX_REPLAY;
        const cont = byId('rondo-replay-mapa');
        if (!cont || !r) return;
        if (r.mapa) { try { r.mapa.destruir(); } catch (_) { /* noop */ } r.mapa = null; }
        cont.innerHTML = '';
        const full = r.msgs.map((m) => ({ lat: m.lat, lon: m.lon }));
        const marcas = [];
        r.paradas.forEach((p, i) => marcas.push({ lat: p.lat, lon: p.lon, color: rxReplayColor('parada'), radio: 5, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxFmtDur(p.dur) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
        r.eventos.forEach((m) => marcas.push({ lat: m.lat, lon: m.lon, color: rxReplayColor(m.tipo), radio: 5, txt: rxReplayHHMM(m.t) + ' \u00b7 ' + m.txt }));
        r.mapa = rxMiniMapa(cont, {
            lineas: [
                { pts: full, color: '#850D22', width: 4, opacity: 0.35, glow: true },
                { pts: [], dyn: true }
            ],
            marcas: marcas,
            pos: { lat: r.msgs[r.idx].lat, lon: r.msgs[r.idx].lon }
        });
        rxReplayMarcarViajado();
    }
    function rxReplayMarcarViajado() {
        const r = RX_REPLAY;
        if (!r || !r.mapa) return;
        const n = r.idx + 1;
        const paso = Math.max(1, Math.ceil(n / 400));
        const pts = [];
        for (let i = 0; i < n; i += paso) pts.push({ lat: r.msgs[i].lat, lon: r.msgs[i].lon });
        pts.push({ lat: r.msgs[r.idx].lat, lon: r.msgs[r.idx].lon });
        r.mapa.setLinea(1, pts, '#1565c0', 4, 0.95);
    }
    // v6.9.1: centraliza el estado visual del boton Play/Pausa (icono + texto
    // + color + habilitado) para no romper el icono al cambiar de estado.
    // `enabled` es opcional: si se pasa, tambien ajusta el disabled.
    function rxReplaySetPlayBtn(playing, enabled) {
        const pb = byId('rondo-replay-play');
        if (!pb) return;
        if (enabled != null) pb.disabled = !enabled;
        const txt = pb.querySelector('.rrc-play-txt');
        if (txt) txt.textContent = playing ? 'Pausa' : 'Play';
        else pb.textContent = playing ? 'Pausa' : 'Play';
        const ico = pb.querySelector('.rrc-play-ico');
        if (ico) ico.innerHTML = playing ? UIS.pause : UIS.play;
        pb.classList.toggle('activo', !!playing);
        pb.title = playing ? 'Pausar el recorrido' : 'Reproducir el recorrido';
    }
    // v6.9.1: habilita/deshabilita los controles de reproduccion y el
    // reinicio segun haya o no un recorrido cargado.
    function rxReplaySetControles(on) {
        const pb = byId('rondo-replay-play');
        if (pb) pb.disabled = !on;
        const rb = byId('rondo-replay-reiniciar');
        if (rb) rb.disabled = !on;
    }
    function rxReplayActualizar() {
        const r = RX_REPLAY;
        if (!r) return;
        const m = r.msgs[r.idx] || r.msgs[0];
        const info = byId('rondo-replay-info');
        if (info) {
            const zonas = !!(APP.config.loadZones && (APP.zonas || []).length);
            const zona = (zonas && m.lat != null) ? (zoneAt(m.lat, m.lon) || '') : '';
            const mun = (m.lat != null) ? municipioEn(m.lat, m.lon) : null;
            info.innerHTML =
                '<span class="rr-chip"><b>' + rxReplayHHMM(m.t) + '</b></span>' +
                '<span class="rr-chip">' + Math.round(m.s) + ' km/h</span>' +
                '<span class="rr-chip">' + ((m.km || 0) / 1000).toFixed(1) + ' km</span>' +
                (zona ? '<span class="rr-chip">' + esc(zona) + '</span>' : '') +
                (mun && mun.nombre ? '<span class="rr-chip">' + esc(mun.nombre) + '</span>' : '');
        }
        const sl = byId('rondo-replay-slider');
        if (sl) sl.value = r.idx;
        rxReplaySetPlayBtn(!!r.playing, true);
        const tl = byId('rondo-replay-tiempo');
        if (tl) {
            const finM = r.msgs[r.msgs.length - 1];
            tl.textContent = rxReplayHHMM(m.t) + ' / ' + rxReplayHHMM(finM ? finM.t : m.t);
        }
        if (r.mapa) {
            r.mapa.setPos(m.lat, m.lon);
            rxReplayMarcarViajado();
        }
        rxReplayChartCursor();
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.querySelectorAll('.rondo-replay-ev').forEach((n) => n.classList.toggle('activo', +n.dataset.idx === r.idx));
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.querySelectorAll('.rondo-replay-par').forEach((n) => {
            const a = +n.dataset.idx, b = +n.dataset.idxfin;
            n.classList.toggle('activo', r.idx >= a && r.idx <= b);
        });
    }
    // v6.11.1: opciones del reporte del recorrido (que incluir en el PDF).
    // Devuelve siempre todas las claves (con sus defaults) aunque la config
    // guardada sea parcial.
    function rxReplayReporteOpts() {
        const def = { mapa: true, kpis: true, paradas: true, eventos: true, puntos: true, coords: true, soloOff: false };
        const c = (APP.config && APP.config.replayReporte) || {};
        const o = {};
        Object.keys(def).forEach((k) => { o[k] = (c[k] === undefined) ? def[k] : !!c[k]; });
        return o;
    }
    function rxReplayOpcionesSync() {
        const o = rxReplayReporteOpts();
        const map = { 'rondo-rep-mapa': 'mapa', 'rondo-rep-kpis': 'kpis', 'rondo-rep-paradas': 'paradas', 'rondo-rep-eventos': 'eventos', 'rondo-rep-puntos': 'puntos', 'rondo-rep-coords': 'coords', 'rondo-rep-solooff': 'soloOff' };
        Object.keys(map).forEach((id) => { const el = byId(id); if (el) el.checked = !!o[map[id]]; });
    }
    function rxReplayPintar() {
        const r = RX_REPLAY;
        rxReplayOpcionesSync();
        const resumen = byId('rondo-replay-resumen');
        if (resumen) resumen.innerHTML = rxReplayResumenHTML();
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.innerHTML = rxReplayEventosHTML();
        rxReplayChartRender();
        if (r) rxReplayMapaCrear();
        else {
            const cont = byId('rondo-replay-mapa');
            if (cont) cont.innerHTML = '<div class="rondo-replay-vacio"><span class="rondo-usym rv-ico">' + UIS.map + '</span><span>Carga un recorrido para verlo en el mapa</span></div>';
        }
        const sl = byId('rondo-replay-slider');
        if (sl && r) { sl.min = 0; sl.max = Math.max(0, r.msgs.length - 1); sl.value = r.idx; }
        // v6.9.1: habilita Play/Reiniciar en cuanto hay un recorrido.
        rxReplaySetControles(!!r);
        if (r) rxReplayActualizar();
    }
    function rxReplayTick() {
        const r = RX_REPLAY;
        if (!r || !r.playing) return;
        const ahora = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const dt = Math.max(0, (ahora - (r._tick || ahora)) / 1000);
        r._tick = ahora;
        const fin = r.msgs[r.msgs.length - 1].t;
        r.vt = Math.min(fin, r.vt + dt * r.factor);
        let lo = 0, hi = r.msgs.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (r.msgs[mid].t <= r.vt) { idx = mid; lo = mid + 1; } else hi = mid - 1;
        }
        r.idx = idx;
        rxReplayActualizar();
        if (r.vt >= fin) rxReplayPausar();
    }
    function rxReplayReproducir() {
        const r = RX_REPLAY;
        if (!r) return;
        if (r.idx >= r.msgs.length - 1) { r.idx = 0; r.vt = r.msgs[0].t; rxReplayActualizar(); }
        r.playing = true;
        r._tick = 0;
        if (r._timer) clearInterval(r._timer);
        r._timer = setInterval(rxReplayTick, 120);
        rxReplayActualizar();
    }
    function rxReplayPausar() {
        const r = RX_REPLAY;
        if (!r) return;
        r.playing = false;
        if (r._timer) { clearInterval(r._timer); r._timer = null; }
        rxReplayActualizar();
    }
    function rxReplayAlternar() {
        const r = RX_REPLAY;
        if (!r) return;
        if (r.playing) rxReplayPausar(); else rxReplayReproducir();
    }
    function rxReplayIrA(idx) {
        const r = RX_REPLAY;
        if (!r) return;
        r.idx = clamp(+idx || 0, 0, r.msgs.length - 1);
        r.vt = r.msgs[r.idx].t;
        rxReplayActualizar();
    }
    function rxReplayIrAFraccion(frac) {
        const r = RX_REPLAY;
        if (!r) return;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const t = t0 + clamp(frac, 0, 1) * Math.max(1, t1 - t0);
        let lo = 0, hi = r.msgs.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (r.msgs[mid].t <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
        }
        if (r.playing) rxReplayPausar();
        rxReplayIrA(idx);
    }
    function rxReplayRangoRapido(kind) {
        const f = byId('rondo-replay-fecha');
        const f2 = byId('rondo-replay-fecha2');
        const d = byId('rondo-replay-desde');
        const h = byId('rondo-replay-hasta');
        const set = (fecha, h1, h2, fechaFin) => {
            if (f) f.value = fecha;
            if (f2) f2.value = fechaFin || fecha;
            if (d) d.value = h1;
            if (h) h.value = h2;
        };
        const hoy = rxReplayFechaHoy();
        const ayer = (() => { const x = new Date(); x.setDate(x.getDate() - 1); const mm = String(x.getMonth() + 1).padStart(2, '0'); const dd = String(x.getDate()).padStart(2, '0'); return x.getFullYear() + '-' + mm + '-' + dd; })();
        if (kind === 'ayer') set(ayer, '00:00', '23:59');
        else if (kind === 'dia') set(f && f.value ? f.value : hoy, '06:00', '18:00');
        else if (kind === 'noche') set(f && f.value ? f.value : hoy, '18:00', '23:59');
        else if (kind === '24h') {
            // Ultimas 24 h cruzando la medianoche (ayer a esta hora -> hoy).
            const x = new Date();
            const hhmm = String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
            set(ayer, hhmm, hhmm, hoy);
        }
        else set(hoy, '00:00', '23:59');
    }
    function rxReplayExportarGeoJSON() {
        const r = RX_REPLAY;
        if (!r) { adviceWarn('Sin recorrido', 'Carga un recorrido primero.'); return; }
        const features = [{
            type: 'Feature',
            properties: { eco: r.eco, desde: new Date(r.resumen.inicio * 1000).toISOString(), hasta: new Date(r.resumen.fin * 1000).toISOString(), km: Math.round(r.resumen.distM / 1000) },
            geometry: { type: 'LineString', coordinates: r.msgs.map((m) => [+m.lon.toFixed(6), +m.lat.toFixed(6)]) }
        }];
        r.paradas.forEach((p, i) => features.push({
            type: 'Feature',
            properties: { tipo: 'parada', n: i + 1, hora: rxReplayHHMM(p.t), durMin: Math.round(p.dur / 60), motor: p.motor || '', motorFuente: p.motorFuente || '', zona: p.zona || '', municipio: p.municipio || '' },
            geometry: { type: 'Point', coordinates: [+p.lon.toFixed(6), +p.lat.toFixed(6)] }
        }));
        r.eventos.forEach((e2) => features.push({
            type: 'Feature',
            properties: { tipo: e2.tipo, hora: rxReplayHHMM(e2.t), texto: e2.txt },
            geometry: { type: 'Point', coordinates: [+e2.lon.toFixed(6), +e2.lat.toFixed(6)] }
        }));
        rxReplayDescargar('rondo-replay-' + r.eco + '-' + r.fecha + '.geojson',
            JSON.stringify({ type: 'FeatureCollection', features: features }, null, 2),
            'application/geo+json;charset=utf-8;');
    }
    function rxReplayExportarParadasCSV() {
        const r = RX_REPLAY;
        if (!r) { adviceWarn('Sin recorrido', 'Carga un recorrido primero.'); return; }
        const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const filas = [['n', 'hora', 'duracion_min', 'motor', 'lat', 'lon', 'zona', 'municipio']];
        r.paradas.forEach((p, i) => filas.push([i + 1, rxReplayHHMM(p.t), Math.round(p.dur / 60), (p.motor || '') + (p.motorFuente === 'estimado' ? ' (est.)' : ''), p.lat.toFixed(5), p.lon.toFixed(5), p.zona || '', p.municipio || '']));
        rxReplayDescargar('rondo-paradas-' + r.eco + '-' + r.fecha + '.csv',
            '\uFEFF' + filas.map((f) => f.map(q).join(',')).join('\r\n'),
            'text/csv;charset=utf-8;');
    }
    function rxReplayLimpiar() {
        const r = RX_REPLAY;
        if (r && r._timer) clearInterval(r._timer);
        if (r && r.mapa) { try { r.mapa.destruir(); } catch (_) { /* noop */ } }
        RX_REPLAY = null;
        const cont = byId('rondo-replay-mapa');
        if (cont) cont.innerHTML = '<div class="rondo-replay-vacio"><span class="rondo-usym rv-ico">' + UIS.map + '</span><span>Carga un recorrido para verlo en el mapa</span></div>';
        const chart = byId('rondo-replay-chart');
        if (chart) chart.innerHTML = '<div class="rondo-replay-vacio">Perfil de velocidad</div>';
        const info = byId('rondo-replay-info');
        if (info) info.innerHTML = '';
        const resumen = byId('rondo-replay-resumen');
        if (resumen) resumen.innerHTML = '';
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = '';
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.innerHTML = '';
        const sl = byId('rondo-replay-slider');
        if (sl) { sl.max = 0; sl.value = 0; }
        const tl = byId('rondo-replay-tiempo');
        if (tl) tl.textContent = '--:-- / --:--';
        // v6.9.1: restaura el boton Play sin romper el icono y apaga los
        // controles hasta que se cargue un recorrido.
        rxReplaySetPlayBtn(false, false);
        rxReplaySetControles(false);
        const est = byId('rondo-replay-estado');
        if (est) { est.textContent = ''; est.className = 'rrc-estado'; }
        const cargarTxt = byId('rondo-replay-cargar');
        if (cargarTxt) {
            const t = cargarTxt.querySelector('.rrc-cargar-txt');
            if (t) t.textContent = 'Cargar recorrido';
        }
    }
    // v6.9.1: linea de estado bajo el boton Cargar (cargando / cargado /
    // sin resultados / error). `tipo` cambia el color via CSS.
    function rxReplayEstado(txt, tipo) {
        const el = byId('rondo-replay-estado');
        if (!el) return;
        el.textContent = txt || '';
        el.className = 'rrc-estado' + (tipo ? ' ' + tipo : '');
    }
    async function rxReplayCargar() {
        let eco = APP.replayEco || '';
        if (!eco) {
            const inp = byId('rondo-replay-buscar');
            const t = inp ? inp.value.trim() : '';
            if (t) { const cand = rxReplayFiltrar(t)[0]; if (cand) eco = cand.eco; }
        }
        if (!eco) {
            const inp = byId('rondo-replay-buscar');
            if (inp) try { inp.focus(); } catch (_) { /* noop */ }
            rxReplayEstado('Elige una unidad para reproducir.', 'warn');
            adviceWarn('Sin unidad', 'Busca y elige una unidad para reproducir.');
            return;
        }
        const it = unitByEco(eco);
        if (!it) { rxReplayEstado('Unidad no encontrada: ' + eco, 'err'); adviceWarn('Unidad no encontrada', eco); return; }
        const ucat = rxReplayUnidades().filter((x) => x.eco === eco)[0];
        rxReplaySetUnidad(eco, ucat ? ucat.etq : eco);
        const fechaEl = byId('rondo-replay-fecha');
        const fecha2El = byId('rondo-replay-fecha2');
        const h1 = byId('rondo-replay-desde');
        const h2 = byId('rondo-replay-hasta');
        const fecha = (fechaEl && fechaEl.value) || rxReplayFechaHoy();
        const fecha2 = (fecha2El && fecha2El.value) || fecha;
        const rango = rxReplayRango(fecha, h1 ? h1.value : '', h2 ? h2.value : '', fecha2);
        if (rango.hasta <= rango.desde) {
            rxReplayEstado('El fin debe ser posterior al inicio.', 'warn');
            adviceWarn('Rango invalido', 'El fin debe ser posterior al inicio.');
            return;
        }
        const btn = byId('rondo-replay-cargar');
        const etq = ucat ? ucat.etq : eco;
        rxReplayEstado('Cargando recorrido de ' + etq + '...', 'cargando');
        // Mientras carga, Play/Reiniciar quedan deshabilitados para evitar
        // estados raros (se re-habilitan al terminar, ver finally).
        rxReplaySetControles(false);
        if (btn) setBusy(btn, true, 'Cargando...');
        try {
            let crudos = [];
            try {
                const r = await remoteCall('messages/load_interval', {
                    itemId: it.u.id,
                    timeFrom: rango.desde, timeTo: rango.hasta,
                    flags: 1, flagsMask: 1, loadCount: 10000
                });
                crudos = r.messages || [];
            } catch (e) { crudos = []; }
            const msgs = crudos
                .filter((m) => m && m.pos && isFinite(+m.pos.y) && isFinite(+m.pos.x))
                .map((m) => ({ t: Number(m.t) || 0, lat: +m.pos.y, lon: +m.pos.x, s: Number(m.pos.s) || 0, c: Number(m.pos.c) || 0, eng: rxMotorMsg(m), params: m.params || null }))
                .filter((m) => m.t > 0)
                .sort((a, b) => a.t - b.t);
            if (!msgs.length) {
                rxReplayLimpiar();
                rxReplayEstado('Sin recorrido de ' + etq + ' en ese rango.', 'warn');
                advice('Sin recorrido', 'No hay mensajes con posicion de ' + eco + ' en ese rango.');
                return;
            }
            let acum = 0;
            msgs[0].km = 0;
            for (let i = 1; i < msgs.length; i++) {
                const d = haversine(msgs[i - 1].lat, msgs[i - 1].lon, msgs[i].lat, msgs[i].lon);
                if (d <= 5000) acum += d;
                msgs[i].km = acum;
            }
            const an = rxReplayAnalizar(msgs, it.info);
            if (RX_REPLAY && RX_REPLAY._timer) clearInterval(RX_REPLAY._timer);
            RX_REPLAY = {
                eco: eco, clave: it.info.clave, info: it.info, fecha: fecha, fecha2: fecha2,
                desde: rango.desde, hasta: rango.hasta,
                msgs: msgs, paradas: an.paradas, eventos: an.eventos, resumen: an.resumen,
                idx: 0, vt: msgs[0].t, factor: 300, playing: false, _timer: null, _tick: 0,
                truncado: msgs.length >= 10000
            };
            rxReplayPintar();
            rxReplayUbicarParadas();
            // Resumen visible bajo el boton (sin depender del toast).
            rxReplayEstado(etq + ' \u00b7 ' + rxReplayHHMM(msgs[0].t) + '\u2013' + rxReplayHHMM(msgs[msgs.length - 1].t) +
                ' \u00b7 ' + Math.round(acum / 1000) + ' km \u00b7 ' + an.paradas.length + ' parada(s)' +
                (msgs.length >= 10000 ? ' \u00b7 truncado' : ''), 'ok');
            // Cambia el texto del boton a "Recargar" tras la primera carga.
            if (btn) {
                const t = btn.querySelector('.rrc-cargar-txt');
                if (t) t.textContent = 'Recargar recorrido';
            }
            adviceOk('Recorrido cargado', eco + ' \u00b7 ' + rxReplayHHMM(msgs[0].t) + '-' + rxReplayHHMM(msgs[msgs.length - 1].t) +
                ' \u00b7 ' + Math.round(acum / 1000) + ' km \u00b7 ' + an.paradas.length + ' parada(s)' + (msgs.length >= 10000 ? ' (truncado)' : ''));
        } catch (e) {
            rxReplayEstado('Error al cargar el recorrido: ' + ((e && e.message) || e), 'err');
        } finally {
            if (btn) setBusy(btn, false);
            // Re-habilita los controles si quedo un recorrido cargado.
            rxReplaySetControles(!!RX_REPLAY);
        }
    }
    function rxReplayAbrirUnidad(eco) {
        const u = rxReplayUnidades().filter((x) => x.eco === eco)[0];
        rxReplaySetUnidad(eco, u ? u.etq : eco);
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        const f2 = byId('rondo-replay-fecha2');
        if (f2 && !f2.value) f2.value = (f && f.value) || rxReplayFechaHoy();
        setTab('replay');
        rxReplayCargar();
    }
    function bindReplay() {
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        const f2 = byId('rondo-replay-fecha2');
        if (f2 && !f2.value) f2.value = (f && f.value) || rxReplayFechaHoy();
        const inp = byId('rondo-replay-buscar');
        if (inp) {
            inp.addEventListener('input', () => { _rxRepSugIdx = -1; rxReplaySugRender(); });
            inp.addEventListener('focus', () => rxReplaySugRender());
            inp.addEventListener('keydown', (e) => {
                const abierto = byId('rondo-replay-sug') && byId('rondo-replay-sug').classList.contains('abierto');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!abierto) { rxReplaySugRender(); return; }
                    if (_rxRepSug.length) { _rxRepSugIdx = (_rxRepSugIdx + 1) % _rxRepSug.length; rxReplaySugResaltar(); }
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (abierto && _rxRepSug.length) { _rxRepSugIdx = (_rxRepSugIdx - 1 + _rxRepSug.length) % _rxRepSug.length; rxReplaySugResaltar(); }
                    return;
                }
                if (e.key === 'Escape') {
                    if (abierto) { e.stopPropagation(); rxReplayCerrarSug(); }
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (abierto && _rxRepSugIdx >= 0) { rxReplayElegir(_rxRepSugIdx); rxReplayCargar(); return; }
                    if (_rxRepSug.length) { rxReplayElegir(0); rxReplayCargar(); return; }
                    rxReplayCargar();
                }
            });
        }
        document.addEventListener('click', (e) => {
            const wrap = e.target.closest && e.target.closest('.rondo-replay-buscar');
            if (!wrap) rxReplayCerrarSug();
        });
        const cargar = byId('rondo-replay-cargar');
        if (cargar) cargar.addEventListener('click', () => rxReplayCargar());
        const play = byId('rondo-replay-play');
        if (play) play.addEventListener('click', () => rxReplayAlternar());
        // v6.9.1: reiniciar al inicio del recorrido.
        const reiniciar = byId('rondo-replay-reiniciar');
        if (reiniciar) reiniciar.addEventListener('click', () => {
            if (!RX_REPLAY) return;
            if (RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(0);
        });
        // v6.9.1: barra espaciadora = Play/Pausa cuando la tab Replay esta
        // activa y el foco no esta en un campo de texto.
        document.addEventListener('keydown', (e) => {
            if (APP.tab !== 'replay') return;
            const tag = ((e.target && e.target.tagName) || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === ' ' || e.key === 'Spacebar') {
                if (!RX_REPLAY || RX_REPLAY.playing === undefined) return;
                e.preventDefault();
                rxReplayAlternar();
            }
        });
        const sl = byId('rondo-replay-slider');
        if (sl) sl.addEventListener('input', () => {
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+sl.value);
        });
        const vel = byId('rondo-replay-vel');
        if (vel) vel.addEventListener('change', () => {
            if (RX_REPLAY) RX_REPLAY.factor = clamp(+vel.value || 300, 10, 7200);
        });
        const centrar = byId('rondo-replay-centrar');
        if (centrar) centrar.addEventListener('click', () => { if (RX_REPLAY && RX_REPLAY.mapa) RX_REPLAY.mapa.encuadrar(); });
        const geo = byId('rondo-replay-geo');
        if (geo) geo.addEventListener('click', () => rxReplayExportarGeoJSON());
        const csv = byId('rondo-replay-csv');
        if (csv) csv.addEventListener('click', () => rxReplayExportarParadasCSV());
        const pdf = byId('rondo-replay-pdf');
        if (pdf) pdf.addEventListener('click', () => exportReplayPDF());
        // Rangos rapidos.
        document.querySelectorAll('#rondo-wrap-replay .rondo-replay-quick button[data-rango]').forEach((b) => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#rondo-wrap-replay .rondo-replay-quick button[data-rango]').forEach((x) => x.classList.remove('activo'));
                b.classList.add('activo');
                rxReplayRangoRapido(b.dataset.rango);
                rxReplayCargar();
            });
        });
        // Perfil de velocidad: clic para saltar.
        const chart = byId('rondo-replay-chart');
        if (chart) chart.addEventListener('click', (e) => {
            const rect = chart.getBoundingClientRect();
            rxReplayIrAFraccion((e.clientX - rect.left) / Math.max(1, rect.width));
        });
        const paradas = byId('rondo-replay-paradas');
        if (paradas) paradas.addEventListener('click', (e) => {
            const n = e.target.closest && e.target.closest('.rondo-replay-par');
            if (!n) return;
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+n.dataset.idx);
        });
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.addEventListener('click', (e) => {
            const n = e.target.closest && e.target.closest('.rondo-replay-ev');
            if (!n) return;
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+n.dataset.idx);
        });
        // v6.11.1: opciones del reporte (checkboxes). Se guardan en la config.
        rxReplayOpcionesSync();
        [['rondo-rep-mapa', 'mapa'], ['rondo-rep-kpis', 'kpis'], ['rondo-rep-paradas', 'paradas'],
         ['rondo-rep-eventos', 'eventos'], ['rondo-rep-puntos', 'puntos'],
         ['rondo-rep-coords', 'coords'], ['rondo-rep-solooff', 'soloOff']].forEach((par) => {
            const el = byId(par[0]);
            if (!el) return;
            el.addEventListener('change', () => {
                APP.config.replayReporte = Object.assign({}, APP.config.replayReporte, { [par[1]]: !!el.checked });
                try { writeJSON(LS.cfg, APP.config); } catch (_) { /* noop */ }
            });
        });
    }
    /* ====================== REPORTE PDF (v6.0.13) ======================
     * Genera un informe operativo completo y lo abre en el dialogo de
     * impresion del navegador para guardarlo como PDF. Sin dependencias:
     * se construye un documento HTML con CSS de impresion (A4, saltos de
     * pagina, encabezados de tabla repetidos) y se imprime desde un iframe.
     *
     * v6.11: cada fila lleva fecha y hora completas y coordenadas. El
     * reporte gana secciones, portada, indice y un resumen mas detallado.
     */
    // Fecha y hora legibles a partir de un timestamp en segundos o ms.
    function rxFechaHora(t, conSeg) {
        let n = Number(t);
        if (!isFinite(n) || n <= 0) return '-';
        if (n < 1e12) n *= 1000; // segundos -> ms
        const d = new Date(n);
        if (!isFinite(d.getTime())) return '-';
        const o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if (conSeg) o.second = '2-digit';
        try { return d.toLocaleString('es-MX', o); } catch (_) { return d.toLocaleString(); }
    }
    function rxFechaHoraCorta(t) {
        let n = Number(t);
        if (!isFinite(n) || n <= 0) return '-';
        if (n < 1e12) n *= 1000;
        const d = new Date(n);
        if (!isFinite(d.getTime())) return '-';
        try { return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
        catch (_) { return d.toLocaleString(); }
    }
    // Coordenadas en formato "lat, lon" con 5-6 decimales.
    function rxCoord(lat, lon, dec) {
        if (lat == null || lon == null || !isFinite(+lat) || !isFinite(+lon)) return '-';
        const n = (dec == null ? 5 : dec);
        return (+lat).toFixed(n) + ', ' + (+lon).toFixed(n);
    }
    // Enlace a OpenStreetMap en texto plano (util para ubicar el dato).
    function rxInfOSMUrl(lat, lon) {
        if (lat == null || lon == null) return '';
        return 'https://www.openstreetmap.org/?mlat=' + (+lat).toFixed(6) + '&mlon=' + (+lon).toFixed(6) + '#map=16/' + (+lat).toFixed(6) + '/' + (+lon).toFixed(6);
    }
    function rxInfResumenTexto(d) {
        const total = d.watched.length;
        const avisos = d.hoy.length;
        const crit = d.porSev.critico || 0;
        const alto = d.porSev.alto || 0;
        const partes = [];
        partes.push('De ' + total + ' unidad(es) en el alcance, ' + d.online.length + ' reportan en linea y ' + d.sinSenal.length + ' estan sin senal.');
        if (d.zonasCargadas) partes.push(d.enZona.length + ' dentro de geocerca y ' + d.fueraZona.length + ' fuera (de las que reportan posicion).');
        else partes.push('Las geocercas no estan cargadas, por lo que no se evaluo la pertenencia a zonas.');
        partes.push('En el dia se registraron ' + avisos + ' aviso(s)' + (avisos ? ' (' + crit + ' critico(s), ' + alto + ' alto(s)).' : '.'));
        if (d.moviendo.length || d.detenidas.length) partes.push(d.moviendo.length + ' en movimiento y ' + d.detenidas.length + ' detenidas.');
        return partes.join(' ');
    }
    function rxInformeDatos() {
        const now = new Date();
        const ini = new Date(); ini.setHours(0, 0, 0, 0);
        const toda = !!APP.config.watchAll;
        const watched = (APP.unidades || []).filter((u) => { try { return toda || shouldWatch(u); } catch (_) { return false; } });
        const filas = watched.map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const zonasCargadas = !!(APP.config.loadZones && (APP.zonas || []).length);
        const conPos = filas.filter((x) => x.st.lat != null);
        const enZona = zonasCargadas ? conPos.filter((x) => { try { return !!zoneAt(x.st.lat, x.st.lon); } catch (_) { return false; } }) : [];
        const fueraZona = zonasCargadas ? conPos.filter((x) => enZona.indexOf(x) < 0) : [];
        const hoy = (APP.historial || []).filter((a) => a.ts >= ini.getTime());
        const porSev = {};
        hoy.forEach((a) => { porSev[a.sev] = (porSev[a.sev] || 0) + 1; });
        return {
            now: now, ini: ini, toda: toda, watched: filas, zonasCargadas: zonasCargadas,
            enZona: enZona, fueraZona: fueraZona, hoy: hoy, porSev: porSev,
            online: filas.filter((x) => x.st.online),
            moviendo: filas.filter((x) => x.st.online && x.st.vel > 3),
            detenidas: filas.filter((x) => x.st.online && x.st.vel <= 3),
            sinSenal: filas.filter((x) => !x.st.online)
        };
    }
    function rxInfSevBadge(sev) {
        const s = String(sev || '').toLowerCase();
        const txt = s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
        return '<span class="badge sev-' + esc(s || 'bajo') + '">' + esc(txt) + '</span>';
    }
    function rxInfTabla(cabeceras, filas) {
        if (!filas.length) return '<p class="muted">Sin datos.</p>';
        return '<table><thead><tr>' + cabeceras.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
            filas.map((f) => '<tr>' + f.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
            '</tbody></table>';
    }
    function rxInfEstilo() {
        return '*{box-sizing:border-box}' +
            'body{font:10.5px/1.5 "Segoe UI",system-ui,Arial,sans-serif;color:#1c2030;margin:0;padding:0}' +
            '@page{size:A4;margin:14mm 12mm 16mm}' +
            'h1,h2,h3{margin:0}' +
            // Portada / cabecera
            '.cover{border-bottom:3px solid #850D22;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:14px}' +
            '.brand{font-size:23px;font-weight:800;letter-spacing:.6px;color:#850D22;line-height:1.05}' +
            '.brand small{display:block;font-size:10.5px;font-weight:600;color:#5a6072;letter-spacing:.3px;margin-top:3px}' +
            '.meta{text-align:right;font-size:9.5px;color:#5a6072;line-height:1.55;min-width:210px}' +
            '.meta b{color:#1c2030}' +
            '.meta .tag{display:inline-block;margin-left:4px;padding:0 6px;border-radius:8px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;background:#f0e2e6;color:#850D22;border:1px solid #e3c3ca}' +
            // KPIs
            '.kpis{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 14px}' +
            '.kpi{flex:1 1 100px;border:1px solid #d9dce4;border-radius:8px;padding:7px 9px;background:#fafbfd;border-top:2px solid #850D22}' +
            '.kpi b{display:block;font-size:17px;color:#1c2030;font-variant-numeric:tabular-nums;line-height:1.15}' +
            '.kpi span{font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;color:#5a6072}' +
            // Indice
            '.toc{border:1px solid #e3e6ee;border-radius:8px;padding:8px 12px;background:#f7f8fb;margin:0 0 12px;font-size:10px;color:#3a4050;columns:2;column-gap:22px}' +
            '.toc b{color:#850D22;display:block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;column-span:all}' +
            '.toc a{color:#3a4050;text-decoration:none}' +
            '.toc li{margin:1px 0}' +
            // Secciones
            'h2.seccion{font-size:12px;border-left:4px solid #850D22;padding:2px 0 2px 8px;margin:16px 0 7px;color:#1c2030;page-break-after:avoid;background:linear-gradient(90deg,#f7f8fb,transparent)}' +
            // Tablas
            'table{width:100%;border-collapse:collapse;font-size:9.3px;margin:0 0 8px}' +
            'th,td{border:1px solid #d9dce4;padding:3.5px 5px;text-align:left;vertical-align:top}' +
            'thead th{background:#eef1f6;font-size:8.4px;text-transform:uppercase;letter-spacing:.4px;color:#3a4050;font-weight:700}' +
            'tbody tr:nth-child(even){background:#fafbfd}' +
            'thead{display:table-header-group}tr{page-break-inside:avoid}' +
            'td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
            'td.mono,.mono{font-family:"Consolas","SFMono-Regular",Menlo,monospace;font-size:8.6px;white-space:nowrap;color:#3a4050}' +
            '.badge{display:inline-block;padding:0 6px;border-radius:8px;font-size:8.4px;font-weight:700;text-transform:uppercase;border:1px solid #ccc;white-space:nowrap}' +
            '.sev-critico{color:#b71c1c;border-color:#e7a3a3;background:#fdeaea}' +
            '.sev-alto{color:#e65100;border-color:#f0c39a;background:#fdf1e6}' +
            '.sev-medio{color:#8a6d00;border-color:#e6d79a;background:#fdf9e6}' +
            '.sev-bajo{color:#1565c0;border-color:#a9c8e8;background:#eaf3fc}' +
            '.pill{display:inline-block;padding:0 6px;border-radius:9px;font-size:8.6px;font-weight:600;background:#eef1f6;color:#3a4050;border:1px solid #d9dce4}' +
            '.ok{color:#2e7d32}.warn{color:#a1720a}.bad{color:#b71c1c}.muted{color:#6b7280}' +
            'p{margin:0 0 8px;font-size:10.2px;line-height:1.5}' +
            '.resumen{background:#f7f8fb;border:1px solid #e3e6ee;border-radius:8px;padding:9px 12px;margin:0 0 4px}' +
            '.resumen .sevline{margin-top:4px}' +
            '.ia{border:1px solid #e3e6ee;border-left:4px solid #1565c0;border-radius:6px;padding:8px 10px;background:#f7f9fc}' +
            '.callout{border:1px solid #e3e6ee;border-left:4px solid #850D22;border-radius:6px;padding:7px 10px;background:#fbfbfd;font-size:9.8px;color:#3a4050;margin:0 0 10px}' +
            '.pie{margin-top:18px;border-top:1px solid #d9dce4;padding-top:6px;font-size:8.2px;color:#8890a2;display:flex;justify-content:space-between;gap:10px}' +
            '.rondo-mm-print{position:relative;overflow:hidden;background:#eef1f6;border:1px solid #d9dce4;border-radius:6px;margin:4px 0 10px}' +
            '.rondo-mm-print .rondo-mm-tile{position:absolute;width:256px;height:256px}' +
            '.rondo-mm-print svg{position:absolute;left:0;top:0}' +
            '.mapa-leyenda{display:flex;gap:14px;flex-wrap:wrap;font-size:9.2px;color:#5a6072;margin:0 0 10px}' +
            '.mapa-leyenda i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:-1px}' +
            '.grid2{display:flex;gap:10px;flex-wrap:wrap}.grid2>div{flex:1 1 46%;min-width:0}' +
            '.vacio{border:1px dashed #d9dce4;border-radius:6px;padding:8px 10px;color:#6b7280;font-size:9.6px;background:#fafbfd}';
    }
    function rxInfCabecera(titulo, subtitulo, meta) {
        return '<div class="cover">' +
            '<div class="brand">' + esc(titulo) + '<small>' + esc(subtitulo) + '</small></div>' +
            '<div class="meta">' + meta + '</div>' +
            '</div>';
    }
    function rxInfPie() {
        return '<div class="pie"><span>Rondo &middot; generado automaticamente</span><span>Documento de solo lectura: no modifica datos en la plataforma.</span></div>';
    }
    function rxInformeHTML() {
        const d = rxInformeDatos();
        const fecha = d.now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        const hora = d.now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const kpis = [
            kpi(d.watched.length, 'Unidades'),
            kpi(d.online.length, 'En linea'),
            kpi(d.sinSenal.length, 'Sin senal'),
            kpi(d.moviendo.length, 'En movimiento'),
            kpi(d.detenidas.length, 'Detenidas'),
            kpi(d.zonasCargadas ? d.enZona.length : '-', 'En geocerca'),
            kpi(d.zonasCargadas ? d.fueraZona.length : '-', 'Fuera de geocerca'),
            kpi(d.hoy.length, 'Avisos hoy')
        ].join('');
        const sevOrden = ['critico', 'alto', 'medio', 'bajo'].filter((s) => d.porSev[s]);
        const sevResumen = sevOrden.length
            ? sevOrden.map((s) => rxInfSevBadge(s) + ' ' + d.porSev[s]).join(' &nbsp; ')
            : '<span class="muted">Sin avisos registrados hoy.</span>';

        const coords = (lat, lon) => (lat == null || lon == null)
            ? '<span class="muted">-</span>'
            : '<span class="mono">' + esc(rxCoord(lat, lon, 5)) + '</span>';

        const filasUnidades = d.watched.map((x) => {
            const info = x.info, st = x.st;
            const zona = (st.lat != null) ? (zoneAt(st.lat, st.lon) || (d.zonasCargadas ? 'Fuera de geocerca' : '-')) : '-';
            const r = rutaDe(info);
            let rutaTxt = '-';
            if (r) {
                const er = estadoRuta(info, st) || {};
                const pct = er.snap ? Math.round(er.snap.progreso * 100) : 0;
                rutaTxt = (er.estado || 'EN RUTA') + (er.snap ? ' (' + pct + '%)' : '');
            }
            const odo = odometroDe(info);
            return [
                '<b>' + esc(info.eco || info.nombre) + '</b>',
                esc(info.placa || '-'),
                st.online ? '<span class="ok">En linea</span>' : '<span class="bad">Sin senal</span>',
                esc(rxFechaHora(st.t)),
                Math.round(st.vel) + ' km/h',
                esc(zona),
                esc(rutaTxt),
                odo ? Math.round((+odo.m || 0) / 1000) + ' km' : '-',
                esc(String(limiteDe(info))) + ' km/h',
                esc(info.id == null ? '-' : String(info.id)),
                coords(st.lat, st.lon)
            ];
        });
        const filasAvisos = d.hoy.slice(0, 400).map((a) => [
            esc(rxFechaHora(a.ts, true)),
            rxInfSevBadge(a.sev),
            esc(a.regla || '-'),
            esc(a.eco || '-'),
            coords(a.lat, a.lon),
            esc(a.titulo || '') + (a.detalle ? '<br><span class="muted">' + esc(a.detalle) + '</span>' : '')
        ]);
        const rutas = d.watched.filter((x) => rutaDe(x.info)).map((x) => {
            const r = rutaDe(x.info);
            const er = estadoRuta(x.info, x.st) || {};
            const pct = er.snap ? Math.round(er.snap.progreso * 100) : 0;
            const eta = er.snap ? calcularETA(er.snap, r, x.st.vel) : null;
            return [
                '<b>' + esc(x.info.eco || x.info.nombre) + '</b>',
                esc(r.destinoTexto || '-'),
                esc(er.estado || 'EN RUTA'),
                pct + '%',
                rxFmtDist(r.total),
                eta != null ? rxFmtDur(eta) : '-',
                er.desviado ? '<span class="bad">Si</span>' : 'No',
                esc(rxFechaHora(x.st.t))
            ];
        });
        const riesgo = (APP.riesgo || []).slice(0, 200).map((z) => {
            const cen = (z.centro && z.centro.length === 2) ? z.centro : [z.lat, z.lon];
            return [
                esc(z.municipio || z.nombre || '-'),
                esc(z.estado || '-'),
                String(z.score == null ? '-' : z.score),
                z.radio_m ? Math.round(z.radio_m) + ' m' : '-',
                coords(cen[0], cen[1])
            ];
        });
        const geocercas = (APP.zonas || []).slice(0, 300).map((z) => {
            const nom = z.n || z.nombre || ('Zona ' + z.id);
            const dentro = [];
            try {
                d.watched.forEach((x) => { if (x.st.lat != null && inZone(x.st.lat, x.st.lon, z)) dentro.push(x.info.eco || x.info.nombre); });
            } catch (_) { /* noop */ }
            const tipo = z.t === 3 ? 'Circulo' : (z.t === 2 ? 'Poligono' : (z.t === 1 ? 'Linea' : 'Zona'));
            const cen = centroDeZona(z) || {};
            let area = '-';
            try { const a = zonaAreaM2(z); if (a > 0) area = (a / 1e6).toFixed(3) + ' km2'; } catch (_) { /* noop */ }
            return [
                '<b>' + esc(nom) + '</b>',
                esc(tipo),
                esc(area),
                coords(cen.lat, cen.lon),
                dentro.length ? String(dentro.length) : '0',
                esc(dentro.slice(0, 12).join(', ') + (dentro.length > 12 ? '…' : ''))
            ];
        });
        const sinSenal = d.sinSenal.map((x) => [
            '<b>' + esc(x.info.eco || x.info.nombre) + '</b>',
            esc(x.info.placa || '-'),
            esc(rxFechaHora(x.st.t)),
            esc(ageText(x.st.edadMin)),
            x.st.lat != null ? (esc(zoneAt(x.st.lat, x.st.lon) || 'Fuera de geocerca')) : '-',
            coords(x.st.lat, x.st.lon)
        ]);

        // Se construyen las secciones y a la vez el indice.
        const secciones = [];
        let n = 0;
        const push = (titulo, filas) => {
            n++;
            secciones.push({ id: 's' + n, titulo: n + '. ' + titulo, html: rxInfTabla(filas.cab, filas.rows) });
        };
        push('Unidades (' + d.watched.length + ')', {
            cab: ['Eco', 'Placa', 'Estado', 'Ultimo reporte', 'Velocidad', 'Zona', 'Ruta', 'Odometro', 'Limite', 'ID', 'Coordenadas'],
            rows: filasUnidades
        });
        push('Avisos del dia (' + d.hoy.length + ')', {
            cab: ['Fecha y hora', 'Severidad', 'Regla', 'Eco', 'Coordenadas', 'Titulo y detalle'],
            rows: filasAvisos
        });
        push('Rutas activas (' + rutas.length + ')', {
            cab: ['Eco', 'Destino', 'Estado', 'Progreso', 'Distancia', 'ETA', 'Desviado', 'Ultimo reporte'],
            rows: rutas
        });
        push('Unidades sin senal (' + sinSenal.length + ')', {
            cab: ['Eco', 'Placa', 'Ultimo reporte', 'Sin reportar', 'Ultima zona', 'Coordenadas'],
            rows: sinSenal
        });
        if (d.zonasCargadas) {
            push('Geocercas (' + (APP.zonas || []).length + ')', {
                cab: ['Geocerca', 'Tipo', 'Area', 'Centro', 'Unidades dentro', 'Ecos'],
                rows: geocercas
            });
        }
        if ((APP.riesgo || []).length) {
            push('Zonas de riesgo (' + APP.riesgo.length + ')', {
                cab: ['Municipio', 'Estado', 'Score', 'Radio', 'Coordenadas'],
                rows: riesgo
            });
        }
        const indice = '<div class="toc"><b>Contenido</b><ol>' +
            secciones.map((s) => '<li><a href="#' + s.id + '">' + esc(s.titulo) + '</a></li>').join('') +
            '</ol></div>';
        const seccion = (s) => '<h2 class="seccion" id="' + s.id + '">' + esc(s.titulo) + '</h2>' + s.html;

        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Reporte Rondo ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Vigilancia de flota',
                'Reporte operativo <span class="tag">' + esc(d.toda ? 'toda la flota' : 'vigiladas') + '</span><br>' +
                '<b>' + esc(fecha) + ', ' + esc(hora) + '</b><br>' +
                'Periodo de avisos: hoy (00:00 a ' + esc(hora) + ')<br>' +
                'Unidades en el alcance: ' + d.watched.length) +
            '<div class="kpis">' + kpis + '</div>' +
            indice +
            '<h2 class="seccion" id="resumen">Resumen ejecutivo</h2>' +
            '<div class="resumen"><p>' + esc(rxInfResumenTexto(d)) + '</p><p class="sevline" style="margin:0">' + sevResumen + '</p></div>' +
            '<div class="callout">Cada fila incluye fecha y hora y, cuando se conoce, las coordenadas del dato (latitud, longitud). ' +
            'Las coordenadas abren la ubicacion exacta en OpenStreetMap.</div>' +
            secciones.map(seccion).join('') +
            (d.zonasCargadas ? '' : '<div class="vacio">Las geocercas no estan cargadas (Ajustes &gt; General &gt; "Cargar geocercas"); no se evaluo la pertenencia a zonas.</div>') +
            rxInfPie() +
            '</body></html>';
    }
    // Reporte PDF de un recorrido del Replay (botón junto a GeoJSON/CSV).
    function rxReplayInformeHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        const o = (typeof rxReplayReporteOpts === 'function')
            ? rxReplayReporteOpts()
            : { mapa: true, kpis: true, paradas: true, eventos: true, puntos: true, coords: true, soloOff: false };
        const s = r.resumen || {};
        const fecha = new Date((s.inicio || 0) * 1000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        // Rango completo con fecha y hora (el recorrido puede cruzar medianoche).
        const rango = rxFechaHora(r.desde || s.inicio) + '  ->  ' + rxFechaHora(r.hasta || s.fin);
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const kpis = [
            kpi(r.eco, 'Unidad'),
            kpi(rxFmtDist(s.distM || 0), 'Distancia'),
            kpi(rxFmtDur(s.durSeg || 0), 'Duracion'),
            kpi((r.msgs || []).length, 'Puntos'),
            kpi((r.paradas || []).length, 'Paradas'),
            kpi((r.paradas || []).filter((p) => p.motor === 'off').length, 'Motor apagado'),
            kpi(rxFmtDur(s.moviendoSeg || 0), 'En movimiento'),
            kpi(rxFmtDur(s.detenidoSeg || 0), 'Detenido'),
            kpi((s.velMax || 0) + ' km/h', 'Vel. maxima'),
            kpi(s.excesos || 0, 'Excesos')
        ].join('');
        const coords = (lat, lon) => (lat == null || lon == null)
            ? '<span class="muted">-</span>'
            : '<span class="mono">' + esc(rxCoord(lat, lon, 5)) + '</span>';
        const paradasSel = (r.paradas || []).filter((p) => !o.soloOff || p.motor === 'off');
        const cabParadas = ['#', 'Fecha y hora', 'Duracion', 'Motor', 'Lugar (OpenStreetMap)', 'Direccion', 'Geocerca', 'Municipio'];
        if (o.coords) cabParadas.push('Coordenadas');
        const filasParadas = paradasSel.map((p, i) => {
            const row = [
                String(i + 1),
                esc(rxFechaHora(p.t, true)),
                esc(rxFmtDur(p.dur)),
                (p.motor ? (p.motor === 'off' ? '<span class="muted">Apagado</span>' : '<span class="ok">Encendido</span>') + (p.motorFuente === 'estimado' ? ' <span class="pill">est.</span>' : '') : '-'),
                '<b>' + esc(rxReplayParadaEtiqueta(p)) + '</b>',
                esc(p.direccion || ''),
                esc(p.zona || ''),
                esc(p.municipio || '')
            ];
            if (o.coords) row.push(coords(p.lat, p.lon));
            return row;
        });
        const cabEventos = ['Fecha y hora', 'Tipo', 'Detalle'];
        if (o.coords) cabEventos.push('Coordenadas');
        const filasEventos = (r.eventos || []).map((e2) => {
            const row = [esc(rxFechaHora(e2.t, true)), '<span class="pill">' + esc(e2.tipo) + '</span>', esc(e2.txt)];
            if (o.coords) row.push(coords(e2.lat, e2.lon));
            return row;
        });
        // Puntos del recorrido (muestreados para no generar miles de filas).
        const msgs = r.msgs || [];
        const paso = Math.max(1, Math.ceil(msgs.length / 400));
        const cabPuntos = ['#', 'Fecha y hora'];
        if (o.coords) cabPuntos.push('Coordenadas');
        cabPuntos.push('Velocidad', 'Rumbo', 'Acumulado');
        const filasPuntos = [];
        for (let i = 0; i < msgs.length; i += paso) {
            const m = msgs[i];
            const row = [String(i + 1), esc(rxFechaHora(m.t, true))];
            if (o.coords) row.push(coords(m.lat, m.lon));
            row.push(Math.round(m.s || 0) + ' km/h', (m.c != null ? Math.round(m.c) + '\u00b0' : '-'), Math.round((m.km || 0) / 1000) + ' km');
            filasPuntos.push(row);
        }
        // Mapa del recorrido con los puntos marcados (tiles de OSM + trazo SVG).
        const marcasMapa = [];
        (r.paradas || []).forEach((p, i) => marcasMapa.push({ lat: p.lat, lon: p.lon, color: '#7d8595', radio: 6, num: i + 1, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
        (r.eventos || []).forEach((e2) => marcasMapa.push({ lat: e2.lat, lon: e2.lon, color: rxReplayColor(e2.tipo), radio: 5, txt: rxReplayHHMM(e2.t) + ' \u00b7 ' + e2.txt }));
        const mapa = rxMiniMapaHTML({
            lineas: [{ pts: msgs.map((m) => ({ lat: m.lat, lon: m.lon })), color: '#850D22', width: 4, opacity: 0.95, glow: true }],
            marcas: marcasMapa
        }, 680, 300);
        const leyenda = '<div class="mapa-leyenda">' +
            '<span><i style="background:#850D22"></i>Recorrido</span>' +
            '<span><i style="background:#7d8595"></i>Parada (numerada)</span>' +
            '<span><i style="background:#1565c0"></i>Geocerca</span>' +
            '<span><i style="background:#b71c1c"></i>Exceso</span>' +
            '<span><i style="background:#e65100"></i>Desvio</span>' +
            '<span class="muted">Mapa: OpenStreetMap</span></div>';
        const notaPuntos = paso > 1
            ? '<div class="callout">Se listan ' + filasPuntos.length + ' de ' + msgs.length + ' puntos (cada ' + paso + ' registros)' + (o.coords ? ' con fecha, hora y coordenadas' : ' con fecha y hora') + '. El total de puntos aparece en los KPIs.</div>'
            : '<div class="callout">Se listan los ' + filasPuntos.length + ' puntos del recorrido' + (o.coords ? ' con fecha, hora y coordenadas' : ' con fecha y hora') + '.</div>';
        // Secciones elegidas en las opciones del reporte, numeradas.
        const secciones = [];
        let num = 0;
        const add = (titulo, contenido) => { num++; secciones.push('<h2 class="seccion">' + esc(num + '. ' + titulo) + '</h2>' + contenido); };
        if (o.mapa) add('Mapa del recorrido', mapa + leyenda);
        if (o.paradas) add('Paradas (' + filasParadas.length + ')', rxInfTabla(cabParadas, filasParadas));
        if (o.eventos) add('Eventos (' + filasEventos.length + ')', rxInfTabla(cabEventos, filasEventos));
        if (o.puntos) add('Puntos del recorrido', notaPuntos + rxInfTabla(cabPuntos, filasPuntos));
        const cuerpo = secciones.length
            ? secciones.join('')
            : '<div class="vacio">No seleccionaste ninguna seccion para el reporte. Marca al menos una en "Opciones del reporte" (pestana Replay).</div>';
        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Recorrido ' + esc(r.eco) + ' ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Recorrido de la unidad',
                'Unidad <b>' + esc(r.eco) + '</b><br>' + esc(rango) + '<br>Documento de solo lectura') +
            (o.kpis ? '<div class="kpis">' + kpis + '</div>' : '') +
            cuerpo +
            (r.truncado ? '<p class="muted">Nota: el historial se trunco al limite de mensajes; el resumen puede ser parcial.</p>' : '') +
            rxInfPie() +
            '</body></html>';
    }
    function exportReplayPDF() {
        if (!RX_REPLAY) { adviceWarn('Sin recorrido', 'Carga un recorrido antes de generar el PDF.'); return; }
        rxImprimirHTML(rxReplayInformeHTML());
        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
    }
    function rxImprimirHTML(html) {
        let fr = document.getElementById('rondo-print-frame');
        if (fr && fr.parentNode) fr.parentNode.removeChild(fr);
        fr = document.createElement('iframe');
        fr.id = 'rondo-print-frame';
        fr.setAttribute('style', 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none');
        document.body.appendChild(fr);
        let doc = null;
        try {
            doc = fr.contentWindow.document;
            doc.open(); doc.write(html); doc.close();
        } catch (_) {
            adviceWarn('No se pudo preparar el reporte', 'Intenta de nuevo.');
            try { fr.remove(); } catch (_) { /* noop */ }
            return;
        }
        // Espera a que carguen los tiles del mapa antes de imprimir.
        const pendientes = () => {
            try { return Array.prototype.filter.call(doc.images || [], (i) => !i.complete).length; }
            catch (_) { return 0; }
        };
        const t0 = Date.now();
        const listo = () => {
            if (pendientes() && (Date.now() - t0) < 5000) { setTimeout(listo, 150); return; }
            setTimeout(() => {
                try { fr.contentWindow.focus(); fr.contentWindow.print(); }
                catch (_) { adviceWarn('No se pudo imprimir', 'Permite la impresion/ventanas emergentes e intenta de nuevo.'); }
                setTimeout(() => { try { fr.remove(); } catch (_) { /* noop */ } }, 60000);
            }, 250);
        };
        setTimeout(listo, 400);
    }
    function exportReportePDF() {
        const d = rxInformeDatos();
        if (!d.watched.length) { adviceWarn('Sin unidades', 'No hay unidades en el alcance para el reporte.'); return; }
        rxImprimirHTML(rxInformeHTML());
        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
    }
    /* ====================== DIAGNOSTICO ======================
     * Panel de diagnostico tecnico (solo lectura) en Ajustes > Avanzado.
     * Resume el estado del propio Rondo: uso de storage por clave, fallos de
     * escritura, tamano de las caches, uso de IA del dia, errores de reglas y
     * diagnostico de geocercas. No persiste nada ni cambia la configuracion.
     *
     * Se inyecta en runtime para no tocar el HTML de Ajustes. Las funciones
     * son declaraciones (hoisting) porque rxDiagBind() se llama desde init().
     * ====================================================================== */

    function rxDiagBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // Toma el "peso" (bytes UTF-16 aprox) de cada clave rondo.api.* del
    // localStorage y del sessionStorage. Si el storage esta bloqueado,
    // devuelve lo que se haya podido leer.
    function rxDiagStorage() {
        const out = { local: [], session: [], totalLocal: 0, totalSession: 0 };
        const scan = (store, destino, campo) => {
            try {
                for (let i = 0; i < store.length; i++) {
                    const k = store.key(i);
                    if (!k || k.indexOf('rondo.api.') !== 0) continue;
                    const v = store.getItem(k) || '';
                    const bytes = (k.length + v.length) * 2;
                    destino.push({ clave: k, bytes: bytes });
                    out[campo] += bytes;
                }
            } catch (_) { /* storage bloqueado o inaccesible */ }
        };
        scan(localStorage, out.local, 'totalLocal');
        scan(sessionStorage, out.session, 'totalSession');
        out.local.sort((a, b) => b.bytes - a.bytes);
        out.session.sort((a, b) => b.bytes - a.bytes);
        return out;
    }

    function rxDiagRecolectar() {
        let iaHoy = { llamadas: 0, errores: 0 };
        try { iaHoy = iaContadorHoy() || iaHoy; } catch (_) { /* noop */ }
        return {
            ver: (typeof VER !== 'undefined') ? VER : '',
            online: (typeof navigator !== 'undefined') ? navigator.onLine : null,
            // v6.0.14: identidad de la plataforma (sitio, skin, API, idioma).
            plataforma: {
                nombre: rxPlatNombre(),
                api: rxPlatApiUrl(),
                idioma: rxPlatIdioma(),
                skin: rxPlatSkin(),
                acento: rxPlatAcento(),
                webgis: rxPlatWebgis(),
                pos: rxPlatPosDefecto()
            },
            storage: rxDiagStorage(),
            caches: {
                memo: Object.keys(APP.memo || {}).length,
                geoCache: Object.keys(APP.geoCache || {}).length,
                snapMemo: Object.keys(APP.snapMemo || {}).length,
                grafoCache: Object.keys(APP.grafoCache || {}).length,
                iaCache: (typeof IA_CACHE !== 'undefined' && IA_CACHE) ? Object.keys(IA_CACHE).length : 0
            },
            zonas: (APP.zonas || []).length,
            zonasDiag: APP.zonasDiag || null,
            // v6.12: estado de la alerta dirigida por geocerca (util para
            // saber por que no avisa: geocercas elegidas, alcance, etc).
            geoAlerta: (function () {
                try {
                    const mapa = geoAlertaPorZona();
                    const nom = Object.keys(mapa);
                    return {
                        activa: !!(APP.config.reglas && APP.config.reglas.geoAlerta),
                        geocercas: nom.length,
                        flotas: nom.filter((k) => mapa[k].alcance === 'todas').length,
                        dentro: Object.keys(APP.geoAlertaVivo || {}).length
                    };
                } catch (_) { return null; }
            })(),
            unidades: (APP.unidades || []).length,
            historial: (APP.historial || []).length,
            ia: {
                hoy: iaHoy,
                limite: +APP.config.iaLimiteDiario || 0,
                cacheTTL: +APP.config.iaCacheTTL || 0
            },
            stats: APP.stats || {},
            fallos: {
                json: (typeof writeJSON === 'function' && writeJSON._fallos) || 0,
                session: (typeof writeSession === 'function' && writeSession._fallos) || 0
            }
        };
    }

    // Texto plano del diagnostico: sirve tanto para pintar como para copiar.
    function rxDiagTexto(d) {
        if (!d) d = rxDiagRecolectar();
        const L = [];
        L.push('Rondo ' + d.ver + ' \u00b7 ' + (d.online === false ? 'sin conexion' : 'en linea'));
        const plat = d.plataforma || {};
        L.push('Plataforma: ' + (plat.nombre || 'n/d') +
            (plat.skin ? ' \u00b7 skin ' + plat.skin : '') +
            (plat.acento ? ' \u00b7 acento ' + plat.acento : '') +
            (plat.idioma ? ' \u00b7 idioma ' + plat.idioma : '') +
            (plat.webgis ? ' \u00b7 webgis ' + plat.webgis : '') +
            (plat.pos ? ' \u00b7 pos ' + plat.pos : '') +
            (plat.api ? ' \u00b7 ' + plat.api : ''));
        L.push('Unidades: ' + d.unidades + ' \u00b7 avisos: ' + d.historial + ' \u00b7 geocercas: ' + d.zonas);
        L.push('Storage local: ' + rxDiagBytes(d.storage.totalLocal) + ' (' + d.storage.local.length +
            ' claves) \u00b7 sesion: ' + rxDiagBytes(d.storage.totalSession) + ' (' + d.storage.session.length + ' claves)');
        L.push('Caches: memo ' + d.caches.memo + ' \u00b7 geo ' + d.caches.geoCache + ' \u00b7 snap ' +
            d.caches.snapMemo + ' \u00b7 grafo ' + d.caches.grafoCache + ' \u00b7 IA ' + d.caches.iaCache);
        L.push('IA hoy: ' + (d.ia.hoy.llamadas || 0) + (d.ia.limite ? '/' + d.ia.limite : '') +
            ' (errores ' + (d.ia.hoy.errores || 0) + ') \u00b7 TTL cache ' + Math.round((+d.ia.cacheTTL || 0) / 60) + ' min');
        L.push('Reglas: ' + (d.stats.erroresReglas || 0) + ' error(es) \u00b7 A* tope: ' + (d.stats.astarCap || 0));
        if (d.geoAlerta) {
            const g = d.geoAlerta;
            L.push('Alerta de geocercas: ' + (g.activa ? 'activa' : 'apagada') +
                ' \u00b7 ' + g.geocercas + ' geocerca(s) \u00b7 ' + g.flotas + ' en toda la flota' +
                ' \u00b7 ' + g.dentro + ' dentro ahora');
        }
        L.push('Fallos de escritura: local ' + d.fallos.json + ' \u00b7 sesion ' + d.fallos.session);
        if (d.zonasDiag) {
            try { L.push('Geocercas: ' + JSON.stringify(d.zonasDiag).slice(0, 300)); } catch (_) { /* noop */ }
        }
        const top = d.storage.local.slice(0, 6).map((x) => '  ' + x.clave + ' \u00b7 ' + rxDiagBytes(x.bytes));
        if (top.length) { L.push('Top storage:'); L.push.apply(L, top); }
        return L.join('\n');
    }

    function rxDiagPintar() {
        try {
            const out = byId('rondo-diag-out');
            if (out) out.textContent = rxDiagTexto(rxDiagRecolectar());
        } catch (_) { /* noop */ }
    }

    // Inyecta el bloque en la seccion Avanzado de Ajustes (una sola vez) y
    // cablea sus botones. Se llama desde init().
    function rxDiagBind() {
        const pane = document.querySelector('#rondo-config .cfg-pane[data-cfg="avanzado"]');
        if (!pane || pane.querySelector('#rondo-diag-box')) return;
        const box = makeEl('div', { id: 'rondo-diag-box' });
        box.innerHTML =
            '<h4>Diagnostico</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-diag-ver"><span class="rondo-usym">' + UIS.info + '</span> Ver diagnostico</button>' +
            '<button class="accbtn" id="rondo-diag-copiar"><span class="rondo-usym">' + UIS.export + '</span> Copiar</button>' +
            '</div>' +
            '<div id="rondo-diag-out" style="font-size:11.5px;color:var(--rondo-fg-dim);margin-top:6px;white-space:pre-wrap;font-family:monospace;line-height:1.45"></div>';
        pane.appendChild(box);
        const ver = box.querySelector('#rondo-diag-ver');
        if (ver) ver.addEventListener('click', rxDiagPintar);
        const cop = box.querySelector('#rondo-diag-copiar');
        if (cop) cop.addEventListener('click', () => {
            const txt = rxDiagTexto(rxDiagRecolectar());
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
                adviceOk('Diagnostico copiado', 'Pegalo donde lo necesites.');
            } catch (_) { adviceWarn('No se pudo copiar', 'Selecciona el texto y copialo a mano.'); }
        });
    }
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
}/* ====================== GEOCERCAS DE LA APP: NUCLEO ======================
 * Geocercas que viven SOLO en Rondo: no estan en la plataforma (ni en Wialon
 * ni en AE-Track), se dibujan a mano sobre un mapa de OpenStreetMap y se
 * guardan en la sesion del navegador. Se pueden exportar e importar para
 * moverlas entre equipos o para no dibujarlas otra vez.
 *
 * Viven en APP.zonasLocales y se anaden a APP.zonas junto a las nativas, de
 * forma que funcionan igual que las demas: cuentan en los KPIs, aparecen en
 * la lista y en las paradas, zonaAt las detecta, la alerta de geocercas les
 * aplica su propio menu y el informe y la IA las ven. Se distinguen por el
 * campo _app y por su id con prefijo, nunca por _rid (que es lo que hace
 * que la plataforma las busque).
 *
 * El nucleo es puro (no toca DOM ni red) para poder probarlo aislado en
 * tests/geocerca-local.test.js.
 */
const GEOLOC_MAX_PUNTOS = 250;      // por geocerca
const GEOLOC_MAX_ZONAS = 80;        // geocercas de la app por navegador
const GEOLOC_MIN_RADIO = 10;        // m
const GEOLOC_MAX_RADIO = 50000;     // m
const GEOLOC_NOMBRE_MAX = 60;
const GEOLOC_VERSION = 1;
// Geocercas dibujadas a la vez en el mapa (por capa): con muchas, el SVG se
// saturaria y el navegador se arrastra. La leyenda avisa cuando se recorta.
const GEOLOC_MAX_PREVIEW = 140;

// Convierte una lista de puntos (lat/lon) al formato de la plataforma:
// {x: lon, y: lat}. Descarta lo que no sea coordenada valida.
function glocPts(entrada) {
    const out = [];
    const arr = Array.isArray(entrada) ? entrada : [];
    for (let i = 0; i < arr.length && out.length < GEOLOC_MAX_PUNTOS; i++) {
        const a = arr[i];
        if (!a || typeof a !== 'object') continue;
        // {x,y} (formato de la plataforma), {lat,lon} (formato de Rondo) o
        // [lon, lat] (arrays sueltos, como los de get_zone_data).
        const y = (a.y != null) ? +a.y : (a.lat != null ? +a.lat : (Array.isArray(a) ? +a[1] : NaN));
        const x = (a.x != null) ? +a.x : (a.lon != null ? +a.lon : (Array.isArray(a) ? +a[0] : NaN));
        if (!isFinite(x) || !isFinite(y)) continue;
        if (y < -85.05 || y > 85.05 || x < -180 || x > 180) continue;
        out.push({ x: x, y: y });
    }
    return out;
}
// Lista de {lat, lon} (la que consume el mini-mapa y el guardado).
function glocLatLon(pts) {
    const out = [];
    for (let i = 0; i < (pts || []).length; i++) {
        const p = pts[i];
        if (!p) continue;
        out.push({ lat: +p.y, lon: +p.x });
    }
    return out;
}
function glocCentro(pts) {
    let sx = 0, sy = 0, n = 0;
    for (const p of (pts || [])) {
        if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
        sx += p.x; sy += p.y; n++;
    }
    return n ? { x: sx / n, y: sy / n, lat: sy / n, lon: sx / n } : null;
}
// Bounding box completo: para circulos abarca tambien el radio (si solo
// cubriera el centro, inZone descartaria fuera por el bbox y las alertas y el
// indice espacial no la verian).
function glocBBox(pts, centro, radioM) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of (pts || [])) {
        if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) return null;
    let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    if (radioM > 0 && centro) {
        const dl = radioM / (111320 * Math.cos(centro.y * Math.PI / 180) || 111320);
        const da = radioM / 110540;
        minX = Math.min(minX, centro.x - dl); maxX = Math.max(maxX, centro.x + dl);
        minY = Math.min(minY, centro.y - da); maxY = Math.max(maxY, centro.y + da);
        cx = centro.x; cy = centro.y;
    }
    return { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY, cen_x: cx, cen_y: cy };
}
function glocId() {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function glocLimpiaNom(n) {
    return String(n == null ? '' : n).replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, GEOLOC_NOMBRE_MAX);
}
// Normaliza un objeto suelto (de storage, de un import o del editor) a una
// geocerca de la app valida, o null si no se puede usar. Tolera formatos
// distintos: puntos como {x,y}, como {lat,lon} o como [lat,lon].
function glocNormaliza(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const nombre = glocLimpiaNom(raw.n || raw.nombre || raw.name);
    if (!nombre) return null;
    let t = (raw.t != null) ? +raw.t : (raw.tipo === 'circulo' || raw.type === 'Point' ? 3 : 2);
    if (t !== 1 && t !== 2 && t !== 3) t = 2;
    let pts = [];
    // Un par plano [lat, lon] es un centro, no una lista de puntos: se
    // detecta antes de pasar por glocPts (que lo leeria como x/y invertidos).
    const plano = raw.puntos;
    if (Array.isArray(plano) && plano.length === 2 && typeof plano[0] !== 'object' &&
        isFinite(+plano[0]) && isFinite(+plano[1]) && Math.abs(+plano[0]) <= 90) {
        pts = [{ x: +plano[1], y: +plano[0] }];
    } else {
        pts = glocPts(raw.p || raw.puntos || raw.coords);
    }
    let w = (raw.w != null) ? +raw.w : ((raw.radio != null) ? +raw.radio : 0);
    if (!isFinite(w)) w = 0;
    if (t === 3) {
        w = clamp(w, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
        if (!pts.length) return null;
    } else {
        w = (w > 0) ? clamp(w, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO) : 0;
        if (pts.length < (t === 1 ? 2 : 3)) return null;
    }
    const cen = (t === 3) ? { x: pts[0].x, y: pts[0].y } : glocCentro(pts);
    const b = glocBBox(pts, cen, (t === 3) ? w : 0);
    if (!b) return null;
    return {
        id: String(raw.id || glocId()),
        n: nombre,
        t: t,
        p: pts,
        // El ancho importa tambien en las lineas: inZone las trata como un
        // corredor de ese ancho, asi que sin el no contendrian nada.
        w: (t === 1) ? w : ((t === 3) ? w : 0),
        b: b,
        app: 1,
        ts: Number(raw.ts) || Date.now()
    };
}
// Nombre libre: si ya existe una geocerca con ese nombre (de la app o de la
// plataforma) se anade un sufijo. Los nombres son la clave con la que se
// direccionan tarjetas, alertas y paradas: no pueden repetirse.
function glocNombreLibre(nombre, nativos, propio) {
    // "__proto__", "constructor" y "prototype" se usan como clave en el mapa
    // de alertas por geocerca: un nombre asi se renombra antes de guardar.
    const crudo = glocLimpiaNom(nombre);
    const base = (!crudo || crudo === '__proto__' || crudo === 'constructor' || crudo === 'prototype')
        ? 'Geocerca' : crudo;
    const usados = {};
    for (const z of (nativos || [])) {
        const n = z && glocLimpiaNom(z.n);
        if (n) usados[n.toLowerCase()] = 1;
    }
    for (const z of (propio || [])) {
        const n = z && glocLimpiaNom(z.n);
        if (n) usados[n.toLowerCase()] = 1;
    }
    let out = base, i = 2;
    while (usados[out.toLowerCase()]) out = base + ' ' + i++;
    return out;
}
// ── Exportacion / importacion ────────────────────────────────────────────
// Formato propio: compacto y suficiente para volver a dibujarlas.
function glocExportaJSON(lista) {
    const feats = (lista || []).map((z) => {
        // Puntos como {lat, lon}: legible y sin confusion con el [lon, lat]
        // de GeoJSON.
        const o = { n: z.n, t: z.t, p: z.p.map((p) => ({ lat: p.y, lon: p.x })), ts: z.ts || 0 };
        if (z.t === 3) o.w = z.w;
        return o;
    });
    return JSON.stringify({ tipo: 'rondo-geocercas', version: GEOLOC_VERSION, geocercas: feats }, null, 1);
}
// GeoJSON estandar: se abre en cualquier visor y se puede editar fuera.
function glocExportaGeoJSON(lista) {
    const feats = (lista || []).map((z) => ({
        type: 'Feature',
        properties: { nombre: z.n, origen: 'rondo-app', tipo: (z.t === 3 ? 'circulo' : (z.t === 1 ? 'linea' : 'poligono')), radio_m: (z.t === 3 ? z.w : null), ts: z.ts || 0 },
        geometry: (function () {
            if (z.t === 3) {
                const c = glocCentro(z.p);
                return { type: 'Point', coordinates: [c ? c.x : 0, c ? c.y : 0] };
            }
            const ring = z.p.map((p) => [p.x, p.y]);
            if (ring.length) ring.push([ring[0][0], ring[0][1]]);
            return { type: (z.t === 1 ? 'LineString' : 'Polygon'), coordinates: (z.t === 1 ? z.p.map((p) => [p.x, p.y]) : [ring]) };
        })()
    }));
    return JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1);
}
// Parsea texto importado (formato propio, array suelto o GeoJSON).
// Devuelve {lista, ignoradas, error}.
function glocParsea(txt) {
    const out = { lista: [], ignoradas: 0, error: '' };
    let data = null;
    try {
        const t = String(txt == null ? '' : txt).trim();
        if (!t) { out.error = 'El archivo esta vacio'; return out; }
        data = JSON.parse(t);
    } catch (e) {
        out.error = 'No es JSON valido';
        return out;
    }
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.geocercas)) items = data.geocercas;
    else if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) items = data.features;
    else if (data && data.geometry) items = [data];
    // Geometria suelta (copiada de un visor de mapas).
    else if (data && (data.type === 'Polygon' || data.type === 'MultiPolygon' ||
        data.type === 'LineString' || data.type === 'Point')) {
        items = [{ type: 'Feature', geometry: data, properties: {} }];
    } else { out.error = 'El archivo no contiene geocercas'; return out; }
    for (const it of items) {
        if (!it) { out.ignoradas++; continue; }
        if (it.type === 'Feature' && it.geometry) {
            const pr = it.properties || {};
            const g = it.geometry;
            let z = null;
            if (g.type === 'Polygon' && Array.isArray(g.coordinates) && g.coordinates[0]) {
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 2, p: g.coordinates[0].map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates) && g.coordinates.length) {
                // MultiPolygon: cada elemento es un poligono (array de anillos).
                // Se toma el anillo exterior y se queda el mas grande.
                let mejor = null;
                for (const pol of g.coordinates) {
                    const anillo = (Array.isArray(pol) && Array.isArray(pol[0]) && Array.isArray(pol[0][0])) ? pol[0] : pol;
                    if (Array.isArray(anillo) && (!mejor || anillo.length > mejor.length)) mejor = anillo;
                }
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 2, p: (mejor || []).map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 1, p: g.coordinates.map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'Point' && Array.isArray(g.coordinates)) {
                z = glocNormaliza({
                    nombre: pr.nombre || pr.n, t: 3, p: [{ x: +g.coordinates[0], y: +g.coordinates[1] }],
                    w: (pr.radio_m != null) ? +pr.radio_m : 100
                });
            }
            if (z) out.lista.push(z); else out.ignoradas++;
            continue;
        }
        const z = glocNormaliza(it);
        if (z) out.lista.push(z); else out.ignoradas++;
    }
    if (!out.lista.length && !out.error) out.error = 'Ninguna geocerca utilizable';
    return out;
}

/* ====================== GEOCERCAS DE LA APP: ALMACEN ====================== */
// Lista de geocercas de la app ya validadas (filtra lo que se haya
// quedado roto en el storage sin romper la pestana).
function glocLista() {
    const crudo = Array.isArray(APP.zonasLocales) ? APP.zonasLocales : [];
    const out = [];
    for (const z of crudo) {
        const n = glocNormaliza(z);
        if (n) out.push(n);
    }
    return out;
}
// Aplica la lista al almacenamiento y la fusiona con las nativas en
// APP.zonas. IMPORTANTE: APP.zonas se REASIGNA (nunca se muta) porque el
// indice espacial se invalida comparando la identidad del array.
function glocSincroniza(lista) {
    const validas = [];
    for (const z of (lista || [])) {
        const n = glocNormaliza(z);
        if (n) validas.push(n);
    }
    APP.zonasLocales = validas;
    const nativas = (APP.zonas || []).filter((z) => z && !z.app);
    APP.zonas = nativas.concat(validas);
    APP.zonasIndex = null;
    try {
        APP.zonasPorNombre = new Map(APP.zonas.map((z) => [z.n || '', z]));
    } catch (_) { APP.zonasPorNombre = new Map(); }
    return APP.zonasLocales;
}
// Guarda en la sesion y, si el operador lo pidio, tambien en localStorage
// para que sobrevivan a cerrar el navegador.
function glocPersiste() {
    const lista = APP.zonasLocales || [];
    writeSession(SS.geolocal, JSON.stringify(lista));
    // La copia persistente solo existe si el operador lo pidio; si lo quita,
    // se borra la que hubiera (misma forma en ambos casos: un array).
    if (APP.config && APP.config.geolocalRecordar) writeJSON(LS.geolocal, lista);
    else writeJSON(LS.geolocal, []);
}
function glocGuarda(z, lista) {
    const nueva = glocNormaliza(z);
    if (!nueva) return null;
    const base = lista || glocLista();
    const i = base.findIndex((x) => x.id === nueva.id);
    const salida = base.slice();
    if (i >= 0) salida[i] = nueva;
    else {
        if (salida.length >= GEOLOC_MAX_ZONAS) {
            adviceWarn('Limite alcanzado', 'Se pueden guardar hasta ' + GEOLOC_MAX_ZONAS + ' geocercas de la app.');
            return null;
        }
        salida.push(nueva);
    }
    glocSincroniza(salida);
    glocPersiste();
    return nueva;
}
function glocBorra(id, lista) {
    const base = lista || glocLista();
    const salida = base.filter((x) => x.id !== id);
    if (salida.length === base.length) return false;
    glocSincroniza(salida);
    glocPersiste();
    return true;
}
// Importa (reemplaza o anade) las geocercas de un texto.
function glocImporta(txt, modo, sel) {
    const r = glocParsea(txt);
    if (r.error && !r.lista.length) return r;
    // sel: indices a importar (null = todas). Permite importar una sola de un
    // archivo que trae varias.
    const items = (Array.isArray(sel) && sel.length) ? sel.map((i) => r.lista[i]).filter(Boolean) : r.lista;
    let lista = (modo === 'anadir') ? glocLista() : [];
    let nuevas = 0;
    const nativas = (APP.zonas || []).filter((x) => !glocEsApp(x));
    for (const z of items) {
        const libre = glocNombreLibre(z.n, nativas, lista.concat(APP.zonasLocales || []));
        const copia = Object.assign({}, z, { n: libre, id: glocId() });
        if (lista.length >= GEOLOC_MAX_ZONAS) break;
        lista.push(copia);
        nuevas++;
    }
    glocSincroniza(lista);
    glocPersiste();
    r.lista = APP.zonasLocales;
    r.nuevas = nuevas;
    return r;
}
// Marca las geocercas de la app para poder distinguirlas en la UI.
function glocEsApp(z) {
    return !!(z && (z.app === 1 || z._app === true));
}
// De donde sale cada geocerca. Se usa en la tarjeta, la lista del editor, la
// leyenda del mapa y las exportaciones, para que nunca se confundan.
//   plat -> de la plataforma (Wialon / AE-Track)
//   app  -> creada en Rondo (guardada en la sesion o en el navegador)
function glocOrigen(z, cfg) {
    if (!glocEsApp(z)) {
        return { id: 'plat', txt: 'Plataforma', corto: 'PLAT', largo: 'De la plataforma (Wialon / AE-Track)', guardado: false };
    }
    const c = (cfg && typeof cfg.geolocalRecordar === 'boolean') ? cfg.geolocalRecordar
        : !!(APP.config && APP.config.geolocalRecordar);
    return {
        id: 'app', txt: 'App', corto: 'APP',
        largo: c ? 'Creada en Rondo \u00b7 guardada en este navegador'
            : 'Creada en Rondo \u00b7 solo en esta sesi\u00f3n (se pierde al recargar)',
        guardado: c
    };
}
// ── Medidas (area, perimetro, longitud) ─────────────────────────────────
// Perimetro/longitud en metros con la aproximacion local (misma que usa el
// resto del script): suficiente para mostrarlo al operador.
function glocPerimM(pts, cerrado) {
    const p = pts || [];
    let d = 0;
    for (let i = 0; i < p.length - 1; i++) d += _geoDistM(p[i].y, p[i].x, p[i + 1].y, p[i + 1].x);
    if (cerrado && p.length > 2) d += _geoDistM(p[p.length - 1].y, p[p.length - 1].x, p[0].y, p[0].x);
    return d;
}
function glocM2(z) {
    if (!z) return 0;
    if (z.t === 3) return Math.PI * z.w * z.w;
    if (z.t === 1) return 0;
    return zonaAreaM2(z);
}
function glocTextoTam(z) {
    const m2 = glocM2(z);
    if (z && z.t === 1) return fmtArea((glocPerimM(z.p, false) || 0) / 1000) + ' de trazo';
    if (m2 >= 1e6) return fmtArea(m2 / 1e6);
    return Math.round(m2) + ' m2';
}

// Pasa de pixel del contenedor a coordenada (inversa de rxMMPt). Es la
// unica pieza que el mini-mapa no tenia: sin ella no se puede dibujar.
function glocPxALatLon(inst, px, py) {
    const z = clamp(inst ? inst.z : 16, 2, 19);
    const n = Math.pow(2, z) * 256;
    const ox = (inst ? inst.ox : 0) + px, oy = (inst ? inst.oy : 0) + py;
    const lon = ox / n * 360 - 180;
    // OJO: el y normalizado de rxMMLatY es (0.5 - k/4PI), es decir YA es la
    // coordenada normalizada; hay que deshacerlo con atan(sinh(PI*(1-2y))),
    // que es la inversa exacta de esa formula. Restarle 0.5 aqui desplaza
    // cualquier punto hacia un polo.
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (oy / n)))) * 180 / Math.PI;
    return { lat: clamp(lat, -85.05112878, 85.05112878), lon: clamp(lon, -180, 180) };
}
/* ====================== GEOCERCAS DE LA APP: MAPA ====================== */
// Estado del editor (borrador en curso + geocerca en edicion).
let _gloc = null;
function glocEstado() {
    if (!_gloc) {
        _gloc = {
            id: null, nombre: '', modo: 'poligono', pts: [], radio: 100, ancho: 100,
            mapa: null, capa: null, capaCtx: null, capaPlat: null, editando: false
        };
    }
    return _gloc;
}
// Capa propia encima del mini-mapa: dibuja el borrador (no vive en
// inst.lineas porque rxMMDibujar reescribe esas capas en cada pan/zoom).
// Chapa sobre el mapa: modo activo, cuanto lleva y como se dibuja. Se
// actualiza en cada render para no tener que releer el DOM.
function glocPintarHud() {
    const el = byId('gg-hud');
    if (!el) return;
    const e = glocEstado();
    const ico = (e.modo === 'circulo' ? 'zone' : (e.modo === 'linea' ? 'route' : 'map'));
    const c = glocCifras();
    const html = '<span class="gg-hud-m"><span class="rondo-usym">' + UIS[ico] + '</span>' +
        esc(glocModoTxt(e.modo)) + ' \u00b7 ' + esc(c.puntos) + '</span>' +
        '<span class="gg-hud-h">' + esc(glocPista(e.modo)) + '</span>';
    setHtml(el, html);
}
function glocPintarBorrador() {
    const e = glocEstado();
    if (!e.mapa || !e.capa) return;
    const inst = e.mapa;
    const pt = (lat, lon) => {
        const q = rxMMPt(inst, lat, lon);
        return q[0].toFixed(1) + ',' + q[1].toFixed(1);
    };
    let h = '';
    if (e.pts.length) {
        const p = e.pts.map((q) => pt(q.lat, q.lon));
        if (e.modo === 'circulo' && e.pts.length >= 1) {
            const c = e.pts[0];
            if (e.radioListo) {
                const rM = glocRadioDesde(e, c);
                const a = 32;
                const pol = [];
                for (let i = 0; i <= a; i++) {
                    const ang = (i / a) * Math.PI * 2;
                    const dl = (rM / 111320) * Math.cos(ang) / (Math.cos(c.lat * Math.PI / 180) || 1);
                    const da = (rM / 110540) * Math.sin(ang);
                    pol.push(pt(c.lat + da, c.lon + dl));
                }
                h += '<polygon points="' + pol.join(' ') + '" fill="rgba(249,168,37,.22)" stroke="#f9a817" stroke-width="2"/>';
            }
            h += '<circle cx="' + pt(c.lat, c.lon).split(',')[0] + '" cy="' + pt(c.lat, c.lon).split(',')[1] + '" r="4" fill="#f9a817" stroke="#fff" stroke-width="1.5"><title>Centro</title></circle>';
        } else {
            if (p.length > 1) {
                h += '<polyline points="' + p.join(' ') + '" fill="none" stroke="#f9a817" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="' +
                    (e.modo === 'linea' ? '0' : '6 4') + '"/>';
                if (e.modo === 'poligono' && e.pts.length >= 3) {
                    h += '<polygon points="' + p.concat([p[0]]).join(' ') + '" fill="rgba(249,168,37,.18)" stroke="none"/>';
                }
            }
            for (let i = 0; i < e.pts.length; i++) {
                h += '<circle cx="' + p[i].split(',')[0] + '" cy="' + p[i].split(',')[1] + '" r="4" fill="#f9a817" stroke="#fff" stroke-width="1.5"><title>Punto ' + (i + 1) + '</title></circle>';
            }
        }
    }
    // Circulo en curso: une el centro con el cursor para intuir el radio.
    if (e.modo === 'circulo' && e.pts.length === 1 && e.cursor) {
        const c = e.pts[0];
        h += '<line x1="' + pt(c.lat, c.lon).split(',')[0] + '" y1="' + pt(c.lat, c.lon).split(',')[1] +
            '" x2="' + pt(e.cursor.lat, e.cursor.lon).split(',')[0] + '" y2="' + pt(e.cursor.lat, e.cursor.lon).split(',')[1] +
            '" stroke="#f9a817" stroke-width="1.5" stroke-dasharray="4 3"/>';
    }
    e.capa.innerHTML = h;
}
// Radio del circulo en metros a partir del centro y del punto de radio.
function glocRadioDesde(e, centro) {
    const ref = e.radioPunto || e.cursor;
    if (!centro || !ref) return e.radio;
    return clamp(_geoDistM(centro.lat, centro.lon, ref.lat, ref.lon), GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
}
// Anillo de una geocerca en coordenadas de pantalla (funciona con las tres
// formas: circulo, poligono y linea). Es la pieza que usan las tres capas.
function glocAnillo(inst, z, segmentos) {
    const pts = (z && z._pts) || _zonaPuntos(z) || z.p;
    if (!Array.isArray(pts) || !pts.length) return '';
    const px = (a) => {
        const r = rxMMPt(inst, (a && a.y != null) ? a.y : a[1], (a && a.x != null) ? a.x : a[0]);
        return r[0].toFixed(1) + ',' + r[1].toFixed(1);
    };
    if (z.t === 3) {
        const cen = glocCentro(z.p) || (pts.length ? { x: +pts[0].x, y: +pts[0].y } : null);
        const radio = _zonaRadio(z);
        if (!cen || !(radio > 0)) return '';
        const n = clamp(segmentos || 30, 10, 60);
        const out = [];
        for (let i = 0; i <= n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const dl = (radio / 111320) * Math.cos(ang) / (Math.cos(cen.y * Math.PI / 180) || 1);
            const da = (radio / 110540) * Math.sin(ang);
            out.push(px({ x: cen.x + dl, y: cen.y + da }));
        }
        return out.join(' ');
    }
    const p = pts.map(px);
    if (p.length < 2) return '';
    return (z.t === 1) ? p.join(' ') : p.concat([p[0]]).join(' ');
}
// Previsualizacion: lo que ya existe se ve en el mapa mientras se dibuja.
// Tres capas y un filtro (todas / solo mias / solo la plataforma) para no
// saturar el mapa cuando la instalacion tiene muchas geocercas.
function glocVista() {
    return (APP.geoPreview === 'app' || APP.geoPreview === 'plat') ? APP.geoPreview : 'todas';
}
// Capa 1: geocercas de la app (las que puedes editar/eliminar aqui).
function glocPintarContexto() {
    const e = glocEstado();
    if (!e.mapa || !e.capaCtx) return;
    const inst = e.mapa;
    if (glocVista() === 'plat') { e.capaCtx.innerHTML = ''; return; }
    let h = '';
    let n = 0;
    for (const z of glocLista()) {
        if (z.id === e.id) continue;
        if (n >= GEOLOC_MAX_PREVIEW) break;
        const anillo = glocAnillo(inst, z, 26);
        if (!anillo) continue;
        n++;
        const fill = (z.t === 3) ? 'rgba(125,133,149,.16)' : 'rgba(125,133,149,.13)';
        const tag = '<title>' + esc(z.n) + ' \u00b7 de la app</title>';
        h += (z.t === 1)
            ? '<polyline points="' + anillo + '" fill="none" stroke="#7d8595" stroke-width="2" stroke-dasharray="6 4" opacity=".85">' + tag + '</polyline>'
            : '<polygon points="' + anillo + '" fill="' + fill + '" stroke="#7d8595" stroke-width="1.5" stroke-dasharray="5 4">' + tag + '</polygon>';
    }
    e.capaCtx.innerHTML = h;
}
// Capa 2: geocercas de la plataforma, para dibujar sin pisarlas.
function glocPintarPlataforma() {
    const e = glocEstado();
    if (!e.mapa || !e.capaPlat) return;
    const inst = e.mapa;
    if (glocVista() === 'app') { e.capaPlat.innerHTML = ''; return; }
    let h = '';
    let n = 0;
    for (const z of (APP.zonas || [])) {
        if (!z || glocEsApp(z)) continue;
        if (n >= GEOLOC_MAX_PREVIEW) break;
        const anillo = glocAnillo(inst, z, 20);
        if (!anillo) continue;
        n++;
        const tag = '<title>' + esc(z.n || ('Zona ' + z.id)) + ' \u00b7 de la plataforma</title>';
        h += (z.t === 1)
            ? '<polyline points="' + anillo + '" fill="none" stroke="#5c7a99" stroke-width="1.5" stroke-dasharray="3 4" opacity=".7">' + tag + '</polyline>'
            : '<polygon points="' + anillo + '" fill="rgba(92,122,153,.12)" stroke="#5c7a99" stroke-width="1" stroke-dasharray="3 4" opacity=".8">' + tag + '</polygon>';
    }
    e.capaPlat.innerHTML = h;
}
// Leyenda del mapa: que color es cada cosa y cuantas hay de cada origen.
function glocLeyendaHTML() {
    const todas = APP.zonas || [];
    const propias = todas.filter((z) => glocEsApp(z)).length;
    const plat = todas.length - propias;
    const v = glocVista();
    const chip = (val, txt, n, act) => '<button type="button" class="gg-ley-b' + (act ? ' activo' : '') + '" data-gg="preview" data-v="' + val + '" title="Ver ' + txt.toLowerCase() + ' en el mapa">' +
        '<i class="sw-' + val + '"></i>' + esc(txt) + ' <b>' + n + '</b></button>';
    return '<div class="gg-ley">' + chip('todas', 'Todas', propias + plat, v === 'todas') +
        chip('app', 'App', propias, v === 'app') +
        chip('plat', 'Plataforma', plat, v === 'plat') +
        '<i class="gg-ley-draft">borrador</i></div>';
}

/* ====================== GEOCERCAS DE LA APP: UI ====================== */
// Ventana de edicion: mapa a la izquierda, paneles a la derecha. El shell
// se crea una vez; los paneles se repintan en .gg-lados (asi los listeners
// delegados sobreviven a cada render).
function glocModalEl() {
    let el = byId('rondo-geocerca-modal');
    if (el) return el;
    el = makeEl('div', { id: 'rondo-geocerca-modal' });
    el.innerHTML =
        '<div class="gg-card">' +
        '<div class="gg-head"><span class="rondo-usym">' + UIS.zone + '</span> <b>Geocercas de la app</b>' +
        '<span class="gg-headsub">dibujadas en Rondo, fuera de la plataforma</span>' +
        '<span style="flex:1"></span>' +
        '<button class="gg-x" id="gg-x" title="Cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
        // Las dos capas SVG son propias: rxMiniMapa redibuja las suyas en cada
        // pan/zoom y se llevaria por delante el borrador si fuera dentro.
        '<div class="gg-cuerpo">' +
        '<div class="rondo-gg-mapa" id="rondo-gg-mapa">' +
        '<svg class="rondo-gg-plat" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<svg class="rondo-gg-ctx" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<svg class="rondo-gg-capa" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<div class="gg-hud" id="gg-hud"></div>' +
        '<div class="gg-leyenda" id="gg-leyenda"></div>' +
        '<div class="rondo-gg-atrib">\u00a9 OpenStreetMap</div>' +
        '</div>' +
        '<div class="gg-lados"></div>' +
        '</div>' +
        '<div class="gg-foot"><span class="gg-pie">Se guardan en esta pestana; marca <b>Recordar en este navegador</b> para que sobrevivan. ' +
        'Forman parte de las geocercas de Rondo: cuentan en los KPIs, sirven como parada y admiten alerta propia.</span>' +
        '<button id="gg-cerrar-modal">Cerrar</button>' +
        '<button class="primary" id="gg-guardar"><span class="rondo-usym">' + UIS.check + '</span> Guardar geocerca</button>' +
        '</div>' +
        '</div>';
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (ev) => { if (ev.target === el) cerrarGeocercaApp(); });
    const x = byId('gg-x');
    if (x) x.addEventListener('click', () => cerrarGeocercaApp());
    const cm = byId('gg-cerrar-modal');
    if (cm) cm.addEventListener('click', () => cerrarGeocercaApp());
    const gd = byId('gg-guardar');
    if (gd) gd.addEventListener('click', () => glocGuardarBorrador());
    glocBind();
    return el;
}
function cerrarGeocercaApp() {
    const el = byId('rondo-geocerca-modal');
    if (el) el.classList.remove('abierto');
    const e = glocEstado();
    e.mapa = null; e.capa = null; e.capaCtx = null;
}
function abrirGeocercaApp(editar) {
    const e = glocEstado();
    const lista = glocLista();
    e.id = null; e.nombre = ''; e.pts = []; e.radioListo = false; e.radioPunto = null; e.cursor = null;
    e.editando = false;
    if (editar) {
        const z = typeof editar === 'string'
            ? lista.find((x) => x.id === editar)
            : lista.find((x) => (x.n || '') === editar);
        if (z) {
            e.id = z.id;
            e.nombre = z.n;
            e.modo = (z.t === 3 ? 'circulo' : (z.t === 1 ? 'linea' : 'poligono'));
            e.pts = z.p.map((p) => ({ lat: p.y, lon: p.x }));
            e.radio = z.w || 100;
            e.ancho = z.w || 100;
            e.radioListo = (z.t === 3);
            e.radioPunto = (z.t === 3) ? { lat: z.p[0].y, lon: z.p[0].x } : null;
            e.editando = true;
        }
    }
    glocModalEl().classList.add('abierto');
    glocRender();
    // Centra el mapa en la geocerca (o en la flota si es nueva).
    try {
        e.mapa.medir();
        const pts = e.pts.length ? glocLatLon(glocPuntosActuales())
            : (APP.unidades || []).filter(shouldWatch).map((u) => { const st = unitState(u); return { lat: st.lat, lon: st.lon }; }).filter((p) => p.lat != null);
        if (pts.length) { e.mapa.lineas = [{ pts: pts }]; e.mapa.encuadrar(); }
        e.mapa.render();
    } catch (_) { /* noop */ }
    glocPintarBorrador();
    glocPintarContexto();
}
// Estado del borrador como lo espera glocNormaliza.
function glocBorrador() {
    const e = glocEstado();
    const o = { n: e.nombre, p: glocPuntosActuales(e) };
    if (e.modo === 'circulo') { o.t = 3; o.w = glocRadioDesde(e, e.pts[0] || e.cursor); }
    else if (e.modo === 'linea') { o.t = 1; o.w = e.ancho; }
    else o.t = 2;
    return o;
}
function glocPuntosActuales(e) {
    const est = e || glocEstado();
    if (est.modo === 'circulo') {
        const c = est.pts[0];
        if (!c) return [];
        return [{ x: c.lon, y: c.lat }];
    }
    return est.pts.map((p) => ({ x: p.lon, y: p.lat }));
}
function glocPuntosActuales(e) {
    const est = e || glocEstado();
    if (est.modo === 'circulo') {
        const c = est.pts[0];
        return c ? [{ x: c.lon, y: c.lat }] : [];
    }
    return est.pts.map((p) => ({ x: p.lon, y: p.lat }));
}
// Resumen del borrador para el pie del editor.
function glocResumen() {
    const c = glocCifras();
    if (!c.superficie) return c.puntos + ' \u00b7 completa la figura';
    return c.puntos + ' \u00b7 ' + c.superficie + ' \u00b7 ' + c.perimetro;
}
// Cifras del borrador: alimentan la tira de estadisticos del panel lateral.
function glocCifras() {
    const e = glocEstado();
    const z = glocNormaliza(glocBorrador());
    const out = {
        n: e.pts.length,
        puntos: (e.modo === 'circulo')
            ? (e.pts.length ? 'circulo' : 'sin centro')
            : (e.pts.length + (e.pts.length === 1 ? ' punto' : ' puntos')),
        superficie: '',
        radio: '',
        perimetro: '',
        completo: !!z
    };
    if (!z) return out;
    out.superficie = glocTextoTam(z);
    out.radio = (z.t === 3) ? (Math.round(z.w) + ' m') : '';
    out.perimetro = (z.t === 3)
        ? (Math.round(2 * Math.PI * z.w) + ' m')
        : (Math.round(glocPerimM(z.p, z.t === 2)) + ' m');
    return out;
}
function glocListaHTML() {
    const v = APP.geoListaVista || 'app';
    const todas = glocLista();
    const lista = todas.filter((z) => (v === 'plat') ? !glocEsApp(z) : (v === 'todas' ? true : glocEsApp(z)));
    if (v === 'plat') {
        return '<div class="gg-vacio"><span class="rondo-usym">' + UIS.map + '</span>' +
            '<b>Las de la plataforma no se editan aqui</b>' +
            '<span>Se dibujan en AE-Track o Wialon (icono azul en el mapa). Aqui solo se crean y modifican las de Rondo.</span></div>';
    }
    if (!lista.length) {
        return '<div class="gg-vacio"><span class="rondo-usym">' + UIS.zone + '</span>' +
            '<b>Aun no hay geocercas</b>' +
            '<span>Dibuja un marco, circulo o linea en el mapa y pulsa <b>Guardar geocerca</b>.</span></div>';
    }
    return lista.map((z) => {
        const alertas = geoAlertaCfgZona(z.n);
        const forma = (z.t === 3 ? 'C\u00edrculo' : (z.t === 1 ? 'L\u00ednea' : 'Marco'));
        const ico = (z.t === 3 ? 'zone' : (z.t === 1 ? 'route' : 'map'));
        const org = glocOrigen(z);
        return '<div class="gg-item" data-id="' + esc(z.id) + '"' +
            (alertas ? ' data-alerta="1" title="Tiene alerta de geocerca activa"' : '') + '>' +
            '<span class="gg-ptag"><span class="rondo-usym">' + UIS[ico] + '</span></span>' +
            '<div class="gg-in"><b>' + esc(z.n) +
            '<i class="gg-origen o-' + org.id + '" title="' + esc(org.largo) + '">' + org.corto + '</i>' +
            (org.id === 'app' && org.guardado ? '<i class="gg-lock" title="Se recuerda al cerrar el navegador"><span class="rondo-usym">' + UIS.check + '</span></i>' : '') +
            '</b>' +
            '<span>' + forma + ' \u00b7 ' + glocTextoTam(z) + '</span></div>' +
            (alertas ? '<i class="gg-tag-alerta" title="Alerta activa">ALERTA</i>' : '') +
            '<span class="gg-acc">' +
            '<button class="mini gg-ed" title="Editar en el mapa"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
            '<button class="mini gg-cp" title="Copiar nombre y centro"><span class="rondo-usym">' + UIS.copy + '</span></button>' +
            '<button class="mini gg-al' + (alertas ? ' on' : '') + '" title="' + (alertas ? 'Ajustar su alerta' : 'Vigilar esta geocerca') + '"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
            '<button class="mini gg-del" title="Eliminar"><span class="rondo-usym">' + UIS.close + '</span></button>' +
            '</span></div>';
    }).join('');
}
function glocRender() {
    const el = byId('rondo-geocerca-modal');
    if (!el || !el.classList.contains('abierto')) return;
    const e = glocEstado();
    if (!e.mapa) {
        const cont = byId('rondo-gg-mapa');
        if (cont) {
            e.mapa = rxMiniMapa(cont, { lineas: [], marcas: [] });
            e.capaPlat = cont.querySelector('.rondo-gg-plat');
            e.capaCtx = cont.querySelector('.rondo-gg-ctx');
            e.capa = cont.querySelector('.rondo-gg-capa');
            glocBindMapa(cont);
        }
    }
    const cuerpo = el.querySelector('.gg-lados');
    if (cuerpo) {
        setHtml(cuerpo,
            // ── Panel 1: la figura que se esta trazando ──────────────────
            '<div class="gg-lado">' +
            '<h4><span class="rondo-usym">' + UIS.watch + '</span>' +
            (e.editando ? 'Editando geocerca' : 'Nueva geocerca') +
            (e.id ? '<i class="gg-modo-tag">' + esc(glocModoTxt(e.modo)) + '</i>' : '') + '</h4>' +
            '<label class="gg-lab">Nombre' +
            '<input type="text" id="gg-nombre" maxlength="' + GEOLOC_NOMBRE_MAX + '" value="' + esc(e.nombre) + '" placeholder="Patio del cliente"></label>' +
            '<div class="gg-modos" role="group" aria-label="Tipo de figura">' +
            glocModoChip(e, 'poligono', 'Marco', 'map') +
            glocModoChip(e, 'circulo', 'C\u00edrculo', 'zone') +
            glocModoChip(e, 'linea', 'L\u00ednea', 'route') +
            '</div>' +
            '<div class="gg-stats" id="gg-res">' + glocStatsHTML() + '</div>' +
            '<label class="gg-lab">Centro (latitud, longitud)<span class="gg-two">' +
            '<input type="text" id="gg-lat" inputmode="decimal" placeholder="19.432600" value="' + (e.pts.length ? e.pts[0].lat.toFixed(6) : '') + '">' +
            '<input type="text" id="gg-lon" inputmode="decimal" placeholder="-99.133200" value="' + (e.pts.length ? e.pts[0].lon.toFixed(6) : '') + '">' +
            '<button type="button" class="mini gg-ir" id="gg-ir" title="Centrar el mapa en esas coordenadas">Ir</button>' +
            '</span></label>' +
            (e.modo === 'circulo'
                ? '<label class="gg-lab">Radio<span class="gg-unit"><input type="number" id="gg-radio" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.radio) + '"><i>m</i></span></label>'
                : (e.modo === 'linea' ? '<label class="gg-lab">Ancho del trazo<span class="gg-unit"><input type="number" id="gg-ancho" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.ancho) + '"><i>m</i></span></label>' : '')) +
            '<div class="gg-acciones">' +
            '<button type="button" class="mini" id="gg-undo" title="Quitar el ultimo punto"><span class="rondo-usym">' + UIS.menos + '</span> Deshacer</button>' +
            '<button type="button" class="mini" id="gg-limpiar" title="Empezar de cero"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar</button>' +
            (e.modo === 'circulo' ? '' : '<button type="button" class="mini" id="gg-cerrar" title="Cerrar la figura (o doble clic en el mapa)">Cerrar figura</button>') +
            '</div>' +
            '<p class="gg-pista"><span class="rondo-usym">' + UIS.info + '</span>' + esc(glocPista(e.modo)) + '</p>' +
            '</div>' +
            // ── Panel 2: las geocercas de la app ─────────────────────────
            '<div class="gg-lado gg-lado-lista">' +
            '<h4><span class="rondo-usym">' + UIS.map + '</span>Geocercas' +
            '<i class="gg-count">' + glocLista().length + '</i></h4>' +
            '<div class="gg-filtro">' +
            glocFiltroChip('app', 'M\u00edas (app)', glocLista().length) +
            glocFiltroChip('plat', 'Plataforma', (APP.zonas || []).filter((x) => !glocEsApp(x)).length) +
            glocFiltroChip('todas', 'Todas', (APP.zonas || []).length) +
            '</div>' +
            '<div class="gg-lista">' + glocListaHTML() + '</div>' +
            '<div class="gg-sec">Importar / exportar</div>' +
            '<div class="gg-io">' +
            '<button type="button" class="mini" id="gg-exporta" title="Descargar un .json con tus geocercas"><span class="rondo-usym">' + UIS.export + '</span> Exportar</button>' +
            '<button type="button" class="mini" id="gg-exporta-geo" title="Descargar GeoJSON (abrible en cualquier visor)"><span class="rondo-usym">' + UIS.map + '</span> GeoJSON</button>' +
            '<button type="button" class="mini" id="gg-importa" title="Importar un .json o .geojson"><span class="rondo-usym">' + UIS.upload + '</span> Importar</button>' +
            '<button type="button" class="mini" id="gg-copiar" title="Copiar el JSON al portapapeles"><span class="rondo-usym">' + UIS.copy + '</span> Copiar</button>' +
            '<input type="file" id="gg-file" accept=".json,.geojson,.txt" hidden>' +
            '</div>' +
            '<label class="gg-check"><input type="checkbox" id="gg-recordar"' + (APP.config && APP.config.geolocalRecordar ? ' checked' : '') + '> ' +
            '<span><b>Recordar en este navegador</b><i>Sin esto se pierden al recargar la pagina</i></span></label>' +
            '</div>');
    }
    glocPintarBorrador();
    glocPintarContexto();
    glocPintarPlataforma();
    glocPintarHud();
    const ley = byId('gg-leyenda');
    if (ley) setHtml(ley, glocLeyendaHTML());
}
function glocModoTxt(modo) {
    return (modo === 'circulo') ? 'C\u00edrculo' : (modo === 'linea' ? 'L\u00ednea' : 'Marco');
}
function glocModoTxtPlano(modo) {
    return (modo === 'circulo') ? 'circulo' : (modo === 'linea' ? 'linea' : 'marco');
}
function glocFiltroChip(val, txt, n) {
    const v = APP.geoListaVista || 'app';
    return '<button type="button" class="gg-fchip' + (v === val ? ' activo' : '') + '" data-gg="lista" data-v="' + val + '" title="Mostrar ' + txt.toLowerCase() + '">' +
        esc(txt) + '<b>' + n + '</b></button>';
}
function glocModoChip(e, modo, txt, icono) {
    return '<button type="button" class="gg-chip' + (e.modo === modo ? ' activo' : '') + '" data-gg="modo" data-v="' + modo + '" title="Trazar un ' + glocModoTxtPlano(modo) + '">' +
        '<span class="rondo-usym">' + UIS[icono] + '</span>' + esc(txt) + '</button>';
}
// Tira de cifras del borrador: puntos, superficie y perimetro.
function glocStatsHTML() {
    const c = glocCifras();
    const celda = (lb, val, ok) => '<div class="gg-stat' + (ok ? ' ok' : '') + '"><b>' + esc(val) + '</b><span>' + lb + '</span></div>';
    const circ = (c.puntos.indexOf('circulo') >= 0);
    return celda('Puntos', c.puntos, c.n > 0) +
        celda(circ ? 'Radio' : 'Superficie', (circ ? (c.radio || '\u2014') : (c.superficie || '\u2014')), c.completo) +
        celda(circ ? 'Circunferencia' : 'Per\u00edmetro', c.perimetro || '\u2014', c.completo);
}
function glocPista(modo) {
    if (modo === 'circulo') return 'Clic para poner el centro y otro clic para el radio (o escribe el radio).';
    if (modo === 'linea') return 'Clic para cada punto del trazo; doble clic o Cerrar figura para terminar.';
    return 'Clic para cada esquina del marco; doble clic o Cerrar figura para cerrarlo.';
}
// Interaccion con el mapa: clic para vertices, arrastre para mover, rueda
// para acercar. El mini-mapa ya gestiona el arrastre y la rueda; aqui solo
// se distingue un clic de un arrastre (mismo umbral de 4 px que el editor de
// paradas) y se pinta la capa propia.
function glocBindMapa(cont) {
    if (!cont || cont._ggBound) return;
    cont._ggBound = true;
    let x0 = 0, y0 = 0, movido = false;
    cont.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        x0 = ev.clientX; y0 = ev.clientY; movido = false;
    });
    cont.addEventListener('pointermove', (ev) => {
        if (Math.abs(ev.clientX - x0) > 4 || Math.abs(ev.clientY - y0) > 4) movido = true;
        const e = glocEstado();
        if (!e.mapa || !movido) return;
        // Radio del circulo en vivo mientras se arrastra.
        if (e.modo === 'circulo' && e.pts.length === 1) {
            const c = e.pts[0];
            const r = cont.getBoundingClientRect();
            e.cursor = glocPxALatLon(e.mapa, ev.clientX - r.left, ev.clientY - r.top);
            e.radio = glocRadioDesde(e, c);
            glocPintarBorrador();
            const res = byId('gg-res');
            if (res) res.textContent = glocResumen();
        }
    });
    cont.addEventListener('pointerup', (ev) => {
        if (movido || ev.button !== 0) return;
        // La leyenda y la chapa viven sobre el mapa: un clic ahi NO debe
        // anadir un punto a la figura.
        if (ev.target.closest && ev.target.closest('.gg-leyenda,.gg-hud')) return;
        const e = glocEstado();
        const r = cont.getBoundingClientRect();
        const p = glocPxALatLon(e.mapa, ev.clientX - r.left, ev.clientY - r.top);
        if (e.modo === 'circulo') {
            if (!e.pts.length) { e.pts = [p]; e.radioPunto = null; e.radioListo = false; }
            else { e.radioPunto = p; e.radio = glocRadioDesde(e, e.pts[0]); e.radioListo = true; }
        } else {
            if (e.pts.length >= GEOLOC_MAX_PUNTOS) {
                adviceWarn('Demasiados puntos', 'El maximo por geocerca es ' + GEOLOC_MAX_PUNTOS + '.');
                return;
            }
            e.pts.push(p);
        }
        glocRender();
    });
    cont.addEventListener('dblclick', (ev) => {
        if (ev.target.closest && ev.target.closest('.gg-leyenda,.gg-hud')) return;
        ev.preventDefault();
        const e = glocEstado();
        if (e.modo === 'linea' || e.modo === 'poligono') e.pts.pop();
        glocRender();
    });
    // Al arrastrar/zoomear el mini-mapa hay que repintar nuestras capas.
    cont.addEventListener('wheel', () => {
        setTimeout(() => { glocPintarBorrador(); glocPintarContexto(); }, 0);
    }, { passive: true });
}
function glocGuardarBorrador() {
    const e = glocEstado();
    if (!e.nombre.trim()) {
        adviceWarn('Falta el nombre', 'Ponle un nombre a la geocerca antes de guardar.');
        const n = byId('gg-nombre');
        if (n && n.focus) n.focus();
        return;
    }
    const b = glocBorrador();
    const lista = glocLista();
    const libre = glocNombreLibre(b.n, (APP.zonas || []).filter((x) => !x.app), lista.filter((z) => z.id !== e.id));
    const z = glocNormaliza(Object.assign({}, b, {
        n: libre, id: e.id || glocId()
    }));
    if (!z) {
        adviceWarn('Figura incompleta',
            e.modo === 'circulo' ? 'Marca el centro y el radio del circulo.'
                : (e.modo === 'linea' ? 'Une al menos 2 puntos.' : 'Un marco necesita al menos 3 puntos.'));
        return;
    }
    glocGuarda(z);
    e.id = z.id;
    e.nombre = z.n;
    e.editando = true;
    e.radio = z.w || e.radio;
    adviceOk(e.editando ? 'Geocerca guardada' : 'Geocerca creada', z.n + ' \u00b7 ' + glocTextoTam(z));
    glocRender();
    if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
}
function glocBorradorVacio() {
    const e = glocEstado();
    e.pts = []; e.radioListo = false; e.radioPunto = null; e.cursor = null;
    e.nombre = ''; e.editando = false; e.id = null;
    glocRender();
}
// Eventos del modal (delegados: el HTML se regenera en cada render).
function glocBind() {
    const el = byId('rondo-geocerca-modal');
    if (!el || el._ggEvents) return;
    el._ggEvents = true;
    const cuerpo = el.querySelector('.gg-cuerpo');
    if (!cuerpo) return;
    cuerpo.addEventListener('click', (ev) => {
        const t = ev.target;
        const e = glocEstado();
        const lp = t.closest && t.closest('[data-gg="preview"]');
        if (lp) {
            APP.geoPreview = (lp.dataset.v === 'app' || lp.dataset.v === 'plat') ? lp.dataset.v : 'todas';
            glocPintarContexto();
            glocPintarPlataforma();
            const ley = byId('gg-leyenda');
            if (ley) setHtml(ley, glocLeyendaHTML());
            return;
        }
        const lf = t.closest && t.closest('[data-gg="lista"]');
        if (lf) {
            APP.geoListaVista = lf.dataset.v || 'app';
            glocRender();
            return;
        }
        const chip = t.closest && t.closest('[data-gg="modo"]');
        if (chip) {
            const m = chip.dataset.v;
            e.modo = m;
            if (m === 'linea' && !e.ancho) e.ancho = 100;
            glocRender();
            return;
        }
        const fila = t.closest && t.closest('.gg-item');
        if (fila) {
            const id = fila.dataset.id;
            if (t.closest('.gg-ed')) { abrirGeocercaApp(id); return; }
            if (t.closest('.gg-cp')) {
                const z = glocLista().find((x) => x.id === id);
                const c = z ? glocCentro(z.p) : null;
                if (z) copiarAlPortapapeles(z.n + (c ? '\n' + c.y.toFixed(6) + ',' + c.x.toFixed(6) : ''), 'Geocerca copiada', z.n);
                return;
            }
            if (t.closest('.gg-al')) {
                const z = glocLista().find((x) => x.id === id);
                if (z) abrirGeoAlerta(z.n);
                return;
            }
            if (t.closest('.gg-del')) {
                const z = glocLista().find((x) => x.id === id);
                rondoConfirm('Eliminar geocerca', 'Se quitara "' + (z ? z.n : '') + '" de la lista de la app. Las demas no se tocan.', () => {
                    if (glocBorra(id)) {
                        if (e.id === id) glocBorradorVacio();
                        adviceOk('Geocerca eliminada', z ? z.n : '');
                        glocRender();
                        if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
                    }
                }, { peligro: true, okText: 'Eliminar' });
                return;
            }
        }
        const b = t.closest && t.closest('button');
        if (!b) return;
        const id = b.id;
        if (id === 'gg-ir') { glocIrACoordenadas(); return; }
        if (id === 'gg-undo') {
            e.pts.pop();
            if (!e.pts.length) { e.radioListo = false; e.radioPunto = null; }
            glocRender();
            return;
        }
        if (id === 'gg-limpiar') { glocBorradorVacio(); return; }
        if (id === 'gg-cerrar') { glocRender(); return; }
        if (id === 'gg-exporta') { glocExportar(false); return; }
        if (id === 'gg-exporta-geo') { glocExportar(true); return; }
        if (id === 'gg-importa') {
            const f = byId('gg-file');
            if (f) f.click();
            return;
        }
        if (id === 'gg-copiar') {
            const lista = glocLista();
            if (!lista.length) { adviceWarn('Nada que copiar', 'Primero crea una geocerca.'); return; }
            copiarAlPortapapeles(glocExportaJSON(lista), 'Geocercas copiadas', lista.length + ' geocerca(s)');
            return;
        }
    });
    cuerpo.addEventListener('input', (ev) => {
        const e = glocEstado();
        const t = ev.target;
        if (!t || !t.id) return;
        if (t.id === 'gg-nombre') { e.nombre = t.value; return; }
        if (t.id === 'gg-radio') {
            const n = Number(t.value);
            e.radio = clamp(isFinite(n) ? n : 100, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
            e.radioPunto = null;
            e.radioListo = !!e.pts.length;
            glocPintarBorrador();
            const res = byId('gg-res');
            if (res) setHtml(res, glocStatsHTML());
            return;
        }
        if (t.id === 'gg-ancho') {
            const n = Number(t.value);
            e.ancho = clamp(isFinite(n) ? n : 100, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
            const res = byId('gg-res');
            if (res) setHtml(res, glocStatsHTML());
        }
    });
    cuerpo.addEventListener('change', (ev) => {
        const t = ev.target;
        if (!t || !t.id) return;
        if (t.id === 'gg-recordar') {
            APP.config.geolocalRecordar = !!t.checked;
            writeJSON(LS.cfg, APP.config);
            glocPersiste();
            adviceOk(APP.config.geolocalRecordar ? 'Se guardaran en este navegador' : 'Solo en esta pestana',
                APP.config.geolocalRecordar ? 'Se recuperan al volver a abrir Rondo.' : 'Se pierden al cerrar la pestana: exporta si las quieres guardar.');
        }
        if (t.id === 'gg-file' && t.files && t.files[0]) glocImportarArchivo(t.files[0]);
    });
}
function glocIrACoordenadas() {
    const e = glocEstado();
    const lat = parseFloat(String(byId('gg-lat') ? byId('gg-lat').value : '').replace(',', '.'));
    const lon = parseFloat(String(byId('gg-lon') ? byId('gg-lon').value : '').replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) {
        adviceWarn('Coordenadas invalidas', 'Usa decimales, por ejemplo 19.4326 y -99.1332.');
        return;
    }
    e.pts = [{ lat: lat, lon: lon }];
    e.radioListo = false;
    e.radioPunto = null;
    try {
        e.mapa.medir();
        e.mapa.z = 17;
        e.mapa.ox = rxMMLonX(lon, e.mapa.z) - e.mapa.W / 2;
        e.mapa.oy = rxMMLatY(lat, e.mapa.z) - e.mapa.H / 2;
        e.mapa.render();
    } catch (_) { /* noop */ }
    glocRender();
}
function glocExportar(geojson) {
    const lista = glocLista();
    if (!lista.length) { adviceWarn('Nada que exportar', 'Primero crea una geocerca en la app.'); return; }
    const nombre = 'rondo_geocercas_app_' + new Date().toISOString().slice(0, 10);
    descargarJSON(
        geojson ? JSON.parse(glocExportaGeoJSON(lista)) : JSON.parse(glocExportaJSON(lista)),
        nombre + (geojson ? '.geojson' : '.json'),
        geojson ? 'application/geo+json;charset=utf-8;' : 'application/json;charset=utf-8;'
    );
    adviceOk('Geocercas exportadas', lista.length + ' geocerca(s)');
}
// Importar desde un archivo (o desde un texto pegado): primero se lee y se
// pasa por el dialogo de seleccion, para poder importar una sola o varias.
function glocImportarArchivo(file) {
    if (!file) return;
    const alTerminar = (txt) => glocAbrirImport(txt);
    try {
        file.text().then(alTerminar).catch(() => adviceWarn('No se pudo leer', file.name || 'el archivo'));
    } catch (_) {
        // Navegadores antiguos sin file.text(): FileReader.
        const fr = new FileReader();
        fr.onload = () => alTerminar(String(fr.result || ''));
        fr.onerror = () => adviceWarn('No se pudo leer', file.name || 'el archivo');
        fr.readAsText(file);
    }
}
// Dialogo de importacion: lista con casilla por geocerca, aviso de nombres
// que ya existen y botones para marcar todas o ninguna.
function glocAbrirImport(txt) {
    const r = glocParsea(txt);
    if (!r.lista.length) {
        adviceWarn('No se pudo importar', r.error || 'El archivo no trae geocercas utilizables');
        return;
    }
    const marcadas = r.lista.map((_, i) => i);
    const nativas = (APP.zonas || []).filter((x) => !glocEsApp(x));
    const mias = glocLista();
    // Nombre que tendra cada una si se importa (sufijo si choca).
    const nombres = r.lista.map((z, i) => ({
        i: i, z: z,
        libre: glocNombreLibre(z.n, nativas, mias.concat(r.lista.slice(0, i))),
        igual: (nativas.some((x) => glocLimpiaNom(x.n).toLowerCase() === z.n.toLowerCase()) ||
            mias.some((x) => glocLimpiaNom(x.n).toLowerCase() === z.n.toLowerCase()))
    }));
    const cuerpo = (sel) => {
        const html = nombres.map((it) => {
            const forma = (it.z.t === 3 ? 'C\u00edrculo ' + Math.round(it.z.w) + ' m' : (it.z.t === 1 ? 'L\u00ednea' : 'Marco'));
            return '<label class="gg-imp' + (sel.indexOf(it.i) >= 0 ? ' sel' : '') + '">' +
                '<input type="checkbox" data-gg-imp="' + it.i + '"' + (sel.indexOf(it.i) >= 0 ? ' checked' : '') + '>' +
                '<span class="nm">' + esc(it.libre) + (it.igual ? '<i class="gg-imp-dup" title="Ya existe una con ese nombre: se guardara con otro">' + UIS.info + '</i>' : '') + '</span>' +
                '<em>' + forma + ' \u00b7 ' + glocTextoTam(it.z) + '</em></label>';
        }).join('');
        return '<p class="gg-imp-t">' + (r.lista.length === 1
            ? 'El archivo trae <b>1 geocerca</b>. Se importara en Rondo (no va a la plataforma).'
            : 'El archivo trae <b>' + r.lista.length + ' geocercas</b>. Elige cuales importar.') +
            (r.ignoradas ? ' <span class="gg-imp-av">' + r.ignoradas + ' se descartaron por no ser validas.</span>' : '') +
            '</p><div class="gg-imp-l">' + html + '</div>' +
            '<div class="gg-imp-a"><button type="button" class="mini" data-gg-imp-a="todas">Todas</button>' +
            '<button type="button" class="mini" data-gg-imp-a="ninguna">Ninguna</button>' +
            '<span>' + (sel.length === r.lista.length ? 'Todas marcadas' : sel.length + ' de ' + r.lista.length) + '</span></div>';
    };
    abrirDialogo({
        icon: UIS.upload,
        titulo: 'Importar geocercas',
        ancho: 440,
        okText: 'Importar',
        html: '<div class="gg-impd" id="gg-impd">' + cuerpo(marcadas) + '</div>',
        onOpen: (el) => {
            const box = el.querySelector('#gg-impd');
            if (!box) return;
            const pinta = () => setHtml(box, cuerpo(marcadas));
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || !t.dataset || t.dataset.ggImp == null) return;
                const i = +t.dataset.ggImp;
                const k = marcadas.indexOf(i);
                if (t.checked && k < 0) marcadas.push(i);
                else if (!t.checked && k >= 0) marcadas.splice(k, 1);
                marcadas.sort((a, b) => a - b);
                pinta();
            });
            box.addEventListener('click', (ev) => {
                const b = ev.target.closest && ev.target.closest('[data-gg-imp-a]');
                if (!b || !box.contains(b)) return;
                marcadas.length = 0;
                if (b.dataset.ggImpA === 'todas') for (let i = 0; i < r.lista.length; i++) marcadas.push(i);
                pinta();
            });
        },
        onOk: () => {
            if (!marcadas.length) { adviceWarn('Nada que importar', 'Marca al menos una geocerca.'); return; }
            const res = glocImporta(txt, 'anadir', marcadas);
            adviceOk('Geocercas importadas', (res.nuevas || 0) + ' anadida(s) a las de la app');
            APP.geoListaVista = 'app';
            glocRender();
            if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
        }
    });
}/* ====================== INFORME POR GEOCERCA: NUCLEO ======================
 * Reportes por geocerca, en la misma linea que el reporte general y el del
 * Replay: aqui se responde "¿quien cruzo esta geocerca?" y "¿quien se paro
 * aqui?". Tres fuentes, porque no todas estan disponibles siempre:
 *
 *   bitacora - los avisos de la sesion (reglas geocerca, geocercaDetenido
 *              y geoAlerta). Siempre disponible, con hora exacta.
 *   viajes   - los viajes ya analizados por unidad (APP.viajes): paradas
 *              con duracion y cruces deducidos de la traza.
 *   replay   - el recorrido cargado en la pestana Replay: eventos con hora
 *              y paradas con motor y lugar.
 *
 * El nucleo de este fragmento es puro (solo arrays que le pasamos) para
 * poder probarlo aislado en tests/informe-geocerca.test.js.
 */
const RX_GEO_FUENTES = Object.freeze(['bitacora', 'viajes', 'replay']);
const RX_GEO_RANGOS = Object.freeze(['hoy', '24h', '7d', 'todo']);
const RX_GEO_TIPOS = Object.freeze({
    entra: 'Entrada',
    sale: 'Salida',
    detenida: 'Parada',
    motor: 'Parada con motor apagado',
    parada: 'Parada'
});
// ── Bitacora: un aviso -> evento con geocerca, tipo y minutos ───────────
// Si el aviso no trae el campo zona (los anteriores a esta version) se lo
// saca del texto, que era el unico sitio donde estaba.
function rxGeoInfZonaTexto(txt, prefijo) {
    const t = String(txt == null ? '' : txt);
    if (!t) return '';
    let resto = '';
    if (prefijo) {
        const i = t.toLowerCase().indexOf(String(prefijo).toLowerCase());
        if (i < 0) return '';
        resto = t.slice(i + String(prefijo).length);
    } else resto = t;
    const partes = resto.split(' \u00b7 ').map((x) => x.trim()).filter(Boolean);
    if (!partes.length) return '';
    // Con prefijo ("entro a X") la zona es lo que sigue; sin prefijo el
    // titulo es "TITULO \u00b7 zona \u00b7 eco", o sea el penultimo trocito.
    if (prefijo) return partes[0] || '';
    return (partes.length >= 2) ? (partes[partes.length - 2] || '') : '';
}
// Ultimo recurso: buscar la geocerca con una expresion, tolerando textos
// que no sean exactamente los de las reglas (avisos viejos o editados).
function rxGeoInfZonaRegex(txt, re) {
    const m = String(txt == null ? '' : txt).match(re);
    return m ? String(m[1]).trim() : '';
}
function rxGeoInfMinutos(txt) {
    const m = String(txt == null ? '' : txt).match(/(\d+)\s*min/i);
    return m ? +m[1] : 0;
}
function rxGeoInfEvento(a) {
    if (!a || !a.ts) return null;
    const regla = String(a.regla || '');
    const titulo = String(a.titulo || '');
    const detalle = String(a.detalle || '');
    let zona = String(a.zona || '');
    let tipo = '';
    if (regla === 'geocerca') {
        tipo = (/salio de/i.test(detalle) || /^SALIO/.test(titulo)) ? 'sale' : 'entra';
        if (!zona) zona = rxGeoInfZonaTexto(detalle, tipo === 'sale' ? 'salio de ' : 'entro a ');
        if (!zona) zona = rxGeoInfZonaRegex(detalle, /(?:entra|entro|entró|sale|salió)\s+a\s+([^·]+)/i);
    } else if (regla === 'geocercaDetenido') {
        tipo = 'detenida';
        if (!zona) zona = rxGeoInfZonaTexto(detalle, 'se encuentra detenida en la geocerca ');
        if (!zona) zona = rxGeoInfZonaRegex(detalle, /geocerca\s+([^·]+)/i);
    } else if (regla === 'geoAlerta') {
        tipo = /MOTOR APAGADO/i.test(titulo) ? 'motor' : (/DETENIDA/i.test(titulo) ? 'detenida' : 'entra');
        if (!zona) zona = rxGeoInfZonaTexto(titulo, '');
    } else {
        return null;
    }
    if (!zona) return null;
    return {
        zona: zona, tipo: tipo, eco: a.eco || '', clave: a.clave || '',
        ts: a.ts, sev: a.sev || 'bajo', lat: a.lat, lon: a.lon,
        titulo: titulo, detalle: detalle,
        min: rxGeoInfMinutos(detalle), fuente: 'bitacora'
    };
}
// Una parada de un viaje o del replay -> evento. La duracion viene en
// segundos (replay) o en minutos (APP.viajes.durMin).
function rxGeoInfParada(p, zona, eco, fuente) {
    if (!p || p.lat == null || p.lon == null) return null;
    const seg = (p.dur != null) ? +p.dur : ((p.durMin != null) ? (+p.durMin) * 60 : 0);
    return {
        zona: zona, tipo: (p.motor === 'off') ? 'motor' : 'detenida',
        eco: eco || '', ts: (+p.t || +p.desde || 0),
        lat: p.lat, lon: p.lon, min: Math.round(seg / 60),
        motor: p.motor || '', motorFuente: p.motorFuente || '',
        lugar: p.lugar || '', titulo: 'Parada', detalle: '',
        fuente: fuente || 'viajes'
    };
}
// Filtra por geocerca (vacia = todas) y por rango de fechas.
function rxGeoInfFiltra(eventos, zona, desdeMs) {
    const out = [];
    for (const e of (eventos || [])) {
        if (!e) continue;
        if (zona && e.zona !== zona) continue;
        if (desdeMs && e.ts && e.ts < desdeMs) continue;
        out.push(e);
    }
    return out;
}
// Milisegundos de inicio del rango elegido ('hoy' = desde las 00:00).
function rxGeoInfDesde(rango, ahora) {
    const n = ahora || Date.now();
    if (rango === 'hoy') { const d = new Date(n); d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (rango === '24h') return n - 24 * 3600 * 1000;
    if (rango === '7d') return n - 7 * 24 * 3600 * 1000;
    return 0;
}
// Agrega los eventos por unidad. modo 'cruces' ordena por cruces,
// 'paradas' por paradas y minutos.
function rxGeoInfAgrupa(eventos, modo) {
    const porParadas = (modo === 'paradas');
    const por = {};
    for (const e of (eventos || [])) {
        const clave = e.eco || e.clave || '(sin eco)';
        let f = por[clave];
        if (!f) {
            f = por[clave] = {
                eco: clave, cruces: 0, entradas: 0, salidas: 0, paradas: 0,
                min: 0, minMotor: 0, motor: 0, primero: 0, ultimo: 0,
                lugares: {}, zonas: {}
            };
        }
        if (e.tipo === 'entra' || e.tipo === 'sale') {
            f.cruces++;
            if (e.tipo === 'entra') f.entradas++; else f.salidas++;
        } else {
            f.paradas++;
            f.min += (+e.min || 0);
            if (e.tipo === 'motor' || e.motor === 'off') { f.motor++; f.minMotor += (+e.min || 0); }
        }
        if (e.zona) f.zonas[e.zona] = (f.zonas[e.zona] || 0) + 1;
        if (e.lugar) f.lugares[e.lugar] = (f.lugares[e.lugar] || 0) + 1;
        if (e.ts) {
            if (!f.primero || e.ts < f.primero) f.primero = e.ts;
            if (e.ts > f.ultimo) f.ultimo = e.ts;
        }
    }
    const filas = Object.keys(por).map((k) => por[k]);
    filas.sort((a, b) => (porParadas
        ? ((b.paradas - a.paradas) || (b.min - a.min))
        : ((b.cruces - a.cruces) || (b.min - a.min))) || a.eco.localeCompare(b.eco, 'es'));
    const total = {
        unidades: filas.length,
        cruces: filas.reduce((s, f) => s + f.cruces, 0),
        entradas: filas.reduce((s, f) => s + f.entradas, 0),
        salidas: filas.reduce((s, f) => s + f.salidas, 0),
        paradas: filas.reduce((s, f) => s + f.paradas, 0),
        min: filas.reduce((s, f) => s + f.min, 0),
        motor: filas.reduce((s, f) => s + f.motor, 0),
        primera: filas.reduce((m, f) => ((f.primero && (!m || f.primero < m)) ? f.primero : m), 0),
        ultima: filas.reduce((m, f) => (f.ultimo > m ? f.ultimo : m), 0)
    };
    return { filas: filas, total: total };
}
// Resumen por geocerca: ordena el selector del dialogo y da la segunda
// tabla del PDF ("cuanto se cruzo cada geocerca").
function rxGeoInfPorZona(eventos, orden) {
    const por = {};
    for (const e of (eventos || [])) {
        const z = e.zona || '(sin geocerca)';
        let f = por[z];
        if (!f) f = por[z] = { zona: z, cruces: 0, paradas: 0, min: 0, unidades: {}, eventos: 0 };
        f.eventos++;
        if (e.tipo === 'entra' || e.tipo === 'sale') f.cruces++;
        else { f.paradas++; f.min += (+e.min || 0); }
        if (e.eco) f.unidades[e.eco] = 1;
    }
    let filas = Object.keys(por).map((k) => por[k]);
    if (Array.isArray(orden) && orden.length) {
        const pos = {};
        orden.forEach((z, i) => { pos[z] = i; });
        filas.sort((a, b) => ((pos[a.zona] == null ? 1e6 : pos[a.zona]) - (pos[b.zona] == null ? 1e6 : pos[b.zona])) || (b.cruces - a.cruces));
    } else {
        filas.sort((a, b) => (b.cruces - a.cruces) || (b.paradas - a.paradas) || a.zona.localeCompare(b.zona, 'es'));
    }
    for (const f of filas) f.nUnidades = Object.keys(f.unidades).length;
    return filas;
}
// Version plana de una fila (un solo sitio para CSV, Markdown y PDF).
function rxGeoInfCeldas(f) {
    const zonas = Object.keys(f.zonas || {});
    const lugares = Object.keys(f.lugares || {});
    return {
        eco: f.eco, cruces: f.cruces, entradas: f.entradas, salidas: f.salidas,
        paradas: f.paradas, min: f.min, motor: f.motor, minMotor: f.minMotor,
        primero: f.primero, ultimo: f.ultimo,
        zonas: zonas.join(' | '),
        lugares: lugares.slice(0, 4).join(' | ')
    };
}
// Transiciones fuera->dentro sobre una lista de puntos [lon, lat, tsMs].
// Es el detector de cruces que usan tanto la traza de un viaje
// ([[lon, lat]]) como los mensajes del replay ([lon, lat, t * 1000]): el
// unico formato comun entre las dos fuentes.
function rxGeoInfCruces(puntos, dentroDe, base) {
    const o = base || {};
    const out = [];
    let previa = '';
    for (let i = 0; i < (puntos || []).length; i++) {
        const q = puntos[i];
        if (!q || q.length < 2) continue;
        const ahora = dentroDe(+q[1], +q[0]) || '';
        if (ahora === previa) continue;
        const crudo = (q.length > 2) ? +q[2] : 0;
        out.push({
            zona: ahora || previa,
            tipo: ahora ? 'entra' : 'sale',
            eco: o.eco || '',
            // El tercer valor del punto es la marca en MILISEGUNDOS (el
            // que ya usan el historial y los avisos).
            ts: (q.length > 2 && crudo) ? crudo : 0,
            sev: 'bajo', lat: +q[1], lon: +q[0],
            titulo: ahora ? ('Entra a ' + ahora) : ('Sale de ' + previa),
            detalle: '', min: 0, fuente: o.fuente || ''
        });
        previa = ahora;
    }
    return out;
}

function rxGeoInfCabeceras(modo) {
    return (modo === 'paradas')
        ? ['Eco', 'Paradas', 'Min quieto', 'Min motor apagado', 'Paradas con motor', 'Geocercas', 'Primera', 'Ultima']
        : ['Eco', 'Cruces', 'Entradas', 'Salidas', 'Paradas', 'Min quieto', 'Geocercas', 'Primera', 'Ultima'];
}
// Celdas ya en HTML (para la tabla del PDF y la vista previa).
function rxGeoInfCeldasHTML(c, modo) {
    const t = (ms) => (ms ? esc(rxFechaHora(ms)) : '-');
    if (modo === 'paradas') {
        return [esc(c.eco), String(c.paradas), String(c.min), String(c.minMotor),
            String(c.motor), esc(c.zonas || '-'), t(c.primero), t(c.ultimo)];
    }
    return [esc(c.eco), String(c.cruces), String(c.entradas), String(c.salidas),
        String(c.paradas), String(c.min), esc(c.zonas || '-'), t(c.primero), t(c.ultimo)];
}
// Filas planas (sin HTML) para CSV y Markdown.
function rxGeoInfCeldasPlanas(c, modo) {
    const t = (ms) => (ms ? rxFechaHora(ms) : '-');
    if (modo === 'paradas') {
        return [c.eco, String(c.paradas), String(c.min), String(c.minMotor),
            String(c.motor), (c.zonas || '-'), t(c.primero), t(c.ultimo)];
    }
    return [c.eco, String(c.cruces), String(c.entradas), String(c.salidas),
        String(c.paradas), String(c.min), (c.zonas || '-'), t(c.primero), t(c.ultimo)];
}
/* ====================== INFORME POR GEOCERCA: FUENTES ====================== */
function rxGeoInfNombre(z) {
    return (z && (z.n || z.nombre)) || (z ? ('Zona ' + z.id) : '');
}
// Pertenencia con margen de borde: los puntos de una traza simplificada
// pueden caer justo en el limite de la geocerca.
function rxGeoInfEnZona(lat, lon, z) {
    if (!z || lat == null || lon == null) return false;
    try {
        if (typeof geoAlertaDentro === 'function') return geoAlertaDentro(z, lat, lon, 40);
        return !!inZone(lat, lon, z);
    } catch (_) { return false; }
}
// Devuelve el nombre de la geocerca que contiene el punto (primera que
// coincide, como zoneAt).
function rxGeoInfZonaDe(lat, lon) {
    for (const z of (APP.zonas || [])) {
        if (rxGeoInfEnZona(lat, lon, z)) return rxGeoInfNombre(z);
    }
    return '';
}
// Eventos desde la bitacora de avisos de la sesion.
function rxGeoInfDeBitacora() {
    const out = [];
    for (const a of (APP.historial || [])) {
        const e = rxGeoInfEvento(a);
        if (e) out.push(e);
    }
    return out;
}
// Eventos desde los viajes analizados (APP.viajes).
function rxGeoInfDeViajes() {
    const out = [];
    for (const eco of Object.keys(APP.viajes || {})) {
        const v = APP.viajes[eco] || {};
        for (const p of (v.paradas || [])) {
            if (p.lat == null || p.lon == null) continue;
            const zona = p.zona || rxGeoInfZonaDe(p.lat, p.lon);
            if (!zona) continue;
            const ev = rxGeoInfParada(p, zona, eco, 'viajes');
            if (ev) out.push(ev);
        }
        if (v.traza && v.traza.length > 1) {
            out.push.apply(out, rxGeoInfCruces(v.traza, rxGeoInfZonaDe, { eco: eco, fuente: 'viajes' }));
        }
    }
    return out;
}
// Eventos del recorrido cargado en la pestana Replay.
function rxGeoInfDeReplay() {
    const r = (typeof RX_REPLAY !== 'undefined') ? RX_REPLAY : null;
    if (!r || !r.msgs || !r.msgs.length) return [];
    const eco = r.eco || (r.info ? r.info.eco : '');
    const pts = r.msgs.map((m) => [m.lon, m.lat, (m.t || 0) * 1000]);
    const out = rxGeoInfCruces(pts, rxGeoInfZonaDe, { eco: eco, fuente: 'replay' });
    for (const p of (r.paradas || [])) {
        const zona = p.zona || rxGeoInfZonaDe(p.lat, p.lon);
        if (!zona) continue;
        const ev = rxGeoInfParada(p, zona, eco, 'replay');
        if (!ev) continue;
        ev.ts = (+p.t || 0) * 1000;
        ev.lugar = p.lugar || '';
        out.push(ev);
    }
    return out;
}
// Fuente elegida -> lista de eventos. Con cache corta, porque el dialogo
// la pide en cada repintado y el recorrido puede tener miles de mensajes.
let _rxGeoCache = { t: 0, datos: {} };
function rxGeoInfEventos(fuente, forzar) {
    const f = (RX_GEO_FUENTES.indexOf(fuente) >= 0) ? fuente : 'bitacora';
    const t = Date.now();
    if (!forzar && _rxGeoCache.datos[f] && (t - _rxGeoCache.t) < 8000) return _rxGeoCache.datos[f];
    let out = [];
    try {
        if (f === 'replay') out = rxGeoInfDeReplay();
        else if (f === 'viajes') out = rxGeoInfDeViajes();
        else out = rxGeoInfDeBitacora();
    } catch (e) { out = []; }
    _rxGeoCache = { t: t, datos: Object.assign({}, _rxGeoCache.datos, (function () { const o = {}; o[f] = out; return o; })()) };
    return out;
}
// Que fuentes tienen datos ahora mismo (para el selector del dialogo).
function rxGeoInfFuentesDisponibles() {
    const out = [];
    for (const f of RX_GEO_FUENTES) {
        const n = rxGeoInfEventos(f, true).length;
        if (n) out.push({ k: f, n: n });
    }
    return out;
}

/* ====================== INFORME POR GEOCERCA: UI ====================== */
const RX_GEO = { fuente: 'bitacora', rango: 'hoy', modo: 'cruces', zona: '' };
function rxGeoInfZonas() {
    return (APP.zonas || []).map(rxGeoInfNombre).filter(Boolean);
}
// Reune lo que se va a pintar: eventos filtrados + agregados.
function rxGeoInfReune() {
    const todos = rxGeoInfEventos(RX_GEO.fuente);
    const desde = rxGeoInfDesde(RX_GEO.rango);
    const zona = RX_GEO.zona || '';
    const ev = rxGeoInfFiltra(todos, zona, desde);
    return {
        fuente: RX_GEO.fuente, rango: RX_GEO.rango, modo: RX_GEO.modo, zona: zona,
        desde: desde, eventos: ev, disponibles: todos.length,
        unidades: rxGeoInfAgrupa(ev, RX_GEO.modo),
        zonas: rxGeoInfPorZona(ev, zona ? null : rxGeoInfZonas())
    };
}
function rxGeoInfFilas(d) {
    return d.unidades.filas.map(rxGeoInfCeldas);
}
function rxGeoInfResumen(d) {
    const t = d.unidades.total;
    const fuenteTxt = (d.fuente === 'bitacora') ? 'Avisos de la sesion'
        : (d.fuente === 'viajes' ? 'Viajes analizados' : 'Recorrido cargado en Replay');
    const rangoTxt = (d.rango === 'hoy' ? 'hoy'
        : (d.rango === '24h' ? 'ultimas 24 h'
            : (d.rango === '7d' ? 'ultimos 7 dias' : 'todo el historico')));
    return fuenteTxt + ' \u00b7 ' + rangoTxt + (d.zona ? (' \u00b7 geocerca ' + d.zona) : '') +
        ': ' + t.unidades + ' unidad(es), ' + t.cruces + ' cruce(s) y ' + t.paradas +
        ' parada(s) con ' + t.min + ' min quieto' + (t.motor ? (' (' + t.motor + ' con motor apagado)') : '') + '.';
}
// Documento imprimible (PDF). Reutiliza el maquetado del informe general.
function rxGeoInfHTML(d) {
    const z = d.zona ? (APP.zonas || []).find((x) => rxGeoInfNombre(x) === d.zona) : null;
    const cab = rxGeoInfCabeceras(d.modo);
    const filas = d.unidades.filas.slice(0, 300).map((c) => rxGeoInfCeldasHTML(rxGeoInfCeldas(c), d.modo));
    const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
    const tot = d.unidades.total;
    const titulo = d.zona ? ('Informe de geocerca: ' + d.zona) : 'Informe de geocercas';
    let infoZ = '';
    if (z) {
        const cen = centroDeZona(z) || {};
        let area = '-';
        try { const a = zonaAreaM2(z); if (a > 0) area = (a / 1e6).toFixed(3) + ' km2'; } catch (_) { /* noop */ }
        const org = (typeof glocOrigen === 'function') ? glocOrigen(z) : null;
        infoZ = '<h3>Geocerca</h3><table><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>' +
            '<tr><td>Nombre</td><td><b>' + esc(rxGeoInfNombre(z)) + '</b></td></tr>' +
            '<tr><td>Tipo</td><td>' + esc(z.t === 3 ? 'Circulo' : (z.t === 1 ? 'Linea' : 'Poligono')) + '</td></tr>' +
            (org ? '<tr><td>Origen</td><td>' + esc(org.largo) + '</td></tr>' : '') +
            '<tr><td>Superficie</td><td>' + esc(area) + '</td></tr>' +
            '<tr><td>Centro</td><td>' + (cen.lat == null ? '-' : esc(rxCoord(cen.lat, cen.lon, 6))) + '</td></tr>' +
            '</tbody></table>';
    }
    const filasZona = d.zonas.map((f) => [
        '<b>' + esc(f.zona) + '</b>', String(f.cruces), String(f.paradas), String(f.min),
        String(f.nUnidades), esc(Object.keys(f.unidades).slice(0, 10).join(', ') + (f.nUnidades > 10 ? '...' : ''))
    ]);
    const detalle = d.eventos.slice(0, 200).map((e) => [
        rxFechaHora(e.ts), esc(RX_GEO_TIPOS[e.tipo] || e.tipo), esc(e.zona), esc(e.eco || '-'),
        esc(e.detalle || e.titulo || '-'),
        (e.lat == null ? '<span class="muted">-</span>' : '<span class="mono">' + esc(rxCoord(e.lat, e.lon, 5)) + '</span>')
    ]);
    const origen = (d.fuente === 'bitacora') ? 'Avisos de la sesion'
        : (d.fuente === 'viajes' ? 'Viajes analizados' : 'Recorrido cargado en Replay');
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title>' +
        rxInfEstilo() + '</head><body>' +
        rxInfCabecera(titulo, 'Rondo \u00b7 informe por geocerca',
            esc(rxGeoInfResumen(d)) + '<br>' + esc(origen)) +
        '<div class="kpis">' +
        kpi(tot.unidades, 'Unidades') + kpi(tot.cruces, 'Cruces') + kpi(tot.entradas, 'Entradas') +
        kpi(tot.salidas, 'Salidas') + kpi(tot.paradas, 'Paradas') +
        kpi(tot.min + ' min', 'Quieto') + kpi(tot.motor, 'Con motor apagado') +
        '</div>' +
        '<h2 id="res">Resumen</h2><p class="resumen">' + esc(rxGeoInfResumen(d)) + '</p>' +
        infoZ +
        '<h2 id="unid">Unidades (' + d.unidades.filas.length + ')</h2>' + rxInfTabla(cab, filas) +
        '<h2 id="zonas">Geocercas (' + filasZona.length + ')</h2>' +
        rxInfTabla(['Geocerca', 'Cruces', 'Paradas', 'Min quieto', 'Unidades', 'Ecos'], filasZona) +
        '<h2 id="det">Detalle de eventos (' + Math.min(200, d.eventos.length) + ' de ' + d.eventos.length + ')</h2>' +
        rxInfTabla(['Fecha y hora', 'Evento', 'Geocerca', 'Eco', 'Detalle', 'Coordenadas'], detalle) +
        (d.eventos.length > 200 ? '<p class="muted">Se muestran 200 eventos; el CSV lleva todos.</p>' : '') +
        rxInfPie() + '</body></html>';
}
function rxGeoInfNombreArchivo(d, ext) {
    const geo = d.zona ? (d.zona.replace(/[^\w\-]+/g, '_').slice(0, 30) + '_') : '';
    return 'rondo_geocerca_' + geo + (d.modo === 'paradas' ? 'paradas_' : 'cruces_') +
        new Date().toISOString().slice(0, 10) + ext;
}
// Dialogo: que informe, de que geocerca, de que periodo, con que datos y
// las tres salidas (PDF, CSV, Markdown).
function abrirInformeGeocerca() {
    const hay = rxGeoInfFuentesDisponibles();
    if (!hay.length) {
        adviceWarn('Sin datos de geocercas',
            'Activa la regla Geocercas en Ajustes, analiza un viaje o carga un recorrido en Replay para poder informar.');
        return;
    }
    if (!hay.some((h) => h.k === RX_GEO.fuente)) RX_GEO.fuente = hay[0].k;
    const ETIQUETA = { bitacora: 'Avisos', viajes: 'Viajes analizados', replay: 'Recorrido cargado' };
    const cuerpo = () => {
        const d = rxGeoInfReune();
        const fuentes = rxGeoInfFuentesDisponibles();
        const zonas = rxGeoInfZonas();
        const conDatos = rxGeoInfPorZona(rxGeoInfEventos(RX_GEO.fuente), null);
        const num = {};
        for (const f of conDatos) num[f.zona] = f.cruces + f.paradas;
        const chip = (act, attr, v, txt, titulo) => '<button type="button" class="rgi-chip' + (act ? ' activo' : '') +
            '" ' + attr + ' data-v="' + esc(v) + '"' + (titulo ? ' title="' + esc(titulo) + '"' : '') + '>' + esc(txt) + '</button>';
        const tot = d.unidades.total;
        const opts = '<option value="">Todas las geocercas</option>' + zonas.map((z) => {
            const n = num[z] || 0;
            return '<option value="' + esc(z) + '"' + (RX_GEO.zona === z ? ' selected' : '') + '>' + esc(z) +
                (n ? ' \u00b7 ' + n + ' evento(s)' : ' \u00b7 sin datos') + '</option>';
        }).join('');
        return '<div class="rgi">' +
            '<div class="rgi-row"><span class="rgi-lb">Informe de</span><div class="rgi-chips">' +
            chip(RX_GEO.modo === 'cruces', 'data-rgi="modo"', 'cruces', 'Cruces por unidad', 'Quien entro y salio de cada geocerca') +
            chip(RX_GEO.modo === 'paradas', 'data-rgi="modo"', 'paradas', 'Paradas dentro', 'Quien se quedo quieto dentro y cuanto tiempo') +
            '</div></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Geocerca</span>' +
            '<select id="rgi-zona" class="filtro">' + opts + '</select></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Periodo</span><div class="rgi-chips">' +
            chip(RX_GEO.rango === 'hoy', 'data-rgi="rango"', 'hoy', 'Hoy') +
            chip(RX_GEO.rango === '24h', 'data-rgi="rango"', '24h', '24 h') +
            chip(RX_GEO.rango === '7d', 'data-rgi="rango"', '7d', '7 dias') +
            chip(RX_GEO.rango === 'todo', 'data-rgi="rango"', 'todo', 'Todo') +
            '</div></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Datos</span><div class="rgi-chips">' +
            fuentes.map((f) => chip(RX_GEO.fuente === f.k, 'data-rgi="fuente"', f.k,
                ETIQUETA[f.k] + ' \u00b7 ' + f.n, ETIQUETA[f.k])).join('') +
            '</div></div>' +
            '<p class="rgi-res">' + esc(rxGeoInfResumen(d)) + '</p>' +
            '<div class="rgi-kpis">' +
            '<div class="rgi-kpi"><b>' + tot.unidades + '</b><span>Unidades</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.cruces + '</b><span>Cruces</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.entradas + '</b><span>Entradas</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.paradas + '</b><span>Paradas</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.min + '</b><span>Min quieto</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.motor + '</b><span>Motor apagado</span></div>' +
            '</div>' +
            '<div class="rgi-prev">' + (d.unidades.filas.length
                ? rxInfTabla(rxGeoInfCabeceras(d.modo), d.unidades.filas.slice(0, 12)
                    .map((c) => rxGeoInfCeldasHTML(rxGeoInfCeldas(c), d.modo))) +
                (d.unidades.filas.length > 12 ? '<p class="muted">y ' + (d.unidades.filas.length - 12) + ' unidad(es) mas.</p>' : '')
                : '<p class="muted">Sin unidades con este filtro.</p>') + '</div>' +
            '<div class="rgi-io">' +
            '<button type="button" class="mini" id="rgi-pdf" title="Reporte imprimible (Guardar como PDF)"><span class="rondo-usym">' + UIS.export + '</span> PDF</button>' +
            '<button type="button" class="mini" id="rgi-csv" title="Detalle evento a evento en CSV"><span class="rondo-usym">' + UIS.csv + '</span> CSV</button>' +
            '<button type="button" class="mini" id="rgi-md" title="Informe en Markdown"><span class="rondo-usym">' + UIS.copy + '</span> Markdown</button>' +
            '</div>' +
            '</div>';
    };
    abrirDialogo({
        icon: UIS.zone,
        titulo: 'Informe por geocerca',
        ancho: 620,
        okText: 'Cerrar',
        html: '<div id="rgi-box">' + cuerpo() + '</div>',
        onOpen: (el) => {
            const box = el.querySelector('#rgi-box');
            if (!box) return;
            const pinta = () => setHtml(box, cuerpo());
            box.addEventListener('click', (ev) => {
                const b = ev.target.closest && ev.target.closest('[data-rgi]');
                if (!b || !box.contains(b)) return;
                RX_GEO[b.dataset.rgi] = b.dataset.v;
                pinta();
            });
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || t.id !== 'rgi-zona') return;
                RX_GEO.zona = t.value || '';
                pinta();
            });
            const salida = (id, fn) => {
                const b2 = byId(id);
                if (b2) b2.addEventListener('click', fn);
            };
            salida('rgi-pdf', () => {
                rxImprimirHTML(rxGeoInfHTML(rxGeoInfReune()));
                advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
            });
            salida('rgi-csv', () => rxGeoInfCSV(rxGeoInfReune()));
            salida('rgi-md', () => rxGeoInfMD(rxGeoInfReune()));
        },
        onOk: () => { /* la salida se elige con los botones del cuerpo */ }
    });
}
function rxGeoInfCSV(d) {
    const cabU = rxGeoInfCabeceras(d.modo);
    const filasU = d.unidades.filas.map((c) => rxGeoInfCeldasPlanas(rxGeoInfCeldas(c), d.modo));
    const cabE = ['Fecha y hora', 'Evento', 'Geocerca', 'Eco', 'Minutos', 'Detalle', 'Lat', 'Lon', 'Fuente'];
    const filasE = d.eventos.map((e) => [
        rxFechaHora(e.ts), (RX_GEO_TIPOS[e.tipo] || e.tipo), e.zona, (e.eco || ''),
        String(e.min || 0), (e.detalle || e.titulo || ''),
        (e.lat == null ? '' : String(e.lat)), (e.lon == null ? '' : String(e.lon)), (e.fuente || '')
    ]);
    const txt = [cabU].concat(filasU).concat([cabE]).concat(filasE)
        .map((f) => f.map(rxCsvCelda).join(',')).join('\n');
    const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + txt], { type: 'text/csv;charset=utf-8;' })) });
    a.download = rxGeoInfNombreArchivo(d, '.csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    adviceOk('Informe exportado', filasE.length + ' evento(s) y ' + filasU.length + ' unidad(es)');
}
function rxGeoInfMD(d) {
    const cab = rxGeoInfCabeceras(d.modo);
    const L = ['# Informe por geocerca - ' + (d.zona || 'todas las geocercas'), '',
        '- Generado: ' + rxFechaHora(Date.now(), true),
        '- Datos: ' + rxGeoInfResumen(d), '',
        '## ' + (d.modo === 'paradas' ? 'Paradas por unidad' : 'Cruces por unidad'), '',
        '| ' + cab.join(' | ') + ' |',
        '| ' + cab.map(() => '---').join(' | ') + ' |'];
    for (const f of d.unidades.filas) {
        L.push('| ' + rxGeoInfCeldasPlanas(rxGeoInfCeldas(f), d.modo)
            .map((x) => String(x).replace(/\|/g, '/')).join(' | ') + ' |');
    }
    L.push('', '## Geocercas', '', '| Geocerca | Cruces | Paradas | Min quieto | Unidades |', '| --- | --- | --- | --- | --- |');
    for (const f of d.zonas) L.push('| ' + [f.zona, f.cruces, f.paradas, f.min, f.nUnidades].join(' | ') + ' |');
    L.push('', '## Eventos (' + d.eventos.length + ')', '',
        '| Fecha y hora | Evento | Geocerca | Eco | Minutos | Detalle |', '| --- | --- | --- | --- | --- | --- |');
    for (const e of d.eventos.slice(0, 300)) {
        L.push('| ' + [rxFechaHora(e.ts), (RX_GEO_TIPOS[e.tipo] || e.tipo), e.zona, (e.eco || '-'),
            (e.min || 0), (e.detalle || e.titulo || '-').replace(/\|/g, '/')].join(' | ') + ' |');
    }
    if (d.eventos.length > 300) L.push('', '_Se muestran los 300 primeros eventos._');
    if (typeof rxReplayDescargar === 'function') rxReplayDescargar(rxGeoInfNombreArchivo(d, '.md'), L.join('\n'), 'text/markdown;charset=utf-8;');
    else adviceWarn('No se pudo exportar', 'descarga no disponible');
    adviceOk('Informe exportado', d.eventos.length + ' evento(s)');
}