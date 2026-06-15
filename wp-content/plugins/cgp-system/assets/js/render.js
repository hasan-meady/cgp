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


