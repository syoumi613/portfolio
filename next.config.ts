/** @type {import('next').NextConfig} */
const nextConfig = {
  /* output: 'export' はサーバー機能（API）を使うために削除しました */
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};


export default nextConfig;