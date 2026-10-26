"""Agrupa a LD-504 por documento, pega a revisão mais recente e classifica o status."""
import json, sys, re, collections

REV_ORDER = {"0": 0, "A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}


def norm(v):
    if v is None:
        return ""
    s = str(v).replace("\xa0", " ").strip()
    return "" if s in ("#N/A", "None", "#####") else s


def _valid(y, m, d):
    """Datas impossíveis (ex.: 30/02) caem no último dia do mês."""
    import calendar
    last = calendar.monthrange(int(y), int(m))[1]
    return f"{y}-{m}-{min(int(d), last):02d}"


def is_clamped(v):
    s = norm(v)
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    return bool(m) and _valid(m[3], m[2], m[1]) != f"{m[3]}-{m[2]}-{m[1]}"


def norm_date(v):
    s = norm(v)
    if not s:
        return ""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return _valid(m[1], m[2], m[3])
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        return _valid(m[3], m[2], m[1])
    return ""


def classify(r):
    proposito = norm(r["PROPÓSITO DE EMISSÃO"]).upper()
    escopo = norm(r["ESCOPO"]).upper()
    status = norm(r["STATUS"])
    grdt = norm(r["GRDT"]).upper()
    if "CANCELADO" in (proposito, escopo) or status.lower() == "cancelado" or "CANCELADO" in grdt:
        return "cancelado"
    emitted = bool(norm_date(r["DATA EFETIVA DE EMISSÃO"]) or norm_date(r["DATA DO SIGEM"]) or grdt.startswith("GRDT_"))
    if not emitted:
        return "a_emitir"
    s = status.lower()
    if s == "sem comentários":
        return "aprovado"
    if s == "com comentários":
        return "com_comentarios"
    if s == "recusado":
        return "recusado"
    return "em_analise"


def load(path):
    data = json.load(open(path, encoding="utf-8"))
    docs = []
    for sheet, payload in data.items():
        code_col = [h for h in payload["header"] if h.startswith("DOCUMENTO")][0]
        groups = collections.OrderedDict()
        for r in payload["rows"]:
            code = norm(r[code_col])
            if not code:
                continue
            groups.setdefault(code, []).append(r)
        for code, revs in groups.items():
            revs.sort(key=lambda r: REV_ORDER.get(norm(r["REVISÃO"]).upper(), -1))
            latest = revs[-1]
            docs.append({"sheet": sheet, "code": code, "revs": revs, "latest": latest, "status": classify(latest)})
    return docs


if __name__ == "__main__":
    docs = load(sys.argv[1])
    print("documentos únicos:", len(docs))
    print("status (rev. mais recente):", collections.Counter(d["status"] for d in docs))
    by_sheet = collections.Counter((d["sheet"][:6], d["status"]) for d in docs)
    print(by_sheet)
    active = [d for d in docs if d["status"] != "cancelado"]
    print("ativos:", len(active))
    print("áreas:", collections.Counter(norm(d["latest"]["UNIDADE/ ÁREA"]).replace(" ", "") for d in active))
    print("disciplinas:", collections.Counter(norm(d["latest"]["DISCIPLINA"]) for d in active))
    # tipo do documento: prefixo do código (N-1710) ou trecho do código ST5_RNEST
    def kind(d):
        c = d["code"]
        if c.startswith("ST5_"):
            parts = c.split("_")
            return "ET:" + (parts[4] if len(parts) > 4 else "?")
        return "N1710:" + c.split("-")[0]
    print("tipos:", collections.Counter(kind(d) for d in active).most_common(40))
    # cancelado na última rev mas com revisões anteriores emitidas?
    print("cancelados:", [ (d["code"], norm(d["latest"]["REVISÃO"])) for d in docs if d["status"]=="cancelado"][:50])
    # títulos de exemplo por tipo
    seen=set()
    for d in active:
        k=kind(d)
        if k in seen: continue
        seen.add(k)
        print(" ", k, "|", d["code"], "|", norm(d["latest"]["TÍTULO"])[:90])
