// Start of backend/static/js/scheda-sito.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const projectForm = document.getElementById('project-form');
    const projectNameInput = document.getElementById('project-name-input');
    const clientSelect = document.getElementById('client-select');
    const projectStatusSelect = document.getElementById('project-status-select');
    const teamSelect = document.getElementById('team-select');
    const deadlineInput = document.getElementById('deadline-input');
    const descriptionInput = document.getElementById('description-input');
    const checklistContainer = document.getElementById('checklist-container');
    const addTaskButton = document.getElementById('add-task-button');
    const addTaskFormContainer = document.getElementById('add-task-form-container');
    const newTaskNameInput = document.getElementById('new-task-name');
    const newTaskDescriptionInput = document.getElementById('new-task-description');
    const newTaskAssigneeSelect = document.getElementById('new-task-assignee');
    const newTaskDueDateInput = document.getElementById('new-task-due-date');
    const newTaskStatusSelect = document.getElementById('new-task-status');
    const cancelAddTaskButton = document.getElementById('cancel-add-task');
    const confirmAddTaskButton = document.getElementById('confirm-add-task');
    const timelineContainer = document.getElementById('timeline-container'); // For milestones
    const deleteProjectButton = document.getElementById('delete-project-button');
    const saveProjectButton = document.getElementById('save-project-button');
    const saveButtonText = document.getElementById('save-button-text');
    const markAsCompletedButton = document.getElementById('mark-as-completed-button');

    // Error Notification
    let errorNotificationAreaScheda, errorMessageScheda;

    function initializeErrorDisplay() {
        errorNotificationAreaScheda = document.getElementById('error-notification-area-scheda');
        errorMessageScheda = document.getElementById('error-message-scheda');
        if (!errorNotificationAreaScheda) {
            console.warn("Error notification area 'error-notification-area-scheda' not found. Creating a fallback.");
            const area = document.createElement('div');
            area.id = 'error-notification-area-scheda';
            area.className = 'hidden fixed top-0 right-0 mt-4 mr-4 bg-red-500 text-white p-4 rounded shadow-lg z-50';
            const msgP = document.createElement('p');
            msgP.id = 'error-message-scheda';
            area.appendChild(msgP);
            const btn = document.createElement('button');
            btn.textContent = 'Chiudi';
            btn.className = 'ml-2 text-sm font-semibold';
            btn.onclick = () => area.classList.add('hidden');
            area.appendChild(btn);
            document.body.insertBefore(area, document.body.firstChild); // Add to top
            errorNotificationAreaScheda = area;
            errorMessageScheda = msgP;
        }
    }
    initializeErrorDisplay();


    // --- Global State ---
    let currentProjectId = null;
    let isCreateMode = false;
    let allUsers = []; // To store users for assignee dropdown

    // --- API & Utility Functions ---
    function showError(message) {
        if (errorMessageScheda && errorNotificationAreaScheda) {
            errorMessageScheda.textContent = message;
            errorNotificationAreaScheda.classList.remove('hidden');
            setTimeout(() => {
                errorNotificationAreaScheda.classList.add('hidden');
            }, 5000); // Auto-hide after 5 seconds
        } else {
            console.error("Error display elements not found for scheda-sito:", message);
            alert(message); // Fallback
        }
    }

    async function fetchApi(url, options = {}) {
        options.credentials = 'include';
        options.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };
        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                showError("Autenticazione richiesta. Verrai reindirizzato alla pagina di login.");
                setTimeout(() => { window.location.href = '/login_page'; }, 2000);
                throw new Error('Authentication required');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Errore HTTP ${response.status}` }));
                throw new Error(errorData.message || `Errore HTTP ${response.status}`);
            }
            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.error('API Call Error (scheda-sito):', error.message, url, options);
            showError(error.message || 'Errore di comunicazione con il server.');
            throw error;
        }
    }

    // --- Initialization ---
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('new') === 'true') {
            isCreateMode = true;
            currentProjectId = null;
        } else if (params.has('project_id')) {
            isCreateMode = false;
            currentProjectId = params.get('project_id');
        } else {
            showError("ID Progetto non specificato o modalità non valida.");
            // Consider redirecting: window.location.href = '/dashboard';
        }
    }

    async function initializePage() {
        getUrlParams();
        await populateClientDropdown();
        await populateTeamDropdown();
        await loadAllUsersForAssignee(); // For new task assignee dropdown

        if (isCreateMode) {
            setupCreateMode();
        } else if (currentProjectId) {
            await loadProjectDetails(currentProjectId);
            await loadTasksForProject(currentProjectId);
        }
    }

    function setupCreateMode() {
        if(projectForm) projectForm.reset(); // Reset form for new entries
        if(projectNameInput) projectNameInput.value = '';
        if(clientSelect) clientSelect.value = '';
        if(projectStatusSelect) projectStatusSelect.value = 'Pending'; // Default status
        if(teamSelect) teamSelect.value = '';
        if(deadlineInput) deadlineInput.value = '';
        if(descriptionInput) descriptionInput.value = '';
        if(checklistContainer) checklistContainer.innerHTML = '<p class="text-slate-500">Salva il progetto per aggiungere task.</p>';
        if(timelineContainer) timelineContainer.innerHTML = '<p class="text-slate-500">Salva il progetto per definire le milestones.</p>';
        
        if(saveButtonText) saveButtonText.textContent = 'Crea Progetto';
        if(deleteProjectButton) deleteProjectButton.classList.add('hidden');
        if(markAsCompletedButton) markAsCompletedButton.classList.add('hidden');
        if(addTaskButton) addTaskButton.classList.add('hidden'); // Hide add task until project is created
    }

    async function loadProjectDetails(projectId) {
        try {
            const project = await fetchApi(`/api/projects/${projectId}`);
            if (project) {
                if(projectNameInput) projectNameInput.value = project.name || '';
                if(clientSelect) clientSelect.value = project.client_id || '';
                if(projectStatusSelect) projectStatusSelect.value = project.status || 'Pending';
                if(teamSelect) teamSelect.value = project.team_id || '';
                if(deadlineInput) deadlineInput.value = project.deadline ? project.deadline.split('T')[0] : ''; // Format for date input
                if(descriptionInput) descriptionInput.value = project.description || '';

                if(saveButtonText) saveButtonText.textContent = 'Salva Modifiche';
                if(deleteProjectButton) deleteProjectButton.classList.remove('hidden');
                if(markAsCompletedButton) {
                    if (project.status === 'Completato') {
                        markAsCompletedButton.classList.add('hidden');
                    } else {
                        markAsCompletedButton.classList.remove('hidden');
                    }
                }
                if(addTaskButton) addTaskButton.classList.remove('hidden');
            }
        } catch (error) {
            showError(`Errore nel caricamento dei dettagli del progetto: ${error.message}`);
        }
    }

    // --- Dropdown Population ---
    async function populateClientDropdown(selectedClientId = null) {
        if (!clientSelect) return;
        try {
            const clients = await fetchApi('/api/clients');
            clientSelect.innerHTML = '<option value="">Seleziona Cliente...</option>'; // Clear existing
            clients.forEach(client => {
                const option = new Option(client.name, client.id);
                clientSelect.add(option);
            });
            if (selectedClientId) clientSelect.value = selectedClientId;
        } catch (error) {
            showError("Errore nel caricamento dei clienti.");
        }
    }

    async function populateTeamDropdown(selectedTeamId = null) {
        if (!teamSelect) return;
        try {
            const teams = await fetchApi('/api/teams');
            teamSelect.innerHTML = '<option value="">Nessun Team...</option>'; // Clear existing
            teams.forEach(team => {
                const option = new Option(team.name, team.id);
                teamSelect.add(option);
            });
            if (selectedTeamId) teamSelect.value = selectedTeamId;
        } catch (error) {
            showError("Errore nel caricamento dei team.");
        }
    }
    
    async function loadAllUsersForAssignee() {
        try {
            allUsers = await fetchApi('/api/users'); 
            
            if (newTaskAssigneeSelect) {
                newTaskAssigneeSelect.innerHTML = '<option value="">Assegna a (Opzionale)</option>'; // Reset/default option
                if (allUsers && Array.isArray(allUsers) && allUsers.length > 0) {
                    allUsers.forEach(user => {
                        // user_to_dict_short provides 'id', 'username', 'name'
                        const option = new Option(user.name || user.username, user.id); 
                        newTaskAssigneeSelect.add(option);
                    });
                } else {
                    console.warn("No users returned from /api/users or response was not an array.");
                    // Optionally, inform the user in the UI that assignees could not be loaded
                }
            }
        } catch (error) {
            console.error("Failed to load users for assignee dropdown from /api/users:", error);
            showError("Errore nel caricamento degli utenti per l'assegnazione dei task.");
            if (newTaskAssigneeSelect) {
                newTaskAssigneeSelect.innerHTML = '<option value="">Assegnazione non disponibile (errore)</option>';
            }
        }
    }


    // --- Form Submission (Create/Update Project) ---
    if (projectForm) {
        projectForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(projectForm);
            const projectData = Object.fromEntries(formData.entries());
            
            // Ensure client_id and team_id are integers or null
            projectData.client_id = projectData.client_id ? parseInt(projectData.client_id, 10) : null;
            projectData.team_id = projectData.team_id ? parseInt(projectData.team_id, 10) : null;
            if (!projectData.deadline) delete projectData.deadline; // Remove if empty to allow null in DB

            try {
                let response;
                if (isCreateMode) {
                    response = await fetchApi('/api/projects', {
                        method: 'POST',
                        body: JSON.stringify(projectData),
                    });
                    showError('Progetto creato con successo!');
                    // Redirect to the new project's page or dashboard
                    setTimeout(() => { window.location.href = `/scheda-sito?project_id=${response.id}`; }, 1500);
                } else {
                    response = await fetchApi(`/api/projects/${currentProjectId}`, {
                        method: 'PUT',
                        body: JSON.stringify(projectData),
                    });
                    showError('Progetto aggiornato con successo!');
                    // Optionally, re-populate form if response contains updated data
                    if (response) loadProjectDetails(currentProjectId); // Reload details
                }
            } catch (error) {
                // Error is already shown by fetchApi
                console.error('Save Project Error:', error);
            }
        });
    }

    // --- Task Management ---
    async function loadTasksForProject(projectId) {
        if (!checklistContainer) return;
        try {
            const tasks = await fetchApi(`/api/projects/${projectId}/tasks`);
            checklistContainer.innerHTML = ''; // Clear
            if (tasks && tasks.length > 0) {
                tasks.forEach(renderTask);
            } else {
                checklistContainer.innerHTML = '<p class="text-slate-500">Nessun task per questo progetto. Clicca "Aggiungi Task" per crearne uno.</p>';
            }
        } catch (error) {
            checklistContainer.innerHTML = '<p class="text-red-500">Errore nel caricamento dei task.</p>';
        }
    }

    function renderTask(task) {
        if (!checklistContainer) return;
        const taskHtml = `
            <div id="task-${task.id}" class="task-item flex items-center gap-x-3 p-3 bg-slate-50 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                <input type="checkbox" class="task-checkbox h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       data-task-id="${task.id}" ${task.status.toLowerCase() === 'completato' ? 'checked' : ''}>
                <div class="flex-grow">
                    <p class="text-slate-700 text-sm font-medium ${task.status.toLowerCase() === 'completato' ? 'line-through text-slate-500' : ''}">${task.name}</p>
                    ${task.description ? `<p class="text-xs text-gray-500">${task.description}</p>` : ''}
                    ${task.due_date ? `<p class="text-xs text-gray-500">Scadenza: ${new Date(task.due_date).toLocaleDateString()}</p>` : ''}
                    ${task.assignee_name ? `<p class="text-xs text-gray-500">Assegnato a: ${task.assignee_name}</p>` : ''}
                </div>
                <span class="task-status-badge status-badge ${getTaskStatusClass(task.status)}">
                    <span class="status-badge-dot" style="background-color: ${getTaskStatusDotColor(task.status)};"></span>
                    ${task.status}
                </span>
                <button class="delete-task-button material-icons text-red-500 hover:text-red-700 text-sm" data-task-id="${task.id}">delete_outline</button>
            </div>
        `;
        checklistContainer.insertAdjacentHTML('beforeend', taskHtml);
        
        // Add event listeners for the new task
        const newCheckbox = checklistContainer.querySelector(`.task-checkbox[data-task-id="${task.id}"]`);
        if(newCheckbox) newCheckbox.addEventListener('change', handleTaskStatusUpdate);
        
        const newDeleteButton = checklistContainer.querySelector(`.delete-task-button[data-task-id="${task.id}"]`);
        if(newDeleteButton) newDeleteButton.addEventListener('click', handleDeleteTask);

    }
    
    function getTaskStatusClass(status) {
        const s = (status || "").toLowerCase();
        if (s === 'completato') return 'bg-green-100 text-green-700';
        if (s === 'in corso') return 'bg-amber-100 text-amber-700';
        if (s === 'to do') return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-700'; // Default for Non Iniziato, Pending etc.
    }

    function getTaskStatusDotColor(status) {
        const s = (status || "").toLowerCase();
        if (s === 'completato') return 'var(--status-dot-completato)';
        if (s === 'in corso') return 'var(--status-dot-in-corso)';
        if (s === 'to do') return 'var(--status-dot-in-revisione)'; // Using in-revisione color for To Do
        return 'var(--status-dot-non-iniziato)';
    }


    async function handleTaskStatusUpdate(event) {
        const taskId = event.target.dataset.taskId;
        const isChecked = event.target.checked;
        const newStatus = isChecked ? 'Completato' : 'In Corso'; // Or 'To Do'

        try {
            const updatedTask = await fetchApi(`/api/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            // Visually update the task in the list
            const taskElement = document.getElementById(`task-${taskId}`);
            if (taskElement) {
                const pElement = taskElement.querySelector('p.text-slate-700');
                const statusBadge = taskElement.querySelector('.task-status-badge');
                const statusDot = statusBadge.querySelector('.status-badge-dot');

                if (isChecked) {
                    pElement.classList.add('line-through', 'text-slate-500');
                } else {
                    pElement.classList.remove('line-through', 'text-slate-500');
                }
                statusBadge.className = `task-status-badge status-badge ${getTaskStatusClass(newStatus)}`;
                statusDot.style.backgroundColor = getTaskStatusDotColor(newStatus);
                statusBadge.childNodes[2].nodeValue = ` ${newStatus} `; // Update text node
            }
             showError(`Task ${taskId} aggiornato a ${newStatus}.`);
        } catch (error) {
            showError(`Errore aggiornamento task ${taskId}: ${error.message}`);
            event.target.checked = !isChecked; // Revert checkbox
        }
    }

    async function handleDeleteTask(event) {
        const taskId = event.target.dataset.taskId;
        if (!confirm(`Sei sicuro di voler eliminare il task ${taskId}?`)) return;

        try {
            await fetchApi(`/api/tasks/${taskId}`, { method: 'DELETE' });
            document.getElementById(`task-${taskId}`)?.remove();
            showError(`Task ${taskId} eliminato.`);
        } catch (error) {
            showError(`Errore eliminazione task ${taskId}: ${error.message}`);
        }
    }


    // Add Task Form
    if (addTaskButton) {
        addTaskButton.addEventListener('click', () => {
            if (isCreateMode) {
                showError("Salva prima il progetto per poter aggiungere task.");
                return;
            }
            if(addTaskFormContainer) addTaskFormContainer.classList.remove('hidden');
            if(newTaskNameInput) newTaskNameInput.focus();
        });
    }
    if (cancelAddTaskButton) {
        cancelAddTaskButton.addEventListener('click', () => {
            if(addTaskFormContainer) addTaskFormContainer.classList.add('hidden');
            if(newTaskNameInput) newTaskNameInput.value = '';
            if(newTaskDescriptionInput) newTaskDescriptionInput.value = '';
            if(newTaskAssigneeSelect) newTaskAssigneeSelect.value = '';
            if(newTaskDueDateInput) newTaskDueDateInput.value = '';
            if(newTaskStatusSelect) newTaskStatusSelect.value = 'To Do';
        });
    }
    if (confirmAddTaskButton) {
        confirmAddTaskButton.addEventListener('click', async () => {
            if (!currentProjectId) {
                showError("ID Progetto non disponibile per aggiungere task.");
                return;
            }
            const name = newTaskNameInput.value.trim();
            if (!name) {
                showError("Il nome del task è obbligatorio.");
                return;
            }
            const taskData = {
                name: name,
                project_id: currentProjectId, // Should be handled by API route but good to be explicit
                description: newTaskDescriptionInput.value.trim(),
                assignee_id: newTaskAssigneeSelect.value ? parseInt(newTaskAssigneeSelect.value) : null,
                due_date: newTaskDueDateInput.value || null,
                status: newTaskStatusSelect.value
            };

            try {
                const newTask = await fetchApi(`/api/projects/${currentProjectId}/tasks`, {
                    method: 'POST',
                    body: JSON.stringify(taskData),
                });
                renderTask(newTask); // Add new task to the list
                if(addTaskFormContainer) addTaskFormContainer.classList.add('hidden'); // Hide form
                // Reset form fields
                cancelAddTaskButton.click(); 
                showError("Nuovo task aggiunto con successo.");
            } catch (error) {
                showError(`Errore creazione task: ${error.message}`);
            }
        });
    }
    
    // --- Footer Buttons ---
    if (deleteProjectButton) {
        deleteProjectButton.addEventListener('click', async () => {
            if (isCreateMode || !currentProjectId) return;
            if (confirm(`Sei sicuro di voler eliminare questo progetto (${currentProjectId})? Questa azione è irreversibile.`)) {
                try {
                    await fetchApi(`/api/projects/${currentProjectId}`, { method: 'DELETE' });
                    showError('Progetto eliminato con successo. Sarai reindirizzato alla dashboard.');
                    setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
                } catch (error) {
                    showError(`Errore eliminazione progetto: ${error.message}`);
                }
            }
        });
    }

    if (markAsCompletedButton) {
        markAsCompletedButton.addEventListener('click', async () => {
            if (isCreateMode || !currentProjectId) return;
             if (!confirm("Sei sicuro di voler segnare questo progetto come Completato?")) return;
            try {
                const updatedProject = await fetchApi(`/api/projects/${currentProjectId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'Completato' }),
                });
                if (projectStatusSelect) projectStatusSelect.value = 'Completato';
                markAsCompletedButton.classList.add('hidden'); // Hide button after marking
                showError('Progetto segnato come Completato.');
            } catch (error) {
                showError(`Errore nel segnare il progetto come completato: ${error.message}`);
            }
        });
    }

    // --- Milestones (Timeline) ---
    // Placeholder - Actual implementation requires Milestone API endpoints
    if (timelineContainer) {
        // If milestones were part of project data or fetched separately, render them here.
        // For now, it shows the default message or static content from HTML.
        // Example: timelineContainer.innerHTML = project.milestones.map(m => `<div>${m.name}</div>`).join('');
    }

    // --- Initial Load ---
    initializePage();
});
// End of backend/static/js/scheda-sito.js
