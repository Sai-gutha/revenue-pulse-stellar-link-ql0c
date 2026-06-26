/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: { incomingRequests: { ignore: [/__lyra_hc/] } },
  output: 'standalone',

  // Reduce build time by skipping type checking (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during Coolify builds — sandbox may have a newer eslint
  // version in package-lock.json than package.json declares, which causes
  // eslint-config-next to report rule conflicts at build time.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize images
  images: {
    unoptimized: true,
  },

  // Allow architect preview domains to load /_next/ dev resources.
  // Without this, Next.js 16's cross-origin protection blocks JS bundles
  // served to iframes on *.architect.new, preventing React from mounting
  // and leaving the page stuck on the server-rendered HTML ("Loading...").
  allowedDevOrigins: [
    'architect.new',
    '**.architect.new',
    '**.e2b.dev',
    'preview--testapp.localhost',
    'preview--testapp.localhost:8090',
  ],

  // Stable since Next.js 15 — no longer under experimental
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-accordion',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-aspect-ratio',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-hover-card',
    '@radix-ui/react-label',
    '@radix-ui/react-menubar',
    '@radix-ui/react-navigation-menu',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-slider',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toggle',
    '@radix-ui/react-toggle-group',
    '@radix-ui/react-tooltip',
    'recharts',
    'date-fns',
  ],
}

module.exports = nextConfig
