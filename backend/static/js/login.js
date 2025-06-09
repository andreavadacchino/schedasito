document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginErrorMessage = document.getElementById('login-error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            loginErrorMessage.textContent = ''; // Clear previous errors

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                loginErrorMessage.textContent = 'Username e password sono obbligatori.';
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Login successful, redirect to dashboard
                    window.location.href = '/dashboard';
                } else {
                    // Login failed, display error message
                    loginErrorMessage.textContent = data.message || 'Login fallito. Riprova.';
                }
            } catch (error) {
                console.error('Login API Call Error:', error);
                loginErrorMessage.textContent = 'Si è verificato un errore durante il tentativo di login. Controlla la console.';
            }
        });
    } else {
        console.error("Login form not found in the DOM.");
    }
});
