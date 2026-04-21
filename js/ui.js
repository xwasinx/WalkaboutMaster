// ui.js
class UI {
    constructor() {
        this.selectedHoles = new Set();
        this.chartInstance = null;
        this.lang = localStorage.getItem('wmg_lang') || 'es';
    }

    t(key) {
        return (window.translations[this.lang] && window.translations[this.lang][key]) || key;
    }

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('wmg_lang', lang);
        this.updateLanguageUI();
        this.translatePage();
        this.renderSession(window.store.db);
        this.renderUpcoming(window.store.db);
        if (document.getElementById('tab-stats') && !document.getElementById('tab-stats').classList.contains('hidden')) {
            this.renderStats();
        }
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerText = this.t(key);
        });
        
        // Update placeholders if needed
        const emailInp = document.getElementById('cloudEmail');
        if (emailInp) emailInp.placeholder = this.t('email') + '...';
        const passInp = document.getElementById('cloudPass');
        if (passInp) passInp.placeholder = this.t('pass') + '...';
    }

    updateLanguageUI() {
        const esBtn = document.getElementById('lang-es');
        const enBtn = document.getElementById('lang-en');
        if (!esBtn || !enBtn) return;

        if (this.lang === 'es') {
            esBtn.className = 'px-2 py-1 text-[9px] font-black rounded-lg transition-all bg-white dark:bg-slate-800 shadow-sm text-green-600 dark:text-green-400';
            enBtn.className = 'px-2 py-1 text-[9px] font-black rounded-lg transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
        } else {
            enBtn.className = 'px-2 py-1 text-[9px] font-black rounded-lg transition-all bg-white dark:bg-slate-800 shadow-sm text-green-600 dark:text-green-400';
            esBtn.className = 'px-2 py-1 text-[9px] font-black rounded-lg transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300';
        }
    }

    showToast(msg, error = false) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-enter px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-2xl bg-white dark:bg-slate-800 ${
            error ? 'text-red-500 border-red-500/20' : 'text-green-500 border-green-500/20'
        } text-center`;
        toast.innerText = msg;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-leave');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    switchTab(targetId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow', 'text-green-600', 'dark:text-green-400');
                btn.classList.remove('text-slate-500');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow', 'text-green-600', 'dark:text-green-400');
                btn.classList.add('text-slate-500');
            }
        });

        if (targetId === 'tab-stats') this.renderStats();
    }

    initHoleGrid() {
        const grid = document.getElementById('holeGrid');
        grid.innerHTML = '';
        for(let i=1; i<=18; i++) {
            const btn = document.createElement('button');
            btn.className = 'hole-btn bg-slate-100 dark:bg-slate-800 py-3 rounded-xl text-xs font-bold btn-press text-center text-slate-700 dark:text-slate-300';
            btn.innerText = i;
            btn.onclick = () => {
                if(this.selectedHoles.has(i)) { 
                    this.selectedHoles.delete(i); 
                    btn.classList.remove('selected'); 
                } else { 
                    this.selectedHoles.add(i); 
                    btn.classList.add('selected'); 
                }
            };
            grid.appendChild(btn);
        }
    }

    getCourseColor(courseName) {
        let hash = 0;
        for (let i = 0; i < courseName.length; i++) {
            hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 70%, 45%)`;
    }

    renderSession(db) {
        const endOfToday = window.getEndOfToday();
        const container = document.getElementById('session-container');
        const badge = document.getElementById('badge-due');
        
        const dueItems = db.active.filter(item => item.due <= endOfToday);
        dueItems.sort((a, b) => {
            const courseCompare = a.course.localeCompare(b.course);
            if (courseCompare !== 0) return courseCompare;
            return a.hole - b.hole;
        });

        badge.innerText = `${dueItems.length} ${this.t('dueHoles')}`;
        
        if (dueItems.length === 0) {
            container.innerHTML = `
                <div class="bg-white dark:bg-wm-card p-12 text-center rounded-[2rem] border-dashed border-2 border-slate-200 dark:border-white/5">
                    <p class="text-slate-400 font-bold text-sm uppercase tracking-widest">${this.t('sessionComplete')}</p>
                    <p class="text-xs text-slate-400 mt-2">${this.t('sessionSub')}</p>
                </div>`;
            return;
        }

        let html = '';
        dueItems.forEach(item => {
            const colors = window.LEVEL_COLORS[item.level];
            const courseColor = this.getCourseColor(item.course);
            const btnAgain = window.getIntervalForGrade(0, item.interval, item.ef, item.reps).interval;
            const btnHard = window.getIntervalForGrade(1, item.interval, item.ef, item.reps).interval;
            const btnGood = window.getIntervalForGrade(2, item.interval, item.ef, item.reps).interval;
            const btnEasy = window.getIntervalForGrade(3, item.interval, item.ef, item.reps).interval;
            const formatDays = (d) => d === 0 ? '<1d' : d + 'd';

            html += `
                <div class="item-enter bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden" id="item-${item.id}">
                    <div class="absolute left-0 top-0 bottom-0 w-1.5 ${colors.bg}"></div>
                    <div class="pl-2 flex flex-col gap-4">
                        <div class="flex items-center gap-4">
                            <div class="hole-badge flex-shrink-0" style="background: ${courseColor}; box-shadow: 0 8px 15px -4px ${courseColor}66;">
                                ${item.hole}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style="color: ${courseColor}">${item.course}</div>
                                <div class="text-sm font-black text-slate-800 dark:text-white truncate">${item.diff}</div>
                                <div class="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full ${colors.bg}"></span>
                                    ${this.t('level')} ${item.level}
                                </div>
                            </div>
                            <button data-action="delete" data-id="${item.id}" class="btn-press w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors shrink-0">
                                <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        <div class="flex gap-2 w-full justify-between mt-1">
                            <button data-action="grade" data-grade="0" data-id="${item.id}" class="btn-press flex-1 flex flex-col items-center py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white rounded-xl border border-red-200 dark:border-red-500/20 transition-all group">
                                <span class="text-[9px] font-black uppercase mb-1 pointer-events-none tracking-wider">${this.t('again')}</span>
                                <span class="text-[9px] font-medium opacity-70 pointer-events-none">${formatDays(btnAgain)}</span>
                            </button>
                            <button data-action="grade" data-grade="1" data-id="${item.id}" class="btn-press flex-1 flex flex-col items-center py-2 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white rounded-xl border border-orange-200 dark:border-orange-500/20 transition-all group">
                                <span class="text-[9px] font-black uppercase mb-1 pointer-events-none tracking-wider">${this.t('hard')}</span>
                                <span class="text-[9px] font-medium opacity-70 pointer-events-none">${formatDays(btnHard)}</span>
                            </button>
                            <button data-action="grade" data-grade="2" data-id="${item.id}" class="btn-press flex-1 flex flex-col items-center py-2 bg-green-50 dark:bg-green-500/10 hover:bg-green-500 text-green-600 dark:text-green-400 hover:text-white rounded-xl border border-green-200 dark:border-green-500/20 transition-all group">
                                <span class="text-[10px] font-black uppercase mb-1 pointer-events-none tracking-wider">${this.t('good')}</span>
                                <span class="text-[9px] font-medium opacity-70 pointer-events-none">${formatDays(btnGood)}</span>
                            </button>
                            <button data-action="grade" data-grade="3" data-id="${item.id}" class="btn-press flex-1 flex flex-col items-center py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-500 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl border border-blue-200 dark:border-blue-500/20 transition-all group">
                                <span class="text-[9px] font-black uppercase mb-1 pointer-events-none tracking-wider">${this.t('easy')}</span>
                                <span class="text-[9px] font-medium opacity-70 pointer-events-none">${formatDays(btnEasy)}</span>
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
    }

    renderUpcoming(db) {
        const endOfToday = window.getEndOfToday();
        const upcomingItems = db.active.filter(i => i.due > endOfToday).sort((a,b) => a.due - b.due);
        const container = document.getElementById('upcoming-container');
        
        if (upcomingItems.length === 0) {
            container.innerHTML = `<p class="text-slate-400 text-center py-10 italic">${this.t('nothingPending')}</p>`;
            return;
        }

        const groups = {}; 
        upcomingItems.forEach(i => { 
            const d = new Date(i.due).toLocaleDateString(); 
            if(!groups[d]) groups[d] = []; 
            groups[d].push(i); 
        });

        let html = '';
        Object.entries(groups).forEach(([date, items]) => {
            const daysAway = Math.ceil((new Date(items[0].due) - window.getStartOfToday()) / (24*60*60*1000));
            html += `
            <div class="mb-6">
                <h3 class="text-[10px] font-black text-slate-400 mb-3 tracking-widest uppercase flex justify-between">
                    <span>${this.lang === 'es' ? `En ${daysAway} días` : `In ${daysAway} days`}</span>
                    <span>${date}</span>
                </h3>
                <div class="space-y-2">
                    ${items.map(i => `
                        <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-sm">
                            <span class="font-bold text-xs text-slate-700 dark:text-slate-200">${i.course} H${i.hole}</span>
                            <span class="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-${window.LEVEL_COLORS[i.level].text.split('-')[1]}-500 font-bold uppercase text-[9px] whitespace-nowrap ml-2">${this.t('level')} ${i.level}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    renderStats() {
        const db = window.store.db;
        const total = db.active.length;
        const graduatedCount = db.active.filter(i => i.level === 'Graduado').length;
        const mastery = total > 0 ? Math.round((graduatedCount / total) * 100) : 0;
        
        const actEl = document.getElementById('stat-active');
        const masEl = document.getElementById('stat-mastery');
        if (actEl) actEl.innerText = db.active.length;
        if (masEl) masEl.innerText = `${mastery}%`;

        const canvas = document.getElementById('levelsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const levels = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'Graduado': 0 };
        db.active.forEach(i => levels[i.level]++);

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#cbd5e1' : '#475569';

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [`${this.t('level')} A`, `${this.t('level')} B`, `${this.t('level')} C`, `${this.t('level')} D`, 'Graduado'],
                datasets: [{
                    data: [levels['A'], levels['B'], levels['C'], levels['D'], levels['Graduado']],
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 10 } } }
                },
                cutout: '75%'
            }
        });
    }

    filterCourses(query) {
        const results = document.getElementById('courseResults');
        const allCourses = [...window.OFFICIAL_COURSES, ...window.store.db.customCourses].sort();
        const filtered = allCourses.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        
        let html = filtered.map(c => `
            <div class="p-4 dropdown-item cursor-pointer text-sm font-medium border-b border-slate-100 dark:border-white/5" data-action="selectCourse" data-name="${c.replace(/"/g, '&quot;')}">
                ${c}
            </div>`).join('');
        
        results.innerHTML = html;
        if(results.innerHTML === '') results.classList.add('hidden'); 
        else results.classList.remove('hidden');
    }

    updateUndoUI() {
        const container = document.getElementById('undo-container');
        if (!container) return;
        if (window.store.canUndo()) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        if (document.getElementById('tab-stats') && !document.getElementById('tab-stats').classList.contains('hidden')) {
            this.renderStats();
        }
    }

    initTheme() {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}

window.ui = new UI();
