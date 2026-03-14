document.addEventListener('DOMContentLoaded', () => {
        const summaries = Array.isArray(window.summariesData) ? window.summariesData : [];

        const summaryItems = document.querySelectorAll('.summary-item');
        const readSynthesis = document.getElementById('read-synthesis');
        const readPreview = document.getElementById('read-preview');
        const deleteBtn = document.getElementById('delete-btn');
        let selectedIndex = 0;

        summaryItems.forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.getAttribute('data-index'));
                const summary = summaries[idx];
                if (!summary) return;

                // Update UI state
                summaryItems.forEach(el => {
                    el.classList.remove('bg-indigo-500/5', 'border-indigo-500');
                    el.classList.add('border-transparent', 'hover:bg-white/5');
                });
                item.classList.add('bg-indigo-500/5', 'border-indigo-500');
                item.classList.remove('border-transparent', 'hover:bg-white/5');

                // Update Content
                readSynthesis.innerHTML = summary.summary_html;
                readPreview.textContent = `"${summary.original_preview}"`;
                selectedIndex = idx;
            });
        });

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (selectedIndex < 0 || selectedIndex >= summaries.length) return;
                const summary = summaries[selectedIndex];
                
                if (!confirm('Are you certain you wish to purge this summary from existence?')) return;

                deleteBtn.disabled = true;
                try {
                    const resp = await fetch(`/summaries/delete/${summary.id}/`, {
                        method: 'POST',
                        headers: { 'X-CSRFToken': '{{ csrf_token }}' }
                    });
                    const data = await resp.json();
                    
                    if (data.status === 'success') {
                        const listItem = document.querySelector(`.summary-item[data-index="${selectedIndex}"]`);
                        if (listItem) {
                            listItem.style.transition = 'all 0.3s ease';
                            listItem.style.opacity = '0';
                            listItem.style.transform = 'translateX(-20px)';
                            setTimeout(() => {
                                listItem.remove();
                                if (document.querySelectorAll('.summary-item').length === 0) {
                                    location.reload();
                                }
                            }, 300);
                        }
                        
                        summaries.splice(selectedIndex, 1);
                        document.getElementById('summaries-total').textContent = summaries.length;

                        if (summaries.length === 0) {
                            document.getElementById('read-content').innerHTML = `
                                <div class="h-full flex flex-col items-center justify-center opacity-30 py-48">
                                    <p class="text-white font-bold text-xl">System memory is clear</p>
                                </div>`;
                            selectedIndex = -1;
                        } else {
                            selectedIndex = Math.min(selectedIndex, summaries.length - 1);
                            setTimeout(() => {
                                const nextItem = document.querySelector(`.summary-item[data-index="${selectedIndex}"]`);
                                if (nextItem) nextItem.click();
                            }, 350);
                        }
                    } else {
                        alert('Purge failed: ' + data.message);
                    }
                } catch (err) {
                    alert('A systemic network error occurred.');
                } finally {
                    deleteBtn.disabled = false;
                }
            });
        }
    });