# -*- coding: utf-8 -*-
"""
api_client.py
Modulo responsavel por toda comunicacao com a API VHSYS (ADMORG).

Endpoints utilizados (confirmados na documentacao oficial):
- GET  /clientes                          -> listar clientes/fornecedores
        (campo "tipo_cadastro": Cliente / Fornecedor / Ambos)
- GET  /categorias-financeiras             -> listar categorias FINANCEIRAS
        (plano de contas - usado em Contas a Pagar/Receber; filtramos
        so tipo_categoria="Despesa". Cuidado: NAO confundir com
        /categorias (categoria de PRODUTO) nem /categorias-clientes
        (categoria de CLIENTE/FORNECEDOR) - sao 3 cadastros distintos.)
- GET  /centros-custo                     -> listar centros de custo
- POST /ordens-compra                     -> criar cabecalho da ordem
- POST /ordens-compra/{id_ordem}/produtos -> adicionar itens na ordem
- GET  /ordens-compra/{id_ordem}          -> consultar ordem criada

Detalhes importantes de paginacao (confirmados na doc oficial e validados
com chamadas reais):
- Todos os endpoints de listagem aceitam limit/offset.
- O limite maximo permitido por chamada e 250 registros.
- A resposta inclui um objeto "paging" com total_count (registros nesta
  pagina) e total (total geral) - usado para confirmar que a paginacao
  automatica esta trazendo tudo.
- Em /clientes o "limit" default NAO e documentado como 250 (pode vir
  bem mais baixo, ex: 10), entao este cliente SEMPRE envia limit=250
  explicitamente e pagina via offset ate trazer tudo.
- A API devolve HTTP 403 tambem quando uma lista esta simplesmente
  vazia (ex: "Nenhuma categoria financeira encontrada!"). Isso e
  tratado como lista vazia, nao como erro de autenticacao.
- O endpoint /clientes devolve "data" como lista DIRETA de objetos
  (a documentacao oficial sugere um formato aninhado diferente, mas
  isso nao foi confirmado em chamadas reais).
"""

import requests

LIMITE_MAXIMO_API = 250


class VHSysAPIError(Exception):
    """Erro generico de comunicacao com a API."""
    pass


class VHSysClient:
    def __init__(self, access_token, secret_access_token, base_url="https://api.vhsys.com.br/v2"):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "access-token": access_token,
            "secret-access-token": secret_access_token,
            "Cache-Control": "no-cache",
            "User-Agent": "OrdemDeCompraApp/1.0",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Metodo interno generico
    # ------------------------------------------------------------------
    def _request(self, method, path, json_body=None, params=None):
        url = f"{self.base_url}{path}"
        try:
            resp = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                json=json_body,
                params=params,
                timeout=30,
            )
        except requests.exceptions.RequestException as exc:
            raise VHSysAPIError(f"Falha de conexao com a API: {exc}") from exc

        if resp.status_code == 403:
            detalhe = self._extrair_mensagem_erro(resp)
            # A API VHSYS devolve 403 tambem quando a lista esta vazia,
            # com mensagens do tipo "Nenhuma categoria financeira
            # encontrada!" ou "Nenhum centro de custo encontrado!".
            # Isso NAO e falha de autenticacao - e so "lista vazia" mal
            # modelada pela API. Tratamos como retorno vazio em vez de
            # erro fatal, para nao travar a tela por causa de um
            # cadastro que simplesmente ainda nao tem nada.
            if "encontrad" in detalhe.lower() or "nenhum" in detalhe.lower():
                return {"code": 403, "status": "empty", "data": []}

            raise VHSysAPIError(
                f"Acesso negado (403) ao chamar {method} {path}.\n"
                f"Mensagem da API: {detalhe}\n\n"
                "Possiveis causas: token sem permissao para este modulo, "
                "token incorreto/expirado, ou parametro nao aceito pela API."
            )

        if not resp.ok:
            raise VHSysAPIError(
                f"Erro {resp.status_code} ao chamar {path}: {resp.text[:300]}"
            )

        try:
            data = resp.json()
        except ValueError:
            raise VHSysAPIError(f"Resposta invalida (nao-JSON) de {path}")

        return data

    def _listar_paginado(self, path, params_extra=None, chave_aninhada=None):
        """
        Busca TODOS os registros de um endpoint de listagem, paginando
        automaticamente em blocos de LIMITE_MAXIMO_API (250) via offset,
        ate que a API pare de devolver registros novos.

        chave_aninhada: alguns endpoints (ex: /clientes) devolvem cada
        registro embrulhado assim: {"cliente: ": [ {...} ]} dentro da
        lista "data", em vez do objeto direto. Quando informado, este
        parametro diz qual chave "desembrulhar".
        """
        todos = []
        offset = 0

        while True:
            params = {"limit": LIMITE_MAXIMO_API, "offset": offset}
            if params_extra:
                params.update(params_extra)

            data = self._request("GET", path, params=params)
            pagina = self._extrair_lista(data, chave_aninhada=chave_aninhada)

            if not pagina:
                break

            todos.extend(pagina)

            # Se a pagina voltou com menos que o limite, e a ultima pagina.
            if len(pagina) < LIMITE_MAXIMO_API:
                break

            offset += LIMITE_MAXIMO_API

            # Trava de seguranca: nunca deixa entrar em loop infinito.
            if offset > 50000:
                break

        return todos

    # ------------------------------------------------------------------
    # Centros de custo
    # ------------------------------------------------------------------
    def listar_centros_custo(self):
        """
        Retorna lista de dicts: [{"id_centro_custos": 123, "desc_centro_custos": "VRT 08", ...}, ...]
        Endpoint: GET /centros-custo (limit max 250, paginado automaticamente)
        """
        return self._listar_paginado("/centros-custo")

    def cadastrar_centro_custo(self, descricao, status="Ativo"):
        body = {"desc_centro_custos": descricao.upper(), "status_centro_custos": status}
        data = self._request("POST", "/centros-custo", json_body=body)
        return data.get("data", data)

    # ------------------------------------------------------------------
    # Categorias financeiras (plano de contas)
    # ------------------------------------------------------------------
    def listar_categorias(self, apenas_despesa=True):
        """
        Retorna lista de dicts: [{"id_categoria": 123, "desc_categoria": "PEÇAS", "tipo_categoria": "Despesa", ...}, ...]

        Endpoint correto: GET /categorias-financeiras
        Este sistema tem TRES cadastros de "categoria" diferentes e sem
        relacao entre si:
        1. /categorias            -> categoria de PRODUTO (catalogo)
        2. /categorias-clientes   -> categoria de CLIENTE/FORNECEDOR
        3. /categorias-financeiras -> categoria FINANCEIRA (plano de
           contas usado em Contas a Pagar/Receber) - ESTE e o que
           interessa para classificar itens de Ordem de Compra.

        apenas_despesa=True (padrao): filtra so tipo_categoria="Despesa",
        que e o que faz sentido para uma Ordem de Compra (e uma saida
        de dinheiro). Categorias de "Receita" sao ignoradas.
        """
        lista = self._listar_paginado("/categorias-financeiras")

        if apenas_despesa:
            lista = [
                c for c in lista
                if (c.get("tipo_categoria") or "").strip().lower() == "despesa"
            ]
        return lista

    def cadastrar_categoria(self, nome, tipo="Despesa"):
        body = {"desc_categoria": nome.upper(), "tipo_categoria": tipo}
        data = self._request("POST", "/categorias-financeiras", json_body=body)
        return data.get("data", data)

    # ------------------------------------------------------------------
    # Clientes / Fornecedores
    # ------------------------------------------------------------------
    def listar_clientes(self, busca=None, apenas_fornecedores=True):
        """
        Retorna lista de dicts com os cadastros do sistema.

        O VHSYS guarda Clientes e Fornecedores na MESMA tabela (endpoint
        /clientes); a diferenca esta no campo "tipo_cadastro", que pode
        ser "Cliente", "Fornecedor" ou "Ambos".

        apenas_fornecedores=True (padrao): devolve so quem tem
        tipo_cadastro igual a "Fornecedor" ou "Ambos" - que e o que
        interessa para Ordem de Compra.
        apenas_fornecedores=False: devolve o cadastro completo, sem filtro.

        Se 'busca' for informado, filtra tambem por razao social, nome
        fantasia ou CNPJ (filtro feito aqui no cliente, pois a API nao
        documenta um parametro de busca textual livre - so busca exata
        por campo).
        """
        lista = self._listar_paginado("/clientes")

        if apenas_fornecedores:
            lista = [
                c for c in lista
                if (c.get("tipo_cadastro") or "").strip().lower() in ("fornecedor", "ambos")
            ]

        if busca:
            busca = busca.strip().upper()
            lista = [
                c for c in lista
                if busca in (c.get("razao_cliente") or "").upper()
                or busca in (c.get("fantasia_cliente") or "").upper()
                or busca in (c.get("cnpj_cliente") or "").upper()
            ]
        return lista

    def diagnosticar_clientes(self):
        """
        Metodo de DIAGNOSTICO: faz a chamada crua a /clientes e devolve
        um resumo legivel do que a API respondeu, sem nenhum parsing ou
        filtro. Usar apenas para investigar problemas - nao e chamado
        durante o uso normal do programa.
        """
        url = f"{self.base_url}/clientes"
        resp = requests.request(
            method="GET", url=url, headers=self.headers,
            params={"limit": LIMITE_MAXIMO_API, "offset": 0}, timeout=30,
        )
        linhas = [
            f"Status HTTP: {resp.status_code}",
            f"Corpo bruto (primeiros 1500 caracteres):",
            resp.text[:1500],
        ]
        if resp.ok:
            try:
                corpo = resp.json()
                lista_extraida = self._extrair_lista(corpo)
                linhas.append(f"\nTotal extraido apos parsing: {len(lista_extraida)}")
                if lista_extraida:
                    primeiro = lista_extraida[0]
                    linhas.append(f"Primeiro registro (chaves): {list(primeiro.keys())}")
                    linhas.append(f"tipo_cadastro do primeiro registro: {primeiro.get('tipo_cadastro')!r}")
            except ValueError:
                linhas.append("\n(Resposta nao e JSON valido)")
        return "\n".join(linhas)

    # ------------------------------------------------------------------
    # Ordem de compra
    # ------------------------------------------------------------------
    def criar_ordem_compra(self, cabecalho):
        """
        cabecalho: dict com as chaves esperadas pela API
        (id_cliente, nome_cliente, frete_pedido, desconto_pedido, etc.)
        Retorna o dict de dados da ordem criada (inclui id_ordem).
        """
        data = self._request("POST", "/ordens-compra", json_body=cabecalho)
        return data.get("data", data)

    def adicionar_produtos_ordem(self, id_ordem, itens):
        """
        itens: lista de dicts no formato esperado pela API
        (desc_produto, qtde_produto, valor_unit_produto, etc.)
        Retorna a lista de itens confirmados pela API.
        """
        data = self._request(
            "POST", f"/ordens-compra/{id_ordem}/produtos", json_body=itens
        )
        return data.get("data", data)

    def consultar_ordem_compra(self, id_ordem):
        data = self._request("GET", f"/ordens-compra/{id_ordem}")
        return data.get("data", data)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _extrair_mensagem_erro(resp):
        """
        Tenta extrair a mensagem de erro real devolvida pela API.
        Pelo padrao da documentacao, erros vem como:
        {"code": 403, "status": "error", "data": "Mensagem explicando o motivo"}
        Se nao for JSON, devolve o texto puro da resposta (limitado).
        """
        try:
            corpo = resp.json()
            if isinstance(corpo, dict) and "data" in corpo:
                return str(corpo["data"])
            return str(corpo)
        except ValueError:
            texto = resp.text.strip()
            return texto[:300] if texto else "(resposta vazia)"

    @staticmethod
    def _extrair_lista(data, chave_aninhada=None):
        """
        A API costuma devolver {"code":200,"status":"success","data":[...]}

        IMPORTANTE: a documentacao oficial do endpoint /clientes mostra um
        formato aninhado estranho ({"cliente: ": [...]} dentro de "data"),
        mas testes reais confirmaram que a API de fato devolve uma lista
        direta de objetos, igual aos demais endpoints. Por isso,
        chave_aninhada normalmente NAO deve ser usado - existe apenas como
        suporte de seguranca, caso algum endpoint especifico realmente
        venha nesse formato aninhado no futuro.
        """
        if isinstance(data, dict):
            payload = data.get("data", data)
        else:
            payload = data

        if not isinstance(payload, list):
            if isinstance(payload, dict):
                return list(payload.values())
            return []

        if not chave_aninhada:
            # formato padrao: lista direta de objetos
            return [item for item in payload if isinstance(item, dict)]

        # formato aninhado: cada item pode ser {chave_aninhada: [...]}
        # ou um valor solto (ex: booleano) que deve ser descartado.
        resultado = []
        for item in payload:
            if isinstance(item, dict) and chave_aninhada in item:
                valor = item[chave_aninhada]
                if isinstance(valor, list):
                    resultado.extend(v for v in valor if isinstance(v, dict))
                elif isinstance(valor, dict):
                    resultado.append(valor)
            # itens que nao tem a chave esperada (ex: o "true" solto) sao ignorados
        return resultado

    # ------------------------------------------------------------------
    # Financeiro
    # ------------------------------------------------------------------
    def listar_despesas(self, data_inicio=None, data_fim=None, status=None):
        """
        Retorna lista de contas a pagar.
        data_inicio / data_fim: "AAAA-MM-DD" - filtra por data de vencimento
        status: "Em Aberto" | "Pago" | None (todos)
        """
        params = {}
        if data_inicio:
            params["data_inicio"] = data_inicio
        if data_fim:
            params["data_fim"] = data_fim
        if status:
            params["status"] = status
        return self._listar_paginado("/contas-a-pagar", params_extra=params if params else None)

    def listar_receitas(self, data_inicio=None, data_fim=None, status=None):
        """
        Retorna lista de contas a receber.
        """
        params = {}
        if data_inicio:
            params["data_inicio"] = data_inicio
        if data_fim:
            params["data_fim"] = data_fim
        if status:
            params["status"] = status
        return self._listar_paginado("/contas-a-receber", params_extra=params if params else None)

    def listar_contas_bancarias(self):
        """
        Retorna lista de contas bancarias com saldo atual.
        """
        return self._listar_paginado("/contas-bancarias")
