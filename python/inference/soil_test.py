from owslib.wcs import WebCoverageService
import rasterio
from io import BytesIO

latitude = 12.95
longitude = 80.14

wcs_url = "https://maps.isric.org/mapserv?map=/map/wv0033.map"

wcs = WebCoverageService(wcs_url, version="2.0.1")

delta = 0.001  # ~100 m

response = wcs.getCoverage(
    identifier="wv0033_15-30cm_Q0.5",

    subsets=[
        ("X", longitude - delta, longitude + delta),
        ("Y", latitude - delta, latitude + delta)
    ],

    subsettingcrs="http://www.opengis.net/def/crs/EPSG/0/4326",
    outputcrs="http://www.opengis.net/def/crs/EPSG/0/4326",

    # IMPORTANT
    resx=0.002,
    resy=0.002,

    format="GEOTIFF_INT16"
)

data = response.read()

print("Downloaded:", len(data), "bytes")

with rasterio.open(BytesIO(data)) as src:

    print("CRS:", src.crs)
    print("Size:", src.width, "x", src.height)
    print("Bounds:", src.bounds)

    values = src.read(1)

    print("Raw values:")
    print(values)

    print("Mean raw value:", values.mean())

    theta = values.mean() / 1000

    print("Theta:", theta)