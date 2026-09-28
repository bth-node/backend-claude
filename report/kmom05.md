# kmom05

Det här kmomet handlade om att gå från en hårdkodad array i minnet till en riktig databas, och
sedan bygga hela autentiseringskedjan ovanpå den — registrering, inloggning, utloggning och en
skyddad route. Till skillnad från kmom04, där jag mest kopplade ihop redan befintlig frontend mot
nya endpoints, kändes det här kmomet som att varje issue byggde direkt vidare på den förra: utan
`User`-modellen fungerar inte registreringen, utan registrering fungerar inte inloggningen, och
utan inloggningens cookie finns inget att skydda `GET /api/me` med.

## Nya tekniker

MongoDB och Mongoose var helt nya för mig — att definiera ett schema och sedan få `User.find()`,
`User.findById()` och `User.create()` "gratis" är ett annat sätt att tänka än de rådata-arrayer
jag skrev i kmom04. bcrypt (hashning av lösenord) och JWT (signerade tokens i en httpOnly-cookie)
var också nya. Det som förvånade mig mest var hur lite kod själva autentiseringen faktiskt kräver
— `bcrypt.compare()` och `jwt.verify()` gör det tunga jobbet, och min egen kod blir mest
felhantering runt dem.

## Veckans viktigaste koncept

Om jag skulle förklara veckans viktigaste koncept för en studiekompis skulle jag välja
**middleware som grindvakt**, med `middleware/auth.js` som exempel:

```js
export async function authMiddleware(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ message: 'Not authenticated' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(payload.userId).select('-password')
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
    next()
  } catch {
    return res.status(401).json({ message: 'Not authenticated' })
  }
}
```

Det som gjorde konceptet konkret för mig var `router.get('/api/me', authMiddleware, ...)` —
middlewaren körs *före* handlern, och om den aldrig anropar `next()` når requesten aldrig fram.
Routen `/api/me` behöver alltså aldrig själv kontrollera om användaren är inloggad; den litar
blint på att `req.user` redan är satt när den körs. Samma mönster kan sedan återanvändas för
vilken skyddad route som helst, bara genom att lägga till `authMiddleware` som andra argument.

## Design pattern / Programming philosophy

Jag valde **Information hiding** från login-issuet: både "användaren finns inte" och "fel
lösenord" ger exakt samma svar, `401 Invalid email or password`. Först kändes det som sämre
felhantering — varför inte säga vad som faktiskt är fel? — men poängen är att en specifik
felkod för "fel lösenord" respektive "okänd e-post" hade låtit vem som helst kartlägga vilka
e-postadresser som är registrerade, bara genom att prova sig fram i inloggningsformuläret. Att
medvetet ge mindre information än man har är alltså ibland rätt beslut, inte en genväg. Samma
idé dyker upp igen i registrerings-issuets duplicate-email-utmaning, fast åt andra hållet — där
diskuterades det (i en kommentar i själva issuet) att `409` vs `201` faktiskt läcker om en
e-post redan finns, ett medvetet avvägt undantag från principen.

## Valfritt arbete

Jag gjorde de valfria delarna av kmom05:

- **Input validation (6c)** — la till validering i `/auth/register` och `/auth/login` (tomma
  fält, `@`-kontroll på e-post, minst 6 tecken på lösenord) innan något async-arbete
  (`bcrypt.hash`, `User.create`) körs.
- **TUI Auth (7a)** — utökade `src/client/backend.js` med `login`, `logout` och `me`. Det roligaste
  med den här delen var att se `Set-Cookie`-headern i klartext i terminalen:

  ```
  > login alice@example.com alice
  Status: 200
  Cookie: token=eyJhbGc...; Max-Age=604800; Path=/; Expires=...; HttpOnly; SameSite=Lax
  Logged in as Alice Johansson <alice@example.com>
  ```

  I webbläsaren är `HttpOnly` osynligt för JavaScript (`document.cookie` visar den aldrig) — men
  eftersom TUI-klienten pratar direkt med `fetch` och inte har webbläsarens cookie-jar, måste jag
  själv läsa `set-cookie` från svaret och skicka tillbaka den som `Cookie`-header i `me`/`logout`.
  Att koda det för hand var ett bra sätt att förstå exakt vad webbläsaren annars gör automatiskt.

## TIL

Den tydligaste "aha"-upplevelsen var att `bcrypt.compare()` inte kastar fel om lösenordet är fel
— den returnerar bara `false`. Jag hade förväntat mig ett try/catch-mönster likt `jwt.verify()`
(som *kastar* vid ogiltig/utgången token), men nej: samma bibliotek, två helt olika sätt att
signalera "det gick inte". Det fick mig att faktiskt läsa dokumentationen istället för att gissa
mig fram baserat på hur föregående rad betedde sig.

## improve

- **[backend]** `npm run reset-db` (`src/scripts/reset-db.js`) importerar
  `../models/Message.js` redan i kmom05-scaffoldingen, men den modellen skapas först i
  issue 7b (kmom06). Att köra scriptet i det här skedet (t.ex. efter att ha läst
  registrerings-issuets tips om att `docker-compose down -v && docker-compose up -d` "kräver att
  man återskapar seed-användarna efteråt" — `npm run reset-db` ligger redan i `package.json` och
  är det naturliga stället att leta efter ett sätt att göra just det) kraschar direkt med
  `ERR_MODULE_NOT_FOUND: Cannot find module '.../src/models/Message.js'`, en Node-stacktrace utan
  någon koppling till vad man faktiskt gjorde fel. Ingen av kmom05-issuen (5, 6, 6b, 7, 7e) nämner
  scriptet alls — bara Compass-inserts och `docker-compose down -v` — så avsaknaden av en modell
  som inte ska finnas än märks bara om man utforskar `package.json`s scripts på egen hand.
  Förslag: antingen gör scriptets `Message`-import lazy/valfri (skippa messages-delen av
  clearingen om modulen inte finns), eller nämn uttryckligen i issue 5/6 att `npm run reset-db`
  hör till kmom06 och inte ska köras förrän dess.
