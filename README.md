# Aperture 📚

A personal digital garden for code, thoughts, and tools.

Built with [Astro](https://astro.build/) and styled with [Tailwind CSS v4](https://tailwindcss.com/).

## Features

- 📝 **Blog** — Markdown-based posts with syntax highlighting
- 🔧 **Tools** — External tool collection (links to Aperture chatbot, etc.)
- 🔍 **Search** — Static search powered by [Pagefind](https://pagefind.app/)
- 🌗 **Dark Mode** — Light/dark theme with system preference detection
- ⚡ **Fast** — Static site generation, optimized fonts (Space Mono)
- 📱 **Responsive** — Mobile-first design

## Project Structure

```
blog/
├── src/
│   ├── data/
│   │   ├── blog/       # Blog posts (*.md)
│   │   └── tools/      # Tool entries (*.md)
│   ├── pages/
│   │   ├── index.md    # Home/About page
│   │   ├── posts/      # Blog archive
│   │   ├── tools/      # Tools page
│   │   └── tags/       # Tag pages
│   ├── layouts/
│   ├── components/
│   ├── styles/
│   └── config.ts       # Site configuration
├── nginx/              # Nginx config for deployment
├── scripts/            # Build scripts
└── Dockerfile          # Multi-stage Docker build
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is designed to be deployed alongside [Aperture](../aperture) (chatbot tool) under a unified domain.

### Architecture

```
yourdomain.com/
├── /                    → Blog (this repo)
├── /tools/aperture      → Aperture chatbot
└── /api/*               → Go backend
```

### Option 1: Docker (Recommended)

The multi-stage Dockerfile builds both frontends:

```bash
# Build (requires ../aperture to exist)
docker build -t aperture-frontend .

# Push to registry
docker push your-registry/aperture-frontend:latest

# Run on server
docker run -d -p 80:80 aperture-frontend
```

### Option 2: Manual Build

```bash
# Build both frontends
./scripts/build-all.sh

# Output in deploy/
# - deploy/blog/      → /var/www/blog
# - deploy/aperture/  → /var/www/aperture
# - deploy/nginx/     → /etc/nginx/conf.d/
```

### SSL

- **Cloudflare**: Enable proxied mode, SSL handled automatically
- **Self-hosted**: Use Let's Encrypt with certbot

```bash
sudo certbot --nginx -d yourdomain.com
```

## Configuration

Edit `src/config.ts`:

```ts
export const SITE = {
  website: "https://yourdomain.com",
  author: "Your Name",
  title: "Aperture",
  desc: "A personalized digital garden...",
  // ...
};
```

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Lint with ESLint |
| `./scripts/build-all.sh` | Build blog + aperture |

## Credits

Based on [AstroPaper](https://github.com/satnaing/astro-paper) by Sat Naing.

## License

MIT
