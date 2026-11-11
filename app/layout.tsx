import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ConnectDrawer } from "@/components/visual/ConnectDrawer";
import { JsonLd } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Rapid Drug Testing for Employers | Labb", template: "%s | Labb" },
  description: site.description,
  applicationName: "Labb",
  openGraph: { type: "website", siteName: "Labb", locale: "en_US", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Labb rapid drug testing" }] },
  twitter: { card: "summary_large_image" },
  // Keeps the existing Google Search Console property verified after the move.
  verification: { google: "2YCpYL0HidDAmCxRYDBt_xTzsLvvo2AOdKVwlXd06L4" },
  robots: process.env.NEXT_PUBLIC_NOINDEX === "true" ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#cf743c", width: "device-width", initialScale: 1 };

const gtm = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {gtm && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
          </Script>
        )}
        <a href="#main" className="skip">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <ConnectDrawer />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${site.url}/#org`,
            name: "Labb",
            legalName: "Ramsey Diagnostics Corporation",
            url: site.url,
            logo: `${site.url}/brand/labb-logo.png`,
            email: site.email,
            telephone: "+1-877-868-9967",
            address: {
              "@type": "PostalAddress",
              streetAddress: site.address.street,
              addressLocality: site.address.city,
              addressRegion: site.address.region,
              postalCode: site.address.postal,
              addressCountry: site.address.country,
            },
            contactPoint: { "@type": "ContactPoint", telephone: "+1-877-868-9967", contactType: "sales", areaServed: "US" },
          }}
        />
      </body>
    </html>
  );
}
