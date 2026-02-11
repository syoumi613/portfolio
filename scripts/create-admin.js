const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAdmin() {
    const code = "1111";
    const email = `admin_${code}@portfolio.local`;
    const password = `password-${code}`;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("SUCCESS: Admin created.");
        console.log("Email:", userCredential.user.email);
        console.log("Code:", code);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("SUCCESS: Admin already exists (1111).");
        } else {
            console.error("ERROR:", error.message);
            process.exit(1);
        }
    }
}

createAdmin();
