# VRM Properties Demo Site

Demo clone of vrmproperties.com for showcasing HubSpot Listings, campaigns, and automation using a HubSpot sandbox environment.

This is a [Next.js](https://nextjs.org) project built with TypeScript and Tailwind CSS.

## Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Fastest way to deploy:**
1. Click the "Deploy to Render" button above
2. Connect your GitHub repository
3. Render auto-detects the `render.yaml` configuration
4. Click "Apply" to deploy

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions.

## Features

- **100 Real Properties** from vrmproperties.com with authentic addresses
- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS** for responsive, modern design
- **HubSpot Sandbox Integration**
  - Global tracking code for visitor analytics
  - Form embeds using a single form GUID for all pages
  - Real-time lead capture and workflow triggers
- **Static Site Generation** - All 107 pages pre-rendered at build time
- **Production Ready** - Optimized for deployment on Render, Vercel, or any Node.js host

## Getting Started

### Development

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

This project uses the following environment variables for HubSpot integration:

### Client-Side (Tracking & Basic Forms)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` | Your HubSpot portal ID (Hub ID) |
| `NEXT_PUBLIC_HUBSPOT_FORM_GUID` | Form GUID for all HubSpot forms |

### Server-Side (Request Info Form Integration)

| Variable | Description |
|----------|-------------|
| `HUBSPOT_PORTAL_ID` | HubSpot portal ID (Hub ID) |
| `HUBSPOT_FORM_GUID` | Form GUID for contact creation |
| `HUBSPOT_ACCESS_TOKEN` | Private App access token (keep secret!) |

Create a `.env.local` file in the project root for local development:

```bash
# Client-side (tracking)
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your_portal_id
NEXT_PUBLIC_HUBSPOT_FORM_GUID=your_form_guid

# Server-side (Request Info form)
HUBSPOT_PORTAL_ID=your_portal_id
HUBSPOT_FORM_GUID=your_form_guid
HUBSPOT_ACCESS_TOKEN=your_private_app_access_token
```

See [HUBSPOT_INTEGRATION.md](./HUBSPOT_INTEGRATION.md) for detailed setup instructions and [REQUEST_INFO_INTEGRATION.md](./REQUEST_INFO_INTEGRATION.md) for the Request Info form workflow.

## Deployment

### Render (Recommended)

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete instructions.

**Quick steps:**
1. Sign up at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect this GitHub repository
4. Render auto-configures using `render.yaml`
5. Click "Create Web Service"

Your site will be live at `https://your-service-name.onrender.com`

### Other Platforms

This Next.js app can also be deployed to:
- **Vercel**: [Deploy with Vercel](https://vercel.com/new)
- **Netlify**: Compatible with Netlify
- **AWS/Azure/GCP**: Deploy as a Node.js application

## HubSpot Configuration

After deployment, configure HubSpot integration:

1. Create a form in your HubSpot sandbox (Marketing → Lead Capture → Forms)
2. Update placeholder IDs in the code:
   - `YOUR_HUBSPOT_ID` in `src/app/layout.tsx`
   - `YOUR_PORTAL_ID` in all form components
   - Form GUID in homepage, property pages, `/agents`, and `/financing`

See [HUBSPOT_INTEGRATION.md](./HUBSPOT_INTEGRATION.md) for detailed setup instructions.

## Project Structure

```
vrm-properties-demo-site/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout with HubSpot tracking
│   │   ├── page.tsx          # Homepage
│   │   ├── agents/           # Agent registration page
│   │   ├── financing/        # VA financing page
│   │   └── properties/       # Property listing and detail pages
│   ├── components/           # Reusable React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PropertyCard.tsx
│   │   └── HubSpotForm.tsx   # External form embed component
│   └── data/
│       └── properties.ts     # 100 real property listings
├── public/                   # Static assets
├── render.yaml              # Render deployment configuration
└── package.json

107 total pages (1 homepage + 6 static pages + 100 property detail pages)
```

## Documentation

- [HUBSPOT_INTEGRATION.md](./HUBSPOT_INTEGRATION.md) - HubSpot forms and tracking setup
- [REQUEST_INFO_INTEGRATION.md](./REQUEST_INFO_INTEGRATION.md) - Request Info form workflow and Contact-Listing associations
- [DATA_MAPPING.md](./DATA_MAPPING.md) - Source data identifiers and HubSpot field mapping
- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Detailed Render deployment guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment options

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Forms**: HubSpot Forms Embed API v2
- **Analytics**: HubSpot Tracking Code
- **Deployment**: Render (with `render.yaml` blueprint)
- **Rendering**: Static Site Generation (SSG) for optimal performance
