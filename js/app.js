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
            } else if (action === 'toggle-hint') {
                const hint = document.getElementById(`hint-container-${id}`);
                if (hint) hint.classList.toggle('hidden');
            } else if (action === 'edit-note') {
                const item = store.db.active.find(i => i.id === id);
                const oldNote = item ? item.note : "";
                const newNote = prompt(ui.t('editNote'), oldNote);
                if (newNote !== null) {
                    store.updateNote(id, newNote);
                    ui.showToast(ui.lang === 'es' ? "Nota guardada" : "Note saved");
                    ui.renderSession(store.db);
                }
            } else if (action === 'view-community') {
                const course = btn.dataset.course;
                const hole = parseInt(btn.dataset.hole);
                ui.openCommunityModal(course, hole, id);
            }
        });
    }

    // Community Actions
    const commContent = document.getElementById('communityContent');
    if (commContent) {
        commContent.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'rate-tip') {
                const rating = parseInt(btn.dataset.rating);
                await window.cloudAuth.rateCommunityNote(id, rating);
                // The rate method needs finishing in firebase-setup
            }
        });
    }

    document.getElementById('closeCommunityBtn').addEventListener('click', () => {
        const overlay = document.getElementById('communityOverlay');
        const container = document.getElementById('communityContainer');
        overlay.classList.add('opacity-0');
        container.classList.add('scale-95');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300);
    });

    // Advanced Settings
    const resetBtn = document.getElementById('resetDBBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm(ui.t('resetConfirm'))) {
                store.resetDB();
                ui.showToast(ui.lang === 'es' ? "Progreso reiniciado" : "Progress reset");
                ui.renderSession(store.db);
                ui.renderStats();
            }
        });
    }

    const notesToggle = document.getElementById('notesToggle');
    if (notesToggle) {
        notesToggle.checked = store.db.settings?.notesEnabled || false;
        notesToggle.addEventListener('change', (e) => {
            store.setNotesEnabled(e.target.checked);
            ui.renderSession(store.db);
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
        document.getElementById('modalTitle').innerText = isEs ? "Guía Maestra de Walkabout Master" : "Walkabout Master Master Guide";
        
        const contentEs = `
            <div class="space-y-6 text-left text-slate-600 dark:text-slate-300">
                <section>
                    <p class="text-xs italic mb-4">
                        Esta aplicación utiliza el algoritmo <b>SM-2 (Repetición Espaciada)</b>, la misma tecnología que Anki, para optimizar tu memoria y que nunca olvides una estrategia de golf.
                    </p>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>🧠</span> ¿Cómo evaluar tu repaso?
                    </h3>
                    <p class="text-[11px] mt-2 mb-3">La clave del éxito es la honestidad al puntuar cada hoyo:</p>
                    <ul class="space-y-3">
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Otra vez:</b>
                                <p class="text-[11px]">No recordaba la ruta o fallé el golpe clave. El hoyo volverá a aparecer hoy mismo hasta que lo aprendas.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-orange-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Difícil:</b>
                                <p class="text-[11px]">Recordé la ruta pero con mucho esfuerzo o tras dudar. Volverá a aparecer en 1-2 días.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Bien:</b>
                                <p class="text-[11px]">Respuesta correcta sin excesivo esfuerzo. Es el botón que usarás la mayoría de las veces.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Fácil:</b>
                                <p class="text-[11px]">Dominas este hoyo perfectamente. El intervalo de repaso crecerá rápidamente.</p>
                            </div>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>🎨</span> Código de Colores
                    </h3>
                    <div class="grid grid-cols-1 gap-2 mt-3 text-[10px]">
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span><b>Nivel A (Nuevo):</b> Repaso en menos de 24h.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                            <span><b>Nivel B (Aprendiendo):</b> Repaso en 1-3 días.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-yellow-500 rounded-full"></span>
                            <span><b>Nivel C/D (Asentando):</b> Repaso en 4-20 días.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span><b>Graduado:</b> Memorizado. Aparece cada +21 días.</span>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>☁️</span> Sincronización y Cuentas
                    </h3>
                    <p class="text-[11px] mt-2 leading-relaxed">
                        En la pestaña <b>Ajustes</b> puedes crear una cuenta con tu email. Esto permite que tus datos se guarden en la nube en tiempo real. 
                        <br><br>
                        Si usas las <b>Oculus Quest</b>, puedes abrir el navegador del visor, entrar en la web e iniciar sesión con el mismo email para tener todos tus hoyos listos mientras juegas.
                    </p>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>📊</span> Estadísticas
                    </h3>
                    <p class="text-[11px] mt-2">
                        Consulta tu progreso en la pestaña de <b>Estadística</b>. Allí verás el porcentaje de hoyos graduados y el calendario de próximos repasos para que sepas qué te toca jugar en los próximos días.
                    </p>
                </section>
            </div>
        `;

        const contentEn = `
            <div class="space-y-6 text-left text-slate-600 dark:text-slate-300">
                <section>
                    <p class="text-xs italic mb-4">
                        This app uses the <b>SM-2 algorithm (Spaced Repetition)</b>, the same technology behind Anki, to optimize your memory so you never forget a golf strategy.
                    </p>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>🧠</span> How to rate your review?
                    </h3>
                    <p class="text-[11px] mt-2 mb-3">The key to success is honesty when scoring each hole:</p>
                    <ul class="space-y-3">
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Again:</b>
                                <p class="text-[11px]">I didn't remember the route or missed the key shot. The hole will appear again today until you learn it.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-orange-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Hard:</b>
                                <p class="text-[11px]">I remembered the route but with significant effort. It will reappear in 1-2 days.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Good:</b>
                                <p class="text-[11px]">Correct answer without excessive effort. This is the button you will use most of the time.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span class="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0"></span>
                            <div>
                                <b class="text-xs text-slate-800 dark:text-white uppercase">Easy:</b>
                                <p class="text-[11px]">You master this hole perfectly. The review interval will grow rapidly.</p>
                            </div>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>🎨</span> Color Coding
                    </h3>
                    <div class="grid grid-cols-1 gap-2 mt-3 text-[10px]">
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span><b>Level A (New):</b> Review in less than 24h.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                            <span><b>Level B (Learning):</b> Review in 1-3 days.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-yellow-500 rounded-full"></span>
                            <span><b>Level C/D (Settling):</b> Review in 4-20 days.</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span><b>Graduated:</b> Memorized. Appears every +21 days.</span>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-1 flex items-center gap-2">
                        <span>☁️</span> Sync & Accounts
                    </h3>
                    <p class="text-[11px] mt-2 leading-relaxed">
                        In the <b>Settings</b> tab, you can create an account with your email. This allows your data to be saved to the cloud in real-time. 
                        <br><br>
                        If you use <b>Oculus Quest</b>, you can open the headset's browser, go to the website, and log in with the same email to have all your holes ready while you play.
                    </p>
                </section>
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
