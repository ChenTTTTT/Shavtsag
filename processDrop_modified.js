// Modified processDrop function to allow names to be used multiple times
// when dragging from the names list, and to prevent dropping a name panel
// onto a slot that already has the same name

function processDrop(name, sourceContainer, targetContainer) {
    // Don't do anything if dropped in the same container
    if (sourceContainer === targetContainer) {
        return;
    }
    
    // Check if we're dropping onto a slot that already has the same name
    if (targetContainer.includes('-')) {
        const parts = targetContainer.split('-');
        const hour = parts.pop();
        const panelId = parts.join('-');
        
        // If the target slot already has the same name, do nothing
        if (hourlyAssignments[panelId] && hourlyAssignments[panelId][hour] === name) {
            return;
        }
    }
    
    // If dropped in trash, delete the name completely
    if (targetContainer === 'trash') {
        // Remove from source container
        if (sourceContainer === 'names') {
            // Remove from names list only if it's being deleted
            names = names.filter(n => n !== name);
        } else if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const sourceParts = sourceContainer.split('-');
            // Ensure we handle panel IDs correctly, even if they contain hyphens
            const sourceHour = sourceParts.pop();
            const sourcePanelId = sourceParts.join('-');

            if (hourlyAssignments[sourcePanelId]) {
                hourlyAssignments[sourcePanelId][sourceHour] = null;
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
        const parts = targetContainer.split('-');
        // Ensure we handle panel IDs correctly, even if they contain hyphens
        const hour = parts.pop();
        const panelId = parts.join('-');
        
        // Make a deep copy of the hourlyAssignments to avoid reference issues
        const hourlyAssignmentsCopy = JSON.parse(JSON.stringify(hourlyAssignments));
        
        // Make sure hourlyAssignments for this panel exists
        if (!hourlyAssignmentsCopy[panelId]) {
            hourlyAssignmentsCopy[panelId] = Array(24).fill(null);
        }
        
        // If there's already a name in this hour slot, move it back to the names list
        if (hourlyAssignmentsCopy[panelId][hour]) {
            names.push(hourlyAssignmentsCopy[panelId][hour]);
        }
        
        // Remove from source container, but NOT from names list
        if (sourceContainer.includes('-')) {
            // This is an hourly slot
            const sourceParts = sourceContainer.split('-');
            // Ensure we handle panel IDs correctly, even if they contain hyphens
            const sourceHour = sourceParts.pop();
            const sourcePanelId = sourceParts.join('-');
            if (hourlyAssignmentsCopy[sourcePanelId]) {
                hourlyAssignmentsCopy[sourcePanelId][sourceHour] = null;
            }
        } else if (sourceContainer !== 'names') {
            // Only remove from non-names containers
            if (assignments[sourceContainer]) {
                assignments[sourceContainer] = assignments[sourceContainer].filter(n => n !== name);
            }
        }
        
        // Assign to the hour slot
        hourlyAssignmentsCopy[panelId][hour] = name;
        
        // Update the hourlyAssignments with the modified copy
        hourlyAssignments = hourlyAssignmentsCopy;
        
        // Save to local storage
        saveToLocalStorage();
        
        // Update UI
        renderNamePanels();
        renderSchedulePanels();
        return;
    }
    
    // Standard container drop (not hourly)
    
    // Make a deep copy of the assignments to avoid reference issues
    const assignmentsCopy = JSON.parse(JSON.stringify(assignments));
    const hourlyAssignmentsCopy = JSON.parse(JSON.stringify(hourlyAssignments));
    
    // Remove from source container, but NOT from names list
    if (sourceContainer.includes('-')) {
        // This is an hourly slot
        const sourceParts = sourceContainer.split('-');
        // Ensure we handle panel IDs correctly, even if they contain hyphens
        const sourceHour = sourceParts.pop();
        const sourcePanelId = sourceParts.join('-');
        if (hourlyAssignmentsCopy[sourcePanelId]) {
            hourlyAssignmentsCopy[sourcePanelId][sourceHour] = null;
        }
    } else if (sourceContainer !== 'names') {
        // Only remove from non-names containers
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
    
    // Save to local storage
    saveToLocalStorage();
    
    // Update UI
    renderNamePanels();
    renderSchedulePanels();
}
