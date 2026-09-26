    /* ======================== DOM HELPERS ======================== */
    function byId(id) { return document.getElementById(id); }
    // v6.0.5: evita que el gestor de contraseñas / autofill del navegador
    // intente rellenar o guardar los campos de Rondo. Se marcan los inputs
    // (autocomplete off + atributos de los gestores mas comunes). Para los
    // campos tipo password se usa "new-password" (los navegadores ignoran
    // "off" en passwords).
    function rxMarcarInputAutofill(el) {
        if (!el || el.nodeType !== 1) return;
        const tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
        if (el.dataset && el.dataset.rxAf === '1') return;
        try { el.dataset.rxAf = '1'; } catch (_) { /* noop */ }
        const pass = String(el.type || '').toLowerCase() === 'password';
        el.setAttribute('autocomplete', pass ? 'new-password' : 'off');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('data-lpignore', 'true');        // LastPass
        el.setAttribute('data-1p-ignore', 'true');       // 1Password
        el.setAttribute('data-bwignore', 'true');        // Bitwarden
        el.setAttribute('data-form-type', 'other');      // Dashlane
        el.setAttribute('data-protonpass-ignore', 'true');
        el.setAttribute('data-dashlane-ignore', 'true');
    }
    // Marca todos los inputs de la UI de Rondo dentro de un contenedor.
    function rxBarridoAutofill(raiz) {
        try {
            const base = (raiz && raiz.querySelectorAll) ? raiz : document;
            const nodos = base.querySelectorAll('input, textarea');
            for (let i = 0; i < nodos.length; i++) {
                if (esUIPropia(nodos[i])) rxMarcarInputAutofill(nodos[i]);
            }
        } catch (_) { /* noop */ }
    }
    // Red de seguridad: al interactuar con un campo de Rondo, marcarlo antes
    // de que el gestor de contraseñas decida rellenarlo o guardarlo.
    document.addEventListener('pointerdown', (e) => { if (esUIPropia(e.target)) rxMarcarInputAutofill(e.target); }, true);
    document.addEventListener('focusin', (e) => { if (esUIPropia(e.target)) rxMarcarInputAutofill(e.target); }, true);
    document.addEventListener('keydown', (e) => { if (esUIPropia(e.target)) rxMarcarInputAutofill(e.target); }, true);
    function makeEl(tag, props, styles, children) {
        const n = document.createElement(tag);
        if (props) Object.assign(n, props);
        if (styles) Object.assign(n.style, styles);
        if (tag === 'input' || tag === 'textarea') rxMarcarInputAutofill(n);
        // Acepta un array de hijos o uno solo, y descarta null/undefined/false.
        // Convertir numeros a texto evita que appendChild reciba algo que no
        // es un Node (lo que lanzaba antes de crear el elemento).
        const lista = (children == null) ? []
            : (Array.isArray(children) ? children : [children]);
        for (let i = 0; i < lista.length; i++) {
            const c = lista[i];
            if (c == null || c === false) continue;
            if (typeof c === 'string' || typeof c === 'number') n.appendChild(document.createTextNode(String(c)));
            else n.appendChild(c);
        }
        return n;
    }

