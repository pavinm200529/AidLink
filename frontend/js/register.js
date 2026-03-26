document.getElementById('registerForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = ev.target.name.value.trim();
    const email = ev.target.email.value.trim();
    const password = ev.target.password.value;
    const role = ev.target.role.value;
    const status = document.getElementById('status');
    const btn = ev.target.querySelector('button');

    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    status.style.color = 'var(--accent)';
    status.textContent = 'Registering with core systems...';

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        if (!res.ok) {
            const err = await res.json();
            status.textContent = (err.error || 'Registration Failed');
            status.style.color = '#ef4444';
            btn.disabled = false;
            btn.textContent = 'Register Account';
            return;
        }

        status.textContent = 'Account Created Successfully! Redirecting to Login...';
        status.style.color = 'var(--primary)';

        if (window.notify) {
            window.notify.showToast('Account created for ' + name, { type: 'success' });
        }

        setTimeout(() => window.location = '/', 2000);
    } catch (e) {
        status.textContent = 'System communication failure';
        status.style.color = '#ef4444';
        btn.disabled = false;
        btn.textContent = 'Register Account';
    }
});
