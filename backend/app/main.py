"""
main.py
--------
The entry point of the backend. This is the file you run to start the server:

    uvicorn app.main:app --reload

What happens here:
1. Load environment variables from the .env file (for GROQ_API_KEY etc.)
2. Create the FastAPI app instance.
3. Enable CORS so our Next.js frontend (running on a different port/domain)
   is allowed to call this API from the browser.
4. On startup, make sure all tables exist (safety net if seed.py wasn't run).
5. Register every router so their routes become part of this app.

Visiting /docs once the server is running gives you FastAPI's automatic
interactive API documentation (Swagger UI).
"""

# Load .env file FIRST -- before any other import that might read env variables.
# This is the fix for GROQ_API_KEY not being picked up: dotenv must load
# before routers/ai.py reads os.environ.get("GROQ_API_KEY").
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import meetings, action_items, tags, search, export, ai

# Ensures tables exist even if seed.py was never run (e.g. first deploy).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fireflies Clone API",
    description="Backend API for a Fireflies.ai-style meeting notes & transcription platform.",
    version="1.0.0",
)

# Allow the Next.js frontend (any localhost port during dev, plus the
# deployed frontend URL) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for an assignment-scale app, open CORS is fine;
                          # in production you'd restrict this to your real frontend domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(tags.router)
app.include_router(search.router)
app.include_router(export.router)
app.include_router(ai.router)


@app.get("/")
def root():
    """Simple health check / landing route for the API root."""
    return {"status": "ok", "message": "Fireflies Clone API is running. Visit /docs for API documentation."}
