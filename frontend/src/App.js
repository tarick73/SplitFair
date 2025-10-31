// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard'; 

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Auth />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} 
        />
        <Route path="/" element={<Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}

export default App;