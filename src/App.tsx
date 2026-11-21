import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signOut, User } from 'firebase/auth';
import {
  Bell,
  Calculator,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Recycle,
  Scale,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import { CustomerDashboard, CustomerTab } from './components/CustomerDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingAuthPage } from './components/LandingAuthPage';
import { MechanicDashboard, MechanicTab } from './components/MechanicDashboard';
import { LoadingSkeleton } from './components/ui/CommonUI';
import { VendorDashboard, VendorTab } from './components/VendorDashboard';
import { auth } from './firebase/config';
import {
  createUserProfile,
  getUserProfile,
  markNotificationRead,
  subscribeCustomerQuotations,
  subscribeCustomerRepairRequests,
  subscribeCustomerResaleListings,
  subscribeMechanicAssignedRequests,
  subscribeMechanicQuotations,
  subscribeNotifications,
  subscribeOpenRepairRequests,
  subscribeOpenResaleListings,
  subscribeSellerOffers,
  subscribeVendorOffers,
  subscribeVendorPurchasedListings,
  subscribeWarranties,
  updateUserProfile,
} from './services/repairLoopService';
import {
  AppNotification,
  Quotation,
  RepairRequest,
  ResaleListing,
  UserProfile,
  UserRole,
  VendorOffer,
  WarrantyRecord,
} from './types/domain';

type AnyTab = CustomerTab | MechanicTab | VendorTab;

interface NavItem {
  id: AnyTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CUSTOMER_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'Repair Requests', icon: ClipboardList },
  { id: 'quotations', label: 'Compare Quotations', icon: Scale },
  { id: 'tracking', label: 'Repair Tracking', icon: Clock },
  { id: 'warranty', label: 'Warranty Register', icon: ShieldCheck },
  { id: 'resale', label: 'Resale & Offers', icon: Recycle },
  { id: 'decision', label: 'Decision Engine', icon: Calculator },
];

const MECHANIC_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'open', label: 'Open Requests', icon: Wrench },
  { id: 'quotations', label: 'My Quotations', icon: Scale },
  { id: 'active', label: 'Active Repairs', icon: PackageCheck },
];

const VENDOR_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Marketplace', icon: Recycle },
  { id: 'offers', label: 'My Offers', icon: Scale },
  { id: 'purchased', label: 'Purchased Items', icon: ShoppingBag },
];

function FixFlipShell() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const syncingUidRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<AnyTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileLocationDraft, setProfileLocationDraft] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Real-time role-scoped collections
  const [dataLoading, setDataLoading] = useState(true);
  const [customerRequests, setCustomerRequests] = useState<RepairRequest[]>([]);
  const [customerQuotes, setCustomerQuotes] = useState<Quotation[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [customerListings, setCustomerListings] = useState<ResaleListing[]>([]);
  const [sellerOffers, setSellerOffers] = useState<VendorOffer[]>([]);

  const [openRequests, setOpenRequests] = useState<RepairRequest[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<RepairRequest[]>([]);
  const [mechanicQuotes, setMechanicQuotes] = useState<Quotation[]>([]);

  const [availableListings, setAvailableListings] = useState<ResaleListing[]>([]);
  const [purchasedListings, setPurchasedListings] = useState<ResaleListing[]>([]);
  const [vendorOffers, setVendorOffers] = useState<VendorOffer[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const syncUserProfile = async (user: User) => {
    if (syncingUidRef.current === user.uid) return;
    syncingUidRef.current = user.uid;
    setProfileLoading(true);
    try {
      let existing = await getUserProfile(user.uid);
      if (!existing && user.emailVerified) {
        const pendingRaw =
          localStorage.getItem('fixflip_pending_profile') ||
          localStorage.getItem('repairloop_pending_profile');
        let pending: { fullName?: string; role?: UserRole; location?: string } = {};
        if (pendingRaw) {
          try {
            pending = JSON.parse(pendingRaw);
          } catch {
            pending = {};
          }
          localStorage.removeItem('fixflip_pending_profile');
          localStorage.removeItem('repairloop_pending_profile');
        }
        existing = await createUserProfile({
          uid: user.uid,
          fullName: pending.fullName || user.displayName || 'FixFlip Member',
          email: user.email || '',
          role: pending.role || 'CUSTOMER',
          location: pending.location,
        });
      }
      setProfile(existing);
    } catch (err) {
      console.error('Failed to synchronize user profile:', err);
    } finally {
      syncingUidRef.current = null;
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        await syncUserProfile(user);
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !profile) {
      return;
    }

    setDataLoading(true);
    const unsubs: (() => void)[] = [];

    unsubs.push(subscribeNotifications(profile.uid, setNotifications));

    if (profile.role === 'CUSTOMER') {
      unsubs.push(
        subscribeCustomerRepairRequests(profile.uid, (items) => {
          setCustomerRequests(items);
          setDataLoading(false);
        })
      );
      unsubs.push(subscribeCustomerQuotations(profile.uid, setCustomerQuotes));
      unsubs.push(subscribeWarranties(profile.uid, setWarranties));
      unsubs.push(subscribeCustomerResaleListings(profile.uid, setCustomerListings));
      unsubs.push(subscribeSellerOffers(profile.uid, setSellerOffers));
    } else if (profile.role === 'MECHANIC') {
      unsubs.push(
        subscribeOpenRepairRequests((items) => {
          setOpenRequests(items);
          setDataLoading(false);
        })
      );
      unsubs.push(subscribeMechanicAssignedRequests(profile.uid, setAssignedRequests));
      unsubs.push(subscribeMechanicQuotations(profile.uid, setMechanicQuotes));
    } else if (profile.role === 'VENDOR') {
      unsubs.push(
        subscribeOpenResaleListings((items) => {
          setAvailableListings(items);
          setDataLoading(false);
        })
      );
      unsubs.push(subscribeVendorPurchasedListings(profile.uid, setPurchasedListings));
      unsubs.push(subscribeVendorOffers(profile.uid, setVendorOffers));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, profile]);

  const navItems = useMemo(() => {
    if (profile?.role === 'MECHANIC') return MECHANIC_NAV;
    if (profile?.role === 'VENDOR') return VENDOR_NAV;
    return CUSTOMER_NAV;
  }, [profile?.role]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleSignOut = async () => {
    await signOut(auth);
    setProfile(null);
    setProfileOpen(false);
    setActiveTab('overview');
  };

  const openProfileModal = () => {
    if (!profile) return;
    setProfileNameDraft(profile.fullName);
    setProfileLocationDraft(profile.location || '');
    setProfileError(null);
    setProfileFeedback(null);
    setProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileError(null);
    setProfileFeedback(null);
    setProfileSaving(true);
    try {
      const updated = await updateUserProfile(profile.uid, {
        fullName: profileNameDraft,
        location: profileLocationDraft,
      });
      setProfile(updated);
      setProfileFeedback('Profile updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <LoadingSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified || !profile) {
    return (
      <LandingAuthPage
        pendingVerificationEmail={
          firebaseUser && !firebaseUser.emailVerified ? firebaseUser.email : null
        }
        verificationFeedback={verificationFeedback}
        onRefreshVerification={async () => {
          setVerificationFeedback(null);
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              await syncUserProfile(auth.currentUser);
            } else {
              setVerificationFeedback(
                'Your email is still marked unverified. Please click the verification link in your inbox, then try again.'
              );
            }
          }
        }}
        onResendVerification={async () => {
          setVerificationFeedback(null);
          if (auth.currentUser) {
            try {
              await sendEmailVerification(auth.currentUser);
              setVerificationFeedback(
                `A new verification email was sent to ${auth.currentUser.email}.`
              );
            } catch (err) {
              setVerificationFeedback(
                err instanceof Error ? err.message : 'Could not resend verification email.'
              );
            }
          }
        }}
        onSignOut={async () => {
          setVerificationFeedback(null);
          await handleSignOut();
        }}
        onAuthenticated={(newProfile) => {
          setVerificationFeedback(null);
          setProfile(newProfile);
          setActiveTab('overview');
        }}
      />
    );
  }

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (260px fixed on desktop) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0F1E36] text-white flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <div>
              <span className="text-lg font-bold tracking-tight text-white">FixFlip</span>
              <span className="block text-[11px] text-teal-300">Repair. Reuse. Renew.</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-300 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            type="button"
            onClick={openProfileModal}
            className="w-full text-left px-3 py-2 bg-slate-900/60 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white truncate">{profile.fullName}</p>
              <UserIcon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            </div>
            <p className="text-[11px] text-teal-300 font-medium">
              {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()} Workspace · Edit Profile
            </p>
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400">
                {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-[#0F1E36] truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                className="relative p-2 text-slate-600 hover:text-[#0F1E36] bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-teal-600 text-white text-[10px] font-mono font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0F1E36]">Notifications</span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => void markNotificationRead(n.id)}
                          className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors ${
                            n.read ? 'opacity-65' : 'bg-teal-50/30'
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                          <p className="mt-0.5 text-xs text-slate-600 leading-snug">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openProfileModal}
              className="hidden sm:block text-right hover:opacity-80 transition-opacity"
            >
              <p className="text-xs font-semibold text-slate-900">{profile.fullName}</p>
              <p className="text-[11px] text-slate-500">{profile.email}</p>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {profile.role === 'CUSTOMER' && (
            <CustomerDashboard
              profile={profile}
              activeTab={
                CUSTOMER_NAV.some((n) => n.id === activeTab)
                  ? (activeTab as CustomerTab)
                  : 'overview'
              }
              onTabChange={(t) => setActiveTab(t)}
              requests={customerRequests}
              quotations={customerQuotes}
              warranties={warranties}
              listings={customerListings}
              offers={sellerOffers}
              loading={dataLoading}
            />
          )}

          {profile.role === 'MECHANIC' && (
            <MechanicDashboard
              profile={profile}
              activeTab={
                MECHANIC_NAV.some((n) => n.id === activeTab)
                  ? (activeTab as MechanicTab)
                  : 'overview'
              }
              onTabChange={(t) => setActiveTab(t)}
              openRequests={openRequests}
              assignedRequests={assignedRequests}
              myQuotations={mechanicQuotes}
              loading={dataLoading}
            />
          )}

          {profile.role === 'VENDOR' && (
            <VendorDashboard
              profile={profile}
              activeTab={
                VENDOR_NAV.some((n) => n.id === activeTab)
                  ? (activeTab as VendorTab)
                  : 'overview'
              }
              onTabChange={(t) => setActiveTab(t)}
              availableListings={availableListings}
              purchasedListings={purchasedListings}
              myOffers={vendorOffers}
              loading={dataLoading}
            />
          )}
        </main>
      </div>

      {profileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#0F1E36]">Account Profile</h3>
                <p className="text-xs text-slate-500">
                  {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()} account in FixFlip
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {profileError}
              </div>
            )}
            {profileFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                {profileFeedback}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={profileNameDraft}
                  onChange={(e) => setProfileNameDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City / Region
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={profileLocationDraft}
                  onChange={(e) => setProfileLocationDraft(e.target.value)}
                  placeholder="e.g. Seattle, WA"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500">Email</p>
                  <p className="text-xs font-medium text-slate-800 truncate">{profile.email}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500">Assigned Role</p>
                  <p className="text-xs font-semibold text-[#0F1E36]">{profile.role}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FixFlipShell />
    </ErrorBoundary>
  );
}
