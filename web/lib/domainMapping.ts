// Pemetaan Bidang dan Disiplin Ilmu Pengetahuan berdasarkan DomainKnowledge.md

export interface Level1Domain {
  name: string;
  description: string;
}

// 7 Domain Utama (Level 1)
export const DOMAIN_LEVEL1_LIST: Level1Domain[] = [
  {
    name: "Formal Sciences",
    description: "Ilmu yang mempelajari sistem abstrak seperti matematika, logika, statistika, teori permainan, dan ilmu komputer teoretis."
  },
  {
    name: "Natural Sciences",
    description: "Ilmu yang mempelajari alam semesta, hukum-hukum fisika, unsur kimia, kehidupan biologi, bumi, dan kosmologi astronomi."
  },
  {
    name: "Engineering & Technology",
    description: "Ilmu terapan untuk rekayasa praktis, merancang mesin, elektronika, arsitektur komputer, robotika, dan kecerdasan buatan (AI)."
  },
  {
    name: "Medical & Health Sciences",
    description: "Studi ilmiah tentang kesehatan tubuh manusia, anatomi, patologi penyakit, farmakologi obat, perawatan medis, dan psikiatri."
  },
  {
    name: "Agricultural & Environmental Sciences",
    description: "Ilmu pertanian, bercocok tanam, pengelolaan tanah, kehutanan, perikanan, kelestarian ekologi, dan ilmu lingkungan hidup."
  },
  {
    name: "Social Sciences",
    description: "Studi ilmiah mengenai interaksi sosial, perilaku manusia, ilmu psikologi, sosiologi, hukum, tata negara, bisnis, dan ekonomi."
  },
  {
    name: "Humanities & Arts",
    description: "Studi mengenai ekspresi kebudayaan manusia, etika filsafat, sejarah peradaban, ilmu bahasa (linguistik), sastra, dan karya seni kreatif."
  }
];

// Pemetaan disiplin database (Level 2) ke rumpun utama (Level 1)
// Mendukung bahasa Indonesia dan Inggris agar kompatibel dengan data DB yang ada
export const DOMAIN_TO_LEVEL1_MAPPING: Record<string, string> = {
  // --- Formal Sciences ---
  "matematika": "Formal Sciences",
  "mathematics": "Formal Sciences",
  "logika": "Formal Sciences",
  "logic": "Formal Sciences",
  "statistika": "Formal Sciences",
  "statistics": "Formal Sciences",
  "coding": "Formal Sciences", // coding/programming di DB masuk rumpun CS
  "computer science": "Formal Sciences",
  "teori informasi": "Formal Sciences",
  "game theory": "Formal Sciences",

  // --- Natural Sciences ---
  "sains": "Natural Sciences",
  "science": "Natural Sciences",
  "alam": "Natural Sciences",
  "nature": "Natural Sciences",
  "luar angkasa": "Natural Sciences",
  "space": "Natural Sciences",
  "fisika": "Natural Sciences",
  "physics": "Natural Sciences",
  "kimia": "Natural Sciences",
  "chemistry": "Natural Sciences",
  "biologi": "Natural Sciences",
  "biology": "Natural Sciences",
  "earth science": "Natural Sciences",
  "geologi": "Natural Sciences",
  "astronomy": "Natural Sciences",
  "astronomi": "Natural Sciences",
  "cosmology": "Natural Sciences",

  // --- Engineering & Technology ---
  "teknologi": "Engineering & Technology",
  "technology": "Engineering & Technology",
  "robotics": "Engineering & Technology",
  "robotika": "Engineering & Technology",
  "artificial intelligence": "Engineering & Technology",
  "kecerdasan buatan": "Engineering & Technology",
  "machine learning": "Engineering & Technology",
  "deep learning": "Engineering & Technology",
  "electrical engineering": "Engineering & Technology",
  "mechanical engineering": "Engineering & Technology",

  // --- Medical & Health Sciences ---
  "kesehatan": "Medical & Health Sciences",
  "health": "Medical & Health Sciences",
  "medicine": "Medical & Health Sciences",
  "anatomy": "Medical & Health Sciences",
  "psikiatri": "Medical & Health Sciences",
  "psychiatry": "Medical & Health Sciences",
  "neurology": "Medical & Health Sciences",
  "cardiology": "Medical & Health Sciences",

  // --- Agricultural & Environmental Sciences ---
  "pertanian": "Agricultural & Environmental Sciences",
  "agriculture": "Agricultural & Environmental Sciences",
  "forestry": "Agricultural & Environmental Sciences",
  "fisheries": "Agricultural & Environmental Sciences",
  "environmental science": "Agricultural & Environmental Sciences",
  "lingkungan": "Agricultural & Environmental Sciences",
  "sustainability": "Agricultural & Environmental Sciences",

  // --- Social Sciences ---
  "psikologi": "Social Sciences",
  "psychology": "Social Sciences",
  "sosiologi": "Social Sciences",
  "sociology": "Social Sciences",
  "ekonomi": "Social Sciences",
  "economics": "Social Sciences",
  "business": "Social Sciences",
  "bisnis": "Social Sciences",
  "hukum": "Social Sciences",
  "law": "Social Sciences",
  "political science": "Social Sciences",

  // --- Humanities & Arts ---
  "seni": "Humanities & Arts",
  "arts": "Humanities & Arts",
  "bahasa": "Humanities & Arts",
  "language": "Humanities & Arts",
  "linguistics": "Humanities & Arts",
  "filosofi": "Humanities & Arts",
  "philosophy": "Humanities & Arts",
  "sejarah": "Humanities & Arts",
  "history": "Humanities & Arts",
  "literature": "Humanities & Arts",
  "sastra": "Humanities & Arts",
  "music": "Humanities & Arts",
  "musik": "Humanities & Arts",
  "design": "Humanities & Arts"
};

/**
 * Membangun struktur tree Domain-Disiplin secara dinamis berdasarkan data aktual dari DB.
 * Jika ada domain baru yang tidak terdaftar di pemetaan, akan masuk ke "Interdisciplinary / Others".
 */
export function buildDomainTree(dbDomains: string[]): Record<string, string[]> {
  const tree: Record<string, string[]> = {};

  // Inisialisasi tree dengan rumpun Level 1 kosong
  DOMAIN_LEVEL1_LIST.forEach(d => {
    tree[d.name] = [];
  });
  
  // Rumpun cadangan untuk interdisipliner/lainnya
  tree["Interdisciplinary / Others"] = [];

  dbDomains.forEach(domain => {
    const lowerDomain = domain.toLowerCase();
    const parent = DOMAIN_TO_LEVEL1_MAPPING[lowerDomain] || "Interdisciplinary / Others";
    
    if (tree[parent] && !tree[parent].includes(domain)) {
      tree[parent].push(domain);
    }
  });

  // Hapus kategori rumpun kosong agar UI tetap bersih
  Object.keys(tree).forEach(key => {
    if (tree[key].length === 0) {
      delete tree[key];
    }
  });

  return tree;
}
