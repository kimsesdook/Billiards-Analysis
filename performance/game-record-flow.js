import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const PROFILE = __ENV.K6_PROFILE || 'load';
const TARGET_VUS = positiveInteger(__ENV.K6_TARGET_VUS || '10', 'K6_TARGET_VUS');

const businessErrors = new Rate('business_errors');
const gameRecordFlowDuration = new Trend('game_record_flow_duration', true);

const profileConfigurations = {
  smoke: {
    executor: 'per-vu-iterations',
    vus: 2,
    iterations: 2,
    maxDuration: '45s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: __ENV.K6_RAMP_UP || '15s', target: TARGET_VUS },
      { duration: __ENV.K6_STEADY || '30s', target: TARGET_VUS },
      { duration: __ENV.K6_RAMP_DOWN || '15s', target: 0 },
    ],
    gracefulRampDown: '5s',
  },
};

if (!profileConfigurations[PROFILE]) {
  throw new Error(`Unsupported K6_PROFILE: ${PROFILE}. Use smoke or load.`);
}

export const options = {
  scenarios: {
    game_record_flow: profileConfigurations[PROFILE],
  },
  thresholds: {
    checks: ['rate>0.99'],
    business_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:auth}': ['p(95)<2000'],
    'http_req_duration{endpoint:game-write}': ['p(95)<800'],
    'http_req_duration{endpoint:game-read}': ['p(95)<500'],
    game_record_flow_duration: ['p(95)<1500'],
  },
};

let identity;
let registered = false;
let accessToken;

export function setup() {
  return {
    runId: `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
  };
}

export default function (data) {
  if (!ensureSession(data.runId)) {
    sleep(1);
    return;
  }

  const flowStartedAt = Date.now();
  const iteration = exec.scenario.iterationInTest;
  const recordResponse = http.post(
    `${BASE_URL}/api/game-records`,
    JSON.stringify({
      date: new Date(Date.now() - iteration * 1000).toISOString(),
      type: '3-Cushion',
      mode: 'Individual',
      myScore: 15 + (iteration % 5),
      opponentScore: 12,
      innings: 18,
      highRun: 4,
      playerCount: 2,
      notes: 'k6 performance test data',
      opponentName: `LoadOpponent-${exec.vu.idInTest}`,
    }),
    authenticatedParams('game-write'),
  );

  const recordCreated = expectApiSuccess(recordResponse, 201, 'game record create');
  const recordHasId = check(recordResponse, {
    'created game record has an id': (response) =>
      response.status === 201 && Number(readJson(response, 'data.id')) > 0,
  });
  businessErrors.add(!(recordCreated && recordHasId), { endpoint: 'game-write' });

  const responses = http.batch([
    ['GET', `${BASE_URL}/api/game-records/search?type=3-Cushion&page=0&size=20`, null, authenticatedParams('game-read')],
    ['GET', `${BASE_URL}/api/game-records/statistics?type=3-Cushion&recentGameCount=10`, null, authenticatedParams('game-read')],
    ['GET', `${BASE_URL}/api/game-records/weekly-report?type=3-Cushion`, null, authenticatedParams('game-read')],
  ]);

  const searchSucceeded = expectApiSuccess(responses[0], 200, 'game record search');
  const statisticsSucceeded = expectApiSuccess(responses[1], 200, 'game statistics');
  const weeklyReportSucceeded = expectApiSuccess(responses[2], 200, 'weekly game report');
  businessErrors.add(
    !(searchSucceeded && statisticsSucceeded && weeklyReportSucceeded),
    { endpoint: 'game-read' },
  );

  gameRecordFlowDuration.add(Date.now() - flowStartedAt, { profile: PROFILE });
  sleep(0.5);
}

function ensureSession(runId) {
  if (accessToken) {
    return true;
  }

  if (!identity) {
    const vuId = exec.vu.idInTest;
    identity = {
      email: `k6-${runId}-${vuId}@example.com`,
      password: 'k6-load-password',
      nickname: `k6-vu-${vuId}-${runId.slice(-6)}`,
    };
  }

  if (!registered) {
    const signUpResponse = http.post(
      `${BASE_URL}/api/auth/signup`,
      JSON.stringify(identity),
      jsonParams('auth'),
    );
    registered = expectApiSuccess(signUpResponse, 201, 'signup');
    businessErrors.add(!registered, { endpoint: 'auth' });
    if (!registered) {
      return false;
    }
  }

  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: identity.email,
      password: identity.password,
    }),
    jsonParams('auth'),
  );
  const loginSucceeded = expectApiSuccess(loginResponse, 200, 'login');
  accessToken = loginSucceeded ? readJson(loginResponse, 'data.accessToken') : null;
  const tokenIssued = check(loginResponse, {
    'login issues an access token': () =>
      typeof accessToken === 'string' && accessToken.length > 0,
  });
  businessErrors.add(!(loginSucceeded && tokenIssued), { endpoint: 'auth' });

  return Boolean(accessToken);
}

function expectApiSuccess(response, expectedStatus, label) {
  return check(response, {
    [`${label} returns ${expectedStatus}`]: (result) => result.status === expectedStatus,
    [`${label} returns a successful API envelope`]: (result) =>
      result.status === expectedStatus && readJson(result, 'success') === true,
  });
}

function readJson(response, selector) {
  try {
    return response.json(selector);
  } catch (_error) {
    return null;
  }
}

function jsonParams(endpoint) {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint },
    timeout: '5s',
  };
}

function authenticatedParams(endpoint) {
  const params = jsonParams(endpoint);
  params.headers.Authorization = `Bearer ${accessToken}`;
  return params;
}

function positiveInteger(rawValue, variableName) {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${variableName} must be a positive integer.`);
  }
  return value;
}
