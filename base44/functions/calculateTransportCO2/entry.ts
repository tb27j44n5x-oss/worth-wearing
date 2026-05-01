import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Transport CO2 Calculator
 * Estimates product lifecycle transport emissions based on manufacturing location and shipping mode
 */

const COUNTRY_COORDINATES = {
  // Major manufacturing regions
  'Vietnam': { lat: 16.0, lng: 106.0 },
  'China': { lat: 35.0, lng: 105.0 },
  'India': { lat: 20.0, lng: 78.0 },
  'Bangladesh': { lat: 23.5, lng: 90.0 },
  'Indonesia': { lat: -2.0, lng: 113.0 },
  'Cambodia': { lat: 12.0, lng: 105.0 },
  'Pakistan': { lat: 30.0, lng: 69.0 },
  'Thailand': { lat: 15.0, lng: 101.0 },
  'Portugal': { lat: 39.5, lng: -8.0 },
  'Poland': { lat: 51.0, lng: 20.0 },
  'Turkey': { lat: 38.0, lng: 35.0 },
  'Ethiopia': { lat: 9.0, lng: 40.0 },
  'Myanmar': { lat: 22.0, lng: 97.0 },
  'Mexico': { lat: 23.0, lng: -102.0 },
  'Brazil': { lat: -10.0, lng: -55.0 },
  'Norway': { lat: 60.0, lng: 10.0 },
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { manufacturing_countries, shipping_mode = 'sea', product_weight_kg = 0.5, user_country = 'Norway' } = await req.json();

  if (!manufacturing_countries || !Array.isArray(manufacturing_countries) || manufacturing_countries.length === 0) {
    return Response.json({ error: 'manufacturing_countries array required' }, { status: 400 });
  }

  const userCoords = COUNTRY_COORDINATES[user_country] || COUNTRY_COORDINATES['Norway'];

  // CO2 emissions factors (kg CO2 per ton-km)
  const emissionFactors = {
    air: 0.255, // ~255g CO2/kg
    sea: 0.01,  // ~10g CO2/kg (much lower)
    rail: 0.025,
    truck: 0.06,
  };

  const results = manufacturing_countries.map(country => {
    const coords = COUNTRY_COORDINATES[country] || { lat: 0, lng: 0 };
    const distance = haversineDistance(coords.lat, coords.lng, userCoords.lat, userCoords.lng);
    
    // Calculate for both sea and air to show range
    const seaCO2 = (product_weight_kg / 1000) * distance * emissionFactors.sea;
    const airCO2 = (product_weight_kg / 1000) * distance * emissionFactors.air;

    return {
      manufacturing_country: country,
      distance_km: Math.round(distance),
      product_weight_kg,
      sea_shipping_co2_kg: parseFloat(seaCO2.toFixed(3)),
      air_shipping_co2_kg: parseFloat(airCO2.toFixed(3)),
      sea_shipping_co2_grams: Math.round(seaCO2 * 1000),
      air_shipping_co2_grams: Math.round(airCO2 * 1000),
      best_case: `Sea shipping: ${Math.round(seaCO2 * 1000)}g CO2`,
      worst_case: `Air shipping: ${Math.round(airCO2 * 1000)}g CO2`
    };
  });

  // Calculate total range across all manufacturing countries
  const totalSeaCO2 = results.reduce((sum, r) => sum + r.sea_shipping_co2_kg, 0);
  const totalAirCO2 = results.reduce((sum, r) => sum + r.air_shipping_co2_kg, 0);

  return Response.json({
    success: true,
    summary: {
      manufacturing_countries,
      user_country,
      co2_range: {
        sea_shipping_kg: parseFloat(totalSeaCO2.toFixed(3)),
        air_shipping_kg: parseFloat(totalAirCO2.toFixed(3)),
        likely_estimate_kg: parseFloat(((totalSeaCO2 + totalAirCO2) / 2).toFixed(3)),
        note: 'Most brands use sea shipping (lower CO2). Air shipping shown for worst-case scenario.'
      },
      details: results
    }
  });
});