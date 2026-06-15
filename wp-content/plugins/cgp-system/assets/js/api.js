// api.js
// Global variables shared across modules
let allData = [];
let allKeywords = [];

/**
 * Fetches all data from the specified URLs
 */
async function fetchAllData() {
  try {
    const response = await fetch(cgpData.apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    allData = await response.json();
    extractKeywords(); // Extract keywords after fetching data
  } catch (error) {
    console.error("Error loading data from WordPress API:", error);
  }
}

async function logCGPSearch(term, count) {
  if (typeof auth === 'undefined') return;
  const headers = auth.getAuthHeaders();
  if (!headers.Authorization) return;
  try {
    await fetch('/api/logs/search', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: term, results_count: count, type: 'cgp' })
    });
  } catch (e) { console.error(e); }
}

async function getDrugInteractions(drugName) {
  try {
    const url = new URL(cgpData.apiUrl.replace('/data', '/interaction'));
    url.searchParams.append('drug', drugName);
    const response = await fetch(url);
    if (!response.ok) return { likes: 0, dislikes: 0, comments: [] };
    return await response.json();
  } catch (error) {
    console.error("Error fetching interactions:", error);
    return { likes: 0, dislikes: 0, comments: [] };
  }
}

async function postDrugInteraction(drugName, action, content = '', author = 'Guest') {
  try {
    const url = cgpData.apiUrl.replace('/data', '/interaction');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug: drugName, action, content, author })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error posting interaction:", error);
    return null;
  }
}
