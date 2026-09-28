import { useEffect, useId, useRef, useState } from "react";
import Icon from "../ui/Icon";

const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "users", label: "Pengguna", icon: "profile" },
  { id: "predictions", label: "Prediksi", icon: "scan" },
  { id: "activity", label: "Aktivitas", icon: "history" },
  { id: "storage", label: "Penyimpanan", icon: "gallery" },
  { id: "reports", label: "Laporan", icon: "download" },
];

function AdminSectionNav({ activeSection, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const menuId = useId();
  const activeIndex = Math.max(
    ADMIN_SECTIONS.findIndex((item) => item.id === activeSection),
    0,
  );
  const activeItem = ADMIN_SECTIONS[activeIndex];

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusFrame = requestAnimationFrame(() => {
      optionRefs.current[activeIndex]?.focus();
    });

    const handleOutsidePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handleOutsidePointer);
    };
  }, [activeIndex, isOpen]);

  const closeMenu = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectSection = (sectionId) => {
    onChange(sectionId);
    closeMenu();
  };

  const handleMenuKeyDown = (event) => {
    const focusedIndex = optionRefs.current.indexOf(document.activeElement);
    let nextIndex = focusedIndex;

    if (event.key === "ArrowDown") nextIndex = (focusedIndex + 1) % ADMIN_SECTIONS.length;
    if (event.key === "ArrowUp") nextIndex = (focusedIndex - 1 + ADMIN_SECTIONS.length) % ADMIN_SECTIONS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = ADMIN_SECTIONS.length - 1;

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }

    if (event.key === "Tab") setIsOpen(false);
  };

  return (
    <nav className="admin-section-nav" aria-label="Bagian dashboard admin">
      <div className="admin-section-nav__mobile" ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          className="admin-section-switcher"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          <span className="admin-section-switcher__icon" aria-hidden="true">
            <Icon name={activeItem.icon} size={19} />
          </span>
          <span>{activeItem.label}</span>
          <Icon
            name="chevron"
            size={19}
            className={`admin-section-switcher__chevron ${isOpen ? "is-open" : ""}`}
          />
        </button>

        {isOpen && (
          <div
            id={menuId}
            className="admin-section-menu"
            role="menu"
            aria-label="Pilih bagian dashboard"
            onKeyDown={handleMenuKeyDown}
          >
            {ADMIN_SECTIONS.map((item, index) => {
              const isActive = item.id === activeSection;
              return (
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={isActive ? "is-active" : ""}
                  key={item.id}
                  onClick={() => selectSection(item.id)}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                  {isActive && <Icon name="check" size={18} className="admin-section-menu__check" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="admin-section-nav__list">
        {ADMIN_SECTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeSection === item.id ? "is-active" : ""}
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            {activeSection === item.id && <Icon name="check" size={17} className="admin-section-nav__check" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default AdminSectionNav;
