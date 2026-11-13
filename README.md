# EU Tax Calculator — Avrupa'da Gerçek Net Maaşını Bil

27 AB ülkesinde brütten nete maaş hesaplama uygulaması. Resmi 2025/2026 vergi dilimleri, sosyal güvenlik kesintileri, expat vergi rejimleri, yaşam maliyeti ve vize rehberliği — **tamamı çevrimdışı**, kayıt yok, API anahtarı yok.

**Canlı demo:** https://erdalbirinci.github.io/EU-Tax-Calculator/

![Hero ve hızlı deneme](docs/screenshots/01-hero.png)

## Özellikler

### Hesaplayıcı
- **27 AB ülkesi**, resmi 2025/2026 gelir vergisi dilimleri + çalışan sosyal güvenlik oranları
- **Brüt → Net ve Net → Brüt** (hedef nete göre gerekli brütü bulan çözücü)
- Medeni durum, çocuk sayısı, şehir, 12/13/14 maaş seçeneği
- **Ülkeye özel vergi mantığı:** Fransa quotient familial (1.807 € tavanlı), Almanya eş bölüşümü (Ehegattensplitting), Avusturya %6 sabit bonus vergisi
- **Expat rejimleri:** Hollanda 30% ruling, İspanya Beckham Law, İtalya impatriati, Fransa impatriate, Portekiz IFIC, İrlanda SARP, İsveç uzman indirimi, Danimarka araştırmacı tarifesi, Finlandiya kilit personel, Malta HQP, Kıbrıs/GYunanistan muafiyetleri — standart vs. rejimli vergi yan yana
- İşveren maliyeti, satın alma gücü paritesi (PPP), EU Blue Card uygunluk kontrolü, emeklilik projeksiyonu

![Hesaplama sonucu](docs/screenshots/03-results.png)

### Karşılaştırma ve harita
- **27 ülke karşılaştırma grafiği:** tek brütle tüm AB'de net maaş sıralaması (EUR normalize); bara tıklayınca o ülke hesaplanır
- **Vergi ısı haritası:** efektif üst dilim oranlarına göre renklendirilmiş çevrimdışı SVG Avrupa haritası (d3-geo, gömülü sınır verisi)
- Ülke seçimde mini bilgi kartı: üst dilim, sosyal oran, 60.000 € örneği

![27 ülke karşılaştırma](docs/screenshots/02-comparison.png)
![Harita ve form](docs/screenshots/04-map-guides.png)

### Sonuç zenginleştirme (tamamı yerel)
Hesap sonrası; yaşam maliyeti dökümü, harcanabilir gelir, vergi optimizasyon ipuçları, yaşam tarzı skoru, göçmen indeksi, vize rehberliği, sosyal haklar özeti, emeklilik görünümü, ülke karşılaştırma tablosu, vergi akış (Sankey) grafiği, B2B alternatif tahmini.

### Paylaşım ve dışa aktarma
- Sonuçlu paylaşım linki (kopyala), e-posta raporu, özet kopyalama
- **PDF raporu** (tek tıkla A4 çıktı), yazdırma dostu CSS
- Kayıtlı senaryolar (3'e kadar yan yana kıyas), geçmiş (10 kayıt) + **CSV dışa aktarma**
- 27 ülke vergi rehberi sayfaları (`#/guide/ülke-adı`), 27 resmi vergi dairesi linki
- 6 dil (EN/DE/FR/IT/ES/TR), karanlık mod, klavye erişilebilirliği

## Nasıl çalışıyor?

```
Kullanıcı girdisi
  → Deterministik motor (src/data/taxRules.ts + src/services/taxEngine.ts)
  → Yerel zenginleştirme (aynı dosya içinde, gömülü veri setlerinden)
  → Sonuç ekranı (<100ms, çevrimdışı)
```

- **Rakamlar** dilim tablolarından adım adım hesaplanır; aynı girdiye her zaman aynı sonuç.
- **Yorumlar** (yaşam maliyeti, ipuçları, vize) gömülü veri setlerinden üretilir; rakamları asla değiştirmez.
- Harici servise istek atılmaz. Eskiden kullanılan bulut yapay zekâ entegrasyonu tamamen kaldırılmıştır; proje geçmişinde `GEMINI_API_KEY` geçen dosyalar temizlendi (`.env.example`, `vite.config.ts`, `package.json`).

## Vergi tabloları ve kaynaklar

Tablolar `src/data/taxRules.ts` içindedir; eşik/oranlar resmi kaynaklardan doğrulanmıştır (2025/2026):

| Ülke | Kaynak | Not |
|---|---|---|
| Almanya | BMF §32a EStG | 2026 tarifesine parçalı-doğrusal uyum (±%7) |
| Avusturya | BMF Tarifstufen 2025 | %40 (2024'ten beri), eşikler endeksli |
| Fransa | service-public.gouv.fr / BOFiP | 2026 baremi + quotient familial (tavan 1.807 €) |
| İtalya | Agenzia delle Entrate | IRPEF 23/25/43 |
| Belçika | PwC Tax Summaries (2025) | 16.320 / 28.800 / 49.840 |
| Hollanda | Belastingdienst | Box 1: %35,82 / %37,48 / %49,5 |
| Portekiz | State Budget 2025 | Eşikler +%4,62, oranlar %13'ten başlar |
| İspanya | Agencia Tributaria | Eyalet+merkez birleşik yaklaşım |
| İrlanda | Revenue | PAYE %20/%40 + USC/PRSI harmanlanmış |
| İsveç | Skatteverket | Skiktgräns 625.800 kr (2025) |
| Danimarka | skat.dk | AM %8 + alt/vergi %37,02 + topskat %15 (611.800 kr üstü), tavan %52,07 |
| Litvanya | VMI | 126.533 €'ya kadar %20, üstü %32 (2025) |
| Letonya | Maliye Bakanlığı | 2025 reformu: %25,5 / %33 (+200.000 € üstü +3 puan) |
| Çekya | KPMG Tax Card 2025 | 1.676.052 CZK üstü %23 |
| Slovakya | PwC | 48.441 €'ya kadar %19, üstü %25 (2025) |
| Diğerleri | EC Taxation Trends + ulusal idareler | Footer'daki 27 resmi linkten doğrulanabilir |

Otomatik doğrulama: `npm run verify-taxes` — 27 ülke × 12 gelir seviyesi × medeni durum × çocuk sayısı için muhasebe kimliği (`net + vergi + sosyal = brüt`), monotonluk, net→brüt çözücü turu ve 30+ resmi tarife noktası kontrolü. Detay: `scripts/verify-taxes.ts`.

## Geliştirme

**Gereksinim:** Node.js 18+

```bash
npm install     # bağımlılıklar
npm run dev     # geliştirme sunucusu (http://localhost:3000)
npm run build   # üretim derlemesi (dist/)
npm run lint    # tsc tip kontrolü
npm run verify-taxes  # vergi motoru doğrulama testleri
```

**Önizleme ana makine adı:** `npm run dev` varsayılan olarak `PREVIEW_HOSTS` env değişkeninde verilen hostlara izin verir:

```bash
PREVIEW_HOSTS="ornek.style.dev" npm run dev
```

**Yayınlama:** `main` dalına push, `.github/workflows/deploy.yml` ile GitHub Pages'e otomatik yayınlar (`base: './'` göreli yol kullanır).

## Proje yapısı

```
src/
  data/
    taxRules.ts        # 27 ülke dilim tabloları (resmi 2025/2026)
    marketExtras.ts    # rehber özetleri, işveren oranları, PPP, Blue Card, rejim etkileri
    socialExtras.ts    # aile indirimi, bonus vergisi, şehir COL, vize/emeklilik verileri
    cities.ts, cityCoordinates.ts, currencies.ts, expatRegimes.ts,
    qualityOfLife.ts, taxAuthorities.ts, europe.json  # gömülü harita
  services/
    taxEngine.ts       # deterministik motor + yerel zenginleştirme (çevrimdışı)
  components/
    TaxCalculator.tsx  # form + sonuç ekranı
    CountryCompare.tsx # 27 ülke karşılaştırma grafiği
    EuropeMap.tsx      # çevrimdışı SVG harita (d3-geo)
    CountryGuide.tsx   # ülke rehber sayfaları
    TaxSankey.tsx, CountUp.tsx
  i18n/                # 6 dil çevirileri
scripts/
  verify-taxes.ts      # vergi doğrulama koşumu
docs/screenshots/      # README görselleri
```

## Sınırlılıklar

Tahmin aracıdır, vergi danışmanlığı değildir. Bölgesel ek vergiler (İspanya özerk bölgeleri, İtalya bölge/belediye ekleri, Belçika belediye vergisi), kilise vergisi ve kişisel kesintilerin bir kısmı modellenmez. Estonya temel muafiyeti ve Slovakya'nın 2026'da eklenen üst dilimleri yaklaşıktır. Sözleşme imzalamadan önce yerel vergi dairenizle teyit edin.
