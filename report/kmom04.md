# kmom04

Det här kmomet var mitt första riktiga möte med att bygga en backend från grunden med Express, och det kändes ovanligt konkret jämfört med tidigare kurser: frontend fanns redan klar i `public/`, och min uppgift var bara att göra alla dess redan hårdkodade `fetch`-anrop lyckas. Att se `GET /api/doc`-tabellen och användarlistan på hemsidan gå från platshållartext till riktiga svar direkt från min egen server var ett bra sätt att känna att man kommer någonvart.

## Nya tekniker

De tekniker som var nya för mig den här veckan var Express (routing med `Router()`, `express.json()`, `express.static()`), strukturerad loggning med Pino, samt integrationstestning med Vitest och Supertest tillsammans med kodtäckning via `@vitest/coverage-v8`. Jag hade skrivit enkla `console.log`-baserade skript tidigare, men att bygga ett litet API med flera route-filer som samlas ihop i en gemensam router var nytt. CI-delen (GitHub Actions som körs på varje taggad push) var också ny för mig i praktiken, även om jag känt till konceptet CI sedan tidigare.

## Veckans viktigaste koncept

Om jag skulle förklara veckans viktigaste koncept för en studiekompis skulle jag välja **middleware-kedjan** i Express, eftersom nästan allt annat bygger på den. En request går genom en rad funktioner i tur och ordning tills en av dem skickar ett svar. I mitt eget projekt ser kedjan ut ungefär så här i `src/server.js`:

```js
app.use(express.json())
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request')
  next()
})
app.use(routes)
app.use(express.static('public'))
```

Jag skulle förklara det som en löpande bana: `express.json()` packar upp request-kroppen till ett JS-objekt, min egen loggmiddleware skriver en rad med metod och URL och anropar sedan `next()` för att skicka vidare, `routes` försöker matcha en specifik route (till exempel `GET /health`), och om ingen route matchar faller anropet igenom till `express.static('public')` som letar efter en fil att skicka. Det som gjorde det tydligt för mig var just att glömma `next()` — då hänger klienten kvar och väntar på ett svar som aldrig kommer, vilket är ett bra sätt att inse att varje middleware måste antingen skicka ett svar eller kalla `next()`.

## Design pattern / Programming philosophy

Jag valde stycket om **Observability** från loggnings-issuet: "you cannot fix what you cannot see... The question to ask after every error path is: if this happens at 3am, will I have enough information to understand why?" Det tyckte jag var relevant eftersom jag tidigare mest sett loggning som ett sätt att felsöka under utveckling, inte som en del av själva funktionen. Att byta ut `console.log`/`console.error` mot en riktig logger (Pino) med nivåer (`info`, `warn`, `error`) och strukturerad JSON gör att man i efterhand faktiskt kan filtrera och söka i loggarna — något ett gäng `console.log`-rader aldrig kan ge. Exemplet i `src/routes/users.js`, där en `logger.warn({ id: req.params.id }, 'User not found')` skrivs innan servern svarar 404, är precis den typen av "3am-tänk": om något går fel i produktion vill man veta exakt vilket id som söktes, inte bara att något inte hittades.

## Valfritt arbete

Jag gjorde den valfria terminalklienten (issue 4e). `src/client/backend.js` fick två nya kommandon utöver exempel-kommandot `hello`:

- `health` — anropar `GET /health` och skriver ut statuskod plus svaret som en tabell med `console.table`.
- `doc [search]` — anropar `GET /api/doc` och visar endpoint-listan som en tabell, med möjlighet att filtrera på metod, path eller beskrivning.

Det roligaste med den delen var att se samma mönster som i Express-routern återkomma på klientsidan: `CommandRegistry` matchar ett kommandonamn till en metod på samma sätt som Express matchar en URL till en handler, utan att någon av sidorna behöver känna till den andras interna implementation.

## TIL

Den viktigaste insikten den här veckan var att kodtäckning inte säger något om testens *kvalitet*, bara om koden faktiskt kördes. Mina tre testfiler gav 100 % täckning på alla route-filer, men det beror på att routerna är enkla — täckningsrapporten hade sett likadan ut även om jag glömt att testa själva 404-fallet felaktigt (t.ex. om jag råkat kolla fel statuskod). Det gjorde att jag läste igenom mina `expect`-satser en extra gång istället för att bara lita på den gröna 100%-siffran.

## improve

- **[backend]** Issue 4 ("REST API") ger en exakt array att kopiera med bara `id`: `{ id: '1', name: 'Alice Johansson', email: 'alice@example.com' }`. Men `public/app.js:111` renderar användarkort med `onclick="App.loadUser('${u._id}')"` — den läser `_id`, ett Mongoose-fält som inte existerar förrän kmom05. Kopierar man issue 4:s array ordagrant blir `u._id` `undefined`, och att klicka på ett användarkort i den riktiga frontendn skickar `GET /api/users/undefined` istället för ett giltigt id. Issue 4:s egen verifiering (Bruno mot `/api/users` och `/api/users/:id`) testar aldrig `_id`-fältet, så avvikelsen syns inte om man bara följer issuets instruktioner och test till punkt och pricka — den upptäcks först om man klickar runt i den faktiska sajten. Förslag: nämn i issue 4 att detaljvyn i frontendn inte fungerar fullt ut förrän kmom05, eller uppdatera exempelarrayen till att även innehålla `_id` (spegling av `id`) redan i kmom04.

  Så löste jag det i `src/routes/users.js` — lägg till `_id` som en spegling av `id`:

  ```diff
   const users = [
  -  { id: '1', name: 'Alice' },
  -  { id: '2', name: 'Bob' },
  -  { id: '3', name: 'Clara' },
  +  { id: '1', _id: '1', name: 'Alice Johansson', email: 'alice@example.com', avatar: 'alice.svg' },
  +  { id: '2', _id: '2', name: 'Bob Lindqvist', email: 'bob@example.com', avatar: 'bob.svg' },
  +  { id: '3', _id: '3', name: 'Clara Eriksson', email: 'clara@example.com', avatar: 'clara.svg' },
   ]
  ```
