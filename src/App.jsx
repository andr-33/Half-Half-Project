import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginView from './features/auth/LoginView';
import Layout from './components/Layout';

import CategoryListView from './features/categories/CategoryListView';
import ShoppingListView from './features/list/ShoppingListView';

function MainApp() {
  const { session, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('list');

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'list' ? (
        <ShoppingListView onGoToCategories={() => setActiveTab('catalog')} />
      ) : (
        <CategoryListView />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
