document.addEventListener('DOMContentLoaded', () => {
    const errorNotificationArea = document.getElementById('error-notification-area');
    const errorMessageElement = document.getElementById('error-message');
    const activeProjectsCountElement = document.getElementById('active-projects-count');
    const newProjectButton = document.getElementById('new-project-button');
    const projectsContainer = document.getElementById('projects-container');

    const LOGIN_URL = '/login.html'; // Define this if you have a login page

    /**
     * Displays an error message in the notification area.
     * @param {string} message The error message to display.
     */
    function showError(message) {
        if (errorMessageElement && errorNotificationArea) {
            // Add icon if not already present (idempotent)
            if (!errorNotificationArea.querySelector('.material-icons')) {
                const icon = document.createElement('span');
                icon.className = 'material-icons mr-2';
                icon.textContent = 'error_outline';
                errorMessageElement.parentNode.insertBefore(icon, errorMessageElement);
            }
            errorMessageElement.textContent = message;
            errorNotificationArea.classList.remove('hidden');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorNotificationArea.classList.add('hidden');
            }, 5000);
        } else {
            console.error("Error display elements (errorMessageElement or errorNotificationArea) not found in the DOM for dashboard.js.");
            alert(message); // Fallback to alert
        }
    }

    /**
     * Reusable function to handle API calls.
     * @param {string} url The URL to fetch.
     * @param {object} options Fetch options (method, headers, body, etc.).
     * @returns {Promise<any>} The JSON response from the API.
     */
    async function fetchApi(url, options = {}) {
        options.credentials = 'include'; // Ensure cookies (like session) are sent
        options.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };

        try {
            const response = await fetch(url, options);

            if (response.status === 401 || response.status === 403) {
                // Unauthorized or Forbidden
                showError("Autenticazione richiesta. Verrai reindirizzato alla pagina di login.");
                // Assuming login.html is in the templates directory and served by Flask at /login
                // Adjust if your login page URL is different.
                setTimeout(() => {
                    window.location.href = '/login_page'; 
                }, 2000);
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error: ${response.statusText}` }));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }

            if (response.status === 204) { // No Content
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            showError(error.message || 'Si è verificato un errore durante la comunicazione con il server.');
            throw error; // Re-throw to allow further handling if needed
        }
    }

    /**
     * Fetches projects and updates the dashboard.
     */
    async function loadProjects() {
        try {
            const projects = await fetchApi('/api/projects');
            if (projects && Array.isArray(projects)) {
                if (activeProjectsCountElement) {
                    activeProjectsCountElement.textContent = projects.length;
                } else {
                    console.warn("Element with ID 'active-projects-count' not found.");
                }

                if (projectsContainer) {
                    projectsContainer.innerHTML = ''; // Clear loading message or old projects
                    if (projects.length === 0) {
                        projectsContainer.innerHTML = '<p class="text-gray-500">Nessun progetto trovato.</p>';
                        return;
                    }
                    projects.forEach(project => {
                        const projectCard = `
                            <div class="bg-white p-4 rounded-lg shadow">
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">${project.name}</h3>
                                <p class="text-sm text-gray-600 mb-1"><strong>Cliente ID:</strong> ${project.client_id || 'N/D'}</p>
                                <p class="text-sm text-gray-600 mb-1"><strong>Team ID:</strong> ${project.team_id || 'N/D'}</p>
                                <p class="text-sm text-gray-600 mb-1"><strong>Stato:</strong> ${project.status}</p>
                                <p class="text-sm text-gray-600 mb-3"><strong>Scadenza:</strong> ${project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/D'}</p>
                                <a href="/scheda-sito.html?project_id=${project.id}" class="text-blue-500 hover:text-blue-700 text-sm font-medium">Dettagli Progetto</a>
                            </div>
                        `;
                        projectsContainer.insertAdjacentHTML('beforeend', projectCard);
                    });
                } else {
                     console.warn("Element with ID 'projects-container' not found.");
                }

            }
        } catch (error) {
            // Error is already displayed by fetchApi, but you can add specific handling here if needed
            console.error("Failed to load projects:", error);
            if (projectsContainer) {
                projectsContainer.innerHTML = '<p class="text-red-500">Errore nel caricamento dei progetti.</p>';
            }
        }
    }

    // Event Listeners
    if (newProjectButton) {
        newProjectButton.addEventListener('click', () => {
            // Redirect to scheda-sito.html for creating a new project
            window.location.href = '/scheda-sito?new=true';
        });
    } else {
        console.warn("Element with ID 'new-project-button' not found.");
    }


    // Initial data load
    loadProjects();

    // Placeholder for filter button functionality
    const filterButtons = document.querySelectorAll('section.mb-6 button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            showError(`La funzionalità di filtro per "${button.textContent.trim()}" non è ancora implementata.`);
        });
    });
});
