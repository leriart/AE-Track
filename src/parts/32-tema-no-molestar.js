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
    function rxLum(c) {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function rxContraste(h1, h2) {
        const a = hexToRgb(h1), b = hexToRgb(h2);
        if (!a || !b) return 21; // no se puede medir: se deja tal cual
        const x = rxLum(a), y = rxLum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }
    // El acento sirve de FONDO (con texto blanco encima) pero como COLOR DE
    // TEXTO sobre una superficie oscura puede quedar ilegible (el verde azulado
    // #0d6e87 sobre #272d3c da ~2:1: pestana activa, "Cancel", "Restore..."). Se
    // aclara (tema oscuro) u oscurece (claro) hasta llegar a 4.5:1 (WCAG AA).
    function rxAcentoTexto(acc, P, extra) {
        let c = acc;
        const base = P && P.soft;
        if (!base || !hexToRgb(c)) return c;
        for (let i = 0; i < 10 && rxContraste(c, base) < 4.5; i++) {
            c = P.claro ? oscurecer(c, 0.14) : aclarar(c, 0.14);
        }
        return extra ? (P.claro ? oscurecer(c, extra) : aclarar(c, extra)) : c;
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
        'primary-color': 'fg', 'secondary-color': 'dim', 'color-text-secondary': 'dim',
        'color-text-disabled': 'mute',
        // --- base: superficies --- 'hover-bg-color': 'strong', 'editable-hover-bg-color': 'strong',
        'accent-gray-bg-color': 'veil', 'available-components-bg-color': 'soft',
        'disabled-components-bg-color': 'strong', 'table-selected-item-bg-color': 'strong',
        'higlighted-normal': 'strong', 'higlighted-hover': 'strong', 'higlighted-active': 'strong',
        'bg-dark-surface': 'strong', 'hover-bg-dark-surface': 'strong', 'active-bg-dark-surface': 'strong',
        'dialog-background-block': 'strong', 'preloader-box-background': 'soft',
        // --- base: bordes --- 'borders-color-inverted': 'border', 'borders-border-color': 'border',
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
        // --- tooltip --- 'tooltip-text-primary-color': 'fg',
        'tooltip-text-secondary-color': 'dim', 'tooltip-separator-color': 'border',
        // --- acordeon ---
        'accordion-normal-background': 'soft', 'accordion-normal-color': 'fg',
        'accordion-active-background': 'accent', 'accordion-active-color': 'on',
        'accordion-hover-background': 'strong', 'accordion-hover-color': 'fg',
        'accordion-border-color': 'border',
        // --- wizard / ayuda / modal ---
        'wizard-dialog-header-background': 'accent', 'wizard-dialog-header-color': 'on', 'modal-background': 'soft',
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
        'input-background': 'soft', 'input-color': 'fg',
        'input-border-color-hover': 'border', 'input-stepper-active-bg-color': 'strong',
        'disabled-input-background-color': 'strong', 'disabled-input-color': 'mute', 'placeholder-color': 'mute',
        'select-border-color': 'border', 'select-hover-border-color': 'border',
        'chip-bg-color': 'strong', 'chip-bg-hover-color': 'strong', 'header-badge-bg-color': 'strong',
        'checkbox-bg-color': 'soft', 'checkbox-checked-bg-color': 'accent', 'checkbox-checkmark-color': 'on', 'checkbox-hover-color-secondary': 'hover', 'switch-on-bg': 'accent',
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
        // --- pestañas, calendario, avisos, estados ---
        'tab-color': 'fg', 'tab-color-hover': 'fg', 'vtab-color-active': 'fg',
        'tab-border-color': 'border', 'tab-border-color-hover': 'border', 'tab-border-color-active': 'border',
        'tabs-item-hover-bg-color': 'strong',
        'featured-dot-background': 'accent', 'notify-name-color': 'accent',
        'calendar-main-text-color': 'accent', 'calendar-today-color': 'accent',
        'calendar-restore-data-color': 'accent', 'calendar-main-text-hover-color': 'hover',
        'calendar-weeknumber-text-color': 'dim',
        'help-window-collapser-header-color': 'dim',
        'switch-off-hover-bg': 'strong', 'switch-thumb-hover-border-color': 'border',
        'switch-off-bg': 'strong', 'switch-disabled-bg': 'border',
        'panel-list-item-button-noaccent-progress-bg': 'border',
        'panel-list-group-button-noaccent-progress-bg': 'border',
        'panel-list-group-expanded-button-noaccent-progress-bg': 'border',
        'panel-list-item-input-button-noaccent-hover-bg': 'strong',
        'panel-list-item-input-button-noaccent-active-bg': 'strong', 'secondary-color-message-box': 'dim',
        'checkbox-border-color': 'border',
        'list-table-tab_button-active-disabled-color': 'on',
        'list-table-tab_button-active-disabled-background': 'accent',
        'panel-list-item-button-noaccent-color': 'dim',
        'panel-list-item-button-noaccent-hover-color': 'fg',
        'panel-list-item-button-noaccent-disabled-color': 'mute',
        'panel-list-item-input-button-noaccent-color': 'dim',
        'panel-list-group-button-noaccent-color': 'dim',
        'panel-list-group-button-noaccent-hover-color': 'fg',
        'panel-list-group-button-noaccent-disabled-color': 'mute',
        'panel-list-group-expanded-button-noaccent-color': 'dim',
        'panel-list-group-expanded-button-noaccent-hover-color': 'fg',
        'panel-list-group-expanded-button-noaccent-disabled-color': 'mute',
        'panel-list-item-add-disabled-color': 'mute',
        // ------------------------------------------------------------------
        // Paleta de grises. En la plataforma esta pensada para tema CLARO:
        // --gray-900 (#172336) es texto oscuro, --gray-200 (#EFEFF1) es fondo
        // claro. En un tema oscuro quedan invisibles. Se mapea cada nivel por
        // su USO REAL (texto vs fondo, ver volcado): los oscuros -> texto de
        // Rondo, los claros -> superficie.
        // ------------------------------------------------------------------
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
    // Paleta de grises: SOLO se aplica en tema OSCURO. En el tema claro de
    // Wialon estos grises ya son correctos (texto oscuro / fondos claros), y
    // ademas estan MEZCLADOS (--gray-200/300 se usan de fondo y de texto), asi
    // que aplicarlos en claro pintaba el texto con color de fondo.
    // Variables que Wialon usa a la vez como TEXTO y como FONDO. Mapearlas
    // globalmente rompe uno de los dos roles; se resuelven por PROPIEDAD en el
    // remap (texto -> color de texto, fondo -> color de fondo, borde -> borde).
    // 'veil' = velo TRANSLUCIDO (no una superficie opaca). Wialon usa varios
    // fondos con ~5% de opacidad (--accent-gray-bg-color #1723360A,
    // --hover-bg-color #1723360F) como CAPA: p. ej. td::before{position:absolute;
    // inset:0;z-index:0} en las tablas del hint de unidad (velocidad, km, horas
    // de motor, satelites) y ::before de botones. Esa capa se pinta ENCIMA del
    // texto no posicionado; con un gris opaco tapaba el dato (campos "vacios").
    const RX_PAGINA_MIXTOS = {
        // El skin define --white como blanco y lo usa de FONDO de botones,
        // pestanas, checkboxes, calendario y del cuadro de mensaje de unidad,
        // pero tambien de TEXTO (iconos/botones sobre acento). Forzarlo a blanco
        // dejaba, en tema oscuro, texto claro sobre fondo blanco (invisible);
        // forzarlo a superficie pintaba de oscuro el texto. Se resuelve por
        // propiedad en el remap: fondo -> superficie, texto -> blanco (on).
        'white': { texto: 'on', fondo: 'soft', borde: 'border' },
        // ._messageBox_ (ventana/tarjeta flotante de unidad) saca su fondo de
        // aqui. Su texto es --primary-color-message-box. Si el fondo queda
        // blanco y el texto claro (tema oscuro), la ventana se ve vacia.
        'white-color-message-box': { texto: 'on', fondo: 'soft' },
        'white-color-border-message-box': { texto: 'border', fondo: 'border', borde: 'border' },
        'popup-background-suggestion': { texto: 'fg', fondo: 'soft' },
        'inline-background-suggestion': { texto: 'fg', fondo: 'strong' },
        'gray-50': { texto: 'on', fondo: 'soft' },
        'base-bg-color': { texto: 'fg', fondo: 'bg' },
        'hover-bg-color': { texto: 'fg', fondo: 'veil' },
        'borders-color': { texto: 'dim', fondo: 'border', borde: 'border' },
        'tooltip-bg-color': { texto: 'fg', fondo: 'strong' },
        'input-border-color': { texto: 'fg', fondo: 'border', borde: 'border' },
        'checkbox-hover-color': { texto: 'fg', fondo: 'strong' },
        'gray-200': { texto: 'mute', fondo: 'strong' },
        'gray-300': { texto: 'mute', fondo: 'border', borde: 'border' },
        'icons-action-color': { texto: 'dim', fondo: 'strong' },
        'checkbox-disabled-checked-bg-color': { texto: 'mute', fondo: 'strong' },
        'gray-700': { texto: 'dim', fondo: 'strong' },
        'color-text': { texto: 'fg', fondo: 'strong' },
        'light-color': { texto: 'mute', fondo: 'strong' },
        'primary-color-message-box': { texto: 'fg', fondo: 'strong' },
        'wizard-dialog-background': { texto: 'fg', fondo: 'soft' },
    };
    // Colores de ESTADO (aviso/exito/error/ayuda). Wialon usa pasteles claros
    // (--red-50, --orange-50...) de fondo y tonos 700 de texto; sobre un panel
    // oscuro quedaban como islas claras con el texto del tema (claro) encima, o
    // el texto de estado (rojo oscuro) sobre fondo oscuro. Cada tema trae su
    // pareja fondo/texto en la paleta (en claro coinciden con los originales).
    const RX_PAGINA_ESTADOS = {
        'red-50': 'badbg', 'green-50': 'okbg', 'orange-50': 'warnbg', 'amber-50': 'warnbg',
        'yellow-50': 'warnbg', 'blue-50': 'infobg',
        'inline-background-error': 'badbg', 'inline-background-warning': 'warnbg',
        'inline-background-success': 'okbg', 'inline-background-help': 'infobg',
        'popup-background-warning': 'warnbg',
        'higlighted-normal': 'infobg', 'higlighted-hover': 'infobg', 'higlighted-active': 'infobg',
        'list-table-background-warn': 'warnbg', 'list-table-background-error': 'badbg',
        'red-700': 'badfg', 'green-700': 'okfg', 'orange-700': 'warnfg', 'blue-700': 'infofg',
        'color-danger': 'badfg'
    };
    Object.keys(RX_PAGINA_ESTADOS).forEach((k) => { RX_PAGINA_MAPA[k] = RX_PAGINA_ESTADOS[k]; });
    // Solo los grises de USO CLARO: unos como texto (900/700/500/400) y otros
    // como superficie (100/50/800/600). Se EXCLUYEN gray-200 y gray-300 porque
    // Wialon los usa a la vez de fondo Y de texto (fecha, direccion): mapearlos
    // pintaba ese texto con color de fondo.
    const RX_PAGINA_GRISES_OSCURO = {
        'gray-900': 'fg', 'gray-800': 'strong', 'gray-600': 'strong',
        'gray-500': 'mute', 'gray-400': 'mute', 'gray-100': 'strong'
    };
    // Unico token que espera el shorthand completo "1px solid <color>".
    const RX_PAGINA_BORDE_SHORTHAND = {
        'list-table-tab_button-active-border': 'accent',
        'list-table-tab_button-border': 'border',
        'button-border': 'border'
    };
    // Todas las familias de scrollbar comparten la misma forma (bg + thumb +
    // hover + active). Con estos prefijos se cubren las ~120 variables sin
    // enumerarlas una a una.
    const RX_PAGINA_SCROLL = ['default', 'modal', 'help', 'panel-left', 'input', 'tooltip',
        'popup-hint', 'popup-help', 'popup-warning', 'popup-error', 'popup-success',
        'banner-hint', 'banner-help', 'banner-warning', 'banner-error', 'banner-success'];
    // Redondeos: la plataforma usa 4px; Rondo es mas suave (8-12px). Como son
    // tokens, cambiarlos redondea de golpe botones, inputs, tarjetas y dialogos.
    const RX_PAGINA_RADIOS = {
        'controls-border-radius': '8px', 'other-border-radius': '8px', 'modal-border-radius': '12px',
        'button-border-radius': '8px', 'input-border-radius': '8px', 'tag-border-radius': '6px',
        'panel-list-item-border-radius': '8px', 'panel-list-group-border-radius': '8px',
        'tooltip-border-radius': '8px'
    };
    // Resuelve una clave del mapa al color de la paleta activa.
    function rxPaginaToken(clave, P, acc, acc2, accD) {
        if (clave === 'accent') return acc;
        if (clave === 'accent-2') return acc2;
        if (clave === 'hover') return accD;
        if (clave === 'on') return '#ffffff';
        if (clave === 'transparent') return 'transparent';
        if (clave === 'accent-bg') return acc2 + '22';
        if (clave === 'accent-bg-hover') return acc2 + '33';
        if (clave === 'acctxt') return rxAcentoTexto(acc, P);
        if (clave === 'hovtxt') return rxAcentoTexto(acc, P, 0.12);
        return P[clave] || P.fg;
    }
    // Lee la paleta activa de Rondo (--rondo-*) con respaldo literal, para que
    // la pagina use EXACTAMENTE los mismos colores que el panel (y siga los
    // cambios de tema sin duplicar valores a mano).
    function rxPaginaPaleta(claro) {
        let cs = null;
        try { cs = getComputedStyle(document.body || document.documentElement); } catch (_) { cs = null; }
        const g = (n, def) => {
            const v = cs && (cs.getPropertyValue(n) || '').trim();
            return v || def;
        };
        return claro ? {
            bg: g('--rondo-bg', '#f5f7fa'), soft: g('--rondo-bg-soft', '#ffffff'),
            strong: g('--rondo-bg-strong', '#eef2f7'), fg: g('--rondo-fg', '#1d2433'),
            dim: g('--rondo-fg-dim', '#5b6577'), mute: g('--rondo-fg-mute', '#8993a3'),
            border: g('--rondo-border', '#dfe4ec'), veil: 'rgba(23,35,54,.05)',
            claro: true,
            okbg: '#edf7ee', warnbg: '#fff5e5', badbg: '#fff0f2', infobg: '#e7f4fd',
            okfg: '#2d8631', warnfg: '#c25e00', badfg: '#d11f1f', infofg: '#0073ce'
        } : {
            bg: g('--rondo-bg', '#1f2330'), soft: g('--rondo-bg-soft', '#272d3c'),
            strong: g('--rondo-bg-strong', '#313849'), fg: g('--rondo-fg', '#e8ecf3'),
            dim: g('--rondo-fg-dim', '#9aa4b5'), mute: g('--rondo-fg-mute', '#6f7888'),
            border: g('--rondo-border', '#3a4252'), veil: 'rgba(255,255,255,.06)',
            claro: false,
            okbg: '#22362c', warnbg: '#3a3326', badbg: '#3b2a30', infobg: '#213447',
            okfg: '#6bbd6f', warnfg: '#ffb952', badfg: '#ff8a80', infofg: '#6ab8f6'
        };
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
        // Paleta de superficies/texto segun el tema efectivo. Se leen los
        // tokens --rondo-* reales (con respaldo literal) para que la pagina use
        // EXACTAMENTE los mismos colores que el panel.
        const claro = APP.config.theme === 'claro' ||
            (APP.config.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
        const P = rxPaginaPaleta(claro);
        const accT = rxAcentoTexto(acc, P);
        const decl = [];
        Object.keys(RX_PAGINA_MAPA).forEach((v) => {
            decl.push('  --' + v + ':' + rxPaginaToken(RX_PAGINA_MAPA[v], P, acc, acc2, accD) + ' !important;');
        });
        Object.keys(RX_PAGINA_BORDE_SHORTHAND).forEach((v) => {
            decl.push('  --' + v + ':1px solid ' +
                rxPaginaToken(RX_PAGINA_BORDE_SHORTHAND[v], P, acc, acc2, accD) + ' !important;');
        });
        Object.keys(RX_PAGINA_RADIOS).forEach((v) => {
            decl.push('  --' + v + ':' + RX_PAGINA_RADIOS[v] + ' !important;');
        });
        // Los grises solo en oscuro (en claro, los de Wialon ya valen).
        if (!claro) {
            Object.keys(RX_PAGINA_GRISES_OSCURO).forEach((v) => {
                decl.push('  --' + v + ':' + rxPaginaToken(RX_PAGINA_GRISES_OSCURO[v], P, acc, acc2, accD) + ' !important;');
            });
        }
        // Scrollbars acordes al tema (color + hover + activo).
        decl.push('  --scrollbar-bg:' + P.bg + ' !important;');
        RX_PAGINA_SCROLL.forEach((p) => {
            decl.push('  --' + p + '-scrollbar-bg:' + P.bg + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-color:' + P.border + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-hover-color:' + P.dim + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-active-color:' + acc + ' !important;');
        });
        // Logo "RONDO" (Ndot) en lugar del de SkyTracking.
        decl.push('  --logo-background:' + rondoLogoURI(acc) + ' no-repeat center center !important;');
        decl.push('  --monitoring-login-logo:' + rondoLogoURI(acc) + ' !important;');
        decl.push('  --login-logo-bg-url:' + rondoLogoURI(acc) + ' !important;');
        // v6.19.4: los componentes base de Wialon (wui-*) no siempre leen las
        // variables del skin, asi que se visten aparte para que no queden
        // islas con el tema original. Se limita a clases wui-* y a los
        // contenedores raiz; nunca a etiquetas sueltas (romperia el panel).
        const comp = [
            'html,body{background:' + P.bg + ' !important;color:' + P.fg + ' !important;}',
            '::selection{background:' + acc + ' !important;color:#fff !important;}',
            'input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,' +
                '.ant-btn:focus-visible,.wui-button:focus-visible{outline:2px solid ' + acc + ' !important;outline-offset:1px;}',
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
            '.ant-tabs-tab-active .ant-tabs-tab-btn{color:' + accT + ' !important;}',
            '.ant-checkbox-inner,.ant-radio-inner{background:' + P.soft + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-checkbox-checked .ant-checkbox-inner,.ant-radio-checked .ant-radio-inner{background:' + acc + ' !important;border-color:' + acc + ' !important;}',
            '.ant-switch{background:' + P.strong + ' !important;}',
            '.ant-switch-checked{background:' + acc + ' !important;}',
            '.ant-tag{background:' + P.strong + ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            // Ventanas y tarjetas por vehiculo de Wialon: traen colores
            // literales (rgb(255,255,255), #172336...), no leen el skin. Se
            // visten a mano para que no queden islas claras en tema oscuro.
            '#tooltip,#tooltip2,.wui-tooltip,.mini-window-extra,.pursuit-window,.x-unit-info,.x-unit-tooltip,' +
                '.x-monitoring-units-extra-info-row,.monitoring_units_state_gps_wrapper,' +
                '.workspace-units-panel,.workspace-units-panel-main,.workspace-units-caption,' +
                '.x-map-report-marker-info,.map-control-info,.control-with-info,' +
                '.items-group-page-window,.notifications-list-dialog-window-container,' +
                '.gdpr-wizard-dialog-window,.help-window{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip .block-header,#tooltip2 .block-header,.x-unit-tooltip>.header,' +
                '.x-monitoring-units-extra-info-row{border-color:' + P.border + ' !important;}',
            '.pursuit-window .pursuit-top-container{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.pursuit-window .panoram-disable-button{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip a,#tooltip2 a,.x-unit-info a,.mini-window-extra a{color:' + accT + ' !important;}',
            // Ventana de unidad: cabeceras de tabla, bordes y boton de mapa.
            '.x-unit-info > .unit-table-data th{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.x-unit-info > .unit-table-data .td{border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.x-unit-info .external-map-link{background-color:' + P.soft + ' !important;}',
            // Contenedores de dialogos (propiedades de unidad, asistentes): si por
            // orden de hojas o por especificidad ganase la regla original, el
            // cuerpo saldria blanco con el texto claro del tema ilegible.
            '.wizard-dlg-content-target,.help-window-content,.vtabs .tabs-containers{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;}',
            '.wizard-dlg-content-target .block:not(:first-child),.wizard-dlg-content-target .block-separator{border-color:' +
                P.border + ' !important;}',
            // Valores de la tabla del unit-hint (velocidad, kilometraje, horas
            // de motor, satelites): van en <td class="icon"><div>...</div>. Se
            // fuerzan legibles (el icono del td si queda en color de icono).
            '[class*="_table_10z2h_"] td>div:not([class]){color:' + P.fg + ' !important;}',
            // Cinturon y tirantes: el contenido de la celda se eleva sobre su
            // velo ::before (z-index:0), sea cual sea su opacidad.
            '[class*="_table_"] td:not(:empty)>*{position:relative;z-index:1;}',
            // La ventana flotante de unidad (que sale al pasar el raton) es un
            // tippy: .tippy-box._messageBox_*. Su fondo sale de
            // --white-color-message-box (que tambien es el texto blanco de los
            // popups de severidad, por eso NO se toca el token). Se viste la
            // clase del contenedor con [class*=] para sobrevivir a los hashes.
            '.tippy-box,[class*="_messageBox_"],[class*="_messageBoxWrapper_"]{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;}',
            '[class*="_content-wrapper_"],[class*="_contentText_"],[class*="_contentWrapper_"],' +
                '.tippy-content{background:transparent !important;color:' + P.fg + ' !important;}',
            // --gray-900 se usa tambien de fondo en 2 sitios: al volverse claro
            // hay que forzarlos oscuros.
            '.win-video-cams-wrapper{background:' + P.bg + ' !important;}',
            '[class*="_backdrop_"]{background:rgba(0,0,0,.5) !important;}',
            // .wui-tooltip NO define fondo propio en la plataforma (solo
            // box-shadow/color/padding), asi que se transparentaba y se veia
            // el mapa detras. Se fuerza opaco + los fondos claros que la
            // plataforma si declara dentro de la ventana.
            '#tooltip td.h-separator,#tooltip2 td.h-separator,' +
                '#tooltip .block-mixed tr.colored-row,#tooltip2 .block-mixed tr.colored-row,' +
                '#tooltip #tooltip_zone .zone-units tr:nth-child(2n+1),' +
                '.hittest-ctrl-point-description .block-mixed tr.colored-row,' +
                'tr.unit-cmds-response-row,tr.unit-cmds-response-row-msg,' +
                '.pursuit-window .no-flash,' +
                'div.pursuit-window div.mini-window-extra#tooltip,' +
                'div.pursuit-window div.mini-window-extra#tooltip2{background:' + P.soft + ' !important;}',
            'div.pursuit-window #tooltip .win-video-cams-table{background:' + P.soft + ' !important;}',
            'div.pursuit-window #tooltip .win-video-grid-panel{background:' + P.strong + ' !important;}',
            'div.pursuit-window #tooltip .win-video-header{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip h3,#tooltip2 h3,.wui-tooltip h3{color:' + P.fg + ' !important;}',
            '.x-unit-info .entity-block-item > .image-container{border-color:' + P.border + ' !important;}',
            // Botones junto al mapa: el blanco real viene de
            // .wui-button-icon-shadow (background-color:#fff), no de un
            // contenedor, asi que se viste esa clase y setransparentan los
            // contenedores que solo maquetan (ol-maps-control, ol-bar...).
            '.wui-button-icon-shadow{background:' + P.soft + ' !important;border-radius:8px !important;}',
            '.wui-button-icon-shadow:hover{background:' + P.strong + ' !important;}',
            '.wui-button-icon-shadow button,.wui-button-icon-shadow:hover button{background:' + P.soft + ' !important;}',
            '.ol-maps-control,.control-search,.ol-bar-container,.menu-smart-search,' +
                '.ol-layers-control,.ol-tools-panel{background:transparent !important;}',
            // Reportes, avisos, rutas y listas legacy (del volcado de estilos).
            '.report-result-body-table,.report-dialog-tables-dialog,.report-table-filters,.notify_dlg_table,' +
                '.unit-cmds-response-table,.x-cookie-policy,.whats-new-box,.chart_tooltip,' +
                '.route-control-create-cp-actions,.report-result-toolbar-icon,.waypoint_toolbar_btn,' +
                '.export-control,.time-tags-container,.map_webgis_search_list{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.report-result-body-table th,.report-dialog-tables-dialog th,.notify_dlg_table th,' +
                '.report-table-filters th{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.tag-switcher,.trackbar,.x-cookie-policy{color:' + P.dim + ' !important;}',
            'html .ol-viewport{background:' + P.bg + ' !important;}',
            '.map-control-info{background:' + P.strong + ' !important;color:' + P.fg +
                ' !important;border-color:' + P.border + ' !important;}',
            '.mapboxgl-ctrl-group{background:transparent !important;box-shadow:none !important;border-radius:0 !important;}',
            '.mapboxgl-ctrl-group button{background:' + P.soft + ' !important;border-radius:8px !important;' +
                'margin:4px 0 !important;box-shadow:0 1px 3px rgba(0,0,0,.35) !important;}',
            '.mapboxgl-ctrl-group button+button{border-top:none !important;}',
            '.MicrosoftMap .NavBar_Container,.MicrosoftMap .streetsideToolPanel{background:transparent !important;}',
            '.MicrosoftMap .NavBar_Button,.MicrosoftMap .streetsideToolPanelButton{background:' + P.soft +
                ' !important;border-radius:8px !important;}',
            // Ajusta el logo RONDO a su caja (el SVG trae su propio tamano).
            '.top .logo,.logo,#block_top_panel .logo,.logo-wrapper .logo{background-size:contain !important;' +
                'background-repeat:no-repeat !important;background-position:center !important;}',
            '._LoginContainerLogo,.logo-img,#monitoringLoginLogo{background-size:contain !important;' +
                'background-repeat:no-repeat !important;background-position:center !important;}'
        ].join('\n');
        _rxCompCSS = comp;
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
    // v6.19.5: capa de rendimiento CSS. No toca JS ni red: reduce el trabajo de
    // pintado/composicion del navegador sobre la plataforma, que es lo que
    // produce el "trabado" al hacer scroll o animar. Es opt-in y reversible.
    function rxAplicarRendimientoPagina() {
        const elPrev = document.getElementById('rondo-rendimiento-pagina');
        if (!(APP.config && APP.config.rendimientoPagina)) {
            if (elPrev && elPrev.parentNode) elPrev.parentNode.removeChild(elPrev);
            return;
        }
        let el = elPrev;
        if (!el) {
            el = document.createElement('style');
            el.id = 'rondo-rendimiento-pagina';
            (document.head || document.documentElement).appendChild(el);
        }
        const reglas = [
            // Controles nativos (inputs, scrollbars, date pickers...) con el
            // esquema del tema: menos repintado y sin estilos de scrollbar por
            // JS. Barra fina con color de borde de Rondo.
            'html{color-scheme:' + (APP.config.theme === 'claro' ? 'light'
                : (APP.config.theme === 'auto' ? 'light dark' : 'dark')) + ' !important;}',
            '*{scrollbar-width:thin;scrollbar-color:var(--rondo-border) transparent;}',
            // Los desenfoques (backdrop-filter) son de lo mas caro por frame.
            '*{-webkit-backdrop-filter:none !important;backdrop-filter:none !important;}',
            // El scroll suave va por el hilo principal: fuera.
            'html{scroll-behavior:auto !important;}',
            // Filas/cartas fuera de pantalla: no se calculan ni se pintan.
            '.wui2-list_row,.wui-list_item,.ant-table-row,.ant-list-item,.ant-select-item,' +
                '.ant-table-tbody>tr,.wui2-list_group-row{content-visibility:auto;contain-intrinsic-size:auto 38px;}',
            // Cada fila se pinta aislada: un cambio dentro no refluye el resto.
            '.wui2-list_row,.wui-list_item,.ant-table-row{contain:layout style paint;}',
            // Transiciones cortas y solo de propiedades que no repintan.
            '.wui-button,.wui-icon,.ant-btn,.wui2-button{transition:background-color .1s,color .1s,border-color .1s,opacity .1s !important;}',
            // Respeta "reducir movimiento" del sistema.
            '@media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important;}}'
        ].join('\n');
        el.textContent = reglas + '\n';
    }
    /* --- Remapeo de colores literales (v6.19.6) -------------------------
     * Solo ~9% de las reglas de la plataforma traen color literal, pero son
     * las "islas" que no siguen el tema (tarjetas y ventanas por vehiculo,
     * grillas viejas como .flexigrid, controles del mapa .MicrosoftMap,
     * .date_selector...). En vez de enumerar cientos de selectores, se
     * recorren las hojas y se reescriben esas declaraciones segun su
     * PROPIEDAD, que es lo que quita la ambiguedad:
     *   - fondo claro      -> superficie (soft/strong/bg)
     *   - texto            -> fg/dim/mute (o #fff si era casi blanco)
     *   - borde            -> borde de Rondo
     *   - azul/rojo saturado -> acento (verde/naranja de estado se respetan)
     * Se ignoran los valores con var() y las custom properties: eso ya lo
     * cubre el mapa de tokens. La hoja reescrita se inserta al final del
     * head, asi gana en cascada sin usar !important (no rompe :hover). */
    function rxColorParse(v) {
        const t = String(v || '').trim().toLowerCase();
        if (t === 'white') return { r: 255, g: 255, b: 255, a: 1 };
        if (t === 'black') return { r: 0, g: 0, b: 0, a: 1 };
        if (t === 'transparent' || t === 'currentcolor' || t === 'inherit' || t === 'none') return null;
        let m = /^#([0-9a-f]{3,8})$/.exec(t);
        if (m) {
            let h = m[1];
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
            if (h.length === 6) h += 'ff';
            if (h.length !== 8) return null;
            return {
                r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255
            };
        }
        m = /^rgba?\(([^)]*)\)$/.exec(t);
        if (m) {
            const p = m[1].split(',').map((x) => x.trim());
            if (p.length < 3) return null;
            const num = (x) => (x.indexOf('%') >= 0 ? Math.round(parseFloat(x) * 2.55) : parseFloat(x));
            const r = num(p[0]), g = num(p[1]), b = num(p[2]);
            const a = p[3] === undefined ? 1 : (p[3].indexOf('%') >= 0 ? parseFloat(p[3]) / 100 : parseFloat(p[3]));
            if (![r, g, b].every((x) => isFinite(x)) || !isFinite(a)) return null;
            return { r: r, g: g, b: b, a: a };
        }
        return null;
    }
    function rxColorHue(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        if (!d) return 0;
        let h;
        if (mx === r) h = ((g - b) / d) % 6;
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        return h < 0 ? h + 360 : h;
    }
    // Rol (clave de paleta) de un color literal segun la PROPIEDAD donde
    // aparece. Devuelve la clave, NO un color: la regla reescrita usara
    // var(--rpg-*) y cambiar de tema sera solo repintar esas variables, sin
    // volver a recorrer el CSS de la pagina.
    function rxColorClave(v, prop) {
        const c = rxColorParse(v);
        if (!c) return null;
        const p = String(prop || '').toLowerCase();
        if (p.indexOf('--') === 0) return null;
        if (/shadow|image|filter|transition|animation|opacity|transform|content/.test(p)) return null;
        if (c.a < 0.08) return null;
        const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
        const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat > 0.25) {
            const hue = rxColorHue(c.r, c.g, c.b);
            const esTexto = p === 'color' || p === 'fill' || p === 'stroke' || p === 'caret-color';
            if (hue <= 20 || hue >= 330) return esTexto ? 'acctxt' : 'accent';                // rojo del skin
            if (hue >= 190 && hue <= 265 && lum > 0.16) return esTexto ? 'acctxt' : 'accent'; // azul brillante
            if (lum > 0.16) return null;                                 // verde/ambar: estado
            // oscuro y saturado (azul marino del texto): cae a neutro
        }
        if (p.indexOf('background') === 0) {
            if (lum > 0.9) return 'soft';
            if (lum > 0.45) return 'strong';
            return 'bg';
        }
        if (p.indexOf('border') === 0 || p.indexOf('outline') === 0 || p.indexOf('column-rule') === 0) return 'border';
        if (p === 'color' || p === 'fill' || p === 'stroke' || p === 'caret-color') {
            if (c.a < 0.98) return null;
            if (lum > 0.85) return 'on';
            if (lum > 0.55) return 'mute';
            if (lum > 0.3) return 'dim';
            return 'fg';
        }
        return null;
    }
    // Debe dar el MISMO color que rxPaginaToken para cada clave: el remap
    // (var(--rpg-*)) y la emision global de variables comparten el mapa. Si
    // faltaba una clave (transparent, tintes de acento), el remap caia al color
    // de TEXTO y, p. ej., la barra superior (fondo transparente) salia clara.
    function rxColorValor(clave, P, acc, accD) {
        if (clave === 'accent') return acc;
        if (clave === 'hover') return accD;
        if (clave === 'on') return '#ffffff';
        if (clave === 'transparent') return 'transparent';
        if (clave === 'accent-2') return aclarar(acc, 0.28);
        if (clave === 'accent-bg') return aclarar(acc, 0.28) + '22';
        if (clave === 'accent-bg-hover') return aclarar(acc, 0.28) + '33';
        if (clave === 'acctxt') return rxAcentoTexto(acc, P);
        if (clave === 'hovtxt') return rxAcentoTexto(acc, P, 0.12);
        return P[clave] || P.fg;
    }
    // Rol de una clave de paleta: a que propiedad pertenece.
    function rxPaginaRolClave(clave) {
        if (clave === 'bg' || clave === 'soft' || clave === 'strong' || clave === 'veil') return 'fondo';
        if (/^(ok|warn|bad|info)bg$/.test(clave)) return 'fondo';
        if (/^(ok|warn|bad|info)fg$/.test(clave)) return 'texto';
        if (clave === 'border') return 'borde';
        if (clave === 'fg' || clave === 'dim' || clave === 'mute' || clave === 'on') return 'texto';
        return 'acento'; // accent, hover, accent-2, accent-bg*, transparent
    }
    function rxPropRol(prop) {
        if (/^(border|outline|column-rule)/.test(prop)) return 'borde';
        if (prop.indexOf('background') === 0) return 'fondo';
        return 'texto';
    }
    // Rol de una CUSTOM PROPERTY (--tab-bg-color, --color-text...) por su
    // NOMBRE. Sirve para reescribir definiciones tipo `--x: var(--white)`:
    // el rol del token destino manda (una variable *-background es fondo
    // aunque apunte a --white, que tambien vale como texto).
    function rxRolNombre(name) {
        const n = String(name || '').replace(/^--/, '').toLowerCase();
        if (n.indexOf('border') >= 0) return 'borde';
        if (n.indexOf('background') >= 0 || /(^|-)bg(-|$)/.test(n)) return 'fondo';
        return 'texto';
    }
    function rxAcentoComoTexto(clave) {
        if (clave === 'accent') return 'acctxt';
        if (clave === 'hover') return 'hovtxt';
        return clave;
    }
    // Clave de paleta para una variable del tema segun el ROL (texto, fondo o
    // borde) donde se use. Asi una variable que Wialon usa como fondo Y como
    // texto nunca contagia un rol con el otro. Los tokens de acento valen para
    // cualquier rol.
    function rxTokenClave(tok, rol) {
        if (RX_PAGINA_MIXTOS[tok]) return RX_PAGINA_MIXTOS[tok][rol] || RX_PAGINA_MIXTOS[tok].fondo;
        const clave = RX_PAGINA_MAPA[tok] || RX_PAGINA_GRISES_OSCURO[tok];
        if (!clave) return null;
        if (rxPaginaRolClave(clave) === 'acento') return rol === 'texto' ? rxAcentoComoTexto(clave) : clave;
        if (rol === rxPaginaRolClave(clave)) return clave;
        if (rol === 'fondo') return 'soft';
        if (rol === 'borde') return 'border';
        return 'fg';
    }
    // Literales de color dentro de un valor (hex o rgb/rgba).
    const RX_COLOR_LIT = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
    // Registro de variables del remap: un id por (literal + rol).
    const _rxVars = {};
    const _rxVarsOrden = [];
    const _rxVarLit = {};
    function rxVarId(lit, clave) {
        const k = String(lit).trim().toLowerCase() + '|' + clave;
        if (_rxVarLit[k]) return _rxVarLit[k];
        let h = 5381;
        for (let i = 0; i < k.length; i++) h = ((h << 5) + h + k.charCodeAt(i)) | 0;
        let id = 'c' + (h >>> 0).toString(36);
        let n = 1;
        while (_rxVars[id] !== undefined) { id = 'c' + (h >>> 0).toString(36) + 'x' + n; n++; }
        _rxVarLit[k] = id;
        _rxVars[id] = clave;
        _rxVarsOrden.push(id);
        return id;
    }
    // Atajos de color. Cuando un atajo lleva var() (background: var(--x);
    // border: 1px solid var(--y)) el navegador lista las propiedades SUELTAS
    // (background-color, border-top-color...) con valor VACIO y guarda el
    // texto solo en el atajo. Recorrer unicamente style[i] ignoraba todas esas
    // reglas (~1000 en la plataforma: fondos de dialogos, pestanas, bordes).
    const RX_ATAJOS_COLOR = ['background', 'border', 'border-top', 'border-right', 'border-bottom',
        'border-left', 'border-color', 'outline', 'column-rule'];
    // Reescribe var(--token) por el color del rol y, fuera de variables, los
    // literales por su rol. Devuelve el mismo texto si nada cambia.
    function rxReescribirColor(val, prop, rol, esCustom) {
        let v = val.replace(/var\(--([a-zA-Z0-9_-]+)\)/g, (full, tok) => {
            const clave = rxTokenClave(tok, rol);
            if (!clave) return full;
            return 'var(--rpg-' + rxVarId('tok:' + tok + ':' + clave, clave) + ')';
        });
        // Los literales solo en reglas normales: reescribir el valor de una
        // variable por un literal la fijaria fuera del tema.
        if (!esCustom) {
            v = v.replace(RX_COLOR_LIT, (lit) => {
                const clave = rxColorClave(lit, prop);
                return clave ? 'var(--rpg-' + rxVarId(lit, clave) + ')' : lit;
            });
        }
        return v;
    }
    function rxDeclaracionesRondo(style, P, acc, acc2, accD) {
        let cambio = false;
        const partes = [];
        const hechos = {};
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            const val0 = style.getPropertyValue(prop);
            if (!val0) continue; // longhand de un atajo con var(): se ve abajo
            const esCustom = prop.indexOf('--') === 0;
            // Propiedades de color Y definiciones de variables: en ambos casos
            // se sustituye `var(--token)` por el color del rol correcto. Para
            // las custom properties el rol sale del NOMBRE (--tab-bg-color ->
            // fondo), porque el valor de la var no dice donde se usara.
            if (!(esCustom || /color|background|border|outline|fill|stroke|caret/.test(prop))) continue;
            const val = rxReescribirColor(val0, prop, esCustom ? rxRolNombre(prop) : rxPropRol(prop), esCustom);
            if (val === val0) continue; // solo se emite lo que cambio
            cambio = true;
            hechos[prop] = true;
            const prio = style.getPropertyPriority(prop);
            partes.push(prop + ':' + val + (prio ? ' !important' : '') + ';');
        }
        for (let k = 0; k < RX_ATAJOS_COLOR.length; k++) {
            const atajo = RX_ATAJOS_COLOR[k];
            if (hechos[atajo]) continue;
            const v0 = style.getPropertyValue(atajo);
            if (!v0 || v0.indexOf('var(') < 0) continue;
            const v = rxReescribirColor(v0, atajo, rxPropRol(atajo), false);
            if (v === v0) continue;
            cambio = true;
            partes.push(atajo + ':' + v + (style.getPropertyPriority(atajo) ? ' !important' : '') + ';');
        }
        return cambio ? partes.join('') : '';
    }
    function rxReglasRondo(reglas, P, acc, acc2, accD) {
        const out = [];
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && (r.type === 4 || r.type === 12)) {
                const cond = r.conditionText || (r.media && r.media.mediaText) || '';
                const inner = rxReglasRondo(r.cssRules, P, acc, acc2, accD);
                if (inner) out.push((r.type === 4 ? '@media ' : '@supports ') + cond + '{' + inner + '}');
                continue;
            }
            // @layer / @container / @scope: la plataforma hoy solo usa @media y
            // @supports, pero Vite/Ant Design ya emiten estos; sus reglas
            // quedarian sin tema. Se conserva la cabecera para no cambiar la
            // prioridad de las capas. (@keyframes y @font-face no se tocan.)
            if (r.cssRules && !r.selectorText && r.type !== 4 && r.type !== 12 && r.type !== 7 &&
                typeof r.cssText === 'string') {
                const cab = /^@(layer|container|scope)\b[^{]*/.exec(r.cssText);
                if (cab) {
                    const inner = rxReglasRondo(r.cssRules, P, acc, acc2, accD);
                    if (inner) out.push(cab[0].trim() + '{' + inner + '}');
                }
                continue;
            }
            if (!r.selectorText || !r.style) continue;
            const decls = rxDeclaracionesRondo(r.style, P, acc, acc2, accD);
            if (decls) out.push(r.selectorText + '{' + decls + '}');
        }
        return out.join('');
    }
    let _rxObs = null;
    let _rxObsBody = null;
    // hoja -> n.o de reglas ya procesadas. Las hojas CSS-in-JS (emotion de
    // react-select, cssinjs de Ant Design) CRECEN con insertRule cuando se abre
    // un dialogo; si la hoja se diera por "vista" esas reglas quedarian sin tema.
    let _rxHojasVistas = null;
    let _rxPoll = 0;
    let _rxUltimoN = -1;
    let _rxTimer = 0;
    let _rxCompCSS = '';
    function rxHojaRondo(id) {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('style');
            el.id = id;
            (document.head || document.documentElement).appendChild(el);
        }
        return el;
    }
    // Pinta SOLO las variables del remap (barato): es lo unico que hay que
    // rehacer al cambiar de tema o acento.
    // v6.0.14: redefine las variables DE LA PLATAFORMA (no las nuestras). Se
    // refresca cada pasada porque una hoja cargada tarde declara variables nuevas.
    function rxPintarVariablesPlataforma(P, acc, acc2) {
        try {
            const txt = rxHojaVariables(P, P.claro, acc, acc2);
            if (txt) rxHojaRondo('rondo-var-plataforma').textContent = txt;
        } catch (_) { /* noop */ }
    }
    function rxPintarTokens(P, acc, accD) {
        if (!_rxVarsOrden.length) return;
        const partes = [];
        for (let i = 0; i < _rxVarsOrden.length; i++) {
            const id = _rxVarsOrden[i];
            partes.push('  --rpg-' + id + ':' + rxColorValor(_rxVars[id], P, acc, accD) + ';');
        }
        rxHojaRondo('rondo-tokens-pagina').textContent = ':root,html,body{\n' + partes.join('\n') + '\n}\n';
    }
    function rxProgramarColoresPagina() {
        clearTimeout(_rxTimer);
        _rxTimer = setTimeout(() => { try { rxAplicarColoresPagina(); } catch (_) { /* noop */ } }, 400);
    }
    function rxDesactivarColores() {
        ['rondo-colores-pagina', 'rondo-tokens-pagina'].forEach((id) => {
            const el = document.getElementById(id);
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        if (_rxObs) { _rxObs.disconnect(); _rxObs = null; }
        if (_rxObsBody) { _rxObsBody.disconnect(); _rxObsBody = null; }
        Object.keys(_rxVars).forEach((k) => delete _rxVars[k]);
        _rxVarsOrden.length = 0;
        Object.keys(_rxVarLit).forEach((k) => delete _rxVarLit[k]);
        _rxHojasVistas = null;
        if (_rxPoll) { clearInterval(_rxPoll); _rxPoll = 0; }
        _rxUltimoN = -1;
    }
    // Procesa las reglas de una hoja que aun no se vieron. Incremental: una hoja
    // ya hecha no se reparsea, pero si ha ganado reglas (CSS-in-JS) solo se
    // procesan las NUEVAS. Si encoge (deleteRule) se reprocesa entera.
    function rxProcesarHoja(hoja, P, acc, acc2, accD) {
        if (!hoja) return false;
        if (!_rxHojasVistas) _rxHojasVistas = typeof WeakMap === 'function' ? new WeakMap() : null;
        let rs;
        try { rs = hoja.cssRules || []; } catch (_) { return false; }
        let desde = _rxHojasVistas ? (_rxHojasVistas.get(hoja) || 0) : 0;
        if (rs.length < desde) desde = 0;
        if (rs.length === desde) return false;
        if (_rxHojasVistas) _rxHojasVistas.set(hoja, rs.length);
        let t = '';
        try { t = rxReglasRondo(desde ? Array.prototype.slice.call(rs, desde) : rs, P, acc, acc2, accD); } catch (_) { return false; }
        if (!t) return false;
        rxHojaRondo('rondo-colores-pagina').textContent += '\n' + t;
        return true;
    }
    // Las hojas del remap deben ser las ULTIMAS del <head>. A igual especificidad
    // gana la ultima en el orden del documento, y la plataforma carga modulos
    // con sus hojas (<link>/<style>, emotion...) DESPUES de nuestra primera
    // pasada: sin esto sus reglas (p. ej. .wizard-dlg-content-target{background:
    // var(--wizard-dialog-background)}) volvian a ganar y el dialogo salia
    // blanco. Solo se mueve si hace falta (reinsertar reparsea la hoja).
    function rxMantenerAlFinal() {
        try {
            const head = document.head || document.documentElement;
            const col = document.getElementById('rondo-colores-pagina');
            if (!col || !head || !head.children) return false;
            const tok = document.getElementById('rondo-tokens-pagina');
            const vrp = document.getElementById('rondo-var-plataforma');
            const h = head.children, n = h.length;
            const fin = vrp || tok || col;
            const bien = n >= 1 && h[n - 1] === fin;
            if (bien) return false;
            head.appendChild(col);
            if (tok) head.appendChild(tok);
            if (vrp) head.appendChild(vrp);
            return true;
        } catch (_) { return false; }
    }
    // Suma de reglas de las hojas ajenas a Rondo (barato: ~60 hojas). Cambia
    // cuando la plataforma inserta reglas sin anadir ningun <style>.
    function rxContarReglas() {
        let n = 0;
        try {
            const hs = document.styleSheets;
            for (let i = 0; i < hs.length; i++) {
                const o = hs[i].ownerNode;
                if (o && o.id && o.id.indexOf('rondo') === 0) continue;
                try { n += hs[i].cssRules.length; } catch (_) { /* cross-origin */ }
            }
        } catch (_) { /* noop */ }
        return n;
    }
    // Wialon pinta los valores de sensores/tarjetas con colores INLINE
    // (style="background-color:#fff; color:#fff"). El remap de hojas no los ve,
    // asi que quedan como islas: texto claro sobre fondo claro del mismo color.
    // Se remapean igual (por propiedad) dentro de las ventanas/tarjetas, nunca
    // en el panel de Rondo.
    // ===== CAPA 3: LITERALES REESCRITOS EN SITIO =====
    // Lo que no pasa por variables (un color escrito a pelo en la regla, un SVG,
    // un fondo de Ant Design) se modifica DENTRO de la regla original: misma
    // posicion en la cascada, misma especificidad y mismo !important. Nada que
    //_gainar, nada que clonar.
    const RX_PROPS_COLOR = /^(color|background|background-color|border|border-color|border-top-color|border-bottom-color|border-left-color|border-right-color|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|column-rule-color)$/;
    function rxLiteralColor(v) {
        v = String(v || '').trim();
        if (/^transparent$/i.test(v)) return { hex: null };
        if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return { hex: v };
        const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
        if (m) return { hex: '#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join('') };
        return null;
    }
    function rxReescribirLiterales(P) {
        let n = 0;
        let rs = null;
        try { rs = document.styleSheets; } catch (_) { return n; }
        for (let i = 0; i < rs.length; i++) {
            let reglas = null;
            try { reglas = rs[i].cssRules; } catch (_) { continue; }
            if (!reglas) continue;
            n += rxLiteralesDeReglas(reglas, P, 0);
        }
        return n;
    }
    function rxLiteralesDeReglas(reglas, P, prof) {
        let n = 0;
        if (!reglas || prof > 4) return n;
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && !r.style) { n += rxLiteralesDeReglas(r.cssRules, P, prof + 1); continue; }
            const st = r.style;
            if (!st || !st.length) continue;
            for (let j = st.length - 1; j >= 0; j--) {
                const prop = st[j];
                if (!RX_PROPS_COLOR.test(prop)) continue;
                const lit = rxLiteralColor(st.getPropertyValue(prop));
                if (!lit) continue;
                const prio = st.getPropertyPriority(prop);
                if (prop === 'color' || prop === 'fill' || prop === 'stroke' || prop === 'caret-color') {
                    if (lit.hex === null) continue;
                    st.setProperty(prop, P.fg, prio);
                } else if (prop === 'background' || prop === 'background-color') {
                    if (lit.hex === null) continue;
                    st.setProperty(prop, P.soft, prio);
                } else if (/border|outline|column-rule/.test(prop)) {
                    if (lit.hex === null) continue;
                    st.setProperty(prop, P.border, prio);
                } else if (/shadow/.test(prop)) {
                    if (lit.hex === null) { st.setProperty(prop, 'none', prio); continue; }
                    st.setProperty(prop, lit.hex === P.fg || lit.hex === P.soft ? 'none' : P.shadow || 'none', prio);
                }
                n++;
            }
        }
        return n;
    }
    // ===== MOTOR DE VARIABLES (enfoque Dark Reader) =====
    // La plataforma define ~850 variables (:root) y pinta TODO con ellas. En vez
    // de clonar reglas y pelear por especificidad, se redefinen las variables
    // con !important en :root/html/body: la cascada hace el resto y TODO lo que
    // las use queda tematizado a la vez (dialogos, campos, avisos, scrollbars,
    // estados, sombras...). No hay orden de hojas ni "!important" que gainar.
    const RX_NOMBRES = /^(transparent|white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|cyan|magenta|silver|maroon|navy|olive|lime|aqua|fuchsia|teal|currentcolor)$/i;
    // v6.0.14 / v6.9.1: un valor es color si es hex, rgb()/hsl(), un nombre o var().
    function rxEsColorValor(v) {
        v = String(v || '').trim();
        if (/^#[0-9a-fA-F]{3,8}\b/.test(v) || /^(rgb|hsl)a?\(/i.test(v) ||
            RX_NOMBRES.test(v) || /var\(/.test(v)) return true;
        // Sombra de caja: "0 4px 12px 0 #1723361A" o con varias capas separadas
        // por comas. Trae longitudes Y color, asi que no es una medida suelta.
        return /^-?[\d.]+(px|em|rem|%)?\b.*(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\()/i.test(v);
    }
    // Filtra medidas/cifras: --layer-modal, --time-input-width, --gap... no son color.
    const RX_NO_ROL = /font|size|radius|duration|width|height|spacing|padding|margin|index|offset|line-|weight|family|transition|animation|transform|image|url\(|-layer-|container|gap/i;
    function rxRolPorNombre(nombre, valor) {
        if (!rxEsColorValor(valor)) return null;
        const n = String(nombre).toLowerCase().replace(/^--/, '');
        if (RX_NO_ROL.test(n) && !/shadow|(^|-)(bg|background|surface)(-|$)|-color$/.test(n)) return null;
        const esFondo = /(^|-)(bg|background|surface|fill)(-|$)/.test(n);
        const esBorde = /border|separator|outline|divider/.test(n);
        const esSombra = /shadow/.test(n);
        const esTexto = /(^|-)(color|fg|foreground|text)(-|$)|text-color|color$/.test(n);
        if (esFondo && /error|danger|fail/.test(n)) return 'badbg';
        if (esFondo && /warn/.test(n)) return 'warnbg';
        if (esFondo && /success|(^|-)ok(-|$)/.test(n)) return 'okbg';
        if (esFondo && /help|info/.test(n)) return 'infobg';
        if (esSombra) return 'sombra';
        if (esFondo) return 'fondo';
        if (esBorde) return 'borde';
        if (esTexto && /error|danger|fail/.test(n)) return 'badfg';
        if (esTexto && /warn/.test(n)) return 'warnfg';
        if (esTexto && /success/.test(n)) return 'okfg';
        if (esTexto && /help|info/.test(n)) return 'infofg';
        if (esTexto && /secondary|muted|disabled|placeholder|^light-/.test(n)) return 'dim';
        if (esTexto) return 'fg';
        return null;
    }
    // Recorre todas las hojas accesibles y recoge las variables que declara la
    // plataforma. Una variable se considera "de la plataforma" si la usan reglas
    // suyas: basta con estar declarada en una hoja ajena a Rondo.
    function rxEscanearVariables() {
        const out = new Map();
        let rs = null;
        try { rs = document.styleSheets; } catch (_) { return out; }
        for (let i = 0; i < rs.length; i++) {
            let reglas = null;
            try { reglas = rs[i].cssRules; } catch (_) { continue; } // hoja de otro origen
            if (!reglas) continue;
            rxVarsDeReglas(reglas, out);
        }
        return out;
    }
    function rxVarsDeReglas(reglas, out, profundidad) {
        if (!reglas || (profundidad || 0) > 4) return;
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && !r.style) { rxVarsDeReglas(r.cssRules, out, (profundidad || 0) + 1); continue; }
            const st = r.style;
            if (!st || !st.length) continue;
            for (let j = 0; j < st.length; j++) {
                const prop = st[j];
                if (prop.indexOf('--') !== 0) continue;
                const clave = prop.slice(2);
                if (clave.indexOf('rondo-') === 0) continue; // las nuestras: no se tocan
                const val = st.getPropertyValue(prop);
                if (!rxEsColorValor(val)) continue;
                if (!out.has(clave)) out.set(clave, val);
            }
        }
    }
    // Construye la hoja de redefiniciones. Prioridad: mapa manual > clasificacion
    // por nombre > valor por defecto segun el tipo de variable.
    function rxHojaVariables(P, claro, acc, acc2) {
        const vars = rxEscanearVariables();
        const decl = [];
        for (const clave of vars.keys()) {
            const manual = rxRolManual(clave);
            if (manual === 'mixto') continue;
            const rol = manual || rxRolPorNombre(clave, vars.get(clave));
            if (!rol) continue;
            const v = rxValorRol(rol, P, acc, acc2);
            if (v) decl.push('--' + clave + ':' + v + ' !important');
        }
        if (!decl.length) return '';
        // Son 850+ lineas: se agrupan de 60 para no crear un nodo de estilo enorme.
        let css = '';
        for (let i = 0; i < decl.length; i += 60) css += decl.slice(i, i + 60).join(';') + ';';
        return ':root,html,body{' + css + '}';
    }
    // El mapa manual gana sobre la clasificacion automatica.
    function rxRolManual(clave) {
        const c = clave.replace(/^--/, '');
        // Las variables MIXTAS (--white, --borders-color: valen como texto, fondo
        // y borde segun donde se usen) NO se redefinen a la fuerza: un unico
        // valor no puede ser superficie y a la vez texto legible. Las resuelve el
        // remap por propiedad, que si sabe en que contexto esta cada uso.
        if (RX_PAGINA_MIXTOS[c]) return 'mixto';
        const r = RX_PAGINA_MAPA[c];
        // El mapa manual usa claves de paleta (soft, border, fg, on...); hay que
        // traducirlas al ROL que espera rxValorRol.
        if (typeof r === 'string') return rxRolDeClave(r);
        return RX_PAGINA_ESTADOS[c] || null;
    }
    function rxRolDeClave(k) {
        if (k === 'bg' || k === 'soft' || k === 'strong' || k === 'veil') return 'fondo';
        if (k === 'border') return 'borde';
        if (k === 'fg') return 'fg';
        if (k === 'dim' || k === 'mute') return 'dim';
        if (k === 'on') return 'on';
        if (/^(ok|warn|bad|info)bg$/.test(k)) return k;
        if (/^(ok|warn|bad|info)fg$/.test(k)) return k;
        if (k === 'shadow') return 'sombra';
        return 'acento';
    }
    function rxValorRol(rol, P, acc, acc2) {
        if (rol === 'fondo') return P.soft;
        if (rol === 'borde') return P.border;
        if (rol === 'fg') return P.fg;
        if (rol === 'dim') return P.dim;
        if (rol === 'sombra') return P.shadow || 'none';
        if (rol === 'okbg') return P.okbg; if (rol === 'warnbg') return P.warnbg;
        if (rol === 'badbg') return P.badbg; if (rol === 'infobg') return P.infobg;
        if (rol === 'okfg') return P.okfg; if (rol === 'warnfg') return P.warnfg;
        if (rol === 'badfg') return P.badfg; if (rol === 'infofg') return P.infofg;
        if (rol === 'on') return '#ffffff';
        if (rol === 'acento') return rxAcentoTexto(acc, P);
        if (rol === 'accent') return acc;
        return null;
    }
    const RX_VENTANA_SEL = '[class*="_messageBox_"],[class*="_messageBoxWrapper_"],[class*="_contentWrapper_"],' +
        '[class*="_content-wrapper_"],[class*="_cell_"],[class*="_row_"],[class*="_table_"],' +
        '.tippy-box,.wui2-message-box,.wui-message-box,#tooltip,#tooltip2,.wui-tooltip,.x-unit-info,' +
        '.mini-window-extra,.x-monitoring-units-extra-info-row,' +
        // dialogos (propiedades de unidad...), ayuda, avisos y notificaciones
        '#TB_window,.wizard-dlg-content-target,.help-window,.x-popup,.wui-toast-alert,.wui2-banner,' +
        '.ant-modal,.ant-notification,.ant-popover,.ant-message';
    function rxEsRondo(el) {
        try { return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-rail,#rondo-nmolestar,#rondo-btn-panel')); }
        catch (_) { return false; }
    }
    function rxRemapearInline(el) {
        const st = el && el.style;
        if (!st || !st.length || rxEsRondo(el)) return false;
        let cambio = false;
        for (let i = 0; i < st.length; i++) {
            const prop = st[i];
            if (prop.indexOf('--') === 0) continue;
            if (!/color|background|fill|stroke/.test(prop)) continue;
            const val0 = st.getPropertyValue(prop);
            if (!val0) continue; // longhand de un atajo con var(): se ve abajo
            const val = rxReescribirColor(val0, prop, rxPropRol(prop), false);
            if (val !== val0) { st.setProperty(prop, val, st.getPropertyPriority(prop)); cambio = true; }
        }
        for (let k = 0; k < RX_ATAJOS_COLOR.length; k++) {
            const atajo = RX_ATAJOS_COLOR[k];
            const v0 = st.getPropertyValue(atajo);
            if (!v0 || v0.indexOf('var(') < 0) continue;
            const v = rxReescribirColor(v0, atajo, rxPropRol(atajo), false);
            if (v !== v0) { st.setProperty(atajo, v, st.getPropertyPriority(atajo)); cambio = true; }
        }
        return cambio;
    }
    // Remapea el estilo inline del nodo y de sus descendientes con [style].
    function rxRemapearInlineArbol(root) {
        if (!root || root.nodeType !== 1 || rxEsRondo(root)) return false;
        let cambio = rxRemapearInline(root);
        let els;
        try { els = root.querySelectorAll('[style]'); } catch (_) { return cambio; }
        for (let i = 0; i < els.length; i++) { if (rxRemapearInline(els[i])) cambio = true; }
        return cambio;
    }
    function rxRemapearVentanas() {
        let cambiado = false;
        try {
            const roots = document.querySelectorAll(RX_VENTANA_SEL);
            for (let i = 0; i < roots.length; i++) { if (rxRemapearInlineArbol(roots[i])) cambiado = true; }
            // Red de seguridad: cualquier otro nodo con color/fondo inline que ya
            // exista (un contenedor de dialogo con otro id/clase). Con tope para
            // no recorrer paginas enormes; los nodos NUEVOS los cubre el observador.
            const sueltos = document.querySelectorAll('[style*="background"],[style*="color"]');
            const tope = Math.min(sueltos.length, 1500);
            for (let i = 0; i < tope; i++) { if (rxRemapearInline(sueltos[i])) cambiado = true; }
        } catch (_) { /* noop */ }
        return cambiado;
    }
    function rxAplicarColoresPagina() {
        if (!(APP.config && APP.config.estiloPagina)) { rxDesactivarColores(); return; }
        const acc = (APP.config.temaPlataforma && rxPlatAcento()) ? rxPlatAcento() : (APP.config.acento || '#850D22');
        const acc2 = aclarar(acc, 0.28);
        const accD = oscurecer(acc, 0.14);
        const claro = APP.config.theme === 'claro' ||
            (APP.config.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
        const P = rxPaginaPaleta(claro);
        // Se procesan TODAS las hojas cargadas; rxProcesarHoja ignora las ya
        // vistas, asi que esto es barato y no deja ninguna sin reescribir (la
        // plataforma carga el CSS de las ventanas de unidad en diferido).
        let bloqueadas = 0, procesadas = 0;
        try {
            const hojas = document.styleSheets;
            for (let i = 0; i < hojas.length; i++) {
                const h = hojas[i];
                const owner = h.ownerNode;
                if (owner && owner.id && owner.id.indexOf('rondo') === 0) continue;
                try { if (h.cssRules) { if (rxProcesarHoja(h, P, acc, acc2, accD)) procesadas++; } else bloqueadas++; }
                catch (_) { bloqueadas++; }
            }
        } catch (_) { /* noop */ }
        if (APP.unlocked && !rxAplicarColoresPagina._avisado && procesadas === 0 && bloqueadas > 0) {
            rxAplicarColoresPagina._avisado = true;
            try { console.warn('[Rondo] ' + bloqueadas + ' hojas CSS no accesibles (cross-origin); el remap no puede leerlas.'); } catch (_) { /* noop */ }
        }
        rxRemapearVentanas();
        rxPintarTokens(P, acc, accD);
        rxPintarVariablesPlataforma(P, acc, accD);
        rxReescribirLiterales(P);
        rxMantenerAlFinal();
        rxObservar();
    }
    // Vigila hojas NUEVAS. Un <link rel=stylesheet> recien insertado tiene
    // .sheet = null hasta que termina de cargar: si no se espera su evento
    // 'load', su CSS (p. ej. el de la ventana de unidad) se perderia.
    function rxObservar() {
        if (_rxObs || !window.MutationObserver) return;
        _rxObs = new MutationObserver((muts) => {
            let hayNueva = false;
            for (let i = 0; i < muts.length; i++) {
                const nodos = muts[i].addedNodes;
                for (let j = 0; j < nodos.length; j++) {
                    const n = nodos[j];
                    if (!n || n.nodeType !== 1) continue;
                    if (n.id && n.id.indexOf('rondo') === 0) continue;
                    if (n.tagName === 'STYLE') hayNueva = true;
                    else if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel || '')) { hayNueva = true; rxEsperarHoja(n); }
                }
            }
            if (hayNueva) { rxMantenerAlFinal(); rxProgramarColoresPagina(); }
        });
        const head = document.head || document.documentElement;
        try { _rxObs.observe(head, { childList: true }); } catch (_) { _rxObs = null; }
        // Segundo observador: las ventanas/tarjetas de unidad se inyectan en el
        // body en diferido y traen colores INLINE (sensores). Se remapean al
        // aparecer (y solo entonces, para no recorrer el DOM en cada cambio).
        if (!_rxObsBody) {
            _rxObsBody = new MutationObserver((muts) => {
                let hayInline = false;
                for (let i = 0; i < muts.length; i++) {
                    const nodos = muts[i].addedNodes;
                    for (let j = 0; j < nodos.length; j++) {
                        const n = nodos[j];
                        if (!n || n.nodeType !== 1 || rxEsRondo(n)) continue;
                        let esVentana = false, dentro = false, conEstilo = false;
                        try {
                            esVentana = !!(n.matches && n.matches(RX_VENTANA_SEL));
                            dentro = !!(n.closest && n.closest(RX_VENTANA_SEL));
                            conEstilo = !!(n.matches && n.matches('[style]'));
                        } catch (_) { esVentana = dentro = conEstilo = false; }
                        if ((esVentana || dentro) && rxRemapearInlineArbol(n)) hayInline = true;
                        else if (conEstilo && rxRemapearInline(n)) hayInline = true;
                    }
                }
                if (hayInline) rxProgramarColoresPagina();
            });
            const body = document.body || document.documentElement;
            try { _rxObsBody.observe(body, { childList: true, subtree: true }); } catch (_) { _rxObsBody = null; }
        }
        // Las reglas insertadas con insertRule no disparan ningun observador:
        // se vigila el recuento y se reprocesa solo si cambia.
        if (!_rxPoll) {
            _rxUltimoN = rxContarReglas();
            _rxPoll = setInterval(() => {
                if (document.hidden) return;
                const n = rxContarReglas();
                if (n !== _rxUltimoN) { _rxUltimoN = n; rxProgramarColoresPagina(); }
            }, 1500);
        }
    }
    // Un <link rel=stylesheet> tiene .sheet = null hasta que carga. Se vuelve a
    // disparar el barrido cuando termina, para no perder su CSS.
    function rxEsperarHoja(link) {
        if (link.sheet) return;
        try { link.addEventListener('load', () => { try { rxProgramarColoresPagina(); } catch (_) { /* noop */ } }, { once: true }); } catch (_) { /* noop */ }
    }
    // Logo "RONDO" en tipografia Ndot (matriz de puntos). Se dibuja como SVG
    // embebido para no depender de fuentes externas ni CDN: la plataforma lo
    // usa como background-image (--logo-background) y el panel como SVG inline
    // con currentColor. Mapa 5x7 por glifo (solo las letras de RONDO).
    const RX_NDOT = {
        R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
    };
    function rondoLogoSVG(color) {
        const txt = 'RONDO';
        const filas = 7, paso = 10, radio = 4.4;
        let col = 0;
        let circles = '';
        for (let i = 0; i < txt.length; i++) {
            const g = RX_NDOT[txt[i]] || RX_NDOT[' '];
            for (let r = 0; r < filas; r++) {
                const row = g[r] || '';
                for (let c = 0; c < row.length; c++) {
                    if (row[c] === '1') {
                        circles += '<circle cx="' + ((col + c) * paso + paso / 2) +
                            '" cy="' + (r * paso + paso / 2) + '" r="' + radio + '"/>';
                    }
                }
            }
            col += 6; // 5 columnas + 1 de separacion
        }
        const w = (col - 1) * paso, h = filas * paso;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
            '" width="' + w + '" height="' + h + '" role="img" aria-label="RONDO" fill="' +
            (color || 'currentColor') + '">' + circles + '</svg>';
    }
    function rondoLogoURI(color) {
        return 'url("data:image/svg+xml,' + encodeURIComponent(rondoLogoSVG(color)) + '")';
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
            if (rgb) {
                document.documentElement.style.setProperty('--rondo-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
                // Texto legible sobre el acento: si el acento es CLARO, el
                // texto sobre el va oscuro; si es oscuro, blanco. Asi los
                // iconos/numeros sobre pestañas, tiles y botones siempre se ven.
                const lumA = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
                document.documentElement.style.setProperty('--rondo-accent-fg', lumA < 0.55 ? '#ffffff' : '#10151f');
            }
        }
        const p = byId('rondo-panel');
        if (p) p.classList.toggle('density-compact', c.density === 'compact');
        // Escala de interfaz: un solo factor multiplica textos y controles.
        document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(c.escalaUI)));
        // v6.0.14: aplica/quita el reestilizado de la pagina de la plataforma.
        try { rxAplicarEstiloPagina(); } catch (_) { /* noop */ }
        // v6.19.5: aplica/quita la capa de rendimiento CSS.
        try { rxAplicarRendimientoPagina(); } catch (_) { /* noop */ }
        // v6.19.3: remap de los colores literales de la plataforma (una vez;
        // despues solo se repintan las variables al cambiar de tema).
        try { rxProgramarColoresPagina(); } catch (_) { /* noop */ }
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
