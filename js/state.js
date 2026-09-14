/* ============================================================
   Stato condiviso e tabelle di riferimento
   ============================================================ */

export const CATS = [];   // [{slug, nome, file, attiva}]  (dal manifest categories.csv)
export const DATA = {};   // slug -> [rows]  (ogni riga arricchita con __slug, __cat)

export const CAT_EMOJI = {
  iphone: '📱', ipad: '📲', 'apple-watch': '⌚️',
  'apple-tv': '📺', cuffie: '🎧', mac: '💻'
};

/* Etichette delle colonne note. Le colonne non elencate qui vengono
   mostrate comunque, con l'intestazione ricavata dal nome del campo. */
export const LABELS = {
  oggetto: 'Oggetto', modello: 'Modello',
  data_presentazione: 'Presentazione', data_commercializzazione: 'Uscita',
  prezzo_lancio_usd: 'Prezzo $', cambio_usd_eur: 'Cambio $→€', prezzo_reale_eur: 'Prezzo reale €',
  processore: 'Processore', ram: 'RAM', archiviazione: 'Archiviazione',
  schermo: 'Schermo', batteria: 'Batteria', periodo_vendita: 'Periodo di vendita', software: 'Software',
  dimensione_cassa: 'Cassa', connettivita: 'Connettività',
  risoluzione_max: 'Risoluzione', hdr: 'HDR', audio: 'Audio', hdmi: 'HDMI',
  ethernet: 'Ethernet', wifi: 'Wi-Fi', bluetooth: 'Bluetooth', thread: 'Thread',
  telecomando: 'Telecomando', dimensioni_mm: 'Dimensioni (mm)', peso_g: 'Peso (g)',
  tipo: 'Tipo', anc: 'Cancellazione rumore', trasparenza: 'Trasparenza',
  audio_spaziale: 'Audio spaziale', autonomia_anc_on_h: 'Autonomia ANC on (h)',
  autonomia_anc_off_h: 'Autonomia ANC off (h)', autonomia_totale_custodia_h: 'Totale con custodia (h)',
  ricarica_rapida: 'Ricarica rapida', custodia: 'Custodia',
  certificazione_ip: 'Certificazione IP', peso_auricolare_g: 'Peso auricolare (g)',
  funzioni_salute: 'Funzioni salute', fonti: 'Fonti'
};
export const KNOWN = Object.keys(LABELS);

/* ---------- Versione major del sistema operativo -> anno di uscita ----------
   Nel 2025 Apple è passata alla numerazione per anno: dopo la 18 viene la 26.
   Le versioni 19–25 non sono mai esistite.
   iOS, iPadOS e tvOS condividono la stessa cadenza dalla 9 in poi, quindi
   una sola mappa li copre tutti; watchOS ha una numerazione propria. */
export const IOS_YEAR = {
  1: 2007, 2: 2008, 3: 2009, 4: 2010, 5: 2011, 6: 2012, 7: 2013, 8: 2014,
  9: 2015, 10: 2016, 11: 2017, 12: 2018, 13: 2019, 14: 2020, 15: 2021,
  16: 2022, 17: 2023, 18: 2024, 26: 2025, 27: 2026
};
export const WATCHOS_YEAR = {
  1: 2015, 2: 2015, 3: 2016, 4: 2017, 5: 2018, 6: 2019, 7: 2020,
  8: 2021, 9: 2022, 10: 2023, 11: 2024, 26: 2025, 27: 2026
};
/* Apple TV Software: le versioni pre-tvOS del set-top box (2007–2015). */
export const ATV_SW_YEAR = {
  1: 2007, 2: 2008, 3: 2010, 4: 2010, 5: 2012, 6: 2013, 7: 2014
};
