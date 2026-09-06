// Funkcja serwerowa Netlify: sprawdza, czy kanał Kick jest aktualnie na żywo.
//
// KONFIGURACJA (opcjonalna, Netlify → Site settings → Environment variables):
//   KICK_SLUG — nazwa kanału z adresu kick.com/<slug>, domyślnie "ya-kub"
//
// UWAGA — ważne ograniczenie:
// Kick nie udostępnia oficjalnego, publicznego API z kluczem dla developerów
// zewnętrznych do prostego sprawdzania statusu live. Poniższa funkcja korzysta
// z nieoficjalnego, wewnętrznego endpointu Kicka (kick.com/api/v2/channels/...),
// który bywa chroniony przez Cloudflare i może:
//   - czasami zwracać błąd/403 z serwerów Netlify (inny "odcisk" niż przeglądarka),
//   - zmienić się bez zapowiedzi, bo to nie jest publiczne, wspierane API.
// Jeśli przestanie działać, front-end i tak pokaże grzeczny komunikat
// "Status niedostępny — sprawdź bezpośrednio na Kicku" zamiast się wywalić.
// Docelowo najbardziej stabilnym rozwiązaniem jest oficjalne Kick OAuth API
// (developer.kick.com) — wymaga rejestracji aplikacji i tokenów.

exports.handler = async function () {
  const SLUG = process.env.KICK_SLUG || 'ya-kub';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=30',
  };

  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${SLUG}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Kick API zwróciło status ${res.status}`);

    const data = await res.json();
    const live = data.livestream || null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isLive: !!live,
        title: live ? live.session_title : null,
        viewers: live ? live.viewer_count : null,
        thumbnail: live && live.thumbnail ? live.thumbnail.url : null,
      }),
    };
  } catch (err) {
    // Zwracamy 200 z isLive:false zamiast błędu 500 — front-end i tak
    // obsłuży to bez straszenia usera; szczegóły trafiają do logów funkcji.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ isLive: false, error: true, details: String(err) }),
    };
  }
};
