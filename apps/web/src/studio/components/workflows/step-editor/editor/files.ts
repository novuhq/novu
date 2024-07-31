import { TUNNEL_CODE } from './tunnel.service.const';

export const dynamicFiles = (indexCode: string, reactEmail: string) => {
  return {
    'index.ts': {
      file: {
        contents: indexCode,
      },
    },
    'react-email.tsx': {
      file: {
        contents: reactEmail,
      },
    },
    'tunnel.ts': {
      file: {
        contents: TUNNEL_CODE,
      },
    },
    'package.json': {
      file: {
        contents: `
{
  "name": "example-app",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "@novu/framework": "latest",    
    "@novu/ntfr-client": "^0.0.4", 
    "zod-to-json-schema": "^3.23.0",
    "zod": "^3.23.0",
    "react-email": "^2.1.6",
    "@react-email/components": "^0.0.22",
    "react": "^18.1.0",
    "ws": "^8.11.0"
  },
  "devDependencies": {
    "typescript": "^4.9.5",
    "tsx": "^4.16.2"
  },
  "scripts": {
    "create:tunnel": "tsx tunnel.ts",
    "test": "curl  http://localhost:3111",
    "start": "tsx watch index.ts"
  }
}`,
      },
    },
    'tsconfig.json': {
      file: {
        contents: `{
          "compilerOptions": {
            "target": "ESNext",
            "jsx": "react"
          }
        }`,
      },
    },
    'pnpm-lock.yaml': {
      file: {
        contents: `lockfileVersion: '6.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

dependencies:
  '@novu/framework':
    specifier: latest
    version: 2.0.0-canary.4(express@4.19.2)(zod-to-json-schema@3.23.2)(zod@3.23.8)
  '@novu/ntfr-client':
    specifier: ^0.0.4
    version: 0.0.4
  '@react-email/components':
    specifier: ^0.0.22
    version: 0.0.22(react-dom@18.3.1)(react@18.3.1)
  express:
    specifier: latest
    version: 4.19.2
  react:
    specifier: ^18.1.0
    version: 18.3.1
  react-email:
    specifier: ^2.1.6
    version: 2.1.6(eslint@9.8.0)
  ws:
    specifier: ^8.11.0
    version: 8.18.0
  zod:
    specifier: ^3.23.0
    version: 3.23.8
  zod-to-json-schema:
    specifier: ^3.23.0
    version: 3.23.2(zod@3.23.8)

devDependencies:
  tsx:
    specifier: ^4.16.2
    version: 4.16.2
  typescript:
    specifier: ^4.9.5
    version: 4.9.5

packages:

  /@alloc/quick-lru@5.2.0:
    resolution: {integrity: sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==}
    engines: {node: '>=10'}
    dev: false

  /@ampproject/remapping@2.3.0:
    resolution: {integrity: sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==}
    engines: {node: '>=6.0.0'}
    dependencies:
      '@jridgewell/gen-mapping': 0.3.5
      '@jridgewell/trace-mapping': 0.3.25
    dev: false

  /@babel/code-frame@7.24.7:
    resolution: {integrity: sha512-BcYH1CVJBO9tvyIZ2jVeXgSIMvGZ2FDRvDdOIVQyuklNKSsx+eppDEBq/g47Ayw+RqNFE+URvOShmf+f/qwAlA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/highlight': 7.24.7
      picocolors: 1.0.1
    dev: false

  /@babel/compat-data@7.25.0:
    resolution: {integrity: sha512-P4fwKI2mjEb3ZU5cnMJzvRsRKGBUcs8jvxIoRmr6ufAY9Xk2Bz7JubRTTivkw55c7WQJfTECeqYVa+HZ0FzREg==}
    engines: {node: '>=6.9.0'}
    dev: false

  /@babel/core@7.24.5:
    resolution: {integrity: sha512-tVQRucExLQ02Boi4vdPp49svNGcfL2GhdTCT9aldhXgCJVAI21EtRfBettiuLUwce/7r6bFdgs6JFkcdTiFttA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@ampproject/remapping': 2.3.0
      '@babel/code-frame': 7.24.7
      '@babel/generator': 7.25.0
      '@babel/helper-compilation-targets': 7.24.8
      '@babel/helper-module-transforms': 7.25.0(@babel/core@7.24.5)
      '@babel/helpers': 7.25.0
      '@babel/parser': 7.24.5
      '@babel/template': 7.25.0
      '@babel/traverse': 7.25.1
      '@babel/types': 7.25.0
      convert-source-map: 2.0.0
      debug: 4.3.6
      gensync: 1.0.0-beta.2
      json5: 2.2.3
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@babel/generator@7.25.0:
    resolution: {integrity: sha512-3LEEcj3PVW8pW2R1SR1M89g/qrYk/m/mB/tLqn7dn4sbBUQyTqnlod+II2U4dqiGtUmkcnAmkMDralTFZttRiw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/types': 7.25.0
      '@jridgewell/gen-mapping': 0.3.5
      '@jridgewell/trace-mapping': 0.3.25
      jsesc: 2.5.2
    dev: false

  /@babel/helper-compilation-targets@7.24.8:
    resolution: {integrity: sha512-oU+UoqCHdp+nWVDkpldqIQL/i/bvAv53tRqLG/s+cOXxe66zOYLU7ar/Xs3LdmBihrUMEUhwu6dMZwbNOYDwvw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/compat-data': 7.25.0
      '@babel/helper-validator-option': 7.24.8
      browserslist: 4.23.2
      lru-cache: 5.1.1
      semver: 6.3.1
    dev: false

  /@babel/helper-module-imports@7.24.7:
    resolution: {integrity: sha512-8AyH3C+74cgCVVXow/myrynrAGv+nTVg5vKu2nZph9x7RcRwzmh0VFallJuFTZ9mx6u4eSdXZfcOzSqTUm0HCA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/traverse': 7.25.1
      '@babel/types': 7.25.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@babel/helper-module-transforms@7.25.0(@babel/core@7.24.5):
    resolution: {integrity: sha512-bIkOa2ZJYn7FHnepzr5iX9Kmz8FjIz4UKzJ9zhX3dnYuVW0xul9RuR3skBfoLu+FPTQw90EHW9rJsSZhyLQ3fQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0
    dependencies:
      '@babel/core': 7.24.5
      '@babel/helper-module-imports': 7.24.7
      '@babel/helper-simple-access': 7.24.7
      '@babel/helper-validator-identifier': 7.24.7
      '@babel/traverse': 7.25.1
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@babel/helper-simple-access@7.24.7:
    resolution: {integrity: sha512-zBAIvbCMh5Ts+b86r/CjU+4XGYIs+R1j951gxI3KmmxBMhCg4oQMsv6ZXQ64XOm/cvzfU1FmoCyt6+owc5QMYg==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/traverse': 7.25.1
      '@babel/types': 7.25.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@babel/helper-string-parser@7.24.8:
    resolution: {integrity: sha512-pO9KhhRcuUyGnJWwyEgnRJTSIZHiT+vMD0kPeD+so0l7mxkMT19g3pjY9GTnHySck/hDzq+dtW/4VgnMkippsQ==}
    engines: {node: '>=6.9.0'}
    dev: false

  /@babel/helper-validator-identifier@7.24.7:
    resolution: {integrity: sha512-rR+PBcQ1SMQDDyF6X0wxtG8QyLCgUB0eRAGguqRLfkCA87l7yAP7ehq8SNj96OOGTO8OBV70KhuFYcIkHXOg0w==}
    engines: {node: '>=6.9.0'}
    dev: false

  /@babel/helper-validator-option@7.24.8:
    resolution: {integrity: sha512-xb8t9tD1MHLungh/AIoWYN+gVHaB9kwlu8gffXGSt3FFEIT7RjS+xWbc2vUD1UTZdIpKj/ab3rdqJ7ufngyi2Q==}
    engines: {node: '>=6.9.0'}
    dev: false

  /@babel/helpers@7.25.0:
    resolution: {integrity: sha512-MjgLZ42aCm0oGjJj8CtSM3DB8NOOf8h2l7DCTePJs29u+v7yO/RBX9nShlKMgFnRks/Q4tBAe7Hxnov9VkGwLw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/template': 7.25.0
      '@babel/types': 7.25.0
    dev: false

  /@babel/highlight@7.24.7:
    resolution: {integrity: sha512-EStJpq4OuY8xYfhGVXngigBJRWxftKX9ksiGDnmlY3o7B/V7KIAc9X4oiK87uPJSc/vs5L869bem5fhZa8caZw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/helper-validator-identifier': 7.24.7
      chalk: 2.4.2
      js-tokens: 4.0.0
      picocolors: 1.0.1
    dev: false

  /@babel/parser@7.24.5:
    resolution: {integrity: sha512-EOv5IK8arwh3LI47dz1b0tKUb/1uhHAnHJOrjgtQMIpu1uXd9mlFrJg9IUgGUgZ41Ch0K8REPTYpO7B76b4vJg==}
    engines: {node: '>=6.0.0'}
    hasBin: true
    dependencies:
      '@babel/types': 7.25.0
    dev: false

  /@babel/parser@7.25.0:
    resolution: {integrity: sha512-CzdIU9jdP0dg7HdyB+bHvDJGagUv+qtzZt5rYCWwW6tITNqV9odjp6Qu41gkG0ca5UfdDUWrKkiAnHHdGRnOrA==}
    engines: {node: '>=6.0.0'}
    hasBin: true
    dependencies:
      '@babel/types': 7.25.0
    dev: false

  /@babel/runtime@7.25.0:
    resolution: {integrity: sha512-7dRy4DwXwtzBrPbZflqxnvfxLF8kdZXPkhymtDeFoFqE6ldzjQFgYTtYIFARcLEYDrqfBfYcZt1WqFxRoyC9Rw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      regenerator-runtime: 0.14.1
    dev: false

  /@babel/template@7.25.0:
    resolution: {integrity: sha512-aOOgh1/5XzKvg1jvVz7AVrx2piJ2XBi227DHmbY6y+bM9H2FlN+IfecYu4Xl0cNiiVejlsCri89LUsbj8vJD9Q==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/code-frame': 7.24.7
      '@babel/parser': 7.25.0
      '@babel/types': 7.25.0
    dev: false

  /@babel/traverse@7.25.1:
    resolution: {integrity: sha512-LrHHoWq08ZpmmFqBAzN+hUdWwy5zt7FGa/hVwMcOqW6OVtwqaoD5utfuGYU87JYxdZgLUvktAsn37j/sYR9siA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/code-frame': 7.24.7
      '@babel/generator': 7.25.0
      '@babel/parser': 7.25.0
      '@babel/template': 7.25.0
      '@babel/types': 7.25.0
      debug: 4.3.6
      globals: 11.12.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@babel/types@7.25.0:
    resolution: {integrity: sha512-LcnxQSsd9aXOIgmmSpvZ/1yo46ra2ESYyqLcryaBZOghxy5qqOBjvCWP5JfkI8yl9rlxRgdLTTMCQQRcN2hdCg==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/helper-string-parser': 7.24.8
      '@babel/helper-validator-identifier': 7.24.7
      to-fast-properties: 2.0.0
    dev: false

  /@emotion/is-prop-valid@0.8.8:
    resolution: {integrity: sha512-u5WtneEAr5IDG2Wv65yhunPSMLIpuKsbuOktRojfrEiEvRyC85LgPMZI63cr7NUqT8ZIGdSVg8ZKGxIug4lXcA==}
    requiresBuild: true
    dependencies:
      '@emotion/memoize': 0.7.4
    dev: false
    optional: true

  /@emotion/memoize@0.7.4:
    resolution: {integrity: sha512-Ja/Vfqe3HpuzRsG1oBtWTHk2PGZ7GR+2Vz5iYGelAw8dx32K0y7PjVuxK6z1nMpZOqAFsRUPCkK1YjJ56qJlgw==}
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/aix-ppc64@0.19.11:
    resolution: {integrity: sha512-FnzU0LyE3ySQk7UntJO4+qIiQgI7KoODnZg5xzXIrFJlKd2P2gwHsHY4927xj9y5PJmJSzULiUCWmv7iWnNa7g==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [aix]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/aix-ppc64@0.21.5:
    resolution: {integrity: sha512-1SDgH6ZSPTlggy1yI6+Dbkiz8xzpHJEVAlF/AM1tHPLsf5STom9rwtjE4hKAF20FfXXNTFqEYXyJNWh1GiZedQ==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [aix]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-arm64@0.19.11:
    resolution: {integrity: sha512-aiu7K/5JnLj//KOnOfEZ0D90obUkRzDMyqd/wNAUQ34m4YUPVhRZpnqKV9uqDGxT7cToSDnIHsGooyIczu9T+Q==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/android-arm64@0.21.5:
    resolution: {integrity: sha512-c0uX9VAUBQ7dTDCjq+wdyGLowMdtR/GoC2U5IYk/7D1H1JYC0qseD7+11iMP2mRLN9RcCMRcjC4YMclCzGwS/A==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-arm@0.19.11:
    resolution: {integrity: sha512-5OVapq0ClabvKvQ58Bws8+wkLCV+Rxg7tUVbo9xu034Nm536QTII4YzhaFriQ7rMrorfnFKUsArD2lqKbFY4vw==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/android-arm@0.21.5:
    resolution: {integrity: sha512-vCPvzSjpPHEi1siZdlvAlsPxXl7WbOVUBBAowWug4rJHb68Ox8KualB+1ocNvT5fjv6wpkX6o/iEpbDrf68zcg==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-x64@0.19.11:
    resolution: {integrity: sha512-eccxjlfGw43WYoY9QgB82SgGgDbibcqyDTlk3l3C0jOVHKxrjdc9CTwDUQd0vkvYg5um0OH+GpxYvp39r+IPOg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/android-x64@0.21.5:
    resolution: {integrity: sha512-D7aPRUUNHRBwHxzxRvp856rjUHRFW1SdQATKXH2hqA0kAZb1hKmi02OpYRacl0TxIGz/ZmXWlbZgjwWYaCakTA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/darwin-arm64@0.19.11:
    resolution: {integrity: sha512-ETp87DRWuSt9KdDVkqSoKoLFHYTrkyz2+65fj9nfXsaV3bMhTCjtQfw3y+um88vGRKRiF7erPrh/ZuIdLUIVxQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/darwin-arm64@0.21.5:
    resolution: {integrity: sha512-DwqXqZyuk5AiWWf3UfLiRDJ5EDd49zg6O9wclZ7kUMv2WRFr4HKjXp/5t8JZ11QbQfUS6/cRCKGwYhtNAY88kQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/darwin-x64@0.19.11:
    resolution: {integrity: sha512-fkFUiS6IUK9WYUO/+22omwetaSNl5/A8giXvQlcinLIjVkxwTLSktbF5f/kJMftM2MJp9+fXqZ5ezS7+SALp4g==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/darwin-x64@0.21.5:
    resolution: {integrity: sha512-se/JjF8NlmKVG4kNIuyWMV/22ZaerB+qaSi5MdrXtd6R08kvs2qCN4C09miupktDitvh8jRFflwGFBQcxZRjbw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/freebsd-arm64@0.19.11:
    resolution: {integrity: sha512-lhoSp5K6bxKRNdXUtHoNc5HhbXVCS8V0iZmDvyWvYq9S5WSfTIHU2UGjcGt7UeS6iEYp9eeymIl5mJBn0yiuxA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/freebsd-arm64@0.21.5:
    resolution: {integrity: sha512-5JcRxxRDUJLX8JXp/wcBCy3pENnCgBR9bN6JsY4OmhfUtIHe3ZW0mawA7+RDAcMLrMIZaf03NlQiX9DGyB8h4g==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/freebsd-x64@0.19.11:
    resolution: {integrity: sha512-JkUqn44AffGXitVI6/AbQdoYAq0TEullFdqcMY/PCUZ36xJ9ZJRtQabzMA+Vi7r78+25ZIBosLTOKnUXBSi1Kw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/freebsd-x64@0.21.5:
    resolution: {integrity: sha512-J95kNBj1zkbMXtHVH29bBriQygMXqoVQOQYA+ISs0/2l3T9/kj42ow2mpqerRBxDJnmkUDCaQT/dfNXWX/ZZCQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-arm64@0.19.11:
    resolution: {integrity: sha512-LneLg3ypEeveBSMuoa0kwMpCGmpu8XQUh+mL8XXwoYZ6Be2qBnVtcDI5azSvh7vioMDhoJFZzp9GWp9IWpYoUg==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-arm64@0.21.5:
    resolution: {integrity: sha512-ibKvmyYzKsBeX8d8I7MH/TMfWDXBF3db4qM6sy+7re0YXya+K1cem3on9XgdT2EQGMu4hQyZhan7TeQ8XkGp4Q==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-arm@0.19.11:
    resolution: {integrity: sha512-3CRkr9+vCV2XJbjwgzjPtO8T0SZUmRZla+UL1jw+XqHZPkPgZiyWvbDvl9rqAN8Zl7qJF0O/9ycMtjU67HN9/Q==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-arm@0.21.5:
    resolution: {integrity: sha512-bPb5AHZtbeNGjCKVZ9UGqGwo8EUu4cLq68E95A53KlxAPRmUyYv2D6F0uUI65XisGOL1hBP5mTronbgo+0bFcA==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-ia32@0.19.11:
    resolution: {integrity: sha512-caHy++CsD8Bgq2V5CodbJjFPEiDPq8JJmBdeyZ8GWVQMjRD0sU548nNdwPNvKjVpamYYVL40AORekgfIubwHoA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-ia32@0.21.5:
    resolution: {integrity: sha512-YvjXDqLRqPDl2dvRODYmmhz4rPeVKYvppfGYKSNGdyZkA01046pLWyRKKI3ax8fbJoK5QbxblURkwK/MWY18Tg==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-loong64@0.19.11:
    resolution: {integrity: sha512-ppZSSLVpPrwHccvC6nQVZaSHlFsvCQyjnvirnVjbKSHuE5N24Yl8F3UwYUUR1UEPaFObGD2tSvVKbvR+uT1Nrg==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-loong64@0.21.5:
    resolution: {integrity: sha512-uHf1BmMG8qEvzdrzAqg2SIG/02+4/DHB6a9Kbya0XDvwDEKCoC8ZRWI5JJvNdUjtciBGFQ5PuBlpEOXQj+JQSg==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-mips64el@0.19.11:
    resolution: {integrity: sha512-B5x9j0OgjG+v1dF2DkH34lr+7Gmv0kzX6/V0afF41FkPMMqaQ77pH7CrhWeR22aEeHKaeZVtZ6yFwlxOKPVFyg==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-mips64el@0.21.5:
    resolution: {integrity: sha512-IajOmO+KJK23bj52dFSNCMsz1QP1DqM6cwLUv3W1QwyxkyIWecfafnI555fvSGqEKwjMXVLokcV5ygHW5b3Jbg==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-ppc64@0.19.11:
    resolution: {integrity: sha512-MHrZYLeCG8vXblMetWyttkdVRjQlQUb/oMgBNurVEnhj4YWOr4G5lmBfZjHYQHHN0g6yDmCAQRR8MUHldvvRDA==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-ppc64@0.21.5:
    resolution: {integrity: sha512-1hHV/Z4OEfMwpLO8rp7CvlhBDnjsC3CttJXIhBi+5Aj5r+MBvy4egg7wCbe//hSsT+RvDAG7s81tAvpL2XAE4w==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-riscv64@0.19.11:
    resolution: {integrity: sha512-f3DY++t94uVg141dozDu4CCUkYW+09rWtaWfnb3bqe4w5NqmZd6nPVBm+qbz7WaHZCoqXqHz5p6CM6qv3qnSSQ==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-riscv64@0.21.5:
    resolution: {integrity: sha512-2HdXDMd9GMgTGrPWnJzP2ALSokE/0O5HhTUvWIbD3YdjME8JwvSCnNGBnTThKGEB91OZhzrJ4qIIxk/SBmyDDA==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-s390x@0.19.11:
    resolution: {integrity: sha512-A5xdUoyWJHMMlcSMcPGVLzYzpcY8QP1RtYzX5/bS4dvjBGVxdhuiYyFwp7z74ocV7WDc0n1harxmpq2ePOjI0Q==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-s390x@0.21.5:
    resolution: {integrity: sha512-zus5sxzqBJD3eXxwvjN1yQkRepANgxE9lgOW2qLnmr8ikMTphkjgXu1HR01K4FJg8h1kEEDAqDcZQtbrRnB41A==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-x64@0.19.11:
    resolution: {integrity: sha512-grbyMlVCvJSfxFQUndw5mCtWs5LO1gUlwP4CDi4iJBbVpZcqLVT29FxgGuBJGSzyOxotFG4LoO5X+M1350zmPA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/linux-x64@0.21.5:
    resolution: {integrity: sha512-1rYdTpyv03iycF1+BhzrzQJCdOuAOtaqHTWJZCWvijKD2N5Xu0TtVC8/+1faWqcP9iBCWOmjmhoH94dH82BxPQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/netbsd-x64@0.19.11:
    resolution: {integrity: sha512-13jvrQZJc3P230OhU8xgwUnDeuC/9egsjTkXN49b3GcS5BKvJqZn86aGM8W9pd14Kd+u7HuFBMVtrNGhh6fHEQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/netbsd-x64@0.21.5:
    resolution: {integrity: sha512-Woi2MXzXjMULccIwMnLciyZH4nCIMpWQAs049KEeMvOcNADVxo0UBIQPfSmxB3CWKedngg7sWZdLvLczpe0tLg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/openbsd-x64@0.19.11:
    resolution: {integrity: sha512-ysyOGZuTp6SNKPE11INDUeFVVQFrhcNDVUgSQVDzqsqX38DjhPEPATpid04LCoUr2WXhQTEZ8ct/EgJCUDpyNw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/openbsd-x64@0.21.5:
    resolution: {integrity: sha512-HLNNw99xsvx12lFBUwoT8EVCsSvRNDVxNpjZ7bPn947b8gJPzeHWyNVhFsaerc0n3TsbOINvRP2byTZ5LKezow==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/sunos-x64@0.19.11:
    resolution: {integrity: sha512-Hf+Sad9nVwvtxy4DXCZQqLpgmRTQqyFyhT3bZ4F2XlJCjxGmRFF0Shwn9rzhOYRB61w9VMXUkxlBy56dk9JJiQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/sunos-x64@0.21.5:
    resolution: {integrity: sha512-6+gjmFpfy0BHU5Tpptkuh8+uw3mnrvgs+dSPQXQOv3ekbordwnzTVEb4qnIvQcYXq6gzkyTnoZ9dZG+D4garKg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-arm64@0.19.11:
    resolution: {integrity: sha512-0P58Sbi0LctOMOQbpEOvOL44Ne0sqbS0XWHMvvrg6NE5jQ1xguCSSw9jQeUk2lfrXYsKDdOe6K+oZiwKPilYPQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/win32-arm64@0.21.5:
    resolution: {integrity: sha512-Z0gOTd75VvXqyq7nsl93zwahcTROgqvuAcYDUr+vOv8uHhNSKROyU961kgtCD1e95IqPKSQKH7tBTslnS3tA8A==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-ia32@0.19.11:
    resolution: {integrity: sha512-6YOrWS+sDJDmshdBIQU+Uoyh7pQKrdykdefC1avn76ss5c+RN6gut3LZA4E2cH5xUEp5/cA0+YxRaVtRAb0xBg==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/win32-ia32@0.21.5:
    resolution: {integrity: sha512-SWXFF1CL2RVNMaVs+BBClwtfZSvDgtL//G/smwAc5oVK/UPu2Gu9tIaRgFmYFFKrmg3SyAjSrElf0TiJ1v8fYA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-x64@0.19.11:
    resolution: {integrity: sha512-vfkhltrjCAb603XaFhqhAF4LGDi2M4OrCRrFusyQ+iTLQ/o60QQXxc9cZC/FFpihBI9N1Grn6SMKVJ4KP7Fuiw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/win32-x64@0.21.5:
    resolution: {integrity: sha512-tQd/1efJuzPC6rCFwEvLtci/xNFcTZknmXs98FYDfGE4wP9ClFV98nyKrzJKVPMhdDnjzLhdUyMX4PsQAPjwIw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@eslint-community/eslint-utils@4.4.0(eslint@9.8.0):
    resolution: {integrity: sha512-1/sA4dwrzBAyeUoQ6oxahHKmrZvsnLCg4RfxW3ZFGGmQkSNQPFNLV9CUEFQP1x9EYXHTo5p6xdhZM1Ne9p/AfA==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0
    dependencies:
      eslint: 9.8.0
      eslint-visitor-keys: 3.4.3
    dev: false

  /@eslint-community/regexpp@4.11.0:
    resolution: {integrity: sha512-G/M/tIiMrTAxEWRfLfQJMmGNX28IxBg4PBz8XqQhqUHLFI6TL2htpIB1iQCj144V5ee/JaKyT9/WZ0MGZWfA7A==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}
    dev: false

  /@eslint/config-array@0.17.1:
    resolution: {integrity: sha512-BlYOpej8AQ8Ev9xVqroV7a02JK3SkBAaN9GfMMH9W6Ch8FlQlkjGw4Ir7+FgYwfirivAf4t+GtzuAxqfukmISA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@eslint/object-schema': 2.1.4
      debug: 4.3.6
      minimatch: 3.1.2
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@eslint/eslintrc@3.1.0:
    resolution: {integrity: sha512-4Bfj15dVJdoy3RfZmmo86RK1Fwzn6SstsvK9JS+BaVKqC6QQQQyXekNaC+g+LKNgkQ+2VhGAzm6hO40AhMR3zQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      ajv: 6.12.6
      debug: 4.3.6
      espree: 10.1.0
      globals: 14.0.0
      ignore: 5.3.1
      import-fresh: 3.3.0
      js-yaml: 4.1.0
      minimatch: 3.1.2
      strip-json-comments: 3.1.1
    transitivePeerDependencies:
      - supports-color
    dev: false

  /@eslint/js@9.8.0:
    resolution: {integrity: sha512-MfluB7EUfxXtv3i/++oh89uzAr4PDI4nn201hsp+qaXqsjAWzinlZEHEfPgAX4doIlKvPG/i0A9dpKxOLII8yA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: false

  /@eslint/object-schema@2.1.4:
    resolution: {integrity: sha512-BsWiH1yFGjXXS2yvrf5LyuoSIIbPrGUWob917o+BTKuZ7qJdxX8aJLRxs1fS9n6r7vESrq1OUqb68dANcFXuQQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: false

  /@floating-ui/core@1.6.5:
    resolution: {integrity: sha512-8GrTWmoFhm5BsMZOTHeGD2/0FLKLQQHvO/ZmQga4tKempYRLz8aqJGqXVuQgisnMObq2YZ2SgkwctN1LOOxcqA==}
    dependencies:
      '@floating-ui/utils': 0.2.5
    dev: false

  /@floating-ui/dom@1.6.8:
    resolution: {integrity: sha512-kx62rP19VZ767Q653wsP1XZCGIirkE09E0QUGNYTM/ttbbQHqcGPdSfWFxUyyNLc/W6aoJRBajOSXhP6GXjC0Q==}
    dependencies:
      '@floating-ui/core': 1.6.5
      '@floating-ui/utils': 0.2.5
    dev: false

  /@floating-ui/react-dom@2.1.1(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-4h84MJt3CHrtG18mGsXuLCHMrug49d7DFkU0RMIyshRveBeyV2hmV/pDaF2Uxtu8kgq5r46llp5E5FQiR0K2Yg==}
    peerDependencies:
      react: '>=16.8.0'
      react-dom: '>=16.8.0'
    dependencies:
      '@floating-ui/dom': 1.6.8
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@floating-ui/utils@0.2.5:
    resolution: {integrity: sha512-sTcG+QZ6fdEUObICavU+aB3Mp8HY4n14wYHdxK4fXjPmv3PXZZeY5RaguJmGyeH/CJQhX3fqKUtS4qc1LoHwhQ==}
    dev: false

  /@humanwhocodes/module-importer@1.0.1:
    resolution: {integrity: sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==}
    engines: {node: '>=12.22'}
    dev: false

  /@humanwhocodes/momoa@2.0.4:
    resolution: {integrity: sha512-RE815I4arJFtt+FVeU1Tgp9/Xvecacji8w/V6XtXsWWH/wz/eNkNbhb+ny/+PlVZjV0rxQpRSQKNKE3lcktHEA==}
    engines: {node: '>=10.10.0'}
    dev: false

  /@humanwhocodes/retry@0.3.0:
    resolution: {integrity: sha512-d2CGZR2o7fS6sWB7DG/3a95bGKQyHMACZ5aW8qGkkqQpUoZV6C0X7Pc7l4ZNMZkfNBf4VWNe9E1jRsf0G146Ew==}
    engines: {node: '>=18.18'}
    dev: false

  /@isaacs/cliui@8.0.2:
    resolution: {integrity: sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==}
    engines: {node: '>=12'}
    dependencies:
      string-width: 5.1.2
      string-width-cjs: /string-width@4.2.3
      strip-ansi: 7.1.0
      strip-ansi-cjs: /strip-ansi@6.0.1
      wrap-ansi: 8.1.0
      wrap-ansi-cjs: /wrap-ansi@7.0.0
    dev: false

  /@jridgewell/gen-mapping@0.3.5:
    resolution: {integrity: sha512-IzL8ZoEDIBRWEzlCcRhOaCupYyN5gdIK+Q6fbFdPDg6HqX6jpkItn7DFIpW9LQzXG6Df9sA7+OKnq0qlz/GaQg==}
    engines: {node: '>=6.0.0'}
    dependencies:
      '@jridgewell/set-array': 1.2.1
      '@jridgewell/sourcemap-codec': 1.5.0
      '@jridgewell/trace-mapping': 0.3.25
    dev: false

  /@jridgewell/resolve-uri@3.1.2:
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}
    dev: false

  /@jridgewell/set-array@1.2.1:
    resolution: {integrity: sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==}
    engines: {node: '>=6.0.0'}
    dev: false

  /@jridgewell/source-map@0.3.6:
    resolution: {integrity: sha512-1ZJTZebgqllO79ue2bm3rIGud/bOe0pP5BjSRCRxxYkEZS8STV7zN84UBbiYu7jy+eCKSnVIUgoWWE/tt+shMQ==}
    dependencies:
      '@jridgewell/gen-mapping': 0.3.5
      '@jridgewell/trace-mapping': 0.3.25
    dev: false

  /@jridgewell/sourcemap-codec@1.5.0:
    resolution: {integrity: sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==}
    dev: false

  /@jridgewell/trace-mapping@0.3.25:
    resolution: {integrity: sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==}
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.0
    dev: false

  /@next/env@14.1.4:
    resolution: {integrity: sha512-e7X7bbn3Z6DWnDi75UWn+REgAbLEqxI8Tq2pkFOFAMpWAWApz/YCUhtWMWn410h8Q2fYiYL7Yg5OlxMOCfFjJQ==}
    dev: false

  /@next/swc-darwin-arm64@14.1.4:
    resolution: {integrity: sha512-ubmUkbmW65nIAOmoxT1IROZdmmJMmdYvXIe8211send9ZYJu+SqxSnJM4TrPj9wmL6g9Atvj0S/2cFmMSS99jg==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-darwin-x64@14.1.4:
    resolution: {integrity: sha512-b0Xo1ELj3u7IkZWAKcJPJEhBop117U78l70nfoQGo4xUSvv0PJSTaV4U9xQBLvZlnjsYkc8RwQN1HoH/oQmLlQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-linux-arm64-gnu@14.1.4:
    resolution: {integrity: sha512-457G0hcLrdYA/u1O2XkRMsDKId5VKe3uKPvrKVOyuARa6nXrdhJOOYU9hkKKyQTMru1B8qEP78IAhf/1XnVqKA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-linux-arm64-musl@14.1.4:
    resolution: {integrity: sha512-l/kMG+z6MB+fKA9KdtyprkTQ1ihlJcBh66cf0HvqGP+rXBbOXX0dpJatjZbHeunvEHoBBS69GYQG5ry78JMy3g==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-linux-x64-gnu@14.1.4:
    resolution: {integrity: sha512-BapIFZ3ZRnvQ1uWbmqEGJuPT9cgLwvKtxhK/L2t4QYO7l+/DxXuIGjvp1x8rvfa/x1FFSsipERZK70pewbtJtw==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-linux-x64-musl@14.1.4:
    resolution: {integrity: sha512-mqVxTwk4XuBl49qn2A5UmzFImoL1iLm0KQQwtdRJRKl21ylQwwGCxJtIYo2rbfkZHoSKlh/YgztY0qH3wG1xIg==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-win32-arm64-msvc@14.1.4:
    resolution: {integrity: sha512-xzxF4ErcumXjO2Pvg/wVGrtr9QQJLk3IyQX1ddAC/fi6/5jZCZ9xpuL9Tzc4KPWMFq8GGWFVDMshZOdHGdkvag==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-win32-ia32-msvc@14.1.4:
    resolution: {integrity: sha512-WZiz8OdbkpRw6/IU/lredZWKKZopUMhcI2F+XiMAcPja0uZYdMTZQRoQ0WZcvinn9xZAidimE7tN9W5v9Yyfyw==}
    engines: {node: '>= 10'}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@next/swc-win32-x64-msvc@14.1.4:
    resolution: {integrity: sha512-4Rto21sPfw555sZ/XNLqfxDUNeLhNYGO2dlPqsnuCg8N8a2a9u1ltqBOPQ4vj1Gf7eJC0W2hHG2eYUHuiXgY2w==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@nodelib/fs.scandir@2.1.5:
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0
    dev: false

  /@nodelib/fs.stat@2.0.5:
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}
    dev: false

  /@nodelib/fs.walk@1.2.8:
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.17.1
    dev: false

  /@novu/framework@2.0.0-canary.4(express@4.19.2)(zod-to-json-schema@3.23.2)(zod@3.23.8):
    resolution: {integrity: sha512-EZ4UwdyuU6lk+7KPqoa42DjfgI5xIxLpYbIRxbYkeiU5HS9hI59OUXMOdwNGlScgMfyoKZTosVfpY6QZ5cS8eA==}
    requiresBuild: true
    peerDependencies:
      '@sveltejs/kit': '>=1.27.3'
      '@vercel/node': '>=2.15.9'
      aws-lambda: '>=1.0.7'
      express: '>=4.19.2'
      fastify: '*'
      h3: '>=1.8.1'
      next: '>=12.0.0'
      zod: '>=3.0.0'
      zod-to-json-schema: '>=3.0.0'
    peerDependenciesMeta:
      '@sveltejs/kit':
        optional: true
      '@vercel/node':
        optional: true
      aws-lambda:
        optional: true
      express:
        optional: true
      fastify:
        optional: true
      h3:
        optional: true
      next:
        optional: true
      zod:
        optional: true
      zod-to-json-schema:
        optional: true
    dependencies:
      '@novu/shared': 2.0.0-canary.0
      ajv: 8.17.1
      ajv-formats: 2.1.1(ajv@8.17.1)
      better-ajv-errors: 1.2.0(ajv@8.17.1)
      chalk: 4.1.2
      cross-fetch: 4.0.0
      express: 4.19.2
      json-schema-faker: 0.5.6
      json-schema-to-ts: 3.1.0
      liquidjs: 10.16.1
      ora: 5.4.1
      sanitize-html: 2.13.0
      zod: 3.23.8
      zod-to-json-schema: 3.23.2(zod@3.23.8)
    transitivePeerDependencies:
      - encoding
    dev: false

  /@novu/ntfr-client@0.0.4:
    resolution: {integrity: sha512-/9q+qGFHHFwMsuqoLwTADMjSx2JPagpJpm7jOZRzQZgSEDg9kwNAhADneRzVYhMyjdEXIQyjTmX/oP8ABAavFw==}
    engines: {node: '>=18.0.0'}
    dependencies:
      https: 1.0.0
      node-fetch: 3.3.2
      partysocket: 0.0.17
      proxy-agent: 6.4.0
      ws: 8.18.0
      zod: 3.22.3
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /@novu/shared@2.0.0-canary.0:
    resolution: {integrity: sha512-G5BlBXcpi4XGGmDS852bdyrBx9zalW8MHZ5ZdxWq5K5r9VX+cUp+3OI0kHMtLE2rR7Zl43ERCJelmO9Fxqc4Uw==}
    dependencies:
      class-transformer: 0.5.1
      class-validator: 0.14.0
    dev: false

  /@one-ini/wasm@0.1.1:
    resolution: {integrity: sha512-XuySG1E38YScSJoMlqovLru4KTUNSjgVTIjyh7qMX6aNN5HY5Ct5LhRJdxO79JtTzKfzV/bnWpz+zquYrISsvw==}
    dev: false

  /@pkgjs/parseargs@0.11.0:
    resolution: {integrity: sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==}
    engines: {node: '>=14'}
    requiresBuild: true
    dev: false
    optional: true

  /@radix-ui/colors@1.0.1:
    resolution: {integrity: sha512-xySw8f0ZVsAEP+e7iLl3EvcBXX7gsIlC1Zso/sPBW9gIWerBTgz6axrjU+MZ39wD+WFi5h5zdWpsg3+hwt2Qsg==}
    dev: false

  /@radix-ui/primitive@1.1.0:
    resolution: {integrity: sha512-4Z8dn6Upk0qk4P74xBhZ6Hd/w0mPEzOOLxy4xiPXOXqjF7jZS0VAKk7/x/H6FyY2zCkYJqePf1G5KmkmNJ4RBA==}
    dev: false

  /@radix-ui/react-arrow@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-FmlW1rCg7hBpEBwFbjHwCW6AmWLQM6g/v0Sn8XbP9NvmSZ2San1FpQeyPtufzOMSIx7Y4dzjlHoifhp+7NkZhw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-collapsible@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-zQY7Epa8sTL0mq4ajSJpjgn2YmCgyrG7RsQgLp3C0LQVkG7+Tf6Pv1CeNWZLyqMjhdPkBa5Lx7wYBeSu7uCSTA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-presence': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-collection@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-GZsZslMJEyo1VKm5L1ZJY8tGDxZNPAoUeQUIbKeJfoi7Q4kmig5AsgLMYYuyYbfjd8fBmFORAIwYAkXMnXZgZw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-compose-refs@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-b4inOtiaOnYf9KWyO3jAeeCG6FeyfY6ldiEPanbUjWd+xIk5wZeHa8yVwmrJ2vderhu/BQvzCrJI0lHd+wIiqw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-context@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-direction@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-BUuBvgThEiAXh2DWu93XsT+a3aWrGqolGlqqw5VU1kG7p/ZH2cuDlM1sRLNnY3QcBS69UIz2mcKhMxDsdewhjg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-dismissable-layer@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-/UovfmmXGptwGcBQawLzvn2jOfM0t4z3/uKffoBlj724+n3FvBbZ7M0aaBOmkp6pqFYpO4yx8tSVJjx3Fl2jig==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-escape-keydown': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-focus-guards@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-w6XZNUPVv6xCpZUqb/yN9DL6auvpGX3C/ee6Hdi16v2UUy25HV2Q5bcflsiDyT/g5RwbPQ/GIT1vLkeRb+ITBw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-focus-scope@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-200UD8zylvEyL8Bx+z76RJnASR2gRMuxlgFCPAe/Q/679a/r0eK3MBVYMb7vZODZcffZBdob1EGnky78xmVvcA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-id@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-EJUrI8yYh7WOjNOqpoJaf1jlFIH2LvtgAl+YcFqNCa+4hj64ZXmPkAKOFs/ukjz3byN6bdb/AVUqHkI8/uWWMA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-popover@1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-3y1A3isulwnWhvTTwmIreiB8CF4L+qRjZnK1wYLO7pplddzXKby/GnZ2M7OZY3qgnl6p9AodUIHRYGXNah8Y7g==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-dismissable-layer': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-focus-guards': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-focus-scope': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-popper': 1.2.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-portal': 1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-presence': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      aria-hidden: 1.2.4
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      react-remove-scroll: 2.5.7(@types/react@18.2.47)(react@18.3.1)
    dev: false

  /@radix-ui/react-popper@1.2.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-ZnRMshKF43aBxVWPWvbj21+7TQCvhuULWJ4gNIKYpRlQt5xGRhLx66tMp8pya2UkGHTSlhpXwmjqltDYHhw7Vg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@floating-ui/react-dom': 2.1.1(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-arrow': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-rect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-size': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/rect': 1.1.0
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-portal@1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-A3UtLk85UtqhzFqtoC8Q0KvR2GbXF3mtPgACSazajqq6A41mEQgo53iPzY4i6BwDxlIFqWIhiQ2G729n+2aw/g==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-presence@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-Gq6wuRN/asf9H/E/VzdKoUtT8GC9PQc9z40/vEr0VCJ4u5XvvhWIrSsCB6vD2/cH7ugTdSfYq9fLJCcM00acrQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-primitive@2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-ZSpFm0/uHa8zTvKBDjLFWLo8dkr4MBsiDLz0g3gMUwqgLHz9rTaRRGYDgvZPtBJgYCBKXkS9fzmoySgr8CO6Cw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-roving-focus@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-EA6AMGeq9AEeQDeSH0aZgG198qkfHSbvWTf1HvoDmOB5bBG/qTxjYMWUKMnYiV6J/iP/J8MEFSuB2zRU2n7ODA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-collection': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-direction': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-slot@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-FUCf5XMfmW4dtYl69pdS4DbxKy8nj4M7SafBgPllysxmdachynNflAdp/gCsnYWNDnge6tI9onzMp5ARYc1KNw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-toggle-group@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-PpTJV68dZU2oqqgq75Uzto5o/XfOVgkrJ9rulVmfTKxWp3HfUjHE6CP/WLRR4AzPX9HWxw7vFow2me85Yu+Naw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-direction': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-roving-focus': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-toggle': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-toggle@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-gwoxaKZ0oJ4vIgzsfESBuSgJNdc0rv12VhHgcqN0TEJmmZixXG/2XpsLK8kzNWYcnaoRIEEQc0bEi3dIvdUpjw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-tooltip@1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-LLE8nzNE4MzPMw3O2zlVlkLFid3y9hMUs7uCbSHyKSo+tCN4yMCf+ZCCcfrYgsOC0TiHBPQ1mtpJ2liY3ZT3SQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/primitive': 1.1.0
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-context': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-dismissable-layer': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-popper': 1.2.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-portal': 1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-presence': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-visually-hidden': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/react-use-callback-ref@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-CasTfvsy+frcFkbXtSJ2Zu9JHpN8TYKxkgJGWbjiZhFivxaeW7rMeZt7QELGVLaYVfFMsKHjb7Ak0nMEe+2Vfw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-use-controllable-state@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-MtfMVJiSr2NjzS0Aa90NPTnvTSg6C/JLCV7ma0W6+OMV78vd8OyRpID+Ng9LxzsPbLeuBnWBA1Nq30AtBIDChw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-use-escape-keydown@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-L7vwWlR1kTTQ3oh7g1O0CBF3YCyyTj8NmhLR+phShpyA50HCfBFKVJTpshm9PzLiKmehsrQzTYTpX9HvmC9rhw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-use-layout-effect@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-+FPE0rOdziWSrH9athwI1R0HDVbWlEhd+FR+aSDk4uWGmSJ9Z54sdZVDQPZAinJhJXwfT+qnj969mCsT2gfm5w==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-use-rect@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-0Fmkebhr6PiseyZlYAOtLS+nb7jLmpqTrJyv61Pe68MKYW6OWdRE2kI70TaYY27u7H0lajqM3hSMMLFq18Z7nQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/rect': 1.1.0
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-use-size@1.1.0(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-XW3/vWuIXHa+2Uwcc2ABSfcCledmXhhQPlGbfcRXbiUQI5Icjcg19BGCZVKKInYbvUCut/ufbbLLPFC5cbb1hw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@types/react': 18.2.47
      react: 18.3.1
    dev: false

  /@radix-ui/react-visually-hidden@1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-N8MDZqtgCgG5S3aV60INAB475osJousYpZ4cTJ2cFbMpdHS5Y6loLTH8LPtkj2QN0x93J30HT/M3qJXM0+lyeQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true
    dependencies:
      '@radix-ui/react-primitive': 2.0.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /@radix-ui/rect@1.1.0:
    resolution: {integrity: sha512-A9+lCBZoaMJlVKcRBz2YByCG+Cp2t6nAnMnNba+XiWxnj6r4JUFqfsgwocMBZU9LPtdxC6wB56ySYpc7LQIoJg==}
    dev: false

  /@react-email/body@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-bSGF6j+MbfQKYnnN+Kf57lGp/J+ci+435OMIv/BKAtfmNzHL+ptRrsINJELiO8QzwnZmQjTGKSMAMMJiQS+xwQ==}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/button@0.0.16(react@18.3.1):
    resolution: {integrity: sha512-paptUerzDhKHEUmBuT0UecCoqo3N6ZQSyDKC1hFALTwKReGW2xQATisinho9Ybh9ZGw6IZ3n1nGtmX5k2sX70Q==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/code-block@0.0.6(react@18.3.1):
    resolution: {integrity: sha512-i+TEeI7AyG1pmtO2Mr+TblV08zQnOtTlYB/v45kFMlDWWKTkvIV33oLRqLYOFhCIvoO5fDZA9T+4m6PvhmcNwQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      prismjs: 1.29.0
      react: 18.3.1
    dev: false

  /@react-email/code-inline@0.0.3(react@18.3.1):
    resolution: {integrity: sha512-SY5Nn4KhjcqqEBHvUwFlOLNmUT78elIGR+Y14eg02LrVKQJ38mFCfXNGDLk4wbP/2dnidkLYq9+60nf7mFMhnQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/column@0.0.11(react@18.3.1):
    resolution: {integrity: sha512-KvrPuQFn0hlItRRL3vmRuOJgKG+8I0oO9HM5ReLMi5Ns313JSEQogCJaXuOEFkOVeuu5YyY6zy/+5Esccc1AxQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/components@0.0.22(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-GO6F+fS3c3aQ6OnqL8esQ/KqtrPGwz80U6uQ8Nd/ETpgFt7y1PXvSGfr8v12wyLffAagdowc/JjoThfIr0L6aA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      '@react-email/body': 0.0.9(react@18.3.1)
      '@react-email/button': 0.0.16(react@18.3.1)
      '@react-email/code-block': 0.0.6(react@18.3.1)
      '@react-email/code-inline': 0.0.3(react@18.3.1)
      '@react-email/column': 0.0.11(react@18.3.1)
      '@react-email/container': 0.0.13(react@18.3.1)
      '@react-email/font': 0.0.7(react@18.3.1)
      '@react-email/head': 0.0.10(react@18.3.1)
      '@react-email/heading': 0.0.13(react@18.3.1)
      '@react-email/hr': 0.0.9(react@18.3.1)
      '@react-email/html': 0.0.9(react@18.3.1)
      '@react-email/img': 0.0.9(react@18.3.1)
      '@react-email/link': 0.0.9(react@18.3.1)
      '@react-email/markdown': 0.0.11(react@18.3.1)
      '@react-email/preview': 0.0.10(react@18.3.1)
      '@react-email/render': 0.0.17(react-dom@18.3.1)(react@18.3.1)
      '@react-email/row': 0.0.9(react@18.3.1)
      '@react-email/section': 0.0.13(react@18.3.1)
      '@react-email/tailwind': 0.0.19(react@18.3.1)
      '@react-email/text': 0.0.9(react@18.3.1)
      react: 18.3.1
    transitivePeerDependencies:
      - '@types/react'
      - react-dom
    dev: false

  /@react-email/container@0.0.13(react@18.3.1):
    resolution: {integrity: sha512-ftke0N1FZl8MX3XXxXiiOaiJOnrQz7ZXUyqNj81K+BK+DePWIVaSmgK6Bu8fFnsgwdKuBdqjZTEtF4sIkU3FuQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/font@0.0.7(react@18.3.1):
    resolution: {integrity: sha512-R0/mfUV/XcUQIALjZUFT9GP+XGmIP1KPz20h9rpS5e4ji6VkQ3ENWlisxrdK5U+KA9iZQrlan+/6tUoTJ9bFsg==}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/head@0.0.10(react@18.3.1):
    resolution: {integrity: sha512-VoH399w0/i3dJFnwH0Ixf9BTuiWhSA/y8PpsCJ7CPw8Mv8WNBqMAAsw0rmrITYI8uPd15LZ2zk2uwRDvqasMRw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/heading@0.0.13(react@18.3.1):
    resolution: {integrity: sha512-MYDzjJwljKHBLueLuyqkaHxu6N4aGOL1ms2NNyJ9WXC9mmBnLs4Y/QEf9SjE4Df3AW4iT9uyfVHuaNUb7uq5QA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      react: 18.3.1
    transitivePeerDependencies:
      - '@types/react'
    dev: false

  /@react-email/hr@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-Rte+EZL3ptH3rkVU3a7fh8/06mZ6Q679tDaWDjsw3878RQC9afWqUPp5lwgA/1pTouLmJlDs2BjRnV6H84O7iw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/html@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-NB74xwWaOJZxhpiy6pzkhHvugBa2vvmUa0KKnSwOEIX+WEQH8wj5UUhRN4F+Pmkiqz3QBTETUJiSsNWWFtrHgA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/img@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-zDlQWmlSANb2dBYhDaKD12Z4xaGD5mEf3peawBYHGxYySzMLwRT2ANGvFqpDNd7iT0C5po+/9EWR8fS1dLy0QQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/link@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-rRqWGPUTGFwwtMCtsdCHNh0ewOsd4UBG/D12UcwJYFKRb0U6hUG/6VJZE3tB1QYZpLIESdvOLL6ztznh+D749g==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/markdown@0.0.11(react@18.3.1):
    resolution: {integrity: sha512-KeDTS0bAvvtgavYAIAmxKpRxWUSr1/jufckDzu9g4QsQtth8wYaSR5wCPXuTPmhFgJMIlNSlOiBnVp+oRbDtKA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      md-to-react-email: 5.0.2(react@18.3.1)
      react: 18.3.1
    dev: false

  /@react-email/preview@0.0.10(react@18.3.1):
    resolution: {integrity: sha512-bRrv8teMMBlF7ttLp1zZUejkPUzrwMQXrigdagtEBOqsB8HxvJU2MR6Yyb3XOqBYldaIDOQJ1z61zyD2wRlKAw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/render@0.0.17(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-xBQ+/73+WsGuXKY7r1U73zMBNV28xdV0cp9cFjhNYipBReDHhV97IpA6v7Hl0dDtDzt+yS/72dY5vYXrF1v8NA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
      react-dom: ^18.2.0
    dependencies:
      html-to-text: 9.0.5
      js-beautify: 1.15.1
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      react-promise-suspense: 0.3.4
    dev: false

  /@react-email/row@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-ZDASHVvyKrWBS00o5pSH5khfMf46UtZhrHcSAfPSiC4nj7R8A0bf+3Wmbk8YmsaV+qWXUCUSHWwIAAlMRnJoAA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/section@0.0.13(react@18.3.1):
    resolution: {integrity: sha512-McsCQ5NQlNWEMEAR3EtCxHgRhxGmLD+jPvj7A3FD7y2X3fXG0hbmUGX12B63rIywSWjJoQi6tojx/8RpzbyeTA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/tailwind@0.0.19(react@18.3.1):
    resolution: {integrity: sha512-bA0w4D7mSNowxWhcO0jBJauFIPf2Ok7QuKlrHwCcxyX35L2pb5D6ZmXYOrD9C6ADQuVz5oEX+oed3zpSLROgPg==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@react-email/text@0.0.9(react@18.3.1):
    resolution: {integrity: sha512-UNFPGerER3zywpb1ODOS2VgHP7rgOmiTxMHn75pjvQf/gi3/jN9edEQLYvRgPv/mNn4IpJFkOrlP8jcammLeew==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      react: 18.3.1
    dev: false

  /@selderee/plugin-htmlparser2@0.11.0:
    resolution: {integrity: sha512-P33hHGdldxGabLFjPPpaTxVolMrzrcegejx+0GxjrIb9Zv48D8yAIA/QTDR2dFl7Uz7urX8aX6+5bCZslr+gWQ==}
    dependencies:
      domhandler: 5.0.3
      selderee: 0.11.0
    dev: false

  /@socket.io/component-emitter@3.1.2:
    resolution: {integrity: sha512-9BCxFwvbGg/RsZK9tjXd8s4UcwR0MWeFQ1XEKIQVVvAGJyINdrqKMcTRyLoK8Rse1GjzLV9cwjWV1olXRWEXVA==}
    dev: false

  /@swc/core-darwin-arm64@1.3.101:
    resolution: {integrity: sha512-mNFK+uHNPRXSnfTOG34zJOeMl2waM4hF4a2NY7dkMXrPqw9CoJn4MwTXJcyMiSz1/BnNjjTCHF3Yhj0jPxmkzQ==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-darwin-x64@1.3.101:
    resolution: {integrity: sha512-B085j8XOx73Fg15KsHvzYWG262bRweGr3JooO1aW5ec5pYbz5Ew9VS5JKYS03w2UBSxf2maWdbPz2UFAxg0whw==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-linux-arm-gnueabihf@1.3.101:
    resolution: {integrity: sha512-9xLKRb6zSzRGPqdz52Hy5GuB1lSjmLqa0lST6MTFads3apmx4Vgs8Y5NuGhx/h2I8QM4jXdLbpqQlifpzTlSSw==}
    engines: {node: '>=10'}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-linux-arm64-gnu@1.3.101:
    resolution: {integrity: sha512-oE+r1lo7g/vs96Weh2R5l971dt+ZLuhaUX+n3BfDdPxNHfObXgKMjO7E+QS5RbGjv/AwiPCxQmbdCp/xN5ICJA==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-linux-arm64-musl@1.3.101:
    resolution: {integrity: sha512-OGjYG3H4BMOTnJWJyBIovCez6KiHF30zMIu4+lGJTCrxRI2fAjGLml3PEXj8tC3FMcud7U2WUn6TdG0/te2k6g==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-linux-x64-gnu@1.3.101:
    resolution: {integrity: sha512-/kBMcoF12PRO/lwa8Z7w4YyiKDcXQEiLvM+S3G9EvkoKYGgkkz4Q6PSNhF5rwg/E3+Hq5/9D2R+6nrkF287ihg==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-linux-x64-musl@1.3.101:
    resolution: {integrity: sha512-kDN8lm4Eew0u1p+h1l3JzoeGgZPQ05qDE0czngnjmfpsH2sOZxVj1hdiCwS5lArpy7ktaLu5JdRnx70MkUzhXw==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-win32-arm64-msvc@1.3.101:
    resolution: {integrity: sha512-9Wn8TTLWwJKw63K/S+jjrZb9yoJfJwCE2RV5vPCCWmlMf3U1AXj5XuWOLUX+Rp2sGKau7wZKsvywhheWm+qndQ==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-win32-ia32-msvc@1.3.101:
    resolution: {integrity: sha512-onO5KvICRVlu2xmr4//V2je9O2XgS1SGKpbX206KmmjcJhXN5EYLSxW9qgg+kgV5mip+sKTHTAu7IkzkAtElYA==}
    engines: {node: '>=10'}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core-win32-x64-msvc@1.3.101:
    resolution: {integrity: sha512-T3GeJtNQV00YmiVw/88/nxJ/H43CJvFnpvBHCVn17xbahiVUOPOduh3rc9LgAkKiNt/aV8vU3OJR+6PhfMR7UQ==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@swc/core@1.3.101:
    resolution: {integrity: sha512-w5aQ9qYsd/IYmXADAnkXPGDMTqkQalIi+kfFf/MHRKTpaOL7DHjMXwPp/n8hJ0qNjRvchzmPtOqtPBiER50d8A==}
    engines: {node: '>=10'}
    requiresBuild: true
    peerDependencies:
      '@swc/helpers': ^0.5.0
    peerDependenciesMeta:
      '@swc/helpers':
        optional: true
    dependencies:
      '@swc/counter': 0.1.3
      '@swc/types': 0.1.12
    optionalDependencies:
      '@swc/core-darwin-arm64': 1.3.101
      '@swc/core-darwin-x64': 1.3.101
      '@swc/core-linux-arm-gnueabihf': 1.3.101
      '@swc/core-linux-arm64-gnu': 1.3.101
      '@swc/core-linux-arm64-musl': 1.3.101
      '@swc/core-linux-x64-gnu': 1.3.101
      '@swc/core-linux-x64-musl': 1.3.101
      '@swc/core-win32-arm64-msvc': 1.3.101
      '@swc/core-win32-ia32-msvc': 1.3.101
      '@swc/core-win32-x64-msvc': 1.3.101
    dev: false

  /@swc/counter@0.1.3:
    resolution: {integrity: sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ==}
    dev: false

  /@swc/helpers@0.5.2:
    resolution: {integrity: sha512-E4KcWTpoLHqwPHLxidpOqQbcrZVgi0rsmmZXUle1jXmJfuIf/UWpczUJ7MZZ5tlxytgJXyp0w4PGkkeLiuIdZw==}
    dependencies:
      tslib: 2.6.3
    dev: false

  /@swc/types@0.1.12:
    resolution: {integrity: sha512-wBJA+SdtkbFhHjTMYH+dEH1y4VpfGdAc2Kw/LK09i9bXd/K6j6PkDcFCEzb6iVfZMkPRrl/q0e3toqTAJdkIVA==}
    dependencies:
      '@swc/counter': 0.1.3
    dev: false

  /@tootallnate/quickjs-emscripten@0.23.0:
    resolution: {integrity: sha512-C5Mc6rdnsaJDjO3UpGW/CQTHtCKaYlScZTly4JIu97Jxo/odCiH0ITnDXSJPTOrEKk/ycSZ0AOgTmkDtkOsvIA==}
    dev: false

  /@types/cookie@0.4.1:
    resolution: {integrity: sha512-XW/Aa8APYr6jSVVA1y/DEIZX0/GMKLEVekNG727R8cs56ahETkRAy/3DR7+fJyh7oUgGwNQaRfXCun0+KbWY7Q==}
    dev: false

  /@types/cors@2.8.17:
    resolution: {integrity: sha512-8CGDvrBj1zgo2qE+oS3pOCyYNqCPryMWY2bGfwA0dcfopWGgxs+78df0Rs3rc9THP4JkOhLsAa+15VdpAqkcUA==}
    dependencies:
      '@types/node': 22.0.0
    dev: false

  /@types/eslint-scope@3.7.7:
    resolution: {integrity: sha512-MzMFlSLBqNF2gcHWO0G1vP/YQyfvrxZ0bF+u7mzUdZ1/xK4A4sru+nraZz5i3iEIk1l1uyicaDVTB4QbbEkAYg==}
    dependencies:
      '@types/eslint': 9.6.0
      '@types/estree': 1.0.5
    dev: false

  /@types/eslint@9.6.0:
    resolution: {integrity: sha512-gi6WQJ7cHRgZxtkQEoyHMppPjq9Kxo5Tjn2prSKDSmZrCz8TZ3jSRCeTJm+WoM+oB0WG37bRqLzaaU3q7JypGg==}
    dependencies:
      '@types/estree': 1.0.5
      '@types/json-schema': 7.0.15
    dev: false

  /@types/estree@1.0.5:
    resolution: {integrity: sha512-/kYRxGDLWzHOB7q+wtSUQlFrtcdUccpfy+X+9iMBpHK8QLLhx2wIPYuS5DYtR9Wa/YlZAbIovy7qVdB1Aq6Lyw==}
    dev: false

  /@types/json-schema@7.0.15:
    resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}
    dev: false

  /@types/node@22.0.0:
    resolution: {integrity: sha512-VT7KSYudcPOzP5Q0wfbowyNLaVR8QWUdw+088uFWwfvpY6uCWaXpqV6ieLAu9WBcnTa7H4Z5RLK8I5t2FuOcqw==}
    dependencies:
      undici-types: 6.11.1
    dev: false

  /@types/prismjs@1.26.4:
    resolution: {integrity: sha512-rlAnzkW2sZOjbqZ743IHUhFcvzaGbqijwOu8QZnZCjfQzBqFE3s4lOTJEsxikImav9uzz/42I+O7YUs1mWgMlg==}
    dev: false

  /@types/prop-types@15.7.12:
    resolution: {integrity: sha512-5zvhXYtRNRluoE/jAp4GVsSduVUzNWKkOZrCDBWYtE7biZywwdC2AcEzg+cSMLFRfVgeAFqpfNabiPjxFddV1Q==}
    dev: false

  /@types/react-dom@18.3.0:
    resolution: {integrity: sha512-EhwApuTmMBmXuFOikhQLIBUn6uFg81SwLMOAUgodJF14SOBOCMdU04gDoYi0WOJJHD144TL32z4yDqCW3dnkQg==}
    dependencies:
      '@types/react': 18.2.47
    dev: false

  /@types/react@18.2.47:
    resolution: {integrity: sha512-xquNkkOirwyCgoClNk85BjP+aqnIS+ckAJ8i37gAbDs14jfW/J23f2GItAf33oiUPQnqNMALiFeoM9Y5mbjpVQ==}
    dependencies:
      '@types/prop-types': 15.7.12
      '@types/scheduler': 0.23.0
      csstype: 3.1.3
    dev: false

  /@types/scheduler@0.23.0:
    resolution: {integrity: sha512-YIoDCTH3Af6XM5VuwGG/QL/CJqga1Zm3NkU3HZ4ZHK2fRMPYP1VczsTUqtsf43PH/iJNVlPHAo2oWX7BSdB2Hw==}
    dev: false

  /@types/validator@13.12.0:
    resolution: {integrity: sha512-nH45Lk7oPIJ1RVOF6JgFI6Dy0QpHEzq4QecZhvguxYPDwT8c93prCMqAtiIttm39voZ+DDR+qkNnMpJmMBRqag==}
    dev: false

  /@types/webpack@5.28.5(@swc/core@1.3.101)(esbuild@0.19.11):
    resolution: {integrity: sha512-wR87cgvxj3p6D0Crt1r5avwqffqPXUkNlnQ1mjU93G7gCuFjufZR4I6j8cz5g1F1tTYpfOOFvly+cmIQwL9wvw==}
    dependencies:
      '@types/node': 22.0.0
      tapable: 2.2.1
      webpack: 5.93.0(@swc/core@1.3.101)(esbuild@0.19.11)
    transitivePeerDependencies:
      - '@swc/core'
      - esbuild
      - uglify-js
      - webpack-cli
    dev: false

  /@webassemblyjs/ast@1.12.1:
    resolution: {integrity: sha512-EKfMUOPRRUTy5UII4qJDGPpqfwjOmZ5jeGFwid9mnoqIFK+e0vqoi1qH56JpmZSzEL53jKnNzScdmftJyG5xWg==}
    dependencies:
      '@webassemblyjs/helper-numbers': 1.11.6
      '@webassemblyjs/helper-wasm-bytecode': 1.11.6
    dev: false

  /@webassemblyjs/floating-point-hex-parser@1.11.6:
    resolution: {integrity: sha512-ejAj9hfRJ2XMsNHk/v6Fu2dGS+i4UaXBXGemOfQ/JfQ6mdQg/WXtwleQRLLS4OvfDhv8rYnVwH27YJLMyYsxhw==}
    dev: false

  /@webassemblyjs/helper-api-error@1.11.6:
    resolution: {integrity: sha512-o0YkoP4pVu4rN8aTJgAyj9hC2Sv5UlkzCHhxqWj8butaLvnpdc2jOwh4ewE6CX0txSfLn/UYaV/pheS2Txg//Q==}
    dev: false

  /@webassemblyjs/helper-buffer@1.12.1:
    resolution: {integrity: sha512-nzJwQw99DNDKr9BVCOZcLuJJUlqkJh+kVzVl6Fmq/tI5ZtEyWT1KZMyOXltXLZJmDtvLCDgwsyrkohEtopTXCw==}
    dev: false

  /@webassemblyjs/helper-numbers@1.11.6:
    resolution: {integrity: sha512-vUIhZ8LZoIWHBohiEObxVm6hwP034jwmc9kuq5GdHZH0wiLVLIPcMCdpJzG4C11cHoQ25TFIQj9kaVADVX7N3g==}
    dependencies:
      '@webassemblyjs/floating-point-hex-parser': 1.11.6
      '@webassemblyjs/helper-api-error': 1.11.6
      '@xtuc/long': 4.2.2
    dev: false

  /@webassemblyjs/helper-wasm-bytecode@1.11.6:
    resolution: {integrity: sha512-sFFHKwcmBprO9e7Icf0+gddyWYDViL8bpPjJJl0WHxCdETktXdmtWLGVzoHbqUcY4Be1LkNfwTmXOJUFZYSJdA==}
    dev: false

  /@webassemblyjs/helper-wasm-section@1.12.1:
    resolution: {integrity: sha512-Jif4vfB6FJlUlSbgEMHUyk1j234GTNG9dBJ4XJdOySoj518Xj0oGsNi59cUQF4RRMS9ouBUxDDdyBVfPTypa5g==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/helper-buffer': 1.12.1
      '@webassemblyjs/helper-wasm-bytecode': 1.11.6
      '@webassemblyjs/wasm-gen': 1.12.1
    dev: false

  /@webassemblyjs/ieee754@1.11.6:
    resolution: {integrity: sha512-LM4p2csPNvbij6U1f19v6WR56QZ8JcHg3QIJTlSwzFcmx6WSORicYj6I63f9yU1kEUtrpG+kjkiIAkevHpDXrg==}
    dependencies:
      '@xtuc/ieee754': 1.2.0
    dev: false

  /@webassemblyjs/leb128@1.11.6:
    resolution: {integrity: sha512-m7a0FhE67DQXgouf1tbN5XQcdWoNgaAuoULHIfGFIEVKA6tu/edls6XnIlkmS6FrXAquJRPni3ZZKjw6FSPjPQ==}
    dependencies:
      '@xtuc/long': 4.2.2
    dev: false

  /@webassemblyjs/utf8@1.11.6:
    resolution: {integrity: sha512-vtXf2wTQ3+up9Zsg8sa2yWiQpzSsMyXj0qViVP6xKGCUT8p8YJ6HqI7l5eCnWx1T/FYdsv07HQs2wTFbbof/RA==}
    dev: false

  /@webassemblyjs/wasm-edit@1.12.1:
    resolution: {integrity: sha512-1DuwbVvADvS5mGnXbE+c9NfA8QRcZ6iKquqjjmR10k6o+zzsRVesil54DKexiowcFCPdr/Q0qaMgB01+SQ1u6g==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/helper-buffer': 1.12.1
      '@webassemblyjs/helper-wasm-bytecode': 1.11.6
      '@webassemblyjs/helper-wasm-section': 1.12.1
      '@webassemblyjs/wasm-gen': 1.12.1
      '@webassemblyjs/wasm-opt': 1.12.1
      '@webassemblyjs/wasm-parser': 1.12.1
      '@webassemblyjs/wast-printer': 1.12.1
    dev: false

  /@webassemblyjs/wasm-gen@1.12.1:
    resolution: {integrity: sha512-TDq4Ojh9fcohAw6OIMXqiIcTq5KUXTGRkVxbSo1hQnSy6lAM5GSdfwWeSxpAo0YzgsgF182E/U0mDNhuA0tW7w==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/helper-wasm-bytecode': 1.11.6
      '@webassemblyjs/ieee754': 1.11.6
      '@webassemblyjs/leb128': 1.11.6
      '@webassemblyjs/utf8': 1.11.6
    dev: false

  /@webassemblyjs/wasm-opt@1.12.1:
    resolution: {integrity: sha512-Jg99j/2gG2iaz3hijw857AVYekZe2SAskcqlWIZXjji5WStnOpVoat3gQfT/Q5tb2djnCjBtMocY/Su1GfxPBg==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/helper-buffer': 1.12.1
      '@webassemblyjs/wasm-gen': 1.12.1
      '@webassemblyjs/wasm-parser': 1.12.1
    dev: false

  /@webassemblyjs/wasm-parser@1.12.1:
    resolution: {integrity: sha512-xikIi7c2FHXysxXe3COrVUPSheuBtpcfhbpFj4gmu7KRLYOzANztwUU0IbsqvMqzuNK2+glRGWCEqZo1WCLyAQ==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/helper-api-error': 1.11.6
      '@webassemblyjs/helper-wasm-bytecode': 1.11.6
      '@webassemblyjs/ieee754': 1.11.6
      '@webassemblyjs/leb128': 1.11.6
      '@webassemblyjs/utf8': 1.11.6
    dev: false

  /@webassemblyjs/wast-printer@1.12.1:
    resolution: {integrity: sha512-+X4WAlOisVWQMikjbcvY2e0rwPsKQ9F688lksZhBcPycBBuii3O7m8FACbDMWDojpAqvjIncrG8J0XHKyQfVeA==}
    dependencies:
      '@webassemblyjs/ast': 1.12.1
      '@xtuc/long': 4.2.2
    dev: false

  /@xtuc/ieee754@1.2.0:
    resolution: {integrity: sha512-DX8nKgqcGwsc0eJSqYt5lwP4DH5FlHnmuWWBRy7X0NcaGR0ZtuyeESgMwTYVEtxmsNGY+qit4QYT/MIYTOTPeA==}
    dev: false

  /@xtuc/long@4.2.2:
    resolution: {integrity: sha512-NuHqBY1PB/D8xU6s/thBgOAiAP7HOYDQ32+BFZILJ8ivkUkAHQnWfn6WhL79Owj1qmUnoN/YPhktdIoucipkAQ==}
    dev: false

  /abbrev@2.0.0:
    resolution: {integrity: sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==}
    engines: {node: ^14.17.0 || ^16.13.0 || >=18.0.0}
    dev: false

  /accepts@1.3.8:
    resolution: {integrity: sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==}
    engines: {node: '>= 0.6'}
    dependencies:
      mime-types: 2.1.35
      negotiator: 0.6.3
    dev: false

  /acorn-import-attributes@1.9.5(acorn@8.12.1):
    resolution: {integrity: sha512-n02Vykv5uA3eHGM/Z2dQrcD56kL8TyDb2p1+0P83PClMnC/nc+anbQRhIOWnSq4Ke/KvDPrY3C9hDtC/A3eHnQ==}
    peerDependencies:
      acorn: ^8
    dependencies:
      acorn: 8.12.1
    dev: false

  /acorn-jsx@5.3.2(acorn@8.12.1):
    resolution: {integrity: sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==}
    peerDependencies:
      acorn: ^6.0.0 || ^7.0.0 || ^8.0.0
    dependencies:
      acorn: 8.12.1
    dev: false

  /acorn@8.12.1:
    resolution: {integrity: sha512-tcpGyI9zbizT9JbV6oYE477V6mTlXvvi0T0G3SNIYE2apm/G5huBa1+K89VGeovbg+jycCrfhl3ADxErOuO6Jg==}
    engines: {node: '>=0.4.0'}
    hasBin: true
    dev: false

  /agent-base@7.1.1:
    resolution: {integrity: sha512-H0TSyFNDMomMNJQBn8wFV5YC/2eJ+VXECwOadZJT554xP6cODZHPX3H9QMQECxvrgiSOP1pHjy1sMWQVYJOUOA==}
    engines: {node: '>= 14'}
    dependencies:
      debug: 4.3.6
    transitivePeerDependencies:
      - supports-color
    dev: false

  /ajv-formats@2.1.1(ajv@8.17.1):
    resolution: {integrity: sha512-Wx0Kx52hxE7C18hkMEggYlEifqWZtYaRgouJor+WMdPnQyEK13vgEWyVNup7SoeeoLMsr4kf5h6dOW11I15MUA==}
    peerDependencies:
      ajv: ^8.0.0
    peerDependenciesMeta:
      ajv:
        optional: true
    dependencies:
      ajv: 8.17.1
    dev: false

  /ajv-keywords@3.5.2(ajv@6.12.6):
    resolution: {integrity: sha512-5p6WTN0DdTGVQk6VjcEju19IgaHudalcfabD7yhDGeA6bcQnmL+CpveLJq/3hvfwd1aof6L386Ougkx6RfyMIQ==}
    peerDependencies:
      ajv: ^6.9.1
    dependencies:
      ajv: 6.12.6
    dev: false

  /ajv@6.12.6:
    resolution: {integrity: sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==}
    dependencies:
      fast-deep-equal: 3.1.3
      fast-json-stable-stringify: 2.1.0
      json-schema-traverse: 0.4.1
      uri-js: 4.4.1
    dev: false

  /ajv@8.17.1:
    resolution: {integrity: sha512-B/gBuNg5SiMTrPkC+A2+cW0RszwxYmn6VYxB/inlBStS5nx6xHIt/ehKRhIMhqusl7a8LjQoZnjCs5vhwxOQ1g==}
    dependencies:
      fast-deep-equal: 3.1.3
      fast-uri: 3.0.1
      json-schema-traverse: 1.0.0
      require-from-string: 2.0.2
    dev: false

  /ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}
    dev: false

  /ansi-regex@6.0.1:
    resolution: {integrity: sha512-n5M855fKb2SsfMIiFFoVrABHJC8QtHwVx+mHWP3QcEqBHYienj5dHSgjbxtC0WEZXYt4wcD6zrQElDPhFuZgfA==}
    engines: {node: '>=12'}
    dev: false

  /ansi-styles@3.2.1:
    resolution: {integrity: sha512-VT0ZI6kZRdTh8YyJw3SMbYm/u+NqfsAxEpWO0Pf9sq8/e94WxxOpPKx9FR1FlyCtOVDNOQ+8ntlqFxiRc+r5qA==}
    engines: {node: '>=4'}
    dependencies:
      color-convert: 1.9.3
    dev: false

  /ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}
    dependencies:
      color-convert: 2.0.1
    dev: false

  /ansi-styles@6.2.1:
    resolution: {integrity: sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==}
    engines: {node: '>=12'}
    dev: false

  /any-promise@1.3.0:
    resolution: {integrity: sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==}
    dev: false

  /anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.1
    dev: false

  /arg@5.0.2:
    resolution: {integrity: sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==}
    dev: false

  /argparse@1.0.10:
    resolution: {integrity: sha512-o5Roy6tNG4SL/FOkCAN6RzjiakZS25RLYFrcMttJqbdd8BWrnA+fGz57iN5Pb06pvBGvl5gQ0B48dJlslXvoTg==}
    dependencies:
      sprintf-js: 1.0.3
    dev: false

  /argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}
    dev: false

  /aria-hidden@1.2.4:
    resolution: {integrity: sha512-y+CcFFwelSXpLZk/7fMB2mUbGtX9lKycf1MWJ7CaTIERyitVlyQx6C+sxcROU2BAJ24OiZyK+8wj2i8AlBoS3A==}
    engines: {node: '>=10'}
    dependencies:
      tslib: 2.6.3
    dev: false

  /array-flatten@1.1.1:
    resolution: {integrity: sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==}
    dev: false

  /ast-types@0.13.4:
    resolution: {integrity: sha512-x1FCFnFifvYDDzTaLII71vG5uvDwgtmDTEVWAxrgeiR8VjMONcCXJx7E+USjDtHlwFmt9MysbqgF9b9Vjr6w+w==}
    engines: {node: '>=4'}
    dependencies:
      tslib: 2.6.3
    dev: false

  /autoprefixer@10.4.14(postcss@8.4.38):
    resolution: {integrity: sha512-FQzyfOsTlwVzjHxKEqRIAdJx9niO6VCBCoEwax/VLSoQF29ggECcPuBqUMZ+u8jCZOPSy8b8/8KnuFbp0SaFZQ==}
    engines: {node: ^10 || ^12 || >=14}
    hasBin: true
    peerDependencies:
      postcss: ^8.1.0
    dependencies:
      browserslist: 4.23.2
      caniuse-lite: 1.0.30001643
      fraction.js: 4.3.7
      normalize-range: 0.1.2
      picocolors: 1.0.1
      postcss: 8.4.38
      postcss-value-parser: 4.2.0
    dev: false

  /balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}
    dev: false

  /base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}
    dev: false

  /base64id@2.0.0:
    resolution: {integrity: sha512-lGe34o6EHj9y3Kts9R4ZYs/Gr+6N7MCaMlIFA3F1R2O5/m7K06AxfSeO5530PEERE6/WyEg3lsuyw4GHlPZHog==}
    engines: {node: ^4.5.0 || >= 5.9}
    dev: false

  /basic-ftp@5.0.5:
    resolution: {integrity: sha512-4Bcg1P8xhUuqcii/S0Z9wiHIrQVPMermM1any+MX5GeGD7faD3/msQUDGLol9wOcz4/jbg/WJnGqoJF6LiBdtg==}
    engines: {node: '>=10.0.0'}
    dev: false

  /better-ajv-errors@1.2.0(ajv@8.17.1):
    resolution: {integrity: sha512-UW+IsFycygIo7bclP9h5ugkNH8EjCSgqyFB/yQ4Hqqa1OEYDtb0uFIkYE0b6+CjkgJYVM5UKI/pJPxjYe9EZlA==}
    engines: {node: '>= 12.13.0'}
    peerDependencies:
      ajv: 4.11.8 - 8
    dependencies:
      '@babel/code-frame': 7.24.7
      '@humanwhocodes/momoa': 2.0.4
      ajv: 8.17.1
      chalk: 4.1.2
      jsonpointer: 5.0.1
      leven: 3.1.0
    dev: false

  /binary-extensions@2.3.0:
    resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
    engines: {node: '>=8'}
    dev: false

  /bl@4.1.0:
    resolution: {integrity: sha512-1W07cM9gS6DcLperZfFSj+bWLtaPGSOHWhPiGzXmvVJbRLdG82sH/Kn8EtW1VqWVA54AKf2h5k5BbnIbwF3h6w==}
    dependencies:
      buffer: 5.7.1
      inherits: 2.0.4
      readable-stream: 3.6.2
    dev: false

  /body-parser@1.20.2:
    resolution: {integrity: sha512-ml9pReCu3M61kGlqoTm2umSXTlRTuGTx0bfYj+uIUKKYycG5NtSbeetV3faSU6R7ajOPw0g/J1PvK4qNy7s5bA==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}
    dependencies:
      bytes: 3.1.2
      content-type: 1.0.5
      debug: 2.6.9
      depd: 2.0.0
      destroy: 1.2.0
      http-errors: 2.0.0
      iconv-lite: 0.4.24
      on-finished: 2.4.1
      qs: 6.11.0
      raw-body: 2.5.2
      type-is: 1.6.18
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /brace-expansion@1.1.11:
    resolution: {integrity: sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==}
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1
    dev: false

  /brace-expansion@2.0.1:
    resolution: {integrity: sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==}
    dependencies:
      balanced-match: 1.0.2
    dev: false

  /braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}
    dependencies:
      fill-range: 7.1.1
    dev: false

  /browserslist@4.23.2:
    resolution: {integrity: sha512-qkqSyistMYdxAcw+CzbZwlBy8AGmS/eEWs+sEV5TnLRGDOL+C5M2EnH6tlZyg0YoAxGJAFKh61En9BR941GnHA==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true
    dependencies:
      caniuse-lite: 1.0.30001643
      electron-to-chromium: 1.5.2
      node-releases: 2.0.18
      update-browserslist-db: 1.1.0(browserslist@4.23.2)
    dev: false

  /buffer-from@1.1.2:
    resolution: {integrity: sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==}
    dev: false

  /buffer@5.7.1:
    resolution: {integrity: sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==}
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1
    dev: false

  /busboy@1.6.0:
    resolution: {integrity: sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA==}
    engines: {node: '>=10.16.0'}
    dependencies:
      streamsearch: 1.1.0
    dev: false

  /bytes@3.1.2:
    resolution: {integrity: sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==}
    engines: {node: '>= 0.8'}
    dev: false

  /call-bind@1.0.7:
    resolution: {integrity: sha512-GHTSNSYICQ7scH7sZ+M2rFopRoLh8t2bLSW6BbgrtLsahOIB5iyAVJf9GjWK3cYTDaMj4XdBpM1cA6pIS0Kv2w==}
    engines: {node: '>= 0.4'}
    dependencies:
      es-define-property: 1.0.0
      es-errors: 1.3.0
      function-bind: 1.1.2
      get-intrinsic: 1.2.4
      set-function-length: 1.2.2
    dev: false

  /call-me-maybe@1.0.2:
    resolution: {integrity: sha512-HpX65o1Hnr9HH25ojC1YGs7HCQLq0GCOibSaWER0eNpgJ/Z1MZv2mTc7+xh6WOPxbRVcmgbv4hGU+uSQ/2xFZQ==}
    dev: false

  /callsites@3.1.0:
    resolution: {integrity: sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==}
    engines: {node: '>=6'}
    dev: false

  /camelcase-css@2.0.1:
    resolution: {integrity: sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==}
    engines: {node: '>= 6'}
    dev: false

  /caniuse-lite@1.0.30001643:
    resolution: {integrity: sha512-ERgWGNleEilSrHM6iUz/zJNSQTP8Mr21wDWpdgvRwcTXGAq6jMtOUPP4dqFPTdKqZ2wKTdtB+uucZ3MRpAUSmg==}
    dev: false

  /chalk@2.4.2:
    resolution: {integrity: sha512-Mti+f9lpJNcwF4tWV8/OrTTtF1gZi+f8FqlyAdouralcFWFQWF2+NgCHShjkCb+IFBLq9buZwE1xckQU4peSuQ==}
    engines: {node: '>=4'}
    dependencies:
      ansi-styles: 3.2.1
      escape-string-regexp: 1.0.5
      supports-color: 5.5.0
    dev: false

  /chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0
    dev: false

  /chokidar@3.5.3:
    resolution: {integrity: sha512-Dr3sfKRP6oTcjf2JmUmFJfeVMvXBdegxB0iVQ5eb2V10uFJUCAS8OByZdVAyVb8xXNz3GjjTgj9kLWsZTqE6kw==}
    engines: {node: '>= 8.10.0'}
    dependencies:
      anymatch: 3.1.3
      braces: 3.0.3
      glob-parent: 5.1.2
      is-binary-path: 2.1.0
      is-glob: 4.0.3
      normalize-path: 3.0.0
      readdirp: 3.6.0
    optionalDependencies:
      fsevents: 2.3.3
    dev: false

  /chrome-trace-event@1.0.4:
    resolution: {integrity: sha512-rNjApaLzuwaOTjCiT8lSDdGN1APCiqkChLMJxJPWLunPAt5fy8xgU9/jNOchV84wfIxrA0lRQB7oCT8jrn/wrQ==}
    engines: {node: '>=6.0'}
    dev: false

  /class-transformer@0.5.1:
    resolution: {integrity: sha512-SQa1Ws6hUbfC98vKGxZH3KFY0Y1lm5Zm0SY8XX9zbK7FJCyVEac3ATW0RIpwzW+oOfmHE5PMPufDG9hCfoEOMw==}
    dev: false

  /class-validator@0.14.0:
    resolution: {integrity: sha512-ct3ltplN8I9fOwUd8GrP8UQixwff129BkEtuWDKL5W45cQuLd19xqmTLu5ge78YDm/fdje6FMt0hGOhl0lii3A==}
    dependencies:
      '@types/validator': 13.12.0
      libphonenumber-js: 1.11.5
      validator: 13.12.0
    dev: false

  /cli-cursor@3.1.0:
    resolution: {integrity: sha512-I/zHAwsKf9FqGoXM4WWRACob9+SNukZTd94DWF57E4toouRulbCxcUh6RKUEOQlYTHJnzkPMySvPNaaSLNfLZw==}
    engines: {node: '>=8'}
    dependencies:
      restore-cursor: 3.1.0
    dev: false

  /cli-spinners@2.9.2:
    resolution: {integrity: sha512-ywqV+5MmyL4E7ybXgKys4DugZbX0FC6LnwrhjuykIjnK9k8OQacQ7axGKnjDXWNhns0xot3bZI5h55H8yo9cJg==}
    engines: {node: '>=6'}
    dev: false

  /client-only@0.0.1:
    resolution: {integrity: sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==}
    dev: false

  /clone@1.0.4:
    resolution: {integrity: sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==}
    engines: {node: '>=0.8'}
    dev: false

  /clsx@1.2.1:
    resolution: {integrity: sha512-EcR6r5a8bj6pu3ycsa/E/cKVGuTgZJZdsyUYHOksG/UHIiKfjxzRxYJpyVBwYaQeOvghal9fcc4PidlgzugAQg==}
    engines: {node: '>=6'}
    dev: false

  /clsx@2.1.0:
    resolution: {integrity: sha512-m3iNNWpd9rl3jvvcBnu70ylMdrXt8Vlq4HYadnU5fwcOtvkSQWPmj7amUcDT2qYI7risszBjI5AUIUox9D16pg==}
    engines: {node: '>=6'}
    dev: false

  /color-convert@1.9.3:
    resolution: {integrity: sha512-QfAUtd+vFdAtFQcC8CCyYt1fYWxSqAiK2cSD6zDB8N3cpsEBAvRxp9zOGg6G/SHHJYAT88/az/IuDGALsNVbGg==}
    dependencies:
      color-name: 1.1.3
    dev: false

  /color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}
    dependencies:
      color-name: 1.1.4
    dev: false

  /color-name@1.1.3:
    resolution: {integrity: sha512-72fSenhMw2HZMTVHeCA9KCmpEIbzWiQsjN+BHcBbS9vr1mtt+vJjPdksIBNUmKAW8TFUDPJK5SUU3QhE9NEXDw==}
    dev: false

  /color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}
    dev: false

  /commander@10.0.1:
    resolution: {integrity: sha512-y4Mg2tXshplEbSGzx7amzPwKKOCGuoSRP/CjEdwwk0FOGlUbq6lKuoyDZTNZkmxHdJtp54hdfY/JUrdL7Xfdug==}
    engines: {node: '>=14'}
    dev: false

  /commander@11.1.0:
    resolution: {integrity: sha512-yPVavfyCcRhmorC7rWlkHn15b4wDVgVmBA7kV4QVBsF7kv/9TKJAbAXVTxvTnwP8HHKjRCJDClKbciiYS7p0DQ==}
    engines: {node: '>=16'}
    dev: false

  /commander@2.20.3:
    resolution: {integrity: sha512-GpVkmM8vF2vQUkj2LvZmD35JxeJOLCwJ9cUkugyk2nuhbv3+mJvpLYYt+0+USMxE+oj+ey/lJEnhZw75x/OMcQ==}
    dev: false

  /commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}
    dev: false

  /concat-map@0.0.1:
    resolution: {integrity: sha1-2Klr13/Wjfd5OnMDajug1UBdR3s=}
    dev: false

  /config-chain@1.1.13:
    resolution: {integrity: sha512-qj+f8APARXHrM0hraqXYb2/bOVSV4PvJQlNZ/DVj0QrmNM2q2euizkeuVckQ57J+W0mRH6Hvi+k50M4Jul2VRQ==}
    dependencies:
      ini: 1.3.8
      proto-list: 1.2.4
    dev: false

  /content-disposition@0.5.4:
    resolution: {integrity: sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==}
    engines: {node: '>= 0.6'}
    dependencies:
      safe-buffer: 5.2.1
    dev: false

  /content-type@1.0.5:
    resolution: {integrity: sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==}
    engines: {node: '>= 0.6'}
    dev: false

  /convert-source-map@2.0.0:
    resolution: {integrity: sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==}
    dev: false

  /cookie-signature@1.0.6:
    resolution: {integrity: sha1-4wOogrNCzD7oylE6eZmXNNqzriw=}
    dev: false

  /cookie@0.4.2:
    resolution: {integrity: sha512-aSWTXFzaKWkvHO1Ny/s+ePFpvKsPnjc551iI41v3ny/ow6tBG5Vd+FuqGNhh1LxOmVzOlGUriIlOaokOvhaStA==}
    engines: {node: '>= 0.6'}
    dev: false

  /cookie@0.6.0:
    resolution: {integrity: sha512-U71cyTamuh1CRNCfpGY6to28lxvNwPG4Guz/EVjgf3Jmzv0vlDp1atT9eS5dDjMYHucpHbWns6Lwf3BKz6svdw==}
    engines: {node: '>= 0.6'}
    dev: false

  /cors@2.8.5:
    resolution: {integrity: sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==}
    engines: {node: '>= 0.10'}
    dependencies:
      object-assign: 4.1.1
      vary: 1.1.2
    dev: false

  /cross-fetch@4.0.0:
    resolution: {integrity: sha512-e4a5N8lVvuLgAWgnCrLr2PP0YyDOTHa9H/Rj54dirp61qXnNq46m82bRhNqIA5VccJtWBvPTFRV3TtvHUKPB1g==}
    dependencies:
      node-fetch: 2.7.0
    transitivePeerDependencies:
      - encoding
    dev: false

  /cross-spawn@7.0.3:
    resolution: {integrity: sha512-iRDPJKUPVEND7dHPO8rkbOnPpyDygcDFtWjpeWNCgy8WP2rXcxXL8TskReQl6OrB2G7+UJrags1q15Fudc7G6w==}
    engines: {node: '>= 8'}
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2
    dev: false

  /cssesc@3.0.0:
    resolution: {integrity: sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==}
    engines: {node: '>=4'}
    hasBin: true
    dev: false

  /csstype@3.1.3:
    resolution: {integrity: sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==}
    dev: false

  /data-uri-to-buffer@4.0.1:
    resolution: {integrity: sha512-0R9ikRb668HB7QDxT1vkpuUBtqc53YyAwMwGeUFKRojY/NWKvdZ+9UYtRfGmhqNbRkTSVpMbmyhXipFFv2cb/A==}
    engines: {node: '>= 12'}
    dev: false

  /data-uri-to-buffer@6.0.2:
    resolution: {integrity: sha512-7hvf7/GW8e86rW0ptuwS3OcBGDjIi6SZva7hCyWC0yYry2cOPmLIjXAUHI6DK2HsnwJd9ifmt57i8eV2n4YNpw==}
    engines: {node: '>= 14'}
    dev: false

  /debounce@2.0.0:
    resolution: {integrity: sha512-xRetU6gL1VJbs85Mc4FoEGSjQxzpdxRyFhe3lmWFyy2EzydIcD4xzUvRJMD+NPDfMwKNhxa3PvsIOU32luIWeA==}
    engines: {node: '>=18'}
    dev: false

  /debug@2.6.9:
    resolution: {integrity: sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true
    dependencies:
      ms: 2.0.0
    dev: false

  /debug@4.3.6:
    resolution: {integrity: sha512-O/09Bd4Z1fBrU4VzkhFqVgpPzaGbw6Sm9FEkBT1A/YBXQFGuuSxa1dN2nxgxS34JmKXqYx8CZAwEVoJFImUXIg==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true
    dependencies:
      ms: 2.1.2
    dev: false

  /deep-is@0.1.4:
    resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}
    dev: false

  /deepmerge@4.3.1:
    resolution: {integrity: sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==}
    engines: {node: '>=0.10.0'}
    dev: false

  /defaults@1.0.4:
    resolution: {integrity: sha512-eFuaLoy/Rxalv2kr+lqMlUnrDWV+3j4pljOIJgLIhI058IQfWJ7vXhyEIHu+HtC738klGALYxOKDO0bQP3tg8A==}
    dependencies:
      clone: 1.0.4
    dev: false

  /define-data-property@1.1.4:
    resolution: {integrity: sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==}
    engines: {node: '>= 0.4'}
    dependencies:
      es-define-property: 1.0.0
      es-errors: 1.3.0
      gopd: 1.0.1
    dev: false

  /degenerator@5.0.1:
    resolution: {integrity: sha512-TllpMR/t0M5sqCXfj85i4XaAzxmS5tVA16dqvdkMwGmzI+dXLXnw3J+3Vdv7VKw+ThlTMboK6i9rnZ6Nntj5CQ==}
    engines: {node: '>= 14'}
    dependencies:
      ast-types: 0.13.4
      escodegen: 2.1.0
      esprima: 4.0.1
    dev: false

  /depd@2.0.0:
    resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
    engines: {node: '>= 0.8'}
    dev: false

  /destroy@1.2.0:
    resolution: {integrity: sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}
    dev: false

  /detect-node-es@1.1.0:
    resolution: {integrity: sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==}
    dev: false

  /didyoumean@1.2.2:
    resolution: {integrity: sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==}
    dev: false

  /dlv@1.1.3:
    resolution: {integrity: sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==}
    dev: false

  /dom-serializer@2.0.0:
    resolution: {integrity: sha512-wIkAryiqt/nV5EQKqQpo3SToSOV9J0DnbJqwK7Wv/Trc92zIAYZ4FlMu+JPFW1DfGFt81ZTCGgDEabffXeLyJg==}
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      entities: 4.5.0
    dev: false

  /domelementtype@2.3.0:
    resolution: {integrity: sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==}
    dev: false

  /domhandler@5.0.3:
    resolution: {integrity: sha512-cgwlv/1iFQiFnU96XXgROh8xTeetsnJiDsTc7TYCLFd9+/WNkIqPTxiM/8pSd8VIrhXGTf1Ny1q1hquVqDJB5w==}
    engines: {node: '>= 4'}
    dependencies:
      domelementtype: 2.3.0
    dev: false

  /domutils@3.1.0:
    resolution: {integrity: sha512-H78uMmQtI2AhgDJjWeQmHwJJ2bLPD3GMmO7Zja/ZZh84wkm+4ut+IUnUdRa8uCGX88DiVx1j6FRe1XfxEgjEZA==}
    dependencies:
      dom-serializer: 2.0.0
      domelementtype: 2.3.0
      domhandler: 5.0.3
    dev: false

  /dotenv@16.0.3:
    resolution: {integrity: sha512-7GO6HghkA5fYG9TYnNxi14/7K9f5occMlp3zXAuSxn7CKCxt9xbNWG7yF8hTCSUchlfWSe3uLmlPfigevRItzQ==}
    engines: {node: '>=12'}
    dev: false

  /eastasianwidth@0.2.0:
    resolution: {integrity: sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==}
    dev: false

  /editorconfig@1.0.4:
    resolution: {integrity: sha512-L9Qe08KWTlqYMVvMcTIvMAdl1cDUubzRNYL+WfA4bLDMHe4nemKkpmYzkznE1FwLKu0EEmy6obgQKzMJrg4x9Q==}
    engines: {node: '>=14'}
    hasBin: true
    dependencies:
      '@one-ini/wasm': 0.1.1
      commander: 10.0.1
      minimatch: 9.0.1
      semver: 7.6.3
    dev: false

  /ee-first@1.1.1:
    resolution: {integrity: sha1-WQxhFWsK4vTwJVcyoViyZrxWsh0=}
    dev: false

  /electron-to-chromium@1.5.2:
    resolution: {integrity: sha512-kc4r3U3V3WLaaZqThjYz/Y6z8tJe+7K0bbjUVo3i+LWIypVdMx5nXCkwRe6SWbY6ILqLdc1rKcKmr3HoH7wjSQ==}
    dev: false

  /emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}
    dev: false

  /emoji-regex@9.2.2:
    resolution: {integrity: sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==}
    dev: false

  /encodeurl@1.0.2:
    resolution: {integrity: sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==}
    engines: {node: '>= 0.8'}
    dev: false

  /engine.io-client@6.5.4:
    resolution: {integrity: sha512-GeZeeRjpD2qf49cZQ0Wvh/8NJNfeXkXXcoGh+F77oEAgo9gUHwT1fCRxSNU+YEEaysOJTnsFHmM5oAcPy4ntvQ==}
    dependencies:
      '@socket.io/component-emitter': 3.1.2
      debug: 4.3.6
      engine.io-parser: 5.2.3
      ws: 8.17.1
      xmlhttprequest-ssl: 2.0.0
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /engine.io-parser@5.2.3:
    resolution: {integrity: sha512-HqD3yTBfnBxIrbnM1DoD6Pcq8NECnh8d4As1Qgh0z5Gg3jRRIqijury0CL3ghu/edArpUYiYqQiDUQBIs4np3Q==}
    engines: {node: '>=10.0.0'}
    dev: false

  /engine.io@6.5.5:
    resolution: {integrity: sha512-C5Pn8Wk+1vKBoHghJODM63yk8MvrO9EWZUfkAt5HAqIgPE4/8FF0PEGHXtEd40l223+cE5ABWuPzm38PHFXfMA==}
    engines: {node: '>=10.2.0'}
    dependencies:
      '@types/cookie': 0.4.1
      '@types/cors': 2.8.17
      '@types/node': 22.0.0
      accepts: 1.3.8
      base64id: 2.0.0
      cookie: 0.4.2
      cors: 2.8.5
      debug: 4.3.6
      engine.io-parser: 5.2.3
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /enhanced-resolve@5.17.1:
    resolution: {integrity: sha512-LMHl3dXhTcfv8gM4kEzIUeTQ+7fpdA0l2tUf34BddXPkz2A5xJ5L/Pchd5BL6rdccM9QGvu0sWZzK1Z1t4wwyg==}
    engines: {node: '>=10.13.0'}
    dependencies:
      graceful-fs: 4.2.11
      tapable: 2.2.1
    dev: false

  /entities@4.5.0:
    resolution: {integrity: sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==}
    engines: {node: '>=0.12'}
    dev: false

  /es-define-property@1.0.0:
    resolution: {integrity: sha512-jxayLKShrEqqzJ0eumQbVhTYQM27CfT1T35+gCgDFoL82JLsXqTJ76zv6A0YLOgEnLUMvLzsDsGIrl8NFpT2gQ==}
    engines: {node: '>= 0.4'}
    dependencies:
      get-intrinsic: 1.2.4
    dev: false

  /es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}
    dev: false

  /es-module-lexer@1.5.4:
    resolution: {integrity: sha512-MVNK56NiMrOwitFB7cqDwq0CQutbw+0BvLshJSse0MUNU+y1FC3bUS/AQg7oUng+/wKrrki7JfmwtVHkVfPLlw==}
    dev: false

  /esbuild@0.19.11:
    resolution: {integrity: sha512-HJ96Hev2hX/6i5cDVwcqiJBBtuo9+FeIJOtZ9W1kA5M6AMJRHUZlpYZ1/SbEwtO0ioNAW8rUooVpC/WehY2SfA==}
    engines: {node: '>=12'}
    hasBin: true
    requiresBuild: true
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.19.11
      '@esbuild/android-arm': 0.19.11
      '@esbuild/android-arm64': 0.19.11
      '@esbuild/android-x64': 0.19.11
      '@esbuild/darwin-arm64': 0.19.11
      '@esbuild/darwin-x64': 0.19.11
      '@esbuild/freebsd-arm64': 0.19.11
      '@esbuild/freebsd-x64': 0.19.11
      '@esbuild/linux-arm': 0.19.11
      '@esbuild/linux-arm64': 0.19.11
      '@esbuild/linux-ia32': 0.19.11
      '@esbuild/linux-loong64': 0.19.11
      '@esbuild/linux-mips64el': 0.19.11
      '@esbuild/linux-ppc64': 0.19.11
      '@esbuild/linux-riscv64': 0.19.11
      '@esbuild/linux-s390x': 0.19.11
      '@esbuild/linux-x64': 0.19.11
      '@esbuild/netbsd-x64': 0.19.11
      '@esbuild/openbsd-x64': 0.19.11
      '@esbuild/sunos-x64': 0.19.11
      '@esbuild/win32-arm64': 0.19.11
      '@esbuild/win32-ia32': 0.19.11
      '@esbuild/win32-x64': 0.19.11
    dev: false

  /esbuild@0.21.5:
    resolution: {integrity: sha512-mg3OPMV4hXywwpoDxu3Qda5xCKQi+vCTZq8S9J/EpkhB2HzKXq4SNFZE3+NK93JYxc8VMSep+lOUSC/RVKaBqw==}
    engines: {node: '>=12'}
    hasBin: true
    requiresBuild: true
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.21.5
      '@esbuild/android-arm': 0.21.5
      '@esbuild/android-arm64': 0.21.5
      '@esbuild/android-x64': 0.21.5
      '@esbuild/darwin-arm64': 0.21.5
      '@esbuild/darwin-x64': 0.21.5
      '@esbuild/freebsd-arm64': 0.21.5
      '@esbuild/freebsd-x64': 0.21.5
      '@esbuild/linux-arm': 0.21.5
      '@esbuild/linux-arm64': 0.21.5
      '@esbuild/linux-ia32': 0.21.5
      '@esbuild/linux-loong64': 0.21.5
      '@esbuild/linux-mips64el': 0.21.5
      '@esbuild/linux-ppc64': 0.21.5
      '@esbuild/linux-riscv64': 0.21.5
      '@esbuild/linux-s390x': 0.21.5
      '@esbuild/linux-x64': 0.21.5
      '@esbuild/netbsd-x64': 0.21.5
      '@esbuild/openbsd-x64': 0.21.5
      '@esbuild/sunos-x64': 0.21.5
      '@esbuild/win32-arm64': 0.21.5
      '@esbuild/win32-ia32': 0.21.5
      '@esbuild/win32-x64': 0.21.5
    dev: true

  /escalade@3.1.2:
    resolution: {integrity: sha512-ErCHMCae19vR8vQGe50xIsVomy19rg6gFu3+r3jkEO46suLMWBksvVyoGgQV+jOfl84ZSOSlmv6Gxa89PmTGmA==}
    engines: {node: '>=6'}
    dev: false

  /escape-html@1.0.3:
    resolution: {integrity: sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==}
    dev: false

  /escape-string-regexp@1.0.5:
    resolution: {integrity: sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==}
    engines: {node: '>=0.8.0'}
    dev: false

  /escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}
    dev: false

  /escodegen@2.1.0:
    resolution: {integrity: sha512-2NlIDTwUWJN0mRPQOdtQBzbUHvdGY2P1VXSyU83Q3xKxM7WHX2Ql8dKq782Q9TgQUNOLEzEYu9bzLNj1q88I5w==}
    engines: {node: '>=6.0'}
    hasBin: true
    dependencies:
      esprima: 4.0.1
      estraverse: 5.3.0
      esutils: 2.0.3
    optionalDependencies:
      source-map: 0.6.1
    dev: false

  /eslint-config-prettier@9.0.0(eslint@9.8.0):
    resolution: {integrity: sha512-IcJsTkJae2S35pRsRAwoCE+925rJJStOdkKnLVgtE+tEpqU0EVVM7OqrwxqgptKdX29NUwC82I5pXsGFIgSevw==}
    hasBin: true
    peerDependencies:
      eslint: '>=7.0.0'
    dependencies:
      eslint: 9.8.0
    dev: false

  /eslint-config-turbo@1.10.12(eslint@9.8.0):
    resolution: {integrity: sha512-z3jfh+D7UGYlzMWGh+Kqz++hf8LOE96q3o5R8X4HTjmxaBWlLAWG+0Ounr38h+JLR2TJno0hU9zfzoPNkR9BdA==}
    peerDependencies:
      eslint: '>6.6.0'
    dependencies:
      eslint: 9.8.0
      eslint-plugin-turbo: 1.10.12(eslint@9.8.0)
    dev: false

  /eslint-plugin-turbo@1.10.12(eslint@9.8.0):
    resolution: {integrity: sha512-uNbdj+ohZaYo4tFJ6dStRXu2FZigwulR1b3URPXe0Q8YaE7thuekKNP+54CHtZPH9Zey9dmDx5btAQl9mfzGOw==}
    peerDependencies:
      eslint: '>6.6.0'
    dependencies:
      dotenv: 16.0.3
      eslint: 9.8.0
    dev: false

  /eslint-scope@5.1.1:
    resolution: {integrity: sha512-2NxwbF/hZ0KpepYN0cNbo+FN6XoK7GaHlQhgx/hIZl6Va0bF45RQOOwhLIy8lQDbuCiadSLCBnH2CFYquit5bw==}
    engines: {node: '>=8.0.0'}
    dependencies:
      esrecurse: 4.3.0
      estraverse: 4.3.0
    dev: false

  /eslint-scope@8.0.2:
    resolution: {integrity: sha512-6E4xmrTw5wtxnLA5wYL3WDfhZ/1bUBGOXV0zQvVRDOtrR8D0p6W7fs3JweNYhwRYeGvd/1CKX2se0/2s7Q/nJA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      esrecurse: 4.3.0
      estraverse: 5.3.0
    dev: false

  /eslint-visitor-keys@3.4.3:
    resolution: {integrity: sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    dev: false

  /eslint-visitor-keys@4.0.0:
    resolution: {integrity: sha512-OtIRv/2GyiF6o/d8K7MYKKbXrOUBIK6SfkIRM4Z0dY3w+LiQ0vy3F57m0Z71bjbyeiWFiHJ8brqnmE6H6/jEuw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: false

  /eslint@9.8.0:
    resolution: {integrity: sha512-K8qnZ/QJzT2dLKdZJVX6W4XOwBzutMYmt0lqUS+JdXgd+HTYFlonFgkJ8s44d/zMPPCnOOk0kMWCApCPhiOy9A==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    hasBin: true
    dependencies:
      '@eslint-community/eslint-utils': 4.4.0(eslint@9.8.0)
      '@eslint-community/regexpp': 4.11.0
      '@eslint/config-array': 0.17.1
      '@eslint/eslintrc': 3.1.0
      '@eslint/js': 9.8.0
      '@humanwhocodes/module-importer': 1.0.1
      '@humanwhocodes/retry': 0.3.0
      '@nodelib/fs.walk': 1.2.8
      ajv: 6.12.6
      chalk: 4.1.2
      cross-spawn: 7.0.3
      debug: 4.3.6
      escape-string-regexp: 4.0.0
      eslint-scope: 8.0.2
      eslint-visitor-keys: 4.0.0
      espree: 10.1.0
      esquery: 1.6.0
      esutils: 2.0.3
      fast-deep-equal: 3.1.3
      file-entry-cache: 8.0.0
      find-up: 5.0.0
      glob-parent: 6.0.2
      ignore: 5.3.1
      imurmurhash: 0.1.4
      is-glob: 4.0.3
      is-path-inside: 3.0.3
      json-stable-stringify-without-jsonify: 1.0.1
      levn: 0.4.1
      lodash.merge: 4.6.2
      minimatch: 3.1.2
      natural-compare: 1.4.0
      optionator: 0.9.4
      strip-ansi: 6.0.1
      text-table: 0.2.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /espree@10.1.0:
    resolution: {integrity: sha512-M1M6CpiE6ffoigIOWYO9UDP8TMUw9kqb21tf+08IgDYjCsOvCuDt4jQcZmoYxx+w7zlKw9/N0KXfto+I8/FrXA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      acorn: 8.12.1
      acorn-jsx: 5.3.2(acorn@8.12.1)
      eslint-visitor-keys: 4.0.0
    dev: false

  /esprima@4.0.1:
    resolution: {integrity: sha512-eGuFFw7Upda+g4p+QHvnW0RyTX/SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB/sbNop0Kszm0jsaWU4A==}
    engines: {node: '>=4'}
    hasBin: true
    dev: false

  /esquery@1.6.0:
    resolution: {integrity: sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==}
    engines: {node: '>=0.10'}
    dependencies:
      estraverse: 5.3.0
    dev: false

  /esrecurse@4.3.0:
    resolution: {integrity: sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==}
    engines: {node: '>=4.0'}
    dependencies:
      estraverse: 5.3.0
    dev: false

  /estraverse@4.3.0:
    resolution: {integrity: sha512-39nnKffWz8xN1BU/2c79n9nB9HDzo0niYUqx6xyqUnyoAnQyyWpOTdZEeiCch8BBu515t4wp9ZmgVfVhn9EBpw==}
    engines: {node: '>=4.0'}
    dev: false

  /estraverse@5.3.0:
    resolution: {integrity: sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==}
    engines: {node: '>=4.0'}
    dev: false

  /esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}
    dev: false

  /etag@1.8.1:
    resolution: {integrity: sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==}
    engines: {node: '>= 0.6'}
    dev: false

  /events@3.3.0:
    resolution: {integrity: sha512-mQw+2fkQbALzQ7V0MY0IqdnXNOeTtP4r0lN9z7AAawCXgqea7bDii20AYrIBrFd/Hx0M2Ocz6S111CaFkUcb0Q==}
    engines: {node: '>=0.8.x'}
    dev: false

  /express@4.19.2:
    resolution: {integrity: sha512-5T6nhjsT+EOMzuck8JjBHARTHfMht0POzlA60WV2pMD3gyXw2LZnZ+ueGdNxG+0calOJcWKbpFcuzLZ91YWq9Q==}
    engines: {node: '>= 0.10.0'}
    dependencies:
      accepts: 1.3.8
      array-flatten: 1.1.1
      body-parser: 1.20.2
      content-disposition: 0.5.4
      content-type: 1.0.5
      cookie: 0.6.0
      cookie-signature: 1.0.6
      debug: 2.6.9
      depd: 2.0.0
      encodeurl: 1.0.2
      escape-html: 1.0.3
      etag: 1.8.1
      finalhandler: 1.2.0
      fresh: 0.5.2
      http-errors: 2.0.0
      merge-descriptors: 1.0.1
      methods: 1.1.2
      on-finished: 2.4.1
      parseurl: 1.3.3
      path-to-regexp: 0.1.7
      proxy-addr: 2.0.7
      qs: 6.11.0
      range-parser: 1.2.1
      safe-buffer: 5.2.1
      send: 0.18.0
      serve-static: 1.15.0
      setprototypeof: 1.2.0
      statuses: 2.0.1
      type-is: 1.6.18
      utils-merge: 1.0.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color
    dev: false

  /fast-deep-equal@2.0.1:
    resolution: {integrity: sha512-bCK/2Z4zLidyB4ReuIsvALH6w31YfAQDmXMqMx6FyfHqvBxtjC0eRumeSu4Bs3XtXwpyIywtSTrVT99BxY1f9w==}
    dev: false

  /fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}
    dev: false

  /fast-glob@3.3.2:
    resolution: {integrity: sha512-oX2ruAFQwf/Orj8m737Y5adxDQO0LAB7/S5MnxCdTNDd4p6BsyIVsv9JQsATbTSq8KHRpLwIHbVlUNatxd+1Ow==}
    engines: {node: '>=8.6.0'}
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.7
    dev: false

  /fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}
    dev: false

  /fast-levenshtein@2.0.6:
    resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}
    dev: false

  /fast-uri@3.0.1:
    resolution: {integrity: sha512-MWipKbbYiYI0UC7cl8m/i/IWTqfC8YXsqjzybjddLsFjStroQzsHXkc73JutMvBiXmOvapk+axIl79ig5t55Bw==}
    dev: false

  /fastq@1.17.1:
    resolution: {integrity: sha512-sRVD3lWVIXWg6By68ZN7vho9a1pQcN/WBFaAAsDDFzlJjvoGx0P8z7V1t72grFJfJhu3YPZBuu25f7Kaw2jN1w==}
    dependencies:
      reusify: 1.0.4
    dev: false

  /fetch-blob@3.2.0:
    resolution: {integrity: sha512-7yAQpD2UMJzLi1Dqv7qFYnPbaPx7ZfFK6PiIxQ4PfkGPyNyl2Ugx+a/umUonmKqjhM4DnfbMvdX6otXq83soQQ==}
    engines: {node: ^12.20 || >= 14.13}
    dependencies:
      node-domexception: 1.0.0
      web-streams-polyfill: 3.3.3
    dev: false

  /file-entry-cache@8.0.0:
    resolution: {integrity: sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==}
    engines: {node: '>=16.0.0'}
    dependencies:
      flat-cache: 4.0.1
    dev: false

  /fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}
    dependencies:
      to-regex-range: 5.0.1
    dev: false

  /finalhandler@1.2.0:
    resolution: {integrity: sha512-5uXcUVftlQMFnWC9qu/svkWv3GTd2PfUhK/3PLkYNAe7FbqJMt3515HaxE6eRL74GdsriiwujiawdaB1BpEISg==}
    engines: {node: '>= 0.8'}
    dependencies:
      debug: 2.6.9
      encodeurl: 1.0.2
      escape-html: 1.0.3
      on-finished: 2.4.1
      parseurl: 1.3.3
      statuses: 2.0.1
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /find-up@5.0.0:
    resolution: {integrity: sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==}
    engines: {node: '>=10'}
    dependencies:
      locate-path: 6.0.0
      path-exists: 4.0.0
    dev: false

  /flat-cache@4.0.1:
    resolution: {integrity: sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==}
    engines: {node: '>=16'}
    dependencies:
      flatted: 3.3.1
      keyv: 4.5.4
    dev: false

  /flatted@3.3.1:
    resolution: {integrity: sha512-X8cqMLLie7KsNUDSdzeN8FYK9rEt4Dt67OsG/DNGnYTSDBG4uFAJFBnUeiV+zCVAvwFy56IjM9sH51jVaEhNxw==}
    dev: false

  /foreground-child@3.2.1:
    resolution: {integrity: sha512-PXUUyLqrR2XCWICfv6ukppP96sdFwWbNEnfEMt7jNsISjMsvaLNinAHNDYyvkyU+SZG2BTSbT5NjG+vZslfGTA==}
    engines: {node: '>=14'}
    dependencies:
      cross-spawn: 7.0.3
      signal-exit: 4.1.0
    dev: false

  /format-util@1.0.5:
    resolution: {integrity: sha512-varLbTj0e0yVyRpqQhuWV+8hlePAgaoFRhNFj50BNjEIrw1/DphHSObtqwskVCPWNgzwPoQrZAbfa/SBiicNeg==}
    dev: false

  /formdata-polyfill@4.0.10:
    resolution: {integrity: sha512-buewHzMvYL29jdeQTVILecSaZKnt/RJWjoZCF5OW60Z67/GmSLBkOFM7qh1PI3zFNtJbaZL5eQu1vLfazOwj4g==}
    engines: {node: '>=12.20.0'}
    dependencies:
      fetch-blob: 3.2.0
    dev: false

  /forwarded@0.2.0:
    resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
    engines: {node: '>= 0.6'}
    dev: false

  /fraction.js@4.3.7:
    resolution: {integrity: sha512-ZsDfxO51wGAXREY55a7la9LScWpwv9RxIrYABrlvOFBlH/ShPnrtsXeuUIfXKKOVicNxQ+o8JTbJvjS4M89yew==}
    dev: false

  /framer-motion@10.17.4(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-CYBSs6cWfzcasAX8aofgKFZootmkQtR4qxbfTOksBLny/lbUfkGbQAFOS3qnl6Uau1N9y8tUpI7mVIrHgkFjLQ==}
    peerDependencies:
      react: ^18.0.0
      react-dom: ^18.0.0
    peerDependenciesMeta:
      react:
        optional: true
      react-dom:
        optional: true
    dependencies:
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      tslib: 2.6.3
    optionalDependencies:
      '@emotion/is-prop-valid': 0.8.8
    dev: false

  /fresh@0.5.2:
    resolution: {integrity: sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==}
    engines: {node: '>= 0.6'}
    dev: false

  /fs-extra@11.2.0:
    resolution: {integrity: sha512-PmDi3uwK5nFuXh7XDTlVnS17xJS7vW36is2+w3xcv8SVxiB4NyATf4ctkVY5bkSjX0Y4nbvZCq1/EjtEyr9ktw==}
    engines: {node: '>=14.14'}
    dependencies:
      graceful-fs: 4.2.11
      jsonfile: 6.1.0
      universalify: 2.0.1
    dev: false

  /fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]
    requiresBuild: true
    optional: true

  /function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}
    dev: false

  /gensync@1.0.0-beta.2:
    resolution: {integrity: sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==}
    engines: {node: '>=6.9.0'}
    dev: false

  /get-intrinsic@1.2.4:
    resolution: {integrity: sha512-5uYhsJH8VJBTv7oslg4BznJYhDoRI6waYCxMmCdnTrcCrHA/fCFKoTFz2JKKE0HdDFUF7/oQuhzumXJK7paBRQ==}
    engines: {node: '>= 0.4'}
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2
      has-proto: 1.0.3
      has-symbols: 1.0.3
      hasown: 2.0.2
    dev: false

  /get-nonce@1.0.1:
    resolution: {integrity: sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==}
    engines: {node: '>=6'}
    dev: false

  /get-tsconfig@4.7.6:
    resolution: {integrity: sha512-ZAqrLlu18NbDdRaHq+AKXzAmqIUPswPWKUchfytdAjiRFnCe5ojG2bstg6mRiZabkKfCoL/e98pbBELIV/YCeA==}
    dependencies:
      resolve-pkg-maps: 1.0.0
    dev: true

  /get-uri@6.0.3:
    resolution: {integrity: sha512-BzUrJBS9EcUb4cFol8r4W3v1cPsSyajLSthNkz5BxbpDcHN5tIrM10E2eNvfnvBn3DaT3DUgx0OpsBKkaOpanw==}
    engines: {node: '>= 14'}
    dependencies:
      basic-ftp: 5.0.5
      data-uri-to-buffer: 6.0.2
      debug: 4.3.6
      fs-extra: 11.2.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}
    dependencies:
      is-glob: 4.0.3
    dev: false

  /glob-parent@6.0.2:
    resolution: {integrity: sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==}
    engines: {node: '>=10.13.0'}
    dependencies:
      is-glob: 4.0.3
    dev: false

  /glob-to-regexp@0.4.1:
    resolution: {integrity: sha512-lkX1HJXwyMcprw/5YUZc2s7DrpAiHB21/V+E1rHUrVNokkvB6bqMzT0VfV6/86ZNabt1k14YOIaT7nDvOX3Iiw==}
    dev: false

  /glob@10.3.4:
    resolution: {integrity: sha512-6LFElP3A+i/Q8XQKEvZjkEWEOTgAIALR9AO2rwT8bgPhDd1anmqDJDZ6lLddI4ehxxxR1S5RIqKe1uapMQfYaQ==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true
    dependencies:
      foreground-child: 3.2.1
      jackspeak: 2.3.6
      minimatch: 9.0.5
      minipass: 7.1.2
      path-scurry: 1.11.1
    dev: false

  /glob@10.4.5:
    resolution: {integrity: sha512-7Bv8RF0k6xjo7d4A/PxYLbUCfb6c+Vpd2/mB2yRDlew7Jb5hEXiCD9ibfO7wpk8i4sevK6DFny9h7EYbM3/sHg==}
    hasBin: true
    dependencies:
      foreground-child: 3.2.1
      jackspeak: 3.4.3
      minimatch: 9.0.5
      minipass: 7.1.2
      package-json-from-dist: 1.0.0
      path-scurry: 1.11.1
    dev: false

  /globals@11.12.0:
    resolution: {integrity: sha512-WOBp/EEGUiIsJSp7wcv/y6MO+lV9UoncWqxuFfm8eBwzWNgyfBd6Gz+IeKQ9jCmyhoH99g15M3T+QaVHFjizVA==}
    engines: {node: '>=4'}
    dev: false

  /globals@14.0.0:
    resolution: {integrity: sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==}
    engines: {node: '>=18'}
    dev: false

  /gopd@1.0.1:
    resolution: {integrity: sha512-d65bNlIadxvpb/A2abVdlqKqV563juRnZ1Wtk6s1sIR8uNsXR70xqIzVqxVf1eTqDunwT2MkczEeaezCKTZhwA==}
    dependencies:
      get-intrinsic: 1.2.4
    dev: false

  /graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}
    dev: false

  /has-flag@3.0.0:
    resolution: {integrity: sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==}
    engines: {node: '>=4'}
    dev: false

  /has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}
    dev: false

  /has-property-descriptors@1.0.2:
    resolution: {integrity: sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==}
    dependencies:
      es-define-property: 1.0.0
    dev: false

  /has-proto@1.0.3:
    resolution: {integrity: sha512-SJ1amZAJUiZS+PhsVLf5tGydlaVB8EdFpaSO4gmiUKUOxk8qzn5AIy4ZeJUmh22znIdk/uMAUT2pl3FxzVUH+Q==}
    engines: {node: '>= 0.4'}
    dev: false

  /has-symbols@1.0.3:
    resolution: {integrity: sha512-l3LCuF6MgDNwTDKkdYGEihYjt5pRPbEg46rtlmnSPlUbgmB8LOIrKJbYYFBSbnPaJexMKtiPO8hmeRjRz2Td+A==}
    engines: {node: '>= 0.4'}
    dev: false

  /hasown@2.0.2:
    resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
    engines: {node: '>= 0.4'}
    dependencies:
      function-bind: 1.1.2
    dev: false

  /html-to-text@9.0.5:
    resolution: {integrity: sha512-qY60FjREgVZL03vJU6IfMV4GDjGBIoOyvuFdpBDIX9yTlDw0TjxVBQp+P8NvpdIXNJvfWBTNul7fsAQJq2FNpg==}
    engines: {node: '>=14'}
    dependencies:
      '@selderee/plugin-htmlparser2': 0.11.0
      deepmerge: 4.3.1
      dom-serializer: 2.0.0
      htmlparser2: 8.0.2
      selderee: 0.11.0
    dev: false

  /htmlparser2@8.0.2:
    resolution: {integrity: sha512-GYdjWKDkbRLkZ5geuHs5NY1puJ+PXwP7+fHPRz06Eirsb9ugf6d8kkXav6ADhcODhFFPMIXyxkxSuMf3D6NCFA==}
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      domutils: 3.1.0
      entities: 4.5.0
    dev: false

  /http-errors@2.0.0:
    resolution: {integrity: sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==}
    engines: {node: '>= 0.8'}
    dependencies:
      depd: 2.0.0
      inherits: 2.0.4
      setprototypeof: 1.2.0
      statuses: 2.0.1
      toidentifier: 1.0.1
    dev: false

  /http-proxy-agent@7.0.2:
    resolution: {integrity: sha512-T1gkAiYYDWYx3V5Bmyu7HcfcvL7mUrTWiM6yOfa3PIphViJ/gFPbvidQ+veqSOHci/PxBcDabeUNCzpOODJZig==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6
    transitivePeerDependencies:
      - supports-color
    dev: false

  /https-proxy-agent@7.0.5:
    resolution: {integrity: sha512-1e4Wqeblerz+tMKPIq2EMGiiWW1dIjZOksyHWSUm1rmuvw/how9hBHZ38lAGj5ID4Ik6EdkOw7NmWPy6LAwalw==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6
    transitivePeerDependencies:
      - supports-color
    dev: false

  /https@1.0.0:
    resolution: {integrity: sha512-4EC57ddXrkaF0x83Oj8sM6SLQHAWXw90Skqu2M4AEWENZ3F02dFJE/GARA8igO79tcgYqGrD7ae4f5L3um2lgg==}
    dev: false

  /iconv-lite@0.4.24:
    resolution: {integrity: sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==}
    engines: {node: '>=0.10.0'}
    dependencies:
      safer-buffer: 2.1.2
    dev: false

  /ieee754@1.2.1:
    resolution: {integrity: sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==}
    dev: false

  /ignore@5.3.1:
    resolution: {integrity: sha512-5Fytz/IraMjqpwfd34ke28PTVMjZjJG2MPn5t7OE4eUCUNf8BAa7b5WUS9/Qvr6mwOQS7Mk6vdsMno5he+T8Xw==}
    engines: {node: '>= 4'}
    dev: false

  /import-fresh@3.3.0:
    resolution: {integrity: sha512-veYYhQa+D1QBKznvhUHxb8faxlrwUnxseDAbAp457E0wLNio2bOSKnjYDhMj+YiAq61xrMGhQk9iXVk5FzgQMw==}
    engines: {node: '>=6'}
    dependencies:
      parent-module: 1.0.1
      resolve-from: 4.0.0
    dev: false

  /imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}
    dev: false

  /inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}
    dev: false

  /ini@1.3.8:
    resolution: {integrity: sha512-JV/yugV2uzW5iMRSiZAyDtQd+nxtUnjeLt0acNdw98kKLrvuRVyB80tsREOE7yvGVgalhZ6RNXCmEHkUKBKxew==}
    dev: false

  /invariant@2.2.4:
    resolution: {integrity: sha512-phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns//LaXl6wGYtUBY83nWS6Rf9tXm2e8VaK60JEjYldbPif/A2B1C2gNA==}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /ip-address@9.0.5:
    resolution: {integrity: sha512-zHtQzGojZXTwZTHQqra+ETKd4Sn3vgi7uBmlPoXVWZqYvuKmtI0l/VZTjqGmJY9x88GGOaZ9+G9ES8hC4T4X8g==}
    engines: {node: '>= 12'}
    dependencies:
      jsbn: 1.1.0
      sprintf-js: 1.1.3
    dev: false

  /ipaddr.js@1.9.1:
    resolution: {integrity: sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==}
    engines: {node: '>= 0.10'}
    dev: false

  /is-binary-path@2.1.0:
    resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
    engines: {node: '>=8'}
    dependencies:
      binary-extensions: 2.3.0
    dev: false

  /is-core-module@2.15.0:
    resolution: {integrity: sha512-Dd+Lb2/zvk9SKy1TGCt1wFJFo/MWBPMX5x7KcvLajWTGuomczdQX61PvY5yK6SVACwpoexWo81IfFyoKY2QnTA==}
    engines: {node: '>= 0.4'}
    dependencies:
      hasown: 2.0.2
    dev: false

  /is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}
    dev: false

  /is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}
    dev: false

  /is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}
    dependencies:
      is-extglob: 2.1.1
    dev: false

  /is-interactive@1.0.0:
    resolution: {integrity: sha512-2HvIEKRoqS62guEC+qBjpvRubdX910WCMuJTZ+I9yvqKU2/12eSL549HMwtabb4oupdj2sMP50k+XJfB/8JE6w==}
    engines: {node: '>=8'}
    dev: false

  /is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}
    dev: false

  /is-path-inside@3.0.3:
    resolution: {integrity: sha512-Fd4gABb+ycGAmKou8eMftCupSir5lRxqf4aD/vd0cD2qc4HL07OjCeuHMr8Ro4CoMaeCKDB0/ECBOVWjTwUvPQ==}
    engines: {node: '>=8'}
    dev: false

  /is-plain-object@5.0.0:
    resolution: {integrity: sha512-VRSzKkbMm5jMDoKLbltAkFQ5Qr7VDiTFGXxYFXXowVj387GeGNOCsOH6Msy00SGZ3Fp84b1Naa1psqgcCIEP5Q==}
    engines: {node: '>=0.10.0'}
    dev: false

  /is-unicode-supported@0.1.0:
    resolution: {integrity: sha512-knxG2q4UC3u8stRGyAVJCOdxFmv5DZiRcdlIaAQXAbSfJya+OhopNotLQrstBhququ4ZpuKbDc/8S6mgXgPFPw==}
    engines: {node: '>=10'}
    dev: false

  /isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}
    dev: false

  /jackspeak@2.3.6:
    resolution: {integrity: sha512-N3yCS/NegsOBokc8GAdM8UcmfsKiSS8cipheD/nivzr700H+nsMOxJjQnvwOcRYVuFkdH0wGUvW2WbXGmrZGbQ==}
    engines: {node: '>=14'}
    dependencies:
      '@isaacs/cliui': 8.0.2
    optionalDependencies:
      '@pkgjs/parseargs': 0.11.0
    dev: false

  /jackspeak@3.4.3:
    resolution: {integrity: sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==}
    dependencies:
      '@isaacs/cliui': 8.0.2
    optionalDependencies:
      '@pkgjs/parseargs': 0.11.0
    dev: false

  /jest-worker@27.5.1:
    resolution: {integrity: sha512-7vuh85V5cdDofPyxn58nrPjBktZo0u9x1g8WtjQol+jZDaE+fhN+cIvTj11GndBnMnyfrUOG1sZQxCdjKh+DKg==}
    engines: {node: '>= 10.13.0'}
    dependencies:
      '@types/node': 22.0.0
      merge-stream: 2.0.0
      supports-color: 8.1.1
    dev: false

  /jiti@1.21.6:
    resolution: {integrity: sha512-2yTgeWTWzMWkHu6Jp9NKgePDaYHbntiwvYuuJLbbN9vl7DC9DvXKOB2BC3ZZ92D3cvV/aflH0osDfwpHepQ53w==}
    hasBin: true
    dev: false

  /js-beautify@1.15.1:
    resolution: {integrity: sha512-ESjNzSlt/sWE8sciZH8kBF8BPlwXPwhR6pWKAw8bw4Bwj+iZcnKW6ONWUutJ7eObuBZQpiIb8S7OYspWrKt7rA==}
    engines: {node: '>=14'}
    hasBin: true
    dependencies:
      config-chain: 1.1.13
      editorconfig: 1.0.4
      glob: 10.4.5
      js-cookie: 3.0.5
      nopt: 7.2.1
    dev: false

  /js-cookie@3.0.5:
    resolution: {integrity: sha512-cEiJEAEoIbWfCZYKWhVwFuvPX1gETRYPw6LlaTKoxD3s2AkXzkCjnp6h0V77ozyqj0jakteJ4YqDJT830+lVGw==}
    engines: {node: '>=14'}
    dev: false

  /js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}
    dev: false

  /js-yaml@3.14.1:
    resolution: {integrity: sha512-okMH7OXXJ7YrN9Ok3/SXrnu4iX9yOk+25nqX4imS2npuvTYDmo/QEZoqwZkYaIDk3jVvBOTOIEgEhaLOynBS9g==}
    hasBin: true
    dependencies:
      argparse: 1.0.10
      esprima: 4.0.1
    dev: false

  /js-yaml@4.1.0:
    resolution: {integrity: sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==}
    hasBin: true
    dependencies:
      argparse: 2.0.1
    dev: false

  /jsbn@1.1.0:
    resolution: {integrity: sha512-4bYVV3aAMtDTTu4+xsDYa6sy9GyJ69/amsu9sYF2zqjiEoZA5xJi3BrfX3uY+/IekIu7MwdObdbDWpoZdBv3/A==}
    dev: false

  /jsesc@2.5.2:
    resolution: {integrity: sha512-OYu7XEzjkCQ3C5Ps3QIZsQfNpqoJyZZA99wd9aWd05NCtC5pWOkShK2mkL6HXQR6/Cy2lbNdPlZBpuQHXE63gA==}
    engines: {node: '>=4'}
    hasBin: true
    dev: false

  /json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}
    dev: false

  /json-parse-even-better-errors@2.3.1:
    resolution: {integrity: sha512-xyFwyhro/JEof6Ghe2iz2NcXoj2sloNsWr/XsERDK/oiPCfaNhl5ONfp+jQdAZRQQ0IJWNzH9zIZF7li91kh2w==}
    dev: false

  /json-schema-faker@0.5.6:
    resolution: {integrity: sha512-u/cFC26/GDxh2vPiAC8B8xVvpXAW+QYtG2mijEbKrimCk8IHtiwQBjCE8TwvowdhALWq9IcdIWZ+/8ocXvdL3Q==}
    hasBin: true
    dependencies:
      json-schema-ref-parser: 6.1.0
      jsonpath-plus: 7.2.0
    dev: false

  /json-schema-ref-parser@6.1.0:
    resolution: {integrity: sha512-pXe9H1m6IgIpXmE5JSb8epilNTGsmTb2iPohAXpOdhqGFbQjNeHHsZxU+C8w6T81GZxSPFLeUoqDJmzxx5IGuw==}
    deprecated: Please switch to @apidevtools/json-schema-ref-parser
    dependencies:
      call-me-maybe: 1.0.2
      js-yaml: 3.14.1
      ono: 4.0.11
    dev: false

  /json-schema-to-ts@3.1.0:
    resolution: {integrity: sha512-UeVN/ery4/JeXI8h4rM8yZPxsH+KqPi/84qFxHfTGHZnWnK9D0UU9ZGYO+6XAaJLqCWMiks+ARuFOKAiSxJCHA==}
    engines: {node: '>=16'}
    dependencies:
      '@babel/runtime': 7.25.0
      ts-algebra: 2.0.0
    dev: false

  /json-schema-traverse@0.4.1:
    resolution: {integrity: sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==}
    dev: false

  /json-schema-traverse@1.0.0:
    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}
    dev: false

  /json-stable-stringify-without-jsonify@1.0.1:
    resolution: {integrity: sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==}
    dev: false

  /json5@2.2.3:
    resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
    engines: {node: '>=6'}
    hasBin: true
    dev: false

  /jsonfile@6.1.0:
    resolution: {integrity: sha512-5dgndWOriYSm5cnYaJNhalLNDKOqFwyDB/rr1E9ZsGciGvKPs8R2xYGCacuf3z6K1YKDz182fd+fY3cn3pMqXQ==}
    dependencies:
      universalify: 2.0.1
    optionalDependencies:
      graceful-fs: 4.2.11
    dev: false

  /jsonpath-plus@7.2.0:
    resolution: {integrity: sha512-zBfiUPM5nD0YZSBT/o/fbCUlCcepMIdP0CJZxM1+KgA4f2T206f6VAg9e7mX35+KlMaIc5qXW34f3BnwJ3w+RA==}
    engines: {node: '>=12.0.0'}
    dev: false

  /jsonpointer@5.0.1:
    resolution: {integrity: sha512-p/nXbhSEcu3pZRdkW1OfJhpsVtW1gd4Wa1fnQc9YLiTfAjn0312eMKimbdIQzuZl9aa9xUGaRlP9T/CJE/ditQ==}
    engines: {node: '>=0.10.0'}
    dev: false

  /keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}
    dependencies:
      json-buffer: 3.0.1
    dev: false

  /leac@0.6.0:
    resolution: {integrity: sha512-y+SqErxb8h7nE/fiEX07jsbuhrpO9lL8eca7/Y1nuWV2moNlXhyd59iDGcRf6moVyDMbmTNzL40SUyrFU/yDpg==}
    dev: false

  /leven@3.1.0:
    resolution: {integrity: sha512-qsda+H8jTaUaN/x5vzW2rzc+8Rw4TAQ/4KjB46IwK5VH+IlVeeeje/EoZRpiXvIqjFgK84QffqPztGI3VBLG1A==}
    engines: {node: '>=6'}
    dev: false

  /levn@0.4.1:
    resolution: {integrity: sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      prelude-ls: 1.2.1
      type-check: 0.4.0
    dev: false

  /libphonenumber-js@1.11.5:
    resolution: {integrity: sha512-TwHR5BZxGRODtAfz03szucAkjT5OArXr+94SMtAM2pYXIlQNVMrxvb6uSCbnaJJV6QXEyICk7+l6QPgn72WHhg==}
    dev: false

  /lilconfig@2.1.0:
    resolution: {integrity: sha512-utWOt/GHzuUxnLKxB6dk81RoOeoNeHgbrXiuGk4yyF5qlRz+iIVWu56E2fqGHFrXz0QNUhLB/8nKqvRH66JKGQ==}
    engines: {node: '>=10'}
    dev: false

  /lilconfig@3.1.2:
    resolution: {integrity: sha512-eop+wDAvpItUys0FWkHIKeC9ybYrTGbU41U5K7+bttZZeohvnY7M9dZ5kB21GNWiFT2q1OoPTvncPCgSOVO5ow==}
    engines: {node: '>=14'}
    dev: false

  /lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}
    dev: false

  /liquidjs@10.16.1:
    resolution: {integrity: sha512-1JFL/Y7ONoajrfwav37yuz5yQHU3+Pgz1XWsg9E/2T8Fp65KalNfMF8QZ3+tNETqGUIB66waOSLOi64niYZE9A==}
    engines: {node: '>=14'}
    hasBin: true
    dependencies:
      commander: 10.0.1
    dev: false

  /loader-runner@4.3.0:
    resolution: {integrity: sha512-3R/1M+yS3j5ou80Me59j7F9IMs4PXs3VqRrm0TU3AbKPxlmpoY1TNscJV/oGJXo8qCatFGTfDbY6W6ipGOYXfg==}
    engines: {node: '>=6.11.5'}
    dev: false

  /locate-path@6.0.0:
    resolution: {integrity: sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==}
    engines: {node: '>=10'}
    dependencies:
      p-locate: 5.0.0
    dev: false

  /lodash.merge@4.6.2:
    resolution: {integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==}
    dev: false

  /log-symbols@4.1.0:
    resolution: {integrity: sha512-8XPvpAA8uyhfteu8pIvQxpJZ7SYYdpUivZpGy6sFsBuKRY/7rQGavedeB8aK+Zkyq6upMFVL/9AW6vOYzfRyLg==}
    engines: {node: '>=10'}
    dependencies:
      chalk: 4.1.2
      is-unicode-supported: 0.1.0
    dev: false

  /loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true
    dependencies:
      js-tokens: 4.0.0
    dev: false

  /lru-cache@10.4.3:
    resolution: {integrity: sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==}
    dev: false

  /lru-cache@5.1.1:
    resolution: {integrity: sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==}
    dependencies:
      yallist: 3.1.1
    dev: false

  /lru-cache@7.18.3:
    resolution: {integrity: sha512-jumlc0BIUrS3qJGgIkWZsyfAM7NCWiBcCDhnd+3NNM5KbBmLTgHVfWBcg6W+rLUsIpzpERPsvwUP7CckAQSOoA==}
    engines: {node: '>=12'}
    dev: false

  /marked@7.0.4:
    resolution: {integrity: sha512-t8eP0dXRJMtMvBojtkcsA7n48BkauktUKzfkPSCq85ZMTJ0v76Rke4DYz01omYpPTUh4p/f7HePgRo3ebG8+QQ==}
    engines: {node: '>= 16'}
    hasBin: true
    dev: false

  /md-to-react-email@5.0.2(react@18.3.1):
    resolution: {integrity: sha512-x6kkpdzIzUhecda/yahltfEl53mH26QdWu4abUF9+S0Jgam8P//Ciro8cdhyMHnT5MQUJYrIbO6ORM2UxPiNNA==}
    peerDependencies:
      react: 18.x
    dependencies:
      marked: 7.0.4
      react: 18.3.1
    dev: false

  /media-typer@0.3.0:
    resolution: {integrity: sha1-hxDXrwqmJvj/+hzgAWhUUmMlV0g=}
    engines: {node: '>= 0.6'}
    dev: false

  /merge-descriptors@1.0.1:
    resolution: {integrity: sha512-cCi6g3/Zr1iqQi6ySbseM1Xvooa98N0w31jzUYrXPX2xqObmFGHJ0tQ5u74H3mVh7wLouTseZyYIq39g8cNp1w==}
    dev: false

  /merge-stream@2.0.0:
    resolution: {integrity: sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==}
    dev: false

  /merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}
    dev: false

  /methods@1.1.2:
    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
    engines: {node: '>= 0.6'}
    dev: false

  /micromatch@4.0.7:
    resolution: {integrity: sha512-LPP/3KorzCwBxfeUuZmaR6bG2kdeHSbe0P2tY3FLRU4vYrjYz5hI4QZwV0njUx3jeuKe67YukQ1LSPZBKDqO/Q==}
    engines: {node: '>=8.6'}
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.1
    dev: false

  /mime-db@1.52.0:
    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
    engines: {node: '>= 0.6'}
    dev: false

  /mime-types@2.1.35:
    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
    engines: {node: '>= 0.6'}
    dependencies:
      mime-db: 1.52.0
    dev: false

  /mime@1.6.0:
    resolution: {integrity: sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==}
    engines: {node: '>=4'}
    hasBin: true
    dev: false

  /mimic-fn@2.1.0:
    resolution: {integrity: sha512-OqbOk5oEQeAZ8WXWydlu9HJjz9WVdEIvamMCcXmuqUYjTknH/sqsWvhQ3vgwKFRR1HpjvNBKQ37nbJgYzGqGcg==}
    engines: {node: '>=6'}
    dev: false

  /minimatch@3.1.2:
    resolution: {integrity: sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==}
    dependencies:
      brace-expansion: 1.1.11
    dev: false

  /minimatch@9.0.1:
    resolution: {integrity: sha512-0jWhJpD/MdhPXwPuiRkCbfYfSKp2qnn2eOc279qI7f+osl/l+prKSrvhg157zSYvx/1nmgn2NqdT6k2Z7zSH9w==}
    engines: {node: '>=16 || 14 >=14.17'}
    dependencies:
      brace-expansion: 2.0.1
    dev: false

  /minimatch@9.0.5:
    resolution: {integrity: sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==}
    engines: {node: '>=16 || 14 >=14.17'}
    dependencies:
      brace-expansion: 2.0.1
    dev: false

  /minipass@7.1.2:
    resolution: {integrity: sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==}
    engines: {node: '>=16 || 14 >=14.17'}
    dev: false

  /ms@2.0.0:
    resolution: {integrity: sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==}
    dev: false

  /ms@2.1.2:
    resolution: {integrity: sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w==}
    dev: false

  /ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}
    dev: false

  /mz@2.7.0:
    resolution: {integrity: sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==}
    dependencies:
      any-promise: 1.3.0
      object-assign: 4.1.1
      thenify-all: 1.6.0
    dev: false

  /nanoid@3.3.7:
    resolution: {integrity: sha512-eSRppjcPIatRIMC1U6UngP8XFcz8MQWGQdt1MTBQ7NaAmvXDfvNxbvWV3x2y6CdEUciCSsDHDQZbhYaB8QEo2g==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true
    dev: false

  /natural-compare@1.4.0:
    resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}
    dev: false

  /negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}
    dev: false

  /neo-async@2.6.2:
    resolution: {integrity: sha512-Yd3UES5mWCSqR+qNT93S3UoYUkqAZ9lLg8a7g9rimsWmYGK8cVToA4/sF3RrshdyV3sAGMXVUmpMYOw+dLpOuw==}
    dev: false

  /netmask@2.0.2:
    resolution: {integrity: sha512-dBpDMdxv9Irdq66304OLfEmQ9tbNRFnFTuZiLo+bD+r332bBmMJ8GBLXklIXXgxd3+v9+KUnZaUR5PJMa75Gsg==}
    engines: {node: '>= 0.4.0'}
    dev: false

  /next@14.1.4(@babel/core@7.24.5)(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-1WTaXeSrUwlz/XcnhGTY7+8eiaFvdet5z9u3V2jb+Ek1vFo0VhHKSAIJvDWfQpttWjnyw14kBeq28TPq7bTeEQ==}
    engines: {node: '>=18.17.0'}
    hasBin: true
    peerDependencies:
      '@opentelemetry/api': ^1.1.0
      react: ^18.2.0
      react-dom: ^18.2.0
      sass: ^1.3.0
    peerDependenciesMeta:
      '@opentelemetry/api':
        optional: true
      sass:
        optional: true
    dependencies:
      '@next/env': 14.1.4
      '@swc/helpers': 0.5.2
      busboy: 1.6.0
      caniuse-lite: 1.0.30001643
      graceful-fs: 4.2.11
      postcss: 8.4.31
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      styled-jsx: 5.1.1(@babel/core@7.24.5)(react@18.3.1)
    optionalDependencies:
      '@next/swc-darwin-arm64': 14.1.4
      '@next/swc-darwin-x64': 14.1.4
      '@next/swc-linux-arm64-gnu': 14.1.4
      '@next/swc-linux-arm64-musl': 14.1.4
      '@next/swc-linux-x64-gnu': 14.1.4
      '@next/swc-linux-x64-musl': 14.1.4
      '@next/swc-win32-arm64-msvc': 14.1.4
      '@next/swc-win32-ia32-msvc': 14.1.4
      '@next/swc-win32-x64-msvc': 14.1.4
    transitivePeerDependencies:
      - '@babel/core'
      - babel-plugin-macros
    dev: false

  /node-domexception@1.0.0:
    resolution: {integrity: sha512-/jKZoMpw0F8GRwl4/eLROPA3cfcXtLApP0QzLmUT/HuPCZWyB7IY9ZrMeKw2O/nFIqPQB3PVM9aYm0F312AXDQ==}
    engines: {node: '>=10.5.0'}
    dev: false

  /node-fetch@2.7.0:
    resolution: {integrity: sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==}
    engines: {node: 4.x || >=6.0.0}
    peerDependencies:
      encoding: ^0.1.0
    peerDependenciesMeta:
      encoding:
        optional: true
    dependencies:
      whatwg-url: 5.0.0
    dev: false

  /node-fetch@3.3.2:
    resolution: {integrity: sha512-dRB78srN/l6gqWulah9SrxeYnxeddIG30+GOqK/9OlLVyLg3HPnr6SqOWTWOXKRwC2eGYCkZ59NNuSgvSrpgOA==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}
    dependencies:
      data-uri-to-buffer: 4.0.1
      fetch-blob: 3.2.0
      formdata-polyfill: 4.0.10
    dev: false

  /node-releases@2.0.18:
    resolution: {integrity: sha512-d9VeXT4SJ7ZeOqGX6R5EM022wpL+eWPooLI+5UpWn2jCT1aosUQEhQP214x33Wkwx3JQMvIm+tIoVOdodFS40g==}
    dev: false

  /nopt@7.2.1:
    resolution: {integrity: sha512-taM24ViiimT/XntxbPyJQzCG+p4EKOpgD3mxFwW38mGjVUrfERQOeY4EDHjdnptttfHuHQXFx+lTP08Q+mLa/w==}
    engines: {node: ^14.17.0 || ^16.13.0 || >=18.0.0}
    hasBin: true
    dependencies:
      abbrev: 2.0.0
    dev: false

  /normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}
    dev: false

  /normalize-range@0.1.2:
    resolution: {integrity: sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==}
    engines: {node: '>=0.10.0'}
    dev: false

  /object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}
    dev: false

  /object-hash@3.0.0:
    resolution: {integrity: sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==}
    engines: {node: '>= 6'}
    dev: false

  /object-inspect@1.13.2:
    resolution: {integrity: sha512-IRZSRuzJiynemAXPYtPe5BoI/RESNYR7TYm50MC5Mqbd3Jmw5y790sErYw3V6SryFJD64b74qQQs9wn5Bg/k3g==}
    engines: {node: '>= 0.4'}
    dev: false

  /on-finished@2.4.1:
    resolution: {integrity: sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==}
    engines: {node: '>= 0.8'}
    dependencies:
      ee-first: 1.1.1
    dev: false

  /onetime@5.1.2:
    resolution: {integrity: sha512-kbpaSSGJTWdAY5KPVeMOKXSrPtr8C8C7wodJbcsd51jRnmD+GZu8Y0VoU6Dm5Z4vWr0Ig/1NKuWRKf7j5aaYSg==}
    engines: {node: '>=6'}
    dependencies:
      mimic-fn: 2.1.0
    dev: false

  /ono@4.0.11:
    resolution: {integrity: sha512-jQ31cORBFE6td25deYeD80wxKBMj+zBmHTrVxnc6CKhx8gho6ipmWM5zj/oeoqioZ99yqBls9Z/9Nss7J26G2g==}
    dependencies:
      format-util: 1.0.5
    dev: false

  /optionator@0.9.4:
    resolution: {integrity: sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      deep-is: 0.1.4
      fast-levenshtein: 2.0.6
      levn: 0.4.1
      prelude-ls: 1.2.1
      type-check: 0.4.0
      word-wrap: 1.2.5
    dev: false

  /ora@5.4.1:
    resolution: {integrity: sha512-5b6Y85tPxZZ7QytO+BQzysW31HJku27cRIlkbAXaNx+BdcVi+LlRFmVXzeF6a7JCwJpyw5c4b+YSVImQIrBpuQ==}
    engines: {node: '>=10'}
    dependencies:
      bl: 4.1.0
      chalk: 4.1.2
      cli-cursor: 3.1.0
      cli-spinners: 2.9.2
      is-interactive: 1.0.0
      is-unicode-supported: 0.1.0
      log-symbols: 4.1.0
      strip-ansi: 6.0.1
      wcwidth: 1.0.1
    dev: false

  /p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}
    dependencies:
      yocto-queue: 0.1.0
    dev: false

  /p-locate@5.0.0:
    resolution: {integrity: sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==}
    engines: {node: '>=10'}
    dependencies:
      p-limit: 3.1.0
    dev: false

  /pac-proxy-agent@7.0.2:
    resolution: {integrity: sha512-BFi3vZnO9X5Qt6NRz7ZOaPja3ic0PhlsmCRYLOpN11+mWBCR6XJDqW5RF3j8jm4WGGQZtBA+bTfxYzeKW73eHg==}
    engines: {node: '>= 14'}
    dependencies:
      '@tootallnate/quickjs-emscripten': 0.23.0
      agent-base: 7.1.1
      debug: 4.3.6
      get-uri: 6.0.3
      http-proxy-agent: 7.0.2
      https-proxy-agent: 7.0.5
      pac-resolver: 7.0.1
      socks-proxy-agent: 8.0.4
    transitivePeerDependencies:
      - supports-color
    dev: false

  /pac-resolver@7.0.1:
    resolution: {integrity: sha512-5NPgf87AT2STgwa2ntRMr45jTKrYBGkVU36yT0ig/n/GMAa3oPqhZfIQ2kMEimReg0+t9kZViDVZ83qfVUlckg==}
    engines: {node: '>= 14'}
    dependencies:
      degenerator: 5.0.1
      netmask: 2.0.2
    dev: false

  /package-json-from-dist@1.0.0:
    resolution: {integrity: sha512-dATvCeZN/8wQsGywez1mzHtTlP22H8OEfPrVMLNr4/eGa+ijtLn/6M5f0dY8UKNrC2O9UCU6SSoG3qRKnt7STw==}
    dev: false

  /parent-module@1.0.1:
    resolution: {integrity: sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==}
    engines: {node: '>=6'}
    dependencies:
      callsites: 3.1.0
    dev: false

  /parse-srcset@1.0.2:
    resolution: {integrity: sha512-/2qh0lav6CmI15FzA3i/2Bzk2zCgQhGMkvhOhKNcBVQ1ldgpbfiNTVslmooUmWJcADi1f1kIeynbDRVzNlfR6Q==}
    dev: false

  /parseley@0.12.1:
    resolution: {integrity: sha512-e6qHKe3a9HWr0oMRVDTRhKce+bRO8VGQR3NyVwcjwrbhMmFCX9KszEV35+rn4AdilFAq9VPxP/Fe1wC9Qjd2lw==}
    dependencies:
      leac: 0.6.0
      peberminta: 0.9.0
    dev: false

  /parseurl@1.3.3:
    resolution: {integrity: sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==}
    engines: {node: '>= 0.8'}
    dev: false

  /partysocket@0.0.17:
    resolution: {integrity: sha512-8Re9nmgP2LzQhq+FBs9+BZNTjmMwoF4geEKlpH0lxW1JKp3FmplN74306afGH9EsOjdfcXqKY2VCZtc3iAHIow==}
    dev: false

  /path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}
    dev: false

  /path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}
    dev: false

  /path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}
    dev: false

  /path-scurry@1.11.1:
    resolution: {integrity: sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==}
    engines: {node: '>=16 || 14 >=14.18'}
    dependencies:
      lru-cache: 10.4.3
      minipass: 7.1.2
    dev: false

  /path-to-regexp@0.1.7:
    resolution: {integrity: sha512-5DFkuoqlv1uYQKxy8omFBeJPQcdoE07Kv2sferDCrAq1ohOU+MSDswDIbnx3YAM60qIOnYa53wBhXW0EbMonrQ==}
    dev: false

  /peberminta@0.9.0:
    resolution: {integrity: sha512-XIxfHpEuSJbITd1H3EeQwpcZbTLHc+VVr8ANI9t5sit565tsI4/xK3KWTUFE2e6QiangUkh3B0jihzmGnNrRsQ==}
    dev: false

  /picocolors@1.0.1:
    resolution: {integrity: sha512-anP1Z8qwhkbmu7MFP5iTt+wQKXgwzf7zTyGlcdzabySa9vd0Xt392U0rVmz9poOaBj0uHJKyyo9/upk0HrEQew==}
    dev: false

  /picomatch@2.3.1:
    resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
    engines: {node: '>=8.6'}
    dev: false

  /pify@2.3.0:
    resolution: {integrity: sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==}
    engines: {node: '>=0.10.0'}
    dev: false

  /pirates@4.0.6:
    resolution: {integrity: sha512-saLsH7WeYYPiD25LDuLRRY/i+6HaPYr6G1OUlN39otzkSTxKnubR9RTxS3/Kk50s1g2JTgFwWQDQyplC5/SHZg==}
    engines: {node: '>= 6'}
    dev: false

  /postcss-import@15.1.0(postcss@8.4.38):
    resolution: {integrity: sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==}
    engines: {node: '>=14.0.0'}
    peerDependencies:
      postcss: ^8.0.0
    dependencies:
      postcss: 8.4.38
      postcss-value-parser: 4.2.0
      read-cache: 1.0.0
      resolve: 1.22.8
    dev: false

  /postcss-js@4.0.1(postcss@8.4.38):
    resolution: {integrity: sha512-dDLF8pEO191hJMtlHFPRa8xsizHaM82MLfNkUHdUtVEV3tgTp5oj+8qbEqYM57SLfc74KSbw//4SeJma2LRVIw==}
    engines: {node: ^12 || ^14 || >= 16}
    peerDependencies:
      postcss: ^8.4.21
    dependencies:
      camelcase-css: 2.0.1
      postcss: 8.4.38
    dev: false

  /postcss-load-config@4.0.2(postcss@8.4.38):
    resolution: {integrity: sha512-bSVhyJGL00wMVoPUzAVAnbEoWyqRxkjv64tUl427SKnPrENtq6hJwUojroMz2VB+Q1edmi4IfrAPpami5VVgMQ==}
    engines: {node: '>= 14'}
    peerDependencies:
      postcss: '>=8.0.9'
      ts-node: '>=9.0.0'
    peerDependenciesMeta:
      postcss:
        optional: true
      ts-node:
        optional: true
    dependencies:
      lilconfig: 3.1.2
      postcss: 8.4.38
      yaml: 2.5.0
    dev: false

  /postcss-nested@6.2.0(postcss@8.4.38):
    resolution: {integrity: sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==}
    engines: {node: '>=12.0'}
    peerDependencies:
      postcss: ^8.2.14
    dependencies:
      postcss: 8.4.38
      postcss-selector-parser: 6.1.1
    dev: false

  /postcss-selector-parser@6.1.1:
    resolution: {integrity: sha512-b4dlw/9V8A71rLIDsSwVmak9z2DuBUB7CA1/wSdelNEzqsjoSPeADTWNO09lpH49Diy3/JIZ2bSPB1dI3LJCHg==}
    engines: {node: '>=4'}
    dependencies:
      cssesc: 3.0.0
      util-deprecate: 1.0.2
    dev: false

  /postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}
    dev: false

  /postcss@8.4.31:
    resolution: {integrity: sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==}
    engines: {node: ^10 || ^12 || >=14}
    dependencies:
      nanoid: 3.3.7
      picocolors: 1.0.1
      source-map-js: 1.0.2
    dev: false

  /postcss@8.4.38:
    resolution: {integrity: sha512-Wglpdk03BSfXkHoQa3b/oulrotAkwrlLDRSOb9D0bN86FdRyE9lppSp33aHNPgBa0JKCoB+drFLZkQoRRYae5A==}
    engines: {node: ^10 || ^12 || >=14}
    dependencies:
      nanoid: 3.3.7
      picocolors: 1.0.1
      source-map-js: 1.2.0
    dev: false

  /postcss@8.4.40:
    resolution: {integrity: sha512-YF2kKIUzAofPMpfH6hOi2cGnv/HrUlfucspc7pDyvv7kGdqXrfj8SCl/t8owkEgKEuu8ZcRjSOxFxVLqwChZ2Q==}
    engines: {node: ^10 || ^12 || >=14}
    dependencies:
      nanoid: 3.3.7
      picocolors: 1.0.1
      source-map-js: 1.2.0
    dev: false

  /prelude-ls@1.2.1:
    resolution: {integrity: sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==}
    engines: {node: '>= 0.8.0'}
    dev: false

  /prism-react-renderer@2.1.0(react@18.3.1):
    resolution: {integrity: sha512-I5cvXHjA1PVGbGm1MsWCpvBCRrYyxEri0MC7/JbfIfYfcXAxHyO5PaUjs3A8H5GW6kJcLhTHxxMaOZZpRZD2iQ==}
    peerDependencies:
      react: '>=16.0.0'
    dependencies:
      '@types/prismjs': 1.26.4
      clsx: 1.2.1
      react: 18.3.1
    dev: false

  /prismjs@1.29.0:
    resolution: {integrity: sha512-Kx/1w86q/epKcmte75LNrEoT+lX8pBpavuAbvJWRXar7Hz8jrtF+e3vY751p0R8H9HdArwaCTNDDzHg/ScJK1Q==}
    engines: {node: '>=6'}
    dev: false

  /proto-list@1.2.4:
    resolution: {integrity: sha512-vtK/94akxsTMhe0/cbfpR+syPuszcuwhqVjJq26CuNDgFGj682oRBXOP5MJpv2r7JtE8MsiepGIqvvOTBwn2vA==}
    dev: false

  /proxy-addr@2.0.7:
    resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
    engines: {node: '>= 0.10'}
    dependencies:
      forwarded: 0.2.0
      ipaddr.js: 1.9.1
    dev: false

  /proxy-agent@6.4.0:
    resolution: {integrity: sha512-u0piLU+nCOHMgGjRbimiXmA9kM/L9EHh3zL81xCdp7m+Y2pHIsnmbdDoEDoAz5geaonNR6q6+yOPQs6n4T6sBQ==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6
      http-proxy-agent: 7.0.2
      https-proxy-agent: 7.0.5
      lru-cache: 7.18.3
      pac-proxy-agent: 7.0.2
      proxy-from-env: 1.1.0
      socks-proxy-agent: 8.0.4
    transitivePeerDependencies:
      - supports-color
    dev: false

  /proxy-from-env@1.1.0:
    resolution: {integrity: sha512-D+zkORCbA9f1tdWRK0RaCR3GPv50cMxcrz4X8k5LTSUD1Dkw47mKJEZQNunItRTkWwgtaUSo1RVFRIG9ZXiFYg==}
    dev: false

  /punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}
    dev: false

  /qs@6.11.0:
    resolution: {integrity: sha512-MvjoMCJwEarSbUYk5O+nmoSzSutSsTwF85zcHPQ9OrlFoZOYIjaqBAJIqIXjptyD5vThxGq52Xu/MaJzRkIk4Q==}
    engines: {node: '>=0.6'}
    dependencies:
      side-channel: 1.0.6
    dev: false

  /queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}
    dev: false

  /randombytes@2.1.0:
    resolution: {integrity: sha512-vYl3iOX+4CKUWuxGi9Ukhie6fsqXqS9FE2Zaic4tNFD2N2QQaXOMFbuKK4QmDHC0JO6B1Zp41J0LpT0oR68amQ==}
    dependencies:
      safe-buffer: 5.2.1
    dev: false

  /range-parser@1.2.1:
    resolution: {integrity: sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==}
    engines: {node: '>= 0.6'}
    dev: false

  /raw-body@2.5.2:
    resolution: {integrity: sha512-8zGqypfENjCIqGhgXToC8aB2r7YrBX+AQAfIPs/Mlk+BtPTztOvTS01NRW/3Eh60J+a48lt8qsCzirQ6loCVfA==}
    engines: {node: '>= 0.8'}
    dependencies:
      bytes: 3.1.2
      http-errors: 2.0.0
      iconv-lite: 0.4.24
      unpipe: 1.0.0
    dev: false

  /react-dom@18.3.1(react@18.3.1):
    resolution: {integrity: sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==}
    peerDependencies:
      react: ^18.3.1
    dependencies:
      loose-envify: 1.4.0
      react: 18.3.1
      scheduler: 0.23.2
    dev: false

  /react-email@2.1.6(eslint@9.8.0):
    resolution: {integrity: sha512-BtR9VI1CMq4953wfiBmzupKlWcRThaWG2dDgl1vWAllK3tNNmJNerwY4VlmASRDQZE3LpLXU3+lf8N/VAKdbZQ==}
    engines: {node: '>=18.0.0'}
    hasBin: true
    dependencies:
      '@babel/core': 7.24.5
      '@babel/parser': 7.24.5
      '@radix-ui/colors': 1.0.1
      '@radix-ui/react-collapsible': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-popover': 1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-slot': 1.1.0(@types/react@18.2.47)(react@18.3.1)
      '@radix-ui/react-toggle-group': 1.1.0(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@radix-ui/react-tooltip': 1.1.1(@types/react-dom@18.3.0)(@types/react@18.2.47)(react-dom@18.3.1)(react@18.3.1)
      '@swc/core': 1.3.101
      '@types/react': 18.2.47
      '@types/react-dom': 18.3.0
      '@types/webpack': 5.28.5(@swc/core@1.3.101)(esbuild@0.19.11)
      autoprefixer: 10.4.14(postcss@8.4.38)
      chalk: 4.1.2
      chokidar: 3.5.3
      clsx: 2.1.0
      commander: 11.1.0
      debounce: 2.0.0
      esbuild: 0.19.11
      eslint-config-prettier: 9.0.0(eslint@9.8.0)
      eslint-config-turbo: 1.10.12(eslint@9.8.0)
      framer-motion: 10.17.4(react-dom@18.3.1)(react@18.3.1)
      glob: 10.3.4
      log-symbols: 4.1.0
      mime-types: 2.1.35
      next: 14.1.4(@babel/core@7.24.5)(react-dom@18.3.1)(react@18.3.1)
      normalize-path: 3.0.0
      ora: 5.4.1
      postcss: 8.4.38
      prism-react-renderer: 2.1.0(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      socket.io: 4.7.3
      socket.io-client: 4.7.3
      sonner: 1.3.1(react-dom@18.3.1)(react@18.3.1)
      source-map-js: 1.0.2
      stacktrace-parser: 0.1.10
      tailwind-merge: 2.2.0
      tailwindcss: 3.4.0
      typescript: 5.1.6
    transitivePeerDependencies:
      - '@opentelemetry/api'
      - '@swc/helpers'
      - babel-plugin-macros
      - bufferutil
      - eslint
      - sass
      - supports-color
      - ts-node
      - uglify-js
      - utf-8-validate
      - webpack-cli
    dev: false

  /react-promise-suspense@0.3.4:
    resolution: {integrity: sha512-I42jl7L3Ze6kZaq+7zXWSunBa3b1on5yfvUW6Eo/3fFOj6dZ5Bqmcd264nJbTK/gn1HjjILAjSwnZbV4RpSaNQ==}
    dependencies:
      fast-deep-equal: 2.0.1
    dev: false

  /react-remove-scroll-bar@2.3.6(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-DtSYaao4mBmX+HDo5YWYdBWQwYIQQshUV/dVxFxK+KM26Wjwp1gZ6rv6OC3oujI6Bfu6Xyg3TwK533AQutsn/g==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': ^16.8.0 || ^17.0.0 || ^18.0.0
      react: ^16.8.0 || ^17.0.0 || ^18.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
      react-style-singleton: 2.2.1(@types/react@18.2.47)(react@18.3.1)
      tslib: 2.6.3
    dev: false

  /react-remove-scroll@2.5.7(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-FnrTWO4L7/Bhhf3CYBNArEG/yROV0tKmTv7/3h9QCFvH6sndeFf1wPqOcbFVu5VAulS5dV1wGT3GZZ/1GawqiA==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': ^16.8.0 || ^17.0.0 || ^18.0.0
      react: ^16.8.0 || ^17.0.0 || ^18.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
      react-remove-scroll-bar: 2.3.6(@types/react@18.2.47)(react@18.3.1)
      react-style-singleton: 2.2.1(@types/react@18.2.47)(react@18.3.1)
      tslib: 2.6.3
      use-callback-ref: 1.3.2(@types/react@18.2.47)(react@18.3.1)
      use-sidecar: 1.1.2(@types/react@18.2.47)(react@18.3.1)
    dev: false

  /react-style-singleton@2.2.1(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-ZWj0fHEMyWkHzKYUr2Bs/4zU6XLmq9HsgBURm7g5pAVfyn49DgUiNgY2d4lXRlYSiCif9YBGpQleewkcqddc7g==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': ^16.8.0 || ^17.0.0 || ^18.0.0
      react: ^16.8.0 || ^17.0.0 || ^18.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      get-nonce: 1.0.1
      invariant: 2.2.4
      react: 18.3.1
      tslib: 2.6.3
    dev: false

  /react@18.3.1:
    resolution: {integrity: sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==}
    engines: {node: '>=0.10.0'}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /read-cache@1.0.0:
    resolution: {integrity: sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==}
    dependencies:
      pify: 2.3.0
    dev: false

  /readable-stream@3.6.2:
    resolution: {integrity: sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==}
    engines: {node: '>= 6'}
    dependencies:
      inherits: 2.0.4
      string_decoder: 1.3.0
      util-deprecate: 1.0.2
    dev: false

  /readdirp@3.6.0:
    resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
    engines: {node: '>=8.10.0'}
    dependencies:
      picomatch: 2.3.1
    dev: false

  /regenerator-runtime@0.14.1:
    resolution: {integrity: sha512-dYnhHh0nJoMfnkZs6GmmhFknAGRrLznOu5nc9ML+EJxGvrx6H7teuevqVqCuPcPK//3eDrrjQhehXVx9cnkGdw==}
    dev: false

  /require-from-string@2.0.2:
    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
    engines: {node: '>=0.10.0'}
    dev: false

  /resolve-from@4.0.0:
    resolution: {integrity: sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==}
    engines: {node: '>=4'}
    dev: false

  /resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}
    dev: true

  /resolve@1.22.8:
    resolution: {integrity: sha512-oKWePCxqpd6FlLvGV1VU0x7bkPmmCNolxzjMf4NczoDnQcIWrAF+cPtZn5i6n+RfD2d9i0tzpKnG6Yk168yIyw==}
    hasBin: true
    dependencies:
      is-core-module: 2.15.0
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0
    dev: false

  /restore-cursor@3.1.0:
    resolution: {integrity: sha512-l+sSefzHpj5qimhFSE5a8nufZYAM3sBSVMAPtYkmC+4EH2anSGaEMXSD0izRQbu9nfyQ9y5JrVmp7E8oZrUjvA==}
    engines: {node: '>=8'}
    dependencies:
      onetime: 5.1.2
      signal-exit: 3.0.7
    dev: false

  /reusify@1.0.4:
    resolution: {integrity: sha512-U9nH88a3fc/ekCF1l0/UP1IosiuIjyTh7hBvXVMHYgVcfGvt897Xguj2UOLDeI5BG2m7/uwyaLVT6fbtCwTyzw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}
    dev: false

  /run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}
    dependencies:
      queue-microtask: 1.2.3
    dev: false

  /safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}
    dev: false

  /safer-buffer@2.1.2:
    resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}
    dev: false

  /sanitize-html@2.13.0:
    resolution: {integrity: sha512-Xff91Z+4Mz5QiNSLdLWwjgBDm5b1RU6xBT0+12rapjiaR7SwfRdjw8f+6Rir2MXKLrDicRFHdb51hGOAxmsUIA==}
    dependencies:
      deepmerge: 4.3.1
      escape-string-regexp: 4.0.0
      htmlparser2: 8.0.2
      is-plain-object: 5.0.0
      parse-srcset: 1.0.2
      postcss: 8.4.40
    dev: false

  /scheduler@0.23.2:
    resolution: {integrity: sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /schema-utils@3.3.0:
    resolution: {integrity: sha512-pN/yOAvcC+5rQ5nERGuwrjLlYvLTbCibnZ1I7B1LaiAz9BRBlE9GMgE/eqV30P7aJQUf7Ddimy/RsbYO/GrVGg==}
    engines: {node: '>= 10.13.0'}
    dependencies:
      '@types/json-schema': 7.0.15
      ajv: 6.12.6
      ajv-keywords: 3.5.2(ajv@6.12.6)
    dev: false

  /selderee@0.11.0:
    resolution: {integrity: sha512-5TF+l7p4+OsnP8BCCvSyZiSPc4x4//p5uPwK8TCnVPJYRmU2aYKMpOXvw8zM5a5JvuuCGN1jmsMwuU2W02ukfA==}
    dependencies:
      parseley: 0.12.1
    dev: false

  /semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true
    dev: false

  /semver@7.6.3:
    resolution: {integrity: sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==}
    engines: {node: '>=10'}
    hasBin: true
    dev: false

  /send@0.18.0:
    resolution: {integrity: sha512-qqWzuOjSFOuqPjFe4NOsMLafToQQwBSOEpS+FwEt3A2V3vKubTquT3vmLTQpFgMXp8AlFWFuP1qKaJZOtPpVXg==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      debug: 2.6.9
      depd: 2.0.0
      destroy: 1.2.0
      encodeurl: 1.0.2
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 0.5.2
      http-errors: 2.0.0
      mime: 1.6.0
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.1
    transitivePeerDependencies:
      - supports-color
    dev: false

  /serialize-javascript@6.0.2:
    resolution: {integrity: sha512-Saa1xPByTTq2gdeFZYLLo+RFE35NHZkAbqZeWNd3BpzppeVisAqpDjcp8dyf6uIvEqJRd46jemmyA4iFIeVk8g==}
    dependencies:
      randombytes: 2.1.0
    dev: false

  /serve-static@1.15.0:
    resolution: {integrity: sha512-XGuRDNjXUijsUL0vl6nSD7cwURuzEgglbOaFuZM9g3kwDXOWVTck0jLzjPzGD+TazWbboZYu52/9/XPdUgne9g==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      encodeurl: 1.0.2
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 0.18.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /set-function-length@1.2.2:
    resolution: {integrity: sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==}
    engines: {node: '>= 0.4'}
    dependencies:
      define-data-property: 1.1.4
      es-errors: 1.3.0
      function-bind: 1.1.2
      get-intrinsic: 1.2.4
      gopd: 1.0.1
      has-property-descriptors: 1.0.2
    dev: false

  /setprototypeof@1.2.0:
    resolution: {integrity: sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==}
    dev: false

  /shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}
    dependencies:
      shebang-regex: 3.0.0
    dev: false

  /shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}
    dev: false

  /side-channel@1.0.6:
    resolution: {integrity: sha512-fDW/EZ6Q9RiO8eFG8Hj+7u/oW+XrPTIChwCOM2+th2A6OblDtYYIpve9m+KvI9Z4C9qSEXlaGR6bTEYHReuglA==}
    engines: {node: '>= 0.4'}
    dependencies:
      call-bind: 1.0.7
      es-errors: 1.3.0
      get-intrinsic: 1.2.4
      object-inspect: 1.13.2
    dev: false

  /signal-exit@3.0.7:
    resolution: {integrity: sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==}
    dev: false

  /signal-exit@4.1.0:
    resolution: {integrity: sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==}
    engines: {node: '>=14'}
    dev: false

  /smart-buffer@4.2.0:
    resolution: {integrity: sha512-94hK0Hh8rPqQl2xXc3HsaBoOXKV20MToPkcXvwbISWLEs+64sBq5kFgn2kJDHb1Pry9yrP0dxrCI9RRci7RXKg==}
    engines: {node: '>= 6.0.0', npm: '>= 3.0.0'}
    dev: false

  /socket.io-adapter@2.5.5:
    resolution: {integrity: sha512-eLDQas5dzPgOWCk9GuuJC2lBqItuhKI4uxGgo9aIV7MYbk2h9Q6uULEh8WBzThoI7l+qU9Ast9fVUmkqPP9wYg==}
    dependencies:
      debug: 4.3.6
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /socket.io-client@4.7.3:
    resolution: {integrity: sha512-nU+ywttCyBitXIl9Xe0RSEfek4LneYkJxCeNnKCuhwoH4jGXO1ipIUw/VA/+Vvv2G1MTym11fzFC0SxkrcfXDw==}
    engines: {node: '>=10.0.0'}
    dependencies:
      '@socket.io/component-emitter': 3.1.2
      debug: 4.3.6
      engine.io-client: 6.5.4
      socket.io-parser: 4.2.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /socket.io-parser@4.2.4:
    resolution: {integrity: sha512-/GbIKmo8ioc+NIWIhwdecY0ge+qVBSMdgxGygevmdHj24bsfgtCmcUUcQ5ZzcylGFHsN3k4HB4Cgkl96KVnuew==}
    engines: {node: '>=10.0.0'}
    dependencies:
      '@socket.io/component-emitter': 3.1.2
      debug: 4.3.6
    transitivePeerDependencies:
      - supports-color
    dev: false

  /socket.io@4.7.3:
    resolution: {integrity: sha512-SE+UIQXBQE+GPG2oszWMlsEmWtHVqw/h1VrYJGK5/MC7CH5p58N448HwIrtREcvR4jfdOJAY4ieQfxMr55qbbw==}
    engines: {node: '>=10.2.0'}
    dependencies:
      accepts: 1.3.8
      base64id: 2.0.0
      cors: 2.8.5
      debug: 4.3.6
      engine.io: 6.5.5
      socket.io-adapter: 2.5.5
      socket.io-parser: 4.2.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate
    dev: false

  /socks-proxy-agent@8.0.4:
    resolution: {integrity: sha512-GNAq/eg8Udq2x0eNiFkr9gRg5bA7PXEWagQdeRX4cPSG+X/8V38v637gim9bjFptMk1QWsCTr0ttrJEiXbNnRw==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6
      socks: 2.8.3
    transitivePeerDependencies:
      - supports-color
    dev: false

  /socks@2.8.3:
    resolution: {integrity: sha512-l5x7VUUWbjVFbafGLxPWkYsHIhEvmF85tbIeFZWc8ZPtoMyybuEhL7Jye/ooC4/d48FgOjSJXgsF/AJPYCW8Zw==}
    engines: {node: '>= 10.0.0', npm: '>= 3.0.0'}
    dependencies:
      ip-address: 9.0.5
      smart-buffer: 4.2.0
    dev: false

  /sonner@1.3.1(react-dom@18.3.1)(react@18.3.1):
    resolution: {integrity: sha512-+rOAO56b2eI3q5BtgljERSn2umRk63KFIvgb2ohbZ5X+Eb5u+a/7/0ZgswYqgBMg8dyl7n6OXd9KasA8QF9ToA==}
    peerDependencies:
      react: ^18.0.0
      react-dom: ^18.0.0
    dependencies:
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    dev: false

  /source-map-js@1.0.2:
    resolution: {integrity: sha512-R0XvVJ9WusLiqTCEiGCmICCMplcCkIwwR11mOSD9CR5u+IXYdiseeEuXCVAjS54zqwkLcPNnmU4OeJ6tUrWhDw==}
    engines: {node: '>=0.10.0'}
    dev: false

  /source-map-js@1.2.0:
    resolution: {integrity: sha512-itJW8lvSA0TXEphiRoawsCksnlf8SyvmFzIhltqAHluXd88pkCd+cXJVHTDwdCr0IzwptSm035IHQktUu1QUMg==}
    engines: {node: '>=0.10.0'}
    dev: false

  /source-map-support@0.5.21:
    resolution: {integrity: sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==}
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1
    dev: false

  /source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}
    dev: false

  /sprintf-js@1.0.3:
    resolution: {integrity: sha512-D9cPgkvLlV3t3IzL0D0YLvGA9Ahk4PcvVwUbN0dSGr1aP0Nrt4AEnTUbuGvquEC0mA64Gqt1fzirlRs5ibXx8g==}
    dev: false

  /sprintf-js@1.1.3:
    resolution: {integrity: sha512-Oo+0REFV59/rz3gfJNKQiBlwfHaSESl1pcGyABQsnnIfWOFt6JNj5gCog2U6MLZ//IGYD+nA8nI+mTShREReaA==}
    dev: false

  /stacktrace-parser@0.1.10:
    resolution: {integrity: sha512-KJP1OCML99+8fhOHxwwzyWrlUuVX5GQ0ZpJTd1DFXhdkrvg1szxfHhawXUZ3g9TkXORQd4/WG68jMlQZ2p8wlg==}
    engines: {node: '>=6'}
    dependencies:
      type-fest: 0.7.1
    dev: false

  /statuses@2.0.1:
    resolution: {integrity: sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==}
    engines: {node: '>= 0.8'}
    dev: false

  /streamsearch@1.1.0:
    resolution: {integrity: sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg==}
    engines: {node: '>=10.0.0'}
    dev: false

  /string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1
    dev: false

  /string-width@5.1.2:
    resolution: {integrity: sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==}
    engines: {node: '>=12'}
    dependencies:
      eastasianwidth: 0.2.0
      emoji-regex: 9.2.2
      strip-ansi: 7.1.0
    dev: false

  /string_decoder@1.3.0:
    resolution: {integrity: sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==}
    dependencies:
      safe-buffer: 5.2.1
    dev: false

  /strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}
    dependencies:
      ansi-regex: 5.0.1
    dev: false

  /strip-ansi@7.1.0:
    resolution: {integrity: sha512-iq6eVVI64nQQTRYq2KtEg2d2uU7LElhTJwsH4YzIHZshxlgZms/wIc4VoDQTlG/IvVIrBKG06CrZnp0qv7hkcQ==}
    engines: {node: '>=12'}
    dependencies:
      ansi-regex: 6.0.1
    dev: false

  /strip-json-comments@3.1.1:
    resolution: {integrity: sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==}
    engines: {node: '>=8'}
    dev: false

  /styled-jsx@5.1.1(@babel/core@7.24.5)(react@18.3.1):
    resolution: {integrity: sha512-pW7uC1l4mBZ8ugbiZrcIsiIvVx1UmTfw7UkC3Um2tmfUq9Bhk8IiyEIPl6F8agHgjzku6j0xQEZbfA5uSgSaCw==}
    engines: {node: '>= 12.0.0'}
    peerDependencies:
      '@babel/core': '*'
      babel-plugin-macros: '*'
      react: '>= 16.8.0 || 17.x.x || ^18.0.0-0'
    peerDependenciesMeta:
      '@babel/core':
        optional: true
      babel-plugin-macros:
        optional: true
    dependencies:
      '@babel/core': 7.24.5
      client-only: 0.0.1
      react: 18.3.1
    dev: false

  /sucrase@3.35.0:
    resolution: {integrity: sha512-8EbVDiu9iN/nESwxeSxDKe0dunta1GOlHufmSSXxMD2z2/tMZpDMpvXQGsc+ajGo8y2uYUmixaSRUc/QPoQ0GA==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true
    dependencies:
      '@jridgewell/gen-mapping': 0.3.5
      commander: 4.1.1
      glob: 10.4.5
      lines-and-columns: 1.2.4
      mz: 2.7.0
      pirates: 4.0.6
      ts-interface-checker: 0.1.13
    dev: false

  /supports-color@5.5.0:
    resolution: {integrity: sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==}
    engines: {node: '>=4'}
    dependencies:
      has-flag: 3.0.0
    dev: false

  /supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}
    dependencies:
      has-flag: 4.0.0
    dev: false

  /supports-color@8.1.1:
    resolution: {integrity: sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==}
    engines: {node: '>=10'}
    dependencies:
      has-flag: 4.0.0
    dev: false

  /supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}
    dev: false

  /tailwind-merge@2.2.0:
    resolution: {integrity: sha512-SqqhhaL0T06SW59+JVNfAqKdqLs0497esifRrZ7jOaefP3o64fdFNDMrAQWZFMxTLJPiHVjRLUywT8uFz1xNWQ==}
    dependencies:
      '@babel/runtime': 7.25.0
    dev: false

  /tailwindcss@3.4.0:
    resolution: {integrity: sha512-VigzymniH77knD1dryXbyxR+ePHihHociZbXnLZHUyzf2MMs2ZVqlUrZ3FvpXP8pno9JzmILt1sZPD19M3IxtA==}
    engines: {node: '>=14.0.0'}
    hasBin: true
    dependencies:
      '@alloc/quick-lru': 5.2.0
      arg: 5.0.2
      chokidar: 3.5.3
      didyoumean: 1.2.2
      dlv: 1.1.3
      fast-glob: 3.3.2
      glob-parent: 6.0.2
      is-glob: 4.0.3
      jiti: 1.21.6
      lilconfig: 2.1.0
      micromatch: 4.0.7
      normalize-path: 3.0.0
      object-hash: 3.0.0
      picocolors: 1.0.1
      postcss: 8.4.38
      postcss-import: 15.1.0(postcss@8.4.38)
      postcss-js: 4.0.1(postcss@8.4.38)
      postcss-load-config: 4.0.2(postcss@8.4.38)
      postcss-nested: 6.2.0(postcss@8.4.38)
      postcss-selector-parser: 6.1.1
      resolve: 1.22.8
      sucrase: 3.35.0
    transitivePeerDependencies:
      - ts-node
    dev: false

  /tapable@2.2.1:
    resolution: {integrity: sha512-GNzQvQTOIP6RyTfE2Qxb8ZVlNmw0n88vp1szwWRimP02mnTsx3Wtn5qRdqY9w2XduFNUgvOwhNnQsjwCp+kqaQ==}
    engines: {node: '>=6'}
    dev: false

  /terser-webpack-plugin@5.3.10(@swc/core@1.3.101)(esbuild@0.19.11)(webpack@5.93.0):
    resolution: {integrity: sha512-BKFPWlPDndPs+NGGCr1U59t0XScL5317Y0UReNrHaw9/FwhPENlq6bfgs+4yPfyP51vqC1bQ4rp1EfXW5ZSH9w==}
    engines: {node: '>= 10.13.0'}
    peerDependencies:
      '@swc/core': '*'
      esbuild: '*'
      uglify-js: '*'
      webpack: ^5.1.0
    peerDependenciesMeta:
      '@swc/core':
        optional: true
      esbuild:
        optional: true
      uglify-js:
        optional: true
    dependencies:
      '@jridgewell/trace-mapping': 0.3.25
      '@swc/core': 1.3.101
      esbuild: 0.19.11
      jest-worker: 27.5.1
      schema-utils: 3.3.0
      serialize-javascript: 6.0.2
      terser: 5.31.3
      webpack: 5.93.0(@swc/core@1.3.101)(esbuild@0.19.11)
    dev: false

  /terser@5.31.3:
    resolution: {integrity: sha512-pAfYn3NIZLyZpa83ZKigvj6Rn9c/vd5KfYGX7cN1mnzqgDcxWvrU5ZtAfIKhEXz9nRecw4z3LXkjaq96/qZqAA==}
    engines: {node: '>=10'}
    hasBin: true
    dependencies:
      '@jridgewell/source-map': 0.3.6
      acorn: 8.12.1
      commander: 2.20.3
      source-map-support: 0.5.21
    dev: false

  /text-table@0.2.0:
    resolution: {integrity: sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw==}
    dev: false

  /thenify-all@1.6.0:
    resolution: {integrity: sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==}
    engines: {node: '>=0.8'}
    dependencies:
      thenify: 3.3.1
    dev: false

  /thenify@3.3.1:
    resolution: {integrity: sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==}
    dependencies:
      any-promise: 1.3.0
    dev: false

  /to-fast-properties@2.0.0:
    resolution: {integrity: sha512-/OaKK0xYrs3DmxRYqL/yDc+FxFUVYhDlXMhRmv3z915w2HF1tnN1omB354j8VUGO/hbRzyD6Y3sA7v7GS/ceog==}
    engines: {node: '>=4'}
    dev: false

  /to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}
    dependencies:
      is-number: 7.0.0
    dev: false

  /toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}
    dev: false

  /tr46@0.0.3:
    resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}
    dev: false

  /ts-algebra@2.0.0:
    resolution: {integrity: sha512-FPAhNPFMrkwz76P7cdjdmiShwMynZYN6SgOujD1urY4oNm80Ou9oMdmbR45LotcKOXoy7wSmHkRFE6Mxbrhefw==}
    dev: false

  /ts-interface-checker@0.1.13:
    resolution: {integrity: sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==}
    dev: false

  /tslib@2.6.3:
    resolution: {integrity: sha512-xNvxJEOUiWPGhUuUdQgAJPKOOJfGnIyKySOc09XkKsgdUV/3E2zvwZYdejjmRgPCgcym1juLH3226yA7sEFJKQ==}
    dev: false

  /tsx@4.16.2:
    resolution: {integrity: sha512-C1uWweJDgdtX2x600HjaFaucXTilT7tgUZHbOE4+ypskZ1OP8CRCSDkCxG6Vya9EwaFIVagWwpaVAn5wzypaqQ==}
    engines: {node: '>=18.0.0'}
    hasBin: true
    dependencies:
      esbuild: 0.21.5
      get-tsconfig: 4.7.6
    optionalDependencies:
      fsevents: 2.3.3
    dev: true

  /type-check@0.4.0:
    resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      prelude-ls: 1.2.1
    dev: false

  /type-fest@0.7.1:
    resolution: {integrity: sha512-Ne2YiiGN8bmrmJJEuTWTLJR32nh/JdL1+PSicowtNb0WFpn59GK8/lfD61bVtzguz7b3PBt74nxpv/Pw5po5Rg==}
    engines: {node: '>=8'}
    dev: false

  /type-is@1.6.18:
    resolution: {integrity: sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==}
    engines: {node: '>= 0.6'}
    dependencies:
      media-typer: 0.3.0
      mime-types: 2.1.35
    dev: false

  /typescript@4.9.5:
    resolution: {integrity: sha512-1FXk9E2Hm+QzZQ7z+McJiHL4NW1F2EzMu9Nq9i3zAaGqibafqYwCVU6WyWAuyQRRzOlxou8xZSyXLEN8oKj24g==}
    engines: {node: '>=4.2.0'}
    hasBin: true
    dev: true

  /typescript@5.1.6:
    resolution: {integrity: sha512-zaWCozRZ6DLEWAWFrVDz1H6FVXzUSfTy5FUMWsQlU8Ym5JP9eO4xkTIROFCQvhQf61z6O/G6ugw3SgAnvvm+HA==}
    engines: {node: '>=14.17'}
    hasBin: true
    dev: false

  /undici-types@6.11.1:
    resolution: {integrity: sha512-mIDEX2ek50x0OlRgxryxsenE5XaQD4on5U2inY7RApK3SOJpofyw7uW2AyfMKkhAxXIceo2DeWGVGwyvng1GNQ==}
    dev: false

  /universalify@2.0.1:
    resolution: {integrity: sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==}
    engines: {node: '>= 10.0.0'}
    dev: false

  /unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}
    dev: false

  /update-browserslist-db@1.1.0(browserslist@4.23.2):
    resolution: {integrity: sha512-EdRAaAyk2cUE1wOf2DkEhzxqOQvFOoRJFNS6NeyJ01Gp2beMRpBAINjM2iDXE3KCuKhwnvHIQCJm6ThL2Z+HzQ==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'
    dependencies:
      browserslist: 4.23.2
      escalade: 3.1.2
      picocolors: 1.0.1
    dev: false

  /uri-js@4.4.1:
    resolution: {integrity: sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==}
    dependencies:
      punycode: 2.3.1
    dev: false

  /use-callback-ref@1.3.2(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-elOQwe6Q8gqZgDA8mrh44qRTQqpIHDcZ3hXTLjBe1i4ph8XpNJnO+aQf3NaG+lriLopI4HMx9VjQLfPQ6vhnoA==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': ^16.8.0 || ^17.0.0 || ^18.0.0
      react: ^16.8.0 || ^17.0.0 || ^18.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      react: 18.3.1
      tslib: 2.6.3
    dev: false

  /use-sidecar@1.1.2(@types/react@18.2.47)(react@18.3.1):
    resolution: {integrity: sha512-epTbsLuzZ7lPClpz2TyryBfztm7m+28DlEv2ZCQ3MDr5ssiwyOwGH/e5F9CkfWjJ1t4clvI58yF822/GUkjjhw==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': ^16.9.0 || ^17.0.0 || ^18.0.0
      react: ^16.8.0 || ^17.0.0 || ^18.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.2.47
      detect-node-es: 1.1.0
      react: 18.3.1
      tslib: 2.6.3
    dev: false

  /util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}
    dev: false

  /utils-merge@1.0.1:
    resolution: {integrity: sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==}
    engines: {node: '>= 0.4.0'}
    dev: false

  /validator@13.12.0:
    resolution: {integrity: sha512-c1Q0mCiPlgdTVVVIJIrBuxNicYE+t/7oKeI9MWLj3fh/uq2Pxh/3eeWbVZ4OcGW1TUf53At0njHw5SMdA3tmMg==}
    engines: {node: '>= 0.10'}
    dev: false

  /vary@1.1.2:
    resolution: {integrity: sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==}
    engines: {node: '>= 0.8'}
    dev: false

  /watchpack@2.4.1:
    resolution: {integrity: sha512-8wrBCMtVhqcXP2Sup1ctSkga6uc2Bx0IIvKyT7yTFier5AXHooSI+QyQQAtTb7+E0IUCCKyTFmXqdqgum2XWGg==}
    engines: {node: '>=10.13.0'}
    dependencies:
      glob-to-regexp: 0.4.1
      graceful-fs: 4.2.11
    dev: false

  /wcwidth@1.0.1:
    resolution: {integrity: sha512-XHPEwS0q6TaxcvG85+8EYkbiCux2XtWG2mkc47Ng2A77BQu9+DqIOJldST4HgPkuea7dvKSj5VgX3P1d4rW8Tg==}
    dependencies:
      defaults: 1.0.4
    dev: false

  /web-streams-polyfill@3.3.3:
    resolution: {integrity: sha512-d2JWLCivmZYTSIoge9MsgFCZrt571BikcWGYkjC1khllbTeDlGqZ2D8vD8E/lJa8WGWbb7Plm8/XJYV7IJHZZw==}
    engines: {node: '>= 8'}
    dev: false

  /webidl-conversions@3.0.1:
    resolution: {integrity: sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==}
    dev: false

  /webpack-sources@3.2.3:
    resolution: {integrity: sha512-/DyMEOrDgLKKIG0fmvtz+4dUX/3Ghozwgm6iPp8KRhvn+eQf9+Q7GWxVNMk3+uCPWfdXYC4ExGBckIXdFEfH1w==}
    engines: {node: '>=10.13.0'}
    dev: false

  /webpack@5.93.0(@swc/core@1.3.101)(esbuild@0.19.11):
    resolution: {integrity: sha512-Y0m5oEY1LRuwly578VqluorkXbvXKh7U3rLoQCEO04M97ScRr44afGVkI0FQFsXzysk5OgFAxjZAb9rsGQVihA==}
    engines: {node: '>=10.13.0'}
    hasBin: true
    peerDependencies:
      webpack-cli: '*'
    peerDependenciesMeta:
      webpack-cli:
        optional: true
    dependencies:
      '@types/eslint-scope': 3.7.7
      '@types/estree': 1.0.5
      '@webassemblyjs/ast': 1.12.1
      '@webassemblyjs/wasm-edit': 1.12.1
      '@webassemblyjs/wasm-parser': 1.12.1
      acorn: 8.12.1
      acorn-import-attributes: 1.9.5(acorn@8.12.1)
      browserslist: 4.23.2
      chrome-trace-event: 1.0.4
      enhanced-resolve: 5.17.1
      es-module-lexer: 1.5.4
      eslint-scope: 5.1.1
      events: 3.3.0
      glob-to-regexp: 0.4.1
      graceful-fs: 4.2.11
      json-parse-even-better-errors: 2.3.1
      loader-runner: 4.3.0
      mime-types: 2.1.35
      neo-async: 2.6.2
      schema-utils: 3.3.0
      tapable: 2.2.1
      terser-webpack-plugin: 5.3.10(@swc/core@1.3.101)(esbuild@0.19.11)(webpack@5.93.0)
      watchpack: 2.4.1
      webpack-sources: 3.2.3
    transitivePeerDependencies:
      - '@swc/core'
      - esbuild
      - uglify-js
    dev: false

  /whatwg-url@5.0.0:
    resolution: {integrity: sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==}
    dependencies:
      tr46: 0.0.3
      webidl-conversions: 3.0.1
    dev: false

  /which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true
    dependencies:
      isexe: 2.0.0
    dev: false

  /word-wrap@1.2.5:
    resolution: {integrity: sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==}
    engines: {node: '>=0.10.0'}
    dev: false

  /wrap-ansi@7.0.0:
    resolution: {integrity: sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==}
    engines: {node: '>=10'}
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1
    dev: false

  /wrap-ansi@8.1.0:
    resolution: {integrity: sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==}
    engines: {node: '>=12'}
    dependencies:
      ansi-styles: 6.2.1
      string-width: 5.1.2
      strip-ansi: 7.1.0
    dev: false

  /ws@8.17.1:
    resolution: {integrity: sha512-6XQFvXTkbfUOZOKKILFG1PDK2NDQs4azKQl26T0YS5CxqWLgXajbPZ+h4gZekJyRqFU8pvnbAbbs/3TgRPy+GQ==}
    engines: {node: '>=10.0.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: '>=5.0.2'
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true
    dev: false

  /ws@8.18.0:
    resolution: {integrity: sha512-8VbfWfHLbbwu3+N6OKsOMpBdT4kXPDDB9cJk2bJ6mh9ucxdlnNvH1e+roYkKmN9Nxw2yjz7VzeO9oOz2zJ04Pw==}
    engines: {node: '>=10.0.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: '>=5.0.2'
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true
    dev: false

  /xmlhttprequest-ssl@2.0.0:
    resolution: {integrity: sha512-QKxVRxiRACQcVuQEYFsI1hhkrMlrXHPegbbd1yn9UHOmRxY+si12nQYzri3vbzt8VdTTRviqcKxcyllFas5z2A==}
    engines: {node: '>=0.4.0'}
    dev: false

  /yallist@3.1.1:
    resolution: {integrity: sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==}
    dev: false

  /yaml@2.5.0:
    resolution: {integrity: sha512-2wWLbGbYDiSqqIKoPjar3MPgB94ErzCtrNE1FdqGuaO0pi2JGjmE8aW8TDZwzU7vuxcGRdL/4gPQwQ7hD5AMSw==}
    engines: {node: '>= 14'}
    hasBin: true
    dev: false

  /yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}
    dev: false

  /zod-to-json-schema@3.23.2(zod@3.23.8):
    resolution: {integrity: sha512-uSt90Gzc/tUfyNqxnjlfBs8W6WSGpNBv0rVsNxP/BVSMHMKGdthPYff4xtCHYloJGM0CFxFsb3NbC0eqPhfImw==}
    peerDependencies:
      zod: ^3.23.3
    dependencies:
      zod: 3.23.8
    dev: false

  /zod@3.22.3:
    resolution: {integrity: sha512-EjIevzuJRiRPbVH4mGc8nApb/lVLKVpmUhAaR5R5doKGfAnGJ6Gr3CViAVjP+4FWSxCsybeWQdcgCtbX+7oZug==}
    dev: false

  /zod@3.23.8:
    resolution: {integrity: sha512-XBx9AXhXktjUqnepgTiE5flcKIYWi/rme0Eaj+5Y0lftuGBq+jyRu/md4WnuxqgP1ubdpNCsYEYPxrzVHD8d6g==}
    dev: false
`,
      },
    },
  };
};
