// app.js
document.addEventListener('DOMContentLoaded', () => {
    const store = window.store;
    const ui = window.ui;

    ui.initTheme();
    ui.setLanguage(ui.lang); // Initial translation
    ui.initHoleGrid();
    
    // Subscribe UI to Store updates
    store.subscribe((db) => {
        ui.renderSession(db);
        ui.renderUpcoming(db);
        if (document.getElementById('tab-stats') && !document.getElementById('tab-stats').classList.contains('hidden')) {
            ui.renderStats();
        }
    });

    window.addEventListener('wmg-history-updated', () => {
        ui.updateUndoUI();
    });

    // Initial render
    store.notify();

    // Language
    document.getElementById('lang-es').addEventListener('click', () => ui.setLanguage('es'));
    document.getElementById('lang-en').addEventListener('click', () => ui.setLanguage('en'));

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => ui.toggleTheme());

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('.tab-btn').dataset.target;
            ui.switchTab(target);
        });
    });

    // Undo
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (store.undo()) {
            ui.showToast(ui.lang === 'es' ? "Acción deshecha" : "Action undone");
        }
    });

    // Search and add
    const searchInput = document.getElementById('courseSearch');
    const searchResults = document.getElementById('courseResults');

    if (searchInput) {
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
            searchInput.value = target.dataset.name;
            searchResults.classList.add('hidden');
        });
    }

    // Difficulty Toggle
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => {
                b.classList.remove('bg-green-500', 'text-white', 'shadow-lg', 'shadow-green-500/20');
                b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
            });
            btn.classList.add('bg-green-500', 'text-white', 'shadow-lg', 'shadow-green-500/20');
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-500');
            document.getElementById('diffSelect').value = btn.dataset.diff;
        });
    });

    // Add Holes
    const addHolesBtn = document.getElementById('addHolesBtn');
    if (addHolesBtn) {
        addHolesBtn.addEventListener('click', () => {
            const courseName = searchInput.value.trim();
            const diff = document.getElementById('diffSelect').value;
            
            if (!courseName) return ui.showToast(ui.t('selectCourse'), true);
            if (ui.selectedHoles.size === 0) return ui.showToast(ui.lang === 'es' ? "Selecciona hoyos" : "Select holes", true);
            
            const count = store.addHoles(courseName, Array.from(ui.selectedHoles), diff);
            ui.showToast(`${count} ${ui.t('dueHoles')}`);
            
            searchInput.value = '';
            searchResults.classList.add('hidden');
            ui.selectedHoles.clear();
            document.querySelectorAll('.hole-btn').forEach(b => b.classList.remove('selected'));
            ui.switchTab('tab-session');
        });
    }

    // Session Actions Event Delegation
    const sessionContainer = document.getElementById('session-container');
    if (sessionContainer) {
        sessionContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const id = parseFloat(btn.dataset.id);
            
            if (action === 'delete') {
                if(confirm(ui.lang === 'es' ? "¿Eliminar este hoyo?" : "Delete this hole?")) {
                    store.deleteHole(id);
                    ui.showToast(ui.lang === 'es' ? "Hoyo eliminado" : "Hole deleted");
                }
            } else if (action === 'grade') {
                const grade = parseInt(btn.dataset.grade);
                store.handleGrade(id, grade);
                const msgs = {
                    es: ['Fallo. Repaso hoy.', 'Difícil.', '¡Bien!', '¡Fácil!'],
                    en: ['Again. Review today.', 'Hard.', 'Good!', 'Easy!']
                };
                ui.showToast(msgs[ui.lang][grade], grade === 0);
            }
        });
    }

    // Modal close
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        const overlay = document.getElementById('modalOverlay');
        const container = document.getElementById('modalContainer');
        overlay.classList.add('opacity-0');
        container.classList.add('scale-95');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300);
    });

    // Help Modal
    document.getElementById('helpBtn').addEventListener('click', () => {
        const isEs = ui.lang === 'es';
        document.getElementById('modalTitle').innerText = isEs ? "Guía de Walkabout Master" : "Walkabout Master Guide";
        
        const contentEs = `
            <div class="space-y-4 text-left">
                <p class="text-xs text-slate-500 dark:text-slate-400 italic mb-4">
                    Bienvenido a Walkabout Master. Esta app utiliza el algoritmo <b>SM-2 (Repetición Espaciada)</b> para memorizar las rutas de cada hoyo.
                </p>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1">🧠 ¿Cómo funciona?</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">Evalúa tu desempeño tras cada hoyo:</p>
                <ul class="text-xs space-y-2 ml-2">
                    <li><span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span> <b>Otra vez:</b> No me acordaba. Se repite hoy.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span> <b>Difícil:</b> Dudé mucho. Aparecerá pronto.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> <b>Bien:</b> Lo recordé bien. Intervalo normal.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span> <b>Fácil:</b> Dominado. Tardará mucho en volver.</li>
                </ul>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">🌈 Niveles</h3>
                <div class="space-y-2 mt-2 text-[11px]">
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-red-500 rounded-full inline-block"></span><span><b>Nivel A/B:</b> Aprendizaje temprano (1-3 días).</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-yellow-500 rounded-full inline-block"></span><span><b>Level C/D:</b> Medio plazo (4-21 días).</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-green-500 rounded-full inline-block"></span><span><b>Graduado:</b> Memorizado (+21 días).</span></div>
                </div>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">☁️ Sincronización</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">Crea una cuenta en <b>Ajustes</b> con tu email. Tus datos se guardarán en la nube automáticamente. Puedes entrar desde Quest, móvil o PC.</p>
            </div>
        `;

        const contentEn = `
            <div class="space-y-4 text-left">
                <p class="text-xs text-slate-500 dark:text-slate-400 italic mb-4">
                    Welcome to Walkabout Master. This app uses the <b>SM-2 algorithm (Spaced Repetition)</b> to help you memorize hole strategies.
                </p>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1">🧠 How it works</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">Rate your performance after each hole:</p>
                <ul class="text-xs space-y-2 ml-2">
                    <li><span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span> <b>Again:</b> I didn't remember. Review today.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span> <b>Hard:</b> I struggled. Will appear soon.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> <b>Good:</b> I remembered well. Normal interval.</li>
                    <li><span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span> <b>Easy:</b> Mastered. Will take a long time to return.</li>
                </ul>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">🌈 Levels</h3>
                <div class="space-y-2 mt-2 text-[11px]">
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-red-500 rounded-full inline-block"></span><span><b>Level A/B:</b> Early learning (1-3 days).</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-yellow-500 rounded-full inline-block"></span><span><b>Level C/D:</b> Medium term (4-21 days).</span></div>
                    <div class="flex gap-2 items-center"><span class="w-3 h-3 bg-green-500 rounded-full inline-block"></span><span><b>Graduated:</b> Memorized (+21 days).</span></div>
                </div>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white mt-6 border-b border-slate-200 dark:border-white/5 pb-1">☁️ Synchronization</h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">Create an account in <b>Settings</b> with your email. Your data will sync automatically to the cloud. You can log in from your Quest, mobile, or PC.</p>
            </div>
        `;

        document.getElementById('modalContent').innerHTML = isEs ? contentEs : contentEn;
        const overlay = document.getElementById('modalOverlay');
        const container = document.getElementById('modalContainer');
        overlay.classList.remove('hidden');
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
                ui.showToast(ui.lang === 'es' ? "Backup cargado" : "Backup loaded"); 
            } catch { 
                ui.showToast("Error", true); 
            } 
        }; 
        r.readAsText(f);
    });

    // Cloud Account Events
    let isRegisterMode = false;
    const toggleBtn = document.getElementById('toggleRegisterMode');
    const confirmInput = document.getElementById('cloudPassConfirm');
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            if (isRegisterMode) {
                confirmInput.classList.remove('hidden');
                registerBtn.classList.remove('hidden');
                loginBtn.classList.add('hidden');
                toggleBtn.innerText = ui.lang === 'es' ? "¿Ya tienes cuenta? Entra aquí" : "Already have an account? Log in";
            } else {
                confirmInput.classList.add('hidden');
                registerBtn.classList.add('hidden');
                loginBtn.classList.remove('hidden');
                toggleBtn.innerText = ui.lang === 'es' ? "¿No tienes cuenta? Regístrate aquí" : "Don't have an account? Register";
            }
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('cloudEmail').value.trim();
            const pass = document.getElementById('cloudPass').value;
            if (email && pass) window.cloudAuth.login(email, pass);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            const email = document.getElementById('cloudEmail').value.trim();
            const pass = document.getElementById('cloudPass').value;
            const confirmPass = confirmInput.value;
            if (!email || !pass) return window.ui.showToast(ui.t('fillFields'), true);
            if (pass !== confirmPass) return window.ui.showToast(ui.t('passMismatch'), true);
            if (confirm(ui.t('confirmRegister'))) {
                window.cloudAuth.register(email, pass);
            }
        });
    }

    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm(ui.t('confirmLogout'))) {
                window.cloudAuth.logout();
            }
        });
    }

    if (document.getElementById('resetPassBtn')) {
        document.getElementById('resetPassBtn').addEventListener('click', () => {
            const email = document.getElementById('cloudEmail').value.trim();
            window.cloudAuth.resetPassword(email);
        });
    }

    document.getElementById('exportTextBtn').addEventListener('click', () => {
        const db = store.db;
        const total = db.active.length;
        const graduatedCount = db.active.filter(i => i.level === 'Graduado').length;
        let text = `WALKABOUT MASTER - REPORT\n${new Date().toLocaleString()}\nTotal Holes: ${total}\nMastered: ${graduatedCount}\n\n`;
        ['A', 'B', 'C', 'D', 'Graduado'].forEach(lvl => { 
            const group = db.active.filter(i => i.level === lvl); 
            text += `[Level ${lvl}]: ${group.length}\n` + group.map(i => ` - ${i.label}`).join('\n') + '\n'; 
        });
        const blob = new Blob([text], {type:'text/plain'}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = `report.txt`; 
        a.click();
    });
});
