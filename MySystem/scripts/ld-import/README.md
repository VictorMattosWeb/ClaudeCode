# Importação da LD-504 para o MySystem

Gera `src/data/ld-504-rev-e.json` (um quadro por área + Documentação geral) a partir da planilha da Lista de Documentos (abas vigentes `N-1710` e `ET-5290.00.22000-912-1LV-001`).

```sh
python -I scripts/ld-import/ld_analyze.py "LD-5290.00-22000-91A-ST5-504_E - 01.10.2026.xlsx" ld.json
python -I scripts/ld-import/ld_build.py scripts/ld-import ld.json src/data/ld-504-rev-e.json
```

Regras:
- Um card por documento, usando a **revisão mais recente** (0 < A < B < C < D…).
- Cancelados (propósito/escopo "CANCELADO", status "Cancelado" ou GRDT "EMISSAO DE DOC. CANCELADO") ficam de fora.
- Etapa: não emitido → **A emitir**; emitido sem parecer → **Em análise**; "Com Comentários" → **Com comentários**;
  "Recusado" → **Recusado**; "Sem Comentários" → **Concluído**.
- Quadros: um por UNIDADE/ÁREA; "GERAL" vira **Documentação geral**. Etiquetas: tipo do documento.
- Datas impossíveis (ex.: 30/02) caem no último dia do mês e ficam anotadas na descrição.

Para uma nova revisão da LD, ajuste o nome das abas em `ld_analyze.py`, o `BOARD_ID`/nome do quadro em `ld_build.py`
e o import em `src/data/bundledBoards.ts`.
