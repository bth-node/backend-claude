# kmom06

Det här kmomet var det som knöt ihop allt. Efter kmom05 fanns en databas och en inloggning, men
ingenting att faktiskt *göra* som inloggad — nu fick appen sitt innehåll: meddelanden som tillhör en
användare, möjlighet att ändra och radera dem, och två olika sätt att få dem levererade i realtid.
Jag gjorde alla obligatoriska issues (07b, 07c, 08, 09, 09a), alla tre valfria (07d, 09b, 08b) samt
den obligatoriska läsningen 999. Det som kändes bäst var att varje steg gick att se med egna ögon
direkt: skicka ett meddelande med `curl` som Alice och se det dyka upp i en öppen ström hos Bob.

## 1. CRUD, ägarskydd och fler kollektioner

Ja, jag tycker att jag har bra koll nu. Mönstret är i grunden detsamma varje gång: en modell med ett
schema, en router med `authMiddleware` som andra argument, och en query som alltid filtrerar på
`userId: req.user._id`. Det är den sista delen som är nyckeln — ägarskyddet sitter i *queryn*, inte i
en separat `if`-sats:

```js
const message = await Message.findOneAndUpdate(
  { _id: req.params.id, userId: req.user._id },
  { text },
  { new: true }
)
if (!message) return res.status(404).json({ error: 'Message not found' })
```

Om meddelandet finns men tillhör någon annan hittar queryn ingenting, och svaret blir samma `404` som
för ett meddelande som inte finns alls. Jag testade det direkt med två användare: Bob som försöker
`PATCH`:a och `DELETE`:a Alices meddelande får `404`, och Alices meddelande är orört efteråt. Vill jag
lägga till en tredje kollektion, till exempel `Comment` med `messageId` och `userId`, skulle jag göra
precis samma sak: ny modell, nya routes, samma ägarfilter, och en rad i `/api/doc`. Det enda jag
fortfarande skulle behöva slå upp är `populate` när jag vill hämta relaterad data i en enda query —
nu har jag bara lagrat referensen (`ref: 'User'`) men aldrig läst ut den.

En sak jag la till utöver issue-texten: `PATCH` och `DELETE` kontrollerar med
`mongoose.isValidObjectId` att id:t är giltigt innan queryn körs, precis som `GET /api/users/:id` gör
sedan kmom05. Utan det ger `/api/messages/xyz` en `CastError` från Mongoose och därmed en ful `500`
istället för en `400`. Jag lät också `PATCH` avvisa tom text på samma sätt som `POST`, annars går det
att "redigera" ett meddelande till ett blankt kort, vilket är exakt det som valideringsutmaningen i 07b
ville förhindra.

## 2. Socket.io mot SSE

SSE var det som var enklast att förstå. Det är bara HTTP: ett `Content-Type: text/event-stream`, en
öppen respons som jag sparar i ett `Set`, och `res.write('data: ...\n\n')` när något händer. Jag kan
se hela mekanismen framför mig och testa den med `curl -N`. Socket.io tog längre tid att greppa, inte
för att koden är svårare (den är kortare) utan för att så mycket sker utan att jag ser det:
anslutningen, upgrade från polling till WebSocket, rooms och `socket.id` som är per *anslutning* och
inte per användare. Skillnaden mellan `socket.emit`, `socket.broadcast.emit` och `io.emit` blev
tydlig först när jag körde två klienter samtidigt och såg vem som fick vad: Alice får inget
"alice joined" men Bob får det.

Det som förvånade mig mest var att de två lösningarna inte är utbytbara: SSE kan bara skicka från
servern, så chatten *kan* inte byggas med enbart SSE, men en ren notifieringsström behöver inte
Socket.io alls.

## 3. Veckans viktigaste koncept — att skicka istället för att fråga

Till en studiekompis skulle jag säga: *förut frågade klienten servern om nya saker; nu berättar
servern själv när något hänt.* Exemplet är `clients`-mängden i `src/routes/dashboard.js`:

```js
const clients = new Set()

router.get('/api/messages/stream', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders()
  res.userId = req.user._id.toString()
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

// i POST /api/messages, efter Message.create:
for (const client of clients) {
  if (client.userId !== req.user._id.toString()) client.write(payload)
}
```

En öppen `GET` som aldrig avslutas är en prenumeration, och `POST` är den som publicerar. Man kan
fråga sig varför servern inte bara svarar och stänger — svaret är att *inte* stänga: då blir
anslutningen själva kanalen.

## 4. Design pattern: Observer

Jag valde **Observer** från Socket.io-issuet. Ett subjekt (här `socket`) håller en lista över
observatörer (handlers) och anropar dem när något händer: `socket.on('message', handler)` är
registreringen, och eventet är notifieringen. Jag fann det intressant eftersom jag insåg att jag
redan hade byggt samma sak för hand i SSE-issuet: `clients`-mängden *är* observatörslistan, och
`for (const client of clients) client.write(...)` är notifieringen. Socket.io döljer bara
bokföringen. Skillnaden mot Pub/Sub är att `io.emit` ligger mellan avsändare och mottagare — avsändaren
vet inte vilka som lyssnar — medan mitt `Set` är en direkt referens till varje observatör. Att jag
kunde se samma mönster i två helt olika tekniker gjorde att det fastnade.

## 5. Valfritt arbete

Jag gjorde alla tre valfria issues i terminalklienten (`src/client/backend.js`):

- **07d `messages` och `post <text>`** — samma kontrakt som webbläsaren använder, med cookien från
  `login`. `post` slår ihop flera ord till en text, så `post hej alla` fungerar utan citationstecken.
- **09b `stream`** — läser SSE med vanlig `fetch` och `for await` över `res.body`, plockar ut
  `data:`-rader och skriver `[namn] text`. Jag körde det mot servern med Bob som postade i en annan
  session, och raden `[Bob Lindqvist] bob says hi` dök upp direkt. Här blev det tydligt vad
  `EventSource` döljer i webbläsaren: det är ingen magi, bara radbrytningar och ett `data:`-prefix.
- **08b `chat <username>`** — kopplar `socket.io-client` till chatten, med `shell.ask()` i en loop för
  det man skriver och en lokal `AbortController` som avbryts av både Ctrl-C och `disconnect`. Det var
  den mest intressanta: REPL:en är sekventiell, men socket-eventen kommer när som helst. Jag
  verifierade hela flödet med två klienter mot servern (join, users-lista, meddelande från Alice till
  Bob), men `ask()`-loopen själv körde jag bara mot en förenklad stand-in för `shell` — inte i en
  riktig interaktiv TUI-session.

Jag gjorde också utmaningarna: tomma meddelanden avvisas med `400` (7b), och SSE hoppar över
avsändaren (9) genom att jag tagger varje öppen respons med `res.userId` och jämför i loopen.

## 6. Design decisions (999)

Jag läste igenom dokumentet sist. Jag håller med om **ingen global error handler**, men av en annan
anledning än den som anges. Motiveringen är att fyra-argumentssignaturen är ytterligare ett koncept.
Efter den här veckan har jag ändå *sett* konsekvensen av att den saknas: Express 5 fångar
avvisade promises i async-handlers, men utan en handler blir svaret Expresss standardsida med en
stacktrace i `development`, inte en JSON-`500`. Det var därför jag la `isValidObjectId`-kontrollerna
för hand i varje route: jag upprepade mig tre gånger på en enda vecka. Det är precis den
upprepning dokumentet säger ska motivera mönstret nästa kurs, så resonemanget håller — men jag hade
nog lyft fram det upprepade felet som övning redan här, eftersom man ändå stöter på det.

Jag är mer kluven till **`middleware/` utanför `src/`**. Dokumentet landar i "valfritt, bara var
konsekvent", och rent tekniskt stämmer det. Men jag skulle själv ha lagt den under `src/` — det
gör att `npm run lint`/`format`-skripten och en framtida `src/`-baserad byggprocess behöver ha en
extra sökväg. Jag märkte det konkret: skripten i `package.json` listar `middleware/` separat överallt.

## 7. TIL

Att ett API som *skickar* en ström inte är mer komplicerat än ett som svarar — det enda som skiljer
är att man inte anropar `res.end()`. Och den mer praktiska lärdomen: `httpServer.close()` hänger sig
så länge någon SSE-anslutning är öppen. Utan `closeAllConnections()` i `shutdown` slutar servern
aldrig. Jag såg det själv när jag stängde servern med en öppen ström, och med den raden stannade den
direkt (`Server stopped` i loggen).

## improve

- **[backend]** Issue 8 och 8b säger att `socket.io-client` "redan finns som dependency" och att
  `socket.io` ska installeras med `npm install socket.io`, men varken `socket.io` eller
  `socket.io-client` finns i `package.json` i kmom06-scaffoldingen — ändå importerar
  `src/scripts/chat.js` `socket.io-client` redan, så `npm run chat` kraschar tills man installerar
  det själv. Issue 8b:s formulering ("no install needed") stämmer alltså inte. Förslag: lägg till
  båda i `package.json` i mallen, eller ändra texten i 8b till samma `npm install` som i issue 8.
- **[backend]** Issue 7b:s `POST` får validering som utmaning, men 7c:s `PATCH` har ingen: med
  issuens kod kan ett meddelande redigeras till en tom sträng, och ett saknat `text`-fält skickas
  vidare till Mongoose utan kontroll. Förslag: lägg till en rad i 7c som pekar på samma
  `.trim()`-kontroll som i 7b.
- **[backend]** Flera issues (8, 8b, 9, 9b) har `localhost:3000` i sina exempel och verifieringssteg,
  men `PORT` är konfigurerbar via `.env`. Om 3000 är upptagen (som den var här) säger issuen aldrig
  var man ändrar. Förslag: skriv `http://localhost:$PORT` eller hänvisa till `.env`.
