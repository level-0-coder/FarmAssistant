from owslib.wcs import WebCoverageService
from io import BytesIO
import argparse
import math
import rasterio


SOILGRIDS_WCS_URL = "https://maps.isric.org/mapserv?map=/map/{}.map"
CRS_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326"

DEPTHS = (
    "0-5cm",
    "5-15cm",
    "15-30cm",
    "30-60cm",
    "60-100cm",
    "100-200cm"
)

GRID_RESOLUTION_DEGREES = 0.002


# Depth interval boundaries in cm
DEPTH_RANGES = {
    "0-5cm": (0, 5),
    "5-15cm": (5, 15),
    "15-30cm": (15, 30),
    "30-60cm": (30, 60),
    "60-100cm": (60, 100),
    "100-200cm": (100, 200),
}


def _get_mean_water_content(
    wcs,
    property_id,
    latitude,
    longitude,
    depth,
    delta
):
    response = wcs.getCoverage(
        identifier=f"{property_id}_{depth}_mean",
        subsets=[
            ("X", longitude - delta, longitude + delta),
            ("Y", latitude - delta, latitude + delta)
        ],
        subsettingcrs=CRS_4326,
        outputcrs=CRS_4326,
        resx=GRID_RESOLUTION_DEGREES,
        resy=GRID_RESOLUTION_DEGREES,
        format="GEOTIFF_INT16"
    )

    with rasterio.open(BytesIO(response.read())) as dataset:
        values = dataset.read(1, masked=True).compressed()

    # SoilGrids can contain zero values where soil data is unavailable.
    values = values[values > 0]

    if values.size == 0:
        raise ValueError(
            f"No SoilGrids data found for "
            f"{property_id} at depth {depth}."
        )

    # SoilGrids water-content values are stored in
    # thousandths of m3/m3.
    return float(values.mean() / 1000)


def get_root_zone_soil_moisture(
    latitude,
    longitude,
    Zr,
    delta=0.01
):
    """
    Fetch SoilGrids field capacity and wilting point
    for the complete crop root zone.

    Parameters
    ----------
    latitude : float
        Farm latitude.

    longitude : float
        Farm longitude.

    Zr : float
        Effective root-zone depth in meters.

    delta : float
        Spatial search radius in degrees.

    Returns
    -------
    dict
        Root-zone weighted theta_fc and theta_wp in m3/m3.
    """

    # -------------------------
    # Validate inputs
    # -------------------------

    if not -90 <= latitude <= 90:
        raise ValueError(
            "Latitude must be between -90 and 90 degrees."
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            "Longitude must be between -180 and 180 degrees."
        )

    if not math.isfinite(Zr) or Zr <= 0:
        raise ValueError(
            "Zr must be a positive finite value in meters."
        )

    if not math.isfinite(delta) or delta <= 0:
        raise ValueError(
            "delta must be a positive finite number of degrees."
        )

    root_depth_cm = Zr * 100

    # SoilGrids only goes to 200 cm in these standard layers.
    if root_depth_cm > 200:
        raise ValueError(
            "Zr cannot exceed 2.0 meters with the available "
            "SoilGrids depth layers."
        )

    # -------------------------
    # Determine required layers
    # -------------------------

    required_layers = []

    for depth in DEPTHS:
        layer_top, layer_bottom = DEPTH_RANGES[depth]

        # No overlap with root zone
        if layer_top >= root_depth_cm:
            continue

        # Portion of this layer inside root zone
        used_bottom = min(layer_bottom, root_depth_cm)
        used_depth = used_bottom - layer_top

        if used_depth > 0:
            required_layers.append(
                (depth, used_depth)
            )

    # -------------------------
    # Create WCS connections
    # -------------------------

    fc_wcs = WebCoverageService(
        SOILGRIDS_WCS_URL.format("wv0033"),
        version="2.0.1"
    )

    wp_wcs = WebCoverageService(
        SOILGRIDS_WCS_URL.format("wv1500"),
        version="2.0.1"
    )

    # -------------------------
    # Fetch and integrate FC
    # -------------------------

    fc_weighted_sum = 0.0
    wp_weighted_sum = 0.0

    for depth, used_depth in required_layers:

        theta_fc = _get_mean_water_content(
            fc_wcs,
            "wv0033",
            latitude,
            longitude,
            depth,
            delta
        )

        theta_wp = _get_mean_water_content(
            wp_wcs,
            "wv1500",
            latitude,
            longitude,
            depth,
            delta
        )

        # Weight according to how much of this layer
        # lies inside the crop root zone.
        fc_weighted_sum += theta_fc * used_depth
        wp_weighted_sum += theta_wp * used_depth

    # -------------------------
    # Root-zone weighted values
    # -------------------------

    theta_fc_root = fc_weighted_sum / root_depth_cm
    theta_wp_root = wp_weighted_sum / root_depth_cm

    return {
        "theta_fc": theta_fc_root,
        "theta_wp": theta_wp_root,
        "Zr": Zr,
        "layers_used": [
            depth for depth, _ in required_layers
        ]
    }


if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description=(
            "Fetch root-zone SoilGrids field capacity "
            "and wilting point."
        )
    )

    parser.add_argument(
        "latitude",
        type=float
    )

    parser.add_argument(
        "longitude",
        type=float
    )

    parser.add_argument(
        "Zr",
        type=float,
        help="Effective root-zone depth in meters"
    )

    args = parser.parse_args()

    soil = get_root_zone_soil_moisture(
        args.latitude,
        args.longitude,
        args.Zr
    )

    print(f"Root depth: {soil['Zr']:.2f} m")
    print(f"Layers used: {', '.join(soil['layers_used'])}")
    print(
        f"theta_FC: {soil['theta_fc']:.4f} m3/m3"
    )
    print(
        f"theta_WP: {soil['theta_wp']:.4f} m3/m3"
    )