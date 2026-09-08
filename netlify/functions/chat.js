// Funkcja serwerowa Netlify: chatbot AI (Claude / Anthropic) odpowiadający
// na pytania widzów o YA_KUB, kanał, social media i nawigację po stronie.
//
// KONFIGURACJA (Netlify → Site settings → Environment variables):
//   ANTHROPIC_API_KEY — klucz API z console.anthropic.com (zaznacz "Contains secret values")
//
// Jak zdobyć klucz:
//   1. Wejdź na console.anthropic.com i załóż konto (lub zaloguj się)
//   2. Menu → "API Keys" → "Create Key"
//   3. Skopiuj klucz i wklej go w Netlify jako ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `Jesteś pomocnym asystentem na stronie internetowej streamera/YouTubera o pseudonimie YA_KUB.
Odpowiadasz WYŁĄCZNIE po polsku, krótko i przyjaźnie (maksymalnie 2-4 zdania), jak ktoś pomagający widzom w czacie.

Oto co powinieneś wiedzieć o YA_KUB i jego stronie:

- Kick (główna platforma streamingowa): https://kick.com/ya-kub — tam odbywają się transmisje na żywo (głównie Counter-Strike 2)
- YouTube: https://youtube.com/@ya_kubb — filmy i vlogi
- Instagram: https://www.instagram.com/ya_kuuub
- TikTok: https://www.tiktok.com/@ya_kuub
- Discord: https://discord.gg/vAHj8Z5WWD — społeczność, zapowiedzi streamów, kontakt
- Tipply (donejty): https://tipply.pl/@ya_kub
- Partner: CaseHug (https://casehug.com/r/YA_KUB) — z kodem YA_KUB można odebrać bonus (+20% przy doładowaniu, 1$ dla nowych)

Struktura strony (sekcje, do których można kierować widzów):
- "Filmy" — ostatnie filmy z YouTube
- "Live" / "Kick" — status transmisji na żywo
- "Partner" — sekcja CaseHug z kodem promocyjnym
- "Wsparcie" — Tipply, Discord i linki do wszystkich social mediów

Zasady:
- Jeśli ktoś pyta o coś, czego nie wiesz (np. prywatne informacje, harmonogram streamów, wiek, itp.) — powiedz szczerze że nie masz tej informacji i zaproponuj sprawdzenie Discorda lub bezpośrednio streama na Kicku.
- Nie wymyślaj faktów, których nie ma powyżej.
- Nie udzielaj porad niezwiązanych ze stroną/kanałem (nie jesteś ogólnym asystentem AI, tylko pomocnikiem na tej konkretnej stronie).
- Możesz podawać linki z listy powyżej, gdy są pomocne.`;

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metoda niedozwolona.' }) };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Brak ANTHROPIC_API_KEY w zmiennych środowiskowych Netlify.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nieprawidłowe dane wejściowe.' }) };
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  // Ograniczenie: maksymalnie ostatnie 12 wiadomości, żeby nie zużywać zbyt wielu tokenów
  const trimmedMessages = messages.slice(-12).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  if (!trimmedMessages.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak wiadomości.' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Błąd API Anthropic.' }),
      };
    }

    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Nie udało się połączyć z API.', details: String(err) }),
    };
  }
};
