import React from 'react';
import { LandingPage } from './components/LandingPage';

export const App: React.FC = () => {
  const handleLaunchInvestigation = () => {
    // Navigate directly to the main investigation workspace
    if (window.location.port === '5174') {
      window.location.href = 'http://localhost:5173/#app';
    } else {
      window.location.hash = 'app';
    }
  };

  return <LandingPage onLaunchInvestigation={handleLaunchInvestigation} />;
};

export default App;

