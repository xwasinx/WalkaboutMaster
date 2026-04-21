// data.js
window.OFFICIAL_COURSES = [
    "8-bit Lair", "20,000 Leagues Under the Sea", "Alfheim", "Alice in Wonderland", 
    "Arizona Modern", "Around the World in 80 Days", "Atlantis", "Bogey's Bonanza", 
    "Cherry Blossom", "Crystal Lair", "El Dorado", "Forgotten Fairyland", 
    "Gardens of Babylon", "Wallace & Gromit", "Hollywood", "Ice Lair", 
    "Journey to the Center of the Earth", "Labyrinth", "Laser Lair", "Mars Garden", 
    "Meow Wolf", "Mount Olympus", "Myst", "Original Gothic", "Quixote Valley", 
    "Raptor Cliff's", "Seagull Stacks", "Shangri-La", "Sweetopia", "Temple at Zerzura", 
    "Tethys Station", "Tiki à Coco", "Tokyo", "Tourist Trap", "Upside Town", "Venice", 
    "Viva Las Elvis", "Holiday Hideaway", "Widow's Walkabout"
].sort();

window.DAYS_INTERVAL = { 'A': 0, 'B': 1, 'C': 3, 'D': 7 };

window.LEVEL_COLORS = {
    'A': { bg: 'bg-red-500', hex: '#ef4444', text: 'text-red-500' },
    'B': { bg: 'bg-orange-500', hex: '#f97316', text: 'text-orange-500' },
    'C': { bg: 'bg-yellow-500', hex: '#eab308', text: 'text-yellow-500' },
    'D': { bg: 'bg-blue-500', hex: '#3b82f6', text: 'text-blue-500' },
    'Graduado': { bg: 'bg-green-500', hex: '#22c55e', text: 'text-green-500' }
};

window.getStartOfToday = function() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

window.getEndOfToday = function() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

window.getDueDate = function(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.getTime();
}

window.getIntervalForGrade = function(grade, oldInterval, ef, reps) {
    let newInterval, newEf = ef, newReps = reps;

    if (grade === 0) { // Again (Fallo total)
        newInterval = 0;
        newReps = 0;
        newEf = Math.max(1.3, ef - 0.2);
    } else if (grade === 1) { // Hard (Difícil)
        newInterval = oldInterval === 0 ? 1 : Math.max(oldInterval + 1, Math.round(oldInterval * 1.2));
        newReps = reps > 0 ? reps : 1;
        newEf = Math.max(1.3, ef - 0.15);
    } else if (grade === 2) { // Good (Bien)
        if (reps === 0) newInterval = 1;
        else if (reps === 1) newInterval = 3;
        else newInterval = Math.round(oldInterval * ef);
        newReps = reps + 1;
    } else if (grade === 3) { // Easy (Fácil)
        if (reps === 0) newInterval = 4;
        else newInterval = Math.round(oldInterval * ef * 1.3);
        newReps = reps + 1;
        newEf = ef + 0.15;
    }

    return { interval: newInterval, ef: newEf, reps: newReps };
}

window.getLevelForInterval = function(interval) {
    if (interval <= 0) return 'A';
    if (interval <= 3) return 'B';
    if (interval <= 10) return 'C';
    if (interval <= 21) return 'D';
    return 'Graduado';
}
