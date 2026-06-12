import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@difference-suite/shared/components/shared/MainLayout';
import { Header as SharedHeader } from '@difference-suite/shared/components/shared/Header';
import { AuthGuard } from '@difference-suite/shared/components/auth/AuthGuard';
import { Dashboard } from './components/dashboard/Dashboard'; // we will mock dashboard for now
import SemanticOraclePro from './components/tools/SemanticOraclePro/SemanticOraclePro';
import SDShowcase from './components/tools/SDShowcase/SDShowcase';
import VisualStorytellerPro from './components/tools/VisualStorytellerPro/VisualStorytellerPro';
import ImaginationInspectorPro from './components/tools/ImaginationInspectorPro/ImaginationInspectorPro';
import Sidebar from './components/shared/Sidebar';
import { ModelStatusWidget } from './components/shared/ModelStatusWidget';

const HeaderComponent = () => <SharedHeader StatusWidget={ModelStatusWidget} />;

function App() {
  return (
    <Router>
      <MainLayout HeaderComponent={HeaderComponent} SidebarComponent={Sidebar}>
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/semantic-oracle-pro" element={<SemanticOraclePro />} />
            <Route path="/imagination-inspector-pro" element={<ImaginationInspectorPro />} />
            <Route path="/visual-storyteller-pro" element={<VisualStorytellerPro />} />
            <Route path="/sd-showcase" element={<SDShowcase />} />
            <Route path="*" element={<div className="p-8 text-center text-xl">Tool Coming Soon... (Next Suite)</div>} />
          </Routes>
        </AuthGuard>
      </MainLayout>
    </Router>
  );
}

export default App;
