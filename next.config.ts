import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The development badge sits in the bottom left corner and lands in every
   * screenshot and every frame of video recorded against the dev server. It is
   * a development affordance, not part of the product, and it has no business
   * in the documentation.
   */
  devIndicators: false,
};

export default nextConfig;
