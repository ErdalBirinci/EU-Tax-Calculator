export const taxAuthorities: Record<string, { name: string; url: string }> = {
  "Austria": { name: "FinanzOnline (BMF)", url: "https://finanzonline.bmf.gv.at/" },
  "Belgium": { name: "SPF Finances", url: "https://finances.belgium.be/" },
  "Czech Republic": { name: "Finanční správa", url: "https://www.financnisprava.cz/" },
  "Finland": { name: "Vero Skatt", url: "https://www.vero.fi/" },
  "France": { name: "impots.gouv.fr", url: "https://www.impots.gouv.fr/" },
  "Germany": { name: "Bundeszentralamt für Steuern", url: "https://www.bzst.de/" },
  "Hungary": { name: "NAV", url: "https://nav.gov.hu/" },
  "Ireland": { name: "Revenue Commissioners", url: "https://www.revenue.ie/" },
  "Italy": { name: "Agenzia delle Entrate", url: "https://www.agenziaentrate.gov.it/" },
  "Netherlands": { name: "Belastingdienst", url: "https://www.belastingdienst.nl/" },
  "Poland": { name: "Podatki.gov.pl", url: "https://www.podatki.gov.pl/" },
  "Portugal": { name: "Portal das Finanças", url: "https://www.portaldasfinancas.gov.pt/" },
  "Romania": { name: "ANAF", url: "https://www.anaf.ro/" },
  "Spain": { name: "Agencia Tributaria", url: "https://sede.agenciatubutaria.gob.es/" },
  "Sweden": { name: "Skatteverket", url: "https://www.skatteverket.se/" }
};

export const defaultTaxAuthority = { name: "European Commission - Taxation and Customs Union", url: "https://taxation-customs.ec.europa.eu/" };
