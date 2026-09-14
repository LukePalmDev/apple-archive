#!/usr/bin/env python3
"""
Validatore dell'Archivio Apple.

Controlla data/<slug>/modelli.json + data/<slug>/varianti.csv contro lo
schema documentato in data/SCHEMA.md. Esce con codice 1 se trova errori,
0 se passa: adatto a girare in CI su ogni pull request.

    python3 tools/validate.py            # controlla tutto
    python3 tools/validate.py --warnings # mostra anche i sospetti
"""
import csv, json, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

OBBLIGATORIE = ['oggetto', 'modello', 'data_presentazione', 'data_commercializzazione',
                'prezzo_lancio_usd', 'cambio_usd_eur', 'prezzo_reale_eur', 'processore',
                'ram', 'archiviazione', 'schermo', 'batteria', 'periodo_vendita', 'software']

MESE = re.compile(r'^(0[1-9]|1[0-2])/(19|20)\d{2}$')
NUMERO = re.compile(r'^\d+(\.\d+)?$')
IGNOTO = {'?', 'n.d.', 'N.D.'}

errori, avvisi = [], []
def err(nome, r, msg): errori.append(f"{nome} · {r.get('modello','?')} {r.get('archiviazione','') if r.get('archiviazione') not in IGNOTO else ''}  {msg}".strip())
def avv(nome, r, msg): avvisi.append(f"{nome} · {r.get('modello','?')} {r.get('archiviazione','') if r.get('archiviazione') not in IGNOTO else ''}  {msg}".strip())

def mese(s):
    m = re.search(r'(\d{1,2})/(\d{4})', s or '')
    return (int(m.group(2)), int(m.group(1))) if m else None

def capacita(s):
    m = re.search(r'([\d.]+)\s*(GB|TB|MB)', s or '', re.I)
    if not m: return None
    v = float(m.group(1)); u = m.group(2).upper()
    return v * 1024 if u == 'TB' else (v / 1024 if u == 'MB' else v)

# ---- manifest ----
man = os.path.join(DATA, 'categories.csv')
if not os.path.exists(man):
    print('ERRORE: manca data/categories.csv'); sys.exit(1)
categorie = list(csv.DictReader(open(man)))
for c in categorie:
    if re.match(r'^s[iì]$', (c['attiva'] or ''), re.I):
        d = os.path.join(DATA, c['slug'])
        if not (os.path.exists(os.path.join(d, 'modelli.json')) and os.path.exists(os.path.join(d, 'varianti.csv'))):
            errori.append(f"categories.csv  categoria '{c['slug']}' è attiva ma manca data/{c['slug']}/modelli.json o varianti.csv")

# ---- una categoria per volta ----
slug_dirs = sorted(d for d in os.listdir(DATA) if os.path.isdir(os.path.join(DATA, d)) and not d.startswith('.'))
n_categorie = 0
for slug in slug_dirs:
    p_modelli = os.path.join(DATA, slug, 'modelli.json')
    p_varianti = os.path.join(DATA, slug, 'varianti.csv')
    if not (os.path.exists(p_modelli) and os.path.exists(p_varianti)):
        continue
    n_categorie += 1
    nome = f"{slug}/"

    try:
        modelli = json.load(open(p_modelli, encoding='utf-8'))
    except json.JSONDecodeError as e:
        errori.append(f"{nome}modelli.json  JSON non valido: {e}"); continue
    modelli_by_name = {}
    for m in modelli:
        if not m.get('modello', '').strip():
            errori.append(f"{nome}modelli.json  voce con 'modello' vuoto"); continue
        if m['modello'] in modelli_by_name:
            errori.append(f"{nome}modelli.json  modello duplicato: '{m['modello']}'")
        modelli_by_name[m['modello']] = m
        if not m.get('fonti'):
            avvisi.append(f"{nome}modelli.json · {m['modello']}  campo 'fonti' vuoto — nessuna fonte ancora citata")

    with open(p_varianti, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        intestazione_varianti = reader.fieldnames or []
        varianti_grezze = list(reader)

    righe = []  # righe "piatte" ricostruite (specifiche + variante), per i controlli esistenti
    for i, v in enumerate(varianti_grezze, start=2):
        if None in v.values() or len(v) != len(intestazione_varianti):
            errori.append(f"{nome}varianti.csv:{i}  numero di campi errato ({len(v)} invece di {len(intestazione_varianti)})")
            continue
        if not v.get('modello', '').strip():
            errori.append(f"{nome}varianti.csv:{i}  modello vuoto"); continue
        m = modelli_by_name.get(v['modello'])
        if not m:
            errori.append(f"{nome}varianti.csv:{i}  '{v['modello']}' non ha una voce corrispondente in modelli.json"); continue
        r = {**m, **v, '_riga': i}
        righe.append(r)

    intestazione = set(modelli[0].keys()) if modelli else set()
    intestazione |= set(intestazione_varianti)
    for c in OBBLIGATORIE:
        if c not in intestazione:
            errori.append(f"{nome}  manca la colonna obbligatoria '{c}' (né in modelli.json né in varianti.csv)")

    visti = Counter()

    for r in righe:
        for c in ('data_presentazione', 'data_commercializzazione'):
            v = r.get(c, '') or ''
            if v not in IGNOTO and not MESE.match(v):
                err(nome + 'varianti.csv:' + str(r['_riga']), r, f"{c} '{v}' non è nel formato MM/AAAA")

        p, u = mese(r.get('data_presentazione')), mese(r.get('data_commercializzazione'))
        if p and u and u < p:
            err(nome + 'varianti.csv:' + str(r['_riga']), r, f"uscita ({r.get('data_commercializzazione')}) precede l'annuncio ({r.get('data_presentazione')})")

        for c in ('prezzo_lancio_usd', 'cambio_usd_eur', 'prezzo_reale_eur'):
            v = r.get(c, '') or ''
            if v not in IGNOTO and v != '' and not NUMERO.match(v):
                err(nome + 'varianti.csv:' + str(r['_riga']), r, f"{c} '{v}' non è un numero puro")

        cam = r.get('cambio_usd_eur', '') or ''
        if NUMERO.match(cam) and not (0.5 <= float(cam) <= 1.2):
            err(nome + 'varianti.csv:' + str(r['_riga']), r, f"cambio_usd_eur {cam} fuori dall'intervallo plausibile 0.5–1.2")

        pv = r.get('periodo_vendita', '') or ''
        parti = re.split(r'\s*[-–]\s*', pv)
        inizio = mese(parti[0]) if parti else None
        if pv not in IGNOTO:
            if not inizio:
                err(nome + 'varianti.csv:' + str(r['_riga']), r, f"periodo_vendita '{pv}' non inizia con MM/AAAA")
            elif u and inizio != u:
                err(nome + 'varianti.csv:' + str(r['_riga']), r, f"periodo_vendita inizia {parti[0]} ma l'uscita è {r.get('data_commercializzazione')}")
            if len(parti) > 1 and not re.search(r'presente|oggi|in vendita', parti[1], re.I):
                fine = mese(parti[1])
                if fine and inizio and fine < inizio:
                    err(nome + 'varianti.csv:' + str(r['_riga']), r, f"periodo_vendita invertito: '{pv}'")

        try:
            t = float(r['prezzo_lancio_usd']) * float(r['cambio_usd_eur']) * 1.22
            scarto = (float(r['prezzo_reale_eur']) - t) / t * 100
            if not (-15 <= scarto <= 40):
                avv(nome + 'varianti.csv:' + str(r['_riga']), r, f"scarto Italia/teorico {scarto:+.0f}% — verificare prezzo o cambio")
        except (ValueError, TypeError, ZeroDivisionError, KeyError):
            pass

        k = (r['modello'], r.get('archiviazione', ''), r.get('connettivita', ''),
             r.get('dimensione_cassa', ''), r.get('custodia', ''))
        visti[k] += 1

    for k, n in visti.items():
        if n > 1:
            errori.append(f"{nome}varianti.csv  variante duplicata {n} volte: {k}")

    # prezzi crescenti col taglio, a parità di connettività/cassa
    per_modello = defaultdict(list)
    for r in righe:
        per_modello[r['modello']].append(r)
    for m, coppie in per_modello.items():
        gruppi = defaultdict(list)
        for r in coppie:
            gruppi[(r.get('connettivita', ''), r.get('dimensione_cassa', ''))].append(r)
        for _, g in gruppi.items():
            pts = [(capacita(r['archiviazione']), float(r['prezzo_lancio_usd']), r)
                   for r in g
                   if capacita(r['archiviazione']) and NUMERO.match(r.get('prezzo_lancio_usd', ''))]
            pts.sort(key=lambda x: x[0])
            for a, b in zip(pts, pts[1:]):
                if b[1] <= a[1]:
                    err(nome + 'varianti.csv:' + str(b[2]['_riga']), b[2],
                        f"{b[2]['archiviazione']} (${b[1]:.0f}) non costa più di {a[2]['archiviazione']} (${a[1]:.0f})")

print(f"Controllate {n_categorie} categorie di dati.")
if errori:
    print(f"\n❌ {len(errori)} ERRORI\n" + "\n".join("  " + e for e in errori))
if avvisi and ('--warnings' in sys.argv or '-w' in sys.argv):
    print(f"\n⚠️  {len(avvisi)} avvisi\n" + "\n".join("  " + a for a in avvisi))
elif avvisi:
    print(f"\n⚠️  {len(avvisi)} avvisi (rilancia con --warnings per vederli)")
if not errori:
    print("\n✅ Nessun errore.")
sys.exit(1 if errori else 0)
