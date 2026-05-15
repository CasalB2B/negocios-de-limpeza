# Módulo RH — Negócios de Limpeza

Sistema de gestão de carreira e desempenho da equipe de faxineiras.

## Como rodar

O módulo está integrado ao projeto principal. Após clonar:

```bash
npm install
npm run dev
```

Acesse `/admin/rh` após fazer login como admin.

## Banco de dados

Execute o arquivo `supabase_schema_rh.sql` no SQL Editor do seu projeto Supabase.  
Isso cria as 7 tabelas do módulo e insere os dados iniciais (Vanielen + configurações padrão).

## Estrutura

```
pages/admin/rh/
├── AdminRHDashboard.tsx       — KPIs, gráficos, alertas, elegíveis
├── AdminRHColaboradoras.tsx   — CRUD de colaboradoras com indicador de elegibilidade
├── AdminRHDesempenho.tsx      — Registro mensal: faxinas, avaliação, ocorrências
├── AdminRHBonus.tsx           — Calculadora de bônus + histórico
├── AdminRHPromocoes.tsx       — Fluxo de promoção em 3 passos + carta
├── AdminRHConfiguracoes.tsx   — Painel de configurações versionadas
└── README.md

components/
└── RHContext.tsx              — Provider com toda a lógica de negócio
```

## Regras de negócio

### Cargos e remuneração

| Cargo | Remuneração |
|-------|-------------|
| Faxineira Júnior | Por diária: 4h = R$80 · 6h = R$120 · 8h = R$140 + R$10,20 passagem |
| Faxineira Profissional | Por diária: 4h = R$90 · 6h = R$140 · 8h = R$160 + R$10,20 passagem |
| Líder de Equipe | Fixo R$2.200 + bônus |
| Gerente de Equipe | Fixo R$3.000–R$3.500 + bônus |

Todos os valores são editáveis em **Configurações → Remuneração**.

### Cálculo do bônus (Líder de Equipe)

```
Bônus faxinas  = total_faxinas_equipe × multiplicador (padrão: R$ 3,00)
Bônus avaliação = R$ 150 se média_avaliação_equipe ≥ 4,5 (senão R$ 0)
Total bônus    = Bônus faxinas + Bônus avaliação
Total a receber = R$ 2.200 + Total bônus
```

Todos os parâmetros são editáveis em **Configurações → Bônus / Líder**.

### Critérios de promoção

**Júnior → Profissional:** 6 meses na empresa + 3 meses sem ocorrências  
**Profissional → Líder:** 18 meses na empresa + 3 meses sem ocorrências  
**Líder → Gerente:** 36 meses na empresa + 6 meses sem ocorrências + 3 meses consecutivos batendo meta  

Os prazos são editáveis em **Configurações → Critérios de Promoção**.

### Indicador de elegibilidade

- 🟢 **Verde** — todos os critérios quantitativos atingidos
- 🟡 **Amarelo** — dentro de 3 meses do prazo mínimo
- ⚫ **Cinza** — cedo demais

### Configurações versionadas

Cada alteração de configuração **cria um novo registro** com data de vigência — nunca sobrescreve.  
O sistema usa sempre a configuração com `vigencia_fim = null` (atual).  
Bônus já calculados e salvos **não são alterados** por mudanças futuras de configuração.

## Alerta de desempenho baixo

O Dashboard exibe alerta quando uma colaboradora tem **3 meses consecutivos** com média de avaliação abaixo de 4.0.

## Seed inicial

A colaboradora **Vanielen** (Líder de Equipe, 3 anos de empresa) é criada automaticamente no primeiro acesso, com 3 meses de histórico fictício para testar os gráficos.
