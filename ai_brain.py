"""
Ghost SDR — Multi-Provider AI Brain (ai_brain.py)
Supports: Gemini (free), Groq (free), Mistral (limited free), Anthropic (paid)
Switch providers by setting MODEL_PROVIDER in .env
No other code changes needed when switching.

Usage:
  from ai_brain import AIBrain
  brain = AIBrain()  # reads MODEL_PROVIDER from .env automatically
"""

import os
import json
import re
import time
import warnings
from typing import List, Optional
from dotenv import load_dotenv

# Suppress Google SDK Python 3.9 deprecation warnings (cosmetic only)
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

load_dotenv()


# ─── Provider Configuration ───────────────────────────────────────────────────

PROVIDER_MODELS = {
    "gemini":    "gemini-1.5-flash",
    "groq":      "llama-3.3-70b-versatile",
    "ollama":    os.getenv("OLLAMA_MODEL", "llama3.2"),
    "anthropic": "claude-sonnet-4-6",
}

PROVIDER_FREE_LIMITS = {
    "gemini":    "1,500 req/day free — RECOMMENDED",
    "groq":      "14,400 req/day free — fastest",
    "ollama":    "Local LLM — free, unlimited",
    "anthropic": "Paid per token — best quality",
}

PROVIDER_ENV_KEYS = {
    "gemini":    "GEMINI_API_KEY",
    "groq":      "GROQ_API_KEY",
    "ollama":    "OLLAMA_BASE_URL", # Ollama uses base URL instead of API key
    "anthropic": "ANTHROPIC_API_KEY",
}


# ─── AIBrain ──────────────────────────────────────────────────────────────────

class AIBrain:
    """
    Drop-in replacement for the original AIBrain class.
    Reads MODEL_PROVIDER from .env to select provider.
    All public methods are identical to the original AIBrain.
    """

    def __init__(self):
        self.provider = os.getenv("MODEL_PROVIDER", "gemini").lower().strip()

        # Validate provider
        if self.provider not in PROVIDER_MODELS:
            print(
                f"  ⚠️  Unknown MODEL_PROVIDER='{self.provider}' — "
                f"valid options: {list(PROVIDER_MODELS.keys())}"
            )
            print(f"  ⚠️  Defaulting to gemini")
            self.provider = "gemini"

        self.model = PROVIDER_MODELS[self.provider]
        self._init_client()

        print(f"✅ AI Brain: {self.provider.upper()}")
        print(f"   Model: {self.model}")
        print(f"   Limit: {PROVIDER_FREE_LIMITS[self.provider]}")

    # ── Client Initialization ─────────────────────────────────────────────────

    def _init_client(self):
        """Initialize the correct SDK client based on provider."""

        if self.provider != "ollama":
            env_key_name = PROVIDER_ENV_KEYS[self.provider]
            api_key = os.getenv(env_key_name)

            if not api_key:
                raise EnvironmentError(
                    f"{env_key_name} is missing from .env\n"
                    f"  Current provider: MODEL_PROVIDER={self.provider}\n"
                    f"  Get a free key:\n"
                    f"    Gemini:    https://aistudio.google.com/app/apikey\n"
                    f"    Groq:      https://console.groq.com\n"
                    f"    Anthropic: https://console.anthropic.com"
                )
        else:
            api_key = None # Not used for Ollama

        if self.provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel(
                model_name=self.model,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 2500,
                    # Forces clean JSON output — no markdown fences
                    "response_mime_type": "application/json",
                },
            )

        elif self.provider == "groq":
            from groq import Groq
            self.client = Groq(api_key=api_key)

        elif self.provider == "ollama":
            import ollama
            self.client = ollama.Client(host=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))

        elif self.provider == "anthropic":
            from anthropic import Anthropic
            self.client = Anthropic(api_key=api_key)

    # ── Unified LLM Call ──────────────────────────────────────────────────────

    def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2500
    ) -> str:
        """
        Single entry point for all LLM calls.
        Handles the different API shapes of each provider.
        Always returns raw string content.
        """

        if self.provider == "gemini":
            # Gemini takes a single string — combine system + user
            combined_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = self.client.generate_content(combined_prompt)
            return response.text

        elif self.provider == "groq":
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=max_tokens,
                # JSON mode — requires the word "JSON" in system prompt
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content

        elif self.provider == "ollama":
            response = self.client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                options={
                    "temperature": 0.2,
                    "num_predict": max_tokens,
                },
                format="json", # Forces JSON mode if the model supports it
            )
            return response["message"]["content"]

        elif self.provider == "anthropic":
            combined_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": combined_prompt}]
            )
            return response.content[0].text

    # ── JSON Cleaning ─────────────────────────────────────────────────────────

    def _clean_json(self, content: str) -> str:
        """
        Strip markdown fences and extract clean JSON.
        Different models have different habits — this handles all of them.
        """
        # Remove markdown code fences
        content = re.sub(r"```(?:json)?|```", "", content).strip()

        # Remove any text before the first opening brace
        if "{" in content:
            content = content[content.index("{"):]

        # Remove any text after the last closing brace
        if "}" in content:
            content = content[:content.rindex("}") + 1]

        return content.strip()

    # ── Field Validation ──────────────────────────────────────────────────────

    def _validate_and_fill(self, raw: dict, signals: list) -> dict:
        """
        Ensure all critical fields are non-empty after any provider response.
        Applied universally — every provider can return partial results.
        """

        def is_empty(val) -> bool:
            """Check if a value is None, empty string, or whitespace."""
            return val is None or str(val).strip() == ""

        # suggested_hook — must be 5 words max, never empty
        if is_empty(raw.get("suggested_hook")):
            raw["suggested_hook"] = "Cut costs, ship faster"

        # best_channel — must be one of the valid options
        valid_channels = {
            "LinkedIn DM", "Email", "Reddit DM", "Twitter DM", "Phone"
        }
        if raw.get("best_channel") not in valid_channels:
            raw["best_channel"] = "LinkedIn DM"

        # follow_up_angle — must be specific, never empty
        if is_empty(raw.get("follow_up_angle")):
            raw["follow_up_angle"] = "Share a relevant case study"

        # company_size_est — must be exact enum value
        valid_sizes = {"1-10", "11-50", "51-200", "200-1000", "1000+"}
        if raw.get("company_size_est") not in valid_sizes:
            raw["company_size_est"] = "11-50"

        # priority_tier — must be A, B, or C
        if raw.get("priority_tier") not in ["A", "B", "C"]:
            score = raw.get("aggregate_intent_score", 40)
            if not isinstance(score, (int, float)):
                score = 40
            raw["priority_tier"] = (
                "A" if score >= 80 else
                "B" if score >= 50 else
                "C"
            )

        # aggregate_intent_score — must be integer 0-100
        score = raw.get("aggregate_intent_score")
        if not isinstance(score, int) or score < 0 or score > 100:
            raw["aggregate_intent_score"] = 40

        # pain_points — must be non-empty list
        if not isinstance(raw.get("pain_points"), list) or len(raw["pain_points"]) == 0:
            raw["pain_points"] = [{
                "description": "Inferred from LinkedIn profile — no direct signal captured",
                "evidence_source": "linkedin:headline",
                "urgency": "strategic"
            }]

        # intent_signals — must be a list (can be empty)
        if not isinstance(raw.get("intent_signals"), list):
            raw["intent_signals"] = []

        # platforms_found_on — must be non-empty list
        if not isinstance(raw.get("platforms_found_on"), list) or len(raw["platforms_found_on"]) == 0:
            raw["platforms_found_on"] = (
                list(set(s.platform for s in signals))
                if signals else ["linkedin"]
            )

        # total_signals_found — must be integer
        if not isinstance(raw.get("total_signals_found"), int):
            raw["total_signals_found"] = len(signals)

        # company_name — must not be empty
        if is_empty(raw.get("company_name")):
            raw["company_name"] = "Independent"

        # title — must not be empty
        if is_empty(raw.get("title")):
            raw["title"] = "Professional"

        # industry — must not be empty
        if is_empty(raw.get("industry")):
            raw["industry"] = "Technology"

        # location — must not be empty
        if is_empty(raw.get("location")):
            raw["location"] = "Unknown"

        # suggested_opening_line — must not be empty or generic
        opener = raw.get("suggested_opening_line", "")
        banned_openers = [
            "hi ", "hello ", "i hope", "i came across",
            "reaching out", "touching base", "i noticed your profile"
        ]
        if is_empty(opener) or any(opener.lower().startswith(b) for b in banned_openers):
            if is_empty(opener):
                raw["suggested_opening_line"] = (
                    f"Noticed your profile matches exactly who we help at "
                    f"{raw.get('company_name', 'your company')} — "
                    f"worth a quick conversation."
                )

        return raw

    # ── Build Prompts ─────────────────────────────────────────────────────────

    def _build_system_prompt(self) -> str:
        """
        System prompt sent to all providers.
        Must contain the word JSON for Groq/Mistral JSON mode requirement.
        """
        return (
            "You are an elite B2B Sales Intelligence AI. "
            "You always respond with valid JSON only. "
            "No markdown. No explanation. No text before or after the JSON object. "
            "Every field in the requested JSON schema is required and must be non-empty."
        )

    def _build_qualification_prompt(
        self,
        lead_data: dict,
        signals: list,
        sdr_context: Optional[dict],
        company_name: str,
    ) -> str:
        """Build the user prompt for lead qualification."""

        signals_json = json.dumps(
            [s.to_dict() for s in signals[:10]], indent=2
        ) if signals else "[]"

        if sdr_context and sdr_context.get("company_name"):
            sdr_block = (
                f"YOUR COMPANY CONTEXT — USE THIS FOR EVERY FIELD:\n"
                f"Company Name: {sdr_context.get('company_name', '')}\n"
                f"What You Sell: {sdr_context.get('value_proposition', '')}\n"
                f"Who Buys From You: {sdr_context.get('target_audience', '')}\n"
                f"Writing Tone: {sdr_context.get('tone_of_voice', 'Direct and specific')}\n"
            )
        else:
            sdr_block = "No SDR profile configured. Use generic software development positioning.\n"

        return f"""{sdr_block}

PROSPECT DATA:
Name: {lead_data.get("full_name", "Unknown")}
LinkedIn URL: {lead_data.get("linkedin_url", "N/A")}
LinkedIn Headline: {lead_data.get("headline", "No headline available")}

MULTI-PLATFORM INTENT SIGNALS ({len(signals)} signals found):
{signals_json}

Return this exact JSON object. Every field is required. No field may be empty or null
unless the schema explicitly allows null. If you cannot determine a value, make your
best inference from available context. Return ONLY the JSON. Nothing else.

{{
  "full_name": "{lead_data.get("full_name", "Unknown")}",
  "company_name": "Extract from headline or signals. If truly unknown: Independent",
  "title": "Their job title. Examples: CTO, Founder, VP Engineering, Head of Procurement",
  "linkedin_url": "{lead_data.get("linkedin_url", "")}",
  "email_guess": "Guess format first.last@company.com if company known, else null",
  "company_website": "Guess https://companyname.com if company known, else null",
  "industry": "One of: B2B SaaS / FinTech / HealthTech / E-commerce / Manufacturing / Pharma / Other",
  "company_size_est": "MUST be exactly one of: 1-10 / 11-50 / 51-200 / 200-1000 / 1000+",
  "location": "City and Country. If unknown: Unknown",
  "intent_signals": [
    {{
      "platform": "youtube or reddit or podcast or news or linkedin",
      "signal_type": "buying_intent or pain_point or hiring or expansion or funding",
      "source_url": "Full URL from signal data",
      "source_title": "Title of the video, post, or article",
      "raw_quote": "EXACT text from the signal that triggered this — copy it verbatim",
      "author_name": "Who said or wrote it",
      "author_context": "Their role, channel name, or subreddit",
      "published_at": "YYYY-MM-DD",
      "keywords_matched": ["keyword1", "keyword2"],
      "intent_score": 80,
      "timestamp_in_content": "4:32 for YouTube videos, null for everything else"
    }}
  ],
  "aggregate_intent_score": 75,
  "priority_tier": "A or B or C",
  "pain_points": [
    {{
      "description": "Specific, concrete pain this prospect has based on signal evidence",
      "evidence_source": "platform:source_title",
      "urgency": "immediate or near-term or strategic"
    }}
  ],
  "suggested_opening_line": "CRITICAL RULES: (1) Reference a SPECIFIC signal — quote the exact words from YouTube/Reddit/podcast/news with the platform name. (2) Connect to {company_name} value proposition concretely. (3) Maximum 2 sentences. (4) NEVER start with: Hi, Hello, I hope, I came across, Reaching out, Touching base. (5) GOOD format: 'Saw your post in r/startups where you said [exact quote] — {company_name} [specific value prop].' or 'Watched your video at [timestamp] where you mentioned [exact quote] — {company_name} [specific value prop].'",
  "suggested_hook": "EXACTLY 5 words maximum. The angle to lead with. Example: Cut engineering costs 60%",
  "best_channel": "LinkedIn DM or Email or Reddit DM or Twitter DM or Phone",
  "follow_up_angle": "One specific thing to offer in follow-up message. Example: Send a 2-page case study of a similar startup we shipped in 8 weeks",
  "platforms_found_on": ["list", "of", "platforms", "where", "signals", "were", "found"],
  "total_signals_found": {len(signals)}
}}

INTENT SCORING RULES — apply these to set intent_score per signal AND aggregate_intent_score:
- YouTube signal WITH timestamp (person said this on camera): intent_score 85-95
- Reddit post actively asking for a vendor or solution: intent_score 80-92
- Podcast episode where person discussed this pain: intent_score 70-80
- News: company raised funding in last 90 days: intent_score 72-82
- News: company expansion or new facility: intent_score 65-75
- LinkedIn headline keyword match only, zero other signals: intent_score 30-50
- aggregate_intent_score 80-100 → priority_tier MUST be A
- aggregate_intent_score 50-79  → priority_tier MUST be B
- aggregate_intent_score 0-49   → priority_tier MUST be C

OPENING LINE SELECTION — choose based on which signals exist:
- YouTube signal with timestamp → "Watched your [video title] at [X:XX] where you said '[exact quote]' — [company] [specific solution]."
- Reddit signal → "Saw your post in r/[subreddit] about [topic] — specifically where you said '[quote]' — [company] [specific solution]."
- Podcast signal → "Heard you on [podcast name] talking about [topic] — [company] [specific solution]."
- News signal → "Saw that [their company] [event from news] — [company] typically helps at exactly this moment because [reason]."
- LinkedIn only (no other signals) → "Noticed [their company] is [specific observation from headline] — [company] [specific solution]."

Remember: Return ONLY the JSON object. No text before. No text after."""

    # ── Public Methods (identical interface to original AIBrain) ──────────────

    def score_and_qualify(
        self,
        lead_data: dict,
        signals: list,
        sdr_context: Optional[dict] = None,
    ):
        """
        Main qualification method.
        Input:  LinkedIn lead dict + list of RawSignal objects + SDR context dict
        Output: LeadProfile Pydantic model or None if all attempts fail
        """
        # Import here to avoid circular imports
        from scout_agent import LeadProfile

        print(f"\n  🧠 [{self.provider.upper()}] Qualifying: {lead_data.get('full_name', 'Unknown')}")
        print(f"     Signals: {len(signals)} | SDR context: {bool(sdr_context)}")

        # Extract company name for prompt injection
        company_name = (
            sdr_context.get("company_name", "Our Company")
            if sdr_context and sdr_context.get("company_name")
            else "Our Company"
        )

        if not sdr_context or not sdr_context.get("company_name"):
            print(f"  ⚠️  No SDR context — go to /settings and save your profile")

        system_prompt = self._build_system_prompt()
        user_prompt = self._build_qualification_prompt(
            lead_data, signals, sdr_context, company_name
        )

        # Retry loop — handles rate limits and transient errors
        for attempt in range(3):
            try:
                raw_content = self._call_llm(system_prompt, user_prompt)
                cleaned = self._clean_json(raw_content)
                raw = json.loads(cleaned)
                raw = self._validate_and_fill(raw, signals)

                result = LeadProfile(**raw)
                print(
                    f"  ✅ {result.full_name} | "
                    f"Score: {result.aggregate_intent_score}/100 | "
                    f"Tier: {result.priority_tier}"
                )
                return result

            except json.JSONDecodeError as e:
                print(f"  ❌ Attempt {attempt + 1}/3: JSON parse error: {e}")
                if attempt == 0:
                    try:
                        print(f"  Raw response (first 400 chars): {cleaned[:400]}")
                    except Exception:
                        pass
                time.sleep(1)

            except Exception as e:
                error_str = str(e)
                print(f"  ❌ Attempt {attempt + 1}/3: {type(e).__name__}: {error_str[:150]}")

                # Handle rate limits per provider
                if "429" in error_str or "rate" in error_str.lower() or "quota" in error_str.lower():
                    if self.provider == "gemini":
                        wait_time = 60
                    elif self.provider == "groq":
                        wait_time = 15
                    else:
                        wait_time = 30
                    print(f"  ⏳ Rate limit hit — waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                else:
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s

        print(f"  ❌ All 3 attempts failed for {lead_data.get('full_name', 'Unknown')}")
        return None

    def synthesize_reddit_lead(
        self,
        signal,
        sdr_context: Optional[dict] = None,
    ):
        """
        Create a partial LeadProfile from a Reddit/forum signal alone.
        Used when we have a buying intent post but no LinkedIn match found.
        """
        from scout_agent import LeadProfile

        company_name = (
            sdr_context.get("company_name", "Our Company")
            if sdr_context else "Our Company"
        )
        value_prop = (
            sdr_context.get("value_proposition", "")
            if sdr_context else ""
        )

        system_prompt = self._build_system_prompt()

        user_prompt = f"""Create a partial lead profile from this online buying signal.

SIGNAL:
Platform: {signal.platform}
Source: {signal.source_title}
URL: {signal.source_url}
Author: {signal.author_name} ({signal.author_context})
Quote: {signal.raw_quote}
Date: {signal.published_at}

COMPANY SELLING:
Name: {company_name}
Value Proposition: {value_prop}

Return this JSON. Every field required. Return ONLY the JSON.

{{
  "full_name": "{signal.author_name}",
  "company_name": "Unknown or inferred from post context",
  "title": "Inferred from subreddit and post context",
  "linkedin_url": null,
  "email_guess": null,
  "company_website": null,
  "industry": "Infer from subreddit and post content",
  "company_size_est": "11-50",
  "location": "Unknown",
  "intent_signals": [{{
    "platform": "{signal.platform}",
    "signal_type": "{signal.signal_type}",
    "source_url": "{signal.source_url}",
    "source_title": "{signal.source_title}",
    "raw_quote": {json.dumps(signal.raw_quote)},
    "author_name": "{signal.author_name}",
    "author_context": "{signal.author_context}",
    "published_at": "{signal.published_at}",
    "keywords_matched": {json.dumps(signal.keywords_matched)},
    "intent_score": 75,
    "timestamp_in_content": null
  }}],
  "aggregate_intent_score": 72,
  "priority_tier": "B",
  "pain_points": [{{
    "description": "Infer specific pain from the post quote",
    "evidence_source": "{signal.platform}:{signal.source_title}",
    "urgency": "near-term"
  }}],
  "suggested_opening_line": "Reference their exact post and quote. Connect to {company_name}. Max 2 sentences.",
  "suggested_hook": "5 word hook",
  "best_channel": "Reddit DM",
  "follow_up_angle": "Specific relevant offer based on their post",
  "platforms_found_on": ["{signal.platform}"],
  "total_signals_found": 1
}}"""

        try:
            raw_content = self._call_llm(system_prompt, user_prompt, max_tokens=1000)
            cleaned = self._clean_json(raw_content)
            raw = json.loads(cleaned)
            raw = self._validate_and_fill(raw, [signal])
            result = LeadProfile(**raw)
            print(f"  ✅ Reddit lead synthesized: {result.full_name}")
            return result
        except Exception as e:
            print(f"  ⚠️  Reddit lead synthesis failed: {type(e).__name__}: {e}")
            return None
