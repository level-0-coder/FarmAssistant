# from owslib.wcs import WebCoverageService

# wcs_url = "https://maps.isric.org/mapserv?map=/map/wv0033.map"

# wcs = WebCoverageService(wcs_url, version="2.0.1")

# # print([op.name for op in wcs.operations])

# # print(list(wcs.contents))

# # names = [k for k in wcs.contents.keys() if k.startswith("wv0033")]
# names = [k for k in wcs.contents.keys() if k.find("Q0.5") != -1]
# print(names)
# print(len(names)) 

# wv0033_0_5_med = wcs.contents['wv0033_0-5cm_Q0.5']
# # print(wv0033_0_5_med.supportedCRS)
# # print(wv0033_0_5_med.supportedFormats)
# # print(wv0033_0_5_med.boundingboxes)

# subsets = [('X', -1784000, -1140000), ('Y', 1356000, 1863000)]
# crs = "http://www.opengis.net/def/crs/EPSG/0/152160"

# response = wcs.getCoverage(
#   identifier=["wv0033_0-5cm_Q0.5"], 
#   crs=crs,
#   subsets=subsets, 
#   resx=250, resy=250, 
#   format=wv0033_0_5_med.supportedFormats[0])

# with open('./Senegal_pH_0-5_mean.tif', 'wb') as file:
#   file.write(response.read())


from owslib.wcs import WebCoverageService
import rasterio
from io import BytesIO

latitude = 12.95
longitude = 80.14

wcs_url = "https://maps.isric.org/mapserv?map=/map/wv0033.map"

wcs = WebCoverageService(wcs_url, version="2.0.1")

coverage_id = "wv0033_15-30cm_Q0.5"

delta = 0.002

response = wcs.getCoverage(
    identifier=coverage_id,

    subsets=[
        ("X", longitude - delta, longitude + delta),
        ("Y", latitude - delta, latitude + delta)
    ],

    subsettingcrs="http://www.opengis.net/def/crs/EPSG/0/4326",
    outputcrs="http://www.opengis.net/def/crs/EPSG/0/4326",

    resx=0.002,
    resy=0.002,

    format="image/tiff"
)

data = response.read()

print("Downloaded:", len(data), "bytes")

with rasterio.open(BytesIO(data)) as src:

    print("CRS:", src.crs)
    print("Size:", src.width, "x", src.height)
    print("Bounds:", src.bounds)
    print("Transform:", src.transform)
    print("NoData:", src.nodata)

    values = src.read(1)

    print("Raw values:")
    print(values)

    print("Unique values:", set(values.flatten()))
