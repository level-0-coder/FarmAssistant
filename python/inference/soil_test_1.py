from owslib.wcs import WebCoverageService
from io import BytesIO
import rasterio


SOILGRIDS_WCS_URL = "https://maps.isric.org/mapserv?map=/map/{}.map"
CRS_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326"

latitude = 12.95
longitude = 80.14
delta = 0.01

wcs = WebCoverageService(
    SOILGRIDS_WCS_URL.format("wv1500"),
    version="2.0.1"
)

identifiers = [
    "wv1500_0-5cm_mean",
    "wv1500_5-15cm_mean",
    "wv1500_15-30cm_mean",
    "wv1500_30-60cm_mean",
    "wv1500_60-100cm_mean",
    "wv1500_100-200cm_mean"
]

print("Requesting:")
for identifier in identifiers:
    print(identifier)

response = wcs.getCoverage(
    identifier=identifiers,
    subsets=[
        ("X", longitude - delta, longitude + delta),
        ("Y", latitude - delta, latitude + delta)
    ],
    subsettingcrs=CRS_4326,
    outputcrs=CRS_4326,
    resx=0.002,
    resy=0.002,
    format="GEOTIFF_INT16"
)

print("\nResponse received.")

with rasterio.open(BytesIO(response.read())) as dataset:

    print("Number of bands:", dataset.count)

    for i in range(1, dataset.count + 1):

        values = dataset.read(
            i,
            masked=True
        ).compressed()

        values = values[values > 0]

        print()
        print("Identifier:", identifiers[i - 1])
        print("Band:", i)
        print("Valid pixels:", values.size)

        if values.size > 0:
            print(
                "Mean:",
                values.mean() / 1000,
                "m3/m3"
            )