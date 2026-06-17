const navLinks = Array.from(document.querySelectorAll(".chapter-nav a"));
const sections = Array.from(document.querySelectorAll("[data-section]"));

if (navLinks.length > 0 && sections.length > 0) {
  const topOffset = 112;

  const activate = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  };

  const updateActiveSection = () => {
    const current = sections
      .map((section) => ({
        id: section.id,
        distance: Math.abs(section.getBoundingClientRect().top - topOffset),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    activate(current.id);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href").slice(1);
      activate(id);
    });
  });

  updateActiveSection();
  window.addEventListener("scroll", updateActiveSection, { passive: true });
  window.addEventListener("resize", updateActiveSection);
}
