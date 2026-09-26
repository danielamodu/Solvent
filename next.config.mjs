/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No ESLint config in this foundation phase; don't fail the build on lint.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { webpack }) => {
    // Silence optional peer deps pulled in transitively by wagmi/viem.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // ConnectKit imports the full @wagmi/connectors barrel, which pulls in
    // connectors we don't use (Base Account -> @coinbase/cdp-sdk -> optional
    // @x402/* modules, and the MetaMask SDK's React-Native-only async-storage).
    // We only use the injected connector, so these code paths never execute;
    // ignore the unresolved optional imports at bundle time.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(@x402(\/|$)|@react-native-async-storage\/async-storage$)/,
      })
    );
    return config;
  },
};

export default nextConfig;
