# -*- coding: utf-8 -*-
"""
analise_financeira.py
Logica pura de analise financeira, sem dependencia de tela.
Recebe os dados brutos da API e devolve estruturas prontas para
exibir na tela ou exportar para Excel.

Nomenclatura de campos que a API VHSYS usa (confirmados em testes
reais - podem variar e o codigo trata as alternativas):

Contas a Pagar (/contas-a-pagar):
  id_despesa, desc_despesa, valor_despesa, data_vencimento_despesa,
  data_pagamento_despesa, status_despesa ("Em Aberto" / "Pago"),
  nome_cliente (fornecedor), categoria_despesa, centro_custo_despesa

Contas a Receber (/contas-a-receber):
  id_receita, desc_receita, valor_receita, data_vencimento_receita,
  data_pagamento_receita, status_receita, nome_cliente (cliente),
  categoria_receita, centro_custo_receita

Contas Bancarias (/contas-bancarias):
  id_conta, desc_conta, saldo_conta
"""

from datetime import date, timedelta, datetime


# ------------------------------------------------------------------
# Helpers de campo (a API as vezes usa nomes ligeiramente diferentes)
# ------------------------------------------------------------------
def _val(item, *chaves, default=0.0):
    """Tenta varias chaves em ordem, retorna a primeira que existir."""
    for chave in chaves:
        if chave in item and item[chave] is not None:
            try:
                return float(str(item[chave]).replace(",", "."))
            except (ValueError, TypeError):
                return default
    return default


def _str(item, *chaves, default=""):
    for chave in chaves:
        if chave in item and item[chave]:
            return str(item[chave]).strip()
    return default


def _data(item, *chaves):
    """Converte string AAAA-MM-DD para date, ou None se invalido."""
    for chave in chaves:
        valor = item.get(chave, "")
        if valor and str(valor) not in ("0000-00-00", "", "None"):
            try:
                return datetime.strptime(str(valor)[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
    return None


# ------------------------------------------------------------------
# Analise de boletos atrasados
# ------------------------------------------------------------------
def analisar_atrasados(despesas, receitas, hoje=None):
    """
    Retorna listas de titulos em atraso (vencidos e nao pagos):
    {
        "pagar": [ {..., "dias_atraso": N}, ... ],
        "receber": [ {..., "dias_atraso": N}, ... ],
        "total_pagar": float,
        "total_receber": float,
    }
    """
    hoje = hoje or date.today()

    def filtrar(lista, campo_venc, campo_status, campo_valor, campo_desc, campo_nome):
        atrasados = []
        for item in lista:
            status = _str(item, campo_status, "status_despesa", "status_receita").lower()
            if "pago" in status or "liquidado" in status:
                continue
            venc = _data(item, campo_venc)
            if not venc or venc >= hoje:
                continue
            dias = (hoje - venc).days
            atrasados.append({
                "id": _str(item, "id_despesa", "id_receita"),
                "descricao": _str(item, campo_desc, "desc_despesa", "desc_receita"),
                "nome": _str(item, campo_nome, "nome_cliente", "razao_cliente"),
                "vencimento": venc,
                "dias_atraso": dias,
                "valor": _val(item, campo_valor, "valor_despesa", "valor_receita"),
                "categoria": _str(item, "categoria_despesa", "categoria_receita", "desc_categoria"),
                "centro_custo": _str(item, "centro_custo_despesa", "centro_custo_receita"),
                "gravidade": "critico" if dias > 30 else ("alto" if dias > 7 else "baixo"),
            })
        return sorted(atrasados, key=lambda x: x["dias_atraso"], reverse=True)

    pagar = filtrar(despesas, "data_vencimento_despesa", "status_despesa",
                    "valor_despesa", "desc_despesa", "nome_cliente")
    receber = filtrar(receitas, "data_vencimento_receita", "status_receita",
                      "valor_receita", "desc_receita", "nome_cliente")

    return {
        "pagar": pagar,
        "receber": receber,
        "total_pagar": sum(i["valor"] for i in pagar),
        "total_receber": sum(i["valor"] for i in receber),
    }


# ------------------------------------------------------------------
# Analise de titulos a vencer (proximos N dias)
# ------------------------------------------------------------------
def analisar_a_vencer(despesas, receitas, dias=15, hoje=None):
    """
    Retorna titulos em aberto que vencem nos proximos 'dias' dias.
    {
        "pagar": [ {..., "dias_para_vencer": N}, ... ],
        "receber": [ {..., "dias_para_vencer": N}, ... ],
        "total_pagar": float,
        "total_receber": float,
    }
    """
    hoje = hoje or date.today()
    limite = hoje + timedelta(days=dias)

    def filtrar(lista, campo_venc, campo_status, campo_valor, campo_desc, campo_nome):
        resultado = []
        for item in lista:
            status = _str(item, campo_status, "status_despesa", "status_receita").lower()
            if "pago" in status or "liquidado" in status:
                continue
            venc = _data(item, campo_venc)
            if not venc or venc < hoje or venc > limite:
                continue
            resultado.append({
                "id": _str(item, "id_despesa", "id_receita"),
                "descricao": _str(item, campo_desc, "desc_despesa", "desc_receita"),
                "nome": _str(item, campo_nome, "nome_cliente", "razao_cliente"),
                "vencimento": venc,
                "dias_para_vencer": (venc - hoje).days,
                "valor": _val(item, campo_valor, "valor_despesa", "valor_receita"),
                "categoria": _str(item, "categoria_despesa", "categoria_receita"),
                "centro_custo": _str(item, "centro_custo_despesa", "centro_custo_receita"),
                "urgencia": "hoje" if venc == hoje else ("amanha" if (venc - hoje).days == 1 else "normal"),
            })
        return sorted(resultado, key=lambda x: x["vencimento"])

    pagar = filtrar(despesas, "data_vencimento_despesa", "status_despesa",
                    "valor_despesa", "desc_despesa", "nome_cliente")
    receber = filtrar(receitas, "data_vencimento_receita", "status_receita",
                      "valor_receita", "desc_receita", "nome_cliente")

    return {
        "pagar": pagar,
        "receber": receber,
        "total_pagar": sum(i["valor"] for i in pagar),
        "total_receber": sum(i["valor"] for i in receber),
    }


# ------------------------------------------------------------------
# Fluxo de caixa futuro (projecao dia a dia)
# ------------------------------------------------------------------
def calcular_fluxo_caixa(despesas, receitas, contas_bancarias,
                          dias=30, hoje=None):
    """
    Projeta o saldo dia a dia pelos proximos 'dias' dias.

    Ponto de partida: soma dos saldos de todas as contas bancarias.
    A partir dai, soma receitas e subtrai despesas de cada dia.

    Retorna:
    {
        "saldo_inicial": float,
        "dias": [
            {
                "data": date,
                "entradas": float,
                "saidas": float,
                "saldo_dia": float,   # saldo acumulado ao final do dia
                "saldo_negativo": bool,
                "itens_entrada": [...],
                "itens_saida": [...],
            },
            ...
        ],
        "menor_saldo": float,
        "data_menor_saldo": date,
        "dias_negativos": int,
    }
    """
    hoje = hoje or date.today()

    # Saldo inicial = soma das contas bancarias
    saldo_inicial = sum(
        _val(c, "saldo_conta", "saldo_atual_conta", "saldo")
        for c in contas_bancarias
    )

    # Indexa entradas e saidas por data
    entradas_por_dia = {}
    saidas_por_dia = {}

    for item in receitas:
        status = _str(item, "status_receita", "status_despesa").lower()
        if "pago" in status or "liquidado" in status:
            continue
        venc = _data(item, "data_vencimento_receita")
        if not venc or venc < hoje or venc > hoje + timedelta(days=dias):
            continue
        entradas_por_dia.setdefault(venc, []).append({
            "descricao": _str(item, "desc_receita", "desc_despesa"),
            "nome": _str(item, "nome_cliente", "razao_cliente"),
            "valor": _val(item, "valor_receita", "valor_despesa"),
        })

    for item in despesas:
        status = _str(item, "status_despesa", "status_receita").lower()
        if "pago" in status or "liquidado" in status:
            continue
        venc = _data(item, "data_vencimento_despesa")
        if not venc or venc < hoje or venc > hoje + timedelta(days=dias):
            continue
        saidas_por_dia.setdefault(venc, []).append({
            "descricao": _str(item, "desc_despesa", "desc_receita"),
            "nome": _str(item, "nome_cliente", "razao_cliente"),
            "valor": _val(item, "valor_despesa", "valor_receita"),
        })

    # Projeta dia a dia
    saldo_corrente = saldo_inicial
    resultado_dias = []
    menor_saldo = saldo_inicial
    data_menor_saldo = hoje
    dias_negativos = 0

    for i in range(dias + 1):
        data = hoje + timedelta(days=i)
        itens_entrada = entradas_por_dia.get(data, [])
        itens_saida = saidas_por_dia.get(data, [])
        entradas = sum(it["valor"] for it in itens_entrada)
        saidas = sum(it["valor"] for it in itens_saida)
        saldo_corrente = saldo_corrente + entradas - saidas

        if saldo_corrente < menor_saldo:
            menor_saldo = saldo_corrente
            data_menor_saldo = data
        if saldo_corrente < 0:
            dias_negativos += 1

        resultado_dias.append({
            "data": data,
            "entradas": entradas,
            "saidas": saidas,
            "saldo_dia": saldo_corrente,
            "saldo_negativo": saldo_corrente < 0,
            "itens_entrada": itens_entrada,
            "itens_saida": itens_saida,
        })

    return {
        "saldo_inicial": saldo_inicial,
        "dias": resultado_dias,
        "menor_saldo": menor_saldo,
        "data_menor_saldo": data_menor_saldo,
        "dias_negativos": dias_negativos,
    }
