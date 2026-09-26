    /* ======================== DOM HELPERS ======================== */
    function byId(id) { return document.getElementById(id); }
    function makeEl(tag, props, styles, children) {
        const n = document.createElement(tag);
        if (props) Object.assign(n, props);
        if (styles) Object.assign(n.style, styles);
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

