import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Импорт темы и стилей
import '../theme/ui5-theme.css';

// Импорт компонентов
import UI5Shell from './components/UI5Shell';

// Импорт страниц  
import Dashboard from './pages/Dashboard';
import AllItems from './pages/AllItems';
import Receiving from './pages/Receiving';
import Archive from './pages/Archive';
import Locations from './pages/Locations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const AppContent: React.FC = () => {
  return (
    <UI5Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/all-items" element={<AllItems />} />
        <Route path="/receiving" element={<Receiving />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </UI5Shell>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App; 

