import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './pages/Homepage';
import Index from './pages/Index';
import About from './pages/About'; // Correct relative path
import Help from './pages/Help';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/Index" element={<Index />} />
        <Route path="/About" element={<About/>}/>
        <Route path="Help" element={<Help/>}/>
      </Routes>
    </Router>
  );
};

export default App;
