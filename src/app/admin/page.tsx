'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import { Lead, Profile, LeadStatus } from '@/types/crm';
import { getAdminLeads, updateLeadStatus, assignLeadAmbassador, addLeadNote, getProfiles } from '@/lib/leadsService';
import { LEAD_STATUSES, STATUS_STYLES } from '@/lib/constants';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Send,
  ShieldCheck,
  TrendingUp,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function AdminPage() {
  const { profile, isDemoUser, enableDemoMode } = useAuth();
  const isAdmin = profile?.role === 'admin' || isDemoUser;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load leads and profiles
  const loadData = async () => {
    setLoading(true);
    const [leadsRes, profilesRes] = await Promise.all([
      getAdminLeads(),
      getProfiles(),
    ]);
    setLeads(leadsRes.leads);
    setIsLiveDb(leadsRes.isLiveDb);
    setProfiles(profilesRes);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Status update handler
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const prevLeads = [...leads];
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    const res = await updateLeadStatus(leadId, newStatus);
    if (res.success) {
      showToast(`Lead status updated to "${newStatus}"`);
    } else {
      setLeads(prevLeads);
      showToast('Status update failed');
    }
  };

  // Assign Ambassador handler
  const handleAssignChange = async (leadId: string, ambassadorId: string) => {
    const assignedId = ambassadorId === 'unassigned' ? null : ambassadorId;
    const ambassador = profiles.find((p) => p.id === assignedId) || null;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, assigned_aa_id: assignedId, assigned_ambassador: ambassador }
          : l
      )
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) =>
        prev
          ? { ...prev, assigned_aa_id: assignedId, assigned_ambassador: ambassador }
          : null
      );
    }

    const res = await assignLeadAmbassador(leadId, assignedId);
    if (res.success) {
      showToast(
        assignedId
          ? `Assigned to ${ambassador?.full_name.split(' ')[0]}`
          : 'Lead unassigned'
      );
    }
  };

  // Add lead note handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteText.trim()) return;

    setSavingNote(true);
    const res = await addLeadNote(
      selectedLead.id,
      newNoteText.trim(),
      null,
      'Admin'
    );
    if (res.success && res.newNote) {
      const updatedNotes = [res.newNote, ...(selectedLead.lead_notes || [])];
      setSelectedLead({
        ...selectedLead,
        lead_notes: updatedNotes,
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id ? { ...l, lead_notes: updatedNotes } : l
        )
      );
      setNewNoteText('');
      showToast('Note logged to timeline');
    }
    setSavingNote(false);
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.preferred_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.property_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ? true : lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status === 'New').length;
    const siteVisits = leads.filter((l) => l.status === 'Site Visit').length;
    const won = leads.filter((l) => l.status === 'Won').length;
    return { total, newLeads, siteVisits, won };
  }, [leads]);

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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 space-y-6">
        {!isAdmin ? (
          <div className="max-w-md mx-auto my-12 p-8 rounded-3xl glass-panel bg-white/95 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-widest">
                Protected Portal
              </span>
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                Admin Sign-In Required
              </h2>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                This dashboard requires administrator privileges authenticated through Supabase.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/admin/login"
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In with Admin Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => enableDemoMode('admin')}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quick Admin Demo Bypass</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header / Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 text-white">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-medium mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white">
              Customer Leads &amp; Enquiries
            </h1>
            <p className="text-xs sm:text-sm text-stone-300">
              Monitor, qualify, and assign buyer enquiries to Area Ambassadors across Indian regions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium ${
                isLiveDb
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveDb ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
              <span>{isLiveDb ? 'Supabase Live Connected' : 'Live Preview Mode'}</span>
            </span>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95 cursor-pointer"
              title="Refresh leads"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-stone-900/70 backdrop-blur-md border border-white/10 text-white space-y-1">
            <span className="text-xs text-stone-400 font-medium">Total Inquiries</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif">{metrics.total}</span>
              <Users className="w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/50 backdrop-blur-md border border-blue-500/20 text-white space-y-1">
            <span className="text-xs text-blue-300 font-medium">New Enquiries</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-blue-200">{metrics.newLeads}</span>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/50 backdrop-blur-md border border-emerald-500/20 text-white space-y-1">
            <span className="text-xs text-emerald-300 font-medium">Active Site Visits</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-emerald-200">{metrics.siteVisits}</span>
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-green-950/50 backdrop-blur-md border border-green-500/20 text-white space-y-1">
            <span className="text-xs text-green-300 font-medium">Won / Converted</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-serif text-green-200">{metrics.won}</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-stone-900/60 backdrop-blur-md border border-white/10 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, phone, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-stone-400 text-xs rounded-xl border border-white/15 outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                statusFilter === 'All'
                  ? 'bg-white text-stone-900 font-semibold'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              All ({leads.length})
            </button>
            {LEAD_STATUSES.map((status) => {
              const count = leads.filter((l) => l.status === status).length;
              const isSelected = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
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
        </div>

        {/* Leads Visual Table Card */}
        <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-100/90 text-stone-600 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Location &amp; Property</th>
                  <th className="py-3.5 px-4">Budget &amp; Urgency</th>
                  <th className="py-3.5 px-4">Status Pipeline</th>
                  <th className="py-3.5 px-4">Assigned Worker (AA)</th>
                  <th className="py-3.5 px-4">Received</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Users className="w-8 h-8 text-stone-400 mx-auto" />
                        <p className="font-semibold text-stone-700">No enquiries match your filter</p>
                        <p className="text-[11px] text-stone-400">
                          Try searching for another keyword or select a different status.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const statusMeta = STATUS_STYLES[lead.status] || STATUS_STYLES.New;
                    const cleanPhone = lead.phone.replace(/\D/g, '').slice(-10);

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-stone-50/90 transition-colors group cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        {/* 1. Customer Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-stone-900 text-sm block">
                              {lead.name}
                            </span>
                            <div className="flex items-center gap-2 text-stone-500">
                              <span className="font-mono text-xs">{lead.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Location & Property Type */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium">
                              <MapPin className="w-3 h-3 text-emerald-700" />
                              {lead.preferred_location}
                            </span>
                            <span className="block text-stone-600 truncate max-w-[180px]">
                              {lead.property_type}
                            </span>
                          </div>
                        </td>

                        {/* 3. Budget & Urgency */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="font-semibold text-stone-800 block">
                              {lead.budget}
                            </span>
                            <span className="text-[11px] text-stone-500 block">
                              {lead.purchase_timeline}
                            </span>
                          </div>
                        </td>

                        {/* 4. Status Dropdown */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleStatusChange(lead.id, e.target.value as LeadStatus)
                              }
                              className={`pl-2.5 pr-6 py-1 rounded-full text-xs font-semibold border cursor-pointer appearance-none transition-all outline-none focus:ring-2 focus:ring-emerald-400 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                            >
                              {LEAD_STATUSES.map((st) => (
                                <option key={st} value={st} className="bg-white text-stone-800">
                                  {st}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className={`w-3.5 h-3.5 absolute right-2 top-2 pointer-events-none ${statusMeta.text}`} />
                          </div>
                        </td>

                        {/* 5. Assigned Ambassador */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              value={lead.assigned_aa_id || 'unassigned'}
                              onChange={(e) => handleAssignChange(lead.id, e.target.value)}
                              className={`pl-2.5 pr-6 py-1 rounded-xl text-xs font-medium border appearance-none transition-all outline-none cursor-pointer ${
                                lead.assigned_aa_id
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : 'bg-stone-100 text-stone-500 border-stone-200'
                              }`}
                            >
                              <option value="unassigned">-- Unassigned --</option>
                              {profiles
                                .filter((p) => p.role === 'area_ambassador')
                                .map((amb) => (
                                  <option key={amb.id} value={amb.id}>
                                    {amb.full_name}
                                  </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2 pointer-events-none text-stone-400" />
                          </div>
                        </td>

                        {/* 6. Date */}
                        <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                          {new Date(lead.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* 7. Action buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call */}
                            <a
                              href={`tel:${cleanPhone}`}
                              title="Call Customer"
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {/* WhatsApp */}
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                `Hello ${lead.name}, regarding your property enquiry for ${lead.property_type} in ${lead.preferred_location} with POBO Estates:`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Customer"
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-green-100 text-stone-700 hover:text-green-800 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                              title="View notes & history"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>

      {/* Detail & Notes Slide-Over Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft border-l border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-stone-200 bg-stone-50/80 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 tracking-wider uppercase">
                  Lead Details &amp; History
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

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-stone-800 text-xs">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <a
                  href={`tel:${selectedLead.phone.replace(/\D/g, '').slice(-10)}`}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 text-white font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-stone-800"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Call {selectedLead.phone}</span>
                </a>
                <a
                  href={`https://wa.me/91${selectedLead.phone.replace(/\D/g, '').slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-600"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-stone-400 text-[11px] block">Location</span>
                  <span className="font-semibold text-stone-800">{selectedLead.preferred_location}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Property Type</span>
                  <span className="font-semibold text-stone-800">{selectedLead.property_type}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Budget</span>
                  <span className="font-semibold text-stone-800">{selectedLead.budget}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Purchase Timeline</span>
                  <span className="font-semibold text-stone-800">{selectedLead.purchase_timeline}</span>
                </div>
              </div>

              {/* Status and Ambassador Assignment Controls */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                    Update Pipeline Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LEAD_STATUSES.map((st) => {
                      const isActive = selectedLead.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(selectedLead.id, st)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                            isActive
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                              : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                    Assigned Area Ambassador
                  </label>
                  <select
                    value={selectedLead.assigned_aa_id || 'unassigned'}
                    onChange={(e) => handleAssignChange(selectedLead.id, e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="unassigned">-- Not Assigned --</option>
                    {profiles
                      .filter((p) => p.role === 'area_ambassador')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.phone || 'Ambassador'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Initial Notes / Customer Comments */}
              {selectedLead.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                  <span className="font-semibold text-[11px] text-amber-800 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Customer Remarks
                  </span>
                  <p className="text-xs leading-relaxed">{selectedLead.notes}</p>
                </div>
              )}

              {/* Lead Activity / Notes History */}
              <div className="space-y-3 pt-2">
                <span className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                  Follow-up Log &amp; Ambassador Notes ({selectedLead.lead_notes?.length || 0})
                </span>

                {/* Add new note box */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Log a call summary, site visit outcome, or customer feedback..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 placeholder-stone-400 text-xs outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={savingNote || !newNoteText.trim()}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{savingNote ? 'Logging...' : 'Add Note to Lead'}</span>
                  </button>
                </form>

                {/* Notes List */}
                <div className="space-y-2 pt-2">
                  {!selectedLead.lead_notes || selectedLead.lead_notes.length === 0 ? (
                    <p className="text-stone-400 text-xs italic py-2">
                      No follow-up notes logged yet.
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
        </div>
      )}
    </div>
  );
}
