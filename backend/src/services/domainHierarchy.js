/**
 * Domain Hierarchy — Sumber kebenaran hierarki bidang pengetahuan (3 level)
 * 
 * Mirror dari DomainKnowledge.md
 * Level 1: Domain (8 rumpun ilmu)
 * Level 2: Disiplin (121 disiplin)
 * Level 3: Sub-topik (topik spesifik untuk generasi konten & tags)
 */

const DOMAIN_HIERARCHY = {
  'Formal Sciences': {
    disciplines: {
      'Mathematics': { subtopics: ['Aljabar', 'Geometri', 'Kalkulus', 'Topologi', 'Teori Bilangan', 'Analisis Matematika', 'Kombinatorika'] },
      'Logic': { subtopics: ['Logika Proposisional', 'Logika Predikat', 'Logika Modal', 'Teori Bukti'] },
      'Statistics': { subtopics: ['Statistika Inferensial', 'Statistika Bayesian', 'Analisis Regresi', 'Probabilitas', 'Time Series'] },
      'Theoretical Computer Science': { subtopics: ['Teori Automata', 'Teori Kompleksitas', 'Teori Komputabilitas', 'Algoritma', 'Kriptografi'] },
      'Information Theory': { subtopics: ['Entropi', 'Coding Theory', 'Kompresi Data', 'Teori Shannon'] },
      'Complex Systems': { subtopics: ['Chaos Theory', 'Fraktal', 'Emergent Behavior', 'Self-Organization', 'Cellular Automata'] },
      'Decision Science': { subtopics: ['Riset Operasi', 'Optimisasi', 'Analisis Keputusan', 'Simulasi'] },
      'Game Theory': { subtopics: ['Nash Equilibrium', 'Teori Permainan Kooperatif', 'Mekanisme Desain', 'Teori Lelang'] },
    },
  },

  'Natural Sciences': {
    disciplines: {
      'Physics': { subtopics: ['Mekanika', 'Elektromagnetik', 'Optik', 'Termodinamika', 'Fisika Nuklir', 'Fisika Partikel', 'Relativitas', 'Quantum Physics', 'Astrofisika', 'Plasma'] },
      'Chemistry': { subtopics: ['Organik', 'Anorganik', 'Analitik', 'Fisik', 'Biokimia', 'Material', 'Polimer', 'Elektrokimia'] },
      'Biology': { subtopics: ['Sel', 'Molekuler', 'Genetika', 'Evolusi', 'Ekologi', 'Mikrobiologi', 'Zoologi', 'Botani', 'Imunologi', 'Neurosains'] },
      'Earth Science': { subtopics: ['Geologi', 'Vulkanologi', 'Mineralogi', 'Seismologi', 'Paleontologi', 'Hidrologi', 'Oseanografi', 'Meteorologi', 'Klimatologi'] },
      'Astronomy': { subtopics: ['Planetary Science', 'Cosmology', 'Stellar Astronomy', 'Galactic Astronomy'] },
    },
  },

  'Engineering & Technology': {
    disciplines: {
      'Mechanical Engineering': { subtopics: ['CAD', 'Robotics', 'Manufacturing', 'Thermal Engineering'] },
      'Electrical Engineering': { subtopics: ['Electronics', 'Embedded Systems', 'Signal Processing', 'Telecommunications', 'Control Systems'] },
      'Computer Engineering': { subtopics: ['Hardware', 'Operating Systems', 'Computer Architecture', 'IoT'] },
      'Civil Engineering': { subtopics: ['Structural', 'Transportation', 'Water Resources', 'Construction'] },
      'Chemical Engineering': { subtopics: ['Proses Kimia', 'Reaktor Kimia', 'Separasi', 'Katalisis'] },
      'Aerospace Engineering': { subtopics: ['Aerodinamika', 'Propulsi', 'Struktur Pesawat', 'Astronautika'] },
      'Industrial Engineering': { subtopics: ['Lean Manufacturing', 'Ergonomi', 'Supply Chain', 'Quality Control'] },
      'Nuclear Engineering': { subtopics: ['Reaktor Nuklir', 'Fisika Reaktor', 'Proteksi Radiasi', 'Fusi Nuklir'] },
      'Environmental Engineering': { subtopics: ['Pengolahan Air', 'Pengelolaan Limbah', 'Remediasi Lahan', 'Kualitas Udara'] },
      'Materials Engineering': { subtopics: ['Nanomaterial', 'Komposit', 'Metalurgi', 'Keramik', 'Biomaterial'] },
      'Marine Engineering': { subtopics: ['Desain Kapal', 'Sistem Propulsi Laut', 'Struktur Lepas Pantai'] },
      'Biomedical Engineering': { subtopics: ['Organ Buatan', 'Bioinstrumentasi', 'Biomechanics', 'Tissue Engineering'] },
      'Mechatronics': { subtopics: ['Sensor', 'Aktuator', 'Sistem Kontrol Cerdas', 'Otomasi'] },
      'Artificial Intelligence': { subtopics: ['Machine Learning', 'Deep Learning', 'Reinforcement Learning', 'Computer Vision', 'NLP', 'Robotics', 'AI Safety', 'Multi-Agent Systems'] },
    },
  },

  'Medical & Health Sciences': {
    disciplines: {
      'Anatomy': { subtopics: ['Anatomi Manusia', 'Anatomi Komparatif', 'Neuroanatomi', 'Histologi'] },
      'Physiology': { subtopics: ['Fisiologi Kardiovaskular', 'Neurofisiologi', 'Fisiologi Respirasi', 'Endokrinologi'] },
      'Pathology': { subtopics: ['Patologi Klinis', 'Patologi Forensik', 'Histopatologi', 'Sitopatologi'] },
      'Pharmacology': { subtopics: ['Farmakokinetik', 'Farmakodinamik', 'Toksikologi', 'Farmakogenomik'] },
      'Surgery': { subtopics: ['Bedah Umum', 'Bedah Saraf', 'Bedah Kardiovaskular', 'Bedah Plastik'] },
      'Internal Medicine': { subtopics: ['Gastroenterologi', 'Hematologi', 'Reumatologi', 'Nefrologi'] },
      'Pediatrics': { subtopics: ['Neonatologi', 'Pediatri Perkembangan', 'Kardiologi Anak'] },
      'Psychiatry': { subtopics: ['Psikiatri Anak', 'Psikoterapi', 'Psikofarmakologi', 'Psikiatri Forensik'] },
      'Neurology': { subtopics: ['Epilepsi', 'Stroke', 'Penyakit Neurodegeneratif', 'Neuroimaging'] },
      'Cardiology': { subtopics: ['Elektrofisiologi Jantung', 'Intervensi Koroner', 'Gagal Jantung', 'Penyakit Katup'] },
      'Oncology': { subtopics: ['Kemoterapi', 'Radioterapi', 'Imunoterapi Kanker', 'Onkologi Molekuler'] },
      'Radiology': { subtopics: ['MRI', 'CT Scan', 'Ultrasonografi', 'Kedokteran Nuklir'] },
      'Public Health': { subtopics: ['Promosi Kesehatan', 'Kesehatan Lingkungan', 'Kesehatan Global', 'Kebijakan Kesehatan'] },
      'Epidemiology': { subtopics: ['Epidemiologi Analitik', 'Epidemiologi Molekuler', 'Surveilans Penyakit'] },
      'Nutrition': { subtopics: ['Gizi Klinis', 'Nutrigenomik', 'Gizi Masyarakat', 'Diet Terapeutik'] },
      'Dentistry': { subtopics: ['Ortodonti', 'Periodonti', 'Bedah Mulut', 'Prostodontik'] },
      'Nursing': { subtopics: ['Keperawatan Kritis', 'Keperawatan Komunitas', 'Manajemen Keperawatan'] },
      'Rehabilitation': { subtopics: ['Fisioterapi', 'Terapi Okupasi', 'Terapi Wicara', 'Rehabilitasi Neurologis'] },
      'Sports Medicine': { subtopics: ['Cedera Olahraga', 'Fisiologi Olahraga', 'Nutrisi Olahraga', 'Biomekanika Olahraga'] },
    },
  },

  'Agricultural & Environmental Sciences': {
    disciplines: {
      'Agriculture': { subtopics: ['Pertanian Presisi', 'Pertanian Organik', 'Irigasi', 'Tanaman Pangan'] },
      'Agronomy': { subtopics: ['Pemuliaan Tanaman', 'Fisiologi Tanaman', 'Manajemen Hama', 'Produktivitas Lahan'] },
      'Soil Science': { subtopics: ['Pedologi', 'Kesuburan Tanah', 'Kimia Tanah', 'Konservasi Tanah'] },
      'Forestry': { subtopics: ['Silvikultur', 'Pengelolaan Hutan', 'Agroforestri', 'Dendrokronologi'] },
      'Fisheries': { subtopics: ['Biologi Perikanan', 'Manajemen Perikanan', 'Teknologi Penangkapan'] },
      'Aquaculture': { subtopics: ['Budidaya Ikan', 'Budidaya Udang', 'Budidaya Rumput Laut', 'Hatchery'] },
      'Veterinary Medicine': { subtopics: ['Kesehatan Hewan', 'Bedah Veteriner', 'Patologi Veteriner', 'Zoonosis'] },
      'Animal Science': { subtopics: ['Nutrisi Ternak', 'Genetika Ternak', 'Reproduksi Ternak', 'Manajemen Peternakan'] },
      'Food Science': { subtopics: ['Teknologi Pangan', 'Keamanan Pangan', 'Kimia Pangan', 'Mikrobiologi Pangan'] },
      'Environmental Science': { subtopics: ['Pencemaran Lingkungan', 'Ekotoksikologi', 'Pengelolaan Sumber Daya', 'AMDAL'] },
      'Sustainability': { subtopics: ['Energi Terbarukan', 'Ekonomi Sirkular', 'Pembangunan Berkelanjutan', 'Green Technology'] },
      'Climate Science': { subtopics: ['Perubahan Iklim', 'Paleoklimatologi', 'Model Iklim', 'Efek Rumah Kaca'] },
      'Conservation Biology': { subtopics: ['Keanekaragaman Hayati', 'Spesies Terancam', 'Ekologi Konservasi', 'Restorasi Ekosistem'] },
    },
  },

  'Social Sciences': {
    disciplines: {
      'Economics': { subtopics: ['Micro', 'Macro', 'Econometrics', 'Behavioral Economics', 'Finance'] },
      'Psychology': { subtopics: ['Cognitive', 'Clinical', 'Social', 'Developmental', 'Educational', 'Industrial-Organizational'] },
      'Sociology': { subtopics: ['Stratifikasi Sosial', 'Sosiologi Budaya', 'Sosiologi Perkotaan', 'Mobilitas Sosial'] },
      'Anthropology': { subtopics: ['Antropologi Budaya', 'Antropologi Fisik', 'Etnografi', 'Arkeologi Antropologis'] },
      'Political Science': { subtopics: ['Sistem Politik', 'Kebijakan Publik', 'Politik Komparatif', 'Teori Politik'] },
      'International Relations': { subtopics: ['Diplomasi', 'Keamanan Internasional', 'Ekonomi Politik Global', 'Organisasi Internasional'] },
      'Public Administration': { subtopics: ['Manajemen Publik', 'Kebijakan Fiskal', 'E-Government', 'Birokrasi'] },
      'Law': { subtopics: ['Hukum Pidana', 'Hukum Perdata', 'Hukum Internasional', 'Hukum Konstitusi', 'Hak Asasi Manusia'] },
      'Criminology': { subtopics: ['Kriminologi Kritis', 'Viktimologi', 'Penologi', 'Cybercrime'] },
      'Communication': { subtopics: ['Komunikasi Massa', 'Jurnalisme', 'Public Relations', 'Media Digital'] },
      'Education': { subtopics: ['Kurikulum', 'Pedagogik', 'Pendidikan Jarak Jauh', 'Pendidikan Inklusif'] },
      'Human Geography': { subtopics: ['Geografi Ekonomi', 'Geografi Populasi', 'Geografi Politik', 'Geografi Lingkungan'] },
      'Demography': { subtopics: ['Studi Populasi', 'Migrasi', 'Fertilitas', 'Aging Population'] },
      'Urban Studies': { subtopics: ['Perencanaan Kota', 'Urbanisasi', 'Smart City', 'Transportasi Perkotaan'] },
      'Business': { subtopics: ['Management', 'Marketing', 'Accounting', 'Entrepreneurship', 'Supply Chain'] },
    },
  },

  'Humanities & Arts': {
    disciplines: {
      'Philosophy': { subtopics: ['Ethics', 'Metaphysics', 'Epistemology', 'Logic', 'Philosophy of Science'] },
      'History': { subtopics: ['Sejarah Kuno', 'Sejarah Modern', 'Sejarah Asia', 'Sejarah Eropa', 'Sejarah Peradaban Islam'] },
      'Archaeology': { subtopics: ['Arkeologi Prasejarah', 'Arkeologi Klasik', 'Arkeologi Bawah Air', 'Bioarkeologi'] },
      'Linguistics': { subtopics: ['Fonetik', 'Sintaksis', 'Semantik', 'Pragmatik', 'Sosiolinguistik'] },
      'Literature': { subtopics: ['Sastra Klasik', 'Sastra Modern', 'Teori Sastra', 'Puisi', 'Fiksi'] },
      'Religious Studies': { subtopics: ['Teologi', 'Studi Perbandingan Agama', 'Filsafat Agama', 'Mistisisme'] },
      'Classics': { subtopics: ['Sastra Yunani', 'Sastra Romawi', 'Filologi Klasik', 'Sejarah Kuno Mediterania'] },
      'Cultural Studies': { subtopics: ['Studi Media', 'Studi Postkolonial', 'Studi Gender', 'Budaya Populer'] },
      'Performing Arts': { subtopics: ['Teater', 'Tari', 'Opera', 'Pertunjukan Kontemporer'] },
      'Music': { subtopics: ['Teori Musik', 'Komposisi', 'Musikologi', 'Etnomusiologi', 'Produksi Musik'] },
      'Visual Arts': { subtopics: ['Lukisan', 'Patung', 'Fotografi', 'Seni Instalasi', 'Seni Digital'] },
      'Film Studies': { subtopics: ['Teori Film', 'Sinematografi', 'Dokumenter', 'Animasi'] },
      'Architecture': { subtopics: ['Arsitektur Modern', 'Arsitektur Berkelanjutan', 'Desain Interior', 'Arsitektur Lansekap'] },
      'Design': { subtopics: ['Desain Grafis', 'Desain Produk', 'UX/UI Design', 'Desain Mode'] },
    },
  },

  'Interdisciplinary Sciences': {
    disciplines: {
      'Data Science': { subtopics: ['Data Mining', 'Machine Learning Terapan', 'Big Data', 'Visualisasi Data'] },
      'Data Engineering': { subtopics: ['ETL Pipeline', 'Data Warehouse', 'Data Lake', 'Streaming Data'] },
      'Bioinformatics': { subtopics: ['Genomik Komputasi', 'Proteomik', 'Sekuensing DNA', 'Basis Data Biologi'] },
      'Computational Biology': { subtopics: ['Pemodelan Biologi', 'Evolusi Komputasi', 'Dinamika Populasi'] },
      'Systems Biology': { subtopics: ['Jaringan Metabolik', 'Biologi Sintetis', 'Regulasi Gen'] },
      'Computational Chemistry': { subtopics: ['Dinamika Molekuler', 'Quantum Chemistry', 'Docking Molekuler'] },
      'Computational Physics': { subtopics: ['Simulasi Monte Carlo', 'Metode Elemen Hingga', 'Fisika Komputasi Plasma'] },
      'Scientific Computing': { subtopics: ['High-Performance Computing', 'Analisis Numerik', 'Pemodelan Matematika'] },
      'Human-Computer Interaction': { subtopics: ['Usability', 'Desain Interaksi', 'Aksesibilitas', 'AR/VR Interface'] },
      'Computational Linguistics': { subtopics: ['Pemrosesan Bahasa Alami', 'Speech Recognition', 'Terjemahan Mesin', 'Sentiment Analysis'] },
      'Cognitive Science': { subtopics: ['Kognisi Visual', 'Memori', 'Bahasa dan Pikiran', 'Pengambilan Keputusan'] },
      'Neuroscience': { subtopics: ['Neuroimaging', 'Neuroplastisitas', 'Neurokimia', 'Neuroetologi'] },
      'Behavioral Science': { subtopics: ['Ekonomi Perilaku', 'Psikologi Evolusioner', 'Neuromarketing'] },
      'Complexity Science': { subtopics: ['Agent-Based Modeling', 'Network Dynamics', 'Phase Transitions'] },
      'Network Science': { subtopics: ['Graph Theory', 'Social Network Analysis', 'Epidemiology Networks'] },
      'Digital Humanities': { subtopics: ['Text Mining Sejarah', 'GIS Arkeologi', 'Digitalisasi Arsip'] },
      'Geoinformatics': { subtopics: ['Remote Sensing', 'Pemetaan Digital', 'Spatial Analysis'] },
      'Geographic Information Systems': { subtopics: ['GIS Terapan', 'Kartografi Digital', 'Analisis Spasial'] },
      'Cybersecurity': { subtopics: ['Kriptografi Terapan', 'Penetration Testing', 'Forensik Digital', 'Keamanan Jaringan'] },
      'Quantum Computing': { subtopics: ['Qubit', 'Quantum Algorithm', 'Quantum Error Correction', 'Quantum Supremacy'] },
      'FinTech': { subtopics: ['Blockchain', 'Digital Payment', 'Robo-Advisor', 'DeFi'] },
      'Health Informatics': { subtopics: ['Electronic Health Records', 'Telemedicine', 'mHealth', 'Clinical Decision Support'] },
      'Medical Imaging': { subtopics: ['AI Medical Imaging', 'Radiomics', '3D Reconstruction', 'Image Segmentation'] },
      'Computational Social Science': { subtopics: ['Social Simulation', 'Digital Ethnography', 'Computational Text Analysis'] },
      'Educational Technology': { subtopics: ['E-Learning', 'Adaptive Learning', 'Gamification', 'Learning Analytics'] },
      'Explainable AI': { subtopics: ['Interpretable Models', 'SHAP', 'LIME', 'Feature Attribution'] },
      'AI Alignment': { subtopics: ['Value Alignment', 'Reward Modeling', 'Constitutional AI', 'Corrigibility'] },
      'AI Safety': { subtopics: ['Robustness', 'Adversarial Attacks', 'Safe Exploration', 'Existential Risk'] },
      'Synthetic Biology': { subtopics: ['Gene Editing', 'CRISPR', 'Metabolic Engineering', 'Protocells'] },
      'Precision Medicine': { subtopics: ['Genomic Medicine', 'Pharmacogenomics', 'Biomarker Discovery', 'Companion Diagnostics'] },
      'Computational Economics': { subtopics: ['Agent-Based Economics', 'Algorithmic Trading', 'Computational Game Theory'] },
      'Climate Informatics': { subtopics: ['Climate Modeling ML', 'Extreme Weather Prediction', 'Carbon Footprint Analysis'] },
      'Digital Twin Systems': { subtopics: ['Manufacturing Digital Twin', 'Healthcare Digital Twin', 'City Digital Twin', 'IoT Integration'] },
    },
  },
};

/**
 * Get all Level 2 discipline names for a Level 1 domain
 * @param {string} level1Name - e.g. "Natural Sciences"
 * @returns {string[]} - e.g. ["Physics", "Chemistry", ...]
 */
function getLevel2ForLevel1(level1Name) {
  const domain = DOMAIN_HIERARCHY[level1Name];
  if (!domain) return [];
  return Object.keys(domain.disciplines);
}

/**
 * Get all Level 3 subtopics for a Level 2 discipline
 * @param {string} level2Name - e.g. "Physics"
 * @returns {string[]} - e.g. ["Mekanika", "Optik", ...]
 */
function getLevel3ForLevel2(level2Name) {
  for (const domain of Object.values(DOMAIN_HIERARCHY)) {
    const discipline = domain.disciplines[level2Name];
    if (discipline) {
      return discipline.subtopics || [];
    }
  }
  return [];
}

/**
 * Find the Level 1 parent domain for a Level 2 discipline
 * @param {string} level2Name 
 * @returns {string|null}
 */
function getLevel1ForLevel2(level2Name) {
  for (const [level1Name, domain] of Object.entries(DOMAIN_HIERARCHY)) {
    if (domain.disciplines[level2Name]) {
      return level1Name;
    }
  }
  return null;
}

/**
 * Get all Level 1 domain names
 * @returns {string[]}
 */
function getAllLevel1() {
  return Object.keys(DOMAIN_HIERARCHY);
}

/**
 * Get all Level 2 discipline names across all domains
 * @returns {string[]}
 */
function getAllLevel2() {
  const all = [];
  for (const domain of Object.values(DOMAIN_HIERARCHY)) {
    all.push(...Object.keys(domain.disciplines));
  }
  return all;
}

/**
 * Utility: pick N random items from array
 */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * Resolve a filter to concrete topics for AI generation
 * 
 * @param {string} filterType - 'all' | 'level1' | 'level2'
 * @param {string} filterValue - e.g. "Natural Sciences" or "Physics"
 * @returns {{ disciplines: string[], subtopicMap: Object<string, string[]> }}
 *   disciplines: list of Level 2 names to generate for
 *   subtopicMap: { [discipline]: [subtopic1, subtopic2, ...] } for prompt enrichment
 */
function resolveFilterToTopics(filterType, filterValue) {
  if (filterType === 'level1') {
    // Level 1: pick random 2-3 disciplines from this domain
    const allDisciplines = getLevel2ForLevel1(filterValue);
    if (allDisciplines.length === 0) {
      // Fallback: pick random from all
      return resolveFilterToTopics('all', 'Semua');
    }
    
    const picked = pickRandom(allDisciplines, Math.min(3, Math.max(2, allDisciplines.length)));
    const subtopicMap = {};
    
    for (const disc of picked) {
      const allSubtopics = getLevel3ForLevel2(disc);
      // Pick 2-3 subtopics per discipline for prompt variety
      subtopicMap[disc] = pickRandom(allSubtopics, Math.min(3, allSubtopics.length));
    }
    
    return { disciplines: picked, subtopicMap };
  }
  
  if (filterType === 'level2') {
    // Level 2: use this discipline directly, pick random subtopics
    const allSubtopics = getLevel3ForLevel2(filterValue);
    const subtopicMap = {};
    
    if (allSubtopics.length > 0) {
      subtopicMap[filterValue] = pickRandom(allSubtopics, Math.min(5, allSubtopics.length));
    }
    
    return { disciplines: [filterValue], subtopicMap };
  }
  
  // 'all': pick random disciplines across all domains
  const allLevel2 = getAllLevel2();
  const picked = pickRandom(allLevel2, 5);
  const subtopicMap = {};
  
  for (const disc of picked) {
    const allSubtopics = getLevel3ForLevel2(disc);
    subtopicMap[disc] = pickRandom(allSubtopics, Math.min(2, allSubtopics.length));
  }
  
  return { disciplines: picked, subtopicMap };
}

module.exports = {
  DOMAIN_HIERARCHY,
  getLevel2ForLevel1,
  getLevel3ForLevel2,
  getLevel1ForLevel2,
  getAllLevel1,
  getAllLevel2,
  resolveFilterToTopics,
  pickRandom,
};
