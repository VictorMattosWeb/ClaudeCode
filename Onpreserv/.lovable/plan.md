## Verificação dos dados

Cruzei `lots.codigo` com `stock_items.nota_fiscal`:

- **65** códigos distintos em lotes
- **15** notas fiscais distintas no estoque
- **7 notas fiscais coincidem exatamente**, conectando **45 lotes** a **52 itens de estoque**

| Nota fiscal | Lotes | Itens de estoque |
|---|---|---|
| 27428 | 5 | 4 |
| 27560 | 8 | 9 |
| 27625 | 11 | 10 |
| 27637 | 18 | 23 |
| 27670 | 1 | 1 |
| 27723 | 1 | 1 |
| 41998 | 1 | 4 |

A relação existe e é **N:N agrupada pela nota fiscal** (vários lotes e vários itens compartilham a mesma NF). Os demais 58 códigos de lote não têm NF correspondente no estoque — provavelmente porque ainda não há item cadastrado, o código não é uma NF, ou está com formato diferente (ex.: `PN-12-291`, `SF1002`).

## Como relacionar no sistema

A chave de ligação é **nota fiscal = código do lote**. Não precisa criar nova tabela — basta consultar dinamicamente.

### Mudanças propostas

1. **No detalhe do Lote** (`LotDetailDialog`)
   - Nova seção "Itens de estoque vinculados (NF: {codigo})"
   - Lista os `stock_items` onde `nota_fiscal = lot.codigo`
   - Cada linha mostra identificador interno, descrição, quantidade — com link para abrir o detalhe do estoque

2. **No detalhe do Item de Estoque** (`StockDetailDialog`)
   - Nova seção "Lotes vinculados (NF: {nota_fiscal})"
   - Lista os `lots` onde `codigo = stock_item.nota_fiscal`
   - Mostra identificador interno do lote, descrição, situação de preservação — com link para o lote

3. **Indicador visual na tabela**
   - Badge "🔗 Vinculado" nas linhas de Lotes cujo código bate com alguma NF do estoque
   - Mesmo badge nas linhas de Estoque cuja NF bate com algum código de lote

4. **(Opcional) Tela de "Vínculos NF"**
   - Página/aba que lista as NFs que conectam os dois módulos, com contagem de lotes e itens
   - Útil para auditoria

### Detalhes técnicos

- Consultas feitas no client a partir dos contextos `useLots()` e `useStock()` já carregados (sem novas queries).
- Comparação por `TRIM()` case-sensitive — as NFs são numéricas, então não há ambiguidade.
- Sem alteração de schema do banco.

### Fora do escopo

- Não vou criar tabela de junção nem foreign key (a relação é derivada).
- Não vou tentar adivinhar vínculos para códigos que não são NF (ex.: `PN-12-291`) — esses ficam sem vínculo até serem padronizados.

Confirma esse caminho? Quer que eu inclua também a tela opcional de "Vínculos NF"?