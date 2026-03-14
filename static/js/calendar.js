document.addEventListener('DOMContentLoaded', () => {

    let currentView = 'week'; // 'week' or 'month'

    // Node References
    const weekContainer = document.getElementById('week-view-container');
    const monthContainer = document.getElementById('month-view-container');
    
    // Inject IDs to buttons
    const viewButtons = document.querySelectorAll('.flex.bg-white\\/5.p-1.rounded-xl button');
    if (viewButtons.length >= 2) {
        const btnWeek = viewButtons[0];
        const btnMonth = viewButtons[1];
        
        btnWeek.addEventListener('click', () => {
            currentView = 'week';
            btnWeek.className = 'px-4 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium shadow-sm border border-white/5';
            btnMonth.className = 'px-4 py-1.5 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors';
            weekContainer.classList.remove('hidden');
            weekContainer.classList.add('flex');
            monthContainer.classList.add('hidden');
            monthContainer.classList.remove('flex');
            renderCalendar();
        });
        
        btnMonth.addEventListener('click', () => {
            currentView = 'month';
            btnMonth.className = 'px-4 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium shadow-sm border border-white/5';
            btnWeek.className = 'px-4 py-1.5 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors';
            monthContainer.classList.remove('hidden');
            monthContainer.classList.add('flex');
            weekContainer.classList.add('hidden');
            weekContainer.classList.remove('flex');
            renderCalendar();
        });
    }

    window.eventsData = Array.isArray(window.eventsData) ? window.eventsData : [];
    
    // -- Data Helper --
    const getWeekDays = () => {
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + 1; // Monday
        const days = [];
        for (let i = 0; i < 5; i++) {
            const next = new Date(curr.getTime());
            next.setDate(first + i);
            const iso = next.toISOString().split('T')[0];
            days.push({ 
                date: next, 
                isoDate: iso, 
                dayName: next.toLocaleDateString('en-US', {weekday: 'short'}),
                dayNum: next.getDate(),
                isToday: iso === curr.toISOString().split('T')[0]
            });
        }
        return days;
    };

    const getMonthDays = () => {
        const curr = new Date();
        const year = curr.getFullYear();
        const month = curr.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        
        // Pad previous month days to start on Sunday
        const startPadding = firstDay.getDay(); // 0 is Sunday
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({
                date: d,
                isoDate: d.toISOString().split('T')[0],
                dayNum: d.getDate(),
                isCurrentMonth: false,
                isToday: false
            });
        }
        
        // Current month days
        const todayIso = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            const iso = d.toISOString().split('T')[0];
            days.push({
                date: d,
                isoDate: iso,
                dayNum: d.getDate(),
                isCurrentMonth: true,
                isToday: iso === todayIso
            });
        }
        
        // Pad next month
        const remaining = 35 - days.length; // 5 rows of 7
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({
                date: d,
                isoDate: d.toISOString().split('T')[0],
                dayNum: d.getDate(),
                isCurrentMonth: false,
                isToday: false
            });
        }
        
        return days;
    };

    // -- Renderers --
    const renderWeekView = () => {
        const weekDays = getWeekDays();
        const daysHeader = document.getElementById('days-header');
        const hoursGrid = document.getElementById('hours-grid');

        let headerHtml = `<div class="w-16 border-r border-white/5"></div><div class="flex-1 grid grid-cols-5 text-center divide-x divide-white/5">`;
        weekDays.forEach(day => {
            const activeClass = day.isToday ? 'bg-cyan-500/5 relative' : '';
            const indicator = day.isToday ? '<div class="absolute top-0 left-0 w-full h-0.5 bg-cyan-500"></div>' : '';
            const dayColor = day.isToday ? 'text-cyan-500' : 'text-slate-500';
            const numColor = day.isToday ? 'text-white' : 'text-slate-300';
            const numWeight = day.isToday ? 'font-bold' : 'font-medium';
            headerHtml += `
                <div class="py-3 ${activeClass}">
                    ${indicator}
                    <p class="text-[10px] uppercase tracking-wider ${dayColor} font-bold mb-1">${day.dayName}</p>
                    <p class="text-xl ${numWeight} ${numColor}">${day.dayNum}</p>
                </div>`;
        });
        headerHtml += `</div>`;
        daysHeader.innerHTML = headerHtml;

        let gridHtml = '';
        for (let hour = 6; hour <= 20; hour++) {
            const displayHour = hour > 12 ? `${hour - 12} PM` : (hour === 12 ? '12 PM' : `${hour} AM`);
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            gridHtml += `
                <div class="flex h-20 border-b border-white/5 bg-transparent relative">
                    <div class="w-16 flex items-center justify-center border-r border-white/5 text-[10px] text-slate-500 font-medium bg-[#0f1117]/80">
                        ${displayHour}
                    </div>
                    <div class="flex-1 grid grid-cols-5 divide-x divide-white/5">`;
            weekDays.forEach(day => {
                gridHtml += `<div class="relative p-1 drop-zone week-zone" data-date="${day.isoDate}" data-time="${timeStr}"></div>`;
            });
            gridHtml += `</div></div>`;
        }
        hoursGrid.innerHTML = gridHtml;

        const searchQuery = (document.getElementById('searchEventInput') ? document.getElementById('searchEventInput').value.toLowerCase() : '');
        window.eventsData.forEach(event => {
            if (!event.date || !event.start_time) return;
            if (searchQuery) {
                const titleMatch = event.title && event.title.toLowerCase().includes(searchQuery);
                const descMatch = event.description && event.description.toLowerCase().includes(searchQuery);
                if (!titleMatch && !descMatch) return;
            }
            const hourPrefix = event.start_time.substring(0,2);
            const slot = document.querySelector(`.week-zone[data-date="${event.date}"][data-time="${hourPrefix}:00"]`);
            if (slot) {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
                const cIdx = (event.id || 0) % colors.length;
                const baseColor = colors[cIdx];
                
                const evBlock = document.createElement('div');
                evBlock.className = 'absolute inset-x-1 top-1 z-10';
                
                let heightClass = 'min-h-[70px]'; 
                try {
                    const h1 = parseInt(event.start_time.split(':')[0]);
                    const h2 = parseInt(event.end_time.split(':')[0]);
                    const diff = Math.max(1, h2 - h1);
                    if (diff == 2) heightClass = 'h-[150px] z-20 shadow-lg';
                    else if (diff > 2) heightClass = `h-[${diff * 80 - 10}px] z-20 shadow-lg`;
                } catch(e) {}

                evBlock.innerHTML = `
                    <div class="w-full ${heightClass} rounded-lg ${baseColor}/15 border border-${baseColor.split('-')[1]}-500/40 p-2 cursor-pointer hover:bg-white/10 transition-colors shadow-lg" data-id="${event.id}">
                        <p class="text-[10px] text-${baseColor.split('-')[1]}-400 font-bold leading-tight">${event.start_time.substring(0,5)} - ${event.end_time.substring(0,5)}</p>
                        <p class="text-xs text-white mt-0.5 font-semibold leading-snug truncate">${event.title}</p>
                        ${event.description ? `<p class="text-[10px] text-slate-400 mt-1 line-clamp-1">${event.description}</p>` : ''}
                    </div>
                `;
                slot.appendChild(evBlock);
                bindEventDrag(evBlock.querySelector('div[data-id]'));
            }
        });
    };

    const renderMonthView = () => {
        const monthDays = getMonthDays();
        const monthGrid = document.getElementById('month-grid');
        
        let gridHtml = '';
        monthDays.forEach(day => {
            const bgClass = day.isCurrentMonth ? 'bg-transparent' : 'bg-white/[0.02]';
            const textClass = day.isCurrentMonth ? (day.isToday ? 'text-cyan-400 font-bold bg-cyan-500/10 rounded-full w-6 h-6 flex items-center justify-center' : 'text-slate-300 font-medium') : 'text-slate-600 font-medium';
            
            gridHtml += `
                <div class="p-2 min-h-[100px] ${bgClass} flex flex-col drop-zone month-zone relative" data-date="${day.isoDate}">
                    <div class="text-sm mb-1 ${textClass} ml-1 mt-1">${day.dayNum}</div>
                    <div class="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide event-container"></div>
                </div>
            `;
        });
        monthGrid.innerHTML = gridHtml;

        const searchQuery = (document.getElementById('searchEventInput') ? document.getElementById('searchEventInput').value.toLowerCase() : '');
        
        // Group events by date
        const eventsByDate = {};
        window.eventsData.forEach(event => {
            if (!eventsByDate[event.date]) eventsByDate[event.date] = [];
            eventsByDate[event.date].push(event);
        });

        // Inject events
        Object.keys(eventsByDate).forEach(dateStr => {
            const slot = document.querySelector(`.month-zone[data-date="${dateStr}"] .event-container`);
            if (slot) {
                eventsByDate[dateStr].sort((a,b) => a.start_time.localeCompare(b.start_time)).forEach(event => {
                    if (searchQuery) {
                        const titleMatch = event.title && event.title.toLowerCase().includes(searchQuery);
                        const descMatch = event.description && event.description.toLowerCase().includes(searchQuery);
                        if (!titleMatch && !descMatch) return;
                    }
                    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
                    const cIdx = (event.id || 0) % colors.length;
                    const baseColor = colors[cIdx];
                    
                    const evBlock = document.createElement('div');
                    evBlock.innerHTML = `
                        <div class="w-full rounded ${baseColor}/20 border border-${baseColor.split('-')[1]}-500/30 px-1.5 py-1 cursor-pointer hover:bg-white/10 transition-colors" data-id="${event.id}">
                            <div class="flex items-center gap-1.5 overflow-hidden">
                                <div class="w-1.5 h-1.5 rounded-full ${baseColor}"></div>
                                <span class="text-[9px] text-white font-medium truncate">${event.start_time.substring(0,5)} ${event.title}</span>
                            </div>
                        </div>
                    `;
                    slot.appendChild(evBlock.firstElementChild);
                    bindEventDrag(slot.lastElementChild);
                });
            }
        });
    };

    const renderCalendar = () => {
        if (currentView === 'week') {
            renderWeekView();
        } else {
            renderMonthView();
        }
        setupDragAndDrop();
    };

    // --- Drag & Drop ---
    const bindEventDrag = (eventBlock) => {
        eventBlock.setAttribute('draggable', 'true');
        eventBlock.addEventListener('dragstart', (e) => {
            eventBlock.classList.add('opacity-50', 'scale-[0.98]');
            e.dataTransfer.effectAllowed = 'move';
            window.draggedCalendarEvent = eventBlock;
        });
        eventBlock.addEventListener('dragend', () => {
            eventBlock.classList.remove('opacity-50', 'scale-[0.98]');
            window.draggedCalendarEvent = null;
        });
    };

    const setupDragAndDrop = () => {
        document.querySelectorAll('.drop-zone').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('bg-white/10');
            });
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('bg-white/10');
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('bg-white/10');
                const eventBlock = window.draggedCalendarEvent;
                if (eventBlock) {
                    const eventId = eventBlock.getAttribute('data-id');
                    const newDate = slot.getAttribute('data-date');
                    
                    // Month drops only have date, week drops have time
                    let newTimeStr = null;
                    let newEndStr = null;
                    if (slot.classList.contains('week-zone')) {
                        newTimeStr = slot.getAttribute('data-time');
                        newEndStr = (parseInt(newTimeStr.split(':')[0]) + 1).toString().padStart(2, '0') + ':00';
                    } else {
                        // Month view drop -> Keep original time
                        const ev = window.eventsData.find(x => x.id == eventId);
                        if (ev) {
                            newTimeStr = ev.start_time;
                            newEndStr = ev.end_time;
                        }
                    }

                    if (!newTimeStr) return;
                    
                    fetch('/calendar/api/update/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: eventId,
                            date: newDate,
                            start_time: newTimeStr,
                            end_time: newEndStr
                        })
                    }).then(r => r.json()).then(res => {
                        if(res.status === 'success') {
                            const ev = window.eventsData.find(x => x.id == eventId);
                            if(ev) {
                                ev.date = newDate;
                                ev.start_time = newTimeStr;
                                ev.end_time = newEndStr;
                                renderCalendar(); // Re-render to slot into place immediately
                            }
                        } else { alert("Failed to move: " + res.message); }
                    }).catch(console.error);
                }
            });
        });
    };

    // Initial render
    renderCalendar();

    // Search Event Logic
    const searchInput = document.getElementById('searchEventInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCalendar();
        });
    }

    // Magic Event Logic
    const magicBtn = document.getElementById('magicEventBtn');
    const magicModal = document.getElementById('magicEventModal');
    const closeMagicBtn = document.getElementById('closeMagicModal');
    const generateMagicBtn = document.getElementById('generateMagicEventBtn');
    const magicInput = document.getElementById('magicEventPrompt');

    const toggleMagicModal = (show) => {
        if (show) {
            magicModal.classList.remove('hidden');
            magicModal.classList.add('flex');
            magicInput.focus();
        } else {
            magicModal.classList.add('hidden');
            magicModal.classList.remove('flex');
            magicInput.value = '';
            generateMagicBtn.innerHTML = 'Generate Event';
            generateMagicBtn.disabled = false;
        }
    };

    const handleMagicEvent = async () => {
        const text = magicInput.value.trim();
        if (!text) return;
        
        generateMagicBtn.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Thinking...</span>';
        generateMagicBtn.disabled = true;

        try {
            const response = await fetch('/assistant/chat-api/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'event_parse', text: text })
            });
            const eventData = await response.json();
            
            if (eventData.id) {
                window.eventsData.push(eventData);
                renderCalendar();
                toggleMagicModal(false);
            } else {
                alert('Magic Event failed: Could not parse properly.');
                generateMagicBtn.innerHTML = 'Generate Event';
                generateMagicBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Magic Event failed.');
            generateMagicBtn.innerHTML = 'Generate Event';
            generateMagicBtn.disabled = false;
        }
    };

    if (magicBtn) {
        magicBtn.addEventListener('click', () => toggleMagicModal(true));
    }
    if (closeMagicBtn) {
        closeMagicBtn.addEventListener('click', () => toggleMagicModal(false));
    }
    if (generateMagicBtn) {
        generateMagicBtn.addEventListener('click', handleMagicEvent);
    }
    
    // Close on escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !magicModal.classList.contains('hidden')) {
            toggleMagicModal(false);
        }
    });
});