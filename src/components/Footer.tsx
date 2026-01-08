import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">VRM Properties</h3>
            <p className="text-gray-400 text-sm">
              Real estate listings and property sales for homebuyers and investors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/properties" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Property Search
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Agent Registration
                </Link>
              </li>
              <li>
                <Link href="/financing" className="text-gray-400 hover:text-white text-sm transition-colors">
                  VA Financing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: info@vrmproperties.com</li>
              <li>Phone: (555) 123-4567</li>
              <li>Address: 123 Main St, Suite 100</li>
              <li>City, State 12345</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} VRM Properties. All rights reserved.</p>
          <p className="mt-2">
            Demo site for HubSpot sandbox - Marketing campaigns and automation showcase
          </p>
        </div>
      </div>
    </footer>
  );
}
