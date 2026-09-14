# Schema dati — Archivio Apple

Ogni categoria di prodotto ha **una cartella** in questa directory (`data/<slug>/`), con due file:

- **`modelli.json`** — un oggetto per modello, con le specifiche che **non cambiano** fra i
  tagli di archiviazione/connettività (processore, schermo, date, software...) più un array
  `fonti` con gli URL usati per verificarle. Perché questo split e non un unico CSV: vedi
  [`STORAGE.md`](STORAGE.md).
- **`varianti.csv`** — un rigo per ogni **configurazione acquistabile**, con `modello` come
  chiave che la collega alla voce corrispondente in `modelli.json`, più le colonne che
  *cambiano* fra le configurazioni (prezzi, taglio di archiviazione, connettività...).

Quali colonne finiscono in `modelli.json` e quali in `varianti.csv` non è fisso: dipende dalla
categoria. Un iPhone ha `ram` costante per modello (in `modelli.json`); un iPad Pro M4 no, perché
Apple dà più RAM ai tagli di storage più grandi, quindi lì `ram` sta in `varianti.csv`. La regola
è: se il valore può differire fra due righe dello stesso modello, va in `varianti.csv`.

Aggiungere una nuova categoria = creare `data/nuova-categoria/modelli.json` (`[]`) +
`data/nuova-categoria/varianti.csv` (intestazione standard) + una riga in
[`categories.csv`](categories.csv).

> Regola d'oro: **una riga di `varianti.csv` = un taglio di archiviazione acquistabile.**
> Quindi un modello con 4 tagli (es. 256 GB / 512 GB / 1 TB / 2 TB) occupa 4 righe, ognuna col
> proprio prezzo.

## Campi standard (14, distribuiti fra i due file secondo la regola sopra)

Intestazione minima di `varianti.csv`: `modello` + le colonne variabili della categoria (sempre
incluse `prezzo_lancio_usd`, `cambio_usd_eur`, `prezzo_reale_eur`, `archiviazione`).
`modelli.json` contiene `modello` + le colonne costanti + `fonti`.

| # | Campo | Significato | Formato / esempio |
|---|---------|-------------|-------------------|
| 1 | `oggetto` | Categoria del prodotto (costante nel file) | `iPhone` |
| 2 | `modello` | Nome del modello — chiave di join fra i due file | `4S`, `17 Pro Max` |
| 3 | `data_presentazione` | Data dell'annuncio | `MM/AAAA` → `09/2023` |
| 4 | `data_commercializzazione` | Data di uscita in vendita | `MM/AAAA` → `09/2023` |
| 5 | `prezzo_lancio_usd` | Prezzo di lancio in USD **di questa configurazione** | numero → `1199` |
| 6 | `cambio_usd_eur` | Cambio USD→EUR alla presentazione | numero → `0.92` |
| 7 | `prezzo_reale_eur` | Prezzo reale di lancio in EUR **di questa configurazione** | numero → `1489` |
| 8 | `processore` | Chip | `A17 Pro` |
| 9 | `ram` | Memoria RAM | `8 GB` |
| 10 | `archiviazione` | **Un solo taglio per riga di `varianti.csv`** | `256 GB` |
| 11 | `schermo` | Display | `6.7" OLED` |
| 12 | `batteria` | Batteria | `4422 mAh` |
| 13 | `periodo_vendita` | Periodo in cui Apple lo ha venduto | `09/2023 - presente` |
| 14 | `software` | Versioni OS major supportate (intervallo) | `iOS 17–26` |
| — | `fonti` | Array di URL usati per verificare i dati del modello (solo in `modelli.json`) | `["https://..."]` |

### Note sui formati
- **Date** (`data_presentazione`, `data_commercializzazione`): sempre `MM/AAAA`.
- **Numeri** (`prezzo_*`, `cambio_*`): solo cifre e punto decimale, niente simboli di valuta.
- **`cambio_usd_eur`**: **media mensile** USD→EUR del mese di *presentazione*, a due decimali.
  Non il cambio di un singolo giorno. Fonti di riferimento, in ordine:
  [tassi BCE](https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=csvdata)
  (pubblicati come USD per 1 EUR: vanno **invertiti**), la serie
  [FRED EXUSEU](https://fred.stlouisfed.org/series/EXUSEU) della Federal Reserve,
  e [x-rates](https://www.x-rates.com/average/?from=USD&to=EUR&amount=1) (dal 2016 in poi).
  Righe dello stesso mese devono avere lo stesso cambio: `tools/validate.py` lo segnala.
- **`periodo_vendita`**: `MM/AAAA - MM/AAAA`, oppure `MM/AAAA - presente` se ancora in vendita.
- **`software`**: intervallo di versioni *major*, con trattino lungo `–` (es. `iOS 5–9`,
  `iPadOS 13–18`, `watchOS 1–10`). Per i prodotti ancora supportati usare l'ultima major nota.
- **Dato non noto / da verificare**: scrivere `?`. Così è immediatamente cercabile e correggibile.
- **Dato non applicabile**: scrivere `n.d.` (es. prodotto non commercializzato ufficialmente in Italia).
- Se un valore contiene una virgola, racchiuderlo tra virgolette doppie: `"1,5 GB"`.

## Valori calcolati dal sito (NON vanno nei dati grezzi)
Il sito calcola e mostra automaticamente questi campi aggiuntivi, partendo dai dati grezzi qui sopra:

- **Prezzo teorico €** = `prezzo_lancio_usd × cambio_usd_eur × 1.22` (IVA italiana al 22%)
- **Aumento %** = `(prezzo_reale_eur − prezzo_teorico_eur) / prezzo_teorico_eur × 100`
- **Anni di vendita** = durata di `periodo_vendita` in mesi, arrotondata all'anno
- **Anni di supporto software** = anno dell'ultima major in `software` − anno di `data_commercializzazione`

In questo modo non devi rifare calcoli a mano e i dati restano sempre coerenti.

## Campi extra (opzionali, per categoria)
Puoi aggiungere altri campi a `modelli.json` o colonne a `varianti.csv` di una categoria (es. per
Apple Watch: `dimensione_cassa`, `connettivita`). Il sito li mostra automaticamente leggendo le
chiavi/l'intestazione, senza modifiche al codice — basta che il loader (`js/data.js`) li unisca
nella riga piatta, cosa che fa già per qualunque campo presente nei due file.

## Il campo `fonti`
Ogni voce di `modelli.json` ha un array `fonti`: gli URL delle pagine usate per verificare i dati
di quel modello (pagina prodotto Apple, comunicato stampa, Wikipedia, EveryMac...). Non è
obbligatorio che sia già pieno per ogni modello — `tools/validate.py --warnings` segnala quelli
ancora vuoti — ma ogni correzione proposta in una pull request deve aggiungere la propria fonte.
