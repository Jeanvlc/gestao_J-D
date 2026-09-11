# -*- coding: utf-8 -*-
"""
conciliacao_app.py
Sistema de conciliacao bancaria da V.A. Ribas Preparo de Solo.

Fluxo:
  1. Importa extrato OFX do banco
  2. Busca automaticamente titulos em aberto via API
  3. Casa extrato com titulos por valor identico + data proxima
  4. Exibe 3 grupos: Casados / So no Banco / So no Sistema
  5. "Dar baixa em todos" liquida os casados via API de uma vez
  6. Para os "so no banco", permite cadastrar o lancamento direto no sistema

Abre sem janela preta: use abrir_conciliacao.pyw
"""

import os
import sys
import traceback
import configparser
import threading
from datetime import datetime, date

import tkinter as tk
from tkinter import ttk, messagebox, filedialog

from api_client import VHSysClient, VHSysAPIError
from parser_ofx import ler_ofx, resumo_ofx
from conciliador import conciliar
from formatos_br import formatar_moeda

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini")
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "erro_conciliacao.log")

# Paleta
COR_FUNDO = "#F4F6F5"
COR_CARTAO = "#FFFFFF"
COR_VERDE = "#2E7D32"
COR_VERDE_ESC = "#1B5E20"
COR_VERDE_CL = "#E8F5E9"
COR_VERMELHO = "#C62828"
COR_VERMELHO_CL = "#FFEBEE"
COR_LARANJA = "#E65100"
COR_LARANJA_CL = "#FFF3E0"
COR_AMARELO_CL = "#FFFDE7"
COR_TEXTO = "#263238"
COR_CINZA = "#607D8B"
COR_BORDA = "#D7DEDC"


def carregar_config():
    if not os.path.exists(CONFIG_PATH):
        messagebox.showerror(
            "config.ini não encontrado",
            "Coloque este arquivo na mesma pasta que o config.ini\n"
            "do sistema de Ordem de Compra."
        )
        sys.exit(1)
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH, encoding="utf-8")
    return cfg


class ConciliacaoApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Conciliação Bancária - V. A. Ribas Preparo de Solo")
        self.geometry("1200x750")
        self.minsize(1000, 600)
        self.configure(bg=COR_FUNDO)
        try:
            self.state("zoomed")
        except tk.TclError:
            pass

        self.cfg = carregar_config()
        self.client = VHSysClient(
            access_token=self.cfg.get("api", "access_token", fallback=""),
            secret_access_token=self.cfg.get("api", "secret_access_token", fallback=""),
            base_url=self.cfg.get("api", "base_url", fallback="https://api.vhsys.com.br/v2"),
        )

        # Dados carregados
        self._transacoes_ofx = []
        self._despesas_api = []
        self._receitas_api = []
        self._contas_bancarias = []
        self._resultado = {}

        # Metadados auxiliares
        self._categorias = []
        self._centros_custo = []

        self._configurar_estilo()
        self._montar_layout()

    # ------------------------------------------------------------------
    # Estilo
    # ------------------------------------------------------------------
    def _configurar_estilo(self):
        s = ttk.Style(self)
        try:
            s.theme_use("clam")
        except tk.TclError:
            pass
        fn = ("Segoe UI", 10)
        fnb = ("Segoe UI", 10, "bold")
        s.configure(".", font=fn, background=COR_FUNDO, foreground=COR_TEXTO)
        s.configure("TFrame", background=COR_FUNDO)
        s.configure("TLabel", background=COR_FUNDO, foreground=COR_TEXTO)
        s.configure("TLabelframe", background=COR_CARTAO, foreground=COR_VERDE_ESC,
                    borderwidth=1, relief="solid")
        s.configure("TLabelframe.Label", background=COR_CARTAO,
                    foreground=COR_VERDE_ESC, font=fnb)
        s.configure("TNotebook", background=COR_FUNDO)
        s.configure("TNotebook.Tab", font=fnb, padding=[16, 8],
                    background=COR_FUNDO, foreground=COR_CINZA)
        s.map("TNotebook.Tab",
              background=[("selected", COR_VERDE), ("active", COR_VERDE_CL)],
              foreground=[("selected", "white")])
        s.configure("TButton", font=fn, background=COR_CARTAO,
                    foreground=COR_TEXTO, padding=6, bordercolor=COR_BORDA)
        s.map("TButton", background=[("active", COR_VERDE_CL)])
        s.configure("Acao.TButton", font=fnb, background=COR_VERDE,
                    foreground="white", padding=8, bordercolor=COR_VERDE_ESC)
        s.map("Acao.TButton",
              background=[("active", COR_VERDE_ESC), ("disabled", COR_BORDA)])
        s.configure("Perigo.TButton", font=fnb, background=COR_VERMELHO,
                    foreground="white", padding=8)
        s.map("Perigo.TButton", background=[("active", "#B71C1C")])
        s.configure("Treeview", background=COR_CARTAO, fieldbackground=COR_CARTAO,
                    foreground=COR_TEXTO, rowheight=24)
        s.configure("Treeview.Heading", background=COR_VERDE, foreground="white",
                    font=fnb, relief="flat")
        s.map("Treeview.Heading", background=[("active", COR_VERDE_ESC)])
        s.map("Treeview",
              background=[("selected", COR_VERDE_CL)],
              foreground=[("selected", COR_TEXTO)])

    # ------------------------------------------------------------------
    # Layout
    # ------------------------------------------------------------------
    def _montar_layout(self):
        # Cabecalho
        frame_topo = tk.Frame(self, bg=COR_VERDE, pady=10)
        frame_topo.pack(fill="x")
        tk.Label(frame_topo, text="🏦 CONCILIAÇÃO BANCÁRIA",
                 font=("Segoe UI", 14, "bold"),
                 bg=COR_VERDE, fg="white").pack(side="left", padx=16)
        self.label_status_topo = tk.Label(
            frame_topo, text="Importe um arquivo OFX para começar",
            font=("Segoe UI", 9), bg=COR_VERDE, fg="#A5D6A7")
        self.label_status_topo.pack(side="left", padx=8)

        # Barra de acoes
        frame_acoes = ttk.Frame(self)
        frame_acoes.pack(fill="x", padx=16, pady=8)

        ttk.Button(frame_acoes, text="📂 Importar OFX do banco",
                   style="Acao.TButton",
                   command=self._importar_ofx).pack(side="left")

        ttk.Button(frame_acoes, text="🔄 Buscar títulos do sistema",
                   command=self._buscar_titulos_api).pack(side="left", padx=8)

        ttk.Button(frame_acoes, text="⚡ Conciliar agora",
                   style="Acao.TButton",
                   command=self._executar_conciliacao).pack(side="left")

        # Cartoes de resumo
        frame_resumo = tk.Frame(self, bg=COR_FUNDO)
        frame_resumo.pack(fill="x", padx=16, pady=(0, 8))

        self.cartoes = {}
        definicoes = [
            ("ofx_total", "📋 Lançamentos no extrato", COR_CINZA, "#ECEFF1"),
            ("casados", "✅ Casados", COR_VERDE_ESC, COR_VERDE_CL),
            ("so_banco", "⚠ Só no banco", COR_LARANJA, COR_LARANJA_CL),
            ("so_sistema", "⚠ Só no sistema", COR_VERMELHO, COR_VERMELHO_CL),
        ]
        for chave, titulo, cor_texto, cor_fundo in definicoes:
            frame = tk.Frame(frame_resumo, bg=cor_fundo,
                             highlightbackground=cor_texto, highlightthickness=1,
                             padx=16, pady=8)
            frame.pack(side="left", fill="x", expand=True, padx=4)
            tk.Label(frame, text=titulo, bg=cor_fundo,
                     fg=cor_texto, font=("Segoe UI", 9)).pack(anchor="w")
            lbl = tk.Label(frame, text="—", bg=cor_fundo,
                            fg=cor_texto, font=("Segoe UI", 13, "bold"))
            lbl.pack(anchor="w")
            self.cartoes[chave] = lbl

        # Notebook com as 3 abas
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        self.aba_casados = ttk.Frame(self.notebook, padding=8)
        self.aba_banco = ttk.Frame(self.notebook, padding=8)
        self.aba_sistema = ttk.Frame(self.notebook, padding=8)

        self.notebook.add(self.aba_casados, text="✅  Casados")
        self.notebook.add(self.aba_banco, text="⚠  Só no Banco")
        self.notebook.add(self.aba_sistema, text="⚠  Só no Sistema")

        self._montar_aba_casados()
        self._montar_aba_banco()
        self._montar_aba_sistema()

        self.label_status = ttk.Label(self, text="", foreground=COR_CINZA)
        self.label_status.pack(anchor="w", padx=16, pady=(0, 6))

    # ------------------------------------------------------------------
    # Aba 1: Casados
    # ------------------------------------------------------------------
    def _montar_aba_casados(self):
        frame = self.aba_casados

        frame_btn = ttk.Frame(frame)
        frame_btn.pack(fill="x", pady=(0, 8))
        ttk.Label(frame_btn,
                  text="Lançamentos que casaram perfeitamente (valor idêntico + data próxima).",
                  foreground=COR_CINZA).pack(side="left")
        ttk.Button(frame_btn, text="✅ Dar baixa em TODOS os casados",
                   style="Acao.TButton",
                   command=self._baixar_todos_casados).pack(side="right")

        self.tree_casados = self._criar_tree(frame, [
            ("Data Extrato", 100), ("Descrição Extrato", 220),
            ("Título no Sistema", 220), ("Tipo", 80),
            ("Valor", 120), ("Vencimento", 100), ("Status", 80),
        ], tags_cores={"casado": COR_VERDE_CL, "baixado": "#C8E6C9"})

    # ------------------------------------------------------------------
    # Aba 2: Só no banco
    # ------------------------------------------------------------------
    def _montar_aba_banco(self):
        frame = self.aba_banco

        ttk.Label(frame,
                  text="Lançamentos no extrato do banco sem título correspondente no sistema. "
                       "Selecione um e cadastre direto.",
                  foreground=COR_CINZA, wraplength=900).pack(anchor="w", pady=(0, 6))

        frame_btn = ttk.Frame(frame)
        frame_btn.pack(fill="x", pady=(0, 6))
        ttk.Button(frame_btn, text="➕ Cadastrar selecionado no sistema",
                   command=self._cadastrar_selecionado_banco).pack(side="left")
        ttk.Label(frame_btn,
                  text="(clique em um lançamento, depois em Cadastrar)",
                  foreground=COR_CINZA, font=("Segoe UI", 9)).pack(side="left", padx=8)

        self.tree_banco = self._criar_tree(frame, [
            ("Data", 100), ("Descrição", 300), ("Tipo", 80),
            ("Valor", 120), ("Status", 100),
        ], tags_cores={"saida": COR_LARANJA_CL, "entrada": COR_AMARELO_CL,
                       "cadastrado": COR_VERDE_CL})

    # ------------------------------------------------------------------
    # Aba 3: Só no sistema
    # ------------------------------------------------------------------
    def _montar_aba_sistema(self):
        frame = self.aba_sistema

        ttk.Label(frame,
                  text="Títulos em aberto no sistema sem lançamento correspondente no extrato. "
                       "Verifique se ainda não foi pago ou se há divergência de valor.",
                  foreground=COR_CINZA, wraplength=900).pack(anchor="w", pady=(0, 6))

        self.tree_sistema = self._criar_tree(frame, [
            ("Título", 280), ("Fornecedor/Cliente", 200), ("Tipo", 80),
            ("Vencimento", 100), ("Valor", 120), ("Categoria", 160), ("CC", 120),
        ], tags_cores={"despesa": COR_VERMELHO_CL, "receita": COR_AMARELO_CL})

    # ------------------------------------------------------------------
    # Importar OFX
    # ------------------------------------------------------------------
    def _importar_ofx(self):
        caminho = filedialog.askopenfilename(
            title="Selecionar extrato OFX",
            filetypes=[("OFX", "*.ofx *.OFX"), ("Todos", "*.*")],
        )
        if not caminho:
            return

        try:
            self._transacoes_ofx = ler_ofx(caminho)
            resumo = resumo_ofx(self._transacoes_ofx)
        except ValueError as exc:
            messagebox.showerror("Erro ao ler OFX", str(exc))
            return

        periodo = ""
        if resumo["data_inicio"] and resumo["data_fim"]:
            periodo = (f" | Período: {resumo['data_inicio'].strftime('%d/%m/%Y')} "
                       f"a {resumo['data_fim'].strftime('%d/%m/%Y')}")

        self.label_status_topo.config(
            text=f"OFX: {resumo['total_transacoes']} lançamentos{periodo}")
        self.cartoes["ofx_total"].config(
            text=f"{resumo['total_transacoes']} lançamentos")
        self.label_status.config(
            text=f"OFX importado: {resumo['total_entradas']} entradas "
                 f"({formatar_moeda(resumo['valor_entradas'])}) + "
                 f"{resumo['total_saidas']} saídas "
                 f"({formatar_moeda(resumo['valor_saidas'])}). "
                 f"Clique em 'Buscar títulos do sistema' para continuar."
        )

    # ------------------------------------------------------------------
    # Buscar titulos do sistema
    # ------------------------------------------------------------------
    def _buscar_titulos_api(self):
        if not self._transacoes_ofx:
            messagebox.showwarning("OFX não carregado",
                                   "Importe um arquivo OFX primeiro.")
            return

        self.label_status.config(text="Buscando títulos na API...")
        self.update_idletasks()
        threading.Thread(target=self._buscar_titulos_thread, daemon=True).start()

    def _buscar_titulos_thread(self):
        try:
            self._despesas_api = self.client.listar_despesas()
            self._receitas_api = self.client.listar_receitas()
            self._contas_bancarias = self.client.listar_contas_bancarias()
            self._categorias = self.client.listar_categorias()
            self._centros_custo = self.client.listar_centros_custo()
            self.after(0, lambda: self.label_status.config(
                text=f"{len(self._despesas_api)} despesas e "
                     f"{len(self._receitas_api)} receitas em aberto carregadas. "
                     f"Clique em 'Conciliar agora'."
            ))
        except VHSysAPIError as exc:
            self.after(0, lambda: messagebox.showerror("Erro de API", str(exc)))

    # ------------------------------------------------------------------
    # Executar conciliacao
    # ------------------------------------------------------------------
    def _executar_conciliacao(self):
        if not self._transacoes_ofx:
            messagebox.showwarning("OFX não carregado", "Importe um arquivo OFX primeiro.")
            return
        if not self._despesas_api and not self._receitas_api:
            messagebox.showwarning("Títulos não carregados",
                                   "Clique em 'Buscar títulos do sistema' primeiro.")
            return

        self._resultado = conciliar(
            self._transacoes_ofx, self._despesas_api, self._receitas_api
        )
        self._popular_tudo()

    def _popular_tudo(self):
        r = self._resultado
        n_c = len(r.get("casados", []))
        n_b = len(r.get("so_no_banco", []))
        n_s = len(r.get("so_no_sistema", []))

        self.cartoes["casados"].config(text=str(n_c))
        self.cartoes["so_banco"].config(text=str(n_b))
        self.cartoes["so_sistema"].config(text=str(n_s))

        self._popular_casados(r.get("casados", []))
        self._popular_banco(r.get("so_no_banco", []))
        self._popular_sistema(r.get("so_no_sistema", []))

        self.label_status.config(
            text=f"Conciliação: {n_c} casados | {n_b} só no banco | {n_s} só no sistema"
        )

    def _popular_casados(self, casados):
        self._limpar_tree(self.tree_casados)
        for item in casados:
            ext = item["extrato"]
            tit = item["titulo"]
            tipo = item["tipo"]
            nome_tit = tit.get("nome_conta", "")
            venc = tit.get("vencimento_pag") if tipo == "despesa" else tit.get("vencimento_rec")
            self.tree_casados.insert("", "end", tags=("casado",), iid=ext["id"], values=(
                ext["data"].strftime("%d/%m/%Y"),
                ext["descricao"][:40],
                nome_tit[:40],
                "Débito" if tipo == "despesa" else "Crédito",
                formatar_moeda(ext["valor_abs"]),
                venc or "",
                "Aguardando baixa",
            ))

    def _popular_banco(self, so_banco):
        self._limpar_tree(self.tree_banco)
        for t in so_banco:
            self.tree_banco.insert("", "end",
                                    tags=(t["tipo"],),
                                    iid=t["id"],
                                    values=(
                t["data"].strftime("%d/%m/%Y"),
                t["descricao"][:60],
                "Saída" if t["tipo"] == "saida" else "Entrada",
                formatar_moeda(t["valor_abs"]),
                "Não cadastrado",
            ))

    def _popular_sistema(self, so_sistema):
        self._limpar_tree(self.tree_sistema)
        for item in so_sistema:
            tit = item["titulo"]
            tipo = item["tipo"]
            nome_tit = tit.get("nome_conta", "")
            if tipo == "despesa":
                nome_part = tit.get("nome_fornecedor", "")
                venc = tit.get("vencimento_pag", "")
                valor = tit.get("valor_pag", "0")
                cat = tit.get("categoria_pag", "")
                cc = tit.get("centro_custos_pag", "")
            else:
                nome_part = tit.get("nome_cliente", "")
                venc = tit.get("vencimento_rec", "")
                valor = tit.get("valor_rec", "0")
                cat = tit.get("categoria_rec", "")
                cc = tit.get("centro_custos_rec", "")

            try:
                valor_f = formatar_moeda(float(str(valor).replace(",", ".")))
            except (ValueError, TypeError):
                valor_f = "—"

            self.tree_sistema.insert("", "end", tags=(tipo,), values=(
                nome_tit[:40], nome_part[:30],
                "Despesa" if tipo == "despesa" else "Receita",
                venc, valor_f, cat[:25], cc[:18],
            ))

    # ------------------------------------------------------------------
    # Dar baixa em todos os casados
    # ------------------------------------------------------------------
    def _baixar_todos_casados(self):
        casados = self._resultado.get("casados", [])
        pendentes = [
            c for c in casados
            if self.tree_casados.item(c["extrato"]["id"])["values"][-1] == "Aguardando baixa"
        ]
        if not pendentes:
            messagebox.showinfo("Sem pendentes",
                                "Todos os casados já foram baixados.")
            return

        resp = messagebox.askyesno(
            "Confirmar baixa automática",
            f"Dar baixa em {len(pendentes)} título(s) no sistema?\n\n"
            "Esta ação é irreversível pela API — para desfazer precisaria "
            "entrar no sistema manualmente.\n\nContinuar?",
            icon="warning"
        )
        if not resp:
            return

        self.label_status.config(text="Dando baixa nos títulos...")
        self.update_idletasks()
        threading.Thread(
            target=self._baixar_thread, args=(pendentes,), daemon=True
        ).start()

    def _baixar_thread(self, pendentes):
        sucessos = 0
        erros = []
        for item in pendentes:
            ext = item["extrato"]
            tit = item["titulo"]
            tipo = item["tipo"]
            data_pag = ext["data"].strftime("%Y-%m-%d")
            valor = ext["valor_abs"]

            try:
                if tipo == "despesa":
                    self.client.liquidar_despesa(
                        tit["id_conta_pag"], valor, data_pag)
                else:
                    self.client.liquidar_receita(
                        tit["id_conta_rec"], valor, data_pag)

                # Atualiza status na treeview
                iid = ext["id"]
                self.after(0, lambda i=iid: self._marcar_baixado(i))
                sucessos += 1

            except VHSysAPIError as exc:
                erros.append(f"{tit.get('nome_conta', '')}: {exc}")

        def finalizar():
            msg = f"{sucessos} título(s) baixado(s) com sucesso."
            if erros:
                msg += f"\n\n{len(erros)} erro(s):\n" + "\n".join(erros[:5])
            messagebox.showinfo("Baixa concluída", msg)
            self.label_status.config(text=msg.split("\n")[0])

        self.after(0, finalizar)

    def _marcar_baixado(self, iid):
        try:
            valores = list(self.tree_casados.item(iid)["values"])
            valores[-1] = "✅ Baixado"
            self.tree_casados.item(iid, values=valores, tags=("baixado",))
        except tk.TclError:
            pass

    # ------------------------------------------------------------------
    # Cadastrar lancamento do banco no sistema
    # ------------------------------------------------------------------
    def _cadastrar_selecionado_banco(self):
        sel = self.tree_banco.selection()
        if not sel:
            messagebox.showwarning("Nenhum selecionado",
                                   "Clique em um lançamento da lista primeiro.")
            return

        iid = sel[0]
        # Encontra a transacao correspondente
        transacao = next(
            (t for t in self._resultado.get("so_no_banco", []) if t["id"] == iid), None
        )
        if not transacao:
            return

        self._abrir_janela_cadastro(transacao, iid)

    def _abrir_janela_cadastro(self, transacao, iid):
        """
        Abre janela modal para cadastrar um lancamento no sistema.

        O ponto central desta janela e a separacao entre:
        - Data de competencia/vencimento: quando o gasto/receita OCORREU
          (para fins contabeis e DRE - voce define livremente)
        - Data de pagamento: quando saiu/entrou no banco
          (vem do OFX automaticamente, mas editavel)
        """
        win = tk.Toplevel(self)
        win.title("Cadastrar lançamento no sistema")
        win.geometry("560x520")
        win.grab_set()
        win.configure(bg=COR_FUNDO)

        tipo_sugerido = "Despesa" if transacao["tipo"] == "saida" else "Receita"
        data_pagamento_ofx = transacao["data"].strftime("%d/%m/%Y")
        data_pagamento_api = transacao["data"].strftime("%Y-%m-%d")

        # Cabecalho com info do extrato
        frame_cab = tk.Frame(win, bg="#E3F2FD", padx=12, pady=8)
        frame_cab.pack(fill="x")
        tk.Label(frame_cab, text="Lançamento do extrato bancário:",
                 font=("Segoe UI", 9, "bold"), bg="#E3F2FD").pack(anchor="w")
        tk.Label(frame_cab,
                 text=f"📅 {data_pagamento_ofx}  |  "
                      f"{'💸 Saída' if transacao['tipo'] == 'saida' else '💰 Entrada'}  |  "
                      f"{formatar_moeda(transacao['valor_abs'])}  |  "
                      f"{transacao['descricao'][:55]}",
                 bg="#E3F2FD", font=("Segoe UI", 9)).pack(anchor="w")

        frame_form = ttk.Frame(win)
        frame_form.pack(fill="both", expand=True, padx=16, pady=8)
        frame_form.columnconfigure(1, weight=1)

        linha = 0

        # Tipo
        ttk.Label(frame_form, text="Tipo:").grid(row=linha, column=0, sticky="w", pady=4)
        tipo_var = tk.StringVar(value=tipo_sugerido)
        ttk.Combobox(frame_form, textvariable=tipo_var, values=["Despesa", "Receita"],
                     state="readonly", width=14).grid(row=linha, column=1, sticky="w", pady=4)
        linha += 1

        # Nome
        ttk.Label(frame_form, text="Nome:").grid(row=linha, column=0, sticky="w", pady=4)
        nome_var = tk.StringVar(value=transacao["descricao"][:50])
        ttk.Entry(frame_form, textvariable=nome_var, width=38).grid(
            row=linha, column=1, sticky="we", pady=4)
        linha += 1

        # Valor
        ttk.Label(frame_form, text="Valor (R$):").grid(row=linha, column=0, sticky="w", pady=4)
        valor_var = tk.StringVar(
            value=f"{transacao['valor_abs']:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
        ttk.Entry(frame_form, textvariable=valor_var, width=16).grid(
            row=linha, column=1, sticky="w", pady=4)
        linha += 1

        # Separador visual
        ttk.Separator(frame_form, orient="horizontal").grid(
            row=linha, column=0, columnspan=2, sticky="we", pady=6)
        linha += 1

        # Data de competencia (EDITAVEL - para DRE)
        frame_dcomp = tk.Frame(frame_form, bg=COR_VERDE_CL,
                                highlightbackground=COR_VERDE, highlightthickness=1,
                                padx=8, pady=6)
        frame_dcomp.grid(row=linha, column=0, columnspan=2, sticky="we", pady=4)
        tk.Label(frame_dcomp, text="📋 Data de competência / vencimento",
                 font=("Segoe UI", 9, "bold"), bg=COR_VERDE_CL, fg=COR_VERDE_ESC).pack(anchor="w")
        tk.Label(frame_dcomp,
                 text="Quando o gasto/receita ocorreu — usado na DRE e relatórios contábeis.\n"
                      "Ex: nota fiscal de junho, mesmo que pago em julho → coloque 30/06/2026",
                 bg=COR_VERDE_CL, fg=COR_CINZA, font=("Segoe UI", 8),
                 justify="left").pack(anchor="w")
        frame_dcomp_input = tk.Frame(frame_dcomp, bg=COR_VERDE_CL)
        frame_dcomp_input.pack(fill="x", pady=(4, 0))
        tk.Label(frame_dcomp_input, text="Data:", bg=COR_VERDE_CL).pack(side="left")
        comp_var = tk.StringVar(value=data_pagamento_ofx)  # começa com data do OFX mas editável
        ttk.Entry(frame_dcomp_input, textvariable=comp_var, width=14,
                  font=("Segoe UI", 10, "bold")).pack(side="left", padx=6)
        tk.Label(frame_dcomp_input, text="(DD/MM/AAAA)",
                 bg=COR_VERDE_CL, fg=COR_CINZA, font=("Segoe UI", 8)).pack(side="left")
        linha += 1

        # Data de pagamento (vem do OFX, editavel)
        frame_dpag = tk.Frame(frame_form, bg="#E3F2FD",
                               highlightbackground=COR_CINZA, highlightthickness=1,
                               padx=8, pady=6)
        frame_dpag.grid(row=linha, column=0, columnspan=2, sticky="we", pady=4)
        tk.Label(frame_dpag, text="💳 Data de pagamento (do extrato)",
                 font=("Segoe UI", 9, "bold"), bg="#E3F2FD", fg="#1565C0").pack(anchor="w")
        tk.Label(frame_dpag,
                 text="Quando saiu/entrou no banco — veio do arquivo OFX automaticamente.",
                 bg="#E3F2FD", fg=COR_CINZA, font=("Segoe UI", 8)).pack(anchor="w")
        frame_dpag_input = tk.Frame(frame_dpag, bg="#E3F2FD")
        frame_dpag_input.pack(fill="x", pady=(4, 0))
        tk.Label(frame_dpag_input, text="Data:", bg="#E3F2FD").pack(side="left")
        dpag_var = tk.StringVar(value=data_pagamento_ofx)
        ttk.Entry(frame_dpag_input, textvariable=dpag_var, width=14).pack(side="left", padx=6)
        tk.Label(frame_dpag_input, text="(editável se precisar corrigir)",
                 bg="#E3F2FD", fg=COR_CINZA, font=("Segoe UI", 8)).pack(side="left")
        linha += 1

        ttk.Separator(frame_form, orient="horizontal").grid(
            row=linha, column=0, columnspan=2, sticky="we", pady=6)
        linha += 1

        # Conta bancaria
        ttk.Label(frame_form, text="Conta bancária:").grid(row=linha, column=0, sticky="w", pady=4)
        nomes_contas = [
            f"{c.get('id_conta_bancaria', c.get('id_conta', ''))} - "
            f"{c.get('desc_conta', c.get('nome_conta', ''))}"
            for c in self._contas_bancarias if isinstance(c, dict)
        ]
        conta_var = tk.StringVar(value=nomes_contas[0] if nomes_contas else "")
        ttk.Combobox(frame_form, textvariable=conta_var, values=nomes_contas,
                     state="readonly", width=30).grid(row=linha, column=1, sticky="we", pady=4)
        linha += 1

        # Categoria
        ttk.Label(frame_form, text="Categoria:").grid(row=linha, column=0, sticky="w", pady=4)
        nomes_cat = [c.get("desc_categoria", "") for c in self._categorias if isinstance(c, dict)]
        cat_var = tk.StringVar()
        ttk.Combobox(frame_form, textvariable=cat_var, values=nomes_cat,
                     width=30).grid(row=linha, column=1, sticky="we", pady=4)
        linha += 1

        # Fornecedor/Cliente
        ttk.Label(frame_form, text="Fornecedor/Cliente:").grid(row=linha, column=0, sticky="w", pady=4)
        parceiro_var = tk.StringVar()
        ttk.Entry(frame_form, textvariable=parceiro_var, width=38).grid(
            row=linha, column=1, sticky="we", pady=4)
        linha += 1

        def salvar():
            nome = nome_var.get().strip()
            if not nome:
                messagebox.showwarning("Campo obrigatório", "Preencha o nome.", parent=win)
                return

            try:
                valor_txt = valor_var.get().replace(".", "").replace(",", ".")
                valor = float(valor_txt)
            except ValueError:
                messagebox.showwarning("Valor inválido", "Verifique o valor.", parent=win)
                return

            # Valida data de competencia
            try:
                comp_dt = datetime.strptime(comp_var.get().strip(), "%d/%m/%Y")
                comp_api = comp_dt.strftime("%Y-%m-%d")
            except ValueError:
                messagebox.showwarning("Data inválida",
                                       "Data de competência inválida.\nUse DD/MM/AAAA.", parent=win)
                return

            # Valida data de pagamento
            try:
                dpag_dt = datetime.strptime(dpag_var.get().strip(), "%d/%m/%Y")
                dpag_api = dpag_dt.strftime("%Y-%m-%d")
            except ValueError:
                messagebox.showwarning("Data inválida",
                                       "Data de pagamento inválida.\nUse DD/MM/AAAA.", parent=win)
                return

            # ID da conta bancaria
            id_banco = None
            if nomes_contas and conta_var.get() in nomes_contas:
                idx = nomes_contas.index(conta_var.get())
                c = self._contas_bancarias[idx]
                id_banco = c.get("id_conta_bancaria") or c.get("id_conta")

            # ID da categoria
            id_categoria = None
            if cat_var.get() and cat_var.get() in nomes_cat:
                id_categoria = self._categorias[nomes_cat.index(cat_var.get())].get("id_categoria")

            try:
                if tipo_var.get() == "Despesa":
                    self.client.cadastrar_despesa(
                        nome=nome, valor=valor,
                        vencimento=comp_api,      # data de competencia = vencimento
                        id_banco=id_banco, id_categoria=id_categoria,
                        nome_fornecedor=parceiro_var.get().strip() or None,
                        liquidado=True,           # ja foi pago (veio do extrato)
                        data_pagamento=dpag_api,  # data real do extrato
                    )
                else:
                    self.client.cadastrar_receita(
                        nome=nome, valor=valor,
                        vencimento=comp_api,
                        id_banco=id_banco, id_categoria=id_categoria,
                        nome_cliente=parceiro_var.get().strip() or None,
                        liquidado=True,
                        data_pagamento=dpag_api,
                    )

                valores = list(self.tree_banco.item(iid)["values"])
                valores[-1] = "✅ Cadastrado"
                self.tree_banco.item(iid, values=valores, tags=("cadastrado",))
                self.label_status.config(
                    text=f"'{nome}' cadastrado: competência {comp_var.get()}, "
                         f"pago em {dpag_var.get()}.")
                win.destroy()

            except VHSysAPIError as exc:
                messagebox.showerror("Erro de API", str(exc), parent=win)

        frame_btn = ttk.Frame(win)
        frame_btn.pack(fill="x", padx=16, pady=12)
        ttk.Button(frame_btn, text="Cancelar",
                   command=win.destroy).pack(side="left")
        ttk.Button(frame_btn, text="✔ Salvar no sistema",
                   style="Acao.TButton",
                   command=salvar).pack(side="right")

    # ------------------------------------------------------------------
    # Helpers de treeview
    # ------------------------------------------------------------------
    def _criar_tree(self, parent, colunas, tags_cores=None, height=12):
        frame = ttk.Frame(parent)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)

        ids = [c[0].lower().replace(" ", "_").replace("(", "").replace(")", "")
               for c in colunas]
        tree = ttk.Treeview(frame, columns=ids, show="headings", height=height)

        for (titulo, largura), col_id in zip(colunas, ids):
            tree.heading(col_id, text=titulo)
            ancorar = "e" if "Valor" in titulo else "w"
            tree.column(col_id, width=largura, anchor=ancorar)

        if tags_cores:
            for tag, cor in tags_cores.items():
                tree.tag_configure(tag, background=cor)

        scroll_y = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.grid(row=0, column=0, sticky="nsew")
        scroll_y.grid(row=0, column=1, sticky="ns")
        tree.configure(yscrollcommand=scroll_y.set)
        return tree

    @staticmethod
    def _limpar_tree(tree):
        for item in tree.get_children():
            tree.delete(item)


# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------
def _registrar_erro(tipo_exc, valor_exc, tb):
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"\n{'='*60}\nErro em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n{'='*60}\n")
            traceback.print_exception(tipo_exc, valor_exc, tb, file=f)
    except Exception:
        pass
    try:
        messagebox.showerror("Erro", f"Erro inesperado.\nDetalhes em:\n{LOG_PATH}")
    except Exception:
        pass


def _main():
    sys.excepthook = _registrar_erro
    try:
        app = ConciliacaoApp()
        app.report_callback_exception = _registrar_erro
        app.mainloop()
    except SystemExit:
        raise
    except Exception:
        _registrar_erro(*sys.exc_info())


if __name__ == "__main__":
    _main()
