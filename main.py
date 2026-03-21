import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from scout_agent import ScoutAgent

load_dotenv()

# ──────────────────────────────────────────────────────────────────
# STARTUP HEALTH CHECKS
# ──────────────────────────────────────────────────────────────────

def check_env():
    checks = {
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        "SERPER_API_KEY":    os.getenv("SERPER_API_KEY"),
        "SUPABASE_URL":      os.getenv("SUPABASE_URL"),
        "SUPABASE_KEY":      os.getenv("SUPABASE_KEY"),
    }
    for name, value in checks.items():
        if value:
            print(f"✅ {name} connected.")
        else:
            print(f"❌ {name} missing — app will not function correctly!")

    # Optional key — just warn
    listennotes = os.getenv("LISTENNOTES_API_KEY")
    if listennotes:
        print("✅ LISTENNOTES_API_KEY connected (podcast signals enabled).")
    else:
        print("⚠️  LISTENNOTES_API_KEY not set — podcast signals will be skipped.")


check_env()

# ──────────────────────────────────────────────────────────────────
# APP SETUP
# ──────────────────────────────────────────────────────────────────

app = FastAPI(title="Ghost SDR Engine", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Tighten to specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (service_role key — bypasses RLS for backend writes)
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# ScoutAgent singleton (initialises collectors + Anthropic client)
scout = ScoutAgent()


# ──────────────────────────────────────────────────────────────────
# REQUEST SCHEMAS
# ──────────────────────────────────────────────────────────────────

class HuntRequest(BaseModel):
    keywords: str
    user_id: str
    industry_hint: Optional[str] = "general"
    platforms: Optional[List[str]] = None
    max_leads: Optional[int] = 5


class ResearchRequest(BaseModel):
    linkedin_url: str


# ──────────────────────────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "Ghost SDR API v3.0",
        "platforms": ["youtube", "reddit", "news", "podcast"],
        "provider": scout.brain.provider,
        "model": scout.brain.model,
    }


@app.post("/api/hunt")
async def run_hunt(request: HuntRequest):
    """
    v3 Primary Route:
    Credit check → SDR Context → Multi-platform signal harvest + LinkedIn resolve
    → Claude qualification → Save campaign + leads → Deduct credit → Return results.
    """
    try:
        print(f"\n🚀 [Hunt] User: {request.user_id} | Keywords: {request.keywords}")

        # ── STEP 1: Credit Check ────────────────────────────────────
        user_res = supabase.table("users").select("api_credits").eq("id", request.user_id).execute()
        if not user_res.data:
            raise ValueError("User profile not found. Are you authenticated?")
        current_credits = user_res.data[0]["api_credits"]
        if current_credits < 1:
            raise ValueError("Insufficient API credits. Please upgrade your subscription tier.")

        # ── STEP 2: SDR Context ─────────────────────────────────────
        sdr_res = supabase.table("sdr_profiles").select("*").eq("user_id", request.user_id).execute()
        if not sdr_res.data:
            raise ValueError(
                "Missing SDR Profile. Go to Settings and define your Company Name and "
                "Value Proposition before hunting."
            )
        sdr_context = sdr_res.data[0]

        # ── STEP 3: Hunt (signals + LinkedIn + Claude) ──────────────
        qualified_leads = scout.hunt(
            keywords=request.keywords,
            sdr_context=sdr_context,
            industry_hint=request.industry_hint or "general",
            max_leads=request.max_leads or 5,
            platforms=request.platforms,
        )
        if not qualified_leads:
            raise ValueError(
                f"No leads qualified for '{request.keywords}'. "
                "Try broader keywords or different platforms."
            )

        # ── STEP 4: Save Campaign ──────────────────────────────────
        campaign_res = supabase.table("campaigns").insert({
            "user_id": request.user_id,
            "search_query": request.keywords,
            "status": "completed",
        }).execute()
        campaign_id = campaign_res.data[0]["id"]

        # ── STEP 5: Save Leads ─────────────────────────────────────
        leads_to_insert = []
        for lead in qualified_leads:
            leads_to_insert.append({
                "campaign_id": campaign_id,
                "full_name": lead.full_name,
                "linkedin_url": lead.linkedin_url,
                "headline": lead.title,
                "relevance_score": lead.aggregate_intent_score // 10,  # 0-10 for legacy compat
                "suggested_opening_line": lead.suggested_opening_line,
                "key_insights": [sig.model_dump() for sig in lead.intent_signals],
                "status": "drafted",
            })
        supabase.table("leads").insert(leads_to_insert).execute()

        # ── STEP 6: Deduct Credit ──────────────────────────────────
        new_credits = current_credits - 1
        supabase.table("users").update({"api_credits": new_credits}).eq("id", request.user_id).execute()
        print(f"✅ Campaign {campaign_id} saved. {new_credits} credits remaining.")

        # ── STEP 7: Return Results ─────────────────────────────────
        total_signals = sum(len(lead.intent_signals) for lead in qualified_leads)
        platforms_searched = list(set(
            sig.platform
            for lead in qualified_leads
            for sig in lead.intent_signals
        )) or (request.platforms or ["youtube", "reddit", "news", "podcast", "linkedin"])

        # ── Harvest warning if signals came back empty ────────────
        harvest_warning = None
        if total_signals == 0:
            harvest_warning = (
                "Signal harvest returned 0 results. "
                "Check SERPER_API_KEY is valid and has remaining quota. "
                "Leads were qualified from LinkedIn data only."
            )
            print(f"⚠️  WARNING: {harvest_warning}")

        return {
            "campaign_id": campaign_id,
            "query": request.keywords,
            "platforms_searched": platforms_searched,
            "total_signals_harvested": total_signals,
            "leads_found": len(qualified_leads),
            "credits_remaining": new_credits,
            "harvest_warning": harvest_warning,
            "results": [lead.model_dump() for lead in qualified_leads],
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ Server Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing campaign.")


@app.post("/api/research")
async def run_research(request: ResearchRequest):
    """Backward-compat route: enriches a single LinkedIn URL."""
    try:
        result = scout.research_url(request.linkedin_url)
        if not result:
            raise ValueError("Unable to enrich this URL. Check it's a valid LinkedIn profile.")
        return result.model_dump()
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ Research Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during URL enrichment.")