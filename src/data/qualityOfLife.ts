export interface QualityOfLife {
  safety: number;
  healthcare: number;
  pollution: number;
  internet: number;
  purchasingPower: number;
}

export const countryQualityOfLife: Record<string, QualityOfLife> = {
  "Austria": { safety: 85, healthcare: 80, pollution: 20, internet: 75, purchasingPower: 82 },
  "Belgium": { safety: 65, healthcare: 85, pollution: 35, internet: 80, purchasingPower: 78 },
  "Bulgaria": { safety: 60, healthcare: 50, pollution: 55, internet: 85, purchasingPower: 45 },
  "Croatia": { safety: 75, healthcare: 65, pollution: 30, internet: 70, purchasingPower: 55 },
  "Cyprus": { safety: 70, healthcare: 70, pollution: 30, internet: 65, purchasingPower: 65 },
  "Czech Republic": { safety: 80, healthcare: 75, pollution: 35, internet: 75, purchasingPower: 70 },
  "Denmark": { safety: 85, healthcare: 85, pollution: 15, internet: 90, purchasingPower: 90 },
  "Estonia": { safety: 80, healthcare: 70, pollution: 20, internet: 95, purchasingPower: 65 },
  "Finland": { safety: 90, healthcare: 85, pollution: 10, internet: 85, purchasingPower: 85 },
  "France": { safety: 60, healthcare: 85, pollution: 30, internet: 80, purchasingPower: 75 },
  "Germany": { safety: 75, healthcare: 85, pollution: 25, internet: 70, purchasingPower: 85 },
  "Greece": { safety: 60, healthcare: 60, pollution: 45, internet: 60, purchasingPower: 50 },
  "Hungary": { safety: 70, healthcare: 55, pollution: 40, internet: 85, purchasingPower: 55 },
  "Ireland": { safety: 70, healthcare: 65, pollution: 20, internet: 75, purchasingPower: 80 },
  "Italy": { safety: 65, healthcare: 75, pollution: 40, internet: 70, purchasingPower: 65 },
  "Latvia": { safety: 70, healthcare: 60, pollution: 25, internet: 85, purchasingPower: 55 },
  "Lithuania": { safety: 75, healthcare: 65, pollution: 25, internet: 90, purchasingPower: 60 },
  "Luxembourg": { safety: 85, healthcare: 85, pollution: 20, internet: 85, purchasingPower: 95 },
  "Malta": { safety: 70, healthcare: 75, pollution: 40, internet: 75, purchasingPower: 65 },
  "Netherlands": { safety: 80, healthcare: 85, pollution: 25, internet: 90, purchasingPower: 88 },
  "Poland": { safety: 75, healthcare: 60, pollution: 50, internet: 80, purchasingPower: 60 },
  "Portugal": { safety: 80, healthcare: 70, pollution: 25, internet: 75, purchasingPower: 60 },
  "Romania": { safety: 70, healthcare: 50, pollution: 55, internet: 90, purchasingPower: 50 },
  "Slovakia": { safety: 75, healthcare: 60, pollution: 35, internet: 75, purchasingPower: 60 },
  "Slovenia": { safety: 85, healthcare: 75, pollution: 20, internet: 75, purchasingPower: 70 },
  "Spain": { safety: 70, healthcare: 80, pollution: 30, internet: 85, purchasingPower: 75 },
  "Sweden": { safety: 70, healthcare: 80, pollution: 15, internet: 85, purchasingPower: 85 }
};
