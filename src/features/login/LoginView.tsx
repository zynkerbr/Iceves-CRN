import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BlurText } from '../../components/ui/BlurText';
import { useToast } from '../../components/ui/Toast';
import { ShieldCheck, LogIn, KeyRound, Mail, ArrowRight } from 'lucide-react';

export function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const { login, perfis, switchProfile } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    if (!email) {
      setHasError(true);
      setErrorMessage('Por favor, informe seu e-mail institucional.');
      return;
    }

    const ok = await login(email, senha);
    if (ok) {
      showToast('Bem-vindo ao CRM ICEVES!');
      onLoggedIn();
    } else {
      setHasError(true);
      setErrorMessage('E-mail ou credenciais não localizadas no sistema.');
    }
  };

  const handleQuickLogin = async (perfilId: string) => {
    await switchProfile(perfilId);
    showToast('Acesso de demonstração ativado.');
    onLoggedIn();
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto">
      {/* Logo 96px com anel */}
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full border-2 border-[var(--pri)] p-1 shadow-md bg-white mb-3 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Logo do ICEVES"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <BlurText
          text="Escola de Cristo"
          as="h1"
          className="text-3xl font-extrabold tracking-tight text-[var(--ink)] justify-center text-center"
        />
        <p className="text-sm text-[var(--ink2)] mt-1.5 font-medium max-w-xs text-center">
          Disciplina, rotina e formação em um só lugar
        </p>
      </div>

      {/* Formulário de Login */}
      <div className="card w-full shadow-lg border border-[var(--line)] p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] mb-1.5 uppercase tracking-wider">
              E-mail do Internato
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setHasError(false);
                }}
                placeholder="monitor@iceves.edu.br"
                className={`f ${hasError ? 'err' : ''}`}
                autoComplete="email"
              />
              <Mail className="w-4 h-4 text-[var(--ink2)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink2)] mb-1.5 uppercase tracking-wider">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setHasError(false);
                }}
                placeholder="••••••••"
                className={`f ${hasError ? 'err' : ''}`}
                autoComplete="current-password"
              />
              <KeyRound className="w-4 h-4 text-[var(--ink2)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {hasError && (
            <div className="p-2.5 rounded-md bg-[var(--bad-soft)] text-[var(--bad)] text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn w-full font-bold mt-2 cursor-pointer">
            <LogIn className="w-4 h-4 mr-1" />
            Acessar Sistema
          </button>
        </form>

        {/* Perfis de Teste / Acesso Rápido */}
        <div className="mt-6 pt-5 border-t border-[var(--line)]">
          <p className="text-xs font-semibold text-[var(--ink2)] mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--ok)]" />
            Acesso Rápido por Perfil (Ambiente de Testes)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {perfis.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleQuickLogin(p.id)}
                className="btn sm ghost justify-between px-2.5 text-xs text-left hover:border-[var(--pri)] hover:bg-[var(--pri-soft)]"
              >
                <span className="truncate">{p.nome}</span>
                <span className="text-[10px] uppercase font-bold text-[var(--ink2)]">
                  {p.papel}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
