import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
}

export interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

// Hardcoded internal credentials
export const DEMO_CREDENTIALS = {
  email: 'leads@jfll.com',
  password: 'Jet@123',
  name: 'Roberto Orci',
  role: 'Lead Sourcing Admin',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both work email and password.');
      return;
    }

    setIsLoading(true);

    // Simulate authentication check
    setTimeout(() => {
      if (
        email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase() &&
        password === DEMO_CREDENTIALS.password
      ) {
        const session: UserSession = {
          email: DEMO_CREDENTIALS.email,
          name: DEMO_CREDENTIALS.name,
          role: DEMO_CREDENTIALS.role,
          token: `session_${Date.now()}`,
        };
        sessionStorage.setItem('apollo_leads_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        setErrorMessage('Invalid credentials. Check your email and password.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-4 select-none relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-apollo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-8 z-10">
        {/* Top Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-700 shadow-xl flex items-center justify-center">
            <img
              src="/assets/jfll-logo.jpeg"
              alt="Jet Freight Logistics Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Jet Freight Logistics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Lead Sourcing & Prospecting Portal
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Work Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leads@jfll.com"
                required
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-apollo focus:ring-2 focus:ring-apollo/20 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-apollo focus:ring-2 focus:ring-apollo/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-apollo hover:bg-apollo-600 active:bg-apollo-700 text-white font-semibold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-apollo/40 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign in to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill Pill */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 flex flex-col items-center text-center space-y-2">
          <p className="text-[11px] text-slate-400">
            Internal Authorized Team Access
          </p>
          <button
            type="button"
            onClick={handleFillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs font-mono transition-colors border border-slate-600/50"
            title="Click to fill credentials"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-apollo-400" />
            <span>Use: leads@jfll.com / Jet@123</span>
          </button>
        </div>
      </div>

      {/* Footer Notice */}
      <footer className="mt-8 text-center text-xs text-slate-500 z-10">
        Jet Freight Internal Leads Tool • Authorized Personnel Only
      </footer>
    </div>
  );
};

export default LoginPage;
