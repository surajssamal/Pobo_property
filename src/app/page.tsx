import Image from 'next/image';
import EnquiryForm from '@/components/EnquiryForm';
import Navigation from '@/components/Navigation';
import {
  CheckCircle,
  MapPin,
  TrendingUp,
  Award
} from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between selection:bg-emerald-200 selection:text-stone-900">
      {/* Background Image with Natural Overlay */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
        <Image
          src="/Background.png"
          alt="Architectural landscape background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.92] contrast-[1.03] scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Natural gradient overlays for readability and warmth */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-900/35 to-stone-950/40" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* Top Navigation Bar with View Switcher */}
      <Navigation />

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-6 sm:py-12 z-10 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Story & Trust Badges */}
          <div className="lg:col-span-6 space-y-6 text-white text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 backdrop-blur-md text-xs font-medium">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>India&apos;s Trusted Premium Property Portal</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.15] text-white drop-shadow-md">
                Find Your Haven in Nature &amp; Luxury.
              </h1>
              <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-xl font-light drop-shadow">
                Tell us your vision. From serene seaside villas in Goa to high-rise sky residences in Mumbai
                and Bangalore, our direct property consultants match you with verified developments across all 28 Indian States.
              </p>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Pan-India Reach</span>
                </div>
                <p className="text-xs text-stone-300">
                  Curated listings spanning 28 states &amp; 8 union territories.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Transparent Pricing</span>
                </div>
                <p className="text-xs text-stone-300">
                  Zero brokerage on primary developer bookings.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>RERA Approved</span>
                </div>
                <p className="text-xs text-stone-300">
                  100% legal verification and title-clear projects.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
                  <Award className="w-4 h-4" />
                  <span>Dedicated Advisor</span>
                </div>
                <p className="text-xs text-stone-300">
                  Personal concierge from inquiry through site visit.
                </p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="pt-2 flex items-center gap-4 text-xs text-stone-300">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-emerald-700 flex items-center justify-center font-bold text-white text-[10px]">
                  AK
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-stone-700 flex items-center justify-center font-bold text-white text-[10px]">
                  RS
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-amber-700 flex items-center justify-center font-bold text-white text-[10px]">
                  MP
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-teal-800 flex items-center justify-center font-bold text-white text-[10px]">
                  VT
                </div>
              </div>
              <div>
                <p className="font-medium text-white">Rated 4.9/5 by 3,800+ buyers</p>
                <p className="text-stone-300 text-[11px]">Direct integration with Supabase real-time database</p>
              </div>
            </div>
          </div>

          {/* Right Column: Customer Enquiry Form */}
          <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
            <EnquiryForm />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-8 lg:px-16 py-6 z-10 border-t border-white/10 bg-stone-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-300">
          <p>© {new Date().getFullYear()} POBO Properties. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>RERA Registered</span>
            <span>•</span>
            <span>Direct Supabase Sync</span>
            <span>•</span>
            <span>Privacy Guaranteed</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
