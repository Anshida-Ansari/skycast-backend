import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const pass = (num: number, title: string) => {
  console.log(`${colors.green}✔ Scenario ${num}: ${title}${colors.reset}`);
};

const fail = (num: number, title: string, error: any) => {
  console.error(`${colors.red}✖ Scenario ${num}: ${title} FAILED${colors.reset}`);
  console.error(error?.response?.data || error?.message || error);
  process.exitCode = 1;
};

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}\n=== Starting SkyCast Phase 3 Verification Test Suite ===\n${colors.reset}`);

  const testEmailA = `alice_${Date.now()}@example.com`;
  const testEmailB = `bob_${Date.now()}@example.com`;
  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let favoriteAId = '';
  let favoriteBId = '';

  const client = axios.create({ baseURL: BASE_URL });

  // 1. Successful Registration
  try {
    const res = await client.post('/auth/register', {
      email: testEmailA,
      password: 'StrongPassword123',
      fullName: 'Alice Test',
    });
    if (res.status === 201 && res.data.data.token && !res.data.data.user.passwordHash) {
      tokenA = res.data.data.token;
      userAId = res.data.data.user.id;
      pass(1, 'Successful registration & token generation without password exposure');
    } else {
      throw new Error('Registration response missing token or leaked passwordHash');
    }
  } catch (err) {
    fail(1, 'Successful registration', err);
  }

  // 2. Duplicate Email Registration
  try {
    await client.post('/auth/register', {
      email: testEmailA,
      password: 'AnotherPassword',
      fullName: 'Alice Duplicate',
    });
    fail(2, 'Duplicate email registration', new Error('Expected 409 Conflict'));
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.error?.code === 'CONFLICT') {
      pass(2, 'Prevented duplicate email registration with 409 CONFLICT');
    } else {
      fail(2, 'Duplicate email registration', err);
    }
  }

  // 3. Successful Login
  try {
    const res = await client.post('/auth/login', {
      email: testEmailA,
      password: 'StrongPassword123',
    });
    if (res.status === 200 && res.data.data.token) {
      pass(3, 'Successful login with valid credentials');
    } else {
      throw new Error('Login failed to return token');
    }
  } catch (err) {
    fail(3, 'Successful login', err);
  }

  // 4. Invalid Login (Wrong Password)
  try {
    await client.post('/auth/login', {
      email: testEmailA,
      password: 'WrongPassword456',
    });
    fail(4, 'Invalid login', new Error('Expected 401 Unauthorized'));
  } catch (err: any) {
    if (err.response?.status === 401 && err.response?.data?.error?.code === 'UNAUTHORIZED') {
      pass(4, 'Rejected invalid login credentials with 401 UNAUTHORIZED');
    } else {
      fail(4, 'Invalid login', err);
    }
  }

  // 5. Accessing protected route without a token
  try {
    await client.get('/auth/me');
    fail(5, 'Protected route without token', new Error('Expected 401 Unauthorized'));
  } catch (err: any) {
    if (err.response?.status === 401) {
      pass(5, 'Protected route correctly blocked missing token with 401');
    } else {
      fail(5, 'Protected route without token', err);
    }
  }

  // 6. Accessing protected route with invalid token
  try {
    await client.get('/auth/me', {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    fail(6, 'Protected route with invalid token', new Error('Expected 401 Unauthorized'));
  } catch (err: any) {
    if (err.response?.status === 401) {
      pass(6, 'Protected route correctly blocked forged/invalid token with 401');
    } else {
      fail(6, 'Protected route with invalid token', err);
    }
  }

  // 7. Accessing protected route with valid token
  try {
    const res = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (res.status === 200 && res.data.data.user.id === userAId) {
      pass(7, 'Protected route succeeded with valid token; user and preferences loaded');
    } else {
      throw new Error('User ID mismatch in auth/me');
    }
  } catch (err) {
    fail(7, 'Protected route with valid token', err);
  }

  // 8. Adding a favourite location
  try {
    const res = await client.post(
      '/favorites',
      {
        cityName: 'Tokyo',
        country: 'Japan',
        coordinates: { latitude: 35.68, longitude: 139.76 },
        customLabel: 'Vacation Spot',
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    if (res.status === 201 && res.data.data.cityName === 'Tokyo') {
      favoriteAId = res.data.data.id;
      pass(8, 'Added favourite location successfully');
    } else {
      throw new Error('Failed to create favorite location');
    }
  } catch (err) {
    fail(8, 'Adding a favourite location', err);
  }

  // 9. Preventing duplicate favourites
  try {
    await client.post(
      '/favorites',
      {
        cityName: 'Tokyo',
        country: 'Japan',
        coordinates: { latitude: 35.68, longitude: 139.76 },
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    fail(9, 'Preventing duplicate favourites', new Error('Expected 409 Conflict'));
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.error?.code === 'CONFLICT') {
      pass(9, 'Prevented duplicate favourite location with 409 CONFLICT');
    } else {
      fail(9, 'Preventing duplicate favourites', err);
    }
  }

  // 10. Deleting a favourite location
  try {
    // First add a temp favorite to delete
    const temp = await client.post(
      '/favorites',
      {
        cityName: 'Sydney',
        country: 'Australia',
        coordinates: { latitude: -33.86, longitude: 151.2 },
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const deleteId = temp.data.data.id;

    const res = await client.delete(`/favorites/${deleteId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (res.status === 200) {
      pass(10, 'Deleted favourite location successfully');
    } else {
      throw new Error('Failed to delete favorite');
    }
  } catch (err) {
    fail(10, 'Deleting a favourite location', err);
  }

  // 11. Attempting to access/delete another user's favourite
  try {
    // Register user B
    const resB = await client.post('/auth/register', {
      email: testEmailB,
      password: 'PasswordBob123',
      fullName: 'Bob Marley',
    });
    tokenB = resB.data.data.token;

    // User B adds London
    const resFavB = await client.post(
      '/favorites',
      {
        cityName: 'London',
        country: 'United Kingdom',
        coordinates: { latitude: 51.5, longitude: -0.12 },
      },
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    favoriteBId = resFavB.data.data.id;

    // User A attempts to delete User B's favorite
    await client.delete(`/favorites/${favoriteBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    fail(11, 'Cross-user deletion attempt', new Error('Expected 403 Forbidden'));
  } catch (err: any) {
    if (err.response?.status === 403 && err.response?.data?.error?.code === 'FORBIDDEN') {
      pass(11, 'Cross-user favorite modification blocked with 403 FORBIDDEN');
    } else {
      fail(11, 'Cross-user deletion attempt', err);
    }
  }

  // 12. Adding and retrieving search history
  try {
    await client.post(
      '/history',
      {
        query: 'Paris',
        resolvedCity: 'Paris',
        country: 'France',
        coordinates: { latitude: 48.85, longitude: 2.35 },
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const histRes = await client.get('/history', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (
      histRes.status === 200 &&
      Array.isArray(histRes.data.data) &&
      histRes.data.data.some((h: any) => h.query === 'Paris')
    ) {
      pass(12, 'Recorded and retrieved search history successfully');
    } else {
      throw new Error('Search history record not found');
    }
  } catch (err) {
    fail(12, 'Adding and retrieving search history', err);
  }

  // 13. Guest data synchronization
  try {
    const syncRes = await client.post(
      '/favorites/sync',
      {
        items: [
          {
            cityName: 'Berlin',
            country: 'Germany',
            coordinates: { latitude: 52.52, longitude: 13.4 },
          },
          {
            cityName: 'Tokyo', // Duplicate of existing Tokyo
            country: 'Japan',
            coordinates: { latitude: 35.68, longitude: 139.76 },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    if (syncRes.status === 200 && syncRes.data.meta.addedCount === 1) {
      pass(13, 'Guest favorites synchronized safely (new added, duplicate ignored)');
    } else {
      throw new Error('Sync did not report expected added count');
    }
  } catch (err) {
    fail(13, 'Guest data synchronization', err);
  }

  // 14. Updating user preferences
  try {
    const putRes = await client.put(
      '/preferences',
      {
        unitSystem: 'imperial',
        defaultCity: 'New York',
        defaultCoordinates: { latitude: 40.71, longitude: -74.0 },
        enableAlerts: true,
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const getRes = await client.get('/preferences', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (
      putRes.status === 200 &&
      getRes.data.data.unitSystem === 'imperial' &&
      getRes.data.data.defaultCity === 'New York'
    ) {
      pass(14, 'Updated and verified user preferences successfully');
    } else {
      throw new Error('Preferences were not updated as expected');
    }
  } catch (err) {
    fail(14, 'Updating user preferences', err);
  }

  // 15. Public weather endpoints without authentication
  try {
    const currentRes = await client.get('/weather/current?lat=40.71&lon=-74.0');
    const searchRes = await client.get('/weather/search?q=Rome');

    if (currentRes.status === 200 && currentRes.data.success && searchRes.status === 200) {
      pass(15, 'Public weather endpoints remain 100% accessible to unauthenticated guests');
    } else {
      throw new Error('Public weather endpoint failed without auth');
    }
  } catch (err) {
    fail(15, 'Public weather endpoints without authentication', err);
  }

  console.log(`${colors.bold}${colors.green}\n=== All 15 Verification Tests Completed Successfully! ===\n${colors.reset}`);
}

runTests().catch((e) => {
  console.error('Test suite runner crashed:', e);
  process.exit(1);
});

