// Admin Login Page JavaScript

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const username = form.username.value;
  const password = form.password.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = '/admin/';
    } else {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = 'Connection error. Please try again.';
    errorEl.hidden = false;
  }
});
