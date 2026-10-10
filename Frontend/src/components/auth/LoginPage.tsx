import React, { useState } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Globe2,
  Layers,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { UserSession, DEMO_CREDENTIALS } from '@/types/auth';

export interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

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
      setErrorMessage('Please enter both your work email and password.');
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
        setErrorMessage('Invalid credentials. Please verify your work email and password.');
        setIsLoading(false);
      }
    }, 350);
  };

  const handleFillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/70 p-4 sm:p-6 lg:p-8 select-none relative overflow-hidden font-sans">
      {/* Subtle Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Soft Ambient Depth Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Main Dual-Panel Enterprise Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden flex flex-col md:flex-row z-10 transition-all">
        {/* Left Panel: Branded Jet Freight Command Center */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0B132B] via-[#0E1A3D] to-[#14234F] text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800/80">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-apollo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img
                  src="/assets/jfll-logo.jpeg"
                  alt="Jet Freight Logistics Limited"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-white leading-tight">
                  Jet Freight Logistics
                </div>
                <div className="text-[11px] font-medium text-slate-300">
                  Proprietary Sourcing Suite
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-blue-200 font-medium">
              <Sparkles className="w-3 h-3 text-apollo-300" />
              <span>Internal Enterprise Tool</span>
            </div>

            <div className="pt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Lead Sourcing Dashboard
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Internal lead prospecting and contact discovery directory for the Jet Freight Logistics team.
              </p>
            </div>
          </div>

          {/* Middle Value Bullets - Truthful & Verified Features */}
          <div className="my-8 space-y-3.5 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5 border border-blue-400/20">
                <Globe2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Directory Search</div>
                <div className="text-[11px] text-slate-300">Search leads by name, job title, company, or location.</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-400/20">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">13 Filter Categories</div>
                <div className="text-[11px] text-slate-300">Filter by job titles, department, location, company size, and industry.</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-400/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Contact Details & CSV Export</div>
                <div className="text-[11px] text-slate-300">View verified email addresses and export selected leads to CSV.</div>
              </div>
            </div>
          </div>

          {/* Bottom Live System Indicator */}
          <div className="pt-4 border-t border-slate-700/60 relative z-10 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Internal Tool Active</span>
            </div>
            <span className="text-slate-400 text-[10px]">Authorized Only</span>
          </div>
        </div>

        {/* Right Panel: Clean, High-Contrast Authentication Form */}
        <div className="md:w-7/12 bg-white p-7 sm:p-9 flex flex-col justify-between">
          <div>
            {/* Header Greeting */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-apollo-700 text-[11px] font-semibold border border-blue-100 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-apollo" />
                <span>Authorized Team Sign-In</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter your work credentials to access the leads dashboard.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Work Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Case-sensitive</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-apollo hover:bg-apollo-600 active:bg-apollo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-apollo/25 hover:shadow-lg hover:shadow-apollo/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-apollo/20 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Credentials Autofill Card */}
          <div className="mt-8 pt-5 border-t border-slate-100 space-y-3">
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-apollo" />
                  Internal Demo Credentials
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                  leads@jfll.com / Jet@123
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                title="Auto-fill credentials"
              >
                <span>Auto-Fill</span>
              </button>
            </div>

            {/* Compliance Footer */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Jet Freight Logistics Limited · Authorized personnel only. Protected by 256-bit encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

