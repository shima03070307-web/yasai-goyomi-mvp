import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "weather-cache.json"
TARGET_POINT_COUNT = 500
MAX_WORKERS = 2

POINTS = {
    "北海道-札幌市": (43.0618, 141.3545),
    "北海道-旭川市": (43.7706, 142.3649),
    "北海道-函館市": (41.7687, 140.7291),
    "青森県-青森市": (40.8244, 140.74),
    "岩手県-盛岡市": (39.7036, 141.1527),
    "宮城県-仙台市": (38.2688, 140.8721),
    "秋田県-秋田市": (39.7186, 140.1024),
    "山形県-山形市": (38.2404, 140.3633),
    "福島県-会津若松市": (37.4948, 139.9298),
    "東京都-東京23区": (35.6895, 139.6917),
    "東京都-世田谷区": (35.6466, 139.6532),
    "神奈川県-横浜市": (35.4437, 139.638),
    "埼玉県-さいたま市": (35.8617, 139.6455),
    "千葉県-千葉市": (35.6074, 140.1065),
    "茨城県-水戸市": (36.3418, 140.4468),
    "栃木県-宇都宮市": (36.5551, 139.8828),
    "群馬県-前橋市": (36.3912, 139.0608),
    "新潟県-新潟市": (37.9026, 139.0232),
    "長野県-長野市": (36.6513, 138.181),
    "長野県-松本市": (36.238, 137.972),
    "山梨県-甲府市": (35.6642, 138.5684),
    "静岡県-静岡市": (34.9769, 138.3831),
    "愛知県-名古屋市": (35.1815, 136.9066),
    "大阪府-大阪市": (34.6937, 135.5023),
    "京都府-京都市": (35.0116, 135.7681),
    "兵庫県-神戸市": (34.6901, 135.1955),
    "岡山県-岡山市": (34.6618, 133.935),
    "広島県-広島市": (34.3853, 132.4553),
    "香川県-高松市": (34.3401, 134.0434),
    "愛媛県-松山市": (33.8416, 132.7661),
    "高知県-高知市": (33.5597, 133.5311),
    "福岡県-福岡市": (33.5904, 130.4017),
    "熊本県-熊本市": (32.8031, 130.7079),
    "大分県-大分市": (33.2382, 131.6126),
    "宮崎県-宮崎市": (31.9111, 131.4239),
    "鹿児島県-鹿児島市": (31.5602, 130.5581),
    "沖縄県-那覇市": (26.2124, 127.6809),
}

PREFECTURE_COORDINATES = {
    "北海道": (43.0618, 141.3545), "青森県": (40.8244, 140.74), "岩手県": (39.7036, 141.1527), "宮城県": (38.2688, 140.8721), "秋田県": (39.7186, 140.1024), "山形県": (38.2404, 140.3633), "福島県": (37.7608, 140.4747),
    "茨城県": (36.3418, 140.4468), "栃木県": (36.5551, 139.8828), "群馬県": (36.3912, 139.0608), "埼玉県": (35.8617, 139.6455), "千葉県": (35.6074, 140.1065), "東京都": (35.6895, 139.6917), "神奈川県": (35.4437, 139.638),
    "新潟県": (37.9026, 139.0232), "富山県": (36.6953, 137.2113), "石川県": (36.5947, 136.6256), "福井県": (36.0652, 136.2216), "山梨県": (35.6642, 138.5684), "長野県": (36.6513, 138.181), "岐阜県": (35.4233, 136.7607), "静岡県": (34.9769, 138.3831), "愛知県": (35.1815, 136.9066),
    "三重県": (34.7303, 136.5086), "滋賀県": (35.0045, 135.8686), "京都府": (35.0116, 135.7681), "大阪府": (34.6937, 135.5023), "兵庫県": (34.6901, 135.1955), "奈良県": (34.6851, 135.8048), "和歌山県": (34.226, 135.1675),
    "鳥取県": (35.5011, 134.2351), "島根県": (35.4723, 133.0505), "岡山県": (34.6618, 133.935), "広島県": (34.3853, 132.4553), "山口県": (34.1785, 131.4737), "徳島県": (34.0703, 134.5548), "香川県": (34.3401, 134.0434), "愛媛県": (33.8416, 132.7661), "高知県": (33.5597, 133.5311),
    "福岡県": (33.5904, 130.4017), "佐賀県": (33.2635, 130.3009), "長崎県": (32.7503, 129.8779), "熊本県": (32.8031, 130.7079), "大分県": (33.2382, 131.6126), "宮崎県": (31.9111, 131.4239), "鹿児島県": (31.5602, 130.5581), "沖縄県": (26.2124, 127.6809),
}

PREFECTURE_FALLBACKS = {f"{prefecture}-代表地点": coords for prefecture, coords in PREFECTURE_COORDINATES.items()}

AREA_OFFSETS = [
    (0.00, 0.00), (0.22, 0.00), (-0.22, 0.00), (0.00, 0.22), (0.00, -0.22),
    (0.32, 0.24), (-0.32, 0.24), (0.32, -0.24), (-0.32, -0.24),
    (0.48, 0.00), (-0.48, 0.00), (0.00, 0.48), (0.00, -0.48),
    (0.60, 0.34), (-0.60, 0.34), (0.60, -0.34), (-0.60, -0.34),
]


def build_points():
    points = {**POINTS, **PREFECTURE_FALLBACKS}
    prefectures = list(PREFECTURE_COORDINATES.items())
    index = 1
    while len(points) < TARGET_POINT_COUNT:
        for prefecture, (base_lat, base_lon) in prefectures:
            if len(points) >= TARGET_POINT_COUNT:
                break
            offset = AREA_OFFSETS[index % len(AREA_OFFSETS)]
            ring = 1 + index // len(AREA_OFFSETS)
            lat = base_lat + offset[0] * min(ring, 3)
            lon = base_lon + offset[1] * min(ring, 3)
            points[f"{prefecture}-代表エリア{index:03d}"] = (round(lat, 4), round(lon, 4))
        index += 1
    return dict(list(points.items())[:TARGET_POINT_COUNT])


def fetch_point(key, lat, lon):
    params = urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "timezone": "Asia/Tokyo",
            "forecast_days": 3,
            "daily": "weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
        }
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    for attempt in range(4):
        try:
            with urlopen(url, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
            break
        except HTTPError as error:
            if error.code != 429 or attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))
        except URLError:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))

    daily = data.get("daily", {})
    days = []
    for i, date in enumerate(daily.get("time", [])):
        days.append(
            {
                "date": date,
                "weatherCode": daily.get("weather_code", [None])[i],
                "min": daily.get("temperature_2m_min", [None])[i],
                "max": daily.get("temperature_2m_max", [None])[i],
                "rain": daily.get("precipitation_sum", [0])[i] or 0,
                "wind": daily.get("wind_speed_10m_max", [0])[i] or 0,
                "humidity": daily.get("relative_humidity_2m_mean", [0])[i] or 0,
            }
        )
    return {"key": key, "latitude": lat, "longitude": lon, "days": days}


def main():
    points = build_points()
    previous = {}
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8")).get("points", {})
    cache = {
        "schema": 1,
        "source": "Open-Meteo",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "updatePolicy": "MVP cache. Regenerated by GitHub Actions at 04:00 and 15:00 JST.",
        "points": {},
    }
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_point, key, lat, lon): (index, key)
            for index, (key, (lat, lon)) in enumerate(points.items(), start=1)
        }
        for future in as_completed(futures):
            index, key = futures[future]
            print(f"[{index}/{len(points)}] {key}")
            try:
                cache["points"][key] = future.result()
            except Exception as error:
                if key in previous:
                    print(f"  using previous cache for {key}: {error}")
                    cache["points"][key] = previous[key]
                    continue
                raise
            time.sleep(0.02)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
