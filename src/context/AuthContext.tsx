import React, { createContext, useContext, useState, useEffect } from 'react';
import { Perfil, Papel } from '../types';
import { db } from '../lib/db';
import { SEED_PERFIS } from '../data/seed';

interface AuthContextType {
  currentUser: Perfil | null;
  perfis: Perfil[];
  login: (email: string, senha?: string) => Promise<boolean>;
  logout: () => void;
  switchProfile: (perfilId: string) => Promise<void>;
  canAccessStudent: (studentId: string, studentQuartoId?: string | null) => boolean;
  canViewSensitiveNotes: () => boolean;
  canManageSettings: () => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Perfil | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>(SEED_PERFIS);

  useEffect(() => {
    const loadPerfis = async () => {
      const all = await db.perfis.toArray();
      if (all.length > 0) {
        setPerfis(all);
      }
      const savedId = localStorage.getItem('iceves_current_user_id');
      if (savedId) {
        const found = all.find((p) => p.id === savedId) || SEED_PERFIS.find((p) => p.id === savedId);
        if (found) setCurrentUser(found);
      } else {
        // Padrão inicial: Monitor 1 (para testar imediatamente a rotina de monitor)
        const defaultUser = all.find((p) => p.papel === 'monitor') || SEED_PERFIS[2];
        setCurrentUser(defaultUser);
        localStorage.setItem('iceves_current_user_id', defaultUser.id);
      }
    };
    loadPerfis();
  }, []);

  const login = async (email: string, _senha?: string): Promise<boolean> => {
    const all = await db.perfis.toArray();
    const found = all.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('iceves_current_user_id', found.id);
      return true;
    }
    return false;
  };

  const switchProfile = async (perfilId: string) => {
    const all = await db.perfis.toArray();
    const found = all.find((p) => p.id === perfilId) || SEED_PERFIS.find((p) => p.id === perfilId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('iceves_current_user_id', found.id);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iceves_current_user_id');
  };

  // RLS: Verificação de acesso a dados do aluno
  const canAccessStudent = (studentId: string, studentQuartoId?: string | null): boolean => {
    if (!currentUser) return false;
    if (currentUser.papel === 'direcao' || currentUser.papel === 'preceptor') return true;
    if (currentUser.papel === 'aluno') {
      return currentUser.aluno_id === studentId;
    }
    if (currentUser.papel === 'monitor') {
      // Monitor só acessa alunos de seu quarto/dormitório
      if (!currentUser.quarto_id) return true;
      return currentUser.quarto_id === studentQuartoId;
    }
    return false;
  };

  // RLS: Observações sensíveis sociais/pastorais são restritas a Preceptor e Direção
  const canViewSensitiveNotes = (): boolean => {
    if (!currentUser) return false;
    return currentUser.papel === 'direcao' || currentUser.papel === 'preceptor';
  };

  // Configurações globais e catálogos: escrita/edição para Direção
  const canManageSettings = (): boolean => {
    if (!currentUser) return false;
    return currentUser.papel === 'direcao';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        perfis,
        login,
        logout,
        switchProfile,
        canAccessStudent,
        canViewSensitiveNotes,
        canManageSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
