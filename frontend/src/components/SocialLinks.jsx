import Icon from "./ui/Icon";

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    icon: "github",
    href: "https://github.com/FerdyOktavian",
    external: true,
  },
  {
    label: "LinkedIn",
    icon: "linkedin",
    href: "https://www.linkedin.com/in/muhammad-ferdy-oktavian-876baa320",
    external: true,
  },
  {
    label: "Email",
    icon: "email",
    href: "mailto:muhammadferdisp33@gmail.com",
    external: false,
  },
];

function SocialLinks({ className = "" }) {
  return (
    <nav
      className={`social-links ${className}`.trim()}
      aria-label="Kontak Muhammad Ferdy Oktavian"
    >
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
        >
          <Icon name={link.icon} size={19} />
          <span>{link.label}</span>
        </a>
      ))}
    </nav>
  );
}

export default SocialLinks;
