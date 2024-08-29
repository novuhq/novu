/* eslint-disable max-len */

export const PNPM_LOCK_YAML = `lockfileVersion: '6.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

dependencies:
  '@novu/framework':
    specifier: 2.0.0
    version: 2.0.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(express@4.19.2)(reflect-metadata@0.2.2)(zod-to-json-schema@3.23.2)(zod@3.23.8)
  '@novu/ntfr-client':
    specifier: ^0.0.4
    version: 0.0.4
  '@react-email/components':
    specifier: ^0.0.22
    version: 0.0.22(@types/react@18.3.4)(react-dom@18.3.1)(react@18.3.1)
  express:
    specifier: ^4.19.2
    version: 4.19.2
  react:
    specifier: ^18.2.0
    version: 18.3.1
  react-dom:
    specifier: ^18.2.0
    version: 18.3.1(react@18.3.1)
  tsx:
    specifier: ^4.3.0
    version: 4.19.0
  typescript:
    specifier: ^5.3.2
    version: 5.5.4
  vite-express:
    specifier: '*'
    version: 0.18.0
  ws:
    specifier: ^8.11.0
    version: 8.18.0
  zod:
    specifier: ^3.23.8
    version: 3.23.8
  zod-to-json-schema:
    specifier: ^3.23.2
    version: 3.23.2(zod@3.23.8)

devDependencies:
  '@types/express':
    specifier: ^4.17.21
    version: 4.17.21
  '@types/node':
    specifier: ^20.9.3
    version: 20.16.2
  '@types/react':
    specifier: ^18.0.38
    version: 18.3.4
  '@types/react-dom':
    specifier: ^18.2.16
    version: 18.3.0
  nodemon:
    specifier: ^3.0.1
    version: 3.1.4
  vite:
    specifier: ^5.0.2
    version: 5.4.2(@types/node@20.16.2)

packages:

  /@babel/code-frame@7.24.7:
    resolution: {integrity: sha512-BcYH1CVJBO9tvyIZ2jVeXgSIMvGZ2FDRvDdOIVQyuklNKSsx+eppDEBq/g47Ayw+RqNFE+URvOShmf+f/qwAlA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/highlight': 7.24.7
      picocolors: 1.0.1
    dev: false

  /@babel/helper-validator-identifier@7.24.7:
    resolution: {integrity: sha512-rR+PBcQ1SMQDDyF6X0wxtG8QyLCgUB0eRAGguqRLfkCA87l7yAP7ehq8SNj96OOGTO8OBV70KhuFYcIkHXOg0w==}
    engines: {node: '>=6.9.0'}
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

  /@babel/runtime@7.25.4:
    resolution: {integrity: sha512-DSgLeL/FNcpXuzav5wfYvHCGvynXkJbn3Zvc3823AEe9nPwW9IK4UoCSS5yGymmQzN0pCPvivtgS6/8U2kkm1w==}
    engines: {node: '>=6.9.0'}
    dependencies:
      regenerator-runtime: 0.14.1
    dev: false

  /@esbuild/aix-ppc64@0.21.5:
    resolution: {integrity: sha512-1SDgH6ZSPTlggy1yI6+Dbkiz8xzpHJEVAlF/AM1tHPLsf5STom9rwtjE4hKAF20FfXXNTFqEYXyJNWh1GiZedQ==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [aix]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/aix-ppc64@0.23.1:
    resolution: {integrity: sha512-6VhYk1diRqrhBAqpJEdjASR/+WVRtfjpqKuNw11cLiaWpAT/Uu+nokB+UJnevzy/P9C/ty6AOe0dwueMrGh/iQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]
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

  /@esbuild/android-arm64@0.23.1:
    resolution: {integrity: sha512-xw50ipykXcLstLeWH7WRdQuysJqejuAGPd30vd1i5zSyKK3WE+ijzHmLKxdiCMtH1pHz78rOg0BKSYOSB/2Khw==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/android-arm@0.23.1:
    resolution: {integrity: sha512-uz6/tEy2IFm9RYOyvKl88zdzZfwEfKZmnX9Cj1BHjeSGNuGLuMD1kR8y5bteYmwqKm1tj8m4cb/aKEorr6fHWQ==}
    engines: {node: '>=18'}
    cpu: [arm]
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

  /@esbuild/android-x64@0.23.1:
    resolution: {integrity: sha512-nlN9B69St9BwUoB+jkyU090bru8L0NA3yFvAd7k8dNsVH8bi9a8cUAUSEcEEgTp2z3dbEDGJGfP6VUnkQnlReg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]
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

  /@esbuild/darwin-arm64@0.23.1:
    resolution: {integrity: sha512-YsS2e3Wtgnw7Wq53XXBLcV6JhRsEq8hkfg91ESVadIrzr9wO6jJDMZnCQbHm1Guc5t/CdDiFSSfWP58FNuvT3Q==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/darwin-x64@0.23.1:
    resolution: {integrity: sha512-aClqdgTDVPSEGgoCS8QDG37Gu8yc9lTHNAQlsztQ6ENetKEO//b8y31MMu2ZaPbn4kVsIABzVLXYLhCGekGDqw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]
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

  /@esbuild/freebsd-arm64@0.23.1:
    resolution: {integrity: sha512-h1k6yS8/pN/NHlMl5+v4XPfikhJulk4G+tKGFIOwURBSFzE8bixw1ebjluLOjfwtLqY0kewfjLSrO6tN2MgIhA==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/freebsd-x64@0.23.1:
    resolution: {integrity: sha512-lK1eJeyk1ZX8UklqFd/3A60UuZ/6UVfGT2LuGo3Wp4/z7eRTRYY+0xOu2kpClP+vMTi9wKOfXi2vjUpO1Ro76g==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]
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

  /@esbuild/linux-arm64@0.23.1:
    resolution: {integrity: sha512-/93bf2yxencYDnItMYV/v116zff6UyTjo4EtEQjUBeGiVpMmffDNUyD9UN2zV+V3LRV3/on4xdZ26NKzn6754g==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/linux-arm@0.23.1:
    resolution: {integrity: sha512-CXXkzgn+dXAPs3WBwE+Kvnrf4WECwBdfjfeYHpMeVxWE0EceB6vhWGShs6wi0IYEqMSIzdOF1XjQ/Mkm5d7ZdQ==}
    engines: {node: '>=18'}
    cpu: [arm]
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

  /@esbuild/linux-ia32@0.23.1:
    resolution: {integrity: sha512-VTN4EuOHwXEkXzX5nTvVY4s7E/Krz7COC8xkftbbKRYAl96vPiUssGkeMELQMOnLOJ8k3BY1+ZY52tttZnHcXQ==}
    engines: {node: '>=18'}
    cpu: [ia32]
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

  /@esbuild/linux-loong64@0.23.1:
    resolution: {integrity: sha512-Vx09LzEoBa5zDnieH8LSMRToj7ir/Jeq0Gu6qJ/1GcBq9GkfoEAoXvLiW1U9J1qE/Y/Oyaq33w5p2ZWrNNHNEw==}
    engines: {node: '>=18'}
    cpu: [loong64]
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

  /@esbuild/linux-mips64el@0.23.1:
    resolution: {integrity: sha512-nrFzzMQ7W4WRLNUOU5dlWAqa6yVeI0P78WKGUo7lg2HShq/yx+UYkeNSE0SSfSure0SqgnsxPvmAUu/vu0E+3Q==}
    engines: {node: '>=18'}
    cpu: [mips64el]
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

  /@esbuild/linux-ppc64@0.23.1:
    resolution: {integrity: sha512-dKN8fgVqd0vUIjxuJI6P/9SSSe/mB9rvA98CSH2sJnlZ/OCZWO1DJvxj8jvKTfYUdGfcq2dDxoKaC6bHuTlgcw==}
    engines: {node: '>=18'}
    cpu: [ppc64]
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

  /@esbuild/linux-riscv64@0.23.1:
    resolution: {integrity: sha512-5AV4Pzp80fhHL83JM6LoA6pTQVWgB1HovMBsLQ9OZWLDqVY8MVobBXNSmAJi//Csh6tcY7e7Lny2Hg1tElMjIA==}
    engines: {node: '>=18'}
    cpu: [riscv64]
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

  /@esbuild/linux-s390x@0.23.1:
    resolution: {integrity: sha512-9ygs73tuFCe6f6m/Tb+9LtYxWR4c9yg7zjt2cYkjDbDpV/xVn+68cQxMXCjUpYwEkze2RcU/rMnfIXNRFmSoDw==}
    engines: {node: '>=18'}
    cpu: [s390x]
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

  /@esbuild/linux-x64@0.23.1:
    resolution: {integrity: sha512-EV6+ovTsEXCPAp58g2dD68LxoP/wK5pRvgy0J/HxPGB009omFPv3Yet0HiaqvrIrgPTBuC6wCH1LTOY91EO5hQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]
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

  /@esbuild/netbsd-x64@0.23.1:
    resolution: {integrity: sha512-aevEkCNu7KlPRpYLjwmdcuNz6bDFiE7Z8XC4CPqExjTvrHugh28QzUXVOZtiYghciKUacNktqxdpymplil1beA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]
    requiresBuild: true
    dev: false
    optional: true

  /@esbuild/openbsd-arm64@0.23.1:
    resolution: {integrity: sha512-3x37szhLexNA4bXhLrCC/LImN/YtWis6WXr1VESlfVtVeoFJBRINPJ3f0a/6LV8zpikqoUg4hyXw0sFBt5Cr+Q==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/openbsd-x64@0.23.1:
    resolution: {integrity: sha512-aY2gMmKmPhxfU+0EdnN+XNtGbjfQgwZj43k8G3fyrDM/UdZww6xrWxmDkuz2eCZchqVeABjV5BpildOrUbBTqA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]
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

  /@esbuild/sunos-x64@0.23.1:
    resolution: {integrity: sha512-RBRT2gqEl0IKQABT4XTj78tpk9v7ehp+mazn2HbUeZl1YMdaGAQqhapjGTCe7uw7y0frDi4gS0uHzhvpFuI1sA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]
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

  /@esbuild/win32-arm64@0.23.1:
    resolution: {integrity: sha512-4O+gPR5rEBe2FpKOVyiJ7wNDPA8nGzDuJ6gN4okSA1gEOYZ67N8JPk58tkWtdtPeLz7lBnY6I5L3jdsr3S+A6A==}
    engines: {node: '>=18'}
    cpu: [arm64]
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

  /@esbuild/win32-ia32@0.23.1:
    resolution: {integrity: sha512-BcaL0Vn6QwCwre3Y717nVHZbAa4UBEigzFm6VdsVdT/MbZ38xoj1X9HPkZhbmaBGUD1W8vxAfffbDe8bA6AKnQ==}
    engines: {node: '>=18'}
    cpu: [ia32]
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

  /@esbuild/win32-x64@0.23.1:
    resolution: {integrity: sha512-BHpFFeslkWrXWyUPnbKm+xYYVYruCinGcftSBaa8zoF9hZO4BcSCFUvHVTtzpIY6YzUnYtuEhZ+C9iEXjxnasg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: false
    optional: true

  /@humanwhocodes/momoa@2.0.4:
    resolution: {integrity: sha512-RE815I4arJFtt+FVeU1Tgp9/Xvecacji8w/V6XtXsWWH/wz/eNkNbhb+ny/+PlVZjV0rxQpRSQKNKE3lcktHEA==}
    engines: {node: '>=10.10.0'}
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

  /@lukeed/csprng@1.1.0:
    resolution: {integrity: sha512-Z7C/xXCiGWsg0KuKsHTKJxbWhpI3Vs5GwLfOean7MGyVFGqdRgBbAjOCh6u4bbjPc/8MJ2pZmK/0DLdCbivLDA==}
    engines: {node: '>=8'}
    dev: false

  /@microsoft/tsdoc@0.15.0:
    resolution: {integrity: sha512-HZpPoABogPvjeJOdzCOSJsXeL/SMCBgBZMVC3X3d7YYp2gf31MfxhUoYUNwf1ERPJOnQc0wkFn9trqI6ZEdZuA==}
    dev: false

  /@nestjs/common@10.4.1(reflect-metadata@0.2.2)(rxjs@7.8.1):
    resolution: {integrity: sha512-4CkrDx0s4XuWqFjX8WvOFV7Y6RGJd0P2OBblkhZS7nwoctoSuW5pyEa8SWak6YHNGrHRpFb6ymm5Ai4LncwRVA==}
    peerDependencies:
      class-transformer: '*'
      class-validator: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      class-transformer:
        optional: true
      class-validator:
        optional: true
    dependencies:
      iterare: 1.2.1
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.6.3
      uid: 2.0.2
    dev: false

  /@nestjs/core@10.4.1(@nestjs/common@10.4.1)(reflect-metadata@0.2.2)(rxjs@7.8.1):
    resolution: {integrity: sha512-9I1WdfOBCCHdUm+ClBJupOuZQS6UxzIWHIq6Vp1brAA5ZKl/Wq6BVwSsbnUJGBy3J3PM2XHmR0EQ4fwX3nR7lA==}
    requiresBuild: true
    peerDependencies:
      '@nestjs/common': ^10.0.0
      '@nestjs/microservices': ^10.0.0
      '@nestjs/platform-express': ^10.0.0
      '@nestjs/websockets': ^10.0.0
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@nestjs/microservices':
        optional: true
      '@nestjs/platform-express':
        optional: true
      '@nestjs/websockets':
        optional: true
    dependencies:
      '@nestjs/common': 10.4.1(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nuxtjs/opencollective': 0.3.2
      fast-safe-stringify: 2.1.1
      iterare: 1.2.1
      path-to-regexp: 3.2.0
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.6.3
      uid: 2.0.2
    transitivePeerDependencies:
      - encoding
    dev: false

  /@nestjs/mapped-types@2.0.5(@nestjs/common@10.4.1)(class-transformer@0.5.1)(class-validator@0.14.0)(reflect-metadata@0.2.2):
    resolution: {integrity: sha512-bSJv4pd6EY99NX9CjBIyn4TVDoSit82DUZlL4I3bqNfy5Gt+gXTa86i3I/i0iIV9P4hntcGM5GyO+FhZAhxtyg==}
    peerDependencies:
      '@nestjs/common': ^8.0.0 || ^9.0.0 || ^10.0.0
      class-transformer: ^0.4.0 || ^0.5.0
      class-validator: ^0.13.0 || ^0.14.0
      reflect-metadata: ^0.1.12 || ^0.2.0
    peerDependenciesMeta:
      class-transformer:
        optional: true
      class-validator:
        optional: true
    dependencies:
      '@nestjs/common': 10.4.1(reflect-metadata@0.2.2)(rxjs@7.8.1)
      class-transformer: 0.5.1
      class-validator: 0.14.0
      reflect-metadata: 0.2.2
    dev: false

  /@nestjs/swagger@7.4.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(class-transformer@0.5.1)(class-validator@0.14.0)(reflect-metadata@0.2.2):
    resolution: {integrity: sha512-dCiwKkRxcR7dZs5jtrGspBAe/nqJd1AYzOBTzw9iCdbq3BGrLpwokelk6lFZPe4twpTsPQqzNKBwKzVbI6AR/g==}
    peerDependencies:
      '@fastify/static': ^6.0.0 || ^7.0.0
      '@nestjs/common': ^9.0.0 || ^10.0.0
      '@nestjs/core': ^9.0.0 || ^10.0.0
      class-transformer: '*'
      class-validator: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
    peerDependenciesMeta:
      '@fastify/static':
        optional: true
      class-transformer:
        optional: true
      class-validator:
        optional: true
    dependencies:
      '@microsoft/tsdoc': 0.15.0
      '@nestjs/common': 10.4.1(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 10.4.1(@nestjs/common@10.4.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/mapped-types': 2.0.5(@nestjs/common@10.4.1)(class-transformer@0.5.1)(class-validator@0.14.0)(reflect-metadata@0.2.2)
      class-transformer: 0.5.1
      class-validator: 0.14.0
      js-yaml: 4.1.0
      lodash: 4.17.21
      path-to-regexp: 3.2.0
      reflect-metadata: 0.2.2
      swagger-ui-dist: 5.17.14
    dev: false

  /@novu/framework@2.0.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(express@4.19.2)(reflect-metadata@0.2.2)(zod-to-json-schema@3.23.2)(zod@3.23.8):
    resolution: {integrity: sha512-UhR5kBIweiYIAQMJCSZ1o1dKCrLHe5OrnXHolIAQJaii4KskIsC+W8RXPzMzZOMaYJOjR9qH4GjOjohiioKx/g==}
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
      '@novu/shared': 2.0.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(reflect-metadata@0.2.2)
      ajv: 8.17.1
      ajv-formats: 2.1.1(ajv@8.17.1)
      better-ajv-errors: 1.2.0(ajv@8.17.1)
      chalk: 4.1.2
      cross-fetch: 4.0.0
      express: 4.19.2
      json-schema-faker: 0.5.6
      json-schema-to-ts: 3.1.0
      liquidjs: 10.16.6
      ora: 5.4.1
      sanitize-html: 2.13.0
      zod: 3.23.8
      zod-to-json-schema: 3.23.2(zod@3.23.8)
    transitivePeerDependencies:
      - '@fastify/static'
      - '@nestjs/common'
      - '@nestjs/core'
      - encoding
      - reflect-metadata
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

  /@novu/shared@2.0.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(reflect-metadata@0.2.2):
    resolution: {integrity: sha512-uWKDlLSRS6z7COKTBy6FiowNU7ESroz6Cx88M7YjgfkfPYSKUKPj10X+dwbzM2ZnPzocr3qySL75LOPqiJZGBA==}
    dependencies:
      '@nestjs/swagger': 7.4.0(@nestjs/common@10.4.1)(@nestjs/core@10.4.1)(class-transformer@0.5.1)(class-validator@0.14.0)(reflect-metadata@0.2.2)
      class-transformer: 0.5.1
      class-validator: 0.14.0
    transitivePeerDependencies:
      - '@fastify/static'
      - '@nestjs/common'
      - '@nestjs/core'
      - reflect-metadata
    dev: false

  /@nuxtjs/opencollective@0.3.2:
    resolution: {integrity: sha512-um0xL3fO7Mf4fDxcqx9KryrB7zgRM5JSlvGN5AGkP6JLM5XEKyjeAiPbNxdXVXQ16isuAhYpvP88NgL2BGd6aA==}
    engines: {node: '>=8.0.0', npm: '>=5.0.0'}
    hasBin: true
    dependencies:
      chalk: 4.1.2
      consola: 2.15.3
      node-fetch: 2.7.0
    transitivePeerDependencies:
      - encoding
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

  /@radix-ui/react-compose-refs@1.1.0(@types/react@18.3.4)(react@18.3.1):
    resolution: {integrity: sha512-b4inOtiaOnYf9KWyO3jAeeCG6FeyfY6ldiEPanbUjWd+xIk5wZeHa8yVwmrJ2vderhu/BQvzCrJI0lHd+wIiqw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@types/react': 18.3.4
      react: 18.3.1
    dev: false

  /@radix-ui/react-slot@1.1.0(@types/react@18.3.4)(react@18.3.1):
    resolution: {integrity: sha512-FUCf5XMfmW4dtYl69pdS4DbxKy8nj4M7SafBgPllysxmdachynNflAdp/gCsnYWNDnge6tI9onzMp5ARYc1KNw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.0(@types/react@18.3.4)(react@18.3.1)
      '@types/react': 18.3.4
      react: 18.3.1
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

  /@react-email/components@0.0.22(@types/react@18.3.4)(react-dom@18.3.1)(react@18.3.1):
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
      '@react-email/heading': 0.0.13(@types/react@18.3.4)(react@18.3.1)
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

  /@react-email/heading@0.0.13(@types/react@18.3.4)(react@18.3.1):
    resolution: {integrity: sha512-MYDzjJwljKHBLueLuyqkaHxu6N4aGOL1ms2NNyJ9WXC9mmBnLs4Y/QEf9SjE4Df3AW4iT9uyfVHuaNUb7uq5QA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^18.2.0
    dependencies:
      '@radix-ui/react-slot': 1.1.0(@types/react@18.3.4)(react@18.3.1)
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

  /@rollup/rollup-android-arm-eabi@4.21.1:
    resolution: {integrity: sha512-2thheikVEuU7ZxFXubPDOtspKn1x0yqaYQwvALVtEcvFhMifPADBrgRPyHV0TF3b+9BgvgjgagVyvA/UqPZHmg==}
    cpu: [arm]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-android-arm64@4.21.1:
    resolution: {integrity: sha512-t1lLYn4V9WgnIFHXy1d2Di/7gyzBWS8G5pQSXdZqfrdCGTwi1VasRMSS81DTYb+avDs/Zz4A6dzERki5oRYz1g==}
    cpu: [arm64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-darwin-arm64@4.21.1:
    resolution: {integrity: sha512-AH/wNWSEEHvs6t4iJ3RANxW5ZCK3fUnmf0gyMxWCesY1AlUj8jY7GC+rQE4wd3gwmZ9XDOpL0kcFnCjtN7FXlA==}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-darwin-x64@4.21.1:
    resolution: {integrity: sha512-dO0BIz/+5ZdkLZrVgQrDdW7m2RkrLwYTh2YMFG9IpBtlC1x1NPNSXkfczhZieOlOLEqgXOFH3wYHB7PmBtf+Bg==}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm-gnueabihf@4.21.1:
    resolution: {integrity: sha512-sWWgdQ1fq+XKrlda8PsMCfut8caFwZBmhYeoehJ05FdI0YZXk6ZyUjWLrIgbR/VgiGycrFKMMgp7eJ69HOF2pQ==}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm-musleabihf@4.21.1:
    resolution: {integrity: sha512-9OIiSuj5EsYQlmwhmFRA0LRO0dRRjdCVZA3hnmZe1rEwRk11Jy3ECGGq3a7RrVEZ0/pCsYWx8jG3IvcrJ6RCew==}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm64-gnu@4.21.1:
    resolution: {integrity: sha512-0kuAkRK4MeIUbzQYu63NrJmfoUVicajoRAL1bpwdYIYRcs57iyIV9NLcuyDyDXE2GiZCL4uhKSYAnyWpjZkWow==}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm64-musl@4.21.1:
    resolution: {integrity: sha512-/6dYC9fZtfEY0vozpc5bx1RP4VrtEOhNQGb0HwvYNwXD1BBbwQ5cKIbUVVU7G2d5WRE90NfB922elN8ASXAJEA==}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-powerpc64le-gnu@4.21.1:
    resolution: {integrity: sha512-ltUWy+sHeAh3YZ91NUsV4Xg3uBXAlscQe8ZOXRCVAKLsivGuJsrkawYPUEyCV3DYa9urgJugMLn8Z3Z/6CeyRQ==}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-riscv64-gnu@4.21.1:
    resolution: {integrity: sha512-BggMndzI7Tlv4/abrgLwa/dxNEMn2gC61DCLrTzw8LkpSKel4o+O+gtjbnkevZ18SKkeN3ihRGPuBxjaetWzWg==}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-s390x-gnu@4.21.1:
    resolution: {integrity: sha512-z/9rtlGd/OMv+gb1mNSjElasMf9yXusAxnRDrBaYB+eS1shFm6/4/xDH1SAISO5729fFKUkJ88TkGPRUh8WSAA==}
    cpu: [s390x]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-x64-gnu@4.21.1:
    resolution: {integrity: sha512-kXQVcWqDcDKw0S2E0TmhlTLlUgAmMVqPrJZR+KpH/1ZaZhLSl23GZpQVmawBQGVhyP5WXIsIQ/zqbDBBYmxm5w==}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-x64-musl@4.21.1:
    resolution: {integrity: sha512-CbFv/WMQsSdl+bpX6rVbzR4kAjSSBuDgCqb1l4J68UYsQNalz5wOqLGYj4ZI0thGpyX5kc+LLZ9CL+kpqDovZA==}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-arm64-msvc@4.21.1:
    resolution: {integrity: sha512-3Q3brDgA86gHXWHklrwdREKIrIbxC0ZgU8lwpj0eEKGBQH+31uPqr0P2v11pn0tSIxHvcdOWxa4j+YvLNx1i6g==}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-ia32-msvc@4.21.1:
    resolution: {integrity: sha512-tNg+jJcKR3Uwe4L0/wY3Ro0H+u3nrb04+tcq1GSYzBEmKLeOQF2emk1whxlzNqb6MMrQ2JOcQEpuuiPLyRcSIw==}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-x64-msvc@4.21.1:
    resolution: {integrity: sha512-xGiIH95H1zU7naUyTKEyOA/I0aexNMUdO9qRv0bLKN3qu25bBdrxZHqA3PTJ24YNN/GdMzG4xkDcd/GvjuhfLg==}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@selderee/plugin-htmlparser2@0.11.0:
    resolution: {integrity: sha512-P33hHGdldxGabLFjPPpaTxVolMrzrcegejx+0GxjrIb9Zv48D8yAIA/QTDR2dFl7Uz7urX8aX6+5bCZslr+gWQ==}
    dependencies:
      domhandler: 5.0.3
      selderee: 0.11.0
    dev: false

  /@tootallnate/quickjs-emscripten@0.23.0:
    resolution: {integrity: sha512-C5Mc6rdnsaJDjO3UpGW/CQTHtCKaYlScZTly4JIu97Jxo/odCiH0ITnDXSJPTOrEKk/ycSZ0AOgTmkDtkOsvIA==}
    dev: false

  /@types/body-parser@1.19.5:
    resolution: {integrity: sha512-fB3Zu92ucau0iQ0JMCFQE7b/dv8Ot07NI3KaZIkIUNXq82k4eBAqUaneXfleGY9JWskeS9y+u0nXMyspcuQrCg==}
    dependencies:
      '@types/connect': 3.4.38
      '@types/node': 20.16.2
    dev: true

  /@types/connect@3.4.38:
    resolution: {integrity: sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==}
    dependencies:
      '@types/node': 20.16.2
    dev: true

  /@types/estree@1.0.5:
    resolution: {integrity: sha512-/kYRxGDLWzHOB7q+wtSUQlFrtcdUccpfy+X+9iMBpHK8QLLhx2wIPYuS5DYtR9Wa/YlZAbIovy7qVdB1Aq6Lyw==}
    dev: true

  /@types/express-serve-static-core@4.19.5:
    resolution: {integrity: sha512-y6W03tvrACO72aijJ5uF02FRq5cgDR9lUxddQ8vyF+GvmjJQqbzDcJngEjURc+ZsG31VI3hODNZJ2URj86pzmg==}
    dependencies:
      '@types/node': 20.16.2
      '@types/qs': 6.9.15
      '@types/range-parser': 1.2.7
      '@types/send': 0.17.4
    dev: true

  /@types/express@4.17.21:
    resolution: {integrity: sha512-ejlPM315qwLpaQlQDTjPdsUFSc6ZsP4AN6AlWnogPjQ7CVi7PYF3YVz+CY3jE2pwYf7E/7HlDAN0rV2GxTG0HQ==}
    dependencies:
      '@types/body-parser': 1.19.5
      '@types/express-serve-static-core': 4.19.5
      '@types/qs': 6.9.15
      '@types/serve-static': 1.15.7
    dev: true

  /@types/http-errors@2.0.4:
    resolution: {integrity: sha512-D0CFMMtydbJAegzOyHjtiKPLlvnm3iTZyZRSZoLq2mRhDdmLfIWOCYPfQJ4cu2erKghU++QvjcUjp/5h7hESpA==}
    dev: true

  /@types/mime@1.3.5:
    resolution: {integrity: sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==}
    dev: true

  /@types/node@20.16.2:
    resolution: {integrity: sha512-91s/n4qUPV/wg8eE9KHYW1kouTfDk2FPGjXbBMfRWP/2vg1rCXNQL1OCabwGs0XSdukuK+MwCDXE30QpSeMUhQ==}
    dependencies:
      undici-types: 6.19.8
    dev: true

  /@types/prop-types@15.7.12:
    resolution: {integrity: sha512-5zvhXYtRNRluoE/jAp4GVsSduVUzNWKkOZrCDBWYtE7biZywwdC2AcEzg+cSMLFRfVgeAFqpfNabiPjxFddV1Q==}

  /@types/qs@6.9.15:
    resolution: {integrity: sha512-uXHQKES6DQKKCLh441Xv/dwxOq1TVS3JPUMlEqoEglvlhR6Mxnlew/Xq/LRVHpLyk7iK3zODe1qYHIMltO7XGg==}
    dev: true

  /@types/range-parser@1.2.7:
    resolution: {integrity: sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==}
    dev: true

  /@types/react-dom@18.3.0:
    resolution: {integrity: sha512-EhwApuTmMBmXuFOikhQLIBUn6uFg81SwLMOAUgodJF14SOBOCMdU04gDoYi0WOJJHD144TL32z4yDqCW3dnkQg==}
    dependencies:
      '@types/react': 18.3.4
    dev: true

  /@types/react@18.3.4:
    resolution: {integrity: sha512-J7W30FTdfCxDDjmfRM+/JqLHBIyl7xUIp9kwK637FGmY7+mkSFSe6L4jpZzhj5QMfLssSDP4/i75AKkrdC7/Jw==}
    dependencies:
      '@types/prop-types': 15.7.12
      csstype: 3.1.3

  /@types/send@0.17.4:
    resolution: {integrity: sha512-x2EM6TJOybec7c52BX0ZspPodMsQUd5L6PRwOunVyVUhXiBSKf3AezDL8Dgvgt5o0UfKNfuA0eMLr2wLT4AiBA==}
    dependencies:
      '@types/mime': 1.3.5
      '@types/node': 20.16.2
    dev: true

  /@types/serve-static@1.15.7:
    resolution: {integrity: sha512-W8Ym+h8nhuRwaKPaDw34QUkwsGi6Rc4yYqvKFo5rm2FUEhCFbzVWrxXUxuKK8TASjWsysJY0nsmNCGhCOIsrOw==}
    dependencies:
      '@types/http-errors': 2.0.4
      '@types/node': 20.16.2
      '@types/send': 0.17.4
    dev: true

  /@types/validator@13.12.1:
    resolution: {integrity: sha512-w0URwf7BQb0rD/EuiG12KP0bailHKHP5YVviJG9zw3ykAokL0TuxU2TUqMB7EwZ59bDHYdeTIvjI5m0S7qHfOA==}
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

  /agent-base@7.1.1:
    resolution: {integrity: sha512-H0TSyFNDMomMNJQBn8wFV5YC/2eJ+VXECwOadZJT554xP6cODZHPX3H9QMQECxvrgiSOP1pHjy1sMWQVYJOUOA==}
    engines: {node: '>= 14'}
    dependencies:
      debug: 4.3.6(supports-color@5.5.0)
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

  /anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.1
    dev: true

  /argparse@1.0.10:
    resolution: {integrity: sha512-o5Roy6tNG4SL/FOkCAN6RzjiakZS25RLYFrcMttJqbdd8BWrnA+fGz57iN5Pb06pvBGvl5gQ0B48dJlslXvoTg==}
    dependencies:
      sprintf-js: 1.0.3
    dev: false

  /argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}
    dev: false

  /array-flatten@1.1.1:
    resolution: {integrity: sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==}
    dev: false

  /ast-types@0.13.4:
    resolution: {integrity: sha512-x1FCFnFifvYDDzTaLII71vG5uvDwgtmDTEVWAxrgeiR8VjMONcCXJx7E+USjDtHlwFmt9MysbqgF9b9Vjr6w+w==}
    engines: {node: '>=4'}
    dependencies:
      tslib: 2.7.0
    dev: false

  /balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

  /base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}
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
    dev: true

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
    dev: true

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
    dev: true

  /buffer@5.7.1:
    resolution: {integrity: sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==}
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1
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

  /chokidar@3.6.0:
    resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
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
    dev: true

  /class-transformer@0.5.1:
    resolution: {integrity: sha512-SQa1Ws6hUbfC98vKGxZH3KFY0Y1lm5Zm0SY8XX9zbK7FJCyVEac3ATW0RIpwzW+oOfmHE5PMPufDG9hCfoEOMw==}
    dev: false

  /class-validator@0.14.0:
    resolution: {integrity: sha512-ct3ltplN8I9fOwUd8GrP8UQixwff129BkEtuWDKL5W45cQuLd19xqmTLu5ge78YDm/fdje6FMt0hGOhl0lii3A==}
    dependencies:
      '@types/validator': 13.12.1
      libphonenumber-js: 1.11.7
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

  /clone@1.0.4:
    resolution: {integrity: sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==}
    engines: {node: '>=0.8'}
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

  /concat-map@0.0.1:
    resolution: {integrity: sha1-2Klr13/Wjfd5OnMDajug1UBdR3s=}
    dev: true

  /config-chain@1.1.13:
    resolution: {integrity: sha512-qj+f8APARXHrM0hraqXYb2/bOVSV4PvJQlNZ/DVj0QrmNM2q2euizkeuVckQ57J+W0mRH6Hvi+k50M4Jul2VRQ==}
    dependencies:
      ini: 1.3.8
      proto-list: 1.2.4
    dev: false

  /consola@2.15.3:
    resolution: {integrity: sha512-9vAdYbHj6x2fLKC4+oPH0kFzY/orMZyG2Aj+kNylHxKGJ/Ed4dpNyAQYwJOdqO4zdM7XpVHmyejQDcQHrnuXbw==}
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

  /cookie-signature@1.0.6:
    resolution: {integrity: sha1-4wOogrNCzD7oylE6eZmXNNqzriw=}
    dev: false

  /cookie@0.6.0:
    resolution: {integrity: sha512-U71cyTamuh1CRNCfpGY6to28lxvNwPG4Guz/EVjgf3Jmzv0vlDp1atT9eS5dDjMYHucpHbWns6Lwf3BKz6svdw==}
    engines: {node: '>= 0.6'}
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

  /csstype@3.1.3:
    resolution: {integrity: sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==}

  /data-uri-to-buffer@4.0.1:
    resolution: {integrity: sha512-0R9ikRb668HB7QDxT1vkpuUBtqc53YyAwMwGeUFKRojY/NWKvdZ+9UYtRfGmhqNbRkTSVpMbmyhXipFFv2cb/A==}
    engines: {node: '>= 12'}
    dev: false

  /data-uri-to-buffer@6.0.2:
    resolution: {integrity: sha512-7hvf7/GW8e86rW0ptuwS3OcBGDjIi6SZva7hCyWC0yYry2cOPmLIjXAUHI6DK2HsnwJd9ifmt57i8eV2n4YNpw==}
    engines: {node: '>= 14'}
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

  /debug@4.3.6(supports-color@5.5.0):
    resolution: {integrity: sha512-O/09Bd4Z1fBrU4VzkhFqVgpPzaGbw6Sm9FEkBT1A/YBXQFGuuSxa1dN2nxgxS34JmKXqYx8CZAwEVoJFImUXIg==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true
    dependencies:
      ms: 2.1.2
      supports-color: 5.5.0

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

  /esbuild@0.23.1:
    resolution: {integrity: sha512-VVNz/9Sa0bs5SELtn3f7qhJCDPCF5oMEl5cO9/SSinpE9hbPVvxbd572HH5AKiP7WD8INO53GgfDDhRjkylHEg==}
    engines: {node: '>=18'}
    hasBin: true
    requiresBuild: true
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.23.1
      '@esbuild/android-arm': 0.23.1
      '@esbuild/android-arm64': 0.23.1
      '@esbuild/android-x64': 0.23.1
      '@esbuild/darwin-arm64': 0.23.1
      '@esbuild/darwin-x64': 0.23.1
      '@esbuild/freebsd-arm64': 0.23.1
      '@esbuild/freebsd-x64': 0.23.1
      '@esbuild/linux-arm': 0.23.1
      '@esbuild/linux-arm64': 0.23.1
      '@esbuild/linux-ia32': 0.23.1
      '@esbuild/linux-loong64': 0.23.1
      '@esbuild/linux-mips64el': 0.23.1
      '@esbuild/linux-ppc64': 0.23.1
      '@esbuild/linux-riscv64': 0.23.1
      '@esbuild/linux-s390x': 0.23.1
      '@esbuild/linux-x64': 0.23.1
      '@esbuild/netbsd-x64': 0.23.1
      '@esbuild/openbsd-arm64': 0.23.1
      '@esbuild/openbsd-x64': 0.23.1
      '@esbuild/sunos-x64': 0.23.1
      '@esbuild/win32-arm64': 0.23.1
      '@esbuild/win32-ia32': 0.23.1
      '@esbuild/win32-x64': 0.23.1
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

  /esprima@4.0.1:
    resolution: {integrity: sha512-eGuFFw7Upda+g4p+QHvnW0RyTX/SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB/sbNop0Kszm0jsaWU4A==}
    engines: {node: '>=4'}
    hasBin: true
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

  /fast-safe-stringify@2.1.1:
    resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}
    dev: false

  /fast-uri@3.0.1:
    resolution: {integrity: sha512-MWipKbbYiYI0UC7cl8m/i/IWTqfC8YXsqjzybjddLsFjStroQzsHXkc73JutMvBiXmOvapk+axIl79ig5t55Bw==}
    dev: false

  /fetch-blob@3.2.0:
    resolution: {integrity: sha512-7yAQpD2UMJzLi1Dqv7qFYnPbaPx7ZfFK6PiIxQ4PfkGPyNyl2Ugx+a/umUonmKqjhM4DnfbMvdX6otXq83soQQ==}
    engines: {node: ^12.20 || >= 14.13}
    dependencies:
      node-domexception: 1.0.0
      web-streams-polyfill: 3.3.3
    dev: false

  /fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}
    dependencies:
      to-regex-range: 5.0.1
    dev: true

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

  /foreground-child@3.3.0:
    resolution: {integrity: sha512-Ld2g8rrAyMYFXBhEqMz8ZAHBi4J4uS1i/CxGMDnjyFWddMXLVcDp051DZfu+t7+ab7Wv6SMqpWmyFIj5UbfFvg==}
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

  /get-tsconfig@4.7.6:
    resolution: {integrity: sha512-ZAqrLlu18NbDdRaHq+AKXzAmqIUPswPWKUchfytdAjiRFnCe5ojG2bstg6mRiZabkKfCoL/e98pbBELIV/YCeA==}
    dependencies:
      resolve-pkg-maps: 1.0.0
    dev: false

  /get-uri@6.0.3:
    resolution: {integrity: sha512-BzUrJBS9EcUb4cFol8r4W3v1cPsSyajLSthNkz5BxbpDcHN5tIrM10E2eNvfnvBn3DaT3DUgx0OpsBKkaOpanw==}
    engines: {node: '>= 14'}
    dependencies:
      basic-ftp: 5.0.5
      data-uri-to-buffer: 6.0.2
      debug: 4.3.6(supports-color@5.5.0)
      fs-extra: 11.2.0
    transitivePeerDependencies:
      - supports-color
    dev: false

  /glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}
    dependencies:
      is-glob: 4.0.3
    dev: true

  /glob@10.4.5:
    resolution: {integrity: sha512-7Bv8RF0k6xjo7d4A/PxYLbUCfb6c+Vpd2/mB2yRDlew7Jb5hEXiCD9ibfO7wpk8i4sevK6DFny9h7EYbM3/sHg==}
    hasBin: true
    dependencies:
      foreground-child: 3.3.0
      jackspeak: 3.4.3
      minimatch: 9.0.5
      minipass: 7.1.2
      package-json-from-dist: 1.0.0
      path-scurry: 1.11.1
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
      debug: 4.3.6(supports-color@5.5.0)
    transitivePeerDependencies:
      - supports-color
    dev: false

  /https-proxy-agent@7.0.5:
    resolution: {integrity: sha512-1e4Wqeblerz+tMKPIq2EMGiiWW1dIjZOksyHWSUm1rmuvw/how9hBHZ38lAGj5ID4Ik6EdkOw7NmWPy6LAwalw==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6(supports-color@5.5.0)
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

  /ignore-by-default@1.0.1:
    resolution: {integrity: sha512-Ius2VYcGNk7T90CppJqcIkS5ooHUZyIQK+ClZfMfMNFEF9VSE73Fq+906u/CWu92x4gzZMWOwfFYckPObzdEbA==}
    dev: true

  /inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}
    dev: false

  /ini@1.3.8:
    resolution: {integrity: sha512-JV/yugV2uzW5iMRSiZAyDtQd+nxtUnjeLt0acNdw98kKLrvuRVyB80tsREOE7yvGVgalhZ6RNXCmEHkUKBKxew==}
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
    dev: true

  /is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}
    dev: true

  /is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}
    dev: false

  /is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}
    dependencies:
      is-extglob: 2.1.1
    dev: true

  /is-interactive@1.0.0:
    resolution: {integrity: sha512-2HvIEKRoqS62guEC+qBjpvRubdX910WCMuJTZ+I9yvqKU2/12eSL549HMwtabb4oupdj2sMP50k+XJfB/8JE6w==}
    engines: {node: '>=8'}
    dev: false

  /is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}
    dev: true

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

  /iterare@1.2.1:
    resolution: {integrity: sha512-RKYVTCjAnRthyJes037NX/IiqeidgN1xc3j1RjFfECFp28A1GVwK9nA+i0rJPaHqSZwygLzRnFlzUuHFoWWy+Q==}
    engines: {node: '>=6'}
    dev: false

  /jackspeak@3.4.3:
    resolution: {integrity: sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==}
    dependencies:
      '@isaacs/cliui': 8.0.2
    optionalDependencies:
      '@pkgjs/parseargs': 0.11.0
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
      '@babel/runtime': 7.25.4
      ts-algebra: 2.0.0
    dev: false

  /json-schema-traverse@1.0.0:
    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}
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

  /leac@0.6.0:
    resolution: {integrity: sha512-y+SqErxb8h7nE/fiEX07jsbuhrpO9lL8eca7/Y1nuWV2moNlXhyd59iDGcRf6moVyDMbmTNzL40SUyrFU/yDpg==}
    dev: false

  /leven@3.1.0:
    resolution: {integrity: sha512-qsda+H8jTaUaN/x5vzW2rzc+8Rw4TAQ/4KjB46IwK5VH+IlVeeeje/EoZRpiXvIqjFgK84QffqPztGI3VBLG1A==}
    engines: {node: '>=6'}
    dev: false

  /libphonenumber-js@1.11.7:
    resolution: {integrity: sha512-x2xON4/Qg2bRIS11KIN9yCNYUjhtiEjNyptjX0mX+pyKHecxuJVLIpfX1lq9ZD6CrC/rB+y4GBi18c6CEcUR+A==}
    dev: false

  /liquidjs@10.16.6:
    resolution: {integrity: sha512-nQJH9bOXs+NBD3fwgZi5QCnDwbzCkrGRYVWyaYA3P/MzGRUH13SS2BJJ+vyMdNg1uL1mnl7DXWWxx3wuZgVTGg==}
    engines: {node: '>=14'}
    hasBin: true
    dependencies:
      commander: 10.0.1
    dev: false

  /lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==}
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

  /methods@1.1.2:
    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
    engines: {node: '>= 0.6'}
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
    dev: true

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

  /ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}
    dev: false

  /nanoid@3.3.7:
    resolution: {integrity: sha512-eSRppjcPIatRIMC1U6UngP8XFcz8MQWGQdt1MTBQ7NaAmvXDfvNxbvWV3x2y6CdEUciCSsDHDQZbhYaB8QEo2g==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true

  /negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}
    dev: false

  /netmask@2.0.2:
    resolution: {integrity: sha512-dBpDMdxv9Irdq66304OLfEmQ9tbNRFnFTuZiLo+bD+r332bBmMJ8GBLXklIXXgxd3+v9+KUnZaUR5PJMa75Gsg==}
    engines: {node: '>= 0.4.0'}
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

  /nodemon@3.1.4:
    resolution: {integrity: sha512-wjPBbFhtpJwmIeY2yP7QF+UKzPfltVGtfce1g/bB15/8vCGZj8uxD62b/b9M9/WVgme0NZudpownKN+c0plXlQ==}
    engines: {node: '>=10'}
    hasBin: true
    dependencies:
      chokidar: 3.6.0
      debug: 4.3.6(supports-color@5.5.0)
      ignore-by-default: 1.0.1
      minimatch: 3.1.2
      pstree.remy: 1.1.8
      semver: 7.6.3
      simple-update-notifier: 2.0.0
      supports-color: 5.5.0
      touch: 3.1.1
      undefsafe: 2.0.5
    dev: true

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
    dev: true

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

  /pac-proxy-agent@7.0.2:
    resolution: {integrity: sha512-BFi3vZnO9X5Qt6NRz7ZOaPja3ic0PhlsmCRYLOpN11+mWBCR6XJDqW5RF3j8jm4WGGQZtBA+bTfxYzeKW73eHg==}
    engines: {node: '>= 14'}
    dependencies:
      '@tootallnate/quickjs-emscripten': 0.23.0
      agent-base: 7.1.1
      debug: 4.3.6(supports-color@5.5.0)
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

  /path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}
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

  /path-to-regexp@3.2.0:
    resolution: {integrity: sha512-jczvQbCUS7XmS7o+y1aEO9OBVFeZBQ1MDSEqmO7xSoPgOPoowY/SxLpZ6Vh97/8qHZOteiCKb7gkG9gA2ZUxJA==}
    dev: false

  /peberminta@0.9.0:
    resolution: {integrity: sha512-XIxfHpEuSJbITd1H3EeQwpcZbTLHc+VVr8ANI9t5sit565tsI4/xK3KWTUFE2e6QiangUkh3B0jihzmGnNrRsQ==}
    dev: false

  /picocolors@1.0.1:
    resolution: {integrity: sha512-anP1Z8qwhkbmu7MFP5iTt+wQKXgwzf7zTyGlcdzabySa9vd0Xt392U0rVmz9poOaBj0uHJKyyo9/upk0HrEQew==}

  /picomatch@2.3.1:
    resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
    engines: {node: '>=8.6'}
    dev: true

  /postcss@8.4.41:
    resolution: {integrity: sha512-TesUflQ0WKZqAvg52PWL6kHgLKP6xB6heTOdoYM0Wt2UHyxNa4K25EZZMgKns3BH1RLVbZCREPpLY0rhnNoHVQ==}
    engines: {node: ^10 || ^12 || >=14}
    dependencies:
      nanoid: 3.3.7
      picocolors: 1.0.1
      source-map-js: 1.2.0

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
      debug: 4.3.6(supports-color@5.5.0)
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

  /pstree.remy@1.1.8:
    resolution: {integrity: sha512-77DZwxQmxKnu3aR542U+X8FypNzbfJ+C5XQDk3uWjWxn6151aIMGthWYRXTqT1E5oJvg+ljaa2OJi+VfvCOQ8w==}
    dev: true

  /qs@6.11.0:
    resolution: {integrity: sha512-MvjoMCJwEarSbUYk5O+nmoSzSutSsTwF85zcHPQ9OrlFoZOYIjaqBAJIqIXjptyD5vThxGq52Xu/MaJzRkIk4Q==}
    engines: {node: '>=0.6'}
    dependencies:
      side-channel: 1.0.6
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

  /react-promise-suspense@0.3.4:
    resolution: {integrity: sha512-I42jl7L3Ze6kZaq+7zXWSunBa3b1on5yfvUW6Eo/3fFOj6dZ5Bqmcd264nJbTK/gn1HjjILAjSwnZbV4RpSaNQ==}
    dependencies:
      fast-deep-equal: 2.0.1
    dev: false

  /react@18.3.1:
    resolution: {integrity: sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==}
    engines: {node: '>=0.10.0'}
    dependencies:
      loose-envify: 1.4.0
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
    dev: true

  /reflect-metadata@0.2.2:
    resolution: {integrity: sha512-urBwgfrvVP/eAyXx4hluJivBKzuEbSQs9rKWCrCkbSxNv8mxPcUZKeuoF3Uy4mJl3Lwprp6yy5/39VWigZ4K6Q==}
    dev: false

  /regenerator-runtime@0.14.1:
    resolution: {integrity: sha512-dYnhHh0nJoMfnkZs6GmmhFknAGRrLznOu5nc9ML+EJxGvrx6H7teuevqVqCuPcPK//3eDrrjQhehXVx9cnkGdw==}
    dev: false

  /require-from-string@2.0.2:
    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
    engines: {node: '>=0.10.0'}
    dev: false

  /resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}
    dev: false

  /restore-cursor@3.1.0:
    resolution: {integrity: sha512-l+sSefzHpj5qimhFSE5a8nufZYAM3sBSVMAPtYkmC+4EH2anSGaEMXSD0izRQbu9nfyQ9y5JrVmp7E8oZrUjvA==}
    engines: {node: '>=8'}
    dependencies:
      onetime: 5.1.2
      signal-exit: 3.0.7
    dev: false

  /rollup@4.21.1:
    resolution: {integrity: sha512-ZnYyKvscThhgd3M5+Qt3pmhO4jIRR5RGzaSovB6Q7rGNrK5cUncrtLmcTTJVSdcKXyZjW8X8MB0JMSuH9bcAJg==}
    engines: {node: '>=18.0.0', npm: '>=8.0.0'}
    hasBin: true
    dependencies:
      '@types/estree': 1.0.5
    optionalDependencies:
      '@rollup/rollup-android-arm-eabi': 4.21.1
      '@rollup/rollup-android-arm64': 4.21.1
      '@rollup/rollup-darwin-arm64': 4.21.1
      '@rollup/rollup-darwin-x64': 4.21.1
      '@rollup/rollup-linux-arm-gnueabihf': 4.21.1
      '@rollup/rollup-linux-arm-musleabihf': 4.21.1
      '@rollup/rollup-linux-arm64-gnu': 4.21.1
      '@rollup/rollup-linux-arm64-musl': 4.21.1
      '@rollup/rollup-linux-powerpc64le-gnu': 4.21.1
      '@rollup/rollup-linux-riscv64-gnu': 4.21.1
      '@rollup/rollup-linux-s390x-gnu': 4.21.1
      '@rollup/rollup-linux-x64-gnu': 4.21.1
      '@rollup/rollup-linux-x64-musl': 4.21.1
      '@rollup/rollup-win32-arm64-msvc': 4.21.1
      '@rollup/rollup-win32-ia32-msvc': 4.21.1
      '@rollup/rollup-win32-x64-msvc': 4.21.1
      fsevents: 2.3.3
    dev: true

  /rxjs@7.8.1:
    resolution: {integrity: sha512-AA3TVj+0A2iuIoQkWEK/tqFjBq2j+6PO6Y0zJcvzLAFhEFIO3HL0vls9hWLncZbAAbK0mar7oZ4V079I/qPMxg==}
    dependencies:
      tslib: 2.7.0
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
      postcss: 8.4.41
    dev: false

  /scheduler@0.23.2:
    resolution: {integrity: sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /selderee@0.11.0:
    resolution: {integrity: sha512-5TF+l7p4+OsnP8BCCvSyZiSPc4x4//p5uPwK8TCnVPJYRmU2aYKMpOXvw8zM5a5JvuuCGN1jmsMwuU2W02ukfA==}
    dependencies:
      parseley: 0.12.1
    dev: false

  /semver@7.6.3:
    resolution: {integrity: sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==}
    engines: {node: '>=10'}
    hasBin: true

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

  /simple-update-notifier@2.0.0:
    resolution: {integrity: sha512-a2B9Y0KlNXl9u/vsW6sTIu9vGEpfKu2wRV6l1H3XEas/0gUIzGzBoP/IouTcUQbm9JWZLH3COxyn03TYlFax6w==}
    engines: {node: '>=10'}
    dependencies:
      semver: 7.6.3
    dev: true

  /smart-buffer@4.2.0:
    resolution: {integrity: sha512-94hK0Hh8rPqQl2xXc3HsaBoOXKV20MToPkcXvwbISWLEs+64sBq5kFgn2kJDHb1Pry9yrP0dxrCI9RRci7RXKg==}
    engines: {node: '>= 6.0.0', npm: '>= 3.0.0'}
    dev: false

  /socks-proxy-agent@8.0.4:
    resolution: {integrity: sha512-GNAq/eg8Udq2x0eNiFkr9gRg5bA7PXEWagQdeRX4cPSG+X/8V38v637gim9bjFptMk1QWsCTr0ttrJEiXbNnRw==}
    engines: {node: '>= 14'}
    dependencies:
      agent-base: 7.1.1
      debug: 4.3.6(supports-color@5.5.0)
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

  /source-map-js@1.2.0:
    resolution: {integrity: sha512-itJW8lvSA0TXEphiRoawsCksnlf8SyvmFzIhltqAHluXd88pkCd+cXJVHTDwdCr0IzwptSm035IHQktUu1QUMg==}
    engines: {node: '>=0.10.0'}

  /source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}
    requiresBuild: true
    dev: false
    optional: true

  /sprintf-js@1.0.3:
    resolution: {integrity: sha512-D9cPgkvLlV3t3IzL0D0YLvGA9Ahk4PcvVwUbN0dSGr1aP0Nrt4AEnTUbuGvquEC0mA64Gqt1fzirlRs5ibXx8g==}
    dev: false

  /sprintf-js@1.1.3:
    resolution: {integrity: sha512-Oo+0REFV59/rz3gfJNKQiBlwfHaSESl1pcGyABQsnnIfWOFt6JNj5gCog2U6MLZ//IGYD+nA8nI+mTShREReaA==}
    dev: false

  /statuses@2.0.1:
    resolution: {integrity: sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==}
    engines: {node: '>= 0.8'}
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

  /supports-color@5.5.0:
    resolution: {integrity: sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==}
    engines: {node: '>=4'}
    dependencies:
      has-flag: 3.0.0

  /supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}
    dependencies:
      has-flag: 4.0.0
    dev: false

  /swagger-ui-dist@5.17.14:
    resolution: {integrity: sha512-CVbSfaLpstV65OnSjbXfVd6Sta3q3F7Cj/yYuvHMp1P90LztOLs6PfUnKEVAeiIVQt9u2SaPwv0LiH/OyMjHRw==}
    dev: false

  /to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}
    dependencies:
      is-number: 7.0.0
    dev: true

  /toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}
    dev: false

  /touch@3.1.1:
    resolution: {integrity: sha512-r0eojU4bI8MnHr8c5bNo7lJDdI2qXlWWJk6a9EAFG7vbhTjElYhBVS3/miuE0uOuoLdb8Mc/rVfsmm6eo5o9GA==}
    hasBin: true
    dev: true

  /tr46@0.0.3:
    resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}
    dev: false

  /ts-algebra@2.0.0:
    resolution: {integrity: sha512-FPAhNPFMrkwz76P7cdjdmiShwMynZYN6SgOujD1urY4oNm80Ou9oMdmbR45LotcKOXoy7wSmHkRFE6Mxbrhefw==}
    dev: false

  /tslib@2.6.3:
    resolution: {integrity: sha512-xNvxJEOUiWPGhUuUdQgAJPKOOJfGnIyKySOc09XkKsgdUV/3E2zvwZYdejjmRgPCgcym1juLH3226yA7sEFJKQ==}
    dev: false

  /tslib@2.7.0:
    resolution: {integrity: sha512-gLXCKdN1/j47AiHiOkJN69hJmcbGTHI0ImLmbYLHykhgeN0jVGola9yVjFgzCUklsZQMW55o+dW7IXv3RCXDzA==}
    dev: false

  /tsx@4.19.0:
    resolution: {integrity: sha512-bV30kM7bsLZKZIOCHeMNVMJ32/LuJzLVajkQI/qf92J2Qr08ueLQvW00PUZGiuLPP760UINwupgUj8qrSCPUKg==}
    engines: {node: '>=18.0.0'}
    hasBin: true
    dependencies:
      esbuild: 0.23.1
      get-tsconfig: 4.7.6
    optionalDependencies:
      fsevents: 2.3.3
    dev: false

  /type-is@1.6.18:
    resolution: {integrity: sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==}
    engines: {node: '>= 0.6'}
    dependencies:
      media-typer: 0.3.0
      mime-types: 2.1.35
    dev: false

  /typescript@5.5.4:
    resolution: {integrity: sha512-Mtq29sKDAEYP7aljRgtPOpTvOfbwRWlS6dPRzwjdE+C0R4brX/GUyhHSecbHMFLNBLcJIPt9nl9yG5TZ1weH+Q==}
    engines: {node: '>=14.17'}
    hasBin: true
    dev: false

  /uid@2.0.2:
    resolution: {integrity: sha512-u3xV3X7uzvi5b1MncmZo3i2Aw222Zk1keqLA1YkHldREkAhAqi65wuPfe7lHx8H/Wzy+8CE7S7uS3jekIM5s8g==}
    engines: {node: '>=8'}
    dependencies:
      '@lukeed/csprng': 1.1.0
    dev: false

  /undefsafe@2.0.5:
    resolution: {integrity: sha512-WxONCrssBM8TSPRqN5EmsjVrsv4A8X12J4ArBiiayv3DyyG3ZlIg6yysuuSYdZsVz3TKcTg2fd//Ujd4CHV1iA==}
    dev: true

  /undici-types@6.19.8:
    resolution: {integrity: sha512-ve2KP6f/JnbPBFyobGHuerC9g1FYGn/F8n1LWTwNxCEzd6IfqTwUQcNXgEtmmQ6DlRrC1hrSrBnCZPokRrDHjw==}
    dev: true

  /universalify@2.0.1:
    resolution: {integrity: sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==}
    engines: {node: '>= 10.0.0'}
    dev: false

  /unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}
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

  /vite-express@0.18.0:
    resolution: {integrity: sha512-sdBVDbI/U5wVCFSW8S02uNdt9u6n8sChi4b9wkZMMtFBk7MESnB9rGnXDCmCxGuaG3vX9BjlrJDAcErnethOyw==}
    dependencies:
      picocolors: 1.0.1
    dev: false

  /vite@5.4.2(@types/node@20.16.2):
    resolution: {integrity: sha512-dDrQTRHp5C1fTFzcSaMxjk6vdpKvT+2/mIdE07Gw2ykehT49O0z/VHS3zZ8iV/Gh8BJJKHWOe5RjaNrW5xf/GA==}
    engines: {node: ^18.0.0 || >=20.0.0}
    hasBin: true
    peerDependencies:
      '@types/node': ^18.0.0 || >=20.0.0
      less: '*'
      lightningcss: ^1.21.0
      sass: '*'
      sass-embedded: '*'
      stylus: '*'
      sugarss: '*'
      terser: ^5.4.0
    peerDependenciesMeta:
      '@types/node':
        optional: true
      less:
        optional: true
      lightningcss:
        optional: true
      sass:
        optional: true
      sass-embedded:
        optional: true
      stylus:
        optional: true
      sugarss:
        optional: true
      terser:
        optional: true
    dependencies:
      '@types/node': 20.16.2
      esbuild: 0.21.5
      postcss: 8.4.41
      rollup: 4.21.1
    optionalDependencies:
      fsevents: 2.3.3
    dev: true

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
 `;
