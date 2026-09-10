# Tassonomia delle caratteristiche tecniche

Elenco ragionato di **tutto ciò che ha senso archiviare** per ogni categoria di prodotto Apple.
È il documento di riferimento per estendere lo schema: non tutti i campi sono già popolati, ma
la lista definisce *quali esistono*, *come si chiamano* e *in che formato si scrivono*.

Convenzioni ereditate da [`SCHEMA.md`](SCHEMA.md):
- **`?`** = dato non noto, da verificare.
- **`n.d.`** = dato non applicabile a questo prodotto.
- Numeri senza simbolo di valuta o unità: l'unità sta nel **nome del campo** (`peso_g`, `spessore_mm`).
- Date `MM/AAAA`. Booleani: `si` / `no`.
- Elenchi dentro un solo campo: separati da `;` (es. `nero; argento; oro`).

---

## 0 · Campi comuni a tutte le categorie

### 0.1 Identità
| Campo | Significato | Esempio |
|---|---|---|
| `oggetto` | Categoria | `iPhone` |
| `modello` | Nome commerciale | `17 Pro Max` |
| `famiglia` | Sotto-linea di gamma | `Pro`, `SE`, `Ultra`, `Air` |
| `generazione` | Numero di generazione | `3` |
| `nome_interno` | Identificatore software | `iPhone17,2` |
| `numero_modello` | Codice Apple sul retro | `A3084` |
| `codice_ordine` | Part number | `MYX43ZD/A` |
| `nome_progetto` | Nome in codice interno | `D84` |

### 0.2 Ciclo di vita
| Campo | Significato | Formato |
|---|---|---|
| `data_presentazione` | Annuncio | `09/2026` |
| `data_commercializzazione` | Uscita in vendita | `09/2026` |
| `data_dismissione` | Uscita di listino | `09/2028` |
| `periodo_vendita` | Intervallo completo | `09/2026 - presente` |
| `stato_supporto` | Classificazione Apple | `in vendita` / `fuori produzione` / `vintage` / `obsoleto` |
| `evento_lancio` | Keynote di presentazione | `Surprise and shine` |
| `paesi_lancio` | Numero di mercati al debutto | `65` |

### 0.3 Prezzi
| Campo | Significato |
|---|---|
| `prezzo_lancio_usd` | Listino USA al lancio, del taglio specifico |
| `cambio_usd_eur` | Cambio alla presentazione |
| `prezzo_reale_eur` | Listino italiano al lancio |
| `prezzo_finale_eur` | Ultimo listino prima dell'uscita di produzione |
| `prezzo_ricondizionato_eur` | Prezzo nello store ricondizionati |
| `costo_riparazione_schermo_eur` | Tariffa fuori garanzia |
| `costo_riparazione_batteria_eur` | Tariffa fuori garanzia |
| `valore_permuta_eur` | Valore di permuta iniziale |

*Calcolati dal sito, mai nel file:* prezzo teorico €, aumento %, anni di vendita, anni di supporto.

### 0.4 Corpo e materiali
| Campo | Unità / esempio |
|---|---|
| `altezza_mm`, `larghezza_mm`, `spessore_mm` | mm, un decimale |
| `peso_g` | grammi |
| `volume_cm3` | cm³ |
| `materiale_telaio` | `titanio grado 5`, `alluminio 7000`, `acciaio inox` |
| `materiale_fronte` | `Ceramic Shield 2` |
| `materiale_retro` | `vetro opaco`, `alluminio` |
| `colori` | elenco separato da `;` |
| `certificazione_ip` | `IP68` |
| `resistenza_profondita_m` | metri |
| `resistenza_durata_min` | minuti alla profondità dichiarata |
| `contenuto_riciclato_pct` | % di materiale riciclato |
| `impronta_co2_kg` | kg CO₂e sul ciclo di vita |

### 0.5 Sistema operativo
| Campo | Esempio |
|---|---|
| `software` | intervallo major supportate: `iOS 27` |
| `os_lancio` | `iOS 27.0` |
| `os_massimo` | ultima major ricevuta |
| `major_supportate` | numero di major |
| `ultimo_aggiornamento_sicurezza` | `MM/AAAA` |

---

## 1 · iPhone

### 1.1 Chip
`processore` · `processo_nm` · `transistor_miliardi` · `cpu_core_totali` · `cpu_core_performance` ·
`cpu_core_efficienza` · `cpu_frequenza_ghz` · `gpu_core` · `gpu_ray_tracing` · `neural_engine_core` ·
`neural_engine_tops` · `secure_enclave` · `coprocessore_movimento` · `isp` · `motore_video`

### 1.2 Memoria
`ram` · `tipo_ram` (`LPDDR5X`) · `banda_memoria_gbs` · `archiviazione` · `tipo_storage` (`NVMe`) · `espandibile` (`no`)

### 1.3 Display
`schermo` (sintesi) · `schermo_pollici` · `tecnologia_display` (`OLED LTPO`) · `risoluzione_px` (`2868x1320`) ·
`densita_ppi` · `refresh_max_hz` · `refresh_min_hz` · `luminosita_tipica_nit` · `luminosita_hdr_nit` ·
`luminosita_picco_nit` · `luminosita_minima_nit` · `rapporto_contrasto` · `gamma_colore` (`P3`) ·
`true_tone` · `always_on` · `protezione_display` · `dimming_pwm_hz` · `touch_sampling_hz` ·
`rapporto_schermo_corpo_pct` · `tipo_notch` (`Dynamic Island`) · `raggio_angoli_mm`

### 1.4 Fotocamere
**Posteriori**, per ogni obiettivo (`principale`, `ultragrandangolo`, `teleobiettivo`, `teleobiettivo_2`):
`_mp` · `_apertura` (`f/1.78`) · `_apertura_variabile` · `_lunghezza_focale_mm` · `_dimensione_sensore` (`1/1.28"`) ·
`_dimensione_pixel_um` · `_stabilizzazione` (`sensor-shift II`) · `_autofocus` · `_campo_visivo_gradi`

**Zoom:** `zoom_ottico_x` · `zoom_ottico_out_x` · `zoom_digitale_max_x` · `distanza_macro_cm`

**Video:** `video_risoluzione_max` (`4K60`) · `video_slow_motion` · `formati_video` (`ProRes; Log; ACES`) ·
`video_spaziale` · `cinematic_mode` · `action_mode` · `microfoni_studio`

**Foto:** `formati_foto` (`HEIF; ProRAW; JPEG-XL`) · `stili_fotografici` · `photonic_engine` · `flash` · `lidar`

**Frontale:** `frontale_mp` · `frontale_apertura` · `frontale_autofocus` · `frontale_video_max` · `frontale_campo_visivo`

**Biometria:** `sblocco_biometrico` (`Face ID`) · `sensore_biometrico` (`TrueDepth`)

### 1.5 Alimentazione e ricarica
`batteria` (sintesi) · `batteria_mah` · `batteria_wh` · `batteria_tensione_v` · `cicli_carica` ·
`autonomia_video_h` · `autonomia_video_streaming_h` · `autonomia_audio_h` ·
`ricarica_cablata_w` · `ricarica_50pct_min` · `ricarica_wireless_w` · `magsafe_w` · `qi_versione` (`Qi2.2`) ·
`ricarica_inversa_w` · `alimentatore_incluso`

### 1.6 Porte e connettività
`porta` (`USB-C`) · `usb_versione` (`USB 3.2 Gen 2`) · `usb_velocita_gbps` · `display_out` (`DisplayPort`) ·
`wifi_standard` (`Wi-Fi 7`) · `wifi_bande` · `chip_wifi` · `bluetooth_versione` · `nfc` · `uwb_chip` (`U2`) ·
`modem_cellulare` (`Apple C2`) · `reti_supportate` (`5G mmWave; 5G sub-6`) · `bande_5g_numero` ·
`sim` (`eSIM x2`) · `sim_fisica` · `thread` · `satellite` (`SOS; Messaggi; Ricerca stradale`) ·
`gnss` (`GPS L1+L5; GLONASS; Galileo; QZSS; BeiDou`)

### 1.7 Audio e sensori
`altoparlanti` · `microfoni_numero` · `audio_spaziale` · `dolby_atmos` · `jack_cuffie` ·
`sensori` (`accelerometro; giroscopio; barometro; prossimità; luce ambientale`) ·
`rilevamento_incidenti` · `rilevamento_cadute`

---

## 2 · iPad

Eredita quasi tutti i campi iPhone, **meno** quelli cellulari sui modelli Wi-Fi. In più:

`connettivita` (`Wi-Fi` / `Wi-Fi + Cellular`) · `formato` (`Pro`, `Air`, `mini`, `base`) ·
`pencil_supportata` (`Apple Pencil Pro; USB-C`) · `pencil_hover` · `tastiere_compatibili` (`Magic Keyboard`) ·
`smart_connector` · `thunderbolt` · `porte_numero` · `stage_manager` · `display_esterno_max` ·
`orientamento_fotocamera_frontale` (`lato lungo`) · `tandem_oled` · `nano_texture` ·
`altoparlanti_numero` · `center_stage`

---

## 3 · Apple Watch

`dimensione_cassa` (`49 mm`) · `materiale_cassa` · `finitura` · `area_display_mm2` ·
`display_pollici` · `risoluzione_px` · `luminosita_picco_nit` · `always_on` · `refresh_always_on_hz` ·
`vetro` (`zaffiro`) · `attacco_cinturino` (`49 mm`) · `corona_digitale` (`con feedback aptico`) ·
`taptic_engine` · `altoparlante` · `sirena_db`

**Chip:** `processore` (`Apple S10`) · `cpu_core` · `neural_engine_core` · `chip_wireless` (`W3`) ·
`chip_uwb` (`U2`) · `ram` · `archiviazione`

**Sensori salute:** `sensore_frequenza_cardiaca` · `ecg` · `ossigenazione_sangue` · `temperatura_polso` ·
`apnee_sonno` · `notifiche_ritmo_irregolare` · `punteggio_sonno` · `idratazione` ·
`altimetro_sempre_attivo` · `profondimetro_m` · `sensore_temperatura_acqua` · `bussola` ·
`accelerometro_g` (`256 g`) · `giroscopio` · `rilevamento_cadute` · `rilevamento_incidenti`

**Autonomia:** `autonomia_h` · `autonomia_risparmio_h` · `autonomia_allenamento_gps_h` ·
`ricarica_80pct_min` · `ricarica_veloce` · `batteria_mah`

**Connettività:** `connettivita` (`GPS` / `GPS + Cellular`) · `wifi_standard` · `bluetooth_versione` ·
`gnss` (`GPS doppia frequenza L1+L5`) · `satellite` · `nfc` · `esim`

**Certificazioni:** `certificazione_ip` · `wr_rating` (`WR100`) · `iso_immersioni` (`ISO 22810; EN13319`) ·
`mil_std` (`MIL-STD-810H`) · `dispositivo_medico`

---

## 4 · Apple TV

`processore` · `cpu_core` · `gpu_core` · `neural_engine_core` · `ram` · `archiviazione`

**Video:** `risoluzione_max` (`4K 2160p`) · `frame_rate_max` · `hdr_formati` (`Dolby Vision; HDR10+; HLG`) ·
`profondita_colore` · `calibrazione_colore_iphone` · `hdmi_versione` (`HDMI 2.1`) · `hdmi_earc` · `hdmi_cec` ·
`airplay_versione` · `passthrough_frame_rate`

**Audio:** `dolby_atmos` · `dolby_digital` (`7.1`) · `audio_spaziale` · `coppia_homepod` · `audio_condiviso`

**Rete e porte:** `ethernet` (`Gigabit`) · `wifi_standard` · `wifi_thread` · `bluetooth_versione` ·
`porta_usbc` · `ricevitore_infrarossi` · `matter` · `hub_casa`

**Telecomando:** `telecomando_incluso` (`Siri Remote 3ª gen`) · `telecomando_materiale` ·
`telecomando_ricarica` (`USB-C`) · `telecomando_superficie` (`clickpad`) · `telecomando_dovè` (`Dov'è`) ·
`telecomando_accelerometro` · `telecomando_pulsante_siri`

**Fisico:** `altezza_mm` · `larghezza_mm` · `spessore_mm` · `peso_g` · `alimentatore` (`interno`) ·
`consumo_w` · `ventola`

---

## 5 · Cuffie / AirPods

`tipo` (`in-ear` / `semi-in-ear` / `over-ear`) · `chip_auricolare` (`H3`) · `chip_custodia` ·
`driver` (`dinamico custom 11 mm`) · `driver_mm` · `amplificatore` · `risposta_frequenza_hz` ·
`dac` · `equalizzazione_adattiva`

**Funzioni audio:** `cancellazione_rumore` · `anc_generazione` · `modalita_trasparenza` ·
`audio_adattivo` · `rilevamento_conversazione` · `riduzione_suoni_forti` ·
`audio_spaziale_personalizzato` · `tracciamento_testa` · `isolamento_voce` ·
`audio_lossless` · `latenza_ms` · `codec` (`AAC; SBC; lossless proprietario`)

**Salute e accessibilità:** `funzione_apparecchio_acustico` · `test_udito` · `protezione_udito` ·
`frequenza_cardiaca` · `temperatura_corporea` · `traduzione_dal_vivo`

**Batteria — il blocco più richiesto:**
| Campo | Significato |
|---|---|
| `autonomia_anc_on_h` | Ascolto con ANC attiva, singola carica |
| `autonomia_anc_off_h` | Ascolto senza ANC |
| `autonomia_conversazione_h` | Tempo di conversazione |
| `autonomia_totale_custodia_h` | Totale con le ricariche della custodia |
| `ricarica_rapida_min` | Minuti di ricarica… |
| `ricarica_rapida_resa_h` | …per queste ore di ascolto |
| `batteria_auricolare_mah` | Capacità di un auricolare |
| `batteria_custodia_mah` | Capacità della custodia |
| `cicli_carica` | Cicli dichiarati |

**Custodia:** `custodia_connettore` (`USB-C`) · `custodia_magsafe` · `custodia_qi` ·
`custodia_ricarica_watch` · `custodia_altoparlante` · `custodia_uwb` · `custodia_laccio` ·
`custodia_ip` · `custodia_peso_g` · `custodia_dimensioni_mm`

**Fisico:** `peso_auricolare_g` · `dimensioni_auricolare_mm` · `gommini_inclusi` (`XS; S; M; L`) ·
`materiale_gommini` · `certificazione_ip` · `sensore_in_ear` · `microfoni_numero` ·
`beamforming` · `riduzione_rumore_vento` · `controlli` (`sensore di forza; scorrimento volume`)

**Compatibilità:** `bluetooth_versione` · `os_minimo` · `connessione_multipla` · `trova_dovè`

---

## 6 · Mac (categoria futura)

`processore` · `cpu_core_totali` · `cpu_core_performance` · `cpu_core_efficienza` · `gpu_core` ·
`neural_engine_core` · `media_engine` · `ram` · `ram_massima` · `banda_memoria_gbs` ·
`archiviazione` · `archiviazione_massima` · `velocita_ssd_mbs`

`schermo_pollici` · `tecnologia_display` · `risoluzione_px` · `luminosita_nit` · `refresh_hz` ·
`nano_texture` · `webcam_mp` · `center_stage`

`porte` (`3x Thunderbolt 5; HDMI; SDXC; MagSafe 3`) · `thunderbolt_versione` · `thunderbolt_numero` ·
`hdmi_versione` · `display_esterni_max` · `ethernet` · `jack_cuffie`

`tastiera` (`Magic Keyboard retroilluminata`) · `touch_id` · `trackpad` · `altoparlanti_numero` ·
`microfoni_numero` · `dolby_atmos`

`batteria_wh` · `autonomia_video_h` · `autonomia_web_h` · `alimentatore_w` · `ricarica_rapida` ·
`ventole_numero` · `rumore_db`

---

## Nota sulla granularità

Un campo va aggiunto quando serve almeno una di queste cose:
1. **Confrontare** due modelli su una dimensione reale (autonomia, zoom, velocità porta).
2. **Costruire una statistica** (evoluzione della RAM, dei nm, dei prezzi per taglio).
3. **Documentare un dato altrimenti perso** (numero di modello, nome interno, impronta CO₂).

Un campo che non serve a nessuna delle tre è rumore: meglio non averlo.
