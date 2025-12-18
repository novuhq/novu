// vite.config.ts
import { sentryVitePlugin } from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/@sentry+vite-plugin@2.22.6_encoding@0.1.13/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import react from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/@vitejs+plugin-react@4.3.1_vite@5.4.2_@types+node@22.15.13_less@4.2.0_lightningcss@1.29_a66210017b927dcc671b5a0e791cd45e/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import tailwindcss from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/tailwindcss@3.4.16_ts-node@10.9.2_@swc+core@1.7.26_@swc+helpers@0.5.15__@types+node@22.15.13_typescript@5.6.2_/node_modules/tailwindcss/lib/index.js";
import { defineConfig, loadEnv } from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/vite@5.4.2_@types+node@22.15.13_less@4.2.0_lightningcss@1.29.2_sass@1.77.8_sugarss@4.0.1_postcss@8.4.47__terser@5.31.6/node_modules/vite/dist/node/index.js";
import { ViteEjsPlugin } from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/vite-plugin-ejs@1.7.0_vite@5.4.2_@types+node@22.15.13_less@4.2.0_lightningcss@1.29.2_sa_0057144b10d71fdd48137130292ee7c4/node_modules/vite-plugin-ejs/index.js";
import { viteStaticCopy } from "file:///Users/dimagrossman/projects/novu/node_modules/.pnpm/vite-plugin-static-copy@1.0.6_vite@5.4.2_@types+node@22.15.13_less@4.2.0_lightningcss@1_afd511e850fd54ea21d79374ab12be92/node_modules/vite-plugin-static-copy/dist/index.js";
var __vite_injected_original_dirname = "/Users/dimagrossman/projects/novu/apps/dashboard";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isSelfHosted = env.VITE_SELF_HOSTED === "true";
  const eeAuthProvider = env.VITE_EE_AUTH_PROVIDER || "clerk";
  const excludeCloudFilesPlugin = () => ({
    name: "exclude-cloud-files",
    enforce: "pre",
    resolveId(source, importer) {
      if (!isSelfHosted && eeAuthProvider !== "better-auth") return null;
      if (importer && (source === "./region-context" || source === "./region-context.tsx" || source.endsWith("/region-context") || source.endsWith("/region-context.tsx"))) {
        if (source.includes("region-context.self-hosted")) {
          return null;
        }
        const selfHostedPath = source.replace(/region-context(\.tsx)?$/, "region-context.self-hosted.tsx");
        return this.resolve(selfHostedPath, importer, { skipSelf: true });
      }
      return null;
    }
  });
  return {
    plugins: [
      excludeCloudFilesPlugin(),
      ViteEjsPlugin((viteConfig) => ({
        // viteConfig is the current Vite resolved config
        env: viteConfig.env
      })),
      react(),
      viteStaticCopy({
        targets: [
          {
            src: path.resolve(__vite_injected_original_dirname, "./legacy") + "/[!.]*",
            dest: "./legacy"
          }
        ]
      }),
      // Put the Sentry vite plugin after all other plugins
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
        authToken: env.SENTRY_AUTH_TOKEN,
        reactComponentAnnotation: { enabled: true },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: ["**/*.js.map"]
        },
        telemetry: false
      })
    ],
    css: {
      postcss: {
        plugins: [tailwindcss()]
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        ...isSelfHosted ? {
          "@clerk/clerk-react": path.resolve(__vite_injected_original_dirname, "./src/utils/self-hosted/index.tsx"),
          "@/context/region": path.resolve(__vite_injected_original_dirname, "./src/context/region/index.self-hosted.ts"),
          "@/components/side-navigation/organization-dropdown-clerk": path.resolve(
            __vite_injected_original_dirname,
            "./src/utils/self-hosted/organization-switcher.tsx"
          )
        } : eeAuthProvider === "better-auth" ? {
          "@clerk/clerk-react": path.resolve(__vite_injected_original_dirname, "./src/utils/better-auth/index.tsx"),
          "@/context/region": path.resolve(__vite_injected_original_dirname, "./src/context/region/index.self-hosted.ts")
        } : {},
        // Explicitly map prettier imports to browser-compatible versions
        "prettier/standalone": path.resolve(__vite_injected_original_dirname, "./node_modules/prettier/standalone.js"),
        "prettier/plugins/html": path.resolve(__vite_injected_original_dirname, "./node_modules/prettier/plugins/html.js"),
        prettier: path.resolve(__vite_injected_original_dirname, "./node_modules/prettier/standalone.js")
      }
    },
    server: {
      port: 4201,
      headers: {
        "Document-Policy": "js-profiling"
      }
    },
    optimizeDeps: {
      include: ["@novu/api"]
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 12e3,
      commonjsOptions: {
        include: [/@novu\/api/, /node_modules/]
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGltYWdyb3NzbWFuL3Byb2plY3RzL25vdnUvYXBwcy9kYXNoYm9hcmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kaW1hZ3Jvc3NtYW4vcHJvamVjdHMvbm92dS9hcHBzL2Rhc2hib2FyZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGltYWdyb3NzbWFuL3Byb2plY3RzL25vdnUvYXBwcy9kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSAnQHNlbnRyeS92aXRlLXBsdWdpbic7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAndGFpbHdpbmRjc3MnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52LCBQbHVnaW4gfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IFZpdGVFanNQbHVnaW4gfSBmcm9tICd2aXRlLXBsdWdpbi1lanMnO1xuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCBlbnYgZmlsZSBiYXNlZCBvbiBgbW9kZWAgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gIC8vIFNldCB0aGUgdGhpcmQgcGFyYW1ldGVyIHRvICcnIHRvIGxvYWQgYWxsIGVudiByZWdhcmRsZXNzIG9mIHRoZSBgVklURV9gIHByZWZpeC5cbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG5cbiAgY29uc3QgaXNTZWxmSG9zdGVkID0gZW52LlZJVEVfU0VMRl9IT1NURUQgPT09ICd0cnVlJztcbiAgY29uc3QgZWVBdXRoUHJvdmlkZXIgPSBlbnYuVklURV9FRV9BVVRIX1BST1ZJREVSIHx8ICdjbGVyayc7XG5cbiAgLy8gUGx1Z2luIHRvIHJlZGlyZWN0IGRpcmVjdCByZWdpb24tY29udGV4dCBpbXBvcnRzIHRvIHNlbGYtaG9zdGVkIHZlcnNpb25cbiAgLy8gVGhpcyBlbnN1cmVzIHdlIHVzZSB0aGUgc2ltcGxlciBzZWxmLWhvc3RlZCB2ZXJzaW9uIGluc3RlYWQgb2YgYnVuZGxpbmcgQ2xlcmstZGVwZW5kZW50IGNsb3VkIGNvZGVcbiAgY29uc3QgZXhjbHVkZUNsb3VkRmlsZXNQbHVnaW4gPSAoKTogUGx1Z2luID0+ICh7XG4gICAgbmFtZTogJ2V4Y2x1ZGUtY2xvdWQtZmlsZXMnLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHJlc29sdmVJZChzb3VyY2UsIGltcG9ydGVyKSB7XG4gICAgICBpZiAoIWlzU2VsZkhvc3RlZCAmJiBlZUF1dGhQcm92aWRlciAhPT0gJ2JldHRlci1hdXRoJykgcmV0dXJuIG51bGw7XG5cbiAgICAgIC8vIFJlZGlyZWN0IGRpcmVjdCBpbXBvcnRzIG9mIHJlZ2lvbi1jb250ZXh0LnRzeCB0byB0aGUgc2VsZi1ob3N0ZWQgdmVyc2lvblxuICAgICAgLy8gVGhlIGFsaWFzIGhhbmRsZXMgQC9jb250ZXh0L3JlZ2lvbiBpbXBvcnRzLCBidXQgZGlyZWN0IHJlbGF0aXZlIGltcG9ydHMgbmVlZCB0aGlzIHBsdWdpblxuICAgICAgaWYgKFxuICAgICAgICBpbXBvcnRlciAmJlxuICAgICAgICAoc291cmNlID09PSAnLi9yZWdpb24tY29udGV4dCcgfHxcbiAgICAgICAgICBzb3VyY2UgPT09ICcuL3JlZ2lvbi1jb250ZXh0LnRzeCcgfHxcbiAgICAgICAgICBzb3VyY2UuZW5kc1dpdGgoJy9yZWdpb24tY29udGV4dCcpIHx8XG4gICAgICAgICAgc291cmNlLmVuZHNXaXRoKCcvcmVnaW9uLWNvbnRleHQudHN4JykpXG4gICAgICApIHtcbiAgICAgICAgLy8gRG9uJ3QgcmVkaXJlY3QgaWYgYWxyZWFkeSBpbXBvcnRpbmcgdGhlIHNlbGYtaG9zdGVkIHZlcnNpb25cbiAgICAgICAgaWYgKHNvdXJjZS5pbmNsdWRlcygncmVnaW9uLWNvbnRleHQuc2VsZi1ob3N0ZWQnKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VsZkhvc3RlZFBhdGggPSBzb3VyY2UucmVwbGFjZSgvcmVnaW9uLWNvbnRleHQoXFwudHN4KT8kLywgJ3JlZ2lvbi1jb250ZXh0LnNlbGYtaG9zdGVkLnRzeCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlKHNlbGZIb3N0ZWRQYXRoLCBpbXBvcnRlciwgeyBza2lwU2VsZjogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgZXhjbHVkZUNsb3VkRmlsZXNQbHVnaW4oKSxcbiAgICAgIFZpdGVFanNQbHVnaW4oKHZpdGVDb25maWcpID0+ICh7XG4gICAgICAgIC8vIHZpdGVDb25maWcgaXMgdGhlIGN1cnJlbnQgVml0ZSByZXNvbHZlZCBjb25maWdcbiAgICAgICAgZW52OiB2aXRlQ29uZmlnLmVudixcbiAgICAgIH0pKSxcbiAgICAgIHJlYWN0KCksXG4gICAgICB2aXRlU3RhdGljQ29weSh7XG4gICAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL2xlZ2FjeScpICsgJy9bIS5dKicsXG4gICAgICAgICAgICBkZXN0OiAnLi9sZWdhY3knLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICAgIC8vIFB1dCB0aGUgU2VudHJ5IHZpdGUgcGx1Z2luIGFmdGVyIGFsbCBvdGhlciBwbHVnaW5zXG4gICAgICBzZW50cnlWaXRlUGx1Z2luKHtcbiAgICAgICAgb3JnOiBlbnYuU0VOVFJZX09SRyxcbiAgICAgICAgcHJvamVjdDogZW52LlNFTlRSWV9QUk9KRUNULFxuICAgICAgICAvLyBBdXRoIHRva2VucyBjYW4gYmUgb2J0YWluZWQgZnJvbSBodHRwczovL3NlbnRyeS5pby9vcmdyZWRpcmVjdC9vcmdhbml6YXRpb25zLzpvcmdzbHVnL3NldHRpbmdzL2F1dGgtdG9rZW5zL1xuICAgICAgICBhdXRoVG9rZW46IGVudi5TRU5UUllfQVVUSF9UT0tFTixcbiAgICAgICAgcmVhY3RDb21wb25lbnRBbm5vdGF0aW9uOiB7IGVuYWJsZWQ6IHRydWUgfSxcbiAgICAgICAgc291cmNlbWFwczoge1xuICAgICAgICAgIGFzc2V0czogJy4vZGlzdC8qKicsXG4gICAgICAgICAgZmlsZXNUb0RlbGV0ZUFmdGVyVXBsb2FkOiBbJyoqLyouanMubWFwJ10sXG4gICAgICAgIH0sXG4gICAgICAgIHRlbGVtZXRyeTogZmFsc2UsXG4gICAgICB9KSxcbiAgICBdLFxuICAgIGNzczoge1xuICAgICAgcG9zdGNzczoge1xuICAgICAgICBwbHVnaW5zOiBbdGFpbHdpbmRjc3MoKV0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLi4uKGlzU2VsZkhvc3RlZFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAnQGNsZXJrL2NsZXJrLXJlYWN0JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzL3NlbGYtaG9zdGVkL2luZGV4LnRzeCcpLFxuICAgICAgICAgICAgICAnQC9jb250ZXh0L3JlZ2lvbic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb250ZXh0L3JlZ2lvbi9pbmRleC5zZWxmLWhvc3RlZC50cycpLFxuICAgICAgICAgICAgICAnQC9jb21wb25lbnRzL3NpZGUtbmF2aWdhdGlvbi9vcmdhbml6YXRpb24tZHJvcGRvd24tY2xlcmsnOiBwYXRoLnJlc29sdmUoXG4gICAgICAgICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICAgICAgICcuL3NyYy91dGlscy9zZWxmLWhvc3RlZC9vcmdhbml6YXRpb24tc3dpdGNoZXIudHN4J1xuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogZWVBdXRoUHJvdmlkZXIgPT09ICdiZXR0ZXItYXV0aCdcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgICdAY2xlcmsvY2xlcmstcmVhY3QnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdXRpbHMvYmV0dGVyLWF1dGgvaW5kZXgudHN4JyksXG4gICAgICAgICAgICAgICAgJ0AvY29udGV4dC9yZWdpb24nOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29udGV4dC9yZWdpb24vaW5kZXguc2VsZi1ob3N0ZWQudHMnKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgbWFwIHByZXR0aWVyIGltcG9ydHMgdG8gYnJvd3Nlci1jb21wYXRpYmxlIHZlcnNpb25zXG4gICAgICAgICdwcmV0dGllci9zdGFuZGFsb25lJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vbm9kZV9tb2R1bGVzL3ByZXR0aWVyL3N0YW5kYWxvbmUuanMnKSxcbiAgICAgICAgJ3ByZXR0aWVyL3BsdWdpbnMvaHRtbCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL25vZGVfbW9kdWxlcy9wcmV0dGllci9wbHVnaW5zL2h0bWwuanMnKSxcbiAgICAgICAgcHJldHRpZXI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL25vZGVfbW9kdWxlcy9wcmV0dGllci9zdGFuZGFsb25lLmpzJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA0MjAxLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnRG9jdW1lbnQtUG9saWN5JzogJ2pzLXByb2ZpbGluZycsXG4gICAgICB9LFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbJ0Bub3Z1L2FwaSddLFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTIwMDAsXG4gICAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgICAgaW5jbHVkZTogWy9Abm92dVxcL2FwaS8sIC9ub2RlX21vZHVsZXMvXSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrVSxTQUFTLHdCQUF3QjtBQUNuVyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8saUJBQWlCO0FBQ3hCLFNBQVMsY0FBYyxlQUF1QjtBQUM5QyxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLHNCQUFzQjtBQU4vQixJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUd4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsUUFBTSxlQUFlLElBQUkscUJBQXFCO0FBQzlDLFFBQU0saUJBQWlCLElBQUkseUJBQXlCO0FBSXBELFFBQU0sMEJBQTBCLE9BQWU7QUFBQSxJQUM3QyxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsSUFDVCxVQUFVLFFBQVEsVUFBVTtBQUMxQixVQUFJLENBQUMsZ0JBQWdCLG1CQUFtQixjQUFlLFFBQU87QUFJOUQsVUFDRSxhQUNDLFdBQVcsc0JB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
