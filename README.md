# Archivio Apple

Archivio aperto e indipendente dei prodotti commercializzati da Apple, con confronto rapido di
informazioni e specifiche tecniche. Sito statico, nessun backend: i dati vivono in file **JSON +
CSV** (due per categoria) facilmente leggibili e modificabili direttamente su GitHub.

> Progetto editoriale indipendente, non affiliato ad Apple. Tutti i marchi appartengono ai
> rispettivi proprietari.

## Categorie
- ✅ iPhone · iPad · Apple Watch · Apple TV · Cuffie/AirPods (attive)
- ⏳ Mac (predisposta, da popolare)

## Come sono organizzati i dati
- Ogni categoria ha una cartella in [`data/`](data/) con due file:
  `modelli.json` (specifiche, un oggetto per modello) e `varianti.csv`
  (prezzi, un rigo per configurazione acquistabile). Il motivo dello split
  è spiegato in [`data/STORAGE.md`](data/STORAGE.md).
- L'elenco delle categorie attive è in [`data/categories.csv`](data/categories.csv).
- Lo standard dei campi è documentato in [`data/SCHEMA.md`](data/SCHEMA.md).
- L'elenco completo delle caratteristiche archiviabili è in [`data/TAXONOMY.md`](data/TAXONOMY.md).
- Regola: **una riga di `varianti.csv` = un taglio di archiviazione acquistabile.**

### Aggiungere un prodotto
Aggiungi un oggetto in `data/<categoria>/modelli.json` con le specifiche del modello (incluso
un array `fonti` con gli URL usati per verificarle), e una riga in `data/<categoria>/varianti.csv`
per ogni taglio di archiviazione, con lo stesso `modello` come chiave. Campi non noti: scrivi `?`.

### Aggiungere una categoria
1. Crea `data/nuova-categoria/modelli.json` (array vuoto) e `data/nuova-categoria/varianti.csv`
   con l'intestazione standard.
2. Aggiungi una riga in `data/categories.csv` con `attiva = si`.
Fatto: nav e pagine compaiono da sole.

## Anteprima in locale
Il sito legge i dati via `fetch`, quindi serve un piccolo server locale (con `file://` non funziona):

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
│   ├── data.js          # caricamento + unione modelli.json/varianti.csv
│   ├── derived.js       # prezzi teorici, anni di vendita e supporto
│   ├── columns.js       # colonne della tabella
│   ├── compare.js       # lista di confronto
│   ├── charts.js        # grafici SVG
│   ├── aggregate.js     # aggregatori statistiche
│   ├── utils.js · ui.js
│   └── views/           # una vista per file
├── README.md
├── LICENSE               # codice, MIT
├── CONTRIBUTING.md
├── tools/validate.py     # validatore dati (gira anche in CI)
└── data/
    ├── categories.csv    # elenco categorie (manifest)
    ├── LICENSE            # dati, CC BY 4.0
    ├── SCHEMA.md          # documentazione dei campi
    ├── TAXONOMY.md        # tutte le caratteristiche archiviabili
    ├── STORAGE.md         # analisi del formato d'archivio
    └── iphone/ · ipad/ · apple-watch/ · apple-tv/ · cuffie/
        ├── modelli.json      # specifiche, un oggetto per modello
        └── varianti.csv      # prezzi, un rigo per configurazione
```

## Stack
HTML/CSS/JS vanilla a **moduli ES**, nessun build step. Parsing CSV con
[PapaParse](https://www.papaparse.com/) via CDN. Routing client-side con hash (`#/...`).

> I moduli ES e `fetch` richiedono HTTP: con `file://` (doppio clic) il sito non parte.
> Serve il server locale descritto sopra.

## Licenza
- **Codice** (`index.html`, `styles.css`, `js/`, `tools/`): [MIT](LICENSE).
- **Dati** (`data/*.csv`, `data/*.json`): [CC BY 4.0](data/LICENSE) — riuso libero anche commerciale, con obbligo di attribuzione.

Archivio indipendente, non affiliato ad Apple Inc. I marchi citati appartengono ai rispettivi proprietari.
