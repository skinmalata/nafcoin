function toggleMenu() {
    var links = document.getElementById('navLinks');
    var btn = document.querySelector('.mobile-menu-btn');
    if (!links) return;
    links.classList.toggle('active');
    if (btn) btn.classList.toggle('active');
}

document.addEventListener('click', function (e) {
    var links = document.getElementById('navLinks');
    var btn = document.querySelector('.mobile-menu-btn');
    if (!links || !links.classList.contains('active')) return;
    if (links.contains(e.target) || (btn && btn.contains(e.target))) return;
    links.classList.remove('active');
    if (btn) btn.classList.remove('active');
});
