import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { isSignedIn, user, isLoaded } = useUser();
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (isSignedIn && user) {
      // Create a mock token for development
      const mockToken = `mock_session_token_${btoa(user.primaryEmailAddress?.emailAddress || user.id)}_${Date.now()}`;
      setToken(mockToken);
      
      // Set default axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    } else {
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [isSignedIn, user]);

  const value = {
    isSignedIn,
    user,
    isLoaded,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};