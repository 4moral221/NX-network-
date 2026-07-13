export const PORTAL_URLS = {
  landing: '/',
  pwa: '/app',
  admin: '/admin',
  hub: '/hub',
  partners: '/partners',
  fmcgs: '/fmcgs',
  sim: '/sim',
};

const PROD_DOMAINS: Record<keyof typeof PORTAL_URLS, string> = {
  landing: 'nx-network-landing.vercel.app',
  pwa: 'nx-network-pwa.vercel.app',
  admin: 'nx-network-admin.vercel.app',
  hub: 'nx-network-landing.vercel.app',
  partners: 'nx-network-landing.vercel.app',
  fmcgs: 'nx-network-landing.vercel.app',
  sim: 'nx-network-landing.vercel.app',
};

export const getPortalLink = (key: keyof typeof PORTAL_URLS): string => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname.toLowerCase();
    
    // Check if running on Vercel production
    const isProd = hostname.includes('vercel.app') || 
                   hostname.includes('nx-network') || 
                   hostname.includes('nx-admin');
                   
    if (isProd) {
      const domain = PROD_DOMAINS[key];
      if (domain) {
        // If already on the target domain, return relative path for seamless navigation
        if (hostname === domain.toLowerCase()) {
          return PORTAL_URLS[key];
        }
        // Build the correct absolute production URL
        const relativePath = PORTAL_URLS[key];
        return `https://${domain}${relativePath}`;
      }
    }
  }
  
  // Default to relative paths for local development and AI Studio context
  return PORTAL_URLS[key];
};

