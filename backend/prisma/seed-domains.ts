import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Level2Entry =
  | string
  | { name: string; hashtags: string[] };

interface Level1Seed {
  name: string;
  level2: Level2Entry[];
}

const SEED_DATA: Level1Seed[] = [
  {
    name: "Formal Sciences",
    level2: [
      {
        name: "Mathematics",
        hashtags: ["Algebra", "Calculus", "Geometry", "Topology", "Number Theory", "Analysis"],
      },
      {
        name: "Logic",
        hashtags: ["Propositional Logic", "Predicate Logic", "Model Theory", "Proof Theory", "Boolean Algebra"],
      },
      {
        name: "Statistics",
        hashtags: ["Probability", "Bayesian Inference", "Hypothesis Testing", "Regression Analysis", "Data Analysis"],
      },
      {
        name: "Theoretical Computer Science",
        hashtags: ["Algorithms", "Complexity Theory", "Automata Theory", "Cryptography", "Graph Theory"],
      },
      {
        name: "Information Theory",
        hashtags: ["Entropy", "Coding Theory", "Channel Capacity", "Data Compression", "Signal Detection"],
      },
      {
        name: "Complex Systems",
        hashtags: ["Chaos Theory", "Network Science", "Self-Organization", "Dynamical Systems", "Emergence"],
      },
      {
        name: "Decision Science",
        hashtags: ["Operations Research", "Decision Trees", "Utility Theory", "Risk Analysis", "Optimization"],
      },
      {
        name: "Game Theory",
        hashtags: ["Nash Equilibrium", "Zero-Sum Games", "Cooperative Games", "Mechanism Design", "Strategic Behavior"],
      },
    ],
  },
  {
    name: "Natural Sciences",
    level2: [
      {
        name: "Physics",
        hashtags: [
          "Mechanics", "Electromagnetism", "Optics", "Thermodynamics",
          "Nuclear Physics", "Particle Physics", "Relativity",
          "Quantum Physics", "Astrophysics", "Plasma",
        ],
      },
      {
        name: "Chemistry",
        hashtags: [
          "Organic", "Inorganic", "Analytical", "Physical",
          "Biochemistry", "Materials", "Polymers", "Electrochemistry",
        ],
      },
      {
        name: "Biology",
        hashtags: [
          "Cell", "Molecular", "Genetics", "Evolution",
          "Ecology", "Microbiology", "Zoology", "Botany",
          "Immunology", "Neuroscience",
        ],
      },
      {
        name: "Earth Science",
        hashtags: [
          "Geology", "Volcanology", "Mineralogy", "Seismology",
          "Paleontology", "Hydrology", "Oceanography", "Meteorology", "Climatology",
        ],
      },
      {
        name: "Astronomy",
        hashtags: [
          "Planetary Science", "Cosmology", "Stellar Astronomy", "Galactic Astronomy",
        ],
      },
    ],
  },
  {
    name: "Engineering & Technology",
    level2: [
      {
        name: "Mechanical Engineering",
        hashtags: ["CAD", "Robotics", "Manufacturing", "Thermal Engineering"],
      },
      {
        name: "Electrical Engineering",
        hashtags: [
          "Electronics", "Embedded Systems", "Signal Processing",
          "Telecommunications", "Control Systems",
        ],
      },
      {
        name: "Computer Engineering",
        hashtags: [
          "Hardware", "Operating Systems", "Computer Architecture", "IoT",
        ],
      },
      {
        name: "Civil Engineering",
        hashtags: [
          "Structural", "Transportation", "Water Resources", "Construction",
        ],
      },
      {
        name: "Chemical Engineering",
        hashtags: ["Thermodynamics", "Reaction Kinetics", "Fluid Dynamics", "Process Design"],
      },
      {
        name: "Aerospace Engineering",
        hashtags: ["Aerodynamics", "Propulsion", "Avionics", "Orbital Mechanics", "Spacecraft"],
      },
      {
        name: "Industrial Engineering",
        hashtags: ["Operations Research", "Supply Chain", "Ergonomics", "Quality Control", "Lean Six Sigma"],
      },
      {
        name: "Nuclear Engineering",
        hashtags: ["Fission", "Fusion", "Radiation Shielding", "Reactor Design", "Nuclear Waste"],
      },
      {
        name: "Environmental Engineering",
        hashtags: ["Water Treatment", "Air Quality", "Waste Management", "Sustainability", "Remediation"],
      },
      {
        name: "Materials Engineering",
        hashtags: ["Metallurgy", "Polymers", "Nanomaterials", "Semiconductors", "Crystallography"],
      },
      {
        name: "Marine Engineering",
        hashtags: ["Naval Architecture", "Marine Propulsion", "Hydrodynamics", "Offshore Structures"],
      },
      {
        name: "Biomedical Engineering",
        hashtags: ["Biomaterials", "Medical Imaging", "Biomechanics", "Prosthetics", "Tissue Engineering"],
      },
      {
        name: "Mechatronics",
        hashtags: ["Robotics", "Automation", "Sensors", "Actuators", "Control Systems", "Microcontrollers"],
      },
      {
        name: "Artificial Intelligence",
        hashtags: [
          "Machine Learning", "Deep Learning", "Reinforcement Learning",
          "Computer Vision", "NLP", "Robotics", "AI Safety", "Multi-Agent Systems",
        ],
      },
    ],
  },
  {
    name: "Medical & Health Sciences",
    level2: [
      {
        name: "Anatomy",
        hashtags: ["Musculoskeletal", "Neuroanatomy", "Cardiovascular System", "Histology", "Organ Systems"],
      },
      {
        name: "Physiology",
        hashtags: ["Homeostasis", "Cellular Physiology", "Endocrinology", "Neurophysiology", "Metabolism"],
      },
      {
        name: "Pathology",
        hashtags: ["Immunopathology", "Oncopathology", "Cytopathology", "Diagnostics", "Infectious Diseases"],
      },
      {
        name: "Pharmacology",
        hashtags: ["Pharmacokinetics", "Pharmacodynamics", "Toxicology", "Drug Discovery", "Therapeutics"],
      },
      {
        name: "Surgery",
        hashtags: ["Anesthesiology", "Minimally Invasive Surgery", "Orthopedic Surgery", "Trauma Care", "Postoperative Care"],
      },
      {
        name: "Internal Medicine",
        hashtags: ["Gastroenterology", "Pulmonology", "Nephrology", "Endocrine Disorders", "Rheumatology"],
      },
      {
        name: "Pediatrics",
        hashtags: ["Neonatology", "Child Development", "Pediatric Immunology", "Childhood Diseases", "Immunization"],
      },
      {
        name: "Psychiatry",
        hashtags: ["Mental Health", "Psychopharmacology", "Cognitive Behavioral Therapy", "Neurodevelopmental Disorders", "Addiction Medicine"],
      },
      {
        name: "Neurology",
        hashtags: ["Neurodegeneration", "Epilepsy", "Stroke", "Peripheral Nervous System", "Cognitive Neurology"],
      },
      {
        name: "Cardiology",
        hashtags: ["Electrocardiography", "Coronary Artery Disease", "Heart Failure", "Arrhythmia", "Hypertension"],
      },
      {
        name: "Oncology",
        hashtags: ["Chemotherapy", "Immunotherapy", "Radiation Therapy", "Carcinogenesis", "Cancer Genetics"],
      },
      {
        name: "Radiology",
        hashtags: ["MRI", "CT Scan", "Ultrasound", "Nuclear Medicine", "X-Ray Diagnostics"],
      },
      {
        name: "Public Health",
        hashtags: ["Health Policy", "Global Health", "Preventive Medicine", "Health Promotion", "Community Health"],
      },
      {
        name: "Epidemiology",
        hashtags: ["Biostatistics", "Outbreak Investigation", "Disease Transmission", "Cohort Studies", "Pandemic Response"],
      },
      {
        name: "Nutrition",
        hashtags: ["Dietetics", "Macronutrients", "Micronutrients", "Clinical Nutrition", "Dietary Guidelines"],
      },
      {
        name: "Dentistry",
        hashtags: ["Orthodontics", "Periodontics", "Oral Surgery", "Endodontics", "Dental Hygiene"],
      },
      {
        name: "Nursing",
        hashtags: ["Patient Care", "Clinical Nursing", "Geriatric Care", "Palliative Care", "Nursing Ethics"],
      },
      {
        name: "Rehabilitation",
        hashtags: ["Physical Therapy", "Occupational Therapy", "Speech Therapy", "Pain Management", "Mobility Recovery"],
      },
      {
        name: "Sports Medicine",
        hashtags: ["Kinesiology", "Athletic Injuries", "Biomechanics", "Exercise Physiology", "Injury Prevention"],
      },
    ],
  },
  {
    name: "Agricultural & Environmental Sciences",
    level2: [
      {
        name: "Agriculture",
        hashtags: ["Farming", "Horticulture", "Pest Management", "Organic Farming", "Agribusiness"],
      },
      {
        name: "Agronomy",
        hashtags: ["Crop Production", "Soil Management", "Plant Breeding", "Weed Science", "Irrigation"],
      },
      {
        name: "Soil Science",
        hashtags: ["Soil Biology", "Soil Chemistry", "Pedology", "Soil Fertility", "Erosion Control"],
      },
      {
        name: "Forestry",
        hashtags: ["Silviculture", "Forest Ecology", "Timber Harvesting", "Dendrology", "Forest Management"],
      },
      {
        name: "Fisheries",
        hashtags: ["Marine Fisheries", "Fish Population Dynamics", "Fishery Management", "Overfishing", "Catch Controls"],
      },
      {
        name: "Aquaculture",
        hashtags: ["Fish Farming", "Mariculture", "Algae Farming", "Aquaponics", "Water Quality"],
      },
      {
        name: "Veterinary Medicine",
        hashtags: ["Animal Pathology", "Clinical Veterinary", "Zoonotic Diseases", "Animal Welfare", "Veterinary Surgery"],
      },
      {
        name: "Animal Science",
        hashtags: ["Animal Breeding", "Animal Nutrition", "Livestock Management", "Animal Physiology", "Husbandry"],
      },
      {
        name: "Food Science",
        hashtags: ["Food Microbiology", "Food Chemistry", "Food Processing", "Food Safety", "Sensory Analysis"],
      },
      {
        name: "Environmental Science",
        hashtags: ["Ecosystems", "Environmental Chemistry", "Pollution Control", "Environmental Policy", "Ecotoxicology"],
      },
      {
        name: "Sustainability",
        hashtags: ["Renewable Energy", "Circular Economy", "Sustainable Development", "Carbon Footprint", "Green Technology"],
      },
      {
        name: "Climate Science",
        hashtags: ["Meteorology", "Global Warming", "Paleoclimatology", "Climate Modeling", "Greenhouse Effect"],
      },
      {
        name: "Conservation Biology",
        hashtags: ["Biodiversity", "Habitat Restoration", "Endangered Species", "Wildlife Management", "Protected Areas"],
      },
    ],
  },
  {
    name: "Social Sciences",
    level2: [
      {
        name: "Economics",
        hashtags: [
          "Micro", "Macro", "Econometrics", "Behavioral Economics", "Finance",
        ],
      },
      {
        name: "Psychology",
        hashtags: [
          "Cognitive", "Clinical", "Social", "Developmental",
          "Educational", "Industrial-Organizational",
        ],
      },
      {
        name: "Sociology",
        hashtags: ["Social Stratification", "Sociological Theory", "Demography", "Social Movements", "Culture"],
      },
      {
        name: "Anthropology",
        hashtags: ["Cultural Anthropology", "Archaeology", "Biological Anthropology", "Ethnography", "Linguistics"],
      },
      {
        name: "Political Science",
        hashtags: ["Comparative Politics", "Political Theory", "Geopolitics", "Electoral Systems", "Political Economy"],
      },
      {
        name: "International Relations",
        hashtags: ["Diplomacy", "Foreign Policy", "Conflict Resolution", "Global Governance", "International Security"],
      },
      {
        name: "Public Administration",
        hashtags: ["Public Policy", "Governance", "Bureaucracy", "Organizational Behavior", "Local Government"],
      },
      {
        name: "Law",
        hashtags: ["Constitutional Law", "International Law", "Jurisprudence", "Criminal Law", "Civil Rights"],
      },
      {
        name: "Criminology",
        hashtags: ["Penology", "Criminal Justice", "Forensic Science", "Victimology", "Juvenile Delinquency"],
      },
      {
        name: "Communication",
        hashtags: ["Media Studies", "Public Relations", "Journalism", "Interpersonal Communication", "Mass Media"],
      },
      {
        name: "Education",
        hashtags: ["Pedagogy", "Curriculum Design", "Educational Psychology", "Special Education", "Online Learning"],
      },
      {
        name: "Human Geography",
        hashtags: ["Cultural Geography", "Economic Geography", "Geopolitics", "Spatial Analysis", "Environmental Geography"],
      },
      {
        name: "Demography",
        hashtags: ["Population Growth", "Migration", "Fertility Rates", "Mortality", "Census Data"],
      },
      {
        name: "Urban Studies",
        hashtags: ["Urban Planning", "Gentrification", "Smart Cities", "Urban Sociology", "Sustainable Cities"],
      },
      {
        name: "Business",
        hashtags: [
          "Management", "Marketing", "Accounting", "Entrepreneurship", "Supply Chain",
        ],
      },
    ],
  },
  {
    name: "Humanities & Arts",
    level2: [
      {
        name: "Philosophy",
        hashtags: [
          "Ethics", "Metaphysics", "Epistemology", "Logic", "Philosophy of Science",
        ],
      },
      {
        name: "History",
        hashtags: ["Ancient History", "Medieval History", "Modern History", "Historiography", "World War"],
      },
      {
        name: "Archaeology",
        hashtags: ["Excavation", "Paleontology", "Ancient Civilizations", "Artefacts"],
      },
      {
        name: "Linguistics",
        hashtags: ["Phonetics", "Syntax", "Semantics", "Sociolinguistics", "Historical Linguistics"],
      },
      {
        name: "Literature",
        hashtags: ["Poetry", "Prose", "Literary Criticism", "Drama", "Comparative Literature"],
      },
      {
        name: "Religious Studies",
        hashtags: ["Comparative Religion", "Theology", "Mythology", "Philosophy of Religion", "Secularism"],
      },
      {
        name: "Classics",
        hashtags: ["Ancient Greece", "Roman Empire", "Classical Mythology", "Latin Literature", "Ancient Philosophy"],
      },
      {
        name: "Cultural Studies",
        hashtags: ["Popular Culture", "Identity Politics", "Postcolonialism", "Media Culture", "Subcultures"],
      },
      {
        name: "Performing Arts",
        hashtags: ["Theatre", "Dance", "Opera", "Performance Theory", "Improv"],
      },
      {
        name: "Music",
        hashtags: ["Musicology", "Music Theory", "Ethnomusicology", "Composition", "History of Music"],
      },
      {
        name: "Visual Arts",
        hashtags: ["Painting", "Sculpture", "Photography", "Art History", "Fine Arts"],
      },
      {
        name: "Film Studies",
        hashtags: ["Cinema History", "Film Theory", "Screenwriting", "Directing", "Cinematography"],
      },
      {
        name: "Architecture",
        hashtags: ["Architectural History", "Urban Design", "Sustainable Architecture", "Landscape Architecture", "Interior Design"],
      },
      {
        name: "Design",
        hashtags: ["Graphic Design", "Industrial Design", "UX/UI Design", "Fashion Design", "Typography"],
      },
    ],
  },
  {
    name: "Interdisciplinary Sciences",
    level2: [
      {
        name: "Data Science",
        hashtags: ["Machine Learning", "Data Visualization", "Big Data", "Predictive Analytics", "Statistical Modeling"],
      },
      {
        name: "Data Engineering",
        hashtags: ["ETL Pipelines", "Data Warehousing", "Hadoop", "Spark", "Database Architecture"],
      },
      {
        name: "Bioinformatics",
        hashtags: ["Sequence Analysis", "Genomics", "Proteomics", "Phylogenetics", "Structural Biology"],
      },
      {
        name: "Computational Biology",
        hashtags: ["Biological Modeling", "Systems Biology", "Network Biology", "Molecular Dynamics", "Genomic Mapping"],
      },
      {
        name: "Systems Biology",
        hashtags: ["Metabolic Pathways", "Gene Regulatory Networks", "Mathematical Biology", "Cell Signaling"],
      },
      {
        name: "Computational Chemistry",
        hashtags: ["Molecular Modeling", "Quantum Chemistry", "Density Functional Theory", "Cheminformatics"],
      },
      {
        name: "Computational Physics",
        hashtags: ["Monte Carlo Methods", "Lattice QCD", "Numerical Simulations", "Astrophysical Modeling"],
      },
      {
        name: "Scientific Computing",
        hashtags: ["Numerical Analysis", "High-Performance Computing", "Finite Element Method", "Simulation Software"],
      },
      {
        name: "Human-Computer Interaction",
        hashtags: ["User Experience", "Usability Testing", "Interaction Design", "Virtual Reality", "Accessibility"],
      },
      {
        name: "Computational Linguistics",
        hashtags: ["NLP", "Machine Translation", "Speech Recognition", "Sentiment Analysis", "Parsing"],
      },
      {
        name: "Cognitive Science",
        hashtags: ["Cognitive Psychology", "Artificial Intelligence", "Philosophy of Mind", "Linguistics", "Neurocognition"],
      },
      {
        name: "Neuroscience",
        hashtags: ["Neurobiology", "Cognitive Neuroscience", "Neuroimaging", "Synaptic Plasticity", "Computational Neuroscience"],
      },
      {
        name: "Behavioral Science",
        hashtags: ["Behavioral Economics", "Social Psychology", "Decision Making", "Nudge Theory", "Cognitive Bias"],
      },
      {
        name: "Complexity Science",
        hashtags: ["Complex Adaptive Systems", "Chaos Theory", "Self-Organization", "Agent-Based Modeling", "Fractals"],
      },
      {
        name: "Network Science",
        hashtags: ["Graph Theory", "Social Network Analysis", "Scale-Free Networks", "Centrality Metrics", "Network Topology"],
      },
      {
        name: "Digital Humanities",
        hashtags: ["Text Mining", "Digital Archiving", "GIS in History", "Cultural Analytics", "Computational Literary Studies"],
      },
      {
        name: "Geoinformatics",
        hashtags: ["Remote Sensing", "Photogrammetry", "Geospatial Analysis", "Spatial Databases", "GPS Technology"],
      },
      {
        name: "Geographic Information Systems",
        hashtags: ["ArcGIS", "QGIS", "Cartography", "Spatial Mapping", "Urban Informatics"],
      },
      {
        name: "Cybersecurity",
        hashtags: ["Cryptography", "Penetration Testing", "Network Security", "Malware Analysis", "Zero Trust"],
      },
      {
        name: "Quantum Computing",
        hashtags: ["Quantum Algorithms", "Qubits", "Quantum Cryptography", "Quantum Entanglement", "Superconducting Qubits"],
      },
      {
        name: "FinTech",
        hashtags: ["Blockchain", "Algorithmic Trading", "Smart Contracts", "DeFi", "Digital Banking"],
      },
      {
        name: "Health Informatics",
        hashtags: ["Electronic Health Records", "Telemedicine", "Clinical Decision Support", "Medical Data Privacy"],
      },
      {
        name: "Medical Imaging",
        hashtags: ["MRI Reconstruction", "CT Segmentation", "Image Processing", "Computer-Aided Diagnosis"],
      },
      {
        name: "Computational Social Science",
        hashtags: ["Social Simulation", "Opinion Dynamics", "Big Data in Sociology", "Network Analysis"],
      },
      {
        name: "Educational Technology",
        hashtags: ["LMS", "E-Learning", "Gamification", "Adaptive Learning", "Digital Classrooms"],
      },
      {
        name: "Explainable AI",
        hashtags: ["SHAP", "LIME", "Interpretability", "Model Transparency", "Feature Attribution"],
      },
      {
        name: "AI Alignment",
        hashtags: ["Reward Specification", "AI Value Alignment", "Agent Foundation", "Reinforcement Learning from Human Feedback"],
      },
      {
        name: "AI Safety",
        hashtags: ["Robustness", "Anomaly Detection", "AI Governance", "Risk Assessment", "Adversarial Attacks"],
      },
      {
        name: "Synthetic Biology",
        hashtags: ["Gene Editing", "Metabolic Engineering", "Biobricks", "Genetic Circuits", "CRISPR"],
      },
      {
        name: "Precision Medicine",
        hashtags: ["Pharmacogenomics", "Targeted Therapy", "Personalized Health", "Biomarkers"],
      },
      {
        name: "Computational Economics",
        hashtags: ["Agent-Based Computational Economics", "Macroeconomic Modeling", "Algorithmic Game Theory"],
      },
      {
        name: "Climate Informatics",
        hashtags: ["Climate Modeling", "Machine Learning for Weather", "Carbon Modeling", "Climate Data Analysis"],
      },
      {
        name: "Digital Twin Systems",
        hashtags: ["IoT Integration", "Predictive Maintenance", "Smart Infrastructure", "Simulation Modeling"],
      },
    ],
  },
];

function parseLevel2(entry: Level2Entry): { name: string; hashtags: string[] } {
  if (typeof entry === "string") {
    return { name: entry, hashtags: [] };
  }
  return entry;
}

async function main() {
  console.log("Seeding domains & hashtags...");

  const canonicalDomainNames = new Set<string>();
  const canonicalHashtagNames = new Set<string>();

  for (const l1 of SEED_DATA) {
    canonicalDomainNames.add(l1.name);
    for (const entry of l1.level2) {
      const { name, hashtags } = parseLevel2(entry);
      canonicalDomainNames.add(name);
      for (const tag of hashtags) {
        canonicalHashtagNames.add(tag);
      }
    }
  }

  // Delete stale domains
  const domainArr = [...canonicalDomainNames];
  const staleDomains = await prisma.domain.findMany({
    where: { name: { notIn: domainArr } },
    select: { name: true },
  });
  if (staleDomains.length > 0) {
    console.log(`Deleting stale domains: ${staleDomains.map(d => d.name).join(", ")}`);
    await prisma.domain.deleteMany({ where: { name: { notIn: domainArr } } });
  }

  // Delete stale hashtags
  const tagArr = [...canonicalHashtagNames];
  const staleTags = await prisma.hashtag.findMany({
    where: { name: { notIn: tagArr } },
    select: { name: true },
  });
  if (staleTags.length > 0) {
    console.log(`Deleting stale hashtags: ${staleTags.map(t => t.name).join(", ")}`);
    await prisma.hashtag.deleteMany({ where: { name: { notIn: tagArr } } });
  }

  // Upsert domains & hashtags with computed parentDomainId strings
  for (const [l1Index, l1] of SEED_DATA.entries()) {
    const l1ParentDomainId = String((l1Index + 1) * 1000);

    await prisma.domain.upsert({
      where: { name: l1.name },
      update: { parentDomainId: l1ParentDomainId },
      create: { name: l1.name, parentDomainId: l1ParentDomainId },
    });

    for (const [l2Index, entry] of l1.level2.entries()) {
      const { name: l2Name, hashtags } = parseLevel2(entry);
      const l2ParentDomainId = String((l1Index + 1) * 1000 + (l2Index + 1) * 10);

      await prisma.domain.upsert({
        where: { name: l2Name },
        update: { parentDomainId: l2ParentDomainId },
        create: { name: l2Name, parentDomainId: l2ParentDomainId },
      });

      for (const tag of hashtags) {
        await prisma.hashtag.upsert({
          where: { name: tag },
          update: { parentDomainId: l2ParentDomainId },
          create: { name: tag, parentDomainId: l2ParentDomainId },
        });
      }
    }
  }

  console.log("Done seeding domains & hashtags.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
