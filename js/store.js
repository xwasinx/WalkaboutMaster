// store.js
class Store {
    constructor() {
        const savedDB = localStorage.getItem('wmg_srs_v5') || localStorage.getItem('wmg_srs_v4') || localStorage.getItem('wmg_srs_v3');
        this.db = savedDB ? JSON.parse(savedDB) : { active: [], graduated: [], customCourses: [] };
        if (!this.db.customCourses) this.db.customCourses = [];
        this.history = []; 
        this.listeners = [];
        
        // SM-2 Migration (converting old format to Anki format)
        let migrated = false;
        this.db.active.forEach(item => {
            if (item.ef === undefined) {
                migrated = true;
                item.ef = 2.5;
                item.interval = window.DAYS_INTERVAL[item.level] || 0;
                item.reps = item.aciertos || 0;
                if (!item.note) item.note = "";
            }
        });

        // Migrate graduated to active so they follow SM-2 properly (true Anki behavior)
        if (this.db.graduated && this.db.graduated.length > 0) {
            migrated = true;
            this.db.graduated.forEach(item => {
                item.ef = 2.5;
                item.interval = 30; // standard starting interval for graduated
                item.reps = 4;
                item.level = 'Graduado';
                item.due = window.getDueDate(30);
                if (!item.note) item.note = "";
                this.db.active.push(item);
            });
            this.db.graduated = [];
        }

        if (migrated || !localStorage.getItem('wmg_srs_v5')) {
            this.save();
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(l => l(this.db));
    }

    save() {
        localStorage.setItem('wmg_srs_v5', JSON.stringify(this.db));
        this.notify();
        window.dispatchEvent(new CustomEvent('wmg-db-updated', { detail: this.db }));
    }

    setDB(newDB) {
        if (JSON.stringify(this.db) !== JSON.stringify(newDB)) {
            this.db = newDB;
            if (!this.db.customCourses) this.db.customCourses = [];
            
            // Re-run migration just in case the imported DB is older
            this.db.active.forEach(item => {
                if (item.ef === undefined) {
                    item.ef = 2.5;
                    item.interval = window.DAYS_INTERVAL[item.level] || 0;
                    item.reps = item.aciertos || 0;
                    if (!item.note) item.note = "";
                }
            });
            if (this.db.graduated && this.db.graduated.length > 0) {
                this.db.graduated.forEach(item => {
                    item.ef = 2.5;
                    item.interval = 30;
                    item.reps = 4;
                    item.level = 'Graduado';
                    item.due = window.getDueDate(30);
                    if (!item.note) item.note = "";
                    this.db.active.push(item);
                });
                this.db.graduated = [];
            }
            
            this.save();
        }
    }

    _pushHistory(actionType, previousState) {
        this.history.push({ type: actionType, state: JSON.parse(JSON.stringify(previousState)) });
        if (this.history.length > 10) this.history.shift();
        window.dispatchEvent(new CustomEvent('wmg-history-updated'));
    }

    undo() {
        if (this.history.length === 0) return false;
        const lastAction = this.history.pop();
        this.db = lastAction.state;
        this.save();
        window.dispatchEvent(new CustomEvent('wmg-history-updated'));
        return true;
    }

    canUndo() {
        return this.history.length > 0;
    }

    addHoles(courseName, holes, diff) {
        this._pushHistory('add', this.db);
        
        let count = 0;
        holes.forEach(num => {
            const label = `${courseName} H${num} [${diff}]`;
            const existingActive = this.db.active.find(i => i.label === label);
            
            if(existingActive) {
                existingActive.level = 'A';
                existingActive.interval = 0;
                existingActive.due = window.getDueDate(0);
            } else {
                this.db.active.push({ 
                    id: Date.now() + Math.random(), 
                    course: courseName, 
                    hole: num, 
                    diff, 
                    label, 
                    level: 'A',
                    interval: 0,
                    ef: 2.5,
                    reps: 0,
                    due: window.getDueDate(0), 
                    aciertos: 0, // legacy
                    note: "" 
                });
            }
            count++;
        });
        this.save();
        return count;
    }

    updateNote(id, note) {
        const item = this.db.active.find(i => i.id === id);
        if (item) {
            item.note = note;
            this.save(); 
        }
    }

    handleGrade(id, grade) {
        this._pushHistory('action', this.db);
        const idx = this.db.active.findIndex(i => i.id === id);
        if(idx === -1) return;
        
        const item = this.db.active[idx];
        const res = window.getIntervalForGrade(grade, item.interval, item.ef, item.reps);
        
        item.interval = res.interval;
        item.ef = res.ef;
        item.reps = res.reps;
        item.level = window.getLevelForInterval(res.interval);
        item.due = window.getDueDate(res.interval);
        item.aciertos = item.reps; // keep legacy sync
        
        this.save();
    }

    deleteHole(id) {
        this._pushHistory('delete', this.db);
        this.db.active = this.db.active.filter(i => i.id !== id);
        this.save();
    }
    
    addCustomCourse(name) {
        if (!this.db.customCourses.includes(name)) {
            this.db.customCourses.push(name);
            this.save();
        }
    }

    renameCustomCourse(idx, newName) {
        const oldName = this.db.customCourses[idx];
        if (!newName || newName === oldName) return;
        
        this.db.customCourses[idx] = newName;
        
        this.db.active.forEach(item => {
            if (item.course === oldName) {
                item.course = newName;
                item.label = item.label.replace(oldName, newName);
            }
        });
        
        this.save();
    }

    removeCustomCourse(idx) {
        this.db.customCourses.splice(idx, 1);
        this.save();
    }
}

window.store = new Store();
