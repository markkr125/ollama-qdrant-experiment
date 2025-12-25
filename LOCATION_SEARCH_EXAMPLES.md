# Location Search Examples

## 1. Geo-Radius Search (Already Implemented)

Search within a radius of coordinates:

```javascript
// In code (already implemented in geoSearch function)
await geoSearch('tourist attractions', 40.7128, -74.0060, 50000, 5);
```

```bash
# From command line - add this feature
node index.js geo "hotels" 48.8566 2.3522 100000
```

## 2. Location Filter by City Name

```javascript
await filteredSearch('best restaurants', {
  must: [
    { key: 'location', match: { value: 'Paris' } }
  ]
}, 5);
```

## 3. Multiple Locations with OR Logic

```javascript
await filteredSearch('hotels', {
  should: [
    { key: 'location', match: { value: 'Paris' } },
    { key: 'location', match: { value: 'London' } },
    { key: 'location', match: { value: 'Tokyo' } }
  ]
}, 5);
```

## 4. Geo-Bounding Box (Polygon)

For rectangular areas:

```javascript
filter: {
  must: [{
    key: 'coordinates',
    geo_bounding_box: {
      top_left: { lat: 40.8, lon: -74.1 },
      bottom_right: { lat: 40.6, lon: -73.9 }
    }
  }]
}
```

## 5. Complex Location + Other Filters

```javascript
// Find luxury hotels in Paris under $500
await filteredSearch('luxury accommodation', {
  must: [
    { key: 'location', match: { value: 'Paris' } },
    { key: 'category', match: { value: 'hotel' } },
    { key: 'price', range: { lte: 500 } },
    { key: 'rating', range: { gte: 4.5 } }
  ]
}, 5);
```

## 6. Geo-Radius + Category

```javascript
// Find restaurants within 10km of Times Square
filter: {
  must: [
    { key: 'category', match: { value: 'restaurant' } },
    {
      key: 'coordinates',
      geo_radius: {
        center: { lat: 40.758, lon: -73.9855 },
        radius: 10000
      }
    }
  ]
}
```
