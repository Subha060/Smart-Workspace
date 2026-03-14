document.addEventListener('DOMContentLoaded', () => {
    // ... (previous logic)
    
    // AI Draft Modal Logic
    const draftModal = document.getElementById('aiDraftModal');
    const openDraftBtn = document.getElementById('open-draft-btn'); // Compose / Draft with AI button
    const closeDraftBtn = document.getElementById('closeDraftModal');
    const generateBtn = document.getElementById('generateDraftBtn');
    const copyBtn = document.getElementById('copyDraftBtn');
    const promptInput = document.getElementById('aiDraftPrompt');
    const resultArea = document.getElementById('aiDraftResult');

    openDraftBtn.addEventListener('click', () => {
        draftModal.classList.remove('hidden');
        draftModal.classList.add('flex');
        promptInput.focus();
    });

    closeDraftBtn.addEventListener('click', () => {
        draftModal.classList.add('hidden');
        draftModal.classList.remove('flex');
        resultArea.classList.add('hidden');
        copyBtn.classList.add('hidden');
        generateBtn.textContent = 'Generate Draft';
        promptInput.value = '';
    });

    generateBtn.addEventListener('click', async () => {
        const text = promptInput.value.trim();
        if (!text) return;

        generateBtn.textContent = 'Thinking...';
        generateBtn.disabled = true;

        try {
            const response = await fetch('/assistant/chat-api/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'Email Draft', text: text })
            });
            const data = await response.json();
            
            resultArea.innerHTML = data.response.replace(/\n/g, '<br>');
            resultArea.classList.remove('hidden');
            copyBtn.classList.remove('hidden');
            generateBtn.textContent = 'Regenerate';
            
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(data.response);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
            };
        } catch (error) {
            console.error('Draft generation failed:', error);
            alert('Draft generation failed.');
        } finally {
            generateBtn.disabled = false;
        }
    });

    // ... (rest of search/selection logic)
    // 1. Email Selection styling & Drag setup
    const allDrafts = Array.isArray(window.draftsData) ? window.draftsData : [];
    const emailListItems = document.querySelectorAll('.inbox-item');
    const readSubject = document.getElementById('read-subject');
    const readBody = document.getElementById('read-body');
    let selectedIndex = 0; // track currently active draft index
    
    emailListItems.forEach(item => {
        // Click to select
        item.addEventListener('click', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.closest('.absolute')) return;
            emailListItems.forEach(el => {
                el.classList.remove('bg-amber-500/5', 'border-l-2', 'border-amber-500', 'border-transparent');
                el.classList.add('border-transparent');
                if(!el.querySelector('.absolute.w-2.h-2')) el.classList.add('hover:bg-white/5');
            });
            item.classList.add('bg-amber-500/5', 'border-l-2', 'border-amber-500');
            item.classList.remove('border-transparent', 'hover:bg-white/5');
            const dot = item.querySelector('.absolute.w-2.h-2.rounded-full.bg-amber-500');
            if (dot) dot.remove();

            // Populate Read Pane
            const idx = parseInt(item.getAttribute('data-index'));
            const draft = allDrafts[idx];
            if (draft && draft.email) {
                readSubject.textContent = draft.email.subject || "No Subject";
                
                let bodyHtml = `<p>${draft.email.greeting || ''}</p>`;
                if (draft.email.body) {
                    // Split by double newline to create paragraphs
                    const paragraphs = draft.email.body.split(/\n\s*\n/);
                    paragraphs.forEach(p => { 
                        if (p.trim()) bodyHtml += `<p>${p.trim()}</p>`; 
                    });
                }
                bodyHtml += `<p>${draft.email.closing || ''}<br>${draft.email.signature || ''}</p>`;
                
                readBody.innerHTML = bodyHtml;
                selectedIndex = idx;
            }
        });

        // Drag Setup
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
            item.classList.add('opacity-50', 'scale-[0.98]');
            e.dataTransfer.effectAllowed = 'move';
            window.draggedEmail = item;
            if (e.dataTransfer.setData) e.dataTransfer.setData('text/plain', '');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('opacity-50', 'scale-[0.98]');
            window.draggedEmail = null;
        });
    });

    // Delete current draft
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (selectedIndex < 0 || selectedIndex >= allDrafts.length) return;
            if (!confirm('Delete this draft? This cannot be undone.')) return;

            deleteBtn.disabled = true;
            try {
                const resp = await fetch('/assistant/delete-draft/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ draft_index: selectedIndex })
                });
                const data = await resp.json();
                if (data.success) {
                    // Animate out the list item
                    const listItem = document.querySelector(`.inbox-item[data-index="${selectedIndex}"]`);
                    if (listItem) {
                        listItem.style.transition = 'opacity 0.25s, height 0.25s, padding 0.25s';
                        listItem.style.opacity = '0';
                        listItem.style.height = '0px';
                        listItem.style.padding = '0px';
                        listItem.style.overflow = 'hidden';
                        setTimeout(() => listItem.remove(), 260);
                    }
                    allDrafts.splice(selectedIndex, 1);
                    // Show empty state or next draft
                    if (allDrafts.length === 0) {
                        readSubject.textContent = 'No Drafts';
                        readBody.innerHTML = '<p>All drafts have been deleted.</p>';
                        selectedIndex = -1;
                    } else {
                        selectedIndex = Math.min(selectedIndex, allDrafts.length - 1);
                        // Re-select the next item visually after DOM update
                        setTimeout(() => {
                            const nextItem = document.querySelector(`.inbox-item[data-index="${selectedIndex}"]`);
                            if (nextItem) nextItem.click();
                        }, 300);
                    }
                } else {
                    alert('Delete failed: ' + (data.error || 'Unknown error'));
                }
            } catch(err) {
                alert('Network error. Please try again.');
            } finally {
                deleteBtn.disabled = false;
            }
        });
    }

    // Delete ALL drafts
    const deleteAllBtn = document.getElementById('delete-all-btn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            if (allDrafts.length === 0) return;
            if (!confirm(`Delete all ${allDrafts.length} draft(s)? This cannot be undone.`)) return;

            deleteAllBtn.disabled = true;
            deleteAllBtn.textContent = 'Deleting…';
            try {
                const resp = await fetch('/assistant/delete-all-drafts/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await resp.json();
                if (data.success) {
                    // Clear the inbox list
                    const inboxList = document.getElementById('inbox-list');
                    if (inboxList) {
                        inboxList.innerHTML = `
                            <div class="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full gap-4 opacity-70">
                                <svg class="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                                </svg>
                                <div>
                                    <p class="text-sm font-medium text-slate-300">No Drafts Yet</p>
                                    <p class="text-xs mt-1 max-w-[200px] leading-relaxed mx-auto">Generate an email using the Chat Assistant to see it here.</p>
                                </div>
                            </div>`;
                    }
                    allDrafts.length = 0;
                    selectedIndex = -1;
                    readSubject.textContent = 'No Drafts';
                    readBody.innerHTML = '<p>All drafts have been deleted.</p>';
                } else {
                    alert('Delete all failed: ' + (data.error || 'Unknown error'));
                }
            } catch(err) {
                alert('Network error. Please try again.');
            } finally {
                deleteAllBtn.disabled = false;
                deleteAllBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete All`;
            }
        });
    }

    // Folders as Drop Targets
    const folders = document.querySelectorAll('.w-full.md\\:w-56 .flex-1.py-2.px-2 a');
    const labels = document.querySelectorAll('.p-4.border-t.border-white\\/5 .space-y-1 > div');
    const dropTargets = [...folders, ...labels];

    dropTargets.forEach(target => {
        target.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            target.classList.add('bg-white/10', 'ring-1', 'ring-amber-500/50', 'rounded-lg');
        });

        target.addEventListener('dragleave', () => {
            target.classList.remove('bg-white/10', 'ring-1', 'ring-amber-500/50', 'rounded-lg');
        });

        target.addEventListener('drop', (e) => {
            e.preventDefault();
            target.classList.remove('bg-white/10', 'ring-1', 'ring-amber-500/50', 'rounded-lg');
            
            const email = window.draggedEmail;
            if (email) {
                // If it's a folder with a counter, increment it
                const badge = target.querySelector('span:last-child');
                if (badge && !badge.classList.contains('w-2')) { // don't increment label circle
                    badge.textContent = parseInt(badge.textContent || "0") + 1;
                    
                    // Simple animation for the badge
                    badge.classList.add('scale-150', 'transition-transform');
                    setTimeout(() => badge.classList.remove('scale-150'), 200);
                } else if (!badge && target.tagName === 'A') {
                    // Create badge if it didn't exist (like on Starred/Sent)
                    const newBadge = document.createElement('span');
                    newBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-white animate-pulse';
                    newBadge.textContent = '1';
                    target.appendChild(newBadge);
                }

                // Remove the email from the list
                email.style.transition = 'opacity 0.3s ease, height 0.3s ease';
                email.style.opacity = '0';
                email.style.height = '0px';
                email.style.padding = '0px';
                email.style.border = 'none';
                setTimeout(() => email.remove(), 300);
            }
        });
    });

    // 2. AI Suggestion block buttons
    const suggestionBlock = document.querySelector('.mt-10.rounded-2xl.bg-amber-500\\/5');
    if (suggestionBlock) {
        const dismissBtn = suggestionBlock.querySelector('button:first-of-type');
        const insertBtn = suggestionBlock.querySelector('button:last-of-type');
        
        dismissBtn.addEventListener('click', () => {
            suggestionBlock.style.opacity = '0';
            suggestionBlock.style.transition = 'opacity 0.3s ease';
            setTimeout(() => suggestionBlock.style.display = 'none', 300);
        });

        insertBtn.addEventListener('click', async () => {
            const emailBody = document.querySelector('.prose.prose-invert').textContent.trim();
            
            insertBtn.textContent = 'Generating...';
            insertBtn.disabled = true;

            try {
                const response = await fetch('/assistant/chat-api/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'reply_draft', text: emailBody })
                });
                const data = await response.json();
                
                suggestionBlock.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Draft Generated and Ready!
                        </div>
                    </div>
                    <div class="bg-[#0a0c12]/80 border border-emerald-500/20 rounded-xl p-4 text-sm text-slate-300 mt-4 mb-4">
                        ${data.reply}
                    </div>
                    <div class="flex justify-end order-last">
                        <p class="text-[10px] text-slate-500 italic">This draft has been added to your clipboard for now.</p>
                    </div>
                `;
                suggestionBlock.className = 'mt-10 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5 transition-all';
                
                // Copy to clipboard as a "working" simulation
                navigator.clipboard.writeText(data.reply);
            } catch (error) {
                console.error('Reply generation failed:', error);
                alert('Reply generation failed. Please try again.');
                insertBtn.textContent = 'Insert Draft';
                insertBtn.disabled = false;
            }
        });
    }
});