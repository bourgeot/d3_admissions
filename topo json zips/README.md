This is a d3.js visualization of US zip codes.

Original zip code dataset from Geocommons.  

5MB shapefile with properties such as zipcode, state, name, population, area, more.

http://geocommons.com/overlays/54893 (Thank you [Bill Greer](http://geocommons.com/users/Bill/overlays))

This converts it nicely:

```
topojson \
  -p name=PO_NAME \
  -p zip=ZIP \
  -p state=STATE \
  -o zips_us_topo.json \
  zip_codes_for_the_usa.shp
```