// UWAGA: po wdrożeniu na Netlify zmień poniższy adres na prawdziwy adres
// strony Markowej Wyprzedaży (np. https://markowa-wyprzedaz.netlify.app)
const ALLOWED_ORIGIN = '*';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Vary': 'Origin'
};

// Wyciąga zawartość meta-taga property="og:xxx" lub name="xxx" z surowego HTML.
function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const url = event.queryStringParameters && event.queryStringParameters.url;

  if (!url || !/^https:\/\/mobile\.selmo\.io\/product\/\d+/.test(url)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Podaj poprawny link do produktu z mobile.selmo.io/product/...' })
    };
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DodoBot/1.0)' }
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Nie udało się pobrać strony produktu.' })
      };
    }

    const html = await res.text();

    const title = extractMeta(html, 'og:title') || extractMeta(html, 'title');
    const description = extractMeta(html, 'og:description');
    const image = extractMeta(html, 'og:image');

    if (!title) {
      return {
        statusCode: 422,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Nie znaleziono danych produktu pod tym linkiem.' })
      };
    }

    // Czyścimy nazwę z dopisku "- Markowa Wyprzedaż"
    const cleanTitle = title.replace(/\s*-\s*Markowa Wyprzedaż\s*$/i, '').trim();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        title: cleanTitle,
        description: description || '',
        image: image || '',
        sourceUrl: url
      })
    };
  } catch (e) {
    console.error('Błąd fetch-product:', e);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Wystąpił błąd podczas pobierania danych produktu.' })
    };
  }
};
