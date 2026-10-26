# Configurar o Supabase do MySystem (plano Free, pelo site)

Tempo estimado: 10 minutos. Faça na ordem: o passo 4 depende do 2.

## 1. Criar o projeto
1. Entre em https://supabase.com/dashboard → **New project**.
2. Nome: `mysystem` · Região: **South America (São Paulo)** · Plano: **Free**.
3. Crie uma senha forte para o banco e guarde (não precisa me enviar).

## 2. Criar as tabelas (SQL)
1. No projeto: **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/migrations/20261026120000_init.sql` e clique em **Run**.
3. Deve aparecer "Success. No rows returned".

## 3. Desligar o cadastro público
**Authentication → Sign In / Providers** (ou *Providers → Email*): desligue **Allow new users to sign up**.
Com isso, contas só são criadas pelo admin dentro do sistema.

## 4. Criar a SUA conta (vira admin automaticamente)
**Authentication → Users → Add user → Create new user**
- E-mail: o seu e-mail corporativo
- Senha: a que você quiser usar (mín. 8 caracteres)
- Marque **Auto Confirm User**

O primeiro usuário do projeto vira **administrador** (regra do passo 2). Os próximos, criados pela tela
*Usuários* do sistema, entram como membro (ou admin, se você escolher).

## 5. Publicar a função de gestão de contas
**Edge Functions → Deploy a new function → Via Editor**
- Nome: `admin-users` (exatamente assim)
- Apague o código de exemplo e cole o conteúdo de `supabase/functions/admin-users/index.ts`
- **Deploy**. Deixe "Verify JWT" ligado.

## 6. Me enviar
Em **Project Settings → API** (ou *Data API* / *API Keys*):
- **Project URL** (ex.: `https://abcd1234.supabase.co`)
- **anon public** key (é pública por design; a segurança vem das regras do passo 2)

Não envie a **service_role** key nem a senha do banco.

Com isso o arquivo `.env` é preenchido e o app passa a pedir login. Os dados ficam **só no banco**: nenhum
navegador envia nada.

## 7. (Opcional) Carregar os quadros da LD-504
Se o banco estiver vazio e você quiser os 20 quadros da LD-504 rev. E (um por área + Documentação geral):
**SQL Editor → New query** → cole `supabase/seed/ld-504-rev-e.sql` → **Run**.
Pode rodar de novo sem problema: o que já existe no banco não é alterado.

## Observações do plano Free
- Projeto sem acesso por 7 dias é **pausado**; reativa com um clique no painel (os dados ficam).
- Limites: 500 MB de banco e 50 mil usuários ativos/mês, muito acima do necessário aqui.
