    /* ======================== DOM HELPERS ======================== */
    function byId(id) { return document.getElementById(id); }
    function makeEl(tag, props, styles, children) {
        const n = document.createElement(tag);
        if (props) Object.assign(n, props);
        if (styles) Object.assign(n.style, styles);
        if (children && children.length) {
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                if (c == null) continue;
                if (typeof c === 'string') n.appendChild(document.createTextNode(c));
                else n.appendChild(c);
            }
        }
        return n;
    }

