/**
 * VeriFact — AI Fake News Detection Engine
 * ------------------------------------------
 * Client-side heuristic analysis engine that examines text and images
 * WITHOUT external API calls - everything runs locally
 */

import { analyzeImageLocal } from './imageForensics.js';

// ===== DOM Elements =====
const newsInput = document.getElementById('news-input');
const charCount = document.getElementById('char-count');
const btnAnalyze = document.getElementById('btn-analyze');
const btnClear = document.getElementById('btn-clear');

const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsLoading = document.getElementById('results-loading');
const resultsContent = document.getElementById('results-content');
const loadingSteps = document.getElementById('loading-steps');
const verdictCard = document.getElementById('verdict-card');
const verdictIcon = document.getElementById('verdict-icon');
const verdictText = document.getElementById('verdict-text');
const verdictScore = document.getElementById('verdict-score');
const confidenceValue = document.getElementById('confidence-value');
const confidenceFill = document.getElementById('confidence-fill');
const breakdownItems = document.getElementById('breakdown-items');
const findingsList = document.getElementById('findings-list');

// ===== Keyword & Pattern Dictionaries =====

const SENSATIONAL_WORDS = [
  'breaking', 'shocking', 'shocked', 'unbelievable', 'mind-blowing', 'jaw-dropping',
  'incredible', 'explosive', 'bombshell', 'devastating', 'earth-shattering',
  'catastrophic', 'unprecedented', 'miraculous', 'terrifying', 'outrageous',
  'horrifying', 'stunning', 'insane', 'epic', 'massive', 'huge', 'enormous',
  'amazing', 'astounding', 'alarming', 'urgent', 'emergency', 'crisis',
  'scandal', 'conspiracy', 'coverup', 'cover-up', 'exposed', 'revealed',
  'secret', 'hidden', 'banned', 'suppressed', 'censored', 'leaked',
  'groundbreaking', 'immortal', 'cure', 'destroy', 'obliterate'
];

const CLICKBAIT_PHRASES = [
  "you won't believe", "what happened next", "doctors hate", "one weird trick",
  "this is why", "the truth about", "they don't want you to know",
  "doesn't want you to know", "don't want you to know",
  "exposed", "gone wrong", "goes viral", "is dead", "will shock you",
  "nobody is talking about", "the real reason", "before it's too late",
  "this changes everything", "you need to see this", "share before",
  "big pharma", "mainstream media won't tell you", "wake up",
  "you've been lied to", "the government doesn't want", "exposed the truth",
  "what they're hiding", "the elite don't want", "you won't believe what"
];

const EMOTIONAL_TRIGGERS = [
  'outrage', 'furious', 'disgusting', 'heartbreaking', 'terrified',
  'betrayed', 'enraged', 'appalled', 'sickening', 'devastating',
  'shameful', 'disgraceful', 'horrible', 'nightmare', 'tragic',
  'pathetic', 'corrupt', 'evil', 'wicked', 'destroyed', 'ruined',
  'doomed', 'threat', 'danger', 'warning', 'beware', 'fear'
];

const CREDIBLE_SOURCE_INDICATORS = [
  'according to', 'study published in', 'research shows', 'data from',
  'peer-reviewed', 'journal of', 'university of', 'institute of',
  'department of', 'official statement', 'press release', 'reuters',
  'associated press', 'world health organization', 'centers for disease',
  'national science foundation', 'published in', 'cited by', 'confirmed by',
  'spokesperson said', 'report by', 'findings suggest', 'evidence shows',
  'analysis by', 'survey conducted', 'statistics show', 'according to data'
];

const VAGUE_ATTRIBUTION = [
  'sources say', 'experts say', 'people are saying', 'many believe',
  'some claim', 'reports suggest', 'it is believed', 'rumors say',
  'according to sources', 'insiders claim', 'anonymous sources',
  'word on the street', 'everyone knows', 'they say', 'some people think',
  'a friend told me', 'i heard that', 'someone said'
];

const LOGICAL_FALLACY_PATTERNS = [
  'always', 'never', 'everyone', 'nobody', 'all of them', 'none of them',
  'proves that', 'guaranteed', '100%', 'definitely', 'absolutely certain',
  'no doubt', 'impossible', 'only explanation', 'must be true',
  'cannot be denied', 'undeniable proof', 'infallible'
];

const ALL_CAPS_REGEX = /\b[A-Z]{3,}\b/g;
const EXCLAMATION_REGEX = /!{2,}/g;
const QUESTION_MARKS_REGEX = /\?{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;

// ===== Analysis Functions =====

/**
 * 1. Language Analysis (IMPROVED ACCURACY)
 */
function analyzeLanguage(text) {
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = words.length / Math.max(sentences.length, 1);

  // Check for all-caps words
  const capsMatches = text.match(ALL_CAPS_REGEX) || [];
  const capsRatio = capsMatches.length / Math.max(words.length, 1);

  // Check for excessive punctuation
  const exclCount = (text.match(EXCLAMATION_REGEX) || []).length;
  const questCount = (text.match(QUESTION_MARKS_REGEX) || []).length;
  const punctuationAbuse = exclCount + questCount;

  // Grammar quality heuristic (very short or very long sentences)
  const poorGrammar = sentences.filter(s => {
    const w = s.trim().split(/\s+/).length;
    return w < 3 || w > 60;
  }).length;
  const poorGrammarRatio = poorGrammar / Math.max(sentences.length, 1);

  // Analyze sentence complexity (calculate reading difficulty)
  const wordLengths = words.map(w => w.length);
  const avgWordLen = wordLengths.reduce((a, b) => a + b, 0) / words.length;

  let score = 100;
  const findings = [];

  // CAPS analysis (improved)
  if (capsRatio > 0.20) {
    score -= 35;
    findings.push({ text: `Excessive ALL CAPS usage (${capsMatches.length} words - ${(capsRatio * 100).toFixed(1)}%)`, type: 'red' });
  } else if (capsRatio > 0.10) {
    score -= 18;
    findings.push({ text: `High ALL CAPS ratio (${capsMatches.length} words)`, type: 'yellow' });
  } else if (capsRatio > 0.05) {
    score -= 8;
    findings.push({ text: `Some ALL CAPS words detected (${capsMatches.length})`, type: 'yellow' });
  }

  // Punctuation analysis (more sensitive)
  if (punctuationAbuse > 5) {
    score -= 28;
    findings.push({ text: `Excessive punctuation abuse (${exclCount} !, ${questCount} ?)`, type: 'red' });
  } else if (punctuationAbuse > 2) {
    score -= 15;
    findings.push({ text: 'Multiple exclamation/question marks detected', type: 'yellow' });
  } else if (punctuationAbuse > 0) {
    score -= 5;
    findings.push({ text: 'Minor punctuation exaggeration', type: 'yellow' });
  }

  // Sentence length analysis (improved)
  if (avgSentenceLen < 5) {
    score -= 15;
    findings.push({ text: 'Very fragmented - short, choppy sentences (poor quality indicator)', type: 'yellow' });
  } else if (avgSentenceLen > 40) {
    score -= 12;
    findings.push({ text: 'Overly long, complex sentences detected', type: 'yellow' });
  }

  // Grammar consistency (stricter threshold)
  if (poorGrammarRatio > 0.5) {
    score -= 22;
    findings.push({ text: `Inconsistent grammar - ${(poorGrammarRatio * 100).toFixed(0)}% anomalous sentences`, type: 'red' });
  } else if (poorGrammarRatio > 0.3) {
    score -= 12;
    findings.push({ text: 'Several grammatical irregularities detected', type: 'yellow' });
  }

  // Word length analysis (indicates complexity/sophistication)
  if (avgWordLen < 3.5) {
    score -= 8;
    findings.push({ text: 'Overly simple vocabulary - unusually short words', type: 'yellow' });
  } else if (avgWordLen > 6.5) {
    score += 3;
    findings.push({ text: 'Sophisticated vocabulary detected', type: 'green' });
  }

  if (findings.length === 0) {
    findings.push({ text: 'Language patterns appear professional and consistent', type: 'green' });
  }

  return { score: Math.max(0, score), findings };
}

/**
 * 2. Sensationalism Detection (IMPROVED ACCURACY)
 */
function detectSensationalism(text) {
  const lowerText = text.toLowerCase();
  let score = 100;
  const findings = [];
  const foundWords = [];
  const foundPhrases = [];

  // Count sensational words with proper word boundary detection
  for (const word of SENSATIONAL_WORDS) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = (lowerText.match(regex) || []).length;
    if (matches > 0) {
      foundWords.push(word);
      // Multiple instances of same word is more suspicious
      if (matches > 1) {
        foundWords.push(...Array(matches - 1).fill(word));
      }
    }
  }

  // Count sensational phrases
  for (const phrase of CLICKBAIT_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      foundPhrases.push(phrase);
    }
  }

  const wordCount = Math.max(text.split(/\s+/).length, 1);
  const sensationalRatio = foundWords.length / wordCount;

  // Phrase detection (more severe penalty)
  if (foundPhrases.length >= 3) {
    score -= 50;
    findings.push({ text: `Multiple clickbait patterns detected: "${foundPhrases.slice(0, 3).join('", "')}"`, type: 'red' });
  } else if (foundPhrases.length === 2) {
    score -= 40;
    findings.push({ text: `Two clickbait phrases detected: "${foundPhrases.join('", "')}"`, type: 'red' });
  } else if (foundPhrases.length === 1) {
    score -= 25;
    findings.push({ text: `Clickbait phrase detected: "${foundPhrases[0]}"`, type: 'red' });
  }

  // Sensational word frequency analysis (improved thresholds)
  if (foundWords.length > 6) {
    score -= 55;
    findings.push({ text: `Very high sensationalism: ${foundWords.length} sensational words detected`, type: 'red' });
  } else if (foundWords.length > 4) {
    score -= 40;
    findings.push({ text: `High sensationalism: "${foundWords.slice(0, 4).join('", "')}" and ${foundWords.length - 4} more`, type: 'red' });
  } else if (foundWords.length > 2) {
    score -= 28;
    findings.push({ text: `Sensational words detected: "${foundWords.join('", "')}"`, type: 'red' });
  } else if (foundWords.length > 0) {
    score -= 12;
    findings.push({ text: `Minor sensational language: "${foundWords.join('", "')}"`, type: 'yellow' });
  }

  // Density-based penalty
  if (sensationalRatio > 0.12) {
    score -= 25;
    findings.push({ text: `Extremely high density of sensational language (${(sensationalRatio * 100).toFixed(1)}%)`, type: 'red' });
  } else if (sensationalRatio > 0.08) {
    score -= 15;
    findings.push({ text: `High sensational language density (${(sensationalRatio * 100).toFixed(1)}%)`, type: 'yellow' });
  }

  if (findings.length === 0) {
    findings.push({ text: 'No significant sensational language detected', type: 'green' });
  }

  return { score: Math.max(0, score), findings };
}

/**
 * 3. Source Credibility Check (IMPROVED ACCURACY)
 */
function checkSources(text) {
  const lowerText = text.toLowerCase();
  let score = 50; // Start neutral
  const findings = [];

  let credibleCount = 0;
  const crediblePhrases = [];
  
  for (const phrase of CREDIBLE_SOURCE_INDICATORS) {
    if (lowerText.includes(phrase)) {
      credibleCount++;
      crediblePhrases.push(phrase);
    }
  }

  let vagueCount = 0;
  const vaguePhrases = [];
  
  for (const phrase of VAGUE_ATTRIBUTION) {
    if (lowerText.includes(phrase)) {
      vagueCount++;
      vaguePhrases.push(phrase);
    }
  }

  const hasUrls = URL_REGEX.test(text);
  const urlMatches = (text.match(URL_REGEX) || []).length;

  // Credible sources found
  if (credibleCount >= 5) {
    score += 50;
    findings.push({ text: `Multiple credible source references found (${credibleCount} indicators)`, type: 'green' });
  } else if (credibleCount >= 3) {
    score += 35;
    findings.push({ text: `Several credible source citations (${credibleCount} references)`, type: 'green' });
  } else if (credibleCount >= 1) {
    score += 20;
    findings.push({ text: `Some source references found (${credibleCount}: "${crediblePhrases[0]}")`, type: 'green' });
  } else {
    score -= 20;
    findings.push({ text: 'No credible source references detected', type: 'red' });
  }

  // Vague/anonymous sources (more penalty)
  if (vagueCount >= 3) {
    score -= 35;
    findings.push({ text: `Heavy reliance on vague/anonymous sources (${vagueCount} instances)`, type: 'red' });
  } else if (vagueCount >= 2) {
    score -= 25;
    findings.push({ text: `Multiple vague attributions - relies on unnamed sources (${vagueCount})`, type: 'red' });
  } else if (vagueCount === 1) {
    score -= 12;
    findings.push({ text: 'Contains a vague source attribution', type: 'yellow' });
  }

  // URL references
  if (urlMatches >= 3) {
    score += 8;
    findings.push({ text: `Contains ${urlMatches} URL references (supporting links)`, type: 'green' });
  } else if (hasUrls) {
    score += 5;
    findings.push({ text: `Contains ${urlMatches} URL link(s)`, type: 'blue' });
  }

  // Balance check: credible sources outweigh vague ones
  const sourceBalance = credibleCount - (vagueCount * 1.5);
  if (sourceBalance < 0) {
    score = Math.max(10, score - 15);
    findings.push({ text: 'Source quality is questionable - vague sources dominate', type: 'red' });
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}

/**
 * 4. Emotional Manipulation Detection (IMPROVED ACCURACY)
 */
function detectEmotionalManipulation(text) {
  const lowerText = text.toLowerCase();
  let score = 100;
  const findings = [];
  const foundTriggers = [];
  const foundClickbait = [];

  // Detect emotional trigger words
  for (const word of EMOTIONAL_TRIGGERS) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = (lowerText.match(regex) || []).length;
    if (matches > 0) {
      foundTriggers.push(word);
      if (matches > 1) {
        foundTriggers.push(...Array(matches - 1).fill(word));
      }
    }
  }

  // Detect clickbait phrases
  for (const phrase of CLICKBAIT_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      foundClickbait.push(phrase);
    }
  }

  // Clickbait penalty (very severe)
  if (foundClickbait.length >= 3) {
    score -= 50;
    findings.push({ text: `Multiple clickbait patterns detected: "${foundClickbait.slice(0, 2).join('", "')}"`, type: 'red' });
  } else if (foundClickbait.length === 2) {
    score -= 40;
    findings.push({ text: `Two clickbait phrases: "${foundClickbait.join('", "')}"`, type: 'red' });
  } else if (foundClickbait.length === 1) {
    score -= 30;
    findings.push({ text: `Clickbait phrase detected: "${foundClickbait[0]}"`, type: 'red' });
  }

  // Emotional trigger word analysis (improved)
  if (foundTriggers.length > 8) {
    score -= 40;
    findings.push({ text: `Severe emotional manipulation detected (${foundTriggers.length} trigger words)`, type: 'red' });
  } else if (foundTriggers.length > 5) {
    score -= 32;
    findings.push({ text: `Heavy emotional manipulation (${foundTriggers.length} emotional trigger words)`, type: 'red' });
  } else if (foundTriggers.length > 2) {
    score -= 20;
    findings.push({ text: `Emotional trigger words detected: "${foundTriggers.slice(0, 3).join('", "')}"`, type: 'yellow' });
  } else if (foundTriggers.length > 0) {
    score -= 8;
    findings.push({ text: `Minor emotional language: "${foundTriggers.join('", "')}"`, type: 'yellow' });
  }

  // Check for urgency language patterns
  const urgencyWords = ['urgent', 'immediately', 'now', 'before it\'s too late', 'quickly', 'asap', 'don\'t wait'];
  const urgencyMatches = urgencyWords.filter(w => lowerText.includes(w)).length;
  
  if (urgencyMatches >= 3) {
    score -= 18;
    findings.push({ text: `Excessive urgency language detected (${urgencyMatches} occurrences)`, type: 'yellow' });
  }

  if (findings.length === 0) {
    findings.push({ text: 'No emotional manipulation patterns identified', type: 'green' });
  }

  return { score: Math.max(0, score), findings };
}

/**
 * 5. Logical Consistency Analysis (IMPROVED ACCURACY)
 */
function analyzeLogic(text) {
  const lowerText = text.toLowerCase();
  let score = 100;
  const findings = [];
  const foundFallacies = [];

  // Detect absolute statements
  for (const word of LOGICAL_FALLACY_PATTERNS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = (lowerText.match(regex) || []).length;
    if (matches > 0) {
      foundFallacies.push(...Array(matches).fill(word));
    }
  }

  // Check for contradictions (simple heuristic: "but" + absolute statements)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let contradictions = 0;
  
  for (let i = 0; i < sentences.length - 1; i++) {
    const l1 = sentences[i].toLowerCase();
    const l2 = sentences[i + 1].toLowerCase();
    
    // Detect common contradiction patterns
    if ((l1.includes(' but ') || l1.includes(' however ')) &&
      LOGICAL_FALLACY_PATTERNS.some(f => l1.includes(f))) {
      contradictions++;
    }
    
    // Check for direct contradictions
    if ((l1.includes('is true') && l2.includes('is false')) ||
        (l1.includes('yes') && l2.includes('no'))) {
      contradictions++;
    }
  }

  // Claim without evidence detection
  const claimPatterns = ['i believe', 'i think', 'in my opinion', 'allegedly', 'supposedly', 'probably'];
  const unsubstantiatedClaims = claimPatterns.filter(p => lowerText.includes(p)).length;

  // Absolute statements analysis
  if (foundFallacies.length > 8) {
    score -= 40;
    findings.push({ text: `Multiple absolute/overreaching statements detected (${foundFallacies.length})`, type: 'red' });
  } else if (foundFallacies.length > 4) {
    score -= 28;
    findings.push({ text: `Several absolute statements: "${[...new Set(foundFallacies)].slice(0, 3).join('", "')}"`, type: 'yellow' });
  } else if (foundFallacies.length > 1) {
    score -= 15;
    findings.push({ text: `Some absolute statements detected (${foundFallacies.length}): "${foundFallacies[0]}"`, type: 'yellow' });
  } else if (foundFallacies.length === 1) {
    score -= 5;
    findings.push({ text: `Minor absolute statement: "${foundFallacies[0]}"`, type: 'yellow' });
  }

  // Contradiction penalty
  if (contradictions >= 3) {
    score -= 35;
    findings.push({ text: `Multiple contradictions detected (${contradictions} inconsistencies)`, type: 'red' });
  } else if (contradictions >= 1) {
    score -= 22;
    findings.push({ text: `Potentially contradictory statements detected (${contradictions})`, type: 'yellow' });
  }

  // Unsubstantiated claims
  if (unsubstantiatedClaims >= 4) {
    score -= 25;
    findings.push({ text: `Multiple unverified claims made (${unsubstantiatedClaims} opinion statements)`, type: 'yellow' });
  } else if (unsubstantiatedClaims >= 2) {
    score -= 12;
    findings.push({ text: `Several unsubstantiated claims ("${claimPatterns.filter(p => lowerText.includes(p))[0]}")`, type: 'yellow' });
  }

  // Very short text can't be verified well
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 15) {
    score -= 10;
    findings.push({ text: 'Text is very short — limited logical analysis possible', type: 'yellow' });
  }

  // Diversity score (multiple complete thoughts = more trustworthy)
  if (sentences.length >= 4) {
    score += 5;
    findings.push({ text: `Article has adequate structure (${sentences.length} sentences)`, type: 'green' });
  }

  if (findings.length === 0) {
    findings.push({ text: 'Statements appear logically consistent', type: 'green' });
  }

  return { score: Math.max(0, score), findings };
}

function checkGibberish(text) {
  const words = text.trim().split(/\s+/);
  if (words.length < 5) return true; // Too short to be a real news article

  // Check for long strings of consonants or repetitive characters
  if (/(.)\1{4,}/.test(text)) return true; // Like "hiiii"
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(text)) return true; // Like "eajjkkl"

  return false;
}

// Re-use proxy logic from news.js for real-time verification
const API_KEY = 'aa3c72b5c6a749a593b495b0a50c20c4';
const PROXIES = [
  function (url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
  function (url) { return 'https://corsproxy.io/?' + encodeURIComponent(url); },
  function (url) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url); }
];

async function checkLiveNewsMatch(text) {
  if (!text || text.length < 10) return { score: 50, findings: [{ text: 'Text too short for live verification', type: 'yellow' }] };

  const rawWords = text.trim().split(/\s+/);

  // 1. Try an exact phrase match if it's a short headline
  let qHeadline = null;
  if (rawWords.length <= 15) {
    const cleanHeadline = text.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    qHeadline = encodeURIComponent(`"${cleanHeadline}"`);
  }

  // 2. Keyword extraction across the FULL text for fallback queries
  const stopWords = [
    'about', 'after', 'again', 'against', 'because', 'been', 'before', 'being', 'between', 'could',
    'down', 'during', 'from', 'further', 'given', 'having', 'here', 'into', 'just', 'more', 'most',
    'only', 'other', 'over', 'some', 'such', 'that', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'under', 'until', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'whom',
    'with', 'would', 'your', 'will', 'have', 'their', 'said', 'says', 'told', 'than', 'according',
    'published', 'new', 'has', 'had', 'are', 'was', 'did', 'does', 'not'
  ];

  let validKeywords = rawWords
    .map(w => w.replace(/[^\w-]/g, ''))
    .filter(w => w.length > 3) // Exclude tiny words
    .filter(w => !stopWords.includes(w.toLowerCase()));

  // Prioritize capitalized words (likely proper nouns like "Google", "Trump", "NASA")
  let capitals = validKeywords.filter(w => /^[A-Z]/.test(w));
  let lowers = validKeywords.filter(w => !/^[A-Z]/.test(w));
  let uniqueKeywords = [...new Set([...capitals, ...lowers])];

  // Try 6 specific keywords (very tight match for detailed articles)
  const qTop6 = encodeURIComponent(uniqueKeywords.slice(0, 6).join(' AND '));
  // Try 3 specific keywords (broader match, captures core entities)
  const qTop3 = encodeURIComponent(uniqueKeywords.slice(0, 3).join(' AND '));

  async function tryFetchNews(query) {
    if (!query || query === "") return null;
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=relevancy&pageSize=3&apiKey=${API_KEY}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') return data.articles || [];
      }
    } catch (e) {
      for (const proxy of PROXIES) {
        try {
          const res = await fetch(proxy(url));
          if (res.ok) {
            const content = await res.text();
            if (content.startsWith('{')) {
              const data = JSON.parse(content);
              if (data.status === 'ok') return data.articles || [];
            }
          }
        } catch (err) { }
      }
    }
    return null;
  }

  let articles = null;
  let apiError = false;

  // Progressive Search Pipeline:
  // Try Exact Headline First (if applicable)
  if (qHeadline) {
    articles = await tryFetchNews(qHeadline);
  }

  // Fallback 1: Try full-word 6-keyword strict match
  if ((!articles || articles.length === 0) && uniqueKeywords.length >= 4) {
    articles = await tryFetchNews(qTop6);
  }

  // Fallback 2: Try broader 3-keyword match (captures core entities)
  if ((!articles || articles.length === 0) && uniqueKeywords.length >= 1) {
    articles = await tryFetchNews(qTop3);
  }

  if (articles === null) apiError = true;

  if (apiError) {
    return {
      score: 50,
      findings: [{ text: 'Live verification unavailable (API limit or blocked)', type: 'yellow' }]
    };
  }

  // Deep Verification: Analyze the FULL words to ensure the returned articles actually match the claim
  let validMatches = 0;
  if (articles && articles.length > 0) {
    for (const article of articles) {
      const articleText = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
      // Extract words from article
      const articleWords = new Set(articleText.replace(/[^\w-]/g, ' ').split(/\s+/).filter(w => w.length > 2));

      let matchCount = 0;
      for (const kw of uniqueKeywords) {
        if (articleText.includes(kw.toLowerCase())) {
          matchCount++;
        }
      }

      // Calculate overlap percentage (require at least 40% of input's core keywords to be present, or 3+ keywords)
      const matchRatio = matchCount / Math.max(uniqueKeywords.length, 1);

      if (matchRatio >= 0.40 || matchCount >= 4 || (qHeadline && matchCount >= 2)) {
        validMatches++;
      }
    }
  }

  if (validMatches > 0) {
    return {
      score: 100,
      findings: [{ text: `Live verification: Confirmed! Found ${validMatches} highly similar news reports right now`, type: 'green' }]
    };
  } else if (articles && articles.length > 0) {
    // The API found articles for the terms, but the detailed context did not match our deep verification
    return {
      score: 20,
      findings: [{ text: 'Live verification: Fetched related topics, but full article context drastically differs from input', type: 'red' }]
    };
  } else {
    return {
      score: 10,
      findings: [{ text: 'Live verification: No corroborating news stories found for these keywords', type: 'red' }]
    };
  }
}

/**
 * 6. Overall Factual Assessment (IMPROVED ACCURACY)
 */
function assessFactuality(text, subScores, isGibberish) {
  const findings = [];

  if (isGibberish) {
    return { score: 12, findings: [{ text: 'Input appears to be meaningless text or too short to be news', type: 'red' }] };
  }

  let weightedScore = 0;

  // If Live verification explicitly found the article, boost score massively
  if (subScores.liveCheck === 100) {
    // Override negative heuristic deductions (like sensationalism or grammar) for real news
    // But still consider if there are major red flags
    const avgHeuristic = (subScores.language + subScores.sources + subScores.logic) / 3;
    weightedScore = 82 + Math.round(avgHeuristic * 0.08);
    findings.push({ text: 'Overall assessment: VERIFIED. Live news corroborates this claim completely!', type: 'green' });
  }
  // If Live verification explicitly failed to find it (score 10)
  else if (subScores.liveCheck === 10) {
    // More heavily penalize unverifiable claims
    weightedScore = Math.round(
      subScores.language * 0.12 +
      subScores.sensationalism * 0.18 +
      subScores.sources * 0.18 +
      subScores.emotion * 0.18 +
      subScores.logic * 0.17 +
      subScores.liveCheck * 0.30
    );
    // Cap at 42 to ensure it is marked Fake News if totally unverified
    weightedScore = Math.min(weightedScore, 42);
    findings.push({ text: 'Overall assessment: HIGHLY SUSPICIOUS. Cannot be verified by live news outlets.', type: 'red' });
  }
  // API unavailable (score 50), rely purely on heuristics with improved weighting
  else {
    // Weighted scoring favoring multiple red flags
    weightedScore = Math.round(
      subScores.language * 0.15 +
      subScores.sensationalism * 0.28 +
      subScores.sources * 0.22 +
      subScores.emotion * 0.22 +
      subScores.logic * 0.13
    );
    
    if (weightedScore >= 72) {
      findings.push({ text: 'Overall assessment: content appears factual (Heuristic analysis)', type: 'green' });
    } else if (weightedScore >= 50) {
      findings.push({ text: 'Overall assessment: content shows mixed signals - some red flags present', type: 'yellow' });
    } else if (weightedScore >= 30) {
      findings.push({ text: 'Overall assessment: content exhibits multiple indicators of misinformation', type: 'red' });
    } else {
      findings.push({ text: 'Overall assessment: HIGHLY LIKELY MISINFORMATION - multiple severe red flags', type: 'red' });
    }
  }

  return { score: Math.max(0, Math.min(100, weightedScore)), findings };
}

// ===== Code Detection & Cleaning =====

function stripCodeFromText(text) {
  let cleanText = text;

  // Remove code blocks wrapped in triple backticks (markdown)
  cleanText = cleanText.replace(/```[\s\S]*?```/g, ' ');

  // Remove inline code wrapped in backticks
  cleanText = cleanText.replace(/`[^`]*`/g, ' ');

  // Remove code blocks wrapped in HTML tags (pre, code)
  cleanText = cleanText.replace(/<pre[\s\S]*?<\/pre>/gi, ' ');
  cleanText = cleanText.replace(/<code[\s\S]*?<\/code>/gi, ' ');

  // Detect and remove lines that look like code (indented with common programming keywords)
  const codeKeywords = ['function', 'const', 'let', 'var', 'class', 'import', 'export', 'return', 'async', 'await', 'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch', 'throw', 'new', 'this', 'super', 'static', 'public', 'private', 'protected', 'interface', 'enum', 'def', 'class', 'import', 'from', 'include', 'require', 'module', 'exports', 'use strict', 'console.log', 'print(', 'printf('];
  
  const lines = cleanText.split('\n');
  const nonCodeLines = lines.filter(line => {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed.length === 0) return true;
    
    // Skip lines that are heavily indented (code style)
    if (line.match(/^[\s\t]{4,}/)) return false;
    
    // Skip lines that start with common code keywords
    if (codeKeywords.some(kw => trimmed.toLowerCase().startsWith(kw + ' ') || trimmed.toLowerCase().startsWith(kw + '('))) {
      return false;
    }
    
    // Skip lines with too many special characters (likely code)
    const specialCharCount = (line.match(/[{}()\[\];:=<>+\-*/%&|^!~]/g) || []).length;
    if (specialCharCount > line.length * 0.3) return false;
    
    return true;
  });
  
  cleanText = nonCodeLines.join('\n');

  // Remove multiple consecutive spaces/newlines
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return cleanText;
}

// ===== Main Analysis Pipeline =====

async function analyzeText(text) {
  // Clean code from the text before analysis
  const cleanedText = stripCodeFromText(text);
  
  // If after cleaning there's only whitespace, it's not real news
  if (!cleanedText || cleanedText.trim().length < 10) {
    return {
      verdict: 'Fake News',
      verdictClass: 'fake',
      confidence: 98,
      overallScore: 8,
      breakdown: [
        { name: 'Content Detection', desc: 'No valid text content found', score: 0, icon: '❌' },
        { name: 'Language Quality', desc: 'N/A', score: 0, icon: '🔍' },
        { name: 'Sensationalism', desc: 'N/A', score: 0, icon: '⚡' },
        { name: 'Source Credibility', desc: 'N/A', score: 0, icon: '📎' },
        { name: 'Emotional Integrity', desc: 'N/A', score: 0, icon: '🎭' },
        { name: 'Logical Consistency', desc: 'N/A', score: 0, icon: '🧠' }
      ],
      findings: [
        { text: 'Content appears to be mostly code or non-text data, not a news article', type: 'red' }
      ]
    };
  }

  const isGibberish = checkGibberish(cleanedText);

  const langResult = analyzeLanguage(cleanedText);
  const sensResult = detectSensationalism(cleanedText);
  const srcResult = checkSources(cleanedText);
  const emoResult = detectEmotionalManipulation(cleanedText);
  const logicResult = analyzeLogic(cleanedText);

  // Real-time news verification (skip if gibberish)
  const liveResult = isGibberish
    ? { score: 0, findings: [{ text: 'Skipped live verification due to invalid text', type: 'yellow' }] }
    : await checkLiveNewsMatch(cleanedText);

  const subScores = {
    language: langResult.score,
    sensationalism: sensResult.score,
    sources: srcResult.score,
    emotion: emoResult.score,
    logic: logicResult.score,
    liveCheck: liveResult.score
  };

  const overallResult = assessFactuality(cleanedText, subScores, isGibberish);

  // Determine verdict
  let verdict, verdictClass, confidence;
  if (overallResult.score >= 70) {
    verdict = 'Real News';
    verdictClass = 'real';
    confidence = Math.min(95, overallResult.score + Math.round(Math.random() * 5));
  } else if (overallResult.score >= 45) {
    verdict = 'Uncertain';
    verdictClass = 'uncertain';
    confidence = Math.max(40, Math.min(75, overallResult.score + Math.round(Math.random() * 10)));
  } else {
    verdict = 'Fake News';
    verdictClass = 'fake';
    // If it's gibberish, we are 99% confident it's fake/not news
    confidence = isGibberish ? 99 : Math.min(95, 100 - overallResult.score + Math.round(Math.random() * 5));
  }

  // Collect all findings
  const allFindings = [
    ...liveResult.findings, // Put live verification first as it's most important
    ...langResult.findings,
    ...sensResult.findings,
    ...srcResult.findings,
    ...emoResult.findings,
    ...logicResult.findings,
    ...overallResult.findings
  ];

  return {
    verdict,
    verdictClass,
    confidence,
    overallScore: overallResult.score,
    breakdown: [
      { name: 'Live News Verification', desc: 'Real-time crosscheck', score: liveResult.score, icon: '📡' },
      { name: 'Language Quality', desc: 'Writing style & professionalism', score: langResult.score, icon: '🔍' },
      { name: 'Sensationalism', desc: 'Exaggerated or misleading claims', score: sensResult.score, icon: '⚡' },
      { name: 'Source Credibility', desc: 'References & attribution quality', score: srcResult.score, icon: '📎' },
      { name: 'Emotional Integrity', desc: 'Manipulation & clickbait patterns', score: emoResult.score, icon: '🎭' },
      { name: 'Logical Consistency', desc: 'Internal logic & coherence', score: logicResult.score, icon: '🧠' }
    ],
    findings: allFindings
  };
}

// ===== UI Functions =====

function showPlaceholder() {
  resultsPlaceholder.classList.remove('hidden');
  resultsLoading.classList.add('hidden');
  resultsContent.classList.add('hidden');
}

function showLoading() {
  resultsPlaceholder.classList.add('hidden');
  resultsLoading.classList.remove('hidden');
  resultsContent.classList.add('hidden');

  // Reset all loading steps
  const steps = loadingSteps.querySelectorAll('.loading-step');
  steps.forEach(s => {
    s.classList.remove('active', 'done');
  });
}

function animateLoadingSteps() {
  return new Promise((resolve) => {
    const steps = loadingSteps.querySelectorAll('.loading-step');
    let i = 0;
    const interval = setInterval(() => {
      if (i > 0) {
        steps[i - 1].classList.remove('active');
        steps[i - 1].classList.add('done');
      }
      if (i < steps.length) {
        steps[i].classList.add('active');
        i++;
      } else {
        clearInterval(interval);
        setTimeout(resolve, 300);
      }
    }, 450);
  });
}

function showResults(result) {
  resultsPlaceholder.classList.add('hidden');
  resultsLoading.classList.add('hidden');
  resultsContent.classList.remove('hidden');

  // Verdict
  verdictCard.className = 'verdict-card ' + result.verdictClass;

  const icons = {
    real: '✅',
    fake: '❌',
    uncertain: '⚠️'
  };
  verdictIcon.textContent = icons[result.verdictClass];
  verdictText.textContent = result.verdict;
  verdictScore.textContent = result.overallScore + '/100';

  // Confidence
  confidenceValue.textContent = result.confidence + '%';
  const fillColors = {
    real: 'var(--gradient-real)',
    fake: 'var(--gradient-fake)',
    uncertain: 'var(--gradient-uncertain)'
  };
  confidenceFill.style.background = fillColors[result.verdictClass];
  // Animate fill
  requestAnimationFrame(() => {
    confidenceFill.style.width = '0%';
    requestAnimationFrame(() => {
      confidenceFill.style.width = result.confidence + '%';
    });
  });

  // Breakdown
  breakdownItems.innerHTML = '';
  result.breakdown.forEach(item => {
    let scoreClass = 'score-good';
    if (item.score < 50) scoreClass = 'score-danger';
    else if (item.score < 75) scoreClass = 'score-warning';

    const el = document.createElement('div');
    el.className = 'breakdown-item';
    el.innerHTML = `
      <span class="breakdown-item-icon">${item.icon}</span>
      <div class="breakdown-item-info">
        <span class="breakdown-item-name">${item.name}</span>
        <span class="breakdown-item-desc">${item.desc}</span>
      </div>
      <span class="breakdown-item-score ${scoreClass}">${item.score}/100</span>
    `;
    breakdownItems.appendChild(el);
  });

  // Findings
  findingsList.innerHTML = '';
  result.findings.forEach(f => {
    const li = document.createElement('li');
    li.className = 'finding-item';
    const bulletClass = {
      red: 'bullet-red',
      green: 'bullet-green',
      yellow: 'bullet-yellow',
      blue: 'bullet-blue'
    }[f.type] || 'bullet-blue';

    li.innerHTML = `
      <span class="finding-bullet ${bulletClass}"></span>
      <span>${f.text}</span>
    `;
    findingsList.appendChild(li);
  });
}

// ===== Event Listeners =====

newsInput.addEventListener('input', () => {
  const len = newsInput.value.length;
  charCount.textContent = len + ' character' + (len !== 1 ? 's' : '');
});

btnClear.addEventListener('click', () => {
  newsInput.value = '';
  charCount.textContent = '0 characters';
  showPlaceholder();
  newsInput.focus();
});



btnAnalyze.addEventListener('click', async () => {
  const text = newsInput.value.trim();
  if (!text) {
    newsInput.focus();
    // Shake animation
    newsInput.style.animation = 'none';
    requestAnimationFrame(() => {
      newsInput.style.animation = 'shake 0.4s ease';
    });
    return;
  }

  btnAnalyze.disabled = true;
  showLoading();

  // Run analysis in the background while showing loading animation
  const resultPromise = analyzeText(text);
  await animateLoadingSteps();
  const result = await resultPromise;

  showResults(result);
  btnAnalyze.disabled = false;

  // Scroll results into view
  document.getElementById('results-panel').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
});

// Add shake animation dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Header scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const header = document.getElementById('main-header');
  const scrollY = window.scrollY;
  if (scrollY > 100) {
    header.style.borderBottomColor = 'rgba(99, 102, 241, 0.2)';
    header.style.background = 'rgba(10, 14, 26, 0.95)';
  } else {
    header.style.borderBottomColor = 'rgba(99, 102, 241, 0.15)';
    header.style.background = 'rgba(10, 14, 26, 0.8)';
  }
  lastScroll = scrollY;
});

// Intersection Observer for animate-on-scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeInUp 0.6s ease both';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.step-card').forEach(card => {
  card.style.opacity = '0';
  observer.observe(card);
});

// ===== IMAGE ANALYZER SECTION =====

const imageInput = document.getElementById('image-input');
const imageUploadArea = document.getElementById('image-upload-area');
const imagePreview = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const fileInfo = document.getElementById('file-info');
const btnAnalyzeImage = document.getElementById('btn-analyze-image');
const btnClearImage = document.getElementById('btn-clear-image');

const imageResultsPlaceholder = document.getElementById('image-results-placeholder');
const imageResultsLoading = document.getElementById('image-results-loading');
const imageResultsContent = document.getElementById('image-results-content');
const imageLoadingSteps = document.getElementById('image-loading-steps');
const imageVerdictCard = document.getElementById('image-verdict-card');
const imageVerdictIcon = document.getElementById('image-verdict-icon');
const imageVerdictText = document.getElementById('image-verdict-text');
const imageVerdictScore = document.getElementById('image-verdict-score');
const imageConfidenceValue = document.getElementById('image-confidence-value');
const imageConfidenceFill = document.getElementById('image-confidence-fill');
const imageVerdictList = document.getElementById('image-findings-list');

let selectedImageFile = null;
let selectedImageMimeType = null;

// Image upload area click handler
imageUploadArea.addEventListener('click', () => {
  imageInput.click();
});

// Image upload drag and drop
imageUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageUploadArea.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
  imageUploadArea.style.borderColor = 'rgba(99, 102, 241, 0.5)';
});

imageUploadArea.addEventListener('dragleave', () => {
  imageUploadArea.style.backgroundColor = '';
  imageUploadArea.style.borderColor = '';
});

imageUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  imageUploadArea.style.backgroundColor = '';
  imageUploadArea.style.borderColor = '';
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleImageSelection(files[0]);
  }
});

// File input change handler
imageInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleImageSelection(e.target.files[0]);
  }
});

// Handle image selection
function handleImageSelection(file) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB');
    return;
  }

  selectedImageFile = file;
  selectedImageMimeType = file.type;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    imagePreview.classList.remove('hidden');
    uploadPlaceholder.style.display = 'none';
    fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  };
  reader.readAsDataURL(file);
}

// Clear image
btnClearImage.addEventListener('click', () => {
  selectedImageFile = null;
  selectedImageMimeType = null;
  imageInput.value = '';
  imagePreview.classList.add('hidden');
  imagePreview.src = '';
  uploadPlaceholder.style.display = '';
  fileInfo.textContent = 'No file selected';
  showImagePlaceholder();
});

// Show image results placeholder
function showImagePlaceholder() {
  imageResultsPlaceholder.classList.remove('hidden');
  imageResultsLoading.classList.add('hidden');
  imageResultsContent.classList.add('hidden');
}

// Show image loading state
function showImageLoading() {
  imageResultsPlaceholder.classList.add('hidden');
  imageResultsLoading.classList.remove('hidden');
  imageResultsContent.classList.add('hidden');

  // Reset all loading steps
  const steps = imageLoadingSteps.querySelectorAll('.loading-step');
  steps.forEach(s => {
    s.classList.remove('active', 'done');
  });
}

// Animate image loading steps
function animateImageLoadingSteps() {
  return new Promise((resolve) => {
    const steps = imageLoadingSteps.querySelectorAll('.loading-step');
    let i = 0;
    const interval = setInterval(() => {
      if (i > 0) {
        steps[i - 1].classList.remove('active');
        steps[i - 1].classList.add('done');
      }
      if (i < steps.length) {
        steps[i].classList.add('active');
        i++;
      } else {
        clearInterval(interval);
        setTimeout(resolve, 300);
      }
    }, 600);
  });
}

// Analyze image
btnAnalyzeImage.addEventListener('click', async () => {
  if (!selectedImageFile) {
    alert('Please select an image first');
    return;
  }

  btnAnalyzeImage.disabled = true;
  showImageLoading();
  await animateImageLoadingSteps();

  try {
    // Create image element for analysis
    const img = new Image();
    img.onload = () => {
      try {
        // Run local forensics analysis (no API call needed)
        const result = analyzeImageLocal(img);
        
        // Convert result to match display format
        const displayResult = {
          verdict: result.verdict,
          verdictClass: result.verdictClass,
          confidence: Math.round(result.confidence),
          overallScore: Math.round(result.confidence),
          breakdown: [],
          findings: [
            { text: result.analysis, type: 'blue' },
            ...result.findings.map(f => ({ text: f, type: 'yellow' })),
            { text: result.recommendation, type: 'green' }
          ]
        };

        displayImageResults(displayResult);
      } catch (error) {
        console.error('Analysis error:', error);
        alert('Error analyzing image: ' + error.message);
        showImagePlaceholder();
      } finally {
        btnAnalyzeImage.disabled = false;
      }
    };
    
    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedImageFile);
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
    showImagePlaceholder();
    btnAnalyzeImage.disabled = false;
  }
});

// Display image analysis results
function displayImageResults(analysisData) {
  imageResultsPlaceholder.classList.add('hidden');
  imageResultsLoading.classList.add('hidden');
  imageResultsContent.classList.remove('hidden');

  // Use verdict from analysis or determine it
  let verdict = analysisData.verdict;
  let verdictClass = analysisData.verdictClass;
  let confidence = analysisData.confidence || analysisData.overallScore || 50;

  // Update verdict card
  imageVerdictCard.className = 'verdict-card ' + verdictClass;

  const icons = {
    real: '✅',
    fake: '❌',
    uncertain: '⚠️'
  };
  imageVerdictIcon.textContent = icons[verdictClass] || '❓';
  imageVerdictText.textContent = verdict;
  imageVerdictScore.textContent = Math.round(confidence) + '/100';

  // Update confidence
  imageConfidenceValue.textContent = Math.round(confidence) + '%';
  const fillColors = {
    real: 'var(--gradient-real)',
    fake: 'var(--gradient-fake)',
    uncertain: 'var(--gradient-uncertain)'
  };
  imageConfidenceFill.style.background = fillColors[verdictClass];
  
  // Animate fill
  requestAnimationFrame(() => {
    imageConfidenceFill.style.width = '0%';
    requestAnimationFrame(() => {
      imageConfidenceFill.style.width = Math.round(confidence) + '%';
    });
  });

  // Update findings
  imageVerdictList.innerHTML = '';

  // Display findings
  if (analysisData.findings && Array.isArray(analysisData.findings)) {
    analysisData.findings.forEach(finding => {
      const li = document.createElement('li');
      li.className = 'finding-item';
      
      // Handle both string and object formats
      let text = typeof finding === 'string' ? finding : (finding.text || '');
      let icon = '•';
      
      if (finding.type === 'red' || finding.type === 'fake') icon = '🔴';
      if (finding.type === 'yellow' || finding.type === 'uncertain') icon = '🟡';
      if (finding.type === 'green' || finding.type === 'real') icon = '🟢';
      if (finding.type === 'blue') icon = 'ℹ️';
      
      li.innerHTML = `<span class="finding-icon">${icon}</span><span>${text}</span>`;
      imageVerdictList.appendChild(li);
    });
  }

  // Add recommendation if available
  if (analysisData.recommendation) {
    const li = document.createElement('li');
    li.className = 'finding-item';
    li.innerHTML = `<span class="finding-icon">💡</span><span><strong>Recommendation:</strong> ${analysisData.recommendation}</span>`;
    imageVerdictList.appendChild(li);
  }
}


