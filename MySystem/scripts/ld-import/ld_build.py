"""Gera o quadro do MySystem a partir da LD-504 rev. E (abas N-1710 e ET vigentes)."""
import json, sys, re, collections, datetime, hashlib
sys.path.insert(0, sys.argv[1])
from ld_classify import load, norm, norm_date, is_clamped

SRC_JSON, OUT = sys.argv[2], sys.argv[3]
TODAY = datetime.date(2026, 10, 26)
IMPORTED_AT = "2026-10-26T12:00:00.000Z"
# Documentos nunca emitidos: a data da rev. E da LD é quando comprovadamente já constavam da lista.
LD_REV_DATE = "2026-10-01T12:00:00.000Z"
BOARD_ID = "import-ld-504-rev-e"

COLUMNS = [
    ("a_emitir", "A emitir", "stone", False),
    ("em_andamento", "Em andamento", "amber", False),
    ("em_analise", "SIGEM", "blue", False),
    ("com_comentarios", "Com comentários", "orange", False),
    ("recusado", "Recusado", "rose", False),
    ("aprovado", "Concluído", "emerald", True),
]

# Responsáveis definidos pelo time, por (área, tipo de documento).
ASSIGNEES = {
    ("U-12", "Completação mecânica"): "Victor Mattos",
}

AREA_HUES = ["amber", "blue", "purple", "emerald", "indigo", "orange", "rose", "yellow", "red", "stone"]


def sid(*parts):
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]


def kind(d):
    code, title = d["code"], norm(d["latest"]["TÍTULO"]).upper()
    if code.startswith("ST5_"):
        seg = code.split("_")
        sub = seg[5].split("-")[0] if len(seg) > 5 else seg[4]
        return {
            "RTACH": "TAC", "RCCM": "Completação mecânica", "RPLS": "Punch list", "RPL": "Punch list",
            "RSOFT": "Firmware", "DBU": "Databook",
        }.get(sub, "Montagem ilha de testes" if "RIMII" in code else "Relatório de campo")
    prefix = code.split("-")[0]
    if "TREINAMENTO" in title:
        return "Treinamento"
    if "PRESERVA" in title:
        return "Preservação"
    if "TESTE DE COMUNICA" in title:
        return "Teste de comunicação"
    return {"PR": "Procedimento / plano", "RL": "Relatório", "LI": "Lista", "CR": "Gestão", "LD": "Gestão"}.get(prefix, "Outros")


KIND_HUES = {
    "TAC": "blue", "Completação mecânica": "indigo", "Punch list": "orange", "Firmware": "purple",
    "Databook": "stone", "Montagem ilha de testes": "yellow", "Procedimento / plano": "emerald",
    "Relatório": "amber", "Treinamento": "rose", "Preservação": "red", "Teste de comunicação": "blue",
    "Lista": "yellow", "Gestão": "stone", "Relatório de campo": "amber", "Outros": "stone",
}

STATUS_LABEL = {"a_emitir": "A emitir", "em_analise": "Em análise", "com_comentarios": "Com comentários",
                "recusado": "Recusado", "aprovado": "Sem comentários (aprovado)"}


def area_of(d):
    return norm(d["latest"]["UNIDADE/ ÁREA"]).replace(" ", "") or "GERAL"


def priority(d, due):
    st = d["status"]
    if st in ("recusado", "com_comentarios"):
        return "alta"
    if st == "a_emitir" and due:
        days = (datetime.date.fromisoformat(due) - TODAY).days
        if days < 0:
            return "alta"
        if days <= 30:
            return "media"
        return "baixa"
    return "media" if st == "em_analise" else "baixa"


def describe(d):
    L = d["latest"]
    disc = norm(L["DISCIPLINA"]).replace("RNEST CISC ", "").title()
    lines = [f"Área: {area_of(d)} · Disciplina: {disc}"]
    if norm(L.get("N-1710", "")):
        lines.append(f"Código N-1710: {norm(L['N-1710'])}")
    grdt = norm(L["GRDT"])
    if grdt.startswith("GRDT_"):
        lines.append(f"GRDT: {grdt}")
    if norm(L["STATUS SIGEM"]):
        lines.append(f"Status SIGEM: {norm(L['STATUS SIGEM'])}")
    if norm(L["QUEM?"]):
        lines.append(f"Revisor: {norm(L['QUEM?'])}")
    if norm_date(L["PRAZO"]):
        lines.append(f"Prazo de análise: {norm_date(L['PRAZO'])}")
    if len(d["revs"]) > 1 or norm_date(L["DATA EFETIVA DE EMISSÃO"]):
        lines.append("")
        lines.append("Histórico de revisões:")
        for r in d["revs"]:
            emit = norm_date(r["DATA EFETIVA DE EMISSÃO"]) or norm_date(r["DATA DO SIGEM"])
            st = norm(r["STATUS"]) or ("não emitida" if not emit else "sem parecer")
            lines.append(f"• Rev. {norm(r['REVISÃO'])}: {'emitida em ' + emit if emit else 'prevista ' + (norm_date(r['DATA PREVISTA DE EMISSÃO']) or '—')} — {st}")
    if is_clamped(L["DATA PREVISTA DE EMISSÃO"]):
        lines.append("")
        lines.append(f"⚠ Data prevista na LD era {norm(L['DATA PREVISTA DE EMISSÃO'])} (inexistente); ajustada para o último dia do mês.")
    lines.append("")
    lines.append(f"Origem: LD-5290.00-22000-91A-ST5-504 rev. E · aba {d['sheet']}")
    return "\n".join(lines)


def iso_ts(date):
    return f"{date}T12:00:00.000Z" if date else None


docs = [d for d in load(SRC_JSON) if d["status"] != "cancelado"]

# Um quadro por área; "GERAL" vira o quadro de Documentação geral e abre a lista.
areas = sorted({area_of(d) for d in docs}, key=lambda a: (a != "GERAL", not a.startswith("U-"), a))


def build_task(d, board_id, col_id, tag_id):
    L = d["latest"]
    rev = norm(L["REVISÃO"]) or "0"
    due = norm_date(L["DATA PREVISTA DE EMISSÃO"])
    first_emit = next((norm_date(r["DATA EFETIVA DE EMISSÃO"]) or norm_date(r["DATA DO SIGEM"])
                       for r in d["revs"] if norm_date(r["DATA EFETIVA DE EMISSÃO"]) or norm_date(r["DATA DO SIGEM"])), "")
    last_emit = norm_date(L["DATA EFETIVA DE EMISSÃO"]) or norm_date(L["DATA DO SIGEM"])
    done_at = norm_date(L["PRAZO"]) or last_emit
    return {
        "id": sid(board_id, "task", d["code"]),
        # Na LD alguns travessões vieram gravados como "¿" (erro de codificação na planilha).
        "title": re.sub(r"\s+", " ", norm(L["TÍTULO"]).replace("¿", "–")),
        "docCode": f"{d['code']} rev. {rev}",
        "description": describe(d),
        "columnId": col_id[d["status"]],
        "tagIds": [tag_id[kind(d)]],
        "priority": priority(d, due),
        "assignee": ASSIGNEES.get((area_of(d), kind(d)), ""),
        "dueDate": due,
        "checklist": [],
        "comments": [],
        "createdAt": iso_ts(first_emit) or LD_REV_DATE,
        "completedAt": iso_ts(done_at) if d["status"] == "aprovado" else None,
    }


boards = []
for area in areas:
    board_id = f"{BOARD_ID}-{area.lower()}"
    area_docs = sorted((d for d in docs if area_of(d) == area),
                       key=lambda d: (norm_date(d["latest"]["DATA PREVISTA DE EMISSÃO"]) or "9999", d["code"]))
    col_id = {k: sid(board_id, "col", k) for k, *_ in COLUMNS}
    kinds = sorted({kind(d) for d in area_docs})
    tags = [{"id": sid(board_id, "kind", k), "name": k, "hue": KIND_HUES.get(k, "stone")} for k in kinds]
    tag_id = {t["name"]: t["id"] for t in tags}
    geral = area == "GERAL"
    boards.append({
        "id": board_id,
        "name": "Documentação geral" if geral else f"{area} · Documentos",
        "description": ("Documentos gerais do comissionamento" if geral else f"Documentação da área {area}")
                       + " · LD-5290.00-22000-91A-ST5-504 rev. E (01/10/2026)",
        "columns": [{"id": col_id[k], "name": n, "hue": h, "isDone": done} for k, n, h, done in COLUMNS],
        "tags": tags,
        "tasks": [build_task(d, board_id, col_id, tag_id) for d in area_docs],
        "createdAt": IMPORTED_AT,
    })

json.dump(boards, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

all_tasks = [t for b in boards for t in b["tasks"]]
print("quadros:", len(boards), "| atividades:", len(all_tasks))
for b in boards:
    by_col = collections.Counter(next(c["name"] for c in b["columns"] if c["id"] == t["columnId"]) for t in b["tasks"])
    print(f"  {b['name']:<22} {len(b['tasks']):>4}  {dict(by_col)}  tipos={[t['name'] for t in b['tags']]}")
print("ids únicos:", len({t["id"] for t in all_tasks}) == len(all_tasks))
