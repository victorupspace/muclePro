Vídeo de fundo do Hero:

  - hero.mp4         H.264 1280px, ~1,6 Mbps, sem áudio (~2,3 MB) — desktop
  - hero-mobile.mp4  H.264 720px, ~0,7 Mbps, sem áudio (~1 MB) — celular (até 767px)
  - ../images/hero-poster.jpg  primeiro quadro, aparece enquanto o vídeo carrega

Os arquivos .mov originais ficam só na máquina local (estão no .gitignore).
Foram gerados com um script Swift (AVAssetWriter) a partir do hero.mp4 1080p original,
com taxa de bits fixa; o avconvert não permite escolher a taxa e gerava arquivos de 9 a 13 MB.
