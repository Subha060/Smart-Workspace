(function () {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const toggle = document.getElementById("sidebar-toggle");
    const close = document.getElementById("sidebar-close");

    function openSidebar() {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
      setTimeout(() => overlay.classList.add("opacity-100"), 10);
    }
    function closeSidebar() {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.remove("opacity-100");
      setTimeout(() => overlay.classList.add("hidden"), 300);
    }

    toggle && toggle.addEventListener("click", openSidebar);
    close && close.addEventListener("click", closeSidebar);
    overlay && overlay.addEventListener("click", closeSidebar);

    // Highlight active link based on current URL path
    const links = document.querySelectorAll(".sidebar-link");
    links.forEach((link) => {
      if (link.getAttribute("href") === window.location.pathname) {
        link.classList.add("text-white", "bg-white/5");
        link.classList.remove("text-slate-400");
        const dot = link.querySelector(".ml-auto.w-1\\.5");
        if (dot) dot.classList.remove("opacity-0");
      }
    });
  })();