# -*- coding: utf-8 -*-
"""
abrir_conciliacao.pyw
Use ESTE arquivo para abrir o sistema de conciliacao no Windows
(duplo clique, sem a janela preta do terminal).
Se fechar sozinho, abra erro_conciliacao.log para ver o motivo.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conciliacao_app import _main
if __name__ == "__main__":
    _main()
