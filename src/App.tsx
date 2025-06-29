import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './Navigation';
import UnifiedEvaluator from './UnifiedEvaluator';
import { ApiProvider } from './ApiContext';

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/open-question-tester' : '';
  return (
    <BrowserRouter basename={basename}>
      <ApiProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<UnifiedEvaluator />} />
        </Routes>
      </ApiProvider>
    </BrowserRouter>
  );
}

export default App;
