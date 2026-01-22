# Programmer's Modern Digital Garden

A high-performance, Markdown-centric blog built with [Astro](https://astro.build/), [Tailwind CSS](https://tailwindcss.com/), and [MDX](https://mdxjs.com/). Designed for "git push to deploy" workflows and integrating with your personal cloud ecosystem.

## 🚀 Features

- **Blazing Fast**: Static Site Generation (SSG) with optimized assets.
- **Markdown-First**: Write posts in `.md` or `.mdx` with **Shiki** syntax highlighting.
- **Git Workflow**: Commit and push to publish.
- **External Tools Integration**: Link directly to your self-hosted apps/tools.
- **SEO Optimized**: Auto-generated sitemap and robots.txt.
- **Docker Ready**: Production-ready `Dockerfile` and `nginx.conf`.

---

## 🛠️ Deployment Guide

### Option 1: Docker (Recommended)

1.  **Build the Image**:
    ```bash
    docker build -t my-blog .
    ```

2.  **Run the Container**:
    ```bash
    docker run -d -p 80:80 --name blog my-blog
    ```

### Option 2: CI/CD (GitHub Actions) - Step-by-Step Guide for Beginners

This guide assumes you have a GitHub account and a basic understanding of Git, but are new to DockerHub and GitHub Actions.

#### Step 1: Set up DockerHub
1.  **Create an Account**: Go to [hub.docker.com](https://hub.docker.com/) and sign up.
    *   *Note your username (e.g., `kevin123`). This is your **DOCKERHUB_USERNAME**.*
2.  **Create a Repository**:
    *   Click "Create Repository".
    *   Name it `blog` (or whatever you prefer).
    *   Keep it **Public** (easier for beginners) or Private.
    *   Click "Create".
3.  **Generate an Access Token**:
    *   Click your profile picture (top right) -> "Account Settings".
    *   Go to "Security" -> "New Access Token".
    *   Description: "GitHub Actions".
    *   Permissions: "Read, Write, Delete".
    *   **Copy the generated token**. This is your **DOCKERHUB_TOKEN**. *You won't see it again!*

#### Step 2: Configure GitHub Secrets
1.  Go to your GitHub repository page.
2.  Click **Settings** (top tab).
3.  On the left sidebar, scroll down to **Secrets and variables** -> **Actions**.
4.  Click **New repository secret**.
    *   **Name**: `DOCKERHUB_USERNAME`
    *   **Value**: Your DockerHub username (e.g., `kevin123`).
    *   Click "Add secret".
5.  Click **New repository secret** again.
    *   **Name**: `DOCKERHUB_TOKEN`
    *   **Value**: Paste the long token string you copied from DockerHub.
    *   Click "Add secret".

#### Step 3: Enable Auto-Deployment
1.  Open `.github/workflows/deploy.yml` in your code editor.
2.  Find the `tags` line (around line 23).
3.  Change `user/blog:latest` to your actual DockerHub username:
    ```yaml
    tags: your_dockerhub_username/blog:latest
    ```
4.  Uncomment the `push: false` line and set it to `true`:
    ```yaml
    push: true
    ```
5.  Commit and push these changes:
    ```bash
    git add .
    git commit -m "Setup CI/CD deployment"
    git push origin main
    ```
6.  Go to the **Actions** tab in your GitHub repo to watch the build happen!

#### Step 4: Run on Your Server
(On your VPS/Server terminal)
1.  Install Docker if you haven't (just Google "install docker on ubuntu/centos").
2.  Run this command (replace with your username):
    ```bash
    docker run -d \
      --name blog \
      --restart unless-stopped \
      -p 80:80 \
      your_dockerhub_username/blog:latest
    ```
    *   `-d`: Runs in background.
    *   `--restart unless-stopped`: Auto-restarts if the server reboots.
    *   `-p 80:80`: Opens port 80 (HTTP).

#### Step 5: Automate Updates (Optional but Recommended)
Instead of manually running commands every time you post, you can run **Watchtower**. This is a special tool that "watches" your running containers and automatically updates them when a new version is pushed to DockerHub.

Run this **once** on your server:

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 300
```

*   `--interval 300`: Checks for updates every 5 minutes (300 seconds).

**Now the flow is fully automated:**
1.  You push a new article (`git push`).
2.  GitHub Actions builds the new image and pushes to DockerHub.
3.  Watchtower (on your server) sees the new image within 5 minutes.
4.  Watchtower automatically pulls the image and restarts your blog container.


---

## ✍️ Publishing Process

### 1. Create a Post
Create a new Markdown file in `src/content/blog/`:

```markdown
---
title: 'My New Post'
description: 'Description for SEO and previews.'
pubDate: '2026-01-23'
tags: ['coding', 'life']
heroImage: '/images/hero.jpg' # Optional
---

Write your content here...
```

### 2. Add a Tool
Add a new file in `src/content/tools/` to link an external app:

```markdown
---
title: 'My Cool App'
description: 'A helper tool I built.'
pubDate: '2026-01-23'
version: '1.0'
icon: '🛠️'
url: 'https://tools.mydomain.com/cool-app'
---
```

### 3. Publish
```bash
git add .
git commit -m "Publish new post"
git push origin main
```
*The CI/CD pipeline will pick this up and deploy the new version.*

---

## 🎨 Customization & Beautification

### 1. Styling (Tailwind CSS)
- **Global Styles**: Edit `src/styles/global.css`.
- **Theme Config**: Modifying `tailwind.config.mjs` (if you eject from the Vite plugin default) or just use arbitrary values.
- **Colors**: The project uses `zinc` and `indigo` by default. Change these in the Layout or Component classes (e.g., `text-indigo-600` → `text-rose-600`).

### 2. Layouts
- **Main Layout**: `src/layouts/Layout.astro` controls the global shell (HTML head, body, theme toggle).
- **Header/Footer**: Modify `src/components/Header.astro` and `src/components/Footer.astro`.

### 3. Fonts
Fonts are loaded in `src/layouts/Layout.astro`.
- Default Sans: **Inter**
- Default Mono: **JetBrains Mono**
To change, install a new font via `npm install @fontsource/font-name` and update the import.

### 4. Syntax Highlighting
Theme is configured in `astro.config.mjs`:
```js
markdown: {
  shikiConfig: {
    theme: 'dracula', // Try 'nord', 'github-dark', etc.
    wrap: true,
  },
},
```

---

## 📂 Project Structure

```text
/
├── public/           # Static assets (images, favicon, robots.txt)
├── src/
│   ├── content/      # Markdown content (Blog posts, Tool entries)
│   ├── components/   # UI Components (Header, Footer)
│   ├── layouts/      # Page wrappers
│   ├── pages/        # File-based routing
│   └── styles/       # Global CSS
├── astro.config.mjs  # Astro configuration
├── Dockerfile        # Production build instructions
└── nginx.conf        # Web server config
```
