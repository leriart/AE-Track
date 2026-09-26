    /* ====================== VERIFICACION ====================== */
    function captureSelection() {
        const list = openWindows();
        APP.seleccion = new Set(list.map((v) => v.eco).filter(Boolean));
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección capturada', APP.seleccion.size + ' ventana(s) / unidad(es)');
        paintInfo();
        if (APP.tab === 'unidades') paintTabla();
        return APP.seleccion.size;
    }
    function addToSelection(eco, placa) {
        if (eco) APP.seleccion.add(eco);
        else if (placa) APP.seleccion.add(placa);
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function removeFromSelection(eco, placa) {
        if (eco) APP.seleccion.delete(eco);
        else if (placa) APP.seleccion.delete(placa);
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function selectAllVisible() {
        const rows = document.querySelectorAll('#rondo-body .fila');
        let n = 0;
        rows.forEach((tr) => {
            const eco = tr.dataset.eco;
            if (!eco) return;
            if (!APP.seleccion.has(eco)) {
                APP.seleccion.add(eco);
                n++;
            }
        });
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección añadida', n + ' unidad(es) visible(s)');
        paintInfo();
        paintTabla();
        return n;
    }
    function clearSelection() {
        const n = APP.seleccion.size;
        APP.seleccion.clear();
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección vaciada', n + ' unidad(es) liberadas');
        paintInfo();
        paintTabla();
    }
    async function verifyWindows(silent) {
        if (APP.timerVerifBusy) return 0;
        if (!APP.seleccion.size) {
            if (!silent) advice('Sin seleccion', 'Ejecuta una lista o captura las ventanas abiertas');
            return 0;
        }
        APP.timerVerifBusy = true;
        try {
            let cerradas = 0;
            const list = openWindows();
            for (let i = 0; i < list.length; i++) {
                if (list[i].eco && APP.seleccion.has(list[i].eco)) continue;
                if (closeContainer(list[i].cont)) { cerradas++; await sleep(120); }
            }
            if (cerradas) {
                paintCounters();
                if (!silent) advice('Verificación', cerradas + ' ventana(s) ajena(s) cerrada(s)');
            } else if (!silent) {
                advice('Verificación', 'Solo estan abiertas las ventanas seleccionadas');
            }
            return cerradas;
        } finally {
            APP.timerVerifBusy = false;
        }
    }
    function restartVerificationLoop() {
        if (APP.timerVerif) clearInterval(APP.timerVerif);
        APP.timerVerif = null;
        if (APP.config.verificar) {
            APP.timerVerif = setInterval(() => { verifyWindows(true); }, Math.max(2, APP.config.verifSeg) * 1000);
        }
        paintVerifyButton();
    }
    function paintVerifyButton() {
        const b = byId('rondo-verif');
        if (!b) return;
        b.classList.toggle('activo', !!APP.config.verificar);
        b.title = APP.config.verificar
            ? 'Verificacion activa: solo se mantienen las ventanas seleccionadas'
            : 'Activar verificación de ventanas';
    }
    async function execList(ecos) {
        // Respeta el orden configurado (pegado, numero o arrastrado).
        sincronizarOrden();
        const ordenados = ordenarPorLista(ecos, (e) => e);
        APP.seleccion = new Set(ordenados.map((e) => normEco(e)).filter(Boolean));
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
        for (let i = 0; i < ordenados.length; i++) {
            const b = byId('rondo-btn-main');
            if (b) {
                b.innerHTML = '<span class="rondo-usym">' + UIS.gear + '</span> Buscando (' + (i + 1) + '/' + ordenados.length + ')...';
                b.style.background = 'linear-gradient(135deg,#f57c00,#ff9800)';
            }
            await openUnitWindow(ordenados[i]);
            await sleep(250);
        }
        const inp = findSearchInput();
        if (inp) clearInput(inp);
        const b = byId('rondo-btn-main');
        if (b) {
            b.innerHTML = '<span class="rondo-usym">' + UIS.panel + '</span> Organizando...';
            b.style.background = 'var(--rondo-accent-grad)';
        }
        await sleep(400);
        await organizeWindows();
        await verifyWindows(true);
        resetMainBtn();
    }
    function resetMainBtn() {
        mainBtn.innerHTML = '<span class="rondo-usym">' + UIS.gear + '</span> Automatizar Unidades';
        mainBtn.style.background = '';
    }

