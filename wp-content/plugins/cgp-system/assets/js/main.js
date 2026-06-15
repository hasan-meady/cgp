// main.js

let strict = false; 
let searchTerm;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('sources-toggle');
  const sourcesCard = document.getElementById('sources-card');
  const overlay = document.querySelector('.sources-overlay');
  const closeBtn = document.querySelector('.close-btn');
  const searchInput = document.getElementById('search-input');

  const dataFetchPromise = fetchAllData();

  searchInput?.addEventListener('click', function (e) {
    e.target.select();
    e.target.setSelectionRange(0, e.target.value.length);
  });
  
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout); 
      searchTimeout = setTimeout(() => {
        const term = this.value.trim();
        if (term.length >= 2) startSearching(term);
      }, 300); 
    });
  }

  const filterAll = document.getElementById("filter-all");
  if (filterAll) {
    filterAll.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll('.filter-container .form-check-input:not(#filter-all)');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
        checkbox.disabled = this.checked;
      });
      searchTerm = document.getElementById("search-input")?.value.trim();
      startSearching(searchTerm);
    });
  }

  document.querySelectorAll('.filter-container .form-check-input:not(#filter-all)').forEach(checkbox => {
    checkbox.addEventListener("change", function () {
      const allCheckbox = document.getElementById("filter-all");
      if (this.checked && allCheckbox.checked) {
        allCheckbox.checked = false;
        document.querySelectorAll('.filter-container .form-check-input:not(#filter-all)').forEach(cb => {
          cb.disabled = false;
        });
      }
      if (!this.checked && allCheckbox.checked) {
        allCheckbox.checked = false;
        document.querySelectorAll('.filter-container .form-check-input:not(#filter-all)').forEach(cb => {
          cb.disabled = true;
        });
      }
      const checkboxes = document.querySelectorAll('.filter-container .form-check-input:not(#filter-all)');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      if (allChecked) {
        document.getElementById("filter-all").checked = true;
        checkboxes.forEach(cb => {
          cb.disabled = true;
        });
      }
      searchTerm = document.getElementById("search-input")?.value.trim();
      startSearching(searchTerm);
    });
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      sourcesCard.classList.add('active');
      overlay.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      sourcesCard.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      sourcesCard.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

  if (sourcesCard) {
    sourcesCard.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // Set up Awesomplete once data is fetched
  if (dataFetchPromise) {
    dataFetchPromise.then(() => {
      if (searchInput && typeof Awesomplete !== 'undefined') {
        if (allKeywords.length === 0) {
          console.warn("No keywords available for autocomplete");
        }
        const awesomplete = new Awesomplete(searchInput, {
          list: allKeywords,
          minChars: 2,
          maxItems: 10,
          autoFirst: true,
          filter: (text, input) => {
            return text.toLowerCase().includes(input.toLowerCase());
          },
          sort: (a, b) => {
            return a.length - b.length;
          },
          item: (text, input) => {
            const li = document.createElement('li');
            li.textContent = text;
            return li;
          }
        });
        
        searchInput.addEventListener('awesomplete-select', (event) => {
          searchTerm = event.text.value; 
          searchInput.value = searchTerm; 
          startSearching(searchTerm);
          searchInput.focus();
        });

      } else {
        console.error("Awesomplete not loaded or search input not found");
      }
    });
  }

  // End rolling words animation on the first word after exactly 2 cycles (22 seconds)
  setTimeout(() => {
    const rollingWords = document.querySelector('.rolling-words');
    if (rollingWords) rollingWords.classList.add('finished');
  }, 22000);
});

function startSearching(term) {
  const dashboard = document.getElementById('initial-dashboard-feed');
  const sidebarWrapper = document.getElementById('main-sidebar-wrapper');
  
  if (dashboard) {
    if (!term || term.length < 2) {
      dashboard.style.display = 'block';
      if (sidebarWrapper && dashboard.innerHTML.trim() !== '') {
        sidebarWrapper.style.display = 'block';
      }
    } else {
      dashboard.style.display = 'none';
      const sidebar = document.getElementById('search-tags-sidebar');
      if (sidebarWrapper && (!sidebar || sidebar.style.display === 'none')) {
        sidebarWrapper.style.display = 'none';
      }
    }
  }

  const selectedSources = Array.from(document.querySelectorAll('.filter-container .form-check-input:checked'))
    .map(cb => cb.value);

  const results = searchDocuments(term, selectedSources);
  displayResults(results);
  logCGPSearch(term, results.length);
}

// Left for compatibility if it was used elsewhere
function toggleFilter(show) {
  const filterContainer = document.querySelector('.filter-container-wrapper');
  const accordionCollapse = document.querySelector('#filter-collapse');
  const filterToggleBtn = document.querySelector('.filter-toggle-btn');
  
  if (!filterContainer || !accordionCollapse || !filterToggleBtn) return;

  if (show) {
    filterContainer.style.display = 'block'; 
    setTimeout(() => {
      accordionCollapse.classList.add('show');
      filterToggleBtn.classList.add('active');
      filterToggleBtn.setAttribute('aria-expanded', 'true');
      filterContainer.classList.add('active');
    }, 10);
  } else {
    accordionCollapse.classList.remove('show');
    filterToggleBtn.classList.remove('active');
    filterToggleBtn.setAttribute('aria-expanded', 'false');
    filterContainer.classList.remove('active');
    setTimeout(() => {
      if (!filterContainer.classList.contains('active')) {
        filterContainer.style.display = 'none';
      }
    }, 300);
  }
}

// Scroll to Top Logic
document.addEventListener('DOMContentLoaded', () => {
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  scrollBtn.className = 'scroll-to-top-btn';
  scrollBtn.title = 'Scroll to top';
  document.body.appendChild(scrollBtn);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
