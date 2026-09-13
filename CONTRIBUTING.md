# Come contribuire

L'archivio vive di correzioni. Non serve saper programmare: i dati sono file CSV
modificabili direttamente dall'interfaccia web di GitHub.

## Correggere un dato

1. Apri il CSV della categoria in [`data/`](data/) — per esempio [`data/iphone.csv`](data/iphone.csv).
2. Clicca l'icona della matita, modifica la riga, proponi una pull request.
3. **Indica sempre la fonte** nella descrizione della pull request. Una correzione senza
   fonte non può essere accettata: l'archivio vale quanto le sue fonti.

Fonti considerate attendibili, in ordine:
`apple.com` e `support.apple.com/specs` → Wikipedia → EveryMac → MacRumors / AppleInsider.

## Aggiungere un prodotto

Una riga per ogni **configurazione acquistabile** (taglio di archiviazione, connettività,
dimensione della cassa). Le colonne e i formati sono descritti in [`data/SCHEMA.md`](data/SCHEMA.md);
l'elenco completo delle caratteristiche archiviabili è in [`data/TAXONOMY.md`](data/TAXONOMY.md).

Due convenzioni importanti:
- **`?`** = dato non noto o non verificato. È una risposta legittima: meglio un `?` di un numero inventato.
- **`n.d.`** = dato non applicabile (un Apple TV non ha batteria, una cuffia non ha schermo).

## Aggiungere una categoria

1. Crea `data/nuova-categoria.csv` con almeno le 14 colonne standard. Puoi aggiungerne altre
   in coda: il sito le mostra da solo, senza modifiche al codice.
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
