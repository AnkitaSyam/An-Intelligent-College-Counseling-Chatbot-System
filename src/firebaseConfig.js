import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4lVo2wiMmoP6DObFFeB_P1k_ha_gUI9A",
  authDomain: "college-counseling-a8355.firebaseapp.com",
  projectId: "college-counseling-a8355",
  storageBucket: "college-counseling-a8355.firebasestorage.app",
  messagingSenderId: "252821780210",
  appId: "1:252821780210:web:23848db63942f4d6f7026b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;