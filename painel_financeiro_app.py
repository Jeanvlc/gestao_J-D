# -*- coding: utf-8 -*-
"""
painel_financeiro_app.py
Painel financeiro da V.A. Ribas Preparo de Solo.

3 abas:
  1. Boletos Atrasados  — titulos vencidos e nao pagos, por gravidade
  2. A Vencer (15 dias) — o que vence em breve, pra nao virar atraso
  3. Fluxo de Caixa     — projecao dia a dia dos proximos 30 dias

Como usar:
  - Coloque este arquivo na mesma pasta que api_client.py e config.ini
  - Abra com duplo clique em abrir_painel.pyw (sem janela preta)
    ou rode: python painel_financeiro_app.py
"""

import os
import sys
import traceback
import configparser
import threading
from datetime import date, timedelta, datetime

import tkinter as tk
from tkinter import ttk, messagebox, filedialog

from api_client import VHSysClient, VHSysAPIError
from analise_financeira import (
    analisar_atrasados, analisar_a_vencer, calcular_fluxo_caixa
)
from exportar_financeiro import exportar_painel
from formatos_br import formatar_moeda

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini")
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "erro_painel.log")

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


# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
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


# ------------------------------------------------------------------
# App principal
# ------------------------------------------------------------------
class PainelFinanceiroApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Painel Financeiro - V. A. Ribas Preparo de Solo")
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

        # dados brutos armazenados para exportacao
        self._dados_atrasados = {}
        self._dados_a_vencer = {}
        self._dados_fluxo = {}

        self._configurar_estilo()
        self._montar_layout()
        self._carregar_dados()

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

        s.configure("TNotebook", background=COR_FUNDO, tabmargins=[2, 5, 2, 0])
        s.configure("TNotebook.Tab", font=fnb, padding=[16, 8],
                    background=COR_FUNDO, foreground=COR_CINZA)
        s.map("TNotebook.Tab",
              background=[("selected", COR_VERDE), ("active", COR_VERDE_CL)],
              foreground=[("selected", "white"), ("active", COR_VERDE_ESC)])

        s.configure("TButton", font=fn, background=COR_CARTAO,
                    foreground=COR_TEXTO, padding=6, bordercolor=COR_BORDA)
        s.map("TButton", background=[("active", COR_VERDE_CL)])

        s.configure("Atualizar.TButton", font=fnb, background=COR_VERDE,
                    foreground="white", padding=8, bordercolor=COR_VERDE_ESC)
        s.map("Atualizar.TButton",
              background=[("active", COR_VERDE_ESC), ("disabled", COR_BORDA)])

        for nome, bg, fg in [
            ("Critico.TLabel", COR_VERMELHO_CL, COR_VERMELHO),
            ("Alto.TLabel", COR_LARANJA_CL, COR_LARANJA),
            ("Normal.TLabel", COR_AMARELO_CL, COR_LARANJA),
            ("OK.TLabel", COR_VERDE_CL, COR_VERDE_ESC),
        ]:
            s.configure(nome, background=bg, foreground=fg,
                        font=fnb, padding=4)

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
        # Cabecalho fixo
        frame_topo = tk.Frame(self, bg=COR_VERDE, pady=10)
        frame_topo.pack(fill="x")

        tk.Label(frame_topo, text="📊 PAINEL FINANCEIRO",
                 font=("Segoe UI", 14, "bold"),
                 bg=COR_VERDE, fg="white").pack(side="left", padx=16)

        self.label_atualizacao = tk.Label(
            frame_topo, text="", font=("Segoe UI", 9),
            bg=COR_VERDE, fg="#A5D6A7")
        self.label_atualizacao.pack(side="left", padx=8)

        ttk.Button(frame_topo, text="↻ Atualizar dados",
                   style="Atualizar.TButton",
                   command=self._carregar_dados).pack(side="right", padx=16)

        ttk.Button(frame_topo, text="📥 Exportar Excel",
                   command=self._exportar_excel).pack(side="right", padx=4)

        # Cartoes de resumo
        self.frame_cartoes = tk.Frame(self, bg=COR_FUNDO, pady=8)
        self.frame_cartoes.pack(fill="x", padx=16)
        self._criar_cartoes()

        # Notebook com as 3 abas
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        self.aba_atrasados = ttk.Frame(self.notebook, padding=8)
        self.aba_vencer = ttk.Frame(self.notebook, padding=8)
        self.aba_fluxo = ttk.Frame(self.notebook, padding=8)

        self.notebook.add(self.aba_atrasados, text="🔴  Atrasados")
        self.notebook.add(self.aba_vencer, text="🟡  A Vencer (15 dias)")
        self.notebook.add(self.aba_fluxo, text="📈  Fluxo de Caixa (30 dias)")

        self._montar_aba_atrasados()
        self._montar_aba_a_vencer()
        self._montar_aba_fluxo()

        # Rodape de status
        self.label_status = ttk.Label(
            self, text="Carregando dados da API...", foreground=COR_CINZA)
        self.label_status.pack(anchor="w", padx=16, pady=(0, 6))

    def _criar_cartoes(self):
        """Cria os 4 cartoes de resumo no topo."""
        self.cartoes = {}
        definicoes = [
            ("atrasado_pagar", "💸 Atrasado a Pagar", COR_VERMELHO, COR_VERMELHO_CL),
            ("atrasado_receber", "💰 Atrasado a Receber", COR_VERDE_ESC, COR_VERDE_CL),
            ("vencer_pagar", "📅 A Pagar (15 dias)", COR_LARANJA, COR_LARANJA_CL),
            ("saldo_bancario", "🏦 Saldo Bancário Atual", COR_VERDE_ESC, COR_VERDE_CL),
        ]
        for chave, titulo, cor_texto, cor_fundo in definicoes:
            frame = tk.Frame(self.frame_cartoes, bg=cor_fundo,
                             highlightbackground=cor_texto, highlightthickness=1,
                             padx=16, pady=10)
            frame.pack(side="left", fill="x", expand=True, padx=6)

            tk.Label(frame, text=titulo, bg=cor_fundo,
                     fg=cor_texto, font=("Segoe UI", 9)).pack(anchor="w")
            lbl_valor = tk.Label(frame, text="—", bg=cor_fundo,
                                  fg=cor_texto, font=("Segoe UI", 14, "bold"))
            lbl_valor.pack(anchor="w")
            self.cartoes[chave] = lbl_valor

    def _atualizar_cartoes(self):
        if self._dados_atrasados:
            self.cartoes["atrasado_pagar"].config(
                text=formatar_moeda(self._dados_atrasados.get("total_pagar", 0)))
            self.cartoes["atrasado_receber"].config(
                text=formatar_moeda(self._dados_atrasados.get("total_receber", 0)))
        if self._dados_a_vencer:
            self.cartoes["vencer_pagar"].config(
                text=formatar_moeda(self._dados_a_vencer.get("total_pagar", 0)))
        if self._dados_fluxo:
            self.cartoes["saldo_bancario"].config(
                text=formatar_moeda(self._dados_fluxo.get("saldo_inicial", 0)))

    # ------------------------------------------------------------------
    # Aba 1: Atrasados
    # ------------------------------------------------------------------
    def _montar_aba_atrasados(self):
        frame = self.aba_atrasados

        # Legenda de cores
        frame_leg = ttk.Frame(frame)
        frame_leg.pack(fill="x", pady=(0, 6))
        ttk.Label(frame_leg, text="Gravidade: ").pack(side="left")
        ttk.Label(frame_leg, text=" > 30 dias (crítico) ",
                  style="Critico.TLabel").pack(side="left", padx=2)
        ttk.Label(frame_leg, text=" 8-30 dias (alto) ",
                  style="Alto.TLabel").pack(side="left", padx=2)
        ttk.Label(frame_leg, text=" 1-7 dias ",
                  style="Normal.TLabel").pack(side="left", padx=2)

        # Tabela a pagar
        ttk.Label(frame, text="A PAGAR (atrasado)",
                  font=("Segoe UI", 10, "bold"),
                  foreground=COR_VERMELHO).pack(anchor="w", pady=(8, 2))

        self.tree_atr_pagar = self._criar_tree(frame, [
            ("Descrição", 280), ("Fornecedor", 220), ("Vencimento", 100),
            ("Dias Atraso", 90), ("Valor", 120), ("Categoria", 160), ("CC", 120),
        ], tags_cores={
            "critico": COR_VERMELHO_CL, "alto": COR_LARANJA_CL, "baixo": COR_AMARELO_CL
        })
        self.tree_atr_pagar.pack(fill="both", expand=True)

        # Tabela a receber
        ttk.Label(frame, text="A RECEBER (atrasado)",
                  font=("Segoe UI", 10, "bold"),
                  foreground=COR_VERDE_ESC).pack(anchor="w", pady=(10, 2))

        self.tree_atr_receber = self._criar_tree(frame, [
            ("Descrição", 280), ("Cliente", 220), ("Vencimento", 100),
            ("Dias Atraso", 90), ("Valor", 120), ("Categoria", 160), ("CC", 120),
        ])
        self.tree_atr_receber.pack(fill="both", expand=True)

    def _popular_atrasados(self, dados):
        self._limpar_tree(self.tree_atr_pagar)
        self._limpar_tree(self.tree_atr_receber)

        for item in dados.get("pagar", []):
            self.tree_atr_pagar.insert("", "end", tags=(item["gravidade"],), values=(
                item["descricao"], item["nome"],
                item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else "",
                f'{item["dias_atraso"]} dias',
                formatar_moeda(item["valor"]),
                item["categoria"], item["centro_custo"],
            ))

        for item in dados.get("receber", []):
            self.tree_atr_receber.insert("", "end", values=(
                item["descricao"], item["nome"],
                item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else "",
                f'{item["dias_atraso"]} dias',
                formatar_moeda(item["valor"]),
                item["categoria"], item["centro_custo"],
            ))

    # ------------------------------------------------------------------
    # Aba 2: A Vencer
    # ------------------------------------------------------------------
    def _montar_aba_a_vencer(self):
        frame = self.aba_vencer

        frame_leg = ttk.Frame(frame)
        frame_leg.pack(fill="x", pady=(0, 6))
        ttk.Label(frame_leg, text="Urgência: ").pack(side="left")
        ttk.Label(frame_leg, text=" Vence hoje ",
                  style="Critico.TLabel").pack(side="left", padx=2)
        ttk.Label(frame_leg, text=" Vence amanhã ",
                  style="Alto.TLabel").pack(side="left", padx=2)
        ttk.Label(frame_leg, text=" Próximos dias ",
                  style="OK.TLabel").pack(side="left", padx=2)

        ttk.Label(frame, text="A PAGAR (próximos 15 dias)",
                  font=("Segoe UI", 10, "bold"),
                  foreground=COR_LARANJA).pack(anchor="w", pady=(8, 2))

        self.tree_venc_pagar = self._criar_tree(frame, [
            ("Descrição", 280), ("Fornecedor", 220), ("Vencimento", 100),
            ("Dias", 70), ("Valor", 120), ("Categoria", 160), ("CC", 120),
        ], tags_cores={"hoje": COR_VERMELHO_CL, "amanha": COR_LARANJA_CL, "normal": COR_VERDE_CL})
        self.tree_venc_pagar.pack(fill="both", expand=True)

        ttk.Label(frame, text="A RECEBER (próximos 15 dias)",
                  font=("Segoe UI", 10, "bold"),
                  foreground=COR_VERDE_ESC).pack(anchor="w", pady=(10, 2))

        self.tree_venc_receber = self._criar_tree(frame, [
            ("Descrição", 280), ("Cliente", 220), ("Vencimento", 100),
            ("Dias", 70), ("Valor", 120), ("Categoria", 160), ("CC", 120),
        ], tags_cores={"hoje": COR_VERMELHO_CL, "amanha": COR_LARANJA_CL, "normal": COR_VERDE_CL})
        self.tree_venc_receber.pack(fill="both", expand=True)

    def _popular_a_vencer(self, dados):
        self._limpar_tree(self.tree_venc_pagar)
        self._limpar_tree(self.tree_venc_receber)

        for item in dados.get("pagar", []):
            self.tree_venc_pagar.insert("", "end", tags=(item["urgencia"],), values=(
                item["descricao"], item["nome"],
                item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else "",
                f'{item["dias_para_vencer"]}d',
                formatar_moeda(item["valor"]),
                item["categoria"], item["centro_custo"],
            ))

        for item in dados.get("receber", []):
            self.tree_venc_receber.insert("", "end", tags=(item["urgencia"],), values=(
                item["descricao"], item["nome"],
                item["vencimento"].strftime("%d/%m/%Y") if item["vencimento"] else "",
                f'{item["dias_para_vencer"]}d',
                formatar_moeda(item["valor"]),
                item["categoria"], item["centro_custo"],
            ))

    # ------------------------------------------------------------------
    # Aba 3: Fluxo de caixa
    # ------------------------------------------------------------------
    def _montar_aba_fluxo(self):
        frame = self.aba_fluxo

        frame_info = tk.Frame(frame, bg=COR_VERDE_CL,
                               highlightbackground=COR_VERDE, highlightthickness=1,
                               padx=12, pady=8)
        frame_info.pack(fill="x", pady=(0, 8))

        self.label_saldo_inicial = tk.Label(
            frame_info, text="Saldo inicial: —",
            bg=COR_VERDE_CL, fg=COR_VERDE_ESC, font=("Segoe UI", 11, "bold"))
        self.label_saldo_inicial.pack(side="left")

        self.label_menor_saldo = tk.Label(
            frame_info, text="",
            bg=COR_VERDE_CL, fg=COR_VERMELHO, font=("Segoe UI", 10))
        self.label_menor_saldo.pack(side="left", padx=24)

        self.label_dias_negativos = tk.Label(
            frame_info, text="",
            bg=COR_VERDE_CL, fg=COR_VERMELHO, font=("Segoe UI", 10))
        self.label_dias_negativos.pack(side="left")

        self.tree_fluxo = self._criar_tree(frame, [
            ("Data", 100), ("Dia", 60), ("Entradas (R$)", 150),
            ("Saídas (R$)", 150), ("Saldo do Dia (R$)", 160), ("Situação", 100),
        ], tags_cores={"negativo": COR_VERMELHO_CL, "positivo": COR_VERDE_CL,
                       "neutro": "#FFFFFF", "inicial": COR_VERDE_CL})
        self.tree_fluxo.pack(fill="both", expand=True)
        self.tree_fluxo.bind("<Double-1>", self._detalhar_dia_fluxo)

        ttk.Label(frame,
                  text="💡 Dê duplo clique num dia para ver os lançamentos daquele dia.",
                  foreground=COR_CINZA, font=("Segoe UI", 9)).pack(anchor="w", pady=(4, 0))

    def _popular_fluxo(self, dados):
        self._limpar_tree(self.tree_fluxo)

        saldo_inicial = dados.get("saldo_inicial", 0)
        self.label_saldo_inicial.config(
            text=f"Saldo inicial: {formatar_moeda(saldo_inicial)}")

        menor = dados.get("menor_saldo", 0)
        data_menor = dados.get("data_menor_saldo")
        if data_menor:
            self.label_menor_saldo.config(
                text=f"Menor saldo: {formatar_moeda(menor)} em {data_menor.strftime('%d/%m/%Y')}")

        dias_neg = dados.get("dias_negativos", 0)
        self.label_dias_negativos.config(
            text=f"⚠ {dias_neg} dia(s) com saldo negativo" if dias_neg > 0 else "✅ Nenhum dia negativo")

        dias_semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
        for dia in dados.get("dias", []):
            tem_movimento = dia["entradas"] > 0 or dia["saidas"] > 0
            if dia["saldo_negativo"]:
                tag = "negativo"
            elif tem_movimento:
                tag = "positivo"
            else:
                tag = "neutro"

            self.tree_fluxo.insert("", "end", tags=(tag,), values=(
                dia["data"].strftime("%d/%m/%Y"),
                dias_semana[dia["data"].weekday()],
                formatar_moeda(dia["entradas"]) if dia["entradas"] else "—",
                formatar_moeda(dia["saidas"]) if dia["saidas"] else "—",
                formatar_moeda(dia["saldo_dia"]),
                "⚠ NEGATIVO" if dia["saldo_negativo"] else ("✓" if tem_movimento else ""),
            ))

    def _detalhar_dia_fluxo(self, event):
        """Ao dar duplo clique num dia do fluxo, mostra os lancamentos daquele dia."""
        item_id = self.tree_fluxo.focus()
        if not item_id:
            return
        idx = self.tree_fluxo.index(item_id)
        dias = self._dados_fluxo.get("dias", [])
        if idx >= len(dias):
            return
        dia = dias[idx]

        if not dia["itens_entrada"] and not dia["itens_saida"]:
            messagebox.showinfo(
                f"Lançamentos de {dia['data'].strftime('%d/%m/%Y')}",
                "Nenhum lançamento previsto para este dia.")
            return

        linhas = [f"Lançamentos de {dia['data'].strftime('%d/%m/%Y')}\n"]
        if dia["itens_entrada"]:
            linhas.append("ENTRADAS:")
            for it in dia["itens_entrada"]:
                linhas.append(f"  + {formatar_moeda(it['valor'])}  {it['descricao']} ({it['nome']})")
        if dia["itens_saida"]:
            linhas.append("\nSAÍDAS:")
            for it in dia["itens_saida"]:
                linhas.append(f"  - {formatar_moeda(it['valor'])}  {it['descricao']} ({it['nome']})")
        linhas.append(f"\nSaldo do dia: {formatar_moeda(dia['saldo_dia'])}")
        messagebox.showinfo(f"Dia {dia['data'].strftime('%d/%m/%Y')}", "\n".join(linhas))

    # ------------------------------------------------------------------
    # Carga de dados
    # ------------------------------------------------------------------
    def _carregar_dados(self):
        self.label_status.config(text="Buscando dados na API...")
        self.update_idletasks()
        threading.Thread(target=self._carregar_dados_thread, daemon=True).start()

    def _carregar_dados_thread(self):
        try:
            hoje = date.today()
            # Busca com janela generosa: 90 dias atras ate 45 dias a frente
            data_ini = (hoje - timedelta(days=90)).strftime("%Y-%m-%d")
            data_fim = (hoje + timedelta(days=45)).strftime("%Y-%m-%d")

            despesas = self.client.listar_despesas(data_inicio=data_ini, data_fim=data_fim)
            receitas = self.client.listar_receitas(data_inicio=data_ini, data_fim=data_fim)
            contas = self.client.listar_contas_bancarias()

            self._dados_atrasados = analisar_atrasados(despesas, receitas, hoje)
            self._dados_a_vencer = analisar_a_vencer(despesas, receitas, dias=15, hoje=hoje)
            self._dados_fluxo = calcular_fluxo_caixa(despesas, receitas, contas, dias=30, hoje=hoje)

            self.after(0, self._popular_tudo)

        except VHSysAPIError as exc:
            self.after(0, lambda: messagebox.showerror("Erro de API", str(exc)))
            self.after(0, lambda: self.label_status.config(text="Falha ao carregar dados."))
        except Exception as exc:
            self.after(0, lambda: messagebox.showerror("Erro inesperado", str(exc)))
            self.after(0, lambda: self.label_status.config(text="Erro ao processar dados."))

    def _popular_tudo(self):
        self._popular_atrasados(self._dados_atrasados)
        self._popular_a_vencer(self._dados_a_vencer)
        self._popular_fluxo(self._dados_fluxo)
        self._atualizar_cartoes()

        atualizado = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.label_atualizacao.config(text=f"Atualizado: {atualizado}")

        n_atr = len(self._dados_atrasados.get("pagar", []))
        n_venc = len(self._dados_a_vencer.get("pagar", []))
        self.label_status.config(
            text=f"{n_atr} boleto(s) atrasado(s) a pagar  •  {n_venc} vencendo nos próximos 15 dias  •  "
                 f"{self._dados_fluxo.get('dias_negativos', 0)} dia(s) negativo(s) no fluxo"
        )

    # ------------------------------------------------------------------
    # Exportar Excel
    # ------------------------------------------------------------------
    def _exportar_excel(self):
        if not self._dados_fluxo:
            messagebox.showwarning("Sem dados", "Aguarde o carregamento dos dados antes de exportar.")
            return

        caminho = filedialog.asksaveasfilename(
            title="Salvar Excel",
            initialfile=f"Painel_Financeiro_{date.today().strftime('%Y%m%d')}.xlsx",
            defaultextension=".xlsx",
            filetypes=[("Excel", "*.xlsx")],
        )
        if not caminho:
            return

        try:
            exportar_painel(caminho, self._dados_atrasados,
                            self._dados_a_vencer, self._dados_fluxo)
            self.label_status.config(text=f"Excel exportado: {caminho}")
            messagebox.showinfo("Exportado", f"Excel salvo em:\n{caminho}")
        except Exception as exc:
            messagebox.showerror("Erro ao exportar", str(exc))

    # ------------------------------------------------------------------
    # Helpers de treeview
    # ------------------------------------------------------------------
    def _criar_tree(self, parent, colunas, tags_cores=None):
        frame = ttk.Frame(parent)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)

        ids = [c[0].lower().replace(" ", "_").replace("(", "").replace(")", "") for c in colunas]
        tree = ttk.Treeview(frame, columns=ids, show="headings")

        for (titulo, largura), col_id in zip(colunas, ids):
            tree.heading(col_id, text=titulo)
            ancorar = "e" if any(k in titulo for k in ("Valor", "R$")) else "w"
            tree.column(col_id, width=largura, anchor=ancorar)

        if tags_cores:
            for tag, cor in tags_cores.items():
                tree.tag_configure(tag, background=cor)

        scroll_y = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        scroll_y.grid(row=0, column=1, sticky="ns")
        tree.configure(yscrollcommand=scroll_y.set)
        tree.grid(row=0, column=0, sticky="nsew")
        return tree

    @staticmethod
    def _limpar_tree(tree):
        for item in tree.get_children():
            tree.delete(item)


# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------
LOG_ERRO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "erro_painel.log")


def _registrar_erro(tipo_exc, valor_exc, tb):
    try:
        with open(LOG_ERRO_PATH, "a", encoding="utf-8") as f:
            f.write(f"\n{'=' * 60}\nErro em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n{'=' * 60}\n")
            traceback.print_exception(tipo_exc, valor_exc, tb, file=f)
    except Exception:
        pass
    try:
        messagebox.showerror("Erro", "O painel encontrou um erro.\n"
                             f"Detalhes salvos em:\n{LOG_ERRO_PATH}")
    except Exception:
        pass


def _main():
    sys.excepthook = _registrar_erro
    try:
        app = PainelFinanceiroApp()
        app.report_callback_exception = _registrar_erro
        app.mainloop()
    except SystemExit:
        raise
    except Exception:
        _registrar_erro(*sys.exc_info())


if __name__ == "__main__":
    _main()
