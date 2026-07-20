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
  landing: 'nxnetwork.company',
  pwa: 'app.nxnetwork.company',
  admin: 'admin.nxnetwork.company',
  hub: 'hub.nxnetwork.company',
  partners: 'partners.nxnetwork.company',
  fmcgs: 'fmcg.nxnetwork.company',
  sim: 'sim.nxnetwork.company',
};

export const getPortalLink = (key: keyof typeof PORTAL_URLS): string => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname.toLowerCase();
    
    // Check if running on Vercel production or custom domain
    const isProd = hostname.includes('nxnetwork.company') || 
                   hostname.includes('vercel.app') || 
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

