'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { supabase, isSupabaseConfigured, checkPhoneDuplicateInSupabase } from '@/lib/supabaseClient';
import { recordNewSubmittedLead } from '@/lib/leadsService';
import { INDIAN_STATES, PROPERTY_TYPES, BUDGET_RANGES, PURCHASE_TIMELINES } from '@/lib/constants';
import {
  getClean10DigitPhone,
  formatIndianDisplayPhone,
  isValidIndianPhone,
  findLocalDuplicate,
  saveLocalSubmission,
  LocalSubmission
} from '@/lib/phoneUtils';
import {
  User,
  Phone,
  MapPin,
  IndianRupee,
  Building2,
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  PhoneCall
} from 'lucide-react';

interface FormData {
  name: string;
  phone: string;
  preferredLocation: string;
  budget: string;
  customBudget: string;
  propertyType: string;
  purchaseTimeline: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  preferredLocation?: string;
  budget?: string;
  customBudget?: string;
  propertyType?: string;
  purchaseTimeline?: string;
  notes?: string;
}

export default function EnquiryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    preferredLocation: '',
    budget: '',
    customBudget: '',
    propertyType: '',
    purchaseTimeline: '',
    notes: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Duplicate phone state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateDetected, setDuplicateDetected] = useState<{
    phone: string;
    cleanPhone: string;
    details?: LocalSubmission;
  } | null>(null);
  const [allowDuplicateBypass, setAllowDuplicateBypass] = useState(false);

  // Field validation logic
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'name': {
        const trimmed = value.trim();
        if (!trimmed) {
          return 'Full name is required';
        }
        if (trimmed.length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
          return 'Name should only contain letters, spaces, hyphens, and dots';
        }
        return undefined;
      }

      case 'phone': {
        const trimmed = value.trim();
        if (!trimmed) {
          return 'Phone number is required';
        }
        if (!isValidIndianPhone(trimmed)) {
          return 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)';
        }
        return undefined;
      }

      case 'preferredLocation': {
        if (!value.trim()) {
          return 'Please select your preferred Indian state / UT';
        }
        return undefined;
      }

      case 'budget': {
        if (!value.trim()) {
          return 'Please select your planned budget range';
        }
        return undefined;
      }

      case 'customBudget': {
        if (formData.budget === 'Custom Budget') {
          const trimmed = value.trim();
          if (!trimmed) {
            return 'Please enter your custom budget';
          }
          if (trimmed.length < 2) {
            return 'Please provide a valid budget specification';
          }
        }
        return undefined;
      }

      case 'propertyType': {
        if (!value.trim()) {
          return 'Please select your desired property type';
        }
        return undefined;
      }

      case 'purchaseTimeline': {
        if (!value.trim()) {
          return 'Please choose your expected purchase timeline';
        }
        return undefined;
      }

      case 'notes': {
        if (value.length > 500) {
          return 'Notes cannot exceed 500 characters';
        }
        return undefined;
      }

      default:
        return undefined;
    }
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};
    const keys: (keyof FormData)[] = [
      'name',
      'phone',
      'preferredLocation',
      'budget',
      'propertyType',
      'purchaseTimeline',
    ];

    if (formData.budget === 'Custom Budget') {
      keys.push('customBudget');
    }

    keys.forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'phone') {
      setDuplicateWarning(null);
      setAllowDuplicateBypass(false);
    }

    if (touched[name]) {
      const fieldError = validateField(name as keyof FormData, value);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  };

  // Check for duplicates on blur of phone input
  const handlePhoneBlur = async (phoneVal: string) => {
    if (!isValidIndianPhone(phoneVal)) return;

    const clean = getClean10DigitPhone(phoneVal);
    const formatted = formatIndianDisplayPhone(phoneVal);

    // Format input nicely
    setFormData((prev) => ({
      ...prev,
      phone: formatted,
    }));

    // 1. Check local browser submission history
    const localDup = findLocalDuplicate(clean);
    if (localDup) {
      setDuplicateWarning(
        `Notice: You previously submitted an enquiry with this number (Ref: ${localDup.referenceId}). Submitting will log an updated requirement.`
      );
      return;
    }

    // 2. Check Supabase RPC if configured
    try {
      const dbExists = await checkPhoneDuplicateInSupabase(clean);
      if (dbExists) {
        setDuplicateWarning(
          'Notice: This mobile number is already registered in our enquiry database. Submitting again will log an updated requirement.'
        );
      }
    } catch {
      // Ignore RPC check failure
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name as keyof FormData, value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));

    if (name === 'phone') {
      handlePhoneBlur(value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {
      name: true,
      phone: true,
      preferredLocation: true,
      budget: true,
      customBudget: true,
      propertyType: true,
      purchaseTimeline: true,
      notes: true,
    };
    setTouched(allTouched);

    const isValid = validateAll();
    if (!isValid) {
      return;
    }

    const clean = getClean10DigitPhone(formData.phone);
    const formattedPhone = formatIndianDisplayPhone(formData.phone);

    // Duplicate verification prior to submit unless user confirmed bypass
    if (!allowDuplicateBypass) {
      const localDup = findLocalDuplicate(clean);
      if (localDup) {
        setDuplicateDetected({
          phone: formattedPhone,
          cleanPhone: clean,
          details: localDup,
        });
        return;
      }

      // Check Supabase DB
      const dbExists = await checkPhoneDuplicateInSupabase(clean);
      if (dbExists) {
        setDuplicateDetected({
          phone: formattedPhone,
          cleanPhone: clean,
        });
        return;
      }
    }

    setIsSubmitting(true);

    const finalBudget =
      formData.budget === 'Custom Budget' && formData.customBudget
        ? `Custom: ${formData.customBudget.trim()}`
        : formData.budget;

    // If duplicate was acknowledged and bypassed, tag in notes for sales team
    const updatedNotes = allowDuplicateBypass
      ? `[REPEAT ENQUIRY / UPDATE] ${formData.notes.trim()}`
      : formData.notes.trim();

    const payload = {
      name: formData.name.trim(),
      phone: formattedPhone,
      preferred_location: formData.preferredLocation,
      budget: finalBudget,
      property_type: formData.propertyType,
      purchase_timeline: formData.purchaseTimeline,
      notes: updatedNotes || null,
    };

    try {
      if (isSupabaseConfigured) {
        // Attempt insert into 'leads' (CRM table from some.sql)
        const leadsPayload = {
          name: formData.name.trim(),
          phone: formattedPhone,
          preferred_location: formData.preferredLocation,
          budget: finalBudget,
          property_type: formData.propertyType,
          purchase_timeline: formData.purchaseTimeline,
          status: 'New',
        };

        const { error: leadsError } = await supabase
          .from('leads')
          .insert([leadsPayload]);

        if (leadsError) {
          // Check for unique constraint violation (code 23505)
          const isUniqueViolation =
            leadsError.code === '23505' ||
            leadsError.message?.toLowerCase().includes('unique') ||
            leadsError.message?.toLowerCase().includes('duplicate');

          if (isUniqueViolation) {
            setDuplicateDetected({
              phone: formattedPhone,
              cleanPhone: clean,
            });
            setIsSubmitting(false);
            return;
          }

          // If RLS blocked insert on 'leads', also try customer_enquiries
          await supabase.from('customer_enquiries').insert([payload]);
        }

        const generatedId = `ENQ-${Date.now().toString(36).toUpperCase()}`;
        setReferenceId(generatedId);

        // Record in local CRM cache so Admin and Worker tables immediately display it
        recordNewSubmittedLead({
          name: formData.name.trim(),
          phone: formattedPhone,
          preferred_location: formData.preferredLocation,
          budget: finalBudget,
          property_type: formData.propertyType,
          purchase_timeline: formData.purchaseTimeline,
          status: 'New',
          notes: updatedNotes || null,
        });

        // Record in local duplicate tracker
        saveLocalSubmission({
          phone: formattedPhone,
          cleanPhone: clean,
          name: formData.name.trim(),
          referenceId: generatedId,
        });
      } else {
        // Fallback demo mode
        await new Promise((resolve) => setTimeout(resolve, 800));
        const demoId = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setReferenceId(demoId);

        recordNewSubmittedLead({
          name: formData.name.trim(),
          phone: formattedPhone,
          preferred_location: formData.preferredLocation,
          budget: finalBudget,
          property_type: formData.propertyType,
          purchase_timeline: formData.purchaseTimeline,
          status: 'New',
          notes: updatedNotes || null,
        });

        saveLocalSubmission({
          phone: formattedPhone,
          cleanPhone: clean,
          name: formData.name.trim(),
          referenceId: demoId,
        });
      }

      setSubmitSuccess(true);
      setDuplicateDetected(null);
    } catch (err: unknown) {
      console.error('Submission error:', err);
      if (err instanceof Error) {
        setSubmitError(err.message || 'Failed to submit enquiry. Please try again.');
      } else {
        setSubmitError('Failed to submit enquiry. Please check your Supabase configuration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedAsUpdate = () => {
    setAllowDuplicateBypass(true);
    setDuplicateDetected(null);
    // Auto-trigger submit with bypass
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as FormEvent;
      handleSubmit(fakeEvent);
    }, 50);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      preferredLocation: '',
      budget: '',
      customBudget: '',
      propertyType: '',
      purchaseTimeline: '',
      notes: '',
    });
    setTouched({});
    setErrors({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setReferenceId('');
    setDuplicateDetected(null);
    setDuplicateWarning(null);
    setAllowDuplicateBypass(false);
  };

  const regularStates = INDIAN_STATES.slice(0, 28);
  const unionTerritories = INDIAN_STATES.slice(28);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Supabase status banner if credentials are not configured */}
      {!isSupabaseConfigured && (
        <div className="mb-4 p-3.5 bg-amber-50/95 border border-amber-200/80 rounded-2xl shadow-sm text-xs text-amber-900 flex items-start gap-2.5 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-amber-800">Supabase Setup Notice:</span> Add your{' '}
            <code className="bg-amber-100/70 px-1.5 py-0.5 rounded font-mono text-amber-900">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="bg-amber-100/70 px-1.5 py-0.5 rounded font-mono text-amber-900">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{' '}
            in <code className="bg-amber-100/70 px-1.5 py-0.5 rounded font-mono">.env.local</code>.
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* 1. DUPLICATE PHONE HANDLING MODAL / SCREEN */}
        {duplicateDetected ? (
          <div className="py-4 space-y-6 text-center animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-700 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                Duplicate Mobile Number Detected
              </span>
              <h3 className="text-2xl font-serif font-bold text-stone-800 tracking-tight">
                Active Enquiry Already Exists
              </h3>
              <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed">
                An enquiry registered under <strong className="text-stone-900 font-semibold">{duplicateDetected.phone}</strong>{' '}
                is already in our system. Our property advisory team is already preparing matching options.
              </p>
            </div>

            {duplicateDetected.details && (
              <div className="p-3.5 rounded-2xl bg-stone-100/80 border border-stone-200 text-xs text-stone-700 max-w-sm mx-auto space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Registered Name:</span>
                  <span className="font-semibold">{duplicateDetected.details.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Previous Ref:</span>
                  <span className="font-mono font-medium">{duplicateDetected.details.referenceId}</span>
                </div>
              </div>
            )}

            {/* Action options for duplicate handling */}
            <div className="space-y-2.5 max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={handleProceedAsUpdate}
                className="w-full py-3 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Submit as Updated Preference</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setDuplicateDetected(null)}
                className="w-full py-2.5 px-5 rounded-xl bg-white/80 hover:bg-white text-stone-700 border border-stone-200 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-stone-500" />
                <span>Change Mobile Number</span>
              </button>

              <a
                href="tel:1800000000"
                className="inline-flex items-center justify-center gap-2 text-xs font-medium text-emerald-800 hover:text-emerald-950 pt-2"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Speak directly with priority concierge</span>
              </a>
            </div>
          </div>
        ) : submitSuccess ? (
          /* 2. SUCCESS SCREEN */
          <div className="py-6 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" /> Enquiry Received
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800 tracking-tight">
                Thank You, {formData.name.split(' ')[0]}!
              </h3>
              <p className="text-stone-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Your enquiry has been successfully logged into our database. Our dedicated property advisor
                will contact you within 24 hours.
              </p>
            </div>

            {/* Reference Card */}
            <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-left text-xs sm:text-sm space-y-2 max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200/60">
                <span className="text-stone-500 font-medium">Reference ID</span>
                <span className="font-mono font-semibold text-stone-800 bg-stone-200/60 px-2 py-0.5 rounded">
                  {referenceId}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-stone-600">
                <div>
                  <span className="block text-stone-400 text-xs">Mobile Number</span>
                  <span className="font-medium text-stone-700">{formData.phone}</span>
                </div>
                <div>
                  <span className="block text-stone-400 text-xs">Preferred Location</span>
                  <span className="font-medium text-stone-700">{formData.preferredLocation}</span>
                </div>
                <div>
                  <span className="block text-stone-400 text-xs">Property Type</span>
                  <span className="font-medium text-stone-700">{formData.propertyType}</span>
                </div>
                <div>
                  <span className="block text-stone-400 text-xs">Budget Range</span>
                  <span className="font-medium text-stone-700">
                    {formData.budget === 'Custom Budget' ? formData.customBudget : formData.budget}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Submit Another Enquiry
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* 3. MAIN CUSTOMER ENQUIRY FORM */
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Form Header */}
            <div className="space-y-1.5 pb-2 border-b border-stone-200/60">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100/90 text-stone-700 border border-stone-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Bespoke Property Search</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800 tracking-tight">
                Customer Enquiry
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                Share your property requirements and we will match you with curated options.
              </p>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Submission failed</p>
                  <p>{submitError}</p>
                </div>
              </div>
            )}

            {/* 1. Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-10 py-2.5 bg-white/70 hover:bg-white focus:bg-white text-stone-800 placeholder-stone-400 text-sm rounded-xl border transition-all outline-none focus:ring-2 ${
                    touched.name && errors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : touched.name && !errors.name
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                />
                {touched.name && !errors.name && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              {touched.name && errors.name && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
                </p>
              )}
            </div>

            {/* 2. Phone with Duplicate Handling Logic */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="e.g. 98765 43210 or +91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-10 py-2.5 bg-white/70 hover:bg-white focus:bg-white text-stone-800 placeholder-stone-400 text-sm rounded-xl border transition-all outline-none focus:ring-2 ${
                    touched.phone && errors.phone
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : duplicateWarning
                      ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
                      : touched.phone && !errors.phone
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                />
                {touched.phone && !errors.phone && !duplicateWarning && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {duplicateWarning && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Duplicate phone advisory */}
              {duplicateWarning && !errors.phone && (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {touched.phone && errors.phone ? (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
                </p>
              ) : !duplicateWarning ? (
                <p className="mt-1 text-[11px] text-stone-400">
                  Normalized to standard Indian +91 format with duplicate detection
                </p>
              ) : null}
            </div>

            {/* 3. Preferred Location (Indian States Dropdown) */}
            <div>
              <label
                htmlFor="preferredLocation"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                Preferred Location (Indian State / UT) <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  id="preferredLocation"
                  name="preferredLocation"
                  value={formData.preferredLocation}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-9 py-2.5 bg-white/80 hover:bg-white focus:bg-white text-stone-800 text-sm rounded-xl border appearance-none transition-all outline-none focus:ring-2 cursor-pointer ${
                    !formData.preferredLocation ? 'text-stone-400' : 'text-stone-800'
                  } ${
                    touched.preferredLocation && errors.preferredLocation
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : touched.preferredLocation && !errors.preferredLocation
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                >
                  <option value="" disabled>
                    Select an Indian state or UT...
                  </option>
                  <optgroup label="States">
                    {regularStates.map((state) => (
                      <option key={state} value={state} className="text-stone-800">
                        {state}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Union Territories">
                    {unionTerritories.map((ut) => (
                      <option key={ut} value={ut} className="text-stone-800">
                        {ut}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {touched.preferredLocation && errors.preferredLocation && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.preferredLocation}
                </p>
              )}
            </div>

            {/* 4. Budget Range & Custom Budget */}
            <div>
              <label htmlFor="budget" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Estimated Budget <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <select
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-9 py-2.5 bg-white/80 hover:bg-white focus:bg-white text-sm rounded-xl border appearance-none transition-all outline-none focus:ring-2 cursor-pointer ${
                    !formData.budget ? 'text-stone-400' : 'text-stone-800'
                  } ${
                    touched.budget && errors.budget
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : touched.budget && !errors.budget
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                >
                  <option value="" disabled>
                    Select your budget range...
                  </option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b} value={b} className="text-stone-800">
                      {b}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Custom budget input if 'Custom Budget' is selected */}
              {formData.budget === 'Custom Budget' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    id="customBudget"
                    name="customBudget"
                    placeholder="Enter custom amount (e.g., ₹1.75 Cr, ₹85 Lakhs)"
                    value={formData.customBudget}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 bg-white/70 hover:bg-white focus:bg-white text-stone-800 placeholder-stone-400 text-sm rounded-xl border transition-all outline-none focus:ring-2 ${
                      touched.customBudget && errors.customBudget
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                    }`}
                  />
                  {touched.customBudget && errors.customBudget && (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.customBudget}
                    </p>
                  )}
                </div>
              )}

              {touched.budget && errors.budget && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.budget}
                </p>
              )}
            </div>

            {/* 5. Property Type (Dropdown) */}
            <div>
              <label
                htmlFor="propertyType"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                Property Type <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-9 py-2.5 bg-white/80 hover:bg-white focus:bg-white text-sm rounded-xl border appearance-none transition-all outline-none focus:ring-2 cursor-pointer ${
                    !formData.propertyType ? 'text-stone-400' : 'text-stone-800'
                  } ${
                    touched.propertyType && errors.propertyType
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : touched.propertyType && !errors.propertyType
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                >
                  <option value="" disabled>
                    Choose property category...
                  </option>
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt} className="text-stone-800">
                      {pt}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {touched.propertyType && errors.propertyType && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.propertyType}
                </p>
              )}
            </div>

            {/* 6. Purchase Timeline (Dropdown) */}
            <div>
              <label
                htmlFor="purchaseTimeline"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                Purchase Timeline <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <select
                  id="purchaseTimeline"
                  name="purchaseTimeline"
                  value={formData.purchaseTimeline}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-9 py-2.5 bg-white/80 hover:bg-white focus:bg-white text-sm rounded-xl border appearance-none transition-all outline-none focus:ring-2 cursor-pointer ${
                    !formData.purchaseTimeline ? 'text-stone-400' : 'text-stone-800'
                  } ${
                    touched.purchaseTimeline && errors.purchaseTimeline
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                      : touched.purchaseTimeline && !errors.purchaseTimeline
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200'
                      : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
                  }`}
                >
                  <option value="" disabled>
                    When do you plan to acquire?
                  </option>
                  {PURCHASE_TIMELINES.map((tl) => (
                    <option key={tl} value={tl} className="text-stone-800">
                      {tl}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {touched.purchaseTimeline && errors.purchaseTimeline && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.purchaseTimeline}
                </p>
              )}
            </div>

            {/* 7. Optional Notes / Specific Preferences */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="notes" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Additional Preferences <span className="text-stone-400 font-normal lowercase">(optional)</span>
                </label>
                <span className="text-[11px] text-stone-400">
                  {formData.notes.length}/500
                </span>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-stone-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Near metro, sea-facing, east-facing Vastu compliant..."
                  value={formData.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white/70 hover:bg-white focus:bg-white text-stone-800 placeholder-stone-400 text-sm rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all outline-none resize-none"
                />
              </div>
              {touched.notes && errors.notes && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.notes}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium text-white text-sm sm:text-base shadow-lg transition-all duration-200 bg-gradient-to-r from-emerald-800 via-stone-800 to-stone-900 hover:from-emerald-700 hover:to-stone-800 active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying &amp; Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Enquiry</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Trust and privacy badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-stone-600">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Duplicate Protection</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Fast 24-Hour Callback</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Direct Developer Pricing</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
