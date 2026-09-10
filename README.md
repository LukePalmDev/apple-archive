# Archivio Apple

Archivio aperto e indipendente dei prodotti commercializzati da Apple, con confronto rapido di
informazioni e specifiche tecniche. Sito statico, nessun backend: i dati vivono in semplici file
**CSV** (uno per categoria) facilmente leggibili e modificabili direttamente su GitHub.

> Progetto editoriale indipendente, non affiliato ad Apple. Tutti i marchi appartengono ai
> rispettivi proprietari.

## Categorie
- ✅ iPhone · iPad · Apple Watch · Apple TV · Cuffie/AirPods (attive)
- ⏳ Mac (predisposta, da popolare)

## Come sono organizzati i dati
- Ogni categoria ha un CSV in [`data/`](data/).
- L'elenco delle categorie attive è in [`data/categories.csv`](data/categories.csv).
- Lo standard delle colonne è documentato in [`data/SCHEMA.md`](data/SCHEMA.md).
- L'elenco completo delle caratteristiche archiviabili è in [`data/TAXONOMY.md`](data/TAXONOMY.md).
- Le scelte sul formato d'archivio sono motivate in [`data/STORAGE.md`](data/STORAGE.md).
- Regola: **una riga = un taglio di archiviazione** (così ogni prezzo è quello del taglio).

### Aggiungere un prodotto
Apri il CSV della categoria (es. `data/iphone.csv`) e aggiungi una riga per ogni taglio,
rispettando l'ordine delle colonne dell'intestazione. Campi non noti: scrivi `?`.

### Aggiungere una categoria
1. Crea `data/nuova-categoria.csv` con la stessa riga di intestazione.
2. Aggiungi una riga in `data/categories.csv` con `attiva = si`.
Fatto: nav e pagine compaiono da sole.

## Anteprima in locale
Il sito legge i CSV via `fetch`, quindi serve un piccolo server locale (con `file://` non funziona):

```bash
cd apple-archive
python3 -m http.server 8000
# apri http://localhost:8000
```

## Pubblicazione (GitHub Pages)
1. `git init` e push del contenuto di `apple-archive/` su un repo pubblico.
2. Repo → **Settings → Pages** → Source: branch `main`, cartella `/ (root)`.
3. (Opzionale) dominio personalizzato: crea un file `CNAME` con il dominio.

## Struttura
```
apple-archive/
├── index.html        # shell della single-page app
├── styles.css        # stile (Apple chiaro + tema scuro/tech)
├── js/               # moduli ES, nessun build step
│   ├── main.js          # punto di ingresso
│   ├── router.js        # routing su hash
│   ├── state.js         # stato condiviso, etichette, mappe OS
│   ├── data.js          # caricamento CSV
│   ├── derived.js       # prezzi teorici, anni di vendita e supporto
│   ├── columns.js       # colonne della tabella
│   ├── compare.js       # lista di confronto
│   ├── charts.js        # grafici SVG
│   ├── aggregate.js     # aggregatori statistiche
│   ├── utils.js · ui.js
│   └── views/           # una vista per file
├── README.md
└── data/
    ├── categories.csv   # elenco categorie (manifest)
    ├── SCHEMA.md        # documentazione colonne
    ├── TAXONOMY.md      # tutte le caratteristiche archiviabili
    ├── STORAGE.md       # analisi del formato d'archivio
    ├── iphone.csv · ipad.csv · apple-watch.csv
    └── apple-tv.csv · cuffie.csv
```

## Stack
HTML/CSS/JS vanilla a **moduli ES**, nessun build step. Parsing CSV con
[PapaParse](https://www.papaparse.com/) via CDN. Routing client-side con hash (`#/...`).

> I moduli ES e `fetch` richiedono HTTP: con `file://` (doppio clic) il sito non parte.
> Serve il server locale descritto sopra.
