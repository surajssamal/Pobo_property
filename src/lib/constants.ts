import { LeadStatus } from '@/types/crm';

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const PROPERTY_TYPES = [
  "Luxury Villa / Bungalow",
  "Premium High-Rise Apartment",
  "Penthouse",
  "Gated Community Residential Plot",
  "Independent Duplex / Row House",
  "Studio / 1 BHK Apartment",
  "Commercial / Office Space",
  "Farmhouse / Holiday Retreat",
] as const;

export const BUDGET_RANGES = [
  "₹30 Lakhs - ₹60 Lakhs",
  "₹60 Lakhs - ₹1 Crore",
  "₹1 Crore - ₹2.5 Crores",
  "₹2.5 Crores - ₹5 Crores",
  "₹5 Crores - ₹10 Crores",
  "Above ₹10 Crores",
  "Custom Budget",
] as const;

export const PURCHASE_TIMELINES = [
  "Immediate (Within 15-30 days)",
  "1 to 3 Months",
  "3 to 6 Months",
  "6+ Months (Future Planning & Investment)",
] as const;

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Site Visit',
  'Won',
  'Lost',
];

export const STATUS_STYLES: Record<
  LeadStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  New: {
    label: 'New Lead',
    bg: 'bg-blue-50/90',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  Contacted: {
    label: 'Contacted',
    bg: 'bg-amber-50/90',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  Qualified: {
    label: 'Qualified',
    bg: 'bg-purple-50/90',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  'Site Visit': {
    label: 'Site Visit',
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  Won: {
    label: 'Won Deal',
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    dot: 'bg-green-600',
  },
  Lost: {
    label: 'Lost',
    bg: 'bg-rose-50/90',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-400',
  },
};
