// Pemetaan Rumpun Ilmu (Level 1) dan Disiplin Ilmu (Level 2) berdasarkan DomainKnowledge.md
// Seluruh data disajikan secara statis dalam Bahasa Inggris yang baku lengkap dengan deskripsinya dalam Bahasa Indonesia.

export interface Level1Domain {
  name: string;
  description: string;
}

export interface Level2Discipline {
  name: string;
  description: string;
}

// 8 Domain Utama (Level 1)
export const DOMAIN_LEVEL1_LIST: Level1Domain[] = [
  {
    name: "Formal Sciences",
    description: "Cabang ilmu pengetahuan yang berkaitan dengan sistem formal dan konsep abstrak, seperti logika, matematika, dan ilmu komputer."
  },
  {
    name: "Natural Sciences",
    description: "Cabang ilmu pengetahuan yang berkaitan dengan deskripsi, pemahaman, dan prediksi fenomena alam berdasarkan bukti empiris."
  },
  {
    name: "Engineering & Technology",
    description: "Penerapan praktis dari prinsip-prinsip ilmiah dan matematika untuk merancang, memproduksi, dan mengoperasikan struktur, mesin, dan proses."
  },
  {
    name: "Medical & Health Sciences",
    description: "Ilmu terapan yang berkaitan dengan kesehatan, penyakit, perawatan medis, dan kesejahteraan fisik serta psikologis manusia secara keseluruhan."
  },
  {
    name: "Agricultural & Environmental Sciences",
    description: "Studi ilmiah tentang pertanian, kehutanan, biologi konservasi, ekologi, dan pengelolaan sumber daya alam yang berkelanjutan."
  },
  {
    name: "Social Sciences",
    description: "Cabang ilmu pengetahuan yang ditujukan untuk mempelajari masyarakat manusia dan hubungan antar individu di dalam masyarakat tersebut."
  },
  {
    name: "Humanities & Arts",
    description: "Studi tentang budaya manusia, filsafat, sejarah, bahasa, sastra, dan berbagai bentuk seni kreatif pertunjukan serta visual."
  },
  {
    name: "Interdisciplinary Sciences",
    description: "Bidang studi ilmiah modern yang berkembang pesat yang menggabungkan pengetahuan dan metode dari berbagai domain akademis tradisional."
  }
];

// Daftar Disiplin Level 2 per rumpun Level 1 dengan deskripsi Bahasa Indonesia
export const DOMAIN_LEVEL2_MAP: Record<string, Level2Discipline[]> = {
  "Formal Sciences": [
    { name: "Mathematics", description: "Ilmu abstrak tentang angka, kuantitas, ruang, dan struktur matematika." },
    { name: "Logic", description: "Studi sistematis tentang bentuk-bentuk inferensi, penalaran, dan argumen yang valid." },
    { name: "Statistics", description: "Ilmu mengumpulkan, menganalisis, menyajikan, dan menafsirkan data empiris." },
    { name: "Theoretical Computer Science", description: "Fondasi matematis dan logis dari teori komputasi dan algoritma." },
    { name: "Information Theory", description: "Studi matematis tentang pengkodean, transmisi, dan pemrosesan informasi." },
    { name: "Complex Systems", description: "Studi tentang sistem dengan banyak komponen yang saling berinteraksi dan menunjukkan sifat kemunculan baru (emergent properties)." },
    { name: "Decision Science", description: "Penerapan teknik kuantitatif untuk memandu pengambilan keputusan yang optimal." },
    { name: "Game Theory", description: "Studi matematis tentang pengambilan keputusan strategis dan interaksi antar agen rasional." }
  ],
  "Natural Sciences": [
    { name: "Physics", description: "Studi tentang materi, energi, ruang, waktu, dan gaya fundamental yang mengatur alam semesta." },
    { name: "Chemistry", description: "Studi tentang zat, sifat-sifatnya, struktur molekul, dan reaksi kimia yang dialaminya." },
    { name: "Biology", description: "Studi tentang organisme hidup, struktur fisiologis, evolusi, dan ekologinya." },
    { name: "Earth Science", description: "Studi tentang bumi, geologi, lautan, atmosfer, dan sistem iklimnya." },
    { name: "Astronomy", description: "Studi tentang benda-benda langit, luar angkasa, galaksi, dan asal-usul kosmos." }
  ],
  "Engineering & Technology": [
    { name: "Mechanical Engineering", description: "Perancangan, analisis, manufaktur, dan pemeliharaan sistem mekanis serta mesin." },
    { name: "Electrical Engineering", description: "Studi dan penerapan listrik, elektronika, elektromagnetisme, dan sistem kontrol." },
    { name: "Computer Engineering", description: "Integrasi teknik elektro dan ilmu komputer untuk mengembangkan perangkat keras dan lunak komputer." },
    { name: "Civil Engineering", description: "Perancangan, konstruksi, dan pemeliharaan struktur fisik serta proyek infrastruktur publik." },
    { name: "Chemical Engineering", description: "Bidang teknik yang berkaitan dengan manufaktur kimia dan transformasi bahan mentah." },
    { name: "Aerospace Engineering", description: "Bidang teknik utama yang berkaitan dengan pengembangan pesawat terbang dan pesawat luar angkasa." },
    { name: "Industrial Engineering", description: "Optimalisasi proses, sistem, atau organisasi yang kompleks untuk produktivitas." },
    { name: "Nuclear Engineering", description: "Penerapan proses nuklir dan radiasi untuk energi, kedokteran, dan teknologi." },
    { name: "Environmental Engineering", description: "Solusi teknik untuk melindungi dan memulihkan kualitas lingkungan serta kesehatan masyarakat." },
    { name: "Materials Engineering", description: "Perancangan, penemuan, dan rekayasa manipulasi bahan dan struktur baru." },
    { name: "Marine Engineering", description: "Rekayasa perahu, kapal, anjungan minyak, dan kapal atau struktur laut lainnya." },
    { name: "Biomedical Engineering", description: "Penerapan prinsip teknik dan konsep desain pada kedokteran dan biologi." },
    { name: "Mechatronics", description: "Integrasi multidisiplin teknik sistem mekanik, listrik, dan komputer." },
    { name: "Artificial Intelligence", description: "Studi dan implementasi agen perangkat lunak cerdas, pembelajaran mesin, dan visi komputer." }
  ],
  "Medical & Health Sciences": [
    { name: "Anatomy", description: "Studi ilmiah tentang struktur tubuh manusia, hewan, dan organisme hidup lainnya." },
    { name: "Physiology", description: "Studi tentang fungsi normal, mekanisme, dan proses fisik dari sistem kehidupan." },
    { name: "Pathology", description: "Studi ilmiah tentang sifat, penyebab, dan perkembangan penyakit fisik." },
    { name: "Pharmacology", description: "Cabang kedokteran yang berkaitan dengan penggunaan, efek, dan cara kerja obat-obatan." },
    { name: "Surgery", description: "Spesialisasi medis yang menggunakan teknik bedah manual dan instrumental untuk mengobati kondisi medis." },
    { name: "Internal Medicine", description: "Spesialisasi medis yang menangani pencegahan, diagnosis, dan pengobatan penyakit dalam." },
    { name: "Pediatrics", description: "Cabang kedokteran yang menangani perawatan medis bayi, anak-anak, dan remaja." },
    { name: "Psychiatry", description: "Spesialisasi medis yang didedikasikan untuk diagnosis, pencegahan, studi, dan pengobatan gangguan mental." },
    { name: "Neurology", description: "Cabang kedokteran yang menangani diagnosis dan pengobatan semua kategori gangguan sistem saraf." },
    { name: "Cardiology", description: "Cabang kedokteran yang menangani penyakit dan kelainan pada jantung manusia." },
    { name: "Oncology", description: "Cabang kedokteran yang meneliti, mendiagnosis, dan mengobati penyakit kanker." },
    { name: "Radiology", description: "Spesialisasi medis yang menggunakan pencitraan medis untuk mendiagnosis dan mengobati penyakit." },
    { name: "Public Health", description: "Ilmu dan seni mencegah penyakit, memperpanjang hidup, dan mempromosikan kesehatan melalui masyarakat." },
    { name: "Epidemiology", description: "Studi tentang seberapa sering penyakit terjadi pada berbagai kelompok orang dan mengapa." },
    { name: "Nutrition", description: "Studi tentang zat gizi dalam makanan, bagaimana tubuh menggunakannya, dan hubungan antara diet dan kesehatan." },
    { name: "Dentistry", description: "Cabang kedokteran yang berfokus pada gigi, gusi, dan struktur mulut." },
    { name: "Nursing", description: "Profesi yang memberikan perawatan bagi orang sakit, terluka, dan populasi yang rentan." },
    { name: "Rehabilitation", description: "Tindakan memulihkan kesehatan atau kehidupan normal seseorang melalui pelatihan dan terapia." },
    { name: "Sports Medicine", description: "Praktik medis yang berkaitan dengan kebugaran fisik serta pengobatan cedera olahraga." }
  ],
  "Agricultural & Environmental Sciences": [
    { name: "Agriculture", description: "Ilmu atau praktik bertani, termasuk budidaya tanah dan pemeliharaan hewan." },
    { name: "Agronomy", description: "Ilmu pengelolaan tanah dan produksi tanaman untuk pertanian." },
    { name: "Soil Science", description: "Studi tentang tanah sebagai sumber daya alam, termasuk pembentukan, klasifikasi, dan sifat-sifatnya." },
    { name: "Forestry", description: "Ilmu dan seni menumbuhkan, mengelola, memanfaatkan, melestarikan, dan memperbaiki hutan." },
    { name: "Fisheries", description: "Ilmu dan industri penangkapan, pemrosesan, dan penjualan ikan serta organisme air." },
    { name: "Aquaculture", description: "Pemeliharaan hewan air atau budidaya tanaman air untuk makanan." },
    { name: "Veterinary Medicine", description: "Cabang kedokteran yang menangani pencegahan, pengendalian, diagnosis, dan pengobatan penyakit hewan." },
    { name: "Animal Science", description: "Biologi dan pengelolaan hewan pertanian domestik." },
    { name: "Food Science", description: "Studi tentang susunan fisik, kimia, dan biologis makanan serta pemrosesan makanan." },
    { name: "Environmental Science", description: "Studi terpadu tentang proses lingkungan fisik, kimia, biologi, dan ekologi." },
    { name: "Sustainability", description: "Studi dan praktik untuk memenuhi kebutuhan masa kini tanpa mengorbankan generasi masa depan." },
    { name: "Climate Science", description: "Studi tentang iklim bumi, perubahan dari waktu ke waktu, dan pengaruh efek rumah kaca." },
    { name: "Conservation Biology", description: "Studi tentang konservasi alam dan keanekaragaman hakiki bumi." }
  ],
  "Social Sciences": [
    { name: "Economics", description: "Studi tentang bagaimana masyarakat menggunakan sumber daya yang langka untuk memproduksi dan mendistribusikan barang." },
    { name: "Psychology", description: "Studi ilmiah tentang pikiran, emosi, dan perilaku individu manusia." },
    { name: "Sociology", description: "Studi tentang perkembangan sosial, struktur, hubungan, dan masyarakat manusia." },
    { name: "Anthropology", description: "Studi tentang manusia, perilaku manusia, masyarakat, dan perkembangan budaya dari waktu ke waktu." },
    { name: "Political Science", description: "Studi sistematis tentang sistem pemerintahan, perilaku politik, dan dinamika kekuasaan." },
    { name: "International Relations", description: "Studi tentang hubungan dan interaksi antar negara serta aktor global." },
    { name: "Public Administration", description: "Implementasi kebijakan pemerintah dan pengelolaan layanan publik." },
    { name: "Law", description: "Sistem aturan dan pedoman yang ditegakkan melalui institusi sosial untuk mengatur perilaku." },
    { name: "Criminology", description: "Studi ilmiah tentang kejahatan, perilaku kriminal, dan sistem peradilan." },
    { name: "Communication", description: "Studi tentang bagaimana informasi dipertukarkan dan dibagikan antara individu dan kelompok." },
    { name: "Education", description: "Studi tentang pembelajaran, metode pengajaran, dan proses pedagogis institusional." },
    { name: "Human Geography", description: "Studi tentang pola dan proses yang membentuk interaksi manusia dengan lingkungan bumi." },
    { name: "Demography", description: "Studi statistik tentang populasi manusia, struktur, kelahiran, dan migrasi." },
    { name: "Urban Studies", description: "Studi tentang perkembangan kota, perencanaan, urbanisasi, dan kebijakan kota." },
    { name: "Business", description: "Studi tentang manajemen, pemasaran, akuntansi, kewirausahaan, dan perusahaan komersial." }
  ],
  "Humanities & Arts": [
    { name: "Philosophy", description: "Studi tentang sifat mendasar dari pengetahuan, realitas, eksistensi, dan etika." },
    { name: "History", description: "Studi dan dokumentasi tentang peristiwa masa lalu manusia, peradaban, dan evolusi budaya." },
    { name: "Archaeology", description: "Studi tentang sejarah dan prasejarah manusia melalui penggalian situs dan artefak." },
    { name: "Linguistics", description: "Studi ilmiah tentang bahasa, fonetik, tata bahasa, dan struktur semantik." },
    { name: "Literature", description: "Studi tentang karya tulis, novel, puisi, dan ekspresi tekstual kreatif." },
    { name: "Religious Studies", description: "Studi akademis tentang keyakinan, perilaku, dan institusi keagamaan." },
    { name: "Classics", description: "Studi tentang bahasa, sastra, sejarah, seni, dan budaya Mediterania kuno." },
    { name: "Cultural Studies", description: "Studi akademis tentang praktik budaya dan hubungannya dengan struktur kekuasaan." },
    { name: "Performing Arts", description: "Ekspresi kreatif yang ditampilkan di depan penonton, seperti drama, musik, dan tari." },
    { name: "Music", description: "Seni suara dalam waktu yang mengekspresikan ide dan emosi melalui elemen ritme dan melodi." },
    { name: "Visual Arts", description: "Bentuk seni yang menghasilkan karya yang terutama bersifat visual, seperti lukisan dan patung." },
    { name: "Film Studies", description: "Studi akademis tentang berbagai pendekatan historis, teoretis, dan kritis terhadap film." },
    { name: "Architecture", description: "Seni atau praktik merancang dan membangun gedung serta struktur fisik." },
    { name: "Design", description: "Pembuatan rencana atau konvensi untuk konstruksi objek, sistem, atau interaksi." }
  ],
  "Interdisciplinary Sciences": [
    { name: "Data Science", description: "Bidang studi yang menggabungkan keahlian domain, keterampilan pemrograman, dan statistik untuk menarik wawasan dari data." },
    { name: "Data Engineering", description: "Praktik merancang dan membangun sistem untuk mengumpulkan, menyimpan, dan menganalisis data dalam skala besar." },
    { name: "Bioinformatics", description: "Penerapan teknologi komputasi dan analisis untuk mengelola data biologis dan genetik." },
    { name: "Computational Biology", description: "Pengembangan dan penerapan metode analisis data dan teoretis untuk mempelajari sistem biologi." },
    { name: "Systems Biology", description: "Pemodelan komputasi dan matematika dari sistem biologis yang kompleks." },
    { name: "Computational Chemistry", description: "Penggunaan simulasi komputer untuk membantu memecahkan masalah kimia dan pemodelan molekul." },
    { name: "Computational Physics", description: "Studi dan implementasi analisis numerik untuk memecahkan masalah fisika." },
    { name: "Scientific Computing", description: "Penyusunan model matematika dan teknik analisis kuantitatif untuk memecahkan masalah ilmiah." },
    { name: "Human-Computer Interaction", description: "Penelitian dan perancangan antarmuka serta interaksi antara manusia dan komputer." },
    { name: "Computational Linguistics", description: "Studi ilmiah tentang bahasa dari perspektif komputasi." },
    { name: "Cognitive Science", description: "Studi interdisipliner tentang pikiran dan kecerdasan, yang mencakup psikologi, AI, dan filsafat." },
    { name: "Neuroscience", description: "Studi ilmiah tentang sistem saraf, menggabungkan fisiologi, anatomi, dan biologi." },
    { name: "Behavioral Science", description: "Studi tentang perilaku manusia dan hewan melalui pengamatan eksperimental yang sistematis." },
    { name: "Complexity Science", description: "Studi tentang sistem yang kompleks, perilaku emergent, dan pengaturan mandiri." },
    { name: "Network Science", description: "Bidang akademis yang mempelajari jaringan kompleks seperti jaringan telekomunikasi, biologi, dan sosial." },
    { name: "Digital Humanities", description: "Persimpangan antara teknologi komputasi dan disiplin ilmu humaniora." },
    { name: "Geoinformatics", description: "Sains dan teknologi yang mengembangkan dan menggunakan infrastruktur ilmu informasi untuk menangani geosains." },
    { name: "Geographic Information Systems", description: "Kerangka kerja konseptual yang memberikan kemampuan untuk menangkap dan menganalisis data spasial dan geografis." },
    { name: "Cybersecurity", description: "Praktik melindungi sistem, jaringan, dan program dari serangan digital." },
    { name: "Quantum Computing", description: "Teknologi yang berkembang pesat yang memanfaatkan hukum mekanika kuantum untuk memecahkan masalah yang kompleks." },
    { name: "FinTech", description: "Teknologi dan inovasi yang bertujuan untuk bersaing dengan metode keuangan tradisional dalam penyampaian layanan." },
    { name: "Health Informatics", description: "Sumber daya, perangkat, dan metode yang diperlukan untuk mengoptimalkan akuisisi dan pengambilan informasi kesehatan." },
    { name: "Medical Imaging", description: "Teknik dan proses pembuatan representasi visual dari bagian dalam tubuh untuk analisis klinis." },
    { name: "Computational Social Science", description: "Sub-disiplin akademis yang mempelajari fenomena sosial menggunakan pendekatan komputasi." },
    { name: "Educational Technology", description: "Studi dan praktik etis untuk memfasilitasi pembelajaran dan meningkatkan kinerja dengan membuat proses teknologi." },
    { name: "Explainable AI", description: "Serangkaian proses dan metode yang memungkinkan pengguna manusia memahami dan mempercayai output pembelajaran mesin." },
    { name: "AI Alignment", description: "Bidang penelitian yang bertujuan untuk mengarahkan sistem AI menuju tujuan, preferensi, atau prinsip etika manusia yang dimaksudkan." },
    { name: "AI Safety", description: "Bidang studi yang berfokus pada pencegahan kecelakaan, penyalahgunaan, dan risiko eksistensial dari sistem AI." },
    { name: "Synthetic Biology", description: "Merancang ulang organisme untuk tujuan yang berguna dengan merekayasa mereka agar memiliki kemampuan baru." },
    { name: "Precision Medicine", description: "Pendekatan inovatif untuk pengobatan dan pencegahan penyakit yang mempertimbangkan variabilitas individu." },
    { name: "Computational Economics", description: "Disiplin penelitian di persimpangan ilmu komputer, ekonomi, dan ilmu manajemen." },
    { name: "Climate Informatics", description: "Penelitian di persimpangan ilmu iklim dan ilmu data/pembelajaran mesin." },
    { name: "Digital Twin Systems", description: "Representasi digital dari objek fisik, proses, atau layanan yang dapat mensimulasikan operasi dunia nyata." }
  ]
};

/**
 * Mendapatkan deskripsi disiplin ilmu (Level 2) secara cepat dari database kamus statis
 */
export function getDisciplineDescription(name: string): string {
  const normalized = name.toLowerCase();
  
  for (const parent of Object.keys(DOMAIN_LEVEL2_MAP)) {
    const list = DOMAIN_LEVEL2_MAP[parent];
    const found = list.find(d => d.name.toLowerCase() === normalized);
    if (found) {
      return found.description;
    }
  }
  
  return "Disiplin akademik untuk pembelajaran ilmiah dan kajian teoretis.";
}

/**
 * Mendapatkan rumpun Level 1 parent dari nama disiplin Level 2
 */
export function getParentDomain(disciplineName: string): string {
  if (!disciplineName) return 'Interdisciplinary Sciences';
  const normalized = disciplineName.toLowerCase();
  
  for (const [parent, disciplines] of Object.entries(DOMAIN_LEVEL2_MAP)) {
    if (disciplines.some(d => d.name.toLowerCase() === normalized)) {
      return parent;
    }
  }
  
  // Quick fallbacks
  if (normalized.includes('science')) {
    if (normalized.includes('social')) return 'Social Sciences';
    if (normalized.includes('computer') || normalized.includes('information')) return 'Formal Sciences';
    return 'Natural Sciences';
  }
  if (normalized.includes('tech') || normalized.includes('engineering') || normalized.includes('intelligence')) {
    return 'Engineering & Technology';
  }
  if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('medicine')) {
    return 'Medical & Health Sciences';
  }
  if (normalized.includes('art') || normalized.includes('music') || normalized.includes('history') || normalized.includes('philosophy') || normalized.includes('linguistics')) {
    return 'Humanities & Arts';
  }
  
  return 'Interdisciplinary Sciences';
}
