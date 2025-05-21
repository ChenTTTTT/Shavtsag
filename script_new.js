// Global variables for state
let names = [];
let assignments = {};
let hourlyAssignments = {};
let customPanelCounter = 1;
let draggedName = null;
let dragSourceContainer = null;
let allDropContainers;

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Get DOM elements
    const nameInput = document.getElementById('name-input');
    const addNameBtn = document.getElementById('add-name-btn');
    const namesListContainer = document.getElementById('names-list-container');
    const scheduleContainer = document.querySelector('.schedule-container');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const emptyMessage = document.querySelector('.empty-schedule-message');
    
    console.log('nameInput:', nameInput);
    console.log('addNameBtn:', addNameBtn);
    console.log('namesListContainer:', namesListContainer);
    console.log('scheduleContainer:', scheduleContainer);
    console.log('addScheduleBtn:', addScheduleBtn);
    console.log('emptyMessage:', emptyMessage);
    
    // Load data from localStorage
    loadFromLocalStorage();
    
    // Clean up any invalid panel entries
    cleanupHourlyAssignments();
    
    // Set up event listeners
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('Enter key pressed');
            addName();
        }
    });
    
    addNameBtn.addEventListener('click', function() {
        console.log('Add name button clicked');
        addName();
    });
    
    addScheduleBtn.addEventListener('click', function() {
        console.log('Add schedule button clicked');
        addSchedulePanel();
    });
    
    // Set up mutation observer to detect new panels
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                console.log('DOM changed, updating drop containers');
                // Update drop containers and setup drag and drop again
                allDropContainers = document.querySelectorAll('[data-container]');
                setupDragAndDrop();
            }
        });
    });
    
    // Start observing the schedule container for changes
    observer.observe(scheduleContainer, { childList: true, subtree: true });
    
    // Update drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
    
    // Render initial UI
    renderNamePanels();
    renderSchedulePanels();
    updateEmptyScheduleMessage();
    
    // Set up drag and drop
    setupDragAndDrop();
});

// Format hour for display (0-23 to 12 AM/PM format)
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

// Add a new name
function addName() {
    console.log('addName function called');
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    console.log('Name to add:', name);
    
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

// Create a name panel element
function createNamePanel(name, container, parentElement) {
    console.log('Creating name panel:', name, 'in container:', container);
    
    const panel = document.createElement('div');
    panel.className = 'name-panel';
    panel.textContent = name;
    panel.dataset.name = name;
    panel.dataset.container = container;
    
    // Make draggable
    panel.draggable = true;
    panel.setAttribute('draggable', 'true');
    
    // Add event listeners for drag and drop
    panel.addEventListener('dragstart', handleDragStart);
    panel.addEventListener('touchstart', handleTouchStart);
    
    // Add to parent
    parentElement.appendChild(panel);
    
    console.log('Created panel element:', panel);
    
    return panel;
}

// Render all name panels in the names list
function renderNamePanels() {
    const namesListContainer = document.getElementById('names-list-container');
    
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
    console.log('Rendering schedule panels');
    
    // Clean up any invalid panel entries
    cleanupHourlyAssignments();
    
    console.log('hourlyAssignments after cleanup:', hourlyAssignments);
    
    // Render each schedule panel
    for (const panelId of Object.keys(hourlyAssignments)) {
        console.log('Rendering panel:', panelId);
        
        const panelElement = document.getElementById(`${panelId}-panel`);
        if (!panelElement) {
            console.log('Panel element not found:', panelId);
            continue;
        }
        
        const scheduleItemsContainer = panelElement.querySelector('.schedule-items');
        if (!scheduleItemsContainer) {
            console.log('Schedule items container not found for panel:', panelId);
            continue;
        }
        
        // Get all hour rows
        const hourRows = scheduleItemsContainer.querySelectorAll('.hour-row');
        console.log('Found', hourRows.length, 'hour rows for panel:', panelId);
        
        // Make sure hourlyAssignments for this panel exists
        if (!hourlyAssignments[panelId]) {
            console.log('Creating hourlyAssignments for panel:', panelId);
            hourlyAssignments[panelId] = Array(24).fill(null);
        }
        
        // For each hour, check if there's an assignment and render it
        hourRows.forEach(hourRow => {
            const hour = hourRow.dataset.hour;
            const nameSlot = hourRow.querySelector('.name-slot');
            
            if (!nameSlot) {
                console.log('Name slot not found for hour:', hour);
                return;
            }
            
            // Clear the name slot
            nameSlot.innerHTML = '';
            nameSlot.classList.remove('has-name');
            
            // Check if there's a name assigned to this hour
            const assignedName = hourlyAssignments[panelId][hour];
            if (assignedName) {
                console.log('Found assigned name for panel', panelId, 'hour', hour, ':', assignedName);
                
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

// Update the empty schedule message
function updateEmptyScheduleMessage() {
    const emptyMessage = document.querySelector('.empty-schedule-message');
    
    // Check if there are any schedule panels
    const hasPanels = document.querySelectorAll('.schedule-panel').length > 0;
    
    // Show or hide the empty message
    if (hasPanels) {
        emptyMessage.style.display = 'none';
    } else {
        emptyMessage.style.display = 'block';
    }
}

// Save data to local storage
function saveToLocalStorage() {
    console.log('Saving to localStorage');
    console.log('Names:', names);
    console.log('Assignments:', assignments);
    console.log('HourlyAssignments:', hourlyAssignments);
    console.log('CustomPanelCounter:', customPanelCounter);
    
    // Save panel names
    const panelNames = {};
    document.querySelectorAll('.panel-header h2').forEach(titleElement => {
        const panelId = titleElement.closest('.schedule-panel').dataset.container;
        if (panelId) {
            panelNames[panelId] = titleElement.textContent;
        }
    });
    console.log('Panel names:', panelNames);
    
    localStorage.setItem('scheduleAppNames', JSON.stringify(names));
    localStorage.setItem('scheduleAppAssignments', JSON.stringify(assignments));
    localStorage.setItem('scheduleAppHourlyAssignments', JSON.stringify(hourlyAssignments));
    localStorage.setItem('scheduleAppCustomPanelCounter', customPanelCounter.toString());
    localStorage.setItem('scheduleAppPanelNames', JSON.stringify(panelNames));
}

// Clean up invalid panel entries in hourlyAssignments
function cleanupHourlyAssignments() {
console.log('Cleaning up hourlyAssignments');

// Get all valid panel IDs (panels that exist in the DOM)
const validPanelIds = [];
document.querySelectorAll('.schedule-panel').forEach(panel => {
    const id = panel.id.replace('-panel', '');
    if (id.startsWith('panel-')) {
        validPanelIds.push(id);
    }
});

console.log('Valid panel IDs:', validPanelIds);

// Create a new hourlyAssignments object with only valid panels
const cleanedHourlyAssignments = {};

// Copy only valid panels to the cleaned object
validPanelIds.forEach(panelId => {
    if (hourlyAssignments[panelId]) {
        cleanedHourlyAssignments[panelId] = hourlyAssignments[panelId];
    } else {
        // Initialize with empty array if not exists
        cleanedHourlyAssignments[panelId] = Array(24).fill(null);
    }
});

// Check for any panels with incorrect IDs (without 'panel-' prefix)
for (const key in hourlyAssignments) {
    if (!key.startsWith('panel-') && hourlyAssignments[key]) {
        console.log('Found invalid panel ID:', key);
        // If there's a panel with just 'panel' as ID, migrate its data to a proper panel ID
        if (validPanelIds.length > 0) {
            const firstValidPanel = validPanelIds[0];
            console.log('Migrating data from invalid panel to:', firstValidPanel);

            // Merge the data, keeping the valid panel's data if there's a conflict
            for (let i = 0; i < 24; i++) {
                if (hourlyAssignments[key][i] && !cleanedHourlyAssignments[firstValidPanel][i]) {
                    cleanedHourlyAssignments[firstValidPanel][i] = hourlyAssignments[key][i];
                }
            }
        }
    }
}

hourlyAssignments = cleanedHourlyAssignments;
console.log('Cleaned hourlyAssignments:', hourlyAssignments);
}

// Load data from local storage
function loadFromLocalStorage() {
    console.log('Loading from localStorage');
    
    const savedNames = localStorage.getItem('scheduleAppNames');
    const savedAssignments = localStorage.getItem('scheduleAppAssignments');
    const savedHourlyAssignments = localStorage.getItem('scheduleAppHourlyAssignments');
    const savedCounter = localStorage.getItem('scheduleAppCustomPanelCounter');
    const savedPanelNames = localStorage.getItem('scheduleAppPanelNames');
    
    if (savedNames) {
        names = JSON.parse(savedNames);
        console.log('Loaded names:', names);
    }
    
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
        console.log('Loaded assignments:', assignments);
    }
    
    if (savedHourlyAssignments) {
        hourlyAssignments = JSON.parse(savedHourlyAssignments);
        console.log('Loaded hourlyAssignments:', hourlyAssignments);
    }
    
    if (savedCounter) {
        customPanelCounter = parseInt(savedCounter, 10);
        console.log('Loaded customPanelCounter:', customPanelCounter);
    }
    
    // Load panel names
    let panelNames = {};
    if (savedPanelNames) {
        panelNames = JSON.parse(savedPanelNames);
        console.log('Loaded panel names:', panelNames);
    }
    
    // Recreate any saved panels that don't exist in the DOM
    recreateSavedPanels(panelNames);
}

// Recreate saved panels from localStorage
function recreateSavedPanels(panelNames = {}) {
    console.log('Recreating saved panels');
    
    // Get all panel IDs from hourlyAssignments
    const panelIds = Object.keys(hourlyAssignments);
    console.log('Panel IDs to recreate:', panelIds);
    
    // For each panel ID, check if it exists in the DOM
    panelIds.forEach(panelId => {
        // Skip if the panel already exists
        if (document.getElementById(`${panelId}-panel`)) {
            console.log('Panel already exists:', panelId);
            return;
        }
        
        // Create the panel
        console.log('Creating saved panel:', panelId);
        createSavedPanel(panelId, panelNames[panelId]);
    });
}

// Create a panel from saved data
function createSavedPanel(panelId, customName) {
    console.log('Creating saved panel:', panelId, 'with custom name:', customName);
    
    const scheduleContainer = document.querySelector('.schedule-container');
    
    // Use the custom name if provided, otherwise generate a default name
    let panelName;
    if (customName) {
        panelName = customName;
    } else if (panelId.startsWith('panel-')) {
        const panelNumber = panelId.split('-')[1];
        panelName = `Panel ${panelNumber}`;
    } else {
        panelName = panelId;
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
    
    // Create edit button
    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path fill="none" d="M0 0h24v24H0z"/><path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21h-.001z" fill="currentColor"/></svg>';
    editButton.addEventListener('click', function() {
        editPanelName(panelId);
    });
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path fill="none" d="M0 0h24v24H0z"/><path d="M7 4V2h10v2h5v2h-2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6H2V4h5zM6 6v14h12V6H6zm3 3h2v8H9V9zm4 0h2v8h-2V9z" fill="currentColor"/></svg>';
    deleteButton.addEventListener('click', function() {
        deleteSchedulePanel(panelId);
    });
    
    // Add buttons to container
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    
    // Add title and buttons to header
    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(buttonContainer);
    
    // Add header to panel
    panelElement.appendChild(panelHeader);
    
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
    
    // Add the schedule items container to the panel
    panelElement.appendChild(scheduleItemsContainer);
    
    // Add panel to schedule container
    scheduleContainer.appendChild(panelElement);
    
    // Initialize empty assignments array for this panel
    if (!assignments[panelId]) {
        assignments[panelId] = [];
    }
    
    return panelElement;
}
    
function addSchedulePanel() {
    console.log('addSchedulePanel function called');
    const panelName = prompt('Enter a name for the new schedule panel:');
    console.log('Panel name:', panelName);
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
    panelTitle.dataset.panelName = panelName.trim();
    
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
    
    const scheduleContainer = document.querySelector('.schedule-container');
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

// Helper function to check if a panel name is already taken
function isPanelNameTaken(name) {
    // Get all panel titles
    const panelTitles = Array.from(document.querySelectorAll('.panel-header h2'));
    
    // Check if any panel has the same name
    return panelTitles.some(title => title.textContent.toLowerCase() === name.toLowerCase());
}

// Edit a panel name
function editPanelName(panelId) {
    const panelElement = document.getElementById(`${panelId}-panel`);
    if (!panelElement) return;
    
    const panelTitle = panelElement.querySelector('.panel-header h2');
    const currentName = panelTitle.textContent;
    
    const newName = prompt('Enter a new name for this panel:', currentName);
    if (!newName || newName.trim() === '') {
        return;
    }
    
    // If the name hasn't changed, do nothing
    if (newName.trim() === currentName) {
        return;
    }
    
    if (isPanelNameTaken(newName.trim())) {
        alert('A panel with this name already exists. Please choose a different name.');
        return;
    }
    
    panelTitle.textContent = newName.trim();
    panelTitle.dataset.panelName = newName.trim();
    
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
        const scheduleContainer = document.querySelector('.schedule-container');
        scheduleContainer.removeChild(panelElement);
    }
    
    // Remove the panel from assignments
    delete assignments[panelId];
    
    // Update drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
    
    // Clean up any invalid panel entries
    cleanupHourlyAssignments();
    
    // Update the UI
    renderNamePanels();
    updateEmptyScheduleMessage();
    
    // Save to local storage
    saveToLocalStorage();
}

// Process a drop action (shared between mouse and touch)
function processDrop(name, sourceContainer, targetContainer) {
    console.log('Processing drop:', name, 'from', sourceContainer, 'to', targetContainer);
    console.log('Current hourlyAssignments before drop:', JSON.stringify(hourlyAssignments));
    
    // Don't do anything if dropped in the same container
    if (sourceContainer === targetContainer) {
        console.log('Same container, ignoring drop');
        return;
    }
    
    // If dropped in trash, delete the name completely
    if (targetContainer === 'trash') {
        console.log('Dropping in trash');
        // Remove from source container
        if (sourceContainer === 'names') {
            names = names.filter(n => n !== name);
        } else if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const [panelId, hour] = sourceContainer.split('-');
            if (hourlyAssignments[panelId]) {
                hourlyAssignments[panelId][hour] = null;
            }
        } else {
            if (assignments[sourceContainer]) {
                assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
            }
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
        console.log('Dropping in hourly slot');
        const parts = targetContainer.split('-');
        // Ensure we handle panel IDs correctly, even if they contain hyphens
        const hour = parts.pop();
        const panelId = parts.join('-');
        console.log('Target panel ID:', panelId, 'hour:', hour);
        
        // Make a deep copy of the hourlyAssignments to avoid reference issues
        const hourlyAssignmentsCopy = JSON.parse(JSON.stringify(hourlyAssignments));
        
        // Make sure hourlyAssignments for this panel exists
        if (!hourlyAssignmentsCopy[panelId]) {
            console.log('Creating hourlyAssignments for panel:', panelId);
            hourlyAssignmentsCopy[panelId] = Array(24).fill(null);
        }
        
        // If there's already a name in this hour slot, move it back to the names list
        if (hourlyAssignmentsCopy[panelId][hour]) {
            console.log('Slot already has name:', hourlyAssignmentsCopy[panelId][hour], 'moving to names list');
            names.push(hourlyAssignmentsCopy[panelId][hour]);
        }
        
        // Remove from source container
        if (sourceContainer === 'names') {
            names = names.filter(n => n !== name);
        } else if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const sourceParts = sourceContainer.split('-');
            // Ensure we handle panel IDs correctly, even if they contain hyphens
            const sourceHour = sourceParts.pop();
            const sourcePanelId = sourceParts.join('-');
            if (hourlyAssignmentsCopy[sourcePanelId]) {
                hourlyAssignmentsCopy[sourcePanelId][sourceHour] = null;
            }
        } else {
            if (assignments[sourceContainer]) {
                assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
            }
        }
        
        // Assign to the hour slot
        console.log('Assigning', name, 'to', panelId, 'hour', hour);
        hourlyAssignmentsCopy[panelId][hour] = name;
        
        // Update the hourlyAssignments with the modified copy
        hourlyAssignments = hourlyAssignmentsCopy;
        
        console.log('Updated hourlyAssignments after drop:', JSON.stringify(hourlyAssignments));
        
        // Save to local storage
        saveToLocalStorage();
        
        // Update UI
        renderNamePanels();
        renderSchedulePanels();
        return;
    }
    
    // Standard container drop (not hourly)
    console.log('Standard container drop');
    
    // Make a deep copy of the assignments to avoid reference issues
    const assignmentsCopy = JSON.parse(JSON.stringify(assignments));
    const hourlyAssignmentsCopy = JSON.parse(JSON.stringify(hourlyAssignments));
    
    // Remove from source container
    if (sourceContainer === 'names') {
        names = names.filter(n => n !== name);
    } else if (sourceContainer.includes('-')) {
        // This is an hourly slot
        const sourceParts = sourceContainer.split('-');
        // Ensure we handle panel IDs correctly, even if they contain hyphens
        const sourceHour = sourceParts.pop();
        const sourcePanelId = sourceParts.join('-');
        if (hourlyAssignmentsCopy[sourcePanelId]) {
            hourlyAssignmentsCopy[sourcePanelId][sourceHour] = null;
        }
    } else {
        if (assignmentsCopy[sourceContainer]) {
            assignmentsCopy[sourceContainer] = assignmentsCopy[sourceContainer].filter(n => n !== name);
        }
    }
    
    // Add to target container
    if (targetContainer === 'names') {
        names.push(name);
    } else {
        // Make sure the assignments array exists for this container
        if (!assignmentsCopy[targetContainer]) {
            assignmentsCopy[targetContainer] = [];
        }
        assignmentsCopy[targetContainer].push(name);
    }
    
    // Update the assignments and hourlyAssignments with the modified copies
    assignments = assignmentsCopy;
    hourlyAssignments = hourlyAssignmentsCopy;
    
    console.log('Updated assignments after drop:', JSON.stringify(assignments));
    
    // Save to local storage
    saveToLocalStorage();
    
    // Update UI
    renderNamePanels();
    renderSchedulePanels();
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    console.log('Setting up drag and drop...');
    // Update the list of drop containers
    allDropContainers = document.querySelectorAll('[data-container]');
    console.log('Drop containers:', allDropContainers.length);
    
    // Add event listeners for drag and drop
    allDropContainers.forEach(container => {
        // Remove existing listeners to prevent duplicates
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('dragleave', handleDragLeave);
        container.removeEventListener('drop', handleDrop);
        
        // Add new listeners
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
}

// Handle dragover event
function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

// Handle dragleave event
function handleDragLeave() {
    this.classList.remove('drag-over');
}

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    console.log('Drop event on container:', this.dataset.container);
    console.log('Dragged name:', draggedName);
    console.log('Source container:', dragSourceContainer);
    
    if (draggedName) {
        processDrop(draggedName, dragSourceContainer, this.dataset.container);
        draggedName = null;
        dragSourceContainer = null;
    }
}

// Handle drag start event
function handleDragStart(e) {
    console.log('Drag start on element:', this);
    draggedName = this.dataset.name;
    dragSourceContainer = this.dataset.container;
    console.log('Dragging name:', draggedName, 'from container:', dragSourceContainer);
    
    e.dataTransfer.setData('text/plain', draggedName);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add dragging class
    this.classList.add('dragging');
    
    // Remove dragging class after drag ends
    this.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        console.log('Drag ended');
    }, { once: true });
}

// Handle touch start event
function handleTouchStart(e) {
    const touch = e.touches[0];
    const namePanel = this;
    
    draggedName = namePanel.dataset.name;
    dragSourceContainer = namePanel.dataset.container;
    
    // Create a clone for visual feedback
    const clone = namePanel.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.zIndex = '1000';
    clone.style.opacity = '0.8';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    
    // Position the clone at the touch point
    positionClone(clone, touch.clientX, touch.clientY);
    
    // Add dragging class to original
    namePanel.classList.add('dragging');
    
    // Define touch move handler
    const handleTouchMove = function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        
        // Move the clone
        positionClone(clone, touch.clientX, touch.clientY);
        
        // Check if we're over a drop target
        const dropTarget = getDropTargetAtPoint(touch.clientX, touch.clientY);
        
        // Remove drag-over class from all containers
        allDropContainers.forEach(container => {
            container.classList.remove('drag-over');
        });
        
        // Add drag-over class to current target
        if (dropTarget) {
            dropTarget.classList.add('drag-over');
        }
    };
    
    // Define touch end handler
    const handleTouchEnd = function(e) {
        // Remove the clone
        document.body.removeChild(clone);
        
        // Remove dragging class
        namePanel.classList.remove('dragging');
        
        // Remove drag-over class from all containers
        allDropContainers.forEach(container => {
            container.classList.remove('drag-over');
        });
        
        // Check if we're over a drop target
        const touch = e.changedTouches[0];
        const dropTarget = getDropTargetAtPoint(touch.clientX, touch.clientY);
        
        if (dropTarget) {
            processDrop(draggedName, dragSourceContainer, dropTarget.dataset.container);
        }
        
        // Clean up
        draggedName = null;
        dragSourceContainer = null;
        
        // Remove event listeners
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };
    
    // Add event listeners
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

// Position a clone element at the specified coordinates
function positionClone(clone, x, y) {
    clone.style.left = (x - clone.offsetWidth / 2) + 'px';
    clone.style.top = (y - clone.offsetHeight / 2) + 'px';
}

// Get the drop target element at the specified coordinates
function getDropTargetAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    
    // Find the first element with a data-container attribute
    for (const element of elements) {
        if (element.dataset.container) {
            return element;
        }
        
        // Check if any parent has a data-container attribute
        let parent = element.parentElement;
        while (parent) {
            if (parent.dataset.container) {
                return parent;
            }
            parent = parent.parentElement;
        }
    }
    
    return null;
}
