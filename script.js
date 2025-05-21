// DOM Elements
const nameInput = document.getElementById('name-input');
const addNameBtn = document.getElementById('add-name-btn');
const namesListContainer = document.getElementById('names-list-container');
const emptyMessage = document.querySelector('.empty-message');
const scheduleItems = document.querySelectorAll('.schedule-items');
const allDropContainers = document.querySelectorAll('[data-container]');

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
    
    // Add drag event listeners
    panel.addEventListener('dragstart', handleDragStart);
    panel.addEventListener('dragend', handleDragEnd);
    
    const heading = document.createElement('h3');
    heading.textContent = name;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag events from firing
        removeName(name, container);
    });
    
    panel.appendChild(heading);
    panel.appendChild(removeBtn);
    
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
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
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

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    // Get the dragged item data
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { name, container: sourceContainer } = data;
    const targetContainer = this.dataset.container;
    
    // Don't do anything if dropped in the same container
    if (sourceContainer === targetContainer) {
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
