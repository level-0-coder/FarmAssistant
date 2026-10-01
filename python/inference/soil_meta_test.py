from owslib.wcs import WebCoverageService
from io import BytesIO
import rasterio

latitude = 12.95
longitude = 80.14

wcs_url = "https://maps.isric.org/mapserv?map=/map/wv0033.map"

wcs = WebCoverageService(wcs_url, version="2.0.1")

coverage_id = "wv0033_15-30cm_Q0.5"

delta = 0.01

response = wcs.getCoverage(
    identifier=coverage_id,

    subsets=[
        ("X", longitude - delta, longitude + delta),
        ("Y", latitude - delta, latitude + delta)
    ],

    subsettingcrs="http://www.opengis.net/def/crs/EPSG/0/4326",
    outputcrs="http://www.opengis.net/def/crs/EPSG/0/4326",

    format="GEOTIFF_INT16"
)

data = response.read()

print("Downloaded:", len(data), "bytes")

with rasterio.open(BytesIO(data)) as src:

    print("CRS:", src.crs)
    print("Size:", src.width, "x", src.height)
    print("Bounds:", src.bounds)
    print("Transform:", src.transform)
    print("NoData:", src.nodata)
    print("Dtype:", src.dtypes[0])

    values = src.read(1)

    print("\nRaw values:")
    print(values)

    print("\nUnique values:")
    print(set(values.flatten()))