"""Gera o SQL de carga dos quadros da LD-504 a partir do JSON (roda no SQL Editor do Supabase, pelo admin).

Uso: python -I scripts/ld-import/to_sql.py src/data/ld-504-rev-e.json supabase/seed/ld-504-rev-e.sql
Idempotente: `on conflict do nothing` não altera quadros/atividades que já existem no banco.
"""
import json, sys

src, out = sys.argv[1], sys.argv[2]
boards = json.load(open(src, encoding="utf-8"))
TAG = "$ld$"


def q(value):
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    assert TAG not in text, "delimitador presente no conteúdo"
    return f"{TAG}{text}{TAG}"


lines = [
    "-- Carga inicial: quadros da LD-5290.00-22000-91A-ST5-504 rev. E (um por área + Documentação geral).",
    "-- Gerado por scripts/ld-import/to_sql.py. Pode rodar mais de uma vez: o que já existe não é alterado.",
    "begin;",
]
for pos, b in enumerate(boards):
    lines.append(
        "insert into public.boards (id, name, description, columns, tags, position, created_at) values "
        f"({q(b['id'])}, {q(b['name'])}, {q(b['description'])}, {q(b['columns'])}::jsonb, {q(b['tags'])}::jsonb, {pos}, {q(b['createdAt'])}::timestamptz) "
        "on conflict (id) do nothing;"
    )
    rows = []
    for i, t in enumerate(b["tasks"]):
        data = {k: v for k, v in t.items() if k != "id"}
        rows.append(f"({q(t['id'])}, {q(b['id'])}, {i}, {q(data)}::jsonb)")
    for start in range(0, len(rows), 100):
        lines.append("insert into public.tasks (id, board_id, position, data) values\n  " + ",\n  ".join(rows[start:start + 100]) + "\non conflict (id) do nothing;")
lines.append("commit;")
open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print(f"{len(boards)} quadros, {sum(len(b['tasks']) for b in boards)} atividades -> {out}")
