# -*- coding: utf-8 -*-
"""
formatos_br.py
Funcoes auxiliares para exibir e interpretar numeros no padrao
brasileiro: ponto como separador de milhar, virgula como separador
decimal. Ex: 1.234,56

Usado em todos os campos de valor da tela (Frete, Desconto, Valor
Unitario) e nas colunas de valor da tabela de itens.
"""


def formatar_moeda(valor, com_simbolo=True):
    """
    Recebe um numero (int/float) e devolve a string formatada no
    padrao brasileiro. Ex: 1234.5 -> "1.234,50" ou "R$ 1.234,50"
    """
    try:
        valor = float(valor)
    except (TypeError, ValueError):
        valor = 0.0

    texto = f"{valor:,.2f}"  # formato americano: 1,234.50
    texto = texto.replace(",", "X").replace(".", ",").replace("X", ".")  # -> 1.234,50

    return f"R$ {texto}" if com_simbolo else texto


def formatar_numero(valor, casas_decimais=2):
    """
    Mesma logica de formatar_moeda, mas sem o prefixo R$.
    Util para quantidade, percentuais etc.
    """
    try:
        valor = float(valor)
    except (TypeError, ValueError):
        valor = 0.0
    texto = f"{valor:,.{casas_decimais}f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def parse_valor_br(texto):
    """
    Converte uma string no padrao brasileiro (ex: "1.234,56", "R$ 1.234,56",
    "128,50", "10" ou ate mesmo "128.50" tolerando formato americano)
    para float.

    Levanta ValueError se nao conseguir interpretar.
    """
    if texto is None:
        raise ValueError("Valor vazio.")

    txt = str(texto).strip()
    txt = txt.replace("R$", "").strip()

    if not txt:
        raise ValueError("Valor vazio.")

    tem_virgula = "," in txt
    tem_ponto = "." in txt

    if tem_virgula and tem_ponto:
        # formato BR completo: 1.234,56 -> remove pontos de milhar, troca virgula por ponto
        txt = txt.replace(".", "").replace(",", ".")
    elif tem_virgula:
        # so virgula: 128,50 -> 128.50
        txt = txt.replace(",", ".")
    elif tem_ponto:
        # so ponto: pode ser separador de milhar (1.234) ou decimal (128.50)
        # se houver mais de 2 digitos depois do ponto, ou mais de um ponto,
        # tratamos como separador de milhar; senao, como decimal direto.
        partes = txt.split(".")
        if len(partes) > 2 or len(partes[-1]) == 3:
            txt = txt.replace(".", "")
        # caso contrario (ex: "128.50"), mantem como esta - ja e decimal valido em Python

    try:
        return float(txt)
    except ValueError as exc:
        raise ValueError(f"Não consegui entender o valor: {texto!r}") from exc
