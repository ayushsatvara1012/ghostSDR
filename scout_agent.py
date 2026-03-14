import os
import requests
import json
import re
from groq import Groq
# from anthropic import Anthropic
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

# --- Data Contracts ---
class SalesTrigger(BaseModel):
    trigger_type: str = Field(description="e.g. Hiring, New Tech Stack, Pain Point")
    evidence: str = Field(description="The specific keyword or phrase from the snippet")
    relevance_score: int = Field(description="1-10 score of how strong this lead is")

class ScoutOutput(BaseModel):
    full_name: str
    linkedin_url: str
    current_headline: str
    key_insights: List[SalesTrigger]
    suggested_opening_line: str
    
# --- The Scout Class ---
class ScoutAgent:
    def __init__(self):
        self.serper_key = os.getenv("SERPER_API_KEY") 
        # anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        # if anthropic_key and self.serper_key:
        #     print(f"✅ Anthropic Brain & Serper OSINT connected.")
        # else:
        #     print("❌ API Keys missing from .env!")
            
        # self.anthropic = Anthropic(api_key=anthropic_key)

        # --- GROQ SETUP (ACTIVE) ---
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and self.serper_key:
            print("✅ Groq (Llama 3) Brain & Serper OSINT connected.")
        else:
            print("❌ API Keys missing from .env!")
            
        self.client = Groq(api_key=groq_key)

    def discover_leads(self, keywords: str, limit: int = 3):
        """Hunts for LinkedIn leads using Google Dorking."""
        print(f"🎯 Hunting for leads matching: {keywords}")
        
        if not self.serper_key:
            raise ValueError("SERPER_API_KEY is missing.")

        # Google Dork: Forces search to only look at LinkedIn profiles
        dork_query = f"site:linkedin.com/in/ {keywords}"
        
        url = "https://google.serper.dev/search"
        payload = json.dumps({"q": dork_query, "num": limit})
        headers = {
            'X-API-KEY': self.serper_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(url, headers=headers, data=payload, timeout=15)
        
        if response.status_code != 200:
            raise ValueError(f"OSINT Search Error: {response.text}")
            
        organic_results = response.json().get("organic", [])
        
        leads = []
        for result in organic_results:
            raw_title = result.get("title", "")
            clean_name = raw_title.split(" - ")[0].strip()
            
            leads.append({
                "full_name": clean_name,
                "linkedin_url": result.get("link", ""),
                "headline": result.get("snippet", "") # Google's text snippet
            })
            
        return leads

    def analyze_profile(self, lead_data: dict, sdr_context: Optional[dict] = None) -> ScoutOutput:
        """The 'Brain' logic that qualifies the lead."""
        
        system_context = "You are an elite Sales Development Representative."
        
        if sdr_context:
            system_context += f"""
            You work for a company called '{sdr_context.get("company_name", "Our Company")}'.
            Your Value Proposition is: {sdr_context.get("value_proposition", "")}
            Your Target Audience is: {sdr_context.get("target_audience", "")}
            
            When writing the suggested email opening line for this lead, you MUST craft it specifically 
            touting your company's value proposition against their publicly available LinkedIn data. 
            Write in a {sdr_context.get("tone_of_voice", "Professional")} tone. Do not write a full email, 
            only write a single opening sentence.
            """

        prompt = f"""
        {system_context}
        
        Analyze this Google OSINT snippet of a LinkedIn profile and qualify the lead.
        
        DATA:
        {json.dumps(lead_data)}
        
        Task:
        1. Extract their likely job title from the snippet.
        2. Identify why they are a good target based on the data.
        3. Write a 1-sentence opening line for an email to them using your SDR Context rules.

        Return ONLY a JSON object matching this schema:
        {{
            "full_name": "{lead_data['full_name']}",
            "linkedin_url": "{lead_data['linkedin_url']}",
            "current_headline": "string (inferred title)",
            "key_insights": [
                {{
                    "trigger_type": "string",
                    "evidence": "string",
                    "relevance_score": 10
                }}
            ],
            "suggested_opening_line": "string"
        }}
        """

        try:
            print(f"🧠 Qualifying: {lead_data['full_name']}...")
            # response = self.anthropic.messages.create(
            #     model="claude-sonnet-4-6", 
            #     max_tokens=800,
            #     temperature=0.2, # Added slightly more temperature for line creativity
            #     messages=[{"role": "user", "content": prompt}],
            # )
            
            # content = response.content[0].text
            # json_match = re.search(r'\{.*\}', content, re.DOTALL)
            # raw_json = json.loads(json_match.group(0)) if json_match else json.loads(content)
                
            # return ScoutOutput(**raw_json)

            # --- GROQ (LLAMA 3) IMPLEMENTATION [ACTIVE] ---
            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant", 
                messages=[
                    {"role": "system", "content": system_context},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"} 
            )
            content = response.choices[0].message.content
            raw_json = json.loads(content)

            return ScoutOutput(**raw_json)
            
        except Exception as e:
            print(f"⚠️ AI Analysis Failed for {lead_data['full_name']}: {str(e)}")
            # Skip broken leads gracefully
            return None