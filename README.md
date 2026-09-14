# ReadyFor
**Know when to leave—and feel ready when you do.**

ReadyFor is a context-aware pre-departure assistant for work, appointments, errands, and events. It combines your plans, destination, travel mode, weather, and relevant preparation information in one interface.

Built for the **Agents for Humans** hackathon, Everyday Agents track.

## Features
- Place autocomplete and destination details through Amazon Location Service.
- Car, public transit, and walking routes; transit alternatives when returned by the provider.
- Departure times calculated in Python, with explicit arrival buffers.
- Weather and practical clothing suggestions.
- Everyday preparation advice from an Amazon Nova agent built with Strands.
- Dynamic official-source research for government visits using Tavily and a separate Nova tool loop.
- Expandable plan sections, checkable everyday Bring lists, and local searchable history.
- Web calendar-event downloads and email drafts. Native reminder/email components are included.

## Architecture
![ReadyFor architecture](docs/architecture.svg)

The FastAPI backend coordinates routes, buffers, research, and response assembly. The Strands agent generates everyday advice and uses weather tools. The government research/review path uses Bedrock Converse directly. Amazon Location supplies route data; Python performs departure arithmetic. This prototype is not deployed on AgentCore.

## Prerequisites
- Python 3.11–3.13 and Poetry.
- Node.js 22.13 or newer and npm; development used Node 24.
- An AWS credential profile with access in `us-east-1` to the configured Nova inference profile, Amazon Location Places, and Amazon Location Routes.
- A Tavily API key for government-source research. Ordinary plans do not require Tavily.

AWS calls and Tavily usage may incur provider charges. Credentials stay in the backend environment.

## Run locally (web)
Clone this repository, then open two terminals.

### Backend — repository root
```sh
poetry install
export AWS_PROFILE=readyfor
export AWS_DEFAULT_REGION=us-east-1
# Needed only for official-source research:
export TAVILY_API_KEY='YOUR_TAVILY_KEY'
poetry run uvicorn readyfor.api:app --reload
```
Create/configure your AWS profile using your normal AWS CLI credential flow. The profile name is local configuration, not a shipped credential. If it uses IAM Identity Center, log in to that profile before starting the server. Do not commit keys.

The default agent and arrival-buffer model is `us.amazon.nova-2-lite-v1:0`. Ensure the inference profile and its destination regions are permitted for your account. `READYFOR_RESEARCH_MODEL` can override the research/review model only; it does not change the everyday agent or buffer model.

### Frontend — second terminal
```sh
cd frontend
npm ci
npm run web
```
Open http://localhost:8081. API docs: http://127.0.0.1:8000/docs.

### First test
```sh
curl http://127.0.0.1:8000/health
```
Expected: `{"status":"ok"}`.

In the UI, enter an activity, open appointment details, select a future date/time, choose a destination from suggestions, and add your current location if you want routing. Select **Prepare Me**. To test public transit, supply all location, destination, and appointment fields.

## API overview
| Endpoint | Purpose |
|---|---|
| `GET /health` | Local health check |
| `POST /prepare` | Generate a preparation plan |
| `POST /prepare/stream` | Web progress and result stream (NDJSON) |
| `GET /places/suggest` | Destination suggestions |
| `GET /places/details` | Selected destination details |
| `GET /reminder.ics` | Download a calendar reminder |

See `/docs` for exact request schemas. Dates must be timezone-aware and in the future. A transit itinerary must still be feasible with the requested buffer.

## Important behavior
- Standard medical visits receive a 15-minute arrival buffer; government visits 30 minutes. Flight categories use earlier arrival targets. These are app planning rules, not provider guarantees; specific instructions take precedence.
- Route times and alternatives depend on provider availability and schedules.
- Official-source research can be incomplete. The interface retains source links and flags unresolved details. Verify consequential requirements with the issuing authority.
- Native components need device testing. The current frontend calls `127.0.0.1:8000`; a physical phone requires a reachable backend address and corresponding configuration. Running Expo Go alone does not solve this.
- Web reminders require importing the downloaded event. Email opens a draft/composer; the user sends it. Native reminders are local notifications, not a hosted push service.
- History is browser/device-local, with no account sync. Location and request context are sent to the backend; relevant service calls go to AWS, Open-Meteo, and, for research, Tavily. Never include unnecessary sensitive information.

## Troubleshooting
- AWS token expired / 503: refresh your AWS credentials, then inspect the backend error.
- Model unavailable: confirm Nova profile access, quotas, region, and inference permissions.
- Research unavailable: set `TAVILY_API_KEY` in the same environment as Uvicorn and restart it.
- Past appointment / infeasible route: choose a later time or another route/mode.
- Browser fetch/CORS: run the frontend at `localhost:8081` or `127.0.0.1:8081`, the currently allowed development origins.

## Project layout
`readyfor/` contains FastAPI, Strands agent, research/review, and travel/weather tools. `frontend/src/` contains the Expo UI, plan cards, history, reminders, and email components.

## Credits and license
MIT License; see [LICENSE](LICENSE). The Expo starter and its original notice remain in `frontend/LICENSE`. Third-party packages retain their own licenses. Built with AI coding assistance, including Codex. No external proprietary project source is claimed as original work.

## Prototype limitations
No public hosted service, authentication, shared database, or production rate limiting is included. Mobile behavior and research accuracy need further validation. Do not expose this development server as a production deployment unchanged.
