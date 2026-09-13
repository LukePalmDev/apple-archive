#!/usr/bin/env python3
"""
Validatore dell'Archivio Apple.

Controlla i CSV in data/ contro lo schema documentato in data/SCHEMA.md.
Esce con codice 1 se trova errori, 0 se passa: adatto a girare in CI su
ogni pull request.

    python3 tools/validate.py            # controlla tutto
    python3 tools/validate.py --warnings # mostra anche i sospetti
"""
import csv, glob, os, re, sys
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
def err(f, riga, msg): errori.append(f"{f}:{riga}  {msg}")
def avv(f, riga, msg): avvisi.append(f"{f}:{riga}  {msg}")

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
        p = os.path.join(DATA, c['file'])
        if not os.path.exists(p):
            errori.append(f"categories.csv  categoria '{c['slug']}' è attiva ma manca {c['file']}")

# ---- un file per volta ----
for path in sorted(glob.glob(os.path.join(DATA, '*.csv'))):
    nome = os.path.basename(path)
    if nome == 'categories.csv': continue
    righe = list(csv.DictReader(open(path)))
    if not righe:
        errori.append(f"{nome}  file vuoto"); continue
    intestazione = list(righe[0].keys())

    for c in OBBLIGATORIE:
        if c not in intestazione:
            errori.append(f"{nome}  manca la colonna obbligatoria '{c}'")

    visti = Counter()
    per_modello = defaultdict(list)

    for i, r in enumerate(righe, start=2):
        if None in r.values() or len(r) != len(intestazione):
            err(nome, i, f"numero di campi errato ({len(r)} invece di {len(intestazione)})"); continue
        if not r['modello'].strip():
            err(nome, i, "modello vuoto"); continue

        for c in ('data_presentazione', 'data_commercializzazione'):
            v = r.get(c, '')
            if v not in IGNOTO and not MESE.match(v):
                err(nome, i, f"{c} '{v}' non è nel formato MM/AAAA")

        p, u = mese(r['data_presentazione']), mese(r['data_commercializzazione'])
        if p and u and u < p:
            err(nome, i, f"{r['modello']}: uscita ({r['data_commercializzazione']}) precede l'annuncio ({r['data_presentazione']})")

        for c in ('prezzo_lancio_usd', 'cambio_usd_eur', 'prezzo_reale_eur'):
            v = r.get(c, '')
            if v not in IGNOTO and v != '' and not NUMERO.match(v):
                err(nome, i, f"{c} '{v}' non è un numero puro")

        cam = r.get('cambio_usd_eur', '')
        if NUMERO.match(cam) and not (0.5 <= float(cam) <= 1.2):
            err(nome, i, f"cambio_usd_eur {cam} fuori dall'intervallo plausibile 0.5–1.2")

        pv = r.get('periodo_vendita', '')
        parti = re.split(r'\s*[-–]\s*', pv)
        inizio = mese(parti[0]) if parti else None
        if pv not in IGNOTO:
            if not inizio:
                err(nome, i, f"periodo_vendita '{pv}' non inizia con MM/AAAA")
            elif u and inizio != u:
                err(nome, i, f"{r['modello']}: periodo_vendita inizia {parti[0]} ma l'uscita è {r['data_commercializzazione']}")
            if len(parti) > 1 and not re.search(r'presente|oggi|in vendita', parti[1], re.I):
                fine = mese(parti[1])
                if fine and inizio and fine < inizio:
                    err(nome, i, f"periodo_vendita invertito: '{pv}'")

        try:
            t = float(r['prezzo_lancio_usd']) * float(r['cambio_usd_eur']) * 1.22
            scarto = (float(r['prezzo_reale_eur']) - t) / t * 100
            if not (-15 <= scarto <= 40):
                avv(nome, i, f"{r['modello']} {r['archiviazione']}: scarto Italia/teorico {scarto:+.0f}% — verificare prezzo o cambio")
        except (ValueError, TypeError, ZeroDivisionError):
            pass

        k = (r['modello'], r.get('archiviazione', ''), r.get('connettivita', ''),
             r.get('dimensione_cassa', ''), r.get('custodia', ''))
        visti[k] += 1
        per_modello[r['modello']].append((i, r))

    for k, n in visti.items():
        if n > 1:
            errori.append(f"{nome}  variante duplicata {n} volte: {k}")

    # coerenza interna al modello + prezzi crescenti col taglio
    for m, coppie in per_modello.items():
        for c in ('data_presentazione', 'data_commercializzazione', 'periodo_vendita', 'software'):
            vals = {r[c] for _, r in coppie if r.get(c)}
            if len(vals) > 1:
                avv(nome, coppie[0][0], f"{m}: '{c}' differisce fra le righe → {sorted(vals)}")
        gruppi = defaultdict(list)
        for i, r in coppie:
            gruppi[(r.get('connettivita', ''), r.get('dimensione_cassa', ''))].append((i, r))
        for _, g in gruppi.items():
            pts = [(capacita(r['archiviazione']), float(r['prezzo_lancio_usd']), i, r)
                   for i, r in g
                   if capacita(r['archiviazione']) and NUMERO.match(r['prezzo_lancio_usd'])]
            pts.sort(key=lambda x: x[0])
            for a, b in zip(pts, pts[1:]):
                if b[1] <= a[1]:
                    err(nome, b[2], f"{m}: {b[3]['archiviazione']} (${b[1]:.0f}) non costa più di {a[3]['archiviazione']} (${a[1]:.0f})")

print(f"Controllati {len(glob.glob(os.path.join(DATA,'*.csv'))) - 1} file di dati.")
if errori:
    print(f"\n❌ {len(errori)} ERRORI\n" + "\n".join("  " + e for e in errori))
if avvisi and ('--warnings' in sys.argv or '-w' in sys.argv):
    print(f"\n⚠️  {len(avvisi)} avvisi\n" + "\n".join("  " + a for a in avvisi))
elif avvisi:
    print(f"\n⚠️  {len(avvisi)} avvisi (rilancia con --warnings per vederli)")
if not errori:
    print("\n✅ Nessun errore.")
sys.exit(1 if errori else 0)
