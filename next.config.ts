import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The prototype moved onto the home page; old links land on it.
  async redirects() {
    return [{ source: "/receipt", destination: "/#solution", permanent: false }];
  },
};

export default nextConfig;
