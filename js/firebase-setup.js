// firebase-setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
let unsubscribeSync = null;

const initFirebase = async () => {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app); 
        firestoreDb = getFirestore(app);
        
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            updateAuthUI(user);
            if (user) {
                initSync(user.uid);
            } else {
                if (unsubscribeSync) unsubscribeSync();
                updateSyncUI(false);
            }
        });
    } catch (err) { 
        console.error("Firebase init error:", err); 
    }
};

function updateAuthUI(user) {
    const loggedOut = document.getElementById('cloud-logged-out');
    const loggedIn = document.getElementById('cloud-logged-in');
    const authOverlay = document.getElementById('auth-overlay');
    const authModal = document.getElementById('auth-modal');
    
    if (user) {
        loggedOut.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        document.getElementById('userEmailDisplay').innerText = user.email;
        document.getElementById('userUidDisplay').innerText = user.uid;
        document.getElementById('userInitial').innerText = user.email.charAt(0).toUpperCase();
        
        // Hide overlay
        authOverlay.classList.add('opacity-0', 'pointer-events-none');
        authModal.classList.add('scale-95');
    } else {
        loggedOut.classList.remove('hidden');
        loggedIn.classList.add('hidden');
        
        // Show overlay
        authOverlay.classList.remove('opacity-0', 'pointer-events-none');
        authModal.classList.remove('scale-95');
        authModal.classList.add('scale-100');
    }
}

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
            if (JSON.stringify(window.store.db) !== JSON.stringify(cloudData)) {
                window.store.setDB(cloudData);
                updateSyncUI(true);
            }
        } else {
            // New account or empty cloud, upload local data
            pushToCloud();
        }
    }, (error) => {
        console.error("Sync error:", error);
        updateSyncUI(false);
    });
}

async function pushToCloud() {
    if (!currentUser || !firestoreDb) return;
    try { 
        const userDocRef = doc(firestoreDb, 'data', appId, 'users', currentUser.uid);
        await setDoc(userDocRef, window.store.db); 
        updateSyncUI(true); 
    } catch (e) { 
        console.error("Push error:", e);
        updateSyncUI(false); 
    }
}

// Auth Actions
window.cloudAuth = {
    register: async (email, pass) => {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            window.ui.showToast("Cuenta creada y sincronizada");
        } catch (e) {
            window.ui.showToast(e.message, true);
        }
    },
    login: async (email, pass) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.ui.showToast("Sesión iniciada");
        } catch (e) {
            window.ui.showToast("Error al entrar: " + e.message, true);
        }
    },
    logout: async () => {
        try {
            await signOut(auth);
            window.ui.showToast("Sesión cerrada");
        } catch (e) {
            window.ui.showToast("Error al salir", true);
        }
    },
    resetPassword: async (email) => {
        if (!email) return window.ui.showToast("Escribe tu email primero", true);
        try {
            await sendPasswordResetEmail(auth, email);
            window.ui.showToast("Email de recuperación enviado");
        } catch (e) {
            window.ui.showToast(e.message, true);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('wmg-db-updated', () => {
        pushToCloud();
    });

    // Auth Overlay Logic
    let isOverlayRegister = false;
    const authPrimary = document.getElementById('authPrimaryBtn');
    const authSecondary = document.getElementById('authSecondaryBtn');
    const authConfirm = document.getElementById('authConfirmContainer');

    authSecondary.addEventListener('click', () => {
        isOverlayRegister = !isOverlayRegister;
        if (isOverlayRegister) {
            authPrimary.innerText = "Registrarse";
            authSecondary.innerText = "¿Ya tienes cuenta? Entra";
            authConfirm.classList.remove('hidden');
        } else {
            authPrimary.innerText = "Entrar";
            authSecondary.innerText = "¿No tienes cuenta? Regístrate";
            authConfirm.classList.add('hidden');
        }
    });

    authPrimary.addEventListener('click', () => {
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPass').value;
        if (!email || !pass) return window.ui.showToast("Rellena todos los campos", true);

        if (isOverlayRegister) {
            const confirmPass = document.getElementById('authPassConfirm').value;
            if (pass !== confirmPass) return window.ui.showToast("Las contraseñas no coinciden", true);
            window.cloudAuth.register(email, pass);
        } else {
            window.cloudAuth.login(email, pass);
        }
    });

    document.getElementById('authResetBtn').addEventListener('click', () => {
        const email = document.getElementById('authEmail').value.trim();
        window.cloudAuth.resetPassword(email);
    });

    initFirebase();
});
