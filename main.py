from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from scout_agent import ScoutAgent
from supabase import create_client, Client
import os

app = FastAPI(title="Ghost SDR Engine", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scout = ScoutAgent()

supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Supabase keys missing from .env!")
else:
    print("✅ Supabase Database connected.")
    
supabase: Client = create_client(supabase_url, supabase_key)

# --- Request Schemas ---
class ResearchRequest(BaseModel):
    linkedin_url: str

class HuntRequest(BaseModel):
    keywords: str
    user_id: str

# --- Route 1: The Enricher (URL -> Data) ---
@app.post("/api/research")
async def run_research(request: ResearchRequest):
    """(Your existing code) Analyzes a single known LinkedIn URL."""
    try:
        raw_json = scout.discover_leads(request.linkedin_url, limit=1)
        if not raw_json:
            raise ValueError("No data found for this URL.")
        # Pass empty context for single research requests (generic fallback)
        result = scout.analyze_profile(raw_json[0])
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Route 2: The SaaS Hunter (Credit Check -> Hunt -> Save -> Bill) ---
@app.post("/api/hunt")
async def run_hunt(request: HuntRequest):
    """
    Production route: Validates credits and profile, hunts leads via Google Dorking, 
    qualifies via Claude 4.6 against the SDR profile, saves to Supabase, and deducts 1 credit.
    """
    try:
        print(f"\n🚀 [User: {request.user_id}] Hunting for: {request.keywords}")
        
        # --- STEP 1A: Credit Check ---
        profile_res = supabase.table("profiles").select("api_credits").eq("id", request.user_id).execute()
        
        if not profile_res.data:
            raise ValueError("User profile not found in database. Are you authenticated?")
            
        current_credits = profile_res.data[0]['api_credits']
        if current_credits < 1:
            raise ValueError("Insufficient API credits. Please upgrade your subscription tier.")

        # --- STEP 1B: SDR Context Validation ---
        sdr_res = supabase.table("sdr_profiles").select("*").eq("user_id", request.user_id).execute()
        if not sdr_res.data:
            raise ValueError("Missing SDR Profile. Please go to Settings and define your Company Name and Value Proposition before hunting.")
        
        sdr_context = sdr_res.data[0]

        # --- STEP 2: The Hunt (OSINT + AI) ---
        raw_leads = scout.discover_leads(request.keywords, limit=3)
        if not raw_leads:
            raise ValueError(f"No public profiles found matching '{request.keywords}'")

        qualified_leads = []
        for lead in raw_leads:
            # Pass the user's specific SDR context to the Brain
            analysis = scout.analyze_profile(lead, sdr_context)
            if analysis:  
                qualified_leads.append(analysis)
                
        if not qualified_leads:
            raise ValueError("AI failed to qualify any leads from the search results.")

        # --- STEP 3: Save the Campaign ---
        campaign_data = {
            "user_id": request.user_id,
            "search_query": request.keywords,
            "status": "completed"
        }
        campaign_res = supabase.table("campaigns").insert(campaign_data).execute()
        campaign_id = campaign_res.data[0]['id']

        # --- STEP 4: Save the Leads ---
        leads_to_insert = []
        for ql in qualified_leads:
            max_score = max([insight.relevance_score for insight in ql.key_insights]) if ql.key_insights else 0
            
            leads_to_insert.append({
                "campaign_id": campaign_id,
                "full_name": ql.full_name,
                "linkedin_url": ql.linkedin_url,
                "headline": ql.current_headline,
                "relevance_score": max_score,
                "suggested_opening_line": ql.suggested_opening_line,
                "key_insights": [insight.model_dump() for insight in ql.key_insights],
                "status": "drafted"
            })
            
        supabase.table("leads").insert(leads_to_insert).execute()

        # --- STEP 5: Deduct the Credit ---
        new_credits = current_credits - 1
        supabase.table("profiles").update({"api_credits": new_credits}).eq("id", request.user_id).execute()

        print(f"✅ Campaign saved! {new_credits} credits remaining.")

        # --- STEP 6: Return Data to Frontend ---
        return {
            "campaign_id": campaign_id,
            "query": request.keywords,
            "leads_found": len(qualified_leads),
            "credits_remaining": new_credits,
            "results": qualified_leads
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ Server Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing campaign.")

@app.get("/")
async def root():
    return {"status": "Ghost SDR API v2 is running online with Context Injection."}