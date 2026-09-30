import { ShieldCheck } from "lucide-react";

const FOOTER_COLUMNS = [
  {
    title: "ACADEMIC NETWORK",
    links: [
      { label: "Find Qualified Tutors", to: "/tutors" },
      { label: "Browse Study Groups", to: "/study-groups" },
      { label: "Become a Peer Tutor", to: "/become-tutor" },
      { label: "Course Syllabi Catalog", to: "/syllabi" },
      { label: "Campus Chapters", to: "/chapters" },
    ],
  },
  {
    title: "PLATFORM TRUST",
    links: [
      { label: "Tutor Credentialing", to: "/credentialing" },
      { label: "Academic Integrity Policy", to: "/integrity-policy" },
      { label: "Safety & Community Guidelines", to: "/guidelines" },
      { label: "Student Reviews & Ratings", to: "/reviews" },
      { label: "Dispute Resolution", to: "/disputes" },
    ],
  },
  {
    title: "INSTITUTION & SUPPORT",
    links: [
      { label: "Partner Universities", to: "/partners" },
      { label: "Help & Knowledge Center", to: "/help" },
      { label: "Research & Case Studies", to: "/research" },
      { label: "Accessibility Standards", to: "/accessibility" },
      { label: "Contact Campus Success", to: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-brand-50/60">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-brand-700">TSG</span>
            <span className="text-[11px] font-semibold bg-verified-50 text-verified-600 px-2 py-0.5 rounded-full">
              VERIFIED
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            The authoritative platform connecting university students with
            verified peer tutors and structured peer study circles for
            collaborative academic excellence.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <ShieldCheck size={16} className="text-verified-600" />
            Accredited Higher-Ed Network
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-bold tracking-wide text-slate-900 mb-4">
              {col.title}
            </h4>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.to}
                    className="text-sm text-slate-600 hover:text-brand-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-brand-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} TSG Education Technologies Inc. All
            academic rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="/privacy" className="hover:text-slate-700">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-slate-700">
              Terms of Service
            </a>
            <a href="/ferpa" className="hover:text-slate-700">
              FERPA Compliance
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}