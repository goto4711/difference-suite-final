import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/shared/MainLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import DeepVectorMirror from './components/tools/DeepVectorMirror/DeepVectorMirror';
import AmbiguityAmplifier from './components/tools/AmbiguityAmplifier/AmbiguityAmplifier';
import GlitchDetector from './components/tools/GlitchDetector/GlitchDetector';
import LatentSpaceNavigator from './components/tools/LatentSpaceNavigator/LatentSpaceNavigator';
import DepthMirror from './components/tools/DepthMirror/DepthMirror';
import { AuthGuard } from './components/auth/AuthGuard';
// Temporarily commented out - need dependency fixes
import ContextWeaver from './components/tools/ContextWeaver/ContextWeaver';
import NetworkedNarratives from './components/tools/NetworkedNarratives/NetworkedNarratives';
// Temporarily commented out - need dependency fixes
import DetailExtractor from './components/tools/DetailExtractor/DetailExtractor';
import DiscontinuityDetector from './components/tools/DiscontinuityDetector/DiscontinuityDetector';
import NoisePredictor from './components/tools/NoisePredictor/NoisePredictor';
import ThresholdAdjuster from './components/tools/ThresholdAdjuster/ThresholdAdjuster';
import ImaginationInspector from './components/tools/ImaginationInspector/ImaginationInspector';
import SemanticOracle from './components/tools/SemanticOracle/SemanticOracle';
import VisualStoryteller from './components/tools/VisualStoryteller/VisualStoryteller';
import DeepTime from './components/tools/DeepTime/DeepTime';

function App() {
  return (
    <Router>
      <MainLayout>
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deep-vector-mirror" element={<DeepVectorMirror />} />
            <Route path="/ambiguity-amplifier" element={<AmbiguityAmplifier />} />
            <Route path="/glitch-detector" element={<GlitchDetector />} />
            <Route path="/latent-navigator" element={<LatentSpaceNavigator />} />
            <Route path="/depth-mirror" element={<DepthMirror />} />
            <Route path="/context-weaver" element={<ContextWeaver />} />
            <Route path="/networked-narratives" element={<NetworkedNarratives />} />
            <Route path="/detail-extractor" element={<DetailExtractor />} />
            <Route path="/discontinuity-detector" element={<DiscontinuityDetector />} />
            <Route path="/threshold-adjuster" element={<ThresholdAdjuster />} />
            <Route path="/noise-predictor" element={<NoisePredictor />} />
            <Route path="/imagination-inspector" element={<ImaginationInspector />} />
            <Route path="/semantic-oracle" element={<SemanticOracle />} />
            <Route path="/visual-storyteller" element={<VisualStoryteller />} />
            <Route path="/deep-time" element={<DeepTime />} />
            <Route path="*" element={<div className="p-8 text-center text-xl">Tool Coming Soon...</div>} />
          </Routes>
        </AuthGuard>
      </MainLayout>
    </Router>
  );
}

export default App;
