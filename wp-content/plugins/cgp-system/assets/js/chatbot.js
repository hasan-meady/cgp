// chatbot.js
(function($) {
    $(document).ready(function() {
        // Inject Chat Widget HTML into the body
        const chatHTML = `
            <div id="cgp-chat-widget">
                <button id="cgp-chat-toggle" class="cgp-chat-toggle-btn">
                    <i class="fas fa-comment-medical"></i> Ask AI
                </button>
                <div id="cgp-chat-window" class="cgp-chat-window" style="display: none;">
                    <div class="cgp-chat-header">
                        <div class="cgp-chat-title"><i class="fas fa-brain"></i> CGP Medical AI</div>
                        <button id="cgp-chat-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="cgp-chat-body" id="cgp-chat-body">
                        <div class="cgp-chat-message bot">
                            Hello! I am an AI assistant created by <b>Hasan Meady</b>. I can answer your questions using the officially verified medical protocols in our database. How can I help you today?
                        </div>
                    </div>
                    <div class="cgp-chat-footer">
                        <input type="text" id="cgp-chat-input" placeholder="Ask a medical question...">
                        <button id="cgp-chat-send"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
        $('body').append(chatHTML);

        const $toggle = $('#cgp-chat-toggle');
        const $window = $('#cgp-chat-window');
        const $close = $('#cgp-chat-close');
        const $input = $('#cgp-chat-input');
        const $send = $('#cgp-chat-send');
        const $body = $('#cgp-chat-body');

        // Toggle visibility
        $toggle.on('click', function() {
            $window.fadeToggle(200);
            $input.focus();
        });

        $close.on('click', function() {
            $window.fadeOut(200);
        });

        // Handle sending messages
        function sendMessage() {
            const question = $input.val().trim();
            if (!question) return;

            // Append User Message
            $body.append(`<div class="cgp-chat-message user">${escapeHtml(question)}</div>`);
            $input.val('');
            scrollToBottom();

            // Append Typing Indicator
            const typingId = 'typing-' + Date.now();
            $body.append(`<div id="${typingId}" class="cgp-chat-message bot typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`);
            scrollToBottom();

            // Send to API
            $.ajax({
                url: cgpData.askUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ question: question }),
                success: function(response) {
                    $('#' + typingId).remove();
                    if (response.success) {
                        $body.append(`<div class="cgp-chat-message bot">${response.answer}</div>`);
                    } else {
                        $body.append(`<div class="cgp-chat-message bot error">Error: Invalid response from server.</div>`);
                    }
                    scrollToBottom();
                },
                error: function(xhr) {
                    $('#' + typingId).remove();
                    let errMsg = "An error occurred.";
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errMsg = xhr.responseJSON.message;
                    }
                    $body.append(`<div class="cgp-chat-message bot error">${errMsg}</div>`);
                    scrollToBottom();
                }
            });
        }

        $send.on('click', sendMessage);
        $input.on('keypress', function(e) {
            if (e.which === 13) {
                sendMessage();
            }
        });

        function scrollToBottom() {
            $body.scrollTop($body[0].scrollHeight);
        }

        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
    });
})(jQuery);
