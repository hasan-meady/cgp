// render.js

function displayResults(results) {
  const resultsContainer = document.getElementById('search-results');
  const resultsCountElement = document.getElementById('search-results-count');

  if (!resultsContainer) return;

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="no-results-message text-center">
        <i class="fas fa-search-minus no-results-icon"></i>
        <h5 class="no-results-title">No results found</h5>
        <p class="no-results-hint">Try refining your search or adjusting the filters.</p>
      </div>
    `;
    if (resultsCountElement) {
      resultsCountElement.textContent = '';
      resultsCountElement.classList.remove('visible');
      resultsCountElement.style.display = 'none';
    }
    const sidebar = document.getElementById('search-tags-sidebar');
    if (sidebar) sidebar.style.display = 'none';
    const mobileSidebar = document.getElementById('mobile-search-tags');
    if (mobileSidebar) mobileSidebar.style.display = 'none';
    return;
  }

  if (resultsCountElement) {
    resultsCountElement.style.display = 'inline-block';
    resultsCountElement.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'} found`;
    // Small delay to ensure the element is rendered before adding the class for transition
    setTimeout(() => resultsCountElement.classList.add('visible'), 10);
  }

  const extractedTags = new Set();
  let html = '';
  results.forEach(result => {
    html += renderDrugResult(result);
    extractTagsFromResult(result, extractedTags);
  });

  resultsContainer.innerHTML = html;
  
  // Update sidebar tags
  const tagsContainer = document.getElementById('dynamic-tags');
  const sidebar = document.getElementById('search-tags-sidebar');
  const mobileTagsContainer = document.getElementById('mobile-dynamic-tags');
  const mobileSidebar = document.getElementById('mobile-search-tags');
  const sidebarWrapper = document.getElementById('main-sidebar-wrapper');

  if (tagsContainer && sidebar) {
    if (extractedTags.size > 0) {
      const tagsHtml = Array.from(extractedTags)
        .map(tag => `<span class="keyword-badge sidebar-tag">${tag}</span>`)
        .join('');
      
      tagsContainer.innerHTML = tagsHtml;
      sidebar.style.display = 'block'; // Show desktop sidebar on search
      if (sidebarWrapper) sidebarWrapper.style.display = 'block';
      
      if (mobileTagsContainer && mobileSidebar) {
        mobileTagsContainer.innerHTML = tagsHtml;
        mobileSidebar.style.display = 'block'; // Show mobile horizontal scroll
      }
    } else {
      sidebar.style.display = 'none'; // Hide sidebar when no tags
      if (mobileSidebar) mobileSidebar.style.display = 'none';
      
      const dashboard = document.getElementById('initial-dashboard-feed');
      if (sidebarWrapper && (!dashboard || dashboard.style.display === 'none')) {
        sidebarWrapper.style.display = 'none';
      }
    }
  }

  document.querySelectorAll('.print-btn').forEach(button => {
    button.addEventListener('click', () => {
      const printContent = button.dataset.printContent;
      const drugName = decodeURIComponent(button.dataset.drugName);
      printSticker(drugName, printContent);
    });
  });

  document.querySelectorAll('.keyword-badge').forEach(keywordBadge => {
    keywordBadge.addEventListener('click', () => {
      searchTerm = keywordBadge.innerText;
      document.getElementById('search-input').value = searchTerm;
      startSearching(searchTerm);
    });
  });

  loadAllInteractions();
}

async function loadAllInteractions() {
  const containers = document.querySelectorAll('.interactions-container');
  for (const container of containers) {
    const drugName = decodeURIComponent(container.dataset.drugName);
    if (!drugName) continue;
    
    // Load data
    const data = await getDrugInteractions(drugName);
    renderInteractionUI(container, drugName, data);
  }
}

function renderInteractionUI(container, drugName, data) {
  let html = `
    <hr class="interaction-divider">
    <div class="feedback-actions">
      <button class="material-btn material-btn-icon like-btn" data-drug="${encodeURIComponent(drugName)}" title="Like">
        <i class="far fa-thumbs-up"></i> <span class="like-count">${data.likes || 0}</span>
      </button>
      <button class="material-btn material-btn-icon dislike-btn" data-drug="${encodeURIComponent(drugName)}" title="Dislike">
        <i class="far fa-thumbs-down"></i> <span class="dislike-count">${data.dislikes || 0}</span>
      </button>
      <div class="spacer"></div>
      <button class="material-btn material-btn-text toggle-comments-btn">
        <i class="far fa-comment"></i> Comments (${data.comments ? data.comments.length : 0})
      </button>
    </div>
    
    <div class="comments-section-wrapper" style="display: none;">
      <div class="comment-form-box">
        <div class="comment-profile-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; margin-left: 4px;">
          <div class="comment-avatar-placeholder" style="width: 32px; height: 32px; font-size: 18px;">
            <i class="fas fa-user-circle"></i>
          </div>
          <span class="guest-label" style="font-weight: 600; font-size: 14px; color: #1c1e21;">Comment as Guest</span>
        </div>
        <div class="comment-input-area" style="width: 100%;">
          <input type="text" class="material-input comment-author" placeholder="Your Name (Optional)">
          <textarea class="material-input comment-content" rows="1" placeholder="Add a comment..."></textarea>
          <div class="comment-form-actions">
            <button class="material-btn cancel-comment-btn">Cancel</button>
            <button class="material-btn material-btn-primary submit-comment-btn" data-drug="${encodeURIComponent(drugName)}">Comment</button>
          </div>
        </div>
      </div>

      <div class="comments-list">
        ${data.comments && data.comments.length > 0 ? data.comments.map(c => `
          <div class="comment-item-box">
            <div class="comment-avatar-placeholder">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="comment-item-content">
              <div class="comment-header">
                <span class="comment-author-name">@${(c.author || 'guest').replace(/\s+/g, '').toLowerCase()}</span>
                <span class="comment-date">${c.date}</span>
              </div>
              <div class="comment-body-text">${c.content}</div>
            </div>
          </div>
        `).join('') : '<p class="no-comments-msg">No comments yet.</p>'}
      </div>
    </div>
  `;
  container.innerHTML = html;

  // Attach Events
  const likeBtn = container.querySelector('.like-btn');
  const dislikeBtn = container.querySelector('.dislike-btn');
  const toggleBtn = container.querySelector('.toggle-comments-btn');
  const submitBtn = container.querySelector('.submit-comment-btn');
  const cancelBtn = container.querySelector('.cancel-comment-btn');
  const commentInput = container.querySelector('.comment-content');
  const commentActions = container.querySelector('.comment-form-actions');
  
  // Google style: only show buttons when input is focused or has text
  commentInput.addEventListener('focus', () => {
    commentActions.classList.add('active');
  });
  
  cancelBtn.addEventListener('click', () => {
    container.querySelector('.comment-author').value = '';
    commentInput.value = '';
    commentActions.classList.remove('active');
  });
  
  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    likeBtn.classList.add('reaction-pop');
    const newData = await postDrugInteraction(drugName, 'like');
    if (newData) renderInteractionUI(container, drugName, newData);
  });
  
  dislikeBtn.addEventListener('click', async () => {
    dislikeBtn.disabled = true;
    dislikeBtn.classList.add('reaction-pop');
    const newData = await postDrugInteraction(drugName, 'dislike');
    if (newData) renderInteractionUI(container, drugName, newData);
  });
  
  toggleBtn.addEventListener('click', () => {
    const section = container.querySelector('.comments-section-wrapper');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  });
  
  submitBtn.addEventListener('click', async () => {
    const author = container.querySelector('.comment-author').value.trim() || 'Guest';
    const content = container.querySelector('.comment-content').value.trim();
    if (!content) return alert("Please enter a comment!");
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Posted!';
    submitBtn.classList.add('btn-success-reaction');
    
    const newData = await postDrugInteraction(drugName, 'comment', content, author);
    if (newData) {
      setTimeout(() => {
        renderInteractionUI(container, drugName, newData);
        container.querySelector('.comments-section-wrapper').style.display = 'block';
      }, 800); // Give user time to see the success reaction
    }
  });
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

function renderDrugResult(result) {
  const accordionId = `result-${Math.random().toString(36).substr(2, 9)}`;
  let html = `
  <div class="accordion-item result-item">
    <h2 class="accordion-header" id="heading-${accordionId}">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" 
              data-bs-target="#collapse-${accordionId}" aria-expanded="true" 
              aria-controls="collapse-${accordionId}">
        <div class="accordion-title-content w-100">
            <p class="source mb-1">
              <span class="text-muted"><span class="source-label">Source:</span></span> 
              ${result.source} 
            </p>
            ${result.category ? `<h5 class="drug-name mb-0">${result.category}</h5>` : `<h5 class="drug-name mb-0"></h5>`}
          </div>
          <i class="fas fa-chevron-down ms-auto accordion-icon"></i>
        </button>
      </h2>
      <div id="collapse-${accordionId}" class="accordion-collapse collapse show" 
           aria-labelledby="heading-${accordionId}">
        <div class="accordion-body">
  `;

  if (result.drug && result.drug.length > 0) {
    html += `<h5 class="drug-name mb-0">${result.drug}</h5>`;
  } else {
    html += `<h5 class="drug-name mb-0">${result.title || result.name || ''}</h5>`;
  }

  if (result.content) {
    html += `<div class="content">${formatContent(result.content, searchTerm)}</div>`;
  }

  if (result.source === 'Drug Administration Food Interactions 2025 Care Givers Professionals EDITION' && result.content.print) {
    let printContent = Array.isArray(result.content.print)
      ? `<ul>${result.content.print.map(item => `<li>${item}</li>`).join('')}</ul>`
      : result.content.print;
    html += `
      <button class="print-btn" data-print-content="${printContent}" data-drug-name="${encodeURIComponent(result.drug)}" title="طباعة ملصق">
        <i class="fas fa-print"></i> Print Sticker
      </button>
    `;
  }

  // Add interactions container
  const drugNameForInteraction = result.drug || result.title || result.name || '';
  if (drugNameForInteraction) {
    html += `<div class="interactions-container mt-3" data-drug-name="${encodeURIComponent(drugNameForInteraction)}">
               <div class="text-muted small"><i class="fas fa-spinner fa-spin"></i> Loading interactions...</div>
             </div>`;
  }

  html += `
        </div>
      </div>
    </div>
  `;
  return html;
}

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

function printSticker(drugName, content) {
  printJS({
    printable: `
        <div style="font-family: Arial, sans-serif; padding: 10px; border: 2px solid #000; max-width: 300px;">
          <h2 style="text-align: center; margin: 0 0 10px 0;">${drugName}</h2>
          <div style="font-size: 14px;">${content}</div>
        </div>
      `,
    type: 'raw-html',
    style: '.highlight-term { font-weight: bold; }' 
  });
}
