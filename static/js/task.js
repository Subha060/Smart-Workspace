document.addEventListener('DOMContentLoaded', () => {
    const columns = document.querySelectorAll('.grid > div.flex-col');
    const newBtn = document.querySelector('button.bg-gradient-to-r');
    const addAnotherBtns = document.querySelectorAll('button.border-dashed');
    
    // Helper to update counts
    const updateCounts = () => {
        columns.forEach(col => {
            const countSpan = col.querySelector('h2 > span:last-child');
            if(countSpan) {
                // Count active task cards (not buttons, not the header)
                const cards = col.querySelectorAll('div.group.cursor-pointer');
                countSpan.textContent = cards.length;
            }
        });
    };

    const clearBtns = document.querySelectorAll('.clear-status-btn');
    clearBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = btn.getAttribute('data-clear-status');
            if (status) {
                if (confirm('Are you sure you want to clear all tasks in this section?')) {
                    fetch('/tasks/clear_by_status/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: status })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            const col = btn.closest('.flex-col');
                            if (col) {
                                const cards = col.querySelectorAll('div.group.cursor-pointer');
                                cards.forEach(c => c.remove());
                                updateCounts();
                            }
                        }
                    });
                }
            }
        });
    });

    // Make existing cards interactive
    const bindCardEvents = (card) => {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', (e) => {
            card.classList.add('opacity-50', 'scale-[0.98]');
            e.dataTransfer.effectAllowed = 'move';
            // Store reference globally since dataTransfer is restricted during drag
            window.draggedCard = card;
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('opacity-50', 'scale-[0.98]');
            window.draggedCard = null;
        });

        // Delete button logic
        const deleteBtn = card.querySelector('button.delete-btn') || card.querySelector('button');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const taskId = card.getAttribute('data-task-id');
                if (taskId) {
                    fetch('/tasks/delete/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: taskId })
                    }).then(res => res.json()).then(data => console.log(data));
                }
                card.remove();
                updateCounts();
            });
        }

        // Make title editable
        const title = card.querySelector('h3');
        if (title && !title.hasAttribute('contenteditable')) {
            title.setAttribute('contenteditable', 'true');
            title.classList.add('focus:outline-none', 'focus:ring-1', 'focus:ring-emerald-500/50', 'rounded', '-ml-1', 'px-1');
            title.addEventListener('click', e => e.stopPropagation());
            title.addEventListener('keydown', e => { 
                if(e.key === 'Enter') { e.preventDefault(); title.blur(); } 
            });
            title.addEventListener('blur', () => {
                const taskId = card.getAttribute('data-task-id');
                const newTitle = title.textContent.trim();
                if (taskId && newTitle) {
                    fetch('/tasks/update_title/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: taskId, title: newTitle })
                    }).then(res => res.json()).then(data => {
                        if (data.error) console.error(data.error);
                    });
                }
            });
        }
    };

    // Bind all initial cards
    document.querySelectorAll('div.group.cursor-pointer').forEach(bindCardEvents);

    // Setup columns as drop targets
    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            e.dataTransfer.dropEffect = 'move';
            col.classList.add('bg-white/5', 'rounded-2xl', 'ring-1', 'ring-white/10');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('bg-white/5', 'rounded-2xl', 'ring-1', 'ring-white/10');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('bg-white/5', 'rounded-2xl', 'ring-1', 'ring-white/10');
            
            const card = window.draggedCard;
            if (card) {
                // Insert before the "Add another task" button
                const addBtn = col.querySelector('.border-dashed');
                if (addBtn) {
                    col.insertBefore(card, addBtn);
                } else {
                    col.appendChild(card);
                }
                
                // If dropping into "Done", apply strikethrough logic
                const status = col.getAttribute('data-status') || 'todo';
                const colTitle = col.querySelector('h2').textContent;
                const title = card.querySelector('h3');
                if (colTitle.includes('Done')) {
                    title.classList.add('line-through', 'text-slate-400');
                    title.classList.remove('text-slate-200');
                } else {
                    title.classList.remove('line-through', 'text-slate-400');
                    title.classList.add('text-slate-200');
                }

                const taskId = card.getAttribute('data-task-id');
                if (taskId) {
                    fetch('/tasks/update_status/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: taskId, status: status })
                    }).then(res => res.json()).then(data => console.log(data));
                }
                
                updateCounts();
            }
        });
    });

    // Create a new task card HTML string
    const createNewCard = (id) => {
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `
        <div class="p-4 rounded-xl bg-white/5 border border-white/20 hover:border-white/40 transition-all cursor-pointer group flex flex-col relative overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md" draggable="true" data-task-id="${id || ''}">
            <div class="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
            <div class="flex justify-between items-start mb-2 pl-2">
                <span class="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">New</span>
                <button class="text-slate-500 group-hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all delete-btn">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            <h3 class="text-slate-200 text-sm font-medium pl-2 mb-1.5 leading-snug">New Task</h3>
            <div class="flex items-center justify-between pl-2 mt-4">
                <div class="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Added ${time}
                </div>
            </div>
        </div>`;
    };

    // Add new task handler
    const handleNewTask = async (column) => {
        const addBtn = column.querySelector('.border-dashed');
        const status = column.getAttribute('data-status') || 'todo';
        
        // Disable the add button temporarily to prevent spam clicks
        if (addBtn) addBtn.style.opacity = '0.5';
        
        try {
            // Tell the server to create a new task
            const res = await fetch('/tasks/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Task', status: status })
            });
            const data = await res.json();
            
            if (data.success && data.task) {
                const tmp = document.createElement('div');
                tmp.innerHTML = createNewCard(data.task.id).trim();
                const newCard = tmp.firstElementChild;
                
                if (addBtn) {
                    column.insertBefore(newCard, addBtn);
                } else {
                    column.appendChild(newCard);
                }
                
                bindCardEvents(newCard);
                updateCounts();

                // Focus the title for immediate editing
                const title = newCard.querySelector('h3');
                title.focus();
                
                // Select the text nicely
                const range = document.createRange();
                range.selectNodeContents(title);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Could not create task. Please try again.');
        } finally {
            if (addBtn) addBtn.style.opacity = '1';
        }
    };

    // Top "New Task" button adds to "To Do" column
    if (newBtn && columns.length > 0) {
        newBtn.addEventListener('click', () => handleNewTask(columns[0]));
    }

    // Bottom "Add another task..." buttons
    addAnotherBtns.forEach(btn => {
        btn.addEventListener('click', () => handleNewTask(btn.parentElement));
    });

    // 4. Magic Add Logic
    const magicInput = document.getElementById('magicTaskInput');
    const magicAddBtn = document.getElementById('magicAddBtn');

    const handleMagicAdd = async () => {
        const text = magicInput.value.trim();
        if (!text) return;

        magicAddBtn.textContent = '...';
        magicAddBtn.disabled = true;

        try {
            const response = await fetch('/assistant/chat-api/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'task_parse', text: text })
            });
            const taskData = await response.json();

            // Create and inject the card
            const column = columns[0]; // Always add to To Do
            const addBtn = column.querySelector('.border-dashed');
            const tmp = document.createElement('div');
            
            const priorityColor = taskData.priority === 'high' ? 'bg-rose-500' : (taskData.priority === 'low' ? 'bg-slate-400' : 'bg-blue-500');
            const priorityText = taskData.priority === 'high' ? 'High Priority' : (taskData.priority === 'low' ? 'Low' : 'Medium');
            const priorityLabelColor = taskData.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : (taskData.priority === 'low' ? 'bg-slate-400/10 text-slate-400' : 'bg-blue-500/10 text-blue-400');

            const cardHtml = `
            <div class="p-4 rounded-xl bg-white/5 border border-white/20 hover:border-white/40 transition-all cursor-pointer group flex flex-col relative overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md" draggable="true" data-task-id="${taskData.id || ''}">
                <div class="absolute top-0 left-0 w-1 h-full ${priorityColor}"></div>
                <div class="flex justify-between items-start mb-2 pl-2">
                    <span class="px-2 py-0.5 rounded-md ${priorityLabelColor} text-[10px] font-bold uppercase tracking-wider">${priorityText}</span>
                    <button class="text-slate-500 group-hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                <h3 class="text-slate-200 text-sm font-medium pl-2 mb-1.5 leading-snug">${taskData.title}</h3>
                <p class="text-slate-500 text-xs pl-2 mb-4 line-clamp-2 leading-relaxed">${taskData.description || ''}</p>
                <div class="flex items-center justify-between pl-2 mt-4">
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ${taskData.due_date || 'No due date'} ${taskData.due_time || ''}
                    </div>
                </div>
            </div>`;

            tmp.innerHTML = cardHtml.trim();
            const newCard = tmp.firstElementChild;
            
            if (addBtn) {
                column.insertBefore(newCard, addBtn);
            } else {
                column.appendChild(newCard);
            }
            
            bindCardEvents(newCard);
            updateCounts();
            
            magicInput.value = '';
        } catch (error) {
            console.error('Magic Add failed:', error);
            alert('Magic Add failed. Please try again.');
        } finally {
            magicAddBtn.textContent = 'Add';
            magicAddBtn.disabled = false;
        }
    };

    magicAddBtn.addEventListener('click', handleMagicAdd);
    magicInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleMagicAdd();
    });
});