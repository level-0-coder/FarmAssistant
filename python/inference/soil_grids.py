from owslib.wcs import WebCoverageService
from io import BytesIO
import argparse
import math
import rasterio


SOILGRIDS_WCS_URL = "https://maps.isric.org/mapserv?map=/map/{}.map"
CRS_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326"
DEPTHS = ("0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm")
GRID_RESOLUTION_DEGREES = 0.002


def _get_mean_water_content(property_id, latitude, longitude, depth, delta):
    wcs_url = SOILGRIDS_WCS_URL.format(property_id)
    wcs = WebCoverageService(
        wcs_url,
        version="2.0.1"
    )

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

    # These WCS layers can encode areas without soil data as unmasked zeroes.
    values = values[values > 0]
    if values.size == 0:
        raise ValueError(f"No SoilGrids data found for {property_id} at this location.")

    # SoilGrids water-content rasters store values in thousandths of m3/m3.
    return float(values.mean() / 1000)


def get_soil_moisture(latitude, longitude, depth="0-5cm", delta=0.01):
    """Return nearby valid-cell estimates for field capacity and wilting point, in m3/m3."""
    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90 degrees.")
    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180 degrees.")
    if depth not in DEPTHS:
        raise ValueError(f"Unsupported depth {depth!r}; choose one of: {', '.join(DEPTHS)}.")
    if not math.isfinite(delta) or delta <= 0:
        raise ValueError("delta must be a positive, finite number of degrees.")

    return {
        "theta_fc": _get_mean_water_content("wv0033", latitude, longitude, depth, delta),
        "theta_wp": _get_mean_water_content("wv1500", latitude, longitude, depth, delta),
    }


def get_theta_fc(latitude, longitude, depth="0-5cm"):
    """Get nearby valid-cell field-capacity water content (theta_FC), in m3/m3."""
    return _get_mean_water_content("wv0033", latitude, longitude, depth, 0.002)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch SoilGrids field capacity and wilting point for a location."
    )
    parser.add_argument("latitude", type=float, help="Latitude in decimal degrees")
    parser.add_argument("longitude", type=float, help="Longitude in decimal degrees")
    parser.add_argument("--depth", choices=DEPTHS, default="0-5cm")
    args = parser.parse_args()

    moisture = get_soil_moisture(args.latitude, args.longitude, args.depth)
    print(f"Depth: {args.depth}")
    print("Values are averaged from nearby nonzero SoilGrids cells.")
    print(f"theta_FC (33 kPa):   {moisture['theta_fc']:.4f} m3/m3")
    print(f"theta_WP (1500 kPa): {moisture['theta_wp']:.4f} m3/m3")