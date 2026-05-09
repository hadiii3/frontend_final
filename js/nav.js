/* nav.js — Mobile menu toggle + scroll-aware nav */
(function () {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');

  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }

  /* Highlight active nav link */
  const links = document.querySelectorAll('.nav-links a, .nav-mobile a');
  links.forEach(link => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });

  /* Logout functionality */
  const logoutBtns = document.querySelectorAll('.logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      const token = localStorage.getItem('student_token');
      if (token) {
        try {
          await fetch('https://api.eightyeightevents.me/api/v1/student/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      }

      localStorage.removeItem('student_token');
      localStorage.removeItem('student_name');

      // Determine if we need to go up a directory to reach index.html
      const isPagesDir = window.location.pathname.includes('/pages/');
      window.location.href = isPagesDir ? '../index.html' : 'index.html';
    });
  });
})();
