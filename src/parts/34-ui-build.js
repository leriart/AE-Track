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
            '<button id="rondo-informe" class="rondo-tool" data-tabs="dash,unidades,alertas" title="Generar informe del dia"><span class="rondo-usym">' + UIS.csv + '</span> Informe</button>' +
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
            '<b>Centro de monitoreo</b>' +
            '<span class="rondo-dash-vel" id="rondo-dash-vel"></span>' +
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
            '<div class="rondo-dash-kpis">' +
            '<div class="kpi ok" data-kpi="online" title="Unidades que reportaron dentro del umbral de sin senal · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.online + '</span><span class="kpi-etq">En linea</span><span class="kpi-val" id="rondo-kpi-on">0</span><span class="kpi-pct" id="rondo-kpi-on-pct"></span></div>' +
            '<div class="kpi bad" data-kpi="offline" title="Unidades cuyo ultimo reporte supero el umbral · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.offline + '</span><span class="kpi-etq">Sin senal</span><span class="kpi-val" id="rondo-kpi-off">0</span><span class="kpi-pct" id="rondo-kpi-off-pct"></span></div>' +
            '<div class="kpi warn" data-kpi="detenida" title="Unidades en linea con velocidad muy baja · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.stopped + '</span><span class="kpi-etq">Detenidas</span><span class="kpi-val" id="rondo-kpi-det">0</span></div>' +
            '<div class="kpi sub" data-kpi="moviendo" title="Unidades en linea con velocidad normal · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.moving + '</span><span class="kpi-etq">En mov.</span><span class="kpi-val" id="rondo-kpi-mov">0</span></div>' +
            '<div class="kpi sub" data-kpi="zonas" title="Geocercas ocupadas · clic para verlas"><span class="kpi-ico rondo-usym">' + UIS.map + '</span><span class="kpi-etq">En zonas</span><span class="kpi-val" id="rondo-kpi-zonas">0</span><span class="kpi-pct" id="rondo-kpi-zonas-pct"></span></div>' +
            '<div class="kpi" data-kpi="alertas" title="Avisos desde la medianoche · clic para verlos"><span class="kpi-ico rondo-usym">' + UIS.alertas + '</span><span class="kpi-etq">Avisos hoy</span><span class="kpi-val" id="rondo-kpi-aho">0</span><span class="kpi-pct" id="rondo-kpi-criticos"></span></div>' +
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
             '</div>' +
             '<div id="rondo-caravana-body" class="rondo-caravana-body"></div>' +
             '</div>' +
             // v6.0.11: tab de replay. Reproduce el recorrido de un dia.
             '<div class="tabla" id="rondo-wrap-replay" style="display:none">' +
             '<div class="rondo-replay-bar">' +
             '<select id="rondo-replay-eco" class="filtro" style="flex:1" title="Unidad a reproducir"></select>' +
             '<input type="date" id="rondo-replay-fecha" class="filtro" title="Dia a reproducir">' +
             '<button class="mini" id="rondo-replay-cargar" title="Cargar el recorrido del dia"><span class="rondo-usym">' + UIS.refresh + '</span> Cargar</button>' +
             '<button class="mini" id="rondo-replay-centrar" title="Centrar el mini-mapa en el recorrido"><span class="rondo-usym">' + UIS.map + '</span> Centrar</button>' +
             '</div>' +
             '<div class="rondo-replay-mapa" id="rondo-replay-mapa"><div class="rondo-replay-vacio">Carga un recorrido para verlo aqui.</div></div>' +
             '<div class="rondo-replay-ctrl">' +
             '<button class="mini" id="rondo-replay-play" title="Reproducir o pausar">Play</button>' +
             '<select id="rondo-replay-vel" class="filtro" title="Velocidad de reproduccion">' +
             '<option value="60">1 min/s</option>' +
             '<option value="300" selected>5 min/s</option>' +
             '<option value="900">15 min/s</option>' +
             '<option value="3600">1 h/s</option>' +
             '</select>' +
             '<input type="range" id="rondo-replay-slider" min="0" max="0" value="0" style="flex:1">' +
             '</div>' +
             '<div id="rondo-replay-info" class="rondo-replay-info"></div>' +
             '<div id="rondo-replay-eventos" class="rondo-replay-eventos"></div>' +
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
            '</div>' +
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
            '</select>' +
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
            checkRow('c-r-des', 'Destino') +
            checkRow('c-r-dis', 'Desconexión') +
            checkRow('c-r-vel', 'Velocidad') +
            checkRow('c-r-riesgo', 'Perdi\u00f3 se\u00f1al en zona de riesgo') +
            checkRow('c-r-riesgo-pre', 'Aproximaci\u00f3n a zona de riesgo (predictiva)') +
            '</div>' +
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
            checkRow('c-coords', 'Mostrar lat/lon en unidades') +
            checkRow('c-contornos', 'Remarcar contornos de ventanas abiertas') +
            numRow('c-contorno-horas', 'Antigüedad de contornos (h)') +
            '<h4>Informacion</h4>' +
            '<span style="font-size:11.5px;color:var(--rondo-fg-dim)">Atajos: <b>Alt+1..7</b> cambia pestañas · <b>Alt+P</b> barra · <b>Alt+L</b> barra · <b>Alt+H</b> pliega barra · <b>?</b> ayuda · <b>Esc</b> cierra el dialogo superior</span>' +
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
            '<li><b>Dashboard</b>: salud de la flota, 6 KPIs (en linea, sin senal, detenidas, en mov., en zonas, avisos hoy), unidades que requieren atencion, zonas con unidades, rutas activas y avisos recientes. Todo en una sola pantalla.</li>' +
            '<li><b>Unidades</b>: lista de tarjetas con estado, velocidad, zona y acciones. Clic para abrir su ventana; clic derecho para mas opciones (ruta, geocerca, odometro, etc.).</li>' +
            '<li><b>Avisos</b>: historial filtrable por severidad (criticas, altas, medias, bajas). Exportable a CSV.</li>' +
            '<li><b>Rutas</b>: progreso de cada ruta trazada (OSRM o A*) con ETA. Se planea desde el clic derecho de una unidad.</li>' +
            '<li><b>Zonas</b>: segmentado con dos vistas: <b>Geocercas</b> de la plataforma (unidades dentro) y <b>Zonas de riesgo</b> (dona, histograma, KPIs, filtros, export). Las alertas por zonas de riesgo se ven como la regla <i>riesgoSinSenal</i>.</li>' +
            '<li><b>Caravana</b>: unidades (vigiladas o no) cerca de una unidad "lider" en la misma ruta (distancia firmada) o dentro del radio de cercania. Marca sentido contrario, velocidad y si la unidad no esta vigilada.</li>' +
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
