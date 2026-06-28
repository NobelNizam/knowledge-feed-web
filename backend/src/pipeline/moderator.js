/**
 * Moderator — Content Moderation
 * 
 * Rule-based content filtering untuk memastikan konten
 * aman, sesuai kebijakan, dan layak dipublikasikan.
 */

// Daftar keyword yang tidak diperbolehkan
const BLACKLIST_KEYWORDS = [
  // Hate speech
  'hate', 'supremacy', 'genocide', 'ethnic cleansing',
  // Violence
  'how to kill', 'how to harm', 'weapon construction',
  // Explicit content
  'pornography', 'sexually explicit',
  // Dangerous misinformation
  'flat earth proven', 'vaccines cause autism', 'hoax confirmed',
];

// Daftar keyword yang memerlukan review
const REVIEW_KEYWORDS = [
  'controversial', 'disputed', 'unproven', 'conspiracy',
  'alternative medicine', 'pseudoscience',
];

// Domain yang diperbolehkan (Level 2 Disciplines)
const ALLOWED_DOMAINS = [
  // Formal Sciences
  'Mathematics', 'Logic', 'Statistics', 'Theoretical Computer Science', 'Information Theory', 'Complex Systems', 'Decision Science', 'Game Theory',
  // Natural Sciences
  'Physics', 'Chemistry', 'Biology', 'Earth Science', 'Astronomy',
  // Engineering & Technology
  'Mechanical Engineering', 'Electrical Engineering', 'Computer Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Industrial Engineering', 'Nuclear Engineering', 'Environmental Engineering', 'Materials Engineering', 'Marine Engineering', 'Biomedical Engineering', 'Mechatronics', 'Artificial Intelligence',
  // Medical & Health Sciences
  'Anatomy', 'Physiology', 'Pathology', 'Pharmacology', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Psychiatry', 'Neurology', 'Cardiology', 'Oncology', 'Radiology', 'Public Health', 'Epidemiology', 'Nutrition', 'Dentistry', 'Nursing', 'Rehabilitation', 'Sports Medicine',
  // Agricultural & Environmental Sciences
  'Agriculture', 'Agronomy', 'Soil Science', 'Forestry', 'Fisheries', 'Aquaculture', 'Veterinary Medicine', 'Animal Science', 'Food Science', 'Environmental Science', 'Sustainability', 'Climate Science', 'Conservation Biology',
  // Social Sciences
  'Economics', 'Psychology', 'Sociology', 'Anthropology', 'Political Science', 'International Relations', 'Public Administration', 'Law', 'Criminology', 'Communication', 'Education', 'Human Geography', 'Demography', 'Urban Studies', 'Business',
  // Humanities & Arts
  'Philosophy', 'History', 'Archaeology', 'Linguistics', 'Literature', 'Religious Studies', 'Classics', 'Cultural Studies', 'Performing Arts', 'Music', 'Visual Arts', 'Film Studies', 'Architecture', 'Design',
  // Interdisciplinary Sciences
  'Data Science', 'Data Engineering', 'Bioinformatics', 'Computational Biology', 'Systems Biology', 'Computational Chemistry', 'Computational Physics', 'Scientific Computing', 'Human-Computer Interaction', 'Computational Linguistics', 'Cognitive Science', 'Neuroscience', 'Behavioral Science', 'Complexity Science', 'Network Science', 'Digital Humanities', 'Geoinformatics', 'Geographic Information Systems', 'Cybersecurity', 'Quantum Computing', 'FinTech', 'Health Informatics', 'Medical Imaging', 'Computational Social Science', 'Educational Technology', 'Explainable AI', 'AI Alignment', 'AI Safety', 'Synthetic Biology', 'Precision Medicine', 'Computational Economics', 'Climate Informatics', 'Digital Twin Systems'
];

// Batasan konten
const CONTENT_LIMITS = {
  minTitleLength: 5,
  maxTitleLength: 200,
  minContentLength: 20,
  maxContentLength: 5000,
};

/**
 * Cek apakah teks mengandung keyword blacklist
 * @param {string} text - Teks yang akan dicek
 * @returns {Object} { found: boolean, keywords: string[] }
 */
function checkBlacklist(text) {
  const lowerText = text.toLowerCase();
  const found = BLACKLIST_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
  return { found: found.length > 0, keywords: found };
}

/**
 * Cek apakah teks mengandung keyword yang perlu review
 * @param {string} text - Teks yang akan dicek
 * @returns {Object} { found: boolean, keywords: string[] }
 */
function checkReviewKeywords(text) {
  const lowerText = text.toLowerCase();
  const found = REVIEW_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
  return { found: found.length > 0, keywords: found };
}

/**
 * Validasi panjang konten
 * @param {string} title - Judul
 * @param {string} content - Konten
 * @returns {Object} { valid: boolean, issues: string[] }
 */
function validateContentLength(title, content) {
  const issues = [];

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

/**
 * Validasi domain konten
 * @param {string} domain - Domain konten
 * @returns {boolean} true jika domain diperbolehkan
 */
function isAllowedDomain(domain) {
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(
    allowed => domain.toLowerCase().includes(allowed.toLowerCase())
  );
}

/**
 * Moderate sebuah knowledge card
 * @param {Object} card - Knowledge card { title, content, domain, tags }
 * @returns {Object} Moderation result { status, flags, reason }
 */
function moderateCard(card) {
  const flags = [];
  let status = 'approved'; // approved | review | blocked

  const fullText = `${card.title || ''} ${card.content || ''}`;

  // Check 1: Blacklist keywords
  const blacklistCheck = checkBlacklist(fullText);
  if (blacklistCheck.found) {
    status = 'blocked';
    flags.push({
      type: 'blacklist',
      severity: 'critical',
      details: `Blacklisted keywords found: ${blacklistCheck.keywords.join(', ')}`,
    });
  }

  // Check 2: Review keywords
  const reviewCheck = checkReviewKeywords(fullText);
  if (reviewCheck.found && status !== 'blocked') {
    status = 'review';
    flags.push({
      type: 'review_keyword',
      severity: 'warning',
      details: `Review keywords found: ${reviewCheck.keywords.join(', ')}`,
    });
  }

  // Check 3: Content length validation
  const lengthCheck = validateContentLength(card.title, card.content);
  if (!lengthCheck.valid) {
    if (status !== 'blocked') status = 'review';
    flags.push({
      type: 'content_length',
      severity: 'warning',
      details: lengthCheck.issues.join('; '),
    });
  }

  // Check 4: Domain validation
  if (!isAllowedDomain(card.domain)) {
    if (status !== 'blocked') status = 'review';
    flags.push({
      type: 'domain',
      severity: 'info',
      details: `Domain "${card.domain}" is not in the allowed list`,
    });
  }

  // Check 5: Empty/missing fields
  if (!card.title || !card.content) {
    status = 'blocked';
    flags.push({
      type: 'missing_fields',
      severity: 'critical',
      details: 'Title or content is missing',
    });
  }

  const reason = flags.length > 0
    ? flags.map(f => f.details).join(' | ')
    : 'All checks passed';

  console.log(`[Moderator] Card "${(card.title || '').substring(0, 50)}": ${status} (${flags.length} flags)`);

  return { status, flags, reason };
}

/**
 * Batch moderate multiple cards
 * @param {Array<Object>} cards - Array of knowledge cards
 * @returns {Array<Object>} Array of moderation results with card reference
 */
function moderateCards(cards) {
  return cards.map(card => ({
    card,
    moderation: moderateCard(card),
  }));
}

module.exports = {
  moderateCard,
  moderateCards,
  checkBlacklist,
  checkReviewKeywords,
  validateContentLength,
  isAllowedDomain,
  BLACKLIST_KEYWORDS,
  REVIEW_KEYWORDS,
  ALLOWED_DOMAINS,
  CONTENT_LIMITS,
};
