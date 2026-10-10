import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StudentRegistrationForm } from './components/StudentRegistrationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';

const AppContent: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'register' | 'admin'>('register');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const handleSelectTab = (tab: 'register' | 'admin') => {
    if (tab === 'admin' && !isAdmin) {
      setIsAdminModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-red-950">
      <Header
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />

      <main className="flex-1 py-4">
        {activeTab === 'register' ? (
          <StudentRegistrationForm />
        ) : isAdmin ? (
          <AdminDashboard />
        ) : (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl shadow-lg border border-amber-300 text-center">
            <h2 className="text-xl font-bold text-red-950 mb-2">የአስተዳዳሪ መግቢያ ያስፈልጋል</h2>
            <p className="text-sm text-slate-600 mb-6">
              ወደ ዳሽቦርድ ለመግባት እባክዎን የአስተዳዳሪ አካውንትዎን ተጠቅመው ይግቡ።
            </p>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-red-950 font-bold text-sm shadow transition-all"
            >
              ይግቡ
            </button>
          </div>
        )}
      </main>

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setIsAdminModalOpen(false);
          setActiveTab('admin');
        }}
      />

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
