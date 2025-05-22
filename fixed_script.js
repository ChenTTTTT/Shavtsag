// This is the fixed addSchedulePanel function that includes the time interval control
// Replace the existing addSchedulePanel function in script_new.js with this version

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
    
    // Create time interval control container
    const intervalContainer = document.createElement('div');
    intervalContainer.className = 'panel-interval-container';
    
    // Create interval input
    const intervalLabel = document.createElement('label');
    intervalLabel.textContent = 'Interval (min): ';
    intervalLabel.setAttribute('for', `interval-input-${panelId}`);
    
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.id = `interval-input-${panelId}`;
    intervalInput.className = 'panel-interval-input interval-input';
    intervalInput.min = '10';
    intervalInput.max = '720'; // 12 hours in minutes
    intervalInput.value = globalTimeInterval; // Use the global time interval
    
    // Create update button
    const updateButton = document.createElement('button');
    updateButton.className = 'update-interval-btn';
    updateButton.textContent = 'Update';
    updateButton.addEventListener('click', function() {
        const newInterval = parseInt(intervalInput.value);
        if (newInterval < 10) {
            alert('Time interval cannot be less than 10 minutes');
            intervalInput.value = '10';
            panelTimeIntervals[panelId] = 10;
        } else if (newInterval > 720) {
            alert('Time interval cannot be more than 12 hours (720 minutes)');
            intervalInput.value = '720';
            panelTimeIntervals[panelId] = 720;
        } else {
            panelTimeIntervals[panelId] = newInterval;
        }
        
        // Redraw this panel with the new interval
        refreshPanelWithNewInterval(panelId);
        saveToLocalStorage();
    });
    
    // Add elements to interval container
    intervalContainer.appendChild(intervalLabel);
    intervalContainer.appendChild(intervalInput);
    intervalContainer.appendChild(updateButton);
    
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
        hourLabel.textContent = formatHour(hour, panelId);
        
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
    panelHeader.appendChild(intervalContainer);
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
    
    // Set the panel's time interval to the global time interval
    panelTimeIntervals[panelId] = globalTimeInterval;
    
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
