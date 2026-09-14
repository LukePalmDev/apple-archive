# Come contribuire

L'archivio vive di correzioni. Non serve saper programmare: i dati sono file JSON e CSV
modificabili direttamente dall'interfaccia web di GitHub.

## Come sono divisi i dati

Ogni categoria ha una cartella in [`data/`](data/) con due file (il perché dello split è in
[`data/STORAGE.md`](data/STORAGE.md)):
- **`modelli.json`** — un oggetto per modello: specifiche che non cambiano fra i tagli
  (processore, schermo, date, software...) più un array `fonti` con gli URL di verifica.
- **`varianti.csv`** — un rigo per ogni **configurazione acquistabile** (taglio di
  archiviazione, connettività, dimensione della cassa), con `modello` come chiave che la
  collega alla voce corrispondente in `modelli.json`.

## Correggere un dato

1. Apri la cartella della categoria in [`data/`](data/) — per esempio [`data/iphone/`](data/iphone/).
2. Se il dato è una specifica di modello, modifica `modelli.json`; se è un prezzo o un taglio
   di archiviazione, modifica `varianti.csv`. Clicca l'icona della matita, modifica, proponi una
   pull request.
3. **Indica sempre la fonte** nella descrizione della pull request, e aggiungi l'URL all'array
   `fonti` della voce in `modelli.json`. Una correzione senza fonte non può essere accettata:
   l'archivio vale quanto le sue fonti.

Fonti considerate attendibili, in ordine:
`apple.com` e `support.apple.com/specs` → Wikipedia → EveryMac → MacRumors / AppleInsider.

## Aggiungere un prodotto

Aggiungi un oggetto in `modelli.json` per il modello, poi una riga in `varianti.csv` per ogni
configurazione acquistabile. I campi e i formati sono descritti in [`data/SCHEMA.md`](data/SCHEMA.md);
l'elenco completo delle caratteristiche archiviabili è in [`data/TAXONOMY.md`](data/TAXONOMY.md).

Due convenzioni importanti:
- **`?`** = dato non noto o non verificato. È una risposta legittima: meglio un `?` di un numero inventato.
- **`n.d.`** = dato non applicabile (un Apple TV non ha batteria, una cuffia non ha schermo).

## Aggiungere una categoria

1. Crea `data/nuova-categoria/modelli.json` (`[]`) e `data/nuova-categoria/varianti.csv` con
   almeno le colonne standard descritte in [`data/SCHEMA.md`](data/SCHEMA.md). Puoi aggiungerne
   altre: il sito le mostra da solo, senza modifiche al codice.
2. Aggiungi una riga in [`data/categories.csv`](data/categories.csv) con `attiva = si`.

## Prima di aprire la pull request

```bash
python3 tools/validate.py --warnings
```

Controlla formati delle date, prezzi crescenti col taglio, coerenza fra periodo di vendita e
data di uscita, duplicati e cambi fuori scala. Gira anche in CI su ogni pull request.

## Anteprima in locale

```bash
python3 -m http.server 8000   # poi apri http://localhost:8000
```

Serve un server: con `file://` i moduli ES e `fetch` non funzionano.
