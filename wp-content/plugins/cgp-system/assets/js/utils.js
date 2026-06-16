// utils.js

function formatContent(content, searchTerm = '') {
  if (typeof searchTerm !== 'string') {
    throw new TypeError('searchTerm must be a string');
  }

  if (!content) return '';

  let html = '';

  // Render Associated Brands
  if (content.associated_brands && Array.isArray(content.associated_brands) && content.associated_brands.length > 0) {
     const brandsString = content.associated_brands.map(b => `<span class="brand-badge" style="background:#e8f0fe; color:#1a73e8; border-radius:12px; padding:2px 8px; margin-right:5px; font-size:12px; display:inline-block;">${b}</span>`).join(' ');
     html += `
       <div class="brands-wrapper mb-2">
         <strong>Brands:</strong> ${highlightSearchTerm(brandsString, searchTerm)}
       </div>
     `;
  }

  // Render Keywords
  if (content.keywords && Array.isArray(content.keywords) && content.keywords.length > 0) {
     const keywordsString = content.keywords.map(kw => `<span class="keyword-badge">${kw}</span>`).join(' ');
     html += `
       <div class="keywords-wrapper mb-3 keywords-items keywords-wrapper-spacing">
         ${highlightSearchTerm(keywordsString, searchTerm)}
       </div>
     `;
  }

  // Render Blocks
  if (content.blocks && Array.isArray(content.blocks)) {
    html += '<ul>';
    content.blocks.forEach(block => {
      if (!block.data) return;
      
      const className = getClassByKeyName(block.block_heading || "");
      let blockContentHtml = '';

      if (block.block_type === 'text') {
        blockContentHtml = `<div class="content-value">${highlightLine(String(block.data), searchTerm)}</div>`;
      } 
      else if (block.block_type === 'list') {
        if (Array.isArray(block.data)) {
           blockContentHtml = `<ul>${block.data.map(item => 
             `<li class="${containsTerm(String(item), searchTerm) ? 'term-line' : ''}">${highlightLine(String(item), searchTerm)}</li>`
           ).join('')}</ul>`;
        } else {
           blockContentHtml = `<div class="content-value">${highlightLine(String(block.data), searchTerm)}</div>`;
        }
      }
      else if (block.block_type === 'key_value') {
        if (Array.isArray(block.data)) {
           blockContentHtml = `<ul>${block.data.map(kv => {
             const keyHtml = `<strong>${highlightSearchTerm(kv.key, searchTerm)}:</strong>`;
             let valHtml = '';
             if (Array.isArray(kv.value)) {
                valHtml = `<ul>${kv.value.map(v => `<li>${highlightLine(String(v), searchTerm)}</li>`).join('')}</ul>`;
             } else {
                valHtml = `<span>${highlightLine(String(kv.value), searchTerm)}</span>`;
             }
             return `<li class="${containsTerm(kv.key, searchTerm) || containsTerm(String(kv.value), searchTerm) ? 'term-line' : ''}">${keyHtml} ${valHtml}</li>`;
           }).join('')}</ul>`;
        }
      }
      else if (block.block_type === 'nested_list') {
        if (Array.isArray(block.data)) {
           blockContentHtml = `<ul>${block.data.map(nl => {
             const parentHtml = `<strong>${highlightSearchTerm(nl.parent, searchTerm)}:</strong>`;
             let childrenHtml = '';
             if (Array.isArray(nl.children)) {
                childrenHtml = `<ul>${nl.children.map(c => `<li>${highlightLine(String(c), searchTerm)}</li>`).join('')}</ul>`;
             }
             return `<li>${parentHtml} ${childrenHtml}</li>`;
           }).join('')}</ul>`;
        }
      }
      else {
         // fallback for unknown types or table
         blockContentHtml = `<div class="content-value"><pre>${highlightLine(JSON.stringify(block.data, null, 2), searchTerm)}</pre></div>`;
      }

      html += `
        <li class="${containsTerm(block.block_heading, searchTerm) ? 'term-line' : ''} ${className}">
          <strong class="content-key">${highlightSearchTerm(block.block_heading, searchTerm)}:</strong> 
          <div class="content-value mt-1">${blockContentHtml}</div>
        </li>
      `;
    });
    html += '</ul>';
  }

  return html;
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
  } else if (/Dietary/i.test(keyName)) {
    className = "icon-dietary-considerations";
  } else if (/Pregnancy/i.test(keyName)) {
    className = "icon-pregnancy";
  } else if (/Lactation/i.test(keyName)) {
    className = "icon-lactation";
  } else if (/Symptoms/i.test(keyName)) {
    className = "icon-precautions";
  }
  return className;
}

function createDrugResult(item, section, document) {
  return {
    source: document.title,
    category: section.section_title || section.category || section.title || "",
    title: item.item_title || section.category || section.title || "",
    drug: item.item_title || "",
    section: section.section_title || section.title || "",
    content: item || [],
  };
}

function extractTagsFromResult(result, tagSet) {
  if (result.content && typeof result.content === 'object') {
    if (result.content.keywords && Array.isArray(result.content.keywords)) {
      result.content.keywords.forEach(kw => tagSet.add(kw));
    }
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
      @page { margin: 0mm; size: 4in 6in portrait; }
      body { 
        margin: 0; 
        padding: 0; 
        background: #fff; 
        width: 100%;
        height: 100%;
        -webkit-print-color-adjust: exact;
      }
      .label-container {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        width: 3.8in;
        max-height: 5.8in;
        box-sizing: border-box;
        padding: 0.2in;
        color: #000;
        page-break-inside: avoid;
        overflow: hidden;
      }
      .label-header {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        margin: 0 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #000;
        text-transform: uppercase;
      }
      .label-content {
        font-size: 14px;
        line-height: 1.4;
      }
      .label-content ul {
        padding-left: 15px;
        margin: 5px 0;
      }
      .label-content li {
        margin-bottom: 4px;
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
