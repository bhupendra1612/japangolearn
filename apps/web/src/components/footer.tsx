import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Learn: [
    { href: "/dashboard/levels", label: "JLPT Levels" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About Us" },
  ],
  Legal: [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/disclaimer", label: "Disclaimer" },
  ],
  Connect: [
    { href: "/contact", label: "Contact Us" },
    { href: "mailto:support@japangolearn.com", label: "Email Support" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/japangolearn_logo.webp"
                alt="JapanGoLearn Logo"
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Master Japanese the modern way. Visual learning, gamification, and AI-powered practice
              from N5 to N1.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} JapanGoLearn. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 font-jp">日本語を楽しく学ぼう！</p>
        </div>
      </div>
    </footer>
  );
}
