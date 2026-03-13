"""
etabs-service/etabs_client.py — ETABS COM automation via win32com

This module handles ALL communication with ETABS through the COM API.
It is the only place in the entire project that imports win32com.

ETABS version: 21 (ProgID: CSI.ETABS.API.ETABSObject)
Will auto-launch ETABS if not already running.

Reference: CSI ETABS API Documentation (installed with ETABS)
"""
import os
import win32com.client


# ── Where to save the .edb file ──────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_etabs():
    """
    Connect to a running ETABS instance or launch a new one.
    Returns (EtabsObject, SapModel) tuple.
    """
    try:
        # Try connecting to already-running ETABS first
        etabs = win32com.client.GetActiveObject("CSI.ETABS.API.ETABSObject")
    except Exception:
        # Launch a new ETABS instance
        helper = win32com.client.Dispatch("CSI.ETABS.API.Helper")
        etabs = helper.CreateObjectProgID("CSI.ETABS.API.ETABSObject")
        etabs.ApplicationStart()

    sap_model = etabs.SapModel
    sap_model.InitializeNewModel()
    sap_model.File.NewBlank()
    return etabs, sap_model


def build_and_analyze(model: dict) -> dict:
    """
    Main function: takes a building model dict, creates the ETABS model,
    runs analysis, and returns results.

    This is a skeleton — each section below is a placeholder for the
    actual ETABS COM API calls. They are separated into clear steps
    so you can implement and test them one at a time.
    """
    etabs, sap = get_etabs()

    building = model["building"]
    materials = model["materials"]
    sections = model["sections"]
    loads = model["loads"]
    combos = model["loadCombinations"]

    # ── Step 1: Define Materials ──────────────────────────────
    _define_materials(sap, materials)

    # ── Step 2: Define Frame Sections ─────────────────────────
    _define_sections(sap, sections, materials)

    # ── Step 3: Create Grid and Stories ───────────────────────
    _create_grid(sap, building)

    # ── Step 4: Assign Loads ──────────────────────────────────
    _assign_loads(sap, loads)

    # ── Step 5: Define Load Combinations ──────────────────────
    _define_combinations(sap, combos)

    # ── Step 6: Run Analysis ──────────────────────────────────
    edb_path = os.path.join(OUTPUT_DIR, "model.edb")
    sap.File.Save(edb_path)
    sap.Analyze.RunAnalysis()

    # ── Step 7: Extract Results ───────────────────────────────
    results = _extract_results(sap, building)
    results["edbFilePath"] = edb_path

    return results


# ══════════════════════════════════════════════════════════════
# Helper functions — each wraps a group of ETABS COM API calls.
# These are skeleton implementations. Fill in the actual COM
# calls as you test against your ETABS installation.
# ══════════════════════════════════════════════════════════════

def _define_materials(sap, materials: dict):
    """Define concrete and steel materials in the ETABS model."""
    concrete = materials["concrete"]
    steel = materials["steel"]

    # --- Concrete ---
    # sap.PropMaterial.SetMaterial(name, material_type)
    # material_type: 2 = Concrete
    sap.PropMaterial.SetMaterial(concrete["grade"], 2)
    # Set isotropic properties (E, Poisson, thermal coeff)
    # E_concrete ≈ 5000 * sqrt(fck) MPa per IS 456
    e_concrete = 5000 * (concrete["fck"] ** 0.5)  # in MPa
    sap.PropMaterial.SetMPIsotropic(
        concrete["grade"],
        e_concrete,   # E in MPa
        0.2,          # Poisson's ratio
        0.0000099,    # Thermal coefficient
    )

    # --- Steel (rebar) ---
    # material_type: 6 = Rebar
    sap.PropMaterial.SetMaterial(steel["grade"], 6)
    sap.PropMaterial.SetMPIsotropic(
        steel["grade"],
        200000,  # E_steel = 200,000 MPa
        0.3,     # Poisson's ratio
        0.0000117,
    )


def _define_sections(sap, sections: dict, materials: dict):
    """Define beam and column frame sections."""
    mat_name = materials["concrete"]["grade"]
    col = sections["columns"]
    beam = sections["beams"]

    # Rectangular concrete column
    sap.PropFrame.SetRectangle("COL", mat_name, col["depth"], col["width"])

    # Rectangular concrete beam
    sap.PropFrame.SetRectangle("BEAM", mat_name, beam["depth"], beam["width"])

    # Slab (area section) — shell thin type
    sap.PropArea.SetShell_1(
        "SLAB", 1,  # 1 = Shell-Thin
        mat_name,
        0,           # Material angle
        sections["slabThickness"],
        sections["slabThickness"],
    )


def _create_grid(sap, building: dict):
    """
    Create the building grid (column points + stories).

    This generates a regular grid based on bayWidthsX/Y and numStoreys.
    Columns and beams are placed at every grid intersection.
    """
    bays_x = building["bayWidthsX"]
    bays_y = building["bayWidthsY"]
    num_stories = building["numStoreys"]
    story_h = building["storeyHeight"]

    # Calculate grid coordinates
    x_coords = [0.0]
    for bw in bays_x:
        x_coords.append(x_coords[-1] + bw)

    y_coords = [0.0]
    for bw in bays_y:
        y_coords.append(y_coords[-1] + bw)

    # Define stories
    story_names = []
    story_heights = []
    for i in range(num_stories):
        story_names.append(f"Story{i + 1}")
        story_heights.append(story_h)

    # TODO: Replace with actual ETABS API calls for grid/story creation
    # The exact API calls depend on the ETABS version and model type.
    # Example pattern:
    #   sap.Story.SetStories_2(...)
    #   For each (x, y) intersection at each story, place columns/beams
    #
    # For now, we use a simplified approach:
    # 1. Define stories
    # 2. Place columns at grid intersections
    # 3. Connect columns with beams at each floor level
    # 4. Add slab area at each floor

    print(f"Grid: {len(x_coords)}x{len(y_coords)} points, {num_stories} stories")
    print(f"X coords: {x_coords}")
    print(f"Y coords: {y_coords}")

    # Place columns (frame objects, vertical)
    for x in x_coords:
        for y in y_coords:
            for si in range(num_stories):
                z_bot = si * story_h
                z_top = (si + 1) * story_h
                name = f"COL_{x:.1f}_{y:.1f}_S{si+1}"
                sap.FrameObj.AddByCoord(
                    x, y, z_bot,  # Bottom point
                    x, y, z_top,  # Top point
                    name,         # Frame name (output)
                    "COL",        # Section property
                )

    # Place beams along X direction
    for y in y_coords:
        for si in range(num_stories):
            z = (si + 1) * story_h
            for xi in range(len(x_coords) - 1):
                name = f"BMX_{x_coords[xi]:.1f}_{y:.1f}_S{si+1}"
                sap.FrameObj.AddByCoord(
                    x_coords[xi], y, z,
                    x_coords[xi + 1], y, z,
                    name, "BEAM",
                )

    # Place beams along Y direction
    for x in x_coords:
        for si in range(num_stories):
            z = (si + 1) * story_h
            for yi in range(len(y_coords) - 1):
                name = f"BMY_{x:.1f}_{y_coords[yi]:.1f}_S{si+1}"
                sap.FrameObj.AddByCoord(
                    x, y_coords[yi], z,
                    x, y_coords[yi + 1], z,
                    name, "BEAM",
                )

    # Assign fixed supports at base (z = 0)
    for x in x_coords:
        for y in y_coords:
            point_name = ""  # ETABS will return the auto-assigned name
            # Get the point at base — we need to find it by coordinates
            # For simplicity, restrain all points at z=0
            pass  # TODO: sap.PointObj.SetRestraint(...)


def _assign_loads(sap, loads: dict):
    """Define load patterns and assign load values."""
    dead = loads["dead"]
    live = loads["live"]
    seismic = loads["seismic"]

    # Define load patterns
    # Pattern types: 1=Dead, 3=Live, 5=Quake
    sap.LoadPatterns.Add("DEAD", 1, 0, True)
    sap.LoadPatterns.Add("LIVE", 3, 0, False)
    sap.LoadPatterns.Add("EQX", 5, 0, False)
    sap.LoadPatterns.Add("EQY", 5, 0, False)

    # Set auto seismic load for IS 1893
    # TODO: Use sap.LoadPatterns.AutoSeismic.SetIS1893_2016(...)
    # Parameters: zone factor, soil type, importance factor, R, etc.
    print(f"Seismic: Zone {seismic['zone']}, Z={seismic['zoneFactor']}, "
          f"I={seismic['importanceFactor']}, R={seismic['responseReductionFactor']}")

    # Assign floor finish as uniform area load on slabs
    # TODO: sap.AreaObj.SetLoadUniform(area_name, "DEAD", dead["floorFinish"], ...)

    # Assign live load on floors
    # TODO: sap.AreaObj.SetLoadUniform(area_name, "LIVE", live["typical"], ...)

    print(f"Loads defined: DL floor_finish={dead['floorFinish']} kN/m², "
          f"wall={dead['wallLoad']} kN/m, "
          f"LL typical={live['typical']} kN/m², roof={live['roof']} kN/m²")


def _define_combinations(sap, combos: list):
    """Create load combinations from the LLM-generated list."""
    for combo in combos:
        name = combo["name"]
        factors = combo["factors"]

        # CType: 0 = Linear Add
        sap.RespCombo.Add(name, 0)

        # Add each load case to the combination
        # CNameType: 0 = LoadCase
        if factors.get("dead"):
            sap.RespCombo.SetCaseList(name, 0, "DEAD", factors["dead"])
        if factors.get("live"):
            sap.RespCombo.SetCaseList(name, 0, "LIVE", factors["live"])
        if factors.get("eqx"):
            sap.RespCombo.SetCaseList(name, 0, "EQX", factors["eqx"])
        if factors.get("eqy"):
            sap.RespCombo.SetCaseList(name, 0, "EQY", factors["eqy"])

    print(f"Defined {len(combos)} load combinations")


def _extract_results(sap, building: dict) -> dict:
    """
    Extract analysis results from the ETABS model.

    Returns a dict matching the AnalysisResult schema on the backend.
    """
    num_stories = building["numStoreys"]

    # Set up results for extraction
    sap.Results.Setup.DeselectAllCasesAndCombosForOutput()
    sap.Results.Setup.SetCaseSelectedForOutput("DEAD")
    sap.Results.Setup.SetCaseSelectedForOutput("LIVE")

    # TODO: Extract actual results using:
    #   sap.Results.StoryDrifts(...)
    #   sap.Results.BaseReact(...)
    #   sap.Results.FrameForce(...)
    #
    # For now, return placeholder structure so the pipeline works end-to-end.
    # Replace these with real COM API calls once you test with ETABS.

    story_drifts = []
    for i in range(num_stories):
        story_drifts.append({
            "story": f"Story{i + 1}",
            "driftX": 0.0,  # TODO: real drift values
            "driftY": 0.0,
        })

    return {
        "storyDrifts": story_drifts,
        "baseShear": {"x": 0.0, "y": 0.0},     # TODO: real base shear
        "maxBendingMoment": 0.0,                  # TODO: real max moment
        "maxReaction": 0.0,                        # TODO: real max reaction
    }
