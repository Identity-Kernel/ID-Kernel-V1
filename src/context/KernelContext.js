import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { kernel } from '../kernel';

const KernelContext = createContext(null);

export function KernelProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize kernel
  useEffect(() => {
    const initKernel = async () => {
      try {
        await kernel.init();
        const currentIdentity = await kernel.getCurrentIdentity();
        if (currentIdentity) {
          setIdentity(currentIdentity);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Kernel init failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initKernel();

    // Listen for kernel events
    const handlePulse = async () => {
      const updated = await kernel.getCurrentIdentity();
      if (updated) setIdentity(updated);
    };

    kernel.on('pulse:created', handlePulse);
    kernel.on('identity:logout', () => {
      setIdentity(null);
      setIsAuthenticated(false);
    });

    return () => {
      kernel.off('pulse:created', handlePulse);
    };
  }, []);

  // Create new identity
  const createIdentity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await kernel.createIdentity();
      setIdentity({
        did: result.did,
        karma: result.karma || 0,
        publicKey: result.publicKey,
        createdAt: result.createdAt,
      });
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recover identity from mnemonic
  const recoverIdentity = useCallback(async (mnemonic) => {
    setLoading(true);
    setError(null);
    try {
      const result = await kernel.recoverIdentity(mnemonic);
      setIdentity(result);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    kernel.logout();
    setIdentity(null);
    setIsAuthenticated(false);
  }, []);

  // Refresh identity data
  const refreshIdentity = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await kernel.getCurrentIdentity();
      setIdentity(data);
    } catch (err) {
      console.error('Failed to refresh identity:', err);
    }
  }, [isAuthenticated]);

  const value = {
    kernel,
    isAuthenticated,
    identity,
    loading,
    error,
    createIdentity,
    recoverIdentity,
    logout,
    refreshIdentity,
  };

  return (
    <KernelContext.Provider value={value}>
      {children}
    </KernelContext.Provider>
  );
}

export function useKernel() {
  const context = useContext(KernelContext);
  if (!context) {
    throw new Error('useKernel must be used within a KernelProvider');
  }
  return context;
}
