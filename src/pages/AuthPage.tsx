import React, { useEffect, useState } from 'react';
import { Moon, Sun, Mail, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const THEME_STORAGE_KEY = 'brickbybrick-theme';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        });
        if (error) throw error;
        setInfoMsg(
          'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse si nécessaire.'
        );
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        });
        if (error) throw error;
        setInfoMsg('E-mail de réinitialisation envoyé. Vérifiez vos courriers.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur d'authentification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Barre haute avec bouton clair/nuit */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}brickbybrick.svg`}
            alt="BRICKbyBRICK"
            className="h-9 w-auto object-contain"
          />
          <span className="font-extrabold text-base tracking-tight">BRICKbyBRICK</span>
        </div>

        <button
          type="button"
          onClick={() => setDarkMode((prev) => !prev)}
          title={darkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
          aria-label={darkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-[#FE5000] transition-colors"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Mode jour</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span>Mode nuit</span>
            </>
          )}
        </button>
      </div>

      {/* Carte de connexion */}
      <div className="max-w-md w-full mx-auto my-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <img
            src={`${import.meta.env.BASE_URL}brickbybrick.svg`}
            alt="BRICKbyBRICK"
            className="h-14 w-auto mx-auto object-contain"
          />
          <h1 className="text-2xl font-extrabold tracking-tight">BRICKbyBRICK</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {mode === 'login' && 'Connectez-vous pour accéder à votre collection LEGO'}
            {mode === 'signup' && 'Créez votre compte pour gérer vos sets et catégories'}
            {mode === 'forgot' && 'Recevez un lien pour réinitialiser votre mot de passe'}
          </p>
        </div>

        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'signup'
                  ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Inscription
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Adresse e-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            {loading
              ? 'Patientez...'
              : mode === 'login'
              ? 'Se connecter'
              : mode === 'signup'
              ? 'Créer mon compte'
              : 'Envoyer le lien'}
          </button>
        </form>

        <div className="text-center pt-1">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="text-xs font-semibold text-[#FE5000] hover:underline"
            >
              Retour à la connexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-[#FE5000]"
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-400">BRICKbyBRICK</p>
    </div>
  );
};