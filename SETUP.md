# Developer Setup Guide

## Prerequisites

1. **Node.js** (v18 or later): https://nodejs.org/
2. **Git**: Should already be installed on Mac
3. **Claude Code**: Install with `npm install -g @anthropic-ai/claude-code`

## One-Time Setup

### 1. Clone the repository

```bash
git clone https://github.com/ethan-kaseff/seating-chart.git
cd seating-chart
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get environment variables

Ask Ethan for the `.env.local` file and place it in the project root. This contains the database connection strings.

Alternatively, if you have Vercel CLI access:
```bash
vercel link
vercel env pull
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Making Changes with Claude Code

### Start Claude Code

```bash
cd seating-chart
claude
```

### Example prompts

- "Add a button to duplicate a table"
- "Change the table color options"
- "Fix the bug where dragging stops when moving fast"
- "Add a new dietary restriction option"

### After making changes

Claude Code can commit and push for you, or you can do it manually:

```bash
git add .
git commit -m "Description of changes"
git push
```

**Changes pushed to `main` automatically deploy to production.**

## Project Structure

```
seating-chart/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User's events list
│   ├── events/[id]/       # Seating chart editor
│   └── api/               # Backend API routes
├── components/            # React components
│   ├── SeatingChart.tsx   # Main editor component
│   ├── Table.tsx          # Draggable table
│   ├── GuestSidebar.tsx   # Guest list panel
│   └── ...
├── hooks/
│   └── useSeatingChart.ts # State management
├── lib/                   # Utilities
│   ├── db.ts             # Database connection
│   └── auth.ts           # Authentication
└── types/                # TypeScript types
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `git pull` | Get latest changes |
| `git push` | Deploy changes |

## Live URLs

- **Production**: https://seating-chart-three.vercel.app
- **GitHub**: https://github.com/ethan-kaseff/seating-chart
