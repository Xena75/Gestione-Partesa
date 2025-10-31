'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: number;
  username: string;
  role: string;
}

const UserSwitcher: React.FC = () => {
  const { user, switchUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/create-user');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  const handleUserSwitch = async (selectedUser: User) => {
    setLoading(true);
    try {
      await switchUser(selectedUser.id);
      setIsOpen(false);
    } catch (error) {
      console.error('Errore nel cambio utente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="position-relative">
      <button
        className="btn btn-outline-primary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <i className="fas fa-user-switch me-2"></i>
        Cambia Utente
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} ms-2`}></i>
      </button>

      {isOpen && (
        <>
          {/* Overlay per chiudere il dropdown */}
          <div 
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div 
            className="position-absolute bg-body border border-secondary rounded shadow-lg"
            style={{
              top: '100%',
              left: '0',
              minWidth: '250px',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 9999
            }}
          >
            <div className="p-2">
              <div className="text-muted small mb-2">Seleziona utente:</div>
              {users.map((u) => (
                <button
                  key={u.id}
                  className={`btn btn-link text-start w-100 p-2 border-0 ${
                    u.id === user?.id ? 'bg-primary text-white' : 'text-body'
                  }`}
                  onClick={() => handleUserSwitch(u)}
                  disabled={loading || u.id === user?.id}
                  style={{
                    backgroundColor: u.id === user?.id ? undefined : 'transparent'
                  }}
                >
                  <div>
                    <div className="fw-bold">{u.username}</div>
                    <div className="small opacity-75">{u.role}</div>
                  </div>
                  {u.id === user?.id && (
                    <i className="fas fa-check float-end mt-1"></i>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserSwitcher;