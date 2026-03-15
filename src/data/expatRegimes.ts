export interface ExpatRegime {
  id: string;
  label: string;
}

export const expatRegimes: Record<string, ExpatRegime[]> = {
  "Netherlands": [
    { id: "30_ruling", label: "30% Ruling (30% tax-free allowance)" }
  ],
  "Spain": [
    { id: "beckham_law", label: "Beckham Law (Flat 24% up to €600k)" }
  ],
  "Italy": [
    { id: "impatriati", label: "Impatriate Regime (50%-90% tax exemption)" }
  ],
  "France": [
    { id: "impatriate", label: "Impatriate Regime (Up to 30% exemption)" }
  ],
  "Portugal": [
    { id: "nhr", label: "Non-Habitual Resident - NHR (Flat 20%)" }
  ],
  "Sweden": [
    { id: "expert_tax", label: "Expert Tax Relief (25% income exempt)" }
  ],
  "Denmark": [
    { id: "expat_scheme", label: "Expatriate Tax Scheme (Flat 27% + AM-bidrag)" }
  ],
  "Finland": [
    { id: "key_employee", label: "Key Employee Tax (Flat 25%)" }
  ],
  "Ireland": [
    { id: "sarp", label: "Special Assignee Relief Programme - SARP (30% exemption > €100k)" }
  ],
  "Cyprus": [
    { id: "50_exemption", label: "50% Exemption (For income > €55k)" },
    { id: "20_exemption", label: "20% Exemption (For income < €55k)" }
  ],
  "Greece": [
    { id: "foreign_resident", label: "Foreign Tax Resident (50% tax exemption)" }
  ],
  "Malta": [
    { id: "hqp", label: "Highly Qualified Persons (Flat 15%)" }
  ],
  "Belgium": [
    { id: "expat_status", label: "Special Tax Status for Foreign Executives" }
  ]
};
