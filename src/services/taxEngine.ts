import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TaxResult {
  grossSalary: number;
  netSalary: number;
  currency: string;
  incomeTax: number;
  socialSecurity: number;
  otherDeductions: { name: string; amount: number }[];
  taxBreakdown?: { bracket: string; rate: string; amount: number }[];
  explanation: string;
  costOfLiving: {
    total: number;
    breakdown: {
      category: string;
      amount: number;
      icon?: string;
    }[];
  };
  disposableIncome: number;
  optimizationTips: string[];
  b2bComparison?: {
    netSalary: number;
    explanation: string;
  };
  expatSavings?: {
    amount: number;
    explanation: string;
  };
  countryComparison?: {
    country: string;
    netSalary: number;
    currency: string;
  }[];
  socialRights?: {
    unemployment: string;
    retirement: string;
    healthInsurance: string;
  };
  lifestyleMatch?: {
    score: number;
    pros: string[];
    cons: string[];
    recommendation: string;
  };
  visaGuidance?: {
    type: string;
    requirements: string[];
    process: string;
  };
  nomadIndex?: {
    score: number;
    vibe: string;
    internetSpeed: string;
    nightlife: string;
  };
  taxSankeyData?: {
    source: string;
    target: string;
    value: number;
    label: string;
  }[];
}

const getPersistentCache = () => {
  try {
    const stored = localStorage.getItem('tax_calc_cache');
    if (stored) {
      return new Map<string, TaxResult>(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Failed to load cache', e);
  }
  return new Map<string, TaxResult>();
};

const savePersistentCache = (cache: Map<string, TaxResult>) => {
  try {
    const entries = Array.from(cache.entries());
    // Limit cache size to 50 entries to avoid localStorage limits
    const limitedEntries = entries.slice(-50);
    localStorage.setItem('tax_calc_cache', JSON.stringify(limitedEntries));
  } catch (e) {
    console.error('Failed to save cache', e);
  }
};

const cache = getPersistentCache();

export async function calculateTaxes(data: {
  country: string;
  city: string;
  grossSalary: number;
  period: string;
  maritalStatus: string;
  children: number;
  language: string;
  expatRegime?: string;
  taxYear: number;
  currencyCode: string;
  employmentType: string;
}): Promise<TaxResult> {
  // Stabilize cache key by sorting keys
  const stabilizedData = Object.keys(data).sort().reduce((acc: any, key) => {
    acc[key] = (data as any)[key];
    return acc;
  }, {});
  const cacheKey = JSON.stringify(stabilizedData);
  
  if (cache.has(cacheKey)) {
    console.log(`[TaxEngine] Cache hit for ${data.country} (${data.grossSalary})`);
    return cache.get(cacheKey)!;
  }
  console.log(`[TaxEngine] Cache miss for ${data.country} (${data.grossSalary}). Generating with key: ${cacheKey}`);
  
  const expatInstruction = data.expatRegime && data.expatRegime !== 'none' 
    ? `\n  - CRITICAL EXPAT REGIME: The user has selected the "${data.expatRegime}" regime for ${data.country}. 
    - You MUST apply the exact 2026 rules for this regime. 
    - For example: 
      - Netherlands: Apply the 2026 version of the 30% ruling (which may be scaled down to 30/20/10% depending on the specific 2026 legislation).
      - Spain: Apply Beckham Law (24% flat rate up to €600k).
      - Italy: Apply the updated 2026 Impatriati rules (likely 50% exemption for qualified workers).
      - Portugal: Apply the 'NHR 2.0' or 'IFIC' rules effective in 2026.
    - Explicitly mention the expat benefit in the 'explanation' and show the tax savings.`
    : '';

  const generalInstruction = `\n  - CRITICAL: In the 'explanation' field, you MUST explicitly state the basic tax-free allowance or the personal income tax credit amount applicable for ${data.country} in ${data.taxYear}. If there is no tax-free allowance, state that clearly.`;

  let specificRules = '';
  if (data.taxYear >= 2026) {
    specificRules = `
  - COMPREHENSIVE 2026 EU TAX UPDATE:
    - As of January 1, 2026, most EU countries have adjusted tax brackets for inflation (approx 2-4% increase in thresholds).
    - Germany 2026: Grundfreibetrag increased to approx €12,096. Social security rates slightly adjusted (Health ~16.3% total, Pension 18.6% total).
    - France 2026: Brackets adjusted by approx 2.1%. CSG/CRDS remains at 9.7%.
    - Netherlands 2026: Box 1 first bracket threshold increased. 30% ruling follows the 2024-2026 phase-down rules (30% for 20 months, 20% for 20 months, 10% for 20 months) unless the 2026 budget restored the full 30%.
    - Poland 2026: Tax-free allowance remains 30,000 PLN, but brackets for 32% may have shifted slightly.
    - Italy 2026: The 3-bracket IRPEF system (23%, 35%, 43%) is fully consolidated.
    - Spain 2026: Regional rates (e.g., Madrid, Catalonia) have been adjusted for 2026 inflation.
    - Austria 2026: The "Kalter Progression" (bracket creep) is fully eliminated; brackets are automatically adjusted by 100% of inflation. Social security approx 18.12%.
    - Belgium 2026: Tax reform phase 2 implemented; slightly lower rates on middle-income brackets to encourage employment.
    - Sweden 2026: Basic tax allowance (Grundavdrag) increased to approx 24,000 SEK. Municipal tax avg 32.2%.
    - Social Security Caps: Most countries (Germany, Austria, Poland, etc.) have increased their social security contribution ceilings (Beitragsbemessungsgrenzen) for 2026.
    - You MUST use these 2026-specific values.`;
  }

  if (data.country === 'Czech Republic' && data.taxYear >= 2024) {
    specificRules += `
  - RULES FOR CZECH REPUBLIC ${data.taxYear}:
    - Income Tax Brackets: 15% up to approx 1.6M CZK, 23% above.
    - Social Security: 7.1% for employees.
    - Health Insurance: 4.5%.
    - Tax Credits: Basic credit approx 30,840 CZK.`;
  } else if (data.country === 'Finland' && data.taxYear === 2026) {
    specificRules += `
  - DETAILED FINLAND 2026:
    - State Tax: Progressive (0% to 31.25%).
    - Municipal Tax: Avg 7.5% - 8.5%.
    - Yle Tax: 2.5% capped at ~€163.
    - Social Security: Pension ~7.15%, Unemployment ~0.79%.`;
  }
  const prompt = `You are a high-precision European tax engine. Mathematical accuracy and consistency are your top priorities. 
  
  CRITICAL DIRECTIVE: For the same input data, you MUST provide the exact same mathematical results. Do not hallucinate or vary the rates. Use official, verified tax data for ${data.country} in ${data.taxYear}. If you are unsure of a rate, use the most conservative official estimate but STAY CONSISTENT.

  Input Data:
  - Tax Year: ${data.taxYear}
  - Gross Salary: ${data.grossSalary} ${data.currencyCode} (${data.period})
  - Employment Type: ${data.employmentType}
  - Marital Status: ${data.maritalStatus}
  - Children: ${data.children}${expatInstruction}${specificRules}${generalInstruction}
  
  Calculation Protocol:
  1. Determine the Taxable Base (Gross - Social Security - Deductions).
  2. Apply Progressive Brackets step-by-step.
  3. Apply Tax Credits/Allowances.
  4. Calculate final Net.
  5. VERIFICATION: Double-check that (Net + Income Tax + Social Security + Other Deductions) equals the Gross Salary. If it doesn't, adjust the breakdown to be mathematically perfect.
  
  Task:
  1. The local currency is ${data.currencyCode}. All calculations and amounts MUST be in ${data.currencyCode}.
  2. Apply the official tax brackets, income tax rates, and social security contributions for ${data.country} and specifically ${data.city} that were in effect during the tax year ${data.taxYear}.
  3. Consider deductions based on marital status and children.
  4. Provide an accurate breakdown of Gross Salary, Income Tax, Social Security, Other Deductions, and the final Net Salary.
  5. Provide a detailed explanation of how the calculation was made.
  6. Provide a granular estimate of the average monthly Cost of Living (for 1 person) in ${data.city || 'the capital city'}, ${data.country} in ${data.currencyCode}. 
  7. Calculate the True Disposable Income (Net Salary minus Total Cost of Living).
  8. Provide 1 to 3 AI Tax Optimization Tips specific to ${data.country}.
  9. Provide comparison with the alternative employment type.
  10. Provide a comparison of what the net salary would be in 10 other major EU countries, sorted by net salary in descending order (highest to lowest).
  11. Provide a summary of Social Rights & Benefits for ${data.country} in ${data.language}.
  12. Lifestyle Match: Evaluate how well ${data.country} fits a high-quality expat lifestyle (Safety, Healthcare, Work-Life Balance).
  13. Visa & Residency: Provide specific guidance on the most relevant visa (e.g., Blue Card, Digital Nomad) for a professional with this salary.
  14. Nomad Index: Score the country for digital nomads (Internet, Vibe, Nightlife).
  15. Tax Sankey Data: Provide a breakdown of where the Gross Salary goes (Net, Income Tax, Social Security, and if possible, a sub-breakdown of tax usage like Infrastructure, Education, Health based on general country statistics).
  
  CRITICAL: The 'explanation', 'optimizationTips', 'b2bComparison.explanation', 'costOfLiving.breakdown.category', 'countryComparison.country', and 'socialRights' fields MUST be written in the ${data.language} language. Use Markdown formatting for explanations.`;

  const generateWithRetry = async (retries = 5, delay = 2000): Promise<string> => {
    try {
      // Create a fresh instance to ensure up-to-date config
      const aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await aiInstance.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          seed: 42,
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grossSalary: { type: Type.NUMBER, description: "Gross salary in local currency" },
              netSalary: { type: Type.NUMBER, description: "Net salary in local currency" },
              currency: { type: Type.STRING, description: "Local currency symbol (e.g., €, PLN, SEK)" },
              incomeTax: { type: Type.NUMBER, description: "Total income tax deducted" },
              socialSecurity: { type: Type.NUMBER, description: "Total social security contributions" },
              otherDeductions: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  }
                }
              },
              taxBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    bracket: { type: Type.STRING, description: "Name or range of the tax bracket (e.g., '0 - 10,000', 'Regional Tax', 'Solidarity Surcharge')" },
                    rate: { type: Type.STRING, description: "Tax rate applied (e.g., '0%', '15%', 'Progressive')" },
                    amount: { type: Type.NUMBER, description: "Amount of tax paid in this bracket" }
                  }
                },
                description: "Detailed breakdown of income tax, including tax brackets and any applicable regional variations."
              },
              explanation: { type: Type.STRING, description: "A detailed explanation of the tax brackets, regional taxes, and deductions applied. Explain how the net salary was reached. Use Markdown formatting." },
              costOfLiving: {
                type: Type.OBJECT,
                properties: {
                  total: { type: Type.NUMBER, description: "Total estimated cost of living for the period." },
                  breakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING, description: "Category name (e.g., Rent, Groceries, Transport)" },
                        amount: { type: Type.NUMBER, description: "Estimated amount for this category" },
                        icon: { type: Type.STRING, description: "A Lucide icon name string (e.g., 'Home', 'ShoppingBag', 'Bus', 'Zap')" }
                      }
                    }
                  }
                }
              },
              disposableIncome: { type: Type.NUMBER, description: "Net salary minus costOfLiving.total." },
              optimizationTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 3 actionable tax optimization tips or 'hacks' for this country."
              },
              b2bComparison: {
                type: Type.OBJECT,
                properties: {
                  netSalary: { type: Type.NUMBER, description: "Estimated net salary for the alternative employment type." },
                  explanation: { type: Type.STRING, description: "Short explanation of the alternative employment type calculation." }
                },
                description: "Comparison with the alternative employment type (B2B vs Employment)."
              },
              expatSavings: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Amount saved due to the expat regime." },
                  explanation: { type: Type.STRING, description: "Brief explanation of the savings." }
                },
                description: "Details of savings if an expat regime is applied."
              },
              countryComparison: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    country: { type: Type.STRING, description: "Name of the comparison country" },
                    netSalary: { type: Type.NUMBER, description: "Estimated net salary in that country (in EUR)" },
                    currency: { type: Type.STRING, description: "Currency symbol (e.g., €)" }
                  }
                },
                description: "Comparison of net salary in 10 other major EU countries for the same converted gross amount, sorted descending."
              },
              socialRights: {
                type: Type.OBJECT,
                properties: {
                  unemployment: { type: Type.STRING, description: "Brief description of unemployment benefits" },
                  retirement: { type: Type.STRING, description: "Standard retirement age" },
                  healthInsurance: { type: Type.STRING, description: "Brief description of public health coverage" }
                }
              },
              lifestyleMatch: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendation: { type: Type.STRING }
                }
              },
              visaGuidance: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                  process: { type: Type.STRING }
                }
              },
              nomadIndex: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  vibe: { type: Type.STRING },
                  internetSpeed: { type: Type.STRING },
                  nightlife: { type: Type.STRING }
                }
              },
              taxSankeyData: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    label: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["grossSalary", "netSalary", "currency", "incomeTax", "socialSecurity", "otherDeductions", "explanation", "costOfLiving", "disposableIncome", "optimizationTips", "socialRights", "lifestyleMatch", "visaGuidance", "nomadIndex", "taxSankeyData"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }
      return response.text;
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isQuotaError = 
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('429') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        error?.status === 429;

      if (isQuotaError && retries > 0) {
        console.warn(`Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateWithRetry(retries - 1, delay * 2);
      }
      throw error;
    }
  };

  const responseText = await generateWithRetry();
  const result = JSON.parse(responseText) as TaxResult;
  cache.set(cacheKey, result);
  savePersistentCache(cache);
  return result;
}
