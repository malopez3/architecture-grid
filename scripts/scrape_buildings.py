import json
import requests
import os
import shutil
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

SPARQL_URL = "https://query.wikidata.org/sparql"

QUERY = """
SELECT ?building ?buildingLabel ?countryLabel ?image ?completed ?inception ?height ?coordinate WHERE {

  ?building wdt:P31 wd:Q11303.

  ?building wdt:P17 ?country.

  OPTIONAL { ?building wdt:P18 ?image. }
  OPTIONAL { ?building wdt:P1619 ?completed. }
  OPTIONAL { ?building wdt:P571 ?inception. }
  OPTIONAL { ?building wdt:P2048 ?height. }
  OPTIONAL { ?building wdt:P625 ?coordinate. }

  SERVICE wikibase:label {
      bd:serviceParam wikibase:language "en".
  }
}
"""

headers = {
    "Accept": "application/sparql-results+json",
    "User-Agent": "ArchitectureGridsBot/1.0"
}

# Initialize geocoder
geolocator = Nominatim(
    user_agent="ArchitectureGridsBot",
    timeout=10
)

reverse = RateLimiter(
    geolocator.reverse,
    min_delay_seconds=1,
    swallow_exceptions=True
)

print("Querying Wikidata...")

response = requests.get(
    SPARQL_URL,
    params={"query": QUERY},
    headers=headers
)

response.raise_for_status()

results = response.json()["results"]["bindings"]

# --------------------------------------------------
# Remove duplicate buildings by Wikidata ID
# (keep the first occurrence only)
# --------------------------------------------------
seen = set()
unique_results = []
duplicates_removed = 0

for row in results:
    wikidata_id = row["building"]["value"].split("/")[-1]

    if wikidata_id in seen:
        duplicates_removed += 1
        continue

    seen.add(wikidata_id)
    unique_results.append(row)

results = unique_results

print(f"Removed {duplicates_removed} duplicate buildings.")
print(f"Unique buildings remaining: {len(results)}")
print("----------------------------------------")

locations = {}

total_buildings = len(results)
processed = 0

us_total = sum(
    1
    for row in results
    if row["countryLabel"]["value"] == "United States"
    and "coordinate" in row
)

us_processed = 0

print(f"Found {total_buildings} unique skyscrapers.")
print(f"U.S. buildings requiring reverse geocoding: {us_total}")
print("----------------------------------------")

for row in results:

    processed += 1

    if processed % 100 == 0 or processed == total_buildings:
        print(f"Processed {processed}/{total_buildings} buildings...")

    country = row["countryLabel"]["value"]

    latitude = None
    longitude = None
    state = None

    # Extract coordinates
    if "coordinate" in row:
        coord = row["coordinate"]["value"]

        # Example: Point(-74.0094 40.7130)
        coord = coord.replace("Point(", "").replace(")", "")

        longitude, latitude = map(float, coord.split())

        # Reverse geocode only for US buildings
        if country == "United States":

            us_processed += 1

            print(
                f"Reverse geocoding "
                f"{us_processed}/{us_total}: "
                f"{row['buildingLabel']['value']}"
            )

            try:
                location = reverse((latitude, longitude))

                if location:
                    address = location.raw.get("address", {})
                    state = address.get("state")

            except Exception:
                state = None

    building = {
        "name": row["buildingLabel"]["value"],
        "year": None,
        "height": None,
        "image": None,
        "latitude": latitude,
        "longitude": longitude,
        "state": state,
        "wikidata": row["building"]["value"].split("/")[-1]
    }

    # Completion year, falling back to inception
    if "completed" in row:
        building["year"] = row["completed"]["value"][:4]
    elif "inception" in row:
        building["year"] = row["inception"]["value"][:4]

    if "image" in row:
        building["image"] = row["image"]["value"]

    if "height" in row:
        building["height"] = float(row["height"]["value"])

    locations.setdefault(country, []).append(building)

output_dir = "data/skyscrapers/countries"

# Remove previous JSON files
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)

os.makedirs(output_dir, exist_ok=True)

print("----------------------------------------")
print("Writing JSON files...")

for location, buildings in locations.items():

    filename = (
        location.lower()
        .replace(" ", "-")
        .replace("/", "-")
    )

    with open(
        f"{output_dir}/{filename}.json",
        "w",
        encoding="utf8"
    ) as f:
        json.dump(
            buildings,
            f,
            indent=2,
            ensure_ascii=False
        )

print("----------------------------------------")
print(f"Created {len(locations)} country files.")
print("Done!")