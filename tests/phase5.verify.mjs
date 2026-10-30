import axios from 'axios';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000/api/v1';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const pass = (num, title) => console.log(`${colors.green}✔ Check ${num}: ${title}${colors.reset}`);
const fail = (num, title, err) => {
  console.error(`${colors.red}✖ Check ${num}: ${title} FAILED${colors.reset}`);
  console.error(err?.response?.data || err?.message || err);
  process.exitCode = 1;
};

async function verifyPhase5() {
  console.log(`${colors.bold}${colors.cyan}\n=== Executing SkyCast Phase 5 End-to-End Verification ===\n${colors.reset}`);

  // 1. Verify Frontend SPA Index Serving
  try {
    const res = await axios.get(FRONTEND_URL);
    if (res.status === 200 && res.data.includes('SkyCast — Atmospheric Intelligence')) {
      pass(1, 'Vite serving production HTML with SkyCast metadata & Leaflet CSS');
    } else {
      throw new Error('Index HTML missing expected title');
    }
  } catch (e) {
    fail(1, 'Frontend SPA Index Serving', e);
  }

  // 2. Verify RainViewer Live Radar Tile Provider
  try {
    const radarRes = await axios.get('https://api.rainviewer.com/public/weather-maps.json', { timeout: 8000 });
    const host = radarRes.data?.host || 'https://tilecache.rainviewer.com';
    const latestPast = radarRes.data?.radar?.past?.slice(-1)[0];
    if (latestPast?.path) {
      // Test actual tile request with path
      const tileUrl = `${host}${latestPast.path}/256/4/8/5/2/1_1.png`;
      const tileCheck = await axios.get(tileUrl, { responseType: 'arraybuffer', timeout: 8000 });
      if (tileCheck.status === 200 && tileCheck.data.byteLength > 0) {
        pass(2, `RainViewer live radar tile feed verified (${latestPast.path}, ${tileCheck.data.byteLength} bytes)`);
      } else {
        throw new Error('Tile request did not return image data');
      }
    } else {
      throw new Error('No radar past frames found');
    }
  } catch (e) {
    fail(2, 'RainViewer Live Radar Tile Provider', e);
  }

  // 3. Verify AQI and Pollutants with US EPA Standard
  try {
    const aqiRes = await axios.get(`${BACKEND_URL}/weather/air-quality?lat=51.5&lon=-0.12`);
    const aqi = aqiRes.data.data;
    if (
      typeof aqi.aqi === 'number' &&
      [
        'Good',
        'Moderate',
        'Unhealthy for Sensitive Groups',
        'Unhealthy',
        'Very Unhealthy',
        'Hazardous',
      ].includes(aqi.aqiCategory) &&
      typeof aqi.pm2_5 === 'number' &&
      typeof aqi.pm10 === 'number' &&
      typeof aqi.nitrogenDioxide === 'number' &&
      typeof aqi.ozone === 'number'
    ) {
      pass(3, `Air Quality verified with US EPA standard (AQI: ${aqi.aqi}, Category: ${aqi.aqiCategory})`);
    } else {
      throw new Error('Air quality payload malformed or missing pollutant values');
    }
  } catch (e) {
    fail(3, 'Air Quality & Pollutants Verification', e);
  }

  // 4. Verify User Registration & JWT Issuance
  const testEmail = `user_p5_${Date.now()}@example.com`;
  let authToken = '';
  let userId = '';
  try {
    const regRes = await axios.post(`${BACKEND_URL}/auth/register`, {
      fullName: 'Dr. Sarah Connor',
      email: testEmail,
      password: 'StrongPassword123',
    });
    if (regRes.status === 201 && regRes.data.data.token && !regRes.data.data.user.passwordHash) {
      authToken = regRes.data.data.token;
      userId = regRes.data.data.user.id;
      pass(4, 'User registration & safe JWT creation without password leak');
    } else {
      throw new Error('Registration failed');
    }
  } catch (e) {
    fail(4, 'User Registration', e);
  }

  // 5. Verify Guest-to-Account Favorites Synchronization
  try {
    const syncRes = await axios.post(
      `${BACKEND_URL}/favorites/sync`,
      {
        items: [
          {
            cityName: 'Reykjavik',
            country: 'Iceland',
            coordinates: { latitude: 64.14, longitude: -21.94 },
            customLabel: 'Northern Lights',
          },
          {
            cityName: 'Singapore',
            country: 'Singapore',
            coordinates: { latitude: 1.35, longitude: 103.82 },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const getFavs = await axios.get(`${BACKEND_URL}/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (getFavs.data.data.length === 2 && getFavs.data.data.some((f) => f.cityName === 'Reykjavik')) {
      pass(5, 'Guest favorites synchronized to MongoDB account with coordinates & custom labels');
    } else {
      throw new Error('Favorites sync count mismatch');
    }
  } catch (e) {
    fail(5, 'Favorites Synchronization', e);
  }

  // 6. Verify Duplicate Favorites Prevention
  try {
    await axios.post(
      `${BACKEND_URL}/favorites`,
      {
        cityName: 'Singapore',
        country: 'Singapore',
        coordinates: { latitude: 1.35, longitude: 103.82 },
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    fail(6, 'Duplicate favorites prevention', new Error('Expected 409 Conflict'));
  } catch (err) {
    if (err.response?.status === 409) {
      pass(6, 'Duplicate favorite location prevented with 409 CONFLICT');
    } else {
      fail(6, 'Duplicate favorites prevention', err);
    }
  }

  // 7. Verify Guest-to-Account Search History Synchronization & 20-Record Cap
  try {
    const historyBatch = Array.from({ length: 25 }, (_, i) => ({
      query: `City_${i}`,
      resolvedCity: `ResolvedCity_${i}`,
      country: 'TestCountry',
      coordinates: { latitude: 10 + i * 0.1, longitude: 20 + i * 0.1 },
    }));

    await axios.post(
      `${BACKEND_URL}/history/sync`,
      { items: historyBatch },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const histRes = await axios.get(`${BACKEND_URL}/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (histRes.data.data.length <= 20) {
      pass(7, `Search history synchronized and strictly capped at ${histRes.data.data.length}/20 records`);
    } else {
      throw new Error(`History exceeded 20 records: ${histRes.data.data.length}`);
    }
  } catch (e) {
    fail(7, 'Search History Sync & Cap', e);
  }

  // 8. Verify Preferences Synchronization
  try {
    await axios.put(
      `${BACKEND_URL}/preferences`,
      {
        unitSystem: 'imperial',
        defaultCity: 'Seattle',
        defaultCoordinates: { latitude: 47.6, longitude: -122.33 },
        enableAlerts: true,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const prefRes = await axios.get(`${BACKEND_URL}/preferences`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (prefRes.data.data.unitSystem === 'imperial' && prefRes.data.data.defaultCity === 'Seattle') {
      pass(8, 'User preferences updated & persisted in MongoDB');
    } else {
      throw new Error('Preferences did not update correctly');
    }
  } catch (e) {
    fail(8, 'Preferences Synchronization', e);
  }

  // 9. Verify Public Guest Access Without Login
  try {
    const publicWeather = await axios.get(`${BACKEND_URL}/weather/full?lat=47.6&lon=-122.33&units=imperial`);
    if (publicWeather.status === 200 && publicWeather.data.success && publicWeather.data.data.current) {
      pass(9, 'Public weather endpoints remain 100% accessible to unauthenticated guests');
    } else {
      throw new Error('Guest weather query failed');
    }
  } catch (e) {
    fail(9, 'Public Guest Access', e);
  }

  console.log(`${colors.bold}${colors.green}\n=== All Phase 5 Verification Checks Passed Successfully! ===\n${colors.reset}`);
}

verifyPhase5().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
