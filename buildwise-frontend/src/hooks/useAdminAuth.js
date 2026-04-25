/**
 * useAdminAuth Hook
 * Handles admin authentication logic
 */

import { useContext } from 'react';
import { AdminContext } from '../context/AdminContext';

export const useAdminAuth = () => {
  const context = useContext(AdminContext);
  
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminProvider');
  }

  return context;
};
