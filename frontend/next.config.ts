import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  ...(isGitHubPages ? { output: "export" as const } : {}),
  trailingSlash: true,
  basePath: isGitHubPages ? "/Vibe" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
