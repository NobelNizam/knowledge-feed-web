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
      "Matematika",
      "Logika",
      "Statistika",
      "Ilmu Komputer Teoretis",
      "Teori Informasi",
      "Sistem Kompleks",
      "Decision Science",
      "Game Theory",
    ],
  },
  {
    name: "Natural Sciences",
    level2: [
      {
        name: "Fisika",
        hashtags: [
          "Mekanika",
          "Elektromagnetik",
          "Optik",
          "Termodinamika",
          "Fisika Nuklir",
          "Fisika Partikel",
          "Relativitas",
          "Quantum Physics",
          "Astrofisika",
          "Plasma",
        ],
      },
      {
        name: "Kimia",
        hashtags: [
          "Organik",
          "Anorganik",
          "Analitik",
          "Fisik",
          "Biokimia",
          "Material",
          "Polimer",
          "Elektrokimia",
        ],
      },
      {
        name: "Biologi",
        hashtags: [
          "Sel",
          "Molekuler",
          "Genetika",
          "Evolusi",
          "Ekologi",
          "Mikrobiologi",
          "Zoologi",
          "Botani",
          "Imunologi",
          "Neurosains",
        ],
      },
      {
        name: "Earth Science",
        hashtags: [
          "Geologi",
          "Vulkanologi",
          "Mineralogi",
          "Seismologi",
          "Paleontologi",
          "Hidrologi",
          "Oseanografi",
          "Meteorologi",
          "Klimatologi",
        ],
      },
      {
        name: "Astronomy",
        hashtags: [
          "Planetary Science",
          "Cosmology",
          "Stellar Astronomy",
          "Galactic Astronomy",
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
          "Electronics",
          "Embedded Systems",
          "Signal Processing",
          "Telecommunications",
          "Control Systems",
        ],
      },
      {
        name: "Computer Engineering",
        hashtags: [
          "Hardware",
          "Operating Systems",
          "Computer Architecture",
          "IoT",
        ],
      },
      {
        name: "Civil Engineering",
        hashtags: [
          "Structural",
          "Transportation",
          "Water Resources",
          "Construction",
        ],
      },
      "Chemical Engineering",
      "Aerospace Engineering",
      "Industrial Engineering",
      "Nuclear Engineering",
      "Environmental Engineering",
      "Materials Engineering",
      "Marine Engineering",
      "Biomedical Engineering",
      "Mechatronics",
      {
        name: "Artificial Intelligence",
        hashtags: [
          "Machine Learning",
          "Deep Learning",
          "Reinforcement Learning",
          "Computer Vision",
          "NLP",
          "Robotics",
          "AI Safety",
          "Multi-Agent Systems",
        ],
      },
    ],
  },
  {
    name: "Medical & Health Sciences",
    level2: [
      "Anatomy",
      "Physiology",
      "Pathology",
      "Pharmacology",
      "Surgery",
      "Internal Medicine",
      "Pediatrics",
      "Psychiatry",
      "Neurology",
      "Cardiology",
      "Oncology",
      "Radiology",
      "Public Health",
      "Epidemiology",
      "Nutrition",
      "Dentistry",
      "Nursing",
      "Rehabilitation",
      "Sports Medicine",
    ],
  },
  {
    name: "Agricultural & Environmental Sciences",
    level2: [
      "Agriculture",
      "Agronomy",
      "Soil Science",
      "Forestry",
      "Fisheries",
      "Aquaculture",
      "Veterinary Medicine",
      "Animal Science",
      "Food Science",
      "Environmental Science",
      "Sustainability",
      "Climate Science",
      "Conservation Biology",
    ],
  },
  {
    name: "Social Sciences",
    level2: [
      {
        name: "Economics",
        hashtags: [
          "Micro",
          "Macro",
          "Econometrics",
          "Behavioral Economics",
          "Finance",
        ],
      },
      {
        name: "Psychology",
        hashtags: [
          "Cognitive",
          "Clinical",
          "Social",
          "Developmental",
          "Educational",
          "Industrial-Organizational",
        ],
      },
      "Sociology",
      "Anthropology",
      "Political Science",
      "International Relations",
      "Public Administration",
      "Law",
      "Criminology",
      "Communication",
      "Education",
      "Human Geography",
      "Demography",
      "Urban Studies",
      {
        name: "Business",
        hashtags: [
          "Management",
          "Marketing",
          "Accounting",
          "Entrepreneurship",
          "Supply Chain",
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
          "Ethics",
          "Metaphysics",
          "Epistemology",
          "Logic",
          "Philosophy of Science",
        ],
      },
      "History",
      "Archaeology",
      "Linguistics",
      "Literature",
      "Religious Studies",
      "Classics",
      "Cultural Studies",
      "Performing Arts",
      "Music",
      "Visual Arts",
      "Film Studies",
      "Architecture",
      "Design",
    ],
  },
  {
    name: "Interdisciplinary Modern",
    level2: [
      "Data Science",
      "Data Engineering",
      "Bioinformatics",
      "Computational Biology",
      "Systems Biology",
      "Computational Chemistry",
      "Computational Physics",
      "Scientific Computing",
      "Human-Computer Interaction (HCI)",
      "Computational Linguistics",
      "Cognitive Science",
      "Neuroscience",
      "Behavioral Science",
      "Complexity Science",
      "Network Science",
      "Digital Humanities",
      "Geoinformatics",
      "Geographic Information Systems (GIS)",
      "Cybersecurity",
      "Quantum Computing",
      "FinTech",
      "Health Informatics",
      "Medical Imaging",
      "Computational Social Science",
      "Educational Technology",
      "Explainable AI (XAI)",
      "AI Alignment",
      "AI Safety",
      "Synthetic Biology",
      "Precision Medicine",
      "Computational Economics",
      "Climate Informatics",
      "Digital Twin Systems",
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

  for (const l1 of SEED_DATA) {
    const domain1 = await prisma.domain.upsert({
      where: { name: l1.name },
      update: {},
      create: { name: l1.name },
    });

    for (const entry of l1.level2) {
      const { name: l2Name, hashtags } = parseLevel2(entry);

      const domain2 = await prisma.domain.upsert({
        where: { name: l2Name },
        update: { parentDomainId: domain1.id },
        create: { name: l2Name, parentDomainId: domain1.id },
      });

      for (const tag of hashtags) {
        await prisma.hashtag.upsert({
          where: { name: tag },
          update: { domainId: domain2.id },
          create: { name: tag, domainId: domain2.id },
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
