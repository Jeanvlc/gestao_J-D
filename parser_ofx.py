# -*- coding: utf-8 -*-
"""
parser_ofx.py
Le e interpreta arquivos OFX (Open Financial Exchange) exportados
pelo banco, retornando uma lista de transacoes normalizadas.

Formato OFX e um formato antigo baseado em SGML (parecido com XML
mas sem fechar as tags). Cada transacao tem:
  <STMTTRN>
    <TRNTYPE>DEBIT ou CREDIT
    <DTPOSTED>20260715120000
    <TRNAMT>-1500.00
    <FITID>ID unico da transacao
    <MEMO>Descricao da transacao
  </STMTTRN>

TRNAMT negativo = saida (debito/pagamento)
TRNAMT positivo = entrada (credito/recebimento)
"""

import re
from datetime import datetime


def _extrair_tag(texto, tag):
    """Extrai o valor de uma tag OFX (sem fechamento). Ex: <MEMO>Pagamento"""
    padrao = rf"<{tag}>\s*([^\n<]*)"
    match = re.search(padrao, texto, re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _parse_data_ofx(data_str):
    """
    Converte datas OFX para date do Python.
    Formatos possiveis: 20260715, 20260715120000, 20260715120000[-3:00]
    """
    data_str = str(data_str).strip()
    # Remove timezone e hora se existir
    data_str = re.sub(r"[\[\(].*", "", data_str).strip()
    data_str = data_str[:8]  # so YYYYMMDD
    try:
        return datetime.strptime(data_str, "%Y%m%d").date()
    except ValueError:
        return None


def ler_ofx(caminho_arquivo):
    """
    Le um arquivo OFX e retorna lista de dicts:
    [
      {
        "id": str,           # FITID - ID unico da transacao
        "data": date,        # data da transacao
        "valor": float,      # positivo = entrada, negativo = saida
        "valor_abs": float,  # valor absoluto (sempre positivo)
        "tipo": "entrada"|"saida",
        "descricao": str,    # MEMO da transacao
        "tipo_ofx": str,     # TRNTYPE original (DEBIT, CREDIT, etc.)
      },
      ...
    ]
    Levanta ValueError se o arquivo nao for OFX valido.
    """
    try:
        # Tenta varias encodings comuns em OFX brasileiros
        conteudo = None
        for enc in ("latin-1", "utf-8", "cp1252", "iso-8859-1"):
            try:
                with open(caminho_arquivo, encoding=enc, errors="strict") as f:
                    conteudo = f.read()
                break
            except (UnicodeDecodeError, LookupError):
                continue

        if conteudo is None:
            with open(caminho_arquivo, encoding="latin-1", errors="replace") as f:
                conteudo = f.read()

    except OSError as exc:
        raise ValueError(f"Não consegui abrir o arquivo: {exc}") from exc

    # Verifica se parece OFX
    if "<OFX>" not in conteudo.upper() and "<STMTTRN>" not in conteudo.upper():
        raise ValueError(
            "O arquivo não parece ser um OFX válido.\n"
            "Certifique-se de exportar o extrato no formato OFX pelo seu banco."
        )

    # Extrai todas as transacoes (<STMTTRN>...</STMTTRN> ou ate proxima tag)
    transacoes_raw = re.findall(
        r"<STMTTRN>(.*?)(?:</STMTTRN>|<STMTTRN>)",
        conteudo,
        re.IGNORECASE | re.DOTALL,
    )

    # Fallback: se nao encontrou com fechamento, tenta sem
    if not transacoes_raw:
        partes = re.split(r"<STMTTRN>", conteudo, flags=re.IGNORECASE)
        transacoes_raw = partes[1:]  # ignora o que vem antes do primeiro

    if not transacoes_raw:
        raise ValueError(
            "Nenhuma transação encontrada no arquivo OFX.\n"
            "O arquivo pode estar vazio ou em formato diferente do esperado."
        )

    resultado = []
    for bloco in transacoes_raw:
        tipo_ofx = _extrair_tag(bloco, "TRNTYPE")
        data_str = _extrair_tag(bloco, "DTPOSTED") or _extrair_tag(bloco, "DTUSER")
        valor_str = _extrair_tag(bloco, "TRNAMT")
        fit_id = _extrair_tag(bloco, "FITID")
        memo = _extrair_tag(bloco, "MEMO") or _extrair_tag(bloco, "NAME") or "Sem descrição"

        data = _parse_data_ofx(data_str)
        if data is None:
            continue  # transacao sem data valida: ignora

        try:
            valor = float(valor_str.replace(",", "."))
        except (ValueError, TypeError):
            continue  # transacao sem valor valido: ignora

        resultado.append({
            "id": fit_id or f"{data_str}_{valor_str}",
            "data": data,
            "valor": valor,
            "valor_abs": abs(valor),
            "tipo": "saida" if valor < 0 else "entrada",
            "descricao": memo,
            "tipo_ofx": tipo_ofx,
        })

    return resultado


def resumo_ofx(transacoes):
    """Retorna um dict com totais do extrato para exibicao rapida."""
    entradas = [t for t in transacoes if t["tipo"] == "entrada"]
    saidas = [t for t in transacoes if t["tipo"] == "saida"]
    return {
        "total_transacoes": len(transacoes),
        "total_entradas": len(entradas),
        "total_saidas": len(saidas),
        "valor_entradas": sum(t["valor_abs"] for t in entradas),
        "valor_saidas": sum(t["valor_abs"] for t in saidas),
        "data_inicio": min(t["data"] for t in transacoes) if transacoes else None,
        "data_fim": max(t["data"] for t in transacoes) if transacoes else None,
    }
