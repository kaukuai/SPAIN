// Geography of the toy world. Everything is given in real [latitude, longitude] and goes
// through one projection, so islands, rivers, avenues and buildings line up like the
// real city. City islands use a "fish-eye" zoom: the historic centre is magnified and the
// suburbs are squeezed, so the island keeps the city's true outline.
import { CITY_OUTLINES } from './spain-map.js';

const D2R = Math.PI / 180;
export const MAP = { lat0: 40.4168, lon0: -3.7038, k: 40 };
export function mapXY(lat, lon) {
  return { x: (lon - MAP.lon0) * Math.cos(40 * D2R) * MAP.k, z: -(lat - MAP.lat0) * MAP.k };
}

// R: island radius in world units. S: metres where the zoom starts to flatten.
export const CITIES = {
  madrid: {
    id: 'madrid', name: '馬德里', en: 'MADRID', center: [40.4168, -3.7038], R: 46, S: 105, alpha: .32,
    top: '#9fdc6a', side: '#c98b55', accent: '#ffd23f', urbanColor: '#efe3cb',
    urban: [[40.4720, -3.7000], [40.4660, -3.6680], [40.4450, -3.6580], [40.4150, -3.6580], [40.3880, -3.6680], [40.3830, -3.6960], [40.3950, -3.7170], [40.4150, -3.7250], [40.4400, -3.7290], [40.4650, -3.7170]],
    rivers: [{ name: '曼薩納雷斯河', w: 1.6, pts: [[40.5300, -3.7800], [40.4900, -3.7600], [40.4600, -3.7420], [40.4400, -3.7345], [40.4317, -3.7330], [40.4194, -3.7258], [40.4148, -3.7228], [40.4005, -3.7172], [40.3920, -3.6985], [40.3800, -3.6850], [40.3600, -3.6650], [40.3400, -3.6300], [40.3150, -3.5900]] }],
    parks: [
      { name: '麗池公園', pts: [[40.4205, -3.6885], [40.4205, -3.6785], [40.4075, -3.6785], [40.4075, -3.6875]] },
      { name: '田園之家公園', forest: true, pts: [[40.4450, -3.7600], [40.4370, -3.7390], [40.4200, -3.7310], [40.4050, -3.7400], [40.4020, -3.7650], [40.4150, -3.7860], [40.4350, -3.7810]] },
      { name: '帕爾多山林', forest: true, pts: [[40.5850, -3.8550], [40.5950, -3.7800], [40.5550, -3.7350], [40.5050, -3.7700], [40.5000, -3.8350]] },
    ],
    roads: [
      { name: '卡斯提亞大道', w: 2.2, trees: true, pts: [[40.4800, -3.6885], [40.4669, -3.6890], [40.4531, -3.6905], [40.4400, -3.6910], [40.4280, -3.6905], [40.4194, -3.6930], [40.4137, -3.6930], [40.4070, -3.6912]] },
      { name: '格蘭大道', w: 1.9, lights: true, pts: [[40.4233, -3.7122], [40.4215, -3.7075], [40.4205, -3.7035], [40.4198, -3.6990], [40.4194, -3.6930]] },
      { name: '阿爾卡拉街', w: 1.7, pts: [[40.4169, -3.7035], [40.4180, -3.6990], [40.4194, -3.6930], [40.4200, -3.6887], [40.4240, -3.6760], [40.4320, -3.6560], [40.4400, -3.6350]] },
      { name: '主街', w: 1.3, pts: [[40.4169, -3.7035], [40.4155, -3.7095], [40.4160, -3.7135], [40.4233, -3.7140]] },
      { name: '阿托查街', w: 1.3, pts: [[40.4150, -3.7030], [40.4110, -3.6980], [40.4070, -3.6912]] },
      { name: '托雷多街', w: 1.3, pts: [[40.4140, -3.7075], [40.4050, -3.7110], [40.3990, -3.7150]] },
      { name: '公主街', w: 1.5, pts: [[40.4233, -3.7122], [40.4300, -3.7160], [40.4380, -3.7200]] },
      { name: '塞拉諾街', w: 1.4, pts: [[40.4200, -3.6887], [40.4300, -3.6870], [40.4440, -3.6860]] },
      { name: '林蔭大道', w: 1.4, trees: true, pts: [[40.4233, -3.7122], [40.4285, -3.7050], [40.4282, -3.6950], [40.4250, -3.6905]] },
      { name: '塞哥維亞橋', w: 1.3, pts: [[40.4155, -3.7095], [40.4148, -3.7228], [40.4150, -3.7420]] },
      { name: 'M-30 環城道', w: 2, loop: true, pts: [[40.4720, -3.7000], [40.4660, -3.6680], [40.4450, -3.6580], [40.4150, -3.6580], [40.3880, -3.6680], [40.3830, -3.6960], [40.3950, -3.7170], [40.4150, -3.7250], [40.4400, -3.7290], [40.4650, -3.7170]] },
      { name: 'A-2 機場公路', w: 2, pts: [[40.4400, -3.6350], [40.4480, -3.6100], [40.4600, -3.5900], [40.4800, -3.5800], [40.4952, -3.5734]] },
    ],
    hills: [],
  },
  sevilla: {
    id: 'sevilla', name: '塞維亞', en: 'SEVILLA', center: [37.3891, -5.9880], R: 37, S: 55, alpha: .2,
    top: '#b9e07a', side: '#d0915a', accent: '#ff9a3c', urbanColor: '#f6ead2',
    urban: [[37.4060, -6.0060], [37.4070, -5.9750], [37.3920, -5.9650], [37.3680, -5.9740], [37.3650, -5.9930], [37.3800, -6.0120], [37.3950, -6.0110]],
    rivers: [
      { name: '瓜達幾維河（阿方索十三世運河）', w: 1.8, pts: [[37.4450, -5.9900], [37.4200, -5.9945], [37.4040, -5.9992], [37.3940, -6.0022], [37.3857, -6.0022], [37.3824, -5.9978], [37.3750, -5.9950], [37.3600, -5.9905], [37.3400, -5.9800], [37.3100, -5.9700]] },
      { name: '瓜達幾維河', w: 2.4, pts: [[37.4550, -6.0060], [37.4300, -6.0150], [37.4050, -6.0215], [37.3850, -6.0245], [37.3650, -6.0170], [37.3450, -6.0060], [37.3150, -5.9850]] },
    ],
    parks: [
      { name: '瑪麗亞路易莎公園', pts: [[37.3802, -5.9915], [37.3792, -5.9852], [37.3698, -5.9852], [37.3698, -5.9925]] },
      { name: '阿拉米約公園', forest: true, pts: [[37.4270, -6.0000], [37.4270, -5.9905], [37.4120, -5.9905], [37.4120, -6.0000]] },
    ],
    roads: [
      { name: '憲法大道', w: 1.5, trees: true, pts: [[37.3895, -5.9945], [37.3860, -5.9942], [37.3830, -5.9927], [37.3800, -5.9905], [37.3780, -5.9880], [37.3770, -5.9860]] },
      { name: '哥倫布大道', w: 1.6, trees: true, pts: [[37.4100, -5.9965], [37.4000, -5.9992], [37.3920, -6.0003], [37.3880, -6.0007], [37.3830, -5.9982], [37.3800, -5.9958]] },
      { name: '歷史環城路', w: 1.6, pts: [[37.4000, -5.9985], [37.4012, -5.9890], [37.3990, -5.9830], [37.3930, -5.9800], [37.3860, -5.9830], [37.3820, -5.9870], [37.3800, -5.9905]] },
      { name: '西爾佩斯街', w: 1.1, pts: [[37.3935, -5.9950], [37.3885, -5.9950]] },
      { name: '特里亞納', w: 1.3, pts: [[37.3857, -6.0007], [37.3857, -6.0045], [37.3840, -6.0085], [37.3800, -6.0125]] },
      { name: '往聖胡斯塔車站', w: 1.4, pts: [[37.3900, -5.9850], [37.3910, -5.9790], [37.3921, -5.9752]] },
      { name: '帕爾梅拉大道', w: 1.6, trees: true, pts: [[37.3770, -5.9860], [37.3650, -5.9870], [37.3480, -5.9850]] },
    ],
    hills: [],
  },
  granada: {
    id: 'granada', name: '格拉納達', en: 'GRANADA', center: [37.1773, -3.5986], R: 31, S: 70, alpha: .25,
    top: '#a6d677', side: '#b97c50', accent: '#e8574a', urbanColor: '#f4ebd8',
    urban: [[37.1960, -3.6220], [37.1960, -3.5900], [37.1810, -3.5790], [37.1650, -3.5880], [37.1610, -3.6160], [37.1760, -3.6260]],
    rivers: [
      { name: '赫尼爾河', w: 1.4, pts: [[37.1450, -3.5300], [37.1560, -3.5600], [37.1640, -3.5850], [37.1660, -3.5980], [37.1650, -3.6150], [37.1720, -3.6400], [37.1820, -3.6700], [37.1900, -3.7000]] },
      { name: '達羅河', w: .9, pts: [[37.1840, -3.5650], [37.1810, -3.5840], [37.1788, -3.5915], [37.1768, -3.5958]] },
    ],
    parks: [],
    roads: [
      { name: '哥倫布大街', w: 1.5, pts: [[37.1765, -3.5985], [37.1800, -3.6010], [37.1850, -3.6050], [37.1920, -3.6100], [37.1997, -3.6140]] },
      { name: '天主教雙王街', w: 1.3, pts: [[37.1768, -3.5960], [37.1765, -3.5985], [37.1750, -3.6012], [37.1735, -3.6040]] },
      { name: '環城路', w: 1.7, pts: [[37.1650, -3.6080], [37.1720, -3.6130], [37.1810, -3.6140], [37.1920, -3.6090]] },
      { name: '雷科希達斯街', w: 1.3, pts: [[37.1735, -3.6040], [37.1690, -3.6040], [37.1640, -3.6010]] },
      { name: '戈梅雷斯坡', w: 1, pts: [[37.1768, -3.5960], [37.1752, -3.5925], [37.1758, -3.5890]] },
      { name: '達羅河岸街', w: 1, pts: [[37.1768, -3.5960], [37.1786, -3.5925], [37.1802, -3.5880]] },
      { name: 'A-92 公路', w: 1.8, pts: [[37.1810, -3.6140], [37.1840, -3.6500], [37.1860, -3.7000], [37.1868, -3.7700]] },
    ],
    hills: [
      { name: '阿爾拜辛', at: [37.1815, -3.5935], r: 330, h: 1.9 },
      { name: '聖山', at: [37.1835, -3.5805], r: 420, h: 2.3 },
    ],
  },
  barcelona: {
    id: 'barcelona', name: '巴塞隆納', en: 'BARCELONA', center: [41.3880, 2.1700], R: 50, S: 95, alpha: .26,
    top: '#a4dd78', side: '#c48a58', accent: '#3fa7ff', urbanColor: '#efe4cf',
    urban: [[41.3730, 2.1430], [41.3880, 2.1280], [41.4080, 2.1430], [41.4210, 2.1700], [41.4160, 2.2010], [41.4060, 2.2160], [41.3880, 2.1960], [41.3760, 2.1830], [41.3690, 2.1640]],
    rivers: [],
    parks: [
      { name: '城堡公園', pts: [[41.3915, 2.1840], [41.3880, 2.1930], [41.3840, 2.1880], [41.3870, 2.1810]] },
      { name: '蒙特惠克山', forest: true, pts: [[41.3720, 2.1500], [41.3720, 2.1700], [41.3580, 2.1720], [41.3540, 2.1520], [41.3640, 2.1440]] },
      { name: '科塞羅拉山', forest: true, pts: [[41.4140, 2.0800], [41.4330, 2.0770], [41.4450, 2.1300], [41.4550, 2.1600], [41.4420, 2.1650], [41.4250, 2.1300], [41.4120, 2.1050]] },
    ],
    roads: [
      { name: '對角線大道', w: 2.1, trees: true, pts: [[41.3850, 2.1140], [41.3890, 2.1300], [41.3925, 2.1435], [41.3955, 2.1610], [41.3990, 2.1720], [41.4036, 2.1874], [41.4080, 2.2010], [41.4110, 2.2210]] },
      { name: '加泰隆尼亞議會大道', w: 2, pts: [[41.3750, 2.1490], [41.3830, 2.1600], [41.3870, 2.1660], [41.3920, 2.1760], [41.3980, 2.1830], [41.4036, 2.1874], [41.4120, 2.2000], [41.4200, 2.2120]] },
      { name: '格拉西亞大道', w: 1.8, lights: true, pts: [[41.3870, 2.1700], [41.3920, 2.1650], [41.3970, 2.1600], [41.4010, 2.1560]] },
      { name: '蘭布拉大道', w: 1.6, trees: true, pts: [[41.3870, 2.1700], [41.3820, 2.1730], [41.3790, 2.1745], [41.3758, 2.1778]] },
      { name: '平行大道', w: 1.6, pts: [[41.3750, 2.1490], [41.3745, 2.1620], [41.3740, 2.1760]] },
      { name: '萊耶塔納大道', w: 1.4, pts: [[41.3880, 2.1730], [41.3840, 2.1770], [41.3810, 2.1810]] },
      { name: '海濱大道', w: 1.8, trees: true, pts: [[41.3758, 2.1778], [41.3790, 2.1830], [41.3820, 2.1880], [41.3880, 2.1950], [41.3950, 2.2050], [41.4050, 2.2200]] },
      { name: '子午線大道', w: 1.7, pts: [[41.4036, 2.1874], [41.4150, 2.1860], [41.4300, 2.1830]] },
      { name: '上環城路', w: 2, pts: [[41.3850, 2.1140], [41.4000, 2.1200], [41.4120, 2.1370], [41.4200, 2.1600], [41.4300, 2.1830], [41.4400, 2.1950]] },
      { name: '高第大道', w: 1.2, trees: true, pts: [[41.4036, 2.1744], [41.4078, 2.1745], [41.4118, 2.1748]] },
      { name: '格拉西亞大街', w: 1.2, pts: [[41.3970, 2.1600], [41.4030, 2.1560], [41.4080, 2.1520]] },
      { name: '濱海環城路', w: 2, pts: [[41.3758, 2.1778], [41.3700, 2.1700], [41.3600, 2.1500], [41.3450, 2.1300], [41.3200, 2.1000], [41.2970, 2.0790]] },
    ],
    // Cerdà's Eixample: chamfered blocks on a grid turned 45°.
    grid: { angle: 45, pitch: 133, region: [[41.3755, 2.1500], [41.3940, 2.1440], [41.3990, 2.1640], [41.4030, 2.1860], [41.3960, 2.1940], [41.3885, 2.1765], [41.3835, 2.1630]] },
    hills: [
      { name: '蒙特惠克山', at: [41.3640, 2.1590], r: 900, h: 3 },
      { name: '提比達波山', at: [41.4218, 2.1190], r: 1500, h: 5.5 },
      { name: '科塞羅拉山脊', at: [41.4400, 2.1450], r: 1300, h: 4.2 },
      { name: '卡梅爾山', at: [41.4170, 2.1560], r: 520, h: 2.2 },
    ],
  },
};
for (const [id, c] of Object.entries(CITIES)) c.outline = CITY_OUTLINES[id].map(([lon, lat]) => [lat, lon]);

// Extra real landmarks that are not on the itinerary but make each city recognisable.
export const DECOR = {
  'madrid|Puerta del Sol': { at: [40.4169, -3.7035], zh: '太陽門廣場', en: 'Puerta del Sol', r: 4.4, desc: '馬德里的中心點：有「熊與莓樹」市徽雕像、全國道路起點「零公里」，跨年時大家在這裡看鐘吃葡萄。' },
  'madrid|Templo de Debod': { at: [40.4240, -3.7178], zh: '德波神廟', en: 'Templo de Debod', r: 4, desc: '埃及贈送的兩千多年古神廟，1972 年在這裡重建開放，傍晚看夕陽很有名。' },
  'madrid|Catedral de la Almudena': { at: [40.4157, -3.7144], zh: '阿穆德納主教座堂', en: 'Catedral de la Almudena', r: 4.6, desc: '就在王宮對面，1883 年動工，直到 1993 年才由教宗祝聖完工。' },
  'madrid|Cuatro Torres': { at: [40.4770, -3.6880], zh: '四塔商務區', en: 'Cuatro Torres', r: 4.6, desc: '卡斯提亞大道北端的四棟摩天大樓，是馬德里最高的天際線。' },
  'madrid|Puerta de Europa': { at: [40.4669, -3.6890], zh: '歐洲之門雙斜塔', en: 'Puerta de Europa (KIO)', r: 3.8, desc: '兩棟互相傾斜 15 度的雙塔，位在卡斯提亞廣場。' },
  'madrid|Estadio Santiago Bernabéu': { at: [40.4531, -3.6883], zh: '伯納烏球場', en: 'Santiago Bernabéu', r: 5.2, desc: '皇家馬德里的主場，就在卡斯提亞大道旁。' },
  'sevilla|Torre del Oro': { at: [37.3824, -5.9964], zh: '黃金塔', en: 'Torre del Oro', r: 2.8, desc: '13 世紀阿爾摩哈德王朝建造的十二邊形瞭望塔，守在瓜達幾維河邊。' },
  'sevilla|Metropol Parasol': { at: [37.3934, -5.9917], zh: '都市陽傘', en: 'Metropol Parasol (Las Setas)', r: 4.8, desc: '2011 年完工的巨大木造結構，外號「蘑菇」，頂上有空中步道可看夕陽。' },
  'sevilla|Plaza de toros de la Maestranza': { at: [37.3861, -5.9988], zh: '皇家騎士團鬥牛場', en: 'Real Maestranza', r: 3.8, desc: '18 世紀開始興建的白色與土黃色圓形鬥牛場，是西班牙最古老的鬥牛場之一。' },
  'sevilla|Torre Sevilla': { at: [37.4047, -6.0095], zh: '塞維亞塔', en: 'Torre Sevilla', r: 3, desc: '2015 年完工、約 180 公尺高，是安達魯西亞最高的大樓。' },
  'granada|Catedral de Granada': { at: [37.1764, -3.5994], zh: '格拉納達主教座堂', en: 'Catedral de Granada', r: 4.2, desc: '文藝復興風格大教堂，旁邊的皇家禮拜堂安葬著天主教雙王伊莎貝拉與斐迪南。' },
  'granada|Sacromonte': { at: [37.1832, -3.5800], zh: '聖山洞穴區', en: 'Sacromonte', r: 3.6, desc: '山坡上的白色洞穴屋，是吉普賽佛朗明哥「洞穴表演」的代表地區。' },
  'barcelona|Camp Nou': { at: [41.3809, 2.1228], zh: '諾坎普球場', en: 'Spotify Camp Nou', r: 5.4, desc: '巴塞隆納足球俱樂部主場，歐洲最大的足球場之一，近年進行大規模整修。' },
  'barcelona|Torre Glòries': { at: [41.4034, 2.1894], zh: '榮耀塔', en: 'Torre Glòries', r: 3, desc: '法國建築師讓・努維爾設計、2005 年啟用的子彈形大樓，夜晚會打上彩色燈光。' },
  'barcelona|Arc de Triomf': { at: [41.3910, 2.1806], zh: '凱旋門', en: 'Arc de Triomf', r: 3.2, desc: '1888 年巴塞隆納萬國博覽會的紅磚大門，通往城堡公園。' },
  'barcelona|Tibidabo': { at: [41.4218, 2.1190], zh: '提比達波山', en: 'Tibidabo', r: 4.6, desc: '城市背後最高的山（約 512 公尺），山頂有聖心教堂和百年遊樂園。' },
  'barcelona|MNAC': { at: [41.3685, 2.1535], zh: '國家藝術博物館與魔幻噴泉', en: 'MNAC · Font Màgica', r: 5.4, desc: '1929 年博覽會留下的國家宮，前方魔幻噴泉有燈光音樂秀（冬季場次少，出發前查時刻）。' },
};

// Real-world routes between cities, drawn on the Spain map under the islands.
export const ROUTES = {
  'mad-svq': [[40.4168, -3.7038], [39.6, -3.85], [38.98, -3.93], [38.3, -4.3], [37.888, -4.789], [37.6, -5.3], [37.3891, -5.9880]],
  'svq-grx': [[37.3891, -5.9880], [37.30, -5.50], [37.24, -5.10], [37.02, -4.56], [37.17, -4.15], [37.1773, -3.5986]],
};
export const MAP_RIVERS = [
  { name: '瓜達幾維河', pts: [[38.03, -2.95], [37.90, -3.70], [37.88, -4.78], [37.70, -5.25], [37.50, -5.85], [37.10, -6.10], [36.80, -6.36]] },
  { name: '塔霍河', pts: [[40.35, -1.80], [40.05, -3.00], [39.98, -3.60], [39.86, -4.02], [39.80, -5.00], [39.65, -6.50], [39.65, -7.00]] },
  { name: '埃布羅河', pts: [[43.00, -4.10], [42.60, -2.60], [42.10, -1.60], [41.65, -0.88], [41.20, 0.30], [40.72, 0.86]] },
  { name: '杜羅河', pts: [[41.80, -2.50], [41.62, -3.70], [41.52, -4.70], [41.50, -5.75], [41.10, -6.70]] },
];
export const MAP_MOUNTAINS = [
  { name: '內華達山脈', at: [37.05, -3.30], n: 5, h: 9, snow: true },
  { name: '庇里牛斯山', at: [42.70, 0.50], n: 9, h: 9, snow: true, spread: [0, 3.2] },
  { name: '瓜達拉馬山脈', at: [40.80, -4.00], n: 4, h: 6, snow: true },
  { name: '歐羅巴山', at: [43.18, -4.85], n: 4, h: 7, snow: true },
  { name: '莫雷納山脈', at: [38.30, -4.20], n: 5, h: 4, spread: [0, 2.6] },
];

// Taiwan home island (rough coastline) and where it floats in the map's sea.
export const TAIWAN = {
  id: 'tpe', name: '台灣', en: 'TAIWAN', at: { x: 300, z: 70 }, R: 24,
  top: '#8fd36a', side: '#b8814f', accent: '#ff5a5f',
  outline: [[25.30, 121.51], [25.12, 121.92], [24.58, 121.86], [24.05, 121.64], [23.40, 121.48], [22.80, 121.30], [22.30, 120.92], [21.93, 120.75], [22.30, 120.64], [22.55, 120.33], [22.98, 120.14], [23.40, 120.06], [23.90, 120.20], [24.35, 120.48], [24.70, 120.72], [25.00, 121.02], [25.17, 121.33]],
  center: [23.75, 120.97],
};

// ---------- projection helpers ----------
const meters = (center, lat, lon) => [(lon - center[1]) * Math.cos(center[0] * D2R) * 111320, -(lat - center[0]) * 110540];

for (const c of Object.values(CITIES)) {
  const m = mapXY(...c.center);
  c.cx = m.x; c.cz = m.z;
  c.rmax = Math.max(...c.outline.map(([la, lo]) => Math.hypot(...meters(c.center, la, lo))));
  c.amax = Math.asinh(c.rmax / c.S);
}

export function project(cityId, lat, lon) {
  if (cityId === 'tpe') {
    const t = TAIWAN, kx = t.R / 2.0, kz = t.R / 1.75;
    return { x: t.at.x + (lon - t.center[1]) * kx, z: t.at.z - (lat - t.center[0]) * kz };
  }
  const c = CITIES[cityId];
  const [mx, mz] = meters(c.center, lat, lon);
  const r = Math.hypot(mx, mz);
  if (r < 1e-6) return { x: c.cx, z: c.cz };
  // Blend of fish-eye (magnified centre) and linear (true outline) radial scaling.
  const rr = c.R * ((1 - c.alpha) * Math.asinh(r / c.S) / c.amax + c.alpha * r / c.rmax);
  return { x: c.cx + mx / r * rr, z: c.cz + mz / r * rr };
}
// World-units per metre at a spot (used to size the Eixample blocks and hills).
export function scaleAt(cityId, lat, lon, metres = 60) {
  const a = project(cityId, lat, lon), b = project(cityId, lat, lon + metres / (111320 * Math.cos(lat * D2R)));
  return Math.hypot(b.x - a.x, b.z - a.z) / metres;
}
export const projectPath = (cityId, pts) => pts.map(([la, lo]) => project(cityId, la, lo));

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
export function distToPolygonEdge(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) best = Math.min(best, distToSegment(x, z, poly[j], poly[i]));
  return best;
}
export function distToSegment(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L));
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}
export function closestOnPolygon(x, z, poly) {
  let best = { d: Infinity, x, z };
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L));
    const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { d, x: px, z: pz };
  }
  return best;
}
// Corner-cutting smoothing so coastlines look organic rather than jagged.
export function chaikin(pts, rounds = 2, closed = true) {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const out = [];
    const n = closed ? p.length : p.length - 1;
    if (!closed) out.push(p[0]);
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push({ x: a.x * .75 + b.x * .25, z: a.z * .75 + b.z * .25 }, { x: a.x * .25 + b.x * .75, z: a.z * .25 + b.z * .75 });
    }
    if (!closed) out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}
