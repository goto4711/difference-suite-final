import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@difference-suite/shared/components/shared/MainLayout';
import { Header as SharedHeader } from '@difference-suite/shared/components/shared/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { AuthGuard } from '@difference-suite/shared/components/auth/AuthGuard';
import { TOOLS, MAIN_MENU_EXTRAS } from './utils/navigation';
import Sidebar from './components/shared/Sidebar';
import { ModelStatusWidget } from './components/shared/ModelStatusWidget';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import { EMBEDDING_MODEL_VERSION } from './core/inference/modelRegistry';
import ContestHeaderButton from './components/contestation/ContestHeaderButton';

const HeaderComponent = () => (
    <SharedHeader StatusWidget={ModelStatusWidget} LeftWidget={ContestHeaderButton} />
);

function App() {
  const setEmbeddingModelVersion = useSuiteStore(s => s.setEmbeddingModelVersion);
  useEffect(() => { setEmbeddingModelVersion(EMBEDDING_MODEL_VERSION); }, [setEmbeddingModelVersion]);

  return (
    <Router>
      <MainLayout HeaderComponent={HeaderComponent} SidebarComponent={Sidebar}>
        <AuthGuard>
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center text-center text-xl font-bold text-main">
                Loading tool...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {MAIN_MENU_EXTRAS.map((entry) => {
                const EntryComponent = entry.component;
                return (
                  <Route
                    key={entry.path}
                    path={entry.path}
                    element={<EntryComponent />}
                  />
                );
              })}
              {TOOLS.map((tool) => {
                const ToolComponent = tool.component;

                return (
                  <Route
                    key={tool.path}
                    path={tool.path}
                    element={<ToolComponent />}
                  />
                );
              })}
              <Route path="*" element={<div className="p-8 text-center text-xl">Tool Coming Soon...</div>} />
            </Routes>
          </Suspense>
        </AuthGuard>
      </MainLayout>
    </Router>
  );
}

export default App;
