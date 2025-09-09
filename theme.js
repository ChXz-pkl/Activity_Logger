document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme');

    // Terapkan tema yang disimpan saat halaman dimuat
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
    } else {
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                themeToggleBtn.textContent = '🌙';
                localStorage.setItem('theme', 'dark'); // Simpan preferensi
            } else {
                themeToggleBtn.textContent = '☀️';
                localStorage.setItem('theme', 'light'); // Simpan preferensi
            }
        });
    }
});