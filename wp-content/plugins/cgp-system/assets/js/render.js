// render.js - Refactored for separation of concerns

/**
 * Template functions for generating HTML structures
 */
const PostTemplate = {
  generateId: () => `result-${Math.random().toString(36).substr(2, 9)}`,
  
  createAccordionWrapper: (accordionId) => `
    <div class="accordion-item result-item">
      <h2 class="accordion-header" id="heading-${accordionId}">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" 
                data-bs-target="#collapse-${accordionId}" aria-expanded="true" 
                aria-controls="collapse-${accordionId}">
          <div class="accordion-title-content w-100">
              <p class="source mb-1">
                <span class="text-muted"><span class="source-label">Source:</span></span> 
                {{source}} 
              </p>
              {{category}}
            </div>
            <i class="fas fa-chevron-down ms-auto accordion-icon"></i>
          </button>
        </h2>
        <div id="collapse-${accordionId}" class="accordion-collapse collapse show" 
             aria-labelledby="heading-${accordionId}">
          <div class="accordion-body">
  `,
  
  createAccordionFooter: () => `
        </div>
      </div>
    </div>
  `,
  
  createDrugName: (name) => `<h5 class="drug-name mb-0">${name}</h5>`,
  
  createContentSection: (content) => `<div class="content">${content}</div>`,
  
  createPrintButton: (accordionId, safeDrugName) => `
    <button class="print-btn" data-print-target="print-content-${accordionId}" data-drug-name="${safeDrugName}" title="Print Sticker">
      <i class="fas fa-print"></i> Print Sticker
    </button>
  `,
  
  createPrintContentTemplate: (accordionId, content) => `
    <template id="print-content-${accordionId}">${content}</template>
  `,
  
  createInteractionsContainer: (safeDrugName) => `
    <div class="interactions-container mt-3" data-drug-name="${safeDrugName}">
      <div class="text-muted small"><i class="fas fa-spinner fa-spin"></i> Loading interactions...</div>
    </div>
  `,
  
  createNoResults: () => `
    <div class="no-results-message text-center">
      <i class="fas fa-search-minus no-results-icon"></i>
      <h5 class="no-results-title">No results found</h5>
      <p class="no-results-hint">Try refining your search or adjusting the filters.</p>
    </div>
  `,
  
  createTagBadge: (tag) => `<span class="keyword-badge sidebar-tag">${tag}</span>`
};

/**
 * Renderer functions for processing data
 */
const PostRenderer = {
  renderBlocks: (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    return blocks.map(block => {
      switch (block.block_type) {
        case 'list':
          return Array.isArray(block.data) 
            ? `<ul>${block.data.map(item => `<li>${item}</li>`).join('')}</ul>`
            : '';
        case 'key_value':
          return Array.isArray(block.data)
            ? `<ul>${block.data.map(kv => {
                const val = Array.isArray(kv.value) ? kv.value.join(', ') : kv.value;
                return `<li><strong>${kv.key}:</strong> ${val}</li>`;
              }).join('')}</ul>`
            : '';
        case 'text':
        default:
          return block.data || '';
      }
    }).join('');
  },
  
  extractPrintContent: (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return 'See details on dashboard';
    
    const printableBlocks = blocks.filter(block => {
      const heading = (block.block_heading || '').toLowerCase();
      return /print|admin|instruct|precaution|dos|diet/i.test(heading);
    });
    
    if (printableBlocks.length === 0) return 'See details on dashboard';
    
    return printableBlocks.map(block => {
      const content = PostRenderer.renderBlocks([block]);
      return `<strong>${block.block_heading}:</strong><br>${content}`;
    }).join('<br><br>');
  },
  
  shouldShowPrintButton: (blocks) => {
    if (!blocks || !Array.isArray(blocks)) return false;
    return blocks.some(block => {
      const heading = (block.block_heading || '').toLowerCase();
      return /print|admin|instruct|precaution|dos|diet/i.test(heading);
    });
  },
  
  getDrugName: (result) => {
    if (result.drug && result.drug.length > 0) return result.drug;
    return result.title || result.name || '';
  },
  
  getCategory: (result) => {
    return result.category 
      ? PostTemplate.createDrugName(result.category) 
      : PostTemplate.createDrugName('');
  }
};

/**
 * UI Manager for DOM manipulation
 */
const UIManager = {
  updateResultsCount: (count) => {
    const element = document.getElementById('search-results-count');
    if (!element) return;
    
    if (count === 0) {
      element.textContent = '';
      element.classList.remove('visible');
      element.style.display = 'none';
    } else {
      element.style.display = 'inline-block';
      element.textContent = `${count} ${count === 1 ? 'result' : 'results'} found`;
      setTimeout(() => element.classList.add('visible'), 10);
    }
  },
  
  updateSidebar: (tags) => {
    const tagsContainer = document.getElementById('dynamic-tags');
    const sidebar = document.getElementById('search-tags-sidebar');
    const mobileTagsContainer = document.getElementById('mobile-dynamic-tags');
    const mobileSidebar = document.getElementById('mobile-search-tags');
    const sidebarWrapper = document.getElementById('main-sidebar-wrapper');
    
    if (!tagsContainer || !sidebar) return;
    
    if (tags.size > 0) {
      const tagsHtml = Array.from(tags)
        .map(tag => PostTemplate.createTagBadge(tag))
        .join('');
      
      tagsContainer.innerHTML = tagsHtml;
      sidebar.style.display = 'block';
      sidebarWrapper.style.display = 'block';
      
      if (mobileTagsContainer && mobileSidebar) {
        mobileTagsContainer.innerHTML = tagsHtml;
        mobileSidebar.style.display = 'block';
      }
    } else {
      sidebar.style.display = 'none';
      if (mobileSidebar) mobileSidebar.style.display = 'none';
      
      const dashboard = document.getElementById('initial-dashboard-feed');
      if (sidebarWrapper && (!dashboard || dashboard.style.display === 'none')) {
        sidebarWrapper.style.display = 'none';
      }
    }
  },
  
  hideAllSidebars: () => {
    const sidebar = document.getElementById('search-tags-sidebar');
    const mobileSidebar = document.getElementById('mobile-search-tags');
    
    if (sidebar) sidebar.style.display = 'none';
    if (mobileSidebar) mobileSidebar.style.display = 'none';
  },
  
  attachEventListeners: () => {
    // Print button listeners
    document.querySelectorAll('.print-btn').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.printTarget;
        const template = document.getElementById(targetId);
        const printContent = template ? template.innerHTML : '';
        const drugName = decodeURIComponent(button.dataset.drugName);
        printSticker(drugName, printContent);
      });
    });
    
    // Keyword badge listeners
    document.querySelectorAll('.keyword-badge').forEach(keywordBadge => {
      keywordBadge.addEventListener('click', () => {
        searchTerm = keywordBadge.innerText;
        document.getElementById('search-input').value = searchTerm;
        startSearching(searchTerm);
      });
    });
  }
};

/**
 * Main display function
 */
function displayResults(results) {
  const resultsContainer = document.getElementById('search-results');

  if (!resultsContainer) return;

  // Handle no results case
  if (results.length === 0) {
    resultsContainer.innerHTML = PostTemplate.createNoResults();
    UIManager.updateResultsCount(0);
    UIManager.hideAllSidebars();
    return;
  }

  // Update results count
  UIManager.updateResultsCount(results.length);

  // Render results
  const extractedTags = new Set();
  const html = results.map(result => {
    extractTagsFromResult(result, extractedTags);
    return renderDrugResult(result);
  }).join('');

  resultsContainer.innerHTML = html;
  
  // Update sidebar
  UIManager.updateSidebar(extractedTags);
  
  // Attach event listeners
  UIManager.attachEventListeners();

  // Load interactions
  loadAllInteractions();
}

/**
 * Render individual drug result
 */
function renderDrugResult(result) {
  const accordionId = PostTemplate.generateId();
  const drugName = PostRenderer.getDrugName(result);
  const category = PostRenderer.getCategory(result);
  
  let html = PostTemplate.createAccordionWrapper(accordionId);
  
  // Replace placeholder values
  html = html.replace('{{source}}', result.source);
  html = html.replace('{{category}}', category);
  
  // Add drug name
  html += PostTemplate.createDrugName(drugName);
  
  // Add content
  if (result.content) {
    html += PostTemplate.createContentSection(formatContent(result.content, searchTerm));
  }
  
  // Add print button if needed
  if (result.content && PostRenderer.shouldShowPrintButton(result.content.blocks)) {
    const printContent = PostRenderer.extractPrintContent(result.content.blocks);
    const safeDrugName = encodeURIComponent(drugName);
    html += PostTemplate.createPrintButton(accordionId, safeDrugName);
    html += PostTemplate.createPrintContentTemplate(accordionId, printContent);
  }
  
  // Add interactions container
  if (drugName) {
    html += PostTemplate.createInteractionsContainer(encodeURIComponent(drugName));
  }
  
  html += PostTemplate.createAccordionFooter();
  
  return html;
}


