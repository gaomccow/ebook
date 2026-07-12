export interface FontItem {
  id: string;
  name: string;
  type: "FONT";
  description: string;
  cost: number;
  status: "locked" | "unlocked";
  className: string;
}

export const SANS_SERIF_FONTS: FontItem[] = [
  {
    id: "font_inter",
    name: "Inter (Default Classic)",
    type: "FONT",
    description: "The baseline pixel-precise interface standard. Exceptionally clean structure for scanning and information processing.",
    cost: 0,
    status: "unlocked",
    className: "font-sans font-normal"
  },
  {
    id: "font_plus_jakarta",
    name: "Plus Jakarta Sans",
    type: "FONT",
    description: "A wide, geometric modernist typeface. Adds a subtle futuristic polish that keeps text blocks feeling crisp and open.",
    cost: 250,
    status: "locked",
    className: "font-['Plus_Jakarta_Sans'] tracking-tight"
  },
  {
    id: "font_source_sans",
    name: "Source Sans 3",
    type: "FONT",
    description: "Adobe’s workhorse engine font. Engineered with warm humanist terminals to specifically prevent visual fatigue over long passages.",
    cost: 450,
    status: "locked",
    className: "font-['Source_Sans_3'] font-normal"
  }
];

export const HERITAGE_SERIF_FONTS: FontItem[] = [
  {
    id: "font_times_new_roman",
    name: "Times New Roman",
    type: "FONT",
    description: "The universal institutional framework. Cold, official academic layout that forces analytical distance.",
    cost: 200,
    status: "locked",
    className: "font-['Times_New_Roman'] serif normal-case"
  },
  {
    id: "font_eb_garamond",
    name: "EB Garamond",
    type: "FONT",
    description: "16th-century humanist print revival. Outstandingly elegant, relaxed letterforms optimized for immersion.",
    cost: 500,
    status: "locked",
    className: "font-['EB_Garamond'] serif tracking-normal"
  },
  {
    id: "font_merriweather",
    name: "Merriweather Serif",
    type: "FONT",
    description: "Heavy, screen-optimized serif featuring wide x-height architectures. Perfect for reading over bright display glare.",
    cost: 650,
    status: "locked",
    className: "font-['Merriweather'] serif leading-relaxed"
  }
];

export const MONOSPACE_FONTS: FontItem[] = [
  {
    id: "font_jetbrains_mono",
    name: "JetBrains Mono",
    type: "FONT",
    description: "The premier developer environment layout. Increased height metrics and distinctive letter cutouts maximize long-term reading stamina.",
    cost: 150,
    status: "locked",
    className: "font-mono tracking-normal font-normal"
  },
  {
    id: "font_ibm_plex_mono",
    name: "IBM Plex Mono",
    type: "FONT",
    description: "An aggressive, corporate engineering system. Gives the app the undeniable look of an official mainframe data feed.",
    cost: 300,
    status: "locked",
    className: "font-['IBM_Plex_Mono'] font-mono"
  },
  {
    id: "font_intel_one_mono",
    name: "Intel One Mono",
    type: "FONT",
    description: "An expressive technical font built specifically for extreme optical distinction, eliminating common word mix-ups.",
    cost: 600,
    status: "locked",
    className: "font-['Intel_One_Mono'] font-mono text-sm"
  }
];

export const SPECIALTY_FONTS: FontItem[] = [
  {
    id: "font_atkinson_hyperlegible",
    name: "Atkinson Hyperlegible Next",
    type: "FONT",
    description: "The Braille Institute standard. Specifically morphs character edges to allow instant recognition when your eyes are exhausted.",
    cost: 800,
    status: "locked",
    className: "font-['Atkinson_Hyperlegible'] tracking-wide"
  },
  {
    id: "font_space_grotesk",
    name: "Space Grotesk",
    type: "FONT",
    description: "Maximalist, punchy, retro-futuristic styling. Great for adding raw layout attitude to structural chapter headers and quote lists.",
    cost: 1000,
    status: "locked",
    className: "font-['Space_Grotesk'] antialiased font-medium"
  },
  {
    id: "font_lexend",
    name: "Lexend Deca",
    type: "FONT",
    description: "Developed using cognitive reading tests to explicitly disrupt tracking issues and reading blocks. Maximizes fluid word velocity.",
    cost: 1200,
    status: "locked",
    className: "font-['Lexend'] tracking-normal text-[10.5pt]"
  },
  {
    id: "font_opendyslexic",
    name: "OpenDyslexic",
    type: "FONT",
    description: "Specialized typeface with heavy bottom weighting to prevent letters from jumping or swapping. Perfect for neurodivergent reading.",
    cost: 0,
    status: "unlocked",
    className: "font-['OpenDyslexic',_'Comic_Sans_MS',_'Lexend'] tracking-wide leading-loose"
  }
];

// Combine these arrays into a single allFontItems selector map.
export const allFontItems: Record<string, FontItem> = {
  ...SANS_SERIF_FONTS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {}),
  ...HERITAGE_SERIF_FONTS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {}),
  ...MONOSPACE_FONTS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {}),
  ...SPECIALTY_FONTS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {}),
};

export const ALL_FONTS_LIST: FontItem[] = [
  ...SANS_SERIF_FONTS,
  ...HERITAGE_SERIF_FONTS,
  ...MONOSPACE_FONTS,
  ...SPECIALTY_FONTS
];
