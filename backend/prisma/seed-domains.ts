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
      "Mathematics",
      "Logic",
      "Statistics",
      "Theoretical Computer Science",
      "Information Theory",
      "Complex Systems",
      "Decision Science",
      "Game Theory",
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
          "Machine Learning", "Deep Learning", "Reinforcement Learning",
          "Computer Vision", "NLP", "Robotics", "AI Safety", "Multi-Agent Systems",
        ],
      },
    ],
  },
  {
    name: "Medical & Health Sciences",
    level2: [
      "Anatomy", "Physiology", "Pathology", "Pharmacology",
      "Surgery", "Internal Medicine", "Pediatrics", "Psychiatry",
      "Neurology", "Cardiology", "Oncology", "Radiology",
      "Public Health", "Epidemiology", "Nutrition", "Dentistry",
      "Nursing", "Rehabilitation", "Sports Medicine",
    ],
  },
  {
    name: "Agricultural & Environmental Sciences",
    level2: [
      "Agriculture", "Agronomy", "Soil Science", "Forestry",
      "Fisheries", "Aquaculture", "Veterinary Medicine", "Animal Science",
      "Food Science", "Environmental Science", "Sustainability",
      "Climate Science", "Conservation Biology",
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
      "Sociology", "Anthropology", "Political Science",
      "International Relations", "Public Administration", "Law",
      "Criminology", "Communication", "Education",
      "Human Geography", "Demography", "Urban Studies",
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
      "History", "Archaeology", "Linguistics", "Literature",
      "Religious Studies", "Classics", "Cultural Studies",
      "Performing Arts", "Music", "Visual Arts", "Film Studies",
      "Architecture", "Design",
    ],
  },
  {
    name: "Interdisciplinary Sciences",
    level2: [
      "Data Science", "Data Engineering", "Bioinformatics",
      "Computational Biology", "Systems Biology", "Computational Chemistry",
      "Computational Physics", "Scientific Computing",
      "Human-Computer Interaction", "Computational Linguistics",
      "Cognitive Science", "Neuroscience", "Behavioral Science",
      "Complexity Science", "Network Science", "Digital Humanities",
      "Geoinformatics", "Geographic Information Systems", "Cybersecurity",
      "Quantum Computing", "FinTech", "Health Informatics",
      "Medical Imaging", "Computational Social Science",
      "Educational Technology", "Explainable AI", "AI Alignment",
      "AI Safety", "Synthetic Biology", "Precision Medicine",
      "Computational Economics", "Climate Informatics", "Digital Twin Systems",
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
