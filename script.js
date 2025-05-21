// DOM Elements
const nameInput = document.getElementById('name-input');
const addNameBtn = document.getElementById('add-name-btn');
const namesListContainer = document.getElementById('names-list-container');
const emptyMessage = document.querySelector('.empty-message');
const scheduleItems = document.querySelectorAll('.schedule-items');
const trashPanel = document.getElementById('trash-panel');
const addScheduleBtn = document.getElementById('add-schedule-btn');
const scheduleContainer = document.querySelector('.schedule-container');
let allDropContainers = document.querySelectorAll('[data-container]');

// Touch support variables
let touchDragging = false;
let draggedElement = null;
let draggedElementClone = null;
let initialTouchPos = { x: 0, y: 0 };
let lastTouchPos = { x: 0, y: 0 };
let isScrolling = false;
let scrollStartTime = 0;
let scrollThreshold = 10; // Minimum pixels to consider a scroll vs a drag
let scrollTimeThreshold = 300; // Milliseconds to wait before allowing drag after scroll
let touchStartedOnNamePanel = false;

// State
let names = [];
let assignments = {
    duty: [],
    standby: [],
    rest: [],
    home: []
};
let hourlyAssignments = {
    duty: Array(24).fill(null),
    standby: Array(24).fill(null),
    rest: Array(24).fill(null),
    home: Array(24).fill(null)
};
let customPanelCounter = 1;

// Initialize app
function init() {
    // Get DOM elements
    nameInput = document.getElementById('name-input');
    namesListContainer = document.getElementById('names-list-container');
    scheduleContainer = document.querySelector('.schedule-container');
    addScheduleBtn = document.getElementById('add-schedule-btn');
    emptyMessage = document.querySelector('.empty-schedule-message');
    
    // Set up event listeners
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addName();
        }
    });
    
    document.getElementById('add-name-btn').addEventListener('click', addName);
    addScheduleBtn.addEventListener('click', addSchedulePanel);
    
    // Initialize default panels if they don't exist in hourlyAssignments
    if (!hourlyAssignments.duty) hourlyAssignments.duty = Array(24).fill(null);
    if (!hourlyAssignments.standby) hourlyAssignments.standby = Array(24).fill(null);
    if (!hourlyAssignments.rest) hourlyAssignments.rest = Array(24).fill(null);
    if (!hourlyAssignments.home) hourlyAssignments.home = Array(24).fill(null);
    
    // Load data from local storage
    loadFromLocalStorage();
    
    // Render UI
    renderNamePanels();
    renderSchedulePanels();
    updateEmptyScheduleMessage();
    
    // Set up drag and drop
    setupDragAndDrop();
    
    // Set up horizontal swipe scrolling for names list
    setupNamesListScrolling();
    
    // Add event listeners for deleting schedule panels
    setupDeletePanelListeners();
}

// Add a new name
function addName() {
    const name = nameInput.value.trim();
    
    // Validate input
    if (name === '') {
        alert('Please enter a name');
        return;
    }
    
    // Check for duplicates in the names list
    if (names.includes(name)) {
        alert('This name already exists');
        return;
    }
    
    // Check for duplicates in all schedule panels
    let nameExists = false;
    
    // Check in regular assignments
    for (const panelId in assignments) {
        if (assignments[panelId].includes(name)) {
            nameExists = true;
            break;
        }
    }
    
    // Check in hourly assignments
    if (!nameExists) {
        for (const panelId in hourlyAssignments) {
            for (let hour = 0; hour < 24; hour++) {
                if (hourlyAssignments[panelId][hour] === name) {
                    nameExists = true;
                    break;
                }
            }
            if (nameExists) break;
        }
    }
    
    if (nameExists) {
        alert('This name already exists');
        return;
    }
    
    // Add name to array
    names.push(name);
    
    // Save to local storage
    saveToLocalStorage();
    
    // Update UI
    renderNamePanels();
    
    // Clear input
    nameInput.value = '';
    nameInput.focus();
}

// Remove a name
function removeName(name, container) {
    if (container === 'names') {
        // Remove from names array
        names = names.filter(n => n !== name);
    } else if (assignments[container]) {
        // Remove from assignments
        assignments[container] = assignments[container].filter(n => n !== name);
    }
    
    // Save to local storage
    saveToLocalStorage();
    
    // Update UI
    renderNamePanels();
    renderSchedulePanels();
}




// Render the name panels in the left sidebar
function renderNamePanels() {
    // Clear existing panels
    namesListContainer.innerHTML = '';
    
    // Add empty message if there are no names
    if (names.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No names added yet';
        namesListContainer.appendChild(emptyMessage);
        return;
    }
    
    // Create panels for each name
    names.forEach(name => {
        createNamePanel(name, 'names', namesListContainer);
    });
}

// Render all schedule panels
function renderSchedulePanels() {
    // Render each schedule panel
    for (const panelId of Object.keys(hourlyAssignments)) {
        const scheduleItemsContainer = document.querySelector(`#${panelId}-panel .schedule-items`);
        
        // Skip if the container doesn't exist
        if (!scheduleItemsContainer) continue;
        
        // Get all hour rows
        const hourRows = scheduleItemsContainer.querySelectorAll('.hour-row');
        
        // For each hour, check if there's an assignment and render it
        hourRows.forEach(hourRow => {
            const hour = hourRow.dataset.hour;
            const nameSlot = hourRow.querySelector('.name-slot');
            
            // Clear the name slot
            nameSlot.innerHTML = '';
            nameSlot.classList.remove('has-name');
            
            // Check if there's a name assigned to this hour
            const assignedName = hourlyAssignments[panelId][hour];
            if (assignedName) {
                // Add the has-name class
                nameSlot.classList.add('has-name');
                
                // Create a name panel
                createNamePanel(assignedName, `${panelId}-${hour}`, nameSlot);
            }
        });
    }
    
    // Update the empty schedule message
    updateEmptyScheduleMessage();
}

// Create a name panel
function createNamePanel(name, container, parentElement) {
    const panel = document.createElement('div');
    panel.className = 'name-panel';
    panel.id = `panel-${container}-${name}`;
    panel.draggable = true;
    panel.dataset.name = name;
    panel.dataset.container = container;
    
    // Add drag event listeners for desktop
    panel.addEventListener('dragstart', handleDragStart);
    panel.addEventListener('dragend', handleDragEnd);
    
    // Add touch event listeners for mobile
    panel.addEventListener('touchstart', handleTouchStart, { passive: false });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    panel.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    const heading = document.createElement('h3');
    heading.textContent = name;
    
    panel.appendChild(heading);
    
    parentElement.appendChild(panel);
}

// Save data to local storage
function saveToLocalStorage() {
    localStorage.setItem('scheduleAppNames', JSON.stringify(names));
    localStorage.setItem('scheduleAppAssignments', JSON.stringify(assignments));
    localStorage.setItem('scheduleAppHourlyAssignments', JSON.stringify(hourlyAssignments));
    localStorage.setItem('scheduleAppCustomPanelCounter', customPanelCounter.toString());
}

// Load data from local storage
function loadFromLocalStorage() {
    const savedNames = localStorage.getItem('scheduleAppNames');
    const savedAssignments = localStorage.getItem('scheduleAppAssignments');
    const savedHourlyAssignments = localStorage.getItem('scheduleAppHourlyAssignments');
    const savedCounter = localStorage.getItem('scheduleAppCustomPanelCounter');
    
    if (savedNames) {
        names = JSON.parse(savedNames);
    }
    
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
    }
    
    if (savedHourlyAssignments) {
        hourlyAssignments = JSON.parse(savedHourlyAssignments);
    }
    
    if (savedCounter) {
        customPanelCounter = parseInt(savedCounter, 10);
    }
    
    // Recreate any saved panels that don't exist in the DOM
    recreateSavedPanels();
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    // Add event listeners to all drop containers
    allDropContainers.forEach(container => {
        // Desktop drag and drop
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
    
    // Prevent scrolling when touching name panels
    document.addEventListener('touchmove', function(e) {
        if (touchDragging) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Handle drag start
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', JSON.stringify({
        name: this.dataset.name,
        container: this.dataset.container
    }));
    
    this.classList.add('dragging');
    
    // For iOS Safari compatibility
    if (e.dataTransfer.items) {
        e.dataTransfer.items.add('', 'text/plain');
    }
}

// Handle drag end
function handleDragEnd() {
    this.classList.remove('dragging');
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave() {
    this.classList.remove('drag-over');
}

// Handle drop for desktop drag and drop
function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    // Get the dragged item data
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { name, container: sourceContainer } = data;
    const targetContainer = this.dataset.container;
    
    // Process the drop using the shared function
    processDrop(name, sourceContainer, targetContainer);
}

// Touch event handlers for mobile drag and drop

// Handle touch start on a name panel
function handleTouchStart(e) {
    // If we're already scrolling, don't allow drag to start
    if (isScrolling) {
        return;
    }
    
    // Store the initial touch position
    const touch = e.touches[0];
    initialTouchPos.x = touch.clientX;
    initialTouchPos.y = touch.clientY;
    lastTouchPos.x = touch.clientX;
    lastTouchPos.y = touch.clientY;
    
    // Get the name panel element
    draggedElement = e.currentTarget;
    touchStartedOnNamePanel = true;
}

function startTouchDrag(e) {
    touchDragging = true;
    draggedElementClone = draggedElement.cloneNode(true);
    draggedElementClone.classList.add('dragging');
    draggedElementClone.style.position = 'fixed';
    draggedElementClone.style.top = `${e.touches[0].clientY - draggedElement.offsetHeight / 2}px`;
    draggedElementClone.style.left = `${e.touches[0].clientX - draggedElement.offsetWidth / 2}px`;
    draggedElementClone.style.width = `${draggedElement.offsetWidth}px`;
    draggedElementClone.style.zIndex = '1000';
    draggedElementClone.style.opacity = '0.8';
    draggedElementClone.style.pointerEvents = 'none';
    document.body.appendChild(draggedElementClone);
    
    // Make original semi-transparent
    draggedElement.style.opacity = '0.4';
}

// Handle touch move on a name panel
function handleTouchMove(e) {
    // If we're already scrolling and not dragging, don't start dragging
    if (isScrolling && !touchDragging) return;
    
    // Get the current touch position
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // If we're already dragging, continue the drag operation regardless of where we are
    if (touchDragging) {
        // Prevent default to avoid page scrolling or other touch behaviors
        e.preventDefault();
        
        // Update the position
        lastTouchPos.x = currentX;
        lastTouchPos.y = currentY;
        
        // Move the clone
        if (draggedElementClone) {
            draggedElementClone.style.top = `${currentY - draggedElementClone.offsetHeight / 2}px`;
            draggedElementClone.style.left = `${currentX - draggedElementClone.offsetWidth / 2}px`;
        }
        
        // Highlight the container under the touch point
        const elementUnderTouch = document.elementFromPoint(currentX, currentY);
        
        // Find the container element
        allDropContainers.forEach(container => {
            if (container.contains(elementUnderTouch)) {
                container.classList.add('drag-over');
            } else {
                container.classList.remove('drag-over');
            }
        });
        
        return;
    }
    
    // If we're not dragging yet, determine whether to start dragging or scrolling
    
    // Calculate the distance moved
    const deltaX = Math.abs(currentX - initialTouchPos.x);
    const deltaY = Math.abs(currentY - initialTouchPos.y);
    
    // If this is a horizontal movement in the names list container, prioritize scrolling
    if (draggedElement.closest('#names-list-container') && 
        deltaX > deltaY && 
        deltaX > scrollThreshold) {
        
        // This is a horizontal swipe in the names list - initiate scrolling
        isScrolling = true;
        
        // Let the container's touch move handler take over
        return;
    }
    
    // If we haven't started dragging yet and moved enough distance vertically
    // or we're not in the names list, start dragging
    if (!touchDragging && (deltaY > scrollThreshold || !draggedElement.closest('#names-list-container'))) {
        startTouchDrag(e);
    }
}

// Handle touch end on a container
function handleContainerTouchEnd(e) {
    if (!touchDragging) return;
    
    const container = this;
    
    // Check if the touch ended over this container
    if (container.classList.contains('drag-over')) {
        // Get the data from the dragged element
        const name = draggedElement.dataset.name;
        const sourceContainer = draggedElement.dataset.container;
        const targetContainer = container.dataset.container;
        
        // Process the drop
        processDrop(name, sourceContainer, targetContainer);
        
        // Clean up
        container.classList.remove('drag-over');
    }
}

// Handle touch end (drop)
function handleTouchEnd(e) {
    // Reset the touch started flag
    touchStartedOnNamePanel = false;
    
    // Always reset scrolling state when touch ends
    isScrolling = false;
    
    if (!touchDragging) return;
    
    // Get the element under the touch point
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Find the container element
    let containerElement = null;
    let currentElement = dropTarget;
    
    // Traverse up the DOM to find a container
    while (currentElement && !containerElement) {
        if (currentElement.dataset && currentElement.dataset.container) {
            containerElement = currentElement;
        } else {
            currentElement = currentElement.parentElement;
        }
    }
    
    // If we found a valid container, process the drop
    if (containerElement && draggedElement) {
        const name = draggedElement.dataset.name;
        const sourceContainer = draggedElement.dataset.container;
        const targetContainer = containerElement.dataset.container;
        
        // Process the drop
        processDrop(name, sourceContainer, targetContainer);
    }
    
    // Clean up
    if (draggedElementClone) {
        document.body.removeChild(draggedElementClone);
        draggedElementClone = null;
    }
    
    if (draggedElement) {
        draggedElement.style.opacity = '1';
    }
    
    // Remove all drag-over highlights
    allDropContainers.forEach(container => {
        container.classList.remove('drag-over');
    });
    
    touchDragging = false;
    draggedElement = null;
}

// Process a drop action (shared between mouse and touch)
function processDrop(name, sourceContainer, targetContainer) {
    // Don't do anything if dropped in the same container
    if (sourceContainer === targetContainer) {
        return;
    }
    
    // If dropped in trash, delete the name completely
    if (targetContainer === 'trash') {
        // Remove from source container
        if (sourceContainer === 'names') {
            names = names.filter(n => n !== name);
        } else if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const [panelId, hour] = sourceContainer.split('-');
            hourlyAssignments[panelId][hour] = null;
        } else {
            assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
        }
        
        // Save to local storage
        saveToLocalStorage();
        
        // Update UI
        renderNamePanels();
        renderSchedulePanels();
        return;
    }
    
    // Check if this is an hourly slot drop
    if (targetContainer.includes('-')) {
        const [panelId, hour] = targetContainer.split('-');
        
        // If there's already a name in this hour slot, move it back to the names list
        if (hourlyAssignments[panelId][hour]) {
            names.push(hourlyAssignments[panelId][hour]);
        }
        
        // Remove from source container
        if (sourceContainer === 'names') {
            names = names.filter(n => n !== name);
        } else if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const [sourcePanelId, sourceHour] = sourceContainer.split('-');
            hourlyAssignments[sourcePanelId][sourceHour] = null;
        } else {
            assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
        }
        
        // Assign to the hour slot
        hourlyAssignments[panelId][hour] = name;
        
        // Save to local storage
        saveToLocalStorage();
        
        // Update UI
        renderNamePanels();
        renderSchedulePanels();
        return;
    }
    
    // Standard container drop (not hourly)
    
    // Remove from source container
    if (sourceContainer === 'names') {
        names = names.filter(n => n !== name);
    } else if (sourceContainer.includes('-')) {
        // This is an hourly slot
        const [panelId, hour] = sourceContainer.split('-');
        hourlyAssignments[panelId][hour] = null;
    } else {
        assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
    }
    
    // Add to target container
    if (targetContainer === 'names') {
        names.push(name);
    } else {
        assignments[targetContainer].push(name);
    }
    
    // Save to local storage
    saveToLocalStorage();
    
    // Update UI
    renderNamePanels();
    renderSchedulePanels();
}

// Set up horizontal swipe scrolling for names list
function setupNamesListScrolling() {
    // Add touch event listeners to the names list container
    namesListContainer.addEventListener('touchstart', handleNamesListTouchStart, { passive: false });
    namesListContainer.addEventListener('touchmove', handleNamesListTouchMove, { passive: false });
    namesListContainer.addEventListener('touchend', handleNamesListTouchEnd, { passive: false });
    
    // Add mouse wheel event for horizontal scrolling on desktop
    namesListContainer.addEventListener('wheel', handleNamesListWheel, { passive: false });
    
    // Add mouse drag scrolling for desktop
    let isMouseDown = false;
    let startX;
    let scrollLeft;
    
    namesListContainer.addEventListener('mousedown', (e) => {
        // Only handle direct clicks on the container, not on name panels
        if (e.target === namesListContainer) {
            isMouseDown = true;
            namesListContainer.classList.add('active-scroll');
            startX = e.pageX - namesListContainer.offsetLeft;
            scrollLeft = namesListContainer.scrollLeft;
            e.preventDefault();
        }
    });
    
    namesListContainer.addEventListener('mouseleave', () => {
        isMouseDown = false;
        namesListContainer.classList.remove('active-scroll');
    });
    
    namesListContainer.addEventListener('mouseup', () => {
        isMouseDown = false;
        namesListContainer.classList.remove('active-scroll');
    });
    
    namesListContainer.addEventListener('mousemove', (e) => {
        // Don't scroll if we're dragging a name panel
        if (!isMouseDown || touchDragging) return;
        e.preventDefault();
        const x = e.pageX - namesListContainer.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        namesListContainer.scrollLeft = scrollLeft - walk;
    });
}

// Handle touch start on the names list container
function handleNamesListTouchStart(e) {
    // Store the initial touch position for all touches in the names list container
    // even if they started on a name panel
    const touch = e.touches[0];
    initialTouchPos.x = touch.clientX;
    initialTouchPos.y = touch.clientY;
    
    // Reset scrolling state
    isScrolling = false;
    scrollStartTime = Date.now();
}

// Handle touch move on the names list container
function handleNamesListTouchMove(e) {
    // If we're already dragging a name panel, don't allow scrolling
    if (touchDragging) {
        return;
    }
    
    // Get the current touch position
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // Calculate the distance moved
    const deltaX = initialTouchPos.x - currentX;
    const deltaY = Math.abs(initialTouchPos.y - currentY);
    const absDeltaX = Math.abs(deltaX);
    
    // If we're already scrolling or horizontal movement is significant and greater than vertical
    if (isScrolling || (absDeltaX > scrollThreshold && absDeltaX > deltaY)) {
        // Prevent default to avoid page scrolling
        e.preventDefault();
        
        // Set scrolling state
        isScrolling = true;
        
        // If touch started on a name panel and we haven't started dragging yet,
        // prioritize scrolling over dragging
        if (touchStartedOnNamePanel && !touchDragging) {
            // Cancel any potential drag operation
            draggedElement = null;
        }
        
        // Scroll the container
        namesListContainer.scrollLeft += deltaX;
        
        // Update the initial position for the next move
        initialTouchPos.x = currentX;
    }
}

// Handle touch end on the names list container
function handleNamesListTouchEnd(e) {
    // If we were scrolling, prevent drag events for a short time
    if (isScrolling) {
        setTimeout(() => {
            isScrolling = false;
        }, scrollTimeThreshold);
    }
}

// Handle mouse wheel events for horizontal scrolling
function handleNamesListWheel(e) {
    // Don't scroll if we're dragging a name panel
    if (touchDragging) {
        return;
    }
    
    // Prevent the default vertical scroll
    e.preventDefault();
    
    // Scroll horizontally instead of vertically
    namesListContainer.scrollLeft += e.deltaY;
}

// Add a new schedule panel
function addSchedulePanel() {
    const panelName = prompt('Enter a name for the new schedule panel:');
    if (!panelName || panelName.trim() === '') {
        return;
    }
    
    if (isPanelNameTaken(panelName.trim())) {
        alert('A panel with this name already exists. Please choose a different name.');
        return;
    }
    
    // Generate a unique ID for the panel
    const panelId = `panel-${customPanelCounter++}`;
    
    // Create a new panel element
    const panelElement = document.createElement('div');
    panelElement.className = 'schedule-panel';
    panelElement.id = `${panelId}-panel`;
    panelElement.dataset.container = panelId;
    
    // Create panel header with title and delete button
    const panelHeader = document.createElement('div');
    panelHeader.className = 'panel-header';
    
    const panelTitle = document.createElement('h2');
    panelTitle.textContent = panelName.trim();
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'panel-buttons';
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-panel-btn';
    editButton.dataset.panel = panelId;
    editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21h-.001z" fill="currentColor"/>
        </svg>
    `;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-panel-btn';
    deleteButton.dataset.panel = panelId;
    deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/>
        </svg>
    `;
    
    // Create the container for schedule items
    const scheduleItemsContainer = document.createElement('div');
    scheduleItemsContainer.className = 'schedule-items';
    
    // Create hourly rows (from 12 AM to 11 PM)
    for (let hour = 0; hour < 24; hour++) {
        const hourRow = document.createElement('div');
        hourRow.className = 'hour-row';
        hourRow.dataset.hour = hour;
        hourRow.dataset.container = `${panelId}-${hour}`;
        
        // Create the hour label
        const hourLabel = document.createElement('div');
        hourLabel.className = 'hour-label';
        hourLabel.textContent = formatHour(hour);
        
        // Create the slot for the name
        const nameSlot = document.createElement('div');
        nameSlot.className = 'name-slot';
        
        // Add the elements to the row
        hourRow.appendChild(hourLabel);
        hourRow.appendChild(nameSlot);
        
        // Add the row to the schedule items container
        scheduleItemsContainer.appendChild(hourRow);
    }
    
    // Assemble the panel
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(buttonContainer);
    panelElement.appendChild(panelHeader);
    panelElement.appendChild(scheduleItemsContainer);
    
    // Add the panel to the schedule container
    scheduleContainer.appendChild(panelElement);
    
    // Initialize the panel's assignments
    assignments[panelId] = [];
    
    // Initialize the panel's hourly assignments
    hourlyAssignments[panelId] = Array(24).fill(null);
    
    // Add event listeners for the buttons
    deleteButton.addEventListener('click', () => deleteSchedulePanel(panelId));
    editButton.addEventListener('click', () => editPanelName(panelId));
    
    // Update drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
    
    // Update the empty schedule message
    updateEmptyScheduleMessage();
    
    // Save to local storage
    saveToLocalStorage();
}

// Delete a schedule panel
function deleteSchedulePanel(panelId) {
    // Move all names from the panel back to the names list
    if (assignments[panelId] && assignments[panelId].length > 0) {
        // Add all names back to the names list
        names = [...names, ...assignments[panelId]];
        
        // Clear the panel's assignments
        assignments[panelId] = [];
    }
    
    // Move all hourly assignments back to the names list
    if (hourlyAssignments[panelId]) {
        // For each hour, check if there's a name assigned
        for (let hour = 0; hour < 24; hour++) {
            const assignedName = hourlyAssignments[panelId][hour];
            if (assignedName) {
                // Add the name back to the names list
                names.push(assignedName);
            }
        }
        
        // Remove the panel's hourly assignments
        delete hourlyAssignments[panelId];
    }
    
    // Remove the panel from the DOM
    const panelElement = document.getElementById(`${panelId}-panel`);
    if (panelElement) {
        scheduleContainer.removeChild(panelElement);
    }
    
    // Remove the panel from assignments
    delete assignments[panelId];
    
    // Update drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
    
    // Update the UI
    renderNamePanels();
    updateEmptyScheduleMessage();
    
    // Save to local storage
    saveToLocalStorage();
}

// Set up event listeners for panel buttons
function setupDeletePanelListeners() {
    // Set up delete button listeners
    document.querySelectorAll('.delete-panel-btn').forEach(button => {
        const panelId = button.dataset.panel;
        button.addEventListener('click', () => deleteSchedulePanel(panelId));
    });
}

// Set up event listeners for edit panel buttons
function setupEditPanelListeners() {
    document.querySelectorAll('.edit-panel-btn').forEach(button => {
        const panelId = button.dataset.panel;
        button.addEventListener('click', () => editPanelName(panelId));
    });
}

// Update the empty schedule message based on whether there are any panels
function updateEmptyScheduleMessage() {
    const emptyMessage = document.querySelector('.empty-schedule-message');
    if (!emptyMessage) return;
    
    // Check if there are any schedule panels
    const hasPanels = document.querySelectorAll('.schedule-panel').length > 0;
    
    // Show or hide the empty message
    if (hasPanels) {
        emptyMessage.style.display = 'none';
    } else {
        emptyMessage.style.display = 'block';
    }
}

// Format hour for display (0-23 to 12 AM/PM format)
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

// Helper function to check if a panel name is already taken
function isPanelNameTaken(name) {
    // Get all panel titles
    const panelTitles = Array.from(document.querySelectorAll('.panel-header h2'));
    
    // Check if any panel has this name
    return panelTitles.some(title => title.textContent.toLowerCase() === name.toLowerCase());
}

// Edit a panel's name
function editPanelName(panelId) {
    // Find the panel title element
    const panelElement = document.getElementById(`${panelId}-panel`);
    if (!panelElement) return;
    
    const panelTitle = panelElement.querySelector('.panel-header h2');
    if (!panelTitle) return;
    
    // Get the current name
    const currentName = panelTitle.textContent;
    
    // Prompt for a new name
    const newName = prompt('Enter a new name for this panel:', currentName);
    
    // If the user cancels or enters an empty name, don't change anything
    if (!newName || newName.trim() === '') {
        return;
    }
    
    // If the name hasn't changed, don't do anything
    if (newName.trim() === currentName) {
        return;
    }
    
    // Check if the new name is already taken by another panel
    if (isPanelNameTaken(newName.trim())) {
        alert('A panel with this name already exists. Please choose a different name.');
        return;
    }
    
    // Update the panel title
    panelTitle.textContent = newName.trim();
    panelTitle.dataset.panelName = newName.trim();
    
    // Save to local storage
    saveToLocalStorage();
}

// Format hour to 12-hour format with AM/PM
function formatHour(hour) {
    if (hour === 0) {
        return '12 AM';
    } else if (hour < 12) {
        return `${hour} AM`;
    } else if (hour === 12) {
        return '12 PM';
    } else {
        return `${hour - 12} PM`;
    }
}

// Recreate saved panels from localStorage
function recreateSavedPanels() {
    // Get all panel IDs from hourlyAssignments
    const panelIds = Object.keys(hourlyAssignments);
    
    // For each panel ID, check if it exists in the DOM
    panelIds.forEach(panelId => {
        // Skip if the panel already exists
        if (document.getElementById(`${panelId}-panel`)) return;
        
        // Create the panel
        createSavedPanel(panelId);
    });
}

// Create a panel from saved data
function createSavedPanel(panelId) {
    // Extract panel number for the title (if it's a custom panel)
    let panelName = panelId;
    if (panelId.startsWith('panel-')) {
        const panelNumber = panelId.split('-')[1];
        panelName = `Panel ${panelNumber}`;
    }
    
    // Create a new panel element
    const panelElement = document.createElement('div');
    panelElement.className = 'schedule-panel';
    panelElement.id = `${panelId}-panel`;
    panelElement.dataset.container = panelId;
    
    // Create panel header with title, edit and delete buttons
    const panelHeader = document.createElement('div');
    panelHeader.className = 'panel-header';
    
    const panelTitle = document.createElement('h2');
    panelTitle.textContent = panelName;
    panelTitle.dataset.panelName = panelName;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'panel-buttons';
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-panel-btn';
    editButton.dataset.panel = panelId;
    editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21h-.001z" fill="currentColor"/>
        </svg>
    `;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-panel-btn';
    deleteButton.dataset.panel = panelId;
    deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" fill="currentColor"/>
        </svg>
    `;
    
    // Create the container for schedule items
    const scheduleItemsContainer = document.createElement('div');
    scheduleItemsContainer.className = 'schedule-items';
    
    // Create hourly rows (from 12 AM to 11 PM)
    for (let hour = 0; hour < 24; hour++) {
        const hourRow = document.createElement('div');
        hourRow.className = 'hour-row';
        hourRow.dataset.hour = hour;
        hourRow.dataset.container = `${panelId}-${hour}`;
        
        // Create the hour label
        const hourLabel = document.createElement('div');
        hourLabel.className = 'hour-label';
        hourLabel.textContent = formatHour(hour);
        
        // Create the slot for the name
        const nameSlot = document.createElement('div');
        nameSlot.className = 'name-slot';
        
        // Add the elements to the row
        hourRow.appendChild(hourLabel);
        hourRow.appendChild(nameSlot);
        
        // Add the row to the schedule items container
        scheduleItemsContainer.appendChild(hourRow);
    }
    
    // Assemble the panel
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(buttonContainer);
    panelElement.appendChild(panelHeader);
    panelElement.appendChild(scheduleItemsContainer);
    
    // Add the panel to the schedule container
    scheduleContainer.appendChild(panelElement);
    
    // Add event listeners for the buttons
    deleteButton.addEventListener('click', () => deleteSchedulePanel(panelId));
    editButton.addEventListener('click', () => editPanelName(panelId));
    
    // Update drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
