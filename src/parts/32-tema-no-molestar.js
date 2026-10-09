    /* ====================== TEMA / NO MOLESTAR ====================== */
    function aclarar(hex, f) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return hex;
        const n = parseInt(h, 16);
        const mix = (x) => Math.round(x + (255 - x) * f);
        return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
            .map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    function hexToRgb(hex) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return null;
        const n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function oscurecer(hex, f) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return hex;
        const n = parseInt(h, 16);
        const mix = (x) => Math.round(x * (1 - f));
        return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
            .map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    // v6.0.14 / v6.9.1: reestiliza la pagina de la plataforma con la paleta
    // de Rondo. Se apoya en las PROPIAS variables CSS del skin (las del
    // objeto de configuracion del CMS), asi que no reescribe el DOM: solo
    // pinta. Es opt-in y reversible (al desactivarlo se elimina la hoja).
    //
    // v6.9.1:
    //   - Se emiten con `!important` y sobre `:root, html, body`, porque la
    //     plataforma tambien declara sus variables y, al mismo nivel de
    //     especificidad, la ultima hoja ganaba (el reestilizado "no hacia
    //     nada").
    //   - Se amplia el mapeo: acento, hover, bordes, superficies y texto,
    //     tomando la paleta segun el tema activo (oscuro/claro) para que la
    //     pagina quede coherente con el panel.
    //
    // v6.19.3: se completa el mapeo del skin (p. ej. skytracking3). Antes
    //   solo se pintaban las pestañas y los botones; quedaban sin tocar los
    //   paneles (superior/izquierdo/inferior), las barras horizontales, el
    //   acordeon, los dialogos de ayuda/asistente y el login. Ademas cada
    //   variable cae ahora en la categoria que le corresponde por SU
    //   significado (fondo de acento, hover, texto sobre acento, superficie,
    //   texto o borde) en vez de asumir acento para todo. Esto corrige de
    //   paso un bug: `execute-button-border-color` y los bordes del login
    //   son colores sueltos, no el shorthand `1px solid`, y antes se
    //   pintaban como "1px solid <color>" (invalido).
    // v6.19.4: el mapa se extrae del :root real de la plataforma (728 tokens
    //   con nombre propio). Muchos se DEFINEN como var(--otro) (p. ej.
    //   --featured-dot-background: var(--accent-color)), asi que basta con
    //   reescribir los tokens BASE y el resto se recolorea en cascada; los que
    //   llevan color literal se mapean uno a uno. Clave -> color de Rondo
    //   (lo resuelve rxPaginaToken):
    //     accent / accent-2 / hover      acento, acento claro, hover oscuro
    //     on                             texto sobre acento (#fff)
    //     accent-bg / accent-bg-hover    tinte de acento translucido
    //     bg / soft / strong             superficies (fondo, paneles, tarjetas)
    //     fg / dim / mute / border       texto y bordes
    //     transparent
    const RX_PAGINA_MAPA = {
        // --- base: acento ---
        'accent-color': 'accent', 'accent-hover-color': 'hover', 'accent-active-color': 'hover',
        'accent-bg-color': 'strong', 'accent-bg-color-hover': 'strong',
        'accent-bg-color-active': 'accent-bg', 'accent-bg-light': 'strong',
        // --- base: texto ---
        'primary-color': 'fg', 'secondary-color': 'dim', 'light-color': 'mute',
        'icons-action-color': 'dim', 'color-text': 'fg', 'color-text-secondary': 'dim',
        'color-text-disabled': 'mute',
        // --- base: superficies ---
        'base-bg-color': 'bg', 'hover-bg-color': 'strong', 'editable-hover-bg-color': 'strong',
        'accent-gray-bg-color': 'strong', 'available-components-bg-color': 'soft',
        'disabled-components-bg-color': 'strong', 'table-selected-item-bg-color': 'strong',
        'higlighted-normal': 'strong', 'higlighted-hover': 'strong', 'higlighted-active': 'strong',
        'bg-dark-surface': 'strong', 'hover-bg-dark-surface': 'strong', 'active-bg-dark-surface': 'strong',
        'dialog-background-block': 'strong', 'preloader-box-background': 'soft',
        // --- base: bordes ---
        'borders-color': 'border', 'borders-color-inverted': 'border', 'borders-border-color': 'border',
        'checkbox-borders-color': 'border', 'monitoring-button-border-color': 'border', 'color-border': 'border',
        // --- paneles y barra horizontal ---
        'panel-top-background': 'soft', 'panel-top-color': 'fg',
        'panel-left-background': 'soft', 'panel-left-sub-background': 'bg',
        'panel-left-color': 'fg', 'panel-left-sub-color': 'fg',
        'panel-bottom-background': 'soft', 'panel-bottom-color': 'fg',
        'panel-bottom-item-active-background': 'strong',
        'horizontal-bar-item-color': 'fg', 'horizontal-bar-item-background': 'transparent',
        'horizontal-bar-item-hover-color': 'on', 'horizontal-bar-item-hover-background': 'accent',
        'horizontal-bar-item-active-color': 'on', 'horizontal-bar-item-active-background': 'accent',
        'panel-top-border-color': 'border', 'panel-left-border-color': 'border',
        'panel-bottom-border-color': 'border', 'panel-center-border-color': 'border',
        // --- listas y tablas ---
        'list-table-background': 'soft', 'list-table-background-warn': 'soft',
        'list-table-background-error': 'soft', 'list-table-background-gray': 'strong',
        'list-table-color': 'fg', 'list-table-separator-color': 'border',
        'list-table-group-background': 'strong', 'list-table-group-background-hover': 'strong',
        'list-table-head-background': 'strong', 'list-row-hover-bg-color': 'strong',
        'icons-action-color-hover': 'strong', 'icons-action-color-active': 'strong',
        // --- tooltip ---
        'tooltip-bg-color': 'strong', 'tooltip-text-primary-color': 'fg',
        'tooltip-text-secondary-color': 'dim', 'tooltip-separator-color': 'border',
        // --- acordeon ---
        'accordion-normal-background': 'soft', 'accordion-normal-color': 'fg',
        'accordion-active-background': 'accent', 'accordion-active-color': 'on',
        'accordion-hover-background': 'strong', 'accordion-hover-color': 'fg',
        'accordion-border-color': 'border',
        // --- wizard / ayuda / modal ---
        'wizard-dialog-header-background': 'accent', 'wizard-dialog-header-color': 'on',
        'wizard-dialog-background': 'soft', 'modal-background': 'soft',
        'help-window-background': 'soft', 'help-window-header-background': 'accent',
        'help-window-header-color': 'on', 'help-window-collapser-header-background': 'strong',
        // --- pestañas ---
        'tab-bg-color': 'soft', 'tab-bg-color-hover': 'strong', 'tab-color-active': 'hover',
        'tabs-item-text-color': 'accent', 'tabs-item-hover-text-color': 'hover',
        'tabs-selected-item-text-color': 'accent', 'tabs-selected-item-line-color': 'accent',
        // --- botones ---
        'execute-button-background': 'accent', 'execute-button-color': 'on',
        'execute-button-border-color': 'accent', 'execute-button-hover-background': 'hover',
        'execute-button-hover-color': 'on', 'execute-button-hover-border-color': 'hover',
        'button-background': 'soft', 'button-color': 'accent', 'button-hover-background': 'strong',
        'button-hover-color': 'hover', 'button-hover-border-color': 'border', 'button-border-color': 'border',
        'button-disabled-background': 'strong', 'button-disabled-color': 'mute', 'button-disabled-border-color': 'border',
        'fast-button-background': 'soft', 'fast-button-background-hover': 'strong',
        'fast-button-color': 'accent', 'fast-button-border-color': 'border', 'fast-button-border-color-hover': 'border',
        'split-button-divider-color': 'border',
        'list-table-tab_button-background': 'soft', 'list-table-tab_button-color': 'accent',
        'list-table-tab_button-active-background': 'accent', 'list-table-tab_button-active-color': 'on',
        'list-table-tab_button-hover-background': 'strong', 'list-table-tab_button-hover-color': 'hover',
        'list-table-tab_button-disabled-background': 'strong', 'list-table-tab_button-disabled-color': 'mute',
        'list-table-tab_button-disabled-border': 'border',
        // --- formularios ---
        'input-background': 'soft', 'input-color': 'fg', 'input-border-color': 'border',
        'input-border-color-hover': 'border', 'input-stepper-active-bg-color': 'strong',
        'disabled-input-background-color': 'strong', 'disabled-input-color': 'mute', 'placeholder-color': 'mute',
        'select-border-color': 'border', 'select-hover-border-color': 'border',
        'chip-bg-color': 'strong', 'chip-bg-hover-color': 'strong', 'header-badge-bg-color': 'strong',
        'checkbox-bg-color': 'soft', 'checkbox-checked-bg-color': 'accent', 'checkbox-checkmark-color': 'on',
        'checkbox-hover-color': 'fg', 'checkbox-hover-color-secondary': 'hover',
        'checkbox-disabled-checked-bg-color': 'mute', 'switch-on-bg': 'accent',
        'switch-on-hover-bg': 'hover', 'switch-thumb-bg': 'on',
        'tag-text-color': 'fg', 'tag-bg-color': 'strong', 'tag-remove-hover-color': 'accent',
        'preloader-text-color': 'fg',
        // --- panel lateral (wui2) ---
        'panel-list-item-color': 'fg', 'panel-list-item-description-color': 'dim',
        'panel-list-item-bg': 'strong', 'panel-list-item-hover-bg': 'strong', 'panel-list-item-active-bg': 'strong',
        'panel-list-item-resizer-color': 'border', 'panel-list-item-resizer-active-color': 'accent',
        'panel-list-item-icon-color': 'dim', 'panel-list-item-input-color': 'fg',
        'panel-list-item-input-icon-color': 'dim', 'panel-list-item-input-readonly-color': 'fg',
        'panel-list-item-input-disabled-bg': 'strong', 'panel-list-item-input-border-color': 'border',
        'panel-list-item-input-hover-border-color': 'border', 'panel-list-item-input-focused-border-color': 'accent',
        'panel-list-item-input-disabled-border-color': 'border',
        'panel-list-item-add-color': 'accent', 'panel-list-item-add-hover-color': 'accent',
        'panel-list-item-add-hover-bg': 'strong', 'panel-list-item-add-active-bg': 'strong',
        'panel-list-item-header-color': 'dim', 'panel-list-item-header-icon-color': 'dim',
        'panel-list-item-header-hover-color': 'fg', 'panel-list-item-header-bg': 'bg',
        'panel-list-item-header-hover-bg': 'strong', 'panel-list-item-header-active-bg': 'strong',
        'panel-list-item-header-border-color': 'border', 'panel-list-item-footer-color': 'dim',
        'panel-list-item-footer-bg': 'strong', 'panel-list-item-footer-hover-bg': 'strong',
        'panel-list-item-footer-border-color': 'border',
        'panel-list-item-button-noaccent-hover-bg': 'strong', 'panel-list-item-button-noaccent-active-bg': 'strong',
        'panel-list-group-color': 'fg', 'panel-list-group-expanded-color': 'fg',
        'panel-list-group-icon-color': 'dim', 'transfer-list-item-hover-bg': 'strong',
        'transfer-list-item-active-bg': 'strong',
        // --- calendario ---
        'calendar-background': 'soft', 'calendar-main-text-hover-background': 'strong',
        'calendar-othermonth-text-color': 'dim', 'calendar-border-color': 'border',
        // --- iconos y enlaces ---
        'icon-grey-dark-color': 'dim', 'icon-disabled-color': 'mute', 'icon-hover-color': 'fg',
        'icon-button-active-bg-color': 'accent', 'icon-button-hover-bg-color': 'strong',
        'link-initial-color': 'accent', 'link-hover-color': 'hover', 'link-disabled-color': 'mute',
        // --- login ---
        'monitoring-login-text-color': 'fg', 'monitoring-login-forgot-pwd-color': 'accent',
        'monitoring-login-forgot-pwd-hover-color': 'hover', 'monitoring-login-input-bg-color': 'soft',
        'monitoring-login-input-hover-bg-color': 'soft', 'monitoring-login-input-focused-bg-color': 'soft',
        'monitoring-login-input-text-color': 'fg', 'monitoring-login-input-text-hover-color': 'fg',
        'monitoring-login-input-text-focused-color': 'fg', 'monitoring-login-input-placeholder-color': 'mute',
        'monitoring-login-input-border-color': 'border', 'monitoring-login-input-border-hover-color': 'border',
        'monitoring-login-input-border-focused-color': 'accent', 'monitoring-login-language-border-color': 'border',
        'monitoring-login-primary-button-color': 'accent', 'monitoring-login-primary-button-text-color': 'on',
        'monitoring-login-primary-button-border-color': 'accent',
        'monitoring-login-primary-button-hover-color': 'hover',
        'monitoring-login-primary-button-hover-text-color': 'on',
        'monitoring-login-primary-button-hover-border-color': 'hover',
        'monitoring-login-secondary-button-color': 'accent', 'monitoring-login-secondary-button-text-color': 'on',
        'monitoring-login-secondary-button-border-color': 'accent',
        'monitoring-login-secondary-button-hover-color': 'hover',
        'monitoring-login-secondary-button-hover-text-color': 'on',
        'monitoring-login-secondary-button-hover-border-color': 'hover',
        'monitoring-login-form-bg-color': 'soft', 'monitoring-login-separator-color': 'border',
        'monitoring-login-separator-text-color': 'mute',
        // --- compatibilidad con nombres sueltos de la version previa ---
        'background': 'bg', 'background-content': 'bg', 'background-body': 'bg', 'background-app': 'bg',
        'background-header': 'soft', 'background-sidebar': 'soft', 'background-panel': 'soft',
        'background-item': 'soft', 'background-dialog': 'soft', 'background-popup': 'soft',
        'background-modal': 'soft', 'background-menu': 'soft', 'background-dropdown': 'soft',
        'background-input': 'bg', 'background-tooltip': 'strong', 'background-item-hover': 'strong',
        'background-table-header': 'strong', 'background-table-row': 'soft', 'background-table-row-hover': 'strong',
        'text-color': 'fg', 'text-color-primary': 'fg', 'text-color-strong': 'fg',
        'text-color-secondary': 'dim', 'text-color-dim': 'dim', 'text-color-muted': 'mute',
        'text-color-disabled': 'mute', 'input-text-color': 'fg', 'input-placeholder-color': 'mute',
        'border-color': 'border', 'border-color-soft': 'strong', 'divider-color': 'strong'
    };
    // Unico token que espera el shorthand completo "1px solid <color>".
    const RX_PAGINA_BORDE_SHORTHAND = { 'list-table-tab_button-active-border': 'accent' };
    // Resuelve una clave del mapa al color de la paleta activa.
    function rxPaginaToken(clave, P, acc, acc2, accD) {
        if (clave === 'accent') return acc;
        if (clave === 'accent-2') return acc2;
        if (clave === 'hover') return accD;
        if (clave === 'on') return '#ffffff';
        if (clave === 'transparent') return 'transparent';
        if (clave === 'accent-bg') return acc2 + '22';
        if (clave === 'accent-bg-hover') return acc2 + '33';
        return P[clave] || P.fg;
    }
    function rxAplicarEstiloPagina() {
        const elPrev = document.getElementById('rondo-estilo-pagina');
        if (!(APP.config && APP.config.estiloPagina)) {
            if (elPrev && elPrev.parentNode) elPrev.parentNode.removeChild(elPrev);
            return;
        }
        // Acento: el de Rondo, salvo que se pida heredar el de la plataforma
        // (mismo criterio que applyTheme para el panel).
        const acc = (APP.config.temaPlataforma && rxPlatAcento())
            ? rxPlatAcento() : (APP.config.acento || '#850D22');
        const acc2 = aclarar(acc, 0.28);
        const accD = oscurecer(acc, 0.14);
        // Paleta de superficies/texto segun el tema efectivo.
        const claro = APP.config.theme === 'claro' ||
            (APP.config.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
        const P = claro ? {
            bg: '#f5f7fa', soft: '#ffffff', strong: '#eef2f7',
            fg: '#1d2433', dim: '#5b6577', mute: '#8993a3',
            border: '#dfe4ec'
        } : {
            bg: '#1f2330', soft: '#272d3c', strong: '#313849',
            fg: '#e8ecf3', dim: '#9aa4b5', mute: '#6f7888',
            border: '#3a4252'
        };
        const decl = [];
        Object.keys(RX_PAGINA_MAPA).forEach((v) => {
            decl.push('  --' + v + ':' + rxPaginaToken(RX_PAGINA_MAPA[v], P, acc, acc2, accD) + ' !important;');
        });
        Object.keys(RX_PAGINA_BORDE_SHORTHAND).forEach((v) => {
            decl.push('  --' + v + ':1px solid ' +
                rxPaginaToken(RX_PAGINA_BORDE_SHORTHAND[v], P, acc, acc2, accD) + ' !important;');
        });
        // v6.19.4: los componentes base de Wialon (wui-*) no siempre leen las
        // variables del skin, asi que se visten aparte para que no queden
        // islas con el tema original. Se limita a clases wui-* y a los
        // contenedores raiz; nunca a etiquetas sueltas (romperia el panel).
        const comp = [
            'html,body{background:' + P.bg + ' !important;color:' + P.fg + ' !important;}',
            '.wui-input,.wui-select,.wui-textarea,.wui-combobox input{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.wui-checkmark{border-color:' + P.border + ' !important;}',
            '.wui-checkbox input:checked~.wui-checkmark{background:' + acc + ' !important;border-color:' + acc + ' !important;}',
            '.wui-tooltip,.wui-popup,.wui-dropdown,.wui-menu{background:' + P.strong +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            // Ant Design compila los colores en cada regla (no usa variables),
            // asi que se visten sus componentes base a mano. Sin esto, en tema
            // oscuro el texto de AntD quedaria oscuro sobre oscuro.
            '.ant-btn-primary{background:' + acc + ' !important;border-color:' + acc + ' !important;color:#fff !important;}',
            '.ant-btn-primary:hover{background:' + accD + ' !important;border-color:' + accD + ' !important;}',
            '.ant-btn-default{background:' + P.soft + ' !important;border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.ant-btn,.ant-typography,.ant-form-item-label>label,.ant-descriptions-item-label,.ant-descriptions-item-content{color:' + P.fg + ' !important;}',
            '.ant-input,.ant-input-affix-wrapper,.ant-input-number,.ant-select-selector,.ant-picker{background:' + P.soft +
                ' !important;border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.ant-input::placeholder,.ant-input-affix-wrapper input::placeholder{color:' + P.mute + ' !important;}',
            '.ant-select-dropdown,.ant-dropdown-menu,.ant-picker-panel-container,.ant-modal-content,.ant-drawer-content,' +
                '.ant-popover-inner,.ant-notification-notice,.ant-message-notice-content,.ant-cascader-menu{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-modal-header,.ant-drawer-header,.ant-tooltip-inner{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '.ant-table,.ant-table-cell,.ant-table-thead>tr>th{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-tabs-tab,.ant-tabs-tab-btn{color:' + P.dim + ' !important;}',
            '.ant-tabs-tab-active .ant-tabs-tab-btn{color:' + acc + ' !important;}',
            '.ant-checkbox-inner,.ant-radio-inner{background:' + P.soft + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-checkbox-checked .ant-checkbox-inner,.ant-radio-checked .ant-radio-inner{background:' + acc + ' !important;border-color:' + acc + ' !important;}',
            '.ant-switch{background:' + P.strong + ' !important;}',
            '.ant-switch-checked{background:' + acc + ' !important;}',
            '.ant-tag{background:' + P.strong + ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}'
        ].join('\n');
        let el = elPrev;
        if (!el) {
            el = document.createElement('style');
            el.id = 'rondo-estilo-pagina';
            (document.head || document.documentElement).appendChild(el);
        }
        // Se aplica a :root, html y body para ganar a las variables del skin
        // que la plataforma declare en cualquiera de esos niveles.
        el.textContent = ':root,html,body{\n' + decl.join('\n') + '\n}\n' + comp + '\n';
    }
    function applyTheme() {
        const c = APP.config;
        const theme = (c.theme === 'auto')
            ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro')
            : c.theme;
        if (theme === 'claro') document.body.setAttribute('data-rondo-theme', 'claro');
        else document.body.removeAttribute('data-rondo-theme');
        const ti = document.querySelector('#rondo-tema .rondo-usym');
        if (ti) ti.innerHTML = UIS.theme;
        const btnTema = byId('rondo-tema');
        if (btnTema) btnTema.title = 'Tema: ' + theme;
        // v6.0.14: si esta activo, el acento sale del skin de la plataforma.
        const acento = (c.temaPlataforma && rxPlatAcento()) ? rxPlatAcento() : c.acento;
        if (acento) {
            const a2 = aclarar(acento, 0.28);
            document.documentElement.style.setProperty('--rondo-accent', acento);
            document.documentElement.style.setProperty('--rondo-accent-2', a2);
            document.documentElement.style.setProperty('--rondo-accent-grad', 'linear-gradient(135deg,' + acento + ',' + a2 + ')');
            const rgb = hexToRgb(acento);
            if (rgb) document.documentElement.style.setProperty('--rondo-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
        }
        const p = byId('rondo-panel');
        if (p) p.classList.toggle('density-compact', c.density === 'compact');
        // Escala de interfaz: un solo factor multiplica textos y controles.
        document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(c.escalaUI)));
        // v6.0.14: aplica/quita el reestilizado de la pagina de la plataforma.
        try { rxAplicarEstiloPagina(); } catch (_) { /* noop */ }
    }
    // Normaliza el factor de escala de UI a uno de los valores permitidos.
    const ESCALAS_UI = [1, 1.15, 1.3, 1.5];
    function normalizarEscala(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return 1;
        let mejor = ESCALAS_UI[0];
        for (let i = 0; i < ESCALAS_UI.length; i++) {
            if (Math.abs(ESCALAS_UI[i] - n) < Math.abs(mejor - n)) mejor = ESCALAS_UI[i];
        }
        return mejor;
    }
    function nmActivo() { return APP.noMolestar && APP.noMolestar.hasta > Date.now(); }
    function toggleNoMolestar(min) {
        if (min === undefined) {
            if (nmActivo()) {
                APP.noMolestar = null; advice('No molestar desactivado', '');
            } else {
                APP.noMolestar = { hasta: Date.now() + 30 * 60000, motivo: 'manual' };
                advice('No molestar', 'Pausado por 30 min · silencio voz / pitido / toasts');
            }
        } else {
            APP.noMolestar = { hasta: Date.now() + min * 60000, motivo: 'manual' };
        }
        writeJSON(LS.nmolestar, APP.noMolestar);
        updateNoMolestar();
        paintStateBadge();
    }
    function updateNoMolestar() {
        const b = byId('rondo-nmolestar');
        if (!b) return;
        if (nmActivo()) {
            const m = Math.ceil((APP.noMolestar.hasta - Date.now()) / 60000);
            b.classList.add('activo'); b.title = 'No molestar (' + m + ' min) · clic para desactivar';
        } else { b.classList.remove('activo'); b.title = 'No molestar (silencia voz/pitido/toasts)'; }
    }
    setInterval(() => {
        if (nmActivo()) updateNoMolestar();
        else if (APP.noMolestar) { APP.noMolestar = null; writeJSON(LS.nmolestar, null); }
    }, 30000);
