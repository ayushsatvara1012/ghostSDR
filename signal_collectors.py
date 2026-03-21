"""
Ghost SDR — Multi-Platform Signal Collectors v3.1
Fixed: silent failure handling, debug logging, Reddit User-Agent,
       YouTube error isolation, News query improvement
"""

import os
import json
import requests
from typing import List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import time


# ─── Data Contract ────────────────────────────────────────────────────────────

@dataclass
class RawSignal:
    platform: str
    signal_type: str
    source_url: str
    source_title: str
    raw_quote: str
    author_name: str
    author_context: str
    published_at: str
    keywords_matched: List[str]
    timestamp_in_content: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


# ─── YouTube Collector ────────────────────────────────────────────────────────

class YouTubeCollector:
    INTENT_PHRASES = [
        "looking for", "need to buy", "evaluating", "comparing",
        "switching from", "frustrated with", "too expensive",
        "can't find", "sourcing", "supplier", "procurement",
        "bulk order", "find a manufacturer", "reliable supplier",
        "hiring engineers", "can't afford", "outsource", "agency",
        "slow delivery", "technical debt", "need developers",
        "burn rate", "runway", "engineering team",
    ]

    def __init__(self, serper_key: str):
        self.serper_key = serper_key

    def search_videos(self, keywords: str, max_results: int = 5) -> List[dict]:
        url = "https://google.serper.dev/videos"
        payload = json.dumps({"q": keywords, "num": max_results})
        headers = {
            "X-API-KEY": self.serper_key,
            "Content-Type": "application/json"
        }
        try:
            resp = requests.post(url, headers=headers, data=payload, timeout=10)
            if resp.status_code == 200:
                videos = resp.json().get("videos", [])
                print(f"     YouTube search returned {len(videos)} videos")
                return videos
            else:
                print(f"     ⚠️  YouTube search HTTP {resp.status_code}: {resp.text[:100]}")
        except requests.exceptions.Timeout:
            print(f"     ⚠️  YouTube search timed out")
        except Exception as e:
            print(f"     ⚠️  YouTube search error: {type(e).__name__}: {e}")
        return []

    def get_transcript(self, video_id: str) -> List[dict]:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id, languages=["en", "en-US", "en-GB"]
            )
            return transcript
        except Exception:
            # Expected for many videos — do not print as error
            return []

    def extract_video_id(self, url: str) -> Optional[str]:
        import re
        patterns = [
            r"v=([a-zA-Z0-9_-]{11})",
            r"youtu\.be/([a-zA-Z0-9_-]{11})",
            r"embed/([a-zA-Z0-9_-]{11})"
        ]
        for pat in patterns:
            m = re.search(pat, url)
            if m:
                return m.group(1)
        return None

    def scan_transcript_for_signals(
        self, transcript: List[dict], keywords: List[str], video_meta: dict
    ) -> List[RawSignal]:
        signals = []
        if not transcript:
            return signals

        full_text = " ".join([t["text"] for t in transcript]).lower()

        for phrase in self.INTENT_PHRASES:
            if phrase in full_text:
                for i, segment in enumerate(transcript):
                    if phrase in segment["text"].lower():
                        start_idx = max(0, i - 3)
                        end_idx = min(len(transcript), i + 6)
                        context = " ".join([t["text"] for t in transcript[start_idx:end_idx]])
                        ts = int(segment["start"])
                        timestamp_str = f"{ts // 60}:{ts % 60:02d}"
                        matched_kw = [k for k in keywords if k.lower() in context.lower()]

                        sig_type = "buying_intent" if any(
                            p in phrase for p in ["buy", "sourc", "need", "find", "outsourc"]
                        ) else "pain_point"

                        signals.append(RawSignal(
                            platform="youtube",
                            signal_type=sig_type,
                            source_url=video_meta.get("link", ""),
                            source_title=video_meta.get("title", "Unknown Video"),
                            raw_quote=context[:400],
                            author_name=video_meta.get("channel", "Unknown Channel"),
                            author_context=f"YouTube: {video_meta.get('channel', '')}",
                            published_at=video_meta.get("date", datetime.now().strftime("%Y-%m-%d")),
                            keywords_matched=matched_kw or [phrase],
                            timestamp_in_content=timestamp_str,
                        ))
                        break  # One signal per phrase per video
        return signals

    def collect(self, keywords: str, keyword_list: List[str], max_videos: int = 4) -> List[RawSignal]:
        print(f"     📺 YouTube: searching '{keywords[:50]}...'")
        videos = self.search_videos(keywords, max_results=max_videos)
        all_signals = []
        transcripts_found = 0

        for video in videos[:max_videos]:
            video_id = self.extract_video_id(video.get("link", ""))
            if not video_id:
                continue
            transcript = self.get_transcript(video_id)
            if transcript:
                transcripts_found += 1
                sigs = self.scan_transcript_for_signals(transcript, keyword_list, video)
                all_signals.extend(sigs)
            time.sleep(0.3)

        print(f"     📺 YouTube: {transcripts_found}/{len(videos)} transcripts, {len(all_signals)} signals")
        return all_signals


# ─── Podcast Collector ────────────────────────────────────────────────────────

class PodcastCollector:
    PAIN_PHRASES = [
        "struggling with", "challenge", "problem with", "can't find",
        "difficult to source", "supply chain", "shortage", "expensive",
        "looking for alternatives", "switching suppliers", "vendor evaluation",
        "cost reduction", "procurement", "bulk purchasing", "outsourcing",
        "engineering team", "hiring developers", "build vs buy",
        "technical debt", "slow shipping", "missed deadline",
    ]

    def __init__(self, listennotes_key: Optional[str] = None):
        self.ln_key = listennotes_key

    def search_episodes(self, keywords: str, max_results: int = 5) -> List[dict]:
        if not self.ln_key:
            print(f"     🎙️  Podcast: No LISTENNOTES_API_KEY — skipping")
            return []

        url = "https://listen-api.listennotes.com/api/v2/search"
        headers = {"X-ListenAPI-Key": self.ln_key}
        params = {
            "q": keywords,
            "type": "episode",
            "len_min": 5,
            "language": "English",
            "page_size": max_results,
            "sort_by_date": 1,
        }
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                print(f"     🎙️  Podcast: {len(results)} episodes found")
                return results
            elif resp.status_code == 429:
                print(f"     🎙️  Podcast: Rate limit hit (free tier = 10 req/month)")
            else:
                print(f"     🎙️  Podcast: HTTP {resp.status_code}")
        except Exception as e:
            print(f"     🎙️  Podcast error: {type(e).__name__}: {e}")
        return []

    def extract_signals_from_description(
        self, episode: dict, keyword_list: List[str]
    ) -> List[RawSignal]:
        description = (
            episode.get("description_original", "") or
            episode.get("description", "") or ""
        )
        title = (
            episode.get("title_original", "") or
            episode.get("title", "") or "Unknown Episode"
        )
        combined = f"{title}. {description}".lower()

        for phrase in self.PAIN_PHRASES:
            if phrase in combined:
                idx = combined.find(phrase)
                snippet = description[max(0, idx - 100): idx + 300]
                matched_kw = [k for k in keyword_list if k.lower() in combined]
                pub_date = episode.get("pub_date_ms", 0)
                pub_str = (
                    datetime.fromtimestamp(pub_date / 1000).strftime("%Y-%m-%d")
                    if pub_date else datetime.now().strftime("%Y-%m-%d")
                )
                podcast_title = (
                    episode.get("podcast", {}).get("title_original", "") or
                    episode.get("podcast", {}).get("title", "Unknown Podcast")
                )
                return [RawSignal(
                    platform="podcast",
                    signal_type="pain_point",
                    source_url=episode.get("listennotes_url", ""),
                    source_title=title,
                    raw_quote=(snippet or title)[:400],
                    author_name=podcast_title,
                    author_context=f"Podcast: {title}",
                    published_at=pub_str,
                    keywords_matched=matched_kw or [phrase],
                )]
        return []

    def collect(self, keywords: str, keyword_list: List[str], max_episodes: int = 5) -> List[RawSignal]:
        print(f"     🎙️  Podcast: searching '{keywords[:50]}...'")
        episodes = self.search_episodes(keywords, max_results=max_episodes)
        all_signals = []
        for ep in episodes:
            sigs = self.extract_signals_from_description(ep, keyword_list)
            all_signals.extend(sigs)
        print(f"     🎙️  Podcast: {len(all_signals)} signals from {len(episodes)} episodes")
        return all_signals


# ─── Reddit Collector ─────────────────────────────────────────────────────────

class RedditCollector:
    # CRITICAL: Reddit REQUIRES this exact User-Agent header or returns 403
    HEADERS = {"User-Agent": "GhostSDR/2.0 Intent Scanner (contact: admin@ghostsdr.com)"}

    INTENT_SUBREDDITS = {
        "chemicals": [
            "chemistry", "chemicalengineering", "labrats", "manufacturing"
        ],
        "manufacturing": [
            "manufacturing", "industrialengineering", "supplychain"
        ],
        "tech": [
            "startups", "entrepreneur", "SaaS", "devops"
        ],
        "general": [
            "entrepreneur", "smallbusiness", "supplychain", "startups"
        ],
    }

    BUYING_SIGNALS = [
        ("need to find", "buying_intent"),
        ("looking for supplier", "buying_intent"),
        ("where can i buy", "buying_intent"),
        ("cheapest source", "buying_intent"),
        ("bulk purchase", "buying_intent"),
        ("recommend a vendor", "buying_intent"),
        ("anyone know where", "buying_intent"),
        ("outsource", "buying_intent"),
        ("hire a developer", "buying_intent"),
        ("find an agency", "buying_intent"),
        ("build vs buy", "buying_intent"),
        ("having trouble finding", "pain_point"),
        ("can't afford", "pain_point"),
        ("too expensive", "pain_point"),
        ("quality problems", "pain_point"),
        ("supplier issues", "pain_point"),
        ("slow delivery", "pain_point"),
        ("missed deadline", "pain_point"),
        ("engineering is slow", "pain_point"),
        ("burning runway", "pain_point"),
    ]

    def search_reddit(
        self, query: str, subreddit: Optional[str] = None, limit: int = 10
    ) -> List[dict]:
        if subreddit:
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {
                "q": query,
                "restrict_sr": 1,
                "sort": "new",
                "limit": limit,
                "t": "month"
            }
        else:
            url = "https://www.reddit.com/search.json"
            params = {
                "q": query,
                "sort": "new",
                "limit": limit,
                "t": "month"
            }

        try:
            resp = requests.get(
                url,
                headers=self.HEADERS,
                params=params,
                timeout=10
            )
            if resp.status_code == 200:
                children = resp.json().get("data", {}).get("children", [])
                return [c["data"] for c in children]
            elif resp.status_code == 403:
                print(f"     ⚠️  Reddit 403: User-Agent header rejected")
            elif resp.status_code == 429:
                print(f"     ⚠️  Reddit 429: Rate limited — waiting 2s")
                time.sleep(2)
            else:
                print(f"     ⚠️  Reddit HTTP {resp.status_code}")
        except requests.exceptions.Timeout:
            print(f"     ⚠️  Reddit timeout for query: {query[:40]}")
        except Exception as e:
            print(f"     ⚠️  Reddit error: {type(e).__name__}: {e}")
        return []

    def score_post(self, post: dict, keyword_list: List[str]) -> Optional[RawSignal]:
        title = post.get("title", "")
        body = post.get("selftext", "")
        combined = f"{title} {body}".lower()

        for phrase, sig_type in self.BUYING_SIGNALS:
            if phrase in combined:
                matched_kw = [k for k in keyword_list if k.lower() in combined]
                created = datetime.fromtimestamp(
                    post.get("created_utc", 0)
                ).strftime("%Y-%m-%d")
                author = post.get("author", "anonymous")
                snippet = (body[:400] if body.strip() else title)

                return RawSignal(
                    platform="reddit",
                    signal_type=sig_type,
                    source_url=f"https://reddit.com{post.get('permalink', '')}",
                    source_title=title,
                    raw_quote=snippet,
                    author_name=f"u/{author}",
                    author_context=(
                        f"r/{post.get('subreddit', 'unknown')} "
                        f"— {post.get('score', 0)} upvotes"
                    ),
                    published_at=created,
                    keywords_matched=matched_kw or [phrase],
                )
        return None

    def collect(
        self,
        keywords: str,
        keyword_list: List[str],
        industry_hint: str = "general"
    ) -> List[RawSignal]:
        print(f"     📢 Reddit: searching '{keywords[:50]}...'")
        all_signals = []

        # Broad search first
        posts = self.search_reddit(keywords, limit=15)
        print(f"     📢 Reddit: {len(posts)} posts from broad search")
        for post in posts:
            sig = self.score_post(post, keyword_list)
            if sig:
                all_signals.append(sig)

        # Industry subreddits — max 2
        subs = self.INTENT_SUBREDDITS.get(
            industry_hint,
            self.INTENT_SUBREDDITS["general"]
        )
        for sub in subs[:2]:
            time.sleep(0.5)  # Be polite — avoid 429
            sub_posts = self.search_reddit(keywords, subreddit=sub, limit=10)
            print(f"     📢 Reddit r/{sub}: {len(sub_posts)} posts")
            for post in sub_posts:
                sig = self.score_post(post, keyword_list)
                if sig:
                    all_signals.append(sig)

        # Deduplicate by source_url
        seen: set = set()
        unique = []
        for s in all_signals:
            if s.source_url not in seen:
                seen.add(s.source_url)
                unique.append(s)

        print(f"     📢 Reddit: {len(unique)} unique signals total")
        return unique


# ─── News Collector ────────────────────────────────────────────────────────────

class NewsCollector:
    EXPANSION_SIGNALS = [
        ("raises", "funding"),
        ("funding round", "funding"),
        ("series a", "funding"),
        ("series b", "funding"),
        ("seed round", "funding"),
        ("secured funding", "funding"),
        ("expands", "expansion"),
        ("new facility", "expansion"),
        ("new office", "expansion"),
        ("increases production", "expansion"),
        ("new product line", "expansion"),
        ("opens new", "expansion"),
        ("hiring", "hiring"),
        ("seeking to hire", "hiring"),
        ("procurement manager", "hiring"),
        ("head of engineering", "hiring"),
        ("vp of engineering", "hiring"),
    ]

    def __init__(self, serper_key: str):
        self.serper_key = serper_key

    def search_news(self, query: str, max_results: int = 8) -> List[dict]:
        url = "https://google.serper.dev/news"
        payload = json.dumps({"q": query, "num": max_results})
        headers = {
            "X-API-KEY": self.serper_key,
            "Content-Type": "application/json"
        }
        try:
            resp = requests.post(url, headers=headers, data=payload, timeout=10)
            if resp.status_code == 200:
                articles = resp.json().get("news", [])
                print(f"     📰 News: {len(articles)} articles for '{query[:40]}'")
                return articles
            else:
                print(f"     ⚠️  News HTTP {resp.status_code}")
        except Exception as e:
            print(f"     ⚠️  News error: {type(e).__name__}: {e}")
        return []

    def classify_signal(
        self, article: dict, keyword_list: List[str]
    ) -> Optional[RawSignal]:
        title = article.get("title", "").lower()
        snippet = article.get("snippet", "").lower()
        combined = f"{title} {snippet}"

        for phrase, sig_type in self.EXPANSION_SIGNALS:
            if phrase in combined:
                matched_kw = [k for k in keyword_list if k.lower() in combined]
                pub_date = article.get(
                    "date", datetime.now().strftime("%Y-%m-%d")
                )
                return RawSignal(
                    platform="news",
                    signal_type=sig_type,
                    source_url=article.get("link", ""),
                    source_title=article.get("title", ""),
                    raw_quote=article.get("snippet", "")[:400],
                    author_name=article.get("source", "Unknown Source"),
                    author_context=f"News: {article.get('source', '')}",
                    published_at=pub_date,
                    keywords_matched=matched_kw or [phrase],
                )
        return None

    def collect(
        self,
        keywords: str,
        keyword_list: List[str],
        company_name: Optional[str] = None
    ) -> List[RawSignal]:
        print(f"     📰 News: searching '{keywords[:50]}...'")
        all_signals = []

        # Topic search
        articles = self.search_news(f"{keywords} startup funding")
        for art in articles:
            sig = self.classify_signal(art, keyword_list)
            if sig:
                all_signals.append(sig)

        # Company-specific search if known
        if company_name and company_name.lower() not in ("unknown", "independent"):
            co_articles = self.search_news(f"{company_name} funding hiring expansion")
            for art in co_articles:
                sig = self.classify_signal(art, keyword_list)
                if sig:
                    all_signals.append(sig)

        print(f"     📰 News: {len(all_signals)} signals total")
        return all_signals


# ─── Signal Harvester (Orchestrator) ─────────────────────────────────────────

class SignalHarvester:
    def __init__(self):
        serper_key = os.getenv("SERPER_API_KEY")
        ln_key = os.getenv("LISTENNOTES_API_KEY")

        if not serper_key:
            raise EnvironmentError(
                "SERPER_API_KEY missing from .env — "
                "YouTube search and News will not work"
            )

        self.youtube = YouTubeCollector(serper_key=serper_key)
        self.podcast = PodcastCollector(listennotes_key=ln_key)
        self.reddit = RedditCollector()
        self.news = NewsCollector(serper_key=serper_key)

    def harvest(
        self,
        keywords: str,
        industry_hint: str = "general",
        company_name: Optional[str] = None,
        platforms: Optional[List[str]] = None,
    ) -> List[RawSignal]:

        keyword_list = [
            k.strip()
            for k in keywords.replace(",", " ").split()
            if len(k.strip()) > 2
        ]
        enabled = set(platforms or ["youtube", "reddit", "news", "podcast"])

        print(f"\n   🌐 Harvesting signals for: '{keywords}'")
        print(f"      Keywords parsed: {keyword_list}")
        print(f"      Platforms: {enabled}")

        all_signals: List[RawSignal] = []

        if "youtube" in enabled:
            try:
                sigs = self.youtube.collect(keywords, keyword_list, max_videos=4)
                all_signals.extend(sigs)
            except Exception as e:
                print(f"   ❌ YouTube collector crashed: {type(e).__name__}: {e}")

        if "podcast" in enabled:
            try:
                sigs = self.podcast.collect(keywords, keyword_list, max_episodes=5)
                all_signals.extend(sigs)
            except Exception as e:
                print(f"   ❌ Podcast collector crashed: {type(e).__name__}: {e}")

        if "reddit" in enabled:
            try:
                sigs = self.reddit.collect(
                    keywords, keyword_list, industry_hint=industry_hint
                )
                all_signals.extend(sigs)
            except Exception as e:
                print(f"   ❌ Reddit collector crashed: {type(e).__name__}: {e}")

        if "news" in enabled:
            try:
                sigs = self.news.collect(
                    keywords, keyword_list, company_name=company_name
                )
                all_signals.extend(sigs)
            except Exception as e:
                print(f"   ❌ News collector crashed: {type(e).__name__}: {e}")

        print(f"\n   📊 TOTAL signals harvested: {len(all_signals)}")

        if len(all_signals) == 0:
            print("   ⚠️  WARNING: Zero signals harvested.")
            print("   ⚠️  Check: SERPER_API_KEY valid? Reddit returning 403?")
            print("   ⚠️  Claude will generate generic output without signals.")

        return all_signals
