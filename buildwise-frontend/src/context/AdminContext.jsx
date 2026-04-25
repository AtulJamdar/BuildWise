/**
 * Admin Context
 * Manages admin authentication state globally
 * 
 * This provides admin info and auth methods to all admin components
 * without prop drilling.
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { verifyAdminToken } from '../services/adminApi';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize admin from localStorage
   */
  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const adminData = localStorage.getItem('admin_data');

        if (token && adminData) {
          // Verify token is still valid
          const isValid = await verifyAdminToken();
          if (isValid) {
            setAdmin(JSON.parse(adminData));
          } else {
            // Token expired or invalid
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_data');
          }
        }
      } catch (err) {
        console.error('Error initializing admin:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAdmin();
  }, []);

  /**
   * Login admin
   */
  const login = useCallback((adminData, token) => {
    try {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_data', JSON.stringify(adminData));
      setAdmin(adminData);
      setError(null);
    } catch (err) {
      setError('Failed to store admin data');
    }
  }, []);

  /**
   * Logout admin
   */
  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
  }, []);

  /**
   * Check if admin is authenticated
   */
  const isAuthenticated = !!admin;

  const value = {
    admin,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
