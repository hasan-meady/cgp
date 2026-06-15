// interactions.js

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
                <span class="comment-author-name">@${(c.author || 'guest').replace(/\\s+/g, '').toLowerCase()}</span>
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
