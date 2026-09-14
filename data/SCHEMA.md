# Schema dati — Archivio Apple

Ogni categoria di prodotto ha **un file CSV** in questa cartella (`data/`).
La **prima riga** di ogni file è l'intestazione standard (i nomi delle colonne) ed è uguale per
tutte le categorie. Aggiungere una nuova categoria = creare un nuovo CSV + una riga in
[`categories.csv`](categories.csv).

> Regola d'oro: **una riga = un taglio di archiviazione acquistabile.**
> Quindi un modello con 4 tagli (es. 256 GB / 512 GB / 1 TB / 2 TB) occupa 4 righe, ognuna col
> proprio prezzo. Le colonne tecniche comuni (processore, RAM, schermo, batteria) si ripetono.

## Intestazione standard (14 colonne)

```
oggetto,modello,data_presentazione,data_commercializzazione,prezzo_lancio_usd,cambio_usd_eur,prezzo_reale_eur,processore,ram,archiviazione,schermo,batteria,periodo_vendita,software
```

| # | Colonna | Significato | Formato / esempio |
|---|---------|-------------|-------------------|
| 1 | `oggetto` | Categoria del prodotto (costante nel file) | `iPhone` |
| 2 | `modello` | Nome del modello | `4S`, `17 Pro Max` |
| 3 | `data_presentazione` | Data dell'annuncio | `MM/AAAA` → `09/2023` |
| 4 | `data_commercializzazione` | Data di uscita in vendita | `MM/AAAA` → `09/2023` |
| 5 | `prezzo_lancio_usd` | Prezzo di lancio in USD **di questo taglio** | numero → `1199` |
| 6 | `cambio_usd_eur` | Cambio USD→EUR alla presentazione | numero → `0.92` |
| 7 | `prezzo_reale_eur` | Prezzo reale di lancio in EUR **di questo taglio** | numero → `1489` |
| 8 | `processore` | Chip | `A17 Pro` |
| 9 | `ram` | Memoria RAM | `8 GB` |
| 10 | `archiviazione` | **Un solo taglio per riga** | `256 GB` |
| 11 | `schermo` | Display | `6.7" OLED` |
| 12 | `batteria` | Batteria | `4422 mAh` |
| 13 | `periodo_vendita` | Periodo in cui Apple lo ha venduto | `09/2023 - presente` |
| 14 | `software` | Versioni OS major supportate (intervallo) | `iOS 17–26` |

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

## Valori calcolati dal sito (NON vanno nel CSV)
Il sito calcola e mostra automaticamente queste colonne aggiuntive, partendo dai dati grezzi qui sopra:

- **Prezzo teorico €** = `prezzo_lancio_usd × cambio_usd_eur × 1.22` (IVA italiana al 22%)
- **Aumento %** = `(prezzo_reale_eur − prezzo_teorico_eur) / prezzo_teorico_eur × 100`
- **Anni di vendita** = durata di `periodo_vendita` in mesi, arrotondata all'anno
- **Anni di supporto software** = anno dell'ultima major in `software` − anno di `data_commercializzazione`

In questo modo non devi rifare calcoli a mano e i dati restano sempre coerenti.

## Colonne extra (opzionali, per categoria)
Puoi aggiungere altre colonne in coda al CSV di una categoria (es. per Apple Watch:
`dimensione_cassa`, `connettivita`). Il sito le mostra automaticamente leggendo l'intestazione,
senza modifiche al codice.
