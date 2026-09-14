# Come immagazzinare i dati

Analisi del formato d'archivio, dato il vincolo: **tutto pubblico, tutto su GitHub, sito statico
su GitHub Pages, nessun backend, contributi via pull request.**

---

## Il problema vero non è il formato, è lo schema

Oggi una riga CSV = un taglio di archiviazione. Funziona finché i campi sono 14. Con la
[tassonomia completa](TAXONOMY.md) i campi diventano ~250, e lo schema attuale collassa:

> **iPad**: 45 modelli, 294 righe. Le specifiche tecniche (chip, display, fotocamere, corpo)
> sono identiche per tutte le righe dello stesso modello. Con 250 colonne si scriverebbero
> **294 × 250 = 73.500 celle**, di cui circa **85% duplicate**. Cambiare l'apertura del
> teleobiettivo di un iPad Pro vorrebbe dire modificare 8 righe a mano, e sbagliarne una
> significa creare un modello fantasma.

C'è una seconda rottura: la **sparsità**. `zoom_ottico_x` non esiste per Apple TV,
`autonomia_anc_on_h` non esiste per iPhone. Un'unica intestazione condivisa produrrebbe
migliaia di celle vuote; intestazioni diverse per categoria rendono impossibile il confronto
trasversale.

La radice è che stiamo mescolando **due entità diverse**:

| Entità | Cos'è | Cardinalità | Forma naturale |
|---|---|---|---|
| **Modello** | iPhone 17 Pro Max | 1 | profonda, annidata, sparsa |
| **Variante (SKU)** | 17 Pro Max · 1 TB · nero | N per modello | piatta, densa, tabellare |

Sono due forme opposte. Nessun formato singolo le serve bene entrambe.

---

## Confronto dei formati

| | CSV | JSON | YAML | SQLite / Parquet |
|---|---|---|---|---|
| Reso da GitHub | ✅ tabella ordinabile | ✅ evidenziato | ✅ evidenziato | ❌ binario |
| Modificabile dal web di GitHub | ✅ | ✅ | ⚠️ indentazione | ❌ |
| Apribile in Excel / Numbers | ✅ | ❌ | ❌ | ❌ |
| Diff leggibili in una PR | ✅ per riga | ✅ per chiave | ✅ ottimi | ❌ illeggibili |
| Annidamento | ❌ | ✅ | ✅ | ⚠️ join |
| Campi sparsi | ❌ celle vuote | ✅ chiave assente | ✅ | ⚠️ NULL |
| Commenti / fonti inline | ❌ | ❌ | ✅ | ❌ |
| Validazione automatica | ⚠️ artigianale | ✅ JSON Schema | ✅ via JSON Schema | ✅ |
| Dipendenze nel browser | PapaParse | **nessuna** | js-yaml | sql.js (~1 MB) |
| Conflitti di merge | bassi | bassi | bassi | totali |

**Scartati subito:** SQLite e Parquet. Sono ottimi formati, ma binari: uccidono la proprietà
che regge tutto il progetto — chiunque apre un file su GitHub, capisce cosa c'è scritto e
propone una correzione senza installare nulla.

**YAML** è il migliore per leggibilità e diff, ed è l'unico che permette commenti
(`# fonte: apple.com/it/iphone-17-pro/specs`, prezioso per un archivio aperto). Perde su due
punti concreti: richiede una libreria in più nel browser, e la sensibilità all'indentazione è
la prima causa di attrito per chi contribuisce dall'editor web di GitHub.

---

## Raccomandazione: separare le due entità, un formato per ciascuna

> **Stato attuale**: questa sezione era una proposta; lo split `modelli.json` /
> `varianti.csv` **è stato implementato** per tutte le categorie attive. L'implementazione
> reale è però più pragmatica della proposta originale su tre punti, spiegati dove
> rilevante più sotto: (1) specifiche **piatte**, non annidate — `modelli.json` oggi ha
> solo i ~14-27 campi già popolati per categoria, senza gerarchia; l'annidamento profondo
> mostrato come esempio qui sotto resta un obiettivo per quando i campi di
> [`TAXONOMY.md`](TAXONOMY.md) verranno effettivamente popolati, non un requisito da subito.
> (2) La chiave di join fra i due file è il nome `modello` esistente, non un nuovo slug
> `id`. (3) La validazione non usa JSON Schema separati in `data/schema/`: è stata
> integrata nel validatore Python esistente ([`tools/validate.py`](../tools/validate.py)),
> che copre sia la struttura sia le regole di business (prezzi crescenti col taglio, cambi
> plausibili...) che JSON Schema da solo non potrebbe esprimere — mantenere due sistemi di
> validazione paralleli sarebbe stata complessità senza beneficio.

```
data/
├── categories.csv              manifest (senza più la colonna "file": lo slug è la cartella)
├── SCHEMA.md · TAXONOMY.md · STORAGE.md
└── iphone/
    ├── modelli.json            1 oggetto per modello, oggi piatto (vedi nota sopra)
    └── varianti.csv            1 riga per SKU acquistabile: taglio, connettività, prezzi
```

### 1 · `modelli.json` — le specifiche profonde

JSON, perché le specifiche sono **annidate e sparse**, che è esattamente ciò che il CSV non sa fare.

```json
{
  "id": "iphone-17-pro-max",
  "modello": "17 Pro Max",
  "famiglia": "Pro",
  "date": { "presentazione": "09/2025", "commercializzazione": "09/2025", "dismissione": null },
  "chip": {
    "nome": "Apple A19 Pro", "processo_nm": 3,
    "cpu": { "core_totali": 6, "core_performance": 2, "core_efficienza": 4 },
    "gpu": { "core": 6, "ray_tracing": true },
    "neural_engine": { "core": 16 }
  },
  "display": {
    "pollici": 6.9, "tecnologia": "OLED LTPO", "risoluzione_px": "2868x1320",
    "refresh": { "min_hz": 1, "max_hz": 120 },
    "luminosita": { "tipica_nit": 1000, "picco_nit": 3000 }
  },
  "batteria": { "mah": 5088, "autonomia_video_h": 39, "ricarica_cablata_w": 40 },
  "porte": { "tipo": "USB-C", "usb_versione": "USB 3.2 Gen 2", "velocita_gbps": 10 },
  "fonti": ["https://www.apple.com/it/iphone-17-pro/specs/"]
}
```

Vantaggi concreti:
- Una specifica sbagliata si corregge **in un punto solo**.
- I campi assenti si omettono: niente colonne vuote.
- `fetch().then(r => r.json())` è nativo — **si può togliere PapaParse** dal percorso critico.
- Validabile con **JSON Schema** in CI: una PR con `cpu_core: "sei"` viene bocciata da sola.
- Il campo `fonti` rende l'archivio verificabile, che per un progetto editoriale indipendente
  vale quanto il dato stesso.

### 2 · `varianti.csv` — la matrice dei prezzi

Resta CSV, perché **è davvero una tabella**: densa, piatta, poche colonne, tante righe.

```csv
modello_id,archiviazione,connettivita,colore,prezzo_lancio_usd,cambio_usd_eur,prezzo_reale_eur
iphone-17-pro-max,256 GB,,nero siderale,1199,0.90,1489
iphone-17-pro-max,512 GB,,nero siderale,1399,0.90,1739
iphone-17-pro-max,1 TB,,nero siderale,1599,0.90,1989
```

È anche il file che si aggiorna più spesso, e l'unico che ha senso aprire in un foglio di
calcolo. Tenerlo CSV preserva la parte migliore dell'impianto attuale.

### 3 · Validazione automatica

```yaml
# .github/workflows/validate.yml — su ogni pull request
- ogni modelli.json valida contro il suo JSON Schema
- ogni modello_id in varianti.csv esiste in modelli.json
- date nel formato MM/AAAA, prezzi numerici, nessun id duplicato
```

Un archivio pubblico senza validazione automatica degrada: questo è ciò che tiene la qualità
alta man mano che arrivano contributi esterni.

---

## Compatibilità con GitHub Pages

| Aspetto | Esito |
|---|---|
| MIME type | Pages serve `.json` come `application/json` e `.csv` come `text/csv`. Nessuna configurazione. |
| Build step | Nessuno. I file vengono serviti così come sono nel repo. |
| Moduli ES | Già in uso; funzionano su Pages (che è sempre HTTPS). |
| Dimensione | iPhone ≈ 52 modelli × ~250 campi ≈ **300–400 KB** di JSON. Trascurabile, e si carica una categoria alla volta. |
| Cache | Pages manda `ETag`; il browser rivalida senza riscaricare. |
| Limiti | Repo consigliato < 1 GB, sito < 1 GB, 100 GB/mese di banda. Siamo a **tre ordini di grandezza** di distanza. |
| `file://` | JSON e moduli ES non funzionano con doppio clic, esattamente come già oggi con i CSV: serve `python3 -m http.server`. Nessuna regressione. |

**Un file per categoria, non uno per modello.** Un file per modello darebbe diff perfetti, ma
costringerebbe il browser a 52 richieste per aprire la pagina iPhone. Con un file per categoria
ne basta una. Se un domani un file diventasse ingestibile, si passa a un file per modello più
un `index.json` leggero — ma non prima che serva davvero.

---

## Migrazione: cosa è stato fatto davvero

Il piano originale qui sotto prevedeva una migrazione graduale, categoria per categoria, con
convivenza temporanea CSV/JSON. In pratica si è rivelato più semplice e altrettanto sicuro fare
un taglio netto in un'unica sessione, per un motivo concreto: `tools/validate.py` dava già
copertura completa (struttura + regole di business) su tutte le categorie, quindi non serviva
un periodo di transizione per scoprire eventuali rotture — bastava eseguire lo script di
migrazione e poi far girare il validatore.

Passaggi effettivi:
1. Script una tantum: per ogni colonna del CSV piatto, controlla se il valore varia fra le
   righe di uno stesso modello in almeno un modello della categoria. Se sì → `varianti.csv`,
   altrimenti → `modelli.json`. Nessuna regola scritta a mano per categoria (questo ha anche
   fatto emergere correttamente casi non ovvi, es. Apple TV 1ª gen dove *data di uscita* e
   *periodo di vendita* sono per-variante perché il modello da 160 GB uscì un anno dopo quello
   da 40 GB).
2. Tutte e cinque le categorie attive convertite nello stesso passaggio.
3. `js/data.js` riscritto per caricare ed unire i due file per categoria, producendo righe
   "piatte" nella stessa forma di prima — così `derived.js`, `columns.js` e le viste non hanno
   dovuto cambiare.
4. `tools/validate.py` riscritto per leggere il nuovo formato mantenendo le stesse regole.
5. I CSV piatti originali sono stati rimossi dal repository — restano recuperabili dalla
   cronologia Git se mai servisse un rollback.
6. Aggiunto il campo `fonti` (vuoto) a ogni voce di `modelli.json`, da popolare
   progressivamente via contributi e verifiche mirate.

PapaParse resta necessario: `varianti.csv` e `categories.csv` sono ancora CSV, per le ragioni
già esposte sopra (sono vere tabelle dense, non specifiche annidate).
