// firebase-setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification
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
            
            // Verification Notice
            const verifyNotice = document.getElementById('email-verification-notice');
            if (user && !user.emailVerified) {
                if (verifyNotice) verifyNotice.classList.remove('hidden');
            } else {
                if (verifyNotice) verifyNotice.classList.add('hidden');
            }

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
        if(loggedOut) loggedOut.classList.add('hidden');
        if(loggedIn) loggedIn.classList.remove('hidden');
        if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;
        if(document.getElementById('userUidDisplay')) document.getElementById('userUidDisplay').innerText = user.uid;
        if(document.getElementById('userInitial')) document.getElementById('userInitial').innerText = user.email.charAt(0).toUpperCase();
        
        // Hide overlay
        if(authOverlay) authOverlay.classList.add('opacity-0', 'pointer-events-none');
        if(authModal) authModal.classList.add('scale-95');
    } else {
        if(loggedOut) loggedOut.classList.remove('hidden');
        if(loggedIn) loggedIn.classList.add('hidden');
        
        // Show overlay
        if(authOverlay) authOverlay.classList.remove('opacity-0', 'pointer-events-none');
        if(authModal) {
            authModal.classList.remove('scale-95');
            authModal.classList.add('scale-100');
        }
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

window.cloudAuth = {
    register: async (email, pass) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await sendEmailVerification(userCredential.user);
            window.ui.showToast(window.ui.t('verifyEmailSent'));
        } catch (e) {
            window.ui.showToast(e.message, true);
        }
    },
    login: async (email, pass) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.ui.showToast(window.ui.t('loggedIn'));
        } catch (e) {
            window.ui.showToast(e.message, true);
        }
    },
    logout: async () => {
        try {
            await signOut(auth);
            window.ui.showToast(window.ui.t('loggedOut'));
        } catch (e) {
            window.ui.showToast("Error", true);
        }
    },
    resetPassword: async (email) => {
        if (!email) return window.ui.showToast(window.ui.t('fillFields'), true);
        try {
            await sendPasswordResetEmail(auth, email);
            window.ui.showToast(window.ui.t('resetPassSent'));
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

    if (authSecondary) {
        authSecondary.addEventListener('click', () => {
            isOverlayRegister = !isOverlayRegister;
            if (isOverlayRegister) {
                authPrimary.innerText = window.ui.t('registerHoles').split(' ')[0]; // Approx
                authSecondary.innerText = window.ui.t('haveAccount');
                authConfirm.classList.remove('hidden');
            } else {
                authPrimary.innerText = window.ui.t('login');
                authSecondary.innerText = window.ui.t('noAccount');
                authConfirm.classList.add('hidden');
            }
        });
    }

    if (authPrimary) {
        authPrimary.addEventListener('click', () => {
            const email = document.querySelectorAll('#authEmail')[1] ? document.querySelectorAll('#authEmail')[1].value.trim() : document.getElementById('authEmail').value.trim();
            const pass = document.querySelectorAll('#authPass')[1] ? document.querySelectorAll('#authPass')[1].value : document.getElementById('authPass').value;
            if (!email || !pass) return window.ui.showToast(window.ui.t('fillFields'), true);

            if (isOverlayRegister) {
                const confirmPass = document.getElementById('authPassConfirm').value;
                if (pass !== confirmPass) return window.ui.showToast(window.ui.t('passMismatch'), true);
                window.cloudAuth.register(email, pass);
            } else {
                window.cloudAuth.login(email, pass);
            }
        });
    }

    const resetBtn = document.getElementById('authResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const email = document.getElementById('authEmail').value.trim();
            window.cloudAuth.resetPassword(email);
        });
    }

    initFirebase();
});
