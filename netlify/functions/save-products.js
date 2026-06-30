// Ta funkcja zapisuje listę produktów wprost do pliku products.json
// w repozytorium na GitHub, dzięki czemu Netlify samo zrobi nowy deploy
// i produkty pojawią się na stronie — bez ręcznego wgrywania pliku.
//
// Wymaga trzech zmiennych środowiskowych ustawionych w Netlify
// (Site settings → Environment variables):
//   GITHUB_TOKEN      — token dostępu z uprawnieniem "Contents: Read & write"
//   GITHUB_REPO_OWNER — np. DodoJNB
//   GITHUB_REPO_NAME  — np. markowa-wyprzedaz

const ALLOWED_ORIGIN = '*';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Vary': 'Origin'
};

const FILE_PATH = 'products.json';
const BRANCH = 'main';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Metoda niedozwolona.' }) };
  }

  const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Brak konfiguracji GitHub na serwerze (zmienne środowiskowe).' })
    };
  }

  let products;
  try {
    const body = JSON.parse(event.body);
    products = body.products;
    if (!Array.isArray(products)) throw new Error('products musi być tablicą');
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Niepoprawne dane wejściowe.' }) };
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${FILE_PATH}`;
  const ghHeaders = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'markowa-wyprzedaz-admin'
  };

  try {
    // 1. Pobierz aktualny SHA pliku (GitHub wymaga tego do nadpisania pliku)
    const getRes = await fetch(`${apiBase}?ref=${BRANCH}`, { headers: ghHeaders });
    let sha = null;
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    } else if (getRes.status !== 404) {
      const errText = await getRes.text();
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Nie udało się odczytać pliku z GitHub.', detail: errText })
      };
    }

    // 2. Zakoduj nową zawartość do base64 (wymóg GitHub API)
    const content = Buffer.from(JSON.stringify(products, null, 2), 'utf-8').toString('base64');

    // 3. Wyślij commit aktualizujący plik
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Aktualizacja produktów (${products.length}) — panel admina`,
        content,
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Nie udało się zapisać pliku na GitHub.', detail: errText })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, count: products.length })
    };
  } catch (e) {
    console.error('Błąd save-products:', e);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Błąd serwera.' }) };
  }
};
