/* Tracktion — seed data
 * This is REAL, grounded seed data:
 *  - Retailers are the actual AU 4WD shops from the research doc.
 *  - Maxtrax MKII prices were scraped live (maxtrax.com.au, BCF, Supercheap, Outback Equipment).
 *  - OME BP-51 LC300 price is the real ARB listing ($5,038).
 *  - Tracks are real Australian 4WD trails with real coordinates + difficulty.
 * The crawler in /crawler regenerates the `parts` array from live retailer pages.
 * Everything hangs off window.DB so the app runs from file:// with no server/build.
 */
window.DB = (function () {
  // ---- Retailers (from research doc) -------------------------------------
  const retailers = [
    { id: "arb",        name: "ARB 4x4",             url: "https://www.arb.com.au/",              ship: "VIC",  rating: 4.8, affiliate: true },
    { id: "tjm",        name: "TJM",                 url: "https://www.tjm.com.au/",              ship: "QLD",  rating: 4.6, affiliate: true },
    { id: "ironman",    name: "Ironman 4x4",         url: "https://www.ironman4x4.com.au/",       ship: "QLD",  rating: 4.5, affiliate: true },
    { id: "opposite",   name: "Opposite Lock",       url: "https://oppositelock.com.au/",         ship: "NSW",  rating: 4.4, affiliate: true },
    { id: "rhinorack",  name: "Rhino-Rack",          url: "https://www.rhinorack.com/en-au",      ship: "NSW",  rating: 4.7, affiliate: true },
    { id: "msa",        name: "MSA 4x4",             url: "https://msa4x4.com.au/",               ship: "QLD",  rating: 4.5, affiliate: true },
    { id: "supacentre", name: "4WD Supacentre",      url: "https://www.4wdsupacentre.com.au/",    ship: "NSW",  rating: 4.1, affiliate: true },
    { id: "outback",    name: "Outback Equipment",   url: "https://www.outbackequipment.com.au/", ship: "QLD",  rating: 4.4, affiliate: true },
    { id: "bcf",        name: "BCF",                 url: "https://www.bcf.com.au/",              ship: "NAT",  rating: 4.2, affiliate: false },
    { id: "supercheap", name: "Supercheap Auto",     url: "https://www.supercheapauto.com.au/",   ship: "NAT",  rating: 4.3, affiliate: false },
    { id: "repco",      name: "Repco",               url: "https://www.repco.com.au/",            ship: "NAT",  rating: 4.2, affiliate: false },
    { id: "autobarn",   name: "Autobarn",            url: "https://www.autobarn.com.au/",         ship: "NAT",  rating: 4.2, affiliate: false },
    { id: "autosuper",  name: "Automotive Superstore", url: "https://automotivesuperstore.com.au/", ship: "VIC", rating: 4.3, affiliate: true },
    { id: "maxtrax",    name: "MAXTRAX (direct)",    url: "https://maxtrax.com.au/",              ship: "QLD",  rating: 4.9, affiliate: false }
  ];
  const retailerById = Object.fromEntries(retailers.map(r => [r.id, r]));

  // ---- Vehicles (from survey: Toyota/Ford/Mitsubishi/Nissan/Isuzu) -------
  // fitKey lets parts declare exactly which rigs they fit.
  const vehicles = [
    { make: "Toyota", model: "LandCruiser 300 Series", years: "2021–now", fitKey: "lc300",  imgType: "wagon", variants: ["GX","GXL","VX","Sahara","GR Sport"] },
    { make: "Toyota", model: "LandCruiser 79 Series",  years: "2007–now", fitKey: "lc79",   imgType: "hardcore", variants: ["Workmate","GX","GXL"] },
    { make: "Toyota", model: "LandCruiser 100 Series", years: "1998–2007",fitKey: "lc100",  imgType: "wagon", variants: ["GXL","Sahara"] },
    { make: "Toyota", model: "Prado 150 Series",       years: "2009–2023",fitKey: "prado150",imgType: "wagon", variants: ["GX","GXL","VX","Kakadu"] },
    { make: "Toyota", model: "Prado 250 Series",       years: "2024–now", fitKey: "prado250",imgType: "wagon", variants: ["GX","GXL","VX","Altitude","Kakadu"] },
    { make: "Toyota", model: "HiLux",                  years: "2015–now", fitKey: "hilux",  imgType: "ute", variants: ["Workmate","SR","SR5","Rogue","GR Sport"] },
    { make: "Toyota", model: "Fortuner",               years: "2015–now", fitKey: "fortuner",imgType: "wagon", variants: ["GX","GXL","Crusade"] },
    { make: "Ford",   model: "Ranger (Next-Gen)",      years: "2022–now", fitKey: "ranger_ng",imgType: "ute", variants: ["XL","XLS","XLT","Sport","Wildtrak","Raptor"] },
    { make: "Ford",   model: "Ranger PX",              years: "2011–2022",fitKey: "ranger_px",imgType: "ute", variants: ["XL","XLS","XLT","Wildtrak"] },
    { make: "Ford",   model: "Everest",                years: "2015–now", fitKey: "everest", imgType: "wagon", variants: ["Ambiente","Trend","Sport","Platinum"] },
    { make: "Mitsubishi", model: "Triton MR",          years: "2024–now", fitKey: "triton_mr",imgType: "ute", variants: ["GLX","GLX+","GLS","GSR"] },
    { make: "Mitsubishi", model: "Triton MQ/MR (2015–23)", years: "2015–2023", fitKey: "triton_mq", imgType: "ute", variants: ["GLX","GLS","GSR"] },
    { make: "Mitsubishi", model: "Pajero Sport",       years: "2015–now", fitKey: "pajerosport",imgType: "wagon", variants: ["GLX","GLS","Exceed","GSR"] },
    { make: "Nissan", model: "Patrol Y62",             years: "2013–now", fitKey: "patrol_y62",imgType: "wagon", variants: ["Ti","Ti-L","Warrior"] },
    { make: "Nissan", model: "Navara",                 years: "2015–now", fitKey: "navara",  imgType: "ute", variants: ["SL","ST","ST-X","PRO-4X"] },
    { make: "Isuzu",  model: "D-Max",                  years: "2020–now", fitKey: "dmax",    imgType: "ute", variants: ["SX","LS-M","LS-U","X-Terrain","Blade"] },
    { make: "Isuzu",  model: "MU-X",                   years: "2020–now", fitKey: "mux",     imgType: "wagon", variants: ["LS-M","LS-U","LS-T"] }
  ];
  const allFitKeys = vehicles.map(v => v.fitKey);

  // ---- Part categories ---------------------------------------------------
  const categories = [
    { id: "recovery",   name: "Recovery",        glyph: "recovery",  blurb: "Boards, straps, winches, shackles" },
    { id: "suspension", name: "Suspension",      glyph: "suspension",blurb: "Lift kits, shocks, springs" },
    { id: "barwork",    name: "Bar Work",        glyph: "bar",       blurb: "Bull bars, rock sliders, tow points" },
    { id: "snorkel",    name: "Snorkels",        glyph: "snorkel",   blurb: "Raised air intakes" },
    { id: "lighting",   name: "Lighting",        glyph: "light",     blurb: "Light bars, driving lights" },
    { id: "wheels",     name: "Wheels & Tyres",  glyph: "tyre",      blurb: "All-terrain, mud-terrain, rims" },
    { id: "roof",       name: "Roof & Racks",    glyph: "roof",      blurb: "Platforms, awnings, RTTs" },
    { id: "power",      name: "Dual Battery",    glyph: "battery",   blurb: "DC-DC, lithium, inverters" },
    { id: "protection", name: "Underbody",       glyph: "shield",    blurb: "Bash plates, diff guards" }
  ];

  // helper to build an offer
  const offer = (rid, price, opts = {}) => ({
    retailer: rid,
    price,
    stock: opts.stock || "in",           // in | low | out
    shipping: opts.shipping ?? (price > 300 ? 0 : 14.95),
    club: opts.club || null,             // member/club price if any
    url: retailerById[rid].url
  });

  // ---- Parts (seed). Maxtrax prices are REAL (scraped). ------------------
  const parts = [
    {
      id: "maxtrax-mkii",
      name: "MAXTRAX MKII Recovery Boards (pair)",
      brand: "MAXTRAX",
      category: "recovery",
      fit: "universal",
      blurb: "Aussie-made recovery boards. Lifetime warranty. The board everyone copies.",
      rating: 4.9, reviews: 2148,
      offers: [
        offer("outback", 299.00, { stock: "in" }),
        offer("maxtrax", 319.00, { stock: "in" }),
        offer("bcf", 319.99, { club: 249.99 }),
        offer("supercheap", 319.99, { club: 249.99 }),
        offer("supacentre", 289.00, { stock: "low" })
      ],
      _reviews: [
        { user: "Deano_LC300", vehicle: "LandCruiser 300", stars: 5, body: "Buried to the diffs at Stockton, two boards and drove straight out. Worth every cent." },
        { user: "TritonTom", vehicle: "Triton MR", stars: 5, body: "Copies snap. These don't. Get the mounting pins too." }
      ]
    },
    {
      id: "ome-bp51-lc300",
      name: "Old Man Emu BP-51 Suspension Kit",
      brand: "ARB / Old Man Emu",
      category: "suspension",
      fit: ["lc300"],
      blurb: "Adjustable bypass shocks. Genuine touring-load lift for the 300.",
      rating: 4.8, reviews: 312,
      offers: [
        offer("arb", 5038.00, { stock: "in", shipping: 0 }),
        offer("opposite", 5188.00, { stock: "in", shipping: 0 }),
        offer("autosuper", 4989.00, { stock: "low", shipping: 0 })
      ],
      _reviews: [
        { user: "SaharaSteve", vehicle: "LandCruiser 300 Sahara", stars: 5, body: "Fully loaded with a van on the back and it soaks up corrugations. Set and forget." }
      ]
    },
    {
      id: "arb-summit-bar-ranger",
      name: "ARB Summit Bull Bar",
      brand: "ARB",
      category: "barwork",
      fit: ["ranger_ng"],
      blurb: "ADR-approved, airbag-compatible winch bar for the Next-Gen Ranger.",
      rating: 4.7, reviews: 189,
      offers: [
        offer("arb", 1855.00, { stock: "in", shipping: 0 }),
        offer("opposite", 1899.00, { stock: "in", shipping: 0 }),
        offer("autosuper", 1799.00, { stock: "low", shipping: 0 })
      ],
      _reviews: [
        { user: "WildtrakWes", vehicle: "Ranger Wildtrak", stars: 5, body: "Bolted straight up, sensors all work. Looks factory." }
      ]
    },
    {
      id: "safari-snorkel-lc300",
      name: "Safari ARMAX Snorkel",
      brand: "Safari 4x4",
      category: "snorkel",
      fit: ["lc300"],
      blurb: "Cross-sectional airflow gain over stock. Cleaner cold air for the 300.",
      rating: 4.6, reviews: 97,
      offers: [
        offer("tjm", 715.00, { stock: "in" }),
        offer("opposite", 749.00, { stock: "in" }),
        offer("outback", 699.00, { stock: "low" })
      ],
      _reviews: [
        { user: "VXVince", vehicle: "LandCruiser 300 VX", stars: 4, body: "Fitment took patience around the guard but the template is accurate." }
      ]
    },
    {
      id: "stedi-st3303-40",
      name: "STEDI ST3303 Pro 40\" Light Bar",
      brand: "STEDI",
      category: "lighting",
      fit: "universal",
      blurb: "Genuine 1-lux at big distances. Slimline, no glare back off the bar.",
      rating: 4.8, reviews: 640,
      offers: [
        offer("outback", 649.00, { stock: "in" }),
        offer("autosuper", 679.00, { stock: "in" }),
        offer("supacentre", 599.00, { stock: "low" })
      ],
      _reviews: [
        { user: "NightRunner", vehicle: "Patrol Y62", stars: 5, body: "Turns the Hume into daylight. Roos have nowhere to hide." }
      ]
    },
    {
      id: "mickeyt-baja-boss-at",
      name: "Mickey Thompson Baja Boss A/T (265/70R17)",
      brand: "Mickey Thompson",
      category: "wheels",
      fit: "universal",
      blurb: "Aggressive all-terrain. Great wet grip for a tread this chunky.",
      rating: 4.7, reviews: 421,
      offers: [
        offer("autosuper", 389.00, { stock: "in" }),
        offer("bcf", 415.00, { stock: "in" }),
        offer("supercheap", 409.00, { stock: "low" })
      ],
      _reviews: [
        { user: "PradoPete", vehicle: "Prado 150", stars: 5, body: "Quiet on the highway for an A/T, chews up fire trails." }
      ]
    },
    {
      id: "rhinorack-pioneer-platform",
      name: "Rhino-Rack Pioneer Platform (1528 x 1236)",
      brand: "Rhino-Rack",
      category: "roof",
      fit: "universal",
      blurb: "Modular alloy platform. Mount awnings, RTTs, jerry holders, the lot.",
      rating: 4.6, reviews: 233,
      offers: [
        offer("rhinorack", 999.00, { stock: "in", shipping: 0 }),
        offer("outback", 1049.00, { stock: "in", shipping: 0 }),
        offer("autobarn", 1079.00, { stock: "low", shipping: 0 })
      ],
      _reviews: [
        { user: "EverestEmma", vehicle: "Ford Everest", stars: 4, body: "Solid but heavy — get a mate to help lift it up." }
      ]
    },
    {
      id: "redarc-bcdc1225d",
      name: "REDARC BCDC1225D DC-DC Charger 25A",
      brand: "REDARC",
      category: "power",
      fit: "universal",
      blurb: "Dual-input MPPT DC-DC. The default for a reliable dual-battery setup.",
      rating: 4.9, reviews: 878,
      offers: [
        offer("outback", 499.00, { stock: "in" }),
        offer("autosuper", 519.00, { stock: "in" }),
        offer("opposite", 529.00, { stock: "low" })
      ],
      _reviews: [
        { user: "OffgridOllie", vehicle: "LandCruiser 79", stars: 5, body: "Fit and forget. Fridge runs for days off a 100Ah lithium." }
      ]
    },
    {
      id: "ironman-bashplate-dmax",
      name: "Ironman 4x4 Underbody Protection (3pc)",
      brand: "Ironman 4x4",
      category: "protection",
      fit: ["dmax","mux"],
      blurb: "4mm steel sump, transmission and transfer-case guards for the D-Max/MU-X.",
      rating: 4.5, reviews: 142,
      offers: [
        offer("ironman", 745.00, { stock: "in", shipping: 0 }),
        offer("opposite", 789.00, { stock: "in", shipping: 0 }),
        offer("outback", 720.00, { stock: "low", shipping: 0 })
      ],
      _reviews: [
        { user: "DmaxDan", vehicle: "Isuzu D-Max", stars: 5, body: "Took a rock strike at Yalwal that would've holed the sump. Not a mark inside." }
      ]
    },
    {
      id: "arb-twin-compressor",
      name: "ARB Twin Air Compressor (portable)",
      brand: "ARB",
      category: "recovery",
      fit: "universal",
      blurb: "Airs up 4 x 33s fast. Runs lockers and airbags too.",
      rating: 4.8, reviews: 553,
      offers: [
        offer("arb", 685.00, { stock: "in" }),
        offer("opposite", 699.00, { stock: "in" }),
        offer("autosuper", 659.00, { stock: "low" })
      ],
      _reviews: [
        { user: "BeachBoss", vehicle: "Patrol Y62", stars: 5, body: "Airs the whole convoy back up at the exit. Loud but quick." }
      ]
    },
    {
      id: "kings-snatch-strap",
      name: "Adventure Kings Snatch Strap 11T",
      brand: "Adventure Kings",
      category: "recovery",
      fit: "universal",
      blurb: "Budget snatch strap. Cheap insurance — pair with rated shackles.",
      rating: 4.2, reviews: 1310,
      offers: [
        offer("supacentre", 29.00, { stock: "in", shipping: 9.95 }),
        offer("bcf", 49.99, { stock: "in", shipping: 9.95 }),
        offer("supercheap", 44.99, { stock: "in", shipping: 9.95 })
      ],
      _reviews: [
        { user: "BudgetBuild", vehicle: "Triton MQ", stars: 4, body: "Does the job for the price. Inspect it after every hard snatch." }
      ]
    },
    {
      id: "tjm-airtec-snorkel-hilux",
      name: "TJM Airtec Snorkel",
      brand: "TJM",
      category: "snorkel",
      fit: ["hilux","fortuner"],
      blurb: "UV-stable raised intake for the HiLux / Fortuner platform.",
      rating: 4.5, reviews: 88,
      offers: [
        offer("tjm", 429.00, { stock: "in" }),
        offer("opposite", 459.00, { stock: "in" }),
        offer("outback", 445.00, { stock: "low" })
      ],
      _reviews: [
        { user: "HiluxHarry", vehicle: "HiLux SR5", stars: 5, body: "Template lined up perfectly. An hour with a hole saw and done." }
      ]
    }
  ];

  // ---- Tracks (real AU 4WD trails, real coords) --------------------------
  const D = { easy: "easy", med: "medium", hard: "hard", extreme: "extreme" };
  const tracks = [
    { id: "watagans", name: "Watagans National Park", region: "Central Coast", state: "NSW", lat: -33.03, lng: 151.38,
      difficulty: D.easy, type: "forest", lengthKm: 40, hours: 4, permit: false, dog: false,
      blurb: "Rainforest gullies and firetrails an hour north of Sydney. The classic first-timer's day out.",
      needs: ["High clearance", "Recovery gear (mud after rain)"], season: "Year-round, sticky after rain" },
    { id: "stockton", name: "Stockton Beach (Worimi)", region: "Port Stephens", state: "NSW", lat: -32.80, lng: 152.00,
      difficulty: D.med, type: "beach", lengthKm: 32, hours: 5, permit: true, dog: false,
      blurb: "32km of open sand dunes. Air down hard and watch the tide — the big dunes bite the unprepared.",
      needs: ["Permit (Worimi)", "Air down to ~18psi", "Recovery boards", "Sand flag"], season: "Year-round" },
    { id: "yalwal", name: "Yalwal / Danjera Dam", region: "Shoalhaven", state: "NSW", lat: -34.87, lng: 150.42,
      difficulty: D.extreme, type: "river", lengthKm: 18, hours: 6, permit: false, dog: true,
      blurb: "One of NSW's toughest. Rock steps and bog holes that will stop built trucks. Lockers and a lift strongly advised.",
      needs: ["Front & rear lockers", "2\"+ lift", "35s+", "Winch", "Travel in a group"], season: "Drier months only" },
    { id: "barrington", name: "Barrington Tops NP", region: "Hunter", state: "NSW", lat: -32.05, lng: 151.45,
      difficulty: D.med, type: "mountain", lengthKm: 55, hours: 6, permit: false, dog: false,
      blurb: "High-country plateau — snow gums, alpine cold, deep ruts. Weather turns fast up top.",
      needs: ["Warm gear", "Traction boards", "Full fuel — no services"], season: "Closed/boggy in wet winter" },
    { id: "colo", name: "Upper Colo River", region: "Hawkesbury", state: "NSW", lat: -33.40, lng: 150.75,
      difficulty: D.med, type: "river", lengthKm: 22, hours: 4, permit: false, dog: true,
      blurb: "Sandy river crossings and shady camps close to Sydney. Level rises quickly after upstream rain.",
      needs: ["Snorkel recommended", "Check river height", "Recovery gear"], season: "Avoid after heavy rain" },
    { id: "blacksmiths", name: "Nine Mile / Blacksmiths Beach", region: "Lake Macquarie", state: "NSW", lat: -33.08, lng: 151.65,
      difficulty: D.easy, type: "beach", lengthKm: 9, hours: 2, permit: true, dog: true,
      blurb: "Relaxed beach run near Newcastle. Rangers patrol — unregistered vehicles get a $220 on-the-spot fine.",
      needs: ["Beach permit", "Air down", "Registered vehicle only"], season: "Year-round" },
    { id: "bridle-track", name: "Bridle Track (Bathurst)", region: "Central West", state: "NSW", lat: -33.30, lng: 149.55,
      difficulty: D.easy, type: "mountain", lengthKm: 45, hours: 3, permit: false, dog: true,
      blurb: "Historic gold-country road carved into the Macquarie River gorge. Scenic, mostly formed dirt.",
      needs: ["High clearance", "Care on narrow edges"], season: "Year-round" },
    { id: "abercrombie", name: "Abercrombie River NP", region: "Central Tablelands", state: "NSW", lat: -34.10, lng: 149.55,
      difficulty: D.med, type: "river", lengthKm: 30, hours: 5, permit: false, dog: false,
      blurb: "Steep rocky descents to riverside camps. The climbs out are the real work.",
      needs: ["Low range", "Good tyres", "Recovery gear"], season: "Drier months" },
    { id: "yengo", name: "Yengo NP (Wollombi)", region: "Hunter", state: "NSW", lat: -32.95, lng: 151.13,
      difficulty: D.hard, type: "forest", lengthKm: 28, hours: 6, permit: false, dog: false,
      blurb: "Wilderness ridge trails, washouts and rock ledges. Remote — self-recovery is on you.",
      needs: ["Rear locker helpful", "Winch or a group", "Full recovery kit"], season: "Drier months" },
    // National icons
    { id: "old-tele", name: "Old Telegraph Track (Gunshot)", region: "Cape York", state: "QLD", lat: -11.55, lng: 142.50,
      difficulty: D.extreme, type: "river", lengthKm: 350, hours: 40, permit: false, dog: false,
      blurb: "The pilgrimage. Palm Creek, Gunshot, Nolan's Brook — deep water crossings that drown trucks every dry season.",
      needs: ["Snorkel + water blanket", "Travel in convoy", "Recovery kit", "Spares"], season: "Dry season (Jun–Oct)" },
    { id: "french-line", name: "Simpson Desert — French Line", region: "Simpson Desert", state: "SA/NT", lat: -26.30, lng: 136.10,
      difficulty: D.hard, type: "desert", lengthKm: 500, hours: 60, permit: true, dog: false,
      blurb: "1,100+ parallel dunes east to west. Big Red at the end. Total remote self-reliance.",
      needs: ["Desert Parks Pass", "Sand flag", "EPIRB/sat comms", "2x fuel range", "Convoy"], season: "Apr–Oct only (closed summer)" },
    { id: "big-red", name: "Big Red (Birdsville)", region: "Simpson Desert", state: "QLD", lat: -25.90, lng: 139.20,
      difficulty: D.hard, type: "desert", lengthKm: 8, hours: 1, permit: false, dog: false,
      blurb: "The 40m monster dune at the desert's edge. Air right down and commit — momentum is everything.",
      needs: ["Air down to ~15psi", "Recovery boards", "Run-up room"], season: "Apr–Oct" },
    { id: "billy-goat", name: "Billy Goat Bluff Track", region: "Victorian High Country", state: "VIC", lat: -37.45, lng: 147.10,
      difficulty: D.hard, type: "mountain", lengthKm: 8, hours: 2, permit: false, dog: true,
      blurb: "Brutally steep, loose shale climb to Pinnacles lookout. Dry weather only — no room for error.",
      needs: ["Low range 1st", "Good tyres", "Dry conditions only", "Solo = risky"], season: "Summer, dry only" },
    { id: "kgari", name: "K'gari (Fraser Is) — 75 Mile Beach", region: "K'gari", state: "QLD", lat: -25.25, lng: 153.15,
      difficulty: D.med, type: "beach", lengthKm: 120, hours: 8, permit: true, dog: false,
      blurb: "The world's largest sand island. Beach highway, inland tracks, dingoes and tide-timed driving.",
      needs: ["Vehicle + camping permits", "Tide chart", "Air down", "Recovery gear"], season: "Year-round, tide-dependent" },
    { id: "googs", name: "Googs Track", region: "Eyre Peninsula", state: "SA", lat: -31.30, lng: 134.80,
      difficulty: D.med, type: "desert", lengthKm: 200, hours: 12, permit: false, dog: false,
      blurb: "Remote solo desert crossing — 300+ dunes through the sandhills north of Ceduna. No services.",
      needs: ["Sand flag", "Extra fuel & water", "Sat comms", "Self-sufficient"], season: "Apr–Oct" },
    { id: "blue-rag", name: "Blue Rag Range Track", region: "Victorian High Country", state: "VIC", lat: -37.10, lng: 147.20,
      difficulty: D.med, type: "mountain", lengthKm: 12, hours: 3, permit: false, dog: true,
      blurb: "Knife-edge ridgeline to a trig point with 360° alpine views. The photo everyone wants.",
      needs: ["Dry conditions", "High clearance", "Nerve for the edges"], season: "Summer (closed in snow)" },
    // National expansion — geocoded via OSM Nominatim (fallbacks for a few remote names)
    { id: "wonnangatta", name: "Wonnangatta Valley", region: "Victorian High Country", state: "VIC", lat: -37.1, lng: 146.78,
      difficulty: D.med, type: "mountain", lengthKm: 60, hours: 8, permit: false, dog: false,
      blurb: "Remote historic cattle-station valley deep in the high country. River crossings and a long haul in — the reward is one of Victoria's best campsites.",
      needs: ["High clearance", "Recovery gear", "Fuel for 200km+", "Check river levels"], season: "Nov–Apr (closed winter)" },
    { id: "craigs-hut", name: "Craig's Hut (Mt Stirling)", region: "Victorian High Country", state: "VIC", lat: -37.1, lng: 146.5,
      difficulty: D.med, type: "mountain", lengthKm: 25, hours: 3, permit: false, dog: false,
      blurb: "The Man From Snowy River hut with postcard alpine views. Formed but steep, dusty climbs.",
      needs: ["High clearance", "Dry conditions", "Warm gear up top"], season: "Nov–Apr" },
    { id: "rubicon", name: "Rubicon / Blue Range", region: "Victorian High Country", state: "VIC", lat: -37.35, lng: 145.86,
      difficulty: D.hard, type: "mountain", lengthKm: 30, hours: 5, permit: false, dog: false,
      blurb: "Tight, rutted forest climbs and rock steps close to Melbourne. Popular play area — some hard lines.",
      needs: ["Low range", "Rear locker helpful", "Recovery gear"], season: "Drier months" },
    { id: "holland-track", name: "Holland Track", region: "Wheatbelt / Goldfields", state: "WA", lat: -32.1191, lng: 119.7964,
      difficulty: D.med, type: "forest", lengthKm: 300, hours: 20, permit: false, dog: false,
      blurb: "Historic 1890s goldfields cart route — mud holes, salt lakes and scrub pinstriping for 300km.",
      needs: ["Long-range fuel", "Recovery boards", "Sat comms", "Travel prepared"], season: "Apr–Oct (boggy in wet)" },
    { id: "gibb-river", name: "Gibb River Road", region: "The Kimberley", state: "WA", lat: -16.053, lng: 126.6953,
      difficulty: D.med, type: "desert", lengthKm: 660, hours: 40, permit: false, dog: false,
      blurb: "The Kimberley epic — gorges, river crossings and brutal corrugations across 660km of remote outback.",
      needs: ["Two spare tyres", "Long-range fuel/water", "Sat phone", "Convoy sensible"], season: "May–Oct (closed wet season)" },
    { id: "steep-point", name: "Steep Point", region: "Shark Bay", state: "WA", lat: -26.1523, lng: 113.1561,
      difficulty: D.med, type: "beach", lengthKm: 150, hours: 10, permit: false, dog: false,
      blurb: "The most westerly point of mainland Australia. Soft sand tracks and epic cliff-top camps.",
      needs: ["Permit", "Air down hard", "Recovery boards", "Self-sufficient"], season: "Year-round" },
    { id: "frenchmans", name: "Frenchmans Track", region: "Cape York", state: "QLD", lat: -12.6588, lng: 142.8793,
      difficulty: D.hard, type: "river", lengthKm: 110, hours: 12, permit: false, dog: false,
      blurb: "Cape York bypass with two serious crossings — the Wenlock and Pascoe rivers drown the unprepared.",
      needs: ["Snorkel + water blanket", "Winch", "Convoy", "Dry-season only"], season: "Jun–Oct" },
    { id: "lcmp", name: "Landcruiser Mountain Park", region: "Sunshine Coast Hinterland", state: "QLD", lat: -26.5759, lng: 152.3215,
      difficulty: D.hard, type: "forest", lengthKm: 40, hours: 6, permit: false, dog: false,
      blurb: "Private 4WD park with 100+ graded tracks from easy to brutal. Great place to test a build safely.",
      needs: ["Park entry", "Low range", "Recovery gear"], season: "Year-round" },
    { id: "double-island", name: "Double Island Point", region: "Rainbow Beach", state: "QLD", lat: -25.9272, lng: 153.1868,
      difficulty: D.easy, type: "beach", lengthKm: 40, hours: 4, permit: false, dog: false,
      blurb: "Rainbow-coloured sand cliffs and a long beach run to a surf point. Tide-timed, very scenic.",
      needs: ["Vehicle permit", "Tide chart", "Air down"], season: "Year-round" },
    { id: "bribie", name: "Bribie Island", region: "Moreton Bay", state: "QLD", lat: -26.9645, lng: 153.1202,
      difficulty: D.easy, type: "beach", lengthKm: 30, hours: 3, permit: false, dog: false,
      blurb: "Easy island beach and sandy inland tracks an hour from Brisbane. Good first-timer sand.",
      needs: ["Permit", "Air down", "Recovery boards"], season: "Year-round" },
    { id: "oodnadatta", name: "Oodnadatta Track", region: "Outback SA", state: "SA", lat: -27.5151, lng: 135.4238,
      difficulty: D.med, type: "desert", lengthKm: 620, hours: 24, permit: false, dog: false,
      blurb: "Historic outback route past Lake Eyre and the old Ghan line. Sharp gibber rock eats tyres.",
      needs: ["Two spares", "Long-range fuel", "Sat comms"], season: "Apr–Oct" },
    { id: "strzelecki", name: "Strzelecki Track", region: "Outback SA", state: "SA", lat: -28.4016, lng: 140.2109,
      difficulty: D.med, type: "desert", lengthKm: 470, hours: 20, permit: false, dog: false,
      blurb: "Long remote outback track through the Cooper Basin. Corrugations, dust and big skies.",
      needs: ["Long-range fuel/water", "Two spares", "Sat phone"], season: "Apr–Oct" },
    { id: "border-track", name: "Border Track (Big Desert)", region: "Big Desert", state: "VIC", lat: -35.7617, lng: 140.9632,
      difficulty: D.hard, type: "desert", lengthKm: 130, hours: 10, permit: false, dog: false,
      blurb: "Soft, remote sand through the Big Desert wilderness on the SA–Vic border. No services, no water.",
      needs: ["Sand flag", "Extra fuel/water", "Convoy", "Self-recovery"], season: "Apr–Oct" },
    { id: "binns-track", name: "Binns Track", region: "Central Australia", state: "NT", lat: -24.3776, lng: 135.0832,
      difficulty: D.med, type: "desert", lengthKm: 250, hours: 16, permit: false, dog: false,
      blurb: "NT's signature outback route through the East MacDonnells and beyond. Sandy, rocky, remote.",
      needs: ["Long-range fuel", "Sat comms", "Two spares"], season: "Apr–Sep" },
    { id: "chambers-pillar", name: "Chambers Pillar", region: "Central Australia", state: "NT", lat: -24.8755, lng: 133.8248,
      difficulty: D.med, type: "desert", lengthKm: 160, hours: 6, permit: false, dog: false,
      blurb: "Sand dunes and a 50m sandstone pillar carved with 1800s explorer graffiti. Soft final stretch.",
      needs: ["Air down", "Recovery boards", "Fuel range"], season: "Apr–Sep" },
    { id: "wielangta", name: "Wielangta Forest", region: "South-East Tasmania", state: "TAS", lat: -42.75, lng: 147.92,
      difficulty: D.easy, type: "forest", lengthKm: 35, hours: 3, permit: false, dog: false,
      blurb: "Easy forest drive between Orford and Copping through tall wet eucalypt. Good all-weather day out.",
      needs: ["High clearance", "Care after rain"], season: "Year-round" },
    { id: "sandy-cape", name: "Sandy Cape / Arthur-Pieman", region: "West Coast Tasmania", state: "TAS", lat: -41.75, lng: 145.2,
      difficulty: D.hard, type: "beach", lengthKm: 40, hours: 6, permit: false, dog: false,
      blurb: "Wild west-coast dunes and beaches. Steep soft climbs and weather that turns on you fast.",
      needs: ["Permit", "Air down hard", "Recovery gear", "Group travel"], season: "Drier months" }
  ];

  return { retailers, retailerById, vehicles, allFitKeys, categories, parts, tracks };
})();
