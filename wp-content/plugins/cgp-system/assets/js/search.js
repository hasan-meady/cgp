// search.js
let isFuzzy = false;

function extractKeywords() {
  allKeywords = new Set(); 

  allData.forEach((document) => {
    if (!document || !document.sections) return;
    document.sections.forEach((section) => {
      if (section.content) {
        extractKeywordsFromContent(section.content);
      }
    });
  });

  allKeywords = Array.from(allKeywords);
}

function extractKeywordsFromContent(content) {
  if (!content) return;

  if (Array.isArray(content)) {
    content.forEach((item) => extractKeywordsFromContent(item));
  } else if (typeof content === 'object' && content !== null) {
    if (content.keywords && Array.isArray(content.keywords)) {
      content.keywords.forEach((keyword) => allKeywords.add(keyword.toLowerCase()));
    }
    if (content.title) {
      allKeywords.add(content.title.toLowerCase());
    }
    Object.values(content).forEach((value) => extractKeywordsFromContent(value));
  }
}

function searchDocuments(searchTerm, selectedSources = []) {
  if (!searchTerm || searchTerm.length < 2) return [];

  const results = [];
  allData.forEach((document, index) => {
    if (!document) return;
    if (document.sections) {
      let lowerSearchTerm = searchTerm.toLowerCase();
      document.sections.forEach(section => {
        searchSectionFlexible(section, document, lowerSearchTerm, results);
      });
    }
  });

  return deduplicateResults(results);
}

function isFlexibleMatch(text, searchWords) {
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const textWords = normalizedText.split(/\s+/);

  return searchWords.every(searchWord => {
    if (searchWord.length <= 2) return normalizedText.includes(searchWord);
    return textWords.some(textWord => {
      const distance = levenshteinDistance(searchWord, textWord);
      const maxLength = Math.max(searchWord.length, textWord.length);
      return distance <= Math.min(1, Math.floor(maxLength / 3)) ||
        normalizedText.includes(searchWord) ||
        normalizedText.replace(/\s/g, '').includes(searchWord.replace(/\s/g, ''));
    });
  });
}

function searchInContent(content, searchWords, parentKey = null) {
  if (!content) return [];
  const matches = [];

  const checkKeywords = (obj, key) => {
    if (obj.keywords) {
      const searchTerms = Array.isArray(searchWords) ? searchWords : [searchWords];
      
      let isKeywordMatches = obj.keywords.some(keyword => {
        const lowerKeyword = keyword.toLowerCase().trim();
        return searchTerms.some(term => {
          const lowerTerm = term.toLowerCase().trim();
          return lowerKeyword.includes(lowerTerm) || lowerTerm.includes(lowerKeyword);
        });
      });
      if (isKeywordMatches) {
        if (key) {
          matches.push({ [key.replace(/\[\d+\]/g, '')]: obj });
        } else {
          matches.push(obj);
        }
        return true;
      }
    }
    return false;
  };

  if (Array.isArray(content)) {
    content.forEach((item) => {
      const itemKey = parentKey ? `${parentKey}` : null;
      matches.push(...searchInContent(item, searchWords, itemKey));
    });
  }
  else if (typeof content === 'object' && content !== null) {
    const matchedByKeyword = checkKeywords(content, parentKey);
    
    if (!matchedByKeyword) {
      let foundInValues = false;
      const searchTerms = Array.isArray(searchWords) ? searchWords : [searchWords];
      
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string' && isFlexibleMatch(value, searchTerms)) {
           foundInValues = true;
           break;
        } else if (key === 'title' && typeof value === 'string' && searchTerms.some(term => value.toLowerCase().includes(term.toLowerCase().trim()))) {
           foundInValues = true;
           break;
        }
      }
      
      if (foundInValues) {
        if (parentKey) {
          matches.push({ [parentKey.replace(/\[\d+\]/g, '')]: content });
        } else {
          matches.push(content);
        }
      } else {
        for (const [key, value] of Object.entries(content)) {
          const nestedKey = parentKey ? `${parentKey} > ${key}` : key;
          if (Array.isArray(value)) {
            value.forEach((subItem) => {
              matches.push(...searchInContent(subItem, searchWords, `${nestedKey}`));
            });
          } else if (typeof value === 'object' && value !== null) {
            matches.push(...searchInContent(value, searchWords, nestedKey));
          }
        }
      }
    }
  }

  return matches;
}

function searchSectionFlexible(section, document, searchWords, results) {
  if (section.content) {
    const contentMatches = searchInContent(section.content, searchWords);
    if (contentMatches.length > 0) {
      contentMatches.forEach(match => {
        const [key, content] = Object.entries(match)[0] || [null, match];
        const finalKey = key === "keywords" ? null : key;
        results.push(createDrugResult(content, section, document, finalKey));
      });
    }
  }
}

function deduplicateResults(results) {
  if (!Array.isArray(results)) throw new TypeError("Expected an array of results");
  const resultMap = new Map();

  results.forEach((result, index) => {
    if (result !== null && typeof result === "object") {
      try {
        const key = [
          result.source || "",
          result.title || "",
          result.drug || "",
          result.section || "",
          JSON.stringify(result.content, (k, v) => (v === undefined ? null : v))
        ].join("|");
        if (!resultMap.has(key)) resultMap.set(key, result);
      } catch (error) {
        console.warn(`Skipping result at index ${index} due to serialization error:`, error);
      }
    }
  });

  return Array.from(resultMap.values());
}


