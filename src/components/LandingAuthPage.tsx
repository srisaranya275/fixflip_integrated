import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Recycle,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { formatFirebaseAuthError } from '../firebase/authErrors';
import { auth } from '../firebase/config';
import { createUserProfile, getUserProfile } from '../services/repairLoopService';
import { UserProfile, UserRole } from '../types/domain';
import { resolveAssetUrl } from '../utils/warranty';
import { ErrorBanner } from './ui/CommonUI';

interface LandingAuthPageProps {
  onAuthenticated: (profile: UserProfile) => void;
  pendingVerificationEmail?: string | null;
  verificationFeedback?: string | null;
  onRefreshVerification?: () => Promise<void>;
  onResendVerification?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

const ROLE_OPTIONS: { value: UserRole; label: string; summary: string }[] = [
  {
    value: 'CUSTOMER',
    label: 'Customer',
    summary: 'Submit repair requests, compare quotes, manage warranties, and resell devices.',
  },
  {
    value: 'MECHANIC',
    label: 'Mechanic',
    summary: 'Browse open repair requests, submit confidential quotes, and update repair progress.',
  },
  {
    value: 'VENDOR',
    label: 'Vendor',
    summary: 'Inspect resale listings, submit confidential buyout offers, and track acquisitions.',
  },
];

export function LandingAuthPage({
  onAuthenticated,
  pendingVerificationEmail,
  verificationFeedback,
  onRefreshVerification,
  onResendVerification,
  onSignOut,
}: LandingAuthPageProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      localStorage.setItem(
        'fixflip_pending_profile',
        JSON.stringify({ fullName: fullName.trim(), role, location: location.trim() })
      );
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await createUserProfile({
          uid: user.uid,
          fullName: fullName.trim() || user.displayName || 'FixFlip User',
          email: user.email || '',
          role,
          location: location.trim(),
        });
      }
      localStorage.removeItem('fixflip_pending_profile');
      onAuthenticated(profile);
    } catch (err) {
      localStorage.removeItem('fixflip_pending_profile');
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Enter your account email address above before requesting a password reset.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMsg(`Password reset email sent to ${trimmedEmail}. Check your inbox.`);
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (authMode === 'register' && fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'register') {
        localStorage.setItem(
          'fixflip_pending_profile',
          JSON.stringify({ fullName: fullName.trim(), role, location: location.trim() })
        );
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        if (cred.user.emailVerified) {
          let profile = await getUserProfile(cred.user.uid);
          if (!profile) {
            profile = await createUserProfile({
              uid: cred.user.uid,
              fullName: fullName.trim(),
              email: cred.user.email || trimmedEmail,
              role,
              location: location.trim(),
            });
          }
          localStorage.removeItem('fixflip_pending_profile');
          onAuthenticated(profile);
        } else {
          await sendEmailVerification(cred.user);
          setInfoMsg(
            'Verification email sent. Please verify your email address, then click "I have verified my email" below.'
          );
        }
      } else {
        localStorage.setItem(
          'fixflip_pending_profile',
          JSON.stringify({ fullName: fullName.trim(), role, location: location.trim() })
        );
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        if (!cred.user.emailVerified) {
          setInfoMsg(
            'Your email address is not verified yet. Check your inbox or resend the verification email.'
          );
          return;
        }
        let profile = await getUserProfile(cred.user.uid);
        if (!profile) {
          profile = await createUserProfile({
            uid: cred.user.uid,
            fullName: cred.user.displayName || 'FixFlip Member',
            email: cred.user.email || trimmedEmail,
            role,
            location: location.trim(),
          });
        }
        localStorage.removeItem('fixflip_pending_profile');
        onAuthenticated(profile);
      }
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-xl font-bold tracking-tight text-[#0F1E36] whitespace-nowrap shrink-0"
          >
            FixFlip
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#top" className="hover:text-[#0F1E36] transition-colors whitespace-nowrap shrink-0">
              Overview
            </a>
            <a href="#roles" className="hover:text-[#0F1E36] transition-colors whitespace-nowrap shrink-0">
              Platform Roles
            </a>
            <a href="#auth-panel" className="hover:text-[#0F1E36] transition-colors whitespace-nowrap shrink-0">
              Register
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="#auth-panel"
              onClick={() => setAuthMode('login')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <main id="top" className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Narrative + Workbench Visual */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold text-teal-700 tracking-wide">
                Repair. Reuse. Renew.
              </p>
              <h1 className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[#0F1E36] leading-tight text-balance">
                Smarter lifecycle decisions for electronics and appliances.
              </h1>
              <p className="mt-4 text-base text-slate-600 max-w-2xl leading-relaxed">
                FixFlip connects device owners, certified repair mechanics, and verified resale
                vendors in one transparent workflow. Compare repair quotes, track warranties,
                resell end-of-life hardware, and weigh repair vs. replacement with quantitative
                clarity.
              </p>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/9]">
              <img
                src={resolveAssetUrl('/src/assets/images/repairloop_hero_workbench_1795228565033.jpg')}
                alt="Precision electronics diagnostics and repair studio workbench"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E36]/80 via-[#0F1E36]/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <p className="text-xs font-medium text-teal-300">
                    Circular Hardware Operations
                  </p>
                  <p className="mt-1 text-sm text-slate-100 max-w-xl">
                    Confidential mechanic bidding, atomic single-winner selection, and persistent
                    warranty tracking for electronics and household appliances.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Auth & Role Registration Panel */}
          <div id="auth-panel" className="lg:col-span-5 flex">
            <div className="w-full bg-white border border-slate-200 rounded-xl p-7 shadow-sm flex flex-col justify-between">
              {pendingVerificationEmail ? (
                <div className="space-y-5 my-auto">
                  <h2 className="text-2xl font-bold text-[#0F1E36]">Verify your email address</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    We sent a verification link to{' '}
                    <span className="font-semibold text-slate-900">{pendingVerificationEmail}</span>.
                    Verify your email to activate Firestore access for your account.
                  </p>
                  {verificationFeedback && (
                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
                      {verificationFeedback}
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {onRefreshVerification && (
                      <button
                        type="button"
                        onClick={onRefreshVerification}
                        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        I have verified my email — Continue
                      </button>
                    )}
                    {onResendVerification && (
                      <button
                        type="button"
                        onClick={onResendVerification}
                        className="w-full px-4 py-2.5 text-sm font-medium text-[#0F1E36] bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Resend verification email
                      </button>
                    )}
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Use a different account
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <h2 className="text-xl font-bold text-[#0F1E36]">
                        {authMode === 'register' ? 'Create FixFlip Account' : 'Sign In to FixFlip'}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Select your role and authenticate to enter your workspace.
                      </p>
                    </div>
                    <div className="flex p-1 bg-slate-100 rounded-lg shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setErrorMsg(null);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          authMode === 'register'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Register
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMsg(null);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          authMode === 'login'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
                    {infoMsg && (
                      <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
                        {infoMsg}
                      </div>
                    )}

                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Account Role {authMode === 'login' && '(used on first-time Google onboarding)'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                              role === opt.value
                                ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {ROLE_OPTIONS.find((r) => r.value === role)?.summary}
                      </p>
                    </div>

                    {/* Email / Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-3.5">
                      {authMode === 'register' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Jordan Mercer"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Password
                          </label>
                          {authMode === 'login' && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => void handlePasswordReset()}
                              className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-50"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      {authMode === 'register' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            City / Region (Optional)
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Seattle, WA"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        <span>
                          {loading
                            ? 'Authenticating...'
                            : authMode === 'register'
                              ? `Register as ${ROLE_OPTIONS.find((r) => r.value === role)?.label}`
                              : 'Sign In with Email'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="shrink mx-3 text-xs text-slate-400">or instant access</span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#0F1E36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                      <span>Continue with Google ({ROLE_OPTIONS.find((r) => r.value === role)?.label})</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
                Role-based dashboards and confidential quotation/offer isolation enforced by Firestore Security Rules.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Role Pillars */}
        <section id="roles" className="mt-16 pt-12 border-t border-slate-200">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#0F1E36]">Built for every side of circular hardware</h2>
            <p className="mt-2 text-sm text-slate-600">
              Dedicated dashboards keep repair diagnostics, bids, and resale offers strictly scoped to authorized roles.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#0F1E36]">Customer Workspace</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Log repair tickets, compare confidential mechanic quotations, monitor 5-stage repair timelines, track product warranties, and list devices for resale.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#0F1E36]">Mechanic Bench</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Inspect open repair requests with full fault histories, submit private cost & lifespan quotations isolated from competitors, and advance active job statuses.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#0F1E36]">Vendor Acquisition</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Browse verified resale listings, submit confidential buyout offers invisible to rival vendors, and manage won acquisitions once sellers accept.
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>FixFlip — Repair. Reuse. Renew.</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              Firebase Auth & Firestore Persistence
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
