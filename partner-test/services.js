/*
 * BlooRush service catalog — SINGLE SOURCE OF TRUTH.
 * Extracted VERBATIM from bloorush.in's booking page (SERVICES + ADDONS).
 * Both bloorush.in and the Partner Portal should load THIS file, so editing
 * a service name or duration here updates both. Do not keep a second copy.
 */
const SERVICES = {
  utensils:{name:"Utensils cleaning",sheetImg:"https://i.ibb.co/PvJkfG7j/Whats-App-Image-2026-07-13-at-10-37-39-PM.jpg",icon:"🍽️",tile:"util",desc:"Dishes, vessels & kitchen sink",
    tiers:[["30 min",89,"30 min"],["45 min",129,"45 min"],["60 min",179,"60 min"],["90 min",239,"90 min"],["120 min",299,"120 min"]],
    inc:["Wash daily-used utensils","Plates, bowls, glasses, cups, spoons & cutlery","Cooking vessels & pans used for regular cooking","Clean the kitchen sink after washing"],
    exc:["Removing heavily burnt food residue","Deep cleaning appliances (microwave, oven, mixer)","Silver or brass polishing","Commercial or bulk utensil cleaning","Cleaning outside the kitchen area"]},
  mopsweep:{name:"Mopping & sweeping",sheetImg:"https://i.ibb.co/1yZWBZJ/Whats-App-Image-2026-07-13-at-10-09-49-PM.jpg",icon:"🧹",tile:"mop",desc:"Full-home floors",
    tiers:[["1 BHK",99,"15 min"],["2 BHK",119,"25 min"],["3 BHK",139,"40 min"],["4 BHK",179,"55 min"]],
    inc:["Sweep & mop all accessible floor areas","Kitchen, living room, bedrooms & bathroom floors","Under tables, chairs & sofas (without moving them)","Corners and edges","Collect dust & dispose in household bin","Uses your mop, bucket & cleaning solution"],
    exc:["Moving heavy furniture or appliances","Scrubbing stubborn stains or paint marks","Acid wash, chemical or floor/marble polishing","Lofts, storage spaces, terraces, gardens or parking","Water extraction or flood cleanup","Post-renovation debris"]},
  dusting:{name:"Dusting",sheetImg:"https://i.ibb.co/MkCLgktk/Whats-App-Image-2026-07-13-at-10-28-40-PM.jpg",icon:"🪶",tile:"dust",desc:"Surfaces, shelves & furniture",img:"https://i.ibb.co/v4rPWm4N/Whats-App-Image-2026-07-13-at-3-51-50-PM-1.jpg",
    tiers:[["1 BHK",99,"30 min"],["2 BHK",129,"40 min"],["3 BHK",179,"60 min"],["4 BHK",229,"80 min"]],
    inc:["Dust & wipe accessible surfaces, shelves & furniture tops","TV units, tables, chairs & showcase exteriors","Window sills & ledges (accessible)","Decorative items & photo frames","Skirting, switchboards & door frames (accessible)","Spot-wipe fingerprints from surfaces"],
    exc:["Moving heavy furniture or appliances","Dusting above safe reach / needing a ladder","Inside cupboards, drawers or showcases","Wet cleaning, polishing or stain removal","Wall & ceiling dusting / cobweb removal at height","Fragile antique or high-value item handling"]},
  toiletbath:{name:"Toilet & bathroom",sheetImg:"https://i.ibb.co/4Rsxnpn8/Whats-App-Image-2026-07-13-at-10-48-53-PM.jpg",icon:"🚽",tile:"toilet",desc:"Single or combined · sanitised",
    tiers:[["Single toilet",99,"30 min"],["Single bathroom",99,"30 min"],["Combined (toilet + bathroom)",159,"30 min"],["2 combined",318,"60 min"],["3 combined",477,"90 min"]],
    inc:["Scrub toilet bowl — inside, rim & under the rim","Clean seat, lid, cistern & flush fittings","Clean floor & accessible wall tiles","Clean washbasin, taps & mirror","Wipe shower area & accessible fittings","Sanitise & disinfect all cleaned surfaces"],
    exc:["Heavy hard-water / lime-scale removal needing acid (book deep clean)","Grout / tile deep-scrubbing & restoration","Unclogging, plumbing or drainage repairs","Dismantling flush tank, panels or fittings","Mould / fungus chemical treatment","Cleaning above safe reach or needing a ladder","Removing paint, cement or renovation residue"]},
  kitchen:{name:"Kitchen cleaning",sheetImg:"https://i.ibb.co/LX2P5wQw/Whats-App-Image-2026-07-13-at-10-51-06-PM.jpg",icon:"🍳",tile:"kitchen",desc:"Surfaces, stovetop, sink & floor",new:true,
    tiers:[["1 kitchen",399,"~60 min"]],
    inc:["Clean countertop","Wipe stovetop","Clean sink","Wipe cabinet exteriors","Wipe chimney exterior","Clean backsplash","Sweep & mop kitchen floor"],
    exc:["Inside cabinets","Chimney deep cleaning","Inside appliances (fridge, microwave, oven, dishwasher)","Heavy grease or burnt-stain removal","Drain unclogging","Pest control","Appliance repair","Moving heavy appliances","Post-renovation cleaning","Wall & ceiling cleaning","Utensil cleaning — book separately"]},
  deeptoilet:{name:"Deep toilet & bathroom clean",qty:true,sheetImg:"https://i.ibb.co/tT50zm8m/Whats-App-Image-2026-07-13-at-11-00-09-PM.jpg",icon:"✨",tile:"toilet",desc:"Chemical descaling · monthly reset",new:true,
    tiers:[["1 unit",199,"30 min"]],
    inc:["Chemical deep-clean of toilet bowl — inside, rim, under-rim","Descaling of hard-water & lime-scale stains","Deep-clean of seat, lid, cistern & flush fittings","Tile & floor deep-scrub with chemicals","Wash basin, taps & mirror with descaler","Full sanitisation & disinfection"],
    exc:["Not a weekly service — book Washroom Weekly for regular maintenance","Grout restoration or tile replacement","Plumbing, unclogging or panel dismantling","Deep mould / fungus treatment beyond surface","Ladder-height or unsafe-access cleaning","Removing paint, cement or renovation residue"]},
  ironing:{name:"Ironing service",icon:"👔",tile:"util",desc:"Wrinkle-free, neatly pressed clothes",new:true,
    tiers:[["15–18 clothes",179,"60 min"],["25–32 clothes",259,"90 min"],["35–42 clothes",339,"120 min"]],
    inc:["Ironing of daily-wear clothes","Shirts, t-shirts, pants & jeans","Kurtas & simple sarees","Kids' clothes","Folding after ironing","Organised stacking"],
    exc:["Dry cleaning","Stain removal","Washing of clothes","Heavy wedding dresses","Delicate designer garments needing steam pressing","Curtains & large linens","Industrial / commercial ironing","You provide: working iron, board/flat table, electricity & clean dry clothes"]},
  packing:{name:"Packing & unpacking",icon:"📦",tile:"util",desc:"Shifting, moving & home organising help",new:true,
    tiers:[["Small room / studio",199,"60 min"],["1 BHK",349,"90 min"],["2 BHK",449,"120 min"],["3 BHK (packing partner)",799,"240 min"]],
    inc:["Packing household items into boxes","Kitchen utensils packing","Clothes packing","Books & documents packing","Basic fragile wrapping (your material)","Unpacking boxes & arranging on shelves","Basic home organisation"],
    exc:["Transportation or moving vehicle","Loading / unloading trucks","Furniture dismantling or assembly","Electrical or plumbing work","Heavy safes or appliances","Professional-grade fragile packing material","Disposal of packing waste","You provide: boxes, tape, bubble wrap, paper, marker & rope/film if needed"]}
};
const ADDONS = {
  window:{name:"Window cleaning",icon:"🪟",tile:"window",desc:"Glass, frames & sills",addon:true,
    tiers:[["1 unit",59,"15 min"],["2 units",119,"30 min"],["3 units",179,"50 min"]],
    inc:["Clean interior window glass","Wipe frames & tracks (accessible only)","Clean window sills","Remove normal dust & fingerprints"],
    exc:["Exterior high-rise window cleaning","Windows needing unsafe access or climbing","Removing paint, cement or adhesive","Glass polishing or scratch removal","Dismantling window panels"]},
  fan:{name:"Fan cleaning",icon:"🌀",tile:"fan",desc:"Blades & housing",addon:true,
    tiers:[["1 unit",59,"15 min"],["2 units",119,"30 min"],["3 units",179,"50 min"]],
    inc:["Wipe reachable ceiling fans","Clean fan blades and fan body","Wipe wall-mounted & table fans","Remove normal dust buildup"],
    exc:["Dismantling fans","Electrical repairs or maintenance","Fans needing ladders or unsafe access","Grease or heavy grime needing chemicals"]},
  balcony:{name:"Balcony cleaning",icon:"🪴",tile:"mop",desc:"Sweep, mop, wipe railings",addon:true,new:true,
    tiers:[["1 balcony",99,"20 min"]],
    inc:["Sweeping & mopping of balcony floor","Cleaning & wiping of balcony railings/grills","Cleaning & wiping of balcony parapet wall","Dusting of light, accessible balcony furniture"],
    exc:["Balcony walls or ceiling","Watering plants or gardening","Terrace, roof or exterior building walls","Moving heavy furniture or large plant pots"]},
  fridge:{name:"Fridge cleaning",icon:"🧊",tile:"kitchen",desc:"Interior + exterior · one fridge",addon:true,new:true,
    tiers:[["Single door",149,"45 min"],["Double door",199,"60 min"],["3 door",249,"90 min"]],
    inc:["Cleans one refrigerator only","Remove food, place safely aside","Discard expired items (as instructed)","Clean shelves, trays, drawers, compartments","Wipe interior walls, door panels, rubber lining","Clean fridge exterior — front & sides","Dry surfaces before restocking","Replace food items neatly"],
    exc:["Moving or lifting the fridge","Cleaning back panel or condenser coils","Repair or servicing","Defrosting beyond service time","Deep stain removal from long-term neglect","Special chemicals or deodorisers","Food organisation, labelling or diet sorting","Garbage disposal outside the home","Deep freezer cleaning","Meat handling (hygiene policy)"]}
};
const ALL = {...SERVICES, ...ADDONS};

/* Helper the Partner Portal uses: a flat list of {id, name, minutes}.
   minutes come from a representative tier: the 2nd size when a service has
   multiple sizes (a realistic default, not the smallest), else the only one. */
function bloorushServiceList() {
  return Object.keys(ALL).map(function (id) {
    var s = ALL[id];
    var tiers = (s.tiers || []).map(function (t) {
      var d = String(t[2] || ''); var m = d.match(/\d+/);
      return { label: t[0], price: t[1] || 0, minutes: m ? parseInt(m[0], 10) : 0 };
    });
    var base = tiers[0] || { price: 0, minutes: 0 };
    return { id: id, name: s.name, tiers: tiers, price: base.price, minutes: base.minutes };
  });
}
