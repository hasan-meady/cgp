// search.js
let isFuzzy = false;

function extractKeywords() {
  allKeywords = new Set(); 

  allData.forEach((document) => {
    if (!document || !document.sections) return;
    document.sections.forEach((section) => {
      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
           if (item.keywords && Array.isArray(item.keywords)) {
             item.keywords.forEach(kw => allKeywords.add(kw.toLowerCase()));
           }
           if (item.associated_brands && Array.isArray(item.associated_brands)) {
             item.associated_brands.forEach(b => allKeywords.add(b.toLowerCase()));
           }
           if (item.item_title) {
             allKeywords.add(item.item_title.toLowerCase());
           }
        });
      }
    });
  });

  allKeywords = Array.from(allKeywords);
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
  if (!text) return false;
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

function searchSectionFlexible(section, document, searchWords, results) {
  if (section.items && Array.isArray(section.items)) {
    const searchTerms = Array.isArray(searchWords) ? searchWords : [searchWords];
    
    section.items.forEach(item => {
      let isMatch = false;

      // 1. Check title, keywords, and brands for direct/flexible match
      const searchableStrings = [
        item.item_title || "",
        ...(item.keywords || []),
        ...(item.associated_brands || [])
      ];

      isMatch = searchableStrings.some(str => {
        if (!str) return false;
        const lowerStr = str.toLowerCase().trim();
        return searchTerms.some(term => {
          const lowerTerm = term.toLowerCase().trim();
          return lowerStr.includes(lowerTerm) || lowerTerm.includes(lowerStr);
        });
      });

      // 2. If no direct keyword match, check if title or brands have a flexible match
      if (!isMatch) {
         if (isFlexibleMatch(item.item_title, searchTerms)) {
            isMatch = true;
         } else if (item.associated_brands && item.associated_brands.some(b => isFlexibleMatch(b, searchTerms))) {
            isMatch = true;
         }
      }

      // 3. Check inside blocks
      if (!isMatch && item.blocks && Array.isArray(item.blocks)) {
         isMatch = item.blocks.some(block => {
            const blockDataStr = JSON.stringify(block.data).toLowerCase();
            return searchTerms.some(term => blockDataStr.includes(term.toLowerCase().trim()));
         });
      }

      if (isMatch) {
        results.push(createDrugResult(item, section, document));
      }
    });
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
          result.category || "",
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
