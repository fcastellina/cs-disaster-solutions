/* ============================================================================
   DISASTER SOLUTIONS NAVIGATOR — CONFIGURATION
   Content, model references, scene presentation and navigation data.
   Keep runtime logic out of this file.
   ============================================================================ */

export const CONFIG = {

  /* the 3D file */
  model: {
    url: "/models/DPR_CITY.glb",   // sits next to this HTML file
    terrainNode: "TERRAIN"   // ground plane, shown at every level
  },

  /* the ground plane */
  ground: {
    visible: true,   // false hides the very large ground plane so the backdrop shows
    useModelMaterial: false,   // true uses the material assigned in Blender
    color: "#A8C24E",
    roughness: 0.96
  },

  /* how the closed volume is drawn at level 1 */
  cityShape: {
    forceOpaque: true   // draws the level 1 volume solid instead of as glass
  },

  /* interface wording */
  text: {
    title: "constructsteel · Resilience City",
    subtitle: "Select a location to explore a steel solution in context.",
    hintCity: "Select a building",
    hintBuilding: "Select a solution",
    back: "← Back to city",
    explore: "Explore solution ↗",
    provider: "Visit provider ↗",
    details: "Solution details ↗",
    modalKicker: "Interactive solution model"
  },

  /* colours */
  colors: {
    brand: "#035DAD",
    brandDark: "#00243F",
    paper: "#EEF1F4",
    skyTop: "#F4F8FA",
    skyBottom: "#DCE6EC"
  },

  /* level 1: the isometric city view */
  cityView: {
    fit: "auto",   // 'auto' or 'solutions' or 'building' frame automatically, 'manual' uses the values below
    azimuth: -34,   // degrees around the vertical axis
    elevation: 38,   // degrees above the horizon
    padding: 3.55,   // used by the automatic framing modes
    frustum: 320,   // used by manual framing. Smaller number = closer
    target: [0, 150, 0]   // the point the camera looks at
  },

  /* level 2: how far the user may orbit */
  orbit: {
    free: false,   // true ignores every orbit limit
    polarMin: 2,   // lowest angle above the horizon, negative allows looking from below
    polarMax: 88,   // highest angle
    zoomMin: 0.2,   // how far out the user may zoom
    zoomMax: 14   // how far in
  },

  /* how long each move takes, in milliseconds */
  transitions: {
    toCity: 1600,
    toBuilding: 2100,
    toSolution: 1100,
    fadeStart: 0.6,   // when the dissolve begins, as a fraction of the move
    fadeEnd: 1,   // when the dissolve finishes
    fadeSharpness: 1.3,   // higher spends less time half way between the two shapes
    fadeMode: "inFirst",   // cross | outFirst | inFirst | cut
    camEase: "inout"   // inout | out | in | linear
  },

  /* level 3: the camera move when a solution is picked */
  solutionView: {
    enabled: true,
    frustum: 34,   // used by manual framing. Smaller number = closer
    keepAngle: true,   // keep the angle the user is already looking from
    azimuth: null,   // degrees around the vertical axis
    elevation: null   // degrees above the horizon
  },

  /* sun, sky and exposure */
  lighting: {
    sunAzimuth: 133,
    sunElevation: 72,
    sunIntensity: 1.8,
    skyIntensity: 1.05,
    ambientIntensity: 0.3,
    environmentIntensity: 1,
    exposure: 1.02
  },

  /* the surrounding light and what you see behind the model */
  environment: {
    source: "gradient",   // 'gradient' builds a sky in code, 'image' uses the picture below
    image: "",   // equirectangular picture stored as data
    rotation: 0,
    background: "color",   // 'color' uses colors.skyTop, 'environment' shows the sky
    backgroundColor: "#FAFAFA",   // used when the backdrop is a flat colour
    backdropImage: "",   // a picture used only behind the model
    backgroundBlur: 0.38,
    spread: 1.2,   // how much of the panorama fits across the view
    backgroundIntensity: 1
  },

  /* size, move or turn a whole object from the model, keyed by its name */
  nodeTransforms: {},

  /* extra objects placed in the scene by hand */
  props: [],

  /* extra render passes, off by default because they cost performance */
  post: {
    enabled: false,
    toneMapping: "aces",   // none | linear | reinhard | cineon | aces | agx | neutral
    bloom: 0.08,   // glow strength on bright areas
    bloomThreshold: 0.08,
    bloomRadius: 0.14,
    vignette: 0   // darkens the corners
  },

  /* shadows. quality: 'off' | 'sharp' | 'soft' | 'softer' */
  shadows: {
    quality: "softer",   // 'off' | 'sharp' | 'soft' | 'softer'
    resolution: 1536,   // lower is softer and blockier, higher is crisper
    spread: 1.1,   // how much of the panorama fits across the view
    bias: 0,
    normalBias: 0.55   // raise if shadows stripe flat surfaces, lower if they float
  },

  /* per material overrides, keyed by the material name from Blender */
  materials: {
    "Column Ties": {
      transparent: true
    },
    LOD_04_Building: {
      roughness: 1
    }
  },

  /* animation, placeholder runs until a clip is exported */
  animation: {
    placeholder: "sway",   // 'sway' or 'off'
    placeholderNote: "Placeholder movement. Export an animation clip from Blender and name it below to replace it."
  },

  /* the buildings, copy a block to add another one */
  buildings: [
    {
      id: "one-bloor-west",
      name: "One Bloor West",
      position: [0, 0, 0],
      rotation: 0,
      scale: 1,
      nodes: {
        city: "LOD_04",
        detail: "LOD_00"
      },
      markerHeight: 0.6,   // 0 is the base, 1 is the roof
      view: {
        fit: "solutions",   // 'auto' or 'solutions' or 'building' frame automatically, 'manual' uses the values below
        azimuth: -50,   // degrees around the vertical axis
        elevation: 22,   // degrees above the horizon
        padding: 9,   // used by the automatic framing modes
        frustum: 120,   // used by manual framing. Smaller number = closer
        target: [13, 12, -25]   // the point the camera looks at
      },
      solutions: [
        {
          number: 1,
          node: "Solution_01",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "Corner hangers",
          title: "Corner Hanger Assembly",
          description: "See how the corner hanger carries the suspended floor edge, or open the solution to inspect it in 3D.",
          body: [
            "The corner hanger transfers the load of the suspended perimeter floor back into the primary structure above, so the corner of the building can stay free of a conventional ground bearing column.",
            "Because the assembly is bolted rather than welded on site, it can be installed quickly at height and inspected easily over the life of the building."
          ],
          specs: [
            ["Reference", "PR0603"],
            ["Family", "Hanger connections"],
            ["Role", "Load transfer at corners"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/pr0603-corner-hangers-88699cf541e34e08aefae936a16d531c",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solutions/prevention-solution/earthquake/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View the load path"
          }
        },
        {
          number: 2,
          node: "Solution_02",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "RBS connection",
          title: "RBS Beam-to-Column Connection",
          description: "See how the structural element behaves during an earthquake, or open the solution to inspect it in 3D.",
          body: [
            "In a reduced beam section the flanges of the beam are trimmed a short distance away from the column face. During a strong earthquake the beam yields inside that reduced zone instead of at the weld, so the plastic hinge forms where it can be tolerated.",
            "Keeping the hinge away from the column face protects the connection itself, which means the frame can absorb a large amount of energy while the primary load path stays intact."
          ],
          specs: [
            ["Reference", "PR0602"],
            ["Family", "Moment connections"],
            ["Role", "Controlled yielding in seismic frames"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/pr0602-rbs-beam-to-column-6bdb10adbec04453b93f380ae3a036f0",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solution/prevention-solution/earthquake/reduced-beam-sections-rbs/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View earthquake response"
          }
        },
        {
          number: 3,
          node: "Solution_03",   // empty from Blender. Leave position null to follow it
          position: null,
          label: "Megacolumn",
          title: "Composite Megacolumn",
          description: "See how the megacolumn carries the tower, or open the solution to inspect it in 3D.",
          body: [
            "The megacolumn gathers the gravity and lateral load of the whole tower into a small number of very large composite sections, which frees the floor plates above from closely spaced columns.",
            "The steel section is designed to work together with its concrete encasement, so the column stays stiff under wind and keeps a predictable reserve of strength during a seismic event."
          ],
          specs: [
            ["Family", "Composite columns"],
            ["Role", "Primary vertical load path"],
            ["Location", "Tower base"]
          ],
          sketchfab: "https://sketchfab.com/3d-models/megacolumn-b069f8b6454f482f881217c9cc0fc67d",
          provider: {
            name: "constructsteel",
            note: "Replace with the company that supplies this solution.",
            url: "https://constructsteel.org/"   // sits next to this HTML file
          },
          detailsUrl: "https://constructsteel.org/steel-solutions/disaster-solutions/prevention-solution/earthquake/",
          animation: {
            clip: "",   // animation clip name from Blender. Empty uses the placeholder
            label: "View the load path"
          }
        }
      ]
    }
  ]
};
