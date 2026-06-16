
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
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const term = this.value.trim();
        if (term.length >= 2) startSearching(term);
      }
    });
  }



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

  // End rolling words animation on the first word immediately after the last word finishes (16 seconds)
  setTimeout(() => {
    const rollingWords = document.querySelector('.rolling-words');
    if (rollingWords) rollingWords.classList.add('finished');
  }, 16000);
});

async function startSearching(term) {
  const dashboard = document.getElementById('initial-dashboard-feed');
  const sidebarWrapper = document.getElementById('main-sidebar-wrapper');
  
  if (dashboard) {
    if (!term || term.length < 2) {
      dashboard.style.display = 'block';
      if (sidebarWrapper && dashboard.innerHTML.trim() !== '') {
        sidebarWrapper.style.display = 'block';
      }
      return;
    } else {
      dashboard.style.display = 'none';
      const sidebar = document.getElementById('search-tags-sidebar');
      if (sidebarWrapper && (!sidebar || sidebar.style.display === 'none')) {
        sidebarWrapper.style.display = 'none';
      }
    }
  }

  try {
    // Show loading state if needed here
    
    // Fetch matching data from DB
    const response = await fetch(cgpData.apiUrl + '?q=' + encodeURIComponent(term));
    if (!response.ok) throw new Error('Network error');
    const matchedData = await response.json();
    
    // Temporarily replace allData so searchDocuments searches ONLY the matched DB results
    const previousData = allData;
    allData = matchedData;
    
    const results = searchDocuments(term, []);
    
    // Restore allData so autocomplete works
    allData = previousData;
    
    if (typeof displayResults === 'function') {
      displayResults(results);
    }
    if (typeof logCGPSearch === 'function') {
      logCGPSearch(term, results.length);
    }
  } catch (error) {
    console.error("Search failed:", error);
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
