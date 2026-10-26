import openpyxl, sys, json, collections, datetime

wb = openpyxl.load_workbook(sys.argv[1], data_only=True, read_only=True)
out = {}
for name in ["N-1710", " ET-5290.00.22000-912-1LV-001"]:
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).replace("\n", " ").strip() if h is not None else "" for h in rows[4]]
    data = []
    for r in rows[5:]:
        if r is None or all(v is None for v in r):
            continue
        rec = {}
        for i, h in enumerate(header):
            if i < len(r) and h:
                v = r[i]
                if isinstance(v, datetime.datetime):
                    v = v.date().isoformat()
                rec.setdefault(h, v)
        if not rec.get("ITEM") and not rec.get(header[1]):
            continue
        data.append(rec)
    out[name.strip()] = {"header": header, "rows": data}
    print("==", name, "linhas:", len(data))
    print("header:", [h for h in header if h])
    for col in header:
        if not col:
            continue
        vals = collections.Counter(str(d.get(col)) for d in data)
        if len(vals) <= 30:
            print(f"  [{col}] ", dict(vals.most_common(30)))
        else:
            print(f"  [{col}]  {len(vals)} valores distintos; ex:", list(vals)[:4])

json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
