# -*- coding: utf-8 -*-
"""
conciliador.py
Logica de casamento entre lancamentos do extrato bancario (OFX)
e titulos do sistema (contas a pagar/receber via API).

Regras de casamento (conforme escolha do usuario):
  - Valor IDENTICO (diferenca zero)
  - Data do extrato dentro do periodo [vencimento - 5 dias, vencimento + 5 dias]
    (tolerancia de 5 dias pois o banco pode processar em dias diferentes do vencimento)
  - Tipo compativel: saida do banco casa com despesa; entrada com receita

Resultado: tres grupos
  1. CASADOS: lancamento do extrato + titulo correspondente no sistema
  2. SO_NO_BANCO: lancamentos que nao encontraram titulo correspondente
  3. SO_NO_SISTEMA: titulos em aberto que nao tem lancamento no extrato
"""

from datetime import timedelta


TOLERANCIA_DIAS = 5  # margem de dias entre data do extrato e vencimento do titulo


def _apenas_dicts(lista):
    return [item for item in (lista or []) if isinstance(item, dict)]


def _val_despesa(item):
    try:
        return round(float(str(item.get("valor_pag", 0) or 0).replace(",", ".")), 2)
    except (ValueError, TypeError):
        return 0.0


def _val_receita(item):
    try:
        return round(float(str(item.get("valor_rec", 0) or 0).replace(",", ".")), 2)
    except (ValueError, TypeError):
        return 0.0


def _esta_pago_despesa(item):
    int_val = item.get("liquidado_pag_int")
    if int_val is not None:
        return bool(int_val)
    return str(item.get("liquidado_pag", "") or "").strip().lower() in ("sim", "s", "1")


def _esta_pago_receita(item):
    return str(item.get("liquidado_rec", "") or "").strip().lower() in ("sim", "s", "1")


def _data_despesa(item):
    from datetime import datetime
    for campo in ("vencimento_pag",):
        v = item.get(campo, "")
        if v and str(v) not in ("0000-00-00", "", "None"):
            try:
                return datetime.strptime(str(v)[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
    return None


def _data_receita(item):
    from datetime import datetime
    for campo in ("vencimento_rec",):
        v = item.get(campo, "")
        if v and str(v) not in ("0000-00-00", "", "None"):
            try:
                return datetime.strptime(str(v)[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
    return None


def conciliar(transacoes_ofx, despesas_api, receitas_api):
    """
    Executa o casamento entre extrato OFX e titulos do sistema.

    transacoes_ofx: lista de dicts vindos de parser_ofx.ler_ofx()
    despesas_api: lista de dicts vindos de api_client.listar_despesas()
    receitas_api: lista de dicts vindos de api_client.listar_receitas()

    Retorna dict com 3 grupos:
    {
      "casados": [
        {
          "extrato": {...},   # lancamento do OFX
          "titulo": {...},    # titulo do sistema
          "tipo": "despesa"|"receita",
        },
        ...
      ],
      "so_no_banco": [
        {...},  # lancamento do OFX sem titulo correspondente
        ...
      ],
      "so_no_sistema": [
        {
          "titulo": {...},
          "tipo": "despesa"|"receita",
        },
        ...
      ],
    }
    """
    despesas_api = _apenas_dicts(despesas_api)
    receitas_api = _apenas_dicts(receitas_api)

    # Filtra so titulos em aberto
    despesas_abertas = [d for d in despesas_api if not _esta_pago_despesa(d)]
    receitas_abertas = [r for r in receitas_api if not _esta_pago_receita(r)]

    casados = []
    so_no_banco = []

    # Controla quais titulos ja foram casados (evita casar o mesmo titulo duas vezes)
    ids_despesas_casadas = set()
    ids_receitas_casadas = set()

    for t in transacoes_ofx:
        valor_t = round(t["valor_abs"], 2)
        data_t = t["data"]
        tipo_t = t["tipo"]  # "entrada" ou "saida"
        encontrado = False

        if tipo_t == "saida":
            # Saida do banco = despesa no sistema
            for d in despesas_abertas:
                id_d = d.get("id_conta_pag")
                if id_d in ids_despesas_casadas:
                    continue
                valor_d = _val_despesa(d)
                if valor_d != valor_t:
                    continue
                data_d = _data_despesa(d)
                if data_d is None:
                    continue
                diff = abs((data_t - data_d).days)
                if diff <= TOLERANCIA_DIAS:
                    casados.append({
                        "extrato": t,
                        "titulo": d,
                        "tipo": "despesa",
                    })
                    ids_despesas_casadas.add(id_d)
                    encontrado = True
                    break

        elif tipo_t == "entrada":
            # Entrada no banco = receita no sistema
            for r in receitas_abertas:
                id_r = r.get("id_conta_rec")
                if id_r in ids_receitas_casadas:
                    continue
                valor_r = _val_receita(r)
                if valor_r != valor_t:
                    continue
                data_r = _data_receita(r)
                if data_r is None:
                    continue
                diff = abs((data_t - data_r).days)
                if diff <= TOLERANCIA_DIAS:
                    casados.append({
                        "extrato": t,
                        "titulo": r,
                        "tipo": "receita",
                    })
                    ids_receitas_casadas.add(id_r)
                    encontrado = True
                    break

        if not encontrado:
            so_no_banco.append(t)

    # Titulos que nao foram casados com nenhum lancamento do extrato
    so_no_sistema = []
    for d in despesas_abertas:
        if d.get("id_conta_pag") not in ids_despesas_casadas:
            so_no_sistema.append({"titulo": d, "tipo": "despesa"})
    for r in receitas_abertas:
        if r.get("id_conta_rec") not in ids_receitas_casadas:
            so_no_sistema.append({"titulo": r, "tipo": "receita"})

    return {
        "casados": casados,
        "so_no_banco": so_no_banco,
        "so_no_sistema": so_no_sistema,
    }
