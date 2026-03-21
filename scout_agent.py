import os
import re
import json
import time
import requests
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from ai_brain import AIBrain

from signal_collectors import (
    RawSignal,
    SignalHarvester,
    YouTubeCollector,
    PodcastCollector,
    RedditCollector,
    NewsCollector,
)

load_dotenv()

# ──────────────────────────────────────────────────────────────────
# PYDANTIC DATA CONTRACTS  (frontend TypeScript interfaces mirror these)
# ──────────────────────────────────────────────────────────────────

class IntentSignal(BaseModel):
    platform: str
    signal_type: str
    source_url: str
    source_title: str
    raw_quote: str
    author_name: str
    author_context: str
    published_at: str
    keywords_matched: List[str]
    intent_score: int                        # 0-100
    timestamp_in_content: Optional[str] = None


class PainPoint(BaseModel):
    description: str
    evidence_source: str                     # "platform:source_title"
    urgency: str                             # "immediate" | "near-term" | "strategic"


class LeadProfile(BaseModel):
    full_name: str
    company_name: str
    title: str
    linkedin_url: Optional[str] = None
    email_guess: Optional[str] = None
    company_website: Optional[str] = None
    industry: str
    company_size_est: str                    # "1-10" | "11-50" | "51-200" | "200-1000" | "1000+"
    location: str
    intent_signals: List[IntentSignal]
    aggregate_intent_score: int              # 0-100
    priority_tier: str                       # "A" | "B" | "C"
    pain_points: List[PainPoint]
    suggested_opening_line: str
    suggested_hook: str                      # 5 words max
    best_channel: str                        # "LinkedIn DM" | "Email" | "Reddit DM" | "Phone"
    follow_up_angle: str
    platforms_found_on: List[str]
    total_signals_found: int


# ──────────────────────────────────────────────────────────────────
# SIGNAL HARVESTER
# ──────────────────────────────────────────────────────────────────

class SignalHarvester:
    def __init__(self):
        serper_key = os.getenv("SERPER_API_KEY", "")
        listennotes_key = os.getenv("LISTENNOTES_API_KEY")
        self.youtube = YouTubeCollector(serper_key=serper_key)
        self.podcast = PodcastCollector(listennotes_key=listennotes_key)
        self.reddit = RedditCollector()
        self.news = NewsCollector(serper_key=serper_key)

    def harvest(
        self,
        keywords: str,
        industry_hint: str = "general",
        company_name: str = "",
        platforms: Optional[List[str]] = None,
    ) -> List[RawSignal]:
        """Harvest signals from all enabled platforms. A single platform failure won't crash the hunt."""
        enabled = set(platforms or ["youtube", "reddit", "news", "podcast"])

        # Build keyword list for phrase matching
        keyword_list = [k.strip() for k in keywords.replace(",", " ").split() if len(k.strip()) > 2]
        if company_name:
            keyword_list.append(company_name)

        all_signals: List[RawSignal] = []

        if "youtube" in enabled:
            try:
                sigs = self.youtube.collect(keywords, keyword_list, max_videos=4)
                all_signals.extend(sigs)
                print(f"  📺 YouTube: {len(sigs)} signals")
            except Exception as e:
                print(f"  ⚠️  YouTube collector failed: {e}")

        if "reddit" in enabled:
            try:
                sigs = self.reddit.collect(keywords, keyword_list, industry_hint=industry_hint)
                all_signals.extend(sigs)
                print(f"  💬 Reddit: {len(sigs)} signals")
            except Exception as e:
                print(f"  ⚠️  Reddit collector failed: {e}")

        if "news" in enabled:
            try:
                sigs = self.news.collect(keywords, keyword_list)
                all_signals.extend(sigs)
                print(f"  📰 News: {len(sigs)} signals")
            except Exception as e:
                print(f"  ⚠️  News collector failed: {e}")

        if "podcast" in enabled:
            try:
                sigs = self.podcast.collect(keywords, keyword_list)
                all_signals.extend(sigs)
                print(f"  🎙️  Podcast: {len(sigs)} signals")
            except Exception as e:
                print(f"  ⚠️  Podcast collector failed: {e}")

        print(f"  🔭 Total signals harvested: {len(all_signals)}")
        return all_signals


# ──────────────────────────────────────────────────────────────────
# LINKEDIN RESOLVER
# ──────────────────────────────────────────────────────────────────

class LinkedInResolver:
    def __init__(self, serper_key: str):
        self.serper_key = serper_key

    def find_profiles_for_keywords(self, keywords: str, limit: int = 3) -> List[dict]:
        """Google Dork LinkedIn profiles matching keywords."""
        try:
            dork_query = f"site:linkedin.com/in/ {keywords}"
            response = requests.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": self.serper_key, "Content-Type": "application/json"},
                json={"q": dork_query, "num": limit + 2},
                timeout=15,
            )
            if response.status_code != 200:
                print(f"  ⚠️  LinkedIn resolver error: {response.status_code}")
                return []

            organic = response.json().get("organic", [])
            profiles = []
            for result in organic[:limit]:
                name = result.get("title", "").split(" - ")[0].strip()
                if not name:
                    continue
                profiles.append({
                    "full_name": name,
                    "linkedin_url": result.get("link", ""),
                    "headline": result.get("snippet", ""),
                })
            return profiles
        except Exception as e:
            print(f"  ⚠️  LinkedIn resolver failed: {e}")
            return []

# ──────────────────────────────────────────────────────────────────
# SCOUT AGENT  (public API consumed by main.py)
# ──────────────────────────────────────────────────────────────────

class ScoutAgent:
    def __init__(self):
        serper_key = os.getenv("SERPER_API_KEY", "")
        self.harvester = SignalHarvester()
        self.resolver = LinkedInResolver(serper_key=serper_key)
        self.brain = AIBrain()
        print("✅ Ghost SDR Scout Agent v3.0")

    # ── v3 Primary Method ──────────────────────────────────────────

    def hunt(
        self,
        keywords: str,
        sdr_context: dict,
        industry_hint: str = "general",
        max_leads: int = 5,
        platforms: Optional[List[str]] = None,
    ) -> List[LeadProfile]:
        """Full v3 multi-platform hunt: harvest signals → resolve LinkedIn → qualify with Claude."""
        print(f"\n🎯 [v3 Hunt] Keywords: {keywords}")

        # Step 1: Harvest signals from all enabled platforms
        raw_signals = self.harvester.harvest(
            keywords=keywords,
            industry_hint=industry_hint,
            company_name=sdr_context.get("company_name", ""),
            platforms=platforms,
        )

        # Step 2: Find LinkedIn profiles via Google dorking
        linkedin_profiles = self.resolver.find_profiles_for_keywords(keywords, limit=max_leads)
        print(f"  🔗 LinkedIn profiles found: {len(linkedin_profiles)}")

        qualified_leads: List[LeadProfile] = []

        # Step 3: Qualify each LinkedIn profile with Claude
        for profile in linkedin_profiles:
            time.sleep(0.5)
            lead = self.brain.score_and_qualify(profile, raw_signals, sdr_context)
            if lead:
                qualified_leads.append(lead)

        # Step 4: Synthesize leads from top Reddit buying-intent signals (max 2)
        reddit_buying_signals = [
            s for s in raw_signals
            if s.platform == "reddit" and s.signal_type == "buying_intent"
        ]
        for signal in reddit_buying_signals[:2]:
            if len(qualified_leads) >= max_leads:
                break
            time.sleep(0.5)
            reddit_lead = self.brain.synthesize_reddit_lead(signal, sdr_context)
            if reddit_lead:
                qualified_leads.append(reddit_lead)

        # Sort by aggregate intent score descending
        qualified_leads.sort(key=lambda x: x.aggregate_intent_score, reverse=True)

        return qualified_leads

    # ── Backward-compat Methods (used by old /api/research route) ──

    def discover_leads(self, keywords: str, limit: int = 3) -> List[dict]:
        """Backward compat: Google dorking only, returns raw dicts."""
        return self.resolver.find_profiles_for_keywords(keywords, limit=limit)

    def analyze_profile(self, lead_data: dict, sdr_context: Optional[dict] = None) -> Optional[LeadProfile]:
        """Backward compat: qualify a single profile with minimal signals."""
        signals = []
        try:
            # Try to get at least some news/reddit signals
            keyword_str = lead_data.get("headline", "") or lead_data.get("full_name", "")
            if keyword_str:
                signals = self.harvester.harvest(keyword_str, platforms=["news", "reddit"])
        except Exception:
            pass

        if not sdr_context:
            sdr_context = {
                "company_name": "Unknown Company",
                "value_proposition": "Our solution helps solve your business challenges.",
                "target_audience": "Business professionals",
                "tone_of_voice": "Professional and direct",
            }

        return self.brain.score_and_qualify(lead_data, signals, sdr_context)

    def research_url(self, linkedin_url: str, sdr_context: Optional[dict] = None) -> Optional[LeadProfile]:
        """Backward compat: enrich a single LinkedIn URL."""
        # Parse name from URL slug
        slug = linkedin_url.rstrip("/").split("/")[-1]
        name = slug.replace("-", " ").title()

        lead_data = {
            "full_name": name,
            "linkedin_url": linkedin_url,
            "headline": f"Professional at LinkedIn — {slug}",
        }
        return self.analyze_profile(lead_data, sdr_context)