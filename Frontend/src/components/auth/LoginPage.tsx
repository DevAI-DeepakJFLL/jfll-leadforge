import React, { useState } from 'react';
import {
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Globe2,
  Layers,
  CheckCircle2,
  Sparkles,
  Loader2,
  User,
  Send,
  ChevronLeft,
} from 'lucide-react';

import { UserSession } from '@/types/auth';
import { loginUser, setStoredSession } from '@/services/authService';
import { submitAccessRequest } from '@/services/adminService';

export interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'request'>('signin');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Access Request Form State
  const [reqEmail, setReqEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');

  const performLogin = async (targetEmail: string) => {
    const trimmed = targetEmail.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const session = await loginUser({ email: trimmed });
      setStoredSession(session);
      onLoginSuccess(session);
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error)?.message || 'Authentication failed. Please verify your work email.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email);
  };

  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = reqEmail.trim();
    const cleanReason = reqReason.trim();

    if (!cleanEmail) {
      setReqError('Please enter your work email address.');
      return;
    }
    if (cleanReason.length < 5) {
      setReqError('Please provide a reason of at least 5 characters explaining your requirement.');
      return;
    }

    setReqError('');
    setReqLoading(true);

    try {
      const res = await submitAccessRequest({
        email: cleanEmail,
        name: reqName.trim(),
        reason: cleanReason,
      });

      if (res.already_authorized) {
        setEmail(cleanEmail);
        setAuthMode('signin');
        setErrorMessage('');
      } else {
        setReqSuccessMsg(res.message);
      }
    } catch (err: unknown) {
      setReqError((err as Error)?.message || 'Failed to submit request. Please try again.');
    } finally {
      setReqLoading(false);
    }
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
        <div className="md:w-5/12 bg-gradient-to-br from-[#0B132B] via-[#0E1A3D] to-[#14234F] text-white p-5 sm:p-7 md:p-9 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800/80">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-apollo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10 space-y-3 sm:space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img
                  src="/assets/jfll-logo.jpeg"
                  alt="Jet Freight Logistics Limited"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  Jet Freight Logistics
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-300">
                  Proprietary Sourcing Suite
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-[11px] text-blue-200 font-medium">
              <Sparkles className="w-3 h-3 text-apollo-300" />
              <span>Internal Enterprise Tool</span>
            </div>

            <div className="pt-1">
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Lead Sourcing Dashboard
              </h2>
              <p className="text-xs text-slate-300 mt-1 sm:mt-2 leading-relaxed">
                Internal lead prospecting and contact discovery directory for the Jet Freight Logistics team.
              </p>
            </div>
          </div>

          {/* Middle Value Bullets - Hidden on small mobile to keep sign-in above the fold */}
          <div className="hidden md:block my-8 space-y-3.5 relative z-10">
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
          <div className="hidden md:flex pt-4 border-t border-slate-700/60 relative z-10 items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Passwordless Whitelist</span>
            </div>
            <span className="text-slate-400 text-[10px]">Authorized Personnel Only</span>
          </div>
        </div>

        {/* Right Panel: Dual-Mode Clean High-Contrast Auth Panel */}
        <div className="md:w-7/12 bg-white p-5 sm:p-7 md:p-9 flex flex-col justify-between">
          <div>
            {/* Top Mode Segmented Switcher */}
            <div className="flex items-center justify-between mb-5">
              <div
                role="tablist"
                aria-label="Authentication Mode"
                className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'signin'}
                  onClick={() => {
                    setAuthMode('signin');
                    setReqSuccessMsg('');
                    setReqError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-apollo" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'request'}
                  onClick={() => {
                    setAuthMode('request');
                    if (email && !reqEmail) setReqEmail(email);
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    authMode === 'request'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Request Access</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                JFLL Security Gate
              </div>
            </div>

            {authMode === 'signin' ? (
              <>
                {/* Header Greeting */}
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-apollo-700 text-[11px] font-semibold border border-blue-100 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-apollo" />
                    <span>Authorized Personnel Sign-In</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome back
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter your registered work email to access the leads dashboard.
                  </p>
                </div>

                {/* Error Banner with Quick Action to Request Access */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col gap-2 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="leading-tight font-medium">{errorMessage}</span>
                    </div>
                    {email && (
                      <button
                        type="button"
                        onClick={() => {
                          setReqEmail(email);
                          setAuthMode('request');
                          setErrorMessage('');
                        }}
                        className="text-left text-apollo hover:underline font-semibold text-[11px] pl-6 cursor-pointer"
                      >
                        Request access for {email} →
                      </button>
                    )}
                  </div>
                )}

                {/* Authentication Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="work-email-input" className="text-xs font-semibold text-slate-700 block">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="work-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="name@jfll.com"
                        required
                        autoComplete="email"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full mt-2 py-3 px-4 bg-apollo hover:bg-apollo-600 active:bg-apollo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-apollo/25 hover:shadow-lg hover:shadow-apollo/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-apollo/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin w-4 h-4 text-white" />
                        <span>Verifying Work Email...</span>
                      </div>
                    ) : (
                      <>
                        <span>Verify Work Email & Enter</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Secondary Request Access Prompt */}
                <div className="mt-4 text-center">
                  <span className="text-xs text-slate-500">Not on the allowlist yet? </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (email && !reqEmail) setReqEmail(email);
                      setAuthMode('request');
                      setErrorMessage('');
                    }}
                    className="text-xs font-semibold text-apollo hover:underline cursor-pointer"
                  >
                    Request Application Access
                  </button>
                </div>
              </>
            ) : reqSuccessMsg ? (
              /* Success State Card */
              <div className="py-4 space-y-4 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-emerald-950">
                      Request Submitted Successfully
                    </h2>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {reqSuccessMsg}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-700">
                    Once approved by leadership, you can immediately sign in using your work email address without a password.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(reqEmail);
                    setAuthMode('signin');
                    setReqSuccessMsg('');
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            ) : (
              /* Access Request Form */
              <>
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 mb-2">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Application Access Request</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Request Dashboard Access
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit your employee details. Requests surface directly in the Root Admin Portal for review.
                  </p>
                </div>

                {reqError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="leading-tight font-medium">{reqError}</span>
                  </div>
                )}

                <form onSubmit={handleRequestAccessSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="req-email-input" className="text-xs font-semibold text-slate-700 block">
                      Work Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="req-email-input"
                        type="email"
                        value={reqEmail}
                        onChange={(e) => {
                          setReqEmail(e.target.value);
                          if (reqError) setReqError('');
                        }}
                        placeholder="name@jfll.com"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="req-name-input" className="text-xs font-semibold text-slate-700 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="req-name-input"
                        type="text"
                        value={reqName}
                        onChange={(e) => setReqName(e.target.value)}
                        placeholder="e.g. Priya Patel"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="req-reason-input" className="text-xs font-semibold text-slate-700 block">
                      Reason for Access / Department Requirement <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        id="req-reason-input"
                        value={reqReason}
                        onChange={(e) => {
                          setReqReason(e.target.value);
                          if (reqError) setReqError('');
                        }}
                        rows={3}
                        required
                        placeholder="e.g., Regional sales manager covering Air Freight export accounts in the Gujarat cluster..."
                        className="w-full p-2.5 text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-4 focus:ring-apollo/10 transition-all font-medium resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reqLoading || !reqEmail.trim() || !reqReason.trim()}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {reqLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin w-4 h-4 text-white" />
                          <span>Submitting Request...</span>
                        </div>
                      ) : (
                        <>
                          <span>Submit Access Request</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Compliance & Security Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium text-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Passwordless whitelist authentication · 256-bit signed session</span>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Jet Freight Logistics Limited · Access restricted strictly to approved personnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
