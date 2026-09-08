# YA_KUB — strona

## Struktura projektu
```
index.html                     ← strona główna
prywatnosc.html                ← polityka prywatności
assets/shark-logo.png          ← logo (rekin)
assets/wordmark.jpg            ← logo tekstowe "Ya_kub"
netlify.toml                   ← konfiguracja Netlify
netlify/functions/youtube.js   ← pobiera 3 najnowsze filmy z YouTube
netlify/functions/kick.js      ← sprawdza status live na Kicku
netlify/functions/chat.js      ← chatbot AI (Claude) odpowiadający na pytania widzów
```

## Wdrożenie na Netlify (przez GitHub)
1. Wrzuć całą tę zawartość do repozytorium na GitHubie.
2. W Netlify: **Add new site → Import an existing project** → wskaż repozytorium.
3. Build command: zostaw puste. Publish directory: `.` (już ustawione w `netlify.toml`).
4. Po pierwszym deployu wejdź w **Site settings → Environment variables** i dodaj zmienne opisane niżej.
5. Zrób redeploy (Netlify → Deploys → Trigger deploy), żeby funkcje zobaczyły nowe zmienne.

## Konfiguracja YouTube (wymagana, żeby filmy ładowały się automatycznie)
1. Wejdź na [console.cloud.google.com](https://console.cloud.google.com), utwórz projekt.
2. Włącz **YouTube Data API v3** (APIs & Services → Library).
3. Utwórz klucz API (APIs & Services → Credentials → Create credentials → API key).
4. W Netlify dodaj zmienną środowiskową:
   - `YOUTUBE_API_KEY` = twój klucz
   - `YOUTUBE_HANDLE` = `ya_kubb` (opcjonalnie, to już wartość domyślna)

Limit darmowy YouTube Data API to 10 000 jednostek dziennie — jedno odświeżenie strony kosztuje ok. 3 jednostki, więc wystarczy z dużym zapasem nawet przy dużym ruchu (dane są też cache'owane na 10 minut po stronie funkcji).

## Konfiguracja Kick (opcjonalna)
Domyślnie funkcja sprawdza kanał `ya-kub`. Jeśli chcesz to zmienić, dodaj w Netlify:
- `KICK_SLUG` = nazwa kanału z adresu `kick.com/<tutaj>`

**Ważne ograniczenie:** Kick nie ma prostego, oficjalnego publicznego API do sprawdzania statusu live z kluczem. Funkcja `kick.js` korzysta z wewnętrznego, nieoficjalnego endpointu Kicka — zwykle działa, ale bywa chroniony przez Cloudflare i może się czasem zmienić bez zapowiedzi. Gdy zawiedzie, strona nie wywali się — pokaże po prostu "Status niedostępny — sprawdź bezpośrednio na Kicku". Docelowo najbardziej stabilnym rozwiązaniem długoterminowo jest oficjalne [Kick OAuth API](https://developer.kick.com) (wymaga rejestracji aplikacji).

## Konfiguracja chatbota AI (wymagana, żeby czat odpowiadał)
Chatbot (bąbelek w prawym dolnym rogu strony) korzysta z Claude API (Anthropic) — konkretnie z modelu Haiku 4.5, najtańszego i najszybszego dostępnego modelu, idealnego do prostych odpowiedzi FAQ.

1. Wejdź na [console.anthropic.com](https://console.anthropic.com) i załóż konto (lub zaloguj się).
2. Doładuj konto niewielką kwotą (Billing → Add credits) — Haiku kosztuje ok. 1$ za milion tokenów wejścia i 5$ za milion wyjścia, więc nawet przy sporym ruchu koszt to zwykle pojedyncze dolary miesięcznie.
3. Menu boczne → **API Keys** → **Create Key** → skopiuj klucz (zaczyna się od `sk-ant-...`).
4. W Netlify dodaj zmienną środowiskową:
   - `ANTHROPIC_API_KEY` = twój klucz (zaznacz "Contains secret values")
5. Zrób redeploy.

Wiedza bota o kanale (linki, sekcje strony, partner CaseHug) jest na sztywno wpisana w pliku `netlify/functions/chat.js` w stałej `SYSTEM_PROMPT` — jeśli coś się zmieni (np. nowy link, nowy partner), edytuj tam.

## Testowanie lokalne
Do lokalnego testowania funkcji Netlify potrzebny jest [Netlify CLI](https://docs.netlify.com/cli/get-started/):
```
npm install -g netlify-cli
netlify dev
```
To uruchomi stronę razem z funkcjami pod adresem lokalnym (zwykle `localhost:8888`).
