#!/usr/bin/env python3
"""
Step 1: Scrape Google Business data via Outscraper API
-------------------------------------------------------
Pulls business listings for a given niche + state combination.

Usage:
  pip install outscraper pandas python-dotenv
  python scripts/pipeline/01_scrape_outscraper.py --niche porta_potty --state WA

Output:
  data/raw/porta_potty_wa_raw.csv

Cost: ~$0.001 per result (500 results = ~$0.50)
"""

import os
import sys
import json
import time
import argparse
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

OUTSCRAPER_API_KEY = os.getenv("OUTSCRAPER_API_KEY")

# Search queries per niche
NICHE_QUERIES = {
    "porta_potty": [
        "porta potty rental {city} {state}",
        "portable toilet rental {city} {state}",
        "luxury restroom trailer {city} {state}",
        "porta john rental {city} {state}",
        "sanitation services {city} {state}",
    ],
    "senior_living": [
        "assisted living {city} {state}",
        "memory care facility {city} {state}",
        "senior living community {city} {state}",
        "nursing home {city} {state}",
        "retirement community {city} {state}",
    ],
    "ada_bathroom": [
        "ADA bathroom remodel {city} {state}",
        "accessible bathroom contractor {city} {state}",
        "handicap accessible bathroom {city} {state}",
        "ADA compliant restroom contractor {city} {state}",
    ],
    "water_quality": [
        "water testing service {city} {state}",
        "water filtration company {city} {state}",
        "water quality testing {city} {state}",
        "well water testing {city} {state}",
    ],
    "event_rentals": [
        "event rental {city} {state}",
        "tent rental {city} {state}",
        "party equipment rental {city} {state}",
        "wedding rental {city} {state}",
    ],
}

# Washington State cities to scrape
WA_CITIES = [
    "Seattle", "Tacoma", "Spokane", "Vancouver", "Bellevue",
    "Olympia", "Everett", "Kirkland", "Redmond", "Renton",
    "Bellingham", "Yakima", "Federal Way", "Kennewick", "Pasco",
    "Richland", "Sammamish", "Marysville", "Shoreline", "Lakewood",
    "Burien", "Mercer Island", "Bothell", "Mount Vernon", "Wenatchee",
    "Walla Walla", "Pullman", "Bremerton", "Port Angeles", "Anacortes",
]


def scrape_with_outscraper(query: str, limit: int = 20) -> list[dict]:
    """Scrape Google Maps results via Outscraper API."""
    try:
        from outscraper import ApiClient
    except ImportError:
        print("  pip install outscraper")
        return []

    client = ApiClient(api_key=OUTSCRAPER_API_KEY)

    results = client.google_maps_search(
        query,
        limit=limit,
        language="en",
        region="US",
        drop_duplicates=True,
    )

    # Outscraper returns nested structure; flatten
    flat = []
    for result_group in results:
        if isinstance(result_group, list):
            flat.extend(result_group)
        elif isinstance(result_group, dict):
            flat.append(result_group)

    return flat


def scrape_mock(query: str, city: str) -> list[dict]:
    """
    Mock scraper for testing without API key.
    Replace with real Outscraper calls in production.
    """
    return [
        {
            "name": f"Sample {city} Porta Potty Co",
            "full_address": f"123 Main St, {city}, WA 98000",
            "city": city,
            "state": "WA",
            "postal_code": "98000",
            "phone": "(206) 555-0100",
            "site": "https://example.com",
            "rating": 4.5,
            "reviews": 87,
            "subtypes": "Portable toilet supplier, Sanitation service",
            "latitude": 47.6062,
            "longitude": -122.3321,
        }
    ]


def normalize_result(raw: dict, niche: str) -> dict:
    """Normalize Outscraper result to our schema."""
    return {
        "niche": niche,
        "business_name": raw.get("name", "").strip(),
        "address": raw.get("full_address", "").split(",")[0].strip() if raw.get("full_address") else "",
        "city": raw.get("city", "").strip(),
        "state": raw.get("state", "WA").strip(),
        "zip": raw.get("postal_code", "").strip(),
        "lat": raw.get("latitude"),
        "lng": raw.get("longitude"),
        "phone": raw.get("phone", "").strip(),
        "website": raw.get("site", "").strip(),
        "google_rating": float(raw.get("rating", 0)) if raw.get("rating") else None,
        "google_review_count": int(raw.get("reviews", 0)) if raw.get("reviews") else 0,
        "scrape_source": "outscraper",
        "raw_subtypes": raw.get("subtypes", ""),
        "raw_json": json.dumps(raw),
    }


def main():
    parser = argparse.ArgumentParser(description="Scrape business listings via Outscraper")
    parser.add_argument("--niche", default="porta_potty", choices=list(NICHE_QUERIES.keys()))
    parser.add_argument("--state", default="WA")
    parser.add_argument("--cities", nargs="+", default=None, help="Override city list")
    parser.add_argument("--limit", type=int, default=20, help="Results per query")
    parser.add_argument("--mock", action="store_true", help="Use mock data (no API key needed)")
    args = parser.parse_args()

    cities = args.cities or WA_CITIES
    queries = NICHE_QUERIES[args.niche]

    print(f"\n🔍 Scraping niche={args.niche}, state={args.state}")
    print(f"   Cities: {len(cities)} | Queries/city: {len(queries)} | Limit/query: {args.limit}")
    print(f"   Total queries: {len(cities) * len(queries)}\n")

    if not OUTSCRAPER_API_KEY and not args.mock:
        print("⚠️  OUTSCRAPER_API_KEY not set — using mock data")
        print("   Set it in .env.local or pass --mock to suppress this warning\n")
        args.mock = True

    output_dir = Path("data/raw")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{args.niche}_{args.state.lower()}_raw.csv"

    all_results = []
    seen_phones = set()
    seen_names = set()

    for city in cities:
        for query_template in queries:
            query = query_template.format(city=city, state=args.state)
            print(f"  Querying: {query}")

            try:
                if args.mock:
                    raw_results = scrape_mock(query, city)
                else:
                    raw_results = scrape_with_outscraper(query, limit=args.limit)
                    time.sleep(1)  # Rate limiting

                for raw in raw_results:
                    normalized = normalize_result(raw, args.niche)

                    # Deduplicate by phone or business name + city
                    dedup_key = normalized.get("phone") or f"{normalized['business_name']}_{normalized['city']}"
                    if dedup_key and dedup_key in seen_phones:
                        continue
                    if dedup_key:
                        seen_phones.add(dedup_key)

                    all_results.append(normalized)

            except Exception as e:
                print(f"  ⚠️  Error scraping '{query}': {e}")
                continue

        print(f"  ✅ {city} complete — {len(all_results)} total results so far")

    # Save to CSV
    df = pd.DataFrame(all_results)
    df.drop_duplicates(subset=["business_name", "city"], keep="first", inplace=True)
    df.to_csv(output_file, index=False)

    print(f"\n✅ Scraping complete!")
    print(f"   Results: {len(df)}")
    print(f"   Saved to: {output_file}")
    print(f"\n⏭️  Next step: python scripts/pipeline/02_clean_normalize.py --niche {args.niche}")


if __name__ == "__main__":
    main()
