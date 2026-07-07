/**
 * Moderator — Content Moderation
 *
 * Rule-based content filtering untuk memastikan konten
 * aman, sesuai kebijakan, dan layak dipublikasikan.
 */

const BLACKLIST_KEYWORDS: string[] = [
  // Hate speech
  'hate', 'supremacy', 'genocide', 'ethnic cleansing',
  // Violence
  'how to kill', 'how to harm', 'weapon construction',
  // Explicit content
  'pornography', 'sexually explicit',
  // Dangerous misinformation
  'flat earth proven', 'vaccines cause autism', 'hoax confirmed',
];

const REVIEW_KEYWORDS: string[] = [
  'controversial', 'disputed', 'unproven', 'conspiracy',
  'alternative medicine', 'pseudoscience',
];

const ALLOWED_DOMAINS: string[] = [
  'Mathematics', 'Logic', 'Statistics', 'Theoretical Computer Science', 'Information Theory', 'Complex Systems', 'Decision Science', 'Game Theory',
  'Physics', 'Chemistry', 'Biology', 'Earth Science', 'Astronomy',
  'Mechanical Engineering', 'Electrical Engineering', 'Computer Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Industrial Engineering', 'Nuclear Engineering', 'Environmental Engineering', 'Materials Engineering', 'Marine Engineering', 'Biomedical Engineering', 'Mechatronics', 'Artificial Intelligence',
  'Anatomy', 'Physiology', 'Pathology', 'Pharmacology', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Psychiatry', 'Neurology', 'Cardiology', 'Oncology', 'Radiology', 'Public Health', 'Epidemiology', 'Nutrition', 'Dentistry', 'Nursing', 'Rehabilitation', 'Sports Medicine',
  'Agriculture', 'Agronomy', 'Soil Science', 'Forestry', 'Fisheries', 'Aquaculture', 'Veterinary Medicine', 'Animal Science', 'Food Science', 'Environmental Science', 'Sustainability', 'Climate Science', 'Conservation Biology',
  'Economics', 'Psychology', 'Sociology', 'Anthropology', 'Political Science', 'International Relations', 'Public Administration', 'Law', 'Criminology', 'Communication', 'Education', 'Human Geography', 'Demography', 'Urban Studies', 'Business',
  'Philosophy', 'History', 'Archaeology', 'Linguistics', 'Literature', 'Religious Studies', 'Classics', 'Cultural Studies', 'Performing Arts', 'Music', 'Visual Arts', 'Film Studies', 'Architecture', 'Design',
  'Data Science', 'Data Engineering', 'Bioinformatics', 'Computational Biology', 'Systems Biology', 'Computational Chemistry', 'Computational Physics', 'Scientific Computing', 'Human-Computer Interaction', 'Computational Linguistics', 'Cognitive Science', 'Neuroscience', 'Behavioral Science', 'Complexity Science', 'Network Science', 'Digital Humanities', 'Geoinformatics', 'Geographic Information Systems', 'Cybersecurity', 'Quantum Computing', 'FinTech', 'Health Informatics', 'Medical Imaging', 'Computational Social Science', 'Educational Technology', 'Explainable AI', 'AI Alignment', 'AI Safety', 'Synthetic Biology', 'Precision Medicine', 'Computational Economics', 'Climate Informatics', 'Digital Twin Systems',
];

const CONTENT_LIMITS = {
  minTitleLength: 5,
  maxTitleLength: 200,
  minContentLength: 20,
  maxContentLength: 5000,
};

export function checkBlacklist(text: string): { found: boolean; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const found = BLACKLIST_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
  return { found: found.length > 0, keywords: found };
}

export function checkReviewKeywords(text: string): { found: boolean; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const found = REVIEW_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
  return { found: found.length > 0, keywords: found };
}

export function validateContentLength(
  title: string | undefined,
  content: string | undefined
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!title || title.length < CONTENT_LIMITS.minTitleLength) {
    issues.push(`Title too short (min ${CONTENT_LIMITS.minTitleLength} chars)`);
  }
  if (title && title.length > CONTENT_LIMITS.maxTitleLength) {
    issues.push(`Title too long (max ${CONTENT_LIMITS.maxTitleLength} chars)`);
  }
  if (!content || content.length < CONTENT_LIMITS.minContentLength) {
    issues.push(`Content too short (min ${CONTENT_LIMITS.minContentLength} chars)`);
  }
  if (content && content.length > CONTENT_LIMITS.maxContentLength) {
    issues.push(`Content too long (max ${CONTENT_LIMITS.maxContentLength} chars)`);
  }

  return { valid: issues.length === 0, issues };
}

export function isAllowedDomain(domain: string | undefined | null): boolean {
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(
    (allowed) => domain.toLowerCase().includes(allowed.toLowerCase())
  );
}

interface Card {
  title?: string;
  content?: string;
  domain?: string;
  tags?: string[];
}

interface ModerationResult {
  status: 'approved' | 'review' | 'blocked';
  flags: { type: string; severity: string; details: string }[];
  reason: string;
}

export function moderateCard(card: Card): ModerationResult {
  const flags: ModerationResult['flags'] = [];
  let status: ModerationResult['status'] = 'approved';

  const fullText = `${card.title || ''} ${card.content || ''}`;

  const blacklistCheck = checkBlacklist(fullText);
  if (blacklistCheck.found) {
    status = 'blocked';
    flags.push({
      type: 'blacklist',
      severity: 'critical',
      details: `Blacklisted keywords found: ${blacklistCheck.keywords.join(', ')}`,
    });
  }

  const reviewCheck = checkReviewKeywords(fullText);
  if (reviewCheck.found && status !== 'blocked') {
    status = 'review';
    flags.push({
      type: 'review_keyword',
      severity: 'warning',
      details: `Review keywords found: ${reviewCheck.keywords.join(', ')}`,
    });
  }

  const lengthCheck = validateContentLength(card.title, card.content);
  if (!lengthCheck.valid) {
    if (status !== 'blocked') status = 'review';
    flags.push({
      type: 'content_length',
      severity: 'warning',
      details: lengthCheck.issues.join('; '),
    });
  }

  if (!isAllowedDomain(card.domain)) {
    status = 'blocked';
    flags.push({
      type: 'domain',
      severity: 'critical',
      details: `Domain "${card.domain}" is not in the allowed list`,
    });
  }

  if (!card.title || !card.content) {
    status = 'blocked';
    flags.push({
      type: 'missing_fields',
      severity: 'critical',
      details: 'Title or content is missing',
    });
  }

  const reason = flags.length > 0
    ? flags.map((f) => f.details).join(' | ')
    : 'All checks passed';

  console.log(`[Moderator] Card "${(card.title || '').substring(0, 50)}": ${status} (${flags.length} flags)`);

  return { status, flags, reason };
}

export function moderateCards(cards: Card[]) {
  return cards.map((card) => ({
    card,
    moderation: moderateCard(card),
  }));
}
