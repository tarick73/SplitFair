import React from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate to auth page even if logout fails
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          {user ? `Hello, ${user.username}!` : 'Hello!'}
        </h1>
        <p className="text-gray-600 mb-8">Welcome to SplitFair</p>
        
        <button 
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
        
        {/* Main app functionality will go here */}
      </div>
    </div>
  );
};

export default Dashboard;
