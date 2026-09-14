# ReadyFor

An AI pre-departure assistant that helps you decide **when to leave, how to get there, what to wear, and what to bring**.

## Features
- Driving, transit, and walking routes, with arrival buffers.
- Weather-based clothing suggestions and checkable packing lists.
- Source-linked research for government-service preparation, with uncertainty labeled.
- Calendar reminder downloads, email drafts, and searchable on-device history.

## Built with
Expo · React Native · TypeScript · Python · FastAPI · Strands Agents SDK · Amazon Nova / Bedrock · Amazon Location Service · Tavily · Open-Meteo

Strands and Nova provide everyday advice. A separate Nova/Tavily flow researches official instructions. Python handles departure calculations.

## Run locally
Requires Python 3.11–3.13, Poetry, Node.js 22.13+, and AWS credentials with Nova and Amazon Location Service access in `us-east-1`.

**Backend — from the project root:**
```sh
poetry install
export AWS_PROFILE=readyfor
export AWS_DEFAULT_REGION=us-east-1
export TAVILY_API_KEY='YOUR_KEY'
poetry run uvicorn readyfor.api:app --reload
```
Configure and sign in to your AWS profile first. Tavily is needed for official-source research. The default model is `us.amazon.nova-2-lite-v1:0`; your account needs access and sufficient quota. Provider charges may apply. Never commit credentials.

**Frontend — in another terminal:**
```sh
cd frontend
npm ci
npm run web
```
Open **http://localhost:8081**. API docs: **http://127.0.0.1:8000/docs**.

Enter an activity, select a future appointment time and destination, and add your location for routing. Then select **Prepare Me**.

## Current scope
Local web prototype; mobile testing and hosting are next. Physical phones need a reachable backend address—the frontend currently uses localhost. History stays on the device. Web reminders require calendar import, and email opens a draft for you to send. Research may be incomplete; follow source conditions and confirmation notices.

## License and credits
MIT — see [LICENSE](LICENSE). Includes an Expo starter; its notice remains in `frontend/LICENSE`. Built with open-source dependencies and AI coding assistance for the Agents for Humans hackathon.
