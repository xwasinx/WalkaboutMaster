// app.js
document.addEventListener('DOMContentLoaded', () => {
    const store = window.store;
    const ui = window.ui;

    ui.initTheme();
    ui.initHoleGrid();
    
    // Subscribe UI to Store updates
    store.subscribe((db) => {
        ui.renderSession(db);
        ui.renderUpcoming(db);
        if (!document.getElementById('tab-stats').classList.contains('hidden')) {
            ui.renderStats();
        }
    });

    window.addEventListener('wmg-history-updated', () => {
        ui.updateUndoUI();
    });

    // Initial render
    store.notify();

    // Theme Toggle
    document.getElementById('themeToggleBtn').addEventListener('click', () => ui.toggleTheme());

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            ui.switchTab(e.target.dataset.target);
        });
    });

    // Undo
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (store.undo()) {
            ui.showToast("Acción deshecha");
        }
    });

    // Search and add
    const searchInput = document.getElementById('courseSearch');
    const searchResults = document.getElementById('courseResults');

    searchInput.addEventListener('focus', () => {
        searchResults.classList.remove('hidden');
        ui.filterCourses(searchInput.value);
    });

    searchInput.addEventListener('input', (e) => {
        ui.filterCourses(e.target.value);
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        searchInput.value = '';
        searchResults.classList.add('hidden');
        searchInput.focus();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#courseSelectorContainer')) {
            searchResults.classList.add('hidden');
        }
    });

    searchResults.addEventListener('click', (e) => {
        const target = e.target.closest('.dropdown-item');
        if (!target) return;

        const name = target.dataset.name;
        if (target.dataset.action === 'selectNewCourse') {
            store.addCustomCourse(name);
            ui.showToast("Campo guardado");
        }
        
        searchInput.value = name;
        searchResults.classList.add('hidden');
    });

    // Add Holes
    document.getElementById('addHolesBtn').addEventListener('click', () => {
        const courseName = searchInput.value.trim();
        const diff = document.getElementById('diffSelect').value;
        
        if (!courseName) return ui.showToast("Selecciona un campo", true);
        if (ui.selectedHoles.size === 0) return ui.showToast("Marca hoyos en la rejilla", true);
        
        const count = store.addHoles(courseName, Array.from(ui.selectedHoles), diff);
        ui.showToast(`${count} hoyos añadidos`);
        
        searchInput.value = '';
        searchResults.classList.add('hidden');
        ui.selectedHoles.clear();
        document.querySelectorAll('.hole-btn').forEach(b => b.classList.remove('selected'));
        ui.switchTab('tab-session');
    });

    // Session Actions Event Delegation
    document.getElementById('session-container').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const id = parseFloat(btn.dataset.id);
        
        if (action === 'delete') {
            if(confirm("¿Eliminar este hoyo?")) {
                store.deleteHole(id);
                ui.showToast("Hoyo eliminado");
            }
        } else if (action === 'grade') {
            const grade = parseInt(btn.dataset.grade);
            store.handleGrade(id, grade);
            const msg = ['Fallo. Repaso hoy.', 'Difícil.', '¡Bien!', '¡Fácil!'][grade];
            ui.showToast(msg, grade === 0);
        }
    });

    // Modal close
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        const overlay = document.getElementById('modalOverlay');
        const container = document.getElementById('modalContainer');
        
        overlay.classList.add('opacity-0');
        container.classList.add('scale-95');
        
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    });

    // Help Modal
    document.getElementById('helpBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = "Guía de Walkabout Master";
        document.getElementById('modalContent').innerHTML = `
            <div class="space-y-4 text-left">
                <p class="text-xs text-slate-500 dark:text-slate-400 italic mb-4">
                    Bienvenido a Walkabout Master. Esta app utiliza un algoritmo avanzado de <b>Repetición Espaciada (SM-2, como Anki)</b> para ayudarte a memorizar las rutas y estrategias de cada hoyo de forma óptima.
                </p>
                
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1">🧠 ¿Cómo funciona la evaluación?</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">Cada vez que repasas un hoyo, debes evaluar cuánto te ha costado recordarlo:</p>
                <ul class="text-xs space-y-2 ml-2">
                    <li><span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span> <b>Otra vez:</b> No me acordaba en absoluto. El hoyo vuelve al principio.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span> <b>Difícil:</b> Me acordé pero dudé bastante. Avanza muy poco.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> <b>Bien:</b> Lo recordé a la perfección. Es la respuesta normal.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span> <b>Fácil:</b> Es un hoyo facilísimo. Tardará mucho más tiempo en volver a aparecer.</li>
                </ul>

                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">🌈 Niveles y Colores</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">El color del hoyo depende del tiempo que falte para tu próximo repaso:</p>
                <div class="space-y-2 mt-2">
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-red-500 rounded-full inline-block"></span><span class="text-xs text-slate-700 dark:text-slate-300"><b>Nivel A (0 a 1 día):</b> Aprendizaje inminente.</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-orange-500 rounded-full inline-block"></span><span class="text-xs text-slate-700 dark:text-slate-300"><b>Nivel B (1 a 3 días):</b> Memorización a corto plazo.</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-yellow-500 rounded-full inline-block"></span><span class="text-xs text-slate-700 dark:text-slate-300"><b>Nivel C (4 a 10 días):</b> Memoria a medio plazo.</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-blue-500 rounded-full inline-block"></span><span class="text-xs text-slate-700 dark:text-slate-300"><b>Nivel D (11 a 21 días):</b> Asentamiento en memoria.</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-green-500 rounded-full inline-block"></span><span class="text-xs text-slate-700 dark:text-slate-300"><b>Graduado (+21 días):</b> Aprendido. Tardará semanas en volver a aparecer.</span></div>
                </div>

                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">☁️ Sincronización</h3>
                <ol class="text-xs space-y-1 list-decimal ml-4 text-slate-600 dark:text-slate-300">
                    <li>Se genera automáticamente una "Llave Sync" al final de los Ajustes.</li>
                    <li>Cópiala y envíatela al dispositivo donde quieras tener la app.</li>
                    <li>En el nuevo dispositivo, pega la llave en "Conectar a otra llave" y pulsa Unir.</li>
                </ol>
            </div>
        `;
        
        const overlay = document.getElementById('modalOverlay');
        const container = document.getElementById('modalContainer');
        
        overlay.classList.remove('hidden');
        // Pequeño timeout para permitir que el display:block se aplique antes de animar opacidad
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            container.classList.remove('scale-95');
        }, 10);
    });

    // Backup & Export
    document.getElementById('exportBackupBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(store.db)], {type:'application/json'}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = `walkabout_master_backup.json`; 
        a.click();
    });

    document.getElementById('importBackupBtn').addEventListener('click', () => {
        document.getElementById('importJsonInput').click();
    });

    document.getElementById('importJsonInput').addEventListener('change', (e) => {
        const f = e.target.files[0]; 
        if(!f) return; 
        const r = new FileReader(); 
        r.onload = (ev) => { 
            try { 
                const i = JSON.parse(ev.target.result); 
                store.setDB(i); 
                ui.showToast("Backup cargado exitosamente"); 
            } catch { 
                ui.showToast("Error en archivo", true); 
            } 
        }; 
        r.readAsText(f);
    });

    // Custom courses management
    const customList = document.getElementById('customCoursesList');
    if (customList) {
        customList.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const idx = parseInt(btn.dataset.idx);
            const oldName = store.db.customCourses[idx];
            
            if (action === 'editCourse') {
                const newName = prompt(`Renombrar "${oldName}" a:`, oldName);
                if (newName && newName !== oldName) {
                    store.renameCustomCourse(idx, newName);
                    ui.showToast("Campo renombrado");
                }
            } else if (action === 'deleteCourse') {
                if (confirm(`¿Eliminar "${oldName}" de las sugerencias?`)) {
                    store.removeCustomCourse(idx);
                    ui.showToast("Campo eliminado");
                }
            }
        });
    }

    // Cloud Account Events
    document.getElementById('loginBtn').addEventListener('click', () => {
        const email = document.getElementById('cloudEmail').value.trim();
        const pass = document.getElementById('cloudPass').value;
        if (email && pass) window.cloudAuth.login(email, pass);
    });

    document.getElementById('registerBtn').addEventListener('click', () => {
        const email = document.getElementById('cloudEmail').value.trim();
        const pass = document.getElementById('cloudPass').value;
        if (email && pass) {
            if (confirm("Se creará una cuenta y se subirán tus datos actuales a la nube. ¿Continuar?")) {
                window.cloudAuth.register(email, pass);
            }
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm("¿Cerrar sesión? Los cambios locales no se subirán hasta que vuelvas a entrar.")) {
            window.cloudAuth.logout();
        }
    });

    document.getElementById('resetPassBtn').addEventListener('click', () => {
        const email = document.getElementById('cloudEmail').value.trim();
        window.cloudAuth.resetPassword(email);
    });

    document.getElementById('exportTextBtn').addEventListener('click', () => {
        const db = store.db;
        const total = db.active.length;
        const graduatedCount = db.active.filter(i => i.level === 'Graduado').length;
        let text = `WALKABOUT MASTER - INFORME\n${new Date().toLocaleString()}\nHoyos Totales: ${total}\nAprendidos: ${graduatedCount}\n\n`;
        ['A', 'B', 'C', 'D', 'Graduado'].forEach(lvl => { 
            const group = db.active.filter(i => i.level === lvl); 
            text += `[Nivel ${lvl}]: ${group.length}\n` + group.map(i => ` - ${i.label}`).join('\n') + '\n'; 
        });
        const blob = new Blob([text], {type:'text/plain'}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = `informe.txt`; 
        a.click();
    });
});
