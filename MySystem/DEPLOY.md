# Deploy do MySystem na Cloudflare

O MySystem é um site estático (React + Vite) que conversa direto com o Supabase. Na Cloudflare ele roda como
**Worker com static assets** (`wrangler.jsonc`): o build `dist/` é servido como SPA, então rotas como
`/painel` e `/atividades/...` funcionam ao recarregar a página.

Já validado localmente com o runtime da Cloudflare (`wrangler dev`): todas as rotas respondem, cabeçalhos de
segurança aplicados (`public/_headers`) e cache de 1 ano nos arquivos com hash.

## Variáveis de build (obrigatórias)
O Vite embute estas variáveis **no momento do build**. Sem elas o site abre com o aviso
"Sistema sem banco de dados configurado".

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://ncjduvvectkpbsiqudin.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | a chave **anon public** (a mesma do `.env`) |

A chave anon é pública por design (vai no JavaScript do site); quem protege os dados são as regras RLS do banco.
**Nunca** coloque a `service_role` em variável de build.

## Opção A: integração Git (recomendada para o time)
1. Suba o código para um repositório no GitHub.
2. Cloudflare → **Workers & Pages → Create → Import a repository**.
3. Configuração do build:
   - **Root directory**: `MySystem` (o projeto está nesta pasta dentro do repositório)
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
4. Em **Settings → Variables and Secrets → Build**, crie as duas variáveis da tabela acima.
5. Cada push na `main` publica sozinho.

## Opção B: deploy a partir desta máquina
```sh
npx wrangler login          # uma vez; abre o navegador
npm run deploy              # build + publica
```
O build usa o `.env` local. O site fica em `https://mysystem.<sua-conta>.workers.dev`.

## Depois do primeiro deploy (Supabase)
Em **Authentication → URL Configuration**:
- **Site URL**: o endereço publicado (ex.: `https://mysystem.<sua-conta>.workers.dev` ou domínio próprio)
- **Redirect URLs**: o mesmo endereço + `http://127.0.0.1:5173` (desenvolvimento)

## Comandos úteis
| Comando | O que faz |
|---|---|
| `npm run dev` | desenvolvimento em http://127.0.0.1:5173 |
| `npm run build` | checa tipos e gera `dist/` |
| `npm run cf:preview` | roda o build com o runtime da Cloudflare localmente |
| `npm test` | testes |
| `npm run deploy` | build + publica na Cloudflare |
