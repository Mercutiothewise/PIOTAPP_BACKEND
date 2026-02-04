# PIOT Support Backend

This folder contains the backend services for the PUREIOT Support App, including:
- Ticket submission API
- Email notification service
- Webform for ticket updates

## Structure
- `server.js`: Express server for API, mail service, and webform
- `api/index.js`: Serverless handler (for Vercel/Render)
- `package.json`: Dependencies and scripts
- `render.yaml`: Render deployment config
- `.env.example`: Example environment variables

## Deployment
- Set your environment variables in `.env` or in your Render/GitHub secrets.
- Do **not** commit `.env` with real credentials.
- Run `npm install` before starting the server.

---
