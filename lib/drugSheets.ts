// Labb Drug Profile Series: two-page sheets, one per drug. Files live in private/drug-sheets and are
// served only to signed-in CPP members by /api/members/drug-sheets/[slug].
export type DrugSheet = { no: number; slug: string; drug: string; drugClass: string; version: string; file: string };

export const drugSheets: DrugSheet[] = [
  { no: 1, slug: "propoxyphene", drug: "Propoxyphene", drugClass: "Opioids and opioid-like", version: "1.20", file: "01-propoxyphene-drug-profile-v1.20.pdf" },
  { no: 2, slug: "methaqualone", drug: "Methaqualone", drugClass: "Sedative-hypnotics", version: "1.30", file: "02-methaqualone-drug-profile-v1.30.pdf" },
  { no: 3, slug: "amphetamine", drug: "Amphetamine", drugClass: "Stimulants", version: "1.10", file: "03-amphetamine-drug-profile-v1.10.pdf" },
  { no: 4, slug: "methamphetamine", drug: "Methamphetamine", drugClass: "Stimulants", version: "1.10", file: "04-methamphetamine-drug-profile-v1.10.pdf" },
  { no: 5, slug: "mdma", drug: "MDMA (Ecstasy)", drugClass: "Stimulants and hallucinogens", version: "1.10", file: "05-mdma-drug-profile-v1.10.pdf" },
  { no: 6, slug: "marijuana-thc", drug: "Marijuana (THC)", drugClass: "Cannabinoids", version: "1.10", file: "06-marijuana-thc-drug-profile-v1.10.pdf" },
  { no: 7, slug: "cocaine", drug: "Cocaine", drugClass: "Stimulants", version: "1.10", file: "07-cocaine-drug-profile-v1.10.pdf" },
  { no: 8, slug: "opiates", drug: "Opiates", drugClass: "Opioids", version: "1.10", file: "08-opiates-drug-profile-v1.10.pdf" },
  { no: 9, slug: "benzodiazepines", drug: "Benzodiazepines", drugClass: "Sedatives", version: "1.10", file: "09-benzodiazepines-drug-profile-v1.10.pdf" },
  { no: 10, slug: "barbiturates", drug: "Barbiturates", drugClass: "Sedatives", version: "1.10", file: "10-barbiturates-drug-profile-v1.10.pdf" },
  { no: 11, slug: "fentanyl", drug: "Fentanyl", drugClass: "Opioids", version: "1.00", file: "11-fentanyl-drug-profile-v1.00.pdf" },
  { no: 12, slug: "pcp", drug: "PCP (Phencyclidine)", drugClass: "Hallucinogens and dissociatives", version: "1.00", file: "12-pcp-drug-profile-v1.00.pdf" },
  { no: 13, slug: "lsd", drug: "LSD", drugClass: "Hallucinogens and dissociatives", version: "1.00", file: "13-lsd-drug-profile-v1.00.pdf" },
  { no: 14, slug: "tramadol", drug: "Tramadol", drugClass: "Opioids", version: "1.00", file: "14-tramadol-drug-profile-v1.00.pdf" },
  { no: 15, slug: "ketamine", drug: "Ketamine", drugClass: "Hallucinogens and dissociatives", version: "1.00", file: "15-ketamine-drug-profile-v1.00.pdf" },
  { no: 16, slug: "spice-k2", drug: "Spice / K2", drugClass: "Cannabinoids", version: "1.00", file: "16-spice-k2-drug-profile-v1.00.pdf" },
  { no: 17, slug: "xylazine", drug: "Xylazine", drugClass: "Sedatives", version: "1.00", file: "17-xylazine-drug-profile-v1.00.pdf" },
  { no: 18, slug: "tricyclic-antidepressants", drug: "Tricyclic antidepressants", drugClass: "Antidepressants", version: "1.00", file: "18-tricyclic-antidepressants-drug-profile-v1.00.pdf" },
  { no: 19, slug: "alcohol-etg", drug: "Alcohol (EtG)", drugClass: "Alcohol biomarker", version: "1.20", file: "19-alcohol-etg-drug-profile-v1.20.pdf" },
  { no: 20, slug: "buprenorphine", drug: "Buprenorphine", drugClass: "Opioids", version: "1.00", file: "20-buprenorphine-drug-profile-v1.00.pdf" },
  { no: 21, slug: "methadone", drug: "Methadone", drugClass: "Opioids", version: "1.00", file: "21-methadone-drug-profile-v1.00.pdf" },
  { no: 22, slug: "oxycodone-oxymorphone", drug: "Oxycodone / Oxymorphone", drugClass: "Opioids", version: "1.00", file: "22-oxycodone-oxymorphone-drug-profile-v1.00.pdf" },
  { no: 23, slug: "alcohol-bac", drug: "Alcohol (BAC)", drugClass: "Alcohol, current level", version: "1.00", file: "23-alcohol-bac-drug-profile-v1.00.pdf" },
];

export const drugSheet = (slug: string) => drugSheets.find((d) => d.slug === slug);
