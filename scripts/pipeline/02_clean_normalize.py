#!/usr/bin/env python3
"""
Step 2: Clean & Normalize Raw Scraped Data
-------------------------------------------
- Deduplicates by phone / business name + city
- Normalizes phone numbers, websites, cities
- Generates SEO-friendly slugs
- Scores listing completeness
- Flags potential luxury vendors

Usage:
  python scripts/pipeline/02_clean_normalize.py --niche porta_potty

Input:  data/raw/porta_potty_wa_raw.csv
Output: data/cleaned/porta_potty_wa_cleaned.csv
"""

import os
import re
import sys
import argparse
import unicodedata
import pandas as pd
from pathlib import Path


# ── Slug Generation ───────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def generate_slug(business_name: str, city: str, state: str = "wa") -> str:
    """Generate a unique listing slug."""
    name_slug = slugify(business_name)
    city_slug = slugify(city)
    return f"{name_slug}-{city_slug}-{state}"


# ── Phone Normalization ───────────────────────────────────────────────────────

def normalize_phone(phone: str) -> str:
    """Normalize phone to (XXX) XXX-XXXX format."""
    if not phone or pd.isna(phone):
        return ""

    digits = re.sub(r"\D", "", str(phone))

    # Remove country code
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"

    return str(phone).strip()


# ── URL Normalization ─────────────────────────────────────────────────────────

def normalize_url(url: str) -> str:
    """Clean up website URLs."""
    if not url or pd.isna(url):
        return ""

    url = str(url).strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Remove trailing slashes and common cruft
    url = url.rstrip("/")
    return url


# ── City Normalization ────────────────────────────────────────────────────────

CITY_ALIASES = {
    "seattlewa": "Seattle",
    "tacomawa": "Tacoma",
    "spokane wa": "Spokane",
    "bellevuewa": "Bellevue",
    "portlandor": "Portland",  # Filter out Oregon
}

WA_KNOWN_CITIES = {
    "seattle", "tacoma", "spokane", "vancouver", "bellevue",
    "olympia", "everett", "kirkland", "redmond", "renton",
    "bellingham", "yakima", "federal way", "kennewick", "pasco",
    "richland", "sammamish", "marysville", "shoreline", "lakewood",
    "burien", "mercer island", "bothell", "mount vernon", "wenatchee",
    "walla walla", "pullman", "bremerton", "port angeles", "anacortes",
    "auburn", "kent", "des moines", "kent", "tukwila", "seatac",
    "maple valley", "issaquah", "covington", "black diamond",
}


def normalize_city(city: str, state: str = "WA") -> str:
    """Normalize city name."""
    if not city or pd.isna(city):
        return ""

    city = str(city).strip().title()
    alias = CITY_ALIASES.get(city.lower().replace(" ", ""), None)
    return alias if alias else city


# ── Luxury Detection ──────────────────────────────────────────────────────────

LUXURY_KEYWORDS = [
    "luxury", "restroom trailer", "trailer", "vip", "deluxe",
    "executive", "upscale", "premium", "high-end",
]


def detect_luxury(row: pd.Series) -> bool:
    """Check if listing likely offers luxury units."""
    text = " ".join([
        str(row.get("business_name", "")),
        str(row.get("raw_subtypes", "")),
    ]).lower()

    return any(kw in text for kw in LUXURY_KEYWORDS)


# ── Completeness Score ────────────────────────────────────────────────────────

SCORED_FIELDS = ["business_name", "phone", "website", "address", "city", "zip", "google_rating"]


def completeness_score(row: pd.Series) -> int:
    """Score 0-100 based on how complete the listing data is."""
    filled = sum(1 for f in SCORED_FIELDS if row.get(f) and not pd.isna(row.get(f)) and str(row.get(f)).strip())
    return int((filled / len(SCORED_FIELDS)) * 100)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Clean and normalize scraped listing data")
    parser.add_argument("--niche", default="porta_potty")
    parser.add_argument("--state", default="wa")
    args = parser.parse_args()

    input_file = Path(f"data/raw/{args.niche}_{args.state}_raw.csv")
    output_dir = Path("data/cleaned")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{args.niche}_{args.state}_cleaned.csv"

    if not input_file.exists():
        print(f"❌ Input file not found: {input_file}")
        print(f"   Run step 1 first: python scripts/pipeline/01_scrape_outscraper.py --niche {args.niche}")
        sys.exit(1)

    print(f"\n🧹 Cleaning {args.niche} data from {input_file}")

    df = pd.read_csv(input_file)
    original_count = len(df)
    print(f"   Loaded: {original_count} rows")

    # ── Normalize fields ──

    df["phone"] = df["phone"].apply(normalize_phone)
    df["website"] = df["website"].apply(normalize_url)
    df["city"] = df.apply(lambda r: normalize_city(r.get("city", ""), r.get("state", "WA")), axis=1)
    df["business_name"] = df["business_name"].str.strip().str.title()
    df["state"] = "Washington"

    # ── Filter out non-WA rows ──
    if "state" in df.columns:
        before = len(df)
        # Keep WA rows only (based on city or explicit state)
        wa_cities_lower = WA_KNOWN_CITIES
        df = df[
            df["city"].str.lower().isin(wa_cities_lower)
            | df.get("state", pd.Series(["WA"] * len(df))).str.upper().eq("WA")
        ]
        removed = before - len(df)
        if removed > 0:
            print(f"   Filtered out {removed} non-WA listings")

    # ── Remove incomplete rows ──
    df = df[df["business_name"].notna() & (df["business_name"].str.len() > 2)]
    df = df[df["city"].notna() & (df["city"].str.len() > 0)]

    # ── Generate slugs ──
    df["slug"] = df.apply(
        lambda r: generate_slug(r["business_name"], r["city"]), axis=1
    )

    # ── Deduplicate ──
    # 1. By phone (most reliable)
    df_with_phone = df[df["phone"].str.len() > 9].drop_duplicates(subset=["phone"], keep="first")
    df_without_phone = df[df["phone"].str.len() <= 9]

    # 2. By business name + city for rows without phone
    df_without_phone = df_without_phone.drop_duplicates(
        subset=["business_name", "city"], keep="first"
    )

    df = pd.concat([df_with_phone, df_without_phone]).drop_duplicates(
        subset=["slug"], keep="first"
    )

    # ── Detect luxury ──
    df["is_luxury"] = df.apply(detect_luxury, axis=1)

    # ── Compute completeness ──
    df["completeness_score"] = df.apply(completeness_score, axis=1)

    # ── Add enrichment queue fields ──
    df["status"] = "active"
    df["is_featured"] = False
    df["is_verified"] = False
    df["listing_tier"] = "free"
    df["enriched"] = False  # Not yet enriched by Claude

    # ── Sort by completeness (best data first) ──
    df = df.sort_values("completeness_score", ascending=False)

    # ── Drop raw_json column (too large for CSV) ──
    if "raw_json" in df.columns:
        df = df.drop(columns=["raw_json"])

    df.to_csv(output_file, index=False)

    print(f"\n✅ Cleaning complete!")
    print(f"   Input:  {original_count} rows")
    print(f"   Output: {len(df)} rows (removed {original_count - len(df)} duplicates/invalid)")
    print(f"   Luxury: {df['is_luxury'].sum()} listings detected as luxury")
    print(f"   Avg completeness: {df['completeness_score'].mean():.1f}/100")
    print(f"   Saved to: {output_file}")
    print(f"\n⏭️  Next step: pnpm tsx scripts/pipeline/03_enrich_claude.ts --niche {args.niche}")

    # Print city distribution
    print(f"\n📊 City distribution:")
    city_counts = df["city"].value_counts().head(10)
    for city, count in city_counts.items():
        print(f"   {city}: {count}")


if __name__ == "__main__":
    main()
