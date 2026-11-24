import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import LoginView from './features/auth/LoginView';
import Layout from './components/Layout';

import CategoryListView from './features/categories/CategoryListView';
import ShoppingListView from './features/list/ShoppingListView';
import ProfileView from './features/profile/ProfileView';
import CreateProfileModal from './features/profile/CreateProfileModal';

function MainApp() {
  const { session, loading, member, loadingMember, reloadMember } = useAuth();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState('list');

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B1918] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  // F11: Si el usuario autenticado aún no tiene perfil de miembro, mostrar onboarding obligatorio (solo con conexión)
  const needsProfileSetup = !loadingMember && !member && isOnline;

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'list' && (
          <ShoppingListView onGoToCategories={() => setActiveTab('catalog')} />
        )}
        {activeTab === 'catalog' && (
          <CategoryListView />
        )}
        {activeTab === 'profile' && (
          <ProfileView />
        )}
      </Layout>

      {/* Modal obligatorio de creación de perfil en primer acceso */}
      <CreateProfileModal
        isOpen={needsProfileSetup}
        onProfileCreated={() => reloadMember()}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
