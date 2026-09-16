import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const MODEL_URL = "./assets/open3dmodel/lower-limb.glb";
const SELECTED_EMISSIVE = 0xfff3d2;
const HOVER_EMISSIVE = 0xffe08a;
const OUTLINE_COLOR = 0xfff0bf;
const SELECTED_EMISSIVE_INTENSITY = 0.44;
const HOVER_EMISSIVE_INTENSITY = 0.12;
const XRAY_OPACITY = 0.22;
const GLOBAL_XRAY_OPACITY = 0.42;

const LAYER_CONFIG = {
  bone: { label: "骨骼", color: "#efe0bd", groups: ["Bones"] },
  cartilage: { label: "软骨", color: "#8fc6cb", groups: ["Cartilages"] },
  ligament: { label: "韧带", color: "#d7ac52", groups: ["Ligaments", "Fascia"] },
  muscle: { label: "肌肉", color: "#c84542", groups: ["Muscles"] },
  artery: { label: "动脉", color: "#d64236", groups: ["Arteries"] },
  vein: { label: "静脉", color: "#3868d6", groups: ["Veins"] },
  nerve: { label: "神经", color: "#f0c541", groups: ["Nerves"] }
};

const LAYER_KEYS = Object.keys(LAYER_CONFIG);

const GROUP_TO_LAYER = Object.entries(LAYER_CONFIG).reduce((map, [layer, config]) => {
  (config.groups || []).forEach((group) => {
    map[group.toLowerCase()] = layer;
  });
  return map;
}, {});

const IMPORTANT_TERMS = [
  "tibia", "fibula", "calcaneus", "talus", "metatarsal", "phalanx",
  "anterior tibial", "posterior tibial", "fibular artery", "dorsal pedis", "plantar artery",
  "femoral artery", "popliteal artery", "great saphenous", "small saphenous",
  "tibial nerve", "common fibular nerve", "deep fibular nerve", "superficial fibular nerve", "sural nerve",
  "gastrocnemius", "soleus", "tibialis", "fibularis", "flexor hallucis", "flexor digitorum", "extensor hallucis", "extensor digitorum",
  "calcaneal tendon", "plantar aponeurosis", "talofibular", "calcaneofibular", "tibiofibular", "interosseous membrane"
];

const DETAIL_OVERRIDES = [
  {
    layers: ["artery"],
    match: /artery|arteries|arterial|arch|branch|vessel/i,
    badge: "动脉",
    summary: "这是下肢动脉系统中的血管结构，属于从股动脉、腘动脉、胫前/胫后动脉到足背和足底分支的供血通路。",
    role: "向小腿、踝、足背和足底组织输送含氧血液。",
    location: "沿骨间膜、踝前方、踝管或足底筋膜深面等通道走行，具体路径取决于该动脉分支名称。"
  },
  {
    layers: ["vein"],
    match: /vein|venous|saphenous|tributary/i,
    badge: "静脉",
    summary: "这是下肢静脉系统中的回流结构，可能属于深静脉、浅静脉或足背/足底静脉网。",
    role: "把足部、小腿和大腿的静脉血回流至近端静脉系统。",
    location: "浅静脉多位于皮下通路，深静脉通常伴行动脉，足部可见足背静脉弓、足底静脉弓和趾静脉分支。"
  },
  {
    layers: ["nerve"],
    match: /nerve|nerves|neural|cutaneous|digital branch|plantar branch/i,
    badge: "神经",
    summary: "这是下肢神经系统的一部分，来自坐骨神经、胫神经、腓总神经及其足部终末分支。",
    role: "传导运动、感觉和本体感觉信号，支配足踝肌肉并提供皮肤感觉。",
    location: "分布在腘窝、腓骨颈、踝管、足背和足底等神经通道，具体位置随分支名称变化。"
  },
  {
    layers: ["cartilage"],
    match: /art cart|cartilage|meniscus|labrum|annulus|synovial/i,
    badge: "软骨",
    summary: "这是关节软骨、半月板、关节唇或相关滑膜/纤维软骨结构，不是骨本体。",
    role: "降低关节面摩擦、分散压力，并帮助维持关节匹配和运动平滑。",
    location: "位于相邻骨性关节面之间或关节囊内，名称中的骨名表示它贴附或覆盖的关节面。"
  },
  {
    layers: ["ligament"],
    match: /talofibular|calcaneofibular|tibiofibular|tibiotalar|tibionavicular|tibiocalcaneal|cruciate|collateral|ligament|capsule|interosseous membrane|obturator membrane/i,
    badge: "韧带",
    summary: "这是连接骨与骨、关节囊或骨间膜相关的稳定结构，不应按名称中的某一块骨来解释。",
    role: "限制异常活动、维持踝关节/膝关节/足部关节稳定，并帮助骨性结构保持正确对位。",
    location: "跨越名称中提示的相邻骨或关节区域，例如距腓、跟腓、胫腓或胫距相关区域。"
  },
  {
    layers: ["ligament", "muscle"],
    match: /calcaneal tendon|achilles|tendon/i,
    badge: "肌腱",
    summary: "这是肌腱结构，不是骨骼。肌腱把肌肉产生的力量传递到骨性附着点。",
    role: "传递肌肉收缩力量，帮助完成踝跖屈、足趾运动或膝踝联合动作。",
    location: "沿肌腹远端向骨性止点延续；跟腱位于小腿后方，向下止于跟骨粗隆。"
  },
  {
    layers: ["ligament", "muscle"],
    match: /plantar aponeurosis/i,
    badge: "筋膜",
    summary: "跖腱膜是足底筋膜结构，从跟骨向前足呈扇形展开。",
    role: "维持足弓张力，步态推蹬时帮助足底储能和回弹。",
    location: "位于足底浅层，覆盖足底肌群下方并向跖骨头分束。"
  },
  {
    layers: ["ligament", "muscle"],
    match: /fascia|retinaculum|aponeurosis/i,
    badge: "筋膜/支持带",
    summary: "这是筋膜、腱膜或支持带结构，属于软组织约束和分隔系统。",
    role: "包绕或分隔肌群，固定肌腱走行，并在踝足部运动时减少肌腱移位。",
    location: "多位于皮下深面、肌群表面或踝部肌腱转折处，具体位置由名称决定。"
  },
  {
    layers: ["bone"],
    match: /^tibia$/i,
    badge: "骨骼",
    summary: "胫骨是真实模型中的小腿内侧主承重骨，近端形成膝关节，远端形成内踝和踝穴的一部分。",
    role: "承担大部分下肢轴向负重，并为小腿前、后、深层肌群和胫腓联合提供骨性附着。",
    location: "位于小腿内侧，和外侧腓骨平行，下端与距骨组成踝关节。"
  },
  {
    layers: ["bone"],
    match: /^fibula$/i,
    badge: "骨骼",
    summary: "腓骨是真实模型中的小腿外侧长骨，远端形成外踝，是外侧踝韧带的重要附着基础。",
    role: "提供肌肉和韧带附着点，参与踝关节外侧稳定；承重比例小于胫骨。",
    location: "位于小腿外侧，近端靠近膝外侧，远端下行形成外踝。"
  },
  {
    layers: ["bone"],
    match: /^calcaneus$/i,
    badge: "骨骼",
    summary: "跟骨位于后足，是足跟主要骨性结构；跟腱和多条足底结构附着于此。",
    role: "传递地面反作用力，形成后足杠杆，并参与距下关节运动。",
    location: "位于距骨下方和足跟后下方。"
  },
  {
    layers: ["bone"],
    match: /^talus$/i,
    badge: "骨骼",
    summary: "距骨位于踝穴内，是真实模型中连接小腿和足部的关键骨。",
    role: "承接胫腓骨负荷并传递到跟骨、中足，同时参与踝关节背屈和跖屈。",
    location: "位于胫骨、腓骨下端与跟骨之间。"
  },
  {
    layers: ["muscle"],
    match: /gastrocnemius/i,
    badge: "肌肉",
    summary: "腓肠肌位于小腿后浅层，真实模型中分为内侧头和外侧头，并向下汇入跟腱。",
    role: "强力跖屈踝关节，并协助膝关节屈曲，是跑跳推蹬的主要动力来源。",
    location: "起于股骨远端后方，覆盖小腿后侧浅层，向下过渡至跟腱。"
  },
  {
    layers: ["muscle"],
    match: /soleus/i,
    badge: "肌肉",
    summary: "比目鱼肌位于腓肠肌深层，是维持站立姿势和持续跖屈的重要肌肉。",
    role: "稳定踝关节、持续抗重力跖屈，并和腓肠肌共同形成跟腱系统。",
    location: "位于小腿后方深层，主要贴近胫骨、腓骨后面。"
  },
  {
    layers: ["muscle"],
    match: /tibialis anterior/i,
    badge: "肌肉",
    summary: "胫骨前肌位于小腿前室，真实模型中从胫骨外侧面下行至足内侧。",
    role: "踝背屈和足内翻，步态摆动期帮助脚尖离地。",
    location: "位于小腿前外侧，肌腱跨过踝前方进入足内侧。"
  },
  {
    layers: ["muscle"],
    match: /tibialis posterior/i,
    badge: "肌肉",
    summary: "胫骨后肌位于小腿深后室，是维持足弓和足内翻的重要肌肉。",
    role: "参与踝跖屈、足内翻和内侧纵弓动态支撑。",
    location: "位于小腿后方深层，肌腱经内踝后方进入足底内侧。"
  }
];

const EXACT_NAME_TRANSLATIONS = {
  "Acetabular labrum": "髋臼唇",
  "Adductor brevis": "短收肌",
  "Adductor canal": "收肌管",
  "Adductor hiatus": "收肌腱裂孔",
  "Adductor longus": "长收肌",
  "Adductor magnus": "大收肌",
  "Adductor minimus overlay": "小收肌覆盖层",
  "Anterior cruciate ligament": "前交叉韧带",
  "Anterior femoral cutaneous vein": "股前皮静脉",
  "Arcuate artery": "弓状动脉",
  "Arcuate ligament": "弓状韧带",
  "Articularis genus": "膝关节肌",
  "Bifurcatum ligament": "分叉韧带",
  "Calcaneal tendon": "跟腱",
  "Calcaneocuboid ligament": "跟骰韧带",
  "Calcaneofibular ligament": "跟腓韧带",
  "Calcaneonavicular ligament": "跟舟韧带",
  "Calcaneus": "跟骨",
  "Capsule of talocrural joint": "距小腿关节囊",
  "Cervical ligament": "颈韧带",
  "Coccygeus muscle": "尾骨肌",
  "Coccyx": "尾骨",
  "Common fibular nerve": "腓总神经",
  "Crural fascia": "小腿筋膜",
  "Cuboid bone": "骰骨",
  "Cutaneous br of Anterior br of Obturator nerve": "闭孔神经前支皮支",
  "Deep artery of the thigh": "股深动脉",
  "Deep femoral vein": "股深静脉",
  "Deep fibular nerve": "腓深神经",
  "Deep Infrapatellar bursa": "深髌下滑囊",
  "Deep plantar arch": "足底深弓",
  "Deep plantar artery": "足底深动脉",
  "Deep transverse metatarsal ligament": "跖骨深横韧带",
  "Descending part of Iliofemoral ligament": "髂股韧带降部",
  "Descending genicular artery": "膝降动脉",
  "Dorsal pedis artery": "足背动脉",
  "Dorsal venous arch of foot": "足背静脉弓",
  "Dorsal venous network of foot": "足背静脉网",
  "Extensor digitorum brevis": "趾短伸肌",
  "Extensor digitorum longus": "趾长伸肌",
  "Extensor hallucis brevis": "拇短伸肌",
  "Extensor hallucis longus": "拇长伸肌",
  "Fascia lata": "阔筋膜",
  "Femoral artery": "股动脉",
  "Femoral canal": "股管",
  "Femoral nerve": "股神经",
  "Femoral ring": "股环",
  "Femoral triangle": "股三角",
  "Femoral vein": "股静脉",
  "Femur": "股骨",
  "Fibrous sheath of toes": "趾纤维鞘",
  "Fibula": "腓骨",
  "Fibular artery": "腓动脉",
  "Fibular collateral ligament": "腓侧副韧带",
  "Fibular vein": "腓静脉",
  "Fibularis brevis muscle": "腓骨短肌",
  "Fibularis longus muscle": "腓骨长肌",
  "Fibularis tertius muscle": "第三腓骨肌",
  "Flexor digiti minimi brevis of foot": "足小趾短屈肌",
  "Flexor digitorum brevis": "趾短屈肌",
  "Flexor digitorum longus": "趾长屈肌",
  "Flexor hallucis longus": "拇长屈肌",
  "Flexor retinaculum of ankle": "踝屈肌支持带",
  "Gluteal aponeurosis": "臀腱膜",
  "Gluteus maximus muscle": "臀大肌",
  "Gluteus medius muscle": "臀中肌",
  "Gluteus minimus muscle": "臀小肌",
  "Gracilis muscle": "股薄肌",
  "Great saphenous vein": "大隐静脉",
  "Hip bone": "髋骨",
  "Hip joint capsule": "髋关节囊",
  "Iliacus muscle": "髂肌",
  "Ilioinguinal nerve": "髂腹股沟神经",
  "Iliolumbar ligament": "髂腰韧带",
  "Iliopectineal bursa": "髂耻滑囊",
  "Iliotibial tract": "髂胫束",
  "Inferior extensor retinaculum": "下伸肌支持带",
  "Inferior fibular retinaculum": "下腓骨肌支持带",
  "Inferior gemellus muscle": "下孖肌",
  "Inferior gluteal nerve": "臀下神经",
  "Inferior clunial br of post cutaneous nerve of the thigh": "股后皮神经臀下皮支",
  "Infrapatellar fat pad": "髌下脂肪垫",
  "Intermediate cuneiform bone": "中间楔骨",
  "Interosseous membrane of leg": "小腿骨间膜",
  "Interpubic disc": "耻骨间盘",
  "Intersesamoid ligament": "籽骨间韧带",
  "Ishciofemoral ligament": "坐股韧带",
  "Lateral cuneiform bone": "外侧楔骨",
  "Lateral cutaneous branch of Iliohypogaticus nerve": "髂腹下神经外侧皮支",
  "Lateral femoral intermuscular septum": "股外侧肌间隔",
  "Lateral head of flexor hallucis brevis": "拇短屈肌外侧头",
  "Lateral head of gastrocnemius": "腓肠肌外侧头",
  "Lateral meniscus": "外侧半月板",
  "Lateral plantar artery": "足底外侧动脉",
  "Lateral plantar nerve": "足底外侧神经",
  "Lateral plantar vein": "足底外侧静脉",
  "Lateral sural cutaneous nerve": "腓肠外侧皮神经",
  "Ligament of head of femur": "股骨头韧带",
  "Long head of biceps femoris": "股二头肌长头",
  "Long plantar ligament": "足底长韧带",
  "Lumbrical muscles of foot": "足蚓状肌",
  "Medial collatertal ligament": "内侧副韧带",
  "Medial cuneiform bone": "内侧楔骨",
  "Medial femoral intermuscular septum": "股内侧肌间隔",
  "Medial head of flexor hallucis brevis": "拇短屈肌内侧头",
  "Medial head of gastrocnemius": "腓肠肌内侧头",
  "Medial meniscus": "内侧半月板",
  "Medial plantar artery": "足底内侧动脉",
  "Medial plantar nerve": "足底内侧神经",
  "Medial plantar vein": "足底内侧静脉",
  "Medial sural cutaneous nerve": "腓肠内侧皮神经",
  "Navicular bone": "舟骨",
  "Oblique popliteal ligament": "腘斜韧带",
  "Obturator externus": "闭孔外肌",
  "Obturator internus": "闭孔内肌",
  "Obturator membrane": "闭孔膜",
  "Obturator nerve": "闭孔神经",
  "Opponens digiti minimi muscle of foot": "足小趾对掌肌",
  "Patella": "髌骨",
  "Pectineus muscle": "耻骨肌",
  "Pes anserine bursa": "鹅足滑囊",
  "Pes anserinus common tendon": "鹅足共同腱",
  "Piriformis muscle": "梨状肌",
  "Plantar aponeurosis": "跖腱膜",
  "Plantar venous arch": "足底静脉弓",
  "Plantaris muscle": "跖肌",
  "Plexus lumbaris": "腰丛",
  "Popliteal artery": "腘动脉",
  "Popliteal vein": "腘静脉",
  "Popliteus muscle": "腘肌",
  "Posterior cutaneous nerve of the thigh": "股后皮神经",
  "Posterior cruciate ligament": "后交叉韧带",
  "Psoas major": "腰大肌",
  "Psoas minor": "腰小肌",
  "Pubofemoral ligament": "耻股韧带",
  "Quadratus femoris muscle": "股方肌",
  "Quadratus plantae muscle": "足底方肌",
  "Quadriceps common tendon and patellar ligament": "股四头肌共同腱与髌韧带",
  "Rectus femoris": "股直肌",
  "Sacrospinous ligament": "骶棘韧带",
  "Sacrotuberal ligament": "骶结节韧带",
  "Sacrum": "骶骨",
  "Saphenous opening": "隐静脉裂孔",
  "Sartorius muscle": "缝匠肌",
  "Schiatic nerve": "坐骨神经",
  "Sciatic bursa of obturator internus": "闭孔内肌坐骨滑囊",
  "Semimembranosus muscle": "半膜肌",
  "Semimembranosus muscle tendon": "半膜肌腱",
  "Semitendinosus muscle": "半腱肌",
  "Sesamoid bones of foot": "足籽骨",
  "Short head of biceps femoris": "股二头肌短头",
  "Small saphenous vein": "小隐静脉",
  "Soleus muscle": "比目鱼肌",
  "Superior extensor retinaculum of ankle": "踝上伸肌支持带",
  "Superior fibular retinaculum": "上腓骨肌支持带",
  "Superior gemellus muscle": "上孖肌",
  "Superior gluteal nerve": "臀上神经",
  "Sural artery": "腓肠动脉",
  "Sural nerve": "腓肠神经",
  "Sural vein": "腓肠静脉",
  "Symphysis of sacrococcygeal joint": "骶尾关节联合",
  "Sup, Inf, Ant, Post, Pubic ligaments": "上、下、前、后及耻骨韧带",
  "Talonavicular ligament": "距舟韧带",
  "Talus": "距骨",
  "Tendinous arch of soleus": "比目鱼肌腱弓",
  "Tensor fasciae latae": "阔筋膜张肌",
  "Tibia": "胫骨",
  "Tibial nerve": "胫神经",
  "Tibialis anterior muscle": "胫骨前肌",
  "Tibialis posterior muscle": "胫骨后肌",
  "Tibiocalcaneal ligament": "胫跟韧带",
  "Tibionavicular ligament": "胫舟韧带",
  "Transverse acetabular ligament": "髋臼横韧带",
  "Transverse ligament of knee": "膝横韧带",
  "Transverse tibiofibular ligament": "胫腓横韧带",
  "Vastus intermedius muscle": "股中间肌",
  "Vastus lateralis muscle": "股外侧肌",
  "Vastus medialis muscle": "股内侧肌",
  "Zona orbicularis of hip joint": "髋关节轮匝带"
};

const PHRASE_TRANSLATIONS = [
  ["posterior cutaneous nerve of the thigh", "股后皮神经"],
  ["posterior cutaneous nerve of thigh", "股后皮神经"],
  ["lateral circumflex femoral artery", "旋股外侧动脉"],
  ["lateral circumflex femoral vein", "旋股外侧静脉"],
  ["medial circumflex femoral artery", "旋股内侧动脉"],
  ["medial circumflex femoral vein", "旋股内侧静脉"],
  ["superficial circumflex iliac artery", "旋髂浅动脉"],
  ["superficial circumflex iliac vein", "旋髂浅静脉"],
  ["superficial external pudendal artery", "阴部外浅动脉"],
  ["superficial external pudendal vein", "阴部外浅静脉"],
  ["superficial epigastric artery", "腹壁浅动脉"],
  ["superficial epigastric vein", "腹壁浅静脉"],
  ["posterior tibial artery", "胫后动脉"],
  ["posterior tibial vein", "胫后静脉"],
  ["anterior tibial artery", "胫前动脉"],
  ["anterior tibial vein", "胫前静脉"],
  ["common fibular nerve", "腓总神经"],
  ["deep fibular nerve", "腓深神经"],
  ["superficial fibular nerve", "腓浅神经"],
  ["genitofemoral nerve", "生殖股神经"],
  ["iliohypogastric nerve", "髂腹下神经"],
  ["iliohypogaticus nerve", "髂腹下神经"],
  ["iliofemoral ligament", "髂股韧带"],
  ["sacro-iliac ligament", "骶髂韧带"],
  ["sacroiliac joint", "骶髂关节"],
  ["sacrococcygeal joint", "骶尾关节"],
  ["proximal tibiofibular joint", "近侧胫腓关节"],
  ["talofibular joint", "距腓关节"],
  ["talocrural joint", "距小腿关节"],
  ["metatarsophalangeal joints", "跖趾关节"],
  ["distal interphalangeal joints", "远侧趾间关节"],
  ["proximal interphalangeal joints", "近侧趾间关节"],
  ["deep plantar arch", "足底深弓"],
  ["dorsal venous arch", "背侧静脉弓"],
  ["dorsal venous network", "背侧静脉网"],
  ["femoral neck vessels", "股骨颈血管"],
  ["great saphenous vein", "大隐静脉"],
  ["small saphenous vein", "小隐静脉"],
  ["biceps femoris", "股二头肌"],
  ["gastrocnemius muscle", "腓肠肌"],
  ["flexor hallucis brevis", "拇短屈肌"],
  ["adductor hallucis", "拇收肌"],
  ["fibularis muscles", "腓骨肌"],
  ["fibularis longus", "腓骨长肌"],
  ["fibularis tertius", "第三腓骨肌"],
  ["extensor digitorum longus", "趾长伸肌"],
  ["flexor digitorum longus", "趾长屈肌"],
  ["extensor hallucis longus", "拇长伸肌"],
  ["flexor hallucis longus", "拇长屈肌"],
  ["tibialis anterior", "胫骨前肌"],
  ["tibialis posterior", "胫骨后肌"],
  ["obturator internus", "闭孔内肌"],
  ["gluteus maximus", "臀大肌"],
  ["gluteus medius", "臀中肌"],
  ["gluteus minimus", "臀小肌"],
  ["lateral plantar nerve", "足底外侧神经"],
  ["medial plantar nerve", "足底内侧神经"],
  ["lateral plantar artery", "足底外侧动脉"],
  ["medial plantar artery", "足底内侧动脉"],
  ["lateral plantar vein", "足底外侧静脉"],
  ["medial plantar vein", "足底内侧静脉"],
  ["dorsal digital branches", "足背趾支"],
  ["dorsal digital metatarsal arteries", "足背跖趾动脉"],
  ["dorsal digital arteries of foot", "足背趾动脉"],
  ["dorsal digital veins of foot", "足背趾静脉"],
  ["dorsal metatarsal ligaments", "跖背韧带"],
  ["plantar metatarsal ligaments", "跖底韧带"],
  ["superficial transverse metatarsal ligament", "跖骨浅横韧带"],
  ["proper plantar digital branches", "足底固有趾支"],
  ["common plantar digital nerves", "足底总趾神经"],
  ["plantar digital veins", "足底趾静脉"],
  ["dorsal digital veins", "足背趾静脉"],
  ["dorsal digital arteries", "足背趾动脉"],
  ["dorsal metatarsal arteries", "跖背动脉"],
  ["dorsal metatarsal veins", "跖背静脉"],
  ["plantar metatarsal arteries", "跖底动脉"],
  ["plantar metatarsal veins", "跖底静脉"],
  ["plantar interossei muscles", "足底骨间肌"],
  ["dorsal interossei muscles", "足背骨间肌"],
  ["lumbrical muscles", "蚓状肌"],
  ["annular ligaments", "环状韧带"],
  ["cruciform ligaments", "十字韧带"],
  ["interosseous ligaments", "骨间韧带"],
  ["tarsometatarsal ligaments", "跗跖韧带"],
  ["cuneometatarsal", "楔跖"],
  ["intercuneiform", "楔骨间"],
  ["cuneonavicular", "楔舟"],
  ["cuneocuboid", "楔骰"],
  ["cuboidonavicular", "骰舟"],
  ["cuboideonavicular", "骰舟"],
  ["calcaneocuboid", "跟骰"],
  ["calcaneonavicular", "跟舟"],
  ["talocalcaneal", "距跟"],
  ["talofibular", "距腓"],
  ["tibiofibular", "胫腓"],
  ["tibiotalar", "胫距"],
  ["tibiospring", "胫弹簧"],
  ["tibiocalcaneal", "胫跟"],
  ["tibionavicular", "胫舟"],
  ["meniscofemoral", "半月板股"],
  ["patellar retinaculum", "髌支持带"],
  ["extensor retinaculum", "伸肌支持带"],
  ["fibular retinaculum", "腓骨肌支持带"],
  ["tendon sheath", "腱鞘"],
  ["tendinous sheath", "腱鞘"],
  ["vaginae tendinum", "腱鞘"],
  ["synovial sheaths", "滑膜鞘"],
  ["synovial membranes", "滑膜"],
  ["intermuscular septum", "肌间隔"],
  ["intermuscular", "肌间"],
  ["interosseus", "骨间"],
  ["interossea", "骨间"],
  ["intercornual", "角间"],
  ["subtendinous bursa", "腱下滑囊"],
  ["subcutaneous bursa", "皮下滑囊"],
  ["trochanteric bursa", "转子滑囊"],
  ["prepatellar bursa", "髌前滑囊"],
  ["infrapatellar bursa", "髌下滑囊"],
  ["calcaneal bursa", "跟骨滑囊"],
  ["genicular artery", "膝动脉"],
  ["genicular vein", "膝静脉"],
  ["malleolar artery", "踝动脉"],
  ["malleolar branches", "踝支"],
  ["marginal vein", "缘静脉"],
  ["distal end", "远端"],
  ["proximal end", "近端"],
  ["distal phalanges", "远节趾骨"],
  ["middle phalanges", "中节趾骨"],
  ["proximal phalanges", "近节趾骨"],
  ["semimembranosus", "半膜肌"],
  ["semitendinosus", "半腱肌"],
  ["abductor digiti minimi", "小趾展肌"],
  ["saphenous", "隐"],
  ["cutaneous", "皮"],
  ["genital", "生殖"],
  ["clunial", "臀皮"],
  ["crural", "小腿"],
  ["rami", "支"],
  ["piriformis", "梨状肌"],
  ["iliacus", "髂肌"],
  ["sartorius", "缝匠肌"],
  ["gluteal", "臀"],
  ["sciatic", "坐骨"],
  ["sural", "腓肠"],
  ["ischiogluteal", "坐骨臀"],
  ["trochanteric", "转子"],
  ["malleolus", "踝"],
  ["tuberosity", "粗隆"],
  ["pubic", "耻骨"],
  ["collateral", "侧副"],
  ["tarsal", "跗"],
  ["arcuate", "弓状"],
  ["digital", "趾"],
  ["great", "大"],
  ["small", "小"],
  ["side", "侧"],
  ["intercapitular", "头间"],
  ["tributary", "属支"],
  ["thigh", "大腿"],
  ["cutaneous nerve", "皮神经"],
  ["cutaneous branches", "皮支"],
  ["muscular branches", "肌支"],
  ["perforating branches", "穿通支"],
  ["communicating", "交通"],
  ["ascending branch", "升支"],
  ["descending branch", "降支"],
  ["anterior branch", "前支"],
  ["posterior branch", "后支"],
  ["superficial branch", "浅支"],
  ["deep branch", "深支"],
  ["lateral branch", "外侧支"],
  ["medial branch", "内侧支"],
  ["anterior horn", "前角"],
  ["posterior horn", "后角"],
  ["lateral meniscus", "外侧半月板"],
  ["medial meniscus", "内侧半月板"],
  ["hip bone acetabulum", "髋骨髋臼"],
  ["hip bone pubis", "髋骨耻骨部"],
  ["sesamoid bones", "籽骨"],
  ["metatarsal bones", "跖骨"],
  ["phalanges of foot", "足趾骨"],
  ["phalanx", "趾骨"],
  ["metatarsal bone", "跖骨"],
  ["lumbar vertebra", "腰椎"],
  ["thoracic vertebra", "胸椎"],
  ["femoral artery", "股动脉"],
  ["femoral vein", "股静脉"],
  ["femoral nerve", "股神经"],
  ["fibular artery", "腓动脉"],
  ["fibular vein", "腓静脉"],
  ["tibial nerve", "胫神经"],
  ["obturator nerve", "闭孔神经"],
  ["saphenous nerve", "隐神经"],
  ["sural nerve", "腓肠神经"],
  ["sural vein", "腓肠静脉"],
  ["sural artery", "腓肠动脉"],
  ["femur", "股骨"],
  ["fibula", "腓骨"],
  ["tibia", "胫骨"],
  ["talus", "距骨"],
  ["calcaneus", "跟骨"],
  ["navicular bone", "舟骨"],
  ["cuboid bone", "骰骨"],
  ["cuneiform bone", "楔骨"],
  ["intermediate cuneiform", "中间楔骨"],
  ["hip bone", "髋骨"],
  ["patella", "髌骨"],
  ["sacrum", "骶骨"],
  ["coccyx", "尾骨"],
  ["acetabulum", "髋臼"],
  ["pubis", "耻骨"],
  ["artery", "动脉"],
  ["arteries", "动脉"],
  ["vein", "静脉"],
  ["veins", "静脉"],
  ["nerve", "神经"],
  ["nerves", "神经"],
  ["ligament", "韧带"],
  ["ligaments", "韧带"],
  ["muscle", "肌"],
  ["muscles", "肌"],
  ["tendon", "腱"],
  ["tendons", "腱"],
  ["aponeurosis", "腱膜"],
  ["fascia", "筋膜"],
  ["retinaculum", "支持带"],
  ["cartilage", "软骨"],
  ["capsule", "囊"],
  ["capsules", "囊"],
  ["bursa", "滑囊"],
  ["bursae", "滑囊"],
  ["labrum", "盂唇"],
  ["meniscus", "半月板"],
  ["membrane", "膜"],
  ["bone", "骨"],
  ["disc", "盘"],
  ["fat pad", "脂肪垫"],
  ["arch", "弓"],
  ["canal", "管"],
  ["ring", "环"],
  ["triangle", "三角"],
  ["opening", "裂孔"],
  ["hiatus", "裂孔"],
  ["vessels", "血管"],
  ["symphysis", "联合"],
  ["plexus", "丛"],
  ["recess", "隐窝"],
  ["between", "之间"],
  ["sheath", "鞘"],
  ["apparatus", "装置"],
  ["network", "网"],
  ["joint", "关节"],
  ["knee", "膝"],
  ["leg", "小腿"],
  ["foot", "足"],
  ["toe", "趾"],
  ["toes", "趾"],
  ["phalanges", "趾骨"],
  ["interphalangeal", "趾间"],
  ["metatarsal", "跖骨"],
  ["calcaneal", "跟骨"],
  ["fibular", "腓"],
  ["tibial", "胫"],
  ["femoral", "股"],
  ["branches", "支"],
  ["branch", "支"],
  ["perforating", "穿通"],
  ["head", "头"],
  ["part", "部"],
  ["common", "共同"],
  ["proper", "固有"],
  ["accessory", "副"],
  ["recurrent", "返"],
  ["transverse", "横"],
  ["descending", "降"],
  ["horizontal", "水平"],
  ["vertical", "垂直"],
  ["palmar", "掌跖侧"],
  ["suprapatellar", "髌上"],
  ["oblique", "斜"],
  ["anterior", "前"],
  ["posterior", "后"],
  ["medial", "内侧"],
  ["lateral", "外侧"],
  ["superior", "上"],
  ["inferior", "下"],
  ["superficial", "浅"],
  ["subcutaneous", "皮下"],
  ["subfascial", "筋膜下"],
  ["subpopliteal", "腘下"],
  ["subtendinous", "腱下"],
  ["infrapatellar", "髌下"],
  ["prepatellar", "髌前"],
  ["deep", "深"],
  ["dorsal", "背侧"],
  ["plantar", "足底"],
  ["distal", "远端"],
  ["proximal", "近端"],
  ["middle", "中"],
  ["long", "长"],
  ["short", "短"],
  ["brevis", "短"],
  ["longus", "长"],
  ["magnus", "大"],
  ["minimus", "小"],
  ["maximus", "大"],
  ["medius", "中"],
  ["overlay", "覆盖层"]
].sort((a, b) => b[0].length - a[0].length);

const TOE_ORDINAL_TRANSLATIONS = {
  "1st": "第1",
  "1th": "第1",
  "2nd": "第2",
  "2th": "第2",
  "3rd": "第3",
  "3th": "第3",
  "4th": "第4",
  "5th": "第5",
  first: "第1",
  second: "第2",
  third: "第3",
  fourth: "第4",
  fifth: "第5"
};

const host = document.getElementById("canvasHost");
const tooltip = document.getElementById("tooltip");
const structureList = document.getElementById("structureList");
const layerBadge = document.getElementById("layerBadge");
const partTitle = document.getElementById("partTitle");
const partSummary = document.getElementById("partSummary");
const partRole = document.getElementById("partRole");
const partLocation = document.getElementById("partLocation");
const partNotes = document.getElementById("partNotes");
const toggleExtractButton = document.getElementById("toggleExtractButton");
const hidePartButton = document.getElementById("hidePartButton");
const restoreHiddenButton = document.getElementById("restoreHiddenButton");
const panModeButton = document.getElementById("panModeButton");
const xrayModeButton = document.getElementById("xrayModeButton");

let scene;
let camera;
let renderer;
let controls;
let modelRoot;
let raycaster;
let pointer;
let selectedPart = null;
let hoveredPart = null;
let modelCenter = new THREE.Vector3();
let modelRadius = 1;
let isExploded = false;
let selectionOutline = null;
let selectedPartExtracted = false;
let isPanMode = false;
let isXrayMode = false;
let extractionReturnView = null;
let rotationPivotGesture = null;

const partRecords = new Map();
const pickables = [];
const activeTweens = new Set();
const activeLayers = new Set(LAYER_KEYS);
const hiddenParts = new Set();
const collapsedStructureGroups = new Set();

init();

async function init() {
  setupScene();
  setupUi();
  bindEvents();
  await loadRealModel();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x17120f, 0.028);

  camera = new THREE.PerspectiveCamera(36, host.clientWidth / host.clientHeight, 0.01, 1000);
  camera.position.set(0.9, 0.15, 2.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.55;
  controls.panSpeed = 0.8;
  controls.zoomSpeed = 2.4;
  controls.zoomToCursor = true;
  controls.screenSpacePanning = true;
  setPanMode(false);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  setupLighting();

  addDissectionGrid();
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0xfff4df, 1.15));
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x6d5846, 2.15));

  [
    { position: [2.6, 3.8, 3.2], color: 0xffffff, intensity: 2.65 },
    { position: [-3.4, 2.8, -3.2], color: 0xd7f4ff, intensity: 1.85 },
    { position: [3.5, 1.8, -2.6], color: 0xffead8, intensity: 1.45 },
    { position: [-3.2, 1.5, 2.8], color: 0xf2fbff, intensity: 1.35 },
    { position: [0.2, -3.4, 1.4], color: 0xffe2bf, intensity: 0.9 },
    { position: [0, 4.6, -0.4], color: 0xffffff, intensity: 1.4 }
  ].forEach(({ position, color, intensity }) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  });

  const cameraFill = new THREE.PointLight(0xffffff, 0.75, 0, 1.8);
  cameraFill.position.set(0, 0, 0.2);
  camera.add(cameraFill);
  scene.add(camera);
}

function setupUi() {
  const layerSwitch = document.querySelector(".layer-switch");
  layerSwitch.innerHTML = Object.entries(LAYER_CONFIG).map(([layer, config]) => `
    <button class="layer-button is-active" type="button" data-layer="${layer}" aria-pressed="true">
      ${config.label}
    </button>
  `).join("");

  partTitle.textContent = "正在加载真实模型";
  partSummary.textContent = "正在载入 AnatomyTOOL Open3DModel 下肢 GLB。该模型包含真实分层对象：骨骼、韧带、肌肉、筋膜、动脉、静脉和神经。";
  partRole.textContent = "模型载入后可点击任意结构拆解查看。";
  partLocation.textContent = "右下肢，从骨盆/大腿延伸到小腿、踝和足部。";
}

async function loadRealModel() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/");
  loader.setDRACOLoader(dracoLoader);
  const gltf = await loader.loadAsync(MODEL_URL);
  modelRoot = gltf.scene;
  modelRoot.name = "Open3DModel lower limb";
  scene.add(modelRoot);

  normalizeModel(modelRoot);
  registerModelParts(modelRoot);
  buildStructureList();
  applyVisibility();
  focusCamera(true);
  clearSelection();
}

function normalizeModel(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 4.2 / Math.max(size.x, size.y, size.z);
  root.position.sub(center);
  root.scale.setScalar(scale);
  root.rotation.set(-Math.PI / 2, 0, Math.PI * 0.52);
  root.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(root);
  modelCenter = normalizedBox.getCenter(new THREE.Vector3());
  modelRadius = normalizedBox.getSize(new THREE.Vector3()).length() * 0.5;
  controls.target.copy(modelCenter);
}

function registerModelParts(root) {
  const topGroups = new Map();
  root.children.forEach((child) => topGroups.set(child.name.toLowerCase(), child.name));

  root.traverse((object) => {
    if (!object.isMesh) return;

    const topGroup = findTopGroup(object, topGroups);
    const layer = GROUP_TO_LAYER[topGroup.toLowerCase()] || "ligament";
    const name = cleanName(object.name || object.parent?.name || "Unnamed structure");
    const chineseName = translateAnatomyName(name, layer);
    const record = {
      id: object.uuid,
      name,
      chineseName,
      layer,
      layerName: LAYER_CONFIG[layer]?.label || "结构",
      object,
      originalPosition: object.position.clone(),
      allExplode: new THREE.Vector3(),
      selectedExplode: new THREE.Vector3(),
      baseOpacity: layer === "cartilage" ? 0.78 : 1,
      materialColor: LAYER_CONFIG[layer]?.color || "#f1e8d5"
    };

    const worldCenter = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
    const direction = worldCenter.sub(modelCenter);
    if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
    direction.normalize();
    const layerLift = layer === "artery" || layer === "vein" || layer === "nerve" ? 0.42 : 0.28;
    record.selectedExplode.copy(direction).multiplyScalar(0.56 + layerLift);
    record.allExplode.copy(direction).multiplyScalar(0.28 + layerLift * 0.35);

    styleMesh(object, record);
    object.userData.partId = record.id;
    object.userData.layer = layer;
    partRecords.set(record.id, record);
    pickables.push(object);
  });
}

function findTopGroup(object, topGroups) {
  let current = object;
  let candidate = object.name;
  while (current.parent && current.parent !== modelRoot) {
    current = current.parent;
    candidate = current.name || candidate;
  }
  if (current.parent === modelRoot && topGroups.has((current.name || "").toLowerCase())) {
    return current.name;
  }
  return candidate;
}

function styleMesh(mesh, record) {
  const color = new THREE.Color(record.materialColor);
  const transparent = record.layer === "cartilage" || record.layer === "fascia";
  const opacity = record.baseOpacity;
  mesh.material = new THREE.MeshStandardMaterial({
    color,
    roughness: record.layer === "bone" ? 0.68 : 0.48,
    metalness: 0,
    transparent: true,
    opacity,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
    depthWrite: !transparent
  });
}

function buildStructureList() {
  const records = Array.from(partRecords.values())
    .filter((record) => isImportant(record.name) || ["bone", "artery", "vein", "nerve"].includes(record.layer))
    .sort((a, b) => layerSort(a.layer) - layerSort(b.layer) || a.chineseName.localeCompare(b.chineseName, "zh-CN"));

  const groupedRecords = records.reduce((groups, record) => {
    if (!groups.has(record.layer)) groups.set(record.layer, []);
    groups.get(record.layer).push(record);
    return groups;
  }, new Map());

  structureList.innerHTML = Object.keys(LAYER_CONFIG)
    .filter((layer) => layer !== "all" && groupedRecords.has(layer))
    .map((layer) => {
      const groupRecords = groupedRecords.get(layer);
      const config = LAYER_CONFIG[layer];
      const collapsed = collapsedStructureGroups.has(layer);
      return `
        <section class="structure-group${collapsed ? " is-collapsed" : ""}" data-layer="${layer}" style="--group:${config.color}">
          <button class="structure-group-toggle" type="button" data-layer="${layer}" aria-expanded="${String(!collapsed)}">
            <span class="structure-group-title">
              <span class="structure-chevron" aria-hidden="true"></span>
              <span>${config.label}</span>
            </span>
            <span class="structure-group-meta">
              <span class="structure-hidden-count"></span>
              <span>${groupRecords.length}</span>
            </span>
          </button>
          <div class="structure-group-items">
            ${groupRecords.map((record) => `
              <button class="structure-button" type="button" data-part="${record.id}" data-layer="${record.layer}" style="--dot:${LAYER_CONFIG[record.layer].color}">
                <span class="structure-dot" aria-hidden="true"></span>
                <span class="structure-name">
                  <span class="structure-name-cn">${escapeHtml(record.chineseName)}</span>
                  <span class="structure-name-en">${escapeHtml(record.name)}</span>
                </span>
                <span class="structure-type">${record.layerName}</span>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    }).join("");

  updateStructureGroupStates();
}

function bindEvents() {
  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });
  document.addEventListener("pointermove", onRotationPivotMove, { capture: true });
  document.addEventListener("pointerup", clearRotationPivotGesture, { capture: true });
  document.addEventListener("pointercancel", clearRotationPivotGesture, { capture: true });
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", () => setHover(null));
  renderer.domElement.addEventListener("click", () => {
    if (hoveredPart) selectPart(hoveredPart);
  });

  document.addEventListener("click", (event) => {
    const layerButton = event.target.closest(".layer-button");
    if (layerButton) {
      toggleLayer(layerButton.dataset.layer);
      return;
    }

    const structureGroupToggle = event.target.closest(".structure-group-toggle");
    if (structureGroupToggle) {
      toggleStructureGroup(structureGroupToggle.dataset.layer);
      return;
    }

    const structureButton = event.target.closest(".structure-button");
    if (structureButton) {
      selectPart(structureButton.dataset.part);
    }
  });

  document.getElementById("resetSelection").addEventListener("click", clearSelection);
  toggleExtractButton.addEventListener("click", toggleSelectedExtraction);
  hidePartButton.addEventListener("click", hideSelectedPart);
  restoreHiddenButton.addEventListener("click", restoreHiddenParts);
  panModeButton.addEventListener("click", () => setPanMode(!isPanMode));
  xrayModeButton.addEventListener("click", () => setXrayMode(!isXrayMode));
  document.getElementById("focusButton").addEventListener("click", () => focusCamera(false));
  document.getElementById("explodeAllButton").addEventListener("click", explodeAll);
  document.getElementById("collapseButton").addEventListener("click", collapseAll);
  renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());
}

function onPointerDown(event) {
  if (!modelRoot) return;
  if (!shouldSetRotationPivot(event)) return;

  const hit = pickVisiblePart(event);
  rotationPivotGesture = hit
    ? {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      point: hit.point.clone(),
      applied: false
    }
    : null;
}

function onRotationPivotMove(event) {
  if (!rotationPivotGesture || rotationPivotGesture.pointerId !== event.pointerId) return;
  if (rotationPivotGesture.applied) return;

  const dragDistance = Math.hypot(
    event.clientX - rotationPivotGesture.startX,
    event.clientY - rotationPivotGesture.startY
  );
  if (dragDistance < 3) return;

  applyRotationPivot(rotationPivotGesture.point);
  rotationPivotGesture.applied = true;
}

function applyRotationPivot(point) {
  cancelTweensFor(camera.position);
  cancelTweensFor(controls.target);
  controls.target.copy(point);
  controls.update();
}

function clearRotationPivotGesture(event) {
  if (!rotationPivotGesture) return;
  if (event?.pointerId !== undefined && rotationPivotGesture.pointerId !== event.pointerId) return;
  rotationPivotGesture = null;
}

function shouldSetRotationPivot(event) {
  if (event.pointerType === "touch") return event.isPrimary && !isPanMode;
  if (event.button === 0) return !isPanMode;
  if (event.button === 2) return isPanMode;
  return false;
}

function onPointerMove(event) {
  if (!modelRoot) return;
  const hit = pickVisiblePart(event);
  if (!hit) {
    setHover(null);
    return;
  }
  setHover(hit.object.userData.partId, event.clientX, event.clientY);
}

function pickVisiblePart(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(pickables, false).find((item) => {
    const record = partRecords.get(item.object.userData.partId);
    return record && isPartVisible(record);
  });
}

function setHover(partId, x = 0, y = 0) {
  hoveredPart = partId;
  document.body.style.cursor = partId ? "pointer" : (isPanMode ? "grab" : "default");
  if (!partId) {
    tooltip.classList.remove("is-visible");
    updateHighlights();
    return;
  }
  const record = partRecords.get(partId);
  tooltip.textContent = record ? getDisplayName(record) : "";
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add("is-visible");
  updateHighlights();
}

function setPanMode(enabled) {
  isPanMode = enabled;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: enabled ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: enabled ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: enabled ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
  if (panModeButton) {
    panModeButton.classList.toggle("is-active", enabled);
    panModeButton.textContent = enabled ? "旋转" : "平移";
    panModeButton.title = enabled ? "切换为旋转拖拽" : "切换为平移拖拽";
  }
  document.body.style.cursor = enabled ? "grab" : "default";
}

function setXrayMode(enabled) {
  isXrayMode = enabled;
  xrayModeButton.classList.toggle("is-active", enabled);
  xrayModeButton.setAttribute("aria-pressed", String(enabled));
  xrayModeButton.title = enabled ? "关闭透视观察" : "开启透视观察";
  applyVisibility();
}

function selectPart(partId) {
  const record = partRecords.get(partId);
  if (!record) return;
  const previousPart = selectedPart;
  const previousPartExtracted = selectedPartExtracted;

  if (previousPartExtracted && previousPart && previousPart !== partId) {
    const previousRecord = partRecords.get(previousPart);
    if (previousRecord) {
      tweenVector(previousRecord.object.position, getBasePosition(previousRecord), 520);
    }
    selectedPartExtracted = false;
    extractionReturnView = null;
  }

  hiddenParts.delete(partId);
  selectedPart = partId;
  if (previousPart !== partId) {
    selectedPartExtracted = false;
    extractionReturnView = null;
  }

  if (!isLayerAvailable(record.layer)) {
    activeLayers.add(record.layer);
    updateLayerButtons();
  }

  setSelectionOutline(record);

  partRecords.forEach((item) => {
    item.object.visible = isPartVisible(item);
    applyRecordOpacity(item, 420);
  });

  updateInfo(record);
  updateButtons();
  applyVisibility();
  updateHighlights();
}

function clearSelection() {
  if (selectedPartExtracted && selectedPart) {
    const record = partRecords.get(selectedPart);
    if (record) {
      tweenVector(record.object.position, getBasePosition(record), 520);
    }
  }
  selectedPart = null;
  selectedPartExtracted = false;
  extractionReturnView = null;
  removeSelectionOutline();
  partRecords.forEach((record) => {
    record.object.visible = isPartVisible(record);
    tweenVector(record.object.position, getBasePosition(record), 620);
    tweenMaterial(record.object.material, {
      opacity: displayOpacity(record),
      emissiveIntensity: 0
    }, 360);
    updateMaterialDepth(record, displayOpacity(record));
  });
  updateEmptyInfo();
  updateButtons();
}

function updateEmptyInfo() {
  partTitle.textContent = "选择一个真实结构";
  partSummary.textContent = "当前模型来自 AnatomyTOOL Open3DModel 的真实下肢 GLB，包含骨骼、软骨、韧带、筋膜、肌肉、动脉、静脉和神经。点击任意结构会先原地高亮，再用抽出按钮单独拆解。";
  partRole.textContent = "用于观察真实下肢结构的空间关系。";
  partLocation.textContent = "模型覆盖右侧骨盆、大腿、小腿、踝和足。胫骨、腓骨以及对应肌肉、韧带、血管、神经均在模型中。";
  layerBadge.textContent = "真实 GLB";
  partNotes.innerHTML = `
    <li>模型来源：AnatomyTOOL Open3DModel lower limb，CC BY-SA 4.0。</li>
    <li>可隐藏单个外层结构来观察同层或深层结构，使用“恢复隐藏”显示回来。</li>
    <li>该页面只做交互式学习展示，不用于医学诊断。</li>
  `;
}

function explodeAll() {
  isExploded = true;
  applyStructurePositions(760);
  applyVisibility();
  updateButtons();
  updateHighlights();
}

function collapseAll() {
  isExploded = false;
  applyStructurePositions(760);
  applyVisibility();
  updateButtons();
  updateHighlights();
}

function applyStructurePositions(duration) {
  partRecords.forEach((record) => {
    tweenVector(record.object.position, getTargetPosition(record), duration);
  });
}

function applyVisibility() {
  partRecords.forEach((record) => {
    const visible = isPartVisible(record);
    record.object.visible = visible;
    applyRecordOpacity(record, 220);
  });

  document.querySelectorAll(".structure-button").forEach((button) => {
    const hidden = hiddenParts.has(button.dataset.part);
    const visible = isLayerAvailable(button.dataset.layer) && !hidden;
    button.classList.toggle("is-hidden", hidden);
    button.style.opacity = hidden ? "0.34" : (visible ? "1" : "0.38");
    button.title = hidden ? "该部位已隐藏，点击可恢复并选中" : "";
  });
  updateStructureGroupStates();
}

function toggleStructureGroup(layer) {
  if (!layer) return;
  if (collapsedStructureGroups.has(layer)) {
    collapsedStructureGroups.delete(layer);
  } else {
    collapsedStructureGroups.add(layer);
  }
  updateStructureGroupStates();
}

function updateStructureGroupStates() {
  document.querySelectorAll(".structure-group").forEach((group) => {
    const layer = group.dataset.layer;
    const collapsed = collapsedStructureGroups.has(layer);
    const layerAvailable = isLayerAvailable(layer);
    const buttons = Array.from(group.querySelectorAll(".structure-button"));
    const hiddenCount = buttons.filter((button) => hiddenParts.has(button.dataset.part)).length;
    const hiddenCountNode = group.querySelector(".structure-hidden-count");

    group.classList.toggle("is-collapsed", collapsed);
    group.classList.toggle("is-layer-hidden", !layerAvailable);
    group.querySelector(".structure-group-toggle")?.setAttribute("aria-expanded", String(!collapsed));
    if (hiddenCountNode) {
      hiddenCountNode.textContent = hiddenCount ? `隐藏 ${hiddenCount}` : "";
    }
  });
}

function toggleLayer(layer) {
  if (!LAYER_CONFIG[layer]) return;

  if (activeLayers.has(layer)) {
    activeLayers.delete(layer);
  } else {
    activeLayers.add(layer);
  }

  updateLayerButtons();
  const selectedRecord = selectedPart ? partRecords.get(selectedPart) : null;
  if (selectedRecord && !isLayerAvailable(selectedRecord.layer)) {
    clearSelection();
  }
  applyVisibility();
  updateHighlights();
}

function updateLayerButtons() {
  document.querySelectorAll(".layer-button").forEach((button) => {
    const layer = button.dataset.layer;
    const active = activeLayers.has(layer);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.title = active ? "点击隐藏该类结构" : "点击显示该类结构";
  });
}

function updateInfo(record) {
  const info = getDetail(record);
  partTitle.innerHTML = `
    <span class="part-title-cn">${escapeHtml(record.chineseName)}</span>
    <span class="part-title-en">${escapeHtml(record.name)}</span>
  `;
  partSummary.textContent = info.summary;
  partRole.textContent = info.role;
  partLocation.textContent = info.location;
  layerBadge.textContent = info.badge;
  partNotes.innerHTML = info.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
}

function getDetail(record) {
  const override = findDetailOverride(record);
  const badge = override?.badge || anatomyBadge(record);
  return {
    badge,
    summary: override?.summary || `${record.chineseName} 是真实下肢模型中的 ${record.layerName} 结构，原始英文名为 ${record.name}，保留了 GLB 网格的真实形态。`,
    role: override?.role || layerRole(record.layer),
    location: override?.location || "位于真实右下肢模型中，可通过旋转和拆解观察它和周围结构的关系。",
    notes: [
      `类别：${badge}`,
      `中文译名：${record.chineseName}`,
      `英文原名：${record.name}`,
      "选中后该真实 mesh 会先在原位高亮；抽出时会聚焦该结构，回位后恢复抽出前的整体视角。",
      "需要观察被遮挡的深层结构时，可使用“隐藏部位”临时隐藏当前结构。",
      "来源模型：AnatomyTOOL Open3DModel lower limb。"
    ]
  };
}

function findDetailOverride(record) {
  return DETAIL_OVERRIDES.find((item) => {
    const layerMatches = !item.layers || item.layers.includes(record.layer);
    return layerMatches && item.match.test(record.name);
  });
}

function anatomyBadge(record) {
  if (/tendon/i.test(record.name)) return "肌腱";
  if (/aponeurosis|fascia/i.test(record.name)) return "筋膜";
  if (/retinaculum/i.test(record.name)) return "支持带";
  if (/meniscus/i.test(record.name)) return "半月板";
  if (/labrum/i.test(record.name)) return "关节唇";
  if (/art cart|cartilage/i.test(record.name)) return "软骨";
  return record.layerName;
}

function updateButtons() {
  document.querySelectorAll(".structure-button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.part === selectedPart);
    button.classList.toggle("is-hidden", hiddenParts.has(button.dataset.part));
  });
  toggleExtractButton.disabled = !selectedPart;
  toggleExtractButton.textContent = selectedPartExtracted ? "回位" : "抽出部位";
  toggleExtractButton.classList.toggle("is-active", selectedPartExtracted);
  hidePartButton.disabled = !selectedPart;
  restoreHiddenButton.disabled = hiddenParts.size === 0;
  restoreHiddenButton.textContent = hiddenParts.size ? `恢复隐藏(${hiddenParts.size})` : "恢复隐藏";
}

function toggleSelectedExtraction() {
  if (!selectedPart) return;
  const record = partRecords.get(selectedPart);
  if (!record) return;

  if (selectedPartExtracted) {
    selectedPartExtracted = false;
    tweenVector(record.object.position, getBasePosition(record), 680);
    restoreExtractionView();
  } else {
    selectedPartExtracted = true;
    extractionReturnView = {
      cameraPosition: camera.position.clone(),
      controlsTarget: controls.target.clone()
    };
    const extractedPosition = record.originalPosition.clone().add(record.selectedExplode);
    tweenVector(record.object.position, extractedPosition, 680);
    focusExtractedPart(record, extractedPosition);
  }

  updateButtons();
}

function getTargetPosition(record) {
  if (selectedPartExtracted && record.id === selectedPart) {
    return record.originalPosition.clone().add(record.selectedExplode);
  }
  return getBasePosition(record);
}

function getBasePosition(record) {
  return isExploded
    ? record.originalPosition.clone().add(record.allExplode)
    : record.originalPosition.clone();
}

function hideSelectedPart() {
  if (!selectedPart) return;
  const record = partRecords.get(selectedPart);
  if (!record) return;

  hiddenParts.add(record.id);
  if (selectedPartExtracted) {
    restoreExtractionView();
  }

  tweenVector(record.object.position, getBasePosition(record), 320);
  selectedPart = null;
  selectedPartExtracted = false;
  extractionReturnView = null;
  setHover(null);
  removeSelectionOutline();
  updateEmptyInfo();
  applyVisibility();
  updateButtons();
  updateHighlights();
}

function restoreHiddenParts() {
  if (!hiddenParts.size) return;
  hiddenParts.clear();
  applyVisibility();
  updateButtons();
  updateHighlights();
}

function focusExtractedPart(record, extractedPosition) {
  const box = getRecordBoxAtPosition(record, extractedPosition);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const partRadius = Math.max(size.length() * 0.5, modelRadius * 0.08);
  const mobile = host.clientWidth < 700;
  const distance = THREE.MathUtils.clamp(
    partRadius * (mobile ? 2.25 : 1.85),
    modelRadius * (mobile ? 0.72 : 0.52),
    modelRadius * (mobile ? 1.72 : 1.35)
  );
  const viewDirection = camera.position.clone().sub(controls.target);
  if (viewDirection.lengthSq() < 0.0001) viewDirection.set(0.35, 0.18, 1);
  viewDirection.normalize();
  const targetPosition = center.clone().add(viewDirection.multiplyScalar(distance));
  tweenVector(controls.target, center, 680);
  tweenVector(camera.position, targetPosition, 680);
}

function restoreExtractionView() {
  if (!extractionReturnView) return;
  tweenVector(camera.position, extractionReturnView.cameraPosition, 680);
  tweenVector(controls.target, extractionReturnView.controlsTarget, 680);
  extractionReturnView = null;
}

function getRecordBoxAtPosition(record, position) {
  const originalPosition = record.object.position.clone();
  record.object.position.copy(position);
  record.object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(record.object);
  record.object.position.copy(originalPosition);
  record.object.updateMatrixWorld(true);
  return box;
}

function updateHighlights() {
  partRecords.forEach((record) => {
    const isSelected = record.id === selectedPart;
    const isHovered = record.id === hoveredPart;
    const highlighted = (isSelected || isHovered) && isLayerAvailable(record.layer);
    record.object.material.emissive.setHex(isSelected ? SELECTED_EMISSIVE : (isHovered ? HOVER_EMISSIVE : 0x000000));
    tweenMaterial(record.object.material, {
      emissiveIntensity: highlighted ? (isSelected ? SELECTED_EMISSIVE_INTENSITY : HOVER_EMISSIVE_INTENSITY) : 0
    }, 180);
  });
}

function setSelectionOutline(record) {
  removeSelectionOutline();
  const highlightGroup = new THREE.Group();
  highlightGroup.name = "selected anatomy highlight";
  highlightGroup.userData.partId = record.id;
  highlightGroup.matrixAutoUpdate = false;

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: OUTLINE_COLOR,
    transparent: true,
    opacity: 0.54,
    side: THREE.BackSide,
    depthWrite: false
  });

  const outline = createCenteredHighlightMesh(
    record.object.geometry,
    outlineMaterial,
    selectionOutlineScale(record.layer)
  );

  highlightGroup.add(outline);
  scene.add(highlightGroup);
  selectionOutline = highlightGroup;
  syncSelectionOutline();
}

function removeSelectionOutline() {
  if (!selectionOutline) return;
  const outline = selectionOutline;
  selectionOutline = null;
  outline.parent?.remove(outline);
  outline.traverse((object) => {
    if (object.material) object.material.dispose();
  });
}

function createCenteredHighlightMesh(geometry, material, scale) {
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
  const pivot = new THREE.Group();
  pivot.name = "selected anatomy centered outline";
  pivot.position.copy(center);
  pivot.scale.setScalar(scale);

  const shell = new THREE.Mesh(geometry, material);
  shell.name = "selected anatomy outline shell";
  shell.position.copy(center).multiplyScalar(-1);
  shell.renderOrder = 30;
  shell.raycast = () => {};
  pivot.add(shell);

  return pivot;
}

function syncSelectionOutline() {
  if (!selectionOutline) return;
  const record = partRecords.get(selectionOutline.userData.partId);
  if (!record || record.id !== selectedPart || !isPartVisible(record)) {
    selectionOutline.visible = false;
    return;
  }

  record.object.updateMatrixWorld(true);
  selectionOutline.visible = record.object.visible;
  selectionOutline.matrix.copy(record.object.matrixWorld);
  selectionOutline.matrixWorldNeedsUpdate = true;
}

function selectionOutlineScale(layer) {
  if (layer === "artery" || layer === "vein" || layer === "nerve") return 1.018;
  if (layer === "muscle" || layer === "ligament") return 1.01;
  return 1.006;
}

function focusCamera(immediate) {
  if (!modelRoot) return;
  const mobile = host.clientWidth < 700;
  const distance = modelRadius * (mobile ? 2.05 : 1.72);
  const targetPosition = modelCenter.clone().add(new THREE.Vector3(distance * 0.42, distance * 0.2, distance));
  if (immediate) {
    camera.position.copy(targetPosition);
    controls.target.copy(modelCenter);
  } else {
    tweenVector(camera.position, targetPosition, 680);
    tweenVector(controls.target, modelCenter, 680);
  }
  controls.minDistance = modelRadius * 0.45;
  controls.maxDistance = modelRadius * 4.2;
  camera.near = Math.max(0.001, modelRadius / 200);
  camera.far = modelRadius * 20;
  camera.updateProjectionMatrix();
}

function addDissectionGrid() {
  const grid = new THREE.GridHelper(7, 14, 0x6b5948, 0x3c332b);
  grid.position.y = -1.25;
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  scene.add(grid);
}

function onResize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  focusCamera(true);
}

function animate() {
  requestAnimationFrame(animate);
  runTweens();
  syncSelectionOutline();
  controls.update();
  renderer.render(scene, camera);
}

function tweenVector(vector, target, duration) {
  activeTweens.add({
    type: "vector",
    target: vector,
    from: vector.clone(),
    to: target.clone(),
    start: performance.now(),
    duration
  });
}

function tweenMaterial(material, values, duration) {
  Object.entries(values).forEach(([key, value]) => {
    activeTweens.add({
      type: "material",
      target: material,
      key,
      from: material[key],
      to: value,
      start: performance.now(),
      duration
    });
  });
}

function cancelTweensFor(target) {
  activeTweens.forEach((tween) => {
    if (tween.target === target) activeTweens.delete(tween);
  });
}

function runTweens() {
  const now = performance.now();
  activeTweens.forEach((tween) => {
    const progress = Math.min(1, (now - tween.start) / tween.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (tween.type === "vector") {
      tween.target.copy(tween.from).lerp(tween.to, eased);
    } else {
      tween.target[tween.key] = tween.from + (tween.to - tween.from) * eased;
    }
    if (progress >= 1) activeTweens.delete(tween);
  });
}

function layerOpacity(layer) {
  if (!isLayerAvailable(layer)) return 0;
  if (layer === "cartilage") return 0.72;
  if (layer === "ligament") return 0.88;
  return 1;
}

function recordOpacity(record) {
  if (!isPartVisible(record)) return 0;
  return layerOpacity(record.layer);
}

function displayOpacity(record) {
  const baseOpacity = recordOpacity(record);
  if (!isXrayMode || !baseOpacity) return baseOpacity;
  if (selectedPart) {
    return record.id === selectedPart ? baseOpacity : Math.min(baseOpacity, XRAY_OPACITY);
  }
  return Math.min(baseOpacity, GLOBAL_XRAY_OPACITY);
}

function applyRecordOpacity(record, duration) {
  const targetOpacity = displayOpacity(record);
  updateMaterialDepth(record, targetOpacity);
  tweenMaterial(record.object.material, { opacity: targetOpacity }, duration);
}

function updateMaterialDepth(record, opacity) {
  record.object.material.depthWrite = opacity > GLOBAL_XRAY_OPACITY && record.layer !== "cartilage";
}

function isPartVisible(record) {
  return isLayerAvailable(record.layer) && !hiddenParts.has(record.id);
}

function isLayerAvailable(layer) {
  return activeLayers.has(layer);
}

function layerSort(layer) {
  return Object.keys(LAYER_CONFIG).indexOf(layer);
}

function isImportant(name) {
  const text = name.toLowerCase();
  return IMPORTANT_TERMS.some((term) => text.includes(term));
}

function getDisplayName(record) {
  if (!record) return "";
  return record.chineseName && record.chineseName !== record.name
    ? `${record.chineseName}\n${record.name}`
    : record.name;
}

function translateAnatomyName(name, layer) {
  const cleaned = cleanName(name);
  if (!cleaned) return `${LAYER_CONFIG[layer]?.label || "解剖"}结构`;
  const cleanedExact = getExactTranslation(cleaned);
  if (cleanedExact) return cleanedExact;

  const text = normalizeTranslationSource(cleaned);
  const exact = getExactTranslation(text);
  if (exact) return exact;

  const translated = translateSpecialPattern(text) || translatePhrase(text);
  if (containsChinese(translated)) return translated;
  return `${LAYER_CONFIG[layer]?.label || "解剖"}结构`;
}

function normalizeTranslationSource(value) {
  return value
    .replace(/\bbr\.?\s*of\b/gi, "branch of")
    .replace(/\bbr\./gi, "branch")
    .replace(/\bbr\b/gi, "branch")
    .replace(/\ba\./gi, "artery")
    .replace(/\ba\b/gi, "artery")
    .replace(/\blig\./gi, "ligament")
    .replace(/\bpost\b/gi, "posterior")
    .replace(/\bthe\b/gi, "")
    .replace(/\bSural n\b/gi, "Sural nerve")
    .replace(/\bFemoralis nerve\b/gi, "Femoral nerve")
    .replace(/\bplanter\b/gi, "plantar")
    .replace(/\bcuteneous\b/gi, "cutaneous")
    .replace(/\bcollatertal\b/gi, "collateral")
    .replace(/\s+/g, " ")
    .trim();
}

function translateSpecialPattern(value) {
  let match = value.match(/^(\d(?:st|nd|rd|th)) Dorsal interossei muscles of foot$/i);
  if (match) return `${translateOrdinal(match[1])}足背骨间肌`;

  match = value.match(/^(\d(?:st|nd|rd|th)) to (\d(?:st|nd|rd|th)) perforating branches of the deep femoral (artery|vein)$/i);
  if (match) return `${translateOrdinal(match[1])}至${translateOrdinal(match[2])}穿通支（${match[3].toLowerCase() === "artery" ? "股深动脉" : "股深静脉"}）`;

  match = value.match(/^Annular ligaments of (\d(?:st|nd|rd|th)) toe (A\d-A\d)$/i);
  if (match) return `${translateOrdinal(match[1])}趾环状韧带 ${match[2]}`;

  match = value.match(/^Cruciform ligaments (?:or|of) (\d(?:st|nd|rd|th)) toe$/i);
  if (match) return `${translateOrdinal(match[1])}趾十字韧带`;

  match = value.match(/^Extensor apparatus of (\d(?:st|nd|rd|th)) toe$/i);
  if (match) return `${translateOrdinal(match[1])}趾伸肌装置`;

  match = value.match(/^Annulus fibrosus ([A-Z0-9]+) ([A-Z0-9]+)$/i);
  if (match) return `${match[1]}-${match[2]}纤维环`;

  match = value.match(/^Lumbar vertebra \((L\d)\)$/i);
  if (match) return `腰椎（${match[1]}）`;

  match = value.match(/^Thoracic vertebra \((T\d+)\)$/i);
  if (match) return `胸椎（${match[1]}）`;

  match = value.match(/^(First|Second|Third|Fourth|Fifth) metatarsal bone$/i);
  if (match) return `${translateOrdinal(match[1])}跖骨`;

  match = value.match(/^(Distal|Middle|Proximal) phalanx of (first|second|third|fourth|fifth) finger of foot$/i);
  if (match) return `足${translateOrdinal(match[2])}趾${translatePosition(match[1])}趾骨`;

  match = value.match(/^Art carts? of (.+)$/i);
  if (match) return `${translatePhrase(match[1])}关节软骨`;

  match = value.match(/^Articular cartilage of (.+)$/i);
  if (match) return `${translatePhrase(match[1])}关节软骨`;

  match = value.match(/^Articular capsules? of (.+)$/i);
  if (match) return `${translatePhrase(match[1])}关节囊`;

  match = value.match(/^Accompanying veins of (.+)$/i);
  if (match) return `${translatePhrase(match[1])}伴行静脉`;

  match = value.match(/^Perforating branches \((.+)\)$/i);
  if (match) return `穿通支（${translateProperName(match[1])}）`;

  match = value.match(/^Sup, Inf, Ant, Post, Pubic ligaments$/i);
  if (match) return "上、下、前、后及耻骨韧带";

  return "";
}

function translatePhrase(value) {
  const text = normalizeTranslationSource(value);
  if (!text) return "";
  const exact = getExactTranslation(text);
  if (exact) return exact;
  const wholePhrase = PHRASE_TRANSLATIONS.find(([source]) => source.toLowerCase() === text.toLowerCase());
  if (wholePhrase) return wholePhrase[1];

  const parenthetical = text.match(/^(.+?)\s*\((.+)\)$/);
  if (parenthetical) {
    return `${translatePhrase(parenthetical[1])}（${translatePhrase(parenthetical[2])}）`;
  }

  const special = translateSpecialPattern(text);
  if (special) return special;

  const ofIndex = text.toLowerCase().lastIndexOf(" of ");
  if (ofIndex > 0) {
    const left = text.slice(0, ofIndex);
    const right = text.slice(ofIndex + 4);
    return `${translatePhrase(right)}${translatePhrase(left)}`;
  }

  if (/\s+and\s+/i.test(text)) {
    return text.split(/\s+and\s+/i).map((part) => translatePhrase(part)).join("和");
  }

  if (/\s+or\s+/i.test(text)) {
    return text.split(/\s+or\s+/i).map((part) => translatePhrase(part)).join("或");
  }

  let translated = text;
  PHRASE_TRANSLATIONS.forEach(([source, target]) => {
    translated = translated.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi"), target);
  });
  return tidyTranslatedName(translated);
}

function translateOrdinal(value) {
  return TOE_ORDINAL_TRANSLATIONS[String(value).toLowerCase()] || String(value);
}

function getExactTranslation(value) {
  if (EXACT_NAME_TRANSLATIONS[value]) return EXACT_NAME_TRANSLATIONS[value];
  const lower = String(value).toLowerCase();
  const entry = Object.entries(EXACT_NAME_TRANSLATIONS).find(([key]) => key.toLowerCase() === lower);
  return entry?.[1] || "";
}

function translatePosition(value) {
  const positions = {
    distal: "远节",
    middle: "中节",
    proximal: "近节"
  };
  return positions[String(value).toLowerCase()] || value;
}

function translateProperName(value) {
  return value
    .replace(/Boyd's veins/i, "Boyd 静脉")
    .replace(/Cockett's veins/i, "Cockett 静脉")
    .replace(/Dodd's veins/i, "Dodd 静脉");
}

function tidyTranslatedName(value) {
  return value
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .replace(/\s+([），、])/g, "$1")
    .replace(/([（，、])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function containsChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function cleanName(name) {
  return name
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?:[.\s_-]+r)$/i, "")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function layerRole(layer) {
  const roles = {
    bone: "形成下肢和足部的骨性支架，承担负重并提供肌肉、韧带附着点。",
    cartilage: "覆盖关节面或构成半月板等软骨结构，降低摩擦并分散压力。",
    ligament: "连接骨与骨或形成筋膜/支持带，稳定关节并限制异常运动。",
    muscle: "产生下肢和足部运动，维持姿势、步态和足弓动态稳定。",
    artery: "向下肢组织输送含氧血液。",
    vein: "负责下肢静脉回流。",
    nerve: "传导感觉和运动信号，支配肌肉并提供皮肤感觉。"
  };
  return roles[layer] || "参与真实下肢解剖结构的空间组织。";
}
