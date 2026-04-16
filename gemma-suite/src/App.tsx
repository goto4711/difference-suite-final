import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/shared/MainLayout';
import { AuthGuard } from './components/auth/AuthGuard';
import { Dashboard } from './components/dashboard/Dashboard'; // we will mock dashboard for now
import SemanticOraclePro from './components/tools/SemanticOraclePro/SemanticOraclePro';
import SDShowcase from './components/tools/SDShowcase/SDShowcase';
import VisualStorytellerPro from './components/tools/VisualStorytellerPro/VisualStorytellerPro';
import ImaginationInspectorPro from './components/tools/ImaginationInspectorPro/ImaginationInspectorPro';

function App() {
  return (
    <Router>
      <MainLayout>
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
