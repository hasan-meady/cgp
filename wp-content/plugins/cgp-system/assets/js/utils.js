// utils.js

function formatContent(content, searchTerm = '') {
  if (typeof searchTerm !== 'string') {
    throw new TypeError('searchTerm must be a string');
  }

  if (!content) return '';

  if (typeof content === 'string') {
    return `<li class="content-value">${highlightLine(content, searchTerm)}</li>`
  }

  if (Array.isArray(content)) {
    if (content.every(item => typeof item === 'string')) {
      if (content.some(item => item.includes('keywords:'))) {
        const keywordsString = content.map(keyword => `<span class="keyword-badge">${keyword}</span>`).join(' ');
        return `
          <div class="keywords-wrapper">
            <strong>Keywords:</strong> 
            <span class="keywords-list">${highlightSearchTerm(keywordsString, searchTerm)}</span>
          </div>
        `;
      }
      return `<ul>${content.map(item =>
        `<li class="${containsTerm(item, searchTerm) ? 'term-line' : ''}">${highlightSearchTerm(item, searchTerm)}</li>`
      ).join('')}</ul>`;
    }
    return content.map(item => formatContent(item, searchTerm)).join('');
  }

  if (typeof content === 'object') {
    let html = '';
    for (const [key, value] of Object.entries(content)) {
      if (value !== undefined && value !== null) {
        let valueContent;
        let keywordClass = ""
        let className = ""
        
        if (key === 'keywords' && Array.isArray(value)) {
          className = getClassByKeyName(key)
          const keywordsString = value.map(keyword => `<span class="keyword-badge">${keyword}</span>`).join(' ');
          valueContent = `
            <div class="keywords-items">
              ${highlightSearchTerm(keywordsString, searchTerm)}
            </div>
          `;
          keywordClass = 'keywords-wrapper-spacing'

        } else {
          className = getClassByKeyName(key)
          valueContent = typeof value === 'string'
            ? highlightLine(value, searchTerm)
            : formatContent(value, searchTerm);
        }

        if (!html) html += '<ul>';
        html += `
          <li class="${containsTerm(key, searchTerm) ? 'term-line' : ''}  ${keywordClass}  ${className}">
            <strong class="content-key">${highlightSearchTerm(key, searchTerm)}:</strong> 
            <div class="content-value">${valueContent}</div>
          </li>
        `;
      }
    }
    if (html) html += '</ul>';
    return html;
  }

  return String(content);
}

function getClassByKeyName(keyName) {
  let className = "icon-default"; 
  if (/administration/i.test(keyName)) {
    className = "icon-administration";
  } else if (/instructions/i.test(keyName)) {
    className = "icon-instructions";
  } else if (/keywords/i.test(keyName)) {
    className = "icon-keywords";
  } else if (/interactions/i.test(keyName)) {
    className = "icon-interactions";
  } else if (/Alternatives/i.test(keyName)) {
    className = "icon-interactions";
  } else if (/precautions/i.test(keyName)) {
    className = "icon-precautions";
  } else if (/Dietary Consideratopn/i.test(keyName)) {
    className = "icon-dietary-considerations";
  } else if (/Pregnancy/i.test(keyName)) {
    className = "icon-pregnancy";
  } else if (/Lactation/i.test(keyName)) {
    className = "icon-lactation";
  }
  return className
}

function createDrugResult(item, section, document, key = null) {
  return {
    source: document.title,
    category: section.category || section.title || "",
    title: item.title || section.category || section.title || "",
    drug: key || "",
    section: section.title || "",
    content: item || [],
  };
}

function extractTagsFromResult(result, tagSet) {
  if (result.content && typeof result.content === 'object') {
    if (result.content.keywords && Array.isArray(result.content.keywords)) {
      result.content.keywords.forEach(kw => tagSet.add(kw));
    }
    // Also look inside nested structures if necessary
    Object.values(result.content).forEach(val => {
      if (typeof val === 'object' && val !== null && val.keywords && Array.isArray(val.keywords)) {
        val.keywords.forEach(kw => tagSet.add(kw));
      }
    });
  }
}

function printSticker(drugName, content) {
  printJS({
    printable: `
        <div class="label-container">
          <div class="label-header">${drugName}</div>
          <div class="label-content">${content}</div>
        </div>
      `,
    type: 'raw-html',
    style: `
      @page { margin: 0; size: auto; }
      body { margin: 0; padding: 0; background: #fff; }
      .label-container {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 5px 10px;
        color: #000;
        page-break-inside: avoid;
      }
      .label-header {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        margin: 0 0 5px 0;
        padding-bottom: 3px;
        border-bottom: 2px solid #000;
        text-transform: uppercase;
      }
      .label-content {
        font-size: 12px;
        line-height: 1.3;
      }
      .label-content ul {
        padding-left: 12px;
        margin: 3px 0;
      }
      .label-content li {
        margin-bottom: 2px;
      }
      .highlight-term { font-weight: bold; }
    ` 
  });
}

function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<span class="highlight-term">$1</span>');
}

function containsTerm(text, searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return false;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
}

function highlightLine(content, searchTerm) {
  let lowerContent = content.toLowerCase();
  let lowerTerm = searchTerm.toLowerCase();

  if (lowerContent.includes(lowerTerm)) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return content.replace(regex, '<span class="highlight-term">$1</span>');
  }
  return content;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
