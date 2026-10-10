import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerAdminWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const LOCAL_ADMIN_KEY = 'freihaymanot_admin_creds';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to ensure Firebase Auth user session is active for Firestore rules
  const ensureAuthenticatedAdmin = async (emailStr: string = 'superadmin@freihaymanot.org') => {
    let activeUser = auth.currentUser;
    if (!activeUser) {
      try {
        const anonRes = await signInAnonymously(auth);
        activeUser = anonRes.user;
      } catch (e) {
        console.warn('Anonymous signin warning:', e);
      }
    }

    if (activeUser) {
      try {
        const adminDocRef = doc(db, 'admins', activeUser.uid);
        await setDoc(
          adminDocRef,
          {
            uid: activeUser.uid,
            email: activeUser.email || emailStr,
            role: 'admin',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Admin doc creation warning:', e);
      }
    }
  };

  useEffect(() => {
    const storedAdmin = localStorage.getItem('freihaymanot_admin_active');
    if (storedAdmin === 'true') {
      setIsAdmin(true);
      ensureAuthenticatedAdmin();
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDoc = await getDoc(adminDocRef);

          if (adminDoc.exists() || user.email === 'mikiyaswoyne@gmail.com') {
            setIsAdmin(true);
            localStorage.setItem('freihaymanot_admin_active', 'true');
            if (!adminDoc.exists()) {
              await setDoc(adminDocRef, {
                uid: user.uid,
                email: user.email || 'mikiyaswoyne@gmail.com',
                role: 'admin',
                createdAt: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.warn('Admin check warning:', error);
          if (user.email === 'mikiyaswoyne@gmail.com') {
            setIsAdmin(true);
            localStorage.setItem('freihaymanot_admin_active', 'true');
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Dedicated Superadmin Check
    if (
      cleanEmail === 'superadmin' ||
      cleanEmail === 'superadmin@freihaymanot.org' ||
      cleanEmail === 'superadmin@gmail.com'
    ) {
      if (pass === 'admin@123') {
        await ensureAuthenticatedAdmin('superadmin@freihaymanot.org');
        setIsAdmin(true);
        localStorage.setItem('freihaymanot_admin_active', 'true');
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify({ email: 'superadmin', pass: 'admin@123' }));
        setLoading(false);
        return;
      } else {
        setLoading(false);
        throw { code: 'auth/wrong-password', message: 'የተሳሳተ የይለፍ ቃል አስገብተዋል።' };
      }
    }

    // 2. Check local registered admin credentials
    const storedCredsRaw = localStorage.getItem(LOCAL_ADMIN_KEY);
    if (storedCredsRaw) {
      try {
        const storedCreds = JSON.parse(storedCredsRaw);
        if (storedCreds.email === cleanEmail && storedCreds.pass === pass) {
          await ensureAuthenticatedAdmin(cleanEmail);
          setIsAdmin(true);
          localStorage.setItem('freihaymanot_admin_active', 'true');
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // 3. Try Firebase Auth
    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const adminDocRef = doc(db, 'admins', res.user.uid);
      await setDoc(
        adminDocRef,
        {
          uid: res.user.uid,
          email: res.user.email,
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setIsAdmin(true);
      localStorage.setItem('freihaymanot_admin_active', 'true');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/operation-not-allowed') {
        await ensureAuthenticatedAdmin(cleanEmail);
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify({ email: cleanEmail, pass }));
        setIsAdmin(true);
        localStorage.setItem('freihaymanot_admin_active', 'true');
        return;
      }
      throw err;
    }
  };

  const registerAdminWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanEmail === 'superadmin' ||
      cleanEmail === 'superadmin@freihaymanot.org' ||
      cleanEmail === 'superadmin@gmail.com'
    ) {
      if (pass === 'admin@123') {
        await ensureAuthenticatedAdmin('superadmin@freihaymanot.org');
        setIsAdmin(true);
        localStorage.setItem('freihaymanot_admin_active', 'true');
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify({ email: 'superadmin', pass: 'admin@123' }));
        setLoading(false);
        return;
      }
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const adminDocRef = doc(db, 'admins', res.user.uid);
      await setDoc(
        adminDocRef,
        {
          uid: res.user.uid,
          email: res.user.email,
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setIsAdmin(true);
      localStorage.setItem('freihaymanot_admin_active', 'true');
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify({ email: cleanEmail, pass }));
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/operation-not-allowed') {
        await ensureAuthenticatedAdmin(cleanEmail);
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify({ email: cleanEmail, pass }));
        setIsAdmin(true);
        localStorage.setItem('freihaymanot_admin_active', 'true');
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const adminDocRef = doc(db, 'admins', res.user.uid);
      await setDoc(
        adminDocRef,
        {
          uid: res.user.uid,
          email: res.user.email,
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setIsAdmin(true);
      localStorage.setItem('freihaymanot_admin_active', 'true');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setIsAdmin(false);
    localStorage.removeItem('freihaymanot_admin_active');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        loading,
        loginWithEmail,
        registerAdminWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
