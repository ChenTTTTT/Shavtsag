// DOM Elements
const nameInput = document.getElementById('name-input');
const addNameBtn = document.getElementById('add-name-btn');
const namesListContainer = document.getElementById('names-list-container');
const emptyMessage = document.querySelector('.empty-message');
const scheduleItems = document.querySelectorAll('.schedule-items');
const trashPanel = document.getElementById('trash-panel');
const allDropContainers = document.querySelectorAll('[data-container]');

// Touch support variables
let touchDragging = false;
let draggedElement = null;
let draggedElementClone = null;
let initialTouchPos = { x: 0, y: 0 };
let lastTouchPos = { x: 0, y: 0 };

// State
let names = [];
let assignments = {
    duty: [],
    standby: [],
    rest: [],
    home: []
};

// Initialize app
function init() {
    // Load data from local storage if available
    loadFromLocalStorage();
    
    // Render all panels
    renderNamePanels();
    renderSchedulePanels();

    // Add event listeners
    addNameBtn.addEventListener('click', addName);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addName();
        }
    });
    
    // Set up drag and drop
    setupDragAndDrop();
}

// Add a new name
function addName() {
    const name = nameInput.value.trim();
    
    // Validate input
    if (name === '') {
        alert('Please enter a name');
        return;
    }
    
    // Check for duplicates in the names list and all schedule panels
    if (names.includes(name) || 
        assignments.duty.includes(name) || 
        assignments.standby.includes(name) || 
        assignments.rest.includes(name) || 
        assignments.home.includes(name)) {
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
    // Clear existing panels except empty message
    Array.from(namesListContainer.children).forEach(child => {
        if (!child.classList.contains('empty-message')) {
            namesListContainer.removeChild(child);
        }
    });
    
    // Show/hide empty message
    if (names.length === 0) {
        emptyMessage.style.display = 'block';
    } else {
        emptyMessage.style.display = 'none';
        
        // Create panels for each name
        names.forEach(name => {
            createNamePanel(name, 'names', namesListContainer);
        });
    }
}

// Render all schedule panels
function renderSchedulePanels() {
    // Clear and render each schedule panel
    for (const [container, namesList] of Object.entries(assignments)) {
        const scheduleItemsContainer = document.querySelector(`#${container}-panel .schedule-items`);
        
        // Clear existing panels
        scheduleItemsContainer.innerHTML = '';
        
        // Create panels for each name
        namesList.forEach(name => {
            createNamePanel(name, container, scheduleItemsContainer);
        });
    }
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
}

// Load data from local storage
function loadFromLocalStorage() {
    const savedNames = localStorage.getItem('scheduleAppNames');
    const savedAssignments = localStorage.getItem('scheduleAppAssignments');
    
    if (savedNames) {
        names = JSON.parse(savedNames);
    }
    
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
    }
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    // Add event listeners to all drop containers
    allDropContainers.forEach(container => {
        // Desktop drag and drop
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
        
        // Mobile touch events
        container.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
        container.addEventListener('touchend', handleContainerTouchEnd, { passive: false });
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
    const touch = e.touches[0];
    const panel = this;
    
    // Store initial touch position
    initialTouchPos.x = touch.clientX;
    initialTouchPos.y = touch.clientY;
    lastTouchPos.x = touch.clientX;
    lastTouchPos.y = touch.clientY;
    
    // Set a timeout to start dragging after a short hold
    setTimeout(() => {
        // Only start dragging if the finger is still down and hasn't moved much
        if (e.touches.length > 0 && 
            Math.abs(lastTouchPos.x - initialTouchPos.x) < 10 && 
            Math.abs(lastTouchPos.y - initialTouchPos.y) < 10) {
            
            touchDragging = true;
            draggedElement = panel;
            
            // Create a clone for visual dragging
            draggedElementClone = panel.cloneNode(true);
            draggedElementClone.classList.add('dragging');
            draggedElementClone.style.position = 'fixed';
            draggedElementClone.style.top = `${touch.clientY - panel.offsetHeight / 2}px`;
            draggedElementClone.style.left = `${touch.clientX - panel.offsetWidth / 2}px`;
            draggedElementClone.style.width = `${panel.offsetWidth}px`;
            draggedElementClone.style.zIndex = '1000';
            draggedElementClone.style.opacity = '0.8';
            draggedElementClone.style.pointerEvents = 'none';
            document.body.appendChild(draggedElementClone);
            
            // Make original semi-transparent
            panel.style.opacity = '0.4';
        }
    }, 200); // 200ms hold to start dragging
}

// Handle touch move on a name panel
function handleTouchMove(e) {
    if (!touchDragging) {
        // Update last touch position for the hold detection
        if (e.touches.length > 0) {
            lastTouchPos.x = e.touches[0].clientX;
            lastTouchPos.y = e.touches[0].clientY;
        }
        return;
    }
    
    e.preventDefault(); // Prevent scrolling while dragging
    
    const touch = e.touches[0];
    
    // Move the clone with the finger
    if (draggedElementClone) {
        draggedElementClone.style.top = `${touch.clientY - draggedElement.offsetHeight / 2}px`;
        draggedElementClone.style.left = `${touch.clientX - draggedElement.offsetWidth / 2}px`;
    }
}

// Handle touch move over a container
function handleContainerTouchMove(e) {
    if (!touchDragging) return;
    
    // Check if the touch is over this container
    const touch = e.touches[0];
    const container = this;
    const rect = container.getBoundingClientRect();
    
    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        // Highlight the container
        container.classList.add('drag-over');
    } else {
        // Remove highlight
        container.classList.remove('drag-over');
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
    if (!touchDragging) return;
    
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
    
    // Remove from source container
    if (sourceContainer === 'names') {
        names = names.filter(n => n !== name);
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

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
