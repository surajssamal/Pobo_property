'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import { Lead, Profile, LeadStatus } from '@/types/crm';
import { getAdminLeads, updateLeadStatus, addLeadNote, getProfiles } from '@/lib/leadsService';
import { LEAD_STATUSES, STATUS_STYLES } from '@/lib/constants';
import {
  Users,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Send,
  UserCheck,
  ChevronRight,
  TrendingUp,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function WorkerPage() {
  const { profile, isDemoUser, enableDemoMode } = useAuth();
  const isAmbassador = profile?.role === 'area_ambassador' || profile?.role === 'admin' || isDemoUser;
  const isAdminSupervisor = profile?.role === 'admin';

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTabStatus, setActiveTabStatus] = useState<string>('All');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load profiles and leads
  const loadData = async () => {
    setLoading(true);
    const [leadsRes, profilesRes] = await Promise.all([
      getAdminLeads(),
      getProfiles(),
    ]);
    setAllLeads(leadsRes.leads);
    setProfiles(profilesRes);

    // If ambassador is logged in, lock to their profile id
    if (profile?.role === 'area_ambassador' && profile?.id) {
      setSelectedAmbassadorId(profile.id);
    } else if (!selectedAmbassadorId) {
      const firstAmb = profilesRes.find((p) => p.role === 'area_ambassador');
      if (firstAmb) {
        setSelectedAmbassadorId(firstAmb.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // STRICT ISOLATION LOGIC:
  // Area Ambassadors are strictly locked to their own profile id.
  // Only Admin supervisors can inspect other ambassadors.
  const effectiveAmbassadorId = useMemo(() => {
    if (profile?.role === 'area_ambassador' && profile?.id) {
      return profile.id;
    }
    return selectedAmbassadorId || profile?.id || '';
  }, [profile, selectedAmbassadorId]);

  const currentAmbassador = useMemo(() => {
    if (profile?.role === 'area_ambassador') {
      return profile;
    }
    return profiles.find((p) => p.id === effectiveAmbassadorId) || profile;
  }, [profile, profiles, effectiveAmbassadorId]);

  // STRICT ISOLATION: Leads filtered strictly to assigned_aa_id === effectiveAmbassadorId
  const myLeads = useMemo(() => {
    if (!effectiveAmbassadorId) return [];
    return allLeads.filter((l) => l.assigned_aa_id === effectiveAmbassadorId);
  }, [allLeads, effectiveAmbassadorId]);

  const displayedLeads = useMemo(() => {
    if (activeTabStatus === 'All') return myLeads;
    return myLeads.filter((l) => l.status === activeTabStatus);
  }, [myLeads, activeTabStatus]);

  // Status Change
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const prevLeads = [...allLeads];
    setAllLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    const res = await updateLeadStatus(leadId, newStatus);
    if (res.success) {
      showToast(`Status changed to "${newStatus}"`);
    } else {
      setAllLeads(prevLeads);
      showToast('Status update failed');
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !noteInput.trim()) return;

    setSavingNote(true);
    const authorName = currentAmbassador?.full_name || 'Area Ambassador';
    const res = await addLeadNote(
      selectedLead.id,
      noteInput.trim(),
      selectedAmbassadorId,
      authorName
    );

    if (res.success && res.newNote) {
      const updatedNotes = [res.newNote, ...(selectedLead.lead_notes || [])];
      setSelectedLead({
        ...selectedLead,
        lead_notes: updatedNotes,
      });
      setAllLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id ? { ...l, lead_notes: updatedNotes } : l
        )
      );
      setNoteInput('');
      showToast('Note logged to customer record');
    }
    setSavingNote(false);
  };

  // Worker metrics
  const workerMetrics = useMemo(() => {
    const total = myLeads.length;
    const pendingContact = myLeads.filter((l) => l.status === 'New').length;
    const siteVisits = myLeads.filter((l) => l.status === 'Site Visit').length;
    const won = myLeads.filter((l) => l.status === 'Won').length;
    return { total, pendingContact, siteVisits, won };
  }, [myLeads]);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between selection:bg-emerald-200 selection:text-stone-900">
      {/* Background with blur */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
        <Image
          src="/Background.png"
          alt="Natural architectural background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.92] contrast-[1.03]"
        />
        <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-md" />
      </div>

      {/* Top Navbar */}
      <Navigation />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-xs shadow-2xl border border-white/20 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 space-y-6">
        {!isAmbassador ? (
          <div className="max-w-md mx-auto my-12 p-8 rounded-3xl glass-panel bg-white/95 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white mx-auto flex items-center justify-center shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-widest">
                Area Ambassador Portal
              </span>
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                Ambassador Sign-In Required
              </h2>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Sign in with your Area Ambassador account to view leads assigned to your territory.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/worker/login"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In as Area Ambassador</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => enableDemoMode('area_ambassador')}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quick Ambassador Demo Bypass</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header and Worker Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 text-white">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-medium mb-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Area Ambassador Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white">
              My Assigned Leads &amp; Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-stone-300">
              Update lead progression status, conduct customer callbacks, and schedule site visits.
            </p>
          </div>

          {/* Strict Identity Badge or Admin Supervisor Switcher */}
          <div className="flex items-center gap-3">
            {!isAdminSupervisor ? (
              /* Strictly Isolated Ambassador Identity Badge */
              <div className="flex items-center gap-3 bg-emerald-950/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-500/30 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                  {currentAmbassador?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="text-left">
                  <span className="block text-[10px] text-emerald-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Strict Territory Isolation Active
                  </span>
                  <span className="text-white text-xs font-bold block truncate max-w-[200px]">
                    {currentAmbassador?.full_name || 'Area Ambassador'}
                  </span>
                </div>
              </div>
            ) : (
              /* Supervisor Switcher (Only for Admins) */
              <div className="flex items-center gap-3 bg-stone-900/70 backdrop-blur-md p-2 rounded-2xl border border-white/15">
                <UserCheck className="w-4 h-4 text-emerald-400 ml-2" />
                <div className="text-left">
                  <span className="block text-[10px] text-stone-400 uppercase font-semibold">
                    Admin Territory View
                  </span>
                  <select
                    value={effectiveAmbassadorId}
                    onChange={(e) => setSelectedAmbassadorId(e.target.value)}
                    className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer pr-2"
                  >
                    {profiles
                      .filter((p) => p.role === 'area_ambassador')
                      .map((p) => (
                        <option key={p.id} value={p.id} className="bg-stone-900 text-white">
                          {p.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Worker Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-stone-900/70 backdrop-blur-md border border-white/10 text-white space-y-1">
            <span className="text-xs text-stone-400 font-medium">Assigned Inquiries</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif">{workerMetrics.total}</span>
              <Users className="w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/50 backdrop-blur-md border border-amber-500/20 text-white space-y-1">
            <span className="text-xs text-amber-300 font-medium">Pending Callbacks</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-amber-200">{workerMetrics.pendingContact}</span>
              <Phone className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/50 backdrop-blur-md border border-emerald-500/20 text-white space-y-1">
            <span className="text-xs text-emerald-300 font-medium">Site Visits Booked</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-emerald-200">{workerMetrics.siteVisits}</span>
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-green-950/50 backdrop-blur-md border border-green-500/20 text-white space-y-1">
            <span className="text-xs text-green-300 font-medium">Deals Closed</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-green-200">{workerMetrics.won}</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-2 rounded-2xl bg-stone-900/60 backdrop-blur-md border border-white/10 scrollbar-none">
          <button
            onClick={() => setActiveTabStatus('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              activeTabStatus === 'All'
                ? 'bg-white text-stone-900 font-semibold shadow'
                : 'text-stone-300 hover:bg-white/10'
            }`}
          >
            All Leads ({myLeads.length})
          </button>
          {LEAD_STATUSES.map((status) => {
            const count = myLeads.filter((l) => l.status === status).length;
            const isSelected = activeTabStatus === status;
            return (
              <button
                key={status}
                onClick={() => setActiveTabStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-stone-300 hover:bg-white/10'
                }`}
              >
                <span>{status}</span>
                <span className="text-[10px] px-1 rounded-full bg-white/20">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Worker Table / Cards */}
        <div className="space-y-3">
          {displayedLeads.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-stone-500 bg-white/95 space-y-2">
              <Users className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="font-bold text-stone-800 text-base">No Assigned Leads Found</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                No customer leads are currently assigned in this category. You can switch to another ambassador or &quot;View All&quot; in the switcher above.
              </p>
            </div>
          ) : (
            displayedLeads.map((lead) => {
              const statusMeta = STATUS_STYLES[lead.status] || STATUS_STYLES.New;
              const cleanPhone = lead.phone.replace(/\D/g, '').slice(-10);

              return (
                <div
                  key={lead.id}
                  className="glass-panel rounded-2xl p-4 sm:p-5 bg-white/95 hover:bg-white transition-all shadow-md hover:shadow-xl border border-white/30 space-y-3"
                >
                  {/* Top row: Customer header + current status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shadow-inner">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-base leading-snug">
                          {lead.name}
                        </h3>
                        <div className="flex items-center gap-2 text-stone-500 text-xs">
                          <span className="font-mono">{lead.phone}</span>
                          <span>•</span>
                          <span>{lead.preferred_location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                        <span>{lead.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Property Specs Pill Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                        Property Type
                      </span>
                      <span className="font-medium text-stone-800 truncate block">
                        {lead.property_type}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                        Planned Budget
                      </span>
                      <span className="font-semibold text-emerald-800 block">
                        {lead.budget}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                        Target Timeline
                      </span>
                      <span className="font-medium text-stone-800 block">
                        {lead.purchase_timeline}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                        Inquiry Received
                      </span>
                      <span className="font-medium text-stone-600 block">
                        {new Date(lead.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Customer Notes snippet if present */}
                  {lead.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 italic">{lead.notes}</span>
                    </div>
                  )}

                  {/* Status Change Action Buttons (Worker Action Bar) */}
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Status Changer Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                      <span className="text-[11px] font-semibold text-stone-500 mr-1 shrink-0">
                        Change Status:
                      </span>
                      {LEAD_STATUSES.map((st) => {
                        const isCurrent = lead.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(lead.id, st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                              isCurrent
                                ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Call, WhatsApp, & Notes */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 shadow-sm transition-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call</span>
                      </a>

                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                          `Hello ${lead.name}, I am your assigned POBO Area Ambassador regarding your enquiry for ${lead.property_type} in ${lead.preferred_location}:`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-medium text-xs hover:bg-emerald-600 shadow-sm transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs transition-all"
                      >
                        <span>Follow-up Log ({lead.lead_notes?.length || 0})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </>
        )}
      </main>

      {/* Follow-up Notes Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft border-l border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-stone-200 bg-stone-50/80 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 tracking-wider uppercase">
                  Area Ambassador Log
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  {selectedLead.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-sm font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-stone-800 text-xs">
              {/* Quick Status Buttons */}
              <div className="space-y-1.5">
                <span className="font-semibold text-stone-600 block text-[11px] uppercase">
                  Update Progression
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {LEAD_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(selectedLead.id, st)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                        selectedLead.status === st
                          ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Note Box */}
              <div className="space-y-2 pt-2">
                <span className="font-semibold text-stone-600 block text-[11px] uppercase">
                  Log Call / Site Visit Note
                </span>
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="E.g. Called customer at 2 PM. Confirmed interest in sea-view duplex. Site visit fixed for Saturday..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 placeholder-stone-400 text-xs outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={savingNote || !noteInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{savingNote ? 'Logging...' : 'Save Follow-up Note'}</span>
                  </button>
                </form>
              </div>

              {/* Previous Notes */}
              <div className="space-y-2 pt-2">
                <span className="font-semibold text-stone-600 block text-[11px] uppercase">
                  Activity Timeline ({selectedLead.lead_notes?.length || 0})
                </span>
                {!selectedLead.lead_notes || selectedLead.lead_notes.length === 0 ? (
                  <p className="text-stone-400 text-xs italic py-2">
                    No notes recorded yet. Add your first call log above.
                  </p>
                ) : (
                  selectedLead.lead_notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-stone-100/90 border border-stone-200 space-y-1"
                    >
                      <div className="flex justify-between items-center text-[10px] text-stone-500">
                        <span className="font-semibold text-stone-700">
                          {note.author_name || 'Area Ambassador'}
                        </span>
                        <span>
                          {new Date(note.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-stone-800 text-xs leading-relaxed">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
