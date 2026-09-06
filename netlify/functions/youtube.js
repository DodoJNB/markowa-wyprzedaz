// Funkcja serwerowa Netlify: pobiera 3 najnowsze filmy z kanału YouTube.
//
// KONFIGURACJA (Netlify → Site settings → Environment variables):
//   YOUTUBE_API_KEY     — klucz do YouTube Data API v3 (Google Cloud Console)
//   YOUTUBE_HANDLE       — uchwyt kanału bez "@", np. "ya_kubb" (opcjonalnie,
//                          domyślnie "ya_kubb")
//
// Jak zdobyć klucz API:
//   1. console.cloud.google.com → nowy projekt
//   2. Włącz "YouTube Data API v3"
//   3. Utwórz klucz API (Credentials → Create credentials → API key)
//   4. Wklej go jako zmienną środowiskową YOUTUBE_API_KEY w Netlify

exports.handler = async function () {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const HANDLE = process.env.YOUTUBE_HANDLE || 'ya_kubb';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=600', // cache na 10 minut, żeby nie zużywać limitu API
  };

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Brak YOUTUBE_API_KEY w zmiennych środowiskowych Netlify.' }),
    };
  }

  try {
    // 1) znajdź kanał po uchwycie (@ya_kubb) i pobierz playlistę uploadów
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(HANDLE)}&key=${API_KEY}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (!channelData.items || !channelData.items.length) {
      throw new Error('Nie znaleziono kanału o podanym uchwycie.');
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2) pobierz 3 najnowsze filmy z playlisty uploadów
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=3&playlistId=${uploadsPlaylistId}&key=${API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    const videos = (playlistData.items || []).map((item) => {
      const snippet = item.snippet;
      const videoId = snippet.resourceId.videoId;
      const thumb =
        (snippet.thumbnails.maxres && snippet.thumbnails.maxres.url) ||
        (snippet.thumbnails.high && snippet.thumbnails.high.url) ||
        (snippet.thumbnails.medium && snippet.thumbnails.medium.url) ||
        '';
      return {
        title: snippet.title,
        publishedAt: snippet.publishedAt,
        thumbnail: thumb,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify({ videos }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Nie udało się pobrać filmów z YouTube.', details: String(err) }),
    };
  }
};
