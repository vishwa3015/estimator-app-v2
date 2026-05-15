
// TEST: intentional lint error — unused variable
const _testUnused = "this should block the commit";

export type ProductData = {
  // products: {
  //   title: string;
  //   descriptions: string[];
  // }[];
  workmanship?: string[];
  warranty: string;
};

export const PRODUCT_DATA: Record<number, ProductData> = {
  0: {
    // Good
    // products: [
    //   {
    //     title: "GAF Timberline Natural Shadow Roofing System",
    //     descriptions: [
    //       "NS Shingles creates a subtle, upscale, even-toned, architectural look with the warmth of wood.",
    //       "They'll improve your home's curb appeal and resale value at a price you can afford!",
    //     ],
    //   },
    //   {
    //     title: "GAF Timberline Seal A Ridge Hip and Ridge Caps",
    //     descriptions: ["Made by GAF, the oldest shingle manufacturer in America, Seal A Ridge is a hip & ridge cap that will withstand the elements."],
    //   },
    //   {
    //     title: "GAF Pro Start Starter Strips",
    //     descriptions: ["Pro Start Starter Strips are built to last and can withstand winds in excess of 130mph!"],
    //   },
    //   { title: "Ridge Vent", descriptions: ["Entry level attic ventilation system."] },
    //   { title: "Pipe Flashing", descriptions: ["This flashing will protect your vent pipes from direct exposure to the elements."] },
    //   { title: "Self Adhering Membrane", descriptions: ["This membrane acts as an ice and water shield that will help to keep your roof deck dry."] },
    //   {
    //     title: "GAF Felt Buster Synthetic Underlayment",
    //     descriptions: ["GAF Synthetic underlayment is a step above the rest and will be the armor between your shingles and roof deck."],
    //   },
    // ],
    workmanship: [
      "Installation of GAF Timberline NS Roofing System:  COLOR:______________",
      "We will aquire all necessary licensing, general liability documents, and permits where required",
      "Every jobsite will have trained, qualified and supervised labor during tear off of existing roof system",
      "Prior to installation the roof deck will be inspected and replaced for an additional fee, and photos will be provided",
      "Additional roof deck sheeting will incur a $80  replacement fee, first 2 repairs are free",
      "Provide complete jobsite clean up and dispose of all trash and debris into the provided dumpster",
      "All flashing will be inspected and when in need of replacement, options will be discussed with homeowner prior to install",
      "All pipe boots will be inspected and replaced with Pipe Flashing as described above",
      "Install Synthetic Underlayment and Self Adhering Membrane as listed above",
      "Self Adhering Membrane will be installed around all roof penetrations, includes valleys and skylights",
      "Synthetic Underlayment will be installed on entire roof, excepting where the facet's pitch is 3 and below",
      "Where required by local building code Drip Edge will be installed on all rakes and eaves: COLOR:_______________",
      "We will provide homeowner with communication regarding scheduling and photos of work in progress",
    ],
    warranty: "GAF Systems Plus Warranty (50 years non-prorated on materials)",
  },

  1: {
    // Better
    // products: [
    //   {
    //     title: "GAF Timberline HDz Roofing System",
    //     descriptions: [
    //       "Timberline HDz offers a 15 year WIND PROVEN wind warranty (Class 3 shingles) and a 25 year algae warranty on Stainguard Plus labled shingles.",
    //       "#1 Sold Shingle in all of North America",
    //     ],
    //   },
    //   {
    //     title: "GAF Timberline Seal A Ridge Hip and Ridge Caps",
    //     descriptions: ["Made by GAF, the oldest shingle manufacturer in America, Seal A Ridge is a hip & ridge cap that will withstand the elements"],
    //   },
    //   {
    //     title: "GAF Pro Start Starter Strips",
    //     descriptions: ["Pro Start Starter Strips are built to last and can withstand winds in excess of 130mph!"],
    //   },
    //   { title: "GAF Cobra Ridgid Vent III", descriptions: ["Best in Class - Cobra Ridgid Vent III provides optimum attic ventilation and circulation"] },
    //   { title: "Pipe Flashing", descriptions: ["This flashing will protect your vent pipes from direct exposure to the elements"] },
    //   { title: "Self Adhering Membrane", descriptions: ["This membrane acts as an ice and water shield that will help to keep your roof deck dry"] },
    //   {
    //     title: "GAF Felt Buster Synthetic Underlayment",
    //     descriptions: ["GAF Synthetic underlayment is a step above the rest and will be the armor between your shingles and roof deck"],
    //   },
    // ],
    workmanship: [
      " Installation of GAF Timberline HDz 50 Year Architectural Roofing System:   COLOR:________________",
      "We will aquire all necessary licensing, general liability documents, and permits where required",
      "Every jobsite will have trained, qualified and supervised labor during tear off of existing roof system",
      "Prior to installation the roof deck will be inspected and replaced for an additional fee, and photos will be provided",
      "Additional roof deck sheeting will incur a $80 replacement fee, first 2 repairs are free",
      "Provide complete jobsite clean up and dispose of all trash and debris into the provided dumpster",
      "All flashing will be inspected. When in need of replacement, options will be discussed with homeowner prior to installation",
      "All pipe boots will be inspected and replaced with Pipe Flashing as described above",
      "Install Self Adhering Membrane and GAF Synthetic Underlayment as listed above",
      "Self Adhering Membrane will be installed around all roof penetrations, includes valleys and skylights",
      "Synthetic Underlayment will be installed on entire roof, excepting where the facet's pitch is 3 and below.",
      "Where required by local building code Drip Edge will be installed on all rakes and eaves:  COLOR:____________",
      "We will provide homeowner with communication regarding scheduling and photos of work in progress",
    ],
    warranty: "GAF Silver Pledge Warranty (50 years non-prorated on materials)",
  },

  2: {
    // Best
    // products: [
    //   {
    //     title: "GAF Timberline HDz + American Harvest Roofing System",
    //     descriptions: [
    //       "Timberline HDz + AH offers a 15 year WIND PROVEN wind warranty (Class 3 shingles) and a 25 year algae warranty on Stainguard Plus labled shingles.",
    //       "AH is a professionally designed color palette featuring subtle blends with contrasting colors that will add charm to any home.",
    //     ],
    //   },
    //   {
    //     title: "GAF Timberline Seal A Ridge Hip and Ridge Caps",
    //     descriptions: ["Made by GAF, the oldest shingle manufacturer in America, Seal A Ridge is a hip & ridge cap that will withstand the elements"],
    //   },
    //   {
    //     title: "GAF Pro Start Starter Strips",
    //     descriptions: ["Pro Start Starter Strips are built to last and can withstand winds in excess of 130mph!"],
    //   },
    //   { title: "GAF Cobra Ridgid Vent III", descriptions: ["Best in Class - Cobra Ridgid Vent III provides optimum attic ventilation and circulation"] },
    //   { title: "Ultimate Pipe Flashing", descriptions: ["This flashing will protect your vent pipes from direct exposure to the elements"] },
    //   { title: "GAF Stormguard Membrane", descriptions: ["Top quality, high temp membrane that acts as an ice and water shield to help keep your roof deck dry"] },
    //   {
    //     title: "GAF Tiger Paw Underlayment",
    //     descriptions: ["Premium Roof Deck Protection combines strength and long term durability to help protect your home against wind driven rain."],
    //   },
    // ],
    workmanship: [
      "Installation of GAF Timberline HDZ/AH Lifetime 50 Year Architectural Roofing System:   COLOR:___________",
      "We will aquire all necessary licensing, general liability documents, and permits where required",
      "Every jobsite will have trained, qualified and supervised labor during tear off of existing roof system",
      "Prior to installation the roof deck will be inspected and and replaced for an additional fee, and photos will be provided",
      "Additional roof deck sheeting will incur a $80 replacement fee, first 2 repairs are free",
      "Provide complete jobsite clean up and dispose of all trash and debris into the provided dumpster",
      "All flashing will be inspected. When in need of replacement, options will be discussed with homeowner prior to installation",
      "All pipe boots will be inspected and replaced with Ultimate Pipe Flashing as described above",
      "Install GAF Tiger Paw Underlayment and GAF StormGuard Membrane as listed above",
      "Self Adhering membrane will be installed around all roof penetrations, includes valleys and skylights",
      "Synethic Underlayment will be installed on entire roof, excepting where the facet's pitch is 3 and below",
      "Where required by local building code Drip Edge will be installed on all rakes and eaves:  COLOR:______________",
      "We will provide homeowner with communication regarding scheduling and photos of work in progress",

    ],
    warranty: "GAF Golden Pledge Warranty (50 years non-prorated on materials)",
  },
};