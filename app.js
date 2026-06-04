const STORAGE_KEY = "yasai-goyomi-mvp-state";
const FEEDBACK_KEY = "yasai-goyomi-feedback";
const WEATHER_CACHE_VERSION = "weather-auto-3";
const today = startOfDay(new Date());

const climateZones = {
  cold: { name: "寒地", description: "冬が非常に寒く、春の栽培開始が遅い地域。", advice: "夏野菜は早植えを避け、最低気温が安定してから定植します。秋冬野菜は早めに準備します。" },
  cool: { name: "寒冷地", description: "冬が寒く、春と秋の霜に注意が必要な地域。", advice: "夏野菜は中間地より遅め、秋冬野菜は早めに動くと失敗しにくいです。" },
  highland: { name: "高冷地", description: "標高が高く、夏は涼しい一方で春秋が短い地域。", advice: "葉物は向きますが、果菜類は定植時期と朝晩の冷え込みを慎重に見ます。" },
  temperate: { name: "中間地", description: "標準的な家庭菜園カレンダーが使いやすい地域。", advice: "一般的な栽培暦をベースに、梅雨・猛暑・台風の管理を補います。" },
  warm: { name: "暖地", description: "冬が比較的温暖で、春の立ち上がりが早い地域。", advice: "春は早めやすい一方、夏の高温・乾燥・台風対策を重視します。" },
  hot_summer: { name: "猛暑地・内陸高温地", description: "盆地・都市部・内陸部など夏の最高気温が高い地域。", advice: "真夏の葉物は避けるか遮光し、秋まきは暑さが落ち着いてから始めます。" },
  subtropical: { name: "亜熱帯", description: "沖縄・奄美など、本州基準の栽培暦と大きく異なる地域。", advice: "本州の春夏秋冬カレンダーをそのまま使わず、暑さを避けた作型を優先します。" }
};

const climateModifierTags = {
  late_frost: ["晩霜注意", "夏野菜の定植を遅めにし、最低気温確認を追加します。"],
  early_frost: ["初霜注意", "秋冬野菜の準備を早め、収穫遅れ注意を出します。"],
  heavy_snow: ["多雪", "冬季露地栽培を控えめにし、雪害対策と春準備を案内します。"],
  hot_summer: ["夏の高温注意", "葉物の真夏まきを避け、遮光・朝夕の水やりを促します。"],
  dry_summer: ["夏乾燥注意", "水切れ、敷きわら、マルチ、朝夕の水やりを重視します。"],
  rainy_season_heavy: ["梅雨・長雨注意", "泥はね、過湿、排水、風通し改善を案内します。"],
  typhoon_risk: ["台風注意", "支柱固定、トンネル固定、排水確認、収穫前倒しを通知します。"],
  coastal_mild: ["沿岸温暖", "春をやや早められる可能性があり、冬越し野菜候補を増やします。"],
  inland_cold: ["内陸寒暖差大", "春秋の低温と夏の高温を両方重視します。"],
  high_altitude: ["標高注意", "春は遅め、秋冬野菜は早めに通知します。"],
  short_growing_season: ["栽培期間が短い", "早生品種や短期収穫の作物を優先します。"]
};

const climateProfiles = {
  cold: { min: [-9, -8, -4, 2, 8, 13, 17, 18, 13, 6, 0, -6], max: [-2, -1, 3, 10, 16, 20, 23, 24, 20, 14, 7, 1], rain: [55, 50, 60, 70, 85, 95, 115, 120, 125, 95, 75, 62], frostEndMonth: 6, heatStartMonth: 8 },
  cool: { min: [-4, -3, 0, 6, 11, 16, 20, 21, 17, 10, 4, -1], max: [4, 6, 11, 18, 23, 26, 30, 31, 26, 20, 13, 7], rain: [70, 70, 90, 105, 120, 150, 180, 150, 170, 120, 95, 80], frostEndMonth: 5, heatStartMonth: 7 },
  highland: { min: [-5, -4, 0, 5, 11, 16, 20, 20, 15, 8, 2, -3], max: [4, 6, 12, 18, 24, 27, 31, 32, 26, 19, 13, 7], rain: [45, 48, 70, 85, 100, 125, 150, 115, 140, 95, 58, 45], frostEndMonth: 5, heatStartMonth: 8 },
  temperate: { min: [2, 3, 6, 11, 16, 20, 24, 25, 21, 15, 9, 4], max: [10, 11, 14, 20, 24, 27, 31, 33, 28, 22, 17, 12], rain: [55, 65, 115, 120, 135, 170, 155, 135, 200, 160, 85, 55], frostEndMonth: 4, heatStartMonth: 7 },
  warm: { min: [4, 5, 8, 13, 18, 22, 26, 26, 23, 17, 11, 6], max: [12, 13, 16, 22, 26, 29, 33, 34, 30, 24, 18, 13], rain: [65, 80, 125, 135, 165, 240, 210, 150, 210, 120, 80, 60], frostEndMonth: 3, heatStartMonth: 7 },
  hot_summer: { min: [2, 4, 8, 13, 18, 22, 26, 26, 22, 15, 8, 3], max: [11, 13, 17, 23, 28, 31, 36, 37, 31, 24, 17, 12], rain: [45, 55, 95, 105, 125, 145, 120, 85, 130, 90, 55, 40], frostEndMonth: 4, heatStartMonth: 6 },
  subtropical: { min: [14, 15, 17, 20, 23, 26, 27, 27, 26, 23, 20, 16], max: [19, 20, 22, 25, 28, 30, 32, 32, 31, 28, 25, 21], rain: [105, 120, 160, 180, 230, 260, 190, 210, 250, 180, 120, 100], frostEndMonth: 1, heatStartMonth: 5 }
};

const regionGroups = {
  hokkaido_east_north: group("hokkaido_east_north", "北海道北部・東部", "cold", ["late_frost", "early_frost", "heavy_snow", "short_growing_season"], 30, 14, -21, 30, "4月〜6月上旬、9月下旬以降", "一部内陸では7月〜8月", "地域差あり", "11月〜4月", "春の作付け開始は遅めにし、短い栽培期間で収穫できる作物を優先します。", "夏野菜は早植えせず、最低気温が安定してから植えるのが安全です。", ["稚内", "旭川", "網走", "北見", "帯広", "釧路"]),
  hokkaido_south_west: group("hokkaido_south_west", "北海道南部・道央", "cold", ["late_frost", "early_frost", "heavy_snow", "short_growing_season"], 25, 10, -18, 25, "4月〜5月下旬、10月以降", "7月〜8月に一部注意", "地域差あり", "11月〜4月", "本州の中間地より春はかなり遅め。ジャガイモ、豆類、葉物などは相性がよい地域です。", "春は焦らず、苗の保温や遅霜対策を重視してください。", ["札幌", "小樽", "函館", "苫小牧", "室蘭"]),
  tohoku_inland: group("tohoku_inland", "東北内陸・山沿い", "cool", ["late_frost", "early_frost", "heavy_snow", "inland_cold"], 18, 7, -14, 18, "4月〜5月中旬、10月以降", "7月〜8月の内陸部で注意", "梅雨・秋雨に注意", "12月〜3月", "春の夏野菜定植は中間地より遅め。秋冬野菜は寒くなる前に早めに種まきします。", "トマト・ナス・キュウリは遅霜に注意し、無理な早植えは避けましょう。", ["盛岡", "秋田内陸", "山形内陸", "会津", "青森内陸"]),
  tohoku_pacific_coast: group("tohoku_pacific_coast", "東北太平洋側沿岸", "cool", ["late_frost", "coastal_mild", "rainy_season_heavy"], 12, 5, -10, 12, "4月〜5月上旬", "7月〜8月に注意", "梅雨・秋雨に注意", "地域により冬季注意", "内陸より寒暖差は小さいですが、春の冷え込みと梅雨時期の過湿に注意します。", "沿岸部は比較的穏やかですが、春の低温と梅雨の長雨に注意してください。", ["仙台", "石巻", "いわき", "八戸沿岸"]),
  japan_sea_snow_area: group("japan_sea_snow_area", "日本海側多雪地域", "cool", ["heavy_snow", "rainy_season_heavy", "late_frost"], 12, 3, -10, 12, "4月〜5月上旬", "7月〜8月に注意", "梅雨・秋雨・冬季多雨雪に注意", "12月〜3月", "冬の積雪・湿り気を考慮し、春の畑準備と排水を重視します。", "水はけのよい畝づくりと、雨の前後の作業タイミングが大切です。", ["新潟", "富山", "金沢", "福井", "山形庄内", "秋田沿岸"]),
  kanto_plain: group("kanto_plain", "関東平野部", "temperate", ["hot_summer", "rainy_season_heavy", "typhoon_risk"], 0, 0, 0, 0, "3月下旬〜4月中旬に注意", "7月〜9月上旬", "6月〜7月、9月", "ほぼ不要", "標準的な中間地カレンダーが使いやすい地域。夏の高温、梅雨、台風対策を補います。", "多くの野菜が育てやすい地域ですが、真夏の葉物と水切れには注意しましょう。", ["東京23区", "横浜", "さいたま", "千葉", "宇都宮南部", "前橋平野部"]),
  koshin_highland: group("koshin_highland", "甲信・高冷地", "highland", ["late_frost", "early_frost", "inland_cold", "high_altitude", "short_growing_season", "hot_summer"], 18, 5, -18, 18, "4月〜5月下旬、9月下旬以降", "盆地では7月〜8月に注意", "梅雨・秋雨に注意", "地域により12月〜3月", "夏は涼しい地域も多く葉物に向きますが、春秋の霜と盆地の高温も考慮します。", "夏野菜は早植えせず、秋冬野菜は早めに準備すると失敗しにくいです。", ["長野", "松本", "軽井沢", "諏訪", "山梨高原部", "群馬山間部"]),
  tokai_plain: group("tokai_plain", "東海平野部", "temperate", ["hot_summer", "rainy_season_heavy", "typhoon_risk"], -3, 0, 3, -3, "3月下旬〜4月上旬に注意", "7月〜9月", "6月〜7月、9月", "ほぼ不要", "中間地よりやや暖かく、春の開始はやや早められますが、夏の高温と台風に注意します。", "春は始めやすい一方、夏の暑さで苗や葉物が弱りやすいです。", ["名古屋", "岐阜平野部", "静岡平野部", "浜松", "三重平野部"]),
  kansai_plain: group("kansai_plain", "近畿平野部", "temperate", ["hot_summer", "rainy_season_heavy", "typhoon_risk", "inland_cold"], -3, 0, 3, -3, "3月下旬〜4月上旬、盆地はやや注意", "7月〜9月", "6月〜7月、9月", "山間部を除き少ない", "標準的な中間地として扱えますが、都市部・盆地の夏の高温と山沿いの冷え込みに注意します。", "夏の暑さ対策と台風前の支柱固定を忘れないようにしましょう。", ["大阪", "京都市街地", "神戸", "奈良盆地", "和歌山北部"]),
  setouchi: group("setouchi", "瀬戸内", "warm", ["dry_summer", "hot_summer", "typhoon_risk", "coastal_mild"], -7, 0, 5, -7, "3月中旬〜4月上旬に一部注意", "7月〜9月", "梅雨時期、ただし乾燥傾向も注意", "少ない", "春の作付けはやや早めにでき、夏は乾燥・高温・水切れ対策を重視します。", "乾きやすい時期は敷きわらやマルチで土の乾燥を防ぐと育てやすいです。", ["岡山", "広島沿岸", "高松", "松山", "山口瀬戸内側"]),
  kyushu_north_plain: group("kyushu_north_plain", "北部九州・西日本暖地平野部", "warm", ["hot_summer", "rainy_season_heavy", "typhoon_risk", "coastal_mild"], -10, 0, 7, -10, "3月中旬〜下旬に一部注意", "7月〜9月", "6月〜7月、台風期", "少ない", "春の作付けは早めやすく、秋冬野菜も作りやすい一方で高温・多湿・台風に注意します。", "暖かく育てやすい反面、梅雨と台風前の管理が大切です。", ["福岡", "佐賀", "熊本平野部", "大分平野部", "長崎平野部"]),
  kyushu_south: group("kyushu_south", "南九州", "warm", ["hot_summer", "rainy_season_heavy", "typhoon_risk", "coastal_mild"], -14, 0, 10, -14, "2月下旬〜3月に一部注意", "6月下旬〜9月", "梅雨・台風期に強く注意", "ほぼ不要", "春のスタートはかなり早められますが、夏の高温多湿と台風対策が重要です。", "真夏は暑さで弱る野菜もあるため、遮光や水管理を意識してください。", ["鹿児島", "宮崎", "熊本南部"]),
  okinawa_amami: group("okinawa_amami", "沖縄・奄美・南西諸島", "subtropical", ["hot_summer", "rainy_season_heavy", "typhoon_risk", "coastal_mild"], -30, 0, 20, -30, "基本的に少ない", "長期間注意", "梅雨・台風期に強く注意", "不要", "本州基準の栽培暦とは大きく異なるため、暑さを避けた時期の栽培を優先します。", "本州の春夏秋冬カレンダーをそのまま使わず、暑さを避けた栽培計画にしましょう。", ["那覇", "名護", "宮古島", "石垣島", "奄美"])
};

const prefectureDefaults = {
  北海道: "hokkaido_south_west", 青森県: "tohoku_inland", 岩手県: "tohoku_inland", 宮城県: "tohoku_pacific_coast", 秋田県: "japan_sea_snow_area", 山形県: "tohoku_inland", 福島県: "tohoku_inland",
  茨城県: "kanto_plain", 栃木県: "kanto_plain", 群馬県: "hot_summer_kanto", 埼玉県: "hot_summer_kanto", 千葉県: "kanto_plain", 東京都: "kanto_plain", 神奈川県: "kanto_plain",
  新潟県: "japan_sea_snow_area", 富山県: "japan_sea_snow_area", 石川県: "japan_sea_snow_area", 福井県: "japan_sea_snow_area", 山梨県: "hot_summer_kanto", 長野県: "koshin_highland",
  岐阜県: "tokai_plain", 静岡県: "tokai_plain", 愛知県: "tokai_plain", 三重県: "tokai_plain",
  滋賀県: "kansai_plain", 京都府: "kansai_plain", 大阪府: "kansai_plain", 兵庫県: "kansai_plain", 奈良県: "kansai_plain", 和歌山県: "kansai_plain",
  鳥取県: "japan_sea_snow_area", 島根県: "japan_sea_snow_area", 岡山県: "setouchi", 広島県: "setouchi", 山口県: "setouchi",
  徳島県: "setouchi", 香川県: "setouchi", 愛媛県: "setouchi", 高知県: "kyushu_north_plain",
  福岡県: "kyushu_north_plain", 佐賀県: "kyushu_north_plain", 長崎県: "kyushu_north_plain", 熊本県: "kyushu_north_plain", 大分県: "kyushu_north_plain", 宮崎県: "kyushu_south", 鹿児島県: "kyushu_south", 沖縄県: "okinawa_amami"
};

const cityClimateMappings = [
  cityMap("北海道", "稚内市", "hokkaido_east_north", "high", "北海道北部は春の開始が遅く、秋の冷え込みも早い地域です。短い栽培期間で収穫できる作物を優先しましょう。"),
  cityMap("北海道", "旭川市", "hokkaido_east_north", "high", "旭川市は内陸性で寒暖差が大きく、晩霜と早霜に注意が必要です。"),
  cityMap("北海道", "札幌市", "hokkaido_south_west", "high", "春の作付けは本州より遅めです。寒さに強い野菜や短期収穫の作物を選ぶと育てやすいです。"),
  cityMap("北海道", "函館市", "hokkaido_south_west", "high", "道南でも春は本州より遅めです。遅霜と短い栽培期間を意識しましょう。"),
  cityMap("青森県", "青森市", "tohoku_inland", "high", "春の冷え込みと雪の影響を見ながら、夏野菜は遅めに定植しましょう。"),
  cityMap("岩手県", "盛岡市", "tohoku_inland", "high", "盛岡市は春秋の冷え込みに注意したい地域です。秋冬野菜は早めに準備しましょう。"),
  cityMap("宮城県", "仙台市", "tohoku_pacific_coast", "high", "東北の中では比較的穏やかですが、春の低温と梅雨の長雨に注意しましょう。"),
  cityMap("秋田県", "秋田市", "japan_sea_snow_area", "high", "日本海側の雪・雨の影響を受けやすく、水はけのよい畝づくりが大切です。"),
  cityMap("山形県", "山形市", "tohoku_inland", "high", "内陸性で寒暖差が大きいため、春の低温と夏の高温の両方に注意しましょう。"),
  cityMap("福島県", "会津若松市", "tohoku_inland", "medium_high", "会津は春秋の冷え込みと積雪に注意し、夏野菜は無理な早植えを避けましょう。"),
  cityMap("東京都", "東京23区", "kanto_plain", "high", "標準的な中間地として扱いやすい地域です。夏の高温と梅雨・台風時期の管理に注意しましょう。"),
  cityMap("東京都", "世田谷区", "kanto_plain", "high", "中間地として扱いやすい地域です。真夏の水切れと台風前の支柱固定を重視しましょう。"),
  cityMap("神奈川県", "横浜市", "kanto_plain", "high", "沿岸寄りで比較的穏やかですが、夏の高温、梅雨、台風への備えが必要です。"),
  cityMap("埼玉県", "さいたま市", "hot_summer_kanto", "medium_high", "内陸寄りで夏の高温が強くなりやすい地域です。真夏の葉物と水切れに注意しましょう。"),
  cityMap("群馬県", "前橋市", "hot_summer_kanto", "medium_high", "内陸高温地として、夏は遮光と水管理を重視しましょう。"),
  cityMap("栃木県", "宇都宮市", "kanto_plain", "medium_high", "中間地ですが内陸の冷え込みもあります。春先の最低気温確認を意識しましょう。"),
  cityMap("新潟県", "新潟市", "japan_sea_snow_area", "high", "冬の雪や雨の影響を受けやすい地域です。春の畑準備と排水を意識しましょう。"),
  cityMap("長野県", "長野市", "koshin_highland", "medium_high", "長野市は春の冷え込みと夏の暑さの両方に注意したい地域です。夏野菜は早植えしすぎず、秋冬野菜は早めに準備すると育てやすくなります。", ["late_frost", "early_frost", "inland_cold", "hot_summer", "heavy_snow"]),
  cityMap("長野県", "松本市", "koshin_highland", "high", "内陸性で寒暖差が大きい地域です。春秋の冷え込みと夏の乾きに注意しましょう。"),
  cityMap("山梨県", "甲府市", "hot_summer_kanto", "medium_high", "盆地で夏の高温が強い地域です。秋まきは暑さが落ち着く時期を見極めましょう。"),
  cityMap("愛知県", "名古屋市", "tokai_plain", "high", "春は比較的始めやすいですが、夏の暑さが強い地域です。真夏の葉物と水切れに注意しましょう。"),
  cityMap("静岡県", "静岡市", "tokai_plain", "high", "温暖で始めやすい地域ですが、梅雨と台風時期の管理を重視しましょう。"),
  cityMap("大阪府", "大阪市", "kansai_plain", "high", "中間地として扱いやすい地域ですが、夏の高温が強くなりやすいです。遮光や朝夕の水やりを意識しましょう。"),
  cityMap("京都府", "京都市", "kansai_plain", "medium_high", "盆地で夏は暑く冬は冷えやすい地域です。高温と春秋の冷え込みを両方意識しましょう。"),
  cityMap("兵庫県", "神戸市", "kansai_plain", "high", "沿岸寄りで比較的穏やかですが、台風前の支柱固定と排水確認が大切です。"),
  cityMap("岡山県", "岡山市", "setouchi", "high", "温暖で栽培しやすい一方、夏は乾燥しやすい地域です。水切れ防止と敷きわら・マルチが役立ちます。"),
  cityMap("広島県", "広島市", "setouchi", "high", "温暖ですが夏の乾燥と台風に注意します。水管理と支柱固定を重視しましょう。"),
  cityMap("香川県", "高松市", "setouchi", "high", "瀬戸内らしく乾燥しやすい地域です。敷きわらや朝夕の水やりが役立ちます。"),
  cityMap("福岡県", "福岡市", "kyushu_north_plain", "high", "春の作付けは早めやすい地域です。梅雨・高温・台風時期の管理を意識しましょう。"),
  cityMap("熊本県", "熊本市", "kyushu_north_plain", "high", "暖地ですが夏の高温と多湿に注意します。梅雨前後の排水と風通しを意識しましょう。"),
  cityMap("宮崎県", "宮崎市", "kyushu_south", "high", "暖かく栽培期間を長く取りやすい地域です。高温多湿と台風対策を重視しましょう。"),
  cityMap("鹿児島県", "鹿児島市", "kyushu_south", "high", "暖かく栽培期間を長く取りやすい地域です。ただし夏の高温多湿と台風対策が重要です。"),
  cityMap("沖縄県", "那覇市", "okinawa_amami", "high", "本州とは栽培時期が大きく異なります。暑さを避けた時期の栽培と台風対策を重視しましょう。")
];

const prefectures = Object.keys(prefectureDefaults);
regionGroups.hot_summer_kanto = { ...regionGroups.kanto_plain, id: "hot_summer_kanto", name: "関東・甲府盆地内陸高温地", climateZoneId: "hot_summer", tags: ["hot_summer", "dry_summer", "inland_cold", "typhoon_risk"], spring: -2, autumn: 7, planting: -2, heat: "6月下旬〜9月", advice: "春は標準〜やや早め、真夏は高温障害と水切れを強く警戒します。", beginner: "真夏の葉物は避けるか遮光し、秋まきは暑さが落ち着いてから始めましょう。" };
const regions = cityClimateMappings.map((m) => ({ id: `${m.prefecture}-${m.city}`, prefecture: m.prefecture, city: m.city, regionGroupId: m.regionGroupId }));

const prefectureCoordinates = {
  北海道: [43.0618, 141.3545], 青森県: [40.8244, 140.74], 岩手県: [39.7036, 141.1527], 宮城県: [38.2688, 140.8721], 秋田県: [39.7186, 140.1024], 山形県: [38.2404, 140.3633], 福島県: [37.7608, 140.4747],
  茨城県: [36.3418, 140.4468], 栃木県: [36.5551, 139.8828], 群馬県: [36.3912, 139.0608], 埼玉県: [35.8617, 139.6455], 千葉県: [35.6074, 140.1065], 東京都: [35.6895, 139.6917], 神奈川県: [35.4437, 139.638],
  新潟県: [37.9026, 139.0232], 富山県: [36.6953, 137.2113], 石川県: [36.5947, 136.6256], 福井県: [36.0652, 136.2216], 山梨県: [35.6642, 138.5684], 長野県: [36.6513, 138.181], 岐阜県: [35.4233, 136.7607], 静岡県: [34.9769, 138.3831], 愛知県: [35.1815, 136.9066],
  三重県: [34.7303, 136.5086], 滋賀県: [35.0045, 135.8686], 京都府: [35.0116, 135.7681], 大阪府: [34.6937, 135.5023], 兵庫県: [34.6901, 135.1955], 奈良県: [34.6851, 135.8048], 和歌山県: [34.226, 135.1675],
  鳥取県: [35.5011, 134.2351], 島根県: [35.4723, 133.0505], 岡山県: [34.6618, 133.935], 広島県: [34.3853, 132.4553], 山口県: [34.1785, 131.4737], 徳島県: [34.0703, 134.5548], 香川県: [34.3401, 134.0434], 愛媛県: [33.8416, 132.7661], 高知県: [33.5597, 133.5311],
  福岡県: [33.5904, 130.4017], 佐賀県: [33.2635, 130.3009], 長崎県: [32.7503, 129.8779], 熊本県: [32.8031, 130.7079], 大分県: [33.2382, 131.6126], 宮崎県: [31.9111, 131.4239], 鹿児島県: [31.5602, 130.5581], 沖縄県: [26.2124, 127.6809]
};

const cityCoordinates = {
  "北海道-稚内市": [45.4156, 141.6734], "北海道-旭川市": [43.7706, 142.3649], "北海道-札幌市": [43.0618, 141.3545], "北海道-函館市": [41.7687, 140.7291],
  "青森県-青森市": [40.8244, 140.74], "岩手県-盛岡市": [39.7036, 141.1527], "宮城県-仙台市": [38.2688, 140.8721], "秋田県-秋田市": [39.7186, 140.1024], "山形県-山形市": [38.2404, 140.3633], "福島県-会津若松市": [37.4948, 139.9298],
  "東京都-東京23区": [35.6895, 139.6917], "東京都-世田谷区": [35.6466, 139.6532], "神奈川県-横浜市": [35.4437, 139.638], "埼玉県-さいたま市": [35.8617, 139.6455], "群馬県-前橋市": [36.3912, 139.0608], "栃木県-宇都宮市": [36.5551, 139.8828],
  "新潟県-新潟市": [37.9026, 139.0232], "長野県-長野市": [36.6513, 138.181], "長野県-松本市": [36.238, 137.972], "山梨県-甲府市": [35.6642, 138.5684], "愛知県-名古屋市": [35.1815, 136.9066], "静岡県-静岡市": [34.9769, 138.3831],
  "大阪府-大阪市": [34.6937, 135.5023], "京都府-京都市": [35.0116, 135.7681], "兵庫県-神戸市": [34.6901, 135.1955], "岡山県-岡山市": [34.6618, 133.935], "広島県-広島市": [34.3853, 132.4553], "香川県-高松市": [34.3401, 134.0434],
  "福岡県-福岡市": [33.5904, 130.4017], "熊本県-熊本市": [32.8031, 130.7079], "宮崎県-宮崎市": [31.9111, 131.4239], "鹿児島県-鹿児島市": [31.5602, 130.5581], "沖縄県-那覇市": [26.2124, 127.6809]
};

function group(id, name, climateZoneId, tags, spring, summer, autumn, planting, frost, heat, rainy, snow, advice, beginner, examples) {
  return { id, name, climateZoneId, tags, spring, summer, autumn, planting, frost, heat, rainy, snow, advice, beginner, examples };
}

function cityMap(prefecture, city, regionGroupId, confidence, beginnerMessage, tags = null) {
  return { prefecture, city, regionGroupId, confidence, beginnerMessage, tags };
}

const crops = [
  crop("mini-tomato", "ミニトマト", "ナス科", "果菜類", "🍅", [3, 4, 5], [4, 5, 6], [18, 30], [15, 25], 10, 33, [90, 120], "中", true, false, 3, "週2回", ["ウリ科", "アブラナ科", "ヒガンバナ科"], ["ナス科"]),
  crop("tomato", "トマト", "ナス科", "果菜類", "🍅", [3, 4, 5], [4, 5, 6], [18, 30], [15, 25], 10, 33, [100, 130], "中", true, false, 3, "週2回", ["ウリ科", "アブラナ科"], ["ナス科"]),
  crop("eggplant", "ナス", "ナス科", "果菜類", "🍆", [3, 4], [5, 6], [20, 30], [18, 30], 12, 35, [90, 130], "中", true, false, 3, "週2回", ["マメ科", "アブラナ科"], ["ナス科"]),
  crop("pepper", "ピーマン", "ナス科", "果菜類", "🫑", [3, 4], [5, 6], [20, 30], [18, 30], 12, 34, [90, 130], "中", true, false, 3, "週2回", ["マメ科", "アブラナ科"], ["ナス科"]),
  crop("cucumber", "キュウリ", "ウリ科", "果菜類", "🥒", [4, 5, 6], [5, 6, 7], [25, 30], [17, 28], 10, 35, [55, 75], "中", true, false, 2, "週3回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("okra", "オクラ", "アオイ科", "果菜類", "🌱", [5, 6], [5, 6, 7], [25, 30], [20, 30], 10, 35, [70, 95], "やさしい", false, false, 1, "週1回", ["アブラナ科", "ヒガンバナ科"], ["アオイ科"]),
  crop("edamame", "エダマメ", "マメ科", "豆類", "🫛", [4, 5, 6, 7], [4, 5, 6, 7], [25, 30], [20, 25], 10, 30, [75, 95], "やさしい", false, false, 2, "週1回", ["アブラナ科", "ナス科"], ["マメ科"]),
  crop("snap-bean", "インゲン", "マメ科", "豆類", "🫛", [4, 5, 6, 7], [4, 5, 6, 7], [23, 25], [15, 25], 10, 25, [55, 75], "やさしい", true, false, 2, "週2回", ["アブラナ科"], ["マメ科"]),
  crop("pea", "エンドウ", "マメ科", "豆類", "🫛", [10, 11], [10, 11], [18, 20], [12, 20], 5, 28, [150, 190], "中", true, true, 3, "週1回", ["アブラナ科"], ["マメ科"]),
  crop("potato", "ジャガイモ", "ナス科", "いも類", "🥔", [2, 3, 8], [2, 3, 8], [15, 20], [15, 20], 5, 25, [90, 110], "やさしい", false, false, 3, "週1回", ["アブラナ科", "マメ科"], ["ナス科"]),
  crop("sweet-potato", "サツマイモ", "ヒルガオ科", "いも類", "🍠", [5, 6], [5, 6], [20, 30], [20, 30], 12, 35, [120, 150], "やさしい", false, false, 1, "週1回", ["アブラナ科", "マメ科"], ["ヒルガオ科"]),
  crop("daikon", "ダイコン", "アブラナ科", "根菜類", "🌿", [3, 4, 8, 9, 10], [3, 4, 8, 9, 10], [15, 25], [15, 22], 5, 30, [60, 90], "やさしい", false, false, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("turnip", "カブ", "アブラナ科", "根菜類", "🌿", [3, 4, 9, 10], [3, 4, 9, 10], [15, 25], [15, 22], 5, 30, [45, 70], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("carrot", "ニンジン", "セリ科", "根菜類", "🥕", [3, 4, 7, 8], [3, 4, 7, 8], [15, 25], [15, 23], 5, 30, [100, 130], "中", false, false, 2, "週1回", ["アブラナ科", "マメ科"], ["セリ科"]),
  crop("komatsuna", "コマツナ", "アブラナ科", "葉菜類", "🥬", [3, 4, 5, 9, 10, 11], [3, 4, 5, 9, 10, 11], [15, 25], [15, 22], 3, 30, [30, 45], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("spinach", "ホウレンソウ", "ヒユ科", "葉菜類", "🥬", [3, 4, 9, 10, 11], [3, 4, 9, 10, 11], [15, 20], [15, 20], 5, 25, [45, 60], "やさしい", false, true, 1, "週1回", ["ナス科", "ウリ科"], ["ヒユ科"]),
  crop("lettuce", "レタス", "キク科", "葉菜類", "🥬", [3, 4, 8, 9], [4, 5, 9, 10], [15, 20], [18, 23], 10, 25, [50, 70], "中", false, true, 1, "週1回", ["マメ科", "ナス科"], ["キク科"]),
  crop("cabbage", "キャベツ", "アブラナ科", "葉菜類", "🥬", [2, 3, 7, 8], [3, 4, 8, 9], [15, 25], [15, 20], 5, 28, [80, 120], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("broccoli", "ブロッコリー", "アブラナ科", "葉菜類", "🥦", [2, 3, 7, 8], [3, 4, 8, 9], [20, 25], [15, 20], 5, 25, [90, 130], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("welsh-onion", "ネギ", "ヒガンバナ科", "香味野菜", "🌿", [3, 4, 9], [4, 5, 10], [15, 25], [15, 25], 2, 32, [120, 180], "中", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒガンバナ科"]),
  crop("shiso", "シソ", "シソ科", "香味野菜", "🌿", [4, 5, 6], [5, 6], [20, 25], [18, 28], 10, 33, [60, 90], "やさしい", false, false, 1, "週1回", ["アブラナ科"], ["シソ科"]),
  crop("basil", "バジル", "シソ科", "香味野菜", "🌿", [4, 5, 6], [5, 6], [20, 25], [20, 30], 12, 33, [55, 80], "やさしい", false, false, 1, "週1回", ["アブラナ科"], ["シソ科"]),
  crop("garlic", "ニンニク", "ヒガンバナ科", "香味野菜", "🧄", [9, 10], [9, 10], [15, 20], [12, 22], -5, 28, [220, 260], "やさしい", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒガンバナ科"]),
  crop("onion", "タマネギ", "ヒガンバナ科", "根菜類", "🧅", [9, 10], [11, 12], [15, 20], [12, 22], -5, 28, [180, 230], "中", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒガンバナ科"]),
  crop("zucchini", "ズッキーニ", "ウリ科", "果菜類", "🌱", [4, 5], [5, 6], [25, 30], [18, 25], 10, 30, [45, 60], "やさしい", false, false, 2, "週2回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("pumpkin", "カボチャ", "ウリ科", "果菜類", "🎃", [3, 4, 5], [5, 6], [25, 30], [17, 25], 10, 32, [90, 120], "やさしい", false, false, 2, "週1回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("bitter-melon", "ゴーヤ", "ウリ科", "果菜類", "🌱", [4, 5], [5, 6], [25, 30], [20, 30], 12, 35, [80, 110], "中", true, false, 2, "週2回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("watermelon", "スイカ", "ウリ科", "果菜類", "🍉", [3, 4], [5, 6], [25, 30], [25, 30], 15, 35, [85, 110], "中", false, false, 3, "週2回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("melon", "メロン", "ウリ科", "果菜類", "🍈", [3, 4], [5, 6], [25, 30], [25, 30], 15, 35, [85, 110], "中", true, true, 3, "週2回", ["マメ科", "アブラナ科"], ["ウリ科"]),
  crop("corn", "トウモロコシ", "イネ科", "穀物", "🌽", [4, 5, 6], [4, 5, 6], [25, 30], [20, 30], 10, 35, [80, 100], "やさしい", false, false, 1, "週1回", ["アブラナ科", "マメ科"], ["イネ科"]),
  crop("hakusai", "ハクサイ", "アブラナ科", "葉菜類", "🥬", [8, 9], [8, 9], [20, 25], [15, 20], 5, 28, [60, 90], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("mizuna", "ミズナ", "アブラナ科", "葉菜類", "🥬", [3, 4, 9, 10], [3, 4, 9, 10], [15, 25], [15, 20], 5, 28, [35, 55], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("mibuna", "ミブナ", "アブラナ科", "葉菜類", "🥬", [3, 4, 9, 10], [3, 4, 9, 10], [15, 25], [15, 20], 5, 28, [35, 55], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("shungiku", "シュンギク", "キク科", "葉菜類", "🥬", [3, 4, 9, 10], [3, 4, 9, 10], [15, 20], [15, 20], 5, 25, [35, 60], "やさしい", false, true, 1, "週1回", ["マメ科", "ナス科"], ["キク科"]),
  crop("chingensai", "チンゲンサイ", "アブラナ科", "葉菜類", "🥬", [3, 4, 5, 9, 10], [3, 4, 5, 9, 10], [20, 25], [15, 20], 5, 28, [40, 60], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("celery", "セロリ", "セリ科", "香味野菜", "🌿", [3, 4], [5, 6], [15, 20], [15, 20], 5, 25, [120, 160], "中", false, true, 2, "週2回", ["アブラナ科", "マメ科"], ["セリ科"]),
  crop("parsley", "パセリ", "セリ科", "香味野菜", "🌿", [3, 4, 9], [4, 5, 10], [15, 20], [15, 20], 5, 25, [70, 100], "やさしい", false, true, 2, "週1回", ["アブラナ科", "マメ科"], ["セリ科"]),
  crop("asparagus", "アスパラガス", "キジカクシ科", "香味野菜", "🌿", [3, 4], [3, 4], [20, 25], [15, 25], 0, 30, [365, 730], "中", false, false, 5, "週1回", ["アブラナ科", "マメ科"], ["キジカクシ科"]),
  crop("strawberry", "イチゴ", "バラ科", "果菜類", "🍓", [9, 10], [10, 11], [20, 25], [15, 25], 0, 30, [180, 220], "中", false, true, 3, "週2回", ["アブラナ科", "マメ科"], ["バラ科"]),
  crop("fava-bean", "ソラマメ", "マメ科", "豆類", "🫘", [10, 11], [10, 11], [15, 20], [15, 20], 0, 25, [170, 210], "中", true, true, 3, "週1回", ["アブラナ科"], ["マメ科"]),
  crop("peanut", "ラッカセイ", "マメ科", "豆類", "🥜", [5, 6], [5, 6], [25, 30], [20, 30], 15, 35, [120, 150], "やさしい", false, false, 2, "週1回", ["アブラナ科"], ["マメ科"]),
  crop("satoimo", "サトイモ", "サトイモ科", "いも類", "🌱", [4, 5], [4, 5], [25, 30], [20, 30], 10, 35, [150, 180], "やさしい", false, false, 2, "週2回", ["アブラナ科", "マメ科"], ["サトイモ科"]),
  crop("ginger", "ショウガ", "ショウガ科", "香味野菜", "🌿", [4, 5], [4, 5], [25, 30], [20, 30], 15, 35, [150, 180], "中", false, false, 2, "週1回", ["アブラナ科", "マメ科"], ["ショウガ科"]),
  crop("nagaimo", "ナガイモ", "ヤマノイモ科", "いも類", "🌱", [4, 5], [4, 5], [20, 25], [20, 25], 10, 30, [180, 220], "中", true, false, 3, "週1回", ["アブラナ科", "マメ科"], ["ヤマノイモ科"]),
  crop("chive", "ニラ", "ヒガンバナ科", "香味野菜", "🌿", [3, 4, 9], [4, 5, 9], [20, 25], [15, 25], 0, 32, [90, 120], "やさしい", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒガンバナ科"]),
  crop("myoga", "ミョウガ", "ショウガ科", "香味野菜", "🌿", [3, 4], [3, 4], [20, 25], [15, 25], 5, 30, [150, 220], "やさしい", false, false, 2, "週1回", ["アブラナ科", "マメ科"], ["ショウガ科"]),
  crop("rakkyo", "ラッキョウ", "ヒガンバナ科", "香味野菜", "🌿", [8, 9], [8, 9], [20, 25], [15, 25], 0, 30, [240, 280], "やさしい", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒガンバナ科"]),
  crop("chili-pepper", "トウガラシ", "ナス科", "果菜類", "🌶", [3, 4], [5, 6], [25, 30], [20, 30], 12, 35, [100, 130], "中", true, false, 3, "週2回", ["マメ科", "アブラナ科"], ["ナス科"]),
  crop("paprika", "パプリカ", "ナス科", "果菜類", "🫑", [3, 4], [5, 6], [25, 30], [20, 30], 12, 32, [110, 150], "中", true, false, 3, "週2回", ["マメ科", "アブラナ科"], ["ナス科"]),
  crop("cauliflower", "カリフラワー", "アブラナ科", "葉菜類", "🥬", [2, 3, 7, 8], [3, 4, 8, 9], [20, 25], [15, 20], 5, 28, [85, 120], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("kohlrabi", "コールラビ", "アブラナ科", "根菜類", "🌿", [3, 4, 8, 9], [4, 5, 9, 10], [18, 25], [15, 20], 5, 28, [55, 75], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("romanesco", "ロマネスコ", "アブラナ科", "葉菜類", "🥬", [7, 8], [8, 9], [20, 25], [15, 20], 5, 28, [100, 140], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("salad-na", "サラダ菜", "キク科", "葉菜類", "🥬", [3, 4, 5, 9, 10], [3, 4, 5, 9, 10], [15, 20], [15, 20], 5, 25, [35, 55], "やさしい", false, true, 1, "週1回", ["マメ科", "ナス科"], ["キク科"]),
  crop("chima-sanchu", "チマサンチュ", "キク科", "葉菜類", "🥬", [3, 4, 5, 8, 9, 10], [4, 5, 9, 10], [15, 20], [15, 22], 5, 28, [45, 70], "やさしい", false, true, 1, "週1回", ["マメ科", "ナス科"], ["キク科"]),
  crop("mustard-greens", "カラシナ", "アブラナ科", "葉菜類", "🥬", [3, 4, 9, 10], [3, 4, 9, 10], [15, 25], [15, 22], 5, 28, [35, 60], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("nabana", "ナバナ", "アブラナ科", "葉菜類", "🌿", [9, 10], [10, 11], [15, 25], [10, 20], 0, 25, [100, 150], "中", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("beets", "ビーツ", "ヒユ科", "根菜類", "🌿", [3, 4, 9, 10], [3, 4, 9, 10], [15, 25], [15, 21], 5, 28, [60, 90], "中", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒユ科"]),
  crop("swiss-chard", "フダンナ", "ヒユ科", "葉菜類", "🥬", [3, 4, 5, 9, 10], [3, 4, 5, 9, 10], [20, 25], [15, 25], 5, 32, [45, 75], "やさしい", false, false, 1, "週1回", ["ナス科", "ウリ科"], ["ヒユ科"]),
  crop("mitsuba", "ミツバ", "セリ科", "香味野菜", "🌿", [3, 4, 9], [4, 5, 10], [15, 20], [15, 20], 3, 28, [60, 90], "中", false, true, 2, "週1回", ["アブラナ科", "マメ科"], ["セリ科"]),
  crop("molokheiya", "モロヘイヤ", "アオイ科", "葉菜類", "🌿", [4, 5, 6], [5, 6, 7], [25, 30], [25, 30], 15, 35, [60, 90], "やさしい", false, false, 1, "週1回", ["アブラナ科", "ヒガンバナ科"], ["アオイ科"]),
  crop("ensai", "エンサイ", "ヒルガオ科", "葉菜類", "🌿", [5, 6, 7], [5, 6, 7], [20, 30], [25, 30], 15, 35, [50, 80], "やさしい", false, false, 1, "週1回", ["アブラナ科", "マメ科"], ["ヒルガオ科"]),
  crop("ice-plant", "アイスプラント", "ハマミズナ科", "葉菜類", "🌿", [3, 4, 9, 10], [4, 5, 10, 11], [15, 20], [5, 25], 3, 28, [70, 100], "中", false, true, 1, "週1回", ["マメ科", "ナス科"], ["ハマミズナ科"]),
  crop("treviso", "トレビス", "キク科", "葉菜類", "🥬", [7, 8], [8, 9], [15, 25], [15, 20], 0, 28, [90, 130], "中", false, true, 1, "週1回", ["マメ科", "ナス科"], ["キク科"]),
  crop("chijimina", "チヂミナ", "アブラナ科", "葉菜類", "🥬", [9, 10], [9, 10], [15, 25], [10, 20], 0, 25, [45, 70], "やさしい", false, true, 2, "週1回", ["マメ科", "ナス科"], ["アブラナ科"]),
  crop("burdock", "ゴボウ", "キク科", "根菜類", "🌿", [3, 4, 5, 9], [3, 4, 5, 9], [20, 25], [20, 25], 5, 30, [100, 150], "中", false, false, 2, "週1回", ["マメ科", "ナス科"], ["キク科"])
];

const generatedCropIconIds = new Set([]);

const harvestAfterPlantingDays = {
  "mini-tomato": [45, 135],
  tomato: [50, 135],
  eggplant: [45, 150],
  pepper: [45, 130],
  "chili-pepper": [50, 135],
  paprika: [60, 150],
  cucumber: [35, 100],
  okra: [45, 115],
  zucchini: [35, 80],
  pumpkin: [75, 120],
  "bitter-melon": [60, 130],
  watermelon: [75, 115],
  melon: [75, 115],
  corn: [70, 105],
  lettuce: [35, 75],
  cabbage: [60, 120],
  broccoli: [65, 125],
  cauliflower: [60, 90],
  kohlrabi: [35, 55],
  romanesco: [75, 105],
  "salad-na": [25, 40],
  "chima-sanchu": [30, 55],
  nabana: [80, 120],
  hakusai: [45, 90],
  celery: [75, 135],
  mitsuba: [45, 70],
  molokheiya: [35, 70],
  ensai: [35, 65],
  "ice-plant": [45, 80],
  treviso: [70, 100],
  shiso: [35, 120],
  basil: [30, 100],
  parsley: [45, 120],
  chive: [60, 120]
};

const plantingBaseCropIds = new Set([
  ...Object.keys(harvestAfterPlantingDays),
  "potato",
  "sweet-potato",
  "garlic",
  "onion",
  "strawberry",
  "satoimo",
  "ginger",
  "nagaimo",
  "myoga",
  "rakkyo",
  "welsh-onion",
  "asparagus"
]);

const directSownOnlyCropIds = new Set([
  "daikon",
  "turnip",
  "carrot",
  "komatsuna",
  "spinach",
  "mizuna",
  "mibuna",
  "shungiku",
  "chingensai",
  "mustard-greens",
  "beets",
  "swiss-chard",
  "chijimina",
  "burdock",
  "edamame",
  "snap-bean",
  "pea",
  "fava-bean",
  "peanut"
]);

const directSowPreferredCropIds = new Set([
  ...directSownOnlyCropIds,
  "corn",
  "okra",
  "cucumber",
  "zucchini",
  "pumpkin",
  "bitter-melon",
  "kohlrabi",
  "salad-na",
  "chima-sanchu",
  "mitsuba",
  "molokheiya",
  "ensai",
  "ice-plant"
]);

const nurseryPreferredCropIds = new Set([
  ...Object.keys(harvestAfterPlantingDays),
  "onion",
  "strawberry",
  "welsh-onion",
  "asparagus"
]);

const plantingMaterialCropIds = new Set([
  "potato",
  "sweet-potato",
  "garlic",
  "satoimo",
  "ginger",
  "nagaimo",
  "myoga",
  "rakkyo"
]);

const startMethodDefinitions = {
  planning: {
    value: "planning",
    status: "育てたい",
    title: "これから育てたい",
    body: "まだ始めていない作物。適期と始め方だけ先に確認します。"
  },
  direct: {
    value: "direct",
    status: "種まき済み",
    title: "畑・プランターに直接まく",
    body: "直播向きの作物。種まき日を基準に作業予定を作ります。"
  },
  nursery: {
    value: "nursery",
    status: "種まき済み",
    title: "ポットにまいて育苗する",
    body: "苗を育ててから植える作物。種まき日と定植日を分けて管理します。"
  },
  seedling: {
    value: "seedling",
    status: "苗を植えた",
    title: "苗を植える",
    body: "購入苗や育苗済みの苗を植えた日から予定を作ります。"
  },
  material: {
    value: "material",
    status: "苗を植えた",
    title: "種イモ・球根などを植える",
    body: "種イモ、球根、つる苗などを植えた日から予定を作ります。"
  }
};

const cropStatusOptions = Object.values(startMethodDefinitions);

const cropSearchAliases = {
  "mini-tomato": ["みにとまと", "ミニトマト", "プチトマト", "ぷちとまと", "小型トマト", "こがたとまと"],
  tomato: ["とまと", "トマト", "蕃茄", "赤茄子", "あかなす"],
  eggplant: ["なす", "ナス", "茄子", "なすび", "ナスビ"],
  pepper: ["ぴーまん", "ピーマン", "青椒", "あおとうがらし", "青唐辛子"],
  cucumber: ["きゅうり", "キュウリ", "胡瓜", "きうり"],
  okra: ["おくら", "オクラ", "陸蓮根", "おかれんこん"],
  edamame: ["えだまめ", "エダマメ", "枝豆"],
  "snap-bean": ["いんげん", "インゲン", "隠元", "いんげんまめ", "インゲンマメ", "さやいんげん"],
  pea: ["えんどう", "エンドウ", "豌豆", "えんどうまめ", "エンドウマメ", "さやえんどう"],
  potato: ["じゃがいも", "ジャガイモ", "馬鈴薯", "ばれいしょ", "ジャガ芋"],
  "sweet-potato": ["さつまいも", "サツマイモ", "薩摩芋", "甘藷", "かんしょ"],
  daikon: ["だいこん", "ダイコン", "大根"],
  turnip: ["かぶ", "カブ", "蕪"],
  carrot: ["にんじん", "ニンジン", "人参"],
  komatsuna: ["こまつな", "コマツナ", "小松菜"],
  spinach: ["ほうれんそう", "ホウレンソウ", "ほうれん草", "菠薐草"],
  lettuce: ["れたす", "レタス", "萵苣", "ちしゃ", "チシャ"],
  cabbage: ["きゃべつ", "キャベツ", "甘藍", "かんらん"],
  broccoli: ["ぶろっこりー", "ブロッコリー", "緑花椰菜"],
  "welsh-onion": ["ねぎ", "ネギ", "葱", "長ネギ", "ながねぎ"],
  shiso: ["しそ", "シソ", "紫蘇", "大葉", "おおば"],
  basil: ["ばじる", "バジル"],
  garlic: ["にんにく", "ニンニク", "大蒜"],
  onion: ["たまねぎ", "タマネギ", "玉ねぎ", "玉葱"],
  zucchini: ["ずっきーに", "ズッキーニ", "つるなしかぼちゃ"],
  pumpkin: ["かぼちゃ", "カボチャ", "南瓜"],
  "bitter-melon": ["ごーや", "ゴーヤ", "にがうり", "ニガウリ", "苦瓜"],
  watermelon: ["すいか", "スイカ", "西瓜"],
  melon: ["めろん", "メロン", "甜瓜"],
  corn: ["とうもろこし", "トウモロコシ", "玉蜀黍", "とうきび", "コーン"],
  hakusai: ["はくさい", "ハクサイ", "白菜"],
  mizuna: ["みずな", "ミズナ", "水菜", "京菜"],
  mibuna: ["みぶな", "ミブナ", "壬生菜"],
  shungiku: ["しゅんぎく", "シュンギク", "春菊", "菊菜"],
  chingensai: ["ちんげんさい", "チンゲンサイ", "青梗菜"],
  celery: ["せろり", "セロリ", "塘蒿"],
  parsley: ["ぱせり", "パセリ", "和蘭芹"],
  asparagus: ["あすぱらがす", "アスパラガス", "アスパラ", "竜髭菜"],
  strawberry: ["いちご", "イチゴ", "苺"],
  "fava-bean": ["そらまめ", "ソラマメ", "空豆", "蚕豆"],
  peanut: ["らっかせい", "ラッカセイ", "落花生", "ピーナッツ"],
  satoimo: ["さといも", "サトイモ", "里芋"],
  ginger: ["しょうが", "ショウガ", "生姜"],
  nagaimo: ["ながいも", "ナガイモ", "長芋"],
  chive: ["にら", "ニラ", "韮"],
  myoga: ["みょうが", "ミョウガ", "茗荷"],
  rakkyo: ["らっきょう", "ラッキョウ", "辣韮"],
  "chili-pepper": ["とうがらし", "トウガラシ", "唐辛子", "鷹の爪", "たかのつめ"],
  paprika: ["ぱぷりか", "パプリカ"],
  cauliflower: ["かりふらわー", "カリフラワー", "花椰菜", "はなやさい"],
  kohlrabi: ["こーるらび", "コールラビ", "蕪甘藍", "かぶかんらん"],
  romanesco: ["ろまねすこ", "ロマネスコ", "ロマネスコカリフラワー"],
  "salad-na": ["さらだな", "サラダ菜", "サラダナ", "ちしゃ", "チシャ"],
  "chima-sanchu": ["ちまさんちゅ", "チマサンチュ", "サンチュ", "さんちゅ", "包菜", "つつみな"],
  "mustard-greens": ["からしな", "カラシナ", "からし菜", "芥子菜", "辛子菜"],
  nabana: ["なばな", "ナバナ", "菜花", "菜の花", "なのはな"],
  beets: ["びーつ", "ビーツ", "ビート", "てんさい", "甜菜", "火焔菜"],
  "swiss-chard": ["ふだんな", "フダンナ", "不断草", "スイスチャード", "すいすちゃーど"],
  mitsuba: ["みつば", "ミツバ", "三つ葉", "三葉"],
  molokheiya: ["もろへいや", "モロヘイヤ", "縞綱麻", "しまつなそ"],
  ensai: ["えんさい", "エンサイ", "空芯菜", "くうしんさい", "ヨウサイ", "ようさい"],
  "ice-plant": ["あいすぷらんと", "アイスプラント", "クリスタルリーフ", "ぷっちーな"],
  treviso: ["とれびす", "トレビス", "ラディッキオ", "赤チコリ", "あかちこり"],
  chijimina: ["ちぢみな", "チヂミナ", "縮み菜", "ちぢみ菜"],
  burdock: ["ごぼう", "ゴボウ", "牛蒡"]
};

const defaultState = {
  onboarded: false,
  view: "home",
  selectedCropId: null,
  calendarOffset: 0,
  calendarView: "month",
  selectedCalendarDate: iso(today),
  regionId: "東京都-東京23区",
  prefecture: "東京都",
  city: "東京23区",
  manualRegionGroupId: "",
  locationType: "貸し農園",
  experience: "初心者",
  crops: [],
  history: [],
  notificationMode: "important",
  notificationTime: "07:30",
  premium: false,
  weatherStatus: "idle",
  weatherForecast: null,
  weatherFetchedAt: null,
  weatherLocationKey: "",
  weatherError: "",
  weatherCache: null,
  weatherCacheFetchedAt: null,
  weatherCacheVersion: WEATHER_CACHE_VERSION,
  form: {
    search: "",
    category: "すべて",
    selectedMasterId: "mini-tomato"
  },
  toast: null
};

let state = loadState();
let weatherFetchInFlight = "";
let weatherCacheInFlight = false;
let weatherCacheAttemptBucket = "";
let previousView = state.view;

const seasonVisuals = {
  earlySpring: { name: "初春", file: "early-spring.png" },
  spring: { name: "春", file: "spring.png" },
  earlySummer: { name: "初夏", file: "early-summer.png" },
  summer: { name: "夏", file: "summer.png" },
  autumn: { name: "秋", file: "autumn.png" },
  lateAutumn: { name: "晩秋", file: "late-autumn.png" },
  winter: { name: "冬", file: "winter.png" }
};

function crop(id, name, family, category, icon, seedMonths, plantingMonths, germ, growth, low, high, harvestDays, difficulty, support, tunnel, rotation, care, next, avoid) {
  return {
    id,
    name,
    family,
    category,
    icon,
    seedMonths,
    plantingMonths,
    germinationTemp: germ,
    growthTemp: growth,
    lowTempRisk: low,
    highTempRisk: high,
    harvestDays,
    difficulty,
    supportRequired: support,
    tunnelRequired: tunnel,
    rotationYears: rotation,
    weeklyCareLevel: care,
    recommendedNextFamilies: next,
    avoidNextFamilies: avoid,
    beginnerFriendly: difficulty === "やさしい"
  };
}

function cropIcon(id, className = "crop-icon") {
  if (generatedCropIconIds.has(id)) {
    return h("div", { class: className, "aria-hidden": "true", html: cropIconSvg(id) });
  }
  return h("div", { class: className, "aria-hidden": "true" }, [
    h("img", { src: `./assets/vegetables/${id}.png`, alt: "", loading: "lazy", draggable: "false" })
  ]);
}

function taskIcon(id, className = "task-icon") {
  return h("div", { class: className, "aria-hidden": "true" }, [
    h("img", { src: `./assets/tasks/${id}.png`, alt: "", loading: "lazy", draggable: "false" })
  ]);
}

function weatherIcon(id, className = "weather-main-icon") {
  return h("div", { class: className, "aria-hidden": "true" }, [
    h("img", { src: `./assets/weather/${id}.png`, alt: "", loading: "lazy", draggable: "false" })
  ]);
}

function cropIconSvg(id) {
  const common = "viewBox='0 0 64 64' role='img' focusable='false'";
  const svg = {
    "mini-tomato": `<svg ${common}><path d='M32 20c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9Z' fill='#df4b35'/><circle cx='20' cy='35' r='8' fill='#e45a3d'/><circle cx='44' cy='36' r='8' fill='#d63f31'/><path d='M31 20c0-5 3-9 8-12M31 21c-4-4-9-5-14-4M32 21l-3-8 7 5 6-3-3 7' fill='none' stroke='#2f7d3a' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
    tomato: `<svg ${common}><circle cx='32' cy='36' r='20' fill='#d94b35'/><path d='M32 20l-5-9 8 5 7-5-3 9 8 2-9 3-6 8-5-8-9-3 8-2Z' fill='#3f8d3f'/><path d='M23 32c3-5 8-8 15-8' fill='none' stroke='#f38b6b' stroke-width='4' stroke-linecap='round'/></svg>`,
    eggplant: `<svg ${common}><path d='M42 18c12 11 5 34-13 37-9 1-16-5-15-14 2-15 17-24 28-23Z' fill='#5d3a93'/><path d='M35 16l-4-8 9 5 8-3-4 9 7 4-10 1-7 7-1-9-9-5Z' fill='#4a8d3a'/><path d='M23 44c9-3 15-11 17-22' fill='none' stroke='#7b58b3' stroke-width='4' stroke-linecap='round'/></svg>`,
    pepper: `<svg ${common}><path d='M31 15c-3 4-7 5-10 6-9 4-12 21-3 31 7 8 13 0 14 0 2 0 8 8 15 0 9-10 6-27-3-31-4-1-8-2-13-6Z' fill='#49a84f'/><path d='M31 16c2-7 8-8 13-7' fill='none' stroke='#2d7433' stroke-width='5' stroke-linecap='round'/><path d='M31 26c-4 8-4 17 0 25M39 25c5 8 5 18 0 26' fill='none' stroke='#74c673' stroke-width='3' stroke-linecap='round'/></svg>`,
    cucumber: `<svg ${common}><path d='M14 42c8-18 24-29 40-24 2 18-10 31-31 34-7 1-11-3-9-10Z' fill='#5fbf55'/><path d='M16 44c13-1 28-10 37-25' fill='none' stroke='#2e8d43' stroke-width='4' stroke-linecap='round'/><g fill='#d9f1a5'><circle cx='26' cy='39' r='2'/><circle cx='34' cy='33' r='2'/><circle cx='42' cy='26' r='2'/><circle cx='21' cy='46' r='2'/></g></svg>`,
    okra: `<svg ${common}><path d='M19 52l8-34 9-7 10 8-1 35Z' fill='#60aa43'/><path d='M28 18l7 36M37 19l1 35M22 39h23' fill='none' stroke='#d8ed9a' stroke-width='3' stroke-linecap='round'/><path d='M30 10l6 3 2 7-7 3-7-4 1-6Z' fill='#3f8d3f'/></svg>`,
    "edamame": `<svg ${common}><path d='M11 40c12-21 34-27 44-18-4 20-26 29-44 18Z' fill='#79bf54'/><g fill='#d8ef9d'><circle cx='25' cy='37' r='6'/><circle cx='35' cy='31' r='6'/><circle cx='45' cy='25' r='6'/></g><path d='M13 40c15-2 29-10 42-18' fill='none' stroke='#3f8d3f' stroke-width='3' stroke-linecap='round'/></svg>`,
    "snap-bean": `<svg ${common}><path d='M13 45c15-23 30-31 42-25-5 21-22 32-42 25Z' fill='#57af45'/><path d='M15 44c13-3 26-11 38-24' fill='none' stroke='#d6ee9a' stroke-width='4' stroke-linecap='round'/><circle cx='29' cy='36' r='3' fill='#368438'/><circle cx='39' cy='29' r='3' fill='#368438'/></svg>`,
    pea: `<svg ${common}><path d='M14 42c14-25 31-28 42-18-6 19-26 27-42 18Z' fill='#6fbe55'/><circle cx='25' cy='38' r='5' fill='#cce98b'/><circle cx='36' cy='31' r='5' fill='#cce98b'/><path d='M48 21c5-7 1-12-6-10' fill='none' stroke='#3f8d3f' stroke-width='4' stroke-linecap='round'/></svg>`,
    potato: `<svg ${common}><path d='M18 25c8-13 31-10 36 5 5 14-7 26-24 25-16-1-20-17-12-30Z' fill='#b88758'/><g fill='#8b603b'><circle cx='28' cy='31' r='2'/><circle cx='39' cy='39' r='2'/><circle cx='25' cy='45' r='2'/></g><path d='M19 30c9-6 22-8 32 2' fill='none' stroke='#d1a06c' stroke-width='4' stroke-linecap='round'/></svg>`,
    "sweet-potato": `<svg ${common}><path d='M14 42c7-20 27-31 43-23 1 18-20 32-36 31-6-1-9-3-7-8Z' fill='#8b4a8f'/><path d='M21 44c11-10 22-18 34-24' fill='none' stroke='#c778a9' stroke-width='4' stroke-linecap='round'/><path d='M20 30c-1-7 3-13 11-16' fill='none' stroke='#4a8d3a' stroke-width='4' stroke-linecap='round'/></svg>`,
    daikon: `<svg ${common}><path d='M30 21c14 4 13 24 1 35-12-11-13-31-1-35Z' fill='#f7f5e9'/><path d='M31 21c-8-5-13-10-14-17M32 21c3-9 10-14 18-16M32 21c-2-8 2-14 8-18' fill='none' stroke='#4a9a42' stroke-width='5' stroke-linecap='round'/><path d='M31 36c4 0 8 1 11 3' fill='none' stroke='#d9d4c3' stroke-width='3' stroke-linecap='round'/></svg>`,
    turnip: `<svg ${common}><path d='M18 30c4-13 24-16 31-4 6 10-1 26-16 31-14-5-20-16-15-27Z' fill='#f8f5ea'/><path d='M20 31c6-7 22-8 29-2' fill='none' stroke='#c56aa5' stroke-width='8' stroke-linecap='round'/><path d='M31 22c-7-7-10-13-8-18M34 22c2-10 9-15 18-17' fill='none' stroke='#4b9a3f' stroke-width='5' stroke-linecap='round'/></svg>`,
    carrot: `<svg ${common}><path d='M27 19c10 5 14 19 8 39-16-12-20-25-8-39Z' fill='#ee8b2f'/><path d='M28 19c-8-7-9-13-5-17M30 19c-1-9 4-15 12-17M33 20c6-8 13-10 20-7' fill='none' stroke='#4a9a42' stroke-width='5' stroke-linecap='round'/><path d='M25 34l12-3M27 44l9-2' stroke='#c96b20' stroke-width='3' stroke-linecap='round'/></svg>`,
    komatsuna: `<svg ${common}><path d='M20 54c2-19-5-30-11-38 14 2 23 14 23 38Z' fill='#63b95a'/><path d='M37 54c-1-18 6-32 19-40 2 18-5 34-19 40Z' fill='#4ea749'/><path d='M31 55V18' stroke='#2f7d3a' stroke-width='5' stroke-linecap='round'/></svg>`,
    spinach: `<svg ${common}><path d='M14 52c5-20 3-33-5-42 17 4 24 22 20 43Z' fill='#2f8f4b'/><path d='M34 54c-4-21 4-38 20-45 4 19-3 37-20 45Z' fill='#267942'/><path d='M25 54c1-18 0-32-2-45' stroke='#7dcf72' stroke-width='4' stroke-linecap='round'/></svg>`,
    lettuce: `<svg ${common}><circle cx='32' cy='35' r='22' fill='#bddd74'/><path d='M13 36c11-9 21-8 28 3M25 16c10 9 12 21 4 36M49 28c-13 3-21 12-23 25' fill='none' stroke='#7eb957' stroke-width='5' stroke-linecap='round'/></svg>`,
    cabbage: `<svg ${common}><circle cx='32' cy='35' r='23' fill='#a6cf69'/><path d='M14 36c12-13 26-13 38 0M23 18c12 10 16 23 9 40M47 24c-12 6-18 17-17 33' fill='none' stroke='#6fa94e' stroke-width='5' stroke-linecap='round'/></svg>`,
    broccoli: `<svg ${common}><path d='M29 34h8l5 22H24Z' fill='#7db85b'/><g fill='#3c8a43'><circle cx='22' cy='27' r='10'/><circle cx='33' cy='20' r='12'/><circle cx='45' cy='29' r='10'/><circle cx='34' cy='34' r='11'/></g><path d='M30 36l-9 20M36 36l8 20' stroke='#5e9b4e' stroke-width='4' stroke-linecap='round'/></svg>`,
    "welsh-onion": `<svg ${common}><path d='M22 57l4-32M33 57l2-35M44 57l-1-32' stroke='#f6f2df' stroke-width='7' stroke-linecap='round'/><path d='M26 25c-8-8-10-15-7-21M35 22c0-10 4-16 11-20M43 25c8-8 11-15 8-21' stroke='#3f9340' stroke-width='6' stroke-linecap='round'/></svg>`,
    shiso: `<svg ${common}><path d='M32 8c16 10 21 28 8 48-16-8-25-25-8-48Z' fill='#4a9f45'/><path d='M32 10v45M32 28l-13-8M32 36l15-8M32 44l-12 5' fill='none' stroke='#d8ee9d' stroke-width='3' stroke-linecap='round'/><path d='M22 14l-4 6 6 2-6 5 7 3-5 7 8 2-3 8 7-2 6 7 1-9 9 1-5-8 7-5-9-3 3-8-8 1Z' fill='none' stroke='#2f7d3a' stroke-width='2' stroke-linejoin='round'/></svg>`,
    basil: `<svg ${common}><path d='M31 54c-2-15-12-15-19-25 11-6 20-1 23 10 2-12 11-20 24-17-1 15-11 25-28 32Z' fill='#5ab65a'/><path d='M31 54c2-16 0-31-7-44' stroke='#2f7d3a' stroke-width='4' stroke-linecap='round'/></svg>`,
    zucchini: `<svg ${common}><path d='M13 42c8-18 26-31 42-25 3 17-10 32-32 35-7 1-12-3-10-10Z' fill='#6fb95a'/><path d='M17 44c13-2 27-12 37-26' fill='none' stroke='#2f7d3a' stroke-width='4' stroke-linecap='round'/><g fill='#d8ef9d'><circle cx='27' cy='39' r='2'/><circle cx='35' cy='33' r='2'/><circle cx='44' cy='26' r='2'/></g></svg>`,
    pumpkin: `<svg ${common}><path d='M13 36c0-12 8-21 19-21s19 9 19 21-8 22-19 22-19-10-19-22Z' fill='#df8a2e'/><path d='M32 16c-7 10-8 28 0 41M32 16c7 10 8 28 0 41M19 29c8-4 18-5 28 0' fill='none' stroke='#b96b22' stroke-width='3' stroke-linecap='round'/><path d='M32 16c1-7 6-10 12-8' fill='none' stroke='#3f8d3f' stroke-width='5' stroke-linecap='round'/></svg>`,
    "bitter-melon": `<svg ${common}><path d='M16 44c7-22 24-34 40-29 3 19-10 36-31 40-8 2-12-3-9-11Z' fill='#66b84f'/><path d='M18 45c13-4 25-14 37-29' fill='none' stroke='#2f7d3a' stroke-width='4' stroke-linecap='round'/><g fill='#d7ee9c'><circle cx='25' cy='42' r='2'/><circle cx='31' cy='36' r='2'/><circle cx='38' cy='30' r='2'/><circle cx='45' cy='24' r='2'/><circle cx='52' cy='18' r='2'/></g></svg>`,
    watermelon: `<svg ${common}><path d='M10 41c9-22 38-31 50-12-2 23-30 32-50 12Z' fill='#3d9b45'/><path d='M13 41c14 7 33 2 45-12' fill='none' stroke='#8bd17a' stroke-width='5' stroke-linecap='round'/><path d='M23 48c8 6 22 3 28-7' fill='none' stroke='#244f2f' stroke-width='3' stroke-linecap='round'/></svg>`,
    melon: `<svg ${common}><circle cx='32' cy='35' r='22' fill='#d8c56c'/><path d='M15 31c9-7 24-8 34-1M15 40c11 7 25 6 34-1M25 15c-7 11-7 28 0 43M39 15c7 11 7 28 0 43' fill='none' stroke='#b9a755' stroke-width='3' stroke-linecap='round'/><path d='M32 14c4-6 9-7 15-4' stroke='#4a8d3a' stroke-width='4' stroke-linecap='round'/></svg>`,
    corn: `<svg ${common}><path d='M27 12c13 7 17 28 6 45-13-9-16-32-6-45Z' fill='#f0c84c'/><path d='M21 57c-2-18-7-30-14-39 16 5 23 20 21 39ZM37 57c2-18 9-31 22-40 0 19-7 34-22 40Z' fill='#65a94b'/><g fill='#d99d35'><circle cx='29' cy='24' r='2'/><circle cx='32' cy='31' r='2'/><circle cx='29' cy='38' r='2'/><circle cx='33' cy='45' r='2'/></g></svg>`,
    hakusai: `<svg ${common}><path d='M17 54c0-24 6-39 16-46 11 7 17 22 14 46Z' fill='#dbe98d'/><path d='M20 54c-7-17-6-31 2-43 10 9 14 24 10 43ZM44 54c7-17 6-31-2-43-10 9-14 24-10 43Z' fill='#76b85b'/><path d='M32 54V14' stroke='#f7f0c7' stroke-width='5' stroke-linecap='round'/></svg>`,
    mizuna: `<svg ${common}><path d='M31 57V12' stroke='#438d3e' stroke-width='5' stroke-linecap='round'/><path d='M29 30c-7-11-13-16-21-18 2 12 8 20 21 22ZM35 31c8-12 15-17 23-18-2 13-9 21-23 23ZM29 46c-8-7-14-9-22-9 5 10 13 14 22 13ZM35 46c8-7 14-9 22-9-5 10-13 14-22 13Z' fill='#5bb95d'/></svg>`,
    mibuna: `<svg ${common}><path d='M32 57V12' stroke='#438d3e' stroke-width='5' stroke-linecap='round'/><path d='M27 52c-8-15-13-27-12-40 12 6 18 19 17 40ZM37 52c8-15 13-27 12-40-12 6-18 19-17 40ZM20 48c-7-7-10-13-10-20 10 3 16 10 18 20ZM44 48c7-7 10-13 10-20-10 3-16 10-18 20Z' fill='#55ad4f'/></svg>`,
    shungiku: `<svg ${common}><path d='M32 58V13' stroke='#3f8d3f' stroke-width='5' stroke-linecap='round'/><path d='M18 54c-4-15-6-28-2-41 8 5 12 15 12 29 2-14 8-24 18-29 4 13 2 27-4 41Z' fill='#5fb65a'/><path d='M17 25c7 1 12 5 15 12M47 25c-7 1-12 5-15 12' stroke='#d7ee9d' stroke-width='3' stroke-linecap='round'/></svg>`,
    chingensai: `<svg ${common}><path d='M24 57c-7-17-8-33-2-46 12 7 16 24 10 46Z' fill='#75bd5a'/><path d='M40 57c7-17 8-33 2-46-12 7-16 24-10 46Z' fill='#5cab4f'/><path d='M32 57V18' stroke='#f3f1d8' stroke-width='9' stroke-linecap='round'/></svg>`,
    celery: `<svg ${common}><path d='M21 58l4-42M32 58l1-45M43 58l-3-42' stroke='#d9e9a3' stroke-width='7' stroke-linecap='round'/><path d='M25 19c-7-8-8-13-4-18M33 14c0-8 4-12 10-13M41 19c8-7 12-12 11-18' stroke='#4fa64a' stroke-width='5' stroke-linecap='round'/></svg>`,
    parsley: `<svg ${common}><path d='M32 58V21' stroke='#3f8d3f' stroke-width='5' stroke-linecap='round'/><g fill='#4fa64a'><circle cx='22' cy='22' r='9'/><circle cx='35' cy='15' r='9'/><circle cx='47' cy='25' r='9'/><circle cx='25' cy='37' r='9'/><circle cx='42' cy='40' r='9'/></g></svg>`,
    asparagus: `<svg ${common}><path d='M24 57l8-47 8 47Z' fill='#69b65a'/><path d='M31 10c-2 7-2 13 2 19M28 28h9M26 39h13' fill='none' stroke='#d9ef9f' stroke-width='3' stroke-linecap='round'/><path d='M31 10l5 4-3 7-6-2Z' fill='#438d3e'/></svg>`,
    strawberry: `<svg ${common}><path d='M32 18c16 5 21 18 12 31-5 8-19 8-24 0-9-13-4-26 12-31Z' fill='#d94335'/><path d='M32 18l-5-8 8 4 8-4-4 9 8 2-9 3-6 6-5-6-9-3 8-2Z' fill='#4b9a3f'/><g fill='#f1d37b'><circle cx='25' cy='34' r='2'/><circle cx='35' cy='30' r='2'/><circle cx='39' cy='43' r='2'/><circle cx='27' cy='46' r='2'/></g></svg>`,
    "fava-bean": `<svg ${common}><path d='M15 44c12-24 29-30 42-20-5 22-25 31-42 20Z' fill='#7bbd58'/><g fill='#d7ee9d'><ellipse cx='28' cy='39' rx='6' ry='8'/><ellipse cx='41' cy='31' rx='7' ry='9'/></g><path d='M17 44c12-3 27-11 39-20' fill='none' stroke='#3f8d3f' stroke-width='3' stroke-linecap='round'/></svg>`,
    peanut: `<svg ${common}><path d='M22 20c9-9 24-2 20 11 10 1 13 15 4 22-9 8-24 2-20-11-11-1-13-15-4-22Z' fill='#c79658'/><path d='M27 24c4-2 9-1 12 2M31 44c4 3 10 4 15 1' fill='none' stroke='#8e6338' stroke-width='3' stroke-linecap='round'/></svg>`,
    satoimo: `<svg ${common}><path d='M17 30c8-16 28-16 36-1 7 13-2 27-18 29-18 2-27-13-18-28Z' fill='#8b6f58'/><path d='M20 34c8-6 22-8 32-1M27 47c5 2 12 2 17-1' fill='none' stroke='#b49a78' stroke-width='4' stroke-linecap='round'/><path d='M36 17c0-7 5-11 13-11' stroke='#4b9a3f' stroke-width='4' stroke-linecap='round'/></svg>`,
    ginger: `<svg ${common}><path d='M13 39c7-11 17-9 22-4 6-11 20-9 23 1 2 8-6 15-15 13-4 8-17 10-23 2-7 2-12-5-7-12Z' fill='#d7b36e'/><path d='M20 40c8-2 15 0 20 5M37 35c6 2 11 5 16 10' fill='none' stroke='#a77d42' stroke-width='3' stroke-linecap='round'/></svg>`,
    nagaimo: `<svg ${common}><path d='M25 10c12 9 13 34 2 50-12-12-14-38-2-50Z' fill='#d5b985'/><path d='M27 12c-5 17-4 32 4 45M22 24c5-2 10-2 15 1M21 39c5-2 10-1 14 1' fill='none' stroke='#9d7547' stroke-width='3' stroke-linecap='round'/><path d='M28 10c3-7 9-9 16-7' stroke='#4b9a3f' stroke-width='4' stroke-linecap='round'/></svg>`,
    chive: `<svg ${common}><path d='M20 58c1-20-2-37-9-52M30 58c0-21 1-38 4-54M42 58c-2-21 1-37 11-51' stroke='#4a9f45' stroke-width='5' stroke-linecap='round'/><path d='M18 58h27' stroke='#f3f1d8' stroke-width='7' stroke-linecap='round'/></svg>`,
    myoga: `<svg ${common}><path d='M24 55c-8-15-3-33 9-43 13 10 17 28 7 43Z' fill='#c45a86'/><path d='M32 13c-7 12-9 28-2 42M33 13c7 12 9 28 2 42M22 35c7-4 16-5 24-1' fill='none' stroke='#f1a4b6' stroke-width='3' stroke-linecap='round'/></svg>`,
    rakkyo: `<svg ${common}><path d='M20 35c2-14 12-22 12-22s11 8 12 22c1 14-5 23-12 23s-14-9-12-23Z' fill='#f0ead8'/><path d='M32 13c-5-6-6-10-1-13M34 13c5-5 10-6 16-4' stroke='#4b9a3f' stroke-width='4' stroke-linecap='round'/><path d='M32 15c-5 13-5 29 0 42M32 15c5 13 5 29 0 42' fill='none' stroke='#d8ccb2' stroke-width='3' stroke-linecap='round'/></svg>`,
    "chili-pepper": `<svg ${common}><path d='M19 18c14 2 27 13 29 25 1 8-3 14-11 17-9-18-17-26-18-42Z' fill='#d73e32'/><path d='M18 18c-2-8 4-13 13-13' fill='none' stroke='#2f7d3a' stroke-width='5' stroke-linecap='round'/><path d='M26 25c7 4 13 11 17 21' fill='none' stroke='#f08f67' stroke-width='4' stroke-linecap='round'/><path d='M37 60c-8-4-14-12-18-25' fill='none' stroke='#a52f28' stroke-width='3' stroke-linecap='round'/></svg>`,
    paprika: `<svg ${common}><path d='M31 15c-3 5-8 6-12 7-9 4-12 21-3 30 6 7 12 1 15 1s8 6 14-1c9-9 6-26-3-30-4-1-8-2-11-7Z' fill='#f1b83d'/><path d='M31 16c2-8 8-9 14-8' fill='none' stroke='#2d7433' stroke-width='5' stroke-linecap='round'/><path d='M30 26c-4 8-4 17 0 26M38 25c5 8 5 18 0 27' fill='none' stroke='#f6d275' stroke-width='3' stroke-linecap='round'/><path d='M20 28c5-3 17-4 26 0' fill='none' stroke='#d98e2f' stroke-width='3' stroke-linecap='round'/></svg>`,
    burdock: `<svg ${common}><path d='M38 6c5 18 2 38-11 55-9-19-4-39 11-55Z' fill='#9b6b43'/><path d='M38 7c-9 16-13 34-10 52M31 22c5-2 10-2 14 1M27 37c5-2 10-1 14 2M25 50c4-2 8-1 11 1' fill='none' stroke='#c39766' stroke-width='3' stroke-linecap='round'/><path d='M36 8c-5-6-6-11-2-16M39 8c4-7 10-9 18-7' fill='none' stroke='#4a9a42' stroke-width='4' stroke-linecap='round'/><path d='M27 60l-3 3M29 58l-6 1' stroke='#7c5335' stroke-width='2' stroke-linecap='round'/></svg>`,
    garlic: `<svg ${common}><path d='M16 34c2-13 16-20 16-20s15 7 16 20c2 14-6 24-16 24S14 48 16 34Z' fill='#f0ead8'/><path d='M32 15c-5 10-7 26 0 42M32 15c5 10 7 26 0 42M21 35c8 0 14 5 11 22M43 35c-8 0-14 5-11 22' fill='none' stroke='#d8ccb2' stroke-width='3' stroke-linecap='round'/><path d='M31 15c-4-6-4-10 2-14' stroke='#6da94e' stroke-width='4' stroke-linecap='round'/></svg>`,
    onion: `<svg ${common}><path d='M18 34c2-13 14-20 14-20s13 7 14 20c2 14-6 24-14 24S16 48 18 34Z' fill='#d79b45'/><path d='M32 14c-4-6-4-10 3-13M32 14c4-5 9-7 15-6' stroke='#4d9b45' stroke-width='4' stroke-linecap='round'/><path d='M32 16c-6 11-7 28 0 41M32 16c6 11 7 28 0 41' fill='none' stroke='#b8792d' stroke-width='3' stroke-linecap='round'/></svg>`
  };

  return svg[id] || `<svg ${common}><path d='M32 55c0-20-8-32-20-43 18 2 29 15 30 43Z' fill='#5aa64d'/><path d='M33 55c-1-18 7-32 19-40 3 18-5 34-19 40Z' fill='#82bd58'/></svg>`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return defaultState;
    const migrated = { ...defaultState, ...saved, form: { ...defaultState.form, ...(saved.form || {}) } };
    if (saved.weatherCacheVersion !== WEATHER_CACHE_VERSION) {
      migrated.weatherStatus = "idle";
      migrated.weatherForecast = null;
      migrated.weatherFetchedAt = null;
      migrated.weatherLocationKey = "";
      migrated.weatherError = "";
      migrated.weatherCache = null;
      migrated.weatherCacheFetchedAt = null;
      migrated.weatherCacheVersion = WEATHER_CACHE_VERSION;
    }
    const sampleOnly = migrated.crops?.length === 1 && migrated.crops[0].masterId === "mini-tomato" && migrated.crops[0].note === "確認用のサンプル作物";
    if (sampleOnly) {
      migrated.crops = [];
      migrated.selectedCropId = null;
    }
    migrated.crops = (migrated.crops || []).map(normalizeCropRecord);
    const legacy = { "tokyo-setagaya": ["東京都", "東京23区"], nagano: ["長野県", "長野市"], nasu: ["栃木県", "那須町"], osaka: ["大阪府", "大阪市"] };
    if (legacy[saved.regionId] && (!saved.prefecture || !saved.city)) {
      migrated.prefecture = legacy[saved.regionId][0];
      migrated.city = legacy[saved.regionId][1];
    }
    return migrated;
  } catch {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: null }));
}

function setState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function selectCropAndFocus(cropId) {
  setState({ selectedCropId: cropId, view: "crops" });
  const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  schedule(() => {
    const detail = document.querySelector("#crop-detail-panel");
    if (!detail) return;
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
    detail.focus({ preventScroll: true });
  });
}

function normalizeSearchText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[ 　・ー\-_/]/g, "")
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

function cropSearchScore(item, query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return 1;
  const nameTerms = [item.name].map(normalizeSearchText);
  const aliasTerms = (cropSearchAliases[item.id] || []).map(normalizeSearchText);
  const supportTerms = [item.family, item.category, item.difficulty].map(normalizeSearchText);
  if (nameTerms.some((term) => term === normalized)) return 120;
  if (nameTerms.some((term) => term.startsWith(normalized))) return 90;
  if (normalized.length === 1) return 0;
  if (aliasTerms.some((term) => term === normalized)) return 105;
  if (aliasTerms.some((term) => term.startsWith(normalized))) return 70;
  if (nameTerms.some((term) => term.includes(normalized))) return 55;
  if (aliasTerms.some((term) => term.includes(normalized))) return 45;
  if (normalized.length >= 2 && supportTerms.some((term) => term.includes(normalized))) return 25;
  return 0;
}

function getCropSearchResults(query, category = "すべて") {
  return crops
    .map((item, index) => ({ item, index, score: cropSearchScore(item, query) }))
    .filter(({ item, score }) => {
      const matchCategory = category === "すべて" || item.category === category;
      return matchCategory && (!normalizeSearchText(query) || score > 0);
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

function showToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    state.toast = null;
    render();
  }, 3200);
}

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === false || value == null) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  [].concat(children).filter((child) => child !== false && child != null).forEach((child) => node.append(child.nodeType ? child : document.createTextNode(child)));
  return node;
}

function render() {
  const app = document.querySelector("#app");
  const viewChanged = state.onboarded && previousView !== state.view;
  previousView = state.view;
  cleanupBrokenModalBackdrops();
  app.innerHTML = "";
  if (!state.onboarded) {
    app.append(renderOnboarding());
    return;
  }

  app.append(
    h("div", { class: "app-frame" }, [
      h("div", { class: "shell" }, [
        renderSidebar(),
        h("main", { class: "main" }, [renderTopbar(), renderCurrentView()])
      ]),
      state.toast ? h("div", { class: "toast", role: "status", text: state.toast }) : null
    ])
  );
  if (viewChanged) settleViewPosition(state.view);
}

function cleanupBrokenModalBackdrops() {
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    const modal = backdrop.querySelector(".modal");
    if (!modal) {
      backdrop.remove();
      return;
    }
    const rect = modal.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) backdrop.remove();
  });
}

function seasonalGardenVisual(date = today) {
  const visual = getSeasonVisual(date);
  return h("div", { class: `garden-visual season-${visual.key}` }, [
    h("img", {
      src: `./assets/seasons/${visual.file}`,
      alt: `${visual.name}の家庭菜園イラスト`,
      loading: "lazy"
    })
  ]);
}

function getSeasonVisual(date = today) {
  const month = date.getMonth() + 1;
  if ([1, 2, 12].includes(month)) return { key: "winter", ...seasonVisuals.winter };
  if (month === 3) return { key: "early-spring", ...seasonVisuals.earlySpring };
  if ([4, 5].includes(month)) return { key: "spring", ...seasonVisuals.spring };
  if (month === 6) return { key: "early-summer", ...seasonVisuals.earlySummer };
  if ([7, 8].includes(month)) return { key: "summer", ...seasonVisuals.summer };
  if ([9, 10].includes(month)) return { key: "autumn", ...seasonVisuals.autumn };
  return { key: "late-autumn", ...seasonVisuals.lateAutumn };
}

function renderOnboarding() {
  return h("div", { class: "onboarding" }, [
    h("div", { class: "onboarding-card" }, [
      h("section", {}, [
        h("div", { class: "brand" }, [
          brandMark(),
          h("div", {}, [h("p", { text: "家庭菜園カレンダー" }), h("h1", { text: "やさい暦" })])
        ]),
        h("p", {
          text: "作物・作付け日から、種まき、追肥、土寄せ、収穫までの基本スケジュールをルールベースで整理します。"
        }),
        seasonalGardenVisual(),
        h("div", { class: "mini-preview", style: "margin-top:14px" }, [
          h("strong", { text: "今日の提案例" }),
          h("p", { text: "2日後の冷え込みに備えて、定植直後のミニトマトは不織布やトンネルで保温を検討してください。" })
        ])
      ]),
      h("section", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "初回登録" }), h("span", { class: "badge green", text: "無料枠" })]),
        h("div", { class: "settings-list" }, [
          settingRow("無料枠で使えること", "作物3件まで、作付け日からの基本作業スケジュール、栽培履歴、カレンダー表示"),
          settingRow("地域アドバイス", "地域に合わせた作業タイミング、天気の注意、おすすめ野菜はプレミアムで利用できます。")
        ]),
        h("button", { class: "primary-btn", style: "width:100%", onclick: finishOnboarding }, [uiIcon("check"), "はじめる"])
      ])
    ])
  ]);
}

function finishOnboarding() {
  setState({ onboarded: true, crops: state.crops, selectedCropId: state.crops[0]?.id || null, view: "home" });
}

function renderSidebar() {
  const region = state.premium ? getRegion() : null;
  const allTasks = getAllTasks();
  const alerts = getWeatherAlerts();
  const cropLimit = state.premium ? "無制限" : "3 無料枠";
  return h("aside", { class: `side ${state.view === "home" ? "home-side" : "compact-side"}` }, [
    state.view === "home" ? h("div", { class: "brand side-brand" }, [
      brandMark(),
      h("div", {}, [h("h1", { text: "やさい暦" }), h("p", { text: "家庭菜園サポート" })])
    ]) : h("div", { class: "side-context", "aria-label": "現在の画面" }, [
      h("strong", { text: currentViewTitle() })
    ]),
    h("div", { class: "side-meta" }, [
      state.premium ? meta("地域", `${region.prefecture}${region.city || ""}`) : null,
      state.premium ? meta("地域タイプ", region.climateZoneName) : null,
      meta("登録作物", `${state.crops.length}/${cropLimit}`),
      meta("今週の予定", `${tasksWithin(allTasks, 7).length}件`)
    ]),
    h("nav", { class: "nav", "aria-label": "主要ナビゲーション" }, [
      navButton("home", "home", "ホーム"),
      navButton("crops", "crops", "作物"),
      navButton("calendar", "calendar", "カレンダー"),
      navButton("alerts", "bell", `アラート${alerts.length ? ` ${alerts.length}` : ""}`),
      navButton("settings", "settings", "設定")
    ])
  ]);
}

function navButton(view, icon, label) {
  return h("button", {
    class: state.view === view ? "active" : "",
    onclick: () => {
      if (state.view !== view) setState({ view });
    }
  }, [
    navIcon(icon),
    h("span", { text: label })
  ]);
}

function navIcon(icon) {
  const sources = {
    home: "nav-home.png",
    crops: "nav-crops.png",
    calendar: "nav-calendar.png",
    bell: "nav-alerts.png",
    settings: "nav-settings.png"
  };
  if (!sources[icon]) return uiIcon(icon, "nav-icon");
  return h("span", { class: "nav-icon nav-image-icon" }, [
    h("img", { src: `./assets/ui/${sources[icon]}`, alt: "", loading: "lazy" })
  ]);
}

function brandMark() {
  return h("div", { class: "brand-mark" }, [
    h("img", { src: "./assets/ui/app-seedling.png", alt: "", loading: "lazy" })
  ]);
}

function uiIcon(name, className = "ui-icon") {
  const paths = {
    home: "<path d='M3 11.5 12 4l9 7.5'/><path d='M5.5 10.5V20h13v-9.5'/><path d='M9.5 20v-6h5v6'/>",
    sprout: "<path d='M12 20V10'/><path d='M12 10c-4.5 0-7-2.5-7-6 4.5 0 7 2.5 7 6Z'/><path d='M12 13c4.5 0 7-2.5 7-6-4.5 0-7 2.5-7 6Z'/>",
    calendar: "<path d='M7 3v4'/><path d='M17 3v4'/><path d='M4 8h16'/><path d='M5 5h14v15H5z'/>",
    bell: "<path d='M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z'/><path d='M10 21h4'/>",
    settings: "<path d='M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z'/><path d='M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 6.5h-6L8.6 9a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.4 2.5h6l.4-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.5Z'/>",
    plus: "<path d='M12 5v14'/><path d='M5 12h14'/>",
    chevronRight: "<path d='m9 18 6-6-6-6'/>",
    check: "<path d='m5 12 4 4 10-10'/>"
  };
  return h("span", {
    class: className,
    html: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.check}</svg>`
  });
}

function renderTopbar() {
  const [title, subtitle] = currentViewCopy();
  const showAddButton = ["home", "crops", "calendar"].includes(state.view);
  return h("div", { class: `topbar ${showAddButton ? "with-action" : "compact"}` }, [
    h("div", { class: "topbar-copy" }, [h("h2", { text: title }), h("p", { class: "muted", text: subtitle })]),
    showAddButton ? h("div", { class: "top-actions" }, [
      h("button", { class: "primary-btn add-crop-btn", onclick: () => openCropModal(), "aria-label": "作物を追加する" }, [uiIcon("plus"), h("span", { text: "作物を追加する" })])
    ]) : null
  ]);
}

function currentViewCopy() {
  const titles = {
    home: ["ホーム", "今日やることと、今週の畑の流れを確認できます。"],
    crops: ["作物管理", "育てたい作物と栽培中の作物を登録します。"],
    calendar: ["作業カレンダー", "自動生成された予定を月表示で確認します。"],
    alerts: state.premium ? ["天気の注意・提案", "登録作物と地域に合わせた注意点を表示します。"] : ["アラート・提案", "地域に合わせた提案はプレミアムで利用できます。"],
    settings: state.premium ? ["設定", "地域、通知、プランを管理します。"] : ["設定", "通知とプランを管理します。"]
  };
  return titles[state.view] || titles.home;
}

function currentViewTitle() {
  return currentViewCopy()[0];
}

function settleViewPosition(view) {
  const selectors = {
    home: ".side",
    crops: ".crop-list, .topbar",
    calendar: ".calendar-shell, .topbar",
    alerts: ".panel, .topbar",
    settings: ".panel, .topbar"
  };
  const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  schedule(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const target = document.querySelector(selectors[view] || ".topbar");
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start", inline: "nearest" });
  });
}

function renderCurrentView() {
  const views = {
    home: renderHome,
    crops: renderCrops,
    calendar: renderCalendar,
    alerts: renderAlerts,
    settings: renderSettings
  };
  return views[state.view]();
}

function renderHome() {
  const tasks = getAllTasks();
  const todayTasks = tasks.filter((t) => isSameDay(parseDate(t.date), today));
  const weekTasks = tasksWithin(tasks, 7);
  if (state.premium) ensureOpenMeteoForecast();
  const recs = state.premium ? getRecommendations().slice(0, 4) : [];
  const alerts = state.premium ? getWeatherAlerts() : [];
  return h("div", { class: "grid dashboard-grid" }, [
    h("section", { class: "grid" }, [
      !state.crops.length ? firstGardenSetupCard() : null,
      h("div", { class: "panel focus-panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "次にやること" }), h("span", { class: "badge blue", text: todayTasks.length ? `今日 ${todayTasks.length}件` : "今週" })]),
        taskList(todayTasks.length ? todayTasks : weekTasks.slice(0, 3), todayTasks.length ? "today" : "week")
      ]),
      h("div", { class: "panel hero" }, [
        h("div", { class: "hero-copy" }, [
          h("span", { class: "badge green", text: `${formatMonth(today)}の菜園` }),
          h("h3", { text: greetingText() }),
          h("p", { class: "muted", text: homeSummary(weekTasks, alerts) })
        ]),
        seasonalGardenVisual()
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "登録中の作物" }), h("button", { class: "plain-btn", onclick: () => setState({ view: "crops" }) }, ["作物一覧を見る"])]),
        state.crops.length ? h("div", { class: "crop-list" }, state.crops.slice(0, 4).map(renderCropCard)) : emptyAction("作物を追加すると、作業予定と通知が自動で作られます。", "作物を選ぶ", () => openCropModal())
      ])
    ]),
    h("section", { class: "grid" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "今週やること" }), h("span", { class: "badge amber", text: `${weekTasks.length}件` })]),
        taskList(weekTasks.slice(0, 5), "week")
      ]),
      !state.premium ? premiumNudge("地域に合わせて調整する", "地域に近い作業タイミングや天気の注意を確認できます。") : null,
      state.premium ? h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "気象アラート" }), h("button", { class: "plain-btn", onclick: () => setState({ view: "alerts" }) }, ["アラートを見る"])]),
        alertList(alerts.slice(0, 3))
      ]) : null,
      state.premium ? h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "今月おすすめ" }), h("span", { class: "badge green", text: "地域別" })]),
        h("div", { class: "recommend-list" }, recs.map(renderRecommendCard))
      ]) : null
    ])
  ]);
}

function renderCrops() {
  const selected = state.crops.find((item) => item.id === state.selectedCropId) || state.crops[0];
  return h("div", { class: "grid dashboard-grid" }, [
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "栽培中の作物" }), h("span", { class: "badge green", text: `${state.crops.length}件` })]),
      state.crops.length ? h("div", { class: "crop-list" }, state.crops.map((item) => renderCropCard(item, selected?.id))) : emptyAction("まだ登録がありません。育てている野菜、またはこれから育てたい野菜を1つ登録してみましょう。", "作物を追加する", () => openCropModal()),
      h("h3", { class: "section-title", text: "栽培履歴" }),
      state.history.length ? h("div", { class: "history-list" }, state.history.map(renderHistoryRow)) : empty("栽培終了した作物がここに保存されます。")
    ]),
    h("section", { id: "crop-detail-panel", class: "panel crop-detail-panel", tabindex: "-1", "aria-live": "polite" }, [
      selected ? renderCropDetail(selected) : emptyAction("作物を登録すると、ここに生育状況、次の作業、栽培メモが表示されます。", "最初の作物を選ぶ", () => openCropModal())
    ])
  ]);
}

function renderCropCard(item, activeCropId = state.selectedCropId) {
  const master = getCrop(item.masterId);
  const tasks = tasksForCrop(item).filter((t) => parseDate(t.date) >= today);
  const next = tasks[0];
  const progress = calcProgress(item);
  const selected = activeCropId === item.id;
  return h("div", {
    class: selected ? "crop-card selected" : "crop-card",
    role: "button",
    tabindex: "0",
    "aria-label": `${master.name}の詳細を見る`,
    "aria-current": selected ? "true" : null,
    onclick: (event) => {
      if (event.target.closest?.("button")) return;
      selectCropAndFocus(item.id);
    },
    onkeydown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectCropAndFocus(item.id);
    }
  }, [
    cropIcon(master.id),
    h("div", {}, [
      h("div", { class: "crop-title" }, [
        h("span", { text: master.name }),
        selected ? h("span", { class: "badge green", text: "表示中" }) : null
      ]),
      h("p", { class: "crop-meta", text: `${cropPhaseLabel(item, master)} / ${master.family}` }),
      h("p", { class: "crop-meta", text: cropDateSummary(item, master) }),
      h("p", { class: "crop-meta", text: next ? `次: ${formatDate(next.date)} ${next.name}` : "予定は完了しています" }),
      h("div", { class: "crop-progress" }, [h("span", { style: `width:${progress}%` })])
    ]),
    h("button", { class: "secondary-btn", onclick: () => selectCropAndFocus(item.id) }, [selected ? "表示中" : "詳細を見る"])
  ]);
}

function renderCropDetail(item) {
  const master = getCrop(item.masterId);
  const tasks = tasksForCrop(item);
  const future = tasks.filter((t) => parseDate(t.date) >= today && !t.recordOnly);
  const after = getAfterCropSuggestions(item);
  const visibleAfter = selectAfterCropSuggestions(after, 3);
  const finishDate = getCropFinishDate(item);
  const harvest = getHarvestSchedule(item);
  return h("div", {}, [
    h("div", { class: "panel-header" }, [
      h("div", {}, [
        h("div", { class: "detail-title" }, [cropIcon(master.id, "detail-crop-icon"), h("h3", { text: master.name })]),
        h("p", { class: "muted", text: `${master.family} / 難易度 ${master.difficulty} / ${master.weeklyCareLevel}` })
      ]),
      h("span", { class: "badge green", text: cropPhaseLabel(item, master) })
    ]),
    renderCropStateSummary(item, master, future),
    renderCropStartActions(item, master),
    h("div", { class: "stats" }, [
      stat("収穫目安", harvestEstimateText(item, master, harvest)),
      stat("低温注意", `${master.lowTempRisk}℃未満`),
      stat("高温注意", `${master.highTempRisk}℃以上`)
    ]),
    h("h3", { class: "section-title", text: "次にやる作業" }),
    taskList(future.slice(0, 3), "detail"),
    h("h3", { class: "section-title", text: "作業タイムライン" }),
    h("div", { class: "timeline" }, tasks.map((task) => renderTimelineItem(task))),
    isCropStarted(item) ? h("div", { class: "section-title-row" }, [
      h("h3", { class: "section-title", text: "次に植えやすい候補" }),
      h("span", { class: "badge amber", text: `${formatMonth(finishDate)}から準備` })
    ]) : h("h3", { class: "section-title", text: "栽培開始の目安" }),
    isCropStarted(item) ? afterCropNote(master, visibleAfter) : renderTimingAdvice(master),
    isCropStarted(item) ? h("div", { class: "recommend-list" }, visibleAfter.map((suggestion) => renderAfterCropCard(master, suggestion))) : null,
    h("div", { class: "actions" }, [
      h("button", { class: "secondary-btn", onclick: () => editCrop(item.id) }, ["編集"]),
      h("button", { class: "secondary-btn", onclick: () => finishCrop(item.id) }, ["栽培終了"]),
      h("button", { class: "plain-btn", onclick: () => removeCrop(item.id) }, ["削除"])
    ])
  ]);
}

function renderCropStateSummary(item, master, futureTasks) {
  const progress = calcProgress(item);
  const next = futureTasks[0];
  const harvest = getHarvestSchedule(item);
  const harvestStart = addDays(harvest.base.date, harvest.range[0]);
  const harvestReady = isHarvestScheduleReady(item, master);
  return h("div", { class: "state-summary" }, [
    h("div", {}, [
      h("span", { class: "muted", text: "栽培記録" }),
      h("strong", { text: cropDateSummary(item, master) })
    ]),
    h("div", {}, [
      h("span", { class: "muted", text: "次の作業" }),
      h("strong", { text: next ? `${formatDate(next.date)} ${next.name}` : "予定は完了しています" })
    ]),
    h("div", {}, [
      h("span", { class: "muted", text: "収穫開始目安" }),
      h("strong", { text: !isCropStarted(item) ? "開始後に自動計算" : harvestReady ? formatDate(iso(harvestStart)) : "定植後に自動計算" })
    ]),
    h("div", { class: "summary-progress" }, [
      h("span", { class: "muted", text: "進み具合" }),
      h("div", { class: "crop-progress" }, [h("span", { style: `width:${progress}%` })])
    ])
  ]);
}

function renderCropStartActions(item, master) {
  const method = getStartMethod(item, master);
  const buttons = cropStartActionButtons(item, master, method);
  if (!buttons.length) return null;
  const text = item.status === "育てたい"
    ? "作業が済んだら押してください。今日の日付を自動で記録し、予定を作り直します。"
    : "苗を畑やプランターへ移したら押してください。今日を定植日として記録します。";
  return h("div", { class: "crop-start-actions" }, [
    h("div", {}, [
      h("strong", { text: "作業を記録" }),
      h("p", { class: "muted", text })
    ]),
    h("div", { class: "actions" }, buttons)
  ]);
}

function cropStartActionButtons(item, master, method = getStartMethod(item, master)) {
  if (item.status === "育てたい") {
    return allowedStartMethods(master)
      .filter((option) => option.value !== "planning")
      .map((option, index) => {
        const cls = index === 0 ? "primary-btn" : "secondary-btn";
        if (["direct", "nursery"].includes(option.value)) {
          return h("button", { class: cls, onclick: () => markCropSown(item.id, option.value) }, [startActionLabel(option.value, master)]);
        }
        return h("button", { class: cls, onclick: () => markCropPlanted(item.id, option.value) }, [startActionLabel(option.value, master)]);
      });
  }
  if (method === "nursery" && item.status === "種まき済み" && !isIsoDate(item.plantingDate)) {
    return [h("button", { class: "primary-btn", onclick: () => markCropPlanted(item.id, "nursery") }, ["定植完了"])];
  }
  return [];
}

function renderTimingAdvice(master) {
  const methods = allowedStartMethods(master).filter((option) => option.value !== "planning");
  const cards = [];
  if (methods.some((option) => ["direct", "nursery"].includes(option.value))) {
    cards.push(h("div", {}, [
      h("span", { class: "muted", text: methods.some((option) => option.value === "nursery") ? "種まき・育苗開始の適期" : "種まき適期" }),
      h("strong", { text: timingWindowText(master.seedMonths) })
    ]));
  }
  if (methods.some((option) => option.value === "seedling" || option.value === "nursery")) {
    cards.push(h("div", {}, [
      h("span", { class: "muted", text: "苗の定植適期" }),
      h("strong", { text: timingWindowText(master.plantingMonths) })
    ]));
  }
  if (methods.some((option) => option.value === "material")) {
    cards.push(h("div", {}, [
      h("span", { class: "muted", text: `${plantingNoun(master)}の適期` }),
      h("strong", { text: timingWindowText(master.plantingMonths?.length ? master.plantingMonths : master.seedMonths) })
    ]));
  }
  return h("div", { class: "timing-advice" }, cards);
}

function cropPhaseLabel(item, master = getCrop(item.masterId)) {
  const method = getStartMethod(item, master);
  if (item.status === "育てたい") return "計画中";
  if (method === "direct") return "直播済み";
  if (method === "nursery") return isIsoDate(item.plantingDate) ? "定植済み" : "育苗中";
  if (method === "seedling") return "苗を定植";
  if (method === "material") return `${plantingNoun(master)}済み`;
  return "栽培中";
}

function cropDateSummary(item, master = getCrop(item.masterId)) {
  const method = getStartMethod(item, master);
  if (item.status === "育てたい") {
    if (plantingMaterialCropIds.has(master.id)) {
      const plant = nextTimingDate(master.plantingMonths?.length ? master.plantingMonths : master.seedMonths);
      return `${plantingNoun(master)} ${formatDate(plant)}頃`;
    }
    const seed = master.seedMonths?.length ? nextTimingDate(master.seedMonths) : null;
    const plant = isTransplantMethodAvailable(master) ? nextTimingDate(master.plantingMonths) : null;
    if (seed && plant) return `種まき ${formatDate(seed)}頃 / 定植 ${formatDate(plant)}頃`;
    if (plant) return `定植 ${formatDate(plant)}頃`;
    if (seed) return `種まき ${formatDate(seed)}頃`;
    return "適期を確認中";
  }
  const hasSow = isIsoDate(item.sowDate);
  const hasPlant = isIsoDate(item.plantingDate);
  if (method === "nursery" && hasSow && hasPlant) return `ポット種まき ${formatDate(item.sowDate)} / 定植 ${formatDate(item.plantingDate)}`;
  if (method === "nursery" && hasSow) return `ポット種まき ${formatDate(item.sowDate)}`;
  if (method === "material" && hasPlant) return `${plantingNoun(master)} ${formatDate(item.plantingDate)}`;
  if (method === "seedling" && hasPlant) return `定植 ${formatDate(item.plantingDate)}`;
  if (method === "direct" && hasSow) return `直播 ${formatDate(item.sowDate)}`;
  if (hasSow && hasPlant && isPlantingTaskRelevant(master)) return `種まき ${formatDate(item.sowDate)} / 定植 ${formatDate(item.plantingDate)}`;
  if (hasPlant) return `${plantingNoun(master)} ${formatDate(item.plantingDate)}`;
  if (hasSow) return `種まき ${formatDate(item.sowDate)}`;
  return "日付未設定";
}

function isCropStarted(item) {
  return item.status !== "育てたい" && (isIsoDate(item.sowDate) || isIsoDate(item.plantingDate));
}

function isHarvestScheduleReady(item, master = getCrop(item.masterId || item.id)) {
  const method = getStartMethod(item, master);
  return !(method === "nursery" && item.status === "種まき済み" && !isIsoDate(item.plantingDate));
}

function harvestEstimateText(item, master, harvest = getHarvestSchedule(item)) {
  if (!isHarvestScheduleReady(item, master)) return "定植後に自動計算";
  return `${harvest.base.label} ${harvest.range[0]}〜${harvest.range[1]}日`;
}

function renderTimelineItem(task) {
  const d = parseDate(task.date);
  const cls = d < today ? "done" : daysBetween(today, d) <= 7 ? "soon" : "";
  return h("div", { class: `timeline-item ${cls}` }, [
    h("span", { class: "timeline-dot" }),
    h("strong", { text: `${formatDate(task.date)} ${task.name}` }),
    h("p", { text: task.description })
  ]);
}

function renderAfterCropCard(previous, suggestion) {
  const candidate = suggestion.crop || suggestion;
  return h("div", { class: "recommend-card" }, [
    cropIcon(candidate.id),
    h("div", {}, [
      h("strong", { text: candidate.name }),
      h("span", { class: "recommend-meta", text: `${candidate.family} / ${candidate.category}` }),
      h("p", { text: suggestion.reason || afterCropMerit(candidate) }),
      suggestion.action ? h("div", { class: "advice-points compact" }, [
        h("span", { class: "advice-point", text: suggestion.action })
      ]) : null
    ])
  ]);
}

function afterCropNote(previous, suggestions = []) {
  const families = [...new Set(suggestions.map((entry) => (entry.crop || entry).family))]
    .filter((family) => family && family !== previous.family)
    .slice(0, 3);
  const familyText = families.length ? `${families.join("・")}など` : "別の科";
  return h("div", {
    class: "aftercrop-note",
  }, [
    h("strong", { text: `${previous.family}の連作を避ける` }),
    h("span", { text: `${previous.name}と同じ科を続けず、${familyText}から片付け時期に合う作物を優先しています。` })
  ]);
}

function renderHistoryRow(item) {
  const master = getCrop(item.masterId);
  return h("div", { class: "history-row" }, [
    h("span", { class: "history-title" }, [cropIcon(master.id, "inline-crop-icon"), h("strong", { text: master.name })]),
    h("p", { class: "muted", text: `${formatDate(item.finishedAt)}に栽培終了 / 前作履歴として保存` })
  ]);
}

function renderCalendar() {
  const base = new Date(today.getFullYear(), today.getMonth() + state.calendarOffset, 1);
  const events = getAllTasks({ includeRecords: true });
  const upcoming = events.filter((event) => {
    const date = parseDate(event.date);
    return date >= today && daysBetween(today, date) <= 7;
  }).sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const selectedDate = isIsoDate(state.selectedCalendarDate) ? parseDate(state.selectedCalendarDate) : today;
  const selectedEvents = events
    .filter((event) => isSameDay(parseDate(event.date), selectedDate))
    .sort((a, b) => calendarEventPriority(a) - calendarEventPriority(b));
  const monthEvents = events.filter((event) => {
    const date = parseDate(event.date);
    return date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth();
  });
  const children = [
    h("div", { class: "calendar-toolbar" }, [
      h("div", { class: "segmented" }, [
        h("button", { class: state.calendarView !== "month" ? "active" : "", onclick: () => setState({ calendarView: "upcoming" }) }, ["次の7日"]),
        h("button", { class: state.calendarView === "month" ? "active" : "", onclick: () => setState({ calendarView: "month" }) }, ["月表示"])
      ]),
      h("span", { class: "calendar-summary", text: state.calendarView === "month" ? `${formatMonth(base)}の予定 ${monthEvents.length}件` : `次の7日 ${upcoming.length}件` })
    ])
  ];
  if (state.calendarView !== "month") {
    children.push(h("div", { class: "upcoming-list" },
      upcoming.length ? upcoming.map(renderUpcomingEvent) : [emptyAction("次の7日間に作業予定はありません。作物を追加すると予定が自動で作られます。", "作物を追加", () => openCropModal())]
    ));
    return h("section", { class: "panel calendar-shell" }, children);
  }
  children.push(
    h("div", { class: "calendar-head" }, [
      h("button", { class: "icon-btn", title: "前の月", onclick: () => setState({ calendarOffset: state.calendarOffset - 1 }) }, ["‹"]),
      h("h3", { text: `${base.getFullYear()}年${base.getMonth() + 1}月` }),
      h("div", { style: "display:flex;gap:8px" }, [
        h("button", { class: "secondary-btn", onclick: () => setState({ calendarOffset: 0, selectedCalendarDate: iso(today) }) }, ["今日"]),
        h("button", { class: "icon-btn", title: "次の月", onclick: () => setState({ calendarOffset: state.calendarOffset + 1 }) }, ["›"])
      ])
    ]),
    h("div", { class: "calendar-legend" }, [
      h("span", { class: "legend-item seed", text: "種まき・定植" }),
      h("span", { class: "legend-item care", text: "管理" }),
      h("span", { class: "legend-item harvest", text: "収穫" })
    ]),
    h("div", { class: "calendar-month-layout" }, [
      h("div", { class: "calendar-board" }, [
        h("div", { class: "calendar-grid weekday-grid" }, ["日", "月", "火", "水", "木", "金", "土"].map((w) => h("div", { class: "weekday", text: w }))),
        h("div", { class: "calendar-grid month-grid" }, calendarDays(base).map((date) => renderDay(date, base, events, selectedDate)))
      ]),
      renderSelectedDayAgenda(selectedDate, selectedEvents)
    ])
  );
  return h("section", { class: "panel calendar-shell" }, children);
}

function renderUpcomingEvent(event) {
  const isWeather = event.kind === "weather";
  return h("div", { class: `task upcoming ${event.kind || ""}` }, [
    calendarEventIcon(event, isWeather),
    h("div", {}, [
      h("div", { class: "task-title", text: event.name }),
      h("p", { class: "task-meta", text: `${formatDate(event.date)} / ${event.cropName || "共通"}` })
    ])
  ]);
}

function calendarEventIcon(event, isWeather = event.kind === "weather", className = "calendar-crop-icon") {
  if (isWeather) return weatherIcon(weatherIconKeyForAlert(event), "alert-icon weather-alert-icon");
  return event.masterId ? cropIcon(event.masterId, className) : taskIcon(event.iconKey || "growth-check");
}

function renderDay(date, base, events, selectedDate = today) {
  const dayEvents = events
    .filter((event) => isSameDay(parseDate(event.date), date))
    .sort((a, b) => calendarEventPriority(a) - calendarEventPriority(b));
  const visibleEvents = dayEvents.slice(0, 2);
  const classes = ["day"];
  if (date.getMonth() !== base.getMonth()) classes.push("out");
  if (isSameDay(date, today)) classes.push("today");
  if (isSameDay(date, selectedDate)) classes.push("selected");
  if (dayEvents.length) classes.push("has-events");
  return h("button", {
    class: classes.join(" "),
    type: "button",
    "aria-label": `${formatDate(date)} ${dayEvents.length}件`,
    onclick: () => setState({ selectedCalendarDate: iso(date) })
  }, [
    h("span", { class: "day-num", text: String(date.getDate()) }),
    h("span", { class: "day-count", text: dayEvents.length ? `${dayEvents.length}` : "" }),
    ...visibleEvents.map((event) => {
      if (event.kind === "weather") {
        return h("div", { class: `event ${event.kind || ""}` }, [
          weatherIcon(weatherIconKeyForAlert(event), "event-weather-icon"),
          h("span", { text: compactEventTitle(event) })
        ]);
      }
      return h("div", { class: `event ${event.kind || ""}` }, [
        calendarEventIcon(event, false, "event-crop-icon"),
        h("span", { text: event.cropName || event.name })
      ]);
    }),
    dayEvents.length > visibleEvents.length ? h("span", { class: "event-more", text: `ほか${dayEvents.length - visibleEvents.length}件` }) : null
  ]);
}

function renderSelectedDayAgenda(date, events) {
  const groups = groupCalendarEvents(events);
  return h("aside", { class: "day-agenda" }, [
    h("div", { class: "day-agenda-head" }, [
      h("span", { class: "badge green", text: isSameDay(date, today) ? "今日" : formatDate(date) }),
      h("strong", { text: groups.length === events.length ? `${events.length}件の予定` : `${groups.length}種類の予定` })
    ]),
    h("div", { class: "day-agenda-list" },
      groups.length ? groups.map(renderCalendarEventGroup) : [empty("この日の作業予定はありません。")]
    )
  ]);
}

function groupCalendarEvents(events) {
  const groups = new Map();
  events.forEach((event) => {
    const key = `${event.date}|${event.kind || "task"}|${event.name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: event.date,
        kind: event.kind,
        name: event.name,
        events: [],
        crops: []
      });
    }
    const group = groups.get(key);
    group.events.push(event);
    if (event.kind === "weather") return;
    const cropId = event.masterId || event.cropName || "common";
    if (group.crops.some((crop) => crop.id === cropId)) return;
    group.crops.push({
      id: cropId,
      masterId: event.masterId,
      name: event.cropName || "共通"
    });
  });
  return [...groups.values()];
}

function renderCalendarEventGroup(group) {
  if (group.events.length === 1) return renderUpcomingEvent(group.events[0]);
  const names = group.crops.map((crop) => crop.name).filter(Boolean);
  return h("div", { class: `task upcoming grouped ${group.kind || ""}` }, [
    h("div", { class: "calendar-crop-stack" }, [
      ...group.crops.slice(0, 3).map((crop) => crop.masterId ? cropIcon(crop.masterId, "calendar-crop-icon small") : taskIcon("growth-check")),
      group.crops.length > 3 ? h("span", { class: "calendar-crop-rest", text: `+${group.crops.length - 3}` }) : null
    ]),
    h("div", {}, [
      h("div", { class: "task-title", text: group.name }),
      h("p", { class: "task-meta", text: `${formatDate(group.date)} / ${names.join("・") || "共通"}` })
    ])
  ]);
}

function compactEventTitle(event) {
  return `${event.cropName ? `${event.cropName} ` : ""}${event.name}`;
}

function calendarEventPriority(event) {
  const order = { seed: 1, plant: 2, care: 3, harvest: 4, weather: 5 };
  return order[event.kind] || 9;
}

function renderAlerts() {
  if (!state.premium) {
    return h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [
        h("h3", { text: "アラート・提案" }),
        h("span", { class: "badge amber", text: "プレミアム" })
      ]),
      h("div", { class: "settings-list" }, [
        settingRow("無料枠では非表示", "地域に合わせた天気の注意、作業タイミング、おすすめ野菜はプレミアムで表示します。"),
        settingRow("無料枠で使えること", "作物ごとの基本作業スケジュール、カレンダー、栽培履歴を利用できます。")
      ]),
      h("div", { class: "actions" }, [
        h("button", { class: "secondary-btn", onclick: () => setState({ premium: true, view: "settings" }) }, ["プレミアムを試す"])
      ])
    ]);
  }
  ensureOpenMeteoForecast();
  const alerts = getWeatherAlerts();
  const recs = getRecommendations();
  const selected = state.crops.find((item) => item.id === state.selectedCropId) || state.crops[0];
  const after = selected ? getAfterCropSuggestions(selected) : [];
  const visibleAfter = selected ? selectAfterCropSuggestions(after, 5) : [];
  return h("div", { class: "grid dashboard-grid" }, [
    h("section", { class: "grid" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [h("h3", { text: "今日の天気" }), weatherStatusBadge()]),
        weatherSourceNote(),
        weatherOverview(),
        h("h3", { class: "section-title", text: "気象アラート" }),
        alertDayGroups(alerts)
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-header" }, [
          h("h3", { text: "後作提案" }),
          selected ? h("span", { class: "badge violet", text: getCrop(selected.masterId).name }) : null
        ]),
        selected ? h("div", {}, [
          afterCropNote(getCrop(selected.masterId), visibleAfter),
          h("div", { class: "recommend-list" }, visibleAfter.map((suggestion) => renderAfterCropCard(getCrop(selected.masterId), suggestion)))
        ]) : empty("作物を登録すると、同じ場所に次に植えやすい候補を表示します。")
      ])
    ]),
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "月別おすすめ野菜" }), h("span", { class: "badge green", text: `${formatMonth(today)}` })]),
      monthlyRecommendationNote(),
      h("div", { class: "recommend-list" }, recs.slice(0, 8).map(renderRecommendCard))
    ])
  ]);
}

function renderRecommendCard(item) {
  return h("div", { class: "recommend-card" }, [
    cropIcon(item.crop.id),
    h("div", {}, [
      h("strong", { text: item.crop.name }),
      item.timingLabel ? h("span", { class: "recommend-meta", text: item.timingLabel }) : null,
      h("p", { text: item.reason }),
      item.note ? h("div", { class: "advice-points compact" }, [
        h("span", { class: "advice-point", text: item.note })
      ]) : null
    ])
  ]);
}

function firstGardenSetupCard() {
  const ids = ["mini-tomato", "cucumber", "komatsuna"];
  return h("div", { class: "panel first-setup-card" }, [
    h("div", { class: "first-setup-copy" }, [
      h("span", { class: "badge green", text: "最初の一歩" }),
      h("h3", { text: "育てている野菜を登録してみましょう" }),
      h("p", { class: "muted", text: "今育てている野菜、またはこれから育てたい野菜を1つ追加すると、作業予定と栽培メモを確認できるようになります。" })
    ]),
    h("div", { class: "first-setup-actions" }, [
      h("button", { class: "primary-btn", onclick: () => openCropModal() }, [uiIcon("plus"), "作物を追加する"]),
      h("div", { class: "quick-actions", "aria-label": "おすすめ作物" }, ids.map((id) => {
        const crop = getCrop(id);
        return h("button", { class: "chip", onclick: () => startCropModal(id) }, [cropIcon(id, "inline-crop-icon"), crop.name]);
      }))
    ])
  ]);
}

function quickStartCrops() {
  const ids = ["mini-tomato", "cucumber", "komatsuna"];
  return h("div", { class: "quick-start" }, [
    h("p", { class: "muted", text: "まずは育てたい作物を1つ選ぶだけで、予定を自動で作れます。" }),
    h("div", { class: "quick-actions" }, ids.map((id) => {
      const crop = getCrop(id);
      return h("button", { class: "chip", onclick: () => startCropModal(id) }, [cropIcon(id, "inline-crop-icon"), crop.name]);
    }))
  ]);
}

function renderCropSearchSuggestions(container, query, category, onPick) {
  container.innerHTML = "";
  if (!normalizeSearchText(query)) return;
  const suggestions = getCropSearchResults(query, category).slice(0, 6);
  if (!suggestions.length) return;
  container.append(
    h("span", { class: "suggestion-label", text: "検索候補" }),
    h("div", { class: "suggestion-chips" }, suggestions.map((item) => h("button", {
      class: "chip suggestion-chip",
      type: "button",
      onpointerdown: () => onPick(item.id),
      onclick: () => onPick(item.id)
    }, [cropIcon(item.id, "inline-crop-icon"), item.name])))
  );
}

function premiumNudge(title, body) {
  return h("div", { class: "panel premium-nudge" }, [
    h("div", { class: "panel-header" }, [h("h3", { text: title }), h("span", { class: "badge amber", text: "プレミアム" })]),
    h("p", { class: "muted", text: body }),
    h("button", { class: "secondary-btn", onclick: () => setState({ premium: true, view: "settings" }) }, ["プレミアムを試す"])
  ]);
}

function weatherStatusBadge() {
  if (state.weatherStatus === "ready" && state.weatherForecast) return h("span", { class: "badge green", text: "予報更新済み" });
  if (state.weatherStatus === "loading") return h("span", { class: "badge blue", text: "取得中" });
  if (state.weatherStatus === "error") return h("span", { class: "badge amber", text: "推定表示" });
  return h("span", { class: "badge amber", text: "準備中" });
}

function weatherSourceNote() {
  if (state.weatherStatus === "ready" && state.weatherForecast) {
    return h("p", { class: "fine-print", text: `設定地域の予報をもとに表示しています。最終更新: ${formatDateTime(state.weatherFetchedAt)}` });
  }
  if (state.weatherStatus === "loading") return h("p", { class: "fine-print", text: "天気予報を更新しています。" });
  if (state.weatherStatus === "error") return h("p", { class: "fine-print", text: "天気予報を取得できないため、地域の傾向をもとにした目安を表示しています。" });
  return h("p", { class: "fine-print", text: "天気予報の取得準備をしています。" });
}

function emptyAction(text, label, onclick) {
  return h("div", { class: "empty action-empty" }, [
    h("p", { text }),
    h("button", { class: "secondary-btn", onclick }, [label])
  ]);
}

function renderSettings() {
  const region = state.premium ? getRegion() : null;
  const panels = [
    state.premium ? h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "地域・環境" }), h("span", { class: "badge green", text: region.climateZoneName })]),
      h("div", { class: "form-grid" }, [
        selectField("都道府県", "settingsPrefecture", state.prefecture, prefectures.map((v) => [v, v]), (v) => setState({ prefecture: v, city: "" })),
        inputFieldLazy("市区町村", "text", state.city, (v) => setState({ city: v.trim() }), "例：長野市、世田谷区、那覇市")
      ]),
      renderClimateCard(region)
    ]) : null,
    h("section", { class: "panel" }, [
      h("h3", { class: "section-title", text: "通知設定" }),
      h("div", { class: "form-grid" }, [
        selectField("通知", "notificationMode", state.notificationMode === "off" ? "off" : "important", [
          ["important", "通知する"],
          ["off", "通知しない"]
        ], (v) => setState({ notificationMode: v })),
        state.notificationMode === "off" ? settingRow("通知時間", "通知をオンにすると時間を選べます。") : inputField("通知時間", "time", state.notificationTime, (v) => setState({ notificationTime: v }))
      ]),
      h("div", { class: "actions" }, [
        h("button", { class: "secondary-btn", onclick: requestBrowserNotification }, ["テスト通知"])
      ])
    ]),
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "データ管理" }), h("span", { class: "badge blue", text: "端末内保存" })]),
      h("div", { class: "settings-list" }, [
        settingRow("保存されるデータ", "登録した作物、栽培履歴、通知設定、地域設定はこの端末のブラウザに保存されます。"),
        settingRow("バックアップ", "データを書き出しておくと、あとで内容を確認できます。")
      ]),
      h("div", { class: "actions" }, [
        h("button", { class: "secondary-btn", onclick: exportUserData }, ["データを書き出す"]),
        h("button", { class: "plain-btn", onclick: resetApp }, ["データを初期化"])
      ])
    ]),
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "プラン" }), h("span", { class: state.premium ? "badge green" : "badge amber", text: state.premium ? "プレミアム" : "無料枠" })]),
      h("div", { class: "settings-list" }, [
        settingRow("無料プラン", "作物3件まで、基本の作業予定、カレンダー、栽培履歴を使えます。"),
        settingRow("プレミアム", "作物数を増やし、地域に合わせた作業タイミングや天気の注意を確認できます。")
      ]),
      h("div", { class: "actions" }, [
        h("button", { class: "secondary-btn", onclick: () => setState({ premium: !state.premium }) }, [state.premium ? "無料枠に戻す" : "プレミアムを試す"])
      ]),
      h("h3", { class: "section-title", text: "ご利用にあたって" }),
      h("p", { class: "fine-print", text: "表示される作業予定や注意は目安です。実際の天気、土の状態、品種、栽培環境を見ながら調整してください。" }),
      h("div", { class: "settings-list source-list" }, [
        settingRow("栽培情報", "家庭菜園向けの栽培資料をもとに、初心者が確認しやすい目安に整理しています。"),
        settingRow("天気の注意", "地域の予報をもとに、作物ごとに気をつけたい日だけ表示します。")
      ])
    ]),
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "免責" }), h("span", { class: "badge amber", text: "目安" })]),
      h("p", { class: "muted", text: "やさい暦の作業予定、栽培アドバイス、気象に関する注意は一般的な目安です。実際の栽培結果を保証するものではありません。" }),
      h("p", { class: "fine-print", text: "農薬の使用、病害虫の確定診断、収穫物の安全性判断などは、地域の公的機関や専門家の情報も確認してください。" })
    ]),
    h("section", { class: "panel" }, [
      h("div", { class: "panel-header" }, [h("h3", { text: "プライバシーポリシー" }), h("span", { class: "badge green", text: "安心" })]),
      h("div", { class: "settings-list" }, [
        settingRow("扱う情報", "作物名、作付け日、栽培履歴、地域設定、通知設定、送信したお問い合わせ内容を扱います。"),
        settingRow("保存場所", "現在のデータは主にこの端末のブラウザ内に保存されます。"),
        settingRow("外部送信", "お問い合わせフォームで送信を選んだ内容のみ、メール作成画面へ渡します。")
      ])
    ]),
    renderContactPanel()
  ];
  return h("div", { class: "grid dashboard-grid" }, panels);
}

function renderContactPanel() {
  const feedback = { type: "改善案", message: "", email: "" };
  return h("section", { class: "panel" }, [
    h("div", { class: "panel-header" }, [h("h3", { text: "お問い合わせ" }), h("span", { class: "badge blue", text: "フィードバック" })]),
    h("p", { class: "muted", text: "改善案、バグ報告、追加してほしい機能があれば送ってください。" }),
    h("div", { class: "form-grid feedback-form" }, [
      selectField("内容", "feedbackType", feedback.type, ["改善案", "バグ報告", "要望", "その他"].map((v) => [v, v]), (v) => { feedback.type = v; }),
      inputField("返信先メール 任意", "email", feedback.email, (v) => { feedback.email = v; })
    ]),
    labelWrap("内容", h("textarea", {
      placeholder: "例：作物追加の画面で、よく育てる野菜を上に出してほしい",
      onchange: (e) => { feedback.message = e.target.value.trim(); }
    })),
    h("div", { class: "actions" }, [
      h("button", { class: "secondary-btn", onclick: () => submitFeedback(feedback, false) }, ["下書き保存"]),
      h("button", { class: "primary-btn", onclick: () => submitFeedback(feedback, true) }, ["メールで送る"])
    ]),
    h("p", { class: "fine-print", text: "下書き保存した内容はこの端末内に保存されます。メールで送る場合は、端末のメール作成画面が開きます。" })
  ]);
}

function renderClimateCard(region, compact = false) {
  return h("div", { class: compact ? "climate-card compact" : "climate-card" }, [
    h("div", { class: "panel-header" }, [
      h("div", {}, [
        h("h3", { text: `${region.climateZoneName} / ${region.regionGroupName}` }),
        h("p", { class: "muted", text: `${confidenceLabel(region.confidence)}・代表例: ${region.examples.slice(0, 4).join("、")}` })
      ]),
      h("span", { class: confidenceBadge(region.confidence), text: confidenceLabel(region.confidence) })
    ]),
    h("p", { class: "muted", text: region.beginnerMessage }),
    h("div", { class: "tag-list" }, region.tags.map((tag) => h("span", { class: "badge green", title: climateModifierTags[tag]?.[1] || "", text: climateModifierTags[tag]?.[0] || tag }))),
    h("div", { class: "climate-metrics" }, [
      meta("春まき補正", formatDayShift(region.springAdjustmentDays)),
      meta("定植補正", formatDayShift(region.plantingAdjustmentDays)),
      meta("秋まき補正", formatDayShift(region.autumnAdjustmentDays)),
      meta("霜注意", region.frostCautionPeriod),
      meta("高温注意", region.heatCautionPeriod),
      meta("雨・台風", region.rainyCautionPeriod)
    ]),
    compact ? null : h("p", { class: "fine-print", text: "同じ地域でも、標高、海沿い/内陸、日当たり、風通し、土の状態で適期は前後します。畑の様子を見ながら調整してください。" })
  ]);
}

function confidenceLabel(confidence) {
  return { high: "精度高", medium_high: "精度やや高", medium: "精度中", low: "仮分類" }[confidence] || "精度中";
}

function confidenceBadge(confidence) {
  return confidence === "high" ? "badge green" : confidence === "medium_high" ? "badge blue" : confidence === "low" ? "badge red" : "badge amber";
}

function formatDayShift(days) {
  if (!days) return "標準";
  return days > 0 ? `標準より${days}日遅め` : `標準より${Math.abs(days)}日早め`;
}

function renderCropModal(editingId = null) {
  const editing = editingId ? state.crops.find((item) => item.id === editingId) : null;
  const initial = editing || {
    masterId: state.form.selectedMasterId,
    place: state.locationType,
    sowDate: "",
    plantingDate: "",
    startMethod: "planning",
    status: "育てたい",
    note: ""
  };
  const modalState = normalizeCropRecord({ ...initial });
  let modalStep = editing ? 2 : 1;
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
  const root = h("div", {
    class: "modal-backdrop",
    onclick: (event) => {
      if (event.target === root) root.remove();
    }
  });
  const categories = ["すべて", ...new Set(crops.map((item) => item.category))];
  const body = h("div", { class: "modal-body" });

  const selectedMaster = () => getCrop(modalState.masterId);
  const stepDots = () => h("div", { class: "stepper" }, [
    stepDot(1, "作物", modalStep),
    stepDot(2, "始め方", modalStep),
    stepDot(3, "確認", modalStep)
  ]);

  const goStep = (step) => {
    modalStep = Math.max(1, Math.min(3, step));
    renderStep();
  };

  const rebuildPicker = (container, suggestionsContainer = null) => {
    container.innerHTML = "";
    if (suggestionsContainer) renderCropSearchSuggestions(suggestionsContainer, state.form.search, state.form.category, (id) => {
      modalState.masterId = id;
      state.form.selectedMasterId = id;
      if (!editing) applyStartMethod(modalState, "planning", getCrop(id), { preserveDates: false });
      rebuildPicker(container, suggestionsContainer);
    });
    const filtered = getCropSearchResults(state.form.search, state.form.category);
    if (!filtered.length) {
      container.append(emptyAction("一致する作物が見つかりませんでした。ひらがな、カタカナ、漢字名で検索できます。", "検索をクリア", () => {
        state.form.search = "";
        renderStep();
      }));
      return;
    }
    filtered.forEach((item) => {
      const selectItem = () => {
        modalState.masterId = item.id;
        state.form.selectedMasterId = item.id;
        if (!editing) applyStartMethod(modalState, "planning", item, { preserveDates: false });
        rebuildPicker(container, suggestionsContainer);
      };
      container.append(h("button", {
        type: "button",
        class: `crop-pick ${modalState.masterId === item.id ? "active" : ""}`,
        onpointerdown: selectItem,
        onclick: selectItem
      }, [
        cropIcon(item.id, "crop-pick-icon"),
        h("strong", { text: item.name }),
        h("small", { class: "muted", text: `${item.family} / ${item.difficulty}` })
      ]));
    });
  };

  const modal = h("div", { class: "modal" }, [
    h("div", { class: "modal-head" }, [
      h("h3", { text: editing ? "作物を編集" : "作物を追加" }),
      h("button", { class: "icon-btn modal-close", type: "button", "aria-label": "閉じる", title: "閉じる", onclick: () => root.remove() }, ["×"])
    ]),
    body
  ]);

  function renderStep() {
    body.innerHTML = "";
    body.append(stepDots());
    if (modalStep === 1) {
      const picker = h("div", { class: "crop-picker" });
      const suggestions = h("div", { class: "search-suggestions" });
      body.append(
        h("div", { class: "form-grid" }, [
          inputField("検索", "text", state.form.search, (v) => {
            state.form.search = v;
            rebuildPicker(picker, suggestions);
          }),
          selectField("カテゴリ", "modalCategory", state.form.category, categories.map((v) => [v, v]), (v) => {
            state.form.category = v;
            rebuildPicker(picker, suggestions);
          })
        ]),
        suggestions,
        h("h3", { class: "section-title", text: "育てる作物を選ぶ" }),
        picker,
        modalActions(root, null, () => goStep(2), "次へ")
      );
      rebuildPicker(picker, suggestions);
      return;
    }

    if (modalStep === 2) {
      body.append(
        h("div", { class: "selected-crop-strip" }, [
          cropIcon(selectedMaster().id, "inline-crop-icon"),
          h("div", {}, [h("strong", { text: selectedMaster().name }), h("p", { class: "muted", text: `${selectedMaster().family} / ${selectedMaster().difficulty}` })])
        ]),
        h("h3", { class: "section-title", text: "栽培の始め方を選ぶ" }),
        renderStartMethodChoices(modalState, selectedMaster(), () => renderStep()),
        renderModalDateFields(modalState, selectedMaster()),
        ...(modalState.status === "育てたい" ? [renderTimingAdvice(selectedMaster())] : []),
        modalActions(root, () => goStep(1), () => goStep(3), "確認へ")
      );
      return;
    }

    body.append(
      h("div", { class: "confirm-card" }, [
        cropIcon(selectedMaster().id, "detail-crop-icon"),
        h("div", {}, [
          h("strong", { text: selectedMaster().name }),
          h("p", { class: "muted", text: `${cropPhaseLabel(normalizeCropRecord(modalState), selectedMaster())} / ${cropDateSummary(normalizeCropRecord(modalState), selectedMaster())}` })
        ])
      ]),
      labelWrap("メモ", h("textarea", { onchange: (e) => { modalState.note = e.target.value; } }, [modalState.note || ""])),
      modalActions(root, () => goStep(2), () => {
        if (!state.premium && !editing && state.crops.length >= 3) {
          showToast("無料枠では作物3件までです。プレミアムに切り替えると追加できます。");
          return;
        }
        saveCrop(modalState, editingId);
        root.remove();
      }, editing ? "更新する" : "追加する")
    );
  }

  root.append(modal);
  document.body.append(root);
  renderStep();
}

function openCropModal() {
  renderCropModal();
}

function renderStatusChoices(modalState, onChange) {
  return renderStartMethodChoices(modalState, getCrop(modalState.masterId), onChange);
}

function renderStartMethodChoices(modalState, master, onChange) {
  const currentMethod = getStartMethod(modalState, master);
  return h("div", { class: "status-choice-grid" }, allowedStartMethods(master).map((option) =>
    h("button", {
      type: "button",
      class: currentMethod === option.value ? "status-choice active" : "status-choice",
      onclick: () => {
        applyStartMethod(modalState, option.value, master, { preserveDates: false });
        onChange();
      }
    }, [
      h("strong", { text: option.title }),
      h("span", { text: option.body })
    ])
  ));
}

function renderModalDateFields(modalState, master) {
  const method = getStartMethod(modalState, master);
  if (method === "planning") {
    return h("p", { class: "muted", text: "日付はまだ登録しません。作物管理画面で作業完了ボタンを押すと、今日の日付で自動記録できます。" });
  }
  if (method === "direct") {
    return h("div", { class: "form-grid" }, [
      inputField("種まき日", "date", modalState.sowDate || iso(today), (v) => { modalState.sowDate = v; })
    ]);
  }
  if (method === "nursery") {
    const fields = [
      inputField("ポット種まき日", "date", modalState.sowDate || iso(today), (v) => { modalState.sowDate = v; }),
    ];
    if (isIsoDate(modalState.plantingDate)) {
      fields.push(inputField("定植日 任意", "date", modalState.plantingDate, (v) => { modalState.plantingDate = v; }));
    }
    return h("div", { class: "form-grid" }, fields);
  }
  const fields = [];
  if (method === "seedling" && isIsoDate(modalState.sowDate)) {
    fields.push(inputField("種まき日 任意", "date", modalState.sowDate, (v) => { modalState.sowDate = v; }));
  }
  fields.push(inputField(method === "material" ? `${plantingNoun(master)}日` : "定植日", "date", modalState.plantingDate || iso(today), (v) => { modalState.plantingDate = v; }));
  return h("div", { class: "form-grid" }, fields);
}

function allowedStartMethods(master) {
  const values = ["planning"];
  if (plantingMaterialCropIds.has(master.id)) {
    values.push("material");
  } else {
    if (directSownOnlyCropIds.has(master.id) || directSowPreferredCropIds.has(master.id) || !isTransplantMethodAvailable(master)) {
      values.push("direct");
    }
    if (isTransplantMethodAvailable(master)) {
      values.push("nursery", "seedling");
    }
  }
  return [...new Set(values)].map((value) => startMethodOption(value, master));
}

function startMethodOption(value, master) {
  const option = { ...startMethodDefinitions[value] };
  if (value === "material") {
    option.title = `${materialKindDescription(master)}を植える`;
    option.body = `${materialKindDescription(master)}を植えた日から、作業予定と収穫目安を作ります。`;
  }
  if (value === "direct" && directSownOnlyCropIds.has(master.id)) {
    option.body = "移植を避けたい作物。畑やプランターに直接まいた日から予定を作ります。";
  }
  return option;
}

function getStartMethod(item, master = getCrop(item.masterId || item.id)) {
  return normalizeStartMethod(item.startMethod || inferStartMethod(item, master), master);
}

function normalizeStartMethod(method, master) {
  const allowed = allowedStartMethods(master).map((option) => option.value);
  if (allowed.includes(method)) return method;
  if (plantingMaterialCropIds.has(master.id)) return "material";
  if (directSownOnlyCropIds.has(master.id)) return "direct";
  return allowed.includes("nursery") ? "nursery" : allowed[1] || "planning";
}

function inferStartMethod(item, master) {
  if (item.status === "育てたい") return "planning";
  if (plantingMaterialCropIds.has(master.id)) return "material";
  if (item.status === "苗を植えた") return isIsoDate(item.sowDate) ? "nursery" : "seedling";
  if (item.status === "種まき済み") {
    if (directSownOnlyCropIds.has(master.id) || directSowPreferredCropIds.has(master.id)) return "direct";
    return isTransplantMethodAvailable(master) ? "nursery" : "direct";
  }
  if (isIsoDate(item.plantingDate)) return plantingMaterialCropIds.has(master.id) ? "material" : "seedling";
  if (isIsoDate(item.sowDate)) return directSownOnlyCropIds.has(master.id) ? "direct" : "nursery";
  return "planning";
}

function applyStartMethod(target, method, master, { preserveDates = true } = {}) {
  const nextMethod = normalizeStartMethod(method, master);
  const definition = startMethodDefinitions[nextMethod];
  target.masterId = master.id;
  target.startMethod = nextMethod;
  target.status = definition.status;
  if (nextMethod === "planning") {
    target.sowDate = "";
    target.plantingDate = "";
  } else if (nextMethod === "direct") {
    target.sowDate = preserveDates && isIsoDate(target.sowDate) ? target.sowDate : iso(today);
    target.plantingDate = "";
  } else if (nextMethod === "nursery") {
    target.sowDate = preserveDates && isIsoDate(target.sowDate) ? target.sowDate : iso(today);
    if (!preserveDates) target.plantingDate = "";
  } else {
    target.plantingDate = preserveDates && isIsoDate(target.plantingDate) ? target.plantingDate : iso(today);
    if (nextMethod === "material" || !isIsoDate(target.sowDate)) target.sowDate = "";
  }
  return target;
}

function isTransplantMethodAvailable(master) {
  if (directSownOnlyCropIds.has(master.id) || plantingMaterialCropIds.has(master.id)) return false;
  return plantingBaseCropIds.has(master.id) || Boolean(harvestAfterPlantingDays[master.id]);
}

function plantingNoun(master) {
  const labels = {
    potato: "種イモ植え付け",
    "sweet-potato": "つる苗植え付け",
    garlic: "りん片植え付け",
    satoimo: "種イモ植え付け",
    ginger: "種ショウガ植え付け",
    nagaimo: "種イモ植え付け",
    myoga: "地下茎植え付け",
    rakkyo: "球根植え付け"
  };
  return labels[master.id] || "植え付け";
}

function materialKindDescription(master) {
  const labels = {
    potato: "種イモ",
    "sweet-potato": "つる苗",
    garlic: "りん片",
    satoimo: "種イモ",
    ginger: "種ショウガ",
    nagaimo: "種イモ",
    myoga: "地下茎",
    rakkyo: "球根"
  };
  return labels[master.id] || "植え付け材料";
}

function startActionLabel(method, master) {
  if (method === "direct") return "種まき完了";
  if (method === "nursery") return "ポット種まき完了";
  if (method === "seedling") return "苗を植えた";
  if (method === "material") return `${materialKindDescription(master)}を植えた`;
  return "作業完了";
}

function startCropModal(masterId) {
  state.form.selectedMasterId = masterId;
  saveState();
  renderCropModal();
}

function stepDot(step, label, current) {
  return h("div", { class: step === current ? "step-dot active" : step < current ? "step-dot done" : "step-dot" }, [
    h("span", { text: step < current ? "✓" : String(step) }),
    h("strong", { text: label })
  ]);
}

function modalActions(root, onBack, onNext, nextLabel) {
  return h("div", { class: "actions modal-actions" }, [
    h("button", { class: "secondary-btn", onclick: onBack || (() => root.remove()) }, [onBack ? "戻る" : "キャンセル"]),
    h("button", { class: "primary-btn", onclick: onNext }, [nextLabel])
  ]);
}

function editCrop(id) {
  renderCropModal(id);
}

function saveCrop(data, editingId) {
  const normalized = normalizeCropRecord({ ...data, masterId: data.masterId || state.form.selectedMasterId });
  if (editingId) {
    setState({ crops: state.crops.map((item) => item.id === editingId ? { ...item, ...normalized } : item) });
    showToast("作物情報を更新しました。予定も再生成されています。");
    return;
  }
  const item = { ...normalized, id: crypto.randomUUID() };
  setState({ crops: [...state.crops, item], selectedCropId: item.id, view: "crops" });
  showToast(`${getCrop(item.masterId).name}を追加しました。作業予定を自動生成しました。`);
}

function markCropSown(id, method = "direct") {
  const item = state.crops.find((crop) => crop.id === id);
  if (!item) return;
  const master = getCrop(item.masterId);
  const nextMethod = normalizeStartMethod(method, master);
  const label = nextMethod === "nursery" ? "ポット種まき" : "種まき";
  if (!window.confirm(`${master.name}の${label}を今日完了にしますか？`)) return;
  setState({
    crops: state.crops.map((crop) => crop.id === id
      ? normalizeCropRecord({ ...crop, startMethod: nextMethod, status: "種まき済み", sowDate: iso(today), plantingDate: nextMethod === "direct" ? "" : crop.plantingDate || "" })
      : crop)
  });
  showToast(`${master.name}の${label}日を今日で記録しました。`);
}

function markCropPlanted(id, method = "") {
  const item = state.crops.find((crop) => crop.id === id);
  if (!item) return;
  const master = getCrop(item.masterId);
  const currentMethod = getStartMethod(item, master);
  const nextMethod = normalizeStartMethod(method || (currentMethod === "nursery" ? "nursery" : plantingMaterialCropIds.has(master.id) ? "material" : "seedling"), master);
  const actionLabel = nextMethod === "material" ? `${materialKindDescription(master)}の植え付け` : "定植";
  if (!window.confirm(`${master.name}の${actionLabel}を今日完了にしますか？`)) return;
  setState({
    crops: state.crops.map((crop) => crop.id === id
      ? normalizeCropRecord({ ...crop, startMethod: nextMethod, status: "苗を植えた", plantingDate: iso(today) })
      : crop)
  });
  showToast(`${master.name}の${actionLabel}日を今日で記録しました。`);
}

function finishCrop(id) {
  const item = state.crops.find((cropItem) => cropItem.id === id);
  if (!item) return;
  if (!window.confirm(`${getCrop(item.masterId).name}を栽培終了にして、履歴へ保存しますか？`)) return;
  const done = { ...item, status: "栽培終了", finishedAt: iso(today) };
  setState({
    crops: state.crops.filter((cropItem) => cropItem.id !== id),
    history: [done, ...state.history],
    selectedCropId: state.crops.find((cropItem) => cropItem.id !== id)?.id || null
  });
  showToast("栽培履歴に保存しました。後作候補も確認できます。");
}

function removeCrop(id) {
  const item = state.crops.find((cropItem) => cropItem.id === id);
  if (item && !window.confirm(`${getCrop(item.masterId).name}を削除しますか？この操作は元に戻せません。`)) return;
  setState({ crops: state.crops.filter((item) => item.id !== id), selectedCropId: state.selectedCropId === id ? null : state.selectedCropId });
  showToast("作物を削除しました。");
}

function seedDemoData() {
  const samples = [
    ["potato", -80, -80, "種まき済み", "畑"],
    ["cucumber", -12, -4, "苗を植えた", "貸し農園"],
    ["komatsuna", -8, -8, "種まき済み", "プランター"]
  ].map(([masterId, sow, plant, status, place]) => ({
    id: crypto.randomUUID(),
    masterId,
    sowDate: iso(addDays(today, sow)),
    plantingDate: iso(addDays(today, plant)),
    status,
    place,
    note: "デモデータ"
  }));
  setState({ crops: samples.map(normalizeCropRecord), selectedCropId: samples[0].id, premium: true });
  showToast("確認用の栽培データを追加しました。");
}

function resetApp() {
  if (!window.confirm("アプリのデータを初期化しますか？登録した作物と履歴が消えます。")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { ...defaultState };
  render();
}

function exportUserData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "やさい暦",
    data: { ...state, toast: null }
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yasai-goyomi-backup-${iso(today)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("データを書き出しました。");
}

function submitFeedback(feedback, openMail) {
  if (!feedback.message) {
    showToast("内容を入力してください。");
    return;
  }
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: feedback.type,
    message: feedback.message,
    email: feedback.email
  };
  const saved = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify([item, ...saved].slice(0, 20)));
  if (openMail) {
    const subject = encodeURIComponent(`やさい暦 ${feedback.type}`);
    const body = encodeURIComponent(`種類: ${feedback.type}\n返信先: ${feedback.email || "未入力"}\n\n内容:\n${feedback.message}`);
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
    showToast("メール作成画面を開きます。");
    return;
  }
  showToast("フィードバックを下書き保存しました。");
}

function taskList(tasks, mode) {
  if (!tasks.length) return empty(mode === "today" ? "今日の作業はありません。" : "直近の作業予定はありません。");
  return h("div", { class: "task-list" }, tasks.map((task) => h("div", { class: "task" }, [
    taskIcon(task.iconKey || "growth-check"),
    h("div", {}, [
      h("div", { class: "task-title", text: task.name }),
      h("p", { class: "task-meta", text: `${task.cropName} / ${formatDate(task.date)} / ${task.description}` })
    ]),
    h("span", { class: `badge ${badgeForTask(task.kind)}`, text: task.label })
  ])));
}

function alertList(alerts) {
  if (!alerts.length) return empty("現在、重要な気象アラートはありません。");
  return h("div", { class: "alert-list" }, alerts.map((alert) => h("div", { class: `alert ${alert.type}` }, [
    weatherIcon(weatherIconKeyForAlert(alert), "alert-icon weather-alert-icon"),
    h("div", {}, [
      h("strong", { text: alert.title }),
      h("p", { text: alert.message }),
      alert.affectedCrops?.length ? affectedCropChips(alert.affectedCrops) : null,
      h("span", { class: alert.priority === "高" ? "badge red" : "badge amber", text: `優先度 ${alert.priority}` })
    ])
  ])));
}

function affectedCropChips(cropNames) {
  const visible = cropNames.slice(0, 4);
  const rest = cropNames.length - visible.length;
  return h("div", { class: "affected-crops" }, [
    h("span", { class: "affected-label", text: `対象 ${cropNames.length}件` }),
    ...visible.map((name) => h("span", { class: "mini-chip", text: name })),
    rest > 0 ? h("span", { class: "mini-chip muted-chip", text: `ほか${rest}件` }) : null
  ]);
}

function weatherOverview() {
  const days = getForecastDays().slice(0, 3);
  if (state.weatherStatus === "loading") return empty("天気を取得しています。");
  if (!days.length) return empty("天気情報を取得できませんでした。地域の傾向をもとにアラートを表示します。");
  return h("div", { class: "weather-overview" }, days.map((day) => {
    const weather = weatherCodeMeta(day.weatherCode, day);
    return h("div", { class: "weather-card" }, [
      weatherIcon(weather.iconKey),
      h("div", {}, [
        h("span", { class: "weather-day-label", text: relativeDayLabel(day.daysAhead) }),
        h("strong", { text: weather.label }),
        h("p", { text: `${Math.round(day.min)}〜${Math.round(day.max)}℃ / 雨 ${Math.round(day.rain)}mm / 風 ${Math.round(day.wind)}m/s` })
      ])
    ]);
  }));
}

function alertDayGroups(alerts) {
  const targetDays = [0, 1, 2];
  const groups = targetDays.map((daysAhead) => ({
    daysAhead,
    date: iso(addDays(today, daysAhead)),
    alerts: alerts.filter((alert) => alert.daysAhead === daysAhead)
  }));
  const laterAlerts = alerts.filter((alert) => alert.daysAhead > 2);
  if (laterAlerts.length) {
    groups.push({ daysAhead: 3, date: iso(addDays(today, 3)), alerts: laterAlerts, label: "3日後以降" });
  }
  return h("div", { class: "alert-day-groups" }, groups.map((group) => h("div", { class: "alert-day-group" }, [
    h("div", { class: "alert-day-heading" }, [
      h("strong", { text: group.label || relativeDayLabel(group.daysAhead) }),
      h("span", { text: formatDate(group.date) })
    ]),
    group.alerts.length ? alertList(group.alerts) : h("div", { class: "alert-empty", text: "この日の大きなアラートはありません。" })
  ])));
}

function getForecastDays() {
  const forecast = state.weatherForecast;
  if (state.weatherStatus !== "ready" || !forecast?.days?.length) return [];
  return forecast.days
    .map((day) => ({ ...day, daysAhead: daysBetween(today, parseDate(day.date)) }))
    .filter((day) => day.daysAhead >= 0);
}

function weatherCodeMeta(code, day = {}) {
  const value = Number(code);
  if (value === 0) return { iconKey: "sunny", label: "晴れ" };
  if (value === 1) return { iconKey: "partly-cloudy", label: "晴れ時々曇り" };
  if (value === 2) return { iconKey: "partly-cloudy", label: "晴れのち曇り" };
  if (value === 3) return { iconKey: "cloudy", label: "曇り" };
  if ([45, 48].includes(value)) return { iconKey: "fog", label: "霧" };
  if ([51, 53, 55, 56, 57].includes(value)) return { iconKey: "drizzle", label: "霧雨" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return { iconKey: "rain", label: "雨" };
  if ([71, 73, 75, 77, 85, 86].includes(value)) return { iconKey: "snow", label: "雪" };
  if ([95, 96, 99].includes(value)) return { iconKey: "thunder", label: "雷雨" };
  if (day.rain >= 20) return { iconKey: "rain", label: "雨" };
  if (day.rain >= 5) return { iconKey: "drizzle", label: "曇り時々雨" };
  if (day.rain > 0) return { iconKey: "drizzle", label: "晴れのち雨" };
  if (day.humidity >= 82) return { iconKey: "cloudy", label: "曇り" };
  if (day.humidity >= 68) return { iconKey: "partly-cloudy", label: "晴れのち曇り" };
  return { iconKey: "sunny", label: "晴れ" };
}

function weatherIconKeyForAlert(alert) {
  if (alert.iconKey) return alert.iconKey;
  if (alert.type === "low") return "cold";
  if (alert.type === "hot") return "sunny";
  if (alert.type === "rain") {
    if (String(alert.title || "").includes("強風")) return "wind";
    return "rain";
  }
  return "partly-cloudy";
}

function relativeDayLabel(daysAhead) {
  if (daysAhead === 0) return "今日";
  if (daysAhead === 1) return "明日";
  if (daysAhead === 2) return "明後日";
  return `${daysAhead}日後`;
}

function tasksForCrop(item) {
  const master = getCrop(item.masterId);
  if (item.status === "育てたい") return plannedStartTasks(item, master);
  const method = getStartMethod(item, master);
  if (method === "nursery" && item.status === "種まき済み" && !isIsoDate(item.plantingDate)) {
    return nurseryStageTasks(item, master);
  }
  const harvest = getHarvestSchedule(item);
  const start = harvest.base.date;
  const sow = parseDate(item.sowDate || item.plantingDate || iso(today));
  const planting = parseDate(item.plantingDate || item.sowDate || iso(today));
  const hasDistinctPlantingDate = !item.sowDate || daysBetween(sow, planting) >= 7 || harvest.base.kind === "planting";
  const includeSowTask = ["direct", "nursery"].includes(method) && isIsoDate(item.sowDate);
  const includePlantingTask = ["nursery", "seedling", "material"].includes(method) && isIsoDate(item.plantingDate) && hasDistinctPlantingDate;
  const fertilizing = fertilizingTaskForCrop(master, start, harvest.range);
  const sowTaskName = method === "nursery" ? "ポット種まき確認" : "種まき確認";
  const plantTaskName = method === "material" ? `${plantingNoun(master)}確認` : "定植確認";
  const plantTaskLabel = method === "material" ? "植え付け" : "定植";
  const plantTaskDescription = method === "material"
    ? `${materialKindDescription(master)}の乾き、覆土、芽出し後の状態を確認します。`
    : "苗のぐらつき、乾き、低温リスクを確認します。";
  const templates = method === "direct"
    ? directSownStageTemplates(master, sow, harvest)
    : method === "material"
      ? materialStageTemplates(master, planting, harvest, plantTaskName, plantTaskLabel, plantTaskDescription, includePlantingTask)
      : transplantedStageTemplates(master, sow, planting, harvest, sowTaskName, plantTaskName, plantTaskDescription, includeSowTask, includePlantingTask, method);
  return templates
    .filter(Boolean)
    .map((task) => ({
      id: `${item.id}-${task.name}`,
      cropId: item.id,
      masterId: master.id,
      cropName: master.name,
      date: iso(addDays(task.base, task.offset)),
      ...task
    }))
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function nurseryStageTasks(item, master) {
  const sow = parseDate(item.sowDate || iso(today));
  const readyDays = nurseryReadyDays(master);
  const readyDate = addDays(sow, readyDays);
  const templates = [
    { name: "ポット種まき記録", base: sow, offset: 0, kind: "seed", iconKey: "sowing", label: "記録", description: "種まき日は記録済みです。発芽まで土を乾かしすぎないよう見守ります。", recordOnly: true },
    { name: "発芽確認", base: sow, offset: germinationCheckDays(master), kind: "seed", iconKey: "germination", label: "発芽", description: "芽が出たか確認し、乾きすぎと低温を避けます。" },
    { name: "育苗確認", base: sow, offset: Math.max(12, Math.round(readyDays * 0.45)), kind: "care", iconKey: "seedling-check", label: "育苗", description: "徒長していないか、葉色と水やりの量を確認します。" },
    { name: "定植準備", base: sow, offset: Math.max(18, readyDays - 7), kind: "plant", iconKey: "planting", label: "準備", description: "本葉がそろい、最低気温が安定したら植える準備をします。" },
    { name: "定植適期", base: readyDate, offset: 0, kind: "plant", iconKey: "planting", label: "定植", description: `${master.name}は苗が育ったら定植します。完了したら「定植完了」を押してください。` }
  ];
  return templates.map((task) => ({
    id: `${item.id}-${task.name}`,
    cropId: item.id,
    masterId: master.id,
    cropName: master.name,
    date: iso(addDays(task.base, task.offset)),
    ...task
  })).sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function directSownStageTemplates(master, sow, harvest) {
  return [
    { name: "種まき記録", base: sow, offset: 0, kind: "seed", iconKey: "sowing", label: "記録", description: "種まき日は記録済みです。発芽まで土を乾かしすぎないよう見守ります。", recordOnly: true },
    { name: "発芽確認", base: sow, offset: germinationCheckDays(master), kind: "seed", iconKey: "germination", label: "発芽", description: "芽が出たか確認し、乾いたらやさしく水を足します。" },
    { name: "間引き・株間確認", base: sow, offset: thinningDays(master), kind: "care", iconKey: "thinning", label: "間引き", description: "混み合う芽を間引き、残す株の間隔を整えます。" },
    master.supportRequired ? { name: "支柱立て・誘引", base: sow, offset: 28, kind: "care", iconKey: "support", label: "支柱", description: "つるや茎が伸びる前に、支柱と誘引の準備をします。" } : null,
    { name: "防虫・水管理", base: sow, offset: 21, kind: "care", iconKey: master.tunnelRequired ? "tunnel" : "watering", label: "管理", description: master.tunnelRequired ? "葉物やアブラナ科は防虫ネットのすき間を確認します。" : "土の乾きと葉色を見て、水やりを調整します。" },
    fertilizingTaskForCrop(master, sow, harvest.range),
    { name: needsHilling(master) ? "土寄せ" : "敷きわら・乾燥対策", base: sow, offset: 34, kind: "care", iconKey: needsHilling(master) ? "hilling" : "mulching", label: needsHilling(master) ? "土寄せ" : "対策", description: needsHilling(master) ? "株元へ土を寄せ、倒伏や根の露出を防ぎます。" : "泥はねと乾燥を抑えるため株元を保護します。" },
    { name: "収穫開始目安", base: sow, offset: harvest.range[0], kind: "harvest", iconKey: "harvesting", label: "収穫", description: "大きさと色を見て、取り遅れに注意します。" },
    { name: "栽培終了・後作検討", base: sow, offset: harvest.range[1], kind: "harvest", iconKey: "rotation", label: "後作", description: `${master.family}の連作を避け、次の作物候補を確認します。` }
  ];
}

function transplantedStageTemplates(master, sow, planting, harvest, sowTaskName, plantTaskName, plantTaskDescription, includeSowTask, includePlantingTask, method) {
  const templates = [
    includeSowTask ? { name: sowTaskName, base: sow, offset: 0, kind: "seed", iconKey: "sowing", label: "記録", description: "種まき日は記録済みです。", recordOnly: true } : null,
    includePlantingTask ? { name: plantTaskName, base: planting, offset: 0, kind: "plant", iconKey: "planting", label: "記録", description: plantTaskDescription, recordOnly: true } : null,
    { name: "活着確認", base: planting, offset: 5, kind: "plant", iconKey: "settling", label: "活着", description: "苗がしおれず根づいているか確認し、強い日差しと乾燥に注意します。" },
    master.supportRequired ? { name: "支柱立て・誘引", base: planting, offset: 10, kind: "care", iconKey: "support", label: "支柱", description: "風で倒れないよう支柱を立て、茎をきつく締めずに誘引します。" } : { name: "生育確認", base: planting, offset: 14, kind: "care", iconKey: "growth-check", label: "管理", description: "葉色、土の乾き、虫食いの有無を確認します。" },
    fertilizingTaskForCrop(master, planting, harvest.range),
    { name: needsHilling(master) ? "土寄せ" : "敷きわら・乾燥対策", base: planting, offset: 34, kind: "care", iconKey: needsHilling(master) ? "hilling" : "mulching", label: needsHilling(master) ? "土寄せ" : "対策", description: needsHilling(master) ? "株元へ土を寄せ、倒伏を防ぎます。" : "泥はねと乾燥を抑えるため株元を保護します。" },
    { name: "収穫開始目安", base: planting, offset: harvest.range[0], kind: "harvest", iconKey: "harvesting", label: "収穫", description: "大きさと色を見て、取り遅れに注意します。" },
    { name: "栽培終了・後作検討", base: planting, offset: harvest.range[1], kind: "harvest", iconKey: "rotation", label: "後作", description: `${master.family}の連作を避け、次の作物候補を確認します。` }
  ];
  return templates;
}

function materialStageTemplates(master, planting, harvest, plantTaskName, plantTaskLabel, plantTaskDescription, includePlantingTask) {
  return [
    includePlantingTask ? { name: plantTaskName, base: planting, offset: 0, kind: "plant", iconKey: "planting", label: "記録", description: plantTaskDescription, recordOnly: true } : null,
    { name: "芽出し確認", base: planting, offset: materialSproutDays(master), kind: "plant", iconKey: "sprouting", label: "芽出し", description: `${materialKindDescription(master)}から芽が動いているか確認します。乾燥と過湿に注意します。` },
    { name: needsHilling(master) ? "芽かき・土寄せ" : "生育確認", base: planting, offset: materialCareDays(master), kind: "care", iconKey: needsHilling(master) ? "hilling" : "growth-check", label: needsHilling(master) ? "土寄せ" : "管理", description: needsHilling(master) ? "芽が伸びたら強い芽を残し、株元へ土を寄せます。" : "葉色、土の乾き、虫食いの有無を確認します。" },
    fertilizingTaskForCrop(master, planting, harvest.range),
    { name: needsHilling(master) ? "2回目の土寄せ" : "敷きわら・乾燥対策", base: planting, offset: 45, kind: "care", iconKey: needsHilling(master) ? "hilling" : "mulching", label: needsHilling(master) ? "土寄せ" : "対策", description: needsHilling(master) ? "イモが緑化しないよう、株元に土を足します。" : "土の乾きや泥はねを抑え、株元を守ります。" },
    { name: "収穫開始目安", base: planting, offset: harvest.range[0], kind: "harvest", iconKey: "harvesting", label: "収穫", description: "大きさと色を見て、取り遅れに注意します。" },
    { name: "栽培終了・後作検討", base: planting, offset: harvest.range[1], kind: "harvest", iconKey: "rotation", label: "後作", description: `${master.family}の連作を避け、次の作物候補を確認します。` }
  ];
}

function plannedStartTasks(item, master) {
  const tasks = [];
  const methods = allowedStartMethods(master).map((option) => option.value);
  if (methods.includes("material")) {
    const plantDate = nextTimingDate(master.plantingMonths?.length ? master.plantingMonths : master.seedMonths);
    tasks.push({
      id: `${item.id}-${plantingNoun(master)}適期`,
      cropId: item.id,
      masterId: master.id,
      cropName: master.name,
      date: iso(plantDate),
      name: `${plantingNoun(master)}適期`,
      kind: "plant",
      iconKey: "planting",
      label: "植え付け",
      description: `${master.name}は${materialKindDescription(master)}から始める作物です。${timingWindowText(master.plantingMonths?.length ? master.plantingMonths : master.seedMonths)}を目安に植え付けます。`
    });
    return tasks.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }
  if (master.seedMonths?.length && methods.some((method) => ["direct", "nursery"].includes(method))) {
    const seedDate = nextTimingDate(master.seedMonths);
    tasks.push({
      id: `${item.id}-種まき適期`,
      cropId: item.id,
      masterId: master.id,
      cropName: master.name,
      date: iso(seedDate),
      name: "種まき適期",
      kind: "seed",
      iconKey: "sowing",
      label: "種まき",
      description: `${master.name}を種から始めるなら、${timingWindowText(master.seedMonths)}が目安です。`
    });
  }
  if (methods.some((method) => ["nursery", "seedling"].includes(method)) && master.plantingMonths?.length) {
    const plantDate = nextTimingDate(master.plantingMonths);
    tasks.push({
      id: `${item.id}-苗の定植適期`,
      cropId: item.id,
      masterId: master.id,
      cropName: master.name,
      date: iso(plantDate),
      name: "苗の定植適期",
      kind: "plant",
      iconKey: "planting",
      label: "定植",
      description: `${master.name}を苗から始めるなら、${timingWindowText(master.plantingMonths)}が目安です。`
    });
  }
  return tasks.sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function nurseryReadyDays(master) {
  const days = {
    tomato: 55,
    "mini-tomato": 55,
    eggplant: 65,
    pepper: 60,
    "chili-pepper": 60,
    paprika: 60,
    cucumber: 28,
    okra: 25,
    zucchini: 25,
    pumpkin: 30,
    "bitter-melon": 30,
    watermelon: 32,
    melon: 32,
    corn: 25,
    lettuce: 30,
    cabbage: 35,
    broccoli: 35,
    cauliflower: 35,
    kohlrabi: 25,
    romanesco: 35,
    "salad-na": 25,
    "chima-sanchu": 25,
    nabana: 30,
    hakusai: 25,
    celery: 60,
    mitsuba: 35,
    molokheiya: 25,
    ensai: 25,
    "ice-plant": 35,
    treviso: 35,
    shiso: 35,
    basil: 30,
    parsley: 50,
    chive: 45,
    onion: 55,
    strawberry: 30,
    "welsh-onion": 55,
    asparagus: 60
  };
  return days[master.id] || 35;
}

function germinationCheckDays(master) {
  if (["carrot", "parsley", "celery", "burdock", "mitsuba", "ice-plant"].includes(master.id)) return 12;
  if (["pea", "fava-bean", "garlic", "onion"].includes(master.id)) return 10;
  if (["cucumber", "zucchini", "pumpkin", "corn", "edamame", "snap-bean", "okra", "molokheiya", "ensai"].includes(master.id)) return 5;
  return 7;
}

function thinningDays(master) {
  if (["komatsuna", "mizuna", "mibuna", "chingensai", "shungiku", "mustard-greens", "salad-na", "chima-sanchu", "chijimina"].includes(master.id)) return 12;
  if (["daikon", "turnip", "spinach", "beets", "swiss-chard", "kohlrabi"].includes(master.id)) return 14;
  if (["carrot", "burdock"].includes(master.id)) return 20;
  return 16;
}

function materialSproutDays(master) {
  const days = {
    potato: 20,
    garlic: 14,
    rakkyo: 14,
    "sweet-potato": 7,
    satoimo: 25,
    ginger: 30,
    nagaimo: 25,
    myoga: 25
  };
  return days[master.id] || 21;
}

function materialCareDays(master) {
  const days = {
    potato: 30,
    garlic: 35,
    rakkyo: 35,
    "sweet-potato": 35,
    satoimo: 45,
    ginger: 45,
    nagaimo: 45,
    myoga: 45
  };
  return days[master.id] || 35;
}

function fertilizingTaskForCrop(master, start, harvestDays = master.harvestDays) {
  if (master.id === "sweet-potato") {
    return { name: "つる返し・草勢確認", base: start, offset: 45, kind: "care", iconKey: "growth-check", label: "管理", description: "つるが広がったら混み合いを整え、肥料過多で葉ばかり茂っていないか確認します。" };
  }
  if (master.id === "okra") {
    return { name: "収穫期の追肥", base: start, offset: Math.max(35, harvestDays[0] - 10), kind: "care", iconKey: "fertilizing", label: "追肥", description: "収穫が始まるころから草勢を見て、少量ずつ追肥します。" };
  }
  if (["tomato", "mini-tomato"].includes(master.id)) {
    return { name: "追肥", base: start, offset: 40, kind: "care", iconKey: "fertilizing", label: "追肥", description: "実がつき始めるころ、草勢を見ながら株元から少し離して施します。" };
  }
  if (["edamame", "snap-bean", "pea"].includes(master.id)) {
    return { name: "草勢確認・必要時追肥", base: start, offset: 30, kind: "care", iconKey: "fertilizing", label: "管理", description: "マメ科は肥料過多を避け、葉色や草勢が弱い場合だけ少量を検討します。" };
  }
  return { name: "追肥", base: start, offset: 24, kind: "care", iconKey: "fertilizing", label: "追肥", description: "株元から少し離して少量ずつ施します。" };
}

function getAllTasks({ includeRecords = false } = {}) {
  return state.crops
    .flatMap(tasksForCrop)
    .filter((task) => includeRecords || !task.recordOnly)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function ensureOpenMeteoForecast() {
  if (!state.premium || typeof fetch !== "function") return;
  const location = getWeatherLocation();
  const cacheStale = isWeatherCacheStale();
  if (cacheStale) ensureWeatherCacheLoaded();
  const cached = getForecastFromWeatherCache(location);
  if (cached && !cacheStale) {
    if (state.weatherStatus !== "ready" || state.weatherLocationKey !== location.key || state.weatherForecast?.source !== "Open-Meteo Cache") {
      window.setTimeout(() => setState({
        weatherStatus: "ready",
        weatherForecast: cached,
        weatherFetchedAt: state.weatherCache?.generatedAt || new Date().toISOString(),
        weatherLocationKey: location.key,
        weatherError: ""
      }), 0);
    }
    return;
  }
  const fresh = state.weatherForecast && state.weatherLocationKey === location.key && state.weatherFetchedAt && Date.now() - Date.parse(state.weatherFetchedAt) < 12 * 60 * 60 * 1000;
  if (fresh || weatherFetchInFlight === location.key || weatherCacheInFlight) return;
  weatherFetchInFlight = location.key;
  if (state.weatherStatus !== "loading" || state.weatherLocationKey !== location.key) {
    window.setTimeout(() => setState({ weatherStatus: "loading", weatherLocationKey: location.key, weatherError: "" }), 0);
  }
  const url = openMeteoUrl(location);
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
      return response.json();
    })
    .then((data) => {
      weatherFetchInFlight = "";
      setState({
        weatherStatus: "ready",
        weatherForecast: normalizeOpenMeteoForecast(data, location),
        weatherFetchedAt: new Date().toISOString(),
        weatherLocationKey: location.key,
        weatherError: ""
      });
    })
    .catch((error) => {
      weatherFetchInFlight = "";
      setState({ weatherStatus: "error", weatherLocationKey: location.key, weatherError: error.message || "天気予報を取得できませんでした" });
    });
}

function isWeatherCacheStale() {
  if (!state.weatherCache) return true;
  if (!weatherCacheHasUsableDays(state.weatherCache)) return true;
  const stamp = Date.parse(state.weatherCache.generatedAt || state.weatherCacheFetchedAt || "");
  if (!Number.isFinite(stamp)) return true;
  return Date.now() - stamp > 6 * 60 * 60 * 1000;
}

function weatherCacheHasUsableDays(cache) {
  return Object.values(cache?.points || {}).some((point) =>
    (point.days || []).some((day) => daysBetween(today, parseDate(day.date)) >= 0)
  );
}

function ensureWeatherCacheLoaded() {
  if ((!isWeatherCacheStale() && state.weatherCache) || weatherCacheInFlight || typeof fetch !== "function") return;
  const cacheBucket = Math.floor(Date.now() / (30 * 60 * 1000));
  if (weatherCacheAttemptBucket === String(cacheBucket)) return;
  weatherCacheAttemptBucket = String(cacheBucket);
  weatherCacheInFlight = true;
  fetch(`./data/weather-cache.json?v=${cacheBucket}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`weather-cache ${response.status}`);
      return response.json();
    })
    .then((cache) => {
      weatherCacheInFlight = false;
      setState({ weatherCache: cache, weatherCacheFetchedAt: new Date().toISOString(), weatherCacheVersion: WEATHER_CACHE_VERSION });
    })
    .catch(() => {
      weatherCacheInFlight = false;
    });
}

function getForecastFromWeatherCache(location) {
  const point = state.weatherCache?.points?.[location.key] || state.weatherCache?.points?.[location.fallbackKey] || nearestWeatherCachePoint(location);
  if (!point?.days?.length) return null;
  return {
    source: "Open-Meteo Cache",
    generatedAt: state.weatherCache.generatedAt,
    location: { ...location, key: point.key || location.key },
    days: point.days
  };
}

function nearestWeatherCachePoint(location) {
  const points = state.weatherCache?.points || {};
  const samePrefecture = Object.values(points).filter((point) => String(point.key || "").startsWith(`${state.prefecture}-`));
  const candidates = samePrefecture.length ? samePrefecture : Object.values(points);
  let best = null;
  let bestDistance = Infinity;
  candidates.forEach((point) => {
    const d = Math.pow(Number(point.latitude) - location.latitude, 2) + Math.pow(Number(point.longitude) - location.longitude, 2);
    if (d < bestDistance) {
      best = point;
      bestDistance = d;
    }
  });
  return best;
}

function openMeteoUrl(location) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "Asia/Tokyo",
    forecast_days: "7",
    daily: "weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean"
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function normalizeOpenMeteoForecast(data, location) {
  const daily = data.daily || {};
  return {
    source: "Open-Meteo Live",
    location,
    days: (daily.time || []).map((date, index) => ({
      date,
      weatherCode: daily.weather_code?.[index],
      min: Number(daily.temperature_2m_min?.[index]),
      max: Number(daily.temperature_2m_max?.[index]),
      rain: Number(daily.precipitation_sum?.[index] || 0),
      wind: Number(daily.wind_speed_10m_max?.[index] || 0),
      humidity: Number(daily.relative_humidity_2m_mean?.[index] || 0)
    }))
  };
}

function getWeatherLocation() {
  const cityKey = `${state.prefecture}-${state.city}`;
  const normalizedCityKey = `${state.prefecture}-${normalizeLocationText(state.city)}`;
  const cityEntry = Object.entries(cityCoordinates).find(([key]) => key === cityKey || normalizeLocationText(key) === normalizedCityKey);
  const coords = cityEntry?.[1] || prefectureCoordinates[state.prefecture] || prefectureCoordinates.東京都;
  const fallbackKey = `${state.prefecture || "東京都"}-代表地点`;
  return {
    key: cityEntry?.[0] || fallbackKey,
    fallbackKey,
    name: `${state.prefecture}${state.city || "代表地点"}`,
    latitude: coords[0],
    longitude: coords[1]
  };
}

function getWeatherAlerts() {
  if (!state.premium) return [];
  const forecastAlerts = getOpenMeteoAlerts();
  if (forecastAlerts.length) return compactWeatherAlerts(forecastAlerts).slice(0, 6);
  const region = getRegion();
  const monthIndex = today.getMonth();
  const alerts = [];
  state.crops.forEach((item) => {
    const master = getCrop(item.masterId);
    const young = ["種まき済み", "苗を植えた"].includes(item.status);
    const forecastMin = region.min[monthIndex] + (monthIndex === region.frostEndMonth - 1 ? -3 : 1);
    const forecastMax = region.max[monthIndex] + (monthIndex === region.heatStartMonth - 1 ? 3 : 0);
    const forecastRain = region.rain[monthIndex];
    if (young && forecastMin <= master.lowTempRisk + 1) {
      alerts.push({
        type: "low",
        iconKey: "cold",
        cropName: master.name,
        daysAhead: 2,
        priority: "高",
        title: `${master.name}の冷え込み注意`,
        message: `2日後の最低気温が${forecastMin}℃前後の想定です。${master.name}は${master.lowTempRisk}℃未満で弱りやすいため、不織布やトンネルで保温を検討してください。`
      });
    }
    if (forecastMax >= master.highTempRisk) {
      alerts.push({
        type: "hot",
        iconKey: "sunny",
        cropName: master.name,
        daysAhead: 3,
        priority: master.category === "葉菜類" ? "高" : "中",
        title: `${master.name}の高温注意`,
        message: `最高気温が${forecastMax}℃前後の見込みです。朝の水やり、遮光、土の乾燥確認を優先してください。`
      });
    }
    if (young && forecastRain >= 180) {
      alerts.push({
        type: "rain",
        iconKey: "rain",
        cropName: master.name,
        daysAhead: 1,
        priority: "中",
        title: `${master.name}の大雨注意`,
        message: `地域の月間降水傾向が高めです。種の流出、泥はね、畝の排水を確認してください。`
      });
    }
  });
  if (region.tags.includes("dry_summer") && [7, 8, 9].includes(monthIndex + 1)) {
    alerts.push({
      type: "hot",
      iconKey: "drizzle",
      cropName: "地域",
      daysAhead: 2,
      priority: "中",
      title: "乾燥・水切れ注意",
      message: `${region.regionGroupName}は夏に乾きやすい傾向があります。敷きわら、マルチ、朝夕の水やり、土の乾き確認を優先してください。`
    });
  }
  if (region.tags.includes("typhoon_risk") && [8, 9, 10].includes(monthIndex + 1)) {
    alerts.push({
      type: "rain",
      iconKey: "wind",
      cropName: "地域",
      daysAhead: 3,
      priority: "中",
      title: "台風期の備え",
      message: "支柱やトンネルの固定、排水溝、倒れやすい作物の誘引を早めに確認しましょう。"
    });
  }
  if (!alerts.length && state.crops.length) {
    alerts.push({
      type: "rain",
      iconKey: "partly-cloudy",
      cropName: "共通",
      daysAhead: 4,
      priority: "中",
      title: "週末前の畑チェック",
      message: "強いアラートはありません。週末前に水やり、支柱、害虫跡、収穫適期をまとめて確認しましょう。"
    });
  }
  return compactWeatherAlerts(alerts).slice(0, 6);
}

function getOpenMeteoAlerts() {
  const forecast = state.weatherForecast;
  if (state.weatherStatus !== "ready" || !forecast?.days?.length) return [];
  const alerts = [];
  const days = forecast.days.map((day) => ({ ...day, daysAhead: daysBetween(today, parseDate(day.date)) })).filter((day) => day.daysAhead >= 0);
  const coldDay = days.find((day) => day.daysAhead <= 3 && Number.isFinite(day.min));
  const hotDay = days.find((day) => day.daysAhead <= 3 && Number.isFinite(day.max));
  const rainDay = days.find((day) => day.daysAhead <= 3 && day.rain >= 20);
  const windDay = days.find((day) => day.daysAhead <= 3 && day.wind >= 10);
  state.crops.forEach((item) => {
    const master = getCrop(item.masterId);
    const young = ["種まき済み", "苗を植えた"].includes(item.status);
    if (young && coldDay && coldDay.min <= master.lowTempRisk + 1) {
      alerts.push({
        type: "low",
        iconKey: "cold",
        cropName: master.name,
        daysAhead: coldDay.daysAhead,
        priority: "高",
        title: `${master.name}の冷え込み注意`,
        message: `${formatDate(coldDay.date)}の最低気温は${Math.round(coldDay.min)}℃前後の予報です。定植直後や発芽直後は、不織布やトンネルで保温を検討してください。`
      });
    }
    if (hotDay && hotDay.max >= master.highTempRisk) {
      alerts.push({
        type: "hot",
        iconKey: "sunny",
        cropName: master.name,
        daysAhead: hotDay.daysAhead,
        priority: master.category === "葉菜類" ? "高" : "中",
        title: `${master.name}の高温注意`,
        message: `${formatDate(hotDay.date)}の最高気温は${Math.round(hotDay.max)}℃前後の予報です。朝の水やり、遮光、土の乾き確認を優先してください。`
      });
    }
    if (young && rainDay) {
      alerts.push({
        type: "rain",
        iconKey: "rain",
        cropName: master.name,
        daysAhead: rainDay.daysAhead,
        priority: rainDay.rain >= 40 ? "高" : "中",
        title: `${master.name}の雨対策`,
        message: `${formatDate(rainDay.date)}は降水量${Math.round(rainDay.rain)}mm前後の予報です。種の流出、泥はね、畝の排水を確認してください。`
      });
    }
    if (master.supportRequired && windDay) {
      alerts.push({
        type: "rain",
        iconKey: "wind",
        cropName: master.name,
        daysAhead: windDay.daysAhead,
        priority: windDay.wind >= 15 ? "高" : "中",
        title: `${master.name}の強風対策`,
        message: `${formatDate(windDay.date)}は最大風速${Math.round(windDay.wind)}m/s前後の予報です。支柱、誘引、トンネル固定を早めに確認しましょう。`
      });
    }
  });
  if (!alerts.length && state.crops.length) {
    const nextRain = days.find((day) => day.rain >= 5);
    alerts.push({
      type: "rain",
      iconKey: nextRain ? "drizzle" : "partly-cloudy",
      cropName: "共通",
      daysAhead: nextRain && nextRain.daysAhead <= 2 ? nextRain.daysAhead : 0,
      priority: "中",
      title: "天気に合わせた畑チェック",
      message: nextRain ? `${formatDate(nextRain.date)}に雨の予報があります。雨前に収穫適期、支柱、排水を軽く確認しましょう。` : "大きな気象リスクは見つかっていません。水やり、葉色、害虫跡、収穫適期を確認しましょう。"
    });
  }
  return dedupeAlerts(alerts);
}

function dedupeAlerts(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    const key = `${alert.cropName}-${alert.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactWeatherAlerts(alerts) {
  const groups = new Map();
  const singles = [];
  alerts.forEach((alert, index) => {
    const meta = alertGroupMeta(alert);
    const cropName = alert.cropName || "";
    const groupable = meta && !["地域", "共通"].includes(cropName);
    if (!groupable) {
      singles.push({ ...alert, sortOrder: index });
      return;
    }
    const key = `${alert.daysAhead}-${meta.kind}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...alert,
        ...meta,
        title: meta.title,
        affectedCrops: [],
        sourceAlerts: [],
        sortOrder: index
      });
    }
    const group = groups.get(key);
    if (!group.affectedCrops.includes(cropName)) group.affectedCrops.push(cropName);
    group.sourceAlerts.push(alert);
    if (alert.priority === "高") group.priority = "高";
  });

  const compacted = [];
  groups.forEach((group) => {
    if (group.affectedCrops.length === 1) {
      compacted.push({ ...group.sourceAlerts[0], sortOrder: group.sortOrder });
      return;
    }
    compacted.push({
      type: group.type,
      iconKey: group.iconKey,
      daysAhead: group.daysAhead,
      priority: group.priority,
      title: `${group.title}（${group.affectedCrops.length}件）`,
      cropName: `対象${group.affectedCrops.length}件`,
      affectedCrops: group.affectedCrops,
      message: groupedAlertMessage(group),
      sortOrder: group.sortOrder
    });
  });

  return [...compacted, ...singles].sort((a, b) => {
    if (a.daysAhead !== b.daysAhead) return a.daysAhead - b.daysAhead;
    if (a.priority !== b.priority) return a.priority === "高" ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

function alertGroupMeta(alert) {
  const title = alert.title || "";
  if (title.includes("冷え込み")) return { kind: "cold", title: "野菜の冷え込み注意", type: "low", iconKey: "cold" };
  if (title.includes("高温")) return { kind: "hot", title: "野菜の高温注意", type: "hot", iconKey: "sunny" };
  if (title.includes("強風")) return { kind: "wind", title: "支柱が必要な野菜の強風対策", type: "rain", iconKey: "wind" };
  if (title.includes("雨対策") || title.includes("大雨")) return { kind: "rain", title: "野菜の雨対策", type: "rain", iconKey: "rain" };
  return null;
}

function groupedAlertMessage(group) {
  const first = group.sourceAlerts[0];
  const lead = first.message.split("。")[0].replaceAll(first.cropName, "対象の野菜");
  const targetText = formatAffectedCrops(group.affectedCrops);
  const action = {
    cold: "発芽直後・定植直後のものを中心に、不織布やトンネルで保温を確認しましょう。",
    hot: "朝の水やり、遮光、土の乾き確認をまとめて行うと効率的です。",
    wind: "支柱、誘引、トンネル固定をまとめて確認しましょう。",
    rain: "雨前に種の流出、泥はね、畝の排水をまとめて確認しましょう。"
  }[group.kind] || "必要な対策をまとめて確認しましょう。";
  return `${lead}。${action} 対象: ${targetText}`;
}

function formatAffectedCrops(cropNames) {
  const visible = cropNames.slice(0, 4).join("、");
  const rest = cropNames.length - 4;
  return rest > 0 ? `${visible}、ほか${rest}件` : visible;
}

function getRecommendations() {
  if (!state.premium) return getBasicRecommendations();
  const region = getRegion();
  const month = today.getMonth() + 1;
  return crops.map((item) => {
    let score = 50;
    const seedFit = isAdjustedMonthInWindow(month, item.seedMonths, region.springAdjustmentDays);
    const plantingFit = isAdjustedMonthInWindow(month, item.plantingMonths, region.plantingAdjustmentDays);
    if (seedFit || plantingFit) score += 25;
    if (item.beginnerFriendly) score += 10;
    if (item.weeklyCareLevel === "週1回") score += 8;
    if (region.min[month - 1] >= item.growthTemp[0] - 3 && region.max[month - 1] <= item.growthTemp[1] + 5) score += 12;
    if (region.max[month - 1] >= item.highTempRisk) score -= 14;
    if (region.min[month - 1] <= item.lowTempRisk) score -= 14;
    if (region.tags.includes("hot_summer") && item.category === "葉菜類" && [7, 8].includes(month)) score -= 20;
    if (region.tags.includes("short_growing_season") && item.harvestDays[1] > 130) score -= 12;
    if (region.tags.includes("coastal_mild") && ["ヒガンバナ科", "アブラナ科"].includes(item.family)) score += 4;
    const copy = recommendationCopy(item, month, seedFit, plantingFit, region);
    return { crop: item, score: Math.max(1, Math.min(99, score)), ...copy };
  }).sort((a, b) => b.score - a.score);
}

function getBasicRecommendations() {
  const month = today.getMonth() + 1;
  return crops.map((item) => {
    let score = 40;
    const seedFit = item.seedMonths.includes(month);
    const plantingFit = item.plantingMonths.includes(month);
    if (seedFit || plantingFit) score += 25;
    if (item.beginnerFriendly) score += 10;
    if (item.weeklyCareLevel === "週1回") score += 8;
    const copy = recommendationCopy(item, month, seedFit, plantingFit, null);
    return { crop: item, score: Math.max(1, Math.min(99, score)), ...copy };
  }).sort((a, b) => b.score - a.score);
}

function monthlyRecommendationNote() {
  const region = state.premium ? getRegion() : null;
  const prefix = region ? `${region.climateZoneName}の${formatMonth(today)}` : `${formatMonth(today)}`;
  return h("div", { class: "aftercrop-note" }, [
    h("strong", { text: `${prefix}の候補` }),
    h("span", { text: "種まき・定植しやすい時期と、家庭菜園で扱いやすい作物を優先しています。" })
  ]);
}

function recommendationCopy(item, month, seedFit, plantingFit, region) {
  const timingLabel = seedFit && plantingFit ? "種まき・定植候補" : seedFit ? "種まき候補" : plantingFit ? "定植候補" : "次の適期に向けて準備";
  return {
    reason: cropMeritText(item),
    timingLabel,
    note: cropCareNote(item, region, month)
  };
}

function cropMeritText(item) {
  const specific = {
    okra: "暑さに強く、収穫が始まるとこまめに採れるので夏の菜園に向きます。",
    edamame: "収穫時期がわかりやすく、短い期間で食卓に乗せやすい作物です。",
    "sweet-potato": "つるが伸びれば管理が比較的少なく、初心者でも成果を感じやすい作物です。",
    shiso: "少量ずつ長く収穫でき、家庭菜園の満足感が出やすい作物です。",
    cucumber: "生育が早く、支柱と水切れ対策を押さえると収穫につながりやすい作物です。",
    "mini-tomato": "毎日の変化が見えやすく、支柱・わき芽・水管理の練習に向きます。",
    basil: "摘み取りながら長く使え、少ない株数でも料理に活かしやすいハーブです。",
    pumpkin: "場所は取りますが、つるの伸び方や着果を観察する楽しみが大きい作物です。",
    corn: "生育の勢いが見えやすく、受粉から収穫までの流れを学びやすい作物です。",
    peanut: "花後に地中で実が育つため、ほかの野菜と違う変化を楽しめます。",
    komatsuna: "短期間で収穫しやすく、空いた畝を使いやすい葉菜です。",
    turnip: "小カブなら栽培期間が短く、秋冬の一品にしやすい根菜です。",
    daikon: "秋まきの代表的な根菜で、土づくりの成果が形に出やすい作物です。",
    spinach: "涼しい時期に育てやすく、寒さに当たると味がのりやすい葉菜です。",
    cauliflower: "涼しい時期に花蕾が締まりやすく、ブロッコリーとは違う収穫の形を楽しめます。",
    kohlrabi: "丸く太る茎を観察しやすく、短めの期間で収穫の手応えが出ます。",
    romanesco: "幾何学的な花蕾が育つため、秋冬菜園の観察が楽しい作物です。",
    "salad-na": "外葉を使いながら育てられ、少量ずつ食卓に出しやすい葉菜です。",
    "chima-sanchu": "焼肉用の葉として使いやすく、外葉をかき取りながら長く楽しめます。",
    "mustard-greens": "辛みのある葉を短期間で収穫しやすく、秋冬の味に変化を出せます。",
    nabana: "寒い時期を越して花芽を収穫でき、春先の楽しみを先に仕込めます。",
    beets: "根の色づきがわかりやすく、収穫後の料理にも個性が出る根菜です。",
    "swiss-chard": "葉柄の色が美しく、暑さにも比較的耐えるので長く観察できます。",
    mitsuba: "半日陰でも扱いやすく、少量の香味野菜を必要な時に摘めます。",
    molokheiya: "暑さに強く、真夏でも葉を摘み取って使える貴重な葉菜です。",
    ensai: "高温期に伸びがよく、つる先を摘み取りながら夏の青菜として使えます。",
    "ice-plant": "粒のような質感が特徴で、乾かしすぎず育てる観察が楽しい葉菜です。",
    treviso: "赤紫の葉色が出ると見た目にも楽しく、涼しい時期のサラダに向きます。",
    chijimina: "寒さで葉が縮みやすく、冬の葉菜として味の変化を楽しめます。"
  };
  if (specific[item.id]) return specific[item.id];
  if (item.category === "葉菜類") return "間引きと防虫を早めに行えば、短い期間で育てやすい作物です。";
  if (item.category === "根菜類") return "土をよくほぐしてからまくと、根の太りを観察しながら育てられます。";
  if (item.category === "豆類") return "肥料を控えめにし、花やさやの様子を見ながら育てる練習になります。";
  if (item.category === "果菜類") return "支柱や水管理は必要ですが、収穫の楽しみが続きやすい作物です。";
  if (item.family === "ヒガンバナ科") return "植え付け後の管理が安定しやすく、長めの栽培計画を立てやすい作物です。";
  return `${item.difficulty === "やさしい" ? "初心者でも扱いやすく" : `難度は${item.difficulty}で`}、${item.weeklyCareLevel}程度の管理が目安です。`;
}

function cropCareNote(item, region, month) {
  const specific = {
    okra: "実が大きくなりすぎると硬くなるため、収穫期はこまめに見ます。",
    edamame: "花が咲いてから実が太る時期は、水切れとカメムシに注意します。",
    "sweet-potato": "肥料を入れすぎると葉ばかり茂るため、元肥は控えめにします。",
    shiso: "葉を長く使うなら、花穂が出る前に摘み取りながら育てます。",
    basil: "摘心して枝数を増やし、雨後は蒸れないよう風通しを見ます。",
    pumpkin: "雌花が咲いたら人工受粉を意識し、株元の泥はねを抑えます。",
    corn: "受粉期の水切れと、鳥・虫による食害を早めに確認します。",
    peanut: "花後に子房柄が土へ入るので、株元を固めすぎないようにします。",
    cauliflower: "花蕾が見え始めたら強い日差しを避け、乾燥と虫を早めに確認します。",
    kohlrabi: "球が若いうちに収穫すると硬くなりにくく、株間を詰めすぎないのがコツです。",
    romanesco: "生育期間が長めなので、苗の活着後に肥切れしないよう様子を見ます。",
    "salad-na": "暑い時期はとう立ちしやすいため、涼しい時間帯の水やりを意識します。",
    "chima-sanchu": "外葉を残して摘むと長く使えますが、真夏は遮光と水切れに注意します。",
    "mustard-greens": "若い葉ほど食べやすいので、虫よけを早めにして短期収穫を狙います。",
    nabana: "冬越し前に株を大きくしすぎず、春の花芽が出たら早めに摘みます。",
    beets: "酸性土と乾燥で育ちにくいため、まく前に土を整え発芽まで湿りを保ちます。",
    "swiss-chard": "高温期も育ちますが、葉を長く使うなら外葉からこまめに収穫します。",
    mitsuba: "乾燥が続くと葉が硬くなるため、半日陰と湿り気を保つと扱いやすいです。",
    molokheiya: "寒さに弱いので十分暖かくなってから始め、若い葉を摘み取ります。",
    ensai: "水切れすると茎葉が硬くなりやすいので、夏は土の乾きをこまめに見ます。",
    "ice-plant": "過湿で傷みやすいため、水はけを保ちながら乾燥しすぎないよう管理します。",
    treviso: "結球・発色には涼しさが大切なので、暑さが残る時期は植え急がないようにします。",
    chijimina: "秋口の虫を防ぎ、寒さに当たる時期まで株を残すと葉の特徴が出やすいです。"
  };
  if (specific[item.id]) return specific[item.id];
  if (item.family === "アブラナ科") return "虫がつきやすいので、種まき直後から防虫ネットを準備すると安心です。";
  if (item.category === "根菜類") return "石や未熟な堆肥を避け、まっすぐ根が伸びる畝を作ります。";
  if (item.supportRequired) return "風で倒れやすい時期は、支柱・誘引を早めに確認します。";
  if (region?.tags.includes("hot_summer") && month >= 6 && month <= 9) return "暑い地域では朝の水やりと土の乾き確認を優先します。";
  if (region?.tags.includes("rainy_humid") || region?.tags.includes("typhoon_risk")) return "雨前は泥はねと排水、風前は固定を確認します。";
  if (item.family === "ヒガンバナ科") return "酸性に傾きすぎないよう、植え付け前の土づくりを早めに済ませます。";
  return "日当たり、水はけ、株間を先に整えると失敗を減らせます。";
}

function getAfterCropSuggestions(item) {
  const previous = getCrop(item.masterId || item.id);
  const finishDate = getCropFinishDate(item);
  const finishMonth = finishDate.getMonth() + 1;
  return crops
    .filter((candidate) => candidate.id !== previous.id)
    .filter((candidate) => candidate.family !== previous.family)
    .filter((candidate) => !previous.avoidNextFamilies.includes(candidate.family))
    .map((candidate) => scoreAfterCropCandidate(previous, candidate, finishDate, finishMonth))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.crop.harvestDays[1] - b.crop.harvestDays[1])
    .map(({ crop, reason, action, caution, timing, score }) => ({ crop, reason, action, caution, timing, score }));
}

function selectAfterCropSuggestions(suggestions, limit) {
  const selected = [];
  const familyCounts = new Map();
  const maxPerFamily = limit <= 3 ? 2 : 3;
  suggestions.forEach((entry) => {
    if (selected.length >= limit) return;
    const family = (entry.crop || entry).family;
    const count = familyCounts.get(family) || 0;
    if (count >= maxPerFamily) return;
    selected.push(entry);
    familyCounts.set(family, count + 1);
  });
  suggestions.forEach((entry) => {
    if (selected.length >= limit) return;
    if (selected.includes(entry)) return;
    selected.push(entry);
  });
  return selected.slice(0, limit);
}

function scoreAfterCropCandidate(previous, candidate, finishDate, finishMonth) {
  const monthScores = afterCropTimingScore(candidate, finishMonth);
  let score = monthScores.score;
  if (!score) return { crop: candidate, score: 0, reason: "", timing: "" };
  if (previous.recommendedNextFamilies.includes(candidate.family)) score += 18;
  if (candidate.beginnerFriendly) score += 10;
  if (candidate.weeklyCareLevel === "週1回") score += 6;
  if (candidate.harvestDays[1] <= 90) score += 8;
  if (["葉菜類", "根菜類"].includes(candidate.category)) score += 5;
  if (previous.category === "果菜類" && candidate.category === "根菜類") score += 9;
  if (previous.category === "果菜類" && candidate.category === "葉菜類" && candidate.harvestDays[1] <= 65) score += 5;
  if (finishMonth >= 9 && finishMonth <= 11 && overwinterCropIds().has(candidate.id)) score += 6;
  if (finishMonth >= 10 && candidate.harvestDays[1] > 160 && !overwinterCropIds().has(candidate.id)) score -= 18;

  const copy = afterCropAdviceCopy(previous, candidate, finishDate, monthScores);
  return {
    crop: candidate,
    score: Math.max(1, score),
    ...copy
  };
}

function afterCropTimingScore(candidate, finishMonth) {
  const nextMonth = wrapMonth(finishMonth + 1);
  const secondMonth = wrapMonth(finishMonth + 2);
  const months = [...new Set([...candidate.seedMonths, ...candidate.plantingMonths])];
  if (months.includes(finishMonth)) return { score: 45, month: finishMonth, stage: "now" };
  if (months.includes(nextMonth)) return { score: 38, month: nextMonth, stage: "next" };
  if (months.includes(secondMonth)) return { score: 24, month: secondMonth, stage: "prepare" };
  return { score: 0, label: "" };
}

function afterCropAdviceCopy(previous, candidate, finishDate, monthScores) {
  return {
    reason: afterCropMerit(candidate),
    action: afterCropAction(candidate, finishDate, monthScores),
    caution: afterCropCaution(candidate)
  };
}

function afterCropMerit(candidate) {
  const specific = {
    turnip: "小カブなら秋まきで生育が早く、夏野菜後の空き畝を長く空けずに使えます。",
    daikon: "秋まきの代表で、深くほぐした畝を活かして根の太りを楽しめます。",
    komatsuna: "短期間で収穫しやすく、初めての秋冬葉菜として取り入れやすい候補です。",
    mizuna: "涼しくなる時期に育てやすく、少量ずつ収穫しやすい葉菜です。",
    mibuna: "水菜に近い感覚で育てられ、鍋物や浅漬けにも使いやすい葉菜です。",
    spinach: "涼しい時期ほど育てやすく、寒さに当たると味がのりやすい作物です。",
    lettuce: "苗から始めると管理しやすく、秋の気温で葉がやわらかく育ちます。",
    hakusai: "秋の定植から冬の収穫へつなげやすく、畝を長めに使う計画に向きます。",
    cabbage: "秋冬の定番で、苗から始めると収穫までの見通しを立てやすい作物です。",
    broccoli: "苗から育てやすく、頂花蕾のあと側枝も楽しめる候補です。",
    edamame: "栽培期間が比較的読みやすく、夏の片付け後でも短期収穫を狙いやすい豆類です。",
    "snap-bean": "つるあり品種は支柱が必要ですが、短期間でさやの収穫を楽しみやすい豆類です。",
    onion: "栽培期間は長めですが、秋の植え付けから翌年の収穫へ計画しやすい作物です。",
    garlic: "秋に植えて冬越しさせるので、畝を長く使える場合に向きます。",
    pea: "秋まきで冬越しし、春の収穫につなげる計画に向きます。",
    "fava-bean": "秋まきで株を育て、春の収穫を待つ楽しみがあります。",
    carrot: "涼しくなる時期の種まきに向き、土づくりの成果が見えやすい根菜です。",
    cauliflower: "苗から始める秋冬作として計画しやすく、夏野菜後の畝を冬まで活かせます。",
    kohlrabi: "短期で片付きやすく、丸く太る茎を楽しめる秋冬向きの候補です。",
    romanesco: "栽培期間は長めでも、秋から冬の畝をじっくり使う計画に向きます。",
    "salad-na": "涼しい時期なら短めの期間で収穫でき、空き畝の回転を止めにくい葉菜です。",
    "chima-sanchu": "外葉を摘みながら使えるので、少ない株でも食卓に回しやすい候補です。",
    "mustard-greens": "秋まきで立ち上がりが早く、冬前に葉ものを足したい時に向きます。",
    nabana: "冬越しして春の花芽を楽しめるため、秋の片付け後の長期計画に向きます。",
    beets: "違う科へ切り替えやすく、秋の涼しさを使って根を太らせる候補です。",
    "swiss-chard": "色のある葉柄で畝が明るくなり、葉を少しずつ使える後作候補です。",
    mitsuba: "香味野菜として少ない面積で育てやすく、半日陰の畝にも回しやすい候補です。",
    molokheiya: "夏前の片付け後なら暑さを活かして葉を伸ばせる、夏向きの後作です。",
    ensai: "高温期に伸びるため、初夏の空き畝を青菜用に使いたい時に向きます。",
    "ice-plant": "涼しい時期の管理に向き、ほかの葉菜と違う食感を楽しめる候補です。",
    treviso: "秋冬の涼しさで葉色が出やすく、畝に彩りを加えられる候補です。",
    chijimina: "寒さを活かす葉菜で、冬の収穫候補として畝を使いやすいです。"
  };
  if (specific[candidate.id]) return specific[candidate.id];
  if (candidate.category === "葉菜類") return "葉菜は比較的結果が早く、片付け後の畝を使い切りやすい候補です。";
  if (candidate.category === "根菜類") return "根菜は秋の涼しさを使いやすく、土を整えるほど育ち方が安定します。";
  if (overwinterCropIds().has(candidate.id)) return "冬越し前提で、秋から翌季へ畑の計画をつなげられます。";
  return `${candidate.difficulty === "やさしい" ? "扱いやすく" : `難度は${candidate.difficulty}で`}、次の栽培計画に組み込みやすい候補です。`;
}

function afterCropAction(candidate, finishDate, monthScores) {
  const start = monthScores.stage === "now"
    ? `${formatMonth(finishDate)}の片付け後すぐ`
    : `${monthScores.month}月に入る前`;
  if (candidate.family === "アブラナ科") return `${start}に畝を整え、種まき直後から防虫ネットをかけます。`;
  if (candidate.category === "根菜類") return `${start}に土を深めにほぐし、石や古い根を取り除いてからまきます。`;
  if (overwinterCropIds().has(candidate.id)) return `${start}までに畝を準備し、冬越しできる株づくりを優先します。`;
  if (candidate.family === "ヒガンバナ科") return `${start}までに酸度調整と元肥を済ませ、植え付け時期を逃さないようにします。`;
  return `${start}に古い根を片付け、堆肥を入れて次の作付けに備えます。`;
}

function afterCropCaution(candidate) {
  if (candidate.family === "アブラナ科") return "秋口は虫が残りやすいため、発芽直後の食害に注意します。";
  if (candidate.category === "根菜類") return "未熟な堆肥や石が多いと根が割れたり曲がったりしやすくなります。";
  if (overwinterCropIds().has(candidate.id)) return "収穫まで畝を長く使うため、次春までの場所取りを確認します。";
  if (candidate.supportRequired) return "風の強い地域では早めに支柱や誘引を準備します。";
  return "前作の残さを残しすぎず、病害虫の持ち越しを減らします。";
}

function overwinterCropIds() {
  return new Set(["garlic", "onion", "pea", "fava-bean", "rakkyo", "strawberry", "nabana", "treviso", "chijimina"]);
}

function wrapMonth(month) {
  return ((month - 1) % 12) + 1;
}

function getRegion() {
  return resolveRegionFromLocation(state.prefecture || "東京都", state.city || "");
}

function resolveRegionFromLocation(prefecture, city) {
  const cleanCity = normalizeLocationText(city);
  const exact = cityClimateMappings.find((item) => item.prefecture === prefecture && normalizeLocationText(item.city) === cleanCity);
  const partial = cleanCity ? cityClimateMappings.find((item) => item.prefecture === prefecture && (cleanCity.includes(normalizeLocationText(item.city)) || normalizeLocationText(item.city).includes(cleanCity))) : null;
  const mapped = exact || partial;
  const groupId = mapped?.regionGroupId || prefectureDefaults[prefecture] || "kanto_plain";
  const baseGroup = regionGroups[groupId] || regionGroups.kanto_plain;
  const zone = climateZones[baseGroup.climateZoneId] || climateZones.temperate;
  const profile = climateProfiles[baseGroup.climateZoneId] || climateProfiles.temperate;
  const tags = [...new Set([...(baseGroup.tags || []), ...(mapped?.tags || [])])];
  const confidence = mapped?.confidence || (prefectureDefaults[prefecture] ? "medium" : "low");
  const beginnerMessage = mapped?.beginnerMessage || `${prefecture}${city || ""}は${baseGroup.name}として仮分類しています。市区町村内でも標高・海沿い/内陸・畑の環境で適期は前後します。`;
  return {
    id: `${prefecture}-${city || baseGroup.id}`,
    prefecture,
    city,
    station: baseGroup.name,
    zone: zone.name,
    climateZoneId: baseGroup.climateZoneId,
    climateZoneName: zone.name,
    climateDescription: zone.description,
    climateAdvice: zone.advice,
    regionGroupId: baseGroup.id,
    regionGroupName: baseGroup.name,
    tags,
    confidence,
    beginnerMessage,
    generalAdvice: baseGroup.advice,
    beginnerNote: baseGroup.beginner,
    examples: baseGroup.examples || [],
    springAdjustmentDays: baseGroup.spring,
    summerAdjustmentDays: baseGroup.summer,
    autumnAdjustmentDays: baseGroup.autumn,
    plantingAdjustmentDays: baseGroup.planting,
    frostCautionPeriod: baseGroup.frost,
    heatCautionPeriod: baseGroup.heat,
    rainyCautionPeriod: baseGroup.rainy,
    snowCautionPeriod: baseGroup.snow,
    min: profile.min,
    max: profile.max,
    rain: profile.rain,
    frostEndMonth: profile.frostEndMonth,
    heatStartMonth: profile.heatStartMonth
  };
}

function normalizeLocationText(text) {
  return String(text || "").replace(/[ 　]/g, "").replace(/東京都23区/g, "東京23区");
}

function isAdjustedMonthInWindow(month, months, adjustmentDays) {
  const shifted = addDays(new Date(today.getFullYear(), month - 1, 15), -adjustmentDays);
  const adjustedMonth = shifted.getMonth() + 1;
  return months.includes(adjustedMonth);
}

function getCrop(id) {
  return crops.find((item) => item.id === id) || crops[0];
}

function normalizeCropRecord(item) {
  const master = getCrop(item.masterId || item.id);
  const legacyStatuses = new Set(["栽培終了", "収穫中", "生育中"]);
  let status = item.status || "育てたい";
  if (!["育てたい", "種まき済み", "苗を植えた"].includes(status) || legacyStatuses.has(status)) {
    status = item.plantingDate && !directSownOnlyCropIds.has(master.id) ? "苗を植えた" : item.sowDate ? "種まき済み" : "育てたい";
  }
  const method = normalizeStartMethod(item.startMethod || inferStartMethod({ ...item, status }, master), master);
  const nextStatus = method === "nursery" && (status === "苗を植えた" || isIsoDate(item.plantingDate))
    ? "苗を植えた"
    : startMethodDefinitions[method].status;
  const next = { ...item, startMethod: method, status: nextStatus };
  if (method === "planning") {
    next.sowDate = "";
    next.plantingDate = "";
  } else if (method === "direct") {
    next.sowDate = isIsoDate(next.sowDate) ? next.sowDate : iso(today);
    next.plantingDate = "";
  } else if (method === "nursery") {
    if (next.status === "種まき済み") {
      next.sowDate = isIsoDate(next.sowDate) ? next.sowDate : iso(today);
      next.plantingDate = "";
    } else {
      next.plantingDate = isIsoDate(next.plantingDate) ? next.plantingDate : iso(today);
      next.sowDate = isIsoDate(next.sowDate) ? next.sowDate : "";
    }
  } else if (method === "seedling") {
    next.plantingDate = isIsoDate(next.plantingDate) ? next.plantingDate : iso(today);
    if (!isIsoDate(next.sowDate)) next.sowDate = "";
  } else if (method === "material") {
    next.plantingDate = isIsoDate(next.plantingDate) ? next.plantingDate : isIsoDate(next.sowDate) ? next.sowDate : iso(today);
    next.sowDate = "";
  }
  return next;
}

function tasksWithin(tasks, days) {
  return tasks.filter((task) => {
    const date = parseDate(task.date);
    return date >= today && daysBetween(today, date) <= days;
  });
}

function needsHilling(master) {
  return ["ジャガイモ", "ネギ", "ダイコン", "カブ"].includes(master.name);
}

function calcProgress(item) {
  if (!isCropStarted(item)) return 0;
  const master = getCrop(item.masterId || item.id);
  if (!isHarvestScheduleReady(item, master) && isIsoDate(item.sowDate)) {
    const start = parseDate(item.sowDate);
    const end = addDays(start, nurseryReadyDays(master));
    const total = Math.max(1, daysBetween(start, end));
    return Math.max(4, Math.min(100, Math.round((daysBetween(start, today) / total) * 100)));
  }
  const start = getCropStartDate(item);
  const end = getCropFinishDate(item);
  const total = Math.max(1, daysBetween(start, end));
  return Math.max(4, Math.min(100, Math.round((daysBetween(start, today) / total) * 100)));
}

function getCropStartDate(item) {
  return getHarvestSchedule(item).base.date;
}

function getCropFinishDate(item) {
  const harvest = getHarvestSchedule(item);
  return addDays(harvest.base.date, harvest.range[1]);
}

function getHarvestSchedule(item) {
  const master = getCrop(item.masterId || item.id);
  const base = getCropScheduleBase(item, master);
  const range = base.kind === "planting" && harvestAfterPlantingDays[master.id]
    ? harvestAfterPlantingDays[master.id]
    : master.harvestDays;
  return { base, range };
}

function getCropScheduleBase(item, master = getCrop(item.masterId || item.id)) {
  const usePlanting = usesPlantingDateForSchedule(item, master);
  const value = usePlanting ? item.plantingDate || item.sowDate : item.sowDate || item.plantingDate;
  const method = getStartMethod(item, master);
  return {
    date: parseDate(value || iso(today)),
    kind: usePlanting ? "planting" : "sowing",
    label: usePlanting ? method === "material" ? "植え付け日から" : "定植日から" : "種まき日から"
  };
}

function usesPlantingDateForSchedule(item, master) {
  if (!item?.plantingDate) return false;
  const method = getStartMethod(item, master);
  if (method === "planning" || method === "direct") return false;
  if (method === "nursery" && item.status === "種まき済み") return false;
  return isPlantingTaskRelevant(master);
}

function isPlantingTaskRelevant(master) {
  return plantingMaterialCropIds.has(master.id) || isTransplantMethodAvailable(master);
}

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 11) return "おはようございます。畑の予定を整えましょう。";
  if (hour < 17) return "今日の畑作業をひと目で確認できます。";
  return "週末に向けて、次の作業を確認しましょう。";
}

function homeSummary(tasks, alerts) {
  if (!state.crops.length) return "作物を追加すると、基本作業予定が自動生成されます。";
  if (!state.premium) return `今週の作業は${tasks.length}件です。近い予定から確認しましょう。`;
  return `今週の作業は${tasks.length}件、気象アラートは${alerts.length}件です。まず近い予定から確認しましょう。`;
}

function notificationLabel(mode) {
  return {
    all: "すべて通知",
    important: "重要な通知のみ",
    weather: "気象アラートのみ",
    tasks: "作業通知のみ",
    off: "通知オフ"
  }[mode] || "重要な通知のみ";
}

function badgeForTask(kind) {
  return kind === "harvest" ? "amber" : kind === "care" ? "violet" : "green";
}

function meta(label, value) {
  return h("div", { class: "meta-row" }, [h("span", { text: label }), h("strong", { text: value })]);
}

function stat(label, value) {
  return h("div", { class: "stat" }, [h("span", { class: "muted", text: label }), h("strong", { text: value })]);
}

function settingRow(title, body) {
  return h("div", { class: "setting-row" }, [h("strong", { text: title }), h("p", { class: "muted", text: body })]);
}

function empty(text) {
  return h("div", { class: "empty", text });
}

function labelWrap(text, control) {
  return h("label", {}, [h("span", { text }), control]);
}

function inputField(label, type, value, onChange) {
  return labelWrap(label, h("input", {
    type,
    value,
    onchange: (e) => onChange(e.target.value),
    oninput: type === "text" ? (e) => onChange(e.target.value) : null
  }));
}

function inputFieldLazy(label, type, value, onChange, placeholder = "") {
  return labelWrap(label, h("input", {
    type,
    value,
    placeholder,
    onchange: (e) => onChange(e.target.value),
    onblur: (e) => onChange(e.target.value)
  }));
}

function selectField(label, id, value, options, onChange) {
  const select = h("select", { id, onchange: (e) => onChange(e.target.value) }, options.map(([val, text]) => h("option", { value: val, text })));
  select.value = value;
  return labelWrap(label, select);
}

function requestBrowserNotification() {
  const message = "追肥予定が近づいています。株元から少し離して少量ずつ施しましょう。";
  if (!("Notification" in window)) {
    showToast(message);
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      new Notification("やさい暦", { body: message });
      showToast("ブラウザ通知を送信しました。");
    } else {
      showToast(message);
    }
  });
}

function calendarDays(base) {
  const start = new Date(base);
  start.setDate(1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function formatDate(value) {
  const date = typeof value === "string" ? parseDate(value) : value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function timingWindowText(months) {
  if (!months?.length) return "未設定";
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  sorted.slice(1).forEach((month) => {
    if (month === prev + 1) {
      prev = month;
      return;
    }
    ranges.push(start === prev ? `${start}月` : `${start}〜${prev}月`);
    start = month;
    prev = month;
  });
  ranges.push(start === prev ? `${start}月` : `${start}〜${prev}月`);
  return ranges.join("、");
}

function nextTimingDate(months) {
  const sorted = [...new Set(months || [])].sort((a, b) => a - b);
  if (!sorted.length) return today;
  const current = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const month = sorted.find((item) => item >= current) || sorted[0];
  const year = month >= current ? currentYear : currentYear + 1;
  if (month === current) return today;
  return new Date(year, month - 1, 15);
}

function formatMonth(date) {
  return `${date.getMonth() + 1}月`;
}

function formatDateTime(value) {
  if (!value) return "未取得";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未取得";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function iso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDate(value);
  return !Number.isNaN(date.getTime());
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

render();
