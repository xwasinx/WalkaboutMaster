// firebase-setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBAHb1ld5bKrvxqe8ppDKBJXp-XLTJ0tw",
  authDomain: "walkaboutmaster-a02eb.firebaseapp.com",
  projectId: "walkaboutmaster-a02eb",
  storageBucket: "walkaboutmaster-a02eb.firebasestorage.app",
  messagingSenderId: "418244764847",
  appId: "1:418244764847:web:820fe3d1102dda8ee2e05a",
  measurementId: "G-QDZ906G05Q"
};

let currentUser = null;
let firestoreDb = null;
let auth = null;
let appId = 'walkabout-master-v5';
let activeSyncId = localStorage.getItem('wmg_active_sync_id');
let unsubscribeSync = null;

const tryInitFirebase = async () => {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app); 
        firestoreDb = getFirestore(app);
        
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            if (user) {
                // If we don't have a saved sync ID, use the current anonymous UID
                if (!activeSyncId) {
                    activeSyncId = user.uid;
                    localStorage.setItem('wmg_active_sync_id', activeSyncId);
                }
                document.getElementById('keyOutput').value = activeSyncId;
                initSync(activeSyncId);
            }
        });
        
        await signInAnonymously(auth);
    } catch (err) { 
        console.error("Firebase init error:", err); 
    }
};

function updateSyncUI(active) {
    const el = document.getElementById('sync-status');
    if(el) {
        if (active) {
            el.classList.add('text-green-500', 'sync-active');
            el.classList.remove('text-slate-400');
        } else {
            el.classList.remove('text-green-500', 'sync-active');
            el.classList.add('text-slate-400');
        }
    }
}

function initSync(userId) {
    if (unsubscribeSync) unsubscribeSync();
    
    const userDocRef = doc(firestoreDb, 'data', appId, 'users', userId);
    
    unsubscribeSync = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            // Deep comparison to avoid loops
            if (JSON.stringify(window.store.db) !== JSON.stringify(cloudData)) {
                window.store.setDB(cloudData);
                updateSyncUI(true);
            }
        } else {
            // If cloud is empty, upload local data
            pushToCloud();
        }
    }, (error) => {
        console.error("Sync error:", error);
        updateSyncUI(false);
    });
}

async function pushToCloud() {
    if (!currentUser || !firestoreDb || !activeSyncId) return;
    try { 
        const userDocRef = doc(firestoreDb, 'data', appId, 'users', activeSyncId);
        await setDoc(userDocRef, window.store.db); 
        updateSyncUI(true); 
    } catch (e) { 
        console.error("Push error:", e);
        updateSyncUI(false); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('wmg-db-updated', () => {
        pushToCloud();
    });

    document.getElementById('copyKeyBtn').addEventListener('click', () => {
        const k = document.getElementById('keyOutput').value; 
        if (!k) return window.ui.showToast("No hay llave generada", true);
        navigator.clipboard.writeText(k).then(() => {
            window.ui.showToast("Llave copiada");
        });
    });

    document.getElementById('connectKeyBtn').addEventListener('click', () => {
        const k = document.getElementById('syncIn').value.trim(); 
        if(k.length < 10) return window.ui.showToast("Llave inválida", true); 
        
        if (firestoreDb) {
            activeSyncId = k;
            localStorage.setItem('wmg_active_sync_id', k);
            document.getElementById('keyOutput').value = k;
            initSync(k); 
            window.ui.showToast("Sincronizando nueva llave..."); 
        } else {
            window.ui.showToast("Error de conexión", true);
        }
    });

    tryInitFirebase();
});
