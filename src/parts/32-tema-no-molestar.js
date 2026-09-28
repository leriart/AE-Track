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
    const RX_PAGINA_VARS = [
        'horizontal-bar-item-active-background', 'horizontal-bar-item-hover-background',
        'tabs-item-text-color', 'tabs-selected-item-text-color', 'tabs-item-hover-text-color',
        'tabs-selected-item-line-color', 'tab-color-active',
        'button-color', 'button-hover-color',
        'execute-button-background', 'execute-button-hover-background', 'execute-button-hover-border-color',
        'accordion-active-background',
        'list-table-tab_button-active-background', 'list-table-tab_button-color', 'list-table-tab_button-hover-color',
        'wizard-dialog-header-background', 'help-window-header-background',
        'monitoring-login-primary-button-color', 'monitoring-login-primary-button-hover-color',
        'monitoring-login-secondary-button-color', 'monitoring-login-forgot-pwd-color',
        'monitoring-login-forgot-pwd-hover-color'
    ];
    // Variables de hover: acento oscurecido.
    const RX_PAGINA_HOVER = [
        'horizontal-bar-item-hover-background', 'tabs-item-hover-text-color',
        'button-hover-color', 'execute-button-hover-background', 'execute-button-hover-border-color',
        'list-table-tab_button-hover-color', 'monitoring-login-primary-button-hover-color',
        'monitoring-login-forgot-pwd-hover-color'
    ];
    // Las variables que representan un borde necesitan "1px solid <color>".
    const RX_PAGINA_BORDES = ['execute-button-border-color', 'list-table-tab_button-active-border',
        'monitoring-login-primary-button-border-color', 'monitoring-login-primary-button-hover-border-color',
        'monitoring-login-secondary-button-border-color'];
    // Superficies: variable del skin -> clave de la paleta de Rondo.
    const RX_PAGINA_SUPERFICIES = {
        'background': 'bg', 'background-content': 'bg', 'background-body': 'bg', 'background-app': 'bg',
        'background-header': 'soft', 'background-sidebar': 'soft', 'background-panel': 'soft',
        'background-item': 'soft', 'background-dialog': 'soft', 'background-popup': 'soft',
        'background-modal': 'soft', 'background-menu': 'soft', 'background-dropdown': 'soft',
        'background-input': 'bg', 'background-tooltip': 'strong',
        'background-item-hover': 'strong', 'background-table-header': 'strong',
        'background-table-row': 'soft', 'background-table-row-hover': 'strong'
    };
    // Texto: variable del skin -> clave de la paleta de Rondo.
    const RX_PAGINA_TEXTOS = {
        'text-color': 'fg', 'text-color-primary': 'fg', 'text-color-strong': 'fg',
        'text-color-secondary': 'dim', 'text-color-dim': 'dim', 'text-color-muted': 'mute',
        'text-color-disabled': 'mute', 'input-text-color': 'fg', 'input-placeholder-color': 'mute'
    };
    // Bordes genericos.
    const RX_PAGINA_BORDES_GEN = {
        'border-color': 'border', 'border-color-soft': 'soft', 'divider-color': 'soft', 'input-border-color': 'border'
    };
    function rxAplicarEstiloPagina() {
        const elPrev = document.getElementById('rondo-estilo-pagina');
        if (!(APP.config && APP.config.estiloPagina)) {
            if (elPrev && elPrev.parentNode) elPrev.parentNode.removeChild(elPrev);
            return;
        }
        const acc = rxPlatAcento() || APP.config.acento || '#850D22';
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
        RX_PAGINA_VARS.forEach((v) => {
            if (RX_PAGINA_BORDES.indexOf(v) >= 0) decl.push('  --' + v + ':1px solid ' + acc + ' !important;');
            else if (RX_PAGINA_HOVER.indexOf(v) >= 0) decl.push('  --' + v + ':' + accD + ' !important;');
            else decl.push('  --' + v + ':' + acc + ' !important;');
        });
        Object.keys(RX_PAGINA_SUPERFICIES).forEach((v) => {
            decl.push('  --' + v + ':' + P[RX_PAGINA_SUPERFICIES[v]] + ' !important;');
        });
        Object.keys(RX_PAGINA_TEXTOS).forEach((v) => {
            decl.push('  --' + v + ':' + P[RX_PAGINA_TEXTOS[v]] + ' !important;');
        });
        Object.keys(RX_PAGINA_BORDES_GEN).forEach((v) => {
            decl.push('  --' + v + ':' + P[RX_PAGINA_BORDES_GEN[v]] + ' !important;');
        });
        decl.push('  --accent-bg-color:' + acc2 + '22 !important;');
        decl.push('  --accent-bg-color-hover:' + acc2 + '33 !important;');
        let el = elPrev;
        if (!el) {
            el = document.createElement('style');
            el.id = 'rondo-estilo-pagina';
            (document.head || document.documentElement).appendChild(el);
        }
        // Se aplica a :root, html y body para ganar a las variables del skin
        // que la plataforma declare en cualquiera de esos niveles.
        el.textContent = ':root,html,body{\n' + decl.join('\n') + '\n}\n';
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
