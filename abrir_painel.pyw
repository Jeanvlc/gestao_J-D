# -*- coding: utf-8 -*-
"""
abrir_painel.pyw
Use ESTE arquivo para abrir o Painel Financeiro no Windows
(duplo clique, sem a janela preta do terminal).

Se o painel fechar sozinho, abra o erro_painel.log com o
Notepad para ver o que aconteceu.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from painel_financeiro_app import _main

if __name__ == "__main__":
    _main()
