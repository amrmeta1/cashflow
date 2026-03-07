import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tadfuq.ai - AI-Powered Cash Flow Management for GCC Enterprises",
  description: "Replace chaotic spreadsheets with AI that cleans your bank data, predicts your cash runway, ring-fences VAT, and automates collections. Built for GCC compliance.",
  keywords: [
    "cash flow management",
    "AI CFO",
    "GCC fintech",
    "treasury management",
    "ZATCA compliance",
    "VAT management",
    "cash forecasting",
    "liquidity management",
    "Saudi Arabia fintech",
    "UAE cash flow",
    "Qatar treasury",
    "Kuwait finance",
    "Bahrain accounting",
    "Oman business",
  ],
  authors: [{ name: "Tadfuq.ai" }],
  creator: "Tadfuq.ai",
  publisher: "Tadfuq.ai",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_SA",
    alternateLocale: ["ar_SA"],
    url: "https://TadFuq.ai",
    title: "Tadfuq.ai - AI-Powered Cash Flow Management for GCC",
    description: "The first AI-native CFO for the GCC. Predict cash flow, automate collections, and ensure ZATCA compliance.",
    siteName: "Tadfuq.ai",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tadfuq.ai - AI Cash Flow Management Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tadfuq.ai - AI-Powered Cash Flow Management",
    description: "Don't just track cash. Predict it. Built for GCC enterprises.",
    images: ["/twitter-image.png"],
    creator: "@tadfuqai",
  },
  alternates: {
    canonical: "https://TadFuq.ai",
    languages: {
      "en-SA": "https://TadFuq.ai",
      "ar-SA": "https://TadFuq.ai/ar",
    },
  },
  verification: {
    google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // other: "your-other-verification-code",
  },
  category: "Finance",
};
