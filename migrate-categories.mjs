import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCategories() {
    console.log("Starting Firebase Category Migration...");
    const albumsRef = collection(db, 'albums');
    const snapshot = await getDocs(albumsRef);

    const batch = writeBatch(db);
    let updateCount = 0;

    snapshot.forEach((document) => {
        const data = document.data();
        let newCategory = null;

        if (data.category === 'event') {
            newCategory = 'live';
        } else if (data.category === 'food') {
            newCategory = 'event';
        }

        if (newCategory) {
            console.log(`Updating doc ${document.id}: ${data.category} -> ${newCategory}`);
            const docRef = doc(db, 'albums', document.id);
            batch.update(docRef, { category: newCategory });
            updateCount++;
        }
    });

    if (updateCount > 0) {
        console.log(`Committing ${updateCount} updates...`);
        await batch.commit();
        console.log("Migration completed successfully.");
    } else {
        console.log("No documents required migration.");
    }

    process.exit(0);
}

migrateCategories().catch((e) => {
    console.error(e);
    process.exit(1);
});
