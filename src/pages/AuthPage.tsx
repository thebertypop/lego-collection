import React, { useState } from 'react';
import { Blocks } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Compte créé ! Vérifiez votre boîte e-mail pour confirmer votre inscription.',
        });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Un lien de réinitialisation a été envoyé à votre adresse e-mail.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Une erreur est survenue.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-[#FE5000] text-white flex items-center justify-center shadow-md">
            <Blocks className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            My LEGO Collection
          </h1>
          <p className="text-xs text-zinc-500">
            Gérez vos sets possédés, votre liste de souhaits et vos dépenses en toute simplicité.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border ${
              message.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Adresse e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Chargement...'
              : mode === 'login'
              ? 'Se connecter'
              : mode === 'signup'
              ? 'Créer mon compte'
              : 'Envoyer le lien'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => setMode('signup')} className="hover:text-[#FE5000] font-semibold">
                Pas encore de compte ? S'inscrire
              </button>
              <button type="button" onClick={() => setMode('reset')} className="hover:underline">
                Mot de passe oublié ?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="hover:text-[#FE5000] font-semibold">
              Déjà inscrit ? Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};